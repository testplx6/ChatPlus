// L'avant-poste : files de construction et de recherche à la OGame, chaîne de
// production contrainte par l'énergie, stockage plafonné, raids à encaisser.

import { BUILDINGS, RESEARCH, COMMODITY_KEYS } from './data.js';
import { comp, gagnerXp, estDebout } from './characters.js';

export function creerBase() {
  const stock = {};
  for (const k of COMMODITY_KEYS) stock[k] = 0;
  return {
    fonde: false,
    regionId: null,
    nom: 'Avant-poste',
    batiments: {},
    file: [],
    recherche: {},
    fileRech: [],
    stock,
    defense: 0,
    derniereAttaque: -999,
  };
}

export const COUT_FONDATION = { ferraille: 120, polymere: 40, composant: 5 };

export function niveau(base, key) {
  return base.batiments[key] || 0;
}

export function niveauRech(base, key) {
  return base.recherche[key] || 0;
}

function scale(cout, mul, n) {
  const out = {};
  for (const k of Object.keys(cout)) {
    out[k] = Math.round(cout[k] * Math.pow(mul, n));
  }
  return out;
}

export function coutBatiment(base, key) {
  const b = BUILDINGS[key];
  return scale(b.cout, b.coutMul, niveau(base, key));
}

export function tempsBatiment(base, key) {
  const b = BUILDINGS[key];
  const brut = b.heures * Math.pow(b.tempsMul, niveau(base, key));
  const reduction = 1 - Math.min(0.6, niveauRech(base, 'ingenierie') * 0.1);
  return Math.max(1, Math.round(brut * reduction));
}

export function coutRecherche(base, key) {
  const r = RESEARCH[key];
  return scale(r.cout, r.coutMul, niveauRech(base, key));
}

export function tempsRecherche(base, key) {
  const r = RESEARCH[key];
  const brut = r.heures * Math.pow(r.tempsMul, niveauRech(base, key));
  const antenne = niveau(base, 'antenne');
  return Math.max(1, Math.round(brut / (1 + antenne * 0.25)));
}

export function capaciteStock(base) {
  return 800 + niveau(base, 'entrepot') * 800;
}

export function totalStock(base) {
  let t = 0;
  for (const k of COMMODITY_KEYS) t += base.stock[k] || 0;
  return Math.round(t);
}

export function tailleEscouadeMax(base) {
  return 4 + niveau(base, 'baraquement');
}

/** Bilan énergétique : { prod, conso, ratio } */
export function energie(base) {
  let prod = 0;
  let conso = 0;
  for (const key of Object.keys(base.batiments)) {
    const n = base.batiments[key];
    if (!n) continue;
    const e = BUILDINGS[key].energie * n;
    if (e > 0) prod += e;
    else conso -= e;
  }
  // Un générateur sans carburant ne produit rien
  if ((base.stock.carburant || 0) <= 0) prod = 0;
  return { prod, conso, ratio: conso > 0 ? Math.min(1, prod / conso) : 1 };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function peutPayer(stock, cout) {
  for (const k of Object.keys(cout)) {
    if ((stock[k] || 0) < cout[k]) return false;
  }
  return true;
}

export function payer(stock, cout) {
  for (const k of Object.keys(cout)) stock[k] -= cout[k];
}

export function lancerConstruction(state, key) {
  const base = state.base;
  if (!base.fonde) return { ok: false, motif: 'Aucun avant-poste.' };
  const b = BUILDINGS[key];
  if (!b) return { ok: false, motif: 'Bâtiment inconnu.' };
  const enFile = base.file.filter((x) => x.key === key).length;
  if (niveau(base, key) + enFile >= b.max) return { ok: false, motif: 'Niveau maximum atteint.' };
  if (base.file.length >= 5) return { ok: false, motif: 'File pleine (5).' };
  const cout = coutBatiment(base, key);
  if (!peutPayer(base.stock, cout)) return { ok: false, motif: 'Ressources insuffisantes.' };
  payer(base.stock, cout);
  const total = tempsBatiment(base, key);
  base.file.push({ key, niveau: niveau(base, key) + 1 + enFile, restant: total, total });
  return { ok: true };
}

export function annulerConstruction(state, index) {
  const base = state.base;
  const item = base.file[index];
  if (!item) return { ok: false, motif: 'Rien à annuler.' };
  base.file.splice(index, 1);
  // Remboursement partiel : 70 %
  const cout = coutBatiment(base, item.key);
  for (const k of Object.keys(cout)) {
    base.stock[k] = (base.stock[k] || 0) + Math.round(cout[k] * 0.7);
  }
  return { ok: true };
}

export function lancerRecherche(state, key) {
  const base = state.base;
  if (!base.fonde) return { ok: false, motif: 'Aucun avant-poste.' };
  if (niveau(base, 'antenne') < 1) return { ok: false, motif: 'Antenne requise.' };
  const r = RESEARCH[key];
  if (!r) return { ok: false, motif: 'Recherche inconnue.' };
  const enFile = base.fileRech.filter((x) => x.key === key).length;
  if (niveauRech(base, key) + enFile >= r.max) return { ok: false, motif: 'Niveau maximum atteint.' };
  if (base.fileRech.length >= 3) return { ok: false, motif: 'File pleine (3).' };
  const cout = coutRecherche(base, key);
  const stockEtCredits = Object.assign({}, base.stock, { credits: state.player.credits });
  if (!peutPayer(stockEtCredits, cout)) return { ok: false, motif: 'Ressources insuffisantes.' };
  for (const k of Object.keys(cout)) {
    if (k === 'credits') state.player.credits -= cout[k];
    else base.stock[k] -= cout[k];
  }
  const total = tempsRecherche(base, key);
  base.fileRech.push({ key, niveau: niveauRech(base, key) + 1 + enFile, restant: total, total });
  return { ok: true };
}

export function fonderBase(state, log) {
  const base = state.base;
  if (base.fonde) return { ok: false, motif: 'Avant-poste déjà fondé.' };
  const inv = state.player.inventaire;
  if (!peutPayer(inv, COUT_FONDATION)) {
    return { ok: false, motif: 'Il faut 120 ferraille, 40 polymère, 5 composants dans le sac.' };
  }
  const r = state.world.regions[state.player.regionId];
  if (r.colonie) return { ok: false, motif: 'Impossible de bâtir dans une ville existante.' };
  payer(inv, COUT_FONDATION);
  base.fonde = true;
  base.regionId = state.player.regionId;
  base.batiments = {};
  base.defense = 10;
  log({ type: 'base', texte: `Avant-poste fondé. Ici, au moins, c’est chez nous.`, regionId: base.regionId });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Production horaire
// ---------------------------------------------------------------------------

function ajouter(base, key, qte) {
  if (qte <= 0) return 0;
  const libre = capaciteStock(base) - totalStock(base);
  const reel = Math.max(0, Math.min(qte, libre));
  base.stock[key] = (base.stock[key] || 0) + reel;
  return reel;
}

function consommer(base, key, qte) {
  const dispo = base.stock[key] || 0;
  const pris = Math.min(dispo, qte);
  base.stock[key] = dispo - pris;
  return pris;
}

/** Une heure de vie de l'avant-poste. Retourne un résumé pour l'UI. */
export function tickBase(state, log, ctx) {
  const base = state.base;
  if (!base.fonde) return null;
  const rng = ctx.rng;
  const rech = base.recherche;
  const surPlace = state.player.regionId === base.regionId;

  // --- Énergie
  const gen = niveau(base, 'generateur');
  if (gen > 0) consommer(base, 'carburant', 0.55 * gen);
  const e = energie(base);
  const r = e.ratio;

  // --- Chaînes de production
  const hyd = niveau(base, 'hydroponie');
  if (hyd > 0) {
    const bio = consommer(base, 'biomasse', 1.25 * hyd * r);
    ajouter(base, 'rations', bio * 0.9 * (1 + (rech.hydroponie_av || 0) * 0.15));
  }
  const fond = niveau(base, 'fonderie');
  if (fond > 0) {
    const min = consommer(base, 'minerai', 1.2 * fond * r);
    ajouter(base, 'alliage', min * 0.42 * (1 + (rech.metallurgie || 0) * 0.12));
  }
  const raf = niveau(base, 'raffinerie');
  if (raf > 0) {
    const pol = consommer(base, 'polymere', 0.9 * raf * r);
    ajouter(base, 'carburant', pol * 0.55);
  }
  const atl = niveau(base, 'atelier');
  if (atl > 0) {
    const all = consommer(base, 'alliage', 0.35 * atl * r);
    const pol = consommer(base, 'polymere', 0.5 * atl * r);
    ajouter(base, 'composant', Math.min(all / 0.35, pol / 0.5) * 0.14 * atl * r);
  }
  const inf = niveau(base, 'infirmerie');
  if (inf > 0) {
    const bio = consommer(base, 'biomasse', 0.4 * inf * r);
    ajouter(base, 'medkit', bio * 0.09);
  }

  base.defense = niveau(base, 'mur') * 22 + 10;

  // --- File de construction
  if (base.file.length) {
    const item = base.file[0];
    let vitesse = 1;
    if (surPlace) {
      // L'escouade met la main à la pâte
      let ing = 0;
      for (const c of state.player.squad) {
        if (!estDebout(c)) continue;
        ing += comp(c, 'ingenierie');
        gagnerXp(c, 'ingenierie', 0.25);
      }
      vitesse += Math.min(1.2, ing / 160);
    }
    item.restant -= vitesse;
    if (item.restant <= 0) {
      base.batiments[item.key] = (base.batiments[item.key] || 0) + 1;
      base.file.shift();
      log({
        type: 'base',
        texte: `${BUILDINGS[item.key].nom} niveau ${base.batiments[item.key]} opérationnel.`,
        regionId: base.regionId,
      });
    }
  }

  // --- File de recherche
  if (base.fileRech.length) {
    const item = base.fileRech[0];
    item.restant -= 1;
    if (item.restant <= 0) {
      base.recherche[item.key] = (base.recherche[item.key] || 0) + 1;
      base.fileRech.shift();
      log({
        type: 'recherche',
        texte: `Recherche achevée : ${RESEARCH[item.key].nom} ${base.recherche[item.key]}.`,
      });
    }
  }

  // --- Raid sur l'avant-poste
  const reg = state.world.regions[base.regionId];
  const t = state.temps;
  if (t - base.derniereAttaque > 72 && rng.chance(0.0016 * (1 + reg.danger * 4))) {
    base.derniereAttaque = t;
    const force = rng.irange(20, 45) + Math.floor(t / 600);
    const defense = base.defense + (surPlace ? forceEscouade(state) : 0);
    if (defense > force) {
      base.defense = Math.max(0, base.defense - force * 0.3);
      log({
        type: 'raid',
        texte: `Raid repoussé sur l’avant-poste (${force} assaillants).`,
        regionId: base.regionId,
        important: true,
      });
    } else {
      let vole = 0;
      for (const k of COMMODITY_KEYS) {
        const pris = Math.round((base.stock[k] || 0) * rng.range(0.15, 0.4));
        base.stock[k] -= pris;
        vole += pris;
      }
      base.defense = 0;
      if (niveau(base, 'mur') > 0 && rng.chance(0.4)) {
        base.batiments.mur = Math.max(0, base.batiments.mur - 1);
      }
      log({
        type: 'raid',
        texte: `L’avant-poste est pillé : ${vole} unités emportées.`,
        regionId: base.regionId,
        important: true,
      });
    }
  }

  return { energie: e };
}

export function forceEscouade(state) {
  let f = 0;
  for (const c of state.player.squad) {
    if (!estDebout(c)) continue;
    f += comp(c, 'melee') * 0.4 + comp(c, 'tir') * 0.4 + comp(c, 'endurance') * 0.2;
  }
  return Math.round(f);
}

// ---------------------------------------------------------------------------
// Transferts sac ↔ avant-poste
// ---------------------------------------------------------------------------

export function deposer(state, key, qte) {
  const base = state.base;
  if (!base.fonde || state.player.regionId !== base.regionId) {
    return { ok: false, motif: 'Il faut être à l’avant-poste.' };
  }
  const dispo = state.player.inventaire[key] || 0;
  const libre = capaciteStock(base) - totalStock(base);
  const n = Math.max(0, Math.min(Math.floor(qte), dispo, Math.floor(libre)));
  if (n <= 0) return { ok: false, motif: 'Rien à déposer, ou entrepôt plein.' };
  state.player.inventaire[key] -= n;
  base.stock[key] = (base.stock[key] || 0) + n;
  return { ok: true, qte: n };
}

export function retirer(state, key, qte, capaciteLibre) {
  const base = state.base;
  if (!base.fonde || state.player.regionId !== base.regionId) {
    return { ok: false, motif: 'Il faut être à l’avant-poste.' };
  }
  const dispo = base.stock[key] || 0;
  const n = Math.max(0, Math.min(Math.floor(qte), dispo, Math.floor(capaciteLibre)));
  if (n <= 0) return { ok: false, motif: 'Rien à prendre, ou sac plein.' };
  base.stock[key] -= n;
  state.player.inventaire[key] = (state.player.inventaire[key] || 0) + n;
  return { ok: true, qte: n };
}
