// Saisons et météo. Le monde n'a pas la même tête en pleine saison sèche
// qu'au milieu d'un hiver de cendre : les rendements, la marche, les aléas et
// même la fréquence des rencontres en dépendent.

import { BIOMES } from './data.js';

export const JOURS_PAR_SAISON = 30;
export const HEURES_PAR_SAISON = JOURS_PAR_SAISON * 24;

/**
 * Quatre saisons de trente jours. Les multiplicateurs s'appliquent par famille
 * de ressource, pas par ressource : une saison ne doit pas demander de
 * connaître le catalogue.
 */
export const SAISONS = {
  accalmie: {
    nom: 'Accalmie',
    court: 'ACCALMIE',
    texte: 'Le ciel tient. Ça ne dure jamais bien longtemps.',
    couleur: '#6be08a',
    vivant: 1.1,      // biomasse
    mineral: 1.0,     // minerai, ferraille, alliage, isotope
    marche: 1.0,      // coût de déplacement
    aleas: 0.85,      // fréquence des aléas de biome
    rencontres: 1.0,
    faim: 1.0,
  },
  seche: {
    nom: 'Saison sèche',
    court: 'SÈCHE',
    texte: 'La poussière entre partout. Les filons affleurent, le vivant se cache.',
    couleur: '#d9a03a',
    vivant: 0.82,
    mineral: 1.2,
    marche: 0.95,
    aleas: 1.15,
    rencontres: 1.15,
    faim: 1.15,
  },
  pluies: {
    nom: 'Grandes pluies',
    court: 'PLUIES',
    texte: 'L’eau ronge le métal et fait pousser ce qui n’aurait pas dû.',
    couleur: '#4fd0e3',
    vivant: 1.35,
    mineral: 0.85,
    marche: 1.2,
    aleas: 1.3,
    rencontres: 0.85,
    faim: 0.95,
  },
  cendres: {
    nom: 'Hiver de cendre',
    court: 'CENDRES',
    texte: 'Le ciel est bas et gris. On mange les réserves, ou on ne mange pas.',
    couleur: '#8a8f9a',
    vivant: 0.66,
    mineral: 0.95,
    marche: 1.3,
    aleas: 1.4,
    rencontres: 0.8,
    faim: 1.15,
  },
};

/**
 * Ce que la saison fait au SOL, biome par biome (GEOGRAPHIE.md, G3).
 *
 * `conditions` ne rendait qu'une saison et une météo pour quatre cent trente-
 * deux cases : la saison multipliait le monde entier par un nombre, et il ne
 * pleuvait jamais ici sans pleuvoir là-bas. Un ciel de carton.
 *
 * Ce qui manquait n'est pas plus de météo, c'est que la saison agisse
 * DIFFÉREMMENT selon le terrain. Le marais impraticable aux pluies, le désert
 * acide qui se referme l'été. Alors la meilleure route change avec les mois et
 * le territoire se renégocie tout seul, sans qu'aucun agent ait à le vouloir —
 * c'est le mariage naturel de T1 : un voyageur qui pèse ce qu'il craint doit
 * craindre des choses qui changent, sinon il calcule une fois pour toutes.
 *
 * Un multiplicateur de coût de traversée. Absent = 1, et l'accalmie ne coûte
 * rien à personne : c'est la saison où l'on circule.
 */
export const SAISON_BIOME = {
  accalmie: {},
  seche: {
    // La poussière et l'acide : ce qui est déjà sec devient hostile.
    desert: 1.7,
    brulees: 1.45,
    // Et le marais s'assèche — la seule saison où l'on y passe bien.
    marais: 0.7,
  },
  pluies: {
    // L'eau monte : le marais se ferme, la mer de plastique devient une soupe.
    marais: 2.1,
    plastique: 1.5,
    canyons: 1.35,
    // Les dalles urbaines drainent : on y circule mieux qu'ailleurs.
    dalles: 0.85,
  },
  cendres: {
    // Le ciel bas : on ne voit pas où l'on met les pieds dans les reliefs.
    canyons: 1.4,
    friche: 1.2,
    steppe: 1.15,
  },
};

/** Ce que cette saison fait à ce sol. Un, si elle ne lui fait rien. */
export function coutSaison(saisonKey, biome) {
  const t = SAISON_BIOME[saisonKey];
  return (t && t[biome]) || 1;
}

export const ORDRE_SAISONS = ['accalmie', 'seche', 'pluies', 'cendres'];

/** Une année de jeu : quatre saisons de trente jours. Tout ce qui vieillit s'y
 *  rapporte — sans ça, on fait vieillir les gens trois fois trop lentement. */
export const HEURES_PAR_AN = HEURES_PAR_SAISON * ORDRE_SAISONS.length;

/** Saison courante, déduite de l'horloge : rien à stocker, rien à désynchroniser. */
export function saison(t) {
  const index = Math.floor(t / HEURES_PAR_SAISON) % ORDRE_SAISONS.length;
  const key = ORDRE_SAISONS[index];
  const jour = Math.floor((t % HEURES_PAR_SAISON) / 24) + 1;
  const annee = Math.floor(t / (HEURES_PAR_SAISON * ORDRE_SAISONS.length)) + 1;
  return { key, index, jour, annee, def: SAISONS[key] };
}

// ---------------------------------------------------------------------------
// Météo
// ---------------------------------------------------------------------------
// Elle change toutes les quelques heures et vaut pour toute la carte : une
// tempête est un événement du monde, pas une propriété de case.

export const METEO = {
  clair: {
    nom: 'Ciel dégagé',
    texte: 'Visibilité franche jusqu’à l’horizon.',
    couleur: '#c6cedb',
    rendement: 1.0, marche: 1.0, aleas: 1.0, rencontres: 1.0, vue: 1.3,
    soleil: 1.25, vent: 0.8,
  },
  couvert: {
    nom: 'Couvert',
    texte: 'Un plafond bas, sans caractère.',
    couleur: '#7b8699',
    rendement: 1.0, marche: 1.0, aleas: 1.0, rencontres: 1.0, vue: 1.0,
    soleil: 0.8, vent: 0.9,
  },
  vent_cendre: {
    nom: 'Vent de cendre',
    texte: 'La cendre rentre dans les yeux, les filtres, les plaies.',
    couleur: '#8a8f9a',
    rendement: 0.75, marche: 1.25, aleas: 1.4, rencontres: 0.7, vue: 0.4,
    soleil: 0.35, vent: 1.6,
  },
  pluie_acide: {
    nom: 'Pluie acide',
    texte: 'Ça grésille sur les armures. Rester dehors coûte.',
    couleur: '#b06be0',
    rendement: 0.65, marche: 1.15, aleas: 1.8, rencontres: 0.6, vue: 0.7,
    soleil: 0.5, vent: 1.1,
  },
  brouillard: {
    nom: 'Brouillard statique',
    texte: 'Le brouillard porte du signal. Personne ne voit personne.',
    couleur: '#4fd0e3',
    rendement: 0.85, marche: 1.3, aleas: 1.1, rencontres: 0.45, vue: 0.2,
    soleil: 0.3, vent: 0.5,
  },
  orage_sec: {
    nom: 'Orage sec',
    texte: 'Des éclairs sans une goutte d’eau. Le métal chante.',
    couleur: '#e0d36b',
    rendement: 0.9, marche: 1.1, aleas: 1.5, rencontres: 0.9, vue: 0.9,
    soleil: 0.85, vent: 1.45,
  },
  canicule: {
    nom: 'Canicule',
    texte: 'L’air tremble au ras du sol. On travaille moins, on boit plus.',
    couleur: '#e05b5b',
    rendement: 0.8, marche: 1.2, aleas: 1.3, rencontres: 1.0, vue: 1.1,
    soleil: 1.35, vent: 0.6,
  },
};

export const METEO_KEYS = Object.keys(METEO);

/** Probabilités de météo selon la saison : chaque saison a son répertoire. */
const REPERTOIRE = {
  accalmie: [['clair', 5], ['couvert', 3], ['vent_cendre', 1], ['orage_sec', 1], ['brouillard', 0.8]],
  seche: [['clair', 4], ['canicule', 4], ['orage_sec', 2], ['vent_cendre', 2], ['couvert', 1.5]],
  pluies: [['pluie_acide', 5], ['couvert', 3], ['brouillard', 2.5], ['orage_sec', 1.5], ['clair', 1]],
  cendres: [['vent_cendre', 5], ['couvert', 4], ['brouillard', 2], ['clair', 1.2], ['orage_sec', 1]],
};

export function creerMeteo(rng, t) {
  const s = saison(t);
  return {
    type: rng.weighted(REPERTOIRE[s.key]),
    restant: rng.irange(5, 22),
  };
}

/**
 * Une heure de climat. Retourne une entrée de journal si le temps a tourné,
 * sinon null — un changement de météo mérite d'être dit.
 */
export function tickClimat(world, t, rng) {
  // Le monde retient sa saison : `chemin` la lit à chaque arête et n'a pas à
  // la recalculer une fois par case (GEOGRAPHIE.md, G3).
  world.saisonKey = saison(t).key;
  // L'heure du monde, pour ce qui doit dater un fait sans qu'on la lui passe
  // de main en main sur dix appels (GEOGRAPHIE.md, G5).
  world.heure = t;
  if (!world.meteo) {
    world.meteo = creerMeteo(rng, t);
    return null;
  }
  world.meteo.restant -= 1;
  if (world.meteo.restant > 0) return null;

  const avant = world.meteo.type;
  const suivant = creerMeteo(rng, t);
  world.meteo = suivant;
  if (suivant.type === avant) return null;
  return {
    type: 'meteo',
    texte: `${METEO[suivant.type].nom}. ${METEO[suivant.type].texte}`,
  };
}

// ---------------------------------------------------------------------------
// Effets combinés
// ---------------------------------------------------------------------------

const MINERAUX = new Set(['minerai', 'ferraille', 'alliage', 'isotope', 'composant']);

/** Multiplicateurs applicables ici et maintenant. */
export function conditions(world, t) {
  const s = saison(t);
  const m = METEO[world.meteo ? world.meteo.type : 'couvert'];
  return {
    saison: s,
    meteo: m,
    meteoKey: world.meteo ? world.meteo.type : 'couvert',
    marche: s.def.marche * m.marche,
    aleas: s.def.aleas * m.aleas,
    rencontres: s.def.rencontres * m.rencontres,
    faim: s.def.faim,
    vue: m.vue,
    /** Rendement d'une ressource donnée, saison et météo comprises. */
    rendement(k) {
      const famille = MINERAUX.has(k) ? s.def.mineral : s.def.vivant;
      return famille * m.rendement;
    },
  };
}

/** Résumé court pour l'en-tête. */
export function resumeClimat(world, t) {
  const c = conditions(world, t);
  return {
    saison: c.saison.def.court,
    couleurSaison: c.saison.def.couleur,
    jour: c.saison.jour,
    annee: c.saison.annee,
    meteo: c.meteo.nom,
    couleurMeteo: c.meteo.couleur,
  };
}
