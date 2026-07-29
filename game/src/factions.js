// Le monde tourne sans le joueur : les factions lèvent des armées, assiègent,
// prennent des colonies, signent des paix. C'est le cœur « vivant » de la sim.

import { FACTIONS, DIPLO_FACTIONS, COMMODITY_KEYS } from './data.js';
import { effondrer } from './economy.js';
import { chemin, colonieParId, distance, voisins } from './world.js';

// ---------------------------------------------------------------------------
// Mesures
// ---------------------------------------------------------------------------

export function puissance(world, key) {
  const f = world.factions[key];
  if (!f) return 0;
  let p = f.tresor / 60;
  for (const cid of f.colonies) {
    const c = colonieParId(world, cid);
    if (!c) continue;
    p += c.pop * 0.06 + c.defense * 0.5 + c.murs * 4;
  }
  for (const a of world.armees) {
    if (a.faction === key) p += a.force * 0.6;
  }
  return Math.round(p);
}

export function enGuerre(world, a, b) {
  if (a === 'essaim' || b === 'essaim') return a !== b;
  return world.guerres.some(
    (g) => (g.a === a && g.b === b) || (g.a === b && g.b === a)
  );
}

export function guerresDe(world, key) {
  return world.guerres.filter((g) => g.a === key || g.b === key);
}

function relation(world, a, b) {
  const f = world.factions[a];
  if (!f) return 0;
  return f.relations[b] ?? 0;
}

function majRelation(world, a, b, delta) {
  const fa = world.factions[a];
  const fb = world.factions[b];
  if (!fa || !fb || a === b) return;
  if (a === 'essaim' || b === 'essaim') return;
  const v = Math.max(-100, Math.min(100, (fa.relations[b] ?? 0) + delta));
  fa.relations[b] = v;
  fb.relations[a] = v;
}

export function declarerGuerre(world, a, b, t, log) {
  if (enGuerre(world, a, b)) return;
  world.guerres.push({ a, b, depuis: t, batailles: 0 });
  majRelation(world, a, b, -60);
  log({
    type: 'guerre',
    texte: `${FACTIONS[a].nom} déclare${FACTIONS[a].pluriel ? 'nt' : ''} la guerre ${FACTIONS[b].datif}.`,
    factions: [a, b],
  });
}

export function signerPaix(world, a, b, t, log) {
  const i = world.guerres.findIndex(
    (g) => (g.a === a && g.b === b) || (g.a === b && g.b === a)
  );
  if (i < 0) return;
  world.guerres.splice(i, 1);
  majRelation(world, a, b, 45);
  log({
    type: 'paix',
    texte: `${FACTIONS[a].nom} et ${FACTIONS[b].nom} signent une trêve.`,
    factions: [a, b],
  });
}

// ---------------------------------------------------------------------------
// Armées
// ---------------------------------------------------------------------------

// Lever des hommes coûte cher : sans ça, les factions passent leur temps à
// s'échanger les mêmes villes et la carte devient du bruit.
function coutArmee(force) {
  return Math.round(force * 5.2);
}

function leverArmee(world, key, force, depuis, cibleId, log) {
  const f = world.factions[key];
  const col = colonieParId(world, cibleId);
  if (!col) return null;
  const route = chemin(world, depuis, col.regionId) || [];
  const a = {
    id: `a${world.prochainArmeeId++}`,
    faction: key,
    regionId: depuis,
    force,
    forceMax: force,
    cible: cibleId,
    route,
    etape: 0,
    progres: 0,
    etat: 'marche',
    ravitaillement: 60 + Math.round(force / 4),
  };
  world.armees.push(a);
  f.tresor -= coutArmee(force);
  log({
    type: 'armee',
    texte: `${FACTIONS[key].nom} lève${FACTIONS[key].pluriel ? 'nt' : ''} une colonne (${force}) en direction de ${col.nom}.`,
    factions: [key],
    regionId: depuis,
  });
  return a;
}

function dissoudre(world, armee) {
  const i = world.armees.indexOf(armee);
  if (i >= 0) world.armees.splice(i, 1);
}

function capturer(world, armee, col, t, log, ctx) {
  const ancien = col.faction;
  const nouveau = armee.faction;
  if (ancien && world.factions[ancien]) {
    const fa = world.factions[ancien];
    fa.colonies = fa.colonies.filter((c) => c !== col.id);
    if (fa.capitale === col.id) fa.capitale = fa.colonies[0] || null;
  }

  if (nouveau === 'essaim') {
    // L'Essaim ne gouverne pas : il saigne la ville et repart.
    col.pop = Math.max(40, Math.round(col.pop * 0.55));
    col.unrest = Math.min(1, col.unrest + 0.4);
    for (const k of COMMODITY_KEYS) col.stock[k] = Math.round((col.stock[k] || 0) * 0.35);
    col.defense = 0;
    col.faction = ancien;
    if (ancien && world.factions[ancien] && !world.factions[ancien].colonies.includes(col.id)) {
      world.factions[ancien].colonies.push(col.id);
    }
    log({
      type: 'raid',
      texte: `L’Essaim saccage ${col.nom}. La ville tient, à peine.`,
      regionId: col.regionId,
      factions: [ancien].filter(Boolean),
    });
  } else {
    col.faction = nouveau;
    world.factions[nouveau].colonies.push(col.id);
    world.regions[col.regionId].controle = nouveau;
    for (const v of voisins(col.regionId)) {
      if (world.regions[v].controle === ancien) world.regions[v].controle = nouveau;
    }
    col.pop = Math.max(50, Math.round(col.pop * 0.82));
    col.unrest = Math.min(1, col.unrest + 0.35);
    col.prises = (col.prises || 0) + 1;
    // Pillage : une partie du stock file dans le trésor du vainqueur
    let butin = 0;
    for (const k of COMMODITY_KEYS) {
      const pris = Math.round((col.stock[k] || 0) * 0.3);
      col.stock[k] -= pris;
      butin += pris;
    }
    world.factions[nouveau].tresor += Math.round(butin * 1.6);
    col.defense = Math.round(col.defenseMax * 0.25);
    log({
      type: 'capture',
      texte: `${FACTIONS[nouveau].nom} s’empare${FACTIONS[nouveau].pluriel ? 'nt' : ''} de ${col.nom}${ancien ? ` (${FACTIONS[ancien].nom})` : ''}.`,
      regionId: col.regionId,
      factions: [nouveau, ancien].filter(Boolean),
    });
    if (ancien) majRelation(world, nouveau, ancien, -25);
  }

  // La colonne fond après la prise : elle devient garnison
  armee.force = Math.round(armee.force * 0.5);
  if (armee.force < 12 || nouveau === 'essaim') dissoudre(world, armee);
  else {
    armee.etat = 'garnison';
    armee.attente = ctx.rng.irange(20, 90);
  }
}

function batailleArmees(world, a, b, t, log, ctx) {
  const rng = ctx.rng;
  const fa = a.force * rng.range(0.75, 1.3);
  const fb = b.force * rng.range(0.75, 1.3);
  const total = fa + fb;
  const pertesA = Math.round(a.force * (fb / total) * rng.range(0.55, 1.05));
  const pertesB = Math.round(b.force * (fa / total) * rng.range(0.55, 1.05));
  a.force = Math.max(0, a.force - pertesA);
  b.force = Math.max(0, b.force - pertesB);
  const g = world.guerres.find(
    (w) => (w.a === a.faction && w.b === b.faction) || (w.a === b.faction && w.b === a.faction)
  );
  if (g) g.batailles++;
  log({
    type: 'bataille',
    texte: `Choc de colonnes : ${FACTIONS[a.faction].nom} (−${pertesA}) contre ${FACTIONS[b.faction].nom} (−${pertesB}).`,
    regionId: a.regionId,
    factions: [a.faction, b.faction],
  });
  for (const armee of [a, b]) {
    if (armee.force <= 8) {
      log({
        type: 'armee',
        texte: `La colonne ${FACTIONS[armee.faction].genitif} est anéantie.`,
        regionId: armee.regionId,
        factions: [armee.faction],
      });
      dissoudre(world, armee);
    }
  }
}

function tickArmee(world, armee, t, log, ctx) {
  const rng = ctx.rng;

  // Ravitaillement : une colonne loin de chez elle finit par se déliter
  armee.ravitaillement -= 1;
  if (armee.ravitaillement <= 0) {
    armee.force -= Math.max(1, Math.round(armee.force * 0.02));
    if (armee.force <= 8) {
      log({
        type: 'armee',
        texte: `La colonne ${FACTIONS[armee.faction].genitif} se disperse, faute de vivres.`,
        regionId: armee.regionId,
        factions: [armee.faction],
      });
      dissoudre(world, armee);
      return;
    }
  }

  if (armee.etat === 'garnison') {
    armee.attente -= 1;
    const col = colonieParId(world, armee.cible);
    if (col) col.defense = Math.min(col.defenseMax, col.defense + armee.force * 0.05);
    if (armee.attente <= 0) dissoudre(world, armee);
    return;
  }

  if (armee.etat === 'marche') {
    const cible = colonieParId(world, armee.cible);
    if (!cible) { dissoudre(world, armee); return; }
    // La cible a changé de mains entre-temps : on rentre
    if (cible.faction === armee.faction) {
      log({
        type: 'armee',
        texte: `La colonne ${FACTIONS[armee.faction].genitif} rebrousse chemin : ${cible.nom} est déjà tombée.`,
        regionId: armee.regionId,
        factions: [armee.faction],
      });
      dissoudre(world, armee);
      return;
    }
    if (!armee.route.length || armee.etape >= armee.route.length) {
      armee.etat = 'siege';
      armee.regionId = cible.regionId;
      log({
        type: 'siege',
        texte: `${FACTIONS[armee.faction].nom} met${FACTIONS[armee.faction].pluriel ? 'tent' : ''} le siège devant ${cible.nom}.`,
        regionId: cible.regionId,
        factions: [armee.faction, cible.faction].filter(Boolean),
      });
      return;
    }
    const prochaine = armee.route[armee.etape];
    armee.progres += 1;
    const cout = Math.max(2, Math.round(2 + (world.regions[prochaine] ? 1 : 0)));
    if (armee.progres >= cout) {
      armee.progres = 0;
      armee.regionId = prochaine;
      armee.etape++;
      // Rencontre avec une colonne ennemie sur la même case
      const autre = world.armees.find(
        (o) => o !== armee && o.regionId === armee.regionId && o.faction !== armee.faction
          && enGuerre(world, o.faction, armee.faction)
      );
      if (autre) batailleArmees(world, armee, autre, t, log, ctx);
    }
    return;
  }

  if (armee.etat === 'siege') {
    const col = colonieParId(world, armee.cible);
    if (!col) { dissoudre(world, armee); return; }
    if (col.faction === armee.faction) { dissoudre(world, armee); return; }

    const assaut = armee.force * rng.range(0.5, 1.1);
    const tenue = col.defense * rng.range(0.6, 1.15) + col.murs * 2;
    if (assaut > tenue) {
      col.defense = Math.max(0, col.defense - assaut * 0.12);
      armee.force -= Math.max(0, Math.round(tenue * 0.02));
    } else {
      col.defense = Math.max(0, col.defense - assaut * 0.05);
      armee.force -= Math.max(1, Math.round(tenue * 0.035));
    }
    col.unrest = Math.min(1, col.unrest + 0.004);

    if (armee.force <= 8) {
      log({
        type: 'siege',
        texte: `Le siège de ${col.nom} est brisé : ${FACTIONS[armee.faction].nom} recule${FACTIONS[armee.faction].pluriel ? 'nt' : ''}.`,
        regionId: col.regionId,
        factions: [armee.faction, col.faction].filter(Boolean),
      });
      if (col.faction && armee.faction !== 'essaim') majRelation(world, armee.faction, col.faction, -8);
      dissoudre(world, armee);
      return;
    }
    if (col.defense <= 1) {
      capturer(world, armee, col, t, log, ctx);
    }
  }
}

// ---------------------------------------------------------------------------
// Conseil : décisions périodiques d'une faction
// ---------------------------------------------------------------------------

function coloniesDe(world, key) {
  return world.factions[key].colonies
    .map((id) => colonieParId(world, id))
    .filter((c) => c && !c.ruine);
}

function cibleLaPlusProche(world, key, ennemi) {
  const miennes = coloniesDe(world, key);
  const leurs = coloniesDe(world, ennemi);
  let best = null;
  let bestD = Infinity;
  let depuis = null;
  for (const m of miennes) {
    for (const l of leurs) {
      const d = distance(m.regionId, l.regionId);
      if (d < bestD) { bestD = d; best = l; depuis = m; }
    }
  }
  return best ? { cible: best, depuis, dist: bestD } : null;
}

function conseil(world, key, t, log, ctx) {
  const rng = ctx.rng;
  const f = world.factions[key];
  const mesColonies = coloniesDe(world, key);

  if (key === 'essaim') {
    // L'Essaim n'a pas de politique : il déferle.
    f.prochainConseil = rng.irange(40, 130);
    const toutes = world.colonies.filter((c) => c.faction && c.faction !== 'essaim');
    if (!toutes.length) return;
    const cible = rng.pick(toutes);
    const sauvages = world.regions.filter((r) => !r.colonie && !r.controle);
    const depuis = sauvages.length ? rng.pick(sauvages).i : rng.pick(world.regions).i;
    const force = rng.irange(30, 70) + Math.floor(t / 400);
    const a = leverArmee(world, 'essaim', force, depuis, cible.id, log);
    if (a) f.tresor = 0;
    return;
  }

  if (!mesColonies.length) {
    // Faction éteinte : elle ne délibère plus.
    f.prochainConseil = 400;
    return;
  }

  f.prochainConseil = rng.irange(30, 90);

  // Revenus : impôt sur les colonies
  const revenu = mesColonies.reduce((s, c) => s + c.pop * 0.05 * (1 - c.unrest), 0);
  f.tresor += Math.round(revenu);

  const maPuissance = puissance(world, key);
  const mesGuerres = guerresDe(world, key);

  // 1) Faire la paix si la guerre coûte trop cher
  for (const g of mesGuerres) {
    const autre = g.a === key ? g.b : g.a;
    const duree = t - g.depuis;
    const leur = puissance(world, autre);
    const fatigue = duree / 900 + g.batailles * 0.08;
    if (duree > 220 && rng.chance(Math.min(0.7, fatigue * 0.35 + (leur > maPuissance * 1.4 ? 0.25 : 0)))) {
      signerPaix(world, key, autre, t, log);
    }
  }

  // 2) Déclarer une guerre si une cible est faible et mal aimée
  const enGuerreAvec = new Set(guerresDe(world, key).map((g) => (g.a === key ? g.b : g.a)));
  if (enGuerreAvec.size < 2 && rng.chance(f.agression * 0.5)) {
    const candidats = DIPLO_FACTIONS.filter(
      (k) => k !== key && !enGuerreAvec.has(k) && coloniesDe(world, k).length > 0
    ).map((k) => {
      const rel = relation(world, key, k);
      const rapport = maPuissance / Math.max(1, puissance(world, k));
      const prox = cibleLaPlusProche(world, key, k);
      if (!prox) return [k, 0];
      const poids = Math.max(0, (40 - rel) / 40) * Math.max(0, rapport - 0.85) * (1 / (1 + prox.dist * 0.25));
      return [k, poids];
    }).filter((e) => e[1] > 0.02);
    if (candidats.length) {
      const victime = rng.weighted(candidats);
      declarerGuerre(world, key, victime, t, log);
    }
  }

  // 3) Lever des colonnes sur les fronts ouverts
  for (const g of guerresDe(world, key)) {
    const ennemi = g.a === key ? g.b : g.a;
    const dejaEnRoute = world.armees.filter((a) => a.faction === key).length;
    if (dejaEnRoute >= 2) break;
    const prox = cibleLaPlusProche(world, key, ennemi);
    if (!prox) continue;
    const force = Math.min(
      Math.floor(f.tresor / 5.2),
      Math.round(prox.cible.defense * rng.range(1.1, 2.0) + 25)
    );
    if (force >= 25 && f.tresor >= coutArmee(force)) {
      leverArmee(world, key, force, prox.depuis.regionId, prox.cible.id, log);
    }
  }

  // 4) Fonder : une faction riche et en paix pousse un nouveau poste sur une
  //    case vide de son voisinage. La carte bouge autrement que par conquête.
  const enPaix = !guerresDe(world, key).length;
  if (mesColonies.length < 7 && rng.chance(0.4)
      && f.tresor > (enPaix ? 1700 : 4200)) {
    // Une case libre, à portée de nos terres mais assez loin des villes
    // existantes pour ne pas se marcher dessus. Chercher parmi les seules
    // cases adjacentes était contradictoire : elles sont toutes à distance 1
    // d'une colonie, donc aucune ne passait jamais le filtre d'espacement.
    const candidates = [];
    for (const r of world.regions) {
      if (r.colonie || r.biome === 'relais') continue;
      const tropPres = world.colonies.some((c) => !c.ruine && distance(c.regionId, r.i) < 2);
      if (tropPres) continue;
      const aPortee = mesColonies.some((c) => distance(c.regionId, r.i) <= 3);
      if (aPortee) candidates.push(r);
    }
    if (candidates.length) {
      const r = rng.pick(candidates);
      const col = fonderColonie(world, key, r, rng, t);
      f.tresor -= 1500;
      log({
        type: 'fondation',
        texte: `${FACTIONS[key].nom} fonde ${col.nom} en terrain vierge.`,
        regionId: r.i,
        factions: [key],
        important: true,
      });
      return;
    }
  }

  // 5) Sinon, investir : murs et défense
  if (!guerresDe(world, key).length && f.tresor > 900 && rng.chance(0.6)) {
    const col = rng.pick(mesColonies);
    col.murs += 1;
    f.tresor -= 400;
    log({
      type: 'chantier',
      texte: `${FACTIONS[key].nom} renforce${FACTIONS[key].pluriel ? 'nt' : ''} les défenses de ${col.nom}.`,
      regionId: col.regionId,
      factions: [key],
      discret: true,
    });
  }
}

const NOMS_NEUFS = [
  'Aval', 'Bréchant', 'Cendrier', 'Dorne', 'Escarre', 'Fauvel', 'Givre',
  'Houle', 'Ithaque', 'Jonque', 'Klaxon', 'Limaille', 'Meute', 'Norne',
];

/** Crée une colonie neuve pour une faction. Petite, fragile, mais bien réelle. */
export function fonderColonie(world, key, region, rng, t) {
  const stock = {};
  for (const k of COMMODITY_KEYS) stock[k] = rng.irange(10, 60);
  world.prochaineColonieId = (world.prochaineColonieId || world.colonies.length) + 1;
  const col = {
    id: `s${world.prochaineColonieId}`,
    nom: `${rng.pick(['Poste', 'Halte', 'Camp', 'Enclos'])}-${rng.pick(NOMS_NEUFS)}`,
    regionId: region.i,
    faction: key,
    taille: 1,
    pop: rng.irange(90, 170),
    defense: 0,
    defenseMax: 0,
    murs: rng.irange(2, 5),
    stock,
    unrest: 0.1,
    marche: 1.35,
    prises: 0,
    declin: 0,
    fondeeA: t,
  };
  col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);
  col.defense = col.defenseMax;
  world.colonies.push(col);
  world.factions[key].colonies.push(col.id);
  region.colonie = col.id;
  region.controle = key;
  return col;
}

// ---------------------------------------------------------------------------
// Tick global
// ---------------------------------------------------------------------------

export function tickFactions(world, t, log, ctx) {
  for (const key of Object.keys(world.factions)) {
    const f = world.factions[key];
    f.prochainConseil -= 1;
    if (f.prochainConseil <= 0) conseil(world, key, t, log, ctx);
  }

  for (const armee of world.armees.slice()) {
    if (!world.armees.includes(armee)) continue;
    tickArmee(world, armee, t, log, ctx);
  }

  // Dérive lente des relations vers la neutralité, sauf en guerre
  if (t % 24 === 0) {
    for (const a of DIPLO_FACTIONS) {
      for (const b of DIPLO_FACTIONS) {
        if (a >= b) continue;
        const v = relation(world, a, b);
        if (enGuerre(world, a, b)) {
          if (v > -100) majRelation(world, a, b, -1);
        } else if (v !== 0) {
          majRelation(world, a, b, v > 0 ? -0.5 : 0.5);
        }
      }
    }
  }
}

/** Faction qui domine réellement le monde, pour l'écran MONDE. */
export function classement(world) {
  return Object.keys(world.factions)
    .filter((k) => k !== 'essaim')
    .map((k) => ({
      key: k,
      nom: FACTIONS[k].nom,
      couleur: FACTIONS[k].couleur,
      puissance: puissance(world, k),
      colonies: world.factions[k].colonies.length,
      tresor: Math.round(world.factions[k].tresor),
    }))
    .sort((a, b) => b.puissance - a.puissance);
}
