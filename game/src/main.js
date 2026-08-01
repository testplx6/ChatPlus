// Amorçage : charge ou crée la partie, fait tourner l'horloge réelle,
// sauvegarde régulièrement. Le seul module avec des effets de bord temporels.

import { nouvellePartie, rattraper, rattrapageEtale, TICK_MS } from './sim.js';
import { charger, sauvegarder, effacer, existeSauvegarde, sauvegardePerimee } from './save.js';
import { monterUI, rafraichir, attacherEtat, rendreAccueil, ouvrirOnglet } from './ui.js';
import { Rng, seedFromString } from './rng.js';
import { makeCharacter, estVivant } from './characters.js';
import { creerLogger, fouillerSite, combatContre } from './events.js';
import { attaquerCaravane } from './caravanes.js';
import { sEngager, quitter, toucherRations as toucherRationsA } from './allegeance.js';
import { genererBande, TACTIQUES } from './combat.js';
import { groupeActif, tousLesMembres, scinder, fusionner, choisirGroupe, assignerTache } from './groupes.js';
import {
  reconnaitreAvantPoste, peutReconnaitre, rattacherVille,
  declarerIndependance,
} from './base.js';
import { verifierExercice } from './squad.js';
import { honorer as honorerService } from './services.js';
import { acheterBete, vendreBete } from './betes.js';
import { engager } from './recrues.js';
import {
  envoyerColonne as envoyerColonneA, leverColonne as leverColonneA,
  fonderPoste as fonderPosteA, declarerGuerreA, signerPaixAvec,
  renforcerGarnison, ouvrirGreniers, fixerLoi as fixerLoiA,
} from './influence.js';
import { disposer } from './justice.js';

let state = null;
let boucle = null;
let sauvegardeTimer = null;
/** Vrai pendant l'écran de rattrapage : l'horloge normale ne doit pas s'en mêler. */
let rattrapageEnCours = false;

// ---------------------------------------------------------------------------
// Boucle temps réel
// ---------------------------------------------------------------------------

function demarrerBoucle() {
  arreterBoucle();
  boucle = setInterval(() => {
    if (!state || state.fin || rattrapageEnCours) return;
    const r = rattraper(state, Date.now());
    if (r.ticks > 0) rafraichir();
  }, 400);
  sauvegardeTimer = setInterval(sauver, 5000);
}

function arreterBoucle() {
  if (boucle) clearInterval(boucle);
  if (sauvegardeTimer) clearInterval(sauvegardeTimer);
  boucle = null;
  sauvegardeTimer = null;
}

function sauver() {
  if (state) sauvegarder(state);
}

// ---------------------------------------------------------------------------
// Actions exposées à l'interface
// ---------------------------------------------------------------------------

const API = {
  sauver,

  nouvelle(graineTexte) {
    let graine;
    if (!graineTexte) graine = (Math.random() * 4294967296) >>> 0;
    else if (/^\d+$/.test(graineTexte)) graine = Number(graineTexte) >>> 0;
    else graine = seedFromString(graineTexte);

    state = nouvellePartie(graine, { maintenant: Date.now() });
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

  /** Engagement d'un mercenaire dans une ville : il rejoint le groupe affiché. */
  /** Engager quelqu'un du banc de la ville où l'on se trouve. */
  recruter(index) {
    const g = groupeActif(state);
    const col = state.world.colonies.find((c) => !c.ruine && c.regionId === g.regionId);
    const r = engager(state, col, Number(index), creerLogger(state), g);
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

  /** Lever une colonne sur le trésor de la faction, et la lancer. */
  leverColonne(faction, depuisId, cibleId) {
    const r = leverColonneA(state, faction, depuisId, cibleId, creerLogger(state));
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
  declarerGuerre(faction, contre) {
    const rng = new Rng(state.rngState);
    const r = declarerGuerreA(state, faction, contre, rng, creerLogger(state));
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

  /** Comment on se bat. Vaut aussi pendant votre absence. */
  tactique(key) {
    if (!TACTIQUES[key]) return { ok: false, motif: 'Tactique inconnue.' };
    state.player.tactique = key;
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
    if (state.temps - avant > 24) {
      const jours = ((state.temps - avant) / 24).toFixed(1);
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = `${jours} jours se sont écoulés en votre absence${r.tronque ? ' (plafonné)' : ''}.`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4200);
    }
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

const sauvegarde = charger();
if (sauvegarde) {
  rendreAccueil(true);
} else {
  rendreAccueil(existeSauvegarde() && !sauvegardePerimee(), sauvegardePerimee());
}

// Ne jamais perdre une session parce que l'onglet est passé en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sauver();
  else if (state && !state.fin) {
    // Un onglet laissé de côté toute la nuit doit autant de temps qu'une
    // session rouverte : même chemin, même écran de rattrapage.
    reprendreLeTemps((r) => { if (r.total) { rafraichir(true); sauver(); } });
  }
});
window.addEventListener('pagehide', sauver);
window.addEventListener('beforeunload', sauver);
