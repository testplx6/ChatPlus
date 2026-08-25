// Banc d'équilibrage : un bot « joueur raisonnable » joue plusieurs parties
// complètes et on regarde s'il survit, progresse, et finit par tenir debout.
// Ce n'est pas un test de régression stricte — c'est un thermomètre.
//
// Deux interrupteurs servent à isoler un système à la fois, ce qui est la seule
// façon d'attribuer un déséquilibre à sa cause plutôt qu'à une intuition :
//
//   SANS=detach,contrats,livraison,services,intel,base,service,lois,pistes,preleve
//        coupe ces comportements. `service` interdit de s'engager : c'est le
//        témoin du nomade pur, à comparer à `CAMP=1` pour le colon.
//        `preleve` annule la retenue des régimes sur les ventes : c'est le
//        témoin qui dit ce que le régime coûte au négoce, à comparer avec
//        MARCHAND=1 qui, lui, vit du négoce.
//   CAMP=1                           la partie démarre avec un campement fondé
//
// `CAMP=1` répond à une question que le reste ne sait pas poser : un
// avant-poste, une fois qu'on en a un, paie-t-il ? Comparer « le bot essaie de
// fonder » à « le bot n'essaie pas » ne mesure pas ça — le premier gèle ses
// matériaux en attendant de pouvoir fonder et vend deux fois moins. Il faut
// donner le camp pour savoir ce qu'il vaut.
//   VAGABOND=1                       le bot voyage autant, mais sans contrat
//
// `intel` est le témoin de la connaissance imparfaite : sans lui le bot choisit
// ses villes en lisant l'état du monde, comme s'il voyait tout. Avec lui, il ne
// se fie qu'à ses propres relevés — et une ville tombée depuis sa dernière
// visite lui coûte le voyage.
//
// Le mode vagabond est le témoin : il sépare ce que coûte la route de ce que
// coûtent les contrats. C'est lui qui a montré que la route prélevait 55 % du
// revenu et que les contrats n'y étaient pour rien.

import { nouvellePartie, tick } from '../src/sim.js';
import { Rng } from '../src/rng.js';
import { soldeIci, monnaieIci, gagner, regler, auditer } from '../src/monnaie.js';

/**
 * Ce que la bourse par drapeau coûte au bot, relevé là où il achète.
 *
 * Le critère du lot E6 est « une partie complète sans ruine par accident de
 * change ». Un accident de change ne se voit pas dans le compte des morts : il
 * se voit ici, quand on a l'argent ailleurs et pas ici. Sans ce relevé, on ne
 * saurait dire si les cinq escouades éteintes le sont pour cette raison ou pour
 * les mêmes que d'habitude.
 */
function releverChange(state) {
  const ici = monnaieIci(state);
  const b = state.player.bourse || {};
  let total = 0;
  for (const k of Object.keys(b)) total += b[k] || 0;
  TRACE.bourseTotale += total;
  TRACE.bourseEtrangere += total - (ici ? (b[ici] || 0) : 0);
}

/** Tout ce qu'on tient, toutes monnaies confondues. Pour décider, pas pour afficher. */
function bourseTotale(state) {
  const b = state.player.bourse || {};
  let t = 0;
  for (const k of Object.keys(b)) t += b[k] || 0;
  return t;
}

/**
 * Le bot passe au bureau. Il change la plus grosse de ses monnaies étrangères
 * contre celle d'ici — ce que ferait n'importe qui, et rien de plus malin :
 * l'objet du relevé est de savoir si le change **suffit**, pas de mesurer un
 * joueur optimal.
 */
function changerPourManger(state, col) {
  const ici = monnaieIci(state);
  if (!ici) { TRACE.pasDeChange.sansMonnaie++; return false; }
  if (!bureauDe(col)) {
    const quoi = !col ? 'pasDeVille'
      : col.avantPoste ? 'chezSoi'
        : col.ruine ? 'ruine'
          : !col.change ? 'sansComptoir' : 'enRevolte';
    TRACE.pasDeChange[quoi]++;
    return false;
  }
  const b = state.player.bourse || {};
  let pire = null;
  for (const k of Object.keys(b)) {
    if (k === ici) continue;
    if (!(b[k] > 1)) continue;
    if (!pire || b[k] > b[pire]) pire = k;
  }
  if (!pire) { TRACE.pasDeChange.rienAChanger++; return false; }
  const r = changer(state, col, pire, ici, b[pire]);
  if (!r.ok) TRACE.pasDeChange.refuse++;
  return r.ok;
}

/** Poser une somme dans la poche du bot, dans la monnaie de là où il est. */
function poserB(state, montant) {
  const m = monnaieIci(state);
  if (!m) return 0;
  state.player.bourse = { [m]: montant };
  return montant;
}
import {
  groupeActif, groupes, scinder, fusionner, tousLesMembres, noyau,
  rendementCohesion,
} from '../src/groupes.js';
import { donnerOrdre } from '../src/squad.js';
import { estVivant, estDebout, comp, pvTotal } from '../src/characters.js';
import { colonieDe, colonieParId, distance } from '../src/world.js';
import {
  acheter, vendre, poidsInventaire, capacitePortage, acheterItem, prixItem, prixJoueur,
  prixUnitaire, cibleStock, bureauDe, changer,
} from '../src/economy.js';
import {
  accepter, progres as progresContrat, MAX_CONTRATS, OPINION_ECHU,
} from '../src/contrats.js';
import {
  sEngager, peutSEngager, rangDe, RANGS, avancementOrdre, droitIntendance, toucherRations,
  estimeEngagement,
} from '../src/allegeance.js';
import { FACTIONS, DIPLO_FACTIONS } from '../src/data.js';
import {
  fonderBase, lancerConstruction, lancerRecherche, deposer, retirer, affecter, niveau as nivBat,
  peutReconnaitre, reconnaitreAvantPoste,
  placesMetier, affectes, voulus, coutBatiment, peutPayer, capaciteStock, totalStock,
  COUT_FONDATION,
} from '../src/base.js';
import { ITEMS, BUILDING_KEYS, METIER_KEYS, METIERS, BIOMES as BIOMES_BAT } from '../src/data.js';
import { acheterBete, prixBete, betesDe, portageAttelage, conduite } from '../src/betes.js';
import { makeCharacter } from '../src/characters.js';
import { saison } from '../src/climat.js';
import { COMMODITY_KEYS, COMMODITIES, BIOMES } from '../src/data.js';
import { vueColonie, PEREMPTION } from '../src/connaissance.js';
import { demandesIci, honorer, faveurChef, estime } from '../src/services.js';
import { enGuerre } from '../src/factions.js';
import {
  etatSecteur, pireCase, dansSonSecteur, SEUIL_MERITE,
} from '../src/secteur.js';
import {
  prisonniersDe, disposer, optionsPour, surveillanceManquante, capaciteGarde,
} from '../src/justice.js';
import { loisDe, IMPOTS } from '../src/lois.js';
import { depouillesDe, effetsDe, disposerCorps } from '../src/depouilles.js';
import { titreDe } from '../src/chronique.js';
import { TACTIQUE_KEYS, rendementTactique, genererBande } from '../src/combat.js';
import { combatContre } from '../src/events.js';
import { attaquerCaravane, valeurCargaison } from '../src/caravanes.js';
import {
  peutExercer, colonnesDe, envoyerColonne, leverColonne, coutLevee,
  fonderPoste, sitesFondation, COUT_POSTE, cibleGuerre, declarerGuerreA,
  guerresArretables, signerPaixAvec,
} from '../src/influence.js';

const TRACE = {
  voyage: 0, repos: 0, travail: 0, defaites: 0, crPilles: 0,
  // Ce que coûte l'information périmée : des voyages vers des villes mortes.
  voyagesPerdus: 0,
  // Combien de demandes le bot croise, et combien il en honore. On compte des
  // demandes distinctes, pas des coups d'œil : la première version incrémentait
  // à chaque passage en ville et annonçait « 4 527 demandes croisées » pour une
  // centaine de personnes qui attendaient vraiment quelque chose.
  demandesVues: 0, demandesPromises: 0, demandesPerdues: 0, demandesLourdes: 0,
  achatsTentes: 0, achatsFaits: 0, achatsChers: 0, achatsPauvre: 0,
  opinionFin: 0, nNotables: 0,
  coutLot: {}, primeLot: {}, nLot: {}, bourse: 0, nBourse: 0,
  // Où va l'argent. Sans ce détail, « le bot est pauvre » ne dit rien de ce
  // qu'il faut corriger.
  gagneVente: 0, retenu: 0,
  // Lot E : ce que la bourse par drapeau fait au bot. `bourseEtrangere` est
  // la part qu'il tient dans une autre monnaie que celle du lieu où il est ;
  // `bloques` compte les fois où il a de quoi payer — ailleurs, et vraiment
  // ailleurs : la poche d'ici est vide ET l'étranger suffirait. La première
  // version comptait aussi la pauvreté ordinaire, ce qui gonflait le chiffre
  // de deux mille sans rien dire du change. C'est le critère d'E6 : une ruine
  // par accident de change se verrait là, et nulle part ailleurs.
  bourseEtrangere: 0, bourseTotale: 0, bloquesChange: 0, changesFaits: 0,
  // L'invariant comptable, relevé là où il y a un joueur qui commerce.
  //
  // C'est la garde qui manquait, et son absence a laissé passer un défaut
  // entier : la poche du joueur n'était dans aucun registre, si bien que
  // chaque achat émettait de la monnaie en douce. Les tests d'audit font
  // tourner un monde SANS joueur, et le banc du monde n'en a pas non plus —
  // deux instruments qui regardaient à côté du seul endroit où ça se voyait.
  pireEcart: 0,
  pasDeChange: {
    sansMonnaie: 0, pasDeVille: 0, chezSoi: 0, ruine: 0, sansComptoir: 0,
    enRevolte: 0, rienAChanger: 0, refuse: 0,
  },
 villesFin: [], echusParType: {}, echusParVille: new Map(), joursPanneau: 0, joursPanneauFerme: 0, contratsPris: 0, contratsEchus: 0, contratsRemplis: 0, gagneContrat: 0, payeVivres: 0, payeSoins: 0, payeMateriel: 0,
  // Ce que l'intendance donne : la voie du service se lit là.
  rationsTouchees: 0,
  betes: 0,
  recrues: 0,
  // La carrière : sans ça, « le joueur peut devenir Commandeur » est une
  // affirmation invérifiable. On mesure les heures effectivement passées sous
  // les couleurs de quelqu'un, ce qu'elles rapportent, et où l'échelle bloque.
  hEngage: 0, pointsFin: 0, manques: 0, ordresDonnes: 0,
  // Un « 5.6 ordres manqués » ne dit pas lesquels. Or les trois types ne se
  // jouent pas du tout pareil : ravitailler demande d'acheter et de porter,
  // frapper demande de croiser l'ennemi, reconnaître demande de marcher. On
  // compte donc reçus / honorés par type, sans quoi on corrige à l'aveugle.
  recus: {}, faits: {}, annules: {},
  secteurs: 0, etatSecteur: 0, bilans: 0,
  revoltes: 0, matees: 0, libres: 0, renverses: 0, grogne: 0,
  disposes: 0, relaches: 0, gagneCaptifs: 0, captures: 0, marchands: 0,
  vendus: 0, sansMarche: 0, marchesVus: 0, villesVues: 0, mepris: 0, raflees: 0,
  enterres: 0, depouilles: 0,
  caravanesVues: 0, caravanesPrises: 0, caravanesRatees: 0, butinCaravanes: 0, hGuet: 0,
  caravanesNees: 0, passagesGuet: 0, butinLaisse: 0, butinPorte: 0,
  affairesPrises: 0, affairesPerdues: 0, miseTotale: 0, recetteTotale: 0, recetteEsperee: 0,
  ageReleve: 0, nReleve: 0,
  titres: {},
  hPatrouille: 0, victoires: 0,
  mortsCombat: 0, koSubis: 0, piste: 0, pisteVues: 0, reconnus: 0, popCamp: 0,
  // Ce que les conseils votent quand personne ne les tient.
  impots: {}, peines: {}, esclavagistes: 0, factionsVues: 0,
  // Un compteur par échelon, dérivé de l'échelle plutôt que recopié : le jour
  // où le Maréchal est arrivé, le tableau en comptait cinq et le rapport
  // affichait « Maréchal NaN ».
  rangs: RANGS.map(() => 0),
  // Qui l'on courtise, qui l'on finit par servir, et jusqu'où l'estime monte.
  // Les trois séparément : viser l'Église et servir la Commune faute de mieux
  // n'est pas la même partie que viser la Commune, et une moyenne des deux ne
  // décrit ni l'une ni l'autre.
  vises: {}, servis: {}, replis: 0, jamais: 0,
  estimeVisee: {}, nVisee: {},
  // Le chronomètre du pardon (profil repenti) : une entrée par faction fâchée
  // à l'heure du repentir, avec l'ardoise de départ et les heures mises à
  // repasser les deux seuils qui changent la vie — −25 (leurs hommes cessent
  // de sortir du bois, events.js) et 0 (l'ardoise est effacée).
  rachats: [],
};
const HEURES = Number(process.argv[2]) || 4000;
// Trente parties par défaut, pas huit. À huit, l'écart-type sur un taux de
// survie de 85 % vaut douze points : on lit du bruit et on croit lire un
// réglage. Trente parties coûtent dix secondes.
const PARTIES = Number(process.argv[3]) || 30;
// Interrupteurs d'isolement : c'est en coupant un système à la fois qu'on
// trouve lequel déséquilibre le reste. `SANS=detach,contrats,livraison`
const SANS = new Set((process.env.SANS || '').split(',').filter(Boolean));
// Mode témoin : le bot bouge autant qu'un joueur de contrats, mais sans en
// prendre aucun. Il isole le coût du voyage lui-même du prix des contrats.
const VAGABOND = process.env.VAGABOND === '1';
/**
 * Profil colon : le bot joue la voie du bâtisseur plutôt que celle de
 * l'aventurier.
 *
 * Le bot par défaut court la carte, prend des contrats lointains et rentre au
 * camp quand son sac est plein. C'est une façon de jouer, et c'est celle qui a
 * servi à mesurer tout le reste — mais elle ne met presque jamais la voie du
 * colon à l'épreuve. La moitié de ce qui a été écrit autour de l'avant-poste
 * n'était donc vérifiée que par des tests unitaires et des mesures ponctuelles,
 * pas par des parties entières.
 *
 * COLON=1 : on fonde dès qu'on peut, on ne s'éloigne pas de chez soi, et l'on
 * se fait reconnaître dès que les murs tiennent.
 */
const COLON = process.env.COLON === '1';
/** Jusqu'où un colon accepte de s'éloigner de son camp. */
const RAYON_COLON = 5;
/**
 * Profil carriériste : on sert, on monte, on ordonne.
 *
 * C'est la voie qui a reçu le plus de code — grades, charges, secteurs,
 * prérogatives, lois — et celle qu'aucun bot ne jouait vraiment. Le bot par
 * défaut s'engage puis continue sa vie d'aventurier : il rate quatre ou cinq
 * ordres de mission pour un honoré, ce qui est exactement la façon de ne jamais
 * dépasser Lieutenant.
 *
 * CARRIERE=1 : un ordre de mission passe avant tout le reste — on va acheter la
 * marchandise qu'il réclame, on va chercher l'ennemi qu'il désigne.
 *
 * La première version interdisait aussi de fonder un camp, au motif qu'un
 * carriériste sert une maison au lieu d'en bâtir une. C'était une idée, pas une
 * mesure, et la mesure l'a démentie : sans camp, neuf escouades de plus sur
 * soixante s'éteignent, pour exactement les mêmes points de service. Un camp ne
 * concurrence pas une carrière, il la loge.
 */
const CARRIERE = process.env.CARRIERE === '1';
/**
 * Quel drapeau le bot courtise.
 *
 * Jusqu'ici il s'engageait chez celui dont il foulait les pavés au moment où
 * l'estime suffisait — et comme le départ du banc pose l'estime de l'hôte à
 * `estimeEngagement(hôte) + 2`, il s'engageait toujours chez son voisin, le
 * premier jour, quel que soit le drapeau. Trente parties donnaient donc trente
 * mesures d'une seule chose : « servir quelqu'un ». La question « lequel »
 * n'était pas posée, et aucun chiffre sur les six drapeaux n'aurait rien voulu
 * dire.
 *
 * Désormais il en vise un, tiré à part au début de la partie, et il le
 * courtise : il prend ses contrats de préférence, il va dans ses villes quand
 * rien d'autre ne presse, et il n'entre au service de personne d'autre — sauf
 * s'il n'y arrive pas. Un joueur qui a passé la moitié d'une partie à courtiser
 * l'Église sans jamais atteindre quarante finit par signer ailleurs ; le bot
 * aussi, et c'est ce repli qu'on compte.
 *
 * VISE=militaire (ou un nom de faction) force la cible : c'est ce qui permet de
 * mesurer un profil à la fois plutôt qu'une moyenne de six.
 */
const VISE = process.env.VISE || '';
/** Au bout de combien d'heures on renonce à celui qu'on courtisait. */
const REPLI_H = 2000;
/**
 * Profil assidu : on ne fait que ça, et pour un seul drapeau.
 *
 * Le bot ordinaire rend deux contrats par partie. Toute mesure de la
 * réputation faite sur lui ne donne donc qu'un plancher — utile pour savoir si
 * une porte est franchissable, inutile pour savoir si elle est trop facile.
 * L'assidu remplit son carnet à chaque panneau, n'accepte que ce qui compte
 * pour celui qu'il courtise, et rentre le rendre. C'est le témoin du haut :
 * s'il sature une faction à cent en un mois de jeu, le tarif est trop
 * généreux, quoi qu'en dise le bot moyen.
 */
const ASSIDU = process.env.ASSIDU === '1';
/**
 * Profil négrier : on prend les gens vivants et on les vend.
 *
 * Le jeu affirme deux choses qu'aucune mesure n'a jamais vérifiées : que vendre
 * des hommes est la voie la plus rentable, et qu'elle se paie. La chronique lui
 * donne même son titre le plus lourd, celui qui passe avant tout le reste. Or le
 * bot par défaut refuse de vendre — c'est un choix de jeu, et il est resté — si
 * bien que tout ce qui touche à l'esclavage n'était vérifié que par des tests
 * unitaires : le prix, la réputation perdue, le marché qui existe ou pas.
 *
 * NEGRIER=1 : on cherche l'affrontement pour faire des captifs, on les porte là
 * où la loi les achète, et l'on vend chaque fois que c'est l'option la mieux
 * payée. Le banc ne juge pas : il chiffre.
 */
const NEGRIER = process.env.NEGRIER === '1';
/** Jusqu'où un négrier s'éloigne du marché où il écoule. */
const RAYON_RAFLE = 3;
/**
 * Profil bienfaiteur : on tient ce qu'on a promis.
 *
 * C'est la seule voie non violente du jeu, et la seule dont la monnaie n'est ni
 * l'argent ni le grade mais l'opinion de gens précis — un armurier qui fait ses
 * prix, un médecin qui recoud les vôtres, un contremaître qui laisse ses
 * registres ouverts à l'autre bout de la carte.
 *
 * Le bot par défaut adopte une promesse et l'oublie : 233 adoptées pour 209
 * mortes en route. Il ne ment pas, il fait autre chose — la promesse est
 * avant-dernière dans son ordre de priorités, et une demande expire en trois
 * semaines de jeu.
 *
 * BIENFAITEUR=1 : la promesse passe devant, on l'achète au lieu d'espérer la
 * trouver, et l'on accepte des lots que le sac tient à peine.
 */
const BIENFAITEUR = process.env.BIENFAITEUR === '1';
/** L'étendue d'une paroisse : sa ville, et celles où l'on peut aller à pied. */
const RAYON_PAROISSE = 4;
/**
 * Profil pillard : on vit de ce que les autres transportent.
 *
 * Sept caravanes circulent au maximum sur quatre cent trente-deux régions. Elles
 * portent une cargaison, une escorte, et rapportent tout leur chargement à qui
 * la prend — au prix de vingt-deux points de réputation et de la rancune nommée
 * des deux villes qui l'attendaient. `attaquerCaravane` existe depuis toujours,
 * l'écran Monde les affiche en direct, et le compteur `caravanesPillees` n'a
 * jamais été incrémenté une seule fois par le banc : trois cents parties, zéro
 * caravane pillée. C'est le seul chemin vers le titre de Seigneur de guerre.
 */
const PILLARD = process.env.PILLARD === '1';
/**
 * Profil repenti : on pille, puis on cesse — et l'on chronomètre le pardon.
 *
 * La cible 2 du chantier MEMOIRE demande qu'un pillard puisse se racheter par
 * actes « en un temps comparable à l'oubli d'aujourd'hui » — et le bot pillard
 * ne se repent jamais, donc le banc ne savait pas chiffrer ce temps (dette
 * consignée dans MEMOIRE.md §Blocages). REPENTIR=2000 : le bot vit en pillard
 * jusqu'à l'heure dite, puis redevient le bot ordinaire — contrats, services,
 * rançons — sans plus toucher une caravane. À l'heure du repentir on relève
 * l'ardoise (chaque faction en négatif), et l'on note l'heure où chacune
 * repasse −25 puis 0. La référence de « comparable » est l'oubli d'hier :
 * l'érosion morte en L4 rendait 0,45 point par jour, soit 53 heures le point.
 */
const REPENTIR = Math.max(0, Number(process.env.REPENTIR || 0));
/**
 * Profil marchand : acheter là où c'est abondant, revendre là où ça manque.
 *
 * C'est la seule voie du jeu qu'on peut suivre sans tuer personne, et la seule
 * dont l'économie n'a jamais été mesurée : le bot par défaut vend tout ce qu'il
 * ramasse dans la première ville venue et n'achète que ce qu'il consomme. Il ne
 * fait jamais l'aller-retour qui est pourtant le geste du métier.
 *
 * Le renseignement en est le nerf : on ne connaît d'une ville lointaine que son
 * dernier relevé, avec sa date. Un marchand décide sur une information périmée
 * et découvre le vrai prix en arrivant — c'est exactement ce que
 * `connaissance.js` modélise, et personne ne s'en servait pour décider.
 */
const MARCHAND = process.env.MARCHAND === '1';
/** Au-delà, un relevé de prix ne vaut plus la peine qu'on marche dessus. */
const FRAICHEUR = Number(process.env.FRAICHEUR || 400);
/** Jusqu'où l'on porte une cargaison. */
const PORTEE_NEGOCE = Number(process.env.PORTEE || 8);

/**
 * La meilleure affaire connue depuis ici : quoi charger, et où le porter.
 *
 * Le prix de vente est *estimé* sur le dernier relevé qu'on a de la ville
 * visée — pop, stock et humeur suffisent à `prixUnitaire`. On retire une marge
 * de marchand forfaitaire, parce qu'on ne sait pas qui tient l'étal là-bas.
 */
function meilleureAffaire(state, g, colIci) {
  const p = state.player;
  const vivantsIci = g.membres.filter(estVivant);
  if (!vivantsIci.length) return null;
  const negoc = vivantsIci.reduce((a, b) => (comp(b, 'commerce') > comp(a, 'commerce') ? b : a));
  const hab = comp(negoc, 'commerce');
  const cap = capacitePortage(state, g);
  let best = null;
  for (const k of COMMODITY_KEYS) {
    if (k === 'rations' || k === 'medkit') continue; // ce qu'on garde pour vivre
    const dispo = Math.floor((colIci.stock[k] || 0) * 0.6);
    if (dispo < 8) continue;
    const achatAffiche = prixJoueur(colIci, k, hab, p.reputation[colIci.faction] || 0).achat;
    const poids = COMMODITIES[k].poids;
    const portable = poids > 0 ? Math.floor(cap * 0.75 / poids) : dispo;
    if (Math.min(dispo, portable) < 8) continue;
    for (const c of state.world.colonies) {
      if (c.ruine || c.id === colIci.id) continue;
      const vue = vueColonie(state, c);
      if (vue.inconnu || vue.ruine || !vue.pop) continue;
      // On ne spécule pas sur un relevé de trois semaines.
      //
      // Le monde arbitre tout seul : trois cent quatre-vingts caravanes par
      // partie vont précisément combler les pénuries qui font monter les prix.
      // Décider sur un relevé vieux de 564 heures — la moyenne mesurée — c'est
      // viser une rareté que quelqu'un a déjà comblée pendant qu'on marchait.
      // Le renseignement frais est ce que le grade et les registres du
      // contremaître vous donnent : c'est là qu'ils se paient.
      if (!vue.frais && (vue.depuis || 0) > FRAICHEUR) continue;
      TRACE.ageReleve += vue.depuis || 0;
      TRACE.nReleve++;
      const d = distance(c.regionId, colIci.regionId);
      if (d > PORTEE_NEGOCE) continue;
      // Le prix affiché est celui de la *première* unité.
      //
      // C'est toute la différence entre un marchand et un déménageur. Le cours
      // bouge à chaque unité de la transaction : on le fait monter en achetant
      // et on l'écrase en vendant. Un lot dimensionné sur le prix affiché
      // rapporte donc une fraction de ce qu'on croyait — mesuré : **31 % du
      // prix visé**, et vingt-quatre pour cent de perte sur la mise. On estime
      // ici la recette au cours de mi-parcours, et l'on essaie plusieurs tailles
      // de lot : la plus grosse n'est presque jamais la meilleure.
      const manque = Math.max(0, cibleStock(vue, k) * 1.1 - (vue.stock[k] || 0));
      if (manque < 8) continue;
      for (const part of [0.3, 0.55, 1]) {
        const qte = Math.floor(Math.min(dispo, portable, manque * part));
        if (qte < 8) continue;
        // Le cours qu'on obtiendra en moyenne : celui de la ville une fois la
        // moitié du lot livrée.
        const apres = { pop: vue.pop, unrest: vue.unrest, stock: { ...vue.stock } };
        apres.stock[k] = (apres.stock[k] || 0) + qte / 2;
        const vente = prixUnitaire(apres, k) * 0.8;
        // Et symétriquement à l'achat : vider un étal de moitié fait monter le
        // cours pendant qu'on charge. On paie le prix de mi-parcours, pas celui
        // de la première unité — l'oublier d'un seul côté fausse toute la marge.
        //
        // On met à l'échelle le vrai prix plutôt que d'en recalculer un sur une
        // ville factice : `prixJoueur` lit les notables pour la marge du
        // marchand, et un objet sans notables renvoyait NaN — ce qui passait
        // silencieusement toutes les comparaisons et faisait choisir n'importe
        // quelle affaire.
        const avant = { pop: colIci.pop, unrest: colIci.unrest, stock: { ...colIci.stock } };
        avant.stock[k] = Math.max(0, (avant.stock[k] || 0) - qte / 2);
        const ratio = prixUnitaire(avant, k) / Math.max(0.01, prixUnitaire(colIci, k));
        const achat = achatAffiche * ratio;
        const marge = vente - achat;
        if (marge <= 0) continue;
        // Le gain rapporté au trajet : une marge de dix crédits à huit régions
        // vaut moins qu'une marge de quatre à une région.
        const score = (marge * qte) / (1 + d * 0.9);
        if (!best || score > best.score) {
          best = { k, qte, destId: c.id, score, cout: achat * qte, espere: vente * qte };
        }
      }
    }
  }
  return best && best.score > 30 ? best : null;
}

/** Une ville qui achète des hommes, d'après ce qu'on sait de sa loi. */
function acheteDesHommes(state, col) {
  if (!col || col.ruine) return false;
  // Une ville sans drapeau ne connaît que la loi du plus fort : on y vend
  // toujours, moins cher. Voir loiIci().
  if (!col.faction) return true;
  return !!loisDe(state.world, col.faction).esclavage;
}

/** Où trouver de quoi manger : on note les régions par rendement en nourriture. */
function scoreNourriture(state, i) {
  const r = state.world.regions[i];
  const y = BIOMES[r.biome].yields;
  return (y.biomasse || 0.18) * r.richesse * (1 - r.fouille);
}

/**
 * Où aller vendre et se ravitailler. Le bot ne lit plus l'état du monde : il lit
 * ses propres relevés, avec leur date. Une ville qu'il n'a jamais vue n'est pas
 * une option — on ne marche pas six régions sur la foi d'un point sur la carte —
 * et une ville dont le relevé date peut très bien être tombée depuis.
 *
 * C'est ce qui donne enfin une valeur mesurable à l'éclaireur : ses relevés
 * élargissent le choix et le rafraîchissent.
 */
function colonieLaPlusProche(state, g) {
  if (SANS.has('intel')) {
    let best = null;
    let bestD = Infinity;
    for (const c of state.world.colonies) {
      if (c.ruine) continue; // témoin omniscient : une ville morte ne vend rien
      const d = distance(g.regionId, c.regionId);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  let best = null;
  let bestSc = -Infinity;
  for (const c of state.world.colonies) {
    const vue = vueColonie(state, c);
    if (vue.inconnu || vue.ruine) continue; // d'après ce qu'on en sait
    const d = distance(g.regionId, c.regionId);
    // Un relevé vieux vaut moins qu'un relevé frais : le risque de marcher vers
    // une ville qui n'existe plus se paie en jours perdus.
    const age = vue.frais ? 0 : Math.min(1, (vue.depuis || 0) / PEREMPTION);
    // On vend mieux là où manque ce qu'on porte.
    let attrait = 0;
    for (const k of COMMODITY_KEYS) {
      const q = g.inventaire[k] || 0;
      if (!q || k === 'rations' || k === 'medkit') continue;
      const stock = vue.stock ? (vue.stock[k] || 0) : 0;
      attrait += q * COMMODITIES[k].prix * (stock < (vue.pop || 50) * 0.4 ? 1 : 0.7);
    }
    // Quand on sert quelqu'un, on fait ses courses chez lui : c'est là qu'on
    // touche l'intendance, qu'on a la remise, et — à partir de Lieutenant —
    // qu'on est logé. Sans ce penchant, le bot passait sa vie sur les marchés
    // des autres et ne touchait que dix rations en quatre mille heures.
    const sien = groupeActif(state).allegeance && c.faction === groupeActif(state).allegeance.faction;
    const sc = attrait / (1 + d * 1.4) - d * 14 - age * 90 + (sien ? 140 : 0);
    if (sc > bestSc) { bestSc = sc; best = c; }
  }
  // Rien de connu debout : on retombe sur la plus proche, quitte à se tromper.
  if (!best) {
    let bestD = Infinity;
    for (const c of state.world.colonies) {
      const d = distance(g.regionId, c.regionId);
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return best;
}

/** Ce que le groupe doit aller chercher pour honorer ce qu'il a signé. */
function destinationContrat(state, g) {
  for (const c of state.player.contrats) {
    const av = progresContrat(state, c);
    if (c.type === 'collecte') {
      // Prêt : on rapporte. Pas prêt : on reste où on récolte.
      if (!av.pret) continue;
      const donneur = colonieParId(state.world, c.colonieId);
      if (donneur && !donneur.ruine && donneur.regionId !== g.regionId) return donneur.regionId;
    } else if (c.type === 'livraison') {
      const dest = colonieParId(state.world, c.destId);
      if (!dest || dest.ruine) continue;
      // On ne part livrer que si c'est bien nous qui portons le colis.
      if ((g.inventaire[c.ressource] || 0) < c.quantite) continue;
      if (dest.regionId !== g.regionId) return dest.regionId;
    } else if (c.type === 'reconnaissance') {
      if (!state.world.regions[c.regionId].decouvert) return c.regionId;
    }
  }
  return null;
}

/** Un contrat qui presse : on ne s'entraîne pas quand une échéance court. */
function collecteUrgente(state) {
  return state.player.contrats.some(
    (c) => c.echeance - state.temps < 120 && !progresContrat(state, c).pret
  );
}

/**
 * Ce que vaut une arme, une armure. Grossier à dessein : le bot n'a pas besoin
 * d'optimiser, il a besoin de ne pas se battre en chemise avec la machette du
 * premier jour — ce qu'il a fait pendant toute l'histoire de ce banc.
 */
function valeurItem(key) {
  const it = ITEMS[key];
  if (!it) return 0;
  if (it.type === 'arme') return it.degats * (1 + (it.pen || 0));
  if (it.type === 'armure') return it.armure * 3;
  return 0;
}

/** Ce que porte déjà quelqu'un à cet emplacement. */
function equipe(c, slot) {
  return valeurItem(c.equip && c.equip[slot]);
}

/**
 * S'équiper, et s'équiper vraiment.
 *
 * `acheterItem` était importé dans ce fichier depuis le début et n'a jamais été
 * appelé une seule fois : le bot traversait quatre mille heures avec l'armure de
 * cuir du départ, perdait la moitié de ses combats et finissait à cinq de
 * compétence. Toutes les conclusions d'équilibrage sur les raids, les pertes et
 * la survie reposaient donc sur une escouade de civils désarmés.
 */
function sEquiper(state, g, colIci) {
  const p = state.player;
  if (!colIci.etal || !colIci.etal.items.length) return;
  const vivants = g.membres.filter(estVivant);
  if (!vivants.length) return;

  // On équipe d'abord ce qu'on a déjà dans la réserve : c'est gratuit.
  for (let i = g.objets.length - 1; i >= 0; i--) {
    const key = g.objets[i];
    const it = ITEMS[key];
    if (!it || (it.type !== 'arme' && it.type !== 'armure')) continue;
    const slot = it.type === 'arme' ? 'arme' : 'armure';
    // Au plus mal doté, et seulement si ça l'améliore.
    const cible = vivants.reduce((a, b) => (equipe(b, slot) < equipe(a, slot) ? b : a));
    if (valeurItem(key) <= equipe(cible, slot)) continue;
    if (it.reqForce && comp(cible, 'force') < it.reqForce) continue;
    g.objets.splice(i, 1);
    if (cible.equip[slot]) g.objets.push(cible.equip[slot]);
    cible.equip[slot] = key;
  }

  // Puis on achète, si l'étal a mieux que le pire de nos gens et qu'on peut se
  // le payer sans se mettre à jeun.
  const negoc = vivants.reduce((a, b) => (comp(b, 'commerce') > comp(a, 'commerce') ? b : a));
  const hab = comp(negoc, 'commerce');
  const repu = p.reputation[colIci.faction] || 0;
  for (let tour = 0; tour < 2; tour++) {
    let meilleur = -1;
    let gain = 0;
    let prixRetenu = 0;
    colIci.etal.items.forEach((ligne, i) => {
      const it = ITEMS[ligne.key];
      if (!it || (it.type !== 'arme' && it.type !== 'armure')) return;
      const slot = it.type === 'arme' ? 'arme' : 'armure';
      const cible = vivants.reduce((a, b) => (equipe(b, slot) < equipe(a, slot) ? b : a));
      if (it.reqForce && comp(cible, 'force') < it.reqForce) return;
      const d = valeurItem(ligne.key) - equipe(cible, slot);
      if (d <= 0) return;
      const prix = prixItem(colIci, ligne.key, ligne.coef, hab, repu).achat;
      // On garde de quoi manger : un mort bien armé reste un mort.
      //
      // Un bienfaiteur garde bien plus que ça : son métier demande du capital.
      // Mesuré, le bot vivait en permanence à trois cents crédits en poche — il
      // dépensait tout en équipement dès qu'il vendait — et refusait donc les
      // lots à cinq cents. Ce n'était pas un problème de prix mais de trésorerie.
      if (prix > soldeIci(state) - (BIENFAITEUR ? 1200 : 250)) return;
      if (d > gain) { gain = d; meilleur = i; prixRetenu = prix; }
    });
    if (meilleur < 0 || prixRetenu <= 0) break;
    if (!acheterItem(state, colIci, meilleur, g).ok) break;
    TRACE.payeMateriel += prixRetenu;
  }
}

/**
 * Ce qu'on bâtit, et dans quel ordre.
 *
 * L'ordre n'est pas décoratif : le générateur d'abord, parce que sans énergie
 * aucune chaîne ne tourne ; l'entrepôt ensuite, parce qu'un avant-poste plein
 * ne reçoit plus rien ; le baraquement, parce que sans habitants aucun métier
 * n'a de bras. Le reste suit l'utilité décroissante.
 */
/**
 * Le plan de bâtisse, en niveaux visés et non en liste plate.
 *
 * Écrit comme une simple suite de clés, le bot prenait le premier bâtiment
 * abordable — donc toujours le premier de la liste, tant qu'il restait un
 * niveau à lui ajouter. Résultat mesuré : entrepôt 2, cantine 2, hydroponie 1,
 * et **jamais de baraquement**. Or `populationMax` vaut neuf par baraquement et
 * quatre par hydroponie : tous les avant-postes du banc plafonnaient donc à
 * quatre habitants, quelle que soit leur richesse. Un camp qui a trois cent
 * trente-huit rations en réserve et personne pour les manger.
 *
 * On vise donc des niveaux, dans l'ordre où ils comptent : de quoi manger, de
 * quoi dormir, de quoi ramasser, puis le reste.
 */
const PLAN_BATI = [
  ['entrepot', 1], ['halle', 1], ['hydroponie', 1], ['baraquement', 1],
  ['cantine', 1], ['halle', 2], ['baraquement', 2], ['hydroponie', 2],
  ['generateur', 1], ['mur', 1], ['baraquement', 3], ['mur', 2],
  ['halle', 3], ['hydroponie', 3], ['poste', 1], ['infirmerie', 1],
  ['cantine', 2], ['baraquement', 4], ['entrepot', 3], ['generateur', 2],
  ['fonderie', 1], ['atelier', 1], ['antenne', 1], ['mur', 2],
  ['baraquement', 5], ['halle', 4], ['hydroponie', 4], ['raffinerie', 1],
];

/**
 * Le plan de celui qui s'est installé là où rien ne pousse.
 *
 * Le plan ordinaire ne monte l'antenne qu'en vingt-troisième position : pour un
 * camp dont la région ne donne pas de biomasse, c'est mille heures après sa
 * mort. Celui-ci fait l'inverse — antenne, recherche, bassins — parce que rien
 * d'autre ne compte tant qu'on ne mange pas.
 */
const PLAN_SEC = [
  ['entrepot', 1], ['antenne', 1], ['bassins', 1], ['hydroponie', 1],
  ['baraquement', 1], ['generateur', 1], ['bassins', 2], ['cantine', 1],
  ['baraquement', 2], ['hydroponie', 2], ['halle', 1], ['bassins', 3],
  ['mur', 1], ['baraquement', 3], ['hydroponie', 3], ['entrepot', 2],
  ['generateur', 2], ['poste', 1], ['infirmerie', 1], ['mur', 2],
  ['baraquement', 4], ['bassins', 4], ['halle', 2], ['fonderie', 1],
];

/** Où l'on veut des bras en priorité, quand des places s'ouvrent. */
const PLAN_POSTES = [
  'cultivateur', 'bassinier', 'cuisinier', 'recoltant', 'magasinier', 'batisseur',
  'milicien', 'garde', 'fondeur', 'infirmier', 'mecanicien', 'machiniste',
  'operateur', 'raffineur',
];

/** Une case où l'on peut vivre : vide, pas trop dangereuse, et qui rend. */
function siteAvantPoste(state, g) {
  let best = null;
  let bestSc = -Infinity;
  for (const r of state.world.regions) {
    if (r.colonie || !r.decouvert) continue;
    const d = distance(r.i, g.regionId);
    if (d > 6) continue;
    const y = BIOMES_BAT[r.biome].yields || {};
    const rend = (y.biomasse || 0) * 1.4 + (y.ferraille || 0) + (y.minerai || 0) * 0.8;
    // On veut une ville à portée : c'est là qu'on vend et qu'on achète le
    // carburant sans lequel rien ne tourne.
    let versVille = Infinity;
    for (const c of state.world.colonies) {
      if (c.ruine) continue;
      versVille = Math.min(versVille, distance(r.i, c.regionId));
    }
    if (versVille > 5) continue;
    const sc = rend * 10 * r.richesse - r.danger * 40 - d * 4 - versVille * 3;
    if (sc > bestSc) { bestSc = sc; best = r; }
  }
  return best;
}

/**
 * Fonder, bâtir, staffer, ravitailler. Jusqu'ici le banc ne fondait jamais
 * d'avant-poste : treize bâtiments et treize métiers n'avaient donc jamais été
 * éprouvés en partie, seulement à l'unité. `SANS=base` rétablit l'ancien
 * comportement pour mesurer ce que l'avant-poste apporte — ou coûte.
 */
function tenirAvantPoste(state, g, memo) {
  const base = state.base;
  // --- Fonder, une fois qu'on a de quoi et un endroit où.
  if (!base.fonde) {
    // Un colon ne passe pas trois cents heures à visiter : il plante son piquet
    // dès qu'il a de quoi.
    if (state.temps < (COLON ? 80 : 300)) return;
    if (!peutPayer(g.inventaire, COUT_FONDATION)) {
      memo.viseFondation = true;
      return;
    }
    if (process.env.TRACE_BASE) {
      console.log('  t', state.temps, 'inv',
        Object.keys(COUT_FONDATION).map((k) => k + ':' + Math.floor(g.inventaire[k] || 0)).join(' '),
        'cr', Math.round(soldeIci(state)), 'ordre', g.ordre.type);
    }
    const ici = state.world.regions[g.regionId];
    if (!ici.colonie) {
      const r = fonderBase(state, () => {}, g);
      if (r.ok) { memo.viseFondation = false; memo.fonde = state.temps; }
      return;
    }
    // On tient la marchandise : le voyage vers le site passe devant tout le
    // reste. Refuser d'écraser une route en cours revenait à ne jamais fonder —
    // le bot est presque toujours en chemin vers quelque chose.
    const site = siteAvantPoste(state, g);
    if (site && !(g.ordre.type === 'voyage' && g.ordre.dest === site.i)) {
      partir(state, g, site.i, 'aller fonder');
      memo.routeFondation = site.i;
    }
    return;
  }

  const surPlace = g.regionId === base.regionId;

  // --- Sur place : on vide le sac dans l'entrepôt, on lance ce qu'on peut.
  if (surPlace) {
    const libre = capaciteStock(state) - totalStock(base);
    // Ce qu'on doit à quelqu'un ne va pas à l'entrepôt.
    //
    // Le camp avalait la cargaison d'un marchand et le lot promis à un notable :
    // on payait la marchandise, on rentrait chez soi, on la rangeait, et l'on
    // repartait la livrer les mains vides. Ça se lisait comme une erreur de prix
    // — le marchand n'encaissait que la moitié de ce qu'il visait, à toute
    // distance et avec du renseignement frais, ce qui ne pouvait pas être un
    // effet du marché.
    const promis = new Set();
    if (memo.affaire) promis.add(memo.affaire.k);
    if (memo.promesse) promis.add(memo.promesse.res);
    if (libre > 20) {
      for (const k of COMMODITY_KEYS) {
        if (k === 'rations' || k === 'medkit' || promis.has(k)) continue;
        const q = Math.floor(g.inventaire[k] || 0);
        if (q > 0) deposer(state, k, q, g);
      }
    }
    // Les vivres du sac se refont sur l'entrepôt : c'est tout l'intérêt d'avoir
    // une maison.
    const manqueRations = 140 - (g.inventaire.rations || 0);
    if (manqueRations > 20 && (base.stock.rations || 0) > 120) {
      retirer(state, 'rations', manqueRations, capacitePortage(state, g), g);
    }
  }

  // Se faire reconnaître, mais pas avant d'avoir des murs : une ville sur les
  // cartes est une place que les conseils voisins convoitent, et un camp de
  // dix-sept âmes sans muraille ne tient pas devant une colonne.
  if (!base.colonieId && nivBat(base, 'mur') >= 2 && peutReconnaitre(state).ok) {
    reconnaitreAvantPoste(state, () => {});
  }

  // --- Chantiers. Un seul en file à la fois : empiler bloque les ressources.
  // On bâtit le prochain du plan, ou l'on attend d'en avoir les moyens. Prendre
  // « le premier abordable » revenait à ne jamais bâtir ce qui coûte cher : le
  // banc montrait des camps avec infirmerie, poste de garde et antenne, et pas
  // de baraquement — donc un plafond de quatre habitants, puisque c'est lui qui
  // fait les lits. Un joueur, lui, économise pour le dortoir.
  // Une fenêtre de trois, ni plus ni moins. « Le premier abordable » faisait
  // bâtir infirmerie, poste de garde et antenne avant le moindre dortoir — donc
  // un plafond de quatre habitants, puisque ce sont les lits qui le fixent.
  // « Attendre d'avoir les moyens du prochain » bloquait tout sur un seul
  // bâtiment cher : six niveaux au lieu de dix, et trois habitants au lieu de
  // cinq. On économise pour ce qui vient, sans s'interdire ce qui est juste
  // derrière.
  // Deux biomes sur neuf donnent de la biomasse : planté ailleurs, le camp ne
  // vit que de ce qu'on lui porte, et le banc l'a montré en creux pendant
  // longtemps — des avant-postes à cinq habitants qui ne décollent jamais. Il
  // existe une parade, elle passe par la recherche, on la joue.
  const sec = !((BIOMES_BAT[state.world.regions[base.regionId].biome].yields || {}).biomasse);
  if (sec && nivBat(base, 'antenne') >= 1 && !base.fileRech.length
      && (base.recherche.cultures || 0) < 1) {
    lancerRecherche(state, 'cultures');
  }
  if (base.file.length === 0) {
    let fenetre = 0;
    for (const [k, cible] of (sec ? PLAN_SEC : PLAN_BATI)) {
      if (!BUILDING_KEYS.includes(k)) continue;
      if (nivBat(base, k) >= cible) continue;
      if (lancerConstruction(state, k).ok) break;
      if (++fenetre >= 3) break;
    }
  }

  // --- Postes. On garnit dans l'ordre d'utilité, sans laisser un métier
  // absorber tout le monde.
  for (const k of PLAN_POSTES) {
    const places = placesMetier(base, k);
    if (places <= 0) continue;
    const tenu = voulus(base, k);
    if (tenu >= places) continue;
    if (affecter(state, k, tenu + 1).ok) break;
  }
}

/**
 * Rendre service, et se donner les moyens de le faire.
 *
 * Le piège de ce système, c'est qu'une ville demande précisément ce qui lui
 * manque : on ne peut donc jamais acheter sur place de quoi l'honorer. Il faut
 * porter la marchandise depuis ailleurs. Le bot tient donc une promesse à la
 * fois — celle qu'il a choisie —, refuse de vendre ce qu'il a promis, complète
 * son lot dans les villes qui en ont, et repasse la livrer.
 *
 * Sans ça il ne rendait qu'un service pour cent demandes croisées, et tout le
 * système restait une décoration.
 */
function servir(state, g, colIci, memo) {
  const p = state.player;
  // Ce qu'on a déjà sous la main, on le remet tout de suite.
  for (const d of demandesIci(state, colIci)) {
    if (!memo.vues) memo.vues = new Set();
    const cle = `${d.notable.id}:${d.demande.echeance}`;
    if (!memo.vues.has(cle)) { memo.vues.add(cle); TRACE.demandesVues++; }
    if (!d.pret) continue;
    if (honorer(state, colIci.id, d.notable.id, () => {}).ok) {
      memo.services++;
      if (memo.promesse && memo.promesse.notableId === d.notable.id) memo.promesse = null;
    }
  }

  // Compléter la promesse en cours, si cette ville-ci vend ce qu'il faut.
  if (memo.promesse) {
    const pr = memo.promesse;
    const col = colonieParId(state.world, pr.colId);
    const pers = col && (col.notables || []).find((x) => x.id === pr.notableId);
    // La demande a expiré, la personne est partie, ou la ville est tombée :
    // on ne poursuit pas un fantôme.
    if (!col || col.ruine || !pers || !pers.demande || pers.demande.res !== pr.res) {
      // La promesse est morte sans qu'on l'ait tenue : c'est ça qu'il faut
      // compter, pas le nombre de demandes affichées quelque part.
      TRACE.demandesPerdues++;
      memo.promesse = null;
    } else {
      const manque = pr.quantite - Math.floor(g.inventaire[pr.res] || 0);
      if (manque > 0 && (colIci.stock[pr.res] || 0) >= manque) {
        TRACE.achatsTentes++;
        const negoc = g.membres.filter(estVivant)
          .reduce((a, b) => (!a || comp(b, 'commerce') > comp(a, 'commerce') ? b : a), null);
        const unit = prixJoueur(colIci, pr.res, negoc ? comp(negoc, 'commerce') : 0,
          p.reputation[colIci.faction] || 0).achat;
        const cout = unit * manque;
        // On accepte de perdre un peu : l'estime vaut plus que la prime, pas au
        // point de se ruiner pour un inconnu.
        // Un bienfaiteur paie de sa poche : ce qu'il achète, ce n'est pas la
        // marchandise, c'est l'opinion de quelqu'un. Le bot par défaut refusait
        // dès que le lot coûtait plus que la prime — or la prime ne rembourse
        // que la marchandise au prix du marché, donc presque jamais le transport.
        const plafond = BIENFAITEUR ? pr.prime * 3 : pr.prime * 1.6;
        // Un bienfaiteur garde de quoi manger, pas une marge de moitié : la
        // règle prudente du bot par défaut refusait neuf achats sur dix, parce
        // qu'un lot de cent quarante rations coûte la moitié d'une bourse.
        TRACE.coutLot[pr.res] = (TRACE.coutLot[pr.res] || 0) + cout;
        TRACE.primeLot[pr.res] = (TRACE.primeLot[pr.res] || 0) + pr.prime;
        TRACE.nLot[pr.res] = (TRACE.nLot[pr.res] || 0) + 1;
        TRACE.bourse += soldeIci(state); TRACE.nBourse++;
        releverChange(state);
        const garde = BIENFAITEUR ? cout + 350 : cout * 1.5;
        if (cout > plafond) TRACE.achatsChers++;
        else if (soldeIci(state) <= garde) TRACE.achatsPauvre++;
        else if (acheter(state, colIci, pr.res, manque, g).ok) TRACE.achatsFaits++;
      }
    }
  }

  // Rien en cours : on adopte une demande d'ici, si elle est à notre portée.
  if (memo.promesse) return;
  // Un bienfaiteur a une paroisse, pas une carte.
  //
  // L'estime se gagne par 24, l'amitié commence à 35, et les témoins d'un
  // service n'en prennent que 6 : il faut donc revenir chez les mêmes gens. Le
  // bot éparpillait quatre services par partie sur soixante villes — quatre-
  // vingt-seize points d'estime en poussière, et pas un seul ami. On s'attache
  // à la première ville qui nous demande quelque chose, et l'on y reste.
  if (BIENFAITEUR) {
    if (memo.paroisse == null && demandesIci(state, colIci).length) {
      memo.paroisse = colIci.id;
    }
    // Une paroisse, pas une chapelle : les villes voisines en font partie. Une
    // seule ville ne produit qu'une douzaine de demandes en quatre mille heures
    // — moins que ce qu'il faut pour qu'on vous appelle un bienfaiteur.
    const centre = colonieParId(state.world, memo.paroisse);
    if (centre && distance(centre.regionId, colIci.regionId) > RAYON_PAROISSE) return;
  }
  const toutes = demandesIci(state, colIci);
  const candidates = toutes
    .filter((d) => COMMODITIES[d.demande.res].poids * d.demande.quantite
      < capacitePortage(state, g) * (BIENFAITEUR ? 0.8 : 0.5))
    .sort((a, b) => a.demande.quantite * COMMODITIES[a.demande.res].prix
      - b.demande.quantite * COMMODITIES[b.demande.res].prix);
  if (!candidates.length) { TRACE.demandesLourdes += toutes.length; return; }
  // Un bienfaiteur finit ce qu'il a commencé, chez les mêmes gens.
  //
  // L'estime se gagne par 24 et l'amitié commence à 35 : il faut donc revenir.
  // Le bot par défaut rendait quatre services par partie éparpillés sur soixante
  // villes et ne recroisait jamais personne — quatre-vingt-seize points d'estime
  // distribués en poussière, zéro ami. On préfère donc celui qui vous connaît
  // déjà, puis le plus petit lot.
  if (BIENFAITEUR) {
    candidates.sort((a, b) => (b.notable.opinion || 0) - (a.notable.opinion || 0)
      || a.demande.quantite * COMMODITIES[a.demande.res].prix
        - b.demande.quantite * COMMODITIES[b.demande.res].prix);
  }
  const d = candidates[0];
  TRACE.demandesPromises++;
  memo.promesse = {
    colId: colIci.id, notableId: d.notable.id, res: d.demande.res,
    quantite: d.demande.quantite, prime: d.demande.prime,
  };
}

/**
 * Le groupe principal : celui qui commerce, s'équipe et prend le travail.
 * C'est lui qui porte la partie.
 */
/**
 * Ce qu'un officier fait de sa charge. Sans ça, le banc ne mesure jamais que la
 * moitié basse de l'échelle : les prérogatives des grades supérieurs ne
 * s'exercent que si quelqu'un les exerce, et leurs mérites sont précisément ce
 * qui permet de monter jusqu'aux suivants.
 */
function exercerCharge(state, g, memo) {
  const all = g.allegeance;
  if (!all) return;
  const f = all.faction;
  // On ne passe pas ses journées au téléphone : une décision toutes les
  // quarante heures, ce qui laisse le temps d'en voir l'issue.
  if (state.temps < (memo.prochaineCharge || 0)) return;
  memo.prochaineCharge = state.temps + 40;

  // Envoyer : détourner une colonne vers la ville ennemie la plus proche des
  // nôtres. C'est le geste de base d'un lieutenant.
  if (peutExercer(state, f, 'envoyer').ok) {
    const cible = villeAPrendre(state, f);
    for (const a of colonnesDe(state, f)) {
      if (!cible || a.cible === cible.id) continue;
      if (envoyerColonne(state, f, a.id, cible.id, () => {}).ok) { memo.ordresDonnes++; return; }
    }
  }
  // Lever : on n'arme que si le trésor peut se le permettre deux fois, sinon on
  // laisse la faction sans réserve et c'est elle qui tombe.
  if (peutExercer(state, f, 'lever').ok
      && state.world.factions[f].tresor > coutLevee() * 2) {
    const cible = villeAPrendre(state, f);
    if (cible && leverColonne(state, f, null, cible.id, () => {}).ok) {
      memo.ordresDonnes++;
      return;
    }
  }
  // Fonder : une ville de plus est un mérite durable, et de l'assiette.
  if (peutExercer(state, f, 'fonder').ok
      && state.world.factions[f].tresor > COUT_POSTE * 2) {
    const sites = sitesFondation(state.world, f);
    if (sites.length) {
      const rng = new Rng(state.rngState);
      const r = fonderPoste(state, f, sites[0].i, rng, () => {});
      state.rngState = rng.save();
      if (r.ok) { memo.ordresDonnes++; return; }
    }
  }
  // Guerre et paix : on ne déclare que si l'on a de quoi la mener, et on signe
  // dès qu'on a pris quelque chose. Un commandeur qui laisse traîner perd sa
  // charge, et c'est bien le but du dispositif.
  if (peutExercer(state, f, 'paix').ok) {
    for (const { contre, guerre } of guerresArretables(state, f)) {
      if (guerre.batailles < 2) continue;
      if (signerPaixAvec(state, f, contre, () => {}).ok) { memo.ordresDonnes++; return; }
    }
  }
  if (peutExercer(state, f, 'guerre').ok
      && state.world.factions[f].tresor > coutLevee() * 4) {
    const cibles = cibleGuerre(state, f);
    if (cibles.length) {
      const rng = new Rng(state.rngState);
      const r = declarerGuerreA(state, f, cibles[0], rng, () => {});
      state.rngState = rng.save();
      if (r.ok) memo.ordresDonnes++;
    }
  }
}

/** La ville ennemie la plus proche des nôtres : ce qu'une colonne va prendre. */
function villeAPrendre(state, faction) {
  const w = state.world;
  const miennes = w.colonies.filter((c) => !c.ruine && c.faction === faction);
  if (!miennes.length) return null;
  let best = null;
  let d = Infinity;
  for (const c of w.colonies) {
    if (c.ruine || c.faction === faction) continue;
    if (c.faction && !enGuerre(w, faction, c.faction)) continue;
    for (const m of miennes) {
      const dd = distance(m.regionId, c.regionId);
      if (dd < d) { d = dd; best = c; }
    }
  }
  return best;
}

/**
 * Comment le bot se bat. Un joueur qui a compris regarde trois choses avant de
 * décider : ce qu'il a sous les pieds, ce qu'il porte, et s'il peut gagner.
 */
function choisirTactique(state, g) {
  const vivants = g.membres.filter(estVivant);
  if (!vivants.length) return;
  const biome = state.world.regions[g.regionId].biome;
  const armes = vivants.filter(
    (c) => c.equip.arme && ITEMS[c.equip.arme] && ITEMS[c.equip.arme].comp === 'tir').length;
  const partTir = armes / vivants.length;
  // Trop peu nombreux ou trop amochés : on ne cherche pas la victoire, on
  // ramène les siens.
  const amoches = vivants.filter((c) => pvTotal(c).pct < 0.6).length;
  if (vivants.length <= 2 || amoches > vivants.length / 2) {
    state.player.tactique = 'harcelement';
    return;
  }
  let best = 'ligne';
  let bestV = -1;
  for (const k of TACTIQUE_KEYS) {
    if (k === 'harcelement') continue;
    const v = rendementTactique(k, biome, 1.3, partTir);
    if (v > bestV) { bestV = v; best = k; }
  }
  state.player.tactique = best;
}

function jouerPrincipal(state, g, memo) {
  const p = state.player;
  if (!SANS.has('tactique')) choisirTactique(state, g);
  if (!SANS.has('charge')) exercerCharge(state, g, memo);
  const cap = capacitePortage(state, g);
  const charge = poidsInventaire(g.inventaire) / Math.max(1, cap);
  const rations = g.inventaire.rations || 0;
  const colIci = colonieDe(state.world, g.regionId);

  // En ville : on vend le surplus, on refait les vivres, on s'équipe, on prend
  // du travail. C'est ce que ferait un joueur qui regarde ses écrans.
  if (colIci) {
    // --- Rendre service aux gens d'ici, avant tout le reste : ce qu'on porte et
    // qu'ils attendent vaut plus entre leurs mains que sur l'étal. Un joueur qui
    // a compris le jeu ne le fait pas pour la prime — elle rembourse à peine —
    // mais pour ce que l'estime ouvre : marge de l'armurier, soins du médecin,
    // panneau du chef, registres du contremaître.
    if (!SANS.has('services')) servir(state, g, colIci, memo);

    // Ne jamais vendre ce qu'un contrat en cours réclame : c'est exactement
    // l'erreur que ferait un joueur distrait, et elle doit se voir au banc.
    const reserves = new Set(p.contrats.filter((c) => c.ressource).map((c) => c.ressource));
    // Ni ce qu'on a promis à quelqu'un.
    if (memo.promesse) reserves.add(memo.promesse.res);
    // Ni la cargaison d'un marchand, tant qu'on n'est pas arrivé : la vendre à
    // la première ville venue, c'est exactement ne pas faire le métier.
    if (memo.affaire && memo.affaire.destId !== colIci.id) reserves.add(memo.affaire.k);
    // Ni de quoi fonder l'avant-poste : le bot vendait tout à chaque passage en
    // ville et n'accumulait donc jamais les cent vingt ferrailles qu'il faut.
    if (!SANS.has('base') && !state.base.fonde && state.temps > 300) {
      for (const k of Object.keys(COUT_FONDATION)) reserves.add(k);
    }
    // Ni les matériaux que les chantiers de la maison réclament.
    if (!SANS.has('base') && state.base.fonde) {
      for (const k of ['ferraille', 'polymere', 'composant']) reserves.add(k);
    }
    const ordreEnCours = g.allegeance && g.allegeance.ordre;
    if (ordreEnCours && ordreEnCours.ressource) reserves.add(ordreEnCours.ressource);
    for (const k of COMMODITY_KEYS) {
      if (k === 'rations' || k === 'medkit' || reserves.has(k)) continue;
      const q = g.inventaire[k] || 0;
      if (q > 0) {
        const av = soldeIci(state);
        const vte = vendre(state, colIci, k, q, g);
        TRACE.gagneVente += soldeIci(state) - av;
        // Ce que le régime a retenu au passage. Mesuré ici plutôt que déduit
        // d'un A/B : deux parties dont l'une est 6 % plus riche ne prouvent
        // rien quand une seule graine sur trente pèse dix fois la médiane.
        TRACE.retenu += vte.taxe || 0;
        // Ce que la cargaison a réellement rapporté, arrivée sur place : c'est
        // le seul chiffre qui dise si le métier paie, la marge visée au départ
        // n'étant qu'une estimation sur un relevé daté.
        if (MARCHAND && memo.affaire && memo.affaire.k === k
          && memo.affaire.destId === colIci.id) {
          TRACE.recetteTotale += soldeIci(state) - av;
        }
      }
    }
    // --- Charger. Un marchand n'achète qu'après avoir vendu, et il n'engage
    // pas tout : rester solvable fait partie du métier.
    if (MARCHAND) {
      if (memo.affaire && memo.affaire.destId === colIci.id) memo.affaire = null;
      if (!memo.affaire && soldeIci(state) > 600) {
        const aff = meilleureAffaire(state, g, colIci);
        if (aff && aff.cout < soldeIci(state) * 0.7) {
          const r = acheter(state, colIci, aff.k, aff.qte, g);
          if (r.ok && r.qte > 0) {
            TRACE.payeMateriel += r.cout;
            TRACE.affairesPrises++;
            TRACE.miseTotale += r.cout;
            TRACE.recetteEsperee += aff.espere * (r.qte / Math.max(1, aff.qte));
            memo.affaire = { k: aff.k, destId: aff.destId, mise: r.cout, qte: r.qte };
          }
        }
      }
    }

    // Second passage : la cargaison est vendue, on a de l'argent en main.
    //
    // `servir` est appelé en tête de la visite, avant la vente — donc au moment
    // exact où la bourse est au plus bas. Mesuré : trois cents crédits en poche
    // en moyenne à l'instant où l'on regarde le prix d'un lot qui en coûte cinq
    // cents, et deux mille achats refusés « faute de crédits ». Le bot n'était
    // pas prudent, il était fauché — et il l'était de sa propre faute, puisque
    // le reste de la visite consiste précisément à vendre.
    //
    // Ce passage vient avant les vivres et l'équipement : un bienfaiteur remplit
    // sa promesse d'abord et son garde-manger ensuite. C'est tout le profil.
    if (BIENFAITEUR && !SANS.has('services')) servir(state, g, colIci, memo);

    // On voit venir la saison : on ne part pas en hiver avec trois boîtes.
    const cible = saison(state.temps).key === 'pluies' || saison(state.temps).key === 'accalmie' ? 190 : 120;
    if (rations < cible) {
      releverChange(state);
      if (soldeIci(state) > 200) {
        const av = soldeIci(state);
        acheter(state, colIci, 'rations', cible - rations, g);
        TRACE.payeVivres += av - soldeIci(state);
      } else if (bourseTotale(state) - soldeIci(state) > 200) {
        // L'accident de change, s'il existe : on a de quoi manger, ailleurs.
        // Le bot va donc au bureau — c'est exactement ce que le lot E rend
        // possible, et ce qu'E6 doit vérifier autrement qu'en le supposant.
        TRACE.bloquesChange++;
        if (changerPourManger(state, colIci)) {
          TRACE.changesFaits++;
          const av = soldeIci(state);
          acheter(state, colIci, 'rations', cible - rations, g);
          TRACE.payeVivres += av - soldeIci(state);
        }
      }
    }
    if ((g.inventaire.medkit || 0) < 3 && soldeIci(state) > 400) {
      const av = soldeIci(state);
      acheter(state, colIci, 'medkit', 2, g);
      TRACE.payeSoins += av - soldeIci(state);
    }

    // Compléter une collecte au marché plutôt que d'attendre que le biome la
    // donne. Un joueur qui a compris le jeu compare d'abord : payer 900 cr de
    // minerai pour un contrat à 800, c'est travailler à perte avec le
    // sentiment d'avancer.
    for (const c of p.contrats) {
      if (c.type !== 'collecte') continue;
      const manque = c.quantite - Math.floor(g.inventaire[c.ressource] || 0);
      if (manque <= 0) continue;
      if ((colIci.stock[c.ressource] || 0) < manque) continue;
      const negoc = g.membres.filter(estVivant)
        .reduce((a, b) => (!a || comp(b, 'commerce') > comp(a, 'commerce') ? b : a), null);
      const unitaire = prixJoueur(colIci, c.ressource, negoc ? comp(negoc, 'commerce') : 0,
        p.reputation[colIci.faction] || 0).achat;
      const cout = unitaire * manque;
      if (cout > c.recompense * 0.55 || soldeIci(state) < cout * 1.4) continue;
      acheter(state, colIci, c.ressource, manque, g);
    }

    // Recruter jusqu'au noyau qu'on sait tenir, pas au-delà : au-delà la
    // cohésion se délite et tout le monde rend moins. Rien ne l'interdit — c'est
    // simplement une mauvaise affaire, et un joueur avisé le sait.
    if (!SANS.has('recrue')) {
      const ici = g.membres.filter(estVivant).length;
      const prixR = Math.round(180 + colIci.pop * 0.35 + tousLesMembres(state).filter(estVivant).length * 90);
      // GROS=n : on recrute jusqu'à n personnes quoi qu'il en coûte. C'est le
      // témoin qui dit si la limite émergente mord vraiment, ou si entasser du
      // monde reste la stratégie gagnante malgré tout ce qu'on a écrit.
      const vise = process.env.GROS ? Number(process.env.GROS) : noyau(state, g);
      // En mode témoin on paie la prime quoi qu'il arrive : sinon c'est le prix
      // du recrutement qu'on mesure, pas la cohésion.
      if (process.env.GROS && ici < vise) poserB(state, Math.max(soldeIci(state), prixR + 950));
      if (ici < vise && soldeIci(state) > prixR + 900) {
        const rngR = new Rng(state.rngState);
        const nouveau = makeCharacter(rngR, { niveau: rngR.irange(0, 2) });
        state.rngState = rngR.save();
        regler(state, prixR);
        g.membres.push(nouveau);
        TRACE.recrues++;
      }
    }

    // S'armer. Avant les contrats, avant l'avant-poste : une escouade qui perd
    // ses combats ne fait rien d'autre de la partie.
    sEquiper(state, g, colIci);

    // S'atteler. Un dos de plus, c'est un aller-retour en ville de moins — et
    // soixante-dix pour cent des départs d'un convoi sont des allers-retours.
    // On s'arrête à ce qu'on sait mener : rien ne l'interdit, mais au-delà
    // c'est une mauvaise affaire — et un joueur raisonnable le sait.
    if (!SANS.has('betes') && betesDe(g).length < conduite(g)) {
      const cap = capacitePortage(state, g);
      // On ne s'attelle que si le sac est réellement le facteur limitant, et
      // qu'on peut nourrir la bête sans se ruiner.
      if (poidsInventaire(g.inventaire) / Math.max(1, cap) > 0.6) {
        for (const k of ['mulet', 'charrette', 'brahmine']) {
          const prix = prixBete(colIci, k);
          if (soldeIci(state) < prix + 400) continue;
          const rngB = new Rng(state.rngState);
          const r = acheterBete(state, colIci, k, rngB, () => {}, g);
          state.rngState = rngB.save();
          if (r.ok) { TRACE.payeMateriel += r.prix; TRACE.betes++; break; }
        }
      }
    }

    // De quoi fonder, puis de quoi faire tourner. Un générateur sans carburant
    // ne produit rien, et sans énergie aucune chaîne ne tourne : c'est la
    // dépendance que le banc doit éprouver.
    if (!SANS.has('base')) {
      // On achète ce qui manque pour fonder dès qu'on peut se le payer — pas à
      // partir d'un seuil rond. Le polymère et les composants ne se ramassent
      // presque jamais à la fouille : les attendre, c'est ne jamais fonder.
      if (!S_base(state).fonde && state.temps > 250) {
        const negocB = g.membres.filter(estVivant)
          .reduce((a, b) => (!a || comp(b, 'commerce') > comp(a, 'commerce') ? b : a), null);
        const hab = negocB ? comp(negocB, 'commerce') : 0;
        const rep = p.reputation[colIci.faction] || 0;
        let cout = 0;
        const achats = [];
        for (const k of Object.keys(COUT_FONDATION)) {
          const manque = COUT_FONDATION[k] - Math.floor(g.inventaire[k] || 0);
          if (manque <= 0) continue;
          if ((colIci.stock[k] || 0) < manque) { cout = Infinity; break; }
          cout += prixJoueur(colIci, k, hab, rep).achat * manque;
          achats.push([k, manque]);
        }
        // On garde de quoi manger : fonder un avant-poste et mourir de faim
        // dedans serait une drôle de stratégie.
        if (achats.length && cout + 150 <= soldeIci(state)) {
          for (const [k, q] of achats) acheter(state, colIci, k, q, g);
        }
      }
      if (S_base(state).fonde && soldeIci(state) > 500
          && (S_base(state).stock.carburant || 0) + (g.inventaire.carburant || 0) < 150) {
        acheter(state, colIci, 'carburant', 120, g);
      }
      // Ce que la région ne donne pas, on l'achète. La halle ramasse ce que le
      // biome contient — de la biomasse et de la ferraille en steppe — et rien
      // d'autre : sans polymère ni composant acheté en ville, tout ce qui en
      // réclame échoue en silence, et le camp bâtit un générateur et un mur au
      // lieu d'un baraquement. Mesuré : quatre habitants maximum, toujours.
      if (S_base(state).fonde && soldeIci(state) > 400) {
        for (const k of ['polymere', 'composant']) {
          const stock = (S_base(state).stock[k] || 0) + (g.inventaire[k] || 0);
          const veut = k === 'polymere' ? 120 : 40;
          if (stock < veut) acheter(state, colIci, k, veut - stock, g);
        }
      }
    }

    // --- Ce qu'on fait des siens qui sont tombés. Le bot enterre : c'est le
    // geste qui resserre la bande, et le banc doit mesurer la voie honnête
    // d'abord — comme il livre ses prisonniers plutôt que de les vendre.
    for (const mort of depouillesDe(g).slice()) {
      if (effetsDe(mort).length) {
        disposerCorps(state, g, mort.id, 'depouiller', () => {});
        TRACE.depouilles++;
      }
      if (disposerCorps(state, g, mort.id, 'enterrer', () => {}).ok) TRACE.enterres++;
    }

    // --- Ce qu'on fait des gens qu'on n'a pas tués. Un joueur qui a compris
    // prend l'option la mieux payée qui ne le brûle pas partout : livrer et
    // rançonner rapportent et ne fâchent personne, vendre rapporte plus et se
    // paie en réputation. Le bot par défaut ne vend pas — c'est un choix de jeu,
    // pas une optimisation, et le banc doit mesurer la voie honnête d'abord.
    // `NEGRIER=1` mesure l'autre, et c'est la seule façon de savoir ce que ce
    // que le jeu appelle sa voie la plus rentable coûte vraiment.
    // Un négrier ne brade pas sa cargaison au premier comptoir : la prime de
    // justice paie environ le tiers de ce qu'en donne un marché. Il garde, ce
    // qui n'est pas gratuit — ils mangent, ils ralentissent, ils s'évadent.
    const garderPourLeMarche = NEGRIER && !acheteDesHommes(state, colIci)
      && surveillanceManquante(g) <= 0;
    for (const c of garderPourLeMarche ? [] : prisonniersDe(g).slice()) {
      const opts = optionsPour(state, colIci, g, c)
        .filter((o) => o.key === 'livrer' || o.key === 'rancon'
          || (NEGRIER && o.key === 'vendre'));
      if (!opts.length) continue;
      opts.sort((a, b) => b.prix - a.prix);
      const r = disposer(state, g, c.id, opts[0].key, () => {});
      if (r.ok) {
        TRACE.disposes++;
        TRACE.gagneCaptifs += r.prix || 0;
        if (opts[0].key === 'vendre') TRACE.vendus++;
      }
    }

    // Un carriériste achète ce que son ordre réclame. L'ordre paie la
    // marchandise entre 1.8 et 2.6 fois son prix de marché : c'est le seul
    // commerce du jeu dont la marge soit connue d'avance, et le bot par défaut
    // ne s'en sert jamais — il livre le ravitaillement uniquement s'il avait
    // déjà la marchandise dans le sac, soit une fois sur cinq.
    if (CARRIERE && memo.achatOrdre) {
      const { res, qte } = memo.achatOrdre;
      const ordre = g.allegeance && g.allegeance.ordre;
      const dest = ordre && ordre.type === 'ravitaillement' ? ordre.colonieId : null;
      const manque = qte - Math.floor(g.inventaire[res] || 0);
      if (!dest || colIci.id === dest || manque <= 0) {
        memo.achatOrdre = null;
      } else if ((colIci.stock[res] || 0) > 0) {
        const r = acheter(state, colIci, res, manque, g);
        if (r.ok) {
          TRACE.payeMateriel += r.cout;
          if (Math.floor(g.inventaire[res] || 0) >= qte) memo.achatOrdre = null;
        }
      }
    }

    // S'engager : la solde, la remise et l'intendance valent largement le prix
    // de quelques ordres à honorer. Mais chez celui qu'on courtise, pas chez le
    // premier qui ouvre sa porte — sinon on ne mesure jamais que le drapeau le
    // moins exigeant du voisinage. Au bout de REPLI_H heures sans y arriver, on
    // signe où l'on peut : un joueur ne courtise pas une église toute sa vie.
    if (!SANS.has('service') && !g.allegeance && peutSEngager(state, colIci.faction).ok) {
      const repli = state.temps >= REPLI_H;
      if (colIci.faction === memo.visee || repli) {
        sEngager(state, colIci.faction, () => {});
        const st = FACTIONS[colIci.faction].style;
        TRACE.servis[st] = (TRACE.servis[st] || 0) + 1;
        if (colIci.faction !== memo.visee) TRACE.replis += 1;
      }
    }
    // Passer à l'intendance : c'est gratuit, c'est de la nourriture, et c'est
    // toute la différence entre servir et ne pas servir.
    if (g.allegeance && droitIntendance(state, colIci).ok) {
      const av = g.inventaire.rations || 0;
      toucherRations(state, colIci, () => {}, g);
      TRACE.rationsTouchees += (g.inventaire.rations || 0) - av;
    }

    // On prend ce qu'on peut tenir. La livraison est le contrat le mieux payé
    // du panneau : la refuser par prudence, c'est jouer à moitié.
    if (colIci.contrats && !SANS.has('contrats') && p.contrats.length < MAX_CONTRATS - 1) {
      // Un joueur qui vise un engagement courtise une faction plutôt que de
      // rendre service à tout le monde : l'estime se dilue et s'émousse.
      const courtisee = memo.courtisee || (memo.courtisee = colIci.faction);
      const faisables = colIci.contrats.filter((c) => {
        if (c.type === 'livraison') {
          if (SANS.has('livraison')) return false;
          const d = colonieParId(state.world, c.destId);
          return d && !d.ruine && distance(d.regionId, g.regionId) <= 6;
        }
        return c.type === 'collecte' || c.type === 'prime' || c.type === 'reconnaissance';
      });
      // On préfère toujours ce qui fait monter chez celle qu'on courtise.
      faisables.sort((a, b) => (b.faction === courtisee ? 1 : 0) - (a.faction === courtisee ? 1 : 0)
        || (b.reputation || 0) - (a.reputation || 0));
      // Un contrat par passage en ville, sauf pour l'assidu, qui remplit son
      // carnet et n'accepte que ce qui compte pour celle qu'il courtise. C'est
      // lui qui dit à quelle vitesse un joueur consciencieux sature une
      // réputation — le bot ordinaire, qui rend deux contrats par partie, ne
      // peut mesurer qu'un plancher.
      const aPrendre = ASSIDU
        ? faisables.filter((c) => c.faction === courtisee)
        : faisables.slice(0, 1);
      for (const offre of aPrendre) {
        if (p.contrats.length >= MAX_CONTRATS - 1) break;
        const pris = accepter(state, colIci, offre.id, () => {}, g);
        if (pris && pris.ok !== false) TRACE.contratsPris += 1;
      }
    }
  }

  // --- L'embuscade. Une caravane sur la case ne reste pas : elle avance d'une
  // région toutes les deux heures, et le bot ne joue qu'un tour sur quatre. Si
  // on ne la prend pas maintenant, on ne la prendra pas.
  if (PILLARD || (REPENTIR && state.temps < REPENTIR)) {
    const ici = (state.world.caravanes || []).filter((c) => c.regionId === g.regionId);
    for (const car of ici) {
      TRACE.caravanesVues++;
      const debout = g.membres.filter(estDebout).length;
      // On ne charge pas une escorte plus nombreuse que soi : le butin ne vaut
      // rien si la colonne y reste.
      const escorte = Math.max(1, Math.min(6, Math.round(car.escorte / 9)));
      if (escorte > debout || debout < 2) continue;
      const valeur = valeurCargaison(car);
      // On emprunte le générateur du monde et on le rend tout de suite, comme le
      // fait `main.js` pour toute action du joueur : une action qui tire sur un
      // flux parallèle casse la rejouabilité de la partie.
      const rngA = new Rng(state.rngState);
      const r = attaquerCaravane(state, car, rngA, () => {}, combatContre, genererBande);
      state.rngState = rngA.save();
      if (r.ok && r.gagne) {
        TRACE.caravanesPrises++;
        TRACE.butinCaravanes += valeur;
        TRACE.butinLaisse += r.laisse || 0;
        TRACE.butinPorte += Object.values(r.pris || {}).reduce((a, b) => a + b, 0);
      }
      else if (r.ok) TRACE.caravanesRatees++;
      return;
    }
  }

  // --- Se poster. Sans chercher, on croise trois caravanes par partie : ce que
  // le hasard met sur la route de quelqu'un qui fait autre chose. Un pillard va
  // au-devant. Il ne poursuit pas — une caravane avance d'une case toutes les
  // deux heures et ne se rattrape pas — il l'attend à l'arrivée, qui est le seul
  // point de son trajet qu'on connaisse à coup sûr.
  // On ne poursuit pas, on n'intercepte pas, et on ne se poste pas.
  //
  // Une caravane franchit une région en deux heures là où une colonne en met
  // quatorze : elle est sept fois plus rapide que vous. Poursuivre est exclu.
  // Se poster l'est aussi, et c'est le résultat le plus net de cette mesure :
  // trois cent quatre-vingts caravanes circulent par partie, mais il n'en passe
  // que **onze heures-caravane sur une case donnée en quatre mille heures**, y
  // compris sur la ville la mieux reliée de la carte. Un bot qui a guetté
  // 3 150 heures — quatre-vingts pour cent de sa partie — en a croisé exactement
  // autant qu'un bot qui vaquait à ses affaires, et il a fini à 444 crédits
  // contre 4 128. Le trafic n'est pas rare, il est dilué sur 432 régions.
  //
  // Le pillage est donc une occasion, pas un métier. Le profil se réduit à ça :
  // on vit normalement, et on prend ce qui passe.

  // Blessés ou épuisés : on se pose — mais pas au point de mourir de faim en
  // convalescence. Se reposer sans vivres est le meilleur moyen de ne jamais
  // se relever.
  const vivants = g.membres.filter(estVivant);
  const mal = vivants.filter((c) => !estDebout(c) || pvTotal(c).pct < 0.6).length;
  if (mal > 0 && rations > 50) {
    if (g.ordre.type !== 'repos') donnerOrdre(state, { type: 'repos' }, g);
    return;
  }

  // Honorer l'ordre de mission : c'est le chemin le plus rentable du jeu, et
  // pour un carriériste c'est le seul qui compte. Un ordre raté ne coûte pas de
  // points — il coûte de l'estime, et l'estime finit par fermer l'intendance.
  const o = g.allegeance && g.allegeance.ordre;
  if (CARRIERE && servirOrdre(state, g, memo, rations)) return;
  if (o && g.ordre.type !== 'voyage' && rations > 40) {
    const av = avancementOrdre(state, o);
    if (o.type === 'ravitaillement' && av && av.fait >= o.quantite) {
      const col = colonieParId(state.world, o.colonieId);
      if (col && !col.ruine && col.regionId !== g.regionId) {
        partir(state, g, col.regionId, 'ordre de mission');
        return;
      }
    }
    if (o.type === 'reconnaissance' && !state.world.regions[o.regionId].decouvert) {
      partir(state, g, o.regionId, 'ordre de mission');
      return;
    }
  }

  // --- La rafle. Un négrier ne tombe pas sur des captifs par hasard : il va les
  // chercher, et il travaille un couloir.
  //
  // La première version patrouillait n'importe où et rentrait vendre à l'autre
  // bout du monde. Elle prenait *moins* de prisonniers que le bot par défaut —
  // 13,5 contre 17,3 — parce qu'on ne capture que ce qu'on a des bras pour
  // garder : une corde pleine qui marche trois cents heures vers un marché, ce
  // sont trois cents heures à ne rien pouvoir prendre. Le trajet est le coût
  // principal du métier, alors on le raccourcit : on chasse autour de son
  // débouché.
  // On ne part pas à la chasse à l'homme avec des gens qui n'ont jamais tenu une
  // arme : la rafle passait avant l'entraînement, l'escouade restait à treize de
  // compétence en posture agressive, et une partie sur quatre s'éteignait.
  const prets = vivants.length && vivants.reduce(
    (a, c) => a + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / vivants.length >= 18;
  if (NEGRIER && prets && rations > 60 && vivants.every((c) => pvTotal(c).pct > 0.65)) {
    let marche = memo.marche != null ? colonieParId(state.world, memo.marche) : null;
    if (!acheteDesHommes(state, marche)) {
      marche = null;
      let bestD = Infinity;
      for (const c of state.world.colonies) {
        if (!acheteDesHommes(state, c)) continue;
        const d = distance(c.regionId, g.regionId);
        if (d < bestD) { bestD = d; marche = c; }
      }
      memo.marche = marche ? marche.id : null;
    }
    if (!marche) {
      TRACE.sansMarche++;
    } else {
      const place = capaciteGarde(g) - prisonniersDe(g).length;
      const loin = distance(marche.regionId, g.regionId) > RAYON_RAFLE;
      if (place < 1 || (loin && prisonniersDe(g).length > 0)) {
        // Plein, ou trop loin avec de la marchandise sur les bras : on vend.
        if (marche.regionId !== g.regionId) {
          if (!(g.ordre.type === 'voyage' && g.ordre.dest === marche.regionId)) {
            partir(state, g, marche.regionId, 'porter la cargaison au marché');
          }
          return;
        }
      } else if (loin) {
        if (!(g.ordre.type === 'voyage' && g.ordre.dest === marche.regionId)) {
          partir(state, g, marche.regionId, 'revenir sur son terrain de chasse');
        }
        return;
      } else {
        if (g.ordre.type !== 'patrouille') donnerOrdre(state, { type: 'patrouille' }, g);
        TRACE.raflees++;
        return;
      }
    }
  }

  // Une route vers le site du futur avant-poste ne se détourne pas : c'est le
  // seul voyage du jeu qui, une fois arrivé, change la partie.
  if (memo.routeFondation != null && !state.base.fonde
      && g.ordre.type === 'voyage' && g.ordre.dest === memo.routeFondation) {
    return;
  }

  // --- Rentrer chez soi. Un avant-poste qu'on ne réapprovisionne jamais reste
  // un piquet planté dans le sable : il ne bâtit rien, ne loge personne, ne
  // produit rien. Tant qu'il a faim de matériaux, il passe avant le marché.
  const base = state.base;
  if (!SANS.has('base') && base.fonde && g.regionId !== base.regionId) {
    const chargeUtile = ['ferraille', 'polymere', 'minerai', 'composant', 'alliage']
      .reduce((a, k) => a + (g.inventaire[k] || 0), 0);
    const chantierEnAttente = base.file.length > 0 || BUILDING_KEYS.some(
      (k) => nivBat(base, k) === 0 && ['generateur', 'entrepot', 'baraquement', 'hydroponie'].includes(k)
    );
    // Pas de plafond de distance : sur une carte de 24×18 le bot est presque
    // toujours à plus de six secteurs de chez lui, et un « rentrer si c'est
    // près » revenait à ne jamais rentrer. Le camp a reçu vingt-neuf ferrailles
    // en quatre mille heures, et n'a jamais rien bâti.
    if ((charge > 0.7 || chantierEnAttente) && chargeUtile > 22 && rations > 40) {
      if (!(g.ordre.type === 'voyage' && g.ordre.dest === base.regionId)) {
        partir(state, g, base.regionId, 'rentrer au camp');
      }
      return;
    }
  }

  // Sac plein, ou réserves au plus bas et de quoi payer : on rentre en ville.
  const besoinVille = charge > 0.85 || (rations < 45 && soldeIci(state) > 300);
  if (besoinVille && !colIci) {
    const col = colonieLaPlusProche(state, g);
    if (col && g.ordre.type !== 'voyage') {
      // Instrumentation : on compte les voyages entrepris vers une ville qui
      // n'existe déjà plus. C'est le prix exact d'un renseignement périmé.
      if (col.ruine) TRACE.voyagesPerdus++;
      partir(state, g, col.regionId, 'marché : vendre ou se ravitailler');
    }
    return;
  }
  if (g.ordre.type === 'voyage') return;

  // Témoin : on erre sans raison, pour mesurer ce que coûte la route seule.
  if (VAGABOND && rations > 60 && state.temps - (memo.dernierSaut || 0) > 90) {
    const cibles = state.world.regions.filter((r) => r.decouvert && distance(r.i, g.regionId) >= 3);
    if (cibles.length) {
      memo.dernierSaut = state.temps;
      donnerOrdre(state, { type: 'voyage', dest: cibles[(state.temps * 7) % cibles.length].i }, g);
      return;
    }
  }

  // --- Tenir sa promesse. Pour un bienfaiteur c'est le métier, pas un détour
  // qu'on fait si la route y passe : le bot par défaut en adoptait deux cent
  // trente-trois et en laissait mourir deux cent neuf, non par mauvaise foi
  // mais parce que la promesse venait après les contrats, le camp et le marché,
  // et qu'une demande s'éteint en trois semaines de jeu.
  if (BIENFAITEUR && memo.promesse && rations > 40) {
    const pr = memo.promesse;
    const col = colonieParId(state.world, pr.colId);
    if (col && !col.ruine) {
      const enMain = Math.floor(g.inventaire[pr.res] || 0);
      if (enMain >= pr.quantite) {
        if (col.regionId !== g.regionId
          && !(g.ordre.type === 'voyage' && g.ordre.dest === col.regionId)) {
          partir(state, g, col.regionId, 'tenir une promesse');
        }
        if (col.regionId !== g.regionId) return;
      } else {
        // Il manque de quoi : on va le chercher là où il y en a. On paie la
        // marchandise puis la route jusqu'à celui qui attend — c'est le total
        // qui décide, comme pour un ordre de ravitaillement.
        const manque = pr.quantite - enMain;
        let vend = null;
        let mieux = Infinity;
        for (const c of state.world.colonies) {
          if (c.ruine || c.id === col.id) continue;
          if ((c.stock[pr.res] || 0) < manque) continue;
          const d = distance(c.regionId, g.regionId) + distance(c.regionId, col.regionId);
          if (d < mieux) { mieux = d; vend = c; }
        }
        if (vend && vend.regionId !== g.regionId) {
          if (!(g.ordre.type === 'voyage' && g.ordre.dest === vend.regionId)) {
            partir(state, g, vend.regionId, 'acheter de quoi tenir parole');
          }
          return;
        }
      }
    }
  }

  // Sans promesse en cours, un bienfaiteur rentre voir ses gens : c'est là que
  // naîtront les demandes qu'il pourra honorer, et là que l'estime s'accumule.
  if (BIENFAITEUR && !memo.promesse && memo.paroisse != null && rations > 60) {
    const par = colonieParId(state.world, memo.paroisse);
    if (!par || par.ruine) {
      memo.paroisse = null;
    } else if (distance(par.regionId, g.regionId) > RAYON_PAROISSE) {
      if (!(g.ordre.type === 'voyage' && g.ordre.dest === par.regionId)) {
        partir(state, g, par.regionId, 'retourner voir ses gens');
      }
      return;
    }
  }

  // --- Porter. Une cargaison qu'on promène ne rapporte rien : elle pèse, elle
  // immobilise la mise, et le prix qu'on visait bouge pendant qu'on marche.
  if (MARCHAND && memo.affaire && rations > 50) {
    const dest = colonieParId(state.world, memo.affaire.destId);
    if (!dest || dest.ruine) {
      memo.affaire = null;
      TRACE.affairesPerdues++;
    } else if (dest.regionId !== g.regionId) {
      if (!(g.ordre.type === 'voyage' && g.ordre.dest === dest.regionId)) {
        partir(state, g, dest.regionId, 'porter la cargaison');
      }
      return;
    }
  }

  // Ce qu'on a signé passe avant ce qu'on ramasse au hasard.
  if (rations > 60) {
    const dest = destinationContrat(state, g);
    if (dest != null) { partir(state, g, dest, 'honorer un contrat'); return; }
  }

  // Courtiser. Tant qu'on n'est au service de personne, on va chez celui qu'on
  // vise : c'est là qu'on trouve ses contrats, ses gens à obliger, et son
  // bureau de recrutement. Sans ce déplacement, « courtiser » se réduisait à
  // trier les contrats du panneau où l'on se trouvait déjà — c'est-à-dire à
  // rien, puisqu'une ville n'affiche presque que les siens.
  if (!SANS.has('service') && memo.visee && !g.allegeance && rations > 60
      && state.temps < REPLI_H) {
    // Une ville, choisie une fois pour toutes, et l'on travaille autour.
    //
    // La première version repartait vers « la ville des siens la plus proche »
    // à chaque fois qu'elle n'avait rien de mieux à faire : le bot passait sa
    // partie sur les routes, remplissait deux contrats au lieu de trois et
    // s'engageait moins souvent qu'avant qu'on lui apprenne à choisir. On
    // courtise un endroit, pas un drapeau en général.
    //
    // Villes non découvertes comprises : c'est de l'omniscience, et elle est
    // assumée. Sans elle, courtiser dépend de la loterie de l'exploration — un
    // drapeau dont aucune ville n'est levée n'est jamais approché, et l'on
    // mesure l'exploration en croyant mesurer l'allégeance.
    if (memo.chezEux === undefined) {
      const sienne = state.world.colonies
        .filter((c) => !c.ruine && c.faction === memo.visee)
        .sort((a, b) => distance(a.regionId, g.regionId) - distance(b.regionId, g.regionId))[0];
      memo.chezEux = sienne ? sienne.regionId : null;
    }
    if (memo.chezEux != null && distance(memo.chezEux, g.regionId) > 3
        && !(g.ordre.type === 'voyage' && g.ordre.dest === memo.chezEux)) {
      partir(state, g, memo.chezEux, 'courtiser un drapeau');
      return;
    }
  }

  // Une promesse tenue en main se livre : on ne garde pas dans son sac ce que
  // quelqu'un attend.
  if (memo.promesse && rations > 60
      && (g.inventaire[memo.promesse.res] || 0) >= memo.promesse.quantite) {
    const col = colonieParId(state.world, memo.promesse.colId);
    if (col && !col.ruine && col.regionId !== g.regionId) {
      donnerOrdre(state, { type: 'voyage', dest: col.regionId }, g);
      return;
    }
  }

  // Un colon ne vagabonde pas : une fois le camp planté, on travaille dans son
  // rayon. Sans ça le bot dérivait à quinze secteurs de chez lui et n'y
  // remettait plus les pieds de la partie.
  if (!SANS.has('base') && state.base.fonde
      && distance(g.regionId, state.base.regionId) > 5 && rations > 60) {
    const proche = state.world.regions
      .filter((r) => r.decouvert && !r.colonie && distance(r.i, state.base.regionId) <= 3)
      .sort((a, b) => scoreNourriture(state, b.i) - scoreNourriture(state, a.i))[0];
    if (proche && g.ordre.type !== 'voyage') {
      partir(state, g, proche.i, 'revenir dans le rayon du camp');
      return;
    }
  }

  // On ne laisse pas les réserves tomber au plus bas avant de réagir : à 30
  // rations il est déjà trop tard si le biome ne nourrit personne.
  if (rations < 90) {
    const ici = scoreNourriture(state, g.regionId);
    let mieux = null;
    for (const r of state.world.regions) {
      if (distance(r.i, g.regionId) > 2 || !r.decouvert) continue;
      const sc = scoreNourriture(state, r.i);
      if (sc > ici * 1.6 && (!mieux || sc > scoreNourriture(state, mieux.i))) mieux = r;
    }
    if (mieux) { partir(state, g, mieux.i, 'chercher à manger'); return; }
    if (g.ordre.type !== 'chasse') donnerOrdre(state, { type: 'chasse' }, g);
    return;
  }

  // --- S'entraîner. Le banc n'avait jamais fait donner un seul ordre
  // d'entraînement : le bot finissait à cinq de compétence de combat après
  // quatre mille heures, et toutes les mesures sur les raids et les pertes
  // portaient donc sur des gens qui n'avaient jamais tenu une arme.
  //
  // On s'entraîne quand on peut se le permettre : à l'abri, le ventre plein, et
  // tant qu'on est faible. Un vétéran retourne travailler.
  const combat = vivants.length
    ? vivants.reduce((a, c) => a + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / vivants.length
    : 0;
  // On s'entraîne au combat, et à rien d'autre : la première version montait
  // l'endurance tant que le combat était sous quatorze, donc n'atteignait jamais
  // quatorze de combat. Le bot est resté à cinq de compétence, comme avant.
  if (combat < 26 && rations > 150 && !collecteUrgente(state)
      && vivants.every((c) => pvTotal(c).pct > 0.7)) {
    if (g.ordre.type !== 'entrainement') {
      donnerOrdre(state, { type: 'entrainement', skill: 'melee' }, g);
    }
    return;
  }

  // Ce qu'on ne surveille pas s'en va de toute façon, et parfois en emportant
  // quelque chose. Un joueur avisé relâche plutôt que de se le faire prendre —
  // un négrier, lui, préfère perdre quelques têtes en route que de les rendre.
  while (!NEGRIER && surveillanceManquante(g) > 0) {
    const gens = prisonniersDe(g);
    if (!gens.length) break;
    disposer(state, g, gens[gens.length - 1].id, 'relacher', () => {});
    TRACE.relaches++;
  }

  // --- Tenir son secteur. Un gradé en répond tous les dix jours, guerre ou
  // pas : c'est la seule chose qu'un Lieutenant puisse faire de sa charge quand
  // sa faction est en paix, et c'est donc la seule qui le fasse monter.
  const monSecteur = g.allegeance && g.allegeance.secteur;
  if (monSecteur && !collecteUrgente(state) && rations > 60) {
    const etat = etatSecteur(state.world, monSecteur);
    if (etat > SEUIL_MERITE * 1.2) {
      const pire = pireCase(state.world, monSecteur);
      if (pire && pire.i !== g.regionId && (pire.insecurite || 0) > 0.3) {
        if (g.ordre.type !== 'voyage' || g.ordre.dest !== pire.i) {
          donnerOrdre(state, { type: 'voyage', dest: pire.i }, g);
        }
        return;
      }
      if (dansSonSecteur(g)) {
        if (g.ordre.type !== 'patrouille') donnerOrdre(state, { type: 'patrouille' }, g);
        return;
      }
    }
  }

  // Une collecte en cours dicte comment on récolte : extraire pour du minerai,
  // fouiller pour le reste. Récolter au hasard ne remplit jamais un contrat.
  const collecte = p.contrats.find((c) => c.type === 'collecte' && !progresContrat(state, c).pret);
  const voulu = collecte
    && ['minerai', 'ferraille', 'alliage', 'isotope'].includes(collecte.ressource) ? 'mine' : 'fouille';
  if (g.ordre.type !== voulu) donnerOrdre(state, { type: voulu }, g);
}

/**
 * L'éclaireur : une personne détachée qui lève la carte. Il rentre dès qu'il
 * manque de vivres ou qu'il est amoché — un homme seul ne gagne aucun combat.
 */
function jouerEclaireur(state, g, memo) {
  const principal = groupes(state).find((x) => x.id !== g.id && x.membres.some(estVivant));
  const rations = g.inventaire.rations || 0;
  const amoche = g.membres.some((c) => !estDebout(c) || pvTotal(c).pct < 0.65);

  if (!principal) { memo.eclaireur = null; return; }

  // Retour au bercail : on rejoint, puis on se refond dans le groupe.
  if (rations < 25 || amoche) {
    if (g.regionId === principal.regionId) {
      fusionner(state, principal, g);
      memo.eclaireur = null;
      return;
    }
    if (g.ordre.type !== 'voyage' || g.ordre.dest !== principal.regionId) {
      donnerOrdre(state, { type: 'voyage', dest: principal.regionId }, g);
    }
    return;
  }
  if (g.ordre.type === 'voyage') return;

  // Sinon : lever le noir. On vise la région inconnue la plus proche.
  let cible = null;
  let best = Infinity;
  for (const r of state.world.regions) {
    if (r.decouvert) continue;
    const d = distance(r.i, g.regionId);
    if (d < best) { best = d; cible = r; }
  }
  if (cible && best > 1) { donnerOrdre(state, { type: 'voyage', dest: cible.i }, g); return; }
  if (g.ordre.type !== 'exploration') donnerOrdre(state, { type: 'exploration' }, g);
}

/**
 * Détacher un éclaireur quand on peut se le permettre : quatre bras debout, de
 * quoi manger des deux côtés, et de la carte à lever. C'est le pari que le banc
 * doit trancher — un homme seul rapporte-t-il plus qu'il ne coûte ?
 */
function envisagerDetachement(state, memo) {
  if (SANS.has('detach')) return;
  if (memo.eclaireur) return;
  // Plus de plafond : on se limite à ce qu'on peut joindre, comme un joueur.
  if (groupes(state).length >= 3) return;
  const g = groupes(state)[0];
  if (!g) return;
  const debout = g.membres.filter(estDebout);
  if (debout.length < 3) return;
  if ((g.inventaire.rations || 0) < 140) return;
  if (g.ordre.type === 'voyage') return;
  if (!state.world.regions.some((r) => !r.decouvert)) return;

  // On envoie le plus discret : c'est lui qui survit le mieux seul.
  const choisi = debout.reduce((a, b) => (comp(b, 'furtivite') > comp(a, 'furtivite') ? b : a));
  const rng = new Rng(state.rngState);
  const r = scinder(state, g, [choisi.id], rng);
  state.rngState = rng.save();
  if (r.ok) memo.eclaireur = r.groupe.id;
}

/** Raccourci lisible : l'avant-poste du joueur. */
function S_base(state) { return state.base; }

/**
 * La posture n'avait jamais bougé de « neutre » depuis la création du banc,
 * alors que c'est le seul réglage qui décide si l'on évite ou si l'on encaisse.
 * Un joueur la change selon ce qu'il vaut ce jour-là.
 */
function choisirPosture(state) {
  const gens = tousLesMembres(state).filter(estVivant);
  if (!gens.length) return;
  const debout = gens.filter(estDebout);
  const combat = gens.reduce((a, c) => a + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / gens.length;
  const entier = debout.length === gens.length
    && gens.every((c) => pvTotal(c).pct > 0.75);
  let veut = 'neutre';
  if (!entier || combat < 16) veut = 'prudent';
  else if (combat > 34 && debout.length >= 3) veut = 'agressif';
  // Un négrier ne peut pas être prudent : la prudence coupe un tiers des
  // rencontres et esquive quatre hostiles sur dix avant qu'on ait vu à qui l'on
  // avait affaire. C'est cohérent pour qui veut rentrer entier, et ruineux pour
  // qui vit de ce qu'il ramène vivant.
  if (NEGRIER && entier) veut = 'agressif';
  if (state.player.posture !== veut) state.player.posture = veut;
}

function jouer(state, memo) {
  choisirPosture(state);
  const principal = groupes(state).find((x) => x.id !== memo.eclaireur && x.membres.some(estVivant));
  if (!SANS.has('base') && principal) tenirAvantPoste(state, principal, memo);
  for (const g of groupes(state).slice()) {
    if (!g.membres.some(estVivant)) continue;
    if (g.id === memo.eclaireur) jouerEclaireur(state, g, memo);
    else jouerPrincipal(state, g, memo);
  }
  envisagerDetachement(state, memo);
}

const MOTIFS = {};
function partir(state, g, dest, motif) {
  // Un colon ne va pas au bout du monde chercher un contrat : ce qu'il bâtit
  // demande qu'on soit là. On l'autorise à s'éloigner de cinq cases, pas plus,
  // sauf pour rentrer chez lui.
  if (COLON && state.base.fonde && motif !== 'rentrer au camp'
      && distance(dest, state.base.regionId) > RAYON_COLON) {
    return partir(state, g, state.base.regionId, 'rentrer au camp');
  }
  const r = donnerOrdre(state, { type: 'voyage', dest }, g);
  if (r.ok) MOTIFS[motif] = (MOTIFS[motif] || 0) + 1;
  return r;
}

/**
 * Ce qu'un carriériste fait de son ordre de mission — et pourquoi il faut un
 * bot pour ça.
 *
 * Mesuré sur le bot par défaut, sur trente parties : ravitaillement 21 %
 * honoré, frappe 3 %, reconnaissance 69 %. Les deux premiers échouent pour la
 * même raison, et ce n'est pas que l'ordre soit trop dur : c'est que le bot
 * attend qu'il se réalise pendant qu'il vit sa vie. Un ravitaillement, ça
 * s'achète et ça se porte — l'ordre paie deux fois le prix du marché, l'aller
 * simple est déjà rentable. Une frappe, ça se trouve : les bandes d'une faction
 * ne sortent que sur les cases qu'elle contrôle.
 *
 * Retourne vrai quand l'ordre a pris le tour.
 */
function servirOrdre(state, g, memo, rations) {
  const o = g.allegeance && g.allegeance.ordre;
  // Le ventre d'abord : un engagé mort ne monte plus en grade.
  if (!o || rations <= 30) return false;
  // Aller ailleurs sans relancer le voyage à chaque tour. C'est exactement ce
  // qui manquait à la première version : elle redonnait l'ordre de marche
  // toutes les quatre heures, remettait la route à zéro, et le carriériste
  // passait 62 % de son temps à marcher sans jamais arriver nulle part.
  const allerA = (dest, motif) => {
    if (dest == null || dest === g.regionId) return false;
    if (g.ordre.type === 'voyage' && g.ordre.dest === dest) return true;
    return partir(state, g, dest, motif).ok;
  };

  if (o.type === 'reconnaissance') {
    if (state.world.regions[o.regionId].decouvert) return false;
    return allerA(o.regionId, 'ordre de mission');
  }

  if (o.type === 'ravitaillement') {
    const col = colonieParId(state.world, o.colonieId);
    if (!col || col.ruine) return false;
    const enMain = Math.floor(g.inventaire[o.ressource] || 0);
    if (enMain >= o.quantite) return allerA(col.regionId, 'livrer un ordre');
    // Il manque de la marchandise : on va la chercher là où il y en a. La ville
    // à ravitailler en manque par définition, donc jamais chez elle.
    memo.achatOrdre = { res: o.ressource, qte: o.quantite };
    const manque = o.quantite - enMain;
    let vend = null;
    let mieux = Infinity;
    for (const c of state.world.colonies) {
      if (c.ruine || c.id === col.id) continue;
      if ((c.stock[o.ressource] || 0) < manque * 0.7) continue;
      // On paie la marchandise, puis la route jusqu'à la ville en peine : c'est
      // le total qui décide, pas la ville la plus proche de nous.
      const d = distance(c.regionId, g.regionId) + distance(c.regionId, col.regionId);
      if (d < mieux) { mieux = d; vend = c; }
    }
    if (!vend) return false;
    return allerA(vend.regionId, 'acheter de quoi ravitailler');
  }

  if (o.type === 'frappe') {
    // On ne croise les hommes d'une faction que chez elle : le bot par défaut
    // honorait une frappe sur quarante parce qu'il attendait la rencontre au
    // lieu d'aller la provoquer.
    const ici = state.world.regions[g.regionId];
    if (ici.controle === o.cibleFaction && !ici.colonie) {
      if (g.ordre.type !== 'patrouille') donnerOrdre(state, { type: 'patrouille' }, g);
      return true;
    }
    // Pas la ville : la campagne autour. On se fait quatre fois moins attaquer
    // sous les murs d'une colonie qu'à une case de là, et la première version
    // campait justement sur la place du marché ennemi — deux mille tours de
    // patrouille pour trois frappes honorées sur trente-huit.
    const chez = state.world.regions
      .filter((r) => r.controle === o.cibleFaction && r.decouvert && !r.colonie)
      .sort((a, b) => distance(a.i, g.regionId) - distance(b.i, g.regionId))[0];
    return chez ? allerA(chez.i, 'aller chercher l’ennemi') : false;
  }
  return false;
}

const NECRO = { causes: {}, skills: [], kills: [], vivants: [], endurance: [], anciens: [] };

console.log(`Banc d'équilibrage — ${PARTIES} parties × ${HEURES} h\n${'='.repeat(52)}`);

let survivants = 0;
const lignes = [];
for (let n = 0; n < PARTIES; n++) {
  // Départ en ville, contrairement au jeu, qui commence désormais dans le
  // désert sans que personne vous connaisse. Le banc mesure des trajectoires sur
  // trente parties et compare des règles entre elles : une ouverture stable lui
  // évite de confondre un changement de règle avec un mauvais tirage de départ.
  // La contrepartie est connue et assumée — il ne mesure pas les premières
  // heures telles que le joueur les vit.
  const state = nouvellePartie(1000 + n * 7919, { maintenant: 0, depart: 'ville' });
  state.player.posture = 'neutre';
  if (process.env.CAMP === '1') {
    // On plante le camp sur la première case vide à portée, avec de quoi le
    // payer. Ce n'est pas une partie normale : c'est l'expérience qui isole la
    // valeur de l'avant-poste de la difficulté à s'en offrir un.
    const g0 = groupes(state)[0];
    const vide = state.world.regions.find(
      (r) => !r.colonie && distance(r.i, g0.regionId) <= 2
    ) || state.world.regions.find((r) => !r.colonie);
    const dep = g0.regionId;
    g0.regionId = vide.i;
    for (const k of Object.keys(COUT_FONDATION)) {
      g0.inventaire[k] = (g0.inventaire[k] || 0) + COUT_FONDATION[k];
    }
    fonderBase(state, () => {}, g0);
    g0.regionId = dep;
  }
  // Mémoire du bot : hors de l'état de jeu, donc rien à sérialiser.
  if (SANS.has('lois')) state.sansLois = true;
  if (SANS.has('preleve')) state.sansPreleve = true;
  if (SANS.has('pistes')) state.world.sansPistes = true;
  // SANS=erosion : levier mort depuis L4 (MEMOIRE.md) — l'érosion n'existe plus.
  // Le drapeau qu'on courtise cette partie-ci. Tiré sur un générateur à part,
  // pas sur celui du monde : sinon changer le tirage décalerait toute la
  // simulation et l'on comparerait deux mondes différents en croyant comparer
  // deux stratégies.
  const rngVise = new Rng(4242 + n * 131);
  const visee = VISE || rngVise.pick(DIPLO_FACTIONS);
  TRACE.vises[visee] = (TRACE.vises[visee] || 0) + 1;
  const memo = { origine: new Map(), eclaireur: null, detachements: 0, courtisee: visee, services: 0,
    promesse: null, viseFondation: false, fonde: null, routeFondation: null,
    prochaineCharge: 0, ordresDonnes: 0, visee, estimeVisee: 0 };
  for (const g of groupes(state)) {
    for (const c of g.membres) {
      memo.origine.set(c.id, {
        eff: Math.max(comp(c, 'melee'), comp(c, 'tir')),
        brut: Math.max(c.skills.melee, c.skills.tir),
      });
    }
  }
  let groupesMax = 1;
  for (let i = 0; i < HEURES; i++) {
    if (state.fin) break;
    if (i % 4 === 0) {
      const avant = groupes(state).length;
      jouer(state, memo);
      if (groupes(state).length > avant) memo.detachements++;
      groupesMax = Math.max(groupesMax, groupes(state).length);
    }
    // Instrumentation : à quoi passe-t-on ses heures, et où part l'argent ?
    const gPrinc = groupes(state)[0];
    if (gPrinc) {
      const t = gPrinc.ordre.type;
      TRACE[t === 'voyage' ? 'voyage' : t === 'repos' ? 'repos' : 'travail']++;
    }
    for (const gg of groupes(state)) if (gg.allegeance) TRACE.hEngage++;
    for (const gg of groupes(state)) if (gg.ordre.type === 'patrouille') TRACE.hPatrouille++;
    const crAvant = soldeIci(state);
    const defAvant = state.stats.defaites;
    const captifsAvant = groupes(state).reduce((t, x) => t + prisonniersDe(x).length, 0);
    // Les ordres de mission naissent et meurent pendant le tick : on relève
    // l'ordre en cours de chaque colonne avant, et l'on regarde ce qu'il est
    // devenu après. Un ordre disparu sans manque compté est un ordre honoré.
    const ordresAvant = new Map();
    for (const gg of groupes(state)) {
      if (gg.allegeance) {
        ordresAvant.set(gg.id, { o: gg.allegeance.ordre, m: gg.allegeance.manques || 0 });
      }
    }
    // Le trafic réel, heure par heure : une caravane n'occupe une région que
    // deux heures, et le bot ne joue qu'un tour sur quatre — il en manque la
    // moitié par construction. On compte donc ici, pas dans `jouer`.
    {
      const vues = memo.carVues || (memo.carVues = new Set());
      for (const car of state.world.caravanes || []) {
        if (!vues.has(car.id)) { vues.add(car.id); TRACE.caravanesNees++; }
        const gg = groupes(state)[0];
        if (gg && car.regionId === gg.regionId) TRACE.passagesGuet++;
      }
    }
    const remplisAvant = state.stats.ordresRemplis || 0;
    tick(state);
    // Le sommet de l'estime chez celui qu'on courtise, pas sa valeur finale :
    // l'érosion rabote tout, et lire le chiffre du dernier jour dirait « 9 »
    // d'une partie où l'on est monté à 38. Ce qu'on veut savoir, c'est si le
    // seuil a été touché, une fois, à un moment.
    memo.estimeVisee = Math.max(memo.estimeVisee, state.player.reputation[memo.visee] || 0);
    // Le chronomètre du pardon : à l'heure du repentir on relève l'ardoise —
    // chaque faction en négatif — puis on note l'heure où chacune repasse les
    // deux seuils qui comptent : −25, où leurs hommes cessent de sortir du
    // bois (events.js), et 0, l'ardoise effacée.
    if (REPENTIR && !memo.ardoise && state.temps >= REPENTIR) {
      memo.ardoise = new Map();
      for (const k of Object.keys(state.player.reputation)) {
        const v = state.player.reputation[k];
        if (v < 0) memo.ardoise.set(k, { depart: v, sortie: v > -25 ? 0 : null, zero: null });
      }
    }
    if (memo.ardoise) {
      for (const [k, a] of memo.ardoise) {
        if (a.zero !== null) continue;
        const v = state.player.reputation[k] || 0;
        if (a.sortie === null && v > -25) a.sortie = state.temps - REPENTIR;
        if (v >= 0) a.zero = state.temps - REPENTIR;
      }
    }
    // Un panneau fermé se rouvre : le compter en fin de partie ne mesure que
    // l'oubli, pas la sanction. On échantillonne une fois par jour de jeu.
    if (state.temps % 24 === 0) {
      for (const c of state.world.colonies) {
        if (c.ruine) continue;
        TRACE.joursPanneau += 1;
        if (!faveurChef(c).ouvert) TRACE.joursPanneauFerme += 1;
      }
    }
    let credit = (state.stats.ordresRemplis || 0) - remplisAvant;
    for (const gg of groupes(state)) {
      if (!gg.allegeance) continue;
      const av = ordresAvant.get(gg.id);
      const ap = gg.allegeance.ordre;
      if (ap && (!av || !av.o || av.o.id !== ap.id)) {
        TRACE.recus[ap.type] = (TRACE.recus[ap.type] || 0) + 1;
      }
      if (!av || !av.o || (ap && ap.id === av.o.id)) continue;
      const t = av.o.type;
      if ((gg.allegeance.manques || 0) > av.m) {
        // Raté : l'échéance est passée. Rien à compter de plus, le total des
        // manques est déjà relevé en fin de partie.
      } else if (credit > 0) {
        credit--;
        TRACE.faits[t] = (TRACE.faits[t] || 0) + 1;
      } else {
        // Ni honoré ni raté : l'ordre a été retiré, la guerre s'étant arrêtée.
        TRACE.annules[t] = (TRACE.annules[t] || 0) + 1;
      }
    }
    const captifsApres = groupes(state).reduce((t, x) => t + prisonniersDe(x).length, 0);
    if (captifsApres > captifsAvant) TRACE.captures += captifsApres - captifsAvant;
    for (const gg of groupes(state)) {
      for (const c of gg.membres) {
        if (c.etat === 'ko' && !c._koVu) { c._koVu = true; TRACE.koSubis++; }
        if (c.etat !== 'ko' && c._koVu) c._koVu = false;
      }
    }
    if (state.stats.defaites > defAvant) {
      TRACE.defaites += state.stats.defaites - defAvant;
      TRACE.crPilles += Math.max(0, crAvant - soldeIci(state));
    }
  }
  if (process.env.NECRO) {
    // Les anciens : ceux qui étaient là au premier jour et qui y sont encore.
    // C'est la seule façon de savoir si un personnage progresse, la moyenne de
    // l'escouade étant dominée par les recrues fraîches.
    for (const c of tousLesMembres(state).filter(estVivant)) {
      if (!memo.origine || !memo.origine.has(c.id)) continue;
      NECRO.anciens.push({
        combat: Math.max(comp(c, 'melee'), comp(c, 'tir')),
        brut: Math.max(c.skills.melee, c.skills.tir),
        depart: memo.origine.get(c.id).eff,
        departBrut: memo.origine.get(c.id).brut,
        corps: pvTotal(c).pct,
        faim: c.faim,
        moral: c.moral,
        fatigue: c.fatigue,
      });
    }
    for (const m of state.memorial || []) {
      const c = String(m.cause).replace(/face à .*/, 'face à une bande');
      NECRO.causes[c] = (NECRO.causes[c] || 0) + 1;
      NECRO.skills.push(Number(String(m.meilleure).split(' ').pop()) || 0);
      NECRO.kills.push(m.horsCombat || 0);
    }
    for (const c of tousLesMembres(state).filter(estVivant)) {
      NECRO.vivants.push(Math.max(comp(c, 'melee'), comp(c, 'tir')));
      NECRO.endurance.push(comp(c, 'endurance'));
    }
  }
  const viv = tousLesMembres(state).filter(estVivant);
  if (!state.fin) survivants++;
  const skills = viv.length
    ? Math.round(viv.reduce((s, c) => s + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / viv.length)
    : 0;
  TRACE.ordresDonnes += memo.ordresDonnes;
  {
    // Les routes que la partie a fini par tracer, là où l'on est passé.
    const vues = state.world.regions.filter((r) => r.decouvert);
    TRACE.piste += vues.reduce((a, r) => a + (r.piste || 0), 0) / Math.max(1, vues.length);
    TRACE.pisteVues++;
  }
  {
    // Le marché aux hommes existe-t-il seulement ? Aucune faction ne démarre
    // esclavagiste : c'est une loi qu'un conseil ouvre quand la caisse est vide.
    // Les villes libres, elles, l'ouvrent toujours — faute de loi du tout.
    const vivantes = state.world.colonies.filter((c) => !c.ruine);
    TRACE.villesVues += vivantes.length;
    TRACE.marchesVus += vivantes.filter((c) => acheteDesHommes(state, c)).length;
    const pudiques = Object.keys(state.world.factions).filter(
      (k) => k !== 'essaim' && !loisDe(state.world, k).esclavage
    );
    // Le dossier tient les comptes : on les relit plutôt que de compter à côté.
    const b = state.player.bilanContrats;
    if (b) {
      TRACE.contratsEchus += b.echus || 0;
      TRACE.contratsRemplis += b.honores || 0;
    }
    for (const k of Object.keys(state.stats.echusParType || {})) {
      TRACE.echusParType[k] = (TRACE.echusParType[k] || 0) + state.stats.echusParType[k];
    }
    for (const k of Object.keys(state.stats.echusParVille || {})) {
      TRACE.echusParVille.set(`${state.seed}:${k}`, state.stats.echusParVille[k]);
    }
    TRACE.mepris += pudiques.reduce(
      (a, k) => a + (state.player.reputation[k] || 0), 0) / Math.max(1, pudiques.length);
    // Un contrat manqué fâche le chef qui l'avait affiché. On a soupçonné cette
    // sanction de fermer tous les panneaux de la carte : on compte, plutôt que
    // d'en débattre.
    for (const c of vivantes) {
      TRACE.villesFin.push({ ouvert: faveurChef(c).ouvert, opinion: estime(c, 'chef') });
    }
  }
  {
    // L'invariant comptable, à la fin d'une partie où un joueur a commercé.
    for (const e of auditer(state.world)) {
      TRACE.pireEcart = Math.max(TRACE.pireEcart, Math.abs(e.ecart));
    }
  }
  {
    // Ce que la partie a fait du joueur. Un titre qu'aucune partie ne décroche
    // est un titre décoratif : la chronique doit se lire sur ce qui arrive.
    const t = titreDe(state).nom;
    TRACE.titres[t] = (TRACE.titres[t] || 0) + 1;
  }
  {
    // Ce que le système de services laisse derrière lui, sur les gens eux-mêmes.
    for (const c of state.world.colonies) {
      for (const n of c.notables || []) {
        TRACE.opinionFin += n.opinion || 0;
        TRACE.nNotables++;
      }
    }
  }
  if (state.base.colonieId) TRACE.reconnus++;
  TRACE.popCamp += state.base.pop || 0;
  TRACE.marchands += state.base.marchands || 0;
  {
    const v = state.world.colonies.filter((c) => !c.ruine);
    TRACE.libres += v.filter((c) => !c.faction).length;
    TRACE.grogne += v.reduce((a, c) => a + (c.unrest || 0), 0) / Math.max(1, v.length);
    TRACE.revoltes += state.journal.filter((x) => x.type === 'revolte').length;
    TRACE.renverses += state.journal.filter(
      (x) => x.type === 'dirigeant' && /renversé/.test(x.texte)).length;
  }
  for (const k of Object.keys(state.world.factions)) {
    if (k === 'essaim') continue;
    if (!state.world.colonies.some((c) => !c.ruine && c.faction === k)) continue;
    const l = loisDe(state.world, k);
    const imp = IMPOTS.find((x) => Math.abs(x.taux - l.impot) < 0.001);
    TRACE.impots[imp ? imp.nom : '?'] = (TRACE.impots[imp ? imp.nom : '?'] || 0) + 1;
    TRACE.peines[l.peine] = (TRACE.peines[l.peine] || 0) + 1;
    if (l.esclavage) TRACE.esclavagistes++;
    TRACE.factionsVues++;
  }
  for (const gg of groupes(state)) {
    if (!gg.allegeance || !gg.allegeance.secteur) continue;
    TRACE.secteurs++;
    TRACE.etatSecteur += etatSecteur(state.world, gg.allegeance.secteur);
    TRACE.bilans += gg.allegeance.secteur.bilans || 0;
  }
  for (const gg of groupes(state)) {
    if (!gg.allegeance) continue;
    TRACE.pointsFin += gg.allegeance.points;
    TRACE.manques += gg.allegeance.manques || 0;
    TRACE.rangs[rangDe(gg.allegeance).index]++;
  }
  // Jusqu'où l'on est monté chez celui qu'on visait, et si personne n'a fini
  // par nous prendre. Un drapeau visé trente fois et servi zéro fois est un
  // drapeau qui n'existe pas, quels que soient ses avantages sur le papier.
  {
    const st = FACTIONS[memo.visee].style;
    TRACE.estimeVisee[st] = (TRACE.estimeVisee[st] || 0) + memo.estimeVisee;
    TRACE.nVisee[st] = (TRACE.nVisee[st] || 0) + 1;
    if (!groupes(state).some((gg) => gg.allegeance)) TRACE.jamais += 1;
  }
  // L'ardoise du repenti, une entrée par faction fâchée. `null` veut dire
  // « la partie s'est finie sans repasser ce seuil » — c'est une donnée, pas
  // un trou : c'est elle qui dirait que la sortie d'hostilité est morte.
  if (memo.ardoise) {
    for (const [, a] of memo.ardoise) {
      TRACE.rachats.push({ depart: a.depart, sortie: a.sortie, zero: a.zero });
    }
  }
  lignes.push({
    seed: 1000 + n * 7919,
    t: state.temps,
    fin: state.fin || '—',
    viv: `${viv.length}/${tousLesMembres(state).length}`,
    detach: memo.detachements,
    cr: soldeIci(state),
    wl: `${state.stats.combatsGagnes}/${state.stats.defaites}`,
    recolte: state.stats.recolte,
    comp: skills,
    contrats: state.stats.contratsRemplis || 0,
    grade: groupeActif(state).allegeance ? rangDe(groupeActif(state).allegeance).def.nom.slice(0, 9) : '—',
    ordres: state.stats.ordresRemplis || 0,
    guerres: state.world.guerres.length,
    captures: state.world.colonies.reduce((t, c) => t + (c.prises || 0), 0),
    services: memo.services,
    bati: state.base.fonde
      ? BUILDING_KEYS.reduce((t, k) => t + nivBat(state.base, k), 0) : 0,
    hab: state.base.fonde ? Math.round(state.base.pop || 0) : 0,
    // Les grandeurs que la chronique relit, pour pouvoir calibrer ses seuils
    // sur ce qui arrive vraiment plutôt que sur une intuition.
    gagnes: state.stats.combatsGagnes || 0,
    livres: state.stats.captifsLivres || 0,
    vendus: state.stats.captifsVendus || 0,
    servis: state.stats.servicesRendus || 0,
    pilles: state.stats.caravanesPillees || 0,
    // Ce que l'estime a effectivement ouvert, à la fin de la partie.
    amis: state.world.colonies.reduce(
      (t, c) => t + (c.notables || []).filter((x) => (x.opinion || 0) >= 35).length, 0),
  });
}

const largeur = { seed: 8, t: 6, fin: 11, viv: 5, cr: 7, wl: 7, comp: 5, contrats: 9, detach: 7, grade: 10, ordres: 7, guerres: 8, captures: 9, services: 9, amis: 5, bati: 5, hab: 4 };
const entetes = Object.keys(largeur);
console.log(entetes.map((k) => k.padStart(largeur[k])).join(' '));
for (const l of lignes) {
  console.log(entetes.map((k) => String(l[k]).padStart(largeur[k])).join(' '));
}

console.log('='.repeat(52));
console.log(`Escouades encore vivantes après ${HEURES} h : ${survivants}/${PARTIES}`);
const moy = (k) => Math.round(lignes.reduce((s, l) => s + (typeof l[k] === 'number' ? l[k] : 0), 0) / lignes.length);
console.log(`Crédits moyens : ${moy('cr')} — compétence de combat moyenne : ${moy('comp')}`);
console.log(`Récolte moyenne : ${moy('recolte')} unités — contrats remplis : ${moy('contrats')}`);
const gradés = lignes.filter((l) => l.grade !== '—').length;
console.log(`Détachements : ${moy('detach')} par partie — parties avec allégeance : ${gradés}/${PARTIES}`);
console.log(`Colonies prises et reprises dans le monde : ${moy('captures')} en moyenne`);
const fondes = lignes.filter((l) => l.bati > 0).length;
console.log(`Avant-postes fondés : ${fondes}/${PARTIES} — `
  + `${moy('bati')} niveaux de bâtiment et ${moy('hab')} habitants en moyenne`);
console.log(`Services rendus : ${moy('services')} par partie — `
  + `gens acquis (estime ≥ 35) : ${moy('amis')} en fin de partie`);
console.log(`Demandes distinctes croisées : ${TRACE.demandesVues} — `
  + `${TRACE.demandesPromises} adoptées, `
  + `${lignes.reduce((t, l) => t + l.services, 0)} honorées, `
  + `${TRACE.demandesPerdues} promesses mortes en route, `
  + `${TRACE.demandesLourdes} vues trop lourdes pour le sac`);
console.log(`  opinion moyenne des notables : `
  + `${(TRACE.opinionFin / Math.max(1, TRACE.nNotables)).toFixed(1)}`);
console.log(`  compléter le lot : ${TRACE.achatsTentes} tentatives — ${TRACE.achatsFaits} achats, `
  + `${TRACE.achatsChers} refusés trop chers, ${TRACE.achatsPauvre} faute de crédits`);
console.log('  coût moyen d’un lot : ' + Object.keys(TRACE.nLot).sort().map((k) =>
  `${k} ${Math.round(TRACE.coutLot[k] / TRACE.nLot[k])} cr (prime ${Math.round(TRACE.primeLot[k] / TRACE.nLot[k])})`
).join(' · ') + ` — bourse moyenne à cet instant ${Math.round(TRACE.bourse / Math.max(1, TRACE.nBourse))} cr`);
console.log(`Voyages entrepris vers une ville déjà morte : ${TRACE.voyagesPerdus}`);
const totH = TRACE.voyage + TRACE.repos + TRACE.travail;
const totMotifs = Object.values(MOTIFS).reduce((a, b) => a + b, 0) || 1;
console.log('Départs par motif : ' + Object.entries(MOTIFS).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${Math.round(100 * v / totMotifs)} %`).join(' · ')
  + ` (${Math.round(totMotifs / PARTIES)} départs par partie)`);
console.log(`Temps : ${Math.round(100 * TRACE.voyage / totH)} % en marche · `
  + `${Math.round(100 * TRACE.repos / totH)} % au repos · ${Math.round(100 * TRACE.travail / totH)} % au travail`);
console.log(`Recrues engagées : ${(TRACE.recrues / PARTIES).toFixed(1)} par partie`);
console.log(`Intendance : ${Math.round(TRACE.rationsTouchees / PARTIES)} rations touchées par partie`
  + ` — bêtes achetées : ${(TRACE.betes / PARTIES).toFixed(1)} par partie`);
console.log(`Invariant comptable, joueur compris : écart maximal `
  + `${TRACE.pireEcart < 1e-6 ? 'exact' : TRACE.pireEcart.toFixed(2)}`);
console.log('Change : '
  + `${(100 * TRACE.bourseEtrangere / Math.max(1, TRACE.bourseTotale)).toFixed(1)} % `
  + 'de la bourse dans une monnaie qui n’a pas cours là où l’on est · '
  + `${TRACE.bloquesChange} achat(s) refusés faute d’avoir la bonne monnaie, `
  + `${TRACE.changesFaits} passage(s) au bureau`);
console.log('  quand le change ne se fait pas : '
  + Object.entries(TRACE.pasDeChange).filter(([, v]) => v)
    .map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`Argent : +${Math.round(TRACE.gagneVente / PARTIES)} de ventes · `
  + `−${Math.round(TRACE.payeVivres / PARTIES)} de vivres · −${Math.round(TRACE.payeSoins / PARTIES)} de soins `
  + `· −${Math.round(TRACE.payeMateriel / PARTIES)} d'équipement `
  + `· −${Math.round(TRACE.crPilles / PARTIES)} pillés, par partie`);
// Ce qu'une parole non tenue ferme réellement. On l'a soupçonné de tout fermer :
// on compte, plutôt que d'en débattre.
{
  let fermes = 0;
  let ouverts = 0;
  let pire = 0;
  for (const col of TRACE.villesFin) {
    if (col.ouvert) ouverts += 1; else fermes += 1;
    pire = Math.min(pire, col.opinion);
  }
  const tot = Math.max(1, fermes + ouverts);
  // Compté en fin de partie, ce chiffre ne mesure que l'oubli : un panneau
  // fermé se rouvre en une dizaine de jours. Le vrai instrument est la ligne
  // suivante, échantillonnée chaque jour. On garde les deux : leur écart est
  // précisément ce qu'on avait pris pour une absence de sanction.
  console.log(`Panneaux d'affichage en fin de partie : ${fermes} fermés sur ${tot}`
    + ` (${Math.round(100 * fermes / tot)} %) — chef le plus fâché : ${Math.round(pire)}`);
  // Sans savoir combien de contrats le bot rate, le chiffre du dessus ne prouve
  // rien : zéro panneau fermé par un bot qui n'échoue jamais ne dit rien de la
  // sanction. « Ce qu'un bot ne joue pas, personne ne le mesure. »
  console.log(`  contrats pris : ${(TRACE.contratsPris / PARTIES).toFixed(1)} par partie —`
    + ` ${(TRACE.contratsEchus / PARTIES).toFixed(1)} échus,`
    + ` ${(TRACE.contratsRemplis / PARTIES).toFixed(1)} remplis`);
  const parType = Object.keys(TRACE.echusParType).sort(
    (a, b) => TRACE.echusParType[b] - TRACE.echusParType[a]);
  console.log(`  échus par type : ${parType.map(
    (k) => `${k} ${(TRACE.echusParType[k] / PARTIES).toFixed(1)}`).join(' · ') || 'aucun'}`);
  // 80 % d'échec et zéro panneau fermé : l'un des deux chiffres ment. Ou les
  // manquements se dispersent entre villes, ou la sanction s'efface plus vite
  // qu'on ne la reçoit. On regarde les deux.
  const parVille = [...TRACE.echusParVille.values()].sort((a, b) => b - a);
  console.log(`  panneaux fermés au fil du temps : ${
    (100 * TRACE.joursPanneauFerme / Math.max(1, TRACE.joursPanneau)).toFixed(2)
  } % des jours-ville — mesuré chaque jour, pas seulement à la fin`);
  console.log(`  manquements dans la même ville : pire ${parVille[0] || 0}`
    + ` · médiane ${parVille[Math.floor(parVille.length / 2)] || 0}`
    + ` · villes touchées ${parVille.length}`
    + ` · il en faut ${Math.ceil(40 / OPINION_ECHU)} pour fermer un panneau`);
}
console.log(`Retenue des régimes : ${Math.round(TRACE.retenu / PARTIES)} cr par partie`
  + ` — ${(100 * TRACE.retenu / Math.max(1, TRACE.gagneVente + TRACE.retenu)).toFixed(1)} %`
  + ' de ce que les ventes auraient rapporté sans elle');
console.log(`Carrière : ${Math.round(TRACE.hEngage / PARTIES)} h sous les couleurs par partie · `
  + `${Math.round(TRACE.pointsFin / Math.max(1, gradés))} points en fin de service · `
  + `${(TRACE.manques / Math.max(1, gradés)).toFixed(1)} ordre(s) manqué(s) par engagé`);
console.log('Ordres de mission par type — '
  + ['ravitaillement', 'frappe', 'reconnaissance'].map((t) => {
    const r = TRACE.recus[t] || 0;
    const f = TRACE.faits[t] || 0;
    const a = TRACE.annules[t] || 0;
    const d = r - a; // ce qui restait à honorer
    return `${t} ${f}/${d}${d ? ` (${Math.round(100 * f / d)} %)` : ''}`
      + `${a ? ` +${a} annulé${a > 1 ? 's' : ''}` : ''}`;
  }).join(' · '));
console.log(`Prérogatives exercées : ${(TRACE.ordresDonnes / PARTIES).toFixed(1)} par partie`);
TRACE.victoires = lignes.reduce((t, l) => t + Number(String(l.wl).split('/')[0]), 0);
console.log(`  rafle : ${Math.round(TRACE.hPatrouille / PARTIES)} h de patrouille par partie, `
  + `${(TRACE.victoires / PARTIES).toFixed(1)} victoires, `
  + `${(TRACE.captures / Math.max(1, TRACE.victoires)).toFixed(2)} captif(s) par victoire`);
console.log(`Négoce : ${(TRACE.affairesPrises / PARTIES).toFixed(1)} cargaisons par partie — `
  + `${Math.round(TRACE.miseTotale / PARTIES)} cr engagés pour `
  + `${Math.round(TRACE.recetteTotale / PARTIES)} cr encaissés `
  + `(${TRACE.miseTotale ? Math.round(100 * (TRACE.recetteTotale - TRACE.miseTotale) / TRACE.miseTotale) : 0} % de marge), `
  + `${TRACE.affairesPerdues} villes mortes à l'arrivée`);
console.log(`  prix visé au départ : ${Math.round(TRACE.recetteEsperee / PARTIES)} cr par partie — `
  + `obtenu ${Math.round(TRACE.recetteTotale / PARTIES)} cr `
  + `(${TRACE.recetteEsperee ? Math.round(100 * TRACE.recetteTotale / TRACE.recetteEsperee) : 0} % de ce qu'on croyait)`
  + ` — relevés vieux de ${Math.round(TRACE.ageReleve / Math.max(1, TRACE.nReleve))} h en moyenne`);
console.log(`Caravanes : ${TRACE.caravanesVues} croisées sur la case — `
  + `${TRACE.caravanesPrises} prises pour ${Math.round(TRACE.butinCaravanes / PARTIES)} cr `
  + `de marchandise par partie, ${TRACE.caravanesRatees} embuscades repoussées `
  + `— ${Math.round(TRACE.hGuet * 4 / PARTIES)} h de guet par partie`);
console.log(`  circulation : ${Math.round(TRACE.caravanesNees / PARTIES)} caravanes par partie sur `
  + `la carte entière — ${(TRACE.passagesGuet / PARTIES).toFixed(1)} heures-caravane sur notre case`);
console.log(`  butin : ${TRACE.butinPorte} unités emportées, ${TRACE.butinLaisse} laissées `
  + `sur place faute de bras (${Math.round(100 * TRACE.butinLaisse
    / Math.max(1, TRACE.butinPorte + TRACE.butinLaisse))} %)`);
console.log(`Marché aux hommes : ${(TRACE.marchesVus / PARTIES).toFixed(1)} ville(s) sur `
  + `${(TRACE.villesVues / PARTIES).toFixed(0)} l'ouvrent en fin de partie — `
  + `${(TRACE.vendus / PARTIES).toFixed(1)} vendu(s) par partie, `
  + `${TRACE.sansMarche} tour(s) à ne savoir où les porter`);
console.log(`Estime moyenne en fin de partie : ${(TRACE.mepris / Math.max(1, PARTIES)).toFixed(0)} `
  + `sur les factions qui n'achètent pas d'hommes`);
console.log(`Nos morts : ${(TRACE.enterres / PARTIES).toFixed(1)} enterrés par partie, `
  + `${(TRACE.depouilles / PARTIES).toFixed(1)} dépouillés d'abord`);
console.log(`Prisonniers : ${(TRACE.captures / PARTIES).toFixed(1)} pris par partie — `
  + `${(TRACE.disposes / PARTIES).toFixed(1)} livrés ou rançonnés pour `
  + `${Math.round(TRACE.gagneCaptifs / PARTIES)} cr, ${(TRACE.relaches / PARTIES).toFixed(1)} relâchés faute de gardiens`);
const part = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${Math.round(100 * v / Math.max(1, TRACE.factionsVues))} %`).join(' · ');
console.log(`Lois votées par les conseils — impôt : ${part(TRACE.impots)}`);
console.log(`                              justice : ${part(TRACE.peines)}`
  + ` — esclavagistes : ${Math.round(100 * TRACE.esclavagistes / Math.max(1, TRACE.factionsVues))} %`);
console.log(`Grogne moyenne des villes : ${(TRACE.grogne / PARTIES).toFixed(2)} — `
  + `${(TRACE.libres / PARTIES).toFixed(1)} ville(s) affranchie(s) en fin de partie · `
  + `${(TRACE.revoltes / PARTIES).toFixed(1)} révolte(s) et `
  + `${(TRACE.renverses / PARTIES).toFixed(1)} renversement(s) encore au journal`);
console.log(`Secteurs tenus : ${TRACE.secteurs} — état moyen `
  + `${(TRACE.etatSecteur / Math.max(1, TRACE.secteurs)).toFixed(2)} `
  + `(0 = sûr, 1 = infréquentable) sur ${Math.round(TRACE.bilans / Math.max(1, TRACE.secteurs))} relevés`);
console.log(`Échelle atteinte : ${RANGS.map((r, i) => `${r.nom} ${TRACE.rangs[i]}`).join(' · ')}`);
{
  // Ce que vaut chaque drapeau, drapeau par drapeau. Trois colonnes et pas
  // une : combien de fois on l'a visé, combien de fois on a fini par le
  // servir, et jusqu'où l'estime est montée chez lui. Un seuil qu'on n'atteint
  // jamais ne se voit que dans la troisième.
  const styles = DIPLO_FACTIONS.map((k) => [k, FACTIONS[k]]);
  console.log('Les drapeaux — courtisé / servi (visé ou par repli) / sommet de l’estime :');
  for (const [k, f] of styles) {
    const vus = TRACE.vises[k] || 0;
    if (!vus) continue;
    const st = f.style;
    const n = TRACE.nVisee[st] || 0;
    const moy = n ? (TRACE.estimeVisee[st] || 0) / n : 0;
    const seuil = estimeEngagement(k);
    console.log(`  ${f.court.padEnd(6)} seuil ${String(seuil).padStart(2)} · `
      + `visé ${String(vus).padStart(2)} · servi ${String(TRACE.servis[st] || 0).padStart(2)} · `
      + `estime max ${moy.toFixed(0).padStart(3)}${moy >= seuil ? '' : '  ← hors d’atteinte'}`);
  }
  console.log(`  replis sur un autre drapeau : ${TRACE.replis} · `
    + `parties sans aucun engagement : ${TRACE.jamais}/${PARTIES}`);
}
if (REPENTIR && TRACE.rachats.length) {
  // Le pardon, chronométré. La médiane plutôt que la moyenne : une faction
  // jamais pardonnée d'ici la fin rendrait la moyenne infinie, et c'est
  // justement l'information — on la compte à part.
  const med = (a) => {
    const t = a.slice().sort((x, y) => x - y);
    return t.length ? t[Math.floor(t.length / 2)] : 0;
  };
  const r = TRACE.rachats;
  const fachees = r.length;
  const hostiles = r.filter((x) => x.depart <= -25);
  const sorties = hostiles.filter((x) => x.sortie !== null);
  const zeros = r.filter((x) => x.zero !== null);
  const departMoy = r.reduce((t, x) => t + x.depart, 0) / fachees;
  // La référence de la cible 2 : l'oubli d'hier rendait 0,45 point par jour.
  const hier = Math.abs(departMoy) / 0.45 * 24;
  console.log(`Le rachat du repenti (pillage jusqu'à ${REPENTIR} h) :`);
  console.log(`  ${fachees} ardoise(s) relevée(s) sur ${PARTIES} parties — `
    + `départ moyen ${departMoy.toFixed(0)}, pire ${Math.min(...r.map((x) => x.depart))}`);
  console.log(`  sortie d'hostilité (repasser −25) : ${sorties.length}/${hostiles.length} `
    + `y arrivent — médiane ${med(sorties.map((x) => x.sortie))} h`);
  console.log(`  ardoise effacée (repasser 0) : ${zeros.length}/${fachees} `
    + `y arrivent — médiane ${med(zeros.map((x) => x.zero))} h`);
  console.log(`  référence, l'oubli d'hier (0,45/jour) : ${Math.round(hier)} h `
    + `pour un départ de ${departMoy.toFixed(0)}`);
}
{
  // Calibrer les seuils de la chronique sur ce qui arrive vraiment, plutôt que
  // sur une intuition : c'est ce qui manquait quand « Bienfaiteur » demandait
  // douze services pour une médiane de trois.
  const q = (k) => {
    const a = lignes.map((l) => l[k]).sort((x, y) => x - y);
    const at = (f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];
    return `méd ${at(0.5)} · p90 ${at(0.9)} · max ${a[a.length - 1]}`;
  };
  console.log(`  ce que la chronique relit — victoires : ${q('gagnes')}`);
  console.log(`      captifs livrés : ${q('livres')} · vendus : ${q('vendus')}`);
  console.log(`      services : ${q('servis')} · caravanes pillées : ${q('pilles')}`);
}
console.log('Chronique : ' + Object.entries(TRACE.titres).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`Colporteurs reçus : ${(TRACE.marchands / PARTIES).toFixed(1)} par partie`);
console.log(`Avant-postes écrits sur les cartes : ${TRACE.reconnus}/${PARTIES} — `
  + `${(TRACE.popCamp / PARTIES).toFixed(1)} habitants en moyenne`);
console.log(`Pistes : ${(TRACE.piste / Math.max(1, TRACE.pisteVues)).toFixed(2)} de damage moyen `
  + `sur les cases connues (0 = friche vierge, 1 = route faite)`);
console.log(`Combat : ${(TRACE.koSubis / PARTIES).toFixed(1)} des nôtres mis à terre par partie`);
console.log(`Défaites : ${TRACE.defaites} pour ${TRACE.crPilles} cr pillés `
  + `(${TRACE.defaites ? Math.round(TRACE.crPilles / TRACE.defaites) : 0} cr par défaite)`);

if (process.env.NECRO) {
  const moy = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '—');
  console.log('--- nécrologie ---');
  console.log(Object.entries(NECRO.causes).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${k}`).join(' · '));
  console.log(`Meilleure compétence au moment de mourir : ${moy(NECRO.skills)}`
    + ` (max ${NECRO.skills.length ? Math.max(...NECRO.skills) : 0})`);
  console.log(`Mis hors de combat avant de tomber : ${moy(NECRO.kills)}`
    + ` (max ${NECRO.kills.length ? Math.max(...NECRO.kills) : 0})`);
  console.log(`Compétence de combat des survivants : ${moy(NECRO.vivants)}`
    + ` (max ${NECRO.vivants.length ? Math.max(...NECRO.vivants).toFixed(0) : 0})`);
  const anc = NECRO.anciens;
  console.log(`Anciens du premier jour encore vivants : ${anc.length} sur ${PARTIES * 3}`
    + (anc.length
      ? `\n   compétence brute  ${moy(anc.map((a) => a.departBrut))} → ${moy(anc.map((a) => a.brut))}`
        + `\n   compétence utile  ${moy(anc.map((a) => a.depart))} → ${moy(anc.map((a) => a.combat))}`
        + `\n   corps ${(100 * anc.reduce((x, a) => x + a.corps, 0) / anc.length).toFixed(0)} %`
        + ` · faim ${moy(anc.map((a) => a.faim))} · fatigue ${moy(anc.map((a) => a.fatigue))}`
        + ` · moral ${moy(anc.map((a) => a.moral))}`
      : ''));
  console.log(`Endurance des survivants : ${moy(NECRO.endurance)}`
    + ` (max ${NECRO.endurance.length ? Math.max(...NECRO.endurance).toFixed(0) : 0})`);
}

if (survivants === 0) {
  console.log('\nALERTE : aucune escouade ne survit. Le jeu est injouable en l’état.');
  process.exit(1);
}
