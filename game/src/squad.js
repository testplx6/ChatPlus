// Résolution des ordres de l'escouade, heure par heure.

import { BIOMES, POSTURES, COMMODITIES, POI } from './data.js';
import { chemin, coutTraversee, decouvrir, nomRegion, colonieDe, distance } from './world.js';
import {
  comp, gagnerXp, estDebout, estVivant, tickPerso, nourrir, pvTotal,
} from './characters.js';
import {
  ajouterAuSac, tenterRencontre, tenterAlea, reputation, tenterChasseurs,
  inscrireAuMemorial,
} from './events.js';
import { poidsInventaire, capacitePortage } from './economy.js';
import { niveau as nivBat } from './base.js';
import { conditions } from './climat.js';

export const ORDRES = {
  repos: { nom: 'Repos', desc: 'Récupération, soins, rien d’autre.', effort: 0 },
  fouille: { nom: 'Fouiller', desc: 'Ratisser la région pour tout ce qui traîne.', effort: 1 },
  mine: { nom: 'Extraire', desc: 'Minerai et métaux, à la force du poignet.', effort: 1.2 },
  chasse: { nom: 'Chasser', desc: 'Biomasse et viande, de quoi manger.', effort: 1 },
  exploration: { nom: 'Explorer', desc: 'Lever la carte alentour et repérer les sites.', effort: 0.9 },
  entrainement: { nom: 'S’entraîner', desc: 'Progresser vite, consommer des vivres.', effort: 1.1 },
  patrouille: { nom: 'Patrouiller', desc: 'Chercher l’affrontement dans le secteur.', effort: 1.1 },
  voyage: { nom: 'En route', desc: 'Déplacement vers une région.', effort: 1 },
};

/**
 * Ce qu'un ordre rapporterait ici, par heure, avant compétences.
 * Sert à l'affichage : un bouton qui ne rend rien doit le dire avant le clic,
 * pas après six heures de travail.
 */
export function rendementPrevu(state, type, regionId = state.player.regionId) {
  const climat = conditions(state.world, state.temps);
  const r = state.world.regions[regionId];
  const biome = BIOMES[r.biome];
  const filtre = FILTRES[type];
  if (filtre === undefined) return null;
  const rendements = Object.assign({}, biome.yields);
  if (type === 'chasse') {
    rendements.biomasse = Math.max(rendements.biomasse || 0, r.biome === 'relais' ? 0.05 : 0.18);
  }
  const out = {};
  let total = 0;
  for (const k of Object.keys(rendements)) {
    if (filtre && !filtre.includes(k)) continue;
    const q = rendements[k] * r.richesse * (1 - Math.min(0.8, r.fouille)) * climat.rendement(k);
    if (q <= 0.001) continue;
    out[k] = q;
    total += q;
  }
  return { par: out, total };
}

// ---------------------------------------------------------------------------
// Ordres
// ---------------------------------------------------------------------------

export function donnerOrdre(state, ordre) {
  if (ordre.type === 'voyage') {
    const mods = { reductionVoyage: (state.base.recherche.logistique || 0) * 0.06 };
    const route = chemin(state.world, state.player.regionId, ordre.dest, mods);
    if (!route || !route.length) return { ok: false, motif: 'Aucune route.' };
    state.player.ordre = {
      type: 'voyage',
      dest: ordre.dest,
      route,
      etape: 0,
      progres: 0,
    };
    return { ok: true };
  }
  if (!ORDRES[ordre.type]) return { ok: false, motif: 'Ordre inconnu.' };
  state.player.ordre = Object.assign({}, ordre);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Récolte
// ---------------------------------------------------------------------------

const FILTRES = {
  fouille: null, // tout ce que le biome donne
  mine: ['minerai', 'ferraille', 'alliage', 'isotope'],
  chasse: ['biomasse'],
};

const SKILL_ORDRE = { fouille: 'ingenierie', mine: 'force', chasse: 'tir' };

function recolter(state, type, log, ctx) {
  const rng = ctx.rng;
  const regionId = state.player.regionId;
  const r = state.world.regions[regionId];
  const biome = BIOMES[r.biome];
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const skill = SKILL_ORDRE[type];
  const filtre = FILTRES[type];

  const travailleurs = state.player.squad.filter(estDebout);
  if (!travailleurs.length) return {};

  // Même un désert nourrit son homme, mal : la chasse a un plancher partout,
  // sinon un ordre parfaitement raisonnable rend zéro sans prévenir.
  const rendements = Object.assign({}, biome.yields);
  if (type === 'chasse') {
    rendements.biomasse = Math.max(rendements.biomasse || 0, r.biome === 'relais' ? 0.05 : 0.18);
  }

  const epuisement = 1 - Math.min(0.8, r.fouille);
  const recolte = {};
  for (const c of travailleurs) {
    const habilete = 0.45 + comp(c, skill) / 115;
    for (const k of Object.keys(rendements)) {
      if (filtre && !filtre.includes(k)) continue;
      const climatMult = ctx.climat ? ctx.climat.rendement(k) : 1;
      let q = rendements[k] * r.richesse * habilete * posture.rendement
        * epuisement * climatMult * rng.range(0.75, 1.25);
      // La saison amaigrit le gibier, elle ne le fait pas disparaître : sans ce
      // plancher, un hiver de cendre affame l'escouade où qu'elle aille.
      if (type === 'chasse' && k === 'biomasse') {
        q = Math.max(q, 0.16 * habilete * rng.range(0.8, 1.2));
      }
      recolte[k] = (recolte[k] || 0) + q;
    }
    gagnerXp(c, skill, 1.1);
    gagnerXp(c, 'endurance', 0.4);
  }
  // La chasse transforme une part de la biomasse en rations directes
  // Chasser, c'est manger : l'essentiel part en rations, pas en biomasse brute
  // qu'on ne saurait pas transformer sans avant-poste.
  if (type === 'chasse' && recolte.biomasse) {
    recolte.rations = (recolte.rations || 0) + recolte.biomasse * 0.7;
    recolte.biomasse *= 0.3;
  }

  // Épuisement local : rester camper au même endroit rapporte de moins en
  // moins. Assez lent pour laisser une région exploitable plusieurs semaines.
  r.fouille = Math.min(0.6, r.fouille + 0.0012 * travailleurs.length);

  // Les rendements horaires sont fractionnaires : sans report d'une heure sur
  // l'autre, tout ce qui rapporte moins d'une unité par heure rapporte zéro.
  const reste = state.player.reste || (state.player.reste = {});
  const bilan = state.player.bilan || (state.player.bilan = { res: {}, depuis: state.temps });
  let total = 0;
  const detail = [];
  for (const k of Object.keys(recolte)) {
    const cumul = (reste[k] || 0) + recolte[k];
    const q = Math.floor(cumul);
    reste[k] = cumul - q;
    if (q <= 0) continue;
    const pris = ajouterAuSac(state, k, q);
    reste[k] += q - pris; // sac plein : on ne jette pas, on garde en attente
    if (pris > 0) {
      total += pris;
      bilan.res[k] = (bilan.res[k] || 0) + pris;
      detail.push(`${pris} ${COMMODITIES[k].nom.toLowerCase()}`);
    }
  }
  if (total > 0) {
    state.stats.recolte += total;
    state.player.recolteHeure = detail.join(', ');
  } else {
    state.player.recolteHeure = null;
  }
  return recolte;
}

// ---------------------------------------------------------------------------
// Exploration
// ---------------------------------------------------------------------------

/**
 * Lève la carte de proche en proche et fait apparaître les sites. Sans ça,
 * la carte reste un grand rectangle noir et rien n'invite à bouger.
 */
function explorer(state, log, ctx) {
  const rng = ctx.rng;
  const debout = state.player.squad.filter(estDebout);
  if (!debout.length) return;

  let portee = 2 + (state.base.recherche.optique || 0);
  const meilleur = Math.max(...debout.map((c) => comp(c, 'furtivite')));
  if (meilleur > 45) portee += 1;

  // La région du dessous d'abord : on remarque ce qu'on a sous les pieds.
  const ici = state.world.regions[state.player.regionId];
  if (ici.site && !ici.site.connu) {
    ici.site.connu = true;
    log({
      type: 'site',
      texte: `Site repéré sur place : ${POI[ici.site.type].nom}.`,
      important: true,
      regionId: ici.i,
    });
  }

  // Puis on repousse le noir, une case à la fois.
  const candidates = state.world.regions
    .filter((r) => !r.decouvert && distance(r.i, state.player.regionId) <= portee)
    .sort((a, b) => distance(a.i, state.player.regionId) - distance(b.i, state.player.regionId));

  if (candidates.length) {
    const vue = ctx.climat ? ctx.climat.vue : 1;
    const combien = rng.chance(Math.max(0.08, Math.min(0.9, 0.55 * vue))) ? 1 : 0;
    for (let k = 0; k < combien && k < candidates.length; k++) {
      const r = candidates[k];
      r.decouvert = true;
      if (r.site && rng.chance(0.7)) {
        r.site.connu = true;
        log({
          type: 'site',
          texte: `${POI[r.site.type].nom} repéré en ${nomRegion(state.world, r.i)}.`,
          important: true,
          regionId: r.i,
        });
      }
    }
  } else if (rng.chance(0.02)) {
    log({ type: 'exploration', texte: 'Plus rien à lever dans ce secteur.', regionId: ici.i, discret: true });
  }

  for (const c of debout) {
    gagnerXp(c, 'furtivite', 0.9);
    gagnerXp(c, 'endurance', 0.6);
  }
}

// ---------------------------------------------------------------------------
// Soins
// ---------------------------------------------------------------------------

function qualiteSoin(state, auRepos) {
  const debout = state.player.squad.filter(estDebout);
  let medic = 0;
  for (const c of debout) medic = Math.max(medic, comp(c, 'medecine'));
  let q = 0.25 + medic / 90;
  q *= 1 + (state.base.recherche.medecine || 0) * 0.25;
  if (state.base.fonde && state.player.regionId === state.base.regionId) {
    q *= 1 + nivBat(state.base, 'infirmerie') * 0.35;
  }
  if (!auRepos) q *= 0.35;
  return q;
}

/** Consomme un medkit sur le plus mal en point si ça vaut le coup. */
function utiliserMedkit(state, log, ctx) {
  if ((state.player.inventaire.medkit || 0) < 1) return;
  const blesses = state.player.squad.filter((c) => estVivant(c) && (pvTotal(c).pct < 0.55 || c.sang > 20));
  if (!blesses.length) return;
  const cible = blesses.reduce((a, b) => (pvTotal(a).pct <= pvTotal(b).pct ? a : b));
  state.player.inventaire.medkit -= 1;
  cible.sang = 0;
  for (const p of Object.keys(cible.corps)) {
    const part = cible.corps[p];
    part.pv = Math.min(part.max, part.pv + part.max * 0.22);
  }
  const soigneur = state.player.squad.filter(estDebout)
    .reduce((a, b) => (!a || comp(b, 'medecine') > comp(a, 'medecine') ? b : a), null);
  if (soigneur) gagnerXp(soigneur, 'medecine', 3);
  if (cible.etat === 'ko' && pvTotal(cible).pct > 0.45) {
    cible.etat = 'ok';
    cible.koHeures = 0;
  }
  log({ type: 'soin', texte: `Medkit utilisé sur ${cible.nom}.`, discret: true });
}

// ---------------------------------------------------------------------------
// Voyage
// ---------------------------------------------------------------------------

function avancerVoyage(state, log, ctx) {
  const o = state.player.ordre;
  const debout = state.player.squad.filter(estDebout);
  if (!debout.length) return;

  // Vitesse dictée par le plus lent, alourdie par le sac et les K.O. portés
  let vitesse = Infinity;
  for (const c of debout) {
    const v = 0.5 + comp(c, 'endurance') / 90;
    vitesse = Math.min(vitesse, v);
  }
  const cap = Math.max(1, capacitePortage(state));
  const charge = poidsInventaire(state.player.inventaire) / cap;
  vitesse *= 1 - Math.min(0.55, Math.max(0, charge - 0.6) * 0.9);
  const portes = state.player.squad.filter((c) => c.etat === 'ko').length;
  vitesse *= 1 - Math.min(0.5, portes * 0.18);
  vitesse = Math.max(0.15, vitesse);

  o.progres += vitesse;
  const prochaine = o.route[o.etape];
  const mods = { reductionVoyage: (state.base.recherche.logistique || 0) * 0.06 };
  // Le climat alourdit la marche, mais à moitié : le coût de base tient déjà
  // compte du terrain, et cumuler les deux pleinement immobilise l'escouade.
  const gene = ctx.climat ? 1 + (ctx.climat.marche - 1) * 0.6 : 1;
  const cout = coutTraversee(state.world, prochaine, mods) * gene;

  if (o.progres >= cout) {
    o.progres = 0;
    state.player.regionId = prochaine;
    o.etape++;
    const rayon = 1 + (state.base.recherche.optique || 0);
    decouvrir(state.world, prochaine, rayon);
    for (const c of debout) gagnerXp(c, 'endurance', 1.2);

    const col = colonieDe(state.world, prochaine);
    if (col) {
      log({
        type: 'voyage',
        texte: `Arrivée à ${col.nom} (${col.faction ? state.world.factions[col.faction].nom : 'sans maître'}).`,
        regionId: prochaine,
      });
    }
    if (o.etape >= o.route.length) {
      state.player.ordre = { type: 'repos' };
      log({
        type: 'voyage',
        texte: `Destination atteinte : ${nomRegion(state.world, prochaine)}.`,
        regionId: prochaine,
        important: true,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

export function tickSquad(state, log, ctx) {
  const rng = ctx.rng;
  const vivants = state.player.squad.filter(estVivant);
  if (!vivants.length) {
    if (!state.fin) {
      state.fin = 'extinction';
      log({ type: 'fin', texte: 'L’escouade a cessé d’exister. Fin de partie.', important: true });
    }
    return;
  }

  const ordre = state.player.ordre || { type: 'repos' };
  const def = ORDRES[ordre.type] || ORDRES.repos;
  let effort = def.effort;

  // Cycle jour/nuit : on campe la nuit, sauf en marche forcée. C'est ce qui
  // permet à la fatigue de redescendre — sans ça, elle se colle au plafond.
  const heure = state.temps % 24;
  const nuit = heure >= 22 || heure < 6;
  let travaille = true;
  if (nuit && ordre.type !== 'voyage') {
    travaille = false;
    effort = 0;
  } else if (nuit) {
    effort = 1.35; // marche de nuit : épuisant
  }
  state.player.nuit = nuit;

  // Personne debout : on ne fait que survivre
  const debout = state.player.squad.filter(estDebout);
  if (!debout.length) { effort = 0; travaille = false; }

  // --- Cohésion : une escouade au repos et bien nourrie se ressoude, une
  // escouade qui enchaîne les défaites se délite. Le moral suit.
  const p = state.player;
  if (p.cohesion === undefined) p.cohesion = 55;
  const affames = vivants.filter((c) => c.faim > 80).length;
  const ko = state.player.squad.filter((c) => c.etat === 'ko').length;
  let derive = 0.02;
  if (affames) derive -= 0.06 * affames;
  if (ko) derive -= 0.05 * ko;
  if (ordre.type === 'repos' && !affames) derive += 0.05;
  p.cohesion = Math.max(0, Math.min(100, p.cohesion + derive));
  for (const c of vivants) {
    // Le moral individuel tend vers la cohésion du groupe.
    c.moral = Math.max(0, Math.min(100, c.moral + (p.cohesion - c.moral) * 0.01));
  }

  // --- Nourriture : on mange dès qu'on a faim et de quoi
  for (const c of vivants) {
    if (c.faim > 42) {
      const dispo = state.player.inventaire.rations || 0;
      const mange = nourrir(c, dispo);
      if (mange > 0) state.player.inventaire.rations -= mange;
    }
  }

  // --- Exécution de l'ordre
  if (debout.length && travaille) {
    switch (ordre.type) {
      case 'voyage':
        avancerVoyage(state, log, ctx);
        break;
      case 'fouille':
      case 'mine':
      case 'chasse':
        recolter(state, ordre.type, log, ctx);
        break;
      case 'entrainement': {
        const skill = ordre.skill || 'melee';
        const cout = Math.ceil(debout.length / 2);
        if ((state.player.inventaire.rations || 0) >= cout) {
          state.player.inventaire.rations -= cout;
          for (const c of debout) {
            const av = c.skills[skill];
            gagnerXp(c, skill, 5.5);
            if (c.skills[skill] > av) {
              log({ type: 'progres', texte: `${c.nom} : ${skill} ${c.skills[skill]}.`, discret: true });
            }
          }
        } else {
          effort = 0.2;
          state.player.ordre = { type: 'repos' };
          log({ type: 'ordre', texte: 'Plus de rations : entraînement interrompu.', regionId: state.player.regionId });
        }
        break;
      }
      case 'exploration':
        explorer(state, log, ctx);
        break;
      case 'patrouille': {
        const f = state.world.regions[state.player.regionId].controle;
        if (f) reputation(state, f, 0.05);
        break;
      }
      default:
        break;
    }
  }

  // --- Aléas et rencontres
  const exposition = travaille ? 1 : 0.35;
  tenterAlea(state, log, ctx, exposition);
  if (!state.fin) tenterChasseurs(state, log, ctx);
  if (!state.fin) {
    let mult = ordre.type === 'patrouille' ? 2.4 : ordre.type === 'repos' ? 0.45 : 1;
    if (!travaille) mult *= 0.5; // camp de nuit, feu éteint
    tenterRencontre(state, log, ctx, mult);
  }

  // --- Soins et besoins
  const auRepos = effort <= 0.05;
  const q = qualiteSoin(state, auRepos);
  utiliserMedkit(state, log, ctx);
  for (const c of state.player.squad) {
    const msgs = tickPerso(c, effort, rng, { soin: q, premiersSecours: debout.length > 0 });
    for (const m of msgs) {
      log({ type: m.type, texte: m.texte, important: m.type === 'mort' });
      if (m.type === 'mort') {
        inscrireAuMemorial(state, c, 'mort en route', nomRegion(state.world, state.player.regionId));
      }
    }
  }

  // Bilan périodique : sans lui, une nuit de récolte ne laisse aucune trace
  // à l'écran et le jeu paraît ne rien faire.
  const bilan = state.player.bilan;
  if (bilan && state.temps - (bilan.depuis || 0) >= 6) {
    const lignes = Object.keys(bilan.res)
      .filter((k) => bilan.res[k] > 0)
      .sort((a, b) => bilan.res[b] - bilan.res[a])
      .map((k) => `${bilan.res[k]} ${COMMODITIES[k].nom.toLowerCase()}`);
    if (lignes.length) {
      log({
        type: 'recolte',
        texte: `Six heures de ${ORDRES[ordre.type] ? ORDRES[ordre.type].nom.toLowerCase() : 'travail'} : ${lignes.join(', ')}.`,
        regionId: state.player.regionId,
      });
    }
    state.player.bilan = { res: {}, depuis: state.temps };
  }

  // La région se régénère lentement de la fouille
  for (const r of state.world.regions) {
    if (r.fouille > 0) r.fouille = Math.max(0, r.fouille - 0.003);
  }

  // Fin de partie
  if (!state.player.squad.some(estVivant) && !state.fin) {
    state.fin = 'extinction';
    log({ type: 'fin', texte: 'L’escouade a cessé d’exister. Fin de partie.', important: true });
  }
}
