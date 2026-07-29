// Les gens qui comptent dans une ville.
//
// Cinq mille cinq cents habitants nommés, c'est quatre mégaoctets de sauvegarde
// et six cents fois le budget du tick : la population reste donc un effectif,
// réparti par métiers. Mais un effectif ne se rencontre pas. Ceux que le joueur
// peut toucher — celui qui commande, celui qui vend, celui qui recoud, celui qui
// fait tourner l'atelier — ont un nom, un âge, une humeur, une compétence, et
// une opinion sur vous.
//
// Ils vieillissent, se lassent, meurent, sont remplacés. Un armurier retors vend
// cher ; un chef dur tient sa ville mais l'aigrit ; un contremaître qui vous
// aime bien vous laisse voir les stocks. C'est là que la granularité se paie
// vraiment, parce qu'on la voit.

import { NOMS_PERSO, SURNOMS, METIERS_VILLE, METIER_VILLE_KEYS, FACTIONS } from './data.js';
import { idDepuisRng } from './characters.js';
import { HEURES_PAR_AN } from './climat.js';

/** Les charges qu'une ville pourvoit, selon ce qu'elle est. */
export const CHARGES = {
  chef: {
    nom: 'Chef de ville', skill: 'commerce',
    desc: 'Décide, arbitre, et porte ce qui va mal.',
  },
  armurier: {
    nom: 'Armurier', skill: 'commerce',
    desc: 'Tient l’étal. Ses prix sont les siens.',
  },
  medecin: {
    nom: 'Médecin', skill: 'medecine', requiert: 'medecin',
    desc: 'Le seul dont l’absence se remarque tout de suite.',
  },
  contremaitre: {
    nom: 'Contremaître', skill: 'ingenierie',
    desc: 'Fait tenir la production, et sait où sont les pièces.',
  },
};

export const CHARGE_KEYS = Object.keys(CHARGES);

/** Ce qui distingue une personne d'une fonction. */
export const CARACTERES = {
  droit: { nom: 'Droit', marge: -0.06, ordre: 0.04, humeur: 6 },
  retors: { nom: 'Retors', marge: 0.1, ordre: -0.02, humeur: -4 },
  dur: { nom: 'Dur', marge: 0.03, ordre: 0.08, humeur: -10 },
  bonhomme: { nom: 'Bonhomme', marge: -0.03, ordre: -0.03, humeur: 12 },
  avare: { nom: 'Avare', marge: 0.13, ordre: 0.01, humeur: -6 },
  meticuleux: { nom: 'Méticuleux', marge: 0, ordre: 0.05, humeur: 2, rendement: 0.1 },
  fatigue: { nom: 'Fatigué', marge: 0.02, ordre: -0.05, humeur: -8, rendement: -0.08 },
  ambitieux: { nom: 'Ambitieux', marge: 0.05, ordre: 0.03, humeur: 0, rendement: 0.06 },
};

const CARACTERE_KEYS = Object.keys(CARACTERES);

// ---------------------------------------------------------------------------
// Naissance et mort d'une charge
// ---------------------------------------------------------------------------

function nommer(rng) {
  const base = rng.pick(NOMS_PERSO);
  return rng.chance(0.35) ? `${base} ${rng.pick(SURNOMS)}` : base;
}

export function creerNotable(rng, charge, col, t) {
  const def = CHARGES[charge];
  return {
    id: idDepuisRng(rng, 'n'),
    charge,
    nom: nommer(rng),
    age: rng.irange(26, 62),
    // Compétence dans sa partie : c'est elle qui décide de son effet.
    comp: rng.irange(18, 55) + (col.taille - 1) * rng.irange(2, 8),
    caractere: rng.pick(CARACTERE_KEYS),
    humeur: rng.irange(40, 70),
    // Ce qu'il pense de vous. On part de rien : il ne vous connaît pas.
    opinion: 0,
    // Ce qu'il attend de vous, et ce qu'il retient de vous. Voir services.js.
    demande: null,
    memoire: [],
    depuis: t,
    skill: def.skill,
  };
}

/** Les charges qu'une ville doit pourvoir, d'après ce qu'elle est. */
export function chargesDe(col) {
  const out = ['chef', 'armurier'];
  if (col.taille >= 2) out.push('contremaitre');
  if ((col.emplois && col.emplois.medecin) > 0) out.push('medecin');
  return out;
}

/**
 * Pourvoit ce qui manque, retire ce qui n'a plus lieu d'être. Chemin rapide en
 * tête : les charges d'une ville ne changent qu'à un changement de rang ou à la
 * disparition de ses médecins, c'est-à-dire presque jamais — et cette fonction
 * est appelée à chaque tranche de colonie.
 */
export function pourvoirCharges(col, rng, t) {
  if (!col.notables) col.notables = [];
  const attendues = 2 + (col.taille >= 2 ? 1 : 0)
    + ((col.emplois && col.emplois.medecin) > 0 ? 1 : 0);
  if (col.notables.length === attendues) return;

  const voulues = chargesDe(col);
  col.notables = col.notables.filter((p) => voulues.includes(p.charge));
  for (const charge of voulues) {
    if (col.notables.some((p) => p.charge === charge)) continue;
    col.notables.push(creerNotable(rng, charge, col, t));
  }
}

export function notable(col, charge) {
  if (!col || !col.notables) return null;
  return col.notables.find((p) => p.charge === charge) || null;
}

// ---------------------------------------------------------------------------
// Effets
// ---------------------------------------------------------------------------

function trait(p) {
  return CARACTERES[p && p.caractere] || CARACTERES.droit;
}

/**
 * Ce que l'armurier ajoute à sa marge, ou en retire. Un bon commerçant se
 * défend mieux ; un retors prend davantage ; et il vous fait un prix s'il vous
 * apprécie. Entre le pire et le meilleur cas, ça fait un tiers de différence.
 */
export function margeMarchand(col) {
  const p = notable(col, 'armurier');
  if (!p) return 0;
  const t = trait(p);
  return t.marge + Math.min(0.12, p.comp / 700) - (p.opinion / 100) * 0.12;
}

/** Ce que le contremaître ajoute à la production de la ville. */
export function rendementNotables(col) {
  const p = notable(col, 'contremaitre');
  if (!p) return 1;
  const t = trait(p);
  return 1 + Math.min(0.25, p.comp / 320) + (t.rendement || 0);
}

/** Ce que le chef retire à l'agitation — ou lui ajoute. */
export function ordreDe(col) {
  const p = notable(col, 'chef');
  if (!p) return 0;
  const t = trait(p);
  return t.ordre + Math.min(0.06, p.comp / 900) + (p.humeur - 50) / 2000;
}

/** Comment ces gens vous voient, en moyenne. Sert à l'affichage. */
export function opinionMoyenne(col) {
  if (!col.notables || !col.notables.length) return 0;
  let s = 0;
  for (const p of col.notables) s += p.opinion || 0;
  return s / col.notables.length;
}

/** Un geste marquant se sait : on ajuste ce que les gens d'ici pensent de vous. */
export function ajusterOpinion(col, delta) {
  if (!col.notables) return;
  for (const p of col.notables) {
    p.opinion = Math.max(-100, Math.min(100, (p.opinion || 0) + delta));
  }
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/**
 * Une tranche de vie pour les gens d'une ville. Appelé au rythme des colonies,
 * donc quelques dizaines de fois par jour de jeu au total : ils vieillissent
 * lentement, leur humeur suit l'état de la ville, et leur opinion se cale sur
 * votre réputation auprès de leur faction — plus lentement qu'elle, parce qu'on
 * juge quelqu'un sur ce qu'il fait ici, pas sur ce qu'on dit de lui ailleurs.
 */
export function tickNotables(col, rng, dt, reputation, log, t = 0) {
  if (!col.notables || !col.notables.length) return;
  const aise = Math.max(0, Math.min(1, (col.stock.rations || 0) / Math.max(1, col.pop * 0.8)));
  const vers = (reputation || 0) * 0.7;
  const socle = 30 + aise * 45 - (col.unrest || 0) * 40;

  for (const p of col.notables) {
    p.age += dt / HEURES_PAR_AN; // quatre saisons de trente jours, pas 360 jours
    // L'humeur suit ce que vaut la vie ici, amortie par le caractère.
    const t = trait(p);
    const cible = socle + t.humeur;
    p.humeur += (Math.max(0, Math.min(100, cible)) - p.humeur) * 0.01 * dt;
    // On s'améliore dans son métier, lentement, jusqu'à un plafond honnête.
    if (p.comp < 90) p.comp += 0.0016 * dt;
    // L'opinion tend vers votre réputation locale, sans jamais l'atteindre —
    // mais pas à la même vitesse dans les deux sens. Ce qu'on gagne en personne
    // ne s'efface pas au rythme d'une rumeur : à vitesse symétrique, un service
    // rendu était intégralement effacé en une semaine de jeu et tout le système
    // devenait décoratif. Le banc l'a chiffré : zéro personne acquise en fin de
    // partie sur trente parties.
    const ecart = vers - (p.opinion || 0);
    p.opinion = (p.opinion || 0) + ecart * (ecart > 0 ? 0.004 : 0.0008) * dt;

    // On finit par se retirer, ou pire.
    const vieux = Math.max(0, p.age - 58) / 30;
    const q = 0.00006 + vieux * 0.0006;
    if (rng.chance(dt === 1 ? q : 1 - Math.pow(1 - q, dt))) {
      const partant = p.nom;
      const neuf = creerNotable(rng, p.charge, col, 0);
      Object.assign(p, neuf, { depuis: 0 });
      if (log) {
        log({
          type: 'notable',
          texte: `${CHARGES[p.charge].nom} de ${col.nom} : ${partant} laisse la place à ${p.nom}.`,
          regionId: col.regionId,
        });
      }
    }
  }
}

/** Le métier dominant d'une ville, pour la décrire d'un mot. */
export function vocation(col) {
  if (!col.emplois) return null;
  let best = null;
  for (const k of METIER_VILLE_KEYS) {
    if (!best || (col.emplois[k] || 0) > (col.emplois[best] || 0)) best = k;
  }
  return best ? { key: best, def: METIERS_VILLE[best], n: col.emplois[best] || 0 } : null;
}
