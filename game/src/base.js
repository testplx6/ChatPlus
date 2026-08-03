// L'avant-poste : files de construction et de recherche à la OGame, chaîne de
// production contrainte par l'énergie, stockage plafonné, raids à encaisser.

import {
  BUILDINGS, RESEARCH, COMMODITY_KEYS, COMMODITIES, METIERS, METIER_KEYS, BIOMES,
  FACTIONS,
} from './data.js';
import { loisDe } from './lois.js';
import { comp, gagnerXp, estDebout, XP_PRATIQUE } from './characters.js';
import { groupes, groupeActif } from './groupes.js';
import { garnison } from './allegeance.js';
import { noterArgent } from './rapport.js';

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
    // Ce que l'entrepôt n'a pas pu prendre, cumulé. L'écrêtage était muet.
    gaspille: 0,
    gaspilleJour: 0,
    dernierGaspillage: -999,
    // Les habitants se placent eux-mêmes dans les métiers ouverts. Voir
    // `embaucher` : sans ça, un avant-poste de quarante habitants tourne avec
    // personne affecté à rien.
    autoEmploi: true,
    majEmploi: -999,
    // L'entrée de `world.colonies` qui donne à ce camp une existence pour les
    // autres, une fois qu'il compte. Voir `reconnaitreAvantPoste`.
    colonieId: null,
    majVitrine: -999,
    // Laisser les colporteurs traiter avec l'intendance. Voir `visiteMarchand`.
    commerce: true,
    dernierMarchand: -9999,
    // Combien s'y sont arrêtés depuis le début. Le journal est plafonné à
    // quatre cents lignes : on ne peut pas l'utiliser pour compter quoi que ce
    // soit sur la durée d'une partie.
    marchands: 0,
    // Un avant-poste n'est pas un entrepôt avec des murs : des gens finissent
    // par s'y installer, y travailler, et y manger.
    pop: 0,
    moral: 60,
    recrues: 0,
  };
}

/**
 * Ce que le campement lui-même vaut, avant toute construction.
 *
 * C'était le trou du jeu : fonder un avant-poste ne rendait rien tant qu'on n'y
 * avait pas monté trois bâtiments, et on ne pouvait pas se les payer parce
 * qu'on dépensait tout en nourriture. On planquait donc des matériaux dans un
 * trou pendant des semaines sans contrepartie, et le banc était formel — mieux
 * valait ne pas s'installer du tout.
 *
 * Un campement, même vide, c'est un toit et un dépôt. Le toit se paie ici, le
 * dépôt existait déjà (huit cents unités de stock sans le moindre entrepôt).
 */
export const ABRI_CAMP = 1.7;
export const ABRI_PAR_BARAQUEMENT = 0.22;

/** Le facteur de récupération d'un repos pris dans cette région. */
export function abriDe(state, regionId) {
  const base = state.base;
  if (base && base.fonde && base.regionId === regionId) {
    return ABRI_CAMP + niveau(base, 'baraquement') * ABRI_PAR_BARAQUEMENT;
  }
  // À partir du grade de Lieutenant, les villes des siens vous logent. C'est le
  // pendant du campement pour qui a choisi de servir plutôt que de bâtir.
  if (garnison(state, regionId)) return ABRI_CAMP;
  return 1;
}

/** Combien de personnes l'avant-poste peut loger et nourrir. */
/** Ce qu'on tire d'une chaîne quand personne ne fournit de courant. */
export const SOCLE_MANUEL = 0.4;

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

/**
 * Ce dont un avant-poste a besoin, dans l'ordre où il en a besoin.
 *
 * Manger d'abord — un cuisinier fait durer les vivres, un cultivateur en
 * produit. Puis de quoi bâtir : le récoltant ramasse la région, le bâtisseur
 * monte les chantiers. Puis se défendre. Puis transformer, ce qui suppose
 * d'avoir déjà le reste.
 */
const ORDRE_EMBAUCHE = [
  'cultivateur', 'cuisinier', 'recoltant', 'batisseur', 'magasinier',
  'milicien', 'garde', 'mecanicien', 'fondeur', 'raffineur', 'machiniste',
  'infirmier', 'operateur',
];

/**
 * Les gens se placent eux-mêmes.
 *
 * Un avant-poste de trente-neuf habitants tournait avec `postes: {}` — personne
 * affecté à rien, jamais, sauf si le joueur cliquait treize fois. Ce n'est pas
 * une simulation de colonie, c'est un tableur : des gens qui vivent quelque
 * part trouvent du travail sans qu'on le leur dise. Le joueur garde la main —
 * l'interrupteur se coupe — mais par défaut la vie s'organise toute seule.
 *
 * L'ordre de priorité fait le reste : on ne met personne à la fonderie tant
 * qu'il manque un cultivateur, parce qu'on ne mange pas de l'alliage.
 */
export function embaucher(base) {
  if (base.autoEmploi === false) return;
  const postes = {};
  let reste = Math.floor(base.pop || 0);
  for (const k of ORDRE_EMBAUCHE) {
    if (reste <= 0) break;
    const places = placesMetier(base, k);
    if (places <= 0) continue;
    // On ne remplit pas un métier à fond avant de pourvoir le suivant : une
    // colonie qui met tout le monde aux cultures ne bâtit plus rien. On y va
    // par tiers, et l'on repasse.
    const pris = Math.min(places, Math.max(1, Math.ceil(places / 2)), reste);
    postes[k] = pris;
    reste -= pris;
  }
  // Second passage : ce qui reste complète ce qui est ouvert, dans le même ordre.
  for (const k of ORDRE_EMBAUCHE) {
    if (reste <= 0) break;
    const places = placesMetier(base, k);
    const encore = Math.min(places - (postes[k] || 0), reste);
    if (encore > 0) { postes[k] = (postes[k] || 0) + encore; reste -= encore; }
  }
  base.postes = postes;
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

/**
 * Ce qu'il faut pour planter le premier piquet.
 *
 * Il y avait cinq composants là-dedans, et c'est ce détail qui rendait tout le
 * jeu bancal : les composants ne se ramassent presque nulle part, il faut donc
 * les acheter, donc avoir des crédits, donc en gagner — alors que les trois
 * quarts des recettes d'une escouade itinérante partent en nourriture, et que
 * la seule façon de produire sa nourriture est justement d'avoir un
 * avant-poste. On ne pouvait pas s'offrir la chose qui réglait le problème
 * qu'on avait, et le banc l'a chiffré : zéro avant-poste fondé sur vingt-quatre
 * parties de quatre mille heures.
 *
 * Le premier campement se paie donc en ferraille, et en ferraille seulement :
 * c'est ce qu'une escouade de fouilleurs a toujours dans le dos. Le polymère et
 * les composants restent indispensables à tout ce qui vient après — hydroponie,
 * atelier, antenne, infirmerie — et c'est là qu'ils ont un sens : ils gardent le
 * développement, pas la survie.
 */
export const COUT_FONDATION = { ferraille: 110 };

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

/**
 * Ce qui manque pour bâtir, marchandise par marchandise.
 *
 * Le bouton était grisé et disait quand même « Construire niv. 1 » : on
 * regardait douze bâtiments inaccessibles sans savoir lequel était à portée ni
 * de quoi. Un refus qui ne dit pas ce qui manque n'apprend rien.
 */
export function manquePour(base, key) {
  const cout = coutBatiment(base, key);
  const out = [];
  for (const k of Object.keys(cout)) {
    const d = cout[k] - (base.stock[k] || 0);
    if (d > 0) out.push({ key: k, qte: Math.ceil(d) });
  }
  return out;
}

/**
 * Ce qu'un niveau de plus rapporte, en clair et en chiffres du moteur.
 *
 * La description d'un bâtiment dit ce qu'il est (« bacs, treuils, brouettes »),
 * jamais ce qu'il change. Or c'est la seule question du joueur : est-ce que ça
 * me nourrit, est-ce que ça me loge, est-ce que ça me fait récolter ? Les
 * facteurs viennent des mêmes constantes que `tickBase` — si la production
 * change, cette phrase change avec.
 */
export function apportBatiment(base, key, state) {
  const n = niveau(base, key) + 1;
  switch (key) {
    case 'baraquement':
      return `Loge 9 habitants de plus (${populationMax(base)} → ${populationMax(base) + 9}).`;
    case 'hydroponie':
      return `Transforme la biomasse en vivres, ~${(1.25 * n * 0.9).toFixed(1)} rations/h à plein régime, `
        + 'et loge 4 personnes de plus.';
    case 'bassins': {
      const gain = 1 + niveauRech(base, 'cultures') * 0.18;
      const reg = state && state.world.regions[base.regionId];
      const y = (reg && BIOMES[reg.biome] && BIOMES[reg.biome].yields) || {};
      return `~${(0.55 * n * gain).toFixed(2)} biomasse/h à plein régime, où que soit le camp.`
        + (y.biomasse ? '' : ' Ici, c’est la seule source possible.');
    }
    case 'halle': {
      // Ce que *cette* région donne, avant de dépenser soixante-cinq ferrailles
      // pour découvrir qu'elle ne donne pas de biomasse. Une friche se ramasse
      // très bien, mais on n'y mange pas.
      const reg = state && state.world.regions[base.regionId];
      const y = (reg && BIOMES[reg.biome] && BIOMES[reg.biome].yields) || null;
      const liste = y ? Object.keys(y).map((k) => COMMODITIES[k].nom.toLowerCase()).join(', ') : null;
      return 'Ramasse la région toute seule, sans l’escouade et sans épuiser la case.'
        + (liste ? ` Ici : ${liste}.` : '')
        + (y && !y.biomasse ? ' Pas de biomasse ici : l’hydroponie n’aura rien à transformer.'
          : ' C’est ce qui alimente l’hydroponie.');
    }
    case 'generateur':
      return `+${BUILDINGS.generateur.energie * n} d’énergie. Sans courant, les chaînes tournent au ralenti.`;
    case 'entrepot':
      return 'Plus de place. Ce qui ne rentre pas dans l’entrepôt est perdu pour de bon.';
    case 'cantine':
      return 'Jusqu’à un tiers de vivres en moins pour les mêmes bouches, et du moral.';
    case 'fonderie': return 'Minerai → alliage, la première pièce de tout ce qui se fabrique.';
    case 'raffinerie': return 'Polymère → carburant, ce que brûle le générateur.';
    case 'atelier': return 'Alliage + polymère → composants, qu’on ne trouve presque nulle part.';
    case 'infirmerie': return 'Soigne les vôtres au repos et fabrique des medkits.';
    case 'antenne': return 'Ouvre la recherche, l’école maison, et voit plus loin.';
    case 'mur': return `+${Math.round(22 * n)} de défense contre les raids.`;
    case 'poste': return 'Prévenu à temps d’un raid, plutôt que réveillé par lui.';
    default: return BUILDINGS[key].desc;
  }
}

/**
 * Ce qu'il reste à faire, exactement, pour produire sa biomasse sur place.
 *
 * Trois portes en enfilade — l'antenne, la recherche, les bassins — et une
 * seule intéresse le joueur : la prochaine. Nommer la dernière quand il manque
 * la première, c'est envoyer quelqu'un chercher un livre dans une bibliothèque
 * qu'il n'a pas encore bâtie.
 */
function prochainPasBassins(base) {
  if (niveau(base, 'antenne') < 1) {
    return 'Pour en faire pousser ici il faut chercher les Cultures closes, '
      + 'et l’on ne cherche rien sans antenne : montez-la d’abord.';
  }
  if (niveauRech(base, 'cultures') < 1) {
    return 'Lancez la recherche Cultures closes : elle ouvre les bassins, '
      + 'qui donnent de la biomasse n’importe où.';
  }
  return 'Montez des bassins de culture : ils en produisent quoi qu’en dise le terrain.';
}

/**
 * La chaîne de l'autonomie, étape par étape, avec où l'on en est.
 *
 * Un avant-poste tout neuf montre douze bâtiments dans l'ordre du fichier de
 * données, et rien ne dit lesquels forment la boucle qui rend un camp vivable.
 * On en concluait — à raison — qu'il n'y avait « rien pour récolter, rien pour
 * l'autonomie », alors que les deux existent et sont juste noyés.
 */
export function chaineAutonomie(state) {
  const base = state.base;
  if (!base || !base.fonde) return [];
  const bio = Math.floor(base.stock.biomasse || 0);
  const rations = Math.floor(base.stock.rations || 0);
  const carburant = Math.floor(base.stock.carburant || 0);
  const reg = state.world.regions[base.regionId];
  const rend = (reg && BIOMES[reg.biome] && BIOMES[reg.biome].yields) || {};
  const donne = Object.keys(rend);
  const donneBiomasse = (rend.biomasse || 0) > 0;
  const halle = niveau(base, 'halle');
  const hyd = niveau(base, 'hydroponie');
  const bassins = niveau(base, 'bassins');
  const places = populationMax(base);
  // Deux façons d'avoir de la biomasse : la région en donne, ou l'on en fait
  // pousser. Tant qu'il n'y avait que la première, l'alerte d'un camp planté
  // dans une friche était un constat sans issue — « vous n'en aurez jamais » —
  // ce qui est la pire chose qu'un tableau de bord puisse dire.
  const source = donneBiomasse || bassins > 0;

  // Un maillon n'est pas « en place » parce que le bâtiment est monté : il l'est
  // quand il *produit*. La première version comptait des bâtiments, et affichait
  // 4/4 en vert sur un camp planté dans une friche — qui ne donne ni biomasse ni
  // rations, donc n'attire personne, à jamais. Un tableau de bord qui coche des
  // cases sans regarder les flux ment mieux que le silence.
  return [
    {
      key: 'halle',
      titre: 'Ramasser',
      fait: (halle > 0 && donne.length > 0) || bassins > 0,
      etat: halle === 0 && bassins === 0
        ? 'le camp ne ramasse rien : tout doit être porté à dos d’homme'
        : [
          halle > 0 ? `halle niv. ${halle} · ici on ramasse ${donne.map(
            (k) => COMMODITIES[k].nom.toLowerCase()).join(', ')}` : null,
          bassins > 0 ? `bassins niv. ${bassins} · de la biomasse quoi qu’en dise le terrain` : null,
        ].filter(Boolean).join(' · '),
      // Ce que le biome refuse de donner est la chose la plus utile à savoir, et
      // elle n'apparaissait nulle part. On dit maintenant quoi y faire — et la
      // seule étape suivante, pas le programme complet : « cherchez les
      // Cultures closes » était un faux conseil tant qu'il manquait l'antenne
      // sans laquelle on ne cherche rien.
      alerte: source ? null
        : `${BIOMES[reg.biome].nom} ne donne pas de biomasse. ${prochainPasBassins(base)}`,
    },
    {
      key: 'hydroponie',
      titre: 'Manger',
      fait: hyd > 0 && (bio > 0 || rations > 0),
      etat: hyd === 0
        ? 'la biomasse ne devient pas de la nourriture'
        : `hydroponie niv. ${hyd} · ${bio} biomasse, ${rations} rations en réserve`,
      alerte: hyd > 0 && bio === 0 && rations === 0
        ? `les bacs tournent à vide : sans biomasse, aucune ration ne sort.${
          source ? '' : ' Ni le terrain ni aucun bassin n’en produit ici.'}`
        : null,
    },
    {
      key: 'baraquement',
      titre: 'Loger',
      // Des lits ne suffisent pas : personne ne s'installe dans un camp sans
      // réserve de vivres. Voir `tickBase`, où l'attrait est proportionnel à la
      // réserve — à zéro ration, le tirage ne tombe jamais, quel que soit le
      // nombre de places.
      fait: places > 0 && rations > 0,
      etat: places === 0
        ? 'aucune place pour dormir : personne ne s’installera jamais'
        : `${Math.round(base.pop || 0)} habitant(s) sur ${places} places`,
      alerte: places > 0 && rations === 0
        ? 'des lits, mais pas un vivre en réserve : on ne s’installe pas dans un camp '
          + 'où l’on ne mange pas. Déposez-y des rations, ou faites-en pousser.'
        : null,
    },
    {
      key: 'generateur',
      titre: 'Alimenter',
      fait: niveau(base, 'generateur') > 0 && carburant > 0,
      etat: niveau(base, 'generateur') > 0
        ? `${Math.round(energie(base).prod)} produits pour ${Math.round(energie(base).conso)} consommés`
        : 'sans courant, les chaînes tournent au ralenti (elles tournent quand même)',
      alerte: niveau(base, 'generateur') > 0 && carburant === 0
        ? 'plus de carburant : le générateur est à l’arrêt. Il s’en raffine à partir du '
          + 'polymère, ou s’en achète en ville.'
        : null,
    },
  ];
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

/**
 * Le noyau qu'on tient sans effort — plus un baraquement où les loger.
 *
 * Ce n'est plus un plafond : rien n'interdit de mener trente personnes. C'est
 * le nombre au-delà duquel la cohésion commence à se déliter, et avec elle le
 * rendement du travail et la force au combat. Voir `plafondCohesion` dans
 * groupes.js. Le baraquement ne débloque plus des places : il élargit ce qu'on
 * arrive à tenir ensemble.
 */
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
  // Certains bâtiments s'inventent avant de se bâtir.
  if (b.recherche && niveauRech(base, b.recherche) < 1) {
    return { ok: false, motif: `Il faut d’abord la recherche ${RESEARCH[b.recherche].nom}.` };
  }
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
  // On refonde à neuf. La première version ne remettait à zéro que les
  // bâtiments : un second camp héritait des habitants du premier, de ses
  // postes, de son entrepôt et — le pire — de son `colonieId`, c'est-à-dire du
  // dossier d'une ville qui appartenait à quelqu'un d'autre ou n'était plus
  // qu'un tas de pierres. Ce qu'on avait ne se transporte pas.
  base.colonieId = null;
  base.file = [];
  base.fileRech = [];
  base.postes = {};
  base.pop = 0;
  base.gaspille = 0;
  base.derniereAttaque = -999;
  base.majVitrine = -999;
  base.majEmploi = -999;
  log({ type: 'base', texte: `Avant-poste fondé. Ici, au moins, c’est chez nous.`, regionId: base.regionId });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Production horaire
// ---------------------------------------------------------------------------

/**
 * Ranger une production dans l'entrepôt, et retenir ce qui n'y tient pas.
 *
 * L'écrêtage était silencieux : un entrepôt plein jetait la production de
 * l'hydroponie, de la fonderie et de la raffinerie sans que rien ne l'indique
 * nulle part. On l'a découvert en cherchant pourquoi un test échouait, pas en
 * jouant — et un joueur, lui, aurait simplement vu ses cultures ne rien rendre
 * sans jamais comprendre pourquoi. Ce qui se perd doit se dire.
 */
function ajouter(base, key, qte) {
  if (qte <= 0) return 0;
  const libre = capaciteStock(base) - totalStock(base);
  const reel = Math.max(0, Math.min(qte, libre));
  base.stock[key] = (base.stock[key] || 0) + reel;
  if (qte - reel > 0.001) base.gaspille = (base.gaspille || 0) + (qte - reel);
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
  const gaspilleAvant = base.gaspille || 0;
  const t0 = state.temps;
  const rng = ctx.rng;
  const rech = base.recherche;
  // N'importe quel groupe présent fait avancer les chantiers. Test direct
  // plutôt que `filter` : c'est du travail par heure de jeu, pas par clic.
  let surPlace = false;
  for (const g of state.player.groupes) if (g.regionId === base.regionId) { surPlace = true; break; }

  // Les gens se placent eux-mêmes, une fois par jour de jeu : plus souvent
  // serait du travail pour rien, et l'on ne change pas de métier toutes les
  // heures.
  if (base.autoEmploi !== false && t0 - (base.majEmploi || -999) >= 24) {
    base.majEmploi = t0;
    embaucher(base);
  }
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
  // La cantine : manger assis, à heure fixe, avec quelqu'un qui compte les
  // portions. Jusqu'à un tiers de vivres en moins pour les mêmes bouches — et
  // c'est le seul bâtiment dont l'effet se voit sur le moral autant que sur le
  // stock.
  const cant = niveau(base, 'cantine');
  const economie = cant > 0
    ? 1 - Math.min(0.33, cant * 0.055 * M.cuisinier)
    : 1;
  const besoinPop = (base.pop || 0) * 0.014 * economie;
  if (base.pop > 0) {
    const servi = Math.min(besoinPop, rationsDispo);
    base.stock.rations = Math.max(0, rationsDispo - servi);
    const satiete = besoinPop > 0 ? servi / besoinPop : 1;
    if (satiete < 0.75) {
      base.moral = Math.max(0, base.moral - 0.15);
      // On s'en va avant de mourir de faim : un habitant qui part est un
      // habitant qui reviendra peut-être, et un camp vidé par la disette n'est
      // pas un charnier.
      if (rng.chance(0.012)) base.pop = Math.max(0, base.pop - 1);
    } else {
      base.moral = Math.min(100, base.moral + 0.05 + (cant > 0 ? 0.03 * M.cuisinier : 0));
    }
  }
  // Ce qui attire du monde : de quoi manger *en réserve*, un toit, et la paix.
  //
  // C'était un dé plat de 0,012 par heure, conditionné par un seuil de vivres
  // franchi ou non. Un camp qui vivait au jour le jour ratait donc tous ses
  // tirages, et le banc l'a chiffré : sur soixante parties, quarante
  // avant-postes fondés, quatorze niveaux de bâtiment en moyenne — et deux
  // habitants et demi. La voie du colon plafonnait à un hangar gardé par
  // personne.
  //
  // Le taux suit maintenant l'abondance, parce que c'est elle qui se sait sur
  // les pistes : une réserve de six jours par tête, un moral tenu, des lits.
  // Douze jours de réserve par tête, pas six : mesuré à six, le camp attirait
  // du monde sur une aisance de passage, puis les affamait au premier creux —
  // cinq habitants, puis zéro, et le moral à trente-trois. On ne s'installe pas
  // quelque part parce qu'on y a mangé une fois.
  const reserve = Math.min(1, rationsDispo / Math.max(1, (base.pop + 1) * 12));
  const attrait = reserve * (0.4 + 0.6 * (base.moral / 100))
    * (1 + niveau(base, 'baraquement') * 0.2);
  if (base.pop < maxPop && rng.chance(0.022 * attrait)) {
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
  // Ce qui se fait à la main, et ce qui ne se fait pas.
  //
  // Fondre du minerai, assembler un composant, raffiner du polymère : sans
  // courant, rien. Faire pousser et ramasser, en revanche, se fait avec des
  // bras. Tant que ces deux chaînes-là s'arrêtaient net faute de carburant, la
  // seule façon de produire sa nourriture passait par un générateur, donc par
  // du carburant acheté en ville, donc par des crédits qu'on n'avait pas parce
  // qu'on achetait à manger. L'énergie les rend rapides ; elle ne les rend plus
  // possibles.
  const aLaMain = Math.max(SOCLE_MANUEL, r);

  const hyd = niveau(base, 'hydroponie');
  if (hyd > 0) {
    const bio = consommer(base, 'biomasse', 1.25 * hyd * aLaMain * mo * M.cultivateur);
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
  // La halle : jusqu'ici l'avant-poste ne savait que transformer ce qu'on lui
  // apportait. Il ramasse maintenant sa propre région, au rendement du biome et
  // sans épuiser la case — c'est une exploitation, pas une fouille.
  const halle = niveau(base, 'halle');
  if (halle > 0) {
    const regHalle = state.world.regions[base.regionId];
    const y = BIOMES[regHalle.biome].yields || {};
    // Ramasser se fait avec des bras, et la halle en était pourtant punie :
    // elle passait par `aLaMain`, qui vaut 0,4 sans courant. Un camp qui n'a
    // pas encore de générateur — c'est-à-dire tout camp de moins de mille
    // heures — récoltait donc à quarante pour cent, soit 0,07 ferraille par
    // heure. Le banc a chiffré ce que ça donne : soixante parties, quarante
    // avant-postes fondés, **aucun** assez développé pour que le monde le
    // remarque. Un avant-poste ne peut pas dépendre de ce que l'escouade lui
    // rapporte à dos d'homme ; sinon la voie du colon n'est qu'un dépôt.
    //
    // Le courant aide encore — un treuil vaut mieux qu'un dos — mais il ne
    // conditionne plus la récolte.
    const bras = 0.75 + 0.45 * r;
    const taux = 1.1 * halle * bras * mo * M.recoltant * regHalle.richesse
      * (ctx.climat ? 1 + (ctx.climat.rendement('ferraille') - 1) * 0.6 : 1);
    for (const k of Object.keys(y)) ajouter(base, k, y[k] * taux);
  }

  // Les bassins : de la biomasse qui ne demande rien au terrain.
  //
  // Volontairement plus maigre qu'un bon biome — un marais rend une biomasse
  // par heure à la halle — parce que l'intérêt des bassins n'est pas le
  // rendement, c'est qu'ils marchent partout. Ils tiennent au courant plus que
  // la halle : une pompe et des lampes ne se remplacent pas par des bras.
  const bas = niveau(base, 'bassins');
  if (bas > 0) {
    const gain = 1 + niveauRech(base, 'cultures') * 0.18;
    ajouter(base, 'biomasse', 0.55 * bas * (0.4 + 0.6 * r) * mo * M.bassinier * gain);
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
  // Le poste de garde ne fait pas gagner les combats — c'est le mur et les
  // miliciens qui s'en chargent. Il fait voir venir : moins de raids aboutissent
  // par surprise, et ceux qui passent trouvent les stocks déjà rentrés.
  const guet = niveau(base, 'poste') * M.garde;
  const vigilance = 1 / (1 + guet * 0.22);
  if (t - base.derniereAttaque > 72 && rng.chance(0.0016 * (1 + reg.danger * 4) * vigilance)) {
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
      const sauve = Math.min(0.7, guet * 0.13);
      for (const k of COMMODITY_KEYS) {
        const pris = Math.round((base.stock[k] || 0) * rng.range(0.15, 0.4) * (1 - sauve));
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

  // Ce que l'entrepôt n'a pas pu prendre. On ne le dit pas à chaque heure — ce
  // serait insupportable — mais dès que la perte devient une vraie perte, et
  // pas plus d'une fois par jour de jeu.
  const perdu = (base.gaspille || 0) - gaspilleAvant;
  if (perdu > 0.001) {
    base.gaspilleJour = (base.gaspilleJour || 0) + perdu;
    if (t - (base.dernierGaspillage || -999) >= 24 && base.gaspilleJour >= 8) {
      base.dernierGaspillage = t;
      log({
        type: 'entrepot',
        texte: `L’entrepôt déborde : ${Math.round(base.gaspilleJour)} unités produites `
          + `n’ont nulle part où aller. Agrandissez, ou consommez.`,
        regionId: base.regionId,
        important: true,
      });
      base.gaspilleJour = 0;
    }
  }

  // La reconnaissance ne se fait plus toute seule : c'est au joueur de décider
  // s'il veut exister pour les autres. Voir `peutReconnaitre`.
  if (base.colonieId && t - (base.majVitrine || -999) >= 24) {
    base.majVitrine = t;
    synchroniserVitrine(state);
    // Et l'on paie ce qu'on doit à ceux dont on porte les couleurs.
    preleverImpot(state, log);
  }
  // Les colporteurs s'arrêtent, d'autant plus souvent que la route est faite.
  // C'est ce qui détache la voie du colon des jambes de quatre personnes.
  if (t % 12 === 0) visiteMarchand(state, rng, log);

  return { energie: e, gaspille: perdu };
}

// ---------------------------------------------------------------------------
// Quand un camp devient un lieu
// ---------------------------------------------------------------------------

/**
 * À partir de combien d'habitants le reste du monde cesse de vous ignorer.
 *
 * Vingt-cinq d'abord, et le banc a dit non : deux avant-postes sur soixante
 * l'atteignaient en quatre mille heures. Un seuil que presque personne ne
 * franchit n'est pas un palier, c'est un mur. Dix-huit, c'est déjà un vrai
 * hameau — les bourgs de cette carte en comptent quatre-vingt-dix au plus bas
 * — et c'est atteignable par une partie qui s'en donne la peine.
 */
export const POP_RECONNUE = 18;

/**
 * Un avant-poste qui compte finit par exister pour les autres.
 *
 * Jusqu'ici la voie du colon n'avait pas de haut : on fondait un camp, on le
 * développait, et il restait un camp — invisible sur la carte du monde, sans
 * marché, sans place dans la politique, que personne ne convoitait jamais. On
 * pouvait bâtir quarante habitants et douze niveaux de bâtiment sans que le
 * monde s'en aperçoive.
 *
 * Au-delà de vingt-cinq habitants et d'une halle, il entre dans `world.colonies`
 * comme n'importe quel bourg. **Sa fiche est une vitrine, pas une seconde
 * source de vérité** : `state.base` reste le seul endroit où l'avant-poste
 * existe vraiment, et la vitrine en est recopiée une fois par jour. Le tick des
 * colonies la saute — elle n'a ni économie propre, ni notables, ni grenier.
 *
 * Ce que ça change : il se voit sur la carte, il tient ses abords comme une
 * ville, les cases voisines cessent d'être libres à la fondation — et surtout,
 * les conseils voisins le voient comme une place à prendre.
 */
/**
 * Peut-on se faire écrire sur les cartes, et faut-il le vouloir ?
 *
 * Ce fut d'abord automatique, et le banc a montré ce que ça donne : sur
 * quatorze mille heures, les camps atteignaient dix-sept habitants, étaient
 * reconnus, puis une colonne venait les prendre — et l'on retrouvait des
 * avant-postes à 1,8 habitant avec dix-neuf niveaux de bâtiment, c'est-à-dire
 * des ruines rebâties en boucle. Le mécanisme marchait ; c'est de l'avoir rendu
 * involontaire qui était faux.
 *
 * Exister est une décision. On la prend quand on a des murs.
 */
export function peutReconnaitre(state) {
  const base = state.base;
  if (!base.fonde) return { ok: false, motif: 'Aucun avant-poste.' };
  if (base.colonieId) return { ok: false, motif: 'Déjà sur les cartes.' };
  if ((base.pop || 0) < POP_RECONNUE) {
    return { ok: false, motif: `${Math.round(base.pop || 0)} habitants sur ${POP_RECONNUE}.` };
  }
  if (niveau(base, 'halle') < 1) return { ok: false, motif: 'Il faut une halle de récolte.' };
  if (state.world.regions[base.regionId].colonie) {
    return { ok: false, motif: 'Une ville occupe déjà cette case.' };
  }
  return { ok: true };
}

export function reconnaitreAvantPoste(state, log) {
  const base = state.base;
  if (!peutReconnaitre(state).ok) return null;
  const w = state.world;
  const r = w.regions[base.regionId];
  w.prochaineColonieId = (w.prochaineColonieId || w.colonies.length) + 1;
  const stock = {};
  for (const k of COMMODITY_KEYS) stock[k] = 0;
  const col = {
    id: `s${w.prochaineColonieId}`,
    nom: base.nom,
    regionId: base.regionId,
    faction: null,
    factionOrigine: null,
    taille: 1,
    pop: Math.round(base.pop),
    defense: Math.round(base.defense),
    defenseMax: Math.round(base.defense),
    murs: niveau(base, 'mur') * 3,
    stock,
    unrest: 0,
    marche: 1,
    prises: 0,
    banc: null,
    geole: null,
    emplois: null,
    notables: [],
    declin: 0,
    // Ce qui la distingue de toutes les autres : elle est à vous, et sa vérité
    // est ailleurs.
    avantPoste: true,
  };
  w.colonies.push(col);
  r.colonie = col.id;
  base.colonieId = col.id;
  if (log) {
    log({
      type: 'base',
      texte: `${base.nom} n’est plus un camp : on l’écrit sur les cartes. `
        + `Vous l’avez voulu — et l’on vous la convoitera.`,
      regionId: base.regionId,
      important: true,
    });
  }
  return col;
}

/** Recopier l'avant-poste dans sa vitrine. Sens unique, une fois par jour. */
export function synchroniserVitrine(state) {
  const base = state.base;
  if (!base.colonieId) return;
  const col = state.world.colonies.find((c) => c.id === base.colonieId);
  if (!col) { base.colonieId = null; return; }
  // `avantPoste` tombe à faux quand on nous la prend : c'est ce drapeau-là qui
  // dit qu'elle est encore nôtre, et non l'absence de couleurs — une ville
  // rattachée porte celles de sa faction et reste la vôtre.
  if (!col.avantPoste || col.ruine) return;
  col.pop = Math.round(base.pop || 0);
  // Ce que le protecteur met de sa poche. Sans cette ligne, prendre les
  // couleurs de quelqu'un donnait tout l'inconvénient — ses guerres — et aucun
  // des avantages : onze villes sur vingt-quatre tenaient six mille heures
  // contre vingt-quatre pour une ville libre en paix. On paie l'impôt, ils
  // paient la garnison ; c'est le marché, et il doit se voir dans les murs.
  let garnison = 0;
  if (col.faction && state.world.factions[col.faction]) {
    const f = state.world.factions[col.faction];
    const veut = Math.round(30 + (base.pop || 0) * 3);
    const paye = Math.min(veut, Math.floor(f.tresor / 40));
    if (paye > 0) { f.tresor -= paye * 0.5; garnison = paye; }
  }
  col.defense = Math.round((base.defense || 0) + garnison);
  col.defenseMax = Math.max(col.defense, Math.round((base.defense || 0) + garnison));
  col.murs = niveau(base, 'mur') * 3;
  col.taille = col.pop >= 90 ? 3 : col.pop >= 45 ? 2 : 1;
  col.nom = base.nom;
}

/**
 * Choisir son camp.
 *
 * Une ville libre vit de la réputation de celui qui l'a bâtie : personne ne
 * vient la prendre tant qu'on n'a rien à lui reprocher. C'est tenable, et c'est
 * fragile — il suffit d'une guerre où l'on a pris parti pour que la place
 * redevienne convoitable.
 *
 * L'autre voie : prendre les couleurs de ceux qu'on sert. Ils la portent sur
 * leurs cartes, leurs colonnes la comptent parmi les leurs, et l'on cesse
 * d'être un bourg sans maître à trois jours de marche. En échange on paie
 * l'impôt qu'ils ont voté — celui-là même qu'on a peut-être voté soi-même, si
 * l'on est Commandeur — et l'on hérite de leurs guerres.
 */
export function peutRattacher(state, faction) {
  const base = state.base;
  if (!base.colonieId) return { ok: false, motif: 'La ville n’est pas sur les cartes.' };
  const col = state.world.colonies.find((c) => c.id === base.colonieId);
  if (!col || !col.avantPoste) return { ok: false, motif: 'Elle ne vous appartient plus.' };
  if (col.faction === faction) return { ok: false, motif: 'Elle porte déjà ces couleurs.' };
  const f = state.world.factions[faction];
  if (!f || !f.colonies.length) return { ok: false, motif: 'Cette faction n’existe plus.' };
  const sert = state.player.groupes.some(
    (g) => g.allegeance && g.allegeance.faction === faction
  );
  if (!sert && (state.player.reputation[faction] || 0) < 40) {
    return { ok: false, motif: 'Il faut les servir, ou qu’ils vous estiment (40).' };
  }
  return { ok: true };
}

export function rattacherVille(state, faction, log) {
  const v = peutRattacher(state, faction);
  if (!v.ok) return v;
  const base = state.base;
  const col = state.world.colonies.find((c) => c.id === base.colonieId);
  const ancienne = col.faction;
  if (ancienne && state.world.factions[ancienne]) {
    const fa = state.world.factions[ancienne];
    fa.colonies = fa.colonies.filter((id) => id !== col.id);
  }
  col.faction = faction;
  col.factionOrigine = col.factionOrigine || faction;
  const f = state.world.factions[faction];
  if (!f.colonies.includes(col.id)) f.colonies.push(col.id);
  state.world.regions[col.regionId].controle = faction;
  if (log) {
    log({
      type: 'base',
      texte: `${base.nom} prend les couleurs ${FACTIONS[faction].genitif}. `
        + `On la défendra comme les leurs — et l’on y lèvera l’impôt comme chez eux.`,
      regionId: base.regionId,
      important: true,
      factions: [faction],
    });
  }
  return { ok: true };
}

/** Reprendre son drapeau. On n'oublie pas ce genre de départ. */
export function declarerIndependance(state, log) {
  const base = state.base;
  const col = base.colonieId
    && state.world.colonies.find((c) => c.id === base.colonieId);
  if (!col || !col.avantPoste || !col.faction) {
    return { ok: false, motif: 'Elle ne porte les couleurs de personne.' };
  }
  const f = state.world.factions[col.faction];
  const ancienne = col.faction;
  if (f) f.colonies = f.colonies.filter((id) => id !== col.id);
  col.faction = null;
  state.world.regions[col.regionId].controle = null;
  state.player.reputation[ancienne] = Math.max(-100,
    (state.player.reputation[ancienne] || 0) - 35);
  if (log) {
    log({
      type: 'base',
      texte: `${base.nom} reprend son drapeau. ${FACTIONS[ancienne].nom} `
        + `n’oubliera pas ce genre de départ.`,
      regionId: base.regionId,
      important: true,
      factions: [ancienne],
    });
  }
  return { ok: true };
}

/**
 * L'impôt qu'on paie à ceux dont on porte les couleurs. Prélevé sur la
 * production, au taux qu'ils ont voté — et l'on n'a pas à aimer ce taux pour
 * le payer, sauf à être celui qui le fixe.
 */
export function preleverImpot(state, log) {
  const base = state.base;
  if (!base.colonieId) return 0;
  const col = state.world.colonies.find((c) => c.id === base.colonieId);
  if (!col || !col.avantPoste || !col.faction) return 0;
  const f = state.world.factions[col.faction];
  if (!f) return 0;
  const taux = loisDe(state.world, col.faction).impot;
  const du = Math.round((base.pop || 0) * taux * 24);
  if (du <= 0) return 0;
  // On paie d'abord en crédits ; à défaut, en vivres, ce qui revient au même
  // pour une garnison.
  const enCredits = Math.min(state.player.credits, du);
  state.player.credits -= enCredits;
  noterArgent(state, 'impôt sur l’avant-poste', -enCredits);
  let reste = du - enCredits;
  if (reste > 0) {
    const rations = Math.min(base.stock.rations || 0, reste / 9);
    base.stock.rations -= rations;
    reste -= rations * 9;
  }
  f.tresor += du - reste;
  if (reste > 0 && log && state.temps % 240 === 0) {
    log({
      type: 'base',
      texte: `${base.nom} n’a pas de quoi payer l’impôt ${FACTIONS[col.faction].genitif}. `
        + `On le note.`,
      regionId: base.regionId,
    });
  }
  return du - reste;
}

// ---------------------------------------------------------------------------
// Les marchands de passage
// ---------------------------------------------------------------------------

/** Ce qu'on garde toujours : des jours de vivres par tête, et de quoi bâtir. */
const RESERVE_JOURS = 25;
const GARDE_MATERIAUX = 250;

/** Ce que le camp achète quand il en manque, et jusqu'où. */
const ACHATS = { polymere: 150, composant: 50, carburant: 200 };

/**
 * Un marchand s'arrête.
 *
 * Une ville reconnue n'avait toujours pas de marché : elle achetait par
 * l'escouade, comme un camp, et la voie du colon restait attachée aux jambes de
 * quatre personnes. C'est le couplage que le banc avait mis au jour à cent
 * vingt parties — marcher est ce qui rend riche, donc bâtir loin des routes
 * appauvrit.
 *
 * On ne lui donne pas un étal, ce qui supposerait un second stock et une
 * seconde vérité. On lui donne **des visiteurs** : des colporteurs qui traitent
 * avec l'intendance, prennent le surplus au prix du gros et laissent ce qui
 * manque au prix du détail. C'est moins avantageux que d'aller vendre soi-même
 * en ville — et c'est bien le propos : on paie la commodité.
 *
 * Ils viennent d'autant plus souvent que la piste est faite. Une ville qu'on
 * atteint par une route damée voit passer du monde ; une ville au bout d'une
 * friche n'en voit aucun.
 */
export function visiteMarchand(state, rng, log) {
  const base = state.base;
  if (!base.fonde || base.commerce === false) return null;
  const r = state.world.regions[base.regionId];
  // Un colporteur tous les huit jours sur une bonne route, tous les vingt sur
  // une piste à peine marquée. Réservé aux villes reconnues, ce mécanisme ne
  // servait à rien : c'est le camp *avant* le seuil qui a besoin d'écouler son
  // surplus, puisque c'est comme ça qu'il devient une ville. Un hameau voit
  // passer un ferrailleur de temps en temps ; une ville en voit trois fois plus.
  // Deux passages par partie : c'est ce que donnait une cadence de quatre cent
  // quatre-vingts heures, et autant dire que le mécanisme n'existait pas. Le
  // profil colon du banc l'a mis au jour — un bot qui reste chez lui bâtit
  // *moins* qu'un bot qui court la carte, parce que ce qu'il faut à un chantier
  // ne se ramasse pas sur place et que personne ne le lui apporte. Un hameau
  // sur une piste faite voit un colporteur tous les huit jours, pas tous les
  // quarante.
  const cadence = 200 / (0.4 + (r.piste || 0) * 1.6) * (base.colonieId ? 1 : 1.6);
  if (state.temps - (base.dernierMarchand || -9999) < cadence) return null;
  base.dernierMarchand = state.temps;

  let vendu = 0;
  let achete = 0;
  let credits = 0;
  // La réserve de vivres se calcule sur ce que le camp peut *tenir*, pas sur ce
  // qu'il tient à l'instant. Calculée sur la population du moment, elle vendait
  // la semence : un camp qui s'effondre à deux habitants bradait tout ce qui
  // dépassait cinquante rations, donc ne se relevait jamais. Sur quatorze mille
  // heures, les avant-postes finissaient à 1,2 habitant avec dix-sept niveaux
  // de bâtiment — des hangars vides et bien approvisionnés en rien.
  const pop = Math.max(1, base.pop || 0, populationMax(base));
  for (const k of COMMODITY_KEYS) {
    const garde = k === 'rations' ? pop * RESERVE_JOURS : GARDE_MATERIAUX;
    const surplus = (base.stock[k] || 0) - garde;
    if (surplus < 10) continue;
    // Au prix du gros : un colporteur qui se déplace prend sa part.
    const prix = COMMODITIES[k].prix * 0.55 * rng.range(0.9, 1.15);
    const qte = Math.round(surplus * rng.range(0.5, 0.85));
    base.stock[k] -= qte;
    credits += Math.round(qte * prix);
    vendu += qte;
  }
  state.player.credits += credits;
  noterArgent(state, 'colporteurs (ventes)', credits);

  for (const k of Object.keys(ACHATS)) {
    const manque = ACHATS[k] - (base.stock[k] || 0);
    if (manque < 10) continue;
    const prix = COMMODITIES[k].prix * 1.35 * rng.range(0.9, 1.15);
    const peut = Math.floor(state.player.credits / prix);
    const qte = Math.min(manque, peut, Math.round(manque * rng.range(0.4, 0.9)));
    if (qte < 5) continue;
    state.player.credits -= Math.round(qte * prix);
    noterArgent(state, 'colporteurs (achats pour le camp)', -Math.round(qte * prix));
    ajouter(base, k, qte);
    achete += qte;
  }

  if (vendu || achete) base.marchands = (base.marchands || 0) + 1;
  if (log && (vendu || achete)) {
    // Pas discret quand il emporte quelque chose : c'est la réponse à « mon
    // entrepôt s'est vidé et je ne sais pas pourquoi ». Le colporteur prend le
    // surplus au-delà de la réserve, et il le prenait en silence.
    log({
      type: 'marchand',
      texte: `Un colporteur s’arrête à ${base.nom}`
        + `${vendu ? ` : il prend ${vendu} unités du surplus pour ${credits} cr` : ''}`
        + `${achete ? `${vendu ? ' et laisse' : ' : il laisse'} ${achete} unités` : ''}.`,
      regionId: base.regionId,
      important: vendu >= 40,
      discret: vendu === 0,
    });
  }
  return { vendu, achete, credits };
}

/**
 * Quelqu'un a pris votre ville. On ne garnit pas un camp des friches : ils
 * prennent ce qu'il y a et s'installent. Il vous reste votre escouade, et de
 * quoi recommencer ailleurs — c'est très exactement ce que ce jeu raconte.
 */
export function perdreAvantPoste(state, log, motif) {
  const base = state.base;
  if (!base.fonde) return;
  const nom = base.nom;
  const reg = base.regionId;
  base.fonde = false;
  base.colonieId = null;
  base.regionId = null;
  base.batiments = {};
  base.file = [];
  // Ce que la première version oubliait, et qui restait accroché au camp
  // suivant : la file de recherche d'un laboratoire qui n'existe plus, et les
  // débris comptables d'un entrepôt qui n'est plus à nous.
  base.fileRech = [];
  base.postes = {};
  base.pop = 0;
  base.defense = 0;
  base.gaspille = 0;
  base.derniereAttaque = -999;
  base.majVitrine = -999;
  base.majEmploi = -999;
  for (const k of COMMODITY_KEYS) base.stock[k] = 0;
  if (log) {
    log({
      type: 'base',
      texte: motif
        || `${nom} est tombée. Ce qu’on y avait bâti est à eux, désormais. `
          + `Il reste l’escouade, et de la place ailleurs.`,
      regionId: reg,
      important: true,
    });
  }
}

/**
 * L'Essaim est passé. Il ne gouverne pas, il saigne.
 *
 * La vérité d'un avant-poste est dans `state.base`, pas dans son entrée du
 * monde : saccager la seconde ne coûtait rien, puisque `synchroniserVitrine`
 * réécrit la population et la défense au tick suivant à partir de la première.
 * Un raid de l'Essaim sur le camp du joueur était donc, à la lettre, gratuit.
 */
export function saccagerAvantPoste(state, log, force) {
  const base = state.base;
  if (!base.fonde) return;
  let pris = 0;
  for (const k of COMMODITY_KEYS) {
    const perdu = Math.round((base.stock[k] || 0) * 0.35);
    base.stock[k] = Math.max(0, (base.stock[k] || 0) - perdu);
    pris += perdu;
  }
  const avant = Math.round(base.pop || 0);
  base.pop = Math.max(0, Math.round((base.pop || 0) * 0.8));
  base.defense = Math.round((base.defense || 0) * 0.6);
  base.derniereAttaque = state.temps;
  const partis = avant - Math.round(base.pop);
  if (log) {
    log({
      type: 'raid',
      texte: `L’Essaim tombe sur ${base.nom} : ${force} bêtes, `
        + `${pris} unités emportées${partis > 0 ? ` et ${partis} habitant(s) en fuite` : ''}. `
        + `Les murs tiennent. Ils reviendront.`,
      regionId: base.regionId,
      important: true,
    });
  }
}

/**
 * Les colonnes qui marchent sur votre avant-poste, et où elles en sont.
 *
 * Une colonne se lève à l'autre bout de la carte, marche pendant des centaines
 * d'heures, arrive, et prend la place. Tout cela était écrit au journal — « X
 * lève une colonne en direction de Manase » — au milieu de quatre cents autres
 * lignes, sans être marqué comme important, et jamais rappelé ensuite. On
 * perdait un camp de trente-cinq âmes sans avoir rien vu venir, et le seul
 * message qui restait était son épitaphe.
 *
 * Ici on ne lit pas un journal : on regarde qui marche, maintenant, et à
 * combien de cases. C'est la seule information qui permette de choisir entre
 * rentrer défendre, monter un mur, ou accepter de perdre la place.
 */
export function menacesSurLaBase(state) {
  const base = state.base;
  if (!base.fonde) return [];
  const out = [];
  for (const a of state.world.armees || []) {
    if (a.cible !== base.colonieId) continue;
    // Ce qu'il lui reste à parcourir, en cases, d'après sa propre route.
    const reste = Math.max(0, (a.route ? a.route.length : 0) - (a.etape || 0));
    out.push({
      faction: a.faction,
      force: a.force,
      cases: reste,
      regionId: a.regionId,
      etat: a.etat,
    });
  }
  return out.sort((x, y) => x.cases - y.cases);
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
