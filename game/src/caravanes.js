// Caravanes marchandes. Les villes ne vivent pas en vase clos : ce qu'une
// colonie a en trop part chez celle qui en manque, sur des routes qui traversent
// des régions dangereuses. C'est ce qui relie l'économie à la carte — et ce qui
// donne au joueur autre chose à faire que ramasser des cailloux.

import { COMMODITIES, COMMODITY_KEYS, FACTIONS } from './data.js';
import { chemin, colonieParId, colonieDe, nomRegion, distance, damer } from './world.js';
import { groupeActif } from './groupes.js';
import { cibleStock, prixUnitaire, capacitePortage, poidsInventaire } from './economy.js';
import { idDepuisRng } from './characters.js';
import { retenirEnVille } from './services.js';

/** Au-delà, la carte devient un embouteillage illisible. */
export const MAX_CARAVANES = 7;
const HEURES_PAR_CASE = 2;

// ---------------------------------------------------------------------------
// Départ
// ---------------------------------------------------------------------------

/** Ce dont une colonie regorge, au-delà de son confort. */
function surplus(col) {
  const out = [];
  for (const k of COMMODITY_KEYS) {
    const cible = cibleStock(col, k);
    const stock = col.stock[k] || 0;
    if (stock > cible * 1.6 && stock > 25) out.push([k, stock - cible * 1.2]);
  }
  return out;
}

/** Ce qui lui manque cruellement. */
function besoin(col, k) {
  const cible = cibleStock(col, k);
  const stock = col.stock[k] || 0;
  return Math.max(0, cible * 0.8 - stock);
}

function vivante(col) {
  return col && !col.ruine && col.faction;
}

/**
 * Cherche un couple vendeur / acheteur qui a vraiment intérêt à commercer.
 * On ne fabrique pas de trafic pour décorer la carte : s'il n'y a ni surplus
 * ni pénurie, aucune caravane ne part.
 */
export function tenterDepart(state, rng, log) {
  const world = state.world;
  if (world.caravanes.length >= MAX_CARAVANES) return null;

  const vendeurs = world.colonies.filter((c) => vivante(c) && surplus(c).length);
  if (!vendeurs.length) return null;
  const de = rng.pick(vendeurs);
  const dispo = surplus(de);

  let meilleur = null;
  for (const [k, qteDispo] of dispo) {
    for (const vers of world.colonies) {
      if (!vivante(vers) || vers.id === de.id) continue;
      const manque = besoin(vers, k);
      if (manque < 12) continue;
      const d = distance(de.regionId, vers.regionId);
      if (d > 7) continue;
      // Le gain vaut-il le trajet ? Écart de prix contre distance.
      const gain = (prixUnitaire(vers, k) - prixUnitaire(de, k)) * Math.min(qteDispo, manque);
      const score = gain / (1 + d * 0.6);
      if (score > 12 && (!meilleur || score > meilleur.score)) {
        meilleur = { k, de, vers, qte: Math.min(qteDispo, manque), score };
      }
    }
  }
  if (!meilleur) return null;

  const route = chemin(world, de.regionId, meilleur.vers.regionId);
  if (!route || !route.length) return null;

  const qte = Math.max(10, Math.round(meilleur.qte * rng.range(0.5, 0.9)));
  de.stock[meilleur.k] = Math.max(0, (de.stock[meilleur.k] || 0) - qte);

  const car = {
    id: idDepuisRng(rng, 'v'),
    faction: de.faction,
    deId: de.id,
    versId: meilleur.vers.id,
    regionId: de.regionId,
    route,
    etape: 0,
    progres: 0,
    cargaison: { [meilleur.k]: qte },
    // Une caravane riche paie des gardes.
    escorte: Math.round(6 + qte * 0.25 * rng.range(0.7, 1.4)),
    depuis: state.temps,
  };
  world.caravanes.push(car);
  // Départs et arrivées ne sont pas journalisés : il en passe des centaines,
  // et le journal est plafonné — elles chasseraient les guerres et les morts
  // de la mémoire du monde. L'écran Monde les montre en direct.
  return car;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

function retirerCaravane(world, car) {
  const i = world.caravanes.indexOf(car);
  if (i >= 0) world.caravanes.splice(i, 1);
}

export function valeurCargaison(car) {
  let v = 0;
  for (const k of Object.keys(car.cargaison)) {
    v += (car.cargaison[k] || 0) * COMMODITIES[k].prix;
  }
  return Math.round(v);
}

function arriver(world, car, log) {
  const vers = colonieParId(world, car.versId);
  if (vivante(vers)) {
    for (const k of Object.keys(car.cargaison)) {
      vers.stock[k] = (vers.stock[k] || 0) + car.cargaison[k];
    }
    // Le vendeur encaisse : le trésor de sa faction s'en ressent.
    const de = colonieParId(world, car.deId);
    if (de && de.faction && world.factions[de.faction]) {
      world.factions[de.faction].tresor += Math.round(valeurCargaison(car) * 0.35);
    }
  }
  retirerCaravane(world, car);
}

function pillee(world, car, par, log) {
  log({
    type: 'caravane',
    texte: `Une caravane ${FACTIONS[car.faction].genitif} est pillée en ${nomRegion(world, car.regionId)}${par ? ` par ${par}` : ''}.`,
    regionId: car.regionId,
    important: true,
  });
  retirerCaravane(world, car);
}

/** Une heure de route pour toutes les caravanes. */
export function tickCaravanes(state, log, ctx) {
  const rng = ctx.rng;
  const world = state.world;
  if (!world.caravanes) world.caravanes = [];

  for (const car of world.caravanes.slice()) {
    if (!world.caravanes.includes(car)) continue;

    const vers = colonieParId(world, car.versId);
    if (!vivante(vers)) { retirerCaravane(world, car); continue; }

    // Une colonne ennemie sur la case, et la caravane disparaît.
    const armee = world.armees.find(
      (a) => a.regionId === car.regionId && a.faction !== car.faction
    );
    if (armee && rng.chance(0.5)) {
      world.factions[armee.faction].tresor += Math.round(valeurCargaison(car) * 0.5);
      pillee(world, car, FACTIONS[armee.faction].nom, log);
      continue;
    }

    // Les routes ne sont pas sûres : le danger de la région s'applique.
    const r = world.regions[car.regionId];
    const risque = r.danger * 1.6 * (1 - Math.min(0.7, car.escorte / 60));
    if (rng.chance(risque)) {
      if (rng.chance(0.55)) {
        pillee(world, car, 'des pillards', log);
        continue;
      }
      // Attaque repoussée, mais l'escorte fond.
      car.escorte = Math.max(0, car.escorte - rng.irange(2, 8));
    }

    car.progres += 1;
    if (car.progres < HEURES_PAR_CASE) continue;
    car.progres = 0;

    if (car.etape >= car.route.length) { arriver(world, car, log); continue; }
    car.regionId = car.route[car.etape];
    // Le commerce trace les routes mieux que personne : c'est lui qui passe.
    damer(world, car.regionId, 1.6);
    car.etape++;
    if (car.etape >= car.route.length) arriver(world, car, log);
  }

  // Nouveau départ de temps en temps
  if (state.temps % 9 === 0) tenterDepart(state, rng, log);
}

// ---------------------------------------------------------------------------
// Le joueur s'en mêle
// ---------------------------------------------------------------------------

/** Caravanes présentes dans la région du joueur. */
export function caravanesIci(state) {
  const g = groupeActif(state);
  return (state.world.caravanes || []).filter((c) => g && c.regionId === g.regionId);
}

/**
 * Détrousser une caravane. C'est immédiat, et c'est la manière la plus rapide
 * de se faire haïr d'une faction.
 *
 * Ce n'est pas rentable, et le commentaire l'a prétendu longtemps. Mesuré : une
 * caravane porte une trentaine d'unités, quatre cent quarante crédits environ,
 * et l'embuscade coûte vingt-deux points de réputation plus la rancune nommée
 * des deux villes qui l'attendaient. Un bot qui prend tout ce qui croise sa
 * route finit la partie à 3 957 crédits contre 5 246 pour le même bot qui
 * laisse passer.
 *
 * Ce n'est pas un défaut : c'est une occasion, pas un métier. Ce qui l'empêche
 * d'être un métier n'est pas le prix mais la géométrie — trois cent quatre-vingts
 * caravanes circulent par partie, et il n'en passe que onze heures-caravane sur
 * une case donnée en quatre mille heures, y compris sur la ville la mieux
 * reliée. On ne peut pas non plus les suivre : elles franchissent une région en
 * deux heures là où une colonne en met quatorze.
 */
export function attaquerCaravane(state, car, rng, log, combatContre, genererBande, groupe) {
  if (!state.world.caravanes.includes(car)) {
    return { ok: false, motif: 'La caravane est déjà loin.' };
  }
  const g = groupe || groupeActif(state);
  const escorteTaille = Math.max(1, Math.min(6, Math.round(car.escorte / 9)));
  const bande = genererBande(rng, car.faction, escorteTaille, Math.min(2, Math.floor(state.temps / 2500)));
  bande.nom = `Escorte ${FACTIONS[car.faction].genitif}`;

  log({
    type: 'caravane',
    texte: `Embuscade sur une caravane ${FACTIONS[car.faction].genitif}.`,
    important: true,
    regionId: car.regionId,
  });

  const res = combatContre(state, bande, log, { rng });
  if (res.vainqueur !== 'A') {
    return { ok: true, gagne: false, motif: 'L’escorte a tenu.' };
  }

  // Le butin, puis l'addition : la faction n'oubliera pas.
  //
  // On charge la marchandise ici, dans le sac de ceux qui viennent de se battre.
  // Elle ne l'était nulle part : cette fonction se contentait de retourner
  // `pris` à l'appelant, `main.js` relayait l'objet et l'interface affichait
  // « Caravane détroussée » avant de le jeter. On gagnait l'embuscade, on
  // encaissait les vingt-deux points de réputation et la rancune nommée des deux
  // villes concernées — et l'on repartait les mains vides. Le pillage entier
  // était une perte sèche, sans qu'aucun compteur ne le dise.
  //
  // Ce qu'on ne peut pas porter reste sur place : une colonne ne remporte pas
  // cent unités d'alliage à dos d'homme, et c'est ce qui donne son prix à
  // l'attelage.
  const pris = {};
  let laisse = 0;
  const capacite = capacitePortage(state, g);
  for (const k of Object.keys(car.cargaison)) {
    const veut = car.cargaison[k] || 0;
    if (veut <= 0) continue;
    const libre = capacite - poidsInventaire(g.inventaire);
    const poidsU = COMMODITIES[k].poids;
    const max = poidsU > 0 ? Math.floor(libre / poidsU) : veut;
    const q = Math.max(0, Math.min(veut, max));
    if (q > 0) {
      g.inventaire[k] = (g.inventaire[k] || 0) + q;
      pris[k] = q;
    }
    laisse += veut - q;
  }
  retirerCaravane(state.world, car);

  const rep = state.player.reputation;
  if (car.faction && car.faction !== 'essaim') {
    rep[car.faction] = Math.max(-100, (rep[car.faction] || 0) - 22);
    // Une caravane qui n'arrive pas, ce sont des gens qui l'attendaient. Ceux
    // des deux bouts s'en souviennent nommément, pas seulement la faction.
    for (const id of [car.deId, car.versId]) {
      const col = id && state.world.colonies.find((c) => c.id === id);
      if (col) retenirEnVille(col, 'pillage', state.temps, -18);
    }
  }
  state.stats.caravanesPillees = (state.stats.caravanesPillees || 0) + 1;
  if (log) {
    const dit = Object.keys(pris).map(
      (k) => `${pris[k]} ${COMMODITIES[k].nom.toLowerCase()}`).join(', ');
    log({
      type: 'caravane',
      texte: dit
        ? `Caravane détroussée : ${dit}${laisse > 0 ? ` — ${laisse} unités laissées sur place, faute de bras` : ''}.`
        : 'Caravane détroussée, mais les sacs sont pleins : tout reste sur place.',
      important: true,
      regionId: car.regionId,
    });
  }
  return { ok: true, gagne: true, pris, laisse };
}
