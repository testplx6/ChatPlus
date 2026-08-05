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

// Lancé comme commande : une mesure, un processus, un nombre. C'est nécessaire,
// pas décoratif — mesurer les deux révisions dans le même processus les fait se
// réchauffer l'une l'autre. Relevé : 216, 157, 132 µs pour trois mesures
// identiques du même code, dans l'ordre, sans que rien ne change. Le compilateur
// à la volée garde de l'élan d'une mesure à l'autre et la seconde révision
// mesurée en profite.
if (process.argv[1] && process.argv[1].endsWith('vitesse.js') && process.argv[2]) {
  const us = await mesurer(process.argv[2]);
  console.log(`${us.toFixed(1)} ${rattrapageMaxLu()}`);
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
