// Génération du monde et navigation.
// Tout ce qui est ici appartient à `state.world` : c'est la moitié « partagée »
// de l'état, celle qui vivrait côté serveur dans une future version multijoueur.

import {
  BIOMES, BIOME_KEYS, FACTIONS, DIPLO_FACTIONS, VILLE_A, VILLE_B, COMMODITY_KEYS,
  POI, POI_KEYS,
} from './data.js';

export const LARGEUR = 10;
export const HAUTEUR = 8;

export function idx(x, y) {
  return y * LARGEUR + x;
}

export function coord(i) {
  return { x: i % LARGEUR, y: Math.floor(i / LARGEUR) };
}

export function voisins(i) {
  const { x, y } = coord(i);
  const out = [];
  if (x > 0) out.push(idx(x - 1, y));
  if (x < LARGEUR - 1) out.push(idx(x + 1, y));
  if (y > 0) out.push(idx(x, y - 1));
  if (y < HAUTEUR - 1) out.push(idx(x, y + 1));
  return out;
}

export function distance(a, b) {
  const ca = coord(a);
  const cb = coord(b);
  return Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y);
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

function genererBiomes(rng) {
  // Voronoï bruité : quelques noyaux par biome, chaque case prend le plus proche.
  const noyaux = [];
  const pool = BIOME_KEYS.filter((b) => b !== 'relais');
  for (const b of pool) {
    const n = b === 'steppe' ? 3 : rng.irange(1, 2);
    for (let k = 0; k < n; k++) {
      noyaux.push({ b, x: rng.range(0, LARGEUR), y: rng.range(0, HAUTEUR) });
    }
  }
  const regions = [];
  for (let y = 0; y < HAUTEUR; y++) {
    for (let x = 0; x < LARGEUR; x++) {
      let best = null;
      let bestD = Infinity;
      for (const n of noyaux) {
        const d = (n.x - x - 0.5) ** 2 + (n.y - y - 0.5) ** 2 + rng.range(0, 2.2);
        if (d < bestD) { bestD = d; best = n.b; }
      }
      regions.push({
        i: idx(x, y),
        x,
        y,
        biome: best,
        richesse: Number(rng.range(0.65, 1.45).toFixed(2)),
        danger: Number((BIOMES[best].danger * rng.range(0.7, 1.35)).toFixed(3)),
        colonie: null,
        controle: null,
        decouvert: false,
        fouille: 0, // épuisement local par la fouille répétée
      });
    }
  }
  // Un unique Relais Orbital, loin du centre : le point chaud du monde.
  const candidats = regions.filter((r) => r.x <= 1 || r.x >= LARGEUR - 2 || r.y === 0 || r.y === HAUTEUR - 1);
  const relais = rng.pick(candidats);
  relais.biome = 'relais';
  relais.richesse = 1.6;
  relais.danger = BIOMES.relais.danger;
  return regions;
}

function nomVille(rng, pris) {
  for (let essai = 0; essai < 60; essai++) {
    const n = `${rng.pick(VILLE_A)}-${rng.pick(VILLE_B)}`;
    if (!pris.has(n)) { pris.add(n); return n; }
  }
  return `Poste-${pris.size + 1}`;
}

function stockInitial(rng, taille) {
  const s = {};
  for (const k of COMMODITY_KEYS) s[k] = 0;
  s.ferraille = rng.irange(60, 200) * taille;
  s.minerai = rng.irange(30, 120) * taille;
  s.polymere = rng.irange(30, 110) * taille;
  s.biomasse = rng.irange(40, 140) * taille;
  s.rations = rng.irange(50, 160) * taille;
  s.alliage = rng.irange(10, 45) * taille;
  s.carburant = rng.irange(15, 60) * taille;
  s.isotope = rng.irange(4, 25) * taille;
  s.composant = rng.irange(5, 30) * taille;
  s.medkit = rng.irange(2, 12) * taille;
  return s;
}

function genererColonies(rng, regions) {
  const colonies = [];
  const pris = new Set();
  const occupees = new Set();
  const cases = rng.shuffle(regions.map((r) => r.i));

  const cible = 16;
  for (const i of cases) {
    if (colonies.length >= cible) break;
    // Espacement minimal pour que la carte respire
    let tropProche = false;
    for (const c of colonies) {
      if (distance(c.regionId, i) < 2) { tropProche = true; break; }
    }
    if (tropProche || occupees.has(i)) continue;
    const r = regions[i];
    if (r.biome === 'relais') continue;

    const taille = rng.weighted([[1, 5], [2, 3], [3, 1.4]]);
    const col = {
      id: `s${colonies.length + 1}`,
      nom: nomVille(rng, pris),
      regionId: i,
      faction: null,
      taille,
      pop: taille * rng.irange(120, 260),
      defense: 0,
      defenseMax: 0,
      murs: taille * rng.irange(2, 5),
      stock: stockInitial(rng, taille),
      unrest: Number(rng.range(0, 0.2).toFixed(2)),
      // Qui travaille à quoi. Rempli une fois la faction attribuée.
      emplois: null,
      marche: 1 + taille * 0.35,
      prises: 0,
    };
    col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);
    col.defense = Math.round(col.defenseMax * rng.range(0.6, 1));
    colonies.push(col);
    occupees.add(i);
    r.colonie = col.id;
  }
  return colonies;
}

function attribuerFactions(rng, regions, colonies) {
  const factions = {};
  for (const k of DIPLO_FACTIONS) {
    factions[k] = {
      key: k,
      nom: FACTIONS[k].nom,
      tresor: rng.irange(1200, 4200),
      agression: Number((FACTIONS[k].agression * rng.range(0.85, 1.15)).toFixed(2)),
      relations: {},
      colonies: [],
      capitale: null,
      humeur: 0,
      prochainConseil: rng.irange(6, 40),
    };
  }
  factions.essaim = {
    key: 'essaim',
    nom: FACTIONS.essaim.nom,
    tresor: 0,
    agression: 0.95,
    relations: {},
    colonies: [],
    capitale: null,
    humeur: 0,
    prochainConseil: rng.irange(12, 60),
  };

  // Relations initiales, symétriques (−100 guerre ouverte, +100 alliance)
  for (const a of DIPLO_FACTIONS) {
    for (const b of DIPLO_FACTIONS) {
      if (a === b) continue;
      if (factions[a].relations[b] !== undefined) continue;
      const v = Math.round(rng.gauss(5, 26));
      factions[a].relations[b] = v;
      factions[b].relations[a] = v;
    }
    factions[a].relations.essaim = -100;
    factions.essaim.relations[a] = -100;
  }

  // Chaque colonie va à la faction dont le biome de prédilection correspond
  const libres = rng.shuffle(colonies.slice());
  for (const col of libres) {
    const biome = regions[col.regionId].biome;
    const scores = DIPLO_FACTIONS.map((k) => {
      const aff = FACTIONS[k].biomes.includes(biome) ? 3 : 0.6;
      const charge = factions[k].colonies.length;
      return [k, Math.max(0.15, aff / (1 + charge * 0.55))];
    });
    const k = rng.weighted(scores);
    col.faction = k;
    // Une ville se souvient de sa maison mère : c'est ce qui rend possible une
    // sécession, et donc le retour d'une faction qu'on croyait éteinte.
    col.factionOrigine = k;
    factions[k].colonies.push(col.id);
    regions[col.regionId].controle = k;
  }

  // Capitale = plus grande colonie de la faction
  for (const k of DIPLO_FACTIONS) {
    const f = factions[k];
    if (!f.colonies.length) continue;
    let best = null;
    for (const cid of f.colonies) {
      const c = colonies.find((x) => x.id === cid);
      if (!best || c.taille > best.taille) best = c;
    }
    f.capitale = best.id;
    best.taille = Math.max(best.taille, 2);
    best.murs += 4;
    best.defenseMax = Math.round(best.pop * 0.09 + best.murs * 12);
    best.defense = best.defenseMax;
  }

  // Zones de contrôle : le territoire rayonne autour des colonies
  for (const col of colonies) {
    for (const v of voisins(col.regionId)) {
      if (regions[v].controle == null && rng.chance(0.7)) regions[v].controle = col.faction;
    }
  }
  return factions;
}

/**
 * Sème des sites à fouiller sur les régions vides. C'est ce qui donne une
 * raison d'aller voir ailleurs plutôt que de camper sur une seule case.
 */
function semerSites(rng, regions) {
  const vides = rng.shuffle(regions.filter((r) => !r.colonie));
  const combien = Math.min(vides.length, 22);
  for (let i = 0; i < combien; i++) {
    const r = vides[i];
    // Les biomes riches attirent les sites intéressants.
    const type = rng.weighted(POI_KEYS.map((k) => {
      const def = POI[k];
      const affinite = r.biome === 'dalles' && k === 'ruine' ? 3
        : r.biome === 'relais' && k === 'station' ? 4
          : r.biome === 'friche' && k === 'bunker' ? 3
            : r.biome === 'plastique' && k === 'convoi' ? 2.5 : 1;
      return [k, affinite * (1 + (1 - def.danger))];
    }));
    r.site = { type, connu: false, fouille: false };
  }
}

export function genererMonde(rng) {
  const regions = genererBiomes(rng);
  const colonies = genererColonies(rng, regions);
  semerSites(rng, regions);
  const factions = attribuerFactions(rng, regions, colonies);
  return {
    largeur: LARGEUR,
    hauteur: HAUTEUR,
    regions,
    colonies,
    factions,
    armees: [],
    guerres: [],
    prochainArmeeId: 1,
  };
}

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

export function region(world, i) {
  return world.regions[i];
}

export function colonieDe(world, regionId) {
  const r = world.regions[regionId];
  if (!r || !r.colonie) return null;
  return world.colonies.find((c) => c.id === r.colonie) || null;
}

export function colonieParId(world, id) {
  return world.colonies.find((c) => c.id === id) || null;
}

export function coutTraversee(world, i, mods = {}) {
  const r = world.regions[i];
  const base = BIOMES[r.biome].cout;
  return Math.max(1, base * (1 - (mods.reductionVoyage || 0)));
}

/** Dijkstra sur la grille. Retourne la liste des régions de `from` (exclu) à `to`. */
export function chemin(world, from, to, mods = {}) {
  if (from === to) return [];
  const n = world.regions.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const vus = new Array(n).fill(false);
  dist[from] = 0;
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!vus[i] && dist[i] < best) { best = dist[i]; u = i; }
    }
    if (u === -1) break;
    if (u === to) break;
    vus[u] = true;
    for (const v of voisins(u)) {
      if (vus[v]) continue;
      const nd = dist[u] + coutTraversee(world, v, mods);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; }
    }
  }
  if (dist[to] === Infinity) return null;
  const path = [];
  let cur = to;
  while (cur !== from && cur !== -1) {
    path.push(cur);
    cur = prev[cur];
  }
  return path.reverse();
}

/** Révèle une région et ses alentours. */
export function decouvrir(world, i, rayon = 1) {
  const { x, y } = coord(i);
  for (let dy = -rayon; dy <= rayon; dy++) {
    for (let dx = -rayon; dx <= rayon; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > rayon) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= LARGEUR || ny >= HAUTEUR) continue;
      world.regions[idx(nx, ny)].decouvert = true;
    }
  }
}

/** Le site d'une région, s'il est connu du joueur. */
export function siteConnu(world, i) {
  const r = world.regions[i];
  return r && r.site && r.site.connu && !r.site.fouille ? r.site : null;
}

export function nomRegion(world, i) {
  const r = world.regions[i];
  const col = colonieDe(world, i);
  if (col) return col.nom;
  return `${BIOMES[r.biome].court} ${String.fromCharCode(65 + r.x)}${r.y + 1}`;
}
