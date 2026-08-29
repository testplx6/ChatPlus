import {
  soldeIci, monnaieIci, monnaieSolde, valeurBourse, masse, coursMonnaie,
} from './monnaie.js';
// Interface : rendu HTML + carte pixel sur canvas. C'est le SEUL module qui
// touche au DOM — tout le reste du dossier src/ tourne aussi bien sous Node.

import {
  BIOMES, FACTIONS, DIPLO_FACTIONS, drapeauDe, diploDe, symboleDe, clesDe,
  COMMODITIES, COMMODITY_KEYS, BUILDINGS, BUILDING_KEYS,
  RESEARCH, RESEARCH_KEYS, ITEMS, SKILLS, SKILL_KEYS, BODY_PARTS, BODY_KEYS,
  POSTURES, POSTURE_KEYS, TRAITS, POI, CONTRATS, DIPLOMES, METIERS, METIER_KEYS,
  METIERS_VILLE, METIER_VILLE_KEYS,
  RECETTES_KEYS, ARRET, ENTREES,
} from './data.js';
import {
  nomRegion, lieuAvecCoord, colonieDe, colonieParId, coord, chemin, coutTraversee, distance,
  rendementRegion, amendementRegion,
} from './world.js';
import { resumeSauvegarde, EMPLACEMENTS_MAX } from './save.js';
import {
  ligneCours, resumeBourses, comptoirActif, TRESOR_BOURSE,
} from './bourse.js';
import {
  comp, pvTotal, etatCourt, estVivant, estDebout, ratio, peutEquiper,
  SEUIL_FAMINE, SEUIL_VENTRE_CREUX,
  relationsNotables, lien,
} from './characters.js';
import {
  prixJoueur, acheter, vendre, poidsInventaire, capacitePortage, meilleurCommercant,
  prixItem, acheterItem, vendreItem, actifs, emploi, simulerAchat, simulerVente,
  bureauDe, devisChange,
} from './economy.js';
import {
  populationMax, mainDoeuvre, placesMetier, affectes, manoeuvres, affecter,
  voulus, brasDisponibles, postesDegarnis,
  rendementMetier,
  niveau as nivBat, niveauRech, coutBatiment, tempsBatiment, coutRecherche,
  tempsRecherche, capaciteStock, totalStock, energie, lancerConstruction, POP_RECONNUE,
  peutReconnaitre, peutRattacher,
  lancerRecherche, annulerConstruction, fonderBase, deposer, retirer,
  COUT_FONDATION, manquePour, apportBatiment, chaineAutonomie, menacesSurLaBase,
  forceEscouade, AMENDABLES, AMENDEMENT_MAX, dechetsMax, recetteDe, recettesDe,
  brasEscouade, reserveDe, siegeEnCours, prixSiege, lancerFabrication, ATTELAGE,
  FORGE, coutForge, forgeables,
} from './base.js';
import { classement, enGuerre } from './factions.js';
import { titreDe, lignesDe } from './chronique.js';
import {
  infoChapitre, romain, texteFil, texteFilInacheve,
} from './histoire.js';
import { TACTIQUES, TACTIQUE_KEYS, apercuTactique } from './combat.js';
import {
  donnerOrdre, ORDRES, rendementPrevu, COMPETENCES_EXERCICE, PAR_LA_PRATIQUE,
  consommationGroupe, autonomie, apercuEscouade,
} from './squad.js';
import {
  progres as progresContrat, lieuValidation, accepter, abandonner, peutRendre, MAX_CONTRATS,
  gainEstime,
} from './contrats.js';
import {
  horloge, VITESSES, DEPARTS, DEPART_KEYS, DEPART_DEFAUT,
} from './sim.js';
import { lireRapport, rencontresDe } from './rapport.js';
import { conditions, SAISONS, METEO } from './climat.js';
import {
  RANGS, rangDe, estAuService, peutSEngager, avancementOrdre, REPUTATION_MINIMALE,
  serviceDe, avantage,
  bilanService, effetsEstime, palierEstime, estimeEngagement, ESTIME_ENGAGEMENT,
  droitIntendance, garnison, RANG_GARNISON, JOURS_INTENDANCE,
} from './allegeance.js';
import { caravanesIci, valeurCargaison } from './caravanes.js';
import { couleurLog, creerLogger } from './events.js';
import {
  ecolesDe, prixFormation, peutSInscrire, inscrire, abandonnerFormation,
  ecolesAvantPoste, peutApprendreChezSoi, enseignerChezSoi, LENTEUR_MAISON,
} from './formation.js';
import { CHARGES, CARACTERES, margeMarchand, vocation } from './notables.js';
import { demandesIci, souvenirs, faveurChef, SOINS_SEUIL, REGISTRES_SEUIL } from './services.js';
import { primeDe, apercu, tensionRecrutement, bancDerive } from './recrues.js';
import {
  prisonniersDe, capaciteGarde, surveillanceManquante, optionsPour,
  lenteurPrisonniers, geoleDe,
} from './justice.js';
import { depouillesDe, ritesPour, lenteurDepouilles } from './depouilles.js';
import {
  coffreDe, placeCoffre, peutLouer, peutAcheter,
  LOYER, PRIX_COFFRE, CAPACITE_LOUEE, CAPACITE_ACHETEE, ESTIME_PROPRIETE,
} from './coffres.js';
import {
  PEINES, PEINE_KEYS, IMPOTS, REGIMES, REGIME_KEYS, DIRECTEURS, loisDe, loiIci,
  DISCIPLINES,
} from './lois.js';
import { distanceMorale } from './factions.js';
import { detresse } from './credit.js';
import {
  resumeSecteur, casesDe, dansSonSecteur, motEtat, NIVEAU_ORDINAIRE,
  SEUIL_FAUTE, SEUIL_MERITE, RANG_SECTEUR,
} from './secteur.js';
import {
  PREROGATIVES, PREROGATIVE_KEYS, peutExercer, credit as creditInfluence, commandementDe,
  chargeAupres,
  peutOuvrirBourse, accordsPossibles, accordsRompables,
  colonnesDe, sitesFondation, cibleGuerre, guerresArretables, coutLevee,
  COUT_POSTE, FORCE_LEVEE, COUT_GARNISON, COUT_GRENIER, villeConfiee,
} from './influence.js';
import {
  BETES, BETE_KEYS, betesDe, prixBete, portageAttelage, lenteurAttelage,
  conduite, surnombre, visibiliteAttelage,
} from './betes.js';
import { dirigeant, TEMPERAMENTS, LEGITIMITE_CRITIQUE } from './dirigeants.js';
import {
  vueColonie, vueRegion, estSurveillee, ageTexte, nouvellesConnues, carnetPrix,
  vueArmee, armeesConnues,
} from './connaissance.js';
import {
  groupeActif, groupes, groupeParId, choisirGroupe, tousLesMembres, tacheDe,
  assignerTache, scinder, fusionner, fusionnablesAvec, porteeOrdres, joignable, repartition,
  TACHES_INDIVIDUELLES, noyau, plafondCohesion, rendementCohesion, placesSociables,
  vivants as vivantsDe,
} from './groupes.js';

// ---------------------------------------------------------------------------
// État local de l'interface
// ---------------------------------------------------------------------------

let S = null;
let ACTIONS = {};
let onglet = 'carte';
let selection = null;
let ouverts = new Set();
let filtreJournal = 'tout';
let modale = null;
let dernierRendu = -1;
/** Quel écran on a dessiné en dernier : voir la position de lecture. */
let dernierOngletRendu = null;
// Le dernier texte d'écran produit : on ne réécrit pas un DOM identique.
let dernierHtml = null;
// Idem pour la modale, qui a son propre défilement à préserver.
let dernierHtmlModale = null;
let dernierRenduMs = 0;
let derniereInteraction = 0;
let toastTimer = null;
/** Cases cochées dans le panneau « Détacher » — purement d'interface. */
let detaches = new Set();

/** Cadence minimale entre deux reconstructions complètes de l'écran (ms). */
const RENDU_MIN_MS = 600;
/** Ce qu'a coûté le dernier rendu, lissé. Sert de frein sur machine lente. */
let coutRendu = 0;
/**
 * Et le même coût, écran par écran. « Un rendu coûte 9 ms », dit le
 * propriétaire, « mais la base c'est très long, plusieurs secondes » : les deux
 * sont vrais, et un chiffre moyen ne le montre pas. Chacun se lit dans le
 * panneau, sur l'appareil qui peine — le seul juge qui compte.
 */
const coutParEcran = {};
/**
 * Et le coût des gros blocs, un par un. « base 3048 ms » sur le téléphone du
 * propriétaire, quand mon banc en annonce deux cents : sa partie contient
 * quelque chose que la mienne n'a pas, et deviner a assez duré. Deux appels à
 * l'horloge par bloc, c'est gratuit ; le panneau les rend lisibles.
 */
const coutParBloc = {};
/** La pesée de la partie, calculée seulement quand on la demande. */
let pesee = null;

function chrono(nom, fn) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const html = fn();
  const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  coutParBloc[nom] = Math.max(coutParBloc[nom] || 0, Math.round(t1 - t0));
  return html;
}
/** Après un geste de l'utilisateur, on laisse le DOM tranquille un instant. */
const REPIT_APRES_CLIC_MS = 400;

const $ = (sel) => document.querySelector(sel);

/**
 * Le groupe que l'écran montre. Presque tout l'affichage est relatif à lui :
 * la carte, le sac, l'étal, l'avant-poste. Changer de groupe change de point
 * de vue, pas de partie.
 */
const G = () => groupeActif(S);

export function attacherEtat(state) {
  S = state;
  selection = state ? groupeActif(state).regionId : null;
  // Les grands moments (M2) ne se mettent en scène que pour ce qui arrive en
  // jouant : tout ce qui précède l'attache est de l'histoire, pas un moment.
  momentDepuis = state ? state.temps : 0;
  fermerMoment();
}

export function monterUI(api) {
  ACTIONS = api;
  $('#ecran').addEventListener('click', surClic);
  $('#barre-nav').addEventListener('click', surClic);
  $('#barre-haut').addEventListener('click', surClic);
  $('#modale').addEventListener('click', surClic);
  document.addEventListener('toggle', (ev) => {
    const d = ev.target.closest('details[data-id]');
    if (!d) return;
    if (d.open) ouverts.add(d.dataset.id);
    else ouverts.delete(d.dataset.id);
  }, true);
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function e(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Un compte accordé : pl(3, 'ville') → « 3 villes ». Trente écrans écrivaient
 * « ville(s) » alors que les drapeaux, eux, savent s'accorder depuis
 * toujours. Le pluriel français commence à 2 — « 1,5 jour », « 2 jours ».
 */
function pl(v, un, des = `${un}s`) {
  return `${n(v)} ${v >= 2 ? des : un}`;
}

// Les formateurs de nombres, gardés. `toLocaleString` en refabrique un à
// chaque appel — et un écran en appelle des milliers. Mesuré au profileur sur
// un aller-retour BASE/CARTE, processeur bridé huit fois : 287 ms passés là,
// deuxième poste du jeu entier. Même sortie, au caractère près.
const FORMATS_NOMBRE = new Map();

function n(v, dec = 0) {
  if (!Number.isFinite(v)) return '—';
  let f = FORMATS_NOMBRE.get(dec);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    FORMATS_NOMBRE.set(dec, f);
  }
  return f.format(v);
}

/**
 * Le signe de la monnaie qu'on affiche. Sans argument : celle du lieu où l'on
 * est. Avec un drapeau : la sienne — le trésor d'un pays, la solde d'un
 * employeur, le cours d'une bourse ne sont pas dans la monnaie d'ici.
 *
 * ECONOMIE §10 : « Tout prix s'écrit dans la seule monnaie du lieu, avec le
 * symbole propre à la faction. Rien entre parenthèses. » Le « cr » qui traînait
 * à cinquante et un endroits de cet écran était le dernier vestige du crédit
 * universel : il faisait croire que la somme affichée dans une ville valait
 * autant que la même somme dans la ville d'à côté.
 */
function sym(cle) {
  if (!S) return '¤';
  return symboleDe(S.world, cle === undefined ? monnaieIci(S) : cle);
}

function jauge(pct, cls = '', couleur) {
  const p = Math.max(0, Math.min(100, pct * 100));
  const st = `width:${p.toFixed(0)}%` + (couleur ? `;background:${couleur}` : '');
  return `<div class="jauge ${cls}"><i style="${st}"></i></div>`;
}

function toast(msg, err) {
  // Une file, pas un remplacement (ALLURE.md, Q2) : deux nouvelles rapprochées
  // s'empilent au lieu de s'écraser — et jamais par-dessus le contenu.
  let file = document.getElementById('toasts');
  if (!file) {
    file = document.createElement('div');
    file.id = 'toasts';
    document.body.appendChild(file);
  }
  while (file.children.length >= 3) file.firstChild.remove();
  const d = document.createElement('div');
  d.className = 'toast' + (err ? ' err' : '');
  d.textContent = msg;
  file.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

function logger() {
  return creerLogger(S);
}

function coutTexte(cout) {
  return Object.keys(cout)
    .map((k) => `${n(cout[k])} ${k === 'credits' ? 'cr' : COMMODITIES[k].nom.toLowerCase()}`)
    .join(' · ');
}

function dureeTexte(h) {
  if (h < 24) return `${Math.ceil(h)} h`;
  const j = Math.floor(h / 24);
  const r = Math.ceil(h % 24);
  return r ? `${j} j ${r} h` : `${j} j`;
}

function couleurFaction(k) {
  return (drapeauDe(S.world, k) && drapeauDe(S.world, k).couleur) || '#7b8699';
}

// ---------------------------------------------------------------------------
// Garder sa place en lisant
// ---------------------------------------------------------------------------
//
// L'écran se reconstruit d'un bloc plusieurs fois par seconde, et l'on rendait
// ensuite au conteneur son `scrollTop` d'avant. Ça paraît suffisant ; ça ne
// l'est pas, parce qu'**un nombre de pixels n'est pas une position de lecture**.
// Dès qu'un encart au-dessus du point de lecture change de hauteur — une alerte
// qui apparaît, un convoi qui s'ajoute, une nouvelle ligne au journal — les
// mêmes sept cents pixels ne désignent plus le même texte, et l'on se retrouve
// ailleurs sans avoir touché à rien.
//
// Mesuré, seize relevés par écran à ×60 : sur la carte, le défilement bougeait
// quinze fois sur seize ; au journal il ne bougeait pas d'un pixel mais le texte
// lu changeait quatorze fois sur seize, parce que le fil défile sous vous.
//
// On mémorise donc *ce qu'on lisait*, et on le remet là où il était.

/**
 * L'identité d'un encart, stable d'un rendu à l'autre : son titre, débarrassé
 * de tout ce qui porte des valeurs qui bougent.
 */
function cleUnique(vus, cle) {
  const n = (vus.get(cle) || 0) + 1;
  vus.set(cle, n);
  return n > 1 ? `${cle}#${n}` : cle;
}

/**
 * De quoi nommer un encart qui n'a pas de titre — et surtout, pas par son rang.
 *
 * Le rang était le repli d'origine, et il tient tant que rien ne s'insère
 * au-dessus. Le bandeau de dévaluation du lot E5, lui, apparaît en tête de
 * **tous** les écrans dès qu'une monnaie qu'on détient s'effondre : le jour où
 * il se lève, tous les encarts sans titre changent de nom d'un coup et l'ancre
 * de défilement ne les retrouve plus.
 *
 * **Trouvé en cherchant autre chose, et corrigé pour lui-même.** Le décor qui
 * avait mis sur cette piste — « ce qu'on lit reste sous les yeux » — accusait
 * en fait l'ancre à tort : `scrollTop` valait 746 aux huit relevés, rien
 * n'avait bougé, c'était la ligne lue qui gagnait une clause. Ce défaut-ci est
 * donc réel mais latent : aucune mesure ne l'attrape aujourd'hui, et il faut le
 * dire plutôt que de laisser croire qu'un test le garde.
 *
 * L'identifiant ou les classes ne bougent pas, eux : `carte-boite`, `legende`,
 * `carte-pied` sont les mêmes à tous les rendus, quoi qu'on insère au-dessus.
 */
function cleSansTitre(sec, i) {
  if (sec.id) return `#${sec.id}`;
  const cls = sec.getAttribute && sec.getAttribute('class');
  if (cls) return `.${cls.trim().split(/\s+/).join('.')}`;
  return `s${i}`;
}

function cleSection(sec, i) {
  const h = sec.querySelector('h2.titre');
  if (!h) return cleSansTitre(sec, i);
  const c = h.cloneNode(true);
  // Tout ce qui porte des valeurs qui bougent : la partie droite, les puces, et
  // le résumé de barre repliée. Oublier ce dernier faisait changer la clé d'un
  // encart chaque fois que son résumé changeait — donc le pli ne tenait plus, et
  // l'ancre de défilement cherchait un encart qui n'existait pas sous ce nom.
  for (const d of c.querySelectorAll('.droite, .puce, .resume')) d.remove();
  return c.textContent.trim().slice(0, 48) || cleSansTitre(sec, i);
}

/** Position d'un élément dans le conteneur défilant, en pixels depuis le haut. */
function dansEcran(ecran, el) {
  return el.getBoundingClientRect().top - ecran.getBoundingClientRect().top + ecran.scrollTop;
}

/**
 * Ce qu'on est en train de lire : le premier élément identifiable dont le bas
 * dépasse encore le haut de la fenêtre, et de combien il la dépasse.
 */
function mesurerAncre(ecran) {
  const top = ecran.scrollTop;
  if (top <= 0) return null;
  const secs = ecran.children;
  const vus = new Map();
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const cle = cleUnique(vus, cleSection(s, i));
    const y = dansEcran(ecran, s);
    if (y + s.offsetHeight <= top) continue;
    // Dans l'encart, l'élément porteur d'ancre le plus haut encore visible —
    // c'est ce qui sauve le journal, où c'est le contenu de l'encart qui glisse
    // et pas l'encart.
    for (const it of s.querySelectorAll('[data-ancre]')) {
      const yi = dansEcran(ecran, it);
      if (yi + it.offsetHeight > top) return { cle: `${cle}|${it.dataset.ancre}`, delta: top - yi };
    }
    return { cle, delta: top - y };
  }
  return null;
}

/**
 * Et on la remet où elle était.
 *
 * Une limite qu'il vaut mieux connaître : quand on lisait tout en bas et qu'un
 * encart apparaît au-dessus, garder le texte immobile demanderait de défiler
 * au-delà de la fin du document. Le navigateur borne, et le texte descend
 * quand même. Rien à y faire sans allonger artificiellement la page, ce qui
 * serait pire. Vu à l'instrument : ancre calculée à 937 px, appliquée à 841,
 * qui était le maximum possible.
 */
function restaurerAncre(ecran, a, dejaEnHaut) {
  // Écrire `scrollTop` force le navigateur à mettre en page tout ce qu'on
  // vient de poser, sur-le-champ. Quand l'écran d'avant était déjà en haut —
  // le cas ordinaire d'un changement d'onglet — il n'y a rien à remonter, et
  // ce forçage coûtait à lui seul cent à cent quatre-vingts millisecondes par
  // ouverture d'écran sur un téléphone.
  if (!a) { if (!dejaEnHaut) ecran.scrollTop = 0; return; }
  const [cleSec, cleItem] = a.cle.split('|');
  const secs = ecran.children;
  const vus = new Map();
  for (let i = 0; i < secs.length; i++) {
    if (cleUnique(vus, cleSection(secs[i], i)) !== cleSec) continue;
    if (cleItem === undefined) { ecran.scrollTop = dansEcran(ecran, secs[i]) + a.delta; return; }
    const it = secs[i].querySelector(`[data-ancre="${CSS.escape(cleItem)}"]`);
    if (it) { ecran.scrollTop = dansEcran(ecran, it) + a.delta; return; }
    // L'élément a disparu — une entrée chassée du journal, par exemple. On se
    // rabat sur l'encart, ce qui vaut mieux que de remonter tout en haut.
    ecran.scrollTop = dansEcran(ecran, secs[i]) + a.delta;
    return;
  }
  // L'encart lui-même n'existe plus : on ne devine pas, on laisse en place.
}

// ---------------------------------------------------------------------------
// Replier ce qu'on ne lit pas
// ---------------------------------------------------------------------------
//
// Certains encarts sont très longs — la liste d'une escouade de vingt-cinq
// personnes tient sur plusieurs écrans, et il faut la traverser chaque fois
// qu'on veut ce qui se trouve dessous. On les replie donc, et le pli tient d'une
// session à l'autre.
//
// Fait ici plutôt que dans les trente gabarits : chaque encart de premier niveau
// porte déjà un titre, et ce titre est déjà l'identité stable dont l'ancre de
// défilement se sert. Un seul endroit sait replier, et il ne peut pas oublier un
// encart écrit demain.

const CLE_REPLIS = 'cendres.replis.v1';
let replis = null;

// Ce qui naît replié (refonte, avis du game master) : les réglages qu'on touche
// une fois par partie et les fiches d'ambiance. Leur barre de titre dit
// l'essentiel ; l'écran s'ouvre sur les gens et sur ce qui se décide. Le jeu
// de `replis` mémorise alors l'écart au défaut, pas l'état absolu — déplier un
// encart né plié est un choix qui tient, sans migration de sauvegarde.
const DEFAUT_PLIE = new Set([
  'Posture', 'Tactique', 'Consignes permanentes', 'Détacher', 'Mémorial',
  'Position', 'Contrats en cours', 'Comment ça marche',
  'Climat', 'Villes connues', 'Chronique',
]);

function chargerReplis() {
  if (replis) return replis;
  replis = new Set();
  try {
    const brut = localStorage.getItem(CLE_REPLIS);
    if (brut) for (const c of JSON.parse(brut)) replis.add(c);
  } catch { /* un stockage refusé ne doit pas empêcher de jouer */ }
  return replis;
}

function noterReplis() {
  try {
    localStorage.setItem(CLE_REPLIS, JSON.stringify([...chargerReplis()]));
  } catch { /* idem */ }
}

/** Replie ou déplie un encart, et s'en souvient. */
export function basculerRepli(cle) {
  const r = chargerReplis();
  if (r.has(cle)) r.delete(cle);
  else r.add(cle);
  noterReplis();
}

/**
 * Rend chaque titre d'encart cliquable, et cache le contenu de ceux qu'on a
 * repliés. Le canevas de la carte est laissé tranquille : le replier reviendrait
 * à cacher la carte, ce que personne ne cherche à faire depuis son titre.
 */
function appliquerReplis(ecran) {
  const r = chargerReplis();
  const secs = ecran.children;
  // Deux encarts peuvent porter le même titre — l'écran Escouade en a deux qui
  // s'appellent « Cohésion de Convoi ». Sans ce compteur, replier l'un replierait
  // l'autre, et l'ancre de défilement se tromperait de cible.
  const vus = new Map();
  // Le canevas repéré une fois : `s.querySelector('#carte')` fouillait le
  // sous-arbre de chaque encart, deux fois et demie par seconde, pour une
  // réponse qui ne change pas.
  const carte = ecran.querySelector('#carte');
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const h = s.querySelector(':scope > h2.titre');
    if (!h || (carte && s.contains(carte))) continue;
    const cle = cleUnique(vus, cleSection(s, i));
    s.classList.add('pliable');
    h.setAttribute('data-a', 'plier');
    h.setAttribute('data-k', cle);
    h.setAttribute('role', 'button');
    h.setAttribute('tabindex', '0');
    const plie = r.has(cle) !== DEFAUT_PLIE.has(cle);
    s.classList.toggle('plie', plie);
    h.setAttribute('aria-expanded', plie ? 'false' : 'true');
  }
}

// ---------------------------------------------------------------------------
// Rendu principal
// ---------------------------------------------------------------------------

/** L'empreinte de ce que la carte montre, au dernier dessin. */
let derniereSignatureCarte = '';
/** La part de cette empreinte qui doit se voir sur-le-champ. */
/**
 * Combien de fiches d'escouade on pose d'un coup, et par combien on avance.
 *
 * Mesuré sur une partie de mille deux cents personnes — celle du propriétaire,
 * reproduite au banc : la galerie complète posait cent soixante-dix-huit mille
 * éléments et coûtait douze secondes à l'ouverture, puis quatre de plus pour
 * les détruire en quittant l'écran. Une escouade se mène, elle ne se feuillette
 * pas d'un bloc.
 */
const PAS_ESCOUADE = 24;
/** Combien de fiches d'escouade sont posées en ce moment. */
let montresEscouade = PAS_ESCOUADE;

let dernierVifCarte = '';
/** Quand la carte a été dessinée pour la dernière fois. */
let derniereCarteMs = 0;
/** La cadence de la carte : elle raconte un monde lent, pas un jeu d'action. */
const CARTE_PAS_MS = 500;
/** La même cadence, en mode allégé : la carte attend plus longtemps. */
const CARTE_PAS_ALLEGE_MS = 1600;

/**
 * Tout ce qui décide de l'image de la carte : le terrain (lui-même gardé),
 * l'heure — dont dépendent la nuit, la saison, les convois, les colonnes —, ce
 * qu'on a sélectionné, où sont les groupes, et le zoom.
 */
function signatureCarte() {
  const emp = empreinteTerrain(S.world);
  const gs = groupes(S).map((g) => `${g.id}:${g.regionId}`).join(',');
  return `${emp.dur}|${emp.doux}|${S.temps}|${selection}|${CELL}|${gs}`;
}

// Un encart replié fabrique quand même son contenu, masqué par une classe.
// Ne poser que son titre a été essayé, mesuré et RETIRÉ : quatre-vingts
// éléments de moins sur l'écran le plus lourd, aucune milliseconde gagnée, et
// trois sondes au rouge — ce qui est replié doit rester LÀ, lisible par la
// recherche du navigateur et par le jeu lui-même. Le vrai coût était ailleurs
// (le formateur de nombres, la mise en page forcée).

/** Les blocs de premier rang du dernier écran écrit, tels qu'on les a produits. */
let dernierBlocs = [];

/**
 * Poser l'écran en ne remplaçant QUE les blocs qui ont changé.
 *
 * Réécrire `innerHTML` en entier ne coûte pas seulement l'analyse du texte :
 * le navigateur jette puis refait la mise en page et la peinture de tout ce
 * qu'il y avait — quelques millisecondes ici, cent de plus sur un téléphone.
 * Mesuré au profileur : le code du clic tenait en 45 ms, mais l'image
 * n'arrivait qu'à 110-190 ms. C'est cette moitié-là que le doigt sent, et
 * c'est celle que mes premières sondes ne voyaient pas — elles s'arrêtaient
 * au retour du gestionnaire.
 *
 * Or presque rien ne change d'un rendu à l'autre : un bouton d'ordre qui
 * s'enfonce, un chiffre qui bouge. On compare donc bloc à bloc, tel qu'on les
 * a produits — jamais en relisant le DOM vivant, qui normalise ce qu'on lui
 * donne et ferait passer chaque bloc pour modifié.
 */
function poserEcran(ecran, html, memeEcran) {
  const gabarit = poserEcran.gabarit || (poserEcran.gabarit = document.createElement('div'));
  gabarit.innerHTML = html;
  const neufs = [...gabarit.children];
  const blocs = neufs.map((el) => el.outerHTML);
  const vieux = [...ecran.children];
  // Même écran, même découpe : on ne touche qu'aux blocs qui diffèrent.
  const memeDecoupe = memeEcran
    && vieux.length === neufs.length
    && dernierBlocs.length === neufs.length
    && vieux.every((el, i) => el.tagName === neufs[i].tagName);
  if (!memeDecoupe) {
    ecran.innerHTML = '';
    for (const el of neufs) ecran.appendChild(el);
    dernierBlocs = blocs;
    return;
  }
  for (let i = 0; i < neufs.length; i++) {
    if (blocs[i] === dernierBlocs[i]) continue;
    ecran.replaceChild(neufs[i], vieux[i]);
  }
  dernierBlocs = blocs;
}

export function rafraichir(force) {
  // Sans partie en cours, on redessine l'accueil — mais avec ce qu'il savait
  // déjà. Rappeler `rendreAccueil()` sans arguments effaçait le bouton
  // « Reprendre » à la première action faite depuis l'accueil.
  if (!S) { rendreAccueil(derniereSauvegarde, dernierePerimee); return; }
  const maintenant = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (!force) {
    if (S.temps === dernierRendu) return;
    // On reconstruit tout l'écran d'un bloc : à vitesse ×16 cela arriverait
    // plusieurs fois par seconde et pourrait avaler le geste de l'utilisateur.
    // Le budget du rendu, mesuré sur la machine qui joue. Reconstruire l'écran
    // coûte ce qu'il coûte ici — quelques millisecondes sur un ordinateur, dix
    // fois plus sur un téléphone — et le monde, lui, avance à la même vitesse.
    // Sans ce frein, une machine lente passait le plus clair de son temps à se
    // redessiner : « toujours beaucoup de lag ». On ne redessine jamais plus
    // d'un cinquième du temps.
    if (maintenant - dernierRenduMs < Math.max(RENDU_MIN_MS, coutRendu * 5)) return;
    if (maintenant - derniereInteraction < REPIT_APRES_CLIC_MS) return;
  }
  dernierRendu = S.temps;
  dernierRenduMs = maintenant;

  const ecran = $('#ecran');
  // On garde la position de lecture quand on redessine *le même* écran — à ×16
  // le rendu se refait plusieurs fois par seconde, et sans ça on remonterait en
  // haut de page en permanence. Mais on ne la garde pas d'un écran à l'autre :
  // arriver sur la carte défilé à trois cents pixels du haut n'a aucun sens, et
  // c'est ce qui se produisait en sortant d'un accueil devenu plus long — la
  // carte apparaissait hors de vue, et les gestes tombaient dans le vide.
  const memeEcran = onglet === dernierOngletRendu;
  dernierOngletRendu = onglet;

  // Un chronomètre par phase, éteint par défaut : on ne devine pas où part le
  // temps d'un rendu, on le mesure — sur la machine qui peine, pas sur la
  // mienne. `window.__mesureRendu = true` l'allume, `window.__phases` le lit.
  const chrono = (typeof window !== 'undefined' && window.__mesureRendu)
    ? (() => {
      const t = [];
      let dernier = maintenant;
      return {
        pas(nom) {
          const n2 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          t.push([nom, n2 - dernier]);
          dernier = n2;
        },
        fin() {
          if (!window.__phases) window.__phases = [];
          window.__phases.push(t);
        },
      };
    })()
    : null;

  rendreBarreHaut();
  rendreNav();
  majMoments();
  if (chrono) chrono.pas('chrome');

  // Un écran qui plante ne doit pas se contenter de ne rien faire.
  //
  // `onglet` était déjà changé, puis le rendu jetait, et l'exception remontait
  // hors du gestionnaire de clic : la barre de navigation ne bougeait même pas.
  // Vu de l'écran, appuyer sur BASE n'avait aucun effet — pas un message, pas
  // une trace, rien à raconter. Une partie entière a été jouée avec un onglet
  // mort sans qu'on puisse dire pourquoi. Désormais l'écran affiche sa propre
  // panne, et le reste du jeu continue de tourner.
  const rendu = {
    carte: ecranCarte,
    escouade: ecranEscouade,
    base: ecranBase,
    contrats: ecranContrats,
    monde: ecranMonde,
    journal: ecranJournal,
  }[onglet] || ecranCarte;
  // Rien n'a changé dans le texte de l'écran : on ne touche pas au DOM. Réécrire
  // un écran identique coûte un scintillement, casse une sélection de texte en
  // cours, et sur téléphone interrompt l'inertie du défilement — pour rien.
  //
  // On ne sort pas de la fonction pour autant : la carte est un canevas, elle
  // bouge même quand le texte autour ne bouge pas.
  let ecrit = true;
  let ancre = null;
  let boitePreservee = false;
  // Lu AVANT toute écriture dans le DOM : à ce moment-là, rien n'est en
  // attente, et la lecture ne coûte rien.
  const defilementAvant = ecran.scrollTop;
  try {
    const html = bandeauSauvegarde() + bandeauDevaluation() + bandeauSiege() + rendu();
    if (chrono) chrono.pas('texte');
    if (html === dernierHtml && memeEcran) { ecrit = false; boitePreservee = true; }
    else {
      // Mesurer la place de lecture force le navigateur à calculer toute la
      // mise en page sur-le-champ. On ne le fait donc qu'une fois qu'on SAIT
      // que l'écran change — sur un téléphone, c'était le premier poste du
      // clic, payé même quand rien ne bougeait.
      ancre = memeEcran ? mesurerAncre(ecran) : null;
      dernierHtml = html;
      // Le défilement horizontal du dock survit à la réécriture : à ×60
      // l'écran se réécrit plusieurs fois par seconde, et les boutons
      // revenaient à la position de départ sous le doigt (« quand le tick
      // passe, les boutons reviennent à la position par défaut » — le
      // propriétaire). L'ancre, plus bas, ne garde que la lecture verticale.
      const dockAvant = document.getElementById('dock-ordres');
      const defilDock = dockAvant ? dockAvant.scrollLeft : 0;
      // La boîte de carte SURVIT à la réécriture. Sans ça, chaque clic
      // détruisait les deux canevas, en réallouait deux neufs (le monde fait
      // près de neuf cents pixels de côté, en triple densité sur un
      // téléphone), reperdait le défilement et forçait un recentrage. Mesuré
      // au profileur : c'était le dernier gros poste du geste. On la décroche,
      // on réécrit les panneaux autour, on la remet — même nœud, même image,
      // même place de lecture.
      // La boîte de carte survit à la réécriture — mais on ne la décroche PAS
      // d'avance : depuis qu'on ne remplace que les blocs qui changent, un bloc
      // inchangé n'est jamais réinséré, et la boîte décrochée disparaissait
      // pour de bon. (Vu tout de suite par la suite navigateur : « la couche de
      // vie existe » au rouge.) On la laisse en place, et on ne la rapatrie que
      // si son bloc a effectivement été remplacé.
      const boiteAvant = memeEcran ? ecran.querySelector('#carte-boite') : null;
      poserEcran(ecran, html, memeEcran);
      if (boiteAvant && !boiteAvant.isConnected) {
        const boiteApres = ecran.querySelector('#carte-boite');
        if (boiteApres) boiteApres.replaceWith(boiteAvant);
      }
      boitePreservee = !!boiteAvant;
      if (chrono) chrono.pas('pose');
      if (defilDock > 0) {
        const dockApres = document.getElementById('dock-ordres');
        if (dockApres) dockApres.scrollLeft = defilDock;
      }
    }
  } catch (err) {
    dernierHtml = null;
    dernierBlocs = [];
    ecran.innerHTML = `<section class="panneau urgent">
      <h2 class="titre">Cet écran n’a pas pu s’afficher</h2>
      <div class="aide">C’est un défaut du jeu, pas de votre partie : elle continue de
        tourner et votre sauvegarde n’est pas touchée. Les autres onglets fonctionnent.</div>
      <div class="sep"></div>
      <div class="ligne souple"><span class="k">Onglet</span><span class="v">${e(onglet)}</span></div>
      <div class="aide" style="color:var(--rouge);white-space:pre-wrap">${e(String(
    (err && err.message) || err))}</div>
      <div class="aide" style="white-space:pre-wrap;opacity:0.7">${e(String(
    (err && err.stack) || '').split('\n').slice(0, 4).join('\n'))}</div>
    </section>`;
    // Et dans la console, en entier : c'est là qu'on va chercher la cause.
    if (typeof console !== 'undefined') console.error(`écran « ${onglet} » :`, err);
  }
  // Toujours, même quand on n'a rien réécrit : replier un encart ne change pas
  // une virgule au texte produit, seulement une classe sur la section. Sauter ce
  // passage quand le HTML est identique rendait le bouton inopérant — le pli
  // était bien noté, il ne s'appliquait qu'au rechargement suivant.
  // Le grand écran range la carte à gauche et les panneaux à droite — mais
  // seulement sur l'onglet carte, les autres écrans restent une colonne. La
  // racine doit s'élargir avec : c'est elle qui portait le 620 px.
  ecran.classList.toggle('deux-colonnes', onglet === 'carte');
  // Le poste de commandement (direction A de la refonte, choix du
  // propriétaire) : sur téléphone, l'écran carte est la carte — collante,
  // pleine largeur — et les panneaux glissent par-dessus comme une feuille.
  ecran.classList.toggle('plein-carte', onglet === 'carte');
  const racine = document.getElementById('racine');
  if (racine) racine.classList.toggle('large-carte', onglet === 'carte');
  // La nuit se sent sur le chrome (ALLURE.md, Q5).
  const heure = S ? S.temps % 24 : 12;
  if (racine) racine.dataset.nuit = heure >= 21 || heure < 6 ? '1' : '0';
  appliquerReplis(ecran);
  if (chrono) chrono.pas('replis');

  const cv = $('#carte');
  if (cv) {
    // La boîte de carte survit à la réécriture : son dessin aussi. Tant que
    // rien de ce qu'elle montre n'a bougé — l'heure, le monde connu, où sont
    // les vôtres, ce qui est visé — on ne la repeint pas. Presser un bouton
    // d'ordre ne change pas la carte, et ça coûtait un dessin entier.
    const sig = signatureCarte();
    const vierge = cv.dataset.vide !== '0';
    // Ce qui se voit tout de suite : le zoom, la case visée, un groupe qui
    // change de région. Le reste — l'heure qui avance, les convois — peut
    // attendre le battement suivant : à ×60 la carte se redessinait dix fois
    // par seconde pour montrer un fanal qui glisse d'un pixel.
    const vif = `${selection}|${CELL}|${sig.split('|').pop()}`;
    const cadence = (S.reglages && S.reglages.allege) ? CARTE_PAS_ALLEGE_MS : CARTE_PAS_MS;
    const assezVieux = maintenant - derniereCarteMs > cadence;
    if (vierge || vif !== dernierVifCarte || (sig !== derniereSignatureCarte && assezVieux)) {
      dessinerCarte(cv);
      derniereSignatureCarte = sig;
      dernierVifCarte = vif;
      derniereCarteMs = maintenant;
      cv.dataset.vide = '0';
    }
    if (chrono) chrono.pas('carte');
    if (cv.parentElement) lierGestesCarte(cv.parentElement);
    centrerCarte(cv, false, boitePreservee);
    animerCarte();
    if (chrono) chrono.pas('centrage');
  }
  // La place de lecture se rend en dernier, une fois la mise en page arrêtée.
  // Le canevas se dimensionne d'après la place qu'on lui laisse : le redessiner
  // après avoir replacé le défilement décalait tout ce qui se trouve dessous,
  // et c'était le seul écran où l'ancre ne tenait pas ses promesses.
  if (ecrit) restaurerAncre(ecran, ancre, defilementAvant === 0);
  if (chrono) chrono.pas('ancre');
  // `rendreModale` s'occupe aussi du rapport d'absence, qui s'ouvre de
  // lui-même : on l'appelle donc même sans modale demandée.
  if (modale || (S.rapport && S.rapport.apres)) rendreModale();
  // Ce que ce rendu a coûté, lissé : c'est lui qui décidera de l'espacement du
  // suivant. Lissé, parce qu'un rendu isolé et long (un écran qu'on ouvre pour
  // la première fois) ne doit pas freiner le jeu pour autant.
  if (chrono) { chrono.pas('modale'); chrono.fin(); }
  const fini = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  coutRendu = coutRendu * 0.7 + (fini - maintenant) * 0.3;
  // Le pire vu sur cet écran, pas la moyenne : c'est l'à-coup qu'on sent, et
  // c'est lui qu'on cherche.
  coutParEcran[onglet] = Math.max(coutParEcran[onglet] || 0, Math.round(fini - maintenant));
}

/** Poser du HTML seulement s'il a changé : sinon, mise en page et peinture
 *  pour rien — mesuré à neuf millisecondes par rendu sur un téléphone, juste
 *  pour réécrire une barre identique. */
function poserSi(el, html, memoire, cle) {
  if (!el) return;
  if (memoire[cle] === html) return;
  memoire[cle] = html;
  el.innerHTML = html;
}
const chromeMemoire = {};

function rendreBarreHaut() {
  const h = horloge(S.temps);
  const p = S.player;
  const cap = capacitePortage(S, G());
  const g = G();
  const poids = poidsInventaire(g.inventaire);
  const charge = cap > 0 ? poids / cap : 1;
  const vivants = g.membres.filter(estVivant).length;
  const debout = g.membres.filter(estDebout).length;

  // Le nombre qui décide de la survie, et il n'était affiché nulle part : au
  // rythme où l'on mange, combien de jours reste-t-il ? On mourait de faim en
  // regardant un sac plein de ferraille.
  const jours = autonomie(S, g);

  const cl = conditions(S.world, S.temps);
  // Les indicateurs vivent dans leur propre boîte, qui rogne par la droite si
  // l'écran est trop étroit. Sans ça, les blocs se compriment les uns dans les
  // autres et les libellés se chevauchent — et c'est le sélecteur de vitesse,
  // le seul vrai bouton de la barre, qui finissait par sortir de l'écran.
  poserSi($('#barre-haut'), `
    <div class="hd-metriques">
      <div class="hd-bloc" title="${g.nuit ? 'Nuit — on campe' : 'Jour'}">
        <span class="hd-val hd-cycle">${g.nuit ? '☾' : '☀'}</span>
        <span class="hd-val cyan">${h.texte}</span></div>
      <div class="hd-bloc hd-meteo" title="${e(cl.saison.def.nom)} — ${e(cl.meteo.nom)}">
        <span class="hd-val hd-saison" style="color:${cl.saison.def.couleur}"
          aria-label="${e(cl.saison.def.nom)}">◆</span></div>
      ${(() => {
    // Le signe s'explique (M4) : « ⚙ 412 » ne se lit que si l'on a appris le
    // signe par cœur. L'infobulle nomme la monnaie et son pays.
    const mk = monnaieIci(S);
    const md = mk && drapeauDe(S.world, mk);
    return `<div class="hd-bloc" title="Monnaie d’ici : ${md ? e(md.nom) : 'aucune — troc local'}">
      <span class="hd-eti">${e(sym())}</span>
        <span class="hd-val ambre">${n(soldeIci(S))}</span></div>`;
  })()}
      <div class="hd-bloc hd-sac"><span class="hd-eti">sac</span>
        <span class="hd-val ${charge > 0.95 ? 'rouge' : ''}">${n(poids)}/${n(cap)}</span></div>
      <div class="hd-bloc hd-esc" title="${e(g.nom)}"><span class="hd-eti">${e(groupes(S).length > 1 ? g.nom.slice(0, 3) : 'esc')}</span>
        <span class="hd-val ${debout < vivants ? 'rouge' : ''}">${debout}/${vivants}</span></div>
      <div class="hd-bloc" title="Jours de vivres au rythme actuel">
        <span class="hd-eti">viv</span>
        <span class="hd-val ${jours < 3 ? 'rouge' : jours < 8 ? 'ambre' : ''}">${
  Number.isFinite(jours)
    ? (jours < 10 ? `${jours.toFixed(1)}j` : jours < 100 ? `${Math.round(jours)}j` : '99+j')
    : '—'}</span></div>
    </div>
    <div class="hd-pousse vitesse" role="group" aria-label="Vitesse">
      ${VITESSES.map((v) => `<button data-a="vitesse" data-v="${v}"
        aria-pressed="${S.vitesse === v}">×${v}</button>`).join('')}
      <button data-a="modale" data-m="sauvegardes"
        aria-label="Sauvegardes${etatSauvegarde().ok ? '' : ' — écriture en échec'}"
        class="${etatSauvegarde().ok ? '' : 'alerte'}"
        title="${etatSauvegarde().ok ? 'Sauvegardes' : 'La sauvegarde échoue'}">${
  etatSauvegarde().ok ? '⛁' : '⚠'}</button>
    </div>`, chromeMemoire, 'haut');
}

/**
 * Les icônes de navigation (M5, ALLURE.md) : dessinées, pas empruntées.
 * Les glyphes Unicode (▚ ⌂ ✦ ⌸ ◈ ≡) venaient de blocs typographiques
 * différents et pesaient chacun leur poids — LE détail qui crie « fait avec
 * ce qu'on avait ». Un seul trait (1,5 px), une seule grille (24), la couleur
 * du texte courant.
 */
const ICONES_NAV = {
  carte: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  escouade: '<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/>'
    + '<path d="M3.5 19c0-2.6 2-4.4 4.5-4.4S12.5 16.4 12.5 19M11.5 19c0-2.6 2-4.4 4.5-4.4s4.5 1.8 4.5 4.4"/>',
  contrats: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  base: '<path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-5h4v5"/>',
  monde: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 3v18M4 7.5l8 4.5 8-4.5"/>',
  journal: '<path d="M5 5h14M5 9h14M5 13h14M5 17h9"/>',
};

function svgIco(nom) {
  return `<svg class="glyphe svgi" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true">${ICONES_NAV[nom] || ICONES_NAV.carte}</svg>`;
}

function rendreNav() {
  const enCours = S.player.contrats.length;
  const tabs = [
    ['carte', 'CARTE', 0],
    ['escouade', 'ESCOUADE', 0],
    ['contrats', 'CONTRATS', enCours],
    ['base', 'BASE', S.base.file.length + S.base.fileRech.length],
    ['monde', 'MONDE', 0],
    ['journal', 'JOURNAL', S.nonLus],
  ];
  poserSi($('#barre-nav'), tabs.map(([k, l, compte]) => `
    <button data-a="onglet" data-k="${k}" aria-current="${onglet === k ? 'page' : 'false'}">
      ${svgIco(k)}${l}
      ${compte ? `<span class="pastille ${k === 'journal' ? '' : 'calme'}">${compte > 99 ? '99' : compte}</span>` : ''}
    </button>`).join(''), chromeMemoire, 'nav');
}

// ---------------------------------------------------------------------------
// Carte pixel
// ---------------------------------------------------------------------------

/**
 * Taille d'une région à l'écran, en pixels. Continue, pas par crans : on la
 * pousse à la molette ou à deux doigts, et des paliers se sentent tout de suite
 * sous le doigt. Au plus serré la carte entière tient dans un téléphone, au
 * plus large on n'en voit qu'un dixième.
 */
const CELL_MIN = 9;
const CELL_MAX = 46;
let CELL = 36;

/** Un carré centré dans la case, en proportion de la case. */
function pave(g, x, y, part) {
  const t = Math.max(2, Math.round(CELL * part));
  g.fillRect(x + Math.round((CELL - t) / 2), y + Math.round((CELL - t) / 2), t, t);
  return t;
}

/** Bruit déterministe : la même case a toujours la même texture. */
function bruit(i, j) {
  let h = (i * 374761393 + j * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Amène le groupe affiché au centre de la fenêtre de carte. Sans ça, sur une
 * carte de vingt-quatre sur dix-huit, on ouvre l'onglet et on regarde un coin
 * de désert sans savoir où l'on est.
 *
 * On ne recentre pas si le joueur vient de faire défiler lui-même : reprendre
 * la main sur son doigt est la façon la plus sûre de rendre une carte
 * détestable.
 */
let derniereRegionVue = null;
/** Vrai dès que le joueur a bougé la carte lui-même : on ne lui reprend plus. */
let vueTenueParLeJoueur = false;
function centrerCarte(cv, force, preservee) {
  const boite = cv.parentElement;
  if (!boite) return;
  const g = G();
  if (!g) return;
  // La boîte a survécu à la réécriture : son défilement est déjà où il doit
  // être, et personne n'a bougé. Relire sa géométrie pour la remettre où elle
  // est force un calcul de mise en page — huit millisecondes par clic sur un
  // téléphone, pour ne rien changer.
  // ... mais seulement tant que le joueur TIENT la vue. La double tape la lui
  // reprend (`vueTenueParLeJoueur = false`) pour revenir sur le groupe : sauter
  // le recentrage là, c'était ignorer sa demande — dit tout de suite par la
  // suite navigateur, « le double clic ramène la vue sur le groupe » au rouge.
  if (!force && preservee && vueTenueParLeJoueur && derniereRegionVue === g.regionId) return;
  // On suit le groupe tant que le joueur n'a pas pris la main ; une fois qu'il
  // l'a prise, seul un double clic la lui redemande.
  if (!force) {
    if (vueTenueParLeJoueur) {
      // L'écran vient d'être reconstruit : on remet la vue là où elle était.
      if (vueScroll) { boite.scrollLeft = vueScroll.x; boite.scrollTop = vueScroll.y; }
      majPositionCarte();
      return;
    }
    if (derniereRegionVue === g.regionId) {
      if (vueScroll) { boite.scrollLeft = vueScroll.x; boite.scrollTop = vueScroll.y; }
      majPositionCarte();
      return;
    }
  }
  derniereRegionVue = g.regionId;
  const r = S.world.regions[g.regionId];
  if (!r) return;
  boite.scrollLeft = Math.max(0, r.x * CELL + CELL / 2 - boite.clientWidth / 2);
  boite.scrollTop = Math.max(0, r.y * CELL + CELL / 2 - boite.clientHeight / 2);
  noterVue(boite);
  majPositionCarte();
}

/**
 * Manœuvrer la carte : au doigt, à la souris, à la molette, à deux doigts.
 *
 * Tout passe par les événements pointeur, donc le même code sert le tactile et
 * la souris. La boîte porte `touch-action: none` : sans ça, un glissement
 * vertical sur la carte fait défiler la page et on n'atteint jamais le sud du
 * monde. En contrepartie c'est à nous de bouger la vue, ce que fait `scrollLeft`
 * et `scrollTop` — la carte reste un canvas de taille réelle dans une fenêtre,
 * pas une transformation CSS, et le dessin reste net au pixel près.
 *
 * Un appui qui n'a pas bougé de plus de six pixels est un clic, pas un
 * glissement : sans ce seuil, chaque déplacement finirait par sélectionner une
 * région au hasard.
 */
const SEUIL_CLIC = 6;
const pointeurs = new Map();
let glisse = null;
let ecartPincee = 0;
/**
 * Où le joueur regarde. Indispensable : chaque rafraîchissement reconstruit
 * l'écran, donc la boîte de carte est un élément neuf dont le défilement repart
 * de zéro. Sans cette mémoire, le moindre clic renvoyait la vue dans le coin
 * nord-ouest du monde.
 */
let vueScroll = null;
/** Dernier appui bref : sert à reconnaître la double tape nous-mêmes. */
let dernierClic = null;

function noterVue(boite) {
  vueScroll = { x: boite.scrollLeft, y: boite.scrollTop };
}

/** Le point du monde (en cases, décimal) sous une position écran. */
function souscarte(boite, cx, cy) {
  const r = boite.getBoundingClientRect();
  return {
    wx: (boite.scrollLeft + (cx - r.left)) / CELL,
    wy: (boite.scrollTop + (cy - r.top)) / CELL,
    ex: cx - r.left,
    ey: cy - r.top,
  };
}

/** Change le zoom en gardant fixe le point visé. */
function zoomer(boite, facteur, cx, cy) {
  const avant = souscarte(boite, cx, cy);
  const neuf = Math.max(CELL_MIN, Math.min(CELL_MAX, CELL * facteur));
  if (Math.abs(neuf - CELL) < 0.01) return;
  CELL = neuf;
  const cv = boite.querySelector('canvas');
  if (cv) dessinerCarte(cv);
  boite.scrollLeft = avant.wx * CELL - avant.ex;
  boite.scrollTop = avant.wy * CELL - avant.ey;
  vueTenueParLeJoueur = true;
  noterVue(boite);
  // Le zoom aussi est un geste : même répit que le glissement.
  derniereInteraction = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  majPositionCarte();
}

function lierGestesCarte(boite) {
  if (boite.dataset.gestes) return;
  boite.dataset.gestes = '1';

  boite.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    // Le pas dépend de l'amplitude, pas de son signe : une molette crantée et
    // un pavé tactile n'envoient pas du tout les mêmes valeurs.
    zoomer(boite, Math.exp(-ev.deltaY * 0.0016), ev.clientX, ev.clientY);
  }, { passive: false });

  boite.addEventListener('pointerdown', (ev) => {
    // La capture garde le glissement vivant même quand le doigt sort de la
    // boîte. Elle échoue sur un événement fabriqué (tests) : ce n'est pas une
    // raison pour perdre le geste.
    try { boite.setPointerCapture(ev.pointerId); } catch (e) { /* pas capturable */ }
    pointeurs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointeurs.size === 1) {
      glisse = { x: ev.clientX, y: ev.clientY, dep: 0, id: ev.pointerId };
    } else if (pointeurs.size === 2) {
      const [a, b] = [...pointeurs.values()];
      ecartPincee = Math.hypot(a.x - b.x, a.y - b.y);
      glisse = null; // deux doigts : on pince, on ne fait plus glisser
    }
  });

  boite.addEventListener('pointermove', (ev) => {
    const p = pointeurs.get(ev.pointerId);
    if (!p) return;
    const dx = ev.clientX - p.x;
    const dy = ev.clientY - p.y;
    p.x = ev.clientX; p.y = ev.clientY;

    if (pointeurs.size >= 2) {
      const [a, b] = [...pointeurs.values()];
      const ecart = Math.hypot(a.x - b.x, a.y - b.y);
      if (ecartPincee > 0 && ecart > 0) {
        zoomer(boite, ecart / ecartPincee, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      ecartPincee = ecart;
      return;
    }
    if (!glisse || glisse.id !== ev.pointerId) return;
    glisse.dep += Math.abs(dx) + Math.abs(dy);
    boite.scrollLeft -= dx;
    boite.scrollTop -= dy;
    if (glisse.dep > SEUIL_CLIC) vueTenueParLeJoueur = true;
    noterVue(boite);
    // Le geste arme le répit du rendu, comme un clic : sans ça, `rafraichir`
    // reconstruisait l'écran EN PLEIN glissement — la boîte remplacée, la
    // capture du pointeur morte, la carte qui saute sous le doigt (« la carte
    // fait des mouvements bizarres », le propriétaire, sur téléphone).
    derniereInteraction = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  });

  const relacher = (ev) => {
    const etaitGlisse = glisse && glisse.id === ev.pointerId ? glisse : null;
    pointeurs.delete(ev.pointerId);
    if (pointeurs.size < 2) ecartPincee = 0;
    if (pointeurs.size === 0) glisse = null;
    if (!etaitGlisse || etaitGlisse.dep > SEUIL_CLIC || ev.type !== 'pointerup') return;
    // On reconnaît la double tape ici plutôt qu'avec l'événement `dblclick` :
    // le premier appui reconstruit l'écran, et le `dblclick` arriverait sur une
    // boîte détachée du document, donc dans le vide.
    const now = ev.timeStamp || 0;
    const doubleTape = dernierClic
      && now - dernierClic.t < 340
      && Math.abs(ev.clientX - dernierClic.x) < 14
      && Math.abs(ev.clientY - dernierClic.y) < 14;
    dernierClic = { t: now, x: ev.clientX, y: ev.clientY };
    if (doubleTape) {
      dernierClic = null;
      vueTenueParLeJoueur = false;
      vueScroll = null;
      const cvv = boite.querySelector('canvas');
      if (cvv) centrerCarte(cvv, true);
      return;
    }
    choisirCase(boite, ev.clientX, ev.clientY);
  };
  boite.addEventListener('pointerup', relacher);
  boite.addEventListener('pointercancel', relacher);

}

function choisirCase(boite, cx, cy) {
  const { wx, wy } = souscarte(boite, cx, cy);
  const x = Math.floor(wx);
  const y = Math.floor(wy);
  if (x < 0 || y < 0 || x >= S.world.largeur || y >= S.world.hauteur) return;
  selection = y * S.world.largeur + x;
  rafraichir(true);
}

/** Le repère du groupe, sous la carte. Mis à jour sans reconstruire l'écran. */
function majPositionCarte() {
  const el = document.getElementById('carte-pos');
  if (!el) return;
  const g = G();
  const r = g ? S.world.regions[g.regionId] : null;
  el.textContent = r ? `secteur ${String.fromCharCode(65 + r.x)}${r.y + 1}` : '';
}

/**
 * Le terrain : le fond peint, la matière de chaque case, la trame et les
 * champs de lumière. C'est le gros du travail — des milliers de rectangles et
 * un dégradé radial par case découverte — et il ne change QUE si le monde
 * connu change. Il est donc peint à part, et gardé.
 *
 * Mesuré au profileur sous processeur bridé six fois : un clic coûtait 220 à
 * 330 ms, dont la moitié ici, redessinée à l'identique parce que réécrire
 * l'écran recrée le canevas. « Les clics sur les boutons ne sont pas réactifs
 * comme c'était avant, c'est devenu injouable » (le propriétaire, août 2026).
 */
function peindreTerrain(g, w, L, H) {
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#05070a';
  g.fillRect(0, 0, L, H);

  // La sous-couche peinte (étape 8, l'affiche) : le monde en UN pixel par
  // région, étiré avec lissage bilinéaire — les régions d'un même pays se
  // fondent en champs organiques, et la matière crispe se pose par-dessus.
  // Déterministe (mêmes entrées, même image), et le carnet ne divulgue rien :
  // l'inexploré y est une seule teinte de cendre.
  const mini = dessinerCarte._mini || (dessinerCarte._mini = document.createElement('canvas'));
  if (mini.width !== w.largeur) { mini.width = w.largeur; mini.height = w.hauteur; }
  const mg = mini.getContext('2d');
  for (const r of w.regions) {
    mg.fillStyle = r.decouvert ? BIOMES[r.biome].couleurs[1] : '#0b0a0d';
    mg.fillRect(r.x, r.y, 1, 1);
  }
  g.imageSmoothingEnabled = true;
  g.globalAlpha = 0.55;
  g.drawImage(mini, 0, 0, L, H);
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = false;

  for (const r of w.regions) {
    const x = r.x * CELL;
    const y = r.y * CELL;
    if (!r.decouvert) {
      // L'inexploré n'est pas un aplat (G1) : un monde sous la cendre. Des
      // reliefs devinés — du bruit, pas le vrai terrain : la carte reste un
      // carnet, elle ne divulgue rien.
      g.globalAlpha = 0.82;
      g.fillStyle = '#121014';
      g.fillRect(x, y, CELL, CELL);
      g.globalAlpha = 1;
      g.globalAlpha = 0.05 + bruit(r.i, 97) * 0.07;
      g.fillStyle = '#000';
      g.fillRect(x, y, CELL, CELL);
      g.globalAlpha = 1;
      for (let k = 0; k < 8; k++) {
        const b = bruit(r.i, k);
        // Chaque grain a sa valeur : c'est l'alpha qui varie, pas la teinte —
        // huit reliefs devinés, pas deux tons plaqués.
        // Trois tons de relief, plage d'alpha large : l'éclaircissement de
        // l'étape 7 avait fait converger deux tons — le garde (≥ 6) a refusé.
        g.globalAlpha = 0.07 + bruit(r.i, k + 61) * 0.14;
        g.fillStyle = b > 0.75 ? '#8a8274' : b > 0.45 ? '#6e7480' : '#565e6e';
        g.fillRect(x + Math.floor(bruit(r.i, k + 31) * (CELL - 2)),
          y + Math.floor(bruit(r.i, k + 9) * (CELL - 2)), b > 0.85 ? 2 : 1, 1);
      }
      g.globalAlpha = 1;
      continue;
    }
    const cols = BIOMES[r.biome].couleurs;
    g.globalAlpha = 0.55;
    g.fillStyle = cols[0];
    g.fillRect(x, y, CELL, CELL);
    g.globalAlpha = 1;
    // Le terrain ondule (G1) : chaque case a sa valeur propre, tirée de son
    // indice — fini le carrelage de neuf aplats.
    g.globalAlpha = 0.08 * bruit(r.i, 1);
    g.fillStyle = '#000';
    g.fillRect(x, y, CELL, CELL);
    g.globalAlpha = 1;
    // La lumière de l'affiche (étape 7) : un voile chaud à valeur propre par
    // case — le monde exploré rayonne au lieu de s'éteindre.
    g.globalAlpha = 0.05 + bruit(r.i, 3) * 0.06;
    g.fillStyle = '#ffe9c9';
    g.fillRect(x, y, CELL, CELL);
    g.globalAlpha = 1;
    // La matière : un tramage dense, trois tons plus un accent semé rare —
    // toujours les mêmes grains au même endroit, la carte ne scintille pas.
    for (let k = 0; k < 22; k++) {
      const b = bruit(r.i, k);
      const px = x + Math.floor(bruit(r.i, k + 31) * (CELL - 2));
      const py = y + Math.floor(bruit(r.i, k + 57) * (CELL - 2));
      g.fillStyle = b > 0.92 && cols[3] ? cols[3] : b > 0.55 ? cols[1] : cols[2];
      // Chaque grain a sa valeur propre : la matière, pas un motif à deux tons.
      g.globalAlpha = 0.55 + bruit(r.i, k + 79) * 0.45;
      const gr = b > 0.72 ? 2 : 1;
      g.fillRect(px, py, gr, gr);
    }
    g.globalAlpha = 1;
    // La couture entre deux biomes : une ombre d'un pixel, et les régions
    // cessent d'être des cases pour devenir des pays.
    const voisinE = r.x + 1 < w.largeur ? w.regions[r.i + 1] : null;
    const voisinS = r.y + 1 < w.hauteur ? w.regions[r.i + w.largeur] : null;
    g.fillStyle = 'rgba(0,0,0,.32)';
    if (voisinE && voisinE.decouvert && voisinE.biome !== r.biome) g.fillRect(x + CELL - 1, y, 1, CELL);
    if (voisinS && voisinS.decouvert && voisinS.biome !== r.biome) g.fillRect(x, y + CELL - 1, CELL, 1);
    // Les pistes tassées par ceux qui passent. Un trait clair au milieu de la
    // case, d'autant plus net que la terre est damée : c'est ce qui fait qu'une
    // carte parcourue ne ressemble pas à une carte vierge.
    if (r.piste > 0.12) {
      g.fillStyle = `rgba(196,180,148,${(0.12 + r.piste * 0.45).toFixed(2)})`;
      const ep = r.piste > 0.6 ? 3 : r.piste > 0.35 ? 2 : 1;
      g.fillRect(x, y + (CELL - ep) / 2, CELL, ep);
      g.fillRect(x + (CELL - ep) / 2, y, ep, CELL);
    }
    // Territoire d'une faction : liseré dans sa couleur
    if (r.controle) {
      g.fillStyle = couleurFaction(r.controle);
      g.globalAlpha = 0.5;
      g.fillRect(x, y, CELL, 1);
      g.fillRect(x, y, 1, CELL);
      g.globalAlpha = 1;
    }
    // Épuisement de la région : voile sombre
    if (r.fouille > 0.15) {
      g.fillStyle = `rgba(0,0,0,${(r.fouille * 0.45).toFixed(2)})`;
      g.fillRect(x, y, CELL, CELL);
    }
    // Ce qu'on sait de l'état des pistes : quelques points rouges là où l'on
    // ne circule plus. On ne le montre que sur ce qu'on a vu récemment — la
    // carte reste un carnet, pas un satellite.
    if (estSurveillee(S, r.i) && (r.insecurite || 0) > NIVEAU_ORDINAIRE + 0.08) {
      const n2 = Math.min(5, Math.round((r.insecurite - NIVEAU_ORDINAIRE) * 12));
      g.fillStyle = 'rgba(214,90,74,.75)';
      for (let k = 0; k < n2; k++) {
        g.fillRect(x + 2 + Math.floor(bruit(r.i, k + 71) * (CELL - 4)),
          y + 2 + Math.floor(bruit(r.i, k + 91) * (CELL - 4)), 1, 1);
      }
    }
    // Le carnet se voit (G1) : ce qu'on ne surveille pas est un souvenir, et
    // un souvenir est plus terne que ce qu'on a sous les yeux. Le voile est
    // léger — l'information reste lisible, seule la fraîcheur se distingue.
    if (!estSurveillee(S, r.i)) {
      g.fillStyle = 'rgba(10,10,14,.14)';
      g.fillRect(x, y, CELL, CELL);
    }
  }

  // La trame du pupitre (l'affiche) : une grille fine sur tout le monde.
  g.strokeStyle = 'rgba(140, 155, 170, 0.05)';
  g.lineWidth = 1;
  g.beginPath();
  for (let gx = 0; gx <= w.largeur; gx++) {
    g.moveTo(gx * CELL + 0.5, 0);
    g.lineTo(gx * CELL + 0.5, H);
  }
  for (let gy = 0; gy <= w.hauteur; gy++) {
    g.moveTo(0, gy * CELL + 0.5);
    g.lineTo(L, gy * CELL + 0.5);
  }
  g.stroke();

  // Les champs de couleur (étape 7, l'affiche) : chaque case découverte pose
  // une lueur radiale de son biome, et les voisines d'un même pays se fondent
  // en champs lumineux qui débordent doucement dans la cendre — le monde est
  // peint, plus carrelé. C'est de la LUMIÈRE, pas de l'information : la lueur
  // porte la couleur de la case découverte, jamais celle d'une case voisine
  // encore sous la cendre.
  for (const r of w.regions) {
    if (!r.decouvert) continue;
    const cx = r.x * CELL + CELL / 2;
    const cy = r.y * CELL + CELL / 2;
    const teinte = BIOMES[r.biome].couleurs[1];
    const tr = Math.min(255, parseInt(teinte.slice(1, 3), 16) + 55);
    const tg = Math.min(255, parseInt(teinte.slice(3, 5), 16) + 50);
    const tb = Math.min(255, parseInt(teinte.slice(5, 7), 16) + 40);
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, CELL * 1.35);
    halo.addColorStop(0, `rgba(${tr},${tg},${tb},${estSurveillee(S, r.i) ? 0.2 : 0.13})`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo;
    g.fillRect(cx - CELL * 1.35, cy - CELL * 1.35, CELL * 2.7, CELL * 2.7);
  }
}

/**
 * L'empreinte de ce que le terrain dessine. Tout ce que `peindreTerrain` lit
 * y entre : si l'empreinte n'a pas bougé, l'image d'avant est encore juste.
 * Les nombres sont arrondis au cran qui se voit — plus fin serait du gaspillage,
 * plus grossier laisserait une carte périmée à l'écran.
 */
let empreinteTemps = -1;
let empreinteCell = -1;
let empreinteVue = null;

function empreinteTerrain(w) {
  // Le monde ne change qu'aux heures : entre deux ticks, la même empreinte.
  // La recalculer à chaque rendu — quatre cent trente-deux régions, chacune
  // demandant si on la surveille — coûtait vingt-huit millisecondes par clic
  // sur un processeur de téléphone, pour un résultat identique. C'était le
  // premier poste du geste, et c'était mon propre garde-fou qui le créait.
  if (empreinteVue && empreinteTemps === S.temps && empreinteCell === CELL) return empreinteVue;
  // Deux empreintes, parce que deux natures. L'INFORMATION — ce qu'on a
  // découvert, à qui appartient la case, ce qu'on surveille — se repeint
  // sur-le-champ : une carte qui ment est pire qu'une carte lente. La
  // MATIÈRE — les pistes qui se tassent, la région qu'on épuise, l'insécurité
  // qui monte — dérive à chaque heure de jeu ; la repeindre à chaque fois,
  // c'était repeindre tout le terrain en permanence, et l'à-coup revenait par
  // la fenêtre. Elle attend un battement.
  let dur = 2166136261;
  let doux = 2166136261;
  const dURE = (v) => { dur = Math.imul(dur ^ v, 16777619); };
  const doUX = (v) => { doux = Math.imul(doux ^ v, 16777619); };
  dURE(CELL);
  dURE(w.largeur);
  dURE(w.hauteur);
  for (const r of w.regions) {
    dURE(r.decouvert ? 1 : 0);
    dURE((r.biome || '').length + (r.biome ? r.biome.charCodeAt(0) : 0));
    dURE(r.controle ? r.controle.charCodeAt(0) + r.controle.length * 31 : 0);
    dURE(estSurveillee(S, r.i) ? 1 : 0);
    doUX(Math.round((r.piste || 0) * 8));
    doUX(Math.round((r.fouille || 0) * 8));
    doUX(Math.round((r.insecurite || 0) * 10));
  }
  empreinteVue = { dur: dur >>> 0, doux: doux >>> 0 };
  empreinteTemps = S.temps;
  empreinteCell = CELL;
  return empreinteVue;
}

/** Le délai au bout duquel la matière du terrain a le droit d'être repeinte. */
const REPEINT_MATIERE_MS = 2500;

/** Le terrain gardé, repeint seulement quand il le faut vraiment. */
function terrainGarde(w, L, H) {
  const emp = empreinteTerrain(w);
  let t = terrainGarde.toile;
  if (!t) t = terrainGarde.toile = document.createElement('canvas');
  const maintenant = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const neuf = t.width !== L || t.height !== H || terrainGarde.dur !== emp.dur;
  const matiere = terrainGarde.doux !== emp.doux
    && maintenant - (terrainGarde.quand || 0) > REPEINT_MATIERE_MS;
  if (neuf || matiere) {
    t.width = L;
    t.height = H;
    peindreTerrain(t.getContext('2d'), w, L, H);
    terrainGarde.dur = emp.dur;
    terrainGarde.doux = emp.doux;
    terrainGarde.quand = maintenant;
  }
  return t;
}

function dessinerCarte(cv) {
  const w = S.world;
  const L = w.largeur * CELL;
  const H = w.hauteur * CELL;
  if (cv.width !== L) { cv.width = L; cv.height = H; }
  // La couche de vie (M1) relit ces listes à dix images par seconde : on les
  // remplit ICI, pendant qu'on applique les règles de visibilité — la vie
  // n'a pas le droit d'en savoir plus que la carte, et elle n'a pas à les
  // recalculer à chaque image.
  vieFoyers.length = 0;
  vieConvois.length = 0;
  vieColonnes.length = 0;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  // Le terrain est peint à part et gardé : il ne bouge que si le monde connu
  // bouge. Ici, une seule image à poser.
  g.drawImage(terrainGarde(w, L, H), 0, 0);

  // Le secteur dont on répond : un liseré tireté, pour qu'on sache où il est
  // sans avoir à ouvrir un écran.
  const monSecteur = G() && G().allegeance && G().allegeance.secteur;
  if (monSecteur) {
    g.strokeStyle = 'rgba(217,160,58,.85)';
    g.lineWidth = 1;
    for (const r of casesDe(w, monSecteur)) {
      const x = r.x * CELL;
      const y = r.y * CELL;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = r.x + dx;
        const ny = r.y + dy;
        const dedans = Math.abs(nx - (monSecteur.centre % w.largeur))
          + Math.abs(ny - ((monSecteur.centre / w.largeur) | 0)) <= (monSecteur.rayon || 2);
        if (dedans && nx >= 0 && ny >= 0 && nx < w.largeur && ny < w.hauteur) continue;
        g.beginPath();
        if (dx) { g.moveTo(x + (dx > 0 ? CELL : 0) - 0.5, y); g.lineTo(x + (dx > 0 ? CELL : 0) - 0.5, y + CELL); }
        else { g.moveTo(x, y + (dy > 0 ? CELL : 0) - 0.5); g.lineTo(x + CELL, y + (dy > 0 ? CELL : 0) - 0.5); }
        g.stroke();
      }
    }
  }

  // Colonies — les ruines gardent une trace, en gris et brisée. La carte
  // affiche le dernier drapeau *vu*, pas le drapeau réel : une ville prise en
  // votre absence garde ses anciennes couleurs jusqu'à ce que quelqu'un y
  // retourne. C'est le fond du système : la carte est un carnet, pas un satellite.
  // Les noms s'écrivent en dernier (voir plus bas) pour rester lisibles
  // par-dessus tout le reste — on les collecte au passage.
  const noms = [];
  for (const col of w.colonies) {
    const r = w.regions[col.regionId];
    if (!r.decouvert) continue;
    const su = vueColonie(S, col);
    if (su.inconnu) continue; // repérée de loin, jamais relevée : pas de drapeau
    const x = r.x * CELL;
    const y = r.y * CELL;
    if (CELL >= 20) noms.push([su.nom || col.nom, x + CELL / 2, y + CELL + 1, !!su.ruine]);
    const t = 3 + (su.taille || col.taille);
    const ox = x + Math.floor((CELL - t) / 2);
    const oy = y + Math.floor((CELL - t) / 2);
    // Une ville est bâtie (G1) : quelques toits autour du carré dès que le
    // zoom laisse la place — plus une pastille posée sur du vide.
    if (CELL >= 22 && !su.ruine) {
      for (let k = 0; k < 3 + (su.taille || col.taille); k++) {
        const bx = x + 2 + Math.floor(bruit(col.regionId, k + 11) * (CELL - 5));
        const by = y + 2 + Math.floor(bruit(col.regionId, k + 29) * (CELL - 5));
        g.fillStyle = bruit(col.regionId, k + 47) > 0.5 ? '#6e675c' : '#4c463f';
        g.fillRect(bx, by, 2, 2);
      }
    }
    // Une ville vivante rayonne (étape 7) : trois anneaux d'alpha dans la
    // couleur du drapeau vu — le halo de l'affiche. Les ruines restent
    // éteintes : c'est même à ça qu'on les reconnaît de loin.
    if (!su.ruine) {
      g.fillStyle = couleurFaction(su.faction);
      g.globalAlpha = 0.05;
      g.fillRect(ox - 7, oy - 7, t + 14, t + 14);
      g.globalAlpha = 0.09;
      g.fillRect(ox - 4, oy - 4, t + 8, t + 8);
      g.globalAlpha = 0.16;
      g.fillRect(ox - 2, oy - 2, t + 4, t + 4);
      g.globalAlpha = 1;
    }
    g.fillStyle = '#05070a';
    g.fillRect(ox - 1, oy - 1, t + 2, t + 2);
    if (su.ruine) {
      g.fillStyle = '#4a4f5a';
      g.fillRect(ox, oy, t, 1);
      g.fillRect(ox, oy, 1, t);
      g.fillRect(ox + t - 1, oy + t - 2, 1, 2);
      continue;
    }
    g.fillStyle = couleurFaction(su.faction);
    g.fillRect(ox, oy, t, t);
    g.fillStyle = '#05070a';
    g.fillRect(ox + 1, oy + 1, t - 2, t - 2);
    // Une ville vivante a un feu : la couche de vie le fera respirer.
    vieFoyers.push({ r: col.regionId, x: ox, y: oy, taille: t });
    // Un liseré terne sur ce dont le relevé date d'une saison ou plus.
    if (!su.frais && su.depuis > 24 * 30) {
      g.fillStyle = 'rgba(84,94,112,.85)';
      g.fillRect(ox + 1, oy + t - 2, t - 2, 1);
    }
  }

  // Caravanes : de petits convois qui traversent réellement la carte. On ne
  // les voit que là où l'on a quelqu'un — ailleurs, les routes sont muettes.
  for (const car of w.caravanes || []) {
    const r = w.regions[car.regionId];
    if (!r || !r.decouvert || !estSurveillee(S, car.regionId)) continue;
    const cx = r.x * CELL;
    const cy = r.y * CELL;
    const lg = Math.max(3, Math.round(CELL * 0.31));
    const ht = Math.max(2, Math.round(CELL * 0.19));
    g.fillStyle = '#05070a';
    g.fillRect(cx + 1, cy + CELL - ht - 2, lg, ht);
    g.fillStyle = couleurFaction(car.faction);
    g.fillRect(cx + 2, cy + CELL - ht - 1, lg - 2, Math.max(1, ht - 2));
    // Un convoi qu'on voit chemine : la couche de vie fait courir son fanal.
    vieConvois.push({ x: cx, y: cy, r: car.regionId });
  }

  // Avant-poste
  if (S.base.fonde) {
    const r = w.regions[S.base.regionId];
    if (r) {
      const x = r.x * CELL;
      const y = r.y * CELL;
      g.fillStyle = '#4fd0e3';
      g.globalAlpha = 0.08;
      g.fillRect(x - 2, y - 2, CELL + 4, CELL + 4);
      g.globalAlpha = 1;
      g.strokeStyle = '#4fd0e3';
      g.lineWidth = 1;
      g.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
    }
  }

  // Le voile du monde (ALLURE.md, Q5) : la saison teinte à peine la carte, la
  // nuit l'assombrit — le temps se sent sans se lire. Posé sur le terrain,
  // sous les marqueurs : la nuit tombe sur le monde, pas sur ce qu'on suit.
  const cond = conditions(S.world, S.temps);
  if (cond && cond.saison && cond.saison.def.couleur) {
    g.fillStyle = cond.saison.def.couleur;
    g.globalAlpha = 0.045;
    g.fillRect(0, 0, L, H);
    g.globalAlpha = 1;
  }
  const heureCarte = S.temps % 24;
  if (heureCarte >= 21 || heureCarte < 6) {
    g.fillStyle = 'rgba(5, 8, 16, 0.22)';
    g.fillRect(0, 0, L, H);
  }

  // Armées : idem. Une colonne en marche à l'autre bout de la carte ne se
  // devine pas — sauf transmissions cassées, ou rapports de la maison qu'on
  // sert (MARECHAL.md, M5 : `vueArmee` centralise qui voit quoi).
  for (const a of w.armees) {
    const r = w.regions[a.regionId];
    if (!r || !r.decouvert) continue;
    const va = vueArmee(S, a);
    if (!va || !va.frais) continue;
    const x = r.x * CELL;
    const y = r.y * CELL;
    const t = Math.max(3, Math.round(CELL * 0.19));
    g.fillStyle = couleurFaction(a.faction);
    g.fillRect(x + CELL - t - 2, y + 2, t, t);
    g.fillStyle = '#05070a';
    g.fillRect(x + CELL - t - 1, y + 3, Math.max(1, t - 2), Math.max(1, t - 2));
    // Une colonne en marche bat comme un pouls sur la couche de vie.
    vieColonnes.push({ x: x + CELL - t - 2, y: y + 2, taille: t, k: a.faction });
  }

  // Les groupes. Tous sont dessinés — savoir où sont les siens est la moitié de
  // l'intérêt de les séparer. Celui qu'on regarde est plein et cerclé ; les
  // autres sont creux, pour qu'un coup d'œil suffise à les distinguer.
  const actif = G();
  for (const gr of groupes(S)) {
    const rp = w.regions[gr.regionId];
    if (!rp) continue;
    const x = rp.x * CELL;
    const y = rp.y * CELL;
    const moi = gr.id === actif.id;
    if (moi) {
      // Le marqueur de l'escouade rayonne (étape 7) : le joueur se trouve
      // d'un regard, comme sur l'affiche.
      g.fillStyle = '#f2f6fb';
      g.globalAlpha = 0.07;
      pave(g, x, y, 0.95);
      g.globalAlpha = 0.13;
      pave(g, x, y, 0.66);
      g.globalAlpha = 1;
    }
    g.fillStyle = '#05070a';
    pave(g, x, y, 0.42);
    g.fillStyle = '#f2f6fb';
    const t = pave(g, x, y, 0.3);
    if (moi) {
      g.fillStyle = '#05070a';
      pave(g, x, y, 0.14);
    } else {
      // Contour seul : un carré creux, pour distinguer d'un coup d'œil.
      const o = Math.round((CELL - t) / 2);
      g.fillStyle = '#05070a';
      g.fillRect(x + o + 1, y + o + 1, t - 2, t - 2);
    }
  }

  // L'étiquette de l'escouade (étape 8) : le marqueur porte son nom, comme
  // sur l'affiche — un seul mot, sous le carré du groupe affiché.
  if (CELL >= 16) {
    const ra = w.regions[actif.regionId];
    if (ra) {
      const tE = Math.max(7, Math.round(CELL * 0.3));
      g.font = `600 ${tE}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(5,7,10,.9)';
      const et = groupes(S).length > 1 ? actif.nom.toUpperCase() : 'VOTRE ESCOUADE';
      const ex = ra.x * CELL + CELL / 2;
      const ey = Math.min(ra.y * CELL + CELL + 2, H - tE - 1);
      g.strokeText(et, ex, ey);
      g.fillStyle = 'rgba(242,246,251,.95)';
      g.fillText(et, ex, ey);
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
    }
  }

  // Itinéraires en cours, celui du groupe affiché en clair, les autres estompés
  for (const gr of groupes(S)) {
    const o = gr.ordre;
    if (!o || o.type !== 'voyage' || !o.route) continue;
    g.fillStyle = gr.id === actif.id ? 'rgba(242,246,251,.55)' : 'rgba(242,246,251,.22)';
    for (let k = o.etape; k < o.route.length; k++) {
      const r = w.regions[o.route[k]];
      pave(g, r.x * CELL, r.y * CELL, 0.14);
    }
  }

  // Sélection
  if (selection != null) {
    const r = w.regions[selection];
    g.strokeStyle = '#f2f6fb';
    g.lineWidth = 1;
    g.strokeRect(r.x * CELL + 0.5, r.y * CELL + 0.5, CELL - 1, CELL - 1);
  }

  // U2 (INTERFACE.md) : le nom sous le carré, dès que le zoom laisse la
  // place. On ne pouvait ni s'orienter ni raconter ce qu'on voyait — des
  // taches sur du noir. La carte reste un carnet : seules les villes
  // relevées ont un nom, et une ruine le garde en gris, comme son tracé.
  if (noms.length) {
    const taille = Math.max(8, Math.round(CELL * 0.36));
    g.font = `${taille}px ui-monospace, Menlo, Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(5,7,10,.85)';
    for (const [nom, cx, cy, ruine] of noms) {
      const yy = Math.min(cy, H - taille - 1);
      g.strokeText(nom, cx, yy);
      g.fillStyle = ruine ? 'rgba(122,130,146,.85)' : 'rgba(230,236,246,.92)';
      g.fillText(nom, cx, yy);
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }

}

// ---------------------------------------------------------------------------
// La carte vivante (M1, ALLURE.md)
// ---------------------------------------------------------------------------
//
// Un second canevas par-dessus le terrain, redessiné à dix images par seconde
// — assez pour que le monde respire, dix fois moins cher que le soixante d'un
// jeu d'action que personne ne demandait à un jeu textuel.
//
// Trois règles, non négociables :
// 1. **Lecture seule.** La couche ne touche ni l'état ni le RNG scellé : tout
//    son mouvement dérive de `bruit()` et de l'horloge d'affichage. Deux
//    joueurs à la même graine voient le même monde, à la flammèche près.
// 2. **Elle n'en sait pas plus que la carte.** Ses listes (`vieFoyers`,
//    `vieConvois`, `vieColonnes`) sont remplies par `dessinerCarte` pendant
//    qu'il applique les règles de visibilité — un convoi hors de vue n'existe
//    pas davantage ici que là.
// 3. **Elle s'éteint toute seule.** Plus de canevas (autre onglet), boucle
//    finie ; onglet caché, rien ne se dessine ; `prefers-reduced-motion`,
//    une seule image, immobile.

const vieFoyers = [];
const vieConvois = [];
const vieColonnes = [];
let vieRaf = 0;
let vieDernier = 0;
/** Dix images par seconde : le monde respire, la batterie aussi. */
const VIE_PAS_MS = 100;
/** Ce qu'a coûté la dernière image de la couche de vie, lissé. */
let coutVie = 0;

function animerCarte() {
  if (vieRaf) return; // déjà en route
  // Le mode allégé coupe l'agrément : la cendre ne dérive plus, les feux ne
  // respirent plus, et le fil du jeu ne fait plus que ce qui compte. C'est un
  // choix du joueur, pas une décision prise pour lui.
  if (S && S.reglages && S.reglages.allege) return;
  const immobile = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pas = (ts) => {
    vieRaf = 0;
    const cv = document.getElementById('carte-vie');
    const fond = document.getElementById('carte');
    if (!S || !cv || !fond) return; // l'écran a changé : la boucle s'éteint
    // Dix images par seconde quand la machine suit ; moins quand elle peine.
    // La couche de vie est un agrément : elle ne prend jamais plus d'un
    // sixième du fil, sinon c'est le jeu qui la paie.
    if (!document.hidden && ts - vieDernier >= Math.max(VIE_PAS_MS, coutVie * 6)) {
      vieDernier = ts;
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      dessinerVie(cv, fond, ts);
      const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      coutVie = coutVie * 0.7 + (t1 - t0) * 0.3;
    }
    if (!immobile) vieRaf = requestAnimationFrame(pas);
  };
  vieRaf = requestAnimationFrame(pas);
}

function dessinerVie(cv, fond, ts) {
  if (cv.width !== fond.width || cv.height !== fond.height) {
    cv.width = fond.width;
    cv.height = fond.height;
  }
  const g = cv.getContext('2d');
  const L = cv.width;
  const H = cv.height;
  g.clearRect(0, 0, L, H);
  const cond = conditions(S.world, S.temps);
  const s = ts / 1000;

  // Les feux des villes : une braise qui respire au coin de chaque ville
  // relevée. Le scintillement dérive de la case et d'un compteur d'images —
  // déterministe à l'œil, comme promis par l'étude.
  const bougie = Math.floor(ts / 260) % 97;
  for (const f of vieFoyers) {
    const b = bruit(f.r, 7 + bougie);
    // Le halo d'abord, la flamme dessus : un feu se voit de loin.
    g.globalAlpha = 0.14 + b * 0.12;
    g.fillStyle = '#d9803a';
    g.fillRect(f.x + f.taille - 2, f.y - 3, 4, 4);
    g.globalAlpha = 0.5 + b * 0.45;
    g.fillStyle = '#e8a050';
    g.fillRect(f.x + f.taille - 1, f.y - 2, 2, 2);
  }

  // Les convois cheminent : un fanal court le long du marqueur.
  const pasFanal = Math.max(2, CELL - 6);
  for (const c of vieConvois) {
    const o = (s * 7 + bruit(c.r, 41) * pasFanal) % pasFanal;
    g.globalAlpha = 0.75;
    g.fillStyle = '#f2f6fb';
    g.fillRect(c.x + 2 + o, c.y + CELL - 4, 2, 1);
  }

  // Les colonnes en marche battent comme un pouls, dans leur couleur.
  for (let i = 0; i < vieColonnes.length; i++) {
    const a = vieColonnes[i];
    g.globalAlpha = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(s * 2.6 + i * 1.7));
    g.strokeStyle = couleurFaction(a.k);
    g.lineWidth = 1;
    g.strokeRect(a.x - 1.5, a.y - 1.5, a.taille + 3, a.taille + 3);
  }

  // La cendre dérive au vent — toujours, c'est le climat de ce monde. Le vent
  // de la météo la pousse plus fort, et le vent de cendre la densifie.
  const vent = (cond.meteo.vent || 1);
  const nCendre = cond.meteoKey === 'vent_cendre' ? 130 : 60;
  g.fillStyle = 'rgba(214,205,190,1)';
  for (let i = 0; i < nCendre; i++) {
    const allant = 0.45 + bruit(i, 5) * 0.9;
    const px = (bruit(i, 3) * L + s * 15 * vent * allant) % L;
    const py = (bruit(i, 11) * H + s * 4 * vent * allant) % H;
    g.globalAlpha = 0.1 + bruit(i, 17) * 0.22;
    const gr = bruit(i, 19) > 0.8 ? 2 : 1;
    g.fillRect(px, py, gr, gr);
  }

  // La pluie acide strie l'écran ; l'orage sec le zèbre d'un éclair fugace.
  if (cond.meteoKey === 'pluie_acide') {
    g.strokeStyle = 'rgba(176,107,224,0.3)';
    g.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const px = (bruit(i, 23) * L + s * 9) % L;
      const py = (bruit(i, 29) * H + s * 170 * (0.7 + bruit(i, 31) * 0.6)) % H;
      g.globalAlpha = 0.2 + bruit(i, 37) * 0.2;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px - 2, py + 8);
      g.stroke();
    }
  } else if (cond.meteoKey === 'orage_sec') {
    // Un éclair par cycle d'environ cinq secondes, pas à chaque image.
    const cycle = Math.floor(ts / 5200);
    if (ts % 5200 < 130) {
      const px = bruit(cycle, 43) * L;
      g.globalAlpha = 0.5;
      g.strokeStyle = '#e0d36b';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px + 8 - bruit(cycle, 47) * 16, H * 0.4);
      g.lineTo(px + 20 - bruit(cycle, 53) * 40, H * 0.8);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
}


// ---------------------------------------------------------------------------
// Écran CARTE
// ---------------------------------------------------------------------------

function etaVoyage(dest) {
  const mods = { reductionVoyage: (S.base.recherche.logistique || 0) * 0.06 };
  const route = chemin(S.world, G().regionId, dest, mods);
  if (!route) return null;
  let h = 0;
  for (const i of route) h += coutTraversee(S.world, i, mods);
  const debout = G().membres.filter(estDebout);
  let v = 1;
  if (debout.length) v = Math.min(...debout.map((c) => 0.5 + comp(c, 'endurance') / 90));
  return { heures: Math.ceil(h / Math.max(0.2, v)), cases: route.length };
}

function blocFil() {
  // Le fil : ce qui vient de se passer, sous les yeux, sans aller le chercher
  // dans le journal. C'est ce qui manquait le plus.
  const recentes = S.journal.filter((x) => !x.discret).slice(-7).reverse();
  if (!recentes.length) return '';
  return `<section class="panneau">
    <h2 class="titre">Dernières nouvelles
      <span class="resume">${recentes.length
    ? e(`${horloge(recentes[0].t).texte} — ${recentes[0].texte}`.slice(0, 90))
    : 'rien à signaler'}</span>
      <span class="droite">${recentes.length}</span></h2>
    <div class="fil">
      ${recentes.map((x) => `<div class="fil-l ${couleurLog(x.type)}">
        <span class="fil-t">${horloge(x.t).texte}</span>
        <span class="fil-x">${e(x.texte)}</span>
      </div>`).join('')}
    </div>
  </section>`;
}

/**
 * Le point de situation : où l'on en est, en tête de l'écran principal.
 *
 * Le jeu affichait des rendements horaires, des stocks et des pourcentages, et
 * jamais la seule phrase qui compte : est-ce que ça va, et sinon, quoi. On
 * pouvait mourir de faim avec un sac plein de ferraille, parce que rien ne
 * disait « il vous reste deux jours de vivres ».
 *
 * Trois registres, dans cet ordre — ce qui presse, ce qui vient, ce qu'on fait.
 * Muet sur ce qui va bien : un panneau qui parle tout le temps ne se lit plus.
 */
function donneesSituation() {
  const g = G();
  if (!g) return { urgences: [], bientot: [] };
  const urgences = [];
  const bientot = [];
  // Chaque ligne pointe vers l'écran où elle se règle (ALLURE.md, Q7) : le
  // point de situation est le guide parfait d'une simulation — il n'invente
  // rien, il pointe.
  let cible = 'escouade';
  const presse = (t) => urgences.push({ t, o: cible });
  const note = (t) => bientot.push({ t, o: cible });

  const jours = autonomie(S, g);
  const rations = Math.floor(g.inventaire.rations || 0);
  if (!Number.isFinite(jours)) {
    // Personne ne mange : tout le monde est mort ou l'escouade est vide.
  } else if (jours < 1) {
    presse(`Plus rien à manger — ${pl(rations, 'ration')}. On commence à mourir de faim.`);
  } else if (jours < 3) {
    presse(`${jours.toFixed(1).replace('.', ',')} jour${jours >= 2 ? 's' : ''} de vivres. Il faut trouver à manger maintenant.`);
  } else if (jours < 8) {
    note(`${Math.round(jours)} jours de vivres`);
  }

  const vivants = g.membres.filter(estVivant);
  const aTerre = vivants.filter((c) => !estDebout(c));
  if (aTerre.length) {
    presse(`${aTerre.map((c) => c.nom).join(', ')} ${aTerre.length > 1 ? 'sont' : 'est'} `
      + 'à terre. On ne les porte pas indéfiniment.');
  }
  const amoches = vivants.filter((c) => estDebout(c) && pvTotal(c).pct < 0.5);
  if (amoches.length) note(`${pl(amoches.length, 'blessé sérieux', 'blessés sérieux')}`);

  // Les morts qu'on porte encore. Le panneau qui permet d'en décider vit sur
  // l'écran d'escouade, et rien ne renvoyait vers lui : on pouvait traîner un
  // corps des jours durant — marche ralentie, moral qui pèse — sans savoir que
  // c'était une décision en attente. C'est aussi la toute première du jeu,
  // depuis qu'on se réveille à côté de celui avec qui on voyageait.
  const corps = depouillesDe(g);
  if (corps.length) {
    presse(`${corps.map((c) => c.nom).join(', ')} ${corps.length > 1 ? 'sont morts' : 'est mort'}`
      + ' et la colonne le porte encore — à régler sur l’écran d’escouade :'
      + ' enterrer, ou dépouiller.');
  }

  const cap = capacitePortage(S, g);
  const poids = poidsInventaire(g.inventaire);
  if (cap > 0 && poids > cap * 0.98) {
    note('sac plein : on laisse du butin sur place');
  }

  // Une colonne en marche sur votre camp est la seule chose du jeu qu'on peut
  // perdre entièrement sans avoir joué : elle met des centaines d'heures à
  // arriver, et l'on n'en était averti que par l'épitaphe.
  cible = 'base';
  for (const m of menacesSurLaBase(S)) {
    const t = `${drapeauDe(S.world, m.faction).nom} marche sur ${S.base.nom} — ${m.vue
      ? `${n(m.force)} hommes` : 'nombre inconnu'}, `
      + `${m.cases <= 0 ? 'ils y sont' : `${m.cases} région${m.cases > 1 ? 's' : ''}`}`;
    if (m.cases <= 4) presse(`${t}.`);
    else note(t);
  }
  // La bande que la vigie a vue venir (SIEGE.md, S2) : quelques heures pour agir.
  if (S.base.fonde && S.base.raidImminent) {
    const reste = S.base.raidImminent.echeance - S.temps;
    presse(`La vigie signale une bande sur ${S.base.nom} — assaut `
      + `${reste <= 0 ? 'imminent' : `d’ici ${dureeTexte(reste)}`}.`);
  }

  // Les échéances : ce qui va se retourner contre vous si vous l'oubliez.
  cible = 'contrats';
  const all = g.allegeance;
  if (all && all.ordre && all.ordre.echeance) { // sans délai : rien qui presse
    const reste = all.ordre.echeance - S.temps;
    const t = `ordre « ${all.ordre.titre} » — ${dureeTexte(Math.max(0, reste))}`;
    if (reste < 72) presse(`${t} avant l’échéance.`);
    else note(t);
  }
  for (const c of S.player.contrats) {
    if (!c.echeance) continue; // sans délai : rien qui presse
    const reste = c.echeance - S.temps;
    const t = `contrat « ${c.titre} » — ${dureeTexte(Math.max(0, reste))}`;
    if (reste < 48) presse(`${t} avant l’échéance.`);
    else note(t);
  }

  return { urgences, bientot };
}

function blocSituation() {
  const { urgences, bientot } = donneesSituation();
  if (!urgences.length && !bientot.length) return '';
  return `<section class="panneau ${urgences.length ? 'urgent' : ''}">
    <h2 class="titre">Point de situation
      <span class="droite ${urgences.length ? 'alerte' : ''}">${urgences.length
    ? `${urgences.length} à régler` : 'rien de pressant'}</span></h2>
    ${urgences.map((u) => `<button class="lien alerte" data-a="onglet" data-k="${u.o}">▲ ${e(u.t)}</button>`).join('')}
    ${bientot.length ? `<div class="aide">${bientot.map((u) => e(u.t)).join(' · ')}</div>` : ''}
  </section>`;
}

function blocSite() {
  const r = S.world.regions[G().regionId];
  if (!r.site || !r.site.connu) return '';
  const def = POI[r.site.type];
  if (r.site.fouille) {
    return `<section class="panneau">
      <h2 class="titre">${e(def.nom)} <span class="droite">vidé</span></h2>
      ${r.site.butin
    ? `<div class="aide">On en a tiré : ${e(r.site.butin)}.</div>`
    : ''}
      <div class="aide">Il n’y a plus rien à en tirer.</div>
    </section>`;
  }
  const debout = G().membres.filter(estDebout);
  const ing = debout.length ? Math.max(...debout.map((c) => comp(c, 'ingenierie'))) : 0;
  const bloque = def.reqIngenierie && ing < def.reqIngenierie;
  return `<section class="panneau site">
    <h2 class="titre">${e(def.nom)} <span class="droite">site non fouillé</span></h2>
    <div class="aide">${e(def.texte)}</div>
    <div class="ligne"><span class="k">Risque</span>
      <span class="v">${def.danger > 0.4 ? 'élevé' : def.danger > 0.25 ? 'moyen' : 'faible'}</span></div>
    ${def.reqIngenierie ? `<div class="ligne"><span class="k">Ingénierie requise</span>
      <span class="v ${bloque ? 'alerte' : ''}">${def.reqIngenierie} (vous : ${Math.round(ing)})</span></div>` : ''}
    <div class="sep"></div>
    <button class="act primaire" data-a="fouiller-site" ${bloque || !debout.length ? 'disabled' : ''}>
      ${bloque ? 'Hors de portée'
    : !debout.length ? 'Personne ne tient debout' : 'Fouiller le site'}</button>
  </section>`;
}

function blocCaravanes() {
  const ici = caravanesIci(S);
  if (!ici.length) return '';
  return `<section class="panneau">
    <h2 class="titre">Caravane de passage</h2>
    ${ici.map((car, i) => {
    const de = colonieParId(S.world, car.deId);
    const vers = colonieParId(S.world, car.versId);
    const rep = S.player.reputation[car.faction] || 0;
    return `<div class="article">
      <div class="ligne"><span class="k" style="color:${couleurFaction(car.faction)}">${e(drapeauDe(S.world, car.faction).nom)}</span>
        <span class="v ambre">~${n(valeurCargaison(car))} ${sym()} de marchandise</span></div>
      <div class="aide">${e(de ? de.nom : '?')} → ${e(vers ? vers.nom : '?')} ·
        escorte ${n(car.escorte)} ·
        ${Object.keys(car.cargaison).map((k) => `${n(car.cargaison[k])} ${COMMODITIES[k].nom.toLowerCase()}`).join(', ')}</div>
      <div class="aide alerte">Les attaquer coûte 22 points de réputation${rep < -20 ? ' — déjà mal vu ici.' : '.'}</div>
      <button class="act mini danger" data-a="attaquer-caravane" data-k="${e(car.id)}">Tendre une embuscade</button>
    </div>`;
  }).join('')}
  </section>`;
}

function blocContratsActifs() {
  const liste = S.player.contrats;
  if (!liste.length) return '';
  return `<section class="panneau">
    <h2 class="titre">Contrats en cours <span class="droite">${liste.length}/${MAX_CONTRATS}</span></h2>
    ${liste.map((c) => {
    const p = progresContrat(S, c);
    const reste = (c.echeance || 0) - S.temps;
    return `<div style="padding:4px 0">
        <div class="ligne souple"><span class="k">${e(c.titre)}</span>
          <span class="v ${c.echeance && reste < 48 ? 'alerte' : ''}">${c.echeance
    ? dureeTexte(Math.max(0, reste)) : 'sans délai'}</span></div>
        ${jauge(p.total ? p.fait / p.total : 0, p.pret ? 'vert' : '')}
        <div class="aide">${e(p.texte)}${p.texte.includes(lieuValidation(S, c))
    ? '' : ` · à rendre à ${e(lieuValidation(S, c))}`}</div>
      </div>`;
  }).join('')}
  </section>`;
}

/**
 * Qui fait quoi dans le groupe, quand tout le monde ne fait pas la même chose.
 * Muet tant qu'il n'y a rien à signaler : l'ordre du groupe suffit alors.
 */
function blocRepartition() {
  const g = G();
  const rep = repartition(g);
  const clefs = Object.keys(rep);
  if (clefs.length <= 1) return '';
  return `<div class="aide" style="color:var(--cyan)">Réparti : ${clefs
    .map((k) => `${rep[k]} × ${ORDRES[k] ? ORDRES[k].nom.toLowerCase() : k}`).join(' · ')}</div>`;
}

/**
 * Partir, et à quelle allure. Une escouade campe la nuit ; la marche forcée
 * gagne un tiers de temps et se paie en fatigue — laquelle ronge toutes les
 * compétences, jusqu'à trente pour cent quand elle s'installe.
 */
function boutonsDepart(dest, eta) {
  const nuits = Math.max(0, Math.floor(eta.heures / 24));
  return `<button class="act primaire" data-a="voyage" data-r="${dest}">
      Y aller — ${dureeTexte(eta.heures)} (${eta.cases} régions)</button>
    <div style="height:6px"></div>
    <button class="act" data-a="voyage" data-r="${dest}" data-f="1">
      Marche forcée — ${dureeTexte(Math.round(eta.heures * 0.68))}, sans dormir</button>
    <div class="aide">${nuits > 0
      ? `${nuits} nuit${nuits > 1 ? 's' : ''} de camp sur la route, ou aucune.`
      : 'Moins d’une nuit de route.'} La fatigue ronge toutes les compétences.</div>`;
}

function blocRegionCourante() {
  const rid = G().regionId;
  const r = S.world.regions[rid];
  const b = BIOMES[r.biome];
  const col = colonieDe(S.world, rid);
  const o = G().ordre;
  const ici = S.base.fonde && S.base.regionId === rid;

  // Ce que l'ordre en cours rapporte, détaillé
  const prevActuel = rendementPrevu(S, o.type);
  const detailRendement = prevActuel && prevActuel.total > 0
    ? Object.keys(prevActuel.par).sort((a, x) => prevActuel.par[x] - prevActuel.par[a])
      .map((k) => `${COMMODITIES[k].nom.toLowerCase()} ${prevActuel.par[k].toFixed(2)}`).join(' · ')
    : null;

  let enTete = ORDRES[o.type] ? ORDRES[o.type].nom : 'Repos';
  let progression = '';
  if (o.type === 'voyage') {
    const restant = o.route.length - o.etape;
    const eta = etaVoyage(o.dest);
    enTete = `${o.allure === 'forcee' ? 'Marche forcée' : 'En route'} — ${restant} région${restant > 1 ? 's' : ''}`;
    progression = `${jauge(o.route.length ? o.etape / o.route.length : 0, 'cyan')}
      <div class="aide">Vers ${e(lieuAvecCoord(S.world, o.dest))}${eta ? ` · encore ${dureeTexte(eta.heures)}` : ''}
        · ${o.allure === 'forcee' ? 'on ne dort pas' : 'camp la nuit'}</div>`;
  }

  // Sur les terres de quelqu'un, ce qu'il pense de vous décide de ce qui sort
  // du bois : hissé dans la barre de « Position », lisible même repliée.
  const ef = r.controle ? effetsEstime(S, r.controle) : null;

  return `
  ${col && !col.ruine ? blocColonie(col) : ''}
  <section class="panneau">
    <h2 class="titre">Ordre de ${e(G().nom)} <span class="droite">${e(enTete)}</span></h2>
    ${progression}
    <div class="aide" style="margin-top:6px">${e(ORDRES[o.type] ? ORDRES[o.type].desc : '')}</div>
    ${detailRendement ? `<div class="aide" style="color:var(--texte-2)">Ici : ${e(detailRendement)} par heure de travail.</div>` : ''}
    ${G().recolteHeure ? `<div class="aide" style="color:var(--vert)">Dernière heure : ${e(G().recolteHeure)}</div>` : ''}
    ${blocRepartition()}
    ${ici ? `<div class="sep"></div>
      <button class="act" data-a="modale" data-m="transfert">Transférer des ressources vers l’avant-poste</button>` : ''}
  </section>

  ${blocSite()}

  <section class="panneau">
    <h2 class="titre">Position
      ${ef ? `<span class="resume">ils vous voient : <span class="puce ${couleurEstime(ef.rep)}">${ef.rep > 0 ? '+' : ''}${n(ef.rep)} ${e(ef.palier.nom.toLowerCase())}</span></span>` : ''}
      <span class="droite">${e(lieuAvecCoord(S.world, rid))}</span></h2>
    <div class="ligne"><span class="k">Biome</span><span class="v">${e(b.nom)}</span></div>
    <div class="ligne"><span class="k">Richesse</span><span class="v">×${r.richesse.toFixed(2)}</span></div>
    <div class="ligne"><span class="k">Épuisement</span><span class="v">${(r.fouille * 100).toFixed(0)} %</span></div>
    <div class="ligne"><span class="k">Rencontres</span><span class="v">${(r.danger * 100).toFixed(1)} %/h</span></div>
    <div class="ligne"><span class="k">Aléa</span><span class="v">${e(b.hazard.nom)}</span></div>
    <div class="ligne"><span class="k">Ciel</span>
      <span class="v" style="color:${conditions(S.world, S.temps).meteo.couleur}">${e(conditions(S.world, S.temps).meteo.nom)}</span></div>
    ${ef ? `<div class="ligne"><span class="k">Territoire</span>
      <span class="v" style="color:${couleurFaction(r.controle)}">${e(drapeauDe(S.world, r.controle).nom)}</span></div>
      <div class="ligne"><span class="k">Ils vous voient</span>
        <span class="v"><span class="puce ${couleurEstime(ef.rep)}">${ef.rep > 0 ? '+' : ''}${n(ef.rep)}
          ${e(ef.palier.nom.toLowerCase())}</span></span></div>
      ${ef.perdu.length ? `<div class="aide alerte">${e(ef.perdu[0])}.</div>` : ''}` : ''}
  </section>`;
}

/**
 * Le panneau de la ville où l'on se trouve : forcément de première main.
 *
 * On n'appelle jamais ceci sur une ruine — une ville effondrée n'a plus de
 * drapeau, et l'affichage plantait sur ce cas dès qu'une partie durait assez
 * pour qu'une ville s'éteigne sous les pieds du joueur.
 *
 * Mais le garde-fou confondait « morte » et « sans drapeau », et faisait donc
 * disparaître **tout le panneau — marché, recrutement, contrats, armurier —**
 * dans une ville affranchie. Or une ville libre est bien vivante : elle a un
 * étal, un banc de recrutement, et c'est même le seul endroit où certaines
 * choses se négocient. On ne saute plus que sur les ruines, et l'absence de
 * drapeau s'affiche au lieu de tout emporter.
 */
/**
 * Le mot qui dit l'état d'un cours, avec les bornes d'`ecranMonde` et pas
 * d'autres. « Effondrée » sous 0,1, « envolée » au-dessus de 10 : les deux
 * extrêmes existent depuis le lot H, et deux écrans qui les nommeraient avec
 * des seuils différents referaient l'incident des cinq couleurs d'estime.
 */
function etatCours(c) {
  return c <= 0.1 ? 'effondrée'
    : c >= 10 ? 'envolée'
      : c < 0.85 ? 'faible' : c > 1.2 ? 'forte' : 'tenue';
}

/**
 * Une porte de ville : le libellé, et dessous le fait qui dit ce qu'il y a
 * derrière. Neuf boutons typographiquement identiques ne disaient ni si les
 * vivres étaient chers, ni si quelqu'un voulait partir, ni que la monnaie
 * s'était effondrée — tout était derrière le clic (INTERFACE.md, U1).
 */
function porte(m, libelle, fait, opts = {}) {
  return `<button class="act mini porte${opts.primaire ? ' primaire' : ''}"
    ${opts.large ? 'style="grid-column:1/-1"' : ''} data-a="modale" data-m="${m}">
    ${libelle}<span class="fait${opts.alerte ? ' alerte' : ''}">${fait}</span></button>`;
}

/** Les neuf portes, chacune avec son fait — tout sort de fonctions du moteur. */
function portesDeVille(col, libre, repu) {
  const negoc = meilleurCommercant(G().membres);
  const habC = negoc ? comp(negoc, 'commerce') : 0;
  const vivres = prixJoueur(col, 'rations', habC, repu, 0, undefined, S.world);
  const etal = col.etal && col.etal.items ? col.etal.items.length : 0;
  const affiches = col.contrats ? col.contrats.length : 0;
  const banc = bancDerive(col, S.temps, S.world.graine).gens.length;
  const betes = betesDe(G()).length;
  const coffre = coffreDe(S, col.id);
  const ecoles = ecolesDe(S.world, col).length;
  const c = col.faction ? coursMonnaie(S.world, col.faction) : 1;
  const etatC = etatCours(c);
  return [
    porte('marche', 'Marché', `vivres ${n(vivres.achat, 1)} ${sym()}`, { primaire: true }),
    porte('etal', 'Équipement', etal ? `${etal} article${etal > 1 ? 's' : ''}` : 'étal vide',
      { primaire: true }),
    porte('panneau', 'Contrats', affiches
      ? `${affiches} affiche${affiches > 1 ? 's' : ''}` : 'rien d’affiché'),
    porte('recrutement', 'Recruter', banc
      ? `${banc} candidat${banc > 1 ? 's' : ''}` : 'personne ne part'),
    porte('attelage', 'Attelage', betes
      ? `${betes} bête${betes > 1 ? 's' : ''}` : 'rien d’attelé'),
    porte('coffre', 'Coffre', coffre
      ? `${Math.round(placeCoffre(coffre).pris)} kg dedans` : 'à louer'),
    bureauDe(col) ? porte('change', 'Change',
      libre ? 'toutes monnaies' : `monnaie ${etatC} · ${n(c, 2)}`,
      { alerte: etatC === 'effondrée' || etatC === 'envolée' }) : '',
    ecoles ? porte('ecole', 'Écoles',
      `${ecoles} porte${ecoles > 1 ? 's' : ''} ouverte${ecoles > 1 ? 's' : ''}`,
      { large: true }) : '',
    porte('ville', 'Qui vit ici',
      `${n(col.pop)} habitants · ${n(actifs(col))} actifs`, { large: true }),
  ].join('');
}

function blocColonie(col) {
  if (!col || col.ruine) return '';
  const libre = !drapeauDe(S.world, col.faction);
  const repu = libre ? 0 : (S.player.reputation[col.faction] || 0);
  const cls = couleurEstime(repu);
  return `
  <section class="panneau">
    <h2 class="titre">${e(col.nom)}
      <span class="droite" style="color:${couleurFaction(col.faction)}">${libre
    ? 'ville libre' : e(drapeauDe(S.world, col.faction).nom)}</span></h2>
    <div class="grille2">
      <div class="ligne"><span class="k">Population</span><span class="v">${n(col.pop)}</span></div>
      <div class="ligne"><span class="k">Défense</span><span class="v">${n(col.defense)}</span></div>
      <div class="ligne"><span class="k">Agitation</span><span class="v">${(col.unrest * 100).toFixed(0)} %</span></div>
      ${libre
    ? `<div class="ligne"><span class="k">Loi</span>
        <span class="v">celle du plus fort</span></div>`
    : `<div class="ligne"><span class="k">Réputation</span><span class="v"><span class="puce ${cls}">${repu > 0 ? '+' : ''}${n(repu)}</span></span></div>`}
    </div>
    ${libre ? '' : blocEstime(col)}
    ${blocRegime(col)}
    <div class="sep"></div>
    <div class="grille2" style="gap:5px">
      ${portesDeVille(col, libre, repu)}
    </div>
    ${blocEngagement(col)}
  </section>`;
}

/**
 * À quoi sert l'estime, écrit là où elle s'affiche.
 *
 * Le chiffre existait depuis le début, il commandait huit choses, et rien ne le
 * disait nulle part — on le voyait descendre après un ordre manqué sans savoir
 * ce qu'on venait de perdre. Replié par défaut : c'est une explication, pas une
 * alarme. Sauf quand on est en territoire hostile, où c'en est une.
 */
/**
 * La couleur d'une estime, tirée de son palier et non de seuils recopiés.
 *
 * Cinq endroits coloraient le même chiffre, avec trois bornes différentes :
 * vert au-dessus de 20 ici, de 25 là, rouge sous −20 partout sauf à un endroit
 * où c'était sous 0. Le joueur voyait donc « +22 » en vert sur un écran et en
 * ambre sur l'autre, pour la même faction, à la même seconde. Les paliers
 * existent, ils portent déjà ces bornes : on les relit.
 */
function couleurEstime(rep) {
  const p = palierEstime(rep);
  if (p.seuil <= -20) return 'mal';
  if (p.seuil >= 25) return 'ok';
  return 'att';
}

function blocEstime(col) {
  const ef = effetsEstime(S, col.faction);
  const grave = ef.rep < 0;
  const cle = `estime-${col.faction}`;
  const ligne = (t) => `<div class="aide">· ${e(t)}</div>`;
  return `<details data-id="${cle}" ${ouverts.has(cle) || grave ? 'open' : ''}>
    <summary class="ligne souple">
      <span class="k">Ce que votre estime change ici</span>
      <span class="v"><span class="puce ${couleurEstime(ef.rep)}">${e(ef.palier.nom)}</span></span>
    </summary>
    ${ef.perdu.length
    ? `<div class="aide alerte">Ce que ça vous coûte :</div>${ef.perdu.map(ligne).join('')}`
    : ''}
    ${ef.acquis.length
    ? `<div class="aide">Ce que ça vous ouvre :</div>${ef.acquis.map(ligne).join('')}`
    : (ef.perdu.length ? '' : '<div class="aide">Rien, pour l’instant : on ne vous connaît pas.</div>')}
    ${ef.suivant
    ? `<div class="aide cyan">À +${n(ef.suivant.manque)} — ${e(ef.suivant.nom)} :
        ${e(ef.suivant.faits[0])}.</div>` : ''}
    ${ef.menace
    ? `<div class="aide alerte">À −${n(ef.menace.marge)} — ${e(ef.menace.nom)} :
        on vous cherchera.</div>` : ''}
  </details>`;
}

/**
 * Sous quel régime on se trouve, et ce que ça change concrètement.
 *
 * Un régime qui ne s'annonce pas est un piège : le joueur pousse le bouton
 * « acheter un coffre », on lui répond non, et il ne sait pas si c'est sa
 * réputation, sa bourse ou la loi du lieu. On dit donc les quatre choses qui
 * changent — posséder, s'instruire, se faire soigner, ce qu'on retient sur les
 * ventes — avant qu'il ne pousse le bouton.
 */
function blocRegime(col) {
  const r = loiIci(S, col).regime;
  const dit = [
    r.propriete === null ? 'rien à posséder'
      : `coffre dès ${r.propriete} d’estime`,
    r.ecole === 'libre' ? 'école gratuite'
      : r.ecole === 'maison' ? 'école réservée aux siens' : 'école payante',
    r.soins === 'tous' ? 'médecin pour tous' : 'médecin sur estime',
    r.preleve ? `${Math.round(r.preleve * 100)} % sur vos ventes` : 'rien sur vos ventes',
    r.palier ? 'armurier généreux' : '',
  ].filter(Boolean).join(' · ');
  // Ligne ordinaire, et non `souple` : ici l'étiquette est courte (« Domaine »)
  // et c'est la valeur qui est longue. `souple` fait l'inverse — elle empêche la
  // valeur de céder, ce qui écrase l'étiquette à un caractère de large et fait
  // tomber « Domaine » lettre par lettre. La classe s'emploie quand le texte
  // libre est à gauche, jamais quand il est à droite.
  return `<div class="ligne"><span class="k">${e(r.nom)}</span>
      <span class="v aide">${e(r.desc)}</span></div>
    <div class="aide">${e(dit)}.</div>`;
}

/**
 * Ce que ce drapeau-ci donne et qu'aucun autre ne donne.
 *
 * On le montre **avant** de s'engager, et c'est tout l'intérêt : les six
 * services offrent exactement la même chose — mêmes grades, même remise, même
 * solde, mêmes rations — et se distinguent par un seul avantage chacun. Cacher
 * cet avantage jusqu'à l'avoir mérité ferait du choix de couleur un tirage au
 * sort qu'on regrette trois cents heures plus tard.
 */
function blocExtra(faction, dejaAuService) {
  const s = serviceDe(faction);
  if (!s) return '';
  const rang = RANGS[s.rang];
  const tenu = !!avantage(S, s.cle);
  const acquis = dejaAuService && tenu;
  // La mention passe sous le titre plutôt qu'à côté : collée au nom, elle se
  // coupait au milieu — « La colonne qui vient ce » puis « qu'eux seuls
  // donnent » à la ligne suivante.
  return `<div class="sep"></div>
    <div class="ligne souple">
      <span class="k">${acquis ? '✓ ' : ''}${e(s.nom)}</span>
      <span class="v ${acquis ? 'ok' : ''}">${acquis ? 'acquis' : `dès ${e(rang.nom)}`}</span>
    </div>
    <div class="aide">Ce qu’eux seuls donnent. ${e(s.desc)}</div>`;
}

function blocEngagement(col) {
  const all = G() && G().allegeance;
  if (all && all.faction === col.faction) {
    const rang = rangDe(all);
    return `<div class="sep"></div>
      <div class="ligne"><span class="k">Vous servez ici</span>
        <span class="v" style="color:${couleurFaction(col.faction)}">${e(rang.def.nom)}</span></div>
      ${blocExtra(col.faction, true)}`;
  }
  if (all) return '';
  // Une ville libre ne recrute personne à son service : il n'y a pas de service.
  if (!drapeauDe(S.world, col.faction)) {
    return `<div class="sep"></div>
      <div class="aide">Personne ne commande ici : il n’y a pas d’engagement à prendre.</div>`;
  }
  const v = peutSEngager(S, col.faction);
  const rep = S.player.reputation[col.faction] || 0;
  return `${blocExtra(col.faction, false)}
    <div class="aide">Le reste est le même partout : les mêmes grades, la même remise,
      la même solde, les mêmes rations. On ne choisit pas ce qu’on sacrifie,
      on choisit ce qu’on gagne.</div>
    <div class="sep"></div>
    <button class="act mini" data-a="engager" data-k="${e(col.faction)}" ${v.ok ? '' : 'disabled'}>
      ${v.ok ? `Entrer au service ${e(drapeauDe(S.world, col.faction).genitif)}`
    : `Engagement refusé — estime ${Math.round(rep)}/${estimeEngagement(col.faction)}`}</button>`;
}

function blocSelection() {
  if (selection == null || selection === G().regionId) return '';
  const r = S.world.regions[selection];
  const col = colonieDe(S.world, selection);
  const eta = etaVoyage(selection);
  const c = coord(selection);
  const nomCase = `${String.fromCharCode(65 + c.x)}${c.y + 1}`;

  if (!r.decouvert) {
    return `<section class="panneau">
      <h2 class="titre">Secteur ${nomCase} <span class="droite">inexploré</span></h2>
      <div class="aide">Rien de connu sur ce secteur. Il faudra aller voir.</div>
      ${eta ? `<div class="sep"></div>${boutonsDepart(selection, eta)}` : ''}
    </section>`;
  }

  // Ce qu'on sait, pas ce qui est : la carte est un souvenir sauf là où l'on a
  // quelqu'un. Le relevé porte sa date, à charge au joueur d'en tenir compte.
  const su = col ? vueColonie(S, col) : null;
  return `<section class="panneau">
    <h2 class="titre">${e(col ? (su.nom || col.nom) : `Secteur ${nomCase}`)}
      <span class="droite">${e(BIOMES[r.biome].nom)}</span></h2>
    ${col ? (su.inconnu
    ? '<div class="aide">Une ville, d’après la carte. On n’y a jamais mis les pieds.</div>'
    : `${su.frais ? '' : `<div class="aide">Relevé ${e(ageTexte(su.depuis))}${su.perime ? ' — probablement caduc' : ''}.</div>`}
      <div class="ligne"><span class="k">Tenue par</span>
      <span class="v" style="color:${couleurFaction(su.faction)}">${e(su.faction ? drapeauDe(S.world, su.faction).nom : 'sans maître')}</span></div>
      <div class="ligne"><span class="k">Population</span><span class="v">${n(su.pop)}</span></div>
      <div class="ligne"><span class="k">Défense</span><span class="v">${n(su.defense)}</span></div>`) : ''}
    <div class="ligne"><span class="k">Distance</span><span class="v">${distance(G().regionId, selection)} cases</span></div>
    <div class="ligne"><span class="k">Rencontres</span><span class="v">${(r.danger * 100).toFixed(1)} %/h</span></div>
    ${armeesIci(selection)}
    <div class="sep"></div>
    ${eta ? boutonsDepart(selection, eta) : '<div class="aide">Aucune route connue.</div>'}
  </section>`;
}

function armeesIci(rid) {
  // Ce qu'on SAIT de ce secteur : le frais en direct, le relevé avec sa
  // date — « le monde a bougé, pas votre savoir » (MARECHAL.md, M5).
  const la = armeesConnues(S).filter((v) => v.regionId === rid);
  if (!la.length) return '';
  return la.map((v) => `<div class="ligne"><span class="k">Colonne</span>
    <span class="v" style="color:${couleurFaction(v.faction)}">${e(drapeauDe(S.world, v.faction).nom)} · ${n(v.force)} · ${e(v.etat)}${v.frais
    ? '' : ` <span class="aide">${e(ageTexte(v.depuis))}</span>`}</span></div>`).join('');
}

/**
 * Le bandeau de dévaluation (ECONOMIE §10).
 *
 * Il est **au-dessus de tous les écrans**, et pas dans un onglet : une monnaie
 * qui s'effondre ne se range pas sous « monde » ou sous « escouade ». C'est le
 * contrepoids assumé du choix d'afficher les prix en monnaie locale seule —
 * sans lui, on se ferait laminer sans jamais rien voir venir, parce qu'aucun
 * écran ne dit plus ce que vaut le portefeuille.
 *
 * Il ne s'efface pas tout seul. Une alerte qu'on rate parce qu'on avait fermé
 * l'onglet est une alerte qui n'a servi à rien, et c'est exactement le reproche
 * qu'on fait au journal, où la ligne défile derrière quatre cents autres.
 */
/**
 * Le bandeau de siège (M2, ALLURE.md).
 *
 * Un siège sur le camp est l'événement le plus grave que le monde puisse
 * infliger au joueur, et il n'était dit que par des lignes de journal et
 * l'écran Base : on pouvait régler son étal pendant qu'on perdait sa ville.
 * Tant que ça dure, ça se voit — sur tous les écrans, comme la dévaluation.
 */
/**
 * Le bandeau d'écriture refusée.
 *
 * Il existait déjà un signe : le pictogramme de la barre du haut passait de ⛁
 * à ⚠. Il n'a pas suffi, et ce qu'il a coûté est connu — le propriétaire a
 * joué des heures sur un stockage plein, puis retrouvé sa partie ramenée à
 * l'instant où l'écriture s'est fermée : « plusieurs améliorations que j'avais
 * faites sur ma base ont disparu ». Une écriture qui ne passe plus n'est pas
 * un détail d'état : c'est tout ce qu'on fait ensuite qui n'existe pas.
 *
 * Donc : au-dessus de tous les écrans, comme la dévaluation et le siège, et
 * porteur de son verbe — le panneau des sauvegardes, où l'on met la partie en
 * fichier et où l'on fait de la place.
 */
function bandeauSauvegarde() {
  const et = etatSauvegarde();
  if (et.ok) return '';
  return `<section class="panneau urgent" id="bandeau-sauvegarde">
    <h2 class="titre alerte">La partie ne s’écrit plus
      <span class="droite">${n(et.echecs)} refus</span></h2>
    <div class="aide">${e(et.motif || 'Écriture refusée.')}</div>
    <div class="aide">Tout ce que vous faites depuis n’est gardé nulle part : en
      fermant l’onglet, cela n’aura pas eu lieu. Mettez la partie en fichier —
      et faites de la place en supprimant une copie.</div>
    <button class="act primaire" data-a="modale" data-m="sauvegardes">Mettre la partie à l’abri</button>
  </section>`;
}

function bandeauSiege() {
  const a = S && S.base && S.base.fonde ? siegeEnCours(S) : null;
  if (!a) return '';
  const f = drapeauDe(S.world, a.faction);
  return `<section class="panneau urgent bandeau-siege">
    <h2 class="titre alerte">Le siège de ${e(S.base.nom)}
      <span class="droite">${n(a.force)} hommes</span></h2>
    <div class="aide">${f ? e(f.nom) : 'Une colonne'} campe sous vos murs.
      Tenir, sortir, négocier, évacuer — les quatre verbes sont sur l’écran BASE.</div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Les grands moments (M2, ALLURE.md)
// ---------------------------------------------------------------------------
//
// Les trois plus belles machines à récit du moteur — un chapitre qui tourne,
// un des vôtres qui tombe — passaient en taille 13 dans un fil de quatre
// cents lignes. Elles ont désormais l'écran entier, en serif, un tap pour
// refermer. Trois règles :
// 1. Seulement ce qui arrive EN JOUANT (`momentDepuis`) : l'histoire déjà
//    écrite ne se rejoue pas, et les heures d'absence sont racontées par le
//    rapport, pas par des cartons — quand un rapport attend, on marque tout lu.
// 2. Un moment ne se montre qu'une fois : `momentVu` est écrit dans l'entrée
//    de journal, donc dans la sauvegarde.
// 3. La stèle ne se lève que pour un des vôtres : l'entrée doit répondre à
//    une inscription au mémorial, sinon ce n'est pas notre deuil.

let momentDepuis = 0;
let momentCourant = null;

function peutEtreMoment(x) {
  if (!x || !x.important || x.momentVu) return false;
  if (x.type === 'chronique') return (S.player.chapitreN || 0) > 1;
  return x.type === 'mort';
}

function majMoments() {
  if (!S) return;
  const recents = S.journal.slice(-40);
  if (S.rapport) {
    for (const x of recents) if (peutEtreMoment(x)) x.momentVu = true;
    return;
  }
  if (momentCourant) return; // un à la fois : le suivant attendra le tap
  for (const x of recents) {
    if (!peutEtreMoment(x)) continue;
    if (x.t <= momentDepuis || S.temps - x.t > 24) { x.momentVu = true; continue; }
    let html = null;
    if (x.type === 'chronique') {
      const ch = x.cle ? infoChapitre(x.cle) : null;
      html = `<div class="moment-boite">
        <div class="moment-sur">La chronique tourne une page</div>
        <div class="moment-chiffre">${e(romain(S.player.chapitreN || 1))}</div>
        <div class="moment-titre">${e(ch ? ch.titre : x.texte)}</div>
        ${ch ? `<div class="moment-dit">${e(ch.dit)}</div>` : ''}`;
    } else {
      // Du plus récent au plus ancien : deux morts peuvent porter le même
      // nom à des années d'écart, et c'est le deuil du jour qu'on grave.
      const m = (S.memorial || []).slice(-6).reverse().find(
        (mm) => Math.abs((mm.t || 0) - x.t) <= 1 && x.texte.includes(mm.nom));
      if (!m) { x.momentVu = true; continue; } // pas un des nôtres : pas de stèle
      html = `<div class="moment-boite">
        <div class="moment-sur">Un des vôtres est resté en route</div>
        <div class="moment-titre">${e(m.nom)}</div>
        <div class="moment-dit">${e(m.archetype || '')}${m.cause ? ` · ${e(m.cause)}` : ''}${
  m.lieu ? ` · ${e(m.lieu)}` : ''}</div>
        ${m.meilleure ? `<div class="moment-dit" style="opacity:.75">${e(m.meilleure)}</div>` : ''}`;
    }
    x.momentVu = true;
    momentCourant = x;
    const el = document.createElement('div');
    el.id = 'moment';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', x.texte);
    el.innerHTML = `${html}
      <div class="moment-main">toucher pour continuer</div></div>`;
    el.addEventListener('click', fermerMoment);
    document.body.appendChild(el);
    break;
  }
}

function fermerMoment() {
  const el = document.getElementById('moment');
  if (el) el.remove();
  if (!momentCourant) return;
  momentCourant = null;
  // Le suivant, s'il y en a un — sans attendre qu'une heure de jeu passe.
  rafraichir(true);
}

function bandeauDevaluation() {
  const a = (S && S.player && S.player.alertesMonnaie) || [];
  if (!a.length) return '';
  return `<section class="panneau urgent">
    <h2 class="titre alerte">Votre argent a fondu
      <span class="droite">${a.length}</span></h2>
    ${a.map((x) => `<div class="ligne"><span class="k"
      style="color:${couleurFaction(x.faction)}">${e(drapeauDe(S.world, x.faction).nom)}</span>
      <span class="v alerte">−${Math.round(x.perte * 100)} % · il vous en reste
        ${n(Math.round(x.solde))} ${e(symboleDe(S.world, x.faction))}</span></div>`).join('')}
    <div class="aide">Les prix d’ici n’ont pas bougé : c’est ce que vous tenez qui
      en achète moins. Au bureau de change, on vous dira ce que ça vaut ailleurs.</div>
    <button class="act mini" data-a="devaluation-vue" style="margin-top:6px">J’ai vu</button>
  </section>`;
}

/**
 * Le dock d'ordres (direction A) : les verbes du jeu vivent sur la carte,
 * posés sur le bas du terrain, sous le pouce — donner un ordre ne demande
 * pas de défiler. UNE seule source de boutons : le panneau « Ordre » garde
 * le détail (progression, rendements, répartition), le dock porte le geste.
 * « Travaux » ne s'offre que chez soi : ailleurs il n'y a rien à faire
 * tourner. C'est aussi le seul ordre qui ne rapporte rien au groupe.
 */
const ICONES_ORDRES = {
  repos: '<path d="M15 4a8 8 0 1 0 5 13 9 9 0 0 1-5-13z"/>',
  fouille: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  mine: '<path d="M4 20l6-16 4 9 6 7z"/>',
  chasse: '<circle cx="12" cy="12" r="7"/><path d="M12 5v4M12 15v4M5 12h4M15 12h4"/>',
  exploration: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9.5l-1.8 4.6-3.2 1.4 1.8-4.6z"/>',
  patrouille: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  travaux: '<path d="M4 20l6-6"/><path d="M9 9l6 6 3-3-6-6z"/>',
  entrainement: '<path d="M13 3l-8 11h6l-2 7 8-11h-6z"/>',
};
function icoOrdre(k) {
  const d = ICONES_ORDRES[k];
  return d ? `<svg class="o-i" viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"
    aria-hidden="true">${d}</svg>` : '';
}

/**
 * La barre cible (revue GM + UX, août 2026). « On peut mettre les boutons
 * "y aller" avec les autres actions plutôt que de devoir ouvrir les
 * sous-menus ? » — le propriétaire. Aller quelque part est le verbe le plus
 * fréquent du jeu, et il vivait au FOND du panneau de sélection, sous un
 * défilement : sitôt une case visée, il rejoint le dock, collé dessus. Le
 * panneau de sélection garde tout le détail ; la barre porte le geste.
 */
function barreCible() {
  if (selection == null || selection === G().regionId) return '';
  const eta = etaVoyage(selection);
  if (!eta) return '';
  const r = S.world.regions[selection];
  const col = colonieDe(S.world, selection);
  const c = coord(selection);
  const nom = r.decouvert && col && !col.ruine
    ? (vueColonie(S, col).nom || col.nom)
    : `Secteur ${String.fromCharCode(65 + c.x)}${c.y + 1}`;
  return `<div id="barre-cible">
    <span class="bc-nom">${e(nom)}</span>
    <button class="act primaire" data-a="voyage" data-r="${selection}">
      Y aller — ${dureeTexte(eta.heures)}</button>
    <button class="act" data-a="voyage" data-r="${selection}" data-f="1">
      Forcée — ${dureeTexte(Math.round(eta.heures * 0.68))}</button>
  </div>`;
}

function blocDockOrdres() {
  const g = G();
  const o = g.ordre;
  const ici = S.base.fonde && S.base.regionId === g.regionId;
  const ordresDispo = ['repos', 'fouille', 'mine', 'chasse', 'exploration', 'patrouille']
    .concat(ici ? ['travaux'] : []);
  const boutons = ordresDispo.map((k) => {
    const prev = rendementPrevu(S, k);
    const rien = prev && prev.total <= 0.02;
    const chiffre = k === 'travaux'
      ? `+${vivantsDe(g).filter(estDebout).length} bras`
      : prev
        ? (rien ? 'rien ici' : `${prev.total.toFixed(2)}/h`)
        : k === 'exploration' ? 'carte' : k === 'patrouille' ? 'combat' : 'récup.';
    return `<button class="act ordre" data-a="ordre" data-k="${k}"
      aria-pressed="${o.type === k}" ${rien && k !== 'travaux' ? 'disabled' : ''}>
      ${icoOrdre(k)}
      <span class="o-n">${e(ORDRES[k].nom)}</span>
      <span class="o-r ${rien ? 'alerte' : ''}">${e(chiffre)}</span>
    </button>`;
  }).join('');
  return `<div id="dock-ordres">${boutons}
    <button class="act ordre" data-a="modale" data-m="entrainement">
      ${icoOrdre('entrainement')}
      <span class="o-n">Entraîner</span><span class="o-r">xp</span></button>
  </div>`;
}

function ecranCarte() {
  // Le flanc : la carte, son pied et sa légende, groupés pour qu'un grand
  // écran puisse les tenir à gauche pendant que les panneaux défilent à
  // droite (INTERFACE.md, U6). Sur téléphone, ce div est transparent — un
  // bloc qui empile ses enfants, comme avant.
  return `
  <div id="flanc-carte">
  <div id="carte-boite"><canvas id="carte" aria-label="Carte du monde"></canvas><canvas id="carte-vie" aria-hidden="true"></canvas></div>
  ${barreCible()}
  ${blocDockOrdres()}
  <div class="carte-pied"><span id="carte-pos"></span>
    <span class="aide">glisser pour déplacer · molette ou deux doigts pour zoomer ·
      double clic pour revenir sur le groupe</span></div>
  <div class="legende">
    <span><i style="background:#f2f6fb"></i>${groupes(S).length > 1 ? 'groupe affiché' : 'escouade'}</span>
    ${groupes(S).length > 1 ? '<span><i style="border:1px solid #f2f6fb"></i>autre groupe</span>' : ''}
    <span><i style="border:1px solid #4fd0e3"></i>avant-poste</span>
    ${classement(S.world).slice(0, 6).map((f) =>
    `<span><i style="background:${f.couleur}"></i>${e(drapeauDe(S.world, f.key).nom)}</span>`).join('')}
  </div>
  </div>
  ${groupes(S).length > 1 ? barreGroupes() : ''}
  ${chrono('situation', blocSituation)}
  ${chrono('sélection', blocSelection)}
  ${chrono('région', blocRegionCourante)}
  ${chrono('caravanes', blocCaravanes)}
  ${chrono('contrats', blocContratsActifs)}
  ${chrono('fil', blocFil)}`;
}

// ---------------------------------------------------------------------------
// Écran ESCOUADE
// ---------------------------------------------------------------------------

function ficheMembre(c) {
  const t = pvTotal(c);
  const et = etatCourt(c);
  const cls = c.etat === 'mort' ? 'mal' : c.etat === 'ko' ? 'mal' : t.pct < 0.6 ? 'att' : 'ok';
  const ouvert = ouverts.has(c.id) ? ' open' : '';

  const membres = BODY_KEYS.map((p) => {
    const b = c.corps[p];
    const pr = ratio(c, p);
    const g = pr > 0.66 ? 'vert' : pr > 0.33 ? 'ambre' : 'rouge';
    return `<div class="membre ${b.perdu ? 'perdu' : ''}">
      <div class="n">${e(BODY_PARTS[p].nom)}${b.perdu ? ' ✕' : ''}</div>
      ${jauge(pr, g)}
    </div>`;
  }).join('');

  const comps = SKILL_KEYS.map((k) => {
    const v = c.skills[k];
    const eff = comp(c, k);
    // Ce que l'entraînement, les coups et le métier ont fait depuis son arrivée.
    const gagne = v - ((c.skills0 && c.skills0[k]) ?? v);
    return `<div class="comp-l"><span class="n">${e(SKILLS[k])}</span>
      <span class="j">${jauge(v / 100)}</span>
      <span class="v" title="effectif ${eff.toFixed(0)}${gagne > 0 ? ` · +${gagne} depuis son arrivée` : ''}">${v}${
  gagne > 0 ? `<span class="cyan" style="font-size:10px"> +${gagne}</span>` : ''}</span></div>`;
  }).join('');

  const arme = c.equip.arme ? ITEMS[c.equip.arme].nom : '—';
  const armure = c.equip.armure ? ITEMS[c.equip.armure].nom : '—';
  const greffes = Object.keys(c.equip.greffes).map((m) => ITEMS[c.equip.greffes[m]].nom).join(', ') || '—';

  // Le portrait (direction A) : l'anneau de santé autour des initiales — la
  // fiche se lit de loin, comme une carte de jeu. Le mot « santé » reste dans
  // le résumé : un pourcentage sans nom ne se comprend pas.
  const ini = c.nom.trim().slice(0, 2).toUpperCase();
  const arc = (t.pct * 106.8).toFixed(1);
  return `<details class="perso" data-id="${e(c.id)}"${ouvert}>
    <summary>
      <span class="anneau ${cls}" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="40" height="40">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#241f18" stroke-width="3"></circle>
          <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3"
            stroke-dasharray="${arc} 106.8" stroke-linecap="round" transform="rotate(-90 20 20)"></circle>
        </svg>
        <span class="ini">${e(ini)}</span>
      </span>
      <span class="nom">${e(c.nom)} <span class="arch">${e(c.archetypeNom)}</span>
        <span class="sante mono-num">santé ${(t.pct * 100).toFixed(0)} %</span></span>
      <span class="puce ${cls}">${e(et)}</span>
    </summary>
    <div class="corps-detail">
      <div class="grille2" style="margin-bottom:8px">
        <div><span class="aide">Faim</span>${jauge(c.faim / 100, c.faim > 75 ? 'rouge' : c.faim > 45 ? 'ambre' : 'vert')}</div>
        <div><span class="aide">Fatigue</span>${jauge(c.fatigue / 100, c.fatigue > 75 ? 'rouge' : c.fatigue > 45 ? 'ambre' : 'vert')}</div>
        <div><span class="aide">Moral</span>${jauge(c.moral / 100, c.moral < 30 ? 'rouge' : 'vert')}</div>
        <div><span class="aide">Saignement</span>${jauge(c.sang / 100, c.sang > 5 ? 'rouge' : '')}</div>
      </div>
      ${(() => {
    const rel = relationsNotables(c, tousLesMembres(S));
    if (!rel.ami && !rel.rival) return '';
    return `<div class="titre">Relations</div><div class="aide">${[
      rel.ami ? `S’entend avec ${e(rel.ami.nom)} (${Math.round(lien(c, rel.ami))})` : null,
      rel.rival ? `Ne supporte pas ${e(rel.rival.nom)} (${Math.round(lien(c, rel.rival))})` : null,
    ].filter(Boolean).join(' · ')}</div><div class="sep"></div>`;
  })()}
      ${(() => {
    const fl = texteFil(S, c);
    if (!fl) return '';
    return `<div class="titre">Son histoire</div>
      <div class="aide recit" style="font-style:italic">${fl.lignes.map(e).join('<br>')}</div>
      <div class="sep"></div>`;
  })()}
      ${(c.diplomes || []).length ? `<div class="titre">Diplômes</div>
      <div class="traits">${c.diplomes.map((k) => `<span class="puce ok"
        title="${e(DIPLOMES[k].nom)} — apprend ×${DIPLOMES[k].apprentissage.toFixed(2)} en ${e(SKILLS[DIPLOMES[k].skill])}">${e(DIPLOMES[k].court)}</span>`).join(' ')}</div>
      <div class="sep"></div>` : ''}
      ${c.formation ? `<div class="titre">À l’école</div>
      <div class="aide">${e(DIPLOMES[c.formation.key].nom)} — encore
        ${dureeTexte(c.formation.restant)} sur place. Indisponible jusque-là.</div>
      <div class="sep"></div>` : ''}
      <div class="titre">Traits</div>
      <div class="traits">${(c.traits || []).map((t) => `<span class="puce ${TRAITS[t].malus ? 'mal' : 'ok'}"
        title="${e(TRAITS[t].desc)}">${e(TRAITS[t].nom)}</span>`).join(' ') || '<span class="aide">aucun</span>'}</div>
      <div class="aide">${(c.traits || []).map((t) => e(TRAITS[t].desc)).join(' · ')}</div>
      <div class="sep"></div>
      <div class="titre">Blessures</div>
      <div class="membres">${membres}</div>
      <div class="sep"></div>
      <div class="titre">Compétences</div>
      <div class="comps">${comps}</div>
      <div class="sep"></div>
      <div class="ligne"><span class="k">Arme</span><span class="v">${e(arme)}</span></div>
      <div class="ligne"><span class="k">Armure</span><span class="v">${e(armure)}</span></div>
      <div class="ligne"><span class="k">Greffes</span><span class="v">${e(greffes)}</span></div>
      <div class="ligne"><span class="k">Mis hors de combat</span>
        <span class="v">${c.horsCombat || 0}${c.kills ? ` · ${c.kills} tués` : ''}</span></div>
      <div class="sep"></div>
      <button class="act mini" data-a="modale" data-m="equipement" data-c="${e(c.id)}">Équiper</button>
      ${blocTacheMembre(c)}
    </div>
  </details>`;
}

/**
 * Ce que fait cette personne, et comment le changer. Sans tâche propre, elle
 * suit l'ordre du groupe — c'est le cas courant, et il ne doit pas coûter un
 * clic de plus.
 */
function blocTacheMembre(c) {
  if (!estVivant(c)) return '';
  const g = G();
  const enMarche = g.ordre.type === 'voyage';
  const perso = c.tache && TACHES_INDIVIDUELLES.includes(c.tache.type) ? c.tache.type : null;
  const effective = tacheDe(g, c).type;

  return `<div class="sep"></div>
    <div class="titre">Tâche
      <span class="droite ${perso ? 'cyan' : ''}">${e(ORDRES[effective].nom)}${perso ? '' : ' (ordre du groupe)'}</span></div>
    ${enMarche
    ? '<div class="aide">En marche, tout le monde marche. La tâche personnelle reprendra à l’arrivée.</div>'
    : ''}
    <div class="taches">
      <button class="act mini" data-a="tache" data-c="${e(c.id)}" data-k=""
        aria-pressed="${!perso}">Suivre le groupe</button>
      ${TACHES_INDIVIDUELLES.map((k) => (k === 'entrainement'
    ? `<button class="act mini" data-a="modale" data-m="entrainement" data-c="${e(c.id)}"
        aria-pressed="${perso === k}">${e(ORDRES[k].nom)}${perso === k && c.tache.skill
      ? ` · ${e(SKILLS[c.tache.skill])}` : ''}</button>`
    : `<button class="act mini" data-a="tache"
        data-c="${e(c.id)}" data-k="${k}" aria-pressed="${perso === k}">${e(ORDRES[k].nom)}</button>`)).join('')}
    </div>`;
}

/**
 * La barre de groupes : où est chacun, ce qu'il fait, combien il en reste
 * debout. C'est le seul endroit d'où l'on voit toute l'escouade d'un coup.
 */
function barreGroupes() {
  const gs = groupes(S);
  const actif = G();
  const onglets = gs.map((g) => {
    const viv = g.membres.filter(estVivant).length;
    const deb = g.membres.filter(estDebout).length;
    const ici = g.ordre.type === 'voyage'
      ? `→ ${e(lieuAvecCoord(S.world, g.ordre.dest))}`
      : e(lieuAvecCoord(S.world, g.regionId));
    return `<button class="grp ${g.id === actif.id ? 'on' : ''}" data-a="groupe" data-k="${e(g.id)}">
      <span class="grp-n">${e(g.nom)}</span>
      <span class="grp-d">${deb < viv ? `<b class="rouge">${deb}</b>` : deb}/${viv} · ${ici}</span>
      <span class="grp-o">${e(ORDRES[g.ordre.type].nom)}</span>
    </button>`;
  }).join('');
  return `<section class="panneau">
    <h2 class="titre">Groupes <span class="droite">${gs.length} · portée ${porteeOrdres(S)}</span></h2>
    <div class="groupes">${onglets}</div>
  </section>`;
}

/** Détacher et regrouper : la seule façon d'être à deux endroits à la fois. */
function blocDetachement() {
  const g = G();
  const dispo = g.membres.filter(estDebout);
  const voisins = fusionnablesAvec(S, g);
  const place = true; // rien ne limite le nombre : c'est la portée qui décide

  const cases = dispo.map((c) => `<button class="act mini" data-a="detacher-sel" data-c="${e(c.id)}"
    aria-pressed="${detaches.has(c.id)}"><span class="coche" aria-hidden="true"></span>${e(c.nom)}</button>`).join('');

  const choisis = dispo.filter((c) => detaches.has(c.id)).length;
  const possible = place && choisis > 0 && choisis < dispo.length;

  return `<section class="panneau">
    <h2 class="titre">Détacher
      <span class="droite">${dispo.length} debout</span></h2>
    ${dispo.length < 2
    ? '<div class="aide">Il faut au moins deux personnes debout pour se séparer.</div>'
    : `<div class="aide">Les vivres et le matériel suivent au prorata. Choisissez qui part.</div>
       <div class="taches">${cases}</div>
       <button class="act" data-a="detacher" ${possible ? '' : 'disabled'}>
         ${choisis === 0 ? 'Choisissez qui part'
    : choisis >= dispo.length ? 'Il faut laisser quelqu’un ici'
      : `Détacher ${choisis} ${choisis > 1 ? 'membres' : 'membre'}`}</button>
       ${place ? '' : '<div class="aide">Plus de quoi coordonner un groupe de plus — montez l’antenne de l’avant-poste.</div>'}`}
    ${voisins.length ? `<div class="sep"></div>
      <div class="titre">Regrouper</div>
      <div class="taches">${voisins.map((o) => `<button class="act mini" data-a="fusionner" data-k="${e(o.id)}">
        Absorber ${e(o.nom)} (${o.membres.filter(estVivant).length})</button>`).join('')}</div>` : ''}
  </section>`;
}

function blocInventaire() {
  const inv = G().inventaire;
  const cap = capacitePortage(S, G());
  const poids = poidsInventaire(inv);
  const lignes = COMMODITY_KEYS.filter((k) => (inv[k] || 0) > 0)
    .map((k) => `<div class="ligne"><span class="k">${e(COMMODITIES[k].nom)}</span>
      <span class="v">${n(inv[k])}</span></div>`).join('') || '<div class="aide">Sac vide.</div>';

  const objets = G().objets.length
    ? G().objets.map((o) => `<span class="puce">${e(ITEMS[o].nom)}</span>`).join(' ')
    : '<span class="aide">Aucun équipement en réserve.</span>';

  // Où passent les rations, poste par poste.
  //
  // Elles disparaissaient sans explication : rien ne disait que l'entraînement
  // en avale une par heure pour deux personnes — de très loin le premier poste —
  // ni que les prisonniers mangent sur le sac. Une comptabilité muette est
  // indiscernable d'un bug.
  const c = consommationGroupe(S, G());
  const jours = autonomie(S, G());
  const poste = (nom, v) => (v > 0.05
    ? `<div class="ligne"><span class="k">${nom}</span>
        <span class="v">${n(v, 1)} / jour</span></div>` : '');
  const alerte = jours < 3 ? 'rouge' : jours < 8 ? 'ambre' : '';

  return `<section class="panneau">
    <h2 class="titre">Sac <span class="droite">${n(poids)} / ${n(cap)} kg</span></h2>
    ${jauge(cap ? poids / cap : 1, poids / cap > 0.95 ? 'rouge' : poids / cap > 0.8 ? 'ambre' : '')}
    <div style="margin-top:7px">${lignes}</div>
    <div class="sep"></div>
    <div class="titre">Vivres
      <span class="droite ${alerte}">${Number.isFinite(jours)
    ? `${n(jours, 1)} jour${jours >= 2 ? 's' : ''} d’autonomie` : 'rien ne se consomme'}</span></div>
    ${poste('L’escouade mange', c.escouade)}
    ${poste('Les prisonniers mangent', c.prisonniers)}
    ${poste('L’entraînement brûle', c.entrainement)}
    ${c.biomasse > 0.05 ? `<div class="ligne"><span class="k">Les bêtes broutent</span>
      <span class="v">${n(c.biomasse, 1)} de biomasse / jour</span></div>` : ''}
    ${c.rations <= 0.05 ? '<div class="aide">Personne ne consomme rien pour l’instant.</div>' : ''}
    <div class="sep"></div>
    <div class="titre">Réserve d’équipement</div>
    <div>${objets}</div>
  </section>`;
}

/**
 * La même jauge, quand on est seul : le moteur y met délibérément la tenue
 * d'une personne (« il tient ou il craque », squad.js), mais les textes de
 * bande — « on se parle, on se couvre » — étaient absurdes pour un homme
 * seul. Vu à l'écran (U4 ter). Mots au singulier, mécanique inchangée.
 */
function texteTenueSeul(v) {
  if (v >= 80) return 'La tête est claire. Le moral remonte tout seul.';
  if (v >= 60) return 'Ça tient. Un pied devant l’autre.';
  if (v >= 35) return 'La fatigue ronge plus que les coups. Une mauvaise semaine de plus et ça craquera.';
  if (v >= 15) return 'Les gestes sont machinaux, la tête est ailleurs.';
  return 'Plus rien ne tient que la marche elle-même.';
}

function texteCohesion(v) {
  if (v >= 80) return 'Ces gens se feraient tuer les uns pour les autres. Le moral remonte tout seul.';
  if (v >= 60) return 'L’escouade tient. On se parle, on se couvre.';
  if (v >= 35) return 'Ça tient par habitude. Une mauvaise semaine de plus et ça craquera.';
  if (v >= 15) return 'Plus grand monde ne se regarde. Le moral s’effondre à chaque coup dur.';
  return 'Ce n’est plus une escouade, ce sont des gens qui marchent dans la même direction.';
}

function blocMemorial() {
  const m = S.memorial || [];
  if (!m.length) return '';
  return `<section class="panneau">
    <h2 class="titre">Mémorial <span class="droite">${m.length} disparu${m.length > 1 ? 's' : ''}</span></h2>
    ${m.slice().reverse().slice(0, 12).map((x) => `<div class="stele">
      <div class="ligne"><span class="k">${e(x.nom)}</span>
        <span class="v">${horloge(x.t).texte}</span></div>
      <div class="aide">${e(x.archetype)} · ${e(x.cause)}${x.lieu ? ` · ${e(x.lieu)}` : ''}
        ${x.horsCombat ? ` · ${x.horsCombat} mis hors de combat` : ''} · ${e(x.meilleure)}</div>
      ${x.fil && !x.fil.regle ? `<div class="aide" style="font-style:italic">${
  e(texteFilInacheve(S, x.fil) || '')}</div>` : ''}
    </div>`).join('')}
  </section>`;
}

/**
 * Sous quel drapeau. Une ville libre vit de votre réputation — personne ne vient
 * la prendre tant qu'on n'a rien à vous reprocher — et c'est fragile. Prendre
 * les couleurs de ceux qu'on sert, c'est être défendu, payer l'impôt, et
 * hériter de leurs guerres.
 */
function blocDrapeau(b) {
  const col = S.world.colonies.find((c) => c.id === b.colonieId);
  if (!col) return '';
  if (col.faction) {
    const l = loisDe(S.world, col.faction);
    return `<div class="aide">${e(b.nom)} porte les couleurs
      <span style="color:${couleurFaction(col.faction)}">${e(drapeauDe(S.world, col.faction).nom)}</span> :
      on la défend comme les leurs, on y lève leur impôt
      (${Math.round(l.impot * 100)} %), et l’on hérite de leurs guerres.</div>
      <button class="act mini danger" data-a="independance" style="margin-bottom:6px">
        Reprendre son drapeau (−35 de réputation)</button>`;
  }
  const possibles = diploDe(S.world).filter((k) => peutRattacher(S, k).ok);
  return `<div class="aide">${e(b.nom)} est écrite sur les cartes et ne porte les
    couleurs de personne : on ne vient pas la prendre tant qu’on n’a rien à vous
    reprocher. C’est tenable, et c’est fragile.</div>
    ${possibles.map((k) => `<button class="act mini" data-a="rattacher" data-k="${e(k)}"
      style="margin-bottom:4px;text-align:left">Prendre les couleurs
      ${e(drapeauDe(S.world, k).genitif)}<br><span class="aide">Défendue comme les leurs,
      impôt ${Math.round(loisDe(S.world, k).impot * 100)} %, et leurs guerres deviennent
      les vôtres.</span></button>`).join('')
    || `<div class="aide">Aucune faction ne vous estime assez pour vous prendre sous
      son drapeau. Il faut les servir, ou 40 de réputation.</div>`}`;
}

/**
 * Comment on se bat. Une tactique n'est pas un bonus : c'est un pari sur le
 * terrain qu'on a sous les pieds, le nombre qu'on a en face et les armes qu'on
 * porte. On l'annonce donc avec son rendement *ici* — c'est la seule façon d'en
 * faire une décision plutôt qu'une case à cocher au hasard.
 */
function blocTactique() {
  const g = G();
  const vivants = vivantsDe(g).length || 1;
  const armes = (g.membres || []).filter(
    (c) => estVivant(c) && c.equip.arme && ITEMS[c.equip.arme]
      && ITEMS[c.equip.arme].comp === 'tir').length;
  const biome = S.world.regions[g.regionId].biome;
  const choisie = g.tactique || S.player.tactique || 'ligne';
  return `<section class="panneau">
    <h2 class="titre">Tactique
      <span class="resume">sur ${e(BIOMES[biome].nom.toLowerCase())} · ${e(apercuTactique(choisie, biome, 1, armes / Math.max(1, vivants)).mot)}</span>
      <span class="droite">${e(TACTIQUES[choisie].nom)}</span></h2>
    <div class="pile">
      ${TACTIQUE_KEYS.map((k) => {
    const t = TACTIQUES[k];
    // On suppose un adversaire de taille comparable : c'est ce qu'on croise le
    // plus souvent, et l'on ne sait pas à l'avance sur qui l'on tombera.
    const a = apercuTactique(k, biome, 1, armes / vivants);
    return `<button class="act mini" style="text-align:left" data-a="tactique" data-k="${k}"
        aria-pressed="${choisie === k}">
        <span class="coche" aria-hidden="true"></span>${e(t.nom)}
        <span class="puce ${a.cls}" style="float:right">${e(a.mot)}</span>
        <br><span class="aide">${e(t.desc)}</span></button>`;
  }).join('')}
    </div>
    <div class="aide" style="margin-top:6px">${e(TACTIQUES[choisie].quand)}
      Le jugement porte sur le terrain d’ici, vos armes, et un adversaire de
      taille comparable.</div>
  </section>`;
}

/**
 * Les prisonniers. C'est le seul écran du jeu où l'on décide de ce qu'on est :
 * les cinq issues rapportent des choses différentes et se paient auprès de
 * gens différents, et aucune n'est neutre.
 */
function blocPrisonniers() {
  const g = G();
  const gens = prisonniersDe(g);
  if (!gens.length) return '';
  const col = colonieDe(S.world, g.regionId);
  const garde = capaciteGarde(g);
  const manque = surveillanceManquante(g);
  const loi = loiIci(S, col);
  const lenteur = lenteurPrisonniers(g);
  return `<section class="panneau">
    <h2 class="titre">Prisonniers <span class="droite ${manque ? 'alerte' : ''}">${gens.length} / ${Math.floor(garde)}</span></h2>
    <div class="aide">${manque > 0
    ? `Vous n’en surveillez pas ${Math.ceil(manque)}. Ceux-là s’en iront, et pas les mains vides.`
    : 'Tous sont tenus. Ils mangent sur le sac et ralentissent la colonne.'}
      ${lenteur > 0.01 ? ` Marche −${Math.round(lenteur * 100)} %.` : ''}</div>
    ${col && !col.ruine
    ? `<div class="aide">${e(col.nom)} : justice ${e(loi.peine.nom.toLowerCase())}${
      loi.esclavage ? ', et le commerce d’hommes y est légal' : ''}.</div>`
    : '<div class="aide">Hors ville : on ne peut ni les livrer, ni les vendre, ni les rançonner.</div>'}
    ${blocDecisionTous(gens.map((c) => optionsPour(S, col, g, c)), 'captif-tous')}
    <div class="sep"></div>
    ${gens.map((c) => {
    const opts = optionsPour(S, col, g, c);
    const cap = c.captif || {};
    return `<details data-id="captif-${e(c.id)}" ${ouverts.has(`captif-${c.id}`) ? 'open' : ''}
        style="border-bottom:1px solid #26211a;padding:5px 0">
        <summary class="ligne"><span class="k">${e(c.nom)}</span>
          <span class="v">${e(cap.brigandage ? 'brigand'
      : cap.faction ? drapeauDe(S.world, cap.faction).nom : 'inconnu')}</span></summary>
        <div class="aide">${e(c.archetypeNom || '')} · ${Math.round(pvTotal(c).pct * 100)} % · 
          ${e(apercu(c).skill)} ${apercu(c).comp}</div>
        ${opts.map((o) => `<button class="act mini" style="margin-top:4px;text-align:left"
          data-a="captif" data-c="${e(c.id)}" data-k="${o.key}">${e(o.nom)}${
  o.prix ? ` — ${n(o.prix)} ${sym()}` : ''}<br><span class="aide">${e(o.aide)}</span></button>`).join('')}
      </details>`;
  }).join('')}
  </section>`;
}

/**
 * La rangée « pour tous » des morts et des prisonniers — « il faut pouvoir
 * appliquer la décision à tous » (le propriétaire, août 2026). Une décision
 * n'apparaît ici que si elle vaut pour au moins une personne ; le moteur fait
 * où il peut et rend le compte du reste. À l'unité, rien ne change : les
 * fiches gardent leurs boutons.
 */
function blocDecisionTous(parPersonne, action) {
  if (parPersonne.length < 2) return '';
  const vues = new Map();
  for (const opts of parPersonne) {
    for (const o of opts) if (!vues.has(o.key)) vues.set(o.key, o.nom);
  }
  if (!vues.size) return '';
  return `<div class="aide" style="margin-top:6px">Pour tous, d’un seul geste :</div>
    <div class="rang-tous">${[...vues].map(([k, nom]) =>
    `<button class="act mini" data-a="${action}" data-k="${e(k)}">${e(nom)} — tous</button>`).join('')}
    </div>`;
}

/**
 * Ce qu'on fait de ses morts. Pendant exact du panneau des prisonniers.
 *
 * Un mort restait dans la colonne, avec la mention MORT à côté de son nom, pour
 * toujours : il ne coûtait rien, ne pesait rien, ne posait aucune question. Il
 * pèse maintenant sur la marche et sur le moral tant qu'on n'a rien décidé —
 * c'est ce qui force le choix sans qu'aucune règle ne l'impose.
 */
function blocDepouilles() {
  const g = G();
  const corps = depouillesDe(g);
  if (!corps.length) return '';
  const col = colonieDe(S.world, g.regionId);
  const lenteur = lenteurDepouilles(g);
  return `<section class="panneau">
    <h2 class="titre">Nos morts <span class="droite alerte">${corps.length}</span></h2>
    <div class="aide">On les porte tant qu'on n'en a rien décidé.
      ${lenteur > 0.01 ? `Marche −${Math.round(lenteur * 100)} %.` : ''}
      Le moral s'en ressent, un peu plus chaque heure.</div>
    ${blocDecisionTous(corps.map((c) => ritesPour(S, g, c)), 'corps-tous')}
    <div class="sep"></div>
    ${corps.map((c) => {
    const rites = ritesPour(S, g, c);
    return `<details data-id="corps-${e(c.id)}" ${ouverts.has(`corps-${c.id}`) ? 'open' : ''}
        style="border-bottom:1px solid #26211a;padding:5px 0">
        <summary class="ligne"><span class="k">${e(c.nom)}</span>
          <span class="v aide">${e(c.archetypeNom || '')}</span></summary>
        ${rites.map((o) => `<button class="act mini" style="margin-top:4px;text-align:left"
          data-a="corps" data-c="${e(c.id)}" data-k="${o.key}">${e(o.nom)}${
  o.gain ? ` — ${n(o.gain)} ${sym()}` : ''}<br><span class="aide">${e(o.aide)}</span></button>`).join('')}
      </details>`;
  }).join('')}
    ${col && !col.ruine ? '' : '<div class="aide">Hors ville : le trafic d’organes attendra.</div>'}
  </section>`;
}

/**
 * Qui fait quoi, en une table.
 *
 * L'information existait déjà — chaque fiche montre la tâche de son occupant —
 * mais éparpillée sur autant d'écrans que de personnes : on ne pouvait pas
 * savoir d'un coup d'œil que trois membres s'entraînaient pendant que le
 * quatrième portait tout. On y ajoute l'état, qui manquait partout : blessé,
 * affamé, à l'école, en formation.
 */
function blocQuiFaitQuoi() {
  const g = G();
  const gens = g.membres.filter(estVivant);
  if (!gens.length) return '';
  const enMarche = g.ordre.type === 'voyage';
  const perso = gens.filter((c) => c.tache && TACHES_INDIVIDUELLES.includes(c.tache.type)).length;

  const lignes = gens.map((c) => {
    const propre = c.tache && TACHES_INDIVIDUELLES.includes(c.tache.type);
    const tache = enMarche ? 'voyage' : tacheDe(g, c).type;
    const etats = [];
    if (c.etat === 'ko') etats.push('<span class="rouge">à terre</span>');
    if (c.formation && c.formation.restant > 0) {
      etats.push(`<span class="cyan">école ${Math.ceil(c.formation.restant / 24)} j</span>`);
    }
    if (c.enseigne) etats.push('<span class="cyan">enseigne</span>');
    if (c.faim >= SEUIL_FAMINE) etats.push('<span class="rouge">affamé</span>');
    else if (c.faim >= SEUIL_VENTRE_CREUX) etats.push('<span class="ambre">ventre creux</span>');
    const pv = pvTotal(c).pct;
    if (pv < 0.6) etats.push(`<span class="${pv < 0.35 ? 'rouge' : 'ambre'}">${Math.round(pv * 100)} % de forme</span>`);
    if (c.fatigue >= 90) etats.push('<span class="ambre">épuisé</span>');
    return `<div class="ligne">
      <span class="k">${e(c.nom)}</span>
      <span class="v">${e(ORDRES[tache].nom)}${propre && !enMarche ? ' <span class="cyan">·</span>' : ''}
        ${etats.length ? `<br><span class="aide">${etats.join(' · ')}</span>` : ''}</span></div>`;
  }).join('');

  // Ce que la colonne vaut, additionné. « Est-ce que plusieurs membres
  // additionnent leur travail ? » n'avait aucune réponse à l'écran — elle est
  // oui, et sans le chiffre on ne peut pas juger si détacher deux personnes vaut
  // le coup.
  const ap = apercuEscouade(S, g);
  const recolte = Object.entries(ap.recolteDetail)
    .filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${n(v, 1)} ${COMMODITIES[k].nom.toLowerCase()}`).join(' · ');

  return `<section class="panneau">
    <h2 class="titre">Qui fait quoi
      <span class="resume">${e(resumeTaches(g))}</span>
      <span class="droite">${gens.length}/${g.membres.length} debout</span></h2>
    ${lignes}
    <div class="sep"></div>
    <div class="ligne"><span class="k">Ensemble, par jour</span>
      <span class="v">${recolte || '<span class="aide">rien à récolter ainsi</span>'}</span></div>
    <div class="ligne"><span class="k">Marche</span>
      <span class="v">${Number.isFinite(ap.heuresParRegion)
    ? `${n(ap.heuresParRegion, 1)} h / région` : '—'}</span></div>
    <div class="ligne"><span class="k">Prisonniers</span>
      <span class="v">${ap.prisonniers} gardés sur ${n(ap.garde, 1)}</span></div>
    <div class="ligne"><span class="k">Attelage</span>
      <span class="v">${ap.attelage} mené${ap.attelage > 1 ? 's' : ''} sur ${ap.conduite}</span></div>
    <div class="aide">Le travail s’additionne : chacun apporte selon sa compétence,
      et la cohésion multiplie le tout.</div>
    ${enMarche
    ? '<div class="aide">En marche, tout le monde marche. Les tâches personnelles reprendront à l’arrivée.</div>'
    : ''}
    ${perso > 0
    ? `<button class="act" data-a="tous-suivent" style="margin-top:6px">Tout le monde suit le groupe
        <span class="aide">(${perso} tâche${perso > 1 ? 's' : ''} personnelle${perso > 1 ? 's' : ''})</span></button>`
    : '<div class="aide">Personne n’a de tâche à soi : tout le monde suit l’ordre du groupe.</div>'}
  </section>`;
}

/**
 * La bande de tête d'écran (direction A) : chaque écran s'annonce — son nom
 * en voix d'affichage, et deux ou trois chiffres qui disent son métier d'un
 * regard. Les valeurs arrivent déjà échappées quand il le faut : la bande ne
 * ré-échappe pas, elle compose.
 */
function bandeauEcran(nom, stats) {
  return `<section class="panneau bande-ecran">
    <div class="be-nom">${e(nom)}</div>
    <div class="be-stats">${stats.map(([v, k]) => `<div class="be-stat">
      <div class="be-v">${v}</div><div class="be-k">${e(k)}</div></div>`).join('')}</div>
  </section>`;
}

function ecranEscouade() {
  const p = S.player;
  const pol = p.politique;
  const g = G();
  const noy = noyau(S, g);
  const nGens = vivantsDe(g).length;
  const plafond = plafondCohesion(S, g);
  const rend = rendementCohesion(g);
  const cohCls = rend >= 1 ? 'ok' : rend >= 0.9 ? 'att' : 'mal';

  return `
  ${bandeauEcran(nGens === 1 ? 'Seul' : 'Escouade', [
    [`${vivantsDe(g).filter(estDebout).length}/${nGens}`, 'debout'],
    [`<span class="${cohCls}">${Math.round(g.cohesion ?? 55)} %</span>`, nGens === 1 ? 'tenue' : 'cohésion'],
  ])}
  ${barreGroupes()}
  ${chrono('prisonniers', blocPrisonniers)}
  ${chrono('dépouilles', blocDepouilles)}
  <section class="panneau">
    <h2 class="titre">${nGens === 1 ? 'Tenue' : 'Cohésion'} de ${e(g.nom)}
      <span class="droite"><span class="nombre ${cohCls}">${Math.round(g.cohesion ?? 55)} %</span></span></h2>
    ${jauge((g.cohesion ?? 55) / 100, '', rend >= 1 ? '#4fd0e3' : undefined)}
    <div class="grille2">
      <div class="ligne"><span class="k">Effectif</span>
        <span class="v">${nGens} · noyau ${n(noy)}</span></div>
      <div class="ligne"><span class="k">Plafond atteignable</span>
        <span class="v">${Math.round(plafond)} %</span></div>
      <div class="ligne"><span class="k">Travail et combat</span>
        <span class="v">×${rend.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Se voit de loin</span>
        <span class="v">+${(Math.max(0, nGens - 4) * 5)} % de rencontres</span></div>
    </div>
    <div class="aide">Noyau : 4 + ${nivBat(S.base, 'baraquement')} de baraquement
      + ${placesSociables(g)} que les vôtres tiennent ensemble.</div>
    <div class="aide">${nGens > noy
    ? 'Au-delà du noyau, on se connaît moins. Rien ne l’interdit : ça coûte, simplement — '
      + 'et un baraquement ou quelqu’un de sociable agrandit ce noyau.'
    : 'Une bande de cette taille peut se souder complètement.'}</div>
    <div class="aide">${e((nGens === 1 ? texteTenueSeul : texteCohesion)(g.cohesion ?? 55))}</div>
  </section>

  <section class="panneau">
    <h2 class="titre">${e(g.nom)}
      <span class="droite">${tousLesMembres(S).filter(estVivant).length} au total</span></h2>
    <div class="galerie">${g.membres.slice(0, montresEscouade).map(ficheMembre).join('')}</div>
    ${g.membres.length > montresEscouade ? `<div class="sep"></div>
      <button class="act" data-a="voir-plus-escouade">Voir ${pl(Math.min(PAS_ESCOUADE, g.membres.length - montresEscouade), 'personne')} de plus
        <span class="aide">${pl(g.membres.length - montresEscouade, 'restante')}</span></button>` : ''}
  </section>

  ${chrono('qui fait quoi', blocQuiFaitQuoi)}
  ${chrono('détachement', blocDetachement)}
  ${chrono('inventaire', blocInventaire)}

  <section class="panneau">
    <h2 class="titre">Posture
      <span class="droite">${e(POSTURES[p.posture] ? POSTURES[p.posture].nom : '—')}</span></h2>
    <div class="grille3">
      ${POSTURE_KEYS.map((k) => `<button class="act mini" data-a="posture" data-k="${k}"
        aria-pressed="${p.posture === k}">${e(POSTURES[k].nom)}</button>`).join('')}
    </div>
    <div class="aide" style="margin-top:6px">${e(POSTURES[p.posture].desc)}</div>
  </section>

  ${blocTactique()}

  <section class="panneau">
    <h2 class="titre">Consignes permanentes
      <span class="droite">${pl(Object.keys(pol).filter((k) => pol[k]).length, 'active')}</span>
      <span class="resume">${e(resumePolitique(pol))}</span></h2>
    <div class="pile">
      ${[
    ['recruter', 'Recruter les errants croisés en route'],
    ['commercer', 'Traiter avec les caravanes'],
    ['payerPeage', 'Payer les péages plutôt que se battre'],
    ['achever', 'Achever les ennemis à terre'],
    ['viserChefs', 'Viser les plus dangereux d’abord'],
    ['halte', 'Interrompre la route quand quelqu’un tombe'],
  ].map(([k, l]) => `<button class="act mini" style="text-align:left" data-a="politique" data-k="${k}"
        aria-pressed="${!!pol[k]}"><span class="coche" aria-hidden="true"></span>${e(l)}</button>`).join('')}
    </div>
    <div class="aide" style="margin-top:6px">Ces consignes s’appliquent aussi pendant votre absence.</div>
  </section>

  ${blocMemorial()}`;
}

// ---------------------------------------------------------------------------
// Écran BASE
// ---------------------------------------------------------------------------

/**
 * Transmettre chez soi. Un vétéran qu'on a mis six cents heures à former peut
 * enfin servir à autre chose qu'à cogner : il forme les suivants. Ça ne coûte
 * pas un crédit, ça immobilise deux personnes au lieu d'une, et ça donne une
 * raison de rentrer.
 */
/**
 * Qui fait quoi à l'avant-poste. Les habitants sans poste restent des manœuvres :
 * ils aident partout un peu. Affectés, ils rendent beaucoup plus — mais sur une
 * seule chaîne. C'est le choix de spécialisation qui fait l'avant-poste.
 */
/**
 * La chaîne de l'autonomie : ramasser, manger, loger, alimenter.
 *
 * Un avant-poste neuf présentait douze bâtiments dans l'ordre du fichier de
 * données, aucun accessible, et pas une ligne pour dire lesquels forment la
 * boucle qui rend un camp vivable. On en concluait qu'il n'y avait rien pour
 * récolter ni pour vivre en autonomie — alors que la halle et l'hydroponie sont
 * exactement ça, noyées entre une fonderie et une raffinerie.
 *
 * Le maillon manquant est nommé, et le bouton mène droit au bâtiment.
 */
function blocChaine() {
  const etapes = chaineAutonomie(S);
  if (!etapes.length) return '';
  const faits = etapes.filter((x) => x.fait).length;
  const bloque = etapes.some((x) => x.alerte);
  return `<section class="panneau ${faits === 0 || bloque ? 'urgent' : ''}">
    <h2 class="titre">Chaîne de l’autonomie
      <span class="droite ${faits === etapes.length ? '' : 'alerte'}">${faits}/${etapes.length}</span></h2>
    <div class="aide">Un camp se tient tout seul quand les quatre sont en place :
      il ramasse ce qu’il y a autour, il en fait à manger, il loge ceux qui viennent,
      et le courant accélère le tout.</div>
    <div class="sep"></div>
    ${etapes.map((x) => `<div class="ligne souple">
      <span class="k">${x.fait ? '✓' : '·'} ${e(x.titre)}<br>
        <span class="aide">${e(x.etat)}</span></span>
      <span class="v">${x.fait
    ? '<span class="puce ok">tourne</span>'
    : `<span class="puce mal">${e(BUILDINGS[x.key].nom.toLowerCase())}</span>`}</span></div>
      ${x.alerte ? `<div class="aide alerte">▲ ${e(x.alerte)}</div>` : ''}`).join('')}
  </section>`;
}

/**
 * Le nom d'une compétence, sans faire tomber l'écran si la clé est fausse.
 *
 * `SKILLS[m.skill].toLowerCase()` a tué l'onglet BASE d'une partie entière : un
 * métier livré avec `skill: 'survie'`, qui n'est pas une compétence de ce jeu,
 * et la liste des métiers ne s'affiche qu'à partir du premier habitant — le
 * joueur pouvait donc ouvrir sa base au premier jour et plus jamais ensuite,
 * sans le moindre message. Le vrai garde-fou est le test qui vérifie la table ;
 * celui-ci fait qu'une faute de frappe coûte un mot laid, pas un écran mort.
 */
function nomComp(k) {
  return (SKILLS[k] || String(k)).toLowerCase();
}

/**
 * Ce que votre escouade apporte au camp, ou pourrait y apporter.
 *
 * Les métiers ne se remplissaient que d'habitants, lesquels arrivent seuls, au
 * compte-gouttes, et sont plafonnés par les lits. Une escouade de six pouvait
 * camper six mois sur place sans tenir un seul poste. La phrase exacte du
 * joueur : « j'ai mon escouade mais elle ne peut même pas travailler dans la
 * base. »
 */
function blocBras() {
  const b = S.base;
  if (!b.fonde) return '';
  const bras = brasEscouade(S);
  const ici = S.player.groupes.filter((g) => g.regionId === b.regionId);
  const debout = ici.reduce((t, g) => t + g.membres.filter(estDebout).length, 0);
  if (bras > 0) {
    return `<div class="aide ok">${n(bras)} des vôtres sont aux travaux : autant de bras
      en plus sur toutes les chaînes, et ils ne prennent aucun lit.</div>`;
  }
  if (debout > 0) {
    return `<div class="aide ambre">${n(debout)} des vôtres sont ici sans rien faire pour le
      camp. L’ordre « Travaux », sur la carte, les met au travail.</div>`;
  }
  return '<div class="aide">Aucun des vôtres n’est sur place. Une escouade postée ici '
    + 'peut se mettre au service du camp — ordre « Travaux ».</div>';
}

/**
 * Ce qu'une barre repliée dit d'un coup d'œil. Voir `.resume` dans styles.css :
 * ces textes ne s'affichent que quand l'encart est fermé, là où le détail n'est
 * plus lisible et où il faut néanmoins savoir si l'on doit ouvrir.
 */
function resumeMetiers(b) {
  const tenus = METIER_KEYS
    .map((k) => [k, affectes(b, k, S)])
    .filter(([, v]) => v > 0)
    .sort((x, y) => y[1] - x[1]);
  if (!tenus.length) return 'aucun poste tenu';
  return tenus.slice(0, 4).map(([k, v]) => `${METIERS[k].nom.toLowerCase()} ${v}`).join(' · ')
    + (tenus.length > 4 ? '…' : '');
}

/** Ce qui tourne, et surtout ce qui est bloqué : c'est ça qu'on cherche. */
function resumeChaines(b, montes) {
  const bloquees = montes.filter((k) => {
    if (recetteDe(b, k) === ARRET) return false;
    if (k === 'generateur') return Math.floor(b.stock.carburant || 0) <= 0;
    if (k === 'raffinerie' && recetteDe(b, k) !== 'carburant') return (b.dechets || 0) <= 0;
    return (ENTREES[k] || []).some((m) => Math.floor(b.stock[m] || 0) <= reserveDe(b, m));
  });
  const arretees = montes.filter((k) => recetteDe(b, k) === ARRET);
  const bouts = [];
  if (bloquees.length) {
    bouts.push(`<span class="mal">à sec : ${e(bloquees.map((k) => BUILDINGS[k].nom.toLowerCase()).join(', '))}</span>`);
  }
  if (arretees.length) {
    bouts.push(`<span class="att">arrêté : ${e(arretees.map((k) => BUILDINGS[k].nom.toLowerCase()).join(', '))}</span>`);
  }
  if (!bouts.length) bouts.push('<span class="bien">tout tourne</span>');
  return bouts.join(' · ');
}

function resumeBatiments(b) {
  const montes = Object.keys(b.batiments).filter((k) => b.batiments[k] > 0);
  if (!montes.length) return 'rien de bâti';
  return montes
    .sort((x, y) => b.batiments[y] - b.batiments[x])
    .map((k) => `${BUILDINGS[k].nom.toLowerCase()} ${b.batiments[k]}`)
    .join(' · ');
}

/**
 * Les matières qui manquent d'abord, celles qui débordent ensuite. C'est ce
 * qu'on veut savoir sans ouvrir : ce qui va bloquer une chaîne, et ce qui va
 * se perdre faute de place.
 */
function resumeStock(b) {
  const vides = [];
  const gros = [];
  for (const k of COMMODITY_KEYS) {
    const q = Math.floor(b.stock[k] || 0);
    if (q <= 0) vides.push(COMMODITIES[k].nom.toLowerCase());
    else gros.push([k, q]);
  }
  gros.sort((x, y) => y[1] - x[1]);
  const tete = gros.slice(0, 3).map(([k, q]) => `${COMMODITIES[k].nom.toLowerCase()} ${n(q)}`).join(' · ');
  const manque = vides.length
    ? ` · <span class="mal">à zéro : ${e(vides.slice(0, 4).join(', '))}${vides.length > 4 ? '…' : ''}</span>`
    : '';
  return (tete || 'entrepôt vide') + manque;
}

function resumeTaches(g) {
  const compte = {};
  for (const c of g.membres) {
    if (!estDebout(c)) continue;
    const t = c.tache || (g.ordre && g.ordre.type) || 'repos';
    compte[t] = (compte[t] || 0) + 1;
  }
  const noms = { repos: 'repos', fouille: 'fouille', extraction: 'extraction', chasse: 'chasse', exploration: 'exploration', patrouille: 'patrouille', entrainement: 'entraînement', voyage: 'marche', travaux: 'travaux' };
  const parts = Object.keys(compte)
    .sort((a, b) => compte[b] - compte[a])
    .map((k) => `${compte[k]} ${noms[k] || k}`);
  return parts.length ? parts.join(' · ') : 'personne debout';
}

function resumePolitique(pol) {
  const noms = {
    recruter: 'recrute', commercer: 'commerce', payerPeage: 'paie les péages',
    achever: 'achève', viserChefs: 'vise les chefs', halte: 's’arrête aux blessés',
  };
  const on = Object.keys(noms).filter((k) => pol[k]).map((k) => noms[k]);
  return on.length ? on.join(' · ') : 'aucune : on ne fait rien de soi-même';
}

function blocMetiers() {
  const b = S.base;
  const libres = manoeuvres(b, S);
  const ouverts = METIER_KEYS.filter((k) => placesMetier(b, k) > 0);

  const bras = brasEscouade(S);
  if (!b.pop && !bras) {
    return `<section class="panneau">
      <h2 class="titre">Métiers</h2>
      <div class="aide">Personne à employer. Il faut d’abord que des gens s’installent :
        un baraquement pour les loger, des rations pour les garder.</div>
      ${blocBras()}
    </section>`;
  }
  if (!ouverts.length) {
    return `<section class="panneau">
      <h2 class="titre">Métiers <span class="droite">${pl(libres, 'manœuvre')}</span></h2>
      <div class="aide">Aucun poste ouvert : ce sont les bâtiments qui créent les places.
        En attendant, tout le monde donne un coup de main partout — ×${mainDoeuvre(b, S).toFixed(2)}
        sur l’ensemble.</div>
      ${blocBras()}
    </section>`;
  }

  const lignes = ouverts.map((k) => {
    const m = METIERS[k];
    const places = placesMetier(b, k);
    const veut = voulus(b, k);
    const n0 = affectes(b, k, S);
    const rd = rendementMetier(S, k);
    // Deux nombres différents, et il faut les deux : ce qu'on a réglé, et ce
    // qui est tenu aujourd'hui. Les confondre était tout le problème.
    const puce = n0 === veut
      ? `<span class="puce">${veut}/${places}</span>`
      : `<span class="puce att">${n0} tenu${n0 >= 2 ? 's' : ''} sur ${veut}</span>`;
    return `<div style="border-bottom:1px solid #26211a;padding:7px 0">
      <div class="ligne">
        <span class="k">${e(m.nom)} ${puce}</span>
        <span class="v ${n0 ? 'ambre' : ''}">${n0 ? `×${rd.mult.toFixed(2)}` : '—'}</span>
      </div>
      <div class="aide">${e(m.effet)}. ${e(m.texte)}</div>
      <div class="aide" ${rd.contremaitre ? 'style="color:var(--cyan)"' : ''}>${rd.contremaitre
    ? `Contremaître ${e(rd.contremaitre.nom)} — ${e(nomComp(m.skill))} ${Math.round(comp(rd.contremaitre, m.skill))}`
    : `Sans contremaître (${e(nomComp(m.skill))})`}</div>
      <div class="taches" style="margin-top:5px">
        <button class="act mini" data-a="poste" data-k="${k}" data-n="-1" ${veut <= 0 ? 'disabled' : ''}>−</button>
        <button class="act mini" data-a="poste" data-k="${k}" data-n="1"
          ${veut >= places ? 'disabled' : ''}>+</button>
        <button class="act mini" data-a="poste" data-k="${k}" data-n="max"
          ${veut >= places ? 'disabled' : ''}>Au complet</button>
        <button class="act mini" data-a="poste" data-k="${k}" data-n="0" ${veut <= 0 ? 'disabled' : ''}>Vider</button>
      </div>
    </div>`;
  }).join('');

  // Ce qui manque, dit avant qu'on s'en aperçoive par soi-même. C'était la
  // moitié du problème : le réglage se défaisait, et rien à l'écran ne disait
  // ni que ça arrivait, ni pourquoi.
  const degarnis = postesDegarnis(b, S);
  const total = brasDisponibles(b, S);
  const alerte = degarnis > 0 ? `<div class="aide ambre">${pl(degarnis, 'poste réglé', 'postes réglés')}
    que personne ne tient : il n’y a que ${n(total)} bras ici. Le réglage est gardé —
    les gens reprennent leur place dès qu’il y a du monde. Le manque se répartit sur
    tous les métiers, aucun n’est vidé au profit d’un autre.</div>` : '';

  return `<section class="panneau">
    <h2 class="titre">Métiers
      <span class="resume">${e(resumeMetiers(b))}${degarnis
    ? ` · <span class="att">${pl(degarnis, 'poste')} sans personne</span>` : ''}</span>
      <span class="droite">${pl(libres, 'manœuvre')} sur ${n(total)}</span></h2>
    <div class="aide">${n(total)} bras en tout : ${pl(Math.floor(b.pop || 0), 'habitant')}${bras
    ? ` et ${n(bras)} des vôtres aux travaux — ceux-là repartent avec l’escouade`
    : ', et personne de l’escouade (il faut lui donner l’ordre « Travaux », ici)'}.</div>
    ${alerte}
    <div class="aide">Un habitant sans poste aide partout un peu (×${mainDoeuvre(b, S).toFixed(2)}
      sur l’ensemble). Affecté, il rend bien davantage — mais sur sa chaîne seulement.
      Un des vôtres présent à l’avant-poste encadre l’équipe et vaut plusieurs bras.</div>
    <div class="sep"></div>
    ${lignes}
  </section>`;
}

/**
 * Combien de candidats on propose par matière. Au-delà, on ne rend pas
 * service : on fabrique une colonne qu'aucun pouce ne parcourt.
 */
const CANDIDATS_MONTRES = 8;


function blocEcoleBase() {
  const b = S.base;
  const surPlace = G().regionId === b.regionId;
  const antenne = nivBat(b, 'antenne');

  // La liste des gens, UNE fois. Elle était reconstruite pour chaque matière
  // enseignée, et une seconde fois par élève pour retrouver son instructeur :
  // avec les mille deux cent quarante-deux personnes que mène le propriétaire,
  // ce bloc coûtait 2 749 ms sur son téléphone — les trois secondes de
  // l'écran BASE à lui tout seul.
  const tous = groupes(S).flatMap((g) => g.membres);
  const parId = new Map(tous.map((c) => [c.id, c]));
  const cours = tous
    .filter((c) => c.formation && c.formation.maison)
    .map((c) => {
      const d = DIPLOMES[c.formation.key];
      const fait = c.formation.total - c.formation.restant;
      const maitre = parId.get(c.formation.instructeurId);
      return `<div class="contrat">
        <div class="contrat-t">${e(c.nom)} — ${e(d.court.toLowerCase())}${maitre ? `, sous ${e(maitre.nom)}` : ''}</div>
        ${jauge(fait / c.formation.total, 'cyan')}
        <div class="aide">${fait} / ${c.formation.total} h${surPlace ? '' : ' · suspendu, tout le monde est parti'}</div>
        <button class="act mini danger" data-a="abandonner-formation" data-c="${e(c.id)}">Interrompre</button>
      </div>`;
    }).join('');

  if (antenne < 1) {
    return `<section class="panneau">
      <h2 class="titre">Transmission</h2>
      <div class="aide">Vos gens pourraient se former entre eux, mais il faut de quoi
        consigner et projeter : montez une antenne.</div>
    </section>`;
  }

  const offres = ecolesAvantPoste(S);
  const lignes = offres.map((o) => {
    const d = DIPLOMES[o.key];
    const heures = Math.round(d.heures * LENTEUR_MAISON);
    // Les plus aptes d'abord, et pas tout le monde : une colonne de mille
    // boutons ne se lit pas, ne se parcourt pas, et coûte une seconde à
    // fabriquer. On propose les meilleurs, on dit combien d'autres attendent.
    const eligibles = tous.filter((c) => peutApprendreChezSoi(S, c, o.key).ok);
    const candidats = eligibles
      .slice()
      .sort((a, x) => comp(x, DIPLOMES[o.key].skill) - comp(a, DIPLOMES[o.key].skill))
      .slice(0, CANDIDATS_MONTRES);
    return `<div class="contrat">
      <div class="contrat-t">${e(d.court)} — ${e(o.instructeur.nom)} enseigne</div>
      <div class="ligne"><span class="k">À la sortie</span>
        <span class="v">${e(SKILLS[d.skill])} ${d.plancher} au minimum</span></div>
      <div class="ligne"><span class="k">Durée</span><span class="v">${dureeTexte(heures)}</span></div>
      ${candidats.length
    ? `<div class="taches">${candidats.map((c) => `<button class="act mini"
        data-a="apprendre-maison" data-k="${o.key}" data-c="${e(c.id)}">Former ${e(c.nom)}
        <span class="aide">(${Math.round(comp(c, d.skill))})</span></button>`).join('')}</div>
      ${eligibles.length > candidats.length
      ? `<div class="aide">Les ${CANDIDATS_MONTRES} plus avancés — ${pl(eligibles.length - candidats.length, 'autre')} pourrai${eligibles.length - candidats.length >= 2 ? 'ent' : 't'} aussi suivre.</div>`
      : ''}`
    : '<div class="aide">Personne à former là-dedans pour l’instant.</div>'}
    </div>`;
  }).join('');

  return `<section class="panneau">
    <h2 class="titre">Transmission <span class="droite">${pl(offres.length, 'matière')}</span></h2>
    <div class="aide">Ce que les vôtres savent, ils peuvent l’apprendre aux autres — sans
      payer une ville, mais plus lentement, et à deux immobilisés : l’élève et le maître.
      Il faut un diplômé, ou quelqu’un qui en sait bien plus que le cours.</div>
    ${cours ? `<div class="sep"></div><div class="titre">En cours</div>${cours}` : ''}
    ${!surPlace ? '<div class="aide" style="color:var(--ambre);margin-top:6px">Personne n’est à l’avant-poste.</div>' : ''}
    <div class="sep"></div>
    ${lignes || '<div class="aide">Personne ici n’en sait assez pour enseigner quoi que ce soit.</div>'}
  </section>`;
}

/**
 * Ce que la terre est devenue, et ce qu'on lui demande.
 *
 * Un amendement se compte en centièmes par jour : sans un endroit qui affiche
 * le total et l'écart avec le sol d'origine, on paie une station pendant six
 * mois sans jamais voir ce qu'elle a fait. C'est aussi le seul écran où l'on
 * choisit la cible de la station — sans cible, elle ne fait rien, et le dire
 * est la moitié du travail.
 */
/**
 * Les consignes : ce qu'on demande à chaque chaîne, et le droit de dire non.
 *
 * Jusqu'ici une chaîne consommait dès qu'elle avait de quoi. La raffinerie
 * brûlait le polymère qu'on gardait pour l'atelier ; l'infirmerie mangeait la
 * biomasse qui devait devenir des rations. On ne dirigeait pas un avant-poste,
 * on le regardait tourner.
 *
 * On n'affiche que les bâtiments montés : une liste de consignes pour des
 * ateliers qui n'existent pas est du bruit.
 */
/**
 * Ce que cette chaîne mange, ce qu'il en reste, et ce qui la bloque.
 *
 * « On voit pas toujours ce qui a besoin de quoi, qui produit quoi. » Le nom de
 * la recette dit bien « Biomasse → rations », mais il ne dit pas s'il reste de
 * la biomasse, ni pourquoi rien ne sort ce matin. Un atelier à l'arrêt, un
 * atelier sans courant et un atelier sans matière se ressemblaient tous les
 * trois : ils ne faisaient rien.
 *
 * On ne nomme qu'un seul empêchement — trois alertes empilées, c'est un mur
 * qu'on ne lit pas —, et c'est l'arrêt franc qui passe devant le ralentissement.
 * Un bac vide ne produit rien du tout ; un camp à quatre-vingts pour cent de
 * courant produit à quatre-vingts pour cent. Annoncer le second quand c'est le
 * premier qui bloque, c'est envoyer le joueur réparer ce qui marche.
 */
function ligneEntrees(b, k, recette) {
  const entrees = ENTREES[k] || [];
  // La raffinerie change d'entrée avec sa consigne : c'est justement le genre
  // de chose qu'on ne devine pas.
  const vraies = k === 'raffinerie'
    ? (recette === 'carburant' ? ['polymere'] : [])
    : entrees;
  const dechets = k === 'raffinerie' && recette !== 'carburant';
  // Le générateur brûle du carburant sans passer par `ENTREES` — cette table-là
  // sert aussi à proposer des réserves, et une réserve de carburant serait un
  // mensonge : le générateur passe outre, exprès.
  const brulot = k === 'generateur';
  // Et il ne subit pas la panne de courant : c'est lui qui la produit. Il
  // s'annonçait « tourne à 80 % » à cause de sa propre pénurie, ce qui invitait
  // à réparer la chose qui manquait avec la chose qui manquait.
  const subitLeCourant = (BUILDINGS[k].energie || 0) < 0;

  const stocks = vraies.map((m) => {
    const q = Math.floor(b.stock[m] || 0);
    const res = reserveDe(b, m);
    const bloque = q <= res;
    return `<span class="${bloque ? 'alerte' : ''}">${e(COMMODITIES[m].nom.toLowerCase())} ${n(q)}${
      res ? ` <span class="aide">(réserve ${n(res)})</span>` : ''}</span>`;
  }).join(' · ');

  if (recette === ARRET) {
    return `<div class="aide">Rien n’entre, rien ne sort : vous l’avez arrêtée.</div>`;
  }

  const en = energie(b, S);
  // D'abord ce qui arrête net.
  const vide = vraies.find((m) => Math.floor(b.stock[m] || 0) <= 0);
  const sousReserve = vraies.find((m) => Math.floor(b.stock[m] || 0) <= reserveDe(b, m));
  let empeche = null;
  if (brulot) {
    if (Math.floor(b.stock.carburant || 0) <= 0) {
      empeche = 'Plus de carburant : il ne produit plus rien.';
    }
  } else if (dechets && (b.dechets || 0) <= 0) {
    empeche = 'Le tas de déchets est vide — il se remplit tout seul en produisant.';
  } else if (vide) {
    empeche = `Plus de ${COMMODITIES[vide].nom.toLowerCase()} : elle tourne à vide.`;
  } else if (sousReserve) {
    empeche = `La réserve de ${COMMODITIES[sousReserve].nom.toLowerCase()} l’arrête `
      + '— c’est vous qui l’avez posée.';
  } else if (subitLeCourant && en.ratio < 0.999) {
    // Et seulement ensuite ce qui ralentit.
    empeche = `Le courant manque : elle tourne à ${Math.round(en.ratio * 100)} %.`;
  }

  const carb = Math.floor(b.stock.carburant || 0);
  const quoi = brulot
    ? `<span class="${carb > 0 ? '' : 'alerte'}">carburant ${n(carb)}</span>`
      + ' <span class="aide">(il passe outre les réserves)</span>'
    : dechets
      ? `<span class="${(b.dechets || 0) > 0 ? '' : 'alerte'}">déchets ${n(Math.floor(b.dechets || 0))}</span>`
      : (stocks || '<span class="aide">rien — elle produit à partir de la région</span>');
  return `<div class="aide">Consomme : ${quoi}</div>`
    + (empeche ? `<div class="aide alerte">▲ ${e(empeche)}</div>` : '');
}

function blocConsignes() {
  const b = S.base;
  if (!b.fonde) return '';
  const montes = RECETTES_KEYS.filter((k) => nivBat(b, k) > 0);
  if (!montes.length) return '';

  const lignes = montes.map((k) => {
    const choix = recettesDe(b, k);
    const actuelle = recetteDe(b, k);
    const def = choix.find((x) => x.id === actuelle);
    // On ne propose « arrêt » que là où il y a quelque chose à arrêter, et l'on
    // ne montre les autres consignes que s'il y en a plus d'une : un bouton
    // unique qu'on ne peut pas changer n'est pas un choix, c'est du décor.
    const boutons = [...choix, { id: ARRET, nom: 'Arrêter' }].map((x) => `
      <button class="act mini ${actuelle === x.id ? 'primaire' : ''}${x.id === ARRET ? ' danger' : ''}"
        data-a="recette" data-k="${k}" data-r="${x.id}">${e(x.nom)}</button>`).join('');
    return `<div style="border-bottom:1px solid #26211a;padding:7px 0">
      <div class="ligne souple"><span class="k">${e(BUILDINGS[k].nom)}
        <span class="puce">niv ${nivBat(b, k)}</span></span>
        <span class="v ${actuelle === ARRET ? 'alerte' : 'ok'}">${
  actuelle === ARRET ? 'à l’arrêt' : 'en marche'}</span></div>
      <div class="aide">${def ? e(def.aide || def.nom) : 'Rien ne tourne ici.'}</div>
      ${ligneEntrees(b, k, actuelle)}
      <div class="taches" style="margin-top:5px">${boutons}</div>
    </div>`;
  }).join('');

  const arretes = montes.filter((k) => recetteDe(b, k) === ARRET).length;

  // Les réserves : le plancher qu'aucune chaîne n'entame.
  //
  // « Les bâtiments bouffent les ressources avant qu'on ne puisse les utiliser
  // pour payer les recherches et autres bâtiments. » Arrêter la chaîne marche,
  // mais c'est tout ou rien — et l'on oublie de la rallumer. Un plancher, lui,
  // se pose une fois : la chaîne s'arrête d'elle-même en l'atteignant et
  // reprend quand la récolte l'a dépassé.
  //
  // On ne propose que les matières que les chaînes montées consomment vraiment.
  // La liste complète des dix marchandises serait un mur de boutons dont huit
  // ne servent à rien.
  const mange = new Set();
  for (const k of montes) {
    if (recetteDe(b, k) === ARRET) continue;
    for (const m of (ENTREES[k] || [])) mange.add(m);
  }
  const paliers = [0, 50, 150, 400];
  const reserves = [...mange].map((k) => {
    const val = reserveDe(b, k);
    const stock = Math.round(b.stock[k] || 0);
    return `<div class="ligne souple"><span class="k">${e(COMMODITIES[k].nom)}
      <span class="aide">${n(stock)} en stock</span></span>
      <span class="v"><span class="taches">${paliers.map((p) => `<button
        class="act mini ${val === p ? 'primaire' : ''}"
        data-a="reserve" data-k="${k}" data-n="${p}">${p || '—'}</button>`).join('')}</span></span>
    </div>`;
  }).join('');

  return `<section class="panneau">
    <h2 class="titre">Consignes
      <span class="resume">${resumeChaines(b, montes)}</span>
      <span class="droite ${arretes ? 'alerte' : ''}">${arretes
  ? `${arretes} à l’arrêt` : `${montes.length} en marche`}</span></h2>
    <div class="aide">Ce que chaque chaîne a le droit de consommer. Une raffinerie qu’on
      laisse faire brûlera le polymère que l’atelier attendait.</div>
    <div class="sep"></div>
    ${lignes}
    ${reserves ? `<div class="sep"></div>
      <div class="titre">Réserves intouchables</div>
      <div class="aide">Le plancher sous lequel aucune chaîne ne descend. C’est ainsi
        qu’on garde de quoi payer un bâtiment ou une recherche sans avoir à tout
        éteindre. Les gens, les bêtes et le générateur passent outre.</div>
      <div style="height:6px"></div>${reserves}` : ''}
  </section>`;
}

function blocTerre() {
  const b = S.base;
  if (!b.fonde) return '';
  const sem = nivBat(b, 'semoir');
  const ter = nivBat(b, 'terraformeur');
  const reg = S.world.regions[b.regionId];
  const amend = amendementRegion(S.world, b.regionId);
  if (!sem && !ter && !amend) return '';

  const nat = BIOMES[reg.biome].yields || {};
  const rendu = rendementRegion(S.world, b.regionId);
  const lignes = Object.keys(rendu).sort((x, y) => rendu[y] - rendu[x]).map((k) => {
    const gain = rendu[k] - (nat[k] || 0);
    return `<div class="ligne"><span class="k">${e(COMMODITIES[k].nom)}</span>
      <span class="v">${rendu[k].toFixed(2)}${gain > 0.005
  ? ` <span class="ok">(+${gain.toFixed(2)})</span>` : ''}</span></div>`;
  }).join('');

  return `<section class="panneau">
    <h2 class="titre">La terre <span class="droite">${e(BIOMES[reg.biome].nom)}</span></h2>
    <div class="aide">Ce que cette case rend par heure de travail — à la halle, et à
      qui fouille ou creuse ici. Ce qu’on y ajoute reste dans le sol : on peut perdre
      la place, la terre restera meilleure qu’on l’a trouvée.</div>
    <div class="sep"></div>
    ${lignes || '<div class="aide">Cette terre ne rend rien du tout.</div>'}
    ${ter > 0 ? `<div class="sep"></div>
      <div class="titre">Ce que la station travaille</div>
      <div class="taches" style="margin-top:5px">
        ${AMENDABLES.map((k) => `<button class="act mini ${b.terraforme === k ? 'primaire' : ''}"
          data-a="terraformer" data-k="${k}">${e(COMMODITIES[k].nom)}</button>`).join('')}
        <button class="act mini ${!b.terraforme ? 'primaire' : ''}"
          data-a="terraformer" data-k="">Rien</button>
      </div>
      <div class="aide">${b.terraforme
    ? `Elle travaille ${e(COMMODITIES[b.terraforme].nom.toLowerCase())}, jusqu’à `
      + `+${AMENDEMENT_MAX.terraformeur}. Elle brûle du carburant et des composants pour ça.`
    : '<span class="alerte">Aucune cible : la station tourne à vide.</span>'}</div>` : ''}
    ${sem > 0 ? `<div class="aide">L’ensemenceuse pousse la biomasse jusqu’à
      +${AMENDEMENT_MAX.semoir}, et consomme de la biomasse pour semer.</div>` : ''}
  </section>`;
}

// L'état du formulaire du comptoir. Il ne va pas dans la partie : c'est ce
// qu'on est en train de taper, pas ce qui est arrivé au monde.
let ordreSens = 'achat';
let ordreKey = 'rations';
let ordreQte = 50;
let ordreEscorte = 'aucune';
let ordreEscouade = false;
let messageComptoir = null;

const QTES_ORDRE = [10, 50, 200, 1000];

/**
 * Le comptoir : passer des ordres à une bourse sans bouger de chez soi.
 *
 * Tout le reste du commerce du jeu demande d'y aller — de charger, de marcher,
 * de revenir. Le comptoir est ce qui met fin à ça, et c'est pour cette raison
 * qu'il coûte une recherche, un bâtiment, et soit les couleurs d'une faction
 * soit son estime. Ce n'est pas un raccourci offert : c'est l'aboutissement
 * d'une branche entière.
 *
 * Ce qui n'est jamais offert, en revanche, c'est la sécurité du convoi. Voir
 * `ESCORTES` : un convoi qu'on ne peut pas perdre annulerait la carte.
 */
function blocComptoir() {
  const b = S.base;
  if (!b.fonde) return '';
  const niv = nivBat(b, 'comptoir');
  const c = ACTIONS.comptoir();
  if (!c) return '';
  // Rien de monté et rien en route : le panneau n'aurait rien à dire.
  if (!niv && !c.ordres.length) return '';

  const enRoute = c.ordres.map((o) => {
    const quoi = Object.keys(o.cargaison).map(
      (k) => `${n(Math.round(o.cargaison[k]))} ${COMMODITIES[k].nom.toLowerCase()}`).join(', ');
    return `<div class="ligne souple">
      <span class="k">${o.sens === 'achat' ? '↓' : '↑'} ${e(quoi)}
        <span class="aide">${e(nomRegion(S.world, o.regionId))} · garde ${n(o.escorte)}${
  o.escorteGroupe ? ' + escouade' : ''}</span></span>
      <span class="v">${o.reste} case${o.reste > 1 ? 's' : ''}${o.sens === 'vente'
    ? `<br><span class="aide">${n(o.paiement)} ${sym()} à l’arrivée</span>` : ''}</span>
    </div>`;
  }).join('');
  const suivi = c.ordres.length ? `<div class="sep"></div>
    <div class="titre">En route <span class="droite">${c.ordres.length}</span></div>
    <div class="aide">Un convoi traverse une région toutes les deux heures, et il peut
      être pillé sur le trajet. Tant qu’il roule, la marchandise n’est nulle part.</div>
    ${enRoute}` : '';

  if (!c.ok) {
    return `<section class="panneau">
      <h2 class="titre">Comptoir <span class="droite alerte">fermé</span></h2>
      <div class="aide">${e(c.motif || 'Indisponible.')}</div>
      ${suivi}
    </section>`;
  }

  const act = c.actif;
  const cours = act.prix || {};
  // Le choix du réseau ne se montre que s'il y a un choix à faire.
  const choixReseau = c.reseaux.length > 1 ? `<div class="taches" style="margin-top:5px">
    ${c.reseaux.map((r) => `<button class="act mini ${r.id === act.id ? 'primaire' : ''}"
      data-a="comptoir-reseau" data-r="${e(r.id)}">${e(r.membres.map(
    (k) => drapeauDe(S.world, k).nom).join(' + '))}</button>`).join('')}
  </div>` : '';

  const lignesCours = COMMODITY_KEYS.filter((k) => cours[k] > 0).map((k) => {
    const l = ligneCours(cours, k);
    // Le cours passe à la ligne — et il faut l'envelopper pour ça. Ces boutons
    // sont des conteneurs flex (`.taches .act.mini`), où un `<br>` nu ne fait
    // rien du tout : on lisait « Ferraille6,0 cr ». Un seul enfant, et la mise
    // en page redevient celle d'un texte ordinaire.
    return `<button class="act mini ${ordreKey === k ? 'primaire' : ''}"
      data-a="ordre-k" data-k="${k}"><span>${e(COMMODITIES[k].nom)}<br>
      <span class="aide">${n(cours[k], 1)} ${sym()}${l && l.ecart
  ? ` <span class="${l.ecart > 0 ? 'alerte' : 'ok'}">${l.ecart > 0 ? '+' : ''}${
    Math.round(l.ecart * 100)} %</span>` : ''}</span></span></button>`;
  }).join('');

  const devis = ACTIONS.chiffrerOrdre(ordreSens, ordreKey, ordreQte);
  const esc = c.escortes.find((x) => x.id === ordreEscorte) || c.escortes[0];
  const fraisEsc = devis.ok ? Math.round(devis.brut * esc.cout) : 0;
  const du = devis.ok
    ? (ordreSens === 'achat' ? devis.total + fraisEsc : devis.total - fraisEsc) : 0;
  const stockIci = Math.floor(b.stock[ordreKey] || 0);

  const g = G();
  const escouadeIci = !!(g && g.regionId === b.regionId);

  return `<section class="panneau">
    <h2 class="titre">Comptoir
      <span class="droite">${e(act.membres.map((k) => drapeauDe(S.world, k).nom).join(' + '))}</span></h2>
    <div class="aide">${act.sien
    ? 'Vous portez leurs couleurs : la commission est celle des leurs.'
    : `Vous n’êtes pas des leurs — ${act.estime} d’estime, et ${Math.round(
      act.commission * 100)} % de commission au lieu de ${Math.round(
      (act.commission - 0.08) * 100)} %.`}
      ${nivBat(b, 'comptoir') ? '' : '<span class="alerte">Aucun comptoir monté.</span>'}</div>
    ${choixReseau}
    <div class="sep"></div>

    <div class="taches">
      <button class="act mini ${ordreSens === 'achat' ? 'primaire' : ''}"
        data-a="ordre-sens" data-r="achat">Acheter</button>
      <button class="act mini ${ordreSens === 'vente' ? 'primaire' : ''}"
        data-a="ordre-sens" data-r="vente">Vendre</button>
    </div>
    <div class="taches" style="margin-top:5px">${lignesCours}</div>
    <div class="taches" style="margin-top:5px">Quantité
      ${QTES_ORDRE.map((q) => `<button class="act mini ${ordreQte === q ? 'primaire' : ''}"
    data-a="ordre-q" data-q="${q}">${q}</button>`).join('')}</div>

    <div class="sep"></div>
    <div class="titre">Garde du convoi</div>
    <div class="taches" style="margin-top:5px">
      ${c.escortes.map((x) => `<button class="act mini ${ordreEscorte === x.id ? 'primaire' : ''}"
    data-a="ordre-escorte" data-r="${e(x.id)}"><span>${e(x.nom)}<br>
    <span class="aide">${x.cout ? `+${Math.round(x.cout * 100)} %` : 'gratuit'}</span></span></button>`).join('')}
    </div>
    <div class="aide">${e(esc.aide)}</div>
    <button class="act mini ${ordreEscouade ? 'primaire' : ''}" style="margin-top:5px"
      data-a="ordre-escouade" ${escouadeIci ? '' : 'disabled'}>
      ${ordreEscouade ? '✓ ' : ''}Escorter avec ${e(g ? g.nom : 'l’escouade')}</button>
    <div class="aide">${escouadeIci
    ? 'Elle ne protège le convoi que tant qu’elle est sur la même case que lui : '
      + 'il faut vraiment faire la route avec.'
    : 'L’escouade n’est pas au camp — elle ne peut pas partir avec le convoi d’ici.'}</div>

    <div class="sep"></div>
    ${devis.ok ? `<div class="ligne"><span class="k">${ordreSens === 'achat'
    ? 'Cours à l’achat' : 'Cours à la vente'}</span>
      <span class="v">${n(devis.unite, 1)} ${sym()} l’unité</span></div>
    <div class="ligne"><span class="k">Lot</span>
      <span class="v">${n(devis.qte)} ${e(COMMODITIES[ordreKey].nom.toLowerCase())}
        · ${n(devis.brut)} ${sym()}</span></div>
    <div class="ligne"><span class="k">Commission</span>
      <span class="v">${n(devis.frais)} ${sym()} <span class="aide">(${
  Math.round(devis.part * 100)} %)</span></span></div>
    ${fraisEsc ? `<div class="ligne"><span class="k">Escorte</span>
      <span class="v">${n(fraisEsc)} ${sym()}</span></div>` : ''}
    <div class="ligne"><span class="k">${ordreSens === 'achat' ? 'À payer' : 'Vous touchez'}</span>
      <span class="v ${ordreSens === 'achat' ? 'alerte' : 'ok'}">${n(du)} ${sym()}</span></div>
    <div class="aide">${ordreSens === 'achat'
    ? 'Débité maintenant, livré à l’entrepôt quand le convoi arrive.'
    : `Sorti de l’entrepôt maintenant (${n(stockIci)} en stock), payé à l’arrivée. `
      + 'Un convoi pillé ne paie pas.'}</div>
    <button class="act primaire" style="margin-top:6px" data-a="passer-ordre"
      ${niv ? '' : 'disabled'}>Passer l’ordre</button>`
    : `<div class="aide alerte">${e(devis.motif || '')}</div>`}
    ${messageComptoir ? `<div class="aide ${messageComptoir.ok ? 'ok' : 'alerte'}"
      style="margin-top:6px">${e(messageComptoir.texte)}</div>` : ''}
    ${suivi}
  </section>`;
}

function ecranBase() {
  const b = S.base;
  if (!b.fonde) {
    const r = S.world.regions[G().regionId];
    const inv = G().inventaire;
    const manque = Object.keys(COUT_FONDATION)
      .filter((k) => (inv[k] || 0) < COUT_FONDATION[k])
      .map((k) => `${COMMODITIES[k].nom.toLowerCase()} ${n(inv[k] || 0)}/${COUT_FONDATION[k]}`);
    const enVille = !!r.colonie;
    return `<section class="panneau fiche-vide">
      <h2 class="titre">Aucun avant-poste</h2>
      <div class="aide">Un avant-poste vous donne un entrepôt, des chaînes de production
      et la recherche. Il faut le bâtir hors d’une ville existante, et il pourra être attaqué.</div>
      <div class="sep"></div>
      <div class="ligne"><span class="k">Coût</span><span class="v">${e(coutTexte(COUT_FONDATION))}</span></div>
      <div class="ligne"><span class="k">Emplacement</span><span class="v">${e(lieuAvecCoord(S.world, G().regionId))}</span></div>
      ${manque.length ? `<div class="aide" style="color:var(--rouge)">Manque : ${e(manque.join(', '))}</div>` : ''}
      ${enVille ? '<div class="aide" style="color:var(--rouge)">Impossible ici : une ville occupe déjà la région.</div>' : ''}
      <div class="sep"></div>
      <button class="act primaire" data-a="fonder" ${manque.length || enVille ? 'disabled' : ''}>
        Fonder l’avant-poste ici</button>
    </section>`;
  }

  const en = energie(b, S);
  const stock = totalStock(b);
  const capa = capaciteStock(S);

  // Ce qui marche sur vous, en tête d'écran et pas au fond du journal.
  const menaces = menacesSurLaBase(S);
  const menaceHtml = menaces.length ? `<section class="panneau urgent">
    <h2 class="titre">On marche sur ${e(b.nom)}
      <span class="droite alerte">${menaces.length}</span></h2>
    ${menaces.map((m) => `<div class="ligne"><span class="k"
      style="color:${couleurFaction(m.faction)}">${e(drapeauDe(S.world, m.faction).nom)}</span>
      <span class="v ${m.cases <= 3 ? 'alerte' : ''}">${m.vue
    ? `${n(m.force)} hommes` : '<span class="aide">nombre inconnu</span>'} · ${
  m.cases <= 0 ? 'ils y sont' : `${m.cases} région${m.cases > 1 ? 's' : ''}`}</span></div>`).join('')}
    ${menaces.some((m) => !m.vue) ? `<div class="aide">On sait qu’ils viennent — lever une
      colonne se crie sur les places — mais pas combien ils sont. Il faut les avoir en vue :
      un poste de garde porte à deux régions par niveau, l’Optique élargit ce que le camp
      surveille, la Cryptographie ouvre leurs transmissions, et quelqu’un envoyé sur leur
      route les compte de ses yeux.</div>` : ''}
    ${(() => {
    // Les nombres qui décident, et rien d'autre. « Renforcez votre défense » ne
    // dit pas si l'on tient ; « 137 + 22 contre 200 » le dit. On reprend les
    // termes exacts du siège (voir `capturer` dans factions.js), à leur valeur
    // moyenne : le sort tire entre 0,6 et 1,15 sur la tenue, entre 0,5 et 1,1
    // sur l'assaut, et rien ici ne peut donc être promis.
    const col = S.world.colonies.find((c) => c.id === b.colonieId);
    const place = col ? Math.round(col.defense) : Math.round(b.defense);
    const escouade = Math.round(forceEscouade(S));
    const murs = (col ? col.murs : nivBat(b, 'mur') * 3) * 2;
    const tenue = (place + escouade) * 0.875 + murs;
    // On ne compare qu'à ce qu'on a vraiment vu. Une colonne qu'on n'a pas
    // comptée ne doit pas produire un verdict : c'est ce qu'on ignore qui
    // décide, et le dire est plus utile que d'inventer un chiffre.
    const comptees = menaces.filter((m) => m.vue);
    const pire = comptees.length ? Math.max(...comptees.map((m) => m.force)) : null;
    return `<div class="sep"></div>
      <div class="ligne"><span class="k">Place et garnison</span>
        <span class="v">${n(place)}</span></div>
      <div class="ligne"><span class="k">Murs</span><span class="v">+${n(murs)}</span></div>
      <div class="ligne"><span class="k">Escouade sur place</span>
        <span class="v ${escouade > 0 ? 'ok' : 'alerte'}">${escouade > 0
  ? `+${n(escouade)}` : 'personne'}</span></div>
      <div class="ligne"><span class="k">Ce que la place vaut</span>
        <span class="v">${n(Math.round(tenue))}</span></div>
      ${pire === null ? `<div class="aide">Ce qu’ils envoient : on ne le sait pas encore.
        La place vaut ${n(Math.round(tenue))} ; c’est le seul des deux nombres qui soit à
        vous.</div>`
    : `<div class="ligne"><span class="k">Ce qu’ils envoient</span>
        <span class="v alerte">${n(pire)}</span></div>
      <div class="aide">${tenue >= pire * 0.8
      ? 'À vue de nez, la place tient. Le sort s’en mêle des deux côtés.'
      : 'À vue de nez, la place tombe. Ce qui pèse, dans l’ordre : les habitants '
        + '(2,5 chacun), un niveau de mur de plus, des miliciens affectés, et '
        + 'l’escouade ici plutôt qu’ailleurs — elle vaut ce que valent ses gens au combat.'}</div>`}`;
  })()}
  </section>` : '';

  const fileHtml = b.file.length ? b.file.map((it, i) => `
    <div style="margin-bottom:6px">
      <div class="ligne"><span class="k">${e(BUILDINGS[it.key].nom)} → niv. ${it.niveau}</span>
        <span class="v">${dureeTexte(Math.max(0, it.restant))}</span></div>
      ${jauge(1 - it.restant / it.total, 'cyan')}
      ${i === 0 ? '' : ''}
      <button class="act mini" data-a="annuler" data-i="${i}" style="margin-top:4px">Annuler (70 % remboursé)</button>
    </div>`).join('') : '<div class="aide">Rien en construction.</div>';

  // L'établi (BATIMENTS.md, B1-B2) : ce que l'attelage et la forge montent,
  // la matière au lancement, la pièce au sac du groupe qui passe.
  const aAtelage = (b.batiments.attelage || 0) >= 1;
  const aForge = (b.batiments.forge || 0) >= 1;
  const fabHtml = aAtelage || aForge ? `
    <div class="sep"></div>
    ${(b.fileFab || []).map((it) => `
      <div class="ligne"><span class="k">${it.key === 'charrette'
    ? 'Charrette' : e((ITEMS[it.key] || {}).nom || it.key)} en montage</span>
        <span class="v">${dureeTexte(Math.max(0, it.restant))}</span></div>
      ${jauge(1 - Math.max(0, it.restant) / it.total, 'cyan')}
      ${it.restant <= 0 ? '<div class="aide">Finie — elle attend qu’un groupe passe la prendre.</div>' : ''}`).join('')}
    ${aAtelage ? `<button class="act mini" data-a="fabriquer-charrette" style="margin-top:4px">
      Monter une charrette (${e(coutTexte(ATTELAGE.cout))} · ${dureeTexte(ATTELAGE.heures)})</button>
    ${(b.batiments.attelage || 0) >= 2
    ? '<div class="aide">La remise répare les charrettes qui rentrent — de la ferraille et des heures.</div>'
    : ''}` : ''}
    ${aForge ? `<div class="aide" style="margin-top:6px">La forge bat ${(b.batiments.forge || 0) >= 2
    ? 'jusqu’au palier 2' : 'les pièces simples'} :</div>
    ${forgeables(b).map((k) => {
    const c = coutForge(k);
    const h = Math.max(FORGE.heuresMin, Math.round(ITEMS[k].prix * FORGE.heuresParPrix));
    return `<button class="act mini" data-a="forger" data-k="${k}" style="margin:2px 2px 0 0">
        ${e(ITEMS[k].nom)} · ${e(coutTexte(c))} · ${dureeTexte(h)}</button>`;
  }).join('')}` : ''}` : '';

  // Les bâtiments par ce qu'ils font, et non dans l'ordre du fichier de
  // données. Le baraquement y arrivait en dernier alors que c'est lui qui
  // décide si quelqu'un peut vivre là ; la halle et l'hydroponie — récolter et
  // manger — étaient noyées entre la fonderie et la raffinerie.
  const FAMILLES = [
    { nom: 'Tenir sur place', clefs: ['baraquement', 'halle', 'bassins', 'hydroponie', 'cantine', 'serres'] },
    { nom: 'Changer la terre', clefs: ['semoir', 'terraformeur'] },
    { nom: 'Alimenter', clefs: ['generateur', 'solaire', 'eolienne'] },
    { nom: 'Produire', clefs: ['entrepot', 'fonderie', 'raffinerie', 'distillerie', 'atelier', 'forge'] },
    { nom: 'Se défendre et soigner', clefs: ['mur', 'poste', 'infirmerie', 'salle'] },
    { nom: 'Savoir et commercer', clefs: ['antenne', 'comptoir', 'attelage'] },
  ];
  // Un bâtiment absent de ces listes n'existe pour personne : il ne s'affiche
  // nulle part, donc il ne se construit pas. Le comptoir est resté invisible
  // ainsi — déclaré, chiffré, testé côté moteur, et introuvable à l'écran.
  // C'est le même défaut que la liste d'embauche qui oubliait quatre métiers :
  // **une liste qu'il faut penser à compléter finit par être incomplète.** Un
  // test la compare maintenant à BUILDINGS ; ce garde-ci n'est là que pour le
  // cas où l'on jouerait une version non testée.
  const orphelins = Object.keys(BUILDINGS).filter(
    (k) => !FAMILLES.some((f) => f.clefs.includes(k)));
  if (orphelins.length) FAMILLES.push({ nom: 'Divers', clefs: orphelins });
  const carteBat = (k) => {
    const bd = BUILDINGS[k];
    const niv = nivBat(b, k);
    const enFile = b.file.filter((x) => x.key === k).length;
    const cout = coutBatiment(b, k);
    const manque = manquePour(b, k);
    const plein = niv + enFile >= bd.max;
    // Un bâtiment qui s'invente avant de se bâtir le dit sur son bouton, sinon
    // le joueur clique sur « Construire » et il ne se passe rien.
    const verrou = bd.recherche && niveauRech(b, bd.recherche) < 1
      ? RESEARCH[bd.recherche].nom : null;
    return `<div style="border-bottom:1px solid #26211a;padding:6px 0">
      <div class="ligne souple"><span class="k">${e(bd.nom)} <span class="puce">niv ${niv}${enFile ? `+${enFile}` : ''}</span></span>
        <span class="v">${bd.energie > 0 ? `+${bd.energie * (niv + 1)}` : bd.energie < 0 ? `${bd.energie * (niv + 1)}` : '—'} én.</span></div>
      <div class="aide">${e(apportBatiment(b, k, S))}</div>
      <div class="aide">Coût : ${e(coutTexte(cout))} · ${dureeTexte(tempsBatiment(b, k))}</div>
      <button class="act mini" data-a="construire" data-k="${k}" ${plein || verrou || manque.length ? 'disabled' : ''}
        style="margin-top:4px">${plein ? 'Niveau maximum'
    : verrou ? `Recherche « ${e(verrou)} » d’abord`
      : manque.length
        ? `Il manque ${e(manque.map((m) => `${n(m.qte)} ${COMMODITIES[m.key].nom.toLowerCase()}`).join(' et '))}`
        : `Construire niv. ${niv + enFile + 1}`}</button>
    </div>`;
  };
  const batHtml = chrono('bâtiments', () => FAMILLES.map((f) => `<div class="titre" style="margin-top:8px">${e(f.nom)}</div>
    ${f.clefs.filter((k) => BUILDINGS[k]).map(carteBat).join('')}`).join(''));

  const rechHtml = chrono('recherches', () => RESEARCH_KEYS.map((k) => {
    const rd = RESEARCH[k];
    const niv = niveauRech(b, k);
    const enFile = b.fileRech.filter((x) => x.key === k).length;
    const cout = coutRecherche(b, k);
    const dispo = Object.keys(cout).every((c) => (c === 'credits' ? soldeIci(S) : (b.stock[c] || 0)) >= cout[c]);
    const plein = niv + enFile >= rd.max;
    const sansAntenne = nivBat(b, 'antenne') < 1;
    // Cinq recherches en exigent une autre, et rien ne le disait : le bouton
    // annonçait « Lancer », le clic échouait, et il fallait lire le message
    // fugace pour comprendre. Une condition se lit avant d'agir, pas après.
    const amont = rd.exige && niveauRech(b, rd.exige) < 1 ? RESEARCH[rd.exige] : null;
    return `<div style="border-bottom:1px solid #26211a;padding:6px 0">
      <div class="ligne"><span class="k">${e(rd.nom)}</span><span class="v"><span class="puce">niv ${niv}/${rd.max}</span></span></div>
      <div class="aide">${e(rd.desc)}</div>
      ${rd.exige ? `<div class="aide ${amont ? 'ambre' : ''}">${amont
    ? `Demande d’abord la recherche ${e(amont.nom)}.`
    : `Ouverte par la recherche ${e(RESEARCH[rd.exige].nom)}.`}</div>` : ''}
      <div class="aide">Coût : ${e(coutTexte(cout))} · ${dureeTexte(tempsRecherche(b, k, S))}</div>
      <button class="act mini" data-a="chercher" data-k="${k}"
        ${plein || !dispo || sansAntenne || amont ? 'disabled' : ''} style="margin-top:4px">
        ${plein ? 'Terminé' : sansAntenne ? 'Antenne requise'
    : amont ? `${e(amont.nom)} d’abord` : 'Lancer'}</button>
    </div>`;
  }).join(''));

  const stockHtml = chrono('stocks', () => COMMODITY_KEYS.map((k) => `<div class="ligne">
    <span class="k">${e(COMMODITIES[k].nom)}</span><span class="v">${n(b.stock[k] || 0)}</span></div>`).join(''));

  // Les verbes du siège (SIEGE.md, S3) : tenir, sortir, payer, ou partir.
  const siege = siegeEnCours(S);
  const siegeHtml = siege ? `<section class="panneau urgent">
    <h2 class="titre">${e(drapeauDe(S.world, siege.faction).nom)} assiège ${e(b.nom)}
      <span class="droite alerte">${n(siege.force)} hommes</span></h2>
    <div class="aide">Tenir ne demande rien — les murs et la garnison font ce
      qu’ils peuvent, heure après heure. Le reste se décide ici.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      <button class="act mini" data-a="sortie-siege">Sortir se battre</button>
      ${siege.faction === 'essaim'
    ? '<button class="act mini" disabled>L’Essaim ne négocie pas</button>'
    : `<button class="act mini" data-a="negocier-siege">Payer ${n(prixSiege(S, siege))} ${e(sym())}</button>`}
      <button class="act mini danger" data-a="evacuer-camp">Évacuer le camp</button>
    </div>
  </section>` : '';

  // La bande vue par la vigie (SIEGE.md, S2) : le temps qu'il reste, en gros.
  const vigieHtml = b.raidImminent ? `<section class="panneau urgent">
    <h2 class="titre">La vigie a donné l’alerte</h2>
    <div class="ligne"><span class="k">Bande en approche</span>
      <span class="v alerte">assaut ${b.raidImminent.echeance - S.temps <= 0
    ? 'imminent' : `d’ici ${dureeTexte(b.raidImminent.echeance - S.temps)}`}</span></div>
    <div class="aide">Le temps de rappeler un groupe, de rentrer ce qui traîne,
      et de choisir comment on se battra.</div>
  </section>` : '';

  return `
  ${siegeHtml}
  ${vigieHtml}
  ${menaceHtml}
  ${bandeauEcran(b.nom, [
    [n(Math.round(b.pop || 0)), 'habitants'],
    [n(b.defense), 'défense'],
    [`<span class="${stock >= capa * 0.95 ? 'mal' : ''}">${Math.round((stock / Math.max(1, capa)) * 100)} %</span>`, 'entrepôt'],
  ])}
  <section class="panneau">
    <h2 class="titre">${e(b.nom)} <span class="droite">${e(lieuAvecCoord(S.world, b.regionId))}</span></h2>
    <div class="grille2 serree">
      <div class="ligne"><span class="k">Énergie</span>
        <span class="v ${en.ratio < 1 ? '' : ''}">${n(en.prod)} / ${n(en.conso)}</span></div>
      <div class="ligne"><span class="k">Défense</span><span class="v">${n(b.defense)}</span></div>
      ${(b.batiments.mur || 0) > 0 ? `<div class="ligne"><span class="k">Murs</span>
        <span class="v ${(b.brecheEtat ?? 1) < 0.4 ? 'alerte' : ''}">${(b.brecheEtat ?? 1) <= 0
    ? 'brèche ouverte' : `${Math.round((b.brecheEtat ?? 1) * 100)} %`}</span></div>` : ''}
    </div>
    ${en.ratio < 1 ? `<div class="aide" style="color:var(--ambre)">Production réduite à ${(en.ratio * 100).toFixed(0)} % :
      ${(b.stock.carburant || 0) <= 0 ? 'plus de carburant.' : 'énergie insuffisante.'}</div>` : ''}
    <div class="sep"></div>
    <div class="ligne"><span class="k">Habitants</span>
      <span class="v">${n(Math.round(b.pop || 0))} / ${n(populationMax(b, S))}${b.colonieId
    ? ' · <span class="ok">sur les cartes</span>' : ''}</span></div>
    ${jauge(populationMax(b, S) ? (b.pop || 0) / populationMax(b, S) : 0, '', '#6be08a')}
    <div class="aide">${(b.pop || 0) === 0
    ? 'Personne ne vit ici. Un baraquement et des vivres y changeraient quelque chose.'
    : `Main-d’œuvre ×${mainDoeuvre(b, S).toFixed(2)} sur les chaînes · +${n(Math.round((b.pop || 0) * 2.5))} de défense · ${n((b.pop || 0) * 0.014 * 24, 1)} rations/jour consommées`}</div>
    ${b.colonieId
    ? `${blocDrapeau(b)}`
    : `<div class="aide">Un camp que personne n’a inscrit nulle part n’intéresse personne.
        Se faire reconnaître, c’est tenir ses routes comme une ville, voir passer trois
        fois plus de monde — et devenir une place que les conseils voisins convoitent.
        On ne revient pas en arrière.</div>
      <button class="act mini ${peutReconnaitre(S).ok ? 'primaire' : ''}" data-a="reconnaitre"
        style="margin-bottom:6px" ${peutReconnaitre(S).ok ? '' : 'disabled'}>
        ${peutReconnaitre(S).ok ? `Faire reconnaître ${e(b.nom)}` : e(peutReconnaitre(S).motif)}</button>`}
    <button class="act mini" data-a="autoemploi" style="margin-bottom:4px"
      aria-pressed="${b.autoEmploi !== false}"><span class="coche" aria-hidden="true"></span>
      Les habitants se placent eux-mêmes</button>
    <button class="act mini" data-a="commerce" style="margin-bottom:6px"
      aria-pressed="${b.commerce !== false}"><span class="coche" aria-hidden="true"></span>
      Laisser les colporteurs traiter avec l’intendance</button>
    <div class="aide">Ils prennent le surplus au prix du gros et laissent ce qui manque
      au prix du détail : moins avantageux que d’aller vendre soi-même, et l’on n’a pas
      marché. Ils passent d’autant plus souvent que la piste est faite
      (${Math.round((S.world.regions[b.regionId].piste || 0) * 100)} %).</div>
    ${(b.dechets || 0) > 0.5 || nivBat(b, 'raffinerie') > 0 ? `<div class="ligne">
      <span class="k">Déchets</span>
      <span class="v ${(b.dechets || 0) >= dechetsMax(b) * 0.98 ? 'alerte' : ''}">${
  n(Math.round(b.dechets || 0))} / ${n(dechetsMax(b))}</span></div>
      <div class="aide">Ce que les chaînes recrachent. Ça ne se vend pas et ça ne se porte
        pas ; au-delà du tas, le vent l’emporte.${niveauRech(b, 'pyrolyse') > 0
    ? ' La raffinerie le brûle et en tire du carburant.'
    : ' <span class="ambre">La Pyrolyse en ferait du carburant.</span>'}</div>` : ''}
    <div class="ligne"><span class="k">Entrepôt</span>
      <span class="v ${stock >= capa * 0.98 ? 'alerte' : ''}">${n(stock)} / ${n(capa)}</span></div>
    ${b.gaspille > 20 ? `<div class="aide alerte">L’entrepôt a déjà refusé
      ${n(Math.round(b.gaspille))} unités faute de place. Ce qui ne rentre pas est perdu.</div>` : ''}
    ${jauge(stock / capa, stock / capa > 0.95 ? 'rouge' : '')}
  </section>

  ${chrono('chaînes', blocChaine)}
  ${chrono('consignes', blocConsignes)}

  <section class="panneau">
    <h2 class="titre">File de construction
      <span class="resume">${b.file.length
    ? e(b.file.map((x) => `${BUILDINGS[x.key].nom} → niv. ${x.niveau}`).join(' · '))
    : 'rien en chantier'}</span>
      <span class="droite">${b.file.length}/5</span></h2>
    ${fileHtml}
    ${fabHtml}
  </section>

  <section class="panneau">
    <h2 class="titre">Bâtiments
      <span class="resume">${e(resumeBatiments(b))}</span>
      <span class="droite">${Object.keys(b.batiments).filter((k) => b.batiments[k] > 0).length} montés</span></h2>
    ${batHtml}
  </section>

  ${chrono('métiers', blocMetiers)}
  ${chrono('école', blocEcoleBase)}
  ${chrono('comptoir', blocComptoir)}
  ${chrono('terre', blocTerre)}

  <section class="panneau">
    <h2 class="titre">Recherche
      <span class="resume">${b.fileRech.length
    ? e(b.fileRech.map((x) => `${RESEARCH[x.key].nom} — ${dureeTexte(Math.max(0, x.restant))}`).join(' · '))
    : 'aucune recherche en cours'}</span>
      <span class="droite">${b.fileRech.length}/3</span></h2>
    ${b.fileRech.length ? b.fileRech.map((it) => `
      <div style="margin-bottom:6px">
        <div class="ligne"><span class="k">${e(RESEARCH[it.key].nom)} → niv. ${it.niveau}</span>
          <span class="v">${dureeTexte(Math.max(0, it.restant))}</span></div>
        ${jauge(1 - it.restant / it.total, 'cyan')}
      </div>`).join('') : '<div class="aide">Aucune recherche en cours.</div>'}
    <div class="sep"></div>
    ${rechHtml}
  </section>

  <section class="panneau">
    <h2 class="titre">Stock
      <span class="resume">${resumeStock(b)}</span>
      <span class="droite ${totalStock(b) > capaciteStock(S) * 0.95 ? 'alerte' : ''}">${
  n(Math.round(totalStock(b)))} / ${n(capaciteStock(S))}</span></h2>
    ${stockHtml}
  </section>`;
}

// ---------------------------------------------------------------------------
// Écran CONTRATS
// ---------------------------------------------------------------------------

function ligneContrat(c, enCours) {
  const p = enCours ? progresContrat(S, c) : null;
  // La plupart des offres n'ont pas de délai : le mot « urgent » et le temps
  // restant ne s'affichent que pour celles qui en ont une, sinon on cherche une
  // pendule là où il n'y en a pas.
  const presse = enCours ? !!c.echeance : !!c.duree;
  // `null` et non zéro : le bloc de cible doit pouvoir distinguer « il reste
  // zéro heure » de « il n'y a pas d'heure à compter ». Avec zéro, un contrat
  // sans délai s'affichait « le délai ne le permet pas ».
  const reste = presse ? (enCours ? c.echeance - S.temps : c.duree) : null;
  const donneur = colonieParId(S.world, c.colonieId);
  return `<div class="contrat">
    <div class="ligne">
      <span class="k"><span class="puce" style="border-color:${couleurFaction(c.faction)};color:${couleurFaction(c.faction)}">${e(CONTRATS[c.type].nom)}</span>${
  presse ? ' <span class="puce mal">urgent</span>' : ''}</span>
      <span class="v ambre">${n(c.recompense)} ${sym()} · rép +${gainEstime(S, c)}</span>
    </div>
    <div class="contrat-t">${e(c.titre)}</div>
    ${p ? `${jauge(p.total ? p.fait / p.total : 0, p.pret ? 'vert' : '')}
      <div class="aide">${(() => {
    // La flèche « → X » ne dit rien que la ligne de cible ne dise mieux
    // (lieu, coordonnées, distance) : on ne la garde que si elle porte un
    // état en plus — « colis ailleurs », « ville disparue » (U4).
    const lieu = lieuValidation(S, c);
    const etat2 = p.texte === `→ ${lieu}` ? '' : e(p.texte);
    const rendre = p.texte.includes(lieu) || c.type === 'livraison'
      ? '' : `à rendre à ${e(lieu)}`;
    const parts = [etat2, rendre].filter(Boolean);
    return parts.length ? `${parts.join(' · ')} · ` : '';
  })()}${presse
    ? `<span class="${reste < 48 ? 'alerte' : ''}">${dureeTexte(Math.max(0, reste))} restantes</span>`
    : '<span class="cyan">sans délai</span>'}</div>`
    : `<div class="aide">Commanditaire : ${e(donneur ? donneur.nom : '—')} · ${presse
      ? `<span class="alerte">${dureeTexte(reste)} accordées</span>, et l’urgence se paie`
      : 'aucun délai : ils attendront'}</div>`}
    ${blocCibleContrat(c, reste)}
    ${enCours ? (() => {
    // Le bouton dit ce qui va se passer. Rendre un colis et le voler sont deux
    // gestes différents, et le second se payait sans qu'on ait été prévenu.
    const r = peutRendre(S, c);
    if (r.ok) {
      return `<button class="act mini" data-a="abandonner" data-k="${e(c.id)}">${
        r.rien ? 'Renoncer au contrat' : 'Rendre le colis et renoncer'}
        <br><span class="aide">sans conséquence</span></button>`;
    }
    return `<button class="act mini danger" data-a="abandonner" data-k="${e(c.id)}">
        Renoncer en gardant le colis
        <br><span class="aide">−12 d’estime : ${e(r.motif)}</span></button>`;
  })()
    : `<button class="act mini primaire" data-a="accepter" data-k="${e(c.id)}">Accepter</button>`}
  </div>`;
}

/**
 * L'intendance, quand on est dans une ville des siens. C'est ce qui distingue
 * la voie du service des deux autres : on n'achète pas à manger, on le touche.
 */
/**
 * Le secteur : ce dont on répond tous les jours. C'est le seul bloc de la
 * page qui ne parle ni de guerre ni de conseil — on tient des routes, on est
 * relevé dessus, et ça suffit à remplir une carrière en temps de paix.
 */
function blocSecteur() {
  const all = G() && G().allegeance;
  if (!all) return '';
  if (!all.secteur) {
    return `<div class="sep"></div>
      <div class="aide">On ne vous confie encore aucun secteur : il faut être
        ${e(RANGS[RANG_SECTEUR].nom)}.</div>`;
  }
  const r = resumeSecteur(S.world, all.secteur);
  const ville = colonieParId(S.world, all.secteur.ville);
  const reste = Math.max(0, all.secteur.prochainBilan - S.temps);
  const mauvais = r.etat >= SEUIL_FAUTE;
  const bon = r.etat <= SEUIL_MERITE;
  const ici = dansSonSecteur(G());
  return `<div class="sep"></div>
  <div class="titre">Votre secteur
    <span class="droite ${mauvais ? 'alerte' : bon ? 'vert' : ''}">${e(r.mot)}</span></div>
  <div class="ligne"><span class="k">Routes autour de ${e(ville ? ville.nom : '—')}</span>
    <span class="v">${r.cases} cases</span></div>
  ${jauge(1 - Math.min(1, r.etat / SEUIL_FAUTE), mauvais ? 'alerte' : bon ? 'vert' : '')}
  <div class="aide">Relevé dans ${dureeTexte(reste)}${all.secteur.dernier !== undefined
    ? ` · dernier relevé : ${e(motEtat(all.secteur.dernier))}` : ''}.
    ${r.pire ? `Le pire coin est ${e(r.pire)}.` : ''}</div>
  <div class="aide">${ici
    ? 'Vous y êtes. Patrouiller tient les pistes ; y travailler ne fait que les effleurer.'
    : 'Vous n’y êtes pas. Personne ne tient un secteur depuis l’autre bout de la carte.'}</div>`;
}

/**
 * Ce que la charge permet d'ordonner. Il n'y a plus de pourcentage affiché :
 * un officier n'a pas de « chances d'être écouté », il a une compétence. Ce
 * qu'on montre à la place, c'est l'étendue de la charge, ce qu'elle coûte au
 * trésor, et le crédit qui reste — celui qu'on perd en ratant ce qu'on a voulu.
 */
function blocInfluence(faction) {
  const d = dirigeant(S.world, faction);
  if (!d) return '';
  const cr = creditInfluence(S, faction);
  const lignes = PREROGATIVE_KEYS.map((k) => ligneCharge(faction, k)).join('');

  // M7 : l'offre de la couronne, et le règne — la porte de la voie du service.
  const offre = S.player.offreCouronne;
  const blocOffre = offre && offre.faction === faction
    ? `<div class="sep"></div>
      <div class="titre">La couronne <span class="droite ambre">${dureeTexte(Math.max(0, offre.echeance - S.temps))} pour répondre</span></div>
      <div class="aide">${e(drapeauDe(S.world, faction).nom)} vous offre la charge de dirigeant.
        Accepter : la maison porte votre nom, le conseil s’efface, la légitimité remplace le
        crédit — et l’on ne démissionne pas d’un trône, on en tombe. Refuser est permis.</div>
      <button class="act" data-a="couronne" data-k="oui">Accepter la couronne</button>
      <button class="act mini" data-a="couronne" data-k="non">Décliner — la vie continue</button>`
    : '';
  const regne = d.joueur
    ? `<div class="sep"></div>
      <div class="titre">Votre règne
        <span class="droite ${d.legitimite < 30 ? 'alerte' : ''}">légitimité ${Math.round(d.legitimite)}</span></div>
      ${jauge(Math.min(1, d.legitimite / 100), d.legitimite < 30 ? 'alerte' : 'vert')}
      <div class="aide">${e(d.titre)} ${e(d.nom)} — la maison porte votre nom. Le conseil s’est
        effacé : plus une loi, plus une colonne, plus une paix qui ne soit de vous. La légitimité
        remplace le crédit ; à zéro, plus personne n’exécute — et le trône vous renversera comme
        un autre.</div>`
    : '';

  return `${blocOffre}${regne}<div class="sep"></div>
  <div class="titre">Votre charge</div>
  <div class="ligne"><span class="k">Crédit auprès ${e(drapeauDe(S.world, faction).genitif)}</span>
    <span class="v ${cr < 40 ? 'alerte' : ''}">${n(cr)}</span></div>
  <div class="aide">${e(d.titre)} ${e(d.nom)}, ${e(TEMPERAMENTS[d.temperament].nom.toLowerCase())}.
    Vous n’avez rien à lui demander : ce que votre grade permet, vous l’ordonnez.
    Mais chaque ordre s’inscrit, et son issue vous revient.</div>
  ${commandementDe(S) === faction
    ? `<div class="aide" style="color:var(--ambre,#d9803a)">Les colonnes n’obéissent qu’à vous :
      le conseil ne lève plus un homme. Il reprend la main pendant vos absences, ou si le
      crédit tombe — et toute ville perdue s’impute à vous, pas au dirigeant.</div>`
    : ''}
  ${lignes}`;
}

/** Une prérogative : ce qu'elle permet, et sur quoi on peut l'exercer ici. */
function ligneCharge(faction, k) {
  const def = PREROGATIVES[k];
  const v = peutExercer(S, faction, k);
  if (!v.ok) {
    return `<div style="border-bottom:1px solid #26211a;padding:5px 0;opacity:.5">
      <div class="ligne"><span class="k">${e(def.nom)}</span>
        <span class="v">${e(v.motif)}</span></div>
      <div class="aide">${e(def.desc)}</div>
    </div>`;
  }
  const cibles = ciblesCharge(faction, k);
  return `<details data-id="prero-${k}" ${ouverts.has(`prero-${k}`) ? 'open' : ''}
    style="border-bottom:1px solid #26211a;padding:5px 0">
    <summary class="ligne"><span class="k">${e(def.nom)}</span>
      <span class="v ambre">${cibles.length ? `${cibles.length} possible${cibles.length > 1 ? 's' : ''}` : '—'}</span></summary>
    <div class="aide">${e(def.desc)} <span style="opacity:.7">${e(def.charge)}</span></div>
    ${cibles.length
    ? cibles.map((c) => `<button class="act mini" style="margin-top:4px"
        data-a="ordonner" data-f="${e(faction)}" data-r="${k}" data-k="${e(c.val)}"
        data-b="${e(c.val2 || '')}">${e(c.texte)}</button>`).join('')
    : `<div class="aide">${e(cibleVide(k))}</div>`}
  </details>`;
}

function villesDeFaction(key) {
  return S.world.colonies.filter((c) => !c.ruine && c.faction === key).length;
}

function cibleVide(k) {
  return {
    bourse: 'Rien à ouvrir : il leur faut quatre villes, de quoi l’amorcer, et pas de bourse déjà.',
    accord: 'Personne à brancher : il leur faut une bourse ouverte, et pas de guerre entre vous.',
    rompre: 'Aucun accord commercial en cours.',
    envoyer: 'Aucune colonne des vôtres n’est sur les routes.',
    rappeler: 'Rien à rappeler : aucune colonne en campagne.',
    place: 'Pas une place à tenir : la maison n’a plus de ville.',
    lever: 'Rien à lever : aucune ville ennemie à portée, ou un trésor qui ne paie plus vingt-cinq hommes.',
    fonder: 'Pas une case libre assez près des vôtres, ni assez loin des autres.',
    garnison: 'Aucune ville ne vous est confiée — il faut un secteur.',
    grenier: 'Aucune ville ne vous est confiée — il faut un secteur.',
    loi: 'La loi est déjà celle que vous vouliez.',
    crediter: 'Ce pays ne tient plus une ville à qui prêter.',
    emettre: 'Il n’y a plus de pays pour battre monnaie.',
    guerre: 'Vous êtes déjà en guerre avec tout le monde qui compte.',
    paix: 'Vous n’êtes en guerre avec personne.',
  }[k] || '—';
}

/** Ce sur quoi la prérogative peut s'exercer, ici et maintenant. */
function ciblesCharge(faction, k) {
  const w = S.world;
  if (k === 'envoyer') {
    const out = [];
    for (const a of colonnesDe(S, faction)) {
      const cible = colonieParId(w, a.cible);
      for (const c of villesVisables(faction).slice(0, 4)) {
        if (cible && c.id === cible.id) continue;
        out.push({
          val: a.id,
          val2: c.id,
          texte: `${a.force} h. ${cible ? `(sur ${cible.nom})` : ''} → ${c.nom}`,
        });
      }
    }
    return out.slice(0, 12);
  }
  if (k === 'rappeler') {
    return colonnesDe(S, faction)
      .filter((a) => a.etat !== 'garnison' && !a.rappel)
      .slice(0, 6)
      .map((a) => {
        const cible = colonieParId(w, a.cible);
        return {
          val: a.id,
          texte: a.etat === 'siege' && cible
            ? `${a.force} h. — lever le siège de ${cible.nom} et rentrer`
            : `${a.force} h.${cible ? ` (sur ${cible.nom})` : ''} — rentrer`,
        };
      });
  }
  if (k === 'lever') {
    // M6 (MARECHAL.md) : une campagne se dimensionne. Les forces proposées
    // sortent du trésor, pas d'une table — la dernière est tout ce qu'il paie.
    const f = w.factions[faction];
    const maxForce = Math.floor((f.tresor * Math.max(0.001, coursMonnaie(w, faction))) / 5.2);
    const forces = [...new Set([40, FORCE_LEVEE * 2, maxForce])]
      .filter((x) => x >= 25 && x <= maxForce).sort((a, b) => a - b);
    const out = [];
    for (const c of villesVisables(faction).slice(0, 4)) {
      for (const force of forces) {
        out.push({
          val: c.id,
          val2: String(force),
          texte: `${force} hommes sur ${c.nom} — ${n(coutLevee(S, faction, force))} ${sym(faction)}${
            force === maxForce ? ' (tout ce que le trésor paie)' : ''}`,
        });
      }
    }
    return out.slice(0, 12);
  }
  if (k === 'fonder') {
    const sites = sitesFondation(w, faction);
    const proche = (r) => Math.min(...w.colonies
      .filter((c) => !c.ruine && c.faction === faction)
      .map((c) => distance(c.regionId, r.i)));
    sites.sort((a, b) => proche(a) - proche(b));
    return sites.slice(0, 6).map((r) => ({
      val: String(r.i),
      texte: `Poste en ${lieuAvecCoord(w, r.i)} — ${n(COUT_POSTE)} ${sym(faction)}`,
    }));
  }
  if (k === 'bourse') {
    const v = peutOuvrirBourse(S, faction);
    if (!v.ok) return [];
    return [{
      val: faction,
      texte: `Ouvrir la bourse ${e(drapeauDe(S.world, faction).genitif)} — ${n(TRESOR_BOURSE)} ${sym(faction)} d’amorce`,
    }];
  }
  if (k === 'accord') {
    return accordsPossibles(S, faction).map((autre) => ({
      val: autre,
      texte: `Brancher nos cours sur ceux ${drapeauDe(S.world, autre).genitif} (${
        villesDeFaction(autre)} villes)`,
    }));
  }
  if (k === 'rompre') {
    return accordsRompables(S, faction).map((autre) => ({
      val: autre,
      texte: `Débrancher nos cours de ceux ${drapeauDe(S.world, autre).genitif}`,
    }));
  }
  if (k === 'garnison' || k === 'grenier') {
    const col = villeConfiee(S, faction);
    if (!col) return [];
    const cout = k === 'garnison' ? COUT_GARNISON : COUT_GRENIER;
    return [{
      val: col.id,
      texte: k === 'garnison'
        ? `Relever les murs de ${col.nom} (${col.murs} murs) — ${n(cout)} ${sym(faction)}`
        : `Nourrir ${col.nom} (grogne ${Math.round((col.unrest || 0) * 100)} %) — ${n(cout)} ${sym(faction)}`,
    }];
  }
  if (k === 'loi') {
    const lois = loisDe(w, faction);
    const out = [];
    for (const key of PEINE_KEYS) {
      if (lois.peine === key) continue;
      out.push({ val: `peine:${key}`, texte: `Justice ${PEINES[key].nom.toLowerCase()} — ${PEINES[key].desc}` });
    }
    for (const imp of IMPOTS) {
      if (lois.impot === imp.taux) continue;
      out.push({ val: `impot:${imp.key}`, texte: `Impôt ${imp.nom.toLowerCase()} (${Math.round(imp.taux * 100)} %) — ${imp.desc}` });
    }
    // Le taux directeur : le prix auquel le pays prête à ses villes. Monter,
    // c'est défendre la caisse et étrangler le pays ; baisser, c'est nourrir
    // les villes et vider le trésor.
    for (const d of DIRECTEURS) {
      if (lois.directeur === d.taux) continue;
      out.push({
        val: `directeur:${d.key}`,
        texte: `Taux directeur ${d.nom.toLowerCase()} (${(d.taux * 100).toFixed(0)} %) — ${d.desc}`,
      });
    }
    // Le régime : la seule loi qui vous concerne, vous, et pas seulement leurs
    // sujets. On dit donc ce qu'elle changerait pour vous, en clair.
    for (const key of REGIME_KEYS) {
      if (lois.regime === key) continue;
      const r = REGIMES[key];
      out.push({
        val: `regime:${key}`,
        texte: `${r.nom} — ${r.desc} (retenue ${Math.round(r.preleve * 100)} % sur vos ventes)`,
      });
    }
    // On dit le prix avant la signature : combien de voisins l'interdisent chez
    // eux, et se le rappelleront. Une loi vaut aussi vers l'extérieur.
    const abolitionnistes = diploDe(S.world).filter(
      (k) => k !== faction && !loisDe(w, k).esclavage
        && w.colonies.some((c) => !c.ruine && c.faction === k)).length;
    out.push(lois.esclavage
      ? {
        val: 'esclavage:non',
        texte: 'Interdire le commerce d’hommes — on cessera de vous en vouloir pour ça',
      }
      : {
        val: 'esclavage:oui',
        texte: `Autoriser le commerce d’hommes — ${pl(abolitionnistes, 'faction l’interdit', 'factions l’interdisent')}`
          + ' chez elles, et vous le feront payer',
      });
    return out;
  }
  if (k === 'crediter') {
    // Les villes qui en ont besoin d'abord, et on dit de combien : une ville en
    // détresse est une ville dont les habitants n'ont pas de quoi manger ce
    // qu'elle a sur l'étal. Les autres suivent, parce que gaver de dette une
    // ville qui va bien est aussi une décision — c'est comme ça qu'on la tient.
    const f = w.factions[faction];
    return w.colonies
      .filter((c) => !c.ruine && !c.avantPoste && c.faction === faction)
      .map((c) => ({ c, besoin: Math.round(detresse(w, c)) }))
      .sort((x, y) => y.besoin - x.besoin)
      .slice(0, 8)
      .map(({ c, besoin }) => {
        const montant = Math.min(Math.round(f.tresor), besoin > 0 ? besoin : 500);
        return {
          val: c.id,
          val2: String(montant),
          texte: `${c.nom} — ${n(montant)} ${sym(faction)}${besoin > 0
            ? ` (il lui en manque ${n(besoin)})` : ' (elle n’en a pas besoin)'}${
  c.dette > 0 ? ` · doit déjà ${n(Math.round(c.dette))}` : ''}`,
        };
      });
  }
  if (k === 'emettre') {
    // Des montants tirés de la masse du pays, pas d'une table : ce qui compte
    // n'est pas le chiffre mais la part qu'il ajoute à ce qui circule, puisque
    // c'est elle qui décide de la chute du cours.
    const m = Math.max(1000, Math.round(masse(w, faction)));
    return [0.05, 0.15, 0.4].map((part) => ({
      val: String(Math.round(m * part)),
      texte: `${n(Math.round(m * part))} ${sym(faction)} — ${Math.round(part * 100)} % `
        + `de ce qui circule ; le cours perdra à peu près autant`,
    }));
  }
  if (k === 'place') {
    const actuelle = (() => {
      for (const g of S.player.groupes) {
        const all = g.allegeance;
        if (all && all.faction === faction && all.place) return all.place;
      }
      return null;
    })();
    const out = w.colonies
      .filter((c) => c.faction === faction && !c.ruine && !c.avantPoste && c.id !== actuelle)
      .sort((x, y) => (x.defense + x.murs * 12) - (y.defense + y.murs * 12))
      .slice(0, 5)
      .map((c) => ({
        val: c.id,
        texte: `Tenir ${c.nom} — ${c.murs} mur${c.murs > 1 ? 's' : ''}, défense ${Math.round(c.defense)}`,
      }));
    if (actuelle) {
      const c = colonieParId(w, actuelle);
      out.unshift({ val: '', texte: `Ne plus tenir ${c ? c.nom : 'la place'} en priorité` });
    }
    return out;
  }
  if (k === 'guerre') {
    // M3 (MARECHAL.md) : le Maréchal nomme le but — on dit ce qu'on est venu
    // chercher, on est jugé dessus. En dessous, on déclare et le tempérament
    // du chef décide de la raison, comme toujours.
    const charge = chargeAupres(S, faction);
    const marechal = charge && charge.index >= 5;
    const out = [];
    for (const f of cibleGuerre(S, faction).slice(0, marechal ? 3 : 6)) {
      if (!marechal) {
        out.push({ val: f, texte: `La guerre ${drapeauDe(S.world, f).datif}` });
        continue;
      }
      const nom = drapeauDe(S.world, f).datif;
      const leurs = w.colonies.filter((c) => c.faction === f && !c.ruine);
      const notres = w.colonies.filter((c) => c.faction === faction && !c.ruine);
      const dNous = (c) => (notres.length
        ? Math.min(...notres.map((x) => distance(x.regionId, c.regionId))) : 0);
      const proche = leurs.length
        ? leurs.reduce((a, b) => (dNous(b) < dNous(a) ? b : a))
        : null;
      if (proche) {
        out.push({ val: f, val2: `conquete:${proche.id}`, texte: `La guerre ${nom} — pour prendre ${proche.nom}` });
      }
      out.push({ val: f, val2: 'butin', texte: `La guerre ${nom} — pour ce qu’il y a à prendre` });
      out.push({ val: f, val2: 'frontiere', texte: `La guerre ${nom} — pour desserrer l’étau` });
      if (loisDe(w, f).esclavage) {
        out.push({ val: f, val2: 'abolition', texte: `La guerre ${nom} — pour fermer leurs marchés d’hommes` });
      }
    }
    return out.slice(0, 12);
  }
  if (k === 'paix') {
    return guerresArretables(S, faction).map((g) => ({
      val: g.contre,
      texte: `La paix ${drapeauDe(S.world, g.contre).datif} (${g.guerre.batailles} bataille${g.guerre.batailles > 1 ? 's' : ''})`,
    }));
  }
  return [];
}

/** Les villes qu'une colonne de cette faction a une raison d'aller prendre. */
function villesVisables(faction) {
  const w = S.world;
  const miennes = w.colonies.filter((c) => !c.ruine && c.faction === faction);
  if (!miennes.length) return [];
  return w.colonies
    .filter((c) => !c.ruine && c.faction !== faction
      && (!c.faction || enGuerre(w, faction, c.faction)))
    .map((c) => ({
      ...c,
      d: Math.min(...miennes.map((m) => distance(m.regionId, c.regionId))),
    }))
    .sort((a, b) => a.d - b.d);
}

/**
 * Où aller pour honorer un contrat, et si le délai le permet.
 *
 * Même défaut que pour les ordres de mission, et même correction : le panneau
 * d'affichage annonçait « Porter 40 medkits à Cité-Tréfonds » sans dire où est
 * cette ville, ni à combien de régions, ni si le délai laissait le temps d'y
 * aller. Une prime ne désignait qu'une faction. On accepte à l'aveugle, et
 * abandonner coûte.
 */
function blocCibleContrat(c, reste) {
  const g = G();
  let cible = null;
  if (c.type === 'livraison') {
    const dest = colonieParId(S.world, c.destId);
    if (dest && !dest.ruine) cible = { regionId: dest.regionId, quoi: 'à porter' };
  } else if (c.type === 'reconnaissance') {
    cible = { regionId: c.regionId, quoi: 'secteur à lever' };
  } else if (c.type === 'prime' && c.cibleFaction) {
    const chez = S.world.regions
      .filter((r) => r.controle === c.cibleFaction && r.decouvert && !r.colonie)
      .sort((a, b) => distance(a.i, g.regionId) - distance(b.i, g.regionId))[0];
    if (chez) cible = { regionId: chez.i, quoi: 'on les croise chez eux' };
    else {
      return `<div class="aide">On ne connaît aucune terre ${e(drapeauDe(S.world, c.cibleFaction)
        ? drapeauDe(S.world, c.cibleFaction).genitif : '')} par ici : il faudra les croiser en chemin.</div>`;
    }
  } else if (c.type === 'collecte') {
    // Rien à situer : ça se ramasse partout. On dit au moins où le rendre.
    return '';
  }
  if (!cible) return '';

  const d = distance(cible.regionId, g.regionId);
  if (d === 0) {
    return `<div class="aide cyan">Vous y êtes : ${e(lieuAvecCoord(S.world, cible.regionId))}.</div>`;
  }
  // Aller, et revenir quand il faut rendre le travail ailleurs. L'estimation ne
  // comptait que l'aller : elle annonçait « l'échéance le permet » sur un
  // contrat de reconnaissance qu'aucune escouade ne pouvait honorer, puisqu'il
  // se rend au panneau qui l'a affiché.
  const allure = apercuEscouade(S, g).heuresParRegion;
  const donneur = colonieParId(S.world, c.colonieId);
  const retour = c.type === 'livraison' || !donneur
    ? 0 : distance(cible.regionId, donneur.regionId) * allure;
  const heures = allure * d + retour;
  const tient = heures <= Math.max(0, reste);
  // Sans échéance, on ne dit rien de plus : la carte porte déjà son
  // « sans délai », et « aucun délai » en dessous faisait doublon (U4).
  // Une livraison porte déjà sa destination dans son titre : la redire ici
  // faisait nommer la même ville deux fois dans la même carte (U4 bis). Les
  // autres types, eux, n'ont que cette ligne pour situer.
  const ou = c.type === 'livraison' ? '' : `${e(cible.quoi)} : ${e(lieuAvecCoord(S.world, cible.regionId))}, `;
  return `<div class="aide">${ou}à ${d} région${d > 1 ? 's' : ''} — ${
  Number.isFinite(heures) ? dureeTexte(Math.round(heures)) : '?'}
    ${retour > 0 ? 'aller-retour, le relevé se rend au panneau' : 'de marche'}.
    ${reste == null ? ''
    : `<span class="${tient ? 'cyan' : 'alerte'}">${tient
      ? 'le délai le permet' : 'le délai ne le permet pas'}</span>`}</div>`;
}

/**
 * Où aller pour honorer un ordre de mission, et si c'est seulement jouable.
 *
 * L'ordre n'annonçait qu'un titre : « Ravitailler Cité-Tréfonds : 60 rations ».
 * Rien ne disait où est cette ville, à combien de régions, ni si l'échéance
 * laissait le temps d'y aller. Un ordre de frappe ne désignait qu'une faction,
 * sans dire où la trouver. On ne peut pas honorer ce qu'on ne sait pas situer,
 * et rater coûte de l'estime.
 */
function blocCibleOrdre(o) {
  const g = G();
  let cible = null;
  if (o.type === 'ravitaillement') {
    const col = colonieParId(S.world, o.colonieId);
    if (col && !col.ruine) cible = { regionId: col.regionId, quoi: `à livrer à ${col.nom}` };
  } else if (o.type === 'reconnaissance') {
    cible = { regionId: o.regionId, quoi: 'secteur à lever' };
  } else if (o.type === 'frappe') {
    // On ne croise les hommes d'une faction que sur les terres qu'elle tient.
    // Autant le dire, plutôt que de laisser errer.
    const chez = S.world.regions
      .filter((r) => r.controle === o.cibleFaction && r.decouvert && !r.colonie)
      .sort((a, b) => distance(a.i, g.regionId) - distance(b.i, g.regionId))[0];
    if (chez) cible = { regionId: chez.i, quoi: `leurs terres les plus proches` };
    else {
      return `<div class="aide">On ne connaît aucune terre ${e(drapeauDe(S.world, o.cibleFaction).genitif)}
        par ici. Il faudra les croiser en chemin, ou explorer.</div>`;
    }
  }
  if (!cible) return '';

  const d = distance(cible.regionId, g.regionId);
  if (d === 0) {
    return `<div class="aide cyan">Vous y êtes : ${e(lieuAvecCoord(S.world, cible.regionId))}.</div>`;
  }
  // Le temps que ça prend vraiment, à l'allure de cette colonne-ci.
  const heures = apercuEscouade(S, g).heuresParRegion * d;
  // La plupart des ordres n'ont plus d'échéance. Sans ce garde-fou, la
  // soustraction donnait NaN et le verdict tombait toujours du mauvais côté.
  const reste = o.echeance ? Math.max(0, o.echeance - S.temps) : null;
  const tient = reste == null || heures <= reste;
  return `<div class="aide">${e(cible.quoi)} : ${e(lieuAvecCoord(S.world, cible.regionId))},
      à ${d} région${d > 1 ? 's' : ''} — ${Number.isFinite(heures) ? dureeTexte(Math.round(heures)) : '?'} de marche.
      ${reste == null ? '<span class="cyan">aucune échéance</span>'
    : `<span class="${tient ? 'cyan' : 'alerte'}">${tient
      ? 'l’échéance le permet' : 'l’échéance ne le permet pas'}</span>`}</div>
    <button class="act" data-a="voyage" data-r="${cible.regionId}">S’y rendre</button>`;
}

/**
 * La feuille de service : ce qu'on a fait pour eux, et ce qu'on a laissé filer.
 *
 * Les ordres remplis étaient comptés, jamais relus. Le journal les annonce puis
 * les fait défiler, et il est plafonné à quatre cents lignes : on sert une
 * faction six mois durant et il n'en reste qu'un nombre. On garde les quatorze
 * derniers, avec leur issue et leur date.
 */
function blocFeuilleService(all) {
  const faits = (all.faits || []).slice().reverse();
  const b = bilanService(all);
  if (!faits.length && !b.manques) {
    return `<div class="sep"></div>
      <div class="titre">Feuille de service</div>
      <div class="aide">Rien encore à votre dossier.</div>`;
  }
  const mot = {
    honore: ['ok', 'honoré'],
    manque: ['mal', 'manqué'],
    annule: ['att', 'annulé'],
  };
  const lignes = faits.map((f) => {
    const [cls, txt] = mot[f.issue] || ['att', f.issue];
    // Ce que ça a rapporté ou coûté. Un dossier qui dit « honoré » sans dire
    // combien ne sert qu'à moitié.
    const bilan = [
      f.cr ? `${f.cr > 0 ? '+' : ''}${n(f.cr)} ${sym()}` : '',
      f.pts ? `${f.pts > 0 ? '+' : ''}${n(f.pts)} pts` : '',
      f.rep ? `${f.rep > 0 ? '+' : ''}${n(f.rep)} estime` : '',
    ].filter(Boolean).join(' · ');
    return `<div class="ligne souple">
      <span class="k">${e(f.titre)}<br>
        <span class="aide">${dureeTexte(Math.max(0, S.temps - f.t))} plus tôt</span></span>
      <span class="v"><span class="puce ${cls}">${txt}</span>${bilan
    ? `<br><span class="aide ${f.issue === 'manque' ? 'alerte' : ''}">${bilan}</span>` : ''}</span></div>`;
  }).join('');
  const total = faits.reduce((a, f) => ({
    cr: a.cr + (f.cr || 0), pts: a.pts + (f.pts || 0), rep: a.rep + (f.rep || 0),
  }), { cr: 0, pts: 0, rep: 0 });
  const cumul = [
    total.cr ? `${total.cr > 0 ? '+' : ''}${n(total.cr)} ${sym()}` : '',
    total.pts ? `${total.pts > 0 ? '+' : ''}${n(total.pts)} points de service` : '',
    total.rep ? `${total.rep > 0 ? '+' : ''}${n(total.rep)} d’estime` : '',
  ].filter(Boolean).join(' · ');

  return `<div class="sep"></div>
    <div class="titre">Feuille de service
      <span class="droite">${b.honores} honoré${b.honores > 1 ? 's' : ''}
        · ${b.manques} manqué${b.manques > 1 ? 's' : ''}${b.annules
  ? ` · ${b.annules} annulé${b.annules > 1 ? 's' : ''}` : ''}</span></div>
    ${cumul ? `<div class="aide">Sur ce qu’on garde en mémoire : ${cumul}.</div>` : ''}
    ${lignes || '<div class="aide">Le détail des plus anciens s’est perdu ; les totaux tiennent.</div>'}`;
}

function blocIntendance() {
  const g = G();
  if (!g) return '';
  const col = colonieDe(S.world, g.regionId);
  if (!col) return '';
  const d = droitIntendance(S, col);
  const garn = garnison(S, g.regionId);
  const abri = garn
    ? `<div class="aide">Vous êtes chez vous ici : on vous loge et on vous soigne.</div>` : '';
  if (!d.ok) {
    return `<div class="sep"></div><div class="aide">Intendance de ${e(col.nom)} : ${e(d.motif)}</div>${abri}`;
  }
  // Le plafond de cinq jours est une règle du jeu — l'intendance n'est pas un
  // compte en banque, et c'est ce qui donne une raison de repasser chez soi.
  // Elle était invisible : on constatait que l'arriéré ne montait plus, sans
  // savoir pourquoi ni depuis quand. Une règle qu'on subit sans la connaître
  // n'est pas une règle, c'est une panne.
  return `<div class="sep"></div>${abri}
    <button class="act primaire" data-a="intendance">Toucher ${n(d.quantite)} rations
      à l’intendance de ${e(col.nom)}</button>
    <div class="aide ${d.plafonne ? 'ambre' : ''}">${d.plafonne
    ? `${n(d.jours)} jours sans passer, mais l’intendance ne garde que ${JOURS_INTENDANCE} jours `
      + `d’arriéré : ${pl(d.perdu, 'ration est', 'rations sont')} déjà ${d.perdu >= 2 ? 'perdues' : 'perdue'}. Repassez plus souvent.`
    : `${n(d.rang.def.ration)} rations par jour à votre grade, cumulables `
      + `${JOURS_INTENDANCE} jours au plus. Au-delà, l’arriéré cesse de monter.`}</div>`;
}

function blocAllegeance() {
  const all = G() && G().allegeance;
  if (!all) {
    return `<section class="panneau">
      <h2 class="titre">Allégeance <span class="droite">indépendant</span></h2>
      <div class="aide">Vous ne servez personne. Rendez-vous dans une de leurs villes
        pour vous engager.</div>
      <details class="aide-plus"><summary>Ce que servir rapporte, et coûte</summary>
      <div class="aide">Entrer au service d’une faction demande
        de l’estime — de ${Math.min(...Object.values(ESTIME_ENGAGEMENT))} chez une commune à
        ${Math.max(...Object.values(ESTIME_ENGAGEMENT))} chez une église, ils ne demandent pas
        tous la même chose ; cela donne une remise chez elle, une solde,
        le passage libre à ses barrages, l’accès à son bon matériel — et des ordres de
        mission qu’on ne refuse pas sans conséquence.</div></details>
    </section>`;
  }

  const rang = rangDe(all);
  const f = drapeauDe(S.world, all.faction);
  const versSuivant = rang.suivant
    ? (all.points - rang.def.points) / (rang.suivant.points - rang.def.points)
    : 1;
  const o = all.ordre;
  const p = o ? avancementOrdre(S, o) : null;

  return `<section class="panneau">
    <h2 class="titre">Au service ${e(f.genitif)}
      <span class="droite" style="color:${f.couleur}">${e(rang.def.nom)}</span></h2>
    <div class="aide">${e(rang.def.desc)}</div>
    <div class="sep"></div>
    ${jauge(versSuivant, '', f.couleur)}
    <div class="aide">${n(all.points)} points de service${rang.suivant
    ? ` · ${n(rang.suivant.points - all.points)} avant ${e(rang.suivant.nom)}` : ' · grade maximal'}</div>
    <div class="sep"></div>
    <div class="grille2 serree">
      <div class="ligne"><span class="k">Remise</span><span class="v">${(rang.def.remise * 100).toFixed(0)} %</span></div>
      <div class="ligne"><span class="k">Solde</span><span class="v">${n(rang.def.solde)} ${sym(all.faction)}/jour</span></div>
      <div class="ligne"><span class="k">Barrages</span><span class="v">${rang.index >= 1 ? 'libres' : 'payants'}</span></div>
      <div class="ligne"><span class="k">Renforts</span><span class="v">${rang.index >= 3 ? 'oui, chez eux' : 'non'}</span></div>
      <div class="ligne"><span class="k">Intendance</span>
        <span class="v">${n(rang.def.ration || 0)} rations/jour</span></div>
      <div class="ligne"><span class="k">Logement</span>
        <span class="v">${rang.index >= RANG_GARNISON ? 'leurs villes' : `à partir de ${e(RANGS[RANG_GARNISON].nom)}`}</span></div>
    </div>
    ${blocIntendance()}
    ${blocSecteur()}
    <div class="sep"></div>
    ${o ? `<div class="titre">Ordre de mission</div>
      <div class="contrat-t">${e(o.titre)}</div>
      ${jauge(p && p.total ? p.fait / p.total : 0, p && p.pret ? 'vert' : '')}
      <div class="aide">${e(p ? p.texte : '')} · ${n(o.recompense)} ${sym()} ·
        ${o.echeance
    ? `<span class="${o.echeance - S.temps < 48 ? 'alerte' : ''}">${
      dureeTexte(Math.max(0, o.echeance - S.temps))} restantes</span>`
    : '<span class="cyan">sans délai</span>'}</div>
      ${blocCibleOrdre(o)}`
    : '<div class="aide">Aucun ordre en attente. Ils vous rappelleront.</div>'}
    ${blocFeuilleService(all)}
    ${blocInfluence(all.faction)}
    <div class="sep"></div>
    <button class="act mini danger" data-a="quitter-service">Rompre l’engagement</button>
  </section>`;
}

/**
 * Le dossier des contrats : ce qu'on a signé, et comment ça s'est terminé.
 *
 * Les ordres d'une faction avaient leur feuille de service depuis longtemps ;
 * le panneau d'affichage n'avait rien. Un contrat échouait, l'estime baissait
 * de six, et il n'en restait qu'une ligne de journal qu'un millier d'autres
 * effacent. Impossible de savoir combien on en avait manqué, ni ce que ça avait
 * coûté — alors que c'est précisément la question qu'on se pose en voyant son
 * estime descendre.
 */
function blocDossierContrats() {
  const dossier = (S.player.dossier || []).slice().reverse();
  const b = S.player.bilanContrats;
  if (!dossier.length && !b) return '';
  const mot = {
    honore: ['ok', 'honoré'],
    echu: ['mal', 'échu'],
    abandonne: ['mal', 'abandonné'],
    caduc: ['att', 'caduc'],
  };
  const lignes = dossier.map((f) => {
    const [cls, txt] = mot[f.issue] || ['att', f.issue];
    const bilan = [
      f.cr ? `${f.cr > 0 ? '+' : ''}${n(f.cr)} ${sym()}` : '',
      f.rep ? `${f.rep > 0 ? '+' : ''}${n(f.rep)} d’estime` : '',
    ].filter(Boolean).join(' · ');
    return `<div class="ligne souple">
      <span class="k">${e(f.titre)}<br>
        <span class="aide">${dureeTexte(Math.max(0, S.temps - f.t))} plus tôt${f.faction
  && drapeauDe(S.world, f.faction) ? ` · ${e(drapeauDe(S.world, f.faction).nom)}` : ''}</span></span>
      <span class="v"><span class="puce ${cls}">${txt}</span>${bilan
    ? `<br><span class="aide ${f.rep < 0 ? 'alerte' : ''}">${bilan}</span>` : ''}</span></div>`;
  }).join('');
  const total = b
    ? [
      `${b.honores} honoré${b.honores > 1 ? 's' : ''}`,
      `${b.echus} échu${b.echus > 1 ? 's' : ''}`,
      b.caducs ? `${b.caducs} caduc${b.caducs > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(' · ')
    : '';
  const cumul = b && (b.cr || b.rep)
    ? [b.cr ? `${b.cr > 0 ? '+' : ''}${n(b.cr)} ${sym()}` : '',
      b.rep ? `${b.rep > 0 ? '+' : ''}${n(b.rep)} d’estime` : ''].filter(Boolean).join(' · ')
    : '';
  return `<section class="panneau">
    <h2 class="titre">Dossier des contrats <span class="droite">${e(total)}</span></h2>
    ${cumul ? `<div class="aide">Au total : ${e(cumul)}.</div>` : ''}
    ${lignes || '<div class="aide">Rien encore.</div>'}
  </section>`;
}

function ecranContrats() {
  const enCours = S.player.contrats;
  const col = colonieDe(S.world, G().regionId);
  const dispo = col && col.contrats ? col.contrats : [];

  return `
  ${bandeauEcran('Contrats', [
    [`${enCours.length}/${MAX_CONTRATS}`, 'en cours'],
    [`<span class="ok">${n((S.player.bilanContrats && S.player.bilanContrats.honores) || 0)}</span>`, 'honorés'],
  ])}
  <section class="panneau">
    <h2 class="titre">En cours <span class="droite">${enCours.length} / ${MAX_CONTRATS}</span></h2>
    ${enCours.length
    ? enCours.map((c) => ligneContrat(c, true)).join('')
    : `<div class="aide">Aucun contrat. Les panneaux d’affichage sont dans les villes —
        rendez-vous dans une ville et ouvrez « Contrats ».</div>`}
  </section>

  <section class="panneau">
    <h2 class="titre">Panneau d’affichage
      <span class="droite">${col ? e(col.nom) : 'hors ville'}</span></h2>
    ${col
    ? (dispo.length
      ? dispo.map((c) => ligneContrat(c, false)).join('')
      : '<div class="aide">Rien d’affiché pour le moment. Les offres se renouvellent.</div>')
    : '<div class="aide">Il faut être dans une ville pour consulter un panneau.</div>'}
  </section>

  ${blocAllegeance()}
  ${blocDossierContrats()}

  <section class="panneau">
    <h2 class="titre">Comment ça marche</h2>
    <div class="aide">
      <b>Collecte</b> — rassembler la marchandise, puis revenir dans la ville commanditaire.<br>
      <b>Livraison</b> — le colis est chargé dans le sac à l’acceptation ; il faut le porter à destination.<br>
      <b>Prime</b> — remporter des combats contre la faction visée, où que ce soit.<br>
      <b>Reconnaissance</b> — découvrir le secteur, puis revenir toucher la prime.<br><br>
      Tout se valide tout seul, y compris pendant votre absence. Une échéance dépassée
      coûte de la réputation.
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Écran MONDE
// ---------------------------------------------------------------------------

/**
 * Où l'on en est avec chacun, en un coup d'œil, en tête de l'écran du monde.
 *
 * L'estime existait depuis toujours, elle commandait huit choses, et on ne
 * pouvait la lire nulle part — sauf sur la fiche d'une ville où l'on se
 * trouvait, et sous la forme d'un « RÉP 0 » perdu dans le rapport de puissance.
 * Un joueur ne peut pas décider chez qui aller vendre, chez qui s'engager ni
 * quelle route éviter s'il ne sait pas ce que chacun pense de lui.
 *
 * Trié du meilleur au pire : ce qui décide d'une partie, c'est autant l'ami
 * qu'on a que l'ennemi qu'on s'est fait.
 */
function blocOuVousEnEtes() {
  const rangs = diploDe(S.world)
    .filter((k) => S.world.colonies.some((c) => !c.ruine && c.faction === k))
    .map((k) => ({ k, ef: effetsEstime(S, k) }))
    .sort((a, b) => b.ef.rep - a.ef.rep);
  if (!rangs.length) return '';
  // Six badges « 0 inconnu » empilés ne disent qu'une chose, six fois. Ceux
  // qui ne vous connaissent pas tiennent sur une ligne ; les lignes pleines
  // sont pour ceux avec qui il se passe quelque chose (U4).
  const anonymes = rangs.filter(({ ef }) => !ef.rep
    && ef.palier.nom.toLowerCase() === 'inconnu');
  const connus = anonymes.length >= 2
    ? rangs.filter((r2) => !anonymes.includes(r2)) : rangs;
  const lignes = connus.map(({ k, ef }) => {
    const cls = couleurEstime(ef.rep);
    // Ce qui compte le plus à ce niveau-ci : ce qu'on subit d'abord s'il y a
    // quelque chose à subir, ce qu'on a gagné sinon.
    const quoi = ef.perdu[0] || ef.acquis[ef.acquis.length - 1]
      || 'on ne vous connaît pas encore';
    return `<div class="ligne souple">
      <span class="k" style="color:${couleurFaction(k)}">${e(drapeauDe(S.world, k).nom)}<br>
        <span class="aide">${e(quoi)}</span></span>
      <span class="v"><span class="puce ${cls}">${ef.rep > 0 ? '+' : ''}${n(ef.rep)}
        ${e(ef.palier.nom.toLowerCase())}</span></span></div>`;
  }).join('') + (anonymes.length >= 2
    ? `<div class="aide" style="padding-top:5px">Ne vous connaissent pas encore : ${anonymes
      .map(({ k }) => `<span style="color:${couleurFaction(k)}">${e(drapeauDe(S.world, k).nom)}</span>`)
      .join(' · ')}.</div>`
    : '');
  return `<section class="panneau">
    <h2 class="titre">Ce qu’on pense de vous
      <span class="droite">estime</span></h2>
    <div class="aide">Elle décide du prix qu’on vous fait, de ce qu’on vous laisse
      posséder, de qui vous enrôle, de ce que coûtent vos recrues, et de qui vous
      cherche sur les routes. Elle monte en tenant parole, elle descend en la
      manquant — et elle s’émousse d’elle-même avec le temps.</div>
    <div class="sep"></div>
    ${lignes}</section>`;
}

/**
 * Les bourses du monde, et ce qu'elles cotent.
 *
 * Toute cette couche tournait sans que le joueur en voie rien : des factions
 * ouvraient des bourses, en branchaient les cours les uns sur les autres par
 * des accords, et une guerre débranchait le tout — invisible. On ne le
 * découvrait qu'en montant un comptoir, et seulement pour le réseau avec lequel
 * on traitait. **Un mécanisme qu'on ne voit pas n'existe pas pour celui qui
 * joue**, et celui-ci décide des prix de la moitié de la carte.
 *
 * Ce qu'on montre : qui a ouvert, qui s'est accordé avec qui, combien de villes
 * chaque réseau tient, et l'écart de son cours au prix de base — c'est-à-dire
 * où il est cher et où il est bon marché. On ne montre pas le détail des dix
 * matières : c'est l'affaire du comptoir, qui sert à traiter.
 */
function blocBourses() {
  const liste = resumeBourses(S.world);
  const total = S.world.colonies.filter((c) => !c.ruine && c.faction).length;
  if (!liste.length) {
    return `<section class="panneau">
      <h2 class="titre">Bourses <span class="droite">aucune</span></h2>
      <div class="aide">Personne n’a encore ouvert de marché commun. Chaque ville fait ses
        prix dans son coin, et une famine à huit régions d’un grenier plein peut durer des
        mois. Il faut à une faction quatre villes, de quoi amorcer, et un chef qui pense
        au commerce plutôt qu’à la guerre.</div>
    </section>`;
  }
  const lignes = liste.map((r) => {
    const nom = r.noms.join(' + ');
    const part = Math.round((r.villes / Math.max(1, total)) * 100);
    // L'écart moyen au prix de base : un seul nombre qui dit « cher » ou « bon
    // marché », plutôt que dix cours qu'il faudrait comparer de tête.
    let ecart = null;
    if (r.prix) {
      let somme = 0;
      let compte = 0;
      for (const k of COMMODITY_KEYS) {
        const l = ligneCours(r.prix, k);
        if (l.valeur > 0) { somme += l.ecart; compte++; }
      }
      if (compte) ecart = somme / compte;
    }
    const age = r.maj === null ? null : S.temps - r.maj;
    // Le nom du réseau a sa ligne à lui : en colonne face aux chiffres, il se
    // faisait écraser et coupait au milieu des mots — « Consortiu / m Hexa »
    // sur la capture (U4).
    return `<div style="border-bottom:1px solid #26211a;padding:6px 0">
      <div>${e(nom)}${r.membres.length > 1
    ? ' <span class="puce ok">accord</span>' : ''}</div>
      <div class="aide">${pl(r.villes, 'ville')} · ${part} % de la carte</div>
      <div class="aide">${ecart === null
    ? 'Cours pas encore publié.'
    : `Cours ${ecart > 0.02 ? `<span class="alerte">${Math.round(ecart * 100)} % au-dessus`
      : ecart < -0.02 ? `<span class="ok">${Math.round(-ecart * 100)} % en dessous`
        : '<span>au niveau'} du prix de base</span>${
      age !== null ? ` · publié il y a ${dureeTexte(age)}` : ''}`}</div>
    </div>`;
  }).join('');

  const monReseau = comptoirActif(S);
  return `<section class="panneau">
    <h2 class="titre">Bourses
      <span class="resume">${e(liste.map((r) => `${r.noms.length > 1
    ? r.membres.length + ' unis' : r.noms[0]} ${r.villes} v.`).join(' · '))}</span>
      <span class="droite">${pl(liste.length, 'réseau', 'réseaux')}</span></h2>
    <div class="aide">Les villes d’un même réseau s’approvisionnent entre elles en priorité
      et traitent contre un cours commun, republié chaque jour. Un accord relie deux
      réseaux ; une guerre les sépare.</div>
    <div class="sep"></div>
    ${lignes}
    <div class="aide" style="margin-top:6px">${monReseau
    ? `Vous traitez avec ${e(monReseau.membres.map((k) => drapeauDe(S.world, k).nom).join(' + '))}${
      monReseau.sien ? ', comme un des leurs' : ` (${Math.round(monReseau.commission * 100)} % de commission)`}.`
    : 'Vous ne traitez avec aucun : il faut un comptoir au camp, et leurs couleurs ou leur estime.'}</div>
  </section>`;
}

function ecranMonde() {
  const crypto = (S.base.recherche.cryptographie || 0) > 0;
  const cl = classement(S.world);
  const max = Math.max(1, cl[0] ? cl[0].puissance : 1);

  const factionsHtml = cl.map((f) => {
    const repu = S.player.reputation[f.key] || 0;
    const cls = couleurEstime(repu);
    // Un nombre nu ne dit rien : « rép 0 » ne se lit que si l'on sait déjà ce
    // que zéro vaut. On accole le palier, qui est un mot.
    const palier = palierEstime(repu);
    return `<div style="border-bottom:1px solid #26211a;padding:6px 0">
      <div class="ligne">
        <span class="k" style="color:${f.couleur}">${e(f.nom)}</span>
        <span class="v"><span class="puce ${cls}">${repu > 0 ? '+' : ''}${n(repu)}
          ${e(palier.nom.toLowerCase())}</span></span>
      </div>
      ${jauge(f.puissance / max, '', f.couleur)}
      ${(() => {
    const d = dirigeant(S.world, f.key);
    if (!d) return '';
    const t = TEMPERAMENTS[d.temperament];
    const assise = d.legitimite < LEGITIMITE_CRITIQUE ? 'contesté'
      : d.legitimite > 75 ? 'bien assis' : 'en place';
    return `<div class="aide"><b>${e(d.titre)} ${e(d.nom)}</b> — ${e(t.nom.toLowerCase())},
      ${e(assise)}${crypto ? ` (légitimité ${Math.round(d.legitimite)})` : ''}.
      ${d.guerres ? `${pl(d.guerres, 'guerre')}, ` : ''}${pl(d.prises, 'ville prise', 'villes prises')},
      ${d.pertes} perdue${d.pertes >= 2 ? 's' : ''}.</div>`;
  })()}
      <div class="aide">${pl(f.colonies, 'colonie')} · ${crypto
    ? `trésor ${n(f.tresor)} ${sym(f.key)}`
    : 'trésor inconnu'} · ${e(drapeauDe(S.world, f.key).devise)}</div>
      ${(() => {
    // Comment on gouverne chez eux. C'est ce qui fait de « qui servir » un
    // choix informé plutôt qu'un tirage entre six drapeaux de couleurs.
    const l = loisDe(S.world, f.key);
    const imp = IMPOTS.reduce((a, b) => (Math.abs(b.taux - l.impot) < Math.abs(a.taux - l.impot) ? b : a));
    // Et ce que ça leur coûte auprès des autres : une loi vaut aussi vers
    // l'extérieur, et le joueur doit pouvoir voir arriver la guerre.
    const facheurs = diploDe(S.world).filter(
      (k) => k !== f.key && distanceMorale(S.world, k, f.key) > 0.45
        && S.world.colonies.some((c) => !c.ruine && c.faction === k)).length;
    const reg = REGIMES[l.regime] || REGIMES.charte;
    return `<div class="aide">Chez eux : ${e(reg.nom.toLowerCase())},
      impôt ${e(imp.nom.toLowerCase())} (${Math.round(l.impot * 100)} %),
      justice ${e(PEINES[l.peine].nom.toLowerCase())},
      solde ${e((DISCIPLINES[l.discipline] || DISCIPLINES.comptable).nom.toLowerCase())}
      (${e((DISCIPLINES[l.discipline] || DISCIPLINES.comptable).texte)})${l.esclavage
      ? ', <span class="alerte">et l’on y vend des hommes</span>' : ''}.${facheurs
      ? ` <span class="alerte">${pl(facheurs, 'faction ne le supporte pas', 'factions ne le supportent pas')}.</span>` : ''}
      <br>Pour vous : ${e(reg.desc.toLowerCase())}</div>`;
  })()}
      ${(() => {
    // Leur monnaie (ECONOMIE §10). Le cours d'abord — c'est le seul chiffre du
    // jeu qui dise si leur argent vaut quelque chose —, puis de quoi comprendre
    // pourquoi : ce qui circule, combien de fois ils ont imprimé, et le loyer
    // qu'ils font payer à leurs villes.
    //
    // C'est réservé à qui les écoute. Un cours et une masse monétaire ne
    // traînent pas sur les places : on les lit dans leurs transmissions.
    if (!crypto) {
      return '<div class="aide">Leur monnaie : on n’en sait rien. Il faudrait '
        + 'lire ce qu’ils s’écrivent.</div>';
    }
    const l2 = loisDe(S.world, f.key);
    const dir = DIRECTEURS.reduce(
      (a2, b2) => (Math.abs(b2.taux - l2.directeur) < Math.abs(a2.taux - l2.directeur) ? b2 : a2));
    const c = coursMonnaie(S.world, f.key);
    // Les bornes du cours sont levées (lot H) : l'écran nomme les deux
    // extrêmes avec les mêmes mots et les mêmes seuils que les portes de
    // ville — voir etatCours.
    const etat = etatCours(c);
    return `<div class="aide">Monnaie ${e(symboleDe(S.world, f.key))} : cours
      ${n(c, 2)} — ${e(etat)}. ${n(Math.round(masse(S.world, f.key)))} en circulation,
      ${pl(f.emissions || 0, 'émission')}. Loyer de l’argent :
      ${e(dir.nom.toLowerCase())} (${(l2.directeur * 100).toFixed(0)} %).</div>`;
  })()}
    </div>`;
  }).join('');

  const guerres = S.world.guerres.length
    ? S.world.guerres.map((g) => `<div style="border-bottom:1px solid #26211a;padding:4px 0">
        <div class="ligne">
          <span class="k"><span style="color:${couleurFaction(g.a)}">${e(drapeauDe(S.world, g.a).nom)}</span>
            ✕ <span style="color:${couleurFaction(g.b)}">${e(drapeauDe(S.world, g.b).nom)}</span></span>
          <span class="v">${dureeTexte(S.temps - g.depuis)} · ${pl(g.batailles, 'bataille')}</span></div>
        ${g.but ? `<div class="aide">Déclarée ${e(g.but.texte)}.</div>` : ''}
      </div>`).join('')
    : '<div class="aide">Paix générale. Ça ne dure jamais.</div>';

  // L'état-major (MARECHAL.md, M5) : le frais en direct — vu de nos yeux,
  // rapporté par la maison, ou lu dans leurs transmissions — et le relevé
  // daté qui vieillit à sa place d'hier. Le décompte des campagnes en cours
  // n'est plus dit : c'est déjà un renseignement.
  const etatMajor = armeesConnues(S)
    .sort((a, b) => (a.frais === b.frais ? (a.depuis || 0) - (b.depuis || 0) : (a.frais ? -1 : 1)));
  const armees = etatMajor.length
    ? etatMajor.map((v) => `<div class="ligne">
        <span class="k" style="color:${couleurFaction(v.faction)}">${e(drapeauDe(S.world, v.faction).nom)} · ${n(v.force)}</span>
        <span class="v">${e(v.etat)}${v.frais
    ? ` → ${e((colonieParId(S.world, v.cible) || {}).nom || '—')}`
    : ` · ${e(nomRegion(S.world, v.regionId))} <span class="aide">${e(ageTexte(v.depuis))}</span>`}</span></div>`).join('')
    : '<div class="aide">Rien en vue. Ce qui ne veut pas dire qu’il ne se passe rien.</div>';

  // Le registre des villes est un carnet de relevés, pas un tableau de bord :
  // chaque ligne porte la date à laquelle on l'a écrite.
  const connues = S.world.colonies
    .filter((c) => S.world.regions[c.regionId].decouvert)
    .map((c) => vueColonie(S, c))
    .filter((v) => !v.inconnu);
  const villes = connues.length
    ? connues.sort((a, b) => (a.depuis ?? 0) - (b.depuis ?? 0)).map((v) => `<div class="ligne">
        <span class="k">${e(v.nom)}${v.frais ? '' : ` <span class="aide">${e(ageTexte(v.depuis))}</span>`}</span>
        ${v.ruine
    ? '<span class="v" style="color:var(--texte-3)">en ruines</span>'
    : `<span class="v" style="color:${couleurFaction(v.faction)}">${e(v.faction ? drapeauDe(S.world, v.faction).court : '—')} · rang ${v.taille} · ${n(v.pop)} hab.</span>`}
      </div>`).join('')
    : '<div class="aide">Aucune ville relevée. Il faut aller voir de ses yeux.</div>';

  const meteoNow = conditions(S.world, S.temps);
  const car = S.world.caravanes || [];
  const ruines = S.world.colonies.filter((c) => c.ruine);
  const neuves = S.world.colonies.filter((c) => c.fondeeA !== undefined);
  const st = S.stats;
  const sites = S.world.regions.filter((r) => r.site).length;
  const sitesVus = S.world.regions.filter((r) => r.site && r.site.connu).length;
  const chiffres = [
    ['Heures vécues', n(S.temps)],
    ['Combats', `${n(st.combats)} (${n(st.combatsGagnes)} gagnés)`],
    ['Défaites', n(st.defaites)],
    ['Ressources récoltées', n(st.recolte)],
    ['Contrats remplis', n(st.contratsRemplis || 0)],
    ['Sites fouillés', `${n(st.sitesFouilles || 0)} / ${sitesVus} repérés (${sites} en tout)`],
    ['Caravanes pillées', n(st.caravanesPillees || 0)],
    ['Carte levée', `${n(S.world.regions.filter((r) => r.decouvert).length)} / ${n(S.world.regions.length)}`],
    ['Villes vivantes', `${n(S.world.colonies.filter((c) => !c.ruine).length)} · ${n(ruines.length)} en ruines · ${n(neuves.length)} fondées depuis`],
    ['Disparus', n((S.memorial || []).length)],
  ];


  // La chronique n'est pas un flux d'informations en direct : c'est ce qui est
  // parvenu jusqu'à vous. Les nouvelles mettent du temps à faire la route, et
  // celles qu'on n'a pas vues de ses yeux sont données comme des rapports.
  const chronique = nouvellesConnues(
    S,
    S.journal.filter((x) => ['capture', 'guerre', 'paix', 'fondation', 'effondrement', 'secession', 'croissance', 'saison'].includes(x.type))
  ).slice(-14).reverse();

  return `
  ${bandeauEcran('Le monde', [
    [n(S.world.colonies.filter((c) => !c.ruine).length), 'villes vivantes'],
    [`an ${meteoNow.saison.annee}`, e(meteoNow.saison.def.nom)],
  ])}
  ${blocOuVousEnEtes()}
  <section class="panneau"><h2 class="titre">Rapport de puissance</h2>${factionsHtml}
    ${(() => {
    // Le septième drapeau n'est pas dans le classement — il ne gouverne rien,
    // ne négocie rien et n'a pas de trésor —, si bien qu'il n'était nulle part.
    // On croisait ses bandes, on lisait son nom dans le journal quand il
    // saccageait une ville, et rien ne disait ce que c'était. Un joueur a fait
    // une partie entière sans le savoir.
    const vu = armeesConnues(S).some((v) => v.faction === 'essaim')
      || S.world.regions.some((r) => r.decouvert && r.controle === 'essaim')
      || S.journal.some((x) => (x.texte || '').includes('Essaim'));
    if (!vu) return '';
    return `<div class="sep"></div>
      <div class="ligne"><span class="k" style="color:${couleurFaction('essaim')}">${
  e(FACTIONS.essaim.nom)}</span><span class="v">hors classement</span></div>
      <div class="aide">Ce ne sont pas des gens. Ils ne tiennent rien, ne votent rien,
        n’acceptent ni contrat ni parole donnée, et l’on n’entre pas à leur service.
        Leurs bandes descendent sur une place, prennent ce qu’il y a et repartent :
        une ville saccagée par eux reste à qui elle était. Il n’y a pas de paix à
        signer avec eux — seulement des murs, ou de la distance.</div>`;
  })()}
  </section>
  <section class="panneau"><h2 class="titre">Guerres en cours</h2>${guerres}</section>
  <section class="panneau"><h2 class="titre">Colonnes en campagne</h2>${armees}</section>

  <section class="panneau">
    <h2 class="titre">Chronique du monde</h2>
    ${chronique.length ? `<div class="fil">${chronique.map((x) => `<div class="fil-l ${couleurLog(x.type)}">
      <span class="fil-t">${horloge(x.t).texte}</span><span class="fil-x">${e(x.texte)}${x.rapporte
    ? ' <span class="aide">· rapporté</span>' : ''}</span></div>`).join('')}</div>`
    : '<div class="aide">Rien ne vous est parvenu. Ce qui ne veut pas dire qu’il ne se passe rien.</div>'}
  </section>

  <section class="panneau">
    <h2 class="titre">Routes marchandes <span class="droite">${car.length} en circulation</span></h2>
    ${car.length ? car.map((c) => {
    const de = colonieParId(S.world, c.deId);
    const vers = colonieParId(S.world, c.versId);
    return `<div class="ligne">
        <span class="k" style="color:${couleurFaction(c.faction)}">${e(drapeauDe(S.world, c.faction).nom)}</span>
        <span class="v">${e(de ? de.nom : '?')} → ${e(vers ? vers.nom : '?')} · ${n(valeurCargaison(c))} ${sym()}</span></div>`;
  }).join('') : '<div class="aide">Aucune caravane sur les routes. Mauvais signe.</div>'}
  </section>

  ${(() => {
    // Le carnet du négociant (INTERFACE.md, U7) : ce qu'on SAIT des prix —
    // des relevés datés, jamais la vérité du monde. La date vaut le chiffre.
    const carnet = carnetPrix(S);
    const lignes = COMMODITY_KEYS.filter((k) => carnet[k]).map((k) => {
      const cc = carnet[k];
      return `<div class="ligne">
        <span class="k">${e(COMMODITIES[k].nom)}</span>
        <span class="v">${n(cc.achat.prix, 1)} à ${e(cc.achat.nom)}
          <span class="aide">${e(ageTexte(cc.achat.depuis))}</span>${cc.vente
    ? ` → ${n(cc.vente.prix, 1)} à ${e(cc.vente.nom)}
          <span class="aide">${e(ageTexte(cc.vente.depuis))}</span>` : ''}</span></div>`;
    });
    const meilleur = COMMODITY_KEYS.reduce((a, k) =>
      (carnet[k] && carnet[k].vente && (!a || carnet[k].ecart > a.ecart)
        ? Object.assign({ k }, carnet[k]) : a), null);
    return `<section class="panneau">
    <h2 class="titre">Carnet du négociant</h2>
    ${meilleur && meilleur.ecart > 0 ? `<div class="aide"><b>Le coup du moment :</b>
      ${e(COMMODITIES[meilleur.k].nom.toLowerCase())} — acheter à ${n(meilleur.achat.prix, 1)}
      (${e(meilleur.achat.nom)}), revendre à ${n(meilleur.vente.prix, 1)}
      (${e(meilleur.vente.nom)}) : +${n(meilleur.ecart, 1)} l’unité, d’après des
      relevés ${e(ageTexte(Math.max(meilleur.achat.depuis, meilleur.vente.depuis)))}.</div>
      <div class="sep"></div>` : ''}
    ${lignes.length ? lignes.join('')
    : '<div class="aide">Le carnet se remplit en voyageant : chaque ville sous vos yeux y laisse ses prix, datés.</div>'}
  </section>`;
  })()}

  ${blocBourses()}

  <section class="panneau">
    <h2 class="titre">Climat
      <span class="droite" style="color:${meteoNow.saison.def.couleur}">${e(meteoNow.saison.def.nom)} · jour ${meteoNow.saison.jour}/30 · an ${meteoNow.saison.annee}</span></h2>
    <div class="aide">${e(meteoNow.saison.def.texte)}</div>
    <div class="sep"></div>
    <div class="ligne"><span class="k">Ciel</span>
      <span class="v" style="color:${meteoNow.meteo.couleur}">${e(meteoNow.meteo.nom)}</span></div>
    <div class="aide">${e(meteoNow.meteo.texte)}</div>
    <div class="sep"></div>
    <div class="grille2 serree">
      <div class="ligne"><span class="k">Récolte vivante</span><span class="v">×${meteoNow.rendement('biomasse').toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Récolte minérale</span><span class="v">×${meteoNow.rendement('minerai').toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Marche</span><span class="v">×${meteoNow.marche.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Aléas</span><span class="v">×${meteoNow.aleas.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Rencontres</span><span class="v">×${meteoNow.rencontres.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Visibilité</span><span class="v">×${meteoNow.vue.toFixed(2)}</span></div>
    </div>
  </section>

  <section class="panneau"><h2 class="titre">Villes connues <span class="droite">${connues.length}/${S.world.colonies.length}</span></h2>${villes}</section>
  <section class="panneau"><h2 class="titre">Chiffres</h2>
    ${chiffres.map(([k, v]) => `<div class="ligne"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}
  </section>`;
}

// ---------------------------------------------------------------------------
// Écran JOURNAL
// ---------------------------------------------------------------------------

/**
 * L'icône d'une entrée (M3, ALLURE.md) : un glyphe par famille d'événement.
 * Quatre cents lignes de la même voix ne se parcourent pas ; un œil accroche
 * une forme avant de lire un mot. Dérivée de la famille de couleur, pas
 * recopiée type par type : un type nouveau hérite d'un glyphe cohérent.
 */
function iconeLog(type) {
  if (type === 'mort' || type === 'fin') return '†';
  if (RECITS_JOURNAL.has(type)) return '❧';
  switch (couleurLog(type)) {
    case 'danger': return '⨯';
    case 'guerre': return '⚑';
    case 'gain': return '+';
    case 'base': return '⌂';
    default: return '·';
  }
}

/** Les entrées qui appartiennent au récit : elles parlent en serif. */
const RECITS_JOURNAL = new Set(['chronique', 'fil', 'accueil', 'debut', 'fin']);

function ecranJournal() {
  S.nonLus = 0;
  const entrees = S.journal
    .filter((x) => (filtreJournal === 'tout' ? !x.discret : x.important))
    .slice(-160)
    .reverse();

  // Groupé par jour (M3) : un fil de quatre cents lignes sans repère de temps
  // ne raconte rien. Le fil est à rebours, les têtes de jour aussi.
  let jourCourant = null;
  const html = entrees.length ? entrees.map((x) => {
    const h = horloge(x.t);
    // La tête de jour porte une ancre, et sa clé est STABLE (« jour-N » ne
    // change pas tant que le jour a des entrées à l'écran) : quand le haut de
    // la fenêtre tombe sur elle, c'est elle qu'on épingle — sinon l'ancre
    // tient l'entrée d'en dessous pendant que la tête au-dessus change
    // d'identité au fil de la fenêtre des 160 entrées, et la ligne lue change
    // sans que l'ancre ait failli (vu par le garde, au pixel près).
    const tete = h.jour !== jourCourant
      ? `<div class="jour-tete" data-ancre="jour-${h.jour}">— Jour ${h.jour} —</div>` : '';
    jourCourant = h.jour;
    // Une ancre par entrée : le journal est un fil, il grandit par le haut, et
    // sans elle on se fait pousser vers le bas pendant qu'on lit.
    return `${tete}<div class="entree ${couleurLog(x.type)}${x.important ? ' marquant' : ''}${
  RECITS_JOURNAL.has(x.type) ? ' recit' : ''}" data-ancre="${
  x.n ? `e${x.n}` : e(`${x.t}-${(x.texte || '').slice(0, 24)}`)}">
      <div class="t"><span class="ico" aria-hidden="true">${iconeLog(x.type)}</span> ${h.texte}</div>
      <div>${e(x.texte)}</div>
      ${x.detail && x.detail.length ? `<div class="detail">${x.detail.map(e).join('<br>')}</div>` : ''}
    </div>`;
  }).join('') : '<div class="aide">Rien à signaler.</div>';

  return `
  ${bandeauEcran('Journal', [
    [`J${Math.floor(S.temps / 24) + 1}`, 'jour'],
    [S.player.chapitreN ? `ch. ${romain(S.player.chapitreN)}` : '—', 'chapitre'],
  ])}
  ${blocChronique()}
  <section class="panneau">
    <h2 class="titre">Journal de bord
      <span class="droite"><button class="act mini" data-a="filtre" data-k="tout" aria-pressed="${filtreJournal === 'tout'}">Tout</button><button class="act mini" data-a="filtre" data-k="important" aria-pressed="${filtreJournal === 'important'}">Marquant</button></span></h2>
    ${html}
  </section>`;
}

/**
 * Ce que la partie a fait de vous. Pas un score : une lecture. Le jeu a compté
 * les combats, les prisonniers vendus, les lois promulguées et les gens
 * enterrés — il peut bien dire ce que ça donne.
 */
function blocChronique() {
  const t = titreDe(S);
  const lignes = lignesDe(S);
  // Le chapitre en cours d'abord — c'est lui qui dit où en est l'histoire —
  // puis la table des chapitres passés : la partie relue comme un livre.
  const ch = S.player.chapitre ? infoChapitre(S.player.chapitre.cle) : null;
  const passes = (S.player.chapitres || []).slice(0, -1);
  return `<section class="panneau">
    <h2 class="titre">Chronique <span class="droite ambre">${e(t.nom)}</span></h2>
    ${ch ? `<div class="ligne"><span class="k">Chapitre ${romain(S.player.chapitreN)}</span>
      <span class="v ambre">${e(ch.titre)}</span></div>
    <div class="aide recit" style="font-style:italic">${e(ch.dit)}</div>
    <div class="sep"></div>` : ''}
    <div class="aide recit" style="font-style:italic">${e(t.dit)}</div>
    <div class="sep"></div>
    <div class="pile">
      ${lignes.map((l) => `<div class="aide">${e(l)}</div>`).join('')}
    </div>
    ${passes.length ? `<div class="sep"></div>
    <div class="aide">${passes.map((c) => `${romain(c.n)}. ${e(infoChapitre(c.cle).titre)} (J${Math.floor(c.t / 24) + 1})`).join(' · ')}</div>` : ''}
  </section>`;
}

// ---------------------------------------------------------------------------
// Modales
// ---------------------------------------------------------------------------

/**
 * Les sauvegardes : plusieurs parties gardées côte à côte, et des fichiers.
 *
 * La partie en cours s'écrit toute seule toutes les cinq secondes et continue
 * de le faire — rien ici ne la remplace. Ce sont des copies qu'on prend exprès,
 * pour revenir sur un choix, pour comparer deux façons de jouer, ou pour garder
 * l'état exact d'une partie où quelque chose s'est mal passé.
 *
 * Ce dernier usage est le plus utile pendant qu'on écrit le jeu : un défaut
 * qu'on ne sait pas reproduire est un défaut qu'on ne corrige pas, et une
 * capture d'écran ne dit presque rien. Un fichier, si.
 */
function modaleSauvegardes() {
  const liste = ACTIONS.emplacements();
  const poids = ACTIONS.poidsSauvegardes();
  const mo = (o) => `${(o / 1048576).toFixed(1)} Mo`;
  const quandTexte = (ms) => {
    const d = Date.now() - ms;
    if (d < 60000) return 'à l’instant';
    if (d < 3600000) return `il y a ${Math.round(d / 60000)} min`;
    if (d < 86400000) return `il y a ${Math.round(d / 3600000)} h`;
    return `il y a ${Math.round(d / 86400000)} j`;
  };
  const deuxTemps = (act, id, texte, cls) => {
    const cle = `${act}:${id}`;
    const pret = arme === cle;
    return `<button class="act mini ${pret ? 'danger' : (cls || '')}"
      data-a="${act}" data-k="${e(id)}">${pret ? 'Confirmer' : texte}</button>`;
  };
  const ligne = (x) => {
    const r = x.resume || {};
    return `<div style="border-bottom:1px solid #26211a;padding:7px 0">
      <div class="ligne souple"><span class="k">${e(x.nom)}</span>
        <span class="v aide">${e(quandTexte(x.quand))}</span></div>
      <div class="aide">Jour ${n(r.jour || 0)} · ${pl(r.gens || 0, 'vivant')} ·
        ${n(r.argent || 0)} ${e(r.signe || '¤')}${r.base ? ` · ${e(r.nomBase || 'un camp')}` : ' · sans camp'}
        · graine ${e(String(r.seed ?? '?'))}</div>
      <div class="taches" style="margin-top:5px">
        ${deuxTemps('charger-emp', x.id, 'Charger', 'primaire')}
        ${deuxTemps('ecraser-emp', x.id, 'Écraser')}
        ${deuxTemps('suppr-emp', x.id, 'Supprimer', 'danger')}
      </div>
    </div>`;
  };

  const r = S ? resumeSauvegarde(S) : null;
  const et = etatSauvegarde();
  // Ce qui manquait le plus : savoir si la partie s'écrit vraiment. Une
  // sauvegarde qui échoue le faisait en silence — on jouait des heures sur un
  // stockage refusé, on fermait l'onglet, et tout était perdu sans qu'un signe
  // soit passé.
  const sante = et.ok
    ? `<div class="aide ok">La partie s’écrit normalement${et.quand
      ? ` — dernière écriture il y a ${Math.max(0, Math.round((Date.now() - et.quand) / 1000))} s` : ''}${
      et.taille ? `, ${(et.taille / 1024).toFixed(0)} Ko` : ''}.</div>`
    : `<div class="panneau urgent"><div class="titre alerte">La sauvegarde ne passe pas</div>
        <div class="aide">${e(et.motif || '')}</div>
        <div class="aide">${pl(et.echecs, 'tentative')} en échec. Exportez la partie en
          fichier tant qu’elle est ouverte : c’est le seul moyen de ne pas la perdre.</div></div>`;
  const rejoue = !!(S && S.reglages && S.reglages.rattrapage);
  // Le temps hors ligne, tranché par le propriétaire (août 2026) : « plusieurs
  // centaines de jours défilent sous nos yeux sans qu'on ne puisse rien
  // faire ». Le monde attend, sauf si l'on demande le contraire — et alors on
  // sait ce qu'on demande.
  const tempsHorsLigne = S ? `<div class="sep"></div>
    <h2 class="titre">Le temps quand vous n’êtes pas là</h2>
    <div class="rang-tous">
      <button class="act mini" data-a="temps-hors-ligne" data-v="0"
        aria-pressed="${!rejoue}">Le monde attend</button>
      <button class="act mini" data-a="temps-hors-ligne" data-v="1"
        aria-pressed="${rejoue}">Le monde tourne sans vous</button>
    </div>
    <div class="aide">${rejoue
    ? 'Au retour, l’absence est rejouée heure par heure : les villes vivent, les '
      + 'guerres avancent, votre escouade mange. Une longue absence défile à '
      + 'l’écran, et vous ne pouvez rien y faire tant qu’elle dure.'
    : 'La partie reprend exactement où vous l’avez laissée. Rien ne se joue en '
      + 'votre absence, rien ne défile au retour.'}</div>` : '';

  const allege = !!(S && S.reglages && S.reglages.allege);
  // Le chiffre de VOTRE appareil, pas du mien. Deux passes de mesure m'ont
  // fait courir après des millisecondes qui n'existaient que sur ma machine ;
  // celui-ci se lit sur le téléphone qui joue, et il se rapporte.
  const parEcran = Object.keys(coutParEcran).sort((a, b) => coutParEcran[b] - coutParEcran[a])
    .map((k) => `${k} ${coutParEcran[k]} ms`).join(' · ');
  const mesure = `<div class="aide">Cet appareil : un rendu coûte
    ${coutRendu.toFixed(0)} ms en moyenne${ETAT_SAUVEGARDE_TAILLE() ? `, la partie écrite pèse
    ${(ETAT_SAUVEGARDE_TAILLE() / 1024).toFixed(0)} Ko` : ''}.</div>
    ${parEcran ? `<div class="aide">Le pire par écran : ${e(parEcran)}.</div>` : ''}
    ${(() => {
    const b2 = Object.keys(coutParBloc).filter((k) => coutParBloc[k] >= 5)
      .sort((a, b3) => coutParBloc[b3] - coutParBloc[a]).slice(0, 6)
      .map((k) => `${k} ${coutParBloc[k]} ms`).join(' · ');
    return b2 ? `<div class="aide">Les blocs les plus chers : ${e(b2)}.</div>` : '';
  })()}
    ${pesee ? `<div class="aide">Ce qui pèse : ${e(pesee)}.</div>`
    : '<button class="act mini" data-a="peser">Peser la partie</button>'}`;
  const confort = S ? `<div class="sep"></div>
    <h2 class="titre">Le confort de l’écran</h2>
    <div class="rang-tous">
      <button class="act mini" data-a="allege" data-v="0" aria-pressed="${!allege}">Tout</button>
      <button class="act mini" data-a="allege" data-v="1" aria-pressed="${allege}">Allégé</button>
    </div>
    ${mesure}
    <div class="aide">${allege
    ? 'La carte ne s’anime plus et se redessine moins souvent. Sur un téléphone '
      + 'qui peine, c’est ce qui rend les boutons vifs.'
    : 'La carte vit : la cendre dérive, les feux des villes respirent, les convois '
      + 'avancent. C’est joli et ça coûte — si les boutons traînent, passez en allégé.'}</div>` : '';

  return `${sante}${tempsHorsLigne}${confort}
  <h2 class="titre">Sauvegardes
    <span class="droite aide">${liste.length}/${EMPLACEMENTS_MAX}</span></h2>
  <div class="aide">La partie en cours s’écrit toute seule en continu. Ce sont des copies
    qu’on garde à côté : on peut en charger une à tout moment, et la partie en cours
    est alors remplacée.</div>
  ${r ? `<div class="sep"></div>
    <div class="ligne"><span class="k">Partie en cours</span>
      <span class="v">Jour ${n(r.jour)} · ${pl(r.gens, 'vivant')} · ${n(r.argent)} ${e(r.signe || '¤')}</span></div>
    <label class="aide" for="nom-sauvegarde">Nom de la copie (facultatif)</label>
    <input id="nom-sauvegarde" type="text" autocomplete="off"
      placeholder="Jour ${n(r.jour)}" value="">
    <div style="height:6px"></div>
    <button class="act primaire" data-a="enregistrer-emp"
      ${liste.length >= EMPLACEMENTS_MAX ? 'disabled' : ''}>
      ${liste.length >= EMPLACEMENTS_MAX
    ? 'Plus de place — écrasez-en une' : 'Enregistrer dans un nouvel emplacement'}</button>` : ''}
  ${messageSauvegardes ? `<div class="aide ambre">${e(messageSauvegardes)}</div>` : ''}
  <div class="sep"></div>
  ${liste.length ? liste.map(ligne).join('')
    : '<div class="aide">Aucune copie gardée pour l’instant.</div>'}
  <div class="sep"></div>
  <div class="titre">Fichiers et texte</div>
  <div class="aide">Une partie exportée se garde ailleurs que dans ce navigateur, se passe
    d’un appareil à l’autre, et s’envoie. Le téléchargement ne marche pas partout — une
    page isolée le refuse — d’où la zone de texte, qui marche toujours.</div>
  <div class="taches" style="margin-top:6px">
    ${S ? '<button class="act mini" data-a="exporter-partie">Exporter la partie</button>' : ''}
    <button class="act mini" data-a="importer-partie">Ouvrir un fichier</button>
    <button class="act mini" data-a="zone-partie">${texteExport === null
    ? 'Coller une partie' : 'Fermer la zone'}</button>
  </div>
  ${texteExport === null ? '' : `<div style="height:6px"></div>
    <textarea id="texte-partie" rows="6" spellcheck="false"
      style="width:100%;font-family:inherit;font-size:11px"
      placeholder="Collez ici le texte d’une partie exportée">${e(texteExport)}</textarea>
    <div style="height:6px"></div>
    <button class="act mini primaire" data-a="coller-partie">Charger ce texte</button>`}
  <div class="aide" style="margin-top:6px">Place occupée : ${e(mo(poids.octets))}
    sur les cinq mégaoctets environ qu’un navigateur accorde.</div>`;
}

/**
 * Refermer la boîte, pour de bon.
 *
 * `modale = null` ne suffit pas : `rafraichir` n'appelle `rendreModale` que
 * s'il y a quelque chose à montrer, si bien qu'une boîte fermée sans redessin
 * reste affichée et continue d'intercepter tous les clics de la page. Le jeu
 * paraît alors figé — on clique, rien ne répond. Une seule porte de sortie,
 * donc, et tout le monde passe par elle.
 */
/**
 * Les copies gardées, vues depuis l'accueil.
 *
 * Il faut pouvoir reprendre une partie d'avant sans passer par celle qui
 * tourne, et surtout ouvrir un fichier quand on n'a aucune partie en cours —
 * c'est exactement le cas d'un fichier reçu de quelqu'un d'autre.
 *
 * Enfermé dans sa propre fonction, et non écrit dans le gabarit de l'accueil :
 * si quelque chose y échoue, c'est ce bloc qui manque, pas l'écran d'accueil
 * entier — lequel se termine par `$('#modale').hidden = true`, la ligne qui
 * empêche une boîte fantôme d'avaler tous les clics de la page.
 */
function blocAccueilSauvegardes() {
  let liste = [];
  try {
    liste = (ACTIONS && ACTIONS.emplacements) ? ACTIONS.emplacements() : [];
  } catch (err) {
    return '';
  }
  return `<div class="panneau">
    <div class="titre">Sauvegardes ${liste.length
  ? `<span class="droite aide">${liste.length}</span>` : ''}</div>
    ${liste.length ? liste.map((x) => {
    const r = x.resume || {};
    return `<div style="border-bottom:1px solid #26211a;padding:6px 0">
        <div class="ligne souple"><span class="k">${e(x.nom)}</span>
          <span class="v aide">jour ${n(r.jour || 0)} · ${pl(r.gens || 0, 'vivant')}</span></div>
        <div class="taches" style="margin-top:4px">
          <button class="act mini primaire" data-a="charger-emp" data-k="${e(x.id)}">Charger</button>
          <button class="act mini danger" data-a="suppr-emp" data-k="${e(x.id)}">Supprimer</button>
        </div>
      </div>`;
  }).join('')
    : '<div class="aide">Aucune copie gardée. En cours de partie, le bouton ⛁ de la '
      + 'barre du haut permet d’en prendre.</div>'}
    <div style="height:8px"></div>
    <button class="act mini" data-a="importer-partie">Charger un fichier de partie</button>
  </div>`;
}

/** L'état de la dernière écriture, sans supposer que l'API l'expose. */
/** La taille du dernier écrit, si le jeu la connaît. */
function ETAT_SAUVEGARDE_TAILLE() {
  const e = etatSauvegarde();
  return (e && e.taille) || 0;
}

function etatSauvegarde() {
  try {
    return (ACTIONS && ACTIONS.etatSauvegarde && ACTIONS.etatSauvegarde())
      || { ok: true, motif: null, quand: 0, taille: 0, echecs: 0 };
  } catch (err) {
    return { ok: true, motif: null, quand: 0, taille: 0, echecs: 0 };
  }
}

/**
 * Ce que le panneau des sauvegardes doit retenir entre deux rendus.
 *
 * Hors de l'état de jeu : ça décrit une conversation en cours avec l'écran, pas
 * la partie. `arme` porte l'action qu'un premier clic a armée — on remplace
 * `confirm` par deux temps, parce qu'une page en bac à sable ignore `confirm`
 * et le fait répondre « non » sans rien afficher.
 */
let arme = null;
let messageSauvegardes = null;
let texteExport = null;

function fermerModale() {
  modale = null;
  rendreModale();
  rafraichir(true);
}

/**
 * La modale suit exactement la même règle que l'écran, et pour la même raison.
 *
 * Elle se réécrivait entièrement à chaque rafraîchissement — `.boite`, qui est
 * le conteneur qui défile, était détruite et refaite plusieurs fois par seconde.
 * Un élément neuf a un défilement à zéro : on ouvrait « Qui vit ici », on
 * descendait dans la liste, et quelques secondes plus tard on était remonté tout
 * en haut sans avoir rien touché.
 *
 * On garde donc la boîte et l'on ne remplace que son contenu — et seulement s'il
 * a changé.
 */
function rendreModale() {
  const el = $('#modale');
  const rapport = !modale && S.rapport && S.rapport.apres;
  if (!modale && !rapport) {
    el.hidden = true;
    el.innerHTML = '';
    dernierHtmlModale = null;
    return;
  }
  el.hidden = false;
  // Le rapport d'absence passe avant tout le reste : c'est la première chose
  // qu'on doit lire en rouvrant, et on ne la lit qu'une fois.
  const html = rapport ? modaleRapport() : contenuModale();
  let boite = el.querySelector(':scope > .boite');
  if (!boite) {
    el.innerHTML = '<div class="boite"></div>';
    boite = el.querySelector(':scope > .boite');
    dernierHtmlModale = null;
  }
  if (html === dernierHtmlModale) return;
  const ancre = mesurerAncre(boite);
  dernierHtmlModale = html;
  boite.innerHTML = html;
  restaurerAncre(boite, ancre);
}

function contenuModale() {
  const fermer = '<button class="act mini" data-a="fermer" style="margin-top:10px">Fermer</button>';
  switch (modale.m) {
    case 'marche': return modaleMarche() + fermer;
    case 'etal': return modaleEtal() + fermer;
    case 'panneau': return modalePanneau() + fermer;
    case 'transfert': return modaleTransfert() + fermer;
    case 'ecole': return modaleEcole() + fermer;
    case 'ville': return modaleVille() + fermer;
    case 'attelage': return modaleAttelage() + fermer;
    case 'coffre': return modaleCoffre() + fermer;
    case 'change': return modaleChange() + fermer;
    case 'equipement': return modaleEquipement() + fermer;
    case 'entrainement': return modaleEntrainement() + fermer;
    case 'recrutement': return modaleRecrutement() + fermer;
    case 'sauvegardes': return modaleSauvegardes() + fermer;
    default: return fermer;
  }
}

/**
 * Ce qui s'est passé pendant votre absence.
 *
 * Le rattrapage rejouait jusqu'à deux ans de jeu derrière une barre de
 * progression, puis rendait la main sans un mot. On revenait à une escouade
 * amaigrie et à un stock entamé sans le moindre moyen de savoir pourquoi : le
 * journal de bord est plafonné à quatre cents lignes, et trois cents jours
 * d'absence en produisent des milliers — le mort et la ville tombée avaient
 * défilé depuis longtemps.
 *
 * Ce n'est donc pas une relecture du journal, c'est un bilan : deux photos et
 * ce qu'il y a entre les deux. Voir rapport.js.
 */
function modaleRapport() {
  const r = lireRapport(S, S.rapport);
  if (!r) return '<button class="act" data-a="rapport-vu">Continuer</button>';
  const duree = r.jours >= 1
    ? `${n(r.jours)} jour${r.jours > 1 ? 's' : ''}`
    : `${n(r.heures)} h`;
  const bloc = (titre, contenu) => (contenu
    ? `<div class="sep"></div><div class="titre">${titre}</div>${contenu}` : '');
  // Étiquette courte à gauche, phrase à droite : la ligne ordinaire, celle où
  // c'est la valeur qui se coupe. `souple` ferait tomber « Vos gens » en
  // colonne dès que la phrase dépasse la largeur de l'écran.
  const ligne = (k, v, cls = '') => `<div class="ligne"><span class="k">${e(k)}</span>
    <span class="v ${cls}">${v}</span></div>`;

  const gens = r.pertes.length
    ? r.pertes.map((t) => ligne('Vos gens', e(t), /plus là|à terre/.test(t) ? 'alerte' : '')).join('')
    : ligne('Vos gens', 'tout le monde est là');

  // Le solde, puis d'où il vient. « −2 877 cr » sans rien d'autre est une
  // accusation sans dossier : on ne sait pas si l'on s'est fait détrousser, si
  // le camp a acheté du carburant, ou si un impôt a couru trois cents jours.
  const argent = ligne('Argent', `${r.argent > 0 ? '+' : ''}${n(r.argent)} ${sym()}`,
    r.argent < 0 ? 'alerte' : '')
    + (r.causes.length
      ? `<div class="aide">${r.causes.map((c) => `<span class="${c.delta < 0 ? 'alerte' : 'cyan'}">${
        c.delta > 0 ? '+' : ''}${n(c.delta)}</span> ${e(c.cause)}`).join(' · ')}</div>`
      : '');

  const marchandises = r.bouges.length
    ? r.bouges.slice(0, 6).map((x) => ligne(COMMODITIES[x.key].nom,
      `${x.delta > 0 ? '+' : ''}${n(x.delta)}`, x.delta < 0 ? 'alerte' : '')).join('')
    : '<div class="aide">Les stocks n’ont pas bougé.</div>';

  const estime = r.estime.length
    ? r.estime.map((x) => ligne(drapeauDe(S.world, x.faction).nom,
      `${x.delta > 0 ? '+' : ''}${n(x.delta)}`, x.delta < 0 ? 'alerte' : '')).join('')
    : '';

  const monde = r.monde.length
    ? r.monde.map((t) => `<div class="aide">· ${e(t)}</div>`).join('') : '';

  const faits = r.marquants.length
    ? r.marquants.map((m) => `<div class="fil-l ${couleurLog(m.type)}">
        <span class="fil-t">${horloge(m.t).texte}</span>
        <span class="fil-x">${e(m.texte)}</span></div>`).join('')
    : '';

  return `<h2 class="titre recit rapport-t">Le monde a continué sans vous
    <span class="droite">${e(duree)}</span></h2>
  ${r.calme
    ? '<div class="aide recit">Rien de notable. Ça arrive, et c’est plutôt bon signe.</div>'
    : '<div class="aide recit">Ce qui a changé pendant que cet onglet était fermé.</div>'}
  <div class="sep"></div>
  ${gens}
  ${argent}
  ${bloc('Marchandises', marchandises)}
  ${bloc('Ce qu’on pense de vous', estime)}
  ${bloc('Le monde', monde)}
  ${bloc('Ce qui est arrivé', faits ? `<div class="fil">${faits}</div>${r.tus
    ? `<div class="aide">…et ${pl(r.tus, 'autre événement', 'autres événements')}, au journal.</div>` : ''}` : '')}
  <div class="sep"></div>
  <button class="act primaire" data-a="rapport-vu">Reprendre les commandes</button>`;
}

/**
 * Le marché.
 *
 * Il n'offrait que « +10 » et « tout », sans jamais dire ce que ça ferait. Or le
 * prix est dégressif — chaque unité échangée déplace la suivante — donc « tout »
 * était un saut dans le noir, et c'est précisément le geste qui ruine une
 * cargaison : mesuré au banc, dimensionner un lot rapporte +21 % là où vider son
 * sac d'un coup en coûte 41. La seule action proposée était la mauvaise.
 *
 * On choisit donc une quantité, et chaque ligne annonce le montant exact, calculé
 * par le même code que la transaction (`simulerAchat` / `simulerVente`). Quand la
 * quantité voulue ne passe pas — sac plein, étal vide, bourse courte — le bouton
 * affiche ce qui passera réellement.
 */
const QUANTITES = [1, 10, 50, 9999];
let qteMarche = 10;

/**
 * La quantité pour tout ce qui se déplace d'un contenant à l'autre : entrepôt,
 * coffre. Le marché garde la sienne — on n'achète pas par lots de la même
 * taille qu'on range.
 *
 * C'était tout ou rien : un bouton « ↓ » qui vidait le sac. Déposer soixante
 * rations sur cent quatre-vingts, c'est-à-dire le geste normal quand on ravitaille
 * un camp en gardant de quoi rentrer, demandait de déposer les cent quatre-vingts
 * puis d'en reprendre cent vingt.
 */
let qteTransfert = 10;

function choixQuantite(action, courante) {
  return QUANTITES.map((q) => `<button class="act mini" data-a="${action}" data-q="${q}"
    aria-pressed="${courante === q}">${q === 9999 ? 'tout' : `×${q}`}</button>`).join('');
}

/**
 * Le bureau de change (ECONOMIE §5, §10).
 *
 * Le seul endroit du jeu où deux monnaies se regardent. Ailleurs, un prix est
 * dans la monnaie du lieu et rien ne dit ce qu'il vaut ailleurs : c'est la
 * friction choisie, et elle n'est jouable que parce que cet écran existe.
 *
 * Le portefeuille tient en haut, la monnaie d'ici d'abord et le reste ensuite,
 * **sans total** — il n'existe pas d'unité pour écrire la somme de six
 * monnaies, et en afficher une les rendrait interchangeables à l'œil, ce qui
 * viderait tout le lot de son sens.
 */
let changeVers = null;
let changeQte = 100;

function modaleChange() {
  const col = colonieDe(S.world, G().regionId);
  if (!bureauDe(col)) return '<div class="aide">Pas de bureau ici.</div>';
  const locale = col.faction || null;
  const b = (S.player && S.player.bourse) || {};
  // Le portefeuille : ce qu'on tient, la monnaie d'ici en tête.
  const tenues = Object.keys(b).filter((k) => b[k] > 0.005)
    .sort((x, y) => (x === locale ? -1 : y === locale ? 1 : b[y] - b[x]));
  const poche = tenues.length
    ? tenues.map((k) => `<div class="ligne"><span class="k" style="color:${couleurFaction(k)}">${
      e(drapeauDe(S.world, k).nom)}</span>
      <span class="v">${n(b[k], 2)} ${e(symboleDe(S.world, k))}</span></div>`).join('')
    : '<div class="aide">Vous n’avez rien sur vous.</div>';

  // Ce qu'on peut coter ici : la monnaie du lieu contre le reste du monde, et
  // rien d'autre (§5.1). Un bourg sans drapeau, lui, prend tout et sans écart.
  const cles = clesDe(S.world).filter((k) => k !== 'essaim');
  const paires = [];
  for (const k of cles) {
    if (locale) {
      if (k === locale) continue;
      paires.push([locale, k]);
      if (b[k] > 0.005) paires.push([k, locale]);
    } else if (b[k] > 0.005) {
      for (const v of cles) if (v !== k) paires.push([k, v]);
    }
  }
  if (!changeVers || !paires.some(([d, v]) => `${d}>${v}` === changeVers)) {
    changeVers = paires.length ? `${paires[0][0]}>${paires[0][1]}` : null;
  }
  if (!changeVers) return '<div class="aide">Rien à changer ici.</div>';
  const [de, vers] = changeVers.split('>');
  const dispo = b[de] || 0;
  const montant = Math.min(changeQte, dispo);
  const devis = devisChange(S.world, col, de, vers, montant);

  // Le signe **et** le nom. Le signe seul est illisible tant qu'on ne l'a pas
  // appris : « ▲ → ⬡ » ne dit pas qu'on vend de la Milice pour acheter de
  // l'Hexa. Le portefeuille au-dessus fait la correspondance, mais on ne lit
  // pas un bouton en remontant à une ligne trois centimètres plus haut. Vu à
  // l'écran, pas au code — c'est ce que les captures servent à trouver.
  const choix = paires.map(([d, v]) => {
    const k = `${d}>${v}`;
    return `<button class="act mini${k === changeVers ? ' primaire' : ''}"
      data-a="change-paire" data-k="${k}" aria-pressed="${k === changeVers}">${
  e(symboleDe(S.world, d))} ${e(drapeauDe(S.world, d).nom)} → ${
  e(symboleDe(S.world, v))} ${e(drapeauDe(S.world, v).nom)}</button>`;
  }).join('');

  return `<h2 class="titre">Change à ${e(col.nom)}</h2>
  <div class="grille2">${poche}</div>
  <div class="sep"></div>
  <div class="aide">1 ${e(symboleDe(S.world, de))} vaut ${n(devis.taux, 2)} ${
  e(symboleDe(S.world, vers))} · écart ${(devis.ecart * 100).toFixed(0)} %${
  devis.ecart === 0 ? ' — ici, personne ne prend rien' : ''}</div>
  <div class="taches" style="margin-top:5px">${choix}</div>
  <div class="sep"></div>
  <div class="taches">${[50, 100, 500, 9999].map((q) => `<button class="act mini"
    data-a="change-qte" data-q="${q}" aria-pressed="${changeQte === q}">${
  q === 9999 ? 'tout' : n(q)}</button>`).join('')}</div>
  <div class="ligne"><span class="k">Vous donnez</span>
    <span class="v">${n(montant, 2)} ${e(symboleDe(S.world, de))}</span></div>
  <div class="ligne"><span class="k">Vous recevez</span>
    <span class="v ambre">${n(devis.recu, 2)} ${e(symboleDe(S.world, vers))}</span></div>
  <button class="act primaire" data-a="change-faire" ${montant > 0 ? '' : 'disabled'}
    style="margin-top:6px">Changer</button>`;
}

function modaleMarche() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Il n’y a pas de marché ici.</div>';
  const negoc = meilleurCommercant(G().membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = S.player.reputation[col.faction] || 0;

  const choix = QUANTITES.map((q) => `<button class="act mini" data-a="qte-marche" data-q="${q}"
    aria-pressed="${qteMarche === q}">${q === 9999 ? 'max' : `×${q}`}</button>`).join('');

  const lignes = COMMODITY_KEYS.map((k) => {
    const p = prixJoueur(col, k, hab, repu, 0, undefined, S.world);
    const stock = Math.floor(col.stock[k] || 0);
    const aMoi = Math.floor(G().inventaire[k] || 0);
    const a = simulerAchat(S, col, k, qteMarche, G());
    const v = simulerVente(S, col, k, qteMarche, G());
    // Ce qui a borné l'achat, dit en clair plutôt que par un bouton grisé.
    const gene = { 'sac plein': 'sac plein', 'étal vide': 'étal vide', credits: 'bourse' }[a.borne];
    return `<div class="marche-l">
      <span class="nm">${e(COMMODITIES[k].nom)}<br>
        <span class="aide">ville ${n(stock)} · sac ${n(aMoi)} · ${n(p.achat, 1)} / ${n(p.vente, 1)}
        ${gene ? `<span class="rouge">· ${gene}</span>` : ''}</span></span>
      <button class="act" data-a="acheter" data-k="${k}" data-q="${qteMarche}" ${a.qte < 1 ? 'disabled' : ''}>
        ${a.qte < 1 ? '—' : `+${n(a.qte)}<br><span class="aide">${n(a.cout)} ${sym()}</span>`}</button>
      <button class="act" data-a="vendre" data-k="${k}" data-q="${qteMarche}" ${v.qte < 1 ? 'disabled' : ''}>
        ${v.qte < 1 ? '—' : `−${n(v.qte)}<br><span class="aide">${n(v.gain)} ${sym()}</span>`}</button>
    </div>`;
  }).join('');

  // La retenue du régime est déjà déduite des montants de vente affichés. Il
  // faut le dire, sinon le joueur croit à une erreur de prix.
  const reg = loiIci(S, col).regime;
  return `<h2 class="titre">Marché de ${e(col.nom)}
    <span class="droite">${n(soldeIci(S))} ${sym()}</span></h2>
  <div class="aide">Négociateur : ${negoc ? `${e(negoc.nom)} (commerce ${hab.toFixed(0)})` : 'aucun'}.
    Une bonne réputation et un bon commerçant resserrent la marge. Le prix bouge
    à chaque unité : les montants affichés tiennent compte de tout le lot.
    ${reg.preleve
    ? `<span class="retenue">${e(reg.nom)} : ${Math.round(reg.preleve * 100)} % retenus sur
      chaque vente, déjà déduits de ce qui est affiché.</span>`
    : `${e(reg.nom)} : on ne retient rien sur vos ventes ici.`}</div>
  <div class="taches" style="margin-top:6px">Quantité ${choix}</div>
  <div class="sep"></div>
  <div class="marche-l" style="padding:2px 0">
    <span class="nm aide">ville · sac · prix (achat / vente)</span>
    <span class="aide" style="text-align:center">Acheter</span>
    <span class="aide" style="text-align:center">Vendre</span>
  </div>${lignes}`;
}

/**
 * Le coffre : de la place qui ne marche pas avec vous.
 *
 * Entre le sac — borné par ce que les gens portent — et l'entrepôt de
 * l'avant-poste, qui est à un seul endroit et qu'on n'a pas forcément, il n'y
 * avait rien. Mesuré : 34 % de la cargaison d'une caravane détroussée reste sur
 * place faute de bras.
 */
function modaleCoffre() {
  const col = colonieDe(S.world, G().regionId);
  if (!col || col.ruine) return '<div class="aide">Pas de coffre en pleine friche.</div>';
  const coffre = coffreDe(S, col.id);
  const vL = peutLouer(S, col);
  const vA = peutAcheter(S, col);

  if (!coffre) {
    return `<h2 class="titre">Coffre à ${e(col.nom)}
      <span class="droite">${n(soldeIci(S))} ${sym()}</span></h2>
    <div class="aide">De la place qui reste ici pendant que vous marchez.</div>
    <div class="sep"></div>
    <button class="act${vL.ok ? ' primaire' : ''}" data-a="coffre-louer" ${vL.ok ? '' : 'disabled'}>
      Louer — ${LOYER} ${sym()} le mois, ${CAPACITE_LOUEE} kg
      ${vL.ok ? '' : `<br><span class="aide">${e(vL.motif)}</span>`}</button>
    <div style="height:6px"></div>
    <button class="act" data-a="coffre-acheter" ${vA.ok ? '' : 'disabled'}>
      Acheter — ${n(PRIX_COFFRE)} ${sym()}, ${CAPACITE_ACHETEE} kg, plus de loyer
      ${vA.ok ? '' : `<br><span class="aide">${e(vA.motif)}</span>`}</button>
    <div class="aide" style="margin-top:6px">${(() => {
    // Ce texte annonçait un seuil en dur, écrit avant les régimes : il promettait
    // quarante d'estime là où une Franchise en demande vingt-cinq et où une
    // Commune ne vend rien du tout. Une phrase d'aide fausse coûte plus cher que
    // pas de phrase du tout — c'est elle qu'on croit.
    if (!col.faction) return 'Ville libre : personne n’est en position de vous interdire de posséder.';
    const reg = loiIci(S, col).regime;
    if (reg.propriete === null) {
      return `${reg.nom} : on ne possède rien ici, quelle que soit votre estime.`;
    }
    const repu = Math.round(S.player.reputation[col.faction] || 0);
    return `${reg.nom} : on ne vend des murs qu’à qui l’on estime — `
      + `${reg.propriete} demandés, vous en avez ${repu}.`;
  })()}</div>`;
  }

  const pl = placeCoffre(coffre);
  const lignes = COMMODITY_KEYS.map((k) => {
    const dedans = Math.floor(coffre.contenu[k] || 0);
    const dans1sac = Math.floor(G().inventaire[k] || 0);
    if (!dedans && !dans1sac) return '';
    const met = Math.min(qteTransfert, dans1sac,
      Math.floor(pl.libre / Math.max(0.01, COMMODITIES[k].poids)));
    const reprend = Math.min(qteTransfert, dedans);
    return `<div class="marche-l">
      <span class="nm">${e(COMMODITIES[k].nom)}<br>
        <span class="aide">coffre ${n(dedans)} · sac ${n(dans1sac)}</span></span>
      <button class="act" data-a="coffre-deposer" data-k="${k}" ${met < 1 ? 'disabled' : ''}>
        y mettre${met > 0 ? `<br><span class="aide">${n(met)}</span>` : ''}</button>
      <button class="act" data-a="coffre-retirer" data-k="${k}" ${reprend < 1 ? 'disabled' : ''}>
        reprendre${reprend > 0 ? `<br><span class="aide">${n(reprend)}</span>` : ''}</button>
    </div>`;
  }).join('');

  return `<h2 class="titre">Coffre à ${e(col.nom)}
    <span class="droite">${Math.round(pl.pris)} / ${pl.total} kg</span></h2>
  ${jauge(pl.total ? pl.pris / pl.total : 0, pl.pris / pl.total > 0.95 ? 'rouge' : '')}
  <div class="aide">${coffre.achete
    ? 'À vous. Pas de loyer.'
    : `Loué : prochain loyer de ${LOYER} ${sym()} dans ${dureeTexte(Math.max(0, coffre.jusqu - S.temps))}.
       Sans quoi le bailleur se remboursera sur ce qu’il garde.`}</div>
  ${!coffre.achete && vA.ok
    ? `<div style="height:6px"></div><button class="act" data-a="coffre-acheter">
        L’acheter — ${n(PRIX_COFFRE)} ${sym()}, ${CAPACITE_ACHETEE} kg</button>` : ''}
  <div class="taches" style="margin-top:6px">Quantité ${choixQuantite('qte-transfert', qteTransfert)}</div>
  <div class="sep"></div>${lignes || '<div class="aide">Rien ici, rien dans le sac.</div>'}`;
}

function modaleEtal() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Pas d’armurier ici.</div>';
  const etal = col.etal;
  if (!etal || !etal.items.length) return '<div class="aide">L’étal est vide aujourd’hui.</div>';

  const negoc = meilleurCommercant(G().membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = S.player.reputation[col.faction] || 0;

  const decrire = (it) => {
    if (it.type === 'arme') {
      return `dégâts ${it.degats} · pénétration ${(it.pen * 100).toFixed(0)} % · ${it.poids} kg`
        + (it.portee === 'tir' ? ' · à distance' : ' · au corps à corps')
        + (it.reqForce ? ` · force ${it.reqForce}` : '');
    }
    if (it.type === 'armure') {
      return `armure ${it.armure} · ${it.poids} kg`
        + (it.bonus ? ` · ${Object.keys(it.bonus).map((b) => `+${it.bonus[b]} ${SKILLS[b] || b}`).join(', ')}` : '');
    }
    return Object.keys(it.bonus || {}).map((b) => `+${it.bonus[b]} ${SKILLS[b] || b}`).join(', ');
  };

  const achats = etal.items.map((ligne, i) => {
    const it = ITEMS[ligne.key];
    const p = prixItem(col, ligne.key, ligne.coef, hab, repu);
    const trop = soldeIci(S) < p.achat;
    return `<div class="article">
      <div class="ligne"><span class="k">${e(it.nom)}</span>
        <span class="v ambre">${n(p.achat)} ${sym()}${ligne.qte > 1 ? ` ×${ligne.qte}` : ''}</span></div>
      <div class="aide">${e(decrire(it))}</div>
      <button class="act mini ${trop ? '' : 'primaire'}" data-a="acheter-item" data-i="${i}"
        ${ligne.qte < 1 || trop ? 'disabled' : ''}>${ligne.qte < 1 ? 'Épuisé' : trop ? 'Trop cher' : 'Acheter'}</button>
    </div>`;
  }).join('');

  const reserve = G().objets.map((key, i) => {
    const it = ITEMS[key];
    const p = prixItem(col, key, 1, hab, repu);
    return `<div class="marche-l">
      <span class="nm">${e(it.nom)}<br><span class="aide">${e(decrire(it))}</span></span>
      <span class="px">${n(p.vente)} ${sym()}</span>
      <button class="act" data-a="vendre-item" data-i="${i}">Vendre</button>
    </div>`;
  }).join('') || '<div class="aide">Rien à revendre.</div>';

  return `<h2 class="titre">Armurier de ${e(col.nom)}
    <span class="droite">${n(soldeIci(S))} ${sym()}</span></h2>
  <div class="aide">Le stock se renouvelle. Ce que vous ne prenez pas aujourd’hui ne sera
    peut-être plus là demain.</div>
  <div class="sep"></div>
  ${achats}
  <div class="sep"></div>
  <div class="titre">Revendre votre réserve</div>
  ${reserve}`;
}

function modalePanneau() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Aucun panneau ici.</div>';
  const liste = col.contrats || [];
  // La figure du commanditaire (HISTOIRE.md, lot B) : à trois contrats
  // tenus, le panneau vous connaît.
  const nTenus = rencontresDe(S).contrats[col.id] || 0;
  return `<h2 class="titre">Panneau de ${e(col.nom)}
    <span class="droite">${S.player.contrats.length}/${MAX_CONTRATS} en cours</span></h2>
  ${nTenus >= 3 ? `<div class="aide" style="font-style:italic">On vous connaît ici :
    ${nTenus} contrats tenus pour la ville. On affiche parfois en pensant à vous.</div>` : ''}
  ${liste.length
    ? liste.map((c) => ligneContrat(c, false)).join('')
    : '<div class="aide">Rien d’affiché. Repassez plus tard.</div>'}`;
}

function modaleTransfert() {
  const b = S.base;
  if (!b.fonde || G().regionId !== b.regionId) {
    return '<div class="aide">Il faut être à l’avant-poste.</div>';
  }
  const lignes = COMMODITY_KEYS.map((k) => {
    const sac = Math.floor(G().inventaire[k] || 0);
    const ent = Math.floor(b.stock[k] || 0);
    if (!sac && !ent) return '';
    // Ce qui partira vraiment, borné par ce qu'on a et par la place restante :
    // le bouton annonce le nombre plutôt qu'une flèche.
    const versBas = Math.min(qteTransfert, sac, Math.max(0, capaciteStock(S) - totalStock(b)));
    const place = capacitePortage(S, G()) - poidsInventaire(G().inventaire);
    const versHaut = Math.min(qteTransfert, ent,
      Math.floor(place / Math.max(0.01, COMMODITIES[k].poids)));
    return `<div class="marche-l">
      <span class="nm">${e(COMMODITIES[k].nom)}<br>
        <span class="aide">sac ${n(sac)} · entrepôt ${n(ent)}</span></span>
      <button class="act" data-a="deposer" data-k="${k}" ${versBas < 1 ? 'disabled' : ''}>
        ↓ ${versBas > 0 ? n(versBas) : '—'}</button>
      <button class="act" data-a="retirer" data-k="${k}" ${versHaut < 1 ? 'disabled' : ''}>
        ↑ ${versHaut > 0 ? n(versHaut) : '—'}</button>
    </div>`;
  }).join('');
  return `<h2 class="titre">Transfert
    <span class="droite">${n(totalStock(b))}/${n(capaciteStock(S))}</span></h2>
  <div class="aide">↓ vers l’entrepôt · ↑ vers le sac. Les boutons annoncent ce qui
    passera vraiment : ce qu’on a, ce que l’entrepôt peut prendre, ce que le sac peut porter.</div>
  <div class="taches" style="margin-top:6px">Quantité ${choixQuantite('qte-transfert', qteTransfert)}</div>
  <div class="sep"></div>${lignes || '<div class="aide">Rien à déplacer.</div>'}`;
}

function modaleEquipement() {
  const c = G().membres.find((x) => x.id === modale.c);
  if (!c) return '<div class="aide">Ce membre n’est plus là.</div>';
  const dispo = G().objets;
  const groupes = { arme: [], armure: [], greffe: [] };
  dispo.forEach((k, i) => {
    const it = ITEMS[k];
    if (it) groupes[it.type].push({ k, i, it });
  });

  const bloc = (type, titre) => {
    const items = groupes[type];
    if (!items.length) return `<div class="titre">${titre}</div><div class="aide">Rien en réserve.</div>`;
    return `<div class="titre">${titre}</div><div class="pile">${items.map(({ k, i, it }) => {
      const possible = peutEquiper(c, k);
      const desc = it.type === 'arme'
        ? `dégâts ${it.degats} · pén. ${(it.pen * 100).toFixed(0)} % · ${it.poids} kg`
        : it.type === 'armure' ? `armure ${it.armure} · ${it.poids} kg`
          : Object.keys(it.bonus || {}).map((b) => `+${it.bonus[b]} ${SKILLS[b] || b}`).join(', ');
      return `<button class="act mini" style="text-align:left" data-a="equiper" data-i="${i}" data-c="${e(c.id)}"
        ${possible ? '' : 'disabled'}>${e(it.nom)} — ${e(desc)}${possible ? '' : ' (force insuffisante)'}</button>`;
    }).join('')}</div>`;
  };

  return `<h2 class="titre">${e(c.nom)}</h2>
    <div class="ligne"><span class="k">Arme</span><span class="v">${e(c.equip.arme ? ITEMS[c.equip.arme].nom : '—')}</span></div>
    <div class="ligne"><span class="k">Armure</span><span class="v">${e(c.equip.armure ? ITEMS[c.equip.armure].nom : '—')}</span></div>
    <div class="sep"></div>
    ${bloc('arme', 'Armes')}
    <div class="sep"></div>
    ${bloc('armure', 'Armures')}
    <div class="sep"></div>
    ${bloc('greffe', 'Greffes')}
    ${niveauRech(S.base, 'cybernetique') < 1 ? '<div class="aide" style="color:var(--ambre)">Les greffes exigent la recherche Cybernétique.</div>' : ''}`;
}

/**
 * Choix de la compétence travaillée. Ouvert depuis l'ordre du groupe (tout le
 * monde s'y met) ou depuis la fiche d'un membre (lui seul), selon qu'on a passé
 * un identifiant.
 */
function modaleEntrainement() {
  const g = G();
  const c = modale.c ? g.membres.find((x) => x.id === modale.c) : null;
  const meilleurs = {};
  for (const k of COMPETENCES_EXERCICE) {
    meilleurs[k] = g.membres.filter(estVivant)
      .reduce((m, x) => Math.max(m, comp(x, k)), 0);
  }
  return `<h2 class="titre">Exercice${c ? ` — ${e(c.nom)}` : ''}</h2>
  <div class="aide">${c
    ? 'Cette personne seule travaille la compétence choisie ; le reste du groupe suit son ordre.'
    : 'Tout le groupe travaille la même compétence.'}
  Consomme des rations et ne rapporte rien — mais c’est deux fois plus rapide que le terrain.
  Le meilleur du groupe fait l’instructeur : plus l’écart est grand, plus l’élève monte vite.</div>
  <div class="sep"></div>
  <div class="pile">${COMPETENCES_EXERCICE.map((k) => {
    const niv = c ? comp(c, k) : null;
    const ecart = c ? Math.max(0, meilleurs[k] - niv) : 0;
    return `<button class="act mini" style="text-align:left"
      data-a="entrainer" data-k="${k}" ${c ? `data-c="${e(c.id)}"` : ''}>
      ${e(SKILLS[k])}${c ? ` <span class="aide">— ${Math.round(niv)}${ecart > 2
      ? `, instructeur à ${Math.round(meilleurs[k])}` : ', personne pour l’encadrer'}</span>` : ''}
    </button>`;
  }).join('')}</div>
  <div class="sep"></div>
  <div class="titre">Ce qui ne s’exerce pas</div>
  <div class="aide">${Object.keys(PAR_LA_PRATIQUE)
    .map((k) => `<b>${e(SKILLS[k])}</b> ${e(PAR_LA_PRATIQUE[k])}`).join(' · ')}.
  Ces métiers-là s’apprennent en les faisant, pas sur un mannequin de paille.</div>`;
}

/**
 * Les écoles de la ville. Un diplôme ne remplace pas la pratique : il pose un
 * plancher et fait apprendre plus vite ensuite, à vie. Le prix est du temps
 * passé sur place autant que des crédits — l'élève ne travaille plus.
 */
function modaleEcole() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Aucune ville ici.</div>';
  const offres = ecolesDe(S.world, col);
  if (!offres.length) return '<div class="aide">On n’enseigne rien ici.</div>';
  const g = G();
  const remise = estAuService(S, col.faction) ? 0.15 : 0;
  const regime = loiIci(S, col).regime;

  const enCours = g.membres.filter((c) => c.formation).map((c) => {
    const d = DIPLOMES[c.formation.key];
    const surPlace = c.formation.colonieId === col.id;
    const fait = c.formation.total - c.formation.restant;
    return `<div class="contrat">
      <div class="contrat-t">${e(c.nom)} — ${e(d.nom)}</div>
      ${jauge(fait / c.formation.total, 'cyan')}
      <div class="aide">${fait} / ${c.formation.total} h${surPlace
    ? '' : ' · suspendu, l’école est ailleurs'}</div>
      <button class="act mini danger" data-a="abandonner-formation" data-c="${e(c.id)}">Retirer de l’école</button>
    </div>`;
  }).join('');

  const lignes = offres.map((k) => {
    const d = DIPLOMES[k];
    const prix = prixFormation(col, k, remise, regime);
    const candidats = g.membres.filter((c) => estVivant(c) && peutSInscrire(S, col, c, k).ok);
    return `<div class="contrat">
      <div class="contrat-t">${e(d.nom)}</div>
      <div class="aide">${e(d.texte)}</div>
      <div class="ligne"><span class="k">À la sortie</span>
        <span class="v">${e(SKILLS[d.skill])} ${d.plancher} au minimum</span></div>
      <div class="ligne"><span class="k">Apprentissage ensuite</span>
        <span class="v">×${d.apprentissage.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Durée sur place</span>
        <span class="v">${dureeTexte(d.heures)}</span></div>
      <div class="ligne"><span class="k">Prix</span>
        <span class="v ${soldeIci(S) >= prix ? '' : 'alerte'}">${prix
    ? `${n(prix)} ${sym()}${remise ? ' (remise)' : ''}`
    : `gratuit — ${e(regime.nom)}`}</span></div>
      ${candidats.length
    ? `<div class="taches">${candidats.map((c) => `<button class="act mini"
        data-a="inscrire" data-k="${k}" data-c="${e(c.id)}"
        ${soldeIci(S) >= prix ? '' : 'disabled'}>Inscrire ${e(c.nom)}
        <span class="aide">(${Math.round(comp(c, d.skill))})</span></button>`).join('')}</div>`
    : '<div class="aide">Personne du groupe ne peut s’y inscrire — déjà diplômé, déjà en formation, ou en sait plus que l’école.</div>'}
    </div>`;
  }).join('');

  return `<h2 class="titre">Écoles de ${e(col.nom)}</h2>
  <div class="aide">Un diplôme pose un plancher de compétence et fait apprendre plus vite
  toute la partie. Mais l’élève reste en ville : il ne travaille plus, ne se bat plus et
  ne porte plus rien, et la formation ne progresse que tant qu’il est sur place.</div>
  ${enCours ? `<div class="sep"></div><div class="titre">En cours</div>${enCours}` : ''}
  <div class="sep"></div>
  ${lignes}`;
}

/**
 * Qui travaille ici, et qui compte. Les habitants restent des effectifs — on ne
 * nomme pas cinq mille personnes —, mais ceux que le joueur peut toucher ont un
 * nom, un âge, une humeur et une opinion sur lui.
 */
/**
 * Ce que l'estime de ces gens vous a déjà ouvert. Sans ça, rendre un service
 * ressemble à de la charité : le joueur doit voir ce que la relation paie.
 */
function acquisHtml(col) {
  const lignes = [];
  const chef = faveurChef(col);
  if (!chef.ouvert) lignes.push('Le chef vous a fermé son panneau d’affichage.');
  else if (chef.prime !== 1) {
    // Le taux vient de `faveurChef`, il n'est pas réécrit ici : c'était « +20 % »
    // en dur à côté d'un `prime: 1.2` qui peut bouger sans que la phrase suive.
    lignes.push(`Le chef vous garde les contrats qui paient (+${Math.round((chef.prime - 1) * 100)} %).`);
  }
  const med = (col.notables || []).find((p) => p.charge === 'medecin');
  if (med && (med.opinion || 0) >= SOINS_SEUIL) lignes.push('Le médecin passe voir vos blessés quand vous campez ici.');
  const cm = (col.notables || []).find((p) => p.charge === 'contremaitre');
  if (cm && (cm.opinion || 0) >= REGISTRES_SEUIL) lignes.push('Le contremaître vous laisse ses registres : les chiffres d’ici restent frais où que vous soyez.');
  if (!lignes.length) return '';
  return `<div class="aide" style="border-left:2px solid #4fd0e3;padding-left:8px">
    ${lignes.map(e).join('<br>')}</div>`;
}

function modaleVille() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Aucune ville ici.</div>';
  const act = actifs(col);
  const voc = vocation(col);

  const emploisHtml = METIER_VILLE_KEYS
    .map((k) => ({ k, n: emploi(col, k) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map(({ k, n: nb }) => {
      const m = METIERS_VILLE[k];
      return `<div style="border-bottom:1px solid #26211a;padding:5px 0">
        <div class="ligne"><span class="k">${e(m.nom)}</span>
          <span class="v">${n(nb)} <span class="aide">${((nb / act) * 100).toFixed(0)} %</span></span></div>
        ${jauge(nb / act, '', k === (voc && voc.key) ? '#4fd0e3' : undefined)}
        <div class="aide">${e(m.desc)}</div>
      </div>`;
    }).join('');

  const attentes = new Map(demandesIci(S, col).map((d) => [d.notable.id, d]));

  const gensHtml = (col.notables || []).map((p) => {
    const c = CARACTERES[p.caractere] || {};
    const av = p.opinion > 25 ? 'ok' : p.opinion < -25 ? 'mal' : 'att';
    const humeur = p.humeur > 65 ? 'de bonne humeur' : p.humeur < 35 ? 'de mauvaise humeur' : 'égal à lui-même';
    const att = attentes.get(p.id);
    const reste = att ? Math.max(0, att.demande.echeance - S.temps) : 0;
    const demandeHtml = att ? `<div class="sep"></div>
      <div class="aide">« ${e(att.demande.texte)} »</div>
      <div class="ligne"><span class="k">Il vous reste</span>
        <span class="v">${Math.round(reste / 24)} j · ${n(att.demande.prime)} ${sym()}</span></div>
      <button class="act${att.pret ? ' primaire' : ''}" data-a="honorer"
        data-c="${e(col.id)}" data-n="${e(p.id)}" ${att.pret ? '' : 'disabled'}>
        ${att.pret ? 'Lui remettre' : `Il faut ${att.demande.quantite} ${e(COMMODITIES[att.demande.res].nom.toLowerCase())}`}
      </button>` : '';
    const mem = souvenirs(p);
    const memHtml = mem.length
      ? `<div class="aide" style="margin-top:4px;font-style:italic">${mem.map(e).join('<br>')}</div>` : '';
    return `<div class="contrat">
      <div class="contrat-t">${e(p.nom)}
        <span class="aide">— ${e(CHARGES[p.charge].nom.toLowerCase())}</span></div>
      <div class="ligne"><span class="k">Caractère</span>
        <span class="v">${e(c.nom || '—')}, ${e(humeur)}</span></div>
      <div class="ligne"><span class="k">${e(SKILLS[p.skill])}</span>
        <span class="v">${Math.round(p.comp)}</span></div>
      <div class="ligne"><span class="k">Âge</span><span class="v">${Math.round(p.age)} ans</span></div>
      <div class="ligne"><span class="k">Vous concernant</span>
        <span class="v"><span class="puce ${av}">${p.opinion > 0 ? '+' : ''}${Math.round(p.opinion)}</span></span></div>
      <div class="aide">${e(CHARGES[p.charge].desc)}</div>
      ${memHtml}${demandeHtml}
    </div>`;
  }).join('') || '<div class="aide">Personne qui compte, ici. Ça arrive.</div>';

  const marge = margeMarchand(col);
  return `<h2 class="titre">${e(col.nom)}
    <span class="droite">${n(col.pop)} habitants</span></h2>
  <div class="aide">${act} actifs${voc ? ` · ville de ${e(voc.def.nom.toLowerCase())}` : ''}.
    Le reste — enfants, vieux, éclopés — mange sans produire, et c’est ce qui rend
    une ville fragile.</div>
  <div class="sep"></div>
  <div class="titre">Métiers</div>
  ${emploisHtml}
  <div class="sep"></div>
  <div class="titre">Qui compte</div>
  ${marge !== 0 ? `<div class="aide">L’armurier ${marge > 0 ? 'prend' : 'lâche'}
    ${Math.abs(marge * 100).toFixed(0)} % ${marge > 0 ? 'de plus' : 'de moins'} que l’ordinaire.</div>` : ''}
  ${acquisHtml(col)}
  ${gensHtml}`;
}

/**
 * L'attelage : ce qui porte à votre place. Le sujet n'est pas le portage en
 * soi — c'est que soixante-dix pour cent des départs d'un convoi servent à
 * faire la navette avec la ville, et qu'une bête, ça se nourrit et ça se perd.
 */
function modaleAttelage() {
  const g = G();
  const col = colonieDe(S.world, g.regionId);
  const miennes = betesDe(g);

  const aMoi = miennes.length ? miennes.map((b) => {
    const def = BETES[b.key];
    const etat = b.sante > 75 ? 'ok' : b.sante > 35 ? 'att' : 'mal';
    return `<div class="contrat">
      <div class="contrat-t">${e(b.nom)} <span class="aide">— ${e(def.nom.toLowerCase())}</span></div>
      <div class="ligne"><span class="k">État</span>
        <span class="v"><span class="puce ${etat}">${Math.round(b.sante)} %</span></span></div>
      <div class="ligne"><span class="k">Porte</span>
        <span class="v">${n(Math.round(def.portage * (0.35 + 0.65 * b.sante / 100)))} kg</span></div>
      ${def.appetit ? `<div class="ligne"><span class="k">Faim</span>
        <span class="v">${b.faim > 45 ? '<span class="alerte">affamée</span>' : 'repue'}</span></div>` : ''}
      ${col ? `<button class="act mini" data-a="vendre-bete" data-b="${e(b.id)}"
        style="margin-top:4px">Céder à ${e(col.nom)}</button>` : ''}
    </div>`;
  }).join('') : '<div class="aide">Vous portez tout sur le dos.</div>';

  const etal = col ? BETE_KEYS.map((k) => {
    const def = BETES[k];
    const prix = prixBete(col, k);
    // Rien n'est interdit : on dit ce que ça coûtera, et le joueur décide.
    const auDela = miennes.length >= conduite(g);
    return `<div style="border-bottom:1px solid #26211a;padding:6px 0">
      <div class="ligne"><span class="k">${e(def.nom)}</span>
        <span class="v">${n(prix)} ${sym()}</span></div>
      <div class="aide">${e(def.desc)}</div>
      <div class="aide">+${def.portage} kg · ${def.appetit
    ? `mange ${(def.appetit * 24).toFixed(1)} biomasse/jour` : 'ne mange rien'}
        · −${(def.lenteur * 100).toFixed(0)} % de vitesse</div>
      <button class="act mini${auDela ? '' : ' primaire'}" data-a="acheter-bete" data-k="${k}"
        style="margin-top:4px" ${soldeIci(S) < prix ? 'disabled' : ''}>
        ${soldeIci(S) < prix ? 'Bourse trop courte'
    : auDela ? 'Acheter — personne pour la mener' : 'Acheter'}</button>
    </div>`;
  }).join('') : '<div class="aide">On n’achète pas une bête au milieu du désert.</div>';

  return `<h2 class="titre">Attelage de ${e(g.nom)}
    <span class="droite">${n(soldeIci(S))} ${sym()}</span></h2>
  <div class="aide">Une bête porte à votre place, mange ce que personne ne mange,
    et ralentit le convoi. Elle maigrit si on l’oublie, et les pillards
    l’emmènent avant le reste.</div>
  <div class="ligne"><span class="k">Bras disponibles</span>
    <span class="v">${miennes.length} bête${miennes.length > 1 ? 's' : ''} pour ${n(conduite(g))} qu’on sait mener</span></div>
  ${portageAttelage(g) > 0 ? `<div class="ligne"><span class="k">Porté par l’attelage</span>
    <span class="v">${n(Math.round(portageAttelage(g)))} kg · −${(lenteurAttelage(g) * 100).toFixed(0)} % de vitesse</span></div>
  <div class="ligne"><span class="k">Se voit de loin</span>
    <span class="v">+${((visibiliteAttelage(g) - 1) * 100).toFixed(0)} % de rencontres</span></div>` : ''}
  ${surnombre(g) > 0 ? `<div class="aide alerte">${surnombre(g)} bête${surnombre(g) > 1 ? 's' : ''}
    que personne ne tient : elles portent mal, elles dépérissent, et elles traînent
    la colonne. Rien ne l’interdit — c’est juste une mauvaise affaire.</div>` : ''}
  <div class="sep"></div>
  <div class="titre">Vos bêtes</div>
  ${aMoi}
  <div class="sep"></div>
  <div class="titre">À vendre ici</div>
  ${etal}`;
}

function modaleRecrutement() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Personne à recruter ici.</div>';
  const g = G();
  const noy = noyau(S, g);
  const ici = vivantsDe(g).length;
  const plafond = plafondCohesion(S, g);
  const apres = Math.max(12, 100 / (1 + Math.max(0, ici + 1 - noy) / 7));
  // La vue (époque, agitation) part avec chaque bouton : à grande vitesse le
  // banc tourne entre l'affichage et le clic, et le moteur doit pouvoir
  // engager la personne que CET écran montrait.
  const vueBanc = bancDerive(col, S.temps, S.world.graine);
  const banc = vueBanc.gens;

  const gens = banc.length ? banc.map((c, i) => {
    const prix = primeDe(S, col, c);
    const a = apercu(c);
    return `<div class="contrat">
      <div class="contrat-t">${e(c.nom)}
        <span class="aide">— ${e(c.archetypeNom)}</span></div>
      <div class="ligne"><span class="k">Meilleure compétence</span>
        <span class="v">${e(SKILLS[a.skill])} ${a.niveau}</span></div>
      ${(c.diplomes || []).length ? `<div class="ligne"><span class="k">Brevets</span>
        <span class="v">${c.diplomes.map((d) => e(DIPLOMES[d] ? DIPLOMES[d].nom : d)).join(', ')}</span></div>` : ''}
      ${(c.traits || []).length ? `<div class="aide">${c.traits.map((t) =>
    e(TRAITS[t] ? TRAITS[t].nom : t)).join(' · ')}</div>` : ''}
      <div class="ligne"><span class="k">Prime</span><span class="v">${n(prix)} ${sym()}</span></div>
      <button class="act mini${soldeIci(S) >= prix ? ' primaire' : ''}"
        data-a="recruter" data-i="${e(c.id)}" data-ep="${vueBanc.epoque}" data-ag="${vueBanc.agitation}" style="margin-top:4px"
        ${soldeIci(S) < prix ? 'disabled' : ''}>
        ${soldeIci(S) < prix ? 'Bourse trop courte' : 'Engager'}</button>
    </div>`;
  }).join('') : '<div class="aide">Personne ne cherche à partir d’ici en ce moment.</div>';

  const tension = tensionRecrutement(col);
  return `<h2 class="titre">Recrutement à ${e(col.nom)}
    <span class="droite">${n(soldeIci(S))} ${sym()}</span></h2>
  <div class="aide">${tension < 0.8
    ? 'La ville va mal. Beaucoup de gens veulent s’en aller, et pour pas cher.'
    : tension > 1.15
      ? 'La ville va bien. On n’en part pas sans une bonne raison, ni pour rien.'
      : 'Quelques bras cherchent de l’ouvrage.'}</div>
  <div class="grille2">
    <div class="ligne"><span class="k">${e(g.nom)}</span><span class="v">${ici} personnes</span></div>
    <div class="ligne"><span class="k">Noyau qu’on tient</span><span class="v">${n(noy)}</span></div>
    <div class="ligne"><span class="k">Cohésion possible</span>
      <span class="v">${Math.round(plafond)} %${apres < plafond
    ? ` → <span class="alerte">${Math.round(apres)} %</span>` : ''}</span></div>
  </div>
  <div class="aide">Rien ne limite le nombre : au-delà du noyau, on se connaît
    moins, on travaille moins bien et on se bat moins bien. Un baraquement
    élargit ce qu’on arrive à tenir ensemble.</div>
  <div class="sep"></div>
  ${gens}`;
}

// ---------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------

/**
 * Le départ choisi à l'accueil. Hors de l'état de jeu : c'est une préférence
 * d'écran, pas une donnée de partie — une fois lancée, la partie n'a plus à
 * savoir de quel scénario elle vient.
 */
let departChoisi = DEPART_DEFAUT;
let derniereSauvegarde = false;
let dernierePerimee = false;

export function rendreAccueil(aSauvegarde, perimee = false) {
  derniereSauvegarde = aSauvegarde;
  dernierePerimee = perimee;
  $('#barre-haut').innerHTML = '';
  $('#barre-nav').innerHTML = '';
  $('#ecran').innerHTML = `
  <div class="accueil">
    <h1>Cendres &amp; Protocole</h1>
    <div class="sous">Une escouade. Un monde qui tourne sans vous.</div>
    ${aSauvegarde ? '<button class="act primaire" data-a="continuer">Reprendre la partie</button><div style="height:8px"></div>' : ''}
    <div class="panneau">
      <div class="aide">Vous n’êtes l’élu de personne. Six factions se disputent une carte
      que vous ne connaissez pas. Elles se font la guerre, prennent des villes et en perdent,
      que vous soyez là ou non — y compris pendant que cet onglet est fermé.<br><br>
      Vos gens apprennent en faisant. Ils se blessent membre par membre, tombent K.O.
      avant de mourir, et se souviennent de la faim.</div>
    </div>
    ${!aSauvegarde && perimee ? `<div class="panneau">
      <div class="titre">Ancienne partie</div>
      <div class="aide">Une sauvegarde est là, mais elle a été commencée sur la carte
      de 10×8. Le monde d’une partie ne s’agrandit pas en cours de route : les
      secteurs y sont numérotés selon l’ancienne grille, et les relire avec la
      nouvelle donnerait une carte fausse d’un bout à l’autre.<br><br>
      Une nouvelle partie ouvre la carte de 24×18 — 432 secteurs, 86 villes.</div>
    </div>` : ''}
    <div class="panneau">
      <div class="titre">Nouvelle partie</div>
      <div class="aide">Par où l’on commence. Ce n’est pas un niveau de difficulté :
        c’est une situation, et chacune se joue autrement.</div>
      <div style="height:6px"></div>
      ${DEPART_KEYS.map((k) => `<button class="act depart" data-a="choisir-depart" data-k="${k}"
        aria-pressed="${departChoisi === k}">
        <span class="depart-n">${e(DEPARTS[k].nom)}</span>
        <span class="aide">${e(DEPARTS[k].resume)}</span>
      </button>`).join('')}
      <div class="aide" style="margin-top:6px">${e(DEPARTS[departChoisi].detail)}</div>
      <div class="sep"></div>
      <label class="aide" for="graine">Graine (facultatif — même graine, même monde)</label>
      <input id="graine" type="text" inputmode="text" placeholder="au hasard" autocomplete="off">
      <div style="height:8px"></div>
      <button class="act primaire" data-a="nouvelle">Commencer</button>
    </div>
    ${blocAccueilSauvegardes()}
    ${aSauvegarde ? '<button class="act danger" data-a="effacer">Effacer la sauvegarde</button>' : ''}
  </div>`;
  $('#modale').hidden = true;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function surClic(ev) {
  const el = ev.target.closest('[data-a]');
  if (!el) {
    if (ev.currentTarget.id === 'modale' && ev.target.id === 'modale') { modale = null; rendreModale(); }
    return;
  }
  const a = el.dataset.a;
  ev.preventDefault();
  derniereInteraction = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  switch (a) {
    case 'voir-plus-escouade':
      montresEscouade += PAS_ESCOUADE;
      rafraichir(true);
      break;

    case 'onglet':
      // On rouvre une escouade par son début : reposer mille fiches parce
      // qu'on avait déroulé la liste hier n'aiderait personne. (Comparé AVANT
      // d'affecter — sinon on se compare à soi-même, ce que j'ai écrit du
      // premier coup.)
      if (el.dataset.k !== onglet) montresEscouade = PAS_ESCOUADE;
      onglet = el.dataset.k;
      // Ouvrir un écran, c'est le vouloir neuf — y compris celui qu'on rouvre.
      derniereSignatureCarte = '';
      dernierVifCarte = '';
      rafraichir(true);
      break;

    case 'vitesse':
      S.vitesse = Number(el.dataset.v);
      ACTIONS.sauver();
      rafraichir(true);
      break;

    case 'ordre': {
      const r = donnerOrdre(S, { type: el.dataset.k });
      if (!r.ok) toast(r.motif, true);
      rafraichir(true);
      break;
    }

    case 'voyage': {
      const forcee = el.dataset.f === '1';
      const r = donnerOrdre(S, {
        type: 'voyage', dest: Number(el.dataset.r), allure: forcee ? 'forcee' : 'normale',
      });
      if (!r.ok) toast(r.motif, true);
      else { onglet = 'carte'; toast(forcee ? 'En route, sans s’arrêter.' : 'En route.'); }
      rafraichir(true);
      break;
    }

    case 'posture':
      S.player.posture = el.dataset.k;
      rafraichir(true);
      break;

    // --- Groupes ----------------------------------------------------------

    case 'groupe':
      ACTIONS.choisirGroupe(el.dataset.k);
      selection = G().regionId;
      detaches = new Set();
      break;

    case 'tache': {
      const k = el.dataset.k;
      const r = ACTIONS.assignerTache(el.dataset.c, k ? { type: k } : null);
      if (!r.ok) toast(r.motif, true);
      rafraichir(true);
      break;
    }

    case 'detacher-sel': {
      const id = el.dataset.c;
      if (detaches.has(id)) detaches.delete(id);
      else detaches.add(id);
      rafraichir(true);
      break;
    }

    case 'detacher': {
      const r = ACTIONS.scinder([...detaches]);
      detaches = new Set();
      if (!r.ok) toast(r.motif, true);
      else toast(`${r.groupe.nom} part de son côté.`);
      rafraichir(true);
      break;
    }

    case 'fusionner': {
      const r = ACTIONS.fusionner(el.dataset.k);
      if (!r.ok) toast(r.motif, true);
      else toast('Groupes réunis.');
      rafraichir(true);
      break;
    }

    case 'politique':
      S.player.politique[el.dataset.k] = !S.player.politique[el.dataset.k];
      rafraichir(true);
      break;

    case 'filtre':
      filtreJournal = el.dataset.k;
      rafraichir(true);
      break;

    case 'modale':
      modale = { m: el.dataset.m, c: el.dataset.c };
      rendreModale();
      break;

    case 'fermer':
      fermerModale();
      break;
    // Le rapport d'absence ne se lit qu'une fois : on l'efface de l'état, sinon
    // il reviendrait à chaque chargement de la sauvegarde.
    case 'rapport-vu':
      delete S.rapport;
      modale = null;
      rendreModale();
      rafraichir(true);
      break;

    case 'engager': {
      const r = ACTIONS.sEngager(el.dataset.k);
      toast(r.ok ? 'Engagement conclu.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'quitter-service': {
      const r = ACTIONS.quitterService();
      toast(r.ok ? 'Engagement rompu.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'attaquer-caravane': {
      const r = ACTIONS.attaquerCaravane(el.dataset.k);
      if (!r.ok) toast(r.motif, true);
      else if (!r.gagne) toast(r.motif || 'L’escorte a tenu.', true);
      else toast('Caravane détroussée.');
      rafraichir(true);
      break;
    }

    case 'fouiller-site': {
      const r = ACTIONS.fouillerSite();
      if (!r.ok) toast(r.motif, true);
      else if (r.combat && !r.gagne) toast('Le site était gardé. Repli.', true);
      // Ce qu'on a ramassé, tout de suite et en toutes lettres : « Site
      // fouillé. » ne disait rien de ce qu'on venait de gagner.
      else toast(`Fouillé : ${r.resume}`);
      rafraichir(true);
      break;
    }

    case 'accepter': {
      const col = colonieDe(S.world, G().regionId);
      const r = accepter(S, col, el.dataset.k, logger());
      toast(r.ok ? 'Contrat accepté.' : r.motif, !r.ok);
      if (r.ok && modale) { modale = null; rendreModale(); }
      rafraichir(true);
      break;
    }

    case 'abandonner': {
      const r = abandonner(S, el.dataset.k, logger());
      toast(r.ok ? 'Contrat abandonné.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'acheter-item': {
      const col = colonieDe(S.world, G().regionId);
      const r = acheterItem(S, col, Number(el.dataset.i));
      toast(r.ok ? `${r.nom} acheté pour ${r.prix} ${sym()}.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'vendre-item': {
      const col = colonieDe(S.world, G().regionId);
      const r = vendreItem(S, col, Number(el.dataset.i));
      toast(r.ok ? `${r.nom} vendu ${r.prix} ${sym()}.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'fonder': {
      const r = fonderBase(S, logger());
      toast(r.ok ? 'Avant-poste fondé.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'construire': {
      const r = lancerConstruction(S, el.dataset.k);
      if (!r.ok) toast(r.motif, true);
      rafraichir(true);
      break;
    }

    case 'annuler': {
      const r = annulerConstruction(S, Number(el.dataset.i));
      if (!r.ok) toast(r.motif, true);
      rafraichir(true);
      break;
    }

    case 'chercher': {
      const r = lancerRecherche(S, el.dataset.k);
      if (!r.ok) toast(r.motif, true);
      rafraichir(true);
      break;
    }

    case 'sortie-siege': {
      const r = ACTIONS.sortieSiege();
      toast(r.ok ? 'La sortie est faite — le journal raconte.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'negocier-siege': {
      const r = ACTIONS.negocierSiege();
      toast(r.ok ? `Siège levé contre ${n(r.prix)} ${sym()}.` : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'evacuer-camp': {
      const r = ACTIONS.evacuerCamp();
      toast(r.ok ? `Camp évacué — ${n(r.emporte)} unités emportées.` : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'forger': {
      const r = lancerFabrication(S, el.dataset.k);
      toast(r.ok ? `${ITEMS[el.dataset.k].nom} au feu de forge.` : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'fabriquer-charrette': {
      const r = lancerFabrication(S, 'charrette');
      toast(r.ok ? 'Charrette en montage à l’attelage.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'devaluation-vue':
      ACTIONS.alertesVues();
      rafraichir(true);
      break;

    case 'change-paire':
      changeVers = el.dataset.k;
      rendreModale();
      break;

    case 'change-qte':
      changeQte = Number(el.dataset.q);
      rendreModale();
      break;

    case 'change-faire': {
      const col = colonieDe(S.world, G().regionId);
      const [de, vers] = (changeVers || '>').split('>');
      const dispo = ((S.player && S.player.bourse) || {})[de] || 0;
      const r = ACTIONS.changer(col && col.id, de, vers, Math.min(changeQte, dispo));
      toast(r.ok
        ? `${n(r.sorti, 2)} ${symboleDe(S.world, de)} → ${n(r.recu, 2)} ${symboleDe(S.world, vers)}`
        : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'coffre-louer': {
      const col = colonieDe(S.world, G().regionId);
      const r = ACTIONS.louerCoffre(col && col.id);
      toast(r.ok ? 'Coffre loué.' : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'coffre-acheter': {
      const col = colonieDe(S.world, G().regionId);
      const r = ACTIONS.acheterCoffre(col && col.id);
      toast(r.ok ? 'Le coffre est à vous.' : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'coffre-deposer':
    case 'coffre-retirer': {
      const col = colonieDe(S.world, G().regionId);
      const depose = el.dataset.a === 'coffre-deposer';
      const r = ACTIONS.coffre(col && col.id, el.dataset.k, depose, qteTransfert);
      if (!r.ok) toast(r.motif, true);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'peser': {
      // On ne pèse que sur demande : sérialiser deux mégaoctets par morceau
      // n'est pas une chose qu'on inflige à chaque ouverture de panneau.
      const gros = [];
      const p = (o) => { try { return JSON.stringify(o).length; } catch (err) { return 0; } };
      const creuser = (o, prefixe, prof) => {
        if (!o || typeof o !== 'object' || prof === 0) return;
        for (const k of Object.keys(o)) {
          const t = p(o[k]);
          if (t > 40000) { gros.push([`${prefixe}${k}`, t]); creuser(o[k], `${prefixe}${k}.`, prof - 1); }
        }
      };
      creuser(S, '', 3);
      pesee = gros.sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([k, t]) => `${k} ${Math.round(t / 1024)} Ko`).join(' · ') || 'rien de gros';
      rendreModale();
      break;
    }

    case 'allege': {
      const r = ACTIONS.reglerAllege(el.dataset.v === '1');
      toast(r.allege ? 'Écran allégé.' : 'Tous les effets sont rendus.');
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'temps-hors-ligne': {
      const r = ACTIONS.reglerRattrapage(el.dataset.v === '1');
      toast(r.rattrapage ? 'Le monde tournera sans vous.' : 'Le monde vous attendra.');
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'corps-tous': {
      const r = ACTIONS.disposerCorpsTous(el.dataset.k);
      toast(r.ok
        ? `${r.faits} réglé${r.faits >= 2 ? 's' : ''}.${r.rates ? ` ${r.rates} pas pu : ${r.motif}` : ''}`
        : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'captif-tous': {
      const r = ACTIONS.disposerPrisonniersTous(el.dataset.k);
      toast(r.ok
        ? `${r.faits} réglé${r.faits >= 2 ? 's' : ''}.${r.rates ? ` ${r.rates} pas pu : ${r.motif}` : ''}`
        : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'corps': {
      const r = ACTIONS.disposerCorps(el.dataset.c, el.dataset.k);
      toast(r.ok
        ? (r.prix ? `${r.prix} ${sym()}.` : r.rations ? `${r.rations} rations.`
          : r.biomasse ? `${r.biomasse} de biomasse.` : 'C’est fait.')
        : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'tous-suivent': {
      let n = 0;
      for (const c of G().membres) if (c.tache) { delete c.tache; n++; }
      toast(n ? `${n} personne${n >= 2 ? 's reprennent' : ' reprend'} l’ordre du groupe.` : 'Personne n’avait de tâche à soi.');
      rafraichir(true);
      break;
    }

    case 'qte-marche':
      qteMarche = Number(el.dataset.q);
      rendreModale();
      break;

    case 'acheter': {
      const col = colonieDe(S.world, G().regionId);
      const r = acheter(S, col, el.dataset.k, Number(el.dataset.q));
      toast(r.ok ? `${r.qte} acheté${r.qte >= 2 ? 's' : ''} pour ${r.cout} ${sym()}.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'vendre': {
      const col = colonieDe(S.world, G().regionId);
      const r = vendre(S, col, el.dataset.k, Number(el.dataset.q));
      toast(r.ok ? `${r.qte} vendu${r.qte >= 2 ? 's' : ''} pour ${r.gain} ${sym()}.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'qte-transfert':
      qteTransfert = Number(el.dataset.q);
      rendreModale();
      break;

    case 'deposer': {
      const k = el.dataset.k;
      const r = deposer(S, k, Math.min(qteTransfert, G().inventaire[k] || 0));
      if (!r.ok) toast(r.motif, true);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'retirer': {
      const k = el.dataset.k;
      const libre = capacitePortage(S, G()) - poidsInventaire(G().inventaire);
      const tient = Math.floor(libre / Math.max(0.01, COMMODITIES[k].poids));
      const r = retirer(S, k, Math.min(qteTransfert, tient), tient);
      if (!r.ok) toast(r.motif, true);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'equiper': {
      const c = G().membres.find((x) => x.id === el.dataset.c);
      const i = Number(el.dataset.i);
      const key = G().objets[i];
      if (!c || !key) break;
      const it = ITEMS[key];
      if (it.type === 'greffe' && niveauRech(S.base, 'cybernetique') < 1) {
        toast('Cybernétique non recherchée.', true);
        break;
      }
      G().objets.splice(i, 1);
      if (it.type === 'greffe') {
        const ancien = c.equip.greffes[it.membre];
        if (ancien) G().objets.push(ancien);
        c.equip.greffes[it.membre] = key;
      } else {
        const slot = it.type === 'arme' ? 'arme' : 'armure';
        const ancien = c.equip[slot];
        if (ancien) G().objets.push(ancien);
        c.equip[slot] = key;
      }
      toast(`${it.nom} équipé.`);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'inscrire': {
      const col = colonieDe(S.world, G().regionId);
      const c = G().membres.find((x) => x.id === el.dataset.c);
      const r = inscrire(S, col, c, el.dataset.k, logger());
      if (!r.ok) toast(r.motif, true);
      else toast(`${c.nom} entre à l’école.`);
      ACTIONS.sauver();
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'poste': {
      const k = el.dataset.k;
      const actuel = voulus(S.base, k);
      const cible = el.dataset.n === 'max'
        ? placesMetier(S.base, k)
        : el.dataset.n === '0' ? 0 : actuel + Number(el.dataset.n);
      const r = affecter(S, k, cible);
      if (!r.ok) toast(r.motif, true);
      else if (r.reprise) toast('Vous prenez la main : les habitants ne se placent plus seuls.');
      ACTIONS.sauver();
      rafraichir(true);
      break;
    }

    case 'apprendre-maison': {
      const c = groupes(S).flatMap((g) => g.membres).find((x) => x.id === el.dataset.c);
      const r = enseignerChezSoi(S, c, el.dataset.k, logger());
      if (!r.ok) toast(r.motif, true);
      else toast(`${r.instructeur} forme ${c.nom}.`);
      ACTIONS.sauver();
      rafraichir(true);
      break;
    }

    case 'abandonner-formation': {
      const c = groupes(S).flatMap((g) => g.membres).find((x) => x.id === el.dataset.c);
      if (c) abandonnerFormation(c, S);
      ACTIONS.sauver();
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'entrainer': {
      const skill = el.dataset.k;
      if (el.dataset.c) {
        // Entraînement personnel : le reste du groupe garde son ordre.
        const r = ACTIONS.assignerTache(el.dataset.c, { type: 'entrainement', skill });
        if (!r.ok) toast(r.motif, true);
        else toast(`Entraînement personnel : ${SKILLS[skill]}.`);
      } else {
        donnerOrdre(S, { type: 'entrainement', skill });
        toast(`Entraînement du groupe : ${SKILLS[skill]}.`);
      }
      modale = null;
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'acheter-bete': {
      const r = ACTIONS.acheterBete(el.dataset.k);
      toast(r.ok ? `${r.bete.nom} rejoint le convoi.` : r.motif, !r.ok);
      rendreModale();
      break;
    }

    case 'vendre-bete': {
      const r = ACTIONS.vendreBete(el.dataset.b);
      toast(r.ok ? `Cédée pour ${r.prix} ${sym()}.` : r.motif, !r.ok);
      rendreModale();
      break;
    }

    // Exercer une prérogative. Pas de « peut-être » : ça part, ou ça ne part
    // pas parce qu'on n'en a pas le droit — et alors on dit lequel.
    case 'couronne': {
      const r = el.dataset.k === 'oui' ? ACTIONS.accepterCouronne() : ACTIONS.refuserCouronne();
      toast(r.ok
        ? (el.dataset.k === 'oui' ? 'La maison porte votre nom.' : 'La vie continue.')
        : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'ordonner': {
      const f = el.dataset.f;
      const cible = el.dataset.k;
      let r;
      switch (el.dataset.r) {
        case 'envoyer': r = ACTIONS.envoyerColonne(f, cible, el.dataset.b); break;
        case 'rappeler': r = ACTIONS.rappelerColonne(f, cible); break;
        case 'place': r = ACTIONS.designerPlace(f, cible); break;
        case 'garnison': r = ACTIONS.garnison(f); break;
        case 'grenier': r = ACTIONS.grenier(f); break;
        case 'loi': r = ACTIONS.fixerLoi(f, cible); break;
        case 'crediter': r = ACTIONS.accorderCredit(f, cible, Number(el.dataset.b)); break;
        case 'emettre': r = ACTIONS.battreMonnaie(f, Number(cible)); break;
        case 'lever': r = ACTIONS.leverColonne(f, null, cible, Number(el.dataset.b) || undefined); break;
        case 'fonder': r = ACTIONS.fonderPoste(f, cible); break;
        case 'guerre': {
          const b = el.dataset.b || '';
          const but = b
            ? (b.startsWith('conquete:')
              ? { type: 'conquete', villeId: b.slice('conquete:'.length) }
              : { type: b })
            : undefined;
          r = ACTIONS.declarerGuerre(f, cible, but);
          break;
        }
        case 'paix': r = ACTIONS.signerPaix(f, cible); break;
        case 'bourse': r = ACTIONS.ouvrirBourse(f); break;
        case 'accord': r = ACTIONS.signerAccord(f, cible); break;
        case 'rompre': r = ACTIONS.rompreAccord(f, cible); break;
        default: r = { ok: false, motif: 'Ordre inconnu.' };
      }
      toast(r.ok ? 'C’est fait. On exécute.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'captif': {
      const r = ACTIONS.disposerPrisonnier(el.dataset.c, el.dataset.k);
      toast(r.ok
        ? (r.prix ? `C’est réglé. ${r.prix} ${sym()}.` : 'C’est réglé.')
        : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'rattacher': {
      const r = ACTIONS.rattacher(el.dataset.k);
      toast(r.ok ? 'La ville a changé de drapeau.' : r.motif, !r.ok);
      break;
    }

    case 'independance': {
      const r = ACTIONS.independance();
      toast(r.ok ? 'On reprend son drapeau. Ils s’en souviendront.' : r.motif, !r.ok);
      break;
    }

    case 'reconnaitre': {
      const r = ACTIONS.reconnaitre();
      toast(r.ok ? 'On vous écrit sur les cartes.' : r.motif, !r.ok);
      break;
    }

    case 'commerce': {
      ACTIONS.commerce();
      break;
    }

    case 'autoemploi': {
      ACTIONS.autoEmploi();
      break;
    }

    case 'enregistrer-emp': {
      // Le nom se lit dans le champ de la modale, pas dans un `prompt` : dans
      // une page en bac à sable — c'est le cas d'un Artifact — le navigateur
      // ignore purement et simplement l'appel, rend `null`, et le bouton ne
      // fait rien. Sans message, sans erreur, sans rien.
      const champ = $('#nom-sauvegarde');
      const r = ACTIONS.enregistrer(champ ? champ.value : '');
      if (!r.ok) { messageSauvegardes = r.motif; } else { messageSauvegardes = null; }
      if (champ) champ.value = '';
      rafraichir(true);
      break;
    }

    case 'ecraser-emp':
    case 'suppr-emp':
    case 'charger-emp': {
      // Deux temps au lieu d'un `confirm` : le premier clic arme, le second
      // fait. Même raison — `confirm` rend `false` dans une page en bac à
      // sable, donc « Charger » et « Supprimer » ne faisaient rien du tout.
      const cle = `${a}:${el.dataset.k}`;
      if (arme !== cle) {
        arme = cle;
        rafraichir(true);
        break;
      }
      arme = null;
      if (a === 'suppr-emp') {
        ACTIONS.supprimerEmplacement(el.dataset.k);
      } else if (a === 'ecraser-emp') {
        const dej = ACTIONS.emplacements().find((x) => x.id === el.dataset.k);
        const r = ACTIONS.enregistrer(dej ? dej.nom : '', el.dataset.k);
        messageSauvegardes = r.ok ? null : r.motif;
      } else {
        const r = ACTIONS.chargerEmplacement(el.dataset.k);
        if (!r.ok) { messageSauvegardes = r.motif; break; }
        fermerModale();
        break;
      }
      rafraichir(true);
      break;
    }

    case 'exporter-partie': {
      // On tente le téléchargement — il marche en page pleine — et l'on affiche
      // de toute façon le texte de la partie : dans un bac à sable, le clic sur
      // un lien de téléchargement est ignoré comme le reste.
      const r = ACTIONS.exporter();
      texteExport = ACTIONS.texteExport();
      messageSauvegardes = r.ok
        ? 'Fichier téléchargé. S’il ne l’a pas été, le texte ci-dessous est la partie entière : sélectionnez-le et copiez-le.'
        : 'Le navigateur a refusé le téléchargement. Le texte ci-dessous est la partie entière : sélectionnez-le et copiez-le.';
      rafraichir(true);
      break;
    }

    case 'coller-partie': {
      const zone = $('#texte-partie');
      const txt = zone ? zone.value.trim() : '';
      if (!txt) { messageSauvegardes = 'Collez d’abord le texte d’une partie.'; rafraichir(true); break; }
      const r = ACTIONS.importer(txt);
      if (!r.ok) { messageSauvegardes = r.motif; rafraichir(true); break; }
      texteExport = null;
      messageSauvegardes = null;
      fermerModale();
      break;
    }

    case 'zone-partie': {
      texteExport = texteExport === null ? '' : null;
      messageSauvegardes = null;
      rafraichir(true);
      break;
    }

    case 'importer-partie': {
      // Un `<input type=file>` créé à la volée : pas de champ caché à maintenir
      // dans le squelette, et la lecture reste dans la même fonction. Le
      // sélecteur de fichier peut lui aussi être refusé en bac à sable — d'où
      // la zone de texte, qui elle marche partout.
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const fr = new FileReader();
        fr.onload = () => {
          const r = ACTIONS.importer(String(fr.result));
          if (!r.ok) { messageSauvegardes = r.motif; rafraichir(true); return; }
          fermerModale();
        };
        fr.onerror = () => { messageSauvegardes = 'Fichier illisible.'; rafraichir(true); };
        fr.readAsText(f);
      });
      inp.click();
      break;
    }

    case 'recette': {
      const r = ACTIONS.reglerRecette(el.dataset.k, el.dataset.r);
      if (!r.ok) messageSauvegardes = r.motif;
      rafraichir(true);
      break;
    }

    case 'plier':
      basculerRepli(el.dataset.k);
      rafraichir(true);
      break;

    case 'reserve': {
      const r = ACTIONS.reglerReserve(el.dataset.k, Number(el.dataset.n));
      if (!r.ok) messageSauvegardes = r.motif;
      rafraichir(true);
      break;
    }

    // --- Le comptoir. Tout ce qui suit ne fait que remplir le bon de commande ;
    // seul `passer-ordre` touche à la partie.
    case 'comptoir-reseau':
      ACTIONS.choisirComptoir(el.dataset.r);
      messageComptoir = null;
      rafraichir(true);
      break;

    case 'ordre-sens':
      ordreSens = el.dataset.r;
      messageComptoir = null;
      rafraichir(true);
      break;

    case 'ordre-k':
      ordreKey = el.dataset.k;
      messageComptoir = null;
      rafraichir(true);
      break;

    case 'ordre-q':
      ordreQte = Number(el.dataset.q);
      messageComptoir = null;
      rafraichir(true);
      break;

    case 'ordre-escorte':
      ordreEscorte = el.dataset.r;
      messageComptoir = null;
      rafraichir(true);
      break;

    case 'ordre-escouade':
      ordreEscouade = !ordreEscouade;
      rafraichir(true);
      break;

    case 'passer-ordre': {
      const g = G();
      const r = ACTIONS.passerOrdre(ordreSens, ordreKey, ordreQte, ordreEscorte,
        ordreEscouade && g ? g.id : null);
      messageComptoir = r.ok
        ? { ok: true, texte: `Le convoi part de ${r.place.nom}.` }
        : { ok: false, texte: r.motif };
      rafraichir(true);
      break;
    }

    case 'terraformer': {
      // La chaîne vide vaut « rien » : une station sans cible ne travaille pas,
      // et c'est un choix qu'on doit pouvoir faire — le carburant sert ailleurs.
      S.base.terraforme = el.dataset.k || null;
      ACTIONS.sauver();
      rafraichir(true);
      break;
    }

    case 'tactique': {
      // La consigne vaut pour la colonne affichée (PROMESSES.md, P2).
      ACTIONS.tactique(el.dataset.k, G().id);
      break;
    }

    case 'intendance': {
      const r = ACTIONS.toucherRations();
      toast(r.ok ? `${r.quantite} rations touchées.` : r.motif, !r.ok);
      break;
    }

    case 'honorer': {
      const r = ACTIONS.honorer(el.dataset.c, el.dataset.n);
      toast(r.ok ? 'Il vous doit quelque chose, maintenant.' : r.motif, !r.ok);
      rendreModale();
      break;
    }

    case 'recruter': {
      const r = ACTIONS.recruter(el.dataset.i,
        { epoque: Number(el.dataset.ep), agitation: Number(el.dataset.ag) });
      toast(r.ok ? `${r.perso.nom} rejoint l’escouade.` : r.motif, !r.ok);
      rendreModale();
      break;
    }

    case 'choisir-depart': {
      departChoisi = el.dataset.k;
      // On garde la graine déjà tapée : changer d'avis sur le scénario ne doit
      // pas effacer le monde qu'on avait choisi.
      const champ = document.getElementById('graine');
      const graine = champ ? champ.value : '';
      rendreAccueil(derniereSauvegarde, dernierePerimee);
      const apres = document.getElementById('graine');
      if (apres) apres.value = graine;
      break;
    }

    case 'nouvelle': {
      const champ = document.getElementById('graine');
      ACTIONS.nouvelle(champ ? champ.value.trim() : '', departChoisi);
      break;
    }

    case 'continuer':
      ACTIONS.continuer();
      break;

    case 'effacer':
      if (arme !== 'effacer') { arme = 'effacer'; rendreAccueil(derniereSauvegarde, dernierePerimee); break; }
      arme = null;
      ACTIONS.effacer();
      break;

    default:
      break;
  }

  // Un clic change l'état : on le grave tout de suite plutôt que d'attendre
  // la sauvegarde automatique, qui peut arriver après la fermeture de l'onglet.
  if (S && ACTIONS.sauver) ACTIONS.sauver();
}

export function ouvrirOnglet(k) {
  // Ouvrir un écran, c'est le vouloir neuf : la carte se redessine, même si le
  // monde n'a pas bougé d'une heure. (Sans ça, rouvrir l'onglet CARTE laissait
  // le dessin d'avant — attrapé par la suite : « la carte écrit le nom des
  // villes relevées », zéro texte peint.)
  derniereSignatureCarte = '';
  dernierVifCarte = '';
  onglet = k;
}
