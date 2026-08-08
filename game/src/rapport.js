// Ce qui s'est passé pendant que vous n'étiez pas là.
//
// Le jeu rejouait deux cents jours en silence, affichait une barre de
// progression, puis rendait la main. Le joueur retrouvait une escouade amaigrie,
// un stock vidé, une estime en baisse, et **aucun moyen de savoir pourquoi** :
// le journal de bord est plafonné à quatre cents lignes, si bien qu'une longue
// absence l'écrase entièrement avec des heures de récolte, et que la seule
// chose qui comptait — le mort, la ville tombée, la guerre déclarée — a défilé
// depuis longtemps.
//
// D'où ce module. Il ne s'appuie pas sur le journal, justement : il prend une
// photo avant, une photo après, et compte les faits marquants au passage. Trois
// cents jours d'absence tiennent alors dans un écran qu'on lit en dix secondes.
//
// Il sert deux fois :
//
//   pendant l'absence   ouvert par le rattrapage, fermé à son retour, montré
//                       une fois puis effacé.
//   pendant la partie   le même mécanisme, ouvert quand on quitte l'onglet du
//                       journal, sert de « depuis la dernière fois ».
//
// Rien n'y est déduit d'un état vivant : ce sont des nombres figés à deux
// instants et une liste de phrases. C'est ce qui permet de le sérialiser tel
// quel, et de le retrouver intact si la page se ferme pendant le rattrapage.

import { FACTIONS, COMMODITY_KEYS, drapeauDe} from './data.js';
import { estVivant, estDebout } from './characters.js';
import { groupes } from './groupes.js';

/** Combien de faits marquants on retient au plus. Au-delà, on compte. */
export const MARQUANTS_MAX = 14;

/** Les types de journal qu'on retient toujours, quoi qu'il arrive. */
const TOUJOURS = new Set([
  'mort', 'combat', 'ville', 'guerre', 'loi', 'allegeance', 'contrat',
  'famine', 'base', 'recrue', 'formation', 'coffre', 'prime_tete', 'revolte',
]);

/**
 * L'état des choses à un instant, en nombres seulement.
 *
 * On y met ce à quoi un joueur pense en rouvrant : combien nous sommes, en
 * quel état, ce qu'on a, ce qu'on vaut aux yeux des autres, et à quoi ressemble
 * la carte.
 */
export function photo(state) {
  let vivants = 0;
  let debout = 0;
  let sac = 0;
  const stock = {};
  for (const g of groupes(state)) {
    for (const c of g.membres) {
      if (!estVivant(c)) continue;
      vivants += 1;
      if (estDebout(c)) debout += 1;
    }
    for (const k of COMMODITY_KEYS) {
      const q = Math.floor(g.inventaire[k] || 0);
      if (q > 0) { stock[k] = (stock[k] || 0) + q; sac += q; }
    }
  }
  const base = state.base && state.base.fonde ? state.base : null;
  if (base) {
    for (const k of COMMODITY_KEYS) {
      const q = Math.floor((base.stock && base.stock[k]) || 0);
      if (q > 0) stock[k] = (stock[k] || 0) + q;
    }
  }
  const reputation = {};
  for (const k of Object.keys(state.player.reputation || {})) {
    reputation[k] = Math.round(state.player.reputation[k] || 0);
  }
  return {
    t: state.temps,
    credits: Math.round(state.player.credits),
    vivants,
    debout,
    sac,
    stock,
    reputation,
    villes: state.world.colonies.filter((c) => !c.ruine).length,
    guerres: state.world.guerres.length,
    // L'avant-poste : ce qu'on retrouve en rentrant, ou ce qu'on ne retrouve pas.
    poste: base ? { pop: Math.round(base.pop || 0), niveau: base.niveau || 0 } : null,
  };
}

/** Ouvre un rapport : à partir de maintenant, on note. */
export function ouvrirRapport(state, motif) {
  state.rapport = {
    motif: motif || 'absence',
    avant: photo(state),
    marquants: [],
    // Ce qui a été vu mais qu'on n'a pas gardé en toutes lettres.
    comptes: {},
    tus: 0,
  };
  return state.rapport;
}

/**
 * Note une entrée de journal au rapport en cours, s'il y en a un.
 *
 * Appelé depuis le logger, donc sur le chemin chaud : on sort tout de suite
 * quand aucun rapport n'est ouvert, ce qui est le cas normal.
 */
export function noterAuRapport(state, e) {
  const r = state.rapport;
  if (!r) return;
  if (!e.important && !TOUJOURS.has(e.type)) return;
  r.comptes[e.type] = (r.comptes[e.type] || 0) + 1;
  if (r.marquants.length < MARQUANTS_MAX) {
    r.marquants.push({ t: e.t, type: e.type, texte: e.texte });
  } else {
    r.tus += 1;
  }
}

/**
 * Note un mouvement d'argent et sa cause.
 *
 * « Crédits −2 877 » sans rien d'autre est une accusation sans dossier : on ne
 * sait pas si l'on s'est fait détrousser, si le camp a acheté du carburant, ou
 * si l'impôt d'une faction a couru pendant trois cents jours. Le solde se
 * calcule très bien par différence entre deux photos — c'est la *cause* qui ne
 * se retrouve nulle part après coup.
 *
 * On n'instrumente que ce qui bouge sans que le joueur clique : c'est
 * exactement l'argent qu'il n'a pas vu partir. Ce qu'il dépense lui-même, il
 * l'a vu passer, et le reliquat s'affiche sous « divers ».
 */
export function noterArgent(state, cause, delta) {
  const r = state.rapport;
  if (!r || !delta) return;
  if (!r.argent) r.argent = {};
  r.argent[cause] = (r.argent[cause] || 0) + Math.round(delta);
}

/**
 * En deçà, on ne dérange personne : fermer l'onglet deux minutes ne mérite pas
 * un écran à congédier. À la vitesse ×60 une journée de jeu passe en quatre
 * secondes réelles, d'où un seuil compté en heures de jeu *et* la condition
 * qu'il se soit passé quelque chose.
 */
export const SEUIL_RAPPORT = 24;

/**
 * Ferme le rapport : la photo d'après est prise, le reste est du calcul.
 *
 * Rend `null` et n'en laisse aucune trace quand il n'y avait rien à dire — un
 * rapport vide est un clic de plus, et trois clics de plus font qu'on ne lit
 * plus le quatrième.
 */
export function fermerRapport(state) {
  const r = state.rapport;
  if (!r) return null;
  r.apres = photo(state);
  const lu = lireRapport(state, r);
  if (!lu || lu.heures < SEUIL_RAPPORT || lu.calme) {
    delete state.rapport;
    return null;
  }
  return r;
}

/**
 * De quoi écrire le rapport à l'écran, sans que l'interface ait à soustraire
 * quoi que ce soit elle-même. Rendu en morceaux nommés plutôt qu'en phrases :
 * c'est l'interface qui décide de la mise en forme, pas ce module.
 */
export function lireRapport(state, r) {
  if (!r || !r.apres) return null;
  const a = r.avant;
  const b = r.apres;
  const heures = Math.max(0, b.t - a.t);

  const pertes = [];
  if (b.vivants < a.vivants) pertes.push(`${a.vivants - b.vivants} des vôtres ne sont plus là`);
  else if (b.vivants > a.vivants) pertes.push(`${b.vivants - a.vivants} de plus qu’au départ`);
  const couches = b.vivants - b.debout;
  if (couches > 0) pertes.push(`${couches} à terre`);

  const argent = b.credits - a.credits;

  // Les marchandises : on ne liste que ce qui a bougé, et l'on dit dans quel
  // sens. Un stock qui fond sans explication est la première chose qu'on nous
  // ait reprochée.
  const bouges = [];
  for (const k of COMMODITY_KEYS) {
    const d = (b.stock[k] || 0) - (a.stock[k] || 0);
    if (d !== 0) bouges.push({ key: k, delta: d });
  }
  bouges.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const estime = [];
  for (const k of Object.keys(b.reputation)) {
    const d = (b.reputation[k] || 0) - (a.reputation[k] || 0);
    if (Math.abs(d) >= 1 && drapeauDe(state.world, k)) estime.push({ faction: k, delta: d });
  }
  estime.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const monde = [];
  if (b.villes !== a.villes) {
    monde.push(b.villes < a.villes
      ? `${a.villes - b.villes} ville(s) se sont éteintes`
      : `${b.villes - a.villes} ville(s) ont été fondées`);
  }
  if (b.guerres !== a.guerres) {
    monde.push(b.guerres > a.guerres
      ? `${b.guerres - a.guerres} guerre(s) de plus`
      : `${a.guerres - b.guerres} guerre(s) se sont terminées`);
  }
  if (a.poste && !b.poste) monde.push('votre avant-poste n’est plus');
  else if (!a.poste && b.poste) monde.push('votre avant-poste est debout');
  else if (a.poste && b.poste && b.poste.pop !== a.poste.pop) {
    const d = b.poste.pop - a.poste.pop;
    monde.push(`avant-poste : ${d > 0 ? '+' : ''}${d} habitant(s)`);
  }

  // Le détail de l'argent : les causes relevées, plus le reliquat. Ce reliquat
  // est ce que le joueur a dépensé lui-même — il l'a vu passer — et l'on ne
  // prétend pas l'expliquer.
  const causes = Object.keys(r.argent || {})
    .map((cause) => ({ cause, delta: r.argent[cause] }))
    .filter((x) => x.delta)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const explique = causes.reduce((n2, x) => n2 + x.delta, 0);
  const divers = argent - explique;
  if (Math.abs(divers) >= 1) causes.push({ cause: 'divers', delta: divers });

  return {
    heures,
    jours: Math.floor(heures / 24),
    pertes,
    argent,
    causes,
    bouges,
    estime,
    monde,
    marquants: r.marquants,
    tus: r.tus,
    comptes: r.comptes,
    // Rien du tout : c'est une information, pas un écran vide.
    calme: !pertes.length && !argent && !bouges.length && !estime.length
      && !monde.length && !r.marquants.length,
  };
}
