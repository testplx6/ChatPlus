import { gagner, signeIci } from './monnaie.js';
import { appliquerReputation } from './faits.js';
// Ce qu'on fait de ses morts.
//
// `justice.js` demande ce qu'on fait des gens qu'on n'a pas tués. Voici la
// question jumelle, et elle est plus dure, parce qu'il s'agit des siens.
//
// Jusqu'ici un mort restait dans la colonne, avec la mention MORT à côté de son
// nom, pour toujours. Il ne coûtait rien, ne pesait rien, ne posait aucune
// question — alors que c'est le seul moment du jeu où l'escouade doit choisir
// entre ce qui l'arrange et ce qu'elle se doit.
//
// Cinq réponses, et chacune se paie sur la cohésion, qui est l'âme de la bande
// et qui commande son travail comme son combat :
//
//   Enterrer    on perd une journée et on ne gagne rien. La bande se resserre.
//   Dépouiller  ses armes, son armure, ses greffes. Ça se fait, et ça se voit.
//   Aux bêtes   de la biomasse. On ne le dira pas à sa famille.
//   Manger      des rations. Il y a des hivers où la question se pose.
//   Vendre      là où l'on achète déjà des hommes vivants, on prend les morts.
//
// Ce qui force la décision n'est écrit nulle part : un corps qu'on traîne
// ralentit la colonne et pèse sur le moral de ceux qui le portent. On peut
// garder ses morts trois semaines ; on n'en a simplement pas envie.

import { COMMODITIES, FACTIONS, DIPLO_FACTIONS, ITEMS, diploDe } from './data.js';
import { colonieDe } from './world.js';
import { loiIci, loisDe } from './lois.js';

/** Ce qu'un corps pèse sur la marche, et sur ceux qui le portent. */
export const LENTEUR_PAR_CORPS = 0.09;
export const MORAL_PAR_CORPS = 0.035;

/** Ce que chaque issue fait à la cohésion de la bande. */
export const RITES = {
  enterrer: { nom: 'Enterrer', cohesion: 4 },
  depouiller: { nom: 'Dépouiller', cohesion: -3 },
  betes: { nom: 'Donner aux bêtes', cohesion: -11 },
  manger: { nom: 'Manger', cohesion: -24 },
  organes: { nom: 'Vendre ce qui est encore bon', cohesion: -13 },
};

// ---------------------------------------------------------------------------
// Les corps
// ---------------------------------------------------------------------------

/** Ceux qui sont morts et que la colonne porte encore. */
export function depouillesDe(g) {
  return (g && g.membres ? g.membres : []).filter((c) => c.etat === 'mort');
}

/**
 * Ce que traîner ses morts retire à la vitesse. Même courbe que l'attelage et
 * les prisonniers : ça tend vers le pas sans jamais figer personne.
 */
export function lenteurDepouilles(g) {
  const n = depouillesDe(g).length;
  if (!n) return 0;
  const l = n * LENTEUR_PAR_CORPS;
  return 1 - 1 / (1 + l);
}

/** Ce que leur présence retire au moral, par heure et par vivant. */
export function poidsMoral(g) {
  return depouillesDe(g).length * MORAL_PAR_CORPS;
}

/** Ce qu'on récupère sur un corps : ses armes, son armure, ses greffes. */
export function effetsDe(c) {
  const out = [];
  if (c.equip) {
    if (c.equip.arme) out.push(c.equip.arme);
    if (c.equip.armure) out.push(c.equip.armure);
    for (const m of Object.keys(c.equip.greffes || {})) out.push(c.equip.greffes[m]);
  }
  return out.filter((k) => ITEMS[k]);
}

/** Ce que le corps rend en biomasse. Un homme, c'est une soixantaine de kilos. */
export function biomasseDe() {
  return 26;
}

/** Ce que le corps rend en rations, une fois qu'on a franchi le pas. */
export function rationsDe() {
  return 18;
}

/**
 * Ce qu'un trafiquant en donne. On ne vend pas des organes n'importe où : là où
 * la loi permet d'acheter des hommes vivants, elle ne s'embarrasse pas des
 * morts — et une ville sans drapeau ne demande rien à personne.
 */
export function prixOrganes(state, col, c) {
  if (!col || col.ruine) return 0;
  const loi = loiIci(state, col);
  if (!loi.esclavage) return 0;
  // Un corps frais et entier vaut quelque chose ; un corps criblé, beaucoup
  // moins. On lit ce qui lui reste de parties intactes.
  let entier = 0;
  let total = 0;
  for (const k of Object.keys(c.corps || {})) {
    total++;
    if (!c.corps[k].perdu) entier++;
  }
  const etat = total ? entier / total : 0;
  const greffes = Object.keys((c.equip && c.equip.greffes) || {}).length;
  return Math.round((90 + greffes * 120) * etat * (loi.sansLoi ? 0.8 : 1));
}

/** Ce qu'on peut faire de ce corps, ici, avec ce qu'on a. */
export function ritesPour(state, g, c) {
  const col = colonieDe(state.world, g.regionId);
  const out = [];
  out.push({
    key: 'enterrer',
    nom: 'Enterrer',
    aide: 'Une journée de perdue, rien en échange. La bande se resserre.',
    gain: 0,
  });
  const effets = effetsDe(c);
  if (effets.length) {
    out.push({
      key: 'depouiller',
      nom: 'Reprendre son équipement',
      aide: `${effets.map((k) => ITEMS[k].nom).join(', ')}. Ça se fait. Ça se voit aussi.`,
      gain: 0,
    });
  }
  if ((g.betes || []).length) {
    out.push({
      key: 'betes',
      nom: 'Donner aux bêtes',
      aide: `${biomasseDe()} de biomasse. On ne le dira pas à sa famille.`,
      gain: 0,
    });
  }
  out.push({
    key: 'manger',
    nom: 'Manger',
    aide: `${rationsDe()} rations. Il y a des hivers où la question se pose.`,
    gain: 0,
  });
  const prix = col ? prixOrganes(state, col, c) : 0;
  if (prix > 0) {
    out.push({
      key: 'organes',
      nom: 'Vendre ce qui est encore bon',
      aide: 'Ici, on achète des hommes vivants. Les morts ne posent pas de problème.',
      gain: prix,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Décider
// ---------------------------------------------------------------------------

function retirerDuGroupe(g, c) {
  const i = g.membres.findIndex((x) => x.id === c.id);
  if (i >= 0) g.membres.splice(i, 1);
}

/**
 * Disposer d'un corps. Toutes les issues passent par ici, parce que toutes
 * coûtent quelque chose à ceux qui restent.
 *
 * `depouiller` est la seule qui ne referme rien : on reprend le matériel, le
 * corps est toujours là, et il faudra bien en décider.
 */
export function disposerCorps(state, g, id, quoi, log) {
  const c = depouillesDe(g).find((x) => x.id === id);
  if (!c) return { ok: false, motif: 'Il n’est plus là.' };
  const rite = RITES[quoi];
  if (!rite) return { ok: false, motif: 'On ne fait pas ça.' };
  const col = colonieDe(state.world, g.regionId);
  const dire = (texte, important = true) => {
    if (log) {
      log({
        type: 'depouille', texte, important, regionId: g.regionId, groupe: g.id,
      });
    }
  };
  const coute = () => {
    g.cohesion = Math.max(0, Math.min(100, (g.cohesion ?? 55) + rite.cohesion));
  };

  if (quoi === 'depouiller') {
    const effets = effetsDe(c);
    if (!effets.length) return { ok: false, motif: 'Il n’avait plus rien.' };
    for (const k of effets) if (g.objets.length < 30) g.objets.push(k);
    c.equip = { arme: null, armure: null, greffes: {} };
    coute();
    dire(`On reprend ce que portait ${c.nom} : ${effets.map((k) => ITEMS[k].nom).join(', ')}.`);
    return { ok: true, effets };
  }

  if (quoi === 'betes') {
    if (!(g.betes || []).length) return { ok: false, motif: 'Aucune bête à nourrir.' };
    g.inventaire.biomasse = (g.inventaire.biomasse || 0) + biomasseDe();
    retirerDuGroupe(g, c);
    coute();
    dire(`${c.nom} a fini dans les auges. Personne n’a rien dit.`);
    return { ok: true, biomasse: biomasseDe() };
  }

  if (quoi === 'manger') {
    g.inventaire.rations = (g.inventaire.rations || 0) + rationsDe();
    retirerDuGroupe(g, c);
    coute();
    // Ce n'est pas une transaction : c'est quelque chose que la bande porte.
    for (const autre of g.membres) {
      if (autre.etat === 'mort') continue;
      autre.moral = Math.max(0, (autre.moral ?? 50) - 12);
    }
    state.stats.mangesDesSiens = (state.stats.mangesDesSiens || 0) + 1;
    dire(`On a mangé ${c.nom}. On n’en parlera plus jamais.`);
    return { ok: true, rations: rationsDe() };
  }

  if (quoi === 'organes') {
    if (!col || col.ruine) return { ok: false, motif: 'Il faut être en ville.' };
    const prix = prixOrganes(state, col, c);
    if (prix <= 0) return { ok: false, motif: 'On n’achète pas ça ici.' };
    gagner(state, prix);
    retirerDuGroupe(g, c);
    coute();
    // Ça se sait, comme pour les vivants qu'on vend : auprès de tous ceux qui
    // l'interdisent chez eux.
    for (const k of diploDe(state.world)) {
      if (k === col.faction) continue;
      if (loisDe(state.world, k).esclavage) continue;
      appliquerReputation(state, k, -5);
    }
    state.stats.organesVendus = (state.stats.organesVendus || 0) + 1;
    dire(`Ce qui était encore bon chez ${c.nom} est parti à ${col.nom} pour ${prix} ${signeIci(state)}.`);
    return { ok: true, prix };
  }

  // Enterrer.
  retirerDuGroupe(g, c);
  coute();
  state.stats.enterres = (state.stats.enterres || 0) + 1;
  dire(`${c.nom} est en terre${col ? `, près de ${col.nom}` : ''}. On a pris le temps qu’il fallait.`);
  return { ok: true };
}
