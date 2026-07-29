// Ce qui porte à votre place.
//
// Le banc a fini par chiffrer ce que le jeu était devenu : soixante-dix pour
// cent des départs d'un convoi sont de la logistique — le sac se remplit, on
// marche jusqu'en ville, on vend, on repart. Cinquante-neuf pour cent du temps
// de jeu passe sur les pistes. Sur une carte cinq fois plus grande, cette
// boucle coûte cinq fois plus, et elle écrase tout le reste : onze pour cent
// des départs seulement servent un contrat, onze pour cent un ordre de mission.
//
// La réponse n'est pas d'agrandir le sac : ce serait retirer la logistique du
// jeu au lieu de la rendre intéressante. C'est de la déléguer à quelque chose
// qui a son propre état — qui mange, qui s'épuise, qu'on peut perdre. Une bête
// de somme n'est pas un bonus de portage, c'est un membre de plus dont il faut
// s'occuper, et qui vous manque cruellement le jour où on vous la tue.

import { COMMODITIES } from './data.js';
import { idDepuisRng } from './characters.js';

/**
 * Ce qu'on peut atteler. Deux voies, deux compromis : la bête mange mais ne
 * craint pas le terrain ; la charrette ne mange pas mais peine dans les
 * cassures.
 */
export const BETES = {
  brahmine: {
    nom: 'Brahmine',
    desc: 'Deux estomacs, mauvais caractère, et le dos qu’il faut.',
    prix: 900,
    portage: 75,
    // Ce qu'elle avale par heure, en biomasse. Elle broute ce que personne ne
    // mange, ce qui est tout l'intérêt.
    appetit: 0.09,
    lenteur: 0.05,
    robustesse: 1,
  },
  mulet: {
    nom: 'Mulet de fret',
    desc: 'Petit, têtu, increvable. On en croise sur toutes les pistes.',
    prix: 520,
    portage: 42,
    appetit: 0.05,
    lenteur: 0.02,
    robustesse: 1.35,
  },
  charrette: {
    nom: 'Charrette à bras',
    desc: 'Ne mange rien, ne se plaint pas, et déteste les cassures.',
    prix: 340,
    portage: 55,
    appetit: 0,
    // On la tire soi-même : c'est le convoi qui ralentit, et beaucoup.
    lenteur: 0.14,
    robustesse: 2.2,
    // Elle ne meurt pas de faim ; elle casse.
    objet: true,
  },
};

export const BETE_KEYS = Object.keys(BETES);

/** Combien un convoi peut en mener de front avant que ça ne rime plus à rien. */
export const ATTELAGE_MAX = 3;

const NOMS_BETES = [
  'Cendre', 'Bourrique', 'Suif', 'Vieille', 'Caillou', 'Poussière', 'Trogne',
  'Bosse', 'Rouille', 'Tempête', 'Fer-Blanc', 'Chignole', 'Sabot', 'Bréhaigne',
];

export function creerBete(rng, key) {
  const def = BETES[key];
  return {
    id: idDepuisRng(rng, 'b'),
    key,
    nom: def.objet ? def.nom : rng.pick(NOMS_BETES),
    // 0 à 100. Une bête mal nourrie maigrit et porte moins ; à zéro, elle reste
    // sur le bord de la piste.
    sante: 100,
    faim: 0,
  };
}

export function betesDe(g) {
  return (g && g.betes) || [];
}

/**
 * Ce que l'attelage ajoute au portage. Une bête affamée ou blessée porte moins :
 * c'est ce qui rend la négligence coûteuse plutôt que gratuite.
 */
export function portageAttelage(g) {
  let t = 0;
  for (const b of betesDe(g)) {
    const def = BETES[b.key];
    if (!def) continue;
    t += def.portage * (0.35 + 0.65 * (b.sante / 100));
  }
  return t;
}

/** Ce que l'attelage retire à la vitesse du convoi. Plafonné : on avance encore. */
export function lenteurAttelage(g) {
  let l = 0;
  for (const b of betesDe(g)) l += (BETES[b.key] || {}).lenteur || 0;
  return Math.min(0.3, l);
}

/** Ce que l'attelage mange par heure, en biomasse. */
export function appetitAttelage(g) {
  let a = 0;
  for (const b of betesDe(g)) a += (BETES[b.key] || {}).appetit || 0;
  return a;
}

// ---------------------------------------------------------------------------
// Achat, cession
// ---------------------------------------------------------------------------

export function prixBete(col, key) {
  const def = BETES[key];
  if (!def) return 0;
  // Une ville prospère et paisible vend moins cher ce dont elle a moins besoin.
  const tension = 1 + (col ? col.unrest * 0.5 : 0);
  return Math.round(def.prix * tension);
}

export function acheterBete(state, col, key, rng, log, groupe) {
  const g = groupe || (state.player.groupes || [])[0];
  const def = BETES[key];
  if (!def) return { ok: false, motif: 'On ne vend pas ça.' };
  if (!g) return { ok: false, motif: 'Aucun groupe.' };
  if (!col || col.ruine || g.regionId !== col.regionId) {
    return { ok: false, motif: 'Il faut être en ville.' };
  }
  if (betesDe(g).length >= ATTELAGE_MAX) {
    return { ok: false, motif: `Un convoi ne mène pas plus de ${ATTELAGE_MAX} bêtes.` };
  }
  const prix = prixBete(col, key);
  if (state.player.credits < prix) {
    return { ok: false, motif: `Il manque ${prix - state.player.credits} cr.` };
  }
  state.player.credits -= prix;
  if (!g.betes) g.betes = [];
  const b = creerBete(rng, key);
  g.betes.push(b);
  if (log) {
    log({
      type: 'bete',
      texte: `${def.nom} ${def.objet ? 'achetée' : `— ${b.nom} — achetée`} à ${col.nom} pour ${prix} cr.`,
      important: true,
      regionId: col.regionId,
      groupe: g.id,
    });
  }
  return { ok: true, bete: b, prix };
}

export function vendreBete(state, col, beteId, log, groupe) {
  const g = groupe || (state.player.groupes || [])[0];
  const i = betesDe(g).findIndex((b) => b.id === beteId);
  if (i < 0) return { ok: false, motif: 'Pas à vous.' };
  if (!col || col.ruine || g.regionId !== col.regionId) {
    return { ok: false, motif: 'Il faut être en ville.' };
  }
  const b = g.betes[i];
  // On récupère la moitié, au prorata de l'état : personne n'achète une carne.
  const prix = Math.round(prixBete(col, b.key) * 0.5 * (0.4 + 0.6 * (b.sante / 100)));
  state.player.credits += prix;
  g.betes.splice(i, 1);
  if (log) log({ type: 'bete', texte: `${b.nom} cédée à ${col.nom} pour ${prix} cr.`, regionId: col.regionId });
  return { ok: true, prix };
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/**
 * Une heure de vie de l'attelage. Elles broutent la biomasse du sac — celle que
 * personne d'autre ne mange —, maigrissent quand il n'y en a pas, et finissent
 * par rester sur le bord de la piste.
 */
export function tickBetes(g, rng, log) {
  const betes = betesDe(g);
  if (!betes.length) return;
  const restantes = [];
  for (const b of betes) {
    const def = BETES[b.key];
    if (!def) continue;
    if (def.appetit > 0) {
      const dispo = g.inventaire.biomasse || 0;
      const veut = def.appetit;
      const servi = Math.min(dispo, veut);
      g.inventaire.biomasse = dispo - servi;
      if (servi >= veut * 0.9) {
        b.faim = Math.max(0, b.faim - 1.2);
        b.sante = Math.min(100, b.sante + 0.25);
      } else {
        b.faim = Math.min(120, b.faim + 0.8);
        if (b.faim > 45) b.sante = Math.max(0, b.sante - 0.35);
      }
    } else {
      // Une charrette ne mange pas : elle s'use sur la piste.
      b.sante = Math.max(0, b.sante - 0.015);
    }
    if (b.sante <= 0) {
      if (log) {
        log({
          type: 'bete',
          texte: def.objet
            ? `${b.nom} rend l’âme sur la piste. On répartit la charge.`
            : `${b.nom} n’ira pas plus loin. On la laisse là.`,
          important: true,
          groupe: g.id,
        });
      }
      continue;
    }
    restantes.push(b);
  }
  g.betes = restantes;
}

/**
 * Une défaite peut coûter une bête : c'est ce qui fait qu'on y tient. Le
 * pillard prend d'abord ce qui se revend et se mène tout seul.
 */
export function perdreBete(g, rng, log) {
  const betes = betesDe(g);
  if (!betes.length) return null;
  const i = rng.int(betes.length);
  const b = betes[i];
  const def = BETES[b.key] || {};
  if (!rng.chance(0.55 / (def.robustesse || 1))) return null;
  g.betes.splice(i, 1);
  if (log) {
    log({
      type: 'bete',
      texte: def.objet
        ? `${b.nom} est emportée dans la déroute.`
        : `On a emmené ${b.nom} avec le reste.`,
      important: true,
      groupe: g.id,
    });
  }
  return b;
}

/** Ce qu'un attelage vaut, pour l'affichage et pour un bilan. */
export function valeurAttelage(g) {
  let v = 0;
  for (const b of betesDe(g)) v += (BETES[b.key] || {}).prix * 0.5 * (b.sante / 100);
  return Math.round(v);
}
