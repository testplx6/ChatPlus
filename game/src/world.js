// Génération du monde et navigation.
// Tout ce qui est ici appartient à `state.world` : c'est la moitié « partagée »
// de l'état, celle qui vivrait côté serveur dans une future version multijoueur.

import {
  BIOMES, BIOME_KEYS, FACTIONS, DIPLO_FACTIONS, VILLE_A, VILLE_B, COMMODITY_KEYS,
  POI, POI_KEYS, MENAGES, drapeauDe, PASSAGE_A, PASSAGE_B, FAILLE_NOM, TRACE_A,
  VEINE_A, PORTEE_VUE,
} from './data.js';
import { coutSaison } from './climat.js';
import { grainDe, Rng } from './rng.js';

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
        // La Faille (GEOGRAPHIE.md, G1) : le sol qu'on ne traverse qu'à grand
        // prix. Posée à la création, comme tout le reste.
        faille: false,
        // Le nom du passage, quand la case en est un (GEOGRAPHIE.md, G2).
        passage: null,
        // Le nom de ce qui s'est passé là, quand il s'y est passé quelque
        // chose (GEOGRAPHIE.md, G5).
        trace: null,
        // La veine que cette case porte, s'il y en a une (GEOGRAPHIE.md, G4).
        gisement: null,
        // L'ouvrage qui tient la case, s'il y en a un (TERRITOIRE.md, T2).
        poste: null,
        controle: null,
        // Qui occupe la case, et depuis quand (TERRITOIRE.md, A2). Présente à
        // la création plutôt qu'ajoutée par `normaliser`, sinon l'aller-retour
        // JSON cesse d'être exact dès la première partie.
        garde: null,
        decouvert: false,
        fouille: 0, // épuisement local par la fouille répétée
        // Ce que les routes sont devenues faute d'être tenues. Voir secteur.js.
        insecurite: 0,
        // Ce que les passages ont tassé. Voir coutTraversee.
        piste: 0,
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

/**
 * La Faille : ce que coûte de la traverser, et combien d'ouvertures elle a.
 *
 * Le relevé de `GEOGRAPHIE.md` : neuf biomes tous traversables, de coût 3 à 7,
 * et une génération en Voronoï qui ne produit que des taches. Rien
 * n'était un passage obligé, donc tenir une route était toujours contournable,
 * donc jamais décisif. Une ligne — une seule — répare ça : elle sépare, elle
 * se franchit en des points, et elle canalise.
 *
 * `cout` est un coût de terrain, comparable aux 3 à 7 des biomes : à 40, un
 * détour d'une dizaine de cases vaut mieux que de forcer. **Jamais un mur** :
 * une carte coupée en deux morceaux étanches serait deux mondes, et des villes
 * que plus rien ne peut livrer.
 */
export const FAILLE = { cout: 40, passages: 3 };

/** Le ciel qui ne fait rien : le repli quand le monde n'a pas encore sa table. */
const SANS_CIEL = {};
for (const b of BIOME_KEYS) SANS_CIEL[b] = 1;

/**
 * Trace la Faille : une ligne brisée du nord au sud, avec ses ouvertures.
 *
 * Son dé lui est propre (`grainDe(graine, 'faille')`) et ne touche PAS le flux
 * principal : c'est ce qui permet d'ajouter une structure à la carte sans
 * décaler d'un cran tous les tirages qui suivent — les biomes, les villes et
 * les factions d'une graine donnée restent exactement ce qu'ils étaient
 * (piège n°1 de `CLAUDE.md`).
 *
 * Une ville n'est jamais dure : on ne bâtit pas dans un gouffre, et une ville
 * posée là où passe la ligne EST une ouverture — celle que quelqu'un garde.
 */
function tracerFaille(regions, graine) {
  const rng = new Rng(grainDe(graine, 'faille'));
  // Les ouvertures sont retenues et nommées APRÈS, avec leur propre dé. Tirer
  // les noms au fil du tracé consommait des nombres dans le dé de la faille et
  // déplaçait donc la ligne elle-même : le monde changeait, et il s'est trouvé
  // qu'il coûtait six pour cent de tick de plus. Un nom ne doit pas déplacer
  // une montagne (piège n°1 de CLAUDE.md, lu jusqu'au bout).
  // Les ouvertures : des lignes entières où la faille ne passe pas. Tirées
  // d'abord pour qu'elles soient réparties, jamais toutes au même bout.
  const ouvertures = new Set();
  const pas = Math.max(2, Math.floor(HAUTEUR / (FAILLE.passages + 1)));
  for (let k = 1; k <= FAILLE.passages; k++) {
    ouvertures.add(Math.min(HAUTEUR - 1, k * pas + rng.irange(-1, 1)));
  }
  // Le tracé : on part d'une colonne du milieu et l'on serpente vers le sud.
  const ouverts = [];
  let x = rng.irange(Math.floor(LARGEUR * 0.3), Math.floor(LARGEUR * 0.7));
  for (let y = 0; y < HAUTEUR; y++) {
    if (!ouvertures.has(y)) {
      // Ni une ville, ni un Relais : la ligne les CONTOURNE — elle se décale
      // d'une case plutôt que de sauter la ligne. Sautée, elle laissait sept
      // trous sur dix-huit lignes et ne séparait plus rien ; décalée, elle
      // reste une barrière et les villes de son bord en deviennent les
      // gardiennes sans qu'on ait rien à écrire pour ça.
      let ou = -1;
      for (const dx of [0, 1, -1, 2, -2]) {
        const xx = x + dx;
        if (xx < 0 || xx >= LARGEUR) continue;
        const r = regions[idx(xx, y)];
        if (r.colonie == null && r.biome !== 'relais') { ou = xx; break; }
      }
      if (ou >= 0) { regions[idx(ou, y)].faille = true; x = ou; }
    } else {
      // Une ouverture : la case que la ligne aurait prise est le passage, et
      // c'est par là que tout le monde devra passer. Elle a donc un nom.
      const r = regions[idx(x, y)];
      if (r.colonie == null) ouverts.push(r);
    }
    x = Math.max(0, Math.min(LARGEUR - 1, x + rng.irange(-1, 1)));
  }
  // Le baptême, à part : son dé lui est propre, donc aucun nom ne déplace rien.
  const des = new Rng(grainDe(graine, 'lieux'));
  const pris = new Set();
  for (const r of ouverts) {
    let n = '';
    for (let essai = 0; essai < 40 && (!n || pris.has(n)); essai++) {
      n = `${des.pick(PASSAGE_A)} ${des.pick(PASSAGE_B)}`;
    }
    pris.add(n);
    r.passage = n;
  }
  return `${des.pick(FAILLE_NOM)} ${des.pick(PASSAGE_B)}`;
}

function genererColonies(rng, regions, graine) {
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
      // Le hasard de cette ville, à elle seule. Dérivé de son nom, jamais tiré
      // du sac commun : y consommer un nombre décalerait tout ce qui suit.
      // Tant que toutes les villes puisaient au même sac, la maille de leur
      // tick — qui dépend de la distance au joueur — décidait de l'ordre des
      // tirages, et le monde entier divergeait selon le trajet du promeneur.
      rngEtat: grainDe(graine, 'colonie', `s${colonies.length + 1}`),
      // Le registre des gens déjà engagés au banc, pour l'époque en cours. Le
      // banc lui-même n'est pas de l'état : il se dérive de la ville et de
      // l'heure (voir `bancDerive` dans recrues.js). La clé existe dès la
      // création, sinon `normaliser` l'ajoute au rechargement et l'aller-retour
      // JSON n'est plus exact.
      bancPris: null,
      // Les noms que la ville garde en mémoire — voir `pousserAuVivier`.
      vivier: [],
      // Le blocus a-t-il déjà été dit pour cette ville (TERRITOIRE.md, E3) ?
      blocusDit: false,
      // Qui la ville tient enfermé. Voir justice.js.
      geole: null,
      marche: 1 + taille * 0.35,
      // Ce que la ville a en caisse. Une ville n'est pas un entrepôt sans
      // comptes : elle vend, elle achète, et sa faction prélève sur ce qu'elle
      // gagne. Voir CAISSE dans economy.js.
      //
      // Pas un tirage : la population est déjà tirée, et consommer un nombre
      // aléatoire de plus ici décale tous ceux d'après. Le monde entier changeait
      // de forme à graine égale, et huit vérifications assises sur des mondes
      // connus tombaient d'un coup — sans qu'aucune ne parle d'argent.
      caisse: 0,
      prises: 0,
      // Rassasiée à la naissance. Présente dès la création, comme `declin` et
      // pour la même raison : absente, `normaliser` l'ajouterait au
      // rechargement et l'aller-retour JSON d'une partie neuve ne serait plus
      // exact — un invariant déclaré du projet.
      satiete: 1,
      // Un bureau de change (ECONOMIE §5.1 et §7.3). Les grandes places en
      // tiennent un dès le premier jour, les hameaux non — c'est le seuil que
      // §5.2 emploie déjà pour la remise, « on change mieux dans une vraie
      // ville ». Pas un tirage : la taille est déjà tirée.
      change: taille >= 2,
      // Présent dès la naissance, à zéro. Absent, `normaliser` l'ajoutait au
      // rechargement — et l'aller-retour JSON d'une partie neuve n'était donc
      // pas exact, alors que c'est un invariant déclaré du projet. Le défaut
      // était là bien avant les ménages ; c'est le test des ménages qui l'a
      // sorti, parce qu'il vérifiait l'état entier et pas seulement son sujet.
      declin: 0,
      // Ce que la ville doit, et à qui. Voir credit.js — il n'y a ni plafond
      // ni délai : ce qui borne un prêt est le trésor du prêteur et son
      // intérêt, pas un chiffre décrété.
      dette: 0,
      creancier: null,
      cession: null,
      // Ce qu'elle a versé à son pays à la dernière séance. Présent dès la
      // naissance, comme `declin` et `satiete` et pour la même raison :
      // absent, `normaliser` l'ajouterait au rechargement et l'aller-retour
      // JSON d'une partie neuve ne serait plus exact.
      remonte: 0,
    };
    col.caisse = Math.round(col.pop * 1.2);
    col.menages = Math.round(col.pop * MENAGES.parTete);
    col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);
    col.defense = Math.round(col.defenseMax * rng.range(0.6, 1));
    colonies.push(col);
    occupees.add(i);
    r.colonie = col.id;
    // Les abords d'une ville sont tassés depuis longtemps : personne n'a
    // attendu le joueur pour aller et venir. Sans ce socle, le monde commence
    // sans la moindre route et il faut trois cents heures pour en voir une.
    r.piste = 0.55;
    for (const v of voisins(i)) regions[v].piste = Math.max(regions[v].piste, 0.3);
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
      // Ce que ses convois versent en péages, et à qui (TERRITOIRE.md, E2).
      peages: {},
      agression: Number((FACTIONS[k].agression * rng.range(0.85, 1.15)).toFixed(2)),
      relations: {},
      colonies: [],
      capitale: null,
      humeur: 0,
      prochainConseil: rng.irange(6, 40),
      // Peine, esclavage, impôt : ce qu'un Commandeur peut fixer. Voir justice.js.
      lois: null,
    };
  }
  factions.essaim = {
    key: 'essaim',
    nom: FACTIONS.essaim.nom,
    tresor: 0,
    peages: {},
    agression: 0.95,
    relations: {},
    colonies: [],
    capitale: null,
    humeur: 0,
    prochainConseil: rng.irange(12, 60),
    lois: null,
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

export function genererMonde(rng, graine = 0) {
  const regions = genererBiomes(rng);
  const colonies = genererColonies(rng, regions, graine);
  // Après les villes, pour que la ligne les contourne au lieu de les avaler —
  // et avec son propre dé, pour ne décaler aucun tirage de ce qui précède.
  const failleNom = tracerFaille(regions, graine);
  // Les veines, après les villes elles aussi, et avec leur propre dé.
  semerGisements(regions, graine);
  semerSites(rng, regions);
  const factions = attribuerFactions(rng, regions, colonies);
  return {
    // La graine de la partie, gardée : toute dérivation la prend en premier
    // morceau, sinon deux mondes différents partageraient les mêmes dés.
    graine,
    largeur: LARGEUR,
    hauteur: HAUTEUR,
    regions,
    colonies,
    factions,
    // Les identités nées en cours de partie, et elles seules : les sept
    // d'origine vivent dans `data.js` et n'ont pas à peser sur chaque
    // sauvegarde. Voir `drapeauDe()`.
    drapeaux: {},
    armees: [],
    guerres: [],
    // Le nom de la Faille, et de ses passages (GEOGRAPHIE.md, G2).
    failleNom,
    // Les cases qu'on occupe (TERRITOIRE.md, A2). Une liste plutôt qu'un
    // balayage : elles se comptent en dizaines, la carte en milliers.
    gardes: [],
    // La saison courante, pour que le calcul d'itinéraire n'ait pas à la
    // redériver du temps à chaque arête (GEOGRAPHIE.md, G3).
    saisonKey: 'accalmie',
    coutCiel: null,
    heure: 0,
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

/**
 * Combien d'heures une place reste tenue après le dernier assaut reçu.
 *
 * Un siège n'est pas un état qu'on déclare, c'est une présence qu'on
 * entretient : l'assiégeant repose la marque à chaque heure, et elle s'efface
 * d'elle-même quand il s'en va. Personne n'a donc à la retirer — ni la colonne
 * qu'on disperse, ni l'escouade qui change d'ordre, ni une partie rechargée.
 */
export const SIEGE_MARQUE_H = 6;

/**
 * Les manières d'assiéger (IMPLANTATIONS.md, M1c-S3).
 *
 * « C'est un choix multiple pour le joueur, plus réaliste : un siège qui
 * affame le peuple, ou qui coupe les routes commerciales, sera perçu
 * différemment et n'aura pas les mêmes conséquences. C'est une simulation. »
 * (Le propriétaire, août 2026.)
 *
 * La première version imposait une seule règle à tout le monde — toute place
 * assiégée coupée du commerce. Le banc l'a refusée : les factions se livrent
 * des dizaines de sièges en permanence, le monde entier vivait sur ces routes,
 * et une monnaie montait à 547 contre 3,44 au témoin. Ici, **rien ne coupe
 * tant que personne ne le décide** : les colonnes du monde investissent les
 * places comme elles l'ont toujours fait, et ce qui coupe est un acte, avec un
 * auteur et un prix.
 */
export const MANIERES_SIEGE = {
  investir: {
    nom: 'Investir la place',
    desc: 'Tenir les portes et user la garde. Rien d’autre : ni le pain ni le négoce.',
    vivres: false,
    negoce: false,
  },
  affamer: {
    nom: 'Affamer la ville',
    desc: 'Plus un grain n’entre. La garde finit par ne plus tenir — ce sont les '
      + 'habitants qui paient, et ce sont eux qui s’en souviendront.',
    vivres: true,
    negoce: false,
  },
  bloquer: {
    nom: 'Couper les routes',
    desc: 'Le négoce s’arrête. La ville s’appauvrit et son drapeau perd des '
      + 'revenus : la rancune sera celle d’un pays, pas d’un quartier.',
    vivres: false,
    negoce: true,
  },
};

/**
 * Jusqu'à quelle heure une coupure court quelque part dans le monde.
 *
 * Les colonnes du monde assiègent en permanence, mais elles **investissent** :
 * elles ne coupent ni le pain ni les routes. Sans ce repère, chaque départ de
 * convoi interrogeait chaque ville pour une réponse toujours négative — six
 * pour cent du tick du monde, mesuré au banc, pour rien. Posé par qui coupe,
 * et par personne d'autre.
 */
export function aucuneCoupure(world, t) {
  return !((world.coupureJusqua || 0) > t);
}

/** La manière dont une place est tenue en ce moment, s'il y en a une. */
export function maniereSiege(world, col, t) {
  const m = col && col.siege;
  if (!m || t - m.t >= SIEGE_MARQUE_H) return null;
  return MANIERES_SIEGE[m.maniere] ? m.maniere : 'investir';
}

/** Cette place est-elle tenue, de quelque manière que ce soit ? */
export function estAssiegee(world, col, t) {
  return maniereSiege(world, col, t) !== null;
}

/** Les vivres n'entrent plus. */
export function vivresCoupees(world, col, t) {
  const m = maniereSiege(world, col, t);
  return !!(m && MANIERES_SIEGE[m].vivres);
}

/** Le négoce s'est arrêté. */
export function negoceCoupe(world, col, t) {
  const m = maniereSiege(world, col, t);
  return !!(m && MANIERES_SIEGE[m].negoce);
}

/** Ce que la faim fait à une garnison qu'on a coupée de ses vivres. */
export const SIEGE_FAIM = { seuil: 0.6, fonte: 0.012 };

export function colonieParId(world, id) {
  return index(world).get(id) || null;
}

/**
 * Le poste : ce qu'on bâtit sur une route pour la tenir (TERRITOIRE.md, T2).
 *
 * A2 faisait tenir une case au temps passé — un minuteur, sans choix, sans
 * risque et sans adversaire, et que le monde n'a jamais utilisé une seule fois.
 * Ce qu'on tient sur une route, ce n'est pas du temps : c'est un ouvrage. Il
 * coûte à bâtir, il se voit, il se prend, il se perd. C'est ce qui transforme
 * « attendre » en « décider ».
 *
 * `cout` sort du trésor, comme un mur. `trafic` : à partir de quelle piste une
 * case vaut qu'on y bâtisse — un poste au milieu de nulle part ne tient rien
 * que du vide. `portee` : à quelle distance de ses villes un conseil accepte
 * d'aller le poser.
 */
export const POSTE = {
  cout: 900, trafic: 0.45, portee: 5, parVille: 0.5,
  // Le temps qu'on laisse à un ouvrage avant de le juger. Juger un poste neuf
  // sur zéro passage, c'est juger l'heure à laquelle on regarde.
  epreuve: 720,
};

/**
 * Les gisements (GEOGRAPHIE.md, G4).
 *
 * `richesse` était un scalaire tiré une fois pour toutes, de 0,65 à 1,45 :
 * aucune ressource n'était SITUÉE. Il n'y avait pas de veine d'alliage, il y
 * avait des cases un peu plus généreuses que d'autres — et l'on ne se bat pas
 * pour « un peu plus généreux », on se bat pour une veine.
 *
 * `combien` : pour la carte entière. `debit` : ce que la veine ajoute au
 * rendement de sa case, en plus de ce que le biome donne déjà.
 */
export const GISEMENTS = { combien: 14, debit: [0.6, 1.8] };

/** Les cases qui portent une veine. */
export function gisementsDe(world) {
  return world.regions.filter((r) => r.gisement);
}

/**
 * Sème les veines. Dé propre, comme la Faille : rien de ce qui précède ne
 * bouge. Elles évitent les villes et la Faille — on ne pose pas une mine sous
 * une place ni dans un gouffre — et elles prennent le nom de ce qu'elles
 * donnent, parce qu'un gisement est un endroit et pas une statistique.
 */
function semerGisements(regions, graine) {
  const rng = new Rng(grainDe(graine, 'gisements'));
  const riches = ['alliage', 'carburant', 'isotope', 'composant', 'minerai', 'medkit'];
  const libres = regions.filter((r) => r.colonie == null && !r.faille && r.biome !== 'relais');
  const choisies = rng.shuffle(libres.map((r) => r.i)).slice(0, GISEMENTS.combien);
  for (const i of choisies) {
    const r = regions[i];
    const key = rng.pick(riches);
    const debit = Number(rng.range(GISEMENTS.debit[0], GISEMENTS.debit[1]).toFixed(2));
    r.gisement = { key, debit, connu: false };
    r.trace = `${rng.pick(VEINE_A)} ${rng.pick(PASSAGE_B)}`;
  }
}

/**
 * Ce que la carte sait garder (GEOGRAPHIE.md, G5).
 *
 * L'amorce existait — une ville morte laisse un site à fouiller, une embuscade
 * laisse du danger — mais une bataille rangée, un poste rasé, une place prise
 * ne laissaient rien : le monde oubliait tout ce qu'il faisait. C'est pourtant
 * le seul contenu qui se fabrique tout seul, sans que personne l'écrive, et qui
 * grandit avec la partie. Au bout de mille heures, la carte EST le récit de ce
 * qui s'y est passé.
 */
export const TRACES = {
  charnier: 'on s’y est battu',
  ruine_poste: 'un ouvrage y est tombé',
  ville_morte: 'une ville y est morte',
};

/**
 * Poser une trace. Rend le nom du lieu, ou null si la case garde déjà une
 * histoire — **une case n'en porte qu'une, et c'est la première** : sinon la
 * dernière escarmouche effacerait la ville morte, et la carte ne se souviendrait
 * que d'hier.
 *
 * Le nom se dérive de la case et de l'heure, sans un seul tirage : deux mondes
 * de même graine racontent la même histoire.
 */
export function marquerLieu(world, regionId, type, t) {
  const r = world.regions[regionId];
  if (!r || r.site || r.colonie != null || !TRACES[type]) return null;
  r.site = { type, connu: false, fouille: false, quand: t || 0 };
  const mots = TRACE_A[type] || TRACE_A.charnier;
  const a = mots[(regionId * 7 + (t || 0)) % mots.length];
  const b = PASSAGE_B[(regionId * 13 + Math.floor((t || 0) / 24)) % PASSAGE_B.length];
  r.trace = `${a} ${b}`;
  return r.trace;
}

/** L'ouvrage qui tient cette case, s'il y en a un. */
export function posteDe(world, regionId) {
  const r = world.regions[regionId];
  return (r && r.poste) || null;
}

/**
 * Bâtir. On ne bâtit pas chez quelqu'un d'autre — la règle du premier arrivé
 * vaut ici comme ailleurs : prendre à autrui, c'est prendre sa ville ou raser
 * son poste, jamais poser une pierre à côté.
 *
 * L'argent ne passe PAS par ici : `world.js` ne connaît ni les caisses ni la
 * masse monétaire, et un `tresor -= cout` posé là détruisait de la monnaie —
 * l'invariant comptable l'a dit dans la minute. C'est `poserPoste`
 * (factions.js) qui paie les maçons, comme `batirMur` paie les siens.
 */
export function batirPoste(world, regionId, faction, t = 0, votre = false) {
  const r = world.regions[regionId];
  // On n'exige PAS que le drapeau soit au tableau des pays : le joueur tient
  // une route comme n'importe qui, et `monterLaGarde` l'accepte déjà de la
  // même façon (TERRITOIRE.md, E5).
  if (!r || !faction || r.poste || r.colonie != null || r.faille) return null;
  if (r.controle && r.controle !== faction) return null;
  // `recu` et `passages` sont la seule information qu'un conseil aura jamais
  // sur ce que vaut une route (TERRITOIRE.md, T3) : ce que SON ouvrage a vu
  // passer, pas une statistique tombée du ciel.
  //
  // `votre` dit que c'est le joueur qui l'a bâti de ses mains, et non le
  // conseil du pays dont il porte les couleurs. Les deux postes portent le
  // même drapeau et ne se distinguent par rien d'autre : sans cette marque,
  // le conseil rasait l'ouvrage que le joueur avait payé, le comptait dans
  // son plafond, et le joueur encaissait les péages de son pays.
  r.poste = { faction, depuis: t || 0, recu: 0, pris: 0, passages: 0, votre: !!votre };
  // « Joueur » n'est pas un drapeau, et la case ne peut pas porter des
  // couleurs qui n'existent pas : `drapeauDe` ne rend rien pour cette
  // chaîne-là, et tout lecteur de `r.controle` tombait dessus — le tick des
  // caravanes, celui des colonnes, l'écran de la région. C'est la règle que
  // `monterLaGarde` tient depuis toujours, quelques lignes plus bas :
  // l'occupation compte, elle ne nomme rien.
  if (faction !== 'joueur') r.controle = faction;
  return r.poste;
}

/**
 * Ce qui passe, le poste le compte. C'est ce qui transforme le trafic en
 * récompense : sans ce chiffre, un poste posé au mauvais endroit y reste pour
 * toujours et le conseil n'apprend jamais rien.
 */
export function noterAuPoste(world, regionId, montant, enNature) {
  const p = posteDe(world, regionId);
  if (!p) return 0;
  p.passages = (p.passages || 0) + 1;
  // Deux registres, et c'est METHODE §12 : ce qu'on encaisse est en monnaie du
  // pays, ce qu'on prélève en nature est une valeur de marchandise en prix de
  // base. Les additionner faisait une somme d'unités hétérogènes — et c'était
  // la SEULE grandeur sur laquelle le conseil décidait quel poste fermer.
  if (montant > 0) {
    if (enNature) p.pris = (p.pris || 0) + montant;
    else p.recu = (p.recu || 0) + montant;
  }
  return p.recu;
}

/**
 * Raser. Ce qu'on a bâti, quelqu'un peut venir le défaire — et la case retombe
 * à qui saura la reprendre. C'est là que le minuteur meurt.
 */
export function raserPoste(world, regionId) {
  const r = world.regions[regionId];
  if (!r || !r.poste) return null;
  const tenait = r.poste.faction;
  r.poste = null;
  if (r.controle === tenait) libererOrphelines(world, regionId);
  return tenait;
}

/**
 * Ce qu'un voyageur craint, en unités de coût de terrain (une case coûte de 3
 * à 7). Calibrable : c'est le prix qu'on met à sa peau et à sa bourse.
 *
 * Avant, `chemin` ne coûtait que le biome et la piste : aucun voyageur de ce
 * monde ne choisissait sa route en fonction de ce qu'il craignait. C'était le
 * verrou du dossier territoire tout entier — le seul effet mesurable d'une
 * frontière est de DÉPLACER DU TRAFIC, et tant que rien ne se détournait, rien
 * de ce qu'on faisait au territoire ne pouvait se voir.
 *
 * Un coût, jamais un interdit : un chemin dangereux reste praticable, il coûte
 * plus cher. Des convois qui ne peuvent plus passer, ce sont des villes qui ne
 * mangent plus.
 */
export const ROUTE = { parInsecurite: 6, parPeage: 3, parEnnemi: 14 };

/**
 * Combien de temps il faut rester sur une case pour qu'elle porte vos
 * couleurs. Calibrable : c'est le prix de l'occupation, et le monde n'a pas
 * dit son mot.
 */
export const GARDE = { heures: 72 };

/**
 * On tient ce qu'on occupe (TERRITOIRE.md, A2).
 *
 * Le contrôle se gagnait par les VILLES et par elles seules : mille deux cents
 * hommes campés sur une case n'y changeaient rien, et aucun agent ne pouvait
 * contester une couleur. La présence existait pourtant déjà à moitié —
 * `effetPresence` fait baisser l'insécurité là où l'on patrouille ; il lui
 * manquait de nommer la case.
 *
 * Deux bornes, et elles ne sont pas des précautions. **Seulement une case que
 * personne ne tient** : prendre à quelqu'un, c'est prendre sa ville, pas
 * camper à côté — la règle du premier arrivé n'est pas touchée. Et **une
 * occupation à la fois** : le premier installé y est, les autres passent.
 */
export function monterLaGarde(world, regionId, faction, t) {
  const r = world.regions[regionId];
  if (!r || !faction) return false;
  // Chez quelqu'un d'autre, on ne fait que passer.
  if (r.controle && r.controle !== faction) return false;
  const g = r.garde;
  if (!g || g.faction !== faction) {
    // La place est libre, ou c'était quelqu'un d'autre qui n'y est plus : on
    // s'installe. `depuis` date l'occupation — c'est elle qui court, pas un
    // compteur, pour qu'une sauvegarde reprise dise la même chose.
    if (g && g.faction !== faction && t - g.vu <= 1) return false;
    r.garde = { faction, depuis: t, vu: t, pris: false };
    if (!world.gardes) world.gardes = [];
    if (!world.gardes.includes(regionId)) world.gardes.push(regionId);
    return false;
  }
  g.vu = t;
  // « Joueur » n'est pas un drapeau : on ne plante pas des couleurs qu'on n'a
  // pas. L'occupation compte quand même — personne d'autre ne peut s'installer
  // sur une case où vous êtes —, elle ne nomme simplement rien.
  if (faction === 'joueur') return false;
  if (r.controle === faction) return false;
  if (t - g.depuis < GARDE.heures) return false;
  r.controle = faction;
  // La case est tenue par des hommes et non par une ville : c'est ce que dit
  // `pris`, et c'est la seule chose qui distingue une appropriation d'une
  // colonne campée chez elle. Sans ce drapeau, la mesure comptait les
  // secondes pour des premières (METHODE.md §12).
  g.pris = true;
  return true;
}

/**
 * Les gardes qu'on ne relève plus : celui qui occupait est parti, mort, ou
 * dissous. Sans ce passage, une case garderait ses couleurs derrière une
 * troupe qui n'y est plus — le défaut d'A5, revenu par la porte de service.
 *
 * `world.gardes` tient la liste des cases occupées : elles se comptent en
 * dizaines (les colonnes du monde et les groupes du joueur), pas en milliers.
 */
export function tickGardes(world, t) {
  const liste = world.gardes;
  if (!liste || !liste.length) return 0;
  let leves = 0;
  for (let k = liste.length - 1; k >= 0; k--) {
    const r = world.regions[liste[k]];
    if (r && r.garde && t - r.garde.vu <= 1) continue;
    if (r && r.garde) { leverLaGarde(world, r.i, null); leves++; }
    liste.splice(k, 1);
  }
  return leves;
}

/** On s'en va : on cesse de tenir ce qu'on n'occupe plus. */
export function leverLaGarde(world, regionId, faction) {
  const r = world.regions[regionId];
  if (!r || !r.garde || (faction && r.garde.faction !== faction)) return false;
  const tenait = r.garde.faction;
  r.garde = null;
  // Ce que la seule présence tenait retombe à personne. Ce qu'une ville
  // soutient, elle continue de le soutenir : `libererOrphelines` en juge.
  if (r.controle === tenait) {
    libererOrphelines(world, regionId);
    return r.controle !== tenait;
  }
  return false;
}

/**
 * Qui tient le barrage, concrètement. Un péage n'est pas une propriété du
 * terrain : ce sont des hommes, et ils viennent de quelque part. La ville
 * vivante la plus proche, sous ce drapeau — depuis `libererOrphelines`
 * (TERRITOIRE.md, A5), une case tenue en a toujours une à portée.
 */
export function villeDuBarrage(world, faction, regionId) {
  if (!faction || !world.factions || !world.factions[faction]) return null;
  let place = null;
  let mieux = Infinity;
  for (const c of world.colonies) {
    if (c.ruine || c.faction !== faction) continue;
    const d = distance(c.regionId, regionId);
    if (d < mieux) { mieux = d; place = c; }
  }
  return place;
}

/** Une ville vivante de ce drapeau se tient-elle sur cette case ? */
function villeTenante(world, i, faction) {
  const r = world.regions[i];
  if (!r || r.colonie == null) return false;
  const col = colonieParId(world, r.colonie);
  return !!(col && !col.ruine && col.faction === faction);
}

/**
 * Le territoire n'a jamais été autre chose qu'un halo peint autour des villes :
 * la naissance du monde peint les quatre voisines d'une ville, et la prise
 * d'une place donne au vainqueur la case et ses voisines. Ce qui manquait,
 * c'est qu'on le relise. Une ville morte, affranchie ou passée à l'ennemi
 * laissait derrière elle des cases à son nom que plus rien ne tenait — vingt-
 * trois d'entre elles en quinze cents heures, parfois au nom d'un pays éteint.
 *
 * La règle ne fait qu'appliquer la définition jusqu'au bout : **une case n'est
 * tenue que si une ville vivante de ce drapeau est dessus ou la touche.** Le
 * premier arrivé garde tout ce qu'il a pris ; il cesse seulement de tenir ce
 * qu'il n'a plus les moyens de tenir, et la case redevient libre pour le
 * suivant qui viendra (TERRITOIRE.md, A5).
 *
 * `autour` : la case dont on vient de changer quelque chose. On ne relit
 * qu'elle et ses voisines, parce que le halo d'une ville ne va pas plus loin.
 * Sans elle, on relit toute la carte — ce que fait `normaliser` au chargement
 * d'une partie d'avant.
 */
export function libererOrphelines(world, autour) {
  const cases = autour == null
    ? world.regions.map((r) => r.i)
    : [autour, ...voisins(autour)];
  let liberees = 0;
  for (const i of cases) {
    const r = world.regions[i];
    if (!r || !r.controle) continue;
    if (villeTenante(world, i, r.controle)) continue;
    // Une case tenue par des HOMMES n'est pas une couleur orpheline : elle a
    // très exactement quelqu'un pour la porter (TERRITOIRE.md, A2). Un ouvrage
    // debout non plus — il y a quelque chose dessus (T2).
    if (r.garde && r.garde.faction === r.controle) continue;
    if (r.poste && r.poste.faction === r.controle) continue;
    if (voisins(i).some((v) => villeTenante(world, v, r.controle))) continue;
    r.controle = null;
    liberees++;
  }
  return liberees;
}

// Le coût d'un secteur n'a pas bougé avec l'agrandissement de la carte, et le
// banc a montré que ce n'était pas là qu'était le problème : le diviser par
// deux ne fait passer le temps de marche que de 39 à 35 %, sans rien changer au
// revenu. Voir le rapport dans README.
/**
 * Ce qu'une piste damée retire au coût d'un passage.
 *
 * Cinquante-deux pour cent du temps de jeu se passe en marche, et sur les
 * quarante-cinq départs d'une partie, trente sont de la logistique : rentrer au
 * camp, chercher à manger, aller vendre. Agrandir le sac ou raccourcir la carte
 * reviendrait à retirer le voyage du jeu ; ce qu'il faut, c'est que le voyage
 * *s'améliore*. Un monde où l'on passe finit par avoir des routes, et une route
 * n'est pas un raccourci : c'est de la terre tassée par ceux qui sont passés
 * avant, la vôtre comprise.
 */
export const PISTE_GAIN = 0.34;

export function coutTraversee(world, i, mods = {}) {
  const r = world.regions[i];
  const base = BIOMES[r.biome].cout;
  // Témoin du banc : on annule le gain des pistes pour mesurer par différence
  // ce qu'elles rapportent. Voir test/equilibre.js, SANS=pistes.
  const piste = world.sansPistes ? 1 : 1 - (r.piste || 0) * PISTE_GAIN;
  const dur = r.faille ? FAILLE.cout : 0;
  const ciel = coutSaison(world.saisonKey, r.biome);
  return Math.max(1, base * ciel * piste * (1 - (mods.reductionVoyage || 0)) + dur);
}

/** On tasse la terre en passant. Le gain est lent à venir et lent à s'en aller. */
export function damer(world, i, force = 1) {
  const r = world.regions[i];
  if (!r) return;
  r.piste = Math.min(1, (r.piste || 0) + 0.02 * force);
}

// Les cinq tableaux de travail du Dijkstra, alloués une fois pour toutes.
//
// Ils étaient créés à chaque appel. Tant que les routes ne se calculaient qu'au
// moment de donner un ordre, personne ne s'en apercevait ; depuis que les
// réseaux de bourse envoient des convois d'eux-mêmes, `chemin` tourne plusieurs
// fois par minute de jeu et ces cinq tableaux de quatre cent trente-deux cases
// — plus un objet et un tableau par case visitée, dans `voisins` — étaient
// devenus le premier fournisseur du ramasse-miettes.
//
// Aucun risque de collision : le moteur est synchrone et `chemin` ne s'appelle
// pas lui-même. `ardoise` les redimensionne si la carte grandit.
let ardoiseN = 0;
let ardoiseDist = null;
let ardoisePrev = null;
let ardoiseTasN = null;
let ardoiseTasD = null;
// Le numéro de la course en cours. Effacer trois tableaux de quatre cent
// trente-deux cases à chaque appel coûtait plus cher que la course elle-même :
// un Dijkstra qui s'arrête à sa cible n'en visite qu'une poignée, mais payait
// treize cents écritures avant de partir. Une case est « vierge » quand sa
// marque n'est pas celle de la course : plus rien à effacer.
let ardoiseGen = 0;
let ardoiseGenDist = null;
let ardoiseGenVus = null;

function ardoise(n) {
  if (n <= ardoiseN) return;
  ardoiseN = n;
  ardoiseDist = new Float64Array(n);
  ardoisePrev = new Int32Array(n);
  ardoiseGenDist = new Int32Array(n);
  ardoiseGenVus = new Int32Array(n);
  ardoiseGen = 0;
  ardoiseTasN = new Int32Array(n + 1);
  ardoiseTasD = new Float64Array(n + 1);
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
  ardoise(n);
  const dist = ardoiseDist;
  const prev = ardoisePrev;
  const genDist = ardoiseGenDist;
  const genVus = ardoiseGenVus;
  if (ardoiseGen >= 2147483646) { genDist.fill(0); genVus.fill(0); ardoiseGen = 0; }
  const gen = ++ardoiseGen;
  dist[from] = 0;
  prev[from] = -1;
  genDist[from] = gen;
  // Le facteur des mods ne change pas d'une case à l'autre : il sortait de la
  // boucle une fois par arête.
  const red = 1 - (mods.reductionVoyage || 0);
  // Ce que ce voyageur-ci craint : rien par défaut, pour que les appels qui ne
  // demandent qu'une distance restent ce qu'ils étaient.
  // La table de la saison : construite une fois par SAISON par `tickClimat`,
  // pas une fois par course. Le repli sert les mondes d'avant la migration.
  const ciel = world.coutCiel || SANS_CIEL;
  const craint = !!mods.craint;
  const sien = mods.sien || null;
  const ennemis = mods.ennemis || null;

  // Tas binaire minimal : deux tableaux plats, pas d'objets alloués par nœud.
  const tasN = ardoiseTasN;
  const tasD = ardoiseTasD;
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
    if (genVus[u] === gen) continue; // doublon laissé par une amélioration ultérieure
    if (u === to) break;
    genVus[u] = gen;
    // Les quatre voisins à la main : `voisins()` alloue un objet et un tableau,
    // et cette boucle-ci tourne une fois par case de la carte.
    const ux = u % LARGEUR;
    const uy = (u / LARGEUR) | 0;
    const du = dist[u];
    for (let d = 0; d < 4; d++) {
      const vx = ux + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const vy = uy + (d === 2 ? -1 : d === 3 ? 1 : 0);
      if (vx < 0 || vy < 0 || vx >= LARGEUR || vy >= HAUTEUR) continue;
      const v = vy * LARGEUR + vx;
      if (genVus[v] === gen) continue;
      const r = world.regions[v];
      const piste = world.sansPistes ? 1 : 1 - (r.piste || 0) * PISTE_GAIN;
      // Ce que la saison fait à ce sol-là (GEOGRAPHIE.md, G3) : le marais se
      // ferme aux pluies, le désert en saison sèche. La meilleure route change
      // donc avec les mois.
      let arete = Math.max(1, BIOMES[r.biome].cout * ciel[r.biome] * piste * red);
      // La Faille se paie avant tout le reste : elle n'est pas un terrain
      // pénible, c'est un gouffre qu'on longe.
      if (r.faille) arete += FAILLE.cout;
      // Ce que le voyageur craint s'ajoute au terrain (TERRITOIRE.md, T1). On
      // n'y touche que si quelqu'un l'a demandé : une colonne qui marche sur
      // une ville ennemie n'évite évidemment pas les terres ennemies, et un
      // trajet calculé pour l'affichage n'a rien à craindre.
      if (craint) {
        arete += (r.insecurite || 0) * ROUTE.parInsecurite;
        if (r.controle && r.controle !== sien) {
          arete += ennemis && ennemis.has(r.controle)
            ? ROUTE.parEnnemi : ROUTE.parPeage;
        }
      }
      const nd = du + arete;
      if (genDist[v] !== gen || nd < dist[v]) {
        dist[v] = nd; prev[v] = u; genDist[v] = gen; pousser(v, nd);
      }
    }
  }
  if (genDist[to] !== gen) return null;
  const path = [];
  let cur = to;
  while (cur !== from && cur !== -1) {
    path.push(cur);
    cur = prev[cur];
  }
  return path.reverse();
}

/** Révèle une région et ses alentours. */
/** Ce que ce terrain-ci ajoute ou retire à la portée du regard (G6). */
export function porteeDe(biome) {
  return PORTEE_VUE[biome] || 0;
}

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

/**
 * Ce qu'une région donne à l'heure de travail — le biome, plus ce qu'on y a
 * fait.
 *
 * Six endroits lisaient `BIOMES[r.biome].yields` chacun de leur côté : la
 * halle, la production d'une ville, et trois ordres d'escouade. Une terre
 * qu'on amende devait donc être ajoutée six fois, ou elle mentait cinq fois.
 * Une seule fonction, et l'amendement vaut partout — pour votre camp comme
 * pour la ville qui s'installerait là un jour.
 *
 * `amendement` n'existe pas dans les vieilles sauvegardes ni sur les 431 autres
 * cases : le cas courant ne coûte donc qu'une copie.
 */
export function rendementRegion(world, i) {
  const r = world.regions[i];
  const out = Object.assign({}, BIOMES[r.biome].yields || {});
  // La veine donne plus que la terre autour : c'est ce qui la rend convoitable
  // (GEOGRAPHIE.md, G4).
  if (r.gisement) {
    const g = r.gisement;
    // Pas de `toFixed` ici : il fabrique une chaîne, et cette fonction est
    // lue à chaque heure de travail de chaque case. L'arrondi n'apporte rien
    // à un rendement qu'on multiplie ensuite par le climat.
    out[g.key] = (out[g.key] || 0) + g.debit;
  }
  if (!r.amendement) return out;
  for (const k of Object.keys(r.amendement)) {
    const a = r.amendement[k];
    if (a > 0) out[k] = Number(((out[k] || 0) + a).toFixed(3));
  }
  return out;
}

/** Ce qu'on a ajouté à cette terre, et rien d'autre. Pour le dire à l'écran. */
export function amendementRegion(world, i) {
  const a = world.regions[i].amendement;
  if (!a) return null;
  const dit = Object.keys(a).filter((k) => a[k] > 0.001);
  return dit.length ? dit.map((k) => ({ key: k, gain: a[k] })) : null;
}

export function nomRegion(world, i) {
  const r = world.regions[i];
  const col = colonieDe(world, i);
  if (col) return col.nom;
  // Un lieu-dit se retient, une coordonnée non (GEOGRAPHIE.md, G2).
  if (r && r.passage) return r.passage;
  // Un lieu où il s'est passé quelque chose porte le nom de ce qui s'y est
  // passé (GEOGRAPHIE.md, G5).
  if (r && r.trace) return r.trace;
  return `${BIOMES[r.biome].court} ${coordonnee(world, i)}`;
}

/** La case sur la carte : « K5 ». Ce qu'on lit sur la grille, rien d'autre. */
export function coordonnee(world, i) {
  const r = world.regions[i];
  if (!r) return '?';
  return `${String.fromCharCode(65 + r.x)}${r.y + 1}`;
}

/**
 * Un lieu avec ses coordonnées, toujours.
 *
 * `nomRegion` rend le nom de la ville quand il y en a une — « Poste-Ambre » —
 * et ne tombe sur la case que pour les régions vides. Un ordre de ravitaillement
 * vise justement une ville : il n'a donc **jamais** affiché de coordonnées, ce
 * qui a été signalé trois fois, et que j'ai « corrigé » deux fois en travaillant
 * sur le mauvais bout. Ici le nom et la case vont ensemble, pour tout ce qui est
 * une destination : « Poste-Ambre (K5) ».
 */
export function lieuAvecCoord(world, i) {
  const col = colonieDe(world, i);
  const c = coordonnee(world, i);
  if (col) return `${col.nom} (${c})`;
  // Un lieu-dit garde sa coordonnée à côté : le nom se retient, la coordonnée
  // se retrouve sur la carte (GEOGRAPHIE.md, G2).
  const r = world.regions[i];
  if (r && r.passage) return `${r.passage} (${c})`;
  return nomRegion(world, i);
}
