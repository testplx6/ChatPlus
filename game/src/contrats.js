import { gagner, soldeIci } from './monnaie.js';
// Contrats : ce que les villes vous demandent de faire. C'est ce qui donne un
// but à court terme entre deux ordres de récolte, et une raison de traverser la
// carte plutôt que de camper.
//
// Tout se résout automatiquement (livrer, ramener, compter les victoires), donc
// un contrat continue d'avancer pendant que le joueur est hors ligne.

import {
  COMMODITIES, COMMODITY_KEYS, FACTIONS, DIPLO_FACTIONS, diploDe, drapeauDe,
} from './data.js';
import { colonieParId, distance, nomRegion, coordonnee } from './world.js';
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

/**
 * La part des offres qui pressent, et ce que l'urgence paie.
 *
 * Une sur quatre : assez pour qu'on en croise, assez rare pour que ce soit une
 * occasion plutôt qu'une norme. Et le supplément doit être visible, sinon
 * personne ne prend le risque : la moitié en plus, avant même la correction
 * d'agitation de la ville.
 */
export const PART_URGENTE = 0.25;
export const PRIME_URGENCE = 1.5;

/** Ce qu'une collecte peut demander au plus, en kilos. Voir `contratCollecte`. */
export const POIDS_COLLECTE_MAX = 80;

/**
 * Ce qu'un contrat rapporte vraiment à votre nom, ici et maintenant.
 *
 * Le chiffre écrit sur l'offre est ce que vaut le travail ; ce qu'on en retire
 * dépend de ce qu'on pense déjà de vous. Se faire un nom auprès de gens qui
 * vous ignorent est facile ; impressionner ceux qui vous admirent déjà l'est
 * beaucoup moins.
 *
 * Sans ce rendement décroissant, doubler le tarif des contrats — voir plus bas
 * pourquoi il le fallait — remplaçait un plancher par un plafond : huit
 * contrats suffisaient à saturer une faction à cent, et le panneau
 * d'affichage ne rapportait plus ensuite que de l'argent. Avec, on approche du
 * sommet sans jamais l'atteindre, et un contrat garde toujours une valeur.
 *
 * On ne dépasse jamais un pour un : un contrat ne rachète pas une haine plus
 * vite qu'il ne bâtit une estime.
 */
export function gainEstime(state, c) {
  const rep = state.player.reputation[c.faction] || 0;
  const part = Math.min(1, Math.max(0.15, 1 - rep / 100));
  return Math.max(1, Math.round((c.reputation || 0) * part));
}

// Ce qu'un contrat rendu fait à votre nom : nettement plus qu'avant, et la
// raison tient en une mesure.
//
// Le banc a appris à courtiser un drapeau et un seul, quatre mille heures
// durant, en allant travailler chez lui. Sommet de l'estime atteint, trente
// parties par drapeau : Communes 11, Rouilleurs 11, Hexa 16, Ombrelle 17,
// Cendre 11, Église 10. Or on est reçu à 10, estimé à 25, des leurs à 40, on
// n'achète de murs qu'à 25 ou 40 selon le régime, et l'on n'entre au service
// de la Milice qu'à 34. Toute la moitié haute de l'échelle était donc du
// décor : pas un joueur ne pouvait la voir, quoi qu'il fasse.
//
// Ce n'était pas l'oubli qui rongeait — le couper entièrement (SANS=erosion)
// ne rendait que six points. C'était le tarif. Un contrat rendu valait deux à
// dix points ; il en vaut quatre à seize, dont on ne touche qu'une part selon
// `gainEstime`. On garde les seuils : ce sont eux qui donnent leur caractère
// aux six drapeaux, et c'est la monnaie qui manquait, pas les prix.

function contratCollecte(rng, state, col, t) {
  // Une ville demande ce qui lui manque vraiment.
  const manques = RESSOURCES_DEMANDEES
    .map((k) => [k, Math.max(0.1, 1 - (col.stock[k] || 0) / Math.max(1, col.pop * 0.4))])
    .filter((e) => e[1] > 0.15);
  const ressource = rng.weighted(manques.length ? manques : RESSOURCES_DEMANDEES.map((k) => [k, 1]));
  // On raisonne en valeur, pas en nombre : sinon une ville réclame quarante
  // isotopes comme elle réclamerait quarante ferrailles.
  const cible = rng.range(160, 520) * (1 + col.taille * 0.35);
  // Plafonné au poids, pas seulement au nombre.
  //
  // « Rassembler 140 ferraille » pèse cent quarante kilos ; une escouade de
  // départ en porte cent quatre. Et la validation exige **un seul groupe**
  // portant le lot entier — on ne peut donc pas s'y mettre à deux. Mesuré sur
  // une partie : dix-huit des soixante-dix-sept collectes affichées étaient
  // hors de portée d'un sac, c'est-à-dire impossibles quoi qu'on fasse.
  //
  // Quatre-vingts kilos : un peu moins que ce que portent quatre personnes
  // équipées, donc faisable dès le premier jour, et sans objet plus tard quand
  // on a des bêtes.
  const parPoids = Math.floor(POIDS_COLLECTE_MAX / COMMODITIES[ressource].poids);
  const quantite = Math.max(8, Math.min(140, parPoids,
    Math.round(cible / COMMODITIES[ressource].prix)));
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
    reputation: rng.irange(5, 11),
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
    reputation: rng.irange(7, 15),
    duree: Math.round(d * rng.range(14, 24)),
    titre: `Porter ${quantite} ${COMMODITIES[ressource].nom.toLowerCase()} `
      + `à ${dest.nom} (${coordonnee(state.world, dest.regionId)})`,
  };
}

function contratPrime(rng, state, col, t) {
  // On paie pour taper sur un ennemi, ou sur les pillards par défaut.
  const ennemis = diploDe(state.world).filter((k) => {
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
    reputation: rng.irange(7, 16),
    duree: rng.irange(240, 500),
    titre: `${victoires} victoire${victoires > 1 ? 's' : ''} contre ${cible === 'bandits' ? 'les pillards' : drapeauDe(state.world, cible).nom}`,
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
    reputation: rng.irange(4, 10),
    // Aller **et** revenir : un relevé se rend au panneau qui l'a affiché, et
    // la durée ne payait que l'aller. Une escouade arrivée sur la case à midi
    // voyait donc le contrat échoir à treize heures, à trois régions de la ville
    // où le rendre — impossible par construction, et signalé en jeu comme tel.
    // Les autres types n'ont pas ce défaut : la livraison se valide sur place,
    // la collecte et la prime ont une durée forfaitaire large.
    duree: Math.round(d * 2 * rng.range(16, 28)),
    titre: `Reconnaître le secteur ${String.fromCharCode(65 + r.x)}${r.y + 1}`,
  };
}

/**
 * Le temps qu'il faut vraiment pour ce contrat-ci, largement compté.
 *
 * Vingt-six heures par région : l'allure réelle d'une colonne tourne autour de
 * quatre à huit, donc c'est trois à six fois la marge. On ne cherche pas à
 * serrer, on cherche à ce qu'aucune offre ne soit impossible en la lisant.
 */
const HEURES_PAR_REGION_LARGE = 26;

function dureeMinimale(state, col, c) {
  let cases = 0;
  if (c.type === 'livraison') {
    const dest = colonieParId(state.world, c.destId);
    // On se valide sur place : l'aller seul.
    cases = dest ? distance(col.regionId, dest.regionId) : 0;
  } else if (c.type === 'reconnaissance') {
    // Le relevé se rend au panneau qui l'a affiché : aller et retour.
    cases = distance(col.regionId, c.regionId) * 2;
  } else {
    // Collecte et prime : rien à situer, mais il faut courir et revenir. Une
    // dizaine de régions de battue est un ordre de grandeur honnête.
    cases = 10;
  }
  return Math.round(cases * HEURES_PAR_REGION_LARGE) + 120;
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
    // Le délai devient l'exception, et il se paie.
    //
    // Tous les contrats avaient une échéance, et le banc a chiffré ce que ça
    // donne : vingt-cinq contrats pris par partie, vingt manqués. Un panneau
    // dont quatre offres sur cinq finissent en échec n'est pas un contenu,
    // c'est une machine à décevoir — et l'on finit par ne plus rien signer.
    //
    // La règle s'inverse : par défaut on prend son temps, la ville attend. Une
    // minorité d'offres presse, l'annonce, et paie nettement plus. Le choix
    // qu'on veut poser au joueur est « est-ce que je cours ? », pas « est-ce
    // que je signe ? ».
    c.urgent = rng.chance(PART_URGENTE);
    if (!c.urgent) {
      c.duree = null;
    } else {
      c.recompense = Math.round(c.recompense * PRIME_URGENCE);
      // Un délai qu'on sait d'avance intenable n'a rien à faire sur le panneau.
      //
      // Chaque type calculait le sien dans son coin, sur des bases différentes,
      // et l'affichage se contentait d'annoncer « l'échéance ne le permet pas ».
      // Proposer un travail impossible et le signaler comme tel, c'est occuper
      // une des cinq places du joueur avec un piège.
      //
      // Le plancher part de ce que le contrat demande *réellement* : l'aller,
      // le retour quand il faut rendre le travail là où on l'a pris, et une
      // marge de vingt-six heures par région — trois à six fois l'allure d'une
      // colonne, de quoi encaisser une embuscade et un détour.
      c.duree = Math.max(c.duree || 0, dureeMinimale(state, col, c));
    }
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
  // Sans durée, pas d'échéance : le contrat attend qu'on le fasse.
  c.echeance = c.duree ? state.temps + c.duree : null;
  state.player.contrats.push(c);
  log({
    type: 'contrat',
    texte: `Contrat accepté : ${c.titre} (${c.recompense} cr).`,
    important: true,
    regionId: col.regionId,
  });
  return { ok: true };
}

/**
 * Peut-on rendre la marchandise d'une livraison, et où ?
 *
 * `c.charge` était posé à l'acceptation et n'était **jamais retiré** : abandonner
 * une livraison coûtait douze d'estime pour vol, y compris debout dans la ville
 * qui vous avait confié le colis, celui-ci intact dans le sac. On punissait un
 * vol qu'aucune action ne permettait d'éviter.
 *
 * Rendre exige d'être là où on l'a pris, avec ce qu'on a pris. C'est la seule
 * lecture qui tienne : le colis appartient à quelqu'un, il ne se dématérialise
 * pas parce qu'on renonce.
 */
export function peutRendre(state, c, groupe) {
  if (c.type !== 'livraison' || !c.charge) return { ok: true, rien: true };
  const col = colonieParId(state.world, c.colonieId);
  const g = groupe || groupeActif(state);
  if (!col || col.ruine) return { ok: true, rien: true, motif: 'Il n’y a plus personne à qui rendre.' };
  if (!g || g.regionId !== col.regionId) {
    return { ok: false, motif: `La marchandise se rend à ${col.nom}, où on vous l’a confiée.` };
  }
  if (Math.floor(g.inventaire[c.ressource] || 0) < c.quantite) {
    return {
      ok: false,
      motif: `Il vous manque ${c.quantite - Math.floor(g.inventaire[c.ressource] || 0)} `
        + `${COMMODITIES[c.ressource].nom.toLowerCase()} pour rendre le colis entier.`,
    };
  }
  return { ok: true };
}

export function abandonner(state, id, log, groupe) {
  const i = state.player.contrats.findIndex((c) => c.id === id);
  if (i < 0) return { ok: false, motif: 'Contrat introuvable.' };
  const c = state.player.contrats[i];
  const g = groupe || groupeActif(state);
  const rendu = peutRendre(state, c, g);
  state.player.contrats.splice(i, 1);
  const repAvant = state.player.reputation[c.faction] || 0;

  if (c.type === 'livraison' && c.charge && rendu.ok && !rendu.rien) {
    // On rend le colis : il quitte le sac, et il ne s'est rien passé.
    g.inventaire[c.ressource] = Math.max(0, (g.inventaire[c.ressource] || 0) - c.quantite);
  } else if (c.type === 'livraison' && c.charge && !rendu.ok) {
    // On garde la marchandise, ça s'appelle du vol : là, l'estime paie. C'est la
    // distinction qui tient tout le reste — on ne juge pas un homme sur un délai
    // manqué, on le juge sur ce qu'il a pris.
    state.player.reputation[c.faction] = Math.max(-100, repAvant - 12);
  }

  const perduAb = (state.player.reputation[c.faction] || 0) - repAvant;
  noterContrat(state, c, perduAb ? 'vole' : 'abandonne', { rep: perduAb });
  log({
    type: 'contrat',
    texte: perduAb
      ? `Contrat rompu : ${c.titre}. Vous gardez le colis — estime ${Math.round(perduAb)}.`
      : `Contrat rendu : ${c.titre}.${c.charge ? ' Le colis est retourné.' : ''}`,
    important: true,
  });
  return { ok: true, rendu: !perduAb };
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

/**
 * Le dossier des contrats : ce qu'on a signé, et comment ça s'est terminé.
 *
 * Les ordres d'une faction avaient leur feuille de service ; le panneau
 * d'affichage n'avait rien. Un contrat échouait, la réputation baissait, et il
 * n'en restait qu'une ligne de journal que quatre cents entrées effacent. On ne
 * pouvait ni savoir combien on en avait manqué, ni ce que ça avait coûté.
 *
 * Quatorze, comme la feuille de service : au-delà on garde les totaux.
 */
export const DOSSIER_MAX = 14;

/**
 * Rendre un contrat avant l'échéance : la sortie honorable.
 *
 * Elle ne coûte rien non plus. `OPINION_ECHU` a existé, valait 14, et n'est
 * plus : voir le commentaire de `tickContrats` sur pourquoi rater ne se punit
 * pas. Le zéro est écrit ici plutôt que supprimé, pour que la question ne se
 * repose pas dans six mois comme si elle n'avait jamais été tranchée.
 */
export const OPINION_ECHU = 0;
export const OPINION_RENDU = 0;

export function noterContrat(state, c, issue, bilan) {
  if (!state.player.dossier) state.player.dossier = [];
  state.player.dossier.push({
    t: state.temps,
    titre: c.titre,
    type: c.type,
    faction: c.faction,
    issue,
    cr: (bilan && bilan.cr) || 0,
    rep: (bilan && bilan.rep) || 0,
  });
  if (state.player.dossier.length > DOSSIER_MAX) state.player.dossier.shift();
  const b = state.player.bilanContrats || { honores: 0, echus: 0, caducs: 0, cr: 0, rep: 0 };
  if (issue === 'honore') b.honores += 1;
  else if (issue === 'echu') b.echus += 1;
  else b.caducs += 1;
  b.cr += (bilan && bilan.cr) || 0;
  b.rep += (bilan && bilan.rep) || 0;
  state.player.bilanContrats = b;
}

function recompenser(state, c, log) {
  const crAvant = soldeIci(state);
  const repAvant = state.player.reputation[c.faction] || 0;
  gagner(state, c.recompense);
  // Un contrat rempli pour les siens compte double : il paie et il fait monter.
  if (estAuService(state, c.faction)) {
    crediter(state, Math.round(c.recompense / 7) + 10, log, 'Contrat honoré pour les vôtres');
  }
  const gagne = gainEstime(state, c);
  state.player.reputation[c.faction] = Math.min(100, repAvant + gagne);
  state.stats.contratsRemplis = (state.stats.contratsRemplis || 0) + 1;
  noterContrat(state, c, 'honore', {
    cr: soldeIci(state) - crAvant,
    rep: (state.player.reputation[c.faction] || 0) - repAvant,
  });
  log({
    type: 'contrat',
    texte: `Contrat rempli : ${c.titre}. ${c.recompense} cr, réputation +${gagne}.`,
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
      noterContrat(state, c, 'caduc');
      log({ type: 'contrat', texte: `Contrat caduc : ${c.titre}. La ville n’existe plus.`, important: true });
      continue;
    }

    // Échéance dépassée
    if (c.echeance && state.temps > c.echeance) {
      // Rater ne coûte **rien**. Ni estime, ni considération locale.
      //
      // C'est une décision de conception, prise après trois versions et deux
      // séries de mesures. La première retirait 6 d'estime : ne rien signer
      // devenait strictement meilleur que d'essayer, puisqu'on ne peut jamais
      // garantir un délai. La deuxième déplaçait la sanction sur le chef qui
      // avait affiché l'offre — plus juste, mais le banc a montré qu'elle ne
      // mordait jamais en jeu réel (0,00 % des jours-ville, un manquement tous
      // les deux cent trente-cinq heures pour un pardon en deux cent
      // cinquante) : elle ne punissait donc que le joueur assez malchanceux
      // pour rater trois fois de suite au même endroit.
      //
      // Une sanction qui ne mord que sur la malchance n'a rien à faire là.
      // Ce que coûte un contrat manqué, c'est la récompense qu'on n'a pas et le
      // voyage qu'on a fait pour rien — c'est déjà cher, et c'est déjà juste.
      // Ce qui reste puni, c'est ce qu'on prend : garder la marchandise d'une
      // livraison abandonnée coûte toujours 12 d'estime.
      //
      // Ce qui empêche d'encombrer le panneau, c'est le nombre de places : cinq
      // contrats en cours, pas un de plus.
      noterContrat(state, c, 'echu', {});
      state.stats.echusParType = state.stats.echusParType || {};
      state.stats.echusParType[c.type] = (state.stats.echusParType[c.type] || 0) + 1;
      state.stats.echusParVille = state.stats.echusParVille || {};
      state.stats.echusParVille[c.colonieId] = (state.stats.echusParVille[c.colonieId] || 0) + 1;
      log({
        type: 'contrat',
        texte: `Contrat échu : ${c.titre}. Le voyage était pour rien, et c’est tout.`,
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
