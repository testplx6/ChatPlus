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
import { distance, porteeDe } from './world.js';
import { groupes } from './groupes.js';
import { estVivant } from './characters.js';
import { rangDe } from './allegeance.js';
import { REGISTRES_SEUIL } from './services.js';
import { pactesDe } from './pactes.js';
import { campsDe, savoir } from './base.js';
import { notable } from './notables.js';
// Les canaux et le voyage des nouvelles vivent dans faits.js (ordre des
// modules : la porte des faits est citée bien avant la connaissance) — on les
// ré-exporte ici, où l'écran et les tests viennent naturellement les chercher.
import { CANAUX, CANAL_PAR_TYPE, ROUTE_MOYENNE, delaiNouvelle } from './faits.js';
export { CANAUX, CANAL_PAR_TYPE, ROUTE_MOYENNE, delaiNouvelle };

/** Au-delà, l'information est trop vieille pour valoir mieux que rien. */
export const PEREMPTION = 24 * 120; // quatre saisons

export function creerConnaissance(t = 0) {
  return { colonies: {}, regions: {}, armees: {}, maj: t };
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
  const optique = savoir(state, 'optique');
  const ajouter = (rid) => {
    vues.add(rid);
    // Ce qu'on surveille depuis là dépend d'où l'on est (GEOGRAPHIE.md, G6) :
    // d'un Relais on embrasse le pays, du fond d'un canyon on ne voit que ses
    // pieds. La lunette et le terrain s'ajoutent — un bon œil ne perce pas une
    // paroi, mais il sert davantage en terrain dégagé.
    const ici = state.world.regions[rid];
    const portee = Math.max(0, optique + (ici ? porteeDe(ici.biome) : 0));
    if (!portee) return;
    for (const r of state.world.regions) {
      if (distance(r.i, rid) <= portee) vues.add(r.i);
    }
  };
  for (const g of groupes(state)) {
    if (g.membres.some(estVivant)) ajouter(g.regionId);
  }
  // Chacun des camps, et pas seulement celui qu'on habite : un camp est un lieu
  // habité, il voit ce qui passe devant lui. En tenir deux et n'en voir qu'un,
  // c'est n'en tenir qu'un.
  for (const c of campsDe(state)) if (c.fonde) ajouter(c.regionId);

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

function releverColonie(col, t, prix) {
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
    // Les prix du moment, si on nous les a donnés (INTERFACE.md, U7) : le
    // carnet du négociant vit de ces dix nombres datés.
    prix: prix || null,
  };
}

function releverRegion(r, t) {
  return { t, controle: r.controle, colonie: r.colonie };
}

function releverArmee(a, t) {
  return {
    t,
    faction: a.faction,
    force: Math.round(a.force),
    regionId: a.regionId,
    etat: a.etat,
  };
}

/**
 * Met à jour les relevés des lieux sous surveillance. Appelé à chaque heure de
 * jeu : c'est deux ou trois régions en pratique, pas la carte entière.
 */
export function observer(state, prixDe) {
  const c = state.connaissance || (state.connaissance = creerConnaissance(state.temps));
  if (!c.armees) c.armees = {}; // parties d'avant l'état-major (MARECHAL.md, M5)
  const t = state.temps;
  // Les colonnes en marche se relèvent comme les villes : là où l'on a des
  // yeux, on note qui passe, à quelle force, et la date. Une poignée
  // d'armées au plus — c'est donné.
  const vues = regionsVues(state);
  for (const a of state.world.armees || []) {
    if (vues.has(a.regionId)) c.armees[a.id] = releverArmee(a, t);
  }
  // Un relevé de quatre saisons ne dit plus rien — et l'armée est morte
  // depuis longtemps. On fait de la place.
  for (const id of Object.keys(c.armees)) {
    if (t - c.armees[id].t > PEREMPTION) delete c.armees[id];
  }
  for (const rid of vues) {
    const r = state.world.regions[rid];
    if (!r) continue;
    c.regions[rid] = releverRegion(r, t);
    const col = state.world.colonies.find((x) => x.regionId === rid);
    if (col) {
      c.colonies[col.id] = releverColonie(col, t,
        prixDe ? prixDe(col, state.world) : null);
    }
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
  // Et ce qu'un allié partage. « Partager ce qu'on sait » se signait depuis
  // deux semaines et ne faisait rien : une promesse qui n'engage à rien est
  // pire que pas de promesse — elle apprend au joueur que la parole donnée est
  // un décor. Ce que l'allié voit de chez lui, c'est ses villes : elles
  // entrent au carnet comme si l'on avait un contremaître dans chacune.
  //
  // Le monde n'a pas à savoir qui joue (règle d'or) : c'est le carnet du
  // joueur qui va chercher le pacte, pas le pacte qui vient remplir le carnet.
  const partagent = new Set();
  if (state.player && state.player.drapeau) {
    for (const p of pactesDe(state.world, state.player.drapeau)) {
      if (!p.clauses.includes('vue')) continue;
      partagent.add(p.a === state.player.drapeau ? p.b : p.a);
    }
  }

  if (t % 3 === 0) {
    for (const col of state.world.colonies) {
      if (col.ruine) continue;
      if (partagent.has(col.faction)) {
        c.colonies[col.id] = releverColonie(col, t,
          prixDe ? prixDe(col, state.world) : null);
        c.regions[col.regionId] = releverRegion(state.world.regions[col.regionId], t);
        continue;
      }
      const cm = notable(col, 'contremaitre');
      if (cm && (cm.opinion || 0) >= REGISTRES_SEUIL) {
        c.colonies[col.id] = releverColonie(col, t,
          prixDe ? prixDe(col, state.world) : null);
      }
    }
  }

  // Les colonnes que l'allié croise chez lui : ce qui passe sur ses terres, il
  // le voit, et il le dit. C'est la moitié militaire de la même promesse.
  if (partagent.size) {
    for (const a of state.world.armees || []) {
      const r = state.world.regions[a.regionId];
      if (r && partagent.has(r.controle)) c.armees[a.id] = releverArmee(a, t);
    }
  }
  c.maj = t;
}

/**
 * Le carnet du négociant (INTERFACE.md, U7) : par marchandise, où c'est le
 * moins cher et où ça se vend le mieux, d'après les relevés qu'on possède —
 * jamais d'après la vérité du monde. L'écart n'a de sens qu'entre deux
 * villes distinctes, et un relevé au-delà de la péremption ne guide plus
 * personne. Tout est daté : la date vaut autant que le chiffre.
 */
export function carnetPrix(state) {
  const c = state.connaissance;
  const t = state.temps;
  const out = {};
  if (!c) return out;
  for (const k of COMMODITY_KEYS) {
    const releves = [];
    for (const id of Object.keys(c.colonies)) {
      const r = c.colonies[id];
      if (!r || r.ruine || !r.prix || r.prix[k] === undefined) continue;
      if (t - r.t > PEREMPTION) continue;
      releves.push({
        colonieId: id, nom: r.nom, regionId: r.regionId,
        prix: r.prix[k], depuis: t - r.t,
      });
    }
    if (!releves.length) continue;
    releves.sort((a, b) => a.prix - b.prix);
    const achat = releves[0];
    let vente = null;
    for (let i = releves.length - 1; i >= 0; i--) {
      if (releves[i].colonieId !== achat.colonieId) { vente = releves[i]; break; }
    }
    out[k] = {
      achat,
      vente,
      ecart: vente ? Math.round((vente.prix - achat.prix) * 10) / 10 : 0,
      releves: releves.length,
    };
  }
  return out;
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
  const portee = savoir(state, 'optique');
  for (const g of groupes(state)) {
    if (!g.membres.some(estVivant)) continue;
    if (g.regionId === regionId) return true;
    if (portee && distance(g.regionId, regionId) <= portee) return true;
  }
  if (state.base.fonde) {
    for (const c of campsDe(state)) {
      if (!c.fonde) continue;
      if (c.regionId === regionId) return true;
      if (portee && distance(c.regionId, regionId) <= portee) return true;
    }
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

/** Sert-on cette maison ? Ses rapports de marche arrivent dès le grade d'Agent. */
function estDeLaMaison(state, faction) {
  for (const g of groupes(state)) {
    const all = g.allegeance;
    if (all && all.faction === faction && rangDe(all).index >= 1) return true;
  }
  return false;
}

/**
 * Ce qu'on sait d'une colonne en marche (MARECHAL.md, M5) : sous nos yeux ou
 * rapportée par la maison qu'on sert, elle se lit en direct ; la
 * cryptographie ouvre leurs transmissions ; sinon, le dernier relevé, daté —
 * et il vieillit à sa place d'hier, car le monde a bougé, pas votre savoir.
 * Jamais vue : null — elle n'existe pas pour nous.
 */
export function vueArmee(state, a) {
  if (!a) return null;
  const frais = estSurveillee(state, a.regionId)
    || savoir(state, 'cryptographie') > 0
    || estDeLaMaison(state, a.faction);
  if (frais) {
    return {
      id: a.id, frais: true, depuis: 0, faction: a.faction,
      force: Math.round(a.force), regionId: a.regionId, etat: a.etat,
      cible: a.cible || null,
    };
  }
  const r = state.connaissance && state.connaissance.armees
    && state.connaissance.armees[a.id];
  if (!r) return null;
  return {
    id: a.id, frais: false, depuis: state.temps - r.t, faction: r.faction,
    force: r.force, regionId: r.regionId, etat: r.etat, cible: null,
  };
}

/**
 * L'état-major : tout ce qu'on sait des colonnes — le frais et le daté, y
 * compris les relevés d'armées qu'on ne retrouve plus : peut-être dissoutes,
 * peut-être ailleurs — on croit ce qu'on a vu, jusqu'à péremption.
 */
export function armeesConnues(state) {
  const out = [];
  const vivantes = new Set();
  for (const a of state.world.armees || []) {
    const v = vueArmee(state, a);
    if (v) {
      out.push(v);
      vivantes.add(a.id);
    }
  }
  const c = state.connaissance;
  if (c && c.armees) {
    for (const id of Object.keys(c.armees)) {
      if (vivantes.has(id)) continue;
      const r = c.armees[id];
      out.push({
        id, frais: false, depuis: state.temps - r.t, faction: r.faction,
        force: r.force, regionId: r.regionId, etat: r.etat, cible: null,
      });
    }
  }
  return out;
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
    const delai = delaiNouvelle(state, x.type, x.regionId);
    if (state.temps - x.t < delai) continue;
    out.push(Object.assign({}, x, { rapporte: delai > 0 }));
  }
  return out;
}
