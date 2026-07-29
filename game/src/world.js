// Génération du monde et navigation.
// Tout ce qui est ici appartient à `state.world` : c'est la moitié « partagée »
// de l'état, celle qui vivrait côté serveur dans une future version multijoueur.

import {
  BIOMES, BIOME_KEYS, FACTIONS, DIPLO_FACTIONS, VILLE_A, VILLE_B, COMMODITY_KEYS,
  POI, POI_KEYS,
} from './data.js';

// Une carte de 10×8 se traversait de bout en bout en deux jours de jeu : au
// bout d'une saison le joueur avait tout vu, et « explorer » n'était plus qu'un
// mot. 24×18, c'est 432 régions et cinq fois plus de monde — assez pour qu'un
// convoi passe une partie entière sans atteindre le bord opposé.
//
// Ce que ça coûte est réel et traité ailleurs : le tick des colonies passe en
// niveau de détail (voir `pasColonie` dans sim.js), sans quoi cinquante-quatre
// villes tiendraient trois fois le budget d'un tick à elles seules.
export const LARGEUR = 24;
export const HAUTEUR = 18;

/**
 * Combien de villes pour cette surface. La densité ne change pas : une ville
 * pour cinq régions, comme sur l'ancienne carte.
 *
 * Le banc a tranché ce point. À cinquante-quatre villes — une pour huit
 * régions — le monde était non seulement plus grand mais plus vide : chaque
 * ravitaillement devenait une expédition, la part du temps passée en marche
 * montait de 26 à 42 %, et la survie tombait de 22 à 13 sur trente parties.
 * Agrandir la carte ne doit pas vouloir dire écarter ce qu'il y a dessus.
 */
export const NB_COLONIES = 86;

export function idx(x, y) {
  return y * LARGEUR + x;
}

export function coord(i) {
  return { x: i % LARGEUR, y: (i / LARGEUR) | 0 };
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

/**
 * Distance de Manhattan. Écrite sans passer par `coord` : cette fonction est
 * appelée des centaines de fois par tick (niveau de détail des colonies, choix
 * de destinations, portée des armées), et deux objets alloués à chaque appel
 * faisaient à eux seuls travailler le ramasse-miettes.
 */
export function distance(a, b) {
  const ax = a % LARGEUR;
  const ay = (a / LARGEUR) | 0;
  const bx = b % LARGEUR;
  const by = (b / LARGEUR) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

function genererBiomes(rng) {
  // Voronoï bruité : quelques noyaux par biome, chaque case prend le plus proche.
  const noyaux = [];
  const pool = BIOME_KEYS.filter((b) => b !== 'relais');
  // Le nombre de noyaux suit la surface : sinon un biome couvrirait un quart de
  // la carte d'un bloc, et traverser cent régions de steppe n'apprend rien.
  const echelle = (LARGEUR * HAUTEUR) / 80;
  for (const b of pool) {
    const n = Math.round((b === 'steppe' ? 3 : rng.irange(1, 2)) * echelle);
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
  // Les Relais Orbitaux : les points chauds du monde, en marge. Un seul sur une
  // carte de cette taille serait un lieu que la plupart des parties ne
  // verraient jamais.
  const candidats = rng.shuffle(regions.filter(
    (r) => r.x <= 2 || r.x >= LARGEUR - 3 || r.y <= 1 || r.y >= HAUTEUR - 2
  ));
  for (let k = 0; k < 3 && k < candidats.length; k++) {
    const relais = candidats[k];
    relais.biome = 'relais';
    relais.richesse = 1.6;
    relais.danger = BIOMES.relais.danger;
  }
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

  const cible = NB_COLONIES;
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
  // Un site tous les trois ou quatre secteurs vides : assez pour qu'un détour
  // se justifie, pas assez pour qu'on trébuche dessus.
  const combien = Math.min(vides.length, Math.round(vides.length * 0.28));
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

// Index id → colonie. Il ne vit pas dans l'état (qui doit rester du JSON pur) :
// il se reconstruit tout seul dès que le tableau des colonies change d'identité
// ou de longueur, c'est-à-dire au chargement d'une partie et à chaque fondation.
// Avec cinquante-quatre villes, la recherche linéaire coûtait à elle seule un
// dixième du tick.
let indexSource = null;
let indexTaille = -1;
let indexParId = null;

function index(world) {
  if (indexSource !== world.colonies || indexTaille !== world.colonies.length) {
    indexSource = world.colonies;
    indexTaille = world.colonies.length;
    indexParId = new Map();
    for (const c of world.colonies) indexParId.set(c.id, c);
  }
  return indexParId;
}

export function colonieDe(world, regionId) {
  const r = world.regions[regionId];
  if (!r || !r.colonie) return null;
  return index(world).get(r.colonie) || null;
}

export function colonieParId(world, id) {
  return index(world).get(id) || null;
}

export function coutTraversee(world, i, mods = {}) {
  const r = world.regions[i];
  const base = BIOMES[r.biome].cout;
  return Math.max(1, base * (1 - (mods.reductionVoyage || 0)));
}

/**
 * Dijkstra sur la grille, avec un tas binaire. Retourne la liste des régions de
 * `from` (exclu) à `to`.
 *
 * La version à balayage linéaire coûtait n² : acceptable sur quatre-vingts
 * régions, plus du tout sur quatre cent trente-deux, où elle était devenue le
 * deuxième poste du profil derrière le tick des colonies — pour un calcul qui
 * n'a lieu qu'au moment de donner un ordre de route.
 */
export function chemin(world, from, to, mods = {}) {
  if (from === to) return [];
  const n = world.regions.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const vus = new Array(n).fill(false);
  dist[from] = 0;

  // Tas binaire minimal : deux tableaux plats, pas d'objets alloués par nœud.
  const tasN = new Int32Array(n + 1);
  const tasD = new Float64Array(n + 1);
  let taille = 0;
  const pousser = (node, d) => {
    let i = ++taille;
    tasN[i] = node; tasD[i] = d;
    while (i > 1) {
      const p = i >> 1;
      if (tasD[p] <= tasD[i]) break;
      const tn = tasN[p]; const td = tasD[p];
      tasN[p] = tasN[i]; tasD[p] = tasD[i];
      tasN[i] = tn; tasD[i] = td;
      i = p;
    }
  };
  const tirer = () => {
    const top = tasN[1];
    tasN[1] = tasN[taille]; tasD[1] = tasD[taille];
    taille--;
    let i = 1;
    for (;;) {
      const g = i * 2;
      const d = g + 1;
      let m = i;
      if (g <= taille && tasD[g] < tasD[m]) m = g;
      if (d <= taille && tasD[d] < tasD[m]) m = d;
      if (m === i) break;
      const tn = tasN[m]; const td = tasD[m];
      tasN[m] = tasN[i]; tasD[m] = tasD[i];
      tasN[i] = tn; tasD[i] = td;
      i = m;
    }
    return top;
  };

  pousser(from, 0);
  while (taille > 0) {
    const u = tirer();
    if (vus[u]) continue; // doublon laissé par une amélioration ultérieure
    if (u === to) break;
    vus[u] = true;
    for (const v of voisins(u)) {
      if (vus[v]) continue;
      const nd = dist[u] + coutTraversee(world, v, mods);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; pousser(v, nd); }
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
