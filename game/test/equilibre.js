// Banc d'équilibrage : un bot « joueur raisonnable » joue plusieurs parties
// complètes et on regarde s'il survit, progresse, et finit par tenir debout.
// Ce n'est pas un test de régression stricte — c'est un thermomètre.
//
// Deux interrupteurs servent à isoler un système à la fois, ce qui est la seule
// façon d'attribuer un déséquilibre à sa cause plutôt qu'à une intuition :
//
//   SANS=detach,contrats,livraison,services,intel,base,service   coupe ces
//        comportements. `service` interdit de s'engager : c'est le témoin du
//        nomade pur, à comparer à `CAMP=1` pour le colon.
//   CAMP=1                           la partie démarre avec un campement fondé
//
// `CAMP=1` répond à une question que le reste ne sait pas poser : un
// avant-poste, une fois qu'on en a un, paie-t-il ? Comparer « le bot essaie de
// fonder » à « le bot n'essaie pas » ne mesure pas ça — le premier gèle ses
// matériaux en attendant de pouvoir fonder et vend deux fois moins. Il faut
// donner le camp pour savoir ce qu'il vaut.
//   VAGABOND=1                       le bot voyage autant, mais sans contrat
//
// `intel` est le témoin de la connaissance imparfaite : sans lui le bot choisit
// ses villes en lisant l'état du monde, comme s'il voyait tout. Avec lui, il ne
// se fie qu'à ses propres relevés — et une ville tombée depuis sa dernière
// visite lui coûte le voyage.
//
// Le mode vagabond est le témoin : il sépare ce que coûte la route de ce que
// coûtent les contrats. C'est lui qui a montré que la route prélevait 55 % du
// revenu et que les contrats n'y étaient pour rien.

import { nouvellePartie, tick } from '../src/sim.js';
import { Rng } from '../src/rng.js';
import {
  groupeActif, groupes, scinder, fusionner, maxGroupes, tousLesMembres,
} from '../src/groupes.js';
import { donnerOrdre } from '../src/squad.js';
import { estVivant, estDebout, comp, pvTotal } from '../src/characters.js';
import { colonieDe, colonieParId, distance } from '../src/world.js';
import {
  acheter, vendre, poidsInventaire, capacitePortage, acheterItem, prixItem, prixJoueur,
} from '../src/economy.js';
import { accepter, progres as progresContrat, MAX_CONTRATS } from '../src/contrats.js';
import {
  sEngager, peutSEngager, rangDe, avancementOrdre, droitIntendance, toucherRations,
} from '../src/allegeance.js';
import {
  fonderBase, lancerConstruction, deposer, retirer, affecter, niveau as nivBat,
  placesMetier, affectes, coutBatiment, peutPayer, capaciteStock, totalStock,
  COUT_FONDATION,
} from '../src/base.js';
import { ITEMS, BUILDING_KEYS, METIER_KEYS, METIERS, BIOMES as BIOMES_BAT } from '../src/data.js';
import { saison } from '../src/climat.js';
import { COMMODITY_KEYS, COMMODITIES, BIOMES } from '../src/data.js';
import { vueColonie, PEREMPTION } from '../src/connaissance.js';
import { demandesIci, honorer } from '../src/services.js';

const TRACE = {
  voyage: 0, repos: 0, travail: 0, defaites: 0, crPilles: 0,
  // Ce que coûte l'information périmée : des voyages vers des villes mortes.
  voyagesPerdus: 0,
  // Combien de demandes le bot croise, et combien il en honore.
  demandesVues: 0,
  // Où va l'argent. Sans ce détail, « le bot est pauvre » ne dit rien de ce
  // qu'il faut corriger.
  gagneVente: 0, gagneContrat: 0, payeVivres: 0, payeSoins: 0, payeMateriel: 0,
  // Ce que l'intendance donne : la voie du service se lit là.
  rationsTouchees: 0,
};
const HEURES = Number(process.argv[2]) || 4000;
// Trente parties par défaut, pas huit. À huit, l'écart-type sur un taux de
// survie de 85 % vaut douze points : on lit du bruit et on croit lire un
// réglage. Trente parties coûtent dix secondes.
const PARTIES = Number(process.argv[3]) || 30;
// Interrupteurs d'isolement : c'est en coupant un système à la fois qu'on
// trouve lequel déséquilibre le reste. `SANS=detach,contrats,livraison`
const SANS = new Set((process.env.SANS || '').split(',').filter(Boolean));
// Mode témoin : le bot bouge autant qu'un joueur de contrats, mais sans en
// prendre aucun. Il isole le coût du voyage lui-même du prix des contrats.
const VAGABOND = process.env.VAGABOND === '1';

/** Où trouver de quoi manger : on note les régions par rendement en nourriture. */
function scoreNourriture(state, i) {
  const r = state.world.regions[i];
  const y = BIOMES[r.biome].yields;
  return (y.biomasse || 0.18) * r.richesse * (1 - r.fouille);
}

/**
 * Où aller vendre et se ravitailler. Le bot ne lit plus l'état du monde : il lit
 * ses propres relevés, avec leur date. Une ville qu'il n'a jamais vue n'est pas
 * une option — on ne marche pas six régions sur la foi d'un point sur la carte —
 * et une ville dont le relevé date peut très bien être tombée depuis.
 *
 * C'est ce qui donne enfin une valeur mesurable à l'éclaireur : ses relevés
 * élargissent le choix et le rafraîchissent.
 */
function colonieLaPlusProche(state, g) {
  if (SANS.has('intel')) {
    let best = null;
    let bestD = Infinity;
    for (const c of state.world.colonies) {
      if (c.ruine) continue; // témoin omniscient : une ville morte ne vend rien
      const d = distance(g.regionId, c.regionId);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  let best = null;
  let bestSc = -Infinity;
  for (const c of state.world.colonies) {
    const vue = vueColonie(state, c);
    if (vue.inconnu || vue.ruine) continue; // d'après ce qu'on en sait
    const d = distance(g.regionId, c.regionId);
    // Un relevé vieux vaut moins qu'un relevé frais : le risque de marcher vers
    // une ville qui n'existe plus se paie en jours perdus.
    const age = vue.frais ? 0 : Math.min(1, (vue.depuis || 0) / PEREMPTION);
    // On vend mieux là où manque ce qu'on porte.
    let attrait = 0;
    for (const k of COMMODITY_KEYS) {
      const q = g.inventaire[k] || 0;
      if (!q || k === 'rations' || k === 'medkit') continue;
      const stock = vue.stock ? (vue.stock[k] || 0) : 0;
      attrait += q * COMMODITIES[k].prix * (stock < (vue.pop || 50) * 0.4 ? 1 : 0.7);
    }
    // Quand on sert quelqu'un, on fait ses courses chez lui : c'est là qu'on
    // touche l'intendance, qu'on a la remise, et — à partir de Lieutenant —
    // qu'on est logé. Sans ce penchant, le bot passait sa vie sur les marchés
    // des autres et ne touchait que dix rations en quatre mille heures.
    const sien = state.player.allegeance && c.faction === state.player.allegeance.faction;
    const sc = attrait / (1 + d * 1.4) - d * 14 - age * 90 + (sien ? 140 : 0);
    if (sc > bestSc) { bestSc = sc; best = c; }
  }
  // Rien de connu debout : on retombe sur la plus proche, quitte à se tromper.
  if (!best) {
    let bestD = Infinity;
    for (const c of state.world.colonies) {
      const d = distance(g.regionId, c.regionId);
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return best;
}

/** Ce que le groupe doit aller chercher pour honorer ce qu'il a signé. */
function destinationContrat(state, g) {
  for (const c of state.player.contrats) {
    const av = progresContrat(state, c);
    if (c.type === 'collecte') {
      // Prêt : on rapporte. Pas prêt : on reste où on récolte.
      if (!av.pret) continue;
      const donneur = colonieParId(state.world, c.colonieId);
      if (donneur && !donneur.ruine && donneur.regionId !== g.regionId) return donneur.regionId;
    } else if (c.type === 'livraison') {
      const dest = colonieParId(state.world, c.destId);
      if (!dest || dest.ruine) continue;
      // On ne part livrer que si c'est bien nous qui portons le colis.
      if ((g.inventaire[c.ressource] || 0) < c.quantite) continue;
      if (dest.regionId !== g.regionId) return dest.regionId;
    } else if (c.type === 'reconnaissance') {
      if (!state.world.regions[c.regionId].decouvert) return c.regionId;
    }
  }
  return null;
}

/** Un contrat qui presse : on ne s'entraîne pas quand une échéance court. */
function collecteUrgente(state) {
  return state.player.contrats.some(
    (c) => c.echeance - state.temps < 120 && !progresContrat(state, c).pret
  );
}

/**
 * Ce que vaut une arme, une armure. Grossier à dessein : le bot n'a pas besoin
 * d'optimiser, il a besoin de ne pas se battre en chemise avec la machette du
 * premier jour — ce qu'il a fait pendant toute l'histoire de ce banc.
 */
function valeurItem(key) {
  const it = ITEMS[key];
  if (!it) return 0;
  if (it.type === 'arme') return it.degats * (1 + (it.pen || 0));
  if (it.type === 'armure') return it.armure * 3;
  return 0;
}

/** Ce que porte déjà quelqu'un à cet emplacement. */
function equipe(c, slot) {
  return valeurItem(c.equip && c.equip[slot]);
}

/**
 * S'équiper, et s'équiper vraiment.
 *
 * `acheterItem` était importé dans ce fichier depuis le début et n'a jamais été
 * appelé une seule fois : le bot traversait quatre mille heures avec l'armure de
 * cuir du départ, perdait la moitié de ses combats et finissait à cinq de
 * compétence. Toutes les conclusions d'équilibrage sur les raids, les pertes et
 * la survie reposaient donc sur une escouade de civils désarmés.
 */
function sEquiper(state, g, colIci) {
  const p = state.player;
  if (!colIci.etal || !colIci.etal.items.length) return;
  const vivants = g.membres.filter(estVivant);
  if (!vivants.length) return;

  // On équipe d'abord ce qu'on a déjà dans la réserve : c'est gratuit.
  for (let i = g.objets.length - 1; i >= 0; i--) {
    const key = g.objets[i];
    const it = ITEMS[key];
    if (!it || (it.type !== 'arme' && it.type !== 'armure')) continue;
    const slot = it.type === 'arme' ? 'arme' : 'armure';
    // Au plus mal doté, et seulement si ça l'améliore.
    const cible = vivants.reduce((a, b) => (equipe(b, slot) < equipe(a, slot) ? b : a));
    if (valeurItem(key) <= equipe(cible, slot)) continue;
    if (it.reqForce && comp(cible, 'force') < it.reqForce) continue;
    g.objets.splice(i, 1);
    if (cible.equip[slot]) g.objets.push(cible.equip[slot]);
    cible.equip[slot] = key;
  }

  // Puis on achète, si l'étal a mieux que le pire de nos gens et qu'on peut se
  // le payer sans se mettre à jeun.
  const negoc = vivants.reduce((a, b) => (comp(b, 'commerce') > comp(a, 'commerce') ? b : a));
  const hab = comp(negoc, 'commerce');
  const repu = p.reputation[colIci.faction] || 0;
  for (let tour = 0; tour < 2; tour++) {
    let meilleur = -1;
    let gain = 0;
    let prixRetenu = 0;
    colIci.etal.items.forEach((ligne, i) => {
      const it = ITEMS[ligne.key];
      if (!it || (it.type !== 'arme' && it.type !== 'armure')) return;
      const slot = it.type === 'arme' ? 'arme' : 'armure';
      const cible = vivants.reduce((a, b) => (equipe(b, slot) < equipe(a, slot) ? b : a));
      if (it.reqForce && comp(cible, 'force') < it.reqForce) return;
      const d = valeurItem(ligne.key) - equipe(cible, slot);
      if (d <= 0) return;
      const prix = prixItem(colIci, ligne.key, ligne.coef, hab, repu).achat;
      // On garde de quoi manger : un mort bien armé reste un mort.
      if (prix > p.credits - 250) return;
      if (d > gain) { gain = d; meilleur = i; prixRetenu = prix; }
    });
    if (meilleur < 0 || prixRetenu <= 0) break;
    if (!acheterItem(state, colIci, meilleur, g).ok) break;
    TRACE.payeMateriel += prixRetenu;
  }
}

/**
 * Ce qu'on bâtit, et dans quel ordre.
 *
 * L'ordre n'est pas décoratif : le générateur d'abord, parce que sans énergie
 * aucune chaîne ne tourne ; l'entrepôt ensuite, parce qu'un avant-poste plein
 * ne reçoit plus rien ; le baraquement, parce que sans habitants aucun métier
 * n'a de bras. Le reste suit l'utilité décroissante.
 */
const PLAN_BATI = [
  // La halle avant tout le reste, ou presque : c'est elle qui remplit les bacs
  // de l'hydroponie. Sans elle, le camp attend qu'on lui apporte à manger, ce
  // qui est exactement ce dont on voulait le sortir.
  'entrepot', 'halle', 'hydroponie', 'baraquement', 'cantine', 'mur',
  'generateur', 'halle', 'hydroponie', 'baraquement', 'entrepot', 'poste',
  'fonderie', 'infirmerie', 'atelier', 'generateur', 'antenne', 'raffinerie',
];

/** Où l'on veut des bras en priorité, quand des places s'ouvrent. */
const PLAN_POSTES = [
  'cultivateur', 'cuisinier', 'recoltant', 'magasinier', 'batisseur',
  'milicien', 'garde', 'fondeur', 'infirmier', 'mecanicien', 'machiniste',
  'operateur', 'raffineur',
];

/** Une case où l'on peut vivre : vide, pas trop dangereuse, et qui rend. */
function siteAvantPoste(state, g) {
  let best = null;
  let bestSc = -Infinity;
  for (const r of state.world.regions) {
    if (r.colonie || !r.decouvert) continue;
    const d = distance(r.i, g.regionId);
    if (d > 6) continue;
    const y = BIOMES_BAT[r.biome].yields || {};
    const rend = (y.biomasse || 0) * 1.4 + (y.ferraille || 0) + (y.minerai || 0) * 0.8;
    // On veut une ville à portée : c'est là qu'on vend et qu'on achète le
    // carburant sans lequel rien ne tourne.
    let versVille = Infinity;
    for (const c of state.world.colonies) {
      if (c.ruine) continue;
      versVille = Math.min(versVille, distance(r.i, c.regionId));
    }
    if (versVille > 5) continue;
    const sc = rend * 10 * r.richesse - r.danger * 40 - d * 4 - versVille * 3;
    if (sc > bestSc) { bestSc = sc; best = r; }
  }
  return best;
}

/**
 * Fonder, bâtir, staffer, ravitailler. Jusqu'ici le banc ne fondait jamais
 * d'avant-poste : treize bâtiments et treize métiers n'avaient donc jamais été
 * éprouvés en partie, seulement à l'unité. `SANS=base` rétablit l'ancien
 * comportement pour mesurer ce que l'avant-poste apporte — ou coûte.
 */
function tenirAvantPoste(state, g, memo) {
  const base = state.base;

  // --- Fonder, une fois qu'on a de quoi et un endroit où.
  if (!base.fonde) {
    if (state.temps < 300) return;             // on apprend le terrain d'abord
    if (!peutPayer(g.inventaire, COUT_FONDATION)) {
      memo.viseFondation = true;
      return;
    }
    if (process.env.TRACE_BASE) {
      console.log('  t', state.temps, 'inv',
        Object.keys(COUT_FONDATION).map((k) => k + ':' + Math.floor(g.inventaire[k] || 0)).join(' '),
        'cr', Math.round(state.player.credits), 'ordre', g.ordre.type);
    }
    const ici = state.world.regions[g.regionId];
    if (!ici.colonie) {
      const r = fonderBase(state, () => {}, g);
      if (r.ok) { memo.viseFondation = false; memo.fonde = state.temps; }
      return;
    }
    // On tient la marchandise : le voyage vers le site passe devant tout le
    // reste. Refuser d'écraser une route en cours revenait à ne jamais fonder —
    // le bot est presque toujours en chemin vers quelque chose.
    const site = siteAvantPoste(state, g);
    if (site && !(g.ordre.type === 'voyage' && g.ordre.dest === site.i)) {
      donnerOrdre(state, { type: 'voyage', dest: site.i }, g);
      memo.routeFondation = site.i;
    }
    return;
  }

  const surPlace = g.regionId === base.regionId;

  // --- Sur place : on vide le sac dans l'entrepôt, on lance ce qu'on peut.
  if (surPlace) {
    const libre = capaciteStock(base) - totalStock(base);
    if (libre > 20) {
      for (const k of COMMODITY_KEYS) {
        if (k === 'rations' || k === 'medkit') continue;
        const q = Math.floor(g.inventaire[k] || 0);
        if (q > 0) deposer(state, k, q, g);
      }
    }
    // Les vivres du sac se refont sur l'entrepôt : c'est tout l'intérêt d'avoir
    // une maison.
    const manqueRations = 140 - (g.inventaire.rations || 0);
    if (manqueRations > 20 && (base.stock.rations || 0) > 120) {
      retirer(state, 'rations', manqueRations, capacitePortage(state, g), g);
    }
  }

  // --- Chantiers. Un seul en file à la fois : empiler bloque les ressources.
  if (base.file.length === 0) {
    for (const k of PLAN_BATI) {
      const b = BUILDING_KEYS.includes(k) ? k : null;
      if (!b) continue;
      const r = lancerConstruction(state, b);
      if (r.ok) break;
    }
  }

  // --- Postes. On garnit dans l'ordre d'utilité, sans laisser un métier
  // absorber tout le monde.
  for (const k of PLAN_POSTES) {
    const places = placesMetier(base, k);
    if (places <= 0) continue;
    const tenu = affectes(base, k);
    if (tenu >= places) continue;
    if (affecter(state, k, tenu + 1).ok) break;
  }
}

/**
 * Rendre service, et se donner les moyens de le faire.
 *
 * Le piège de ce système, c'est qu'une ville demande précisément ce qui lui
 * manque : on ne peut donc jamais acheter sur place de quoi l'honorer. Il faut
 * porter la marchandise depuis ailleurs. Le bot tient donc une promesse à la
 * fois — celle qu'il a choisie —, refuse de vendre ce qu'il a promis, complète
 * son lot dans les villes qui en ont, et repasse la livrer.
 *
 * Sans ça il ne rendait qu'un service pour cent demandes croisées, et tout le
 * système restait une décoration.
 */
function servir(state, g, colIci, memo) {
  const p = state.player;
  // Ce qu'on a déjà sous la main, on le remet tout de suite.
  for (const d of demandesIci(state, colIci)) {
    TRACE.demandesVues++;
    if (!d.pret) continue;
    if (honorer(state, colIci.id, d.notable.id, () => {}).ok) {
      memo.services++;
      if (memo.promesse && memo.promesse.notableId === d.notable.id) memo.promesse = null;
    }
  }

  // Compléter la promesse en cours, si cette ville-ci vend ce qu'il faut.
  if (memo.promesse) {
    const pr = memo.promesse;
    const col = colonieParId(state.world, pr.colId);
    const pers = col && (col.notables || []).find((x) => x.id === pr.notableId);
    // La demande a expiré, la personne est partie, ou la ville est tombée :
    // on ne poursuit pas un fantôme.
    if (!col || col.ruine || !pers || !pers.demande || pers.demande.res !== pr.res) {
      memo.promesse = null;
    } else {
      const manque = pr.quantite - Math.floor(g.inventaire[pr.res] || 0);
      if (manque > 0 && (colIci.stock[pr.res] || 0) >= manque) {
        const negoc = g.membres.filter(estVivant)
          .reduce((a, b) => (!a || comp(b, 'commerce') > comp(a, 'commerce') ? b : a), null);
        const unit = prixJoueur(colIci, pr.res, negoc ? comp(negoc, 'commerce') : 0,
          p.reputation[colIci.faction] || 0).achat;
        const cout = unit * manque;
        // On accepte de perdre un peu : l'estime vaut plus que la prime, pas au
        // point de se ruiner pour un inconnu.
        if (cout <= pr.prime * 1.6 && p.credits > cout * 1.5) {
          acheter(state, colIci, pr.res, manque, g);
        }
      }
    }
  }

  // Rien en cours : on adopte une demande d'ici, si elle est à notre portée.
  if (memo.promesse) return;
  const candidates = demandesIci(state, colIci)
    .filter((d) => COMMODITIES[d.demande.res].poids * d.demande.quantite < capacitePortage(state, g) * 0.5)
    .sort((a, b) => a.demande.quantite * COMMODITIES[a.demande.res].prix
      - b.demande.quantite * COMMODITIES[b.demande.res].prix);
  if (!candidates.length) return;
  const d = candidates[0];
  memo.promesse = {
    colId: colIci.id, notableId: d.notable.id, res: d.demande.res,
    quantite: d.demande.quantite, prime: d.demande.prime,
  };
}

/**
 * Le groupe principal : celui qui commerce, s'équipe et prend le travail.
 * C'est lui qui porte la partie.
 */
function jouerPrincipal(state, g, memo) {
  const p = state.player;
  const cap = capacitePortage(state, g);
  const charge = poidsInventaire(g.inventaire) / Math.max(1, cap);
  const rations = g.inventaire.rations || 0;
  const colIci = colonieDe(state.world, g.regionId);

  // En ville : on vend le surplus, on refait les vivres, on s'équipe, on prend
  // du travail. C'est ce que ferait un joueur qui regarde ses écrans.
  if (colIci) {
    // --- Rendre service aux gens d'ici, avant tout le reste : ce qu'on porte et
    // qu'ils attendent vaut plus entre leurs mains que sur l'étal. Un joueur qui
    // a compris le jeu ne le fait pas pour la prime — elle rembourse à peine —
    // mais pour ce que l'estime ouvre : marge de l'armurier, soins du médecin,
    // panneau du chef, registres du contremaître.
    if (!SANS.has('services')) servir(state, g, colIci, memo);

    // Ne jamais vendre ce qu'un contrat en cours réclame : c'est exactement
    // l'erreur que ferait un joueur distrait, et elle doit se voir au banc.
    const reserves = new Set(p.contrats.filter((c) => c.ressource).map((c) => c.ressource));
    // Ni ce qu'on a promis à quelqu'un.
    if (memo.promesse) reserves.add(memo.promesse.res);
    // Ni de quoi fonder l'avant-poste : le bot vendait tout à chaque passage en
    // ville et n'accumulait donc jamais les cent vingt ferrailles qu'il faut.
    if (!SANS.has('base') && !state.base.fonde && state.temps > 300) {
      for (const k of Object.keys(COUT_FONDATION)) reserves.add(k);
    }
    // Ni les matériaux que les chantiers de la maison réclament.
    if (!SANS.has('base') && state.base.fonde) {
      for (const k of ['ferraille', 'polymere', 'composant']) reserves.add(k);
    }
    const ordreEnCours = p.allegeance && p.allegeance.ordre;
    if (ordreEnCours && ordreEnCours.ressource) reserves.add(ordreEnCours.ressource);
    for (const k of COMMODITY_KEYS) {
      if (k === 'rations' || k === 'medkit' || reserves.has(k)) continue;
      const q = g.inventaire[k] || 0;
      if (q > 0) {
        const av = p.credits;
        vendre(state, colIci, k, q, g);
        TRACE.gagneVente += p.credits - av;
      }
    }
    // On voit venir la saison : on ne part pas en hiver avec trois boîtes.
    const cible = saison(state.temps).key === 'pluies' || saison(state.temps).key === 'accalmie' ? 190 : 120;
    if (rations < cible && p.credits > 200) {
      const av = p.credits;
      acheter(state, colIci, 'rations', cible - rations, g);
      TRACE.payeVivres += av - p.credits;
    }
    if ((g.inventaire.medkit || 0) < 3 && p.credits > 400) {
      const av = p.credits;
      acheter(state, colIci, 'medkit', 2, g);
      TRACE.payeSoins += av - p.credits;
    }

    // Compléter une collecte au marché plutôt que d'attendre que le biome la
    // donne. Un joueur qui a compris le jeu compare d'abord : payer 900 cr de
    // minerai pour un contrat à 800, c'est travailler à perte avec le
    // sentiment d'avancer.
    for (const c of p.contrats) {
      if (c.type !== 'collecte') continue;
      const manque = c.quantite - Math.floor(g.inventaire[c.ressource] || 0);
      if (manque <= 0) continue;
      if ((colIci.stock[c.ressource] || 0) < manque) continue;
      const negoc = g.membres.filter(estVivant)
        .reduce((a, b) => (!a || comp(b, 'commerce') > comp(a, 'commerce') ? b : a), null);
      const unitaire = prixJoueur(colIci, c.ressource, negoc ? comp(negoc, 'commerce') : 0,
        p.reputation[colIci.faction] || 0).achat;
      const cout = unitaire * manque;
      if (cout > c.recompense * 0.55 || p.credits < cout * 1.4) continue;
      acheter(state, colIci, c.ressource, manque, g);
    }

    // S'armer. Avant les contrats, avant l'avant-poste : une escouade qui perd
    // ses combats ne fait rien d'autre de la partie.
    sEquiper(state, g, colIci);

    // De quoi fonder, puis de quoi faire tourner. Un générateur sans carburant
    // ne produit rien, et sans énergie aucune chaîne ne tourne : c'est la
    // dépendance que le banc doit éprouver.
    if (!SANS.has('base')) {
      // On achète ce qui manque pour fonder dès qu'on peut se le payer — pas à
      // partir d'un seuil rond. Le polymère et les composants ne se ramassent
      // presque jamais à la fouille : les attendre, c'est ne jamais fonder.
      if (!S_base(state).fonde && state.temps > 250) {
        const negocB = g.membres.filter(estVivant)
          .reduce((a, b) => (!a || comp(b, 'commerce') > comp(a, 'commerce') ? b : a), null);
        const hab = negocB ? comp(negocB, 'commerce') : 0;
        const rep = p.reputation[colIci.faction] || 0;
        let cout = 0;
        const achats = [];
        for (const k of Object.keys(COUT_FONDATION)) {
          const manque = COUT_FONDATION[k] - Math.floor(g.inventaire[k] || 0);
          if (manque <= 0) continue;
          if ((colIci.stock[k] || 0) < manque) { cout = Infinity; break; }
          cout += prixJoueur(colIci, k, hab, rep).achat * manque;
          achats.push([k, manque]);
        }
        // On garde de quoi manger : fonder un avant-poste et mourir de faim
        // dedans serait une drôle de stratégie.
        if (achats.length && cout + 150 <= p.credits) {
          for (const [k, q] of achats) acheter(state, colIci, k, q, g);
        }
      }
      if (S_base(state).fonde && p.credits > 500
          && (S_base(state).stock.carburant || 0) + (g.inventaire.carburant || 0) < 150) {
        acheter(state, colIci, 'carburant', 120, g);
      }
    }

    // S'engager dès qu'une faction accepte : la solde, la remise et
    // l'intendance valent largement le prix de quelques ordres à honorer.
    if (!SANS.has('service') && !p.allegeance && peutSEngager(state, colIci.faction).ok) {
      sEngager(state, colIci.faction, () => {});
    }
    // Passer à l'intendance : c'est gratuit, c'est de la nourriture, et c'est
    // toute la différence entre servir et ne pas servir.
    if (p.allegeance && droitIntendance(state, colIci).ok) {
      const av = g.inventaire.rations || 0;
      toucherRations(state, colIci, () => {}, g);
      TRACE.rationsTouchees += (g.inventaire.rations || 0) - av;
    }

    // On prend ce qu'on peut tenir. La livraison est le contrat le mieux payé
    // du panneau : la refuser par prudence, c'est jouer à moitié.
    if (colIci.contrats && !SANS.has('contrats') && p.contrats.length < MAX_CONTRATS - 1) {
      // Un joueur qui vise un engagement courtise une faction plutôt que de
      // rendre service à tout le monde : l'estime se dilue et s'émousse.
      const courtisee = memo.courtisee || (memo.courtisee = colIci.faction);
      const faisables = colIci.contrats.filter((c) => {
        if (c.type === 'livraison') {
          if (SANS.has('livraison')) return false;
          const d = colonieParId(state.world, c.destId);
          return d && !d.ruine && distance(d.regionId, g.regionId) <= 6;
        }
        return c.type === 'collecte' || c.type === 'prime' || c.type === 'reconnaissance';
      });
      // On préfère toujours ce qui fait monter chez celle qu'on courtise.
      faisables.sort((a, b) => (b.faction === courtisee ? 1 : 0) - (a.faction === courtisee ? 1 : 0)
        || (b.reputation || 0) - (a.reputation || 0));
      if (faisables.length) accepter(state, colIci, faisables[0].id, () => {}, g);
    }
  }

  // Blessés ou épuisés : on se pose — mais pas au point de mourir de faim en
  // convalescence. Se reposer sans vivres est le meilleur moyen de ne jamais
  // se relever.
  const vivants = g.membres.filter(estVivant);
  const mal = vivants.filter((c) => !estDebout(c) || pvTotal(c).pct < 0.6).length;
  if (mal > 0 && rations > 50) {
    if (g.ordre.type !== 'repos') donnerOrdre(state, { type: 'repos' }, g);
    return;
  }

  // Honorer l'ordre de mission : c'est le chemin le plus rentable du jeu.
  const o = p.allegeance && p.allegeance.ordre;
  if (o && g.ordre.type !== 'voyage' && rations > 40) {
    const av = avancementOrdre(state, o);
    if (o.type === 'ravitaillement' && av && av.fait >= o.quantite) {
      const col = colonieParId(state.world, o.colonieId);
      if (col && !col.ruine && col.regionId !== g.regionId) {
        donnerOrdre(state, { type: 'voyage', dest: col.regionId }, g);
        return;
      }
    }
    if (o.type === 'reconnaissance' && !state.world.regions[o.regionId].decouvert) {
      donnerOrdre(state, { type: 'voyage', dest: o.regionId }, g);
      return;
    }
  }

  // Une route vers le site du futur avant-poste ne se détourne pas : c'est le
  // seul voyage du jeu qui, une fois arrivé, change la partie.
  if (memo.routeFondation != null && !state.base.fonde
      && g.ordre.type === 'voyage' && g.ordre.dest === memo.routeFondation) {
    return;
  }

  // --- Rentrer chez soi. Un avant-poste qu'on ne réapprovisionne jamais reste
  // un piquet planté dans le sable : il ne bâtit rien, ne loge personne, ne
  // produit rien. Tant qu'il a faim de matériaux, il passe avant le marché.
  const base = state.base;
  if (!SANS.has('base') && base.fonde && g.regionId !== base.regionId) {
    const chargeUtile = ['ferraille', 'polymere', 'minerai', 'composant', 'alliage']
      .reduce((a, k) => a + (g.inventaire[k] || 0), 0);
    const chantierEnAttente = base.file.length > 0 || BUILDING_KEYS.some(
      (k) => nivBat(base, k) === 0 && ['generateur', 'entrepot', 'baraquement', 'hydroponie'].includes(k)
    );
    // Pas de plafond de distance : sur une carte de 24×18 le bot est presque
    // toujours à plus de six secteurs de chez lui, et un « rentrer si c'est
    // près » revenait à ne jamais rentrer. Le camp a reçu vingt-neuf ferrailles
    // en quatre mille heures, et n'a jamais rien bâti.
    if ((charge > 0.7 || chantierEnAttente) && chargeUtile > 22 && rations > 40) {
      if (!(g.ordre.type === 'voyage' && g.ordre.dest === base.regionId)) {
        donnerOrdre(state, { type: 'voyage', dest: base.regionId }, g);
      }
      return;
    }
  }

  // Sac plein, ou réserves au plus bas et de quoi payer : on rentre en ville.
  const besoinVille = charge > 0.85 || (rations < 45 && p.credits > 300);
  if (besoinVille && !colIci) {
    const col = colonieLaPlusProche(state, g);
    if (col && g.ordre.type !== 'voyage') {
      // Instrumentation : on compte les voyages entrepris vers une ville qui
      // n'existe déjà plus. C'est le prix exact d'un renseignement périmé.
      if (col.ruine) TRACE.voyagesPerdus++;
      donnerOrdre(state, { type: 'voyage', dest: col.regionId }, g);
    }
    return;
  }
  if (g.ordre.type === 'voyage') return;

  // Témoin : on erre sans raison, pour mesurer ce que coûte la route seule.
  if (VAGABOND && rations > 60 && state.temps - (memo.dernierSaut || 0) > 90) {
    const cibles = state.world.regions.filter((r) => r.decouvert && distance(r.i, g.regionId) >= 3);
    if (cibles.length) {
      memo.dernierSaut = state.temps;
      donnerOrdre(state, { type: 'voyage', dest: cibles[(state.temps * 7) % cibles.length].i }, g);
      return;
    }
  }

  // Ce qu'on a signé passe avant ce qu'on ramasse au hasard.
  if (rations > 60) {
    const dest = destinationContrat(state, g);
    if (dest != null) { donnerOrdre(state, { type: 'voyage', dest }, g); return; }
  }

  // Une promesse tenue en main se livre : on ne garde pas dans son sac ce que
  // quelqu'un attend.
  if (memo.promesse && rations > 60
      && (g.inventaire[memo.promesse.res] || 0) >= memo.promesse.quantite) {
    const col = colonieParId(state.world, memo.promesse.colId);
    if (col && !col.ruine && col.regionId !== g.regionId) {
      donnerOrdre(state, { type: 'voyage', dest: col.regionId }, g);
      return;
    }
  }

  // Un colon ne vagabonde pas : une fois le camp planté, on travaille dans son
  // rayon. Sans ça le bot dérivait à quinze secteurs de chez lui et n'y
  // remettait plus les pieds de la partie.
  if (!SANS.has('base') && state.base.fonde
      && distance(g.regionId, state.base.regionId) > 5 && rations > 60) {
    const proche = state.world.regions
      .filter((r) => r.decouvert && !r.colonie && distance(r.i, state.base.regionId) <= 3)
      .sort((a, b) => scoreNourriture(state, b.i) - scoreNourriture(state, a.i))[0];
    if (proche && g.ordre.type !== 'voyage') {
      donnerOrdre(state, { type: 'voyage', dest: proche.i }, g);
      return;
    }
  }

  // On ne laisse pas les réserves tomber au plus bas avant de réagir : à 30
  // rations il est déjà trop tard si le biome ne nourrit personne.
  if (rations < 90) {
    const ici = scoreNourriture(state, g.regionId);
    let mieux = null;
    for (const r of state.world.regions) {
      if (distance(r.i, g.regionId) > 2 || !r.decouvert) continue;
      const sc = scoreNourriture(state, r.i);
      if (sc > ici * 1.6 && (!mieux || sc > scoreNourriture(state, mieux.i))) mieux = r;
    }
    if (mieux) { donnerOrdre(state, { type: 'voyage', dest: mieux.i }, g); return; }
    if (g.ordre.type !== 'chasse') donnerOrdre(state, { type: 'chasse' }, g);
    return;
  }

  // --- S'entraîner. Le banc n'avait jamais fait donner un seul ordre
  // d'entraînement : le bot finissait à cinq de compétence de combat après
  // quatre mille heures, et toutes les mesures sur les raids et les pertes
  // portaient donc sur des gens qui n'avaient jamais tenu une arme.
  //
  // On s'entraîne quand on peut se le permettre : à l'abri, le ventre plein, et
  // tant qu'on est faible. Un vétéran retourne travailler.
  const combat = vivants.length
    ? vivants.reduce((a, c) => a + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / vivants.length
    : 0;
  // On s'entraîne au combat, et à rien d'autre : la première version montait
  // l'endurance tant que le combat était sous quatorze, donc n'atteignait jamais
  // quatorze de combat. Le bot est resté à cinq de compétence, comme avant.
  if (combat < 26 && rations > 150 && !collecteUrgente(state)
      && vivants.every((c) => pvTotal(c).pct > 0.7)) {
    if (g.ordre.type !== 'entrainement') {
      donnerOrdre(state, { type: 'entrainement', skill: 'melee' }, g);
    }
    return;
  }

  // Une collecte en cours dicte comment on récolte : extraire pour du minerai,
  // fouiller pour le reste. Récolter au hasard ne remplit jamais un contrat.
  const collecte = p.contrats.find((c) => c.type === 'collecte' && !progresContrat(state, c).pret);
  const voulu = collecte
    && ['minerai', 'ferraille', 'alliage', 'isotope'].includes(collecte.ressource) ? 'mine' : 'fouille';
  if (g.ordre.type !== voulu) donnerOrdre(state, { type: voulu }, g);
}

/**
 * L'éclaireur : une personne détachée qui lève la carte. Il rentre dès qu'il
 * manque de vivres ou qu'il est amoché — un homme seul ne gagne aucun combat.
 */
function jouerEclaireur(state, g, memo) {
  const principal = groupes(state).find((x) => x.id !== g.id && x.membres.some(estVivant));
  const rations = g.inventaire.rations || 0;
  const amoche = g.membres.some((c) => !estDebout(c) || pvTotal(c).pct < 0.65);

  if (!principal) { memo.eclaireur = null; return; }

  // Retour au bercail : on rejoint, puis on se refond dans le groupe.
  if (rations < 25 || amoche) {
    if (g.regionId === principal.regionId) {
      fusionner(state, principal, g);
      memo.eclaireur = null;
      return;
    }
    if (g.ordre.type !== 'voyage' || g.ordre.dest !== principal.regionId) {
      donnerOrdre(state, { type: 'voyage', dest: principal.regionId }, g);
    }
    return;
  }
  if (g.ordre.type === 'voyage') return;

  // Sinon : lever le noir. On vise la région inconnue la plus proche.
  let cible = null;
  let best = Infinity;
  for (const r of state.world.regions) {
    if (r.decouvert) continue;
    const d = distance(r.i, g.regionId);
    if (d < best) { best = d; cible = r; }
  }
  if (cible && best > 1) { donnerOrdre(state, { type: 'voyage', dest: cible.i }, g); return; }
  if (g.ordre.type !== 'exploration') donnerOrdre(state, { type: 'exploration' }, g);
}

/**
 * Détacher un éclaireur quand on peut se le permettre : quatre bras debout, de
 * quoi manger des deux côtés, et de la carte à lever. C'est le pari que le banc
 * doit trancher — un homme seul rapporte-t-il plus qu'il ne coûte ?
 */
function envisagerDetachement(state, memo) {
  if (SANS.has('detach')) return;
  if (memo.eclaireur) return;
  if (groupes(state).length >= maxGroupes(state)) return;
  const g = groupes(state)[0];
  if (!g) return;
  const debout = g.membres.filter(estDebout);
  if (debout.length < 3) return;
  if ((g.inventaire.rations || 0) < 140) return;
  if (g.ordre.type === 'voyage') return;
  if (!state.world.regions.some((r) => !r.decouvert)) return;

  // On envoie le plus discret : c'est lui qui survit le mieux seul.
  const choisi = debout.reduce((a, b) => (comp(b, 'furtivite') > comp(a, 'furtivite') ? b : a));
  const rng = new Rng(state.rngState);
  const r = scinder(state, g, [choisi.id], rng);
  state.rngState = rng.save();
  if (r.ok) memo.eclaireur = r.groupe.id;
}

/** Raccourci lisible : l'avant-poste du joueur. */
function S_base(state) { return state.base; }

/**
 * La posture n'avait jamais bougé de « neutre » depuis la création du banc,
 * alors que c'est le seul réglage qui décide si l'on évite ou si l'on encaisse.
 * Un joueur la change selon ce qu'il vaut ce jour-là.
 */
function choisirPosture(state) {
  const gens = tousLesMembres(state).filter(estVivant);
  if (!gens.length) return;
  const debout = gens.filter(estDebout);
  const combat = gens.reduce((a, c) => a + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / gens.length;
  const entier = debout.length === gens.length
    && gens.every((c) => pvTotal(c).pct > 0.75);
  let veut = 'neutre';
  if (!entier || combat < 16) veut = 'prudent';
  else if (combat > 34 && debout.length >= 3) veut = 'agressif';
  if (state.player.posture !== veut) state.player.posture = veut;
}

function jouer(state, memo) {
  choisirPosture(state);
  const principal = groupes(state).find((x) => x.id !== memo.eclaireur && x.membres.some(estVivant));
  if (!SANS.has('base') && principal) tenirAvantPoste(state, principal, memo);
  for (const g of groupes(state).slice()) {
    if (!g.membres.some(estVivant)) continue;
    if (g.id === memo.eclaireur) jouerEclaireur(state, g, memo);
    else jouerPrincipal(state, g, memo);
  }
  envisagerDetachement(state, memo);
}

const NECRO = { causes: {}, skills: [], kills: [], vivants: [] };

console.log(`Banc d'équilibrage — ${PARTIES} parties × ${HEURES} h\n${'='.repeat(52)}`);

let survivants = 0;
const lignes = [];
for (let n = 0; n < PARTIES; n++) {
  const state = nouvellePartie(1000 + n * 7919, { maintenant: 0 });
  state.player.posture = 'neutre';
  if (process.env.CAMP === '1') {
    // On plante le camp sur la première case vide à portée, avec de quoi le
    // payer. Ce n'est pas une partie normale : c'est l'expérience qui isole la
    // valeur de l'avant-poste de la difficulté à s'en offrir un.
    const g0 = groupes(state)[0];
    const vide = state.world.regions.find(
      (r) => !r.colonie && distance(r.i, g0.regionId) <= 2
    ) || state.world.regions.find((r) => !r.colonie);
    const dep = g0.regionId;
    g0.regionId = vide.i;
    for (const k of Object.keys(COUT_FONDATION)) {
      g0.inventaire[k] = (g0.inventaire[k] || 0) + COUT_FONDATION[k];
    }
    fonderBase(state, () => {}, g0);
    g0.regionId = dep;
  }
  // Mémoire du bot : hors de l'état de jeu, donc rien à sérialiser.
  const memo = { eclaireur: null, detachements: 0, courtisee: null, services: 0,
    promesse: null, viseFondation: false, fonde: null, routeFondation: null };
  let groupesMax = 1;
  for (let i = 0; i < HEURES; i++) {
    if (state.fin) break;
    if (i % 4 === 0) {
      const avant = groupes(state).length;
      jouer(state, memo);
      if (groupes(state).length > avant) memo.detachements++;
      groupesMax = Math.max(groupesMax, groupes(state).length);
    }
    // Instrumentation : à quoi passe-t-on ses heures, et où part l'argent ?
    const gPrinc = groupes(state)[0];
    if (gPrinc) {
      const t = gPrinc.ordre.type;
      TRACE[t === 'voyage' ? 'voyage' : t === 'repos' ? 'repos' : 'travail']++;
    }
    const crAvant = state.player.credits;
    const defAvant = state.stats.defaites;
    tick(state);
    if (state.stats.defaites > defAvant) {
      TRACE.defaites += state.stats.defaites - defAvant;
      TRACE.crPilles += Math.max(0, crAvant - state.player.credits);
    }
  }
  if (process.env.NECRO) {
    for (const m of state.memorial || []) {
      const c = String(m.cause).replace(/face à .*/, 'face à une bande');
      NECRO.causes[c] = (NECRO.causes[c] || 0) + 1;
      NECRO.skills.push(Number(String(m.meilleure).split(' ').pop()) || 0);
      NECRO.kills.push(m.kills || 0);
    }
    for (const c of tousLesMembres(state).filter(estVivant)) {
      NECRO.vivants.push(Math.max(comp(c, 'melee'), comp(c, 'tir')));
    }
  }
  const viv = tousLesMembres(state).filter(estVivant);
  if (!state.fin) survivants++;
  const skills = viv.length
    ? Math.round(viv.reduce((s, c) => s + Math.max(comp(c, 'melee'), comp(c, 'tir')), 0) / viv.length)
    : 0;
  lignes.push({
    seed: 1000 + n * 7919,
    t: state.temps,
    fin: state.fin || '—',
    viv: `${viv.length}/${tousLesMembres(state).length}`,
    detach: memo.detachements,
    cr: state.player.credits,
    wl: `${state.stats.combatsGagnes}/${state.stats.defaites}`,
    recolte: state.stats.recolte,
    comp: skills,
    contrats: state.stats.contratsRemplis || 0,
    grade: state.player.allegeance ? rangDe(state.player.allegeance).def.nom.slice(0, 9) : '—',
    ordres: state.stats.ordresRemplis || 0,
    guerres: state.world.guerres.length,
    captures: state.world.colonies.reduce((t, c) => t + (c.prises || 0), 0),
    services: memo.services,
    bati: state.base.fonde
      ? BUILDING_KEYS.reduce((t, k) => t + nivBat(state.base, k), 0) : 0,
    hab: state.base.fonde ? Math.round(state.base.pop || 0) : 0,
    // Ce que l'estime a effectivement ouvert, à la fin de la partie.
    amis: state.world.colonies.reduce(
      (t, c) => t + (c.notables || []).filter((x) => (x.opinion || 0) >= 35).length, 0),
  });
}

const largeur = { seed: 8, t: 6, fin: 11, viv: 5, cr: 7, wl: 7, comp: 5, contrats: 9, detach: 7, grade: 10, ordres: 7, guerres: 8, captures: 9, services: 9, amis: 5, bati: 5, hab: 4 };
const entetes = Object.keys(largeur);
console.log(entetes.map((k) => k.padStart(largeur[k])).join(' '));
for (const l of lignes) {
  console.log(entetes.map((k) => String(l[k]).padStart(largeur[k])).join(' '));
}

console.log('='.repeat(52));
console.log(`Escouades encore vivantes après ${HEURES} h : ${survivants}/${PARTIES}`);
const moy = (k) => Math.round(lignes.reduce((s, l) => s + (typeof l[k] === 'number' ? l[k] : 0), 0) / lignes.length);
console.log(`Crédits moyens : ${moy('cr')} — compétence de combat moyenne : ${moy('comp')}`);
console.log(`Récolte moyenne : ${moy('recolte')} unités — contrats remplis : ${moy('contrats')}`);
const gradés = lignes.filter((l) => l.grade !== '—').length;
console.log(`Détachements : ${moy('detach')} par partie — parties avec allégeance : ${gradés}/${PARTIES}`);
console.log(`Colonies prises et reprises dans le monde : ${moy('captures')} en moyenne`);
const fondes = lignes.filter((l) => l.bati > 0).length;
console.log(`Avant-postes fondés : ${fondes}/${PARTIES} — `
  + `${moy('bati')} niveaux de bâtiment et ${moy('hab')} habitants en moyenne`);
console.log(`Services rendus : ${moy('services')} par partie — `
  + `gens acquis (estime ≥ 35) : ${moy('amis')} en fin de partie`);
console.log(`Demandes croisées : ${TRACE.demandesVues} — honorées : `
  + `${lignes.reduce((t, l) => t + l.services, 0)}`);
console.log(`Voyages entrepris vers une ville déjà morte : ${TRACE.voyagesPerdus}`);
const totH = TRACE.voyage + TRACE.repos + TRACE.travail;
console.log(`Temps : ${Math.round(100 * TRACE.voyage / totH)} % en marche · `
  + `${Math.round(100 * TRACE.repos / totH)} % au repos · ${Math.round(100 * TRACE.travail / totH)} % au travail`);
console.log(`Intendance : ${Math.round(TRACE.rationsTouchees / PARTIES)} rations touchées par partie`);
console.log(`Argent : +${Math.round(TRACE.gagneVente / PARTIES)} de ventes · `
  + `−${Math.round(TRACE.payeVivres / PARTIES)} de vivres · −${Math.round(TRACE.payeSoins / PARTIES)} de soins `
  + `· −${Math.round(TRACE.payeMateriel / PARTIES)} d'équipement `
  + `· −${Math.round(TRACE.crPilles / PARTIES)} pillés, par partie`);
console.log(`Défaites : ${TRACE.defaites} pour ${TRACE.crPilles} cr pillés `
  + `(${TRACE.defaites ? Math.round(TRACE.crPilles / TRACE.defaites) : 0} cr par défaite)`);

if (process.env.NECRO) {
  const moy = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '—');
  console.log('--- nécrologie ---');
  console.log(Object.entries(NECRO.causes).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${k}`).join(' · '));
  console.log(`Meilleure compétence au moment de mourir : ${moy(NECRO.skills)}`
    + ` (max ${NECRO.skills.length ? Math.max(...NECRO.skills) : 0})`);
  console.log(`Ennemis abattus avant de tomber : ${moy(NECRO.kills)}`);
  console.log(`Compétence de combat des survivants : ${moy(NECRO.vivants)}`
    + ` (max ${NECRO.vivants.length ? Math.max(...NECRO.vivants).toFixed(0) : 0})`);
}

if (survivants === 0) {
  console.log('\nALERTE : aucune escouade ne survit. Le jeu est injouable en l’état.');
  process.exit(1);
}
