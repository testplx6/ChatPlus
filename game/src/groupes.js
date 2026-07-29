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

/** Tâches qu'un membre peut prendre seul, en marge de l'ordre du groupe. */
export const TACHES_INDIVIDUELLES = ['repos', 'fouille', 'mine', 'chasse', 'exploration', 'entrainement'];

/** Noms proposés aux groupes détachés, dans l'ordre. */
const NOMS = ['Convoi', 'Pointe', 'Arrière-garde', 'Éclaireurs', 'Escorte'];

/** Deux groupes sans rien ; l'antenne en autorise davantage. */
export const GROUPES_BASE = 2;
export const GROUPES_MAX = 4;

/**
 * Combien de groupes on peut tenir à la fois. Coordonner des gens qu'on ne voit
 * pas suppose de quoi leur parler : l'antenne de l'avant-poste sert à ça.
 */
export function maxGroupes(state) {
  // Lecture directe du bâtiment plutôt que `niveau()` de base.js : ce module est
  // en amont de l'avant-poste dans l'ordre des dépendances, et un cycle
  // d'imports casserait l'assemblage en fichier unique.
  const b = state.base;
  const ant = b && b.fonde && b.batiments ? (b.batiments.antenne || 0) : 0;
  return Math.min(GROUPES_MAX, GROUPES_BASE + Math.floor(ant / 2));
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
  if (groupes(state).length >= maxGroupes(state)) {
    return { ok: false, motif: 'Pas de quoi coordonner un groupe de plus. Montez l’antenne.' };
  }
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
