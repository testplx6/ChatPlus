// Serveur statique minimal : les modules ES ne se chargent pas depuis file://.
// Écoute sur toutes les interfaces pour qu'un téléphone du même réseau puisse
// s'y connecter, et affiche les adresses à taper.
//
//   node test/serve.js [port]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const RACINE = resolve(new URL('..', import.meta.url).pathname);
const PORT = Number(process.argv[2] || process.env.PORT) || 8123;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** Adresses IPv4 locales, hors boucle locale : celles que le téléphone peut joindre. */
function adressesReseau() {
  const out = [];
  const ifaces = networkInterfaces();
  for (const nom of Object.keys(ifaces)) {
    for (const i of ifaces[nom] || []) {
      if (i.family === 'IPv4' && !i.internal) out.push({ nom, adresse: i.address });
    }
  }
  return out;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let chemin = decodeURIComponent(url.pathname);
    if (chemin === '/') chemin = '/index.html';
    const fichier = join(RACINE, normalize(chemin).replace(/^(\.\.[/\\])+/, ''));
    if (!fichier.startsWith(RACINE)) {
      res.writeHead(403).end('Interdit');
      return;
    }
    const contenu = await readFile(fichier);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(contenu);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log('Cendres & Protocole');
  console.log(`  sur cette machine   http://localhost:${PORT}`);
  const reseau = adressesReseau();
  if (reseau.length) {
    console.log('  depuis un téléphone du même réseau Wi-Fi :');
    for (const { nom, adresse } of reseau) {
      console.log(`    http://${adresse}:${PORT}   (${nom})`);
    }
    console.log('  → puis « Ajouter à l’écran d’accueil » pour jouer en plein écran.');
  } else {
    console.log('  (aucune interface réseau détectée : accès local uniquement)');
  }
  console.log('\n  Ctrl+C pour arrêter.');
});
