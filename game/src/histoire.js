// Les chapitres : la partie se découpe en périodes nommées (HISTOIRE.md,
// lot A). Pas un script — une fonction pure de l'état : la partie EST dans
// ce chapitre parce que les faits y sont. Aucun tirage, aucun état côté
// monde : tout vit dans `state.player`, la règle qui prépare le multijoueur.

import { Rng, grainDe } from './rng.js';
import { NOMS_PERSO, SURNOMS, DIPLO_FACTIONS, drapeauDe } from './data.js';
import { colonieDe, nomRegion } from './world.js';
import { estVivant } from './characters.js';
import { rencontresDe } from './rapport.js';
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

// ---------------------------------------------------------------------------
// Les fils personnels (lot C) : chaque membre porte une histoire, et le
// monde la tire. Le fil se dérive de la graine du personnage — `grainDe`,
// jamais le flux scellé — et n'avance que sur des événements VÉCUS : entrer
// dans une région, visiter des villes, se battre. Tout vit sur le membre,
// donc côté joueur, donc dans la sauvegarde.
// ---------------------------------------------------------------------------

/** Le fil d'un membre — créé au premier regard, identique à chaque partie. */
export function garantirFil(state, c) {
  if (c.fil) return c.fil;
  const r = new Rng(grainDe(String(state.world.graine), c.id, 'fil'));
  const type = ['lieu', 'dette', 'quete', 'preuves'][r.int(4)];
  const fil = { type, etape: 0, regle: false };
  if (type === 'lieu') {
    fil.cible = r.int(state.world.regions.length);
  } else if (type === 'dette') {
    fil.cible = DIPLO_FACTIONS[r.int(DIPLO_FACTIONS.length)];
  } else if (type === 'quete') {
    fil.nom = `${NOMS_PERSO[r.int(NOMS_PERSO.length)]} ${SURNOMS[r.int(SURNOMS.length)]}`;
    fil.cible = r.int(state.world.regions.length);
    fil.vues = [];
  } else {
    fil.kills0 = c.kills || 0;
  }
  c.fil = fil;
  return fil;
}

/** Ce que le fil dit sur la fiche : l'histoire, puis où elle en est. */
export function texteFil(state, c) {
  const fil = c.fil;
  if (!fil) return null;
  const lignes = [];
  if (fil.type === 'lieu') {
    lignes.push(`${c.nom} parle d’un endroit sans jamais finir ses phrases : `
      + `${nomRegion(state.world, fil.cible)}. Quelque chose y est resté.`);
    if (fil.regle) lignes.push('Le retour a eu lieu. On n’en parle plus.');
  } else if (fil.type === 'dette') {
    lignes.push(`${c.nom} doit quelque chose ${drapeauDe(state.world, fil.cible).datif} `
      + '— de l’argent, ou pire. Ça se voit quand leurs couleurs passent.');
    if (fil.regle) lignes.push('L’affaire est réglée. Personne n’a demandé comment.');
  } else if (fil.type === 'quete') {
    lignes.push(`${c.nom} cherche quelqu’un : ${fil.nom}. `
      + 'Dans chaque ville, les mêmes questions aux mêmes silences.');
    if (fil.etape >= 1 && !fil.regle) {
      lignes.push(`À force de demander, une piste : ${nomRegion(state.world, fil.cible)}.`);
    }
    if (fil.regle) {
      lignes.push(`${fil.nom} a été retrouvé. Ce qu’ils se sont dit ne regarde qu’eux.`);
    }
  } else {
    lignes.push(`${c.nom} n’a encore rien prouvé à personne — et se le pardonne mal.`);
    if (fil.regle) lignes.push('Trois fois au feu, trois fois debout. Ça suffit.');
  }
  return { titre: 'Son histoire', lignes };
}

/** Ce qui reste ouvert quand la mort ferme le fil — la stèle le dit. */
export function texteFilInacheve(state, fil) {
  if (!fil || fil.regle) return null;
  if (fil.type === 'lieu') {
    return `${nomRegion(state.world, fil.cible)} ne sera pas revu.`;
  }
  if (fil.type === 'dette') {
    return `La dette ${drapeauDe(state.world, fil.cible).datif} reste ouverte.`;
  }
  if (fil.type === 'quete') return `${fil.nom} attend toujours quelqu’un qui ne viendra pas.`;
  return 'Il ne restait rien à prouver.';
}

/**
 * Le monde tire les fils : une fois l'heure jouée, chaque membre vivant
 * confronte son affaire à ce qu'il vient de vivre. Aucun tirage — que des
 * constats sur la position, les villes vues et les combats comptés.
 */
export function tickFils(state, log) {
  for (const g of state.player.groupes || []) {
    for (const c of g.membres || []) {
      if (!c || !estVivant(c)) continue;
      const fil = garantirFil(state, c);
      if (fil.regle) continue;
      if (fil.type === 'lieu') {
        if (g.regionId === fil.cible) {
          fil.regle = true;
          if (log) {
            log({
              type: 'fil',
              texte: `${c.nom} est de retour à ${nomRegion(state.world, fil.cible)}. `
                + 'Une longue halte, un peu à l’écart des autres.',
              regionId: g.regionId,
              important: true,
            });
          }
        }
      } else if (fil.type === 'dette') {
        const col = colonieDe(state.world, g.regionId);
        if (col && !col.ruine && col.faction === fil.cible) {
          fil.regle = true;
          if (log) {
            log({
              type: 'fil',
              texte: `À ${col.nom}, ${c.nom} a disparu quelques heures, puis a `
                + `rejoint la colonne sans un mot. La vieille affaire ${drapeauDe(state.world, fil.cible).datif} est réglée.`,
              regionId: g.regionId,
              important: true,
            });
          }
        }
      } else if (fil.type === 'quete') {
        if (fil.etape === 0) {
          const col = colonieDe(state.world, g.regionId);
          if (col && !col.ruine && !fil.vues.includes(g.regionId)) {
            fil.vues.push(g.regionId);
            if (fil.vues.length >= 3) {
              fil.etape = 1;
              if (log) {
                log({
                  type: 'fil',
                  texte: `À force de demander, ${c.nom} tient une piste : ${fil.nom} `
                    + `aurait été vu vers ${nomRegion(state.world, fil.cible)}.`,
                  regionId: g.regionId,
                  important: true,
                });
              }
            }
          }
        } else if (g.regionId === fil.cible) {
          fil.regle = true;
          if (log) {
            log({
              type: 'fil',
              texte: `${c.nom} a retrouvé ${fil.nom}. Ils ont parlé longtemps, à voix basse. `
                + 'Au matin, la colonne est repartie au complet.',
              regionId: g.regionId,
              important: true,
            });
          }
        }
      } else if ((c.kills || 0) - (fil.kills0 || 0) >= 3) {
        fil.regle = true;
        if (log) {
          log({
            type: 'fil',
            texte: `${c.nom} ne baisse plus les yeux : trois fois au feu, trois fois debout. `
              + 'Quelque chose s’est tu.',
            regionId: g.regionId,
            important: true,
          });
        }
      }
    }
  }
}

/**
 * La mémoire des lieux (lot E) : entrer dans une ville où l'on a fait
 * quelque chose de notable produit une ligne d'accueil — une fois par
 * arrivée, pas tant qu'on y reste. Une ville où rien ne s'est passé ne dit
 * rien. Les faits viennent de la mémoire des rencontres (rapport.js) :
 * rien n'est stocké côté monde.
 */
export function tickMemoireLieux(state, log) {
  const r = rencontresDe(state);
  for (const g of state.player.groupes || []) {
    if (r.pos[g.id] === g.regionId) continue;
    r.pos[g.id] = g.regionId;
    const col = colonieDe(state.world, g.regionId);
    if (!col || col.ruine) continue;
    const n = r.contrats[col.id] || 0;
    if (n >= 1 && log) {
      log({
        type: 'accueil',
        texte: `À ${col.nom}, des visages connus — ${n} contrat${n > 1 ? 's' : ''} `
          + `tenu${n > 1 ? 's' : ''} pour la ville. Des saluts de tête au passage de la colonne.`,
        regionId: g.regionId,
      });
    }
  }
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
