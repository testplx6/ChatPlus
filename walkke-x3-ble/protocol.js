/**
 * protocol.js — outils d'analyse de trames pour afficheurs e-bike Yolin (BLE)
 *
 * IMPORTANT : le protocole exact de l'afficheur Yolin n'est PAS public.
 * Ce fichier ne contient donc aucune "spec" inventée : il fournit des
 * heuristiques pour *découvrir* le format à partir des trames réellement
 * capturées sur le vélo (en-tête, longueur, checksum), plus un emplacement
 * clairement identifié où inscrire le format une fois confirmé.
 */

/* ------------------------------------------------------------------ */
/* Helpers hex / bytes                                                 */
/* ------------------------------------------------------------------ */

export const toHex = (bytes, sep = ' ') =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(sep);

export const toAscii = (bytes) =>
  Array.from(bytes, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');

export function parseHex(text) {
  const cleaned = text.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (cleaned.length % 2 !== 0) throw new Error('Nombre impair de caractères hex');
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  return out;
}

/* ------------------------------------------------------------------ */
/* Checksums candidats                                                 */
/* ------------------------------------------------------------------ */

const sum8 = (b, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s = (s + b[i]) & 0xff;
  return s;
};

const xor8 = (b, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s ^= b[i];
  return s;
};

const sum8Inv = (b, from, to) => (~sum8(b, from, to)) & 0xff;
const sum8Neg = (b, from, to) => (0x100 - sum8(b, from, to)) & 0xff;

function crc8(poly) {
  return (b, from, to) => {
    let crc = 0;
    for (let i = from; i < to; i++) {
      crc ^= b[i];
      for (let k = 0; k < 8; k++) crc = crc & 0x80 ? ((crc << 1) ^ poly) & 0xff : (crc << 1) & 0xff;
    }
    return crc;
  };
}

export const CHECKSUMS = [
  { name: 'sum8', fn: sum8 },
  { name: 'xor8', fn: xor8 },
  { name: 'sum8 inversé (~)', fn: sum8Inv },
  { name: 'sum8 complément à 2', fn: sum8Neg },
  { name: 'crc8 poly 0x07', fn: crc8(0x07) },
  { name: 'crc8 poly 0x31', fn: crc8(0x31) },
];

/**
 * Cherche quel (algorithme, plage, position) explique le mieux l'octet de
 * contrôle d'un lot de trames. On teste chaque position candidate comme
 * checksum, calculée sur toutes les plages [from, to) plausibles.
 *
 * @param {Uint8Array[]} frames
 * @returns {{algo:string, from:number, to:string|number, pos:string|number, matched:number, total:number}[]}
 */
export function findChecksum(frames) {
  const usable = frames.filter((f) => f.length >= 3);
  if (usable.length < 3) return [];

  // Positions relatives à la fin (-1 = dernier octet) : la plupart des
  // protocoles série chinois mettent le checksum en dernier ou avant-dernier.
  const positions = [-1, -2];
  const results = [];

  for (const { name, fn } of CHECKSUMS) {
    for (const pos of positions) {
      for (let from = 0; from <= 2; from++) {
        for (const endOffset of [0, 1]) {
          // to = index du checksum - endOffset (0 => checksum exclu seulement)
          let matched = 0;
          for (const f of usable) {
            const cs = f.length + pos;
            const to = cs - endOffset;
            if (cs < 0 || to <= from) { matched = -1; break; }
            if (fn(f, from, to) === f[cs]) matched++;
          }
          if (matched > 0) {
            results.push({
              algo: name,
              from,
              to: `len${pos - endOffset}`,
              pos: `len${pos}`,
              matched,
              total: usable.length,
            });
          }
        }
      }
    }
  }

  return results
    .filter((r) => r.matched / r.total > 0.8)
    .sort((a, b) => b.matched / b.total - a.matched / a.total)
    .slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* Découpage en trames                                                 */
/* ------------------------------------------------------------------ */

/**
 * Reconstitue des trames à partir d'un flux BLE : les notifications ne
 * respectent pas forcément la frontière des trames (une notif peut porter
 * 2 trames, ou une demi-trame).
 *
 * Deux modes :
 *  - 'notification' : 1 notification = 1 trame (cas le plus fréquent en BLE)
 *  - 'header'       : on recolle le flux et on recoupe sur un octet d'en-tête
 */
export function splitFrames(chunks, { mode = 'notification', header = null, fixedLength = null } = {}) {
  if (mode === 'notification') return chunks.slice();

  const stream = [];
  for (const c of chunks) stream.push(...c);

  const frames = [];
  let i = 0;
  while (i < stream.length) {
    if (header !== null && stream[i] !== header) { i++; continue; }
    let end;
    if (fixedLength) {
      end = i + fixedLength;
    } else {
      end = stream.length;
      for (let j = i + 1; j < stream.length; j++) {
        if (stream[j] === header) { end = j; break; }
      }
    }
    if (end > stream.length) break;
    frames.push(Uint8Array.from(stream.slice(i, end)));
    i = end;
  }
  return frames;
}

/* ------------------------------------------------------------------ */
/* Analyse statistique des octets                                      */
/* ------------------------------------------------------------------ */

/**
 * Pour chaque position d'octet : valeur constante ? plage de variation ?
 * C'est ce qui permet d'identifier « octet 4 = vitesse » en roulant.
 */
export function profileBytes(frames) {
  const len = Math.max(0, ...frames.map((f) => f.length));
  const cols = [];
  for (let i = 0; i < len; i++) {
    const vals = frames.filter((f) => f.length > i).map((f) => f[i]);
    if (!vals.length) continue;
    const uniq = new Set(vals);
    cols.push({
      index: i,
      constant: uniq.size === 1,
      value: uniq.size === 1 ? vals[0] : null,
      min: Math.min(...vals),
      max: Math.max(...vals),
      distinct: uniq.size,
      samples: vals.length,
    });
  }
  return cols;
}

/* ------------------------------------------------------------------ */
/* Décodeur — À COMPLÉTER après capture                                */
/* ------------------------------------------------------------------ */

/**
 * Une fois le format confirmé sur TON vélo, décris-le ici.
 * Rien n'est pré-rempli volontairement : mettre des offsets devinés
 * donnerait des valeurs fausses mais crédibles, ce qui est pire que rien.
 *
 * Exemple de forme attendue une fois identifié :
 *   { header: 0x3A, length: 12, fields: [
 *       { name: 'vitesse', offset: 4, size: 2, endian: 'be', scale: 0.1, unit: 'km/h' },
 *   ]}
 */
export const FRAME_SPEC = null;

export function decode(frame, spec = FRAME_SPEC) {
  if (!spec) return null;
  if (spec.header != null && frame[0] !== spec.header) return null;
  if (spec.length != null && frame.length !== spec.length) return null;

  const out = {};
  for (const f of spec.fields) {
    const size = f.size || 1;
    if (f.offset + size > frame.length) continue;
    let v = 0;
    for (let k = 0; k < size; k++) {
      const byte = frame[f.offset + (f.endian === 'le' ? size - 1 - k : k)];
      v = (v << 8) | byte;
    }
    out[f.name] = { value: v * (f.scale ?? 1), unit: f.unit || '' };
  }
  return out;
}
