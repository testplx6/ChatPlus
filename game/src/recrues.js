// Qui accepte de partir avec vous, et pour combien.
//
// La prime d'engagement montait de quatre-vingt-dix crédits par membre déjà
// présent. C'était de l'équilibrage déguisé en économie : un ferrailleur au
// chômage dans un bourg de la steppe n'a aucune idée du nombre de gens que vous
// menez déjà, et si vous en menez vingt, il devrait plutôt être *rassuré*.
//
// Ce qui décide vraiment d'une prime, c'est trois choses :
//
//   ce que vaut la personne — un médic diplômé ne part pas au tarif d'un bras ;
//   ce que vaut sa place ici — on quitte pour rien une ville affamée et agitée,
//     on se fait payer cher pour quitter une ville prospère ;
//   ce que vous valez, vous — on suit moins cher un nom qu'on connaît.
//
// Et surtout : on voit qui l'on engage. Un banc de bourg propose deux ou trois
// personnes, avec leur nom, leur métier et leur prix, renouvelées de loin en
// loin. On ne tire plus un inconnu au sort en payant d'avance.

import { SKILL_KEYS } from './data.js';
import { makeCharacter, comp, ARCHETYPE_KEYS } from './characters.js';
import { Rng, grainDe } from './rng.js';

/** Durée de vie d'un banc de recrutement avant que les gens se placent ailleurs. */
export const DUREE_BANC = 260;

/**
 * Ce que quelqu'un vaut sur le marché du travail : ses compétences, son
 * équipement, et le fait d'avoir un vrai métier plutôt que deux bras.
 */
export function valeurRecrue(c) {
  let somme = 0;
  for (const k of SKILL_KEYS) somme += c.skills[k] || 0;
  const meilleur = SKILL_KEYS.reduce((m, k) => Math.max(m, c.skills[k] || 0), 0);
  const brevets = (c.diplomes || []).length;
  // La somme dit l'expérience générale, le meilleur dit la spécialité, les
  // diplômes disent qu'on a payé pour l'apprendre.
  return 90 + somme * 3.2 + meilleur * 6 + brevets * 220;
}

/**
 * Ce que la ville fait au prix. Une ville qui a faim et qui gronde laisse
 * partir les siens pour presque rien ; une ville prospère les garde.
 */
export function tensionRecrutement(col) {
  if (!col) return 1;
  const vivres = (col.stock.rations || 0) / Math.max(1, col.pop);
  const aise = Math.max(0, Math.min(1, vivres / 0.9));
  // 0,55 dans un bourg affamé et révolté, 1,35 dans une ville qui va bien.
  return Math.max(0.55, Math.min(1.35, 0.7 + aise * 0.65 - (col.unrest || 0) * 0.5));
}

/** La prime demandée par cette personne, dans cette ville, à ce joueur. */
export function primeDe(state, col, c) {
  const repu = (col && state.player.reputation[col.faction]) || 0;
  // On suit moins cher quelqu'un dont on a entendu du bien. Et beaucoup plus
  // cher quelqu'un dont on a entendu du mal.
  const nom = repu >= 0 ? 1 - Math.min(0.25, repu / 320) : 1 + Math.min(0.6, -repu / 160);
  return Math.max(60, Math.round(valeurRecrue(c) * tensionRecrutement(col) * nom));
}

/**
 * Le banc d'une ville, **dérivé** : une pure fonction de l'endroit et du moment.
 *
 * Personne ne le fabrique, personne ne l'efface, il n'est nulle part dans la
 * sauvegarde. Deux joueurs dans la même ville y verraient les mêmes gens sans
 * échanger un octet, et le monde n'a plus besoin de savoir où se trouve le
 * joueur pour décider qui existe — c'est le piège n°5 réparé.
 *
 * L'agitation entre dans la composition, parce qu'une ville qui gronde laisse
 * partir plus de monde et que c'est une règle de jeu qu'on garde. Mais elle
 * bouge à chaque heure : prise brute, le banc se renouvellerait sous les yeux
 * du joueur. On la quantifie donc au quart, et c'est ce quart-là qui entre à la
 * fois dans la graine et dans le nombre de gens — sans quoi la liste changerait
 * de longueur sans que la graine change.
 *
 * Ce qui reste en état, et seulement au moment où l'on touche : `col.bancPris`,
 * les identifiants déjà engagés cette époque-ci. Une trentaine d'octets, oubliés
 * dès que l'époque tourne.
 */
export function bancDerive(col, t) {
  if (!col || col.ruine) return { epoque: 0, gens: [] };
  const epoque = Math.floor(t / DUREE_BANC);
  const agitation = Math.round((col.unrest || 0) * 4);
  const rng = new Rng(grainDe('banc', col.id, epoque, col.taille, agitation));
  const combien = Math.max(1, Math.min(5, Math.round(1 + col.taille * 0.8 + agitation)));
  const gens = [];
  for (let i = 0; i < combien; i++) {
    // Le niveau suit la ville : on ne trouve pas de vétéran dans un hameau.
    const niveau = rng.weighted([[0, 4], [1, 3], [2, 1.5 + col.taille], [3, col.taille * 0.6]]);
    gens.push(makeCharacter(rng, { archetype: rng.pick(ARCHETYPE_KEYS), niveau }));
  }
  const pris = (col.bancPris && col.bancPris.epoque === epoque) ? col.bancPris.ids : [];
  return { epoque, gens: pris.length ? gens.filter((c) => !pris.includes(c.id)) : gens };
}

/**
 * Engager quelqu'un du banc. Aucun plafond d'effectif : ce qui dissuade
 * d'entasser du monde, c'est la cohésion qui se délite (voir groupes.js), pas
 * une règle qui interdit.
 */
export function engager(state, col, id, log, groupe) {
  const g = groupe || (state.player.groupes || [])[0];
  if (!g) return { ok: false, motif: 'Aucun groupe.' };
  if (!col || col.ruine || g.regionId !== col.regionId) {
    return { ok: false, motif: 'Il faut être en ville.' };
  }
  // Par identifiant, plus par rang dans la liste : le banc n'est plus un objet
  // qu'on garde en main, c'est une vue qu'on recalcule. Un rang ne veut rien
  // dire d'un calcul à l'autre — un identifiant, si.
  const banc = bancDerive(col, state.temps);
  const c = banc.gens.find((x) => x.id === id);
  if (!c) return { ok: false, motif: 'Cette personne s’est placée ailleurs.' };
  const prix = primeDe(state, col, c);
  if (state.player.credits < prix) {
    return { ok: false, motif: `Il manque ${prix - state.player.credits} cr.` };
  }
  state.player.credits -= prix;
  // La promotion par le toucher : c'est ici, et seulement ici, qu'un individu
  // dérivé entre dans l'état. Le registre est remis à zéro quand l'époque
  // tourne — on ne garde pas la mémoire de gens qui ne sont plus là.
  if (!col.bancPris || col.bancPris.epoque !== banc.epoque) {
    col.bancPris = { epoque: banc.epoque, ids: [] };
  }
  col.bancPris.ids.push(c.id);
  g.membres.push(c);
  if (log) {
    log({
      type: 'recrue',
      texte: `${c.nom} (${c.archetypeNom}) s’engage dans ${g.nom} pour ${prix} cr.`,
      important: true,
      regionId: col.regionId,
      groupe: g.id,
    });
  }
  return { ok: true, perso: c, prix };
}

/** Ce qu'on peut dire d'une recrue avant de signer, en une ligne. */
export function apercu(c) {
  let meilleur = SKILL_KEYS[0];
  for (const k of SKILL_KEYS) if ((c.skills[k] || 0) > (c.skills[meilleur] || 0)) meilleur = k;
  return { skill: meilleur, niveau: Math.round(c.skills[meilleur] || 0), comp: comp(c, meilleur) };
}
