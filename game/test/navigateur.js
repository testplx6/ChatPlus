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
import { nouvellePartie, avancer, tick as tickSim } from '../src/sim.js';
import {
  fonderBase, lancerConstruction, lancerRecherche, COUT_FONDATION,
  reconnaitreAvantPoste,
} from '../src/base.js';
import { donnerOrdre } from '../src/squad.js';
import { serialiser, deserialiser } from '../src/save.js';
import { groupeActif } from '../src/groupes.js';
import { ecolesDe } from '../src/formation.js';
import { confierSecteur } from '../src/secteur.js';
import { capturables, fairePrisonniers } from '../src/justice.js';
import { loisDe } from '../src/lois.js';
import { genererBande } from '../src/combat.js';
import { Rng } from '../src/rng.js';
import { monnaieIci } from '../src/monnaie.js';
import { makeCharacter } from '../src/characters.js';
import { ouvrirBourse, tickBourses, signerAccord } from '../src/bourse.js';
import { DIPLO_FACTIONS, BUILDINGS, RESEARCH } from '../src/data.js';

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
  s.player.bourse = { [monnaieIci(s)]: 6000 };
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
// Le décor épingle les polices : la police distante (`font-display: swap`)
// arrive quand le réseau veut, et changer de pile change toutes les métriques
// de texte — un demi-pixel suffit à faire basculer une sonde posée sur une
// frontière (voir la sonde du garde « ce qu'on lit reste sous les yeux »).
// Un test de géométrie ne se mesure que sur une géométrie déterministe : la
// pile de repli est la seule servie, à chaque run, sur chaque machine.
const epinglerPolices = async (p) => {
  await p.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('**://fonts.gstatic.com/**', (r) => r.abort());
};
await epinglerPolices(page);
// U2 (INTERFACE.md) — le canevas ne se lit pas dans le DOM : on note ce que la
// carte écrit (fillText) pour pouvoir vérifier qu'elle écrit les noms des
// villes relevées. Posé avant la première navigation, survit aux reload.
await page.addInitScript(() => {
  window.__peints = [];
  const brut = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (txt, ...args) {
    if (window.__peints.length < 800) window.__peints.push(String(txt));
    return brut.call(this, txt, ...args);
  };
  // Les grands moments (M2) couvrent l'écran jusqu'au tap — c'est le but. Le
  // harnais, lui, joue en aveugle : il tape dessus comme un joueur pressé,
  // sauf pendant la section qui les vérifie (`__momentsAuto = false`).
  window.__momentsAuto = true;
  setInterval(() => {
    if (!window.__momentsAuto) return;
    const m = document.querySelector('#moment');
    if (m) m.click();
  }, 200);
});
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

console.log('\n1 bis. Le dock d’ordres — les verbes vivent sur la carte (direction A)');
{
  // Le poste de commandement : donner un ordre ne demande pas de défiler.
  // Les tuiles d'ordre sont posées sur le bas du terrain, en une rangée qui
  // défile horizontalement, et c'est LA source des boutons — le panneau
  // « Ordre » garde le détail, le dock porte le geste.
  const dock = await page.evaluate(() => {
    const d = document.querySelector('#dock-ordres');
    if (!d) return null;
    const rb = d.getBoundingClientRect();
    const cb = document.querySelector('#carte-boite').getBoundingClientRect();
    return {
      boutons: d.querySelectorAll('button.act.ordre').length,
      // « En fixe SOUS la carte » — décision du propriétaire (le débord en
      // surimpression masquait le bas du monde) : le dock suit la carte,
      // rangé juste dessous, toujours atteignable sans défiler.
      sousCarte: rb.top >= cb.bottom - 4 && rb.top < cb.bottom + 80,
      dansVue: rb.bottom <= window.innerHeight && rb.width > 0,
    };
  });
  ok(!!dock, 'le dock d’ordres existe sur l’écran carte');
  ok(!!dock && dock.boutons >= 6, 'et porte tous les verbes', dock ? `${dock.boutons} boutons` : 'absent');
  ok(!!dock && dock.sousCarte && dock.dansVue,
    'rangé sous la carte, sous le pouce, sans défiler', dock ? JSON.stringify(dock) : 'absent');
}

console.log('\n2. Ordres et temps réel');
await page.click('[data-a="ordre"][data-k="fouille"]');
await page.click('[data-a="vitesse"][data-v="16"]');
const t0 = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
await page.waitForTimeout(6000);
await page.screenshot({ path: join(CAPTURES, '01-carte.png') });
const t1 = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
ok(t1 > t0, 'l’horloge avance en temps réel', `${t0} → ${t1}`);

console.log('\n2 bis. La carte vivante (M1, ALLURE.md)');
{
  // La couche de vie : un second canevas par-dessus la carte, qui bouge tout
  // seul — cendre au vent, feux des villes, convois. En lecture seule : elle
  // ne doit rien changer à l'état, et deux instants ne se ressemblent pas.
  ok(await page.locator('#carte-vie').count() === 1, 'la couche de vie existe');
  const memesDims = await page.evaluate(() => {
    const c = document.querySelector('#carte');
    const v = document.querySelector('#carte-vie');
    return !!(c && v && v.width === c.width && v.height === c.height);
  });
  ok(memesDims, 'et couvre exactement la carte');
  const prend = () => page.evaluate(() => {
    const v = document.querySelector('#carte-vie');
    if (!v || !v.width) return '';
    const d = v.getContext('2d')
      .getImageData(0, 0, Math.min(400, v.width), Math.min(400, v.height)).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 7) h = ((h * 31) + d[i + 3]) >>> 0;
    return String(h);
  });
  const v1 = await prend();
  await page.waitForTimeout(450);
  const v2 = await prend();
  ok(v1 !== '' && v1 !== v2, 'et la cendre dérive : deux instants diffèrent', `${v1} / ${v2}`);
  const sauveAvant = await page.evaluate(() => localStorage.getItem('cendres.save.v1').length);
  await page.waitForTimeout(300);
  ok(typeof sauveAvant === 'number' && sauveAvant > 0,
    'la couche vit en lecture seule (la partie continue de s’écrire)');
}

console.log('\n3. Navigation entre les écrans');
for (const [k, nom] of [['escouade', '02-escouade'], ['base', '03-base'], ['monde', '04-monde'], ['journal', '05-journal']]) {
  await page.click(`[data-a="onglet"][data-k="${k}"]`);
  await page.waitForTimeout(300);
  const vide = await page.evaluate(() => document.querySelector('#ecran').textContent.trim().length);
  ok(vide > 60, `l’écran ${k} a du contenu`, `${vide} caractères`);
  await page.screenshot({ path: join(CAPTURES, `${nom}.png`), fullPage: true });
}

console.log('\n3 bis. Le journal groupé et raconté (M3, ALLURE.md)');
{
  // La page est restée sur le journal après le tour d'écrans.
  const j = await page.evaluate(() => {
    const ecran = document.querySelector('#ecran');
    return {
      jours: ecran.querySelectorAll('.jour-tete').length,
      texteJour: (ecran.querySelector('.jour-tete') || {}).textContent || '',
      icones: ecran.querySelectorAll('.entree .ico').length,
      entrees: ecran.querySelectorAll('.entree').length,
      marquants: ecran.querySelectorAll('.entree.marquant').length,
    };
  });
  ok(j.jours >= 1 && /Jour \d+/.test(j.texteJour),
    'le fil est groupé par jour, et le jour se lit', j.texteJour.trim());
  ok(j.entrees > 0 && j.icones === j.entrees,
    'chaque entrée porte son icône de type', `${j.icones}/${j.entrees}`);
  ok(j.marquants >= 1, 'les marquants se distinguent d’un liséré', `${j.marquants}`);
  const serifDebut = await page.evaluate(() => {
    const el = document.querySelector('#ecran .entree.recit');
    return el ? getComputedStyle(el).fontFamily : '';
  });
  ok(/serif/i.test(serifDebut),
    'les dépêches du récit parlent en serif', serifDebut || 'aucune entrée de récit');
}

console.log('\n4. Fiches de personnage');
await page.click('[data-a="onglet"][data-k="escouade"]');
// Seul, la jauge parle de tenue, au singulier : « Ça tient par habitude »,
// « on se parle, on se couvre » sont des phrases de bande — absurdes pour un
// homme seul (défaut vu à l'écran, U4 ter).
{
  await page.waitForTimeout(300);
  const txtSolo = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/Tenue de/.test(txtSolo) && !/Cohésion de/.test(txtSolo),
    'seul, le panneau s’appelle « Tenue », pas « Cohésion »');
  ok(!/on se couvre|par habitude|les uns pour les autres/i.test(txtSolo),
    'et aucun texte de bande ne s’applique à une personne seule');
}
await page.locator('details.perso summary').first().click();
await page.waitForTimeout(2600); // laisse passer plusieurs re-rendus
ok(await page.locator('details.perso[open]').count() > 0, 'la fiche ouverte le reste après re-rendu');
// HISTOIRE lot C : chaque membre porte un fil lisible sur sa fiche.
ok(/Son histoire/.test(await page.evaluate(() => document.querySelector('#ecran').textContent)),
  'la fiche raconte l’histoire du membre');
await page.screenshot({ path: join(CAPTURES, '06-fiche.png'), fullPage: true });

console.log('\n5. Mise en page');
const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok(!deborde, 'aucun débordement horizontal');
// Seuls les boutons visibles sont des cibles : un bouton rangé sous un encart
// replié mesure zéro pixel et n'attend aucun doigt.
const boutonsPetits = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => b.offsetParent !== null && b.getBoundingClientRect().height < 28).length);
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

console.log('\n5 ter. L’en-tête qui s’explique et les vraies icônes (M4+M5, ALLURE.md)');
{
  // M5 : la barre de navigation porte des icônes dessinées (SVG inline, trait
  // 1,5, grille 24), plus des glyphes Unicode aux poids disparates.
  const nav = await page.evaluate(() => ({
    svg: document.querySelectorAll('#barre-nav button svg').length,
    boutons: document.querySelectorAll('#barre-nav button').length,
  }));
  ok(nav.svg === nav.boutons && nav.boutons >= 6,
    'chaque onglet de nav porte une icône dessinée', `${nav.svg}/${nav.boutons}`);
  // M5 : les cases à cocher sont de vraies cases, plus des [×] ASCII.
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(350);
  const cases = await page.evaluate(() => {
    const ecran = document.querySelector('#ecran');
    return {
      ascii: /\[[ ×]\]/.test(ecran.textContent),
      coches: ecran.querySelectorAll('.coche').length,
    };
  });
  ok(!cases.ascii, 'plus une seule case [×] en ASCII sur l’écran escouade');
  ok(cases.coches >= 6, 'les consignes portent de vraies cases', `${cases.coches}`);
  // M4 : le signe de monnaie s'explique — l'en-tête dit de quelle monnaie il
  // s'agit sans qu'on ait à l'apprendre par cœur.
  const monnaie = await page.evaluate(() => {
    const bloc = [...document.querySelectorAll('#barre-haut .hd-bloc')]
      .find((b) => /onnaie/.test(b.title || ''));
    return bloc ? bloc.title : '';
  });
  ok(/onnaie/.test(monnaie), 'l’en-tête nomme la monnaie derrière son signe', monnaie);
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(300);
}

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
const avantRechargement = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
await page.reload({ waitUntil: 'networkidle' });
ok(await page.locator('[data-a="continuer"]').count() > 0, 'la reprise est proposée');
await page.click('[data-a="continuer"]');
await page.waitForSelector('#carte');
const apresRechargement = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
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
    const s2 = JSON.parse(window.__sauvegardeTexte());
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
        const s2 = JSON.parse(window.__sauvegardeTexte());
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
await epinglerPolices(large);
await large.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await large.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), sauvegarde);
await large.reload({ waitUntil: 'networkidle' });
await large.click('[data-a="continuer"]');
await large.waitForSelector('#carte');
await large.waitForTimeout(400);
await large.screenshot({ path: join(CAPTURES, '08-large.png') });
ok(!(await large.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)),
  'pas de débordement en écran large');
// U6 (INTERFACE.md) — à 1280 px, plus de colonne unique : la carte vit à
// gauche, les panneaux à sa droite — au lieu d'une colonne de 600 px cernée
// de noir où la carte repousse tout sous le pli.
{
  const boite = await large.locator('#carte-boite').boundingBox();
  const panneau = await large.locator('#ecran section.panneau').first().boundingBox();
  ok(boite && panneau && panneau.x >= boite.x + boite.width - 8
    && panneau.y < boite.y + boite.height,
  'à 1280 px, les panneaux vivent à côté de la carte, pas dessous',
  boite && panneau ? `carte x=${Math.round(boite.x)}+${Math.round(boite.width)}, panneau x=${Math.round(panneau.x)} y=${Math.round(panneau.y)}` : 'introuvable');
}
// M6 (ALLURE.md) — la salle des cartes : les autres écrans cessent d'être un
// téléphone étiré. À 1280 px, leurs panneaux coulent sur deux colonnes.
{
  await large.click('[data-a="onglet"][data-k="escouade"]');
  await large.waitForTimeout(400);
  const m6 = await large.evaluate(() => {
    const ecran = document.querySelector('#ecran');
    const cc = getComputedStyle(ecran).columnCount;
    const secs = [...ecran.querySelectorAll(':scope > section.panneau')];
    const gauche = new Set(secs.map((s) => Math.round(s.getBoundingClientRect().x)));
    return { cc, colonnesVues: gauche.size, deborde: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  ok(m6.cc === '2' && m6.colonnesVues >= 2,
    'à 1280 px, l’escouade coule sur deux colonnes', `column-count=${m6.cc}, x distincts=${m6.colonnesVues}`);
  ok(!m6.deborde, 'sans déborder de l’écran');
  await large.screenshot({ path: join(CAPTURES, '08b-large-escouade.png'), fullPage: false });
  await large.click('[data-a="onglet"][data-k="carte"]');
  await large.waitForTimeout(300);
}

console.log('\n8 bis. Contenu de jeu : contrats, étal, sites');
// Le vrai premier écran : une partie neuve, celle qu'un joueur lance.
{
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  // L'accueil propose plusieurs départs : ce n'est pas une difficulté, c'est
  // une situation, et le joueur doit pouvoir lire ce qu'il choisit.
  const choix = await page.locator('[data-a="choisir-depart"]').count();
  ok(choix >= 3, 'l’accueil propose plusieurs départs', `${choix}`);
  const texteAccueil = await page.locator('#ecran').innerText();
  ok(/survivant/i.test(texteAccueil) && /convoi/i.test(texteAccueil),
    'et chacun se lit avant d’être choisi',
    texteAccueil.slice(0, 240).replace(/\n+/g, ' | '));
  // On choisit le départ le plus nu, et l'on vérifie qu'il est bien appliqué.
  await page.click('[data-a="choisir-depart"][data-k="survivant"]');
  await page.waitForTimeout(200);
  await page.click('[data-a="nouvelle"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
  const premierEcran = await page.locator('#ecran').innerText();
  ok(!/MARCHÉ|RECRUTER/i.test(premierEcran),
    'une partie neuve ne commence plus dans une ville',
    premierEcran.slice(0, 160).replace(/\n+/g, ' | '));
  ok(/ORDRE DE|POSITION/i.test(premierEcran),
    'mais l’escouade a bien un ordre et une position : on n’est pas nulle part');
  // Et surtout : on ne dit **pas** où sont les villes. J'avais ajouté « ville la
  // plus proche, à deux régions, s'y rendre » en croyant aider ; c'est
  // exactement ce que le départ dans le désert vient supprimer. Ne pas savoir
  // est le sujet, pas un défaut à corriger.
  ok(!/plus proche/i.test(premierEcran),
    'et l’écran ne dit pas où sont les villes : les trouver est le premier jeu',
    premierEcran.slice(0, 200).replace(/\n+/g, ' | '));
  // Seul, et les mains vides.
  const debut = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const g = s2.player.groupes[0];
    return {
      gens: g.membres.filter((c) => c.etat !== 'mort').length,
      armes: g.membres.filter((c) => c.etat !== 'mort' && c.equip && c.equip.arme).length,
      objets: (g.objets || []).length,
      cr: Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0),
      rations: Math.floor(g.inventaire.rations || 0),
    };
  });
  ok(debut.gens === 1 && debut.armes === 0 && debut.objets === 0,
    'on commence seul et désarmé', JSON.stringify(debut));
  // Une situation, pas seulement un dénuement : le corps de celui avec qui on
  // voyageait est là, et il faut en décider avant de faire un pas.
  ok(/POINT DE SITUATION/i.test(premierEcran) && /enterrer|dépouiller/i.test(premierEcran),
    'et l’on se réveille devant un mort dont il faut décider',
    premierEcran.slice(0, 340).replace(/\n+/g, ' | '));
  ok(debut.cr < 100 && debut.rations < 20,
    'avec de quoi tenir quelques jours, pas davantage', JSON.stringify(debut));
  // Le bandeau montre la bourse, et il la montre dans la monnaie du lieu.
  //
  // Il affichait « CR — » : le libellé était resté au crédit universel et la
  // valeur lisait un champ supprimé par le lot E. Mille trois cents
  // vérifications moteur et deux cent quatre-vingts navigateur ne l'ont pas vu,
  // parce qu'aucune ne regardait le seul chiffre que le joueur a sous les yeux
  // en permanence. Il a fallu ouvrir une capture d'écran.
  {
    const barre = await page.locator('#barre-haut').innerText();
    ok(!/\bcr\b/i.test(barre), 'le bandeau ne parle plus de « cr »',
      barre.replace(/\n+/g, ' | ').slice(0, 90));
    ok(/\d/.test(barre.split('sac')[0] || ''),
      'et il affiche un nombre là où est la bourse, pas un tiret',
      (barre.split('sac')[0] || '').replace(/\n+/g, ' | '));
  }
  ok(/1\/1/.test(await page.locator('#barre-haut').innerText()),
    'et le bandeau le dit sans détour',
    (await page.locator('#barre-haut').innerText()).replace(/\n+/g, ' | '));
  await page.screenshot({ path: join(CAPTURES, '00b-depart.png'), fullPage: true });
  const rep = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).player.reputation);
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

  // Les six services donnent la même base et un seul avantage propre. Cet
  // avantage se lit *avant* de s'engager, sinon le choix de couleur est un
  // tirage au sort qu'on regrette trois cents heures plus tard.
  const extra = await page.locator('#ecran').innerText();
  const nomsExtras = ['Le compte ouvert', 'La colonne qui vient', 'Les bras',
    'Le fret', 'L’écoute', 'Le recel'];
  ok(nomsExtras.some((x) => extra.includes(x)),
    'la fiche annonce l’extra propre à ce drapeau, avant tout engagement',
    extra.slice(0, 200).replace(/\n+/g, ' | '));
  ok(/le reste est le même partout/i.test(extra),
    'et dit que le reste est identique : on choisit ce qu’on gagne, pas ce qu’on sacrifie');
  ok(/dès (Affilié|Agent|Lieutenant|Capitaine|Commandeur)/.test(extra),
    'avec le grade auquel il s’ouvre', extra.slice(0, 200).replace(/\n+/g, ' | '));
  await page.evaluate(() => {
    const b = document.querySelector('[data-a="engager"]');
    if (b) b.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(CAPTURES, '30-service.png') });
}

// Fouiller un site : on doit voir ce qu'on en a tiré, tout de suite et après.
{
  const surSite = serialiser((() => {
    const t = partieAvancee();
    const g = t.player.groupes[0];
    const reg = t.world.regions.find((r) => r.site && !r.site.fouille);
    if (reg) { reg.site.connu = true; g.regionId = reg.i; }
    // De quoi ne pas mourir si le site est gardé, et de quoi ouvrir les portes.
    for (const c of g.membres) c.skills.ingenierie = Math.max(c.skills.ingenierie || 0, 70);
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), surSite);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(400);
  if (await page.locator('[data-a="fouiller-site"]:not([disabled])').count()) {
    await page.click('[data-a="fouiller-site"]:not([disabled])');
    await page.waitForTimeout(600);
    const bulle = await page.locator('.toast').count()
      ? await page.locator('.toast').innerText() : '';
    const ecranSite = await page.locator('#ecran').innerText();
    // Ou le site était gardé — c'est un résultat aussi —, ou l'on doit lire ce
    // qu'on a ramassé, dans la bulle comme sur le site une fois vidé.
    const garde = /gardé/i.test(bulle);
    ok(garde || /Fouillé\s*:/i.test(bulle),
      'la bulle dit ce qu’on a tiré du site, pas seulement qu’on l’a fouillé',
      bulle.replace(/\n+/g, ' | '));
    ok(garde || /On en a tiré/i.test(ecranSite),
      'et le site vidé garde la trace de ce qu’il a rendu',
      ecranSite.slice(0, 240).replace(/\n+/g, ' | '));
    await page.screenshot({ path: join(CAPTURES, '01c-site.png') });
  }
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt),
    serialiser(nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' })));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(500);
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
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), (() => {
    // Et elle tient un comptoir : le bloc du bureau de change, plus bas, en a
    // besoin. Posé ici plutôt qu'en rechargeant la page au milieu du script —
    // un rechargement en cours de route repart d'un état neuf et casse tout ce
    // qui suit, ce qui a coûté deux vérifications sans rapport.
    const st = nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' });
    const g0 = groupeActif(st);
    const r0 = st.world.regions[g0.regionId];
    const ici = st.world.colonies.find((c) => c.id === (r0 && r0.colonie));
    if (ici) ici.change = true;
    return serialiser(st);
  })());
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
    () => Object.keys(JSON.parse(window.__sauvegardeTexte()).player.coffres || {}).length);
  ok(dedansAvant === 1, 'le coffre est bien enregistré', `${dedansAvant}`);
  if ((await page.locator('[data-a="coffre-deposer"]:not([disabled])').count()) > 0) {
    await page.click('[data-a="coffre-deposer"]:not([disabled])');
    await page.waitForTimeout(400);
    const contenu = await page.evaluate(() => {
      const c = JSON.parse(window.__sauvegardeTexte()).player.coffres;
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
      const s2 = JSON.parse(window.__sauvegardeTexte());
      return Math.floor(s2.player.groupes[0].inventaire[k] || 0);
    }, cle1);
    await cible1.click();
    await page.waitForTimeout(350);
    const sacApres = await page.evaluate((k) => {
      const s2 = JSON.parse(window.__sauvegardeTexte());
      return Math.floor(s2.player.groupes[0].inventaire[k] || 0);
    }, cle1);
    ok(sacAvant - sacApres === 1,
      'à ×1 on ne dépose qu’une unité, et le sac garde le reste',
      `${sacAvant} → ${sacApres}`);
  }
}
await page.click('[data-a="fermer"]');
await page.waitForTimeout(200);

// Le bandeau de dévaluation (ECONOMIE §10). Il est au-dessus de tous les
// écrans, il survit au rechargement, et il ne s'efface que quand on l'a vu :
// une alerte ratée parce qu'on avait fermé l'onglet n'a servi à rien.
{
  // On recharge AVANT d'écrire : tant qu'une partie tourne, sa sauvegarde
  // automatique repasse par-dessus ce qu'on vient de poser, et le décor est
  // effacé avant même d'avoir servi.
  await page.reload({ waitUntil: 'networkidle' });
  const posee = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const k = Object.keys(s2.player.bourse || {})[0]
      || Object.keys(s2.world.factions).find((x) => x !== 'essaim');
    s2.player.bourse = { [k]: 900 };
    s2.player.alertesMonnaie = [{ faction: k, perte: 0.23, cours: 0.6, avant: 0.78, solde: 900, t: 0 }];
    localStorage.setItem('cendres.save.v1', JSON.stringify(s2));
    return k;
  });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(400);
  const vu = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/Votre argent a fondu/.test(vu), 'le bandeau de dévaluation se lève', posee);
  ok(/−23 %/.test(vu), 'et dit de combien', (vu.match(/−\d+ %[^·]*/) || ['—'])[0]);
  // Sur un autre onglet aussi : une monnaie qui s'effondre ne se range pas
  // sous « monde » ou sous « escouade ».
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(300);
  ok(/Votre argent a fondu/.test(
    await page.evaluate(() => document.querySelector('#ecran').textContent)),
  'et il suit d’un écran à l’autre');
  await page.screenshot({ path: join(CAPTURES, '09g-devaluation.png') });
  await page.click('[data-a="devaluation-vue"]');
  await page.waitForTimeout(400);
  ok(!/Votre argent a fondu/.test(
    await page.evaluate(() => document.querySelector('#ecran').textContent)),
  'une fois vu, il s’efface');
  const reste = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).player.alertesMonnaie.length);
  ok(reste === 0, 'et ça tient dans la sauvegarde', `${reste}`);
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(300);
}

// Le bureau de change (ECONOMIE §5 et §10). Sans cet écran, la bascule du lot E
// rend le jeu injouable : on arrive à l'étranger avec la monnaie de chez soi et
// rien ne permet d'y remédier. C'est le seul endroit du jeu où deux monnaies se
// regardent, et il ne doit jamais afficher de total.
{
  // Le comptoir est ouvert à la création du décor, plus haut. Le bloc n'est donc
  // plus conditionnel : depuis E3 bis une ville ne tient un bureau que si elle
  // est assez grande, celle-ci ne l'était pas, et le bloc entier se sautait tout
  // seul — cinq vérifications disparues du compte sans que rien ne le dise.
  // Une mesure qui se saute en silence ne mesure rien.
  const aBureau = await page.locator('[data-a="modale"][data-m="change"]').count();
  ok(aBureau > 0, 'une ville qui tient un comptoir propose le change');
  await page.click('[data-a="modale"][data-m="change"]');
  await page.waitForTimeout(400);
  const txtCh = await page.locator('#modale').innerText();
  ok(/vaut/.test(txtCh) && /écart/.test(txtCh),
    'le bureau annonce le taux et son écart',
    txtCh.split('\n').find((l) => /vaut/.test(l)) || txtCh.slice(0, 120));
  ok(!/\bcr\b/.test(txtCh), 'et plus un seul « cr » nulle part');
  ok((await page.locator('[data-a="change-paire"]').count()) > 0,
    'on choisit la paire à coter');
  await page.screenshot({ path: join(CAPTURES, '09f-change.png') });

  const bouton = page.locator('[data-a="change-faire"]:not([disabled])');
  if (await bouton.count()) {
    const avant = await page.evaluate(
      () => JSON.parse(window.__sauvegardeTexte()).player.bourse);
    await bouton.click();
    await page.waitForTimeout(450);
    const apres = await page.evaluate(
      () => JSON.parse(window.__sauvegardeTexte()).player.bourse);
    const bougé = Object.keys({ ...avant, ...apres })
      .filter((k) => Math.abs((apres[k] || 0) - (avant[k] || 0)) > 0.001);
    ok(bougé.length === 2, 'un change fait bouger deux monnaies, et deux seulement',
      bougé.join(' / ') || 'aucune');
  }
  await page.click('[data-a="fermer"]');
  await page.waitForTimeout(200);
}

// Étal d'équipement : le catalogue existait, rien n'était achetable.
await page.click('[data-a="modale"][data-m="etal"]');
await page.waitForTimeout(400);
const articles = await page.locator('[data-a="acheter-item"]').count();
ok(articles > 0, 'l’armurier propose de l’équipement', `${articles} articles`);
await page.screenshot({ path: join(CAPTURES, '09-etal.png') });
const objetsAvant = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).player.groupes[0].objets.length);
const abordable = await page.locator('[data-a="acheter-item"]:not([disabled])').count();
if (abordable) {
  await page.click('[data-a="acheter-item"]:not([disabled])');
  await page.waitForTimeout(500);
}
const objetsApres = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).player.groupes[0].objets.length);
ok(!abordable || objetsApres > objetsAvant, 'un achat d’équipement arrive dans la réserve',
  `${objetsAvant} → ${objetsApres}`);
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);

// U1 (INTERFACE.md) — l'écran de ville : des portes qui parlent. Neuf boutons
// typographiquement identiques ne disent pas si les vivres sont chers, si
// quelqu'un veut partir, si la monnaie s'est effondrée. Chaque porte doit
// porter un fait vivant tiré du moteur — et le test échoue si l'une d'elles
// redevient muette.
{
  const portes = ['marche', 'etal', 'panneau', 'recrutement', 'attelage',
    'coffre', 'change', 'ecole', 'ville'];
  const nues = [];
  for (const m of portes) {
    const b = page.locator(`button[data-a="modale"][data-m="${m}"]`).first();
    if (!(await b.count())) continue; // change et écoles n'existent pas partout
    const fait = await b.locator('.fait').textContent().catch(() => null);
    if (!fait || !fait.trim()) nues.push(m);
  }
  ok(nues.length === 0, 'chaque porte de la ville annonce ce qu’il y a derrière',
    nues.length ? `muettes : ${nues.join(', ')}` : '');
  const fMarche = await page.locator('button[data-m="marche"] .fait')
    .textContent().catch(() => '');
  ok(/\d/.test(fMarche || ''), 'le marché affiche le prix des vivres', fMarche || 'rien');
  const fVille = await page.locator('button[data-m="ville"] .fait')
    .textContent().catch(() => '');
  ok(/actif/.test(fVille || ''), '« Qui vit ici » compte les habitants et les actifs',
    fVille || 'rien');
  await page.screenshot({ path: join(CAPTURES, '01e-portes.png') });
}

// U2 (INTERFACE.md) — la carte : lisible d'un regard. Des taches sur du noir,
// une légende en codes de cinq lettres, un pied qui parle au développeur
// (« 24 px/secteur ») : on ne pouvait ni s'orienter ni raconter ce qu'on voit.
{
  await page.evaluate(() => { window.__peints.length = 0; });
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(900);
  const attendus = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    return s.world.colonies
      .filter((c) => s.world.regions[c.regionId].decouvert && !c.ruine)
      .map((c) => c.nom);
  });
  const peints = await page.evaluate(() => window.__peints.slice());
  const ecrits = attendus.filter((nom) => peints.some((t) => t.includes(nom)));
  ok(attendus.length > 0 && ecrits.length > 0,
    'la carte écrit le nom des villes relevées',
    `${ecrits.length}/${attendus.length} noms (${peints.length} textes peints)`);
  const codes = await page.evaluate(() => [...document.querySelectorAll('.legende span')]
    .map((el) => el.textContent.trim()).filter((t) => /^[A-Z]{3,6}$/.test(t)));
  ok(codes.length === 0, 'la légende écrit les noms pleins des factions',
    codes.join(', ') || '');
  const pied = await page.evaluate(() => (document.getElementById('carte-pos') || {}).textContent || '');
  ok(!/px\/secteur/.test(pied), 'le pied de carte ne parle plus au développeur', pied);
  // Le constat se prend carte en haut d'écran, sinon la capture montre le bas.
  await page.evaluate(() => { document.getElementById('ecran').scrollTop = 0; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(CAPTURES, '01f-carte-noms.png') });
}

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
  ok(/640 \S/.test(vuD), 'et ce que chacun a rapporté');
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

  // Le même ordre, sans échéance — c'est désormais le cas courant. Trois
  // endroits soustrayaient `echeance` sans vérifier qu'elle existe : la page
  // annonçait « NaN restantes » et « l'échéance ne le permet pas » sur une
  // mission qu'aucune horloge ne pressait. On rejoue la même injection avec
  // `duree: null` : rien ne doit compter le temps qui reste.
  const sansEcheance = serialiser((() => {
    const t = deserialiser(avecOrdre);
    t.player.groupes[0].allegeance.ordre.duree = null;
    t.player.groupes[0].allegeance.ordre.echeance = null;
    return t;
  })());
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), sansEcheance);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="contrats"]');
  await page.waitForTimeout(500);
  const txtSD = await page.locator('#ecran').innerText();
  ok(!/NaN/.test(txtSD), 'un ordre sans échéance n’affiche pas « NaN »',
    (txtSD.match(/.{0,60}NaN.{0,40}/) || [''])[0]);
  ok(/sans délai/i.test(txtSD), 'il annonce « sans délai » au lieu d’un compte à rebours',
    txtSD.slice(0, 300).replace(/\n+/g, ' | '));
  ok(!/ne le permet pas/i.test(txtSD),
    'et il ne prétend pas qu’une échéance inexistante interdit le voyage',
    (txtSD.match(/.{0,80}ne le permet pas/) || [''])[0]);
  // Le point de situation ne doit pas non plus l'inscrire parmi les urgences.
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(300);
  const txtSit = await page.locator('#ecran').innerText();
  ok(!/NaN/.test(txtSit), 'et le point de situation reste net de « NaN »',
    (txtSit.match(/.{0,60}NaN.{0,40}/) || [''])[0]);

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
  const promis = Number((apres.match(/([0-9]+)\s+\S+\s*$/) || [])[1] || 0);
  const crAvant = await page.evaluate(() => { const s2 = JSON.parse(window.__sauvegardeTexte()); return Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0); });
  await page.click('[data-a="acheter"]:not([disabled])');
  await page.waitForTimeout(500);
  const crApres = await page.evaluate(() => { const s2 = JSON.parse(window.__sauvegardeTexte()); return Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0); });
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
const pris = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).player.contrats.length);
ok(pris > 0, 'un contrat accepté part en cours', `${pris} en cours`);
await page.click('[data-a="onglet"][data-k="contrats"]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(CAPTURES, '11-contrats.png'), fullPage: true });

// U4 (INTERFACE.md) — les finitions qui se voient. La revue du 20 août sur
// captures : cartes de contrat qui nomment la même ville cinq fois, trente
// pluriels parenthésés, codes de faction survivants, noms de réseaux coupés
// au milieu des mots, six badges « inconnu », colonnes du marché muettes,
// pourcentage sans étiquette sur la fiche.
{
  // a. La carte d'un contrat ne radote pas. Si le contrat en cours est une
  // livraison, sa destination apparaît au plus deux fois (le titre, la
  // flèche) ; et « aucun délai » ne double jamais le « sans délai » que la
  // carte affiche déjà.
  const enCours = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    const livr = s.player.contrats.find((c) => c.type === 'livraison');
    const dest = livr && s.world.colonies.find((c) => c.id === livr.destId);
    return { dest: dest ? dest.nom : null };
  });
  const texteContrats = await page.evaluate(
    () => document.getElementById('ecran').textContent);
  if (enCours.dest) {
    const fois = (texteContrats.match(new RegExp(enCours.dest.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'), 'g')) || []).length;
    ok(fois <= 2, 'la carte d’une livraison nomme sa destination au plus deux fois',
      `${enCours.dest} × ${fois}`);
  }
  if (/sans délai/.test(texteContrats)) {
    const carteEnCours = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('section')]
        .find((s2) => /En cours/i.test((s2.querySelector('h2') || {}).textContent || ''));
      return sec ? sec.textContent : '';
    });
    ok(!/aucun délai/.test(carteEnCours),
      'une carte sans délai ne le dit qu’une fois', carteEnCours.slice(0, 120));
  }
  // b. Les pluriels s'accordent — plus de « ville(s) » ni de « réseau(x) ».
  ok(!/\((?:s|x)\)/.test(texteContrats), 'les pluriels de l’écran contrats s’accordent');

  await page.click('[data-a="onglet"][data-k="monde"]');
  await page.waitForTimeout(500);
  const texteMonde = await page.evaluate(
    () => document.getElementById('ecran').textContent);
  ok(!/\((?:s|x)\)/.test(texteMonde), 'les pluriels de l’écran monde s’accordent',
    (texteMonde.match(/[^ ]+\((?:s|x)\)/g) || []).slice(0, 4).join(', '));
  // Le carnet du négociant (U7) : l'écran existe et cite des relevés — dans
  // une partie jouée, la ville de départ au moins a laissé ses prix.
  ok(texteMonde.includes('Carnet du négociant'), 'le carnet du négociant a son écran');
  ok(/\d+(?:,\d+)? à [^\s]/.test(texteMonde.slice(texteMonde.indexOf('Carnet du négociant')))
    || texteMonde.includes('Le carnet se remplit en voyageant'),
  'et il cite un prix relevé dans une ville, ou dit comment s’en procurer');
  // c. Plus aucun code de faction hors légende.
  const codes = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    return Object.values(s.world.drapeaux).map((d) => d.court).filter(Boolean);
  });
  const restants = codes.filter((c) => new RegExp(`(^|[^A-ZÀ-Ý])${c}($|[^A-ZÀ-Ý])`).test(texteMonde));
  ok(restants.length === 0, 'plus aucun code de faction dans l’écran monde',
    restants.join(', '));
  // d. Les noms de réseaux ne se coupent pas au milieu d'un mot.
  const coupures = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')]
      .find((s2) => /Bourses/i.test((s2.querySelector('h2') || {}).textContent || ''));
    if (!sec) return null;
    return [...sec.querySelectorAll('.ligne .k')]
      .map((el) => el.innerText)
      .filter((t) => /[A-Za-zà-ÿÀ-Ý]\n[A-Za-zà-ÿ]/.test(t));
  });
  ok(!coupures || coupures.length === 0,
    'les bourses ne coupent plus les noms au milieu des mots',
    (coupures || []).join(' | ').replace(/\n/g, '/'));
  // e. Les factions qui ne vous connaissent pas tiennent sur une ligne.
  const estimeTxt = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('section')]
      .find((s2) => /pense de vous/i.test((s2.querySelector('h2') || {}).textContent || ''));
    return sec ? sec.textContent : '';
  });
  ok((estimeTxt.match(/inconnu/gi) || []).length <= 1,
    'les factions inconnues sont regroupées, pas répétées',
    `${(estimeTxt.match(/inconnu/gi) || []).length} badges`);

  // f. La fiche d'un membre étiquette son pourcentage.
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(400);
  const resume = await page.locator('details.perso summary').first().innerText();
  ok(/santé/i.test(resume), 'le pourcentage de la fiche porte son nom',
    resume.replace(/\n/g, ' ').slice(0, 80));

  // g. Le marché nomme ses colonnes.
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(400);
  await page.click('[data-a="modale"][data-m="marche"]');
  await page.waitForTimeout(400);
  const marcheTxt = await page.locator('#modale').innerText();
  ok(/Acheter/i.test(marcheTxt) && /Vendre/i.test(marcheTxt),
    'le marché dit quelle colonne achète et laquelle vend');
  await page.click('[data-a="fermer"]');
  await page.waitForTimeout(300);
}

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
  const s = JSON.parse(window.__sauvegardeTexte());
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
  const s = JSON.parse(window.__sauvegardeTexte());
  return s.player.groupes.some((g) => g.membres.some((c) => c.tache && c.tache.type === 'chasse'));
});
ok(tacheOk, 'une tâche personnelle est enregistrée sur le membre');

// Détachement : on coche quelqu'un, on le détache, on vérifie l'état.
const avantGroupes = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).player.groupes.length);
// L'encart « Détacher » naît replié depuis la refonte : on l'ouvre d'abord,
// comme le ferait le joueur.
await page.evaluate(() => {
  const h = document.querySelector('h2.titre[data-k="Détacher"]');
  if (h && h.parentElement.classList.contains('plie')) h.click();
});
await page.waitForTimeout(250);
await page.locator('[data-a="detacher-sel"]').first().click();
await page.waitForTimeout(300);
const boutonDetacher = page.locator('[data-a="detacher"]:not([disabled])');
ok(await boutonDetacher.count() > 0, 'le bouton de détachement s’active une fois quelqu’un choisi');
await boutonDetacher.first().click();
await page.waitForTimeout(500);
const apres = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
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
  const s = JSON.parse(window.__sauvegardeTexte());
  const c = document.querySelector('#carte');
  const ctx = c.getContext('2d');
  const L = s.world.largeur;
  const CELL = Math.round(c.width / L);
  // Un marqueur laisse du blanc franc dans sa case ; on le cherche là où le
  // moteur dit qu'un groupe se trouve — AU CENTRE de la case : le marqueur y
  // est dessiné centré, et un décalage de coin fixe (+4 px) ne le trouvait
  // plus dès que le zoom par défaut a grandi (24 → 36 px la case).
  return s.player.groupes.map((g) => {
    const x = (g.regionId % L) * CELL;
    const y = Math.floor(g.regionId / L) * CELL;
    const d = ctx.getImageData(x + CELL / 2 - 4, y + CELL / 2 - 4, 8, 8).data;
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
const bascule = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).player.groupeActif);
ok(!!bascule, 'on peut changer de groupe affiché');

// Regrouper : les deux sont au même endroit, donc l'absorption est proposée.
const fusion = page.locator('[data-a="fusionner"]');
ok(await fusion.count() > 0, 'le regroupement est proposé quand les groupes se croisent');
await fusion.first().click();
await page.waitForTimeout(500);
const refusion = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
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
ok(/villes? prises?/.test(textePol), 'et son bilan');
// ECONOMIE §10 : l'écran d'une faction dit sa monnaie. Réservé à qui lit leurs
// transmissions — un cours et une masse monétaire ne traînent pas sur les places.
ok(/Monnaie .* : cours/.test(textePol), 'et le cours de sa monnaie',
  (textePol.match(/Monnaie [^.]*\./) || ['—'])[0]);
ok(/en circulation/.test(textePol) && /émissions?/.test(textePol),
  'ce qui circule et combien de fois ils ont imprimé');
ok(/Loyer de l’argent/.test(textePol), 'et le taux directeur, en toutes lettres');
await page.screenshot({ path: join(CAPTURES, '22-politique.png'), fullPage: true });
const guerresAffichees = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
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
// La vitesse se règle avant d'ouvrir : la modale couvre tout l'écran, et le
// sélecteur de vitesse est dessous — un clic dessus n'arriverait jamais.
await page.click('[data-a="vitesse"][data-v="16"]');
await page.click('[data-a="modale"][data-m="ville"]');
await page.waitForTimeout(400);

{
  // « Si je vais dans "qui vit ici", je scroll vers le bas et au bout de
  // quelques secondes ça me ramène en haut. » La modale se réécrivait
  // entièrement à chaque rafraîchissement : `.boite`, qui est le conteneur qui
  // défile, était détruite et refaite plusieurs fois par seconde, et un élément
  // neuf a un défilement à zéro. Mesuré avant la correction : 400 px, puis 0, et
  // 0 à chacun des dix relevés suivants.
  const taille = await page.evaluate(() => {
    const b = document.querySelector('#modale .boite');
    return { h: b.scrollHeight, vue: b.clientHeight };
  });
  ok(taille.h > taille.vue + 200, 'la liste des habitants dépasse l’écran',
    `${taille.h}px pour ${taille.vue}px visibles`);
  await page.evaluate(() => { document.querySelector('#modale .boite').scrollTop = 400; });
  await page.waitForTimeout(300);
  const lu = () => page.evaluate(() => {
    const b = document.querySelector('#modale .boite');
    const el = document.elementFromPoint(200, b.getBoundingClientRect().top + 10);
    return { s: Math.round(b.scrollTop), t: (el ? el.textContent : '').slice(0, 30).replace(/\s+/g, ' ') };
  });
  const debut = await lu();
  let ramene = 0;
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(400);
    const v = await lu();
    if (v.s !== debut.s || v.t !== debut.t) ramene++;
  }
  ok(ramene === 0, 'et l’on y reste : la modale ne remonte plus toute seule',
    `${ramene}/6 relevés déplacés · ${debut.s}px « ${debut.t} »`);
  // On remonte en haut pour la suite du bloc, qui capture la fiche.
  await page.evaluate(() => { document.querySelector('#modale .boite').scrollTop = 0; });
  await page.waitForTimeout(200);
}
const texteVille = await page.evaluate(() => document.querySelector('#modale').textContent);
ok(/MÉTIERS/i.test(texteVille) && /actifs/.test(texteVille),
  'elle détaille ses métiers et le nombre d’actifs');
ok(/QUI COMPTE/i.test(texteVille) && /armurier/i.test(texteVille),
  'et nomme ceux qui comptent, dont l’armurier');
ok(/Caractère/.test(texteVille) && /Vous concernant/.test(texteVille),
  'chacun a un caractère et une opinion sur vous');
await page.screenshot({ path: join(CAPTURES, '21-ville.png'), fullPage: true });
const notables = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
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

// Les prérogatives monétaires du lot E4. Elles sont au-dessus du grade de ce
// décor — c'est ce qu'on vérifie : elles existent, et l'écran dit ce qui manque
// plutôt que de les cacher.
ok(/Battre monnaie/.test(prerogs.texte), 'battre monnaie figure à la table des charges');
ok(/Accorder un crédit/.test(prerogs.texte), 'accorder un crédit aussi');

// Ordonner : ça part, et ça ne coûte pas un point de service.
const avantOrdre = await page.evaluate(() => {
  const s2 = JSON.parse(window.__sauvegardeTexte());
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
    const s2 = JSON.parse(window.__sauvegardeTexte());
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
  const s2 = JSON.parse(window.__sauvegardeTexte());
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
  const s2 = JSON.parse(window.__sauvegardeTexte());
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
  () => { const s2 = JSON.parse(window.__sauvegardeTexte()); return Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0); }
);
// On ouvre TOUS les panneaux, pas seulement le premier : le bouton « livrer »
// n'appartient pas forcément au premier captif, et replié il existe dans le
// document sans être cliquable — l'attente expirait sur un élément trouvé mais
// invisible. Le décor supposait que le premier captif était le bon.
const volets = page.locator('details[data-id^="captif-"] > summary');
for (let i = 0; i < await volets.count(); i++) await volets.nth(i).click();
await page.waitForTimeout(300);
const livrable = page.locator('[data-a="captif"][data-k="livrer"]:visible').first();
if (await livrable.count()) {
  await livrable.click();
  await page.waitForTimeout(500);
  const apresCap = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const col = s2.world.colonies.find((c) => c.geole && c.geole.detenus.length);
    return { cr: Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0), geole: col ? col.geole.detenus.length : 0 };
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
// HISTOIRE lot A : le chapitre en cours, en tête de chronique.
ok(/Chapitre [IVXLC]+/.test(texteChro),
  'la chronique dit le chapitre où la partie en est',
  (texteChro.match(/Chapitre [IVXLC]+/) || ['absent'])[0]);
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
// L'encart naît replié depuis la refonte : on l'ouvre avant de choisir.
await page.evaluate(() => {
  const h = document.querySelector('h2.titre[data-k="Tactique"]');
  if (h && h.parentElement.classList.contains('plie')) h.click();
});
await page.waitForTimeout(250);
await page.locator('[data-a="tactique"][data-k="harcelement"]').click();
await page.waitForTimeout(500);
// Depuis P2 (PROMESSES.md), la consigne est celle de la colonne affichée —
// le repli global reste pour les colonnes sans consigne.
const tacRetenue = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
  const avecConsigne = (s.player.groupes || []).find((g) => g.tactique);
  return avecConsigne ? avecConsigne.tactique : s.player.tactique;
});
ok(tacRetenue === 'harcelement', 'le choix est retenu et sauvegardé — pour la colonne affichée', tacRetenue);
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
  const s2 = JSON.parse(window.__sauvegardeTexte());
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

// Un geste n'est jamais avalé par le rendu : pendant un long glissement à
// grande vitesse, `rafraichir` reconstruisait l'écran — la boîte remplacée,
// la capture du pointeur morte, la carte qui saute sous le doigt. Le geste
// arme désormais le même répit qu'un clic, et la boîte SURVIT au glissement.
{
  await page.click('[data-a="vitesse"][data-v="60"]');
  await page.waitForTimeout(300);
  const boiteAvant = await page.evaluateHandle(() => document.querySelector('#carte-boite'));
  await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
  await page.mouse.down();
  for (let i = 0; i < 14; i++) {
    await page.mouse.move(bb.x + bb.width * 0.5 + i * 5, bb.y + bb.height * 0.5 + (i % 2 ? 3 : -3));
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
  const survit = await page.evaluate((el) => el === document.querySelector('#carte-boite'), boiteAvant);
  ok(survit, 'la boîte de carte survit à un glissement d’une seconde et demie à ×60');
  await page.click('[data-a="vitesse"][data-v="1"]');
  await page.waitForTimeout(300);
}

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
  const s2 = JSON.parse(window.__sauvegardeTexte());
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

// « On peut mettre les boutons "y aller" avec les autres actions plutôt que de
// devoir ouvrir les sous-menus ? » — le propriétaire. L'ordre de route est un
// verbe comme les autres : sitôt une case visée, il rejoint le dock, dans une
// barre cible collée dessus — pas au fond d'un panneau à défiler puis déplier.
{
  // Une case voisine du groupe, même rangée : visible puisque la vue vient
  // d'être recentrée sur lui, et différente de sa case à lui.
  const ou = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const g2 = s2.player.groupes[0];
    const L = s2.world.largeur;
    const x = g2.regionId % L;
    const y = Math.floor(g2.regionId / L);
    const cx = x + (x < L - 3 ? 2 : -2);
    const r = document.querySelector('#carte').getBoundingClientRect();
    const cell = r.width / L;
    return { px: r.left + (cx + 0.5) * cell, py: r.top + (y + 0.5) * cell };
  });
  await page.mouse.click(ou.px, ou.py);
  await page.waitForTimeout(350);
  const cible = await page.evaluate(() => {
    const b = document.querySelector('#barre-cible [data-a="voyage"]');
    if (!b || b.offsetParent === null) return { present: false };
    const rb = b.getBoundingClientRect();
    const dock = document.querySelector('#dock-ordres');
    const rd = dock ? dock.getBoundingClientRect() : null;
    return {
      present: true,
      dansVue: rb.top >= 0 && rb.bottom <= window.innerHeight && rb.width > 0,
      surLeDock: !!rd && rd.top - rb.bottom >= -4 && rd.top - rb.bottom < 60,
    };
  });
  ok(cible.present && cible.dansVue && cible.surLeDock,
    'sitôt une case visée, « Y aller » est sur le dock — sans défiler ni déplier',
    JSON.stringify(cible));
}

// « Quand le tick passe, les boutons reviennent à la position par défaut,
// ce n'est pas bon » — le propriétaire. Le dock défile horizontalement, et
// chaque re-rendu réécrivait l'écran d'un bloc : le défilement du dock
// retombait à zéro sous le doigt, plusieurs fois par seconde à ×60.
{
  await page.evaluate(() => { document.querySelector('#dock-ordres').scrollLeft = 140; });
  await page.click('[data-a="vitesse"][data-v="60"]');
  await page.waitForTimeout(2600);
  const defil = await page.evaluate(() => {
    const d = document.querySelector('#dock-ordres');
    return d ? Math.round(d.scrollLeft) : -1;
  });
  ok(defil > 100, 'le défilement du dock survit aux ticks — les boutons restent où on les a mis',
    `scrollLeft ${defil}`);
  await page.click('[data-a="vitesse"][data-v="1"]');
  await page.waitForTimeout(300);
}

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
const creditsAv = await page.evaluate(() => { const s2 = JSON.parse(window.__sauvegardeTexte()); return Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0); });
await page.click('[data-a="honorer"]');
await page.waitForTimeout(500);
const apresServ = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
  const c = s.world.colonies.find((x) => x.notables && x.notables.some((p) => p.memoire && p.memoire.length));
  const p = c.notables.find((x) => x.memoire && x.memoire.length);
  return { credits: Object.values(s.player.bourse || {}).reduce((a, b) => a + b, 0),
    opinion: p.opinion, demande: !!p.demande, memoire: p.memoire.length };
});
ok(apresServ.credits > creditsAv && !apresServ.demande && apresServ.opinion > 0,
  'le service rendu paie, close la demande et change ce qu’il pense de vous',
  JSON.stringify(apresServ));
const texteApres = await page.evaluate(() => document.querySelector('#modale').textContent);
ok(/apporté des medkits/.test(texteApres), 'et il s’en souvient à l’écran');
await page.click('[data-a="fermer"]');
await page.waitForTimeout(300);

console.log('\n8 vicies quater. Tout bâtiment se voit et se bâtit');
{
  // « Je suis pas censé créer un bâtiment ? » Si. Le comptoir était déclaré,
  // chiffré, testé côté moteur — et absent de toutes les familles de l'écran,
  // donc affiché nulle part. On ne pouvait ni le voir ni le construire.
  //
  // Même défaut que la liste d'embauche qui oubliait quatre métiers : **une
  // liste qu'il faut penser à compléter finit par être incomplète.** On ne
  // vérifie donc plus la liste, on vérifie l'écran.
  const bat = partieAvancee();
  bat.base.batiments.antenne = Math.max(1, bat.base.batiments.antenne || 0);
  for (const k of Object.keys(bat.base.recherche)) bat.base.recherche[k] = 1;
  Object.assign(bat.base.stock, {
    ferraille: 9000, polymere: 9000, composant: 9000, alliage: 9000,
    isotope: 9000, minerai: 9000, carburant: 9000, biomasse: 9000,
  });
  bat.player.bourse = { [monnaieIci(bat)]: 999999 };
  bat.dernierReel = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((t) => localStorage.setItem('cendres.save.v1', t), serialiser(bat));
  await page.evaluate(() => localStorage.removeItem('cendres.replis.v1'));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(600);

  const affiches = await page.evaluate(
    () => [...document.querySelectorAll('[data-a="construire"]')].map((b) => b.dataset.k));
  const attendus = Object.keys(BUILDINGS);
  const absents = attendus.filter((k) => !affiches.includes(k));
  ok(absents.length === 0,
    'chaque bâtiment du jeu a sa carte sur l’écran BASE',
    absents.length ? `jamais affiché(s) : ${absents.join(', ')}` : `${affiches.length} affichés`);

  // Et le comptoir en particulier, puisque c'est celui qui manquait.
  const texteBat = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/Comptoir/.test(texteBat), 'le comptoir est de ceux-là');

  // Les recherches à prérequis le disent avant le clic, pas après.
  const gates = Object.keys(RESEARCH).filter((k) => RESEARCH[k].exige);
  ok(gates.length > 0, 'des recherches en exigent d’autres', gates.join(', '));
  const neuf = nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' });
  const gN = groupeActif(neuf);
  gN.regionId = neuf.world.regions.find((r) => !r.colonie).i;
  Object.assign(gN.inventaire, { ferraille: 400 });
  fonderBase(neuf, () => {});
  neuf.base.batiments.antenne = 1;
  Object.assign(neuf.base.stock, { composant: 9000, isotope: 9000, ferraille: 9000 });
  neuf.player.bourse = { [monnaieIci(neuf)]: 999999 };
  neuf.dernierReel = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((t) => localStorage.setItem('cendres.save.v1', t), serialiser(neuf));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(600);
  const bloques = await page.evaluate((liste) => liste.map((k) => {
    const b = document.querySelector(`[data-a="chercher"][data-k="${k}"]`);
    return { k, vu: !!b, off: b ? b.disabled : null, txt: b ? b.textContent.trim() : '' };
  }), gates);
  ok(bloques.every((x) => x.vu), 'toutes les recherches ont leur carte',
    bloques.filter((x) => !x.vu).map((x) => x.k).join(', '));
  ok(bloques.every((x) => x.off),
    'et celles qui en exigent une autre ne se lancent pas',
    bloques.filter((x) => !x.off).map((x) => x.k).join(', '));
  ok(bloques.every((x) => /d’abord/.test(x.txt)),
    'leur bouton nomme ce qu’il faut avant',
    bloques.map((x) => `${x.k}: ${x.txt}`).join(' · '));
}

console.log('\n8 vicies ter. Les bourses du monde, enfin visibles');
{
  // Toute cette couche tournait sans que le joueur en voie rien : des factions
  // ouvraient des bourses, les branchaient les unes sur les autres par des
  // accords, et une guerre débranchait le tout. On ne le découvrait qu'en
  // montant un comptoir, et seulement pour le réseau avec lequel on traitait.
  const mb = nouvellePartie(1313, { maintenant: Date.now(), depart: 'ville' });
  for (let i = 0; i < 200; i++) tickSim(mb);
  const riches = DIPLO_FACTIONS.filter((k) => mb.world.factions[k].colonies.length >= 4);
  for (const k of riches.slice(0, 3)) {
    mb.world.factions[k].tresor = 9000;
    ouvrirBourse(mb.world, k, mb.temps);
  }
  if (riches.length >= 2) signerAccord(mb.world, riches[0], riches[1], mb.temps);
  tickBourses(mb.world, 0);
  mb.dernierReel = Date.now();

  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((t) => localStorage.setItem('cendres.save.v1', t), serialiser(mb));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="monde"]');
  await page.waitForTimeout(500);

  const bourses = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('#ecran > section')].find((x) => /BOURSES/i.test(x.textContent));
    return sec ? sec.innerText.replace(/\s+/g, ' ') : null;
  });
  ok(!!bourses, 'l’écran Monde montre les bourses ouvertes');
  ok(bourses && /réseau/i.test(bourses), 'et combien de réseaux existent',
    (bourses || '').slice(0, 120));
  ok(bourses && /\d+ villes?\b/.test(bourses) && /% de la carte/.test(bourses),
    'avec le poids de chacun sur la carte, au pluriel accordé (U4)',
    (bourses || '').slice(0, 160));
  ok(bourses && /accord/i.test(bourses),
    'et l’accord qui en relie deux se voit', (bourses || '').slice(0, 200));
  ok(bourses && /prix de base/.test(bourses),
    'ainsi que la cherté de leur cours', (bourses || '').slice(0, 200));
  // U4 — le nom d'un réseau à rallonge (« Consortium Hexa + Les Rouilleurs »)
  // ne se coupe pas au milieu d'un mot : c'est ce scénario-ci qui produisait
  // « Consortiu / m Hexa » sur la capture.
  const coupures42 = await page.evaluate(() => {
    const sec = [...document.querySelectorAll('#ecran > section')].find((x) => /BOURSES/i.test(x.textContent));
    if (!sec) return null;
    return [...sec.querySelectorAll('.ligne .k, .k')]
      .map((el) => el.innerText)
      .filter((t) => /[A-Za-zà-ÿÀ-Ý]\n[A-Za-zà-ÿ]/.test(t));
  });
  ok(!coupures42 || coupures42.length === 0,
    'le nom d’un réseau ne se coupe pas au milieu d’un mot',
    (coupures42 || []).join(' | ').replace(/\n/g, '/'));
  await page.evaluate(() => {
    const sec = [...document.querySelectorAll('#ecran > section')].find((x) => /BOURSES/i.test(x.textContent));
    if (sec) sec.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(CAPTURES, '42-bourses.png') });
}

console.log('\n8 vicies bis. Toutes les fiches, pas seulement celle qu’on a signalée');
{
  // « Ça va être bon pour toutes les modales ? » — question juste, et la réponse
  // ne se déduit pas : elle se mesure. Elles passent toutes par le même rendu,
  // mais l'ancre travaille sur la structure de chacune, et rien ne dit d'avance
  // qu'elle s'y retrouve partout.
  //
  // Deux pièges rencontrés en écrivant cette mesure, et tous deux donnaient un
  // faux verdict :
  //
  //   — suivre le *texte* au haut de la fenêtre accusait le marché, dont les
  //     prix changent tout seuls. Un texte qui change n'est pas un texte qui
  //     bouge : on suit donc une position ;
  //   — marquer l'élément suivi d'un attribut le perdait à chaque réécriture,
  //     et l'on mesurait sa disparition. On le suit par son rang.
  const pp = await navigateur.newPage({ viewport: { width: 390, height: 300 } });
  const err = [];
  pp.on('pageerror', (x) => err.push(x.message));
  await pp.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

  const ville = nouvellePartie(20260729, { maintenant: Date.now(), depart: 'ville' });
  const gv = groupeActif(ville);
  const rngv = new Rng(9);
  for (let i = 0; i < 14; i++) gv.membres.push(makeCharacter(rngv, {}));
  ville.player.bourse = { [monnaieIci(ville)]: 90000 };
  Object.assign(gv.inventaire, { ferraille: 300, rations: 300, polymere: 100, minerai: 100, medkit: 20 });
  avancer(ville, 30);
  ville.dernierReel = Date.now();
  await pp.evaluate((t) => localStorage.setItem('cendres.save.v1', t), serialiser(ville));
  await pp.reload({ waitUntil: 'networkidle' });
  await pp.click('[data-a="continuer"]');
  await pp.waitForSelector('#carte');
  await pp.click('[data-a="vitesse"][data-v="16"]');
  await pp.waitForTimeout(400);

  const testees = [];
  const trop = [];
  for (const ecranNom of ['carte', 'escouade']) {
    await pp.click(`[data-a="onglet"][data-k="${ecranNom}"]`);
    await pp.waitForTimeout(400);
    const liste = [...new Set(await pp.evaluate(
      () => [...document.querySelectorAll('[data-a="modale"]')].map((b) => b.dataset.m)))];
    for (const m of liste) {
      if (testees.includes(m)) continue;
      await pp.evaluate((k) => {
        const b = document.querySelector(`[data-a="modale"][data-m="${k}"]`);
        if (b) b.click();
      }, m);
      await pp.waitForTimeout(400);
      const t = await pp.evaluate(() => {
        const b = document.querySelector('#modale .boite');
        return b ? { h: b.scrollHeight, vue: b.clientHeight } : null;
      });
      if (!t || t.h <= t.vue + 30) {
        if (t) trop.push(m);
      } else {
        await pp.evaluate((y) => { document.querySelector('#modale .boite').scrollTop = y; },
          Math.max(20, Math.min(300, t.h - t.vue - 20)));
        await pp.waitForTimeout(250);
        const idx = await pp.evaluate(() => {
          const b = document.querySelector('#modale .boite');
          const haut = b.getBoundingClientRect().top;
          const enf = [...b.children];
          for (let i = 0; i < enf.length; i++) if (enf[i].getBoundingClientRect().bottom > haut + 2) return i;
          return -1;
        });
        const pos = () => pp.evaluate((i) => {
          const b = document.querySelector('#modale .boite');
          const el = b.children[i];
          return el ? Math.round(el.getBoundingClientRect().top - b.getBoundingClientRect().top) : null;
        }, idx);
        const d0 = await pos();
        let bouge = 0;
        for (let i = 0; i < 5; i++) {
          await pp.waitForTimeout(350);
          const v = await pos();
          if (v === null || Math.abs(v - d0) > 2) bouge++;
        }
        testees.push(m);
        ok(bouge === 0, `fiche « ${m} » : on garde sa place`,
          `${bouge}/5 relevés déplacés · enfant ${idx} à ${d0}px`);
      }
      await pp.evaluate(() => { const b = document.querySelector('[data-a="fermer"]'); if (b) b.click(); });
      await pp.waitForTimeout(250);
    }
  }
  ok(testees.length >= 8, 'et l’on en a vraiment essayé une bonne partie',
    `${testees.length} mesurées : ${testees.join(', ')}${trop.length ? ` · trop courtes ici : ${trop.join(', ')}` : ''}`);
  ok(err.length === 0, 'aucune erreur pendant le tour des fiches', err.join(' | '));
  await pp.close();
}

console.log('\n8 vicies semel. Recruter : le clic engage vraiment');
{
  // Le chemin de l'INTERFACE, jamais couvert : le moteur engageait par
  // identifiant, mais l'action le passait par Number() — relique du temps où
  // l'on engageait par RANG. Les identifiants sont des chaînes (« c7f3… ») :
  // Number en fait NaN, et chaque clic répondait « cette personne s'est
  // placée ailleurs » — à ×1 comme à ×60 (rapporté par le propriétaire).
  const enVille = (() => {
    const s = nouvellePartie(20260830, { maintenant: Date.now(), depart: 'ville' });
    s.player.bourse = { [monnaieIci(s)]: 99999 };
    s.dernierReel = Date.now();
    return s;
  })();
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(enVille));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(400);
  await page.click('[data-a="modale"][data-m="recrutement"]');
  await page.waitForTimeout(400);
  const bEngager = page.locator('[data-a="recruter"]:not([disabled])').first();
  ok(await bEngager.count() >= 1, 'la ville propose au moins une personne engageable');
  const avantN = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).player.groupes[0].membres.length);
  await bEngager.click();
  await page.waitForTimeout(600);
  const apresN = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).player.groupes[0].membres.length);
  ok(apresN === avantN + 1, 'cliquer « Engager » engage vraiment', `${avantN} → ${apresN}`);
  await page.click('[data-a="fermer"]');
  await page.waitForTimeout(250);
}

console.log('\n8 vicies semel bis. La fin ne gèle pas l’horloge de l’écran');
{
  // « ça ne fonctionne pas sur la partie que j'avais en cours » — le
  // propriétaire, après la règle du temps. Le moteur ne s'arrête plus, mais
  // l'horloge temps réel de main.js refusait de battre dès que `state.fin`
  // était posé : une partie éteinte restait figée à l'écran — sauvegarde
  // ancienne ou partie neuve, même gel à la première extinction.
  const eteinte = serialiser((() => {
    const s = partieAvancee();
    for (const g of s.player.groupes) {
      for (const m of g.membres) {
        m.etat = 'mort';
        m.pv = 0;
        // Déjà compté, comme dans le décor de la stèle : sans ça le premier
        // tick ré-inscrirait ces morts au mémorial.
        m._compte = true;
      }
    }
    s.fin = 'extinction';
    s.vitesse = 60;
    s.dernierReel = Date.now();
    return s;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), eteinte);
  await page.evaluate(() => { window.__momentsAuto = false; });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  const tFige = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  // La sauvegarde s'écrit toutes les 5 s : on attend au-delà, comme au § 2.
  await page.waitForTimeout(6000);
  const tApres = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  ok(tApres > tFige, 'le monde tourne à l’écran même quand tout le monde est mort',
    `${tFige} → ${tApres}`);
}

console.log('\n8 vicies semel ter. Morts et prisonniers : la décision s’applique à tous');
{
  // « Pour le traitement des prisonniers ou des morts, il faut pouvoir
  // appliquer la décision à tous » — le propriétaire. Décor : deux morts
  // portés ET des prisonniers dans la même colonne ; un bouton par décision,
  // pour tous d'un coup, à côté des décisions à l'unité.
  const surTous = serialiser((() => {
    const t = partieAvancee();
    const g = groupeActif(t);
    for (const m of g.membres.slice(0, 2)) {
      m.etat = 'mort';
      m.pv = 0;
      m._compte = true;
    }
    const bande = genererBande(new Rng(31), 'bandits', 4, 1);
    for (const c of bande.membres) { c.etat = 'ko'; c.corps.torse.pv = 0; }
    fairePrisonniers(t, g, bande, capturables(g, bande), () => {});
    t.vitesse = 1;
    t.dernierReel = Date.now();
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), surTous);
  await page.evaluate(() => { window.__momentsAuto = true; });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(400);

  const avantTous = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const g2 = s2.player.groupes[0];
    return { morts: g2.membres.filter((m) => m.etat === 'mort').length, captifs: (g2.prisonniers || []).length };
  });
  ok(avantTous.morts === 2 && avantTous.captifs >= 2, 'décor : deux morts portés, des prisonniers',
    JSON.stringify(avantTous));

  const bEnterrer = page.locator('[data-a="corps-tous"][data-k="enterrer"]');
  ok(await bEnterrer.count() === 1, 'le panneau des morts porte la décision « pour tous »');
  if (await bEnterrer.count()) {
    await bEnterrer.click();
    await page.waitForTimeout(600);
  }
  const bRelacher = page.locator('[data-a="captif-tous"][data-k="relacher"]');
  ok(await bRelacher.count() === 1, 'celui des prisonniers aussi');
  if (await bRelacher.count()) {
    await bRelacher.click();
    await page.waitForTimeout(600);
  }
  const apresTous = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const g2 = s2.player.groupes[0];
    return { morts: g2.membres.filter((m) => m.etat === 'mort').length, captifs: (g2.prisonniers || []).length };
  });
  ok(apresTous.morts === 0 && apresTous.captifs === 0,
    'deux décisions, et tout est réglé — enterrés, relâchés',
    JSON.stringify(apresTous));
}

console.log('\n8 vicies. Lire sans se faire bouger, et replier ce qu’on ne lit pas');
{
  // Trois défauts d'usage rapportés ensemble : « régulièrement la page se
  // rafraîchit ce qui décale là où on se trouve », « j'aimerais que les encarts
  // soient refermables car certains sont très grands », « voir quel texte est
  // cliquable ou non de façon bien distincte ».
  const foule = partieAvancee();
  const gF = groupeActif(foule);
  const modele = JSON.parse(JSON.stringify(gF.membres[0]));
  for (let i = 0; i < 18; i++) {
    const c = JSON.parse(JSON.stringify(modele));
    c.id = `recrue${i}`;
    c.nom = `Recrue ${i}`;
    gF.membres.push(c);
  }
  foule.dernierReel = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('cendres.replis.v1'));
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(foule));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(500);

  // --- Le pli par défaut (refonte, avis du game master) : l'écran s'ouvre sur
  //     les gens et ce qui se décide. Les réglages qu'on touche une fois par
  //     partie naissent repliés — leur barre dit l'essentiel — et les déplier
  //     est un choix qui tient d'une session à l'autre.
  const nesPlies = await page.evaluate(
    () => [...document.querySelectorAll('#ecran > section.plie > h2.titre')].map((h) => h.dataset.k));
  // « Mémorial » et les prisonniers n'existent que si la partie en a : on
  // n'exige que les encarts toujours présents.
  ok(['Posture', 'Tactique', 'Consignes permanentes', 'Détacher'].every((k) => nesPlies.includes(k)),
    'les réglages naissent repliés — l’écran s’ouvre sur les gens',
    nesPlies.join(' · ') || 'aucun');
  await page.evaluate(() => document.querySelector('h2.titre[data-k="Posture"]').click());
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(500);
  const nesPlies2 = await page.evaluate(
    () => [...document.querySelectorAll('#ecran > section.plie > h2.titre')].map((h) => h.dataset.k));
  ok(!nesPlies2.includes('Posture') && nesPlies2.includes('Tactique'),
    'déplier un encart né plié est un choix qui survit au rechargement',
    nesPlies2.join(' · ') || 'aucun');

  // --- Les clés d'encart, qui servent au pli comme à l'ancre de défilement.
  const cles = await page.evaluate(
    () => [...document.querySelectorAll('#ecran > section.pliable > h2.titre')].map((h) => h.dataset.k));
  ok(cles.length > 3, 'les encarts sont repliables', `${cles.length} encarts`);
  ok(new Set(cles).size === cles.length,
    'et chacun a une clé à lui — deux encarts de même titre ne se replient pas ensemble',
    cles.join(' · '));

  // --- Ce qui se clique se voit : un chevron, et lui seul.
  const chevrons = await page.evaluate(() => {
    const a = (el) => getComputedStyle(el, '::after').borderRightWidth;
    const pliables = [...document.querySelectorAll('#ecran > section.pliable > h2.titre')];
    const inertes = [...document.querySelectorAll('#ecran .aide, #ecran .ligne > .k')];
    return {
      avec: pliables.filter((h) => parseFloat(a(h)) > 0).length,
      total: pliables.length,
      curseur: pliables.filter((h) => getComputedStyle(h).cursor === 'pointer').length,
      inertesAvecChevron: inertes.filter((h) => parseFloat(a(h)) > 0).length,
    };
  });
  ok(chevrons.avec === chevrons.total,
    'chaque titre qui répond au doigt porte un chevron',
    `${chevrons.avec}/${chevrons.total}`);
  ok(chevrons.curseur === chevrons.total, 'et le curseur le dit aussi');
  ok(chevrons.inertesAvecChevron === 0,
    'et rien d’inerte n’en porte : le chevron veut dire « appuyez ici »',
    `${chevrons.inertesAvecChevron} textes inertes en portent un`);

  // --- Replier : ça raccourcit, ça tient au rechargement.
  const gros = 'Qui fait quoi';
  // Certains encarts naissent repliés : on note lesquels, pour vérifier que le
  // clic n'ajoute que le sien.
  const dejaPlies = await page.evaluate(
    () => [...document.querySelectorAll('.panneau.plie > h2.titre')].map((h) => h.dataset.k));
  const avant = await page.evaluate(() => document.querySelector('#ecran').scrollHeight);
  await page.click(`h2.titre[data-k="${gros}"]`);
  await page.waitForTimeout(350);
  const apres = await page.evaluate(() => document.querySelector('#ecran').scrollHeight);
  ok(apres < avant, 'replier un encart raccourcit vraiment la page', `${avant} → ${apres}px`);
  const plie = await page.evaluate(
    () => [...document.querySelectorAll('.panneau.plie > h2.titre')].map((h) => h.dataset.k));
  ok(plie.length === dejaPlies.length + 1 && plie.includes(gros)
    && dejaPlies.every((k) => plie.includes(k)),
  'et lui seul s’est ajouté aux plis', plie.join(', '));

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(500);
  const encore = await page.evaluate(
    () => [...document.querySelectorAll('.panneau.plie > h2.titre')].map((h) => h.dataset.k));
  ok(encore.includes(gros), 'le pli survit au rechargement', encore.join(', ') || 'aucun');

  // --- Ce que dit une barre repliée. Un encart fermé qui ne montre que son
  //     titre ne sert à rien : on le rouvre pour lire le seul chiffre qu'on
  //     cherchait. La barre doit le porter.
  {
    const cles2 = await page.evaluate(
      () => [...document.querySelectorAll('#ecran > section.pliable > h2.titre')].map((h) => h.dataset.k));
    for (const k of cles2) {
      await page.evaluate((c) => {
        const h = document.querySelector(`h2.titre[data-k="${CSS.escape(c)}"]`);
        if (h && !h.parentElement.classList.contains('plie')) h.click();
      }, k);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
    const barres = await page.evaluate(() => [...document.querySelectorAll('#ecran > section.plie')]
      .map((sec) => {
        const h = sec.querySelector(':scope > h2.titre');
        const c = h.cloneNode(true);
        for (const d of c.querySelectorAll('.droite, .resume')) d.remove();
        return {
          cle: h.dataset.k,
          titre: c.textContent.trim(),
          reste: h.innerText.replace(/\s+/g, ' ').trim(),
        };
      }));
    const muettes = barres.filter((b) => b.reste.replace(/\s+/g, ' ').trim().length
      <= b.titre.replace(/\s+/g, ' ').trim().length + 1);
    ok(barres.length >= 6, 'tous les encarts sont repliés pour la mesure', `${barres.length}`);
    ok(muettes.length === 0,
      'et chaque barre repliée porte un chiffre ou un état, pas seulement son titre',
      muettes.map((b) => b.cle).join(' · ') || '');
    // Et pas de doublon bête : le résumé ne répète pas ce que la droite dit déjà.
    const repetes = await page.evaluate(() => [...document.querySelectorAll('#ecran > section.plie > h2.titre')]
      .filter((h) => {
        const d = h.querySelector('.droite');
        const r = h.querySelector('.resume');
        if (!d || !r) return false;
        const a = d.textContent.trim().toLowerCase();
        return a.length > 3 && r.textContent.trim().toLowerCase().includes(a);
      }).map((h) => h.dataset.k));
    ok(repetes.length === 0, 'sans redire deux fois la même chose', repetes.join(' · '));
    for (const k of cles2) {
      await page.evaluate((c) => {
        const h = document.querySelector(`h2.titre[data-k="${CSS.escape(c)}"]`);
        if (h && h.parentElement.classList.contains('plie')) h.click();
      }, k);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(300);
  }

  // --- Et l'ancre de défilement : c'est le texte qui doit rester en place, pas
  //     le nombre de pixels. Sur la carte et au journal, l'encart du haut change
  //     de hauteur tout seul — une alerte, une nouvelle ligne — et l'on se
  //     retrouvait ailleurs sans avoir touché à rien.
  for (const tab of ['carte', 'journal']) {
    await page.click(`[data-a="onglet"][data-k="${tab}"]`);
    await page.waitForTimeout(400);
    await page.click('[data-a="vitesse"][data-v="60"]');
    // On se place là où il reste de la place en dessous. Tout en bas, garder le
    // texte immobile quand un encart apparaît au-dessus demanderait de défiler
    // au-delà de la fin : le navigateur borne, et la mesure accuserait l'ancre
    // d'un défaut qui n'est pas le sien.
    const mesures = await page.evaluate(() => {
      const ec = document.querySelector('#ecran');
      return { h: ec.scrollHeight, vue: ec.clientHeight };
    });
    if (mesures.h < mesures.vue + 500) continue;
    const cible = Math.min(Math.floor(mesures.h / 2), mesures.h - mesures.vue - 400);
    await page.evaluate((y) => { document.querySelector('#ecran').scrollTop = y; }, cible);
    await page.waitForTimeout(300);
    // On compare **la ligne**, pas ce qui s'y accroche : les chiffres sont
    // gommés et les clauses ajoutées après un « · » coupées.
    //
    // C'est le sujet de la mesure qui l'exige. On cherche un *déplacement* —
    // « ce qu'on lit reste sous les yeux ». Or à soixante fois la vitesse la
    // même ligne gagne et perd des morceaux sans bouger d'un pixel :
    // « 1 blessé(s) sérieux » devient « 2 blessé(s) sérieux · sac plein : » et
    // redevient elle-même. Relevé à la sonde, huit lectures d'affilée :
    // `scrollTop` vaut 746 aux huit, et le décor comptait trois déplacements.
    // Il accusait l'ancre d'un défaut qui n'était pas le sien.
    //
    // Ça s'est vu le jour où les colonnes ont su se nourrir — plus de campagnes
    // vivantes, donc une escouade qui se blesse et se charge pendant les trois
    // secondes de la mesure. Le décor était faux avant, il ne le montrait pas.
    // La sonde lit aussi `scrollTop` : sans lui, un échec ne dit pas si l'ancre
    // a bougé le défilement (elle a agi, mal) ou si le contenu a glissé sous un
    // défilement immobile (elle n'a pas agi du tout). Les deux pannes ont des
    // coupables différents, et on a déjà accusé l'ancre d'un défaut de décor
    // une fois — la sonde est ce qui a permis de le voir.
    const lu = () => page.evaluate(() => {
      const ec = document.querySelector('#ecran');
      const bord = ec.getBoundingClientRect().top;
      // La sonde échappe aux gouttières. `elementFromPoint` à bord+10 tombait
      // PILE sur la frontière de marge entre deux entrées du journal : un
      // demi-pixel de dérive de métriques — une pile de polices pour une
      // autre — la faisait basculer sur le fond du panneau, et l'on comptait
      // une « transition » alors que les ancres n'avaient pas bougé d'un
      // pixel (sonde posée : l'entrée e318 à y=11 aux huit relevés, dans les
      // runs rouges comme il se doit). On regarde donc à trois profondeurs et
      // l'on prend la première ligne de contenu — même mesure, sans le fil
      // du rasoir.
      let el = null;
      for (const dy of [10, 16, 22]) {
        const cand = document.elementFromPoint(200, bord + dy);
        // « La première ligne de contenu » : un élément au texte vide n'en est
        // pas une. Une aiguille vide se retrouve dans tout — l'éviction devient
        // indétectable et chaque texte réel compte comme une transition ; la
        // mesure perdait son objet dès le premier relevé (vu après la refonte
        // des titres : « » à 7755, puis trois ≠ qui n'accusaient personne).
        if (cand && cand !== ec && !cand.matches('section')
            && (cand.textContent || '').trim()) { el = cand; break; }
        el = el || cand;
      }
      const texte = (el ? el.textContent : '').slice(0, 34)
        .replace(/\s+/g, ' ').replace(/\d+/g, '#').split(' · ')[0];
      return { texte, haut: Math.round(ec.scrollTop) };
    });
    // Une ligne évincée n'est pas une ligne déplacée. Le journal ne garde que
    // ses `LOG_MAX` (400) dernières entrées ; à soixante fois la vitesse sur
    // une machine rapide, cent quatre-vingt-dix heures de jeu défilent pendant
    // les trois secondes de mesure, et la ligne lue peut vieillir hors du
    // journal avant le huitième relevé. L'ancre ne peut pas garder ce qui
    // n'existe plus — la sonde l'a montré : le défilement suivait pas à pas
    // (7431 → 8841) et le texte a tenu six relevés, jusqu'à l'éviction. C'est
    // la troisième fois que ce décor accuse l'ancre du comportement d'un
    // autre : d'abord un `scrollTop` immobile lu comme un déplacement, puis la
    // même ligne qui gagnait des morceaux sans bouger, maintenant la rétention
    // du journal. On arrête donc la mesure à l'éviction — les relevés d'avant
    // comptent, ceux d'après n'ont plus d'objet.
    const debut = await lu();
    // L'aiguille est le texte entier, coupe du `slice(0, 34)` comprise : pour
    // une recherche de sous-chaîne, un mot tronqué reste contenu dans le mot
    // plein. La première version retirait le dernier mot par prudence — et le
    // dernier mot était le seul distinctif : « J# #:# » sans « Puits-Vespe »
    // se trouve dans chaque ligne du journal, et l'éviction devenait
    // indétectable.
    const aiguille = debut.texte.trim();
    // On compte les TRANSITIONS, pas les relevés. L'écran se rend toutes les
    // huit cents millisecondes environ et la sonde lit toutes les quatre
    // cents : chaque paire de relevés voit donc le même rendu (7807 7807,
    // 8486 8486… — relevé à la sonde), et un accroc unique au dernier rendu
    // comptait double. « Deux relevés déplacés » mesurait la fréquence
    // d'échantillonnage du décor, pas la stabilité de l'écran. Un vrai
    // vacillement — la ligne qui saute à chaque rendu — compte toujours :
    // chaque saut est une transition.
    let bouges = 0;
    let evincee = false;
    let precedent = debut.texte;
    const releves = [];
    for (let i = 0; i < 8 && !evincee; i++) {
      await page.waitForTimeout(400);
      const r = await lu();
      releves.push(r);
      if (r.texte !== precedent) {
        const la = await page.evaluate((n) => document.querySelector('#ecran').textContent
          .replace(/\s+/g, ' ').replace(/\d+/g, '#').includes(n), aiguille);
        if (!la) { evincee = true; releves[releves.length - 1].e = true; continue; }
        bouges++;
        precedent = r.texte;
      }
    }
    ok(bouges <= 1, `écran ${tab} : ce qu’on lit reste sous les yeux`,
      `${bouges} transition(s) sur ${releves.length} relevés · « ${debut.texte} » (haut ${debut.haut}) · `
      + releves.map((r) => `${r.haut}${r.e ? '†' : r.texte === debut.texte ? '' : '≠'}`).join(' '));
    await page.click('[data-a="vitesse"][data-v="1"]');
  }
}

console.log('\n8 nonies quater. Le comptoir, à l’écran');
{
  // Le panneau qui manquait : le moteur savait passer des ordres, personne ne
  // pouvait le lui demander. Et un panneau qui plante ne se voit pas comme un
  // plantage — il se voit comme un panneau absent, ce qui est bien pire à
  // diagnostiquer. D'où la vérification explicite du bandeau d'erreur.
  const cp = partieAvancee();
  const riche = DIPLO_FACTIONS.find((k) => cp.world.factions[k].colonies.length >= 4);
  cp.world.factions[riche].tresor = 9000;
  ouvrirBourse(cp.world, riche, 0);
  tickBourses(cp.world, 0);
  cp.player.reputation[riche] = 80;
  cp.player.bourse = { [monnaieIci(cp)]: 30000 };
  cp.base.batiments.comptoir = 1;
  cp.base.colonieId = 'poste-joueur';
  cp.world.colonies.push({
    id: 'poste-joueur', nom: 'Votre camp', regionId: cp.base.regionId,
    faction: null, pop: 40, taille: 1, stock: {}, unrest: 0, murs: 0,
    defense: 0, defenseMax: 0, contrats: [], notables: [], ruine: false,
  });
  Object.assign(cp.base.stock, { ferraille: 500 });
  cp.dernierReel = Date.now();

  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(cp));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(500);

  const texteCp = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(!/n’a pas pu s’afficher/.test(texteCp),
    'l’onglet Base s’affiche sans bandeau d’erreur',
    texteCp.slice(0, 200));
  ok(/COMPTOIR/i.test(texteCp), 'le comptoir a son panneau');
  ok(/Commission/i.test(texteCp), 'et il annonce ce qu’il retient');

  // Le panneau est bas dans l'écran : on l'amène sous les yeux avant la
  // capture, sinon la vignette montre l'entrepôt et rien du comptoir.
  await page.evaluate(() => {
    const b = document.querySelector('[data-a="ordre-sens"]');
    if (b) b.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(CAPTURES, '24-comptoir.png') });

  // Le bon de commande : on choisit le sens, la matière, la quantité, la garde.
  await page.click('[data-a="ordre-sens"][data-r="vente"]');
  await page.waitForTimeout(200);
  await page.click('[data-a="ordre-k"][data-k="ferraille"]');
  await page.waitForTimeout(200);
  await page.click('[data-a="ordre-q"][data-q="200"]');
  await page.waitForTimeout(200);
  await page.click('[data-a="ordre-escorte"][data-r="lourde"]');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const b = document.querySelector('[data-a="passer-ordre"]');
    if (b) b.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(CAPTURES, '25-comptoir-devis.png') });

  const devis = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/Vous touchez/.test(devis), 'le montant est annoncé avant de cliquer');
  ok(/Escorte/.test(devis), 'et ce que la garde coûte aussi');

  const crAvant = await page.evaluate(
    () => { const s2 = JSON.parse(window.__sauvegardeTexte()); return Object.values((s2.player.bourse) || {}).reduce((a, b) => a + b, 0); });
  await page.click('[data-a="passer-ordre"]');
  await page.waitForTimeout(600);
  const apresOrdre = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    return {
      credits: Object.values(s.player.bourse || {}).reduce((a, b) => a + b, 0),
      ferraille: Math.round(s.base.stock.ferraille || 0),
      convois: (s.world.caravanes || []).filter((c) => c.pour === 'joueur').length,
      texte: document.querySelector('#ecran').textContent,
    };
  });
  ok(apresOrdre.convois === 1, 'l’ordre part : un convoi à vous sur la carte',
    JSON.stringify(apresOrdre).slice(0, 160));
  ok(apresOrdre.ferraille === 300, 'la marchandise a quitté l’entrepôt',
    `${apresOrdre.ferraille}`);
  ok(apresOrdre.credits < crAvant, 'et la garde est payée d’avance',
    `${crAvant} → ${apresOrdre.credits}`);
  ok(/En route/.test(apresOrdre.texte), 'le convoi se suit à l’écran');

  // « Les boutons du comptoir sont très très lents. » Ils ne font pourtant que
  // remplir un bon de commande : un sens, une matière, une quantité. Chacun
  // refabriquait tout l'écran Base — l'école, les métiers, les bâtiments, la
  // recherche — pour n'enfoncer qu'un bouton. On clique dans le même tour de
  // boucle que la lecture du compteur : l'horloge du jeu n'a pas le temps de
  // s'intercaler, ce qui se compte est bien l'effet du clic.
  const faitsOrdre = await page.evaluate(() => {
    for (const k of Object.keys(window.__blocsFaits)) window.__blocsFaits[k] = 0;
    document.querySelector('[data-a="ordre-sens"][data-r="achat"]').click();
    return { ...window.__blocsFaits };
  });
  ok(faitsOrdre.comptoir === 1, 'le panneau du comptoir se refait quand on clique dedans',
    JSON.stringify(faitsOrdre));
  ok(!faitsOrdre['école'] && !faitsOrdre['métiers'],
    'et le reste de l’écran Base ne se refabrique pas pour autant',
    JSON.stringify(faitsOrdre));
  const suiteOrdre = await page.evaluate(
    () => document.querySelector('#ecran').textContent);
  ok(/À payer/.test(suiteOrdre), 'le bon de commande a bien changé de sens');
  // Un panneau posé à part reste un panneau : repliable comme ses voisins.
  const pliableApres = await page.evaluate(() => {
    const sec = document.getElementById('bloc-comptoir');
    return !!(sec && sec.classList.contains('pliable')
      && sec.querySelector(':scope > h2.titre[data-a="plier"]'));
  });
  ok(pliableApres, 'et le panneau reposé garde sa poignée de pli');
}

console.log('\n8 nonies quinquies. Donner l’assaut à une ville (IMPLANTATIONS.md, M1)');
{
  // Le verbe existait dans le moteur depuis la veille et restait hors de portée
  // du joueur : aucune action, aucun bouton. « Comment peut-on capturer une
  // ville avec son escouade ? » — on commence par pouvoir y entrer.
  const as = partieAvancee();
  const gAs = groupeActif(as);
  const cible = as.world.colonies.find((c) => !c.ruine && c.faction && !c.avantPoste);
  gAs.regionId = cible.regionId;
  // Une garnison qui ne tiendra pas devant trois vétérans, mais qui tient
  // encore debout après leur passage : on veut pouvoir enchaîner sur le siège,
  // et l'on n'assiège pas une garde déjà à terre.
  cible.defense = 12;
  cible.murs = 0;
  for (const k of Object.keys(cible.stock)) cible.stock[k] = 0;
  cible.stock.alliage = 90;
  for (const m of gAs.membres) {
    m.skills.melee = 95; m.skills.endurance = 95; m.skills.tir = 95;
    for (const part of Object.keys(m.corps)) m.corps[part].pv = m.corps[part].max;
  }
  as.dernierReel = Date.now();

  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(as));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(400);

  const texteAs = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/Coup de main/i.test(texteAs), 'la ville où l’on se tient propose d’y entrer de force',
    texteAs.slice(0, 200));
  ok(/oppose/i.test(texteAs), 'et dit ce qu’elle oppose avant qu’on décide');

  const boutonAs = await page.$('[data-a="assaut"]');
  ok(!!boutonAs, 'le bouton existe');

  const sacAvant = await page.evaluate(() => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const g = s2.player.groupes.find((x) => x.id === s2.player.groupeActif);
    return g.inventaire.alliage || 0;
  });
  await page.evaluate(() => {
    const b = document.querySelector('[data-a="assaut"]');
    if (b) b.scrollIntoView({ block: 'center' });
  });
  await page.screenshot({ path: join(CAPTURES, '26-assaut.png') });
  await page.click('[data-a="assaut"]');
  await page.waitForTimeout(700);

  const apresAs = await page.evaluate((id) => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const g = s2.player.groupes.find((x) => x.id === s2.player.groupeActif);
    const col = s2.world.colonies.find((c) => c.id === id);
    return {
      alliage: g.inventaire.alliage || 0,
      villeAlliage: Math.round(col.stock.alliage || 0),
      drapeau: col.faction,
      texte: document.querySelector('#ecran').textContent,
    };
  }, cible.id);
  ok(apresAs.alliage > sacAvant, 'ce qu’on a pris est dans le sac',
    `${sacAvant} → ${apresAs.alliage}`);
  ok(apresAs.villeAlliage === 90 - (apresAs.alliage - sacAvant),
    'et la ville a perdu exactement ça',
    `ville ${apresAs.villeAlliage}, sac +${apresAs.alliage - sacAvant}`);
  ok(apresAs.drapeau === cible.faction,
    'un coup de main ne prend pas la ville : elle garde son drapeau');

  // Et le second verbe devant une place : s'installer devant elle. Un siège
  // qui n'existe que dans le moteur ne se joue pas — c'est l'erreur de la
  // veille, on ne la refait pas.
  const boutonSiege = await page.$('[data-a="ordre"][data-k="siege"]');
  ok(!!boutonSiege, 'on peut aussi mettre le siège devant la place');
  if (boutonSiege) {
    await page.click('[data-a="ordre"][data-k="siege"]');
    await page.waitForTimeout(500);
    const enSiege = await page.evaluate(() => {
      const s2 = JSON.parse(window.__sauvegardeTexte());
      const g = s2.player.groupes.find((x) => x.id === s2.player.groupeActif);
      return { type: g.ordre.type, cible: g.ordre.cible };
    });
    ok(enSiege.type === 'siege' && enSiege.cible === cible.id,
      'et l’escouade s’installe devant celle-là', JSON.stringify(enSiege));
    const texteSiege = await page.evaluate(() => document.querySelector('#ecran').textContent);
    ok(/Lever le siège/.test(texteSiege), 'on peut le lever d’un geste');
  }
}

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
ok(/bras en tout/i.test(texteMetiers), 'et dit d’où viennent les bras qu’il compte');
// « On voit pas toujours ce qui a besoin de quoi, qui produit quoi. » Le nom de
// la recette dit la transformation ; il fallait aussi dire l'état du garde-manger.
ok(/Consomme\s*:/i.test(texteMetiers), 'chaque chaîne dit ce qu’elle consomme');
ok(/biomasse\s*\d/i.test(texteMetiers), 'avec ce qu’il en reste, pas seulement son nom');
await page.evaluate(() => {
  const b = document.querySelector('[data-a="recette"]');
  if (b) b.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(200);
await page.screenshot({ path: join(CAPTURES, '20b-consignes.png') });
{
  // Et quand elle ne tourne pas, elle dit pourquoi. On coupe la biomasse : c'est
  // ce que l'hydroponie mange.
  //
  // On recharge la page *avant* d'écrire : tant que le jeu tourne, il se
  // sauvegarde par-dessus, et l'on relisait sagement les neuf cents biomasses
  // qu'on croyait avoir mises à zéro.
  const seche = partieAvancee();
  Object.assign(seche.base.batiments, { hydroponie: 2, entrepot: 3 });
  seche.base.pop = 8;
  Object.assign(seche.base.stock, { biomasse: 0, rations: 400, carburant: 200 });
  groupeActif(seche).regionId = seche.base.regionId;
  seche.dernierReel = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(seche));
  const sec = true;
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(400);
  const etatSec = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    return {
      bio: s.base.stock.biomasse,
      recette: (s.base.recettes || {}).hydroponie,
      niv: s.base.batiments.hydroponie,
      texte: document.querySelector('#ecran').textContent,
    };
  });
  ok(sec && /tourne à vide/i.test(etatSec.texte),
    'et une chaîne sans matière le dit, au lieu de ne rien faire en silence',
    `biomasse ${etatSec.bio} · hydroponie niv ${etatSec.niv} · consigne ${etatSec.recette}`);
}
await page.evaluate(() => {
  const b = document.querySelector('[data-a="poste"]');
  if (b) b.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(200);
await page.screenshot({ path: join(CAPTURES, '20-metiers.png') });

const plus = page.locator('[data-a="poste"][data-n="max"]:not([disabled])');
ok(await plus.count() > 0, 'des postes sont ouverts et pourvoyables', `${await plus.count()}`);
await plus.first().click();
await page.waitForTimeout(500);
const apresPostes = await page.evaluate(() => {
  const s = JSON.parse(window.__sauvegardeTexte());
  const p = s.base.postes || {};
  return { total: Object.values(p).reduce((a, b) => a + b, 0), pop: s.base.pop, auto: s.base.autoEmploi };
});
ok(apresPostes.total > 0, 'l’affectation est enregistrée', JSON.stringify(apresPostes));
ok(apresPostes.auto === false, 'et régler un poste prend la main sur l’embauche automatique',
  JSON.stringify(apresPostes));

{
  // Le défaut rapporté à l'écran : « pourquoi à chaque fois que je remplis ces
  // postes ça se revide tout seul ? » Trois causes, dont deux invisibles ;
  // celles-ci vérifient qu'aucune ne revient, et que l'écran explique la
  // troisième au lieu de la subir.
  const survit = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    return JSON.parse(JSON.stringify(s.base.postes));
  });
  // Deux jours de jeu, à la vitesse la plus rapide.
  await page.click('[data-a="vitesse"][data-v="60"]');
  await page.waitForTimeout(3000);
  await page.click('[data-a="onglet"][data-k="base"]');
  await page.waitForTimeout(400);
  const apres = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    return { postes: s.base.postes, temps: s.temps, texte: document.querySelector('#ecran').textContent };
  });
  const identique = Object.keys(survit).every((k) => apres.postes[k] === survit[k]);
  ok(apres.temps > 40, 'le temps a bien passé', `t=${apres.temps}`);
  ok(identique, 'et le réglage des postes n’a pas bougé tout seul',
    `${JSON.stringify(survit)} → ${JSON.stringify(apres.postes)}`);
  await page.click('[data-a="vitesse"][data-v="1"]');
}

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
    const s = JSON.parse(window.__sauvegardeTexte());
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
ecolier.player.bourse = { [monnaieIci(ecolier)]: 9000 };
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
  const s = JSON.parse(window.__sauvegardeTexte());
  const gens = s.player.groupes.flatMap((g) => g.membres);
  return {
    enFormation: gens.filter((c) => c.formation).length,
    credits: Object.values(s.player.bourse || {}).reduce((a, b) => a + b, 0),
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
  const s = JSON.parse(window.__sauvegardeTexte());
  const connues = new Set(Object.keys(s.connaissance.colonies));
  const c = s.world.colonies.find((x) => !connues.has(x.id));
  return c ? c.regionId : null;
});
ok(jamaisVue != null, 'il reste des villes jamais relevées', String(jamaisVue));
if (jamaisVue != null) {
  await page.evaluate((rid) => {
    const cv = document.querySelector('#carte');
    const boite = cv.parentElement;
    const s2 = JSON.parse(window.__sauvegardeTexte());
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

console.log('\n8 quater bis. Par défaut, le monde attend');
{
  // « Plusieurs centaines de jours défilent sous nos yeux sans qu'on ne puisse
  // rien faire » — le propriétaire, août 2026. Par défaut, la partie reprend
  // où on l'a laissée : rien ne défile, et le réglage se change à l'écran.
  const dort = nouvellePartie(20260731, { maintenant: Date.now(), depart: 'ville' });
  const dortTxt = serialiser(dort);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => {
    const s = JSON.parse(txt);
    s.dernierReel = Date.now() - 4 * 3600 * 1000; // des milliers d'heures de jeu
    localStorage.setItem('cendres.save.v1', JSON.stringify(s));
  }, dortTxt);
  await page.reload({ waitUntil: 'networkidle' });
  const avantDort = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte', { timeout: 8000 });
  ok(await page.locator('.rattrapage').count() === 0,
    'aucun écran de rattrapage : rien ne défile au retour');
  const apresDort = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  ok(apresDort - avantDort < 30, 'la partie reprend où on l’avait laissée',
    `${avantDort} → ${apresDort} h`);

  // Et le choix se prend à l'écran, dans le panneau des sauvegardes.
  await page.click('#barre-haut [data-a="modale"][data-m="sauvegardes"]');
  await page.waitForTimeout(400);
  const choix = await page.locator('[data-a="temps-hors-ligne"]').count();
  ok(choix === 2, 'le panneau propose les deux temps hors ligne', `${choix} boutons`);
  await page.click('[data-a="temps-hors-ligne"][data-v="1"]');
  await page.waitForTimeout(500);
  const allume = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).reglages.rattrapage);
  ok(allume === true, 'et l’allumer se garde dans la partie');
  await page.click('[data-a="temps-hors-ligne"][data-v="0"]');
  await page.waitForTimeout(500);
  const eteint = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).reglages.rattrapage);
  ok(eteint === false, 'et l’éteindre aussi');
  await page.click('[data-a="fermer"]');
  await page.waitForTimeout(250);
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
  // Le mode sous test. Depuis août 2026 le monde attend par défaut : rejouer
  // l'absence est un choix, et c'est CE choix qu'on vérifie ici.
  s.reglages = { rattrapage: true };
  localStorage.setItem('cendres.save.v1', JSON.stringify(s));
}, veilleTxt);
const tAvant = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
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
const tApres = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
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
  // M2 (ALLURE.md) : le retour d'absence est une dépêche, pas un ticket de
  // caisse — la voix de la chronique, en serif.
  const serifRapport = await page.evaluate(() => {
    const el = document.querySelector('#modale .titre');
    return el ? getComputedStyle(el).fontFamily : '';
  });
  ok(/serif/i.test(serifRapport), 'et parle en serif — la voix de la chronique',
    serifRapport);
  await page.screenshot({ path: join(CAPTURES, '14b-rapport.png') });
  await page.click('[data-a="rapport-vu"]');
  await page.waitForTimeout(300);
  ok(await page.locator('#modale').isHidden(), 'et il se referme quand on l’a lu');
  const encore = await page.evaluate(
    () => JSON.parse(window.__sauvegardeTexte()).rapport);
  ok(!encore, 'il ne revient pas au chargement suivant : on l’a lu une fois');
}

await page.click('[data-a="onglet"][data-k="monde"]');
await page.waitForTimeout(300);
ok((await page.evaluate(() => document.querySelector('#ecran').textContent.trim().length)) > 60,
  'le jeu est jouable au sortir du rattrapage');

console.log('\n8 sexties. Changer d’écran remet la lecture en haut');
{
  // `rafraichir` gardait la position de lecture à chaque redessin — utile à
  // ×16, où l'écran se refait plusieurs fois par seconde — mais il la gardait
  // aussi d'un écran à l'autre. Un accueil un peu long, et l'on arrivait sur la
  // carte défilé à trois cents pixels du haut, canvas hors de vue, tous les
  // gestes tombant dans le vide. Le défaut ne s'est vu que parce qu'il a cassé
  // la manœuvre de la carte quatre sections plus haut.
  await page.click('[data-a="onglet"][data-k="journal"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('#ecran').scrollTop = 400; });
  const descendu = await page.evaluate(() => document.querySelector('#ecran').scrollTop);
  ok(descendu > 100, 'on descend dans un écran long', `${descendu} px`);
  await page.click('[data-a="onglet"][data-k="carte"]');
  await page.waitForTimeout(400);
  ok((await page.evaluate(() => document.querySelector('#ecran').scrollTop)) === 0,
    'et l’écran suivant s’ouvre par le haut');
  const hautCarte = await page.evaluate(() => {
    const b = document.querySelector('#carte-boite').getBoundingClientRect();
    return b.top >= 0 && b.height > 100;
  });
  ok(hautCarte, 'la carte est bien dans la vue, pas au-dessus');
}

console.log('\n8 septies. Sauvegardes : plusieurs parties côte à côte');
{
  // Le jeu n'avait qu'une seule sauvegarde, écrasée toutes les cinq secondes :
  // impossible de revenir sur un choix, de comparer deux façons de jouer, ou de
  // garder l'état d'une partie où quelque chose venait de mal tourner. Ce
  // dernier point vaut surtout pendant qu'on écrit le jeu — un défaut qu'on ne
  // sait pas reproduire est un défaut qu'on ne corrige pas.
  // On repart d'une partie vivante plutôt que d'hériter de celle qu'a laissée la
  // section précédente : ce bloc vérifie que l'horloge avance, et une partie
  // terminée ne tique plus. Le contrôle a rougi ainsi — « 5168 → 5168 » — pour
  // une escouade morte trois sections plus haut, ce qui n'avait rien à voir avec
  // les sauvegardes. **Un test doit poser lui-même les conditions qu'il mesure.**
  const vivante = partieAvancee();
  vivante.dernierReel = Date.now();
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('cendres.emp')) localStorage.removeItem(k);
    }
  });
  await page.evaluate((t) => localStorage.setItem('cendres.save.v1', t), serialiser(vivante));
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  const enVie = await page.evaluate(
    () => !JSON.parse(window.__sauvegardeTexte()).fin);
  ok(enVie, 'la partie de départ est bien en cours');

  await page.click('[data-a="modale"][data-m="sauvegardes"]');
  await page.waitForTimeout(300);
  const vide = await page.locator('#modale').innerText();
  ok(/Sauvegardes/i.test(vide), 'le panneau des sauvegardes s’ouvre',
    vide.slice(0, 120).replace(/\n+/g, ' | '));
  ok(/Aucune copie/i.test(vide), 'et il est vide au départ');

  // Plus aucun `prompt` : le nom se lit dans le champ du panneau. C'est ce qui
  // rend la chose utilisable dans une page isolée, où le navigateur ignore les
  // boîtes natives — voir la section « page isolée » plus bas.
  await page.fill('#nom-sauvegarde', 'Essai');
  await page.click('[data-a="enregistrer-emp"]');
  await page.waitForTimeout(400);
  const apres = await page.locator('#modale').innerText();
  ok(/Essai/.test(apres), 'une copie nommée apparaît dans la liste',
    apres.slice(0, 240).replace(/\n+/g, ' | '));
  ok(/vivant/i.test(apres), 'avec de quoi la reconnaître sans l’ouvrir');

  const combien = await page.evaluate(
    () => JSON.parse(localStorage.getItem('cendres.emplacements.v1') || '[]').length);
  ok(combien === 1, 'et elle est bien écrite dans le stockage', `${combien}`);

  // Le vrai test : la partie avance, on recharge la copie, et l'on doit
  // retomber sur l'heure de la copie — pas sur celle d'avant, pas sur celle
  // d'après.
  const tCopie = await page.evaluate(() => {
    const i = JSON.parse(localStorage.getItem('cendres.emplacements.v1'))[0];
    // Les copies aussi partent comprimées : on lit par le crochet d'atelier.
    return JSON.parse(window.__sauvegardeTexte(`cendres.emp.${i.id}`)).temps;
  });
  await page.click('[data-a="fermer"]');
  await page.click('[data-a="vitesse"][data-v="60"]');
  // Plus de cinq secondes : c'est le pas de l'écriture automatique, et lire
  // avant elle donne l'heure d'avant. La première version attendait 2,5 s et
  // relevait deux fois le même chiffre.
  await page.waitForTimeout(7000);
  const tPlusTard = await page.evaluate(() => JSON.parse(
    window.__sauvegardeTexte()).temps);
  ok(tPlusTard > tCopie, 'la partie a avancé depuis la copie',
    `${tCopie} → ${tPlusTard}`);

  await page.click('[data-a="modale"][data-m="sauvegardes"]');
  await page.waitForTimeout(300);
  // Deux temps : le premier clic arme, le second fait. C'est ce qui remplace
  // `confirm`, lequel répond « non » sans rien afficher dans une page isolée.
  await page.click('[data-a="charger-emp"]');
  await page.waitForTimeout(250);
  await page.click('[data-a="charger-emp"]');
  await page.waitForTimeout(700);
  const tRevenu = await page.evaluate(() => JSON.parse(
    window.__sauvegardeTexte()).temps);
  ok(Math.abs(tRevenu - tCopie) < 60,
    'charger une copie ramène la partie à son heure',
    `copie ${tCopie} · partie ${tPlusTard} · après chargement ${tRevenu}`);
  ok(await page.locator('#modale').isHidden(), 'et le panneau se referme');
  await page.screenshot({ path: join(CAPTURES, '15-sauvegardes.png'), fullPage: true });

  // Elles se voient aussi depuis l'accueil : un fichier reçu de quelqu'un doit
  // pouvoir s'ouvrir sans avoir de partie en cours.
  await page.click('[data-a="vitesse"][data-v="1"]');
  await page.reload({ waitUntil: 'networkidle' });
  const accueil = await page.locator('#ecran').innerText();
  ok(/Sauvegardes/i.test(accueil) && /Essai/.test(accueil),
    'l’accueil montre les copies gardées',
    accueil.slice(0, 300).replace(/\n+/g, ' | '));
  ok(/Charger un fichier/i.test(accueil),
    'et propose d’ouvrir un fichier sans partie en cours');
}

console.log('\n8 octies ter. Une partie déjà avancée maigrit en s’ouvrant');
{
  // « Tu es sûr que la sauvegarde s'est adaptée ? » — le propriétaire. La
  // question mérite mieux qu'un oui : on fabrique une partie dont les ruines
  // sont encore grasses (comme la sienne l'était), on l'ouvre, et l'on regarde
  // ce que le jeu ÉCRIT ensuite.
  const grasse = (() => {
    const t = partieAvancee();
    const col = t.world.colonies.find((c) => !c.ruine && (c.notables || []).length);
    col.ruine = true; // une ruine à l'ancienne : elle garde tout son monde
    t.dernierReel = Date.now();
    return t;
  })();
  const idRuine = grasse.world.colonies.find((c) => c.ruine).id;
  const texteGras = serialiser(grasse);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), texteGras);
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(600);
  const apres = await page.evaluate((id) => {
    const s2 = JSON.parse(window.__sauvegardeTexte());
    const r = s2.world.colonies.find((c) => c.id === id);
    return {
      notables: (r.notables || []).length,
      emplois: Object.keys(r.emplois || {}).length,
      stock: Object.values(r.stock || {}).filter((v) => v > 0).length,
      taille: window.__sauvegardeTexte().length,
    };
  }, idRuine);
  ok(apres.notables === 0 && apres.emplois === 0 && apres.stock === 0,
    'la ruine a rendu son personnel, ses emplois et ses stocks', JSON.stringify(apres));
  ok(apres.taille < texteGras.length,
    'et la partie écrite pèse moins que celle qu’on a ouverte',
    `${Math.round(texteGras.length / 1024)} Ko → ${Math.round(apres.taille / 1024)} Ko`);
}

console.log('\n8 octies bis. La compression part dans un fil de côté');
{
  // Le fil du jeu ne doit plus payer la compression : elle se fait ailleurs, et
  // la partie arrive au stockage marquée « CZ1| ». Si le fil de côté meurt ou
  // n'existe pas, le jeu écrit sur place — c'est le repli, pas la règle : ici
  // on vérifie que le chemin normal marche pour de vrai dans un navigateur.
  // L'ordre compte, et il m'a repris : on recharge d'abord (la partie en cours
  // s'écrit sur `pagehide` et écraserait le décor), on pose la sauvegarde, PUIS
  // on recharge encore — sans quoi l'accueil déjà affiché ne propose pas de
  // reprise, et le clic attend un bouton qui n'existe pas.
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), serialiser(partieAvancee()));
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte');
  await page.click('[data-a="vitesse"][data-v="16"]');
  // Deux battements de la minuterie : le premier peut tomber sur un état
  // inchangé, et alors rien ne part au fil.
  await page.waitForTimeout(11000);
  const ecrit = await page.evaluate(() => {
    const brut = localStorage.getItem('cendres.save.v1') || '';
    return { tete: brut.slice(0, 4), ko: Math.round(brut.length / 1024) };
  });
  ok(ecrit.tete === 'CZ1|', 'la partie arrive comprimée au stockage, écrite par le fil de côté',
    `tête « ${ecrit.tete} », ${ecrit.ko} Ko`);
  const relu = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  ok(Number.isFinite(relu) && relu > 0, 'et elle se relit', `heure ${relu}`);
  await page.click('[data-a="vitesse"][data-v="1"]');
  await page.waitForTimeout(300);
}

console.log('\n8 octies. Une sauvegarde qui échoue le dit');
{
  // La pire panne possible est celle qui ne se manifeste qu'au moment où il est
  // trop tard. `sauvegarder` rendait un motif d'échec depuis toujours et
  // personne ne le lisait : on pouvait jouer des heures sur un stockage refusé,
  // fermer l'onglet, et tout perdre sans avoir vu passer le moindre signe.
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-a="nouvelle"]');
  await page.waitForSelector('#carte');
  await page.waitForTimeout(6500);

  await page.click('[data-a="modale"][data-m="sauvegardes"]');
  await page.waitForTimeout(400);
  ok(/s’écrit normalement/i.test(await page.locator('#modale').innerText()),
    'quand tout va bien, le panneau dit que la partie s’écrit');
  await page.click('[data-a="fermer"]');

  // On sabote l'écriture comme le ferait un stockage plein. Une garde qu'on n'a
  // jamais vue se déclencher ne prouve rien.
  await page.evaluate(() => {
    const vrai = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k).startsWith('cendres.save')) {
        const err = new Error('plein');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return vrai.call(this, k, v);
    };
  });
  await page.waitForTimeout(6500);
  ok((await page.locator('#barre-haut [data-a="modale"][data-m="sauvegardes"]').innerText()).trim() === '⚠',
    'l’écriture refusée se voit dans la barre du haut, sans rien ouvrir');
  await page.click('#barre-haut [data-a="modale"][data-m="sauvegardes"]');
  await page.waitForTimeout(400);
  const casse = await page.locator('#modale').innerText();
  ok(/ne passe pas/i.test(casse), 'et le panneau nomme la panne',
    casse.slice(0, 140).replace(/\n+/g, ' | '));
  ok(/exportez/i.test(casse), 'et dit quoi faire tant que la partie est ouverte');
  await page.screenshot({ path: join(CAPTURES, '16-sauvegarde-en-echec.png'), fullPage: true });

  // Le ⚠ de la barre n'a pas suffi : le propriétaire a joué des heures sur un
  // stockage refusé, et retrouvé sa partie ramenée en arrière — « plusieurs
  // améliorations que j'avais faites sur ma base ont disparu ». Une écriture
  // qui ne passe pas s'impose désormais SUR l'écran, comme la dévaluation et
  // le siège, et porte son verbe.
  await page.click('[data-a="fermer"]');
  await page.waitForTimeout(400);
  const bandeauSauve = await page.evaluate(() => {
    const b = document.querySelector('#bandeau-sauvegarde');
    if (!b || b.offsetParent === null) return null;
    return {
      texte: b.textContent.replace(/\s+/g, ' ').trim(),
      verbe: b.querySelectorAll('button').length,
      dansVue: b.getBoundingClientRect().top < window.innerHeight,
    };
  });
  ok(!!bandeauSauve && bandeauSauve.dansVue,
    'l’écriture refusée s’impose sur l’écran, sans rien ouvrir',
    bandeauSauve ? bandeauSauve.texte.slice(0, 90) : 'aucun bandeau');
  ok(!!bandeauSauve && bandeauSauve.verbe >= 1,
    'et le bandeau porte son verbe : de quoi mettre la partie à l’abri');
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(400);
  ok(await page.locator('#bandeau-sauvegarde').count() === 1,
    'et il suit sur les autres écrans — tant que ça dure, ça se voit');

  // On rend l'écriture, et l'on repart d'une partie saine pour la suite.
  await page.reload({ waitUntil: 'networkidle' });
}

console.log('\n8 undecies bis. Le jeu enfermé dans une page isolée');
{
  // Le vrai environnement du jeu n'est pas une page pleine : c'est une iframe
  // en bac à sable, et le navigateur y **ignore** `prompt` et `confirm` — le
  // premier rend `null`, le second `false`, sans exception ni message. Nos
  // gestionnaires abandonnaient donc en silence : « enregistrer sur un nouvel
  // emplacement » et « exporter » ne faisaient rien du tout, et toute la suite
  // de tests, qui tourne en page pleine, passait au vert.
  //
  // Toute cette section tourne donc dans le bac à sable, sur le fichier unique.
  const { existsSync: existe2, writeFileSync } = await import('node:fs');
  const seul2 = join(RACINE, 'dist', 'cendres.html');
  if (!existe2(seul2)) {
    console.log('  — dist/cendres.html absent, section ignorée');
  } else {
    writeFileSync(join(RACINE, 'dist', 'cadre.html'),
      '<!doctype html><meta charset="utf-8"><title>bac à sable</title>'
      + '<iframe id="f" sandbox="allow-scripts allow-same-origin" src="cendres.html"'
      + ' style="width:390px;height:844px;border:0"></iframe>');
    const bac = await navigateur.newPage({ viewport: { width: 420, height: 900 } });
    const errBac = [];
    bac.on('pageerror', (err) => errBac.push(err.message));
    await bac.goto(`file://${join(RACINE, 'dist', 'cadre.html')}`, { waitUntil: 'networkidle' });
    const f = bac.frameLocator('#f');
    const dedans = () => bac.frames().find((x) => x.url().includes('cendres.html'));
    await f.locator('[data-a="nouvelle"]').click();
    await f.locator('#carte').waitFor();
    await bac.waitForTimeout(1200);

    // Le bac à sable est bien un bac à sable : sans ça, la section ne
    // vérifierait rien du tout.
    const bloque = await dedans().evaluate(() => window.prompt('x', 'y'));
    ok(bloque === null, 'la page isolée ignore bien `prompt` : le décor est le bon',
      JSON.stringify(bloque));

    await f.locator('[data-a="modale"][data-m="sauvegardes"]').click();
    await bac.waitForTimeout(300);
    await f.locator('#nom-sauvegarde').fill('Ma partie');
    await f.locator('[data-a="enregistrer-emp"]').click();
    await bac.waitForTimeout(500);
    const liste = await dedans().evaluate(
      () => JSON.parse(localStorage.getItem('cendres.emplacements.v1') || '[]'));
    ok(liste.length === 1 && liste[0].nom === 'Ma partie',
      'enregistrer une copie marche, et le nom vient du champ',
      JSON.stringify(liste.map((x) => x.nom)));

    await f.locator('[data-a="exporter-partie"]').click();
    await bac.waitForTimeout(600);
    const txt = await f.locator('#texte-partie').inputValue().catch(() => '');
    // L'export part désormais COMPRIMÉ (marqué CZ1|) : c'est ce qui rend le
    // copier-coller possible au téléphone. Petit, marqué, et pas vide.
    ok(txt.length > 3000 && (txt.startsWith('CZ1|') || txt.trim().startsWith('{')),
      'exporter donne la partie — comprimée, donc collable',
      `${(txt.length / 1024).toFixed(0)} Ko, tête « ${txt.slice(0, 4)} »`);

    await f.locator('[data-a="suppr-emp"]').first().click();
    await bac.waitForTimeout(300);
    const arme = (await f.locator('[data-a="suppr-emp"]').first().innerText()).trim();
    ok(arme === 'Confirmer', 'supprimer demande confirmation sur le bouton lui-même', arme);
    await f.locator('[data-a="suppr-emp"]').first().click();
    await bac.waitForTimeout(400);
    const reste = await dedans().evaluate(
      () => JSON.parse(localStorage.getItem('cendres.emplacements.v1') || '[]').length);
    ok(reste === 0, 'et le second clic supprime pour de bon', `${reste} restant(s)`);

    ok(errBac.length === 0, 'aucune erreur dans la page isolée', errBac.join(' | '));
    await bac.close();
  }
}

console.log('\n8 ter. Un drapeau né en cours de partie s’affiche');
{
  // Chantier FACTIONS-NEUVES, N9. Le moteur sait fabriquer des drapeaux ; il
  // restait à vérifier que l'écran sait les montrer. Les 39 lectures de
  // `FACTIONS[clé]` dans `ui.js` ne tournent pas sous Node — c'est ici, et
  // seulement ici, qu'on peut le savoir.
  //
  // Une faction posée dans une sauvegarde, avec une ville et une couleur que
  // `data.js` ignore. Si l'interface lisait encore la table du jeu, la carte
  // afficherait un trou et la console crierait.
  const neuf = nouvellePartie(4242, { maintenant: Date.now(), depart: 'ville' });
  const g = groupeActif(neuf);
  const ville = neuf.world.colonies.find((c) => c.regionId === g.regionId && !c.ruine);
  const ancienne = ville.faction;
  neuf.world.drapeaux.venue = {
    nom: 'La Main Ouverte', court: 'MAIN', pluriel: false,
    datif: 'à la Main Ouverte', genitif: 'de la Main Ouverte',
    couleur: '#c8a24a', devise: 'Ce qu’on donne revient.',
    agression: 0.3, cupidite: 0.4, style: 'commune', biomes: ['friche'],
  };
  neuf.world.factions.venue = {
    key: 'venue', nom: 'La Main Ouverte', tresor: 500, agression: 0.3,
    relations: {}, colonies: [ville.id], capitale: ville.id, humeur: 0,
    prochainConseil: 40, dernierConseil: 0, lois: null,
    masse: 0, cours: 1, gageRef: 0, emissions: 0, bourse: false, dirigeant: null,
  };
  if (ancienne) {
    const a = neuf.world.factions[ancienne];
    a.colonies = a.colonies.filter((x) => x !== ville.id);
  }
  ville.faction = 'venue';
  neuf.world.regions[ville.regionId].controle = 'venue';

  const errNeuf = [];
  page.on('pageerror', (e) => errNeuf.push(e.message));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => {
    localStorage.setItem('cendres.save.v1', txt);
  }, serialiser(neuf));
  await page.click('[data-a="continuer"]');
  await page.waitForTimeout(600);

  const vu = await page.evaluate(() => document.body.textContent);
  ok(vu.includes('La Main Ouverte'),
    'le nom du drapeau neuf apparaît à l’écran');
  ok(!/undefined/.test(vu),
    'et l’écran ne montre pas « undefined » là où il devrait montrer un pays');
  ok(errNeuf.length === 0, 'aucune erreur de page sur un drapeau inconnu du jeu',
    errNeuf.join(' | '));
}

console.log('\n8 vicies quinquies. Les grands moments (M2, ALLURE.md)');
{
  // a) Un chapitre qui tourne pendant qu'on joue se met en scène : plein
  // écran, serif, chiffre romain braise — et un tap le referme.
  const surChapitre = serialiser((() => {
    const t = partieAvancee();
    // Un chapitre périmé depuis longtemps : le premier tick vivant tournera
    // la page (le camp est fondé, l'état raconte autre chose que la
    // poussière), et le moment doit s'imposer.
    t.player.chapitre = { cle: 'poussiere', t: Math.max(0, t.temps - 300) };
    t.vitesse = 60;
    t.dernierReel = Date.now();
    return t;
  })());
  // L'origine d'abord : la section précédente peut avoir laissé la page
  // ailleurs, et un setItem hors de chez nous écrit dans le mauvais stockage.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), surChapitre);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__momentsAuto = false; });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#moment', { timeout: 12000 });
  const mTxt = await page.evaluate(() => document.querySelector('#moment').textContent);
  ok(/Chapitre|chronique/i.test(mTxt), 'le chapitre nouveau s’ouvre en plein écran',
    mTxt.slice(0, 80).replace(/\n+/g, ' | '));
  const mSerif = await page.evaluate(() => {
    const el = document.querySelector('#moment .moment-titre');
    return el ? getComputedStyle(el).fontFamily : '';
  });
  ok(/serif/i.test(mSerif), 'et parle en serif — la voix de la chronique', mSerif);
  await page.screenshot({ path: join(CAPTURES, '21-moment-chapitre.png') });
  await page.click('#moment');
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => !document.querySelector('#moment')), 'un tap le referme');
  const revu = await page.evaluate(() => {
    const s = JSON.parse(window.__sauvegardeTexte());
    const chron = s.journal.filter((x) => x.type === 'chronique');
    return chron.length > 0 && chron[chron.length - 1].momentVu === true;
  });
  ok(revu, 'et il ne reviendra pas : le moment est marqué lu dans la partie');
}
{
  // b) La stèle : un des vôtres tombe pendant qu'on joue, l'écran s'arrête
  // sur lui — nom, métier, cause. Un contrôle de deuil, pas une ligne 13 px.
  const surMort = serialiser((() => {
    const t = partieAvancee();
    const g = groupeActif(t);
    // Un vivant, pas le premier venu : l'historique de la partie peut déjà
    // porter un mort du même nom, et la stèle montrerait l'ancien deuil.
    const c = g.membres.find((x) => x.etat !== 'mort');
    c.etat = 'mort';
    c.pv = 0;
    // Déjà compté : sans ça, le premier combat du groupe ré-inscrirait ce
    // mort au mémorial (« tombé face à… ») et la stèle montrerait l'autre
    // inscription. Le décor imite ce que `combatContre` aurait fait.
    c._compte = true;
    // Le fait est déjà au journal et au mémorial, daté du prochain tick : la
    // mise en scène (UI) se déclenche sur ce qui arrive en jouant, et c'est
    // le seul déclencheur qu'un décor sait dater à coup sûr.
    t.memorial.push({
      nom: c.nom, archetype: c.archetypeNom, cause: 'mort en route',
      lieu: 'les Dalles', t: t.temps + 1, meilleure: 'mêlée 12',
    });
    t.journal.push({ type: 'mort', texte: `${c.nom} est mort en route.`, important: true, t: t.temps + 1 });
    t.vitesse = 60;
    t.dernierReel = Date.now();
    return t;
  })());
  // On recharge d'abord, puis on injecte : la partie en cours sauvegarde sur
  // `pagehide` et écraserait le décor. Même piège que partout dans ce fichier.
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), surMort);
  await page.evaluate(() => { window.__momentsAuto = false; });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#moment', { timeout: 12000 });
  const sTxt = await page.evaluate(() => document.querySelector('#moment').textContent);
  ok(/resté en route|est mort/i.test(sTxt) && /mort en route/.test(sTxt),
    'la stèle donne le nom, le métier et la cause', sTxt.slice(0, 100).replace(/\n+/g, ' | '));
  await page.screenshot({ path: join(CAPTURES, '22-moment-stele.png') });
  await page.click('#moment');
  await page.waitForTimeout(250);
  // À ×60 un autre moment peut suivre immédiatement — c'est la file qui
  // marche. Ce qu'on vérifie : CELUI-LÀ est fermé, pas « plus rien ».
  ok(await page.evaluate((avant) => {
    const m = document.querySelector('#moment');
    return !m || m.textContent !== avant;
  }, sTxt), 'un tap referme la stèle');
}
{
  // b bis) « Quand il y a un écran pour dire que quelqu'un est mort, le temps
  // continue à tourner en fond ? et du coup tout le monde meurt à la suite,
  // on est obligé de voir défiler tous les écrans de mort à la suite sans
  // rien pouvoir faire ? » — le propriétaire. La stèle confisque l'entrée :
  // tant qu'elle est ouverte, l'horloge cesse de consommer le monde. On
  // ferme, on agit, PUIS ça repart. La règle « le temps continue même quand
  // tout le monde est mort » n'est pas touchée : elle vaut quand on a les
  // mains — ici, on ne les a pas.
  const surMort2 = serialiser((() => {
    const t = partieAvancee();
    const g = groupeActif(t);
    const c = g.membres.find((x) => x.etat !== 'mort');
    c.etat = 'mort';
    c.pv = 0;
    c._compte = true;
    t.memorial.push({
      nom: c.nom, archetype: c.archetypeNom, cause: 'mort en route',
      lieu: 'les Dalles', t: t.temps + 1, meilleure: 'mêlée 12',
    });
    t.journal.push({ type: 'mort', texte: `${c.nom} est mort en route.`, important: true, t: t.temps + 1 });
    t.vitesse = 60;
    t.dernierReel = Date.now();
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), surMort2);
  // Sans quoi le harnais-joueur-pressé referme la stèle en 200 ms et l'on
  // mesure un écran déjà fermé.
  await page.evaluate(() => { window.__momentsAuto = false; });
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#moment', { timeout: 12000 });
  // Premier relevé APRÈS un cycle de sauvegarde (5 s) : la sauvegarde reflète
  // alors l'état gelé, pas un reste d'avant l'ouverture.
  await page.waitForTimeout(5500);
  const tA = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  await page.waitForTimeout(6000);
  const tB = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  ok(tB === tA, 'la stèle ouverte, l’horloge cesse de consommer le monde — à ×60',
    `${tA} → ${tB}`);
  // Fermer UNE stèle peut en ouvrir une autre (la file), qui gèle à son tour :
  // c'est la règle. On rend donc la main au joueur pressé du harnais, qui
  // referme toute la file — et le temps doit repartir.
  await page.evaluate(() => { window.__momentsAuto = true; });
  await page.waitForTimeout(6500);
  const tC = await page.evaluate(() => JSON.parse(window.__sauvegardeTexte()).temps);
  ok(tC > tB, 'la file refermée, le temps repart', `${tB} → ${tC}`);
}
{
  // c) Le siège se voit de partout : un bandeau tant que ça dure, pas une
  // ligne de journal qu'on rate en regardant son sac.
  const surSiege = serialiser((() => {
    const t = partieAvancee();
    t.base.pop = 20; // la reconnaissance en demande 18
    t.base.batiments.halle = Math.max(1, t.base.batiments.halle || 0);
    const rec = reconnaitreAvantPoste(t, () => {});
    if (!rec) throw new Error('décor : l’avant-poste n’a pas pu être reconnu');
    t.world.armees.push({
      id: 'aSiege', rngEtat: 424242, faction: 'hexa', regionId: t.base.regionId,
      force: 140, forceMax: 140, cible: t.base.colonieId, route: [], etape: 0,
      progres: 0, etat: 'siege', ravitaillement: 4000, impayees: 0,
    });
    t.vitesse = 1; // le bandeau se lit sur l'état, pas besoin que ça tourne
    t.dernierReel = Date.now();
    return t;
  })());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((txt) => localStorage.setItem('cendres.save.v1', txt), surSiege);
  await page.click('[data-a="continuer"]');
  await page.waitForSelector('#carte', { timeout: 8000 });
  await page.waitForTimeout(400);
  const vuSiege = await page.evaluate(() => document.querySelector('#ecran').textContent);
  ok(/siège/i.test(vuSiege), 'le bandeau de siège se lève sur l’écran de carte', vuSiege.slice(0, 90));
  await page.click('[data-a="onglet"][data-k="escouade"]');
  await page.waitForTimeout(400);
  ok(/siège/i.test(await page.evaluate(() => document.querySelector('#ecran').textContent)),
    'et il suit sur les autres écrans — tant que ça dure, ça se voit');
  await page.screenshot({ path: join(CAPTURES, '23-bandeau-siege.png') });
}

console.log('\n8 vicies sexies. La carte-affiche (G1, ALLURE.md)');
{
  // En fin de suite, exprès : posé en tête, ce décor décalait la fenêtre de
  // mesure du garde « ce qu'on lit reste sous les yeux » sur un orage de
  // guerre à ×60 — on ne touche pas à un garde pour faire passer un décor,
  // on déplace le décor. Partie fraîche, la carte du premier écran.
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('cendres.save.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('#graine', 'kenshi');
  await page.click('[data-a="nouvelle"]');
  await page.waitForSelector('#carte', { timeout: 5000 });
  await page.waitForTimeout(400);
  // La carte est 60 % du premier écran : c'est elle qui décide si le jeu a
  // l'air fait ou fait maison. Deux exigences mesurables : l'inexploré n'est
  // plus un aplat noir, et une case découverte porte une vraie matière.
  const g1 = await page.evaluate(() => {
    const c = document.querySelector('#carte');
    const g = c.getContext('2d');
    const s = JSON.parse(window.__sauvegardeTexte());
    const CELL = c.width / s.world.largeur;
    const lit = (r) => {
      const d = g.getImageData(Math.round(r.x * CELL) + 1, Math.round(r.y * CELL) + 1,
        Math.max(4, Math.floor(CELL) - 2), Math.max(4, Math.floor(CELL) - 2)).data;
      const v = new Set();
      for (let i = 0; i < d.length; i += 4) v.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return v.size;
    };
    const inconnue = s.world.regions.find((r) => !r.decouvert);
    const connue = s.world.regions.find((r) => r.decouvert && !r.colonie);
    return { inconnue: inconnue ? lit(inconnue) : 99, connue: connue ? lit(connue) : 99 };
  });
  ok(g1.inconnue >= 6, 'l’inexploré n’est plus un aplat : un monde sous la cendre',
    `${g1.inconnue} tons`);
  ok(g1.connue >= 8, 'une case découverte porte une vraie matière',
    `${g1.connue} tons`);
}

console.log('\n9. Fichier unique ouvert en file://');
const { existsSync } = await import('node:fs');
const chemin = join(RACINE, 'dist', 'cendres.html');
if (!existsSync(chemin)) {
  console.log('  — dist/cendres.html absent (node tools/bundle.js), section ignorée');
} else {
  const seul = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  const errSeul = [];
  seul.on('pageerror', (e) => errSeul.push(e.message));
  // Les polices (Q1, ALLURE.md) sont la seule ressource externe autorisée, en
  // lien non bloquant : hors ligne, leur échec de chargement est attendu et ne
  // dit rien du jeu. Tout autre échec de ressource reste une erreur.
  seul.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (/^Failed to load resource/.test(m.text()) && /fonts\.(googleapis|gstatic)\.com/.test(url)) return;
    errSeul.push(m.text());
  });
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
