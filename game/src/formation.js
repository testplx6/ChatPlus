// Les écoles : ce qui s'apprend ailleurs qu'à l'usage.
//
// Un diplôme n'accélère pas la partie, il la réoriente. Il coûte de l'argent,
// et surtout du temps passé sur place — l'élève ne travaille pas, ne se bat pas
// et ne porte rien pendant sa formation, et celle-ci ne progresse que tant qu'il
// est dans la ville qui l'enseigne. Envoyer quelqu'un à l'école, c'est donc se
// priver d'un bras pendant plusieurs semaines, ou détacher un groupe d'une
// personne et le laisser là.
//
// C'est le pendant de l'exercice : l'exercice ne forme qu'au corps et aux
// armes, l'école forme aux métiers.

import { DIPLOMES, DIPLOME_KEYS, FACTIONS, SKILLS } from './data.js';
import { accorderDiplome, estVivant } from './characters.js';
import { groupes } from './groupes.js';

/** Ce qu'une ville enseigne, d'après qui la tient et ce qu'elle pèse. */
export function ecolesDe(world, col) {
  if (!col || col.ruine || !col.faction) return [];
  const style = FACTIONS[col.faction] && FACTIONS[col.faction].style;
  if (!style) return [];
  return DIPLOME_KEYS.filter((k) => {
    const d = DIPLOMES[k];
    return d.styles.includes(style) && col.taille >= d.tailleMin;
  });
}

/** Le prix demandé ici : une grande ville se paie plus cher qu'un poste. */
export function prixFormation(col, key, remise = 0) {
  const d = DIPLOMES[key];
  if (!d) return 0;
  return Math.round(d.cout * (0.85 + col.taille * 0.09) * (1 - remise));
}

export function peutSInscrire(state, col, perso, key) {
  const d = DIPLOMES[key];
  if (!d) return { ok: false, motif: 'Formation inconnue.' };
  if (!ecolesDe(state.world, col).includes(key)) {
    return { ok: false, motif: 'On n’enseigne pas ça ici.' };
  }
  if (!estVivant(perso)) return { ok: false, motif: 'Pas en état.' };
  if (perso.formation) return { ok: false, motif: `${perso.nom} est déjà en formation.` };
  if ((perso.diplomes || []).includes(key)) {
    return { ok: false, motif: `${perso.nom} a déjà ce diplôme.` };
  }
  // Une école ne reprend pas depuis le début quelqu'un qui la dépasse déjà.
  if (perso.skills[d.skill] >= d.plancher + 25) {
    return { ok: false, motif: `${perso.nom} en sait déjà plus que l’école.` };
  }
  return { ok: true };
}

export function inscrire(state, col, perso, key, log) {
  const v = peutSInscrire(state, col, perso, key);
  if (!v.ok) return v;
  const remise = state.player.allegeance && state.player.allegeance.faction === col.faction ? 0.15 : 0;
  const prix = prixFormation(col, key, remise);
  if (state.player.credits < prix) {
    return { ok: false, motif: `Il manque ${prix - state.player.credits} cr.` };
  }
  state.player.credits -= prix;
  perso.formation = {
    key,
    colonieId: col.id,
    restant: DIPLOMES[key].heures,
    total: DIPLOMES[key].heures,
  };
  if (log) {
    log({
      type: 'formation',
      texte: `${perso.nom} entre à l’école : ${DIPLOMES[key].nom} (${prix} cr).`,
      important: true,
      regionId: col.regionId,
    });
  }
  return { ok: true, prix };
}

export function abandonnerFormation(perso) {
  if (!perso.formation) return { ok: false, motif: 'Aucune formation en cours.' };
  perso.formation = null;
  return { ok: true };
}

/** En formation, on n'est pas disponible : ni au travail, ni au combat. */
export function enFormation(perso) {
  return !!(perso.formation && perso.formation.restant > 0);
}

/**
 * Une heure d'école, pour ceux qui sont au bon endroit. Ailleurs, la formation
 * ne progresse pas — elle attend, et l'élève peut y revenir.
 */
export function tickFormation(state, log) {
  for (const g of groupes(state)) {
    const col = state.world.colonies.find((c) => c.regionId === g.regionId && !c.ruine);
    for (const c of g.membres) {
      if (!c.formation || !estVivant(c)) continue;
      if (!col || col.id !== c.formation.colonieId) continue; // pas sur place
      c.formation.restant -= 1;
      if (c.formation.restant > 0) continue;

      const key = c.formation.key;
      const avant = c.skills[DIPLOMES[key].skill];
      c.formation = null;
      accorderDiplome(c, key);
      if (log) {
        log({
          type: 'formation',
          texte: `${c.nom} sort diplômé : ${DIPLOMES[key].nom}. `
            + `${SKILLS[DIPLOMES[key].skill]} ${avant} → ${c.skills[DIPLOMES[key].skill]}, `
            + 'et apprend désormais plus vite.',
          important: true,
          regionId: g.regionId,
        });
      }
    }
  }
}
