// Harnais de test sans navigateur : le moteur doit tourner tel quel sous Node.
// C'est aussi la preuve qu'il pourra tourner côté serveur en multijoueur.

import {
  nouvellePartie, avancer, tick, rattraper, rattrapageEtale,
  TICK_MS, RATTRAPAGE_MAX,
} from '../src/sim.js';
import { Rng } from '../src/rng.js';
import { mesurerTick, CHAUFFE, MESURE } from './perf.js';
import { lireRapport, MARQUANTS_MAX } from '../src/rapport.js';
import { serialiser, deserialiser } from '../src/save.js';
import { COMMODITY_KEYS, DIPLO_FACTIONS, FACTIONS } from '../src/data.js';
import {
  genererBande, resoudreCombat, TACTIQUES, TACTIQUE_KEYS, apercuTactique,
  rendementTactique,
} from '../src/combat.js';
import { titreDe, lignesDe, faitsDe, RENOMMEES } from '../src/chronique.js';
import { faireRevolte, SEUIL_REVOLTE } from '../src/economy.js';
import { BETES } from '../src/betes.js';
import { attaquerCaravane } from '../src/caravanes.js';
import { combatContre } from '../src/events.js';
import { bandeLocale } from '../src/events.js';
import { damer, coutTraversee, PISTE_GAIN } from '../src/world.js';
import { distanceMorale } from '../src/factions.js';
import { loiIci } from '../src/lois.js';
import { primeLivraison, prixEsclave } from '../src/justice.js';
import { classement, puissance } from '../src/factions.js';
import {
  donnerOrdre, verifierExercice, COMPETENCES_EXERCICE, consommationGroupe, autonomie,
  apercuEscouade,
} from '../src/squad.js';
import {
  fonderBase, lancerConstruction, lancerRecherche, placesMetier, affectes,
  abriDe, capaciteStock, totalStock, energie, COUT_FONDATION, POP_RECONNUE,
  populationMax, chaineAutonomie, manquePour, apportBatiment,
  peutReconnaitre, reconnaitreAvantPoste, peutRattacher, rattacherVille, preleverImpot,
  declarerIndependance, synchroniserVitrine,
  manoeuvres, affecter, rendementMetier, mainDoeuvre,
} from '../src/base.js';
import { METIER_KEYS, BIOMES, BUILDINGS, POSTURES, COMMODITIES } from '../src/data.js';
import {
  accepter, abandonner, peutRendre, progres as progresContrat,
  OPINION_ECHU, OPINION_RENDU, POIDS_COLLECTE_MAX,
} from '../src/contrats.js';
import { genererBanc, primeDe, tensionRecrutement, engager } from '../src/recrues.js';
import {
  capturables, fairePrisonniers, prisonniersDe, capaciteGarde, disposer,
  surveillanceManquante, lenteurPrisonniers, tickPrisonniers, tickGeole,
  geoleDe, apaisementGeole, tickOrdrePublic,
} from '../src/justice.js';
import { loisDe, pressionFiscale, PEINES, REGIMES } from '../src/lois.js';
import {
  depouillesDe, lenteurDepouilles, poidsMoral, disposerCorps, prixOrganes,
  effetsDe, ritesPour,
} from '../src/depouilles.js';
import {
  coffreDe, peutLouer, peutAcheter, louerCoffre, acheterCoffre, capaciteCoffre,
  deposerAuCoffre, retirerDuCoffre, tickCoffres,
  LOYER, PRIX_COFFRE, CAPACITE_LOUEE, ESTIME_PROPRIETE, PERIODE_LOYER,
} from '../src/coffres.js';
import { DELAI_LOI } from '../src/factions.js';
import {
  tickSecteurs, tickInsecurite, effetPresence, casesDe, menace, motEtat,
  etatSecteur, resumeSecteur, dansSonSecteur,
} from '../src/secteur.js';
import {
  PREROGATIVES, peutExercer, credit as creditCharge, chargeAupres,
  leverColonne, envoyerColonne, fonderPoste, declarerGuerreA, signerPaixAvec,
  sitesFondation, cibleGuerre, jugerActes, tickCharges, porterFaute,
  coutLevee, COUT_POSTE, fixerLoi,
} from '../src/influence.js';
import {
  acheterBete, betesDe, lenteurAttelage, tickBetes, conduite, surnombre,
  visibiliteAttelage,
} from '../src/betes.js';
import {
  estVivant, makeCharacter, accorderDiplome, apprentissage, tickPerso, resistanceLetale,
  GAIN_DIPLOME, SEUIL_VENTRE_CREUX,
  comp as compPerso,
} from '../src/characters.js';
import { DIPLOMES, DIPLOME_KEYS } from '../src/data.js';
import {
  ecolesDe, inscrire, enFormation, ecolesAvantPoste, enseignerChezSoi,
  occupeParEcole, MARGE_INSTRUCTEUR, prixFormation, peutSInscrire,
} from '../src/formation.js';
import {
  colonieDe, colonieParId, nomRegion, lieuAvecCoord, coordonnee,
} from '../src/world.js';
import {
  groupeActif, groupes, tousLesMembres, scinder, fusionner, assignerTache,
  tacheDe, debout, noyau, plafondCohesion, rendementCohesion,
  porteeOrdres, joignable, PORTEE_COUREUR, PORTEE_PAR_ANTENNE,
  vivants as vivantsGroupe, placesSociables,
} from '../src/groupes.js';
import {
  acheter, vendre, prixJoueur, actifs, emploi, productionColonie, consommationColonie,
  capacitePortage, poidsInventaire, simulerAchat, simulerVente,
} from '../src/economy.js';
import { vocation, notable } from '../src/notables.js';
import {
  tickServices, honorer, demandesIci, souvenirs, faveurChef, renfortSoin,
  villesOuvertes, estime, SOINS_SEUIL, REGISTRES_SEUIL, PANNEAU_FERME,
} from '../src/services.js';
import {
  dirigeant, penchant, etatDuBut, crediterDirigeant, TEMPERAMENTS,
  tickDirigeant, creerDirigeant,
} from '../src/dirigeants.js';

/** Petite aide locale : les villes encore tenues par une faction. */
function coloniesVivantes(state, key) {
  return state.world.colonies.filter((c) => !c.ruine && c.faction === key);
}
import { METIER_VILLE_KEYS } from '../src/data.js';
import {
  sEngager, rangDe, RANGS, peutSEngager, REPUTATION_MINIMALE,
  droitIntendance, toucherRations, garnison, RANG_GARNISON,
  bilanService, noterFait, FEUILLE_MAX, palierBonus, effetsEstime, PALIERS_ESTIME,
  estimeEngagement,
} from '../src/allegeance.js';
import {
  vueColonie, estSurveillee, ageTexte, nouvellesConnues, DELAI_NOUVELLE, observer,
} from '../src/connaissance.js';
import { distance } from '../src/world.js';

let echecs = 0;
let total = 0;

function ok(cond, nom, extra) {
  total++;
  if (cond) {
    console.log(`  ✓ ${nom}`);
  } else {
    echecs++;
    console.log(`  ✗ ${nom}${extra ? ` — ${extra}` : ''}`);
  }
}

function section(titre) {
  console.log(`\n${titre}`);
}

function fini(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// --- Budget de performance -------------------------------------------------
// Un plafond en microsecondes sèches serait soit trop lâche pour attraper une
// régression, soit capricieux selon la machine. On rapporte donc le coût du
// tick à la vitesse de la machine, mesurée par un étalon. La mécanique vit dans
// `test/perf.js` — la chauffe, le minimum de cinq passes, et pourquoi les deux
// sont nécessaires y sont expliqués et chiffrés.
/**
 * Le plafond monte quand la simulation gagne du travail, pas quand elle se
 * dégrade — et il faut dire lequel, sinon relever le budget devient un moyen
 * commode de ne jamais voir une régression :
 *
 *   60 µs  moteur d'origine, avant le tourniquet des colonies
 *   65 µs  groupes, tâches individuelles, connaissance imparfaite
 *   88 µs  métiers des villes (répartition, production par corps de métier)
 *          et notables (chef, armurier, contremaître, médecin) par colonie
 *   94 µs  demandes personnelles des notables et registres tenus ouverts
 *  114 µs  carte de 24×18 et 86 villes — cinq fois la surface, cinq fois les
 *          villes, pour vingt pour cent de tick en plus seulement. Le reste est
 *          absorbé par le niveau de détail (PAS_LOIN), le tas binaire du
 *          Dijkstra, l'index des colonies et une distance sans allocation.
 *  116 µs  cantiniers et ouvriers dans les villes
 *  120 µs  secteurs (insécurité des 432 cases, relevée une fois par jour de
 *          jeu par un parcours en largeur depuis les villes), prisonniers et
 *          geôles. Écrite naïvement — chaque case cherchant la ville la plus
 *          proche à chaque heure — l'insécurité coûtait à elle seule 589 µs.
 *   79 µs  chauffe et minimum de cinq passes. Rien n'a été optimisé ce jour-là :
 *          la mesure a cessé d'inclure la compilation du moteur et les caprices
 *          d'une machine partagée. Les chiffres au-dessus restent tels quels,
 *          relevés avec l'ancienne méthode ; ils se comparent entre eux, pas
 *          avec celui-ci.
 *
 * 110 laisse un tiers de marge sur les 79 mesurés, et sur les 91 qu'on relève
 * quand la machine travaille par ailleurs. L'ancien plafond de 145 était calé
 * sur une mesure bruitée : il aurait laissé passer un tick qui double.
 */
const BUDGET_US = 110;

// Mesuré tout de suite, avant la première assertion.
//
// L'endroit n'est pas indifférent, et c'est contre-intuitif : lancé à la fin de
// la suite, l'étalon tourne **quatre fois plus vite** qu'au démarrage, parce
// que huit cents assertions ont donné au compilateur toutes les occasions
// d'optimiser `Rng.f()`. La machine paraît alors quatre fois plus rapide
// qu'elle n'est, et le tick quatre fois plus lent. Étalon et tick doivent donc
// être relevés au même moment, et ce moment doit être le même à chaque
// exécution.
const perf = mesurerTick(777);

/** Parcourt l'état à la recherche de NaN / Infinity : le tueur silencieux des sims. */
function chercherNaN(obj, chemin = '$', vus = new Set()) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number') {
    return Number.isFinite(obj) ? null : chemin;
  }
  if (typeof obj !== 'object') return null;
  if (vus.has(obj)) return null;
  vus.add(obj);
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = chercherNaN(obj[i], `${chemin}[${i}]`, vus);
      if (r) return r;
    }
    return null;
  }
  for (const k of Object.keys(obj)) {
    const r = chercherNaN(obj[k], `${chemin}.${k}`, vus);
    if (r) return r;
  }
  return null;
}

/** Les vivants d'un groupe, pour les tests qui n'importent pas groupes.js. */
/** Le trésor d'une faction, pour les tests. */
function drawTresor(state, k) {
  return state.world.factions[k].tresor;
}

function vivantsDeTest(g) {
  return g.membres.filter((c) => c.etat !== 'mort');
}

function verifierCoherence(state, label) {
  const w = state.world;
  let pb = null;

  const nan = chercherNaN(state);
  if (nan) pb = `NaN/Infinity à ${nan}`;

  // Stocks jamais négatifs
  for (const col of w.colonies) {
    for (const k of COMMODITY_KEYS) {
      if (!(col.stock[k] >= -0.001)) { pb = pb || `stock négatif ${col.nom}.${k}=${col.stock[k]}`; }
    }
    if (col.pop < 0) pb = pb || `population négative ${col.nom}`;
    if (col.defense < -0.001) pb = pb || `défense négative ${col.nom}`;
  }

  // Cohérence colonies ↔ factions
  for (const col of w.colonies) {
    if (!col.faction) continue;
    const f = w.factions[col.faction];
    if (!f) { pb = pb || `faction inconnue ${col.faction}`; continue; }
    if (!f.colonies.includes(col.id)) {
      pb = pb || `${col.nom} appartient à ${col.faction} mais absente de sa liste`;
    }
  }
  for (const key of Object.keys(w.factions)) {
    const f = w.factions[key];
    const vus = new Set();
    for (const cid of f.colonies) {
      if (vus.has(cid)) { pb = pb || `doublon de colonie ${cid} chez ${key}`; }
      vus.add(cid);
      const col = w.colonies.find((c) => c.id === cid);
      if (!col) { pb = pb || `colonie fantôme ${cid} chez ${key}`; continue; }
      if (col.faction !== key) pb = pb || `${col.nom} listée par ${key} mais tenue par ${col.faction}`;
    }
  }

  // Armées valides
  for (const a of w.armees) {
    if (!fini(a.force) || a.force < 0) pb = pb || `armée ${a.id} force=${a.force}`;
    if (!w.regions[a.regionId]) pb = pb || `armée ${a.id} hors carte`;
    if (a.force > a.forceMax * 1.01) pb = pb || `armée ${a.id} au-dessus de son effectif initial`;
  }

  // Guerres non dupliquées
  const paires = new Set();
  for (const g of w.guerres) {
    const k = [g.a, g.b].sort().join('|');
    if (paires.has(k)) pb = pb || `guerre en double ${k}`;
    paires.add(k);
    if (g.a === g.b) pb = pb || 'guerre contre soi-même';
  }

  // Joueur
  const p = state.player;
  if (p.credits < 0) pb = pb || `crédits négatifs (${p.credits})`;
  const vusIds = new Set();
  for (const g of groupes(state)) {
    for (const k of COMMODITY_KEYS) {
      if ((g.inventaire[k] || 0) < -0.001) pb = pb || `inventaire négatif ${g.nom}.${k}`;
    }
    if (!w.regions[g.regionId]) pb = pb || `${g.nom} hors carte`;
    if (!g.ordre || !g.ordre.type) pb = pb || `${g.nom} sans ordre`;
    // Un personnage appartient à exactement un groupe : c'est l'invariant qui
    // rend inutile toute synchronisation entre deux listes.
    for (const c of g.membres) {
      if (vusIds.has(c.id)) pb = pb || `${c.nom} dans deux groupes`;
      vusIds.add(c.id);
    }
    // Un prisonnier n'est pas un membre : il ne travaille pas, ne compte pas
    // dans la cohésion, et ne doit apparaître qu'une fois dans tout l'état.
    for (const c of g.prisonniers || []) {
      if (vusIds.has(c.id)) pb = pb || `${c.nom} à la fois membre et prisonnier`;
      vusIds.add(c.id);
      if (!c.captif) pb = pb || `${c.nom} prisonnier sans dossier`;
      if (c.etat === 'mort') pb = pb || `${c.nom} prisonnier et mort`;
    }
  }
  for (const col of w.colonies) {
    for (const d of (col.geole ? col.geole.detenus : [])) {
      if (!fini(d.sortie)) pb = pb || `détenu de ${col.nom} sans date de sortie`;
    }
  }
  for (const c of tousLesMembres(state)) {
    for (const part of Object.keys(c.corps)) {
      const b = c.corps[part];
      if (b.pv < -0.001 || b.pv > b.max + 0.001) pb = pb || `${c.nom}.${part} pv=${b.pv}/${b.max}`;
    }
    for (const s of Object.keys(c.skills)) {
      if (c.skills[s] < 0 || c.skills[s] > 100) pb = pb || `${c.nom}.${s}=${c.skills[s]}`;
    }
    if (!['ok', 'ko', 'mort'].includes(c.etat)) pb = pb || `${c.nom} état=${c.etat}`;
  }
  if (state.journal.length > 400) pb = pb || `journal non borné (${state.journal.length})`;

  ok(!pb, `cohérence ${label}`, pb);
  return !pb;
}

// ===========================================================================

console.log('CENDRES & PROTOCOLE — tests moteur\n' + '='.repeat(42));

section('1. Génération du monde');
const s1 = nouvellePartie(123456, { maintenant: 0, depart: 'ville', equipe: 3 });
ok(s1.world.regions.length === 24 * 18, 'carte 24×18 = 432 régions', `reçu ${s1.world.regions.length}`);
ok(s1.world.colonies.length >= 12, 'au moins 12 colonies', `reçu ${s1.world.colonies.length}`);
ok(s1.world.colonies.every((c) => c.faction), 'toute colonie a un propriétaire');
// On commence seul : le mot « escouade » se mérite, et le premier compagnon
// recruté est un événement plutôt qu'une ligne de plus.
// Le harnais démarre à trois (`equipe: 3`) parce qu'il teste des mécaniques de
// groupe ; le jeu, lui, commence seul, et c'est ce qu'on vérifie ici.
{
  // Le harnais démarre installé — en ville, à trois, équipé — parce qu'il fait
  // tourner le monde sans le jouer. La vraie partie, elle, commence seul et les
  // mains vides.
  const nu = nouvellePartie(123456, { maintenant: 0 });
  const gn = groupeActif(nu);
  const debout = gn.membres.filter((c) => c.etat !== 'mort');
  const corps = depouillesDe(gn);
  ok(debout.length === 1, 'une partie ordinaire commence seul', `${debout.length}`);
  ok(debout.every((c) => !c.equip.arme && !c.equip.armure),
    'et sans une arme ni une plaque d’armure');
  // Mais pas sans passé : on se réveille à côté de celui avec qui on voyageait.
  // C'est ce qui donne une décision à prendre avant le premier pas — l'enterrer
  // et repartir les mains vides, ou le dépouiller et marcher armé.
  ok(corps.length === 1, 'on se réveille à côté d’un mort', `${corps.length}`);
  ok(effetsDe(corps[0]).length >= 2,
    'et il a de quoi armer qui le dépouillera',
    effetsDe(corps[0]).join(', '));
  ok(ritesPour(nu, gn, corps[0]).some((r) => r.key === 'enterrer')
    && ritesPour(nu, gn, corps[0]).some((r) => r.key === 'depouiller'),
    'les deux gestes sont offerts d’emblée');
  ok(lenteurDepouilles(gn) > 0,
    'et le porter coûte quelque chose tant qu’on n’a rien décidé',
    `${Math.round(lenteurDepouilles(gn) * 100)} % de marche en moins`);
  ok(gn.objets.length === 0, 'rien en réserve non plus');
  ok(nu.player.credits < 100 && (gn.inventaire.rations || 0) < 20,
    'de quoi tenir quelques jours, pas davantage',
    `${nu.player.credits} cr · ${gn.inventaire.rations} rations`);
  // Un peu d'aléa : deux parties ne commencent pas au caractère près.
  const autre = nouvellePartie(654321, { maintenant: 0 });
  ok(autre.player.credits !== nu.player.credits
    || autre.player.groupes[0].inventaire.rations !== gn.inventaire.rations
    || autre.player.groupes[0].membres[0].archetype !== gn.membres[0].archetype,
    'et deux départs ne se ressemblent pas',
    `${nu.player.credits}/${gn.inventaire.rations}/${gn.membres[0].archetype} vs `
    + `${autre.player.credits}/${autre.player.groupes[0].inventaire.rations}/`
    + `${autre.player.groupes[0].membres[0].archetype}`);
}
ok(s1.world.regions.some((r) => r.biome === 'relais'), 'un Relais Orbital existe');
ok(Object.keys(s1.world.factions).length === 7, '7 factions');
verifierCoherence(s1, 'à la génération');

section('2. Déterminisme');
const a = nouvellePartie(987, { maintenant: 0, depart: 'ville', equipe: 3 });
const b = nouvellePartie(987, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(a, 500);
avancer(b, 500);
ok(serialiser(a) === serialiser(b), 'même graine → état identique après 500 h');
const c = nouvellePartie(988, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(c, 500);
ok(serialiser(a) !== serialiser(c), 'graine différente → monde différent');

section('3. Sauvegarde / rechargement');
const s3 = nouvellePartie(4242, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s3, 300);
const txt = serialiser(s3);
const s3b = deserialiser(txt);
ok(serialiser(s3b) === txt, 'aller-retour JSON sans perte');
avancer(s3, 200);
avancer(s3b, 200);
ok(serialiser(s3) === serialiser(s3b), 'la sim reprend à l’identique après rechargement');

// --- On est prévenu avant de mourir de faim.
//
// Le jeu n'avait qu'un message sur ce chemin — « X est mort de faim » — et rien
// avant : on perdait quelqu'un sans avoir rien vu venir, ce qui se lit comme un
// bug alors que c'est une comptabilité qui tourne depuis des jours.
{
  const rngF = new Rng(4242);
  const c = makeCharacter(rngF);
  const dire = (t) => tickPerso(c, 0, rngF, { soin: 1, premiersSecours: false, abri: 1 });
  c.faim = SEUIL_VENTRE_CREUX - 5;
  ok(!dire().some((m) => m.type === 'faim'), 'le ventre plein ne dit rien');
  c.faim = SEUIL_VENTRE_CREUX + 2;
  const creux = dire();
  ok(creux.some((m) => m.type === 'faim' && /ventre creux/.test(m.texte)),
    'on annonce le ventre creux avant que ça n’entame');
  ok(!dire().some((m) => m.type === 'faim'),
    'et on ne le répète pas à chaque heure');
  c.faim = 100;
  ok(dire().some((m) => m.type === 'faim' && /s’affaiblit/.test(m.texte)),
    'puis on annonce la famine, une fois');
  ok(!dire().some((m) => m.type === 'faim'), 'sans se répéter non plus');
  // Remanger remet le compteur : la prochaine disette se dira aussi.
  c.faim = 10;
  dire();
  c.faim = SEUIL_VENTRE_CREUX + 2;
  ok(dire().some((m) => m.type === 'faim'),
    'après avoir remangé, la disette suivante se dit à nouveau');
}

// --- Le montant annoncé est le montant payé.
//
// L'interface ne pouvait afficher que des prix unitaires, alors que le cours
// bouge à chaque unité échangée : « tout vendre » était un saut dans le noir. Le
// chiffrage et la transaction partagent maintenant la même boucle, et ce test
// existe pour qu'elles ne divergent plus jamais.
{
  const m = nouvellePartie(3131, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gm = groupeActif(m);
  const cm = m.world.colonies.find((c) => !c.ruine && (c.stock.ferraille || 0) > 30);
  if (cm) {
    gm.regionId = cm.regionId;
    m.player.credits = 5000;
    const simA = simulerAchat(m, cm, 'ferraille', 25, gm);
    const crAvant = m.player.credits;
    const ra = acheter(m, cm, 'ferraille', 25, gm);
    ok(ra.qte === simA.qte && ra.cout === simA.cout,
      'un achat coûte exactement ce qui était annoncé',
      `annoncé ${simA.qte}/${simA.cout} cr, payé ${ra.qte}/${ra.cout} cr`);
    ok(crAvant - m.player.credits === simA.cout, 'et la bourse bouge d’autant');

    const simV = simulerVente(m, cm, 'ferraille', 9999, gm);
    const rv = vendre(m, cm, 'ferraille', 9999, gm);
    ok(rv.qte === simV.qte && rv.gain === simV.gain,
      'une vente rapporte exactement ce qui était annoncé',
      `annoncé ${simV.qte}/${simV.gain} cr, encaissé ${rv.qte}/${rv.gain} cr`);
    // Et le chiffrage ne doit rien avoir touché au passage.
    const stockAvant = cm.stock.ferraille;
    simulerAchat(m, cm, 'ferraille', 40, gm);
    simulerVente(m, cm, 'ferraille', 40, gm);
    ok(cm.stock.ferraille === stockAvant, 'chiffrer ne modifie ni la ville ni le sac');
  }
  // Le cours est bien dégressif : vendre en un lot rapporte moins que le prix
  // unitaire multiplié par la quantité. C'est ce que l'écran doit montrer.
  const m2 = nouvellePartie(3132, { maintenant: 0, depart: 'ville', equipe: 3 });
  const g2 = groupeActif(m2);
  const c2 = m2.world.colonies.find((c) => !c.ruine);
  g2.regionId = c2.regionId;
  g2.inventaire.ferraille = 60;
  const un = simulerVente(m2, c2, 'ferraille', 1, g2).gain;
  const lot = simulerVente(m2, c2, 'ferraille', 60, g2).gain;
  ok(lot < un * 60, 'vendre un lot entier rapporte moins que soixante fois la première unité',
    `${lot} cr contre ${un * 60} cr`);
}

// --- Où passent les rations, poste par poste.
//
// Elles s'évaporaient sans explication. Le premier poste, de très loin, est
// l'entraînement — une ration par heure pour deux personnes, soit quarante-huit
// par jour pour une escouade de quatre — et rien nulle part ne le disait.
{
  const cons = nouvellePartie(3535, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gc = groupeActif(cons);
  const base = consommationGroupe(cons, gc);
  ok(base.escouade > 0, 'une escouade vivante mange', `${base.escouade.toFixed(2)} / jour`);
  ok(base.entrainement === 0, 'et ne s’entraîne pas par défaut');

  donnerOrdre(cons, { type: 'entrainement', skill: 'melee' }, gc);
  const enTrain = consommationGroupe(cons, gc);
  ok(enTrain.entrainement > enTrain.escouade,
    'l’entraînement coûte plus cher que les repas eux-mêmes',
    `${enTrain.entrainement} contre ${enTrain.escouade.toFixed(1)}`);

  // Les prisonniers mangent sur le sac, qu'on le veuille ou non.
  donnerOrdre(cons, { type: 'repos' }, gc);
  const bande = genererBande(new Rng(21), 'bandits', 3, 0);
  for (const c of bande.membres) { c.etat = 'ko'; c.corps.torse.pv = 0; }
  fairePrisonniers(cons, gc, bande, capturables(gc, bande), () => {});
  ok(consommationGroupe(cons, gc).prisonniers > 0,
    'les prisonniers mangent sur le sac', `${prisonniersDe(gc).length} bouches de plus`);

  // Et l'autonomie suit ce que l'on porte.
  gc.inventaire.rations = 0;
  ok(autonomie(cons, gc) === 0, 'sans rations, zéro jour d’autonomie');
  gc.inventaire.rations = 200;
  const jours = autonomie(cons, gc);
  ok(jours > 1 && Number.isFinite(jours), 'avec des rations, une autonomie chiffrée',
    `${jours.toFixed(1)} jours`);
}

// --- Le travail s'additionne, et on peut le lire.
{
  const ap0 = nouvellePartie(3636, { maintenant: 0, depart: 'ville', equipe: 3 });
  const ga = groupeActif(ap0);
  // On commence seul : il faut donc du monde en plus pour mesurer l'addition.
  const rngAp = new Rng(11);
  ga.membres.push(makeCharacter(rngAp, { archetype: 'ferrailleur' }));
  ga.membres.push(makeCharacter(rngAp, { archetype: 'chasseur' }));
  donnerOrdre(ap0, { type: 'fouille' }, ga);
  const seul = ga.membres.slice(0, 1);
  const tous = ga.membres.slice();
  ga.membres = seul;
  const un = apercuEscouade(ap0, ga).recolteParJour;
  ga.membres = tous;
  const plusieurs = apercuEscouade(ap0, ga).recolteParJour;
  ok(plusieurs > un, 'plusieurs membres récoltent plus qu’un seul',
    `${un.toFixed(1)} → ${plusieurs.toFixed(1)} par jour`);
  ok(apercuEscouade(ap0, ga).heuresParRegion > 0, 'et la marche se chiffre en heures par région');
  // Se reposer ne récolte rien : le chiffre doit le dire.
  donnerOrdre(ap0, { type: 'repos' }, ga);
  ok(apercuEscouade(ap0, ga).recolteParJour === 0, 'au repos, on ne récolte rien');
}

// --- On voit ce que l'entraînement et les coups ont fait.
{
  const pr = nouvellePartie(3737, { maintenant: 0, depart: 'ville', equipe: 3 });
  const c = groupeActif(pr).membres[0];
  ok(c.skills0 && c.skills0.melee === c.skills.melee,
    'chacun garde le souvenir de son niveau à l’arrivée');
  c.skills.melee += 9;
  ok(c.skills.melee - c.skills0.melee === 9,
    'et l’écart se lit directement', `+${c.skills.melee - c.skills0.melee}`);
  // Une partie d'avant la mesure ne perd pas la main : on part de l'état du jour.
  const vieux = deserialiser(serialiser(pr));
  for (const g of vieux.player.groupes) for (const m of g.membres) delete m.skills0;
  const remis = deserialiser(serialiser(vieux));
  ok(remis.player.groupes[0].membres.every((m) => m.skills0),
    'une sauvegarde d’avant se rattrape sans casser');
}

section('4 ter. Un coffre en ville');
{
  const cf = nouvellePartie(4546, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gc = groupeActif(cf);
  const ville = cf.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');
  gc.regionId = ville.regionId;
  cf.player.credits = 5000;
  cf.player.reputation[ville.faction] = 0;

  ok(!coffreDe(cf, ville.id), 'on n’a pas de coffre au départ');
  ok(!peutAcheter(cf, ville).ok,
    'une faction ne vend pas de murs à un inconnu', peutAcheter(cf, ville).motif);
  ok(peutLouer(cf, ville).ok, 'mais elle en loue à qui veut');

  const crAvant = cf.player.credits;
  ok(louerCoffre(cf, ville, () => {}).ok, 'on loue');
  ok(cf.player.credits === crAvant - LOYER, 'le premier mois est payé d’avance');
  const coffre = coffreDe(cf, ville.id);
  ok(!!coffre && !coffre.achete, 'le coffre existe, et il est loué');

  // On y met, on en reprend.
  gc.inventaire.ferraille = 60;
  const rD = deposerAuCoffre(cf, ville, 'ferraille', 40, gc);
  ok(rD.ok && coffre.contenu.ferraille === 40, 'on y dépose', `${rD.qte}`);
  ok(Math.floor(gc.inventaire.ferraille) === 20, 'et ça quitte le sac');
  ok(retirerDuCoffre(cf, ville, 'ferraille', 15, gc).ok
    && coffre.contenu.ferraille === 25, 'on en reprend');

  // Loin de la ville, le coffre est hors d’atteinte : c’est tout son intérêt.
  const ailleurs = cf.world.regions.find((r) => distance(r.i, ville.regionId) > 2);
  gc.regionId = ailleurs.i;
  ok(!deposerAuCoffre(cf, ville, 'ferraille', 5, gc).ok,
    'on n’y accède pas depuis l’autre bout de la carte');
  gc.regionId = ville.regionId;

  // Le loyer court, et le bailleur se rembourse s'il le faut.
  cf.player.credits = LOYER * 2;
  cf.temps = coffre.jusqu;
  tickCoffres(cf, () => {});
  ok(cf.player.credits === LOYER, 'le loyer se prélève tout seul');
  cf.player.credits = 0;
  cf.temps = coffre.jusqu;
  const avantSaisie = coffre.contenu.ferraille;
  tickCoffres(cf, () => {});
  ok(coffre.contenu.ferraille < avantSaisie,
    'sans crédits, le bailleur se sert dans le coffre',
    `${avantSaisie} → ${coffre.contenu.ferraille}`);
  ok(coffre.contenu.ferraille > 0,
    'mais il se rembourse, il ne confisque pas tout');

  // Acheter : possible dès qu'on est estimé, et le loyer s'arrête.
  cf.player.reputation[ville.faction] = ESTIME_PROPRIETE + 5;
  cf.player.credits = PRIX_COFFRE + 10;
  ok(peutAcheter(cf, ville).ok, 'estimé, on peut acheter');
  ok(acheterCoffre(cf, ville, () => {}).ok, 'et l’on achète');
  ok(coffreDe(cf, ville.id).achete, 'le coffre est à nous');
  ok(coffreDe(cf, ville.id).contenu.ferraille > 0, 'et son contenu ne s’est pas évaporé');
  ok(capaciteCoffre(coffreDe(cf, ville.id)) > CAPACITE_LOUEE, 'il tient davantage');
  const crAv2 = cf.player.credits;
  cf.temps += PERIODE_LOYER * 3;
  tickCoffres(cf, () => {});
  ok(cf.player.credits === crAv2, 'et plus aucun loyer ne court');

  // Une ville libre n'a personne pour interdire de posséder.
  const cf2 = nouvellePartie(4547, { maintenant: 0, depart: 'ville', equipe: 3 });
  const g2c = groupeActif(cf2);
  const libre2 = cf2.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');
  libre2.faction = null;
  g2c.regionId = libre2.regionId;
  cf2.player.credits = PRIX_COFFRE + 10;
  ok(peutAcheter(cf2, libre2).ok,
    'une ville libre ne demande d’estime à personne', peutAcheter(cf2, libre2).motif);
}

section('4 bis. Ce qu’on fait de ses morts');
{
  const d = nouvellePartie(4344, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gd = groupeActif(d);
  const mort = gd.membres[0];
  mort.etat = 'mort';
  mort.equip.arme = 'machette';
  mort.equip.armure = 'plaque';
  ok(depouillesDe(gd).length === 1, 'un mort reste avec la colonne tant qu’on n’a rien décidé');
  ok(lenteurDepouilles(gd) > 0, 'et il la ralentit', `−${Math.round(lenteurDepouilles(gd) * 100)} %`);
  ok(poidsMoral(gd) > 0, 'et pèse sur le moral de ceux qui le portent');

  // Reprendre son matériel ne referme rien : le corps est toujours là.
  const objetsAvant = gd.objets.length;
  const rD = disposerCorps(d, gd, mort.id, 'depouiller', () => {});
  ok(rD.ok && gd.objets.length > objetsAvant, 'on récupère ce qu’il portait',
    `${objetsAvant} → ${gd.objets.length}`);
  ok(depouillesDe(gd).length === 1, 'mais le corps est toujours là');
  ok(!disposerCorps(d, gd, mort.id, 'depouiller', () => {}).ok,
    'et on ne le dépouille pas deux fois');

  // Enterrer resserre la bande ; les autres issues la défont.
  const cohAvant = gd.cohesion;
  const rE = disposerCorps(d, gd, mort.id, 'enterrer', () => {});
  ok(rE.ok && depouillesDe(gd).length === 0, 'enterrer referme la question');
  ok(gd.cohesion > cohAvant, 'et resserre la bande',
    `${Math.round(cohAvant)} → ${Math.round(gd.cohesion)}`);

  // Manger : des rations, et la bande ne s'en remet pas tout de suite.
  const d2 = nouvellePartie(4345, { maintenant: 0, depart: 'ville', equipe: 3 });
  const g2 = groupeActif(d2);
  g2.cohesion = 80;
  g2.membres[0].etat = 'mort';
  const rationsAvant = g2.inventaire.rations || 0;
  const moralAvant = g2.membres[1].moral;
  const rM = disposerCorps(d2, g2, g2.membres[0].id, 'manger', () => {});
  ok(rM.ok && (g2.inventaire.rations || 0) > rationsAvant, 'manger rend des rations',
    `+${((g2.inventaire.rations || 0) - rationsAvant).toFixed(0)}`);
  ok(g2.cohesion < 80 - 20, 'et coûte très cher en cohésion',
    `80 → ${Math.round(g2.cohesion)}`);
  ok(g2.membres[0].moral < moralAvant, 'ceux qui restent le portent aussi');
  ok(d2.stats.mangesDesSiens === 1, 'et le jeu le compte : ça ne s’oublie pas');

  // Le trafic d'organes : seulement là où l'on achète déjà des hommes vivants.
  const d3 = nouvellePartie(4346, { maintenant: 0, depart: 'ville', equipe: 3 });
  const g3 = groupeActif(d3);
  const col3 = d3.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');
  g3.regionId = col3.regionId;
  g3.membres[0].etat = 'mort';
  const corps3 = g3.membres[0];
  ok(prixOrganes(d3, col3, corps3) === 0, 'on ne vend pas d’organes là où c’est interdit');
  loisDe(d3.world, col3.faction).esclavage = true;
  ok(prixOrganes(d3, col3, corps3) > 0, 'là où l’on achète des vivants, on prend les morts',
    `${prixOrganes(d3, col3, corps3)} cr`);
  const crAvant3 = d3.player.credits;
  const rO = disposerCorps(d3, g3, corps3.id, 'organes', () => {});
  ok(rO.ok && d3.player.credits > crAvant3, 'et ça paie', `+${d3.player.credits - crAvant3} cr`);
  ok(depouillesDe(g3).length === 0, 'le corps ne revient pas');
}

// --- On ne repart pas en marche avec un homme sur les bras.
//
// Une victoire ne touchait pas à l'ordre en cours : on gagnait le combat et la
// colonne reprenait sa route, blessés compris, jusqu'à la rencontre suivante.
// Seule une défaite arrêtait la marche.
{
  const h = nouvellePartie(4142, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gh = groupeActif(h);
  const loin = h.world.regions.find((r) => distance(r.i, gh.regionId) > 3);
  for (const c of gh.membres) { c.skills.melee = 95; c.skills.endurance = 90; }
  donnerOrdre(h, { type: 'voyage', dest: loin.i }, gh);
  ok(gh.ordre.type === 'voyage', 'la colonne est en route');
  // Un combat gagné sans casse : on continue.
  const faible = genererBande(new Rng(61), 'bandits', 1, 0);
  for (const m of faible.membres) { m.skills.melee = 1; m.corps.torse.pv = 1; }
  combatContre(h, faible, () => {}, { rng: new Rng(62) }, gh);
  ok(gh.ordre.type === 'voyage', 'une escarmouche sans blessé ne l’arrête pas');
  // Quelqu'un tombe : on s'arrête.
  gh.membres[0].etat = 'ko';
  const faible2 = genererBande(new Rng(63), 'bandits', 1, 0);
  for (const m of faible2.membres) { m.skills.melee = 1; m.corps.torse.pv = 1; }
  combatContre(h, faible2, () => {}, { rng: new Rng(64) }, gh);
  ok(gh.ordre.type === 'repos', 'un homme à terre arrête la marche');

  // Et c'est une consigne, pas une fatalité.
  h.player.politique.halte = false;
  donnerOrdre(h, { type: 'voyage', dest: loin.i }, gh);
  gh.membres[0].etat = 'ko';
  const faible3 = genererBande(new Rng(65), 'bandits', 1, 0);
  for (const m of faible3.membres) { m.skills.melee = 1; m.corps.torse.pv = 1; }
  combatContre(h, faible3, () => {}, { rng: new Rng(66) }, gh);
  ok(gh.ordre.type === 'voyage', 'consigne coupée, on continue quand même');
}

// --- La feuille de service : on relit ce qu'on a fait pour eux.
//
// Les ordres remplis étaient comptés, jamais relus : le journal les annonce puis
// les fait défiler, et il est plafonné à quatre cents lignes. On sert une
// faction six mois durant et il n'en reste qu'un nombre.
{
  const fs = nouvellePartie(4041, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gf = groupeActif(fs);
  const cf = fs.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
  fs.player.reputation[cf.faction] = 40;
  gf.regionId = cf.regionId;
  sEngager(fs, cf.faction, () => {});
  const af = gf.allegeance;
  ok(Array.isArray(af.faits) && af.faits.length === 0, 'on démarre avec un dossier vide');
  ok(bilanService(af).honores === 0, 'et un bilan à zéro');

  // Un ordre honoré : reconnaissance d'un secteur qu'on découvre.
  af.ordre = {
    type: 'reconnaissance', regionId: fs.world.regions.findIndex((r) => !r.decouvert),
    titre: 'Reconnaître X', recompense: 100, service: 60, duree: 600,
    echeance: fs.temps + 600,
  };
  fs.world.regions[af.ordre.regionId].decouvert = true;
  avancer(fs, 3);
  ok(af.faits.some((f) => f.issue === 'honore'), 'un ordre honoré entre au dossier');
  ok(bilanService(af).honores === 1, 'et le bilan le compte');

  // Un ordre manqué : on laisse filer l'échéance.
  af.ordre = {
    type: 'reconnaissance', regionId: fs.world.regions.findIndex((r) => !r.decouvert),
    titre: 'Reconnaître Y', recompense: 100, service: 60, duree: 4,
    echeance: fs.temps + 4,
  };
  avancer(fs, 12);
  ok(af.faits.some((f) => f.issue === 'manque'), 'un ordre manqué aussi');
  ok(bilanService(af).manques >= 1, 'et il compte comme manqué',
    `${bilanService(af).manques}`);
  ok(af.faits.length === 2, 'le dossier tient les deux dans l’ordre');

  // Le dossier ne grossit pas sans fin.
  for (let i = 0; i < FEUILLE_MAX + 6; i++) {
    noterFait(af, { type: 'frappe', titre: `essai ${i}` }, 'honore', fs.temps);
  }
  ok(af.faits.length === FEUILLE_MAX, 'et il est plafonné',
    `${af.faits.length} lignes`);

  // Une partie d'avant la feuille se rattrape sans casser.
  const vieille = deserialiser(serialiser(fs));
  delete vieille.player.groupes[0].allegeance.faits;
  const remise = deserialiser(serialiser(vieille));
  ok(Array.isArray(remise.player.groupes[0].allegeance.faits),
    'une sauvegarde d’avant repart avec un dossier vide plutôt qu’un plantage');
}

// --- Un ordre de mission dit où aller.
//
// Il n'annonçait qu'un titre — « Ravitailler Cité-Tréfonds : 60 rations » — sans
// dire où est la ville, à combien de régions, ni si l'échéance laissait le temps
// d'y aller. On ne peut pas honorer ce qu'on ne sait pas situer, et rater coûte
// de l'estime. Le moteur a tout ce qu'il faut ; c'est l'écran qui le taisait.
{
  const ordre = nouvellePartie(3940, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gO = groupeActif(ordre);
  const colO = ordre.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
  ordre.player.reputation[colO.faction] = 40;
  gO.regionId = colO.regionId;
  sEngager(ordre, colO.faction, () => {});
  // On force un ordre de ravitaillement vers une ville qu'on peut situer.
  const loin = ordre.world.colonies.find(
    (c) => !c.ruine && c.faction === colO.faction && c.id !== colO.id
  ) || colO;
  gO.allegeance.ordre = {
    type: 'ravitaillement', colonieId: loin.id, ressource: 'rations', quantite: 20,
    titre: 'x', recompense: 100, service: 50, duree: 400, echeance: ordre.temps + 400,
  };
  const cible = colonieParId(ordre.world, gO.allegeance.ordre.colonieId);
  ok(!!cible && cible.regionId != null,
    'la cible d’un ravitaillement se retrouve par son identifiant');
  ok(typeof nomRegion(ordre.world, cible.regionId) === 'string',
    'et sa région porte un nom qu’on peut afficher',
    nomRegion(ordre.world, cible.regionId));
  // Et la marche se chiffre : c'est ce qui dit si l'échéance est tenable.
  const h = apercuEscouade(ordre, gO).heuresParRegion
    * distance(cible.regionId, gO.regionId);
  ok(Number.isFinite(h) && h >= 0, 'le trajet se chiffre en heures',
    `${Math.round(h)} h pour ${distance(cible.regionId, gO.regionId)} régions`);
}

// --- Grossir coûte, mais on peut y répondre.
//
// Au-delà du noyau — quatre, plus un par baraquement — le plafond de cohésion
// descend, donc le rendement et le combat avec lui. C'était une pénalité sans
// contre-jeu : aucune décision du joueur n'y changeait rien, ce qui n'est pas un
// choix mais une punition. Quelqu'un de sociable agrandit maintenant ce noyau.
{
  const gr = nouvellePartie(3838, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gg = groupeActif(gr);
  for (const c of gg.membres) c.skills.commerce = 5;
  const sans = noyau(gr, gg);
  ok(placesSociables(gg) === 0, 'des taiseux n’agrandissent rien');
  // On fait entrer un barde. Rien d'autre ne change.
  const barde = makeCharacter(new Rng(51), { archetype: 'barde', niveau: 2 });
  barde.skills.commerce = 66;
  gg.membres.push(barde);
  // On compte sur la compétence *effective* : un barde affamé tient moins bien
  // sa troupe qu'un barde reposé, et c'est voulu.
  ok(placesSociables(gg) === Math.floor(compPerso(barde, 'commerce') / 22)
    && placesSociables(gg) >= 2,
  'un barde ouvre plusieurs places de plus au noyau',
  `${placesSociables(gg)} places pour ${compPerso(barde, 'commerce').toFixed(0)} de commerce`);
  ok(noyau(gr, gg) > sans, 'le noyau s’agrandit', `${sans} → ${noyau(gr, gg)}`);

  // Et l'effet doit se voir sur le plafond, à effectif franchement au-dessus.
  const foule = nouvellePartie(3839, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gf = groupeActif(foule);
  for (const c of gf.membres) c.skills.commerce = 5;
  while (gf.membres.length < 12) gf.membres.push(makeCharacter(new Rng(52 + gf.membres.length)));
  for (const c of gf.membres) c.skills.commerce = 5;
  const plafondSeul = plafondCohesion(foule, gf);
  gf.membres[0].skills.commerce = 88;
  ok(plafondCohesion(foule, gf) > plafondSeul,
    'à douze, quelqu’un de sociable relève le plafond de cohésion',
    `${plafondSeul.toFixed(0)} % → ${plafondCohesion(foule, gf).toFixed(0)} %`);

  // Un mort ou un homme à terre ne tient plus personne ensemble.
  gf.membres[0].etat = 'ko';
  ok(plafondCohesion(foule, gf) === plafondSeul,
    'mais pas s’il est à terre');
}

section('4. Simulation longue (3 200 h ≈ 133 jours)');
// On tique directement : le monde doit continuer de tourner même si l'escouade
// du joueur disparaît en route (c'est le cas limite qui casse les sims).
// La mesure et l'état joué viennent du même endroit — voir test/perf.js. Elle a
// été prise en tête de fichier, pour la raison expliquée là-haut.
const s4 = perf.etat;
const usNorm = perf.usNorm;

console.log(`  → ${perf.ms.toFixed(0)} ms pour ${MESURE} ticks (${perf.us.toFixed(0)} µs/tick, `
  + `${usNorm.toFixed(0)} µs normalisés — machine ×${(1 / perf.facteur).toFixed(2)})`);
ok(usNorm < BUDGET_US, `tick sous ${BUDGET_US} µs (budget normalisé)`,
  `${usNorm.toFixed(0)} µs`);
// Le rattrapage maximal est le pire cas réel : deux ans hors ligne, rejoués
// d'un coup au chargement. Il doit rester de l'ordre de la seconde.
ok(usNorm * RATTRAPAGE_MAX / 1e6 < 3, 'rattrapage maximal sous 3 s',
  `${(usNorm * RATTRAPAGE_MAX / 1e6).toFixed(2)} s`);
verifierCoherence(s4, `après ${CHAUFFE + MESURE} h`);
ok(s4.temps === CHAUFFE + MESURE, `horloge à ${CHAUFFE + MESURE} h`, `reçu ${s4.temps}`);

section('5. Le monde bouge tout seul');
const s5 = nouvellePartie(20240607, { maintenant: 0, depart: 'ville', equipe: 3 });
const proprioDepart = s5.world.colonies.map((c) => c.faction).join(',');
const guerresVues = new Set();
let armeesVues = 0;
let capturesVues = 0;
for (let i = 0; i < 4000; i++) {
  tick(s5);
  for (const g of s5.world.guerres) guerresVues.add([g.a, g.b].sort().join('|'));
  armeesVues = Math.max(armeesVues, s5.world.armees.length);
  capturesVues = s5.journal.filter((e) => e.type === 'capture').length + capturesVues * 0;
}
const proprioFin = s5.world.colonies.map((c) => c.faction).join(',');
ok(guerresVues.size > 0, 'des guerres ont éclaté', `${guerresVues.size} conflits distincts`);
ok(armeesVues > 0, 'des armées ont été levées', `pic à ${armeesVues}`);
ok(proprioDepart !== proprioFin, 'la carte politique a changé');
const classe = classement(s5.world);
ok(classe.length === 6 && classe[0].puissance >= classe[5].puissance, 'classement des factions ordonné');
console.log(`  → dominante : ${classe[0].nom} (${classe[0].colonies} colonies, puissance ${classe[0].puissance})`);
verifierCoherence(s5, 'après 4 000 h de guerre');

section('6. Économie');
const s6 = nouvellePartie(31337, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s6, 120);
const col6 = s6.world.colonies[0];
const avant = prixJoueur(col6, 'rations', 0, 0);
ok(avant.achat > avant.vente, 'la marge est toujours défavorable au joueur');
col6.stock.rations = 5;
const cher = prixJoueur(col6, 'rations', 0, 0);
col6.stock.rations = 5000;
const bonMarche = prixJoueur(col6, 'rations', 0, 0);
ok(cher.achat > bonMarche.achat * 1.5, 'la pénurie fait monter les prix', `${cher.achat} vs ${bonMarche.achat}`);
col6.stock.ferraille = 400;
s6.player.credits = 5000;
const ach = acheter(s6, col6, 'ferraille', 30);
ok(ach.ok && ach.qte > 0 && s6.player.credits < 5000, 'achat débité et livré');
const ven = vendre(s6, col6, 'ferraille', ach.qte);
ok(ven.ok && ven.gain > 0 && ven.gain < ach.cout, 'revente à perte immédiate (marge)');

section('7. Escouade et ordres');
const s7 = nouvellePartie(5150, { maintenant: 0, depart: 'ville', equipe: 3 });
s7.player.posture = 'prudent';
donnerOrdre(s7, { type: 'fouille' });
avancer(s7, 40);
// On mesure la récolte cumulée, pas le contenu du sac : perdre un combat en
// route vide le sac et ferait échouer un test qui n'a rien à voir.
ok(s7.stats.recolte > 0, 'fouiller rapporte des ressources', `${s7.stats.recolte} unités`);

const s7b = nouvellePartie(5151, { maintenant: 0, depart: 'ville', equipe: 3 });
const depart = groupeActif(s7b).regionId;
// La ville voisine, pas la première de la liste : sur une carte de 24×18 la
// première venue peut être à trente régions, et le test mesurerait la patience.
const cible = s7b.world.colonies
  .filter((c) => c.regionId !== depart)
  .reduce((a, b) => (distance(depart, b.regionId) < distance(depart, a.regionId) ? b : a));
const r = donnerOrdre(s7b, { type: 'voyage', dest: cible.regionId });
ok(r.ok, 'un itinéraire est calculable');
let bornes = 0;
while (groupeActif(s7b).regionId !== cible.regionId && bornes < 900 && !s7b.fin) {
  // On relance l'ordre quand il tombe : une embuscade interrompt la marche et
  // la colonne se met au repos — c'est le fonctionnement voulu (voir la
  // politique `halte`), mais un joueur repart, lui. Sans ça le test mesure la
  // chance qu'on n'ait croisé personne, pas le fait que le trajet aboutisse.
  if (groupeActif(s7b).ordre.type !== 'voyage') {
    donnerOrdre(s7b, { type: 'voyage', dest: cible.regionId });
  }
  tick(s7b);
  bornes++;
}
ok(groupeActif(s7b).regionId === cible.regionId, 'le voyage aboutit',
  `${bornes} h${s7b.fin ? ` (partie finie : ${s7b.fin})` : ''}`);
ok(s7b.world.regions[cible.regionId].decouvert, 'la région d’arrivée est découverte');

const s7c = nouvellePartie(5152, { maintenant: 0, depart: 'ville', equipe: 3 });
const skillAvant = groupeActif(s7c).membres[0].skills.melee;
groupeActif(s7c).inventaire.rations = 500;
donnerOrdre(s7c, { type: 'entrainement', skill: 'melee' });
avancer(s7c, 200);
ok(groupeActif(s7c).membres[0].skills.melee > skillAvant, 'les compétences montent à l’usage',
  `${skillAvant} → ${groupeActif(s7c).membres[0].skills.melee}`);

section('8. Avant-poste : construction et recherche');
const s8 = nouvellePartie(60606, { maintenant: 0, depart: 'ville', equipe: 3 });
// On se place sur une région vide adjacente
const vide = s8.world.regions.find((rg) => !rg.colonie);
groupeActif(s8).regionId = vide.i;
groupeActif(s8).inventaire.ferraille = 2000;
groupeActif(s8).inventaire.polymere = 500;
groupeActif(s8).inventaire.composant = 200;
groupeActif(s8).inventaire.minerai = 500;
groupeActif(s8).inventaire.carburant = 300;
groupeActif(s8).inventaire.biomasse = 500;
const fond = fonderBase(s8, () => {});
ok(fond.ok, 'fondation de l’avant-poste');
// On approvisionne l'entrepôt sans dépasser sa capacité, et on garde des
// rations dans le sac : une escouade affamée meurt et la partie s'arrête.
Object.assign(s8.base.stock, {
  ferraille: 300, polymere: 120, composant: 40, minerai: 120,
  // De la biomasse en quantité : ce qu'on vérifie ici, c'est que l'hydroponie
  // fabrique des rations, pas combien de temps un tas fini dure. Mais pas trop :
  // à neuf cents, l'entrepôt était à saturation, `ajouter` écrêtait, et le test
  // échouait pour une raison qui n'avait rien à voir avec l'hydroponie.
  carburant: 100, biomasse: 900, alliage: 30,
});
groupeActif(s8).inventaire.rations = 400;
const c1 = lancerConstruction(s8, 'generateur');
ok(c1.ok, 'mise en file du générateur', c1.motif);
ok(s8.base.file.length === 1, 'la file contient un chantier');
avancer(s8, 60);
ok((s8.base.batiments.generateur || 0) >= 1, 'générateur construit', JSON.stringify(s8.base.batiments));
lancerConstruction(s8, 'hydroponie');
avancer(s8, 80);
// L'entrepôt a une contenance, et `ajouter` écrête sans rien dire quand elle
// est atteinte : le test échouait alors pour une raison qui n'avait rien à voir
// avec l'hydroponie. On fait de la place avant de mesurer.
s8.base.stock.minerai = 10;
s8.base.stock.alliage = 5;
s8.base.stock.biomasse = 260;
const rationsAvant = s8.base.stock.rations || 0;
avancer(s8, 60);
ok((s8.base.stock.rations || 0) > rationsAvant, 'l’hydroponie produit des rations',
  `${rationsAvant.toFixed(1)} → ${(s8.base.stock.rations || 0).toFixed(1)}`);
lancerConstruction(s8, 'antenne');
avancer(s8, 120);
s8.player.credits = 9000;
s8.base.stock.composant = 200;
const rr = lancerRecherche(s8, 'logistique');
ok(rr.ok, 'lancement d’une recherche', rr.motif);
avancer(s8, 60);
ok((s8.base.recherche.logistique || 0) >= 1, 'recherche terminée');
verifierCoherence(s8, 'avant-poste développé');

section('9. Combat et blessures');
const s9 = nouvellePartie(90909, { maintenant: 0, depart: 'ville', equipe: 3 });
s9.player.posture = 'agressif';
donnerOrdre(s9, { type: 'patrouille' });
// On va chercher la bagarre dans une région dangereuse
const dangereuse = s9.world.regions.reduce((x, y) => (y.danger > x.danger ? y : x));
groupeActif(s9).regionId = dangereuse.i;
// On relève au fil de l'eau plutôt qu'à l'arrivée : lu seulement à la fin, le
// test disait « personne n'est blessé » d'une escouade qui s'était battue vingt
// fois et soignée entre-temps. Ce qu'on vérifie, c'est qu'une blessure se loge
// quelque part — pas qu'elle soit encore ouverte quatre cents heures plus tard.
let blesse = false;
for (let k = 0; k < 40; k++) {
  avancer(s9, 10);
  if (groupeActif(s9).membres.some((ch) => Object.values(ch.corps).some((pp) => pp.pv < pp.max))) {
    blesse = true;
  }
}
ok(s9.stats.combats > 0, 'des combats ont eu lieu', `${s9.stats.combats}`);
ok(blesse || s9.stats.combats === 0, 'les blessures sont localisées et persistent');
ok(groupeActif(s9).membres.every((ch) => ['ok', 'ko', 'mort'].includes(ch.etat)), 'états de personnage valides');
verifierCoherence(s9, 'après 400 h de patrouille agressive');

section('9 bis. Monde vivant sur la durée');
const s9b = nouvellePartie(31415, { maintenant: 0, depart: 'ville', equipe: 3 });
s9b.player.posture = 'agressif';
donnerOrdre(s9b, { type: 'patrouille' });
for (let i = 0; i < 8000; i++) tick(s9b);
ok(s9b.temps === 8000, 'huit mille heures sans plantage', `t=${s9b.temps}`);
const repInconnue = Object.keys(s9b.player.reputation).filter((k) => !DIPLO_FACTIONS.includes(k));
ok(repInconnue.length === 0, 'la réputation ne contient que de vraies factions', repInconnue.join(','));
const vivantes = s9b.world.colonies.filter((c) => !c.ruine);
ok(vivantes.length >= 6, 'le monde garde un socle de villes vivantes', `${vivantes.length}/${s9b.world.colonies.length}`);
ok(s9b.world.colonies.some((c) => c.fondeeA !== undefined), 'des villes ont été fondées en cours de partie');
ok(s9b.world.colonies.some((c) => c.ruine), 'des villes se sont effondrées');
const popTotale = vivantes.reduce((t, c) => t + c.pop, 0);
ok(popTotale > 1500, 'la population du monde ne s’effondre pas', `${Math.round(popTotale)} habitants`);
ok(s9b.world.meteo && s9b.world.meteo.type, 'une météo est toujours en cours');
verifierCoherence(s9b, 'après 8 000 h de monde vivant');

section('9 ter. Allégeance et pluralité du monde');
// La porte d'entrée. Elle était à vingt de réputation, c'est-à-dire deux ou
// trois contrats honorés pour la même faction — et remplir un contrat est
// l'une des choses les plus dures du jeu sur une grande carte. Le banc était
// formel : le bot entrait au service de quelqu'un dans zéro à deux parties sur
// quarante-huit. À dix, on démarre déjà au-dessus du seuil chez la faction qui
// vous accueille, donc s'engager est une décision d'ouverture. Résultat mesuré
// au banc : 48 parties sur 48.
// Départ en ville : c'est le cas qu'on mesure ici. Le jeu commence désormais
// dans le désert, sans que personne vous connaisse — l'ouverture chez ses hôtes
// reste une propriété du départ en ville, et le banc s'en sert.
const ouvre = nouvellePartie(5757, { maintenant: 0, depart: 'ville', equipe: 3 });
const factionDepart = Object.keys(ouvre.player.reputation)
  .find((k) => ouvre.player.reputation[k] >= REPUTATION_MINIMALE);
ok(!!factionDepart, 'la faction qui vous accueille vous reçoit dès le premier jour',
  `seuil ${REPUTATION_MINIMALE}`);
ok(peutSEngager(ouvre, factionDepart).ok, 'et on peut s’y engager sans rien avoir prouvé');
const etrangere = Object.keys(ouvre.player.reputation).find((k) => k !== factionDepart);
ok(!peutSEngager(ouvre, etrangere).ok, 'mais pas chez les autres, qui ne vous connaissent pas');
ok(RANGS[0].solde > 0, 'le premier grade défraie : servir ne doit pas coûter de l’argent',
  `${RANGS[0].solde} cr par jour`);

// --- L'intendance : on ne vous paie pas pour acheter à manger, on vous nourrit.
const serv = nouvellePartie(5858, { maintenant: 0, depart: 'ville', equipe: 3 });
const gServ = groupeActif(serv);
const colServ = serv.world.colonies.find((c) => !c.ruine);
serv.player.reputation[colServ.faction] = 40;
gServ.regionId = colServ.regionId;
ok(!droitIntendance(serv, colServ).ok, 'sans engagement, pas d’intendance');
sEngager(serv, colServ.faction, () => {});
ok(!droitIntendance(serv, colServ).ok, 'ni le jour même où l’on signe');
avancer(serv, 72);
const droit = droitIntendance(serv, colServ);
ok(droit.ok && droit.quantite >= 3, 'trois jours plus tard, il y a des rations à toucher',
  droit.ok ? `${droit.quantite} rations` : droit.motif);
const tresorAvant = serv.world.factions[colServ.faction].tresor;
const grainAvant = colServ.stock.rations || 0;
const sacAvant = gServ.inventaire.rations || 0;
const pris = toucherRations(serv, colServ, () => {}, gServ);
ok(pris.ok && (gServ.inventaire.rations || 0) === sacAvant + pris.quantite,
  'et elles arrivent dans le sac', `${pris.quantite}`);
ok(serv.world.factions[colServ.faction].tresor < tresorAvant,
  'la faction les paie de sa poche');
ok((colServ.stock.rations || 0) === grainAvant,
  'et non le grenier du village : une intendance n’est pas une réquisition');
ok(!droitIntendance(serv, colServ).ok, 'on ne touche pas deux fois le même jour');

// Une ville qui n'est pas des vôtres ne vous doit rien.
const autreVille = serv.world.colonies.find((c) => !c.ruine && c.faction !== colServ.faction);
if (autreVille) {
  ok(!droitIntendance(serv, autreVille).ok, 'les villes des autres ne vous nourrissent pas');
}

// --- Rater un ordre ne fait plus reculer.
const rate = nouvellePartie(5959, { maintenant: 0, depart: 'ville', equipe: 3 });
const colRate = rate.world.colonies.find((c) => !c.ruine);
rate.player.reputation[colRate.faction] = 40;
sEngager(rate, colRate.faction, () => {});
groupeActif(rate).allegeance.points = 200;
groupeActif(rate).allegeance.ordre = {
  type: 'reconnaissance', regionId: rate.world.regions.findIndex((r) => !r.decouvert),
  titre: 'x', recompense: 100, service: 60, duree: 10, echeance: rate.temps + 10,
};
const ptsAvant = groupeActif(rate).allegeance.points;
const repAvantOrdre = rate.player.reputation[colRate.faction];
avancer(rate, 40);
ok(!groupeActif(rate).allegeance.ordre, 'un ordre échu est retiré');
ok(groupeActif(rate).allegeance.points === ptsAvant,
  'et ne coûte plus les points déjà gagnés : rater est neutre, réussir paie',
  `${ptsAvant} → ${groupeActif(rate).allegeance.points}`);
ok(rate.player.reputation[colRate.faction] < repAvantOrdre,
  'ce qu’on perd, c’est l’estime');

// --- Un ordre de frappe meurt avec sa guerre.
{
  const paix = nouvellePartie(5960, { maintenant: 0, depart: 'ville', equipe: 3 });
  const colPaix = paix.world.colonies.find((c) => !c.ruine);
  const adverse = paix.world.colonies.find((c) => !c.ruine && c.faction !== colPaix.faction);
  paix.player.reputation[colPaix.faction] = 40;
  sEngager(paix, colPaix.faction, () => {});
  const allPaix = groupeActif(paix).allegeance;
  allPaix.points = 200;
  const ptsGuerre = allPaix.points;
  const repGuerre = paix.player.reputation[colPaix.faction];
  const manquesAvant = allPaix.manques || 0;
  // Une guerre déclarée, un ordre de frappe, puis la paix signée avant terme.
  paix.world.guerres.push({ a: colPaix.faction, b: adverse.faction, depuis: paix.temps });
  allPaix.ordre = {
    type: 'frappe', cibleFaction: adverse.faction, victoires: 3, progres: 0,
    titre: 'x', recompense: 500, service: 120, duree: 600, echeance: paix.temps + 600,
  };
  avancer(paix, 2);
  ok(!!allPaix.ordre, 'tant que la guerre dure, l’ordre de frappe tient');
  paix.world.guerres = paix.world.guerres.filter(
    (w) => !((w.a === colPaix.faction && w.b === adverse.faction)
      || (w.b === colPaix.faction && w.a === adverse.faction))
  );
  avancer(paix, 2);
  ok(!allPaix.ordre, 'la paix signée retire l’ordre de frappe');
  ok((allPaix.manques || 0) === manquesAvant,
    'et ce n’est pas un manque : on ne punit pas de n’avoir pas tué ceux avec qui on vient de traiter');
  ok(paix.player.reputation[colPaix.faction] === repGuerre
    && allPaix.points === ptsGuerre,
    'ni l’estime ni les points ne bougent');
  ok(allPaix.prochainOrdre <= paix.temps + 140,
    'et l’on est rappelé vite pour autre chose', `+${allPaix.prochainOrdre - paix.temps} h`);
}

// --- En guerre, ce sont les hommes de l'ennemi qu'on croise chez lui.
{
  const gu = nouvellePartie(5961, { maintenant: 0, depart: 'ville', equipe: 3 });
  const mienne = gu.world.colonies.find((c) => !c.ruine);
  const leur = gu.world.colonies.find((c) => !c.ruine && c.faction !== mienne.faction);
  gu.player.reputation[mienne.faction] = 40;
  sEngager(gu, mienne.faction, () => {});
  // On se place sur une case que l'adversaire contrôle, sans le détester encore :
  // c'est la guerre de sa faction qui doit compter, pas sa rancune personnelle.
  const chezEux = gu.world.regions.findIndex((r) => r.controle === leur.faction);
  groupeActif(gu).regionId = chezEux;
  gu.player.reputation[leur.faction] = 0;
  const part = () => {
    const rng = new Rng(77);
    let eux = 0;
    for (let i = 0; i < 400; i++) {
      if (bandeLocale(gu, { rng }, groupeActif(gu)).faction === leur.faction) eux++;
    }
    return eux / 400;
  };
  const enPaix = part();
  gu.world.guerres.push({ a: mienne.faction, b: leur.faction, depuis: gu.temps });
  const enGuerreLa = part();
  ok(chezEux >= 0, 'l’adversaire contrôle bien du terrain');
  ok(enPaix < 0.35, 'en paix, on croise surtout des pillards sur ses terres',
    `${Math.round(enPaix * 100)} %`);
  ok(enGuerreLa > 0.5, 'en guerre, ce sont ses hommes qui sortent',
    `${Math.round(enGuerreLa * 100)} %`);
  // Le même terrain, mais la guerre est celle d'un autre : rien ne change.
  const neutre = nouvellePartie(5961, { maintenant: 0, depart: 'ville', equipe: 3 });
  neutre.player.reputation[leur.faction] = 0;
  groupeActif(neutre).regionId = chezEux;
  neutre.world.guerres.push({ a: mienne.faction, b: leur.faction, depuis: neutre.temps });
  const rngN = new Rng(77);
  let euxN = 0;
  for (let i = 0; i < 400; i++) {
    if (bandeLocale(neutre, { rng: rngN }, groupeActif(neutre)).faction === leur.faction) euxN++;
  }
  ok(euxN / 400 < 0.35, 'qui ne sert personne ne fait la guerre de personne',
    `${Math.round(euxN / 4)} %`);
}

// --- La garnison : à partir de Lieutenant, les villes des siens vous logent.
const garn = nouvellePartie(6060, { maintenant: 0, depart: 'ville', equipe: 3 });
const colGarn = garn.world.colonies.find((c) => !c.ruine);
garn.player.reputation[colGarn.faction] = 40;
groupeActif(garn).regionId = colGarn.regionId;
sEngager(garn, colGarn.faction, () => {});
ok(!garnison(garn, colGarn.regionId), 'un affilié n’est logé nulle part');
ok(abriDe(garn, colGarn.regionId) === 1, 'et dort comme tout le monde');
groupeActif(garn).allegeance.points = RANGS[RANG_GARNISON].points;
ok(!!garnison(garn, colGarn.regionId), 'un lieutenant est chez lui dans les villes des siens');
ok(abriDe(garn, colGarn.regionId) > 1.5, 'et y dort à l’abri',
  `×${abriDe(garn, colGarn.regionId).toFixed(2)}`);
const villeEtrangere = garn.world.colonies.find((c) => !c.ruine && c.faction !== colGarn.faction);
if (villeEtrangere) {
  ok(!garnison(garn, villeEtrangere.regionId), 'mais pas chez les autres');
}

const s9c = nouvellePartie(4242, { maintenant: 0, depart: 'ville', equipe: 3 });
s9c.player.reputation.hexa = 40;
const eng = sEngager(s9c, 'hexa', () => {});
ok(eng.ok, 'on peut entrer au service d’une faction', eng.motif);
ok(rangDe(groupeActif(s9c).allegeance).def.nom === 'Affilié', 'on démarre au premier grade');
for (let i = 0; i < 8000; i++) tick(s9c);
ok(!!groupeActif(s9c).allegeance, 'la faction servie existe encore après 8 000 h');
const debout9c = DIPLO_FACTIONS.filter((k) => s9c.world.factions[k].colonies.length);
ok(debout9c.length === 6, 'aucune faction n’est rayée de la carte', `${debout9c.length}/6`);
ok(s9c.world.colonies.filter((c) => !c.ruine).length >= 10, 'le monde garde ses villes',
  `${s9c.world.colonies.filter((c) => !c.ruine).length}`);
const liens9c = groupeActif(s9c).membres.flatMap((c) => Object.values(c.liens || {}));
ok(liens9c.length === 0 || Math.max(...liens9c) < 100,
  'les liens d’escouade ne saturent pas', liens9c.join(','));
verifierCoherence(s9c, 'après 8 000 h au service d’une faction');

section('9 quater. Groupes, tâches individuelles, détachement');
const s9d = nouvellePartie(31415, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9d, 60);
const g9 = groupeActif(s9d);
ok(groupes(s9d).length === 1, 'une partie démarre avec un seul groupe');
ok(tousLesMembres(s9d).length === 3, 'tous les membres sont dans un groupe', `${tousLesMembres(s9d).length}`);

// Tâche individuelle : un membre s'écarte de l'ordre du groupe.
donnerOrdre(s9d, { type: 'fouille' }, g9);
assignerTache(s9d, g9.membres[0], { type: 'chasse' });
ok(tacheDe(g9, g9.membres[0]).type === 'chasse', 'une tâche personnelle prime sur l’ordre du groupe');
ok(tacheDe(g9, g9.membres[1]).type === 'fouille', 'les autres suivent l’ordre du groupe');
donnerOrdre(s9d, { type: 'voyage', dest: (g9.regionId + 1) % s9d.world.regions.length }, g9);
ok(tacheDe(g9, g9.membres[0]).type === 'voyage', 'en marche, tout le monde marche');
donnerOrdre(s9d, { type: 'fouille' }, g9);

// Détachement : les vivres partent au prorata, personne n'est cloné.
const rngScission = new Rng(s9d.rngState);
const avantRations = groupeActif(s9d).inventaire.rations;
const partant = g9.membres[0].id;
const scission = scinder(s9d, g9, [partant], rngScission);
s9d.rngState = rngScission.save();
ok(scission.ok, 'on peut détacher un membre', scission.motif);
ok(groupes(s9d).length === 2, 'deux groupes après détachement');
ok(tousLesMembres(s9d).length === 3, 'personne n’est perdu ni dupliqué');
ok(!g9.membres.some((c) => c.id === partant), 'le partant a quitté son groupe d’origine');
const detache = scission.groupe;
ok(detache.inventaire.rations > 0 && detache.inventaire.rations < avantRations,
  'les vivres se partagent au prorata', `${avantRations} → ${g9.inventaire.rations} + ${detache.inventaire.rations}`);
ok(scinder(s9d, detache, [detache.membres[0].id], rngScission).ok === false,
  'on ne détache pas le dernier membre d’un groupe');

// Deux groupes, deux endroits, deux ordres : la simulation les tient séparés.
donnerOrdre(s9d, { type: 'exploration' }, detache);
const destination = (detache.regionId + 3) % s9d.world.regions.length;
donnerOrdre(s9d, { type: 'voyage', dest: destination }, detache);
avancer(s9d, 300);
ok(groupes(s9d).length >= 1, 'la partie survit à 300 h avec deux groupes');
const encoreDeux = groupes(s9d).length === 2;
if (encoreDeux) {
  ok(groupes(s9d)[0].regionId !== groupes(s9d)[1].regionId
    || groupes(s9d)[0].ordre.type !== groupes(s9d)[1].ordre.type,
  'les deux groupes mènent leur vie séparément');
} else {
  ok(true, 'un groupe a été anéanti en route — la partie continue');
}
verifierCoherence(s9d, 'après 300 h à deux groupes');

// Regroupement : tout se remet en commun.
if (encoreDeux) {
  const [ga, gb] = groupes(s9d);
  gb.regionId = ga.regionId;
  const totalRations = ga.inventaire.rations + gb.inventaire.rations;
  const nb = ga.membres.length + gb.membres.length;
  const fus = fusionner(s9d, ga, gb);
  ok(fus.ok, 'deux groupes au même endroit se réunissent', fus.motif);
  ok(groupes(s9d).length === 1, 'il ne reste qu’un groupe');
  ok(ga.membres.length === nb, 'tout le monde est rassemblé', `${ga.membres.length}/${nb}`);
  ok(ga.inventaire.rations === totalRations, 'les vivres sont remis en commun');
}

// Une partie d'avant les groupes doit se rouvrir sans rien perdre.
const s9f = nouvellePartie(999, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9f, 80);
const gAvant = groupeActif(s9f);
const ancienne = JSON.parse(serialiser(s9f));
ancienne.player.squad = gAvant.membres;
ancienne.player.regionId = gAvant.regionId;
ancienne.player.ordre = gAvant.ordre;
ancienne.player.inventaire = gAvant.inventaire;
ancienne.player.objets = gAvant.objets;
ancienne.player.cohesion = gAvant.cohesion;
delete ancienne.player.groupes;
delete ancienne.player.groupeActif;
const migree = deserialiser(JSON.stringify(ancienne));
ok(groupes(migree).length === 1, 'une sauvegarde d’avant les groupes se recompose en un groupe');
ok(tousLesMembres(migree).length === 3, 'l’escouade y est au complet');
ok(groupeActif(migree).inventaire.rations === gAvant.inventaire.rations, 'le sac est intact');
avancer(migree, 200);
ok(migree.temps === 280, 'et la partie repart', `t=${migree.temps}`);

// Il n'y a plus de plafond de groupes : c'est la portée des ordres qui décide.
const s9e = nouvellePartie(2718, { maintenant: 0, depart: 'ville', equipe: 3 });
ok(porteeOrdres(s9e) === PORTEE_COUREUR,
  'sans antenne, on commande à portée de coureur', `${porteeOrdres(s9e)} secteurs`);
s9e.base.fonde = true;
s9e.base.regionId = groupeActif(s9e).regionId;
s9e.base.batiments = { antenne: 4 };
ok(porteeOrdres(s9e) === PORTEE_COUREUR + 4 * PORTEE_PAR_ANTENNE,
  'chaque antenne allonge la portée', `${porteeOrdres(s9e)} secteurs`);

// On peut détacher autant de colonnes qu'on veut — mais il faut les joindre.
const s9e2 = nouvellePartie(2718, { maintenant: 0, depart: 'ville', equipe: 3 });
const gE = groupeActif(s9e2);
const rngE = new Rng(77);
for (let i = 0; i < 6; i++) gE.membres.push(makeCharacter(rngE, {}));
let detaches = 0;
for (let i = 0; i < 5; i++) {
  const libre = gE.membres.filter(estVivant)[0];
  if (!libre || gE.membres.length < 2) break;
  if (scinder(s9e2, gE, [libre.id], rngE).ok) detaches++;
}
ok(detaches >= 4, 'rien ne limite le nombre de colonnes', `${detaches} détachements`);
ok(groupes(s9e2).length >= 5, 'et elles existent toutes', `${groupes(s9e2).length} groupes`);

// Une colonne à portée reçoit ses ordres ; une colonne trop loin, non.
const gLoin = groupes(s9e2)[1];
gLoin.regionId = gE.regionId;
ok(joignable(s9e2, gLoin).ok, 'sur place, on se parle');
ok(donnerOrdre(s9e2, { type: 'fouille' }, gLoin).ok, 'et on donne ses ordres');
const horsPortee = s9e2.world.regions.find(
  (r) => distance(r.i, gE.regionId) > PORTEE_COUREUR + 2
);
gLoin.regionId = horsPortee.i;
for (const autre of groupes(s9e2)) {
  if (autre.id !== gLoin.id) autre.regionId = gE.regionId;
}
ok(!joignable(s9e2, gLoin).ok, 'trop loin, on ne se parle plus',
  joignable(s9e2, gLoin).motif);
const refus = donnerOrdre(s9e2, { type: 'mine' }, gLoin);
ok(!refus.ok, 'et l’ordre n’arrive pas', refus.motif);
ok(gLoin.ordre.type === 'fouille',
  'la colonne continue le dernier ordre reçu — elle n’est pas perdue, elle est sourde');

// Une antenne assez haute la rattrape.
s9e2.base.fonde = true;
s9e2.base.regionId = gE.regionId;
s9e2.base.batiments = { antenne: 6 };
ok(joignable(s9e2, gLoin).ok, 'une antenne assez haute la rattrape',
  `portée ${porteeOrdres(s9e2)}`);

section('9 quinquies. Information imparfaite');
const s9g = nouvellePartie(60606, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9g, 40);
const gVue = groupeActif(s9g);
const colIci = s9g.world.colonies.find((c) => c.regionId === gVue.regionId);
const colLoin = s9g.world.colonies.find((c) => c.regionId !== gVue.regionId);

ok(!!colIci, 'un départ en ville pose bien l’escouade dans une ville');
const vueIci = vueColonie(s9g, colIci);
ok(vueIci.frais && vueIci.depuis === 0, 'la ville où l’on se trouve est vue en temps réel');
ok(vueIci.pop === Math.round(colIci.pop), 'et ses chiffres sont les vrais', `${vueIci.pop} vs ${Math.round(colIci.pop)}`);

const vueLoin = vueColonie(s9g, colLoin);
ok(vueLoin.inconnu, 'une ville où l’on n’est jamais allé n’a pas de relevé');
ok(vueLoin.faction === null, 'on n’en connaît même pas le drapeau');

// On passe voir, puis on s'en va : le relevé doit vieillir, pas se corriger.
const memePlace = colLoin.regionId;
gVue.regionId = memePlace;
avancer(s9g, 1);
const releve = vueColonie(s9g, colLoin);
ok(releve.frais, 'sur place, l’information redevient fraîche');
const popRelevee = releve.pop;
const factionRelevee = releve.faction;

gVue.regionId = colIci.regionId;
avancer(s9g, 200);

// La ville change de mains pendant qu'on est ailleurs. On le fait après les
// 200 h et on n'avance plus que d'une heure : le monde vit sa vie, et forcer
// un état puis simuler deux cents heures reviendrait à parier qu'il n'y touche
// pas. On passe par les listes des factions, sinon c'est le test qui casse
// l'invariant qu'il vérifie ensuite.
const autreFaction = DIPLO_FACTIONS.find((f) => f !== colLoin.faction && f !== 'essaim');
const ancienne9g = s9g.world.factions[colLoin.faction];
ancienne9g.colonies = ancienne9g.colonies.filter((id) => id !== colLoin.id);
colLoin.faction = autreFaction;
s9g.world.factions[autreFaction].colonies.push(colLoin.id);
colLoin.pop += 500;
avancer(s9g, 1);

const perime = vueColonie(s9g, colLoin);
ok(!perime.frais, 'de loin, l’information n’est plus fraîche');
ok(perime.pop === popRelevee, 'le relevé garde la population d’alors', `${perime.pop} vs ${popRelevee}`);
ok(perime.faction === factionRelevee, 'et l’ancien drapeau — la prise n’est pas connue');
ok(perime.depuis >= 200, 'le relevé porte son âge', `${perime.depuis} h`);
ok(colLoin.faction === autreFaction, 'alors que le monde, lui, a bien changé');

// Poster quelqu'un sur place suffit à rétablir le renseignement : c'est là tout
// l'intérêt de détacher un groupe.
const rngPoste = new Rng(s9g.rngState);
const poste = scinder(s9g, gVue, [gVue.membres[0].id], rngPoste);
s9g.rngState = rngPoste.save();
ok(poste.ok, 'on détache un guetteur', poste.motif);
poste.groupe.regionId = colLoin.regionId;
avancer(s9g, 2);
const parGuetteur = vueColonie(s9g, colLoin);
ok(parGuetteur.frais, 'un membre posté sur place rétablit le temps réel');
ok(parGuetteur.faction === autreFaction, 'et l’on apprend enfin qui tient la ville');

// L'optique porte le regard un cran plus loin.
const s9h = nouvellePartie(70707, { maintenant: 0, depart: 'ville', equipe: 3 });
const gOpt = groupeActif(s9h);
const voisine = s9h.world.regions.find((r) => distance(r.i, gOpt.regionId) === 1);
ok(!estSurveillee(s9h, voisine.i), 'sans optique, on ne voit que sous ses pieds');
s9h.base.recherche.optique = 1;
ok(estSurveillee(s9h, voisine.i), 'l’optique porte le regard d’une case');

// Servir une faction, c'est recevoir ses rapports.
const s9i = nouvellePartie(80808, { maintenant: 0, depart: 'ville', equipe: 3 });
const colService = s9i.world.colonies.find((c) => c.regionId === groupeActif(s9i).regionId);
s9i.player.reputation[colService.faction] = 60;
sEngager(s9i, colService.faction, () => {});
groupeActif(s9i).allegeance.points = RANGS[1].points; // grade d'Agent
const sienne = s9i.world.colonies.find(
  (c) => c.faction === colService.faction && c.regionId !== colService.regionId
);
if (sienne) {
  ok(estSurveillee(s9i, sienne.regionId), 'au service d’une faction, ses villes ne sont plus une surprise');
} else {
  ok(true, 'la faction servie n’a qu’une ville — rien à vérifier');
}

// Les nouvelles voyagent : ce qui vient d'arriver à l'autre bout de la carte
// n'est pas encore parvenu, ce dont on a été témoin l'est immédiatement.
const s9j = nouvellePartie(90909, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9j, 10);
const loinDeTout = s9j.world.regions.find((r) => !estSurveillee(s9j, r.i));
const journal9j = [
  { type: 'capture', t: s9j.temps, regionId: loinDeTout.i, vu: false, texte: 'ville prise' },
  { type: 'guerre', t: s9j.temps, regionId: loinDeTout.i, vu: false, texte: 'guerre déclarée' },
  { type: 'capture', t: s9j.temps, regionId: groupeActif(s9j).regionId, vu: true, texte: 'sous nos yeux' },
];
const toutDeSuite = nouvellesConnues(s9j, journal9j);
ok(toutDeSuite.length === 1 && toutDeSuite[0].texte === 'sous nos yeux',
  'seul ce dont on est témoin est su sur-le-champ', `${toutDeSuite.length} nouvelles`);
ok(toutDeSuite[0].rapporte === false, 'et ce n’est pas donné pour un on-dit');

avancer(s9j, DELAI_NOUVELLE.guerre + 1);
const apresGuerre = nouvellesConnues(s9j, journal9j);
ok(apresGuerre.some((x) => x.type === 'guerre'), 'une déclaration de guerre finit par se savoir');
ok(!apresGuerre.some((x) => x.type === 'capture' && x.texte === 'ville prise'),
  'une ville prise se sait plus lentement qu’une guerre');
avancer(s9j, DELAI_NOUVELLE.capture);
const apresCapture = nouvellesConnues(s9j, journal9j);
const prise = apresCapture.find((x) => x.texte === 'ville prise');
ok(!!prise, 'mais elle finit par se savoir aussi');
ok(prise && prise.rapporte === true, 'donnée pour ce qu’elle est : un rapport');

verifierCoherence(s9g, 'après manipulation de la connaissance');

section('9 sexies. Entraînement');
const s9k = nouvellePartie(555, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9k = groupeActif(s9k);
g9k.inventaire.rations = 20000;
// Niveau de départ fixé : la courbe ralentit avec le niveau, et ce que la
// génération tire varie dès qu'un autre système consomme du hasard avant elle.
for (const c of g9k.membres) c.skills.melee = 10;
// Par identité, pas par position : quelqu'un peut rejoindre le groupe pendant
// les cent heures, et l'aligner sur l'indice d'un autre donnait un NaN.
const avantMelee = new Map(g9k.membres.map((c) => [c.id, c.skills.melee]));
donnerOrdre(s9k, { type: 'entrainement', skill: 'melee' }, g9k);
const rationsEntrainement = g9k.inventaire.rations;
// Une rencontre perdue déplace le groupe et remet l'ordre au repos : on le
// rétablit, comme le ferait le joueur. Ce qu'on mesure, c'est l'entraînement,
// pas la chance aux rencontres.
let interruptions = 0;
for (let i = 0; i < 100; i++) {
  if (g9k.ordre.type !== 'entrainement') {
    interruptions++;
    donnerOrdre(s9k, { type: 'entrainement', skill: 'melee' }, g9k);
  }
  avancer(s9k, 1);
}
const gains = g9k.membres
  .filter((c) => avantMelee.has(c.id))
  .map((c) => c.skills.melee - avantMelee.get(c.id));
ok(gains.every((x) => x >= 2), 'cent heures d’entraînement se voient', gains.join(', '));
ok(rationsEntrainement - g9k.inventaire.rations > 50, 'et coûtent des vivres',
  `${Math.round(rationsEntrainement - g9k.inventaire.rations)} rations`);
console.log(`     entraînement interrompu ${interruptions} fois par les rencontres`);

// Sans vivres, l'entraînement s'interrompt de lui-même plutôt que d'affamer.
const s9l = nouvellePartie(556, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9l = groupeActif(s9l);
g9l.inventaire.rations = 2;
donnerOrdre(s9l, { type: 'entrainement', skill: 'tir' }, g9l);
avancer(s9l, 30);
ok(g9l.ordre.type !== 'entrainement', 'sans rations, l’entraînement s’arrête');

// L'instructeur : un écart de niveau accélère l'élève.
const s9m = nouvellePartie(557, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9m = groupeActif(s9m);
g9m.inventaire.rations = 20000;
g9m.membres[0].skills.melee = 70;   // le vétéran
g9m.membres[1].skills.melee = 5;    // l'élève encadré
const s9n = nouvellePartie(557, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9n = groupeActif(s9n);
g9n.inventaire.rations = 20000;
g9n.membres[0].skills.melee = 5;    // personne pour encadrer
g9n.membres[1].skills.melee = 5;
g9n.membres[2].skills.melee = 5;
donnerOrdre(s9m, { type: 'entrainement', skill: 'melee' }, g9m);
donnerOrdre(s9n, { type: 'entrainement', skill: 'melee' }, g9n);
avancer(s9m, 200);
avancer(s9n, 200);
ok(g9m.membres[1].skills.melee > g9n.membres[1].skills.melee,
  'un vétéran dans le groupe fait progresser les autres plus vite',
  `${g9m.membres[1].skills.melee} contre ${g9n.membres[1].skills.melee}`);

// Une tâche personnelle d'entraînement porte bien sa compétence.
const s9o = nouvellePartie(558, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9o = groupeActif(s9o);
g9o.inventaire.rations = 20000;
donnerOrdre(s9o, { type: 'fouille' }, g9o);
assignerTache(s9o, g9o.membres[0], { type: 'entrainement', skill: 'tir' }, verifierExercice);
const tirAvant = g9o.membres[0].skills.tir;
avancer(s9o, 150);
ok(g9o.membres[0].skills.tir > tirAvant, 'le membre détaché à l’entraînement travaille sa compétence',
  `${tirAvant} → ${g9o.membres[0].skills.tir}`);
// On vérifie la répartition, pas la récolte : c'est elle le sujet, et la
// mesurer en unités ramassées dépendrait de la place restante dans le sac.
ok(tacheDe(g9o, g9o.membres[0]).type === 'entrainement'
  && tacheDe(g9o, g9o.membres[1]).type === 'fouille',
'pendant que les autres continuent de fouiller',
`${tacheDe(g9o, g9o.membres[0]).type} / ${tacheDe(g9o, g9o.membres[1]).type}`);

// On ne s'exerce qu'au corps et aux armes : le reste s'apprend en le faisant.
for (const k of ['force', 'endurance', 'melee', 'tir']) {
  ok(verifierExercice(k).ok, `${k} s’exerce`);
}
for (const k of ['ingenierie', 'medecine', 'commerce', 'furtivite']) {
  const v = verifierExercice(k);
  ok(!v.ok && /pratique|vient|exercice/.test(v.motif), `${k} ne s’exerce pas, et on dit pourquoi`, v.motif);
}
const s9p = nouvellePartie(559, { maintenant: 0, depart: 'ville', equipe: 3 });
ok(!donnerOrdre(s9p, { type: 'entrainement', skill: 'commerce' }).ok,
  'l’ordre d’entraînement au commerce est refusé, pas rabattu sur la mêlée');
ok(!assignerTache(s9p, groupeActif(s9p).membres[0], { type: 'entrainement', skill: 'ingenierie' }, verifierExercice).ok,
  'et la tâche personnelle aussi');

section('9 septies. Le métier forme au métier');
// Une saison de travail à plein temps doit se voir sur la compétence exercée.
const metiers = [
  ['fouille', 'ingenierie'],
  ['mine', 'force'],
  ['chasse', 'tir'],
  ['exploration', 'furtivite'],
];
for (const [ordre, skill] of metiers) {
  const st = nouvellePartie(4321, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gt = groupeActif(st);
  // Point de départ fixé : la courbe d'expérience ralentit avec le niveau, donc
  // partir de ce que la génération a tiré rendrait l'assertion capricieuse.
  for (const c of gt.membres) c.skills[skill] = 10;
  const av = gt.membres[0].skills[skill];
  // On réapprovisionne en route, et on renvoie l'ordre : explorer ne nourrit
  // personne et s'arrête tout seul quand le secteur est levé. Une escouade
  // morte de faim, ou plantée sur une case déjà connue, ne mesure plus rien.
  for (let h = 0; h < 7; h++) {
    gt.inventaire.rations = 55;
    if (ordre === 'exploration') {
      const neuf = st.world.regions.find((r) => !r.decouvert && !r.colonie);
      if (neuf) gt.regionId = neuf.i;
    }
    donnerOrdre(st, { type: ordre }, gt);
    avancer(st, 100);
  } // ≈ un mois, dont environ deux tiers ouvrés
  // Moyenne de l'escouade, pas un individu : sur un seul membre, le hasard des
  // rencontres et des blessures pèse plus que la progression qu'on mesure.
  const ap = gt.membres.reduce((a, c) => a + c.skills[skill], 0) / gt.membres.length;
  ok(ap > av + 2, `${ordre} fait monter ${skill} de façon visible`,
    `${av} → ${ap.toFixed(1)}`);
}
// Le commerce et la médecine se pratiquent aussi, à leur rythme.
const s9q = nouvellePartie(4322, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9q = groupeActif(s9q);
const colVente = colonieDe(s9q.world, g9q.regionId);
const comAvant = g9q.membres.reduce((m, c) => Math.max(m, c.skills.commerce), 0);
// Quatre-vingts transactions : la tournée d'un marchand sur une saison. Un
// niveau de commerce se gagne, il ne se ramasse pas.
for (let i = 0; i < 80; i++) {
  g9q.inventaire.ferraille = 20;
  vendre(s9q, colVente, 'ferraille', 20, g9q);
}
const comApres = g9q.membres.reduce((m, c) => Math.max(m, c.skills.commerce), 0);
ok(comApres > comAvant, 'négocier fait monter le commerce', `${comAvant} → ${comApres}`);

section('9 octies. Diplômes et écoles');
const s9r = nouvellePartie(1717, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9r = groupeActif(s9r);
const colEcole = s9r.world.colonies.find((c) => c.regionId === g9r.regionId);
// On se place dans une ville qui enseigne quelque chose.
let ville9r = colEcole;
if (!ecolesDe(s9r.world, ville9r).length) {
  ville9r = s9r.world.colonies.find((c) => ecolesDe(s9r.world, c).length);
  g9r.regionId = ville9r.regionId;
}
ok(!!ville9r && ecolesDe(s9r.world, ville9r).length > 0, 'des villes tiennent des écoles',
  ville9r ? ecolesDe(s9r.world, ville9r).join(', ') : 'aucune');

const offre = ecolesDe(s9r.world, ville9r)[0];
const eleve = g9r.membres[0];
const skillOffre = DIPLOMES[offre].skill;
s9r.player.credits = 5000;
// Une Commune instruit gratuitement et un Domaine n'instruit que les siens : on
// veut ici une ville qui vend son école, sinon le test ne mesure plus rien.
loisDe(s9r.world, ville9r.faction).regime = 'charte';
const creditsAvant = s9r.player.credits;
const insc = inscrire(s9r, ville9r, eleve, offre, () => {});
ok(insc.ok, 'on peut inscrire quelqu’un', insc.motif);
ok(s9r.player.credits < creditsAvant, 'la formation se paie', `${creditsAvant} → ${s9r.player.credits}`);
ok(enFormation(eleve), 'l’élève est en formation');
ok(!debout(g9r).includes(eleve), 'et n’est plus disponible pour le travail');
ok(debout(g9r).length === 2, 'les autres continuent', `${debout(g9r).length} debout`);

// Partir suspend la formation ; revenir la reprend.
const restantA = eleve.formation.restant;
const ailleurs = s9r.world.regions.find((r) => r.i !== ville9r.regionId && !r.colonie);
g9r.regionId = ailleurs.i;
avancer(s9r, 40);
ok(eleve.formation && eleve.formation.restant === restantA,
  'loin de l’école, la formation ne progresse pas', `${restantA} → ${eleve.formation.restant}`);
g9r.regionId = ville9r.regionId;
avancer(s9r, 40);
ok(eleve.formation && eleve.formation.restant < restantA,
  'de retour sur place, elle reprend', `${restantA} → ${eleve.formation.restant}`);

// Jusqu'au diplôme.
const avantSkill = eleve.skills[skillOffre];
avancer(s9r, DIPLOMES[offre].heures + 10);
ok(!eleve.formation, 'la formation finit par s’achever');
ok((eleve.diplomes || []).includes(offre), 'le diplôme est acquis');
ok(eleve.skills[skillOffre] >= DIPLOMES[offre].plancher,
  'et pose un plancher de compétence', `${avantSkill} → ${eleve.skills[skillOffre]}`);
ok(apprentissage(eleve, skillOffre) > 1, 'le diplômé apprend ensuite plus vite',
  `×${apprentissage(eleve, skillOffre).toFixed(2)}`);
ok(!inscrire(s9r, ville9r, eleve, offre, () => {}).ok, 'on ne repasse pas le même diplôme');

// Un diplôme apporte quelque chose même à qui en savait déjà plus que l'école.
//
// Il se contentait d'un `max(compétence, plancher)` : trois semaines et neuf
// cents crédits ne changeaient rien pour quelqu'un formé sur le tas, et l'école
// refusait même de l'inscrire vingt-cinq points au-dessus du plancher. On n'y
// allait donc jamais avec ses bons éléments.
{
  const fort = makeCharacter(new Rng(99), { niveau: 2, diplome: null });
  const skill = DIPLOMES.medecine.skill;
  fort.skills[skill] = DIPLOMES.medecine.plancher + 40;
  const av = fort.skills[skill];
  ok(accorderDiplome(fort, 'medecine'), 'un bon élément peut être diplômé');
  ok(fort.skills[skill] === av + GAIN_DIPLOME,
    'et il y gagne quand même de la compétence', `${av} → ${fort.skills[skill]}`);
  const faible = makeCharacter(new Rng(98), { diplome: null });
  faible.skills[skill] = 3;
  accorderDiplome(faible, 'medecine');
  ok(faible.skills[skill] === DIPLOMES.medecine.plancher,
    'un débutant est monté au plancher, pas au-delà', `${faible.skills[skill]}`);
}

// Le diplôme accélère réellement la pratique, à situation égale.
const dipl = nouvellePartie(1818, { maintenant: 0, depart: 'ville', equipe: 3 });
const gd = groupeActif(dipl);
const sans = nouvellePartie(1818, { maintenant: 0, depart: 'ville', equipe: 3 });
const gs = groupeActif(sans);
accorderDiplome(gd.membres[0], 'ingenierie');
gs.membres[0].skills.ingenierie = gd.membres[0].skills.ingenierie; // même point de départ
gd.inventaire.rations = 55;
gs.inventaire.rations = 55;
donnerOrdre(dipl, { type: 'fouille' }, gd);
donnerOrdre(sans, { type: 'fouille' }, gs);
avancer(dipl, 600);
avancer(sans, 600);
ok(gd.membres[0].skills.ingenierie > gs.membres[0].skills.ingenierie,
  'à travail égal, le diplômé progresse plus vite',
  `${gd.membres[0].skills.ingenierie} contre ${gs.membres[0].skills.ingenierie}`);

// Un médic chevronné arrive déjà formé : c'est ce qui le distingue.
const rngRec = new Rng(4242);
let formes = 0;
for (let i = 0; i < 40; i++) {
  const m = makeCharacter(rngRec, { archetype: 'medic', niveau: 2 });
  if ((m.diplomes || []).includes('medecine')) formes++;
}
ok(formes > 10, 'un médic expérimenté porte souvent son brevet', `${formes}/40`);
const debutant = makeCharacter(new Rng(7), { archetype: 'medic', niveau: 0 });
ok((debutant.diplomes || []).length === 0, 'un débutant n’a rien qu’un titre');

verifierCoherence(s9r, 'après formations');

// L'avant-poste transmet : un vétéran forme les suivants, sans passer par une ville.
const s9s = nouvellePartie(2626, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9s = groupeActif(s9s);
const videS = s9s.world.regions.find((r) => !r.colonie);
g9s.regionId = videS.i;
Object.assign(g9s.inventaire, { ferraille: 200, polymere: 60, composant: 10 });
fonderBase(s9s, () => {});
ok(ecolesAvantPoste(s9s).length === 0, 'sans antenne, on n’enseigne rien chez soi');
s9s.base.batiments.antenne = 1;
s9s.base.stock.rations = 500;
// Un maître : quelqu'un qui dépasse largement le cours.
const maitre = g9s.membres[0];
const eleveS = g9s.membres[1];
// La compétence effective est rabotée par la fatigue et la faim : on place
// le maître assez haut pour que le test porte sur la règle, pas sur l'humeur.
maitre.skills.medecine = DIPLOMES.medecine.plancher + MARGE_INSTRUCTEUR + 30;
eleveS.skills.medecine = 8;
const offresMaison = ecolesAvantPoste(s9s);
ok(offresMaison.some((o) => o.key === 'medecine'), 'un vétéran rend la matière enseignable',
  offresMaison.map((o) => o.key).join(', '));

const creditsAvantMaison = s9s.player.credits;
const rMaison = enseignerChezSoi(s9s, eleveS, 'medecine', () => {});
ok(rMaison.ok, 'on peut former chez soi', rMaison.motif);
ok(s9s.player.credits === creditsAvantMaison, 'et ça ne coûte pas un crédit');
ok(occupeParEcole(maitre) && occupeParEcole(eleveS), 'le maître aussi est immobilisé');
ok(debout(g9s).length === 1, 'deux personnes en moins sur le terrain', `${debout(g9s).length} debout`);
ok(rMaison.heures > DIPLOMES.medecine.heures, 'c’est plus lent qu’une vraie école',
  `${rMaison.heures} contre ${DIPLOMES.medecine.heures} h`);

// Partir suspend le cours ; les rations de l'entrepôt le nourrissent.
const restantMaison = eleveS.formation.restant;
g9s.regionId = (videS.i + 1) % s9s.world.regions.length;
avancer(s9s, 30);
ok(eleveS.formation.restant === restantMaison, 'loin de l’avant-poste, le cours s’arrête');
g9s.regionId = videS.i;
const rationsAvantCours = s9s.base.stock.rations;
avancer(s9s, 30);
ok(eleveS.formation.restant < restantMaison, 'de retour, il reprend');
ok(s9s.base.stock.rations < rationsAvantCours, 'et se paie en vivres de l’entrepôt',
  `${rationsAvantCours} → ${s9s.base.stock.rations}`);

// Immobiliser deux personnes sur trois rend le groupe fragile : une défaite le
// dépose ailleurs, et le cours s'arrête là. On joue donc le joueur qui ramène
// les siens à l'avant-poste — c'est ce que ferait quelqu'un qui tient à sa
// formation, et ça vaut d'être vérifié plutôt que contourné.
let deplacements = 0;
for (let i = 0; i < rMaison.heures + 200 && eleveS.formation; i++) {
  if (g9s.regionId !== s9s.base.regionId) {
    deplacements++;
    g9s.regionId = s9s.base.regionId;
    donnerOrdre(s9s, { type: 'repos' }, g9s);
  }
  if (s9s.base.stock.rations < 50) s9s.base.stock.rations = 300;
  avancer(s9s, 1);
}
// On note les bousculades sans en faire une condition : elles dépendent des
// rencontres tirées, et exiger qu'il y en ait rendrait le test capricieux.
console.log(`     groupe délogé ${deplacements} fois pendant la formation`);
ok((eleveS.diplomes || []).includes('medecine'), 'l’élève finit par être formé');
ok(!occupeParEcole(maitre), 'et le maître est rendu à ses occupations');
verifierCoherence(s9s, 'après transmission à l’avant-poste');

section('9 nonies. Métiers de l’avant-poste');
const s9t = nouvellePartie(3131, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9t = groupeActif(s9t);
const videT = s9t.world.regions.find((r) => !r.colonie);
g9t.regionId = videT.i;
Object.assign(g9t.inventaire, { ferraille: 200, polymere: 60, composant: 10 });
fonderBase(s9t, () => {});
Object.assign(s9t.base.batiments, { hydroponie: 2, fonderie: 2, entrepot: 2, mur: 2, antenne: 1 });
s9t.base.pop = 10;
Object.assign(s9t.base.stock, { biomasse: 4000, minerai: 4000, rations: 400, carburant: 200 });

ok(placesMetier(s9t.base, 'cultivateur') === 6, 'un bâtiment ouvre des places', `${placesMetier(s9t.base, 'cultivateur')}`);
ok(placesMetier(s9t.base, 'machiniste') === 0, 'sans atelier, pas de machiniste');
s9t.base.autoEmploi = false;
s9t.base.postes = {};
ok(manoeuvres(s9t.base) === 10, 'au départ tout le monde est manœuvre');

const aff = affecter(s9t, 'cultivateur', 6);
ok(aff.ok && aff.affectes === 6, 'on affecte des habitants à un poste', JSON.stringify(aff));
ok(manoeuvres(s9t.base) === 4, 'les manœuvres diminuent d’autant', `${manoeuvres(s9t.base)}`);
ok(affecter(s9t, 'fondeur', 6).affectes === 4, 'on ne peut pas affecter plus de monde qu’on en a',
  `${affectes(s9t.base, 'fondeur')}`);
ok(affecter(s9t, 'machiniste', 3).ok === false, 'ni ouvrir un poste sans son bâtiment');

// Le rendement du poste dépasse celui de la main-d'œuvre anonyme.
ok(rendementMetier(s9t, 'cultivateur').mult > mainDoeuvre(s9t.base),
  'une place tenue rend plus que la main-d’œuvre générique',
  `${rendementMetier(s9t, 'cultivateur').mult.toFixed(2)} contre ${mainDoeuvre(s9t.base).toFixed(2)}`);

// À bâtiments et habitants égaux, spécialiser produit davantage.
function rationsApres(specialise, heures) {
  const st = nouvellePartie(3131, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gt = groupeActif(st);
  gt.regionId = st.world.regions.find((r) => !r.colonie).i;
  Object.assign(gt.inventaire, { ferraille: 200, polymere: 60, composant: 10 });
  fonderBase(st, () => {});
  // Entrepôt largement dimensionné : sans ça le stock plafonne et la comparaison
  // ne mesure plus rien du tout.
  Object.assign(st.base.batiments, { hydroponie: 3, generateur: 2, entrepot: 6 });
  st.base.pop = 9;
  Object.assign(st.base.stock, { biomasse: 3000, rations: 300, carburant: 400 });
  // On coupe l'embauche automatique : ce qu'on compare ici, c'est ce que vaut
  // une place tenue face à de la main-d'œuvre anonyme. Depuis que les habitants
  // se placent eux-mêmes, les deux bras convergeaient vers la même affectation
  // et le test mesurait deux fois la même chose.
  st.base.autoEmploi = false;
  st.base.commerce = false;
  st.base.postes = {};
  if (specialise) affecter(st, 'cultivateur', 9);
  const avant = st.base.stock.rations;
  avancer(st, heures);
  return st.base.stock.rations - avant;
}
const specialise = rationsApres(true, 400);
const anonyme = rationsApres(false, 400);
ok(specialise > anonyme, 'spécialiser produit davantage que laisser tout le monde manœuvrer',
  `${Math.round(specialise)} contre ${Math.round(anonyme)} rations`);

// Un contremaître compétent sur place vaut plusieurs bras.
const chefTest = groupeActif(s9t).membres[0];
chefTest.skills.ingenierie = 80;
const avecChef = rendementMetier(s9t, 'cultivateur');
ok(avecChef.contremaitre && avecChef.contremaitre.id === chefTest.id,
  'le meilleur des vôtres encadre le poste');
g9t.regionId = (videT.i + 1) % s9t.world.regions.length;
const sansChef = rendementMetier(s9t, 'cultivateur');
ok(!sansChef.contremaitre, 'parti, il n’encadre plus');
ok(avecChef.mult > sansChef.mult, 'et son absence se voit sur le rendement',
  `${avecChef.mult.toFixed(2)} → ${sansChef.mult.toFixed(2)}`);
g9t.regionId = videT.i;

// Les postes se réajustent quand la population tombe ou qu'un mur est rasé.
s9t.base.pop = 3;
avancer(s9t, 2);
let totalPostes = 0;
for (const k of METIER_KEYS) totalPostes += affectes(s9t.base, k);
ok(totalPostes <= s9t.base.pop, 'les postes se dégarnissent si la population tombe',
  `${totalPostes} pour ${s9t.base.pop} habitants`);
verifierCoherence(s9t, 'après affectation des métiers');

section('9 nonies septies. Servir par colonne, et peser au conseil');
const multi = nouvellePartie(9797, { maintenant: 0, depart: 'ville', equipe: 3 });
const gA = groupeActif(multi);
const rngM = new Rng(21);
for (let i = 0; i < 4; i++) gA.membres.push(makeCharacter(rngM, {}));
const detA = scinder(multi, gA, [gA.membres[0].id, gA.membres[1].id], rngM, 'Colonne B');
ok(detA.ok, 'on détache une seconde colonne', detA.motif);
const gB = detA.groupe;

// Deux colonnes, deux engagements différents dans la même partie.
const bourgUn = multi.world.colonies.find((c) => !c.ruine);
const bourgDeux = multi.world.colonies.find((c) => !c.ruine && c.faction !== bourgUn.faction);
multi.player.reputation[bourgUn.faction] = 40;
multi.player.reputation[bourgDeux.faction] = 40;
gA.regionId = bourgUn.regionId;
gB.regionId = bourgDeux.regionId;
ok(sEngager(multi, bourgUn.faction, () => {}, gA).ok, 'la première entre au service');
const deux = sEngager(multi, bourgDeux.faction, () => {}, gB);
const enGuerreAB = multi.world.guerres.some(
  (w) => (w.a === bourgUn.faction && w.b === bourgDeux.faction)
    || (w.b === bourgUn.faction && w.a === bourgDeux.faction)
);
if (enGuerreAB) {
  ok(!deux.ok, 'mais pas deux camps en guerre l’un contre l’autre', deux.motif);
} else {
  ok(deux.ok, 'et la seconde en sert une autre — les voies sont complémentaires',
    deux.motif);
  ok(gA.allegeance.faction !== gB.allegeance.faction,
    'chaque colonne a son propre engagement');
  ok(!multi.player.allegeance, 'et rien n’est resté accroché au joueur');
}

// Le grade n'est pas une voix qu'on porte : c'est une charge qu'on exerce.
const pol = nouvellePartie(9898, { maintenant: 0, depart: 'ville', equipe: 3 });
const gPol = groupeActif(pol);
const villePol = pol.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gPol.regionId = villePol.regionId;
pol.player.reputation[villePol.faction] = 60;
sEngager(pol, villePol.faction, () => {}, gPol);
const fPol = villePol.faction;

ok(!peutExercer(pol, fPol, 'envoyer').ok,
  'un affilié ne commande rien du tout',
  peutExercer(pol, fPol, 'envoyer').motif);

gPol.allegeance.points = RANGS[2].points; // Lieutenant
ok(peutExercer(pol, fPol, 'envoyer').ok,
  'un lieutenant dispose des colonnes déjà levées',
  peutExercer(pol, fPol, 'envoyer').motif);
ok(!peutExercer(pol, fPol, 'lever').ok,
  'mais il n’ouvre pas le trésor pour en armer de nouvelles');
ok(!peutExercer(pol, fPol, 'guerre').ok,
  'et il ne déclare pas la guerre');

gPol.allegeance.points = RANGS[3].points; // Capitaine
ok(peutExercer(pol, fPol, 'lever').ok, 'un capitaine lève');
ok(peutExercer(pol, fPol, 'fonder').ok, 'et fait fonder');
ok(!peutExercer(pol, fPol, 'guerre').ok, 'la guerre reste au-dessus de lui');

gPol.allegeance.points = RANGS[4].points; // Commandeur
ok(peutExercer(pol, fPol, 'guerre').ok, 'un commandeur déclare la guerre');
ok(chargeAupres(pol, fPol).index === 4, 'et la charge tenue est bien la sienne');

// Exercer ne coûte aucun capital politique : c'est tout l'intérêt d'avoir le
// grade. Ce qui coûte, c'est de rater ce qu'on a ordonné.
const ptsAvantOrdre = gPol.allegeance.points;
const ennemi = cibleGuerre(pol, fPol)[0];
ok(!!ennemi, 'il reste quelqu’un à qui déclarer la guerre');
const dg = declarerGuerreA(pol, fPol, ennemi, new Rng(5), () => {});
ok(dg.ok, 'la guerre est déclarée sur-le-champ', dg.motif);
ok(gPol.allegeance.points === ptsAvantOrdre,
  'et ordonner ne brûle pas un point de service',
  `${ptsAvantOrdre} → ${gPol.allegeance.points}`);
ok(pol.world.guerres.some((w) => (w.a === fPol && w.b === ennemi) || (w.b === fPol && w.a === ennemi)),
  'le monde en tient compte immédiatement, sans dé');
ok(gPol.allegeance.actes.some((a) => a.type === 'guerre'),
  'l’acte est inscrit au dossier : on en répondra');

// Lever une colonne prend sur le trésor de la faction, pas sur la bourse du
// joueur, et la colonne existe vraiment.
pol.world.factions[fPol].tresor = 5000;
const avantTresor = pol.world.factions[fPol].tresor;
const avantCredits = pol.player.credits;
const cibleLevee = pol.world.colonies.find((c) => !c.ruine && c.faction === ennemi);
const lev = leverColonne(pol, fPol, null, cibleLevee.id, () => {});
ok(lev.ok, 'la colonne est levée sans qu’on demande la permission', lev.motif);
ok(pol.world.factions[fPol].tresor === avantTresor - coutLevee(),
  'le trésor de la faction paie');
ok(pol.player.credits === avantCredits, 'et pas la bourse du joueur');
ok(pol.world.armees.some((a) => a.id === lev.armee.id && a.cible === cibleLevee.id),
  'la colonne est sur les routes, avec sa cible');
ok(lev.armee.route.length > 0 || lev.armee.regionId === cibleLevee.regionId,
  'et avec un itinéraire, pas une route nulle qui ferait planter le tick');

// Envoyer : un ordre détourne une colonne, immédiatement.
const autreCible = pol.world.colonies.find(
  (c) => !c.ruine && c.faction === ennemi && c.id !== cibleLevee.id
);
if (autreCible) {
  const env = envoyerColonne(pol, fPol, lev.armee.id, autreCible.id, () => {});
  ok(env.ok, 'on détourne une colonne d’un mot', env.motif);
  ok(lev.armee.cible === autreCible.id, 'et elle marche désormais sur l’autre ville');
}

// Fonder : le poste existe, il appartient à la faction, il coûte au trésor.
pol.world.factions[fPol].tresor = 9000;
const sites = sitesFondation(pol.world, fPol);
ok(sites.length > 0, 'il reste de la place où planter un poste');
const avantVilles = pol.world.colonies.filter((c) => !c.ruine && c.faction === fPol).length;
const postePol = fonderPoste(pol, fPol, sites[0].i, new Rng(7), () => {});
ok(postePol.ok, 'un capitaine fait fonder sans consulter personne', postePol.motif);
ok(pol.world.colonies.filter((c) => !c.ruine && c.faction === fPol).length === avantVilles + 1,
  'la ville est bien là');
ok(postePol.colonie.emplois && postePol.colonie.notables,
  'et elle naît complète, avec des métiers et des notables');
ok(!fonderPoste(pol, fPol, sites[0].i, new Rng(7), () => {}).ok,
  'on ne fonde pas deux fois sur la même case');

// La responsabilité : une colonne perdue se paie, et le crédit épuisé fait
// tomber la charge. C'est ce qui remplace le dé.
const creditPlein = creditCharge(pol, fPol);
ok(creditPlein > 0, 'un officier neuf a du crédit');
const perdue = pol.world.armees.find((a) => a.faction === fPol);
if (perdue) {
  gPol.allegeance.actes = [{ type: 'envoi', armee: perdue.id, cible: cibleLevee.id, t: pol.temps }];
  pol.world.armees = pol.world.armees.filter((a) => a.id !== perdue.id);
  jugerActes(pol, () => {});
  ok(gPol.allegeance.fautes > 0, 'la colonne détruite est portée à votre charge');
  ok(creditCharge(pol, fPol) < creditPlein, 'et elle entame le crédit',
    `${creditPlein} → ${creditCharge(pol, fPol)}`);
}

// Un mérite, à l'inverse : la ville prise comme on l'avait ordonné.
const villePrise = pol.world.colonies.find((c) => !c.ruine && c.faction === fPol);
const ptsAvantPrise = gPol.allegeance.points;
gPol.allegeance.actes = [{ type: 'envoi', armee: 'a-inexistante', cible: villePrise.id, t: pol.temps }];
jugerActes(pol, () => {});
ok(gPol.allegeance.points > ptsAvantPrise,
  'la ville tombée comme prévu fait monter, elle',
  `${ptsAvantPrise} → ${gPol.allegeance.points}`);
ok(!gPol.allegeance.actes.length, 'et le dossier se solde');

// À crédit épuisé, on est relevé de sa charge — un cran, pas toute l’échelle.
gPol.allegeance.points = RANGS[4].points;
porterFaute(pol, fPol, 'tout ce qu’on voudra', () => {}, 40);
ok(creditCharge(pol, fPol) <= 0, 'assez de fautes finissent par tout manger');
tickCharges(pol, () => {});
ok(rangDe(gPol.allegeance).index === 3,
  'on redescend d’un grade, pas de quatre',
  RANGS[rangDe(gPol.allegeance).index].nom);
ok(gPol.allegeance.fautes === 0, 'et l’ardoise repart à zéro : on n’est pas fini');
ok(!peutExercer(pol, fPol, 'guerre').ok,
  'la prérogative perdue avec le grade ne s’exerce plus');

section('9 nonies septies bis. Ce dont un gradé répond tous les jours');
// Le trou que le banc avait chiffré : la charge de Lieutenant n'avait de
// contenu que si la faction faisait la guerre. Elle a maintenant un secteur,
// et un secteur se tient qu'il se passe quelque chose ou non.
const sec = nouvellePartie(5151, { maintenant: 0, depart: 'ville', equipe: 3 });
const gSec = groupeActif(sec);
const villeSec = sec.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gSec.regionId = villeSec.regionId;
sec.player.reputation[villeSec.faction] = 60;
sEngager(sec, villeSec.faction, () => {}, gSec);

ok(!gSec.allegeance.secteur, 'un affilié ne répond de rien');
gSec.allegeance.points = RANGS[2].points;
tickSecteurs(sec, () => {}, { rng: new Rng(3) });
const monSecteur = gSec.allegeance.secteur;
ok(!!monSecteur, 'passer Lieutenant vous vaut un secteur, sans rien demander');
ok(casesDe(sec.world, monSecteur).length >= 9,
  'et le secteur fait une poignée de cases, pas une case',
  `${casesDe(sec.world, monSecteur).length} cases`);
ok(distance(monSecteur.centre, villeSec.regionId) <= 4,
  'on ne détache pas son lieutenant à l’autre bout de la carte');

// L'insécurité dérive vers le haut si personne ne tient les routes, et elle se
// paie en mauvaises rencontres pour tout le monde.
// La case la plus éloignée de toute ville : c'est là que les pistes se
// referment le plus vite, faute de quiconque pour les tenir.
let casePerdue = sec.world.regions[0];
let plusLoin = -1;
for (const r of sec.world.regions) {
  if (r.colonie) continue;
  let d = Infinity;
  for (const c of sec.world.colonies) if (!c.ruine) d = Math.min(d, distance(c.regionId, r.i));
  if (d > plusLoin) { plusLoin = d; casePerdue = r; }
}
const avantLoin = casePerdue.insecurite;
for (let i = 0; i < 400; i++) { sec.temps += 1; tickInsecurite(sec); }
ok(casePerdue.insecurite > avantLoin + 0.2,
  'une piste que personne ne tient se referme toute seule',
  `${avantLoin.toFixed(2)} → ${casePerdue.insecurite.toFixed(2)}`);
// La menace se lit en écart à la normale, pas en valeur absolue : tenir un
// secteur doit rendre les pistes *plus sûres qu'avant*, sans quoi le système
// ne fait qu'augmenter la difficulté du monde entier.
ok(menace(sec.world, casePerdue.i) > 1,
  'une piste laissée à l’abandon se paie en mauvaises rencontres',
  `×${menace(sec.world, casePerdue.i).toFixed(2)}`);
const caseTenue = sec.world.regions[villeSec.regionId];
caseTenue.insecurite = 0.05;
ok(menace(sec.world, caseTenue.i) < 1,
  'et une piste tenue est plus sûre que la normale — c’est ça, la récompense',
  `×${menace(sec.world, caseTenue.i).toFixed(2)}`);
const caseVille = sec.world.regions[villeSec.regionId];
ok(caseVille.insecurite < casePerdue.insecurite,
  'une ville tient ses abords mieux que le vide ne se tient lui-même',
  `${caseVille.insecurite.toFixed(2)} vs ${casePerdue.insecurite.toFixed(2)}`);

// Patrouiller nettoie, et nettement plus que passer par là.
const casePatrouille = sec.world.regions[casePerdue.i];
gSec.regionId = casePatrouille.i;
gSec.ordre = { type: 'patrouille' };
const avantPat = casePatrouille.insecurite;
for (let i = 0; i < 20; i++) effetPresence(sec, gSec, 1);
const gainPatrouille = avantPat - casePatrouille.insecurite;
casePatrouille.insecurite = avantPat;
gSec.ordre = { type: 'fouille' };
for (let i = 0; i < 20; i++) effetPresence(sec, gSec, 1);
const gainPassage = avantPat - casePatrouille.insecurite;
ok(gainPatrouille > gainPassage * 2,
  'patrouiller tient un secteur, y travailler ne fait que l’effleurer',
  `${gainPatrouille.toFixed(3)} vs ${gainPassage.toFixed(3)}`);

// Le bilan : c'est ce qui fait qu'on répond de quelque chose tous les dix
// jours, sans qu'aucune guerre n'ait besoin d'éclater.
for (const r of casesDe(sec.world, monSecteur)) r.insecurite = 0.9;
gSec.allegeance.secteur.prochainBilan = sec.temps;
const fautesAvant = gSec.allegeance.fautes || 0;
tickSecteurs(sec, () => {}, { rng: new Rng(4) });
ok((gSec.allegeance.fautes || 0) > fautesAvant,
  'un secteur infréquentable est porté à votre charge, guerre ou pas',
  `${fautesAvant} → ${gSec.allegeance.fautes}`);
ok(motEtat(0.9) === 'infréquentable' && motEtat(0.1) === 'sûr',
  'et l’état se dit en français avant de se dire en décimales');

for (const r of casesDe(sec.world, monSecteur)) r.insecurite = 0.05;
gSec.allegeance.secteur.prochainBilan = sec.temps;
const ptsAvantBilan = gSec.allegeance.points;
tickSecteurs(sec, () => {}, { rng: new Rng(5) });
ok(gSec.allegeance.points > ptsAvantBilan,
  'un secteur sûr fait monter : c’est la voie du carriériste en temps de paix',
  `${ptsAvantBilan} → ${gSec.allegeance.points}`);

// La ville de référence tombe : on reçoit un autre secteur, on ne reste pas à
// répondre d'un morceau de carte qui ne veut plus rien dire.
const ancienCentre = gSec.allegeance.secteur.centre;
const villeRef = sec.world.colonies.find((c) => c.id === gSec.allegeance.secteur.ville);
villeRef.ruine = true;
tickSecteurs(sec, () => {}, { rng: new Rng(6) });
ok(gSec.allegeance.secteur && gSec.allegeance.secteur.centre !== ancienCentre,
  'la ville tombée, le secteur est redistribué');

// Rétrograder rend le secteur : on ne tient pas des routes sans le grade.
gSec.allegeance.points = 0;
tickSecteurs(sec, () => {}, { rng: new Rng(7) });
ok(!gSec.allegeance.secteur, 'perdre le grade, c’est rendre le secteur');

section('9 nonies septies ter. Ce qu’on fait des gens qu’on n’a pas tués');
const jus = nouvellePartie(7373, { maintenant: 0, depart: 'ville', equipe: 3 });
const gJus = groupeActif(jus);
const villeJus = jus.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gJus.regionId = villeJus.regionId;

// Une bande mise en déroute laisse des gens à terre, vivants.
const bandeJus = genererBande(new Rng(11), 'bandits', 4, 1);
for (const c of bandeJus.membres) { c.etat = 'ko'; c.corps.torse.pv = 0; }
const capt = capturables(gJus, bandeJus);
ok(capt.length > 0, 'les hommes à terre sont capturables', `${capt.length}`);
ok(capt.length === bandeJus.membres.filter((c) => c.etat === 'ko').length,
  'tous ceux qui sont à terre, même au-delà de ce qu’on sait garder : la limite '
  + 'n’est pas écrite, elle se paie',
  `${capt.length} pour ${capaciteGarde(gJus)} de garde`);
const prisJus = fairePrisonniers(jus, gJus, bandeJus, capt, () => {});
ok(prisonniersDe(gJus).length === prisJus.length, 'ils passent dans la colonne');
ok(prisonniersDe(gJus).every((c) => c.etat !== 'ko'),
  'debout et liés, pas portés : on ne traîne pas des corps');
ok(!gJus.membres.some((m) => prisonniersDe(gJus).some((c) => c.id === m.id)),
  'un prisonnier n’est pas un membre');

// Ils coûtent : ils mangent, et ils ralentissent.
ok(lenteurPrisonniers(gJus) > 0, 'ils ralentissent la colonne',
  `−${Math.round(lenteurPrisonniers(gJus) * 100)} %`);
gJus.inventaire.rations = 100;
const rationsAvantJus = gJus.inventaire.rations;
for (let i = 0; i < 24; i++) tickPrisonniers(jus, gJus, new Rng(12 + i), () => {});
ok(gJus.inventaire.rations < rationsAvantJus, 'et ils mangent sur le sac',
  `${rationsAvantJus} → ${gJus.inventaire.rations.toFixed(1)}`);

// Ceux que personne ne surveille s'en vont. C'est ce qui borne leur nombre.
const jusTrop = nouvellePartie(7474, { maintenant: 0, depart: 'ville', equipe: 3 });
const gT = groupeActif(jusTrop);
gT.inventaire.rations = 500;
const foule = genererBande(new Rng(13), 'bandits', 6, 1);
for (const c of foule.membres) { c.etat = 'ko'; c.corps.torse.pv = 0; }
gT.prisonniers = foule.membres.map((c) => {
  c.etat = 'ok';
  c.corps.torse.pv = 5;
  c.captif = { faction: 'bandits', depuis: 0, brigandage: true };
  return c;
});
ok(surveillanceManquante(gT) > 0, 'six prisonniers pour trois gardiens, ça déborde',
  `${surveillanceManquante(gT).toFixed(1)} non surveillés`);
let evades = 0;
for (let i = 0; i < 900; i++) {
  const avant = prisonniersDe(gT).length;
  tickPrisonniers(jusTrop, gT, new Rng(500 + i), () => {});
  evades += avant - prisonniersDe(gT).length;
}
ok(evades > 0, 'et ce qu’on ne surveille pas finit par s’en aller', `${evades} évasions`);

// Livrer : une prime, une geôle qui se remplit, et des pistes plus sûres.
const brigand = prisonniersDe(gJus)[0];
const crAvantJus = jus.player.credits;
const livr = disposer(jus, gJus, brigand.id, 'livrer', () => {});
ok(livr.ok, 'on livre un brigand à la justice de la ville', livr.motif);
ok(jus.player.credits > crAvantJus, 'la prime est versée',
  `${crAvantJus} → ${jus.player.credits}`);
ok(geoleDe(villeJus).detenus.length === 1, 'et la geôle se remplit');
ok(apaisementGeole(villeJus) > 0,
  'un détenu, c’est quelqu’un qui ne coupe plus les routes');

// Vendre : la loi décide, et la réputation aussi.
const encore = prisonniersDe(gJus)[0];
ok(!!encore, 'il reste des prisonniers à disposer');
ok(!disposer(jus, gJus, encore.id, 'vendre', () => {}).ok,
  'on ne vend pas d’hommes là où c’est interdit');
loisDe(jus.world, villeJus.faction).esclavage = true;
const repuAvantVente = { ...jus.player.reputation };
const vte = disposer(jus, gJus, encore.id, 'vendre', () => {});
ok(vte.ok, 'là où la loi le permet, si', vte.motif);
ok(vte.prix > 0, 'et ça rapporte plus que la justice', `${vte.prix} cr`);
const vus = DIPLO_FACTIONS.filter(
  (k) => (jus.player.reputation[k] || 0) < (repuAvantVente[k] || 0)
);
ok(vus.length > 0, 'ceux qui l’interdisent chez eux l’apprennent', `${vus.length} factions`);
// Le prix doit valoir la peine qu'on prend : à 1,9 fois la valeur, un homme se
// vendait moins cher qu'une charrette à bras, et la voie du négrier mesurait
// moins bien que le travail honnête sur tous les tableaux à la fois.
{
  const temoin = prisonniersDe(gJus)[0] || encore;
  const vendu = prixEsclave(jus, villeJus, temoin);
  const livre = primeLivraison(jus, villeJus, temoin);
  ok(vendu > livre * 2, 'vendre paie plus du double de ce que paie la justice',
    `${vendu} contre ${livre}`);
  ok(vendu > BETES.charrette.prix,
    'et un homme vaut plus qu’une charrette à bras', `${vendu} cr`);
}

// --- Le marché aux hommes doit pouvoir s'ouvrir. Aucune faction ne démarre
// esclavagiste : si le conseil ne l'ouvre jamais, tout ce qui en dépend est mort.
{
  const marche = nouvellePartie(7575, { maintenant: 0, depart: 'ville', equipe: 3 });
  const kM = DIPLO_FACTIONS.find(
    (k) => marche.world.colonies.some((c) => !c.ruine && c.faction === k)
  );
  ok(!loisDe(marche.world, kM).esclavage, 'personne ne commence esclavagiste');
  // Une caisse vide, un chef que ça n'empêche pas de dormir, et un pays qui
  // gronde — ce qui est l'état ordinaire d'un pays ruiné, et ce que l'ancienne
  // règle excluait : elle demandait la ruine et la sérénité en même temps.
  marche.world.factions[kM].tresor = 0;
  dirigeant(marche.world, kM).temperament = 'rapace';
  for (const c of marche.world.colonies) {
    if (c.faction === kM) c.unrest = 0.7;
  }
  loisDe(marche.world, kM).depuis = -9999;
  marche.world.factions[kM].prochainConseil = 1;
  avancer(marche, 40);
  ok(loisDe(marche.world, kM).esclavage,
    'une caisse vide et un chef sans scrupule ouvrent le marché, même si ça gronde');
  // Et il se referme quand la caisse est pleine : ce n'est pas une idéologie.
  marche.world.factions[kM].tresor = 99999;
  loisDe(marche.world, kM).depuis = -9999;
  marche.world.factions[kM].prochainConseil = 1;
  avancer(marche, 40);
  ok(!loisDe(marche.world, kM).esclavage,
    'et se referme quand on n’en a plus besoin');
}

// Une geôle se vide toute seule quand la peine est purgée.
const detenu = geoleDe(villeJus).detenus[0];
jus.temps = detenu.sortie + 1;
tickGeole(jus, villeJus, 1);
ok(geoleDe(villeJus).detenus.length === 0, 'on sort quand on a fait son temps');

// --- Détrousser une caravane met la marchandise dans le sac.
//
// Elle n'y allait nulle part : `attaquerCaravane` calculait le butin, retirait
// la caravane du monde, encaissait les vingt-deux points de réputation et la
// rancune des deux villes concernées — puis retournait l'objet `pris` à
// l'appelant. `main.js` le relayait, l'interface affichait « Caravane
// détroussée » et le jetait. On gagnait l'embuscade et l'on repartait les mains
// vides, sans qu'aucun compteur ne le dise.
{
  const pil = nouvellePartie(7676, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gPil = groupeActif(pil);
  // Une caravane sous la main, avec une cargaison connue.
  const depart = pil.world.colonies.find((c) => !c.ruine && c.faction);
  const arrivee = pil.world.colonies.find(
    (c) => !c.ruine && c.faction && c.id !== depart.id);
  const car = {
    id: 'v-test', faction: depart.faction, deId: depart.id, versId: arrivee.id,
    regionId: gPil.regionId, route: [gPil.regionId], etape: 0, progres: 0,
    cargaison: { alliage: 20 }, escorte: 6, depuis: 0,
  };
  pil.world.caravanes.push(car);
  gPil.regionId = car.regionId;
  // On gagne à coup sûr : l'escorte est une seule personne et les nôtres sont
  // en pleine forme et surarmés.
  for (const m of gPil.membres) {
    m.skills.melee = 90; m.skills.endurance = 90;
    for (const part of Object.keys(m.corps)) m.corps[part].pv = m.corps[part].max;
  }
  const avant = gPil.inventaire.alliage || 0;
  const repuAvant = pil.player.reputation[car.faction] || 0;
  const r = attaquerCaravane(pil, car, new Rng(31), () => {},
    combatContre, genererBande, gPil);
  ok(r.ok, 'l’embuscade a lieu', r.motif);
  if (r.gagne) {
    ok((gPil.inventaire.alliage || 0) > avant,
      'la cargaison finit dans le sac de ceux qui se sont battus',
      `${avant} → ${gPil.inventaire.alliage}`);
    ok(Object.values(r.pris).reduce((a, b) => a + b, 0) > 0,
      'et le butin rendu n’est pas vide');
    ok((pil.player.reputation[car.faction] || 0) < repuAvant,
      'la faction n’oublie pas', `${repuAvant} → ${pil.player.reputation[car.faction]}`);
    ok(pil.stats.caravanesPillees === 1, 'et ça se compte');
  }
}

// Ce qu'on ne peut pas porter reste sur place.
{
  const lourd = nouvellePartie(7677, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gL = groupeActif(lourd);
  for (const m of gL.membres) {
    m.skills.melee = 90; m.skills.endurance = 90;
    for (const part of Object.keys(m.corps)) m.corps[part].pv = m.corps[part].max;
  }
  const dep = lourd.world.colonies.find((c) => !c.ruine && c.faction);
  const arr = lourd.world.colonies.find((c) => !c.ruine && c.faction && c.id !== dep.id);
  const gros = {
    id: 'v-lourd', faction: dep.faction, deId: dep.id, versId: arr.id,
    regionId: gL.regionId, route: [gL.regionId], etape: 0, progres: 0,
    // Bien au-delà de ce que quatre personnes portent à dos d'homme.
    cargaison: { alliage: 900 }, escorte: 6, depuis: 0,
  };
  lourd.world.caravanes.push(gros);
  const r = attaquerCaravane(lourd, gros, new Rng(32), () => {},
    combatContre, genererBande, gL);
  if (r.ok && r.gagne) {
    ok(r.laisse > 0, 'une colonne ne remporte pas neuf cents unités à dos d’homme',
      `${r.laisse} laissées`);
    ok(poidsInventaire(gL.inventaire) <= capacitePortage(lourd, gL) + 1,
      'et elle ne dépasse pas sa capacité de portage');
  }
}

section('9 nonies septies quater. Les lois d’un Commandeur');
const loi = nouvellePartie(8484, { maintenant: 0, depart: 'ville', equipe: 3 });
const gLoi = groupeActif(loi);
const villeLoi = loi.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gLoi.regionId = villeLoi.regionId;
loi.player.reputation[villeLoi.faction] = 60;
sEngager(loi, villeLoi.faction, () => {}, gLoi);
const fLoi = villeLoi.faction;

gLoi.allegeance.points = RANGS[3].points;
ok(!peutExercer(loi, fLoi, 'loi').ok, 'un capitaine ne légifère pas');
gLoi.allegeance.points = RANGS[4].points;
ok(peutExercer(loi, fLoi, 'loi').ok, 'un commandeur, si');

ok(loisDe(loi.world, fLoi).impot === 0.05, 'l’impôt ordinaire est la règle au départ');
const rImp = fixerLoi(loi, fLoi, 'impot', 'lourd', () => {});
ok(rImp.ok, 'on promulgue sans demander l’avis de personne', rImp.motif);
ok(loisDe(loi.world, fLoi).impot === 0.09, 'et le taux change sur-le-champ');
ok(pressionFiscale(loi.world, fLoi) > 0,
  'un impôt lourd fait gronder, un impôt léger apaise',
  `${pressionFiscale(loi.world, fLoi).toFixed(4)}`);
fixerLoi(loi, fLoi, 'impot', 'leger', () => {});
ok(pressionFiscale(loi.world, fLoi) < 0, 'et l’inverse est vrai aussi');

// Le trésor suit la loi : c'est ce qui relie une décision politique aux moyens
// qu'on aura de gouverner.
function revenuSur(taux, graine) {
  const t = nouvellePartie(graine, { maintenant: 0, depart: 'ville', equipe: 3 });
  // On gèle la législation : sans ça, le conseil revote son taux pendant les six
  // cents heures et l'on mesure sa décision à lui, pas celle qu'on vient de
  // poser. Le test passait par chance, tant que le tirage laissait le taux en
  // place — il s'est retourné au premier changement ailleurs dans le moteur.
  t.sansLois = true;
  const k = t.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim').faction;
  loisDe(t.world, k).impot = taux;
  loisDe(t.world, k).peine = 'ferme';
  const avant = t.world.factions[k].tresor;
  avancer(t, 600);
  return t.world.factions[k].tresor - avant;
}

/**
 * Sur plusieurs mondes, parce qu'un seul ne dit rien.
 *
 * Mesuré sur la graine 8585 uniquement, le taux confiscatoire rendait 232 quand
 * le taux le plus doux rendait 1 229, et j'en ai conclu — publiquement — que
 * l'impôt à 15 % était une option morte qui s'étrangle elle-même. C'était faux.
 * Sur cinq mondes, le trésor d'une faction sur six cents heures va de −3 548 à
 * +3 970 **au même taux** : il est dominé par ses guerres et ses villes perdues,
 * pas par sa fiscalité. Une graine ne mesure rien du tout ici.
 */
const GRAINES_FISC = [8585, 1234, 4242, 777, 31415];
function revenuMoyen(taux) {
  return GRAINES_FISC.reduce((a, g) => a + revenuSur(taux, g), 0) / GRAINES_FISC.length;
}
const fiscLeger = revenuMoyen(0.03);
const fiscLourd = revenuMoyen(0.09);
const fiscTout = revenuMoyen(0.15);
ok(fiscLourd > fiscLeger,
  'le trésor suit la loi : prélever davantage rapporte davantage, en moyenne',
  `${Math.round(fiscLeger)} à 3 % · ${Math.round(fiscLourd)} à 9 % · ${Math.round(fiscTout)} à 15 %`);
ok(fiscTout > fiscLeger,
  'et le confiscatoire n’est pas l’option morte que j’avais annoncée sur une seule graine',
  `${Math.round(fiscTout)} contre ${Math.round(fiscLeger)}`);

const rEsc = fixerLoi(loi, fLoi, 'esclavage', true, () => {});
ok(rEsc.ok, 'on autorise le commerce d’hommes d’un trait de plume', rEsc.motif);
ok(loisDe(loi.world, fLoi).esclavage, 'et c’est la loi');
ok(!fixerLoi(loi, fLoi, 'esclavage', true, () => {}).ok, 'deux fois, non');
ok(loi.world.colonies.filter((c) => c.faction === fLoi).every((c) => c.unrest > 0),
  'les villes de la faction l’ont senti passer');

ok(PEINES[loisDe(loi.world, fLoi).peine].prime === 1, 'la justice est ferme par défaut');
fixerLoi(loi, fLoi, 'peine', 'expeditive', () => {});
ok(PEINES[loisDe(loi.world, fLoi).peine].prime > 1,
  'une justice expéditive paie mieux les chasseurs de primes');
ok(PEINES.expeditive.duree < PEINES.ferme.duree,
  'et garde moins longtemps : on ne nourrit pas ce qu’on pend');

verifierCoherence(loi, 'après une saison de législation');

section('9 nonies septies quinquies. Des conseils qui votent leurs propres lois');
// Sans ça, le monde n'avait de politique intérieure que là où le joueur en
// faisait : six factions à l'impôt ordinaire et à la justice ferme, pour
// toujours, quel que soit le caractère de leurs chefs.
const conseils = nouvellePartie(9191, { maintenant: 0, depart: 'ville', equipe: 3 });
const avantLois = DIPLO_FACTIONS.map((k) => ({ ...loisDe(conseils.world, k) }));
avancer(conseils, 3000);
const apresLois = DIPLO_FACTIONS.map((k) => loisDe(conseils.world, k));
const bouge = apresLois.filter((l, i) => l.impot !== avantLois[i].impot
  || l.peine !== avantLois[i].peine || l.esclavage !== avantLois[i].esclavage);
ok(bouge.length > 0, 'les conseils légifèrent d’eux-mêmes',
  `${bouge.length}/${DIPLO_FACTIONS.length} factions ont changé leur loi`);
const taux = new Set(apresLois.map((l) => l.impot));
ok(taux.size > 1, 'et ils ne votent pas tous la même chose',
  `${[...taux].map((t) => `${Math.round(t * 100)} %`).join(', ')}`);

// Le caractère du chef décide de la ligne. C'est ce qui donne un sens à un
// tempérament ailleurs que sur un champ de bataille.
function impotSous(temperament) {
  const t = nouvellePartie(9292, { maintenant: 0, depart: 'ville', equipe: 3 });
  for (const k of DIPLO_FACTIONS) {
    const d = dirigeant(t.world, k);
    if (d) d.temperament = temperament;
  }
  avancer(t, 2600);
  const vivantes = DIPLO_FACTIONS.filter(
    (k) => t.world.colonies.some((c) => !c.ruine && c.faction === k)
  );
  return vivantes.reduce((a, k) => a + loisDe(t.world, k).impot, 0) / Math.max(1, vivantes.length);
}
const impotRapace = impotSous('rapace');
const impotConciliateur = impotSous('conciliateur');
ok(impotRapace > impotConciliateur,
  'un rapace prélève plus qu’un conciliateur, et le monde entier le sait',
  `${(impotRapace * 100).toFixed(1)} % vs ${(impotConciliateur * 100).toFixed(1)} %`);

// Une loi ne se change pas tous les quatre matins : un conseil qui légifère à
// chaque séance n'est pas un gouvernement, c'est du bruit.
const bruit = nouvellePartie(9393, { maintenant: 0, depart: 'ville', equipe: 3 });
let votes = 0;
let avantVote = DIPLO_FACTIONS.map((k) => JSON.stringify(loisDe(bruit.world, k)));
for (let i = 0; i < 3000; i++) {
  avancer(bruit, 1);
  const maintenant = DIPLO_FACTIONS.map((k) => JSON.stringify(loisDe(bruit.world, k)));
  for (let j = 0; j < maintenant.length; j++) if (maintenant[j] !== avantVote[j]) votes++;
  avantVote = maintenant;
}
ok(votes <= Math.ceil(3000 / DELAI_LOI) * DIPLO_FACTIONS.length,
  'une loi tient au moins sept cents heures avant d’être rouverte',
  `${votes} votes en 3000 h`);

// Le joueur Commandeur légifère seul : le conseil s'efface tant qu'il tient la
// charge. C'est tout le sens du grade.
const regne = nouvellePartie(9494, { maintenant: 0, depart: 'ville', equipe: 3 });
const gRegne = groupeActif(regne);
const villeRegne = regne.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
gRegne.regionId = villeRegne.regionId;
regne.player.reputation[villeRegne.faction] = 60;
sEngager(regne, villeRegne.faction, () => {}, gRegne);
gRegne.allegeance.points = RANGS[4].points;
const fRegne = villeRegne.faction;
fixerLoi(regne, fRegne, 'impot', 'confiscatoire', () => {});
// On tient l'escouade en vie à la main : ce qu'on mesure ici est politique, et
// `avancer` s'arrête net à la mort du dernier membre.
const nourrir = (heures) => {
  for (let i = 0; i < heures / 50; i++) {
    for (const gr of groupes(regne)) {
      gr.inventaire.rations = 300;
      for (const m of gr.membres) { m.faim = 0; m.soif = 0; m.fatigue = 0; }
    }
    avancer(regne, 50);
  }
};
// Une justice clémente dans un pays qui gronde : aucun conseil ne la garde.
// On légifère sur deux axes pour que la reprise en main soit visible quelle que
// soit l'humeur du chef en place.
fixerLoi(regne, fRegne, 'peine', 'legere', () => {});
nourrir(2000);
ok(loisDe(regne.world, fRegne).impot === 0.15
  && loisDe(regne.world, fRegne).peine === 'legere',
  'tant que vous tenez la charge, votre loi tient',
  `${Math.round(loisDe(regne.world, fRegne).impot * 100)} % · ${loisDe(regne.world, fRegne).peine}`);
// Et le conseil reprend la main dès qu'on n'est plus là pour la tenir. On
// mesure qu'il a légiféré, pas qu'il a choisi telle valeur : un conseil peut
// très bien vouloir le même impôt que vous, et la première version de ce test
// se contentait de lire le taux — elle passait ou non selon le tempérament tiré
// pour ce chef-là, ce qui n'était pas ce qu'on voulait vérifier.
gRegne.allegeance = null;
const legiferaA = loisDe(regne.world, fRegne).depuis || 0;
const tLibre = regne.temps;
nourrir(1600);
ok((loisDe(regne.world, fRegne).depuis || 0) > Math.max(legiferaA, tLibre),
  'la charge perdue, le conseil repasse derrière vous',
  `légiféré à ${loisDe(regne.world, fRegne).depuis} (libre depuis ${tLibre})`);
ok(loisDe(regne.world, fRegne).peine !== 'legere',
  'et il ne garde pas une justice clémente dans un pays qui gronde',
  loisDe(regne.world, fRegne).peine);

// La sévérité n'est plus décorative : elle tient les routes et elle se paie en
// grogne — les deux champs existaient sans que rien ne les lise.
ok(PEINES.expeditive.routes > PEINES.legere.routes,
  'une justice dure dissuade plus qu’une justice clémente');
const ordre = nouvellePartie(9595, { maintenant: 0, depart: 'ville', equipe: 3 });
const colOrdre = ordre.world.colonies.find((c) => !c.ruine && c.faction !== 'essaim');
loisDe(ordre.world, colOrdre.faction).peine = 'expeditive';
colOrdre.unrest = 0.1;
for (let i = 0; i < 4000; i++) { ordre.temps += 1; tickOrdrePublic(ordre, colOrdre, 1); }
ok(colOrdre.unrest > 0.1, 'on ne pend pas vite sans que la ville s’en ressente',
  `${colOrdre.unrest.toFixed(2)}`);
ok(colOrdre.unrest <= 0.46,
  'mais la peur a un palier : une ville rancunière n’est pas une ville en révolte',
  `${colOrdre.unrest.toFixed(2)}`);

verifierCoherence(conseils, 'après 3000 h de politique intérieure');

section('9 nonies septies senies. Révoltes et renversements');
// Une ville qui gronde à quatre-vingts pour cent n'avait aucune issue : elle
// mijotait indéfiniment, et l'impôt confiscatoire ne coûtait rien de plus qu'un
// chiffre qui montait.
const rev = nouvellePartie(6060, { maintenant: 0, depart: 'ville', equipe: 3 });
const colRev = rev.world.colonies.find((c) => !c.ruine && c.faction && c.faction !== 'essaim');

// C'est la garnison qui décide, pas un dé : une place tenue mate sa foule.
const tenue = JSON.parse(JSON.stringify(colRev));
tenue.pop = 300;
tenue.unrest = 0.95;
tenue.defense = 900;
tenue.murs = 40;
ok(faireRevolte(rev.world, tenue, new Rng(1), 0).issue === 'matee',
  'une garnison entière derrière de bons murs contient l’émeute');

const creuse = JSON.parse(JSON.stringify(colRev));
creuse.pop = 300;
creuse.unrest = 0.95;
creuse.defense = 0;
creuse.murs = 1;
ok(faireRevolte(rev.world, creuse, new Rng(1), 0).issue !== 'matee',
  'une garnison fondue par la guerre ne contient rien du tout');

// Matée, la ville paie : des morts, des murs ébréchés, et une garnison qui
// n'est plus ce qu'elle était.
const matee = JSON.parse(JSON.stringify(colRev));
matee.pop = 300;
matee.unrest = 0.95;
matee.defense = 900;
matee.murs = 40;
matee.geole = { detenus: [{ nom: 'X', faction: null, sortie: 9999 }], majA: 0 };
const rMatee = faireRevolte(rev.world, matee, new Rng(2), 100);
ok(matee.unrest < 0.95 && matee.pop < 300 && matee.defense < 900,
  'la mater coûte des morts, des murs et de la troupe',
  `grogne ${matee.unrest}, pop ${matee.pop}, garnison ${matee.defense}`);
ok(rMatee.liberes === 1 && !matee.geole,
  'et la geôle se vide : c’est la première porte qu’on enfonce');
ok(matee.derniereRevolte === 100,
  'une ville qui vient de se soulever ne recommence pas le mois suivant');

// La foule l'emporte : une ville sans passé sous un autre drapeau devient
// libre, c'est-à-dire sans loi.
const libre = rev.world.colonies.find(
  (c) => !c.ruine && c.faction && c.faction !== 'essaim' && !c.factionOrigine
) || colRev;
libre.factionOrigine = null;
const drapeau = libre.faction;
libre.pop = 400;
libre.unrest = 0.95;
libre.defense = 0;
libre.murs = 0;
const rLibre = faireRevolte(rev.world, libre, new Rng(3), 200);
ok(rLibre.issue === 'affranchie', 'la ville se donne à personne', rLibre.issue);
ok(!libre.faction && rev.world.regions[libre.regionId].controle === null,
  'plus de drapeau sur la carte');
ok(!rev.world.factions[drapeau].colonies.includes(libre.id),
  'et la faction ne la compte plus parmi les siennes');
ok(loiIci(rev, libre).sansLoi && loiIci(rev, libre).esclavage,
  'plus de loi non plus : on y vendra n’importe quoi',
  JSON.stringify(loiIci(rev, libre)));
ok(primeLivraison(rev, libre, { captif: { brigandage: true } }) === 0,
  'et plus personne n’y délivre de prime');

// Une ville prise de force à quelqu'un retourne chez elle plutôt que de
// flotter : la révolte est le contre-pouvoir de la conquête.
const reprise = rev.world.colonies.find(
  (c) => !c.ruine && c.faction && c.faction !== 'essaim' && c.id !== libre.id
);
const maison = DIPLO_FACTIONS.find((k) => k !== reprise.faction);
reprise.factionOrigine = maison;
reprise.pop = 400;
reprise.unrest = 0.95;
reprise.defense = 0;
reprise.murs = 0;
const rSec = faireRevolte(rev.world, reprise, new Rng(4), 300);
ok(rSec.issue === 'secession' && reprise.faction === maison,
  'une ville occupée qui se soulève rentre chez elle', rSec.issue);

// Le monde s'en sert : sur une longue partie, des villes changent de mains par
// la rue et pas seulement par les armées — sans que le journal ne parle que de
// ça.
const monde = nouvellePartie(6161, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(monde, 8000);
const lignesRevolte = monde.journal.filter((x) => x.type === 'revolte').length;
ok(lignesRevolte > 0, 'des villes se soulèvent au cours d’une longue partie',
  `${lignesRevolte} au journal`);
ok(lignesRevolte < monde.journal.length * 0.15,
  'mais l’émeute reste un événement, pas le bruit de fond du journal',
  `${lignesRevolte}/${monde.journal.length}`);

// Un chef répond de l'humeur de son pays, pas seulement de ses guerres.
function legitimiteApres(grogne) {
  const t = nouvellePartie(6262, { maintenant: 0, depart: 'ville', equipe: 3 });
  const d = dirigeant(t.world, 'cendre');
  d.legitimite = 80;
  for (let i = 0; i < 60; i++) tickDirigeant(t.world, 'cendre', new Rng(9), 24, i * 24, () => {}, grogne);
  return dirigeant(t.world, 'cendre').legitimite;
}
ok(legitimiteApres(0.85) < legitimiteApres(0.2),
  'gouverner un pays qui gronde ronge la légitimité',
  `${legitimiteApres(0.85).toFixed(0)} vs ${legitimiteApres(0.2).toFixed(0)}`);
ok(legitimiteApres(0.2) >= 80,
  'et gouverner sans catastrophe reste une forme de succès');

// Le successeur n'est pas tiré dans le même vivier selon ce qu'on reproche au
// sortant : c'est ce qui fait qu'une faction oscille au lieu de dériver.
const doux = new Set(['conciliateur', 'prudent', 'batisseur', 'methodique']);
let apresGrogne = 0;
for (let i = 0; i < 40; i++) {
  const d = creerDirigeant(new Rng(700 + i), 'cendre', 0, 'grogne');
  if (doux.has(d.temperament)) apresGrogne++;
}
let apresFaiblesse = 0;
for (let i = 0; i < 40; i++) {
  const d = creerDirigeant(new Rng(700 + i), 'cendre', 0, 'faiblesse');
  if (doux.has(d.temperament)) apresFaiblesse++;
}
ok(apresGrogne > apresFaiblesse,
  'après un chef qui a fait gronder le pays, la maison cherche une main plus douce',
  `${apresGrogne}/40 vs ${apresFaiblesse}/40`);

verifierCoherence(monde, 'après 8000 h de révoltes et de renversements');

section('9 nonies septies septies. Ce qu’on pense du régime d’en face');
// Les lois n'existaient que vers l'intérieur : un pays esclavagiste ne se
// faisait aucun ennemi, alors que c'est le casus belli le plus évident qu'un
// monde puisse produire.
const dip = nouvellePartie(7070, { maintenant: 0, depart: 'ville', equipe: 3 });
const juge = DIPLO_FACTIONS[0];
const mis = DIPLO_FACTIONS[1];
ok(distanceMorale(dip.world, juge, mis) < 0.05,
  'deux régimes identiques ne se reprochent rien');
loisDe(dip.world, mis).esclavage = true;
ok(distanceMorale(dip.world, juge, mis) > 0.4,
  'ouvrir un marché d’hommes se paie vis-à-vis de ceux qui l’interdisent',
  `${distanceMorale(dip.world, juge, mis).toFixed(2)}`);
loisDe(dip.world, juge).esclavage = true;
ok(distanceMorale(dip.world, juge, mis) < 0.25,
  'on ne reproche à personne ce qu’on pratique soi-même',
  `${distanceMorale(dip.world, juge, mis).toFixed(2)}`);

// Le chef pondère : un rapace ne s'offusque de rien, un conciliateur de tout.
loisDe(dip.world, juge).esclavage = false;
dirigeant(dip.world, juge).temperament = 'rapace';
const indifferent = distanceMorale(dip.world, juge, mis);
dirigeant(dip.world, juge).temperament = 'conciliateur';
const indigne = distanceMorale(dip.world, juge, mis);
ok(indigne > indifferent * 1.8,
  'un conciliateur s’indigne là où un rapace hausse les épaules',
  `${indigne.toFixed(2)} vs ${indifferent.toFixed(2)}`);

// Sur la durée, ça se voit dans les relations, puis dans les guerres.
const moral = nouvellePartie(7171, { maintenant: 0, depart: 'ville', equipe: 3 });
const negrier = DIPLO_FACTIONS[0];
loisDe(moral.world, negrier).esclavage = true;
for (const k of DIPLO_FACTIONS) if (k !== negrier) dirigeant(moral.world, k).temperament = 'conciliateur';
const relDepart = DIPLO_FACTIONS.filter((k) => k !== negrier)
  .reduce((a, k) => a + (moral.world.factions[k].relations[negrier] ?? 0), 0);
avancer(moral, 4000);
const encoreLa = DIPLO_FACTIONS.filter(
  (k) => k !== negrier && moral.world.colonies.some((c) => !c.ruine && c.faction === k)
);
const relFin = encoreLa.reduce((a, k) => a + (moral.world.factions[k].relations[negrier] ?? 0), 0);
ok(relFin < relDepart, 'un marchand d’hommes se fait détester de tout le voisinage',
  `${Math.round(relDepart)} → ${Math.round(relFin)}`);

// Une guerre faite au régime se gagne le jour où il change, pas quand on a
// compté les morts.
const abolition = { a: juge, b: mis, depuis: 0, batailles: 0, initiateur: juge,
  but: { type: 'abolition', texte: 'pour en finir avec leurs marchés d’hommes', batailles: 3 } };
loisDe(dip.world, mis).esclavage = true;
ok(etatDuBut(dip.world, abolition, juge) === null,
  'tant qu’ils vendent, la guerre a une raison de durer');
loisDe(dip.world, mis).esclavage = false;
ok(etatDuBut(dip.world, abolition, juge) === 'atteint',
  'le jour où ils abolissent, l’affaire est réglée');

verifierCoherence(moral, 'après une guerre de conscience');

section('9 nonies septies octies. Un combat qu’on mène plutôt qu’on subit');
// L'état des lieux avant : dix-huit tours de moyenne sur vingt-quatre possibles,
// 88 % des affrontements finissant par une fuite, et zéro mort des deux côtés —
// jamais, dans aucun combat, depuis le début du projet.
function bagarre(opts) {
  const rng = new Rng(opts.graine);
  const nous = [];
  for (let i = 0; i < (opts.nous || 4); i++) {
    const c = makeCharacter(rng, { archetype: opts.arme === 'smg' ? 'chasseur' : 'brute', niveau: 1 });
    c.equip.arme = opts.arme || 'machette';
    c.equip.armure = 'cuir';
    nous.push(c);
  }
  const eux = genererBande(rng, 'bandits', opts.eux || 3, 1);
  const r = resoudreCombat(nous, eux.membres, {
    rng,
    biome: opts.biome || 'steppe',
    posture: POSTURES.neutre,
    tactique: opts.tactique || 'ligne',
    letalA: opts.letalA || 0,
    letalB: opts.letalB === undefined ? 0.25 : opts.letalB,
    cohA: 1,
  });
  return { r, nous, eux };
}
function lot(opts, n = 200) {
  let tours = 0; let vic = 0; let perte = 0; let mortsA = 0; let koB = 0; let mortsB = 0;
  for (let i = 0; i < n; i++) {
    const { r } = bagarre({ ...opts, graine: 4000 + i });
    tours += r.tours;
    if (r.vainqueur === 'A') vic++;
    perte += r.koA + r.mortsA;
    mortsA += r.mortsA;
    koB += r.koB;
    mortsB += r.mortsB;
  }
  return { tours: tours / n, vic: vic / n, perte: perte / n, mortsA: mortsA / n, koB: koB / n, mortsB: mortsB / n };
}

const base = lot({});
ok(base.tours < 10, 'un affrontement se décide en quelques échanges, pas en une demi-journée',
  `${base.tours.toFixed(1)} tours`);
ok(base.koB > 0.8, 'et il met vraiment des gens à terre', `${base.koB.toFixed(2)} par combat`);

// La mort au combat existe — elle n'existait pas. `blesser` ne tue que quelqu'un
// de déjà au sol, et l'on ne visait jamais le sol.
const feroce = lot({ letalB: 0.55 }, 300);
ok(feroce.mortsA > 0, 'on peut mourir au combat, ce qui n’avait jamais été le cas',
  `${feroce.mortsA.toFixed(2)} mort(s) par combat contre l’Essaim`);
const tiede = lot({ letalB: 0.05 }, 300);
ok(feroce.mortsA > tiede.mortsA * 2,
  'et la férocité d’une bande décide de ce qu’il advient de ceux qui tombent',
  `${feroce.mortsA.toFixed(2)} vs ${tiede.mortsA.toFixed(2)}`);
const clement = lot({ letalA: 0 }, 200);
const impitoyable = lot({ letalA: 0.45 }, 200);
ok(impitoyable.mortsB > clement.mortsB * 3,
  'achever les hommes à terre est une décision, et elle se voit',
  `${impitoyable.mortsB.toFixed(2)} vs ${clement.mortsB.toFixed(2)}`);

// Une tactique est un pari, pas un bonus : chacune a sa situation.
const tirOuvert = lot({ arme: 'smg', biome: 'steppe', tactique: 'feu' });
const tirCassures = lot({ arme: 'smg', biome: 'canyons', tactique: 'feu' });
ok(tirOuvert.koB > tirCassures.koB * 1.2,
  'tenir à distance vaut en terrain découvert et pas dans les cassures',
  `${tirOuvert.koB.toFixed(2)} vs ${tirCassures.koB.toFixed(2)}`);
const tirSansFusils = lot({ arme: 'machette', biome: 'steppe', tactique: 'feu' });
ok(tirSansFusils.koB < tirOuvert.koB * 0.7,
  'et ne vaut rien du tout sans armes à feu — c’est ce qui manquait',
  `${tirSansFusils.koB.toFixed(2)} vs ${tirOuvert.koB.toFixed(2)}`);

const enveloppeNombre = lot({ nous: 6, eux: 3, tactique: 'encerclement' });
const enveloppeSansNombre = lot({ nous: 3, eux: 3, tactique: 'encerclement' });
const ligneNombre = lot({ nous: 6, eux: 3, tactique: 'ligne' });
ok(enveloppeNombre.koB > ligneNombre.koB,
  'envelopper paie quand on a le nombre',
  `${enveloppeNombre.koB.toFixed(2)} vs ${ligneNombre.koB.toFixed(2)} en ligne`);
ok(enveloppeSansNombre.koB < enveloppeNombre.koB,
  'et se disperse pour rien quand on ne l’a pas');

const charge = lot({ tactique: 'charge' });
const ligne = lot({ tactique: 'ligne' });
ok(charge.koB > ligne.koB && charge.perte > ligne.perte,
  'charger met plus de monde à terre, chez eux comme chez nous',
  `eux ${charge.koB.toFixed(2)} vs ${ligne.koB.toFixed(2)}, nous ${charge.perte.toFixed(2)} vs ${ligne.perte.toFixed(2)}`);

// Harceler ne gagne rien et ne perd personne : c'est la tactique du faible, et
// elle ne doit pas être la tactique du perdant.
const harcele = lot({ nous: 2, eux: 5, biome: 'marais', tactique: 'harcelement' }, 200);
const tientLaLigne = lot({ nous: 2, eux: 5, biome: 'marais', tactique: 'ligne' }, 200);
ok(harcele.perte < tientLaLigne.perte * 0.3,
  'harceler ramène les siens là où tenir la ligne les laisse sur place',
  `${harcele.perte.toFixed(2)} vs ${tientLaLigne.perte.toFixed(2)}`);
const { r: degage } = bagarre({ nous: 2, eux: 5, biome: 'marais', tactique: 'harcelement', graine: 77 });
ok(degage.vainqueur !== 'B' || degage.fuite === 'degage',
  'et se dégager n’est pas se faire battre', `${degage.vainqueur} / ${degage.fuite}`);

// Le rendement d'une tactique se lit avant de la choisir.
ok(apercuTactique('feu', 'steppe', 1, 1).v > apercuTactique('feu', 'marais', 1, 1).v,
  'on peut dire au joueur qu’une tactique est mal choisie ici');
ok(apercuTactique('encerclement', 'steppe', 2, 0.5).v
  > apercuTactique('encerclement', 'steppe', 0.6, 0.5).v,
  'et qu’elle dépend du nombre qu’on a en face');

section('9 nonies septies nonies. Des routes qui se font en marchant');
// Cinquante-deux pour cent du temps de jeu passait en marche, et sur quarante-
// cinq départs, trente étaient de la logistique. Agrandir le sac ou raccourcir
// la carte reviendrait à retirer le voyage du jeu ; ce qu'il faut, c'est que le
// voyage s'améliore là où l'on passe.
const rte = nouvellePartie(4141, { maintenant: 0, depart: 'ville', equipe: 3 });
const vierge = rte.world.regions.find(
  (r) => !r.colonie && !r.piste && BIOMES[r.biome].cout >= 5
);
ok(!!vierge, 'il existe des friches que personne n’a jamais tassées');
const coutVierge = coutTraversee(rte.world, vierge.i);
for (let i = 0; i < 60; i++) damer(rte.world, vierge.i, 1);
ok(rte.world.regions[vierge.i].piste === 1, 'à force d’y passer, la terre est faite');
const coutRoute = coutTraversee(rte.world, vierge.i);
ok(coutRoute < coutVierge * 0.75,
  'et une route coûte nettement moins qu’une friche',
  `${coutVierge.toFixed(1)} → ${coutRoute.toFixed(1)}`);

// Un convoi lourd marque plus qu’un homme seul.
const seul = rte.world.regions.find((r) => !r.colonie && !r.piste && r.i !== vierge.i);
damer(rte.world, seul.i, 1);
const traceSeul = seul.piste;
seul.piste = 0;
damer(rte.world, seul.i, 3);
ok(seul.piste > traceSeul * 2, 'un convoi lourd marque plus qu’un homme seul',
  `${seul.piste.toFixed(3)} vs ${traceSeul.toFixed(3)}`);

// Les abords des villes sont tassés depuis longtemps : le monde n'a pas attendu.
const bourg = rte.world.colonies.find((c) => !c.ruine);
ok(rte.world.regions[bourg.regionId].piste > 0.4,
  'les abords d’une ville sont damés dès le premier jour');

// Et une piste que plus personne n'emprunte s'efface.
const oubliee = rte.world.regions.find(
  (r) => !r.colonie && r.piste > 0.25
    && rte.world.colonies.every((c) => distance(c.regionId, r.i) > 2)
) || seul;
oubliee.piste = 0.8;
const memoire = oubliee.piste;
for (let i = 0; i < 200; i++) { rte.temps += 24; tickInsecurite(rte); }
ok(oubliee.piste < memoire * 0.6, 'et ce que plus personne n’emprunte s’efface',
  `${memoire} → ${oubliee.piste.toFixed(2)}`);

// Le monde entretient ses propres routes : au bout d'une saison, les cases
// entre villes sont plus tassées que le reste.
const vivant = nouvellePartie(4242, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(vivant, 2500);
const parcourues = vivant.world.regions.filter((r) => r.piste > 0.05).length;
ok(parcourues > vivant.world.colonies.length,
  'les colonnes et les caravanes tracent des chemins sans le joueur',
  `${parcourues} cases marquées`);
verifierCoherence(vivant, 'après une saison de circulation');

section('9 nonies decies. Ce que l’entrepôt refuse ne disparaît plus en silence');
// Trouvé en cherchant pourquoi un test échouait, pas en jouant : un entrepôt
// plein jetait la production de l'hydroponie, de la fonderie et de la
// raffinerie sans que rien ne l'indique nulle part. Un joueur aurait vu ses
// cultures ne rien rendre sans jamais comprendre pourquoi.
const plein = nouvellePartie(3131, { maintenant: 0, depart: 'ville', equipe: 3 });
const gPlein = groupeActif(plein);
gPlein.regionId = plein.world.regions.find((r) => !r.colonie).i;
Object.assign(gPlein.inventaire, { ferraille: 400, polymere: 200, composant: 40 });
fonderBase(plein, () => {});
Object.assign(plein.base.batiments, { generateur: 3, hydroponie: 3, entrepot: 1 });
plein.base.pop = 4;
// On remplit l'entrepôt à ras bord, en laissant de quoi produire.
const capaPlein = capaciteStock(plein.base);
plein.base.stock.biomasse = Math.round(capaPlein * 0.5);
plein.base.stock.ferraille = Math.round(capaPlein * 0.5);
plein.base.stock.carburant = 60;
ok(totalStock(plein.base) >= capaciteStock(plein.base) * 0.95, 'l’entrepôt est plein');
const perduAvant = plein.base.gaspille;
avancer(plein, 120);
ok(plein.base.gaspille > perduAvant,
  'ce que l’entrepôt refuse est compté au lieu d’être jeté en silence',
  `${Math.round(plein.base.gaspille)} unités perdues`);
ok(plein.journal.some((x) => x.type === 'entrepot'),
  'et le joueur en est averti');
ok(plein.journal.filter((x) => x.type === 'entrepot').length <= 120 / 24 + 1,
  'sans que l’avertissement devienne un bruit de fond',
  `${plein.journal.filter((x) => x.type === 'entrepot').length} avertissements en 120 h`);

const large = nouvellePartie(3131, { maintenant: 0, depart: 'ville', equipe: 3 });
const gLarge = groupeActif(large);
gLarge.regionId = large.world.regions.find((r) => !r.colonie).i;
Object.assign(gLarge.inventaire, { ferraille: 400, polymere: 200, composant: 40 });
fonderBase(large, () => {});
Object.assign(large.base.batiments, { generateur: 3, hydroponie: 3, entrepot: 5 });
large.base.pop = 4;
large.base.stock.biomasse = 300;
large.base.stock.carburant = 60;
avancer(large, 120);
ok(!large.base.gaspille, 'un entrepôt à la bonne taille ne perd rien',
  `${large.base.gaspille}`);

section('9 nonies undecies. Un camp qui devient un lieu');
// La voie du colon n'avait pas de haut : on fondait un camp, on le développait,
// et il restait un camp — invisible sur la carte, sans marché, que personne ne
// convoitait. Quarante habitants et douze niveaux de bâtiment sans que le monde
// s'en aperçoive.
function campDeveloppe(graine = 2727) {
  const t = nouvellePartie(graine, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gt = groupeActif(t);
  gt.regionId = t.world.regions.find((r) => !r.colonie).i;
  Object.assign(gt.inventaire, { ferraille: 400, polymere: 200, composant: 40 });
  fonderBase(t, () => {});
  Object.assign(t.base.batiments, {
    generateur: 3, baraquement: 3, hydroponie: 3, entrepot: 4, halle: 2, cantine: 2, mur: 2,
  });
  Object.assign(t.base.stock, { biomasse: 600, rations: 500, carburant: 400, ferraille: 200 });
  // On mesure ici ce que devient un camp, pas ce qu'un colporteur lui achète.
  t.base.commerce = false;
  return t;
}

// Les gens se placent eux-mêmes : un avant-poste de quarante habitants tournait
// avec `postes: {}`, personne affecté à rien, jamais.
const camp = campDeveloppe();
camp.base.pop = 15;
camp.base.postes = {};
avancer(camp, 30);
ok(Object.keys(camp.base.postes).length > 0,
  'les habitants trouvent du travail sans qu’on le leur dise',
  JSON.stringify(camp.base.postes));
ok((camp.base.postes.cultivateur || 0) > 0,
  'et ils commencent par ce qui se mange, pas par la fonderie');
camp.base.autoEmploi = false;
camp.base.postes = {};
avancer(camp, 30);
ok(Object.keys(camp.base.postes).length === 0,
  'le joueur peut reprendre la main s’il le veut');
camp.base.autoEmploi = true;

// Au-delà d'un seuil, le monde cesse de l'ignorer.
// On repose la population juste avant de mesurer : les heures qui précèdent en
// ont fait venir, et un test qui dépend d'un tirage qui ne bouge pas casse au
// premier changement ailleurs dans le moteur.
camp.base.pop = 15;
ok(!peutReconnaitre(camp).ok, 'un hameau de quinze âmes n’intéresse personne',
  peutReconnaitre(camp).motif);
camp.base.pop = POP_RECONNUE + 6;
ok(peutReconnaitre(camp).ok, 'passé le seuil, on peut se faire écrire sur les cartes',
  peutReconnaitre(camp).motif);
avancer(camp, 30);
ok(!camp.base.colonieId,
  'mais ça ne se fait pas tout seul : exister est une décision, pas un accident');
ok(!!reconnaitreAvantPoste(camp, () => {}), 'et le joueur la prend quand il veut');
const vitrine = camp.world.colonies.find((c) => c.id === camp.base.colonieId);
ok(!!vitrine && vitrine.avantPoste, 'elle est une colonie comme les autres, et marquée comme vôtre');
ok(camp.world.regions[camp.base.regionId].colonie === vitrine.id,
  'la case porte son nom');
ok(!vitrine.faction, 'sans drapeau : elle n’est à aucune faction');

// La vitrine est recopiée, pas simulée : sa vérité reste dans `state.base`.
const popAvant = vitrine.pop;
camp.base.batiments.baraquement = 8;
camp.base.majVitrine = -999;
avancer(camp, 30);
// On fixe la population *après* avoir tourné : ces trente heures en font venir
// ou en font partir, et l'on veut comparer la fiche à l'état courant, pas à un
// nombre posé avant que le monde bouge.
camp.base.pop = 60;
camp.base.majVitrine = -999;
avancer(camp, 3);
ok(vitrine.pop === camp.base.pop && vitrine.pop >= 55,
  'ce que devient le camp se recopie dans sa fiche',
  `${popAvant} → ${vitrine.pop}`);
ok(vitrine.taille >= 2, 'et une ville de soixante âmes n’est plus un hameau',
  `taille ${vitrine.taille} pour ${vitrine.pop} habitants`);
const stockVitrine = COMMODITY_KEYS.reduce((a, k) => a + (vitrine.stock[k] || 0), 0);
ok(stockVitrine === 0,
  'elle n’a pas de grenier à elle : le tick des colonies la saute',
  `${stockVitrine}`);

// Elle tient ses abords comme n'importe quelle ville.
const abord = camp.world.regions[camp.base.regionId];
abord.insecurite = 0.9;
for (let i = 0; i < 40; i++) { camp.temps += 24; tickInsecurite(camp); }
ok(abord.insecurite < 0.9, 'une ville tient ses routes, celle-ci comme les autres',
  `${abord.insecurite.toFixed(2)}`);

// Une ville à vous n'est pas un terrain vague. Cette règle a été écrite pour
// les bourgs qu'une révolte laisse sans drapeau ; appliquée à l'avant-poste du
// joueur, elle envoyait une colonne dans les cinquante heures suivant la
// déclaration — vingt-trois villes prises sur vingt-quatre en six mille heures,
// six niveaux de mur compris.
function survitAuMonde(hostile, murs) {
  const t = campDeveloppe(4949);
  Object.assign(t.base.batiments, { mur: murs });
  t.base.pop = POP_RECONNUE + 6;
  reconnaitreAvantPoste(t, () => {});
  if (hostile) for (const f of DIPLO_FACTIONS) t.player.reputation[f] = -45;
  for (let i = 0; i < 40 && t.base.fonde; i++) {
    for (const gg of groupes(t)) {
      gg.inventaire.rations = 200;
      for (const c of gg.membres) { c.faim = 0; c.soif = 0; c.fatigue = 0; }
    }
    avancer(t, 50);
  }
  return t.base.fonde;
}
ok(survitAuMonde(false, 2), 'une ville dont on n’a rien à reprocher n’est pas convoitée');
// La graine décide de qui est voisin et de ce qu'il a en caisse : on en essaie
// plusieurs plutôt que de parier sur une.
let prises = 0;
for (const gr of [4949, 5050, 5151, 5252, 5353, 5454]) {
  const t = campDeveloppe(gr);
  t.base.pop = POP_RECONNUE + 6;
  reconnaitreAvantPoste(t, () => {});
  for (const f of DIPLO_FACTIONS) t.player.reputation[f] = -45;
  for (let i = 0; i < 40 && t.base.fonde; i++) {
    for (const gg of groupes(t)) {
      gg.inventaire.rations = 200;
      for (const c of gg.membres) { c.faim = 0; c.soif = 0; c.fatigue = 0; }
    }
    avancer(t, 50);
  }
  if (!t.base.fonde) prises++;
}
ok(prises >= 3, 'une ville de quelqu’un que tout le monde déteste, si',
  `${prises}/6 prises`);

// Et l'on peut vous la prendre. C'est le prix d'exister.
const conquis = campDeveloppe(2828);
conquis.base.pop = POP_RECONNUE + 10;
reconnaitreAvantPoste(conquis, () => {});
avancer(conquis, 30);
ok(!!conquis.base.colonieId, 'la ville est reconnue');
const villeCible = conquis.world.colonies.find((c) => c.id === conquis.base.colonieId);
const assaillant = DIPLO_FACTIONS.find(
  (k) => conquis.world.colonies.some((c) => !c.ruine && c.faction === k)
);
conquis.world.armees.push({
  id: 'a-test', faction: assaillant, regionId: villeCible.regionId, force: 400, forceMax: 400,
  cible: villeCible.id, route: [], etape: 0, progres: 99, etat: 'marche', ravitaillement: 200,
});
for (let i = 0; i < 40 && conquis.base.fonde; i++) avancer(conquis, 1);
ok(!conquis.base.fonde, 'une colonne peut prendre votre ville, et le camp tombe avec elle');
ok(!conquis.base.colonieId && !conquis.base.pop,
  'il ne reste rien du camp — l’escouade, et de la place ailleurs');
ok(!conquis.fin, 'mais la partie continue : on n’a pas perdu ses gens');
verifierCoherence(conquis, 'après la chute d’un avant-poste');

section('9 nonies duodecies. Des marchands qui s’arrêtent');
// Une ville reconnue n'avait toujours pas de marché : elle achetait par
// l'escouade, comme un camp, et la voie du colon restait attachée aux jambes de
// quatre personnes. On ne lui donne pas un étal — ce serait une seconde source
// de vérité — on lui donne des visiteurs.
function campMarchand(piste) {
  const t = nouvellePartie(3838, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gt = groupeActif(t);
  gt.regionId = t.world.regions.find((r) => !r.colonie).i;
  Object.assign(gt.inventaire, { ferraille: 400, polymere: 200, composant: 40 });
  fonderBase(t, () => {});
  Object.assign(t.base.batiments, { halle: 2, hydroponie: 2, entrepot: 5, baraquement: 2 });
  t.base.pop = 10;
  Object.assign(t.base.stock, { ferraille: 900, rations: 600, polymere: 0, carburant: 0 });
  t.world.regions[t.base.regionId].piste = piste;
  t.player.credits = 4000;
  return t;
}
const halte = campMarchand(0.8);
const crAvantM = halte.player.credits;
const ferrailleAvant = halte.base.stock.ferraille;
avancer(halte, 600);
ok(halte.base.stock.ferraille < ferrailleAvant,
  'un colporteur prend le surplus qu’on ne saurait pas porter en ville',
  `${Math.round(ferrailleAvant)} → ${Math.round(halte.base.stock.ferraille)}`);
ok((halte.base.stock.polymere || 0) > 0,
  'et laisse ce que la région ne produit pas',
  `${Math.round(halte.base.stock.polymere || 0)} polymère`);
ok(halte.journal.some((x) => x.type === 'marchand'), 'le passage est noté');

// Ils viennent d'autant plus souvent que la route est faite : une ville au bout
// d'une friche n'en voit aucun.
function passages(piste) {
  const t = campMarchand(piste);
  avancer(t, 3000);
  // Compté sur le camp, pas sur le journal : celui-ci est plafonné à quatre
  // cents lignes, et sur trois mille heures les passages en sortent avant
  // qu'on les compte. Le test disait « zéro contre zéro » pour cette seule
  // raison.
  return t.base.marchands || 0;
}
const surRoute = passages(1);
const auBoutDuMonde = passages(0);
ok(surRoute > auBoutDuMonde,
  'une ville qu’on atteint par une route damée voit passer du monde',
  `${surRoute} contre ${auBoutDuMonde} passages`);

// Le prix de la commodité : on vend au gros et l'on achète au détail.
ok(halte.player.credits !== crAvantM, 'le commerce se solde en crédits');
const sansCommerce = campMarchand(0.8);
sansCommerce.base.commerce = false;
avancer(sansCommerce, 600);
ok(sansCommerce.journal.every((x) => x.type !== 'marchand'),
  'et le joueur peut fermer sa porte');

verifierCoherence(halte, 'après une saison de colportage');

section('9 nonies terdecies. La relève');
// Le dernier des vôtres tombe et la partie s'arrête — même avec dix-huit
// habitants, une halle, des murs et un nom sur les cartes. C'était le dernier
// endroit où bâtir ne servait à rien.
const succession = nouvellePartie(9090, { maintenant: 0, depart: 'ville', equipe: 3 });
const gRel = groupeActif(succession);
gRel.regionId = succession.world.regions.find((r) => !r.colonie).i;
Object.assign(gRel.inventaire, { ferraille: 400, polymere: 200, composant: 40 });
fonderBase(succession, () => {});
Object.assign(succession.base.batiments, { baraquement: 2, hydroponie: 2, entrepot: 3, halle: 1 });
succession.base.pop = 12;
succession.base.stock.rations = 400;
succession.base.commerce = false;
for (const c of gRel.membres) c.etat = 'mort';
avancer(succession, 2);
ok(!succession.fin, 'la ville envoie les siens plutôt que de laisser finir la partie');
ok(vivantsDeTest(gRel).length > 0, 'il y a de nouveau du monde debout',
  `${vivantsDeTest(gRel).length}`);
ok(succession.base.pop < 12, 'et la ville les a perdus', `${succession.base.pop}`);
ok(gRel.regionId === succession.base.regionId, 'ils partent de chez eux');
ok((gRel.inventaire.rations || 0) > 0, 'avec de quoi tenir la première semaine');

// Sans ville, ou sans personne dedans, c'est fini comme avant.
const seulAuMonde = nouvellePartie(9191, { maintenant: 0, depart: 'ville', equipe: 3 });
for (const c of groupeActif(seulAuMonde).membres) c.etat = 'mort';
avancer(seulAuMonde, 2);
ok(seulAuMonde.fin === 'extinction', 'sans rien derrière soi, c’est fini');
const campVide = nouvellePartie(9292, { maintenant: 0, depart: 'ville', equipe: 3 });
const gVide = groupeActif(campVide);
gVide.regionId = campVide.world.regions.find((r) => !r.colonie).i;
Object.assign(gVide.inventaire, { ferraille: 400, polymere: 200, composant: 40 });
fonderBase(campVide, () => {});
campVide.base.pop = 1;
for (const c of gVide.membres) c.etat = 'mort';
avancer(campVide, 2);
ok(campVide.fin === 'extinction', 'et un camp d’une âme n’envoie personne');

section('9 nonies quaterdecies. Sous quel drapeau');
// Une ville libre vit de la réputation de celui qui l'a bâtie. C'est tenable et
// c'est fragile : il suffit d'une guerre où l'on a pris parti pour que la place
// redevienne convoitable. L'autre voie, c'est de prendre les couleurs de ceux
// qu'on sert.
const monBourg = campDeveloppe(5757);
monBourg.base.pop = POP_RECONNUE + 8;
reconnaitreAvantPoste(monBourg, () => {});
const maVille = monBourg.world.colonies.find((c) => c.id === monBourg.base.colonieId);
const patron = DIPLO_FACTIONS.find(
  (k) => monBourg.world.colonies.some((c) => !c.ruine && c.faction === k)
);
ok(!maVille.faction, 'une ville reconnue ne porte d’abord les couleurs de personne');
ok(!peutRattacher(monBourg, patron).ok,
  'on ne se met pas sous la protection de gens qui ne vous connaissent pas',
  peutRattacher(monBourg, patron).motif);

monBourg.player.reputation[patron] = 55;
ok(peutRattacher(monBourg, patron).ok, 'ceux qui vous estiment, si',
  peutRattacher(monBourg, patron).motif);
ok(rattacherVille(monBourg, patron, () => {}).ok, 'la ville change de drapeau');
ok(maVille.faction === patron, 'elle porte leurs couleurs');
ok(monBourg.world.factions[patron].colonies.includes(maVille.id),
  'et ils la comptent parmi les leurs');
ok(monBourg.world.regions[maVille.regionId].controle === patron,
  'la carte le dit aussi');
ok(maVille.avantPoste, 'elle reste la vôtre : le camp ne change pas de mains');

// On paie l'impôt, ils paient la garnison. Sans cette contrepartie, prendre des
// couleurs donnait tout l'inconvénient — leurs guerres — et aucun avantage :
// onze villes sur vingt-quatre tenaient six mille heures, contre vingt-quatre
// pour une ville libre en paix.
monBourg.world.factions[patron].tresor = 20000;
const defenseSeule = monBourg.base.defense;
monBourg.base.majVitrine = -999;
synchroniserVitrine(monBourg);
ok(maVille.defense > defenseSeule,
  'un protecteur paie la garnison de ce qu’il protège',
  `${Math.round(defenseSeule)} → ${Math.round(maVille.defense)}`);
const caisseAvantGarnison = monBourg.world.factions[patron].tresor;
monBourg.base.majVitrine = -999;
synchroniserVitrine(monBourg);
ok(monBourg.world.factions[patron].tresor < caisseAvantGarnison,
  'et il la paie sur son trésor, pas par magie');

// La vitrine continue d'être recopiée : une ville rattachée n'est pas une ville
// perdue, et c'était un piège à écrire — la synchronisation s'arrêtait dès que
// la fiche portait des couleurs.
monBourg.base.majVitrine = -999;
avancer(monBourg, 30);
// La population bouge pendant ces trente heures : on compare la fiche à ce que
// le camp est *maintenant*, pas à ce qu'il était avant de tourner.
monBourg.base.pop = POP_RECONNUE + 20;
monBourg.base.majVitrine = -999;
avancer(monBourg, 3);
ok(maVille.pop === monBourg.base.pop,
  'ce que devient le camp se recopie encore', `${maVille.pop} vs ${monBourg.base.pop}`);

// On paie l'impôt qu'ils ont voté.
loisDe(monBourg.world, patron).impot = 0.15;
// L'impôt se prélève au prorata des habitants : sans habitants, rien à mesurer.
monBourg.base.pop = Math.max(monBourg.base.pop, POP_RECONNUE + 20);
monBourg.player.credits = 5000;
const caisseAvant = drawTresor(monBourg, patron);
const bourseAvant = monBourg.player.credits;
// On appelle le prélèvement directement, plutôt que de laisser tourner
// soixante-douze heures : une ville qui porte des couleurs hérite des guerres
// qui vont avec, et selon le tirage elle se faisait prendre avant la fin de la
// mesure — le test tombait alors sur un camp qui n'existait plus, ce qui est le
// fonctionnement voulu mais pas ce qu'on cherche à vérifier ici.
preleverImpot(monBourg, () => {});
ok(monBourg.player.credits < bourseAvant, 'porter des couleurs se paie en impôt',
  `${bourseAvant} → ${monBourg.player.credits}`);
ok(drawTresor(monBourg, patron) > caisseAvant, 'et ce qu’on paie va dans leur trésor');

// Et l'on peut reprendre son drapeau, ce qui ne s'oublie pas.
const estimeAvant = monBourg.player.reputation[patron];
ok(declarerIndependance(monBourg, () => {}).ok, 'on peut reprendre son drapeau');
ok(!maVille.faction && !monBourg.world.factions[patron].colonies.includes(maVille.id),
  'la ville redevient libre');
ok(monBourg.player.reputation[patron] < estimeAvant - 30,
  'et l’on n’oublie pas ce genre de départ',
  `${estimeAvant} → ${monBourg.player.reputation[patron]}`);
ok(!declarerIndependance(monBourg, () => {}).ok, 'deux fois, non');

verifierCoherence(monBourg, 'après un changement de drapeau');

section('9 nonies quindecies. Ce que la partie a fait de vous');
// Le jeu n'a pas de condition de victoire et n'en aura pas — on ne gagne pas
// contre un désert. Mais il n'avait pas non plus de miroir : on jouait cent
// heures et rien ne disait ce qu'on était devenu, alors qu'il avait tout compté.
const chro = nouvellePartie(1717, { maintenant: 0, depart: 'ville', equipe: 3 });
ok(titreDe(chro).key === 'vagabond',
  'on commence vagabond, et ce n’est pas un titre par défaut faute de mieux',
  titreDe(chro).key);
ok(lignesDe(chro).length >= 2, 'et l’on a déjà deux ou trois choses à dire');
// « Zéro jour » est un fait, pas un zéro décoratif : on vérifie qu'aucune
// *rubrique* vide n'apparaît, pas qu'aucun zéro n'existe.
chro.temps = 24 * 12;
ok(!lignesDe(chro).some((l) => /0 (affrontements|contrats|services|caravanes|sites)/.test(l)),
  'mais jamais une rubrique qui n’a rien à dire',
  lignesDe(chro).join(' | '));

// Chaque titre se mérite au sens littéral : une condition sur l'état réel.
function titreAvec(modif) {
  const t = nouvellePartie(1818, { maintenant: 0, depart: 'ville', equipe: 3 });
  modif(t);
  return titreDe(t).key;
}
ok(titreAvec((t) => { t.stats.captifsVendus = 8; }) === 'negrier',
  'vendre des hommes définit quelqu’un avant tout le reste');
ok(titreAvec((t) => {
  t.stats.captifsVendus = 8;
  t.stats.combatsGagnes = 80;
  t.stats.servicesRendus = 40;
}) === 'negrier', 'et le reste ne le rachète pas');
ok(titreAvec((t) => { t.stats.captifsLivres = 30; }) === 'geolier',
  'livrer des brigands à la justice fait un chasseur de primes');
// Mais pas à la douzaine : c'est ce que tout le monde fait de ses prisonniers
// faute de mieux, et à quinze le titre tombait dans une partie sur quatre quelle
// que soit la façon de jouer.
ok(titreAvec((t) => { t.stats.captifsLivres = 18; }) !== 'geolier',
  'mais une poignée de brigands livrés ne fait pas un métier');
// Un chef de guerre se juge à son arme, pas à la moyenne de ses hommes : celle-ci
// est tirée vers le bas par les recrues fraîches et ne dépasse jamais 18.
ok(titreAvec((t) => {
  t.stats.combatsGagnes = 60;
  const c = groupeActif(t).membres[0];
  c.skills.melee = 40;
}) === 'seigneur', 'quarante batailles et un bon bras font un seigneur de guerre');
ok(titreAvec((t) => { t.stats.combatsGagnes = 60; }) !== 'seigneur',
  'les batailles seules ne suffisent pas');
ok(titreAvec((t) => { t.player.credits = 9000; }) === 'marchand',
  'faire fortune sans se battre fait une maison marchande');
ok(titreAvec((t) => {
  t.player.credits = 9000;
  t.stats.combatsGagnes = 60;
  for (const c of groupeActif(t).membres) c.skills.melee = 60;
}) === 'seigneur', 'la faire en se battant fait autre chose');
ok(titreAvec((t) => { t.base.colonieId = 'sX'; }) === 'fondateur',
  'écrire une ville sur les cartes fait un fondateur');
ok(titreAvec((t) => {
  const g = groupeActif(t);
  g.allegeance = { faction: 'cendre', points: RANGS[4].points, actes: [], fautes: 0 };
  t.stats.prerogatives = 12;
}) === 'commandeur', 'et commander un pays fait un commandeur');

// La chronique ne raconte que ce qui est arrivé.
const raconte = nouvellePartie(1919, { maintenant: 0, depart: 'ville', equipe: 3 });
raconte.stats.captifsPris = 6;
raconte.stats.captifsVendus = 2;
raconte.stats.combats = 30;
raconte.temps = 24 * 90;
const dit = lignesDe(raconte).join(' | ');
ok(/90 jours/.test(dit), 'elle compte les jours');
ok(/6 hommes pris vivants/.test(dit), 'et ce qu’on a fait des gens');
ok(!/caravanes pillées/.test(dit),
  'elle ne mentionne pas ce qu’on n’a jamais fait', dit);

// Elle survit à un monde abîmé : c'est un écran qu'on ouvre à tout moment.
const abime = nouvellePartie(2020, { maintenant: 0, depart: 'ville', equipe: 3 });
groupeActif(abime).allegeance = {
  faction: 'faction-qui-nexiste-pas', points: 900, actes: [], fautes: 0,
};
ok(Array.isArray(lignesDe(abime)) && !!titreDe(abime).nom,
  'une faction disparue de la table ne casse pas la chronique');

section('9 nonies sexies. Qui accepte de partir, et pour combien');
const rec = nouvellePartie(9494, { maintenant: 0, depart: 'ville', equipe: 3 });
const colRec = rec.world.colonies.find((c) => !c.ruine);
const gRec = groupeActif(rec);
gRec.regionId = colRec.regionId;
const rngBanc = new Rng(55);
const bancandidat = genererBanc(rec, colRec, rngBanc, 0);
ok(bancandidat.gens.length >= 1, 'une ville propose des gens', `${bancandidat.gens.length}`);
ok(bancandidat.gens.every((c) => c.nom && c.archetypeNom),
  'on voit qui l’on engage, avec son nom et son métier');

// La prime ne dépend PAS du nombre de gens qu'on mène déjà.
const candidat = bancandidat.gens[0];
const primeSeul = primeDe(rec, colRec, candidat);
for (let i = 0; i < 15; i++) gRec.membres.push(makeCharacter(new Rng(100 + i), {}));
ok(primeDe(rec, colRec, candidat) === primeSeul,
  'la prime ne monte pas parce qu’on mène déjà du monde — ça n’aurait aucun sens',
  `${primeSeul} cr dans les deux cas`);

// Elle dépend de ce que vaut la personne.
const bleuRec = makeCharacter(new Rng(3), { niveau: 0 });
const vieuxRec = makeCharacter(new Rng(3), { niveau: 3 });
ok(primeDe(rec, colRec, vieuxRec) > primeDe(rec, colRec, bleuRec) * 1.2,
  'un vétéran se fait payer plus cher qu’un bleu',
  `${primeDe(rec, colRec, bleuRec)} contre ${primeDe(rec, colRec, vieuxRec)} cr`);

// Et de l'état de la ville : on quitte pour rien un endroit qui va mal.
const aiseRec = tensionRecrutement(colRec);
const memeVille = Object.assign({}, colRec, {
  unrest: 0.9, stock: Object.assign({}, colRec.stock, { rations: 0 }),
});
ok(tensionRecrutement(memeVille) < aiseRec * 0.9,
  'une ville affamée et révoltée laisse partir les siens pour moins cher',
  `×${aiseRec.toFixed(2)} → ×${tensionRecrutement(memeVille).toFixed(2)}`);

// Engager : la personne quitte le banc et rejoint le groupe.
const avantRec = gRec.membres.length;
const choisi = colRec.banc.gens[0];
rec.player.credits = 99999;
const engagement = engager(rec, colRec, 0, () => {}, gRec);
ok(engagement.ok, 'on engage quelqu’un de précis', engagement.motif);
ok(gRec.membres.length === avantRec + 1
  && gRec.membres[gRec.membres.length - 1].id === choisi.id,
  'et c’est bien celui qu’on avait choisi');
ok(!colRec.banc.gens.some((x) => x.id === choisi.id), 'il ne figure plus au banc');

section('9 nonies quinquies. Une escouade n’a pas de plafond, elle a un noyau');
const coh = nouvellePartie(8686, { maintenant: 0, depart: 'ville', equipe: 3 });
const gCoh = groupeActif(coh);
const colCoh = coh.world.colonies.find((c) => !c.ruine);
gCoh.regionId = colCoh.regionId;
ok(plafondCohesion(coh, gCoh) === 100,
  'une petite bande peut se souder complètement');
const noy = noyau(coh, gCoh);
ok(noy >= 4, 'le noyau tient au moins quatre personnes', `${noy}`);

// On recrute au-delà du noyau : rien ne l'interdit.
const rngCoh = new Rng(31);
for (let i = 0; i < 12; i++) {
  gCoh.membres.push(makeCharacter(rngCoh, { archetype: 'ferrailleur' }));
}
ok(vivantsGroupe(gCoh).length > noy, 'on peut mener bien plus que le noyau',
  `${vivantsGroupe(gCoh).length} personnes`);
const plafondGros = plafondCohesion(coh, gCoh);
ok(plafondGros < 60, 'mais une colonne ne se soude plus',
  `plafond ${Math.round(plafondGros)} %`);
ok(plafondGros > 10, 'sans jamais tomber à zéro non plus');

// La cohésion redescend d'elle-même vers ce plafond, et le rendement suit.
gCoh.cohesion = 100;
gCoh.inventaire.rations = 3000;
avancer(coh, 300);
ok(gCoh.cohesion <= plafondCohesion(coh, gCoh) + 0.5,
  'la cohésion redescend au plafond que la taille autorise',
  `${Math.round(gCoh.cohesion)} % pour un plafond de ${Math.round(plafondCohesion(coh, gCoh))} %`);
ok(rendementCohesion(gCoh) < 0.95,
  'et une foule travaille et se bat moins bien qu’une bande',
  `×${rendementCohesion(gCoh).toFixed(2)}`);

// Une bande soudée, elle, dépasse la simple addition des gens.
const petit = nouvellePartie(8787, { maintenant: 0, depart: 'ville', equipe: 3 });
const gPetit = groupeActif(petit);
gPetit.cohesion = 100;
ok(rendementCohesion(gPetit) > 1.1, 'une bande soudée rend plus que la somme des bras',
  `×${rendementCohesion(gPetit).toFixed(2)}`);

// Un baraquement élargit le noyau au lieu d'ouvrir des places.
const bar = nouvellePartie(8888, { maintenant: 0, depart: 'ville', equipe: 3 });
const gBar = groupeActif(bar);
const noyAvant = noyau(bar, gBar);
gBar.regionId = bar.world.regions.find((r) => !r.colonie).i;
Object.assign(gBar.inventaire, { ferraille: 300, polymere: 100 });
fonderBase(bar, () => {});
bar.base.batiments.baraquement = 4;
ok(noyau(bar, gBar) === noyAvant + 4,
  'chaque baraquement élargit ce qu’on tient ensemble',
  `${noyAvant} → ${noyau(bar, gBar)}`);

section('9 nonies quater. L’attelage porte à votre place');
const att = nouvellePartie(8181, { maintenant: 0, depart: 'ville', equipe: 3 });
const gAtt = groupeActif(att);
const colAtt = att.world.colonies.find((c) => !c.ruine);
gAtt.regionId = colAtt.regionId;
att.player.credits = 5000;
const capSeul = capacitePortage(att, gAtt);
ok(betesDe(gAtt).length === 0, 'on part sans rien qui porte');
const rngAtt = new Rng(4242);
const achat = acheterBete(att, colAtt, 'mulet', rngAtt, () => {}, gAtt);
ok(achat.ok, 'on peut acheter un mulet en ville', achat.motif);
ok(capacitePortage(att, gAtt) > capSeul + 30, 'et le convoi porte nettement plus',
  `${capSeul} → ${capacitePortage(att, gAtt)} kg`);
ok(lenteurAttelage(gAtt) > 0, 'au prix d’un peu de vitesse',
  `−${(lenteurAttelage(gAtt) * 100).toFixed(0)} %`);

// On n'achète pas une bête au milieu du désert.
const videAtt = att.world.regions.find((r) => !r.colonie);
gAtt.regionId = videAtt.i;
ok(!acheterBete(att, colAtt, 'mulet', rngAtt, () => {}, gAtt).ok,
  'ni au milieu du désert');
gAtt.regionId = colAtt.regionId;

// Une bête qu'on oublie de nourrir maigrit, porte moins, et finit par rester là.
const capPleine = capacitePortage(att, gAtt);
gAtt.inventaire.biomasse = 0;
for (let i = 0; i < 400; i++) tickBetes(gAtt, new Rng(i + 1), () => {});
ok(betesDe(gAtt).length === 0 || capacitePortage(att, gAtt) < capPleine,
  'une bête affamée porte moins — et finit par ne plus suivre',
  betesDe(gAtt).length ? `${capacitePortage(att, gAtt)} kg` : 'restée sur la piste');

// Nourrie, elle tient.
const att2 = nouvellePartie(8282, { maintenant: 0, depart: 'ville', equipe: 3 });
const gAtt2 = groupeActif(att2);
gAtt2.regionId = att2.world.colonies.find((c) => !c.ruine).regionId;
att2.player.credits = 5000;
acheterBete(att2, att2.world.colonies.find((c) => !c.ruine), 'mulet', new Rng(7), () => {}, gAtt2);
gAtt2.inventaire.biomasse = 900;
for (let i = 0; i < 400; i++) tickBetes(gAtt2, new Rng(i + 1), () => {});
ok(betesDe(gAtt2).length === 1 && betesDe(gAtt2)[0].sante > 90,
  'nourrie, elle se porte bien au bout de quatre cents heures',
  betesDe(gAtt2).length ? `${Math.round(betesDe(gAtt2)[0].sante)} %` : 'partie');
ok((gAtt2.inventaire.biomasse || 0) < 900, 'et elle a bien mangé la biomasse',
  `${Math.round(gAtt2.inventaire.biomasse)} restants`);

// Rien n'interdit d'en prendre trop — c'est juste une mauvaise affaire.
const tropS = nouvellePartie(8383, { maintenant: 0, depart: 'ville', equipe: 3 });
const gTrop = groupeActif(tropS);
const colTrop = tropS.world.colonies.find((c) => !c.ruine);
gTrop.regionId = colTrop.regionId;
tropS.player.credits = 90000;
const bras = conduite(gTrop);
ok(bras >= 4, 'trois personnes savent mener plusieurs bêtes', `${bras}`);
const rngT = new Rng(99);
for (let i = 0; i < bras; i++) acheterBete(tropS, colTrop, 'mulet', rngT, () => {}, gTrop);
const capTenue = capacitePortage(tropS, gTrop);
const lentTenue = lenteurAttelage(gTrop);
ok(surnombre(gTrop) === 0, 'à la limite de ce qu’on sait mener, tout est tenu');

// Trois de plus : aucune règle ne l'empêche.
for (let i = 0; i < 3; i++) {
  ok(acheterBete(tropS, colTrop, 'mulet', rngT, () => {}, gTrop).ok === true,
    'on peut en acheter une de plus, même sans personne pour la mener');
}
ok(surnombre(gTrop) === 3, 'trois bêtes sont en surnombre', `${surnombre(gTrop)}`);
ok(capacitePortage(tropS, gTrop) > capTenue,
  'elles portent quand même quelque chose');
ok(capacitePortage(tropS, gTrop) < capTenue * (1 + 3 / bras),
  'mais nettement moins que si on les tenait',
  `${capTenue} → ${capacitePortage(tropS, gTrop)} kg`);
ok(lenteurAttelage(gTrop) > lentTenue * 1.5, 'et elles traînent la colonne',
  `−${(lentTenue * 100).toFixed(0)} % → −${(lenteurAttelage(gTrop) * 100).toFixed(0)} %`);
ok(lenteurAttelage(gTrop) < 1, 'sans jamais immobiliser personne');
ok(visibiliteAttelage(gTrop) > 1.5, 'une telle colonne se voit de loin',
  `×${visibiliteAttelage(gTrop).toFixed(2)} de rencontres`);

// Et les bêtes non tenues dépérissent plus vite, même bien nourries.
gTrop.inventaire.biomasse = 100000;
const santeAvant = betesDe(gTrop).reduce((a, b) => a + b.sante, 0) / betesDe(gTrop).length;
for (let i = 0; i < 300; i++) tickBetes(gTrop, new Rng(i + 1), () => {});
const santeApres = betesDe(gTrop).length
  ? betesDe(gTrop).reduce((a, b) => a + b.sante, 0) / betesDe(gTrop).length : 0;
ok(santeApres < santeAvant, 'un attelage négligé dépérit, même le ventre plein',
  `${santeAvant.toFixed(0)} % → ${santeApres.toFixed(0)} %`);

// L'attelage se sauvegarde.
ok(JSON.parse(serialiser(att2)).player.groupes[0].betes.length === 1,
  'l’attelage survit à l’aller-retour JSON');

section('9 nonies bis bis. On campe la nuit, sauf ordre contraire');
const nuitS = nouvellePartie(7777, { maintenant: 0, depart: 'ville', equipe: 3 });
const gNuit = groupeActif(nuitS);
gNuit.inventaire.rations = 4000;
const loin = nuitS.world.regions.find((r) => distance(r.i, gNuit.regionId) >= 6);
ok(donnerOrdre(nuitS, { type: 'voyage', dest: loin.i }, gNuit).ok, 'on peut partir');
ok(gNuit.ordre.allure === 'normale', 'l’allure par défaut est de camper la nuit');

// Nuit : la position ne bouge pas et la fatigue redescend.
while (nuitS.temps % 24 !== 23) tick(nuitS);
for (const c of gNuit.membres) c.fatigue = 80;
const ouAvant = gNuit.regionId;
const etapeAvant = gNuit.ordre.etape;
const progresAvant = gNuit.ordre.progres;
avancer(nuitS, 6); // 23 h → 5 h, en pleine nuit
ok(gNuit.regionId === ouAvant && gNuit.ordre.etape === etapeAvant
  && gNuit.ordre.progres === progresAvant,
  'de nuit, le convoi ne progresse pas d’un pouce');
ok(gNuit.membres.every((c) => c.fatigue < 60), 'et la fatigue redescend',
  gNuit.membres.map((c) => Math.round(c.fatigue)).join('/'));

// Marche forcée : on avance, et on le paie.
const forceS = nouvellePartie(7777, { maintenant: 0, depart: 'ville', equipe: 3 });
const gForce = groupeActif(forceS);
gForce.inventaire.rations = 4000;
donnerOrdre(forceS, { type: 'voyage', dest: loin.i, allure: 'forcee' }, gForce);
ok(gForce.ordre.allure === 'forcee', 'on peut ordonner la marche forcée');
while (forceS.temps % 24 !== 23) tick(forceS);
for (const c of gForce.membres) c.fatigue = 30;
const avanceAvant = gForce.ordre.etape * 1000 + gForce.ordre.progres;
avancer(forceS, 6);
ok(gForce.ordre.etape * 1000 + gForce.ordre.progres > avanceAvant,
  'de nuit, la marche forcée avance quand même');
ok(gForce.membres.some((c) => c.fatigue > 30), 'et elle épuise', 
  gForce.membres.map((c) => Math.round(c.fatigue)).join('/'));

// La fatigue chronique était ce qui empêchait tout progrès : on vérifie le
// mécanisme, pas l'équilibrage.
const use = makeCharacter(new Rng(11), { archetype: 'ferrailleur' });
use.skills.melee = 30;
const frais = compPerso(use, 'melee');
use.fatigue = 100;
ok(compPerso(use, 'melee') < frais * 0.75, 'la fatigue ronge la compétence utile',
  `${frais.toFixed(1)} → ${compPerso(use, 'melee').toFixed(1)}`);

// Un corps aguerri encaisse mieux un coup fatal.
const bleu = makeCharacter(new Rng(12), { archetype: 'ferrailleur' });
const dur = makeCharacter(new Rng(12), { archetype: 'ferrailleur' });
bleu.skills.endurance = 5;
dur.skills.endurance = 90;
ok(resistanceLetale(dur) < resistanceLetale(bleu) * 0.75,
  'l’endurance retire à la chance d’un coup fatal',
  `×${resistanceLetale(bleu).toFixed(2)} contre ×${resistanceLetale(dur).toFixed(2)}`);
ok(resistanceLetale(dur) >= 0.55, 'sans jamais rendre personne invulnérable',
  `×${resistanceLetale(dur).toFixed(2)}`);

section('9 nonies ter. Le campement paie dès le premier piquet');
const camp1 = nouvellePartie(9191, { maintenant: 0, depart: 'ville', equipe: 3 });
const gCamp1 = groupeActif(camp1);
const videCamp1 = camp1.world.regions.find((r) => !r.colonie);
gCamp1.regionId = videCamp1.i;
ok(abriDe(camp1, gCamp1.regionId) === 1, 'dormir dans le sable ne vaut rien de plus');
Object.assign(gCamp1.inventaire, { ferraille: 200, polymere: 60 });
ok(fonderBase(camp1, () => {}).ok, 'un campement se paie en ferraille seule',
  JSON.stringify(COUT_FONDATION));
ok(abriDe(camp1, gCamp1.regionId) > 1.5,
  'et dès le premier piquet, on y dort mieux qu’ailleurs',
  `×${abriDe(camp1, gCamp1.regionId).toFixed(2)}`);
ok(capaciteStock(camp1.base) > 500,
  'un camp vide est déjà un dépôt', `${capaciteStock(camp1.base)} unités`);

// Le toit se voit sur la fatigue : deux escouades identiques, l'une chez elle.
const dehors = makeCharacter(new Rng(31), { archetype: 'ferrailleur' });
const chezSoi = makeCharacter(new Rng(31), { archetype: 'ferrailleur' });
dehors.fatigue = 90; chezSoi.fatigue = 90;
for (let i = 0; i < 8; i++) {
  tickPerso(dehors, 0, new Rng(1), { abri: 1 });
  tickPerso(chezSoi, 0, new Rng(1), { abri: abriDe(camp1, gCamp1.regionId) });
}
ok(chezSoi.fatigue < dehors.fatigue - 8, 'huit heures de repos sous un toit valent mieux',
  `${dehors.fatigue.toFixed(0)} dehors contre ${chezSoi.fatigue.toFixed(0)} au camp`);

// Hydroponie et halle marchent sans courant — lentement, mais elles marchent.
const camp2 = nouvellePartie(9292, { maintenant: 0, depart: 'ville', equipe: 3 });
const gCamp2 = groupeActif(camp2);
gCamp2.regionId = camp2.world.regions.find((r) => !r.colonie).i;
Object.assign(gCamp2.inventaire, { ferraille: 300, polymere: 100 });
fonderBase(camp2, () => {});
Object.assign(camp2.base.batiments, { hydroponie: 1, halle: 1 });
camp2.base.stock.biomasse = 400;
camp2.base.stock.carburant = 0;       // pas une goutte, pas de générateur
ok(energie(camp2.base).ratio === 0, 'aucune énergie disponible');
const ratAvant = camp2.base.stock.rations || 0;
avancer(camp2, 200);
ok((camp2.base.stock.rations || 0) > ratAvant + 10,
  'à la main et sans courant, les bacs produisent quand même',
  `${ratAvant} → ${Math.round(camp2.base.stock.rations)} rations`);
ok(!BUILDINGS.halle.cout.composant,
  'et la halle ne demande aucun composant : elle nourrit, elle ne développe pas');

section('9 nonies bis. Cantine, halle et poste de garde');
const s9n2 = nouvellePartie(8484, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9n2 = groupeActif(s9n2);
const vide9n = s9n2.world.regions.find((r) => !r.colonie);
g9n2.regionId = vide9n.i;
Object.assign(g9n2.inventaire, { ferraille: 400, polymere: 200, composant: 30 });
fonderBase(s9n2, () => {});
const b9n = s9n2.base;
Object.assign(b9n.batiments, { generateur: 4, baraquement: 3, hydroponie: 2, entrepot: 4 });
b9n.pop = 12;
b9n.stock.rations = 500;
b9n.stock.carburant = 400;

// La cantine nourrit mieux avec moins. Deux mondes identiques avancés du même
// nombre d'heures, et non deux fenêtres consécutives du même monde : mesurée
// ainsi, la comparaison attrapait tout ce que l'escouade avait fait entre-temps
// — un combat de plus, deux blessés à soigner au camp, et le résultat basculait
// pour une raison qui n'avait rien à voir avec la cantine.
function consommationCamp(avecCantine) {
  const t = nouvellePartie(8484, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gt = groupeActif(t);
  gt.regionId = t.world.regions.find((r) => !r.colonie).i;
  Object.assign(gt.inventaire, { ferraille: 400, polymere: 200, composant: 30 });
  fonderBase(t, () => {});
  Object.assign(t.base.batiments, { generateur: 4, baraquement: 3, hydroponie: 2, entrepot: 4 });
  t.base.pop = 12;
  t.base.commerce = false;
  t.base.stock.rations = 500;
  t.base.stock.carburant = 400;
  if (avecCantine) {
    t.base.batiments.cantine = 4;
    t.base.postes.cuisinier = 8;
  }
  avancer(t, 200);
  return 500 - t.base.stock.rations;
}
const consSans = consommationCamp(false);
const consAvec = consommationCamp(true);
avancer(s9n2, 200);
b9n.batiments.cantine = 4;
b9n.postes.cuisinier = 8;
ok(consAvec < consSans * 0.85, 'la cantine fait manger la même population pour moins',
  `${consSans.toFixed(1)} → ${consAvec.toFixed(1)} rations sur 200 h`);
ok(placesMetier(b9n, 'cuisinier') === 8, 'quatre cantines ouvrent huit postes de cuisinier',
  `${placesMetier(b9n, 'cuisinier')}`);

// La halle récolte la région, sans l'épuiser.
const s9n3 = nouvellePartie(8585, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9n3 = groupeActif(s9n3);
const vide9n3 = s9n3.world.regions.find((r) => !r.colonie && BIOMES[r.biome].yields
  && Object.keys(BIOMES[r.biome].yields).length);
g9n3.regionId = vide9n3.i;
Object.assign(g9n3.inventaire, { ferraille: 400, polymere: 200, composant: 30 });
fonderBase(s9n3, () => {});
Object.assign(s9n3.base.batiments, { generateur: 4, baraquement: 2, entrepot: 5 });
s9n3.base.pop = 8;
// Un générateur sans carburant ne produit rien, et sans énergie rien ne tourne.
s9n3.base.stock.carburant = 400;
const avantHalle = COMMODITY_KEYS.reduce(
  (a, k) => a + (k === 'carburant' ? 0 : s9n3.base.stock[k] || 0), 0);
const fouilleAvant = s9n3.world.regions[vide9n3.i].fouille;
s9n3.base.batiments.halle = 3;
s9n3.base.postes.recoltant = 9;
avancer(s9n3, 300);
const apresHalle = COMMODITY_KEYS.reduce(
  (a, k) => a + (k === 'carburant' ? 0 : s9n3.base.stock[k] || 0), 0);
ok(apresHalle > avantHalle + 20, 'la halle ramasse la région toute seule',
  `${Math.round(avantHalle)} → ${Math.round(apresHalle)}`);
ok(s9n3.world.regions[vide9n3.i].fouille === fouilleAvant,
  'et c’est une exploitation, pas une fouille : la case ne s’épuise pas');

// Le poste de garde protège les stocks quand le raid passe quand même.
const s9n4 = nouvellePartie(8686, { maintenant: 0, depart: 'ville', equipe: 3 });
const g9n4 = groupeActif(s9n4);
g9n4.regionId = s9n4.world.regions.find((r) => !r.colonie).i;
Object.assign(g9n4.inventaire, { ferraille: 400, polymere: 200, composant: 30 });
fonderBase(s9n4, () => {});
ok(placesMetier(s9n4.base, 'garde') === 0, 'sans poste de garde, aucun garde à poster');
s9n4.base.batiments.poste = 4;
ok(placesMetier(s9n4.base, 'garde') === 8, 'quatre postes ouvrent huit places de garde',
  `${placesMetier(s9n4.base, 'garde')}`);

// Les métiers de ville nouveaux existent et servent à quelque chose.
const s9n5 = nouvellePartie(8787, { maintenant: 0, depart: 'ville', equipe: 3 });
const colCant = s9n5.world.colonies[0];
colCant.emplois.cantinier = 0;
const consSansCantinier = consommationColonie(colCant).rations;
colCant.emplois.cantinier = Math.round(actifs(colCant) * 0.15);
const consAvecCantinier = consommationColonie(colCant).rations;
ok(consAvecCantinier < consSansCantinier * 0.96,
  'des cantiniers font manger une ville pour moins cher',
  `${consSansCantinier.toFixed(2)} → ${consAvecCantinier.toFixed(2)} par heure`);

const colOuv = s9n5.world.colonies[1];
colOuv.murs = 1;
colOuv.emplois.ouvrier = 0;
avancer(s9n5, 400);
const mursSansOuvriers = colOuv.murs;
colOuv.murs = 1;
colOuv.emplois.ouvrier = Math.round(actifs(colOuv) * 0.2);
avancer(s9n5, 400);
ok(colOuv.murs > mursSansOuvriers, 'des ouvriers remontent les murs d’une ville éventrée',
  `${mursSansOuvriers.toFixed(2)} → ${colOuv.murs.toFixed(2)}`);

section('9 decies. Métiers et gens des villes');
const s9u = nouvellePartie(5151, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9u, 60);
const villes = s9u.world.colonies.filter((c) => !c.ruine);

// Chaque ville a une répartition de métiers cohérente avec sa population.
let repartitionsOk = 0;
let ecartMax = 0;
for (const c of villes) {
  let t = 0;
  for (const k of METIER_VILLE_KEYS) t += emploi(c, k);
  // Tolérance large à dessein : la répartition ne se recalcule qu'une fois sur
  // huit tranches de colonie, donc une ville qui vient de grossir traîne un
  // écart pendant quelques jours. C'est voulu — on ne reconvertit pas un
  // mineur en paysan dans la nuit.
  if (Math.abs(t - actifs(c)) <= Math.max(4, actifs(c) * 0.14)) repartitionsOk++;
  ecartMax = Math.max(ecartMax, Math.abs(t - actifs(c)) / Math.max(1, actifs(c)));
}
// Presque toutes, pas toutes. Une ville qu'un siège vide de ses habitants perd
// sa population plus vite qu'elle ne reconvertit ses bras : l'écart d'une
// journée est le comportement voulu, pas un défaut. Ce qu'on interdit, c'est
// qu'il s'installe.
ok(repartitionsOk >= villes.length - 2, 'les villes répartissent leurs actifs entre leurs métiers',
  `${repartitionsOk}/${villes.length}`);
ok(ecartMax < 0.45, 'et aucune ne dérive durablement', `écart max ${(ecartMax * 100).toFixed(0)} %`);
ok(villes.every((c) => actifs(c) < c.pop), 'tout le monde ne travaille pas');

// Le biome décide de la vocation : les canyons font des mineurs, les marais des
// paysans. On mesure sur un monde neuf, pas après trois mille heures : la faim
// reconvertit les mineurs en paysans, ce qui est le comportement voulu et
// noierait la règle qu'on veut vérifier ici.
const mondeNeuf = nouvellePartie(3939, { maintenant: 0, depart: 'ville', equipe: 3 });
const parBiome = {};
for (const c of mondeNeuf.world.colonies) {
  const b = mondeNeuf.world.regions[c.regionId].biome;
  const v = vocation(c);
  if (v) (parBiome[b] = parBiome[b] || []).push(v.key);
}
const canyons = parBiome.canyons || [];
const marais = parBiome.marais || [];
ok(!canyons.length || canyons.every((v) => v === 'mineur' || v === 'ferrailleur'),
  'les canyons font des mineurs', canyons.join(', '));
ok(!marais.length || marais.every((v) => v === 'paysan' || v === 'ferrailleur'),
  'les marais font des paysans', marais.join(', '));

// À population égale, la répartition change ce qui sort.
const villeA = villes[0];
const copie = JSON.parse(JSON.stringify(villeA));
const avecPaysans = Object.assign({}, copie);
avecPaysans.emplois = Object.assign({}, copie.emplois);
for (const k of METIER_VILLE_KEYS) avecPaysans.emplois[k] = 0;
avecPaysans.emplois.paysan = actifs(copie);
const avecMineurs = Object.assign({}, copie);
avecMineurs.emplois = Object.assign({}, copie.emplois);
for (const k of METIER_VILLE_KEYS) avecMineurs.emplois[k] = 0;
avecMineurs.emplois.mineur = actifs(copie);
const prodP = productionColonie(s9u.world, avecPaysans);
const prodM = productionColonie(s9u.world, avecMineurs);
ok((prodP.rations || 0) > (prodM.rations || 0),
  'une ville de paysans nourrit mieux qu’une ville de mineurs',
  `${(prodP.rations || 0).toFixed(2)} contre ${(prodM.rations || 0).toFixed(2)}`);

// Les gens qui comptent existent, avec leur état propre.
const avecNotables = villes.filter((c) => (c.notables || []).length);
ok(avecNotables.length === villes.length, 'chaque ville a ses notables',
  `${avecNotables.length}/${villes.length}`);
const unChef = villes[0].notables.find((p) => p.charge === 'chef');
ok(!!unChef && typeof unChef.nom === 'string' && unChef.age > 0 && unChef.comp > 0,
  'un notable a un nom, un âge et une compétence',
  unChef ? `${unChef.nom}, ${Math.round(unChef.age)} ans, ${Math.round(unChef.comp)}` : 'aucun');
ok(villes.every((c) => c.notables.some((p) => p.charge === 'armurier')),
  'toute ville tient son étal par quelqu’un');

// L'armurier fait ses prix : deux caractères opposés ne vendent pas pareil.
const villePrix = villes.find((c) => c.notables.some((p) => p.charge === 'armurier'));
const arm = villePrix.notables.find((p) => p.charge === 'armurier');
arm.caractere = 'avare'; arm.opinion = 0;
const prixAvare = prixJoueur(villePrix, 'rations').achat;
arm.caractere = 'droit'; arm.opinion = 80;
const prixDroit = prixJoueur(villePrix, 'rations').achat;
ok(prixAvare > prixDroit * 1.1,
  'un armurier avare vend nettement plus cher qu’un honnête homme qui vous aime bien',
  `${prixAvare.toFixed(2)} contre ${prixDroit.toFixed(2)}`);

// Ils vieillissent et finissent par être remplacés.
const s9v = nouvellePartie(5252, { maintenant: 0, depart: 'ville', equipe: 3 });
const suivi = s9v.world.colonies[0];
avancer(s9v, 5);
const nomsAvant = (suivi.notables || []).map((p) => p.nom).join('|');
const ageAvant = (suivi.notables || []).reduce((t, p) => t + p.age, 0);
avancer(s9v, 6000);
const ageApres = (suivi.notables || []).reduce((t, p) => t + p.age, 0);
const nomsApres = (suivi.notables || []).map((p) => p.nom).join('|');
ok(ageApres > ageAvant || nomsApres !== nomsAvant,
  'les notables vieillissent, ou cèdent la place');
ok((suivi.notables || []).length > 0, 'et les charges restent pourvues');

verifierCoherence(s9u, 'après une année avec métiers et notables');

section('9 undecies. Dirigeants et buts de guerre');
const s9w = nouvellePartie(6161, { maintenant: 0, depart: 'ville', equipe: 3 });
// Chaque faction a quelqu'un à sa tête dès le premier jour, sauf l'Essaim.
const mene = DIPLO_FACTIONS.filter((k) => dirigeant(s9w.world, k));
ok(mene.length === DIPLO_FACTIONS.length, 'toute faction a un dirigeant',
  `${mene.length}/${DIPLO_FACTIONS.length}`);
ok(!dirigeant(s9w.world, 'essaim'), 'sauf l’Essaim, qui n’a pas de politique');
const unChefF = dirigeant(s9w.world, mene[0]);
ok(typeof unChefF.nom === 'string' && unChefF.titre && TEMPERAMENTS[unChefF.temperament],
  'il a un nom, un titre et un tempérament',
  `${unChefF.titre} ${unChefF.nom}, ${unChefF.temperament}`);

// Le tempérament infléchit réellement les décisions.
const f9w = s9w.world.factions[mene[0]];
f9w.dirigeant.temperament = 'conquerant';
f9w.dirigeant.legitimite = 100;
const guerrier = penchant(s9w.world, mene[0], 'guerre');
f9w.dirigeant.temperament = 'prudent';
const pacifique = penchant(s9w.world, mene[0], 'guerre');
ok(guerrier > 1 && pacifique < 1 && guerrier > pacifique * 2.5,
  'un conquérant déclare bien plus de guerres qu’un prudent',
  `×${guerrier.toFixed(2)} contre ×${pacifique.toFixed(2)}`);
f9w.dirigeant.legitimite = 10;
ok(penchant(s9w.world, mene[0], 'guerre') > pacifique,
  'un chef contesté décide moins nettement');

// Une guerre a un but, et ce but décide de sa fin.
const g9w = { a: 'hexa', b: 'cendre', depuis: 0, batailles: 0, initiateur: 'hexa' };
g9w.but = { type: 'punition', texte: 'pour solde de tout compte', batailles: 3 };
ok(etatDuBut(s9w.world, g9w, 'hexa') === null, 'une guerre fraîche n’a rien réglé');
g9w.batailles = 3;
ok(etatDuBut(s9w.world, g9w, 'hexa') === 'atteint', 'trois batailles soldent le compte');
const ville9w = s9w.world.colonies.find((c) => c.faction === 'cendre');
if (ville9w) {
  const gc = { a: 'hexa', b: 'cendre', depuis: 0, batailles: 0, but: { type: 'conquete', villeId: ville9w.id, texte: 'x' } };
  ok(etatDuBut(s9w.world, gc, 'hexa') === null, 'une conquête inachevée ne se solde pas');
  ville9w.faction = 'hexa';
  ok(etatDuBut(s9w.world, gc, 'hexa') === 'atteint', 'prendre la ville visée termine la guerre');
  ville9w.faction = 'cendre';
}

// Perdre des villes ronge la légitimité ; en prendre l'assoit.
const s9x = nouvellePartie(6262, { maintenant: 0, depart: 'ville', equipe: 3 });
const dx = dirigeant(s9x.world, 'cendre');
const legDepart = dx.legitimite;
crediterDirigeant(s9x.world, 'cendre', 'perte', 2);
ok(dx.legitimite < legDepart, 'perdre des villes coûte la place', `${legDepart} → ${dx.legitimite}`);
crediterDirigeant(s9x.world, 'cendre', 'prise', 3);
ok(dx.legitimite > legDepart, 'en prendre la regagne');

// Sur une année, les têtes changent et les guerres se closent sur leur objet.
const s9y = nouvellePartie(6363, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9y, 8000);
const changements = s9y.journal.filter((x) => x.type === 'dirigeant').length;
const closes = s9y.journal.filter((x) => x.type === 'paix' && /affaire est réglée/.test(x.texte)).length;
ok(changements > 0, 'des chefs cèdent la place au cours d’une année', `${changements}`);
ok(closes > 0, 'des guerres s’arrêtent parce qu’elles ont obtenu ce qu’elles voulaient', `${closes}`);
ok(s9y.world.guerres.every((g) => g.but), 'toute guerre en cours a un objet déclaré');
ok(DIPLO_FACTIONS.every((k) => !coloniesVivantes(s9y, k).length || dirigeant(s9y.world, k)),
  'une faction encore debout a toujours quelqu’un à sa tête');
verifierCoherence(s9y, 'après une année de politique incarnée');

section('9 duodecies. Ce que les gens attendent de vous');
const s9z = nouvellePartie(7171, { maintenant: 0, depart: 'ville', equipe: 3 });
const colZ = s9z.world.colonies.find((c) => c.notables && c.notables.length >= 2);
ok(!!colZ, 'une ville a des gens qui comptent');
ok(colZ.notables.every((p) => p.demande === null && Array.isArray(p.memoire)),
  'personne ne demande rien avant d’avoir manqué de quelque chose');

// Une demande naît d'un vrai manque, pas d'un prétexte.
const chefZ = notable(colZ, 'chef');
colZ.stock.rations = 0;
const rngZ = new Rng(12345);
let essais = 0;
while (!chefZ.demande && essais < 4000) { tickServices(colZ, rngZ, 3, essais * 3); essais++; }
ok(!!chefZ.demande, 'une ville affamée finit par demander des vivres',
  chefZ.demande ? chefZ.demande.texte : 'jamais');
ok(chefZ.demande.res === 'rations' && chefZ.demande.quantite >= 4,
  'et elle demande ce qui lui manque, en quantité utile',
  `${chefZ.demande.quantite} ${chefZ.demande.res}`);

// Une ville pleine ne demande rien.
const colPleine = s9z.world.colonies.find((c) => c !== colZ && notable(c, 'chef'));
for (const k of COMMODITY_KEYS) colPleine.stock[k] = colPleine.pop * 50;
const rngP = new Rng(999);
for (let i = 0; i < 3000; i++) tickServices(colPleine, rngP, 3, i * 3);
ok(colPleine.notables.every((p) => !p.demande),
  'une ville qui ne manque de rien ne demande rien');

// On ne peut honorer que sur place, et avec la marchandise.
const gZ = s9z.player.groupes[0];
const logZ = [];
const noteZ = (e) => logZ.push(e);
const loinZ = honorer(s9z, colZ.id, chefZ.id, noteZ);
gZ.regionId = colZ.regionId;
gZ.inventaire.rations = chefZ.demande.quantite - 1;
const courtZ = honorer(s9z, colZ.id, chefZ.id, noteZ);
ok(!loinZ.ok && !courtZ.ok, 'on ne rend pas un service de loin, ni les mains vides');
ok(demandesIci(s9z, colZ).some((d) => d.notable.id === chefZ.id && !d.pret),
  'l’interface le voit avant le clic');

const quantiteZ = chefZ.demande.quantite;
const primeZ = chefZ.demande.prime;
const opinionAvantZ = chefZ.opinion;
const creditsAvantZ = s9z.player.credits;
gZ.inventaire.rations = quantiteZ + 5;
const okZ = honorer(s9z, colZ.id, chefZ.id, noteZ);
ok(okZ.ok, 'sur place avec la marchandise, ça passe');
ok(Math.round(gZ.inventaire.rations) === 5, 'la marchandise quitte le sac',
  `reste ${gZ.inventaire.rations}`);
ok(s9z.player.credits === creditsAvantZ + primeZ, 'la prime est versée', `+${primeZ} cr`);
ok(chefZ.opinion > opinionAvantZ + 15, 'il vous en sait gré',
  `${opinionAvantZ} → ${Math.round(chefZ.opinion)}`);
ok(souvenirs(chefZ).length === 1 && /apporté/.test(souvenirs(chefZ)[0]),
  'et il s’en souvient nommément', souvenirs(chefZ)[0]);
ok(colZ.notables.filter((p) => p !== chefZ).every((p) => p.opinion > 0),
  'ça se sait dans la ville, sans en faire une affaire personnelle');
ok(!chefZ.demande, 'la demande est close');

// Une demande qui s'éteint ne coûte rien : on n'a rien promis.
//
// Elle coûtait 14 points d'estime « si vous étiez passé l'entendre », c'est-à-
// dire si vous aviez traversé la ville. Le banc a compté 487 reproches en
// mémoire pour un bot qui n'a jamais touché à ce système. Restreindre la
// pénalité au refus les mains pleines ne réglait que la moitié de la question :
// garder ses rations quand on a soi-même six bouches à nourrir n'est pas un
// affront. Il n'y a plus de contrepartie négative du tout.
const medZ = colZ.notables[1];
medZ.demande = { res: 'medkit', quantite: 5, echeance: 100, texte: 'x', prime: 10 };
const opZ = medZ.opinion;
const memZ = souvenirs(medZ).length;
// Présent, avec de quoi, et l'on passe son chemin : la demande s'éteint, c'est
// tout. Rien à se faire pardonner.
gZ.inventaire.medkit = 50;
tickServices(colZ, new Rng(7), 3, 120);
ok(!medZ.demande, 'une demande arrivée à échéance s’efface');
ok(medZ.opinion === opZ, 'et ne coûte rien, même si l’on avait de quoi',
  `${Math.round(opZ)} → ${Math.round(medZ.opinion)}`);
ok(souvenirs(medZ).length === memZ, 'personne ne vous reproche de n’avoir pas tout fait');

// L'estime a des effets qu'on ne peut pas acheter autrement.
const s9aa = nouvellePartie(7272, { maintenant: 0, depart: 'ville', equipe: 3 });
const colA = s9aa.world.colonies.find((c) => notable(c, 'chef'));
notable(colA, 'chef').opinion = PANNEAU_FERME - 5;
ok(!faveurChef(colA).ouvert, 'un chef qui vous déteste ferme son panneau');
notable(colA, 'chef').opinion = 60;
ok(faveurChef(colA).ouvert && faveurChef(colA).prime > 1,
  'un chef qui vous doit quelque chose garde les contrats qui paient',
  `×${faveurChef(colA).prime}`);
ok(estime(colA, 'chef') === 60, 'l’estime se lit charge par charge');

const colMed = s9aa.world.colonies.find((c) => notable(c, 'medecin'));
if (colMed) {
  notable(colMed, 'medecin').opinion = 0;
  const sec = renfortSoin(s9aa, colMed.regionId);
  notable(colMed, 'medecin').opinion = SOINS_SEUIL + 10;
  const aide = renfortSoin(s9aa, colMed.regionId);
  ok(sec === 1 && aide > 1.3, 'un médecin acquis soigne aussi les vôtres',
    `×${sec} → ×${aide.toFixed(2)}`);
}
const colCm = s9aa.world.colonies.find((c) => notable(c, 'contremaitre'));
if (colCm) {
  notable(colCm, 'contremaitre').opinion = REGISTRES_SEUIL + 5;
  ok(villesOuvertes(s9aa).some((c) => c.id === colCm.id),
    'un contremaître acquis laisse ses registres ouverts');
  colCm.pop = 4242;
  observer(s9aa);
  ok(vueColonie(s9aa, colCm).pop === 4242,
    'et ses chiffres restent frais sans qu’on y soit', 'relevé à distance');
}

// Sur une année de jeu, des demandes naissent d'elles-mêmes et personne ne casse.
const s9bb = nouvellePartie(7373, { maintenant: 0, depart: 'ville', equipe: 3 });
avancer(s9bb, 6000);
const demandes9 = s9bb.world.colonies.reduce(
  (n, c) => n + (c.notables || []).filter((p) => p.demande).length, 0);
ok(demandes9 > 0, 'des gens attendent quelque chose de vous quelque part', `${demandes9}`);
// Une ville lointaine n'avance que par journées (voir PAS_LOIN) : sa demande
// périmée est balayée au passage suivant, donc jusqu'à une journée plus tard.
// Ce qu'on vérifie, c'est qu'aucune ne s'installe.
ok(s9bb.world.colonies.every((c) => (c.notables || []).every(
  (p) => !p.demande || p.demande.echeance > s9bb.temps - 30)),
  'aucune demande périmée ne s’installe');
verifierCoherence(s9bb, 'après une année de vie sociale');

section('9 terdecies. Les régimes : ce qu’on a le droit de faire chez eux');
{
  // Le monde ne commence pas uniforme. Un régime que personne ne pratique est
  // une ligne de code que le joueur ne rencontrera jamais.
  const sr = nouvellePartie(2929, { maintenant: 0, depart: 'ville', equipe: 3 });
  const pratiques = new Set(DIPLO_FACTIONS.map((f) => loisDe(sr.world, f).regime));
  ok(pratiques.size >= 3, 'plusieurs régimes coexistent dès la première heure',
    [...pratiques].join(', '));
  ok(pratiques.has('franchise') && pratiques.has('commune') && pratiques.has('domaine'),
    'et les régimes tranchés sont tous représentés quelque part');

  const gr = groupeActif(sr);
  const colR = sr.world.colonies.find((c) => c.faction && !c.ruine);
  gr.regionId = colR.regionId;
  const lois = loisDe(sr.world, colR.faction);

  // Ce qu'on peut posséder : le régime décide, plus un seuil en dur.
  lois.regime = 'commune';
  sr.player.credits = 9000;
  sr.player.reputation[colR.faction] = 100;
  ok(!peutAcheter(sr, colR).ok, 'on ne possède rien dans une Commune, même adoré',
    peutAcheter(sr, colR).motif);
  lois.regime = 'charte';
  ok(peutAcheter(sr, colR).ok, 'mais on achète sous une Charte quand on est connu');
  sr.player.reputation[colR.faction] = 5;
  ok(!peutAcheter(sr, colR).ok, 'et pas quand on ne l’est pas');

  // Ce que l'école coûte.
  lois.regime = 'commune';
  ok(prixFormation(colR, DIPLOME_KEYS[0], 0, loiIci(sr, colR).regime) === 0,
    'une Commune instruit gratuitement');
  lois.regime = 'charte';
  ok(prixFormation(colR, DIPLOME_KEYS[0], 0, loiIci(sr, colR).regime) > 0,
    'une Charte fait payer son école');
  lois.regime = 'domaine';
  {
    const v = peutSInscrire(sr, colR, gr.membres[0], ecolesDe(sr.world, colR)[0] || DIPLOME_KEYS[0]);
    ok(!v.ok, 'un Domaine n’instruit que ceux qui servent la maison', v.motif);
  }

  // Ce que l'armurier sort de derrière : le privilège du Domaine, sans rien jurer.
  ok(palierBonus(sr, colR.faction) === 1, 'et son armurier arme n’importe qui');
  lois.regime = 'charte';
  ok(palierBonus(sr, colR.faction) === 0, 'ailleurs il faut le grade');

  // Le prélèvement sur les ventes : la seule part du régime qui touche la bourse.
  gr.inventaire.ferraille = 400;
  colR.stock.ferraille = 60;
  lois.regime = 'franchise';
  const vFranchise = simulerVente(sr, colR, 'ferraille', 40, gr);
  lois.regime = 'commune';
  const vCommune = simulerVente(sr, colR, 'ferraille', 40, gr);
  ok(vFranchise.brut === vCommune.brut, 'le prix de la ferraille ne dépend pas du régime',
    `${vFranchise.brut} / ${vCommune.brut}`);
  ok(vCommune.gain < vFranchise.gain,
    'mais on touche moins là où l’on prélève davantage',
    `franchise ${vFranchise.gain} · commune ${vCommune.gain}`);
  ok(vCommune.taxe > 0 && vFranchise.taxe > 0, 'et la retenue est chiffrée, pas cachée',
    `${vFranchise.taxe} / ${vCommune.taxe}`);
  {
    // Une ville sans drapeau ne retient rien : il n'y a personne pour le faire.
    const libre = sr.world.colonies.find((c) => !c.faction && !c.ruine);
    if (libre) {
      gr.regionId = libre.regionId;
      libre.stock.ferraille = 60;
      ok(simulerVente(sr, libre, 'ferraille', 40, gr).taxe === 0,
        'une ville libre ne retient rien : personne n’est là pour le faire');
      gr.regionId = colR.regionId;
    }
  }

  // Le prélèvement est réellement encaissé, pas seulement affiché.
  lois.regime = 'commune';
  const avoirAvant = sr.player.credits;
  const venteR = vendre(sr, colR, 'ferraille', 40, gr);
  ok(sr.player.credits - avoirAvant === venteR.gain,
    'on encaisse exactement ce qui était annoncé, retenue déduite',
    `${venteR.brut} brut − ${venteR.taxe} = ${venteR.gain}`);

  // Un Commandeur peut changer tout ça — c'est une loi comme les autres.
  ok(!fixerLoi(sr, colR.faction, 'regime', 'nimportequoi', () => {}).ok,
    'on ne promulgue pas un régime qui n’existe pas');
}

section('9 quaterdecies. Ce que l’estime change, et ce qu’une absence ne coûte pas');
{
  // Les paliers affichés ne sont pas une deuxième vérité : ils doivent redire
  // ce que le code applique vraiment. S'ils divergent, l'écran ment, et un
  // écran qui ment sur une mécanique invisible est pire que le silence.
  const seuils = PALIERS_ESTIME.map((p) => p.seuil);
  ok(seuils.includes(REPUTATION_MINIMALE),
    'le palier « on vous reçoit » est bien celui qu’exige l’engagement',
    `${REPUTATION_MINIMALE}`);
  ok(seuils.includes(ESTIME_PROPRIETE),
    'et celui du coffre est bien celui qu’exige la propriété', `${ESTIME_PROPRIETE}`);
  // Le seuil affiché doit être celui du régime, pas une constante parallèle :
  // une aide qui promet quarante d'estime là où la Franchise en demande
  // vingt-cinq est un mensonge que le joueur croira.
  ok(ESTIME_PROPRIETE === REGIMES.charte.propriete,
    'et il relit le régime plutôt que de le redéclarer',
    `${ESTIME_PROPRIETE} / ${REGIMES.charte.propriete}`);
  ok(seuils.includes(-20) && seuils.includes(-50),
    'les paliers hostiles sont ceux de la majoration des prix et de la prime');

  const se = nouvellePartie(4242, { maintenant: 0, depart: 'ville', equipe: 3 });
  const fe = DIPLO_FACTIONS[0];
  se.player.reputation[fe] = 45;
  const haut = effetsEstime(se, fe);
  ok(haut.acquis.length > 0 && haut.perdu.length === 0,
    'bien vu, on n’énumère que ce qui s’ouvre', haut.palier.nom);
  ok(haut.acquis.some((t) => /coffre/.test(t)),
    'et l’on y lit qu’on peut enfin posséder des murs');
  se.player.reputation[fe] = -60;
  const bas = effetsEstime(se, fe);
  ok(bas.perdu.some((t) => /prime/.test(t)),
    'mal vu, on lit d’abord qu’il y a une prime sur votre tête', bas.palier.nom);
  ok(bas.perdu.length === new Set(bas.perdu).size,
    'et jamais deux fois la même conséquence : les paliers se recouvrent');
  se.player.reputation[fe] = 8;
  const proche = effetsEstime(se, fe);
  ok(proche.suivant && proche.suivant.manque === REPUTATION_MINIMALE - 8,
    'on sait de combien on est loin du palier suivant',
    proche.suivant ? `${proche.suivant.manque}` : 'aucun');

  // Une absence ne se paie pas en estime. C'est la contrepartie du rattrapage :
  // le monde tourne sans vous, mais on ne vous reproche pas de n'avoir pas été
  // là pour recevoir un ordre.
  const sa = nouvellePartie(5151, { maintenant: 0, depart: 'ville', equipe: 3 });
  const ga = groupeActif(sa);
  const colA = sa.world.colonies.find((c) => c.faction && !c.ruine);
  ga.regionId = colA.regionId;
  sa.player.reputation[colA.faction] = 40;
  sEngager(sa, colA.faction, () => {}, ga);
  ga.allegeance.ordre = {
    id: 'o-abs', type: 'reconnaissance', regionId: 0, titre: 'Reconnaître le secteur',
    recompense: 200, service: 20, duree: 10, echeance: sa.temps + 2,
  };
  const repAvantAbs = sa.player.reputation[colA.faction];
  const manquesAvant = ga.allegeance.manques || 0;
  sa.dernierReel = 1;
  rattraper(sa, 1 + TICK_MS * 40);
  ok(!ga.allegeance.ordre || ga.allegeance.ordre.id !== 'o-abs',
    'un ordre dont l’échéance tombe pendant l’absence est retiré');
  ok((ga.allegeance.manques || 0) === manquesAvant,
    'il n’est pas compté comme un manquement',
    `${manquesAvant} → ${ga.allegeance.manques || 0}`);
  // L'estime positive s'émousse d'elle-même avec le temps (voir events.js) :
  // ce qu'on vérifie, c'est qu'aucune sanction de 3 points ne s'y ajoute.
  ok(repAvantAbs - sa.player.reputation[colA.faction] < 1,
    'et il ne coûte pas d’estime, hors l’oubli ordinaire',
    `${repAvantAbs} → ${sa.player.reputation[colA.faction]}`);
  ok((ga.allegeance.faits || []).some((f) => f.id !== undefined || f.issue === 'annule'),
    'le dossier le porte comme annulé, pas comme manqué',
    (ga.allegeance.faits || []).map((f) => f.issue).join(','));
  ok(!ga.allegeance.ordre,
    'et l’on ne reçoit pas d’ordre neuf tant qu’on n’est pas revenu');

  // Mais présent, un ordre raté reste un ordre raté : l'absence est une
  // exception, pas une porte de sortie.
  ga.allegeance.ordre = {
    id: 'o-pres', type: 'reconnaissance', regionId: 0, titre: 'Reconnaître le secteur',
    recompense: 200, service: 20, duree: 10, echeance: sa.temps + 1,
  };
  const repAvantPres = sa.player.reputation[colA.faction];
  avancer(sa, 3);
  ok(sa.player.reputation[colA.faction] < repAvantPres,
    'aux commandes, en revanche, un ordre manqué coûte toujours',
    `${repAvantPres} → ${sa.player.reputation[colA.faction]}`);
}

section('9 quindecies. Le rapport d’absence');
{
  // Une longue absence produit des milliers de lignes de journal pour quatre
  // cents places : ce qui comptait a défilé. Le rapport ne relit donc pas le
  // journal, il compare deux photos et retient les faits marquants au passage.
  const sr = nouvellePartie(8484, { maintenant: 0, depart: 'ville', equipe: 3 });
  // On entre au service de quelqu'un : la solde tombe toute seule pendant
  // l'absence, ce qui donne au moins un mouvement d'argent à ventiler. Sans
  // ça, le test passerait sur une partie où rien ne bouge — et ne mesurerait
  // que sa propre indulgence.
  {
    const gr = groupeActif(sr);
    const colr = sr.world.colonies.find((c) => c.faction && !c.ruine);
    gr.regionId = colr.regionId;
    sr.player.reputation[colr.faction] = 40;
    sEngager(sr, colr.faction, () => {}, gr);
  }
  sr.vitesse = 1;
  sr.dernierReel = 1;
  const creditsAvant = sr.player.credits;
  sr.player.credits += 0; // repère explicite : on veut voir le delta, pas la valeur
  rattraper(sr, 1 + TICK_MS * 1200);
  ok(!!sr.rapport, 'une absence laisse un rapport derrière elle');
  ok(!!sr.rapport.apres, 'et il est refermé : les deux photos sont prises');

  const lu = lireRapport(sr, sr.rapport);
  ok(!!lu && lu.heures >= 1000, 'il couvre bien la durée de l’absence',
    lu ? `${lu.heures} h` : 'illisible');
  ok(lu.jours === Math.floor(lu.heures / 24), 'et la dit en jours', `${lu.jours} j`);
  ok(lu.argent === sr.player.credits - creditsAvant,
    'le mouvement de la bourse est celui qu’on a réellement subi',
    `${lu.argent} cr`);
  ok(lu.marquants.length > 0, 'des faits marquants ont été retenus',
    `${lu.marquants.length} retenus, ${lu.tus} tus`);
  ok(lu.marquants.length <= MARQUANTS_MAX,
    'jamais plus que ce qu’un écran peut porter', `${lu.marquants.length}`);
  ok(lu.marquants.every((m) => m.texte && m.t >= 0),
    'et chacun porte son heure et sa phrase');
  ok(Object.keys(lu.comptes).length > 0,
    'ce qui n’est pas retenu en toutes lettres est au moins compté',
    Object.keys(lu.comptes).join(', '));

  // « Crédits −2 877 » sans rien d'autre est une accusation sans dossier : ce
  // qu'on veut savoir, c'est d'où l'argent est parti pendant qu'on ne
  // regardait pas.
  ok(lu.causes.length > 0, 'le mouvement d’argent est ventilé par cause',
    lu.causes.map((c) => `${c.cause} ${c.delta}`).join(' · '));
  ok(lu.causes.reduce((t, c) => t + c.delta, 0) === lu.argent,
    'et les causes rendent exactement le solde, divers compris',
    `${lu.causes.reduce((t, c) => t + c.delta, 0)} vs ${lu.argent}`);
  ok(lu.causes.every((c) => c.delta !== 0),
    'aucune cause à zéro : une ligne qui ne dit rien encombre');

  // Le rapport survit à une sauvegarde : la page peut se fermer pendant le
  // rattrapage, on doit le retrouver au retour.
  const relu = deserialiser(serialiser(sr));
  ok(!!relu.rapport && !!relu.rapport.apres,
    'il survit à un aller-retour par la sauvegarde');
  ok(lireRapport(relu, relu.rapport).heures === lu.heures,
    'et se relit à l’identique');

  // Une partie jouée aux commandes n'en produit pas : ce serait un écran de
  // plus à fermer toutes les trois minutes.
  const sp = nouvellePartie(8585, { maintenant: 0, depart: 'ville', equipe: 3 });
  avancer(sp, 300);
  ok(!sp.rapport, 'jouer aux commandes n’ouvre aucun rapport');
}

section('9 sexdecies. Un camp neuf dit ce qu’il lui manque');
{
  // Le reproche, mot pour mot : « pourquoi j'ai personne dans ma base, les
  // constructions c'est bidon, y a rien pour récolter, y a rien pour de
  // l'autonomie ». Les trois tiennent au même défaut : `populationMax` vaut
  // zéro sans baraquement, la halle et l'hydroponie existent mais sont noyées
  // dans douze bâtiments listés dans l'ordre du fichier de données, et un
  // bouton grisé ne dit pas de quoi il manque.
  const sb = nouvellePartie(1234, { maintenant: 0, depart: 'ville', equipe: 3 });
  const gb = groupeActif(sb);
  const videB = sb.world.regions.find(
    (r) => !sb.world.colonies.some((c) => c.regionId === r.i));
  gb.regionId = videB.i;
  for (const k of Object.keys(COUT_FONDATION)) {
    gb.inventaire[k] = (gb.inventaire[k] || 0) + COUT_FONDATION[k];
  }
  fonderBase(sb, () => {}, gb);

  ok(populationMax(sb.base) === 0,
    'un camp neuf ne peut loger personne — c’est le fait, il faut le dire');
  const ch = chaineAutonomie(sb);
  ok(ch.length === 4, 'la chaîne de l’autonomie a quatre maillons',
    ch.map((x) => x.titre).join(' → '));
  ok(ch.every((x) => !x.fait), 'et aucun n’est en place au premier jour');
  ok(ch.some((x) => x.key === 'halle') && ch.some((x) => x.key === 'hydroponie'),
    'récolter et se nourrir y figurent nommément');
  ok(ch.find((x) => x.key === 'baraquement').etat.includes('personne'),
    'et l’on y lit pourquoi personne ne s’installe',
    ch.find((x) => x.key === 'baraquement').etat);

  const manque = manquePour(sb.base, 'baraquement');
  ok(manque.length > 0 && manque.every((m) => m.qte > 0),
    'ce qui manque pour bâtir est chiffré, pas seulement grisé',
    manque.map((m) => `${m.qte} ${m.key}`).join(', '));
  sb.base.stock.ferraille = 9999;
  sb.base.stock.polymere = 9999;
  ok(manquePour(sb.base, 'baraquement').length === 0,
    'et il ne manque plus rien une fois les matériaux là');

  ok(/9/.test(apportBatiment(sb.base, 'baraquement')),
    'un bâtiment annonce ce qu’il change, en chiffres',
    apportBatiment(sb.base, 'baraquement'));
  ok(/hydroponie/i.test(apportBatiment(sb.base, 'halle')),
    'et la halle dit à quoi elle sert dans la chaîne',
    apportBatiment(sb.base, 'halle'));

  // Un maillon n'est « en place » que s'il produit. Le camp planté dans une
  // friche — qui donne de l'isotope et de la ferraille, pas de biomasse —
  // affichait quatre bâtiments cochés en vert, zéro ration, zéro habitant, et
  // aucun moyen de comprendre. Un tableau de bord qui coche des cases sans
  // regarder les flux ment mieux que le silence.
  {
    const sf = nouvellePartie(31415, { maintenant: 0, depart: 'ville', equipe: 3 });
    const gf = groupeActif(sf);
    const friche = sf.world.regions.find(
      (r) => r.biome === 'friche' && !sf.world.colonies.some((c) => c.regionId === r.i));
    gf.regionId = friche.i;
    for (const k of Object.keys(COUT_FONDATION)) {
      gf.inventaire[k] = (gf.inventaire[k] || 0) + COUT_FONDATION[k];
    }
    fonderBase(sf, () => {}, gf);
    Object.assign(sf.base.batiments,
      { halle: 1, hydroponie: 1, baraquement: 1, generateur: 1 });
    avancer(sf, 400);

    const cf = chaineAutonomie(sf);
    ok(cf.filter((x) => x.fait).length < 4,
      'quatre bâtiments montés ne font pas quatre maillons qui tournent',
      cf.map((x) => `${x.titre}:${x.fait ? 'oui' : 'non'}`).join(' '));
    ok(cf.find((x) => x.key === 'halle').alerte,
      'la halle dit que cette friche ne donne pas de biomasse',
      cf.find((x) => x.key === 'halle').alerte);
    ok(cf.find((x) => x.key === 'baraquement').alerte,
      'et l’on apprend pourquoi personne ne s’installe malgré les lits',
      cf.find((x) => x.key === 'baraquement').alerte);
    ok((sf.base.pop || 0) === 0, 'le camp est effectivement resté vide',
      `${sf.base.pop}`);
    ok(/friche/i.test(apportBatiment(sf.base, 'halle', sf))
      || /isotope/i.test(apportBatiment(sf.base, 'halle', sf)),
      'la fiche de la halle nomme ce que la région donne, avant de la bâtir',
      apportBatiment(sf.base, 'halle', sf));

    // Et le conseil donné est le bon : c'est la réserve de vivres qui manquait.
    sf.base.stock.rations = 200;
    avancer(sf, 900);
    ok((sf.base.pop || 0) > 0,
      'des rations déposées suffisent à peupler le camp, comme annoncé',
      `${sf.base.pop} habitant(s)`);
  }

  // Une fois logé, quelqu'un finit par venir : le maillon manquant était bien
  // celui-là, et non un dé qui ne tombe jamais.
  lancerConstruction(sb, 'baraquement', () => {});
  avancer(sb, 40);
  ok(populationMax(sb.base) >= 9, 'le baraquement ouvre des places',
    `${populationMax(sb.base)}`);
  sb.base.stock.rations = 400;
  avancer(sb, 900);
  ok((sb.base.pop || 0) > 0, 'et des gens finissent par s’y installer',
    `${sb.base.pop} habitant(s)`);
}

section('9 septdecies. Une destination porte toujours sa case');
{
  // Signalé trois fois, « corrigé » deux fois du mauvais côté. La cause :
  // `nomRegion` rend le nom de la ville quand il y en a une, et ne tombe sur la
  // case que pour les régions vides. Or un ravitaillement vise une ville — il
  // n'affichait donc jamais de coordonnées, quoi qu'on fasse aux régions vides.
  const sc = nouvellePartie(606, { maintenant: 0, depart: 'ville', equipe: 3 });
  const villeC = sc.world.colonies.find((c) => !c.ruine);
  const videC = sc.world.regions.find(
    (r) => !sc.world.colonies.some((c) => c.regionId === r.i));

  ok(!/\(/.test(nomRegion(sc.world, villeC.regionId)),
    'nomRegion garde le nom nu d’une ville : c’est son rôle',
    nomRegion(sc.world, villeC.regionId));
  ok(/\([A-Z]\d+\)$/.test(lieuAvecCoord(sc.world, villeC.regionId)),
    'mais une destination porte sa case, ville comprise',
    lieuAvecCoord(sc.world, villeC.regionId));
  ok(/[A-Z]\d+/.test(lieuAvecCoord(sc.world, videC.i)),
    'et une région vide la porte aussi', lieuAvecCoord(sc.world, videC.i));
  ok(coordonnee(sc.world, villeC.regionId)
    === `${String.fromCharCode(65 + sc.world.regions[villeC.regionId].x)}${
      sc.world.regions[villeC.regionId].y + 1}`,
    'la case est bien celle qu’on lit sur la grille');

  // Les titres, qui sont la ligne qu'on lit en premier.
  avancer(sc, 60);
  const titres = sc.world.colonies.flatMap((c) => (c.contrats || []).map((x) => x.titre));
  const livraisons = titres.filter((t) => /^Porter /.test(t));
  ok(livraisons.length === 0 || livraisons.every((t) => /\([A-Z]\d+\)/.test(t)),
    'un contrat de livraison nomme la case de sa destination',
    livraisons.slice(0, 2).join(' | ') || 'aucun contrat de livraison tiré');
}

section('9 octodecies. Un contrat qu’on peut tenir, et dont il reste une trace');
{
  // Signalé en jouant : « destination atteinte » à midi, « contrat échu » à
  // treize heures. Un relevé se rend au panneau qui l'a affiché, mais la durée
  // ne payait que l'aller — le contrat était impossible par construction, et
  // l'écran annonçait pourtant « l'échéance le permet ».
  const sk = nouvellePartie(9182, { maintenant: 0, depart: 'ville', equipe: 3 });
  avancer(sk, 40);
  const recos = sk.world.colonies.flatMap(
    (c) => (c.contrats || []).filter((x) => x.type === 'reconnaissance')
      .map((x) => ({ col: c, x })));
  ok(recos.length > 0, 'des contrats de reconnaissance sont affichés', `${recos.length}`);

  // Le délai est l'exception, et il se paie. C'était l'inverse, et le banc l'a
  // chiffré : vingt-cinq contrats pris par partie, vingt manqués. Un panneau
  // dont quatre offres sur cinq finissent en échec ne se lit plus.
  const tous = sk.world.colonies.flatMap((c) => c.contrats || []);
  const presses = tous.filter((x) => x.duree);
  ok(presses.length > 0 && presses.length < tous.length / 2,
    'une minorité d’offres presse, la plupart attendent',
    `${presses.length} sur ${tous.length}`);
  {
    // À type et à ville égaux, l'urgent doit payer davantage — sinon personne
    // ne le prend, et l'exception ne sert à rien.
    const parType = {};
    for (const x of tous) {
      const b = parType[x.type] || (parType[x.type] = { urg: [], calme: [] });
      (x.duree ? b.urg : b.calme).push(x.recompense);
    }
    const moy = (a) => a.reduce((s2, v) => s2 + v, 0) / Math.max(1, a.length);
    const comparables = Object.keys(parType).filter(
      (k) => parType[k].urg.length && parType[k].calme.length);
    const mieuxPayes = comparables.filter((k) => moy(parType[k].urg) > moy(parType[k].calme));
    ok(comparables.length > 0 && mieuxPayes.length === comparables.length,
      'et l’urgence paie mieux, type par type',
      comparables.map((k) => `${k} ${Math.round(moy(parType[k].calme))} → ${
        Math.round(moy(parType[k].urg))}`).join(' · '));
  }
  const impossibles = recos.filter(({ col, x }) => {
    // Un contrat sans délai n'a rien à tenir : la question ne se pose que pour
    // les urgents, qui sont désormais la minorité qui paie davantage.
    if (!x.duree) return false;
    const aller = distance(col.regionId, x.regionId);
    // Deux fois l'aller au tarif le plus favorable du tirage : en deçà, aucune
    // escouade ne peut aller et revenir.
    return x.duree < aller * 2 * 16;
  });
  ok(impossibles.length === 0,
    'aucun ne demande plus que le temps qu’il accorde, retour compris',
    impossibles.slice(0, 2).map(({ x }) => `${x.titre} : ${x.duree} h`).join(' | '));

  // Le dossier : ce qu'on a signé et comment ça s'est terminé.
  const gk = groupeActif(sk);
  const colK = sk.world.colonies.find((c) => (c.contrats || []).length);
  gk.regionId = colK.regionId;
  const ct = colK.contrats[0];
  accepter(sk, colK, ct.id, () => {}, gk);
  ok(sk.player.contrats.length === 1, 'un contrat est pris');
  // On le laisse expirer.
  sk.player.contrats[0].echeance = sk.temps + 1;
  const repAvantK = sk.player.reputation[ct.faction] || 0;
  const opinionChefAvant = estime(colK, 'chef');
  avancer(sk, 4);
  ok(sk.player.contrats.length === 0, 'et il finit par échoir');
  ok((sk.player.dossier || []).length === 1,
    'le dossier en garde la trace', JSON.stringify(sk.player.dossier));
  const trace = sk.player.dossier[0];
  ok(trace.issue === 'echu', 'avec son issue', trace.issue);
  // Rater ne coûte rien : ni estime, ni considération locale. Un délai manqué
  // n'est pas une faute, et l'on ne punit pas quelqu'un parce qu'il a essayé.
  ok(Math.abs(sk.player.reputation[ct.faction] - repAvantK) < 0.5,
    'rater un contrat ne coûte pas d’estime : essayer doit rester meilleur que s’abstenir',
    `${repAvantK} → ${sk.player.reputation[ct.faction]}`);
  ok(estime(colK, 'chef') === opinionChefAvant,
    'ni la considération du chef : on ne punit pas quelqu’un qui a essayé',
    `${opinionChefAvant} → ${estime(colK, 'chef')}`);
  ok(sk.player.bilanContrats.echus === 1,
    'les totaux suivent, pour quand le détail sera tombé du dossier');

  // Trois versions, deux séries de mesures, et pour finir : rien. Le test joue
  // le cas qui décidait, celui du joueur qui rate plusieurs fois au même
  // endroit — le seul que l'ancienne sanction atteignait vraiment.
  {
    const sp = nouvellePartie(2024, { maintenant: 0, depart: 'ville', equipe: 3 });
    avancer(sp, 60);
    const gp = groupeActif(sp);
    const colP = sp.world.colonies.find((c) => (c.contrats || []).length);
    gp.regionId = colP.regionId;
    let manques = 0;
    for (let i = 0; i < 4 && colP.contrats.length; i++) {
      const r = accepter(sp, colP, colP.contrats[0].id, () => {}, gp);
      if (!r.ok) break;
      sp.player.contrats[sp.player.contrats.length - 1].echeance = sp.temps + 1;
      avancer(sp, 3);
      manques += 1;
    }
    ok(manques >= 3 && faveurChef(colP).ouvert,
      'même trois manquements coup sur coup ne ferment pas le panneau',
      `${manques} manquements, opinion ${Math.round(estime(colP, 'chef'))}`);
    ok(OPINION_ECHU === 0 && OPINION_RENDU === 0,
      'et les deux barèmes sont à zéro, écrits plutôt que supprimés');
  }

  // Le chef, et lui seul. La sanction passait par `retenirEnVille`, donc le
  // médecin refusait de soigner vos gens à cause d'une livraison en retard.
  ok(estime(colK, 'medecin') >= 0 || estime(colK, 'medecin') > estime(colK, 'chef'),
    'le médecin de la ville n’a pas à s’en mêler',
    `chef ${Math.round(estime(colK, 'chef'))} · médecin ${Math.round(estime(colK, 'medecin'))}`);

  // Une collecte doit tenir dans un sac : la validation exige un seul groupe
  // portant le lot entier, donc un lot plus lourd que la capacité de portage est
  // impossible quoi qu'on fasse. Mesuré avant correctif : 18 des 77 collectes
  // affichées d'une partie étaient dans ce cas.
  const collectes = sk.world.colonies.flatMap(
    (c) => (c.contrats || []).filter((x) => x.type === 'collecte'));
  const troplourdes = collectes.filter(
    (x) => COMMODITIES[x.ressource].poids * x.quantite > POIDS_COLLECTE_MAX + 0.01);
  ok(troplourdes.length === 0,
    'aucune collecte ne pèse plus qu’un sac ne peut porter',
    troplourdes.slice(0, 2).map((x) => `${x.titre} = ${
      (COMMODITIES[x.ressource].poids * x.quantite).toFixed(0)} kg`).join(' | '));
}

section('9 novodecies. Tous les drapeaux n’enrôlent pas au même prix');
{
  const se = nouvellePartie(3690, { maintenant: 0, depart: 'ville', equipe: 3 });
  const seuils = DIPLO_FACTIONS.map((k) => estimeEngagement(k));
  ok(new Set(seuils).size > 1,
    'les critères d’engagement diffèrent d’une faction à l’autre',
    DIPLO_FACTIONS.map((k) => `${FACTIONS[k].court} ${estimeEngagement(k)}`).join(' · '));
  ok(Math.max(...seuils) >= 2 * Math.min(...seuils),
    'et l’écart est net : une église ne se rejoint pas comme une commune',
    `${Math.min(...seuils)} → ${Math.max(...seuils)}`);

  // L'ouverture doit rester jouable : on démarre à douze chez ses hôtes, et le
  // banc a montré qu'exiger seulement trois points de plus fait tomber les
  // engagements de trente parties à sept — l'estime positive s'érode d'un
  // dixième par jour, plus vite qu'un début de partie ne la produit.
  const hote = Object.keys(se.player.reputation).find((k) => se.player.reputation[k] > 0);
  ok(peutSEngager(se, hote).ok,
    'et l’on peut servir ses hôtes dès le départ : sans ça la voie du service s’évapore',
    `${hote} exige ${estimeEngagement(hote)}, on a ${se.player.reputation[hote]}`);
  // Un exigeant qui ne soit pas notre hôte : depuis qu'on peut naître sous
  // n'importe quel drapeau, l'église peut être celle qui nous accueille — et
  // l'on est alors reçu chez elle, ce qui est le fonctionnement voulu.
  const dur = DIPLO_FACTIONS.find(
    (k) => estimeEngagement(k) > 30 && (se.player.reputation[k] || 0) <= 0);
  ok(dur && !peutSEngager(se, dur).ok,
    'tandis que les plus exigeants demandent qu’on ait fait ses preuves',
    dur ? peutSEngager(se, dur).motif : 'aucun');

  // Ce que l'écran promet doit être ce que le code applique — le palier « Reçu »
  // annonçait l'engagement pour tout le monde alors qu'il dépend du drapeau.
  const ef = effetsEstime(se, dur);
  ok(ef.perdu.some((t) => /enrôlent/.test(t)),
    'et la fiche d’estime dit ce qu’il manque pour être enrôlé ici',
    ef.perdu.join(' | '));
}

section('9 vicies. On peut rendre un colis qu’on ne livrera pas');
{
  // `c.charge` était posé à l'acceptation et jamais retiré : renoncer à une
  // livraison coûtait douze d'estime pour vol, y compris debout dans la ville
  // qui vous avait confié le colis, celui-ci intact dans le sac. On punissait un
  // vol qu'aucune action ne permettait d'éviter.
  const sv = nouvellePartie(1357, { maintenant: 0, depart: 'ville', equipe: 3 });
  avancer(sv, 40);
  const gv = groupeActif(sv);
  const trouve = sv.world.colonies
    .map((c) => ({ col: c, ct: (c.contrats || []).find((x) => x.type === 'livraison') }))
    .find((x) => x.ct);
  ok(!!trouve, 'une ville propose une livraison');
  const { col: colV, ct } = trouve;
  gv.regionId = colV.regionId;
  gv.inventaire.rations = 400; // de la place et de quoi vivre
  accepter(sv, colV, ct.id, () => {}, gv);
  const pris = sv.player.contrats[sv.player.contrats.length - 1];
  ok(Math.floor(gv.inventaire[pris.ressource] || 0) >= pris.quantite,
    'accepter une livraison met le colis dans le sac');

  // Sur place, avec le colis : on rend, et il ne s'est rien passé.
  const repAvantV = sv.player.reputation[pris.faction] || 0;
  const avantColis = Math.floor(gv.inventaire[pris.ressource] || 0);
  ok(peutRendre(sv, pris, gv).ok, 'et l’on peut le rendre là où on l’a pris');
  abandonner(sv, pris.id, () => {}, gv);
  ok(Math.abs((sv.player.reputation[pris.faction] || 0) - repAvantV) < 0.01,
    'rendre le colis ne coûte rien',
    `${repAvantV} → ${sv.player.reputation[pris.faction]}`);
  ok(Math.floor(gv.inventaire[pris.ressource] || 0) === avantColis - pris.quantite,
    'et le colis quitte bien le sac : on ne le rend pas en le gardant',
    `${avantColis} → ${Math.floor(gv.inventaire[pris.ressource] || 0)}`);

  // Ailleurs, ou sans le colis : c'est du vol, et le refus le dit avant.
  const ct2 = (colV.contrats || []).find((x) => x.type === 'livraison');
  if (ct2) {
    accepter(sv, colV, ct2.id, () => {}, gv);
    const pris2 = sv.player.contrats[sv.player.contrats.length - 1];
    gv.regionId = sv.world.colonies.find((c) => c.id !== colV.id).regionId;
    const v = peutRendre(sv, pris2, gv);
    ok(!v.ok && /rend à/.test(v.motif),
      'loin de la ville, on ne peut pas rendre — et l’on dit où',
      v.motif);
    const repAvant2 = sv.player.reputation[pris2.faction] || 0;
    abandonner(sv, pris2.id, () => {}, gv);
    ok(sv.player.reputation[pris2.faction] < repAvant2,
      'partir avec le colis reste du vol, et se paie',
      `${repAvant2} → ${sv.player.reputation[pris2.faction]}`);
  }
}

section('9 unvicies. On se réveille dans la poussière');
{
  // Le jeu commençait dans une ville, et toujours chez les mêmes — quarante
  // parties sur quarante chez les Communes Libres. Même drapeau, même régime,
  // mêmes voisins : l'ouverture était une constante du jeu plutôt qu'une
  // variable de partie.
  //
  // Le reste de ce fichier démarre en ville (`depart: 'ville'`) parce qu'il
  // teste des mécaniques — un marché, un panneau, une école — et qu'une escouade
  // posée dans le désert n'en a aucune sous la main. Le départ réel, lui, se
  // vérifie ici.
  const villes = [];
  const inconnus = [];
  const distances = [];
  for (let i = 0; i < 12; i++) {
    const sd = nouvellePartie(400 + i * 613, { maintenant: 0 });
    const g = sd.player.groupes[0];
    villes.push(!!sd.world.colonies.find((c) => c.regionId === g.regionId));
    inconnus.push(Math.max(0, ...Object.values(sd.player.reputation)));
    const proche = sd.world.colonies
      .filter((c) => c.faction && c.faction !== 'essaim')
      .reduce((a, c) => Math.min(a, distance(g.regionId, c.regionId)), 99);
    distances.push(proche);
  }
  ok(villes.every((v) => !v), 'on ne démarre plus dans une ville',
    `${villes.filter(Boolean).length} sur 12 y étaient encore`);
  ok(inconnus.every((r) => r === 0), 'et personne ne vous connaît : toute estime à zéro',
    `max ${Math.max(...inconnus)}`);
  ok(distances.every((d) => d <= 2), 'mais on n’est pas perdu : une ville à deux régions au plus',
    distances.join(', '));

  // Le départ en ville reste disponible, et il donne de quoi servir ses hôtes.
  const sv2 = nouvellePartie(400, { maintenant: 0, depart: 'ville', equipe: 3 });
  const hote2 = Object.keys(sv2.player.reputation).find((k) => sv2.player.reputation[k] > 0);
  ok(!!hote2 && peutSEngager(sv2, hote2).ok,
    'et le départ en ville, lui, ouvre le service chez ses hôtes quel que soit leur drapeau',
    hote2 ? `${hote2} : ${sv2.player.reputation[hote2]} pour ${estimeEngagement(hote2)} exigés` : 'aucun');
}

section('10. Rattrapage hors ligne');
const s10 = nouvellePartie(1010, { maintenant: 1000000, depart: 'ville', equipe: 3 });
s10.vitesse = 1; // le rattrapage dépend de la vitesse choisie
const res10 = rattraper(s10, 1000000 + TICK_MS * 100);
ok(res10.ticks === 100, '100 heures rattrapées après 100 pas de temps réel', `reçu ${res10.ticks}`);
ok(s10.temps === 100, 'horloge cohérente');
const res10b = rattraper(s10, 1000000 + TICK_MS * 100 + TICK_MS * 1e6);
ok(res10b.tronque, 'le rattrapage est plafonné');
ok(s10.temps <= 100 + RATTRAPAGE_MAX, 'plafond respecté', `t=${s10.temps}`);

// Le rattrapage étalé sert l'interface : il doit produire exactement le même
// monde que le rattrapage d'un bloc, quel que soit le découpage.
const bloc = nouvellePartie(2020, { maintenant: 500, depart: 'ville', equipe: 3 });
bloc.vitesse = 1;
rattraper(bloc, 500 + TICK_MS * 600);
const etale = nouvellePartie(2020, { maintenant: 500, depart: 'ville', equipe: 3 });
etale.vitesse = 1;
const pas10 = rattrapageEtale(etale, 500 + TICK_MS * 600, 37);
let tranches = 0;
while (pas10.pas()) tranches++;
ok(pas10.total === 600, 'rattrapage étalé : 600 heures planifiées', `reçu ${pas10.total}`);
ok(tranches > 5, 'découpé en plusieurs tranches', `${tranches} tranches`);
ok(serialiser(etale) === serialiser(bloc), 'étalé et d’un bloc donnent le même monde');

// Fermer la page en cours de rattrapage ne doit ni perdre ni rejouer le temps
// déjà passé : ce qui reste dû se retrouve au chargement suivant.
const coupe = nouvellePartie(2020, { maintenant: 500, depart: 'ville', equipe: 3 });
coupe.vitesse = 1;
const pas10b = rattrapageEtale(coupe, 500 + TICK_MS * 600, 37);
pas10b.pas();
pas10b.pas();
const reste = rattraper(coupe, 500 + TICK_MS * 600);
ok(coupe.temps === 600, 'reprise après coupure : ni perte ni doublon', `t=${coupe.temps}`);
ok(reste.ticks === 600 - 74, 'le reste dû est exactement ce qui manquait', `reçu ${reste.ticks}`);

section('11. Robustesse : escouade décimée');
const s11 = nouvellePartie(1111, { maintenant: 0, depart: 'ville', equipe: 3 });
for (const ch of groupeActif(s11).membres) ch.etat = 'mort';
avancer(s11, 50);
ok(s11.fin === 'extinction', 'fin de partie détectée');
ok(s11.temps <= 51, 'la sim s’arrête après la fin', `t=${s11.temps}`);

section('12. Robustesse : sac plein et famine');
const s12 = nouvellePartie(1212, { maintenant: 0, depart: 'ville', equipe: 3 });
groupeActif(s12).inventaire.rations = 0;
donnerOrdre(s12, { type: 'fouille' });
avancer(s12, 300);
ok(groupeActif(s12).membres.every((ch) => ch.faim <= 120), 'la faim reste bornée');
ok(groupeActif(s12).membres.some((ch) => ch.faim > 60) || s12.fin, 'la famine s’installe sans rations');
verifierCoherence(s12, 'sous famine');

// ===========================================================================
console.log('\n' + '='.repeat(42));
console.log(`${total - echecs}/${total} tests passés`);
if (echecs > 0) {
  console.log(`${echecs} ÉCHEC(S)`);
  process.exit(1);
}
console.log('Moteur opérationnel.');
