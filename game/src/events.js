import {
  gagner, regler, soldeIci, signeIci, monnaieIci, entrerDehors, taux,
} from './monnaie.js';
import { commettre } from './faits.js';
import { auCamp, savoir } from './base.js';
import { lieePar } from './pactes.js';
// Journal de bord et rencontres. Tout se résout automatiquement selon la
// posture et les consignes de l'escouade : c'est ce qui permet à la simulation
// de tourner pendant que le joueur est hors ligne.

import {
  FACTIONS, POSTURES, COMMODITIES, COMMODITY_KEYS, ITEMS, BIOMES,
  POI, SKILLS, SKILL_KEYS, PALIERS_ITEM, SURNOMS, TRAITS, drapeauDe,} from './data.js';
import { colonieDe, voisins, nomRegion, distance } from './world.js';
import { compterVictoire } from './contrats.js';
import {
  compterVictoireOrdre, crediter, estAuService, rangDe, renfortsDisponibles, avantage,
} from './allegeance.js';
import { genererBande, resoudreCombat, butin } from './combat.js';
import { perdreBete, visibiliteAttelage } from './betes.js';
import { menace } from './secteur.js';
import { capturables, fairePrisonniers } from './justice.js';
import { paroleAvec } from './parole.js';
import { rendementCohesion } from './groupes.js';
import {
  comp, gagnerXp, estDebout, estVivant, makeCharacter, blesser, pvTotal,
  ajusterLien, XP_PRATIQUE, LIENS,
} from './characters.js';
import { poidsInventaire, capacitePortage, encaisser } from './economy.js';
import {
  groupeActif, groupes, tousLesMembres, debout as deboutDe, tactiqueDe,
} from './groupes.js';
import { estSurveillee } from './connaissance.js';
import { occupeParEcole } from './formation.js';
import { noterAuRapport } from './rapport.js';
import { noterArgent, retenirAccrochage } from './rapport.js';

export const LOG_MAX = 400;

export function creerLogger(state) {
  return (entree) => {
    // Un numéro d'ordre monotone : l'identité STABLE d'une entrée. L'ancre de
    // lecture s'accrochait à « heure + début du texte », et une rafale de
    // guerre loggue plusieurs entrées à la même heure avec le même préfixe
    // (« X lève une colonne… » ×2) : l'ancre retrouvait le premier doublon et
    // la lecture sautait — vu par le garde navigateur, au pixel près.
    state.journalN = (state.journalN || 0) + 1;
    const e = Object.assign({ t: state.temps, n: state.journalN }, entree);
    // Témoin ou pas : ce qui arrive sous les yeux de l'escouade est su tout de
    // suite, le reste met le temps de la route (voir `nouvellesConnues`).
    if (e.regionId != null && e.vu === undefined) e.vu = estSurveillee(state, e.regionId);
    state.journal.push(e);
    if (state.journal.length > LOG_MAX) state.journal.splice(0, state.journal.length - LOG_MAX);
    // Le journal oublie — quatre cents lignes, et une longue absence en produit
    // des milliers. Le rapport, lui, retient. Voir rapport.js.
    noterAuRapport(state, e);
    // La cloche du journal (la pastille de la barre) ne sonne que pour ce que
    // l'escouade a VU ou pour ce qui n'a pas de lieu — la solde, l'argent,
    // les affaires du joueur. Cent douze émetteurs déclarent « important »,
    // guerres lointaines comprises : compter tout, c'était afficher 99 après
    // chaque absence, un chiffre qui décore au lieu d'informer. Le journal et
    // le filtre « Marquant » gardent tout — on ne perd rien, on cesse de
    // crier (INTERFACE.md, U5).
    if (e.important && e.vu !== false) state.nonLus = (state.nonLus || 0) + 1;
    return e;
  };
}

// ---------------------------------------------------------------------------
// Utilitaires d'inventaire
// ---------------------------------------------------------------------------

/** Ce qu'un groupe peut encore porter. Chacun porte le sien. */
export function ajouterAuSac(state, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  if (!g || qte <= 0) return 0;
  const cap = capacitePortage(state, g);
  const libre = cap - poidsInventaire(g.inventaire);
  const poidsU = COMMODITIES[key] ? COMMODITIES[key].poids : 1;
  const max = poidsU > 0 ? Math.floor(libre / poidsU) : qte;
  const reel = Math.max(0, Math.min(Math.floor(qte), max));
  if (reel > 0) g.inventaire[key] = (g.inventaire[key] || 0) + reel;
  return reel;
}


/**
 * Qui tient le barrage, concrètement. Un péage n'est pas une propriété du
 * terrain : ce sont des hommes, et ils viennent de quelque part. La ville
 * vivante la plus proche, sous ce drapeau — depuis `libererOrphelines`
 * (TERRITOIRE.md, A5), une case tenue en a toujours une à portée.
 */
export function villeDuBarrage(world, faction, regionId) {
  if (!faction || !world.factions[faction]) return null;
  let place = null;
  let mieux = Infinity;
  for (const c of world.colonies) {
    if (c.ruine || c.faction !== faction) continue;
    const d = distance(c.regionId, regionId);
    if (d < mieux) { mieux = d; place = c; }
  }
  return place;
}

/**
 * Ce que le barrage prélève, quelqu'un l'encaisse.
 *
 * Avant, non : `regler` débitait la bourse du joueur et la somme n'entrait
 * dans aucune caisse ni dans aucune masse — quarante à deux cent vingt unités
 * qui s'évaporaient à chaque barrage. Tenir une case ne rapportait donc rien à
 * qui la tenait, et le péage n'était rien d'autre qu'une friction dirigée
 * contre le joueur (l'odeur n°3 de l'AUDIT). Lui donner un agent, c'est le
 * faire entrer quelque part.
 *
 * `paye` est la monnaie dans laquelle le joueur a réglé. Si ce n'est pas celle
 * du drapeau, la somme entre au cours du jour — le même chemin qu'une ville qui
 * change de drapeau (`saisir`), et la seule façon de ne créer ni détruire de la
 * monnaie en route. Rend ce qui est réellement entré.
 */
export function percevoirPeage(state, faction, regionId, montant, paye) {
  const world = state.world;
  const place = villeDuBarrage(world, faction, regionId);
  if (!place || !(montant > 0)) return 0;
  const recu = paye === faction ? montant : montant * taux(world, paye, faction);
  if (!(recu > 0)) return 0;
  // La paire obligatoire : ce qui entre en caisse entre aussi dans la masse,
  // parce que la bourse du joueur est hors de tout registre (« la règle des
  // deux », voir `entrerDehors`). L'impôt monte au trésor comme sur toute
  // recette — c'est `encaisser` qui le sait.
  encaisser(world, place, recu);
  entrerDehors(world, faction, recu);
  return recu;
}

function factionDominante(state, regionId) {
  const r = state.world.regions[regionId];
  if (r.controle) return r.controle;
  const col = colonieDe(state.world, regionId);
  return col ? col.faction : null;
}

// ---------------------------------------------------------------------------
// Mémoire des morts
// ---------------------------------------------------------------------------

/**
 * Un mort laisse une fiche, pas une ligne qui défile. C'est ce qui donne du
 * poids à une escouade qu'on a fait progresser pendant deux cents heures.
 */
export function inscrireAuMemorial(state, c, cause, lieu) {
  if (!state.memorial) state.memorial = [];
  if (state.memorial.some((m) => m.id === c.id)) return;
  const meilleure = SKILL_KEYS.reduce(
    (best, k) => (c.skills[k] > (c.skills[best] ?? 0) ? k : best), SKILL_KEYS[0]
  );
  state.memorial.push({
    id: c.id,
    nom: c.nom,
    archetype: c.archetypeNom,
    t: state.temps,
    cause,
    lieu,
    kills: c.kills,
    horsCombat: c.horsCombat || 0,
    traits: (c.traits || []).slice(0, 3),
    meilleure: `${SKILLS[meilleure]} ${c.skills[meilleure]}`,
    // Le fil personnel part avec la stèle (HISTOIRE.md, lot C) : ce qui
    // reste ouvert se dira au mémorial. Copie simple — le texte se rend à
    // l'affichage, ce module n'a pas à connaître l'histoire.
    fil: c.fil || null,
  });
  if (state.memorial.length > 60) state.memorial.shift();
}

// ---------------------------------------------------------------------------
// Combat impliquant le joueur
// ---------------------------------------------------------------------------

/** Photographie des compétences, pour pouvoir annoncer les progrès après coup. */
function instantaneComps(squad) {
  const m = {};
  for (const c of squad) m[c.id] = Object.assign({}, c.skills);
  return m;
}

function annoncerProgres(state, avant, log, membres) {
  for (const c of membres) {
    const a = avant[c.id];
    if (!a) continue;
    const montees = SKILL_KEYS.filter((k) => c.skills[k] > (a[k] ?? 0));
    if (!montees.length) continue;
    log({
      type: 'progres',
      texte: `${c.nom} progresse : ${montees.map((k) => `${SKILLS[k]} ${c.skills[k]}`).join(', ')}.`,
    });
  }
}

/**
 * Perdre contre les chasseurs solde l'affaire : ils ont eu ce qu'ils
 * voulaient, la prime retombe — sinon elle s'auto-entretient et il n'existe
 * aucune sortie. Mais l'estime ne bouge pas d'un point (PROMESSES.md, P4) :
 * se faire battre n'a jamais fait aimer personne, et la dette de réputation
 * reste une dette — c'est la simulation qui le dit, pas l'équilibrage.
 */
/** La fouille, réglée. Objet mutable, calibrable. */
export const FOUILLE = { bourseCachee: 0.5, part: [0.25, 0.55] };

/**
 * Le détroussage est une fouille (PROMESSES.md, P3) : le voleur prend tout
 * ce qu'il peut trouver — doctrine du propriétaire — mais il ne trouve pas
 * forcément tout. La bourse d'ici, celle qu'on a en main pour vivre, est
 * toujours trouvée ; les autres se cachent mieux, et un fouilleur pressé
 * peut les rater. Un billet étranger n'est ni un talisman ni un dû : c'est
 * un billet. Le coffre en ville reste l'abri sûr — il n'est pas sur vous.
 */
export function detrousser(state, rng) {
  const ici = monnaieIci(state);
  const bourse = (state.player && state.player.bourse) || {};
  let total = 0;
  for (const m of Object.keys(bourse)) {
    if (!(bourse[m] > 0)) continue;
    if (m !== ici && !rng.chance(FOUILLE.bourseCachee)) continue;
    const pris = Math.round(bourse[m] * rng.range(FOUILLE.part[0], FOUILLE.part[1]));
    if (pris <= 0) continue;
    regler(state, pris, m);
    noterArgent(state, 'détroussé après une défaite', -pris);
    total += pris;
  }
  return total;
}

export function solderPrime(state, k, log) {
  const primes = state.player.primes || {};
  primes[k] = Math.max(0, (primes[k] || 0) - 1);
  log({
    type: 'prime_tete',
    texte: `${drapeauDe(state.world, k).nom} considère l’affaire réglée. La prime retombe.`,
    important: true,
  });
}

export function combatContre(state, bande, log, ctx, groupe) {
  const rng = ctx.rng;
  const g = groupe || groupeActif(state);
  const compsAvant = instantaneComps(g.membres);
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const squad = g.membres.filter(estVivant);
  // Un élève à l'école ne monte pas au feu : il est en ville, pas au campement.
  const combattants = squad.filter((c) => c.etat !== 'mort' && !occupeParEcole(c));

  // La milice du camp (SIEGE.md, S1) : levée sur place par `raidSurLaBase`,
  // elle se bat cette bataille-là et retourne à ses bacs — ses morts se
  // décomptent de la population au retour, pas ici.
  const renforts = ctx.renfortsLocaux ? ctx.renfortsLocaux.slice() : [];

  // À partir de Capitaine, les siens viennent prêter main-forte chez eux.
  const nbRenforts = renfortsDisponibles(state, g);
  for (let i = 0; i < nbRenforts; i++) {
    const allie = makeCharacter(rng, { niveau: 2 });
    allie.equip.armure = allie.equip.armure || 'plaque';
    allie.renfort = true;
    renforts.push(allie);
  }
  if (nbRenforts > 0) {
    log({
      type: 'renfort',
      texte: `${nbRenforts} homme${nbRenforts > 1 ? 's' : ''} ${drapeauDe(state.world, g.allegeance.faction).genitif} accourent.`,
      regionId: g.regionId,
    });
  }

  const res = resoudreCombat(combattants.concat(renforts), bande.membres, {
    rng,
    biome: state.world.regions[g.regionId].biome,
    posture,
    bonusDegats: savoir(state, 'balistique') * 0.1,
    bonusArmure: savoir(state, 'blindage') * 0.1,
    // On n'achève pas les hommes à terre sans l'avoir décidé. À 0,06 « par
    // défaut », l'escouade assassinait des blessés que personne ne lui avait
    // demandé de tuer — et se privait des prisonniers qui vont avec.
    letalA: state.player.politique.achever ? 0.45 : 0,
    cohA: rendementCohesion(g),
    letalB: bande.letal,
    // Comment on se bat : décidé à l'avance, valable aussi en votre absence —
    // et par colonne (PROMESSES.md, P2) : celle des marais peut harceler
    // pendant que celle des murs tient la ligne.
    tactique: tactiqueDe(state, g),
    viserChefs: !!state.player.politique.viserChefs,
  });

  // On ne repart pas en marche avec un homme sur les bras.
  //
  // Une victoire ne touchait pas à l'ordre en cours : on gagnait le combat et la
  // colonne reprenait sa route, blessés compris, jusqu'à la rencontre suivante —
  // sans qu'on ait eu l'occasion de décider quoi que ce soit. Seule une défaite
  // arrêtait la marche. C'est la moitié du problème que pose une route longue :
  // on ne peut pas réagir à ce qui arrive dessus.
  if (state.player.politique.halte && g.ordre && g.ordre.type === 'voyage'
    && g.membres.some((c) => c.etat === 'ko')) {
    g.ordre = { type: 'repos' };
    log({
      type: 'ordre',
      texte: `${g.nom} : quelqu’un est à terre, la marche s’arrête ici.`,
      important: true,
      regionId: g.regionId,
      groupe: g.id,
    });
  }

  const lieu = nomRegion(state.world, g.regionId);
  let texte;
  if (res.vainqueur === 'A') {
    const b = butin(bande, rng);
    let ramasse = 0;
    for (const k of Object.keys(b.loot)) ramasse += ajouterAuSac(state, k, b.loot[k], g);
    gagner(state, b.credits);
    noterArgent(state, 'butin', b.credits);
    for (const o of b.objets) {
      if (g.objets.length < 30) g.objets.push(o);
    }
    // Une bataille gagnée est UN fait, et il nomme tous ses publics (L5) :
    // la maison battue, et les ennemis d'un ennemi, qui apprécient.
    const publics = [{ faction: bande.faction, delta: -6, su: state.temps }];
    for (const k of Object.keys(state.world.factions)) {
      if (k === bande.faction || k === 'essaim') continue;
      const enGuerre = state.world.guerres.some(
        (w) => (w.a === k && w.b === bande.faction) || (w.b === k && w.a === bande.faction)
      );
      if (enGuerre) publics.push({ faction: k, delta: 2, su: state.temps });
    }
    commettre(state, {
      type: 'bataille', regionId: g.regionId, t: state.temps, effets: publics,
    });
    state.stats.combatsGagnes++;
    compterVictoire(state, bande.faction);
    compterVictoireOrdre(state, bande.faction);
    // Frapper un ennemi déclaré de sa faction, c'est du service rendu.
    const all = g.allegeance;
    if (all && bande.faction && bande.faction !== all.faction) {
      const enGuerreAvec = state.world.guerres.some(
        (w) => (w.a === all.faction && w.b === bande.faction) || (w.b === all.faction && w.a === bande.faction)
      );
      if (enGuerreAvec) crediter(state, 28, log, 'Ennemi déclaré abattu');
    }
    // Ceux qui sont à terre sans être morts. On ne les laisse plus s'évaporer :
    // c'est la seule question du jeu à laquelle le butin ne répond pas.
    const pris = fairePrisonniers(state, g, bande, capturables(g, bande), log);
    texte = `${bande.nom} mis en déroute à ${lieu} — ${ramasse} unités et ${b.credits} ${signeIci(state)} récupérés`
      + `${pris.length ? `, ${pris.length} prisonnier${pris.length > 1 ? 's' : ''}` : ''}.`;
  } else if (res.vainqueur === 'B') {
    texte = perdreCombat(state, bande, log, ctx, lieu, g);
  } else if (res.fuite === 'degage') {
    texte = `${g.nom} décroche de ${bande.nom} à ${lieu} sans laisser personne. `
      + `On n’a rien pris, on n’a rien perdu.`;
  } else {
    texte = `Accrochage indécis avec ${bande.nom} à ${lieu}. Chacun décroche.`;
  }

  state.stats.combats++;
  const morts = g.membres.filter((c) => c.etat === 'mort' && !c._compte);
  for (const m of morts) {
    m._compte = true;
    inscrireAuMemorial(state, m, `tombé face à ${bande.nom}`, lieu);
    log({ type: 'mort', texte: `${m.nom} est mort à ${lieu}.`, important: true });
  }
  // Un groupe qui perd des siens se délite ; une victoire ressoude.
  g.cohesion = Math.max(0, Math.min(100,
    (g.cohesion ?? 55) + (res.vainqueur === 'A' ? 2.5 : -4) - morts.length * 9));

  // Ceux qui survivent finissent par se faire un nom.
  for (const c of g.membres) {
    if (c.etat === 'mort' || c.surnomGagne) continue;
    const membrePerdu = Object.keys(c.corps).some((k) => c.corps[k].perdu);
    // On compte les mises hors de combat, pas seulement les morts : les ennemis
    // tombent K.O. bien plus souvent qu'ils ne meurent, et achever est
    // désactivé par défaut. À dix-huit *morts*, le seuil n'était jamais atteint
    // par personne — on ne se faisait un nom qu'en perdant un membre.
    if ((c.horsCombat || 0) >= 14 || membrePerdu) {
      c.surnomGagne = true;
      const avant = c.nom;
      c.nom = `${c.nom.split(' ')[0]} ${rng.pick(SURNOMS)}`;
      if (c.nom !== avant) {
        log({ type: 'surnom', texte: `On ne l’appelle plus ${avant}, mais ${c.nom}.`, important: true });
      }
    }
  }

  // Sortir vivants du même combat rapproche ; y laisser quelqu'un aussi, mais
  // dans l'autre sens pour ceux qui n'ont pas tenu leur poste.
  //
  // On ne se rapproche pas de mille personnes en une bataille : on se
  // rapproche de ceux avec qui on s'est battu côte à côte. Même cercle que la
  // cohésion — en dessous de treize debouts, la portée couvre tout le monde et
  // c'est exactement le calcul d'avant. Au-delà, cette boucle était carrée :
  // mille deux cents debouts, c'était sept cent mille liens créés par combat,
  // et c'est par là que le tas de liens se reformait.
  const debouts = g.membres.filter(estDebout);
  const nd = debouts.length;
  const portee = Math.min(LIENS.cercle, Math.floor(nd / 2));
  for (let d = 1; d <= portee; d++) {
    // À portée exactement égale à la moitié, i et i+d désignent la même paire
    // vue des deux bouts : on ne la compte qu'une fois.
    const moitie = d * 2 === nd;
    for (let i = 0; i < (moitie ? nd / 2 : nd); i++) {
      ajusterLien(debouts[i], debouts[(i + d) % nd], res.vainqueur === 'A' ? 7 : 3);
    }
  }
  for (const tombe of g.membres.filter((c) => c.etat === 'ko')) {
    // Celui qui est tombé en veut à ceux qui étaient autour de lui, pas à
    // toute l'escouade — il n'a pas vu le reste.
    for (let i = 0; i < Math.min(debouts.length, LIENS.cercle * 2); i++) {
      ajusterLien(tombe, debouts[i], -2);
    }
  }

  annoncerProgres(state, compsAvant, log, g.membres);

  // La figure de l'ennemi récurrent (HISTOIRE.md, lot B) : au troisième
  // accrochage avec la même faction, la dépêche le dit.
  const nAcc = retenirAccrochage(state, bande.faction);
  if (nAcc >= 3) {
    texte += ` Ce n’est plus un hasard : ${nAcc}e accrochage avec `
      + `${drapeauDe(state.world, bande.faction).nom}.`;
  }

  log({
    type: 'combat',
    texte,
    important: true,
    regionId: g.regionId,
    groupe: g.id,
    // On garde le début de l'échange et son épilogue : le détail complet
    // noie l'écran sur mobile.
    detail: res.journal.length > 12
      ? res.journal.slice(0, 7).map((j) => j.txt)
        .concat([`… ${res.journal.length - 12} échanges …`])
        .concat(res.journal.slice(-5).map((j) => j.txt))
      : res.journal.map((j) => j.txt),
  });
  return res;
}

function perdreCombat(state, bande, log, ctx, lieu, g) {
  const rng = ctx.rng;
  state.stats.defaites++;

  if (bande.faction === 'essaim') {
    // L'Essaim ne fait pas de prisonniers
    for (const c of g.membres) {
      if (c.etat === 'ko' && rng.chance(0.3)) {
        blesser(c, 40, 'torse', rng, { letal: true });
      }
    }
    return `L’Essaim submerge l’escouade à ${lieu}.`;
  }

  // Dépouillés et abandonnés plus loin : on survit, on repart de rien — mais
  // pas le ventre vide. Rafler jusqu'à la dernière ration enclenche une
  // spirale : battu, donc affamé, donc incapable de se poser pour récupérer,
  // donc battu de nouveau. Ces gens veulent ce qui se revend, pas des cadavres.
  const bouches = Math.max(1, g.membres.filter(estVivant).length);
  const planchers = { rations: bouches * 5, medkit: 1 };
  let perdu = 0;
  for (const k of COMMODITY_KEYS) {
    const q = g.inventaire[k] || 0;
    const garde = Math.min(q, planchers[k] || 0);
    const pris = Math.round((q - garde) * rng.range(0.4, 0.75));
    g.inventaire[k] = q - pris;
    perdu += pris;
  }
  // On garde de quoi repartir : tout rafler à chaque défaite interdit
  // définitivement de s'équiper, donc de cesser de perdre.
  const cr = detrousser(state, rng);
  if (g.objets.length && rng.chance(0.6)) {
    g.objets.splice(rng.int(g.objets.length), 1);
  }
  // Une bête se mène toute seule et se revend bien : c'est la première chose
  // qu'on emmène. C'est aussi ce qui fait qu'on y tient.
  perdreBete(g, rng, log);
  commettre(state, {
    type: 'bataille', regionId: g.regionId, t: state.temps,
    effets: [{ faction: bande.faction, delta: -3, su: state.temps }],
  });

  // On se réveille ailleurs, quelques heures plus tard. Dépouillés, pas égorgés :
  // ces gens voulaient le sac, pas les cadavres.
  const options = voisins(g.regionId);
  if (options.length) g.regionId = rng.pick(options);
  g.ordre = { type: 'repos' };
  for (const c of g.membres) {
    if (c.etat === 'mort') continue;
    c.sang = Math.min(c.sang, 6);
    if (c.etat === 'ko') c.koHeures = Math.max(c.koHeures, rng.irange(4, 12));
  }
  // La fouille peut mélanger les monnaies : on compte des pièces, pas un signe.
  return `${g.nom} battu à ${lieu} : ${perdu} unités emportées, les bourses fouillées`
    + `${cr > 0 ? ` (${cr} en pièces)` : ''}, réveil à ${nomRegion(state.world, g.regionId)}.`;
}

// ---------------------------------------------------------------------------
// Table de rencontres
// ---------------------------------------------------------------------------

/**
 * Passe-t-on le barrage sans payer, et à quel titre ?
 *
 * Deux raisons, et elles se valent au poste de garde : on sert ce drapeau —
 * les siens ne rançonnent pas les leurs, dès le grade d'Agent —, ou l'on a
 * donné et reçu sa parole là-dessus. « Laisser passer » se signait depuis deux
 * semaines et ne faisait rien : la clause était une ligne dans un contrat que
 * personne ne lisait à la barrière.
 *
 * Rend `'service'`, `'pacte'`, ou `null` — le motif change ce que le garde
 * dit, et c'est tout ce qui les distingue.
 */
export function laissePasser(state, g, f) {
  if (!f || f === 'bandits') return null;
  const grade = g && g.allegeance && g.allegeance.faction === f ? rangDe(g.allegeance) : null;
  if (grade && grade.index >= 1) return 'service';
  const mien = state.player && state.player.drapeau;
  if (mien && lieePar(state.world, mien, f, 'passage')) return 'pacte';
  return null;
}

export function bandeLocale(state, ctx, groupe) {
  const rng = ctx.rng;
  const g = groupe || groupeActif(state);
  const regionId = g.regionId;
  const dominante = factionDominante(state, regionId);
  const repu = dominante ? (state.player.reputation[dominante] || 0) : 0;

  // Une faction dont on est mal vu envoie ses hommes ; sinon, la faune du coin.
  // Une prime en cours fait sortir sa cible du bois : accepter un contrat
  // change ce qu'on rencontre, sinon on ne peut jamais l'honorer.
  const vises = new Set(
    state.player.contrats.filter((c) => c.type === 'prime').map((c) => c.cibleFaction)
  );

  // Une guerre déclarée change ce qu'on croise. Sur les terres d'une faction en
  // guerre contre celle qu'on sert, ce ne sont plus des pillards qui sortent du
  // décor : ce sont ses hommes, et ils vous cherchent.
  //
  // Sans ça, l'ordre de frappe était une loterie truquée. Mesuré au banc : un
  // bot qui laisse tout tomber pour aller camper en pays ennemi pendant toute
  // la durée de l'ordre acquiert quatre victoires sur les cinquante-deux
  // demandées — parce que même chez eux, trois rencontres hostiles sur quatre
  // étaient des bandits. On ratait un ordre sur dix reçus, et rater coûte de
  // l'estime : la guerre démolissait la carrière de ceux qui la faisaient.
  const mienne = g.allegeance && g.allegeance.faction;
  const guerreIci = !!(mienne && dominante && dominante !== mienne
    && state.world.guerres.some(
      (w) => (w.a === mienne && w.b === dominante) || (w.b === mienne && w.a === dominante)
    ));

  let faction;
  if (dominante && repu < -25 && rng.chance(0.6)) faction = dominante;
  else {
    const poids = [
      ['bandits', 3 + (vises.has('bandits') ? 3 : 0)],
      ['essaim', state.world.regions[regionId].biome === 'plastique' ? 2.2 : 1.1],
    ];
    if (dominante) {
      poids.push([dominante, (guerreIci ? 7 : 1.4) + (vises.has(dominante) ? 3 : 0)]);
    }
    // Une faction visée par contrat peut aussi croiser la route hors de chez elle.
    for (const v of vises) {
      if (v !== 'bandits' && v !== dominante && drapeauDe(state.world, v)) poids.push([v, 2.2]);
    }
    faction = rng.weighted(poids);
  }
  // Le monde durcit lentement, mais les bandes restent le plus souvent
  // inférieures en nombre : c'est au joueur de choisir quand ça vaut le coup.
  const niveauMonde = Math.min(2, Math.floor(state.temps / 2500));
  const debout = deboutDe(g).length || 1;
  const taille = Math.max(1, Math.round(rng.weighted([
    [1, 3], [2, 3], [3, 2], [debout, 1.5], [debout + 1, 0.6],
  ])));
  return genererBande(rng, faction, Math.min(6, taille), niveauMonde);
}

/**
 * Quand une faction vous déteste assez, elle cesse d'attendre que vous passiez :
 * elle paie des gens pour vous trouver. La réputation devient une menace.
 */
/**
 * Les chasseurs de prime cherchent *vous*, pas un groupe en particulier : le
 * tirage est global, et c'est le groupe qu'ils trouvent qui doit s'expliquer.
 * Un tirage par groupe multiplierait leur fréquence par le nombre de groupes.
 */
// L'érosion quotidienne est morte ici (L4, MEMOIRE.md, décision n°3 du
// propriétaire : « la rancune et la durée sont propres à chaque personnage et
// chaque situation — certains peuvent oublier, ce n'est pas à moi de décider
// mais à la simulation »). Le joueur était le seul être du monde qu'on
// oubliait à heure fixe : 0,1 point d'estime et 0,45 de rancune par jour,
// pour tout le monde, au chronomètre. L'oubli est désormais un acte du
// porteur : la succession relit (HERITAGE_COUR, influence.js), les porteurs
// meurent, la réparation reste le chemin actif. La porte de sortie de
// l'hostilité — la raison d'être de l'ancien oubli — a changé de forme, pas
// disparu : réparer, solder ses primes, ou lire venir la succession.

export function tenterChasseurs(state, log, ctx) {
  const rng = ctx.rng;
  const primes = state.player.primes || (state.player.primes = {});

  for (const k of Object.keys(state.player.reputation)) {
    if (!drapeauDe(state.world, k) || k === 'essaim') continue;
    const rep = state.player.reputation[k];
    const niveau = rep <= -75 ? 2 : rep <= -50 ? 1 : 0;
    if (niveau > (primes[k] || 0)) {
      primes[k] = niveau;
      log({
        type: 'prime_tete',
        texte: niveau === 2
          ? `${drapeauDe(state.world, k).nom} double la prime sur votre tête. On vous cherche activement.`
          : `${drapeauDe(state.world, k).nom} met une prime sur votre tête.`,
        important: true,
      });
    } else if (niveau < (primes[k] || 0) && rep > -40) {
      primes[k] = niveau;
      if (niveau === 0) {
        log({ type: 'prime_tete', texte: `${drapeauDe(state.world, k).nom} retire la prime sur votre tête.`, important: true });
      }
    }
  }

  // Une trêve donnée tient tant qu'elle court : leurs chasseurs rentrent chez
  // eux (PAROLE.md, T1). C'est le premier effet d'une parole du joueur, et il
  // se voit tout de suite — la prime, elle, reste inscrite : on n'a pas été
  // blanchi, on a été laissé tranquille.
  const traques = Object.keys(primes).filter(
    (k) => primes[k] > 0 && drapeauDe(state.world, k) && !paroleAvec(state, k, 'treve'));
  if (!traques.length) return false;

  // Le recel : ce que le Syndicat Ombrelle donne aux siens. Ils ne vous
  // blanchissent pas, ils font mieux — ils achètent le silence de ceux qui
  // auraient encaissé. Tant qu'une colonne porte leurs couleurs, personne ne
  // vient. C'est l'avantage propre à ce drapeau, et il ne s'obtient nulle part
  // ailleurs : voir SERVICES.
  //
  // Les primes restent inscrites, elles ne sont pas effacées. Quitter leur
  // service, et tout ce qu'on doit au monde réapparaît d'un coup.
  //
  // Après le filtre, pas avant : sans prime sur la tête il n'y a rien à
  // receler, et c'est le cas de presque toutes les heures de presque toutes les
  // parties. On ne paie la question que quand elle se pose.
  if (avantage(state, 'recel')) return false;
  const intensite = traques.reduce((t, k) => t + primes[k], 0);
  // Une visite tous les deux à trois mois de jeu : une menace, pas un métronome.
  if (!rng.chance(0.0012 * intensite)) return false;

  // Ils tombent sur l'un des groupes — pas forcément celui qu'on regarde.
  const cibles = groupes(state).filter((gr) => gr.membres.some(estVivant));
  if (!cibles.length) return false;
  const cible = rng.pick(cibles);

  const k = rng.pick(traques);
  const taille = 2 + rng.irange(0, primes[k]);
  const bande = genererBande(rng, k, taille, primes[k]);
  bande.nom = `Chasseurs de prime ${drapeauDe(state.world, k).genitif}`;
  bande.letal = 0.3;
  log({
    type: 'chasseurs',
    texte: `Des chasseurs de prime ${drapeauDe(state.world, k).genitif} ont retrouvé ${cible.nom}.`,
    important: true,
    regionId: cible.regionId,
    groupe: cible.id,
  });
  const res = combatContre(state, bande, log, ctx, cible);

  if (res.vainqueur === 'B') solderPrime(state, k, log);
  return true;
}

/** Tente une rencontre sur l'heure écoulée. Retourne true si quelque chose est arrivé. */
export function tenterRencontre(state, log, ctx, multiplicateur = 1, groupe) {
  const rng = ctx.rng;
  const g = groupe || groupeActif(state);
  const regionId = g.regionId;
  const r = state.world.regions[regionId];
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const col = colonieDe(state.world, regionId);

  // En ville, on est relativement tranquille
  const climat = ctx.climat;
  // Un secteur qu'on ne tient plus n'est pas une statistique : on s'y fait
  // attaquer davantage, et le joueur le sent avant de lire le chiffre.
  let p = r.danger * multiplicateur * (col ? 0.25 : 1) * (climat ? climat.rencontres : 1)
    * menace(state.world, regionId);
  // Furtivité du plus discret de l'escouade
  let furtif = 0;
  const debout = deboutDe(g);
  if (debout.length) {
    furtif = Math.max(...debout.map((c) => comp(c, 'furtivite')));
  }
  p *= 1 - Math.min(0.55, furtif / 190);
  p *= 1 - posture.evitement * 0.7;
  // Une armée dans le secteur, c'est du monde sur les routes
  const armeesIci = state.world.armees.filter((a) => distance(a.regionId, regionId) <= 1).length;
  p *= 1 + armeesIci * 0.6;
  // Une colonne de bêtes chargées se voit de loin, et se convoite. Une troupe
  // nombreuse aussi : on ne fait pas passer trente personnes inaperçues.
  p *= visibiliteAttelage(g);
  p *= 1 + Math.max(0, debout.length - 4) * 0.05;

  if (!rng.chance(Math.min(0.5, p))) return false;

  const type = rng.weighted([
    ['hostile', 5],
    ['epave', 2],
    ['errant', 1.1],
    ['caravane', col ? 0.4 : 1.3],
    ['peage', r.controle ? 1.5 : 0.2],
  ]);

  switch (type) {
    case 'hostile': {
      const bande = bandeLocale(state, ctx, g);
      if (posture.evitement > 0 && rng.chance(posture.evitement * 0.8)) {
        log({ type: 'esquive', texte: `${g.nom} : ${bande.nom} repéré à temps. Contournement.`, regionId, groupe: g.id });
        for (const c of debout) gagnerXp(c, 'furtivite', XP_PRATIQUE);
        return true;
      }
      combatContre(state, bande, log, ctx, g);
      return true;
    }
    case 'epave': {
      const biome = state.world.regions[regionId].biome;
      const table = { dalles: 'composant', friche: 'isotope', plastique: 'polymere', relais: 'composant' };
      const k = table[biome] || rng.pick(['ferraille', 'minerai', 'alliage']);
      const q = rng.irange(3, 14);
      const pris = ajouterAuSac(state, k, q, g);
      const cr = rng.irange(0, 60);
      gagner(state, cr);
      for (const c of debout) gagnerXp(c, 'ingenierie', XP_PRATIQUE * 1.2);
      log({
        type: 'trouvaille',
        texte: `Épave fouillée : ${pris} ${COMMODITIES[k].nom.toLowerCase()}${cr ? ` et ${cr} ${signeIci(state)}` : ''}.`,
        regionId,
      });
      return true;
    }
    case 'errant': {
      // On n'oppose plus de plafond au nombre : engager quelqu'un au banc d'une
      // ville n'en avait jamais, et un errant qu'on paie n'est pas différent.
      // Ce qui borne une escouade, c'est ce qu'elle mange, la cohésion qui
      // s'étiole au-delà du noyau et le monde qui la remarque de plus loin —
      // pas une règle qui refuse. Le baraquement et les gens sociables agrandis-
      // sent ce noyau : c'est là qu'est la décision.
      const prix = rng.irange(120, 420);
      if (!state.player.politique.recruter || soldeIci(state) < prix) {
        log({
          type: 'rencontre',
          texte: `Un errant propose ses services (${prix} ${signeIci(state)}). Décliné.`,
          regionId,
          discret: true,
        });
        return true;
      }
      const c = makeCharacter(rng, { niveau: rng.irange(0, 1) });
      regler(state, prix);
      noterArgent(state, 'recrues engagées en route', -prix);
      g.membres.push(c);
      log({
        type: 'recrue',
        texte: `${c.nom} (${c.archetypeNom}) rejoint ${g.nom} pour ${prix} ${signeIci(state)}.`,
        regionId,
        important: true,
        groupe: g.id,
      });
      return true;
    }
    case 'caravane': {
      if (!state.player.politique.commercer) {
        log({ type: 'rencontre', texte: 'Une caravane passe. On la laisse filer.', regionId, discret: true });
        return true;
      }
      const stock = COMMODITY_KEYS.filter((k) => (g.inventaire[k] || 0) > 0);
      if (!stock.length) {
        log({ type: 'rencontre', texte: 'Une caravane passe. Rien à lui vendre.', regionId, discret: true });
        return true;
      }
      const k = rng.pick(stock);
      const q = Math.min(g.inventaire[k], rng.irange(3, 25));
      const negoc = debout.length
        ? debout.reduce((a, b) => (comp(a, 'commerce') >= comp(b, 'commerce') ? a : b))
        : null;
      const bonus = negoc ? comp(negoc, 'commerce') / 260 : 0;
      const prix = Math.round(COMMODITIES[k].prix * (1.15 + bonus) * q);
      g.inventaire[k] -= q;
      gagner(state, prix);
      if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.8);
      log({
        type: 'commerce',
        texte: `Caravane : ${q} ${COMMODITIES[k].nom.toLowerCase()} vendus pour ${prix} ${signeIci(state)}.`,
        regionId,
      });
      return true;
    }
    case 'peage': {
      const f = r.controle || 'bandits';
      const taxe = rng.irange(40, 220);
      const franchise = laissePasser(state, g, f);
      if (franchise) {
        log({
          type: 'peage',
          texte: franchise === 'pacte'
            ? `Barrage ${drapeauDe(state.world, f).genitif} : le laissez-passer est en règle. `
              + 'On vous ouvre la barrière sans un mot.'
            : `Barrage ${drapeauDe(state.world, f).genitif} : on vous reconnaît, on vous laisse passer.`,
          regionId,
          discret: true,
        });
        return true;
      }
      const agressif = state.player.posture === 'agressif';
      if (!agressif && soldeIci(state) >= taxe && state.player.politique.payerPeage) {
        regler(state, taxe);
        // Et il va quelque part : la ville la plus proche de ce drapeau tient
        // le barrage, et c'est elle qui l'encaisse (TERRITOIRE.md, B1).
        percevoirPeage(state, f, regionId, taxe, monnaieIci(state));
        noterArgent(state, 'péages', -taxe);
        commettre(state, {
          type: 'peage', regionId, t: state.temps,
          effets: [{ faction: f, delta: 1, su: state.temps }],
        });
        log({
          type: 'peage',
          texte: `Péage ${drapeauDe(state.world, f) ? drapeauDe(state.world, f).nom : 'local'} : ${taxe} ${signeIci(state)} versés.`,
          regionId,
        });
      } else {
        const bande = genererBande(rng, drapeauDe(state.world, f) ? f : 'bandits', rng.irange(2, 4), Math.min(2, Math.floor(state.temps / 900)));
        log({ type: 'peage', texte: `${g.nom} : péage refusé. Ça tourne mal.`, regionId, groupe: g.id });
        commettre(state, {
          type: 'peage', regionId, t: state.temps,
          effets: [{ faction: f, delta: -8, su: state.temps }],
        });
        combatContre(state, bande, log, ctx, g);
      }
      return true;
    }
    default:
      return false;
  }
}

/**
 * Aléa environnemental du biome (radiations, pluie acide, éboulement…).
 * `exposition` : 1 en plein travail dehors, ~0.3 au repos ou à l'abri.
 */
export function tenterAlea(state, log, ctx, exposition = 1, groupe) {
  const rng = ctx.rng;
  const g = groupe || groupeActif(state);
  const regionId = g.regionId;
  const r = state.world.regions[regionId];
  const h = BIOMES[r.biome].hazard;
  if (!h) return false;
  const col = colonieDe(state.world, regionId);
  const abri = col && !col.ruine ? 0.25 : 1;
  // N'importe lequel des siens : on est à l'abri chez soi, et « chez soi » ne
  // veut plus dire « le camp qu'on habite en ce moment ».
  const protege = auCamp(state, regionId) ? 0.3 : 1;
  const climat = ctx.climat ? ctx.climat.aleas : 1;
  if (!rng.chance(h.p * exposition * abri * protege * climat)) return false;

  const touches = [];
  for (const c of g.membres) {
    if (!estVivant(c)) continue;
    if (!rng.chance(0.7)) continue;
    const armure = c.equip.armure ? (ITEMS[c.equip.armure].armure || 0) : 0;
    const reduc = 1 - Math.min(0.6, armure / 30);
    const d = h.degats * rng.range(0.6, 1.4) * reduc;
    if (d > 0.5) {
      const res = blesser(c, d, rng.pick(['torse', 'tete', 'brasG', 'jambeD']), rng);
      if (res.mort) log({ type: 'mort', texte: `${c.nom} succombe : ${h.nom.toLowerCase()}.`, important: true });
    }
    c.fatigue = Math.min(120, c.fatigue + h.fatigue * rng.range(0.5, 1.2));
    touches.push(c.nom);
  }
  if (!touches.length) return false;
  log({
    type: 'alea',
    texte: `${h.nom} sur ${nomRegion(state.world, regionId)}. ${touches.length} de ${g.nom} touché${touches.length >= 2 ? 's' : ''}.`,
    regionId,
    groupe: g.id,
  });
  return true;
}

/** Résumé lisible d'une entrée de journal (utilisé par l'UI). */
export function couleurLog(type) {
  switch (type) {
    case 'combat': case 'mort': case 'raid': return 'danger';
    case 'capture': case 'guerre': case 'siege': case 'bataille': return 'guerre';
    case 'trouvaille': case 'commerce': case 'recrue': return 'gain';
    case 'base': case 'recherche': case 'chantier': return 'base';
    default: return 'neutre';
  }
}

// ---------------------------------------------------------------------------
// Sites : la récompense d'aller voir ailleurs
// ---------------------------------------------------------------------------

/**
 * Fouille le site de la région courante. Action ponctuelle : un site ne se
 * fouille qu'une fois, et il peut être gardé.
 */
export function fouillerSite(state, rng, log, groupe) {
  const g = groupe || groupeActif(state);
  const r = state.world.regions[g.regionId];
  if (!r.site || !r.site.connu) return { ok: false, motif: 'Aucun site repéré ici.' };
  if (r.site.fouille) return { ok: false, motif: 'Ce site a déjà été vidé.' };
  const debout = deboutDe(g);
  if (!debout.length) return { ok: false, motif: 'Personne n’est en état.' };

  const def = POI[r.site.type];

  // Certains sites demandent de savoir ouvrir une porte.
  if (def.reqIngenierie) {
    const meilleur = Math.max(...debout.map((c) => comp(c, 'ingenierie')));
    if (meilleur < def.reqIngenierie) {
      return { ok: false, motif: `Il faut ${def.reqIngenierie} en ingénierie (meilleur : ${Math.round(meilleur)}).` };
    }
  }

  // Le site est gardé ? On le saura en entrant.
  if (rng.chance(def.danger)) {
    const bande = bandeLocale(state, { rng }, g);
    log({ type: 'site', texte: `${def.nom} : on n’est pas seuls.`, important: true, regionId: r.i });
    const res = combatContre(state, bande, log, { rng }, g);
    if (res.vainqueur !== 'A') {
      return { ok: true, combat: true, gagne: false, motif: 'Le site reste aux autres.' };
    }
  }

  r.site.fouille = true;
  const pris = [];
  for (const k of Object.keys(def.loot)) {
    const [min, max] = def.loot[k];
    const q = rng.irange(min, max);
    if (q <= 0) continue;
    const reel = ajouterAuSac(state, k, q, g);
    if (reel > 0) pris.push(`${reel} ${COMMODITIES[k].nom.toLowerCase()}`);
  }
  const cr = rng.irange(def.credits[0], def.credits[1]);
  gagner(state, cr);

  const objets = [];
  for (let i = 0; i < (def.objet || 0); i++) {
    if (!rng.chance(0.6)) continue;
    const palier = rng.weighted([[0, 3], [1, 3], [2, 1.6], [3, 0.4]]);
    const choix = Object.keys(PALIERS_ITEM).filter((k) => PALIERS_ITEM[k] === palier);
    if (!choix.length) continue;
    const key = rng.pick(choix);
    if (g.objets.length < 40) {
      g.objets.push(key);
      objets.push(ITEMS[key].nom);
    }
  }

  // Une station météo rend surtout de la carte.
  if (def.revele) {
    let leves = 0;
    for (const reg of state.world.regions) {
      if (reg.decouvert) continue;
      if (distance(reg.i, r.i) > def.revele) continue;
      reg.decouvert = true;
      leves++;
      if (reg.site) reg.site.connu = true;
    }
    if (leves) pris.push(`${leves} secteurs levés`);
  }

  for (const c of debout) gagnerXp(c, 'ingenierie', XP_PRATIQUE * 3);
  state.stats.sitesFouilles = (state.stats.sitesFouilles || 0) + 1;

  const resume = [pris.join(', '), cr ? `${cr} ${signeIci(state)}` : null, objets.length ? objets.join(', ') : null]
    .filter(Boolean).join(' · ') || 'rien d’exploitable';
  // On garde ce qu'on en a tiré sur le site lui-même.
  //
  // Le résumé partait au journal et le bouton répondait « Site fouillé. » — on
  // venait de vider une ville morte sans savoir ce qu'on avait ramassé, et il
  // fallait aller le chercher dans un fil de quatre cents lignes. Écrit ici, il
  // reste lisible sur place, des jours plus tard, en repassant devant.
  r.site.butin = resume;
  log({
    type: 'trouvaille',
    texte: `${def.nom} fouillé : ${resume}.`,
    important: true,
    regionId: r.i,
    detail: [def.texte],
  });
  return { ok: true, resume, cr, pris, objets };
}
