// Amorçage : charge ou crée la partie, fait tourner l'horloge réelle,
// sauvegarde régulièrement. Le seul module avec des effets de bord temporels.

import { nouvellePartie, rattraper, TICK_MS } from './sim.js';
import { charger, sauvegarder, effacer, existeSauvegarde } from './save.js';
import { monterUI, rafraichir, attacherEtat, rendreAccueil, ouvrirOnglet } from './ui.js';
import { Rng, seedFromString } from './rng.js';
import { makeCharacter, estVivant } from './characters.js';
import { creerLogger, fouillerSite, combatContre } from './events.js';
import { attaquerCaravane } from './caravanes.js';
import { sEngager, quitter } from './allegeance.js';
import { genererBande } from './combat.js';
import { tailleEscouadeMax } from './base.js';

let state = null;
let boucle = null;
let sauvegardeTimer = null;

// ---------------------------------------------------------------------------
// Boucle temps réel
// ---------------------------------------------------------------------------

function demarrerBoucle() {
  arreterBoucle();
  boucle = setInterval(() => {
    if (!state || state.fin) return;
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
    if (!s) { rendreAccueil(false); return; }
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

  /** Engagement d'un mercenaire dans une ville. */
  recruter(prix) {
    const col = state.world.regions[state.player.regionId].colonie;
    if (!col) return { ok: false, motif: 'Personne à recruter ici.' };
    const vivants = state.player.squad.filter(estVivant).length;
    if (vivants >= tailleEscouadeMax(state.base)) return { ok: false, motif: 'Escouade au complet.' };
    if (state.player.credits < prix) return { ok: false, motif: 'Crédits insuffisants.' };

    const rng = new Rng(state.rngState);
    const c = makeCharacter(rng, { niveau: rng.irange(0, 2) });
    c.equip.armure = c.equip.armure || (rng.chance(0.5) ? 'cuir' : null);
    state.rngState = rng.save();

    state.player.credits -= prix;
    state.player.squad.push(c);
    creerLogger(state)({
      type: 'recrue',
      texte: `${c.nom} (${c.archetypeNom}) s’engage pour ${prix} cr.`,
      important: true,
      regionId: state.player.regionId,
    });
    sauver();
    return { ok: true, nom: c.nom };
  },
};

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

function lancer(s) {
  state = s;
  attacherEtat(state);
  const avant = state.temps;
  const r = rattraper(state, Date.now());
  demarrerBoucle();
  rafraichir(true);
  if (r.ticks > 24) {
    const jours = ((state.temps - avant) / 24).toFixed(1);
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = `${jours} jours se sont écoulés en votre absence${r.tronque ? ' (plafonné)' : ''}.`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
}

monterUI(API);

const sauvegarde = charger();
if (sauvegarde) {
  rendreAccueil(true);
} else {
  rendreAccueil(existeSauvegarde());
}

// Ne jamais perdre une session parce que l'onglet est passé en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sauver();
  else if (state) {
    const r = rattraper(state, Date.now());
    if (r.ticks) rafraichir(true);
  }
});
window.addEventListener('pagehide', sauver);
window.addEventListener('beforeunload', sauver);
