// Économie locale : chaque colonie produit, consomme, et fixe ses prix à partir
// de son propre stock. Une ville affamée paie les rations au prix fort ; une
// ville assise sur une mine brade son minerai.

import {
  COMMODITIES, COMMODITY_KEYS, BIOMES, ITEMS, FACTIONS, drapeauDe, symboleDe,
  ETAL_PAR_STYLE, PALIERS_ITEM, MENAGES,
} from './data.js';
import { comp, gagnerXp, portage, XP_PRATIQUE } from './characters.js';
import { combienDeFois } from './rng.js';
import { savoir } from './base.js';
import { remiseDe, palierBonus } from './allegeance.js';
import {
  distance as distanceCases, rendementRegion, colonieParId, vivresCoupees, SIEGE_FAIM,
} from './world.js';
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
  gagner, regler, soldeIci, signeIci, entrerDehors, sortirDehors,
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
/**
 * La frontière de validité du modèle de tranche, en part de la paie
 * quotidienne que la bourse des ménages contient au matin.
 *
 * En dessous, la bourse « tourne » plus de deux fois par jour : la dépense
 * accélère à mesure que la paie s'accumule et que la solvabilité remonte, la
 * trajectoire de la bourse est concave, et tout modèle de tranche — quel que
 * soit son raffinement, quatre ont été mesurés — surestime les prix. Ces
 * villes-là passent par la boucle horaire à reprix, qui est la vérité.
 *
 * Balayé contre le juge de qualité (banc --maille, partie 2 : quarante jours
 * contre plancher de placebo) et la garde de vitesse :
 *
 *     seuil    vitesse    qualité (5 grandeurs)   dérive caisse à 40 j
 *      1,0      ×1,58     sous le plancher          +4,8 (±13)
 *      0,5      ×1,44     sous le plancher          +5,4 (±16)
 *      0,25     ×1,46     sous le plancher          +8,4 (±16)
 *
 * 0,5 prend la vitesse sans céder la qualité ; 0,25 ne rend rien de plus et
 * double la dérive. Ce n'est pas une règle de jeu : c'est la frontière entre
 * deux méthodes de calcul du même monde.
 */
// `tolSaut` et `fenetreMax` (M6) : le pas adaptatif du PRIX dans la boucle à
// reprix. Les pow ne se paient qu'aux ancres ; entre deux ancres, le prix de
// l'heure est extrapolé le long de sa pente dln(fH)/dh, calculée en forme
// close à partir des trois moteurs (solvabilité, tension des étals, grogne).
// La fenêtre est dimensionnée pour que la dérive estimée reste sous
// `tolSaut`, plafonnée à `fenetreMax` heures, et refermée dès qu'un régime
// bascule. Les flux, eux, restent exacts heure par heure : seul le prix est
// estimé, jamais un min() ni un écrêtage. `sautFin` ajoute le saut de fin de
// fenêtre : les heures restantes d'une fenêtre au régime d'argent stable
// s'appliquent en forme close au lieu de se rejouer.
//
// **COUPÉ PAR DÉFAUT (tolSaut: 0), et c'est un verdict de mesure, pas une
// prudence** — le dossier complet est dans MAILLE §M6. En deux lignes : les
// fenêtres seules rendent une qualité indiscernable du reprix intégral
// (médianes identiques au millième sur cinq échantillons) mais ne paient
// RIEN (×0,98 au protocole calibré — les pow ne sont pas le poste
// dominant) ; le saut de fin de fenêtre, lui, ne paie pas non plus (×1,04,
// l'intendance coûte plus que les heures sautées) ET déplace la queue
// monétaire du monde — 12 effondrées → 2 sur les mêmes graines, toutes dans
// le même sens. À zéro, le circuit est identique au bit près au moteur
// d'avant M6, vérifié ville par ville et aux gardes. L'appareillage reste
// pour le banc (--balaye economy.TRANCHE.tolSaut) et pour la prochaine
// tentative, qui devra chercher le remboursement AILLEURS que dans le prix.
export const TRANCHE = {
  rotationBourse: 0.5, tolSaut: 0, fenetreMax: 12, sautFin: true,
};

// Instrumentation du chantier M6 (MAILLE.md), lue et remise à zéro par qui
// mesure — le banc, les tests. Combien de tranches prennent chaque voie du
// circuit, et combien d'heures la boucle à reprix rejoue une à une : c'est
// l'attribution du ×1,44 payé au lot I bis, mesurée au lieu de supposée.
// Compteurs de module, pas un état de jeu : rien n'entre dans la sauvegarde.
export const VOIES = {
  fine: 0, rapide: 0, simple: 0, reprix: 0, heuresReprix: 0, heuresEstimees: 0,
};

export const CAISSE = {
  marge: 0.10,
  parTete: 12,
  /**
   * La part de ce que la ville produit qui repart en salaires, chez ses gens.
   *
   * **0,55 → 0,70, et c'est la mesure de la satiété qui l'a dicté** — dans un
   * monde qui n'existe plus. L'histoire tient en trois actes, et elle vaut
   * d'être gardée parce qu'elle montre un réglage qui MEURT quand le monde
   * change.
   *
   * Acte un : tant qu'on réglait contre `nourries`, tout poussait à baisser la
   * part — les greniers d'affamés restent pleins. Acte deux : la satiété
   * visible, le balayage donnait 0,70 (+12 points de satiété, +30 000
   * habitants), et le réglage est resté des semaines « prêt et bloqué par
   * M0 ter » — à 0,70, le résidu d'ordre deux de la maille explosait.
   *
   * Acte trois, août 2026 : M0 ter livré (le blocage est levé, l'erreur locale
   * à 0,70 vaut +0,001 de caisse), le balayage a été refait sur le monde
   * d'après les lots H et I — revenus indexés sur le cours, bornes du cours
   * levées, démographie mortelle. **Et le levier ne commande plus rien** :
   *
   *     part      satiété (graines 11…909)   satiété (graines 7…777)
   *     0,55            0,867                      0,875
   *     0,62            0,899                      0,842
   *     0,66            0,896                      0,877
   *     0,70            0,879                      —
   *     0,78            0,878                      —
   *
   * Le « pic » à 0,62 du premier jeu de graines est le creux du second : tout
   * l'effet tient dans ±0,03, la dispersion entre jeux de graines. C'est
   * l'indexation de H1 qui a tué le levier, et c'est logique : un salaire plus
   * gros en monnaie locale fait des prix plus gros en monnaie locale, et le
   * salaire réel ne bouge pas. La part salariale décide désormais de qui porte
   * la monnaie — la caisse ou les poches — pas de qui mange.
   *
   * La valeur reste donc à 0,55 : on ne bouge pas une constante sans une
   * mesure qui le justifie, et il n'y en a plus.
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
  // Rapport stock/demande → facteur en loi de puissance, SANS bornes.
  //
  // Les bornes [0,45, 3,2] sont levées (lot I bis, « tout doit être
  // possible ») : elles écrasaient précisément les extrêmes qu'une simulation
  // doit savoir raconter. Mesuré au lot H4 : les ménages d'un pays à monnaie
  // forte thésaurisaient 5,9 millions parce que la solvabilité saturait à
  // vingt et le prix à ×3,2 — l'argent ne pouvait plus repartir par les prix,
  // donc il ne repartait plus du tout. Et le propriétaire a arbitré l'exploit
  // que le plancher gardait : oui, on peut acheter pour rien à une ville
  // ruinée. C'est une simulation.
  //
  // Le raccourci de vitesse qui vivait ici — les bornes avalaient le `pow`
  // hors de leur fenêtre — part avec elles ; ce que ça coûte est mesuré à la
  // garde de vitesse, pas supposé. La tension reste strictement positive
  // (solvabilité à plancher epsilon, socle de 0,35 cible au dénominateur),
  // donc le prix aussi : on divise par lui ailleurs.
  const c = ctx || contextePrix(col, world);
  const tension = cible * c.sol / (stock + cible * 0.35);
  const f = Math.pow(tension, 0.85);
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
/**
 * Les prix d'une ville tels qu'on les note au carnet (INTERFACE.md, U7) :
 * dix nombres arrondis au dixième, un contexte calculé une fois. C'est
 * l'économie qui les connaît ; `connaissance.js`, plus haut dans l'ordre des
 * modules, ne peut pas l'importer — sim.js les lui fait passer en paramètre
 * d'`observer`, comme la bataille passe à base.js par le ctx.
 */
export function prixReleves(col, world) {
  if (!col || col.avantPoste || col.ruine || !(col.pop > 0)) return null;
  const ctx = contextePrix(col, world);
  const prix = {};
  for (const k of COMMODITY_KEYS) {
    prix[k] = Math.round(prixUnitaire(col, k, undefined, world, ctx) * 10) / 10;
  }
  return prix;
}

export function contextePrix(col, world) {
  const cours = coursMonnaie(world, col.faction);
  return {
    sol: solvabilite(col, cours),
    humeur: 1 + col.unrest * 0.35,
    cours,
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
export function solvabilite(col, cours = 1) {
  return solvabiliteDe(col, col.menages || 0, cours);
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
export function solvabiliteDe(col, menages, cours = 1) {
  // Votre camp n'a pas de ménages : sa vérité est dans votre poche, et son étal
  // ne doit pas s'effondrer parce qu'un champ vaut zéro.
  if (col.avantPoste || !(col.pop > 0)) return 1;
  // `cours` : l'échelle de référence est en **ancien crédit** — trois unités par
  // tête, mesurées au lot A6 dans un monde où une unité valait une unité. La
  // bourse qu'on lui compare, elle, est en monnaie locale. Sans la division, un
  // pays dont la monnaie tombe au quart voit ses ménages passer pour quatre
  // fois plus pauvres qu'ils ne sont, donc ses prix s'effondrer, donc ses
  // villes cesser d'encaisser. Voir CHANTIER §Lot H.
  const ordinaire = col.pop * MENAGES.parTete / cours;
  const a = menages / ordinaire;
  return a < SOLVABILITE.plancher ? SOLVABILITE.plancher
    : (a > SOLVABILITE.plafond ? SOLVABILITE.plafond : a);
}

/**
 * Jusqu'où la bourse des habitants a le droit de tirer les prix : partout.
 *
 * Les bornes économiques sont levées (lot I bis). L'ancien commentaire disait
 * leur raison d'être — « sans plancher, une ville ruinée brade à zéro et le
 * joueur la pille ; sans plafond, une ville riche cote des prix que personne
 * ne paie » — et le propriétaire a arbitré les deux : c'est une simulation,
 * une ville ruinée brade et une ville riche flambe. Le plafond, surtout,
 * cachait un monde entier : mesuré au lot H4, les ménages d'un pays à monnaie
 * forte thésaurisaient 5,9 millions parce que la solvabilité saturait à vingt
 * — les prix ne pouvaient plus suivre la richesse, donc l'argent ne
 * repartait plus.
 *
 * Ce qui reste est numérique, pas économique : un plancher strictement
 * positif parce que la tension entre dans une puissance et le prix dans des
 * divisions, et un plafond parce que `JSON.stringify` écrit `null` pour
 * `Infinity`.
 */
export const SOLVABILITE = { plancher: 0.000001, plafond: 1000000 };

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
 * Ce qu'une ville sert d'une marchandise sur `dt` heures, sans le simuler.
 *
 * Heure par heure, elle sert `min(veut, stock + arrivage)` puis garde le reste.
 * La tranche écrivait `min(veut × dt, stock + arrivage × dt)` — la **somme des
 * minimums** remplacée par le **minimum des sommes**, ce qui n'est pas la même
 * chose et ne l'est jamais. C'est la deuxième des trois formes recensées par
 * `MAILLE.md` §7 : une saturation ne se regroupe pas.
 *
 * L'intégrale est close. Tant que la demande horaire dépasse l'arrivage, la
 * ville puise `veut − arrivage` par heure dans son grenier, jusqu'à l'épuiser :
 * il n'y a donc rien à approcher et aucun sous-pas à payer. Vérifié contre la
 * boucle sur vingt-huit mille tirages et sept pas, à 1e-9 près.
 *
 * **`part` : ce que les habitants emportent réellement de ce qu'on leur
 * présente.** Sans lui, la forme close vide le grenier au rythme de la demande
 * entière — alors qu'une ville dont les gens ne peuvent payer que 42 % de la
 * note ne voit partir que 42 % de son étal, donc en garde à vendre bien plus
 * longtemps, donc facture davantage. C'est le dernier résidu de M0 ter, et il
 * était gros : facture de 3 632 à la maille fine contre 3 134 à la grossière
 * sur la même ville, d'où une part servie de 0,44 contre 0,51 et seize rations
 * d'écart en une journée. Le grenier tient `stock / (veut × part − arrivage)`
 * heures ; au-delà, la ville ne sert plus que ce qui arrive.
 */
// Deux ardoises de travail pour le point fixe de la part servie, dans le
// chemin le plus chaud du moteur : les prix et les arrivages d'une tranche.
// Au module parce qu'une allocation par ville et par heure se paierait.
/** Le facteur de prix d'une tension, à l'identique de `prixUnitaire`. */
function facteurTension(t) {
  return Math.pow(t, 0.85);
}

/**
 * L'intégrale du facteur de prix sur `duree` heures, l'étal évoluant droit.
 *
 * `u = stock + 0,35 cible` bouge linéairement, le facteur vaut `(A/u)^0,85`,
 * et la primitive de `u^-0,85` est `u^0,15 / 0,15`. Un seul segment : les
 * bornes du facteur sont levées (lot I bis), et l'intégrale, qui se découpait
 * en trois morceaux à leurs franchissements, s'est simplifiée avec elles.
 * Rien n'est approché.
 */
function integreFacteur(A, u0, pente, duree) {
  if (duree <= 0) return 0;
  if (pente === 0) return facteurTension(A / u0) * duree;
  const u1 = u0 + pente * duree;
  const bas = u0 < u1 ? u0 : u1;
  const haut = u0 < u1 ? u1 : u0;
  const vitesse = pente < 0 ? -pente : pente;
  return Math.pow(A, 0.85) * (Math.pow(haut, 0.15) - Math.pow(bas, 0.15))
    / (0.15 * vitesse);
}

/**
 * Ce qu'une marchandise vaut sur la tranche entière, en facteurs de prix :
 * l'intégrale de **la quantité servie par le prix de l'instant**, et non le
 * produit de la quantité totale par un prix moyen.
 *
 * La distinction n'est pas cosmétique, elle a été mesurée. Le prix moyen **dans
 * le temps** donne le même poids à l'heure où la ville sert sa pleine demande à
 * bas prix et à l'heure où elle ne sert plus que son arrivage au prix plafond.
 * Il surpondère donc les heures chères et maigres : l'erreur des rations passe
 * de +0,533 à +0,634 quand on l'emploie, c'est-à-dire qu'intégrer exactement la
 * mauvaise quantité fait pire qu'échantillonner grossièrement la bonne.
 *
 * `videH` est ce dont l'étal se vide par heure, et il n'est **pas** égal à
 * `veutH × part` pour les vivres : la ville facture ce que ses habitants
 * achètent, serrage de ceinture compris, mais son grenier se vide de ce qu'elle
 * *sert*, qui est le besoin entier. Confondre les deux laissait le prix des
 * rations dix pour cent trop bas — et c'était, une fois tout le reste corrigé,
 * la dernière marchandise en écart : les huit autres concordaient déjà à un
 * pour cent près avec le prix vrai.
 *
 * La trajectoire est celle de `servable`, et pas une autre — les deux doivent
 * raconter la même journée. Tant que le grenier tient, la ville sert sa demande
 * et l'étal se vide de `demande × part − arrivage` par heure ; après, elle ne
 * sert plus que ce qui arrive, sur un étal à zéro, donc à prix constant.
 */
export function valeurTranche(cible, sol, stock0, arriveH, veutH, videH, dt, dSol = 0) {
  const socle = cible * 0.35;
  const s0 = stock0 > 0 ? stock0 : 0;
  if (dt <= 1) return veutH * facteurTension(cible * sol / (s0 + socle));
  const pente = arriveH - videH;
  const tZero = pente < 0 && veutH > arriveH ? s0 / -pente : Infinity;
  const T1 = tZero < dt ? tZero : dt;
  // Le seuil est numérique, pas économique : une dérive sous le millième de
  // la solvabilité de départ pèse moins sur le facteur que l'erreur propre de
  // la quadrature — l'intégrale exacte à solvabilité mi-course est alors
  // meilleure ET moins chère.
  if (dSol === 0 || Math.abs(dSol) * dt < sol * 0.001) {
    sol += dSol * dt * 0.5;
    // Solvabilité constante : l'intégrale exacte d'un seul segment de
    // puissance, comme avant. C'est le chemin des tests-témoins, et celui des
    // tranches où la bourse ne bouge pas.
    const A = cible * sol;
    if (T1 >= dt) return veutH * integreFacteur(A, s0 + socle, pente, dt);
    return veutH * integreFacteur(A, s0 + socle, pente, T1)
      + arriveH * (dt - T1) * facteurTension(A / socle);
  }
  // --- La solvabilité bouge aussi, et elle bouge droit.
  //
  // Les bornes levées (lot I bis), la solvabilité est redevenue LINÉAIRE dans
  // la bourse — plus de plafond à vingt qui l'écrêtait — et la bourse évolue
  // d'un pas constant par heure. Tenir la solvabilité constante à mi-tranche
  // coûtait alors cher : `sol^0,85` est concave, la moyenne d'une concave est
  // sous la fonction de la moyenne, et la tranche surfacturait — mesuré,
  // caisse à −7,7 crédits d'erreur locale pour un critère à 0,1.
  //
  // L'intégrande `(sol(t))^0,85 × (u(t))^-0,85` à deux trajectoires linéaires
  // n'a pas de primitive élémentaire ; on l'intègre par Gauss-Legendre à deux
  // points PAR SEGMENT LISSE. La quadrature qui avait échoué au lot M0 ter
  // échouait parce que la trajectoire était fausse ; ici les deux trajectoires
  // sont exactes et découpées à leurs cassures — l'épuisement du grenier, la
  // bourse qui touche son plancher — et Gauss ne voit que du lisse.
  const solEn = (t) => {
    const v = sol + dSol * t;
    return v > SOLVABILITE.plancher ? v : SOLVABILITE.plancher;
  };
  const coupes = [0, T1, dt];
  if (dSol < 0) {
    const tS = (SOLVABILITE.plancher - sol) / dSol;
    if (tS > 0 && tS < dt) coupes.push(tS);
  }
  coupes.sort((a, b) => a - b);
  const G = 0.5 / Math.sqrt(3);
  let somme = 0;
  for (let i = 1; i < coupes.length; i++) {
    const a = coupes[i - 1];
    const L = coupes[i] - a;
    if (L <= 1e-12) continue;
    const phase1 = coupes[i] <= T1 + 1e-9;
    const q = phase1 ? veutH : arriveH;
    if (q <= 0) continue;
    const t1 = a + L * (0.5 - G);
    const t2 = a + L * (0.5 + G);
    const u1 = (phase1 ? s0 + pente * t1 : 0) + socle;
    const u2 = (phase1 ? s0 + pente * t2 : 0) + socle;
    somme += q * L * 0.5 * (Math.pow(cible * solEn(t1) / u1, 0.85)
      + Math.pow(cible * solEn(t2) / u2, 0.85));
  }
  return somme;
}

const PRIX_TRANCHE = new Float64Array(COMMODITY_KEYS.length);
const ARRIVEE_TRANCHE = new Float64Array(COMMODITY_KEYS.length);
const CIBLE_TRANCHE = new Float64Array(COMMODITY_KEYS.length);
const STOCK_TRANCHE = new Float64Array(COMMODITY_KEYS.length);
// La part de chaque denrée dans la facture de l'heure — le poids qu'il faut
// pour dériver la pente des prix en forme close dans le pas adaptatif (M6).
const CONTRIB_TRANCHE = new Float64Array(COMMODITY_KEYS.length);
// Les denrées vivantes de la tranche : celles que la ville consomme. Les
// autres ne bougent qu'avec leur arrivage — intégré en forme close à la
// sortie de la boucle, exactement ce que l'heure par heure rendait — et
// n'ont rien à faire dans la boucle de l'heure (M6).
const ACTIF_TRANCHE = new Int32Array(COMMODITY_KEYS.length);

export function servable(stock, parHeure, veutParHeure, dt, part = 1) {
  if (dt === 1) {
    const dispo = stock + parHeure;
    return veutParHeure < dispo ? veutParHeure : dispo;
  }
  const manque = veutParHeure - parHeure;
  const tout = veutParHeure * dt;
  if (manque <= 0) return tout;
  if (part >= 1) {
    const tenu = manque * dt;
    return parHeure * dt + (stock < tenu ? stock : tenu);
  }
  const vide = veutParHeure * part - parHeure;
  if (vide <= 0) return tout;
  const tenu = stock / vide;
  return tenu >= dt ? tout : veutParHeure * tenu + parHeure * (dt - tenu);
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

/**
 * `cours` : douze unités par tête est une somme en **ancien crédit**, et la
 * caisse à laquelle on la compare est en monnaie locale. Sans la division, un
 * pays dont la monnaie s'effondre garde un fonds de roulement nominal fixe
 * pendant que ses prix sont multipliés — donc négligeable, donc le trésor
 * ramasse tout et les villes ne peuvent plus rien acheter. C'est ce que
 * montrait la colonne « où est la masse » du balayage : sous un plancher de
 * 0,01, quatre-vingt-seize pour cent de la monnaie du monde était au trésor.
 * Voir CHANTIER §Lot H.
 */
export function reserveVille(col, taux, cours = 1) {
  return (col.pop || 0) * CAISSE.parTete * facteurReserve(taux) / cours;
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
  const cours = coursMonnaie(world, key);
  let leve = 0;
  for (const col of colonies) {
    const surplus = (col.caisse || 0) - reserveVille(col, taux, cours);
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
  pourvoirCharges(col, rng, t, log);
  tickNotables(col, rng, dt, reputation, log, t);
  tickServices(col, rng, dt, t);
  const prod = productionColonie(world, col);
  const cons = consommationColonie(col);
  // --- La reconversion se décide sur ce qui vient de se passer, pas avant.
  //
  // Elle était appelée en tête, et c'était un pur décalage de phase entre les
  // deux mailles. `PERIODE_EMPLOIS` vaut vingt-quatre heures : à la maille
  // fine, la reconversion tombe donc au vingt-quatrième appel, une fois la
  // journée produite aux anciens métiers ; à la maille grossière, elle tombait
  // au premier instant de la tranche, et les vingt-quatre heures étaient
  // produites aux **nouveaux**. Vingt-trois heures sur vingt-quatre du mauvais
  // côté du changement. Mesuré sur une ville : 186,65 rations récoltées à la
  // maille fine contre 180,76 à la grossière, pour un écart de stock de 5,64 —
  // c'est-à-dire tout l'écart de cette ville.
  //
  // Déplacée ici, elle voit la même journée des deux côtés. Le coût est nul :
  // c'est le même appel, à la même fréquence.
  ajusterEmplois(world, col, rng, dt);
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
  // La récolte du jour, amortie comme elle l'est plus bas au service des
  // vivres. Elle est hissée ici parce que la facture en a besoin : c'est le
  // point 1 de M0 ter.
  const amortiVivres = climat ? 1 + (climat.rendement('rations') - 1) * 0.45 : 1;
  // Ce que la ville sert par heure — le besoin entier, sans le serrage de
  // ceinture qui, lui, ne s'applique qu'à ce qu'on achète. C'est de ça que le
  // grenier se vide, et c'est donc ça qui commande le prix des vivres.
  const besoinVivresH = col.pop * 0.014 * (cons.cantine || 1);
  let facture = 0;
  // Sorti du bloc : la paie s'en sert aussi, plus bas, et un second appel à
  // `coursMonnaie` dans le chemin le plus chaud du moteur ne s'écrit pas.
  const ctx = col.avantPoste ? null : contextePrix(col, world);
  if (!col.avantPoste) {
    for (let i = 0; i < COMMODITY_KEYS.length; i++) {
      const k = COMMODITY_KEYS[i];
      const veut = (cons[k] || 0) * dt;
      if (veut <= 0) continue;
      // On ne facture que ce qui peut être servi : facturer le besoin plutôt
      // que l'étal vidait les poches pour des marchandises inexistantes.
      //
      // **Les rations y échappaient, et c'était un bug, pas un défaut de
      // maille.** Leur étal était réduit au stock d'avant la tranche, alors que
      // la récolte du jour entre bel et bien dans ce qui est servi (voir
      // `disponible`, plus bas dans cette fonction). Une ville qui récoltait et
      // n'avait plus de grenier mangeait donc sans que personne ne paie :
      // mesuré sur trente heures, les ménages *montaient* de 1 476 à 1 683
      // pendant que la caisse se vidait de 5 904 à 5 654. La moitié du circuit
      // manquait.
      const arriveH = k === 'rations' ? (prod.rations || 0) * amortiVivres : (prod[k] || 0);
      facture += servable(col.stock[k] || 0, arriveH, cons[k] || 0, dt)
        * prixUnitaire(col, k, undefined, world, ctx);
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
    // --- La branche se pré-décide ici, sur l'estimation de la première
    // passe — parce que la boucle horaire recalcule ses prix elle-même et
    // JETTE la facture de tranche. Lui offrir deux passes de Gauss et un
    // point fixe, c'était 37 % des tranches qui payaient le raffinement pour
    // rien — mesuré au compteur de voies. Le pré-filtre est conservateur :
    // il n'envoie en boucle que ce que l'estimation condamne déjà, et la
    // décision finale, après raffinement, revérifie comme avant.
    const duH0 = col.avantPoste
      ? 0 : valeurCourante(prod) * CAISSE.partSalariale / ctx.cours;
    const bouclePlausible = dt > 1 && (() => {
      const fH0 = facture / dt;
      const dM0 = duH0 - fH0;
      // Deux raisons d'aller au reprix horaire : la bourse bute (le minimum
      // linéaire passe sous la note de l'heure), ou la bourse TOURNE en moins
      // d'une journée — la paie du jour dépasse ce qu'elle contient. Dans ce
      // second régime la trajectoire de la bourse est concave (la dépense
      // accélère à mesure que la solvabilité remonte) et tout modèle linéaire
      // la surestime : mesuré, jusqu'à −510 de caisse sur une ville en une
      // journée. Ce n'est pas une règle de jeu, c'est la frontière de validité
      // du modèle de tranche — au-delà, la boucle horaire est la vérité.
      const imp0 = col.faction && world.factions[col.faction]
        ? loisDe(world, col.faction).impot : 0;
      const dC0 = fH0 * (1 - imp0) - duH0;
      const mT = Math.min(col.menages || 0, (col.menages || 0) + (dt - 1) * dM0) >= fH0;
      const cT = Math.min(col.caisse || 0, (col.caisse || 0) + (dt - 1) * dC0)
        + fH0 * (1 - imp0) >= duH0;
      return !mT || (col.menages || 0) < duH0 * dt * TRANCHE.rotationBourse;
    })();
    if (dt > 1 && facture > 0 && !bouclePlausible) {
      const demi = dt / 2;
      // Ce que les habitants auront à dépenser sur la tranche : leur bourse
      // **plus les salaires qui tombent pendant**. Sans eux, une ville dont les
      // poches sont vides au matin passe pour ne rien pouvoir acheter de la
      // journée, alors qu'elle vit précisément de la paie de l'heure — et la
      // part servie se retrouve fausse d'un facteur deux.
      const aDepenser = (col.menages || 0)
        + (col.avantPoste ? 0 : valeurCourante(prod) * CAISSE.partSalariale / ctx.cours) * dt;
      const partP = Math.min(1, aDepenser / facture);
      // --- Le prix moyen de la tranche, intégré au lieu d'être échantillonné.
      //
      // Le point milieu annule le terme d'ordre un, et M0 bis l'a mesuré. Il ne
      // fait rien au terme d'ordre deux, et sur cette courbe-là il est gros :
      // `prixUnitaire` est en `tension^0,85` avec deux bornes, donc convexe en
      // ce qui reste sur l'étal. Mesuré sur deux villes fauchées : prix moyen de
      // 18,20 et 11,74 à la maille fine contre 16,77 et 10,60 à la grossière,
      // pour des quantités identiques à un pour cent près. **Huit à dix pour
      // cent de facture manquante, et rien d'autre.**
      //
      // L'idée a été bornée avant d'être écrite, comme M0 bis : en donnant à la
      // tranche le **vrai** prix moyen de la journée — obtenu en trichant, par
      // un clone joué heure par heure —, l'erreur des rations tombe de +0,533 à
      // **+0,067**. Le prix est donc toute l'histoire restante, et il vaut la
      // peine de l'intégrer pour de bon.
      //
      // Et il s'intègre : l'étal évolue linéairement sur la tranche, le facteur
      // est une puissance de son inverse, et la primitive de `u^-0,85` est
      // `u^0,15 / 0,15`. Deux échantillons de Gauss ne rendaient que deux pour
      // cent — une meilleure quadrature ne sauve pas une trajectoire mal
      // découpée par des bornes. La forme close, elle, découpe aux bornes.
      const salaireH = col.avantPoste
        ? 0 : valeurCourante(prod) * CAISSE.partSalariale / ctx.cours;
      // La solvabilité de DÉPART et sa pente, plus un point milieu : depuis la
      // levée des bornes (lot I bis) elle est linéaire dans la bourse, donc sa
      // trajectoire est connue exactement, et `valeurTranche` l'intègre comme
      // elle intègre l'étal. Le point milieu qui vivait ici surfacturait —
      // `sol^0,85` est concave, la moyenne d'une concave est sous la fonction
      // de la moyenne — et l'erreur locale de caisse valait −7,7 pour un
      // critère à 0,1.
      const sol0 = solvabiliteDe(col, col.menages || 0, ctx.cours);
      const ordinaireSol = (col.pop || 0) * MENAGES.parTete / ctx.cours;
      // --- L'humeur du MILIEU de tranche, pas celle du départ.
      //
      // La grogne évolue dans la journée — elle retombe quand on mange, elle
      // monte quand on a faim — et la maille fine relit l'humeur à chaque
      // heure. Le modèle de tranche la figeait au départ : un dixième de
      // grogne en moins sur la journée, c'est 3,5 % de prix, et c'était la
      // signature exacte des dernières villes fautives de la voie rapide —
      // ±40 à ±50 crédits par jour, sans qu'aucun plafond ne morde. L'humeur
      // entre LINÉAIREMENT dans le prix : sa moyenne exacte sur la tranche est
      // sa valeur à mi-course, il n'y a rien à intégrer.
      //
      // Le sens de sa pente se prédit avec ce qu'on a déjà : la satiété
      // attendue de la tranche — ce que l'étal des vivres peut servir à la
      // part que les bourses paieront.
      const arrRat0 = (prod.rations || 0) * amortiVivres;
      const sEst = besoinVivresH > 0
        ? servable(col.stock.rations || 0, arrRat0, besoinVivresH * partP, dt)
          / (besoinVivresH * dt)
        : 1;
      const u0h = col.unrest || 0;
      const unrestMid = sEst < 0.8
        ? Math.min(1, u0h + 0.004 * (0.8 - sEst) / 0.8 * (dt / 2))
        : Math.max(0, u0h - (0.0035 + ordreDe(col) * 0.006) * (dt / 2));
      const humeurMid = 1 + unrestMid * 0.35;
      // La pente de la bourse s'estime sur la facture de la PREMIÈRE passe —
      // comme le point milieu le faisait — parce que celle de la seconde est
      // précisément en train de se construire : la lire pendant qu'on
      // l'accumule rendait une pente différente par marchandise, selon l'ordre
      // de la boucle. Le point fixe plus bas la réestime avec la facture
      // aboutie.
      // Cette pente n'est exacte que là où rien ne bute — et c'est exactement
      // là qu'elle sert : la voie rapide. Les villes où un plafond mord
      // passent par la boucle horaire, qui recalcule le prix de l'heure et n'a
      // pas besoin de ce modèle.
      // Le salaire de la pente est celui que la CAISSE peut suivre, pas celui
      // qui est dû : dans une ville où la caisse borne la paie — la moitié des
      // tranches du monde —, ce qui entre vraiment dans les poches chaque
      // heure est ce que la caisse encaisse, l'impôt déduit, plus ce qu'elle
      // avait d'avance. Prendre le salaire plein surestimait la pente, donc
      // les prix, donc la facture — mesuré : caisse à −3,26 d'erreur locale.
      const impot0 = col.faction && world.factions[col.faction]
        ? loisDe(world, col.faction).impot : 0;
      const salaireTenable = Math.min(salaireH,
        (facture / dt) * (1 - impot0) + Math.max(0, col.caisse || 0) / dt);
      const dSol0 = ordinaireSol > 0
        ? (salaireTenable - facture / dt) / ordinaireSol : 0;
      const echelle = humeurMid / ctx.cours;
      void demi;
      facture = 0;
      for (let i = 0; i < COMMODITY_KEYS.length; i++) {
        const k = COMMODITY_KEYS[i];
        const veut = (cons[k] || 0) * dt;
        PRIX_TRANCHE[i] = 0;
        if (veut <= 0) continue;
        // Même arrivage que le service des vivres, pour les rations comme pour
        // le reste : la projection de l'étal à mi-tranche mentait d'autant que
        // la saison écartait le rendement de un.
        const amorti = k === 'rations'
          ? amortiVivres : 1 + ((climat ? climat.rendement(k) : 1) - 1) * 0.45;
        const arriveH = k === 'rations' ? (prod.rations || 0) * amortiVivres : (prod[k] || 0);
        void amorti;
        const qTranche = servable(col.stock[k] || 0, arriveH, cons[k] || 0, dt, partP);
        const videH = (k === 'rations' ? besoinVivresH : (cons[k] || 0)) * partP;
        const valeur = COMMODITIES[k].prix * echelle * valeurTranche(
          Math.max(1, cibleStock(col, k)), sol0, col.stock[k] || 0,
          arriveH, cons[k] || 0, videH, dt, dSol0);
        // Le point fixe plus bas raisonne en prix unitaire : on lui rend celui
        // qui, multiplié par la quantité, redonne exactement cette valeur-là.
        PRIX_TRANCHE[i] = qTranche > 0 ? valeur / qTranche : 0;
        ARRIVEE_TRANCHE[i] = arriveH;
        CIBLE_TRANCHE[i] = Math.max(1, cibleStock(col, k));
        facture += valeur;
      }

      // --- Le point fixe de la part servie.
      //
      // La part dépend de la facture — ce qu'on peut payer sur ce qu'on doit —
      // et la facture dépend de la part, puisqu'un étal qu'on n'achète qu'à
      // moitié se vide deux fois moins vite et reste donc à vendre deux fois
      // plus longtemps. Une seule évaluation part d'une part trop haute et
      // sous-corrige.
      //
      // Deux itérations suffisent, et elles ne coûtent rien : les prix de la
      // tranche sont déjà calculés, on ne refait que les quantités. Aucun appel
      // à `prixUnitaire`, aucune allocation — c'est pour ça que les deux
      // tableaux vivent au module.
      // Et la facture nourrit la pente de la bourse, qui nourrit les prix, qui
      // nourrissent la facture : les deux itérations recalculent donc AUSSI la
      // valeur intégrée, pas seulement les quantités. Le surcoût est mesuré à
      // la garde de vitesse, pas supposé.
      // Une seule itération de prix : la deuxième corrigeait sous le pour
      // cent — mesuré à l'erreur locale, identique au dixième près — et
      // coûtait une passe de Gauss entière par tranche.
      for (let it = 0; it < 1; it++) {
        const p2 = Math.min(1, aDepenser / Math.max(1e-9, facture));
        const salaireTenable2 = Math.min(salaireH,
          (facture / dt) * (1 - impot0) + Math.max(0, col.caisse || 0) / dt);
        const dSol2 = ordinaireSol > 0
          ? (salaireTenable2 - facture / dt) / ordinaireSol : 0;
        let f2 = 0;
        for (let i = 0; i < COMMODITY_KEYS.length; i++) {
          if (PRIX_TRANCHE[i] <= 0) continue;
          const k = COMMODITY_KEYS[i];
          const videH2 = (k === 'rations' ? besoinVivresH : (cons[k] || 0)) * p2;
          const q2 = servable(col.stock[k] || 0, ARRIVEE_TRANCHE[i], cons[k] || 0, dt, p2);
          const v2 = COMMODITIES[k].prix * echelle * valeurTranche(
            CIBLE_TRANCHE[i], sol0, col.stock[k] || 0,
            ARRIVEE_TRANCHE[i], cons[k] || 0, videH2, dt, dSol2);
          PRIX_TRANCHE[i] = q2 > 0 ? v2 / q2 : 0;
          f2 += v2;
        }
        facture = f2;
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
  // `valeurCourante` somme des `COMMODITIES[k].prix`, c'est-à-dire les prix de
  // référence d'avant l'effondrement : un salaire calculé là-dessus est libellé
  // en **ancien crédit**, alors que la note que ces mêmes gens vont payer est
  // divisée par le cours. Le pays dont la monnaie tombe au quart payait donc
  // quatre fois plus cher en gagnant exactement autant, et son salaire réel
  // tombait à zéro en une heure — sans qu'aucune règle ne l'ait décidé. Voir
  // CHANTIER §Lot H.
  const duHeure = col.avantPoste
    ? 0 : valeurCourante(prod) * CAISSE.partSalariale / ctx.cours;
  let regle = 0;
  let paye = 0;
  // --- Les vivres se servent dans le circuit, pas après lui.
  //
  // Point 3 de M0 ter, et c'est le dernier morceau. Après les points 1 et 2,
  // quatre grandeurs sur cinq passaient sous le plancher de bruit et il ne
  // restait que les rations : +2,331 à `dt = 24` pour un critère à 0,1.
  //
  // Le témoin négatif désigne un seul coupable et sans ambiguïté : forcer
  // `part` à 1 fait tomber l'erreur de **+2,331 à −0,011**. Ce n'est ni les
  // prix, ni le serrage de ceinture (gelé, il ne rend que 2,331 → 2,032), ni la
  // population. C'est que la part servie est une **moyenne de tranche** appliquée
  // à un service qui sature : vingt-quatre heures où l'on peut payer la moitié
  // ne nourrissent pas comme une journée où l'on peut payer la moitié.
  //
  // Et il n'y a pas de sous-pas à payer pour ça : la boucle horaire existe
  // déjà, plus bas, pour les tranches où un plafond mord — soit exactement les
  // tranches où `part` varie. Là où la voie rapide passe, `part` vaut un à
  // chaque heure par construction, donc la moyenne est exacte. On sert donc les
  // vivres heure par heure là où la boucle tourne, et en forme close ailleurs.
  const arrivageH = (prod.rations || 0) * amortiVivres;
  const besoinH = besoinVivresH;
  let stockVivres = col.stock.rations || 0;
  let servi = 0;
  let vivresServies = false;
  let partDejaServie = false;
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
  // La bourse qui tourne en moins d'un jour va au reprix, comme au
  // pré-filtre : même frontière, même raison.
  const bourseTourne = dt > 1 && !col.avantPoste && m0 < duHeure * dt * TRANCHE.rotationBourse;
  if (dt === 1 || (menagesTient && caisseTient && !bourseTourne)) {
    VOIES[dt === 1 ? 'fine' : 'rapide'] += 1;
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
  } else if (menagesTient && !bourseTourne) {
    // --- La boucle simple : la caisse borne, pas les ménages.
    //
    // La moitié des tranches du monde passent ici (mesuré : 50 % pour la
    // caisse seule, 3 % pour les ménages). Quand seuls les salaires butent
    // sur la caisse, la bourse des habitants ne touche jamais zéro : sa
    // trajectoire reste celle que la forme close intègre, les prix de tranche
    // sont bons, et le reprix horaire ne changerait rien — vérifié au juge de
    // qualité (partie 2 du banc, quarante jours contre placebo) : mêmes cinq
    // verdicts sous le plancher avec ou sans. Seul le coût change.
    VOIES.simple += 1;
    const fisc = impot > 0 ? world.factions[col.faction] : null;
    let menages = m0;
    let caisse = c0;
    for (let h = 0; h < dt; h++) {
      let achatH = 0;
      if (factureHeure > 0) {
        const achat = factureHeure < menages ? factureHeure : menages;
        if (achat > 0) {
          menages -= achat;
          const pris = achat * impot;
          if (fisc) fisc.tresor += pris;
          caisse += achat - pris;
          regle += achat;
          achatH = achat;
        }
      }
      if (duHeure > 0) {
        const verse = duHeure < caisse ? duHeure : caisse;
        caisse -= verse;
        menages += verse;
        paye += verse;
      }
      if (besoinH > 0) {
        const partH = factureHeure > 0 ? achatH / factureHeure : 1;
        const dispo = stockVivres + arrivageH;
        const veutV = besoinH * partH;
        const sH = veutV < dispo ? veutV : dispo;
        servi += sH;
        stockVivres = dispo - sH;
      }
    }
    col.menages = menages;
    col.caisse = caisse;
    vivresServies = true;
  } else {
    VOIES.reprix += 1;
    VOIES.heuresReprix += dt;
    const fisc = impot > 0 ? world.factions[col.faction] : null;
    let menages = m0;
    let caisse = c0;
    // --- Le prix de l'heure, dans la boucle de l'heure.
    //
    // Depuis la levée des bornes (lot I bis), les villes de cette branche —
    // celles où un plafond mord — vivent des journées à DEUX régimes : les
    // poches se remplissent de la paie tant que les prix sont bas, puis les
    // prix montent avec la solvabilité et l'argent repart. Aucun prix de
    // tranche, intégré ou non, ne raconte ça : mesuré, l'erreur locale de
    // caisse restait entre −6,4 et −7,7 pour un critère à 0,1, quelle que soit
    // la sophistication du modèle — pente partout, pente nulle, Gauss. La
    // seule vérité de ce régime est le prix de l'heure, et cette boucle
    // avançait déjà l'argent heure par heure : elle reprend donc aussi les
    // prix, exactement comme la maille fine les lit — la solvabilité de
    // l'instant, l'étal de l'instant. Le surcoût ne touche que les villes de
    // cette branche ; les villes libres gardent la forme close, exacte chez
    // elles.
    //
    // `facture` et `regle` gardent leur sens de tranche : la somme des heures.
    const nbK = COMMODITY_KEYS.length;
    if (!col.avantPoste) facture = 0;
    let stocksServis = false;
    if (!col.avantPoste) {
      const ordinaireH = (col.pop || 0) * MENAGES.parTete / ctx.cours;
      // L'humeur de l'heure, suivie comme la maille fine la vit : la grogne
      // monte avec la faim de l'heure, retombe quand on mange, et grince quand
      // la paie manque. Suivi LOCAL, pour les prix seulement — la grogne de la
      // ville est mise à jour après la tranche, par le même code qu'avant, sur
      // les mêmes agrégats : rien n'est compté deux fois, et pas un tirage ne
      // bouge.
      let unrestH = col.unrest || 0;
      const retombeeH = 0.0035 + ordreDe(col) * 0.006;
      let nbA = 0;
      for (let i = 0; i < nbK; i++) {
        const k = COMMODITY_KEYS[i];
        CIBLE_TRANCHE[i] = Math.max(1, cibleStock(col, k));
        ARRIVEE_TRANCHE[i] = k === 'rations'
          ? (prod.rations || 0) * amortiVivres
          : (prod[k] || 0) * (1 + ((climat ? climat.rendement(k) : 1) - 1) * 0.45);
        STOCK_TRANCHE[i] = col.stock[k] || 0;
        PRIX_TRANCHE[i] = COMMODITIES[k].prix;
        if ((cons[k] || 0) > 0) ACTIF_TRANCHE[nbA++] = i;
      }
      // --- Le pas adaptatif du prix (M6). Le coût de cette boucle, c'est le
      // reprix : sept pow par heure, à mille heures du joueur. Or entre deux
      // heures, les trois moteurs du prix — solvabilité, tension des étals,
      // grogne — dérivent lentement dans les phases stables, et leur pente
      // dln(fH)/dh se calcule en forme close. On ne paie donc les pow qu'aux
      // ANCRES ; les heures d'une fenêtre prennent le prix extrapolé au
      // premier ordre le long de la pente. Les FLUX, eux, restent exacts
      // heure par heure — achats, paie, étals, vivres, grogne, tous les min()
      // et les écrêtages : seul le prix est estimé, jamais le régime. La
      // fenêtre se dimensionne pour que la dérive estimée reste sous tolSaut,
      // se referme d'elle-même quand un régime bascule (l'argent vient à
      // manquer, la paie cesse de passer, la satiété change de côté), et
      // chaque ancre repart des vrais pow : l'erreur ne se transmet pas d'une
      // fenêtre à l'autre. Geler les prix SANS la pente biaisait — mesuré,
      // les monnaies effondrées tombaient de 12 à 4 sur les mêmes graines,
      // parce que sur une rampe l'erreur est toujours du même signe. Aucun
      // tirage ne vit ici : estimer un prix ne décale pas les dés.
      let fBase = 0;
      let gW = 0;
      let hAncre = 0;
      let finFenetre = 0;
      let dMenPrev = 0;
      let dUPrev = 0;
      let partHPrev = 1;
      let paiePleinePrev = true;
      let faimPrev = false;
      for (let h = 0; h < dt; h++) {
        const mDebut = menages;
        const uAvant = unrestH;
        if (h >= finFenetre) {
          // L'ancre : les vrais pow, et la pente pour la fenêtre qui s'ouvre.
          const solH = Math.max(SOLVABILITE.plancher,
            ordinaireH > 0 ? menages / ordinaireH : 1);
          const solF = Math.pow(solH, 0.85) * (1 + unrestH * 0.35) / ctx.cours;
          fBase = 0;
          for (let a = 0; a < nbA; a++) {
            const i = ACTIF_TRANCHE[a];
            const veutK = cons[COMMODITY_KEYS[i]];
            const dispo = STOCK_TRANCHE[i] + ARRIVEE_TRANCHE[i];
            const sert = veutK < dispo ? veutK : dispo;
            const contrib = sert * PRIX_TRANCHE[i] * solF * Math.pow(
              CIBLE_TRANCHE[i] / (STOCK_TRANCHE[i] + CIBLE_TRANCHE[i] * 0.35), 0.85);
            CONTRIB_TRANCHE[i] = contrib;
            fBase += contrib;
          }
          gW = 0;
          let K = 1;
          if (TRANCHE.tolSaut > 0 && h > 0) {
            // La pente, moteur par moteur, sur les flux de l'heure d'avant.
            // La solvabilité ne pèse que si elle vit (au-dessus du plancher) ;
            // chaque étal pèse de sa part dans la facture de l'ancre. Et la
            // fenêtre s'arrête AVANT qu'un étal croise sa demande : quand
            // `sert` bascule de « la demande » à « ce qui reste », le vrai
            // prix décroche, et l'extrapoler par-dessus surestimait toujours
            // dans le même sens — mesuré, les monnaies effondrées tombaient
            // de 12 à 2 sur les mêmes graines tant que cette borne manquait.
            let borneK = TRANCHE.fenetreMax;
            if (dMenPrev !== 0 && menages > 0 && solH > SOLVABILITE.plancher) {
              gW += 0.85 * (dMenPrev / menages);
            }
            if (dUPrev !== 0) gW += 0.35 * dUPrev / (1 + unrestH * 0.35);
            if (fBase > 0) {
              for (let a = 0; a < nbA; a++) {
                const i = ACTIF_TRANCHE[a];
                if (CONTRIB_TRANCHE[i] === 0) continue;
                const veutK = cons[COMMODITY_KEYS[i]];
                const st = STOCK_TRANCHE[i];
                const arr = ARRIVEE_TRANCHE[i];
                const fl = st <= 0 && arr - veutK * partHPrev <= 0
                  ? 0 : arr - veutK * partHPrev;
                if (fl !== 0) {
                  gW += (CONTRIB_TRANCHE[i] / fBase) * -0.85
                    * (fl / (st + CIBLE_TRANCHE[i] * 0.35));
                }
                const dispo = st + arr;
                if (veutK < dispo) {
                  // Régime demande : l'étal croisera-t-il la demande ?
                  if (fl < 0) borneK = Math.min(borneK, (dispo - veutK) / -fl);
                } else {
                  // Régime pénurie : sert = ce qui reste, et il bouge avec le
                  // flux — la pente doit le porter aussi.
                  if (fl !== 0 && dispo > 0) {
                    gW += (CONTRIB_TRANCHE[i] / fBase) * (fl / dispo);
                    if (fl > 0) borneK = Math.min(borneK, (veutK - dispo) / fl);
                  }
                }
              }
            }
            K = Math.max(1, Math.min(
              TRANCHE.fenetreMax,
              Math.floor(borneK),
              gW !== 0 ? Math.floor(TRANCHE.tolSaut / Math.abs(gW)) : TRANCHE.fenetreMax,
            ));
          }
          hAncre = h;
          finFenetre = h + K;
        } else {
          VOIES.heuresEstimees += 1;
        }
        const fH = h === hAncre ? fBase
          : Math.max(0, fBase * (1 + gW * (h - hAncre)));
        let achatH = 0;
        if (fH > 0) {
          const achat = fH < menages ? fH : menages;
          if (achat > 0) {
            menages -= achat;
            const pris = achat * impot;
            if (fisc) fisc.tresor += pris;
            caisse += achat - pris;
            regle += achat;
            achatH = achat;
          }
        }
        facture += fH;
        let verseH = 0;
        if (duHeure > 0) {
          verseH = duHeure < caisse ? duHeure : caisse;
          caisse -= verseH;
          menages += verseH;
          paye += verseH;
        }
        const partH = fH > 0 ? achatH / fH : 1;
        // Les étals de l'heure — les seules denrées que l'heure concerne :
        // celles qu'on y consomme. Ce qui arrive, moins ce qui part au rythme
        // que cette heure-ci pouvait payer.
        for (let a = 0; a < nbA; a++) {
          const i = ACTIF_TRANCHE[a];
          const sBrut = STOCK_TRANCHE[i] + ARRIVEE_TRANCHE[i]
            - cons[COMMODITY_KEYS[i]] * partH;
          STOCK_TRANCHE[i] = sBrut > 0 ? sBrut : 0;
        }
        // Et ce que la ville a servi à manger cette heure-ci.
        let satH = 1;
        let sHv = 0;
        if (besoinH > 0) {
          const dispo = stockVivres + arrivageH;
          const veutV = besoinH * partH;
          sHv = veutV < dispo ? veutV : dispo;
          servi += sHv;
          stockVivres = dispo - sHv;
          satH = sHv / besoinH;
        }
        // L'humeur de l'heure suivante : la faim de celle-ci, dans l'ordre où
        // la maille fine la vit. La grogne des impayés, elle, reste au compte
        // de tranche d'après la boucle — même formule, mêmes agrégats.
        if (satH < 0.8) unrestH = Math.min(1, unrestH + 0.004 * (0.8 - satH) / 0.8);
        else unrestH = Math.max(0, unrestH - retombeeH);
        // Une bascule de régime rend la pente caduque : la fenêtre se
        // referme, la prochaine heure ré-ancre sur les vrais pow.
        const paiePleine = duHeure <= 0 || verseH === duHeure;
        const faim = satH < 0.8;
        if ((partH < 1) !== (partHPrev < 1) || paiePleine !== paiePleinePrev
          || faim !== faimPrev) {
          finFenetre = h + 1;
        }
        dMenPrev = menages - mDebut;
        dUPrev = unrestH - uAvant;
        partHPrev = partH;
        paiePleinePrev = paiePleine;
        faimPrev = faim;

        // --- Le saut de fin de fenêtre. La fenêtre garantit déjà que les
        // prix dérivent de moins de tolSaut et qu'aucun étal ne croise sa
        // demande jusqu'à sa fin. Si en plus le régime de l'argent est stable
        // — bénin (la note se paie en entier) ou épinglé (la ville pauvre au
        // point fixe : tout ce que la paie apporte se dépense, la bourse
        // cycle sur `verse`) — alors les heures restantes de la fenêtre sont
        // un polynôme, pas une boucle : on les applique d'un coup, prix au
        // trapèze le long de la pente. La prochaine itération tombe sur
        // l'ancre suivante et repart des vrais pow.
        const M = finFenetre - 1 - h;
        if (TRANCHE.sautFin !== false && M >= 2 && TRANCHE.tolSaut > 0 && paiePleine
          && !(besoinH > 0 && satH < 1 && Math.abs(satH - 0.8) <= 0.03)) {
          const tol = TRANCHE.tolSaut;
          const epingle = partH < 1 && duHeure > 0 && achatH > 0
            && fH * (1 - 3 * tol) >= verseH
            && Math.abs(achatH - verseH) <= tol * Math.max(verseH, 1);
          if (partH === 1 || epingle) {
            let N = M;
            const dMen = partH === 1 ? verseH - achatH : 0;
            const dCai = achatH * (1 - impot) - verseH;
            const dU = unrestH - uAvant;
            // L'argent continue de couvrir la note, la caisse la paie, la
            // grogne ne touche pas d'écrêtage, les vivres ne changent pas de
            // camp — sinon on raccourcit le saut, et le reste se rejoue.
            if (partH === 1) {
              // La note ne doit pas rattraper la bourse pendant le saut : la
              // bourse avance de dMen par heure, la note de fH·gW — si la
              // seconde gagne, le vrai régime bascule en épinglé en cours de
              // route et le saut s'arrête avant.
              const ecartement = dMen - fH * gW;
              if (ecartement < 0) {
                N = Math.min(N, (menages - fH * (1 + 3 * tol)) / -ecartement);
              }
            } else {
              // Épinglé : la note doit rester au-dessus de `verse` — une note
              // qui fond (gW < 0) finit par repasser sous la paie, et le vrai
              // régime redevient bénin.
              if (gW < 0) {
                N = Math.min(N, (fH * (1 - 3 * tol) - verseH) / (fH * -gW));
              }
            }
            if (duHeure > 0 && dCai < 0) N = Math.min(N, (caisse - duHeure) / -dCai);
            if (dU > 0) N = Math.min(N, (1 - unrestH) / dU);
            else if (dU < 0) N = Math.min(N, unrestH / -dU);
            let flV = 0;
            if (besoinH > 0) {
              flV = stockVivres <= 0 && arrivageH - besoinH * partH <= 0
                ? 0 : arrivageH - besoinH * partH;
              if (flV < 0) {
                N = Math.min(N, (stockVivres + arrivageH - besoinH * partH) / -flV);
              }
            }
            N = Math.floor(N);
            if (N >= 2) {
              // Les prix des N heures, au trapèze le long de la pente : le
              // facteur moyen vaut φ à mi-chemin du saut.
              const phiMid = 1 + gW * (h - hAncre + (N + 1) / 2);
              const sommeF = N * fBase * (phiMid > 0 ? phiMid : 0);
              const sommeAchat = partH === 1 ? sommeF : N * verseH;
              const sommePart = partH === 1
                ? N : N * (verseH / fH) * (2 - (phiMid > 0 ? phiMid : 0));
              menages += N * verseH - sommeAchat;
              caisse += sommeAchat * (1 - impot) - N * verseH;
              if (fisc) fisc.tresor += sommeAchat * impot;
              regle += sommeAchat;
              facture += sommeF;
              paye += N * verseH;
              for (let a = 0; a < nbA; a++) {
                const i = ACTIF_TRANCHE[a];
                const veutK = cons[COMMODITY_KEYS[i]];
                if (STOCK_TRANCHE[i] <= 0
                  && ARRIVEE_TRANCHE[i] - veutK * partH <= 0) continue;
                STOCK_TRANCHE[i] = Math.max(0,
                  STOCK_TRANCHE[i] + N * ARRIVEE_TRANCHE[i] - veutK * sommePart);
              }
              if (besoinH > 0) {
                if (stockVivres <= 0 && flV === 0) {
                  // Garde-manger à sec : chaque heure répétée sert l'arrivage
                  // seul — pas le fond de stock que cette heure-ci a fini.
                  servi += N * arrivageH;
                } else {
                  servi += besoinH * sommePart;
                  stockVivres = Math.max(0,
                    stockVivres + N * arrivageH - besoinH * sommePart);
                }
              }
              unrestH = Math.min(1, Math.max(0, unrestH + N * dU));
              VOIES.heuresEstimees += N;
              h += N;
            }
          }
        }
      }
      // Les denrées que la ville ne consomme pas n'ont pas vécu la boucle :
      // leur étal ne bouge qu'avec l'arrivage, intégré ici en forme close —
      // exactement ce que l'heure par heure rendait (le plancher à zéro ne
      // mord jamais quand rien ne sort).
      {
        let a2 = 0;
        for (let i = 0; i < nbK; i++) {
          if (a2 < nbA && ACTIF_TRANCHE[a2] === i) { a2++; continue; }
          STOCK_TRANCHE[i] += dt * ARRIVEE_TRANCHE[i];
        }
      }
      for (let i = 0; i < nbK; i++) {
        if (COMMODITY_KEYS[i] === 'rations') continue;
        col.stock[COMMODITY_KEYS[i]] = STOCK_TRANCHE[i];
      }
      stocksServis = true;
    } else if (duHeure > 0) {
      // La paie seule, en forme close — exactement ce que la boucle heure par
      // heure rendait : la caisse ne fait que descendre, et verser
      // min(duHeure, caisse) chaque heure pendant dt heures sort
      // min(dt · duHeure, caisse) en tout, au centime près.
      const verse = Math.min(dt * duHeure, caisse);
      caisse -= verse;
      menages += verse;
      paye += verse;
    }
    col.menages = menages;
    col.caisse = caisse;
    vivresServies = true;
    if (stocksServis) partDejaServie = true;
  }
  const part = facture > 0 ? regle / facture : 1;


  if (!partDejaServie) {
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
  //
  // La boucle du circuit les a déjà servies heure par heure quand elle a
  // tourné. Sinon, la part vaut un à chaque heure de la tranche et la forme
  // close de `servable` rend exactement la même chose, sans boucler.
  //
  // `servable` et non `min` : c'est ici, au service des vivres, que la somme
  // des minimums comptait le plus. Une ville qui récolte chaque heure et n'a
  // pas de grenier sert vingt-quatre fois sa récolte horaire ; le `min` d'une
  // tranche lui en servait une seule fois vingt-quatre.
  const besoin = besoinH * dt;
  if (!vivresServies) {
    servi = servable(col.stock.rations || 0, arrivageH, besoinH * part, dt);
    stockVivres = (col.stock.rations || 0) + arrivageH * dt - servi;
  }
  col.stock.rations = stockVivres > 0 ? stockVivres : 0;
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

  // Coupée de ses vivres et le ventre vide, la garnison fond : on ne tient pas
  // des murs en jeûnant. C'est ce qui permet de prendre une place sans l'avoir
  // abattue pierre par pierre — mais seulement à qui a choisi de l'affamer,
  // jamais par le seul fait qu'une colonne campe devant (M1c-S3).
  if (satiete < SIEGE_FAIM.seuil && vivresCoupees(world, col, t)) {
    const manque = (SIEGE_FAIM.seuil - satiete) / SIEGE_FAIM.seuil;
    col.defense = Math.max(0, col.defense * (1 - SIEGE_FAIM.fonte * manque * dt));
  }

  if (satiete < 0.8) {
    // On se serre la ceinture, puis on s'énerve, puis on s'en va.
    //
    // **Un compte ne se regroupe pas** (`METHODE.md` §3, et la primitive
    // `combienDeFois` écrite pour ça au lot M1). `rng.chance(surDt(p))` rend
    // bien la probabilité qu'un départ arrive au moins une fois dans la
    // tranche, mais le code n'en faisait ensuite partir qu'un seul : vingt-
    // quatre heures fines autorisent vingt-quatre départs, une tranche de
    // vingt-quatre n'en autorisait qu'un. Mesuré à l'instrument de comptage
    // (`banc --maille`, partie 4) : **une ville lointaine remuait 40 % de gens
    // en moins** qu'une ville proche dans le même état.
    col.unrest = Math.min(1, col.unrest + 0.004 * (0.8 - satiete) / 0.8 * dt);
    const partis = combienDeFois(rng, 0.05 * (0.8 - satiete) / 0.8, dt);
    for (let n = 0; n < partis; n++) {
      // Zéro, plus vingt-cinq : le plancher est levé (lot I, « tout doit être
      // possible »). Il gardait vingt-cinq habitants assignés à mourir de faim
      // sur place sans le droit de partir — et il REMONTAIT à vingt-cinq un
      // hameau qui n'en avait plus que trois, mesuré au décor du lot. La garde
      // `pop` de CIBLES.json continue de dire si le monde ordinaire se vide ;
      // ce n'est pas le travail d'un plancher caché dans le tick.
      col.pop = Math.max(0, col.pop - rng.irange(1, 3));
    }
  } else {
    // Le chef de la ville pèse sur ce que l'agitation retombe ou non : un dur
    // tient sa place, un bonhomme la laisse filer.
    col.unrest = Math.max(0, col.unrest - (0.0035 + ordreDe(col) * 0.006) * dt);
    // La croissance suit l'abondance, pas le hasard seul.
    const abondance = Math.min(1, (col.stock.rations || 0) / Math.max(1, col.pop * 0.6));
    const nes = combienDeFois(rng, 0.03 + abondance * 0.05, dt);
    for (let n = 0; n < nes; n++) col.pop += rng.irange(0, 2);
  }
  col.pop = Math.min(col.taille * 900, col.pop);

  // Une ville sans personne est une ruine — c'est une définition, pas une
  // règle de plus. Sans elle, le plancher levé fabriquait le fantôme parfait :
  // une ville de zéro habitant a un besoin nul, donc une satiété parfaite,
  // donc une grogne qui retombe, donc un déclin qui n'arrive jamais — elle
  // tournait pour toujours et aucune garde ne pouvait la voir.
  if (col.pop < 1) return { evenement: 'effondrement' };

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

  // Le plafond de stock — « on ne stocke pas l'infini », quatre fois la
  // cible — est levé (lot I bis) : les années grasses se gardent, et c'est le
  // prix qui régule désormais l'entassement au lieu d'une coupe silencieuse.
  // Un étal qui déborde cote de moins en moins (la tension tombe en loi de
  // puissance, sans plancher depuis la levée des bornes), donc il attire les
  // caravanes et n'attire plus la production — le grenier plein se vide par
  // l'économie, pas par une ligne qui jetait le surplus sans que personne ne
  // le décide.

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
    // Une place qui grandit finit par coter. La règle est « les grandes places
    // tiennent un bureau », pas « celles qui l'étaient au premier jour » : sans
    // cette ligne, un hameau devenu vraie ville restait sans comptoir pour
    // toujours, et le nombre de bureaux du monde ne pouvait que décroître.
    if (col.taille >= 2) col.change = true;
    return { evenement: 'croissance' };
  }
  // Neuf cents heures d'agonie, et la ville tombe — quelle qu'elle soit.
  //
  // Deux exceptions vivaient ici, et le lot I les a levées (« tout doit être
  // possible », le propriétaire). Le **socle** gardait soixante pour cent du
  // monde en sursis éternel : sous ce seuil, plus rien ne s'effondrait jamais,
  // et un monde ne pouvait pas se vider — c'est la garde `villes` de
  // CIBLES.json qui dit si le monde ordinaire se porte bien, pas une règle
  // cachée dans le tick. Et la **capitale immortelle** — renfort, grogne
  // essuyée, population remontée à soixante — interdisait à une faction de
  // mourir de faim, alors qu'elle sait mourir par l'épée depuis le premier
  // jour et que `FACTIONS-NEUVES.md` sait finir le chemin : `effondrer`, puis
  // `morte`, et le magot qui ancre les comptes.
  if (col.declin > 900) return { evenement: 'effondrement' };
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
  // « En la ressuscitant s'il le faut » : le geste manquait. Un pays éteint à
  // qui une ville revient délibérait de nouveau, levait des colonnes, prenait
  // des villes — et restait marqué mort, donc hors de `diploDe` : pas de
  // relations, pas de succession, pas de ligne au tableau. Un revenant, au
  // sens propre. Le défaut était inatteignable tant qu'aucune faction ne
  // mourait ; il s'est levé le jour où elles ont pu.
  //
  // La marque `morte` s'efface donc ici, et c'est le seul chemin par lequel un
  // drapeau tombé revient : il faut qu'une de ses anciennes villes se soulève
  // et le rappelle. Personne ne le décide d'en haut.
  if (cible.morte) {
    cible.morte = undefined;
    cible.prochainConseil = 20;
  } else {
    cible.prochainConseil = Math.min(cible.prochainConseil, 20);
  }
  world.regions[col.regionId].controle = rendue;
  col.unrest = 0.3;
  col.defense = Math.round(col.defenseMax * 0.5);
  return { ancienne, rendue, renaissance: cible.colonies.length === 1 };
}

/**
 * Ce qu'une ruine cesse de porter.
 *
 * Une ville morte gardait tout : ses notables en poste, ses stocks, ses
 * emplois, sa geôle, son étal. Personne n'administre des pierres — et le
 * monde en fabrique sans fin : mesuré au banc, les villes vivantes se
 * stabilisent vers soixante, mais les ruines s'empilent (cent quatre-vingt-dix
 * à trente mille heures). Tout ce qui parcourt les villes payait donc le passé
 * du monde, et la sauvegarde enflait de moitié — « le jeu rame énormément,
 * c'est de pire en pire, je suis peut-être trop avancé » (le propriétaire,
 * août 2026), et il avait raison sur la cause.
 *
 * On garde ce qui fait la cicatrice : le nom, la place, le drapeau d'avant,
 * ce qu'on en a su. On rend le reste.
 */
export function depouillerRuine(col) {
  if (!col || !col.ruine) return false;
  let rendu = false;
  const vider = (cle, vide) => {
    const v = col[cle];
    if (v === undefined || v === null) return;
    const plein = Array.isArray(v) ? v.length : Object.keys(v).length;
    if (!plein) return;
    col[cle] = vide;
    rendu = true;
  };
  vider('notables', []);
  vider('contrats', []);
  // Le stock se met à ZÉRO, il ne disparaît pas : les comptes du monde lisent
  // `col.stock.ferraille` sans se demander si la ville est debout, et une clé
  // absente devenait un NaN qui contaminait tout (la garde de cohérence l'a
  // dit tout de suite, sur dix mondes à la fois).
  if (col.stock) {
    for (const k of Object.keys(col.stock)) {
      if (col.stock[k]) { col.stock[k] = 0; rendu = true; }
    }
  }
  vider('emplois', {});
  vider('postes', {});
  vider('satiete', {});
  vider('recettes', {});
  vider('reserves', {});
  vider('vivier', []);
  vider('affiches', []);
  if (col.geole && (col.geole.detenus || []).length) {
    col.geole = { detenus: [], majA: 0 };
    rendu = true;
  }
  if (col.etal) { col.etal = null; rendu = true; }
  return rendu;
}

/** Transforme une colonie en ruine : la carte garde la cicatrice. */
export function effondrer(world, col) {
  col.ruine = true;
  col.contrats = [];
  col.etal = null;
  depouillerRuine(col);
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
  // Ce que vous payez entre en caisse chez qui vous a servi, impôt compris —
  // et il faut l'émettre, parce qu'il vient d'une poche que le registre du pays
  // ne connaît pas. Voir `entrerDehors` : sans cette ligne, deux cents achats
  // creusaient l'invariant de 1 657 crédits.
  encaisser(state.world, col, sim.cout);
  entrerDehors(state.world, col.faction, sim.cout);
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
  // Et de ce qu'elle a **réellement** sorti, pas de ce qui était affiché : une
  // ville exsangue ne paie que ce qu'elle a, et retirer de la masse le prix
  // annoncé détruirait de l'argent qu'elle n'a jamais versé.
  sortirDehors(state.world, col.faction, debourser(col, sim.brut));
  const negoc = meilleurCommercant(g.membres);
  if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.5 + sim.qte * 0.3);
  return { ok: true, qte: sim.qte, gain: sim.gain, taxe: sim.taxe, brut: sim.brut };
}

/** Capacité de portage d'un groupe. Ce qu'il porte, il le porte lui-même. */
export function capacitePortage(state, groupe) {
  const g = groupe || groupeActif(state);
  let cap = 0;
  const bonus = savoir(state, 'logistique') * 0.15;
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
 * Une ville tient-elle un bureau de change ?
 *
 * `ECONOMIE.md` se contredisait — §5.1 en met un dans toute ville debout, §7.3
 * en fait une prérogative de Capitaine à ouvrir, §9 prévoit le champ
 * `col.change`. E3 avait retenu §5.1, la seule lecture qui laissait le jeu
 * jouable au premier tour, et l'avait consigné comme blocage.
 *
 * **Tranché : les deux, et ils ne se contredisent plus.** §5.1 dit *où un
 * bureau peut exister* — une ville debout, hors révolte, et pas un camp ; §7.3
 * dit *comment on en ouvre un de plus*. Les grandes places en tiennent un dès
 * la génération du monde (`world.js`), sans quoi la monnaie étrangère serait
 * inutilisable jusqu'au premier Capitaine — atteint une fois sur trente parties
 * au banc.
 */
export function bureauDe(col) {
  return !!col && !!col.change && !col.ruine && !col.avantPoste
    && (col.unrest || 0) <= SEUIL_REVOLTE;
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
