// Test de bout en bout dans un vrai navigateur : démarre le serveur, lance une
// partie, clique dans tous les écrans, vérifie la persistance, et écrit des
// captures dans game/captures/.
//
//   npm install --no-save playwright-core
//   node test/navigateur.js
//
// Chromium est cherché via PW_CHROMIUM (ou le chemin par défaut de Playwright).

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { nouvellePartie, avancer } from '../src/sim.js';
import { fonderBase, lancerConstruction, lancerRecherche } from '../src/base.js';
import { donnerOrdre } from '../src/squad.js';
import { serialiser } from '../src/save.js';

const RACINE = resolve(new URL('..', import.meta.url).pathname);
const CAPTURES = join(RACINE, 'captures');
const PORT = 8199;

let chromium;
try {
  const pw = await import('playwright-core');
  chromium = pw.chromium || pw.default.chromium;
} catch (err) {
  console.log('playwright-core absent. Installez-le puis relancez :');
  console.log('  npm install --no-save playwright-core');
  process.exit(0);
}

const CHEMINS_CHROMIUM = [
  process.env.PW_CHROMIUM,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);

// --------------------------------------------------------------------------
// Serveur statique éphémère
// --------------------------------------------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const serveur = createServer(async (req, res) => {
  try {
    let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (chemin === '/') chemin = '/index.html';
    const f = join(RACINE, normalize(chemin).replace(/^(\.\.[/\\])+/, ''));
    if (!f.startsWith(RACINE)) { res.writeHead(403).end(); return; }
    const c = await readFile(f);
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(c);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
});
await new Promise((ok) => serveur.listen(PORT, ok));
await mkdir(CAPTURES, { recursive: true });

// --------------------------------------------------------------------------
// Une sauvegarde « partie avancée », fabriquée par le moteur lui-même
// --------------------------------------------------------------------------

function partieAvancee() {
  const s = nouvellePartie(20260729, { maintenant: Date.now() });
  const vide = s.world.regions.find((r) => !r.colonie && r.decouvert)
    || s.world.regions.find((r) => !r.colonie);
  s.player.regionId = vide.i;
  Object.assign(s.player.inventaire, { ferraille: 200, polymere: 60, composant: 10, rations: 300 });
  fonderBase(s, () => {});
  Object.assign(s.base.stock, {
    ferraille: 320, polymere: 140, composant: 45, minerai: 130,
    carburant: 90, biomasse: 160, alliage: 35, rations: 40,
  });
  s.player.credits = 6000;
  lancerConstruction(s, 'generateur');
  avancer(s, 40);
  lancerConstruction(s, 'hydroponie');
  lancerConstruction(s, 'antenne');
  avancer(s, 120);
  lancerRecherche(s, 'logistique');
  donnerOrdre(s, { type: 'fouille' });
  avancer(s, 400);
  s.dernierReel = Date.now();
  return s;
}

// --------------------------------------------------------------------------

let echecs = 0;
function ok(cond, nom, extra) {
  console.log(`  ${cond ? '✓' : '✗'} ${nom}${!cond && extra ? ` — ${extra}` : ''}`);
  if (!cond) echecs++;
}

let navigateur = null;
for (const chemin of CHEMINS_CHROMIUM) {
  try {
    navigateur = await chromium.launch({ executablePath: chemin });
    break;
  } catch { /* on essaie le suivant */ }
}
if (!navigateur) {
  console.log('Aucun Chromium trouvé. Renseignez PW_CHROMIUM=/chemin/vers/chrome');
  serveur.close();
  process.exit(0);
}

const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const erreurs = [];
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', (e) => erreurs.push(e.message));

console.log('Test navigateur (390×844)\n' + '='.repeat(42));

console.log('\n1. Démarrage d’une partie');
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: join(CAPTURES, '00-accueil.png') });
await page.fill('#graine', 'kenshi');
await page.click('[data-a="nouvelle"]');
await page.waitForSelector('#carte', { timeout: 5000 });
ok(await page.locator('#carte').isVisible(), 'la carte s’affiche');
const pixels = await page.evaluate(() => {
  const c = document.querySelector('#carte');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const vus = new Set();
  for (let i = 0; i < d.length; i += 4) vus.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
  return vus.size;
});
ok(pixels > 10, 'la carte est réellement dessinée', `${pixels} couleurs`);

console.log('\n2. Ordres et temps réel');
await page.click('[data-a="ordre"][data-k="fouille"]');
await page.click('[data-a="vitesse"][data-v="16"]');
const t0 = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
await page.waitForTimeout(6000);
await page.screenshot({ path: join(CAPTURES, '01-carte.png') });
const t1 = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
ok(t1 > t0, 'l’horloge avance en temps réel', `${t0} → ${t1}`);

console.log('\n3. Navigation entre les écrans');
for (const [k, nom] of [['escouade', '02-escouade'], ['base', '03-base'], ['monde', '04-monde'], ['journal', '05-journal']]) {
  await page.click(`[data-a="onglet"][data-k="${k}"]`);
  await page.waitForTimeout(300);
  const vide = await page.evaluate(() => document.querySelector('#ecran').textContent.trim().length);
  ok(vide > 60, `l’écran ${k} a du contenu`, `${vide} caractères`);
  await page.screenshot({ path: join(CAPTURES, `${nom}.png`), fullPage: true });
}

console.log('\n4. Fiches de personnage');
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.locator('details.perso summary').first().click();
await page.waitForTimeout(2600); // laisse passer plusieurs re-rendus
ok(await page.locator('details.perso[open]').count() > 0, 'la fiche ouverte le reste après re-rendu');
await page.screenshot({ path: join(CAPTURES, '06-fiche.png'), fullPage: true });

console.log('\n5. Mise en page');
const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok(!deborde, 'aucun débordement horizontal');
const boutonsPetits = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => b.getBoundingClientRect().height < 28).length);
ok(boutonsPetits === 0, 'toutes les cibles tactiles font au moins 28 px', `${boutonsPetits} trop petites`);

console.log('\n5 bis. Installation sur l’écran d’accueil');
const ressources = await page.evaluate(async () => {
  const res = {};
  for (const url of ['manifest.json', 'icone-180.png', 'icone.svg']) {
    try {
      const r = await fetch(url);
      res[url] = r.status;
    } catch { res[url] = 0; }
  }
  const m = await (await fetch('manifest.json')).json();
  res.display = m.display;
  res.nbIcones = (m.icons || []).length;
  return res;
});
ok(ressources['manifest.json'] === 200, 'le manifeste est servi');
ok(ressources['icone-180.png'] === 200 && ressources['icone.svg'] === 200, 'les icônes sont servies');
ok(ressources.display === 'standalone' && ressources.nbIcones >= 2, 'le manifeste déclare le plein écran et ses icônes');

console.log('\n6. Persistance');
const avantRechargement = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
await page.reload({ waitUntil: 'networkidle' });
ok(await page.locator('[data-a="continuer"]').count() > 0, 'la reprise est proposée');
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
const apresRechargement = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
ok(apresRechargement >= avantRechargement, 'la partie reprend là où elle en était',
  `${avantRechargement} → ${apresRechargement}`);

console.log('\n7. Partie développée : marché, avant-poste, construction');
const sauvegarde = serialiser(partieAvancee());
// L'ordre compte : le jeu sauvegarde sur `pagehide`, donc injecter avant un
// rechargement ferait écraser la sauvegarde par la partie encore en cours.
// On recharge d'abord (l'accueil ne fait pas tourner la boucle), puis on injecte.
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), sauvegarde);
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.waitForTimeout(400);
await page.click('[data-a="onglet"][data-k="base"]');
await page.waitForTimeout(300);
await page.screenshot({ path: join(CAPTURES, '07-base.png'), fullPage: true });
const filesAvant = await page.locator('[data-a="annuler"]').count();
const constructibles = await page.locator('[data-a="construire"]:not([disabled])').count();
ok(constructibles > 0, 'au moins un bâtiment est finançable', `${constructibles} disponibles`);
if (constructibles > 0) {
  await page.click('[data-a="construire"]:not([disabled])');
  await page.waitForTimeout(500);
}
ok(await page.locator('[data-a="annuler"]').count() > filesAvant, 'un chantier se met en file au clic');

console.log('\n8. Écran large');
const large = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
await large.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await large.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), sauvegarde);
await large.reload({ waitUntil: 'networkidle' });
await large.click('[data-a="continuer"]');
await large.waitForSelector('#carte');
await large.waitForTimeout(400);
await large.screenshot({ path: join(CAPTURES, '08-large.png') });
ok(!(await large.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)),
  'pas de débordement en écran large');

console.log('\n8 bis. Contenu de jeu : contrats, étal, sites');
// On repart d'une partie neuve, posée dans une ville.
await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.click('[data-a="nouvelle"]');
await page.waitForSelector('#carte');
await page.waitForTimeout(600);

// Étal d'équipement : le catalogue existait, rien n'était achetable.
await page.click('[data-a="modale"][data-m="etal"]');
await page.waitForTimeout(400);
const articles = await page.locator('[data-a="acheter-item"]').count();
ok(articles > 0, 'l’armurier propose de l’équipement', `${articles} articles`);
await page.screenshot({ path: join(CAPTURES, '09-etal.png') });
const objetsAvant = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.objets.length);
const abordable = await page.locator('[data-a="acheter-item"]:not([disabled])').count();
if (abordable) {
  await page.click('[data-a="acheter-item"]:not([disabled])');
  await page.waitForTimeout(500);
}
const objetsApres = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.objets.length);
ok(!abordable || objetsApres > objetsAvant, 'un achat d’équipement arrive dans la réserve',
  `${objetsAvant} → ${objetsApres}`);
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);

// Panneau de contrats
await page.click('[data-a="modale"][data-m="panneau"]');
await page.waitForTimeout(400);
const offres = await page.locator('[data-a="accepter"]').count();
ok(offres > 0, 'la ville affiche des contrats', `${offres} offres`);
await page.screenshot({ path: join(CAPTURES, '10-panneau.png') });
if (offres) {
  await page.click('[data-a="accepter"]');
  await page.waitForTimeout(600);
}
const pris = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.contrats.length);
ok(pris > 0, 'un contrat accepté part en cours', `${pris} en cours`);
await page.click('[data-a="onglet"][data-k="contrats"]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(CAPTURES, '11-contrats.png'), fullPage: true });

// Fil d'actualité sur la carte
await page.click('[data-a="onglet"][data-k="carte"]');
await page.waitForTimeout(2500);
const filLignes = await page.locator('.fil-l').count();
ok(filLignes > 0, 'le fil d’actualité montre ce qui vient d’arriver', `${filLignes} lignes`);
await page.screenshot({ path: join(CAPTURES, '12-carte-fil.png'), fullPage: true });

// Chaque ordre annonce son rendement, et un ordre stérile est désactivé
const ordres = await page.evaluate(() => [...document.querySelectorAll('button.act.ordre')]
  .map((b) => ({ nom: b.querySelector('.o-n').textContent, rendement: b.querySelector('.o-r').textContent, off: b.disabled })));
ok(ordres.length >= 6, 'tous les ordres sont proposés', `${ordres.length}`);
ok(ordres.every((o) => o.rendement.trim().length > 0), 'chaque ordre annonce ce qu’il rapporte ici');
console.log('     ' + ordres.map((o) => `${o.nom}:${o.rendement}${o.off ? '(off)' : ''}`).join('  '));

console.log('\n9. Fichier unique ouvert en file://');
const { existsSync } = await import('node:fs');
const chemin = join(RACINE, 'dist', 'cendres.html');
if (!existsSync(chemin)) {
  console.log('  — dist/cendres.html absent (node tools/bundle.js), section ignorée');
} else {
  const seul = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const errSeul = [];
  seul.on('pageerror', (e) => errSeul.push(e.message));
  seul.on('console', (m) => { if (m.type() === 'error') errSeul.push(m.text()); });
  await seul.goto(`file://${chemin}`);
  await seul.waitForSelector('[data-a="nouvelle"]', { timeout: 5000 });
  await seul.click('[data-a="nouvelle"]');
  await seul.waitForSelector('#carte', { timeout: 5000 });
  await seul.waitForTimeout(1500);
  ok(await seul.locator('#carte').isVisible(), 'le fichier unique démarre sans serveur');
  const couleurs = await seul.evaluate(() => {
    const c = document.querySelector('#carte');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const v = new Set();
    for (let i = 0; i < d.length; i += 4) v.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    return v.size;
  });
  ok(couleurs > 10, 'la carte est dessinée en file://', `${couleurs} couleurs`);
  await seul.click('[data-a="onglet"][data-k="escouade"]');
  await seul.waitForTimeout(300);
  ok((await seul.evaluate(() => document.querySelector('#ecran').textContent.length)) > 200,
    'la navigation fonctionne en file://');
  ok(errSeul.length === 0, 'aucune erreur dans le fichier unique', errSeul.join(' | '));
}

console.log('\n' + '='.repeat(42));
ok(erreurs.length === 0, 'aucune erreur console', erreurs.join(' | '));
console.log(`Captures écrites dans ${CAPTURES}`);

await navigateur.close();
serveur.close();
process.exit(echecs ? 1 : 0);
