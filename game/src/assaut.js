// ---------------------------------------------------------------------------
// L'assaut sur une ville (IMPLANTATIONS.md, M1)
// ---------------------------------------------------------------------------
//
// Jusqu'ici, la seule attaque que le joueur pouvait porter au monde était
// l'embuscade de caravane : une action, dans toute l'interface. On pouvait
// défendre son camp contre un siège, jamais aller frapper ailleurs.
//
// Décision du propriétaire (D1, IMPLANTATIONS.md §3) : « avoir le choix entre
// créer son drapeau ou capturer une ville pour le compte d'une faction ou
// juste attaquer pour d'autres raisons, détruire, prendre les richesses,
// matériaux etc, prendre les hommes ». Ce module ouvre la dernière de ces
// portes — la seule qui ne demande aucun drapeau.
//
// Décision D4 : le raid éclair entre, prend ce qu'il peut porter et ressort.
// **Il ne prend jamais la ville** : garder une place demandera un siège (M1c),
// et ce n'est pas ce que fait ce fichier.
//
// Décision D6 : ce qu'on ne peut pas emporter reste sur place. Rien ne brûle,
// rien ne s'évapore — la ville garde le reste, et l'on peut revenir.
//
// Le patron est celui de `attaquerCaravane` (caravanes.js) : combat, butin
// borné par le portage, puis le registre des faits. Le combat arrive en
// paramètre, comme là-bas et comme pour les sièges : ce module précède
// `events.js`, qui le lui fournit.

import { COMMODITIES, COMMODITY_KEYS, drapeauDe } from './data.js';
import { groupeActif } from './groupes.js';
import { poidsInventaire, capacitePortage } from './economy.js';
import { commettre, delaiVersFaction } from './faits.js';
import { forceDeGroupe } from './base.js';
import { basculerPlace, derniereVille } from './factions.js';
import { appelerSecours } from './pactes.js';
import { effondrer } from './economy.js';
import { estDebout, blesser, pvTotal } from './characters.js';
import {
  colonieParId, colonieDe, MANIERES_SIEGE, SIEGE_MARQUE_H,
} from './world.js';

/**
 * Ce qu'une place oppose, et ce qu'un coup de main lui coûte.
 *
 * Objet mutable, pas des scalaires : tout ceci se calibre au banc.
 */
export const RAID_VILLE = {
  /** Combien d'hommes la garnison met devant vous, par point de défense. */
  parDefense: 0.11,
  /** Et ce que les murs ajoutent : on ne monte pas dedans comme dans un bourg. */
  parMur: 0.5,
  minBande: 1,
  maxBande: 14,
  /** Ce que la garnison battue perd de sa capacité à tenir. */
  degatsDefense: 0.5,
  /** Ce qu'un pillage laisse de rancœur dans les rues. */
  rancoeur: 0.18,
  /** Ce que ceux qui l'ont vu en retiennent contre vous. */
  memoire: -18,
  /** Et ce que le drapeau en retient, quand la nouvelle lui parvient. */
  reputation: -26,

  /**
   * La force opposée, en hommes. Une place tenue et murée est une autre
   * affaire qu'un bourg ouvert — c'est ce que la sonde IMP 1.6 vérifie.
   */
  forceDe(col) {
    const garnison = (col.defense || 0) * this.parDefense + (col.murs || 0) * this.parMur;
    return Math.max(this.minBande, Math.min(this.maxBande, Math.round(garnison)));
  },
};

/**
 * L'ordre dans lequel un pillard se sert : le plus de valeur pour le moins de
 * poids. Personne ne remplit son sac de biomasse en laissant les medkits.
 *
 * Dérivé des données, jamais tiré : deux raids identiques prennent la même
 * chose.
 */
function ordreDuPillage() {
  return COMMODITY_KEYS.slice().sort(
    (a, b) => (COMMODITIES[b].prix / COMMODITIES[b].poids)
      - (COMMODITIES[a].prix / COMMODITIES[a].poids),
  );
}

/**
 * Un coup de main sur une ville : on entre, on se bat, on prend ce qu'on peut
 * porter, on ressort.
 *
 * Rend `{ ok: false, motif }` si le geste n'a pas lieu d'être,
 * `{ ok: true, gagne: false, motif }` si la garde a tenu, et sinon
 * `{ ok: true, gagne: true, pris, laisse }`.
 */
export function attaquerVille(state, col, rng, log, combatContre, genererBande, groupe) {
  const g = groupe || groupeActif(state);
  if (!col || col.ruine) return { ok: false, motif: 'Il n’y a plus rien là-bas.' };
  // Son propre camp : `state.base` en est la vérité, cette fiche n'en est que
  // la vitrine. On ne se pille pas soi-même.
  if (col.avantPoste) return { ok: false, motif: 'C’est votre camp.' };
  if (col.regionId !== g.regionId) {
    return { ok: false, motif: `Il faut être à ${col.nom} pour y entrer.` };
  }

  const taille = RAID_VILLE.forceDe(col);
  const bande = genererBande(rng, col.faction, taille,
    Math.min(2, Math.floor(state.temps / 2500)));
  bande.nom = `Garde de ${col.nom}`;

  log({
    type: 'raid',
    texte: `Coup de main sur ${col.nom}.`,
    important: true,
    regionId: col.regionId,
  });

  const res = combatContre(state, bande, log, { rng }, g);
  if (res.vainqueur !== 'A') {
    return { ok: true, gagne: false, motif: `La garde de ${col.nom} a tenu.` };
  }

  // Le butin. La ville perd exactement ce que le sac gagne : rien ne se crée,
  // rien ne se perd, et la garde de cohérence le dirait.
  const pris = {};
  let laisse = 0;
  const capacite = capacitePortage(state, g);
  for (const k of ordreDuPillage()) {
    const dispo = Math.floor(col.stock[k] || 0);
    if (dispo <= 0) continue;
    const libre = capacite - poidsInventaire(g.inventaire);
    const poidsU = COMMODITIES[k].poids;
    const max = poidsU > 0 ? Math.floor(libre / poidsU) : dispo;
    const q = Math.max(0, Math.min(dispo, max));
    if (q > 0) {
      g.inventaire[k] = (g.inventaire[k] || 0) + q;
      col.stock[k] = (col.stock[k] || 0) - q;
      pris[k] = q;
    }
    // D6 : le reste ne brûle pas, il reste où il est.
    laisse += dispo - q;
  }

  // La garde est par terre et les rues ont vu. Une ville pillée tient moins
  // bien et gronde plus fort.
  col.defense = Math.max(0, Math.round((col.defense || 0) * (1 - RAID_VILLE.degatsDefense)));
  col.unrest = Math.min(1, (col.unrest || 0) + RAID_VILLE.rancoeur);

  // Le registre des faits est la SEULE porte vers la réputation et vers la
  // mémoire des villes (MEMOIRE.md, L2). On n'écrit donc pas dans les notables
  // d'ici : on commet le fait, et `tickFaits` le porte à ceux qu'il concerne.
  //
  // `su` à l'heure suivante et non à l'heure même : `commettre` marque
  // « appliqué » tout effet déjà dû, et c'est `tickFaits` — lui seul — qui
  // fait retenir les villes. Un effet daté de maintenant serait donc classé
  // sans que personne ne s'en souvienne jamais. Une heure, c'est le grain du
  // monde, et l'on vient de piller la ville sous ses propres yeux : elle
  // l'apprend au plus court.
  const effets = [{ ville: col.id, memoire: 'pillage', delta: RAID_VILLE.memoire, su: state.temps + 1 }];
  if (col.faction && col.faction !== 'essaim') {
    // Personne ne pille une ville entière sans témoin : ceux d'ici vous ont vu.
    // Reste le temps que la nouvelle remonte jusqu'à leur drapeau.
    effets.push({
      faction: col.faction,
      delta: RAID_VILLE.reputation,
      su: state.temps + delaiVersFaction(state, 'rumeur', col.regionId, col.faction),
      dit: `${drapeauDe(state.world, col.faction).nom} sa${drapeauDe(state.world, col.faction).pluriel ? 'vent' : 'it'} `
        + `qui est entré à ${col.nom} et ce qui en est reparti.`,
    });
  }
  commettre(state, {
    type: 'pillage-ville', regionId: col.regionId, t: state.temps, effets,
  });

  state.stats.villesPillees = (state.stats.villesPillees || 0) + 1;
  log({
    type: 'raid',
    texte: `${col.nom} est saignée. On repart avec ce qu’on peut porter.`,
    important: true,
    regionId: col.regionId,
    factions: col.faction ? [col.faction] : [],
  });

  return { ok: true, gagne: true, pris, laisse };
}

// ---------------------------------------------------------------------------
// Le siège (IMPLANTATIONS.md, M1c — lot S1)
// ---------------------------------------------------------------------------
//
// « Peut-on prendre une ville ? » Non : le raid entre et ressort. Ce qui
// manquait d'abord, c'est le siège — et le monde le fait déjà tous les jours
// (`tickArmee`, factions.js) : une colonne prend l'état `siege`, son assaut
// s'use contre la tenue de la place, la défense tombe, et à zéro la ville
// bascule. Il ne manquait que le même verbe pour l'escouade.
//
// On retourne donc ce qui existe, formule comprise — pas une règle neuve. Deux
// garde-fous du monde s'appliquent tels quels, parce que ce sont des règles du
// monde et non des règles dirigées contre le joueur : une capitale se défend
// comme une capitale, et l'on ne raye pas une faction de la carte par les
// armes — sa dernière ville tient.

/** Ce qu'un siège fait à une place, et ce qu'elle rend. Calibrable au banc. */
export const SIEGE = {
  /**
   * Ce que vaut un homme de troupe, en points de compétence d'escouade.
   *
   * Le piège que la suite navigateur a attrapé : en copiant la formule du
   * monde, j'avais copié les nombres mais pas les UNITÉS. Une colonne de
   * soixante hommes a une force de soixante ; `forceDeGroupe` rend environ
   * quatre-vingt-dix par vétéran. Trois personnes pesaient donc quatre
   * colonnes et abattaient n'importe quelle garde en une heure de siège,
   * capitale comprise — le siège n'avait plus d'objet.
   *
   * Tranché par le propriétaire (août 2026) : « un vétéran vaut une dizaine
   * d'hommes ». À neuf points par homme, six vétérans pèsent exactement une
   * colonne levée (FORCE_LEVEE = 60) : une bourgade tombe en quelques jours,
   * une place tenue en semaines, et une capitale murée demande une vraie
   * armée — qu'on sait déjà lever par ses prérogatives.
   */
  parHomme: 9,
  /** L'acharnement d'une capitale, et celui d'un pays qui n'a plus qu'elle. */
  capitale: 1.8,
  derniere: 1.6,
  /** Ce que la défense perd par heure, selon qu'on domine ou non. */
  usure: 0.12,
  usureFaible: 0.05,
  /** Ce que la place rend en coups, dans les mêmes deux cas. */
  riposte: 0.02,
  riposteFaible: 0.035,
  /** Ce qu'un siège fait monter de grogne dans les rues, par heure. */
  grogne: 0.004,
  /** En dessous, la garde ne tient plus : le siège n'a plus d'objet. */
  plancher: 1,
  /** Au bout de combien d'heures tenues le geste devient un fait qu'on inscrit. */
  jourQuiCompte: 24,
  /** Ce qu'une ville affamée retient de vous, et ce que son drapeau en dit. */
  memoireFamine: -40,
  rancuneFamine: -55,
  /** Un blocus se paie moins cher dans les rues, et plus cher au palais. */
  memoireBlocus: -14,
  rancuneBlocus: -35,
};

/** Ce que la prise ou la destruction d'une place vaut au registre des faits. */
export const PRISE = {
  /** Ce que vous en gagnez auprès de ceux à qui vous la donnez. */
  merite: 30,
  /** Et ce que vous en perdez auprès de ceux qui la perdent. */
  rancune: -45,
  /** Ce que les habitants retiennent de la prise. */
  memoire: -12,
  /** Raser une ville ne s'oublie pas. */
  rase: -70,
};

/**
 * Ce qu'une manière de faire coûte, quand la ville l'a subie assez longtemps
 * pour que ce soit un fait et non une menace.
 *
 * Affamer se paie chez les habitants : ce sont eux qui ont eu faim, et une
 * ville se souvient longtemps de qui l'a affamée. Bloquer se paie chez le
 * drapeau : c'est lui qui perd des revenus, et c'est lui qui compte.
 */
function inscrireSiege(state, col, maniere) {
  const dur = maniere === 'affamer';
  const effets = [{
    ville: col.id,
    memoire: dur ? 'famine' : 'blocus',
    delta: dur ? SIEGE.memoireFamine : SIEGE.memoireBlocus,
    su: state.temps + 1,
  }];
  if (col.faction && col.faction !== 'essaim') {
    effets.push({
      faction: col.faction,
      delta: dur ? SIEGE.rancuneFamine : SIEGE.rancuneBlocus,
      su: state.temps + delaiVersFaction(state, 'rumeur', col.regionId, col.faction),
      dit: dur
        ? `${drapeauDe(state.world, col.faction).nom} sa${drapeauDe(state.world, col.faction).pluriel ? 'vent' : 'it'} `
          + `qui affame ${col.nom}.`
        : `${drapeauDe(state.world, col.faction).nom} sa${drapeauDe(state.world, col.faction).pluriel ? 'vent' : 'it'} `
          + `qui a fermé les routes de ${col.nom}.`,
    });
  }
  commettre(state, {
    type: dur ? 'siege-famine' : 'siege-blocus',
    regionId: col.regionId,
    t: state.temps,
    effets,
  });
}

/** L'acharnement d'une place : la règle du monde, lue au même endroit. */
function acharnementDe(world, col) {
  const f = col.faction && world.factions[col.faction];
  const estCapitale = !!(f && f.capitale === col.id);
  const derniere = !!(f && f.colonies.length <= 1);
  return (estCapitale ? SIEGE.capitale : 1) * (derniere ? SIEGE.derniere : 1);
}

/** La ville qu'on peut assiéger d'ici, s'il y en a une. */
export function assiegeable(state, g) {
  const col = colonieDe(state.world, g.regionId);
  if (!col || col.ruine) return null;
  if (col.avantPoste) return null;
  return col;
}

/**
 * Une heure de siège. Appelée par `tickSquad` quand l'ordre du groupe est
 * `siege`, avec le flux privé du joueur — le monde ne bouge pas d'un dé.
 *
 * Rend `true` tant que le siège tient, `false` quand il n'a plus d'objet : la
 * place a cédé, elle a disparu, ou l'on n'est plus devant.
 */
export function tickSiege(state, g, rng, log) {
  const col = colonieParId(state.world, g.ordre.cible);
  if (!col || col.ruine || col.avantPoste) return false;
  // On ne tient pas une place à distance : partir, c'est lever le siège.
  if (col.regionId !== g.regionId) return false;

  // Dans l'unité du monde : ce que l'escouade pèse en hommes de troupe, et non
  // en points de compétence. Voir SIEGE.parHomme.
  const force = forceDeGroupe(g) / SIEGE.parHomme;
  if (force <= 0) return false;

  const assaut = force * rng.range(0.5, 1.1);
  const tenue = (col.defense * rng.range(0.6, 1.15) + col.murs * 2)
    * acharnementDe(state.world, col);
  const domine = assaut > tenue;

  col.defense = Math.max(0, col.defense - assaut * (domine ? SIEGE.usure : SIEGE.usureFaible));
  col.unrest = Math.min(1, (col.unrest || 0) + SIEGE.grogne);

  // La marque, reposée à chaque heure, avec la manière : c'est elle que le
  // monde lit pour savoir ce qui est coupé. Elle vit sur la colonie, donc dans
  // le monde — aucun calcul du monde n'a jamais à regarder du côté du joueur.
  const maniere = MANIERES_SIEGE[g.ordre.maniere] ? g.ordre.maniere : 'investir';
  // Le premier tour de siège appelle ceux qui ont promis leur secours à cette
  // place. Ce qu'une colonne du monde déclenche, votre escouade le déclenche :
  // on ne se donne pas le droit d'assiéger dans le dos des alliances.
  if (!g.ordre.appelLance) {
    g.ordre.appelLance = true;
    appelerSecours(state, col, state.player.drapeau || null, log);
  }
  col.siege = { t: state.temps, maniere };
  // Le repère qui dispense le monde de chercher : seul un siège qui coupe
  // quelque chose l'avance. Voir `aucuneCoupure`.
  if (MANIERES_SIEGE[maniere].vivres || MANIERES_SIEGE[maniere].negoce) {
    state.world.coupureJusqua = Math.max(
      state.world.coupureJusqua || 0, state.temps + SIEGE_MARQUE_H);
  }

  // Ce qu'on fait à une ville se sait, et ne se paie pas au même guichet selon
  // ce qu'on lui fait. On l'inscrit une fois par siège — au premier jour tenu,
  // quand le geste devient un fait et non une menace.
  if (maniere !== 'investir' && state.temps - (g.ordre.depuis || 0) >= SIEGE.jourQuiCompte
    && !g.ordre.inscrit) {
    g.ordre.inscrit = true;
    inscrireSiege(state, col, maniere);
  }

  // Et la place rend les coups. Un siège sans blessés serait un siège gratuit :
  // on s'installe, on attend, la ville tombe. Ce que la colonne du monde perd
  // en force, l'escouade le prend dans les corps.
  const rendu = tenue * (domine ? SIEGE.riposte : SIEGE.riposteFaible);
  if (rendu >= 1) {
    const debout = g.membres.filter(estDebout);
    if (debout.length) {
      const cible = debout[rng.irange(0, debout.length - 1)];
      const parts = Object.keys(cible.corps);
      blesser(cible, rendu, parts[rng.irange(0, parts.length - 1)], rng, { letal: false });
      if (pvTotal(cible).pct < 0.35) {
        log({
          type: 'siege',
          texte: `${cible.nom} prend un mauvais coup sous les murs de ${col.nom}.`,
          regionId: col.regionId,
        });
      }
    }
  }

  if (col.defense <= SIEGE.plancher) {
    log({
      type: 'siege',
      texte: `La garde de ${col.nom} ne tient plus. La place est à vous, si vous y entrez.`,
      regionId: col.regionId,
      important: true,
      factions: col.faction ? [col.faction] : [],
    });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// La chute et ses suites (IMPLANTATIONS.md, M1c — lot S2)
// ---------------------------------------------------------------------------
//
// « Peut-on choisir de prendre la ville pour soi ou pour sa faction ? » Le
// siège abat la garde ; restait à décider de ce qu'on fait de la place.
//
// **Pour sa faction** : tout existait déjà. `basculerPlace` — extraite de
// `capturer` pour ne pas l'écrire deux fois — fait changer la ville et la
// région de drapeau, dépêche comprise. On lui donne une porte d'entrée.
//
// **Pour soi** : impossible tant qu'on n'a pas de drapeau. C'est M3, et
// `declarerIndependance` dit pourquoi : elle laisse la place à PERSONNE, faute
// d'une case où la ranger.
//
// **La raser** : la ville devient une ruine. Le moteur sait le faire depuis
// toujours (`effondrer`) — c'est ce qui arrive à une ville que la faim ou la
// guerre a vidée.

/** Ce qu'on peut faire d'une place, et ce que ça demande. */
function placePrenable(state, col) {
  if (!col || col.ruine) return { ok: false, motif: 'Il n’y a plus rien là-bas.' };
  if (col.avantPoste) return { ok: false, motif: 'C’est votre camp.' };
  const g = groupeActif(state);
  if (col.regionId !== g.regionId) {
    return { ok: false, motif: `Il faut être à ${col.nom}.` };
  }
  if (col.defense > SIEGE.plancher) {
    return { ok: false, motif: `La garde de ${col.nom} tient encore. Il faut entrer.` };
  }
  // La règle du monde, la même pour tous.
  if (derniereVille(state.world, col)) {
    return {
      ok: false,
      motif: `${col.nom} est tout ce qui leur reste. On ne prend pas ça par les armes.`,
    };
  }
  return { ok: true, g };
}

/**
 * Livrer la place à ceux dont on porte les couleurs.
 *
 * On ne donne pas une ville à des gens qu'on ne sert pas : c'est un cadeau,
 * pas une transaction, et il faut être de la maison pour le faire.
 */
export function livrerPlace(state, col, faction, log) {
  const v = placePrenable(state, col);
  if (!v.ok) return v;
  const g = v.g;
  // Les vôtres, ou celles qu'on sert. Garder une place pour soi n'est possible
  // qu'à qui a planté ses propres couleurs (M3) — sinon il n'existe aucune
  // case où la ranger, et c'est exactement ce que disait
  // `declarerIndependance` en laissant le camp affranchi à personne.
  const sienne = state.player.drapeau === faction;
  const servie = g.allegeance && g.allegeance.faction === faction;
  if (!sienne && !servie) {
    return { ok: false, motif: 'Vous ne servez pas ces couleurs.' };
  }
  if (col.faction === faction) return { ok: false, motif: 'Elle porte déjà leurs couleurs.' };
  if (!state.world.factions[faction]) return { ok: false, motif: 'Ce drapeau n’existe plus.' };

  const ancien = col.faction;
  basculerPlace(state.world, col, faction, log, {});
  log({
    type: 'capture',
    texte: `${col.nom} passe sous ${drapeauDe(state.world, faction).nom} : c’est vous qui `
      + `${drapeauDe(state.world, faction).pluriel ? 'la leur avez' : 'la lui avez'} donnée.`,
    regionId: col.regionId,
    important: true,
    factions: [faction, ancien].filter(Boolean),
  });

  // Le registre des faits, comme toujours : ceux qui l'apprennent en tiennent
  // compte. Les vôtres vous en savent gré ; ceux qui la perdent ne vous le
  // pardonnent pas.
  const effets = [{
    faction, delta: PRISE.merite,
    su: state.temps + delaiVersFaction(state, 'rumeur', col.regionId, faction),
    dit: `${drapeauDe(state.world, faction).nom} sa${drapeauDe(state.world, faction).pluriel ? 'vent' : 'it'} `
      + `à qui ${drapeauDe(state.world, faction).pluriel ? 'ils doivent' : 'il doit'} ${col.nom}.`,
  }];
  if (ancien && ancien !== 'essaim') {
    effets.push({
      faction: ancien, delta: PRISE.rancune,
      su: state.temps + delaiVersFaction(state, 'rumeur', col.regionId, ancien),
      dit: `${drapeauDe(state.world, ancien).nom} sa${drapeauDe(state.world, ancien).pluriel ? 'vent' : 'it'} `
        + `qui leur a pris ${col.nom}.`,
    });
  }
  effets.push({ ville: col.id, memoire: 'prise', delta: PRISE.memoire, su: state.temps + 1 });
  commettre(state, {
    type: 'prise-ville', regionId: col.regionId, t: state.temps, effets,
  });
  state.stats.villesPrises = (state.stats.villesPrises || 0) + 1;
  return { ok: true };
}

/**
 * Raser la place. Il n'en reste rien, et elle n'est à personne.
 *
 * Le moteur sait faire une ruine depuis toujours — c'est ce qui arrive à une
 * ville que la faim ou la guerre a vidée. Ici, c'est un choix, et il se paie :
 * personne n'oublie qui a rasé une ville.
 */
export function raserPlace(state, col, log) {
  const v = placePrenable(state, col);
  if (!v.ok) return v;
  const ancien = col.faction;
  const nom = col.nom;
  effondrer(state.world, col);
  log({
    type: 'effondrement',
    texte: `${nom} est rasée. Il n’en restera que des murs noircis.`,
    regionId: col.regionId,
    important: true,
    factions: ancien ? [ancien] : [],
  });
  const effets = [];
  if (ancien && ancien !== 'essaim') {
    effets.push({
      faction: ancien, delta: PRISE.rase,
      su: state.temps + delaiVersFaction(state, 'rumeur', col.regionId, ancien),
      dit: `${drapeauDe(state.world, ancien).nom} sa${drapeauDe(state.world, ancien).pluriel ? 'vent' : 'it'} `
        + `qui a rasé ${nom}. Ça ne s’oublie pas.`,
    });
  }
  commettre(state, {
    type: 'ville-rasee', regionId: col.regionId, t: state.temps, effets,
  });
  state.stats.villesRasees = (state.stats.villesRasees || 0) + 1;
  return { ok: true };
}
