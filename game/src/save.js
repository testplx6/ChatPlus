// Sauvegarde locale. L'état est du JSON pur : pas de classes, pas de
// références circulaires, pas de fonctions. C'est ce qui rend possible à la
// fois la persistance navigateur et, plus tard, un envoi au serveur.

import { groupeVide } from './groupes.js';

export const CLE = 'cendres.save.v1';
export const VERSION = 1;

export function serialiser(state) {
  return JSON.stringify(state);
}

/**
 * Complète une sauvegarde plus ancienne que le code courant. Le jeu gagne des
 * systèmes au fil des versions ; effacer la partie du joueur à chaque ajout
 * serait la solution paresseuse.
 */
export function normaliser(state) {
  const p = state.player;

  // Avant les groupes, l'escouade était un bloc unique posé sur `player`.
  // On la reconstitue en un premier groupe : une partie en cours ne se jette
  // pas parce que le moteur a appris à en tenir plusieurs.
  if (!p.groupes) {
    const g = groupeVide('g0', 'Convoi', p.regionId || 0, state.temps);
    g.membres = p.squad || [];
    g.ordre = p.ordre || { type: 'repos' };
    g.inventaire = Object.assign(g.inventaire, p.inventaire || {});
    g.objets = p.objets || [];
    g.reste = p.reste || {};
    g.bilan = p.bilan || { res: {}, depuis: state.temps };
    g.cohesion = p.cohesion === undefined ? 55 : p.cohesion;
    p.groupes = [g];
    p.groupeActif = g.id;
    delete p.squad; delete p.ordre; delete p.inventaire; delete p.objets;
    delete p.regionId; delete p.reste; delete p.bilan; delete p.cohesion;
    delete p.recolteHeure; delete p.nuit;
  }
  for (const g of p.groupes) {
    if (!g.reste) g.reste = {};
    if (!g.objets) g.objets = [];
    if (!g.bilan) g.bilan = { res: {}, depuis: state.temps };
    if (g.cohesion === undefined) g.cohesion = 55;
    if (!g.ordre) g.ordre = { type: 'repos' };
    if (!g.membres) g.membres = [];
  }
  if (!p.groupeActif || !p.groupes.some((g) => g.id === p.groupeActif)) {
    p.groupeActif = p.groupes.length ? p.groupes[0].id : null;
  }

  if (!p.contrats) p.contrats = [];
  if (!p.primes) p.primes = {};
  if (p.allegeance === undefined) p.allegeance = null;
  if (!state.memorial) state.memorial = [];
  if (!state.stats) state.stats = {};
  for (const k of ['contratsRemplis', 'sitesFouilles', 'caravanesPillees', 'distanceParcourue']) {
    if (state.stats[k] === undefined) state.stats[k] = 0;
  }
  const w = state.world;
  if (!w.caravanes) w.caravanes = [];
  if (!w.meteo) w.meteo = { type: 'couvert', restant: 4 };
  for (const c of w.colonies) {
    if (c.declin === undefined) c.declin = 0;
    if (c.prises === undefined) c.prises = 0;
  }
  for (const g of p.groupes) {
    for (const c of g.membres) {
      if (!c.traits) c.traits = [];
      if (!c.liens) c.liens = {};
    }
  }
  const b = state.base;
  if (b) {
    if (b.pop === undefined) b.pop = 0;
    if (b.moral === undefined) b.moral = 60;
  }
  if (state.stats.ordresRemplis === undefined) state.stats.ordresRemplis = 0;
  return state;
}

export function deserialiser(txt) {
  const state = JSON.parse(txt);
  if (!state || state.version !== VERSION) {
    throw new Error('Sauvegarde incompatible.');
  }
  return normaliser(state);
}

function stockage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (e) {
    // Mode privé, quota, iframe verrouillée…
  }
  return null;
}

export function sauvegarder(state) {
  const s = stockage();
  if (!s) return { ok: false, motif: 'Stockage local indisponible.' };
  try {
    s.setItem(CLE, serialiser(state));
    return { ok: true };
  } catch (e) {
    return { ok: false, motif: 'Écriture impossible (quota ?).' };
  }
}

export function charger() {
  const s = stockage();
  if (!s) return null;
  const txt = s.getItem(CLE);
  if (!txt) return null;
  try {
    return deserialiser(txt);
  } catch (e) {
    return null;
  }
}

export function effacer() {
  const s = stockage();
  if (s) s.removeItem(CLE);
}

export function existeSauvegarde() {
  const s = stockage();
  return !!(s && s.getItem(CLE));
}
