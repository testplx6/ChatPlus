import { soldeIci, monnaieIci } from './monnaie.js';
import { symboleDe } from './data.js';
// Sauvegarde locale. L'état est du JSON pur : pas de classes, pas de
// références circulaires, pas de fonctions. C'est ce qui rend possible à la
// fois la persistance navigateur et, plus tard, un envoi au serveur.

import { groupeVide } from './groupes.js';
import { grainDe } from './rng.js';
import { creerConnaissance } from './connaissance.js';
import { MENAGES } from './data.js';
import { comprimer, decomprimer, sourceLz } from './lz.js';
import { elaguerLiens } from './characters.js';
import { depouillerRuine } from './economy.js';
import { libererOrphelines } from './world.js';

export const CLE = 'cendres.save.v1';

// ---------------------------------------------------------------------------
// L'emballage : ce qui part au stockage est comprimé
// ---------------------------------------------------------------------------
//
// Une partie neuve sérialise déjà à ~250 Ko, une partie longue à 400 Ko et
// plus : le quota du stockage local finit par se fermer (« le système de
// sauvegarde ne fonctionne pas, le fichier est trop gros pour le navigateur,
// et aussi trop gros pour faire un copier-coller » — le propriétaire, août
// 2026). Le JSON du monde se comprime par cinq à dix.
//
// La règle de sûreté, non négociable : on ne retient un paquet comprimé
// qu'après l'avoir DÉCOMPRESSÉ et comparé à l'original au caractère près.
// Au moindre écart, on écrit en clair — un défaut de compression coûte des
// octets, jamais une partie. Et la lecture accepte les deux formats pour
// toujours : les sauvegardes d'avant restent lisibles.

const MARQUE = 'CZ1|';

// Le même texte revient souvent d'affilée : une action qui sauvegarde deux
// fois dans la même heure de jeu, un moment ouvert qui suspend le temps, un
// onglet à l'arrêt. On ne recompresse pas un texte déjà emballé à l'instant.
let dernierClair = null;
let dernierPaquet = null;

/** Le texte tel qu'il part au stockage (ou dans un export à copier). */
export function emballer(txt) {
  if (txt === dernierClair && dernierPaquet !== null) return dernierPaquet;
  let paquet = txt;
  try {
    const z = comprimer(txt);
    if (decomprimer(z) === txt) paquet = MARQUE + z;
  } catch (e) {
    // On écrit en clair : lourd, mais jamais faux.
  }
  dernierClair = txt;
  dernierPaquet = paquet;
  return paquet;
}

/** Le texte tel qu'on le relit — comprimé ou en clair, d'hier ou d'avant. */
export function deballer(txt) {
  if (txt == null) return txt;
  if (!txt.startsWith(MARQUE)) return txt;
  const clair = decomprimer(txt.slice(MARQUE.length));
  return clair == null ? txt : clair;
}
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
  // `base` et `camps[campActif]` sont le MÊME objet en mémoire (M4), et
  // `JSON.stringify` en écrit donc deux copies. C'est voulu, après essai de
  // l'inverse : retirer `base` de la sortie déplaçait la clé en fin d'objet au
  // rechargement — `normaliser` la repose — et l'aller-retour JSON cessait
  // d'être exact au caractère près, ce qui est un invariant déclaré du projet
  // et deux sondes du moteur.
  //
  // La duplication ne peut pas diverger : `normaliser` réunifie les deux
  // références au chargement, et rien n'écrit jamais dans `base` sans écrire
  // dans le camp — c'est le même objet.
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

  // Le portefeuille. Avant lui, `credits` était un nombre : un crédit universel
  // que tout le monde acceptait, alors que le moteur cote six monnaies. On ne
  // peut pas inventer un passé — cet argent devient un solde dans la monnaie de
  // là où le joueur se trouve, parce qu'il n'y a pas d'autre façon d'y être
  // arrivé.
  //
  // L'ancien champ est **supprimé**, pas laissé à côté : deux sources de vérité
  // pour une même somme, c'est la garantie qu'un site oublié lira la mauvaise.
  if (p && !p.bourse) {
    const g = (p.groupes || [])[0];
    const ici = g && state.world
      ? state.world.colonies.find((c) => c.regionId === g.regionId && !c.ruine) : null;
    const monnaie = (ici && ici.faction)
      || (state.world && Object.keys(state.world.factions || {})[0]) || 'hexa';
    p.bourse = {};
    if (p.credits > 0) p.bourse[monnaie] = p.credits;
  }
  if (p && p.credits !== undefined) delete p.credits;
  // Le repère de la veille des monnaies (ECONOMIE §10). Vide, il se pose tout
  // seul au premier tick : on ne peut pas inventer ce que le joueur a vu.
  if (p && !p.coursVu) p.coursVu = {};
  if (p && !Array.isArray(p.alertesMonnaie)) p.alertesMonnaie = [];

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
  // Avant l'état-major (MARECHAL.md, M5), on ne relevait pas les colonnes.
  if (!state.connaissance.armees) state.connaissance.armees = {};

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
    // Avant M4, personne ne désignait la place que la maison renforce.
    if (g.allegeance.place === undefined) g.allegeance.place = null;
    // Avant F1+F2, la cour n'avait ni mémoire du chef ni bouc émissaire.
    // (`dernierBouc` a vécu un commit : le minuteur est devenu une liste —
    // une guerre ne se met qu'une fois sur un dos, par chef.)
    if (g.allegeance.chef === undefined) g.allegeance.chef = null;
    if (!g.allegeance.boucs) g.allegeance.boucs = [];
    // Avant M7, la couronne n'avait pas de porte.
    if (g.allegeance.couronne === undefined) g.allegeance.couronne = null;
  }
  if (!state.memorial) state.memorial = [];
  // Le numéro d'ordre du journal (l'identité stable d'une entrée — voir
  // creerLogger). Une vieille partie repart de sa longueur : les entrées déjà
  // écrites gardent leur clé d'avant, les neuves sont numérotées.
  if (typeof state.journalN !== 'number') state.journalN = (state.journal || []).length;
  // Les chapitres (HISTOIRE.md, lot A) : une vieille sauvegarde n'en a pas —
  // le premier tick après chargement ouvrira celui que son état raconte.
  if (!state.player.chapitres) state.player.chapitres = [];
  if (state.player.chapitre === undefined) state.player.chapitre = null;
  if (!state.player.chapitreN) state.player.chapitreN = 0;
  // La mémoire des rencontres (HISTOIRE.md, lots B et E).
  if (!state.player.rencontres) {
    state.player.rencontres = { contrats: {}, accrochages: {}, pos: {} };
  }
  // Les sièges rachetés (SIEGE.md, S3) : avant, personne ne payait.
  if (state.player.rachats === undefined) state.player.rachats = 0;
  // E3 (prisme du propriétaire) : le compteur mondial de rachats devient une
  // mémoire située et datée. On ne sait plus QUI les vieux paiements ont
  // payé — ils entrent comme des souvenirs sans drapeau, qui s'érodent.
  // L2 (MEMOIRE.md) : le registre des faits — vide pour une vieille partie,
  // le passé est réputé su, on ne réécrit pas l'histoire.
  if (!state.player.faits) state.player.faits = [];
  // Avant la parole donnée (PAROLE.md), on ne pouvait rien promettre : une
  // partie d'avant n'a donc engagé personne.
  if (!Array.isArray(state.player.paroles)) state.player.paroles = [];
  // L4 : le guetteur des successions — vide, il se pose au premier tick sans
  // déclencher d'héritage (on ne relit pas un passé qu'on n'a pas vu).
  if (!state.player.chefs) state.player.chefs = {};
  // L5 : le guetteur des conseils (l'oubli tombe au conseil du porteur) —
  // même patron que `chefs` : vide, il se cale sans rien déclencher.
  if (!state.player.conseilsVus) state.player.conseilsVus = {};
  // L5 : le scalaire est devenu une vue du registre. Pour une partie d'avant,
  // le passé est réputé su — UN fait fondateur porte ce que chaque maison
  // pensait déjà de vous et que les faits du registre n'expliquent pas, sinon
  // la première matérialisation effacerait l'histoire.
  if (!state.player.faitsFondes) {
    state.player.faitsFondes = true;
    const somme = {};
    for (const f of state.player.faits) {
      for (const e of f.effets || []) {
        if (e.applique && !e.oublie && e.faction && e.delta !== undefined) {
          somme[e.faction] = (somme[e.faction] || 0)
            + e.delta * (e.poids === undefined ? 1 : e.poids);
        }
      }
    }
    const passe = [];
    for (const k of Object.keys(state.player.reputation || {})) {
      const manque = (state.player.reputation[k] || 0) - (somme[k] || 0);
      if (manque) passe.push({ faction: k, delta: manque, su: 0, applique: true, poids: 1 });
    }
    if (passe.length) state.player.faits.unshift({ type: 'passe', t: 0, effets: passe });
  }
  if (!state.player.rachatsFaits) {
    state.player.rachatsFaits = [];
    for (let i = 0; i < Math.min(5, state.player.rachats || 0); i++) {
      state.player.rachatsFaits.push({ faction: null, t: state.temps });
    }
  }
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
  // Avant qu'on puisse tenir du terrain, personne n'occupait rien.
  if (!w.gardes) w.gardes = [];
  for (const r of w.regions) {
    // Les routes d'avant les secteurs : sûres par défaut, elles se dégraderont
    // toutes seules si personne ne les tient.
    if (r.insecurite === undefined) r.insecurite = 0;
    // Avant les pistes, on traversait une friche vierge à chaque passage.
    if (r.piste === undefined) r.piste = 0;
    // Avant qu'on puisse tenir du terrain, personne n'occupait rien.
    if (r.garde === undefined) r.garde = null;
    // Une partie d'avant la Faille n'en a pas : sa carte reste ce qu'elle
    // était, on ne creuse pas un gouffre sous les pieds d'une partie en cours.
    if (r.faille === undefined) r.faille = false;
  }
  // Les couleurs orphelines des parties d'avant : une case tenue par un drapeau
  // qui n'a plus une seule ville dessus ni à côté redevient libre. Le halo n'a
  // jamais été relu jusqu'ici, et une partie longue en accumule (vingt-trois en
  // quinze cents heures, parfois au nom d'un pays éteint). Voir TERRITOIRE.md,
  // A5 — le défaut ne doit pas survivre à sa correction.
  libererOrphelines(w);
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
    // Avant la réforme de l'investissement, personne ne notait ce qu'une
    // ville verse à son pays : elle n'a encore rien versé de mesuré.
    if (c.remonte === undefined) c.remonte = 0;
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
    // La satiété : rassasiée jusqu'à preuve du contraire. Le premier tick la
    // corrige, et une partie déjà commencée ne doit pas naître affamée.
    if (typeof c.satiete !== 'number') c.satiete = 1;
    // Le bureau de change : les grandes places en tiennent un, comme dans un
    // monde neuf. Une partie d'avant ne doit pas se retrouver sans un seul
    // endroit où changer de monnaie.
    if (typeof c.change !== 'boolean') c.change = !c.avantPoste && (c.taille || 1) >= 2;
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
  // Les camps (M4). Une partie d'avant ce lot n'a que `base` : il entre dans la
  // liste, et rien d'autre ne change pour elle. Une partie d'après n'a que la
  // liste : on rétablit le regard, qui n'est jamais sauvé.
  if (!Array.isArray(state.camps) || !state.camps.length) {
    state.camps = state.base ? [state.base] : [];
    state.campActif = 0;
  }
  if (!(state.campActif >= 0 && state.campActif < state.camps.length)) state.campActif = 0;
  if (state.camps.length) state.base = state.camps[state.campActif];

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
    // Avant que ce qui sort du camp ne se raconte (P6), aucune charge n'était
    // datée : un camp d'avant n'a rien à faire dire à ses colporteurs.
    if (!Array.isArray(b.charges)) b.charges = [];
    if (b.majVitrine === undefined) b.majVitrine = -999;
    if (b.majEmploi === undefined) b.majEmploi = -999;
    if (b.gaspilleJour === undefined) b.gaspilleJour = 0;
    if (b.dernierGaspillage === undefined) b.dernierGaspillage = -999;
    if (b.dechets === undefined) b.dechets = 0;
    if (b.terraforme === undefined) b.terraforme = null;
    // Avant, un raid naissait à l'heure où il frappait : rien à annoncer.
    if (b.raidImminent === undefined) b.raidImminent = null;
    // Avant, les murs ne s'usaient pas : ils tombaient d'un niveau entier.
    if (b.brecheEtat === undefined) b.brecheEtat = 1;
    // Avant, rien ne se montait au camp : ni charrette, ni lame.
    if (!b.fileFab) b.fileFab = [];
    // Avant, la milice était des silhouettes jetables : personne n'y mourait
    // pour de bon.
    if (!b.miliceMorts) b.miliceMorts = [];
    // Avant, un raid repoussé ne se racontait pas.
    if (b.dernierRepousse === undefined) b.dernierRepousse = null;
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
  // Le temps hors ligne. Une partie d'avant le réglage s'ouvre le monde à
  // l'arrêt : on n'inflige à personne un rattrapage qu'il n'a pas demandé.
  if (!state.reglages) state.reglages = { rattrapage: false };
  if (typeof state.reglages.rattrapage !== 'boolean') state.reglages.rattrapage = false;
  // Le confort de l'écran : tout par défaut, allégé si la machine peine.
  if (typeof state.reglages.allege !== 'boolean') state.reglages.allege = false;
  // Les ruines rendent ce qu'elles n'ont plus à porter — y compris dans une
  // partie déjà bien avancée, où elles se comptent par centaines. C'est du
  // poids rendu au joueur, pas une règle de jeu qui change : une ruine n'avait
  // déjà ni habitants, ni marché, ni conseil.
  for (const col of (state.world && state.world.colonies) || []) depouillerRuine(col);
  // Et les gens rendent ce qu'ils ne peuvent pas retenir. Une partie d'avant le
  // cercle de six voisins porte un lien de chacun vers chacun : à mille deux
  // cents personnes, un million quatre cent mille entrées que plus rien ne lit,
  // et vingt mégaoctets à traverser à chaque écriture. Ce qui se voit — les
  // voisins, l'ami, le rival — est préservé : ce sont les liens les plus
  // marqués, et ce sont ceux qu'on garde.
  for (const g of (state.player && state.player.groupes) || []) {
    for (const m of g.membres || []) elaguerLiens(m);
  }
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
    const brut = JSON.parse(deballer(txt));
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

// ---------------------------------------------------------------------------
// Le fil de côté : comprimer ailleurs que sous le doigt
// ---------------------------------------------------------------------------
//
// Mesuré au profileur, processeur bridé six fois (un téléphone) : sérialiser
// puis comprimer une partie de 6 000 h gelait le fil principal ~370 ms toutes
// les cinq secondes — « ça rame tellement que c'est devenu injouable ». Le
// travail ne peut pas beaucoup maigrir : ce sont 437 000 caractères à lire.
// Il part donc dans un fil de côté, qui comprime ET vérifie ; le fil du jeu ne
// garde que la sérialisation et la pose.
//
// Trois refuges, dans cet ordre : le fil s'il existe ; la compression sur
// place s'il n'existe pas (page isolée, fil refusé) ; le texte en clair si la
// compression se trompe. Aucun de ces chemins ne perd de partie.

let fil = null;
let filRefuse = false;
/** Vrai dès que le stockage a refusé du texte en clair : il faut comprimer. */
let compressionObligee = false;
let jetonEcriture = 0;
let enVol = null;

function filCompression() {
  if (fil || filRefuse) return fil;
  try {
    const blob = new Blob([sourceLz()], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    fil = new Worker(url);
    URL.revokeObjectURL(url);
    fil.onerror = () => { filRefuse = true; try { fil.terminate(); } catch (e) { /* rien */ } fil = null; };
    fil.onmessage = (ev) => {
      const d = ev.data || {};
      if (!enVol || d.jeton !== enVol.jeton) return;
      const { txt, apres } = enVol;
      enVol = null;
      const paquet = d.paquet ? MARQUE + d.paquet : txt;
      dernierClair = txt;
      dernierPaquet = paquet;
      apres(poser(paquet));
    };
  } catch (e) {
    filRefuse = true;
    fil = null;
  }
  return fil;
}

/** Poser un texte déjà emballé, et dire ce que ça a donné. */
function poser(txt) {
  const s = stockage();
  if (!s) return { ok: false, motif: MOTIF_SANS_STOCKAGE };
  try {
    s.setItem(CLE, txt);
    return { ok: true, taille: txt.length };
  } catch (e) {
    return { ok: false, taille: txt.length, motif: motifPlein() };
  }
}

/**
 * Écrire la partie sans faire attendre le doigt. `apres` reçoit le même compte
 * rendu que `sauvegarder`, tout de suite ou dans un instant.
 */
export function sauvegarderAilleurs(state, apres) {
  const s = stockage();
  if (!s) { apres({ ok: false, motif: MOTIF_SANS_STOCKAGE }); return; }
  const txt = serialiser(state);
  // Rien n'a bougé depuis la dernière écriture : on repose le même paquet.
  if (txt === dernierClair && dernierPaquet !== null) { apres(poser(dernierPaquet)); return; }
  const f = filCompression();
  // Pas de fil de côté (page isolée, navigateur sans fils, bac à sable qui les
  // refuse) : on ne comprime PAS sur le fil du jeu. La compression n'existe que
  // pour le jour où le stockage se ferme — tant que le texte en clair passe, il
  // passe, et le doigt ne paie rien. S'il est refusé une fois, on comprime, et
  // l'on comprimera désormais d'emblée.
  if (!f) {
    if (!compressionObligee) {
      const direct = poser(txt);
      if (direct.ok) { apres(direct); return; }
      compressionObligee = true;
    }
    apres(sauvegarder(state));
    return;
  }
  // Une écriture est déjà en route : celle-ci attendra le battement suivant —
  // la partie n'aura pas changé de beaucoup, et c'est toujours la dernière qui
  // gagne.
  if (enVol) return;
  const jeton = ++jetonEcriture;
  enVol = { jeton, txt, apres };
  // Si le fil ne répond pas, on n'attend pas la fin des temps : on écrit sur
  // place et on ne s'y fie plus.
  setTimeout(() => {
    if (!enVol || enVol.jeton !== jeton) return;
    const attendu = enVol;
    enVol = null;
    filRefuse = true;
    try { if (fil) fil.terminate(); } catch (e) { /* rien */ }
    fil = null;
    attendu.apres(poser(emballer(attendu.txt)));
  }, 8000);
  f.postMessage({ jeton, texte: txt });
}

const MOTIF_SANS_STOCKAGE = 'Ce navigateur refuse le stockage local : navigation privée, page '
  + 'isolée, ou réglage de confidentialité. La partie tourne, mais rien '
  + 'n’est écrit et tout sera perdu en fermant l’onglet.';

function motifPlein() {
  const p = poidsEmplacements();
  return p.n
    ? `Écriture refusée : le stockage est plein. Vos ${p.n} sauvegarde${p.n >= 2 ? 's' : ''} `
      + `gardées occupent ${(p.octets / 1048576).toFixed(1)} Mo — en supprimer `
      + 'une libérera la place.'
    : 'Écriture refusée : le stockage du navigateur est plein.';
}

/**
 * Écrire la partie ICI, tout de suite, fil principal compris. C'est le chemin
 * des moments où l'on n'a plus le temps : fermeture d'onglet, passage en
 * arrière-plan, export. Partout ailleurs, `sauvegarderAilleurs` évite au doigt
 * de payer la compression.
 */
export function sauvegarder(state) {
  const s = stockage();
  if (!s) return { ok: false, motif: MOTIF_SANS_STOCKAGE };
  return poser(emballer(serialiser(state)));
}

export function charger() {
  const s = stockage();
  if (!s) return null;
  const txt = s.getItem(CLE);
  if (!txt) return null;
  try {
    return deserialiser(deballer(txt));
  } catch (e) {
    return null;
  }
}

/**
 * Le texte en clair de la partie stockée — pour l'export à copier et pour le
 * harnais de test, qui lit la sauvegarde sans connaître son emballage.
 */
export function lireTexteSauvegarde(cle = CLE) {
  const s = stockage();
  if (!s) return null;
  const txt = s.getItem(cle);
  return txt == null ? null : deballer(txt);
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
    // Ce qu'on a **là où l'on est**, avec son signe — pas un total. Il n'existe
    // pas d'unité pour écrire la somme de six monnaies, et `valeurBourse` ne
    // sort qu'au bureau de change (ECONOMIE §10).
    argent: Math.round(soldeIci(state)),
    signe: symboleDe(state.world, monnaieIci(state)),
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
  const txt = emballer(serialiser(state));
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
    return deserialiser(deballer(txt));
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
    // Un export comprimé se colle comme un export en clair.
    brut = JSON.parse(deballer((txt || '').trim()));
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
