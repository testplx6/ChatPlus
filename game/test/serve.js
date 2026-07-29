// Serveur statique minimal : les modules ES ne se chargent pas depuis file://.
// node test/serve.js [port]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const RACINE = resolve(new URL('..', import.meta.url).pathname);
const PORT = Number(process.argv[2]) || 8123;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

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
}).listen(PORT, () => {
  console.log(`Cendres & Protocole → http://localhost:${PORT}`);
});
