// Sauvegarde locale. L'état est du JSON pur : pas de classes, pas de
// références circulaires, pas de fonctions. C'est ce qui rend possible à la
// fois la persistance navigateur et, plus tard, un envoi au serveur.

import { groupeVide } from './groupes.js';
import { grainDe } from './rng.js';
import { creerConnaissance } from './connaissance.js';
import { MENAGES } from './data.js';

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
  // Le flux privé du joueur — dérivé, jamais tiré (voir sim.js).
  if (state.player && typeof state.player.rngEtat !== 'number') {
    state.player.rngEtat = grainDe(state.seed || 0, 'joueur', state.rngState || 0);
  }
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
    // Le point de départ des compétences est arrivé après coup : pour une partie
    // déjà commencée, on prend l'état du jour. On ne peut pas inventer un passé.
    for (const c of g.membres) if (!c.skills0) c.skills0 = Object.assign({}, c.skills);
    // La feuille de service est arrivée après coup : on ne peut pas reconstituer
    // ce qui a été fait avant, seulement ne plus rien perdre à partir d'ici.
    if (g.allegeance && !g.allegeance.faits) g.allegeance.faits = [];
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
  if (p.politique && p.politique.halte === undefined) p.politique.halte = true;
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
  for (const k of ['contratsRemplis', 'sitesFouilles', 'caravanesPillees', 'distanceParcourue',
    'servicesRendus', 'captifsPris', 'captifsLivres', 'captifsVendus', 'captifsRelaches',
    'prerogatives', 'loisPromulguees']) {
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
  // Avant que des factions puissent naître, aucune identité ne vivait dans la
  // sauvegarde. Registre vide : les sept d'origine sont dans `data.js` et n'y
  // ont jamais été.
  if (!w.drapeaux) w.drapeaux = {};
  // Avant la colonne sans solde, une armée était payée ou ne l'était pas, et
  // personne ne comptait. Ardoise vierge : les heures d'avant n'ont pas été
  // comptées, et les inventer donnerait des désertions rétroactives.
  for (const a of w.armees || []) {
    if (typeof a.impayees !== 'number') a.impayees = 0;
  }
  for (const r of w.regions) {
    // Les routes d'avant les secteurs : sûres par défaut, elles se dégraderont
    // toutes seules si personne ne les tient.
    if (r.insecurite === undefined) r.insecurite = 0;
    // Avant les pistes, on traversait une friche vierge à chaque passage.
    if (r.piste === undefined) r.piste = 0;
  }
  for (const c of w.colonies) {
    if (c.declin === undefined) c.declin = 0;
    // Avant la caisse, une ville n'avait pas de crédits : elle recevait sans
    // payer et vendait sans encaisser. On leur ouvre un compte à hauteur de ce
    // qu'elles pèsent — les mettre à zéro les empêcherait de se ravitailler
    // pendant les cent premières heures d'une partie déjà avancée.
    if (c.caisse === undefined) c.caisse = Math.round((c.pop || 0) * 1.2);
    // Avant les ménages, les habitants n'avaient rien en poche — donc, la règle
    // du circuit fermé venue avec eux, plus rien à dépenser et une ville qui ne
    // consomme plus. On leur ouvre la même bourse qu'à une ville neuve.
    if (c.menages === undefined) {
      c.menages = c.avantPoste ? 0 : Math.round((c.pop || 0) * MENAGES.parTete);
    }
    // Avant le crédit, personne ne devait rien à personne.
    if (c.dette === undefined) c.dette = 0;
    if (c.creancier === undefined) c.creancier = null;
    if (c.cession === undefined) c.cession = null;
    if (c.prises === undefined) c.prises = 0;
    // Les métiers d'une ville d'avant : le premier tick les répartira.
    if (c.emplois === undefined) c.emplois = null;
    // Les gens qui comptent : le premier tick pourvoit les charges.
    if (!c.notables) c.notables = [];
    // Avant le banc de recrutement, on tirait un inconnu au sort en payant
    // d'avance. Le premier passage en ville en garnit un.
    // Le banc n'est plus de l'état : il se dérive de la ville et de l'heure
    // (voir `bancDerive`). Les vieilles sauvegardes en portent un, on le jette.
    if (c.banc !== undefined) delete c.banc;
    if (c.bancPris === undefined) c.bancPris = null;
    // Avant le vivier, une ville ne se souvenait de personne. Vide, donc : lui
    // inventer des souvenirs qu'elle n'a pas eus serait pire que rien.
    if (!Array.isArray(c.vivier)) c.vivier = [];
    // Le flux propre de la ville : dérivé de son nom, donc identique à celui
    // qu'une partie neuve lui aurait donné. Pas un tirage.
    if (typeof c.rngEtat !== 'number') c.rngEtat = grainDe(state.world.graine || 0, 'colonie', c.id);
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
    if (b.marchands === undefined) b.marchands = 0;
    if (b.majVitrine === undefined) b.majVitrine = -999;
    if (b.majEmploi === undefined) b.majEmploi = -999;
    if (b.gaspilleJour === undefined) b.gaspilleJour = 0;
    if (b.dernierGaspillage === undefined) b.dernierGaspillage = -999;
    if (b.dechets === undefined) b.dechets = 0;
    if (b.terraforme === undefined) b.terraforme = null;
    if (!b.reserves) b.reserves = {};
    if (!b.recettes) {
      // Les consignes n'existaient pas, et la raffinerie faisait les deux à la
      // fois : du carburant depuis le polymère *et* depuis les déchets. Elles
      // s'excluent désormais — sinon la recherche est un bonus gratuit plutôt
      // qu'une décision. Une partie qui avait la pyrolyse la garde donc comme
      // consigne, plutôt que de se réveiller sans elle un matin.
      b.recettes = {};
      if ((b.recherche || {}).pyrolyse >= 1) b.recettes.raffinerie = 'pyrolyse';
    }
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
  if (!s) {
    return {
      ok: false,
      motif: 'Ce navigateur refuse le stockage local : navigation privée, page '
        + 'isolée, ou réglage de confidentialité. La partie tourne, mais rien '
        + 'n’est écrit et tout sera perdu en fermant l’onglet.',
    };
  }
  const txt = serialiser(state);
  try {
    s.setItem(CLE, txt);
    return { ok: true, taille: txt.length };
  } catch (e) {
    // Le quota est la panne la plus probable, et elle a une issue : supprimer
    // des emplacements. Le dire vaut mieux qu'un point d'interrogation.
    const p = poidsEmplacements();
    return {
      ok: false,
      taille: txt.length,
      motif: p.n
        ? `Écriture refusée : le stockage est plein. Vos ${p.n} sauvegarde(s) `
          + `gardées occupent ${(p.octets / 1048576).toFixed(1)} Mo — en supprimer `
          + 'une libérera la place.'
        : 'Écriture refusée : le stockage du navigateur est plein.',
    };
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

// ---------------------------------------------------------------------------
// Emplacements : plusieurs parties gardées côte à côte
// ---------------------------------------------------------------------------
//
// La partie en cours continue de vivre sous `CLE`, écrite toutes les cinq
// secondes ; rien de ce qui suit ne la touche. Ce sont des copies qu'on prend
// exprès, qu'on nomme, et qu'on relit quand on veut — pour revenir sur un
// choix, pour comparer deux façons de jouer, ou pour garder l'état exact d'une
// partie où quelque chose s'est mal passé.
//
// Ce dernier usage est le plus utile pendant qu'on écrit le jeu : un défaut
// qu'on ne sait pas reproduire est un défaut qu'on ne corrige pas. Un
// emplacement s'exporte en fichier, et un fichier se transmet.

const CLE_INDEX = 'cendres.emplacements.v1';
const PREFIXE = 'cendres.emp.';

/**
 * Combien d'emplacements on autorise.
 *
 * Une partie pèse de 245 Ko neuve à 346 Ko après quatre mille heures, et le
 * stockage d'un navigateur tourne autour de cinq mégaoctets. Huit tient
 * largement, douze frôlerait le mur — et le mur, ici, c'est une écriture qui
 * échoue au moment où l'on croyait sauvegarder.
 */
export const EMPLACEMENTS_MAX = 8;

function lireIndex() {
  const s = stockage();
  if (!s) return [];
  try {
    const brut = JSON.parse(s.getItem(CLE_INDEX) || '[]');
    return Array.isArray(brut) ? brut : [];
  } catch (e) {
    return [];
  }
}

function ecrireIndex(liste) {
  const s = stockage();
  if (!s) return false;
  try {
    s.setItem(CLE_INDEX, JSON.stringify(liste));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * De quoi reconnaître une partie sans l'ouvrir.
 *
 * Une liste de « Sauvegarde 1, Sauvegarde 2, Sauvegarde 3 » ne sert à rien : au
 * bout de trois, on ne sait plus laquelle est laquelle. On garde donc le jour,
 * les vivants, la bourse et l'endroit — c'est ce qu'on regarde pour se
 * rappeler où l'on en était.
 */
export function resumeSauvegarde(state) {
  const gs = (state.player && state.player.groupes) || [];
  const gens = gs.reduce(
    (t, g) => t + (g.membres || []).filter((c) => c && c.etat !== 'mort').length, 0);
  return {
    temps: state.temps || 0,
    jour: Math.floor((state.temps || 0) / 24) + 1,
    gens,
    credits: Math.round((state.player && state.player.credits) || 0),
    base: !!(state.base && state.base.fonde),
    nomBase: state.base && state.base.fonde ? state.base.nom : null,
    depart: state.depart || null,
    seed: state.seed,
  };
}

/** Les emplacements occupés, du plus récemment écrit au plus ancien. */
export function listerEmplacements() {
  return lireIndex().slice().sort((a, b) => (b.quand || 0) - (a.quand || 0));
}

/** Ce que tout ça pèse, pour le dire avant que l'écriture échoue. */
export function poidsEmplacements() {
  const s = stockage();
  if (!s) return { octets: 0, n: 0 };
  let octets = 0;
  let n = 0;
  for (const e of lireIndex()) {
    const txt = s.getItem(PREFIXE + e.id);
    if (txt) { octets += txt.length; n += 1; }
  }
  return { octets, n };
}

/**
 * Écrire la partie dans un emplacement. `id` absent : on en crée un nouveau.
 *
 * Le quota est la seule vraie panne possible ici, et elle doit se dire : une
 * sauvegarde qu'on croit prise et qui n'existe pas est pire que pas de
 * sauvegarde du tout.
 */
export function enregistrerEmplacement(state, nom, id) {
  const s = stockage();
  if (!s) return { ok: false, motif: 'Stockage local indisponible.' };
  const index = lireIndex();
  const existant = id ? index.find((x) => x.id === id) : null;
  if (!existant && index.length >= EMPLACEMENTS_MAX) {
    return { ok: false, motif: `Plus de place : ${EMPLACEMENTS_MAX} emplacements au plus.` };
  }
  // Un identifiant qui ne dépend pas du hasard ni de l'heure de jeu : le temps
  // réel suffit, et deux enregistrements dans la même milliseconde n'arrivent
  // pas quand c'est un doigt qui appuie.
  const clef = existant ? existant.id : `e${Date.now().toString(36)}`;
  const txt = serialiser(state);
  try {
    s.setItem(PREFIXE + clef, txt);
  } catch (e) {
    return { ok: false, motif: 'Écriture impossible : le stockage est plein.' };
  }
  const entree = {
    id: clef,
    nom: (nom || '').trim() || `Jour ${Math.floor((state.temps || 0) / 24) + 1}`,
    quand: Date.now(),
    octets: txt.length,
    resume: resumeSauvegarde(state),
  };
  const suite = index.filter((x) => x.id !== clef).concat([entree]);
  if (!ecrireIndex(suite)) {
    s.removeItem(PREFIXE + clef);
    return { ok: false, motif: 'Écriture impossible : le stockage est plein.' };
  }
  return { ok: true, id: clef, entree };
}

export function chargerEmplacement(id) {
  const s = stockage();
  if (!s) return null;
  const txt = s.getItem(PREFIXE + id);
  if (!txt) return null;
  try {
    return deserialiser(txt);
  } catch (e) {
    return null;
  }
}

export function supprimerEmplacement(id) {
  const s = stockage();
  if (!s) return { ok: false, motif: 'Stockage local indisponible.' };
  s.removeItem(PREFIXE + id);
  ecrireIndex(lireIndex().filter((x) => x.id !== id));
  return { ok: true };
}

export function renommerEmplacement(id, nom) {
  const index = lireIndex();
  const e = index.find((x) => x.id === id);
  if (!e) return { ok: false, motif: 'Cet emplacement n’existe plus.' };
  e.nom = (nom || '').trim() || e.nom;
  return ecrireIndex(index) ? { ok: true } : { ok: false, motif: 'Écriture impossible.' };
}

// ---------------------------------------------------------------------------
// Fichiers : sortir une partie du navigateur, et l'y remettre
// ---------------------------------------------------------------------------

/**
 * Le nom du fichier. Il doit se lire dans un dossier de téléchargements six
 * mois plus tard, donc il porte la graine et le jour — pas un horodatage brut.
 */
export function nomFichier(state) {
  const r = resumeSauvegarde(state);
  return `cendres-j${r.jour}-${state.seed}.json`;
}

/**
 * Relire un fichier. On refuse clairement plutôt que d'ouvrir n'importe quoi :
 * une sauvegarde d'un autre jeu, un fichier tronqué ou une partie d'avant
 * l'agrandissement de la carte donneraient un monde faux, pas un monde dégradé.
 */
export function importerTexte(txt) {
  let brut;
  try {
    brut = JSON.parse(txt);
  } catch (e) {
    return { ok: false, motif: 'Ce fichier n’est pas une sauvegarde lisible.' };
  }
  if (!brut || typeof brut !== 'object' || !brut.world || !brut.player) {
    return { ok: false, motif: 'Ce fichier ne contient pas de partie.' };
  }
  if (brut.version !== VERSION) {
    return {
      ok: false,
      motif: `Partie de version ${brut.version ?? '?'} : ce jeu lit la version ${VERSION}.`,
    };
  }
  try {
    return { ok: true, state: normaliser(brut) };
  } catch (e) {
    return { ok: false, motif: 'Partie illisible : elle est incomplète ou abîmée.' };
  }
}
