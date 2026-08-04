// Le banc de mesure permanent. Une commande remplace la demi-heure de scripts
// jetables qu'exigeait chaque campagne de mesure.
//
// Ce fichier existe parce qu'une session entière de calibrage a été engloutie
// par son propre outillage : dix scripts écrits à la main dans un répertoire
// temporaire, chacun réinventant les mêmes relevés ; des `git stash` pour
// mesurer le témoin, avec un stash perdu en route ; des balayages joués en
// séquence quand les parties sont indépendantes ; et une mesure de vitesse
// faite pendant que les suites de tests tournaient, qui a fait accuser le
// mauvais coupable. Le banc fait tout cela en une commande, toujours de la
// même façon — et un outil de mesure qui se trompe fait tout mesurer faux,
// d'où `--verif`.
//
//   node tools/banc.js                                  l'état courant, 6 graines
//   node tools/banc.js --temoin 82636d8                 comparé à une révision
//   node tools/banc.js --balaye economy.CAISSE.marge=0.06,0.10,0.15
//   node tools/banc.js --regle economy.CAISSE.marge=0.10
//   node tools/banc.js --profil                         où part le temps
//   node tools/banc.js --verif                          le banc se vérifie
//   node tools/banc.js --sauve monde.json               un monde joué, pour l'UI
//   node tools/banc.js --graines 11,42 --horizon 3000 --json
//
// Les parties sont jouées en parallèle (worker_threads) : chaque worker a son
// propre isolat V8, donc son propre graphe de modules — les mutations de
// constantes d'une configuration ne fuient jamais dans une autre.
//
// `--balaye` et `--regle` ne touchent que des champs d'objets exportés
// (`CAISSE.marge`, `SUREXTENSION.seuil`…). C'est une convention voulue : une
// constante à calibrer vit dans un objet mutable, sinon il faudrait réécrire le
// fichier pour l'essayer — et une constante qu'on ne peut pas balayer finit
// choisie à vue.

import {
  Worker, isMainThread, parentPort, workerData,
} from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const JEU = resolve(ICI, '..');
const DEPOT = resolve(JEU, '..');
const SRC = join(JEU, 'src');

// ---------------------------------------------------------------------------
// Une partie, et ce qu'on en relève
// ---------------------------------------------------------------------------

async function chargerMoteur(src) {
  const sim = await import(pathToFileURL(join(src, 'sim.js')).href);
  const data = await import(pathToFileURL(join(src, 'data.js')).href);
  return { sim, data };
}

/** Applique des règles `module.OBJET.champ = valeur` au graphe de modules. */
async function appliquerRegles(src, regles) {
  for (const r of regles) {
    const mod = await import(pathToFileURL(join(src, `${r.module}.js`)).href);
    let cible = mod;
    for (let i = 0; i < r.chemin.length - 1; i++) {
      cible = cible[r.chemin[i]];
      if (cible === undefined) {
        throw new Error(`${r.module}.js n'exporte pas ${r.chemin.slice(0, i + 1).join('.')}`);
      }
    }
    if (typeof cible !== 'object' || cible === null) {
      throw new Error(
        `${r.module}.${r.chemin.join('.')} n'est pas balayable : une constante à `
        + `calibrer vit dans un objet exporté mutable (voir CAISSE dans economy.js), `
        + `pas dans un « export const » scalaire.`
      );
    }
    cible[r.chemin[r.chemin.length - 1]] = r.valeur;
  }
}

/**
 * Joue une partie et relève les métriques standard — celles que chaque
 * campagne de cette session a recalculées à la main, réunies une fois pour
 * toutes. En ajouter une ici la donne à toutes les mesures futures.
 */
function jouer({ sim, data }, graine, horizon) {
  const t0 = performance.now();
  const s = sim.nouvellePartie(graine);
  const convoisVus = new Set();
  for (let t = 0; t < horizon; t++) {
    sim.tick(s);
    const cars = s.world.caravanes || [];
    for (let i = 0; i < cars.length; i++) convoisVus.add(cars[i].id);
  }
  const duree = performance.now() - t0;

  const cols = s.world.colonies.filter((c) => !c.ruine && c.faction);
  const tresors = data.DIPLO_FACTIONS.map((k) => s.world.factions[k].tresor);
  const ecrasees = data.DIPLO_FACTIONS.filter(
    (k) => s.world.factions[k].colonies.length <= 2
  ).length;

  return {
    graine,
    villes: cols.length,
    pop: Math.round(cols.reduce((a, c) => a + c.pop, 0)),
    nourries: cols.filter((c) => (c.stock.rations || 0) >= c.pop * 0.5).length,
    caisses: cols.map((c) => Math.round(c.caisse || 0)),
    tresors: tresors.map(Math.round),
    ecrasees,
    bourses: data.DIPLO_FACTIONS.filter((k) => s.world.factions[k].bourse).length,
    accords: (s.world.accords || []).length,
    convois: convoisVus.size,
    guerres: (s.world.guerres || []).length,
    armees: (s.world.armees || []).length,
    duree: Math.round(duree),
    usParTick: duree / horizon * 1000,
  };
}

// ---------------------------------------------------------------------------
// Worker : une partie par tâche, isolée
// ---------------------------------------------------------------------------

if (!isMainThread) {
  const { src, graine, horizon, regles } = workerData;
  await appliquerRegles(src, regles);
  const moteur = await chargerMoteur(src);
  parentPort.postMessage(jouer(moteur, graine, horizon));
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function unePartieEnWorker(tache) {
  return new Promise((resoudre, rejeter) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: tache });
    w.once('message', (m) => { resoudre(m); w.terminate(); });
    w.once('error', rejeter);
  });
}

/** Toutes les parties de toutes les configurations, à plat, N à la fois. */
async function campagne(configs, graines, horizon) {
  const taches = [];
  for (const c of configs) {
    c.parties = [];
    for (const graine of graines) {
      taches.push({ config: c, tache: { src: c.src, graine, horizon, regles: c.regles } });
    }
  }
  const largeur = Math.max(1, Math.min(availableParallelism() - 1, taches.length));
  let i = 0;
  await Promise.all(Array.from({ length: largeur }, async () => {
    while (i < taches.length) {
      const t = taches[i++];
      t.config.parties.push(await unePartieEnWorker(t.tache));
    }
  }));
  for (const c of configs) c.parties.sort((a, b) => a.graine - b.graine);
  return configs;
}

// ---------------------------------------------------------------------------
// Le témoin : une révision extraite une fois, en cache
// ---------------------------------------------------------------------------

/**
 * `git archive` plutôt qu'un stash ou un worktree : rien à remettre en place,
 * rien qui puisse se perdre, et le moteur n'a aucune dépendance hors de src/.
 */
function srcDeRevision(rev) {
  const complet = execFileSync('git', ['-C', DEPOT, 'rev-parse', '--short', rev],
    { encoding: 'utf8' }).trim();
  const abri = join(JEU, '.banc');
  const cache = join(abri, complet);
  if (!existsSync(join(cache, 'sim.js'))) {
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(abri, '.gitignore'), '*\n');
    // Le tar de src/ dépasse le méga-octet du tampon par défaut.
    const tar = execFileSync('git', ['-C', DEPOT, 'archive', complet, 'game/src'],
      { maxBuffer: 64 * 1024 * 1024 });
    execFileSync('tar', ['-x', '--strip-components=2', '-C', cache], { input: tar });
  }
  return { src: cache, rev: complet };
}

// ---------------------------------------------------------------------------
// Agrégats et affichage
// ---------------------------------------------------------------------------

const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const som = (cfg, champ) => cfg.parties.reduce((s, p) => s + p[champ], 0);

function agreger(cfg) {
  const tresors = cfg.parties.flatMap((p) => p.tresors);
  const caisses = cfg.parties.flatMap((p) => p.caisses);
  return {
    nom: cfg.nom,
    villes: som(cfg, 'villes'),
    pop: som(cfg, 'pop'),
    nourries: som(cfg, 'nourries'),
    ecrasees: `${som(cfg, 'ecrasees')}/${tresors.length}`,
    tresorMed: Math.round(med(tresors)),
    fauchees: `${tresors.filter((t) => t < 2500).length}/${tresors.length}`,
    caisseMed: caisses.length ? Math.round(med(caisses)) : 0,
    bourses: som(cfg, 'bourses'),
    accords: som(cfg, 'accords'),
    convois: som(cfg, 'convois'),
    guerres: som(cfg, 'guerres'),
    usParTick: Math.round(med(cfg.parties.map((p) => p.usParTick))),
  };
}

const COLONNES = [
  ['nom', 'config', 18], ['villes', 'villes', 7], ['pop', 'pop', 8],
  ['nourries', 'nourries', 8], ['ecrasees', 'écrasées', 8],
  ['tresorMed', 'trésor méd', 10], ['fauchees', '<2500', 6],
  ['caisseMed', 'caisse méd', 10], ['bourses', 'bourses', 7],
  ['accords', 'accords', 7], ['convois', 'convois', 8],
  ['guerres', 'guerres', 7], ['usParTick', 'µs/tick', 7],
];

function afficher(lignes) {
  console.log(COLONNES.map(([, titre, l]) => titre.padStart(l)).join('  '));
  for (const ligne of lignes) {
    console.log(COLONNES.map(([cle, , l]) => String(ligne[cle]).padStart(l)).join('  '));
  }
}

// ---------------------------------------------------------------------------
// Ligne de commande
// ---------------------------------------------------------------------------

function lireRegle(texte) {
  const [chemin, brut] = texte.split('=');
  const morceaux = chemin.split('.');
  if (morceaux.length < 3 || brut === undefined) {
    throw new Error(`règle illisible : « ${texte} » (attendu module.OBJET.champ=valeur)`);
  }
  return { module: morceaux[0], chemin: morceaux.slice(1), brut };
}

async function principal() {
  const args = process.argv.slice(2);
  const option = (nom) => {
    const i = args.indexOf(nom);
    return i >= 0 ? args[i + 1] : null;
  };
  const drapeau = (nom) => args.includes(nom);

  const graines = (option('--graines') || '11,42,77,103,251,909').split(',').map(Number);
  const horizon = Number(option('--horizon') || 6000);
  const regles = args.flatMap((a, i) => (a === '--regle' ? [lireRegle(args[i + 1])] : []))
    .map((r) => ({ ...r, valeur: Number(r.brut) }));

  // --sauve : un monde joué, prêt à charger dans l'UI. Zéro attente à l'écran.
  if (option('--sauve')) {
    const moteur = await chargerMoteur(SRC);
    await appliquerRegles(SRC, regles);
    const s = moteur.sim.nouvellePartie(graines[0]);
    for (let t = 0; t < horizon; t++) moteur.sim.tick(s);
    writeFileSync(option('--sauve'), JSON.stringify(s));
    console.log(`${option('--sauve')} — graine ${graines[0]}, ${horizon} h.`);
    return;
  }

  // --profil : où part le temps, par fonction. Thread principal, une graine.
  if (drapeau('--profil')) {
    const { Session } = await import('node:inspector/promises');
    await appliquerRegles(SRC, regles);
    const moteur = await chargerMoteur(SRC);
    const s = moteur.sim.nouvellePartie(graines[0]);
    for (let t = 0; t < 500; t++) moteur.sim.tick(s);
    const sess = new Session();
    sess.connect();
    await sess.post('Profiler.enable');
    await sess.post('Profiler.setSamplingInterval', { interval: 100 });
    await sess.post('Profiler.start');
    for (let t = 0; t < 3000; t++) moteur.sim.tick(s);
    const { profile } = await sess.post('Profiler.stop');
    const parId = new Map(profile.nodes.map((n) => [n.id, n]));
    const compte = new Map();
    for (const ech of profile.samples) {
      const n = parId.get(ech);
      if (!n) continue;
      const f = n.callFrame;
      const cle = `${f.functionName || '(anonyme)'}  ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}`;
      compte.set(cle, (compte.get(cle) || 0) + 1);
    }
    const total = profile.samples.length;
    for (const [cle, n] of [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      console.log(`  ${(n / total * 100).toFixed(1).padStart(5)} %  ${cle}`);
    }
    return;
  }

  // Les configurations : l'état courant, ses variantes balayées, et le témoin.
  const configs = [];
  const balaye = option('--balaye') ? lireRegle(option('--balaye')) : null;
  if (balaye) {
    for (const v of balaye.brut.split(',').map(Number)) {
      configs.push({
        nom: `${balaye.chemin.join('.')}=${v}`,
        src: SRC,
        regles: [...regles, { ...balaye, valeur: v }],
      });
    }
  } else {
    configs.push({ nom: 'courant', src: SRC, regles });
  }
  if (option('--temoin')) {
    const t = srcDeRevision(option('--temoin'));
    configs.unshift({ nom: `témoin ${t.rev}`, src: t.src, regles: [] });
  }

  const t0 = performance.now();
  await campagne(configs, graines, horizon);
  const total = Math.round((performance.now() - t0) / 100) / 10;

  // --verif : la première configuration, rejouée dans ce thread-ci, doit rendre
  // exactement les mêmes chiffres que son worker. Même graine, même monde —
  // c'est le déterminisme qui fait du banc une preuve et pas une opinion.
  if (drapeau('--verif')) {
    const c = configs[configs.length - 1];
    await appliquerRegles(c.src, c.regles);
    const inline = jouer(await chargerMoteur(c.src), graines[0], horizon);
    const duWorker = c.parties.find((p) => p.graine === graines[0]);
    const nettoyer = ({ duree, usParTick, ...reste }) => reste;
    const pareil = JSON.stringify(nettoyer(inline)) === JSON.stringify(nettoyer(duWorker));
    console.log(pareil
      ? '✓ worker et thread principal rendent le même monde'
      : '✗ DIVERGENCE worker/principal — le banc ne prouve plus rien');
    if (!pareil) process.exitCode = 1;
  }

  if (drapeau('--json')) {
    console.log(JSON.stringify({
      graines, horizon, configs: configs.map((c) => ({ nom: c.nom, agregats: agreger(c), parties: c.parties })),
    }));
    return;
  }
  console.log(`${graines.length} graine(s) × ${horizon} h × ${configs.length} config(s) — ${total} s\n`);
  afficher(configs.map(agreger));
}

if (isMainThread) {
  principal().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
