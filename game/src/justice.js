// Ce qu'on fait des gens qu'on n'a pas tués.
//
// Le combat produisait déjà des mises hors de combat — la moitié des pillards
// d'une bande finissent à terre, vivants. Ils disparaissaient ensuite du modèle
// sans qu'on y pense : on ramassait leurs affaires et on repartait. C'est une
// perte sèche, parce que c'est précisément là que le jeu touche à la société.
// Un homme à terre pose une question qu'aucun butin ne pose : qu'est-ce qu'on
// en fait ?
//
// Cinq réponses, et chacune coûte quelque chose :
//
//   Livrer     à la justice de la ville. Prime, et une piste plus sûre.
//   Rançonner  aux siens, s'ils sont de quelqu'un et qu'on n'est pas en guerre.
//   Vendre     là où la loi le permet. C'est le plus rentable, et ça se sait.
//   Enrôler    quelqu'un qui n'a pas choisi de vous suivre.
//   Relâcher   pour rien, ce qui n'est jamais pour rien.
//
// Ce qui borne le nombre de prisonniers n'est écrit nulle part : il faut des
// bras pour les garder, ils mangent, ils ralentissent, et ceux qu'on ne
// surveille pas s'en vont — parfois en emportant quelque chose.

import { FACTIONS, DIPLO_FACTIONS } from './data.js';
import { estVivant, estDebout, comp } from './characters.js';
import { colonieDe } from './world.js';
import { enGuerre } from './factions.js';
import { crediter } from './allegeance.js';
import { loisDe, loiIci, PEINES } from './lois.js';

/** Combien de prisonniers une paire de bras surveille sans y penser. */
export const PAR_GARDIEN = 1.5;

/** Ce qu'un prisonnier mange par heure, comparé à un des vôtres. */
export const RATION_PRISONNIER = 0.6;

// ---------------------------------------------------------------------------
// Capturer
// ---------------------------------------------------------------------------

export function prisonniersDe(g) {
  return (g && g.prisonniers) || [];
}

/** Combien l'escouade sait en garder, d'après ceux qui tiennent debout. */
export function capaciteGarde(g) {
  let bras = 0;
  for (const c of g.membres || []) {
    if (!estDebout(c)) continue;
    if ((c.formation && c.formation.restant > 0) || c.enseigne) continue;
    bras++;
  }
  return bras * PAR_GARDIEN;
}

/** Ce qui dépasse ce qu'on sait garder. Rien ne l'interdit ; ça se paie. */
export function surveillanceManquante(g) {
  return Math.max(0, prisonniersDe(g).length - capaciteGarde(g));
}

/**
 * Ce que traîner des prisonniers retire à la vitesse. Comme pour l'attelage,
 * une courbe qui tend vers l'immobilité sans jamais l'atteindre : dix
 * prisonniers ne vous figent pas, ils vous réduisent au pas.
 */
export function lenteurPrisonniers(g) {
  const n = prisonniersDe(g).length;
  if (!n) return 0;
  const l = n * 0.05 + surveillanceManquante(g) * 0.06;
  return 1 - 1 / (1 + l);
}

/**
 * Ce qu'on peut prendre après une victoire. On ne capture pas les morts, on ne
 * capture pas ce qu'on ne saurait pas garder, et on ne capture jamais l'Essaim
 * — on ne négocie pas avec ça, et personne n'en veut.
 */
export function capturables(g, bande) {
  if (!bande || bande.faction === 'essaim') return [];
  const place = Math.floor(capaciteGarde(g) - prisonniersDe(g).length);
  if (place <= 0) return [];
  return (bande.membres || [])
    .filter((c) => estVivant(c) && !estDebout(c))
    .slice(0, place);
}

/**
 * Faire des prisonniers. Retourne ceux qu'on a effectivement pris — l'appelant
 * les retire de la bande, qui n'existe de toute façon plus après le combat.
 */
export function fairePrisonniers(state, g, bande, gens, log) {
  if (!gens || !gens.length) return [];
  if (!g.prisonniers) g.prisonniers = [];
  const pris = [];
  for (const c of gens) {
    // Un prisonnier n'est plus un combattant : on le remet debout pour qu'il
    // marche, mais amoché, et on note d'où il vient. Sans ça, on ne saurait
    // plus à qui le rendre ni pour quoi le juger.
    c.captif = {
      faction: bande.faction || null,
      depuis: state.temps,
      // Ce qu'il a sur la conscience, aux yeux de la loi : c'est ce qui fixe
      // la prime, et ce qui fait qu'un pillard vaut plus qu'un soldat.
      brigandage: !bande.faction || bande.faction === 'bandits',
    };
    c.etat = 'ok';
    for (const part of Object.keys(c.corps)) {
      const b = c.corps[part];
      if (b.pv <= 0) b.pv = Math.max(1, Math.round(b.max * 0.15));
    }
    g.prisonniers.push(c);
    pris.push(c);
  }
  if (log && pris.length) {
    log({
      type: 'prisonnier',
      texte: pris.length === 1
        ? `${pris[0].nom} est fait prisonnier. Reste à savoir ce qu’on en fait.`
        : `${pris.length} prisonniers. Reste à savoir ce qu’on en fait.`,
      important: true,
      groupe: g.id,
    });
  }
  return pris;
}

// ---------------------------------------------------------------------------
// Ce qu'ils coûtent, heure par heure
// ---------------------------------------------------------------------------

/**
 * Une heure de captivité. Ils mangent sur vos vivres, et ceux que personne ne
 * regarde finissent par partir. C'est ce qui borne leur nombre sans qu'aucune
 * règle ne l'interdise.
 */
export function tickPrisonniers(state, g, rng, log) {
  const gens = prisonniersDe(g);
  if (!gens.length) return;

  // On les nourrit sur le sac. Affamés, ils s'affaiblissent — et un prisonnier
  // mort ne vaut rien du tout.
  const veut = gens.length * RATION_PRISONNIER / 24;
  const dispo = g.inventaire.rations || 0;
  const servi = Math.min(dispo, veut);
  g.inventaire.rations = dispo - servi;
  const nourri = veut <= 0 || servi >= veut * 0.9;

  const manque = surveillanceManquante(g);
  const restants = [];
  for (const c of gens) {
    if (!nourri) {
      const t = c.corps.torse;
      t.pv = Math.max(0, t.pv - 0.12);
      if (t.pv <= 0) {
        c.etat = 'mort';
        if (log) {
          log({
            type: 'prisonnier',
            texte: `${c.nom} meurt de faim, les mains liées. On ne se vantera pas de celle-là.`,
            important: true,
            groupe: g.id,
          });
        }
        continue;
      }
    }
    // S'évader : d'autant plus facile que personne ne regarde, et qu'on est
    // rapide. Un prisonnier bien gardé ne s'évade pas — c'est le sens de
    // « bien gardé ».
    if (manque > 0) {
      const part = manque / gens.length;
      const chance = 0.004 * part * (1 + comp(c, 'furtivite') / 90);
      if (rng.chance(chance)) {
        if (log) {
          log({
            type: 'prisonnier',
            texte: `${c.nom} a profité de ce que personne ne le regardait. Envolé.`,
            important: true,
            groupe: g.id,
          });
        }
        continue;
      }
    }
    restants.push(c);
  }
  g.prisonniers = restants;
}

// ---------------------------------------------------------------------------
// Ce qu'on peut en faire
// ---------------------------------------------------------------------------

/** Ce qu'un prisonnier vaut, avant qu'on décide de son sort. */
export function valeurCaptif(c) {
  const forme = Math.max(comp(c, 'melee'), comp(c, 'tir'));
  return Math.round(70 + forme * 8 + (c.diplomes || []).length * 90);
}

/** La prime que la justice d'ici verse pour un brigand livré. */
export function primeLivraison(state, col, c) {
  const loi = loiIci(state, col);
  if (loi.sansLoi) return 0;
  const cap = c.captif || {};
  // On paie pour les brigands, et pour les ennemis déclarés. Livrer le soldat
  // d'une faction avec qui l'on est en paix n'intéresse personne.
  if (!cap.brigandage && !(cap.faction && enGuerre(state.world, col.faction, cap.faction))) {
    return 0;
  }
  return Math.round(valeurCaptif(c) * 0.55 * loi.peine.prime);
}

/** Ce que les siens paieraient pour le récupérer. */
export function rancon(state, col, c) {
  const cap = c.captif || {};
  if (!cap.faction || cap.faction === 'bandits' || cap.faction === 'essaim') return 0;
  if (enGuerre(state.world, cap.faction, col && col.faction)) return 0;
  const f = state.world.factions[cap.faction];
  if (!f) return 0;
  return Math.min(Math.round(f.tresor * 0.15), Math.round(valeurCaptif(c) * 1.1));
}

/** Ce qu'un négrier en donne. Beaucoup, et c'est bien le problème. */
export function prixEsclave(state, col, c) {
  const loi = loiIci(state, col);
  if (!loi.esclavage) return 0;
  // Une ville sans loi paie moins : le marché y est moins organisé qu'ailleurs.
  return Math.round(valeurCaptif(c) * (loi.sansLoi ? 1.4 : 1.9));
}

/** Ce qu'on peut faire de ce prisonnier, ici, avec les prix. */
export function optionsPour(state, col, g, c) {
  const out = [];
  const prime = col ? primeLivraison(state, col, c) : 0;
  const ranc = col ? rancon(state, col, c) : 0;
  const esc = col ? prixEsclave(state, col, c) : 0;
  if (prime > 0) {
    out.push({
      key: 'livrer', nom: 'Livrer à la justice', prix: prime,
      aide: 'La ville l’enferme. Une piste de moins où l’on se fait détrousser.',
    });
  }
  if (ranc > 0) {
    out.push({
      key: 'rancon', nom: 'Rançonner les siens', prix: ranc,
      aide: 'Ils paient et le reprennent. On ne les fâche pas plus que ça.',
    });
  }
  if (esc > 0) {
    out.push({
      key: 'vendre', nom: 'Vendre', prix: esc,
      aide: 'C’est légal ici. Ce n’est pas pour ça que ça s’oublie.',
    });
  }
  out.push({
    key: 'enroler', nom: 'Enrôler', prix: 0,
    aide: 'Il n’a pas choisi de vous suivre. Ça se verra.',
  });
  out.push({
    key: 'relacher', nom: 'Relâcher', prix: 0,
    aide: 'Pour rien. Ce qui n’est jamais tout à fait pour rien.',
  });
  return out;
}

function retirerCaptif(g, c) {
  const i = prisonniersDe(g).findIndex((x) => x.id === c.id);
  if (i >= 0) g.prisonniers.splice(i, 1);
}

function noterReputation(state, faction, delta) {
  if (!faction || !FACTIONS[faction] || faction === 'bandits') return;
  state.player.reputation[faction] = Math.max(-100, Math.min(100,
    (state.player.reputation[faction] || 0) + delta));
}

/**
 * Disposer d'un prisonnier. Toutes les issues passent par ici, parce que toutes
 * ont un effet sur autre chose que la bourse — c'est ce qui en fait des choix.
 */
export function disposer(state, g, captifId, quoi, log) {
  const col = colonieDe(state.world, g.regionId);
  const c = prisonniersDe(g).find((x) => x.id === captifId);
  if (!c) return { ok: false, motif: 'Il n’est plus là.' };
  const cap = c.captif || {};
  const loi = loiIci(state, col);

  if (quoi === 'relacher') {
    retirerCaptif(g, c);
    noterReputation(state, cap.faction, 4);
    if (log) {
      log({
        type: 'prisonnier',
        texte: `${c.nom} est relâché. Il ne dira pas merci, mais il s’en souviendra.`,
        groupe: g.id,
      });
    }
    return { ok: true, prix: 0 };
  }

  if (quoi === 'enroler') {
    retirerCaptif(g, c);
    delete c.captif;
    // On n'enrôle pas quelqu'un de force sans que ça se voie : il arrive usé,
    // sans attachement, et il faudra faire avec.
    c.moral = Math.min(c.moral !== undefined ? c.moral : 50, 25);
    c.liens = {};
    g.membres.push(c);
    if (log) {
      log({
        type: 'prisonnier',
        texte: `${c.nom} accepte de porter un sac plutôt que des chaînes. Pour l’instant.`,
        important: true,
        groupe: g.id,
      });
    }
    return { ok: true, prix: 0, perso: c };
  }

  if (!col || col.ruine) return { ok: false, motif: 'Il faut être en ville.' };

  if (quoi === 'livrer') {
    const prime = primeLivraison(state, col, c);
    if (prime <= 0) return { ok: false, motif: 'La justice d’ici n’a rien à lui reprocher.' };
    retirerCaptif(g, c);
    state.player.credits += prime;
    ecrouer(state, col, c, loi);
    noterReputation(state, col.faction, 2);
    noterReputation(state, cap.faction, -3);
    // Livrer un brigand à la faction qu'on sert, c'est du service rendu — et
    // c'est ce qui relie la geôle à la carrière.
    if (g.allegeance && g.allegeance.faction === col.faction) {
      crediter(state, 14 + Math.round(prime / 25), log, 'Brigand livré à la justice', g);
    }
    if (log) {
      log({
        type: 'prisonnier',
        texte: `${c.nom} est livré à la justice de ${col.nom} (${prime} cr, peine ${loi.peine.nom.toLowerCase()}).`,
        important: true,
        regionId: col.regionId,
        groupe: g.id,
      });
    }
    return { ok: true, prix: prime };
  }

  if (quoi === 'rancon') {
    const prix = rancon(state, col, c);
    if (prix <= 0) return { ok: false, motif: 'Personne ne paiera pour lui.' };
    retirerCaptif(g, c);
    state.world.factions[cap.faction].tresor -= prix;
    state.player.credits += prix;
    // On rend un homme : c'est mieux vu que de le vendre, moins bien que de
    // l'avoir laissé tranquille.
    noterReputation(state, cap.faction, 3);
    if (log) {
      log({
        type: 'prisonnier',
        texte: `${FACTIONS[cap.faction].nom} rachète ${c.nom} pour ${prix} cr.`,
        important: true,
        regionId: col.regionId,
        groupe: g.id,
      });
    }
    return { ok: true, prix };
  }

  if (quoi === 'vendre') {
    const prix = prixEsclave(state, col, c);
    if (prix <= 0) return { ok: false, motif: 'On ne vend pas d’hommes ici.' };
    retirerCaptif(g, c);
    state.player.credits += prix;
    // Ça se sait. Auprès des siens d'abord, et auprès de tous ceux qui l'ont
    // interdit chez eux — ce qui donne son poids à la loi d'en face.
    noterReputation(state, cap.faction, -14);
    for (const k of DIPLO_FACTIONS) {
      if (k === col.faction || k === cap.faction) continue;
      if (!loisDe(state.world, k).esclavage) noterReputation(state, k, -4);
    }
    col.unrest = Math.min(1, (col.unrest || 0) + 0.02);
    if (log) {
      log({
        type: 'prisonnier',
        texte: `${c.nom} est vendu à ${col.nom} pour ${prix} cr. On vous a vu.`,
        important: true,
        regionId: col.regionId,
        groupe: g.id,
      });
    }
    return { ok: true, prix };
  }

  return { ok: false, motif: 'On ne fait pas ça.' };
}

// ---------------------------------------------------------------------------
// La geôle
// ---------------------------------------------------------------------------

/** Ce qu'une ville tient enfermé. */
export function geoleDe(col) {
  if (!col.geole) col.geole = { detenus: [], majA: 0 };
  return col.geole;
}

/** Écrouer quelqu'un : il quitte le modèle des personnages, il devient un chiffre. */
function ecrouer(state, col, c, loi) {
  const geole = geoleDe(col);
  // On ne garde pas la fiche complète : un détenu n'est plus un personnage
  // jouable, c'est une bouche à nourrir et une durée. Garder l'objet entier,
  // ce serait faire grossir la sauvegarde d'une ville à chaque arrestation.
  geole.detenus.push({
    nom: c.nom,
    faction: (c.captif && c.captif.faction) || null,
    sortie: state.temps + loi.peine.duree,
  });
}

/**
 * Une geôle pleine coûte à la ville et finit par gronder — mais tant qu'elle
 * tient, elle tient aussi les routes : ce sont autant de gens qui ne
 * détroussent personne.
 */
export function tickGeole(state, col, dt) {
  if (!col.geole || !col.geole.detenus.length) return;
  const geole = col.geole;
  const restants = [];
  for (const d of geole.detenus) {
    if (state.temps >= d.sortie) continue;
    restants.push(d);
  }
  geole.detenus = restants;
  const n = restants.length;
  if (!n) return;
  // On les nourrit sur le grenier de la ville. Une geôle qu'on ne nourrit pas
  // se révolte, et une révolte de geôle est une révolte de ville.
  const veut = n * 0.02 * dt;
  const dispo = col.stock.rations || 0;
  col.stock.rations = Math.max(0, dispo - veut);
  if (dispo < veut) col.unrest = Math.min(1, (col.unrest || 0) + 0.004 * dt);
  // Au-delà de ce qu'une ville de cette taille peut tenir, la geôle déborde.
  const capacite = 4 + col.taille * 6;
  if (n > capacite) col.unrest = Math.min(1, (col.unrest || 0) + 0.0015 * (n - capacite) * dt);
}

/**
 * Ce que la sévérité fait à l'humeur d'une ville, heure par heure.
 *
 * `PEINES[].ordre` existait depuis le début et rien ne le lisait : une justice
 * expéditive coûtait donc zéro et rapportait des primes. Une ville où l'on pend
 * vite se tient, mais elle se tient par la peur, et la peur s'accumule.
 */
export function tickOrdrePublic(state, col, dt) {
  if (!col.faction || col.ruine) return;
  const peine = PEINES[loisDe(state.world, col.faction).peine];
  if (!peine || !peine.ordre) return;
  // Une dérive sans borne n'est pas une politique : écrite comme une simple
  // addition, la justice expéditive ajoutait 0,048 de grogne tous les dix jours
  // et poussait toute ville à la révolte en une partie. La peur a un palier —
  // une ville où l'on pend vite reste rancunière, elle ne se soulève pas pour
  // autant ; une ville clémente s'apaise sans devenir angélique.
  const u = col.unrest || 0;
  const palier = peine.ordre > 0 ? 0.45 : 0.05;
  if ((peine.ordre > 0 && u >= palier) || (peine.ordre < 0 && u <= palier)) return;
  col.unrest = Math.max(0, Math.min(1, u + peine.ordre * 0.0004 * dt));
}

/** Ce que les geôles de la faction retirent à l'insécurité des environs. */
export function apaisementGeole(col) {
  const n = col.geole ? col.geole.detenus.length : 0;
  if (!n) return 0;
  // Chaque détenu est quelqu'un qui ne coupe plus les routes. L'effet sature :
  // vider la steppe de ses pillards ne la rend pas sûre pour autant.
  return Math.min(0.0025, n * 0.00025);
}
