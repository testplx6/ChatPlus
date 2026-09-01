// Orchestration : création de partie, tick horaire, rattrapage du temps passé
// hors ligne. `state.world` est la moitié partagée de l'état (celle qui vivrait
// côté serveur en multijoueur), `state.player` / `state.base` la moitié privée.

import { Rng, grainDe } from './rng.js';
import { appelerSecours, tenterPacte } from './pactes.js';
import { FACTIONS, DIPLO_FACTIONS, drapeauDe } from './data.js';
import { genererMonde, decouvrir, colonieParId, nomRegion, distance } from './world.js';
import { makeCharacter, idDepuisRng, ARCHETYPE_KEYS } from './characters.js';
import {
  creerBase, tickBase, perdreAvantPoste, saccagerAvantPoste, forceEscouade,
  userMursSiege,
} from './base.js';
import {
  tickColonie, etalDe, effondrer, faireSecession, faireRevolte, emploisInitiaux,
  reserveVille, prixReleves,
} from './economy.js';
import { tickClimat, conditions, saison } from './climat.js';
import { tickChapitres, tickFils, tickMemoireLieux } from './histoire.js';
import { tickCaravanes } from './caravanes.js';
import { tickCoffres } from './coffres.js';
import { tickFactions } from './factions.js';
import { tickSquad } from './squad.js';
import { creerLogger, combatContre } from './events.js';
import { genererBande } from './combat.js';
import { VERSION } from './save.js';
import { groupeVide } from './groupes.js';
import { creerConnaissance, observer, estSurveillee } from './connaissance.js';
import { poserMasseInitiale, veillerMonnaies } from './monnaie.js';
import { pourvoirCharges, nommerActeur } from './notables.js';
import { creerDirigeant, crediterDirigeant } from './dirigeants.js';
import { tickFormation } from './formation.js';
import { rafraichirPanneaux, genererContrats, tickContrats } from './contrats.js';
import {
  tickAllegeance, palierBonus, rangDe, estimeEngagement, renfortMilice,
} from './allegeance.js';
import {
  jugerActes, tickCharges, commandementDe, porterFaute, tickCour,
} from './influence.js';
import { tickFaits, tickOubli } from './faits.js';
import { retenirEnVille } from './services.js';
import { tickSecteurs } from './secteur.js';
import { tickGeole, tickOrdrePublic } from './justice.js';
import { ouvrirRapport, fermerRapport } from './rapport.js';

/** Durée réelle d'une heure de jeu, à vitesse ×1. */
export const TICK_MS = 10000;
/** Plafond de rattrapage hors ligne, en heures de jeu (environ deux ans). */
export const RATTRAPAGE_MAX = 17000;

/**
 * Au-delà de ce silence, on n'était plus là : onglet fermé, téléphone dans la
 * poche, page endormie. En deçà, c'est du jeu en cours — la même fonction sert
 * les deux, et confondre les deux, c'est arrêter la partie qu'on est en train
 * de jouer.
 */
export const SEUIL_ABSENCE_MS = 10000;

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

/**
 * La maille, en objet mutable — donc balayable au banc, ce que trois `const`
 * scalaires n'étaient pas.
 *
 * `pres` et `loin` sont calibrés et documentés au-dessus : trois près du
 * joueur (à quatre, la survie tombe de 42 à 31 sur soixante parties), vingt-
 * quatre au loin. `rayon`, lui, ne l'avait jamais été — il valait quatre depuis
 * le premier jour, et c'est LUI qui décide du nombre de villes payées au prix
 * fort : un disque de rayon quatre couvre quarante et une cases, contre
 * vingt-cinq à rayon trois et treize à rayon deux.
 */
export const MAILLE = { pres: PAS_COLONIE, loin: PAS_LOIN, rayon: RAYON_DETAIL };
/** On démarre déjà accéléré : à ×1 il ne se passe visiblement rien. */
export const VITESSE_DEFAUT = 4;

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

/**
 * Les départs possibles, et ce qu'ils changent.
 *
 * Un seul début imposé, c'était une constante du jeu : même drapeau, même
 * paquetage, même première heure, à chaque partie. Et le réveil auprès d'un mort
 * — bonne scène la première fois — devient une formalité à la cinquième.
 *
 * Chaque entrée dit ce qu'elle installe, en clair, pour que le choix se fasse
 * les yeux ouverts plutôt qu'au titre :
 *
 *   ville      où l'on ouvre les yeux : dans une ville, ou sur une case vide
 *   gens       combien de vivants
 *   mort       un compagnon mort à côté, armé, dont il faut décider
 *   equipe     armes, armures, vivres, crédits
 *   accueil    l'estime que la faction hôte vous accorde d'emblée
 */
export const DEPARTS = {
  survivant: {
    nom: 'Le survivant',
    resume: 'Seul, désarmé, dans la poussière — et un mort à côté de vous.',
    detail: 'Celui avec qui vous voyagiez n’a pas passé la nuit. Il a une arme et '
      + 'une armure ; la colonne le porte tant que vous n’avez rien décidé. '
      + 'Enterrer, ou dépouiller : c’est la première chose que vous ferez.',
    ville: false,
    gens: 1,
    mort: true,
    equipe: false,
    accueil: 0,
  },
  poussiere: {
    nom: 'Rien du tout',
    resume: 'Seul, désarmé, sans rien ni personne. Le plus nu.',
    detail: 'Pas de nom, pas de passé, pas d’arme. Une trentaine de crédits et de '
      + 'quoi manger quelques jours. Tout le reste est à prendre.',
    ville: false,
    gens: 1,
    mort: false,
    equipe: false,
    accueil: 0,
  },
  fuyards: {
    nom: 'Les fuyards',
    resume: 'À deux, sans rien, et mal vus de ceux qui tiennent le coin.',
    detail: 'Vous n’êtes pas seul, et c’est déjà beaucoup. Mais vous avez laissé un '
      + 'mauvais souvenir aux gens d’ici : leurs hommes vous chercheront, et leurs '
      + 'marchands vous feront payer. Il faudra partir, ou se faire pardonner.',
    ville: false,
    gens: 2,
    mort: false,
    equipe: false,
    accueil: -35,
  },
  convoi: {
    nom: 'Le convoi',
    resume: 'À trois, équipés, dans une ville qui vous connaît. L’ancien départ.',
    detail: 'Machettes, cuir, quarante-cinq rations, quatre cent cinquante crédits, '
      + 'et des hôtes qui vous prendraient à leur service dès aujourd’hui. On '
      + 'commence la partie au deuxième chapitre.',
    ville: true,
    gens: 3,
    mort: false,
    equipe: true,
    accueil: null, // le seuil d'enrôlement du drapeau, plus deux
  },
};

export const DEPART_KEYS = Object.keys(DEPARTS);
/** Ce qu'on joue quand rien n'est demandé. */
export const DEPART_DEFAUT = 'survivant';

export function nouvellePartie(seed, opts = {}) {
  const rng = new Rng(seed);
  const world = genererMonde(rng, seed);

  // Le scénario d'ouverture, choisi à l'accueil. Voir DEPARTS juste au-dessus.
  // `'ville'` reste accepté : le banc et le harnais l'emploient partout, et
  // renommer une clé dans deux cents fixtures ne vaut pas une ligne d'alias.
  const clef = opts.depart === 'ville' ? 'convoi' : (opts.depart || DEPART_DEFAUT);
  const scen = DEPARTS[clef] || DEPARTS[DEPART_DEFAUT];

  const accueillantes = world.colonies.filter((c) => c.faction && c.faction !== 'essaim');
  const hote = accueillantes.length ? rng.pick(accueillantes) : rng.pick(world.colonies);
  let regionDepart = hote.regionId;
  if (!scen.ville) {
    // Une case vide à portée de marche : assez près pour trouver du monde en
    // cherchant, assez loin pour que personne ne vous ait vu arriver.
    const autour = world.regions.filter(
      (r) => !world.colonies.some((c) => c.regionId === r.i)
        && distance(r.i, hote.regionId) >= 1 && distance(r.i, hote.regionId) <= 2);
    if (autour.length) regionDepart = rng.pick(autour).i;
  }

  const premier = groupeVide(idDepuisRng(rng, 'g'), 'Convoi', regionDepart, 0);
  // `opts.equipe` force l'effectif : le harnais teste des mécaniques de groupe —
  // porter un blessé, répartir les tâches, manger ses morts — et devrait sans
  // cela recruter trois personnes avant chaque test.
  const combien = Math.max(1, opts.equipe || scen.gens);

  if (scen.equipe) {
    const paquetage = [
      { archetype: 'ferrailleur', arme: 'machette', armure: 'cuir' },
      { archetype: 'chasseur', arme: 'clous', armure: 'cuir' },
      { archetype: 'medic', arme: 'barre', armure: 'cuir' },
    ];
    for (let i = 0; i < combien; i++) {
      premier.membres.push(makeCharacter(rng, paquetage[i % paquetage.length]));
    }
    premier.inventaire.rations = 45;
    premier.inventaire.ferraille = 20;
    premier.inventaire.medkit = 2;
    premier.objets = ['machette', 'cuir'];
  } else {
    for (let i = 0; i < combien; i++) {
      // Le métier est tiré : on ne choisit pas qui l'on est en se réveillant.
      const c = makeCharacter(rng, { archetype: rng.pick(ARCHETYPE_KEYS) });
      // `makeCharacter` arme d'office selon le métier (`opts.arme || def.arme`),
      // et l'on ne peut pas le lui refuser par un `null` — il retomberait sur la
      // valeur du métier. On désarme donc après coup, explicitement.
      c.equip.arme = null;
      c.equip.armure = null;
      premier.membres.push(c);
    }
    premier.inventaire.rations = rng.irange(6, 14);
    premier.inventaire.ferraille = rng.irange(0, 6);
    premier.objets = [];
  }

  if (scen.mort) {
    // Celui avec qui on voyageait. Il est armé, la colonne le porte tant qu'on
    // n'a rien décidé — marche ralentie, moral qui pèse (voir depouilles.js) —
    // et la première décision de la partie tombe avant le premier pas.
    const compagnon = makeCharacter(rng, {
      archetype: rng.pick(ARCHETYPE_KEYS),
      arme: rng.pick(['machette', 'barre', 'clous']),
      armure: 'cuir',
    });
    compagnon.etat = 'mort';
    compagnon.pv = 0;
    premier.membres.push(compagnon);
  }

  const reputation = {};
  for (const k of DIPLO_FACTIONS) reputation[k] = 0;
  // Ce que la faction du coin pense de vous en ouvrant les yeux. `null` veut
  // dire « juste assez pour entrer à leur service », quel que soit leur seuil ;
  // un nombre négatif, qu'on a déjà laissé un mauvais souvenir ici.
  if (hote.faction) {
    reputation[hote.faction] = scen.accueil === null
      ? estimeEngagement(hote.faction) + 2 : scen.accueil;
  }

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
      // Le hasard du joueur, dans sa poche. Dérivé de l'état du monde à cet
      // instant — pas un tirage de plus, sinon le monde entier se décale.
      //
      // Tout ce que le joueur fait tirait au sac commun : son escouade, son
      // camp, ses allégeances, ses contrats. Chacun de ces tirages décalait
      // ceux des factions et des caravanes, si bien que deux parties de même
      // graine divergeaient parce qu'il avait marché ailleurs. Et `player` est
      // privé par construction : son hasard n'a rien à faire dans `world`.
      rngEtat: grainDe('joueur', seed, rng.save()),
      // Le portefeuille, et non plus un solde. On ne commence pas avec du crédit
      // universel : on commence avec la monnaie de l'endroit où l'on est, parce
      // qu'il n'y a pas d'autre façon d'y être arrivé. Voir `monnaie.js`.
      bourse: { [hote.faction || 'hexa']: scen.equipe ? 450 : rng.irange(20, 70) },
      // Le repère de la veille des monnaies : vide, il se pose au premier tick.
      coursVu: {},
      alertesMonnaie: [],
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
      // Le récit (HISTOIRE.md, lot A) : le premier tick ouvre le chapitre
      // que l'état raconte. Initialisé ici pour que l'aller-retour JSON
      // d'une partie neuve soit exact — normaliser pose les mêmes valeurs.
      chapitre: null,
      chapitres: [],
      chapitreN: 0,
      // La mémoire des rencontres (HISTOIRE.md, lots B et E) — mêmes
      // valeurs que normaliser, pour un aller-retour JSON exact.
      rencontres: { contrats: {}, accrochages: {}, pos: {} },
      // Les sièges rachetés, en tout : le monde apprend qu'on paie et le
      // prix monte à chaque fois (SIEGE.md, S3).
      rachats: 0,
      rachatsFaits: [],
      // L5 : le scalaire est une vue du registre — l'accueil du départ est
      // donc un fait, le fait fondateur, sinon la première matérialisation
      // effacerait ce qu'on pense déjà de vous. « Le passé est réputé su. »
      faits: Object.keys(reputation).some((k) => reputation[k])
        ? [{
          type: 'passe', t: 0,
          effets: Object.keys(reputation).filter((k) => reputation[k])
            .map((k) => ({ faction: k, delta: reputation[k], su: 0, applique: true, poids: 1 })),
        }] : [],
      faitsFondes: true,
      chefs: {},
      conseilsVus: {},
    },
    base: creerBase(),
    journal: [],
    // Le compteur d'entrées — même valeur que poserait `normaliser`, pour un
    // aller-retour JSON exact d'une partie neuve.
    journalN: 0,
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
    // Ce que le monde fait quand on n'est pas là. Arrêté par défaut : rejouer
    // l'absence, c'était « plusieurs centaines de jours qui défilent sous nos
    // yeux sans qu'on ne puisse rien faire » (le propriétaire, août 2026). Qui
    // veut un monde qui tourne sans lui l'allume — c'est un choix, pas un dû.
    reglages: { rattrapage: false, allege: false },
  };
  world.caravanes = [];

  // Les métiers des villes se posent une fois les factions attribuées : la
  // vocation d'un bourg tient à son biome autant qu'à qui le tient. Les charges
  // se pourvoient dans la foulée — une ville a un chef et un armurier dès le
  // premier jour, pas au bout de trois heures de jeu.
  for (const col of world.colonies) {
    col.emplois = emploisInitiaux(world, col, rng);
    pourvoirCharges(col, rng, 0);
    // Et son fonds de roulement. Une ville qui existe depuis des générations a
    // de quoi commercer le premier jour ; la faire naître à quatre cents crédits
    // lui coûtait mille heures à remplir sa réserve, pendant lesquelles elle ne
    // remontait rien à sa faction. Mesuré : à mille cinq cents heures, quinze
    // factions sur trente-six pouvaient s'offrir une bourse au lieu de
    // vingt-quatre. Le début de partie devenait plus pauvre qu'avant, ce qui est
    // le contraire de ce qu'on cherchait.
    col.caisse = Math.round(reserveVille(col, 0.05));
  }
  // Et chaque faction a quelqu'un à sa tête dès le premier jour — sauf l'Essaim,
  // qui n'a pas de politique : il déferle. On pose quand même la clé, sinon
  // recharger une partie l'ajoute et l'aller-retour JSON n'est plus exact.
  for (const k of Object.keys(world.factions)) {
    world.factions[k].dirigeant = k === 'essaim' ? null : creerDirigeant(rng, k, 0, undefined, world);
  }
  // Et la monnaie de chacun : la masse émise vaut exactement ce qui existe, si
  // bien que l'invariant comptable naît vrai. Tout ce qui le brisera ensuite est
  // un bug qu'on pourra dater — voir `auditer` dans monnaie.js.
  poserMasseInitiale(world);

  decouvrir(world, regionDepart, 2);
  observer(state, prixReleves);
  tickClimat(world, 0, rng);
  rafraichirPanneaux(state, rng, 0);
  for (const col of world.colonies) etalDe(world, col, rng, 0);
  state.rngState = rng.save();
  const log = creerLogger(state);
  log({
    type: 'debut',
    texte: scen.ville
      ? `Le convoi s’arrête à ${hote.nom}. ${scen.resume}`
      : `On rouvre les yeux en ${nomRegion(world, regionDepart)}. ${scen.resume}`,
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
function pasColonie(yeux, col, i, absent) {
  // Pendant une absence, personne ne regarde — et c'est précisément le moment
  // où le moteur travaille le plus : le rattrapage rejoue des milliers
  // d'heures d'un coup. Les villes du monde autour du camp n'ont alors aucune
  // raison d'avancer huit fois plus finement que les autres : le joueur ne
  // verra que l'état final, et l'invariance à la maille dit que les deux
  // trajectoires se rejoignent (MAILLE.md — mesurée à 6,6 % de volume brassé,
  // sous le plancher de bruit).
  //
  // L'avant-poste garde sa maille fine : c'est de son camp qu'on lui rend
  // compte au retour, et le rapport d'absence se lit ligne à ligne.
  if (absent && !col.avantPoste) return MAILLE.loin + (i % 5);
  for (const rid of yeux) {
    if (distance(rid, col.regionId) <= MAILLE.rayon) return MAILLE.pres;
  }
  return MAILLE.loin + (i % 5); // 24 à 28 : de quoi étaler la charge sur l'heure
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
  // M1 (MARECHAL.md) : charge de Maréchal tenue, les colonnes de la maison
  // n'obéissent qu'au joueur — le conseil s'efface des levées comme il
  // s'efface des lois, et une ville perdue sous commandement s'impute à
  // l'officier, pas au dirigeant. `commandementDe` rend la main pendant les
  // absences et dès que le crédit tombe.
  const commandement = commandementDe(state);
  if (commandement) {
    ctx.marechal = commandement;
    // M4 : la place à tenir. La désignation vit à la feuille de service et
    // passe au monde par le ctx, comme le reste du commandement.
    let placeTenue = null;
    for (const g of state.player.groupes) {
      const all = g.allegeance;
      if (all && all.faction === commandement && all.place) { placeTenue = all.place; break; }
    }
    if (placeTenue) ctx.placeATenir = placeTenue;
    ctx.perteVille = (faction, nom, colId) => {
      const laVotre = colId && colId === placeTenue;
      // Une perte = une faute, place désignée ou pas. Revu au prisme du
      // propriétaire (août 2026) : aucun agent ne « compte double » — un
      // multiplicateur serait un malus dirigé, pas de la simulation. Ce qui
      // distingue la place désignée, c'est la mémoire du récit.
      porterFaute(state, faction,
        laVotre ? `la perte de ${nom} — la place que vous aviez fait tenir` : `la perte de ${nom}`,
        log);
      // On ne tient pas une ville perdue : la désignation s'efface avec elle.
      if (laVotre) {
        for (const g of state.player.groupes) {
          if (g.allegeance && g.allegeance.place === colId) g.allegeance.place = null;
        }
      }
    };
  }
  // Le banc peut geler la législation pour la mesurer par différence.
  if (state.sansLois) ctx.sansLois = true;
  // Ces heures-ci sont rattrapées, pas jouées : le joueur n'était pas là. Ce
  // qui exige une décision de sa part ne doit pas lui être compté pendant ce
  // temps — voir `tickEngagement` dans allegeance.js.
  if (state.absent) ctx.absent = true;
  // Ce qu'il faut faire si une colonne prend l'avant-poste du joueur : le
  // monde ne connaît que sa vitrine, il ne saurait pas démonter le camp.
  ctx.perdreAvantPoste = (motif) => perdreAvantPoste(state, log, motif);
  ctx.saccagerAvantPoste = (force) => saccagerAvantPoste(state, log, force);
  // Ce qui défend le camp au moment du choc : les vôtres restés sur place, et
  // la colonne que la Milice envoie à ceux qui la servent (voir SERVICES).
  ctx.renfortAvantPoste = () => forceEscouade(state) + renfortMilice(state);
  // Les murs du camp s'usent sous les assauts d'un siège (SIEGE.md, S4).
  ctx.usureMurs = (assaut) => userMursSiege(state, log, assaut);
  // Le raid se bat pour de bon (SIEGE.md, S1) : base.js précède events.js
  // dans l'ordre des modules et ne peut pas l'importer — la bataille lui est
  // prêtée par ici, comme la caravane l'emprunte via main.js.
  ctx.genererBande = genererBande;
  ctx.combatContre = combatContre;
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
    if (du < MAILLE.pres) continue;
    // Décalage par indice : sans ça les villes lointaines tomberaient toutes
    // sur la même heure et le tick ferait des pics toutes les douze heures.
    const pas = pasColonie(yeux, col, i, state.absent);
    if (du < pas) continue;
    col.vuA = state.temps;
    // La réputation locale infléchit ce que les gens d'ici pensent de vous.
    const rep = (col.faction && state.player.reputation[col.faction]) || 0;
    // `yeux` contient aussi la région de l'avant-poste, mais on ne fonde jamais
    // un avant-poste sur une ville : pour une colonie, c'est bien « un groupe
    // est ici ».
    const present = yeux.includes(col.regionId);
    // Le banc de recrutement ne se fabrique plus ici. Il se DÉRIVE de la ville
    // et de l'heure, au moment où quelqu'un le regarde (`bancDerive`). Ce qu'on
    // vient de supprimer était le seul endroit où le monde lisait la position du
    // joueur pour décider qui existe — et où les tirages d'un banc sortaient du
    // flux scellé, si bien qu'à graine égale le monde divergeait selon le trajet
    // du promeneur. Voir INDIVIDUS.md, lot 2.
    // La vitrine d'un avant-poste n'a pas d'économie propre : sa vérité est
    // dans `state.base`, et la simuler ici la ferait vivre deux fois.
    if (col.avantPoste) { col.vuA = state.temps; continue; }
    // La geôle : on nourrit les détenus, on relâche ceux qui ont fait leur
    // temps, et une geôle qui déborde fait gronder la ville.
    tickGeole(state, col, du);
    // Ce que la loi fait à l'humeur : on ne pend pas vite sans que la ville
    // s'en ressente, et on ne relâche pas non plus sans que ça se voie.
    tickOrdrePublic(state, col, du);
    // Le flux de la ville, ouvert et rescellé autour de son tick. C'est ce qui
    // coupe la contamination : ce qu'une ville tire ne décale plus rien chez
    // les autres, quel que soit l'ordre où le niveau de détail les fait passer.
    const rngCol = new Rng(col.rngEtat);
    const ev = tickColonie(state.world, col, rngCol, climat, du, rep, log, state.temps, present);
    col.rngEtat = rngCol.save();
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
      const r = faireRevolte(state.world, col, rngCol, state.temps);
      col.rngEtat = rngCol.save();
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
          texte: `${col.nom} se soulève et chasse ${drapeauDe(state.world, ancienne).nom}. `
            + `La ville revient ${drapeauDe(state.world, r.rendue).datif}.`,
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
        texte: (r.renaissance
          ? `${col.nom} se soulève : ${drapeauDe(state.world, r.rendue).nom} renaît de ses cendres.`
          : `${col.nom} chasse ${drapeauDe(state.world, r.ancienne).nom} `
            + `et rejoint ${drapeauDe(state.world, r.rendue).nom}.`)
          + ` C’est ${nommerActeur(state.world, 'secession', col.id)} qui a décroché l’ancien drapeau.`,
        regionId: col.regionId,
        important: true,
      });
    } else if (ev.evenement === 'effondrement') {
      // L'avant-poste du joueur est une colonie comme les autres pour ce
      // tick-ci, et il mourait donc comme les autres — sauf que personne ne
      // démontait `state.base`. On gardait un camp « fondé » assis sur une
      // ruine : les chaînes tournaient, l'entrepôt existait, et il devenait
      // impossible d'en refonder un ailleurs puisque celui-là existait encore.
      const sien = col.avantPoste && state.base.colonieId === col.id;
      const ancienne = effondrer(state.world, col);
      if (sien) {
        col.avantPoste = false;
        perdreAvantPoste(state, log,
          `${col.nom} s’est vidée. Les derniers sont partis sans rien dire, `
          + `et il ne reste que des murs. Il faudra recommencer ailleurs.`);
      } else {
        log({
          type: 'effondrement',
          texte: `${col.nom} est abandonnée${ancienne ? ` par ${drapeauDe(state.world, ancienne).nom}` : ''}. `
            + `Il n’en reste que des ruines. La famille de ${nommerActeur(state.world, 'ruine', col.id)} `
            + `est partie la première ; les autres ont suivi.`,
          regionId: col.regionId,
          important: true,
        });
      }
    }
  }
  // Ce que les pactes exigent quand un siège commence : ceux qui ont promis
  // leur secours viennent, ne peuvent pas, ou n'ont pas voulu.
  ctx.appelerSecours = (place, agresseur) => appelerSecours(state, place, agresseur, log);
  // Et les conseils qui cherchent une parole d'eux-mêmes (P3). Même patron :
  // `pactes.js` lit `factions.js`, il ne peut pas être lu par lui.
  ctx.tenterPacte = (key, rng) => tenterPacte(state, key, log, rng);
  tickFactions(state.world, state.temps, log, ctx);
  // Le pays du joueur l'a-t-il écarté ? Le monde a posé la marque ; c'est ici,
  // du côté du joueur, qu'on en tire les conséquences — le monde n'a jamais à
  // savoir qui joue (règle d'or). Le drapeau continue sans vous : vos villes
  // restent à lui, et c'est bien ce qui fait mal.
  if (state.player.drapeau) {
    const mien = state.world.factions[state.player.drapeau];
    if (mien && mien.demisJoueur !== undefined) {
      delete mien.joueur;
      delete mien.demisJoueur;
      // Le conseil se remet à battre : il n'attendait plus que vous.
      mien.prochainConseil = 24;
      state.player.drapeau = null;
    }
  }
  tickCaravanes(state, log, ctx);
  // Le loyer des coffres court, qu'on soit là ou non.
  tickCoffres(state, log);

  // Panneaux d'affichage et étals se renouvellent de loin en loin.
  // Panneaux et étals se renouvellent avec le hasard DE LA VILLE : ils la
  // concernent seule, et `palierBonus` lit le joueur — sur le sac commun, le
  // grade du joueur décidait des tirages du monde entier.
  if (state.temps % 40 === 0) {
    for (const col of state.world.colonies) {
      if (col.ruine) { col.contrats = []; continue; }
      // La condition d'expiration, qui était dans `rafraichirPanneaux` : un
      // panneau se renouvelle quand il est périmé, pas toutes les quarante
      // heures pour les quatre-vingt-six villes. L'avoir perdue en basculant
      // sur le flux de la ville coûtait un tiers du tick, et la garde de
      // vitesse l'a refusé.
      const rngV = new Rng(col.rngEtat);
      if (!col.contrats || state.temps >= (col.contratsExpire || 0)) {
        genererContrats(state, col, rngV, state.temps);
      }
      etalDe(state.world, col, rngV, state.temps, palierBonus(state, col.faction));
      col.rngEtat = rngV.save();
    }
  }

  // Puis l'avant-poste et l'escouade — sur le flux du joueur, pas sur celui du
  // monde. C'est la bascule qui rend le monde indifférent au trajet.
  const rngJoueur = new Rng(state.player.rngEtat);
  ctx.rng = rngJoueur;
  tickBase(state, log, ctx);
  // La fin ne gèle RIEN : « le temps devrait continuer même quand tout le
  // monde est mort » (le propriétaire, août 2026) — c'est la devise du jeu
  // prise au mot. Une escouade éteinte est un joueur absent, pas un monde à
  // l'arrêt : les contrats échoient, les charges se perdent, les monnaies
  // vivent. tickSquad garde son propre repli quand personne ne tient debout.
  tickSquad(state, log, ctx);
  tickContrats(state, log, ctx);
  tickAllegeance(state, log, ctx);
  // Ce dont un gradé répond tous les jours, guerre ou pas : l'état de ses
  // routes. Avant le jugement, qui lit le bilan qu'il vient d'écrire.
  tickSecteurs(state, log, ctx);
  // On rend des comptes de ce qu'on a ordonné : d'abord l'issue des actes, puis
  // la charge elle-même, qu'on perd quand le crédit est épuisé.
  jugerActes(state, log);
  // Les nouvelles en route arrivent à leur heure (L2-L3, MEMOIRE.md). Les
  // villes qui apprennent retiennent par leurs notables — l'outil vient de
  // services.js, que faits.js précède dans l'ordre des modules.
  tickFaits(state, log, { retenirEnVille });
  // Les frictions de la cour (F1+F2, MARECHAL.md) : la relève des comptes à
  // la succession, et le bouc émissaire du chef contesté. AVANT tickCharges,
  // pour qu'une relecture qui vide le crédit coûte la charge la même heure —
  // on se couche Maréchal, on se réveille Commandeur.
  tickCour(state, log);
  // L'oubli tombe au conseil du porteur (L5c) : après la cour — une
  // succession repèse d'abord, le nouveau maître classe ensuite à SA séance.
  tickOubli(state, log);
  tickCharges(state, log);
  tickFormation(state, log);
  // Et ce que le monde a fait à votre argent pendant ce temps. En dernier :
  // les cours ne bougent qu'au conseil, mais on relève après que tout a bougé.
  veillerMonnaies(state, log);

  state.player.rngEtat = rngJoueur.save();
  ctx.rng = rng;

  // La page du récit, une fois l'heure jouée : le chapitre se déduit de
  // l'état, les fils personnels se confrontent à ce qui vient d'être vécu —
  // rien ne tire, rien n'écrit côté monde (HISTOIRE.md, lots A et C).
  tickChapitres(state, log);
  tickFils(state, log);
  tickMemoireLieux(state, log);

  // En dernier : on relève ce qu'on a sous les yeux, après que tout a bougé.
  // Les prix du moment partent au carnet (U7) : economy les calcule,
  // connaissance les range — l'ordre des modules interdit l'import direct.
  observer(state, prixReleves);

  state.rngState = rng.save();
  return state;
}

/** Enchaîne `n` heures. Retourne le nombre de ticks réellement joués. */
export function avancer(state, n) {
  let joues = 0;
  for (let i = 0; i < n; i++) {
    // La fin n'arrête plus le temps : le monde tourne sans vous — c'est même
    // tout le jeu. On regarde, on peut engager quelqu'un, et ça repart.
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
  // Le monde n'a pas tourné pendant l'absence : rien à rejouer, et l'horloge
  // reprend d'ici — `gele` dit aux appelants de recaler `dernierReel`, faute
  // de quoi l'absence s'accumulerait en dette et resurgirait au réglage suivant.
  //
  // Le seuil est essentiel : cette même fonction fait avancer l'horloge du jeu
  // EN DIRECT, toutes les quatre cents millisecondes. Sans lui, éteindre le
  // rattrapage éteignait la partie elle-même — la suite navigateur me l'a
  // rendu tout de suite, « l'horloge avance en temps réel, 0 → 0 ». Jouer,
  // ce n'est pas être absent : en deçà du seuil, le temps passe toujours.
  if (ecoule > SEUIL_ABSENCE_MS && (!state.reglages || !state.reglages.rattrapage)) {
    return { ticks: 0, tronque: false, pas, gele: true };
  }
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
  const { ticks, tronque, pas, gele } = rattrapageDu(state, maintenantMs);
  if (gele) {
    state.dernierReel = maintenantMs;
    return { ticks: 0, tronque: false };
  }
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
  if (plan.gele) {
    state.dernierReel = maintenantMs;
    return { total: 0, tronque: false, faits: () => 0, pas: () => false };
  }
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
      a: drapeauDe(state.world, g.a).nom,
      b: drapeauDe(state.world, g.b).nom,
      depuis: g.depuis,
      batailles: g.batailles,
    })),
    armees: w.armees.map((a) => ({
      faction: drapeauDe(state.world, a.faction).nom,
      couleur: drapeauDe(state.world, a.faction).couleur,
      force: a.force,
      etat: a.etat,
      lieu: nomRegion(w, a.regionId),
      cible: a.cible ? (colonieParId(w, a.cible) || {}).nom : null,
    })),
  };
}
