// Caravanes marchandes. Les villes ne vivent pas en vase clos : ce qu'une
// colonie a en trop part chez celle qui en manque, sur des routes qui traversent
// des régions dangereuses. C'est ce qui relie l'économie à la carte — et ce qui
// donne au joueur autre chose à faire que ramasser des cailloux.

import { COMMODITIES, COMMODITY_KEYS, FACTIONS, drapeauDe } from './data.js';
import { commettre, delaiVersFaction, CANAUX } from './faits.js';
import { Rng, grainDe } from './rng.js';
import {
  chemin, colonieParId, colonieDe, nomRegion, distance, damer,
  negoceCoupe, vivresCoupees, aucuneCoupure, villeDuBarrage,
  noterAuPoste,
  posteDe,
} from './world.js';
import {
  reseauDe, reseaux, idReseau, villesDuReseau, peutTraiter, chiffrerOrdre,
} from './bourse.js';

/** Sept, plus ce que les bourses financent. */

/**
 * Ce que craint un convoi (TERRITOIRE.md, T1). Un marchand n'est pas une
 * colonne : il évite les routes mal famées, il évite de payer un péage quand
 * le détour coûte moins cher, et il ne traverse pas les terres de qui fait la
 * guerre à sa maison. Rien de tout cela n'est un interdit — ce sont des coûts,
 * et un convoi passe encore là où tout est infâme.
 */
// Le mémo des craintes, valable une heure de jeu. `departsDuReseau` calcule
// plusieurs routes par passage et pèse 9 % du tick : reconstruire l'ensemble
// des guerres d'un pays à chaque course était de l'allocation pure.
let craintesHeure = -1;
let craintesCache = null;
function craintesDe(world, faction) {
  const h = world.heure || 0;
  if (craintesHeure !== h || !craintesCache) {
    craintesHeure = h;
    craintesCache = new Map();
  }
  const cle = faction || '—';
  const vu = craintesCache.get(cle);
  if (vu) return vu;
  const ennemis = new Set();
  for (const g of world.guerres || []) {
    if (g.a === faction) ennemis.add(g.b);
    else if (g.b === faction) ennemis.add(g.a);
  }
  const out = { craint: true, sien: faction || null, ennemis };
  craintesCache.set(cle, out);
  return out;
}

export function plafondCaravanes(world) {
  return MAX_CARAVANES + reseaux(world).length * CARAVANES_PAR_RESEAU;
}
import { groupeActif } from './groupes.js';
import {
  cibleStock, prixUnitaire, capacitePortage, poidsInventaire, encaisser, debourser,
  prixJoueur,
} from './economy.js';
import { idDepuisRng, estDebout, comp } from './characters.js';
import { retenirEnVille } from './services.js';
import { avantage } from './allegeance.js';
import {
  transferer, convertirMasse, ecartChange, taux, entrerDehors, sortirDehors,
  gagner, regler, soldeIci, signeIci, aDeQuoi, solde,
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

  // On ne charge pas depuis une place dont on a fermé les routes : c'est tout
  // l'objet d'un blocus (M1c-S3). Rien de tel n'arrive tant que personne ne
  // l'a décidé — une colonne qui investit une ville ne coupe rien.
  // Tant que personne ne coupe rien — le cas de presque toute partie —, on ne
  // pose aucune de ces questions.
  const libre = aucuneCoupure(world, state.temps);
  const vendeurs = world.colonies.filter(
    (c) => vivante(c) && aDuSurplus(c) && (libre || !negoceCoupe(world, c, state.temps)));
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
    // Et l'on ne charge pas pour elle non plus : ses portes sont fermées.
    if (!libre && negoceCoupe(world, vers, state.temps)) continue;
    const lie = chezSoi && dedans(vers);
    const d = distance(de.regionId, vers.regionId);
    if (d > (lie ? 12 : 7)) continue;
    // Lu une fois par ville, et non une fois par ville ET par marchandise : la
    // boucle qui suit est un produit, et y glisser un appel coûtait douze pour
    // cent du tick du monde — mesuré au banc, pour un mécanisme qui ne fait
    // rien tant que personne n'assiège (METHODE.md §11, « vérifie que tu n'as
    // pas déplacé le coût »).
    portee.push({ vers, d, lie, sansVivres: !libre && vivresCoupees(world, vers, state.temps) });
  }
  if (!portee.length) return null;

  let meilleur = null;
  for (const [k, qteDispo] of dispo) {
    const prixIci = prixUnitaire(de, k);
    for (const p of portee) {
      // Affamer, c'est fermer la ville au pain et à rien d'autre : le reste
      // du négoce continue, et c'est ce qui distingue cette manière du blocus.
      if (k === 'rations' && p.sansVivres) continue;
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

  const route = chemin(world, de.regionId, meilleur.vers.regionId,
    craintesDe(world, de.faction));
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
    rngEtat: 0,   // posé juste après le littéral : dérivé de son nom, pas tiré
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
    // Un convoi de ville se présente aux barrages : la fraude est un verbe du
    // joueur (TERRITOIRE.md, E4). La clé naît quand même ici — un état qui
    // n'existe qu'à moitié ne survit pas à un aller-retour JSON.
    fraude: false,
    depuis: state.temps,
  };
  car.rngEtat = grainDe(world.graine, 'convoi', car.id);
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
export function departsDuReseau(state, _rng, log) {
  const world = state.world;
  for (const membres of reseaux(world)) {
    // La clé du réseau, et les villes déjà servies ce tour-ci : une fois, ici.
    // Elles étaient recalculées à chaque manque examiné — `idReseau` alloue une
    // chaîne, et le balayage des convois en vol est linéaire. À elles deux,
    // 4,5 % du tick pour un résultat identique à chaque tour.
    const cle = idReseau(membres);
    // Chaque réseau expédie avec son propre hasard, dérivé de sa clé et de
    // l'heure. Apatride : rien à ranger, rien à migrer. Tant qu'ils puisaient
    // au sac commun, l'ordre des réseaux décidait des tirages de tout ce qui
    // suit.
    const rng = new Rng(grainDe(world.graine, 'reseau', cle, state.temps));
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
      const route = chemin(world, source.col.regionId, pire.col.regionId,
        craintesDe(world, source.col.faction));
      if (!route || !route.length) continue;
      servies.add(pire.col.id);
      source.col.stock[pire.k] = Math.max(0, (source.col.stock[pire.k] || 0) - qte);
      world.caravanes.push(avecDe(world, {
        id: idDepuisRng(rng, 'v'),
        rngEtat: 0,
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
        fraude: false,
        depuis: state.temps,
      }));
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
export function passerOrdre(state, sens, key, qte, escorteId, rng, log, groupeEscorte, fraude) {
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
    if (soldeIci(state) < du) {
      return { ok: false, motif: `Il manque ${du - soldeIci(state)} ${signeIci(state)}.` };
    }
    regler(state, du);
    // Ce que vous payez ne s'évapore pas : la ville qui vous fournit l'encaisse,
    // et sa faction prélève sa part. Votre négoce laisse enfin une trace dans le
    // monde au lieu de ne bouger que vos propres crédits. Et comme il vient
    // d'une poche que le registre ne connaît pas, il faut l'émettre — voir
    // `entrerDehors`.
    encaisser(world, place, devis.total);
    entrerDehors(world, place.faction, devis.total);
  } else {
    const dispo = Math.floor(base.stock[key] || 0);
    if (dispo < devis.qte) {
      return { ok: false, motif: `L’entrepôt n’a que ${dispo} ${COMMODITIES[key].nom.toLowerCase()}.` };
    }
    if (soldeIci(state) < fraisEscorte) {
      return { ok: false, motif: `L’escorte coûte ${fraisEscorte} ${signeIci(state)} d’avance.` };
    }
    regler(state, fraisEscorte);
    base.stock[key] = dispo - devis.qte;
  }

  const de = sens === 'achat' ? place.regionId : base.regionId;
  const vers = sens === 'achat' ? base.regionId : place.regionId;
  const route = chemin(world, de, vers);
  if (!route || !route.length) {
    // On rend ce qu'on a pris : un ordre qu'on ne peut pas honorer ne se paie pas.
    if (sens === 'achat') gagner(state, devis.total + fraisEscorte);
    else { base.stock[key] = (base.stock[key] || 0) + devis.qte; gagner(state, fraisEscorte); }
    return { ok: false, motif: 'Aucune route entre votre camp et le réseau.' };
  }

  const car = {
    id: idDepuisRng(rng, 'o'),
    rngEtat: 0,
    faction: place.faction,
    reseau: devis.comptoir.id,
    // Ce qui distingue ce convoi de tous les autres : il est à vous.
    pour: 'joueur',
    sens,
    versBase: sens === 'achat',
    // L'ADRESSE, et non « le camp sous les yeux ».
    //
    // Depuis les camps multiples (IMPLANTATIONS.md, M4), `state.base` est une
    // référence mouvante : celui qu'on habite. `arriver` y rangeait la
    // cargaison, si bien qu'un convoi commandé chez soi puis attendu ailleurs
    // suivait le regard du joueur au lieu d'aller à son adresse. Une case ne
    // bouge pas : c'est elle, l'adresse d'un camp.
    versRegion: base.regionId,
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
    // On ne déclare pas la charge (TERRITOIRE.md, E4). Le champ vit sur le
    // convoi et non sur le camp : c'est une décision par départ, pas un
    // réglage — on passe en fraude quand la route en vaut la peine.
    fraude: !!fraude,
    escorteGroupe: groupeEscorte || null,
    depuis: state.temps,
  };
  car.rngEtat = grainDe(world.graine, 'convoi', car.id);
  world.caravanes.push(car);
  if (log) {
    log({
      type: 'bourse',
      texte: sens === 'achat'
        ? `Ordre passé : ${devis.qte} ${COMMODITIES[key].nom.toLowerCase()} depuis ${place.nom}, `
          + `${devis.total + fraisEscorte} ${signeIci(state)}. Le convoi est en route.`
        : `Ordre passé : ${devis.qte} ${COMMODITIES[key].nom.toLowerCase()} vers ${place.nom}, `
          + `${devis.total} ${signeIci(state)} à l’arrivée. Le convoi part.`,
      regionId: base.regionId,
      important: true,
    });
  }
  return { ok: true, caravane: car, devis, escorte: esc, frais: fraisEscorte, place };
}

/**
 * Le convoi à gages (CONVOI.md) : on paie des gens pour aller acheter dans une
 * ville et revendre dans une autre. Le carnet montrait les écarts de prix
 * depuis longtemps ; il n'avait pas de bras.
 *
 * Trois nombres, tous calibrables — et **les gages se paient à la course**, pas
 * à la valeur de la cargaison. Un pourcentage du chargement rendrait les gros
 * lots lointains presque gratuits ; des gens qui marchent se paient au trajet,
 * et c'est ce qui garde la marche du joueur intéressante sur les gros lots.
 *
 * Rien d'autre n'est ajouté pour borner l'arbitrage : `prixJoueur` applique
 * déjà la marge du marchand des deux côtés — on achète cher et l'on vend bon
 * marché —, si bien qu'un écart doit être réel pour rapporter un sou. Le monde
 * se défend avec ce qu'il a.
 */
export const GAGES = {
  /** Une charrette, pas un train : ce qu'un convoi emporte au plus. */
  charge: 120,
  /** Ce qu'il en coûte de lever une équipe, quelle que soit la course. */
  socle: 40,
  /** ... et par région traversée. */
  parRegion: 18,
};

/** Ce que coûtent les bras pour cette course-là. */
export function gagesConvoi(state, deId, versId) {
  const a = colonieParId(state.world, deId);
  const b = colonieParId(state.world, versId);
  if (!a || !b) return 0;
  return Math.round(GAGES.socle + distance(a.regionId, b.regionId) * GAGES.parRegion);
}

/**
 * Commander un convoi à gages, depuis le comptoir de son camp.
 *
 * Même porte que les autres ordres (`peutTraiter`), même transport que tous les
 * convois du monde : il traverse, il peut être pillé, on peut l'escorter. Ce
 * qui change tient en une ligne — il part d'une ville au lieu de partir de chez
 * vous, et c'est une autre ville qui le reçoit. L'arrivée, elle, était déjà
 * écrite : `arriver` sait payer le joueur et faire débourser la ville.
 */
export function devisGages(state, deId, versId, key, qte, escorteId) {
  const v = peutTraiter(state);
  if (!v.ok) return v;
  const world = state.world;
  const a = colonieParId(world, deId);
  const b = colonieParId(world, versId);
  if (!a || !b || a.id === b.id) return { ok: false, motif: 'Il faut deux villes différentes.' };
  if (!vivante(a) || !vivante(b)) return { ok: false, motif: 'Une des deux places n’est plus.' };
  if (!COMMODITIES[key]) return { ok: false, motif: 'Cette matière n’existe pas.' };

  // Une charrette, pas plus que ce qu'ils ont en magasin — et pas plus que ce
  // que la ville d'arrivée peut régler. C'est le patron du monde
  // (`qteSolvable`, « un marchand ne charge pas pour une ville qui ne peut pas
  // payer ») et non une prudence inventée ici : sans lui, on avance l'argent
  // d'un lot que personne au bout de la route n'a les moyens de vous acheter.
  const magasin = Math.min(Math.floor(qte), GAGES.charge, Math.floor(a.stock[key] || 0));
  if (magasin <= 0) return { ok: false, motif: `${a.nom} n’a rien de tel à vendre.` };
  const n = qteSolvable(b, key, magasin);
  if (n <= 0) return { ok: false, motif: `${b.nom} n’a pas de quoi vous acheter cela.` };

  const route = chemin(world, a.regionId, b.regionId, craintesDe(world, a.faction));
  if (!route || !route.length) return { ok: false, motif: 'Aucune route entre ces deux places.' };

  // Le prix d'un marchand, des deux côtés : on achète au prix d'achat de l'une
  // et l'on vend au prix de vente de l'autre. La double marge est le vrai
  // garde-fou de ce geste.
  const achat = Math.round(prixJoueur(a, key, 0, 0, 0, undefined, world).achat * n);
  const vente = Math.round(prixJoueur(b, key, 0, 0, 0, undefined, world).vente * n);
  const gages = gagesConvoi(state, deId, versId);
  const esc = ESCORTES.find((x) => x.id === escorteId) || ESCORTES[0];
  const fret = !!avantage(state, 'fret');
  const fraisEscorte = fret ? 0 : Math.round(achat * esc.cout);
  return {
    ok: true,
    comptoir: v.comptoir,
    de: a,
    vers: b,
    qte: n,
    achat,
    vente,
    gages,
    frais: fraisEscorte,
    escorte: esc,
    route,
    avance: achat + gages + fraisEscorte,
    gain: vente - (achat + gages + fraisEscorte),
    cases: route.length,
  };
}

export function passerOrdreGages(state, deId, versId, key, qte, escorteId, rng, log, fraude) {
  const d = devisGages(state, deId, versId, key, qte, escorteId);
  if (!d.ok) return d;
  const world = state.world;
  const {
    de: a, vers: b, qte: n, achat, vente, gages, frais: fraisEscorte, escorte: esc, route,
  } = d;
  const du = d.avance;
  if (soldeIci(state) < du) {
    return { ok: false, motif: `Il manque ${du - soldeIci(state)} ${signeIci(state)}.` };
  }

  regler(state, du);
  // Ce que vous payez, la ville l'encaisse — et comme il vient d'une poche que
  // le registre ne connaît pas, il faut l'émettre (même patron que `passerOrdre`).
  encaisser(world, a, achat);
  entrerDehors(world, a.faction, achat);
  a.stock[key] = Math.max(0, (a.stock[key] || 0) - n);

  const car = {
    id: idDepuisRng(rng, 'g'),
    rngEtat: 0,
    faction: a.faction,
    reseau: d.comptoir.id,
    pour: 'joueur',
    sens: 'gages',
    versBase: false,
    paiement: vente,
    deId: a.id,
    versId: b.id,
    regionId: a.regionId,
    route,
    etape: 0,
    progres: 0,
    cargaison: { [key]: n },
    escorte: esc.force,
    // On ne déclare pas la charge (TERRITOIRE.md, E4). Le champ vit sur le
    // convoi et non sur le camp : c'est une décision par départ, pas un
    // réglage — on passe en fraude quand la route en vaut la peine.
    fraude: !!fraude,
    escorteGroupe: null,
    depuis: state.temps,
  };
  car.rngEtat = grainDe(world.graine, 'convoi', car.id);
  world.caravanes.push(car);
  if (log) {
    log({
      type: 'bourse',
      texte: `Convoi à gages : ${n} ${COMMODITIES[key].nom.toLowerCase()} pris à ${a.nom} `
        + `pour ${b.nom}. ${du} ${signeIci(state)} avancés, ${vente} à l’arrivée `
        + `s’il arrive.`,
      regionId: a.regionId,
      important: true,
    });
  }
  return { ok: true, caravane: car, qte: n, achat, vente, gages, frais: fraisEscorte, de: a, vers: b };
}

/**
 * Porter d'un de vos camps à un autre, à gages (CONVOI.md).
 *
 * Question du propriétaire, en jouant : « mais si je transporte des matériaux
 * entre mes bases, comment ça se passe ? » — il ne se passait rien. On pouvait
 * planter autant de camps qu'on voulait (M4) et chacun vivait sur son propre
 * entrepôt ; le seul transport possible était le sac de l'escouade.
 *
 * Aucune règle neuve : ce sont les mêmes gens qu'on paie à la course, la même
 * charrette, la même escorte et la même route que le convoi à gages. Ce qui
 * change est qu'il n'y a rien à acheter ni à vendre — la marchandise est déjà à
 * vous — donc on ne paie que les bras.
 */
export function passerOrdreCamps(state, deRegion, versRegion, key, qte, escorteId, rng, log, fraude) {
  const camps = Array.isArray(state.camps) && state.camps.length
    ? state.camps : [state.base].filter(Boolean);
  const a = camps.find((c) => c && c.fonde && c.regionId === deRegion);
  const b = camps.find((c) => c && c.fonde && c.regionId === versRegion);
  if (!a || !b) return { ok: false, motif: 'Il faut deux camps à vous, tous les deux debout.' };
  if (a === b) return { ok: false, motif: 'Ce camp est déjà là où il est.' };
  if (!COMMODITIES[key]) return { ok: false, motif: 'Cette matière n’existe pas.' };

  const n = Math.min(Math.floor(qte), GAGES.charge, Math.floor(a.stock[key] || 0));
  if (n <= 0) return { ok: false, motif: `${a.nom || 'Le camp'} n’a pas cela en magasin.` };

  const route = chemin(state.world, a.regionId, b.regionId);
  if (!route || !route.length) return { ok: false, motif: 'Aucune route entre vos deux camps.' };

  // Les bras se paient à la course, comme partout ailleurs. L'escorte, elle,
  // se chiffre sur ce que vaut la cargaison : c'est ce qu'on risque de perdre.
  const gages = Math.round(GAGES.socle + distance(a.regionId, b.regionId) * GAGES.parRegion);
  const esc = ESCORTES.find((x) => x.id === escorteId) || ESCORTES[0];
  const fret = !!avantage(state, 'fret');
  const valeur = Math.round(COMMODITIES[key].prix * n);
  const fraisEscorte = fret ? 0 : Math.round(valeur * esc.cout);
  const du = gages + fraisEscorte;
  if (soldeIci(state) < du) {
    return { ok: false, motif: `Il manque ${du - soldeIci(state)} ${signeIci(state)}.` };
  }
  regler(state, du);
  a.stock[key] = Math.max(0, (a.stock[key] || 0) - n);

  const car = {
    id: idDepuisRng(rng, 'p'),
    rngEtat: 0,
    faction: null,
    pour: 'joueur',
    sens: 'camps',
    versBase: true,
    versRegion: b.regionId,
    paiement: 0,
    deId: a.colonieId || null,
    versId: b.colonieId || null,
    regionId: a.regionId,
    route,
    etape: 0,
    progres: 0,
    cargaison: { [key]: n },
    escorte: esc.force,
    // On ne déclare pas la charge (TERRITOIRE.md, E4). Le champ vit sur le
    // convoi et non sur le camp : c'est une décision par départ, pas un
    // réglage — on passe en fraude quand la route en vaut la peine.
    fraude: !!fraude,
    escorteGroupe: null,
    depuis: state.temps,
  };
  car.rngEtat = grainDe(state.world.graine, 'convoi', car.id);
  state.world.caravanes.push(car);
  if (log) {
    log({
      type: 'bourse',
      texte: `Convoi entre vos camps : ${n} ${COMMODITIES[key].nom.toLowerCase()} `
        + `de ${a.nom || 'votre camp'} vers ${b.nom || 'l’autre'}. `
        + `${du} ${signeIci(state)} de gages.`,
      regionId: a.regionId,
      important: true,
    });
  }
  return { ok: true, caravane: car, qte: n, gages, frais: fraisEscorte, de: a, vers: b };
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

/**
 * Ce qu'un barrage prélève sur un convoi, en part de ce qu'il transporte.
 *
 * Une part et non un forfait : un barrage regarde passer la marchandise, et
 * quatre cents de ferraille ne se rançonnent pas comme une caisse d'isotopes.
 * Une part, aussi, parce qu'il ne faut **jamais un tirage de plus** : le péage
 * du joueur, lui, est tiré (40 à 220) parce qu'il l'était déjà.
 */
export const PEAGE_CONVOI = { part: 0.02 };

/**
 * Ce qu'un convoi fait devant un barrage.
 *
 * Le propriétaire, interrogé sur ce qu'un convoi paie : « toutes les réponses
 * sont possibles et plus encore ». Ce n'est donc pas un choix mais une table —
 * le même parti que `MOTIFS_SECESSION`. On la lit dans l'ordre, et la première
 * qui peut, fait. Pour en ajouter une, il suffit d'écrire une entrée : rien
 * d'autre dans le moteur ne connaît la liste.
 */
/**
 * Ce que risque un convoi qui passe sans se présenter (TERRITOIRE.md, E4).
 *
 * Le péage était une friction sans contre-jeu — l'odeur n°4 d'`AUDIT.md` : on
 * payait, ou l'on prenait le détour que T1 chiffre, et c'était tout. La
 * contrebande est le troisième terme, et c'est celui qui rend les deux autres
 * intéressants : elle est gratuite quand elle marche, et plus chère que le
 * péage quand elle rate.
 *
 * Ce qui décide n'est pas un chiffre en l'air : c'est ce que le barrage VOIT.
 * Une route où il passe cent convois cache le cent-unième ; une escorte armée
 * arrêtée devant une barrière se remarque. Le reste — la valeur du chargement
 * confisqué, l'estime perdue — est le prix de s'être fait prendre.
 */
export const CONTREBANDE = {
  /** Le risque de base d'être fouillé, sur une route déserte et sans escorte. */
  risque: 0.34,
  /** Ce que la foule d'une route passante retire à ce risque. */
  foule: 0.22,
  /** Ce qu'une escorte ajoute, par point de force. */
  escorte: 0.0032,
  /** Jamais certain, jamais impossible. */
  min: 0.04,
  max: 0.8,
  /** Pris, on laisse ce multiple du péage qu'on refusait de payer. */
  amende: 3.5,
  /** Et leur estime en prend un coup. */
  estime: 4,
};

/**
 * Le risque, chiffré. Exporté parce que l'écran doit pouvoir le DIRE avant le
 * départ : une décision qu'on prend sans connaître son risque n'est pas une
 * décision, c'est un pari.
 */
export function risqueFraude(state, car, regionId) {
  const r = state.world.regions[regionId];
  const piste = (r && r.piste) || 0;
  const brut = CONTREBANDE.risque
    - piste * CONTREBANDE.foule
    + (car.escorte || 0) * CONTREBANDE.escorte;
  return Math.max(CONTREBANDE.min, Math.min(CONTREBANDE.max, brut));
}

/**
 * On passe sans se présenter. Le dé est CELUI DU CONVOI, dérivé de son nom et
 * de la case : jamais un tirage de plus dans la séquence du monde (CLAUDE.md,
 * piège n°1) — le même convoi devant le même barrage a toujours le même sort.
 */
function passerEnFraude(v) {
  const world = v.state.world;
  const risque = risqueFraude(v.state, v.convoi, v.convoi.regionId);
  const de = new Rng(grainDe(world.graine, 'fraude', v.convoi.id, v.convoi.regionId));
  v.pris = de.f() < risque;
  if (!v.pris) return 0;
  // Pris : on ne paie pas le péage, on paie l'amende — et l'on ne l'a pas en
  // caisse, donc c'est la cargaison qui part. Sans place pour l'encaisser, la
  // marchandise se perd tout de même : le barrage n'est pas une ville.
  const duAvant = v.du;
  v.du = Math.round(v.du * CONTREBANDE.amende);
  const pris = v.place ? prendreEnNature(v) : perdreDeSaCharge(v);
  v.du = duAvant;
  // Et l'on sait maintenant qui vous êtes. L'estime est le vrai prix : elle
  // décide de ce qu'on vous vend, de qui vous enrôle et de qui vous cherche.
  if (v.convoi.pour === 'joueur' && v.faction && v.state.player.reputation) {
    const rep = v.state.player.reputation;
    rep[v.faction] = (rep[v.faction] || 0) - CONTREBANDE.estime;
  }
  return pris;
}

/** Quand personne n'est là pour la ramasser, la marchandise part quand même. */
function perdreDeSaCharge(v) {
  let du = v.du;
  let perdu = 0;
  const dedans = Object.keys(v.convoi.cargaison || {})
    .filter((k) => (v.convoi.cargaison[k] || 0) > 0 && COMMODITIES[k]);
  for (const k of dedans) {
    if (du <= 0) break;
    const prix = COMMODITIES[k].prix || 1;
    const veut = Math.min(v.convoi.cargaison[k], Math.ceil(du / prix));
    if (veut <= 0) continue;
    v.convoi.cargaison[k] -= veut;
    du -= veut * prix;
    perdu += veut * prix;
  }
  return perdu;
}

export const REPONSES_BARRAGE = {
  laissez: {
    nom: 'on vous ouvre',
    dit: 'on est chez soi, ou l’on a de quoi montrer',
    // Et votre convoi devant votre propre poste : vous ne vous rançonnez pas
    // vous-même. Sans cette ligne, la table n'avait plus rien à répondre et
    // le convoi passait par la porte de derrière — juste, mais muet.
    peut: (v) => !v.faction || v.faction === v.convoi.faction
      || (v.convoi.pour === 'joueur' && !!v.poste && !!v.poste.votre)
      || (v.ctx.pactePassage && v.ctx.pactePassage(v.convoi.faction, v.faction)),
    faire: () => 0,
  },
  dedans: {
    nom: 'on a déjà payé à la frontière',
    dit: 'on est entré chez eux à la case d’avant',
    // **On paie en ENTRANT chez quelqu'un, pas à chaque pas.** Écrit d'abord
    // par case, le péage prenait deux pour cent de la cargaison dix fois de
    // suite : un convoi entre deux camps du joueur arrivait avec 57 unités sur
    // 80. Ce n'était pas un péage, c'était un barrage tous les kilomètres — un
    // prélèvement sans personne pour le tenir. La frontière, elle, a des
    // hommes dessus.
    peut: (v) => v.venantDe === v.faction,
    faire: () => 0,
  },
  fraude: {
    nom: 'on ne se présente pas',
    dit: 'la charge n’est pas déclarée, et l’on tente sa chance',
    // Avant tout ce qui paie : un contrebandier ne discute pas le tarif. Mais
    // pas devant son propre poste — `laissez` a déjà répondu — ni là où
    // personne ne tient la route.
    peut: (v) => !!v.convoi.fraude && !!v.faction,
    faire: (v) => passerEnFraude(v),
  },
  votre: {
    nom: 'votre poste perçoit',
    dit: 'la route est tenue par vous, et ce qui passe passe devant vous',
    // Une voie complète a besoin d'un revenu (TERRITOIRE.md, E5). Le joueur est
    // hors des registres du monde : ce que le convoi verse SORT du circuit de
    // son pays et entre dans sa bourse — la paire `debourser` + `sortirDehors`,
    // celle-là même qu'une ville emploie quand elle vous paie une livraison.
    peut: (v) => {
      // Le vôtre, et pas celui du conseil dont vous portez les couleurs : ces
      // postes-là sont payés sur le trésor du pays, et ce qu'ils encaissent
      // revient à ses villes, pas à votre bourse.
      const p = posteDe(v.state.world, v.convoi.regionId);
      if (!p || !p.votre) return false;
      // Et pas votre propre convoi : il passait devant votre barrière et
      // c'était la ville qui l'avait chargé qui réglait — vous achetiez, vous
      // faisiez passer, et le vendeur payait. Une pompe à monnaie.
      if (v.convoi.pour === 'joueur') return false;
      return !!v.de && (v.de.caisse || 0) >= v.du;
    },
    faire: (v) => payerAuJoueur(v),
  },
  bourse: {
    nom: 'le maître du convoi paie',
    dit: 'c’est son convoi, et il a de quoi dans la monnaie d’ici',
    // Un convoi du joueur n'a pas de ville derrière lui — souvent il part d'un
    // camp, qui n'a pas de caisse. Mais lui en a une. Il paie donc comme
    // n'importe quel expéditeur, dans la monnaie de ceux qui tiennent la case :
    // s'il ne l'a pas, il paiera en marchandise comme les autres.
    peut: (v) => v.convoi.pour === 'joueur' && !!v.place && !!monnaieDuPeage(v),
    faire: (v) => payerDeSaPoche(v),
  },
  argent: {
    nom: 'la ville règle',
    dit: 'celle qui a expédié paie, et l’argent change de pays',
    // `!!v.place` n'est pas une précaution : un barrage dont le drapeau n'a
    // plus une seule ville vivante n'a personne pour encaisser. Sans cette
    // condition, `convertirMasse` créditait la masse du receveur pendant que
    // `encaisser(null)` ne mettait l'argent nulle part — deux unités de masse
    // fabriquées à chaque passage. Trouvé par l'invariant comptable quand les
    // postes (T2) ont fait monter les barrages de moitié : le défaut existait
    // avant eux, il était simplement trop rare pour se voir.
    peut: (v) => !!v.place && !!v.de && (v.de.caisse || 0) >= v.du,
    faire: (v) => payerEnArgent(v),
  },
  nature: {
    nom: 'le barrage se sert',
    dit: 'à qui n’a pas de quoi payer, on prend de la marchandise',
    peut: (v) => !!v.place && valeurCargaison(v.convoi) > 0,
    faire: (v) => prendreEnNature(v),
  },
};

/**
 * Avec quoi le maître du convoi peut régler ce barrage.
 *
 * Un barrage accepte la monnaie étrangère : il la prend au cours, comme
 * n'importe qui. Exiger la leur et se servir dans la cargaison sinon revenait
 * à taxer en marchandise quiconque voyage loin de chez lui — c'est-à-dire tout
 * le monde. On prend la leur si on l'a, sinon celle dont on a le plus.
 */
function monnaieDuPeage(v) {
  const p = v.state.player;
  if (!p || !p.bourse) return null;
  if (solde(p, v.faction) >= v.du) return v.faction;
  let mieux = null;
  let plus = 0;
  for (const k of Object.keys(p.bourse)) {
    const t = taux(v.state.world, k, v.faction);
    if (!(t > 0)) continue;
    const vaut = solde(p, k) * t;
    if (vaut >= v.du && vaut > plus) { plus = vaut; mieux = k; }
  }
  return mieux;
}

/**
 * Le maître du convoi paie de sa poche. Sa bourse est hors de tout registre :
 * ce qui entre en caisse entre donc aussi dans la masse — la règle des deux.
 */
/**
 * Un convoi passe devant VOTRE poste. La ville qui l'a expédié règle sur sa
 * caisse, et l'argent quitte le circuit de son pays pour entrer dans votre
 * bourse — vous n'êtes dans aucun registre.
 */
function payerAuJoueur(v) {
  const world = v.state.world;
  const paye = debourser(v.de, v.du);
  if (!(paye > 0)) return 0;
  sortirDehors(world, v.de.faction, paye);
  gagner(v.state, paye, v.de.faction);
  // On ne tient PAS le compteur ici : `passerBarrage` appelle `noterAuPoste`
  // pour toute réponse qui prélève quelque chose. Le tenir des deux côtés
  // comptait chaque convoi deux fois — dans le chiffre montré au joueur, et
  // dans la seule grandeur sur laquelle un conseil décide (METHODE.md §12).
  return paye;
}

function payerDeSaPoche(v) {
  const m = monnaieDuPeage(v);
  if (!m) return 0;
  const t = m === v.faction ? 1 : taux(v.state.world, m, v.faction);
  const paye = regler(v.state, v.du / t, m);
  const recu = paye * t;
  if (!(recu > 0)) return 0;
  encaisser(v.state.world, v.place, recu);
  entrerDehors(v.state.world, v.faction, recu);
  return recu;
}

/**
 * La ville qui a expédié règle sur sa caisse, et le barrage encaisse.
 *
 * D'un pays à l'autre, les unités sorties et les unités entrées ne sont pas
 * les mêmes en nombre : c'est le taux. Le même chemin que le marché conclu à
 * l'arrivée d'un convoi — sans l'écart de change, parce qu'un barrage ne tient
 * pas un bureau.
 */
function payerEnArgent(v) {
  const world = v.state.world;
  const paye = debourser(v.de, v.du);
  if (!(paye > 0)) return 0;
  if (v.de.faction === v.faction) {
    encaisser(world, v.place, paye);
    return paye;
  }
  const recu = paye * taux(world, v.de.faction, v.faction);
  convertirMasse(world, v.de.faction, v.faction, paye, recu);
  encaisser(world, v.place, recu);
  return recu;
}

/**
 * À qui n'a pas de quoi payer, on prend de la marchandise — et elle va dans
 * les réserves de la ville qui tient la case, pas dans le vide. On se sert
 * dans ce qu'il y a de plus abondant, ce qui est la façon la plus simple de
 * dire « on prend ce qu'on peut porter ».
 */
function prendreEnNature(v) {
  const world = v.state.world;
  let pris = 0;
  let du = v.du;
  const dedans = Object.keys(v.convoi.cargaison || {})
    .filter((k) => (v.convoi.cargaison[k] || 0) > 0 && COMMODITIES[k])
    .sort((a, b) => (v.convoi.cargaison[b] * COMMODITIES[b].prix)
      - (v.convoi.cargaison[a] * COMMODITIES[a].prix));
  for (const k of dedans) {
    if (du <= 0) break;
    const prix = COMMODITIES[k].prix || 1;
    const veut = Math.min(v.convoi.cargaison[k], Math.ceil(du / prix));
    if (veut <= 0) continue;
    v.convoi.cargaison[k] -= veut;
    v.place.stock[k] = (v.place.stock[k] || 0) + veut;
    du -= veut * prix;
    pris += veut * prix;
  }
  return pris;
}

/**
 * Le convoi entre sur une case tenue : qu'est-ce qu'il fait ?
 *
 * On lit `REPONSES_BARRAGE` dans l'ordre et la première qui peut, fait. Rend
 * `{ reponse, montant }`. Le contexte porte ce que `caravanes.js` ne peut pas
 * citer — `pactes.js` vient après lui —, comme la bataille prêtée au camp.
 */
export function passerBarrage(state, car, regionId, ctx, log, venantDe) {
  const world = state.world;
  const r = world.regions[regionId];
  const poste = r && r.poste;
  // Ce qui tient la case, ou à défaut ce qui tient la route. Le poste du
  // joueur sans couleurs ne NOMME pas la case — « joueur » n'est pas un
  // drapeau —, mais il a des hommes dessus : c'est bien un barrage, et sans
  // cette seconde lecture il laissait tout passer.
  const faction = (r && r.controle) || (poste && poste.faction) || null;
  const v = {
    state,
    convoi: car,
    faction,
    poste,
    venantDe: venantDe || null,
    ctx: ctx || {},
    de: car.deId ? colonieParId(world, car.deId) : null,
    place: faction ? villeDuBarrage(world, faction, regionId) : null,
    du: 0,
  };
  if (v.de && v.de.ruine) v.de = null;
  v.du = Math.round(valeurCargaison(car) * PEAGE_CONVOI.part);
  for (const cle of Object.keys(REPONSES_BARRAGE)) {
    const rep = REPONSES_BARRAGE[cle];
    if (!rep.peut(v)) continue;
    const montant = rep.faire(v);
    // Le poste compte ce qu'il a vu passer (TERRITOIRE.md, T3) : c'est la seule
    // information qu'un conseil aura sur ce que vaut cette route.
    // Un contrebandier qui passe n'est vu de personne : le poste ne le compte
    // pas. Pris, en revanche, il est un passage comme un autre — et ce qu'on
    // lui a saisi est de la marchandise, pas de la monnaie (METHODE.md §12).
    const compte = cle !== 'laissez' && cle !== 'dedans'
      && (cle !== 'fraude' || v.pris);
    if (compte) {
      noterAuPoste(world, regionId, montant, cle === 'nature' || cle === 'fraude');
      // Et le pays qui paie s'en souvient : sans ce registre, personne ne peut
      // aller demander « combien pour qu'on nous laisse passer ? »
      // (TERRITOIRE.md, E2). Prêté par `ctx` — `pactes.js` lit ce module et ne
      // peut donc pas en être lu, même patron que `pactePassage` juste au-dessus.
      if (v.ctx.noterPeage) v.ctx.noterPeage((v.de && v.de.faction) || car.faction, faction, montant);
    }
    // Se faire prendre n'est pas un détail de comptabilité : ça se lit.
    if (cle === 'fraude' && log && v.pris) {
      log({
        type: 'peage',
        texte: `Fouillé au barrage ${drapeauDe(world, faction)
          ? drapeauDe(world, faction).genitif : 'du coin'} : la charge n’était pas `
          + 'déclarée. On y laisse la marchandise, et l’on saura qui vous êtes.',
        regionId,
        important: true,
      });
    }
    if (cle !== 'laissez' && cle !== 'fraude' && log && montant > 0) {
      // « Le vôtre » plutôt qu'un drapeau : le poste que le joueur a bâti de
      // ses mains n'en a pas forcément un derrière lui, et `drapeauDe` ne
      // rendait rien pour « joueur » — le tick des caravanes tombait au
      // premier convoi qui payait.
      const aQui = poste && poste.votre
        ? 'du vôtre' : `${drapeauDe(world, faction).genitif}`;
      log({
        type: 'peage',
        texte: `Barrage ${aQui} sur la piste : `
          + `${v.de ? v.de.nom : 'le convoi'} ${cle === 'nature'
            ? 'y laisse de la marchandise' : `y laisse ${Math.round(montant)}`}.`,
        regionId,
        discret: true,
      });
    }
    return { reponse: cle, montant, pris: cle === 'fraude' ? !!v.pris : undefined };
  }
  return null;
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
      // Le camp que ce convoi-ci visait, retrouvé par sa case. On lit
      // `state.camps` à la main plutôt que d'appeler `campsDe` : `base.js`
      // vient APRÈS ce module dans le bundle, et un module ne cite pas ses
      // successeurs. Les convois d'avant l'adresse n'ont pas de `versRegion` —
      // ils retombent sur le camp habité, ce qu'ils ont toujours fait.
      const camps = Array.isArray(state.camps) && state.camps.length
        ? state.camps : [state.base];
      const chez = (car.versRegion != null
        && camps.find((c) => c && c.fonde && c.regionId === car.versRegion)) || state.base;
      for (const k of Object.keys(car.cargaison)) {
        chez.stock[k] = (chez.stock[k] || 0) + car.cargaison[k];
      }
      if (log) {
        log({
          type: 'bourse',
          texte: `Le convoi arrive : ${Object.keys(car.cargaison).map(
            (k) => `${Math.round(car.cargaison[k])} ${COMMODITIES[k].nom.toLowerCase()}`
          ).join(', ')} dans l’entrepôt${chez.nom ? ` de ${chez.nom}` : ''}.`,
          regionId: car.regionId,
          important: true,
        });
      }
    } else {
      // La ville qui vous a acheté règle sur sa caisse — et **la masse bouge
      // exactement de ce que la caisse a bougé** (`monnaie.js`, la règle des
      // deux). C'est ce dernier point qui manquait : on faisait `gagner` puis
      // `debourser` sans jamais `sortirDehors`, si bien que le pays continuait
      // de déclarer émis un argent parti dans une poche que le registre ne
      // connaît pas. Mesuré au moment de l'écrire : 179 crédits d'écart pour
      // une seule vente de cent ferrailles. La vente en ville au comptant
      // (`economy.js`) appliquait la règle depuis toujours ; le convoi, non.
      //
      // Et l'on n'encaisse que ce qu'elle a. L'ancien commentaire assumait de
      // vous payer en entier « le crédit qu'elle vous consent n'est pas
      // modélisé » — mais ce crédit-là fabriquait de la monnaie, ce qu'aucune
      // approximation ne justifie. Le patron du monde est déjà l'autre :
      // `qteSolvable` fait qu'un marchand ne charge pas pour une ville qui ne
      // peut pas régler.
      const place = colonieParId(world, car.versId);
      const paye = debourser(place, car.paiement || 0);
      if (place) sortirDehors(world, place.faction, paye);
      gagner(state, paye);
      if (log) {
        log({
          type: 'bourse',
          texte: `Livraison honorée : ${paye} ${signeIci(state)} encaissés.`
            + (paye < (car.paiement || 0)
              ? ` ${place ? place.nom : 'La ville'} n’avait pas de quoi solder `
                + `les ${car.paiement} convenus.`
              : ''),
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
    texte: `Une caravane ${drapeauDe(state.world, car.faction).genitif} est pillée en ${nomRegion(world, car.regionId)}${par ? ` par ${par}` : ''}.`,
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
    if (!car.versBase) return vivante(colonieParId(state.world, car.versId));
    // Le camp visé tient-il encore ? Un camp abandonné ne reçoit plus rien —
    // et sans `versRegion` (convois d'avant l'adresse), on s'en remet au camp
    // habité, comme avant.
    if (car.versRegion == null) return !!(state.base && state.base.fonde);
    const camps = Array.isArray(state.camps) && state.camps.length
      ? state.camps : [state.base];
    return camps.some((c) => c && c.fonde && c.regionId === car.versRegion);
  }
  return vivante(colonieParId(state.world, car.versId));
}

/** Le dé d'un convoi : dérivé de son nom, posé une fois, jamais tiré du sac. */
function avecDe(world, car) {
  car.rngEtat = grainDe(world.graine, 'convoi', car.id);
  return car;
}

/** Une heure de route pour toutes les caravanes. */
export function tickCaravanes(state, log, ctx) {
  const world = state.world;
  if (!world.caravanes) world.caravanes = [];

  for (const car of world.caravanes.slice()) {
    if (!world.caravanes.includes(car)) continue;
    // Chaque convoi a son propre dé, posé à son départ et rescellé à chaque
    // heure — comme pour les villes. Pas le sac commun, et pas non plus une
    // graine redérivée à chaque tour : hacher une chaîne par convoi et par
    // heure coûtait un tiers du tick, et la garde de vitesse l'a refusé.
    const rng = new Rng(car.rngEtat);

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

      pillee(state, car, drapeauDe(state.world, armee.faction).nom, log);
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

    // Le dé du convoi est rescellé ici : tout ce qui tire est passé, et les
    // sorties d'avant ont retiré le convoi du monde — il n'a plus de dé à
    // garder.
    car.rngEtat = rng.save();

    car.progres += 1;
    if (car.progres < HEURES_PAR_CASE) continue;
    car.progres = 0;

    if (car.etape >= car.route.length) { arriver(state, car, log); continue; }
    // D'où l'on vient : c'est ce qui dit si l'on ENTRE chez quelqu'un ou si
    // l'on continue de le traverser. Relevé avant de bouger.
    const veniat = world.regions[car.regionId] && world.regions[car.regionId].controle;
    car.regionId = car.route[car.etape];
    // Entrer sur les terres d'un autre drapeau se paie (TERRITOIRE.md, B1) :
    // ce que le barrage prélève entre chez celui qui tient la case — de la
    // poche du maître du convoi, de la caisse de la ville qui a expédié, ou de
    // la cargaison quand ni l'un ni l'autre ne peut.
    passerBarrage(state, car, car.regionId, ctx, log, veniat);
    // Le commerce trace les routes mieux que personne : c'est lui qui passe.
    damer(world, car.regionId, 1.6);
    car.etape++;
    if (car.etape >= car.route.length) arriver(state, car, log);
  }

  // Nouveau départ de temps en temps
  // Les départs spontanés ont leur propre dé, dérivé de l'heure : ils
  // concernent le monde entier, pas un convoi en particulier.
  if (state.temps % 9 === 0) {
    tenterDepart(state, new Rng(grainDe(world.graine, 'depart', state.temps)), log);
  }
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
  // `departsDuReseau` ouvre son propre flux par réseau : il n'a plus besoin
  // qu'on lui en passe un.
  if (!state.world.sansDeparts && state.temps % 8 === 0) departsDuReseau(state, null, log);
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
  bande.nom = `Escorte ${drapeauDe(state.world, car.faction).genitif}`;

  log({
    type: 'caravane',
    texte: `Embuscade sur une caravane ${drapeauDe(state.world, car.faction).genitif}.`,
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

  if (car.faction && car.faction !== 'essaim') {
    // L3 (MEMOIRE.md, décision n°2 du propriétaire : « pas vu, pas su ») —
    // qui a vu ? Des rescapés, une ville sur la case, la région tenue par la
    // faction, ou une de ses colonnes à une case. Avec témoin : le nom
    // voyage. Sans : votre nom n'est JAMAIS prononcé — mais la ville qui
    // attendait le convoi remarque son absence à l'heure où il aurait dû
    // arriver, sans accuser personne, et la route se fait mal famée (il
    // reste des traces : c'est par elles que l'endroit se sait dangereux).
    const rid = car.regionId;
    const colIci = colonieDe(state.world, rid);
    const temoins = (res.survivantsB || 0) > 0
      || !!colIci
      || state.world.regions[rid].controle === car.faction
      || state.world.armees.some((a) => a.faction === car.faction
        && distance(a.regionId, rid) <= 1);
    const effets = [];
    if (temoins) {
      const suVille = (col) => state.temps + Math.round(
        CANAUX.rumeur.base + CANAUX.rumeur.parCase * distance(rid, col.regionId));
      effets.push({
        faction: car.faction, delta: -22,
        su: colIci && colIci.faction === car.faction
          ? state.temps
          : state.temps + delaiVersFaction(state, 'rumeur', rid, car.faction),
        dit: `${drapeauDe(state.world, car.faction).nom} sa${drapeauDe(state.world, car.faction).pluriel ? 'vent' : 'it'} `
          + `désormais qui a pillé leur caravane.`,
      });
      // Ceux des deux bouts s'en souviennent nommément, quand ils l'apprennent.
      for (const id of [car.deId, car.versId]) {
        const col = id && colonieParId(state.world, id);
        if (col) effets.push({ ville: col.id, memoire: 'pillage', delta: -18, su: suVille(col) });
      }
    } else {
      const arr = car.versId && colonieParId(state.world, car.versId);
      const attendue = state.temps
        + (arr ? distance(rid, arr.regionId) * 4 : 24) + 24;
      if (arr) {
        effets.push({
          ville: arr.id, memoire: 'disparition', su: attendue,
          dit: `À ${arr.nom}, on attendait un convoi qui n'arrivera jamais. La route se fait mal famée.`,
        });
      }
      effets.push({ region: rid, danger: 0.05, su: attendue });
    }
    commettre(state, {
      type: 'pillage', regionId: rid, t: state.temps, effets, anonyme: !temoins,
    });
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
