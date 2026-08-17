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

import { DIPLO_FACTIONS, diploDe, clesDe, symboleDe, drapeauDe } from './data.js';
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
   * Le plancher du cours est **levé** — il ne reste qu'un epsilon numérique.
   *
   * « Une économie doit pouvoir s'effondrer aussi » (le propriétaire), et
   * `ECONOMIE.md` §14 l'exigeait depuis le premier jour : au moins une monnaie
   * effondrée par lot de six parties. À 0,40, aucun cours ne pouvait jamais
   * passer dessous — quinze monnaies sur trente-six finissaient collées au
   * plancher, qui était donc l'état normal de la moitié du monde et rendait le
   * critère invérifiable.
   *
   * **Pourquoi il a existé, et pourquoi il peut partir** : le plancher
   * protégeait le monde d'une erreur d'unité, pas d'une règle. Les prix
   * étaient en monnaie locale mais les revenus en ancien crédit, si bien
   * qu'une monnaie au quart faisait payer les gens quatre fois plus cher à
   * salaire égal — l'effondrement du cours affamait mécaniquement le pays.
   * Deux tables successives ont « calibré » cette borne dans ce monde-là, la
   * première en lisant des stocks à l'envers, la seconde avec la satiété ;
   * toutes deux calibraient en réalité la gravité du bug. Depuis le lot H,
   * les revenus suivent le cours comme les prix (salaires des villes, fonds
   * de roulement, solvabilité, garnisons, soldes) et la monnaie est devenue
   * auto-correctrice : elle baisse, les prix locaux montent, la valeur de la
   * production qui la gage monte, le cours remonte. Mesuré : une seule
   * monnaie sur trente-six touche encore 0,40 — le garde-fou ne gardait plus
   * rien.
   *
   * L'epsilon n'est pas un réglage : c'est la garantie qu'un cours reste un
   * nombre strictement positif — les prix divisent par lui, et un zéro les
   * rendrait infinis.
   */
  coursMin: 0.000001,
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
 * joueur, pour l'essentiel.
 *
 * `auditer` compare ce qui existe en monnaie d'un pays à ce qu'il a émis, et la
 * bourse du joueur n'y est pas : elle ne peut pas y être, `auditer(world)` ne
 * voit pas `state.player` et c'est la règle du projet. Tout ce qui passe de sa
 * poche à une caisse est donc, pour le registre, une **émission de fait** — et
 * il vaut mieux la compter que laisser l'invariant mentir.
 *
 * Ce qu'il en coûtait de ne pas le faire, mesuré : deux cents achats dans une
 * ville, et l'écart de l'audit passe de 0,000000 à **1 657,00** — exactement ce
 * qui a été dépensé. Personne ne l'avait vu parce que les tests d'audit font
 * tourner un monde sans joueur qui commerce.
 */
export function entrerDehors(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  f.masse = (f.masse || 0) + montant;
  return montant;
}

/**
 * Et le chemin inverse : de la monnaie quitte le circuit pour le dehors.
 *
 * Le miroir exact d'`entrerDehors`. Une ville qui paie le joueur sort de sa
 * caisse un argent qui n'est plus nulle part dans le registre — il faut donc
 * le retirer de la masse, sans quoi le pays déclare émis ce qui n'existe plus.
 *
 * **La règle des deux, une fois posée : la masse bouge exactement de ce que la
 * caisse a bougé.** Ce qui ne touche ni caisse ni trésor ne la regarde pas — les
 * poches d'un mort ne sont dans aucun registre, et en décrémenter la masse
 * détruirait de l'argent qui n'y a jamais été.
 */
export function sortirDehors(world, key, montant) {
  const f = world.factions[key];
  if (!f || !(montant > 0)) return 0;
  const sorti = Math.min(montant, f.masse || 0);
  f.masse = (f.masse || 0) - sorti;
  return sorti;
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
  // Les factions mortes sont incluses ici, à la différence de `diploDe` : elles
  // ne délibèrent plus, mais leur masse émise existe toujours et leur magot
  // aussi. Un registre qu'on cesse de vérifier parce que son propriétaire est
  // mort, c'est une fuite qu'on s'interdit de voir.
  for (const k of clesDe(world).filter((x) => x !== 'essaim')) {
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
  // Les magots des pays morts. Leur argent n'a pas quitté le monde — il est
  // posé sur une région, et quelqu'un finira par le trouver. S'il n'était pas
  // compté ici, le premier pays éteint ferait dériver les comptes de tout son
  // trésor, et on chercherait la fuite dans le circuit des villes.
  for (const r of world.regions) {
    if (!r.magot || !(r.magot.montant > 0)) continue;
    const e = par[r.magot.faction];
    if (e) e.existe += r.magot.montant;
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

// ---------------------------------------------------------------------------
// Le portefeuille du joueur
// ---------------------------------------------------------------------------
//
// `state.player.credits` était un nombre : un crédit universel que tout le
// monde acceptait, alors que le moteur cote six monnaies depuis le lot C. Le
// joueur détient maintenant ce qu'on lui a payé, dans la monnaie où on l'a
// payé — et c'est à lui de décider quoi garder. On conserve la forte, on se
// débarrasse de la faible avant qu'elle tombe.
//
// **Aucune conversion cachée.** Une somme est dans une monnaie ou n'est pas.
// Le seul endroit du jeu qui montre un total, donc qui convertit, est le bureau
// de change — c'est précisément son sujet. Ailleurs l'écran ne dit jamais ce
// que vaut le portefeuille, et cette friction est voulue : chaque pays est un
// monde, et savoir si le prix qu'on vous fait à l'étranger est bon demande d'y
// avoir réfléchi.

/** Ce qu'on a dans cette monnaie-là. Zéro si on n'en a pas — jamais `undefined`. */
export function solde(player, monnaie) {
  if (!player || !player.bourse || !monnaie) return 0;
  return player.bourse[monnaie] || 0;
}

/** On vous paie. */
export function crediterBourse(player, monnaie, montant) {
  if (!player || !monnaie || !(montant > 0)) return 0;
  if (!player.bourse) player.bourse = {};
  player.bourse[monnaie] = (player.bourse[monnaie] || 0) + montant;
  return montant;
}

/**
 * Vous payez, et vous ne payez que ce que vous avez.
 *
 * Rend ce qui a réellement été pris — comme `debourser` et `verser` côté monde,
 * et pour la même raison : un appelant qui suppose que le paiement est passé
 * fabrique de l'argent, et l'invariant comptable finit par le dire.
 */
export function debiterBourse(player, monnaie, montant) {
  if (!player || !player.bourse || !monnaie || !(montant > 0)) return 0;
  const a = player.bourse[monnaie] || 0;
  const pris = Math.min(montant, a);
  if (pris <= 0) return 0;
  player.bourse[monnaie] = a - pris;
  return pris;
}

/**
 * Ce que le tout vaut, en unité de compte du moteur.
 *
 * **À n'appeler que depuis le bureau de change.** Partout ailleurs, afficher un
 * total reviendrait à rendre les monnaies interchangeables à l'écran, et tout
 * le lot n'aurait servi à rien.
 */
export function valeurBourse(world, player) {
  if (!player || !player.bourse) return 0;
  let v = 0;
  for (const k of Object.keys(player.bourse)) {
    v += (player.bourse[k] || 0) / Math.max(0.001, coursMonnaie(world, k));
  }
  return v;
}

// ---------------------------------------------------------------------------
// Qui paie dans quelle monnaie
// ---------------------------------------------------------------------------
//
// La table d'`ECONOMIE.md` §7.2, en code. C'est **elle** le vrai travail du lot
// E, et pas la substitution des quatre-vingt-six lectures de `player.credits` :
// chacune doit savoir dans quelle monnaie elle paie, et le savoir d'une seule
// façon. Une règle écrite une fois ici, c'est quatre-vingt-six sites qui n'ont
// plus qu'à l'appeler — et une règle qui change se change à un endroit.
//
// Aucune de ces fonctions ne rend « la monnaie du joueur » : il n'y en a pas.
// Le joueur détient ce qu'on lui a donné, là où on le lui a donné.

/** Au marché d'une ville, on paie dans la monnaie de qui la tient. */
export function monnaieMarche(col) {
  return (col && col.faction) || null;
}

/**
 * Une ville sans drapeau prend toutes les monnaies, au cours du jour et sans
 * écart. C'est l'avantage d'un endroit sans loi, et ça donne une raison d'y
 * passer — voir `ecartChange`, qui ne prélève rien là-bas non plus.
 */
export function accepteToutes(col) {
  return !!col && !col.faction;
}

/** La solde, les primes et les contrats : la monnaie de qui vous emploie. */
export function monnaieSolde(groupe) {
  return (groupe && groupe.allegeance && groupe.allegeance.faction) || null;
}

/**
 * Le butin sur un cadavre : la monnaie de son drapeau.
 *
 * Un mort sans drapeau ne porte la monnaie de personne — ce qu'on lui prend se
 * troque, il ne se compte pas.
 */
export function monnaieButin(mort) {
  return (mort && mort.captif && mort.captif.faction)
    || (mort && mort.faction) || null;
}

/**
 * La monnaie de là où le joueur se trouve.
 *
 * C'est elle qui couvre la grande majorité des lieux où le joueur paie ou est
 * payé : le marché, l'armurier, l'école, le médecin, la bête qu'on achète, le
 * coffre qu'on loue, le convoi qu'on commande. Aucun de ces endroits n'a de
 * monnaie « à lui » — ils ont celle de l'endroit. Un seul appel les couvre
 * tous, et c'est ce qui rend la bascule du lot E mécanique au lieu d'être un
 * jugement par ligne.
 *
 * **Le cas qu'`ECONOMIE.md` §7.2 ne tranche pas**, et la lecture retenue : dans
 * un endroit sans drapeau, on sait ce qu'on peut *donner* — tout, c'est
 * l'avantage d'un endroit sans loi — mais pas ce qu'on *reçoit*. On reçoit ce
 * qui circule, c'est-à-dire la monnaie de la ville à drapeau la plus proche.
 * Même logique que la migration des vieilles sauvegardes, et aucune constante
 * inventée : la carte décide.
 */
export function monnaieIci(state) {
  const world = state && state.world;
  const g = state && state.player && (state.player.groupes || [])[0];
  if (!world || !g) return null;
  const regions = world.regions || [];
  const ici = world.colonies.find((c) => c.regionId === g.regionId && !c.ruine);
  if (ici && ici.faction) return ici.faction;
  // Rien ici, ou rien sous drapeau : ce qui circule alentour.
  const r0 = regions[g.regionId];
  if (!r0) return null;
  let proche = null;
  let mieux = Infinity;
  for (const c of world.colonies) {
    if (c.ruine || !c.faction) continue;
    const r = regions[c.regionId];
    if (!r) continue;
    const d = Math.max(Math.abs(r.x - r0.x), Math.abs(r.y - r0.y));
    if (d < mieux) { mieux = d; proche = c.faction; }
  }
  return proche;
}

// ---------------------------------------------------------------------------
// Payer et être payé, sans jamais nommer la monnaie
// ---------------------------------------------------------------------------
//
// Les quatre-vingt-six endroits où le joueur donnait ou recevait de l'argent
// écrivaient `state.player.credits += x`. Ils écrivent maintenant `gagner(state,
// x)` : la monnaie est celle de l'endroit, et personne n'a à y penser. Les
// quelques sites qui paient dans une AUTRE monnaie — la solde d'un employeur,
// le butin d'un mort — la passent en troisième argument.
//
// C'est ce qui rend la bascule mécanique. Une règle écrite une fois dans
// `monnaieIci`, et quatre-vingt-six sites qui l'appellent sans la connaître.

/** Ce qu'on a, dans la monnaie d'ici. */
export function soldeIci(state) {
  return solde(state && state.player, monnaieIci(state));
}

/** A-t-on de quoi payer ici ? */
export function aDeQuoi(state, montant, monnaie) {
  return solde(state && state.player, monnaie || monnaieIci(state)) >= montant;
}

/** On vous paie. Rend ce qui a été versé. */
export function gagner(state, montant, monnaie) {
  return crediterBourse(state && state.player, monnaie || monnaieIci(state), montant);
}

/** Vous payez. Rend ce qui a réellement été pris, jamais plus que ce qu'on a. */
export function regler(state, montant, monnaie) {
  return debiterBourse(state && state.player, monnaie || monnaieIci(state), montant);
}

/**
 * Le signe de la monnaie d'ici, pour les lignes de journal du moteur.
 *
 * L'interface a son propre raccourci ; le moteur en a besoin aussi, parce que
 * la moitié des sommes que le joueur lit ne sont pas sur un écran mais dans le
 * journal — « Il manque 86 cr », « Livraison honorée : 240 cr encaissés ». Ce
 * « cr » disait un crédit universel qui n'existe plus.
 */
export function signeIci(state) {
  return symboleDe(state && state.world, monnaieIci(state));
}

// ---------------------------------------------------------------------------
// La veille du portefeuille (ECONOMIE §10)
// ---------------------------------------------------------------------------

/**
 * À partir de quelle perte on dérange le joueur, et en dessous de quel solde on
 * ne le dérange pas.
 *
 * Le seuil vient du cahier des charges : « plus de 10 % ». Le plancher, lui,
 * n'y est pas et il n'invente rien — c'est le même que celui du bureau de
 * change pour décider qu'une monnaie est « tenue » : quelques centièmes
 * d'unité oubliés dans un coin ne sont pas une position, et un bandeau qui se
 * lève pour zéro virgule quatre est un bandeau qu'on apprend à ignorer.
 */
export const DEVALUATION = { seuil: 0.10, plancher: 1 };

/**
 * Ce qui a fondu depuis la dernière fois qu'on vous l'a dit.
 *
 * C'est le contrepoids du choix d'afficher les prix en monnaie locale seule.
 * Puisqu'aucun écran ne dit plus ce que vaut votre portefeuille, une monnaie
 * peut s'effondrer sous vos yeux sans qu'un chiffre bouge nulle part : les prix
 * de la ville sont divisés par le cours, donc ils montent, et rien ne dit que
 * c'est votre argent qui a maigri plutôt que le marchand qui se moque de vous.
 *
 * **La référence ne se remet pas à chaque relevé**, et c'est tout le mécanisme.
 * Une monnaie qui perd six pour cent par conseil tomberait indéfiniment sans
 * jamais rien déclencher si l'on comparait au relevé précédent : chaque pas
 * serait sous le seuil, et la somme des pas ne serait mesurée nulle part. On
 * compare donc au dernier cours **dont on vous a parlé**, et on ne le remet
 * qu'en deux occasions : quand on vient de vous prévenir, et quand la monnaie
 * remonte — sans quoi une chute depuis un sommet se mesurerait depuis un creux
 * ancien et passerait sous le seuil.
 *
 * Rend la liste des alertes ; l'interface en fait un bandeau, le journal une
 * ligne. Aucun tirage, aucune allocation dans le cas courant.
 */
export function veillerMonnaies(state, log) {
  const p = state.player;
  if (!p) return [];
  if (!p.coursVu) p.coursVu = {};
  const b = p.bourse || {};
  const alertes = [];
  for (const k of Object.keys(b)) {
    if (!(b[k] > DEVALUATION.plancher)) continue;
    const c = coursMonnaie(state.world, k);
    const vu = p.coursVu[k];
    if (!(vu > 0)) { p.coursVu[k] = c; continue; }
    if (c >= vu) { p.coursVu[k] = c; continue; }
    const perte = 1 - c / vu;
    if (perte <= DEVALUATION.seuil) continue;
    p.coursVu[k] = c;
    const alerte = { faction: k, perte, cours: c, avant: vu, solde: b[k], t: state.temps || 0 };
    alertes.push(alerte);
    // Le bandeau survit au rechargement, et il ne s'efface que quand le joueur
    // l'a vu. Une alerte qu'on rate parce qu'on a fermé l'onglet est une alerte
    // qui n'a servi à rien — et c'est justement le reproche qu'on faisait au
    // journal, où la ligne défile derrière quatre cents autres.
    if (!p.alertesMonnaie) p.alertesMonnaie = [];
    p.alertesMonnaie = p.alertesMonnaie.filter((x) => x.faction !== k);
    p.alertesMonnaie.unshift(alerte);
    if (p.alertesMonnaie.length > 6) p.alertesMonnaie.length = 6;
    if (log) {
      log({
        type: 'monnaie',
        texte: `${drapeauDe(state.world, k).nom} : la monnaie perd `
          + `${Math.round(perte * 100)} %. Vous en tenez ${Math.round(b[k])} `
          + `${symboleDe(state.world, k)}, qui valent d’autant moins.`,
        important: true,
        factions: [k],
      });
    }
  }
  // Ce qu'on ne tient plus ne mérite plus de repère : sans ça, un retour de
  // voyage dix ans plus tard se mesurerait depuis un cours oublié.
  for (const k of Object.keys(p.coursVu)) {
    if (!(b[k] > DEVALUATION.plancher)) delete p.coursVu[k];
  }
  return alertes;
}
