// La bourse des matières premières : ce qu'une faction fait de son économie
// quand elle cesse de la laisser au hasard des caravanes.
//
// Le monde avait déjà du commerce, mais opportuniste : une ville en surplus
// livrait une ville en manque à moins de sept régions, si le hasard tirait la
// bonne paire et si l'écart de prix payait le trajet. Cela suffit à faire vivre
// une carte ; cela ne fait pas une économie. Une famine à huit régions d'un
// grenier plein durait des mois parce que personne ne l'avait tirée au sort.
//
// Une bourse, c'est trois choses, et elles se tiennent :
//
//   — un réseau  : les villes qui en font partie s'approvisionnent entre elles
//                  en priorité, plus loin et pour moins cher qu'au hasard ;
//   — un cours   : un prix publié, commun à tout le réseau, contre lequel les
//                  prix locaux sont ramenés ;
//   — des accords: deux factions branchent leurs réseaux l'un sur l'autre, et
//                  la guerre les débranche.
//
// Tout vit dans `world` — c'est la moitié partagée de l'état, celle qui
// tournerait côté serveur en multijoueur. Rien ici ne connaît le joueur.

import { COMMODITY_KEYS, COMMODITIES, FACTIONS, DIPLO_FACTIONS } from './data.js';
import { prixUnitaire } from './economy.js';
import { avantage } from './allegeance.js';

/** Ce qu'il faut tenir pour ouvrir une bourse : ça ne se décrète pas à trois. */
export const VILLES_BOURSE = 4;
/** Et ce qu'il faut en caisse : une bourse s'amorce, elle ne se souhaite pas. */
export const TRESOR_BOURSE = 2500;
/**
 * Au-dessous de cette estime mutuelle, on ne branche pas ses cours sur les
 * leurs. Zéro : il suffit de ne pas se détester.
 *
 * Trente-cinq d'abord, choisi au jugé, et le monde l'a démenti : sur six mille
 * heures, les factions qui ouvrent une bourse s'estiment 0, −53, −79, −89, −96.
 * Pas un accord signé, jamais. Douze ensuite : toujours rien, les meilleures
 * paires plafonnant exactement à zéro. Ce monde ne produit pas d'amitié entre
 * puissances, seulement des indifférences et des haines — et une constante
 * choisie au jugé tuait la moitié du système sans que rien ne le signale.
 *
 * On n'est déjà pas en guerre, c'est vérifié à part ; une haine franche reste
 * rédhibitoire. L'indifférence, elle, suffit à commercer — c'est même de cela
 * que le commerce est fait.
 */
export const RELATION_ACCORD = 0;
/** Toutes les combien d'heures le cours est republié. */
export const PAS_COTATION = 24;

export function aUneBourse(world, key) {
  // Témoin du banc et des essais : on coupe les bourses pour savoir ce
  // qu'elles font vraiment, plutôt que de comparer les factions qui en ouvrent
  // à celles qui n'en ouvrent pas — les premières sont les plus riches, et
  // l'on mesurerait la richesse en croyant mesurer la bourse.
  if (world.sansBourse) return false;
  return !!(world.factions[key] && world.factions[key].bourse);
}

/**
 * Le réseau d'une faction : elle, plus toutes celles à qui ses accords la
 * relient, directement ou de proche en proche.
 *
 * De proche en proche, et c'est le point : si A s'accorde avec B et B avec C,
 * A et C partagent le même cours sans s'être jamais parlé. C'est ce qui fait
 * qu'un accord vaut plus que la somme de ses deux signataires — et ce qui rend
 * une guerre coûteuse bien au-delà des deux belligérants.
 */
export function reseauDe(world, key) {
  if (!aUneBourse(world, key)) return [];
  const vus = new Set([key]);
  const pile = [key];
  while (pile.length) {
    const k = pile.pop();
    for (const a of world.accords || []) {
      const autre = a.a === k ? a.b : a.b === k ? a.a : null;
      if (!autre || vus.has(autre) || !aUneBourse(world, autre)) continue;
      vus.add(autre);
      pile.push(autre);
    }
  }
  return [...vus].sort();
}

/**
 * L'identité d'un réseau, stable et lisible : les drapeaux qui le composent,
 * dans l'ordre. C'est la clé sous laquelle son cours est publié.
 */
export function idReseau(membres) {
  return membres.join('+');
}

/** Les villes vivantes d'un réseau. */
export function villesDuReseau(world, membres) {
  const dedans = new Set(membres);
  return world.colonies.filter((c) => !c.ruine && dedans.has(c.faction));
}

/**
 * Le cours publié pour ce réseau, ou `null` s'il n'y en a pas.
 *
 * On ne recalcule pas une moyenne sur cinquante villes à chaque consultation
 * d'un prix : une bourse *publie* un cours, à intervalle régulier, et tout le
 * monde traite contre ce qui est affiché. Ce n'est donc pas un cache — c'est le
 * mécanisme, et le décalage entre le cours et la réalité du jour fait partie du
 * jeu.
 */
export function coursDe(world, key) {
  // On passe par la table publiée, pas par un parcours des accords.
  //
  // `prixJoueur` appelle ceci une fois par unité achetée — une transaction de
  // deux cents rations, c'est deux cents parcours du graphe des accords. Le
  // tick est passé de 69 à 132 µs sur ce seul chemin. La bourse publie donc
  // aussi, avec ses cours, la table qui dit quel drapeau appartient à quel
  // réseau : c'est la même publication, et c'est une lecture au lieu d'une
  // marche.
  if (!aUneBourse(world, key)) return null;
  const id = (world.reseauParFaction || {})[key];
  const c = id && (world.cotations || {})[id];
  return c ? c.prix : null;
}

/**
 * Republier les cours de tous les réseaux. Appelé une fois par jour de jeu.
 *
 * Le cours d'une matière est la moyenne de ce qu'elle vaut dans les villes du
 * réseau, pondérée par leur taille : une capitale pèse plus qu'un hameau, comme
 * dans la vraie vie d'un marché.
 */
export function tickBourses(world, t) {
  if (!world.cotations) world.cotations = {};
  if (t % PAS_COTATION !== 0) return;

  const faits = new Set();
  const restants = {};
  for (const key of DIPLO_FACTIONS) {
    if (!aUneBourse(world, key)) continue;
    const membres = reseauDe(world, key);
    const id = idReseau(membres);
    if (faits.has(id)) continue;
    faits.add(id);

    const villes = villesDuReseau(world, membres);
    if (!villes.length) continue;
    const prix = {};
    for (const k of COMMODITY_KEYS) {
      let somme = 0;
      let poids = 0;
      for (const col of villes) {
        const p = Math.max(1, col.pop || 1);
        somme += prixUnitaire(col, k) * p;
        poids += p;
      }
      prix[k] = Number((somme / Math.max(1, poids)).toFixed(3));
    }
    restants[id] = { prix, maj: t, villes: villes.length, membres };
  }
  world.cotations = restants;
  // La table de correspondance, publiée avec les cours : voir `coursDe`.
  const par = {};
  for (const id of Object.keys(restants)) {
    for (const k of restants[id].membres) par[k] = id;
  }
  world.reseauParFaction = par;
}

/**
 * Ce qu'une marchandise vaut dans cette ville-ci, une fois la bourse passée par
 * là.
 *
 * Une ville branchée sur un réseau ne fait plus tout à fait ses prix : elle les
 * fait à moitié. C'est ce qui rend une bourse visible sans la rendre magique —
 * une pénurie locale coûte encore cher, simplement moins cher qu'ailleurs, et
 * un surplus se brade moins.
 */
export const POIDS_COURS = 0.5;

export function prixAvecBourse(world, col, key, brut) {
  if (!col.faction || !aUneBourse(world, col.faction)) return brut;
  const cours = coursDe(world, col.faction);
  if (!cours || !(cours[key] > 0)) return brut;
  return brut * (1 - POIDS_COURS) + cours[key] * POIDS_COURS;
}

// ---------------------------------------------------------------------------
// Ce que décident les conseils
// ---------------------------------------------------------------------------

/**
 * Qui, parmi les chefs, a l'idée d'organiser son économie.
 *
 * La première version disait « le bâtisseur et le marchand ». Il n'y a pas de
 * tempérament « marchand » dans ce jeu : la branche était morte, et la moitié
 * de la règle avec. Pire, le test l'affirmait — il passait un tempérament que
 * le monde ne produit jamais, et il passait au vert. **Un test qui interroge
 * une valeur impossible ne vérifie rien.**
 *
 * On liste donc de vrais tempéraments, et on les choisit sur pièces : le
 * bâtisseur organise, le méthodique aussi — c'est même le plus répandu, et une
 * bourse est exactement de l'organisation —, le rapace y voit une caisse, et le
 * prudent s'y résout quand elle déborde. Le conquérant et le rancunier ont
 * d'autres soucis.
 */
export const OUVRENT_BOURSE = ['batisseur', 'methodique', 'rapace'];

/** Et qui accepte de brancher ses cours sur ceux d'un voisin. */
export const SIGNENT_ACCORD = ['conciliateur', 'batisseur', 'methodique', 'rapace', 'prudent'];

/**
 * Une faction ouvre-t-elle sa bourse ?
 *
 * Il faut des villes à relier, de quoi payer l'amorce, et quelqu'un que ça
 * intéresse.
 */
export function veutOuvrirBourse(world, key, temperament) {
  const f = world.factions[key];
  if (!f || f.bourse) return false;
  if ((f.colonies || []).length < VILLES_BOURSE) return false;
  if (f.tresor < TRESOR_BOURSE) return false;
  if (OUVRENT_BOURSE.includes(temperament)) return true;
  return temperament === 'prudent' && f.tresor > TRESOR_BOURSE * 2;
}

/** Ce chef-ci signerait-il un accord commercial ? */
export function veutAccord(temperament) {
  return SIGNENT_ACCORD.includes(temperament);
}

export function ouvrirBourse(world, key, t) {
  const f = world.factions[key];
  if (!f || f.bourse) return false;
  f.bourse = { depuis: t };
  f.tresor = Math.max(0, f.tresor - TRESOR_BOURSE);
  return true;
}

/** Y a-t-il déjà un accord entre ces deux-là ? */
export function accordEntre(world, a, b) {
  return (world.accords || []).some(
    (x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)
  );
}

/**
 * Avec qui cette faction signerait-elle ? Celle qui a une bourse, qu'on estime
 * assez, avec qui l'on n'est pas en guerre, et à qui l'on n'est pas déjà lié.
 */
export function partenairePossible(world, key) {
  if (!aUneBourse(world, key)) return null;
  const f = world.factions[key];
  let best = null;
  for (const autre of DIPLO_FACTIONS) {
    if (autre === key || !aUneBourse(world, autre)) continue;
    if (accordEntre(world, key, autre)) continue;
    if ((world.guerres || []).some(
      (g) => (g.a === key && g.b === autre) || (g.a === autre && g.b === key))) continue;
    const rel = f.relations[autre] ?? 0;
    if (rel < RELATION_ACCORD) continue;
    if (!best || rel > best.rel) best = { key: autre, rel };
  }
  return best;
}

export function signerAccord(world, a, b, t) {
  if (accordEntre(world, a, b)) return false;
  if (!world.accords) world.accords = [];
  world.accords.push({ a, b, depuis: t });
  return true;
}

/**
 * La guerre débranche les cours.
 *
 * Deux marchés reliés par un accord ne le restent pas quand les colonnes
 * partent : c'est ce qui donne à une déclaration de guerre un prix économique,
 * payé par les deux camps et par tous ceux que l'accord reliait à travers eux.
 */
export function rompreAccords(world, a, b) {
  if (!world.accords) return 0;
  const avant = world.accords.length;
  world.accords = world.accords.filter(
    (x) => !((x.a === a && x.b === b) || (x.a === b && x.b === a))
  );
  return avant - world.accords.length;
}

/** Les réseaux distincts du monde, chacun une fois. */
export function reseaux(world) {
  const faits = new Set();
  const out = [];
  for (const key of DIPLO_FACTIONS) {
    if (!aUneBourse(world, key)) continue;
    const membres = reseauDe(world, key);
    const id = idReseau(membres);
    if (faits.has(id)) continue;
    faits.add(id);
    out.push(membres);
  }
  return out;
}

/** De quoi le dire à l'écran sans recalculer un réseau à chaque ligne. */
export function resumeBourses(world) {
  const out = [];
  const faits = new Set();
  for (const key of DIPLO_FACTIONS) {
    if (!aUneBourse(world, key)) continue;
    const membres = reseauDe(world, key);
    const id = idReseau(membres);
    if (faits.has(id)) continue;
    faits.add(id);
    const cot = (world.cotations || {})[id];
    out.push({
      id,
      membres,
      noms: membres.map((k) => FACTIONS[k].nom),
      villes: cot ? cot.villes : villesDuReseau(world, membres).length,
      maj: cot ? cot.maj : null,
      prix: cot ? cot.prix : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Le comptoir du joueur
// ---------------------------------------------------------------------------

/**
 * L'estime qui ouvre un comptoir à qui ne porte aucune couleur.
 *
 * Quarante d'abord, ce qui était le seuil d'engagement de la faction la plus
 * fermée du jeu — autant dire jamais, pour une commune autonome qui n'en sert
 * aucune. Vingt : de quoi avoir rendu quelques services, pas de quoi y consacrer
 * sa partie.
 */
export const ESTIME_COMPTOIR = 20;
/** Ce que le réseau retient sur chaque ordre, avant courtier et estime. */
export const COMMISSION = 0.12;
/** Et le supplément qu'on paie quand on n'est pas des leurs. */
export const COMMISSION_ETRANGER = 0.08;

/**
 * Avec quel réseau ce camp peut-il traiter, et à quelles conditions ?
 *
 * Deux portes, et c'était le choix à trancher : porter leurs couleurs, ou
 * valoir quarante d'estime à leurs yeux. La seconde existe pour que la commune
 * autonome ne soit pas condamnée à tout porter à dos d'homme — on peut
 * commercer avec des gens sans leur appartenir, c'est même l'ordinaire du
 * commerce. Elle se paie : la commission est plus lourde pour un étranger.
 */
export function comptoirsPossibles(state) {
  const base = state.base;
  if (!base || !base.fonde) return [];
  const world = state.world;
  // La place du camp, si elle existe : elle sert à savoir sous quel drapeau on
  // se trouve, pas à autoriser le commerce.
  const col = base.colonieId ? world.colonies.find((c) => c.id === base.colonieId) : null;
  const out = [];
  const faits = new Set();
  for (const key of DIPLO_FACTIONS) {
    if (!aUneBourse(world, key)) continue;
    const membres = reseauDe(world, key);
    const id = idReseau(membres);
    if (faits.has(id)) continue;
    // Nos couleurs, l'estime de l'un des membres du réseau — ou le compte
    // ouvert, l'avantage propre au Consortium : servir des gens qui vivent du
    // contrat vous fait traiter comme un des leurs, y compris chez leurs
    // partenaires. C'est ce que vaut leur drapeau, et ça ne se trouve nulle
    // part ailleurs.
    const compte = avantage(state, 'compte');
    const parLeCompte = !!(compte && membres.includes(compte));
    const sien = !!(col && col.faction && membres.includes(col.faction)) || parLeCompte;
    const estime = Math.max(...membres.map((k) => state.player.reputation[k] || 0));
    if (!sien && estime < ESTIME_COMPTOIR) continue;
    faits.add(id);
    out.push({
      id,
      membres,
      sien,
      parLeCompte,
      estime: Math.round(estime),
      commission: COMMISSION + (sien ? 0 : COMMISSION_ETRANGER),
      prix: (world.cotations || {})[id] ? world.cotations[id].prix : null,
    });
  }
  return out;
}

/** Le réseau avec lequel on traite : celui qu'on a choisi, ou le premier venu. */
export function comptoirActif(state) {
  const liste = comptoirsPossibles(state);
  if (!liste.length) return null;
  const choisi = state.base.comptoir;
  return liste.find((x) => x.id === choisi) || liste[0];
}

/** Ce qui empêche de passer un ordre, dit en clair. */
export function peutTraiter(state) {
  const base = state.base;
  if (!base || !base.fonde) return { ok: false, motif: 'Il faut un avant-poste.' };
  if (!niveauComptoir(base)) {
    return { ok: false, motif: 'Il faut un comptoir : recherche Cotation, puis le bâtiment.' };
  }
  // On exigeait ici que le camp soit inscrit sur les cartes — dix-huit habitants,
  // c'est-à-dire des centaines d'heures. C'était la plus lourde des huit portes,
  // et la moins justifiée : **un comptoir est précisément ce qui fait de vous une
  // adresse.** Un convoi sait où aller dès qu'il y a quelqu'un pour le recevoir.

  const c = comptoirActif(state);
  if (!c) {
    return {
      ok: false,
      motif: `Aucun réseau ne traite avec vous : il faut porter les couleurs d’une `
        + `faction qui a ouvert sa bourse, ou valoir ${ESTIME_COMPTOIR} d’estime à ses yeux.`,
    };
  }
  if (!c.prix) return { ok: false, motif: 'Le réseau n’a pas encore publié de cours.' };
  return { ok: true, comptoir: c };
}

function niveauComptoir(base) {
  return (base.batiments && base.batiments.comptoir) || 0;
}

/**
 * Ce qu'un ordre rapporte ou coûte, sans le passer.
 *
 * On chiffre avant de cliquer : c'est la règle de tout le reste du jeu, et un
 * ordre de bourse est précisément le genre de chose dont on ne voit le prix
 * qu'après si personne ne l'affiche.
 */
export function chiffrerOrdre(state, sens, key, qte) {
  const v = peutTraiter(state);
  if (!v.ok) return { ok: false, motif: v.motif };
  const c = v.comptoir;
  const unite = c.prix[key];
  if (!(unite > 0)) return { ok: false, motif: 'Cette matière n’est pas cotée.' };
  const n = Math.max(0, Math.floor(qte));
  if (n <= 0) return { ok: false, motif: 'Quantité nulle.' };

  // Le courtier vit de sa connaissance du marché : il rogne la commission.
  const courtier = 1 - Math.min(0.5, (state.base.postes && state.base.postes.courtier
    ? state.base.postes.courtier : 0) * 0.08);
  const part = c.commission * courtier;
  const brut = unite * n;
  const frais = Math.round(brut * part);
  return {
    ok: true,
    comptoir: c,
    unite,
    qte: n,
    brut: Math.round(brut),
    frais,
    total: sens === 'achat' ? Math.round(brut) + frais : Math.round(brut) - frais,
    part,
  };
}

/** Le cours d'une matière, tel qu'on l'affiche : valeur et écart au prix de base. */
export function ligneCours(prix, key) {
  const base = COMMODITIES[key].prix;
  const v = prix[key];
  return { key, valeur: v, ecart: base > 0 ? (v - base) / base : 0 };
}
