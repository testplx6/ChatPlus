// Sauvegarde locale. L'état est du JSON pur : pas de classes, pas de
// références circulaires, pas de fonctions. C'est ce qui rend possible à la
// fois la persistance navigateur et, plus tard, un envoi au serveur.

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
  if (!p.contrats) p.contrats = [];
  if (!p.bilan) p.bilan = { res: {}, depuis: state.temps };
  if (!p.reste) p.reste = {};
  if (!p.primes) p.primes = {};
  if (p.cohesion === undefined) p.cohesion = 55;
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
  for (const c of p.squad) {
    if (!c.traits) c.traits = [];
  }
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
