// Journal de bord et rencontres. Tout se résout automatiquement selon la
// posture et les consignes de l'escouade : c'est ce qui permet à la simulation
// de tourner pendant que le joueur est hors ligne.

import {
  FACTIONS, POSTURES, COMMODITIES, COMMODITY_KEYS, ITEMS, BIOMES,
  POI, SKILLS, SKILL_KEYS, PALIERS_ITEM, SURNOMS, TRAITS,
} from './data.js';
import { colonieDe, voisins, nomRegion, distance } from './world.js';
import { compterVictoire } from './contrats.js';
import {
  compterVictoireOrdre, crediter, estAuService, rangDe, renfortsDisponibles,
} from './allegeance.js';
import { genererBande, resoudreCombat, butin } from './combat.js';
import { perdreBete, visibiliteAttelage } from './betes.js';
import { rendementCohesion } from './groupes.js';
import {
  comp, gagnerXp, estDebout, estVivant, makeCharacter, blesser, pvTotal,
  ajusterLien, XP_PRATIQUE,
} from './characters.js';
import { poidsInventaire, capacitePortage } from './economy.js';
import { tailleEscouadeMax } from './base.js';
import { groupeActif, groupes, tousLesMembres, debout as deboutDe } from './groupes.js';
import { estSurveillee } from './connaissance.js';
import { occupeParEcole } from './formation.js';

export const LOG_MAX = 400;

export function creerLogger(state) {
  return (entree) => {
    const e = Object.assign({ t: state.temps }, entree);
    // Témoin ou pas : ce qui arrive sous les yeux de l'escouade est su tout de
    // suite, le reste met le temps de la route (voir `nouvellesConnues`).
    if (e.regionId != null && e.vu === undefined) e.vu = estSurveillee(state, e.regionId);
    state.journal.push(e);
    if (state.journal.length > LOG_MAX) state.journal.splice(0, state.journal.length - LOG_MAX);
    if (e.important) state.nonLus = (state.nonLus || 0) + 1;
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

export function reputation(state, faction, delta) {
  // « bandits » n'est pas une faction : on tape sur des pillards, pas sur une
  // institution. Sans ce garde-fou, la table de réputation se remplit de clés
  // qui n'ont ni nom ni couleur, et tout ce qui la parcourt casse.
  if (!faction || faction === 'essaim' || !FACTIONS[faction]) return;
  const r = state.player.reputation;
  r[faction] = Math.max(-100, Math.min(100, (r[faction] || 0) + delta));
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

export function combatContre(state, bande, log, ctx, groupe) {
  const rng = ctx.rng;
  const g = groupe || groupeActif(state);
  const compsAvant = instantaneComps(g.membres);
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const squad = g.membres.filter(estVivant);
  // Un élève à l'école ne monte pas au feu : il est en ville, pas au campement.
  const combattants = squad.filter((c) => c.etat !== 'mort' && !occupeParEcole(c));

  // À partir de Capitaine, les siens viennent prêter main-forte chez eux.
  const renforts = [];
  const nbRenforts = renfortsDisponibles(state, g);
  for (let i = 0; i < nbRenforts; i++) {
    const allie = makeCharacter(rng, { niveau: 2 });
    allie.equip.armure = allie.equip.armure || 'plaque';
    allie.renfort = true;
    renforts.push(allie);
  }
  if (renforts.length) {
    log({
      type: 'renfort',
      texte: `${renforts.length} homme${renforts.length > 1 ? 's' : ''} ${FACTIONS[g.allegeance.faction].genitif} accourent.`,
      regionId: g.regionId,
    });
  }

  const res = resoudreCombat(combattants.concat(renforts), bande.membres, {
    rng,
    biome: state.world.regions[g.regionId].biome,
    posture,
    bonusDegats: (state.base.recherche.balistique || 0) * 0.1,
    bonusArmure: (state.base.recherche.blindage || 0) * 0.1,
    letalA: state.player.politique.achever ? 0.5 : 0.06,
    cohA: rendementCohesion(g),
    letalB: bande.letal,
  });

  const lieu = nomRegion(state.world, g.regionId);
  let texte;
  if (res.vainqueur === 'A') {
    const b = butin(bande, rng);
    let ramasse = 0;
    for (const k of Object.keys(b.loot)) ramasse += ajouterAuSac(state, k, b.loot[k], g);
    state.player.credits += b.credits;
    for (const o of b.objets) {
      if (g.objets.length < 30) g.objets.push(o);
    }
    reputation(state, bande.faction, -6);
    // Les ennemis d'un ennemi apprécient
    for (const k of Object.keys(state.world.factions)) {
      if (k === bande.faction || k === 'essaim') continue;
      const enGuerre = state.world.guerres.some(
        (w) => (w.a === k && w.b === bande.faction) || (w.b === k && w.a === bande.faction)
      );
      if (enGuerre) reputation(state, k, 2);
    }
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
    texte = `${bande.nom} mis en déroute à ${lieu} — ${ramasse} unités et ${b.credits} cr récupérés.`;
  } else if (res.vainqueur === 'B') {
    texte = perdreCombat(state, bande, log, ctx, lieu, g);
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
  const debouts = g.membres.filter(estDebout);
  for (let i = 0; i < debouts.length; i++) {
    for (let j = i + 1; j < debouts.length; j++) {
      ajusterLien(debouts[i], debouts[j], res.vainqueur === 'A' ? 7 : 3);
    }
  }
  for (const tombe of g.membres.filter((c) => c.etat === 'ko')) {
    for (const d of debouts) ajusterLien(tombe, d, -2);
  }

  annoncerProgres(state, compsAvant, log, g.membres);

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
  const cr = Math.round(state.player.credits * rng.range(0.25, 0.55));
  state.player.credits -= cr;
  if (g.objets.length && rng.chance(0.6)) {
    g.objets.splice(rng.int(g.objets.length), 1);
  }
  // Une bête se mène toute seule et se revend bien : c'est la première chose
  // qu'on emmène. C'est aussi ce qui fait qu'on y tient.
  perdreBete(g, rng, log);
  reputation(state, bande.faction, -3);

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
  return `${g.nom} battu à ${lieu} : ${perdu} unités et ${cr} cr perdus, réveil à ${nomRegion(state.world, g.regionId)}.`;
}

// ---------------------------------------------------------------------------
// Table de rencontres
// ---------------------------------------------------------------------------

function bandeLocale(state, ctx, groupe) {
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

  let faction;
  if (dominante && repu < -25 && rng.chance(0.6)) faction = dominante;
  else {
    const poids = [
      ['bandits', 3 + (vises.has('bandits') ? 3 : 0)],
      ['essaim', state.world.regions[regionId].biome === 'plastique' ? 2.2 : 1.1],
    ];
    if (dominante) poids.push([dominante, 1.4 + (vises.has(dominante) ? 3 : 0)]);
    // Une faction visée par contrat peut aussi croiser la route hors de chez elle.
    for (const v of vises) {
      if (v !== 'bandits' && v !== dominante && FACTIONS[v]) poids.push([v, 2.2]);
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
export function tenterChasseurs(state, log, ctx) {
  const rng = ctx.rng;
  const primes = state.player.primes || (state.player.primes = {});

  // Les rancunes s'émoussent. Sans cet oubli, la réputation n'est qu'un
  // cliquet qui descend : dix accrochages suffisent à se rendre le monde
  // définitivement hostile, et plus rien ne peut réparer ça.
  if (state.temps % 24 === 0) {
    for (const k of Object.keys(state.player.reputation)) {
      const v = state.player.reputation[k];
      if (v === 0) continue;
      // Asymétrique à dessein : une rancune s'émousse vite, un service rendu
      // reste longtemps. Sinon on ne peut ni sortir de l'hostilité, ni
      // accumuler assez d'estime pour être reçu quelque part.
      const pas = v > 0 ? Math.min(v, 0.1) : Math.min(-v, 0.45);
      state.player.reputation[k] = v > 0 ? v - pas : v + pas;
    }
  }

  for (const k of Object.keys(state.player.reputation)) {
    if (!FACTIONS[k] || k === 'essaim') continue;
    const rep = state.player.reputation[k];
    const niveau = rep <= -75 ? 2 : rep <= -50 ? 1 : 0;
    if (niveau > (primes[k] || 0)) {
      primes[k] = niveau;
      log({
        type: 'prime_tete',
        texte: niveau === 2
          ? `${FACTIONS[k].nom} double la prime sur votre tête. On vous cherche activement.`
          : `${FACTIONS[k].nom} met une prime sur votre tête.`,
        important: true,
      });
    } else if (niveau < (primes[k] || 0) && rep > -40) {
      primes[k] = niveau;
      if (niveau === 0) {
        log({ type: 'prime_tete', texte: `${FACTIONS[k].nom} retire la prime sur votre tête.`, important: true });
      }
    }
  }

  const traques = Object.keys(primes).filter((k) => primes[k] > 0 && FACTIONS[k]);
  if (!traques.length) return false;
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
  bande.nom = `Chasseurs de prime ${FACTIONS[k].genitif}`;
  bande.letal = 0.3;
  log({
    type: 'chasseurs',
    texte: `Des chasseurs de prime ${FACTIONS[k].genitif} ont retrouvé ${cible.nom}.`,
    important: true,
    regionId: cible.regionId,
    groupe: cible.id,
  });
  const res = combatContre(state, bande, log, ctx, cible);

  // Perdre solde l'affaire : ils ont eu ce qu'ils voulaient. Sinon la prime
  // s'auto-entretient et il n'existe aucune sortie.
  if (res.vainqueur === 'B') {
    primes[k] = Math.max(0, primes[k] - 1);
    state.player.reputation[k] = Math.min(100, (state.player.reputation[k] || 0) + 10);
    log({
      type: 'prime_tete',
      texte: `${FACTIONS[k].nom} considère l’affaire réglée. La prime retombe.`,
      important: true,
    });
  }
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
  let p = r.danger * multiplicateur * (col ? 0.25 : 1) * (climat ? climat.rencontres : 1);
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
      state.player.credits += cr;
      for (const c of debout) gagnerXp(c, 'ingenierie', XP_PRATIQUE * 1.2);
      log({
        type: 'trouvaille',
        texte: `Épave fouillée : ${pris} ${COMMODITIES[k].nom.toLowerCase()}${cr ? ` et ${cr} cr` : ''}.`,
        regionId,
      });
      return true;
    }
    case 'errant': {
      const max = tailleEscouadeMax(state.base);
      const vivants = tousLesMembres(state).filter(estVivant).length;
      const prix = rng.irange(120, 420);
      if (!state.player.politique.recruter || vivants >= max || state.player.credits < prix) {
        log({
          type: 'rencontre',
          texte: `Un errant propose ses services (${prix} cr). Décliné.`,
          regionId,
          discret: true,
        });
        return true;
      }
      const c = makeCharacter(rng, { niveau: rng.irange(0, 1) });
      state.player.credits -= prix;
      g.membres.push(c);
      log({
        type: 'recrue',
        texte: `${c.nom} (${c.archetypeNom}) rejoint ${g.nom} pour ${prix} cr.`,
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
      state.player.credits += prix;
      if (negoc) gagnerXp(negoc, 'commerce', XP_PRATIQUE * 0.8);
      log({
        type: 'commerce',
        texte: `Caravane : ${q} ${COMMODITIES[k].nom.toLowerCase()} vendus pour ${prix} cr.`,
        regionId,
      });
      return true;
    }
    case 'peage': {
      const f = r.controle || 'bandits';
      const taxe = rng.irange(40, 220);
      // Les siens ne rançonnent pas les leurs, dès le grade d'Agent.
      const monGrade = g.allegeance && g.allegeance.faction === f ? rangDe(g.allegeance) : null;
      if (monGrade && monGrade.index >= 1) {
        log({
          type: 'peage',
          texte: `Barrage ${FACTIONS[f].genitif} : on vous reconnaît, on vous laisse passer.`,
          regionId,
          discret: true,
        });
        return true;
      }
      const agressif = state.player.posture === 'agressif';
      if (!agressif && state.player.credits >= taxe && state.player.politique.payerPeage) {
        state.player.credits -= taxe;
        reputation(state, f, 1);
        log({
          type: 'peage',
          texte: `Péage ${FACTIONS[f] ? FACTIONS[f].nom : 'local'} : ${taxe} cr versés.`,
          regionId,
        });
      } else {
        const bande = genererBande(rng, FACTIONS[f] ? f : 'bandits', rng.irange(2, 4), Math.min(2, Math.floor(state.temps / 900)));
        log({ type: 'peage', texte: `${g.nom} : péage refusé. Ça tourne mal.`, regionId, groupe: g.id });
        reputation(state, f, -8);
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
  const protege = state.base.fonde && state.base.regionId === regionId ? 0.3 : 1;
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
    texte: `${h.nom} sur ${nomRegion(state.world, regionId)}. ${touches.length} de ${g.nom} touché(s).`,
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
  state.player.credits += cr;

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

  const resume = [pris.join(', '), cr ? `${cr} cr` : null, objets.length ? objets.join(', ') : null]
    .filter(Boolean).join(' · ') || 'rien d’exploitable';
  log({
    type: 'trouvaille',
    texte: `${def.nom} fouillé : ${resume}.`,
    important: true,
    regionId: r.i,
    detail: [def.texte],
  });
  return { ok: true, resume };
}
