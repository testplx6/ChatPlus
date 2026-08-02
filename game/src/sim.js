// Orchestration : création de partie, tick horaire, rattrapage du temps passé
// hors ligne. `state.world` est la moitié partagée de l'état (celle qui vivrait
// côté serveur en multijoueur), `state.player` / `state.base` la moitié privée.

import { Rng } from './rng.js';
import { FACTIONS, DIPLO_FACTIONS } from './data.js';
import { genererMonde, decouvrir, colonieParId, nomRegion, distance } from './world.js';
import { makeCharacter, idDepuisRng } from './characters.js';
import { creerBase, tickBase, perdreAvantPoste } from './base.js';
import {
  tickColonie, etalDe, effondrer, faireSecession, faireRevolte, emploisInitiaux,
} from './economy.js';
import { tickClimat, conditions, saison } from './climat.js';
import { tickCaravanes } from './caravanes.js';
import { tickCoffres } from './coffres.js';
import { tickFactions } from './factions.js';
import { tickSquad } from './squad.js';
import { creerLogger } from './events.js';
import { VERSION } from './save.js';
import { groupeVide } from './groupes.js';
import { creerConnaissance, observer, estSurveillee } from './connaissance.js';
import { pourvoirCharges } from './notables.js';
import { creerDirigeant, crediterDirigeant } from './dirigeants.js';
import { tickFormation } from './formation.js';
import { rafraichirPanneaux, tickContrats } from './contrats.js';
import { bancDe } from './recrues.js';
import {
  tickAllegeance, palierBonus, rangDe, estimeEngagement,
} from './allegeance.js';
import { jugerActes, tickCharges } from './influence.js';
import { tickSecteurs } from './secteur.js';
import { tickGeole, tickOrdrePublic } from './justice.js';
import { ouvrirRapport, fermerRapport } from './rapport.js';

/** Durée réelle d'une heure de jeu, à vitesse ×1. */
export const TICK_MS = 10000;
/** Plafond de rattrapage hors ligne, en heures de jeu (environ deux ans). */
export const RATTRAPAGE_MAX = 17000;

export const VITESSES = [1, 4, 16, 60];

/**
 * Tranche d'heures traitée d'un coup pour une colonie. Les colonies avancent
 * par tourniquet plutôt que toutes ensemble à chaque heure : le coût du tick
 * chute d'autant, et l'économie d'une ville n'a pas besoin d'être résolue à
 * l'heure près. Les probabilités sont converties en conséquence — voir `surDt`
 * dans economy.js.
 *
 * Trois, pas quatre : le banc a montré qu'à quatre les stocks des villes
 * fluctuent par paliers assez gros pour que le joueur ne trouve plus toujours de
 * quoi se ravitailler, et la survie tombe de 42 à 31 sur soixante parties. Le
 * gain de performance ne valait pas ça.
 *
 * Ça, c'est près du joueur. Loin, c'est autre chose — voir PAS_LOIN.
 */
export const PAS_COLONIE = 3;

/**
 * Niveau de détail. La carte compte cinquante-quatre villes ; les traiter toutes
 * au pas fin coûterait trois fois le budget d'un tick entier, pour simuler avec
 * une précision horaire des greniers que le joueur ne verra pas de la partie.
 *
 * Une ville proche garde donc le pas fin — c'est là que le joueur achète, vend
 * et regarde les stocks. Au-delà, elle avance par journées. Rien n'est perdu :
 * chaque ville retient l'heure de son dernier passage et rattrape exactement ce
 * qui lui est dû, de sorte que changer de niveau de détail en cours de route
 * (le joueur s'approche, le joueur s'éloigne) ne fabrique ni ne détruit une
 * seule heure de production. Les probabilités, elles, passent par `surDt` :
 * une sécession reste aussi probable sur vingt-quatre heures d'un bloc que sur
 * vingt-quatre heures découpées.
 *
 * Vingt-quatre et non douze : la valeur est calée pour que le nombre de villes
 * traitées par heure reste celui d'avant l'agrandissement — environ cinq —,
 * quelle que soit la taille de la carte.
 */
export const PAS_LOIN = 24;
/** En deçà de cette distance d'un groupe ou de l'avant-poste, on regarde de près. */
export const RAYON_DETAIL = 4;
/** On démarre déjà accéléré : à ×1 il ne se passe visiblement rien. */
export const VITESSE_DEFAUT = 4;

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export function nouvellePartie(seed, opts = {}) {
  const rng = new Rng(seed);
  const world = genererMonde(rng);

  // Où l'on ouvre les yeux.
  //
  // Le jeu commençait dans une ville, et toujours la même faction — quarante
  // parties sur quarante chez les Communes Libres, au motif qu'elles sont les
  // moins hostiles. L'ouverture était donc une constante : même drapeau, même
  // régime, mêmes voisins, et les cinq autres factions n'étaient qu'un décor
  // qu'on découvrait plus tard.
  //
  //   `depart: 'sauvage'` (défaut)  on se réveille dans la poussière, à une ou
  //       deux régions d'une ville. Personne ne vous connaît, personne ne vous
  //       doit rien, et le premier choix de la partie est d'aller voir qui tient
  //       le coin.
  //   `depart: 'ville'`             on démarre chez quelqu'un, qui vous connaît
  //       juste assez pour vous prendre à son service. Le banc s'en sert : il
  //       mesure des trajectoires sur trente parties, et une ouverture stable
  //       lui évite de confondre un changement de règle avec un mauvais tirage.
  //
  // Dans les deux cas, l'estime d'accueil suit le seuil d'enrôlement du drapeau
  // plutôt qu'un nombre fixe : c'est ce qui permet de naître chez une église qui
  // en demande quarante sans que la voie du service se referme d'emblée.
  const accueillantes = world.colonies.filter((c) => c.faction && c.faction !== 'essaim');
  const enVille = opts.depart === 'ville';
  const hote = accueillantes.length ? rng.pick(accueillantes) : rng.pick(world.colonies);
  let regionDepart = hote.regionId;
  if (!enVille) {
    // Une case vide à portée de marche : assez près pour trouver du monde en
    // cherchant, assez loin pour que personne ne vous ait vu arriver.
    const autour = world.regions.filter(
      (r) => !world.colonies.some((c) => c.regionId === r.i)
        && distance(r.i, hote.regionId) >= 1 && distance(r.i, hote.regionId) <= 2);
    if (autour.length) regionDepart = rng.pick(autour).i;
  }

  // On part équipé : sans armure, la première bande de pillards venue
  // liquide l'escouade avant qu'elle ait appris quoi que ce soit.
  const premier = groupeVide(idDepuisRng(rng, 'g'), 'Convoi', regionDepart, 0);
  const depart2 = [
    { archetype: 'ferrailleur', arme: 'machette', armure: 'cuir' },
    { archetype: 'chasseur', arme: 'clous', armure: 'cuir' },
    { archetype: 'medic', arme: 'barre', armure: 'cuir' },
  ];
  for (const d of depart2) premier.membres.push(makeCharacter(rng, d));
  premier.inventaire.rations = 45;
  premier.inventaire.ferraille = 20;
  premier.inventaire.medkit = 2;
  premier.objets = ['machette', 'cuir'];

  const reputation = {};
  for (const k of DIPLO_FACTIONS) reputation[k] = 0;
  // Chez soi, on est connu juste assez pour être pris à leur service. Dans le
  // désert, personne ne vous connaît : c'est tout le sel du départ sauvage.
  if (enVille && hote.faction) reputation[hote.faction] = estimeEngagement(hote.faction) + 2;

  const state = {
    version: VERSION,
    seed,
    rngState: rng.save(),
    temps: 0,
    vitesse: VITESSE_DEFAUT,
    dernierReel: opts.maintenant ?? 0,
    nom: opts.nom || 'Convoi sans nom',
    world,
    player: {
      credits: 450,
      // Les gens et ce qu'ils portent vivent dans les groupes ; le reste, ici.
      groupes: [premier],
      groupeActif: premier.id,
      reputation,
      posture: 'neutre',
      // Comment on se bat quand ça tombe dessus. Voir TACTIQUES dans combat.js :
      // une tactique n'est pas un bonus, c'est un pari sur le terrain, le
      // nombre et les armes qu'on porte.
      tactique: 'ligne',
      politique: {
        recruter: true,
        commercer: true,
        payerPeage: true,
        achever: false,
        viserChefs: false,
        // On s'arrête quand quelqu'un tombe, plutôt que de continuer la route
        // avec un homme sur les bras.
        halte: true,
      },
      contrats: [],
      primes: {},
    },
    base: creerBase(),
    journal: [],
    nonLus: 0,
    stats: {
      ticks: 0,
      combats: 0,
      combatsGagnes: 0,
      defaites: 0,
      recolte: 0,
      creditsGagnes: 0,
      contratsRemplis: 0,
      sitesFouilles: 0,
      distanceParcourue: 0,
      caravanesPillees: 0,
      servicesRendus: 0,
      ordresRemplis: 0,
      // Ce qu'on relira à la fin pour dire qui l'on a été. Voir chronique.js :
      // un compteur qui n'existe pas est un fait qu'on ne pourra pas raconter.
      captifsPris: 0,
      captifsLivres: 0,
      captifsVendus: 0,
      captifsRelaches: 0,
      prerogatives: 0,
      loisPromulguees: 0,
    },
    memorial: [],
    // Ce que le joueur sait du monde, par opposition à ce qui est.
    connaissance: creerConnaissance(0),
    fin: null,
  };
  world.caravanes = [];

  // Les métiers des villes se posent une fois les factions attribuées : la
  // vocation d'un bourg tient à son biome autant qu'à qui le tient. Les charges
  // se pourvoient dans la foulée — une ville a un chef et un armurier dès le
  // premier jour, pas au bout de trois heures de jeu.
  for (const col of world.colonies) {
    col.emplois = emploisInitiaux(world, col, rng);
    pourvoirCharges(col, rng, 0);
  }
  // Et chaque faction a quelqu'un à sa tête dès le premier jour — sauf l'Essaim,
  // qui n'a pas de politique : il déferle. On pose quand même la clé, sinon
  // recharger une partie l'ajoute et l'aller-retour JSON n'est plus exact.
  for (const k of Object.keys(world.factions)) {
    world.factions[k].dirigeant = k === 'essaim' ? null : creerDirigeant(rng, k, 0);
  }

  decouvrir(world, regionDepart, 2);
  observer(state);
  tickClimat(world, 0, rng);
  rafraichirPanneaux(state, rng, 0);
  for (const col of world.colonies) etalDe(world, col, rng, 0);
  state.rngState = rng.save();
  const log = creerLogger(state);
  log({
    type: 'debut',
    texte: enVille
      ? `Le convoi s’arrête à ${hote.nom}. Trois bouches à nourrir, 450 crédits, et un monde `
        + 'qui ne demande rien à personne.'
      : `Le convoi s’arrête en ${nomRegion(world, regionDepart)}. Trois bouches à nourrir, `
        + '450 crédits, et pas un nom que quiconque connaisse ici.',
    important: true,
    regionId: regionDepart,
  });
  return state;
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/** Les régions depuis lesquelles le joueur regarde : ses groupes et sa base. */
function regardsDuJoueur(state) {
  const out = [];
  for (const g of state.player.groupes) {
    if (g.membres.length) out.push(g.regionId);
  }
  if (state.base && state.base.fonde) out.push(state.base.regionId);
  return out;
}

/**
 * La maille de simulation d'une ville : fine près du joueur, large ailleurs.
 * Le décalage par indice évite que toutes les villes lointaines tombent sur la
 * même heure — sinon le tick ferait un pic toutes les douze heures au lieu d'un
 * coût plat.
 */
function pasColonie(yeux, col, i) {
  for (const rid of yeux) {
    if (distance(rid, col.regionId) <= RAYON_DETAIL) return PAS_COLONIE;
  }
  return PAS_LOIN + (i % 5); // 24 à 28 : de quoi étaler la charge sur l'heure
}

/** Fait passer une heure de jeu. */
export function tick(state) {
  const rng = new Rng(state.rngState);
  const ctx = { rng };
  // Tant que le joueur tient la charge de Commandeur quelque part, le conseil
  // de cette faction ne légifère pas : c'est ce que veut dire avoir la charge.
  // Voir `legiferer` dans factions.js.
  for (const g of state.player.groupes) {
    const all = g.allegeance;
    if (all && rangDe(all).index >= 4) { ctx.legislateur = all.faction; break; }
  }
  // Le banc peut geler la législation pour la mesurer par différence.
  if (state.sansLois) ctx.sansLois = true;
  // Ces heures-ci sont rattrapées, pas jouées : le joueur n'était pas là. Ce
  // qui exige une décision de sa part ne doit pas lui être compté pendant ce
  // temps — voir `tickEngagement` dans allegeance.js.
  if (state.absent) ctx.absent = true;
  // Ce qu'il faut faire si une colonne prend l'avant-poste du joueur : le
  // monde ne connaît que sa vitrine, il ne saurait pas démonter le camp.
  ctx.perdreAvantPoste = () => perdreAvantPoste(state, log);
  // Qui a une raison de venir prendre votre ville : ceux qui vous détestent, et
  // ceux à qui vous faites la guerre en portant d'autres couleurs. Les autres
  // savent qu'elle a un propriétaire et regardent ailleurs.
  ctx.rancune = (faction) => {
    if ((state.player.reputation[faction] || 0) <= -20) return true;
    for (const g of state.player.groupes) {
      const all = g.allegeance;
      if (all && all.faction !== faction
        && state.world.guerres.some(
          (w) => (w.a === all.faction && w.b === faction)
            || (w.b === all.faction && w.a === faction))) return true;
    }
    return false;
  };
  const log = creerLogger(state);

  state.temps += 1;
  state.stats.ticks += 1;

  // Le climat d'abord : tout le reste s'y adosse.
  const changement = tickClimat(state.world, state.temps, rng);
  if (changement) log(changement);
  const climat = conditions(state.world, state.temps);
  ctx.climat = climat;

  // Passage de saison : ça se remarque.
  const sPrec = saison(state.temps - 1);
  if (sPrec.key !== climat.saison.key) {
    log({
      type: 'saison',
      texte: `${climat.saison.def.nom}. ${climat.saison.def.texte}`,
      important: true,
    });
  }

  // Le monde ensuite. Chaque ville rattrape ce qui lui est dû depuis son dernier
  // passage, à la maille que sa distance justifie. C'est 62 % du coût du tick,
  // et rien ne s'en voit en jeu.
  const yeux = regardsDuJoueur(state);
  for (let i = 0; i < state.world.colonies.length; i++) {
    const col = state.world.colonies[i];
    const du = state.temps - (col.vuA || 0);
    // Aucune maille n'est plus fine que PAS_COLONIE : sous ce seuil, inutile
    // d'aller calculer la distance au joueur. C'est ce test-là qui rend la
    // boucle sur cinquante-quatre villes gratuite les trois quarts du temps.
    if (du < PAS_COLONIE) continue;
    // Décalage par indice : sans ça les villes lointaines tomberaient toutes
    // sur la même heure et le tick ferait des pics toutes les douze heures.
    const pas = pasColonie(yeux, col, i);
    if (du < pas) continue;
    col.vuA = state.temps;
    // La réputation locale infléchit ce que les gens d'ici pensent de vous.
    const rep = (col.faction && state.player.reputation[col.faction]) || 0;
    // Être là change ce qui vit : le banc de recrutement ne se garnit que sous
    // nos yeux. `yeux` contient aussi la région de l'avant-poste, mais on ne
    // fonde jamais un avant-poste sur une ville : pour une colonie, c'est bien
    // « un groupe est ici ».
    const present = yeux.includes(col.regionId);
    // Le banc de recrutement ne se garnit que là où l'on est. Le tenir à jour
    // dans les quatre-vingt-six villes, ce serait deux cents personnages
    // inventés pour rien dans chaque sauvegarde.
    if (present) bancDe(state, col, rng, state.temps);
    else if (col.banc) col.banc = null;
    // La vitrine d'un avant-poste n'a pas d'économie propre : sa vérité est
    // dans `state.base`, et la simuler ici la ferait vivre deux fois.
    if (col.avantPoste) { col.vuA = state.temps; continue; }
    // La geôle : on nourrit les détenus, on relâche ceux qui ont fait leur
    // temps, et une geôle qui déborde fait gronder la ville.
    tickGeole(state, col, du);
    // Ce que la loi fait à l'humeur : on ne pend pas vite sans que la ville
    // s'en ressente, et on ne relâche pas non plus sans que ça se voie.
    tickOrdrePublic(state, col, du);
    const ev = tickColonie(state.world, col, rng, climat, du, rep, log, state.temps, present);
    if (!ev) continue;
    if (ev.evenement === 'croissance') {
      log({
        type: 'croissance',
        texte: `${col.nom} s’agrandit : la ville passe au rang ${col.taille}.`,
        regionId: col.regionId,
        important: true,
      });
    } else if (ev.evenement === 'revolte') {
      const ancienne = col.faction;
      const r = faireRevolte(state.world, col, rng, state.temps);
      // Une émeute laisse les pistes du coin dans un état déplorable : des
      // gens armés qui n'ont plus rien à perdre, et personne pour les tenir.
      const reg = state.world.regions[col.regionId];
      reg.insecurite = Math.min(1, (reg.insecurite || 0) + 0.25);
      if (r.issue === 'matee') {
        // Une émeute matée à l'autre bout de la carte n'est pas une nouvelle :
        // c'est un fait divers local. On ne l'apprend que si l'on a quelqu'un
        // dans le secteur — même règle que pour tout le reste de la carte.
        if (estSurveillee(state, col.regionId)) {
          log({
            type: 'revolte',
            texte: `${col.nom} se soulève. La garnison tient la place`
              + `${r.liberes ? `, mais la geôle s’est vidée (${r.liberes} évadés)` : ''}.`
              + ` On comptera les morts demain.`,
            regionId: col.regionId,
            important: true,
            factions: [ancienne].filter(Boolean),
          });
        }
      } else if (r.issue === 'secession') {
        crediterDirigeant(state.world, ancienne, 'perte');
        log({
          type: 'revolte',
          texte: `${col.nom} se soulève et chasse ${FACTIONS[ancienne].nom}. `
            + `La ville revient ${FACTIONS[r.rendue].datif}.`,
          regionId: col.regionId,
          important: true,
          factions: [ancienne, r.rendue].filter(Boolean),
        });
      } else {
        crediterDirigeant(state.world, ancienne, 'perte');
        log({
          type: 'revolte',
          texte: `${col.nom} se soulève et se donne à personne. Plus de drapeau, `
            + `plus de loi, et l’on y vendra bientôt n’importe quoi.`,
          regionId: col.regionId,
          important: true,
          factions: [ancienne].filter(Boolean),
        });
      }
    } else if (ev.evenement === 'secession') {
      const r = faireSecession(state.world, col);
      log({
        type: 'secession',
        texte: r.renaissance
          ? `${col.nom} se soulève : ${FACTIONS[r.rendue].nom} renaît de ses cendres.`
          : `${col.nom} chasse ${FACTIONS[r.ancienne].nom} et rejoint ${FACTIONS[r.rendue].nom}.`,
        regionId: col.regionId,
        important: true,
      });
    } else if (ev.evenement === 'effondrement') {
      const ancienne = effondrer(state.world, col);
      log({
        type: 'effondrement',
        texte: `${col.nom} est abandonnée${ancienne ? ` par ${FACTIONS[ancienne].nom}` : ''}. Il n’en reste que des ruines.`,
        regionId: col.regionId,
        important: true,
      });
    }
  }
  tickFactions(state.world, state.temps, log, ctx);
  tickCaravanes(state, log, ctx);
  // Le loyer des coffres court, qu'on soit là ou non.
  tickCoffres(state, log);

  // Panneaux d'affichage et étals se renouvellent de loin en loin.
  if (state.temps % 40 === 0) {
    rafraichirPanneaux(state, rng, state.temps);
    for (const col of state.world.colonies) {
      if (!col.ruine) etalDe(state.world, col, rng, state.temps, palierBonus(state, col.faction));
    }
  }

  // Puis l'avant-poste et l'escouade.
  tickBase(state, log, ctx);
  if (!state.fin) tickSquad(state, log, ctx);
  if (!state.fin) tickContrats(state, log, ctx);
  if (!state.fin) tickAllegeance(state, log, ctx);
  // Ce dont un gradé répond tous les jours, guerre ou pas : l'état de ses
  // routes. Avant le jugement, qui lit le bilan qu'il vient d'écrire.
  if (!state.fin) tickSecteurs(state, log, ctx);
  // On rend des comptes de ce qu'on a ordonné : d'abord l'issue des actes, puis
  // la charge elle-même, qu'on perd quand le crédit est épuisé.
  if (!state.fin) jugerActes(state, log);
  if (!state.fin) tickCharges(state, log);
  if (!state.fin) tickFormation(state, log);

  // En dernier : on relève ce qu'on a sous les yeux, après que tout a bougé.
  observer(state);

  state.rngState = rng.save();
  return state;
}

/** Enchaîne `n` heures. Retourne le nombre de ticks réellement joués. */
export function avancer(state, n) {
  let joues = 0;
  for (let i = 0; i < n; i++) {
    if (state.fin) break;
    tick(state);
    joues++;
  }
  return joues;
}

/**
 * Jouer des heures que le joueur n'a pas vécues.
 *
 * Le monde tourne pareil — la faim, les bêtes, les guerres, tout est joué. Ce
 * qui change, c'est qu'on ne peut rien reprocher à quelqu'un qui n'était pas
 * là : un ordre de mission ne lui est pas remis pendant ce temps, et celui
 * qu'il avait déjà lui est retiré plutôt que compté comme un manquement. Voir
 * `tickEngagement`.
 *
 * Le drapeau est posé sur l'état plutôt que passé en paramètre parce que
 * `avancer` est aussi ce qui fait tourner la partie en cours : la distinction
 * n'est pas « quelle fonction » mais « pour quelle raison ».
 */
function enAbsence(state, faire) {
  state.absent = true;
  try {
    return faire();
  } finally {
    delete state.absent;
  }
}

/**
 * Ce que le temps réel écoulé nous doit, sans rien appliquer.
 * Retourne { ticks, tronque, pas } — `tronque` si on a tapé le plafond.
 */
export function rattrapageDu(state, maintenantMs) {
  const pas = TICK_MS / (state.vitesse || 1);
  if (!state.dernierReel) return { ticks: 0, tronque: false, pas };
  const ecoule = Math.max(0, maintenantMs - state.dernierReel);
  let ticks = Math.floor(ecoule / pas);
  const tronque = ticks > RATTRAPAGE_MAX;
  if (tronque) ticks = RATTRAPAGE_MAX;
  return { ticks, tronque, pas };
}

/**
 * Rattrapage : applique le temps réel écoulé depuis la dernière session.
 * Retourne { ticks, tronque }.
 */
export function rattraper(state, maintenantMs) {
  if (!state.dernierReel) {
    state.dernierReel = maintenantMs;
    return { ticks: 0, tronque: false };
  }
  const { ticks, tronque, pas } = rattrapageDu(state, maintenantMs);
  ouvrirRapport(state, 'absence');
  const joues = enAbsence(state, () => avancer(state, ticks));
  fermerRapport(state);
  // On garde le reste pour ne pas perdre les fractions d'heure
  state.dernierReel += ticks * pas;
  if (tronque) state.dernierReel = maintenantMs;
  return { ticks: joues, tronque };
}

/**
 * Même rattrapage, mais découpé en tranches que l'appelant fait avancer une par
 * une. Deux ans hors ligne, c'est dix-sept mille heures : les jouer d'un bloc
 * fige l'onglet une seconde ou deux, sur un téléphone bien davantage. Ici
 * l'interface garde la main entre deux tranches et peut afficher où on en est.
 *
 * `state.dernierReel` avance tranche par tranche : si la page est fermée en
 * cours de route, ce qui a déjà été joué n'est pas rejoué au retour.
 */
export function rattrapageEtale(state, maintenantMs, tranche = 200) {
  if (!state.dernierReel) {
    state.dernierReel = maintenantMs;
    return { total: 0, tronque: false, faits: () => 0, pas: () => false };
  }
  const plan = rattrapageDu(state, maintenantMs);
  let faits = 0;
  const finir = () => {
    if (plan.tronque) state.dernierReel = maintenantMs;
    // Une seule fois, à la toute fin. Refermer le rapport à chaque tranche
    // reviendrait à ne rapporter que les deux cents dernières heures d'une
    // absence de deux ans — et, sous le seuil, à ne rien rapporter du tout.
    fermerRapport(state);
  };
  if (plan.ticks > 0) ouvrirRapport(state, 'absence');
  if (plan.ticks === 0) {
    return { total: 0, tronque: plan.tronque, faits: () => 0, pas: () => false };
  }
  return {
    total: plan.ticks,
    tronque: plan.tronque,
    faits: () => faits,
    /** Joue la tranche suivante. Retourne true tant qu'il reste du travail. */
    pas(n = tranche) {
      const voulu = Math.min(Math.max(1, n | 0), plan.ticks - faits);
      const joues = enAbsence(state, () => avancer(state, voulu));
      faits += joues;
      state.dernierReel += joues * plan.pas;
      // `joues < voulu` : la partie s'est terminée en route, plus rien à jouer.
      if (faits >= plan.ticks || joues < voulu) {
        finir();
        return false;
      }
      return true;
    },
  };
}

// ---------------------------------------------------------------------------
// Lecture du temps
// ---------------------------------------------------------------------------

export function horloge(t) {
  const jour = Math.floor(t / 24) + 1;
  const heure = t % 24;
  return { jour, heure, texte: `J${jour} ${String(heure).padStart(2, '0')}:00` };
}

export function resumeMonde(state) {
  const w = state.world;
  return {
    guerres: w.guerres.map((g) => ({
      a: FACTIONS[g.a].nom,
      b: FACTIONS[g.b].nom,
      depuis: g.depuis,
      batailles: g.batailles,
    })),
    armees: w.armees.map((a) => ({
      faction: FACTIONS[a.faction].nom,
      couleur: FACTIONS[a.faction].couleur,
      force: a.force,
      etat: a.etat,
      lieu: nomRegion(w, a.regionId),
      cible: a.cible ? (colonieParId(w, a.cible) || {}).nom : null,
    })),
  };
}
