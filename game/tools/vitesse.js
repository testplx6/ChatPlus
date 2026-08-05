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
 * Le verdict. Deux gardes, calibrées sur ce que l'instrument sait réellement
 * mesurer — c'est la deuxième leçon de cette histoire, et elle a coûté deux
 * protocoles.
 *
 * **Ce que l'instrument ne sait pas faire.** Comparer deux révisions rend
 * ×1,17 sur du code identique en deux processus (la variance machine va de 94
 * à 126 µs pour la même chose), et ×0,86 entrelacé dans un seul processus —
 * V8 compile et optimise deux graphes de modules séparément, et inégalement.
 * Allonger les fenêtres à 12 000 ticks n'y change rien. La résolution est
 * d'une dizaine de pour cent, pas de trois. Un seuil de non-régression à +3 %
 * aurait clignoté au rouge sans qu'une ligne ait changé.
 *
 * L'ancienne — « le tick ne dépasse pas ×1,55 du témoin historique » — était ma
 * traduction arithmétique de « 110 µs », un nombre hérité d'une machine qui
 * n'existe plus, mesuré contre un monde qui n'avait ni ménages, ni crédit, ni
 * monnaie. À ×1,69 contre ×1,55, l'écart vécu par le joueur valait **26
 * millisecondes sur une nuit d'absence**. Un seuil que rien ne justifie apprend
 * à ignorer le rouge, ce qui est pire que pas de seuil du tout.
 *
 * Ce qui le remplace, et qui tient dans la résolution :
 *
 * - **le plafond vécu** : le rattrapage maximal (`RATTRAPAGE_MAX` heures d'un
 *   coup, au retour d'une longue absence) reste sous `plafondMs`. Absolu, donc
 *   pas de second graphe de modules à comparer ; le minimum de plusieurs
 *   passes l'approche par en dessous ; une machine lente rend un verdict
 *   pessimiste, jamais complaisant. Marge actuelle : 1,82 s pour 2,50 s ;
 * - **la non-régression grossière** : le tick ne dépasse pas `rapportMax` fois
 *   `vitesse.us` de `CIBLES.json`, un chiffre relevé à la livraison précédente
 *   et avancé délibérément. À ×1,25 elle n'attrape pas une dérive de 5 % — mais
 *   elle attrape ce qui arrive vraiment : une boucle quadratique introduite
 *   sans qu'on s'en aperçoive. Ce chiffre est propre à la machine qui l'a
 *   relevé : changer de machine oblige à le relever de nouveau.
 *
 * Plus l'aveu d'instabilité, qui reste : des passes dispersées ne rendent pas
 * un verdict, elles demandent qu'on remesure.
 */
export function verdict({
  courant, dispersion, usReference, rapportMax = 1.25, dispersionMax = 0.15,
  rattrapageMax = 17000, plafondMs = 2500,
}) {
  if (!(courant > 0)) return { issue: 'illisible', dit: 'mesure manquante' };
  if (dispersion > dispersionMax) {
    return {
      issue: 'instable',
      dit: `passes dispersées de ±${Math.round(dispersion * 100)} % — remesurer au calme`,
    };
  }
  const rattrapage = courant * rattrapageMax / 1000;
  const rapport = usReference > 0 ? courant / usReference : 0;
  const dit = `rattrapage max ${(rattrapage / 1000).toFixed(2)} s `
    + `(${Math.round(courant)} µs/tick, ×${rapport.toFixed(2)} de la livraison précédente)`;
  if (rattrapage > plafondMs) {
    return { issue: 'lent', rapport, rattrapage, dit: `${dit} — plafond ${plafondMs / 1000} s` };
  }
  if (rapport > rapportMax) {
    return { issue: 'regression', rapport, rattrapage, dit: `${dit} — seuil ×${rapportMax}` };
  }
  return { issue: 'tenu', rapport, rattrapage, dit };
}
