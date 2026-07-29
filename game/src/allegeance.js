// Allégeance. Jusqu'ici les factions étaient un décor avec lequel on
// commerçait ; on peut désormais entrer à leur service, monter en grade, en
// recevoir des ordres et en tirer des avantages concrets.
//
// C'est la progression longue du jeu : la réputation était un chiffre, le grade
// est une position dans le monde.

import { FACTIONS, DIPLO_FACTIONS, COMMODITIES } from './data.js';
import { colonieParId, distance } from './world.js';
import { idDepuisRng } from './characters.js';

export const RANGS = [
  {
    nom: 'Affilié', points: 0, remise: 0.05, solde: 0,
    desc: 'On vous laisse entrer par la porte de service.',
  },
  {
    nom: 'Agent', points: 130, remise: 0.10, solde: 30,
    desc: 'On vous connaît. Les péages ne vous concernent plus.',
  },
  {
    nom: 'Lieutenant', points: 380, remise: 0.16, solde: 75,
    desc: 'Les armuriers vous sortent ce qu’ils gardent derrière.',
  },
  {
    nom: 'Capitaine', points: 850, remise: 0.22, solde: 160,
    desc: 'On vous soigne sans compter, et on vient parfois à votre secours.',
  },
  {
    nom: 'Commandeur', points: 1700, remise: 0.30, solde: 300,
    desc: 'Votre nom vaut un ordre écrit.',
  },
];

/** Réputation minimale pour être seulement reçu. */
export const REPUTATION_MINIMALE = 20;

export function rangDe(all) {
  if (!all) return null;
  let i = 0;
  for (let k = 0; k < RANGS.length; k++) {
    if (all.points >= RANGS[k].points) i = k;
  }
  return { index: i, def: RANGS[i], suivant: RANGS[i + 1] || null };
}

export function estAuService(state, faction) {
  return !!state.player.allegeance && state.player.allegeance.faction === faction;
}

/** Remise consentie par sa propre faction, 0 ailleurs. */
export function remiseDe(state, faction) {
  if (!estAuService(state, faction)) return 0;
  return rangDe(state.player.allegeance).def.remise;
}

/** Palier d'équipement supplémentaire débloqué chez les siens. */
export function palierBonus(state, faction) {
  if (!estAuService(state, faction)) return 0;
  return rangDe(state.player.allegeance).index >= 2 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Entrer et sortir
// ---------------------------------------------------------------------------

export function peutSEngager(state, faction) {
  if (!FACTIONS[faction] || faction === 'essaim') {
    return { ok: false, motif: 'Cette faction n’enrôle personne.' };
  }
  if (state.player.allegeance) {
    return { ok: false, motif: `Déjà au service ${FACTIONS[state.player.allegeance.faction].genitif}.` };
  }
  const rep = state.player.reputation[faction] || 0;
  if (rep < REPUTATION_MINIMALE) {
    return { ok: false, motif: `Réputation insuffisante : ${Math.round(rep)} / ${REPUTATION_MINIMALE}.` };
  }
  return { ok: true };
}

export function sEngager(state, faction, log) {
  const v = peutSEngager(state, faction);
  if (!v.ok) return v;

  state.player.allegeance = {
    faction,
    points: 0,
    depuis: state.temps,
    ordre: null,
    prochainOrdre: state.temps + 60,
    derniereSolde: state.temps,
  };

  // On ne choisit pas un camp sans que l'autre le remarque.
  for (const g of state.world.guerres) {
    const autre = g.a === faction ? g.b : g.b === faction ? g.a : null;
    if (!autre) continue;
    state.player.reputation[autre] = Math.max(-100, (state.player.reputation[autre] || 0) - 20);
  }

  log({
    type: 'allegeance',
    texte: `Vous entrez au service ${FACTIONS[faction].genitif}. Rang : ${RANGS[0].nom}.`,
    important: true,
  });
  return { ok: true };
}

export function quitter(state, log) {
  const all = state.player.allegeance;
  if (!all) return { ok: false, motif: 'Vous n’êtes au service de personne.' };
  const f = all.faction;
  state.player.allegeance = null;
  state.player.reputation[f] = Math.max(-100, (state.player.reputation[f] || 0) - 30);
  log({
    type: 'allegeance',
    texte: `Vous rompez avec ${FACTIONS[f].nom}. On n’oublie pas ce genre de départ.`,
    important: true,
  });
  return { ok: true };
}

/** Points de service gagnés. Retourne le nombre de grades franchis. */
export function crediter(state, points, log, motif) {
  const all = state.player.allegeance;
  if (!all || points <= 0) return 0;
  const avant = rangDe(all).index;
  all.points += points;
  const apres = rangDe(all).index;
  if (apres > avant) {
    log({
      type: 'allegeance',
      texte: `${FACTIONS[all.faction].nom} vous élève au rang de ${RANGS[apres].nom}. ${RANGS[apres].desc}`,
      important: true,
    });
  } else if (motif) {
    log({ type: 'allegeance', texte: `${motif} (+${Math.round(points)} au service).`, discret: true });
  }
  return apres - avant;
}

// ---------------------------------------------------------------------------
// Ordres de mission
// ---------------------------------------------------------------------------
// Un contrat que la faction vous impose plutôt que de vous proposer. Mieux
// payé, et le refuser se paie.

function villesDe(state, faction) {
  return state.world.colonies.filter((c) => !c.ruine && c.faction === faction);
}

function fabriquerOrdre(state, rng) {
  const all = state.player.allegeance;
  const miennes = villesDe(state, all.faction);
  if (!miennes.length) return null;
  const rang = rangDe(all);

  // On vise ce qui sert vraiment la faction : ravitailler une ville en manque,
  // frapper un ennemi déclaré, ou reconnaître un secteur convoité.
  const guerres = state.world.guerres.filter((g) => g.a === all.faction || g.b === all.faction);
  const ennemis = guerres.map((g) => (g.a === all.faction ? g.b : g.a));

  const choix = [];
  choix.push(['ravitaillement', 3]);
  if (ennemis.length) choix.push(['frappe', 3]);
  choix.push(['reconnaissance', 1.5]);
  const type = rng.weighted(choix);

  if (type === 'frappe') {
    const cible = rng.pick(ennemis);
    const victoires = 1 + rng.int(1 + rang.index);
    return {
      id: idDepuisRng(rng, 'o'),
      type: 'frappe',
      cibleFaction: cible,
      victoires,
      progres: 0,
      titre: `${victoires} victoire${victoires > 1 ? 's' : ''} contre ${FACTIONS[cible].nom}`,
      recompense: Math.round(victoires * rng.irange(300, 560) * (1 + rang.index * 0.25)),
      service: Math.round(victoires * 45 * (1 + rang.index * 0.2)),
      duree: rng.irange(260, 460),
    };
  }

  if (type === 'reconnaissance') {
    const inconnues = state.world.regions.filter((r) => !r.decouvert);
    if (!inconnues.length) return null;
    const r = rng.pick(inconnues);
    return {
      id: idDepuisRng(rng, 'o'),
      type: 'reconnaissance',
      regionId: r.i,
      titre: `Reconnaître le secteur ${String.fromCharCode(65 + r.x)}${r.y + 1}`,
      recompense: Math.round(rng.irange(180, 340) * (1 + rang.index * 0.2)),
      service: Math.round(40 * (1 + rang.index * 0.2)),
      duree: rng.irange(200, 380),
    };
  }

  // Ravitaillement : la ville la plus en peine de la faction.
  let pire = null;
  let pireManque = 0;
  let ressource = 'rations';
  for (const col of miennes) {
    for (const k of ['rations', 'composant', 'alliage', 'medkit', 'carburant']) {
      const manque = Math.max(0, col.pop * 0.25 - (col.stock[k] || 0));
      if (manque > pireManque) { pireManque = manque; pire = col; ressource = k; }
    }
  }
  if (!pire) pire = rng.pick(miennes);
  const quantite = Math.max(15, Math.min(120, Math.round(pireManque * rng.range(0.3, 0.6)) || 30));
  return {
    id: idDepuisRng(rng, 'o'),
    type: 'ravitaillement',
    colonieId: pire.id,
    ressource,
    quantite,
    titre: `Ravitailler ${pire.nom} : ${quantite} ${COMMODITIES[ressource].nom.toLowerCase()}`,
    recompense: Math.round(COMMODITIES[ressource].prix * quantite * rng.range(1.8, 2.6)),
    service: Math.round(quantite * 1.5 + 30),
    duree: rng.irange(240, 420),
  };
}

export function avancementOrdre(state, o) {
  if (!o) return null;
  switch (o.type) {
    case 'frappe':
      return { fait: o.progres, total: o.victoires, pret: o.progres >= o.victoires,
        texte: `${o.progres} / ${o.victoires}` };
    case 'reconnaissance': {
      const vu = state.world.regions[o.regionId].decouvert;
      return { fait: vu ? 1 : 0, total: 1, pret: vu, texte: vu ? 'secteur vu' : 'non exploré' };
    }
    case 'ravitaillement': {
      const q = Math.floor(state.player.inventaire[o.ressource] || 0);
      const col = colonieParId(state.world, o.colonieId);
      const surPlace = col && state.player.regionId === col.regionId;
      return {
        fait: Math.min(q, o.quantite),
        total: o.quantite,
        pret: q >= o.quantite && surPlace,
        texte: `${Math.min(q, o.quantite)} / ${o.quantite}${col ? ` · ${col.nom}` : ''}`,
      };
    }
    default:
      return null;
  }
}

/** Une victoire compte pour l'ordre en cours, comme pour les primes. */
export function compterVictoireOrdre(state, factionBande) {
  const all = state.player.allegeance;
  if (!all || !all.ordre || all.ordre.type !== 'frappe') return;
  if (all.ordre.cibleFaction === factionBande) {
    all.ordre.progres = Math.min(all.ordre.victoires, all.ordre.progres + 1);
  }
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

export function tickAllegeance(state, log, ctx) {
  const all = state.player.allegeance;
  if (!all) return;
  const rng = ctx.rng;
  const f = state.world.factions[all.faction];

  // Une faction éteinte ne commande plus personne.
  if (!f || !f.colonies.length) {
    log({
      type: 'allegeance',
      texte: `${FACTIONS[all.faction].nom} n’existe plus. Votre engagement tombe avec elle.`,
      important: true,
    });
    state.player.allegeance = null;
    return;
  }

  const rang = rangDe(all);

  // Solde versée tous les jours, à partir du grade d'Agent.
  if (rang.def.solde > 0 && state.temps - all.derniereSolde >= 24) {
    all.derniereSolde = state.temps;
    state.player.credits += rang.def.solde;
    log({
      type: 'solde',
      texte: `Solde ${FACTIONS[all.faction].genitif} : ${rang.def.solde} cr.`,
      discret: true,
    });
  }

  // Ordre en cours : validation, échéance.
  if (all.ordre) {
    const p = avancementOrdre(state, all.ordre);
    if (p && p.pret) {
      const o = all.ordre;
      if (o.type === 'ravitaillement') {
        const col = colonieParId(state.world, o.colonieId);
        state.player.inventaire[o.ressource] -= o.quantite;
        if (col) col.stock[o.ressource] = (col.stock[o.ressource] || 0) + o.quantite;
      }
      state.player.credits += o.recompense;
      state.player.reputation[all.faction] = Math.min(100, (state.player.reputation[all.faction] || 0) + 5);
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(120, 260);
      state.stats.ordresRemplis = (state.stats.ordresRemplis || 0) + 1;
      crediter(state, o.service, log, null);
      log({
        type: 'allegeance',
        texte: `Ordre exécuté : ${o.titre}. ${o.recompense} cr.`,
        important: true,
      });
    } else if (state.temps > all.ordre.echeance) {
      const o = all.ordre;
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(180, 320);
      all.points = Math.max(0, all.points - Math.round(o.service * 0.8));
      state.player.reputation[all.faction] = Math.max(-100, (state.player.reputation[all.faction] || 0) - 8);
      log({
        type: 'allegeance',
        texte: `Ordre non exécuté : ${o.titre}. On le note.`,
        important: true,
      });
    }
  } else if (state.temps >= all.prochainOrdre) {
    const o = fabriquerOrdre(state, rng);
    if (o) {
      o.echeance = state.temps + o.duree;
      all.ordre = o;
      log({
        type: 'allegeance',
        texte: `Ordre de mission ${FACTIONS[all.faction].genitif} : ${o.titre} (${o.recompense} cr).`,
        important: true,
      });
    } else {
      all.prochainOrdre = state.temps + 120;
    }
  }

  // Au grade de Capitaine, les siens viennent parfois prêter main-forte.
  if (rang.index >= 3 && state.player.secours === undefined) state.player.secours = 0;
}

/**
 * Renfort : à partir de Capitaine, une escouade amie peut arriver au milieu
 * d'un combat livré en territoire ami. Retourne le nombre de renforts.
 */
export function renfortsDisponibles(state) {
  const all = state.player.allegeance;
  if (!all) return 0;
  const rang = rangDe(all);
  if (rang.index < 3) return 0;
  const r = state.world.regions[state.player.regionId];
  if (r.controle !== all.faction) return 0;
  return rang.index - 2;
}
