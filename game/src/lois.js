// Ce qu'une faction s'autorise, et ce que ça lui coûte.
//
// Module feuille, volontairement : les lois sont lues par le conseil
// (factions.js) autant que par la justice (justice.js), et si elles vivaient
// dans l'un des deux, l'autre créerait un cycle d'import. Elles ne dépendent
// donc de rien — ce sont des chiffres et trois fonctions pures.
//
// Aucune loi n'est gratuite : chacune achète quelque chose et se paie ailleurs.
// C'est tout l'intérêt d'avoir le grade qui les fixe.

/**
 * Ce qu'un Commandeur peut décider, et ce que ça fait. Aucune loi n'est
 * gratuite : chacune achète quelque chose et se paie ailleurs. C'est tout
 * l'intérêt d'avoir le grade qui les fixe.
 */
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
 * gratuitement mais retient un huitième de vos ventes ; la Franchise ne donne
 * rien et ne prend presque rien. Le Domaine est le plus dur — on n'y possède
 * pas, l'école est réservée à ceux qui servent — mais c'est le seul endroit où
 * l'on sort les bonnes armes pour n'importe qui.
 */
export const REGIMES = {
  franchise: {
    nom: 'Franchise',
    desc: 'On y achète tout, on n’y reçoit rien. Le négoce est presque libre.',
    propriete: 25,
    ecole: 'payante',
    soins: 'estime',
    preleve: 0.02,
    palier: 0,
  },
  charte: {
    nom: 'Charte',
    desc: 'Le régime ordinaire : on possède si l’on est connu, on paie ses services.',
    propriete: 40,
    ecole: 'payante',
    soins: 'estime',
    preleve: 0.05,
    palier: 0,
  },
  commune: {
    nom: 'Commune',
    desc: 'École et médecin pour tous, rien à posséder, et l’on prend sa part.',
    propriete: null,
    ecole: 'libre',
    soins: 'tous',
    preleve: 0.12,
    palier: 0,
  },
  domaine: {
    nom: 'Domaine',
    desc: 'Tout est au seigneur. Mais son armurier sort ce qu’il garde derrière.',
    propriete: null,
    ecole: 'maison',
    soins: 'estime',
    preleve: 0.09,
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
  if (!f) return { peine: 'ferme', esclavage: false, impot: 0.05, regime: 'charte' };
  if (!f.lois) {
    f.lois = {
      peine: 'ferme',
      // Aucune faction ne commence esclavagiste : c'est une décision qu'on
      // prend, pas un état de fait qu'on subit.
      esclavage: false,
      impot: 0.05,
      // Le régime ordinaire : on n'invente pas un monde de communes.
      regime: 'charte',
    };
  }
  // Les parties commencées avant les régimes n'en ont pas : on pose l'ordinaire.
  if (!f.lois.regime) f.lois.regime = 'charte';
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

