// Personnages : génération, compétences qui montent à l'usage, blessures
// localisées, besoins. Aucune notion d'UI ici.

import {
  SKILL_KEYS, BODY_KEYS, BODY_PARTS, ITEMS, NOMS_PERSO, SURNOMS,
  TRAITS, TRAIT_KEYS,
} from './data.js';

// Les identifiants sont tirés du RNG de la partie, pas d'un compteur global :
// deux parties lancées sur la même graine produisent exactement les mêmes ids,
// et une sauvegarde rechargée reprend la suite sans collision.
export function idDepuisRng(rng, prefix = 'c') {
  return prefix + rng.u32().toString(36);
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

const ARCHETYPES = {
  ferrailleur: { nom: 'Ferrailleur', bonus: { ingenierie: 14, endurance: 8, force: 6 }, arme: 'barre' },
  chasseur: { nom: 'Chasseur', bonus: { tir: 16, furtivite: 10 }, arme: 'clous' },
  brute: { nom: 'Brute', bonus: { force: 18, melee: 14, endurance: 6 }, arme: 'machette' },
  medic: { nom: 'Médic', bonus: { medecine: 20, ingenierie: 6 }, arme: 'barre' },
  courtier: { nom: 'Courtier', bonus: { commerce: 20, furtivite: 8 }, arme: 'clous' },
  eclaireur: { nom: 'Éclaireur', bonus: { furtivite: 16, endurance: 12, tir: 6 }, arme: 'machette' },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

export function makeCharacter(rng, opts = {}) {
  const arch = opts.archetype || rng.pick(ARCHETYPE_KEYS);
  const def = ARCHETYPES[arch];
  const niveau = opts.niveau ?? 0; // 0 = débutant, monte les stats de base
  const c = {
    id: idDepuisRng(rng, 'c'),
    nom: opts.nom || genNom(rng),
    archetype: arch,
    archetypeNom: def.nom,
    age: rng.irange(19, 47),
    skills: {},
    xp: {},
    corps: {},
    faim: rng.irange(5, 25),
    fatigue: rng.irange(0, 20),
    moral: rng.irange(55, 80),
    sang: 0,
    etat: 'ok',
    koHeures: 0,
    equip: { arme: opts.arme || def.arme, armure: opts.armure || null, greffes: {} },
    kills: 0,
    joursSurvecus: 0,
    traits: tirerTraits(rng, opts.traits),
  };
  for (const k of SKILL_KEYS) {
    const base = rng.irange(4, 14) + (def.bonus[k] || 0) + niveau * rng.irange(2, 6);
    c.skills[k] = Math.max(1, Math.min(100, Math.round(base)));
    c.xp[k] = 0;
  }
  for (const p of BODY_KEYS) {
    const max = Math.round(BODY_PARTS[p].pv * (0.85 + c.skills.endurance / 220));
    c.corps[p] = { pv: max, max, perdu: false };
  }
  return c;
}

/** Un à trois traits, dont au plus un défaut : de quoi rendre les gens distincts. */
function tirerTraits(rng, imposes) {
  if (imposes) return imposes.slice();
  const atouts = TRAIT_KEYS.filter((k) => !TRAITS[k].malus);
  const defauts = TRAIT_KEYS.filter((k) => TRAITS[k].malus);
  const out = [];
  const combien = rng.weighted([[1, 4], [2, 3], [3, 1]]);
  const pioche = rng.shuffle(atouts);
  for (let i = 0; i < combien && i < pioche.length; i++) out.push(pioche[i]);
  if (rng.chance(0.4)) out.push(rng.pick(defauts));
  return out;
}

/** Multiplicateurs cumulés des traits. Recalculé à la volée : deux traits, c'est gratuit. */
export function mods(c) {
  const m = {
    faim: 1, fatigue: 1, portage: 1, vitesse: 1,
    degatsSubis: 1, evitement: 1, saignement: 1, soin: 1, moral: 1,
  };
  for (const t of c.traits || []) {
    const def = TRAITS[t];
    if (!def || !def.mult) continue;
    for (const k of Object.keys(def.mult)) m[k] = (m[k] ?? 1) * def.mult[k];
  }
  return m;
}

export function genNom(rng) {
  const n = rng.pick(NOMS_PERSO);
  return rng.chance(0.45) ? `${n} ${rng.pick(SURNOMS)}` : n;
}

// ---------------------------------------------------------------------------
// État corporel
// ---------------------------------------------------------------------------

export function ratio(c, part) {
  const p = c.corps[part];
  if (!p || p.max <= 0) return 0;
  return Math.max(0, p.pv / p.max);
}

export function pvTotal(c) {
  let pv = 0;
  let max = 0;
  for (const p of BODY_KEYS) {
    pv += c.corps[p].pv;
    max += c.corps[p].max;
  }
  return { pv, max, pct: max > 0 ? pv / max : 0 };
}

export function estDebout(c) {
  return c.etat === 'ok';
}

export function estVivant(c) {
  return c.etat !== 'mort';
}

/** Bonus d'équipement et de traits sur une compétence. */
function bonusEquip(c, skill) {
  let b = 0;
  for (const t of c.traits || []) {
    const def = TRAITS[t];
    if (def && def.bonus && def.bonus[skill]) b += def.bonus[skill];
  }
  const arm = c.equip.armure && ITEMS[c.equip.armure];
  if (arm && arm.bonus && arm.bonus[skill]) b += arm.bonus[skill];
  for (const membre of Object.keys(c.equip.greffes)) {
    const g = ITEMS[c.equip.greffes[membre]];
    if (g && g.bonus && g.bonus[skill]) b += g.bonus[skill];
  }
  return b;
}

/**
 * Valeur effective d'une compétence : base + équipement, dégradée par les
 * blessures pertinentes, la fatigue et la faim.
 */
export function comp(c, skill) {
  const base = (c.skills[skill] || 0) + bonusEquip(c, skill);
  const tete = 0.5 + 0.5 * ratio(c, 'tete');
  const torse = 0.6 + 0.4 * ratio(c, 'torse');
  const bras = 0.45 + 0.55 * ((ratio(c, 'brasG') + ratio(c, 'brasD')) / 2);
  const jambes = 0.45 + 0.55 * ((ratio(c, 'jambeG') + ratio(c, 'jambeD')) / 2);

  let m;
  switch (skill) {
    case 'melee': m = tete * torse * bras; break;
    case 'tir': m = tete * torse * (0.6 + 0.4 * bras); break;
    case 'force': m = torse * bras; break;
    case 'endurance': m = torse * jambes; break;
    case 'furtivite': m = tete * jambes * (0.7 + 0.3 * torse); break;
    default: m = tete * torse; break;
  }
  const fat = 1 - Math.min(0.55, c.fatigue / 200);
  const faim = 1 - Math.min(0.45, c.faim / 240);
  const mor = 0.8 + (c.moral / 100) * 0.3;
  return Math.max(1, base * m * fat * faim * mor);
}

// ---------------------------------------------------------------------------
// Progression : l'usage fait la compétence
// ---------------------------------------------------------------------------

const XP_BASE = 18;

export function seuilXp(niveau) {
  return Math.round(XP_BASE * Math.pow(niveau + 1, 1.25));
}

/** Retourne le nombre de niveaux gagnés (0 la plupart du temps). */
export function gagnerXp(c, skill, montant) {
  if (!(skill in c.skills) || montant <= 0) return 0;
  const niv = c.skills[skill];
  if (niv >= 100) return 0;
  // Plus on est bon, plus ça vient lentement.
  const facteur = Math.max(0.12, 1 - niv / 115);
  c.xp[skill] += montant * facteur;
  let gagnes = 0;
  while (c.skills[skill] < 100 && c.xp[skill] >= seuilXp(c.skills[skill])) {
    c.xp[skill] -= seuilXp(c.skills[skill]);
    c.skills[skill]++;
    gagnes++;
  }
  return gagnes;
}

// ---------------------------------------------------------------------------
// Dégâts et soins
// ---------------------------------------------------------------------------

export function armureTotale(c, bonusPct = 0) {
  const a = c.equip.armure && ITEMS[c.equip.armure];
  const base = a ? a.armure : 0;
  return base * (1 + bonusPct);
}

export function tirerMembre(rng) {
  const entries = BODY_KEYS.map((k) => [k, BODY_PARTS[k].poids]);
  return rng.weighted(entries);
}

/**
 * Applique des dégâts. Retourne { degats, membre, ko, mort, membrePerdu }.
 * Personne ne meurt d'un seul coup debout : on tombe KO d'abord.
 */
export function blesser(c, montant, membre, rng, opts = {}) {
  if (c.etat === 'mort') return { degats: 0, membre, ko: false, mort: false, membrePerdu: false };
  const m = mods(c);
  const part = c.corps[membre];
  const d = Math.max(1, Math.round(montant * m.degatsSubis));
  part.pv = Math.max(0, part.pv - d);

  let ko = false;
  let mort = false;
  let membrePerdu = false;

  // opts.letal : true = coup de grâce, false = jamais mortel, absent = 35 %
  const vital = BODY_PARTS[membre].vital;
  if (part.pv <= 0) {
    if (vital) {
      const peutTuer = opts.letal === true
        || (opts.letal !== false && rng.chance(0.35));
      if (c.etat === 'ko' && peutTuer) mort = true;
      else ko = true;
    } else if (!part.perdu && rng.chance(0.22)) {
      part.perdu = true;
      membrePerdu = true;
      ko = true;
    }
  }
  // Un torse ou une tête très amochés font tomber
  if (!mort && c.etat === 'ok') {
    const t = pvTotal(c);
    if (t.pct < 0.32 && rng.chance(0.5)) ko = true;
  }
  if (mort) {
    c.etat = 'mort';
  } else if (ko && c.etat === 'ok') {
    c.etat = 'ko';
    c.koHeures = rng.irange(3, 10);
  }
  // Saignement
  c.sang = Math.min(100, c.sang + d * (vital ? 0.55 : 0.35) * m.saignement);
  return { degats: d, membre, ko, mort, membrePerdu };
}

/** Soin sur une heure. `qualite` ~ [0.5, 3] selon médic / infirmerie / medkits. */
export function soigner(c, qualite, rng) {
  if (c.etat === 'mort') return;
  // Arrêt du saignement d'abord
  if (c.sang > 0) c.sang = Math.max(0, c.sang - 3 * qualite);
  const parts = BODY_KEYS.filter((p) => c.corps[p].pv < c.corps[p].max);
  if (!parts.length) return;
  const cible = rng.pick(parts);
  const p = c.corps[cible];
  const gain = 0.9 * qualite * (p.perdu ? 0.4 : 1);
  p.pv = Math.min(p.max, p.pv + gain);
  if (c.etat === 'ko') {
    c.koHeures -= 1;
    const t = pvTotal(c);
    if (c.koHeures <= 0 && t.pct > 0.42) c.etat = 'ok';
  }
}

/** Capacité de portage en kg. */
export function portage(c, bonusPct = 0) {
  if (!estVivant(c)) return 0;
  const base = 30 + comp(c, 'force') * 0.7 + comp(c, 'endurance') * 0.25;
  const equip = poidsEquip(c);
  return Math.max(0, base * (1 + bonusPct) * mods(c).portage - equip);
}

export function poidsEquip(c) {
  let w = 0;
  if (c.equip.arme && ITEMS[c.equip.arme]) w += ITEMS[c.equip.arme].poids;
  if (c.equip.armure && ITEMS[c.equip.armure]) w += ITEMS[c.equip.armure].poids;
  return w;
}

/** Peut-il porter cette arme ? (les grosses armes demandent de la force) */
export function peutEquiper(c, itemKey) {
  const it = ITEMS[itemKey];
  if (!it) return false;
  if (it.reqForce && comp(c, 'force') < it.reqForce) return false;
  if (it.type === 'greffe') {
    const p = c.corps[it.membre];
    return !!p;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Besoins horaires
// ---------------------------------------------------------------------------

/**
 * Fait passer une heure sur un personnage.
 * `effort` : 0 repos, 1 marche/travail normal, 1.6 combat ou marche forcée.
 * Retourne un tableau de messages notables (mort, membre perdu…).
 */
export function tickPerso(c, effort, rng, ctx = {}) {
  const msgs = [];
  if (c.etat === 'mort') return msgs;

  const m = mods(c);
  c.faim = Math.min(120, c.faim + (0.55 + 0.25 * effort) * m.faim);
  if (effort <= 0.05) {
    c.fatigue = Math.max(0, c.fatigue - 6 / m.fatigue);
  } else {
    const end = comp(c, 'endurance');
    c.fatigue = Math.min(120, c.fatigue + (1.6 * effort) * (1 - Math.min(0.5, end / 200)) * m.fatigue);
  }

  // Saignement : une plaie légère se referme seule ; une hémorragie tue.
  if (c.sang > 0) {
    if (c.sang > 12) {
      const perte = (c.sang - 12) / 26;
      const r = blesser(c, perte, 'torse', rng, { letal: c.sang > 40 ? rng.chance(0.3) : false });
      if (r.mort) msgs.push({ type: 'mort', texte: `${c.nom} s’est vidé de son sang.` });
    }
    // Coagulation, accélérée si quelqu'un est encore debout pour comprimer
    c.sang = Math.max(0, c.sang - 2.2 - (ctx.premiersSecours ? 2.5 : 0));
  }

  // Famine
  if (c.faim >= 100) {
    const r = blesser(c, 1.6, 'torse', rng);
    if (r.mort) msgs.push({ type: 'mort', texte: `${c.nom} est mort de faim.` });
    c.moral = Math.max(0, c.moral - 1.2);
  } else if (c.faim < 40) {
    c.moral = Math.min(100, c.moral + 0.25);
  }

  // Épuisement
  if (c.fatigue >= 110) {
    c.moral = Math.max(0, c.moral - 0.8);
    if (c.etat === 'ok' && rng.chance(0.05)) {
      c.etat = 'ko';
      c.koHeures = rng.irange(2, 5);
      msgs.push({ type: 'ko', texte: `${c.nom} s’effondre d’épuisement.` });
    }
  }

  // Récupération naturelle légère hors combat
  const q = (ctx.soin ?? 0) * m.soin;
  if (q > 0) soigner(c, q, rng);
  else if (effort <= 0.05) soigner(c, 0.35 * m.soin, rng);

  if (c.etat === 'ko') {
    c.koHeures = Math.max(0, c.koHeures - 1);
    const t = pvTotal(c);
    if (c.koHeures <= 0 && t.pct > 0.42) {
      c.etat = 'ok';
      msgs.push({ type: 'reveil', texte: `${c.nom} se remet debout.` });
    }
  }
  return msgs;
}

/** Nourrit un personnage. Retourne la quantité de rations consommée. */
export function nourrir(c, dispo) {
  if (c.etat === 'mort' || dispo <= 0) return 0;
  if (c.faim < 25) return 0;
  const besoin = Math.min(dispo, Math.ceil(c.faim / 45));
  c.faim = Math.max(0, c.faim - besoin * 45);
  c.moral = Math.min(100, c.moral + besoin * 1.5);
  return besoin;
}

/** Résumé court pour l'UI. */
export function etatCourt(c) {
  if (c.etat === 'mort') return 'MORT';
  if (c.etat === 'ko') return 'K.O.';
  const t = pvTotal(c);
  if (c.sang > 25) return 'SAIGNE';
  if (t.pct < 0.5) return 'BLESSÉ';
  if (c.faim > 85) return 'AFFAMÉ';
  if (c.fatigue > 90) return 'ÉPUISÉ';
  return 'OK';
}
