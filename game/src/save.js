// Sauvegarde locale. L'état est du JSON pur : pas de classes, pas de
// références circulaires, pas de fonctions. C'est ce qui rend possible à la
// fois la persistance navigateur et, plus tard, un envoi au serveur.

export const CLE = 'cendres.save.v1';
export const VERSION = 1;

export function serialiser(state) {
  return JSON.stringify(state);
}

export function deserialiser(txt) {
  const state = JSON.parse(txt);
  if (!state || state.version !== VERSION) {
    throw new Error('Sauvegarde incompatible.');
  }
  return state;
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
