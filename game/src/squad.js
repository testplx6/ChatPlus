// Résolution des ordres, heure par heure, groupe par groupe.
//
// Un groupe porte un ordre ; chaque membre peut lui préférer une tâche à lui.
// Le tick partitionne donc les gens debout par tâche effective et résout chaque
// paquet séparément — deux qui fouillent et un qui chasse, c'est deux récoltes.

import { BIOMES, POSTURES, COMMODITIES, POI, SKILLS } from './data.js';
import {
  chemin, coutTraversee, decouvrir, nomRegion, colonieDe, distance, damer,
  MANIERES_SIEGE,
  rendementRegion, porteeDe,
} from './world.js';
import {
  comp, gagnerXp, estDebout, estVivant, tickPerso, nourrir, pvTotal,
  tendreLien, lien, mods, XP_PRATIQUE, makeCharacter, ARCHETYPE_KEYS, LIENS,
} from './characters.js';
import { tickSiege, assiegeable, SIEGE } from './assaut.js';
import {
  ajouterAuSac, tenterRencontre, tenterAlea, tenterChasseurs,
  inscrireAuMemorial,
} from './events.js';
import { commettre } from './faits.js';
import { poidsInventaire, capacitePortage } from './economy.js';
import { niveau as nivBat, abriDe, savoir } from './base.js';
import { conditions } from './climat.js';
import {
  groupeActif, tacheDe, debout as deboutDe, vivants as vivantsDe, retirerGroupe,
  plafondCohesion, rendementCohesion, joignable,
} from './groupes.js';
import { renfortSoin } from './services.js';
import {
  tickBetes, lenteurAttelage, betesDe, appetitAttelage, conduite,
} from './betes.js';
import {
  tickPrisonniers, lenteurPrisonniers, prisonniersDe, RATION_PRISONNIER, capaciteGarde,
} from './justice.js';
import { lenteurDepouilles, poidsMoral, depouillesDe } from './depouilles.js';
import { garnison } from './allegeance.js';

export const ORDRES = {
  repos: { nom: 'Repos', desc: 'Récupération, soins, rien d’autre.', effort: 0 },
  fouille: { nom: 'Fouiller', desc: 'Ratisser la région pour tout ce qui traîne.', effort: 1 },
  mine: { nom: 'Extraire', desc: 'Minerai et métaux, à la force du poignet.', effort: 1.2 },
  chasse: { nom: 'Chasser', desc: 'Biomasse et viande, de quoi manger.', effort: 1 },
  exploration: { nom: 'Explorer', desc: 'Lever la carte alentour et repérer les sites.', effort: 0.9 },
  entrainement: { nom: 'S’entraîner', desc: 'Progresser vite — l’effort creuse la faim et la fatigue.', effort: 1.5 },
  patrouille: { nom: 'Patrouiller', desc: 'Chercher l’affrontement dans le secteur.', effort: 1.1 },
  voyage: { nom: 'En route', desc: 'Déplacement vers une région.', effort: 1 },
  // Le seul ordre qui ne rapporte rien au groupe : il rapporte au camp.
  //
  // Les métiers de l'avant-poste ne se remplissaient que d'habitants — des gens
  // anonymes qui arrivent tout seuls, au compte-gouttes, et dont le nombre est
  // plafonné par les lits. Votre escouade, elle, pouvait camper sur place des
  // mois entiers sans toucher une pelle : elle défendait les murs et supervisait
  // les postes, mais ne tenait aucun. « J'ai mon escouade mais elle ne peut même
  // pas travailler dans la base. » C'était exact.
  travaux: { nom: 'Travaux', desc: 'Se mettre au service du camp : bras en plus sur toutes les chaînes.', effort: 1 },
  // Tenir la place devant une ville (IMPLANTATIONS.md, M1c). Le seul ordre
  // dirigé contre quelqu'un : il use la garde d'en face, et il coûte des
  // blessés.
  siege: { nom: 'Siège', desc: 'Tenir la place devant une ville : sa garde s’use, et vous aussi.', effort: 1.2 },
};

/**
 * Ce qu'un ordre rapporterait ici, par heure, avant compétences.
 * Sert à l'affichage : un bouton qui ne rend rien doit le dire avant le clic,
 * pas après six heures de travail.
 */
export function rendementPrevu(state, type, regionId) {
  const g = groupeActif(state);
  const rid = regionId === undefined ? (g ? g.regionId : 0) : regionId;
  const climat = conditions(state.world, state.temps);
  const r = state.world.regions[rid];
  const biome = BIOMES[r.biome];
  const filtre = FILTRES[type];
  if (filtre === undefined) return null;
  const rendements = rendementRegion(state.world, r.i);
  if (type === 'chasse') {
    rendements.biomasse = Math.max(rendements.biomasse || 0, r.biome === 'relais' ? 0.05 : 0.18);
  }
  const out = {};
  let total = 0;
  for (const k of Object.keys(rendements)) {
    if (filtre && !filtre.includes(k)) continue;
    const q = rendements[k] * r.richesse * (1 - r.fouille) * climat.rendement(k);
    if (q <= 0.001) continue;
    out[k] = q;
    total += q;
  }
  return { par: out, total };
}

// ---------------------------------------------------------------------------
// Ordres
// ---------------------------------------------------------------------------

export function donnerOrdre(state, ordre, groupe) {
  const g = groupe || groupeActif(state);
  if (!g) return { ok: false, motif: 'Aucun groupe.' };
  // On ne commande pas ce qu'on ne peut pas joindre. Un groupe hors de portée
  // n'est pas perdu : il continue son dernier ordre jusqu'à ce qu'on le
  // rattrape, ou qu'on monte l'antenne. C'est ce qui remplace le plafond de
  // quatre groupes — rien n'empêche d'en faire six, il faut pouvoir leur
  // parler.
  const port = joignable(state, g);
  if (!port.ok) return port;
  if (ordre.type === 'voyage') {
    const m = { reductionVoyage: savoir(state, 'logistique') * 0.06 };
    const route = chemin(state.world, g.regionId, ordre.dest, m);
    if (!route || !route.length) return { ok: false, motif: 'Aucune route.' };
    g.ordre = {
      type: 'voyage', dest: ordre.dest, route, etape: 0, progres: 0,
      // « normale » : on campe la nuit. « forcee » : on marche, et on le paie.
      allure: ordre.allure === 'forcee' ? 'forcee' : 'normale',
    };
    return { ok: true };
  }
  if (!ORDRES[ordre.type]) return { ok: false, motif: 'Ordre inconnu.' };
  if (ordre.type === 'siege') {
    // La manière d'assiéger est un choix, et il a des conséquences : voir
    // MANIERES_SIEGE (world.js). Sans rien préciser, on investit — la plus
    // sobre, et celle que le monde pratique.
    const maniere = ordre.maniere === undefined ? 'investir' : ordre.maniere;
    if (!MANIERES_SIEGE[maniere]) return { ok: false, motif: 'On n’assiège pas comme ça.' };
    const place = assiegeable(state, g);
    if (!place) {
      const col = colonieDe(state.world, g.regionId);
      return {
        ok: false,
        motif: col && col.avantPoste
          ? 'C’est votre camp.' : 'Aucune ville à assiéger ici.',
      };
    }
    // Une garde déjà à terre ne s'use plus : accepter l'ordre pour l'annuler au
    // premier tick ferait un bouton qui ment. On dit ce qu'il reste à faire.
    if (place.defense <= SIEGE.plancher) {
      return { ok: false, motif: `La garde de ${place.nom} ne tient déjà plus : entrez.` };
    }
    g.ordre = { type: 'siege', cible: place.id, maniere, depuis: state.temps };
    return { ok: true };
  }
  if (ordre.type === 'travaux' && !(state.base.fonde && state.base.regionId === g.regionId)) {
    return { ok: false, motif: 'Il faut être à votre avant-poste pour y travailler.' };
  }
  if (ordre.type === 'entrainement') {
    const v = verifierExercice(ordre.skill);
    if (!v.ok) return v;
  }
  g.ordre = Object.assign({}, ordre);
  return { ok: true };
}

/** Refus explicite plutôt que retombée silencieuse sur la mêlée. */
export function verifierExercice(skill) {
  if (!skill) return { ok: false, motif: 'Quelle compétence ?' };
  if (COMPETENCES_EXERCICE.includes(skill)) return { ok: true };
  const comment = PAR_LA_PRATIQUE[skill];
  return {
    ok: false,
    motif: comment
      ? `${SKILLS[skill]} ne se travaille pas à l’exercice : ça vient ${comment}.`
      : `${SKILLS[skill]} ne se travaille pas à l’exercice.`,
  };
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

/**
 * Ce que rapporte une heure d'entraînement dédié. Chiffré, pas deviné : à 5,5,
 * atteindre 30 en mêlée demandait cent cinquante-neuf jours de jeu à ne faire
 * que ça, et cent heures d'entraînement rendaient un seul point. Le joueur ne
 * voyait rien bouger et l'ordre ne servait à rien qu'à manger des rations.
 */
export const XP_ENTRAINEMENT = 24;

/**
 * Ce qui s'exerce à vide, et rien d'autre. On soulève des charges, on court, on
 * répète une frappe, on tire sur une cible — mais on ne s'exerce pas à
 * l'ingénierie, à la médecine ou au commerce : ces métiers-là s'apprennent en
 * démontant, en soignant et en négociant pour de vrai. La furtivité non plus :
 * elle s'acquiert en se déplaçant sans se faire voir.
 *
 * Le reste des compétences monte donc uniquement par la pratique — c'est le
 * pendant de XP_PRATIQUE, et les deux règles se tiennent : le métier forme au
 * métier, l'exercice ne forme qu'au corps et aux armes.
 */
export const COMPETENCES_EXERCICE = ['force', 'endurance', 'melee', 'tir'];

/** Comment chaque compétence non exerçable se travaille, pour le dire au joueur. */
export const PAR_LA_PRATIQUE = {
  furtivite: 'en explorant et en évitant les mauvaises rencontres',
  ingenierie: 'en fouillant, en fouillant des sites et en bâtissant l’avant-poste',
  medecine: 'en soignant les siens',
  commerce: 'en achetant et en vendant',
};
/**
 * Un vétéran qui corrige les gestes vaut mieux qu'un mannequin de paille. Le
 * meilleur du groupe dans la compétence travaillée accélère les autres —
 * et c'est ce qui donne un rôle à celui qu'on a fait monter.
 */
export const BONUS_INSTRUCTEUR = 0.9;

/**
 * Ce qu'on ramasse en marchant, rapporté à ce qu'on ramasserait en fouillant
 * vraiment. On ne traverse pas cinquante kilomètres de ferraille sans rien
 * mettre dans son sac — et sans ça, un quart du temps de jeu ne produit rien.
 *
 * La valeur est mesurée, pas devinée : le banc d'équilibrage a montré que la
 * route prélevait 55 % du revenu, ce qui rendait tout le contenu du jeu —
 * contrats, ordres de mission, sites, commerce — moins rentable que camper sur
 * une bonne case. À 0,35 l'écart restait de 45 % ; à 0,55 il tombe à 30 % et la
 * survie s'égalise ; au-delà, ça ne rapporte plus rien de plus.
 */
export const GLANE_EN_MARCHE = 0.55;

/**
 * Jusqu'où une région se laisse épuiser. Le plafond précédent (0,6) laissait
 * 40 % de rendement pour toujours : camper au même endroit restait la
 * meilleure stratégie du jeu, et tout le contenu qui demande de bouger —
 * contrats, ordres de mission, sites, commerce — devenait un luxe. Un secteur
 * ratissé doit finir par ne plus rien donner.
 */
export const EPUISEMENT_MAX = 0.88;
/** Ce que la terre reprend chaque heure. Lent : un secteur reste bon des semaines. */
export const REPOUSSE = 0.0022;

/** `travailleurs` : ceux qui exécutent *cette* tâche, pas tout le groupe. */
function recolter(state, g, type, travailleurs, log, ctx, facteur = 1) {
  const rng = ctx.rng;
  const r = state.world.regions[g.regionId];
  const biome = BIOMES[r.biome];
  const posture = POSTURES[state.player.posture] || POSTURES.neutre;
  const skill = SKILL_ORDRE[type];
  const filtre = FILTRES[type];
  if (!travailleurs.length) return {};

  // Même un désert nourrit son homme, mal : la chasse a un plancher partout,
  // sinon un ordre parfaitement raisonnable rend zéro sans prévenir.
  const rendements = rendementRegion(state.world, r.i);
  if (type === 'chasse') {
    rendements.biomasse = Math.max(rendements.biomasse || 0, r.biome === 'relais' ? 0.05 : 0.18);
  }

  const epuisement = 1 - r.fouille;
  // Ce que vaut une bande soudée, et ce que coûte une foule. C'est ici que la
  // taille d'une escouade se paie : à trente, on se marche dessus.
  const coh = rendementCohesion(g);
  const recolte = {};
  for (const c of travailleurs) {
    const habilete = 0.45 + comp(c, skill) / 115;
    for (const k of Object.keys(rendements)) {
      if (filtre && !filtre.includes(k)) continue;
      const climatMult = ctx.climat ? ctx.climat.rendement(k) : 1;
      let q = rendements[k] * r.richesse * habilete * posture.rendement
        * epuisement * climatMult * facteur * coh * rng.range(0.75, 1.25);
      // La saison amaigrit le gibier, elle ne le fait pas disparaître : sans ce
      // plancher, un hiver de cendre affame l'escouade où qu'elle aille.
      if (type === 'chasse' && k === 'biomasse') {
        q = Math.max(q, 0.16 * habilete * facteur * rng.range(0.8, 1.2));
      }
      recolte[k] = (recolte[k] || 0) + q;
    }
    // Le métier forme au métier. `facteur` vaut aussi ici : glaner en marchant
    // enseigne moins que fouiller pour de bon.
    gagnerXp(c, skill, XP_PRATIQUE * facteur);
    gagnerXp(c, 'endurance', XP_PRATIQUE * 0.35 * facteur);
  }
  // Chasser, c'est manger : l'essentiel part en rations, pas en biomasse brute
  // qu'on ne saurait pas transformer sans avant-poste.
  if (type === 'chasse' && recolte.biomasse) {
    recolte.rations = (recolte.rations || 0) + recolte.biomasse * 0.7;
    recolte.biomasse *= 0.3;
  }

  // Épuisement local : rester camper au même endroit rapporte de moins en
  // moins. Assez lent pour laisser une région exploitable plusieurs semaines.
  r.fouille = Math.min(EPUISEMENT_MAX, r.fouille + 0.0012 * facteur * travailleurs.length);

  // Les rendements horaires sont fractionnaires : sans report d'une heure sur
  // l'autre, tout ce qui rapporte moins d'une unité par heure rapporte zéro.
  const reste = g.reste || (g.reste = {});
  const bilan = g.bilan || (g.bilan = { res: {}, depuis: state.temps });
  let total = 0;
  const detail = [];
  for (const k of Object.keys(recolte)) {
    const cumul = (reste[k] || 0) + recolte[k];
    const q = Math.floor(cumul);
    reste[k] = cumul - q;
    if (q <= 0) continue;
    const pris = ajouterAuSac(state, k, q, g);
    reste[k] += q - pris; // sac plein : on ne jette pas, on garde en attente
    if (pris > 0) {
      total += pris;
      bilan.res[k] = (bilan.res[k] || 0) + pris;
      detail.push(`${pris} ${COMMODITIES[k].nom.toLowerCase()}`);
    }
  }
  if (total > 0) {
    state.stats.recolte += total;
    g.recolteHeure = [g.recolteHeure, detail.join(', ')].filter(Boolean).join(', ');
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
function explorer(state, g, eclaireurs, log, ctx) {
  const rng = ctx.rng;
  if (!eclaireurs.length) return;

  let portee = 2 + savoir(state, 'optique');
  const meilleur = Math.max(...eclaireurs.map((c) => comp(c, 'furtivite')));
  if (meilleur > 45) portee += 1;

  // La région du dessous d'abord : on remarque ce qu'on a sous les pieds.
  const ici = state.world.regions[g.regionId];
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
    .filter((r) => !r.decouvert && distance(r.i, g.regionId) <= portee)
    .sort((a, b) => distance(a.i, g.regionId) - distance(b.i, g.regionId));

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

  for (const c of eclaireurs) {
    gagnerXp(c, 'furtivite', XP_PRATIQUE);
    gagnerXp(c, 'endurance', XP_PRATIQUE * 0.5);
  }
}

// ---------------------------------------------------------------------------
// Soins
// ---------------------------------------------------------------------------

function qualiteSoin(state, g, auRepos) {
  let medic = 0;
  for (const c of deboutDe(g)) medic = Math.max(medic, comp(c, 'medecine'));
  let q = 0.25 + medic / 90;
  q *= 1 + savoir(state, 'medecine') * 0.25;
  if (state.base.fonde && g.regionId === state.base.regionId) {
    // Le camp lui-même compte, avant la moindre infirmerie : on recoud à
    // l'abri, sur une table, avec de l'eau propre.
    q *= 1.45 + nivBat(state.base, 'infirmerie') * 0.35;
  } else if (garnison(state, g.regionId)) {
    // Les siens vous soignent chez eux, et sans compter à partir de Capitaine.
    q *= 1.5;
  }
  // Camper sous les murs d'une ville dont le médecin vous apprécie, ce n'est
  // pas camper dans le sable : il passe voir vos gens.
  q *= renfortSoin(state, g.regionId);
  if (!auRepos) q *= 0.35;
  return q;
}

/** Consomme un medkit sur le plus mal en point si ça vaut le coup. */
function utiliserMedkit(state, g, log, ctx) {
  if ((g.inventaire.medkit || 0) < 1) return;
  const blesses = g.membres.filter((c) => estVivant(c) && (pvTotal(c).pct < 0.55 || c.sang > 20));
  if (!blesses.length) return;
  const cible = blesses.reduce((a, b) => (pvTotal(a).pct <= pvTotal(b).pct ? a : b));
  g.inventaire.medkit -= 1;
  cible.sang = 0;
  for (const p of Object.keys(cible.corps)) {
    const part = cible.corps[p];
    part.pv = Math.min(part.max, part.pv + part.max * 0.22);
  }
  const soigneur = deboutDe(g)
    .reduce((a, b) => (!a || comp(b, 'medecine') > comp(a, 'medecine') ? b : a), null);
  if (soigneur) gagnerXp(soigneur, 'medecine', XP_PRATIQUE * 1.4);
  if (cible.etat === 'ko' && pvTotal(cible).pct > 0.45) {
    cible.etat = 'ok';
    cible.koHeures = 0;
  }
  log({ type: 'soin', texte: `Medkit utilisé sur ${cible.nom}.`, discret: true });
}

// ---------------------------------------------------------------------------
// Voyage
// ---------------------------------------------------------------------------

function avancerVoyage(state, g, log, ctx) {
  const o = g.ordre;
  const debout = deboutDe(g);
  if (!debout.length) return;

  // Vitesse dictée par le plus lent, alourdie par le sac et les K.O. portés
  let vitesse = Infinity;
  for (const c of debout) {
    const v = 0.5 + comp(c, 'endurance') / 90;
    vitesse = Math.min(vitesse, v);
  }
  const cap = Math.max(1, capacitePortage(state, g));
  const charge = poidsInventaire(g.inventaire) / cap;
  vitesse *= 1 - Math.min(0.55, Math.max(0, charge - 0.6) * 0.9);
  const portes = g.membres.filter((c) => c.etat === 'ko').length;
  vitesse *= 1 - Math.min(0.5, portes * 0.18);
  // Une bête suit le convoi ; une charrette le retient. C'est le prix du dos
  // qu'on s'est acheté.
  vitesse *= 1 - lenteurAttelage(g);
  // Des hommes qu'on mène de force ne marchent pas au pas de ceux qui suivent
  // de leur plein gré. C'est ce qui rend une capture coûteuse à ramener.
  vitesse *= 1 - lenteurPrisonniers(g);
  // Ses morts, qu'on porte tant qu'on n'en a rien décidé.
  vitesse *= 1 - lenteurDepouilles(g);
  vitesse = Math.max(0.15, vitesse);

  o.progres += vitesse;
  const prochaine = o.route[o.etape];
  const m = { reductionVoyage: savoir(state, 'logistique') * 0.06 };
  // Le climat alourdit la marche, mais à moitié : le coût de base tient déjà
  // compte du terrain, et cumuler les deux pleinement immobilise l'escouade.
  const gene = ctx.climat ? 1 + (ctx.climat.marche - 1) * 0.6 : 1;
  const cout = coutTraversee(state.world, prochaine, m) * gene;

  if (o.progres >= cout) {
    o.progres = 0;
    g.regionId = prochaine;
    o.etape++;
    // On tasse la terre en passant. Un convoi lourd marque plus qu'un homme
    // seul, et c'est ce qui fait qu'un circuit qu'on répète devient une route.
    damer(state.world, prochaine, 1 + (g.membres.length + betesDe(g).length) * 0.12);
    // Ce qu'on voit d'ici dépend d'où l'on est (GEOGRAPHIE.md, G6) : d'un
    // Relais on embrasse le pays, du fond d'un canyon on ne voit rien venir.
    // Jamais moins d'une case : on voit toujours où l'on met les pieds.
    const rayon = Math.max(1, 1 + savoir(state, 'optique')
      + porteeDe(state.world.regions[prochaine].biome));
    decouvrir(state.world, prochaine, rayon);
    for (const c of debout) gagnerXp(c, 'endurance', XP_PRATIQUE);

    const col = colonieDe(state.world, prochaine);
    if (col) {
      log({
        type: 'voyage',
        texte: `${g.nom} : arrivée à ${col.nom} (${col.faction ? state.world.factions[col.faction].nom : 'sans maître'}).`,
        regionId: prochaine,
        groupe: g.id,
      });
    }
    if (o.etape >= o.route.length) {
      g.ordre = { type: 'repos' };
      log({
        type: 'voyage',
        texte: `${g.nom} : destination atteinte, ${nomRegion(state.world, prochaine)}.`,
        regionId: prochaine,
        important: true,
        groupe: g.id,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Tick d'un groupe
// ---------------------------------------------------------------------------

/** Groupe les gens debout par tâche effective : [[type, {tache, gens}], …] */
function partitionner(g, debout) {
  const par = new Map();
  for (const c of debout) {
    const t = tacheDe(g, c);
    let e = par.get(t.type);
    if (!e) { e = { tache: t, gens: [] }; par.set(t.type, e); }
    e.gens.push(c);
  }
  return par;
}

/** Effort demandé par une tâche, corrigé par la nuit et l'allure. */
function effortDe(type, nuit, forcee) {
  const def = ORDRES[type] || ORDRES.repos;
  if (!nuit) return def.effort;
  if (type === 'voyage' && forcee) return 1.35; // marche de nuit : épuisant
  return 0;
}

function tickGroupe(state, g, log, ctx) {
  const rng = ctx.rng;
  const vivants = vivantsDe(g);
  if (!vivants.length) return;

  const ordre = g.ordre || (g.ordre = { type: 'repos' });
  g.recolteHeure = null;

  // Cycle jour/nuit : on campe la nuit, sauf en marche forcée.
  //
  // Le commentaire disait ça depuis toujours et le code faisait le contraire :
  // *toute* route était une marche forcée, personne n'a jamais dormi une nuit
  // en voyage. Le banc a fini par le montrer par la bande — un ancien du
  // premier jour finit la partie à 60 de fatigue sur 120, ce qui lui retire
  // trente pour cent de toutes ses compétences en permanence. Sa compétence
  // brute monte bien (14 → 18 en quatre mille heures), mais sa compétence utile
  // tombe de 14 à 10. Les vétérans ne se faisaient pas remplacer parce qu'ils
  // mouraient : ils étaient devenus plus faibles que les recrues.
  //
  // On campe donc, et forcer la marche devient un choix qu'on prend en
  // connaissance de cause.
  const heure = state.temps % 24;
  const nuit = heure >= 22 || heure < 6;
  const forcee = ordre.type === 'voyage' && ordre.allure === 'forcee';
  // Un siège ne dort pas : on ne lève pas les portes au coucher du soleil pour
  // laisser la place se ravitailler à la faveur de la nuit. C'est le prix de
  // l'ordre — personne ne récupère tant qu'on tient devant.
  const travaille = !nuit || forcee || ordre.type === 'siege';
  g.nuit = nuit;

  const debout = deboutDe(g);

  // L'attelage broute, maigrit, et finit parfois par rester sur le bord de la
  // piste. Il mange de la biomasse : celle que personne d'autre ne mange.
  tickBetes(g, rng, log);

  // Les prisonniers mangent sur le sac, et ceux que personne ne regarde s'en
  // vont. C'est ce qui borne leur nombre, à la place d'une règle qui l'interdit.
  tickPrisonniers(state, g, rng, log);

  // --- Cohésion : un groupe au repos et bien nourri se ressoude, un groupe qui
  // enchaîne les défaites se délite. Le moral suit.
  if (g.cohesion === undefined) g.cohesion = 55;
  const affames = vivants.filter((c) => c.faim > 80).length;
  const ko = g.membres.filter((c) => c.etat === 'ko').length;
  let derive = 0.02;
  if (affames) derive -= 0.06 * affames;
  if (ko) derive -= 0.05 * ko;
  if (ordre.type === 'repos' && !affames) derive += 0.05;
  // Un groupe d'une personne ne se « ressoude » pas : il tient ou il craque.
  if (vivants.length === 1) derive *= 0.5;
  // Même amortissement que les liens : une escouade parfaite n'existe pas.
  // Une colonne trop nombreuse ne se ressoude pas : au-delà du noyau qu'on sait
  // tenir, le plafond descend, et la cohésion avec lui.
  const plafond = plafondCohesion(state, g);
  const freinCoh = derive > 0 ? 1 - Math.min(0.95, g.cohesion / plafond) : 1;
  g.cohesion = Math.max(0, Math.min(plafond, g.cohesion + derive * freinCoh));

  // Les liens se tissent en vivant côte à côte, et se distendent quand l'un
  // s'écroule pendant que l'autre tient debout. Séparés, ils s'étiolent.
  if (state.temps % 6 === 0 && vivants.length > 1) {
    // On ne vit pas côte à côte avec mille personnes. Chacun tisse ses liens
    // avec son CERCLE — ceux qui plantent leur toile à côté de la sienne — et
    // pas avec la colonne entière. En dessous de treize, le cercle contient
    // tout le monde : pour une escouade ordinaire, rien ne change, pas une
    // décimale. Au-delà, le lien de chacun avec chacun n'était pas une
    // simulation plus fine, c'était un carré : mesuré à mille deux cents
    // personnes, 609 ms par heure de jeu, et le moteur ne suivait plus.
    const n2 = vivants.length;
    const portee = Math.min(CERCLE_VOISINS, Math.floor(n2 / 2));
    for (let d = 1; d <= portee; d++) {
      // Quand le cercle fait exactement le tour, une paire reviendrait deux
      // fois : on n'en garde qu'une moitié.
      const moitie = d * 2 === n2;
      for (let i = 0; i < (moitie ? n2 / 2 : n2); i++) {
        const a = vivants[i];
        const b = vivants[(i + d) % n2];
        const ensemble = estDebout(a) && estDebout(b);
        let cible = 40;
        const ta = a.traits || [];
        const tb = b.traits || [];
        if (ta.includes('teigneux') && tb.includes('teigneux')) cible -= 55;
        if (ta.includes('froussard') !== tb.includes('froussard')) cible -= 15;
        if (ta.includes('beau_parleur') || tb.includes('beau_parleur')) cible += 15;
        if (ta.includes('rebouteux') || tb.includes('rebouteux')) cible += 10;
        if (!ensemble) cible -= 20;
        tendreLien(a, b, cible, ordre.type === 'repos' && ensemble ? 0.035 : 0.02);
      }
    }
  }

  for (let i = 0; i < vivants.length; i++) {
    const c = vivants[i];
    // Le moral tient à deux choses : l'état du groupe, et ceux sur qui on peut
    // compter nommément — ceux qui sont là, pas ceux partis à l'autre bout.
    // « Ceux sur qui on compte », ce sont ceux du cercle : les mêmes que ceux
    // avec qui le lien se tisse. Faire la moyenne sur mille deux cents
    // personnes coûtait un million et demi de lectures par heure de jeu, pour
    // une moyenne que personne ne pouvait ressentir.
    let apport = 0;
    let n = 0;
    const total = vivants.length;
    if (total - 1 <= CERCLE_VOISINS * 2) {
      // Tout le monde tient dans le cercle : on compte tout le monde, une fois
      // chacun, exactement comme avant. Une escouade ordinaire ne voit aucune
      // différence — pas une décimale.
      for (const autre of vivants) {
        if (autre.id === c.id) continue;
        apport += lien(c, autre);
        n++;
      }
    } else {
      // Une foule : chacun compte sur ses voisins de toile, six de chaque côté.
      for (let d = 1; d <= CERCLE_VOISINS; d++) {
        apport += lien(c, vivants[(i + d) % total]);
        apport += lien(c, vivants[(i - d + total) % total]);
        n += 2;
      }
    }
    const social = n ? apport / n : -8; // seul : personne sur qui compter
    // Le plafond ne dépend que du GROUPE : il était recalculé pour chacun, et
    // il parcourt le groupe entier — un carré de plus, à lui tout seul.
    const cible = Math.max(0, Math.min(plafond, g.cohesion + social * 0.25));
    c.moral = Math.max(0, Math.min(100, c.moral + (cible - c.moral) * 0.012 * (mods(c).moral || 1)));
    // Porter ses morts pèse, tant qu'on n'en a rien décidé. C'est ce qui force
    // la question sans qu'aucune règle ne l'impose. Voir depouilles.js.
    if (c.etat !== 'mort') c.moral = Math.max(0, c.moral - poidsMoral(g));
  }

  // --- Nourriture : on mange dès qu'on a faim et de quoi. Chaque groupe puise
  // dans ce qu'il porte : c'est tout l'enjeu d'un détachement.
  //
  // Sauf aux travaux : on mange à la cantine du camp, pas dans son paquetage.
  // Des gens qui passent leurs journées sur les chaînes de l'avant-poste et qui
  // entament leurs vivres de route pendant ce temps-là, ça n'a aucun sens — et
  // ça punissait le seul ordre censé aider le camp. Le réfectoire sert d'abord ;
  // le sac ne s'ouvre que s'il n'y a rien dans les réserves.
  //
  // La cantine compte pour eux comme pour les habitants : la même ration
  // nourrit mieux quand on mange assis, à heure fixe.
  const auCamp = ordre.type === 'travaux' && state.base.fonde
    && state.base.regionId === g.regionId;
  const rabais = auCamp
    ? 1 - Math.min(0.33, nivBat(state.base, 'cantine') * 0.055) : 1;
  for (const c of vivants) {
    if (c.faim > 42) {
      if (auCamp && (state.base.stock.rations || 0) > 0) {
        const mange = nourrir(c, state.base.stock.rations);
        if (mange > 0) {
          state.base.stock.rations = Math.max(0, state.base.stock.rations - mange * rabais);
          continue;
        }
      }
      const dispo = g.inventaire.rations || 0;
      const mange = nourrir(c, dispo);
      if (mange > 0) g.inventaire.rations -= mange;
    }
  }

  // --- Exécution. Le cas courant est que personne n'a de tâche à soi : on ne
  // partitionne alors pas du tout, ce qui évite une Map et deux tableaux par
  // groupe et par heure de jeu.
  let uniforme = true;
  for (const c of debout) if (c.tache) { uniforme = false; break; }

  if (travaille && debout.length) {
    const paquets = uniforme
      ? [[ordre.type, { tache: ordre, gens: debout }]]
      : partitionner(g, debout);
    for (const [type, paquet] of paquets) {
      switch (type) {
        case 'voyage':
          avancerVoyage(state, g, log, ctx);
          // On glane le long de la route. Le rendement est celui de la région
          // qu'on vient de quitter ou d'atteindre — c'est le terrain traversé.
          if (!nuit) recolter(state, g, 'fouille', paquet.gens, log, ctx, GLANE_EN_MARCHE);
          break;
        case 'fouille':
        case 'mine':
        case 'chasse':
          recolter(state, g, type, paquet.gens, log, ctx);
          break;
        case 'siege':
          // Le siège ne rapporte rien : il use la place d'en face. Quand il n'a
          // plus d'objet — la garde a cédé, la ville a disparu, on n'est plus
          // devant —, on repasse au repos plutôt que d'assiéger le vide.
          if (!tickSiege(state, g, ctx.rng, log)) g.ordre = { type: 'repos' };
          break;
        case 'entrainement': {
          const skill = COMPETENCES_EXERCICE.includes(paquet.tache.skill)
            ? paquet.tache.skill : 'melee';
          // Plus de prélèvement de vivres (S2, prisme du propriétaire) : une
          // ration par heure pour deux, c'était un corps qui mange vingt fois
          // ce qu'un marcheur mange — un prix d'équilibrage, pas une faim.
          // L'effort (1,5, ORDRES) passe par la physiologie : on mange plus,
          // on se fatigue plus, et le vrai prix est l'heure qui ne produit
          // rien. `tickPerso` fait le reste.
          {
            // Le meilleur du groupe donne le ton, y compris s'il ne s'entraîne
            // pas lui-même : on regarde tout le monde debout, pas le paquet.
            let maitre = 0;
            for (const c of debout) maitre = Math.max(maitre, comp(c, skill));
            // La salle d'exercice (BATIMENTS.md, B5) : un maître de maison
            // plancher le ton — au camp seulement, et jamais au-delà de 55.
            // Le 70 est un savoir : il s'apprendra (nœud instruction de
            // l'arbre). Le mentorat vivant garde sa place au-dessus.
            if (state.base.fonde && g.regionId === state.base.regionId) {
              const salle = Math.min(2, nivBat(state.base, 'salle'));
              if (salle > 0) maitre = Math.max(maitre, salle >= 2 ? 55 : 40);
            }
            for (const c of paquet.gens) {
              const av = c.skills[skill];
              const ecart = Math.max(0, maitre - comp(c, skill));
              const bonus = 1 + Math.min(BONUS_INSTRUCTEUR, ecart / 40);
              gagnerXp(c, skill, XP_ENTRAINEMENT * bonus);
              if (c.skills[skill] > av) {
                log({
                  type: 'progres',
                  texte: `${c.nom} progresse à l’entraînement : ${SKILLS[skill]} ${c.skills[skill]}.`,
                  discret: true,
                });
              }
            }
          }
          break;
        }
        case 'exploration':
          explorer(state, g, paquet.gens, log, ctx);
          break;
        case 'patrouille': {
          const f = state.world.regions[g.regionId].controle;
          // La patrouille est un fait-fleuve (L5) : « il tient nos routes
          // depuis des semaines », pas soixante écritures muettes.
          if (f) {
            commettre(state, {
              type: 'patrouille', fleuve: true, t: state.temps,
              effets: [{ faction: f, delta: 0.05, su: state.temps }],
            });
          }
          break;
        }
        default:
          break;
      }
    }
  }

  // --- Aléas et rencontres, pour ce groupe et là où il se trouve
  const exposition = travaille ? 1 : 0.35;
  tenterAlea(state, log, ctx, exposition, g);
  if (!state.fin) {
    let mult = ordre.type === 'patrouille' ? 2.4 : ordre.type === 'repos' ? 0.45 : 1;
    if (!travaille) mult *= 0.5; // camp de nuit, feu éteint
    // Un petit groupe se fait moins remarquer — et se défend moins bien.
    if (vivants.length <= 1) mult *= 0.7;
    tenterRencontre(state, log, ctx, mult, g);
  }

  // --- Soins et besoins, avec l'effort réellement fourni par chacun
  const effortMoyen = debout.length
    ? debout.reduce((s, c) => s + effortDe(tacheDe(g, c).type, nuit, forcee), 0) / debout.length
    : 0;
  const q = qualiteSoin(state, g, effortMoyen <= 0.05);
  utiliserMedkit(state, g, log, ctx);
  for (const c of g.membres) {
    const eff = estDebout(c) ? effortDe(tacheDe(g, c).type, nuit, forcee) : 0;
    const msgs = tickPerso(c, eff, rng,
      { soin: q, premiersSecours: debout.length > 0, abri: abriDe(state, g.regionId) });
    for (const m of msgs) {
      log({ type: m.type, texte: m.texte, important: m.type === 'mort', groupe: g.id });
      if (m.type === 'mort') {
        inscrireAuMemorial(state, c, 'mort en route', nomRegion(state.world, g.regionId));
      }
    }
  }

  // Bilan périodique : sans lui, une nuit de récolte ne laisse aucune trace
  // à l'écran et le jeu paraît ne rien faire.
  const bilan = g.bilan;
  if (bilan && state.temps - (bilan.depuis || 0) >= 6) {
    const lignes = Object.keys(bilan.res)
      .filter((k) => bilan.res[k] > 0)
      .sort((a, b) => bilan.res[b] - bilan.res[a])
      .map((k) => `${bilan.res[k]} ${COMMODITIES[k].nom.toLowerCase()}`);
    if (lignes.length) {
      log({
        type: 'recolte',
        texte: `${g.nom}, six heures de travail : ${lignes.join(', ')}.`,
        regionId: g.regionId,
        groupe: g.id,
      });
    }
    g.bilan = { res: {}, depuis: state.temps };
  }
}

// ---------------------------------------------------------------------------
// Tick de tous les groupes
// ---------------------------------------------------------------------------

/** Quelqu'un, quelque part, est-il encore en vie ? Sans allouer de tableau :
 *  c'est appelé deux fois par heure de jeu. */
function quelquUnDebout(state) {
  const gs = state.player.groupes;
  for (let i = 0; i < gs.length; i++) {
    const m = gs[i].membres;
    for (let j = 0; j < m.length; j++) if (estVivant(m[j])) return true;
  }
  return false;
}

/**
 * La relève.
 *
 * Le dernier des vôtres tombe, et la partie s'arrête — même si vous avez
 * dix-huit habitants, une halle, des murs et un nom sur les cartes. C'était le
 * dernier endroit où bâtir ne servait à rien : tout ce qu'on avait fait tenait
 * à quatre paires de jambes, et disparaissait avec elles.
 *
 * Une ville qui a des gens envoie des gens. Ce ne sont pas vos vétérans — ce
 * sont des colons qui n'ont jamais tenu une arme, et la ville les perd. Mais
 * c'est votre ville, et elle continue.
 */
function releverDepuisLaVille(state, rng, log) {
  const base = state.base;
  if (!base.fonde || (base.pop || 0) < 3) return false;
  const combien = Math.min(3, Math.floor(base.pop / 2));
  const g = state.player.groupes[0];
  if (!g) return false;
  base.pop -= combien;
  // Ils partent la peur au ventre, et la ville se demande qui sera le prochain.
  base.moral = Math.max(0, base.moral - 18);
  g.regionId = base.regionId;
  g.ordre = { type: 'repos' };
  const noms = [];
  for (let i = 0; i < combien; i++) {
    const c = makeCharacter(rng, { archetype: rng.pick(ARCHETYPE_KEYS), niveau: 0 });
    // Ce ne sont pas des soldats. Ils apprendront, ou pas.
    c.moral = 40;
    g.membres.push(c);
    noms.push(c.nom);
  }
  state.player.groupeActif = g.id;
  // De quoi tenir la première semaine, pris sur l'entrepôt.
  const vivres = Math.min(base.stock.rations || 0, combien * 24);
  base.stock.rations -= vivres;
  g.inventaire.rations = (g.inventaire.rations || 0) + vivres;
  log({
    type: 'fin',
    texte: `Il ne restait personne. ${base.nom} a envoyé les siens : `
      + `${noms.join(', ')}. Ils n’ont jamais tenu une arme. C’est tout ce qu’il y a.`,
    important: true,
    regionId: base.regionId,
  });
  return true;
}

/**
 * Combien de gens on a vraiment autour de soi. Treize personnes, c'est une
 * tablée ; mille, c'est une foule où l'on ne connaît que ses voisins de toile.
 * En dessous de ce nombre, le cercle contient toute l'escouade et le moteur
 * calcule exactement ce qu'il calculait avant.
 */
export const CERCLE_VOISINS = LIENS.cercle;

export function tickSquad(state, log, ctx) {
  if (!quelquUnDebout(state)) {
    if (!state.fin && !releverDepuisLaVille(state, ctx.rng, log)) {
      state.fin = 'extinction';
      log({ type: 'fin', texte: 'Plus personne. Fin de partie.', important: true });
    }
    if (state.fin) return;
  } else if (state.fin === 'extinction') {
    // Quelqu'un tient debout alors que la fin est posée : une sauvegarde
    // d'avant la règle du flambeau (l'embauche ne levait pas la fin), ou
    // n'importe quel chemin futur qui ramène un vivant. La fin n'a plus
    // d'objet — sans cette relève, les portes plus bas gelaient l'escouade
    // pour toujours : « le temps tourne, mais le jeu est figé quand même »
    // (le propriétaire, sur sa partie en cours).
    state.fin = null;
    log({ type: 'fin', texte: 'Quelqu’un tient encore debout. La partie continue.', important: true });
  }

  // Les chasseurs de prime cherchent le joueur, pas un groupe : un seul tirage
  // par heure, sinon leur fréquence serait multipliée par le nombre de groupes.
  tenterChasseurs(state, log, ctx);
  if (state.fin) return;

  // Index décroissant : un groupe peut disparaître en cours de tick (anéanti),
  // et parcourir à l'envers évite d'en copier la liste à chaque heure.
  const gs = state.player.groupes;
  for (let i = 0; i < gs.length; i++) {
    if (state.fin) break;
    tickGroupe(state, gs[i], log, ctx);
  }

  // Un groupe dont plus personne n'est vivant cesse d'exister, et ce qu'il
  // portait avec lui. Dire lesquels : perdre trente rations en silence, c'est
  // le genre de chose qu'on découvre trois heures plus tard.
  for (let i = gs.length - 1; i >= 0 && gs.length > 1; i--) {
    const g = gs[i];
    if (g.membres.some(estVivant)) continue;
    log({
      type: 'fin',
      texte: `${g.nom} a cessé d’exister en ${nomRegion(state.world, g.regionId)}. Tout ce que le groupe portait est perdu.`,
      important: true,
      regionId: g.regionId,
    });
    // Les morts sont déjà au mémorial : ils y ont été inscrits en tombant.
    retirerGroupe(state, g);
  }

  // La région se régénère lentement de la fouille
  for (const r of state.world.regions) {
    if (r.fouille > 0) r.fouille = Math.max(0, r.fouille - REPOUSSE);
  }

  // Fin de partie — sauf si la ville peut envoyer les siens.
  if (!quelquUnDebout(state) && !state.fin
      && !releverDepuisLaVille(state, ctx.rng, log)) {
    state.fin = 'extinction';
    log({ type: 'fin', texte: 'Plus personne. Fin de partie.', important: true });
  }
}

// ---------------------------------------------------------------------------
// Ce que la colonne consomme, et pourquoi
// ---------------------------------------------------------------------------

/**
 * Le détail de ce qui vide le sac, par jour et par poste.
 *
 * Les rations s'évaporaient sans explication : rien nulle part ne disait que
 * l'entraînement en avale une par heure pour deux personnes — quarante-huit par
 * jour pour une escouade de quatre, de loin le premier poste — ni que chaque
 * prisonnier mange, ni que les bêtes broutent de la biomasse. Une comptabilité
 * muette est indiscernable d'un bug, et c'est bien ce qu'on nous a rapporté.
 *
 * Fonction pure : elle relit les mêmes règles que `tickGroupe` sans rien
 * modifier. Tout est exprimé en unités par jour de jeu.
 */
export function consommationGroupe(state, g) {
  const vivants = vivantsDe(g);
  const debout = deboutDe(g);

  // Manger : la faim monte à l'effort, et quarante-cinq points de faim valent
  // une ration. La nuit ne compte pas comme du travail.
  const type = (g.ordre && g.ordre.type) || 'repos';
  const forcee = !!(g.ordre && g.ordre.forcee);
  let faimParJour = 0;
  for (const c of vivants) {
    const eff = estDebout(c) ? effortDe(type, false, forcee) : 0;
    const effNuit = estDebout(c) ? effortDe(type, true, forcee) : 0;
    // Deux tiers de jour, un tiers de nuit : c'est le rythme du tick.
    const parHeure = ((0.55 + 0.25 * eff) * 16 + (0.55 + 0.25 * effNuit) * 8) / 24;
    faimParJour += parHeure * 24 * (mods(c).faim || 1);
  }
  const escouade = faimParJour / 45;

  // Les prisonniers mangent sur le sac, qu'on les nourrisse ou non.
  const prisonniers = prisonniersDe(g).length * RATION_PRISONNIER;

  // L'entraînement ne prélève plus rien (S2, prisme du propriétaire) : son
  // surcroît passe par la faim physiologique (effort 1,5), déjà comptée dans
  // la part de l'escouade.
  const entrainement = 0;

  return {
    escouade,
    prisonniers,
    entrainement,
    rations: escouade + prisonniers + entrainement,
    // Les bêtes ne mangent pas de rations : elles broutent ce que personne ne
    // mange. On le dit quand même, c'est un stock qui baisse.
    biomasse: appetitAttelage(g) * 24,
  };
}

/** Combien de jours la colonne tient sur ce qu'elle porte, au rythme actuel. */
export function autonomie(state, g) {
  const c = consommationGroupe(state, g);
  if (c.rations <= 0) return Infinity;
  return (g.inventaire.rations || 0) / c.rations;
}

/**
 * Ce que cette colonne vaut, en chiffres agrégés.
 *
 * « Est-ce que plusieurs membres additionnent leur travail ? » n'avait aucune
 * réponse à l'écran. Elle est oui — `recolter` somme la contribution de chacun —
 * mais rien ne le montrait, et l'on ne pouvait pas juger si détacher deux
 * personnes valait le coup.
 *
 * Les rendements sont recalculés ici plutôt que partagés avec `recolter` : cette
 * boucle-là tire le hasard par personne et par marchandise, et la factoriser
 * changerait l'ordre de tirage, donc toutes les parties déjà mesurées. On mime
 * la même formule avec un aléa moyen de 1, et le commentaire est le contrat.
 */
export function apercuEscouade(state, g) {
  const debout = deboutDe(g);
  const type = (g.ordre && g.ordre.type) || 'repos';

  // Récolte attendue pour l'ordre en cours, sur une journée de seize heures de
  // clarté — la nuit, on ne travaille pas.
  let parJour = 0;
  const detail = {};
  const filtre = FILTRES[type];
  if (filtre !== undefined && debout.length) {
    const r = state.world.regions[g.regionId];
    const biome = BIOMES[r.biome];
    const posture = POSTURES[state.player.posture] || POSTURES.neutre;
    const skill = SKILL_ORDRE[type];
    const climat = conditions(state.world, state.temps);
    const coh = rendementCohesion(g);
    const rendements = rendementRegion(state.world, r.i);
    if (type === 'chasse') {
      rendements.biomasse = Math.max(rendements.biomasse || 0, r.biome === 'relais' ? 0.05 : 0.18);
    }
    for (const c of debout) {
      const habilete = 0.45 + comp(c, skill) / 115;
      for (const k of Object.keys(rendements)) {
        if (filtre && !filtre.includes(k)) continue;
        const q = rendements[k] * r.richesse * habilete * posture.rendement
          * (1 - r.fouille) * climat.rendement(k) * coh;
        detail[k] = (detail[k] || 0) + q * 16;
        parJour += q * 16;
      }
    }
  }

  // Vitesse : celle du plus lent, alourdie par tout ce qu'on traîne.
  let vitesse = Infinity;
  for (const c of debout) vitesse = Math.min(vitesse, 0.5 + comp(c, 'endurance') / 90);
  if (!Number.isFinite(vitesse)) vitesse = 0;
  const cap = Math.max(1, capacitePortage(state, g));
  const charge = poidsInventaire(g.inventaire) / cap;
  vitesse *= 1 - Math.min(0.55, Math.max(0, charge - 0.6) * 0.9);
  vitesse *= 1 - Math.min(0.5, g.membres.filter((c) => c.etat === 'ko').length * 0.18);
  vitesse *= 1 - lenteurAttelage(g);
  vitesse *= 1 - lenteurPrisonniers(g);
  // Ses morts, qu'on porte tant qu'on n'en a rien décidé.
  vitesse *= 1 - lenteurDepouilles(g);
  vitesse = Math.max(0.15, vitesse);
  const coutIci = coutTraversee(state.world, g.regionId,
    { reductionVoyage: savoir(state, 'logistique') * 0.06 });

  return {
    debout: debout.length,
    vivants: vivantsDe(g).length,
    recolteParJour: parJour,
    recolteDetail: detail,
    ordre: type,
    // Combien d'heures pour franchir une région comparable à celle-ci.
    heuresParRegion: vitesse > 0 ? coutIci / vitesse : Infinity,
    charge,
    garde: capaciteGarde(g),
    prisonniers: prisonniersDe(g).length,
    attelage: betesDe(g).length,
    conduite: conduite(g),
  };
}
