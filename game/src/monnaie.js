// La monnaie d'une faction : ce qu'elle a émis, ce qui la gage, ce qu'elle vaut.
//
// Trois nombres par pays, et un invariant qui les tient : la somme de tout ce
// qui existe en monnaie d'une faction — les caisses de ses villes, les poches
// de ses habitants, son trésor — doit être exactement égale à ce qu'elle a
// émis. Pas approximativement : exactement. Une divergence est un endroit du
// moteur où de l'argent apparaît ou disparaît sans que personne l'ait décidé,
// et c'était le défaut de fond de toute l'économie d'avant — 2,17 millions de
// crédits créés par des caravanes qui créditaient le vendeur sans débiter
// l'acheteur.
//
// `auditer` est l'outil qui le vérifie. Il ne tourne pas en jeu : il tourne
// dans les tests, où il a le droit d'être lent et le devoir d'être intraitable.

import { DIPLO_FACTIONS, diploDe } from './data.js';
import { loisDe } from './lois.js';

/**
 * Les réglages monétaires. `horizonGage` dit sur combien d'heures de production
 * on gage une monnaie : un mois. Les bornes du cours empêchent qu'un pays
 * ruiné cote zéro ou qu'un pays prospère cote l'infini — ce sont des garde-fous
 * d'affichage autant que de calcul.
 */
export const MONNAIE = {
  horizonGage: 720,
  /**
   * Jusqu'où une monnaie a le droit de s'effondrer, et de s'apprécier.
   *
   * Ce n'est pas de la timidité : le cours divise les prix locaux, si bien
   * qu'une monnaie à 0,06 les multiplie par seize et vide la ville de ses
   * habitants. Balayé sur trois graines et six mille heures :
   *
   *     plancher   villes    pop     nourries   affamées   écart des cours
   *       0,05      248     23 765     229        4 %      0,06 – 2,07
   *       0,30      253     24 429     225        6 %      0,30 – 1,21
   *       0,40      voir ci-dessous
   *       0,50      256     30 821     192       15 %      0,50 – 1,05
   *       0,70      209     39 385     127       32 %      0,70 – 1,83
   *
   * Le compromis se lit : plus le plancher est bas, mieux le monde mange et
   * moins il compte de monde — une monnaie effondrée renchérit tout, donc on
   * consomme peu, donc les stocks restent pleins et la population fond. Zéro
   * quarante garde une monnaie qu'on peut dire effondrée sans que le pays
   * concerné cesse d'exister.
   */
  coursMin: 0.4,
  coursMax: 4,
  /** Le lissage : un cours ne saute pas parce qu'une ville a changé de mains. */
  inertie: 0.7,
  /**
   * Ce qu'un point de taux directeur au-dessus de la moyenne du monde fait
   * gagner au cours. Monter son taux est la seule façon de défendre sa monnaie
   * sans rien racheter — et ça se paie en villes qui n'empruntent plus.
   */
  primeConfiance: 3.75,
};

/**
 * Le cours du lieu, en ancien crédit. Un, pour une ville sans drapeau ou tant
 * qu'aucun conseil n'est passé : on ne cote pas ce qui n'a pas de monnaie.
 *
 * `world` est facultatif à l'appel de `prixUnitaire` — deux cents endroits du
 * moteur et de l'écran s'en passent, et un paramètre qu'on peut omettre finit
 * par l'être. Sans lui on rend donc le prix hors change, ce qui est exactement
 * ce que faisait le moteur avant les monnaies.
 */
export function coursMonnaie(world, faction) {
  if (!world || !faction) return 1;
  const f = world.factions[faction];
  return f && f.cours > 0 ? f.cours : 1;
}

/** Ce que la faction a émis et qui circule encore. */
export function masse(world, key) {
  const f = world.factions[key];
  return f ? (f.masse || 0) : 0;
}

/**
 * Ce qui soutient la monnaie : un mois de production de ses villes, en valeur.
 * Prendre des villes renforce une monnaie, en perdre l'affaiblit — sans qu'on
 * ait eu à écrire une règle pour le dire.
 */
export function gage(world, key, valeurProduction) {
  return Math.max(1, valeurProduction * MONNAIE.horizonGage);
}

/**
 * Le cours : ce qu'une unité vaut, en ancien crédit — la monnaie d'avant
 * l'effondrement, que plus personne n'émet et dont plus une pièce ne circule.
 * Elle ne sert qu'à comparer, et c'est pour ça qu'elle n'apparaît qu'au bureau
 * de change.
 */
export function coursBrut(world, key, gageDuPays) {
  const m = masse(world, key);
  if (!(m > 0)) return MONNAIE.coursMax;
  const brut = gageDuPays / m;
  return Math.max(MONNAIE.coursMin, Math.min(MONNAIE.coursMax, brut));
}

/** La moyenne des taux directeurs du monde, pour situer le sien. */
export function tauxMoyen(world) {
  let somme = 0;
  let n = 0;
  for (const k of diploDe(world)) {
    if (!world.factions[k]) continue;
    somme += loisDe(world, k).directeur;
    n += 1;
  }
  return n ? somme / n : 0.02;
}

/**
 * Met le cours à jour, au conseil. Lissé, et majoré de la prime de confiance
 * que vaut un taux directeur au-dessus de la moyenne.
 */
export function majCours(world, key, valeurProduction) {
  const f = world.factions[key];
  if (!f) return 1;
  const rapport = gage(world, key, valeurProduction) / Math.max(1, masse(world, key));
  // L'ancien crédit, c'est ce qu'une unité de cette monnaie valait le premier
  // jour. On enregistre donc le rapport gage/masse au premier conseil, et le
  // cours n'est plus qu'un écart à ce point de départ.
  //
  // Sans cette référence, il fallait deviner sur combien d'heures de production
  // gager une monnaie pour que le cours parte à un — et sept cent vingt heures,
  // choisies à vue, mettaient les six pays au plafond dès le premier conseil.
  // Les prix locaux se retrouvaient divisés par quatre, les villes ne gagnaient
  // plus rien et le monde tombait à cent neuf villes. Une constante qu'on ne
  // sait pas calibrer se remplace souvent par une mesure prise à l'origine.
  if (!(f.gageRef > 0)) f.gageRef = rapport;
  const brut = Math.max(MONNAIE.coursMin, Math.min(MONNAIE.coursMax, rapport / f.gageRef));
  const ecart = loisDe(world, key).directeur - tauxMoyen(world);
  const avecPrime = brut * (1 + ecart * MONNAIE.primeConfiance);
  const cible = Math.max(MONNAIE.coursMin, Math.min(MONNAIE.coursMax, avecPrime));
  const avant = f.cours || cible;
  f.cours = avant * MONNAIE.inertie + cible * (1 - MONNAIE.inertie);
  return f.cours;
}

/**
 * Les réglages du change. `ecartBase` est le prix de la commodité : ce qu'un
 * bureau prend pour convertir. Il se divise par deux entre deux pays liés par
 * un accord commercial — et c'est là, enfin, que la bourse paie. Sur les
 * volumes que déplacent les caravanes, six points d'écart séparent un négoce
 * rentable d'un négoce qui ne l'est pas.
 */
export const CHANGE = {
  ecartBase: 0.12,
  /** Ce qu'un accord commercial retranche de l'écart. */
  remiseAccord: 0.5,
  /** Ce qu'une grande place retranche : on change mieux dans une vraie ville. */
  remiseTaille: 0.25,
  /** Et ce que vaut d'être bien vu ici. */
  remiseEstime: 0.30,
};

/**
 * Le taux entre deux monnaies : ce que vaut l'une dans l'autre. Rien de plus
 * qu'un rapport de cours — l'ancien crédit ne sert que de pivot, et c'est pour
 * ça qu'il n'apparaît nulle part ailleurs qu'au bureau de change.
 */
export function taux(world, de, vers) {
  return coursMonnaie(world, de) / Math.max(0.001, coursMonnaie(world, vers));
}

/**
 * L'écart que prend le bureau. Une ville sans drapeau n'en prend aucun : c'est
 * l'avantage d'un endroit sans loi, et ça donne une raison d'y passer.
 */
export function ecartChange(world, col, de, vers, estime = 0) {
  if (!col || !col.faction) return 0;
  if (de === vers) return 0;
  const lies = (world.accords || []).some(
    (a) => (a.a === de && a.b === vers) || (a.a === vers && a.b === de));
  let e = CHANGE.ecartBase;
  if (lies) e *= 1 - CHANGE.remiseAccord;
  e *= 1 - CHANGE.remiseTaille * Math.max(0, Math.min(1, ((col.taille || 1) - 1) / 2));
  e *= 1 - CHANGE.remiseEstime * Math.max(0, Math.min(1, estime / 100));
  return e;
}

/**
 * Le change, côté registres : des unités disparaissent d'un pays et d'autres
 * apparaissent dans l'autre, au taux du jour. Ce n'est pas un transfert à
 * montant égal — c'est précisément ce que « changer » veut dire, et l'écrire
 * comme un transfert cassait l'invariant de deux mille crédits en deux mille
 * heures.
 */
export function convertirMasse(world, de, vers, sorti, entre) {
  const a = de && world.factions[de];
  const b = vers && world.factions[vers];
  if (a && sorti > 0) a.masse = Math.max(0, (a.masse || 0) - sorti);
  if (b && entre > 0) b.masse = (b.masse || 0) + entre;
  return entre;
}

/** Ce qu'on reçoit en changeant, écart déduit. */
export function convertir(world, col, de, vers, montant, estime = 0) {
  if (!(montant > 0)) return 0;
  return montant * taux(world, de, vers) * (1 - ecartChange(world, col, de, vers, estime));
}

/**
 * Battre monnaie. La seule façon de créer une unité, et elle se voit : la masse
 * monte, donc le cours baisse au conseil suivant, donc tout le monde qui en
 * détient perd — le joueur compris.
 */
export function emettre(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  f.tresor += montant;
  f.masse = (f.masse || 0) + montant;
  f.emissions = (f.emissions || 0) + 1;
  return montant;
}

/**
 * Retirer de la monnaie : le geste d'un pays qui veut une monnaie forte. Il
 * rachète ses propres unités et les brûle, ce qui coûte le prix fort.
 */
export function retirerMonnaie(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  const brule = Math.min(montant, Math.max(0, f.tresor));
  f.tresor -= brule;
  f.masse = Math.max(0, (f.masse || 0) - brule);
  return brule;
}

/**
 * Détruire de la monnaie sans contrepartie : c'est ce qui arrive quand une
 * créance s'efface. Un défaut est déflationniste, et c'est correct.
 */
export function annuler(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  f.masse = Math.max(0, (f.masse || 0) - montant);
  return montant;
}

/**
 * Dépenser hors du monde : une prérogative, une amende, l'amorce d'une bourse.
 * Ces sommes ne vont chez personne — elles quittent la circulation, et la masse
 * doit le savoir, sinon l'invariant dérive d'autant.
 */
export function depenser(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  const paye = Math.min(montant, Math.max(0, f.tresor));
  f.tresor -= paye;
  f.masse = Math.max(0, (f.masse || 0) - paye);
  return paye;
}

/**
 * De la monnaie entre dans le pays depuis l'extérieur du circuit — la poche du
 * joueur, pour l'essentiel. Tant que son portefeuille n'est pas libellé par
 * monnaie (lot E), ce qu'il verse est une émission de fait : autant le compter
 * comme telle plutôt que de laisser l'invariant mentir.
 */
export function entrerDehors(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  f.masse = (f.masse || 0) + montant;
  return montant;
}

/**
 * Une ville quitte le circuit d'un pays — révolte, sécession, ruine. Ce qu'elle
 * détenait n'y circule plus.
 */
export function sortirDuCircuit(world, key, col) {
  return transferer(world, key, null, (col.caisse || 0) + (col.menages || 0));
}

/**
 * De la monnaie change de pays. La masse du payeur baisse d'autant, celle du
 * bénéficiaire monte : les unités ne disparaissent pas, elles changent de
 * registre.
 *
 * C'est une conversion au pair, faute de cours à ce stade — le change et son
 * écart viennent au lot D. Ce qui compte ici est que rien ne se crée et rien ne
 * se perde : sans cette écriture, l'invariant dérivait de cent mille crédits
 * dans les deux sens en deux mille heures, simplement parce qu'une caravane
 * payée d'un pays à l'autre n'était inscrite nulle part.
 */
export function transferer(world, de, vers, montant) {
  if (!(montant > 0) || de === vers) return 0;
  const a = de && world.factions[de];
  const b = vers && world.factions[vers];
  if (a) a.masse = Math.max(0, (a.masse || 0) - montant);
  if (b) b.masse = (b.masse || 0) + montant;
  return montant;
}

/**
 * Une ville change de drapeau : ce qu'elle a en caisse et dans les poches de
 * ses habitants change de monnaie avec elle.
 */
export function transfererVille(world, col, de, vers) {
  const avoir = (col.caisse || 0) + (col.menages || 0);
  return transferer(world, de, vers, avoir);
}

/**
 * Le contrôle des comptes. Rend, par faction, ce qui existe et ce qui devrait
 * exister — et l'écart.
 *
 * Ne pas l'appeler en jeu : il balaye toutes les villes. Sa place est dans les
 * tests, et son verdict n'a pas de tolérance. Une divergence n'est jamais un
 * arrondi à élargir : c'est un endroit du moteur où l'argent ne vient de nulle
 * part.
 */
export function auditer(world) {
  const par = {};
  for (const k of diploDe(world)) {
    const f = world.factions[k];
    if (!f) continue;
    par[k] = { existe: f.tresor || 0, masse: f.masse || 0 };
  }
  for (const col of world.colonies) {
    if (col.ruine || !col.faction || col.avantPoste) continue;
    const e = par[col.faction];
    if (!e) continue;
    e.existe += (col.caisse || 0) + (col.menages || 0);
  }
  const out = [];
  for (const k of Object.keys(par)) {
    const e = par[k];
    out.push({ faction: k, existe: e.existe, masse: e.masse, ecart: e.existe - e.masse });
  }
  return out;
}

/**
 * La masse initiale : exactement ce qui existe. L'invariant naît vrai, et tout
 * ce qui le brise ensuite est un bug qu'on peut dater.
 */
export function poserMasseInitiale(world) {
  for (const e of auditer(world)) {
    world.factions[e.faction].masse = e.existe;
    world.factions[e.faction].cours = 1;
    world.factions[e.faction].gageRef = 0;
    world.factions[e.faction].emissions = 0;
  }
}
