// Caravanes marchandes. Les villes ne vivent pas en vase clos : ce qu'une
// colonie a en trop part chez celle qui en manque, sur des routes qui traversent
// des régions dangereuses. C'est ce qui relie l'économie à la carte — et ce qui
// donne au joueur autre chose à faire que ramasser des cailloux.

import { COMMODITIES, COMMODITY_KEYS, FACTIONS } from './data.js';
import { chemin, colonieParId, colonieDe, nomRegion, distance, damer } from './world.js';
import {
  reseauDe, reseaux, idReseau, villesDuReseau, peutTraiter, chiffrerOrdre,
} from './bourse.js';

/** Sept, plus ce que les bourses financent. */
export function plafondCaravanes(world) {
  return MAX_CARAVANES + reseaux(world).length * CARAVANES_PAR_RESEAU;
}
import { groupeActif } from './groupes.js';
import {
  cibleStock, prixUnitaire, capacitePortage, poidsInventaire, encaisser, debourser,
} from './economy.js';
import { idDepuisRng, estDebout, comp } from './characters.js';
import { retenirEnVille } from './services.js';
import { avantage } from './allegeance.js';
import {
  transferer, convertirMasse, ecartChange, taux,
} from './monnaie.js';

/**
 * Le plafond du commerce d'opportunité — celui que le hasard tire, par
 * opposition aux convois qu'un réseau décide.
 *
 * Il ne borne rien, et c'est mesuré : porté de sept à vingt, la circulation ne
 * bouge pas d'un dixième de convoi. Ce qui borne, c'est qu'un départ demande une
 * ville en surplus, une ville en manque à portée, et un écart de prix qui paie
 * le trajet — trois conditions qui se rencontrent rarement ensemble.
 *
 * On le garde comme garde-fou d'affichage, pas comme réglage : si un jour
 * l'économie s'emballe, la carte ne deviendra pas illisible. Mais il ne faut pas
 * espérer changer quoi que ce soit en le touchant.
 */
export const MAX_CARAVANES = 7;

/**
 * Ce qu'une bourse ajoute de convois en propre — et ce que ça fait vraiment.
 *
 * Première version : un réseau ne faisait que *choisir* mieux ses trajets. Sans
 * effet, pour une raison arithmétique — c'est le nombre de convois qui borne
 * tout, pas leur destination. On lui en a donc payé.
 *
 * Puis on a cru que ça nourrissait les villes. **Ça ne les nourrit pas.**
 * Mesuré contre un témoin à bourses coupées, huit graines, quatre mille heures :
 *
 *                     villes debout   % nourries   villes nourries
 *   bourses coupées         62            45 %           28
 *   4 convois/réseau        68            41 %           28
 *   12 convois/réseau       75            38 %           28
 *   30 convois/réseau       74            38 %           28
 *
 * Le taux baisse et pourtant rien ne s'aggrave : le dénominateur change. La
 * bourse maintient debout des villes qui s'effondraient, et ces rescapées vivent
 * au bord de la faim — elles gonflent le total sans gonfler le compte des
 * repues, qui ne bouge pas d'une unité. **Un taux dont le dénominateur bouge ne
 * dit rien tant qu'on n'a pas regardé le numérateur.**
 *
 * Ce qu'une bourse fait, donc : elle empêche l'effondrement, pas la faim. Six
 * villes de plus debout, et c'est déjà beaucoup pour deux mille cinq cents
 * crédits.
 *
 * Quatre, et pas douze : au-delà, on achète des villes marginales de plus en
 * plus cher — sept villes pour trente-sept microsecondes de tick, sans une
 * bouche nourrie en plus.
 */
export const CARAVANES_PAR_RESEAU = 4;

/**
 * Les dossiers qu'un réseau instruit par tour, refus compris. Voir le
 * commentaire dans `departsDuReseau` pour ce qui l'a rendu nécessaire.
 *
 * Trois fois le budget de convois, et la valeur est mesurée. Trois graines,
 * six mille heures :
 *
 *     essais    convois    villes debout    population
 *        4        4 663         269           53 906
 *       12        7 972         235           48 474
 *       40       15 330         258           53 176
 *
 * La circulation triple ; le monde, lui, ne bouge pas — les villes debout
 * rebondissent sans ordre entre 235 et 269, ce qui est le bruit de trois
 * graines. Les convois supplémentaires ne nourrissent personne : ce qui borne
 * le commerce, ce n'est pas le nombre de dossiers examinés, c'est le nombre de
 * villes en surplus capables de répondre.
 *
 * Et ça se paie : sans plafond du tout, le tick passe de 126 à 154 µs. On
 * achète donc vingt-huit microsecondes contre des convois qui ne servent à
 * rien.
 *
 * Une première version de ce commentaire affirmait que la circulation ne
 * bougeait pas. C'était écrit avant d'avoir mesuré, et c'était faux.
 */
export const ESSAIS_PAR_RESEAU = CARAVANES_PAR_RESEAU * 3;
const HEURES_PAR_CASE = 2;

// ---------------------------------------------------------------------------
// Départ
// ---------------------------------------------------------------------------

/** Ce dont une colonie regorge, au-delà de son confort. */
function surplus(col) {
  const out = [];
  for (const k of COMMODITY_KEYS) {
    const cible = cibleStock(col, k);
    const stock = col.stock[k] || 0;
    if (stock > cible * 1.6 && stock > 25) out.push([k, stock - cible * 1.2]);
  }
  return out;
}

/**
 * A-t-elle quelque chose en trop, oui ou non ? Sans construire la liste.
 *
 * `surplus` alloue un tableau, et un couple par marchandise. Le tri des
 * vendeurs l'appelait pour chacune des cinq cents villes du monde, pour n'en
 * regarder que la longueur : cinq cents tableaux jetés à chaque passe.
 */
function aDuSurplus(col) {
  for (const k of COMMODITY_KEYS) {
    const cible = cibleStock(col, k);
    const stock = col.stock[k] || 0;
    if (stock > cible * 1.6 && stock > 25) return true;
  }
  return false;
}

/** Ce qui lui manque cruellement. */
function besoin(col, k) {
  const cible = cibleStock(col, k);
  const stock = col.stock[k] || 0;
  return Math.max(0, cible * 0.8 - stock);
}

function vivante(col) {
  return col && !col.ruine && col.faction;
}

/**
 * Cherche un couple vendeur / acheteur qui a vraiment intérêt à commercer.
 * On ne fabrique pas de trafic pour décorer la carte : s'il n'y a ni surplus
 * ni pénurie, aucune caravane ne part.
 */
export function tenterDepart(state, rng, log) {
  const world = state.world;
  if (world.caravanes.length >= plafondCaravanes(world)) return null;

  const vendeurs = world.colonies.filter((c) => vivante(c) && aDuSurplus(c));
  if (!vendeurs.length) return null;
  const de = rng.pick(vendeurs);
  const dispo = surplus(de);

  // Le réseau du vendeur, s'il en a un : à l'intérieur, on va plus loin et pour
  // moins cher. C'est toute la différence entre un commerce qui tient du hasard
  // — une paire tirée au sort, un écart de prix qui doit payer le trajet — et
  // une économie organisée, où un manque se comble parce que quelqu'un s'en
  // occupe. Une famine à huit régions d'un grenier plein durait des mois faute
  // d'avoir été tirée.
  const reseau = new Set(reseauDe(world, de.faction));
  const dedans = (col) => col.faction && reseau.has(col.faction);
  const chezSoi = dedans(de);

  // Les villes à portée, calculées une fois. La version précédente rebalayait
  // les cinquante-cinq colonies pour chacune des matières en surplus, et
  // recalculait la même distance à chaque tour : le tri par portée ne dépend pas
  // de la marchandise, seul le manque en dépend.
  const portee = [];
  for (const vers of world.colonies) {
    if (!vivante(vers) || vers.id === de.id) continue;
    const lie = chezSoi && dedans(vers);
    const d = distance(de.regionId, vers.regionId);
    if (d > (lie ? 12 : 7)) continue;
    portee.push({ vers, d, lie });
  }
  if (!portee.length) return null;

  let meilleur = null;
  for (const [k, qteDispo] of dispo) {
    const prixIci = prixUnitaire(de, k);
    for (const p of portee) {
      const manque = besoin(p.vers, k);
      if (manque < 12) continue;
      // Le gain vaut-il le trajet ? Écart de prix contre distance.
      const qte = Math.min(qteDispo, manque);
      const gain = (prixUnitaire(p.vers, k) - prixIci) * qte;
      const score = gain / (1 + p.d * 0.6) * (p.lie ? 2.2 : 1);
      if (score > 12 && (!meilleur || score > meilleur.score)) {
        meilleur = { k, de, vers: p.vers, qte, score, lie: p.lie };
      }
    }
  }
  if (!meilleur) return null;

  const route = chemin(world, de.regionId, meilleur.vers.regionId);
  if (!route || !route.length) return null;

  // Un marchand ne charge pas pour une ville qui ne peut pas régler.
  const qte = qteSolvable(
    meilleur.vers, meilleur.k,
    Math.max(10, Math.round(meilleur.qte * rng.range(0.5, 0.9)))
  );
  if (qte < 6) return null;
  de.stock[meilleur.k] = Math.max(0, (de.stock[meilleur.k] || 0) - qte);

  const car = {
    id: idDepuisRng(rng, 'v'),
    faction: de.faction,
    deId: de.id,
    versId: meilleur.vers.id,
    regionId: de.regionId,
    route,
    etape: 0,
    progres: 0,
    cargaison: { [meilleur.k]: qte },
    // Une caravane riche paie des gardes.
    escorte: Math.round(6 + qte * 0.25 * rng.range(0.7, 1.4)),
    depuis: state.temps,
  };
  world.caravanes.push(car);
  // Départs et arrivées ne sont pas journalisés : il en passe des centaines,
  // et le journal est plafonné — elles chasseraient les guerres et les morts
  // de la mémoire du monde. L'écran Monde les montre en direct.
  return car;
}

/**
 * Les départs qu'un réseau organise, par opposition à ceux que le hasard tire.
 *
 * On cherche le pire manque du réseau et le meilleur surplus capable d'y
 * répondre, et l'on envoie — sans exiger que l'écart de prix paie le trajet,
 * parce qu'un réseau ne cherche pas la marge : il cherche à ne pas laisser une
 * de ses villes crever pendant qu'une autre déborde. C'est ce que financent les
 * deux mille cinq cents crédits de l'amorce, et le convoi coûte sa course à la
 * caisse commune.
 */
export function departsDuReseau(state, rng, log) {
  const world = state.world;
  for (const membres of reseaux(world)) {
    // La clé du réseau, et les villes déjà servies ce tour-ci : une fois, ici.
    // Elles étaient recalculées à chaque manque examiné — `idReseau` alloue une
    // chaîne, et le balayage des convois en vol est linéaire. À elles deux,
    // 4,5 % du tick pour un résultat identique à chaque tour.
    const cle = idReseau(membres);
    const servies = new Set();
    let enCours = 0;
    for (const c of world.caravanes) {
      if (c.reseau !== cle) continue;
      enCours += 1;
      servies.add(c.versId);
    }
    if (enCours >= CARAVANES_PAR_RESEAU) continue;

    const villes = villesDuReseau(world, membres).filter(vivante);
    if (villes.length < 2) continue;

    // Tous les manques, du pire au moindre, pondérés par ce que ça pèse : une
    // ville sans vivres passe avant une ville sans isotope.
    //
    // Tous, et c'est le correctif. On n'en traitait qu'un seul par appel, si
    // bien qu'un réseau expédiait au plus un convoi toutes les douze heures —
    // et s'il n'existait aucune source pour ce manque-là, aucun. Mesuré : le
    // budget de convois est passé de quatre à trente sans rien changer, il en
    // circulait 3,4 dans les trois cas. Ce n'était pas le plafond qui bornait,
    // c'était l'entonnoir.
    // Une seule passe sur les villes du réseau, qui relève à la fois les manques
    // et, par marchandise, qui pourrait y répondre.
    //
    // La version précédente rebalayait toutes les villes du réseau pour *chacun*
    // des dossiers instruits — quadratique en villes, et les réseaux grossissent
    // avec les bourses. C'était 4,5 fois plus cher par ville que dans le monde
    // témoin. Au passage, `cibleStock` était appelé deux fois par couple
    // ville/marchandise, une fois pour le manque et une fois pour le surplus.
    const manques = [];
    const offres = new Map();
    for (const col of villes) {
      for (const k of COMMODITY_KEYS) {
        const cible = cibleStock(col, k);
        const stock = col.stock[k] || 0;
        const manque = Math.max(0, cible * 0.8 - stock);
        if (manque >= 12) {
          manques.push({ col, k, manque, urgence: manque * (k === 'rations' ? 3 : 1) });
        }
        // On ne retient ici que *qui* pourrait fournir : le disponible sera
        // recalculé au moment de choisir, parce qu'un départ vide le stock de sa
        // source et que le suivant doit le voir. Un stock ne remonte pas en cours
        // de passe, donc aucun fournisseur possible ne nous échappe.
        if (stock - cible * 1.1 >= 12) {
          const l = offres.get(k);
          if (l) l.push(col); else offres.set(k, [col]);
        }
      }
    }
    manques.sort((a, b) => b.urgence - a.urgence);

    // Le nombre de dossiers qu'un réseau instruit par tour. Ce n'est pas le
    // budget de convois : c'est le temps de ses commis.
    //
    // Il a fallu ce plafond le jour où le contrôle de solvabilité est passé
    // devant le comptage des convois. Le déplacement était juste — une ville
    // sans le sou ne doit pas consommer le budget d'une ville qui pouvait payer
    // — mais il a transformé une boucle bornée à quatre en balayage de toute la
    // liste des manques, chaque tour rebalayant les villes du réseau pour y
    // chercher une source. Sur un monde à cinq cents villes : `departsDuReseau`
    // multiplié par 5,9.
    let essais = 0;
    for (const pire of manques) {
      if (enCours >= CARAVANES_PAR_RESEAU || essais >= ESSAIS_PAR_RESEAU) break;
      // Une ville déjà servie ce tour-ci attend le suivant : on répartit plutôt
      // que d'empiler six convois sur le même grenier.
      if (servies.has(pire.col.id)) continue;
      essais += 1;

      let source = null;
      for (const col of (offres.get(pire.k) || [])) {
        if (col.id === pire.col.id) continue;
        const dispo = (col.stock[pire.k] || 0) - cibleStock(col, pire.k) * 1.1;
        if (dispo < 12) continue;
        const d = distance(col.regionId, pire.col.regionId);
        const score = Math.min(dispo, pire.manque) / (1 + d * 0.5);
        if (!source || score > source.score) source = { col, dispo, d, score };
      }
      if (!source) continue;

      // La solvabilité se vérifie avant de compter le convoi : une ville sans
      // le sou consommerait sinon le budget du réseau sans que rien ne parte,
      // et priverait de convoi une ville qui, elle, pouvait payer.
      const voulu = Math.max(12, Math.round(Math.min(source.dispo, pire.manque) * 0.8));
      const qte = qteSolvable(pire.col, pire.k, voulu);
      if (qte < 6) continue;

      enCours++;
      const route = chemin(world, source.col.regionId, pire.col.regionId);
      if (!route || !route.length) continue;
      servies.add(pire.col.id);
      source.col.stock[pire.k] = Math.max(0, (source.col.stock[pire.k] || 0) - qte);
      world.caravanes.push({
        id: idDepuisRng(rng, 'v'),
        faction: source.col.faction,
        reseau: cle,
        deId: source.col.id,
        versId: pire.col.id,
        regionId: source.col.regionId,
        route,
        etape: 0,
        progres: 0,
        cargaison: { [pire.k]: qte },
        // Un convoi de bourse voyage escorté : c'est un service, pas une aventure.
        escorte: Math.round(14 + qte * 0.3),
        depuis: state.temps,
      });
    }
  }
}

/**
 * Les niveaux d'escorte qu'on peut payer, et ce qu'ils valent.
 *
 * Un convoi qu'on ne peut pas perdre serait un téléporteur, et toute la
 * géographie du jeu s'annulerait — les distances, les régions dangereuses, le
 * fait qu'un camp isolé soit isolé. On paie donc pour réduire le risque, pas
 * pour le supprimer : au mieux, un convoi bien gardé traverse une région
 * tranquille presque à coup sûr, et une friche reste une friche.
 */
export const ESCORTES = [
  { id: 'aucune', nom: 'Aucune', force: 0, cout: 0, aide: 'On charge et on prie.' },
  { id: 'legere', nom: 'Deux gardes', force: 22, cout: 0.06, aide: 'De quoi décourager un maraudeur.' },
  { id: 'lourde', nom: 'Escorte armée', force: 55, cout: 0.16, aide: 'Ce que le réseau fait de mieux.' },
];

/**
 * Passer un ordre : les marchandises partent ou viennent, par la route.
 *
 * Une vente sort le lot de l'entrepôt tout de suite et paie à l'arrivée ; un
 * achat débite tout de suite et livre à l'arrivée. Dans les deux cas c'est un
 * convoi comme les autres : il traverse des régions, il peut être pillé, et
 * l'on peut le faire escorter.
 */
export function passerOrdre(state, sens, key, qte, escorteId, rng, log, groupeEscorte) {
  const v = peutTraiter(state);
  if (!v.ok) return v;
  const devis = chiffrerOrdre(state, sens, key, qte);
  if (!devis.ok) return devis;
  const base = state.base;
  const world = state.world;

  // La ville du réseau la plus proche : c'est de là que part le convoi, ou
  // c'est là qu'il va.
  const villes = villesDuReseau(world, devis.comptoir.membres).filter(vivante);
  if (!villes.length) return { ok: false, motif: 'Aucune ville du réseau n’est joignable.' };
  const place = villes.reduce((a, b) => (distance(b.regionId, base.regionId)
    < distance(a.regionId, base.regionId) ? b : a));

  const esc = ESCORTES.find((x) => x.id === escorteId) || ESCORTES[0];
  // Le fret : ce que les Rouilleurs donnent aux leurs. Ils vivent sur les
  // routes, la garde ne leur coûte rien à fournir — et c'est ce qui fait d'eux
  // un drapeau qu'on choisit, pas un drapeau par défaut. Voir SERVICES.
  const fret = !!avantage(state, 'fret');
  const fraisEscorte = fret ? 0 : Math.round(devis.brut * esc.cout);

  if (sens === 'achat') {
    const du = devis.total + fraisEscorte;
    if (state.player.credits < du) {
      return { ok: false, motif: `Il manque ${du - state.player.credits} cr.` };
    }
    state.player.credits -= du;
    // Ce que vous payez ne s'évapore pas : la ville qui vous fournit l'encaisse,
    // et sa faction prélève sa part. Votre négoce laisse enfin une trace dans le
    // monde au lieu de ne bouger que vos propres crédits.
    encaisser(world, place, devis.total);
  } else {
    const dispo = Math.floor(base.stock[key] || 0);
    if (dispo < devis.qte) {
      return { ok: false, motif: `L’entrepôt n’a que ${dispo} ${COMMODITIES[key].nom.toLowerCase()}.` };
    }
    if (state.player.credits < fraisEscorte) {
      return { ok: false, motif: `L’escorte coûte ${fraisEscorte} cr d’avance.` };
    }
    state.player.credits -= fraisEscorte;
    base.stock[key] = dispo - devis.qte;
  }

  const de = sens === 'achat' ? place.regionId : base.regionId;
  const vers = sens === 'achat' ? base.regionId : place.regionId;
  const route = chemin(world, de, vers);
  if (!route || !route.length) {
    // On rend ce qu'on a pris : un ordre qu'on ne peut pas honorer ne se paie pas.
    if (sens === 'achat') state.player.credits += devis.total + fraisEscorte;
    else { base.stock[key] = (base.stock[key] || 0) + devis.qte; state.player.credits += fraisEscorte; }
    return { ok: false, motif: 'Aucune route entre votre camp et le réseau.' };
  }

  const car = {
    id: idDepuisRng(rng, 'o'),
    faction: place.faction,
    reseau: devis.comptoir.id,
    // Ce qui distingue ce convoi de tous les autres : il est à vous.
    pour: 'joueur',
    sens,
    versBase: sens === 'achat',
    paiement: sens === 'vente' ? devis.total : 0,
    // Le camp n'a pas besoin d'être une ville inscrite : `versBase` suffit à dire
    // où va le convoi, et `destinationTenable` le sait. On garde l'identifiant
    // quand il existe, pour les convois qui repartent d'une place reconnue.
    deId: sens === 'achat' ? place.id : (base.colonieId || null),
    versId: sens === 'achat' ? (base.colonieId || null) : place.id,
    regionId: de,
    route,
    etape: 0,
    progres: 0,
    cargaison: { [key]: devis.qte },
    escorte: esc.force,
    escorteGroupe: groupeEscorte || null,
    depuis: state.temps,
  };
  world.caravanes.push(car);
  if (log) {
    log({
      type: 'bourse',
      texte: sens === 'achat'
        ? `Ordre passé : ${devis.qte} ${COMMODITIES[key].nom.toLowerCase()} depuis ${place.nom}, `
          + `${devis.total + fraisEscorte} cr. Le convoi est en route.`
        : `Ordre passé : ${devis.qte} ${COMMODITIES[key].nom.toLowerCase()} vers ${place.nom}, `
          + `${devis.total} cr à l’arrivée. Le convoi part.`,
      regionId: base.regionId,
      important: true,
    });
  }
  return { ok: true, caravane: car, devis, escorte: esc, frais: fraisEscorte, place };
}

/** Vos convois en cours, pour les suivre. */
export function ordresEnCours(state) {
  return (state.world.caravanes || []).filter((c) => c.pour === 'joueur');
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

function retirerCaravane(world, car) {
  const i = world.caravanes.indexOf(car);
  if (i >= 0) world.caravanes.splice(i, 1);
}

/**
 * Ce que l'acheteuse peut payer, en quantité.
 *
 * Un convoi ne part plus pour une ville qui n'a pas de quoi régler : la caisse
 * d'une ville ne serait qu'un chiffre décoratif si elle ne pouvait jamais
 * manquer. On rogne la cargaison au lieu d'annuler le départ — une ville
 * pauvre se fait livrer moins, elle ne se fait pas oublier.
 *
 * `debourser` à l'arrivée ne rend pas ce plafond inutile : entre le départ et
 * l'arrivée, la ville a pu dépenser. Le plafond décide de ce qu'on charge, le
 * débours de ce qui se paie vraiment.
 */
export function qteSolvable(vers, k, qte) {
  if (!vers || vers.avantPoste) return qte;
  const prix = COMMODITIES[k].prix;
  if (!(prix > 0)) return qte;
  return Math.min(qte, Math.floor((vers.caisse || 0) / prix));
}

export function valeurCargaison(car) {
  let v = 0;
  for (const k of Object.keys(car.cargaison)) {
    v += (car.cargaison[k] || 0) * COMMODITIES[k].prix;
  }
  return Math.round(v);
}

// `state` d'abord, et pas en dernier argument facultatif : c'est lui qui dit si
// ce convoi est celui du joueur. Il l'était, et un des deux appels l'a oublié —
// la cargaison partait alors dans le stock d'une ville, sans un crédit versé et
// sans rien dans le journal. Un paramètre qu'on peut omettre finit par l'être.
function arriver(state, car, log) {
  const world = state.world;
  // Un convoi du joueur ne se range pas dans le stock d'une ville : il rentre
  // dans son entrepôt, ou il rapporte ce qu'on lui devait.
  if (car.pour === 'joueur') {
    if (car.versBase) {
      for (const k of Object.keys(car.cargaison)) {
        state.base.stock[k] = (state.base.stock[k] || 0) + car.cargaison[k];
      }
      if (log) {
        log({
          type: 'bourse',
          texte: `Le convoi arrive : ${Object.keys(car.cargaison).map(
            (k) => `${Math.round(car.cargaison[k])} ${COMMODITIES[k].nom.toLowerCase()}`
          ).join(', ')} dans l’entrepôt.`,
          regionId: car.regionId,
          important: true,
        });
      }
    } else {
      state.player.credits += car.paiement || 0;
      // La ville qui vous a acheté règle sur sa caisse. Elle vous paie en
      // entier — le prix était convenu à la commande, et un ordre honoré se
      // paie ; ce qu'elle n'a pas, elle ne l'aura simplement plus pour se
      // ravitailler. Le crédit qu'elle vous consent ainsi n'est pas modélisé :
      // c'est la première approximation qu'il faudra reprendre le jour où les
      // villes auront des dettes.
      debourser(colonieParId(world, car.versId), car.paiement || 0);
      if (log) {
        log({
          type: 'bourse',
          texte: `Livraison honorée : ${car.paiement || 0} cr encaissés.`,
          regionId: car.regionId,
          important: true,
        });
      }
    }
    retirerCaravane(world, car);
    return;
  }
  const vers = colonieParId(world, car.versId);
  if (vivante(vers)) {
    for (const k of Object.keys(car.cargaison)) {
      vers.stock[k] = (vers.stock[k] || 0) + car.cargaison[k];
    }
    // Le marché se conclut ici : l'acheteuse paie, le vendeur encaisse, et la
    // faction du vendeur prélève sa part au passage.
    //
    // Avant, l'arrivée créditait la faction expéditrice de 35 % de la valeur et
    // *personne* ne payait — la ville destinataire recevait la marchandise pour
    // rien. C'était 84 % des recettes des factions, et 2,17 millions de crédits
    // créés à partir de rien sur trois parties. Un convoi déplace désormais de
    // l'argent au lieu d'en fabriquer : c'est ce qui fait qu'une bourse, qui
    // ouvre le négoce entre factions, vaut quelque chose.
    const de = colonieParId(world, car.deId);
    if (de && vivante(de) && de.id !== vers.id) {
      const regle = debourser(vers, valeurCargaison(car));
      if (vers.faction === de.faction) {
        encaisser(world, de, regle);
      } else {
        // D'un pays à l'autre, on change. Le vendeur reçoit ce que sa monnaie
        // vaut, l'écart reste à la ville qui tient le bureau — et il est deux
        // fois moindre si les deux pays ont signé un accord. C'est là que la
        // bourse paie enfin.
        // L'écart reste sur place, dans la monnaie du payeur ; le reste part
        // au change. Les unités sorties et les unités entrées ne sont pas les
        // mêmes en nombre : c'est le taux, et c'est tout le sujet.
        const garde = regle * ecartChange(world, vers, vers.faction, de.faction);
        const change = regle - garde;
        const recu = change * taux(world, vers.faction, de.faction);
        convertirMasse(world, vers.faction, de.faction, change, recu);
        encaisser(world, de, recu);
        encaisser(world, vers, garde);
      }
    }
  }
  retirerCaravane(world, car);
}

function pillee(state, car, par, log) {
  const world = state.world;
  // La perte d'un convoi à soi doit se lire autrement qu'une nouvelle du monde :
  // c'est votre marchandise ou votre argent qui vient de disparaître.
  if (car.pour === 'joueur') {
    log({
      type: 'bourse',
      texte: `Votre convoi est pillé en ${nomRegion(world, car.regionId)}${par ? ` par ${par}` : ''}. `
        + `${car.versBase ? 'La cargaison ne viendra pas.' : 'Elle ne sera jamais livrée, et personne ne paiera.'}`,
      regionId: car.regionId,
      important: true,
    });
    retirerCaravane(world, car);
    return;
  }
  log({
    type: 'caravane',
    texte: `Une caravane ${FACTIONS[car.faction].genitif} est pillée en ${nomRegion(world, car.regionId)}${par ? ` par ${par}` : ''}.`,
    regionId: car.regionId,
    important: true,
  });
  retirerCaravane(world, car);
}

/**
 * Ce que vaut l'escouade qui accompagne ce convoi, ici et maintenant.
 *
 * Elle ne compte que si elle est sur la même case : une escorte à trois régions
 * de là n'escorte rien. C'est ce qui distingue « embarquer une escouade » d'une
 * case à cocher — il faut vraiment faire la route avec.
 *
 * Et le lien s'arrête là : escorter un convoi ne donne pas d'ordre à l'escouade
 * et ne lui en retire pas. Une première version la remettait au repos quand le
 * convoi arrivait, ce qui annulait sans prévenir ce que le joueur lui avait
 * demandé entre-temps. Le convoi disparaît, le lien avec lui ; l'escouade
 * continue ce qu'elle faisait.
 */
function forceEscorte(state, car) {
  if (!car.escorteGroupe || !state) return 0;
  const g = (state.player.groupes || []).find((x) => x.id === car.escorteGroupe);
  if (!g || g.regionId !== car.regionId) return 0;
  let f = 0;
  for (const c of g.membres) {
    if (!estDebout(c)) continue;
    f += comp(c, 'melee') * 0.4 + comp(c, 'tir') * 0.4 + comp(c, 'endurance') * 0.2;
  }
  return f;
}

/** Le convoi a-t-il encore quelque part où aller ? */
function destinationTenable(state, car) {
  if (car.pour === 'joueur') {
    return car.versBase
      ? !!(state.base && state.base.fonde)
      : vivante(colonieParId(state.world, car.versId));
  }
  return vivante(colonieParId(state.world, car.versId));
}

/** Une heure de route pour toutes les caravanes. */
export function tickCaravanes(state, log, ctx) {
  const rng = ctx.rng;
  const world = state.world;
  if (!world.caravanes) world.caravanes = [];

  for (const car of world.caravanes.slice()) {
    if (!world.caravanes.includes(car)) continue;

    // La destination existe-t-elle encore ? `vivante` exige un drapeau, et
    // c'est juste pour une ville — mais le camp du joueur n'en a pas quand il
    // est indépendant, et tout convoi qui lui était adressé disparaissait au
    // premier tour, sans livraison, sans paiement, sans une ligne au journal.
    // Un camp existe parce qu'il est fondé, pas parce qu'il porte des couleurs.
    if (!destinationTenable(state, car)) { retirerCaravane(world, car); continue; }

    // Une colonne ennemie sur la case, et la caravane disparaît.
    const armee = world.armees.find(
      (a) => a.regionId === car.regionId && a.faction !== car.faction
    );
    if (armee && rng.chance(0.5)) {
      // Une colonne qui pille emporte des caisses, pas un virement. Créditer
      // ici le trésor du pillard fabriquait de la monnaie à chaque convoi
      // intercepté — c'était la dernière planche à billets du moteur.

      pillee(state, car, FACTIONS[armee.faction].nom, log);
      continue;
    }

    // Les routes ne sont pas sûres : le danger de la région s'applique.
    const r = world.regions[car.regionId];
    const garde = car.escorte + forceEscorte(state, car);
    const risque = r.danger * 1.6 * (1 - Math.min(0.85, garde / 60));
    if (rng.chance(risque)) {
      if (rng.chance(0.55)) {
        pillee(state, car, 'des pillards', log);
        continue;
      }
      // Attaque repoussée, mais l'escorte fond.
      car.escorte = Math.max(0, car.escorte - rng.irange(2, 8));
    }

    car.progres += 1;
    if (car.progres < HEURES_PAR_CASE) continue;
    car.progres = 0;

    if (car.etape >= car.route.length) { arriver(state, car, log); continue; }
    car.regionId = car.route[car.etape];
    // Le commerce trace les routes mieux que personne : c'est lui qui passe.
    damer(world, car.regionId, 1.6);
    car.etape++;
    if (car.etape >= car.route.length) arriver(state, car, log);
  }

  // Nouveau départ de temps en temps
  if (state.temps % 9 === 0) tenterDepart(state, rng, log);
  // Et les réseaux, eux, ne tirent pas au sort : ils regardent où ça manque et
  // ils envoient. C'est très exactement ce qu'une bourse achète — pas de
  // meilleures routes, des départs décidés. Mesuré avant : 0,8 caravane en
  // circulation en moyenne sur toute la carte, pic à trois. Le plafond de sept
  // n'a jamais été la contrainte ; c'était le tirage.
  // Toutes les huit heures, et c'est mesuré, pas prudent. Six graines, six
  // mille heures :
  //
  //     cadence   villes debout   population   villes nourries   convois
  //       3 h          515          105 504         270          16 222
  //       5 h          522          102 951         280          17 876
  //       8 h          513          106 726         279          16 998
  //
  // Le monde est rigoureusement indifférent : mêmes villes, même population,
  // mêmes convois. La raison est arithmétique — le budget d'un réseau est de
  // quatre convois *en vol*, pas quatre départs par passe. Repasser toutes les
  // trois heures ne fait donc que reconstater un budget plein. Et ça se paie :
  // 128 à 146 µs de tick à trois heures, 112 à 118 à huit.
  //
  // Ça a été douze pendant un temps, « pour la perf », et c'était alors un
  // réflexe payé pour rien : le tick mesurait cent trente microsecondes parce
  // que je lançais mes mesures pendant que les suites de tests tournaient. Une
  // limite doit gagner sa place. Celle-là ne la gagnait pas ; celle-ci la gagne,
  // et on peut dire de combien.
  if (!state.world.sansDeparts && state.temps % 8 === 0) departsDuReseau(state, rng, log);
}

// ---------------------------------------------------------------------------
// Le joueur s'en mêle
// ---------------------------------------------------------------------------

/** Caravanes présentes dans la région du joueur. */
export function caravanesIci(state) {
  const g = groupeActif(state);
  return (state.world.caravanes || []).filter((c) => g && c.regionId === g.regionId);
}

/**
 * Détrousser une caravane. C'est immédiat, et c'est la manière la plus rapide
 * de se faire haïr d'une faction.
 *
 * Ce n'est pas rentable, et le commentaire l'a prétendu longtemps. Mesuré : une
 * caravane porte une trentaine d'unités, quatre cent quarante crédits environ,
 * et l'embuscade coûte vingt-deux points de réputation plus la rancune nommée
 * des deux villes qui l'attendaient. Un bot qui prend tout ce qui croise sa
 * route finit la partie à 3 957 crédits contre 5 246 pour le même bot qui
 * laisse passer.
 *
 * Ce n'est pas un défaut : c'est une occasion, pas un métier. Ce qui l'empêche
 * d'être un métier n'est pas le prix mais la géométrie — trois cent quatre-vingts
 * caravanes circulent par partie, et il n'en passe que onze heures-caravane sur
 * une case donnée en quatre mille heures, y compris sur la ville la mieux
 * reliée. On ne peut pas non plus les suivre : elles franchissent une région en
 * deux heures là où une colonne en met quatorze.
 */
export function attaquerCaravane(state, car, rng, log, combatContre, genererBande, groupe) {
  if (!state.world.caravanes.includes(car)) {
    return { ok: false, motif: 'La caravane est déjà loin.' };
  }
  const g = groupe || groupeActif(state);
  const escorteTaille = Math.max(1, Math.min(6, Math.round(car.escorte / 9)));
  const bande = genererBande(rng, car.faction, escorteTaille, Math.min(2, Math.floor(state.temps / 2500)));
  bande.nom = `Escorte ${FACTIONS[car.faction].genitif}`;

  log({
    type: 'caravane',
    texte: `Embuscade sur une caravane ${FACTIONS[car.faction].genitif}.`,
    important: true,
    regionId: car.regionId,
  });

  const res = combatContre(state, bande, log, { rng });
  if (res.vainqueur !== 'A') {
    return { ok: true, gagne: false, motif: 'L’escorte a tenu.' };
  }

  // Le butin, puis l'addition : la faction n'oubliera pas.
  //
  // On charge la marchandise ici, dans le sac de ceux qui viennent de se battre.
  // Elle ne l'était nulle part : cette fonction se contentait de retourner
  // `pris` à l'appelant, `main.js` relayait l'objet et l'interface affichait
  // « Caravane détroussée » avant de le jeter. On gagnait l'embuscade, on
  // encaissait les vingt-deux points de réputation et la rancune nommée des deux
  // villes concernées — et l'on repartait les mains vides. Le pillage entier
  // était une perte sèche, sans qu'aucun compteur ne le dise.
  //
  // Ce qu'on ne peut pas porter reste sur place : une colonne ne remporte pas
  // cent unités d'alliage à dos d'homme, et c'est ce qui donne son prix à
  // l'attelage.
  const pris = {};
  let laisse = 0;
  const capacite = capacitePortage(state, g);
  for (const k of Object.keys(car.cargaison)) {
    const veut = car.cargaison[k] || 0;
    if (veut <= 0) continue;
    const libre = capacite - poidsInventaire(g.inventaire);
    const poidsU = COMMODITIES[k].poids;
    const max = poidsU > 0 ? Math.floor(libre / poidsU) : veut;
    const q = Math.max(0, Math.min(veut, max));
    if (q > 0) {
      g.inventaire[k] = (g.inventaire[k] || 0) + q;
      pris[k] = q;
    }
    laisse += veut - q;
  }
  retirerCaravane(state.world, car);

  const rep = state.player.reputation;
  if (car.faction && car.faction !== 'essaim') {
    rep[car.faction] = Math.max(-100, (rep[car.faction] || 0) - 22);
    // Une caravane qui n'arrive pas, ce sont des gens qui l'attendaient. Ceux
    // des deux bouts s'en souviennent nommément, pas seulement la faction.
    for (const id of [car.deId, car.versId]) {
      const col = id && state.world.colonies.find((c) => c.id === id);
      if (col) retenirEnVille(col, 'pillage', state.temps, -18);
    }
  }
  state.stats.caravanesPillees = (state.stats.caravanesPillees || 0) + 1;
  if (log) {
    const dit = Object.keys(pris).map(
      (k) => `${pris[k]} ${COMMODITIES[k].nom.toLowerCase()}`).join(', ');
    log({
      type: 'caravane',
      texte: dit
        ? `Caravane détroussée : ${dit}${laisse > 0 ? ` — ${laisse} unités laissées sur place, faute de bras` : ''}.`
        : 'Caravane détroussée, mais les sacs sont pleins : tout reste sur place.',
      important: true,
      regionId: car.regionId,
    });
  }
  return { ok: true, gagne: true, pris, laisse };
}
