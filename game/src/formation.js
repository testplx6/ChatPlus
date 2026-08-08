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

import { DIPLOMES, DIPLOME_KEYS, FACTIONS, SKILLS, drapeauDe} from './data.js';
import { accorderDiplome, estVivant, comp, gagnerXp, XP_PRATIQUE } from './characters.js';
import { groupes } from './groupes.js';
import { estAuService } from './allegeance.js';
import { loiIci } from './lois.js';

/** Ce qu'une ville enseigne, d'après qui la tient et ce qu'elle pèse. */
export function ecolesDe(world, col) {
  if (!col || col.ruine || !col.faction) return [];
  const style = drapeauDe(world, col.faction) && drapeauDe(world, col.faction).style;
  if (!style) return [];
  return DIPLOME_KEYS.filter((k) => {
    const d = DIPLOMES[k];
    return d.styles.includes(style) && col.taille >= d.tailleMin;
  });
}

/**
 * Le prix demandé ici : une grande ville se paie plus cher qu'un poste — et le
 * régime décide si l'on paie tout court.
 *
 * Une Commune instruit gratuitement, c'est ce qu'elle donne en échange de ce
 * qu'elle prélève. Un Domaine réserve ses écoles à ceux qui servent la maison :
 * le prix reste, mais `peutSInscrire` refuse les étrangers.
 */
export function prixFormation(col, key, remise = 0, regime) {
  const d = DIPLOMES[key];
  if (!d) return 0;
  if (regime && regime.ecole === 'libre') return 0;
  return Math.round(d.cout * (0.85 + col.taille * 0.09) * (1 - remise));
}

export function peutSInscrire(state, col, perso, key) {
  const d = DIPLOMES[key];
  if (!d) return { ok: false, motif: 'Formation inconnue.' };
  const reg = loiIci(state, col).regime;
  if (reg.ecole === 'maison' && !estAuService(state, col.faction)) {
    return { ok: false, motif: `${reg.nom} : l’école est réservée à ceux qui servent la maison.` };
  }
  if (!ecolesDe(state.world, col).includes(key)) {
    return { ok: false, motif: 'On n’enseigne pas ça ici.' };
  }
  if (!estVivant(perso)) return { ok: false, motif: 'Pas en état.' };
  if (perso.formation) return { ok: false, motif: `${perso.nom} est déjà en formation.` };
  if ((perso.diplomes || []).includes(key)) {
    return { ok: false, motif: `${perso.nom} a déjà ce diplôme.` };
  }
  return { ok: true };
}

export function inscrire(state, col, perso, key, log) {
  const v = peutSInscrire(state, col, perso, key);
  if (!v.ok) return v;
  // La remise d'une école va à qui sert la maison : n'importe laquelle de vos
  // colonnes engagée chez eux suffit à vous ouvrir le tarif.
  const remise = estAuService(state, col.faction) ? 0.15 : 0;
  const prix = prixFormation(col, key, remise, loiIci(state, col).regime);
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

export function abandonnerFormation(perso, state) {
  if (!perso.formation) return { ok: false, motif: 'Aucune formation en cours.' };
  if (state) libererInstructeur(state, perso);
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
  const base = state.base;
  for (const g of groupes(state)) {
    const col = state.world.colonies.find((c) => c.regionId === g.regionId && !c.ruine);
    const aLaBase = base && base.fonde && g.regionId === base.regionId;
    for (const c of g.membres) {
      if (!c.formation || !estVivant(c)) continue;

      if (c.formation.maison) {
        // Chez soi : il faut l'avant-poste, le maître à côté, et de quoi manger.
        if (!aLaBase) continue;
        const maitre = presentsBase(state).find((x) => x.id === c.formation.instructeurId);
        if (!maitre || !estVivant(maitre)) continue;
        if ((base.stock.rations || 0) < RATIONS_COURS) continue;
        base.stock.rations -= RATIONS_COURS;
        // Enseigner fait aussi réviser : le maître y gagne, un peu.
        gagnerXp(maitre, DIPLOMES[c.formation.key].skill, XP_PRATIQUE * 0.25);
      } else if (!col || col.id !== c.formation.colonieId) {
        continue; // l'école est ailleurs
      }

      c.formation.restant -= 1;
      if (c.formation.restant > 0) continue;

      const key = c.formation.key;
      const maison = c.formation.maison;
      const avant = c.skills[DIPLOMES[key].skill];
      libererInstructeur(state, c);
      c.formation = null;
      accorderDiplome(c, key);
      if (log) {
        log({
          type: 'formation',
          texte: `${c.nom} ${maison ? 'achève sa formation' : 'sort diplômé'} : ${DIPLOMES[key].nom}. `
            + `${SKILLS[DIPLOMES[key].skill]} ${avant} → ${c.skills[DIPLOMES[key].skill]}, `
            + 'et apprend désormais plus vite.',
          important: true,
          regionId: g.regionId,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// L'école de l'avant-poste
// ---------------------------------------------------------------------------
//
// Une ville vend une formation ; chez soi, on la transmet. Il faut quelqu'un qui
// sache — un diplômé, ou simplement quelqu'un qui en sait bien plus que ce que
// l'école apprendrait —, de quoi consigner et projeter (l'antenne), et de quoi
// nourrir tout ce monde. C'est plus lent qu'une vraie école, ça ne coûte pas un
// crédit, et ça immobilise deux personnes au lieu d'une : l'élève et le maître.
//
// C'est ce qui donne un débouché au vétéran qu'on a mis six cents heures à
// former, et une raison de rentrer.

/** Ce qu'il faut savoir de plus que le diplôme pour l'enseigner sans l'avoir. */
export const MARGE_INSTRUCTEUR = 15;
/** Une transmission maison est plus lente qu'une école qui ne fait que ça. */
export const LENTEUR_MAISON = 1.35;
/** Rations prélevées sur l'entrepôt par heure de cours. */
export const RATIONS_COURS = 0.5;

/** Quelqu'un est-il occupé — à apprendre ou à enseigner ? */
export function occupeParEcole(c) {
  return !!(c && ((c.formation && c.formation.restant > 0) || c.enseigne));
}

/** Les gens présents à l'avant-poste, tous groupes confondus. */
function presentsBase(state) {
  const base = state.base;
  if (!base || !base.fonde) return [];
  const out = [];
  for (const g of groupes(state)) {
    if (g.regionId !== base.regionId) continue;
    for (const c of g.membres) if (estVivant(c)) out.push(c);
  }
  return out;
}

/** Qui peut enseigner quoi, ici et maintenant. */
export function ecolesAvantPoste(state) {
  const base = state.base;
  if (!base || !base.fonde) return [];
  if ((base.batiments.antenne || 0) < 1) return [];
  const gens = presentsBase(state);
  const out = [];
  for (const k of DIPLOME_KEYS) {
    const d = DIPLOMES[k];
    const maitre = gens.find((c) => !occupeParEcole(c)
      && ((c.diplomes || []).includes(k) || comp(c, d.skill) >= d.plancher + MARGE_INSTRUCTEUR));
    if (maitre) out.push({ key: k, instructeur: maitre });
  }
  return out;
}

export function peutApprendreChezSoi(state, perso, key) {
  const offre = ecolesAvantPoste(state).find((o) => o.key === key);
  if (!offre) return { ok: false, motif: 'Personne ici ne sait l’enseigner.' };
  if (offre.instructeur.id === perso.id) {
    return { ok: false, motif: 'On ne s’enseigne pas à soi-même.' };
  }
  if (!presentsBase(state).some((c) => c.id === perso.id)) {
    return { ok: false, motif: `${perso.nom} n’est pas à l’avant-poste.` };
  }
  if (occupeParEcole(perso)) return { ok: false, motif: `${perso.nom} est déjà pris.` };
  if ((perso.diplomes || []).includes(key)) {
    return { ok: false, motif: `${perso.nom} a déjà ce diplôme.` };
  }
  // On n'écarte plus les bons élèves : un diplôme ajoute toujours quelque chose
  // à qui le dépasse déjà. Voir `accorderDiplome`.
  return { ok: true, instructeur: offre.instructeur };
}

export function enseignerChezSoi(state, perso, key, log) {
  const v = peutApprendreChezSoi(state, perso, key);
  if (!v.ok) return v;
  const heures = Math.round(DIPLOMES[key].heures * LENTEUR_MAISON);
  perso.formation = {
    key,
    colonieId: null,
    maison: true,
    instructeurId: v.instructeur.id,
    restant: heures,
    total: heures,
  };
  v.instructeur.enseigne = { key, eleveId: perso.id };
  if (log) {
    log({
      type: 'formation',
      texte: `${v.instructeur.nom} prend ${perso.nom} en formation : ${DIPLOMES[key].court.toLowerCase()}.`,
      important: true,
      regionId: state.base.regionId,
    });
  }
  return { ok: true, heures, instructeur: v.instructeur.nom };
}

/** Libère le maître quand l'élève s'arrête, quelle qu'en soit la raison. */
function libererInstructeur(state, perso) {
  if (!perso.formation || !perso.formation.instructeurId) return;
  for (const g of groupes(state)) {
    for (const c of g.membres) {
      if (c.id === perso.formation.instructeurId && c.enseigne
        && c.enseigne.eleveId === perso.id) delete c.enseigne;
    }
  }
}
