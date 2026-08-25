// Le registre des faits — la seule porte vers ce que le monde pense du joueur.
//
// L2 (MEMOIRE.md) : un acte du joueur est un FAIT — daté, situé, avec des
// effets par faction et l'heure `su` où chacune l'apprend. L'effet ne tombe
// qu'à l'arrivée de la nouvelle : commettre enregistre et applique ce qui est
// déjà su, `tickFaits` livre le reste à l'heure dite. Plus rien d'autre dans
// le moteur n'écrit `state.player.reputation` : c'est la garantie (tenue par
// un test statique) que les chemins muets ne reviendront pas.
//
// Deux portes, un seul module :
// - `commettre` : les ACTES — discrets, enregistrés, différables. C'est la
//   matière que L5 distribuera aux porteurs nommés (« la mémoire appartient
//   au souvenant »).
// - `appliquerReputation` : l'écriture brute, clampée — pour l'ambiant qui
//   n'est pas un acte (la patrouille qui rassure au fil des heures, l'érosion
//   tant qu'elle vit — elle meurt à L4). Elle n'enregistre rien.

import { drapeauDe } from './data.js';

/**
 * La mémoire du monde est bornée, comme celle de tout le monde ici (quatre
 * souvenirs par notable, soixante rencontres, douze rachats) : les vieux
 * faits sortent poussés par les nouveaux.
 */
export const FAITS_MAX = 60;

/** L'écriture brute, clampée, sans registre. Garde-fou : les pillards et
 * l'Essaim ne sont pas des institutions — pas de clé fantôme. */
export function appliquerReputation(state, faction, delta) {
  if (!faction || faction === 'essaim' || faction === 'bandits'
    || !drapeauDe(state.world, faction)) return;
  const r = state.player.reputation;
  r[faction] = Math.max(-100, Math.min(100, (r[faction] || 0) + delta));
}

/**
 * Commettre un fait : il entre au registre, ce qui est déjà su s'applique,
 * le reste attend son heure. `effets` : [{faction, delta, su, dit?}] —
 * `dit` est la ligne de journal à l'arrivée de la nouvelle (décision n°5 :
 * on montre qui sait quoi, et quand).
 */
export function commettre(state, fait, log) {
  if (!state.player.faits) state.player.faits = [];
  state.player.faits.push(fait);
  if (state.player.faits.length > FAITS_MAX) state.player.faits.shift();
  for (const e of fait.effets || []) {
    if (e.su <= (fait.t ?? state.temps)) {
      appliquerReputation(state, e.faction, e.delta);
      e.applique = true;
    }
  }
  return fait;
}

/**
 * La file des nouvelles en route : ce qui doit être su à cette heure-ci
 * tombe, et se dit. Le registre est borné à soixante entrées — le parcours
 * est trivial, et un fait dont tous les effets sont tombés ne coûte rien.
 */
export function tickFaits(state, log) {
  for (const f of state.player.faits || []) {
    for (const e of f.effets || []) {
      if (e.applique || e.su > state.temps) continue;
      appliquerReputation(state, e.faction, e.delta);
      e.applique = true;
      if (log && e.dit) {
        log({
          type: 'rumeur',
          texte: e.dit,
          important: true,
          factions: [e.faction],
        });
      }
    }
  }
}
