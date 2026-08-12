// La vitesse du tick, mesurée contre un témoin plutôt que contre une machine
// disparue.
//
// Ce fichier existe parce que la garde précédente se trompait de sens, et que
// c'est mesuré, pas supposé. Elle normalisait le coût d'un tick par un étalon
// arithmétique rapporté à « la machine de référence », puis refusait de
// conclure au-dessus de ×1,08. Deux relevés, sur la même révision :
//
//   machine calme, 13 % plus rapide que la référence (×1,13)
//     → 166 µs bruts, 187 normalisés, et la garde REFUSE de conclure ;
//   machine réellement chargée (×0,59)
//     → 235 µs bruts, 102 normalisés, et la garde DÉCLARE LE BUDGET TENU.
//
// Le second cas est le faux vert que la garde avait été écrite pour empêcher :
// sur une machine chargée l'étalon ralentit, le facteur s'effondre, et la
// normalisation divise le vrai coût par deux. Un seuil dans le mauvais sens ne
// se rattrape pas en le déplaçant.
//
// La sortie, c'est la règle de la maison : **une mesure sans témoin ne mesure
// rien.** On mesure la révision courante et une révision témoin dans la même
// minute, sur la même machine, en alternant les passes. Tout ce que la machine
// fait au chiffre, elle le fait aux deux, et le rapport s'en moque. Il ne reste
// aucun étalon à entretenir, aucune machine de référence à faire revivre.

import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

/** Heures jouées avant de démarrer le chronomètre, et heures chronométrées. */
export const CHAUFFE = 200;
export const MESURE = 3000;

/** Le plafond de rattrapage du moteur mesuré — lu chez lui, jamais recopié. */
let derniereRattrapageMax = 17000;
export const rattrapageMaxLu = () => derniereRattrapageMax;

/**
 * Le coût d'un tick, en microsecondes, pour un répertoire `src/` donné.
 *
 * La meilleure passe, pas la moyenne : le minimum est le seul agrégat qu'un
 * voisin bruyant ne peut que dégrader. Il approche le coût vrai par en dessous,
 * et il le fait de la même façon pour les deux révisions comparées.
 */
export async function mesurer(src, passes = 3, graine = 777) {
  const sim = await import(pathToFileURL(join(src, 'sim.js')).href);
  const { nouvellePartie, tick } = sim;
  derniereRattrapageMax = sim.RATTRAPAGE_MAX || 17000;
  let ms = Infinity;
  for (let p = 0; p < passes; p++) {
    const st = nouvellePartie(graine, { maintenant: 0 });
    for (let i = 0; i < CHAUFFE; i++) tick(st);
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < MESURE; i++) tick(st);
    ms = Math.min(ms, Number(process.hrtime.bigint() - t0) / 1e6);
  }
  return (ms * 1000) / MESURE;
}

/**
 * Le protocole A,B,B,A, en un seul endroit.
 *
 * Il vivait dans `verifier.js`, et `--sur` en aurait fait une deuxième copie.
 * Deux protocoles qui dérivent, c'est deux verdicts qui ne veulent pas dire la
 * même chose — la raison même pour laquelle `srcDeRevision` est partagé.
 *
 * `unProcessus` est fourni par l'appelant parce que le lanceur diffère : le
 * vérificateur a le sien, avec ses délais et sa capture.
 */
export function comparer(srcA, srcB, unProcessus, tours = 3) {
  const a = [];
  const b = [];
  const rapports = [];
  for (let i = 0; i < tours; i++) {
    const a1 = unProcessus(srcA); const b1 = unProcessus(srcB);
    const b2 = unProcessus(srcB); const a2 = unProcessus(srcA);
    a.push(a1, a2); b.push(b1, b2);
    rapports.push(a1 / b1, a2 / b2);
  }
  return {
    courant: Math.min(...a),
    temoin: Math.min(...b),
    dispersion: ecartMedian(rapports),
    rapports,
  };
}

/**
 * De combien les rapports s'écartent de leur milieu — l'écart médian, pas
 * l'étendue.
 *
 * La dispersion se mesure sur les RAPPORTS, pas sur les mesures brutes : ça,
 * c'était déjà juste. Mais elle se mesurait en `(max − min) / min`, et une
 * étendue sur six valeurs est décidée par une seule d'entre elles. Sur cette
 * machine, une passe sur six part régulièrement de 10 % — le voisin qui se
 * réveille — et l'étendue s'envole pendant que le verdict, lui, ne bouge pas :
 * il est pris sur les minimums, que rien ne peut tirer vers le bas.
 *
 * Éprouvé là où la réponse est connue d'avance, quatre relevés du code contre
 * lui-même, verdict attendu ×1,000 :
 *
 *     verdict rendu    étendue      écart médian
 *        1,005          ±17 %          ±5 %
 *        1,025          ±16 %          ±6 %
 *        0,978           ±9 %          ±3 %
 *        0,965          ±13 %          ±3 %
 *
 * Le verdict est bon à 3 % dans les quatre cas. L'étendue en refusait deux sur
 * quatre au seuil de 15 %, et le quatrième un jour sur deux au seuil de 25 % —
 * elle interdisait de conclure sur des mesures parfaitement bonnes, et c'est
 * ainsi qu'une garde devient du bruit qu'on apprend à ignorer. L'écart médian
 * suit ce que le verdict vaut vraiment.
 *
 * Ce n'est pas un seuil qu'on desserre : c'est un indicateur qu'on remplace,
 * parce que celui d'avant ne mesurait pas ce qu'on lui demandait.
 */
export function ecartMedian(valeurs) {
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const m = med(valeurs);
  return m > 0 ? med(valeurs.map((x) => Math.abs(x - m))) / m : 0;
}

// Lancé comme commande : une mesure, un processus, un nombre. C'est nécessaire,
// pas décoratif — mesurer les deux révisions dans le même processus les fait se
// réchauffer l'une l'autre. Relevé : 216, 157, 132 µs pour trois mesures
// identiques du même code, dans l'ordre, sans que rien ne change. Le compilateur
// à la volée garde de l'élan d'une mesure à l'autre et la seconde révision
// mesurée en profite.
//
// `--sur rev1,rev2,…` fait autre chose : il mesure chaque révision contre le
// témoin de `CIBLES.json`, avec le même protocole, et rend la colonne. C'est
// l'outil d'attribution — savoir *quelle livraison* a coûté quoi, plutôt que
// constater une dette cumulée sans propriétaire. Il n'existait pas, et c'est
// pour ça qu'un ×1,24 a pu s'accumuler sur vingt-huit commits sans que personne
// ne puisse dire d'où il venait.
if (process.argv[1] && process.argv[1].endsWith('vitesse.js') && process.argv[2]) {
  if (process.argv[2] === '--sur') {
    const { execFileSync } = await import('node:child_process');
    const { readFileSync } = await import('node:fs');
    const { srcDeRevision } = await import('./revision.js');
    const ici = new URL('.', import.meta.url).pathname;
    const cibles = JSON.parse(readFileSync(join(ici, '..', 'CIBLES.json'), 'utf8'));
    const base = srcDeRevision((cibles.vitesse || {}).temoin || '82636d8');
    const un = (src) => {
      const sortie = execFileSync('node', [join(ici, 'vitesse.js'), src], { encoding: 'utf8' });
      return Number(sortie.trim().split(/\s+/)[0]);
    };
    console.log(`témoin ${base.rev}\n`);
    console.log('  révision   rapport  dispersion  ce qu’elle a livré');
    for (const rev of (process.argv[3] || '').split(',').filter(Boolean)) {
      const { src, rev: court } = srcDeRevision(rev);
      const r = comparer(src, base.src, un);
      const titre = execFileSync('git', ['-C', join(ici, '..', '..'), 'log', '-1',
        '--format=%s', court], { encoding: 'utf8' }).trim().slice(0, 46);
      console.log(`  ${court.padEnd(9)} ×${(r.courant / r.temoin).toFixed(3)}`
        + `     ±${Math.round(r.dispersion * 100)} %      ${titre}`);
    }
  } else {
    const us = await mesurer(process.argv[2]);
    console.log(`${us.toFixed(1)} ${rattrapageMaxLu()}`);
  }
}

/**
 * Le verdict. Deux gardes, toutes deux adossées au rapport — et c'est la leçon
 * la plus chère de cette histoire, payée en trois protocoles.
 *
 * **Cette machine ralentit du simple au double toute seule.** Même code, même
 * repos : 109 µs par tick à un moment, 200 µs vingt minutes plus tard. Et
 * l'étalon arithmétique ne le voit pas — il reste à ×1,12 dans les deux cas.
 * Ce n'est pas la fréquence du processeur, c'est la mémoire, et un étalon qui
 * tient dans le cache ne peut pas la mesurer. Aucune garde absolue n'est donc
 * fiable ici : ni un budget en microsecondes, ni un plafond en secondes.
 *
 * **Ce qui marche, éprouvé sur du code identique** — la seule question dont la
 * réponse est connue d'avance, ×1,00 :
 *
 *     toujours A d'abord, min de 3    ->  ×1,17    biais de position
 *     entrelacé dans un seul procès   ->  ×0,86    V8 optimise deux graphes
 *                                                  de modules inégalement
 *     ALTERNÉ A,B,B,A, min de 6       ->  ×0,998   et pendant l'état lent
 *
 * Le rapport résout donc à moins d'un pour cent, parce que les deux révisions
 * subissent la même machine dans la même minute.
 *
 * Les deux gardes en découlent :
 *
 * - **la non-régression** : le rapport à la livraison précédente ne dépasse pas
 *   `rapportMax`. Serré, puisque le protocole le permet ;
 * - **le plafond vécu** : le rattrapage maximal (`RATTRAPAGE_MAX` heures d'un
 *   coup au retour d'une longue absence) reste sous `plafondMs` — jugé sur le
 *   coût *estimé*, `vitesse.us` de `CIBLES.json` corrigé par le rapport, et non
 *   sur la mesure du jour. C'est la seule contrainte que le joueur ressente, et
 *   la seule façon de la vérifier sans être à la merci de l'heure qu'il est.
 *
 * Plus l'aveu d'instabilité, qui attrape la contention en pointe : des passes
 * dispersées ne rendent pas un verdict, elles demandent qu'on remesure.
 */
export function verdict({
  courant, temoin, dispersion, usReference, rapportMax = 1.08, dispersionMax = 0.15,
  rattrapageMax = 17000, plafondMs = 2500,
}) {
  if (!(courant > 0) || !(temoin > 0)) return { issue: 'illisible', dit: 'mesure manquante' };
  if (dispersion > dispersionMax) {
    return {
      issue: 'instable',
      dit: `passes dispersées de ±${Math.round(dispersion * 100)} % — remesurer au calme`,
    };
  }
  const rapport = courant / temoin;
  // Le coût absolu ESTIMÉ : celui relevé au calme à la livraison précédente,
  // corrigé de ce que le code a changé depuis. Le rapport étant insensible à
  // l'état de la machine, l'estimation l'est aussi — ce qu'une mesure brute
  // n'est pas, sur une machine qui varie du simple au double.
  const estime = (usReference > 0 ? usReference : courant) * rapport;
  const rattrapage = estime * rattrapageMax / 1000;
  const dit = `rattrapage max ${(rattrapage / 1000).toFixed(2)} s `
    + `(${Math.round(estime)} µs/tick estimés, ×${rapport.toFixed(3)} de la livraison précédente)`;
  if (rattrapage > plafondMs) {
    return { issue: 'lent', rapport, estime, dit: `${dit} — plafond ${plafondMs / 1000} s` };
  }
  if (rapport > rapportMax) {
    return { issue: 'regression', rapport, estime, dit: `${dit} — seuil ×${rapportMax}` };
  }
  return { issue: 'tenu', rapport, estime, dit };
}
