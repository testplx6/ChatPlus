import { toHex, toAscii, parseHex, findChecksum, profileBytes, decode, FRAME_SPEC } from './protocol.js';

/**
 * Services à déclarer dans optionalServices : Web Bluetooth refuse l'accès à
 * tout service non listé. On couvre les modules BLE-UART chinois courants
 * (les afficheurs e-bike Yolin en utilisent un du lot) + quelques services SIG
 * standards utiles (batterie, device info).
 */
const CANDIDATE_SERVICES = [
  0xffe0, 0xffe5, 0xff00, 0xfff0, 0xfee7, 0xfee0, 0xfd00, 0xffb0, 0xffc0, 0xffd0,
  0xae00, 0x18f0, 0xfe59, 0xf000,
  'battery_service', 'device_information', 'generic_access',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip / ISSC transparent UART
  '0000abf0-0000-1000-8000-00805f9b34fb',
];

const $ = (id) => document.getElementById(id);
const els = {
  connect: $('btnConnect'), disconnect: $('btnDisconnect'), send: $('btnSend'),
  clear: $('btnClear'), export: $('btnExport'), analyse: $('btnAnalyse'),
  status: $('status'), gatt: $('gatt'), log: $('log'), analysis: $('analysis'),
  selWrite: $('selWrite'), txHex: $('txHex'), ascii: $('chkAscii'),
  unsupported: $('unsupported'),
};

let device = null;
let writeChar = null;
const writeChars = new Map(); // uuid -> characteristic
const capture = [];           // { t, uuid, bytes }

if (!navigator.bluetooth) {
  els.unsupported.hidden = false;
  els.connect.disabled = true;
}

function setStatus(text, cls = '') {
  els.status.textContent = text;
  els.status.className = `status ${cls}`;
}

function logLine(html) {
  if (els.log.textContent.startsWith('En attente')) els.log.textContent = '';
  const atBottom = els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight < 40;
  els.log.insertAdjacentHTML('beforeend', html + '\n');
  if (atBottom) els.log.scrollTop = els.log.scrollHeight;
}

const stamp = () => new Date().toISOString().substr(11, 12);

/* ------------------------------------------------------------------ */
/* Connexion + exploration GATT                                        */
/* ------------------------------------------------------------------ */

async function connect() {
  try {
    setStatus('Sélection…');
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: CANDIDATE_SERVICES,
    });
    device.addEventListener('gattserverdisconnected', onDisconnected);

    setStatus(`Connexion à ${device.name || device.id}…`);
    const server = await device.gatt.connect();

    els.gatt.textContent = `Appareil : ${device.name || '(sans nom)'}  [${device.id}]\n\n`;
    writeChars.clear();
    els.selWrite.innerHTML = '<option value="">— caractéristique d\'écriture —</option>';

    const services = await server.getPrimaryServices();
    let notifyCount = 0;

    for (const service of services) {
      els.gatt.textContent += `service ${service.uuid}\n`;
      let chars = [];
      try {
        chars = await service.getCharacteristics();
      } catch (e) {
        els.gatt.textContent += `  (caractéristiques illisibles : ${e.message})\n`;
        continue;
      }

      for (const c of chars) {
        const p = c.properties;
        const flags = [
          p.read && 'read', p.write && 'write',
          p.writeWithoutResponse && 'writeNR',
          p.notify && 'notify', p.indicate && 'indicate',
        ].filter(Boolean).join(',');
        els.gatt.textContent += `  char ${c.uuid}  [${flags}]\n`;

        if (p.read) {
          try {
            const v = await c.readValue();
            const bytes = new Uint8Array(v.buffer);
            if (bytes.length) {
              els.gatt.textContent += `    valeur : ${toHex(bytes)}  "${toAscii(bytes)}"\n`;
            }
          } catch { /* certaines lectures exigent un pairing : on ignore */ }
        }

        if (p.write || p.writeWithoutResponse) {
          writeChars.set(c.uuid, c);
          const opt = document.createElement('option');
          opt.value = c.uuid;
          opt.textContent = `${c.uuid.slice(4, 8)} · ${service.uuid.slice(4, 8)} [${flags}]`;
          els.selWrite.appendChild(opt);
        }

        if (p.notify || p.indicate) {
          try {
            await c.startNotifications();
            c.addEventListener('characteristicvaluechanged', onNotification);
            notifyCount++;
          } catch (e) {
            els.gatt.textContent += `    notifications refusées : ${e.message}\n`;
          }
        }
      }
    }

    // Pré-sélection : s'il n'y a qu'une caractéristique d'écriture, on la prend.
    if (writeChars.size === 1) {
      els.selWrite.selectedIndex = 1;
      onWriteCharChange();
    }

    setStatus(`Connecté · ${services.length} services · ${notifyCount} flux de notifications`, 'ok');
    els.disconnect.disabled = false;
    els.connect.disabled = true;
  } catch (e) {
    setStatus(`Échec : ${e.message}`, 'err');
  }
}

function onNotification(event) {
  const c = event.target;
  const bytes = new Uint8Array(event.target.value.buffer);
  capture.push({ t: Date.now(), uuid: c.uuid, bytes: Array.from(bytes) });

  const decoded = decode(bytes, FRAME_SPEC);
  const suffix = decoded
    ? '  → ' + Object.entries(decoded).map(([k, v]) => `${k}=${v.value}${v.unit}`).join(' ')
    : '';
  const ascii = els.ascii.checked ? `  "${toAscii(bytes)}"` : '';

  logLine(`<span class="meta">${stamp()} ${c.uuid.slice(4, 8)} ←</span> <span class="rx">${toHex(bytes)}</span>${ascii}${suffix}`);
}

function onDisconnected() {
  setStatus('Déconnecté', 'err');
  els.connect.disabled = false;
  els.disconnect.disabled = true;
  els.send.disabled = true;
}

function disconnect() {
  if (device?.gatt.connected) device.gatt.disconnect();
  else onDisconnected();
}

/* ------------------------------------------------------------------ */
/* Écriture                                                            */
/* ------------------------------------------------------------------ */

function onWriteCharChange() {
  writeChar = writeChars.get(els.selWrite.value) || null;
  els.send.disabled = !writeChar;
}

async function send() {
  if (!writeChar) return;
  let bytes;
  try {
    bytes = parseHex(els.txHex.value);
  } catch (e) {
    logLine(`<span class="meta">${stamp()}</span> <span style="color:var(--err)">hex invalide : ${e.message}</span>`);
    return;
  }
  if (!bytes.length) return;

  try {
    if (writeChar.properties.write) await writeChar.writeValueWithResponse(bytes);
    else await writeChar.writeValueWithoutResponse(bytes);
    logLine(`<span class="meta">${stamp()} ${writeChar.uuid.slice(4, 8)} →</span> <span class="tx">${toHex(bytes)}</span>`);
  } catch (e) {
    logLine(`<span class="meta">${stamp()}</span> <span style="color:var(--err)">écriture refusée : ${e.message}</span>`);
  }
}

/* ------------------------------------------------------------------ */
/* Analyse                                                             */
/* ------------------------------------------------------------------ */

function analyse() {
  if (capture.length < 3) {
    els.analysis.textContent = 'Pas assez de trames capturées.';
    return;
  }

  const byUuid = new Map();
  for (const f of capture) {
    if (!byUuid.has(f.uuid)) byUuid.set(f.uuid, []);
    byUuid.get(f.uuid).push(Uint8Array.from(f.bytes));
  }

  let out = '';
  for (const [uuid, frames] of byUuid) {
    out += `═══ ${uuid} — ${frames.length} trames ═══\n\n`;

    const lengths = {};
    for (const f of frames) lengths[f.length] = (lengths[f.length] || 0) + 1;
    out += 'Longueurs  : ' + Object.entries(lengths).map(([l, n]) => `${l}o ×${n}`).join(', ') + '\n';

    const headers = {};
    for (const f of frames) headers[f[0]] = (headers[f[0]] || 0) + 1;
    out += 'Premier oct: ' + Object.entries(headers)
      .map(([h, n]) => `0x${(+h).toString(16).padStart(2, '0').toUpperCase()} ×${n}`).join(', ') + '\n\n';

    const cs = findChecksum(frames);
    if (cs.length) {
      out += 'Checksum probable :\n';
      for (const r of cs) {
        out += `  ${r.algo} sur [${r.from}..${r.to}) → octet ${r.pos}  (${r.matched}/${r.total})\n`;
      }
    } else {
      out += 'Checksum : aucun candidat évident (chiffré ? CRC16 ? longueur variable ?)\n';
    }
    out += '\n';

    out += 'Profil par octet (constant = en-tête/ID, variable = donnée) :\n';
    for (const c of profileBytes(frames)) {
      const hex = (n) => '0x' + n.toString(16).padStart(2, '0').toUpperCase();
      out += c.constant
        ? `  [${String(c.index).padStart(2)}] constant  ${hex(c.value)}\n`
        : `  [${String(c.index).padStart(2)}] variable  ${hex(c.min)}–${hex(c.max)}  (${c.distinct} valeurs)\n`;
    }
    out += '\n';
  }

  els.analysis.textContent = out;
}

function exportJson() {
  const blob = new Blob([JSON.stringify({
    device: device ? { name: device.name, id: device.id } : null,
    exportedAt: new Date().toISOString(),
    frames: capture.map((f) => ({ ...f, hex: toHex(Uint8Array.from(f.bytes)) })),
  }, null, 2)], { type: 'application/json' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `capture-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

els.connect.addEventListener('click', connect);
els.disconnect.addEventListener('click', disconnect);
els.send.addEventListener('click', send);
els.txHex.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
els.selWrite.addEventListener('change', onWriteCharChange);
els.analyse.addEventListener('click', analyse);
els.export.addEventListener('click', exportJson);
els.clear.addEventListener('click', () => {
  capture.length = 0;
  els.log.textContent = 'En attente de notifications…';
  els.analysis.textContent = 'Capture au moins une vingtaine de trames, puis clique « Analyser ».';
});
