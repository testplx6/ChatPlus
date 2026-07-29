// Ce qu'un grade permet de peser.
//
// Servir une faction rapportait de la solde, des rations et un toit. C'était
// une carrière d'employé. Or gravir des échelons, dans une faction qui fait la
// guerre et fonde des villes, ça devrait finir par donner voix au chapitre —
// sinon le Commandeur d'une armée n'est qu'un affilié bien payé.
//
// À partir de Lieutenant, on peut donc demander. Pas ordonner : demander. Ce
// qu'on obtient dépend de trois choses, et aucune n'est le hasard seul :
//
//   son grade — un Commandeur pèse quatre fois ce que pèse un Lieutenant ;
//   son crédit auprès du chef — les ordres qu'on a honorés, les villes qu'on a
//     rapportées, comptent ; ceux qu'on a laissés tomber comptent aussi ;
//   le tempérament du chef — on ne convainc pas un Conquérant de signer la
//     paix, ni un Conciliateur de déclarer la guerre. Voir dirigeants.js.
//
// Et une demande refusée coûte : on n'insiste pas deux fois sans y perdre.

import { FACTIONS } from './data.js';
import { rangDe, allegeanceDe, groupesEngages } from './allegeance.js';
import { dirigeant, penchant, TEMPERAMENTS } from './dirigeants.js';
import { colonieParId, distance } from './world.js';

/** Grade à partir duquel on peut ouvrir la bouche au conseil. */
export const RANG_VOIX = 2; // Lieutenant

/** Ce qu'une demande coûte en crédit politique, et ce qu'il faut avoir. */
export const COUT_DEMANDE = 30;

/**
 * Ce qu'on peut demander. Chaque requête vise un levier que la faction actionne
 * déjà toute seule dans `conseil()` — on ne crée pas de pouvoir nouveau, on
 * donne au joueur une voix dans des délibérations qui existent.
 */
export const REQUETES = {
  guerre: {
    nom: 'Réclamer la guerre',
    desc: 'Pousser le conseil à déclarer les hostilités contre une faction.',
    penchant: 'guerre',
    rang: 3, // Capitaine : on n'envoie pas des gens mourir à partir de Lieutenant
  },
  paix: {
    nom: 'Plaider la paix',
    desc: 'Obtenir qu’on cesse les hostilités et qu’on rentre les colonnes.',
    penchant: 'treve',
    rang: 2,
  },
  colonne: {
    nom: 'Faire lever une colonne',
    desc: 'Obtenir qu’une colonne marche sur une ville précise.',
    penchant: 'colonne',
    rang: 2,
  },
  fondation: {
    nom: 'Faire fonder un poste',
    desc: 'Obtenir qu’on plante un nouveau bourg sur une case libre.',
    penchant: 'expansion',
    rang: 2,
  },
};

export const REQUETE_KEYS = Object.keys(REQUETES);

/**
 * Le poids politique d'un joueur auprès d'une faction : son meilleur grade, ce
 * qu'il a fait pour elle, et ce qu'il a laissé tomber.
 */
export function poids(state, faction) {
  let total = 0;
  for (const g of groupesEngages(state, faction)) {
    const all = g.allegeance;
    const rang = rangDe(all);
    if (rang.index < RANG_VOIX) continue;
    // Le grade, au carré : un Commandeur ne pèse pas deux Lieutenants, il en
    // pèse quatre. C'est ce qui fait que monter vaut la peine.
    total += (rang.index - 1) * (rang.index - 1) * 20;
    // Les ordres tenus valent plus que les points, qui s'accumulent aussi en
    // restant vivant. Ce qu'on a laissé tomber se retranche.
    total += Math.min(60, all.points / 12) - (all.manques || 0) * 8;
  }
  const rep = state.player.reputation[faction] || 0;
  return Math.max(0, Math.round(total + Math.max(0, rep) * 0.4));
}

/** Le meilleur grade tenu auprès de cette faction, ou null. */
function gradeAupres(state, faction) {
  let best = null;
  for (const g of groupesEngages(state, faction)) {
    const r = rangDe(g.allegeance);
    if (!best || r.index > best.index) best = r;
  }
  return best;
}

/**
 * Peut-on porter cette requête ? On refuse tôt et on dit pourquoi : rien n'est
 * plus frustrant qu'un bouton grisé sans motif.
 */
export function peutDemander(state, faction, key) {
  const def = REQUETES[key];
  if (!def) return { ok: false, motif: 'Requête inconnue.' };
  const grade = gradeAupres(state, faction);
  if (!grade) return { ok: false, motif: `Vous ne servez pas ${FACTIONS[faction].nom}.` };
  if (grade.index < def.rang) {
    return { ok: false, motif: `Il faut être ${['', '', 'Lieutenant', 'Capitaine', 'Commandeur'][def.rang]}.` };
  }
  const d = dirigeant(state.world, faction);
  if (!d) return { ok: false, motif: 'Personne ne dirige cette faction.' };
  const p = poids(state, faction);
  if (p < COUT_DEMANDE) {
    return { ok: false, motif: `Votre crédit ne suffit pas : ${p} / ${COUT_DEMANDE}.` };
  }
  return { ok: true, poids: p, dirigeant: d };
}

/**
 * Les chances d'être écouté, entre 0 et 1. On les montre avant de demander :
 * c'est une décision politique, pas un tirage à l'aveugle.
 */
export function chances(state, faction, key) {
  const v = peutDemander(state, faction, key);
  if (!v.ok) return 0;
  const def = REQUETES[key];
  const d = v.dirigeant;
  // Le penchant du chef fait presque tout : réclamer la guerre à un Conciliateur
  // est une mauvaise idée, et le jeu le dit avant qu'on la prenne.
  const inclinaison = penchant(state.world, faction, def.penchant);
  const credit = Math.min(1, v.poids / 160);
  // Un chef solidement assis écoute moins : il n'a besoin de personne.
  const besoin = 1 - Math.min(0.3, d.legitimite / 320);
  // Le tempérament multiplie l'ensemble, et il est exponentié : sans ça, un
  // Commandeur obtenait deux fois sur trois d'un Conciliateur qu'il déclare la
  // guerre — le grade écrasait le caractère, ce qui vide les tempéraments de
  // leur sens. Ce qu'on achète en montant, c'est le droit de demander et une
  // meilleure chance ; pas celui de faire dire n'importe quoi à n'importe qui.
  const base = 0.05 + credit * 0.32 * (1 + besoin);
  return Math.max(0.02, Math.min(0.92, base * Math.pow(inclinaison, 1.7)));
}

/**
 * Porter la requête. Le résultat est immédiat et lisible : soit le conseil
 * s'incline, soit il vous renvoie — et dans les deux cas ça vous coûte du
 * crédit, parce qu'on ne dépense pas son influence gratuitement.
 */
export function demander(state, faction, key, cible, rng, log) {
  const v = peutDemander(state, faction, key);
  if (!v.ok) return v;
  const def = REQUETES[key];
  const d = v.dirigeant;
  const p = chances(state, faction, key);
  const ecoute = rng.chance(p);

  // Demander coûte, obtenir coûte davantage : on brûle du capital politique.
  for (const g of groupesEngages(state, faction)) {
    g.allegeance.points = Math.max(0, g.allegeance.points - (ecoute ? 90 : 40));
  }

  const nomChef = `${d.titre} ${d.nom}`;
  if (!ecoute) {
    // Un refus se souvient : le chef vous trouve encombrant.
    d.legitimite = Math.min(100, d.legitimite + 2);
    if (log) {
      log({
        type: 'influence',
        texte: `${nomChef} écarte votre demande. « ${TEMPERAMENTS[d.temperament].mot} »`,
        important: true,
        factions: [faction],
      });
    }
    return { ok: true, ecoute: false, chances: p };
  }

  if (log) {
    log({
      type: 'influence',
      texte: `${nomChef} vous écoute : ${def.nom.toLowerCase()}.`,
      important: true,
      factions: [faction],
    });
  }
  return { ok: true, ecoute: true, chances: p, requete: key, cible };
}

/**
 * Une requête acceptée devient une consigne que le conseil suivra à sa
 * prochaine délibération. On ne force pas la main du monde dans l'instant : on
 * infléchit une décision qui allait de toute façon se prendre.
 */
export function inscrireConsigne(world, faction, key, cible, t) {
  const f = world.factions[faction];
  if (!f) return;
  f.consigne = { key, cible: cible ?? null, depuis: t, expire: t + 400 };
}

/** La consigne en cours, si elle n'a pas expiré. */
export function consigneDe(world, faction, t) {
  const f = world.factions[faction];
  if (!f || !f.consigne) return null;
  if (t >= f.consigne.expire) { f.consigne = null; return null; }
  return f.consigne;
}

/**
 * Ce que la consigne du joueur ajoute au penchant du conseil sur une décision.
 * Doublé, pas imposé : le conseil garde son tempérament, on l'a seulement
 * poussé dans un sens.
 */
export function pousseeConsigne(world, faction, quoi, t) {
  const c = consigneDe(world, faction, t);
  if (!c) return 1;
  const def = REQUETES[c.key];
  return def && def.penchant === quoi ? 2.2 : 1;
}
