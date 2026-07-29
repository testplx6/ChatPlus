// Journal de bord et rencontres. Tout se résout automatiquement selon la
// posture et les consignes de l'escouade : c'est ce qui permet à la simulation
// de tourner pendant que le joueur est hors ligne.

import { FACTIONS, POSTURES, COMMODITIES, COMMODITY_KEYS, ITEMS, BIOMES } from './data.js';
import { colonieDe, voisins, nomRegion, distance } from './world.js';
import { genererBande, resoudreCombat, butin } from './combat.js';
import {
  comp, gagnerXp, estDebout, estVivant, makeCharacter, blesser, pvTotal,
} from './characters.js';
import { poidsInventaire, capacitePortage } from './economy.js';
import { tailleEscouadeMax } from './base.js';

export const LOG_MAX = 400;

export function creerLogger(state) {
  return (entree) => {
    const e = Object.assign({ t: state.temps }, entree);
    state.journal.push(e);
    if (state.journal.length > LOG_MAX) state.journal.splice(0, state.journal.length - LOG_MAX);
    if (e.important) state.nonLus = (state.nonLus || 0) + 1;
    return e;
  };
}

// ---------------------------------------------------------------------------
// Utilitaires d'inventaire
// ---------------------------------------------------------------------------

export function ajouterAuSac(state, key, qte) {
  if (qte <= 0) return 0;
  const cap = capacitePortage(state);
  const libre = cap - poidsInventaire(state.player.inventaire);
  const poidsU = COMMODITIES[key] ? COMMODITIES[key].poids : 1;
  const max = poidsU > 0 ? Math.floor(libre / poidsU) : qte;
  const reel = Math.max(0, Math.min(Math.floor(qte), max));
  if (reel > 0) state.player.inventaire[key] = (state.player.inventaire[key] || 0) + reel;
  return reel;
}

export function reputation(state, faction, delta) {
  if (!faction || faction === 'essaim') return;
  const r = state.player.reputation;
  r[faction] = Math.max(-100, Math.min(100, (r[faction] || 0) + delta));
}

function factionDominante(state, regionId) {
  const r = state.world.regions[regionId];
  if (r.controle) return r.controle;
  const col = colonieDe(state.world, regionId);
  return col ? col.faction : null;
}

// ---------------------------------------------------------------------------
// Combat impliquant le joueur
// ---------------------------------------------------------------------------

export function combatContre(state, bande, log, ctx) {
  const rng = ctx.rng;
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const squad = state.player.squad.filter(estVivant);
  const combattants = squad.filter((c) => c.etat !== 'mort');

  const res = resoudreCombat(combattants, bande.membres, {
    rng,
    biome: state.world.regions[state.player.regionId].biome,
    posture,
    bonusDegats: (state.base.recherche.balistique || 0) * 0.1,
    bonusArmure: (state.base.recherche.blindage || 0) * 0.1,
    letalA: state.player.politique.achever ? 0.5 : 0.06,
    letalB: bande.letal,
  });

  const lieu = nomRegion(state.world, state.player.regionId);
  let texte;
  if (res.vainqueur === 'A') {
    const b = butin(bande, rng);
    let ramasse = 0;
    for (const k of Object.keys(b.loot)) ramasse += ajouterAuSac(state, k, b.loot[k]);
    state.player.credits += b.credits;
    for (const o of b.objets) {
      if (state.player.objets.length < 30) state.player.objets.push(o);
    }
    reputation(state, bande.faction, -6);
    // Les ennemis d'un ennemi apprécient
    for (const k of Object.keys(state.world.factions)) {
      if (k === bande.faction || k === 'essaim') continue;
      const g = state.world.guerres.some(
        (w) => (w.a === k && w.b === bande.faction) || (w.b === k && w.a === bande.faction)
      );
      if (g) reputation(state, k, 2);
    }
    state.stats.combatsGagnes++;
    texte = `${bande.nom} mis en déroute à ${lieu} — ${ramasse} unités et ${b.credits} cr récupérés.`;
  } else if (res.vainqueur === 'B') {
    texte = perdreCombat(state, bande, log, ctx, lieu);
  } else {
    texte = `Accrochage indécis avec ${bande.nom} à ${lieu}. Chacun décroche.`;
  }

  state.stats.combats++;
  const morts = state.player.squad.filter((c) => c.etat === 'mort' && !c._compte);
  for (const m of morts) {
    m._compte = true;
    log({ type: 'mort', texte: `${m.nom} est mort à ${lieu}.`, important: true });
  }

  log({
    type: 'combat',
    texte,
    important: true,
    regionId: state.player.regionId,
    detail: res.journal.slice(0, 18).map((j) => j.txt),
  });
  return res;
}

function perdreCombat(state, bande, log, ctx, lieu) {
  const rng = ctx.rng;
  state.stats.defaites++;

  if (bande.faction === 'essaim') {
    // L'Essaim ne fait pas de prisonniers
    for (const c of state.player.squad) {
      if (c.etat === 'ko' && rng.chance(0.3)) {
        blesser(c, 40, 'torse', rng, { letal: true });
      }
    }
    return `L’Essaim submerge l’escouade à ${lieu}.`;
  }

  // Dépouillés et abandonnés plus loin : on survit, on repart de rien.
  let perdu = 0;
  for (const k of COMMODITY_KEYS) {
    const q = state.player.inventaire[k] || 0;
    const pris = Math.round(q * rng.range(0.5, 0.85));
    state.player.inventaire[k] = q - pris;
    perdu += pris;
  }
  const cr = Math.round(state.player.credits * rng.range(0.4, 0.8));
  state.player.credits -= cr;
  if (state.player.objets.length && rng.chance(0.6)) {
    state.player.objets.splice(rng.int(state.player.objets.length), 1);
  }
  reputation(state, bande.faction, -3);

  // On se réveille ailleurs, quelques heures plus tard. Dépouillés, pas égorgés :
  // ces gens voulaient le sac, pas les cadavres.
  const options = voisins(state.player.regionId);
  if (options.length) state.player.regionId = rng.pick(options);
  state.player.ordre = { type: 'repos' };
  for (const c of state.player.squad) {
    if (c.etat === 'mort') continue;
    c.sang = Math.min(c.sang, 6);
    if (c.etat === 'ko') c.koHeures = Math.max(c.koHeures, rng.irange(4, 12));
  }
  return `Escouade battue à ${lieu} : ${perdu} unités et ${cr} cr perdus, réveil à ${nomRegion(state.world, state.player.regionId)}.`;
}

// ---------------------------------------------------------------------------
// Table de rencontres
// ---------------------------------------------------------------------------

function bandeLocale(state, ctx) {
  const rng = ctx.rng;
  const regionId = state.player.regionId;
  const dominante = factionDominante(state, regionId);
  const repu = dominante ? (state.player.reputation[dominante] || 0) : 0;

  // Une faction dont on est mal vu envoie ses hommes ; sinon, la faune du coin.
  let faction;
  if (dominante && repu < -25 && rng.chance(0.6)) faction = dominante;
  else {
    faction = rng.weighted([
      ['bandits', 3],
      ['essaim', state.world.regions[regionId].biome === 'plastique' ? 2.2 : 1.1],
      [dominante || 'bandits', dominante ? 1.4 : 0],
    ]);
  }
  // Le monde durcit lentement, mais les bandes restent le plus souvent
  // inférieures en nombre : c'est au joueur de choisir quand ça vaut le coup.
  const niveauMonde = Math.min(2, Math.floor(state.temps / 2500));
  const debout = state.player.squad.filter(estDebout).length || 1;
  const taille = Math.max(1, Math.round(rng.weighted([
    [1, 3], [2, 3], [3, 2], [debout, 1.5], [debout + 1, 0.6],
  ])));
  return genererBande(rng, faction, Math.min(6, taille), niveauMonde);
}

/** Tente une rencontre sur l'heure écoulée. Retourne true si quelque chose est arrivé. */
export function tenterRencontre(state, log, ctx, multiplicateur = 1) {
  const rng = ctx.rng;
  const regionId = state.player.regionId;
  const r = state.world.regions[regionId];
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const col = colonieDe(state.world, regionId);

  // En ville, on est relativement tranquille
  let p = r.danger * multiplicateur * (col ? 0.25 : 1);
  // Furtivité du plus discret de l'escouade
  let furtif = 0;
  const debout = state.player.squad.filter(estDebout);
  if (debout.length) {
    furtif = Math.max(...debout.map((c) => comp(c, 'furtivite')));
  }
  p *= 1 - Math.min(0.55, furtif / 190);
  p *= 1 - posture.evitement * 0.7;
  // Une armée dans le secteur, c'est du monde sur les routes
  const armeesIci = state.world.armees.filter((a) => distance(a.regionId, regionId) <= 1).length;
  p *= 1 + armeesIci * 0.6;

  if (!rng.chance(Math.min(0.5, p))) return false;

  const type = rng.weighted([
    ['hostile', 5],
    ['epave', 2],
    ['errant', 1.1],
    ['caravane', col ? 0.4 : 1.3],
    ['peage', r.controle ? 1.5 : 0.2],
  ]);

  switch (type) {
    case 'hostile': {
      const bande = bandeLocale(state, ctx);
      if (posture.evitement > 0 && rng.chance(posture.evitement * 0.8)) {
        log({ type: 'esquive', texte: `${bande.nom} repéré à temps. Contournement.`, regionId });
        for (const c of debout) gagnerXp(c, 'furtivite', 1.2);
        return true;
      }
      combatContre(state, bande, log, ctx);
      return true;
    }
    case 'epave': {
      const biome = state.world.regions[regionId].biome;
      const table = { dalles: 'composant', friche: 'isotope', plastique: 'polymere', relais: 'composant' };
      const k = table[biome] || rng.pick(['ferraille', 'minerai', 'alliage']);
      const q = rng.irange(3, 14);
      const pris = ajouterAuSac(state, k, q);
      const cr = rng.irange(0, 60);
      state.player.credits += cr;
      for (const c of debout) gagnerXp(c, 'ingenierie', 1.5);
      log({
        type: 'trouvaille',
        texte: `Épave fouillée : ${pris} ${COMMODITIES[k].nom.toLowerCase()}${cr ? ` et ${cr} cr` : ''}.`,
        regionId,
      });
      return true;
    }
    case 'errant': {
      const max = tailleEscouadeMax(state.base);
      const vivants = state.player.squad.filter(estVivant).length;
      const prix = rng.irange(120, 420);
      if (!state.player.politique.recruter || vivants >= max || state.player.credits < prix) {
        log({
          type: 'rencontre',
          texte: `Un errant propose ses services (${prix} cr). Décliné.`,
          regionId,
          discret: true,
        });
        return true;
      }
      const c = makeCharacter(rng, { niveau: rng.irange(0, 1) });
      state.player.credits -= prix;
      state.player.squad.push(c);
      log({
        type: 'recrue',
        texte: `${c.nom} (${c.archetypeNom}) rejoint l’escouade pour ${prix} cr.`,
        regionId,
        important: true,
      });
      return true;
    }
    case 'caravane': {
      if (!state.player.politique.commercer) {
        log({ type: 'rencontre', texte: 'Une caravane passe. On la laisse filer.', regionId, discret: true });
        return true;
      }
      const stock = COMMODITY_KEYS.filter((k) => (state.player.inventaire[k] || 0) > 0);
      if (!stock.length) {
        log({ type: 'rencontre', texte: 'Une caravane passe. Rien à lui vendre.', regionId, discret: true });
        return true;
      }
      const k = rng.pick(stock);
      const q = Math.min(state.player.inventaire[k], rng.irange(3, 25));
      const negoc = debout.length
        ? debout.reduce((a, b) => (comp(a, 'commerce') >= comp(b, 'commerce') ? a : b))
        : null;
      const bonus = negoc ? comp(negoc, 'commerce') / 260 : 0;
      const prix = Math.round(COMMODITIES[k].prix * (1.15 + bonus) * q);
      state.player.inventaire[k] -= q;
      state.player.credits += prix;
      if (negoc) gagnerXp(negoc, 'commerce', 1.4);
      log({
        type: 'commerce',
        texte: `Caravane : ${q} ${COMMODITIES[k].nom.toLowerCase()} vendus pour ${prix} cr.`,
        regionId,
      });
      return true;
    }
    case 'peage': {
      const f = r.controle || 'bandits';
      const taxe = rng.irange(40, 220);
      const agressif = state.player.posture === 'agressif';
      if (!agressif && state.player.credits >= taxe && state.player.politique.payerPeage) {
        state.player.credits -= taxe;
        reputation(state, f, 1);
        log({
          type: 'peage',
          texte: `Péage ${FACTIONS[f] ? FACTIONS[f].nom : 'local'} : ${taxe} cr versés.`,
          regionId,
        });
      } else {
        const bande = genererBande(rng, FACTIONS[f] ? f : 'bandits', rng.irange(2, 4), Math.min(2, Math.floor(state.temps / 900)));
        log({ type: 'peage', texte: `Péage refusé. Ça tourne mal.`, regionId });
        reputation(state, f, -8);
        combatContre(state, bande, log, ctx);
      }
      return true;
    }
    default:
      return false;
  }
}

/**
 * Aléa environnemental du biome (radiations, pluie acide, éboulement…).
 * `exposition` : 1 en plein travail dehors, ~0.3 au repos ou à l'abri.
 */
export function tenterAlea(state, log, ctx, exposition = 1) {
  const rng = ctx.rng;
  const regionId = state.player.regionId;
  const r = state.world.regions[regionId];
  const h = BIOMES[r.biome].hazard;
  if (!h) return false;
  const col = colonieDe(state.world, regionId);
  const abri = col ? 0.25 : 1;
  const protege = state.base.fonde && state.base.regionId === regionId ? 0.3 : 1;
  if (!rng.chance(h.p * exposition * abri * protege)) return false;

  const touches = [];
  for (const c of state.player.squad) {
    if (!estVivant(c)) continue;
    if (!rng.chance(0.7)) continue;
    const armure = c.equip.armure ? (ITEMS[c.equip.armure].armure || 0) : 0;
    const reduc = 1 - Math.min(0.6, armure / 30);
    const d = h.degats * rng.range(0.6, 1.4) * reduc;
    if (d > 0.5) {
      const res = blesser(c, d, rng.pick(['torse', 'tete', 'brasG', 'jambeD']), rng);
      if (res.mort) log({ type: 'mort', texte: `${c.nom} succombe : ${h.nom.toLowerCase()}.`, important: true });
    }
    c.fatigue = Math.min(120, c.fatigue + h.fatigue * rng.range(0.5, 1.2));
    touches.push(c.nom);
  }
  if (!touches.length) return false;
  log({
    type: 'alea',
    texte: `${h.nom} sur ${nomRegion(state.world, regionId)}. ${touches.length} membre(s) touché(s).`,
    regionId,
  });
  return true;
}

/** Résumé lisible d'une entrée de journal (utilisé par l'UI). */
export function couleurLog(type) {
  switch (type) {
    case 'combat': case 'mort': case 'raid': return 'danger';
    case 'capture': case 'guerre': case 'siege': case 'bataille': return 'guerre';
    case 'trouvaille': case 'commerce': case 'recrue': return 'gain';
    case 'base': case 'recherche': case 'chantier': return 'base';
    default: return 'neutre';
  }
}
