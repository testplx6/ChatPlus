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
import { mkdirSync, existsSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  recenser, elasticite, planchers, significatif, asymetrique, METRIQUES,
  moyenne, ecarts, moyennes, ecartsDe,
} from './cartographie.js';
import { srcDeRevision } from './revision.js';

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
  const eco = await import(pathToFileURL(join(src, 'economy.js')).href);
  let eco2 = { auditer: () => [] };
  try { eco2 = await import(pathToFileURL(join(src, 'monnaie.js')).href); } catch (e) { /* témoin */ }
  return { sim, data, eco, eco2 };
}

/**
 * La balance physique d'une ville : ce qu'elle produit contre ce qu'elle
 * consomme, en valeur, par heure. C'est la mesure qui manquait — un monde peut
 * paraître prospère en villes debout tout en vivant d'un déficit permanent que
 * personne ne paie, et cette ligne-là le dit.
 */
function balance({ data, eco }, world, cols) {
  let prod = 0;
  let cons = 0;
  for (const col of cols) {
    const p = eco.productionColonie(world, col);
    const c = eco.consommationColonie(col);
    for (const k of data.COMMODITY_KEYS) {
      prod += (p[k] || 0) * data.COMMODITIES[k].prix;
      cons += (c[k] || 0) * data.COMMODITIES[k].prix;
    }
  }
  return { prod, cons };
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
function jouer({ sim, data, eco, eco2 }, graine, horizon) {
  const t0 = performance.now();
  const s = sim.nouvellePartie(graine);
  const convoisVus = new Set();
  // Les événements par type, comptés au vol. Le journal est borné à 400 entrées
  // et les plus vieilles sautent : à la fin d'une partie de six mille heures,
  // il ne reste que la dernière journée. Sans ce relevé, « combien de villes
  // ont fait défaut » et « combien de créances ont été cédées » ne sont pas
  // mesurables du tout — et ce sont deux cibles du cahier des charges.
  const evts = {};
  for (let t = 0; t < horizon; t++) {
    sim.tick(s);
    const j = s.journal || [];
    for (let i = j.length - 1; i >= 0; i--) {
      if (j[i].t !== s.temps) break;
      evts[j[i].type] = (evts[j[i].type] || 0) + 1;
    }
    const cars = s.world.caravanes || [];
    for (let i = 0; i < cars.length; i++) convoisVus.add(cars[i].id);
  }
  const duree = performance.now() - t0;

  const cols = s.world.colonies.filter((c) => !c.ruine && c.faction);
  const bal = balance({ sim, data }.data ? { data, eco } : { data, eco }, s.world, cols);
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
    prod: Math.round(bal.prod),
    cons: Math.round(bal.cons),
    // Où est l'argent. Un circuit fermé peut être juste et pourtant jammé :
    // si tout s'accumule d'un côté, l'autre n'a plus de quoi acheter et le
    // monde meurt en paraissant équilibré. Ces trois nombres le disent.
    enCaisses: Math.round(cols.reduce((a2, c) => a2 + (c.caisse || 0), 0)),
    enMenages: Math.round(cols.reduce((a2, c) => a2 + (c.menages || 0), 0)),
    enTresors: Math.round(tresors.reduce((a2, v) => a2 + v, 0)),
    // Le crédit : combien de villes doivent, et combien. Sans ces deux nombres
    // on ne sait pas si le mécanisme tourne ou s'il dort.
    endettees: cols.filter((c) => (c.dette || 0) > 1).length,
    // Les cours, et l'écart comptable. Une monnaie qui ne diverge jamais est
    // une étiquette ; un invariant qui dérive est un moteur qui fabrique de
    // l'argent sans le dire.
    cours: data.DIPLO_FACTIONS.map((k) => s.world.factions[k].cours || 1),
    // Les créances rachetées et les villes prises sans une colonne : sans ces
    // deux nombres, on ne sait pas si la conquête par l'argent existe.
    creances: cols.filter((c) => c.cession).length,
    ecart: eco2.auditer(s.world).reduce((a2, x) => a2 + Math.abs(x.ecart), 0),
    // Les paliers de taux directeur qu'on trouve en fin de partie : une loi que
    // personne n'emploie jamais est une loi morte, et ça ne se voit pas
    // autrement.
    paliers: data.DIPLO_FACTIONS.map(
      (k) => ((s.world.factions[k].lois || {}).directeur || 0)),
    // Les villes qui manquent vraiment : moins d'un cinquième de ration par
    // tête. C'est la mesure de la faim, celle que « bien nourries » ne dit pas.
    affamees: cols.filter((c) => (c.stock.rations || 0) < c.pop * 0.2).length,
    dette: Math.round(cols.reduce((a2, c) => a2 + (c.dette || 0), 0)),
    evts,
    // Les monnaies collées au plancher. « Cours < 0,4 » était une cible qui
    // interrogeait une valeur impossible : `coursMin` vaut 0,4, aucun cours ne
    // descend dessous — la cible ne pouvait donc jamais rien vérifier.
    auPlancher: data.DIPLO_FACTIONS.filter(
      (k) => (s.world.factions[k].cours || 1) <= 0.4001).length,
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
async function campagne(configs, graines, horizon, surAvancement) {
  const taches = [];
  for (const c of configs) {
    c.parties = [];
    for (const graine of graines) {
      taches.push({ config: c, tache: { src: c.src, graine, horizon, regles: c.regles } });
    }
  }
  const largeur = Math.max(1, Math.min(availableParallelism() - 1, taches.length));
  let i = 0;
  let faites = 0;
  await Promise.all(Array.from({ length: largeur }, async () => {
    while (i < taches.length) {
      const t = taches[i++];
      t.config.parties.push(await unePartieEnWorker(t.tache));
      if (surAvancement) surAvancement(++faites, taches.length);
    }
  }));
  for (const c of configs) c.parties.sort((a, b) => a.graine - b.graine);
  return configs;
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
    // Ce que le monde produit rapporté à ce qu'il consomme, en valeur. Sous 1,
    // les villes vivent d'un déficit que quelqu'un paie — ou que personne ne
    // paie, ce qui était le cas avant que la monnaie ne circule.
    balance: (som(cfg, 'prod') / Math.max(1, som(cfg, 'cons'))).toFixed(2),
    masse: som(cfg, 'enCaisses') + som(cfg, 'enMenages') + som(cfg, 'enTresors'),
    endettees: som(cfg, 'endettees'),
    cours: (() => {
      const v = cfg.parties.flatMap((p2) => p2.cours);
      return v.length ? `${Math.min(...v).toFixed(2)}–${Math.max(...v).toFixed(2)}` : '—';
    })(),
    ecart: Math.round(som(cfg, 'ecart')),
    creances: som(cfg, 'creances'),
    affamees: `${som(cfg, 'affamees')} (${Math.round(som(cfg, 'affamees') / Math.max(1, som(cfg, 'villes')) * 100)} %)`,
    paliers: [...new Set(cfg.parties.flatMap((p2) => p2.paliers))]
      .sort((a4, b4) => a4 - b4).map((x) => `${Math.round(x * 100)}`).join('/'),
    dette: som(cfg, 'dette'),
    auPlancher: som(cfg, 'auPlancher'),
    evts: cfg.parties.reduce((a, p) => {
      for (const [k, v] of Object.entries(p.evts || {})) a[k] = (a[k] || 0) + v;
      return a;
    }, {}),
    ou: `${Math.round(som(cfg, 'enCaisses') / 1000)}k/${Math.round(som(cfg, 'enMenages') / 1000)}k/${Math.round(som(cfg, 'enTresors') / 1000)}k`,
    usParTick: Math.round(med(cfg.parties.map((p) => p.usParTick))),
  };
}

const COLONNES = [
  ['nom', 'config', 18], ['villes', 'villes', 7], ['pop', 'pop', 8],
  ['nourries', 'nourries', 8], ['ecrasees', 'écrasées', 8],
  ['tresorMed', 'trésor méd', 10], ['fauchees', '<2500', 6],
  ['caisseMed', 'caisse méd', 10], ['bourses', 'bourses', 7],
  ['accords', 'accords', 7], ['convois', 'convois', 8],
  ['guerres', 'guerres', 7], ['balance', 'prod/cons', 9],
  ['masse', 'masse', 9], ['ou', 'caisses/ménages/trésors', 22],
  ['endettees', 'endettées', 9], ['affamees', 'affamées', 11],
  ['cours', 'cours', 11], ['ecart', 'écart', 6], ['creances', 'créances', 9],
  ['paliers', 'taux %', 12],
  ['usParTick', 'µs/tick', 7],
];

function afficher(lignes) {
  console.log(COLONNES.map(([, titre, l]) => titre.padStart(l)).join('  '));
  for (const ligne of lignes) {
    console.log(COLONNES.map(([cle, , l]) => String(ligne[cle]).padStart(l)).join('  '));
  }
}

// ---------------------------------------------------------------------------
// La cartographie : chaque levier, deux fois, contre une référence
// ---------------------------------------------------------------------------

const BAS = 0.7;
const HAUT = 1.4;
const PLACEBO = 1.0001;
const PLACEBOS = 8;
/** Leviers joués entre deux écritures du journal de reprise. */
const PAQUET = 15;
const JOURNAL = join(JEU, '.banc', 'cartographie.json');

/** Le journal de reprise. Changer de graines ou d'horizon le repart de zéro. */
function ouvrirJournal(graines, horizon) {
  const signature = `${graines.join(',')} × ${horizon} h`;
  if (existsSync(JOURNAL)) {
    const j = JSON.parse(readFileSync(JOURNAL, 'utf8'));
    if (j.signature === signature) return j;
    console.log(`journal écarté : il portait « ${j.signature} », on joue « ${signature} ».`);
  }
  return { signature, ref: null, leviers: {}, placebos: {} };
}

function ecrireJournal(j) {
  mkdirSync(dirname(JOURNAL), { recursive: true });
  writeFileSync(JOURNAL, JSON.stringify(j));
}

const pc = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1).replace('.', ',')} %` : '—');
const el = (x) => (x === null || !Number.isFinite(x) ? '—' : x.toFixed(2).replace('.', ','));

/** Tous les modules du moteur, importés une fois. `main.js` touche le DOM. */
async function tousLesModules(src) {
  const modules = {};
  const illisibles = [];
  for (const f of readdirSync(src).filter((n) => n.endsWith('.js')).sort()) {
    try {
      modules[f.slice(0, -3)] = await import(pathToFileURL(join(src, f)).href);
    } catch (e) {
      illisibles.push(f);
    }
  }
  return { modules, illisibles };
}

/** Une passe de configurations, avec l'avancement et le temps restant. */
async function jouerConfigs(configs, graines, horizon) {
  const t0 = performance.now();
  let dernier = -1;
  await campagne(configs, graines, horizon, (faites, sur) => {
    const part = Math.floor(faites / sur * 20);
    if (part === dernier) return;
    dernier = part;
    const ecoule = (performance.now() - t0) / 1000;
    process.stdout.write(`\r  ${String(Math.round(faites / sur * 100)).padStart(3)} % — `
      + `${Math.round(ecoule)} s, reste ~${Math.round(ecoule * (sur / faites - 1))} s   `);
  });
  console.log(`\r  ${Math.round((performance.now() - t0) / 1000)} s${' '.repeat(30)}`);
}

/**
 * La campagne de cartographie et son document.
 *
 * Une configuration de référence, quelques placebos qui mesurent le chaos, puis
 * deux points par levier. Les graines sont les mêmes partout : la comparaison
 * est appariée, ce qui est la seule façon de lire un effet dans un monde où
 * changer un dix-millième de constante fait déjà diverger la trajectoire.
 */
async function cartographier(graines, horizon, max) {
  const { modules, illisibles } = await tousLesModules(SRC);
  const { leviers, ecartes } = recenser(modules);
  const retenus = max ? leviers.slice(0, max) : leviers;
  const journal = ouvrirJournal(graines, horizon);

  // Première passe : la référence, puis les deux points de chaque levier, par
  // paquets — et le journal est écrit après chaque paquet.
  //
  // Mille neuf cent soixante-quinze configurations, c'est des heures de
  // machine, et une machine qui s'endort emportait tout : la première tentative
  // est morte à 5 % sans laisser une ligne. Une campagne qui ne survit pas à une
  // coupure n'est pas un outil, c'est un pari. Relancer la même commande reprend
  // maintenant où elle en était.
  if (!journal.ref) {
    const c = [{ nom: 'référence', src: SRC, regles: [] }];
    await jouerConfigs(c, graines, horizon);
    journal.ref = moyennes(c[0].parties);
    ecrireJournal(journal);
  }
  const ref = journal.ref;

  const aFaire = retenus.filter((l) => !journal.leviers[`${l.module}.${l.chemin.join('.')}`]);
  const deja = retenus.length - aFaire.length;
  console.log(`${retenus.length} leviers`
    + `${deja ? ` — ${deja} déjà au journal, ${aFaire.length} à jouer` : ''}`
    + ` — passe 1 : ${aFaire.length * 2} configurations, `
    + `${aFaire.length * 2 * graines.length} parties de ${horizon} h.`);
  for (let i = 0; i < aFaire.length; i += PAQUET) {
    const lot = aFaire.slice(i, i + PAQUET);
    const configs = [];
    for (const l of lot) {
      for (const [cote, facteur] of [['bas', BAS], ['haut', HAUT]]) {
        configs.push({
          nom: `${l.module}.${l.chemin.join('.')} ${cote}`, src: SRC, role: cote, levier: l,
          regles: [{ module: l.module, chemin: l.chemin, valeur: l.valeur * facteur }],
        });
      }
    }
    process.stdout.write(`  paquet ${Math.floor(i / PAQUET) + 1}/${Math.ceil(aFaire.length / PAQUET)} `);
    await jouerConfigs(configs, graines, horizon);
    for (const l of lot) {
      journal.leviers[`${l.module}.${l.chemin.join('.')}`] = {
        valeur: l.valeur,
        bas: moyennes(configs.find((c) => c.role === 'bas' && c.levier === l).parties),
        haut: moyennes(configs.find((c) => c.role === 'haut' && c.levier === l).parties),
      };
    }
    ecrireJournal(journal);
  }

  // Deuxième passe : les placebos, et il faut les choisir après coup.
  //
  // Un placebo sur une constante que le moteur ne lit jamais ne mesure rien —
  // le monde ne bouge pas d'un habitant, le plancher tombe à zéro, et le moindre
  // frémissement devient « significatif ». C'est le pire sens dans lequel une
  // carte puisse se tromper, et le premier essai est tombé dedans : les huit
  // placebos étaient tirés à intervalle régulier dans une liste triée par nom de
  // fichier, donc tous dans le même coin du moteur.
  //
  // On sait maintenant lesquels remuent le monde. Les placebos vont sur les plus
  // remuants, un par objet exporté pour couvrir des mécanismes différents.
  const remuants = retenus.map((l) => {
    const j = journal.leviers[`${l.module}.${l.chemin.join('.')}`];
    const e = { ...ecartsDe(ref, j.bas), ...ecartsDe(ref, j.haut) };
    return { l, remue: Math.max(...Object.values(e).map((x) => Math.abs(x) || 0)) };
  }).filter((x) => x.remue > 0).sort((a, b) => b.remue - a.remue);
  const vus = new Set();
  const choisis = remuants.filter((x) => !vus.has(`${x.l.module}.${x.l.objet}`)
    && vus.add(`${x.l.module}.${x.l.objet}`))
    .slice(0, PLACEBOS);
  const manquants = choisis.filter((x) => !journal.placebos[`${x.l.module}.${x.l.chemin.join('.')}`]);
  console.log(`passe 2 : ${choisis.length} placebos (×${PLACEBO}) sur les leviers `
    + `les plus remuants — le plancher de bruit${manquants.length ? '' : ' (au journal)'}.`);
  if (manquants.length) {
    const configs = manquants.map((x) => ({
      nom: `placebo ${x.l.chemin.join('.')}`, src: SRC, role: 'placebo', levier: x.l,
      regles: [{ module: x.l.module, chemin: x.l.chemin, valeur: x.l.valeur * PLACEBO }],
    }));
    await jouerConfigs(configs, graines, horizon);
    for (const c of configs) {
      journal.placebos[`${c.levier.module}.${c.levier.chemin.join('.')}`] = moyennes(c.parties);
    }
    ecrireJournal(journal);
  }

  // Le plancher de bruit. Sans lui aucun chiffre plus bas ne veut rien dire.
  const mesuresPlacebo = choisis
    .map((x) => journal.placebos[`${x.l.module}.${x.l.chemin.join('.')}`])
    .filter(Boolean).map((m) => ecartsDe(ref, m));
  const sol = planchers(mesuresPlacebo);
  const bougent = mesuresPlacebo.filter((e) => Object.values(e).some((x) => Math.abs(x) > 0)).length;
  if (!bougent) {
    console.log('⚠ aucun placebo n’a fait diverger le monde : le plancher vaut zéro '
      + 'et la carte ne distingue plus un effet d’un frémissement.');
  }

  const lignes = [];
  for (const l of retenus) {
    const cle = `${l.module}.${l.chemin.join('.')}`;
    const j = journal.leviers[cle];
    const eb = ecartsDe(ref, j.bas);
    const eh = ecartsDe(ref, j.haut);
    const effets = [];
    for (const [m, nom] of METRIQUES) {
      const sb = significatif(eb[m], sol[m]);
      const sh = significatif(eh[m], sol[m]);
      if (!sb && !sh) continue;
      const e = [
        sb ? elasticite(ref[m], j.bas[m], BAS - 1) : null,
        sh ? elasticite(ref[m], j.haut[m], HAUT - 1) : null,
      ];
      effets.push({
        m, nom, ecartBas: eb[m], ecartHaut: eh[m], elBas: e[0], elHaut: e[1],
        force: Math.max(Math.abs(e[0] || 0), Math.abs(e[1] || 0)),
        asym: asymetrique({ bas: sb ? eb[m] : 0, haut: sh ? eh[m] : 0 }),
      });
    }
    effets.sort((a, b) => b.force - a.force);
    lignes.push({ cle, valeur: l.valeur, effets });
  }

  ecrireCarte({
    lignes, sol, ref, graines, horizon, ecartes, illisibles, retenus, leviers,
    placebos: choisis.map((x) => `${x.l.module}.${x.l.chemin.join('.')}`), bougent,
  });
  const morts = lignes.filter((x) => !x.effets.length);
  console.log(`\nCARTOGRAPHIE.md écrit — ${lignes.length - morts.length} leviers vivants, `
    + `${morts.length} sans effet mesurable.`);
  return { lignes, sol };
}

/** Le document. Il doit se lire seul, par quelqu'un qui n'a pas joué la campagne. */
function ecrireCarte({
  lignes, sol, ref, graines, horizon, ecartes, illisibles, retenus, leviers,
  placebos, bougent,
}) {
  const rev = execFileSync('git', ['-C', DEPOT, 'rev-parse', '--short', 'HEAD'],
    { encoding: 'utf8' }).trim();
  const vivants = lignes.filter((x) => x.effets.length);
  const morts = lignes.filter((x) => !x.effets.length);
  const t = [];
  t.push('# La carte des leviers');
  t.push('');
  t.push('Ce que chaque constante du moteur commande, et de combien. Document');
  t.push('**produit par la mesure** — il se régénère, il ne se modifie pas à la main :');
  t.push('');
  t.push('```');
  t.push('node tools/banc.js --cartographie');
  t.push('```');
  t.push('');
  t.push(`Révision \`${rev}\` — ${retenus.length} leviers sur ${leviers.length} recensés, `
    + `${graines.length} graines × ${horizon} h.`);
  t.push('');
  t.push('## Comment lire');
  t.push('');
  t.push('Chaque levier est joué deux fois : à **×0,7** et à **×1,4** de sa valeur');
  t.push('actuelle, aux mêmes graines que la référence. L\'**élasticité** est la');
  t.push('variation de la métrique en pour cent pour un pour cent de levier : à +0,50,');
  t.push('doubler la constante augmente la métrique de moitié. Le signe dit le sens.');
  t.push('');
  t.push('Une élasticité n\'est écrite que si l\'écart dépasse le **plancher de bruit**.');
  t.push('Le moteur est déterministe, mais multiplier une constante par 1,0001 — ce qui');
  t.push('ne change rien d\'économique — décale les tirages, et six mille heures plus');
  t.push('tard le monde a divergé quand même. Ce chaos-là est mesuré par des placebos,');
  t.push('métrique par métrique, et tout ce qui reste dessous est déclaré **nul**, pas');
  t.push('« faible ». C\'est pour cette raison qu\'une colonne vide se lit « aucun effet »');
  t.push('et non « effet non détecté ».');
  t.push('');
  t.push(`Les ${placebos.length} placebos portent sur les leviers qui remuent le plus le`);
  t.push('monde, un par module — un placebo posé sur une constante que le moteur ne lit');
  t.push('jamais mesurerait un chaos nul et rendrait tout significatif :');
  t.push('');
  t.push(placebos.map((p) => `\`${p}\``).join(', ') || '*aucun*');
  t.push('');
  if (!bougent) {
    t.push('> ⚠ **Aucun placebo n\'a fait diverger le monde.** Le plancher vaut zéro,');
    t.push('> et tout ce qui suit se lit comme une hypothèse, pas comme une mesure.');
    t.push('');
  }
  t.push('| métrique | référence, par partie | plancher de bruit |');
  t.push('|---|---:|---:|');
  for (const [m, nom] of METRIQUES) {
    const v = ref[m];
    const ecrit = Math.abs(v) < 10 ? v.toFixed(2).replace('.', ',') : String(Math.round(v));
    t.push(`| ${nom} | ${ecrit} | ${pc(sol[m])} |`);
  }
  t.push('');
  t.push('Les valeurs sont **par partie**, moyennées sur les graines — le banc, lui,');
  t.push('additionne les six. Une métrique qui vaut moins de 1 par partie se compare en');
  t.push('unités et non en pour cent : « une faction écrasée de plus » veut dire quelque');
  t.push('chose, « +500 % de factions écrasées » ne veut rien dire. Les élasticités de ces');
  t.push('métriques-là sont énormes par construction et ne se lisent pas comme les autres ;');
  t.push('elles désignent une piste, elles ne la prouvent pas. **Toute trouvaille sur une');
  t.push('petite métrique se confirme par un balayage direct** (`--balaye`) avant d\'être');
  t.push('tenue pour acquise.');
  t.push('');
  t.push('Un plancher élevé n\'est pas un défaut de l\'instrument : c\'est une propriété');
  t.push('du monde. Les factions écrasées se comptent sur les doigts d\'une main — une');
  t.push('de plus ou de moins, et le pourcentage saute. Ces métriques-là exigent');
  t.push('beaucoup avant qu\'on puisse conclure, et c\'est justement ce qu\'il fallait');
  t.push('savoir avant de prétendre les régler.');
  t.push('');
  t.push('## Ce que chaque métrique commande — les leviers, par métrique');
  t.push('');
  for (const [m, nom] of METRIQUES) {
    const dessus = [];
    for (const l of lignes) {
      const e = l.effets.find((x) => x.m === m);
      if (e) dessus.push({ cle: l.cle, valeur: l.valeur, e });
    }
    dessus.sort((a, b) => b.e.force - a.e.force);
    t.push(`### ${nom}`);
    t.push('');
    if (!dessus.length) {
      t.push('**Aucun levier.** Aucune constante plate du moteur ne déplace cette');
      t.push('métrique au-delà du bruit. Ce n\'est pas un réglage à trouver : c\'est une');
      t.push('structure à changer.');
      t.push('');
      continue;
    }
    t.push('| levier | valeur | ×0,7 | ×1,4 | élasticité | |');
    t.push('|---|---:|---:|---:|---:|---|');
    for (const d of dessus.slice(0, 12)) {
      const f = d.e.elHaut !== null ? d.e.elHaut : d.e.elBas;
      t.push(`| \`${d.cle}\` | ${d.valeur} | ${d.e.elBas === null ? '—' : pc(d.e.ecartBas)} `
        + `| ${d.e.elHaut === null ? '—' : pc(d.e.ecartHaut)} | ${el(f)} `
        + `| ${d.e.asym ? 'ne pousse que d\'un côté' : ''} |`);
    }
    if (dessus.length > 12) t.push(`| … | | | | | ${dessus.length - 12} autres |`);
    t.push('');
  }
  t.push('## Les leviers vivants, par force');
  t.push('');
  t.push('| levier | valeur | ce qu\'il commande |');
  t.push('|---|---:|---|');
  for (const l of vivants.slice().sort((a, b) => b.effets[0].force - a.effets[0].force)) {
    t.push(`| \`${l.cle}\` | ${l.valeur} | `
      + `${l.effets.slice(0, 4).map((e) => `${e.nom} ${el(e.elHaut !== null ? e.elHaut : e.elBas)}`).join(', ')} |`);
  }
  t.push('');
  t.push('## Les champs morts');
  t.push('');
  t.push('Ces constantes ne déplacent **aucune** métrique au-delà du bruit, ni à ×0,7');
  t.push('ni à ×1,4. Chacune est une question ouverte : décor assumé, effet trop local');
  t.push('pour ces métriques, ou mécanisme qui ne se déclenche jamais. Ne pas les');
  t.push('régler — les instruire.');
  t.push('');
  for (const l of morts) t.push(`- \`${l.cle}\` = ${l.valeur}`);
  t.push('');
  t.push('## Ce qui n\'est pas sur la carte');
  t.push('');
  t.push('La convention `module.OBJET.champ` du banc n\'atteint pas les objets');
  t.push('imbriqués. Ces champs-là existent et pèsent peut-être lourd — ils ne sont');
  t.push('simplement pas mesurés ici. Le dire est le minimum : une carte muette sur');
  t.push('ses trous se lit comme une carte complète.');
  t.push('');
  const parMotif = {};
  for (const e of ecartes) (parMotif[e.motif] = parMotif[e.motif] || []).push(e.chemin.join('.'));
  for (const [motif, l] of Object.entries(parMotif)) {
    t.push(`- **${motif}** : ${l.length} champs — ${l.slice(0, 10).join(', ')}`
      + `${l.length > 10 ? '…' : ''}`);
  }
  if (illisibles.length) t.push(`- **modules non chargeables hors navigateur** : ${illisibles.join(', ')}`);
  t.push('');
  t.push('La vitesse du tick n\'est pas cartographiée non plus : elle dépend de la');
  t.push('charge de la machine, pas du monde. Elle se mesure au calme, avec ses deux');
  t.push('gardes, par `verifier --complet`.');
  t.push('');
  t.push('Enfin, la carte donne des effets **isolés** : un levier à la fois, tous les');
  t.push('autres au repos. Deux leviers qui se compensent ne se lisent pas dessus.');
  t.push('');
  writeFileSync(join(JEU, 'CARTOGRAPHIE.md'), `${t.join('\n')}`);
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

/**
 * Un nombre, ou rien.
 *
 * `Number('abc')` rend `NaN` sans se plaindre. Le banc jouait alors six parties
 * avec la constante à `NaN` et affichait un tableau — trésor médian 2 458,
 * quatre factions fauchées sur six — d'apparence parfaitement crédible. Une
 * mesure fausse qui a l'air juste est pire que pas de mesure du tout : c'est le
 * seul défaut qu'une relecture adversariale du banc ait trouvé, et c'est le
 * pire qu'un instrument puisse avoir.
 */
function lireNombre(brut, contexte) {
  const v = Number(brut);
  if (!Number.isFinite(v)) {
    throw new Error(`${contexte} : « ${brut} » n'est pas un nombre`);
  }
  return v;
}

async function principal() {
  const args = process.argv.slice(2);
  const option = (nom) => {
    const i = args.indexOf(nom);
    return i >= 0 ? args[i + 1] : null;
  };
  const drapeau = (nom) => args.includes(nom);

  const graines = (option('--graines') || '11,42,77,103,251,909').split(',')
    .map((g) => lireNombre(g, '--graines'));
  const horizon = lireNombre(option('--horizon') || 6000, '--horizon');
  const regles = args.flatMap((a, i) => (a === '--regle' ? [lireRegle(args[i + 1])] : []))
    .map((r) => ({ ...r, valeur: lireNombre(r.brut, `--regle ${r.module}.${r.chemin.join('.')}`) }));

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

  // --cartographie : quel levier commande quoi. Une campagne, un document.
  if (drapeau('--cartographie')) {
    await cartographier(graines, horizon,
      option('--max') ? lireNombre(option('--max'), '--max') : 0);
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
    const nom = (n) => {
      const f = n.callFrame;
      return `${f.functionName || '(anonyme)'}  ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}`;
    };
    const propre = new Map();
    for (const ech of profile.samples) {
      const n = parId.get(ech);
      if (n) propre.set(nom(n), (propre.get(nom(n)) || 0) + 1);
    }
    // Le temps *inclusif* : ce que coûte une fonction avec tout ce qu'elle
    // appelle. Le temps propre seul ne dit pas où couper — un tick à 12 % de
    // temps propre peut porter 60 % du travail, et une feuille à 4 % peut être
    // le seul endroit où l'on gagne quelque chose. Il a fallu chercher où
    // gagner douze pour cent avec un profil plat pour s'en apercevoir.
    const enfants = new Map();
    for (const n of profile.nodes) enfants.set(n.id, n.children || []);
    const propreParId = new Map();
    for (const ech of profile.samples) propreParId.set(ech, (propreParId.get(ech) || 0) + 1);
    const memo = new Map();
    const inclusif = (id, pile) => {
      if (memo.has(id)) return memo.get(id);
      let n = propreParId.get(id) || 0;
      for (const c of enfants.get(id) || []) {
        if (pile.has(c)) continue;            // récursion : on ne compte qu'une fois
        pile.add(c);
        n += inclusif(c, pile);
        pile.delete(c);
      }
      memo.set(id, n);
      return n;
    };
    const total = profile.samples.length;
    const cumul = new Map();
    for (const n of profile.nodes) {
      const v = inclusif(n.id, new Set([n.id]));
      const cle = nom(n);
      cumul.set(cle, Math.max(cumul.get(cle) || 0, v));
    }
    // --profil <motif> : les lignes chaudes d'une fonction, pas seulement son
    // total. Sans ça on lit « tick coûte 11 % » et on va deviner où.
    const motif = args[args.indexOf('--profil') + 1];
    if (motif && !motif.startsWith('--')) {
      const lignes = new Map();
      for (const n of profile.nodes) {
        if (!nom(n).includes(motif) || !n.positionTicks) continue;
        for (const p2 of n.positionTicks) {
          const cle = `${(n.callFrame.url || '').split('/').pop()}:${p2.line}`;
          lignes.set(cle, (lignes.get(cle) || 0) + p2.ticks);
        }
      }
      const tot = [...lignes.values()].reduce((a, b) => a + b, 0);
      console.log(`  lignes chaudes de « ${motif} » — ${tot} échantillons`);
      for (const [cle, n2] of [...lignes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
        console.log(`  ${(n2 / total * 100).toFixed(2).padStart(6)} % du tick   ${cle}`);
      }
      return;
    }
    console.log('  inclusif   propre   fonction');
    const lignes = [...cumul.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
    for (const [cle, inc] of lignes) {
      const pr = propre.get(cle) || 0;
      console.log(`  ${(inc / total * 100).toFixed(1).padStart(7)} % `
        + `${(pr / total * 100).toFixed(1).padStart(7)} %   ${cle}`);
    }
    return;
  }

  // Les configurations : l'état courant, ses variantes balayées, et le témoin.
  const configs = [];
  const balaye = option('--balaye') ? lireRegle(option('--balaye')) : null;
  if (balaye) {
    for (const v of balaye.brut.split(',')
      .map((x) => lireNombre(x, `--balaye ${balaye.chemin.join('.')}`))) {
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
