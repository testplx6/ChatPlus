// Orchestration : création de partie, tick horaire, rattrapage du temps passé
// hors ligne. `state.world` est la moitié partagée de l'état (celle qui vivrait
// côté serveur en multijoueur), `state.player` / `state.base` la moitié privée.

import { Rng } from './rng.js';
import { FACTIONS, DIPLO_FACTIONS } from './data.js';
import { genererMonde, decouvrir, colonieParId, nomRegion } from './world.js';
import { makeCharacter, idDepuisRng } from './characters.js';
import { creerBase, tickBase } from './base.js';
import {
  tickColonie, etalDe, effondrer, faireSecession, emploisInitiaux,
} from './economy.js';
import { tickClimat, conditions, saison } from './climat.js';
import { tickCaravanes } from './caravanes.js';
import { tickFactions } from './factions.js';
import { tickSquad } from './squad.js';
import { creerLogger } from './events.js';
import { groupeVide } from './groupes.js';
import { creerConnaissance, observer } from './connaissance.js';
import { pourvoirCharges } from './notables.js';
import { tickFormation } from './formation.js';
import { rafraichirPanneaux, tickContrats } from './contrats.js';
import { tickAllegeance, palierBonus } from './allegeance.js';

/** Durée réelle d'une heure de jeu, à vitesse ×1. */
export const TICK_MS = 10000;
/** Plafond de rattrapage hors ligne, en heures de jeu (environ deux ans). */
export const RATTRAPAGE_MAX = 17000;

export const VITESSES = [1, 4, 16, 60];

/**
 * Tranche d'heures traitée d'un coup pour une colonie. Les colonies avancent
 * par tourniquet plutôt que toutes ensemble à chaque heure : le coût du tick
 * chute d'autant, et l'économie d'une ville n'a pas besoin d'être résolue à
 * l'heure près. Les probabilités sont converties en conséquence — voir `surDt`
 * dans economy.js.
 *
 * Trois, pas quatre : le banc a montré qu'à quatre les stocks des villes
 * fluctuent par paliers assez gros pour que le joueur ne trouve plus toujours de
 * quoi se ravitailler, et la survie tombe de 42 à 31 sur soixante parties. Le
 * gain de performance ne valait pas ça.
 */
export const PAS_COLONIE = 3;
/** On démarre déjà accéléré : à ×1 il ne se passe visiblement rien. */
export const VITESSE_DEFAUT = 4;

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
  const premier = groupeVide(idDepuisRng(rng, 'g'), 'Convoi', depart.regionId, 0);
  const depart2 = [
    { archetype: 'ferrailleur', arme: 'machette', armure: 'cuir' },
    { archetype: 'chasseur', arme: 'clous', armure: 'cuir' },
    { archetype: 'medic', arme: 'barre', armure: 'cuir' },
  ];
  for (const d of depart2) premier.membres.push(makeCharacter(rng, d));
  premier.inventaire.rations = 45;
  premier.inventaire.ferraille = 20;
  premier.inventaire.medkit = 2;
  premier.objets = ['machette', 'cuir'];

  const reputation = {};
  for (const k of DIPLO_FACTIONS) reputation[k] = 0;
  reputation[depart.faction] = 12;

  const state = {
    version: 1,
    seed,
    rngState: rng.save(),
    temps: 0,
    vitesse: VITESSE_DEFAUT,
    dernierReel: opts.maintenant ?? 0,
    nom: opts.nom || 'Convoi sans nom',
    world,
    player: {
      credits: 450,
      // Les gens et ce qu'ils portent vivent dans les groupes ; le reste, ici.
      groupes: [premier],
      groupeActif: premier.id,
      reputation,
      posture: 'neutre',
      politique: {
        recruter: true,
        commercer: true,
        payerPeage: true,
        achever: false,
      },
      contrats: [],
      primes: {},
      allegeance: null,
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
      contratsRemplis: 0,
      sitesFouilles: 0,
      distanceParcourue: 0,
      caravanesPillees: 0,
      ordresRemplis: 0,
    },
    memorial: [],
    // Ce que le joueur sait du monde, par opposition à ce qui est.
    connaissance: creerConnaissance(0),
    fin: null,
  };
  world.caravanes = [];

  // Les métiers des villes se posent une fois les factions attribuées : la
  // vocation d'un bourg tient à son biome autant qu'à qui le tient. Les charges
  // se pourvoient dans la foulée — une ville a un chef et un armurier dès le
  // premier jour, pas au bout de trois heures de jeu.
  for (const col of world.colonies) {
    col.emplois = emploisInitiaux(world, col, rng);
    pourvoirCharges(col, rng, 0);
  }

  decouvrir(world, depart.regionId, 2);
  observer(state);
  tickClimat(world, 0, rng);
  rafraichirPanneaux(state, rng, 0);
  for (const col of world.colonies) etalDe(world, col, rng, 0);
  state.rngState = rng.save();
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

  // Le climat d'abord : tout le reste s'y adosse.
  const changement = tickClimat(state.world, state.temps, rng);
  if (changement) log(changement);
  const climat = conditions(state.world, state.temps);
  ctx.climat = climat;

  // Passage de saison : ça se remarque.
  const sPrec = saison(state.temps - 1);
  if (sPrec.key !== climat.saison.key) {
    log({
      type: 'saison',
      texte: `${climat.saison.def.nom}. ${climat.saison.def.texte}`,
      important: true,
    });
  }

  // Le monde ensuite. Les colonies sont traitées par tourniquet : chacune
  // avance de PAS_COLONIE heures d'un coup, un tiers d'entre elles par heure.
  // C'est 62 % du coût du tick, et rien ne se voit en jeu.
  for (let i = state.temps % PAS_COLONIE; i < state.world.colonies.length; i += PAS_COLONIE) {
    const col = state.world.colonies[i];
    // La réputation locale infléchit ce que les gens d'ici pensent de vous.
    const rep = (col.faction && state.player.reputation[col.faction]) || 0;
    const ev = tickColonie(state.world, col, rng, climat, PAS_COLONIE, rep, log);
    if (!ev) continue;
    if (ev.evenement === 'croissance') {
      log({
        type: 'croissance',
        texte: `${col.nom} s’agrandit : la ville passe au rang ${col.taille}.`,
        regionId: col.regionId,
        important: true,
      });
    } else if (ev.evenement === 'secession') {
      const r = faireSecession(state.world, col);
      log({
        type: 'secession',
        texte: r.renaissance
          ? `${col.nom} se soulève : ${FACTIONS[r.rendue].nom} renaît de ses cendres.`
          : `${col.nom} chasse ${FACTIONS[r.ancienne].nom} et rejoint ${FACTIONS[r.rendue].nom}.`,
        regionId: col.regionId,
        important: true,
      });
    } else if (ev.evenement === 'effondrement') {
      const ancienne = effondrer(state.world, col);
      log({
        type: 'effondrement',
        texte: `${col.nom} est abandonnée${ancienne ? ` par ${FACTIONS[ancienne].nom}` : ''}. Il n’en reste que des ruines.`,
        regionId: col.regionId,
        important: true,
      });
    }
  }
  tickFactions(state.world, state.temps, log, ctx);
  tickCaravanes(state, log, ctx);

  // Panneaux d'affichage et étals se renouvellent de loin en loin.
  if (state.temps % 40 === 0) {
    rafraichirPanneaux(state, rng, state.temps);
    for (const col of state.world.colonies) {
      if (!col.ruine) etalDe(state.world, col, rng, state.temps, palierBonus(state, col.faction));
    }
  }

  // Puis l'avant-poste et l'escouade.
  tickBase(state, log, ctx);
  if (!state.fin) tickSquad(state, log, ctx);
  if (!state.fin) tickContrats(state, log, ctx);
  if (!state.fin) tickAllegeance(state, log, ctx);
  if (!state.fin) tickFormation(state, log);

  // En dernier : on relève ce qu'on a sous les yeux, après que tout a bougé.
  observer(state);

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
 * Ce que le temps réel écoulé nous doit, sans rien appliquer.
 * Retourne { ticks, tronque, pas } — `tronque` si on a tapé le plafond.
 */
export function rattrapageDu(state, maintenantMs) {
  const pas = TICK_MS / (state.vitesse || 1);
  if (!state.dernierReel) return { ticks: 0, tronque: false, pas };
  const ecoule = Math.max(0, maintenantMs - state.dernierReel);
  let ticks = Math.floor(ecoule / pas);
  const tronque = ticks > RATTRAPAGE_MAX;
  if (tronque) ticks = RATTRAPAGE_MAX;
  return { ticks, tronque, pas };
}

/**
 * Rattrapage : applique le temps réel écoulé depuis la dernière session.
 * Retourne { ticks, tronque }.
 */
export function rattraper(state, maintenantMs) {
  if (!state.dernierReel) {
    state.dernierReel = maintenantMs;
    return { ticks: 0, tronque: false };
  }
  const { ticks, tronque, pas } = rattrapageDu(state, maintenantMs);
  const joues = avancer(state, ticks);
  // On garde le reste pour ne pas perdre les fractions d'heure
  state.dernierReel += ticks * pas;
  if (tronque) state.dernierReel = maintenantMs;
  return { ticks: joues, tronque };
}

/**
 * Même rattrapage, mais découpé en tranches que l'appelant fait avancer une par
 * une. Deux ans hors ligne, c'est dix-sept mille heures : les jouer d'un bloc
 * fige l'onglet une seconde ou deux, sur un téléphone bien davantage. Ici
 * l'interface garde la main entre deux tranches et peut afficher où on en est.
 *
 * `state.dernierReel` avance tranche par tranche : si la page est fermée en
 * cours de route, ce qui a déjà été joué n'est pas rejoué au retour.
 */
export function rattrapageEtale(state, maintenantMs, tranche = 200) {
  if (!state.dernierReel) {
    state.dernierReel = maintenantMs;
    return { total: 0, tronque: false, faits: () => 0, pas: () => false };
  }
  const plan = rattrapageDu(state, maintenantMs);
  let faits = 0;
  const finir = () => {
    if (plan.tronque) state.dernierReel = maintenantMs;
  };
  if (plan.ticks === 0) {
    return { total: 0, tronque: plan.tronque, faits: () => 0, pas: () => false };
  }
  return {
    total: plan.ticks,
    tronque: plan.tronque,
    faits: () => faits,
    /** Joue la tranche suivante. Retourne true tant qu'il reste du travail. */
    pas(n = tranche) {
      const voulu = Math.min(Math.max(1, n | 0), plan.ticks - faits);
      const joues = avancer(state, voulu);
      faits += joues;
      state.dernierReel += joues * plan.pas;
      // `joues < voulu` : la partie s'est terminée en route, plus rien à jouer.
      if (faits >= plan.ticks || joues < voulu) {
        finir();
        return false;
      }
      return true;
    },
  };
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
