// Qui décide, dans une faction.
//
// Jusqu'ici une faction délibérait comme une moyenne : une agression fixe, une
// cupidité fixe, tirées à la génération et jamais revues. Elle a maintenant
// quelqu'un à sa tête, avec un nom, un âge, un tempérament et une légitimité.
//
// Ce que ça change tient en une phrase : les guerres ont une raison et une fin.
// Un conquérant déclare des guerres qu'un prudent n'aurait pas déclarées ; un
// rancunier ne signe pas la trêve qu'un conciliateur aurait signée ; un
// bâtisseur pousse des postes pendant que les autres se battent. Et comme il
// perd sa place quand il perd ses villes, la politique d'une faction change au
// cours d'une partie sans que rien d'autre n'ait bougé.

import { FACTIONS, NOMS_PERSO } from './data.js';
import { idDepuisRng } from './characters.js';
import { HEURES_PAR_AN } from './climat.js';

/** Le titre qu'on porte, selon ce qu'on dirige. */
export const TITRES = {
  corpo: 'Directeur',
  nomade: 'Chef de convoi',
  fanatique: 'Voix du Signal',
  criminel: 'Parrain',
  militaire: 'Commandant',
  commune: 'Porte-parole',
  essaim: 'Rien',
};

/**
 * Les tempéraments. Chaque coefficient multiplie une décision du conseil, et
 * seulement celle-là : c'est ce qui rend l'effet lisible en jeu plutôt que
 * dilué dans une moyenne.
 */
/**
 * Un tempérament ne dit pas seulement comment on fait la guerre : il dit aussi
 * ce qu'on prélève, ce qu'on punit et ce qu'on s'autorise. Les trois derniers
 * champs sont la politique intérieure — `fisc` la main sur la bourse d'autrui,
 * `severite` celle sur la corde, `humain` ce qui retient d'ouvrir un marché
 * d'hommes. Ils valent 1 pour un chef sans caractère particulier.
 */
export const TEMPERAMENTS = {
  conquerant: {
    nom: 'Conquérant', guerre: 1.6, treve: 0.55, expansion: 0.8, colonne: 1.25,
    fisc: 1.3, severite: 1.3, humain: 0.8,
    mot: 'Une carte, ça se redessine.',
  },
  prudent: {
    nom: 'Prudent', guerre: 0.45, treve: 1.6, expansion: 1.1, colonne: 0.85,
    fisc: 0.9, severite: 1.05, humain: 1.05,
    mot: 'On ne meurt pas d’avoir attendu.',
  },
  batisseur: {
    nom: 'Bâtisseur', guerre: 0.6, treve: 1.35, expansion: 1.9, colonne: 0.9,
    fisc: 1.15, severite: 0.95, humain: 1.1,
    mot: 'Ce qu’on pose reste. Ce qu’on prend se reprend.',
  },
  rancunier: {
    nom: 'Rancunier', guerre: 1.3, treve: 0.35, expansion: 0.9, colonne: 1.1,
    fisc: 1.0, severite: 1.6, humain: 0.75,
    mot: 'Je n’oublie rien. C’est tout mon travail.',
  },
  conciliateur: {
    nom: 'Conciliateur', guerre: 0.5, treve: 1.9, expansion: 1.2, colonne: 0.8,
    fisc: 0.75, severite: 0.6, humain: 1.35,
    mot: 'Tout se négocie, même ce qui ne se négocie pas.',
  },
  rapace: {
    nom: 'Rapace', guerre: 1.2, treve: 0.9, expansion: 1.4, colonne: 1.15,
    fisc: 1.55, severite: 1.1, humain: 0.5,
    mot: 'Ce qui n’est à personne est à moi.',
  },
  methodique: {
    nom: 'Méthodique', guerre: 0.9, treve: 1.0, expansion: 1.15, colonne: 1.3,
    fisc: 1.05, severite: 1.0, humain: 1.0,
    mot: 'On ne lève pas une colonne sans savoir ce qu’elle rapporte.',
  },
};

const TEMPERAMENT_KEYS = Object.keys(TEMPERAMENTS);

/** Ce vers quoi chaque tempérament de faction penche au moment de choisir. */
const PENCHANT = {
  corpo: ['methodique', 'rapace', 'conciliateur'],
  nomade: ['rapace', 'prudent', 'batisseur'],
  fanatique: ['conquerant', 'rancunier', 'conquerant'],
  criminel: ['rapace', 'rancunier', 'methodique'],
  militaire: ['conquerant', 'methodique', 'rancunier'],
  commune: ['batisseur', 'conciliateur', 'prudent'],
};

/** En dessous, on ne tient plus : quelqu'un prend la place. */
export const LEGITIMITE_CRITIQUE = 25;

/**
 * Ce vers quoi une maison se tourne après un échec, selon lequel. On ne succède
 * pas de la même façon à quelqu'un qui a fait gronder le pays et à quelqu'un
 * qui a perdu des villes : le premier appelle une main plus douce, le second
 * une main plus dure. C'est ce qui fait qu'une faction oscille au lieu de
 * dériver toujours dans le même sens.
 */
const APRES = {
  grogne: ['conciliateur', 'prudent', 'batisseur', 'methodique'],
  faiblesse: ['conquerant', 'rancunier', 'rapace', 'methodique'],
};

export function creerDirigeant(rng, key, t, apres) {
  const style = FACTIONS[key] ? FACTIONS[key].style : null;
  const penchant = APRES[apres] || PENCHANT[style] || TEMPERAMENT_KEYS;
  // Deux fois sur trois on prend quelqu'un dans la ligne de la maison ; sinon
  // n'importe qui, et c'est là que les factions se surprennent elles-mêmes.
  const temperament = rng.chance(0.68) ? rng.pick(penchant) : rng.pick(TEMPERAMENT_KEYS);
  return {
    id: idDepuisRng(rng, 'd'),
    nom: rng.pick(NOMS_PERSO),
    titre: TITRES[style] || 'Chef',
    temperament,
    age: rng.irange(34, 64),
    depuis: t,
    legitimite: rng.irange(48, 72),
    // Ce qu'on lui reproche : le désordre plutôt que la défaite. Sert à choisir
    // dans quel vivier on prendra son successeur.
    grogne: 0,
    guerres: 0,
    prises: 0,
    pertes: 0,
  };
}

export function dirigeant(world, key) {
  const f = world.factions[key];
  return (f && f.dirigeant) || null;
}

/** Le coefficient d'une décision, ou 1 si personne ne dirige. */
export function penchant(world, key, quoi) {
  const d = dirigeant(world, key);
  if (!d) return 1;
  const t = TEMPERAMENTS[d.temperament];
  if (!t) return 1;
  const base = t[quoi] ?? 1;
  // Un chef contesté décide moins bien : ni guerre franche, ni paix nette.
  const assise = 0.7 + Math.min(1, d.legitimite / 100) * 0.45;
  return 1 + (base - 1) * assise;
}

/** Une victoire assoit, une perte ronge. C'est ce qui fait tomber les chefs. */
export function crediterDirigeant(world, key, quoi, n = 1) {
  const d = dirigeant(world, key);
  if (!d) return;
  if (quoi === 'prise') { d.prises += n; d.legitimite = Math.min(100, d.legitimite + 9 * n); }
  else if (quoi === 'perte') { d.pertes += n; d.legitimite = Math.max(0, d.legitimite - 13 * n); }
  else if (quoi === 'guerre') { d.guerres += n; }
  else if (quoi === 'paix') { d.legitimite = Math.max(0, d.legitimite - 3 * n); }
  else if (quoi === 'fondation') { d.legitimite = Math.min(100, d.legitimite + 6 * n); }
}

// ---------------------------------------------------------------------------
// Buts de guerre
// ---------------------------------------------------------------------------

/**
 * Une guerre déclarée sans objet ne peut ni être gagnée ni être perdue : elle
 * s'arrête quand elle coûte trop cher, ce qui donne une chronique illisible.
 * On lui donne donc une raison, tirée du tempérament de celui qui la déclare —
 * et cette raison décide de quand elle s'arrête.
 */
export function butDeGuerre(world, a, b, rng, cible) {
  const d = dirigeant(world, a);
  const temp = d ? d.temperament : 'methodique';
  if (temp === 'rancunier') {
    return { type: 'punition', texte: 'pour solde de tout compte', batailles: rng.irange(2, 4) };
  }
  if (temp === 'conquerant' || temp === 'rapace') {
    return cible
      ? { type: 'conquete', villeId: cible.id, texte: `pour prendre ${cible.nom}` }
      : { type: 'conquete', texte: 'pour s’étendre' };
  }
  if (temp === 'batisseur' || temp === 'prudent' || temp === 'conciliateur') {
    return { type: 'frontiere', texte: 'pour desserrer l’étau', batailles: rng.irange(1, 3) };
  }
  return { type: 'butin', texte: 'pour ce qu’il y a à prendre', batailles: rng.irange(2, 5) };
}

/**
 * Le but est-il atteint — ou devenu hors d'atteinte ? Retourne 'atteint',
 * 'perdu', ou null si la guerre a encore une raison de durer.
 */
export function etatDuBut(world, guerre, key) {
  const but = guerre.but;
  if (!but) return null;
  if (but.type === 'conquete' && but.villeId) {
    const ville = world.colonies.find((c) => c.id === but.villeId);
    if (!ville || ville.ruine) return 'perdu';
    if (ville.faction === key) return 'atteint';
    return null;
  }
  if (but.batailles && guerre.batailles >= but.batailles) return 'atteint';
  return null;
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/**
 * On vieillit, on s'use, et on finit par être remplacé — de vieillesse ou parce
 * qu'on a perdu trop de villes. Le successeur n'a pas forcément le même
 * tempérament : c'est ainsi qu'une faction pacifique se réveille conquérante.
 */
export function tickDirigeant(world, key, rng, dt, t, log, grogne = 0) {
  const f = world.factions[key];
  if (!f) return;
  if (!f.dirigeant) { f.dirigeant = creerDirigeant(rng, key, t); return; }
  const d = f.dirigeant;
  // Une année de jeu, c'est quatre saisons de trente jours — pas 360 jours.
  // L'erreur faisait vieillir les chefs trois fois trop lentement, donc aucun
  // ne cédait jamais sa place, donc la politique ne changeait jamais de visage.
  d.age += dt / HEURES_PAR_AN;

  // Gouverner sans catastrophe est déjà une forme de succès, et la légitimité
  // remonte doucement en temps calme. Gouverner un pays qui gronde n'en est pas
  // un : au-delà de quarante pour cent de grogne moyenne, elle se met à
  // descendre, et un chef qui laisse pourrir son pays finit par le payer sans
  // qu'aucune armée n'ait eu à entrer chez lui.
  const usure = Math.max(0, grogne - 0.4) * 0.12;
  d.legitimite = Math.max(0, Math.min(100, d.legitimite + (0.01 - usure) * dt));
  // On garde ce qui l'a fait tomber : le successeur n'est pas tiré au hasard
  // dans le même vivier selon qu'on lui reproche le désordre ou la défaite.
  if (usure > 0) d.grogne = Math.min(1, (d.grogne || 0) + 0.002 * dt);
  else d.grogne = Math.max(0, (d.grogne || 0) - 0.001 * dt);

  const vieux = Math.max(0, d.age - 60) / 25;
  const conteste = d.legitimite < LEGITIMITE_CRITIQUE ? 0.004 : 0;
  const q = 0.00012 + vieux * 0.0009 + conteste;
  if (!rng.chance(dt === 1 ? q : 1 - Math.pow(1 - q, dt))) return;

  const sortant = d;
  const ecarte = sortant.legitimite < LEGITIMITE_CRITIQUE;
  // Renversé par le pays ou par les défaites : ce n'est pas le même reproche,
  // et ce n'est donc pas le même successeur.
  const parLePays = ecarte && (sortant.grogne || 0) > 0.35;
  const cause = parLePays ? 'renversé par son propre conseil'
    : ecarte ? 'écarté' : 'remplacé';
  const neuf = creerDirigeant(rng, key, t,
    ecarte ? (parLePays ? 'grogne' : 'faiblesse') : null);
  f.dirigeant = neuf;
  if (log) {
    log({
      type: 'dirigeant',
      texte: `${FACTIONS[key].nom} : ${sortant.titre} ${sortant.nom} est ${cause}. `
        + `${neuf.titre} ${neuf.nom} prend la suite — ${TEMPERAMENTS[neuf.temperament].nom.toLowerCase()}. `
        + `« ${TEMPERAMENTS[neuf.temperament].mot} »`,
      factions: [key],
      important: true,
    });
  }
}
