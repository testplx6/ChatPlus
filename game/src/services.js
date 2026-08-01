// Ce que les gens vous demandent, en personne.
//
// Le panneau d'affichage d'une ville est anonyme : il paie en crédits, il bouge
// la réputation d'une faction, et personne ne se souvient de vous. C'est un
// distributeur. Ici c'est autre chose : quelqu'un a un problème, il vous le dit
// en face, et il s'en souvient.
//
// Il ne vous en veut pas de ne pas l'avoir aidé — voir GAIN_OPINION. Ce système
// n'a que du haut : ce qui le borne, c'est qu'on ne peut pas être partout.
//
// Le prix est volontairement médiocre. Ce qu'on achète en rendant un service,
// c'est l'opinion d'une personne précise, et cette opinion a des effets qu'on
// ne peut acheter autrement : un armurier qui fait ses prix, un médecin qui
// recoud vos gens, un chef qui vous ouvre son panneau, un contremaître qui
// laisse ses registres ouverts même quand vous êtes à l'autre bout de la carte.

import { COMMODITIES } from './data.js';
import { CHARGES, notable } from './notables.js';
import { groupes } from './groupes.js';
import { colonieDe } from './world.js';
import { loiIci } from './lois.js';

/**
 * Ce que chaque charge peut réclamer. `seuil` est le stock par habitant en
 * dessous duquel la personne commence à s'inquiéter — c'est un vrai manque de
 * la ville, pas un prétexte, sinon les demandes tournent à la corvée.
 */
export const BESOINS = {
  medecin: {
    res: 'medkit', seuil: 0.012, lot: [6, 20],
    texte: (q) => `Il me faut ${q} medkits. Je recouds avec ce que je trouve, et je trouve mal.`,
  },
  contremaitre: {
    res: 'composant', seuil: 0.02, lot: [10, 30],
    texte: (q) => `${q} composants et l'atelier repart. Sans ça je fais tourner à vide.`,
  },
  chef: {
    res: 'rations', seuil: 0.5, lot: [40, 140],
    texte: (q) => `${q} rations. Je ne demande pas pour moi.`,
  },
  armurier: {
    res: 'alliage', seuil: 0.05, lot: [12, 40],
    texte: (q) => `${q} d'alliage. J'ai des commandes et rien à forger.`,
  },
};

/** Une demande non honorée finit par ne plus être une demande. */
export const DUREE_DEMANDE = [260, 620];

/**
 * Ce qu'un service rapporte. Il n'y a pas de contrepartie négative, et c'est
 * délibéré.
 *
 * Une demande non honorée a longtemps coûté de l'estime. L'idée était qu'un
 * refus se paie — sauf qu'on n'a jamais rien promis : quelqu'un a un besoin,
 * vous passez, vous ne le comblez pas. Ce n'est pas un manquement, c'est la vie
 * ordinaire d'un désert où personne ne peut tout faire. La version qui punissait
 * le simple passage était franchement mauvaise ; celle qui ne punissait plus que
 * le refus les mains pleines l'était encore, parce que garder ses cent quarante
 * rations quand on a soi-même six bouches à nourrir n'est pas un affront.
 *
 * Le choix tient debout sans culpabilité : la marchandise part, la prime la
 * rembourse tout juste, et le vrai prix est le détour. On ne peut pas les servir
 * tous — voilà la décision.
 */
export const GAIN_OPINION = 24;
export const GAIN_TEMOINS = 6;

/** Combien d'actes on garde en tête. Au-delà, on ne retient que l'impression. */
export const MEMOIRE_MAX = 4;

// ---------------------------------------------------------------------------
// Mémoire
// ---------------------------------------------------------------------------

/**
 * On garde la clé de marchandise dans le souvenir, pas la phrase : c'est plus
 * petit dans la sauvegarde, et ça permet d'écrire un français correct au moment
 * de l'affichage plutôt que de recoller « apporté medkit ».
 */
const DIT = {
  medkit: ['des medkits', 'les medkits'],
  composant: ['des composants', 'les composants'],
  rations: ['des rations', 'les rations'],
  alliage: ['de l’alliage', 'l’alliage'],
};

const ACTES = {
  service: (r) => `Vous lui avez apporté ${(DIT[r] || [r])[0]} quand il en manquait.`,
  // Plus produit depuis qu'une demande non honorée ne coûte rien. On garde la
  // phrase : les sauvegardes d'avant en contiennent, et une mémoire qu'on ne
  // sait plus lire vaut moins qu'un souvenir périmé.
  oubli: (r) => `Vous avez laissé passer ${(DIT[r] || [null, r])[1]} qu’il attendait.`,
  defense: () => 'Vous étiez là quand la ville a été attaquée.',
  pillage: () => 'Vous avez pillé une caravane des siens.',
};

/** On retient un acte, et on oublie le plus vieux. */
export function retenir(p, quoi, detail, t) {
  if (!p) return;
  if (!p.memoire) p.memoire = [];
  p.memoire.push({ quoi, detail: detail || null, t });
  if (p.memoire.length > MEMOIRE_MAX) p.memoire.shift();
}

/** La mémoire d'une personne, en français. */
export function souvenirs(p) {
  if (!p || !p.memoire) return [];
  return p.memoire.map((m) => (ACTES[m.quoi] ? ACTES[m.quoi](m.detail) : '')).filter(Boolean);
}

/** Un fait qui concerne toute la ville se retient par tout le monde. */
export function retenirEnVille(col, quoi, t, delta) {
  if (!col || !col.notables) return;
  for (const p of col.notables) {
    retenir(p, quoi, null, t);
    if (delta) p.opinion = Math.max(-100, Math.min(100, (p.opinion || 0) + delta));
  }
}

// ---------------------------------------------------------------------------
// Naissance et mort d'une demande
// ---------------------------------------------------------------------------

/** Le manque réel de la ville, entre 0 (rien ne manque) et 1 (rien n'est là). */
function manque(col, besoin) {
  const attendu = Math.max(1, col.pop * besoin.seuil);
  return Math.max(0, Math.min(1, 1 - (col.stock[besoin.res] || 0) / attendu));
}

/**
 * Une tranche de vie des demandes. Appelée depuis le tick des notables, donc au
 * rythme des colonies : on ne parle pas de quelques dizaines d'objets par heure
 * mais de quelques-uns par jour de jeu sur la carte entière.
 */
export function tickServices(col, rng, dt, t) {
  if (!col.notables || !col.notables.length) return;
  const surDt = (p) => (dt === 1 ? p : 1 - Math.pow(1 - p, dt));

  for (const p of col.notables) {
    if (p.demande) {
      // On n'attend pas éternellement, et l'on ne vous en veut pas : la demande
      // s'éteint, simplement. Voir GAIN_OPINION pour pourquoi il n'y a rien à
      // perdre ici.
      if (t >= p.demande.echeance) p.demande = null;
      continue;
    }
    const besoin = BESOINS[p.charge];
    if (!besoin) continue;
    const m = manque(col, besoin);
    if (m < 0.35) continue;
    // On demande d'autant plus volontiers qu'on manque et qu'on ne vous déteste
    // pas : on ne va pas mendier auprès de quelqu'un qu'on méprise.
    const disposition = (p.opinion || 0) < -40 ? 0.25 : 1;
    if (!rng.chance(surDt(0.0016 * m * disposition))) continue;

    const q = Math.round(rng.irange(besoin.lot[0], besoin.lot[1]) * (0.6 + m * 0.8));
    p.demande = {
      res: besoin.res,
      quantite: Math.max(4, q),
      echeance: t + rng.irange(DUREE_DEMANDE[0], DUREE_DEMANDE[1]),
      texte: besoin.texte(Math.max(4, q)),
      // On rembourse la marchandise sans plus : le reste se paie en estime.
      prime: Math.round(COMMODITIES[besoin.res].prix * Math.max(4, q) * rng.range(0.9, 1.3)),
    };
  }
}

// ---------------------------------------------------------------------------
// Honorer
// ---------------------------------------------------------------------------

/** Le premier groupe présent ici qui porte assez de quoi. */
function porteur(state, regionId, res, quantite) {
  return groupes(state).find(
    (g) => g.regionId === regionId && (g.inventaire[res] || 0) >= quantite
  ) || null;
}

/** Les demandes qu'on peut entendre d'ici : celles des gens qu'on a en face. */
export function demandesIci(state, col) {
  if (!col || !col.notables) return [];
  const out = [];
  for (const p of col.notables) {
    if (!p.demande) continue;
    const g = porteur(state, col.regionId, p.demande.res, p.demande.quantite);
    out.push({ notable: p, demande: p.demande, pret: !!g });
  }
  return out;
}

export function honorer(state, colId, notableId, log) {
  const col = state.world.colonies.find((c) => c.id === colId);
  if (!col) return { ok: false, motif: 'Cette ville n’existe plus.' };
  const p = (col.notables || []).find((x) => x.id === notableId);
  if (!p || !p.demande) return { ok: false, motif: 'Il n’attend plus rien de vous.' };
  const d = p.demande;
  const g = porteur(state, col.regionId, d.res, d.quantite);
  if (!g) return { ok: false, motif: `Il faut être ici avec ${d.quantite} ${COMMODITIES[d.res].nom.toLowerCase()}.` };

  g.inventaire[d.res] -= d.quantite;
  col.stock[d.res] = (col.stock[d.res] || 0) + d.quantite;
  state.player.credits += d.prime;

  p.opinion = Math.min(100, (p.opinion || 0) + GAIN_OPINION);
  retenir(p, 'service', d.res, state.temps);
  // Ça se sait : les autres en tiennent compte, sans en faire une affaire
  // personnelle.
  for (const autre of col.notables) {
    if (autre === p) continue;
    autre.opinion = Math.min(100, (autre.opinion || 0) + GAIN_TEMOINS);
  }
  if (col.faction) {
    state.player.reputation[col.faction] = Math.min(100, (state.player.reputation[col.faction] || 0) + 2);
  }
  state.stats.servicesRendus = (state.stats.servicesRendus || 0) + 1;
  p.demande = null;

  log({
    type: 'service',
    texte: `${CHARGES[p.charge].nom} de ${col.nom} : ${p.nom} a eu ses `
      + `${COMMODITIES[d.res].nom.toLowerCase()}. ${d.prime} cr, et il s’en souviendra.`,
    important: true,
    regionId: col.regionId,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ce que l'estime change
// ---------------------------------------------------------------------------

/** L'opinion d'une charge, ou 0 si la charge n'est pas pourvue. */
export function estime(col, charge) {
  const p = notable(col, charge);
  return p ? (p.opinion || 0) : 0;
}

/** Sous ce seuil, le chef ne veut pas de vos services. */
export const PANNEAU_FERME = -40;
/** Au-dessus, il vous garde les bons contrats. */
export const PANNEAU_OUVERT = 45;

/** Ce que le chef fait de vous : { ouvert, prime } — prime multiplie la paie. */
export function faveurChef(col) {
  const o = estime(col, 'chef');
  if (o <= PANNEAU_FERME) return { ouvert: false, prime: 1 };
  return { ouvert: true, prime: o >= PANNEAU_OUVERT ? 1.2 : 1 };
}

/** Seuil à partir duquel le médecin de la ville s'occupe aussi des vôtres. */
export const SOINS_SEUIL = 40;

/**
 * Le renfort de soin qu'on trouve dans cette région, s'il y a une ville et si
 * son médecin vous apprécie. Un groupe qui campe sous les murs d'une ville amie
 * se remet debout nettement plus vite qu'un groupe qui campe dans le sable.
 */
export function renfortSoin(state, regionId) {
  const col = colonieDe(state.world, regionId);
  if (!col || col.ruine) return 1;
  const p = notable(col, 'medecin');
  if (!p) return 1;
  // Une Commune soigne qui se présente : c'est ce qu'elle rend contre le
  // huitième qu'elle retient sur vos ventes. Partout ailleurs, le médecin
  // choisit ses patients — et il faut lui avoir donné une raison.
  const pourTous = loiIci(state, col).regime.soins === 'tous';
  if (!pourTous && (p.opinion || 0) < SOINS_SEUIL) return 1;
  return 1 + 0.35 + Math.min(0.4, p.comp / 250);
}

/** Seuil à partir duquel le contremaître laisse ses registres ouverts. */
export const REGISTRES_SEUIL = 35;

/** Les villes dont on a les chiffres même sans y être. */
export function villesOuvertes(state) {
  const out = [];
  for (const col of state.world.colonies) {
    if (col.ruine) continue;
    const p = notable(col, 'contremaitre');
    if (p && (p.opinion || 0) >= REGISTRES_SEUIL) out.push(col);
  }
  return out;
}
