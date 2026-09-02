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
import { jaugeRaid } from './base.js';
import { encaisser } from './economy.js';
import { regler, soldeIci, signeIci, entrerDehors } from './monnaie.js';
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
  tribut: {
    nom: 'Un tribut',
    desc: 'On verse, et l’on vous oublie. Tant que ça tombe — et le jour où ça '
      + 'cesse, ils ne mettront pas longtemps à s’en apercevoir.',
    poids: 6,
    /** Ce qui se verse se promet moins cher : l'argent parle pour vous. */
    verse: true,
  },
};

/** Ce qui règle un tribut. Calibré au banc. */
export const TRIBUT = {
  /**
   * Ce qu'ils réclament, en crédits, par point de butin qu'ils croient voir.
   *
   * `jaugeRaid` mesure un **appétit**, pas une somme : sans conversion, un
   * hameau et une place courue tombaient tous deux sur le plancher et le tarif
   * ne variait plus du tout. Ce nombre-ci est le pont entre les deux, et il se
   * balaie comme le reste.
   */
  parPoint: 2.6,
  /** Ce que le risque qu'ils voient retire à leur appétit : on rançonne moins qui mord. */
  parRisque: 0.35,
  /** Ce que l'estime fait baisser, par point. */
  parEstime: 0.008,
  /**
   * Ce que la haine fait monter, par point d'estime négative.
   *
   * On ne refuse pas l'argent de qui l'on déteste — on le fait payer. Sans
   * cela, un pays qui vous hait refusait votre tribut « faute d'estime », ce
   * qui est exactement à l'envers : le tribut est ce qu'on propose QUAND on
   * est mal vu.
   */
  parHaine: 0.014,
  /** Le plancher : on ne se dérange pas pour trois crédits. */
  minimum: 40,
  /** Chaque combien on verse, en heures. */
  cadence: 240,
};

/**
 * Ce qu'un pays réclame pour vous laisser tranquille.
 *
 * **Personne ne fixe un tarif.** Ils demandent une part de ce qu'ils croient
 * pouvoir vous prendre — c'est-à-dire exactement ce que les pillards jaugent
 * déjà (`jaugeRaid`, PROMESSES P6) : les bouches à nourrir, les colporteurs qui
 * repartent chargés, la place inscrite sur les cartes. Ce qui se voit, jamais
 * votre registre.
 *
 * Et l'on rançonne moins ceux qui mordent (le risque qu'ils voient) et moins
 * ceux qu'on apprécie (l'estime). Un tribut, c'est un calcul de prédateur qui
 * préfère être payé que de se battre.
 */
export function tributDemande(state, faction) {
  const j = state.base && state.base.fonde ? jaugeRaid(state) : { butin: 60, risque: 0 };
  const estime = state.player.reputation[faction] || 0;
  const brut = j.butin * TRIBUT.parPoint;
  const remise = 1 - Math.min(0.6, Math.max(0, estime) * TRIBUT.parEstime)
    + Math.min(1.5, Math.max(0, -estime) * TRIBUT.parHaine);
  const peur = 1 / (1 + (j.risque / 100) * TRIBUT.parRisque);
  return Math.max(TRIBUT.minimum, Math.round(brut * remise * peur));
}

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
  /** Ce qu'un crédit promis pèse dans la balance, quand la parole se verse. */
  parCredit: 0.35,
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
  // Ce qui se verse se règle autrement : **c'est eux qui fixent le prix**, et
  // le payer suffit. L'estime ne décide pas de l'accord, elle décide du tarif
  // (`tributDemande` fait remise à qui l'on apprécie et majore de qui l'on
  // déteste). La première version faisait les deux à la fois, et un pays
  // refusait son propre tarif à un petit camp mal vu : on ne pouvait acheter
  // la paix que quand on n'en avait pas besoin.
  //
  // Ce qui les fait refuser quand même : une guerre ouverte. On ne s'achète
  // pas une paix qu'on n'a pas fini de perdre — mais on peut toujours proposer
  // (D4), et c'est à eux de voir.
  if (def.verse) {
    const prix = tributDemande(state, faction);
    return {
      ok: !enGuerre,
      exige: prix,
      offert: prix,
      motif: enGuerre
        ? `${drapeauDe(state.world, faction).nom} ${drapeauDe(state.world, faction).pluriel
          ? 'sont en guerre contre vous' : 'est en guerre contre vous'} : `
          + `ce n’est plus une affaire d’argent.`
        : null,
    };
  }
  const exige = def.poids * ACCORD.parPoids;
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
  // **Il part.** Sans cela, le gage était une promesse de plus : on annonçait
  // quelqu'un et on le gardait. Un otage garantit parce qu'il change de mains
  // — il quitte la troupe (ou la geôle du groupe) et reste chez eux jusqu'au
  // terme. C'est ce qui fait la différence entre une garantie et un mot.
  let otage = null;
  if (gage && gage.personne) {
    const gr = gage.groupe || (state.player.groupes || [])[0];
    if (gr) {
      if (gage.sien) gr.membres = (gr.membres || []).filter((x) => x !== gage.personne);
      else gr.prisonniers = (gr.prisonniers || []).filter((x) => x !== gage.personne);
    }
    otage = { personne: gage.personne, sien: !!gage.sien, rendu: false };
  }
  const parole = {
    id: `w${state.temps}-${faction}`,
    faction,
    quoi,
    donnee: state.temps,
    jusqua: state.temps + h,
    // Ce qui se verse a un montant et une échéance : une promesse d'argent
    // sans date n'est pas un tribut, c'est une intention.
    montant: def.verse ? tributDemande(state, faction) : 0,
    cadence: def.verse ? TRIBUT.cadence : 0,
    prochain: def.verse ? state.temps + TRIBUT.cadence : 0,
    // Ce qu'on a laissé en gage, pour mémoire : le transfert lui-même est
    // l'affaire de l'otage (T4).
    gage: valeur || null,
    otage,
    rompue: false,
  };
  state.player.paroles.push(parole);
  if (log) {
    log({
      type: 'parole',
      texte: `Parole donnée à ${drapeauDe(state.world, faction).nom} : ${def.nom.toLowerCase()}, `
        + `${h} heures.`
        + (otage ? ` ${otage.personne.nom} reste entre leurs mains.` : ''),
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
    const nomOtage = p.otage && !p.otage.rendu && p.otage.personne
      ? p.otage.personne.nom : null;
    log({
      type: 'parole',
      texte: `Vous reprenez votre parole à ${drapeauDe(state.world, faction).nom}.`
        + (temoins ? ' On vous a vu.' : ' Personne, ici, pour le voir.')
        + (nomOtage ? ` ${nomOtage} reste entre leurs mains — vous ne le reverrez pas.` : ''),
      important: true,
    });
  }
  return { ok: true, vu: temoins, otagePerdu: !!(p.otage && !p.otage.rendu) };
}


/**
 * Les échéances qui tombent (PAROLE.md, T2).
 *
 * Un tribut se verse ou ne se verse pas, et il n'y a pas de troisième issue :
 * ceux qui l'attendent s'aperçoivent tout seuls qu'il n'arrive pas. C'est la
 * seule parole du jeu qui puisse se rompre **sans qu'on l'ait décidé** — on
 * s'est appauvri, et l'on ne suit plus. Manquer par impuissance n'est pas
 * manquer par choix (PACTES) : ils vous en veulent de la somme promise, pas
 * davantage.
 */
export function tickParoles(state, log) {
  const p = state.player;
  if (!Array.isArray(p.paroles) || !p.paroles.length) return;
  // Les otages, d'abord : une parole tenue jusqu'au terme rend celui qu'on
  // avait laissé. Une parole rompue ne le rend pas — on ne le revoit plus, et
  // c'est tout le poids du geste.
  for (const w of p.paroles) {
    if (!w.otage || w.otage.rendu) continue;
    const finie = w.jusqua <= state.temps;
    if (!finie && !w.rompue) continue;
    w.otage.rendu = true;
    const gr = (p.groupes || [])[0];
    if (!w.rompue && gr) {
      if (w.otage.sien) gr.membres.push(w.otage.personne);
      else {
        if (!Array.isArray(gr.prisonniers)) gr.prisonniers = [];
        gr.prisonniers.push(w.otage.personne);
      }
      if (log) {
        log({
          type: 'parole',
          texte: `${w.otage.personne.nom} revient : `
            + `${drapeauDe(state.world, w.faction).nom} avai${drapeauDe(state.world, w.faction).pluriel ? 'ent' : 't'} `
            + `votre parole, vous l'avez tenue.`,
          important: true,
        });
      }
    }
    w.otage.personne = w.rompue ? null : w.otage.personne;
  }
  for (const w of p.paroles) {
    if (w.rompue || !w.montant || w.jusqua <= state.temps) continue;
    if (state.temps < w.prochain) continue;
    const du = Math.round(w.montant);
    if (soldeIci(state) >= du) {
      regler(state, du);
      // Ce qu'on leur verse entre chez eux : la ville la plus proche des
      // leurs l'encaisse, et leur drapeau y prélève sa part comme sur le
      // reste. Rien ne se crée : c'est votre poche qui se vide.
      const col = colonieDe(state.world, (state.player.groupes[0] || {}).regionId)
        || (state.world.colonies.find((c) => c.faction === w.faction && !c.ruine));
      if (col && col.faction === w.faction) {
        encaisser(state.world, col, du);
        entrerDehors(state.world, col.faction, du);
      }
      w.prochain = state.temps + w.cadence;
      if (log) {
        log({
          type: 'parole',
          texte: `Tribut versé à ${drapeauDe(state.world, w.faction).nom} : ${du} ${signeIci(state)}.`,
          discret: true,
        });
      }
    } else {
      w.rompue = true;
      commettre(state, {
        type: 'tribut-manque', regionId: (state.player.groupes[0] || {}).regionId || 0,
        t: state.temps,
        effets: [{
          faction: w.faction, delta: -PAROLES.tribut.poids - Math.round(du / 20),
          su: state.temps + delaiVersFaction(
            state, 'rumeur', (state.player.groupes[0] || {}).regionId || 0, w.faction),
          dit: `${drapeauDe(state.world, w.faction).nom} attend${drapeauDe(state.world, w.faction).pluriel ? 'ent' : ''} `
            + `un tribut qui n'est pas venu.`,
        }],
      });
      if (log) {
        log({
          type: 'parole',
          texte: `Vous n’avez pas de quoi verser le tribut promis à `
            + `${drapeauDe(state.world, w.faction).nom}. Ils l’apprendront.`,
          important: true,
        });
      }
    }
  }
}
