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
import {
  fonderBase, lancerConstruction, lancerRecherche, COUT_FONDATION,
} from '../src/base.js';
import { donnerOrdre } from '../src/squad.js';
import { serialiser } from '../src/save.js';
import { groupeActif } from '../src/groupes.js';
import { ecolesDe } from '../src/formation.js';
import { confierSecteur } from '../src/secteur.js';
import { capturables, fairePrisonniers } from '../src/justice.js';
import { loisDe } from '../src/lois.js';
import { genererBande } from '../src/combat.js';
import { Rng } from '../src/rng.js';

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
  const s = nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' });
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
  // Le bandeau passe à la ligne quand il est plein : deux blocs qui se suivent
  // ne sont pas forcément sur la même ligne, et comparer leurs abscisses sans
  // regarder leur ordonnée ferait crier la garde à chaque retour à la ligne.
  for (let i = 1; i < blocs.length; i++) {
    const memeLigne = Math.abs(blocs[i].top - blocs[i - 1].top) < 2;
    if (memeLigne && blocs[i].left < blocs[i - 1].right - 0.5) chevauche++;
  }
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

// Ravitailler le camp sans y vider son sac : c'est le geste normal, et il
// demandait de tout déposer puis d'en reprendre les trois quarts.
{
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(300);
  // La sauvegarde de référence a fait marcher l'escouade depuis : on la remet au
  // camp, faute de quoi le bouton de transfert n'existe pas — il n'a pas à
  // exister quand on est ailleurs.
  // On recharge d'abord, puis on injecte : la partie en cours sauvegarde sur
  // `pagehide` et écraserait la modification. Même piège que partout ailleurs
  // dans ce fichier, et je viens d'y retomber.
  const auCamp = await page.evaluate(() => {
    const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
    s2.player.groupes[0].regionId = s2.base.regionId;
    s2.player.groupes[0].ordre = { type: 'repos' };
    return JSON.stringify(s2);
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), auCamp);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(400);
  if (await page.locator('[data-a="modale"][data-m="transfert"]').count()) {
    await page.click('[data-a="modale"][data-m="transfert"]');
    await page.waitForTimeout(350);
    ok((await page.locator('[data-a="qte-transfert"]').count()) > 0,
      'le transfert avec l’avant-poste propose une quantité');
    await page.click('[data-a="qte-transfert"][data-q="1"]');
    await page.waitForTimeout(250);
    const dep = page.locator('[data-a="deposer"]:not([disabled])').first();
    if (await dep.count()) {
      const cle = await dep.getAttribute('data-k');
      const lire = (k) => page.evaluate((x) => {
        const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
        return Math.floor(s2.player.groupes[0].inventaire[x] || 0);
      }, k);
      const avant = await lire(cle);
      await dep.click();
      await page.waitForTimeout(350);
      ok(avant - (await lire(cle)) === 1,
        'à ×1, on ne dépose qu’une unité à l’avant-poste',
        `${avant} → ${await lire(cle)}`);
    }
    await page.screenshot({ path: join(CAPTURES, '07c-transfert.png') });
    await page.click('[data-a="fermer"]');
    await page.waitForTimeout(200);
  }
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(250);
}

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
// Le vrai premier écran : une partie neuve, celle qu'un joueur lance.
{
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="nouvelle"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
  const premierEcran = await page.locator('#ecran').innerText();
  ok(!/MARCHÉ|RECRUTER/i.test(premierEcran),
    'une partie neuve ne commence plus dans une ville',
    premierEcran.slice(0, 160).replace(/\n+/g, ' | '));
  ok(/ORDRE DE|POSITION/i.test(premierEcran),
    'mais l’escouade a bien un ordre et une position : on n’est pas nulle part');
  await page.screenshot({ path: join(CAPTURES, '00b-depart.png'), fullPage: true });
  const rep = await page.evaluate(
    () => JSON.parse(localStorage.getItem('cendres.save.v1')).player.reputation);
  ok(Object.values(rep).every((v) => v === 0),
    'et personne ne vous connaît encore', JSON.stringify(rep));
}

// On repart d'une partie neuve, mais posée dans une ville : le jeu commence
// désormais dans le désert, et les vérifications qui suivent ont besoin d'un
// marché, d'un panneau et d'un armurier sous la main. Le départ sauvage a sa
// propre section (voir plus bas) — ici on teste des écrans, pas l'ouverture.
{
  const enVille = serialiser(nouvellePartie(20260729, {
    maintenant: Date.now(), depart: 'ville',
  }));
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), enVille);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
}

// Rien ne doit descendre lettre par lettre — ni à droite, ni à gauche.
//
// Une `.ligne` a deux cellules et l'une des deux ne cède jamais : dans le cas
// ordinaire c'est l'étiquette de gauche, dans le cas `.souple` c'est la valeur
// de droite. Si le texte de l'autre côté est trop long, la cellule qui reste
// tombe à un caractère de large et son contenu descend en colonne.
//
// La garde ne mesurait que la droite. Elle a donc laissé passer exactement le
// même bug par la gauche, sur la fiche de régime d'une ville, où « Domaine »
// est descendu lettre par lettre pendant qu'elle affichait tout vert. Une garde
// qui ne surveille qu'un des deux côtés d'une symétrie n'en surveille aucun.
// Défini côté Node plutôt que posé sur `window` : chaque `reload` effacerait la
// fonction, et la garde suivante planterait au lieu de mesurer.
const colonnes = (p) => p.evaluate(() => {
  const mauvais = [];
  for (const cel of document.querySelectorAll('.ligne .v, .ligne .k')) {
    const t = (cel.innerText || '').trim();
    if (t.length < 4) continue;
    const r = cel.getBoundingClientRect();
    // Plus haut que large avec du texte dedans : il descend en colonne.
    if (r.height > r.width * 1.6 && r.height > 40) {
      const voisin = cel.parentElement ? cel.parentElement.innerText : '?';
      mauvais.push(`${voisin.slice(0, 30).replace(/\n+/g, ' ')} → ${t.slice(0, 24)}`);
    }
  }
  return mauvais;
});
{
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(400);
  const verticales = await colonnes(page);
  ok(verticales.length === 0, 'aucune valeur ne s’affiche en colonne sur mobile',
    verticales.slice(0, 3).join(' | '));
  // On rend l'onglet où la suite attend le panneau de la ville.
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(300);
}

// Ce que le bandeau doit dire sans qu'on aille le chercher : combien de jours
// de vivres il reste. On mourait de faim en regardant un sac plein de ferraille.
{
  const bandeau = await page.locator('#barre-haut').innerText();
  ok(/VIV\s+[\d.]+j/i.test(bandeau),
    'le bandeau annonce les jours de vivres restants',
    bandeau.replace(/\n+/g, ' | '));
}

// L'estime disait ce qu'elle valait, jamais ce qu'elle faisait.
{
  const texteVille = await page.locator('#ecran').innerText();
  ok(/estime change ici/i.test(texteVille),
    'la fiche de ville dit à quoi sert l’estime qu’on y a',
    texteVille.slice(0, 200).replace(/\n+/g, ' | '));
  await page.click('summary:has-text("estime change ici")');
  await page.waitForTimeout(250);
  const deplie = await page.locator('#ecran').innerText();
  ok(/intendance|engagement|coffre|prix|prime/i.test(deplie),
    'et déplié, il énumère des conséquences concrètes');
  ok(/À [+−-]\d/.test(deplie),
    'avec la distance au palier suivant, en points');
  // On le replie : la suite de la section compte sur la fiche telle qu'elle est.
  await page.click('summary:has-text("estime change ici")');
  await page.waitForTimeout(200);
  // La fiche de ville porte le régime, dont la description est un texte libre à
  // *droite* d'une étiquette courte — le cas inverse de la feuille de service,
  // et celui qui a fait tomber « Domaine » lettre par lettre.
  const colVille = await colonnes(page);
  ok(colVille.length === 0,
    'rien ne descend en colonne sur la fiche d’une ville',
    colVille.slice(0, 3).join(' | '));
}

// L'avant-poste doit dire ce qu'il lui manque, sinon on croit qu'il n'y a rien.
{
  const camp = serialiser((() => {
    const t = partieAvancee();
    const g = t.player.groupes[0];
    const vide = t.world.regions.find(
      (r) => !t.world.colonies.some((c) => c.regionId === r.i));
    g.regionId = vide.i;
    for (const k of Object.keys(COUT_FONDATION)) {
      g.inventaire[k] = (g.inventaire[k] || 0) + COUT_FONDATION[k];
    }
    fonderBase(t, () => {}, g);
    // `partieAvancee` fournit déjà un camp bien garni : on le vide, parce que
    // c'est le camp démuni qui pose le problème qu'on veut voir corrigé.
    for (const k of Object.keys(t.base.stock)) t.base.stock[k] = 0;
    t.base.batiments = {};
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), camp);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(400);
  const vuBase = await page.locator('#ecran').innerText();
  ok(/CHAÎNE DE L’AUTONOMIE/i.test(vuBase),
    'un camp neuf montre la chaîne de l’autonomie',
    vuBase.slice(0, 200).replace(/\n+/g, ' | '));
  ok(/Ramasser/i.test(vuBase) && /Loger/i.test(vuBase),
    'récolter et loger y sont nommés, pas noyés dans le catalogue');
  ok(/Il manque \d+ \w+/i.test(vuBase),
    'et un bâtiment hors de portée dit de quoi il manque');
  ok(/TENIR SUR PLACE/i.test(vuBase),
    'les bâtiments sont groupés par ce qu’ils font');
  await page.screenshot({ path: join(CAPTURES, '07b-camp-neuf.png'), fullPage: true });
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="nouvelle"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
}

// Le point de situation : muet quand tout va bien, net quand ça presse.
{
  const affame = serialiser((() => {
    const t = partieAvancee();
    const g = t.player.groupes[0];
    g.inventaire.rations = 1;
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), affame);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(400);
  const vu = await page.locator('#ecran').innerText();
  ok(/POINT DE SITUATION/i.test(vu),
    'un point de situation s’affiche quand quelque chose presse',
    vu.slice(0, 200).replace(/\n+/g, ' | '));
  ok(/vivres|manger/i.test(vu),
    'et il nomme la famine qui vient plutôt qu’un pourcentage');
  await page.screenshot({ path: join(CAPTURES, '01b-situation.png') });
  // On rend la ville que la suite attend. Une partie neuve démarre désormais
  // dans le désert : on injecte donc explicitement un départ en ville.
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt),
    serialiser(nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' })));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
}

// Le coffre en ville : louer, y mettre, reprendre.
await page.click('[data-a="modale"][data-m="coffre"]');
await page.waitForTimeout(400);
ok((await page.locator('[data-a="coffre-louer"]').count()) > 0,
  'une ville propose un coffre à louer');
// L'aide annonçait un seuil d'estime écrit en dur, d'avant les régimes : elle
// promettait quarante là où une Franchise en demande vingt-cinq. Elle doit citer
// le régime du lieu et l'estime qu'on y a réellement.
{
  const aide = await page.locator('#modale').innerText();
  ok(/(franchise|charte|commune|domaine|ville libre)/i.test(aide),
    'et l’aide du coffre nomme le régime qui décide de la propriété',
    aide.slice(0, 220).replace(/\n+/g, ' | '));
  ok(/vous en avez -?\d+/i.test(aide) || /on ne possède rien ici/i.test(aide)
    || /personne n’est en position/i.test(aide),
    'avec l’estime qu’on y a, plutôt qu’un seuil abstrait');
}
await page.screenshot({ path: join(CAPTURES, '09e-coffre.png') });
if ((await page.locator('[data-a="coffre-louer"]:not([disabled])').count()) > 0) {
  await page.click('[data-a="coffre-louer"]');
  await page.waitForTimeout(400);
  ok((await page.locator('[data-a="coffre-deposer"]').count()) > 0,
    'et une fois loué, on peut y déposer');
  const dedansAvant = await page.evaluate(
    () => Object.keys(JSON.parse(localStorage.getItem('cendres.save.v1')).player.coffres || {}).length);
  ok(dedansAvant === 1, 'le coffre est bien enregistré', `${dedansAvant}`);
  if ((await page.locator('[data-a="coffre-deposer"]:not([disabled])').count()) > 0) {
    await page.click('[data-a="coffre-deposer"]:not([disabled])');
    await page.waitForTimeout(400);
    const contenu = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('cendres.save.v1')).player.coffres;
      const k = Object.keys(c)[0];
      return Object.values(c[k].contenu).reduce((a, b) => a + b, 0);
    });
    ok(contenu > 0, 'et ce qu’on y met y reste', `${contenu} unités`);
  }
  // Une partie, et non tout ou rien : le bouton vidait le sac d'un coup, si
  // bien que ravitailler un camp en gardant de quoi rentrer demandait de tout
  // déposer puis d'en reprendre les trois quarts.
  ok((await page.locator('[data-a="qte-transfert"]').count()) > 0,
    'le coffre propose de choisir la quantité');
  await page.click('[data-a="qte-transfert"][data-q="1"]');
  await page.waitForTimeout(250);
  const cible1 = page.locator('[data-a="coffre-deposer"]:not([disabled])').first();
  if (await cible1.count()) {
    const cle1 = await cible1.getAttribute('data-k');
    const sacAvant = await page.evaluate((k) => {
      const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
      return Math.floor(s2.player.groupes[0].inventaire[k] || 0);
    }, cle1);
    await cible1.click();
    await page.waitForTimeout(350);
    const sacApres = await page.evaluate((k) => {
      const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
      return Math.floor(s2.player.groupes[0].inventaire[k] || 0);
    }, cle1);
    ok(sacAvant - sacApres === 1,
      'à ×1 on ne dépose qu’une unité, et le sac garde le reste',
      `${sacAvant} → ${sacApres}`);
  }
}
await page.click('[data-a="fermer"]');
await page.waitForTimeout(200);

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

// Une ville affranchie garde son marché.
//
// Le panneau entier — marché, recrutement, contrats, armurier — disparaissait
// dès qu'une ville perdait son drapeau, parce que le garde-fou anti-ruine
// confondait « morte » et « sans drapeau ». Or une ville libre est bien vivante.
{
  const libre = serialiser((() => {
    const t = partieAvancee();
    const col = t.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');
    col.faction = null;
    t.world.regions[col.regionId].controle = null;
    t.player.groupes[0].regionId = col.regionId;
    t.player.groupes[0].allegeance = null;
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), libre);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(500);
  ok((await page.locator('[data-a="modale"][data-m="marche"]').count()) > 0,
    'une ville sans drapeau garde son marché');
  ok((await page.locator('[data-a="modale"][data-m="recrutement"]').count()) > 0,
    'et son banc de recrutement');
  await page.click('[data-a="modale"][data-m="marche"]');
  await page.waitForTimeout(400);
  ok((await page.locator('[data-a="acheter"]').count()) > 0,
    'et l’on peut y commercer');
  await page.click('[data-a="fermer"]');
  await page.waitForTimeout(200);
}

// Le dossier des contrats : on doit pouvoir relire ce qu'on a signé.
{
  const avecDossier = serialiser((() => {
    const t = partieAvancee();
    t.player.dossier = [
      { t: 10, titre: 'Reconnaître le secteur W5', type: 'reconnaissance',
        faction: 'libres', issue: 'echu', cr: 0, rep: 0 },
      { t: 200, titre: 'Porter 12 medkit à Cité-Vesper (D4)', type: 'livraison',
        faction: 'libres', issue: 'honore', cr: 640, rep: 6 },
    ];
    t.player.bilanContrats = { honores: 1, echus: 1, caducs: 0, cr: 640, rep: 6 };
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), avecDossier);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="contrats"]');
  await page.waitForTimeout(400);
  const vuD = await page.locator('#ecran').innerText();
  ok(/DOSSIER DES CONTRATS/i.test(vuD),
    'les contrats passés ont leur dossier, comme les ordres ont leur feuille',
    vuD.slice(0, 200).replace(/\n+/g, ' | '));
  ok(/honoré/i.test(vuD) && /échu/i.test(vuD),
    'avec l’issue de chacun');
  ok(/640 cr/.test(vuD), 'et ce que chacun a rapporté');
  await page.screenshot({ path: join(CAPTURES, '11b-dossier.png'), fullPage: true });
}

// Un ordre de mission doit dire où aller : sans coordonnées, il est injouable.
{
  const avecOrdre = serialiser((() => {
    const t = partieAvancee();
    const g = t.player.groupes[0];
    const col = t.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');
    const loin = t.world.colonies.find(
      (c) => !c.ruine && c.faction === col.faction && c.id !== col.id) || col;
    t.player.reputation[col.faction] = 60;
    g.regionId = col.regionId;
    g.allegeance = {
      faction: col.faction, points: 40, depuis: 0, derniereSolde: 0, actes: [],
      prochainOrdre: 99999, manques: 0,
      // Des titres longs, écrits en dur : c'est sur eux que la feuille de
      // service affichait la pastille en colonne, lettre par lettre. Un nom de
      // ville tiré au sort aurait donné un titre court une fois sur deux, et la
      // garde n'aurait rien vu.
      faits: [
        {
          t: 10, type: 'ravitaillement', issue: 'manque', cr: 0, pts: -6, rep: -3,
          titre: 'Ravitailler Poste-Quatre-Vents : 42 composants',
        },
        {
          t: 200, type: 'reconnaissance', issue: 'honore', cr: 300, pts: 20, rep: 4,
          titre: 'Reconnaître le secteur N13 pour le compte de la maison',
        },
      ],
      ordre: {
        id: 'o-test', type: 'ravitaillement', colonieId: loin.id, ressource: 'rations',
        quantite: 20, titre: 'Ravitailler', recompense: 400, service: 60,
        duree: 400, echeance: t.temps + 400,
      },
    };
    return t;
  })());
  // On recharge d'abord, puis on injecte : la partie en cours sauvegarde sur
  // `pagehide` et écraserait l'injection. Même piège que plus haut.
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), avecOrdre);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="contrats"]');
  await page.waitForTimeout(500);
  const txtO = await page.locator('#ecran').innerText();
  ok(/région/i.test(txtO) && /marche/i.test(txtO),
    'un ordre de mission dit où aller et combien de marche ça représente',
    txtO.slice(0, 300).replace(/\n+/g, ' | '));
  // Et il donne la case, y compris quand la destination est une ville : c'est
  // le cas qui n'avait jamais marché, parce que le nom de la ville remplaçait
  // les coordonnées au lieu de s'y ajouter.
  ok(/\([A-Z]\d+\)/.test(txtO),
    'et il donne la case de la destination, ville comprise',
    txtO.slice(0, 300).replace(/\n+/g, ' | '));
  ok((await page.locator('[data-a="voyage"]').count()) > 0,
    'et propose de s’y rendre');
  ok(/feuille de service/i.test(txtO),
    'et l’engagement montre ce qu’on a déjà fait pour eux');
  // Le titre d'une mission est un texte libre, pas une étiquette : s'il reste
  // insécable il déborde, il ne laisse qu'un caractère de large à la pastille,
  // et « MANQUÉ · -3 estime » descend lettre par lettre hors de l'écran. On le
  // mesure ici parce que la garde générale plus haut tourne sur une partie
  // neuve, où le dossier est vide et où il n'y a donc rien à déborder.
  const pastillesEnColonne = await colonnes(page);
  ok(pastillesEnColonne.length === 0,
    'un titre de mission à rallonge ne met pas son verdict en colonne',
    pastillesEnColonne.slice(0, 3).join(' | '));
  await page.screenshot({ path: join(CAPTURES, '09d-ordre.png'), fullPage: true });
  // On rend la partie posée en ville que la suite de la section attend : les
  // vérifications du marché comptent sur son étal et sa bourse. Une partie
  // neuve, elle, démarre maintenant dans le désert.
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt),
    serialiser(nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' })));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
}

// Écran d'escouade : qui fait quoi, et où passent les vivres.
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.waitForTimeout(400);
ok((await page.locator('.panneau').filter({ hasText: 'Qui fait quoi' }).count()) > 0,
  'l’escouade affiche qui fait quoi en une table');
await page.screenshot({ path: join(CAPTURES, '09c-escouade.png'), fullPage: true });
{
  const txt = await page.locator('#ecran').innerText();
  // `innerText` rend le texte tel qu'il s'affiche, capitales du CSS comprises.
  ok(/autonomie|vivres/i.test(txt), 'et le même écran dit où passent les vivres');
}
await page.click('[data-a="onglet"][data-k="carte"]');
await page.waitForTimeout(300);

// Marché : la quantité se choisit, et le montant est annoncé avant de cliquer.
//
// Il n'offrait que « +10 » et « tout », sans jamais dire ce que ça ferait — et
// « tout » est précisément le geste qui ruine une cargaison, puisque le prix
// baisse à chaque unité vendue.
await page.click('[data-a="modale"][data-m="marche"]');
await page.waitForTimeout(400);
ok(await page.locator('[data-a="qte-marche"]').count() >= 3,
  'le marché propose plusieurs quantités');
await page.screenshot({ path: join(CAPTURES, '09b-marche.png') });
{
  const libelle = () => page.locator('[data-a="acheter"]:not([disabled])').first().innerText();
  const avant = await libelle();
  await page.click('[data-a="qte-marche"][data-q="50"]');
  await page.waitForTimeout(300);
  const apres = await libelle();
  ok(avant !== apres, 'changer la quantité change ce qui est annoncé',
    `${avant.replace(/\n/g, ' ')} → ${apres.replace(/\n/g, ' ')}`);
  // Le montant affiché doit être celui qu'on paie réellement.
  const promis = Number((apres.match(/([0-9]+)\s*cr/) || [])[1] || 0);
  const crAvant = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.credits);
  await page.click('[data-a="acheter"]:not([disabled])');
  await page.waitForTimeout(500);
  const crApres = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).player.credits);
  ok(promis > 0 && Math.abs((crAvant - crApres) - promis) <= 1,
    'et le prix annoncé est exactement le prix payé',
    `annoncé ${promis}, payé ${crAvant - crApres}`);
}
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);

// Panneau de contrats
await page.click('[data-a="modale"][data-m="panneau"]');
await page.waitForTimeout(400);
const offres = await page.locator('[data-a="accepter"]').count();
ok(offres > 0, 'la ville affiche des contrats', `${offres} offres`);
{
  // Un contrat qu'on ne sait pas situer ne s'accepte qu'à l'aveugle, et
  // abandonner coûte. Livraisons, primes et reconnaissances ont une cible.
  const txtP = await page.locator('#modale').innerText();
  ok(/à \d+ région/.test(txtP) || !/Porter|Reconnaître|Chasser/.test(txtP),
    'les contrats situables disent où aller et combien de marche',
    txtP.slice(0, 220).replace(/\n+/g, ' | '));
  // Le délai est devenu l'exception : le panneau doit dire lesquelles pressent,
  // sinon le choix qu'on vient d'ouvrir reste invisible.
  ok(/aucun délai/i.test(txtP) || /urgent/i.test(txtP),
    'et le panneau distingue les offres qui pressent de celles qui attendent',
    txtP.slice(0, 260).replace(/\n+/g, ' | '));
}
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
const politique = nouvellePartie(6363, { maintenant: Date.now(), depart: 'ville' });
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
// Départ en ville explicite : le jeu commence dans le désert, et il faut bien
// une ville pour regarder qui y vit.
await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt),
  serialiser(nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' })));
await page.click('[data-a="continuer"]');
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

console.log('\n8 sexdecies. Un grade n’est pas une voix, c’est une charge');
const carriere = partieAvancee();
const gCar = groupeActif(carriere);
const villeCar = carriere.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gCar.regionId = villeCar.regionId;
carriere.player.reputation[villeCar.faction] = 60;
gCar.allegeance = {
  faction: villeCar.faction, points: 2400, depuis: 0, ordre: null,
  prochainOrdre: 99999, intendance: carriere.temps, manques: 0,
  derniereSolde: carriere.temps, actes: [], fautes: 0,
};
// Un Commandeur en paix n'a presque rien à ordonner : on lui donne une guerre
// en cours et un trésor, sans quoi ses prérogatives s'affichent toutes à vide.
carriere.world.factions[villeCar.faction].tresor = 12000;
const adversaire = Object.keys(carriere.world.factions).find(
  (k) => k !== villeCar.faction && k !== 'essaim'
    && carriere.world.colonies.some((c) => !c.ruine && c.faction === k)
);
// Un voisin esclavagiste : de quoi vérifier que l'écran du monde le signale, et
// qu'il annonce combien de factions ne le supportent pas.
loisDe(carriere.world, adversaire).esclavage = true;
// Une estime posée entre 21 et 24, exprès : c'est la fenêtre où les anciennes
// règles de couleur se contredisaient (vert au-dessus de 20 sur un panneau, au
// -dessus de 25 sur l'autre). Sans une valeur dans cet intervalle, la garde
// tourne sur des zéros et ne prouve rien — vérifié en réintroduisant le bug.
carriere.player.reputation[adversaire] = 22;
if (!carriere.world.guerres.some((w) => w.a === villeCar.faction || w.b === villeCar.faction)) {
  carriere.world.guerres.push({
    a: villeCar.faction, b: adversaire, depuis: 0, batailles: 1,
    but: null, initiateur: villeCar.faction,
  });
}
// Le secteur est normalement confié au premier tick qui suit la promotion ;
// on l'inscrit dans la sauvegarde pour vérifier du même coup qu'il survit à
// l'aller-retour JSON.
confierSecteur(carriere, gCar, () => {});
carriere.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(carriere));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.click('[data-a="onglet"][data-k="contrats"]');
await page.waitForTimeout(500);
const texteCar = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/VOTRE CHARGE/i.test(texteCar), 'un gradé a une charge, pas une requête');
ok(!/d’être écouté/.test(texteCar),
  'et plus aucun pourcentage de convaincre : il ordonne');
ok(/Crédit auprès/.test(texteCar), 'son crédit est affiché : c’est ce dont il répond');
await page.screenshot({ path: join(CAPTURES, '25-charge.png'), fullPage: true });

// Les prérogatives sont là, et celles qui dépassent le grade sont expliquées.
const prerogs = await page.evaluate(() => {
  const d = [...document.querySelectorAll('details[data-id^="prero-"]')];
  const txt = document.querySelector('#ecran').textContent;
  return { ouvrables: d.length, texte: txt };
});
ok(prerogs.ouvrables >= 2, 'plusieurs prérogatives lui sont ouvertes',
  `${prerogs.ouvrables} dépliables`);

// Ordonner : ça part, et ça ne coûte pas un point de service.
const avantOrdre = await page.evaluate(() => {
  const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return {
    pts: s2.player.groupes[0].allegeance.points,
    armees: s2.world.armees.length,
    villes: s2.world.colonies.filter((c) => !c.ruine).length,
  };
});
// On déplie la première charge exerçable et on clique son premier ordre. On
// clique le résumé plutôt que de forcer `open` : c'est l'événement `toggle`
// qui inscrit le bloc dans les dépliés, et sans lui le prochain re-rendu le
// referme sous le curseur.
// On déplie une charge et on clique un ordre *de cette charge-là* : le premier
// bouton de la page peut très bien appartenir à un bloc resté fermé.
const charge = page.locator('details[data-id^="prero-"]')
  .filter({ has: page.locator('[data-a="ordonner"]') }).first();
await charge.locator('summary').click();
await page.waitForTimeout(300);
const aOrdonne = await charge.locator('[data-a="ordonner"]').count() > 0;
ok(aOrdonne, 'au moins un ordre concret est proposé, pas une abstraction');
if (aOrdonne) {
  await charge.locator('[data-a="ordonner"]').first().click();
  await page.waitForTimeout(600);
  const apresOrdre = await page.evaluate(() => {
    const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
    return {
      pts: s2.player.groupes[0].allegeance.points,
      actes: (s2.player.groupes[0].allegeance.actes || []).length,
      armees: s2.world.armees.length,
      villes: s2.world.colonies.filter((c) => !c.ruine).length,
      guerres: s2.world.guerres.length,
    };
  });
  ok(apresOrdre.pts >= avantOrdre.pts,
    'exercer sa charge ne brûle aucun capital politique',
    `${avantOrdre.pts} → ${apresOrdre.pts}`);
  ok(apresOrdre.actes > 0, 'mais l’acte est inscrit : on en répondra');
  ok(apresOrdre.armees !== avantOrdre.armees
    || apresOrdre.villes !== avantOrdre.villes
    || apresOrdre.guerres > 0,
    'et le monde a bougé sur-le-champ, sans délibération');
}

// Le secteur : ce dont on répond tous les jours, affiché et dessiné.
const secteurVu = await page.evaluate(() => {
  const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return {
    secteur: s2.player.groupes[0].allegeance.secteur,
    texte: document.querySelector('#ecran').textContent,
  };
});
ok(!!secteurVu.secteur, 'un gradé se voit confier un secteur sans rien demander');
ok(/VOTRE SECTEUR/i.test(secteurVu.texte), 'et l’écran le lui dit');
ok(/Relevé dans/.test(secteurVu.texte),
  'avec la date du prochain relevé : on sait de quoi on répond et quand');

// L'engagement est bien sur la colonne, pas sur le joueur.
const ouEstLEngagement = await page.evaluate(() => {
  const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
  return { joueur: s2.player.allegeance === undefined, colonne: !!s2.player.groupes[0].allegeance };
});
ok(ouEstLEngagement.colonne && ouEstLEngagement.joueur,
  'l’engagement appartient à la colonne, plus au joueur',
  JSON.stringify(ouEstLEngagement));

// Comment on gouverne chez les autres : c'est ce qui fait de « qui servir » un
// choix informé plutôt qu'un tirage entre six drapeaux de couleurs.
await page.click('[data-a="onglet"][data-k="monde"]');
await page.waitForTimeout(400);
// Le même chiffre, la même couleur, partout. Cinq endroits coloraient l'estime
// avec trois bornes différentes : « +22 » était vert sur un panneau et ambre sur
// l'autre, pour la même faction, à la même seconde.
{
  const desaccords = await page.evaluate(() => {
    const vus = new Map();
    const mauvais = [];
    for (const p of document.querySelectorAll('#ecran .puce')) {
      const t = (p.innerText || '').trim();
      const m = t.match(/^([+-]?\d+)\s/);
      if (!m) continue;
      const cls = [...p.classList].filter((c) => c !== 'puce').sort().join(' ');
      const clef = m[1];
      if (vus.has(clef) && vus.get(clef) !== cls) {
        mauvais.push(`${t} → ${vus.get(clef)} puis ${cls}`);
      } else vus.set(clef, cls);
    }
    return mauvais;
  });
  ok(desaccords.length === 0,
    'une même estime porte la même couleur d’un panneau à l’autre',
    desaccords.slice(0, 3).join(' | '));
}

const texteLois = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/Chez eux : (franchise|charte|commune|domaine),\s+impôt/.test(texteLois),
  'l’écran du monde dit comment chacun gouverne, régime compris');
ok(/Pour vous :/.test(texteLois),
  'et ce que ce régime change pour le joueur, pas seulement pour leurs sujets');
ok(/justice (clémente|ferme|expéditive)/.test(texteLois),
  'avec la sévérité de sa justice');
// Un régime esclavagiste doit se voir arriver la guerre, pas la découvrir : la
// sauvegarde chargée plus haut en installe un chez l'adversaire.
ok(/l’on y vend des hommes/.test(texteLois),
  'un régime esclavagiste est signalé comme tel');
ok(/ne le supportent pas/.test(texteLois),
  'et l’on voit combien de voisins ne le supportent pas');

// Les prisonniers : le seul écran où l'on décide de ce qu'on est.
const captifs = partieAvancee();
const gCap = groupeActif(captifs);
const villeCap = captifs.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gCap.regionId = villeCap.regionId;
const bandeCap = genererBande(new Rng(4242), 'bandits', 3, 1);
for (const c of bandeCap.membres) { c.etat = 'ko'; c.corps.torse.pv = 0; }
fairePrisonniers(captifs, gCap, bandeCap, capturables(gCap, bandeCap), () => {});
captifs.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(captifs));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.waitForTimeout(500);
const texteCap = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/PRISONNIERS/i.test(texteCap), 'les prisonniers ont leur panneau');
ok(await page.locator('[data-a="captif"]').count() >= 2,
  'et plusieurs sorties leur sont proposées, pas une seule');
await page.screenshot({ path: join(CAPTURES, '26-prisonniers.png'), fullPage: true });

const crAvantCap = await page.evaluate(
  () => JSON.parse(localStorage.getItem('cendres.save.v1')).player.credits
);
await page.locator('details[data-id^="captif-"] > summary').first().click();
await page.waitForTimeout(300);
const livrable = page.locator('[data-a="captif"][data-k="livrer"]').first();
if (await livrable.count()) {
  await livrable.click();
  await page.waitForTimeout(500);
  const apresCap = await page.evaluate(() => {
    const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
    const col = s2.world.colonies.find((c) => c.geole && c.geole.detenus.length);
    return { cr: s2.player.credits, geole: col ? col.geole.detenus.length : 0 };
  });
  ok(apresCap.cr > crAvantCap, 'livrer un brigand paie', `${crAvantCap} → ${apresCap.cr}`);
  ok(apresCap.geole > 0, 'et la geôle de la ville se remplit');
}

console.log('\n8 octodecies. La chronique');
await page.click('[data-a="onglet"][data-k="journal"]');
await page.waitForTimeout(400);
const texteChro = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/CHRONIQUE/i.test(texteChro), 'le journal s’ouvre sur ce qu’on est devenu');
ok(/(Vagabond|Ferrailleur|Officier|Bâtisseur|Fondateur|Négrier|Commandeur|Bienfaiteur|Maison marchande|Chasseur de primes|Seigneur de guerre)/
  .test(texteChro), 'avec un titre qu’on porte');
ok(/jours dans les cendres/.test(texteChro), 'et les faits qui le justifient');
await page.screenshot({ path: join(CAPTURES, '29-chronique.png'), fullPage: true });

console.log('\n8 septdecies. Une tactique qu’on choisit en sachant ce qu’elle vaut');
await page.click('[data-a="onglet"][data-k="escouade"]');
await page.waitForTimeout(400);
const texteTac = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/TACTIQUE/i.test(texteTac), 'l’escouade a une tactique');
ok(await page.locator('[data-a="tactique"]').count() === 5,
  'cinq façons de se battre sont proposées');
ok(/(bien vu ici|convenable|mauvais choix ici)/.test(texteTac),
  'et chacune annonce ce qu’elle vaut sur le terrain d’ici');
await page.locator('[data-a="tactique"][data-k="harcelement"]').click();
await page.waitForTimeout(500);
const tacRetenue = await page.evaluate(
  () => JSON.parse(localStorage.getItem('cendres.save.v1')).player.tactique
);
ok(tacRetenue === 'harcelement', 'le choix est retenu et sauvegardé', tacRetenue);
await page.screenshot({ path: join(CAPTURES, '28-tactique.png'), fullPage: true });

console.log('\n8 sexdecies bis. Camper dans une ville affranchie');
// Une révolte réussie laisse un bourg vivant mais sans drapeau. C'est
// exactement la forme de cas qui avait fait planter l'écran entier avec les
// ruines : `faction` à null, lu sans se demander s'il existait. Une ville sans
// loi doit s'afficher, se visiter, et proposer son étal.
const affranchie = partieAvancee();
const gAff = groupeActif(affranchie);
const colAff = affranchie.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');
const drapeauPerdu = colAff.faction;
const fAff = affranchie.world.factions[drapeauPerdu];
fAff.colonies = fAff.colonies.filter((id) => id !== colAff.id);
if (fAff.capitale === colAff.id) fAff.capitale = fAff.colonies[0] || null;
colAff.faction = null;
colAff.factionOrigine = null;
colAff.contrats = [];
affranchie.world.regions[colAff.regionId].controle = null;
gAff.regionId = colAff.regionId;
affranchie.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(affranchie));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
const erreursAff = erreurs.length;
for (const k of ['carte', 'escouade', 'monde', 'contrats', 'base']) {
  await page.click(`[data-a="onglet"][data-k="${k}"]`);
  await page.waitForTimeout(250);
}
ok(erreurs.length === erreursAff,
  'une ville sans drapeau ne casse aucun écran',
  erreurs.slice(erreursAff).join(' | '));
const texteAff = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(texteAff.trim().length > 60, 'et le jeu reste jouable dedans');
await page.screenshot({ path: join(CAPTURES, '27-affranchie.png'), fullPage: true });

console.log('\n8 quindecies. Camper sur une ville morte');
// Une ville effondrée perd son drapeau : `faction` repasse à null. L'écran de
// carte lisait ce drapeau sans se demander s'il existait encore, et plantait
// l'interface entière — un cas qui n'arrivait qu'après des centaines d'heures,
// donc jamais sous les yeux d'un test jusqu'ici.
const ruines = partieAvancee();
const colMorte = ruines.world.colonies[0];
colMorte.ruine = true;
colMorte.faction = null;
colMorte.contrats = [];
colMorte.etal = null;
ruines.world.regions[colMorte.regionId].controle = null;
ruines.world.regions[colMorte.regionId].site = { type: 'ville_morte', connu: true, fouille: false };
groupeActif(ruines).regionId = colMorte.regionId;
ruines.dernierReel = Date.now();
await page.reload({ waitUntil: 'networkidle' });
await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(ruines));
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte', { timeout: 15000 });
await page.waitForTimeout(400);
const texteRuine = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(texteRuine.length > 200, 'l’écran tient debout sur une ville sans drapeau',
  `${texteRuine.length} caractères`);
ok(!/undefined|NaN/.test(texteRuine), 'et n’affiche ni undefined ni NaN');

console.log('\n8 quaterdecies. Manœuvrer la carte');
await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
await page.reload({ waitUntil: 'networkidle' });
await page.click('[data-a="nouvelle"]');
await page.waitForSelector('#carte');
await page.waitForTimeout(400);
const dims = await page.evaluate(() => {
  const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const cv = document.querySelector('#carte');
  return { l: s2.world.largeur, h: s2.world.hauteur, w: cv.width, ht: cv.height };
});
ok(dims.l === 24 && dims.h === 18, 'le monde fait 24 sur 18', `${dims.l}×${dims.h}`);
ok(dims.w > 380, 'et la carte est plus large qu’un écran de téléphone', `${dims.w} px`);

// Molette : zoom continu, ancré sous le curseur.
const boite = page.locator('#carte-boite');
const bb = await boite.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(200);
const dezoome = await page.evaluate(() => document.querySelector('#carte').width);
ok(dezoome < dims.w, 'la molette vers le bas dézoome', `${dims.w} → ${dezoome}`);
await page.mouse.wheel(0, -800);
await page.waitForTimeout(200);
const rezoome = await page.evaluate(() => document.querySelector('#carte').width);
ok(rezoome > dezoome, 'et vers le haut, zoome', `${dezoome} → ${rezoome}`);

// Le zoom est continu, pas par crans : deux crans de molette différents ne
// doivent pas tomber sur la même valeur.
await page.mouse.wheel(0, 40);
await page.waitForTimeout(150);
const fin = await page.evaluate(() => document.querySelector('#carte').width);
ok(fin !== rezoome, 'le zoom est continu, pas par paliers', `${rezoome} → ${fin}`);

// Glisser déplace la vue, et ne sélectionne rien au passage.
await page.evaluate(() => { document.querySelector('#carte-boite').scrollLeft = 200; });
const avantGlisse = await page.evaluate(() => document.querySelector('#carte-boite').scrollLeft);
await page.mouse.move(bb.x + bb.width * 0.7, bb.y + bb.height * 0.5);
await page.mouse.down();
await page.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height * 0.5, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(250);
const apresGlisse = await page.evaluate(() => document.querySelector('#carte-boite').scrollLeft);
ok(apresGlisse > avantGlisse, 'glisser vers la gauche fait avancer la vue vers l’est',
  `${Math.round(avantGlisse)} → ${Math.round(apresGlisse)}`);

// Un clic franc, lui, sélectionne bien une région.
await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
await page.waitForTimeout(300);
const texteSel = await page.evaluate(() => document.querySelector('#ecran').textContent);
ok(/SECTEUR|Secteur|POSITION/i.test(texteSel), 'un clic sans glissement sélectionne une région');

// Double clic : on revient sur le groupe.
await page.evaluate(() => { document.querySelector('#carte-boite').scrollLeft = 0; });
// Deux appuis brefs et rapprochés : c'est ainsi que le jeu reconnaît la
// double tape, pour que ça marche au doigt comme à la souris.
await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5, { delay: 20 });
await page.waitForTimeout(300);
const recentre = await page.evaluate(() => {
  const s2 = JSON.parse(localStorage.getItem('cendres.save.v1'));
  const g2 = s2.player.groupes[0];
  const bt = document.querySelector('#carte-boite');
  const cv = document.querySelector('#carte');
  const CELL = cv.width / s2.world.largeur;
  const cible = (g2.regionId % s2.world.largeur) * CELL;
  return { vu: bt.scrollLeft, cible, larg: bt.clientWidth };
});
ok(Math.abs(recentre.vu + recentre.larg / 2 - recentre.cible) < recentre.larg,
  'le double clic ramène la vue sur le groupe', JSON.stringify(recentre));
await page.screenshot({ path: join(CAPTURES, '24-carte-vaste.png'), fullPage: true });

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
const ecolier = nouvellePartie(1717, { maintenant: Date.now(), depart: 'ville' });
const gEc = groupeActif(ecolier);
const villeEcole = ecolier.world.colonies.find((c) => ecolesDe(ecolier.world, c).length);
gEc.regionId = villeEcole.regionId;
// Un Domaine réserve son école à ceux qui servent la maison : on veut ici une
// ville qui l'ouvre à tout le monde, sinon on teste le refus, pas l'écran.
loisDe(ecolier.world, villeEcole.faction).regime = 'charte';
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
const espion = nouvellePartie(31337, { maintenant: Date.now(), depart: 'ville' });
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
    const r = boite.getBoundingClientRect();
    const x = (rid % L) * CELL + CELL / 2 - boite.scrollLeft + r.left;
    const y = Math.floor(rid / L) * CELL + CELL / 2 - boite.scrollTop + r.top;
    // La carte s'écoute au pointeur, sur la boîte : un MouseEvent « click » sur
    // le canvas ne déclenche plus rien (il est en pointer-events: none).
    const opts = { bubbles: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true };
    boite.dispatchEvent(new PointerEvent('pointerdown', opts));
    boite.dispatchEvent(new PointerEvent('pointerup', opts));
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
const veille = nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' });
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
// Le rattrapage rejoue deux ans de jeu : le Chromium sans écran d'un conteneur
// ne cadence pas `requestAnimationFrame` comme un vrai navigateur, et trente
// secondes n'y suffisent pas toujours.
await page.waitForSelector('#carte', { timeout: 60000 });
const tApres = await page.evaluate(() => JSON.parse(localStorage.getItem('cendres.save.v1')).temps);
ok(tApres - tAvant > 2000, 'le temps passé a bien été rejoué', `${tAvant} → ${tApres} h`);

// Deux ans rejoués derrière une barre de progression, puis la main rendue sans
// un mot : c'est ce qu'on reprochait au jeu. Le bilan doit s'imposer au retour,
// et disparaître une fois lu.
{
  const rapport = await page.locator('#modale').innerText();
  ok(/continué sans vous/i.test(rapport),
    'un bilan s’impose au retour d’une longue absence',
    rapport.slice(0, 160).replace(/\n+/g, ' | '));
  ok(/jours?/i.test(rapport) && /Vos gens/i.test(rapport),
    'il dit combien de temps a passé et ce qu’il reste de l’escouade');
  await page.screenshot({ path: join(CAPTURES, '14b-rapport.png') });
  await page.click('[data-a="rapport-vu"]');
  await page.waitForTimeout(300);
  ok(await page.locator('#modale').isHidden(), 'et il se referme quand on l’a lu');
  const encore = await page.evaluate(
    () => JSON.parse(localStorage.getItem('cendres.save.v1')).rapport);
  ok(!encore, 'il ne revient pas au chargement suivant : on l’a lu une fois');
}

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
