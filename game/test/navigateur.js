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
import { groupeActif } from '../src/groupes.js';
import { ecolesDe } from '../src/formation.js';

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
  groupeActif(s).regionId = vide.i;
  Object.assign(groupeActif(s).inventaire, { ferraille: 200, polymere: 60, composant: 10, rations: 300 });
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
// L'en-tête a une largeur fixe et gagne des indicateurs : il faut vérifier que
// les blocs ne se marchent pas dessus, et que la vitesse reste atteignable.
const enTete = await page.evaluate(() => {
  const blocs = [...document.querySelectorAll('#barre-haut .hd-bloc')].map((b) => b.getBoundingClientRect());
  let chevauche = 0;
  for (let i = 1; i < blocs.length; i++) if (blocs[i].left < blocs[i - 1].right - 0.5) chevauche++;
  const v = document.querySelector('#barre-haut .vitesse').getBoundingClientRect();
  const boite = document.querySelector('#barre-haut .hd-metriques').getBoundingClientRect();
  const rognes = blocs.filter((b) => b.right > boite.right + 0.5).length;
  return { chevauche, rognes, vitesseVisible: v.right <= window.innerWidth + 1 && v.width > 0 };
});
ok(enTete.chevauche === 0, 'les indicateurs de l’en-tête ne se chevauchent pas', `${enTete.chevauche} paires`);
ok(enTete.vitesseVisible, 'le sélecteur de vitesse reste dans l’écran');
ok(enTete.rognes === 0, 'aucun indicateur n’est rogné à 390 px', `${enTete.rognes} rognés`);

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
const objetsAvant = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.groupes[0].objets.length);
const abordable = await page.locator('[data-a="acheter-item"]:not([disabled])').count();
if (abordable) {
  await page.click('[data-a="acheter-item"]:not([disabled])');
  await page.waitForTimeout(500);
}
const objetsApres = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.groupes[0].objets.length);
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

console.log('\n8 ter. Monde vivant : climat, caravanes, villes qui bougent');
const monde = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return {
    meteo: s.world.meteo && s.world.meteo.type,
    caravanes: (s.world.caravanes || []).length,
    cohesion: s.player.groupes[0].cohesion,
    groupes: s.player.groupes.length,
    sites: s.world.regions.filter((r) => r.site).length,
  };
});
ok(!!monde.meteo, 'une météo est en cours', String(monde.meteo));
ok(monde.sites > 10, 'des sites sont semés sur la carte', `${monde.sites}`);
ok(typeof monde.cohesion === 'number', 'la cohésion d’escouade est suivie', String(monde.cohesion));
await page.click('[data-a="onglet"][data-k="monde"]');
await page.waitForTimeout(400);
const texteMonde = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/Climat/.test(texteMonde), 'l’écran Monde annonce le climat');
ok(/Chronique du monde/.test(texteMonde), 'l’écran Monde tient une chronique');
ok(/Routes marchandes/.test(texteMonde), 'l’écran Monde suit les routes marchandes');
await page.screenshot({ path: join(CAPTURES, '13-monde.png'), fullPage: true });

console.log('\n8 quinquies. Groupes : détacher, assigner, regrouper');
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.waitForTimeout(300);
ok(await page.locator('.grp').count() >= 1, 'la barre de groupes est affichée');

// Tâche individuelle : on ouvre une fiche et on donne un ordre à une personne.
await page.locator('details.perso summary').first().click();
await page.waitForTimeout(250);
await page.locator('[data-a="tache"][data-k="chasse"]').first().click();
await page.waitForTimeout(400);
const tacheOk = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return s.player.groupes.some((g) => g.membres.some((c) => c.tache && c.tache.type === 'chasse'));
});
ok(tacheOk, 'une tâche personnelle est enregistrée sur le membre');

// Détachement : on coche quelqu'un, on le détache, on vérifie l'état.
const avantGroupes = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.groupes.length);
await page.locator('[data-a="detacher-sel"]').first().click();
await page.waitForTimeout(300);
const boutonDetacher = page.locator('[data-a="detacher"]:not([disabled])');
ok(await boutonDetacher.count() > 0, 'le bouton de détachement s’active une fois quelqu’un choisi');
await boutonDetacher.first().click();
await page.waitForTimeout(500);
const apres = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return {
    n: s.player.groupes.length,
    membres: s.player.groupes.reduce((t, g) => t + g.membres.length, 0),
    rations: s.player.groupes.map((g) => g.inventaire.rations),
  };
});
ok(apres.n === avantGroupes + 1, 'un nouveau groupe existe', `${avantGroupes} → ${apres.n}`);
ok(apres.membres === 3, 'personne n’a été perdu ni dupliqué', `${apres.membres}`);
ok(apres.rations.every((r) => r > 0), 'les deux groupes ont des vivres', apres.rations.join(' / '));
await page.screenshot({ path: join(CAPTURES, '15-groupes.png'), fullPage: true });

// La carte doit montrer les deux groupes, pas seulement celui qu'on regarde.
await page.click('[data-a="onglet"][data-k="carte"]');
await page.waitForTimeout(400);
const marqueurs = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const c = document.querySelector('#carte');
  const ctx = c.getContext('2d');
  const L = s.world.largeur;
  const CELL = Math.round(c.width / L);
  // Un marqueur laisse du blanc franc dans sa case ; on le cherche là où le
  // moteur dit qu'un groupe se trouve.
  return s.player.groupes.map((g) => {
    const x = (g.regionId % L) * CELL;
    const y = Math.floor(g.regionId / L) * CELL;
    const d = ctx.getImageData(x + 4, y + 4, 8, 8).data;
    let blancs = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 220) blancs++;
    return blancs;
  });
});
ok(marqueurs.every((m) => m > 0), 'chaque groupe est marqué sur la carte', marqueurs.join(' / '));
await page.screenshot({ path: join(CAPTURES, '16-carte-groupes.png') });
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.waitForTimeout(300);

// On bascule d'un groupe à l'autre : le point de vue suit.
await page.locator('.grp').nth(1).click();
await page.waitForTimeout(400);
const bascule = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.groupeActif);
ok(!!bascule, 'on peut changer de groupe affiché');

// Regrouper : les deux sont au même endroit, donc l'absorption est proposée.
const fusion = page.locator('[data-a="fusionner"]');
ok(await fusion.count() > 0, 'le regroupement est proposé quand les groupes se croisent');
await fusion.first().click();
await page.waitForTimeout(500);
const refusion = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return { n: s.player.groupes.length, membres: s.player.groupes.reduce((t, g) => t + g.membres.length, 0) };
});
ok(refusion.n === avantGroupes, 'les groupes sont réunis', `${refusion.n}`);
ok(refusion.membres === 3, 'tout le monde est rassemblé', `${refusion.membres}`);

console.log('\n8 duodecies. Une politique qui a un visage');
const politique = nouvellePartie(6363, { maintenant: Date.now() });
avancer(politique, 3000);
politique.world.regions.forEach((r) => { r.decouvert = true; });
politique.base.recherche.cryptographie = 1;
politique.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(politique));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.click('[data-a="onglet"][data-k="monde"]');
await page.waitForTimeout(500);
const textePol = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/Directeur|Commandant|Parrain|Porte-parole|Voix du Signal|Chef de convoi/.test(textePol),
  'chaque faction montre qui la dirige');
ok(/conquérant|prudent|bâtisseur|rancunier|conciliateur|rapace|méthodique/i.test(textePol),
  'avec son tempérament');
ok(/ville\(s\) prise\(s\)/.test(textePol), 'et son bilan');
await page.screenshot({ path: join(CAPTURES, '22-politique.png'), fullPage: true });
const guerresAffichees = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return { n: s.world.guerres.length, avecBut: s.world.guerres.filter((g) => g.but).length };
});
if (guerresAffichees.n > 0) {
  ok(guerresAffichees.avecBut === guerresAffichees.n,
    'toute guerre en cours a un objet déclaré', JSON.stringify(guerresAffichees));
  ok(/Déclarée /.test(textePol), 'et cet objet est affiché');
} else {
  ok(true, 'aucune guerre en cours à cet instant');
}

console.log('\n8 undecies. Métiers et gens d’une ville');
await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.click('[data-a="nouvelle"]');
await page.waitForSelector('#carte');
await page.waitForTimeout(600);
ok(await page.locator('[data-a="modale"][data-m="ville"]').count() > 0,
  'la ville propose de voir qui y vit');
await page.click('[data-a="modale"][data-m="ville"]');
await page.waitForTimeout(400);
const texteVille = await page.evaluate(() => document.querySelector('#modale').textContent);
ok(/MÉTIERS/i.test(texteVille) && /actifs/.test(texteVille),
  'elle détaille ses métiers et le nombre d’actifs');
ok(/QUI COMPTE/i.test(texteVille) && /armurier/i.test(texteVille),
  'et nomme ceux qui comptent, dont l’armurier');
ok(/Caractère/.test(texteVille) && /Vous concernant/.test(texteVille),
  'chacun a un caractère et une opinion sur vous');
await page.screenshot({ path: join(CAPTURES, '21-ville.png'), fullPage: true });
const notables = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const c = s.world.colonies.find((x) => x.notables && x.notables.length);
  return c ? { n: c.notables.length, ok: c.notables.every((p) => p.nom && p.age > 0) } : null;
});
ok(notables && notables.n >= 2 && notables.ok,
  'les notables sont bien dans la sauvegarde, avec leur état', JSON.stringify(notables));
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);

console.log('\n8 terdecies. Quelqu’un vous demande quelque chose');
// On pose une demande à la main : le hasard finit par en produire, mais un test
// d'interface ne doit pas attendre le hasard.
const service = partieAvancee();
const colS = service.world.colonies.find((c) => c.notables && c.notables.length);
const gS = groupeActif(service);
gS.regionId = colS.regionId;
gS.inventaire.medkit = 60;
gS.inventaire.rations = 400;
colS.notables[0].demande = {
  res: 'medkit', quantite: 6, echeance: service.temps + 400,
  texte: 'Il me faut 6 medkits. Je recouds avec ce que je trouve, et je trouve mal.',
  prime: 240,
};
colS.notables[0].memoire = [{ quoi: 'pillage', detail: null, t: 0 }];
service.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(service));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.click('[data-a="modale"][data-m="ville"]');
await page.waitForTimeout(400);
const texteServ = await page.evaluate(() => document.querySelector('#modale').textContent);
ok(/Il me faut 6 medkits/.test(texteServ), 'la demande est dite à la première personne');
ok(/pillé une caravane/.test(texteServ), 'et il se souvient de ce qu’on lui a fait');
// On fait défiler jusqu'à la demande : la capture doit montrer ce qu'on teste.
await page.evaluate(() => {
  const b = document.querySelector('[data-a="honorer"]');
  if (b) b.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(200);
await page.screenshot({ path: join(CAPTURES, '23-service.png'), fullPage: true });
ok(await page.locator('[data-a="honorer"]:not([disabled])').count() > 0,
  'on peut lui remettre la marchandise puisqu’on l’a');
const creditsAv = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.credits);
await page.click('[data-a="honorer"]');
await page.waitForTimeout(500);
const apresServ = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const c = s.world.colonies.find((x) => x.notables && x.notables.some((p) => p.memoire && p.memoire.length));
  const p = c.notables.find((x) => x.memoire && x.memoire.length);
  return { credits: s.player.credits, opinion: p.opinion, demande: !!p.demande, memoire: p.memoire.length };
});
ok(apresServ.credits > creditsAv && !apresServ.demande && apresServ.opinion > 0,
  'le service rendu paie, close la demande et change ce qu’il pense de vous',
  JSON.stringify(apresServ));
const texteApres = await page.evaluate(() => document.querySelector('#modale').textContent);
ok(/apporté des medkits/.test(texteApres), 'et il s’en souvient à l’écran');
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);

console.log('\n8 decies. Métiers de l’avant-poste');
const bourg = partieAvancee();
Object.assign(bourg.base.batiments, { hydroponie: 2, entrepot: 3, mur: 2, baraquement: 1 });
bourg.base.pop = 8;
Object.assign(bourg.base.stock, { biomasse: 900, rations: 400, carburant: 200 });
groupeActif(bourg).regionId = bourg.base.regionId;
bourg.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(bourg));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.click('[data-a="onglet"][data-k="base"]');
await page.waitForTimeout(500);
const texteMetiers = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/MÉTIERS/i.test(texteMetiers), 'l’avant-poste affiche ses métiers');
ok(/manœuvre/i.test(texteMetiers), 'et compte les habitants sans poste');
await page.screenshot({ path: join(CAPTURES, '20-metiers.png'), fullPage: true });

const plus = page.locator('[data-a="poste"][data-n="max"]:not([disabled])');
ok(await plus.count() > 0, 'des postes sont ouverts et pourvoyables', `${await plus.count()}`);
await plus.first().click();
await page.waitForTimeout(500);
const apresPostes = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const p = s.base.postes || {};
  return { total: Object.values(p).reduce((a, b) => a + b, 0), pop: s.base.pop };
});
ok(apresPostes.total > 0, 'l’affectation est enregistrée', JSON.stringify(apresPostes));
ok(apresPostes.total <= apresPostes.pop, 'et ne dépasse jamais la population');

console.log('\n8 nonies. Transmission à l’avant-poste');
const transmet = partieAvancee();
const gTr = groupeActif(transmet);
transmet.base.batiments.antenne = Math.max(1, transmet.base.batiments.antenne || 0);
transmet.base.stock.rations = 600;
gTr.regionId = transmet.base.regionId;
// On remet les deux intéressés sur pied. Un homme K.O. et affamé n'enseigne pas,
// et c'est très bien ainsi — mais ce n'est pas ce que ce test vérifie : la
// compétence effective est rabotée de moitié par l'état du corps, et le fixture
// sortait d'une saison de fouille.
for (const c of [gTr.membres[0], gTr.membres[1]]) {
  c.etat = 'ok'; c.koHeures = 0; c.faim = 0; c.fatigue = 0; c.moral = 80; c.sang = 0;
  for (const p2 of Object.keys(c.corps)) c.corps[p2].pv = c.corps[p2].max;
}
gTr.membres[0].skills.medecine = 75;   // le vétéran qui peut enseigner
gTr.membres[1].skills.medecine = 6;
transmet.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(transmet));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.click('[data-a="onglet"][data-k="base"]');
await page.waitForTimeout(500);
const texteBase = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/TRANSMISSION/i.test(texteBase), 'l’avant-poste propose de transmettre');
const former = page.locator('[data-a="apprendre-maison"]');
ok(await former.count() > 0, 'un vétéran présent rend une matière enseignable');
await page.screenshot({ path: join(CAPTURES, '19-transmission.png'), fullPage: true });
if (await former.count() > 0) {
  await former.first().click();
  await page.waitForTimeout(500);
  const etat = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
    const gens = s.player.groupes.flatMap((g) => g.membres);
    return {
      eleves: gens.filter((c) => c.formation && c.formation.maison).length,
      maitres: gens.filter((c) => c.enseigne).length,
    };
  });
  ok(etat.eleves === 1 && etat.maitres === 1,
    'l’élève et le maître sont tous deux immobilisés', `${etat.eleves} / ${etat.maitres}`);
}

console.log('\n8 septies. Écoles et diplômes');
// On se pose dans une ville qui enseigne, avec de quoi payer.
const ecolier = nouvellePartie(1717, { maintenant: Date.now() });
const gEc = groupeActif(ecolier);
const villeEcole = ecolier.world.colonies.find((c) => ecolesDe(ecolier.world, c).length);
gEc.regionId = villeEcole.regionId;
ecolier.player.credits = 9000;
avancer(ecolier, 3);
ecolier.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(ecolier));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.waitForTimeout(500);

ok(await page.locator('[data-a="modale"][data-m="ecole"]').count() > 0,
  'la ville propose ses écoles');
await page.click('[data-a="modale"][data-m="ecole"]');
await page.waitForTimeout(400);
const texteEcole = await page.evaluate(() => document.querySelector('#modale').textContent);
ok(/au minimum/.test(texteEcole) && /Apprentissage ensuite/.test(texteEcole),
  'chaque diplôme annonce son plancher et son gain d’apprentissage');
await page.screenshot({ path: join(CAPTURES, '18-ecole.png') });

const inscriptible = page.locator('[data-a="inscrire"]:not([disabled])');
ok(await inscriptible.count() > 0, 'quelqu’un peut s’inscrire');
await inscriptible.first().click();
await page.waitForTimeout(500);
const apresInscription = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const gens = s.player.groupes.flatMap((g) => g.membres);
  return {
    enFormation: gens.filter((c) => c.formation).length,
    credits: s.player.credits,
  };
});
ok(apresInscription.enFormation === 1, 'l’élève est inscrit', `${apresInscription.enFormation}`);
ok(apresInscription.credits < 9000, 'et la formation a été payée', `${apresInscription.credits} cr`);
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);
// La fiche du membre doit dire qu'il est à l'école.
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.waitForTimeout(300);
const fiches = page.locator('details.perso summary');
for (let i = 0; i < await fiches.count(); i++) await fiches.nth(i).click();
await page.waitForTimeout(400);
ok(/À L’ÉCOLE|Indisponible/i.test(await page.evaluate(() => document.querySelector('#ecran').textContent)),
  'la fiche du membre annonce qu’il est indisponible');

console.log('\n8 sexies. Information imparfaite');
// On fabrique une partie où l'escouade a vu une ville, puis s'en est allée.
const espion = nouvellePartie(31337, { maintenant: Date.now() });
const gEsp = groupeActif(espion);
const villeVue = espion.world.colonies.find((c) => c.regionId === gEsp.regionId);
const villeLoin = espion.world.colonies.find((c) => c.id !== villeVue.id);
avancer(espion, 5);
gEsp.regionId = villeLoin.regionId;   // on y passe
avancer(espion, 2);
gEsp.regionId = villeVue.regionId;    // puis on repart
avancer(espion, 300);
espion.world.regions.forEach((r) => { r.decouvert = true; });
espion.dernierReel = Date.now();

await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(espion));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.waitForTimeout(500);

// Le registre du monde doit dater ses relevés.
await page.click('[data-a="onglet"][data-k="monde"]');
await page.waitForTimeout(400);
const texteRegistre = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/il y a \d+ [hj]/.test(texteRegistre), 'les relevés de villes portent leur date');
ok(/trésor inconnu/.test(texteRegistre), 'le trésor des factions n’est pas su sans cryptographie');
await page.screenshot({ path: join(CAPTURES, '17-connaissance.png'), fullPage: true });

// Une ville jamais visitée ne livre rien, même repérée sur la carte.
await page.click('[data-a="onglet"][data-k="carte"]');
await page.waitForTimeout(300);
const jamaisVue = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const connues = new Set(Object.keys(s.connaissance.colonies));
  const c = s.world.colonies.find((x) => !connues.has(x.id));
  return c ? c.regionId : null;
});
ok(jamaisVue != null, 'il reste des villes jamais relevées', String(jamaisVue));
if (jamaisVue != null) {
  await page.evaluate((rid) => {
    const cv = document.querySelector('#carte');
    const boite = cv.parentElement;
    const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
    const L = s2.world.largeur;
    const CELL = Math.round(cv.width / L);
    // La carte défile maintenant : il faut amener la case dans la fenêtre avant
    // de cliquer, sinon on tape à côté du canvas.
    boite.scrollLeft = Math.max(0, (rid % L) * CELL + CELL / 2 - boite.clientWidth / 2);
    boite.scrollTop = Math.max(0, Math.floor(rid / L) * CELL + CELL / 2 - boite.clientHeight / 2);
    const r = cv.getBoundingClientRect();
    const ech = r.width / cv.width;
    const x = ((rid % L) * CELL + CELL / 2) * ech + r.left;
    const y = (Math.floor(rid / L) * CELL + CELL / 2) * ech + r.top;
    const cible = document.elementFromPoint(x, y) || cv;
    cible.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  }, jamaisVue);
  await page.waitForTimeout(400);
  const txt = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/jamais mis les pieds/.test(txt), 'une ville jamais visitée ne livre ni drapeau ni population');
}

console.log('\n8 quater. Retour après une longue absence');
// Le pire cas réel : le plafond de rattrapage, dix-sept mille heures à rejouer
// au chargement. Ça doit se voir à l'écran et rendre la main, pas figer l'onglet.
// Une escouade bien approvisionnée, pour que le rattrapage aille loin plutôt
// que de s'arrêter sur une fin de partie au bout de quelques centaines d'heures.
const veille = nouvellePartie(20260729, { maintenant: Date.now() });
groupeActif(veille).inventaire.rations = 200000;
groupeActif(veille).inventaire.medkit = 500;
const veilleTxt = serialiser(veille);
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => {
  const s = JSON.parse(txt);
  // Quatre heures de vraie absence à la vitesse par défaut : près de six mille
  // heures de jeu à rejouer, largement au-delà du seuil de l'écran.
  s.dernierReel = Date.now() - 4 * 3600 * 1000;
  localStorage.setItem('cendres.save.v1', JSON.stringify(s));
}, veilleTxt);
const tAvant = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
await page.click('[data-a="continuer"]');
await page.waitForSelector('.rattrapage', { timeout: 5000 });
ok(true, 'l’écran de rattrapage s’affiche');

// On interroge la page pendant qu'elle rejoue : si elle répond et que la barre
// progresse, c'est que le fil d'exécution n'est pas bloqué — tout l'objet du
// découpage en tranches.
let progression = 0;
let capture = false;
for (let i = 0; i < 200; i++) {
  const vu = await page.evaluate(() => {
    const b = document.querySelector('.rattrapage-p i');
    const j = document.querySelector('.rattrapage-j');
    return b ? { l: b.style.width, t: j ? j.textContent : '' } : null;
  });
  if (!vu) break;
  const pct = parseFloat(vu.l);
  if (pct > 0 && pct < 100 && /jours rejoués/.test(vu.t)) {
    progression = Math.max(progression, pct);
    if (!capture) { await page.screenshot({ path: join(CAPTURES, '14-rattrapage.png') }); capture = true; }
  }
  await page.waitForTimeout(40);
}
ok(progression > 0, 'la page répond et la barre progresse pendant le rattrapage',
  `${progression.toFixed(0)} %`);

await page.waitForSelector('.rattrapage', { state: 'detached', timeout: 120000 });
await page.waitForSelector('#carte');
const tApres = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
ok(tApres - tAvant > 2000, 'le temps passé a bien été rejoué', `${tAvant} → ${tApres} h`);
await page.click('[data-a="onglet"][data-k="monde"]');
await page.waitForTimeout(300);
ok((await page.evaluate(() => document.querySelector('#ecran').textContent.trim().length)) > 60,
  'le jeu est jouable au sortir du rattrapage');

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
