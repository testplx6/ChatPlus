// L'avant-poste : files de construction et de recherche à la OGame, chaîne de
// production contrainte par l'énergie, stockage plafonné, raids à encaisser.

import { BUILDINGS, RESEARCH, COMMODITY_KEYS, METIERS, METIER_KEYS } from './data.js';
import { comp, gagnerXp, estDebout, XP_PRATIQUE } from './characters.js';
import { groupes, groupeActif } from './groupes.js';

export function creerBase() {
  const stock = {};
  for (const k of COMMODITY_KEYS) stock[k] = 0;
  return {
    fonde: false,
    regionId: null,
    // Qui fait quoi. Les habitants sans poste restent des manœuvres.
    postes: {},
    nom: 'Avant-poste',
    batiments: {},
    file: [],
    recherche: {},
    fileRech: [],
    stock,
    defense: 0,
    derniereAttaque: -999,
    // Un avant-poste n'est pas un entrepôt avec des murs : des gens finissent
    // par s'y installer, y travailler, et y manger.
    pop: 0,
    moral: 60,
    recrues: 0,
  };
}

/** Combien de personnes l'avant-poste peut loger et nourrir. */
export function populationMax(base) {
  return niveau(base, 'baraquement') * 9 + niveau(base, 'hydroponie') * 4;
}

// ---------------------------------------------------------------------------
// Métiers
// ---------------------------------------------------------------------------

/** Places ouvertes pour un métier, d'après le bâtiment qui l'abrite. */
export function placesMetier(base, key) {
  const m = METIERS[key];
  if (!m) return 0;
  return niveau(base, m.batiment) * m.parNiveau;
}

/** Habitants effectivement à ce poste — jamais plus que de places. */
export function affectes(base, key) {
  const n = (base.postes && base.postes[key]) || 0;
  return Math.max(0, Math.min(n, placesMetier(base, key)));
}

/** Ceux qui n'ont pas de poste : ils aident partout, sans rien faire de précis. */
export function manoeuvres(base) {
  let pris = 0;
  for (const k of METIER_KEYS) pris += affectes(base, k);
  return Math.max(0, Math.round((base.pop || 0) - pris));
}

/**
 * Le travail des habitants sans poste, en multiplicateur général. Volontairement
 * plus faible que ce que rend une place tenue : c'est ce qui rend la
 * spécialisation intéressante plutôt que décorative.
 */
export function mainDoeuvre(base) {
  return 1 + Math.min(0.6, manoeuvres(base) / 60);
}

/**
 * Ce qu'un métier rend, tout compris : les ouvriers, et le contremaître s'il y
 * en a un sur place. Un diplômé qui supervise vaut plusieurs bras.
 */
export function rendementMetier(state, key) {
  const base = state.base;
  const n = affectes(base, key);
  if (!n) return { ouvriers: 0, mult: 1, contremaitre: null };
  const m = METIERS[key];
  const chef = contremaitre(state, key);
  const bonusChef = chef ? 1 + Math.min(0.6, comp(chef, m.skill) / 100) : 1;
  return { ouvriers: n, mult: 1 + n * m.apport * bonusChef, contremaitre: chef };
}

/** Le meilleur des vôtres présent à l'avant-poste dans la compétence du métier. */
export function contremaitre(state, key) {
  const base = state.base;
  const m = METIERS[key];
  if (!base.fonde || !m) return null;
  let best = null;
  for (const g of state.player.groupes) {
    if (g.regionId !== base.regionId) continue;
    for (const c of g.membres) {
      if (!estDebout(c)) continue;
      if (!best || comp(c, m.skill) > comp(best, m.skill)) best = c;
    }
  }
  // Un quidam qui passe n'est pas un contremaître : il faut en savoir un peu.
  return best && comp(best, m.skill) >= 20 ? best : null;
}

/** Affecte `n` habitants à un poste. Retourne ce qui a réellement été fait. */
export function affecter(state, key, n) {
  const base = state.base;
  if (!METIERS[key]) return { ok: false, motif: 'Métier inconnu.' };
  if (!base.postes) base.postes = {};
  const places = placesMetier(base, key);
  if (places <= 0) return { ok: false, motif: `Il faut bâtir ${BUILDINGS[METIERS[key].batiment].nom.toLowerCase()}.` };
  const actuel = affectes(base, key);
  const libre = manoeuvres(base);
  const vise = Math.max(0, Math.min(n, places, actuel + libre));
  base.postes[key] = vise;
  return { ok: true, affectes: vise };
}

/** Après une famine ou une démolition, les postes se réajustent tout seuls. */
export function reajusterPostes(base) {
  if (!base.postes) { base.postes = {}; return; }
  for (const k of METIER_KEYS) {
    const max = placesMetier(base, k);
    if ((base.postes[k] || 0) > max) base.postes[k] = max;
  }
  let total = 0;
  for (const k of METIER_KEYS) total += base.postes[k] || 0;
  // Trop de postes pour trop peu de monde : on dégarnit du dernier au premier.
  for (let i = METIER_KEYS.length - 1; i >= 0 && total > (base.pop || 0); i--) {
    const k = METIER_KEYS[i];
    const retire = Math.min(base.postes[k] || 0, total - (base.pop || 0));
    base.postes[k] = (base.postes[k] || 0) - retire;
    total -= retire;
  }
}

export const COUT_FONDATION = { ferraille: 120, polymere: 40, composant: 5 };

export function niveau(base, key) {
  return base.batiments[key] || 0;
}

export function niveauRech(base, key) {
  return base.recherche[key] || 0;
}

function scale(cout, mul, n) {
  const out = {};
  for (const k of Object.keys(cout)) {
    out[k] = Math.round(cout[k] * Math.pow(mul, n));
  }
  return out;
}

export function coutBatiment(base, key) {
  const b = BUILDINGS[key];
  return scale(b.cout, b.coutMul, niveau(base, key));
}

export function tempsBatiment(base, key) {
  const b = BUILDINGS[key];
  const brut = b.heures * Math.pow(b.tempsMul, niveau(base, key));
  const reduction = 1 - Math.min(0.6, niveauRech(base, 'ingenierie') * 0.1);
  return Math.max(1, Math.round(brut * reduction));
}

export function coutRecherche(base, key) {
  const r = RESEARCH[key];
  return scale(r.cout, r.coutMul, niveauRech(base, key));
}

export function tempsRecherche(base, key) {
  const r = RESEARCH[key];
  const brut = r.heures * Math.pow(r.tempsMul, niveauRech(base, key));
  const antenne = niveau(base, 'antenne');
  return Math.max(1, Math.round(brut / (1 + antenne * 0.25)));
}

export function capaciteStock(base) {
  // Un magasinier gagne de la place : ranger, c'est du volume.
  const m = 1 + affectes(base, 'magasinier') * METIERS.magasinier.apport;
  return Math.round((800 + niveau(base, 'entrepot') * 800) * m);
}

export function totalStock(base) {
  let t = 0;
  for (const k of COMMODITY_KEYS) t += base.stock[k] || 0;
  return Math.round(t);
}

export function tailleEscouadeMax(base) {
  return 4 + niveau(base, 'baraquement');
}

/** Bilan énergétique : { prod, conso, ratio } */
export function energie(base) {
  let prod = 0;
  let conso = 0;
  for (const key of Object.keys(base.batiments)) {
    const n = base.batiments[key];
    if (!n) continue;
    const e = BUILDINGS[key].energie * n;
    if (e > 0) prod += e;
    else conso -= e;
  }
  // Un générateur sans carburant ne produit rien
  if ((base.stock.carburant || 0) <= 0) prod = 0;
  return { prod, conso, ratio: conso > 0 ? Math.min(1, prod / conso) : 1 };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function peutPayer(stock, cout) {
  for (const k of Object.keys(cout)) {
    if ((stock[k] || 0) < cout[k]) return false;
  }
  return true;
}

export function payer(stock, cout) {
  for (const k of Object.keys(cout)) stock[k] -= cout[k];
}

export function lancerConstruction(state, key) {
  const base = state.base;
  if (!base.fonde) return { ok: false, motif: 'Aucun avant-poste.' };
  const b = BUILDINGS[key];
  if (!b) return { ok: false, motif: 'Bâtiment inconnu.' };
  const enFile = base.file.filter((x) => x.key === key).length;
  if (niveau(base, key) + enFile >= b.max) return { ok: false, motif: 'Niveau maximum atteint.' };
  if (base.file.length >= 5) return { ok: false, motif: 'File pleine (5).' };
  const cout = coutBatiment(base, key);
  if (!peutPayer(base.stock, cout)) return { ok: false, motif: 'Ressources insuffisantes.' };
  payer(base.stock, cout);
  const total = tempsBatiment(base, key);
  base.file.push({ key, niveau: niveau(base, key) + 1 + enFile, restant: total, total });
  return { ok: true };
}

export function annulerConstruction(state, index) {
  const base = state.base;
  const item = base.file[index];
  if (!item) return { ok: false, motif: 'Rien à annuler.' };
  base.file.splice(index, 1);
  // Remboursement partiel : 70 %
  const cout = coutBatiment(base, item.key);
  for (const k of Object.keys(cout)) {
    base.stock[k] = (base.stock[k] || 0) + Math.round(cout[k] * 0.7);
  }
  return { ok: true };
}

export function lancerRecherche(state, key) {
  const base = state.base;
  if (!base.fonde) return { ok: false, motif: 'Aucun avant-poste.' };
  if (niveau(base, 'antenne') < 1) return { ok: false, motif: 'Antenne requise.' };
  const r = RESEARCH[key];
  if (!r) return { ok: false, motif: 'Recherche inconnue.' };
  const enFile = base.fileRech.filter((x) => x.key === key).length;
  if (niveauRech(base, key) + enFile >= r.max) return { ok: false, motif: 'Niveau maximum atteint.' };
  if (base.fileRech.length >= 3) return { ok: false, motif: 'File pleine (3).' };
  const cout = coutRecherche(base, key);
  const stockEtCredits = Object.assign({}, base.stock, { credits: state.player.credits });
  if (!peutPayer(stockEtCredits, cout)) return { ok: false, motif: 'Ressources insuffisantes.' };
  for (const k of Object.keys(cout)) {
    if (k === 'credits') state.player.credits -= cout[k];
    else base.stock[k] -= cout[k];
  }
  const total = tempsRecherche(base, key);
  base.fileRech.push({ key, niveau: niveauRech(base, key) + 1 + enFile, restant: total, total });
  return { ok: true };
}

export function fonderBase(state, log, groupe) {
  const g = groupe || groupeActif(state);
  const base = state.base;
  if (base.fonde) return { ok: false, motif: 'Avant-poste déjà fondé.' };
  const inv = g.inventaire;
  if (!peutPayer(inv, COUT_FONDATION)) {
    return { ok: false, motif: 'Il faut 120 ferraille, 40 polymère, 5 composants dans le sac.' };
  }
  const r = state.world.regions[g.regionId];
  if (r.colonie) return { ok: false, motif: 'Impossible de bâtir dans une ville existante.' };
  payer(inv, COUT_FONDATION);
  base.fonde = true;
  base.regionId = g.regionId;
  base.batiments = {};
  base.defense = 10;
  log({ type: 'base', texte: `Avant-poste fondé. Ici, au moins, c’est chez nous.`, regionId: base.regionId });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Production horaire
// ---------------------------------------------------------------------------

function ajouter(base, key, qte) {
  if (qte <= 0) return 0;
  const libre = capaciteStock(base) - totalStock(base);
  const reel = Math.max(0, Math.min(qte, libre));
  base.stock[key] = (base.stock[key] || 0) + reel;
  return reel;
}

function consommer(base, key, qte) {
  const dispo = base.stock[key] || 0;
  const pris = Math.min(dispo, qte);
  base.stock[key] = dispo - pris;
  return pris;
}

/** Une heure de vie de l'avant-poste. Retourne un résumé pour l'UI. */
export function tickBase(state, log, ctx) {
  const base = state.base;
  if (!base.fonde) return null;
  const rng = ctx.rng;
  const rech = base.recherche;
  // N'importe quel groupe présent fait avancer les chantiers. Test direct
  // plutôt que `filter` : c'est du travail par heure de jeu, pas par clic.
  let surPlace = false;
  for (const g of state.player.groupes) if (g.regionId === base.regionId) { surPlace = true; break; }

  // Postes tenus, contremaîtres compris. Calculé une fois pour tout le tick.
  reajusterPostes(base);
  const M = {};
  for (const k of METIER_KEYS) M[k] = rendementMetier(state, k).mult;

  // --- Énergie. Un mécanicien règle les générateurs : ils brûlent moins.
  const gen = niveau(base, 'generateur');
  if (gen > 0) consommer(base, 'carburant', (0.55 * gen) / M.mecanicien);
  const e = energie(base);
  const r = e.ratio;

  // --- Population : elle s'installe si on peut la loger et la nourrir, elle
  // s'en va si l'un des deux manque. Sa main-d'œuvre fait tourner les ateliers.
  const maxPop = populationMax(base);
  const rationsDispo = base.stock.rations || 0;
  const besoinPop = (base.pop || 0) * 0.014;
  if (base.pop > 0) {
    const servi = Math.min(besoinPop, rationsDispo);
    base.stock.rations = Math.max(0, rationsDispo - servi);
    const satiete = besoinPop > 0 ? servi / besoinPop : 1;
    if (satiete < 0.75) {
      base.moral = Math.max(0, base.moral - 0.15);
      if (rng.chance(0.03)) base.pop = Math.max(0, base.pop - 1);
    } else {
      base.moral = Math.min(100, base.moral + 0.05);
    }
  }
  if (base.pop < maxPop && rationsDispo > (base.pop + 1) * 3 && rng.chance(0.012)) {
    base.pop += 1;
    if (base.pop === 1) {
      log({ type: 'base', texte: 'Quelqu’un s’installe à l’avant-poste. Ça commence comme ça.', regionId: base.regionId, important: true });
    } else if (base.pop % 5 === 0) {
      log({ type: 'base', texte: `L’avant-poste compte ${base.pop} habitants.`, regionId: base.regionId, important: true });
    }
  }
  if (base.pop > maxPop) base.pop = maxPop;
  const mo = mainDoeuvre(base);

  // --- Chaînes de production
  // Chaque chaîne tourne au rythme de ceux qui la tiennent : les manœuvres
  // aident partout un peu, les ouvriers affectés beaucoup, et seulement ici.
  const hyd = niveau(base, 'hydroponie');
  if (hyd > 0) {
    const bio = consommer(base, 'biomasse', 1.25 * hyd * r * mo * M.cultivateur);
    ajouter(base, 'rations', bio * 0.9 * (1 + (rech.hydroponie_av || 0) * 0.15));
  }
  const fond = niveau(base, 'fonderie');
  if (fond > 0) {
    const min = consommer(base, 'minerai', 1.2 * fond * r * mo * M.fondeur);
    ajouter(base, 'alliage', min * 0.42 * (1 + (rech.metallurgie || 0) * 0.12));
  }
  const raf = niveau(base, 'raffinerie');
  if (raf > 0) {
    const pol = consommer(base, 'polymere', 0.9 * raf * r * mo * M.raffineur);
    ajouter(base, 'carburant', pol * 0.55);
  }
  const atl = niveau(base, 'atelier');
  if (atl > 0) {
    const all = consommer(base, 'alliage', 0.35 * atl * r * mo * M.machiniste);
    const pol = consommer(base, 'polymere', 0.5 * atl * r * mo * M.machiniste);
    ajouter(base, 'composant', Math.min(all / 0.35, pol / 0.5) * 0.14 * atl * r);
  }
  const inf = niveau(base, 'infirmerie');
  if (inf > 0) {
    const bio = consommer(base, 'biomasse', 0.4 * inf * r * M.infirmier);
    ajouter(base, 'medkit', bio * 0.09);
  }

  // Les habitants ne regardent pas un raid les bras croisés — et ceux qui sont
  // affectés au mur y sont pour de bon.
  base.defense = niveau(base, 'mur') * 22 * M.milicien + 10 + (base.pop || 0) * 2.5;

  // --- File de construction
  if (base.file.length) {
    const item = base.file[0];
    let vitesse = (1 + Math.min(1, manoeuvres(base) / 30)) * M.batisseur;
    if (surPlace) {
      // Ceux qui sont là mettent la main à la pâte
      let ing = 0;
      for (const g of state.player.groupes) {
        if (g.regionId !== base.regionId) continue;
        for (const c of g.membres) {
          if (!estDebout(c)) continue;
          ing += comp(c, 'ingenierie');
          // Un chantier forme moins vite qu'une fouille : on tient la clé,
          // on ne cherche pas.
          gagnerXp(c, 'ingenierie', XP_PRATIQUE * 0.5);
        }
      }
      vitesse += Math.min(1.2, ing / 160);
    }
    item.restant -= vitesse;
    if (item.restant <= 0) {
      base.batiments[item.key] = (base.batiments[item.key] || 0) + 1;
      base.file.shift();
      log({
        type: 'base',
        texte: `${BUILDINGS[item.key].nom} niveau ${base.batiments[item.key]} opérationnel.`,
        regionId: base.regionId,
      });
    }
  }

  // --- File de recherche. Les opérateurs de l'antenne y sont pour beaucoup.
  if (base.fileRech.length) {
    const item = base.fileRech[0];
    item.restant -= M.operateur;
    if (item.restant <= 0) {
      base.recherche[item.key] = (base.recherche[item.key] || 0) + 1;
      base.fileRech.shift();
      log({
        type: 'recherche',
        texte: `Recherche achevée : ${RESEARCH[item.key].nom} ${base.recherche[item.key]}.`,
      });
    }
  }

  // --- Raid sur l'avant-poste
  const reg = state.world.regions[base.regionId];
  const t = state.temps;
  if (t - base.derniereAttaque > 72 && rng.chance(0.0016 * (1 + reg.danger * 4))) {
    base.derniereAttaque = t;
    const force = rng.irange(20, 45) + Math.floor(t / 600) + Math.round((base.pop || 0) * 1.5);
    // `forceEscouade` ne compte déjà que les gens présents : laisser
    // l'avant-poste sans personne, c'est le laisser à sa garnison.
    const defense = base.defense + forceEscouade(state);
    if (defense > force) {
      base.defense = Math.max(0, base.defense - force * 0.3);
      log({
        type: 'raid',
        texte: `Raid repoussé sur l’avant-poste (${force} assaillants).`,
        regionId: base.regionId,
        important: true,
      });
    } else {
      let vole = 0;
      for (const k of COMMODITY_KEYS) {
        const pris = Math.round((base.stock[k] || 0) * rng.range(0.15, 0.4));
        base.stock[k] -= pris;
        vole += pris;
      }
      base.defense = 0;
      if (niveau(base, 'mur') > 0 && rng.chance(0.4)) {
        base.batiments.mur = Math.max(0, base.batiments.mur - 1);
      }
      log({
        type: 'raid',
        texte: `L’avant-poste est pillé : ${vole} unités emportées.`,
        regionId: base.regionId,
        important: true,
      });
    }
  }

  return { energie: e };
}

/** Ce que valent, l'arme à la main, les gens présents à l'avant-poste. */
export function forceEscouade(state) {
  const base = state.base;
  let f = 0;
  const presents = base.fonde
    ? groupes(state).filter((g) => g.regionId === base.regionId).flatMap((g) => g.membres)
    : [];
  for (const c of presents) {
    if (!estDebout(c)) continue;
    f += comp(c, 'melee') * 0.4 + comp(c, 'tir') * 0.4 + comp(c, 'endurance') * 0.2;
  }
  return Math.round(f);
}

// ---------------------------------------------------------------------------
// Transferts sac ↔ avant-poste
// ---------------------------------------------------------------------------

export function deposer(state, key, qte, groupe) {
  const g = groupe || groupeActif(state);
  const base = state.base;
  if (!base.fonde || !g || g.regionId !== base.regionId) {
    return { ok: false, motif: 'Il faut être à l’avant-poste.' };
  }
  const dispo = g.inventaire[key] || 0;
  const libre = capaciteStock(base) - totalStock(base);
  const n = Math.max(0, Math.min(Math.floor(qte), dispo, Math.floor(libre)));
  if (n <= 0) return { ok: false, motif: 'Rien à déposer, ou entrepôt plein.' };
  g.inventaire[key] -= n;
  base.stock[key] = (base.stock[key] || 0) + n;
  return { ok: true, qte: n };
}

export function retirer(state, key, qte, capaciteLibre, groupe) {
  const g = groupe || groupeActif(state);
  const base = state.base;
  if (!base.fonde || !g || g.regionId !== base.regionId) {
    return { ok: false, motif: 'Il faut être à l’avant-poste.' };
  }
  const dispo = base.stock[key] || 0;
  const n = Math.max(0, Math.min(Math.floor(qte), dispo, Math.floor(capaciteLibre)));
  if (n <= 0) return { ok: false, motif: 'Rien à prendre, ou sac plein.' };
  base.stock[key] -= n;
  g.inventaire[key] = (g.inventaire[key] || 0) + n;
  return { ok: true, qte: n };
}
