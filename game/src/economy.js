// Économie locale : chaque colonie produit, consomme, et fixe ses prix à partir
// de son propre stock. Une ville affamée paie les rations au prix fort ; une
// ville assise sur une mine brade son minerai.

import {
  COMMODITIES, COMMODITY_KEYS, BIOMES, ITEMS, FACTIONS,
  ETAL_PAR_STYLE, PALIERS_ITEM,
} from './data.js';
import { comp, gagnerXp, portage, XP_PRATIQUE } from './characters.js';
import { remiseDe, palierBonus } from './allegeance.js';
import { distance as distanceCases } from './world.js';
import { groupeActif } from './groupes.js';
import {
  METIERS_VILLE, METIER_VILLE_KEYS, PART_ACTIVE, VOCATION_BIOME, VOCATION_STYLE, POIDS_BASE,
} from './data.js';
import {
  pourvoirCharges, tickNotables, rendementNotables, margeMarchand, ordreDe,
} from './notables.js';
import { tickServices } from './services.js';
import { portageAttelage } from './betes.js';

/** Stock « confortable » visé par une colonie pour une marchandise. */
export function cibleStock(col, key) {
  const p = col.pop;
  switch (key) {
    case 'rations': return p * 0.9;
    case 'biomasse': return p * 0.5;
    case 'ferraille': return p * 0.7;
    case 'minerai': return p * 0.4;
    case 'polymere': return p * 0.35;
    case 'carburant': return p * 0.2;
    case 'alliage': return p * 0.15;
    case 'isotope': return p * 0.06;
    case 'composant': return p * 0.08;
    case 'medkit': return p * 0.03;
    default: return p * 0.3;
  }
}

/** Prix unitaire courant, tiré de la tension offre/demande. */
export function prixUnitaire(col, key) {
  const base = COMMODITIES[key].prix;
  const cible = Math.max(1, cibleStock(col, key));
  const stock = Math.max(0, col.stock[key] || 0);
  // Rapport stock/cible → facteur borné [0.45, 3.2]
  const tension = cible / (stock + cible * 0.35);
  const f = Math.max(0.45, Math.min(3.2, Math.pow(tension, 0.85)));
  return base * f * (1 + col.unrest * 0.35);
}

/**
 * Prix effectifs pour le joueur.
 * `habilete` : compétence de commerce du meilleur négociateur (0-100).
 * `repu`     : réputation avec la faction propriétaire (−100..100).
 */
export function prixJoueur(col, key, habilete = 0, repu = 0, remise = 0) {
  const p = prixUnitaire(col, key);
  // La marge n'est pas une constante du monde : c'est celle d'un homme, avec
  // son caractère, son métier et ce qu'il pense de vous.
  const marge = Math.max(0.02,
    0.18 + margeMarchand(col) - habilete / 900 - Math.max(0, repu) / 1400 - remise);
  const majorationHostile = repu < -20 ? 0.15 + Math.min(0.4, -repu / 220) : 0;
  // Non arrondi volontairement : arrondir à l'unité écraserait la marge sur les
  // marchandises bon marché et rendrait l'aller-retour achat/revente gratuit.
  return {
    achat: Math.max(0.5, p * (1 + marge + majorationHostile)),
    vente: Math.max(0.25, p * (1 - marge - majorationHostile * 0.5)),
  };
}

/**
 * Fertilité agricole du biome. Une ville ne se contente pas de ramasser ce que
 * le terrain offre : elle cultive. Sans ça, aucune colonie n'est à l'équilibre
 * alimentaire et la carte se vide toute seule en quelques saisons.
 */
export const FERTILITE = {
  marais: 1.45, steppe: 1.15, dalles: 0.95, canyons: 0.8,
  plastique: 0.75, friche: 0.7, desert: 0.65, brulees: 0.6, relais: 0.5,
};

// ---------------------------------------------------------------------------
// Métiers d'une ville
// ---------------------------------------------------------------------------

/** Combien de gens travaillent ici. Le reste mange sans produire. */
export function actifs(col) {
  return Math.max(1, Math.round(col.pop * PART_ACTIVE));
}

/**
 * Répartition initiale : la vocation du biome, corrigée par le tempérament de
 * la faction. Une ville des canyons fait des mineurs, une commune des marais
 * des paysans, une garnison des miliciens.
 */
export function emploisInitiaux(world, col, rng) {
  const biome = world.regions[col.regionId].biome;
  const style = col.faction && FACTIONS[col.faction] ? FACTIONS[col.faction].style : null;
  const poids = {};
  // Tout le monde a un peu de tout — mais pas la même part de tout : voir
  // POIDS_BASE, et la mesure qui l'a rendu nécessaire.
  for (const k of METIER_VILLE_KEYS) poids[k] = POIDS_BASE[k] ?? 0.35;
  const voc = VOCATION_BIOME[biome] || {};
  for (const k of Object.keys(voc)) poids[k] += voc[k];
  const st = (style && VOCATION_STYLE[style]) || {};
  for (const k of Object.keys(st)) poids[k] += st[k];
  // Un peu de bruit : deux villes du même biome ne se ressemblent pas trait
  // pour trait.
  if (rng) for (const k of METIER_VILLE_KEYS) poids[k] *= rng.range(0.8, 1.2);
  return repartir(poids, actifs(col));
}

/** Convertit des poids en effectifs entiers dont la somme vaut `total`. */
function repartir(poids, total) {
  let somme = 0;
  for (const k of METIER_VILLE_KEYS) somme += poids[k];
  const out = {};
  let place = 0;
  for (const k of METIER_VILLE_KEYS) {
    out[k] = Math.floor((poids[k] / somme) * total);
    place += out[k];
  }
  // Le reste va au métier le plus lourd : arrondir vers le bas partout perdrait
  // jusqu'à six personnes par ville.
  let meilleur = METIER_VILLE_KEYS[0];
  for (const k of METIER_VILLE_KEYS) if (poids[k] > poids[meilleur]) meilleur = k;
  out[meilleur] += total - place;
  return out;
}

/** Effectif d'un métier, borné : une ville qui a fondu réaffecte ses gens. */
export function emploi(col, key) {
  return Math.max(0, Math.round((col.emplois && col.emplois[key]) || 0));
}

/**
 * La main-d'œuvre se redéploie lentement vers ce qui manque. Une ville qui a
 * faim met des bras aux cultures ; une ville en guerre arme les siens. C'est
 * lent à dessein — on ne reconvertit pas un mineur en paysan en une nuit.
 */
/** Période de reconversion, en heures de jeu. */
export const PERIODE_EMPLOIS = 24;

export function ajusterEmplois(world, col, rng, dt = 1) {
  if (!col.emplois) { col.emplois = emploisInitiaux(world, col, rng); col.majEmplois = 0; }
  // Une reconversion se compte en semaines : la recalculer à chaque tranche de
  // colonie coûterait huit fois plus cher pour un résultat identique.
  //
  // On compte des heures, pas des appels. Depuis que les villes lointaines
  // avancent par demi-journées (voir PAS_LOIN), compter les appels revenait à
  // reconvertir quatre fois plus lentement là-bas qu'ici — le niveau de détail
  // n'a pas à changer le comportement social d'une ville.
  col.majEmplois = (col.majEmplois || 0) + dt;
  if (col.majEmplois < PERIODE_EMPLOIS) return;
  const pas = col.majEmplois;
  col.majEmplois = 0;
  const cible = actifs(col);
  let total = 0;
  for (const k of METIER_VILLE_KEYS) total += emploi(col, k);
  if (total <= 0) { col.emplois = emploisInitiaux(world, col, rng); return; }

  // La population a bougé : on met à l'échelle avant toute chose.
  if (Math.abs(total - cible) > Math.max(2, cible * 0.04)) {
    const f = cible / total;
    for (const k of METIER_VILLE_KEYS) col.emplois[k] = Math.round(emploi(col, k) * f);
    total = cible;
  }

  // Puis on déplace quelques bras vers ce qui presse.
  const vivres = col.stock.rations || 0;
  const faim = vivres < col.pop * 0.6;
  const menace = (col.assiege || col.declin > 0.3) ? true : false;
  const versQuoi = faim ? 'paysan' : menace ? 'milicien' : null;
  if (!versQuoi) return;
  const bougent = Math.max(1, Math.round(cible * 0.004 * pas));
  // On prend chez le plus gros métier qui n'est pas la cible.
  let source = null;
  for (const k of METIER_VILLE_KEYS) {
    if (k === versQuoi) continue;
    if (!source || emploi(col, k) > emploi(col, source)) source = k;
  }
  if (!source || emploi(col, source) <= bougent) return;
  col.emplois[source] = emploi(col, source) - bougent;
  col.emplois[versQuoi] = emploi(col, versQuoi) + bougent;
}

/**
 * Production horaire d'une colonie, dérivée de qui y travaille. Deux villes de
 * même taille dans le même biome ne rendent plus la même chose si l'une a mis
 * ses bras aux cultures et l'autre à la mine.
 */
export function productionColonie(world, col) {
  const biomeKey = world.regions[col.regionId].biome;
  const biome = BIOMES[biomeKey];
  const richesse = world.regions[col.regionId].richesse;
  const prod = {};
  if (!col.emplois) col.emplois = emploisInitiaux(world, col, null);

  // Chaque ressource du biome revient au métier qui la tire : le minerai aux
  // mineurs, le vivant aux paysans, tout le reste — ferraille, polymère,
  // carburant, isotope — à ceux qui démontent.
  //
  // Le coefficient par tête est calibré, pas deviné : à l'ancienne formule la
  // production tenait à `pop × 0.012`, et un actif représente un peu moins d'un
  // dixième d'une population. Le sous-estimer d'un facteur vingt — ce qui était
  // le cas au premier jet — assèche les trésors des factions, qui ne lèvent plus
  // d'armées, et fige la carte politique.
  const PAR_TETE = 0.115 * richesse;
  for (const k of Object.keys(biome.yields)) {
    const gens = k === 'minerai' ? emploi(col, 'mineur')
      : k === 'biomasse' ? emploi(col, 'paysan')
        : emploi(col, 'ferrailleur');
    prod[k] = (prod[k] || 0) + biome.yields[k] * gens * PAR_TETE;
  }

  // Les paysans cultivent en plus de ce qu'ils cueillent : c'est la fertilité du
  // sol qui décide combien, et c'est ce qui met une ville à l'équilibre.
  //
  // Les deux coefficients sortent d'un balayage, pas d'une intuition : ils
  // fixent à la fois le ratio vivres du monde (~1,3, le point où les villes
  // tiennent sans proliférer) et, indirectement, les trésors des factions —
  // trop peu, elles ne lèvent plus d'armées et la carte politique se fige.
  const paysans = emploi(col, 'paysan');
  prod.biomasse = (prod.biomasse || 0) + paysans * 0.02 * (FERTILITE[biomeKey] ?? 1);
  const enRations = Math.min(prod.biomasse, paysans * 0.075);
  prod.rations = (prod.rations || 0) + enRations * 0.85;
  prod.biomasse = Math.max(0, prod.biomasse - enRations);

  // Les artisans transforment. Sans eux, une ville reste un tas de minerai.
  const art = emploi(col, 'artisan');
  if (art > 0) {
    prod.alliage = (prod.alliage || 0) + Math.min(prod.minerai || 0, art * 0.06) * 0.5;
    prod.composant = (prod.composant || 0) + art * 0.0114;
  }
  const med = emploi(col, 'medecin');
  if (med > 0) prod.medkit = (prod.medkit || 0) + med * 0.0015;

  // Le contremaître de la ville, s'il y en a un, fait la différence entre une
  // production qui tourne et une qui traîne.
  const boost = rendementNotables(col);
  if (boost !== 1) for (const k of Object.keys(prod)) prod[k] *= boost;
  return prod;
}

/**
 * Une ville qui manque se rationne avant de mourir. Sans cette élasticité,
 * une mauvaise saison suffit à vider la carte de ses habitants.
 */
/**
 * Ce que les cantiniers font gagner. Servir cinq cents repas à heure fixe, c'est
 * moins de gâchis qu'autant de foyers qui cuisinent chacun pour soi : jusqu'à
 * un cinquième de vivres en moins pour le même nombre de bouches.
 */
export function economieCantine(col) {
  const n = emploi(col, 'cantinier');
  if (n <= 0) return 1;
  return 1 - Math.min(0.2, (n / Math.max(1, actifs(col))) * 1.6);
}

export function consommationColonie(col) {
  const vivres = col.stock.rations || 0;
  const confort = Math.max(1, col.pop * 0.9);
  const serrage = Math.max(0.45, Math.min(1, 0.45 + (vivres / confort) * 0.9));
  const cantine = economieCantine(col);
  return {
    rations: col.pop * 0.014 * serrage * cantine,
    // On garde le coefficient sous la main : tickColonie en a besoin lui aussi
    // et le recalculer coûterait un deuxième passage sur les métiers.
    cantine,
    biomasse: col.pop * 0.006 * serrage,
    carburant: col.pop * 0.0022 * col.taille * serrage,
    ferraille: col.pop * 0.004,
    composant: col.pop * 0.00018 * col.taille,
    medkit: col.pop * 0.00006,
  };
}

/** Une ville morte ne produit plus, ne commerce plus, ne recrute plus. */
export function estVivante(col) {
  return !!col && !col.ruine;
}

/**
 * Une heure de vie économique et sociale pour une colonie.
 * `climat` module les rendements : une saison sèche ne nourrit pas une ville
 * comme une saison de pluies.
 */
export function tickColonie(world, col, rng, climat, dt = 1, reputation = 0, log = null, t = 0, present = false, aDeQuoi = null) {
  if (col.ruine) return null;
  ajusterEmplois(world, col, rng, dt);
  pourvoirCharges(col, rng, t);
  tickNotables(col, rng, dt, reputation, log, t);
  tickServices(col, rng, dt, t, present, aDeQuoi);
  const prod = productionColonie(world, col);
  const cons = consommationColonie(col);
  // `dt` : nombre d'heures couvertes par cet appel. Une économie de colonie n'a
  // aucun besoin d'une résolution horaire ; la traiter par tranches divise le
  // coût du tick sans que rien ne se voie en jeu. Une probabilité horaire p
  // devient 1-(1-p)^dt sur la tranche, pas p×dt : la différence compte dès que
  // p n'est plus minuscule.
  const surDt = (p) => (dt === 1 ? p : 1 - Math.pow(1 - p, dt));

  for (const k of COMMODITY_KEYS) {
    if (k === 'rations') continue; // traité à part, c'est la survie
    // Une ville encaisse mieux les saisons qu'une escouade : elle a des
    // réserves, des serres, des habitudes. On amortit donc l'effet de moitié.
    const brut = climat ? climat.rendement(k) : 1;
    const amorti = 1 + (brut - 1) * 0.45;
    const p = (prod[k] || 0) * amorti * dt;
    const c = (cons[k] || 0) * dt;
    col.stock[k] = Math.max(0, (col.stock[k] || 0) + p - c);
  }

  // --- Vivres. On sert ce qu'on peut ; la satiété commande tout le reste.
  const amortiVivant = climat ? 1 + (climat.rendement('rations') - 1) * 0.45 : 1;
  const arrivage = (prod.rations || 0) * amortiVivant * dt;
  const besoin = col.pop * 0.014 * (cons.cantine || 1) * dt;
  const disponible = (col.stock.rations || 0) + arrivage;
  const servi = Math.min(besoin, disponible);
  col.stock.rations = Math.max(0, disponible - servi);
  const satiete = besoin > 0 ? servi / besoin : 1;

  // Surextension : une faction qui tient trop de villes, trop loin de sa
  // capitale, les tient mal. C'est le frein qui empêche un vainqueur d'avaler
  // la carte entière.
  if (col.faction && world.factions[col.faction]) {
    const f = world.factions[col.faction];
    const cap = f.capitale && world.colonies.find((c) => c.id === f.capitale);
    const eloignement = cap ? distanceCases(world, cap.regionId, col.regionId) : 0;
    const surcharge = Math.max(0, f.colonies.length - 3);
    const tension = (eloignement * 0.00016 + surcharge * 0.00035) * dt;
    if (tension > 0) col.unrest = Math.min(1, col.unrest + tension);
  }

  if (satiete < 0.8) {
    // On se serre la ceinture, puis on s'énerve, puis on s'en va.
    col.unrest = Math.min(1, col.unrest + 0.004 * (0.8 - satiete) / 0.8 * dt);
    if (rng.chance(surDt(0.05 * (0.8 - satiete) / 0.8))) {
      col.pop = Math.max(25, col.pop - rng.irange(1, 3));
    }
  } else {
    // Le chef de la ville pèse sur ce que l'agitation retombe ou non : un dur
    // tient sa place, un bonhomme la laisse filer.
    col.unrest = Math.max(0, col.unrest - (0.0035 + ordreDe(col) * 0.006) * dt);
    // La croissance suit l'abondance, pas le hasard seul.
    const abondance = Math.min(1, (col.stock.rations || 0) / Math.max(1, col.pop * 0.6));
    if (rng.chance(surDt(0.03 + abondance * 0.05))) col.pop += rng.irange(0, 2);
  }
  col.pop = Math.min(col.taille * 900, col.pop);

  // Reconstruction de la défense
  // Les ouvriers montent et remontent les murs. Sans eux une ville qui a pris
  // un assaut reste éventrée : la défense repoussait, jamais la muraille.
  const ouvriers = emploi(col, 'ouvrier');
  if (ouvriers > 0 && col.murs < col.taille * 6) {
    col.murs += Math.min(0.02, (ouvriers / Math.max(1, actifs(col))) * 0.09) * dt;
  }

  if (col.defense < col.defenseMax) {
    // Une ville agitée (unrest > 1) voit sa garnison fondre : le terme devient
    // négatif, et il faut donc borner des deux côtés. Sans le plancher, une
    // tranche de douze heures pouvait faire passer la défense sous zéro — ce
    // qui ne s'était jamais vu tant que les tranches faisaient trois heures.
    col.defense = Math.max(0, Math.min(
      col.defenseMax,
      col.defense + col.defenseMax * 0.004 * (1 + ouvriers / Math.max(1, actifs(col)) * 1.2)
        * (1 - col.unrest) * dt
    ));
  }
  col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);

  // Plafond de stock : on ne stocke pas l'infini
  for (const k of COMMODITY_KEYS) {
    const plafond = cibleStock(col, k) * 4;
    if (col.stock[k] > plafond) col.stock[k] = plafond;
  }

  // --- Une ville n'est pas un décor : elle grandit ou elle meurt. Mais
  // l'effondrement doit rester un événement marquant, pas la norme : il faut
  // une agonie longue et profonde, et le monde garde toujours un socle de
  // villes vivantes.
  col.declin = col.declin || 0;
  if (col.pop < 55 && col.unrest > 0.75) col.declin += dt;
  else col.declin = Math.max(0, col.declin - 4 * dt);

  // Sécession : une ville occupée, affamée et exaspérée retourne à sa maison
  // d'origine — quitte à la ressusciter. C'est le contre-pouvoir qui empêche
  // la carte de finir en monoculture.
  if (col.factionOrigine && col.faction && col.faction !== col.factionOrigine
      && col.unrest > 0.6 && rng.chance(surDt(0.0012 * (col.unrest - 0.6) / 0.4))
      && world.factions[col.faction].colonies.length > 1) {
    return { evenement: 'secession' };
  }

  // Révolte. Une ville qui gronde à quatre-vingts pour cent n'avait aucune
  // issue : elle mijotait indéfiniment, et l'impôt confiscatoire ou la justice
  // expéditive ne coûtaient rien de plus qu'un chiffre qui montait. Au-delà de
  // ce qu'une population supporte, elle se lève — et c'est la garnison qui
  // décide de la suite, pas un dé.
  //
  // Le seuil et le délai sont hauts, et ce n'est pas de la prudence : dans ce
  // monde, la grogne moyenne est de 0,57 et une trentaine de villes campent
  // au-dessus de 0,78 en permanence. Réglée à 0,78 sans délai, l'émeute
  // remplissait cent vingt lignes du journal sur quatre cents. Une révolte doit
  // rester un événement ; celle qu'on lit trois fois par jour n'en est plus un.
  if (col.faction && col.unrest > SEUIL_REVOLTE
      && t - (col.derniereRevolte || -DELAI_REVOLTE) >= DELAI_REVOLTE
      && rng.chance(surDt(0.0015 * (col.unrest - SEUIL_REVOLTE) / (1 - SEUIL_REVOLTE)))) {
    return { evenement: 'revolte' };
  }

  if (col.pop > col.taille * 620 && col.unrest < 0.3 && col.taille < 3) {
    col.taille += 1;
    col.murs += 2;
    return { evenement: 'croissance' };
  }
  if (col.declin > 900) {
    const vivantes = world.colonies.filter((c) => !c.ruine).length;
    const socle = Math.max(6, Math.round(world.colonies.length * 0.6));
    // On n'abandonne pas la dernière ville d'une faction : ce serait la rayer
    // de la carte par la démographie après l'avoir protégée des armées.
    const derniere = col.faction && world.factions[col.faction]
      && world.factions[col.faction].colonies.length <= 1;
    if (vivantes > socle && !derniere) return { evenement: 'effondrement' };
    col.declin = 600; // en sursis : on ne vide pas la carte
    if (derniere) {
      // Une capitale acculée reçoit du renfort des siens : elle ne meurt pas.
      col.unrest = Math.max(0, col.unrest - 0.02);
      col.pop = Math.max(col.pop, 60);
    }
  }
  return null;
}

/** Au-delà, une ville ne se contente plus de gronder. */
export const SEUIL_REVOLTE = 0.86;

/** Une ville qui vient de se soulever ne recommence pas le mois suivant. */
export const DELAI_REVOLTE = 900;

/**
 * La ville se lève. Ce qui décide, c'est le rapport de force — une garnison
 * nombreuse derrière de bons murs mate une foule, une garnison fondue par la
 * guerre ne mate rien du tout. On ne tire pas au sort le vainqueur : on
 * compare, et le joueur qui a fait relever les murs de sa ville en récolte le
 * bénéfice exactement là où il l'attendait.
 */
export function faireRevolte(world, col, rng, t) {
  col.derniereRevolte = t;
  // Une foule, c'est du monde. Écrite d'abord à 0,045 par tête, elle valait
  // onze hommes pour une ville de trois cents habitants furieux, contre une
  // garnison de soixante-quinze : la garnison gagnait toujours, et l'émeute
  // n'était qu'une ligne de journal. Trois cents personnes en colère, c'est
  // une force réelle — que de bons murs et une garnison entière contiennent,
  // et qu'une garnison fondue par la guerre ne contient pas.
  const foule = col.pop * col.unrest * 0.35 * rng.range(0.8, 1.25);
  const garnison = (col.defense || 0) + col.murs * 3;
  // Une geôle pleine se vide toujours dans une émeute : c'est la première
  // porte qu'on enfonce. (On efface le champ plutôt que d'importer justice.js,
  // qui vient plus tard dans l'ordre des modules.)
  const liberes = col.geole ? col.geole.detenus.length : 0;
  col.geole = null;

  if (garnison >= foule) {
    // Matée. La ville se tait, mais elle se souvient — et elle a payé cher :
    // des morts, des murs ébréchés, une garnison qui n'est plus ce qu'elle
    // était. Une seconde révolte serait bien plus difficile à contenir.
    col.unrest = 0.42;
    col.pop = Math.max(40, Math.round(col.pop * 0.94));
    col.defense = Math.round((col.defense || 0) * 0.45);
    return { issue: 'matee', liberes };
  }

  // La foule l'emporte. Une ville prise de force à quelqu'un revient à sa
  // maison ; une ville qui n'a jamais appartenu qu'à ses maîtres devient libre,
  // c'est-à-dire sans loi. Ce n'est pas une récompense : plus de prime, plus
  // d'intendance, et l'on y vend ce qu'on veut.
  const ancienne = col.faction;
  if (col.factionOrigine && col.factionOrigine !== ancienne
      && world.factions[col.factionOrigine]) {
    const r = faireSecession(world, col);
    return { issue: 'secession', liberes, ...r };
  }
  const f = world.factions[ancienne];
  if (f) {
    f.colonies = f.colonies.filter((id) => id !== col.id);
    if (f.capitale === col.id) f.capitale = f.colonies[0] || null;
  }
  col.faction = null;
  col.factionOrigine = null;
  col.contrats = [];
  col.unrest = 0.5;
  col.defense = Math.round(col.defenseMax * 0.2);
  col.pop = Math.max(40, Math.round(col.pop * 0.9));
  world.regions[col.regionId].controle = null;
  return { issue: 'affranchie', liberes, ancienne };
}

/** Rend une colonie à sa faction d'origine, en la ressuscitant s'il le faut. */
export function faireSecession(world, col) {
  const ancienne = col.faction;
  const rendue = col.factionOrigine;
  if (ancienne && world.factions[ancienne]) {
    const f = world.factions[ancienne];
    f.colonies = f.colonies.filter((id) => id !== col.id);
    if (f.capitale === col.id) f.capitale = f.colonies[0] || null;
  }
  col.faction = rendue;
  const cible = world.factions[rendue];
  if (!cible.colonies.includes(col.id)) cible.colonies.push(col.id);
  if (!cible.capitale) cible.capitale = col.id;
  cible.prochainConseil = Math.min(cible.prochainConseil, 20);
  world.regions[col.regionId].controle = rendue;
  col.unrest = 0.3;
  col.defense = Math.round(col.defenseMax * 0.5);
  return { ancienne, rendue, renaissance: cible.colonies.length === 1 };
}

/** Transforme une colonie en ruine : la carte garde la cicatrice. */
export function effondrer(world, col) {
  col.ruine = true;
  col.contrats = [];
  col.etal = null;
  const ancienne = col.faction;
  if (ancienne && world.factions[ancienne]) {
    const f = world.factions[ancienne];
    f.colonies = f.colonies.filter((id) => id !== col.id);
    if (f.capitale === col.id) f.capitale = f.colonies[0] || null;
  }
  col.faction = null;
  const r = world.regions[col.regionId];
  r.controle = null;
  // Ce qu'il reste se fouille : une ville morte, c'est un site de plus.
  r.site = { type: 'ville_morte', connu: true, fouille: false };
  return ancienne;
}

// ---------------------------------------------------------------------------
// Transactions du joueur
// ---------------------------------------------------------------------------

export function meilleurCommercant(squad) {
  let best = null;
  for (const c of squad) {
    if (c.etat === 'mort') continue;
    if (!best || comp(c, 'commerce') > comp(best, 'commerce')) best = c;
  }
  return best;
}

export function poidsInventaire(inv) {
  let w = 0;
  for (const k of Object.keys(inv)) {
    if (!COMMODITIES[k]) continue;
    w += inv[k] * COMMODITIES[k].poids;
  }
  return w;
}

/**
 * Achat par le joueur. Retourne { ok, motif, qte, cout }.
 * Le prix bouge au fur et à mesure de la transaction : acheter tout le stock
 * d'une petite ville coûte cher.
 */
export function acheter(state, col, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  const negoc = meilleurCommercant(g.membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  let restant = Math.floor(qte);
  let cout = 0;
  let achetes = 0;

  const capacite = capacitePortage(state, g);
  const libre = capacite - poidsInventaire(g.inventaire);
  const poidsU = COMMODITIES[key].poids;
  const maxPoids = poidsU > 0 ? Math.floor(libre / poidsU) : restant;
  if (maxPoids <= 0) return { ok: false, motif: 'Sac plein.', qte: 0, cout: 0 };
  restant = Math.min(restant, maxPoids);

  while (restant > 0) {
    if ((col.stock[key] || 0) < 1) break;
    const p = prixJoueur(col, key, hab, repu, remiseDe(state, col.faction)).achat;
    if (state.player.credits - cout < p) break;
    cout += p;
    col.stock[key] -= 1;
    achetes += 1;
    restant -= 1;
  }
  if (achetes === 0) return { ok: false, motif: 'Rien à acheter à ce prix.', qte: 0, cout: 0 };
  cout = Math.round(cout);
  state.player.credits -= cout;
  g.inventaire[key] = (g.inventaire[key] || 0) + achetes;
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.5 + achetes * 0.3);
  return { ok: true, qte: achetes, cout };
}

export function vendre(state, col, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  const negoc = meilleurCommercant(g.membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  let restant = Math.min(Math.floor(qte), g.inventaire[key] || 0);
  let gain = 0;
  let vendus = 0;
  while (restant > 0) {
    const p = prixJoueur(col, key, hab, repu, remiseDe(state, col.faction)).vente;
    gain += p;
    col.stock[key] = (col.stock[key] || 0) + 1;
    vendus += 1;
    restant -= 1;
  }
  if (vendus === 0) return { ok: false, motif: 'Rien à vendre.', qte: 0, gain: 0 };
  gain = Math.round(gain);
  g.inventaire[key] -= vendus;
  state.player.credits += gain;
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.5 + vendus * 0.3);
  return { ok: true, qte: vendus, gain };
}

/** Capacité de portage d'un groupe. Ce qu'il porte, il le porte lui-même. */
export function capacitePortage(state, groupe) {
  const g = groupe || groupeActif(state);
  let cap = 0;
  const bonus = (state.base.recherche.logistique || 0) * 0.15;
  for (const c of (g ? g.membres : [])) {
    // Un mort ne porte plus rien, un K.O. est lui-même porté par les autres, et
    // un élève est resté en ville avec ses affaires.
    if (c.etat === 'mort' || c.etat === 'ko') continue;
    if ((c.formation && c.formation.restant > 0) || c.enseigne) continue;
    cap += portage(c, bonus);
  }
  // Ce que l'attelage porte à leur place. C'est là tout son intérêt : un convoi
  // qui passe soixante-dix pour cent de ses départs à faire la navette avec la
  // ville n'a pas besoin d'un plus grand sac, il a besoin de quelqu'un pour le
  // porter.
  cap += portageAttelage(g);
  return Math.round(cap);
}

/** Valeur marchande approximative d'un lot, pour l'UI. */
export function valeurLot(lot) {
  let v = 0;
  for (const k of Object.keys(lot)) {
    if (COMMODITIES[k]) v += lot[k] * COMMODITIES[k].prix;
  }
  return Math.round(v);
}

// ---------------------------------------------------------------------------
// Étal d'équipement
// ---------------------------------------------------------------------------
// Chaque ville tient boutique selon le style de sa faction et sa taille.
// Le stock se renouvelle : revenir plus tard vaut le coup.

const DUREE_ETAL = 180; // heures avant renouvellement

export function genererEtal(rng, world, col, t, bonusPalier = 0) {
  const style = FACTIONS[col.faction] ? FACTIONS[col.faction].style : 'commune';
  const catalogue = ETAL_PAR_STYLE[style] || ETAL_PAR_STYLE.commune;
  const palierMax = Math.min(3, (col.taille >= 3 ? 3 : col.taille >= 2 ? 2 : 1) + bonusPalier);
  const possibles = catalogue.filter((k) => (PALIERS_ITEM[k] ?? 0) <= palierMax);
  const combien = Math.min(possibles.length, rng.irange(2, 2 + col.taille * 2));
  const choisis = rng.shuffle(possibles).slice(0, combien);
  col.etal = {
    expire: t + DUREE_ETAL + rng.irange(0, 80),
    items: choisis.map((key) => ({
      key,
      qte: rng.irange(1, ITEMS[key].type === 'greffe' ? 1 : 3),
      // Chaque ville a sa propre humeur sur les prix
      coef: Number(rng.range(0.85, 1.3).toFixed(2)),
    })),
  };
  return col.etal;
}

export function etalDe(world, col, rng, t, bonusPalier = 0) {
  if (!col.etal || t >= col.etal.expire) genererEtal(rng, world, col, t, bonusPalier);
  return col.etal;
}

/** Prix d'un objet pour le joueur, achat et revente. */
export function prixItem(col, key, coef = 1, habilete = 0, repu = 0, remise = 0) {
  const base = ITEMS[key].prix * coef * (1 + col.unrest * 0.2);
  const marge = Math.max(0.03, 0.28 - habilete / 700 - Math.max(0, repu) / 900 - remise);
  const hostile = repu < -20 ? 0.2 + Math.min(0.5, -repu / 200) : 0;
  return {
    achat: Math.round(base * (1 + marge + hostile)),
    // On revend toujours mal : les armes d'occasion n'intéressent personne.
    vente: Math.round(base * 0.42 * (1 - hostile * 0.5)),
  };
}

export function acheterItem(state, col, index, groupe) {
  const g = groupe || groupeActif(state);
  const etal = col.etal;
  if (!etal || !etal.items[index]) return { ok: false, motif: 'Article déjà parti.' };
  const ligne = etal.items[index];
  if (ligne.qte <= 0) return { ok: false, motif: 'Rupture de stock.' };
  if (g.objets.length >= 40) return { ok: false, motif: 'Réserve d’équipement pleine.' };

  const negoc = meilleurCommercant(g.membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  const p = prixItem(col, ligne.key, ligne.coef, hab, repu, remiseDe(state, col.faction)).achat;
  if (state.player.credits < p) return { ok: false, motif: `Il manque ${p - state.player.credits} cr.` };

  state.player.credits -= p;
  ligne.qte -= 1;
  g.objets.push(ligne.key);
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 1.2);
  return { ok: true, prix: p, nom: ITEMS[ligne.key].nom };
}

export function vendreItem(state, col, indexObjet, groupe) {
  const g = groupe || groupeActif(state);
  const key = g.objets[indexObjet];
  if (!key) return { ok: false, motif: 'Objet introuvable.' };
  const negoc = meilleurCommercant(g.membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  const p = prixItem(col, key, 1, hab, repu, remiseDe(state, col.faction)).vente;
  g.objets.splice(indexObjet, 1);
  state.player.credits += p;
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.9);
  return { ok: true, prix: p, nom: ITEMS[key].nom };
}
