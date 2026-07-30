// Interface : rendu HTML + carte pixel sur canvas. C'est le SEUL module qui
// touche au DOM — tout le reste du dossier src/ tourne aussi bien sous Node.

import {
  BIOMES, FACTIONS, COMMODITIES, COMMODITY_KEYS, BUILDINGS, BUILDING_KEYS,
  RESEARCH, RESEARCH_KEYS, ITEMS, SKILLS, SKILL_KEYS, BODY_PARTS, BODY_KEYS,
  POSTURES, POSTURE_KEYS, TRAITS, POI, CONTRATS, DIPLOMES, METIERS, METIER_KEYS,
  METIERS_VILLE, METIER_VILLE_KEYS,
} from './data.js';
import {
  nomRegion, colonieDe, colonieParId, coord, chemin, coutTraversee, distance,
} from './world.js';
import {
  comp, pvTotal, etatCourt, estVivant, estDebout, ratio, peutEquiper,
  relationsNotables, lien,
} from './characters.js';
import {
  prixJoueur, acheter, vendre, poidsInventaire, capacitePortage, meilleurCommercant,
  prixItem, acheterItem, vendreItem, actifs, emploi,
} from './economy.js';
import {
  populationMax, mainDoeuvre, placesMetier, affectes, manoeuvres, affecter,
  rendementMetier,
  niveau as nivBat, niveauRech, coutBatiment, tempsBatiment, coutRecherche,
  tempsRecherche, capaciteStock, totalStock, energie, lancerConstruction,
  lancerRecherche, annulerConstruction, fonderBase, deposer, retirer,
  COUT_FONDATION, tailleEscouadeMax,
} from './base.js';
import { classement, enGuerre } from './factions.js';
import {
  donnerOrdre, ORDRES, rendementPrevu, COMPETENCES_EXERCICE, PAR_LA_PRATIQUE,
} from './squad.js';
import {
  progres as progresContrat, lieuValidation, accepter, abandonner, MAX_CONTRATS,
} from './contrats.js';
import { horloge, VITESSES } from './sim.js';
import { conditions, SAISONS, METEO } from './climat.js';
import {
  RANGS, rangDe, estAuService, peutSEngager, avancementOrdre, REPUTATION_MINIMALE,
  droitIntendance, garnison, RANG_GARNISON,
} from './allegeance.js';
import { caravanesIci, valeurCargaison } from './caravanes.js';
import { couleurLog, creerLogger } from './events.js';
import {
  ecolesDe, prixFormation, peutSInscrire, inscrire, abandonnerFormation,
  ecolesAvantPoste, peutApprendreChezSoi, enseignerChezSoi, LENTEUR_MAISON,
} from './formation.js';
import { CHARGES, CARACTERES, margeMarchand, vocation } from './notables.js';
import { demandesIci, souvenirs, faveurChef, SOINS_SEUIL, REGISTRES_SEUIL } from './services.js';
import { primeDe, apercu, tensionRecrutement } from './recrues.js';
import {
  prisonniersDe, capaciteGarde, surveillanceManquante, optionsPour,
  lenteurPrisonniers, geoleDe,
} from './justice.js';
import { PEINES, PEINE_KEYS, IMPOTS, loisDe, loiIci } from './lois.js';
import {
  resumeSecteur, casesDe, dansSonSecteur, motEtat, NIVEAU_ORDINAIRE,
  SEUIL_FAUTE, SEUIL_MERITE, RANG_SECTEUR,
} from './secteur.js';
import {
  PREROGATIVES, PREROGATIVE_KEYS, peutExercer, credit as creditInfluence,
  colonnesDe, sitesFondation, cibleGuerre, guerresArretables, coutLevee,
  COUT_POSTE, FORCE_LEVEE, COUT_GARNISON, COUT_GRENIER, villeConfiee,
} from './influence.js';
import {
  BETES, BETE_KEYS, betesDe, prixBete, portageAttelage, lenteurAttelage,
  conduite, surnombre, visibiliteAttelage,
} from './betes.js';
import { dirigeant, TEMPERAMENTS, LEGITIMITE_CRITIQUE } from './dirigeants.js';
import { vueColonie, vueRegion, estSurveillee, ageTexte, nouvellesConnues } from './connaissance.js';
import {
  groupeActif, groupes, groupeParId, choisirGroupe, tousLesMembres, tacheDe,
  assignerTache, scinder, fusionner, fusionnablesAvec, porteeOrdres, joignable, repartition,
  TACHES_INDIVIDUELLES, noyau, plafondCohesion, rendementCohesion,
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
let dernierRenduMs = 0;
let derniereInteraction = 0;
let toastTimer = null;
/** Cases cochées dans le panneau « Détacher » — purement d'interface. */
let detaches = new Set();

/** Cadence minimale entre deux reconstructions complètes de l'écran (ms). */
const RENDU_MIN_MS = 600;
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

function n(v, dec = 0) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function jauge(pct, cls = '', couleur) {
  const p = Math.max(0, Math.min(100, pct * 100));
  const st = `width:${p.toFixed(0)}%` + (couleur ? `;background:${couleur}` : '');
  return `<div class="jauge ${cls}"><i style="${st}"></i></div>`;
}

function toast(msg, err) {
  const vieux = document.querySelector('.toast');
  if (vieux) vieux.remove();
  const d = document.createElement('div');
  d.className = 'toast' + (err ? ' err' : '');
  d.textContent = msg;
  document.body.appendChild(d);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => d.remove(), 2600);
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
  return (FACTIONS[k] && FACTIONS[k].couleur) || '#7b8699';
}

// ---------------------------------------------------------------------------
// Rendu principal
// ---------------------------------------------------------------------------

export function rafraichir(force) {
  if (!S) { rendreAccueil(); return; }
  const maintenant = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (!force) {
    if (S.temps === dernierRendu) return;
    // On reconstruit tout l'écran d'un bloc : à vitesse ×16 cela arriverait
    // plusieurs fois par seconde et pourrait avaler le geste de l'utilisateur.
    if (maintenant - dernierRenduMs < RENDU_MIN_MS) return;
    if (maintenant - derniereInteraction < REPIT_APRES_CLIC_MS) return;
  }
  dernierRendu = S.temps;
  dernierRenduMs = maintenant;

  const ecran = $('#ecran');
  const scroll = ecran.scrollTop;

  rendreBarreHaut();
  rendreNav();

  switch (onglet) {
    case 'carte': ecran.innerHTML = ecranCarte(); break;
    case 'escouade': ecran.innerHTML = ecranEscouade(); break;
    case 'base': ecran.innerHTML = ecranBase(); break;
    case 'contrats': ecran.innerHTML = ecranContrats(); break;
    case 'monde': ecran.innerHTML = ecranMonde(); break;
    case 'journal': ecran.innerHTML = ecranJournal(); break;
    default: ecran.innerHTML = ecranCarte();
  }
  ecran.scrollTop = scroll;

  const cv = $('#carte');
  if (cv) {
    dessinerCarte(cv);
    if (cv.parentElement) lierGestesCarte(cv.parentElement);
    centrerCarte(cv);
  }
  if (modale) rendreModale();
}

function rendreBarreHaut() {
  const h = horloge(S.temps);
  const p = S.player;
  const cap = capacitePortage(S, G());
  const g = G();
  const poids = poidsInventaire(g.inventaire);
  const charge = cap > 0 ? poids / cap : 1;
  const vivants = g.membres.filter(estVivant).length;
  const debout = g.membres.filter(estDebout).length;

  const cl = conditions(S.world, S.temps);
  // Les indicateurs vivent dans leur propre boîte, qui rogne par la droite si
  // l'écran est trop étroit. Sans ça, les blocs se compriment les uns dans les
  // autres et les libellés se chevauchent — et c'est le sélecteur de vitesse,
  // le seul vrai bouton de la barre, qui finissait par sortir de l'écran.
  $('#barre-haut').innerHTML = `
    <div class="hd-metriques">
      <div class="hd-bloc" title="${g.nuit ? 'Nuit — on campe' : 'Jour'}">
        <span class="hd-val hd-cycle">${g.nuit ? '☾' : '☀'}</span>
        <span class="hd-val cyan">${h.texte}</span></div>
      <div class="hd-bloc" title="${e(cl.saison.def.nom)} — ${e(cl.meteo.nom)}">
        <span class="hd-val hd-saison" style="color:${cl.saison.def.couleur}"
          aria-label="${e(cl.saison.def.nom)}">◆</span></div>
      <div class="hd-bloc"><span class="hd-eti">cr</span>
        <span class="hd-val ambre">${n(p.credits)}</span></div>
      <div class="hd-bloc"><span class="hd-eti">sac</span>
        <span class="hd-val ${charge > 0.95 ? 'rouge' : ''}">${n(poids)}/${n(cap)}</span></div>
      <div class="hd-bloc" title="${e(g.nom)}"><span class="hd-eti">${e(groupes(S).length > 1 ? g.nom.slice(0, 3) : 'esc')}</span>
        <span class="hd-val ${debout < vivants ? 'rouge' : ''}">${debout}/${vivants}</span></div>
    </div>
    <div class="hd-pousse vitesse" role="group" aria-label="Vitesse">
      ${VITESSES.map((v) => `<button data-a="vitesse" data-v="${v}"
        aria-pressed="${S.vitesse === v}">×${v}</button>`).join('')}
    </div>`;
}

function rendreNav() {
  const enCours = S.player.contrats.length;
  const tabs = [
    ['carte', '▚', 'CARTE', 0],
    ['escouade', '⌂', 'ESCOUADE', 0],
    ['contrats', '✦', 'CONTRATS', enCours],
    ['base', '⌸', 'BASE', S.base.file.length + S.base.fileRech.length],
    ['monde', '◈', 'MONDE', 0],
    ['journal', '≡', 'JOURNAL', S.nonLus],
  ];
  $('#barre-nav').innerHTML = tabs.map(([k, g, l, compte]) => `
    <button data-a="onglet" data-k="${k}" aria-current="${onglet === k ? 'page' : 'false'}">
      <span class="glyphe" aria-hidden="true">${g}</span>${l}
      ${compte ? `<span class="pastille ${k === 'journal' ? '' : 'calme'}">${compte > 99 ? '99' : compte}</span>` : ''}
    </button>`).join('');
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
let CELL = 24;

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
function centrerCarte(cv, force) {
  const boite = cv.parentElement;
  if (!boite) return;
  const g = G();
  if (!g) return;
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
  el.textContent = r
    ? `${String.fromCharCode(65 + r.x)}${r.y + 1} · ${Math.round(CELL)} px/secteur`
    : '';
}

function dessinerCarte(cv) {
  const w = S.world;
  const L = w.largeur * CELL;
  const H = w.hauteur * CELL;
  if (cv.width !== L) { cv.width = L; cv.height = H; }
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#05070a';
  g.fillRect(0, 0, L, H);

  for (const r of w.regions) {
    const x = r.x * CELL;
    const y = r.y * CELL;
    if (!r.decouvert) {
      g.fillStyle = '#0b0e14';
      g.fillRect(x, y, CELL, CELL);
      for (let k = 0; k < 4; k++) {
        const b = bruit(r.i, k);
        g.fillStyle = 'rgba(120,132,152,.07)';
        g.fillRect(x + Math.floor(b * 14), y + Math.floor(bruit(r.i, k + 9) * 14), 2, 2);
      }
      continue;
    }
    const cols = BIOMES[r.biome].couleurs;
    g.fillStyle = cols[0];
    g.fillRect(x, y, CELL, CELL);
    // Texture : quelques pixels plus clairs et plus sombres, toujours les mêmes
    for (let k = 0; k < 11; k++) {
      const b = bruit(r.i, k);
      const px = x + Math.floor(bruit(r.i, k + 31) * (CELL - 2));
      const py = y + Math.floor(bruit(r.i, k + 57) * (CELL - 2));
      g.fillStyle = b > 0.5 ? cols[1] : cols[2];
      g.fillRect(px, py, 2, 2);
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
  }

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
  for (const col of w.colonies) {
    const r = w.regions[col.regionId];
    if (!r.decouvert) continue;
    const su = vueColonie(S, col);
    if (su.inconnu) continue; // repérée de loin, jamais relevée : pas de drapeau
    const x = r.x * CELL;
    const y = r.y * CELL;
    const t = 3 + (su.taille || col.taille);
    const ox = x + Math.floor((CELL - t) / 2);
    const oy = y + Math.floor((CELL - t) / 2);
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
  }

  // Avant-poste
  if (S.base.fonde) {
    const r = w.regions[S.base.regionId];
    if (r) {
      const x = r.x * CELL;
      const y = r.y * CELL;
      g.strokeStyle = '#4fd0e3';
      g.lineWidth = 1;
      g.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
    }
  }

  // Armées : idem. Une colonne en marche à l'autre bout de la carte ne se
  // devine pas — sauf à avoir cassé leurs transmissions.
  const crypto = (S.base.recherche.cryptographie || 0) > 0;
  for (const a of w.armees) {
    const r = w.regions[a.regionId];
    if (!r || !r.decouvert) continue;
    if (!crypto && !estSurveillee(S, a.regionId)) continue;
    const x = r.x * CELL;
    const y = r.y * CELL;
    const t = Math.max(3, Math.round(CELL * 0.19));
    g.fillStyle = couleurFaction(a.faction);
    g.fillRect(x + CELL - t - 2, y + 2, t, t);
    g.fillStyle = '#05070a';
    g.fillRect(x + CELL - t - 1, y + 3, Math.max(1, t - 2), Math.max(1, t - 2));
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
    <h2 class="titre">Dernières nouvelles</h2>
    <div class="fil">
      ${recentes.map((x) => `<div class="fil-l ${couleurLog(x.type)}">
        <span class="fil-t">${horloge(x.t).texte}</span>
        <span class="fil-x">${e(x.texte)}</span>
      </div>`).join('')}
    </div>
  </section>`;
}

function blocSite() {
  const r = S.world.regions[G().regionId];
  if (!r.site || !r.site.connu) return '';
  const def = POI[r.site.type];
  if (r.site.fouille) {
    return `<section class="panneau">
      <h2 class="titre">${e(def.nom)} <span class="droite">vidé</span></h2>
      <div class="aide">Il n\u2019y a plus rien à en tirer.</div>
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
      ${bloque ? 'Hors de portée' : 'Fouiller le site'}</button>
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
      <div class="ligne"><span class="k" style="color:${couleurFaction(car.faction)}">${e(FACTIONS[car.faction].nom)}</span>
        <span class="v ambre">~${n(valeurCargaison(car))} cr de marchandise</span></div>
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
    const reste = c.echeance - S.temps;
    return `<div style="padding:4px 0">
        <div class="ligne"><span class="k">${e(c.titre)}</span>
          <span class="v ${reste < 48 ? 'alerte' : ''}">${dureeTexte(Math.max(0, reste))}</span></div>
        ${jauge(p.total ? p.fait / p.total : 0, p.pret ? 'vert' : '')}
        <div class="aide">${e(p.texte)} · à rendre à ${e(lieuValidation(S, c))}</div>
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

  const ordresDispo = ['repos', 'fouille', 'mine', 'chasse', 'exploration', 'patrouille'];
  const boutons = ordresDispo.map((k) => {
    const prev = rendementPrevu(S, k);
    const rien = prev && prev.total <= 0.02;
    const chiffre = prev
      ? (rien ? 'rien ici' : `${prev.total.toFixed(2)}/h`)
      : k === 'exploration' ? 'carte' : k === 'patrouille' ? 'combat' : 'récup.';
    return `<button class="act ordre" data-a="ordre" data-k="${k}"
      aria-pressed="${o.type === k}" ${rien ? 'disabled' : ''}>
      <span class="o-n">${e(ORDRES[k].nom)}</span>
      <span class="o-r ${rien ? 'alerte' : ''}">${e(chiffre)}</span>
    </button>`;
  }).join('');

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
      <div class="aide">Vers ${e(nomRegion(S.world, o.dest))}${eta ? ` · encore ${dureeTexte(eta.heures)}` : ''}
        · ${o.allure === 'forcee' ? 'on ne dort pas' : 'camp la nuit'}</div>`;
  }

  return `
  <section class="panneau">
    <h2 class="titre">Ordre de ${e(G().nom)} <span class="droite">${e(enTete)}</span></h2>
    ${progression}
    <div class="grille-ordres">${boutons}
      <button class="act ordre" data-a="modale" data-m="entrainement">
        <span class="o-n">Entraîner</span><span class="o-r">xp</span></button>
    </div>
    <div class="aide" style="margin-top:6px">${e(ORDRES[o.type] ? ORDRES[o.type].desc : '')}</div>
    ${detailRendement ? `<div class="aide" style="color:var(--texte-2)">Ici : ${e(detailRendement)} par heure de travail.</div>` : ''}
    ${G().recolteHeure ? `<div class="aide" style="color:var(--vert)">Dernière heure : ${e(G().recolteHeure)}</div>` : ''}
    ${blocRepartition()}
  </section>

  <section class="panneau">
    <h2 class="titre">Position <span class="droite">${e(nomRegion(S.world, rid))}</span></h2>
    <div class="ligne"><span class="k">Biome</span><span class="v">${e(b.nom)}</span></div>
    <div class="ligne"><span class="k">Richesse</span><span class="v">×${r.richesse.toFixed(2)}</span></div>
    <div class="ligne"><span class="k">Épuisement</span><span class="v">${(r.fouille * 100).toFixed(0)} %</span></div>
    <div class="ligne"><span class="k">Rencontres</span><span class="v">${(r.danger * 100).toFixed(1)} %/h</span></div>
    <div class="ligne"><span class="k">Aléa</span><span class="v">${e(b.hazard.nom)}</span></div>
    <div class="ligne"><span class="k">Ciel</span>
      <span class="v" style="color:${conditions(S.world, S.temps).meteo.couleur}">${e(conditions(S.world, S.temps).meteo.nom)}</span></div>
    ${r.controle ? `<div class="ligne"><span class="k">Territoire</span>
      <span class="v" style="color:${couleurFaction(r.controle)}">${e(FACTIONS[r.controle].nom)}</span></div>` : ''}
  </section>

  ${blocSite()}
  ${col && !col.ruine ? blocColonie(col) : ''}
  ${ici ? `<section class="panneau">
      <h2 class="titre">Avant-poste</h2>
      <button class="act" data-a="modale" data-m="transfert">Transférer des ressources</button>
    </section>` : ''}`;
}

/**
 * Le panneau de la ville où l'on se trouve : forcément de première main.
 *
 * On n'appelle jamais ceci sur une ruine — une ville effondrée n'a plus de
 * drapeau (`faction` repasse à null), et l'affichage plantait sur ce cas dès
 * qu'une partie durait assez pour qu'une ville s'éteigne sous les pieds du
 * joueur. Le garde-fou est ici aussi, parce qu'un rendu ne doit jamais casser
 * l'écran entier.
 */
function blocColonie(col) {
  if (!col || col.ruine || !FACTIONS[col.faction]) return '';
  const repu = S.player.reputation[col.faction] || 0;
  const cls = repu > 20 ? 'ok' : repu < -20 ? 'mal' : 'att';
  return `
  <section class="panneau">
    <h2 class="titre">${e(col.nom)}
      <span class="droite" style="color:${couleurFaction(col.faction)}">${e(FACTIONS[col.faction].nom)}</span></h2>
    <div class="grille2">
      <div class="ligne"><span class="k">Population</span><span class="v">${n(col.pop)}</span></div>
      <div class="ligne"><span class="k">Défense</span><span class="v">${n(col.defense)}</span></div>
      <div class="ligne"><span class="k">Agitation</span><span class="v">${(col.unrest * 100).toFixed(0)} %</span></div>
      <div class="ligne"><span class="k">Réputation</span><span class="v"><span class="puce ${cls}">${repu > 0 ? '+' : ''}${n(repu)}</span></span></div>
    </div>
    <div class="sep"></div>
    <div class="grille2" style="gap:5px">
      <button class="act mini primaire" data-a="modale" data-m="marche">Marché</button>
      <button class="act mini primaire" data-a="modale" data-m="etal">Équipement</button>
      <button class="act mini" data-a="modale" data-m="panneau">Contrats${col.contrats && col.contrats.length ? ` (${col.contrats.length})` : ''}</button>
      <button class="act mini" data-a="modale" data-m="recrutement">Recruter</button>
      <button class="act mini" data-a="modale" data-m="attelage">Attelage${betesDe(G()).length ? ` (${betesDe(G()).length})` : ''}</button>
      ${ecolesDe(S.world, col).length
    ? `<button class="act mini" style="grid-column:1/-1" data-a="modale" data-m="ecole">
        Écoles (${ecolesDe(S.world, col).length})</button>` : ''}
      <button class="act mini" style="grid-column:1/-1" data-a="modale" data-m="ville">
        Qui vit ici</button>
    </div>
    ${blocEngagement(col)}
  </section>`;
}

function blocEngagement(col) {
  const all = G() && G().allegeance;
  if (all && all.faction === col.faction) {
    const rang = rangDe(all);
    return `<div class="sep"></div>
      <div class="ligne"><span class="k">Vous servez ici</span>
        <span class="v" style="color:${couleurFaction(col.faction)}">${e(rang.def.nom)}</span></div>`;
  }
  if (all) return '';
  const v = peutSEngager(S, col.faction);
  const rep = S.player.reputation[col.faction] || 0;
  return `<div class="sep"></div>
    <button class="act mini" data-a="engager" data-k="${e(col.faction)}" ${v.ok ? '' : 'disabled'}>
      ${v.ok ? `Entrer au service ${e(FACTIONS[col.faction].genitif)}`
    : `Engagement refusé — réputation ${Math.round(rep)}/${REPUTATION_MINIMALE}`}</button>`;
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
      <span class="v" style="color:${couleurFaction(su.faction)}">${e(su.faction ? FACTIONS[su.faction].nom : 'sans maître')}</span></div>
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
  // Une colonne en marche ne se devine pas depuis l'autre bout de la carte.
  if (!estSurveillee(S, rid)) return '';
  const as = S.world.armees.filter((a) => a.regionId === rid);
  if (!as.length) return '';
  return as.map((a) => `<div class="ligne"><span class="k">Colonne</span>
    <span class="v" style="color:${couleurFaction(a.faction)}">${e(FACTIONS[a.faction].nom)} · ${n(a.force)} · ${e(a.etat)}</span></div>`).join('');
}

function ecranCarte() {
  return `
  <div id="carte-boite"><canvas id="carte" aria-label="Carte du monde"></canvas></div>
  <div class="carte-pied"><span id="carte-pos"></span>
    <span class="aide">glisser pour déplacer · molette ou deux doigts pour zoomer ·
      double clic pour revenir sur le groupe</span></div>
  <div class="legende">
    <span><i style="background:#f2f6fb"></i>${groupes(S).length > 1 ? 'groupe affiché' : 'escouade'}</span>
    ${groupes(S).length > 1 ? '<span><i style="border:1px solid #f2f6fb"></i>autre groupe</span>' : ''}
    <span><i style="border:1px solid #4fd0e3"></i>avant-poste</span>
    ${classement(S.world).slice(0, 6).map((f) =>
    `<span><i style="background:${f.couleur}"></i>${e(FACTIONS[f.key].court)}</span>`).join('')}
  </div>
  ${groupes(S).length > 1 ? barreGroupes() : ''}
  ${blocSelection()}
  ${blocRegionCourante()}
  ${blocCaravanes()}
  ${blocContratsActifs()}
  ${blocFil()}`;
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
    return `<div class="comp-l"><span class="n">${e(SKILLS[k])}</span>
      <span class="j">${jauge(v / 100)}</span>
      <span class="v" title="effectif ${eff.toFixed(0)}">${v}</span></div>`;
  }).join('');

  const arme = c.equip.arme ? ITEMS[c.equip.arme].nom : '—';
  const armure = c.equip.armure ? ITEMS[c.equip.armure].nom : '—';
  const greffes = Object.keys(c.equip.greffes).map((m) => ITEMS[c.equip.greffes[m]].nom).join(', ') || '—';

  return `<details class="perso" data-id="${e(c.id)}"${ouvert}>
    <summary>
      <span class="puce ${cls}">${e(et)}</span>
      <span class="nom">${e(c.nom)} <span class="arch">${e(c.archetypeNom)}</span></span>
      <span class="mono-num" style="color:var(--texte-3)">${(t.pct * 100).toFixed(0)}%</span>
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
      ? `→ ${e(nomRegion(S.world, g.ordre.dest))}`
      : e(nomRegion(S.world, g.regionId));
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
    aria-pressed="${detaches.has(c.id)}">${detaches.has(c.id) ? '×' : ' '} ${e(c.nom)}</button>`).join('');

  const choisis = dispo.filter((c) => detaches.has(c.id)).length;
  const possible = place && choisis > 0 && choisis < dispo.length;

  return `<section class="panneau">
    <h2 class="titre">Détacher</h2>
    ${dispo.length < 2
    ? '<div class="aide">Il faut au moins deux personnes debout pour se séparer.</div>'
    : `<div class="aide">Les vivres et le matériel suivent au prorata. Choisissez qui part.</div>
       <div class="taches">${cases}</div>
       <button class="act" data-a="detacher" ${possible ? '' : 'disabled'}>
         Détacher ${choisis || ''} ${choisis > 1 ? 'membres' : 'membre'}</button>
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

  return `<section class="panneau">
    <h2 class="titre">Sac <span class="droite">${n(poids)} / ${n(cap)} kg</span></h2>
    ${jauge(cap ? poids / cap : 1, poids / cap > 0.95 ? 'rouge' : poids / cap > 0.8 ? 'ambre' : '')}
    <div style="margin-top:7px">${lignes}</div>
    <div class="sep"></div>
    <div class="titre">Réserve d’équipement</div>
    <div>${objets}</div>
  </section>`;
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
    </div>`).join('')}
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
    <div class="sep"></div>
    ${gens.map((c) => {
    const opts = optionsPour(S, col, g, c);
    const cap = c.captif || {};
    return `<details data-id="captif-${e(c.id)}" ${ouverts.has(`captif-${c.id}`) ? 'open' : ''}
        style="border-bottom:1px solid #1b2029;padding:5px 0">
        <summary class="ligne"><span class="k">${e(c.nom)}</span>
          <span class="v">${e(cap.brigandage ? 'brigand'
      : cap.faction ? FACTIONS[cap.faction].nom : 'inconnu')}</span></summary>
        <div class="aide">${e(c.archetypeNom || '')} · ${Math.round(pvTotal(c).pct * 100)} % · 
          ${e(apercu(c).skill)} ${apercu(c).comp}</div>
        ${opts.map((o) => `<button class="act mini" style="margin-top:4px;text-align:left"
          data-a="captif" data-c="${e(c.id)}" data-k="${o.key}">${e(o.nom)}${
  o.prix ? ` — ${n(o.prix)} cr` : ''}<br><span class="aide">${e(o.aide)}</span></button>`).join('')}
      </details>`;
  }).join('')}
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
  ${barreGroupes()}
  <section class="panneau">
    <h2 class="titre">Cohésion de ${e(g.nom)}
      <span class="droite"><span class="puce ${cohCls}">${Math.round(g.cohesion ?? 55)} %</span></span></h2>
    ${jauge((g.cohesion ?? 55) / 100, '', rend >= 1 ? '#4fd0e3' : undefined)}
    <div class="grille2">
      <div class="ligne"><span class="k">Effectif</span>
        <span class="v">${nGens} pour un noyau de ${n(noy)}</span></div>
      <div class="ligne"><span class="k">Plafond atteignable</span>
        <span class="v">${Math.round(plafond)} %</span></div>
      <div class="ligne"><span class="k">Travail et combat</span>
        <span class="v">×${rend.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Se voit de loin</span>
        <span class="v">+${(Math.max(0, nGens - 4) * 5)} % de rencontres</span></div>
    </div>
    <div class="aide">${nGens > noy
    ? 'Au-delà du noyau, on se connaît moins. Rien ne l’interdit : ça coûte, simplement.'
    : 'Une bande de cette taille peut se souder complètement.'}</div>
  </section>

  ${blocPrisonniers()}

  <section class="panneau">
    <h2 class="titre">Posture</h2>
    <div class="grille3">
      ${POSTURE_KEYS.map((k) => `<button class="act mini" data-a="posture" data-k="${k}"
        aria-pressed="${p.posture === k}">${e(POSTURES[k].nom)}</button>`).join('')}
    </div>
    <div class="aide" style="margin-top:6px">${e(POSTURES[p.posture].desc)}</div>
  </section>

  <section class="panneau">
    <h2 class="titre">Consignes permanentes</h2>
    <div class="pile">
      ${[
    ['recruter', 'Recruter les errants croisés en route'],
    ['commercer', 'Traiter avec les caravanes'],
    ['payerPeage', 'Payer les péages plutôt que se battre'],
    ['achever', 'Achever les ennemis à terre'],
  ].map(([k, l]) => `<button class="act mini" style="text-align:left" data-a="politique" data-k="${k}"
        aria-pressed="${!!pol[k]}">[${pol[k] ? '×' : ' '}] ${e(l)}</button>`).join('')}
    </div>
    <div class="aide" style="margin-top:6px">Ces consignes s’appliquent aussi pendant votre absence.</div>
  </section>

  <section class="panneau">
    <h2 class="titre">Cohésion de ${e(g.nom)} <span class="droite">${Math.round(g.cohesion ?? 55)} / 100</span></h2>
    ${jauge((g.cohesion ?? 55) / 100, (g.cohesion ?? 55) < 30 ? 'rouge' : (g.cohesion ?? 55) < 60 ? 'ambre' : 'vert')}
    <div class="aide" style="margin-top:5px">${e(texteCohesion(g.cohesion ?? 55))}</div>
  </section>

  <section class="panneau">
    <h2 class="titre">${e(g.nom)}
      <span class="droite">${tousLesMembres(S).filter(estVivant).length} au total</span></h2>
    ${g.membres.map(ficheMembre).join('')}
  </section>

  ${blocDetachement()}
  ${blocInventaire()}
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
function blocMetiers() {
  const b = S.base;
  const libres = manoeuvres(b);
  const ouverts = METIER_KEYS.filter((k) => placesMetier(b, k) > 0);

  if (!b.pop) {
    return `<section class="panneau">
      <h2 class="titre">Métiers</h2>
      <div class="aide">Personne à employer. Il faut d’abord que des gens s’installent :
        un baraquement pour les loger, des rations pour les garder.</div>
    </section>`;
  }
  if (!ouverts.length) {
    return `<section class="panneau">
      <h2 class="titre">Métiers <span class="droite">${n(libres)} manœuvre(s)</span></h2>
      <div class="aide">Aucun poste ouvert : ce sont les bâtiments qui créent les places.
        En attendant, tout le monde donne un coup de main partout — ×${mainDoeuvre(b).toFixed(2)}
        sur l’ensemble.</div>
    </section>`;
  }

  const lignes = ouverts.map((k) => {
    const m = METIERS[k];
    const places = placesMetier(b, k);
    const n0 = affectes(b, k);
    const rd = rendementMetier(S, k);
    return `<div style="border-bottom:1px solid #1b2029;padding:7px 0">
      <div class="ligne">
        <span class="k">${e(m.nom)} <span class="puce">${n0}/${places}</span></span>
        <span class="v ${n0 ? 'ambre' : ''}">${n0 ? `×${rd.mult.toFixed(2)}` : '—'}</span>
      </div>
      <div class="aide">${e(m.effet)}. ${e(m.texte)}</div>
      <div class="aide" ${rd.contremaitre ? 'style="color:var(--cyan)"' : ''}>${rd.contremaitre
    ? `Contremaître ${e(rd.contremaitre.nom)} — ${e(SKILLS[m.skill].toLowerCase())} ${Math.round(comp(rd.contremaitre, m.skill))}`
    : `Sans contremaître (${e(SKILLS[m.skill].toLowerCase())})`}</div>
      <div class="taches" style="margin-top:5px">
        <button class="act mini" data-a="poste" data-k="${k}" data-n="-1" ${n0 <= 0 ? 'disabled' : ''}>−</button>
        <button class="act mini" data-a="poste" data-k="${k}" data-n="1"
          ${n0 >= places || libres <= 0 ? 'disabled' : ''}>+</button>
        <button class="act mini" data-a="poste" data-k="${k}" data-n="max"
          ${n0 >= places || libres <= 0 ? 'disabled' : ''}>Au complet</button>
        <button class="act mini" data-a="poste" data-k="${k}" data-n="0" ${n0 <= 0 ? 'disabled' : ''}>Vider</button>
      </div>
    </div>`;
  }).join('');

  return `<section class="panneau">
    <h2 class="titre">Métiers
      <span class="droite">${n(libres)} manœuvre(s) sur ${n(b.pop)}</span></h2>
    <div class="aide">Un habitant sans poste aide partout un peu (×${mainDoeuvre(b).toFixed(2)}
      sur l’ensemble). Affecté, il rend bien davantage — mais sur sa chaîne seulement.
      Un des vôtres présent à l’avant-poste encadre l’équipe et vaut plusieurs bras.</div>
    <div class="sep"></div>
    ${lignes}
  </section>`;
}

function blocEcoleBase() {
  const b = S.base;
  const surPlace = G().regionId === b.regionId;
  const antenne = nivBat(b, 'antenne');

  const cours = groupes(S).flatMap((g) => g.membres)
    .filter((c) => c.formation && c.formation.maison)
    .map((c) => {
      const d = DIPLOMES[c.formation.key];
      const fait = c.formation.total - c.formation.restant;
      const maitre = groupes(S).flatMap((x) => x.membres)
        .find((x) => x.id === c.formation.instructeurId);
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
    const candidats = groupes(S).flatMap((g) => g.membres)
      .filter((c) => peutApprendreChezSoi(S, c, o.key).ok);
    return `<div class="contrat">
      <div class="contrat-t">${e(d.court)} — ${e(o.instructeur.nom)} enseigne</div>
      <div class="ligne"><span class="k">À la sortie</span>
        <span class="v">${e(SKILLS[d.skill])} ${d.plancher} au minimum</span></div>
      <div class="ligne"><span class="k">Durée</span><span class="v">${dureeTexte(heures)}</span></div>
      ${candidats.length
    ? `<div class="taches">${candidats.map((c) => `<button class="act mini"
        data-a="apprendre-maison" data-k="${o.key}" data-c="${e(c.id)}">Former ${e(c.nom)}
        <span class="aide">(${Math.round(comp(c, d.skill))})</span></button>`).join('')}</div>`
    : '<div class="aide">Personne à former là-dedans pour l’instant.</div>'}
    </div>`;
  }).join('');

  return `<section class="panneau">
    <h2 class="titre">Transmission <span class="droite">${offres.length} matière(s)</span></h2>
    <div class="aide">Ce que les vôtres savent, ils peuvent l’apprendre aux autres — sans
      payer une ville, mais plus lentement, et à deux immobilisés : l’élève et le maître.
      Il faut un diplômé, ou quelqu’un qui en sait bien plus que le cours.</div>
    ${cours ? `<div class="sep"></div><div class="titre">En cours</div>${cours}` : ''}
    ${!surPlace ? '<div class="aide" style="color:var(--ambre);margin-top:6px">Personne n’est à l’avant-poste.</div>' : ''}
    <div class="sep"></div>
    ${lignes || '<div class="aide">Personne ici n’en sait assez pour enseigner quoi que ce soit.</div>'}
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
    return `<section class="panneau">
      <h2 class="titre">Aucun avant-poste</h2>
      <div class="aide">Un avant-poste vous donne un entrepôt, des chaînes de production
      et la recherche. Il faut le bâtir hors d’une ville existante, et il pourra être attaqué.</div>
      <div class="sep"></div>
      <div class="ligne"><span class="k">Coût</span><span class="v">${e(coutTexte(COUT_FONDATION))}</span></div>
      <div class="ligne"><span class="k">Emplacement</span><span class="v">${e(nomRegion(S.world, G().regionId))}</span></div>
      ${manque.length ? `<div class="aide" style="color:var(--rouge)">Manque : ${e(manque.join(', '))}</div>` : ''}
      ${enVille ? '<div class="aide" style="color:var(--rouge)">Impossible ici : une ville occupe déjà la région.</div>' : ''}
      <div class="sep"></div>
      <button class="act primaire" data-a="fonder" ${manque.length || enVille ? 'disabled' : ''}>
        Fonder l’avant-poste ici</button>
    </section>`;
  }

  const en = energie(b);
  const stock = totalStock(b);
  const capa = capaciteStock(b);

  const fileHtml = b.file.length ? b.file.map((it, i) => `
    <div style="margin-bottom:6px">
      <div class="ligne"><span class="k">${e(BUILDINGS[it.key].nom)} → niv. ${it.niveau}</span>
        <span class="v">${dureeTexte(Math.max(0, it.restant))}</span></div>
      ${jauge(1 - it.restant / it.total, 'cyan')}
      ${i === 0 ? '' : ''}
      <button class="act mini" data-a="annuler" data-i="${i}" style="margin-top:4px">Annuler (70 % remboursé)</button>
    </div>`).join('') : '<div class="aide">Rien en construction.</div>';

  const batHtml = BUILDING_KEYS.map((k) => {
    const bd = BUILDINGS[k];
    const niv = nivBat(b, k);
    const enFile = b.file.filter((x) => x.key === k).length;
    const cout = coutBatiment(b, k);
    const dispo = Object.keys(cout).every((c) => (b.stock[c] || 0) >= cout[c]);
    const plein = niv + enFile >= bd.max;
    return `<div style="border-bottom:1px solid #1b2029;padding:6px 0">
      <div class="ligne"><span class="k">${e(bd.nom)} <span class="puce">niv ${niv}${enFile ? `+${enFile}` : ''}</span></span>
        <span class="v">${bd.energie > 0 ? `+${bd.energie * (niv + 1)}` : bd.energie < 0 ? `${bd.energie * (niv + 1)}` : '—'} én.</span></div>
      <div class="aide">${e(bd.desc)}</div>
      <div class="aide">Coût : ${e(coutTexte(cout))} · ${dureeTexte(tempsBatiment(b, k))}</div>
      <button class="act mini" data-a="construire" data-k="${k}" ${plein || !dispo ? 'disabled' : ''}
        style="margin-top:4px">${plein ? 'Niveau maximum' : `Construire niv. ${niv + enFile + 1}`}</button>
    </div>`;
  }).join('');

  const rechHtml = RESEARCH_KEYS.map((k) => {
    const rd = RESEARCH[k];
    const niv = niveauRech(b, k);
    const enFile = b.fileRech.filter((x) => x.key === k).length;
    const cout = coutRecherche(b, k);
    const dispo = Object.keys(cout).every((c) => (c === 'credits' ? S.player.credits : (b.stock[c] || 0)) >= cout[c]);
    const plein = niv + enFile >= rd.max;
    const sansAntenne = nivBat(b, 'antenne') < 1;
    return `<div style="border-bottom:1px solid #1b2029;padding:6px 0">
      <div class="ligne"><span class="k">${e(rd.nom)}</span><span class="v"><span class="puce">niv ${niv}/${rd.max}</span></span></div>
      <div class="aide">${e(rd.desc)}</div>
      <div class="aide">Coût : ${e(coutTexte(cout))} · ${dureeTexte(tempsRecherche(b, k))}</div>
      <button class="act mini" data-a="chercher" data-k="${k}"
        ${plein || !dispo || sansAntenne ? 'disabled' : ''} style="margin-top:4px">
        ${plein ? 'Terminé' : sansAntenne ? 'Antenne requise' : 'Lancer'}</button>
    </div>`;
  }).join('');

  const stockHtml = COMMODITY_KEYS.map((k) => `<div class="ligne">
    <span class="k">${e(COMMODITIES[k].nom)}</span><span class="v">${n(b.stock[k] || 0)}</span></div>`).join('');

  return `
  <section class="panneau">
    <h2 class="titre">${e(b.nom)} <span class="droite">${e(nomRegion(S.world, b.regionId))}</span></h2>
    <div class="grille2">
      <div class="ligne"><span class="k">Énergie</span>
        <span class="v ${en.ratio < 1 ? '' : ''}">${n(en.prod)} / ${n(en.conso)}</span></div>
      <div class="ligne"><span class="k">Défense</span><span class="v">${n(b.defense)}</span></div>
    </div>
    ${en.ratio < 1 ? `<div class="aide" style="color:var(--ambre)">Production réduite à ${(en.ratio * 100).toFixed(0)} % :
      ${(b.stock.carburant || 0) <= 0 ? 'plus de carburant.' : 'énergie insuffisante.'}</div>` : ''}
    <div class="sep"></div>
    <div class="ligne"><span class="k">Entrepôt</span><span class="v">${n(stock)} / ${n(capa)}</span></div>
    ${jauge(stock / capa, stock / capa > 0.95 ? 'rouge' : '')}
    <div class="sep"></div>
    <div class="ligne"><span class="k">Habitants</span>
      <span class="v">${n(b.pop || 0)} / ${n(populationMax(b))}</span></div>
    ${jauge(populationMax(b) ? (b.pop || 0) / populationMax(b) : 0, '', '#6be08a')}
    <div class="aide">${(b.pop || 0) === 0
    ? 'Personne ne vit ici. Un baraquement et des vivres y changeraient quelque chose.'
    : `Main-d’œuvre ×${mainDoeuvre(b).toFixed(2)} sur les chaînes · +${n(Math.round((b.pop || 0) * 2.5))} de défense · ${n((b.pop || 0) * 0.014 * 24, 1)} rations/jour consommées`}</div>
  </section>

  ${blocMetiers()}
  ${blocEcoleBase()}

  <section class="panneau">
    <h2 class="titre">File de construction <span class="droite">${b.file.length}/5</span></h2>
    ${fileHtml}
  </section>

  <section class="panneau">
    <h2 class="titre">Bâtiments</h2>
    ${batHtml}
  </section>

  <section class="panneau">
    <h2 class="titre">Recherche <span class="droite">${b.fileRech.length}/3</span></h2>
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
    <h2 class="titre">Stock</h2>
    ${stockHtml}
  </section>`;
}

// ---------------------------------------------------------------------------
// Écran CONTRATS
// ---------------------------------------------------------------------------

function ligneContrat(c, enCours) {
  const p = enCours ? progresContrat(S, c) : null;
  const reste = enCours ? c.echeance - S.temps : c.duree;
  const donneur = colonieParId(S.world, c.colonieId);
  return `<div class="contrat">
    <div class="ligne">
      <span class="k"><span class="puce" style="border-color:${couleurFaction(c.faction)};color:${couleurFaction(c.faction)}">${e(CONTRATS[c.type].nom)}</span></span>
      <span class="v ambre">${n(c.recompense)} cr · rép +${c.reputation}</span>
    </div>
    <div class="contrat-t">${e(c.titre)}</div>
    ${p ? `${jauge(p.total ? p.fait / p.total : 0, p.pret ? 'vert' : '')}
      <div class="aide">${e(p.texte)} · à rendre à ${e(lieuValidation(S, c))}
        · <span class="${reste < 48 ? 'alerte' : ''}">${dureeTexte(Math.max(0, reste))} restantes</span></div>`
    : `<div class="aide">Commanditaire : ${e(donneur ? donneur.nom : '—')} · ${dureeTexte(reste)} accordées</div>`}
    ${enCours
    ? `<button class="act mini danger" data-a="abandonner" data-k="${e(c.id)}">Abandonner</button>`
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

  return `<div class="sep"></div>
  <div class="titre">Votre charge</div>
  <div class="ligne"><span class="k">Crédit auprès ${e(FACTIONS[faction].genitif)}</span>
    <span class="v ${cr < 40 ? 'alerte' : ''}">${n(cr)}</span></div>
  <div class="aide">${e(d.titre)} ${e(d.nom)}, ${e(TEMPERAMENTS[d.temperament].nom.toLowerCase())}.
    Vous n’avez rien à lui demander : ce que votre grade permet, vous l’ordonnez.
    Mais chaque ordre s’inscrit, et son issue vous revient.</div>
  ${lignes}`;
}

/** Une prérogative : ce qu'elle permet, et sur quoi on peut l'exercer ici. */
function ligneCharge(faction, k) {
  const def = PREROGATIVES[k];
  const v = peutExercer(S, faction, k);
  if (!v.ok) {
    return `<div style="border-bottom:1px solid #1b2029;padding:5px 0;opacity:.5">
      <div class="ligne"><span class="k">${e(def.nom)}</span>
        <span class="v">${e(v.motif)}</span></div>
      <div class="aide">${e(def.desc)}</div>
    </div>`;
  }
  const cibles = ciblesCharge(faction, k);
  return `<details data-id="prero-${k}" ${ouverts.has(`prero-${k}`) ? 'open' : ''}
    style="border-bottom:1px solid #1b2029;padding:5px 0">
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

function cibleVide(k) {
  return {
    envoyer: 'Aucune colonne des vôtres n’est sur les routes.',
    lever: 'Rien à prendre : aucune ville ennemie à portée.',
    fonder: 'Pas une case libre assez près des vôtres, ni assez loin des autres.',
    garnison: 'Aucune ville ne vous est confiée — il faut un secteur.',
    grenier: 'Aucune ville ne vous est confiée — il faut un secteur.',
    loi: 'La loi est déjà celle que vous vouliez.',
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
  if (k === 'lever') {
    const cout = coutLevee();
    const paye = w.factions[faction].tresor >= cout;
    return villesVisables(faction).slice(0, 6).map((c) => ({
      val: c.id,
      texte: `${FORCE_LEVEE} hommes sur ${c.nom} — ${n(cout)} cr${paye ? '' : ' (trésor court)'}`,
    }));
  }
  if (k === 'fonder') {
    const sites = sitesFondation(w, faction);
    const proche = (r) => Math.min(...w.colonies
      .filter((c) => !c.ruine && c.faction === faction)
      .map((c) => distance(c.regionId, r.i)));
    sites.sort((a, b) => proche(a) - proche(b));
    return sites.slice(0, 6).map((r) => ({
      val: String(r.i),
      texte: `Poste en ${nomRegion(w, r.i)} — ${n(COUT_POSTE)} cr`,
    }));
  }
  if (k === 'garnison' || k === 'grenier') {
    const col = villeConfiee(S, faction);
    if (!col) return [];
    const cout = k === 'garnison' ? COUT_GARNISON : COUT_GRENIER;
    return [{
      val: col.id,
      texte: k === 'garnison'
        ? `Relever les murs de ${col.nom} (${col.murs} murs) — ${n(cout)} cr`
        : `Nourrir ${col.nom} (grogne ${Math.round((col.unrest || 0) * 100)} %) — ${n(cout)} cr`,
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
    out.push(lois.esclavage
      ? { val: 'esclavage:non', texte: 'Interdire le commerce d’hommes' }
      : { val: 'esclavage:oui', texte: 'Autoriser le commerce d’hommes' });
    return out;
  }
  if (k === 'guerre') {
    return cibleGuerre(S, faction).map((f) => ({
      val: f,
      texte: `La guerre ${FACTIONS[f].datif}`,
    }));
  }
  if (k === 'paix') {
    return guerresArretables(S, faction).map((g) => ({
      val: g.contre,
      texte: `La paix ${FACTIONS[g.contre].datif} (${g.guerre.batailles} bataille${g.guerre.batailles > 1 ? 's' : ''})`,
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
  return `<div class="sep"></div>${abri}
    <button class="act primaire" data-a="intendance">Toucher ${n(d.quantite)} rations
      à l’intendance de ${e(col.nom)}</button>`;
}

function blocAllegeance() {
  const all = G() && G().allegeance;
  if (!all) {
    return `<section class="panneau">
      <h2 class="titre">Allégeance <span class="droite">indépendant</span></h2>
      <div class="aide">Vous ne servez personne. Entrer au service d’une faction demande
        ${REPUTATION_MINIMALE} de réputation ; cela donne une remise chez elle, une solde,
        le passage libre à ses barrages, l’accès à son bon matériel — et des ordres de
        mission qu’on ne refuse pas sans conséquence.</div>
      <div class="sep"></div>
      <div class="aide">Rendez-vous dans une de leurs villes pour vous engager.</div>
    </section>`;
  }

  const rang = rangDe(all);
  const f = FACTIONS[all.faction];
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
    <div class="grille2">
      <div class="ligne"><span class="k">Remise</span><span class="v">${(rang.def.remise * 100).toFixed(0)} %</span></div>
      <div class="ligne"><span class="k">Solde</span><span class="v">${n(rang.def.solde)} cr/jour</span></div>
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
      <div class="aide">${e(p ? p.texte : '')} · ${n(o.recompense)} cr ·
        <span class="${o.echeance - S.temps < 48 ? 'alerte' : ''}">${dureeTexte(Math.max(0, o.echeance - S.temps))} restantes</span></div>`
    : '<div class="aide">Aucun ordre en attente. Ils vous rappelleront.</div>'}
    ${blocInfluence(all.faction)}
    <div class="sep"></div>
    <button class="act mini danger" data-a="quitter-service">Rompre l’engagement</button>
  </section>`;
}

function ecranContrats() {
  const enCours = S.player.contrats;
  const col = colonieDe(S.world, G().regionId);
  const dispo = col && col.contrats ? col.contrats : [];

  return `
  ${blocAllegeance()}
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

function ecranMonde() {
  const crypto = (S.base.recherche.cryptographie || 0) > 0;
  const cl = classement(S.world);
  const max = Math.max(1, cl[0] ? cl[0].puissance : 1);

  const factionsHtml = cl.map((f) => {
    const repu = S.player.reputation[f.key] || 0;
    const cls = repu > 20 ? 'ok' : repu < -20 ? 'mal' : 'att';
    return `<div style="border-bottom:1px solid #1b2029;padding:6px 0">
      <div class="ligne">
        <span class="k" style="color:${f.couleur}">${e(f.nom)}</span>
        <span class="v"><span class="puce ${cls}">rép ${repu > 0 ? '+' : ''}${n(repu)}</span></span>
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
      ${d.guerres ? `${d.guerres} guerre(s), ` : ''}${d.prises} ville(s) prise(s),
      ${d.pertes} perdue(s).</div>`;
  })()}
      <div class="aide">${f.colonies} colonie(s) · ${crypto
    ? `trésor ${n(f.tresor)} cr`
    : 'trésor inconnu'} · ${e(FACTIONS[f.key].devise)}</div>
    </div>`;
  }).join('');

  const guerres = S.world.guerres.length
    ? S.world.guerres.map((g) => `<div style="border-bottom:1px solid #1b2029;padding:4px 0">
        <div class="ligne">
          <span class="k"><span style="color:${couleurFaction(g.a)}">${e(FACTIONS[g.a].court)}</span>
            ✕ <span style="color:${couleurFaction(g.b)}">${e(FACTIONS[g.b].court)}</span></span>
          <span class="v">${dureeTexte(S.temps - g.depuis)} · ${g.batailles} bataille(s)</span></div>
        ${g.but ? `<div class="aide">Déclarée ${e(g.but.texte)}.</div>` : ''}
      </div>`).join('')
    : '<div class="aide">Paix générale. Ça ne dure jamais.</div>';

  // Une colonne en marche se voit si on a quelqu'un dans le secteur — ou si on
  // a cassé leurs transmissions. C'est à ça que sert la Cryptographie.
  const vues = crypto ? S.world.armees : S.world.armees.filter((a) => estSurveillee(S, a.regionId));
  const armees = vues.length
    ? vues.map((a) => `<div class="ligne">
        <span class="k" style="color:${couleurFaction(a.faction)}">${e(FACTIONS[a.faction].court)} · ${n(a.force)}</span>
        <span class="v">${e(a.etat)} → ${e((colonieParId(S.world, a.cible) || {}).nom || '—')}</span></div>`).join('')
    : `<div class="aide">${S.world.armees.length
      ? 'Rien en vue. Ce qui ne veut pas dire qu’il ne se passe rien.'
      : 'Aucune colonne en campagne.'}</div>`;

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
    : `<span class="v" style="color:${couleurFaction(v.faction)}">${e(v.faction ? FACTIONS[v.faction].court : '—')} · rang ${v.taille} · ${n(v.pop)} hab.</span>`}
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
  <section class="panneau">
    <h2 class="titre">Climat
      <span class="droite" style="color:${meteoNow.saison.def.couleur}">${e(meteoNow.saison.def.nom)} · jour ${meteoNow.saison.jour}/30 · an ${meteoNow.saison.annee}</span></h2>
    <div class="aide">${e(meteoNow.saison.def.texte)}</div>
    <div class="sep"></div>
    <div class="ligne"><span class="k">Ciel</span>
      <span class="v" style="color:${meteoNow.meteo.couleur}">${e(meteoNow.meteo.nom)}</span></div>
    <div class="aide">${e(meteoNow.meteo.texte)}</div>
    <div class="sep"></div>
    <div class="grille2">
      <div class="ligne"><span class="k">Récolte vivante</span><span class="v">×${meteoNow.rendement('biomasse').toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Récolte minérale</span><span class="v">×${meteoNow.rendement('minerai').toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Marche</span><span class="v">×${meteoNow.marche.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Aléas</span><span class="v">×${meteoNow.aleas.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Rencontres</span><span class="v">×${meteoNow.rencontres.toFixed(2)}</span></div>
      <div class="ligne"><span class="k">Visibilité</span><span class="v">×${meteoNow.vue.toFixed(2)}</span></div>
    </div>
  </section>

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
        <span class="k" style="color:${couleurFaction(c.faction)}">${e(FACTIONS[c.faction].court)}</span>
        <span class="v">${e(de ? de.nom : '?')} → ${e(vers ? vers.nom : '?')} · ${n(valeurCargaison(c))} cr</span></div>`;
  }).join('') : '<div class="aide">Aucune caravane sur les routes. Mauvais signe.</div>'}
  </section>

  <section class="panneau"><h2 class="titre">Rapport de puissance</h2>${factionsHtml}</section>
  <section class="panneau"><h2 class="titre">Chiffres</h2>
    ${chiffres.map(([k, v]) => `<div class="ligne"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}
  </section>
  <section class="panneau"><h2 class="titre">Guerres en cours</h2>${guerres}</section>
  <section class="panneau"><h2 class="titre">Colonnes en campagne</h2>${armees}</section>
  <section class="panneau"><h2 class="titre">Villes connues <span class="droite">${connues.length}/${S.world.colonies.length}</span></h2>${villes}</section>`;
}

// ---------------------------------------------------------------------------
// Écran JOURNAL
// ---------------------------------------------------------------------------

function ecranJournal() {
  S.nonLus = 0;
  const entrees = S.journal
    .filter((x) => (filtreJournal === 'tout' ? !x.discret : x.important))
    .slice(-160)
    .reverse();

  const html = entrees.length ? entrees.map((x) => {
    const h = horloge(x.t);
    return `<div class="entree ${couleurLog(x.type)}">
      <div class="t">${h.texte}</div>
      <div>${e(x.texte)}</div>
      ${x.detail && x.detail.length ? `<div class="detail">${x.detail.map(e).join('<br>')}</div>` : ''}
    </div>`;
  }).join('') : '<div class="aide">Rien à signaler.</div>';

  return `
  <section class="panneau">
    <h2 class="titre">Journal de bord</h2>
    <div class="rangee">
      <button class="act mini" data-a="filtre" data-k="tout" aria-pressed="${filtreJournal === 'tout'}">Tout</button>
      <button class="act mini" data-a="filtre" data-k="important" aria-pressed="${filtreJournal === 'important'}">Marquant</button>
    </div>
  </section>
  <section class="panneau">${html}</section>`;
}

// ---------------------------------------------------------------------------
// Modales
// ---------------------------------------------------------------------------

function rendreModale() {
  const el = $('#modale');
  if (!modale) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<div class="boite">${contenuModale()}</div>`;
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
    case 'equipement': return modaleEquipement() + fermer;
    case 'entrainement': return modaleEntrainement() + fermer;
    case 'recrutement': return modaleRecrutement() + fermer;
    default: return fermer;
  }
}

function modaleMarche() {
  const col = colonieDe(S.world, G().regionId);
  if (!col) return '<div class="aide">Il n’y a pas de marché ici.</div>';
  const negoc = meilleurCommercant(G().membres);
  const hab = negoc ? comp(negoc, 'commerce') : 0;
  const repu = S.player.reputation[col.faction] || 0;

  const lignes = COMMODITY_KEYS.map((k) => {
    const p = prixJoueur(col, k, hab, repu);
    const stock = Math.floor(col.stock[k] || 0);
    const aMoi = G().inventaire[k] || 0;
    return `<div class="marche-l">
      <span class="nm">${e(COMMODITIES[k].nom)}<br>
        <span class="aide">ville ${n(stock)} · sac ${n(aMoi)}</span></span>
      <span class="px">A ${n(p.achat, 1)}<br>V ${n(p.vente, 1)}</span>
      <button class="act" data-a="acheter" data-k="${k}" data-q="10" ${stock < 1 ? 'disabled' : ''}>+10</button>
      <button class="act" data-a="vendre" data-k="${k}" data-q="9999" ${aMoi < 1 ? 'disabled' : ''}>tout</button>
    </div>`;
  }).join('');

  return `<h2 class="titre">Marché de ${e(col.nom)}
    <span class="droite">${n(S.player.credits)} cr</span></h2>
  <div class="aide">Négociateur : ${negoc ? `${e(negoc.nom)} (commerce ${hab.toFixed(0)})` : 'aucun'}.
    Une bonne réputation et un bon commerçant resserrent la marge.</div>
  <div class="sep"></div>${lignes}`;
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
    const trop = S.player.credits < p.achat;
    return `<div class="article">
      <div class="ligne"><span class="k">${e(it.nom)}</span>
        <span class="v ambre">${n(p.achat)} cr${ligne.qte > 1 ? ` ×${ligne.qte}` : ''}</span></div>
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
      <span class="px">${n(p.vente)} cr</span>
      <button class="act" data-a="vendre-item" data-i="${i}">Vendre</button>
    </div>`;
  }).join('') || '<div class="aide">Rien à revendre.</div>';

  return `<h2 class="titre">Armurier de ${e(col.nom)}
    <span class="droite">${n(S.player.credits)} cr</span></h2>
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
  return `<h2 class="titre">Panneau de ${e(col.nom)}
    <span class="droite">${S.player.contrats.length}/${MAX_CONTRATS} en cours</span></h2>
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
    const sac = G().inventaire[k] || 0;
    const ent = b.stock[k] || 0;
    return `<div class="marche-l">
      <span class="nm">${e(COMMODITIES[k].nom)}<br>
        <span class="aide">sac ${n(sac)} · entrepôt ${n(ent)}</span></span>
      <span class="px"></span>
      <button class="act" data-a="deposer" data-k="${k}" ${sac < 1 ? 'disabled' : ''}>↓</button>
      <button class="act" data-a="retirer" data-k="${k}" ${ent < 1 ? 'disabled' : ''}>↑</button>
    </div>`;
  }).join('');
  return `<h2 class="titre">Transfert
    <span class="droite">${n(totalStock(b))}/${n(capaciteStock(b))}</span></h2>
  <div class="aide">↓ dépose tout dans l’entrepôt · ↑ reprend ce que le sac peut porter.</div>
  <div class="sep"></div>${lignes}`;
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
    const prix = prixFormation(col, k, remise);
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
        <span class="v ${S.player.credits >= prix ? '' : 'alerte'}">${n(prix)} cr${remise ? ' (remise)' : ''}</span></div>
      ${candidats.length
    ? `<div class="taches">${candidats.map((c) => `<button class="act mini"
        data-a="inscrire" data-k="${k}" data-c="${e(c.id)}"
        ${S.player.credits >= prix ? '' : 'disabled'}>Inscrire ${e(c.nom)}
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
  else if (chef.prime !== 1) lignes.push('Le chef vous garde les contrats qui paient (+20 %).');
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
      return `<div style="border-bottom:1px solid #1b2029;padding:5px 0">
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
        <span class="v">${Math.round(reste / 24)} j · ${n(att.demande.prime)} cr</span></div>
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
    return `<div style="border-bottom:1px solid #1b2029;padding:6px 0">
      <div class="ligne"><span class="k">${e(def.nom)}</span>
        <span class="v">${n(prix)} cr</span></div>
      <div class="aide">${e(def.desc)}</div>
      <div class="aide">+${def.portage} kg · ${def.appetit
    ? `mange ${(def.appetit * 24).toFixed(1)} biomasse/jour` : 'ne mange rien'}
        · −${(def.lenteur * 100).toFixed(0)} % de vitesse</div>
      <button class="act mini${auDela ? '' : ' primaire'}" data-a="acheter-bete" data-k="${k}"
        style="margin-top:4px" ${S.player.credits < prix ? 'disabled' : ''}>
        ${S.player.credits < prix ? 'Crédits insuffisants'
    : auDela ? 'Acheter — personne pour la mener' : 'Acheter'}</button>
    </div>`;
  }).join('') : '<div class="aide">On n’achète pas une bête au milieu du désert.</div>';

  return `<h2 class="titre">Attelage de ${e(g.nom)}
    <span class="droite">${n(S.player.credits)} cr</span></h2>
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
  const banc = (col.banc && col.banc.gens) || [];

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
      <div class="ligne"><span class="k">Prime</span><span class="v">${n(prix)} cr</span></div>
      <button class="act mini${S.player.credits >= prix ? ' primaire' : ''}"
        data-a="recruter" data-i="${i}" style="margin-top:4px"
        ${S.player.credits < prix ? 'disabled' : ''}>
        ${S.player.credits < prix ? 'Crédits insuffisants' : 'Engager'}</button>
    </div>`;
  }).join('') : '<div class="aide">Personne ne cherche à partir d’ici en ce moment.</div>';

  const tension = tensionRecrutement(col);
  return `<h2 class="titre">Recrutement à ${e(col.nom)}
    <span class="droite">${n(S.player.credits)} cr</span></h2>
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

export function rendreAccueil(aSauvegarde, perimee = false) {
  $('#barre-haut').innerHTML = '';
  $('#barre-nav').innerHTML = '';
  $('#ecran').innerHTML = `
  <div class="accueil">
    <h1>Cendres &amp; Protocole</h1>
    <div class="sous">Une escouade. Un monde qui tourne sans vous.</div>
    <div class="panneau">
      <div class="aide">Vous n’êtes l’élu de personne. Six factions se disputent une carte
      que vous ne connaissez pas. Elles se font la guerre, prennent des villes et en perdent,
      que vous soyez là ou non — y compris pendant que cet onglet est fermé.<br><br>
      Vos gens apprennent en faisant. Ils se blessent membre par membre, tombent K.O.
      avant de mourir, et se souviennent de la faim.</div>
    </div>
    ${aSauvegarde ? '<button class="act primaire" data-a="continuer">Reprendre la partie</button><div style="height:8px"></div>' : ''}
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
      <label class="aide" for="graine">Graine (facultatif — même graine, même monde)</label>
      <input id="graine" type="text" inputmode="text" placeholder="au hasard" autocomplete="off">
      <div style="height:8px"></div>
      <button class="act primaire" data-a="nouvelle">Commencer</button>
    </div>
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
    case 'onglet':
      onglet = el.dataset.k;
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
      else toast('Site fouillé.');
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
      toast(r.ok ? `${r.nom} acheté pour ${r.prix} cr.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'vendre-item': {
      const col = colonieDe(S.world, G().regionId);
      const r = vendreItem(S, col, Number(el.dataset.i));
      toast(r.ok ? `${r.nom} vendu ${r.prix} cr.` : r.motif, !r.ok);
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

    case 'acheter': {
      const col = colonieDe(S.world, G().regionId);
      const r = acheter(S, col, el.dataset.k, Number(el.dataset.q));
      toast(r.ok ? `${r.qte} acheté(s) pour ${r.cout} cr.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'vendre': {
      const col = colonieDe(S.world, G().regionId);
      const r = vendre(S, col, el.dataset.k, Number(el.dataset.q));
      toast(r.ok ? `${r.qte} vendu(s) pour ${r.gain} cr.` : r.motif, !r.ok);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'deposer': {
      const k = el.dataset.k;
      const r = deposer(S, k, G().inventaire[k] || 0);
      if (!r.ok) toast(r.motif, true);
      rendreModale();
      rafraichir(true);
      break;
    }

    case 'retirer': {
      const k = el.dataset.k;
      const libre = capacitePortage(S, G()) - poidsInventaire(G().inventaire);
      const qte = Math.floor(libre / Math.max(0.01, COMMODITIES[k].poids));
      const r = retirer(S, k, qte, qte);
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
      const actuel = affectes(S.base, k);
      const cible = el.dataset.n === 'max'
        ? placesMetier(S.base, k)
        : el.dataset.n === '0' ? 0 : actuel + Number(el.dataset.n);
      const r = affecter(S, k, cible);
      if (!r.ok) toast(r.motif, true);
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
      toast(r.ok ? `Cédée pour ${r.prix} cr.` : r.motif, !r.ok);
      rendreModale();
      break;
    }

    // Exercer une prérogative. Pas de « peut-être » : ça part, ou ça ne part
    // pas parce qu'on n'en a pas le droit — et alors on dit lequel.
    case 'ordonner': {
      const f = el.dataset.f;
      const cible = el.dataset.k;
      let r;
      switch (el.dataset.r) {
        case 'envoyer': r = ACTIONS.envoyerColonne(f, cible, el.dataset.b); break;
        case 'garnison': r = ACTIONS.garnison(f); break;
        case 'grenier': r = ACTIONS.grenier(f); break;
        case 'loi': r = ACTIONS.fixerLoi(f, cible); break;
        case 'lever': r = ACTIONS.leverColonne(f, null, cible); break;
        case 'fonder': r = ACTIONS.fonderPoste(f, cible); break;
        case 'guerre': r = ACTIONS.declarerGuerre(f, cible); break;
        case 'paix': r = ACTIONS.signerPaix(f, cible); break;
        default: r = { ok: false, motif: 'Ordre inconnu.' };
      }
      toast(r.ok ? 'C’est fait. On exécute.' : r.motif, !r.ok);
      rafraichir(true);
      break;
    }

    case 'captif': {
      const r = ACTIONS.disposerPrisonnier(el.dataset.c, el.dataset.k);
      toast(r.ok
        ? (r.prix ? `C’est réglé. ${r.prix} cr.` : 'C’est réglé.')
        : r.motif, !r.ok);
      rafraichir(true);
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
      const r = ACTIONS.recruter(el.dataset.i);
      toast(r.ok ? `${r.perso.nom} rejoint l’escouade.` : r.motif, !r.ok);
      rendreModale();
      break;
    }

    case 'nouvelle': {
      const champ = document.getElementById('graine');
      ACTIONS.nouvelle(champ ? champ.value.trim() : '');
      break;
    }

    case 'continuer':
      ACTIONS.continuer();
      break;

    case 'effacer':
      if (confirm('Effacer définitivement la sauvegarde ?')) ACTIONS.effacer();
      break;

    default:
      break;
  }

  // Un clic change l'état : on le grave tout de suite plutôt que d'attendre
  // la sauvegarde automatique, qui peut arriver après la fermeture de l'onglet.
  if (S && ACTIONS.sauver) ACTIONS.sauver();
}

export function ouvrirOnglet(k) {
  onglet = k;
}
