// Les groupes : l'escouade n'est plus un bloc unique.
//
// Un groupe a une position, un ordre, des gens et ce qu'ils portent. Chaque
// membre peut recevoir une tâche personnelle qui prime sur l'ordre du groupe :
// pendant que deux ferraillent, le troisième chasse. En marche, tout le monde
// marche — on ne s'entraîne pas en colonne.
//
// Les personnages vivent dans `groupe.membres`, et nulle part ailleurs : un
// personnage appartient à exactement un groupe, ce qui évite d'avoir à
// synchroniser deux listes et garde l'état sérialisable tel quel.

import { COMMODITY_KEYS } from './data.js';
import { estVivant, estDebout, idDepuisRng } from './characters.js';
import { distance } from './world.js';

/** Tâches qu'un membre peut prendre seul, en marge de l'ordre du groupe. */
export const TACHES_INDIVIDUELLES = ['repos', 'fouille', 'mine', 'chasse', 'exploration', 'entrainement'];

/** Noms proposés aux groupes détachés, dans l'ordre. */
const NOMS = ['Convoi', 'Pointe', 'Arrière-garde', 'Éclaireurs', 'Escorte'];

/** Deux groupes sans rien ; l'antenne en autorise davantage. */
export const GROUPES_BASE = 2;
/**
 * Portée de commandement : jusqu'où l'on peut donner un ordre.
 *
 * Il y avait un plafond de quatre groupes. Comme les autres, c'était une limite
 * écrite dans le code plutôt qu'une limite du monde — rien, dans la fiction,
 * n'empêche de séparer son monde en six colonnes.
 *
 * Ce qui l'empêche vraiment, c'est de leur parler. À portée de voix — quelques
 * secteurs — on transmet par coureur. Au-delà, il faut une antenne, et une
 * antenne se bâtit. Un groupe hors de portée n'est pas perdu : il exécute le
 * dernier ordre reçu jusqu'à ce qu'on le rattrape, ce qui est exactement la
 * façon dont on perdait des colonnes avant la radio.
 */
export const PORTEE_COUREUR = 4;
export const PORTEE_PAR_ANTENNE = 6;

export function porteeOrdres(state) {
  // Lecture directe du bâtiment plutôt que `niveau()` de base.js : ce module est
  // en amont de l'avant-poste dans l'ordre des dépendances, et un cycle
  // d'imports casserait l'assemblage en fichier unique.
  const b = state.base;
  const ant = b && b.fonde && b.batiments ? (b.batiments.antenne || 0) : 0;
  return PORTEE_COUREUR + ant * PORTEE_PAR_ANTENNE;
}

/**
 * Peut-on encore commander ce groupe ? On mesure depuis le groupe le plus
 * proche qu'on commande déjà — un ordre se relaie — et depuis l'avant-poste,
 * qui a la radio.
 */
export function joignable(state, g) {
  if (!g) return { ok: false, motif: 'Groupe inconnu.' };
  // Le groupe qu'on regarde est celui où l'on est : on se commande toujours
  // soi-même. Sans cette règle, deux colonnes éloignées se retrouvaient toutes
  // les deux injoignables, y compris celle où se tient le joueur — et le banc
  // a montré des escouades plantées à ne rien faire trente pour cent du temps.
  if (g.id === state.player.groupeActif) return { ok: true };
  const portee = porteeOrdres(state);
  const b = state.base;
  if (b && b.fonde && distance(g.regionId, b.regionId) <= portee) return { ok: true };
  // On relaie par le groupe où l'on se tient, et par les autres qu'on joint.
  for (const autre of state.player.groupes) {
    if (autre.id === g.id || !autre.membres.length) continue;
    if (distance(g.regionId, autre.regionId) <= portee) return { ok: true };
  }
  return {
    ok: false,
    motif: `Hors de portée : ${portee} secteurs par coureur, davantage avec une antenne.`,
  };
}

/** Conservé pour l'affichage : ce que la portée permet, en nombre de colonnes. */
export function maxGroupes(state) {
  return Infinity;
}

// ---------------------------------------------------------------------------
// Construction et accès
// ---------------------------------------------------------------------------

export function groupeVide(id, nom, regionId, t = 0) {
  const inventaire = {};
  for (const k of COMMODITY_KEYS) inventaire[k] = 0;
  return {
    id,
    nom,
    regionId,
    ordre: { type: 'repos' },
    membres: [],
    inventaire,
    objets: [],
    // Ce qui porte à votre place. Voir betes.js.
    betes: [],
    reste: {},
    bilan: { res: {}, depuis: t },
    recolteHeure: null,
    cohesion: 55,
    nuit: false,
  };
}

export function groupes(state) {
  return (state.player && state.player.groupes) || [];
}

export function groupeParId(state, id) {
  return groupes(state).find((g) => g.id === id) || null;
}

/** Le groupe que l'interface montre. Toujours un groupe réel, jamais null. */
export function groupeActif(state) {
  const gs = groupes(state);
  if (!gs.length) return null;
  return gs.find((g) => g.id === state.player.groupeActif) || gs[0];
}

export function choisirGroupe(state, id) {
  if (groupeParId(state, id)) state.player.groupeActif = id;
}

/** Tous les personnages, groupes confondus. L'ordre est stable. */
export function tousLesMembres(state) {
  const out = [];
  for (const g of groupes(state)) for (const c of g.membres) out.push(c);
  return out;
}

export function groupeDe(state, perso) {
  return groupes(state).find((g) => g.membres.some((c) => c.id === perso.id)) || null;
}

export function vivants(g) {
  return g.membres.filter(estVivant);
}

/**
 * Ceux qui peuvent travailler ou se battre. Un élève à l'école n'en est pas :
 * il est en ville, la tête ailleurs. Sans ça, une formation ne coûterait que de
 * l'argent, et envoyer quelqu'un se former serait sans conséquence.
 */
// ---------------------------------------------------------------------------
// Cohésion : ce qui remplace le plafond d'escouade
// ---------------------------------------------------------------------------

/**
 * Combien de gens tiennent ensemble sans effort. Au-delà, ce n'est plus une
 * escouade, c'est une colonne — et une colonne, ça se commande mal.
 *
 * C'était un plafond en dur (`4 + baraquement`) : on ne pouvait simplement pas
 * recruter au-delà. Une limite écrite dans le code n'apprend rien ; celle-ci se
 * sent. Rien n'interdit de mener trente personnes ; ce qui l'en dissuade, c'est
 * qu'à trente on ne se connaît plus, on travaille mal et on se bat mal.
 */
export function noyau(state, g) {
  const base = state && state.base;
  const abri = base && base.fonde ? (base.batiments.baraquement || 0) : 0;
  return 4 + abri;
}

/**
 * Le plafond de cohésion qu'un groupe de cette taille peut atteindre. Courbe
 * douce et sans palier : à quatre on peut être soudés, à trente jamais.
 */
export function plafondCohesion(state, g) {
  const n = vivants(g).length;
  const cœur = noyau(state, g);
  if (n <= cœur) return 100;
  return Math.max(12, 100 / (1 + (n - cœur) / 7));
}

/**
 * Ce que la cohésion vaut, en travail comme au combat. Une bande soudée rend
 * plus qu'une addition de gens ; une foule rend moins.
 *
 * Jusqu'ici la cohésion ne servait à rien : elle dérivait, elle s'affichait, et
 * aucun calcul ne la lisait. C'est elle qui porte désormais tout le poids de la
 * taille d'une escouade.
 */
export function rendementCohesion(g) {
  const c = g && g.cohesion !== undefined ? g.cohesion : 55;
  return 0.7 + (c / 100) * 0.45;
}

export function debout(g) {
  return g.membres.filter((c) => estDebout(c)
    && !(c.formation && c.formation.restant > 0)
    && !c.enseigne);
}

/** Ceux que l'école immobilise — élèves et maîtres —, pour l'affichage. */
export function eleves(g) {
  return g.membres.filter((c) => (c.formation && c.formation.restant > 0) || c.enseigne);
}

/** Un groupe qui n'a plus personne debout ne fait plus rien de son ordre. */
export function groupeActifEnJeu(g) {
  return g.membres.some(estVivant);
}

// ---------------------------------------------------------------------------
// Tâches
// ---------------------------------------------------------------------------

/**
 * La tâche que ce membre exécute réellement. En marche, l'ordre du groupe
 * l'emporte sur tout : on ne mine pas en avançant.
 */
export function tacheDe(g, c) {
  const ordre = g.ordre || { type: 'repos' };
  if (ordre.type === 'voyage') return ordre;
  if (!c.tache) return ordre;
  if (!TACHES_INDIVIDUELLES.includes(c.tache.type)) return ordre;
  return c.tache;
}

/** `null` remet le membre sous l'ordre du groupe. */
export function assignerTache(state, perso, tache, verifierExercice) {
  if (!tache) { delete perso.tache; return { ok: true }; }
  if (!TACHES_INDIVIDUELLES.includes(tache.type)) {
    return { ok: false, motif: 'Cette tâche ne se prend pas seul.' };
  }
  // `verifierExercice` est passé par l'appelant : squad.js est en aval de ce
  // module dans l'ordre des dépendances, et l'importer ferait un cycle.
  if (tache.type === 'entrainement' && verifierExercice) {
    const v = verifierExercice(tache.skill);
    if (!v.ok) return v;
  }
  perso.tache = Object.assign({}, tache);
  return { ok: true };
}

/** Combien de membres exécutent chaque tâche, pour l'affichage. */
export function repartition(g) {
  const out = {};
  for (const c of g.membres) {
    if (!estVivant(c)) continue;
    const t = tacheDe(g, c).type;
    out[t] = (out[t] || 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scinder et fusionner
// ---------------------------------------------------------------------------

function nomLibre(state) {
  const pris = new Set(groupes(state).map((g) => g.nom));
  for (const n of NOMS) if (!pris.has(n)) return n;
  let i = 2;
  while (pris.has(`Groupe ${i}`)) i++;
  return `Groupe ${i}`;
}

/**
 * Détache des membres dans un nouveau groupe, sur place. Les vivres et le
 * matériel suivent au prorata : c'est ça qui donne son prix à la séparation.
 * Partir à deux avec un tiers des rations, c'est un choix, pas une formalité.
 */
export function scinder(state, g, ids, rng, nom) {
  const partants = g.membres.filter((c) => ids.includes(c.id) && estVivant(c));
  if (!partants.length) return { ok: false, motif: 'Personne à détacher.' };
  const restants = g.membres.filter((c) => !ids.includes(c.id) && estVivant(c));
  if (!restants.length) return { ok: false, motif: 'Il faut laisser quelqu’un derrière.' };
  if (partants.some((c) => !estDebout(c))) {
    return { ok: false, motif: 'On ne détache pas quelqu’un qui est à terre.' };
  }

  const neuf = groupeVide(idDepuisRng(rng, 'g'), nom || nomLibre(state), g.regionId, state.temps);
  // Les K.O. restent avec le groupe d'origine : ils sont portés, pas envoyés.
  for (const c of partants) {
    g.membres.splice(g.membres.indexOf(c), 1);
    neuf.membres.push(c);
  }

  const part = partants.length / (partants.length + restants.length);
  for (const k of Object.keys(g.inventaire)) {
    const q = Math.floor((g.inventaire[k] || 0) * part);
    if (q <= 0) continue;
    g.inventaire[k] -= q;
    neuf.inventaire[k] = (neuf.inventaire[k] || 0) + q;
  }

  state.player.groupes.push(neuf);
  state.player.groupeActif = neuf.id;
  return { ok: true, groupe: neuf };
}

/** Fusionne `b` dans `a`. Les deux doivent être au même endroit. */
export function fusionner(state, a, b) {
  if (a.id === b.id) return { ok: false, motif: 'Même groupe.' };
  if (a.regionId !== b.regionId) return { ok: false, motif: 'Les deux groupes ne sont pas au même endroit.' };
  for (const c of b.membres) a.membres.push(c);
  for (const k of Object.keys(b.inventaire)) {
    if (!b.inventaire[k]) continue;
    a.inventaire[k] = (a.inventaire[k] || 0) + b.inventaire[k];
  }
  for (const o of b.objets || []) a.objets.push(o);
  // La cohésion d'un groupe recomposé n'est pas la somme des deux : on se
  // réhabitue.
  a.cohesion = Math.round((a.cohesion + b.cohesion) / 2);
  retirerGroupe(state, b);
  if (state.player.groupeActif === b.id) state.player.groupeActif = a.id;
  return { ok: true };
}

export function retirerGroupe(state, g) {
  const i = state.player.groupes.indexOf(g);
  if (i >= 0) state.player.groupes.splice(i, 1);
  if (state.player.groupeActif === g.id && state.player.groupes.length) {
    state.player.groupeActif = state.player.groupes[0].id;
  }
}

/** Un groupe rejoint par un autre au même endroit peut être absorbé. */
export function fusionnablesAvec(state, g) {
  return groupes(state).filter((o) => o.id !== g.id && o.regionId === g.regionId);
}
