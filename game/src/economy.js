// Économie locale : chaque colonie produit, consomme, et fixe ses prix à partir
// de son propre stock. Une ville affamée paie les rations au prix fort ; une
// ville assise sur une mine brade son minerai.

import { COMMODITIES, COMMODITY_KEYS, BIOMES } from './data.js';
import { comp, gagnerXp, portage } from './characters.js';

/** Stock « confortable » visé par une colonie pour une marchandise. */
export function cibleStock(col, key) {
  const p = col.pop;
  switch (key) {
    case 'rations': return p * 0.9;
    case 'biomasse': return p * 0.5;
    case 'ferraille': return p * 0.7;
    case 'minerai': return p * 0.4;
    case 'polymere': return p * 0.35;
    case 'carburant': return p * 0.2;
    case 'alliage': return p * 0.15;
    case 'isotope': return p * 0.06;
    case 'composant': return p * 0.08;
    case 'medkit': return p * 0.03;
    default: return p * 0.3;
  }
}

/** Prix unitaire courant, tiré de la tension offre/demande. */
export function prixUnitaire(col, key) {
  const base = COMMODITIES[key].prix;
  const cible = Math.max(1, cibleStock(col, key));
  const stock = Math.max(0, col.stock[key] || 0);
  // Rapport stock/cible → facteur borné [0.45, 3.2]
  const tension = cible / (stock + cible * 0.35);
  const f = Math.max(0.45, Math.min(3.2, Math.pow(tension, 0.85)));
  return base * f * (1 + col.unrest * 0.35);
}

/**
 * Prix effectifs pour le joueur.
 * `habilete` : compétence de commerce du meilleur négociateur (0-100).
 * `repu`     : réputation avec la faction propriétaire (−100..100).
 */
export function prixJoueur(col, key, habilete = 0, repu = 0) {
  const p = prixUnitaire(col, key);
  const marge = Math.max(0.06, 0.18 - habilete / 900 - Math.max(0, repu) / 1400);
  const majorationHostile = repu < -20 ? 0.15 + Math.min(0.4, -repu / 220) : 0;
  // Non arrondi volontairement : arrondir à l'unité écraserait la marge sur les
  // marchandises bon marché et rendrait l'aller-retour achat/revente gratuit.
  return {
    achat: Math.max(0.5, p * (1 + marge + majorationHostile)),
    vente: Math.max(0.25, p * (1 - marge - majorationHostile * 0.5)),
  };
}

/** Production horaire d'une colonie, dérivée de son biome et de sa taille. */
export function productionColonie(world, col) {
  const biome = BIOMES[world.regions[col.regionId].biome];
  const ech = col.pop * 0.012 * world.regions[col.regionId].richesse;
  const prod = {};
  for (const k of Object.keys(biome.yields)) {
    prod[k] = biome.yields[k] * ech;
  }
  // Transformation locale : un peu de biomasse devient rations, du minerai devient alliage
  prod.rations = (prod.rations || 0) + Math.min(prod.biomasse || 0, col.pop * 0.006) * 0.8;
  if (col.taille >= 2) {
    prod.alliage = (prod.alliage || 0) + (prod.minerai || 0) * 0.12;
    prod.composant = (prod.composant || 0) + col.pop * 0.00035 * col.taille;
  }
  if (col.taille >= 3) {
    prod.medkit = (prod.medkit || 0) + col.pop * 0.00012;
  }
  return prod;
}

export function consommationColonie(col) {
  return {
    rations: col.pop * 0.014,
    biomasse: col.pop * 0.006,
    carburant: col.pop * 0.0022 * col.taille,
    ferraille: col.pop * 0.004,
    composant: col.pop * 0.00018 * col.taille,
    medkit: col.pop * 0.00006,
  };
}

/** Une heure de vie économique et sociale pour une colonie. */
export function tickColonie(world, col, rng) {
  const prod = productionColonie(world, col);
  const cons = consommationColonie(col);

  for (const k of COMMODITY_KEYS) {
    const p = prod[k] || 0;
    const c = cons[k] || 0;
    col.stock[k] = Math.max(0, (col.stock[k] || 0) + p - c);
  }

  // Pénurie de rations → agitation, puis exode
  const manque = (col.stock.rations || 0) < col.pop * 0.05;
  if (manque) {
    col.unrest = Math.min(1, col.unrest + 0.006);
    if (rng.chance(0.05)) col.pop = Math.max(30, col.pop - rng.irange(1, 4));
  } else {
    col.unrest = Math.max(0, col.unrest - 0.0025);
    if (rng.chance(0.02)) col.pop += rng.irange(0, 2);
  }
  col.pop = Math.min(col.taille * 900, col.pop);

  // Reconstruction de la défense
  if (col.defense < col.defenseMax) {
    col.defense = Math.min(col.defenseMax, col.defense + col.defenseMax * 0.004 * (1 - col.unrest));
  }
  col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);

  // Plafond de stock : on ne stocke pas l'infini
  for (const k of COMMODITY_KEYS) {
    const plafond = cibleStock(col, k) * 4;
    if (col.stock[k] > plafond) col.stock[k] = plafond;
  }
}

// ---------------------------------------------------------------------------
// Transactions du joueur
// ---------------------------------------------------------------------------

export function meilleurCommercant(squad) {
  let best = null;
  for (const c of squad) {
    if (c.etat === 'mort') continue;
    if (!best || comp(c, 'commerce') > comp(best, 'commerce')) best = c;
  }
  return best;
}

export function poidsInventaire(inv) {
  let w = 0;
  for (const k of Object.keys(inv)) {
    if (!COMMODITIES[k]) continue;
    w += inv[k] * COMMODITIES[k].poids;
  }
  return w;
}

/**
 * Achat par le joueur. Retourne { ok, motif, qte, cout }.
 * Le prix bouge au fur et à mesure de la transaction : acheter tout le stock
 * d'une petite ville coûte cher.
 */
export function acheter(state, col, key, qte) {
  const negoc = meilleurCommercant(state.player.squad);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  let restant = Math.floor(qte);
  let cout = 0;
  let achetes = 0;

  const capacite = capacitePortage(state);
  const libre = capacite - poidsInventaire(state.player.inventaire);
  const poidsU = COMMODITIES[key].poids;
  const maxPoids = poidsU > 0 ? Math.floor(libre / poidsU) : restant;
  if (maxPoids <= 0) return { ok: false, motif: 'Sac plein.', qte: 0, cout: 0 };
  restant = Math.min(restant, maxPoids);

  while (restant > 0) {
    if ((col.stock[key] || 0) < 1) break;
    const p = prixJoueur(col, key, hab, repu).achat;
    if (state.player.credits - cout < p) break;
    cout += p;
    col.stock[key] -= 1;
    achetes += 1;
    restant -= 1;
  }
  if (achetes === 0) return { ok: false, motif: 'Rien à acheter à ce prix.', qte: 0, cout: 0 };
  cout = Math.round(cout);
  state.player.credits -= cout;
  state.player.inventaire[key] = (state.player.inventaire[key] || 0) + achetes;
  if (negoc) gagnerXp(negoc, 'commerce', 0.6 + achetes * 0.06);
  return { ok: true, qte: achetes, cout };
}

export function vendre(state, col, key, qte) {
  const negoc = meilleurCommercant(state.player.squad);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  let restant = Math.min(Math.floor(qte), state.player.inventaire[key] || 0);
  let gain = 0;
  let vendus = 0;
  while (restant > 0) {
    const p = prixJoueur(col, key, hab, repu).vente;
    gain += p;
    col.stock[key] = (col.stock[key] || 0) + 1;
    vendus += 1;
    restant -= 1;
  }
  if (vendus === 0) return { ok: false, motif: 'Rien à vendre.', qte: 0, gain: 0 };
  gain = Math.round(gain);
  state.player.inventaire[key] -= vendus;
  state.player.credits += gain;
  if (negoc) gagnerXp(negoc, 'commerce', 0.6 + vendus * 0.06);
  return { ok: true, qte: vendus, gain };
}

/** Capacité de portage totale de l'escouade. */
export function capacitePortage(state) {
  let cap = 0;
  const bonus = (state.base.recherche.logistique || 0) * 0.15;
  for (const c of state.player.squad) {
    // Un mort ne porte plus rien, et un K.O. est lui-même porté par les autres.
    if (c.etat === 'mort' || c.etat === 'ko') continue;
    cap += portage(c, bonus);
  }
  return Math.round(cap);
}

/** Valeur marchande approximative d'un lot, pour l'UI. */
export function valeurLot(lot) {
  let v = 0;
  for (const k of Object.keys(lot)) {
    if (COMMODITIES[k]) v += lot[k] * COMMODITIES[k].prix;
  }
  return Math.round(v);
}
