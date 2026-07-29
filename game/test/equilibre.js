// Banc d'équilibrage : un bot « joueur raisonnable » joue plusieurs parties
// complètes et on regarde s'il survit, progresse, et finit par tenir debout.
// Ce n'est pas un test de régression stricte — c'est un thermomètre.

import { nouvellePartie, tick } from '../src/sim.js';
import { donnerOrdre } from '../src/squad.js';
import { estVivant, estDebout, comp, pvTotal } from '../src/characters.js';
import { colonieDe, colonieParId, distance } from '../src/world.js';
import { acheter, vendre, poidsInventaire, capacitePortage } from '../src/economy.js';
import { COMMODITY_KEYS, BIOMES } from '../src/data.js';

const HEURES = Number(process.argv[2]) || 4000;
const PARTIES = Number(process.argv[3]) || 8;

/** Où trouver de quoi manger : on note les régions par rendement en nourriture. */
function scoreNourriture(state, i) {
  const r = state.world.regions[i];
  const y = BIOMES[r.biome].yields;
  return (y.biomasse || 0.18) * r.richesse * (1 - r.fouille);
}

function colonieLaPlusProche(state) {
  let best = null;
  let bestD = Infinity;
  for (const c of state.world.colonies) {
    const d = distance(state.player.regionId, c.regionId);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function jouer(state) {
  const p = state.player;
  const cap = capacitePortage(state);
  const charge = poidsInventaire(p.inventaire) / Math.max(1, cap);
  const rations = p.inventaire.rations || 0;
  const colIci = colonieDe(state.world, p.regionId);

  // En ville : on vend le surplus et on refait les vivres.
  if (colIci) {
    for (const k of COMMODITY_KEYS) {
      if (k === 'rations' || k === 'medkit') continue;
      const q = p.inventaire[k] || 0;
      if (q > 0) vendre(state, colIci, k, q);
    }
    if (rations < 80 && p.credits > 200) acheter(state, colIci, 'rations', 80 - rations);
    if ((p.inventaire.medkit || 0) < 3 && p.credits > 400) acheter(state, colIci, 'medkit', 2);
  }

  // Blessés ou épuisés : on se pose.
  const vivants = p.squad.filter(estVivant);
  const mal = vivants.filter((c) => !estDebout(c) || pvTotal(c).pct < 0.6).length;
  if (mal > 0 && rations > 15) {
    if (p.ordre.type !== 'repos') donnerOrdre(state, { type: 'repos' });
    return;
  }

  // Sac plein : direction la ville la plus proche.
  if (charge > 0.85 && !colIci) {
    const col = colonieLaPlusProche(state);
    if (col && p.ordre.type !== 'voyage') donnerOrdre(state, { type: 'voyage', dest: col.regionId });
    return;
  }
  if (p.ordre.type === 'voyage') return;

  // Vivres au plus bas : on chasse là où c'est le plus giboyeux du secteur.
  if (rations < 30) {
    const ici = scoreNourriture(state, p.regionId);
    let mieux = null;
    for (const r of state.world.regions) {
      if (distance(r.i, p.regionId) > 2 || !r.decouvert) continue;
      const s = scoreNourriture(state, r.i);
      if (s > ici * 1.6 && (!mieux || s > scoreNourriture(state, mieux.i))) mieux = r;
    }
    if (mieux) { donnerOrdre(state, { type: 'voyage', dest: mieux.i }); return; }
    if (p.ordre.type !== 'chasse') donnerOrdre(state, { type: 'chasse' });
    return;
  }

  // Sinon on ramasse ce qui se vend.
  if (p.ordre.type !== 'fouille') donnerOrdre(state, { type: 'fouille' });
}

console.log(`Banc d'équilibrage — ${PARTIES} parties × ${HEURES} h\n${'='.repeat(52)}`);

let survivants = 0;
const lignes = [];
for (let n = 0; n < PARTIES; n++) {
  const state = nouvellePartie(1000 + n * 7919, { maintenant: 0 });
  state.player.posture = 'neutre';
  for (let i = 0; i < HEURES; i++) {
    if (state.fin) break;
    if (i % 4 === 0) jouer(state);
    tick(state);
  }
  const viv = state.player.squad.filter(estVivant);
  if (!state.fin) survivants++;
  const skills = viv.length
    ? Math.round(viv.reduce((s, c) => s + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / viv.length)
    : 0;
  lignes.push({
    seed: 1000 + n * 7919,
    t: state.temps,
    fin: state.fin || '—',
    viv: `${viv.length}/${state.player.squad.length}`,
    cr: state.player.credits,
    wl: `${state.stats.combatsGagnes}/${state.stats.defaites}`,
    recolte: state.stats.recolte,
    comp: skills,
    guerres: state.world.guerres.length,
    captures: state.journal.filter((e) => e.type === 'capture').length,
  });
}

const largeur = { seed: 8, t: 6, fin: 11, viv: 5, cr: 7, wl: 7, recolte: 8, comp: 5, guerres: 8, captures: 9 };
const entetes = Object.keys(largeur);
console.log(entetes.map((k) => k.padStart(largeur[k])).join(' '));
for (const l of lignes) {
  console.log(entetes.map((k) => String(l[k]).padStart(largeur[k])).join(' '));
}

console.log('='.repeat(52));
console.log(`Escouades encore vivantes après ${HEURES} h : ${survivants}/${PARTIES}`);
const moy = (k) => Math.round(lignes.reduce((s, l) => s + (typeof l[k] === 'number' ? l[k] : 0), 0) / lignes.length);
console.log(`Crédits moyens : ${moy('cr')} — compétence de combat moyenne : ${moy('comp')}`);
console.log(`Récolte moyenne : ${moy('recolte')} unités — captures de colonies : ${moy('captures')}`);

if (survivants === 0) {
  console.log('\nALERTE : aucune escouade ne survit. Le jeu est injouable en l’état.');
  process.exit(1);
}
