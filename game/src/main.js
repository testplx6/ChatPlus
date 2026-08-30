// Amorçage : charge ou crée la partie, fait tourner l'horloge réelle,
// sauvegarde régulièrement. Le seul module avec des effets de bord temporels.

import { nouvellePartie, rattraper, rattrapageEtale, TICK_MS } from './sim.js';
import {
  charger, sauvegarder, sauvegarderAilleurs, effacer, existeSauvegarde, sauvegardePerimee,
  listerEmplacements, enregistrerEmplacement, chargerEmplacement,
  supprimerEmplacement, renommerEmplacement, poidsEmplacements,
  serialiser, importerTexte, nomFichier, resumeSauvegarde,
  emballer, lireTexteSauvegarde,
} from './save.js';
import { monterUI, rafraichir, attacherEtat, rendreAccueil, ouvrirOnglet } from './ui.js';
import { Rng, seedFromString } from './rng.js';
import { makeCharacter, estVivant } from './characters.js';
import { creerLogger, fouillerSite, combatContre } from './events.js';
import {
  attaquerCaravane, passerOrdre, ordresEnCours, ESCORTES,
} from './caravanes.js';
import { attaquerVille } from './assaut.js';
import { peutTraiter, comptoirsPossibles, comptoirActif, chiffrerOrdre } from './bourse.js';
import { sEngager, quitter, toucherRations as toucherRationsA } from './allegeance.js';
import { genererBande, TACTIQUES } from './combat.js';
import { groupeActif, tousLesMembres, scinder, fusionner, choisirGroupe, assignerTache } from './groupes.js';
import {
  reconnaitreAvantPoste, peutReconnaitre, rattacherVille,
  declarerIndependance, reglerRecette, reglerReserve,
  negocierSiege, sortieContreSiege, evacuerCamp,
} from './base.js';
import { verifierExercice } from './squad.js';
import { honorer as honorerService } from './services.js';
import { acheterBete, vendreBete } from './betes.js';
import { disposerCorps, disposerCorpsTous } from './depouilles.js';
import { changer as changerA } from './economy.js';
import {
  louerCoffre as louerCoffreA, acheterCoffre as acheterCoffreA,
  deposerAuCoffre, retirerDuCoffre,
} from './coffres.js';
import { engager } from './recrues.js';
import {
  envoyerColonne as envoyerColonneA, leverColonne as leverColonneA,
  rappelerColonne as rappelerColonneA, designerPlace as designerPlaceA,
  accepterCouronne as accepterCouronneA, refuserCouronne as refuserCouronneA,
  fonderPoste as fonderPosteA, declarerGuerreA, signerPaixAvec,
  renforcerGarnison, ouvrirGreniers, fixerLoi as fixerLoiA,
  accorderCredit as accorderCreditA, battreMonnaie as battreMonnaieA,
  ouvrirBourseA, signerAccordAvec, rompreAccordAvec,
} from './influence.js';
import { disposer, disposerTous } from './justice.js';

let state = null;
let boucle = null;
let sauvegardeTimer = null;
/** Vrai pendant l'écran de rattrapage : l'horloge normale ne doit pas s'en mêler. */
let rattrapageEnCours = false;
/** L'écriture différée en attente, s'il y en a une. */
let ecritureDemandee = null;
/** Vrai si l'écriture en attente est accrochée à un temps mort du navigateur. */
let ecritureParRepos = false;
/** Quelque chose a changé depuis la dernière écriture. */
let aEcrire = false;
/** L'heure de jeu de la dernière écriture : au-delà, le monde a bougé. */
let dernierTempsEcrit = -1;
/**
 * Le souffle qu'on laisse au doigt avant d'écrire. Assez court pour qu'une
 * fermeture d'onglet juste après un clic soit rattrapée par `pagehide` ; assez
 * long pour que dix actions d'affilée ne fassent qu'une écriture.
 */
const DELAI_ECRITURE_MS = 300;

// ---------------------------------------------------------------------------
// Boucle temps réel
// ---------------------------------------------------------------------------

function demarrerBoucle() {
  arreterBoucle();
  boucle = setInterval(() => {
    // Pas de `state.fin` ici : la fin est un état du récit, pas un frein —
    // « le temps devrait continuer même quand tout le monde est mort ». Le
    // moteur avait appris la règle, mais cette porte-ci gardait l'écran figé.
    if (!state || rattrapageEnCours) return;
    // Un grand moment plein écran (stèle, chapitre) confisque l'entrée : tant
    // qu'il est ouvert, l'horloge cesse de consommer le monde. Sinon, à ×60,
    // le temps de lire une stèle et le suivant était déjà tombé — « on est
    // obligé de voir défiler tous les écrans de mort à la suite sans rien
    // pouvoir faire » (le propriétaire). On brûle le réel écoulé (dernierReel
    // suit) pour que la fermeture ne rejoue pas l'attente en rafale. La règle
    // du temps n'est pas touchée : le monde ne se suspend que le temps où le
    // joueur n'a pas les mains.
    if (document.getElementById('moment')) {
      state.dernierReel = Date.now();
      return;
    }
    const r = rattraper(state, Date.now());
    if (r.ticks > 0) rafraichir();
  }, 400);
  sauvegardeTimer = setInterval(() => {
    // Le monde avance tout seul : il y a presque toujours de quoi écrire, mais
    // une partie à l'arrêt (moment ouvert, onglet immobile) n'a rien à dire.
    if (aEcrire || (state && state.temps !== dernierTempsEcrit)) ecrireMaintenant();
  }, 5000);
}

function arreterBoucle() {
  if (boucle) clearInterval(boucle);
  if (sauvegardeTimer) clearInterval(sauvegardeTimer);
  boucle = null;
  sauvegardeTimer = null;
}

/**
 * L'état de la dernière écriture. Hors de l'état de jeu : ça décrit le
 * navigateur, pas la partie.
 *
 * Une sauvegarde qui échoue le faisait en silence — `sauvegarder` rend pourtant
 * un motif depuis toujours, et personne ne le lisait. Un joueur pouvait donc
 * jouer des heures sur un stockage refusé, fermer l'onglet, et tout perdre sans
 * avoir vu passer le moindre signe. C'est la pire panne possible : celle qui ne
 * se manifeste qu'au moment où il est trop tard.
 */
export const ETAT_SAUVEGARDE = { ok: true, motif: null, quand: 0, taille: 0, echecs: 0 };

/** Prendre acte de ce qu'une écriture a donné. */
function noterEcriture(r) {
  ETAT_SAUVEGARDE.ok = !!r.ok;
  ETAT_SAUVEGARDE.motif = r.ok ? null : (r.motif || 'Écriture refusée.');
  if (r.ok) {
    ETAT_SAUVEGARDE.quand = Date.now();
    ETAT_SAUVEGARDE.echecs = 0;
    ETAT_SAUVEGARDE.taille = r.taille || ETAT_SAUVEGARDE.taille;
  } else {
    ETAT_SAUVEGARDE.echecs += 1;
  }
}

function oublierAttente() {
  if (ecritureDemandee === null) return;
  if (ecritureParRepos && typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(ecritureDemandee);
  } else clearTimeout(ecritureDemandee);
  ecritureDemandee = null;
}

/**
 * L'écriture ordinaire : la sérialisation reste ici, la compression part dans
 * un fil de côté. Le fil du jeu ne gèle plus.
 */
function ecrireMaintenant() {
  oublierAttente();
  if (!state) return;
  aEcrire = false;
  dernierTempsEcrit = state.temps;
  sauvegarderAilleurs(state, noterEcriture);
}

/**
 * L'écriture qu'on ne peut pas différer : fermeture d'onglet, passage en
 * arrière-plan, export. Tout se fait ici, fil principal compris — c'est le
 * prix à payer une fois, pour ne rien perdre.
 */
function ecrireSurPlace() {
  oublierAttente();
  if (!state) return;
  aEcrire = false;
  dernierTempsEcrit = state.temps;
  noterEcriture(sauvegarder(state));
}

/**
 * Demander que la partie soit écrite. Le geste du joueur ne la paie pas :
 * l'écriture est différée d'un souffle et regroupée — « ça rame beaucoup, les
 * boutons ne réagissent plus aussitôt comme avant » (le propriétaire, août
 * 2026), après que la compression eut ajouté son coût à CHAQUE action.
 *
 * Rien n'est perdu pour autant : la minuterie des cinq secondes, la mise en
 * arrière-plan et la fermeture de l'onglet écrivent, elles, sur-le-champ.
 */
function sauver() {
  // Un simple drapeau, et rien d'autre. Même différée d'un souffle, l'écriture
  // ramenait `JSON.stringify` de la partie entière — 437 000 caractères, mesuré
  // à 150 ms par clic sur un processeur de téléphone — dans le geste du joueur.
  // La minuterie des cinq secondes s'en charge, et les moments où l'on n'a plus
  // le temps (fermeture, arrière-plan, export) écrivent sur place.
  aEcrire = true;
}

// ---------------------------------------------------------------------------
// Actions exposées à l'interface
// ---------------------------------------------------------------------------

const API = {
  sauver,

  nouvelle(graineTexte, depart) {
    let graine;
    if (!graineTexte) graine = (Math.random() * 4294967296) >>> 0;
    else if (/^\d+$/.test(graineTexte)) graine = Number(graineTexte) >>> 0;
    else graine = seedFromString(graineTexte);

    state = nouvellePartie(graine, { maintenant: Date.now(), depart });
    attacherEtat(state);
    ouvrirOnglet('carte');
    sauver();
    demarrerBoucle();
    rafraichir(true);
  },

  continuer() {
    const s = charger();
    if (!s) { rendreAccueil(false, sauvegardePerimee()); return; }
    lancer(s);
  },

  // --- Emplacements de sauvegarde. La partie en cours continue de s'écrire
  // toutes les cinq secondes sous sa propre clé ; ce sont des copies prises
  // exprès, à côté, qu'on nomme et qu'on relit quand on veut.
  etatSauvegarde: () => ETAT_SAUVEGARDE,
  emplacements: () => listerEmplacements(),
  poidsSauvegardes: () => poidsEmplacements(),

  enregistrer(nom, id) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    // On écrit d'abord la partie en cours : un emplacement pris juste après une
    // action doit contenir cette action, pas l'état d'il y a quatre secondes.
    sauver();
    return enregistrerEmplacement(state, nom, id);
  },

  chargerEmplacement(id) {
    const s = chargerEmplacement(id);
    if (!s) return { ok: false, motif: 'Emplacement illisible.' };
    // On écrase la partie en cours : c'est ce que veut dire « charger », et
    // laisser deux parties vivantes en même temps rendrait la suite incompréhensible.
    lancer(s);
    sauver();
    return { ok: true };
  },

  /** Le plancher qu'aucune chaîne n'entame. */
  reglerReserve(key, qte) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    const r = reglerReserve(state, key, qte);
    if (r.ok) sauver();
    return r;
  },

  /** Ce qu'on demande à une chaîne — y compris de ne rien faire. */
  reglerRecette(batiment, id) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    const r = reglerRecette(state, batiment, id);
    if (r.ok) sauver();
    return r;
  },

  supprimerEmplacement: (id) => supprimerEmplacement(id),
  renommerEmplacement: (id, nom) => renommerEmplacement(id, nom),

  /**
   * Sortir la partie du navigateur.
   *
   * C'est la fonction la plus utile de tout ce panneau pendant qu'on écrit le
   * jeu : un défaut qu'on ne sait pas reproduire est un défaut qu'on ne corrige
   * pas, et un fichier se transmet là où une capture d'écran ne dit rien.
   */
  exporter() {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    ecrireSurPlace();
    try {
      const blob = new Blob([serialiser(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomFichier(state);
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Un objet-URL non révoqué garde la partie entière en mémoire.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { ok: true, nom: a.download };
    } catch (e) {
      return { ok: false, motif: 'Le navigateur a refusé le téléchargement.' };
    }
  },

  /**
   * La partie, en texte, pour la zone de copie.
   *
   * Un téléchargement se fait ignorer sans un mot dans une page isolée ; du
   * texte qu'on sélectionne marche partout, y compris sur un téléphone.
   */
  texteExport() {
    if (!state) return '';
    ecrireSurPlace();
    // Comprimé : c'est ce qui rend le copier-coller possible au téléphone —
    // le texte en clair d'une partie longue ne se laissait plus sélectionner.
    return emballer(serialiser(state));
  },

  /** Relire un fichier, et le poser directement comme partie en cours. */
  importer(txt) {
    const r = importerTexte(txt);
    if (!r.ok) return r;
    lancer(r.state);
    sauver();
    return { ok: true, resume: resumeSauvegarde(r.state) };
  },

  effacer() {
    effacer();
    arreterBoucle();
    state = null;
    attacherEtat(null);
    rendreAccueil(false);
  },

  /** Fouille du site de la région courante : tirage, donc RNG de la partie. */
  fouillerSite() {
    const rng = new Rng(state.rngState);
    const res = fouillerSite(state, rng, creerLogger(state));
    state.rngState = rng.save();
    sauver();
    return res;
  },

  /** Entrer au service d'une faction, et en sortir. */
  sEngager(faction) {
    const r = sEngager(state, faction, creerLogger(state));
    sauver();
    return r;
  },

  quitterService() {
    const r = quitter(state, creerLogger(state));
    sauver();
    return r;
  },

  /** Le bureau de change. Voir economy.js, ECONOMIE §5. */
  changer(colId, de, vers, montant) {
    const col = state.world.colonies.find((c) => c.id === colId);
    const r = changerA(state, col, de, vers, montant);
    sauver();
    return r;
  },

  /** Louer, acheter, remplir et vider un coffre en ville. Voir coffres.js. */
  louerCoffre(colId) {
    const col = state.world.colonies.find((c) => c.id === colId);
    const r = louerCoffreA(state, col, creerLogger(state));
    sauver();
    return r;
  },

  acheterCoffre(colId) {
    const col = state.world.colonies.find((c) => c.id === colId);
    const r = acheterCoffreA(state, col, creerLogger(state));
    sauver();
    return r;
  },

  coffre(colId, key, depose, qte = 9999) {
    const col = state.world.colonies.find((c) => c.id === colId);
    const g = groupeActif(state);
    const r = depose
      ? deposerAuCoffre(state, col, key, qte, g)
      : retirerDuCoffre(state, col, key, qte, g);
    sauver();
    return r;
  },

  /** Ce qu'on fait d'un des siens qui est tombé. Voir depouilles.js. */
  disposerCorps(id, quoi) {
    const r = disposerCorps(state, groupeActif(state), id, quoi, creerLogger(state));
    sauver();
    return r;
  },

  /** La même décision pour tous les corps portés, d'un seul geste. */
  disposerCorpsTous(quoi) {
    const r = disposerCorpsTous(state, groupeActif(state), quoi, creerLogger(state));
    if (r.faits) sauver();
    return r;
  },

  // -------------------------------------------------------------------------
  // Le comptoir
  // -------------------------------------------------------------------------

  /** Tout ce que l'écran du comptoir a besoin de savoir, en un appel. */
  comptoir() {
    if (!state) return null;
    const v = peutTraiter(state);
    return {
      ok: v.ok,
      motif: v.motif || null,
      reseaux: comptoirsPossibles(state),
      actif: comptoirActif(state),
      escortes: ESCORTES,
      ordres: ordresEnCours(state).map((c) => ({
        id: c.id,
        sens: c.sens,
        cargaison: c.cargaison,
        paiement: c.paiement || 0,
        regionId: c.regionId,
        reste: Math.max(0, c.route.length - c.etape),
        escorte: Math.round(c.escorte),
        escorteGroupe: c.escorteGroupe || null,
        depuis: c.depuis,
      })),
    };
  },

  /** Le réseau avec lequel on veut traiter, quand il y en a plusieurs. */
  choisirComptoir(id) {
    if (!state || !state.base) return { ok: false, motif: 'Aucune partie en cours.' };
    if (!comptoirsPossibles(state).some((x) => x.id === id)) {
      return { ok: false, motif: 'Ce réseau ne traite pas avec vous.' };
    }
    state.base.comptoir = id;
    sauver();
    return { ok: true };
  },

  /** Le prix d'un ordre, avant de le passer. */
  chiffrerOrdre(sens, key, qte) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    return chiffrerOrdre(state, sens, key, Number(qte));
  },

  /** Et l'ordre lui-même : le convoi part, avec ce qu'on a payé pour le garder. */
  passerOrdre(sens, key, qte, escorte, groupe) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    const rng = new Rng(state.rngState);
    const r = passerOrdre(
      state, sens, key, Number(qte), escorte, rng, creerLogger(state), groupe || null);
    state.rngState = rng.save();
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Sortir se battre contre la colonne qui assiège le camp (SIEGE.md, S3). */
  sortieSiege() {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    const rng = new Rng(state.rngState);
    const r = sortieContreSiege(state, rng, creerLogger(state), combatContre, genererBande);
    state.rngState = rng.save();
    if (r.ok) sauver();
    return r;
  },

  /** Lever le siège contre crédits — et se faire connaître comme payeur. */
  negocierSiege() {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    const r = negocierSiege(state, creerLogger(state));
    if (r.ok) sauver();
    return r;
  },

  /** Évacuer le camp : perdre la place, pas les gens. */
  evacuerCamp() {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    const r = evacuerCamp(state, creerLogger(state));
    if (r.ok) sauver();
    return r;
  },

  /** Embuscade sur une caravane présente dans la région. */
  attaquerCaravane(id) {
    const car = (state.world.caravanes || []).find((c) => c.id === id);
    if (!car) return { ok: false, motif: 'La caravane est déjà loin.' };
    const rng = new Rng(state.rngState);
    const res = attaquerCaravane(state, car, rng, creerLogger(state), combatContre, genererBande);
    state.rngState = rng.save();
    sauver();
    return res;
  },

  /**
   * Un coup de main sur la ville où l'on se tient. Le moteur vérifie qu'on y
   * est, que ce n'est pas son propre camp, et que la place existe encore.
   */
  attaquerVille(id) {
    const col = state.world.colonies.find((c) => c.id === id);
    if (!col) return { ok: false, motif: 'Cette ville n’est plus là.' };
    const rng = new Rng(state.rngState);
    const res = attaquerVille(state, col, rng, creerLogger(state), combatContre, genererBande);
    state.rngState = rng.save();
    sauver();
    return res;
  },

  /** Engagement d'un mercenaire dans une ville : il rejoint le groupe affiché. */
  /** Engager quelqu'un du banc de la ville où l'on se trouve. */
  recruter(id, vue) {
    const g = groupeActif(state);
    const col = state.world.colonies.find((c) => !c.ruine && c.regionId === g.regionId);
    // L'identifiant est une CHAÎNE (« c7f3… ») : le Number() qui traînait ici
    // était une relique du temps où l'on engageait par rang — il rendait NaN,
    // et chaque clic répondait « cette personne s'est placée ailleurs ».
    const r = engager(state, col, id, creerLogger(state), g, vue);
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Acheter une bête de somme. Tirage : RNG de la partie. */
  acheterBete(key) {
    const g = groupeActif(state);
    const col = state.world.colonies.find((c) => !c.ruine && c.regionId === g.regionId);
    const rng = new Rng(state.rngState);
    const r = acheterBete(state, col, key, rng, creerLogger(state), g);
    state.rngState = rng.save();
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  vendreBete(id) {
    const g = groupeActif(state);
    const col = state.world.colonies.find((c) => !c.ruine && c.regionId === g.regionId);
    const r = vendreBete(state, col, id, creerLogger(state), g);
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  // Prérogatives. Aucune n'a de tirage : on a la charge, ou on ne l'a pas.

  /** Détourner une colonne déjà levée vers la ville de son choix. */
  envoyerColonne(faction, armeeId, cibleId) {
    const r = envoyerColonneA(state, faction, armeeId, cibleId, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Ordonner le retour d'une colonne : route, puis garnison chez soi. */
  rappelerColonne(faction, armeeId) {
    const r = rappelerColonneA(state, faction, armeeId, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Désigner la ville que la maison renforce en priorité (M4). Vide : retirer. */
  designerPlace(faction, colId) {
    const r = designerPlaceA(state, faction, colId || null, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Accepter la couronne (M7) : la maison porte votre nom, le conseil s'efface. */
  accepterCouronne() {
    const r = accepterCouronneA(state, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Refuser la couronne : permis, et la vie continue. */
  refuserCouronne() {
    const r = refuserCouronneA(state, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Lever une colonne sur le trésor de la faction, et la lancer — à la force choisie (M6). */
  leverColonne(faction, depuisId, cibleId, force) {
    const r = leverColonneA(state, faction, depuisId, cibleId, creerLogger(state), force);
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Faire planter un poste sur une case libre. Tirage : RNG de la partie. */
  fonderPoste(faction, regionIndex) {
    const rng = new Rng(state.rngState);
    const r = fonderPosteA(state, faction, Number(regionIndex), rng, creerLogger(state));
    state.rngState = rng.save();
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Déclarer la guerre. Le but est tiré du tempérament du chef. */
  declarerGuerre(faction, contre, but) {
    const rng = new Rng(state.rngState);
    const r = declarerGuerreA(state, faction, contre, rng, creerLogger(state), but);
    state.rngState = rng.save();
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Signer la paix, quoi qu'en pense le conseil. */
  signerPaix(faction, contre) {
    const r = signerPaixAvec(state, faction, contre, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  // -------------------------------------------------------------------------
  // Le commerce, décidé plutôt que subi
  // -------------------------------------------------------------------------

  /** Faire de leurs villes un marché commun. Capitaine. */
  ouvrirBourse(faction) {
    const r = ouvrirBourseA(state, faction, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Brancher leur bourse sur celle d'une autre faction. Commandeur. */
  signerAccord(faction, contre) {
    const r = signerAccordAvec(state, faction, contre, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Et la débrancher, sans attendre une guerre pour ça. */
  rompreAccord(faction, contre) {
    const r = rompreAccordAvec(state, faction, contre, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Relever les murs de la ville dont on répond. */
  garnison(faction) {
    const r = renforcerGarnison(state, faction, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Ouvrir les greniers de la ville dont on répond. */
  grenier(faction) {
    const r = ouvrirGreniers(state, faction, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Promulguer. Le paramètre porte « quoi:valeur » : peine:ferme, impot:lourd… */
  /** Le bandeau de dévaluation est lu : on l'efface, et ça se sauvegarde. */
  alertesVues() {
    state.player.alertesMonnaie = [];
    sauver();
    return { ok: true };
  },

  /** Les prérogatives monétaires : ECONOMIE §6.5, §7.3. */
  accorderCredit(faction, colId, montant) {
    const r = accorderCreditA(state, faction, colId, montant, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  battreMonnaie(faction, montant) {
    const r = battreMonnaieA(state, faction, montant, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  fixerLoi(faction, spec) {
    const [quoi, brut] = String(spec).split(':');
    const valeur = quoi === 'esclavage' ? brut === 'oui' : brut;
    const r = fixerLoiA(state, faction, quoi, valeur, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Décider du sort d'un prisonnier : livrer, rançonner, vendre, enrôler, relâcher. */
  disposerPrisonnier(captifId, quoi) {
    const r = disposer(state, groupeActif(state), captifId, quoi, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** La même décision pour tous les prisonniers, d'un seul geste. */
  disposerPrisonniersTous(quoi) {
    const r = disposerTous(state, groupeActif(state), quoi, creerLogger(state));
    if (r.faits) { sauver(); rafraichir(true); }
    return r;
  },

  /**
   * Ce que le monde fait quand on n'est pas là. En l'allumant, on repart de
   * maintenant : l'absence déjà écoulée ne se rejoue pas d'un coup — on n'a
   * pas demandé ça, on a demandé que ça compte À PARTIR D'ICI.
   */
  reglerRattrapage(actif) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    if (!state.reglages) state.reglages = { rattrapage: false };
    state.reglages.rattrapage = !!actif;
    state.dernierReel = Date.now();
    sauver();
    return { ok: true, rattrapage: state.reglages.rattrapage };
  },

  /** Couper l'agrément de l'écran quand la machine peine. */
  reglerAllege(actif) {
    if (!state) return { ok: false, motif: 'Aucune partie en cours.' };
    if (!state.reglages) state.reglages = { rattrapage: false, allege: false };
    state.reglages.allege = !!actif;
    sauver();
    return { ok: true, allege: state.reglages.allege };
  },

  /** Laisser les habitants se placer eux-mêmes, ou tenir le tableau soi-même. */
  autoEmploi() {
    state.base.autoEmploi = state.base.autoEmploi === false;
    if (state.base.autoEmploi) state.base.majEmploi = -999;
    sauver();
    rafraichir(true);
    return { ok: true };
  },

  /** Se faire écrire sur les cartes. Irréversible, et l'on vous convoitera. */
  reconnaitre() {
    const r = reconnaitreAvantPoste(state, creerLogger(state));
    if (!r) return peutReconnaitre(state);
    sauver();
    rafraichir(true);
    return { ok: true, colonie: r };
  },

  /** Prendre les couleurs de ceux qu'on sert, ou reprendre son drapeau. */
  rattacher(faction) {
    const r = rattacherVille(state, faction, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  independance() {
    const r = declarerIndependance(state, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Ouvrir ou fermer la porte aux colporteurs. */
  commerce() {
    state.base.commerce = state.base.commerce === false;
    sauver();
    rafraichir(true);
    return { ok: true };
  },

  /**
   * Comment on se bat. Vaut aussi pendant votre absence — et par colonne
   * (PROMESSES.md, P2) : avec un groupeId, la consigne est la sienne ; sans,
   * c'est la consigne générale, que suivent les colonnes sans la leur.
   */
  tactique(key, groupeId) {
    if (!TACTIQUES[key]) return { ok: false, motif: 'Tactique inconnue.' };
    const g = groupeId
      ? (state.player.groupes || []).find((x) => x.id === groupeId) : null;
    if (g) g.tactique = key;
    else state.player.tactique = key;
    sauver();
    rafraichir(true);
    return { ok: true };
  },

  /** Toucher ses rations à l'intendance de la ville où l'on se trouve. */
  toucherRations() {
    const g = groupeActif(state);
    const col = state.world.colonies.find(
      (c) => !c.ruine && c.regionId === g.regionId
    );
    const r = toucherRationsA(state, col, creerLogger(state), g);
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  /** Rendre à quelqu'un le service qu'il a demandé, en main propre. */
  honorer(colId, notableId) {
    const r = honorerService(state, colId, notableId, creerLogger(state));
    if (r.ok) { sauver(); rafraichir(true); }
    return r;
  },

  // --- Groupes -------------------------------------------------------------

  choisirGroupe(id) {
    choisirGroupe(state, id);
    rafraichir(true);
  },

  /** Détache des membres dans un nouveau groupe. Tirage : RNG de la partie. */
  scinder(ids) {
    const rng = new Rng(state.rngState);
    const r = scinder(state, groupeActif(state), ids, rng);
    state.rngState = rng.save();
    if (r.ok) {
      creerLogger(state)({
        type: 'groupe',
        texte: `${r.groupe.nom} se détache : ${r.groupe.membres.map((c) => c.nom).join(', ')}.`,
        important: true,
        regionId: r.groupe.regionId,
        groupe: r.groupe.id,
      });
      sauver();
    }
    return r;
  },

  fusionner(idAutre) {
    const a = groupeActif(state);
    const b = (state.player.groupes || []).find((x) => x.id === idAutre);
    if (!b) return { ok: false, motif: 'Groupe introuvable.' };
    const nomB = b.nom;
    const r = fusionner(state, a, b);
    if (r.ok) {
      creerLogger(state)({
        type: 'groupe',
        texte: `${nomB} rejoint ${a.nom}.`,
        important: true,
        regionId: a.regionId,
        groupe: a.id,
      });
      sauver();
    }
    return r;
  },

  /** Tâche personnelle d'un membre. `null` le remet sous l'ordre du groupe. */
  assignerTache(idPerso, tache) {
    const c = tousLesMembres(state).find((x) => x.id === idPerso);
    if (!c) return { ok: false, motif: 'Introuvable.' };
    const r = assignerTache(state, c, tache, verifierExercice);
    if (r.ok) sauver();
    return r;
  },
};

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

/**
 * Au-delà de ce nombre d'heures à rejouer, on passe par l'écran de rattrapage
 * plutôt que de bloquer le fil d'exécution. En dessous, c'est instantané et un
 * écran ne ferait que clignoter.
 */
const RATTRAPAGE_ECRAN = 800;
/** Budget par tranche : sous les 16 ms d'une image, la barre reste fluide. */
/**
 * Travail visé par image pendant le rattrapage. Douze millisecondes visaient
 * soixante images par seconde, ce qui est le bon réflexe pour une animation —
 * et le mauvais ici. Un rattrapage n'anime rien : il affiche une barre qui
 * avance. Ce qui compte, c'est que la page réponde au doigt, pas qu'elle
 * redessine soixante fois par seconde.
 *
 * Et surtout : le nombre d'images nécessaires ne dépend pas de la machine, mais
 * `requestAnimationFrame` si. Un onglet en arrière-plan, un téléphone qui
 * économise, un navigateur sans compositeur — et les images tombent à quatre par
 * seconde. Depuis que la carte compte 432 secteurs et 86 villes, dix-sept mille
 * heures demandaient cent soixante-dix images : deux secondes et demie sur un
 * écran actif, trois quarts de minute sur un onglet endormi.
 */
const BUDGET_TRANCHE_MS = 30;

/**
 * Rejoue le temps dû, puis appelle `apres`. Court, c'est immédiat ; long, ça
 * passe par l'écran de rattrapage et `apres` n'est appelé qu'à la fin.
 */
function reprendreLeTemps(apres) {
  if (rattrapageEnCours) return;
  const r = rattrapageEtale(state, Date.now());
  const fin = () => { rattrapageEnCours = false; apres(r); };
  if (r.total === 0) { fin(); return; }
  if (r.total <= RATTRAPAGE_ECRAN) { r.pas(r.total); fin(); return; }
  rattrapageEnCours = true;
  ecranRattrapage(r, fin);
}

function lancer(s) {
  state = s;
  attacherEtat(state);
  const avant = state.temps;
  reprendreLeTemps((r) => {
    demarrerBoucle();
    rafraichir(true);
    sauver();
    // Le toast d'absence disait ce que l'écran de rattrapage venait de dire,
    // par-dessus lui (ALLURE.md, Q2) : le rapport suffit.
  });
}

/**
 * Rejoue le temps passé par tranches, entre deux images, avec une barre qui
 * avance. La taille de tranche s'ajuste à ce que la machine encaisse : un
 * téléphone de 2018 en fait moins qu'un ordinateur de bureau, et c'est très
 * bien — dans les deux cas la page répond.
 */
function ecranRattrapage(r, fini) {
  const el = document.createElement('div');
  el.className = 'rattrapage';
  el.innerHTML =
    '<div class="rattrapage-b">' +
    '<div class="rattrapage-t">Le monde a continué sans vous</div>' +
    '<div class="rattrapage-j"></div>' +
    '<div class="rattrapage-p"><i></i></div>' +
    '</div>';
  document.body.appendChild(el);
  const jauge = el.querySelector('.rattrapage-j');
  const barre = el.querySelector('.rattrapage-p i');
  const total = r.total;

  let tranche = 100;
  const image = () => {
    const t0 = performance.now();
    const encore = r.pas(tranche);
    const dt = performance.now() - t0;
    // Recalage doux vers le budget, borné pour ne pas osciller.
    if (dt > 0.5) tranche = Math.max(25, Math.min(6000, Math.round(tranche * (BUDGET_TRANCHE_MS / dt))));

    const faits = r.faits();
    jauge.textContent = `${Math.round(faits / 24)} / ${Math.round(total / 24)} jours rejoués`;
    barre.style.width = `${Math.min(100, (faits / total) * 100).toFixed(1)}%`;

    if (encore) { requestAnimationFrame(image); return; }
    el.remove();
    fini();
  };
  requestAnimationFrame(image);
}

monterUI(API);

// Le harnais de test lit la sauvegarde sans connaître son emballage : ce
// crochet rend toujours le texte en clair, comprimée ou non. Ce n'est pas une
// API de jeu — c'est une fenêtre d'atelier, comme `__momentsAuto`.
if (typeof window !== 'undefined') {
  window.__sauvegardeTexte = (cle) => {
    ecrireSurPlace();
    return lireTexteSauvegarde(cle);
  };
}

const sauvegarde = charger();
if (sauvegarde) {
  rendreAccueil(true);
} else {
  rendreAccueil(existeSauvegarde() && !sauvegardePerimee(), sauvegardePerimee());
}

// Ne jamais perdre une session parce que l'onglet est passé en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') ecrireSurPlace();
  else if (state) {
    // Un onglet laissé de côté toute la nuit doit autant de temps qu'une
    // session rouverte : même chemin, même écran de rattrapage.
    reprendreLeTemps((r) => { if (r.total) { rafraichir(true); sauver(); } });
  }
});
window.addEventListener('pagehide', ecrireSurPlace);
window.addEventListener('beforeunload', ecrireSurPlace);
