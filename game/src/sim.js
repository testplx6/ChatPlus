// Orchestration : création de partie, tick horaire, rattrapage du temps passé
// hors ligne. `state.world` est la moitié partagée de l'état (celle qui vivrait
// côté serveur en multijoueur), `state.player` / `state.base` la moitié privée.

import { Rng } from './rng.js';
import { COMMODITY_KEYS, FACTIONS, DIPLO_FACTIONS } from './data.js';
import { genererMonde, decouvrir, colonieParId, nomRegion } from './world.js';
import { makeCharacter } from './characters.js';
import { creerBase, tickBase } from './base.js';
import { tickColonie } from './economy.js';
import { tickFactions } from './factions.js';
import { tickSquad } from './squad.js';
import { creerLogger } from './events.js';

/** Durée réelle d'une heure de jeu, à vitesse ×1. */
export const TICK_MS = 20000;
/** Plafond de rattrapage hors ligne : 48 h réelles à ×1. */
export const RATTRAPAGE_MAX = 8640;

export const VITESSES = [1, 4, 16];

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export function nouvellePartie(seed, opts = {}) {
  const rng = new Rng(seed);
  const world = genererMonde(rng);

  // On démarre chez les Communes Libres si elles existent : le moins hostile.
  let depart = null;
  const libres = world.colonies.filter((c) => c.faction === 'libres');
  if (libres.length) depart = rng.pick(libres);
  else depart = rng.pick(world.colonies);

  // On part équipé : sans armure, la première bande de pillards venue
  // liquide l'escouade avant qu'elle ait appris quoi que ce soit.
  const squad = [];
  const depart2 = [
    { archetype: 'ferrailleur', arme: 'machette', armure: 'cuir' },
    { archetype: 'chasseur', arme: 'clous', armure: 'cuir' },
    { archetype: 'medic', arme: 'barre', armure: 'cuir' },
  ];
  for (const d of depart2) squad.push(makeCharacter(rng, d));

  const inventaire = {};
  for (const k of COMMODITY_KEYS) inventaire[k] = 0;
  inventaire.rations = 45;
  inventaire.ferraille = 20;
  inventaire.medkit = 2;

  const reputation = {};
  for (const k of DIPLO_FACTIONS) reputation[k] = 0;
  reputation[depart.faction] = 12;

  const state = {
    version: 1,
    seed,
    rngState: rng.save(),
    temps: 0,
    vitesse: 1,
    dernierReel: opts.maintenant ?? 0,
    nom: opts.nom || 'Convoi sans nom',
    world,
    player: {
      credits: 450,
      regionId: depart.regionId,
      squad,
      ordre: { type: 'repos' },
      inventaire,
      objets: ['machette', 'cuir'],
      reputation,
      posture: 'neutre',
      politique: {
        recruter: true,
        commercer: true,
        payerPeage: true,
        achever: false,
      },
      recolteHeure: null,
      reste: {},
      nuit: false,
    },
    base: creerBase(),
    journal: [],
    nonLus: 0,
    stats: {
      ticks: 0,
      combats: 0,
      combatsGagnes: 0,
      defaites: 0,
      recolte: 0,
      creditsGagnes: 0,
    },
    fin: null,
  };

  decouvrir(world, depart.regionId, 2);
  const log = creerLogger(state);
  log({
    type: 'debut',
    texte: `Le convoi s’arrête à ${depart.nom}. Trois bouches à nourrir, 450 crédits, et un monde qui ne demande rien à personne.`,
    important: true,
    regionId: depart.regionId,
  });
  return state;
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/** Fait passer une heure de jeu. */
export function tick(state) {
  const rng = new Rng(state.rngState);
  const ctx = { rng };
  const log = creerLogger(state);

  state.temps += 1;
  state.stats.ticks += 1;

  // Le monde d'abord : il tourne que le joueur agisse ou non.
  for (const col of state.world.colonies) tickColonie(state.world, col, rng);
  tickFactions(state.world, state.temps, log, ctx);

  // Puis l'avant-poste et l'escouade.
  tickBase(state, log, ctx);
  if (!state.fin) tickSquad(state, log, ctx);

  state.rngState = rng.save();
  return state;
}

/** Enchaîne `n` heures. Retourne le nombre de ticks réellement joués. */
export function avancer(state, n) {
  let joues = 0;
  for (let i = 0; i < n; i++) {
    if (state.fin) break;
    tick(state);
    joues++;
  }
  return joues;
}

/**
 * Rattrapage : applique le temps réel écoulé depuis la dernière session.
 * Retourne { ticks, tronque } — `tronque` si on a tapé le plafond.
 */
export function rattraper(state, maintenantMs) {
  if (!state.dernierReel) {
    state.dernierReel = maintenantMs;
    return { ticks: 0, tronque: false };
  }
  const ecoule = Math.max(0, maintenantMs - state.dernierReel);
  const pas = TICK_MS / (state.vitesse || 1);
  let ticks = Math.floor(ecoule / pas);
  const tronque = ticks > RATTRAPAGE_MAX;
  if (tronque) ticks = RATTRAPAGE_MAX;
  const joues = avancer(state, ticks);
  // On garde le reste pour ne pas perdre les fractions d'heure
  state.dernierReel = maintenantMs - (ecoule - ticks * pas);
  if (tronque) state.dernierReel = maintenantMs;
  return { ticks: joues, tronque };
}

// ---------------------------------------------------------------------------
// Lecture du temps
// ---------------------------------------------------------------------------

export function horloge(t) {
  const jour = Math.floor(t / 24) + 1;
  const heure = t % 24;
  return { jour, heure, texte: `J${jour} ${String(heure).padStart(2, '0')}:00` };
}

export function resumeMonde(state) {
  const w = state.world;
  return {
    guerres: w.guerres.map((g) => ({
      a: FACTIONS[g.a].nom,
      b: FACTIONS[g.b].nom,
      depuis: g.depuis,
      batailles: g.batailles,
    })),
    armees: w.armees.map((a) => ({
      faction: FACTIONS[a.faction].nom,
      couleur: FACTIONS[a.faction].couleur,
      force: a.force,
      etat: a.etat,
      lieu: nomRegion(w, a.regionId),
      cible: a.cible ? (colonieParId(w, a.cible) || {}).nom : null,
    })),
  };
}
