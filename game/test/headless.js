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
import { donnerOrdre } from '../src/squad.js';
import { fonderBase, lancerConstruction, lancerRecherche } from '../src/base.js';
import { estVivant } from '../src/characters.js';
import { colonieDe } from '../src/world.js';
import { acheter, vendre, prixJoueur } from '../src/economy.js';
import { sEngager, rangDe } from '../src/allegeance.js';

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
  for (const k of COMMODITY_KEYS) {
    if ((p.inventaire[k] || 0) < -0.001) pb = pb || `inventaire négatif ${k}`;
  }
  if (!w.regions[p.regionId]) pb = pb || 'joueur hors carte';
  for (const c of p.squad) {
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
ok(s1.player.squad.length === 3, 'escouade de départ à 3');
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
const depart = s7b.player.regionId;
const cible = s7b.world.colonies.find((c) => c.regionId !== depart);
const r = donnerOrdre(s7b, { type: 'voyage', dest: cible.regionId });
ok(r.ok, 'un itinéraire est calculable');
let bornes = 0;
while (s7b.player.regionId !== cible.regionId && bornes < 600) { tick(s7b); bornes++; }
ok(s7b.player.regionId === cible.regionId, 'le voyage aboutit', `${bornes} h`);
ok(s7b.world.regions[cible.regionId].decouvert, 'la région d’arrivée est découverte');

const s7c = nouvellePartie(5152, { maintenant: 0 });
const skillAvant = s7c.player.squad[0].skills.melee;
s7c.player.inventaire.rations = 500;
donnerOrdre(s7c, { type: 'entrainement', skill: 'melee' });
avancer(s7c, 200);
ok(s7c.player.squad[0].skills.melee > skillAvant, 'les compétences montent à l’usage',
  `${skillAvant} → ${s7c.player.squad[0].skills.melee}`);

section('8. Avant-poste : construction et recherche');
const s8 = nouvellePartie(60606, { maintenant: 0 });
// On se place sur une région vide adjacente
const vide = s8.world.regions.find((rg) => !rg.colonie);
s8.player.regionId = vide.i;
s8.player.inventaire.ferraille = 2000;
s8.player.inventaire.polymere = 500;
s8.player.inventaire.composant = 200;
s8.player.inventaire.minerai = 500;
s8.player.inventaire.carburant = 300;
s8.player.inventaire.biomasse = 500;
const fond = fonderBase(s8, () => {});
ok(fond.ok, 'fondation de l’avant-poste');
// On approvisionne l'entrepôt sans dépasser sa capacité, et on garde des
// rations dans le sac : une escouade affamée meurt et la partie s'arrête.
Object.assign(s8.base.stock, {
  ferraille: 300, polymere: 120, composant: 40, minerai: 120,
  carburant: 100, biomasse: 150, alliage: 30,
});
s8.player.inventaire.rations = 400;
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
s9.player.regionId = dangereuse.i;
avancer(s9, 400);
ok(s9.stats.combats > 0, 'des combats ont eu lieu', `${s9.stats.combats}`);
const blesse = s9.player.squad.some((ch) => Object.values(ch.corps).some((p) => p.pv < p.max));
ok(blesse || s9.stats.combats === 0, 'les blessures sont localisées et persistent');
ok(s9.player.squad.every((ch) => ['ok', 'ko', 'mort'].includes(ch.etat)), 'états de personnage valides');
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
const liens9c = s9c.player.squad.flatMap((c) => Object.values(c.liens || {}));
ok(liens9c.length === 0 || Math.max(...liens9c) < 100,
  'les liens d’escouade ne saturent pas', liens9c.join(','));
verifierCoherence(s9c, 'après 8 000 h au service d’une faction');

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
for (const ch of s11.player.squad) ch.etat = 'mort';
avancer(s11, 50);
ok(s11.fin === 'extinction', 'fin de partie détectée');
ok(s11.temps <= 51, 'la sim s’arrête après la fin', `t=${s11.temps}`);

section('12. Robustesse : sac plein et famine');
const s12 = nouvellePartie(1212, { maintenant: 0 });
s12.player.inventaire.rations = 0;
donnerOrdre(s12, { type: 'fouille' });
avancer(s12, 300);
ok(s12.player.squad.every((ch) => ch.faim <= 120), 'la faim reste bornée');
ok(s12.player.squad.some((ch) => ch.faim > 60) || s12.fin, 'la famine s’installe sans rations');
verifierCoherence(s12, 'sous famine');

// ===========================================================================
console.log('\n' + '='.repeat(42));
console.log(`${total - echecs}/${total} tests passés`);
if (echecs > 0) {
  console.log(`${echecs} ÉCHEC(S)`);
  process.exit(1);
}
console.log('Moteur opérationnel.');
