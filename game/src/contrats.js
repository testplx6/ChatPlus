// Contrats : ce que les villes vous demandent de faire. C'est ce qui donne un
// but à court terme entre deux ordres de récolte, et une raison de traverser la
// carte plutôt que de camper.
//
// Tout se résout automatiquement (livrer, ramener, compter les victoires), donc
// un contrat continue d'avancer pendant que le joueur est hors ligne.

import { COMMODITIES, COMMODITY_KEYS, FACTIONS, DIPLO_FACTIONS } from './data.js';
import { colonieParId, distance, nomRegion } from './world.js';
import { idDepuisRng } from './characters.js';
import { crediter, estAuService } from './allegeance.js';
import { groupes, groupeActif } from './groupes.js';
import { faveurChef } from './services.js';

/** Durée de vie d'un panneau d'affichage avant renouvellement. */
const DUREE_PANNEAU = 220;

const RESSOURCES_DEMANDEES = ['ferraille', 'minerai', 'polymere', 'biomasse', 'alliage', 'carburant', 'composant', 'isotope'];

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

function contratCollecte(rng, state, col, t) {
  // Une ville demande ce qui lui manque vraiment.
  const manques = RESSOURCES_DEMANDEES
    .map((k) => [k, Math.max(0.1, 1 - (col.stock[k] || 0) / Math.max(1, col.pop * 0.4))])
    .filter((e) => e[1] > 0.15);
  const ressource = rng.weighted(manques.length ? manques : RESSOURCES_DEMANDEES.map((k) => [k, 1]));
  // On raisonne en valeur, pas en nombre : sinon une ville réclame quarante
  // isotopes comme elle réclamerait quarante ferrailles.
  const cible = rng.range(160, 520) * (1 + col.taille * 0.35);
  const quantite = Math.max(8, Math.min(140, Math.round(cible / COMMODITIES[ressource].prix)));
  const valeur = COMMODITIES[ressource].prix * quantite;
  // On remet la marchandise en même temps qu'on encaisse : à 1,5× la valeur
  // marchande, le contrat ne rapportait qu'une demi-vente de plus que d'aller
  // vendre le même lot — pour le prix d'un voyage dédié jusqu'au
  // commanditaire. Le gain net doit valoir le détour, sinon le panneau
  // d'affichage n'est qu'un piège à joueur consciencieux.
  return {
    type: 'collecte',
    ressource,
    quantite,
    recompense: Math.round(valeur * rng.range(2.6, 3.6)),
    reputation: rng.irange(3, 7),
    duree: rng.irange(180, 400),
    titre: `Rassembler ${quantite} ${COMMODITIES[ressource].nom.toLowerCase()}`,
  };
}

function contratLivraison(rng, state, col, t) {
  const autres = state.world.colonies.filter(
    (c) => !c.ruine && c.id !== col.id && distance(c.regionId, col.regionId) >= 2
  );
  if (!autres.length) return null;
  const dest = rng.pick(autres);
  const d = distance(col.regionId, dest.regionId);
  const ressource = rng.pick(['composant', 'medkit', 'alliage', 'rations', 'isotope']);
  const quantite = rng.irange(8, 25);
  const poids = COMMODITIES[ressource].poids * quantite;
  return {
    type: 'livraison',
    destId: dest.id,
    ressource,
    quantite,
    poids: Number(poids.toFixed(1)),
    recompense: Math.round((80 + d * 55 + poids * 6) * rng.range(0.9, 1.4)),
    reputation: rng.irange(4, 9),
    duree: Math.round(d * rng.range(14, 24)),
    titre: `Porter ${quantite} ${COMMODITIES[ressource].nom.toLowerCase()} à ${dest.nom}`,
  };
}

function contratPrime(rng, state, col, t) {
  // On paie pour taper sur un ennemi, ou sur les pillards par défaut.
  const ennemis = DIPLO_FACTIONS.filter((k) => {
    if (k === col.faction) return false;
    const f = state.world.factions[col.faction];
    return f && (f.relations[k] ?? 0) < 15;
  });
  // Les pillards courent les routes ; une faction précise se croise beaucoup
  // moins. On penche vers ce qui est réellement trouvable, sinon la prime est
  // un contrat qu'on ne peut pas honorer.
  const cible = ennemis.length && rng.chance(0.3) ? rng.pick(ennemis) : 'bandits';
  const victoires = rng.irange(1, 3);
  return {
    type: 'prime',
    cibleFaction: cible,
    victoires,
    progres: 0,
    recompense: Math.round(victoires * rng.irange(220, 460)),
    reputation: rng.irange(4, 10),
    duree: rng.irange(240, 500),
    titre: `${victoires} victoire${victoires > 1 ? 's' : ''} contre ${cible === 'bandits' ? 'les pillards' : FACTIONS[cible].nom}`,
  };
}

function contratReconnaissance(rng, state, col, t) {
  const inconnues = state.world.regions.filter(
    (r) => !r.decouvert && distance(r.i, col.regionId) >= 2
  );
  if (!inconnues.length) return null;
  const r = rng.pick(inconnues);
  const d = distance(col.regionId, r.i);
  return {
    type: 'reconnaissance',
    regionId: r.i,
    recompense: Math.round((70 + d * 45) * rng.range(0.9, 1.3)),
    reputation: rng.irange(2, 6),
    duree: Math.round(d * rng.range(16, 28)),
    titre: `Reconnaître le secteur ${String.fromCharCode(65 + r.x)}${r.y + 1}`,
  };
}

const FABRIQUES = {
  collecte: contratCollecte,
  livraison: contratLivraison,
  prime: contratPrime,
  reconnaissance: contratReconnaissance,
};

/** (Re)garnit le panneau d'affichage d'une ville. */
export function genererContrats(state, col, rng, t) {
  const combien = 1 + col.taille;
  const liste = [];
  const types = Object.keys(FABRIQUES);
  for (let i = 0; i < combien; i++) {
    const type = rng.weighted([
      ['collecte', 3], ['livraison', 2.2], ['prime', 2], ['reconnaissance', 1.4],
    ]);
    const c = FABRIQUES[type](rng, state, col, t);
    if (!c) continue;
    c.id = idDepuisRng(rng, 'k');
    c.colonieId = col.id;
    c.faction = col.faction;
    // Une ville agitée paie mal, une ville prospère paie bien.
    c.recompense = Math.max(50, Math.round(c.recompense * (1 - col.unrest * 0.3)));
    liste.push(c);
  }
  col.contrats = liste;
  col.contratsExpire = t + DUREE_PANNEAU;
  return liste;
}

/** Renouvelle les panneaux périmés. Appelé de loin en loin, pas à chaque heure. */
export function rafraichirPanneaux(state, rng, t) {
  for (const col of state.world.colonies) {
    if (col.ruine) { col.contrats = []; continue; }
    if (!col.contrats || t >= (col.contratsExpire || 0)) {
      genererContrats(state, col, rng, t);
    }
  }
}

// ---------------------------------------------------------------------------
// Acceptation
// ---------------------------------------------------------------------------

export const MAX_CONTRATS = 4;

export function accepter(state, col, id, log, groupe) {
  const g = groupe || groupeActif(state);
  if (!col.contrats) return { ok: false, motif: 'Aucun panneau ici.' };
  const i = col.contrats.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false, motif: 'Ce contrat n’est plus affiché.' };
  if (state.player.contrats.length >= MAX_CONTRATS) {
    return { ok: false, motif: `Déjà ${MAX_CONTRATS} contrats en cours.` };
  }
  const c = col.contrats[i];

  // Le panneau appartient à quelqu'un. Un chef qui vous a en horreur ne vous
  // confie pas les affaires de sa ville ; un chef qui vous doit quelque chose
  // vous garde ce qui paie.
  const faveur = faveurChef(col);
  if (!faveur.ouvert) {
    return { ok: false, motif: `Le chef de ${col.nom} ne veut pas de vos services.` };
  }
  if (faveur.prime !== 1) c.recompense = Math.round(c.recompense * faveur.prime);

  // Une livraison, ça se charge : il faut la place dans le sac.
  if (c.type === 'livraison') {
    g.inventaire[c.ressource] = (g.inventaire[c.ressource] || 0) + c.quantite;
    c.charge = true;
    c.porteur = g.id;
  }

  col.contrats.splice(i, 1);
  c.accepteA = state.temps;
  c.echeance = state.temps + c.duree;
  state.player.contrats.push(c);
  log({
    type: 'contrat',
    texte: `Contrat accepté : ${c.titre} (${c.recompense} cr).`,
    important: true,
    regionId: col.regionId,
  });
  return { ok: true };
}

export function abandonner(state, id, log) {
  const i = state.player.contrats.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false, motif: 'Contrat introuvable.' };
  const c = state.player.contrats[i];
  state.player.contrats.splice(i, 1);
  if (c.type === 'livraison' && c.charge) {
    // On garde la marchandise : ça s'appelle du vol, et ça se paie.
    state.player.reputation[c.faction] = Math.max(-100, (state.player.reputation[c.faction] || 0) - 12);
  } else {
    state.player.reputation[c.faction] = Math.max(-100, (state.player.reputation[c.faction] || 0) - 4);
  }
  log({ type: 'contrat', texte: `Contrat abandonné : ${c.titre}.`, important: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Suivi
// ---------------------------------------------------------------------------

/** Le premier groupe présent en `regionId` qui porte assez de `key`. */
function auLieu(state, regionId, key, quantite) {
  return groupes(state).find(
    (g) => g.regionId === regionId && (g.inventaire[key] || 0) >= quantite
  ) || null;
}

/** Avancement lisible d'un contrat : { fait, total, texte, pret }. */
export function progres(state, c) {
  switch (c.type) {
    case 'collecte': {
      // Le meilleur groupe, pas la somme : c'est un groupe qui apporte la
      // marchandise au commanditaire, et il l'apporte entière. Additionner ce
      // que portent des gens séparés par la moitié de la carte annoncerait un
      // contrat livrable qui ne le serait jamais.
      let q = 0;
      for (const g of groupes(state)) q = Math.max(q, Math.floor(g.inventaire[c.ressource] || 0));
      return { fait: Math.min(q, c.quantite), total: c.quantite, pret: q >= c.quantite,
        texte: `${Math.min(q, c.quantite)} / ${c.quantite}` };
    }
    case 'livraison': {
      // Être là ne suffit pas : il faut y être avec le colis. Le groupe qui a
      // signé n'est pas forcément celui qui arrive, et le colis ne se
      // téléporte pas d'un groupe à l'autre.
      const dest = colonieParId(state.world, c.destId);
      const porteur = dest && auLieu(state, dest.regionId, c.ressource, c.quantite);
      const surPlace = dest && groupes(state).some((g) => g.regionId === dest.regionId);
      return {
        fait: porteur ? 1 : 0,
        total: 1,
        pret: !!porteur,
        texte: !dest ? '→ ville disparue'
          : surPlace && !porteur ? `→ ${dest.nom} · colis ailleurs`
            : `→ ${dest.nom}`,
      };
    }
    case 'prime':
      return { fait: c.progres, total: c.victoires, pret: c.progres >= c.victoires,
        texte: `${c.progres} / ${c.victoires}` };
    case 'reconnaissance': {
      const vu = state.world.regions[c.regionId].decouvert;
      return { fait: vu ? 1 : 0, total: 1, pret: vu, texte: vu ? 'secteur vu' : 'non exploré' };
    }
    default:
      return { fait: 0, total: 1, pret: false, texte: '' };
  }
}

/** Incrémenté depuis le combat : une victoire compte pour les primes en cours. */
export function compterVictoire(state, factionBande) {
  for (const c of state.player.contrats) {
    if (c.type !== 'prime') continue;
    const vise = c.cibleFaction === 'bandits' ? 'bandits' : c.cibleFaction;
    if (factionBande === vise) c.progres = Math.min(c.victoires, c.progres + 1);
  }
}

function recompenser(state, c, log) {
  state.player.credits += c.recompense;
  // Un contrat rempli pour les siens compte double : il paie et il fait monter.
  if (estAuService(state, c.faction)) {
    crediter(state, Math.round(c.recompense / 7) + 10, log, 'Contrat honoré pour les vôtres');
  }
  state.player.reputation[c.faction] = Math.min(100, (state.player.reputation[c.faction] || 0) + c.reputation);
  state.stats.contratsRemplis = (state.stats.contratsRemplis || 0) + 1;
  log({
    type: 'contrat',
    texte: `Contrat rempli : ${c.titre}. ${c.recompense} cr, réputation +${c.reputation}.`,
    important: true,
  });
}

/** Une heure de suivi : validation, échéances. */
export function tickContrats(state, log, ctx) {
  const restants = [];
  for (const c of state.player.contrats) {
    const p = progres(state, c);
    const donneur = colonieParId(state.world, c.colonieId);

    // Validation : il faut qu'un groupe soit au bon endroit, avec la
    // marchandise. Lequel, peu importe — c'est le joueur qui a signé.
    if (p.pret) {
      if (c.type === 'collecte') {
        const porteur = donneur && auLieu(state, donneur.regionId, c.ressource, c.quantite);
        if (porteur) {
          porteur.inventaire[c.ressource] -= c.quantite;
          donneur.stock[c.ressource] = (donneur.stock[c.ressource] || 0) + c.quantite;
          recompenser(state, c, log);
          continue;
        }
      } else if (c.type === 'livraison') {
        const dest = colonieParId(state.world, c.destId);
        const porteur = dest && auLieu(state, dest.regionId, c.ressource, c.quantite);
        if (porteur) {
          porteur.inventaire[c.ressource] -= c.quantite;
          dest.stock[c.ressource] = (dest.stock[c.ressource] || 0) + c.quantite;
          recompenser(state, c, log);
          continue;
        }
      } else if (donneur && groupes(state).some((g) => g.regionId === donneur.regionId)) {
        recompenser(state, c, log);
        continue;
      }
    }

    // Le commanditaire a disparu : plus personne pour payer.
    const mort = (!donneur || donneur.ruine)
      || (c.type === 'livraison' && (() => {
        const d = colonieParId(state.world, c.destId);
        return !d || d.ruine;
      })());
    if (mort) {
      log({ type: 'contrat', texte: `Contrat caduc : ${c.titre}. La ville n’existe plus.`, important: true });
      continue;
    }

    // Échéance dépassée
    if (state.temps > c.echeance) {
      state.player.reputation[c.faction] = Math.max(-100, (state.player.reputation[c.faction] || 0) - 6);
      log({
        type: 'contrat',
        texte: `Contrat échu : ${c.titre}. Réputation entamée.`,
        important: true,
      });
      continue;
    }
    restants.push(c);
  }
  state.player.contrats = restants;
}

/** Là où il faut se rendre pour toucher la prime, pour l'affichage. */
export function lieuValidation(state, c) {
  if (c.type === 'livraison') {
    const d = colonieParId(state.world, c.destId);
    return d ? d.nom : '—';
  }
  const donneur = colonieParId(state.world, c.colonieId);
  return donneur ? donneur.nom : '—';
}
