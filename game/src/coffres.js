// Un coffre en ville : de la place qui ne marche pas avec vous.
//
// Tout ce qu'on possède tenait dans deux endroits : le sac, borné par ce que les
// gens portent, et l'entrepôt de l'avant-poste, qui est à un seul endroit du
// monde et qu'on n'a pas forcément. Entre les deux, rien — et le banc a chiffré
// ce que ça coûte : **34 % de la cargaison d'une caravane détroussée reste sur
// place faute de bras**, un marchand ne charge que ce que son escouade tient, et
// l'on brade en ville ce qu'on aurait gardé.
//
// Deux régimes, et c'est là que « posséder » veut enfin dire quelque chose :
//
//   Louer    partout où il y a une ville. Un loyer tous les trente jours,
//            prélevé tout seul. Qui ne peut plus payer voit le bailleur se
//            servir dans le coffre — il ne jette rien, il se rembourse.
//   Acheter  seulement là où l'on vous laisse posséder : chez une faction qui
//            vous estime assez, ou dans une ville libre, où personne n'est en
//            position d'interdire quoi que ce soit.
//
// Le contenu appartient au joueur, pas au monde : il vit dans `state.player`,
// comme les crédits. Une ville qui tombe ne le fait pas disparaître pour autant
// — voir `tickCoffres`, on ne prend pas les gens en traître.

import { COMMODITIES, COMMODITY_KEYS } from './data.js';
import { poidsInventaire } from './economy.js';
import { loiIci, REGIMES } from './lois.js';
import { noterArgent } from './rapport.js';

/** Ce qu'un coffre tient, en kilos. */
export const CAPACITE_LOUEE = 140;
export const CAPACITE_ACHETEE = 260;

/** Le loyer, et sa période. */
export const LOYER = 70;
export const PERIODE_LOYER = 24 * 30;

/** Ce que coûte un coffre qu'on achète. */
export const PRIX_COFFRE = 1300;

/**
 * L'estime qu'il faut pour posséder chez une faction ordinaire.
 *
 * Ce n'est plus ce module qui en décide : depuis les régimes, c'est
 * `REGIMES[…].propriete`, et il vaut 25 en Franchise, 40 sous une Charte, et
 * jamais dans une Commune ou un Domaine. La constante ne survit ici que comme
 * raccourci de lecture, et elle **relit** la valeur de la Charte plutôt que de
 * la redéclarer : deux nombres écrits séparément finissent toujours par diverger,
 * et c'est l'écran d'aide qui ment alors au joueur.
 */
export const ESTIME_PROPRIETE = REGIMES.charte.propriete;

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

function tousLesCoffres(state) {
  if (!state.player.coffres) state.player.coffres = {};
  return state.player.coffres;
}

/** Le coffre qu'on tient dans cette ville, s'il y en a un. */
export function coffreDe(state, colId) {
  return tousLesCoffres(state)[colId] || null;
}

export function capaciteCoffre(coffre) {
  if (!coffre) return 0;
  return coffre.achete ? CAPACITE_ACHETEE : CAPACITE_LOUEE;
}

export function placeCoffre(coffre) {
  if (!coffre) return { pris: 0, total: 0, libre: 0 };
  const pris = poidsInventaire(coffre.contenu);
  const total = capaciteCoffre(coffre);
  return { pris, total, libre: Math.max(0, total - pris) };
}

/** Tous les coffres, avec leur ville, pour l'affichage. */
export function coffresConnus(state) {
  const out = [];
  for (const id of Object.keys(tousLesCoffres(state))) {
    const col = state.world.colonies.find((c) => c.id === id);
    out.push({ colId: id, col, coffre: state.player.coffres[id] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ouvrir un coffre
// ---------------------------------------------------------------------------

export function peutLouer(state, col) {
  if (!col || col.ruine) return { ok: false, motif: 'Il faut une ville debout.' };
  if (coffreDe(state, col.id)) return { ok: false, motif: 'Vous en avez déjà un ici.' };
  // Un Domaine ne loue pas non plus : tout appartient au seigneur.
  const reg = loiIci(state, col).regime;
  if (reg.propriete === null && reg.ecole === 'maison') {
    return { ok: false, motif: `${reg.nom} : on n’y loue rien à un étranger.` };
  }
  if (state.player.credits < LOYER) {
    return { ok: false, motif: `Le premier mois se paie d’avance : ${LOYER} cr.` };
  }
  return { ok: true };
}

/**
 * Là où l'on vous laisse posséder.
 *
 * Une ville libre ne demande rien à personne — il n'y a pas d'autorité pour
 * refuser. Une faction, elle, ne vend pas de murs à un inconnu : il faut qu'elle
 * vous estime. C'est la première fois qu'un régime politique change ce qu'on
 * peut faire dans une ville plutôt que la couleur de sa fiche.
 */
export function peutAcheter(state, col) {
  if (!col || col.ruine) return { ok: false, motif: 'Il faut une ville debout.' };
  const c = coffreDe(state, col.id);
  if (c && c.achete) return { ok: false, motif: 'Celui-ci est déjà à vous.' };
  // C'est le régime qui décide de ce qu'on peut posséder chez eux — pas un
  // seuil en dur. Voir REGIMES dans lois.js.
  const reg = loiIci(state, col).regime;
  if (reg.propriete === null) {
    return { ok: false, motif: `${reg.nom} : on ne possède rien ici. ${reg.desc}` };
  }
  if (col.faction) {
    const repu = state.player.reputation[col.faction] || 0;
    if (repu < reg.propriete) {
      return {
        ok: false,
        motif: `On ne vend pas de murs à un inconnu : estime ${Math.round(repu)} / ${reg.propriete}.`,
      };
    }
  }
  if (state.player.credits < PRIX_COFFRE) {
    return { ok: false, motif: `Il manque ${PRIX_COFFRE - state.player.credits} cr.` };
  }
  return { ok: true };
}

function creer(state, col, achete) {
  const coffres = tousLesCoffres(state);
  const existant = coffres[col.id];
  coffres[col.id] = {
    nom: col.nom,
    regionId: col.regionId,
    achete,
    // Jusqu'à quand le loyer est payé. Sans objet pour un coffre acheté.
    jusqu: achete ? null : state.temps + PERIODE_LOYER,
    contenu: existant ? existant.contenu : {},
  };
  return coffres[col.id];
}

export function louerCoffre(state, col, log) {
  const v = peutLouer(state, col);
  if (!v.ok) return v;
  state.player.credits -= LOYER;
  creer(state, col, false);
  if (log) {
    log({
      type: 'coffre',
      texte: `Un coffre loué à ${col.nom} : ${LOYER} cr le mois, ${CAPACITE_LOUEE} kg.`,
      important: true,
      regionId: col.regionId,
    });
  }
  return { ok: true };
}

export function acheterCoffre(state, col, log) {
  const v = peutAcheter(state, col);
  if (!v.ok) return v;
  state.player.credits -= PRIX_COFFRE;
  creer(state, col, true);
  if (log) {
    log({
      type: 'coffre',
      texte: `Vous êtes propriétaire à ${col.nom} : ${CAPACITE_ACHETEE} kg, et plus de loyer.`,
      important: true,
      regionId: col.regionId,
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Y mettre, en reprendre
// ---------------------------------------------------------------------------

export function deposerAuCoffre(state, col, key, qte, groupe) {
  const g = groupe || state.player.groupes[0];
  const coffre = coffreDe(state, col && col.id);
  if (!coffre) return { ok: false, motif: 'Aucun coffre ici.' };
  if (g.regionId !== col.regionId) return { ok: false, motif: 'Il faut être sur place.' };
  const dispo = Math.floor(g.inventaire[key] || 0);
  const place = placeCoffre(coffre);
  const poidsU = COMMODITIES[key].poids;
  const tient = poidsU > 0 ? Math.floor(place.libre / poidsU) : dispo;
  const n = Math.max(0, Math.min(Math.floor(qte), dispo, tient));
  if (n <= 0) return { ok: false, motif: place.libre <= 0 ? 'Le coffre est plein.' : 'Rien à y mettre.' };
  g.inventaire[key] -= n;
  coffre.contenu[key] = (coffre.contenu[key] || 0) + n;
  return { ok: true, qte: n };
}

export function retirerDuCoffre(state, col, key, qte, groupe) {
  const g = groupe || state.player.groupes[0];
  const coffre = coffreDe(state, col && col.id);
  if (!coffre) return { ok: false, motif: 'Aucun coffre ici.' };
  if (g.regionId !== col.regionId) return { ok: false, motif: 'Il faut être sur place.' };
  const dispo = Math.floor(coffre.contenu[key] || 0);
  const n = Math.max(0, Math.min(Math.floor(qte), dispo));
  if (n <= 0) return { ok: false, motif: 'Il n’y en a pas.' };
  coffre.contenu[key] = dispo - n;
  g.inventaire[key] = (g.inventaire[key] || 0) + n;
  return { ok: true, qte: n };
}

// ---------------------------------------------------------------------------
// Le loyer court
// ---------------------------------------------------------------------------

/**
 * Le loyer tombe tout seul, et le bailleur se rembourse sur ce qu'il garde.
 *
 * Il ne jette rien et ne confisque pas tout : il prend de quoi couvrir le mois,
 * au prix du gros, et l'on garde le reste. Un joueur parti trois saisons ne
 * revient donc pas à un coffre vide sans savoir pourquoi — il revient à un
 * coffre entamé, et le journal dit de combien.
 */
export function tickCoffres(state, log) {
  const coffres = tousLesCoffres(state);
  for (const id of Object.keys(coffres)) {
    const coffre = coffres[id];
    if (coffre.achete) continue;
    if (state.temps < coffre.jusqu) continue;
    coffre.jusqu = state.temps + PERIODE_LOYER;
    if (state.player.credits >= LOYER) {
      state.player.credits -= LOYER;
      noterArgent(state, 'loyers de coffre', -LOYER);
      if (log) {
        log({
          type: 'coffre',
          texte: `Loyer du coffre de ${coffre.nom} : ${LOYER} cr.`,
          discret: true,
        });
      }
      continue;
    }
    // Pas de quoi payer : il se sert, au prix du gros — et jamais plus de la
    // moitié de ce qu'il garde. Un mois impayé ne vide pas un coffre : sinon la
    // sanction est sans commune mesure avec la dette, et l'on perd trois mois de
    // butin pour soixante-dix crédits.
    let du = LOYER;
    let pris = 0;
    for (const k of COMMODITY_KEYS) {
      if (du <= 0) break;
      const q = Math.floor(coffre.contenu[k] || 0);
      if (q <= 0) continue;
      const unite = COMMODITIES[k].prix * 0.5;
      const n = Math.min(Math.floor(q / 2), Math.ceil(du / unite));
      if (n <= 0) continue;
      coffre.contenu[k] = q - n;
      du -= n * unite;
      pris += n;
    }
    if (log) {
      log({
        type: 'coffre',
        texte: pris
          ? `Loyer impayé à ${coffre.nom} : le bailleur a pris ${pris} unités dans le coffre.`
          : `Loyer impayé à ${coffre.nom}, et il n’y avait rien à prendre. On vous attend.`,
        important: true,
      });
    }
  }
}
