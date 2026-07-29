// Banc d'équilibrage : un bot « joueur raisonnable » joue plusieurs parties
// complètes et on regarde s'il survit, progresse, et finit par tenir debout.
// Ce n'est pas un test de régression stricte — c'est un thermomètre.

import { nouvellePartie, tick } from '../src/sim.js';
import { donnerOrdre } from '../src/squad.js';
import { estVivant, estDebout, comp, pvTotal } from '../src/characters.js';
import { colonieDe, colonieParId, distance } from '../src/world.js';
import {
  acheter, vendre, poidsInventaire, capacitePortage, acheterItem, prixItem,
} from '../src/economy.js';
import { accepter, progres as progresContrat, MAX_CONTRATS } from '../src/contrats.js';
import {
  sEngager, peutSEngager, rangDe, avancementOrdre,
} from '../src/allegeance.js';
import { ITEMS } from '../src/data.js';
import { saison } from '../src/climat.js';
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
    if (c.ruine) continue; // une ville morte ne vend rien
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

  // En ville : on vend le surplus, on refait les vivres, on s'équipe, on prend
  // du travail. C'est ce que ferait un joueur qui regarde ses écrans.
  if (colIci) {
    // Ne jamais vendre ce qu'un contrat en cours réclame : c'est exactement
    // l'erreur que ferait un joueur distrait, et elle doit se voir au banc.
    const reserves = new Set(p.contrats.filter((c) => c.ressource).map((c) => c.ressource));
    const ordreEnCours = p.allegeance && p.allegeance.ordre;
    if (ordreEnCours && ordreEnCours.ressource) reserves.add(ordreEnCours.ressource);
    for (const k of COMMODITY_KEYS) {
      if (k === 'rations' || k === 'medkit' || reserves.has(k)) continue;
      const q = p.inventaire[k] || 0;
      if (q > 0) vendre(state, colIci, k, q);
    }
    // On voit venir la saison : on ne part pas en hiver avec trois boîtes.
    const cible = saison(state.temps).key === 'pluies' || saison(state.temps).key === 'accalmie' ? 190 : 120;
    if (rations < cible && p.credits > 200) acheter(state, colIci, 'rations', cible - rations);
    if ((p.inventaire.medkit || 0) < 3 && p.credits > 400) acheter(state, colIci, 'medkit', 2);

    // Achat d'équipement : on remplace ce qui est moins bon que l'étal.
    if (colIci.etal && p.credits > 900) {
      colIci.etal.items.forEach((ligne, i) => {
        if (ligne.qte < 1 || p.credits < 900) return;
        const it = ITEMS[ligne.key];
        const pire = p.squad.find((c) => {
          if (!estVivant(c)) return false;
          if (it.type === 'arme') {
            const a = c.equip.arme && ITEMS[c.equip.arme];
            return !a || a.degats < it.degats;
          }
          if (it.type === 'armure') {
            const a = c.equip.armure && ITEMS[c.equip.armure];
            return !a || a.armure < it.armure;
          }
          return false;
        });
        if (!pire) return;
        if (acheterItem(state, colIci, i).ok) {
          const key = p.objets.pop();
          const slot = ITEMS[key].type === 'arme' ? 'arme' : 'armure';
          const ancien = pire.equip[slot];
          pire.equip[slot] = key;
          if (ancien) p.objets.push(ancien);
        }
      });
    }

    // S'engager dès qu'une faction accepte : la solde et la remise valent
    // largement le prix de quelques ordres à honorer.
    if (!p.allegeance && peutSEngager(state, colIci.faction).ok) {
      sEngager(state, colIci.faction, () => {});
    }

    // On prend ce qu'on peut tenir : collecte et prime se remplissent en jouant.
    if (colIci.contrats && p.contrats.length < MAX_CONTRATS - 1) {
      const faisable = colIci.contrats.find((c) => c.type === 'collecte' || c.type === 'prime');
      if (faisable) accepter(state, colIci, faisable.id, () => {});
    }
  }

  // Blessés ou épuisés : on se pose — mais pas au point de mourir de faim en
  // convalescence. Se reposer sans vivres est le meilleur moyen de ne jamais
  // se relever.
  const vivants = p.squad.filter(estVivant);
  const mal = vivants.filter((c) => !estDebout(c) || pvTotal(c).pct < 0.6).length;
  if (mal > 0 && rations > 50) {
    if (p.ordre.type !== 'repos') donnerOrdre(state, { type: 'repos' });
    return;
  }

  // Honorer l'ordre de mission : c'est le chemin le plus rentable du jeu.
  const o = p.allegeance && p.allegeance.ordre;
  if (o && p.ordre.type !== 'voyage' && rations > 40) {
    const av = avancementOrdre(state, o);
    if (o.type === 'ravitaillement' && av && av.fait >= o.quantite) {
      const col = colonieParId(state.world, o.colonieId);
      if (col && !col.ruine && col.regionId !== p.regionId) {
        donnerOrdre(state, { type: 'voyage', dest: col.regionId });
        return;
      }
    }
    if (o.type === 'reconnaissance' && !state.world.regions[o.regionId].decouvert) {
      donnerOrdre(state, { type: 'voyage', dest: o.regionId });
      return;
    }
  }

  // Sac plein, ou réserves au plus bas et de quoi payer : on rentre en ville.
  const besoinVille = charge > 0.85 || (rations < 45 && p.credits > 300);
  if (besoinVille && !colIci) {
    const col = colonieLaPlusProche(state);
    if (col && p.ordre.type !== 'voyage') donnerOrdre(state, { type: 'voyage', dest: col.regionId });
    return;
  }
  if (p.ordre.type === 'voyage') return;

  // On ne laisse pas les réserves tomber au plus bas avant de réagir : à 30
  // rations il est déjà trop tard si le biome ne nourrit personne.
  if (rations < 90) {
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
    contrats: state.stats.contratsRemplis || 0,
    grade: state.player.allegeance ? rangDe(state.player.allegeance).def.nom.slice(0, 9) : '—',
    ordres: state.stats.ordresRemplis || 0,
    guerres: state.world.guerres.length,
    captures: state.world.colonies.reduce((t, c) => t + (c.prises || 0), 0),
  });
}

const largeur = { seed: 8, t: 6, fin: 11, viv: 5, cr: 7, wl: 7, comp: 5, contrats: 9, grade: 10, ordres: 7, guerres: 8, captures: 9 };
const entetes = Object.keys(largeur);
console.log(entetes.map((k) => k.padStart(largeur[k])).join(' '));
for (const l of lignes) {
  console.log(entetes.map((k) => String(l[k]).padStart(largeur[k])).join(' '));
}

console.log('='.repeat(52));
console.log(`Escouades encore vivantes après ${HEURES} h : ${survivants}/${PARTIES}`);
const moy = (k) => Math.round(lignes.reduce((s, l) => s + (typeof l[k] === 'number' ? l[k] : 0), 0) / lignes.length);
console.log(`Crédits moyens : ${moy('cr')} — compétence de combat moyenne : ${moy('comp')}`);
console.log(`Récolte moyenne : ${moy('recolte')} unités — contrats remplis : ${moy('contrats')}`);
console.log(`Colonies prises et reprises dans le monde : ${moy('captures')} en moyenne`);

if (survivants === 0) {
  console.log('\nALERTE : aucune escouade ne survit. Le jeu est injouable en l’état.');
  process.exit(1);
}
