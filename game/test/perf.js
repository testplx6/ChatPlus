// Le coût d'une heure de jeu.
//
// Le seul endroit qui sait mesurer un tick. `headless.js` s'en sert pour son
// garde-fou, et il tourne aussi tout seul quand on optimise :
//
//     node test/perf.js
//
// Deux disciplines, et il faut les deux :
//
//   la chauffe        deux cents heures avant de démarrer le chronomètre. Sans
//                     elle, on chronomètre la compilation du moteur.
//   le minimum de N   cinq passes, on garde la meilleure. Sans lui, une machine
//                     chargée double le résultat.
//
// Ce qui a été mesuré, quatre cœurs, trois brûleurs mémoire en fond :
//
//   une seule passe   +112 % sous charge
//   minimum de cinq    +15 % sous charge
//
// On avait longtemps supposé qu'un étalon *qui alloue* suivrait la contention
// mieux qu'un étalon arithmétique. C'est faux, et mesuré : sous les mêmes trois
// brûleurs, l'étalon arithmétique bouge de 3 %, celui qui alloue de 2 %, et le
// tick de 112 %. Aucun étalon ne rattrape ça — seul le minimum de plusieurs
// passes le fait. L'étalon reste donc pour ce qu'il sait faire, et rien
// d'autre : dire si ce processeur-ci est plus lent que celui de référence.
//
// ---------------------------------------------------------------------------
// Un piège, et il a failli passer
// ---------------------------------------------------------------------------
//
// La première version de cette mesure appelait `avancer(state, 3000)` puis
// divisait le temps écoulé par 3 000. Or `avancer` s'arrête net quand la partie
// se termine, et sur la graine 777 l'escouade meurt de faim au bout de 1 095
// heures : on divisait le coût de mille heures par trois mille. Résultat
// annoncé, 41 µs, soit la moitié du vrai chiffre — et une belle histoire toute
// prête sur des mesures historiques « gonflées par la chauffe », qui était
// fausse d'un bout à l'autre.
//
// D'où l'appel direct à `tick()` ici : il ne s'arrête pas, il ne juge pas, il
// joue l'heure. Et d'où la règle : **une mesure divise par le travail fait, pas
// par le travail demandé.**

import { Rng } from '../src/rng.js';
import { nouvellePartie, tick } from '../src/sim.js';

/** Ce que l'étalon coûte sur la machine de référence, en millisecondes. */
export const ETALON_MS = 25;

/** Heures jouées avant de démarrer le chronomètre, et heures chronométrées. */
export const CHAUFFE = 200;
export const MESURE = 3000;

/** Nombre de passes ; on garde la meilleure. */
const PASSES = 5;

/** La vitesse de ce processeur, rapportée à celui de référence. */
export function etalonnerMachine() {
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

/**
 * Le coût d'un tick, brut et normalisé. Rend aussi le dernier état joué : il a
 * `CHAUFFE + MESURE` heures au compteur et sert de sujet aux vérifications de
 * cohérence, ce qui évite de rejouer trois mille heures pour rien.
 */
export function mesurerTick(graine = 777) {
  const facteur = etalonnerMachine();
  let ms = Infinity;
  let dernier = null;
  for (let p = 0; p < PASSES; p++) {
    const st = nouvellePartie(graine, { maintenant: 0 });
    for (let i = 0; i < CHAUFFE; i++) tick(st);
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < MESURE; i++) tick(st);
    ms = Math.min(ms, Number(process.hrtime.bigint() - t0) / 1e6);
    dernier = st;
  }
  const us = (ms * 1000) / MESURE;
  return { ms, us, usNorm: us / facteur, facteur, etat: dernier };
}

// Lancé directement plutôt qu'importé : on imprime, pour un humain comme pour
// un script.
if (process.argv[1] && process.argv[1].endsWith('perf.js')) {
  const m = mesurerTick();
  console.log(`${m.ms.toFixed(0)} ms pour ${MESURE} ticks — ${m.us.toFixed(1)} µs/tick, `
    + `${m.usNorm.toFixed(1)} µs normalisés (machine ×${(1 / m.facteur).toFixed(2)})`);
}
