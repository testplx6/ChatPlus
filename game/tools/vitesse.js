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

/**
 * Le coût d'un tick, en microsecondes, pour un répertoire `src/` donné.
 *
 * La meilleure passe, pas la moyenne : le minimum est le seul agrégat qu'un
 * voisin bruyant ne peut que dégrader. Il approche le coût vrai par en dessous,
 * et il le fait de la même façon pour les deux révisions comparées.
 */
export async function mesurer(src, passes = 3, graine = 777) {
  const { nouvellePartie, tick } = await import(pathToFileURL(join(src, 'sim.js')).href);
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
  console.log((await mesurer(process.argv[2])).toFixed(1));
}

/**
 * Le verdict, séparé de la mesure pour être testable sans occuper la machine.
 *
 * Trois issues, et la troisième est celle qui manquait :
 *
 * - **instable** : les passes s'écartent trop pour qu'on conclue quoi que ce
 *   soit. On ne dit pas « c'est vert », on dit « remesurer » ;
 * - **au-dessus du budget** : le rapport au témoin dépasse ce qu'on s'autorise ;
 * - **tenu**.
 *
 * Le budget est un rapport, pas des microsecondes. Des microsecondes ne veulent
 * rien dire sans la machine qui les a rendues, et la machine de référence de ce
 * projet n'existe plus.
 */
export function verdict({ courant, temoin, budget, dispersion, dispersionMax = 0.15 }) {
  if (!(courant > 0) || !(temoin > 0)) {
    return { issue: 'illisible', dit: 'mesure manquante' };
  }
  if (dispersion > dispersionMax) {
    return {
      issue: 'instable',
      dit: `passes dispersées de ±${Math.round(dispersion * 100)} % — remesurer au calme`,
    };
  }
  const rapport = courant / temoin;
  const dit = `×${rapport.toFixed(2)} du témoin (${Math.round(courant)} contre `
    + `${Math.round(temoin)} µs, même machine, même minute)`;
  if (rapport > budget) {
    return { issue: 'depasse', rapport, dit: `${dit} — budget ×${budget}` };
  }
  return { issue: 'tenu', rapport, dit };
}
