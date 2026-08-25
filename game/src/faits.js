// Le registre des faits — la seule porte vers ce que le monde pense du joueur.
//
// L2 (MEMOIRE.md) : un acte du joueur est un FAIT — daté, situé, avec des
// effets par faction et l'heure `su` où chacune l'apprend. L'effet ne tombe
// qu'à l'arrivée de la nouvelle : commettre enregistre et applique ce qui est
// déjà su, `tickFaits` livre le reste à l'heure dite. Plus rien d'autre dans
// le moteur n'écrit `state.player.reputation` : c'est la garantie (tenue par
// un test statique) que les chemins muets ne reviendront pas.
//
// Une seule porte : `commettre` — les ACTES, discrets, enregistrés,
// différables ; le filet continu y passe en fait-fleuve. Depuis L5,
// l'écriture brute n'existe plus du tout : le scalaire `reputation[k]` est
// une VUE — « ce que le porteur de la maison k sait et retient » — sommée
// depuis le registre par `materialiser`, repesée aux successions par
// `repeserPorteur`, classée aux conseils par l'oubli. La mémoire appartient
// au souvenant.

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

/**
 * La table de mémoire par tempérament (L5, décision n°3) : qui garde quoi,
 * et combien de temps. `estime`/`rancune` : la part d'un fait que le
 * successeur retient en repesant l'héritage — le rancunier garde les griefs
 * entiers, le conciliateur passe l'éponge. `patience` : les heures au bout
 * desquelles, à SON conseil, le porteur classe un vieux grief — proportionnée
 * à la gravité du fait (voir OUBLI.parPoint). Le rancunier n'oublie jamais :
 * un grand fini, parce que `JSON.stringify(Infinity)` écrit `null` (le
 * précédent est documenté sur `coursMax`, monnaie.js). AUCUNE constante
 * universelle : c'est le caractère de l'agent qui décide, comme `guerre: 1.6`
 * est le caractère d'un conquérant. Calibrable — objet mutable.
 */
export const MEMOIRE_TEMPERAMENT = {
  rancunier: { estime: 0.5, rancune: 1, patience: 1e9 },
  conciliateur: { estime: 1, rancune: 0.25, patience: 700 },
  methodique: { estime: 0.9, rancune: 0.9, patience: 2800 },
  conquerant: { estime: 0.6, rancune: 0.8, patience: 2100 },
  rapace: { estime: 0.6, rancune: 0.6, patience: 1400 },
  prudent: { estime: 0.8, rancune: 0.7, patience: 2100 },
  batisseur: { estime: 0.8, rancune: 0.5, patience: 1400 },
};

/** L'échelle de l'oubli : des heures de patience par point de gravité.
 * Une insulte à −3 se classe sept fois plus vite qu'un pillage à −22. */
export const OUBLI = { parPoint: 3 };

/** Le garde-fou de la porte : les pillards et l'Essaim ne sont pas des
 * institutions — pas de clé fantôme. */
function institution(state, faction) {
  return !!faction && faction !== 'essaim' && faction !== 'bandits'
    && !!drapeauDe(state.world, faction);
}

/**
 * Matérialiser ce qu'une maison pense de vous : la somme de ce que son
 * porteur sait et retient — les effets appliqués du registre, chacun à son
 * poids — clampée à ±100 À LA LECTURE, pas à l'écriture. Un joueur à −300 de
 * faits cumulés qui rachète +50 ne bouge pas de −100 : la haine ne se solde
 * pas à l'unité près. Le scalaire n'est plus une vérité qu'on édite : c'est
 * une vue, recalculée à quatre occasions (arrivée d'un effet, succession,
 * oubli, éviction) — jamais par balayage horaire.
 */
export function materialiser(state, faction) {
  if (!institution(state, faction)) return;
  let somme = 0;
  for (const f of state.player.faits || []) {
    for (const e of f.effets || []) {
      if (!e.applique || e.oublie || e.faction !== faction || e.delta === undefined) continue;
      somme += e.delta * (e.poids === undefined ? 1 : e.poids);
    }
  }
  state.player.reputation[faction] = Math.max(-100, Math.min(100, somme));
}

/**
 * La succession repèse les faits, elle ne multiplie plus un chiffre (L5,
 * remplace le multiplicateur de L4) : le successeur connaît les livres de la
 * maison, mais les pèse selon SON tempérament — la part d'estime pour ce
 * qu'on vous devait, la part de rancune pour ce qu'on vous reprochait. Sur
 * une mémoire mixte, les signes ne se compensent plus avant la pesée : un
 * rancunier devant +30 d'estime et −20 de griefs vous rend −5, pas +5 —
 * c'est exactement lui. Seuls les effets DÉJÀ appliqués sont repesés : une
 * nouvelle encore en route arrive au nouveau chef à plein poids — il
 * apprend, il n'hérite pas. Et les successions composent : deux rapaces de
 * suite, ×0,6 puis ×0,6.
 */
export function repeserPorteur(state, faction, temperament) {
  if (!institution(state, faction)) return 0;
  const h = MEMOIRE_TEMPERAMENT[temperament] || { estime: 0.8, rancune: 0.8 };
  const avant = state.player.reputation[faction] || 0;
  for (const f of state.player.faits || []) {
    for (const e of f.effets || []) {
      if (!e.applique || e.oublie || e.faction !== faction || e.delta === undefined) continue;
      e.poids = (e.poids === undefined ? 1 : e.poids) * (e.delta > 0 ? h.estime : h.rancune);
    }
  }
  materialiser(state, faction);
  return (state.player.reputation[faction] || 0) - avant;
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
      lit.effets[0].delta = borne((lit.effets[0].delta || 0) + e.delta);
      lit.t = fait.t ?? state.temps;
      materialiser(state, e.faction);
      return lit;
    }
    if (e) e.delta = borne(e.delta);
  }
  state.player.faits.push(fait);
  const touchees = new Set();
  if (state.player.faits.length > FAITS_MAX) {
    // L'éviction recalcule aussi : un fait poussé dehors emporte sa
    // contribution — sinon l'agrégat garde des fantômes que plus aucune
    // somme n'explique.
    const sorti = state.player.faits.shift();
    for (const e of sorti.effets || []) {
      if (e.applique && !e.oublie && e.faction && e.delta !== undefined) touchees.add(e.faction);
    }
  }
  for (const e of fait.effets || []) {
    if (e.su <= (fait.t ?? state.temps)) {
      e.applique = true;
      if (e.faction && e.delta !== undefined) touchees.add(e.faction);
    }
  }
  for (const k of touchees) materialiser(state, k);
  return fait;
}

/**
 * L'oubli tombe au conseil du porteur (L5c, décision n°3) — jamais à heure
 * fixe : les conseils battent à leur propre cadence (`f.prochainConseil`,
 * irrégulier), et le guetteur côté joueur — même patron que `chefs` — lit le
 * tampon `f.dernierConseil` que le monde laisse derrière lui. À SA séance,
 * le porteur classe LE plus vieux grief dont l'âge dépasse sa patience,
 * proportionnée à la gravité (patience × |delta×poids| / OUBLI.parPoint) :
 * une insulte à −3 se lâche vite, un pillage à −22 sept fois plus tard, un
 * rancunier jamais. Un par conseil ; argmax stable, entièrement
 * déterministe — zéro tirage. Le moment appartient à l'agent, la décision à
 * son tempérament, le poids au fait lui-même.
 */
export function tickOubli(state, log) {
  if (!state.player.conseilsVus) state.player.conseilsVus = {};
  for (const k of Object.keys(state.world.factions)) {
    if (k === 'essaim') continue;
    const f = state.world.factions[k];
    if (!f || f.morte) continue;
    const dc = f.dernierConseil || 0;
    const vu = state.player.conseilsVus[k];
    if (vu === undefined) { state.player.conseilsVus[k] = dc; continue; }
    if (dc === vu) continue;
    state.player.conseilsVus[k] = dc;
    const dk = f.dirigeant;
    if (!dk) continue;
    const h = MEMOIRE_TEMPERAMENT[dk.temperament] || {};
    const patience = h.patience || 1e9;
    let cible = null;
    for (const fait of state.player.faits || []) {
      for (const e of fait.effets || []) {
        if (!e.applique || e.oublie || e.faction !== k || !(e.delta < 0)) continue;
        const poids = e.poids === undefined ? 1 : e.poids;
        if (!poids) continue;
        const age = state.temps - (fait.t || 0);
        if (age <= patience * Math.abs(e.delta * poids) / OUBLI.parPoint) continue;
        if (!cible || (fait.t || 0) < (cible.t || 0)) cible = { t: fait.t || 0, e };
      }
    }
    if (!cible) continue;
    cible.e.oublie = true;
    materialiser(state, k);
    const d = drapeauDe(state.world, k);
    if (log && d && Math.abs(cible.e.delta * (cible.e.poids === undefined ? 1 : cible.e.poids)) >= 1) {
      log({
        type: 'rumeur',
        texte: `Au conseil ${d.genitif}, une vieille histoire ne revient plus : `
          + `${dk.titre} ${dk.nom} l’a laissée aux archives.`,
        factions: [k],
        discret: true,
      });
    }
  }
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
        materialiser(state, e.faction);
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
