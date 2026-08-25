// Le registre des faits — la seule porte vers ce que le monde pense du joueur.
//
// L2 (MEMOIRE.md) : un acte du joueur est un FAIT — daté, situé, avec des
// effets par faction et l'heure `su` où chacune l'apprend. L'effet ne tombe
// qu'à l'arrivée de la nouvelle : commettre enregistre et applique ce qui est
// déjà su, `tickFaits` livre le reste à l'heure dite. Plus rien d'autre dans
// le moteur n'écrit `state.player.reputation` : c'est la garantie (tenue par
// un test statique) que les chemins muets ne reviendront pas.
//
// Deux portes, un seul module :
// - `commettre` : les ACTES — discrets, enregistrés, différables. C'est la
//   matière que L5 distribuera aux porteurs nommés (« la mémoire appartient
//   au souvenant »).
// - `appliquerReputation` : l'écriture brute, clampée — pour l'ambiant qui
//   n'est pas un acte (la patrouille qui rassure au fil des heures, l'érosion
//   tant qu'elle vit — elle meurt à L4). Elle n'enregistre rien.

import { drapeauDe } from './data.js';
import { distance, colonieParId } from './world.js';
import { groupes } from './groupes.js';

/**
 * L1 (MEMOIRE.md, E12 de l'audit) : la nouvelle a des jambes. Un canal (sa
 * base, son pas), fois la route. Calibrables — objets mutables. Vit ici et
 * non dans connaissance.js : l'ordre des modules — allegeance, justice,
 * caravanes citent la porte des faits bien avant que la connaissance
 * n'existe — et c'est le même voyage dans les deux sens (E12 = S5).
 */
export const CANAUX = {
  /** Criée sur les places : une déclaration VEUT être sue. */
  proclamation: { base: 6, parCase: 1 },
  /** Au pas des colporteurs : ce qui s'est passé quelque part. */
  rumeur: { base: 12, parCase: 4 },
};

/** Quel canal porte quel type de nouvelle. `null` : on regarde le ciel. */
export const CANAL_PAR_TYPE = {
  guerre: 'proclamation',
  paix: 'proclamation',
  capture: 'rumeur',
  effondrement: 'rumeur',
  secession: 'rumeur',
  fondation: 'rumeur',
  croissance: 'rumeur',
  saison: null,
};

/** Faute de lieu connu, une nouvelle a marché « une route moyenne ». */
export const ROUTE_MOYENNE = 8;

/**
 * Le temps qu'une nouvelle du monde met à atteindre le joueur, d'où elle est
 * née à où il est. Elle atteint le plus proche des siens, et se recalcule
 * d'où l'on est : marcher vers le lieu, c'est aller au-devant d'elle.
 */
export function delaiNouvelle(state, type, deRegionId) {
  const nomCanal = CANAL_PAR_TYPE[type] === undefined ? 'rumeur' : CANAL_PAR_TYPE[type];
  if (nomCanal === null) return 0;
  const canal = CANAUX[nomCanal];
  let d = ROUTE_MOYENNE;
  if (deRegionId != null) {
    d = Infinity;
    for (const g of groupes(state)) d = Math.min(d, distance(g.regionId, deRegionId));
    if (!Number.isFinite(d)) d = ROUTE_MOYENNE;
  }
  return Math.round(canal.base + canal.parCase * d);
}

/**
 * Le même voyage, dans l'autre sens (L3) : le temps qu'un fait du joueur met
 * à atteindre une faction — sa capitale, où l'on décide de ce qu'on pense.
 */
export function delaiVersFaction(state, canal, deRegionId, faction) {
  const c = CANAUX[canal] || CANAUX.rumeur;
  const f = state.world.factions[faction];
  const capitale = f && f.capitale ? colonieParId(state.world, f.capitale) : null;
  const d = capitale && deRegionId != null
    ? distance(deRegionId, capitale.regionId) : ROUTE_MOYENNE;
  return Math.round(c.base + c.parCase * d);
}

/**
 * La mémoire du monde est bornée, comme celle de tout le monde ici (quatre
 * souvenirs par notable, soixante rencontres, douze rachats) : les vieux
 * faits sortent poussés par les nouveaux.
 */
export const FAITS_MAX = 60;

/** L'écriture brute, clampée, sans registre. Garde-fou : les pillards et
 * l'Essaim ne sont pas des institutions — pas de clé fantôme. */
export function appliquerReputation(state, faction, delta) {
  if (!faction || faction === 'essaim' || faction === 'bandits'
    || !drapeauDe(state.world, faction)) return;
  const r = state.player.reputation;
  r[faction] = Math.max(-100, Math.min(100, (r[faction] || 0) + delta));
}

/**
 * Le filet continu — la patrouille qui rassure heure après heure, la rancune
 * d'intendance qui s'accumule — ne pousse pas une entrée par heure : au
 * registre borné, un mois de patrouille évincerait la vraie mémoire. C'est UN
 * fait par (type, faction) — un fleuve : son delta grossit jusqu'à la borne,
 * sa date avance à la dernière heure d'activité. « Il tient nos routes depuis
 * des semaines » est un fait, que la maison connaît, qu'un successeur repèse
 * et qu'un conseil peut finir par classer — aucun régime spécial.
 */
export const FLEUVE = { plafond: 30 };

/**
 * Commettre un fait : il entre au registre, ce qui est déjà su s'applique,
 * le reste attend son heure. `effets` : [{faction, delta, su, dit?}] —
 * `dit` est la ligne de journal à l'arrivée de la nouvelle (décision n°5 :
 * on montre qui sait quoi, et quand). `fleuve: true` : voir FLEUVE.
 */
export function commettre(state, fait, log) {
  if (!state.player.faits) state.player.faits = [];
  if (fait.fleuve) {
    const e = (fait.effets || [])[0];
    const borne = (x) => Math.max(-FLEUVE.plafond, Math.min(FLEUVE.plafond, x));
    const lit = e && state.player.faits.find((x) => x.fleuve && x.type === fait.type
      && (x.effets || [])[0] && x.effets[0].faction === e.faction);
    if (lit) {
      const vieux = lit.effets[0].delta || 0;
      lit.effets[0].delta = borne(vieux + e.delta);
      lit.t = fait.t ?? state.temps;
      appliquerReputation(state, e.faction, lit.effets[0].delta - vieux);
      return lit;
    }
    if (e) e.delta = borne(e.delta);
  }
  state.player.faits.push(fait);
  if (state.player.faits.length > FAITS_MAX) state.player.faits.shift();
  for (const e of fait.effets || []) {
    if (e.su <= (fait.t ?? state.temps)) {
      appliquerReputation(state, e.faction, e.delta);
      e.applique = true;
    }
  }
  return fait;
}

/**
 * La file des nouvelles en route : ce qui doit être su à cette heure-ci
 * tombe, et se dit. Le registre est borné à soixante entrées — le parcours
 * est trivial, et un fait dont tous les effets sont tombés ne coûte rien.
 */
export function tickFaits(state, log, outils) {
  for (const f of state.player.faits || []) {
    for (const e of f.effets || []) {
      if (e.applique || e.su > state.temps) continue;
      e.applique = true;
      if (e.faction && e.delta !== undefined) {
        appliquerReputation(state, e.faction, e.delta);
      }
      // Une ville qui apprend retient (L3) — par ses notables, sans juger si
      // le fait ne nomme personne (delta absent : « des pillards », pas vous).
      if (e.ville && outils && outils.retenirEnVille) {
        const col = colonieParId(state.world, e.ville);
        if (col) outils.retenirEnVille(col, e.memoire || 'pillage', state.temps, e.delta || null);
      }
      // Une route où l'on disparaît se fait mal famée.
      if (e.region != null && e.danger) {
        const r = state.world.regions[e.region];
        if (r) r.danger = Math.min(1, (r.danger || 0) + e.danger);
      }
      if (log && e.dit) {
        log({
          type: 'rumeur',
          texte: e.dit,
          important: true,
          factions: e.faction ? [e.faction] : [],
        });
      }
    }
  }
}
