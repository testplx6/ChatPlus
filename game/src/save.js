// Sauvegarde locale. L'état est du JSON pur : pas de classes, pas de
// références circulaires, pas de fonctions. C'est ce qui rend possible à la
// fois la persistance navigateur et, plus tard, un envoi au serveur.

import { groupeVide } from './groupes.js';
import { creerConnaissance } from './connaissance.js';

export const CLE = 'cendres.save.v1';
/**
 * 2 : la carte est passée de 10×8 à 24×18.
 *
 * C'est la seule migration qu'on ne sait pas faire. Le reste du jeu se complète
 * à la volée dans `normaliser` — un système qui s'ajoute ne doit pas coûter sa
 * partie au joueur. Mais la taille de la carte est la clé qui traduit un indice
 * de région en coordonnées : la lire de travers ne dégrade pas une sauvegarde,
 * elle la rend fausse partout à la fois, silencieusement. On refuse donc les
 * parties d'avant, plutôt que de les ouvrir corrompues.
 */
export const VERSION = 2;

export function serialiser(state) {
  return JSON.stringify(state);
}

/**
 * Complète une sauvegarde plus ancienne que le code courant. Le jeu gagne des
 * systèmes au fil des versions ; effacer la partie du joueur à chaque ajout
 * serait la solution paresseuse.
 */
export function normaliser(state) {
  const p = state.player;

  // Avant les groupes, l'escouade était un bloc unique posé sur `player`.
  // On la reconstitue en un premier groupe : une partie en cours ne se jette
  // pas parce que le moteur a appris à en tenir plusieurs.
  if (!p.groupes) {
    const g = groupeVide('g0', 'Convoi', p.regionId || 0, state.temps);
    g.membres = p.squad || [];
    g.ordre = p.ordre || { type: 'repos' };
    g.inventaire = Object.assign(g.inventaire, p.inventaire || {});
    g.objets = p.objets || [];
    g.reste = p.reste || {};
    g.bilan = p.bilan || { res: {}, depuis: state.temps };
    g.cohesion = p.cohesion === undefined ? 55 : p.cohesion;
    p.groupes = [g];
    p.groupeActif = g.id;
    delete p.squad; delete p.ordre; delete p.inventaire; delete p.objets;
    delete p.regionId; delete p.reste; delete p.bilan; delete p.cohesion;
    delete p.recolteHeure; delete p.nuit;
  }
  for (const g of p.groupes) {
    if (!g.reste) g.reste = {};
    if (!g.objets) g.objets = [];
    // Avant les bêtes de somme, on portait tout sur le dos.
    if (!g.betes) g.betes = [];
    if (!g.bilan) g.bilan = { res: {}, depuis: state.temps };
    if (g.cohesion === undefined) g.cohesion = 55;
    if (!g.ordre) g.ordre = { type: 'repos' };
    // Avant l'allure, toute route était une marche forcée — et personne ne
    // dormait jamais en voyage. On rend leurs nuits aux parties en cours.
    if (g.ordre.type === 'voyage' && !g.ordre.allure) g.ordre.allure = 'normale';
    if (!g.membres) g.membres = [];
  }
  if (!p.groupeActif || !p.groupes.some((g) => g.id === p.groupeActif)) {
    p.groupeActif = p.groupes.length ? p.groupes[0].id : null;
  }

  // Avant la connaissance imparfaite, tout était su en permanence. On repart
  // d'une ardoise vide : le premier tick relève ce qu'on a sous les yeux, et le
  // reste de la carte redevient un souvenir à rafraîchir.
  if (!state.connaissance) state.connaissance = creerConnaissance(state.temps);

  // Avant les tactiques, on subissait le combat sans rien en décider.
  if (!p.tactique) p.tactique = 'ligne';
  if (p.politique && p.politique.viserChefs === undefined) p.politique.viserChefs = false;
  if (!p.contrats) p.contrats = [];
  if (!p.primes) p.primes = {};
  // Avant, l'engagement appartenait au joueur : un seul pour toute la partie.
  // Il appartient désormais à la colonne qui l'a signé, ce qui permet d'en
  // envoyer une servir pendant qu'une autre bâtit. On le remet à la première.
  if (p.allegeance) {
    const premier = p.groupes[0];
    if (premier && !premier.allegeance) premier.allegeance = p.allegeance;
    delete p.allegeance;
  }
  for (const g of p.groupes) {
    if (g.allegeance === undefined) g.allegeance = null;
    if (!g.allegeance) continue;
    if (g.allegeance.intendance === undefined) g.allegeance.intendance = state.temps;
    if (g.allegeance.manques === undefined) g.allegeance.manques = 0;
    // Avant les prérogatives, un gradé demandait ; il n'avait donc rien à
    // assumer. Désormais il ordonne, et ce qu'il ordonne s'inscrit.
    if (!g.allegeance.actes) g.allegeance.actes = [];
    if (g.allegeance.fautes === undefined) g.allegeance.fautes = 0;
    // Avant les secteurs, un gradé n'avait rien à tenir entre deux guerres.
    if (g.allegeance.secteur === undefined) g.allegeance.secteur = null;
  }
  if (!state.memorial) state.memorial = [];
  if (!state.stats) state.stats = {};
  for (const k of ['contratsRemplis', 'sitesFouilles', 'caravanesPillees', 'distanceParcourue', 'servicesRendus']) {
    if (state.stats[k] === undefined) state.stats[k] = 0;
  }
  const w = state.world;
  if (!w.caravanes) w.caravanes = [];
  // Avant les dirigeants, les factions décidaient comme des moyennes. Le
  // premier tick leur donne quelqu'un à leur tête.
  for (const k of Object.keys(w.factions || {})) {
    if (w.factions[k].dirigeant === undefined) w.factions[k].dirigeant = null;
    // Avant les lois, une faction n'avait ni justice, ni impôt, ni interdit.
    if (w.factions[k].lois === undefined) w.factions[k].lois = null;
    // Les consignes portées au conseil ont disparu avec les requêtes : un
    // gradé n'oriente plus une décision, il la prend.
    if (w.factions[k].consigne !== undefined) delete w.factions[k].consigne;
  }
  if (!w.meteo) w.meteo = { type: 'couvert', restant: 4 };
  for (const r of w.regions) {
    // Les routes d'avant les secteurs : sûres par défaut, elles se dégraderont
    // toutes seules si personne ne les tient.
    if (r.insecurite === undefined) r.insecurite = 0;
    // Avant les pistes, on traversait une friche vierge à chaque passage.
    if (r.piste === undefined) r.piste = 0;
  }
  for (const c of w.colonies) {
    if (c.declin === undefined) c.declin = 0;
    if (c.prises === undefined) c.prises = 0;
    // Les métiers d'une ville d'avant : le premier tick les répartira.
    if (c.emplois === undefined) c.emplois = null;
    // Les gens qui comptent : le premier tick pourvoit les charges.
    if (!c.notables) c.notables = [];
    // Avant le banc de recrutement, on tirait un inconnu au sort en payant
    // d'avance. Le premier passage en ville en garnit un.
    if (c.banc === undefined) c.banc = null;
    // Avant la justice, une ville n'enfermait personne.
    if (c.geole === undefined) c.geole = null;
    // Avant les services, ces gens n'attendaient rien et ne retenaient rien.
    for (const p2 of c.notables) {
      if (p2.demande === undefined) p2.demande = null;
      if (!p2.memoire) p2.memoire = [];
    }
  }
  for (const g of p.groupes) {
    // Avant la justice, on ne faisait pas de prisonniers.
    if (!g.prisonniers) g.prisonniers = [];
    for (const c of g.membres) {
      if (!c.traits) c.traits = [];
      if (!c.liens) c.liens = {};
      if (!c.diplomes) c.diplomes = [];
      if (c.horsCombat === undefined) c.horsCombat = c.kills || 0;
      if (c.formation === undefined) c.formation = null;
      if (c.enseigne === undefined) delete c.enseigne;
    }
  }
  const b = state.base;
  if (b) {
    if (b.pop === undefined) b.pop = 0;
    if (b.moral === undefined) b.moral = 60;
    // Avant, un entrepôt plein jetait la production sans rien dire.
    if (b.gaspille === undefined) b.gaspille = 0;
    // Avant, personne ne se mettait au travail sans qu'on le lui dise.
    if (b.autoEmploi === undefined) b.autoEmploi = true;
    // Avant, un avant-poste n'existait pas sur la carte du monde.
    if (b.colonieId === undefined) b.colonieId = null;
    // Avant, une ville reconnue n'avait toujours pas de marché.
    if (b.commerce === undefined) b.commerce = true;
    if (b.dernierMarchand === undefined) b.dernierMarchand = -9999;
    if (b.majVitrine === undefined) b.majVitrine = -999;
    if (b.majEmploi === undefined) b.majEmploi = -999;
    if (b.gaspilleJour === undefined) b.gaspilleJour = 0;
    if (b.dernierGaspillage === undefined) b.dernierGaspillage = -999;
    // Avant les métiers, les habitants étaient un multiplicateur anonyme : on
    // les laisse manœuvres, le joueur les affectera s'il le veut.
    if (!b.postes) b.postes = {};
  }
  if (state.stats.ordresRemplis === undefined) state.stats.ordresRemplis = 0;
  return state;
}

export function deserialiser(txt) {
  const state = JSON.parse(txt);
  if (!state || state.version !== VERSION) {
    throw new Error('Sauvegarde incompatible.');
  }
  return normaliser(state);
}

/**
 * Y a-t-il une sauvegarde qu'on ne sait plus lire ? L'écran d'accueil doit le
 * dire : proposer « Reprendre » sur un bouton qui ne reprend rien est la pire
 * des réponses.
 */
export function sauvegardePerimee() {
  const s = stockage();
  if (!s) return false;
  const txt = s.getItem(CLE);
  if (!txt) return false;
  try {
    const brut = JSON.parse(txt);
    return !!brut && brut.version !== VERSION;
  } catch (e) {
    return true;
  }
}

function stockage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (e) {
    // Mode privé, quota, iframe verrouillée…
  }
  return null;
}

export function sauvegarder(state) {
  const s = stockage();
  if (!s) return { ok: false, motif: 'Stockage local indisponible.' };
  try {
    s.setItem(CLE, serialiser(state));
    return { ok: true };
  } catch (e) {
    return { ok: false, motif: 'Écriture impossible (quota ?).' };
  }
}

export function charger() {
  const s = stockage();
  if (!s) return null;
  const txt = s.getItem(CLE);
  if (!txt) return null;
  try {
    return deserialiser(txt);
  } catch (e) {
    return null;
  }
}

export function effacer() {
  const s = stockage();
  if (s) s.removeItem(CLE);
}

export function existeSauvegarde() {
  const s = stockage();
  return !!(s && s.getItem(CLE));
}
