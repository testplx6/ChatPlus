// Harnais de test sans navigateur : le moteur doit tourner tel quel sous Node.
// C'est aussi la preuve qu'il pourra tourner côté serveur en multijoueur.

import {
  nouvellePartie, avancer, tick, rattraper, rattrapageEtale,
  TICK_MS, RATTRAPAGE_MAX,
} from '../src/sim.js';
import { Rng } from '../src/rng.js';
import { serialiser, deserialiser } from '../src/save.js';
import { COMMODITY_KEYS, DIPLO_FACTIONS } from '../src/data.js';
import { classement, puissance } from '../src/factions.js';
import { donnerOrdre, verifierExercice, COMPETENCES_EXERCICE } from '../src/squad.js';
import { fonderBase, lancerConstruction, lancerRecherche } from '../src/base.js';
import {
  estVivant, makeCharacter, accorderDiplome, apprentissage,
} from '../src/characters.js';
import { DIPLOMES } from '../src/data.js';
import { ecolesDe, inscrire, enFormation } from '../src/formation.js';
import { colonieDe } from '../src/world.js';
import {
  groupeActif, groupes, tousLesMembres, scinder, fusionner, assignerTache,
  tacheDe, maxGroupes, debout,
} from '../src/groupes.js';
import { acheter, vendre, prixJoueur } from '../src/economy.js';
import { sEngager, rangDe, RANGS } from '../src/allegeance.js';
import {
  vueColonie, estSurveillee, ageTexte, nouvellesConnues, DELAI_NOUVELLE,
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
// régression, soit capricieux selon la machine qui fait tourner les tests. On
// mesure donc un étalon — un travail fixe, sans allocation — et on rapporte le
// coût du tick à la vitesse de la machine. ETALON_MS est ce que cet étalon coûte
// sur la machine de référence ; BUDGET_US le plafond du tick une fois normalisé.
const ETALON_MS = 25;
const BUDGET_US = 100;

/** Mesure la vitesse de la machine. Le minimum de trois passes : le bruit du
 *  ramasse-miettes et de la compilation ne fait que ralentir, jamais accélérer. */
function etalonnerMachine() {
  let best = Infinity;
  for (let p = 0; p < 3; p++) {
    const t = process.hrtime.bigint();
    const r = new Rng(1);
    let acc = 0;
    for (let i = 0; i < 3e6; i++) acc += r.f();
    if (acc < 0) return 1; // inatteignable, mais empêche l'élimination de la boucle
    best = Math.min(best, Number(process.hrtime.bigint() - t) / 1e6);
  }
  return best / ETALON_MS;
}

const facteurMachine = etalonnerMachine();

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
  }
  if (groupes(state).length > maxGroupes(state)) pb = pb || 'plus de groupes que permis';
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
const s1 = nouvellePartie(123456, { maintenant: 0 });
ok(s1.world.regions.length === 80, 'carte 10×8 = 80 régions', `reçu ${s1.world.regions.length}`);
ok(s1.world.colonies.length >= 12, 'au moins 12 colonies', `reçu ${s1.world.colonies.length}`);
ok(s1.world.colonies.every((c) => c.faction), 'toute colonie a un propriétaire');
ok(groupeActif(s1).membres.length === 3, 'escouade de départ à 3');
ok(s1.world.regions.some((r) => r.biome === 'relais'), 'un Relais Orbital existe');
ok(Object.keys(s1.world.factions).length === 7, '7 factions');
verifierCoherence(s1, 'à la génération');

section('2. Déterminisme');
const a = nouvellePartie(987, { maintenant: 0 });
const b = nouvellePartie(987, { maintenant: 0 });
avancer(a, 500);
avancer(b, 500);
ok(serialiser(a) === serialiser(b), 'même graine → état identique après 500 h');
const c = nouvellePartie(988, { maintenant: 0 });
avancer(c, 500);
ok(serialiser(a) !== serialiser(c), 'graine différente → monde différent');

section('3. Sauvegarde / rechargement');
const s3 = nouvellePartie(4242, { maintenant: 0 });
avancer(s3, 300);
const txt = serialiser(s3);
const s3b = deserialiser(txt);
ok(serialiser(s3b) === txt, 'aller-retour JSON sans perte');
avancer(s3, 200);
avancer(s3b, 200);
ok(serialiser(s3) === serialiser(s3b), 'la sim reprend à l’identique après rechargement');

section('4. Simulation longue (3 000 h ≈ 125 jours)');
// On tique directement : le monde doit continuer de tourner même si l'escouade
// du joueur disparaît en route (c'est le cas limite qui casse les sims).
const s4 = nouvellePartie(777, { maintenant: 0 });
const t0 = process.hrtime.bigint();
for (let i = 0; i < 3000; i++) tick(s4);
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6;
const us = (ms * 1000) / 3000;

const usNorm = us / facteurMachine;

console.log(`  → ${ms.toFixed(0)} ms pour 3 000 ticks (${us.toFixed(0)} µs/tick, ` +
  `${usNorm.toFixed(0)} µs normalisés — machine ×${(1 / facteurMachine).toFixed(2)})`);
ok(usNorm < BUDGET_US, `tick sous ${BUDGET_US} µs (budget normalisé)`,
  `${usNorm.toFixed(0)} µs`);
// Le rattrapage maximal est le pire cas réel : deux ans hors ligne, rejoués
// d'un coup au chargement. Il doit rester de l'ordre de la seconde.
ok(usNorm * RATTRAPAGE_MAX / 1e6 < 2.5, 'rattrapage maximal sous 2,5 s',
  `${(usNorm * RATTRAPAGE_MAX / 1e6).toFixed(2)} s`);
verifierCoherence(s4, 'après 3 000 h');
ok(s4.temps === 3000, 'horloge à 3 000 h', `reçu ${s4.temps}`);

section('5. Le monde bouge tout seul');
const s5 = nouvellePartie(20240607, { maintenant: 0 });
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
const s6 = nouvellePartie(31337, { maintenant: 0 });
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
const s7 = nouvellePartie(5150, { maintenant: 0 });
s7.player.posture = 'prudent';
donnerOrdre(s7, { type: 'fouille' });
avancer(s7, 40);
// On mesure la récolte cumulée, pas le contenu du sac : perdre un combat en
// route vide le sac et ferait échouer un test qui n'a rien à voir.
ok(s7.stats.recolte > 0, 'fouiller rapporte des ressources', `${s7.stats.recolte} unités`);

const s7b = nouvellePartie(5151, { maintenant: 0 });
const depart = groupeActif(s7b).regionId;
const cible = s7b.world.colonies.find((c) => c.regionId !== depart);
const r = donnerOrdre(s7b, { type: 'voyage', dest: cible.regionId });
ok(r.ok, 'un itinéraire est calculable');
let bornes = 0;
while (groupeActif(s7b).regionId !== cible.regionId && bornes < 600) { tick(s7b); bornes++; }
ok(groupeActif(s7b).regionId === cible.regionId, 'le voyage aboutit', `${bornes} h`);
ok(s7b.world.regions[cible.regionId].decouvert, 'la région d’arrivée est découverte');

const s7c = nouvellePartie(5152, { maintenant: 0 });
const skillAvant = groupeActif(s7c).membres[0].skills.melee;
groupeActif(s7c).inventaire.rations = 500;
donnerOrdre(s7c, { type: 'entrainement', skill: 'melee' });
avancer(s7c, 200);
ok(groupeActif(s7c).membres[0].skills.melee > skillAvant, 'les compétences montent à l’usage',
  `${skillAvant} → ${groupeActif(s7c).membres[0].skills.melee}`);

section('8. Avant-poste : construction et recherche');
const s8 = nouvellePartie(60606, { maintenant: 0 });
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
  carburant: 100, biomasse: 150, alliage: 30,
});
groupeActif(s8).inventaire.rations = 400;
const c1 = lancerConstruction(s8, 'generateur');
ok(c1.ok, 'mise en file du générateur', c1.motif);
ok(s8.base.file.length === 1, 'la file contient un chantier');
avancer(s8, 60);
ok((s8.base.batiments.generateur || 0) >= 1, 'générateur construit', JSON.stringify(s8.base.batiments));
lancerConstruction(s8, 'hydroponie');
avancer(s8, 80);
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
const s9 = nouvellePartie(90909, { maintenant: 0 });
s9.player.posture = 'agressif';
donnerOrdre(s9, { type: 'patrouille' });
// On va chercher la bagarre dans une région dangereuse
const dangereuse = s9.world.regions.reduce((x, y) => (y.danger > x.danger ? y : x));
groupeActif(s9).regionId = dangereuse.i;
avancer(s9, 400);
ok(s9.stats.combats > 0, 'des combats ont eu lieu', `${s9.stats.combats}`);
const blesse = groupeActif(s9).membres.some((ch) => Object.values(ch.corps).some((p) => p.pv < p.max));
ok(blesse || s9.stats.combats === 0, 'les blessures sont localisées et persistent');
ok(groupeActif(s9).membres.every((ch) => ['ok', 'ko', 'mort'].includes(ch.etat)), 'états de personnage valides');
verifierCoherence(s9, 'après 400 h de patrouille agressive');

section('9 bis. Monde vivant sur la durée');
const s9b = nouvellePartie(31415, { maintenant: 0 });
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
const s9c = nouvellePartie(4242, { maintenant: 0 });
s9c.player.reputation.hexa = 40;
const eng = sEngager(s9c, 'hexa', () => {});
ok(eng.ok, 'on peut entrer au service d’une faction', eng.motif);
ok(rangDe(s9c.player.allegeance).def.nom === 'Affilié', 'on démarre au premier grade');
for (let i = 0; i < 8000; i++) tick(s9c);
ok(!!s9c.player.allegeance, 'la faction servie existe encore après 8 000 h');
const debout9c = DIPLO_FACTIONS.filter((k) => s9c.world.factions[k].colonies.length);
ok(debout9c.length === 6, 'aucune faction n’est rayée de la carte', `${debout9c.length}/6`);
ok(s9c.world.colonies.filter((c) => !c.ruine).length >= 10, 'le monde garde ses villes',
  `${s9c.world.colonies.filter((c) => !c.ruine).length}`);
const liens9c = groupeActif(s9c).membres.flatMap((c) => Object.values(c.liens || {}));
ok(liens9c.length === 0 || Math.max(...liens9c) < 100,
  'les liens d’escouade ne saturent pas', liens9c.join(','));
verifierCoherence(s9c, 'après 8 000 h au service d’une faction');

section('9 quater. Groupes, tâches individuelles, détachement');
const s9d = nouvellePartie(31415, { maintenant: 0 });
avancer(s9d, 60);
const g9 = groupeActif(s9d);
ok(groupes(s9d).length === 1, 'une partie démarre avec un seul groupe');
ok(tousLesMembres(s9d).length === 3, 'tous les membres sont dans un groupe', `${tousLesMembres(s9d).length}`);

// Tâche individuelle : un membre s'écarte de l'ordre du groupe.
donnerOrdre(s9d, { type: 'fouille' }, g9);
assignerTache(s9d, g9.membres[0], { type: 'chasse' });
ok(tacheDe(g9, g9.membres[0]).type === 'chasse', 'une tâche personnelle prime sur l’ordre du groupe');
ok(tacheDe(g9, g9.membres[1]).type === 'fouille', 'les autres suivent l’ordre du groupe');
donnerOrdre(s9d, { type: 'voyage', dest: (g9.regionId + 1) % 80 }, g9);
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
const destination = (detache.regionId + 3) % 80;
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
const s9f = nouvellePartie(999, { maintenant: 0 });
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

// Le plafond de groupes tient à l'antenne.
const s9e = nouvellePartie(2718, { maintenant: 0 });
ok(maxGroupes(s9e) === 2, 'deux groupes sans avant-poste', `${maxGroupes(s9e)}`);
s9e.base.fonde = true;
s9e.base.batiments = { antenne: 4 };
ok(maxGroupes(s9e) === 4, 'l’antenne autorise davantage de groupes', `${maxGroupes(s9e)}`);

section('9 quinquies. Information imparfaite');
const s9g = nouvellePartie(60606, { maintenant: 0 });
avancer(s9g, 40);
const gVue = groupeActif(s9g);
const colIci = s9g.world.colonies.find((c) => c.regionId === gVue.regionId);
const colLoin = s9g.world.colonies.find((c) => c.regionId !== gVue.regionId);

ok(!!colIci, 'on démarre dans une ville');
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
const s9h = nouvellePartie(70707, { maintenant: 0 });
const gOpt = groupeActif(s9h);
const voisine = s9h.world.regions.find((r) => distance(r.i, gOpt.regionId) === 1);
ok(!estSurveillee(s9h, voisine.i), 'sans optique, on ne voit que sous ses pieds');
s9h.base.recherche.optique = 1;
ok(estSurveillee(s9h, voisine.i), 'l’optique porte le regard d’une case');

// Servir une faction, c'est recevoir ses rapports.
const s9i = nouvellePartie(80808, { maintenant: 0 });
const colService = s9i.world.colonies.find((c) => c.regionId === groupeActif(s9i).regionId);
s9i.player.reputation[colService.faction] = 60;
sEngager(s9i, colService.faction, () => {});
s9i.player.allegeance.points = RANGS[1].points; // grade d'Agent
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
const s9j = nouvellePartie(90909, { maintenant: 0 });
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
const s9k = nouvellePartie(555, { maintenant: 0 });
const g9k = groupeActif(s9k);
g9k.inventaire.rations = 20000;
const avantMelee = g9k.membres.map((c) => c.skills.melee);
donnerOrdre(s9k, { type: 'entrainement', skill: 'melee' }, g9k);
const rationsEntrainement = g9k.inventaire.rations;
avancer(s9k, 100);
const gains = g9k.membres.map((c, i) => c.skills.melee - avantMelee[i]);
ok(gains.every((x) => x >= 2), 'cent heures d’entraînement se voient', gains.join(', '));
ok(rationsEntrainement - g9k.inventaire.rations > 50, 'et coûtent des vivres',
  `${Math.round(rationsEntrainement - g9k.inventaire.rations)} rations`);
ok(g9k.ordre.type === 'entrainement', 'l’ordre tient tant qu’il y a de quoi manger');

// Sans vivres, l'entraînement s'interrompt de lui-même plutôt que d'affamer.
const s9l = nouvellePartie(556, { maintenant: 0 });
const g9l = groupeActif(s9l);
g9l.inventaire.rations = 2;
donnerOrdre(s9l, { type: 'entrainement', skill: 'tir' }, g9l);
avancer(s9l, 30);
ok(g9l.ordre.type !== 'entrainement', 'sans rations, l’entraînement s’arrête');

// L'instructeur : un écart de niveau accélère l'élève.
const s9m = nouvellePartie(557, { maintenant: 0 });
const g9m = groupeActif(s9m);
g9m.inventaire.rations = 20000;
g9m.membres[0].skills.melee = 70;   // le vétéran
g9m.membres[1].skills.melee = 5;    // l'élève encadré
const s9n = nouvellePartie(557, { maintenant: 0 });
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
const s9o = nouvellePartie(558, { maintenant: 0 });
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
const s9p = nouvellePartie(559, { maintenant: 0 });
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
  const st = nouvellePartie(4321, { maintenant: 0 });
  const gt = groupeActif(st);
  gt.inventaire.rations = 55;
  const av = gt.membres[0].skills[skill];
  donnerOrdre(st, { type: ordre }, gt);
  avancer(st, 700); // ≈ un mois, dont environ deux tiers ouvrés
  const ap = gt.membres[0].skills[skill];
  ok(ap > av + 2, `${ordre} fait monter ${skill} de façon visible`, `${av} → ${ap}`);
}
// Le commerce et la médecine se pratiquent aussi, à leur rythme.
const s9q = nouvellePartie(4322, { maintenant: 0 });
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
const s9r = nouvellePartie(1717, { maintenant: 0 });
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

// Le diplôme accélère réellement la pratique, à situation égale.
const dipl = nouvellePartie(1818, { maintenant: 0 });
const gd = groupeActif(dipl);
const sans = nouvellePartie(1818, { maintenant: 0 });
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

section('10. Rattrapage hors ligne');
const s10 = nouvellePartie(1010, { maintenant: 1000000 });
s10.vitesse = 1; // le rattrapage dépend de la vitesse choisie
const res10 = rattraper(s10, 1000000 + TICK_MS * 100);
ok(res10.ticks === 100, '100 heures rattrapées après 100 pas de temps réel', `reçu ${res10.ticks}`);
ok(s10.temps === 100, 'horloge cohérente');
const res10b = rattraper(s10, 1000000 + TICK_MS * 100 + TICK_MS * 1e6);
ok(res10b.tronque, 'le rattrapage est plafonné');
ok(s10.temps <= 100 + RATTRAPAGE_MAX, 'plafond respecté', `t=${s10.temps}`);

// Le rattrapage étalé sert l'interface : il doit produire exactement le même
// monde que le rattrapage d'un bloc, quel que soit le découpage.
const bloc = nouvellePartie(2020, { maintenant: 500 });
bloc.vitesse = 1;
rattraper(bloc, 500 + TICK_MS * 600);
const etale = nouvellePartie(2020, { maintenant: 500 });
etale.vitesse = 1;
const pas10 = rattrapageEtale(etale, 500 + TICK_MS * 600, 37);
let tranches = 0;
while (pas10.pas()) tranches++;
ok(pas10.total === 600, 'rattrapage étalé : 600 heures planifiées', `reçu ${pas10.total}`);
ok(tranches > 5, 'découpé en plusieurs tranches', `${tranches} tranches`);
ok(serialiser(etale) === serialiser(bloc), 'étalé et d’un bloc donnent le même monde');

// Fermer la page en cours de rattrapage ne doit ni perdre ni rejouer le temps
// déjà passé : ce qui reste dû se retrouve au chargement suivant.
const coupe = nouvellePartie(2020, { maintenant: 500 });
coupe.vitesse = 1;
const pas10b = rattrapageEtale(coupe, 500 + TICK_MS * 600, 37);
pas10b.pas();
pas10b.pas();
const reste = rattraper(coupe, 500 + TICK_MS * 600);
ok(coupe.temps === 600, 'reprise après coupure : ni perte ni doublon', `t=${coupe.temps}`);
ok(reste.ticks === 600 - 74, 'le reste dû est exactement ce qui manquait', `reçu ${reste.ticks}`);

section('11. Robustesse : escouade décimée');
const s11 = nouvellePartie(1111, { maintenant: 0 });
for (const ch of groupeActif(s11).membres) ch.etat = 'mort';
avancer(s11, 50);
ok(s11.fin === 'extinction', 'fin de partie détectée');
ok(s11.temps <= 51, 'la sim s’arrête après la fin', `t=${s11.temps}`);

section('12. Robustesse : sac plein et famine');
const s12 = nouvellePartie(1212, { maintenant: 0 });
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
