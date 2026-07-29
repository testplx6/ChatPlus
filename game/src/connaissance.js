// Ce que le joueur sait, par opposition à ce qui est.
//
// Règle unique, et volontairement simple : là où on a quelqu'un, on voit en
// temps réel ; partout ailleurs on lit le dernier relevé, avec sa date. Une
// ville qu'on a quittée il y a trois mois affiche la population, les stocks et
// le drapeau d'il y a trois mois — et le drapeau a peut-être changé.
//
// C'est ce qui donne une valeur à envoyer quelqu'un quelque part : une paire
// d'yeux postée dans une ville rapporte du renseignement frais, et le
// renseignement frais est ce qui permet de décider. Sans ce module, explorer ne
// rapportait rien qui se monnaye et détacher un éclaireur était une perte
// sèche — le banc d'équilibrage l'a chiffré.

import { COMMODITY_KEYS } from './data.js';
import { distance } from './world.js';
import { groupes } from './groupes.js';
import { estVivant } from './characters.js';
import { rangDe } from './allegeance.js';
import { REGISTRES_SEUIL } from './services.js';
import { notable } from './notables.js';

/** Au-delà, l'information est trop vieille pour valoir mieux que rien. */
export const PEREMPTION = 24 * 120; // quatre saisons

export function creerConnaissance(t = 0) {
  return { colonies: {}, regions: {}, maj: t };
}

// ---------------------------------------------------------------------------
// Ce qu'on voit
// ---------------------------------------------------------------------------

/**
 * Les régions sous surveillance à cet instant : celles où l'on a quelqu'un de
 * vivant, l'avant-poste, et ce que la portée optique ajoute autour.
 */
export function regionsVues(state) {
  const vues = new Set();
  const portee = state.base.recherche.optique || 0;
  const ajouter = (rid) => {
    vues.add(rid);
    if (!portee) return;
    for (const r of state.world.regions) {
      if (distance(r.i, rid) <= portee) vues.add(r.i);
    }
  };
  for (const g of groupes(state)) {
    if (g.membres.some(estVivant)) ajouter(g.regionId);
  }
  if (state.base.fonde) ajouter(state.base.regionId);

  // Servir une faction, c'est recevoir ses rapports. À partir d'Agent, ses
  // villes ne sont plus jamais une surprise : c'est la contrepartie concrète
  // d'un grade, et ça vaut mieux qu'une remise de deux pour cent.
  // Chaque colonne engagée rapporte ce que sa faction lui transmet.
  for (const g of groupes(state)) {
    const all = g.allegeance;
    if (!all || rangDe(all).index < 1) continue;
    for (const col of state.world.colonies) {
      if (!col.ruine && col.faction === all.faction) vues.add(col.regionId);
    }
  }
  return vues;
}

// ---------------------------------------------------------------------------
// Relevés
// ---------------------------------------------------------------------------

function releverColonie(col, t) {
  const stock = {};
  for (const k of COMMODITY_KEYS) stock[k] = Math.round(col.stock[k] || 0);
  return {
    t,
    nom: col.nom,
    regionId: col.regionId,
    faction: col.faction,
    taille: col.taille,
    pop: Math.round(col.pop),
    defense: Math.round(col.defense),
    defenseMax: Math.round(col.defenseMax),
    unrest: Number((col.unrest || 0).toFixed(2)),
    ruine: !!col.ruine,
    stock,
  };
}

function releverRegion(r, t) {
  return { t, controle: r.controle, colonie: r.colonie };
}

/**
 * Met à jour les relevés des lieux sous surveillance. Appelé à chaque heure de
 * jeu : c'est deux ou trois régions en pratique, pas la carte entière.
 */
export function observer(state) {
  const c = state.connaissance || (state.connaissance = creerConnaissance(state.temps));
  const t = state.temps;
  for (const rid of regionsVues(state)) {
    const r = state.world.regions[rid];
    if (!r) continue;
    c.regions[rid] = releverRegion(r, t);
    const col = state.world.colonies.find((x) => x.regionId === rid);
    if (col) c.colonies[col.id] = releverColonie(col, t);
  }
  // Un contremaître qui vous apprécie assez laisse ses registres ouverts : ses
  // chiffres restent frais même à l'autre bout de la carte. C'est le seul moyen
  // de savoir sans être là, et il s'achète en rendant des services, pas en
  // payant.
  //
  // Toutes les trois heures et pas toutes les heures : une ville n'avance elle
  // -même que par tranches de trois (voir PAS_COLONIE), donc relever plus
  // souvent ne relève rien de neuf — et balayer la carte à chaque tick coûtait
  // un cinquième du budget pour ça.
  if (t % 3 === 0) {
    for (const col of state.world.colonies) {
      if (col.ruine) continue;
      const cm = notable(col, 'contremaitre');
      if (cm && (cm.opinion || 0) >= REGISTRES_SEUIL) c.colonies[col.id] = releverColonie(col, t);
    }
  }
  c.maj = t;
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/**
 * Ce que le joueur sait d'une colonie. Retourne toujours un objet lisible :
 * `frais` dit si c'est de première main, `depuis` l'âge du relevé en heures,
 * `inconnu` si on n'y a jamais mis les pieds.
 *
 * L'interface ne doit jamais lire `col` directement pour un lieu où l'escouade
 * n'est pas — c'est tout l'intérêt de passer par ici.
 */
export function vueColonie(state, col) {
  if (!col) return null;
  const c = state.connaissance;
  const surPlace = c && estSurveillee(state, col.regionId);
  if (surPlace) {
    return Object.assign(releverColonie(col, state.temps), { frais: true, depuis: 0, inconnu: false });
  }
  const releve = c && c.colonies[col.id];
  if (!releve) {
    return {
      t: null, nom: col.nom, regionId: col.regionId, faction: null, taille: null,
      pop: null, defense: null, defenseMax: null, unrest: null, ruine: false,
      stock: {}, frais: false, depuis: null, inconnu: true,
    };
  }
  return Object.assign({}, releve, {
    frais: false,
    depuis: state.temps - releve.t,
    inconnu: false,
    perime: state.temps - releve.t > PEREMPTION,
  });
}

/** Idem pour une région : qui la tenait la dernière fois qu'on a regardé. */
export function vueRegion(state, regionId) {
  const r = state.world.regions[regionId];
  if (!r) return null;
  if (estSurveillee(state, regionId)) {
    return { controle: r.controle, colonie: r.colonie, frais: true, depuis: 0, inconnu: false };
  }
  const releve = state.connaissance && state.connaissance.regions[regionId];
  if (!releve) return { controle: null, colonie: r.colonie, frais: false, depuis: null, inconnu: true };
  return {
    controle: releve.controle,
    colonie: releve.colonie,
    frais: false,
    depuis: state.temps - releve.t,
    inconnu: false,
  };
}

/**
 * Y a-t-il un œil ici, maintenant ? Recalculé à chaque appel plutôt que mis en
 * cache : un cache de module survivrait au groupe qui bouge en cours de tick et
 * mentirait d'une heure, pour économiser quelques dizaines d'itérations.
 */
export function estSurveillee(state, regionId) {
  const portee = state.base.recherche.optique || 0;
  for (const g of groupes(state)) {
    if (!g.membres.some(estVivant)) continue;
    if (g.regionId === regionId) return true;
    if (portee && distance(g.regionId, regionId) <= portee) return true;
  }
  if (state.base.fonde) {
    if (state.base.regionId === regionId) return true;
    if (portee && distance(state.base.regionId, regionId) <= portee) return true;
  }
  const col = state.world.colonies.find((c) => c.regionId === regionId);
  if (col && !col.ruine) {
    for (const g of groupes(state)) {
      const all = g.allegeance;
      if (all && rangDe(all).index >= 1 && col.faction === all.faction) return true;
    }
  }
  return false;
}

/** « il y a 3 j » — la date compte autant que le chiffre qu'elle accompagne. */
export function ageTexte(depuis) {
  if (depuis == null) return 'jamais vu';
  if (depuis <= 0) return 'à l’instant';
  if (depuis < 24) return `il y a ${Math.round(depuis)} h`;
  const j = Math.round(depuis / 24);
  return `il y a ${j} j`;
}

// ---------------------------------------------------------------------------
// Les nouvelles voyagent
// ---------------------------------------------------------------------------

/**
 * Heures qu'une nouvelle met à parvenir, selon son type. Une guerre se
 * proclame — hérauts, émissaires, tout le monde le sait vite. Une ville qui
 * tombe se sait plus lentement, et une ville qui grossit n'intéresse personne
 * avant longtemps.
 *
 * Sans ce délai, la chronique du monde annonçait en direct des villes prises
 * que personne n'avait vues tomber, ce qui vidait de son sens tout le reste du
 * module : la carte devenait un souvenir pendant que le journal restait
 * omniscient.
 */
export const DELAI_NOUVELLE = {
  guerre: 12,
  paix: 18,
  capture: 48,
  effondrement: 72,
  secession: 60,
  fondation: 96,
  croissance: 120,
  saison: 0,     // on regarde le ciel soi-même
};

/**
 * Ce que le joueur a pu apprendre du monde, avec la mention de la source.
 * Un événement dont il a été témoin est immédiat et sûr ; les autres arrivent
 * avec leur délai et sont donnés pour ce qu'ils sont : des rapports.
 */
export function nouvellesConnues(state, entrees) {
  const out = [];
  for (const x of entrees) {
    const temoin = x.regionId != null && x.vu === true;
    if (temoin) { out.push(Object.assign({}, x, { rapporte: false })); continue; }
    const delai = DELAI_NOUVELLE[x.type] ?? 36;
    if (state.temps - x.t < delai) continue;
    out.push(Object.assign({}, x, { rapporte: delai > 0 }));
  }
  return out;
}
