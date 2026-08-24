// Ce qu'une faction s'autorise, et ce que ça lui coûte.
//
// Module feuille, volontairement : les lois sont lues par le conseil
// (factions.js) autant que par la justice (justice.js), et si elles vivaient
// dans l'un des deux, l'autre créerait un cycle d'import. Elles ne dépendent
// donc de rien — ce sont des chiffres et trois fonctions pures.
//
// Aucune loi n'est gratuite : chacune achète quelque chose et se paie ailleurs.
// C'est tout l'intérêt d'avoir le grade qui les fixe.
//
// Seule entorse à la règle du module feuille : `data.js`, qui n'est que des
// constantes et qui précède tout le monde. Il fallait bien savoir de quel
// drapeau on parle pour dire sous quel régime il commence.

import { FACTIONS, drapeauDe } from './data.js';

/**
 * Ce qu'un Commandeur peut décider, et ce que ça fait. Aucune loi n'est
 * gratuite : chacune achète quelque chose et se paie ailleurs. C'est tout
 * l'intérêt d'avoir le grade qui les fixe.
 */
/**
 * La discipline de solde (PROMESSES.md, P5) : ce qu'un pays fait d'un soldat
 * qui laisse traîner son ordre. Une loi comme les autres — elle naît de la
 * culture du drapeau et vit ensuite sa vie (conseils, législateur).
 * `patience` en multiples de la route de la mission ; null = on paie
 * toujours. `rancune` : au-delà, on n'oublie pas — l'estime s'érode.
 */
export const DISCIPLINES = {
  stricte: { nom: 'Stricte', patience: 2, texte: 'l’armée ne paie pas les absents' },
  comptable: { nom: 'Comptable', patience: 3, texte: 'le compte se ferme quand le contrat dort' },
  tolerante: { nom: 'Tolérante', patience: null, texte: 'la paie tombe tant qu’on est des leurs' },
  rancuniere: { nom: 'Rancunière', patience: null, rancune: 3, texte: 'on ne suspend rien — on n’oublie pas' },
};

/** Le point de départ culturel — la loi vivra sa vie ensuite. */
export function disciplineInitiale(style) {
  return {
    militaire: 'stricte',
    fanatique: 'stricte',
    corpo: 'comptable',
    nomade: 'comptable',
    commune: 'tolerante',
    criminel: 'rancuniere',
  }[style] || 'comptable';
}

export const PEINES = {
  legere: {
    nom: 'Clémente',
    desc: 'On enferme peu et on relâche vite. Les geôles restent vides.',
    prime: 0.6,
    duree: 120,
    // Ce que la sévérité fait à l'ordre public et aux pistes.
    ordre: -0.02,
    routes: 0.6,
  },
  ferme: {
    nom: 'Ferme',
    desc: 'On enferme, on juge, on garde. La règle par défaut.',
    prime: 1,
    duree: 400,
    ordre: 0,
    routes: 1,
  },
  expeditive: {
    nom: 'Expéditive',
    desc: 'On juge vite et on pend. Les routes sont sûres, la ville a peur.',
    prime: 1.35,
    duree: 60,
    ordre: 0.05,
    routes: 1.5,
  },
};

export const PEINE_KEYS = Object.keys(PEINES);

/**
 * Ce qu'on prélève. Le trésor d'une faction paie les colonnes, les murs et les
 * greniers : le taux décide donc directement de ce qu'un officier pourra
 * ordonner. Et il se paie en désordre, ce qui décide de ce qu'il aura à tenir.
 */
export const IMPOTS = [
  { key: 'leger', nom: 'Léger', taux: 0.03, desc: 'On prélève peu. Les villes respirent, le trésor maigrit.' },
  { key: 'ordinaire', nom: 'Ordinaire', taux: 0.05, desc: 'Ce que tout le monde fait, et que personne n’aime.' },
  { key: 'lourd', nom: 'Lourd', taux: 0.09, desc: 'Le trésor gonfle. Les villes s’en souviennent.' },
  { key: 'confiscatoire', nom: 'Confiscatoire', taux: 0.15, desc: 'On prend tout. On tiendra ce qu’on pourra.' },
];

/**
 * Le taux directeur : le prix auquel une faction prête à ses villes.
 *
 * Une banque centrale sans taux directeur n'en est pas une, et celui-ci n'a
 * rien de décoratif — c'est lui qui commande la quantité de monnaie qui entre
 * en circulation par le crédit. Quatre effets, tous réels :
 *
 *   1. l'intérêt sur la dette des villes, qui est une recette du créancier ;
 *   2. le seuil au-delà duquel une ville n'emprunte plus pour bâtir ;
 *   3. l'insolvabilité elle-même — une ville est ruinée quand son intérêt
 *      dépasse ce qu'elle peut rembourser, donc monter le taux ruine
 *      littéralement ses débiteurs ;
 *   4. et, par là, le rythme des défauts.
 *
 * Monter le taux défend la caisse et étrangle le pays ; le baisser nourrit les
 * villes et vide le trésor. C'est le dilemme entier d'une banque centrale, en un
 * curseur, et il appartient au joueur dès qu'il est assez gradé.
 */
export const DIRECTEURS = [
  { key: 'accommodant', nom: 'Accommodant', taux: 0.01, desc: 'L’argent est bon marché : les villes empruntent, mangent et bâtissent.' },
  { key: 'ordinaire', nom: 'Ordinaire', taux: 0.02, desc: 'Le loyer de l’argent, sans intention particulière.' },
  { key: 'ferme', nom: 'Ferme', taux: 0.04, desc: 'On rembourse plus qu’on n’emprunte. Les chantiers s’arrêtent.' },
  { key: 'etouffant', nom: 'Étouffant', taux: 0.07, desc: 'On tient la caisse et l’on étrangle le pays.' },
];

/**
 * Le palier qu'un dirigeant pose par défaut. La main sur la bourse d'autrui —
 * `fisc` — dit aussi ce qu'on pense du crédit : qui prélève lourd prête cher.
 */
export function directeurInitial(temperament) {
  const f = temperament ? temperament.fisc : 1;
  if (f >= 1.4) return DIRECTEURS[3].taux;
  if (f >= 1.1) return DIRECTEURS[2].taux;
  if (f >= 0.85) return DIRECTEURS[1].taux;
  return DIRECTEURS[0].taux;
}

/**
 * Le régime d'une faction : ce qu'on a le droit de faire chez elle.
 *
 * Les trois lois précédentes réglaient ce que la faction se fait à elle-même —
 * ses geôles, sa caisse, ses esclaves. Celle-ci règle ce que *vous* pouvez y
 * faire, et c'est la première qui vous concerne comme visiteur plutôt que comme
 * sujet. Chaque régime touche des choses concrètes, et rien de décoratif :
 *
 *   propriete    l'estime qu'il faut pour posséder un coffre ; `null` = jamais
 *   ecole        `libre` (gratuite), `payante`, ou `maison` (réservée aux siens)
 *   soins        `tous` ou `estime` (le médecin ne soigne que qui il apprécie)
 *   preleve      la part retenue sur ce que vous vendez dans leurs villes
 *   palier       ce que l'armurier consent à sortir de derrière
 *
 * Ce qu'un régime donne, il le reprend ailleurs : la Commune soigne et instruit
 * gratuitement mais retient le plus sur vos ventes ; la Franchise ne donne rien
 * et ne prend presque rien. Le Domaine est le plus dur — on n'y possède pas,
 * l'école est réservée à ceux qui servent — mais c'est le seul endroit où l'on
 * sort les bonnes armes pour n'importe qui.
 *
 * Les taux ont été divisés par deux après mesure, et c'est le banc qui l'a
 * imposé. À 2 / 5 / 12 / 9 %, le bot ordinaire perdait 41 % de son patrimoine
 * médian et **deux escouades sur trente mouraient** — une retenue de 8 % sur
 * les ventes brutes suffisait à faire basculer une partie déjà tendue, parce
 * que l'argent non gagné ne se contente pas de manquer : il ne devient ni
 * matériel, ni bêtes, ni soins, et le retard compose. À 1 / 2 / 8 / 5 %, plus
 * aucune extinction, et le régime retient 5,6 % de ce que les ventes auraient
 * rapporté sans lui — assez pour que le choix de la ville compte, pas assez
 * pour tuer.
 *
 * Ce que le banc ne mesure pas, et qu'il faut garder en tête : le bot ne va
 * jamais à l'école et ne se fait pas soigner en ville. Il ne touche donc que le
 * côté coûteux d'une Commune, jamais ce qu'elle rend.
 */
export const REGIMES = {
  franchise: {
    nom: 'Franchise',
    desc: 'On y achète tout, on n’y reçoit rien. Le négoce est presque libre.',
    propriete: 25,
    ecole: 'payante',
    soins: 'estime',
    preleve: 0.01,
    palier: 0,
  },
  charte: {
    nom: 'Charte',
    desc: 'Le régime ordinaire : on possède si l’on est connu, on paie ses services.',
    propriete: 40,
    ecole: 'payante',
    soins: 'estime',
    preleve: 0.02,
    palier: 0,
  },
  commune: {
    nom: 'Commune',
    desc: 'École et médecin pour tous, rien à posséder, et l’on prend sa part.',
    propriete: null,
    ecole: 'libre',
    soins: 'tous',
    preleve: 0.08,
    palier: 0,
  },
  domaine: {
    nom: 'Domaine',
    desc: 'Tout est au seigneur. Mais son armurier sort ce qu’il garde derrière.',
    propriete: null,
    ecole: 'maison',
    soins: 'estime',
    preleve: 0.05,
    palier: 1,
  },
  // Pas un vote : l'état d'une ville que personne ne tient. Voir `loiIci`.
  libre: {
    nom: 'Ville libre',
    desc: 'Personne n’interdit rien, personne ne donne rien.',
    propriete: 0,
    ecole: 'payante',
    soins: 'estime',
    preleve: 0,
    palier: 0,
  },
};

export const REGIME_KEYS = ['franchise', 'charte', 'commune', 'domaine'];

/**
 * Le régime que chaque faction pratique en commençant.
 *
 * Un conseil peut en changer (voir `regimeVise` dans factions.js), mais il faut
 * bien partir de quelque part, et tirer au sort donnerait un monde où l'on ne
 * reconnaît rien. Ici chaque drapeau commence par ce que sa devise annonce :
 * « Rien n'est interdit, tout est tarifé » ouvre une Franchise, « L'ordre, ou la
 * cendre » tient un Domaine, et les Communes Libres n'ont pas volé leur nom.
 *
 * Effet de bord voulu : les quatre régimes existent dès la première heure de
 * jeu. Un régime que personne ne pratique est une ligne de code que personne ne
 * rencontre.
 */
export const REGIME_PAR_STYLE = {
  corpo: 'franchise',
  criminel: 'franchise',
  nomade: 'charte',
  fanatique: 'domaine',
  militaire: 'domaine',
  commune: 'commune',
};

export function regimeInitial(faction, world = null) {
  const f = drapeauDe(world, faction);
  return (f && REGIME_PAR_STYLE[f.style]) || 'charte';
}

/** Le désordre qu'un taux d'impôt ajoute par heure à une ville. */
export function pressionFiscale(world, faction) {
  const t = loisDe(world, faction).impot;
  // En dessous d'ordinaire, l'impôt calme ; au-dessus, il pèse, et de plus en
  // plus vite : doubler le taux fait bien plus que doubler la grogne.
  return ((t - 0.05) ** 3) * 900;
}

/** Les lois d'une faction, avec leurs valeurs par défaut. */
export function loisDe(world, faction) {
  const f = world.factions[faction];
  if (!f) return { peine: 'ferme', esclavage: false, impot: 0.05, regime: 'charte', directeur: 0.02 };
  if (!f.lois) {
    f.lois = {
      peine: 'ferme',
      // Aucune faction ne commence esclavagiste : c'est une décision qu'on
      // prend, pas un état de fait qu'on subit.
      esclavage: false,
      impot: 0.05,
      // Le régime, lui, préexiste au joueur : une faction gouverne déjà d'une
      // certaine manière le jour où il arrive.
      regime: regimeInitial(faction, world),
      // Et le loyer de l'argent, que son chef a fixé selon son caractère. Posé
      // à l'ordinaire ici : le premier conseil le corrigera au tempérament du
      // dirigeant, qui n'existe pas encore quand ces lois se créent.
      directeur: DIRECTEURS[1].taux,
    };
  }
  // Les parties commencées avant les régimes n'en ont pas.
  if (!f.lois.regime) f.lois.regime = regimeInitial(faction, world);
  // Ni avant le taux directeur.
  if (f.lois.directeur === undefined) f.lois.directeur = DIRECTEURS[1].taux;
  // Ni avant la discipline de solde (P5) : elle naît de la culture — le
  // style vit sur le drapeau, pas sur l'entrée de la faction.
  if (!f.lois.discipline) {
    const drapeau = drapeauDe(world, faction);
    f.lois.discipline = disciplineInitiale(drapeau && drapeau.style);
  }
  return f.lois;
}

/** Ce que la loi permet ici, sur la case où l'on se trouve. */
export function loiIci(state, col) {
  if (!col || !col.faction) {
    // Une ville sans drapeau ne connaît que la loi du plus fort. On y vend ce
    // qu'on veut, et personne ne délivre de prime.
    return {
      peine: PEINES.expeditive, esclavage: true, sansLoi: true, faction: null,
      regime: REGIMES.libre,
    };
  }
  const l = loisDe(state.world, col.faction);
  return {
    peine: PEINES[l.peine] || PEINES.ferme,
    esclavage: !!l.esclavage,
    sansLoi: false,
    faction: col.faction,
    regime: REGIMES[l.regime] || REGIMES.charte,
  };
}

