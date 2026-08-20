// Les chapitres : la partie se découpe en périodes nommées (HISTOIRE.md,
// lot A). Pas un script — une fonction pure de l'état : la partie EST dans
// ce chapitre parce que les faits y sont. Aucun tirage, aucun état côté
// monde : tout vit dans `state.player`, la règle qui prépare le multijoueur.

import { faitsDe } from './chronique.js';

/**
 * Les chapitres possibles, par ordre de préséance : le premier dont la
 * condition est vraie l'emporte. L'ordre raconte ce qui domine une période —
 * un deuil récent pèse plus que la guerre, la guerre plus que le service,
 * le service plus que la fortune, la fortune plus que le camp.
 */
export const CHAPITRES = [
  {
    cle: 'deuil',
    titre: 'Ce qui reste',
    dit: 'Quelqu’un manque. La colonne marche quand même.',
    quand: (f, state) => {
      const m = state.memorial || [];
      if (!m.length || f.vivants < 1) return false;
      return state.temps - (m[m.length - 1].t || 0) < 7 * 24;
    },
  },
  {
    cle: 'sang',
    titre: 'Le prix du sang',
    dit: 'Votre pays est en guerre, et vous êtes du pays.',
    quand: (f, state) => !!f.faction && (state.world.guerres || [])
      .some((g) => g.a === f.faction || g.b === f.faction),
  },
  {
    cle: 'couleurs',
    titre: 'Les couleurs',
    dit: 'On porte le drapeau d’un autre, et il porte votre solde.',
    quand: (f) => f.grade >= 1 && !!f.faction,
  },
  {
    cle: 'affaires',
    titre: 'Les affaires',
    dit: 'L’argent s’est mis à travailler. Les routes comptent plus que les armes.',
    quand: (f) => f.credits >= 3000,
  },
  {
    cle: 'toit',
    titre: 'Un toit',
    dit: 'Un camp à soi : quelque chose que le monde peut prendre, désormais.',
    quand: (f, state) => !!(state.base && state.base.fonde),
  },
  {
    cle: 'poussiere',
    titre: 'La poussière',
    dit: 'On marche, on mange quand on peut, on compte les jours.',
    quand: () => true,
  },
];

export function infoChapitre(cle) {
  return CHAPITRES.find((c) => c.cle === cle) || CHAPITRES[CHAPITRES.length - 1];
}

/** Le chapitre que l'état raconte, indépendamment de celui qu'on affiche. */
export function chapitreDe(state) {
  const f = faitsDe(state);
  for (const c of CHAPITRES) if (c.quand(f, state)) return c;
  return CHAPITRES[CHAPITRES.length - 1];
}

/** Chiffres romains — c'est ainsi qu'un chapitre se numérote. */
export function romain(n) {
  const table = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
    [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let reste = Math.max(1, Math.floor(n));
  let sortie = '';
  for (const [v, s] of table) {
    while (reste >= v) { sortie += s; reste -= v; }
  }
  return sortie;
}

/**
 * Tourner la page quand l'état a vraiment changé de nature. L'hystérésis de
 * quarante-huit heures évite qu'une oscillation — un solde qui passe deux
 * fois le seuil dans la journée — fasse tourner les pages : un chapitre
 * tient au moins deux jours, sauf le tout premier.
 */
export function tickChapitres(state, log) {
  const ch = chapitreDe(state);
  const courant = state.player.chapitre;
  if (courant && courant.cle === ch.cle) return;
  if (courant && state.temps - (courant.t || 0) < 48) return;
  state.player.chapitreN = (state.player.chapitreN || 0) + 1;
  state.player.chapitre = { cle: ch.cle, t: state.temps };
  if (!state.player.chapitres) state.player.chapitres = [];
  state.player.chapitres.push({ cle: ch.cle, t: state.temps, n: state.player.chapitreN });
  if (state.player.chapitres.length > 40) state.player.chapitres.shift();
  if (log) {
    log({
      type: 'chronique',
      texte: `Chapitre ${romain(state.player.chapitreN)} — ${ch.titre}.`,
      important: true,
      vu: true,
    });
  }
}
