// Résolution de combat au tour par tour, déterministe.
// Personne ne meurt d'un coup : on tombe K.O., puis on peut être achevé,
// capturé, ou laissé pour mort — la nuance Kenshi.

import { ITEMS, BIOMES } from './data.js';
import {
  comp, blesser, tirerMembre, armureTotale, estDebout, estVivant, pvTotal,
  gagnerXp, makeCharacter,
} from './characters.js';

// ---------------------------------------------------------------------------
// Génération d'opposants
// ---------------------------------------------------------------------------

const BANDES = {
  essaim: { nom: 'Meute de l’Essaim', archetypes: ['brute', 'chasseur'], niveau: 1, letal: 0.55 },
  ombrelle: { nom: 'Racketteurs Ombrelle', archetypes: ['courtier', 'chasseur', 'brute'], niveau: 0, letal: 0.15 },
  cendre: { nom: 'Patrouille de Cendre', archetypes: ['brute', 'chasseur'], niveau: 1, letal: 0.3 },
  hexa: { nom: 'Sécurité Hexa', archetypes: ['chasseur', 'brute'], niveau: 1, letal: 0.2 },
  signal: { nom: 'Prêcheurs du Signal', archetypes: ['brute', 'medic'], niveau: 0, letal: 0.4 },
  rouilleurs: { nom: 'Bande de Rouilleurs', archetypes: ['ferrailleur', 'brute'], niveau: 0, letal: 0.2 },
  libres: { nom: 'Milice de commune', archetypes: ['chasseur', 'ferrailleur'], niveau: 0, letal: 0.1 },
  bandits: { nom: 'Pillards', archetypes: ['brute', 'chasseur', 'eclaireur'], niveau: 0, letal: 0.25 },
};

const ARMES_PAR_NIVEAU = [
  ['barre', 'clous'],
  ['machette', 'clous', 'verrou'],
  ['katana', 'verrou', 'smg'],
  ['katana', 'smg', 'rail', 'masse'],
];

const ARMURES_PAR_NIVEAU = [
  [null, null, 'cuir'],
  [null, 'cuir', 'plaque'],
  ['cuir', 'plaque', 'kevlar'],
  ['plaque', 'kevlar', 'exo'],
];

export function genererBande(rng, factionKey, taille, niveauMonde = 0) {
  const def = BANDES[factionKey] || BANDES.bandits;
  const niv = Math.max(0, Math.min(3, def.niveau + niveauMonde));
  const membres = [];
  for (let i = 0; i < taille; i++) {
    const c = makeCharacter(rng, {
      archetype: rng.pick(def.archetypes),
      niveau: niv,
    });
    c.equip.arme = rng.pick(ARMES_PAR_NIVEAU[niv]);
    c.equip.armure = rng.pick(ARMURES_PAR_NIVEAU[niv]);
    c.faction = factionKey;
    membres.push(c);
  }
  return { nom: def.nom, faction: factionKey, membres, letal: def.letal };
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

function armeDe(c) {
  return (c.equip.arme && ITEMS[c.equip.arme]) || { degats: 4, pen: 0, portee: 'melee', comp: 'melee' };
}

function scoreAttaque(c, arme, bonus) {
  const skill = arme.comp === 'tir' ? 'tir' : 'melee';
  const base = comp(c, skill);
  const dex = comp(c, 'endurance') * 0.15;
  return base + dex + (bonus || 0);
}

function scoreDefense(c) {
  return comp(c, 'melee') * 0.35 + comp(c, 'endurance') * 0.35 + comp(c, 'furtivite') * 0.2 + 8;
}

function ciblesValides(camp) {
  return camp.filter((c) => estDebout(c));
}

function forceCamp(camp) {
  let f = 0;
  for (const c of camp) {
    if (!estDebout(c)) continue;
    const a = armeDe(c);
    f += (comp(c, a.comp === 'tir' ? 'tir' : 'melee') + a.degats * 2 + armureTotale(c)) * pvTotal(c).pct;
  }
  return f;
}

/**
 * Résout un affrontement entre deux camps de personnages.
 *
 * ctx : {
 *   rng, biome, posture, bonusDegats, bonusArmure,
 *   letalA, letalB   (probabilité d'achever un K.O. adverse)
 * }
 *
 * Retourne { vainqueur:'A'|'B'|'nul', tours, journal:[], morts:[], koA, koB, fuite }
 */
export function resoudreCombat(campA, campB, ctx) {
  const rng = ctx.rng;
  const journal = [];
  const posture = ctx.posture || { degats: 1, fuite: 0.3 };
  const biome = BIOMES[ctx.biome];
  const couvert = biome ? (biome.cout > 5 ? 0.12 : 0.04) : 0.06;

  let tours = 0;
  let fuite = null;
  const maxTours = 24;

  const f0A = forceCamp(campA);
  const f0B = forceCamp(campB);

  while (tours < maxTours) {
    tours++;
    const vivA = ciblesValides(campA);
    const vivB = ciblesValides(campB);
    if (!vivA.length || !vivB.length) break;

    // Repli : le camp du joueur décroche s'il prend trop cher
    const ratioA = forceCamp(campA) / Math.max(1, f0A);
    const ratioB = forceCamp(campB) / Math.max(1, f0B);
    if (tours > 2 && ratioA < 0.45 && rng.chance(posture.fuite)) { fuite = 'A'; break; }
    if (tours > 2 && ratioB < 0.4 && rng.chance(0.35)) { fuite = 'B'; break; }

    const ordre = rng.shuffle(
      vivA.map((c) => ({ c, camp: 'A' })).concat(vivB.map((c) => ({ c, camp: 'B' })))
    );

    for (const acteur of ordre) {
      const c = acteur.c;
      if (!estDebout(c)) continue;
      const adverses = ciblesValides(acteur.camp === 'A' ? campB : campA);
      if (!adverses.length) break;

      const arme = armeDe(c);
      const bonusD = acteur.camp === 'A' ? (ctx.bonusDegats || 0) : 0;
      const bonusArm = acteur.camp === 'A' ? (ctx.bonusArmure || 0) : 0;
      const coups = arme.rafale || 1;

      for (let k = 0; k < coups; k++) {
        const cibles2 = ciblesValides(acteur.camp === 'A' ? campB : campA);
        if (!cibles2.length) break;
        // On vise de préférence le plus amoché : la simulation est cruelle.
        const cible = rng.chance(0.55)
          ? cibles2.reduce((a, b) => (pvTotal(a).pct <= pvTotal(b).pct ? a : b))
          : rng.pick(cibles2);

        const att = scoreAttaque(c, arme, acteur.camp === 'A' ? bonusD * 20 : 0);
        const def = scoreDefense(cible) * (1 + couvert);
        const p = Math.max(0.08, Math.min(0.94, 0.5 + (att - def) / (att + def + 30)));
        if (!rng.chance(p)) {
          if (rng.chance(0.25)) {
            journal.push({ t: 'rate', txt: `${c.nom} manque ${cible.nom}.` });
          }
          continue;
        }

        const membre = tirerMembre(rng);
        const arm = armureTotale(cible, acteur.camp === 'B' ? bonusArm : 0);
        const brut = arme.degats
          * rng.range(0.75, 1.3)
          * (1 + comp(c, 'force') / 260)
          * (acteur.camp === 'A' ? posture.degats * (1 + bonusD) : 1);
        // L'armure réduit fortement mais ne rend jamais invulnérable : sinon un
        // groupe blindé devient impossible à entamer avec de l'équipement de départ.
        const absorbe = arm * (1 - arme.pen) * 0.6;
        const net = Math.max(1.5, brut - absorbe * rng.range(0.5, 1.0));

        const letal = acteur.camp === 'A' ? (ctx.letalA || 0.08) : (ctx.letalB || 0.2);
        const res = blesser(cible, net, membre, rng, { letal: rng.chance(letal) });

        gagnerXp(c, arme.comp === 'tir' ? 'tir' : 'melee', 1.4 + net * 0.06);
        gagnerXp(cible, 'endurance', 0.7 + net * 0.03);

        if (res.mort) {
          c.kills++;
          journal.push({ t: 'mort', txt: `${c.nom} abat ${cible.nom}.` });
        } else if (res.membrePerdu) {
          journal.push({ t: 'membre', txt: `${cible.nom} perd un membre (${membre}).` });
        } else if (res.ko) {
          journal.push({ t: 'ko', txt: `${cible.nom} s’écroule sous les coups de ${c.nom}.` });
        } else if (journal.length < 40) {
          journal.push({ t: 'coup', txt: `${c.nom} touche ${cible.nom} (${Math.round(net)}).` });
        }
      }
    }
  }

  const deboutA = ciblesValides(campA).length;
  const deboutB = ciblesValides(campB).length;
  let vainqueur = 'nul';
  if (fuite === 'A') vainqueur = 'B';
  else if (fuite === 'B') vainqueur = 'A';
  else if (deboutA && !deboutB) vainqueur = 'A';
  else if (deboutB && !deboutA) vainqueur = 'B';

  return {
    vainqueur,
    tours,
    fuite,
    journal,
    koA: campA.filter((c) => c.etat === 'ko').length,
    koB: campB.filter((c) => c.etat === 'ko').length,
    mortsA: campA.filter((c) => c.etat === 'mort').length,
    mortsB: campB.filter((c) => c.etat === 'mort').length,
    survivantsB: campB.filter((c) => estVivant(c)).length,
  };
}

/** Butin ramassé sur une bande vaincue. */
export function butin(bande, rng) {
  const loot = {};
  const objets = [];
  let credits = 0;
  for (const m of bande.membres) {
    if (estDebout(m)) continue; // on ne dépouille pas ceux qui tiennent debout
    credits += rng.irange(4, 40);
    const add = (k, n) => { loot[k] = (loot[k] || 0) + n; };
    add('ferraille', rng.irange(1, 5));
    if (rng.chance(0.35)) add('rations', rng.irange(1, 3));
    if (rng.chance(0.2)) add('composant', rng.irange(1, 2));
    if (rng.chance(0.12)) add('medkit', 1);
    if (m.equip.arme && rng.chance(0.4)) objets.push(m.equip.arme);
    if (m.equip.armure && rng.chance(0.3)) objets.push(m.equip.armure);
  }
  return { loot, objets, credits };
}
