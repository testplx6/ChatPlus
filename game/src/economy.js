// Économie locale : chaque colonie produit, consomme, et fixe ses prix à partir
// de son propre stock. Une ville affamée paie les rations au prix fort ; une
// ville assise sur une mine brade son minerai.

import {
  COMMODITIES, COMMODITY_KEYS, BIOMES, ITEMS, FACTIONS, drapeauDe, symboleDe,
  ETAL_PAR_STYLE, PALIERS_ITEM, MENAGES,
} from './data.js';
import { comp, gagnerXp, portage, XP_PRATIQUE } from './characters.js';
import { remiseDe, palierBonus } from './allegeance.js';
import { distance as distanceCases, rendementRegion, colonieParId } from './world.js';
import { prixAvecBourse } from './bourse.js';
import { groupeActif } from './groupes.js';
import {
  METIERS_VILLE, METIER_VILLE_KEYS, PART_ACTIVE, VOCATION_BIOME, VOCATION_STYLE, POIDS_BASE,
} from './data.js';
import {
  pourvoirCharges, tickNotables, rendementNotables, margeMarchand, ordreDe,
} from './notables.js';
import { tickServices, estime } from './services.js';
import { portageAttelage } from './betes.js';
import { loiIci, loisDe } from './lois.js';
import {
  sortirDuCircuit, transfererVille, coursMonnaie,
  gagner, regler, soldeIci, signeIci,
  solde, crediterBourse, debiterBourse, taux, ecartChange,
} from './monnaie.js';

/**
 * La caisse d'une ville.
 *
 * Avant elle, aucune ville n'avait de crédits : les seules bourses au sens
 * comptable étaient le trésor des factions et la poche du joueur. Le trésor,
 * lui, se remplissait à 84 % par une planche à billets — l'arrivée d'une
 * caravane créditait la faction expéditrice de 35 % de la cargaison, et
 * *personne* ne payait, la ville destinataire recevant la marchandise pour
 * rien. Mesuré sur trois parties de six mille heures : 2,17 millions de crédits
 * créés à partir de rien, un revenu proportionnel au nombre de convois qu'on
 * fait circuler — donc au nombre de villes — et une carte coupée en deux, une
 * médiane à 52 000 crédits et un tiers des factions sous 500 pour toujours. Une
 * faction réduite à une ville ne faisait plus circuler aucun convoi interne :
 * son revenu tombait à 0,2 crédit par heure et elle ne pouvait plus jamais rien
 * ordonner — ni bourse, ni garnison, ni grenier.
 *
 * Ce qui remplace : une ville gagne ce qu'elle vend, paie ce qu'elle achète, et
 * sa faction prélève au passage. Le trésor d'une faction est littéralement ce
 * que ses villes ont gagné.
 *
 * `marge` est la part de ce qui se vend sur place qui devient de l'argent, et
 * non de la marchandise qui change de main. Ce n'est pas la production entière :
 * une ville ne s'enrichit que de ce qui trouve preneur, d'où le `min(offre,
 * besoin)` de `revenuInterne`.
 */
export const CAISSE = {
  marge: 0.10,
  parTete: 12,
  /**
   * La part de ce que la ville produit qui repart en salaires, chez ses gens.
   *
   * **0,55 → 0,70, et c'est la mesure de la satiété qui l'a dicté.** Tant qu'on
   * réglait contre `nourries`, tout poussait dans l'autre sens : baisser la part
   * salariale appauvrit les habitants, donc ils achètent moins, donc les greniers
   * restent pleins, donc « villes bien nourries » monte. On calibrait à l'envers
   * sans le voir, faute d'un chiffre qui dise ce que les gens ont réellement
   * mangé.
   *
   * Balayé sur six graines et six mille heures, une fois `col.satiete` visible :
   *
   *     part    villes    pop      satiété   à la diète   caisse méd
   *     0,55      459    79 955     0,752       59 %         435
   *     0,60      406    79 527     0,794       51 %         243
   *     0,65      443    82 924     0,796       52 %         223
   *     0,70      453    84 047     0,843       48 %         117
   *     0,75      415    86 390     0,830       47 %           0
   *     0,80      431    82 592     0,785       49 %           0
   *
   * Confirmé sur huit graines indépendantes : 0,55 → 0,70 fait passer la satiété
   * de 0,790 à 0,845 **et la population de 107 131 à 121 800**. Plus de monde,
   * mieux nourri : ce n'est pas un arbitrage, c'est un réglage qui était faux.
   *
   * 0,70 est aussi la dernière valeur sûre côté caisse. Au-delà, la caisse
   * médiane des villes tombe à zéro — elles vident leur fonds de roulement en
   * salaires et ne rachètent plus rien. C'est un bord de falaise, pas une pente.
   *
   * **Et pourtant la valeur reste à 0,55, parce que 0,70 casse l'invariance à la
   * maille.** Mesuré à `banc --maille`, erreur locale sur une journée depuis un
   * état identique :
   *
   *     pas 24        rations    agitation    caisse    ménages
   *     0,55           -0,010       0,000     +0,000     +0,000
   *     0,70           -0,314       0,000     +0,104     -0,007
   *
   * Trente fois pire sur les rations, pour une cible à 0,1 (`MAILLE.md` §5). Sur
   * quarante jours, l'agitation passe de +0,065 à +0,367 pour un plancher de
   * bruit de ±0,141. Ce n'est pas une bascule de fixture : c'est le résidu que
   * M0 bis a réduit sans l'éliminer — `facture` est calculée deux fois par
   * tranche, au début et au milieu, et le terme d'ordre deux grandit comme le
   * carré de l'amplitude horaire. Doubler ce qui passe dans les poches chaque
   * heure quadruple le reste.
   *
   * Le réglage est donc **prêt et bloqué par M0 ter**, pas abandonné. C'est la
   * première fois que M0 ter a un prix chiffré : douze points de satiété et
   * trente mille habitants.
   */
  partSalariale: 0.55,
  /** Ce que coûte une paie qu'on ne peut pas verser, par heure de retard. */
  grogneImpayes: 0.0025,
};

/**
 * Ce que coûte de tenir un empire trop grand et trop étalé.
 *
 * La forme d'abord : la tension est un *produit*, pas une somme. Une ville
 * lointaine d'une petite faction ne paie rien — elle est loin de sa capitale
 * parce que le pays est ce qu'il est, ce n'est pas de la surextension. Ce sont
 * les villes en trop qui coûtent, et elles coûtent d'autant plus qu'elles sont
 * loin. La somme punissait tout le monde, y compris les petits, et c'est ce qui
 * vidait la carte.
 *
 * Les chiffres ensuite, sur six graines et trois mille deux cents heures :
 *
 *   frein coupé              77 villes debout · plus gros empire 24 · agitation 0,55
 *   0,00016 + 0,00035        56 villes debout · plus gros empire 17 · agitation 0,87
 *   ci-dessous               72 villes debout · plus gros empire 22 · agitation 0,60
 *
 * La deuxième ligne, ce sont les constantes d'origine — celles qui n'avaient
 * jamais tourné. Elles emportaient un quart des villes du monde.
 *
 * Il faut dire aussi ce que le frein *n'a pas* à faire, parce qu'on a cru
 * longtemps le contraire : le commentaire d'origine en faisait « ce qui empêche
 * un vainqueur d'avaler la carte entière ». Mesuré frein coupé, sur dix-huit
 * mille heures, le plus gros empire plafonne entre 27 et 44 % des villes et le
 * monde se stabilise vers cinquante-huit. Personne n'avale rien. Le frein
 * infléchit, il ne sauve pas la partie — et un frein qu'on croit vital, on le
 * serre trop fort.
 */
export const SUREXTENSION = {
  /** En dessous, on tient son pays sans y penser. */
  seuil: 8,
  /** Par ville au-delà du seuil, et par heure. */
  parVille: 0.00005,
  /** Et ce que chaque case d'éloignement ajoute à cette ville-là. */
  parCase: 0.00001,
};

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

/**
 * Prix unitaire courant, tiré de la tension offre/demande.
 *
 * `stockSimule` permet de demander « et si le stock valait ça ? » sans toucher à
 * la ville. C'est ce qui permet de chiffrer une transaction avant de la faire,
 * puisque chaque unité échangée déplace le prix de la suivante.
 */
export function prixUnitaire(col, key, stockSimule, world, ctx) {
  const base = COMMODITIES[key].prix;
  const cible = Math.max(1, cibleStock(col, key));
  const stock = Math.max(0, stockSimule === undefined ? (col.stock[key] || 0) : stockSimule);
  // Rapport stock/demande → facteur borné [0.45, 3.2]
  const c = ctx || contextePrix(col, world);
  const tension = cible * c.sol / (stock + cible * 0.35);
  const f = Math.max(0.45, Math.min(3.2, Math.pow(tension, 0.85)));
  // Et ce que vaut la monnaie du lieu. Une monnaie faible fait des prix locaux
  // élevés : l'inflation se lit sur l'écran du marché sans qu'on l'explique.
  // `cours` vaut 1 tant que le conseil n'est pas passé, et pour une ville sans
  // drapeau — là, on paie en ce qu'on veut, et personne ne cote.
  return base * f * c.humeur / c.cours;
}

/**
 * Ce qui, dans un prix, ne dépend pas de la marchandise : la solvabilité des
 * habitants, l'humeur de la ville, le cours de sa monnaie.
 *
 * Les trois se recalculaient à chaque marchandise, donc dix fois par ville et
 * par heure pour un résultat dix fois identique. Le contexte se calcule une
 * fois et se passe à la boucle. Les opérations et leur ordre sont inchangés :
 * `prixUnitaire` rend au bit près ce qu'il rendait — c'est ce que les tests
 * d'économie vérifient déjà, et le monde joué au banc doit rester identique à
 * la graine près.
 */
export function contextePrix(col, world) {
  return {
    sol: solvabilite(col),
    humeur: 1 + col.unrest * 0.35,
    cours: coursMonnaie(world, col.faction),
  };
}

/**
 * Ce que les gens d'ici peuvent mettre, rapporté à ce qu'ils mettent d'ordinaire.
 *
 * Le moteur ne connaissait que la moitié de l'offre et de la demande. L'offre y
 * était — c'est le stock. La demande, elle, ne dépendait que de la population :
 * mille habitants fauchés « demandaient » exactement autant que mille habitants
 * riches, et le prix ne savait pas si l'acheteur avait de quoi payer. C'était un
 * besoin, pas une demande solvable.
 *
 * Ce que ça coûtait, mesuré : une ville sans le sou gardait des prix hauts, donc
 * sa marchandise ne trouvait pas preneur, donc elle pourrissait sur l'étal
 * pendant que les gens mouraient de faim ; et à l'inverse, des ménages pleins
 * aux as ne faisaient monter aucun prix, donc leur argent ne repartait jamais et
 * s'entassait — jusqu'à 93 % de la monnaie du monde immobilisée dans leurs
 * poches. Famine d'un côté, thésaurisation de l'autre : deux symptômes d'une
 * seule cause.
 *
 * Un seul nombre par ville, sans allocation : ce facteur est lu dans le chemin
 * le plus chaud du moteur.
 */
export function solvabilite(col) {
  return solvabiliteDe(col, col.menages || 0);
}

/**
 * La même chose, mais sur une bourse qu'on lui donne plutôt que sur la sienne.
 *
 * Sert au point milieu de `tickColonie` : pour placer un prix au milieu d'une
 * tranche, il faut la solvabilité qu'aura la ville au milieu de la tranche, et
 * on ne va pas cloner la ville pour ça. Une seule formule, deux appelants —
 * sans quoi les deux se mettraient à diverger un jour sans que personne ne le
 * voie.
 */
export function solvabiliteDe(col, menages) {
  // Votre camp n'a pas de ménages : sa vérité est dans votre poche, et son étal
  // ne doit pas s'effondrer parce qu'un champ vaut zéro.
  if (col.avantPoste || !(col.pop > 0)) return 1;
  const ordinaire = col.pop * MENAGES.parTete;
  const a = menages / ordinaire;
  return a < SOLVABILITE.plancher ? SOLVABILITE.plancher
    : (a > SOLVABILITE.plafond ? SOLVABILITE.plafond : a);
}

/**
 * Jusqu'où la bourse des habitants a le droit de tirer les prix. Bornes
 * calibrées au banc : sans plancher, une ville ruinée brade à zéro et le joueur
 * la pille ; sans plafond, une ville riche cote des prix que personne ne paie.
 */
export const SOLVABILITE = { plancher: 0.35, plafond: 20 };

/**
 * Prix effectifs pour le joueur.
 * `habilete` : compétence de commerce du meilleur négociateur (0-100).
 * `repu`     : réputation avec la faction propriétaire (−100..100).
 */
export function prixJoueur(col, key, habilete = 0, repu = 0, remise = 0, stockSimule, world) {
  // Une ville branchée sur une bourse ne fait plus tout à fait ses prix : elle
  // les fait à moitié. `world` est facultatif — sans lui on rend le prix local,
  // ce qui était le comportement d'avant.
  const p = world
    ? prixAvecBourse(world, col, key, prixUnitaire(col, key, stockSimule, world))
    : prixUnitaire(col, key, stockSimule);
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
  const style = col.faction && drapeauDe(world, col.faction)
    ? drapeauDe(world, col.faction).style : null;
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
  const rendus = rendementRegion(world, col.regionId);
  for (const k of Object.keys(rendus)) {
    const gens = k === 'minerai' ? emploi(col, 'mineur')
      : k === 'biomasse' ? emploi(col, 'paysan')
        : emploi(col, 'ferrailleur');
    prod[k] = (prod[k] || 0) + rendus[k] * gens * PAR_TETE;
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

/**
 * La valeur d'un lot, sans rien allouer. `valeurLot` passe par `Object.keys`,
 * qui construit un tableau à chaque appel — sans conséquence pour un butin
 * chiffré une fois, pas dans le tick de cinq cents villes.
 */
function valeurCourante(lot) {
  let v = 0;
  for (let i = 0; i < COMMODITY_KEYS.length; i++) {
    const k = COMMODITY_KEYS[i];
    const q = lot[k];
    if (q > 0) v += q * COMMODITIES[k].prix;
  }
  return v;
}

/**
 * Le trésor verse aux gens d'une ville : garnisons, chantiers, solde.
 *
 * Sans ce versement, le trésor *détruisait* la monnaie — moins quatre cents
 * crédits pour un mur, moins le prix d'une colonne pour la lever — et le
 * circuit fermé fuyait par ce bout-là. Des murs se paient à des maçons, une
 * colonne se lève avec de la solde : cet argent va chez les gens, et il revient
 * à la ville quand ils font leurs courses.
 */
export function verser(world, faction, col, montant) {
  const f = faction && world.factions[faction];
  if (!f || !(montant > 0)) return 0;
  // On ne paie pas chez le voisin. Une liste de colonies prise en début de
  // séance peut contenir une ville tombée depuis : le trésor sortait alors
  // d'un pays et l'argent atterrissait dans l'autre, sans qu'aucun registre ne
  // bouge. Quatre cents crédits par bataille, et l'invariant comptable dérivait
  // de 0,45 % en six mille heures.
  if (col && col.faction && col.faction !== faction) return 0;
  // Et on ne paie à personne. Verser, c'est déplacer de l'argent d'un registre
  // à un autre — sans destinataire, le trésor se vidait dans le néant et la
  // masse ne bougeait pas : de l'argent qui cesse d'exister sans que personne
  // l'ait décidé, exactement le défaut que l'invariant est là pour attraper.
  //
  // Deux cas, tous deux datés au tick près (graine 42, `MONNAIE.inertie` à
  // 0,99, tick 3294) : la faction ombrelle perd sa dernière ville puis verse la
  // solde de sa colonne à la ville de départ, dont `colonieDepart` ne rend plus
  // rien — 229,00 crédits, et l'écart comptable relevé au banc valait 229,00.
  // L'autre cas est l'avant-poste, dont le monde ne connaît que la vitrine : sa
  // vérité est dans `state.base`, et le monde n'a pas le droit d'y toucher.
  //
  // Une solde qu'on ne peut pas verser n'est pas une solde gratuite : elle
  // n'est simplement pas versée, comme une garnison qu'un trésor vide ne paie
  // pas. C'est la règle du lot A5 lue jusqu'au bout, pas une règle nouvelle.
  if (!col || col.avantPoste) return 0;
  const paye = Math.min(montant, Math.max(0, f.tresor));
  if (paye <= 0) return 0;
  f.tresor -= paye;
  col.menages = (col.menages || 0) + paye;
  return paye;
}

/**
 * Ce qu'une ville gagne à faire tourner sa propre économie, par heure.
 *
 * Ses habitants achètent à ses producteurs : c'est là que l'argent naît, et
 * nulle part ailleurs. On ne compte donc que la part de la production qui
 * répond à un besoin sur place — `min(offre, besoin)`. Le reste est du surplus :
 * il ne vaut de l'argent que si une caravane l'emporte, et c'est `arriver` qui
 * le paie alors.
 *
 * La grogne coupe ce revenu : une ville en révolte ne fait pas ses marchés.
 */
export function revenuInterne(world, col, prod, cons) {
  const p = prod || productionColonie(world, col);
  const c = cons || consommationColonie(col);
  let vendu = 0;
  for (const k of COMMODITY_KEYS) {
    const offre = p[k] || 0;
    if (offre <= 0) continue;
    vendu += Math.min(offre, c[k] || 0) * COMMODITIES[k].prix;
  }
  return vendu * CAISSE.marge * Math.max(0, 1 - (col.unrest || 0));
}

/**
 * Une ville encaisse, et sa faction prélève sa part au passage.
 *
 * Un seul point d'entrée, volontairement : toute recette d'une ville passe par
 * ici — production vendue sur place, cargaison livrée, achat du joueur au
 * marché. Ce qui n'appelle pas `encaisser` n'entre nulle part et se perd sans
 * que rien ne le signale ; c'est la seule façon de se tromper ici, et elle se
 * voit en relisant les appels.
 *
 * Ce prélèvement fait double emploi avec la remontée des caisses — et il le
 * fait exprès. La remontée seule a été mesurée : une ville pauvre n'atteint
 * jamais son fonds de roulement, donc elle ne remonte jamais rien, donc une
 * faction réduite à une ville reste à zéro pour toujours. C'était le défaut
 * qu'on cherchait à corriger. Les deux mécanismes n'ont donc pas le même
 * office : celui-ci prend une part de tout ce qui rentre, même chez les
 * pauvres ; l'autre empêche les riches de thésauriser sans fin.
 */
export function encaisser(world, col, montant) {
  if (!(montant > 0) || !col) return 0;
  const f = col.faction && world.factions[col.faction];
  const impot = f ? montant * loisDe(world, col.faction).impot : 0;
  if (f) f.tresor += impot;
  col.caisse = (col.caisse || 0) + (montant - impot);
  return impot;
}

/**
 * Le fonds de roulement qu'une ville garde par-devers elle, et que sa faction
 * ne prend pas.
 *
 * C'est ici que le taux d'imposition agit désormais, et il agit sur ce qui
 * compte : une ville prélevée à la légère garde de quoi se faire livrer pendant
 * des semaines ; une ville pressurée vit au jour le jour et ne peut plus rien
 * s'acheter quand la récolte manque. Le confiscatoire ne fait plus seulement
 * gronder — il affame, et par un chemin qu'on peut suivre.
 *
 * Le premier jet prélevait un pourcentage sur chaque recette. Deux défauts
 * mesurés sur trois parties de six mille heures : le trésor médian tombait à
 * 4 000 crédits — les factions ne levaient plus rien — pendant que les villes
 * empilaient 35 000 crédits qu'elles ne dépensaient jamais. Un pourcentage
 * laisse toujours la ville s'enrichir sans fin ; un plafond, non.
 *
 * La réserve suit la population, et non la consommation de l'heure. La première
 * version prenait la seconde, et c'était un piège : la consommation d'une ville
 * s'effondre dès qu'elle se rationne, donc sa réserve s'effondre avec, donc tout
 * son fonds de roulement remonte d'un coup au trésor — au pire moment, celui où
 * elle avait justement besoin d'acheter. Mesuré : les trésors médians sautaient
 * à cinquante mille crédits dès la cinq centième heure, sur ce seul effet. Une
 * réserve est un ordre de grandeur, pas un relevé.
 */
export function facteurReserve(taux) {
  // Ordinaire (5 %) : 1. Léger : un peu plus. Confiscatoire : le cinquième.
  return Math.max(0.2, 1 + (0.05 - taux) * 8);
}

export function reserveVille(col, taux) {
  return (col.pop || 0) * CAISSE.parTete * facteurReserve(taux);
}

/**
 * Ce que les villes d'une faction remontent à son trésor : tout ce qu'elles ont
 * au-delà de leur fonds de roulement. C'est la seule recette d'une faction qui
 * vienne de son propre pays — et, depuis que les caravanes ne créditent plus à
 * partir de rien, la seule qui ne vienne pas de la guerre.
 */
export function remonterCaisses(world, key, colonies) {
  const f = world.factions[key];
  if (!f) return 0;
  const taux = loisDe(world, key).impot;
  let leve = 0;
  for (const col of colonies) {
    const surplus = (col.caisse || 0) - reserveVille(col, taux);
    if (surplus <= 0) continue;
    col.caisse -= surplus;
    leve += surplus;
  }
  f.tresor += leve;
  return leve;
}

/**
 * Une ville paie. Elle ne paie que ce qu'elle a — et ce qu'elle n'a pas, elle ne
 * l'achètera pas : c'est ce qui donne enfin un poids à la caisse.
 */
export function debourser(col, montant) {
  if (!col || !(montant > 0)) return 0;
  const paye = Math.min(montant, col.caisse || 0);
  col.caisse = (col.caisse || 0) - paye;
  return paye;
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
export function tickColonie(world, col, rng, climat, dt = 1, reputation = 0, log = null, t = 0, present = false) {
  if (col.ruine) return null;
  ajusterEmplois(world, col, rng, dt);
  pourvoirCharges(col, rng, t, log);
  tickNotables(col, rng, dt, reputation, log, t);
  tickServices(col, rng, dt, t);
  const prod = productionColonie(world, col);
  const cons = consommationColonie(col);
  // `dt` : nombre d'heures couvertes par cet appel. Une économie de colonie n'a
  // aucun besoin d'une résolution horaire ; la traiter par tranches divise le
  // coût du tick sans que rien ne se voie en jeu. Une probabilité horaire p
  // devient 1-(1-p)^dt sur la tranche, pas p×dt : la différence compte dès que
  // p n'est plus minuscule.
  const surDt = (p) => (dt === 1 ? p : 1 - Math.pow(1 - p, dt));

  // --- Ce que les gens d'ici achètent à leur ville, au prix du jour.
  //
  // Seconde moitié du circuit : les habitants rachètent ce que la ville produit
  // avec l'argent qu'elle vient de leur verser en salaires. La monnaie tourne au
  // lieu d'apparaître. Et comme le prix tient compte de ce qu'ils ont en poche
  // (voir `solvabilite`), une ville pauvre brade et une ville riche surenchérit
  // — le marché se vide dans les deux cas au lieu de se bloquer.
  let facture = 0;
  if (!col.avantPoste) {
    const ctx = contextePrix(col, world);
    for (let i = 0; i < COMMODITY_KEYS.length; i++) {
      const k = COMMODITY_KEYS[i];
      const veut = (cons[k] || 0) * dt;
      if (veut <= 0) continue;
      // On ne facture que ce qui peut être servi : facturer le besoin plutôt
      // que l'étal vidait les poches pour des marchandises inexistantes.
      const enRayon = (col.stock[k] || 0) + (k === 'rations' ? 0 : (prod[k] || 0) * dt);
      facture += Math.min(veut, enRayon) * prixUnitaire(col, k, undefined, world, ctx);
    }

    // --- Le prix du milieu de la tranche, et non celui du premier instant.
    //
    // Le reste du défaut de maille était là, et il était invisible à la
    // lecture : le prix dépend de ce que les gens ont en poche et de ce qu'il
    // reste sur l'étal (`solvabilite`, `cibleStock`), or les deux bougent au
    // fil de la journée. Vingt-quatre heures fines facturent aux prix de chaque
    // heure ; une tranche facturait tout au prix de la première. Mesuré en
    // séparant les deux effets sur la facture d'une journée : **1,60 crédit de
    // dérive des prix contre −0,09 pour la saturation de l'étal**. C'était donc
    // les prix, pas l'étal.
    //
    // La correction est la règle du point milieu : on estime où en seront la
    // bourse et l'étal à mi-tranche, et on facture là. L'erreur d'une méthode
    // d'ordre un est proportionnelle au pas ; évaluée au milieu, ce terme
    // s'annule. Et ça se vérifie plutôt que de se raconter — l'erreur locale de
    // caisse passe de **+1,108 à 0,000** à `dt = 24`, et reste à 0,000 pour
    // `dt` valant 2, 4 et 8.
    //
    // La projection n'a pas besoin d'être exacte : son seul travail est de
    // placer le prix. Elle ne clone rien — `prixUnitaire` sait déjà recevoir un
    // stock simulé, et `solvabiliteDe` une bourse. Coût mesuré : ×1,044, une
    // seconde passe de prix par tranche, et rien à `dt = 1`.
    if (dt > 1 && facture > 0) {
      const demi = dt / 2;
      const partP = Math.min(1, (col.menages || 0) / facture);
      const mMid = Math.max(0, (col.menages || 0)
        + (valeurCourante(prod) * CAISSE.partSalariale - facture / dt) * demi);
      const ctxMid = { sol: solvabiliteDe(col, mMid), humeur: ctx.humeur, cours: ctx.cours };
      facture = 0;
      for (let i = 0; i < COMMODITY_KEYS.length; i++) {
        const k = COMMODITY_KEYS[i];
        const veut = (cons[k] || 0) * dt;
        if (veut <= 0) continue;
        const enRayon = (col.stock[k] || 0) + (k === 'rations' ? 0 : (prod[k] || 0) * dt);
        const brut = climat ? climat.rendement(k) : 1;
        const amorti = k === 'rations' ? 1 : 1 + (brut - 1) * 0.45;
        const sMid = Math.max(0, (col.stock[k] || 0)
          + ((prod[k] || 0) * amorti - (cons[k] || 0) * partP) * demi);
        facture += Math.min(veut, enRayon) * prixUnitaire(col, k, sMid, world, ctxMid);
      }
    }
  }
  // --- Le circuit se boucle heure par heure, même quand la ville est loin.
  //
  // Les courses et la paie sont deux moitiés d'un même circuit, et **elles
  // s'alimentent l'une l'autre à l'heure** : ce que la ville verse le matin,
  // ses habitants le dépensent l'après-midi, et elle le réencaisse. Le code
  // faisait les courses une fois par tranche, plafonnées à ce que les ménages
  // avaient **au début** de la tranche, puis versait les salaires de la
  // journée entière — trop tard pour être dépensés. Le plafond mordait donc
  // plus fort à la maille grossière, et une ville lointaine encaissait moins de
  // ses propres habitants qu'une ville proche dans le même état.
  //
  // C'était le poste dominant du chantier `MAILLE.md`, et il n'était pas dans
  // son recensement : on n'y cherchait que des tirages quantifiés. **Une
  // saturation ne se regroupe pas non plus** — et celle-ci coûtait, mesurée sur
  // une seule journée depuis un état identique, 4,81 crédits de caisse par
  // ville, proportionnels au pas, avec 293 crédits par jour dans les villes où
  // le plafond mord contre 1,71 là où il ne mord jamais.
  //
  // La correction, c'est de refaire le circuit `dt` fois : la note de l'heure,
  // puis la paie de l'heure. À `dt = 1` elle rend exactement ce que rendait
  // l'ancien code, dans le même ordre et avec les mêmes tirages.
  //
  // Écrite naïvement — une boucle de vingt-quatre passages avec `encaisser` et
  // `debourser` à chaque tour — elle coûte **+10 à +15 % de tick**, mesuré trois
  // fois contre le code d'avant (×1,095, ×1,148, ×1,101). C'est trop : le
  // budget du moteur se compte en microsecondes et cette correction n'en vaut
  // pas dix.
  //
  // D'où la voie rapide ci-dessous, et elle n'est pas une approximation. Tant
  // qu'aucun des deux plafonds ne mord, les deux mouvements sont **linéaires**
  // en leur montant : `encaisser` prélève un impôt proportionnel, `debourser`
  // rend son argument entier. Vingt-quatre appels de `x` valent alors
  // exactement un appel de `24 x`. Et savoir si un plafond mordra ne demande pas
  // de simuler : les deux bourses évoluent d'un pas constant, donc leur minimum
  // sur la tranche est à la première ou à la dernière heure, et deux
  // comparaisons suffisent. Quand l'une des deux mord, on retombe sur la
  // boucle, qui reste la vérité.
  const factureHeure = facture / dt;
  const duHeure = col.avantPoste ? 0 : valeurCourante(prod) * CAISSE.partSalariale;
  let regle = 0;
  let paye = 0;
  const impot = col.faction && world.factions[col.faction]
    ? loisDe(world, col.faction).impot : 0;
  // Ce que chaque bourse gagne ou perd par heure si rien ne bute.
  const dMenages = duHeure - factureHeure;
  const dCaisse = factureHeure * (1 - impot) - duHeure;
  const m0 = col.menages || 0;
  const c0 = col.caisse || 0;
  const menagesTient = Math.min(m0, m0 + (dt - 1) * dMenages) >= factureHeure;
  // La caisse est regardée juste après l'encaissement de l'heure, puisque c'est
  // là qu'on lui demande de payer.
  const caisseTient = Math.min(c0, c0 + (dt - 1) * dCaisse)
    + factureHeure * (1 - impot) >= duHeure;
  if (dt === 1 || (menagesTient && caisseTient)) {
    if (facture > 0) {
      // `menagesTient` dit que la bourse ne bute jamais **au fil de la
      // tranche**, salaires compris : la note passe donc en entier, même
      // quand elle dépasse ce que les ménages ont à la première heure. Y
      // remettre un `min` sur la bourse initiale était le piège, et il a coûté
      // sept désaccords sur cent vingt contre la boucle — jusqu'à 357 crédits
      // sur une ville. Le `min` ne sert qu'à `dt = 1`, où la tranche EST
      // l'heure et où il n'y a pas de salaire à venir.
      const achat = menagesTient ? facture : Math.min(facture, m0);
      if (achat > 0) {
        col.menages -= achat;
        encaisser(world, col, achat);
        regle = achat;
      }
    }
    if (duHeure > 0) {
      paye = debourser(col, duHeure * dt);
      col.menages = (col.menages || 0) + paye;
    }
  } else {
    // La boucle, quand un plafond mord pour de bon. Elle n'appelle ni
    // `encaisser` ni `debourser` : les deux se réduisent ici à trois lignes
    // d'arithmétique sur des variables locales. Ce n'est pas de la coquetterie
    // — la même boucle écrite avec ses deux appels coûtait **7,4 % du tick à
    // elle seule**, mesuré contre une variante sans boucle du tout ; tout le
    // reste du correctif ne coûte que 1,3 %.
    //
    // L'impôt est versé **à chaque heure** et non cumulé pour un versement
    // unique, bien qu'il soit proportionnel : cumuler change l'ordre de
    // sommation, et deux mondes joués deux mille heures divergeaient alors au
    // seizième chiffre puis pour de bon. Une optimisation qui change le monde
    // n'est pas une optimisation.
    const fisc = impot > 0 ? world.factions[col.faction] : null;
    let menages = m0;
    let caisse = c0;
    for (let h = 0; h < dt; h++) {
      if (factureHeure > 0) {
        const achat = factureHeure < menages ? factureHeure : menages;
        if (achat > 0) {
          menages -= achat;
          const pris = achat * impot;
          if (fisc) fisc.tresor += pris;
          caisse += achat - pris;
          regle += achat;
        }
      }
      if (duHeure > 0) {
        const verse = duHeure < caisse ? duHeure : caisse;
        caisse -= verse;
        menages += verse;
        paye += verse;
      }
    }
    col.menages = menages;
    col.caisse = caisse;
  }
  const part = facture > 0 ? regle / facture : 1;

  for (const k of COMMODITY_KEYS) {
    if (k === 'rations') continue; // traité à part, c'est la survie
    // Une ville encaisse mieux les saisons qu'une escouade : elle a des
    // réserves, des serres, des habitudes. On amortit donc l'effet de moitié.
    const brut = climat ? climat.rendement(k) : 1;
    const amorti = 1 + (brut - 1) * 0.45;
    const p = (prod[k] || 0) * amorti * dt;
    const c = (cons[k] || 0) * dt * part;
    col.stock[k] = Math.max(0, (col.stock[k] || 0) + p - c);
  }

  // --- Les salaires. La ville paie ceux qui produisent : cet argent sort de sa
  // caisse pour aller dans les poches de ses habitants, qui s'en serviront pour
  // lui racheter ce qu'elle fabrique. Une paie qu'on ne peut pas verser se voit
  // dans l'humeur — sans quoi une caisse vide ne se manifestait nulle part.
  //
  // `revenuInterne` a disparu d'ici, et c'est le cœur du lot : il représentait
  // « ce que la ville vend sur son propre marché » à une époque où personne
  // n'achetait, c'est-à-dire de la monnaie créée à chaque heure dans chaque
  // ville, sans contrepartie. Ses clients existent maintenant, ils ont un nom et
  // une bourse, et ils paient plus haut.
  // Les salaires sont versés dans la boucle du circuit, plus haut. Ne reste ici
  // que ce qu'ils laissent derrière eux quand la caisse est à sec : la grogne.
  // Elle se compte sur la tranche entière, à partir de ce qui a réellement été
  // versé heure par heure — une ville qui n'a pu payer que trois heures sur
  // vingt-quatre le sent vingt-et-une fois.
  const du = duHeure * dt;
  if (du > 0) {
    const impaye = du - paye;
    if (impaye > 0) {
      col.unrest = Math.min(1, col.unrest
        + CAISSE.grogneImpayes * Math.min(1, impaye / du) * dt);
    }
  }

  // --- Vivres. On sert ce qu'on peut ; la satiété commande tout le reste.
  const amortiVivant = climat ? 1 + (climat.rendement('rations') - 1) * 0.45 : 1;
  const arrivage = (prod.rations || 0) * amortiVivant * dt;
  const besoin = col.pop * 0.014 * (cons.cantine || 1) * dt;
  const disponible = (col.stock.rations || 0) + arrivage;
  // On ne sert que ce qui est là *et* ce qui se paie : une population sans un
  // sou ne mange pas, fût-ce sur un grenier plein.
  const servi = Math.min(besoin * part, disponible);
  col.stock.rations = Math.max(0, disponible - servi);
  const satiete = besoin > 0 ? servi / besoin : 1;
  // On l'écrit dans la ville. Elle « commande tout le reste » — la grogne, le
  // départ des gens, la croissance — et elle n'était visible nulle part : ni à
  // l'écran, ni au banc, ni dans les gardes. On calibrait donc sur `nourries`
  // et `affamées`, qui comptent des **stocks**. Une ville dont les habitants
  // n'ont pas un sou garde un grenier plein et passe pour bien nourrie ; monter
  // les prix améliore les deux chiffres en affamant les gens. C'est le même
  // piège que celui déjà relevé sur `MONNAIE.coursMin`, et il a failli faire
  // choisir une constante à l'envers.
  col.satiete = satiete;

  // Surextension : une faction qui tient trop de villes, trop loin de sa
  // capitale, les tient mal.
  //
  // Ce frein n'a jamais freiné quoi que ce soit. `distance` prend deux cases ;
  // on lui en passait trois, le monde en tête — elle rendait `NaN`, et le
  // `tension > 0` juste en dessous l'avalait sans un mot. Un garde qu'on ne
  // voit jamais échouer ne prouve rien : celui-ci a caché un mécanisme mort
  // depuis le jour de son écriture. Il est bordé maintenant, et il crie.
  //
  // Le rebrancher tel quel coûtait un quart du monde — quatre cent soixante-trois
  // villes debout sur six graines, trois cent trente-sept avec. Les deux
  // constantes avaient été choisies à vue contre un mécanisme qui ne tournait
  // pas, et personne ne pouvait le savoir. Elles ont donc été remesurées, et la
  // forme avec : voir SUREXTENSION.
  if (col.faction && world.factions[col.faction]) {
    const f = world.factions[col.faction];
    const cap = f.capitale && colonieParId(world, f.capitale);
    const eloignement = cap ? distanceCases(cap.regionId, col.regionId) : 0;
    const surcharge = Math.max(0, f.colonies.length - SUREXTENSION.seuil);
    const tension = surcharge
      * (SUREXTENSION.parVille + eloignement * SUREXTENSION.parCase) * dt;
    // Le garde qui manquait. `NaN > 0` est faux : sans ce cri, toute erreur de
    // calcul ici redevient un mécanisme mort et silencieux.
    if (!(tension >= 0)) throw new Error(`tension de surextension incalculable pour ${col.id}`);
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
  // Une ville qui s'affranchit emporte ses comptes : cette monnaie ne circule
  // plus dans le pays qu'elle vient de quitter.
  sortirDuCircuit(world, ancienne, col);
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
  // Elle repasse sous son ancien drapeau, comptes compris.
  transfererVille(world, col, ancienne, rendue);
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
  // Une ville morte ne fait plus circuler ce qu'elle avait — et elle ne le
  // détient plus non plus. Laisser les comptes garnis sur une ruine, c'était
  // un avoir fantôme : le jour où quelqu'un revendiquait la place, trois mille
  // crédits entraient dans sa masse monétaire sans être nulle part.
  sortirDuCircuit(world, ancienne, col);
  col.caisse = 0;
  col.menages = 0;
  col.dette = 0;
  col.creancier = null;
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
/**
 * Ce que coûterait cet achat, sans le faire — et ce qui l'a borné.
 *
 * Même boucle que `acheter`, qui l'appelle : le chiffre annoncé à l'écran est
 * donc exactement celui qu'on paiera, y compris quand le prix monte à mesure
 * qu'on vide l'étal. Sans ça l'interface ne pouvait proposer que « +10 » et
 * « tout », et un joueur n'avait aucun moyen de savoir ce que « tout » allait
 * lui coûter sur un marché où chaque unité déplace la suivante.
 */
export function simulerAchat(state, col, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  const negoc = meilleurCommercant(g.membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  const remise = remiseDe(state, col.faction);
  let restant = Math.floor(qte);
  let stock = Math.floor(col.stock[key] || 0);
  let cout = 0;
  let achetes = 0;
  let borne = null;

  const libre = capacitePortage(state, g) - poidsInventaire(g.inventaire);
  const poidsU = COMMODITIES[key].poids;
  const maxPoids = poidsU > 0 ? Math.floor(libre / poidsU) : restant;
  if (maxPoids <= 0) return { qte: 0, cout: 0, borne: 'sac plein' };
  if (restant > maxPoids) borne = 'sac plein';
  restant = Math.min(restant, maxPoids);

  while (restant > 0) {
    if (stock < 1) { borne = borne || 'étal vide'; break; }
    const p = prixJoueur(col, key, hab, repu, remise, stock, state.world).achat;
    if (soldeIci(state) - cout < p) { borne = borne || 'crédits'; break; }
    cout += p;
    stock -= 1;
    achetes += 1;
    restant -= 1;
  }
  return { qte: achetes, cout: Math.round(cout), borne };
}

/** Ce que rapporterait cette vente, sans la faire. Voir `simulerAchat`. */
export function simulerVente(state, col, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  const negoc = meilleurCommercant(g.membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = state.player.reputation[col.faction] || 0;
  const remise = remiseDe(state, col.faction);
  let restant = Math.min(Math.floor(qte), Math.floor(g.inventaire[key] || 0));
  let stock = Math.floor(col.stock[key] || 0);
  let gain = 0;
  let vendus = 0;
  while (restant > 0) {
    gain += prixJoueur(col, key, hab, repu, remise, stock, state.world).vente;
    stock += 1;
    vendus += 1;
    restant -= 1;
  }
  // Ce que le régime retient au passage. Une Commune instruit et soigne
  // gratuitement, et se paie là ; une Franchise ne donne rien et ne prend
  // presque rien ; une ville sans drapeau ne prend rien du tout, faute de
  // quelqu'un pour le faire. C'est ce qui fait de « où j'écoule mon butin » une
  // question, et pas seulement « où le prix est le meilleur ».
  // Témoin du banc : on coupe la retenue pour chiffrer ce qu'elle prend
  // vraiment au négoce. Voir test/equilibre.js, SANS=preleve.
  const part = state.sansPreleve ? 0 : (loiIci(state, col).regime.preleve || 0);
  const brut = Math.round(gain);
  const taxe = Math.round(brut * part);
  return { qte: vendus, gain: brut - taxe, brut, taxe, part };
}

export function acheter(state, col, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  // On chiffre d'abord, on encaisse ensuite, avec le même code : le prix affiché
  // et le prix payé ne peuvent pas diverger.
  const sim = simulerAchat(state, col, key, qte, g);
  if (sim.qte === 0) {
    const motifs = { 'sac plein': 'Sac plein.', 'étal vide': 'L’étal est vide.', credits: 'Bourse trop courte.' };
    return { ok: false, motif: motifs[sim.borne] || 'Rien à acheter à ce prix.', qte: 0, cout: 0 };
  }
  col.stock[key] = Math.max(0, (col.stock[key] || 0) - sim.qte);
  regler(state, sim.cout);
  // Ce que vous payez entre en caisse chez qui vous a servi, impôt compris.
  encaisser(state.world, col, sim.cout);
  g.inventaire[key] = (g.inventaire[key] || 0) + sim.qte;
  const negoc = meilleurCommercant(g.membres);
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.5 + sim.qte * 0.3);
  return { ok: true, qte: sim.qte, cout: sim.cout };
}

export function vendre(state, col, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  const sim = simulerVente(state, col, key, qte, g);
  if (sim.qte === 0) return { ok: false, motif: 'Rien à vendre.', qte: 0, gain: 0 };
  col.stock[key] = (col.stock[key] || 0) + sim.qte;
  g.inventaire[key] -= sim.qte;
  gagner(state, sim.gain);
  // La ville règle sur sa caisse. Elle vous paie en entier même si elle n'a pas
  // le compte : le prix était affiché, on ne le renégocie pas au comptoir. Ce
  // qu'elle sort ici, elle ne l'aura plus pour se ravitailler — vendre son butin
  // dans un bourg exsangue l'assèche pour de bon.
  debourser(col, sim.brut);
  const negoc = meilleurCommercant(g.membres);
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.5 + sim.qte * 0.3);
  return { ok: true, qte: sim.qte, gain: sim.gain, taxe: sim.taxe, brut: sim.brut };
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
  const style = drapeauDe(world, col.faction) ? drapeauDe(world, col.faction).style : 'commune';
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
  if (soldeIci(state) < p) return { ok: false, motif: `Il manque ${p - soldeIci(state)} ${signeIci(state)}.` };

  regler(state, p);
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
  gagner(state, p);
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.9);
  return { ok: true, prix: p, nom: ITEMS[key].nom };
}

// ---------------------------------------------------------------------------
// Le bureau de change (ECONOMIE §5)
// ---------------------------------------------------------------------------
//
// C'est la pièce sans laquelle le lot E rend le jeu injouable. Depuis la
// bascule, ce qu'on a est libellé : arriver à l'étranger avec la monnaie de
// chez soi, c'est ne pouvoir rien acheter. La friction est voulue — ECONOMIE
// §7.1 — mais elle n'est jouable que parce qu'il existe un endroit pour la
// lever, et qu'y passer coûte quelque chose.
//
// Il vit ici plutôt que dans `monnaie.js` parce qu'il est une action du joueur
// sur un marché, au même titre qu'`acheter` et `vendre` — même forme de retour,
// même façon de refuser, et `monnaie.js` passe avant `economy.js` dans l'ordre
// des modules (`tools/bundle.js`), donc ne peut pas appeler l'inverse.

/**
 * Une ville tient-elle un bureau ? ECONOMIE §5.1 : « dans toute ville dont le
 * marché existe et qui n'est pas en révolte ».
 *
 * Il n'y a pas de champ `col.change` : toute ville debout tient un marché dans
 * ce moteur, et l'écrire dans l'état serait une clé de plus à migrer pour une
 * information qui se déduit. Un avant-poste est exclu — c'est un camp, pas une
 * place.
 */
export function bureauDe(col) {
  return !!col && !col.ruine && !col.avantPoste && (col.unrest || 0) <= SEUIL_REVOLTE;
}

/**
 * Ce qu'on recevrait, sans rien engager. L'écran doit pouvoir l'afficher avant
 * qu'on décide — c'est tout l'intérêt d'un bureau qu'on lit avant d'y entrer.
 *
 * L'estime du chef local entre dans l'écart (§5.2) : être bien vu ici se paie
 * en monnaie, pas seulement en contrats.
 */
export function devisChange(world, col, de, vers, montant) {
  const t = taux(world, de, vers);
  const e = ecartChange(world, col, de, vers, estime(col, 'chef'));
  return { taux: t, ecart: e, recu: montant * t * (1 - e) };
}

/**
 * Changer. Une des deux monnaies doit être celle du lieu (§5.1) : le bureau
 * cote sa monnaie contre le monde, pas le monde contre lui-même. Sans cette
 * règle, le comptoir d'un village perdu deviendrait une place de change
 * universelle et le cours local n'aurait plus aucune importance.
 *
 * Une ville sans drapeau n'a pas de monnaie à elle : elle les prend toutes, et
 * ne prend aucun écart. C'est l'avantage d'un endroit sans loi, et ça donne une
 * raison d'y passer.
 *
 * **Ce que l'écart devient n'est pas écrit ici, et c'est délibéré.** §5.3 le
 * fait encaisser par la ville pour les caravanes, et `caravanes.js` le fait
 * déjà. Côté joueur, le porter en caisse creuserait le trou comptable déjà
 * consigné dans CHANTIER.md : sa bourse n'est pas dans le circuit audité, donc
 * tout ce qui passe de sa poche à une caisse fabrique de la monnaie que
 * `masse` ne connaît pas. Une seule fuite documentée vaut mieux qu'une
 * deuxième inventée pour faire joli.
 */
export function changer(state, col, de, vers, montant) {
  const world = state.world;
  if (!bureauDe(col)) return { ok: false, motif: 'Pas de bureau ici.' };
  if (!de || !vers || de === vers) {
    return { ok: false, motif: 'Changer une monnaie contre elle-même ne mène nulle part.' };
  }
  if (col.faction && de !== col.faction && vers !== col.faction) {
    return {
      ok: false,
      motif: `Ici on ne cote que le ${drapeauDe(world, col.faction).nom} : `
        + 'l’une des deux doit être la monnaie du lieu.',
    };
  }
  if (!(montant > 0)) return { ok: false, motif: 'Rien à changer.' };
  const a = solde(state.player, de);
  if (a < montant) {
    return {
      ok: false,
      motif: `Il manque ${Math.ceil(montant - a)} ${symboleDe(world, de)}.`,
    };
  }
  const devis = devisChange(world, col, de, vers, montant);
  const sorti = debiterBourse(state.player, de, montant);
  const recu = crediterBourse(state.player, vers, sorti * devis.taux * (1 - devis.ecart));
  return { ok: true, sorti, recu, taux: devis.taux, ecart: devis.ecart };
}
