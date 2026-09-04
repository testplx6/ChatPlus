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
  const monde = await import(pathToFileURL(join(src, 'world.js')).href);
  return { sim, data, eco, eco2, monde };
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
function jouer({ sim, data, eco, eco2, monde }, graine, horizon) {
  const t0 = performance.now();
  const s = sim.nouvellePartie(graine);
  // Attribution M6 : quelle voie du circuit prend chaque tranche. Les
  // révisions témoins d'avant le chantier n'ont pas les compteurs — on garde.
  if (eco.VOIES) {
    Object.assign(eco.VOIES, {
      fine: 0, rapide: 0, simple: 0, reprix: 0, heuresReprix: 0, heuresEstimees: 0,
    });
  }
  const convoisVus = new Set();
  // Les événements par type, comptés au vol. Le journal est borné à 400 entrées
  // et les plus vieilles sautent : à la fin d'une partie de six mille heures,
  // il ne reste que la dernière journée. Sans ce relevé, « combien de villes
  // ont fait défaut » et « combien de créances ont été cédées » ne sont pas
  // mesurables du tout — et ce sont deux cibles du cahier des charges.
  const evts = {};
  // Les deux issues d'une colonne sans solde. Elles partagent le type
  // `colonne` avec la ligne d'attrition, donc le compte par type ne les
  // sépare pas — et ce sont elles, pas le type, que le lot 6 doit calibrer.
  let retournements = 0;
  let debandades = 0;
  // Les drapeaux qui naissent et ceux qui s'éteignent. Le monde n'était pas
  // capable de recomposer sa carte politique ; ces deux nombres disent s'il le
  // fait vraiment ou seulement en théorie.
  let fondations = 0;
  let extinctions = 0;
  // Les villes **reprises par leur créancier**, c'est-à-dire saisies sans qu'une
  // colonne ait marché. C'est le nombre dont `ECONOMIE.md` §13 parle — « 2 à
  // 10 » — et il n'était compté nulle part. La garde `creances` de
  // `CIBLES.json`, elle, compte les villes dont la **dette a changé de main**
  // (`col.cession`), ce qui n'est pas du tout la même chose : une créance
  // rachetée est une menace, une saisie est un drapeau qui tombe. On a comparé
  // pendant des mois une intention et une mesure qui ne parlaient pas du même
  // objet.
  let saisies = 0;
  let aCredit = 0;
  // La plus longue ardoise qu'une colonne ait portée PENDANT la partie, et non
  // à la dernière heure : une colonne impayée finit payée, retournée ou
  // débandée, et l'état final ne garde donc aucune trace de ce qu'elle a
  // enduré. C'est ce compteur-là qui doit franchir `loyauté × COLONNE.patience`
  // pour qu'une compagnie franche se fonde.
  let ardoiseMax = 0;
  for (let t = 0; t < horizon; t++) {
    sim.tick(s);
    for (const a of s.world.armees) {
      if ((a.impayees || 0) > ardoiseMax) ardoiseMax = a.impayees;
    }
    const j = s.journal || [];
    for (let i = j.length - 1; i >= 0; i--) {
      if (j[i].t !== s.temps) break;
      evts[j[i].type] = (evts[j[i].type] || 0) + 1;
      if (j[i].type === 'chantier' && j[i].texte.includes('qui le rendra')) {
        // Les murs que la ville porte elle-même : sans ce compte, on ne sait
        // pas si la voie du crédit sert ou si elle décore.
        aCredit += 1;
      }
      if (j[i].type === 'colonne') {
        if (j[i].texte.includes('retourné sa veste')) retournements += 1;
        else if (j[i].texte.includes('faute de solde')) debandades += 1;
        else if (j[i].texte.includes('plante son propre drapeau')) fondations += 1;
      } else if (j[i].type === 'faction' && j[i].texte.includes('n’existe plus')) {
        extinctions += 1;
      } else if (j[i].type === 'cession') {
        saisies += 1;
      }
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

  // La carte politique bouge-t-elle vraiment ? « nés » et « morts » comptent
  // les événements du journal, et le journal est borné : ils disent zéro sans
  // qu'on sache si le mécanisme n'a pas tourné ou si sa trace a été perdue.
  // Ces trois nombres-là se lisent sur l'état, pas sur le récit.
  //
  // `zombies` : les pays qui n'ont plus une ville ni une colonne et qui vivent
  // encore, parce que la règle d'extinction exige EN PLUS qu'ils n'aient plus
  // de dirigeant — et un dirigeant, la succession en refait toujours un.
  // `ardoise` : la plus longue ardoise d'une colonne impayée, en heures. C'est
  // le compteur qui doit franchir `loyaute × COLONNE.patience` pour qu'une
  // compagnie franche se fonde ; s'il reste bas, aucun pays ne peut naître.
  const vivantes = Object.keys(s.world.factions).filter(
    (k) => k !== 'essaim' && !s.world.factions[k].morte);
  const zombies = vivantes.filter(
    (k) => !(s.world.factions[k].colonies || []).length
      && !s.world.armees.some((a) => a.faction === k)).length;
  const mortes = Object.keys(s.world.factions).filter(
    (k) => s.world.factions[k].morte).length;
  const ardoise = ardoiseMax;

  const cours = (k) => (k && eco2.coursMonnaie ? eco2.coursMonnaie(s.world, k) : 1);
  // Le territoire (TERRITOIRE.md) : combien de cases portent une couleur, et
  // combien la portent sans qu'aucune ville vivante de ce drapeau soit dessus
  // ou à côté. La seconde doit valoir zéro — le halo n'a de sens qu'accroché
  // aux villes qui le peignent, et une revendication que plus personne ne porte
  // est une couleur qui traîne. Avant la correction : vingt-trois en quinze
  // cents heures.
  const villeTient = (i, faction) => {
    const r = s.world.regions[i];
    if (!r || r.colonie == null) return false;
    const c = s.world.colonies.find((x) => x.id === r.colonie);
    return !!(c && !c.ruine && c.faction === faction);
  };
  const tenues = s.world.regions.filter((r) => r.controle);
  // Une case tenue par des HOMMES présents n'est pas orpheline (TERRITOIRE.md,
  // A2) : elle a quelqu'un pour la porter. Sans cette ligne, la mesure comptait
  // les colonnes en campagne comme des couleurs abandonnées.
  const orphelines = tenues.filter((r) => !villeTient(r.i, r.controle)
    && !(r.garde && r.garde.faction === r.controle)
    && !(r.poste && r.poste.faction === r.controle)
    && !monde.voisins(r.i).some((v) => villeTient(v, r.controle))).length;

  // Le cours d'un pays, pour ramener ses unités en ancien crédit. Une ville
  // sans drapeau bat la monnaie de personne : elle compte pour elle-même.
  return {
    graine,
    tenues: tenues.length,
    orphelines,
    // Les barrages payés sur les pistes : ce que les convois laissent en
    // entrant chez les autres (TERRITOIRE.md, B1). Zéro sur les révisions
    // d'avant, où traverser un pays était gratuit pour tout le monde sauf le
    // joueur.
    barrages: evts.peage || 0,
    // Les cases tenues par des HOMMES et non par une ville (TERRITOIRE.md,
    // A2) : c'est tout ce que l'occupation ajoute à la carte politique.
    gardees: s.world.regions.filter((r) => r.garde && r.garde.pris).length,
    // La structure des routes. `piste` est la trace cumulée du passage réel
    // (`damer`), et le calcul d'itinéraire la relit : moins une case coûte,
    // plus on y passe, moins elle coûte. Si des corridors se forment, ils sont
    // ici — et alors « tenir du territoire » veut dire « tenir une route »,
    // pas « colorier une surface » (TERRITOIRE.md, revue de game master).
    damees: s.world.regions.filter((r) => (r.piste || 0) > 0.5).length,
    // Le trafic qui franchit la Faille : s'il est nul, la carte est coupée en
    // deux mondes et ce n'est plus une barrière, c'est un mur (GEOGRAPHIE.md).
    passages: s.world.regions.filter((r) => r.faille && (r.piste || 0) > 0.2).length,
    // Les ouvrages debout (TERRITOIRE.md, T2) : c'est la mesure qui dit si les
    // pays ont enfin une raison de tenir une route. A2 mesurait zéro.
    postes: s.world.regions.filter((r) => r.poste).length,
    // Ce que les postes ont réellement encaissé, et la part de ceux que
    // personne n'emprunte : c'est la mesure de T3 — un poste qui ne voit rien
    // passer n'est pas un territoire, c'est une dépense.
    peagePoste: Math.round(s.world.regions.reduce(
      (a2, r) => a2 + ((r.poste && r.poste.recu) || 0), 0)),
    postesMorts: s.world.regions.filter((r) => r.poste && !(r.poste.recu > 0)).length,
    // Le marché du droit de passage (TERRITOIRE.md, E2) : combien de pactes
    // l'ouvrent, et ce que les pays ont en tête quand ils vont négocier.
    passages: (s.world.pactes || []).filter((p2) => p2.clauses.includes('passage')).length,
    bloquees: s.world.colonies.filter((c) => c.blocusDit).length,
    // Ce que la carte a retenu de ce qui s'y est passé (GEOGRAPHIE.md, G5).
    traces: s.world.regions.filter((r) => r.trace).length,
    peageDu: Math.round(Object.keys(s.world.factions).reduce((a2, k) => a2
      + Object.values(s.world.factions[k].peages || {}).reduce((x, y) => x + y, 0), 0)),
    corridor: (() => {
      const p = s.world.regions.map((r) => r.piste || 0).sort((a2, b2) => b2 - a2);
      const tot = p.reduce((a2, b2) => a2 + b2, 0);
      if (tot <= 0) return 0;
      const haut = p.slice(0, Math.max(1, Math.round(p.length * 0.05)))
        .reduce((a2, b2) => a2 + b2, 0);
      return Math.round(haut / tot * 100);
    })(),
    villes: cols.length,
    pop: Math.round(cols.reduce((a, c) => a + c.pop, 0)),
    nourries: cols.filter((c) => (c.stock.rations || 0) >= c.pop * 0.5).length,
    caisses: cols.map((c) => Math.round(c.caisse || 0)),
    tresors: tresors.map(Math.round),
    ecrasees,
    zombies,
    mortes,
    ardoise,
    vivants: vivantes.length,
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
    // Et la même somme EN VALEUR. « masse » additionne les unités nominales de
    // pays dont les cours vont de 0,01 à 186 : ce n'est pas une grandeur
    // homogène. Elle enfle dès que les cours divergent, sans qu'un sou ait été
    // créé nulle part — et c'est ce qui m'a fait chercher pendant deux jours
    // une pompe à monnaie dans la diplomatie, alors qu'aucun conseil du monde
    // ne bat monnaie (`emettre` n'a qu'un appelant, et c'est le joueur).
    // Ramenée en ancien crédit — le pivot du bureau de change —, elle dit ce
    // que le monde vaut vraiment.
    valeur: Math.round(
      cols.reduce((a2, c) => a2 + ((c.caisse || 0) + (c.menages || 0)) * cours(c.faction), 0)
      + data.DIPLO_FACTIONS.reduce(
        (a2, k) => a2 + (s.world.factions[k].tresor || 0) * cours(k), 0)),
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
    // Et ce que les gens ont vraiment mangé.
    //
    // `nourries` et `affamees` comptent des **stocks**. Une ville dont les
    // habitants n'ont pas un sou garde un grenier plein et passe pour bien
    // nourrie — si bien que renchérir tout améliore les deux chiffres en
    // affamant le monde. Le piège est déjà écrit noir sur blanc pour
    // `MONNAIE.coursMin` : « plus le plancher est bas, mieux le monde mange et
    // moins il compte de monde ». Sans la satiété, on calibre à l'envers sans
    // le voir. Pondérée par la population : cent villages rassasiés ne
    // compensent pas une capitale qui crève.
    satiete: cols.length
      ? cols.reduce((a2, c) => a2 + (c.satiete === undefined ? 1 : c.satiete) * c.pop, 0)
        / Math.max(1, cols.reduce((a2, c) => a2 + c.pop, 0))
      : 1,
    // Et la queue de la distribution : la moyenne cache une ville sur dix à
    // 0,3 derrière neuf villes à 1,0.
    creve: cols.filter((c) => (c.satiete === undefined ? 1 : c.satiete) < 0.8).length,
    dette: Math.round(cols.reduce((a2, c) => a2 + (c.dette || 0), 0)),
    // Ce que les conseils bâtissent, et ce que la carte en garde
    // (INVESTISSEMENT.md, lot 0). Le premier compte les séances qui ont posé
    // une pierre — `type: 'chantier'` n'a qu'un émetteur, la section 5 du
    // conseil, et le banc ne joue aucun joueur —, le second dit à quoi
    // ressemblent les villes à la fin. Sans les deux, « les pays ne
    // fortifient plus » reste une impression : le journal est borné à 400
    // entrées et n'en garde que la dernière journée.
    chantiers: evts.chantier || 0,
    aCredit,
    murs: cols.length ? cols.reduce((a2, c) => a2 + (c.murs || 0), 0) / cols.length : 0,
    evts,
    // Les monnaies effondrées — cours au dixième de l'ancien crédit ou moins.
    //
    // Cette colonne a compté deux choses avant celle-ci, et les deux étaient
    // fausses de la même façon : « cours < 0,4 » interrogeait une valeur
    // impossible (le plancher valait exactement 0,4), puis « au plancher »
    // comptait les monnaies collées à une borne qui n'existe plus depuis que
    // le lot H l'a levée. Le dixième est le seuil d'ECONOMIE §14 — « au moins
    // une monnaie s'effondre par lot de six parties » — et il est enfin
    // atteignable, donc vérifiable.
    effondrees: data.DIPLO_FACTIONS.filter(
      (k) => (s.world.factions[k].cours || 1) <= 0.1).length,
    armees: (s.world.armees || []).length,
    retournements,
    saisies,
    debandades,
    fondations,
    extinctions,
    drapeaux: Object.keys(s.world.drapeaux || {}).length,
    voies: eco.VOIES ? { ...eco.VOIES } : null,
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
    tenues: som(cfg, 'tenues'),
    orphelines: som(cfg, 'orphelines'),
    barrages: som(cfg, 'barrages'),
    gardees: som(cfg, 'gardees'),
    damees: som(cfg, 'damees'),
    passages: som(cfg, 'passages'),
    bloquees: som(cfg, 'bloquees'),
    traces: som(cfg, 'traces'),
    postes: som(cfg, 'postes'),
    peagePoste: som(cfg, 'peagePoste'),
    postesMorts: som(cfg, 'postesMorts'),
    passages: som(cfg, 'passages'),
    peageDu: som(cfg, 'peageDu'),
    corridor: `${Math.round(med(cfg.parties.map((p2) => p2.corridor)))} %`,
    villes: som(cfg, 'villes'),
    pop: som(cfg, 'pop'),
    nourries: som(cfg, 'nourries'),
    ecrasees: `${som(cfg, 'ecrasees')}/${tresors.length}`,
    zombies: som(cfg, 'zombies'),
    mortes: som(cfg, 'mortes'),
    drapeaux: som(cfg, 'drapeaux'),
    vivants: som(cfg, 'vivants'),
    ardoise: Math.max(...cfg.parties.map((p2) => p2.ardoise)),
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
    valeur: som(cfg, 'valeur'),
    endettees: som(cfg, 'endettees'),
    cours: (() => {
      const v = cfg.parties.flatMap((p2) => p2.cours);
      return v.length ? `${Math.min(...v).toFixed(2)}–${Math.max(...v).toFixed(2)}` : '—';
    })(),
    // Le cours le plus bas atteint, toutes parties confondues. C'est la mesure
    // STABLE de « une économie doit pouvoir s'effondrer » (le propriétaire) :
    // « effondrees » comptait un ÉVÉNEMENT ponctuel et rare, et rendait 3, 1, 1
    // puis 4 sur douze graines selon des réglages qui ne la commandaient pas.
    // Une monnaie qui vaut deux centièmes de ce qu'elle valait, elle, se lit
    // sans ambiguïté et ne dépend pas d'avoir regardé au bon moment.
    coursMin: (() => {
      const v = cfg.parties.flatMap((p2) => p2.cours);
      return v.length ? Number(Math.min(...v).toFixed(3)) : 1;
    })(),
    ecart: Math.round(som(cfg, 'ecart')),
    creances: som(cfg, 'creances'),
    affamees: `${som(cfg, 'affamees')} (${Math.round(som(cfg, 'affamees') / Math.max(1, som(cfg, 'villes')) * 100)} %)`,
    // La satiété se moyenne sur les parties en pondérant par leur population :
    // une graine qui rend un monde de dix mille âmes ne pèse pas comme une qui
    // en rend cent mille.
    satiete: (() => {
      const tot = cfg.parties.reduce((a4, p2) => a4 + p2.pop, 0) || 1;
      return (cfg.parties.reduce((a4, p2) => a4 + p2.satiete * p2.pop, 0) / tot).toFixed(3);
    })(),
    creve: `${som(cfg, 'creve')} (${Math.round(som(cfg, 'creve') / Math.max(1, som(cfg, 'villes')) * 100)} %)`,
    paliers: [...new Set(cfg.parties.flatMap((p2) => p2.paliers))]
      .sort((a4, b4) => a4 - b4).map((x) => `${Math.round(x * 100)}`).join('/'),
    dette: som(cfg, 'dette'),
    chantiers: som(cfg, 'chantiers'),
    aCredit: som(cfg, 'aCredit'),
    // Les murs se moyennent sur les villes, pas sur les parties : une graine
    // qui rend quatre-vingts villes ne pèse pas comme une qui en rend trente.
    murs: (() => {
      const tot = cfg.parties.reduce((a4, p2) => a4 + p2.villes, 0) || 1;
      return (cfg.parties.reduce((a4, p2) => a4 + p2.murs * p2.villes, 0) / tot).toFixed(2);
    })(),
    effondrees: som(cfg, 'effondrees'),
    retournements: som(cfg, 'retournements'),
    saisies: som(cfg, 'saisies'),
    debandades: som(cfg, 'debandades'),
    fondations: som(cfg, 'fondations'),
    extinctions: som(cfg, 'extinctions'),
    evts: cfg.parties.reduce((a, p) => {
      for (const [k, v] of Object.entries(p.evts || {})) a[k] = (a[k] || 0) + v;
      return a;
    }, {}),
    ou: `${Math.round(som(cfg, 'enCaisses') / 1000)}k/${Math.round(som(cfg, 'enMenages') / 1000)}k/${Math.round(som(cfg, 'enTresors') / 1000)}k`,
    // L'attribution M6 : part de chaque voie sur les tranches à dt > 1 (la
    // maille fine est exacte par construction, elle ne se rembourse pas), et
    // les heures que la boucle à reprix rejoue une à une — c'est là que vit
    // le ×1,44. Un témoin d'avant le chantier n'a pas les compteurs : « — ».
    voies: (() => {
      const t = {
        fine: 0, rapide: 0, simple: 0, reprix: 0, heuresReprix: 0, heuresEstimees: 0,
      };
      let vu = false;
      for (const p of cfg.parties) {
        if (!p.voies) continue;
        vu = true;
        for (const k of Object.keys(t)) t[k] += p.voies[k] || 0;
      }
      if (!vu) return '—';
      const tot = Math.max(1, t.rapide + t.simple + t.reprix);
      return `${Math.round(t.rapide / tot * 100)}/${Math.round(t.simple / tot * 100)}`
        + `/${Math.round(t.reprix / tot * 100)} · ${Math.round(t.heuresReprix / 1000)}k h`
        + ` (${Math.round(t.heuresEstimees / 1000)}k est.)`;
    })(),
    usParTick: Math.round(med(cfg.parties.map((p) => p.usParTick))),
  };
}

const COLONNES = [
  ['nom', 'config', 18], ['villes', 'villes', 7], ['pop', 'pop', 8],
  ['tenues', 'cases tenues', 12], ['orphelines', 'orphelines', 10],
  ['barrages', 'barrages', 9], ['gardees', 'gardées', 8],
  ['damees', 'damées', 7], ['passages', 'franchie', 9], ['postes', 'postes', 7], ['peagePoste', 'péages postes', 13],
  ['postesMorts', 'postes morts', 12],
  ['passages', 'francs', 7], ['bloquees', 'bloquées', 9], ['traces', 'traces', 7], ['peageDu', 'péages dus', 11], ['corridor', 'corridor 5 %', 12],
  ['nourries', 'nourries', 8], ['ecrasees', 'écrasées', 8],
  ['tresorMed', 'trésor méd', 10], ['fauchees', '<2500', 6],
  ['caisseMed', 'caisse méd', 10], ['bourses', 'bourses', 7],
  ['accords', 'accords', 7], ['convois', 'convois', 8],
  ['guerres', 'guerres', 7], ['balance', 'prod/cons', 9],
  ['masse', 'masse', 9], ['valeur', 'en crédit', 10],
  ['ou', 'caisses/ménages/trésors', 22],
  ['endettees', 'endettées', 9], ['affamees', 'affamées', 11],
  ['satiete', 'satiété', 8], ['creve', 'à la diète', 11],
  ['cours', 'cours', 11], ['coursMin', 'plus bas', 9],
  ['effondrees', 'effondrées', 10],
  ['ecart', 'écart', 6], ['creances', 'créances', 9],
  ['paliers', 'taux %', 12],
  ['chantiers', 'chantiers', 10], ['aCredit', 'à crédit', 9],
  ['murs', 'murs/ville', 10],
  ['retournements', 'vestes', 7], ['saisies', 'saisies', 8],
  ['debandades', 'débandes', 9],
  ['fondations', 'nés', 5], ['extinctions', 'morts', 6],
  ['vivants', 'pays', 5], ['drapeaux', 'fondés', 7], ['zombies', 'zombies', 7],
  ['mortes', 'éteintes', 8], ['ardoise', 'ardoise', 7],
  ['voies', 'rapide/simple/reprix', 28],
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
// Le niveau de détail : ce qu'il fait à une ville
// ---------------------------------------------------------------------------

const med2 = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

/**
 * Une ville proche du joueur avance heure par heure ; une ville lointaine par
 * tranches de vingt-quatre (`pasColonie`). Les probabilités sont converties par
 * `surDt` pour être équivalentes **en moyenne** — mais rien ne dit que la ville
 * qui en sort est la même. Une première mesure a montré +7,7 % de population et
 * moins d'agitation sous la maille fine, sur douze villes et une graine : un
 * signal, pas une conclusion, et deux de ses chiffres étaient inexploitables
 * pour cause de dénominateur proche de zéro.
 *
 * Deux mesures ici. La première regarde le monde entier, à médianes et en
 * absolu. La seconde **isole la maille de tout le reste** : la même ville,
 * clonée, avancée de vingt-quatre heures d'un côté par tranches d'une heure et
 * de l'autre d'un coup — aucune caravane, aucune guerre, aucun voisin. C'est
 * celle-là qui instruit la cause.
 */
async function mesurerMaille(graines, horizon) {
  const moteur = await chargerMoteur(SRC);
  const { sim, eco } = moteur;
  const climat = await import(pathToFileURL(join(SRC, 'climat.js')).href);
  const rngMod = await import(pathToFileURL(join(SRC, 'rng.js')).href);
  const monde = await import(pathToFileURL(join(SRC, 'world.js')).href);

  console.log('1. Le monde entier — la même ville sous les deux mailles\n');
  const dPop = []; const dUnrest = []; const dRations = []; const dCaisse = [];
  let deboutFin = 0; let deboutGros = 0;
  const X = 4 * 24 + 4; const Y = 13 * 24 + 19;
  for (const g of graines) {
    const jouer2 = (region) => {
      const s = sim.nouvellePartie(g, { maintenant: 0 });
      for (let i = 0; i < horizon; i++) { s.player.groupes[0].regionId = region; sim.tick(s); }
      return s;
    };
    const A = jouer2(X); const B = jouer2(Y);
    for (const [centre, fin, gros] of [[X, A, B], [Y, B, A]]) {
      for (const c0 of A.world.colonies) {
        if (monde.distance(c0.regionId, centre) > 4) continue;
        const f = fin.world.colonies.find((x) => x.id === c0.id);
        const gr = gros.world.colonies.find((x) => x.id === c0.id);
        const vf = f && !f.ruine && f.faction; const vg = gr && !gr.ruine && gr.faction;
        deboutFin += vf ? 1 : 0; deboutGros += vg ? 1 : 0;
        if (!vf || !vg) continue;
        dPop.push(f.pop - gr.pop);
        dUnrest.push(f.unrest - gr.unrest);
        dRations.push((f.stock.rations || 0) - (gr.stock.rations || 0));
        dCaisse.push((f.caisse || 0) - (gr.caisse || 0));
      }
    }
  }
  console.log(`   ${dPop.length} villes appariées, ${graines.length} graines × ${horizon} h`);
  console.log(`   population   médiane ${med2(dPop) >= 0 ? '+' : ''}${Math.round(med2(dPop))} habitants`);
  console.log(`   agitation    médiane ${med2(dUnrest) >= 0 ? '+' : ''}${med2(dUnrest).toFixed(3)}`);
  console.log(`   rations      médiane ${med2(dRations) >= 0 ? '+' : ''}${Math.round(med2(dRations))}`);
  console.log(`   caisse       médiane ${med2(dCaisse) >= 0 ? '+' : ''}${Math.round(med2(dCaisse))}`);
  console.log(`   debout       ${deboutFin} en maille fine, ${deboutGros} en maille grossière`);

  console.log('\n2. La maille seule — même ville clonée, aucun voisin, aucune caravane\n');
  const s = sim.nouvellePartie(graines[0], { maintenant: 0 });
  for (let i = 0; i < 400; i++) sim.tick(s);
  const cond = climat.conditions(s.world, s.temps);
  const villes = s.world.colonies
    .filter((c) => !c.ruine && c.faction && !c.avantPoste).slice(0, 40);

  /**
   * Les cinq grandeurs suivies, chacune avec ses bornes. Les bornes ne sont pas
   * décoratives : **une grandeur collée à sa borne des deux côtés rend un écart
   * nul qui ne prouve rien**, et c'est une erreur que ce banc a commise.
   *
   * Relevé après quarante jours isolés, sur quarante villes : l'agitation est à
   * 1,000 dans trente d'entre elles et à 0 dans neuf, les greniers sont vides
   * dans dix-neuf, les caisses dans quatorze. Les « trois grandeurs identiques
   * au millième » qu'on lisait comme la signature d'un regroupement exact
   * étaient pour l'essentiel des villes saturées comparées à elles-mêmes. On
   * écarte donc, grandeur par grandeur, les villes où les deux côtés sont
   * assis sur la même borne — et on dit combien il en reste.
   */
  const GRANDEURS = {
    pop: { lire: (c) => c.pop, borne: (c) => c.pop <= 25 || c.pop >= c.taille * 900 },
    rations: { lire: (c) => c.stock.rations || 0, borne: (c) => (c.stock.rations || 0) <= 0 },
    unrest: { lire: (c) => c.unrest, borne: (c) => c.unrest <= 0 || c.unrest >= 1 },
    caisse: { lire: (c) => c.caisse || 0, borne: (c) => (c.caisse || 0) <= 0 },
    menages: { lire: (c) => c.menages || 0, borne: (c) => (c.menages || 0) <= 0 },
  };
  const CLES = Object.keys(GRANDEURS);
  const vide = () => {
    const e = Object.fromEntries(CLES.map((k) => [k, []]));
    e.total = 0;
    return e;
  };

  /**
   * Une campagne de clones : chaque ville jouée deux fois quarante jours, la
   * première à la maille `dtA` avec la graine `gA`, la seconde à `dtB` avec
   * `gB`. Empile les écarts (A − B), une valeur par ville et par grandeur.
   *
   * C'est la même fonction qui sert à la mesure et au placebo : `(1, 24)`
   * mesure ce que la maille fait, `(1, 1)` mesure ce que deux tirages honnêtes
   * font. Un placebo qui passerait par un autre chemin de code ne mesurerait
   * pas le même bruit.
   */
  const campagne = (dtA, dtB, gA, gB, e, jours = 40) => {
    for (const c0 of villes) {
      const A = JSON.parse(JSON.stringify(c0));
      const B = JSON.parse(JSON.stringify(c0));
      const rA = new rngMod.Rng(gA); const rB = new rngMod.Rng(gB);
      for (let jour = 0; jour < jours; jour++) {
        const t0 = s.temps + jour * 24;
        for (let h = 0; h < 24; h += dtA) eco.tickColonie(s.world, A, rA, cond, dtA, 0, null, t0 + h);
        for (let h = 0; h < 24; h += dtB) eco.tickColonie(s.world, B, rB, cond, dtB, 0, null, t0 + h);
      }
      e.total += 1;
      for (const [k, g] of Object.entries(GRANDEURS)) {
        if (g.borne(A) && g.borne(B)) continue;
        e[k].push(g.lire(A) - g.lire(B));
      }
    }
    return e;
  };

  /**
   * Un relevé : `REPETITIONS` campagnes de graines différentes, mises en
   * commun. Une seule campagne ne suffit pas — l'écart médian de quarante
   * villes se promène tout seul, et il s'est promené d'exactement l'ordre de
   * grandeur qu'on croyait mesurer. Mettre huit campagnes en commun divise ce
   * vagabondage par la racine de huit sans rien changer à un biais, qui lui ne
   * se moyenne pas.
   *
   * **Les deux côtés tirent sur des graines différentes, y compris pour la
   * mesure.** C'est contre-intuitif et c'est la condition pour que le placebo
   * veuille dire quelque chose : donner la même graine aux deux mailles les
   * corrèle un peu, alors que le placebo, lui, ne peut pas l'être — il
   * rendrait deux villes identiques. On comparerait alors une mesure peu
   * bruitée à un plancher trop haut, et tout passerait « sous le plancher ».
   */
  const REPETITIONS = 8;
  const releve = (dtA, dtB, base) => {
    const e = vide();
    for (let i = 0; i < REPETITIONS; i++) campagne(dtA, dtB, base + i * 2, base + i * 2 + 1, e);
    return e;
  };

  const ecarts2 = releve(1, 24, 12345);

  // Le plancher de bruit. Sans lui, « l'écart tombe à zéro » n'est pas une
  // cible mais une incantation : deux tirages honnêtes ne rendent jamais
  // exactement la même ville, et exiger l'impossible revient à ne rien
  // vérifier. Le placebo compare donc deux mailles FINES — aucun biais de
  // maille possible, rien que le hasard, tout le reste identique au relevé de
  // mesure. On garde le plus grand écart médian qu'il produise sur huit
  // relevés : c'est ce qu'une mesure doit dépasser pour vouloir dire
  // quelque chose.
  const PLACEBOS = 8;
  const plancher = Object.fromEntries(CLES.map((k) => [k, 0]));
  for (let i = 0; i < PLACEBOS; i++) {
    const e = releve(1, 1, 90001 + i * REPETITIONS * 2);
    for (const k of CLES) plancher[k] = Math.max(plancher[k], Math.abs(med2(e[k])));
  }

  const fmt = (v) => (Math.abs(v) < 10 ? v.toFixed(3) : String(Math.round(v)));
  console.log(`   ${villes.length} villes × ${REPETITIONS} graines, 40 jours simulés des deux façons`);
  console.log(`   plancher de bruit : ${PLACEBOS} placebos (deux mailles fines, même protocole)`);
  console.log('   « exploitables » : les villes où les deux côtés ne sont pas sur la même borne\n');
  console.log(`   ${'grandeur'.padEnd(9)} ${'exploitables'.padStart(13)} ${'écart médian'.padStart(13)} `
    + `${'plancher'.padStart(9)}   verdict`);
  for (const k of CLES) {
    const m = med2(ecarts2[k]);
    const dit = Math.abs(m) > plancher[k] ? 'AU-DESSUS' : 'sous le plancher';
    console.log(`   ${k.padEnd(9)} ${`${ecarts2[k].length}/${ecarts2.total}`.padStart(13)} `
      + `${`${m >= 0 ? '+' : ''}${fmt(m)}`.padStart(13)} `
      + `${`±${fmt(plancher[k])}`.padStart(9)}   ${dit}`);
  }

  // -------------------------------------------------------------------------
  // 3. L'erreur locale — la seule mesure qui isole le défaut lui-même
  // -------------------------------------------------------------------------
  //
  // Quarante jours mélangent le défaut de maille avec ce que le chaos en fait
  // ensuite : le signal se noie dans un plancher de ±3, et on peut alors lire
  // n'importe quoi dedans — on l'a fait. UNE journée depuis un état identique
  // ne mélange rien. Le défaut s'y lit à trois décimales, et sa marque de
  // fabrique est qu'il **croît avec le pas** : un biais de tranche est
  // proportionnel à la tranche, un hasard ne l'est pas. D'où la colonne par pas
  // plutôt qu'un chiffre unique.
  //
  // **Et le nombre de villes qui portent chaque chiffre**, comme la partie 2 le
  // fait depuis §1 bis. Sans lui, une médiane prise sur douze villes se lit
  // comme une médiane prise sur quarante, et on a déjà payé cette erreur-là une
  // fois : elle avait fait conclure « rations identiques au millième » alors que
  // dix-neuf greniers vides tiraient la médiane à zéro.
  console.log('\n3. L\'erreur locale — une journée, depuis un état identique\n');
  console.log(`   ${'pas'.padStart(4)} ${CLES.map((k) => k.padStart(10)).join(' ')}`);
  const portees = [];
  for (const dt of [1, 2, 4, 8, 24]) {
    const e = vide();
    // Même graine des deux côtés : sur une seule journée, il n'y a pas de
    // trajectoire à décorréler, et la ligne `pas 1` sert de témoin — deux
    // mailles fines identiques doivent rendre exactement zéro partout.
    campagne(1, dt, 9, 9, e, 1);
    portees.push([dt, CLES.map((k) => (e[k] || []).length)]);
    console.log(`   ${String(dt).padStart(4)} `
      + CLES.map((k) => `${med2(e[k]) >= 0 ? '+' : ''}${fmt(med2(e[k]))}`.padStart(10)).join(' '));
  }
  console.log('\n   sur combien de villes chaque médiane porte :\n');
  console.log(`   ${'pas'.padStart(4)} ${CLES.map((k) => k.padStart(10)).join(' ')}`);
  for (const [dt, n] of portees) {
    console.log(`   ${String(dt).padStart(4)} ${n.map((v) => String(v).padStart(10)).join(' ')}`);
  }

  // --- Le plancher de bruit de cette mesure-là, qui lui manquait.
  //
  // La partie 2 a le sien depuis §1 bis, et la leçon y est écrite : « un écart
  // sans plancher ne dit rien ». La partie 3 n'en avait pas, et sa ligne
  // `pas 1` — deux mailles fines à graine identique — ne prouve que le
  // déterminisme, pas l'absence de bruit.
  //
  // Or il y en a, et il est irréductible : `combienDeFois` tire `dt` fois par
  // appel, donc deux mailles ne consomment pas le flux d'aléa au même endroit,
  // donc un départ tombe d'un côté et pas de l'autre. Une ville de deux
  // habitants de moins mange moins, et son grenier reste plus plein. C'est
  // exactement ce que §5 dit déjà : « deux tirages honnêtes ne rendent jamais
  // la même ville, et exiger l'impossible, c'est ne rien vérifier ».
  //
  // Le placebo : deux mailles **fines** à graines différentes. Aucun défaut de
  // regroupement possible, rien que le flux d'aléa.
  const placebos = [];
  for (const g of [10, 11, 12, 13, 14, 15, 16, 17]) {
    const e = vide();
    campagne(1, 1, 9, g, e, 1);
    placebos.push(e);
  }
  console.log('\n   plancher de bruit — huit placebos, deux mailles fines à graines différentes\n');
  console.log(`   ${'    '} ${CLES.map((k) => k.padStart(10)).join(' ')}`);
  const plancher3 = {};
  for (const k of CLES) {
    plancher3[k] = Math.max(...placebos.map((e) => Math.abs(med2(e[k]))));
  }
  console.log(`   ${'±   '} ${CLES.map((k) => fmt(plancher3[k]).padStart(10)).join(' ')}`);

  // --- La médiane, ouverte : chaque ville avec son écart de population ET son
  // écart de rations, côte à côte.
  //
  // Ajouté le jour où la partie 3 a rendu deux chiffres qui ne se recollaient
  // pas : population **sous** son plancher (−2 pour ±3) et rations à dix-sept
  // fois le leur (−0,173 pour ±0,010). Or le témoin négatif — départs et
  // naissances gelés — prouvait que les rations ne bougent QUE par la
  // population. Une divergence dans le bruit qui produit un écart hors bruit :
  // l'un des deux chiffres ne disait pas ce qu'on croyait, et une médiane ne
  // permet pas de savoir lequel. La distribution, si : elle sépare les villes
  // où la population a divergé (l'écart de rations y est du bruit propagé) de
  // celles où elle n'a pas bougé (l'écart y est un vrai défaut de maille).
  {
    const paires = [];
    for (const c0 of villes) {
      const A = JSON.parse(JSON.stringify(c0));
      const B = JSON.parse(JSON.stringify(c0));
      const rA = new rngMod.Rng(9); const rB = new rngMod.Rng(9);
      for (let h = 0; h < 24; h += 1) eco.tickColonie(s.world, A, rA, cond, 1, 0, null, s.temps + h);
      eco.tickColonie(s.world, B, rB, cond, 24, 0, null, s.temps);
      if ((A.stock.rations || 0) <= 0 && (B.stock.rations || 0) <= 0) continue;
      paires.push({
        nom: c0.nom,
        dPop: A.pop - B.pop,
        dRations: (A.stock.rations || 0) - (B.stock.rations || 0),
      });
    }
    const memePop = paires.filter((x) => x.dPop === 0).map((x) => x.dRations);
    const popDiverge = paires.filter((x) => x.dPop !== 0).map((x) => x.dRations);
    console.log('\n   la médiane des rations, ouverte — dt 24, une journée, même graine\n');
    console.log(`   population identique   ${String(memePop.length).padStart(3)} villes` 
      + `   écart médian de rations ${fmt(med2(memePop))}`);
    console.log(`   population divergée    ${String(popDiverge.length).padStart(3)} villes`
      + `   écart médian de rations ${fmt(med2(popDiverge))}`);
    const pires = paires.slice().sort((a, b) => Math.abs(b.dRations) - Math.abs(a.dRations));
    console.log('\n   les cinq pires, pour voir qui porte le chiffre :');
    for (const x of pires.slice(0, 5)) {
      console.log(`     ${x.nom.padEnd(20)} pop ${x.dPop >= 0 ? '+' : ''}${x.dPop}`
        + `   rations ${x.dRations >= 0 ? '+' : ''}${x.dRations.toFixed(2)}`);
    }
  }

  // 4. Le comptage des événements — l'instrument qui manquait à M2 et M3
  // -------------------------------------------------------------------------
  //
  // Les deux mesures ci-dessus ne voient pas le défaut des **comptes**, et
  // `MAILLE.md` le dit depuis des semaines : l'écart de population sur quarante
  // jours est sous le plancher de bruit, et l'erreur locale sur une journée est
  // nulle parce que l'événement est trop rare pour se voir en un jour. Le défaut
  // est réel — il se démontre au tableau — mais aucun instrument ne le voyait,
  // et c'est ce qui bloquait M2.
  //
  // Celui-ci le voit, et **sans plancher de bruit** : on ne compare pas deux
  // trajectoires, on compte ce qui arrive. Un départ fait perdre un à trois
  // habitants, une naissance en fait gagner zéro à deux ; on somme donc les
  // mouvements de population en valeur absolue sur un mois, sous les deux
  // mailles, à partir du même état. Vingt-quatre chances horaires contre une
  // seule chance de tranche : la maille grossière doit en produire moins, et de
  // combien est exactement ce qu'on cherche.
  //
  // Aucun appariement de trajectoire n'est nécessaire — on mesure un volume,
  // pas une différence de ville à ville. Le bruit se moyenne sur quarante villes
  // et huit graines ; le biais, lui, ne se moyenne pas.
  console.log('\n4. Les comptes — départs et naissances sur un mois\n');
  const volume = (dt, base) => {
    let total = 0;
    for (let rep = 0; rep < REPETITIONS; rep++) {
      for (const c0 of villes) {
        const c = JSON.parse(JSON.stringify(c0));
        const r = new rngMod.Rng(base + rep);
        for (let jour = 0; jour < 30; jour++) {
          for (let h = 0; h < 24; h += dt) {
            const avant = c.pop;
            eco.tickColonie(s.world, c, r, cond, dt, 0, null, s.temps + jour * 24 + h);
            total += Math.abs(c.pop - avant);
          }
        }
      }
    }
    return total / (REPETITIONS * villes.length);
  };
  const vFin = volume(1, 5150);
  const vGros = volume(24, 5150);
  const ecartV = vFin > 0 ? (vGros - vFin) / vFin : 0;
  console.log(`   maille fine       ${vFin.toFixed(2)} habitants remués par ville et par mois`);
  console.log(`   maille grossière  ${vGros.toFixed(2)}`);
  console.log(`   écart             ${ecartV >= 0 ? '+' : ''}${(ecartV * 100).toFixed(1)} %`
    + `${Math.abs(ecartV) < 0.05 ? '  — sous les cinq pour cent' : '  AU-DESSUS'}`);
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

  // --maille : ce que le niveau de détail fait à une ville. Deux mesures, et la
  // seconde est celle qui instruit la cause.
  if (drapeau('--maille')) {
    await mesurerMaille(graines.slice(0, 3), horizon);
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
