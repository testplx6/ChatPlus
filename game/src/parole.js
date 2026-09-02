// La parole donnée (PAROLE.md).
//
// Le joueur pouvait se battre, payer une rançon, acheter la levée d'un siège
// déjà commencé — tout cela PENDANT la crise. Il ne pouvait rien promettre
// avant, sauf en ayant planté son drapeau : les pactes se signent entre pays.
// Et l'on ne peut pas manquer à un engagement qu'on n'a pas le droit de
// prendre, si bien que la parole trahie — le meilleur carburant de récit du
// jeu — n'existait pas de son côté.
//
// Trois décisions du propriétaire commandent ce module :
//   D1 on promet aux pays ET aux gens ; une promesse a un visage.
//   D2 le gage peut être un captif ou l'un des siens, et ils ne valent pas
//      pareil : c'est la valeur du gage qui dit ce que la parole vaut.
//   D3 une parole rompue ne coûte que ce que le monde en sait — pas de
//      réputation de parjure globale, « pas vu, pas su » vaut ici aussi.

import { drapeauDe } from './data.js';
import { commettre, delaiVersFaction } from './faits.js';
import { colonieDe, distance } from './world.js';
import { comp, lien } from './characters.js';
import { valeurCaptif } from './justice.js';

/**
 * Ce qu'on peut promettre, et ce que ça vaut à celui d'en face.
 *
 * `poids` sert à peser l'accord : plus on demande, plus il faut valoir à ses
 * yeux. Ce sont des nombres calibrables, pas des seuils décrétés dans le code.
 */
export const PAROLES = {
  treve: {
    nom: 'Une trêve',
    desc: 'On ne se cherche plus. Leurs chasseurs rentrent chez eux le temps dit.',
    poids: 18,
  },
};

/** Ce qui pèse dans la décision d'en face. Calibré au banc. */
export const ACCORD = {
  /** L'estime qu'il faut, à poids égal, pour qu'on vous écoute. */
  parPoids: 1.4,
  /** Ce qu'un gage laissé en garantie vaut en estime, par point de valeur. */
  parGage: 0.6,
  /** Ce qu'une guerre ouverte retire à l'envie de traiter. */
  enGuerre: 25,
  /** La durée maximale qu'on accorde, en heures de jeu. */
  dureeMax: 720,
};

/** Les paroles qu'on a données et qui courent encore. */
export function parolesDe(state) {
  const p = state.player;
  if (!Array.isArray(p.paroles)) p.paroles = [];
  return p.paroles.filter((x) => x.jusqua > state.temps && !x.rompue);
}

/** A-t-on donné sa parole à ce pays-ci, et laquelle ? */
export function paroleAvec(state, faction, quoi = 'treve') {
  return parolesDe(state).find((x) => x.faction === faction && x.quoi === quoi) || null;
}

/** Ce qui fait qu'un otage garantit une promesse. Calibré au banc. */
export const GAGE = {
  /** Ce que pèse ce qu'il sait faire — la seule chose visible d'un inconnu. */
  parCompetence: 0.55,
  /** Ce que pèse chaque saison passée dans la troupe : l'attachement se voit. */
  parSaison: 1.6,
  /** Ce que pèse l'affection que les autres lui portent, par point de lien. */
  parLien: 0.09,
  /** Ce que pèse d'être le seul chez vous à savoir faire quelque chose. */
  irremplacable: 14,
};

/**
 * Ce que vaut un otage aux yeux de celui qui le garde (D2).
 *
 * **Aucun multiplicateur.** La première version valait « ×1,6 si c'est un des
 * vôtres, ×0,5 si c'est un captif », et le propriétaire l'a refusée d'une
 * phrase : « pourquoi ce facteur fixe et limité ? c'est justement ce qu'on
 * chasse ici ». Un multiplicateur sans agent est la première des quatre odeurs
 * de l'audit, et celle-ci puait.
 *
 * La bonne question est : **qui juge, et sur quoi ?** Celui qui garde l'otage,
 * et il ne juge que sur ce qu'il voit. Un otage ne garantit rien par nature ;
 * il garantit dans la mesure où **le perdre vous coûterait**.
 *
 * - **Un captif** n'est pas des vôtres, et cela se voit. Pour son gardien c'est
 *   une marchandise : il vaut ce qu'on peut en tirer, ni plus ni moins —
 *   `valeurCaptif`, qui existe déjà et sert la rançon et la vente.
 * - **Un des vôtres** vaut ce que sa perte vous ferait : ce qu'il sait faire,
 *   les saisons qu'il a passées avec vous, l'affection que la troupe lui porte,
 *   et s'il est le seul chez vous à savoir quelque chose. Tout cela se voit du
 *   dehors — on regarde qui parle à qui, qui marche devant, qui recoud.
 *
 * D'où la conséquence que le facteur fixe interdisait : **une recrue de la
 * veille laissée en gage ne vaut pas mieux qu'un captif**, et un ancien que la
 * troupe aime vaut plusieurs fois davantage. Personne ne l'a décrété.
 */
export function valeurGage(state, personne, sien, groupe) {
  if (!personne) return 0;
  const savoir = Math.max(
    comp(personne, 'melee'), comp(personne, 'tir'),
    comp(personne, 'ingenierie'), comp(personne, 'medecine'));
  if (!sien) {
    // Une marchandise, au prix de la marchandise : ce que ses gens en
    // donneraient, ramené à l'échelle de l'estime.
    return Math.round(valeurCaptif(personne) / 12);
  }
  const membres = (groupe && groupe.membres) || [];
  const saisons = (personne.joursSurvecus || 0) / 30;
  let affection = 0;
  for (const autre of membres) {
    if (autre === personne || !autre.id) continue;
    affection += Math.max(0, lien(autre, personne));
  }
  // Le seul à savoir faire : on le remarque, et son absence se remarquerait
  // davantage. On compare sur le métier où il est le meilleur des siens.
  const metier = ['medecine', 'ingenierie', 'tir', 'melee'].find(
    (m) => membres.every((a) => a === personne || comp(a, m) < comp(personne, m) * 0.7));
  return Math.round(
    savoir * GAGE.parCompetence
    + saisons * GAGE.parSaison
    + affection * GAGE.parLien
    + (metier ? GAGE.irremplacable : 0));
}

/**
 * Ce qu'un pays répond à une promesse qu'on lui fait.
 *
 * Il pèse trois choses, et rien qui vienne d'ailleurs : ce que vous valez à ses
 * yeux, ce que vous demandez, et ce que vous laissez en garantie. Une guerre
 * ouverte le rend beaucoup plus difficile — mais pas sourd (D4 : on peut
 * proposer, c'est à lui de voir).
 */
export function pesePromesse(state, faction, quoi, gage = 0) {
  const def = PAROLES[quoi];
  if (!def) return { ok: false, motif: 'On ne promet pas cela.' };
  if (!drapeauDe(state.world, faction) || faction === 'essaim') {
    return { ok: false, motif: 'Il n’y a personne avec qui traiter.' };
  }
  const estime = state.player.reputation[faction] || 0;
  const guerres = state.world.guerres || [];
  const mien = state.player.drapeau;
  const enGuerre = mien && guerres.some(
    (g) => (g.a === mien && g.b === faction) || (g.b === mien && g.a === faction));
  const exige = def.poids * ACCORD.parPoids + (enGuerre ? ACCORD.enGuerre : 0);
  const offert = estime + gage * ACCORD.parGage;
  return {
    ok: offert >= exige,
    exige: Math.round(exige),
    offert: Math.round(offert),
    motif: offert >= exige ? null
      : `Ils ne vous doivent rien : il faudrait valoir ${Math.round(exige)} à leurs yeux `
        + `— vous valez ${Math.round(offert)}${gage ? ' avec le gage' : ''}.`,
  };
}


/**
 * Donner sa parole à un pays.
 *
 * Rien d'automatique : il pèse (`pesePromesse`) et refuse si vous ne valez pas
 * ce que vous demandez. Ce qui est accordé court jusqu'à une échéance dite —
 * une promesse sans terme n'est pas une promesse, c'est un vœu.
 */
export function promettre(state, faction, quoi, duree, gage, log) {
  const def = PAROLES[quoi];
  if (!def) return { ok: false, motif: 'On ne promet pas cela.' };
  const h = Math.min(Math.max(1, Math.round(duree)), ACCORD.dureeMax);
  if (paroleAvec(state, faction, quoi)) {
    return { ok: false, motif: 'Vous leur avez déjà donné votre parole.' };
  }
  const valeur = gage ? valeurGage(state, gage.personne, !!gage.sien, gage.groupe) : 0;
  const pese = pesePromesse(state, faction, quoi, valeur);
  if (!pese.ok) return pese;

  if (!Array.isArray(state.player.paroles)) state.player.paroles = [];
  const parole = {
    id: `w${state.temps}-${faction}`,
    faction,
    quoi,
    donnee: state.temps,
    jusqua: state.temps + h,
    // Ce qu'on a laissé en gage, pour mémoire : le transfert lui-même est
    // l'affaire de l'otage (T4).
    gage: valeur || null,
    rompue: false,
  };
  state.player.paroles.push(parole);
  if (log) {
    log({
      type: 'parole',
      texte: `Parole donnée à ${drapeauDe(state.world, faction).nom} : ${def.nom.toLowerCase()}, `
        + `${h} heures.${valeur ? ' Un gage reste entre leurs mains.' : ''}`,
      important: true,
    });
  }
  return { ok: true, parole };
}

/**
 * Reprendre sa parole — et ce que ça coûte dépend de qui l'a vu (D3).
 *
 * Pas de réputation de parjure qui vous suivrait partout : la rancune est celle
 * de qui l'a subi, et elle n'arrive que si quelqu'un était là pour le voir ou
 * le raconter. Trahir au désert ne coûte rien, et c'est le calcul du traître —
 * où, et devant qui. Les témoins sont ceux du reste du jeu : une ville sur la
 * case, une terre qu'ils tiennent, une de leurs colonnes à portée de regard.
 */
export function romprePromesse(state, faction, quoi, log) {
  const p = paroleAvec(state, faction, quoi);
  if (!p) return { ok: false, motif: 'Vous ne leur avez rien promis.' };
  p.rompue = true;
  const g = (state.player.groupes || [])[0];
  const rid = g ? g.regionId : 0;
  const colIci = colonieDe(state.world, rid);
  const temoins = !!(colIci && colIci.faction === faction)
    || state.world.regions[rid].controle === faction
    || (state.world.armees || []).some(
      (a) => a.faction === faction && distance(a.regionId, rid) <= 1);
  const effets = [];
  if (temoins) {
    effets.push({
      faction,
      delta: -PAROLES[quoi].poids - (p.gage ? Math.round(p.gage / 2) : 0),
      su: colIci && colIci.faction === faction
        ? state.temps
        : state.temps + delaiVersFaction(state, 'rumeur', rid, faction),
      dit: `${drapeauDe(state.world, faction).nom} sa${drapeauDe(state.world, faction).pluriel ? 'vent' : 'it'} `
        + `que vous avez repris votre parole.`,
    });
  }
  commettre(state, {
    type: 'parole-rompue', regionId: rid, t: state.temps, effets, anonyme: !temoins,
  });
  if (log) {
    log({
      type: 'parole',
      texte: `Vous reprenez votre parole à ${drapeauDe(state.world, faction).nom}.`
        + (temoins ? ' On vous a vu.' : ' Personne, ici, pour le voir.'),
      important: true,
    });
  }
  return { ok: true, vu: temoins };
}
