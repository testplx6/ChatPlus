// Génère icone-180.png pour l'écran d'accueil iOS (qui n'accepte ni SVG ni
// data:URI pour apple-touch-icon). Encodeur PNG minimal, zlib est dans Node.
//
//   node tools/icone.js

import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const RACINE = resolve(new URL('..', import.meta.url).pathname);
const TAILLE = 180;
const GRILLE = 18; // motif en 18×18 « gros pixels »
const ECHELLE = TAILLE / GRILLE;

// --- Encodeur PNG -----------------------------------------------------------

const TABLE_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function morceau(type, donnees) {
  const nom = Buffer.from(type, 'ascii');
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([nom, donnees])));
  return Buffer.concat([taille, nom, donnees, crc]);
}

function encoderPng(largeur, hauteur, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;   // 8 bits par canal
  ihdr[9] = 2;   // couleur vraie RVB
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // filtre adaptatif
  ihdr[12] = 0;  // pas d'entrelacement

  // Chaque ligne est préfixée d'un octet de filtre (0 = aucun)
  const brut = Buffer.alloc(hauteur * (1 + largeur * 3));
  for (let y = 0; y < hauteur; y++) {
    const dep = y * (1 + largeur * 3);
    brut[dep] = 0;
    rgb.copy(brut, dep + 1, y * largeur * 3, (y + 1) * largeur * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr),
    morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

// --- Motif ------------------------------------------------------------------

const FOND = [0x0a, 0x0c, 0x10];
const CYAN = [0x4f, 0xd0, 0xe3];
const AMBRE = [0xd9, 0xa0, 0x3a];
const BORD = [0x26, 0x2d, 0x3a];

// Deux carrés décalés, comme le favicon : une escouade, un avant-poste.
function couleurCase(x, y) {
  const cadre = x === 0 || y === 0 || x === GRILLE - 1 || y === GRILLE - 1;
  if (cadre) return BORD;
  const dansCarre = (cx, cy, t) => x >= cx && x < cx + t && y >= cy && y < cy + t;
  const creux = (cx, cy, t) => x >= cx + 1 && x < cx + t - 1 && y >= cy + 1 && y < cy + t - 1;
  if (dansCarre(3, 3, 6) && !creux(3, 3, 6)) return CYAN;
  if (dansCarre(9, 9, 6) && !creux(9, 9, 6)) return AMBRE;
  // Grain discret, déterministe
  return ((x * 7 + y * 13) % 11 === 0) ? [0x11, 0x14, 0x1b] : FOND;
}

const rgb = Buffer.alloc(TAILLE * TAILLE * 3);
for (let y = 0; y < TAILLE; y++) {
  for (let x = 0; x < TAILLE; x++) {
    const c = couleurCase(Math.floor(x / ECHELLE), Math.floor(y / ECHELLE));
    const i = (y * TAILLE + x) * 3;
    rgb[i] = c[0];
    rgb[i + 1] = c[1];
    rgb[i + 2] = c[2];
  }
}

const png = encoderPng(TAILLE, TAILLE, rgb);
await writeFile(join(RACINE, 'icone-180.png'), png);
console.log(`icone-180.png écrite (${png.length} octets)`);
