// Ce dont un gradé répond tous les jours.
//
// Le banc a chiffré le défaut de la version précédente : sur six cent une
// occasions où un Lieutenant pouvait exercer sa seule prérogative, cinq cent
// treize fois sa faction n'avait aucune colonne sur les routes, et quatre cent
// soixante-huit fois elle n'était en guerre avec personne. La charge était vide
// neuf fois sur dix, parce qu'elle attendait que le monde lui donne une
// occasion. Trois mille six cents heures au service de quelqu'un pour mourir
// Lieutenant.
//
// Une charge, ce n'est pas un droit qu'on exerce quand l'occasion se présente :
// c'est une chose dont on répond en permanence, qu'il se passe quelque chose ou
// non. On confie donc au Lieutenant **un secteur** — une poignée de cases
// autour d'une ville des siens — et on lui demande simplement qu'il y soit sûr
// de circuler. Personne ne lui dit comment ; on relève l'état des routes tous
// les dix jours, et on le note.
//
// L'insécurité n'est pas une statistique décorative : elle multiplie les
// mauvaises rencontres pour tout le monde, joueur compris, et elle saigne la
// ville dont le secteur dépend. Un secteur qu'on laisse pourrir se sent.

import { FACTIONS } from './data.js';
import {
  distance, colonieParId, nomRegion, voisins, coord, idx, LARGEUR, HAUTEUR,
} from './world.js';
import { rangDe } from './allegeance.js';
import { porterFaute, porterMerite } from './influence.js';
import { estVivant } from './characters.js';

/** Rayon du secteur confié. Treize cases : de quoi faire une tournée. */
export const RAYON_SECTEUR = 2;

/** Grade à partir duquel on répond d'un morceau de territoire. */
export const RANG_SECTEUR = 2; // Lieutenant

/** Tous les combien on relève l'état des routes. Dix jours de jeu. */
export const PERIODE_BILAN = 240;

/**
 * Au-dessus, le conseil considère que le secteur n'est plus tenu ; en dessous,
 * qu'il l'est bien. Entre les deux, on ne dit rien : la plupart des tournées ne
 * méritent ni éloge ni reproche, et un jeu qui commente tout n'est plus lu.
 */
export const SEUIL_FAUTE = 0.55;
export const SEUIL_MERITE = 0.24;

/**
 * L'insécurité ne monte pas indéfiniment : elle tend vers un niveau de repos.
 *
 * La première version faisait dériver toutes les cases vers le haut à taux
 * constant. Le banc l'a réfutée en une mesure : au bout de six cents heures,
 * tout ce qui n'était pas collé à une ville saturait à « infréquentable », les
 * secteurs affichaient 0,79 de moyenne, les défaites passaient de 266 à 459 et
 * le carriériste perdait sa charge pour une faute qu'aucun effort ne pouvait
 * éviter. Une pente sans plafond n'est pas une simulation, c'est un compte à
 * rebours.
 *
 * Ce qui remplace : chaque case a un niveau de repos, fonction de son
 * éloignement de toute ville et de l'état de la ville la plus proche. Les
 * pistes s'y installent d'elles-mêmes ; l'effort les tire en dessous, la
 * négligence les y laisse remonter. Une piste éloignée est mauvaise en
 * permanence — pas mortelle, mauvaise.
 */
const REPOS_BASE = 0.15;
const REPOS_PAR_CASE = 0.09;
/** Combien d'heures pour rejoindre le niveau de repos : environ 250. */
const RAPPEL = 0.004;

/**
 * Tous les combien on repasse sur les quatre cent trente-deux cases.
 *
 * Écrit naïvement — chaque case cherchant à chaque heure la ville la plus
 * proche parmi quatre-vingt-six — ce seul calcul faisait passer le tick de
 * 130 à 589 µs, quatre fois le budget. L'insécurité dérive de moins d'un
 * millième par heure : la relever une fois par demi-journée donne exactement
 * la même courbe pour un trentième du travail.
 */
const PAS_INSECURITE = 12;

// ---------------------------------------------------------------------------
// Le secteur lui-même
// ---------------------------------------------------------------------------

/**
 * Les cases dont on répond. On balaie la boîte englobante plutôt que la carte :
 * treize cases à trouver parmi quatre cent trente-deux, ce serait trente fois
 * trop de travail pour un appel qui sert aussi à l'affichage.
 */
export function casesDe(world, secteur) {
  if (!secteur) return [];
  const rayon = secteur.rayon || RAYON_SECTEUR;
  const c = coord(secteur.centre);
  const out = [];
  for (let y = Math.max(0, c.y - rayon); y <= Math.min(HAUTEUR - 1, c.y + rayon); y++) {
    for (let x = Math.max(0, c.x - rayon); x <= Math.min(LARGEUR - 1, c.x + rayon); x++) {
      if (Math.abs(x - c.x) + Math.abs(y - c.y) > rayon) continue;
      out.push(world.regions[idx(x, y)]);
    }
  }
  return out;
}

export function insecuriteDe(world, regionId) {
  const r = world.regions[regionId];
  return (r && r.insecurite) || 0;
}

/**
 * Le niveau qu'ont les pistes ordinaires, une fois le monde installé. Il sert
 * de zéro : l'insécurité doit se lire en écart à la normale, pas en valeur
 * absolue.
 */
export const NIVEAU_ORDINAIRE = 0.28;

/**
 * Ce que l'insécurité fait au risque de mauvaise rencontre, pour tout le monde.
 *
 * Écrite d'abord comme `1 + insecurite × 1,4`, elle multipliait par 1,57 les
 * rencontres de la carte entière : les défaites passaient de 266 à 474 par
 * lot de quarante-huit parties et les avant-postes fondés de 35 à 28. Ce n'est
 * pas ce qu'on voulait dire. Un secteur mal tenu doit être plus dangereux que
 * les autres, pas rendre le monde plus dangereux qu'avant. On la centre donc
 * sur la normale : tenir son secteur *rend les pistes plus sûres qu'elles ne
 * l'étaient*, et c'est la récompense qu'on sent avant de lire le chiffre.
 */
export function menace(world, regionId) {
  const v = 1 + (insecuriteDe(world, regionId) - NIVEAU_ORDINAIRE) * 1.5;
  return v < 0.7 ? 0.7 : v > 1.9 ? 1.9 : v;
}

/** L'état moyen des routes du secteur : c'est là-dessus qu'on est jugé. */
export function etatSecteur(world, secteur) {
  const cases = casesDe(world, secteur);
  if (!cases.length) return 0;
  let s = 0;
  for (const r of cases) s += r.insecurite || 0;
  return s / cases.length;
}

/** Vrai si le groupe se trouve dans le secteur dont il répond. */
export function dansSonSecteur(g) {
  const s = g.allegeance && g.allegeance.secteur;
  if (!s) return false;
  return distance(g.regionId, s.centre) <= (s.rayon || RAYON_SECTEUR);
}

/**
 * Confier un secteur. On le prend autour de la ville de la faction la plus
 * proche de là où l'on sert : un conseil ne détache pas son lieutenant à
 * l'autre bout de la carte pour le plaisir.
 */
export function confierSecteur(state, g, log) {
  const all = g.allegeance;
  if (!all || all.secteur) return null;
  const villes = state.world.colonies.filter(
    (c) => !c.ruine && c.faction === all.faction
  );
  if (!villes.length) return null;
  let ville = villes[0];
  let d = Infinity;
  for (const c of villes) {
    const dd = distance(c.regionId, g.regionId);
    if (dd < d) { d = dd; ville = c; }
  }
  all.secteur = {
    centre: ville.regionId,
    ville: ville.id,
    rayon: RAYON_SECTEUR,
    depuis: state.temps,
    prochainBilan: state.temps + PERIODE_BILAN,
    bilans: 0,
  };
  if (log) {
    log({
      type: 'allegeance',
      texte: `${FACTIONS[all.faction].nom} vous confie les routes autour de ${ville.nom}. `
        + `On ne vous dira pas comment faire ; on relèvera l’état du secteur.`,
      important: true,
      groupe: g.id,
      regionId: ville.regionId,
      factions: [all.faction],
    });
  }
  return all.secteur;
}

/** Rendre le secteur : on ne répond plus de rien, et ça se voit tout de suite. */
export function rendreSecteur(g) {
  if (g.allegeance) g.allegeance.secteur = null;
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

/**
 * L'insécurité du monde entier dérive vers le haut : les pistes se referment
 * quand personne ne les tient. Ce qui la fait baisser, c'est la présence armée
 * — les colonnes des factions, les garnisons, et vous.
 */
export function tickInsecurite(state) {
  const w = state.world;
  if (w.majInsecurite === undefined) w.majInsecurite = state.temps;
  const dt = state.temps - w.majInsecurite;
  if (dt < PAS_INSECURITE) return;
  w.majInsecurite = state.temps;

  // Ce que chaque case peut espérer : on part des villes et on s'en éloigne en
  // largeur, quatre cent trente-deux visites au lieu de trente-sept mille
  // distances. La ville qui atteint une case la première est celle dont elle
  // dépend, ce qui est exactement la bonne définition.
  const dist = new Int8Array(w.regions.length).fill(9);
  const source = new Int32Array(w.regions.length).fill(-1);
  let front = [];
  for (const col of w.colonies) {
    if (col.ruine) continue;
    dist[col.regionId] = 0;
    source[col.regionId] = col.regionId;
    front.push(col.regionId);
  }
  for (let d = 1; d <= 4 && front.length; d++) {
    const suivant = [];
    for (const i of front) {
      for (const v of voisins(i)) {
        if (dist[v] <= d) continue;
        dist[v] = d;
        source[v] = source[i];
        suivant.push(v);
      }
    }
    front = suivant;
  }
  const troubleDe = new Map();
  for (const col of w.colonies) {
    if (!col.ruine) troubleDe.set(col.regionId, col.unrest || 0);
  }

  // Ce qui tient activement les routes, en plus de la simple proximité : les
  // murs d'une ville, et les colonnes en marche. C'est la raison d'être des
  // colonnes, et ça donne un effet visible aux guerres lointaines.
  const tenu = new Map();
  const ajouter = (i, v) => tenu.set(i, (tenu.get(i) || 0) + v);
  for (const col of w.colonies) {
    if (col.ruine) continue;
    ajouter(col.regionId, col.defense * 0.00006 * (1 - (col.unrest || 0)));
  }
  for (const a of w.armees) ajouter(a.regionId, 0.006);

  for (const r of w.regions) {
    const d = dist[r.i];
    // Une ville qui gronde ne tient plus ses abords : son désordre déborde sur
    // les pistes, et c'est ce qui reliera un jour l'ordre public au secteur.
    const trouble = source[r.i] >= 0 ? (troubleDe.get(source[r.i]) || 0) : 0.5;
    const cible = Math.min(1,
      REPOS_BASE + REPOS_PAR_CASE * Math.min(4, d === 9 ? 4 : d) + trouble * 0.22);
    const v0 = r.insecurite || 0;
    const v = v0 + ((cible - v0) * RAPPEL - (tenu.get(r.i) || 0)) * dt;
    r.insecurite = v <= 0 ? 0 : v >= 1 ? 1 : v;
  }
}

/**
 * Ce que le groupe fait à l'insécurité de la case où il se trouve. Patrouiller
 * est de loin le plus efficace — c'est précisément le geste du métier —, mais
 * être là compte déjà pour quelque chose.
 */
export function effetPresence(state, g, dt) {
  const r = state.world.regions[g.regionId];
  if (!r) return;
  const bras = (g.membres || []).filter((c) => estVivant(c) && c.etat !== 'ko').length;
  if (!bras) return;
  const type = g.ordre && g.ordre.type;
  const force = type === 'patrouille' ? 0.011 : type === 'repos' ? 0.001 : 0.003;
  // Deux fois plus de monde ne tient pas deux fois mieux : on couvre plus de
  // terrain, pas le même terrain deux fois.
  r.insecurite = Math.max(0, r.insecurite - force * Math.sqrt(bras) * dt);
}

/**
 * Le bilan : tous les dix jours, on relève l'état des routes du secteur et on
 * le porte au dossier. C'est ce qui fait qu'un Lieutenant a quelque chose à
 * faire tous les jours, guerre ou pas.
 */
export function tickSecteurs(state, log, ctx) {
  const dt = 1;
  tickInsecurite(state);
  for (const g of state.player.groupes) {
    const all = g.allegeance;
    if (!all) continue;
    const rang = rangDe(all);
    if (rang.index < RANG_SECTEUR) { all.secteur = null; continue; }
    if (!all.secteur) { confierSecteur(state, g, log); continue; }

    effetPresence(state, g, dt);

    // La ville de référence est tombée ou a changé de mains : le secteur n'a
    // plus de sens, on en reçoit un autre.
    const ville = colonieParId(state.world, all.secteur.ville);
    if (!ville || ville.ruine || ville.faction !== all.faction) {
      all.secteur = null;
      confierSecteur(state, g, log);
      continue;
    }

    if (state.temps < all.secteur.prochainBilan) continue;
    all.secteur.prochainBilan = state.temps + PERIODE_BILAN;
    all.secteur.bilans++;
    const etat = etatSecteur(state.world, all.secteur);
    all.secteur.dernier = Number(etat.toFixed(3));
    if (etat >= SEUIL_FAUTE) {
      porterFaute(state, all.faction,
        `l’état des routes autour de ${ville.nom} — on n’y circule plus`, log);
    } else if (etat <= SEUIL_MERITE) {
      porterMerite(state, all.faction,
        `On passe sans escorte autour de ${ville.nom}, et c’est votre secteur.`,
        60 + Math.round(rang.index * 15), log);
    }
  }
}

/** Ce qu'on peut dire de l'état d'un secteur, en un mot. */
export function motEtat(etat) {
  if (etat <= SEUIL_MERITE) return 'sûr';
  if (etat <= 0.40) return 'praticable';
  if (etat < SEUIL_FAUTE) return 'mauvais';
  return 'infréquentable';
}

/** La case la plus mal tenue du secteur : là où il faut aller. */
export function pireCase(world, secteur) {
  let pire = null;
  for (const r of casesDe(world, secteur)) {
    if (!pire || (r.insecurite || 0) > (pire.insecurite || 0)) pire = r;
  }
  return pire;
}

/** Le secteur en une ligne, pour l'affichage et pour les tests. */
export function resumeSecteur(world, secteur) {
  if (!secteur) return null;
  const etat = etatSecteur(world, secteur);
  const pire = pireCase(world, secteur);
  return {
    etat,
    mot: motEtat(etat),
    cases: casesDe(world, secteur).length,
    pire: pire ? nomRegion(world, pire.i) : null,
    pireId: pire ? pire.i : null,
  };
}
