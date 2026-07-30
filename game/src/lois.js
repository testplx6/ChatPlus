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
  if (!f) return { peine: 'ferme', esclavage: false, impot: 0.05 };
  if (!f.lois) {
    f.lois = {
      peine: 'ferme',
      // Aucune faction ne commence esclavagiste : c'est une décision qu'on
      // prend, pas un état de fait qu'on subit.
      esclavage: false,
      impot: 0.05,
    };
  }
  return f.lois;
}

/** Ce que la loi permet ici, sur la case où l'on se trouve. */
export function loiIci(state, col) {
  if (!col || !col.faction) {
    // Une ville sans drapeau ne connaît que la loi du plus fort. On y vend ce
    // qu'on veut, et personne ne délivre de prime.
    return { peine: PEINES.expeditive, esclavage: true, sansLoi: true, faction: null };
  }
  const l = loisDe(state.world, col.faction);
  return {
    peine: PEINES[l.peine] || PEINES.ferme,
    esclavage: !!l.esclavage,
    sansLoi: false,
    faction: col.faction,
  };
}

