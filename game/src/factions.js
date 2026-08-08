// Le monde tourne sans le joueur : les factions lèvent des armées, assiègent,
// prennent des colonies, signent des paix. C'est le cœur « vivant » de la sim.

import {
  FACTIONS, DIPLO_FACTIONS, COMMODITY_KEYS, MENAGES, COMMODITIES, drapeauDe, diploDe,
  couleurNeuve,
} from './data.js';
import { Rng, grainDe } from './rng.js';
import {
  veutOuvrirBourse, ouvrirBourse, aUneBourse, partenairePossible, signerAccord,
  veutAccord,
  rompreAccords, tickBourses,
} from './bourse.js';
import {
  dirigeant, penchant, crediterDirigeant, butDeGuerre, etatDuBut, tickDirigeant,
  TEMPERAMENTS,
} from './dirigeants.js';
import {
  effondrer, emploisInitiaux, remonterCaisses, verser, productionColonie,
} from './economy.js';
import {
  tickCredit, veutBatir, racheterCreance, valeurNette,
} from './credit.js';
import { transferer, transfererVille, annuler, majCours } from './monnaie.js';
import { pourvoirCharges, nommerActeur } from './notables.js';
import { chemin, colonieParId, distance, voisins, damer } from './world.js';
import {
  loisDe, pressionFiscale, IMPOTS, PEINES, REGIMES, DIRECTEURS, directeurInitial,
} from './lois.js';

// ---------------------------------------------------------------------------
// Mesures
// ---------------------------------------------------------------------------

/**
 * Ce que coûte de tenir, par heure. Les seules dépenses courantes d'une
 * faction — tout le reste est ponctuel. Ce sont elles qui rendent une faction
 * abattable : une guerre longue vide une caisse. Sans elles, les trésors
 * gonflaient sans fin et plus une seule faction ne s'effondrait — dix sur
 * trente-six auparavant, zéro après. Calibrées au banc.
 */
/**
 * Qui achète des créances. Le Consortium et l'Ombrelle traitent, la Milice
 * méprise ce genre de manœuvre — le tempérament, pas le hasard.
 */
export const ACHETEURS = ['rapace', 'methodique', 'batisseur'];

export const ETAT = {
  /** Par point de défense et par heure. */
  parDefense: 0.002,
  /** Par niveau de mur et par heure. */
  parMur: 0.05,
  /** Par soldat en campagne et par heure. */
  parSoldat: 0.03,
  /** Ce qu'une garnison impayée perd par heure : les gardes n'attendent pas. */
  desertion: 0.004,
};

/**
 * Ce qu'il advient d'une colonne qu'on ne paie plus.
 *
 * La règle, telle que dictée par le propriétaire : « si elle n'est plus payée
 * par sa faction, la colonne peut rester un temps à son service, selon la
 * loyauté que les individus qui la composent lui portent. Mais elle peut mourir
 * de faim, et décider de faire cavalier seul, de fonder sa faction, de se faire
 * payer par une autre, de se disloquer. »
 *
 * Quatre issues sont ici. La cinquième — fonder sa faction — ne l'est pas : les
 * clés de `FACTIONS` sont fixes et la diplomatie, les couleurs et l'interface
 * sont câblées dessus. Elle a son propre cahier des charges à écrire, et
 * l'improviser serait exactement ce que la méthode interdit.
 *
 * **Les valeurs de départ sortent de deux mesures, pas d'une intuition**, et
 * la première proposition du chantier — une grâce de 240 heures — aurait rendu
 * le mécanisme mort par construction :
 *
 *   durée de vie d'une colonne : médiane **61 h**, 9e décile 95 h, **maximum
 *   111 h** sur 709 colonnes suivies, trois graines et 3 000 heures. Aucune
 *   n'atteint 240 heures, donc aucune n'aurait jamais bronché ;
 *   intervalle entre deux conseils : **30 à 75 heures**, une cinquantaine en
 *   moyenne. Une colonne voit donc un à deux conseils dans sa vie.
 *
 * D'où une grâce d'un jour — le premier conseil impayé passe, le second non —
 * et une attrition qui mord assez pour se voir en un ou deux conseils. Balayées
 * en I6.4 ; ce sont des points de départ mesurés, pas des valeurs finales.
 */
export const COLONNE = {
  /** Heures d'impayé qu'une colonne encaisse avant de broncher, à légitimité 50. */
  grace: 24,
  /** Ce qu'elle perd par heure d'impayé au-delà, en part de sa force. */
  attrition: 0.012,
  /** En dessous de quoi il ne reste plus une colonne, mais des hommes sur les routes. */
  debandade: 12,
};

export function puissance(world, key) {
  const f = world.factions[key];
  if (!f) return 0;
  // Le trésor pèse trois fois moins qu'avant, parce qu'il vaut trois fois plus.
  // Il ne se remplissait que de butin et d'une planche à billets ; il tient
  // désormais à ce que le pays produit, et sa médiane a triplé. Laissé à
  // soixante, il écrasait tout le reste — une faction valait sa caisse et non
  // ses villes, et la diplomatie se réglait au relevé de compte.
  let p = f.tresor / 180;
  for (const cid of f.colonies) {
    const c = colonieParId(world, cid);
    if (!c) continue;
    p += c.pop * 0.06 + c.defense * 0.5 + c.murs * 4;
  }
  for (const a of world.armees) {
    if (a.faction === key) p += a.force * 0.6;
  }
  return Math.round(p);
}

export function enGuerre(world, a, b) {
  if (a === 'essaim' || b === 'essaim') return a !== b;
  return world.guerres.some(
    (g) => (g.a === a && g.b === b) || (g.a === b && g.b === a)
  );
}

export function guerresDe(world, key) {
  return world.guerres.filter((g) => g.a === key || g.b === key);
}

function relation(world, a, b) {
  const f = world.factions[a];
  if (!f) return 0;
  return f.relations[b] ?? 0;
}

function majRelation(world, a, b, delta) {
  const fa = world.factions[a];
  const fb = world.factions[b];
  if (!fa || !fb || a === b) return;
  if (a === 'essaim' || b === 'essaim') return;
  const v = Math.max(-100, Math.min(100, (fa.relations[b] ?? 0) + delta));
  fa.relations[b] = v;
  fb.relations[a] = v;
}

export function declarerGuerre(world, a, b, t, log, but) {
  if (enGuerre(world, a, b)) return;
  // Deux marchés reliés par un accord ne le restent pas quand les colonnes
  // partent. C'est ce qui donne à une déclaration de guerre un prix
  // économique, payé par les deux camps — et par tous ceux que l'accord
  // reliait à travers eux.
  if (rompreAccords(world, a, b) && log) {
    log({
      type: 'bourse',
      texte: `L’accord commercial entre ${drapeauDe(world, a).nom} et ${drapeauDe(world, b).nom} `
        + `est rompu : les cours se débranchent.`,
      factions: [a, b],
      important: true,
    });
  }
  world.guerres.push({ a, b, depuis: t, batailles: 0, but: but || null, initiateur: a });
  majRelation(world, a, b, -60);
  crediterDirigeant(world, a, 'guerre');
  const d = dirigeant(world, a);
  log({
    type: 'guerre',
    texte: `${drapeauDe(world, a).nom} déclare${drapeauDe(world, a).pluriel ? 'nt' : ''} `
      + `la guerre ${drapeauDe(world, b).datif}`
      + `${but ? ` ${but.texte}` : ''}.${d ? ` ${d.titre} ${d.nom} l’a voulue.` : ''}`,
    factions: [a, b],
  });
}

export function signerPaix(world, a, b, t, log, motif) {
  const i = world.guerres.findIndex(
    (g) => (g.a === a && g.b === b) || (g.a === b && g.b === a)
  );
  if (i < 0) return;
  const g = world.guerres[i];
  world.guerres.splice(i, 1);
  majRelation(world, a, b, 45);
  // Une guerre abandonnée sans avoir obtenu ce qu'on cherchait coûte à celui
  // qui l'a déclarée : c'est la façon la plus nette de faire tomber un chef.
  if (motif !== 'atteint' && g.initiateur) crediterDirigeant(world, g.initiateur, 'paix');
  log({
    type: 'paix',
    texte: `${drapeauDe(world, a).nom} et ${drapeauDe(world, b).nom} signent une trêve`
      + `${motif === 'atteint' && g.but ? ` — l’affaire est réglée ${g.but.texte}` : ''}.`,
    factions: [a, b],
  });
}

// ---------------------------------------------------------------------------
// Armées
// ---------------------------------------------------------------------------

// Lever des hommes coûte cher : sans ça, les factions passent leur temps à
// s'échanger les mêmes villes et la carte devient du bruit.
function coutArmee(force) {
  return Math.round(force * 5.2);
}

/** La ville de la faction la plus proche d'une case : celle qui fournit. */
function colonieDepart(world, key, regionId) {
  let meilleure = null;
  let mieux = Infinity;
  for (const cid of world.factions[key].colonies) {
    const c = colonieParId(world, cid);
    if (!c || c.ruine) continue;
    const d = distance(c.regionId, regionId);
    if (d < mieux) { mieux = d; meilleure = c; }
  }
  return meilleure;
}

function leverArmee(world, key, force, depuis, cibleId, log) {
  const f = world.factions[key];
  const col = colonieParId(world, cibleId);
  if (!col) return null;
  const route = chemin(world, depuis, col.regionId) || [];
  const a = {
    id: `a${world.prochainArmeeId}`,
    // Le dé de la colonne, dérivé de son nom — jamais tiré du sac.
    rngEtat: grainDe(world.graine, 'armee', `a${world.prochainArmeeId++}`),
    faction: key,
    regionId: depuis,
    force,
    forceMax: force,
    cible: cibleId,
    route,
    etape: 0,
    progres: 0,
    etat: 'marche',
    ravitaillement: 60 + Math.round(force / 4),
    // Les heures de solde qu'on lui doit. Voir la solde, plus bas : une colonne
    // qu'on ne paie plus ne reste pas indéfiniment au garde-à-vous.
    impayees: 0,
  };
  world.armees.push(a);
  // La levée se paie sur place : recruter, armer, ravitailler passe entre les
  // mains de gens qui vivent quelque part. L'argent quitte le trésor mais ne
  // quitte pas le monde.
  verser(world, key, colonieDepart(world, key, depuis), coutArmee(force));
  // Quand c'est chez vous qu'ils vont, ce n'est plus une nouvelle du monde,
  // c'est un préavis. La ligne était noyée parmi quatre cents autres et n'était
  // même pas marquée importante : on apprenait la colonne en lisant l'épitaphe
  // de son propre camp.
  log(col.avantPoste ? {
    type: 'armee',
    texte: `${drapeauDe(world, key).nom} lève${drapeauDe(world, key).pluriel ? 'nt' : ''} une colonne de ${force} `
      + `hommes et la lance sur ${col.nom}. C’est chez vous qu’ils vont.`,
    factions: [key],
    regionId: depuis,
    important: true,
  } : {
    type: 'armee',
    texte: `${drapeauDe(world, key).nom} lève${drapeauDe(world, key).pluriel ? 'nt' : ''} `
      + `une colonne (${force}) en direction de ${col.nom}.`,
    factions: [key],
    regionId: depuis,
  });
  return a;
}

function dissoudre(world, armee) {
  const i = world.armees.indexOf(armee);
  if (i >= 0) world.armees.splice(i, 1);
}

function capturer(world, armee, col, t, log, ctx) {
  const ancien = col.faction;
  const nouveau = armee.faction;

  // L'avant-poste du joueur : sa vérité est dans `state.base`, pas ici. On
  // prévient l'appelant, qui sait démonter le camp.
  //
  // Mais l'Essaim ne prend rien : il saigne une place et repart, et le message
  // qui suit dit lui-même « la ville tient, à peine ». La première version
  // démontait pourtant le camp du joueur avant même de regarder qui attaquait —
  // deux lignes à la même heure dans le journal, « L'Essaim saccage Avant-poste.
  // La ville tient, à peine. » puis « Avant-poste est tombée. » Et comme
  // l'Essaim rend ensuite la place à son ancien drapeau, on lisait sur la carte
  // que sa propre faction venait de prendre son propre camp.
  if (col.avantPoste && nouveau !== 'essaim') {
    col.avantPoste = false;
    // « est tombée » ne disait ni devant qui, ni combien ils étaient. On perd
    // sa place ; on a le droit de savoir devant quoi.
    if (ctx && ctx.perdreAvantPoste) {
      ctx.perdreAvantPoste(`${col.nom} est tombée : ${drapeauDe(world, armee.faction).nom} `
        + `${drapeauDe(world, armee.faction).pluriel ? 'y sont entrés' : 'y est entré'} `
        + `avec ${armee.force} hommes. Ce qu’on y avait bâti est à eux, désormais. `
        + `Il reste l’escouade, et de la place ailleurs.`);
    }
  }
  if (ancien && world.factions[ancien]) {
    const fa = world.factions[ancien];
    fa.colonies = fa.colonies.filter((c) => c !== col.id);
    if (fa.capitale === col.id) fa.capitale = fa.colonies[0] || null;
  }

  if (nouveau === 'essaim') {
    // L'Essaim ne gouverne pas : il saigne la ville et repart.
    col.pop = Math.max(40, Math.round(col.pop * 0.55));
    col.unrest = Math.min(1, col.unrest + 0.4);
    for (const k of COMMODITY_KEYS) col.stock[k] = Math.round((col.stock[k] || 0) * 0.35);
    col.defense = 0;
    col.faction = ancien;
    if (ancien && world.factions[ancien] && !world.factions[ancien].colonies.includes(col.id)) {
      world.factions[ancien].colonies.push(col.id);
    }
    // Chez le joueur, le saccage doit mordre là où sont les vraies réserves :
    // `synchroniserVitrine` réécrit population et défense au tick suivant, si
    // bien qu'abîmer la fiche du monde ne coûtait rien.
    if (col.avantPoste && ctx && ctx.saccagerAvantPoste) {
      ctx.saccagerAvantPoste(armee.force);
    } else {
      log({
        type: 'raid',
        texte: `L’Essaim saccage ${col.nom}. La ville tient, à peine.`,
        regionId: col.regionId,
        factions: [ancien].filter(Boolean),
      });
    }
  } else {
    col.faction = nouveau;
    world.factions[nouveau].colonies.push(col.id);
    world.regions[col.regionId].controle = nouveau;
    for (const v of voisins(col.regionId)) {
      if (world.regions[v].controle === ancien) world.regions[v].controle = nouveau;
    }
    col.pop = Math.max(50, Math.round(col.pop * 0.82));
    col.unrest = Math.min(1, col.unrest + 0.35);
    col.prises = (col.prises || 0) + 1;
    // Prendre une ville assoit celui qui l'a voulue ; la perdre ronge l'autre.
    crediterDirigeant(world, nouveau, 'prise');
    if (ancien) crediterDirigeant(world, ancien, 'perte');
    // Pillage : une partie du stock file dans le trésor du vainqueur
    let butin = 0;
    for (const k of COMMODITY_KEYS) {
      const pris = Math.round((col.stock[k] || 0) * 0.3);
      col.stock[k] -= pris;
      butin += pris;
    }
    // Le butin, c'est de la marchandise emportée, pas de la monnaie trouvée : la
    // créditer au trésor en fabriquait à chaque prise de ville. Le vainqueur
    // hérite en revanche de ce que la ville avait en caisse et dans les poches
    // de ses gens — ça, ça change simplement de registre.
    transfererVille(world, col, ancien, nouveau);
    col.defense = Math.round(col.defenseMax * 0.25);
    log({
      type: 'capture',
      texte: `${drapeauDe(world, nouveau).nom} s’empare${drapeauDe(world, nouveau).pluriel ? 'nt' : ''} `
        + `de ${col.nom}${ancien ? ` (${drapeauDe(world, ancien).nom})` : ''}. `
        + `${nommerActeur(world, 'capture', col.id, col.prises)} a été vu clouant sa porte avant l’assaut.`,
      regionId: col.regionId,
      factions: [nouveau, ancien].filter(Boolean),
    });
    if (ancien) majRelation(world, nouveau, ancien, -25);
  }

  // La colonne fond après la prise : elle devient garnison
  armee.force = Math.round(armee.force * 0.5);
  if (armee.force < 12 || nouveau === 'essaim') dissoudre(world, armee);
  else {
    armee.etat = 'garnison';
    armee.attente = ctx.rng.irange(20, 90);
  }
}

function batailleArmees(world, a, b, t, log, ctx) {
  const rng = ctx.rng;
  const fa = a.force * rng.range(0.75, 1.3);
  const fb = b.force * rng.range(0.75, 1.3);
  const total = fa + fb;
  const pertesA = Math.round(a.force * (fb / total) * rng.range(0.55, 1.05));
  const pertesB = Math.round(b.force * (fa / total) * rng.range(0.55, 1.05));
  a.force = Math.max(0, a.force - pertesA);
  b.force = Math.max(0, b.force - pertesB);
  const g = world.guerres.find(
    (w) => (w.a === a.faction && w.b === b.faction) || (w.a === b.faction && w.b === a.faction)
  );
  if (g) g.batailles++;
  log({
    type: 'bataille',
    texte: `Choc de colonnes : ${drapeauDe(world, a.faction).nom} (−${pertesA}) `
      + `contre ${drapeauDe(world, b.faction).nom} (−${pertesB}).`,
    regionId: a.regionId,
    factions: [a.faction, b.faction],
  });
  for (const armee of [a, b]) {
    if (armee.force <= 8) {
      log({
        type: 'armee',
        texte: `La colonne ${drapeauDe(world, armee.faction).genitif} est anéantie.`,
        regionId: armee.regionId,
        factions: [armee.faction],
      });
      dissoudre(world, armee);
    }
  }
}

function tickArmee(world, armee, t, log, ctx) {
  const rng = ctx.rng;

  // Ravitaillement : une colonne loin de chez elle finit par se déliter
  armee.ravitaillement -= 1;
  if (armee.ravitaillement <= 0) {
    armee.force -= Math.max(1, Math.round(armee.force * 0.02));
    if (armee.force <= 8) {
      log({
        type: 'armee',
        texte: `La colonne ${drapeauDe(world, armee.faction).genitif} se disperse, faute de vivres.`,
        regionId: armee.regionId,
        factions: [armee.faction],
      });
      dissoudre(world, armee);
      return;
    }
  }

  if (armee.etat === 'garnison') {
    armee.attente -= 1;
    const col = colonieParId(world, armee.cible);
    if (col) col.defense = Math.min(col.defenseMax, col.defense + armee.force * 0.05);
    if (armee.attente <= 0) dissoudre(world, armee);
    return;
  }

  if (armee.etat === 'marche') {
    const cible = colonieParId(world, armee.cible);
    if (!cible) { dissoudre(world, armee); return; }
    // La cible a changé de mains entre-temps : on rentre
    if (cible.faction === armee.faction) {
      log({
        type: 'armee',
        texte: `La colonne ${drapeauDe(world, armee.faction).genitif} rebrousse chemin : ${cible.nom} est déjà tombée.`,
        regionId: armee.regionId,
        factions: [armee.faction],
      });
      dissoudre(world, armee);
      return;
    }
    if (!armee.route.length || armee.etape >= armee.route.length) {
      armee.etat = 'siege';
      armee.regionId = cible.regionId;
      log({
        type: 'siege',
        texte: `${drapeauDe(world, armee.faction).nom} `
          + `met${drapeauDe(world, armee.faction).pluriel ? 'tent' : ''} le siège devant ${cible.nom}.`,
        regionId: cible.regionId,
        factions: [armee.faction, cible.faction].filter(Boolean),
      });
      return;
    }
    const prochaine = armee.route[armee.etape];
    armee.progres += 1;
    const cout = Math.max(2, Math.round(2 + (world.regions[prochaine] ? 1 : 0)));
    if (armee.progres >= cout) {
      armee.progres = 0;
      armee.regionId = prochaine;
      armee.etape++;
      // Une colonne en marche entretient la route qu'elle emprunte. Le monde
      // n'attend pas le joueur pour se donner des chemins.
      damer(world, prochaine, 2.5);
      // Rencontre avec une colonne ennemie sur la même case
      const autre = world.armees.find(
        (o) => o !== armee && o.regionId === armee.regionId && o.faction !== armee.faction
          && enGuerre(world, o.faction, armee.faction)
      );
      if (autre) batailleArmees(world, armee, autre, t, log, ctx);
    }
    return;
  }

  if (armee.etat === 'siege') {
    const col = colonieParId(world, armee.cible);
    if (!col) { dissoudre(world, armee); return; }
    if (col.faction === armee.faction) { dissoudre(world, armee); return; }

    // Une capitale se défend comme une capitale : sans ça, une faction se fait
    // rayer de la carte en une campagne et ne revient jamais.
    const estCapitale = col.faction && world.factions[col.faction]
      && world.factions[col.faction].capitale === col.id;
    const derniere = col.faction && world.factions[col.faction]
      && world.factions[col.faction].colonies.length <= 1;
    const acharnement = (estCapitale ? 1.8 : 1) * (derniere ? 1.6 : 1);
    const assaut = armee.force * rng.range(0.5, 1.1);
    // Ce que vaut l'escouade restée sur place, quand c'est le camp du joueur.
    //
    // Elle comptait déjà contre les pillards (`tickBase`) et pas du tout contre
    // une colonne : on pouvait poster ses six meilleurs hommes derrière ses
    // propres murs et regarder la place tomber sans qu'ils changent un chiffre.
    // On la lit à l'instant du choc plutôt qu'à la synchronisation de la
    // vitrine, qui n'a lieu que toutes les vingt-quatre heures — un renfort qui
    // arrive pendant le siège doit compter tout de suite.
    const renfort = col.avantPoste && ctx && ctx.renfortAvantPoste
      ? ctx.renfortAvantPoste() : 0;
    const tenue = ((col.defense + renfort) * rng.range(0.6, 1.15) + col.murs * 2) * acharnement;
    if (assaut > tenue) {
      col.defense = Math.max(0, col.defense - assaut * 0.12);
      armee.force -= Math.max(0, Math.round(tenue * 0.02));
    } else {
      col.defense = Math.max(0, col.defense - assaut * 0.05);
      armee.force -= Math.max(1, Math.round(tenue * 0.035));
    }
    col.unrest = Math.min(1, col.unrest + 0.004);

    if (armee.force <= 8) {
      log({
        type: 'siege',
        texte: `Le siège de ${col.nom} est brisé : ${drapeauDe(world, armee.faction).nom} `
          + `recule${drapeauDe(world, armee.faction).pluriel ? 'nt' : ''}.`,
        regionId: col.regionId,
        factions: [armee.faction, col.faction].filter(Boolean),
      });
      if (col.faction && armee.faction !== 'essaim') majRelation(world, armee.faction, col.faction, -8);
      dissoudre(world, armee);
      return;
    }
    if (col.defense <= 1) {
      // On ne raye pas une faction de la carte par les armes. Sa dernière
      // ville tient, quel qu'en soit le prix : c'est ce qui laisse au monde
      // six acteurs plutôt qu'un vainqueur et des ruines.
      const proprio = col.faction && world.factions[col.faction];
      if (proprio && proprio.colonies.length <= 1 && armee.faction !== 'essaim') {
        col.defense = Math.round(col.defenseMax * 0.35);
        col.pop = Math.max(40, Math.round(col.pop * 0.9));
        armee.force = Math.round(armee.force * 0.45);
        log({
          type: 'siege',
          texte: `${col.nom} tient. ${drapeauDe(world, col.faction).nom} n’a plus que cette ville, et la défend comme telle.`,
          regionId: col.regionId,
          factions: [col.faction, armee.faction],
          important: true,
        });
        if (armee.force <= 8) dissoudre(world, armee);
        else { armee.etat = 'marche'; armee.ravitaillement = Math.min(armee.ravitaillement, 20); }
        return;
      }
      capturer(world, armee, col, t, log, ctx);
    }
  }
}

// ---------------------------------------------------------------------------
// Conseil : décisions périodiques d'une faction
// ---------------------------------------------------------------------------

export function coloniesDe(world, key) {
  return world.factions[key].colonies
    .map((id) => colonieParId(world, id))
    .filter((c) => c && !c.ruine);
}

function cibleLaPlusProche(world, key, ennemi) {
  const miennes = coloniesDe(world, key);
  const leurs = coloniesDe(world, ennemi);
  let best = null;
  let bestD = Infinity;
  let depuis = null;
  for (const m of miennes) {
    for (const l of leurs) {
      const d = distance(m.regionId, l.regionId);
      if (d < bestD) { bestD = d; best = l; depuis = m; }
    }
  }
  return best ? { cible: best, depuis, dist: bestD } : null;
}

function conseil(world, key, t, log, ctx) {
  const rng = ctx.rng;
  const f = world.factions[key];
  const mesColonies = coloniesDe(world, key);

  if (key === 'essaim') {
    // L'Essaim n'a pas de politique : il déferle.
    f.prochainConseil = rng.irange(40, 130);
    const toutes = world.colonies.filter((c) => c.faction && c.faction !== 'essaim');
    if (!toutes.length) return;
    const cible = rng.pick(toutes);
    const sauvages = world.regions.filter((r) => !r.colonie && !r.controle);
    const depuis = sauvages.length ? rng.pick(sauvages).i : rng.pick(world.regions).i;
    const force = rng.irange(30, 70) + Math.floor(t / 400);
    const a = leverArmee(world, 'essaim', force, depuis, cible.id, log);
    if (a) { annuler(world, key, f.tresor); f.tresor = 0; }
    return;
  }

  if (!mesColonies.length) {
    // Un pays sans ville ne délibère plus — mais ses colonnes, elles, existent
    // encore et ne sont plus payées par personne. Sans cette ligne elles
    // restaient au garde-à-vous pour l'éternité : le conseil rendait la main
    // avant de les juger, et une troupe abandonnée par un pays mort ne se
    // débandait jamais. Trouvé en cherchant pourquoi la débandade ne survenait
    // pas là où elle est pourtant la seule issue possible.
    const heuresMortes = Math.max(1, t - (f.dernierConseil || 0));
    f.dernierConseil = t;
    for (const a of world.armees) {
      if (a.faction === key) a.impayees = (a.impayees || 0) + heuresMortes;
    }
    jugerColonnes(world, key, heuresMortes, t, log);
    f.prochainConseil = 60;
    return;
  }

  f.prochainConseil = rng.irange(30, 90);

  // Ce qu'on s'autorise avant de décider ce qu'on fait : l'impôt paie les
  // colonnes, la justice tient les routes, et l'un et l'autre se paient en
  // grogne. La politique intérieure passe donc avant la politique étrangère.
  legiferer(world, key, t, log, ctx);
  // Puis ce qu'on pense de la façon dont gouvernent les autres. Une loi vaut
  // aussi vers l'extérieur.
  jugerLesAutres(world, key);

  // Revenus : les villes remontent ce qu'elles ont au-delà de leur fonds de
  // roulement. L'impôt était assis sur la population et sur rien d'autre — une
  // ville ruinée rapportait autant qu'une ville prospère de même taille — et le
  // trésor tenait à 84 % de caravanes qui créditaient sans que personne ne paie.
  // Il porte désormais sur ce que les villes ont réellement gagné, et le taux
  // que la loi fixe décide de ce qu'on leur laisse pour commercer : voir
  // `reserveVille` dans economy.js.
  remonterCaisses(world, key, mesColonies);

  // Ce que tenir un pays coûte, et à qui ça profite. Une garnison, ce sont des
  // hommes payés ; des murs entretenus, ce sont des maçons. Le trésor rend donc
  // aux villes une part de ce qu'il leur a pris : c'est ce qui fait tourner la
  // monnaie au lieu de la faire disparaître.
  const heures = Math.max(1, t - (f.dernierConseil || 0));
  f.dernierConseil = t;
  for (const col of mesColonies) {
    const du = (col.defense * ETAT.parDefense + col.murs * ETAT.parMur) * heures;
    const paye = verser(world, key, col, du);
    if (paye < du * 0.999 && col.defense > 0) {
      col.defense = Math.max(0, col.defense * (1 - ETAT.desertion * heures));
    }
  }
  // Et la solde de ceux qui sont en campagne, versée là où on les a levés.
  //
  // Ce qui n'est pas versé est maintenant compté. Une colonne payée efface son
  // ardoise ; une colonne qui ne l'est pas la voit s'allonger, et c'est elle
  // qui décide plus bas si elle reste, si elle fond, si elle se vend ou si elle
  // se débande. Le seuil de réussite est celui de la ligne du dessus — 0,999 —
  // et pas l'égalité : `verser` rend un flottant, et exiger l'exact ferait
  // déserter des colonnes parfaitement payées.
  for (const a of world.armees) {
    if (a.faction !== key) continue;
    const du = a.force * ETAT.parSoldat * heures;
    const paye = verser(world, key, colonieDepart(world, key, a.regionId), du);
    if (du <= 0 || paye >= du * 0.999) a.impayees = 0;
    else a.impayees = (a.impayees || 0) + heures;
  }
  jugerColonnes(world, key, heures, t, log);

  // Puis les comptes de ses villes : ce qu'elles doivent, ce qu'elles rendent,
  // ce qu'on leur prête encore, et celles qu'on laisse tomber.
  tickCredit(world, key, mesColonies, heures, log);

  // Racheter la créance d'une ville étrangère : une autre façon de prendre une
  // ville que par les armes. Plus lente, plus chère en argent, et sans une
  // colonne. Le porteur décide du prix — voir `prixCession` —, et le
  // tempérament décide si l'on est de ceux qui achètent.
  const chef = dirigeant(world, key);
  if (chef && ACHETEURS.includes(chef.temperament) && f.tresor > 4000
      && rng.chance(0.35 * penchant(world, key, 'expansion'))) {
    const convoitees = world.colonies.filter(
      (c) => !c.ruine && c.faction && c.faction !== key && c.dette > 500
        && c.creancier && c.creancier !== key
        && mesColonies.some((m) => distance(m.regionId, c.regionId) <= 6));
    for (const c of convoitees) {
      // On n'achète pas un boulet : la même valeur nette s'appliquera à nous.
      if (valeurNette(world, c, key) <= 0) continue;
      const r = racheterCreance(world, c, key, t);
      if (r.ok) {
        log({
          type: 'bourse',
          texte: `${drapeauDe(world, key).nom} rachète${drapeauDe(world, key).pluriel ? 'nt' : ''} `
            + `la dette de ${c.nom} pour ${r.prix} cr. `
            + `${drapeauDe(world, r.porteur).nom} ${drapeauDe(world, r.porteur).pluriel ? 'ont cédé' : 'a cédé'}.`,
          regionId: c.regionId,
          factions: [key, r.porteur],
          important: true,
        });
        break;
      }
    }
  }

  // Et le cours de sa monnaie, gagé sur un mois de la production du pays.
  // Prendre des villes renforce une monnaie, en perdre l'affaiblit, en imprimer
  // la dilue — sans qu'on ait eu à écrire une règle pour le dire.
  let production = 0;
  for (const col of mesColonies) {
    const p2 = productionColonie(world, col);
    for (const k of COMMODITY_KEYS) production += (p2[k] || 0) * COMMODITIES[k].prix;
  }
  majCours(world, key, production);

  // Et ce qu'on prélève au-delà de l'ordinaire se paie en grogne.
  const pression = pressionFiscale(world, key);
  if (pression !== 0) {
    for (const c of mesColonies) {
      c.unrest = Math.max(0, Math.min(1, c.unrest + pression));
    }
  }

  const maPuissance = puissance(world, key);
  const mesGuerres = guerresDe(world, key);

  // 1) Faire la paix si la guerre coûte trop cher
  for (const g of mesGuerres) {
    const autre = g.a === key ? g.b : g.a;
    const duree = t - g.depuis;
    const leur = puissance(world, autre);
    // Une guerre qui a obtenu ce qu'elle voulait s'arrête, même fraîche : c'est
    // ce qui distingue une campagne d'une usure sans objet.
    const but = etatDuBut(world, g, key);
    if (but === 'atteint' || but === 'perdu') {
      signerPaix(world, key, autre, t, log, but);
      continue;
    }
    const fatigue = duree / 900 + g.batailles * 0.08;
    const envie = Math.min(0.7, fatigue * 0.35 + (leur > maPuissance * 1.4 ? 0.25 : 0))
      * penchant(world, key, 'treve');
    if (duree > 220 && rng.chance(envie)) {
      signerPaix(world, key, autre, t, log);
    }
  }

  // 2) Déclarer une guerre si une cible est faible et mal aimée
  const enGuerreAvec = new Set(guerresDe(world, key).map((g) => (g.a === key ? g.b : g.a)));
  // Une cause donne du courage à qui n'en aurait pas eu : un chef que la guerre
  // ne tente pas se décide tout de même contre un régime qu'il réprouve.
  const indignation = Math.max(...diploDe(world).map(
    (k) => (k === key ? 0 : distanceMorale(world, key, k))));
  if (enGuerreAvec.size < 2 && rng.chance(f.agression * 0.5
      * penchant(world, key, 'guerre') * (1 + indignation * 1.8))) {
    const candidats = diploDe(world).filter(
      (k) => k !== key && !enGuerreAvec.has(k) && coloniesDe(world, k).length > 0
    ).map((k) => {
      const rel = relation(world, key, k);
      const rapport = maPuissance / Math.max(1, puissance(world, k));
      const prox = cibleLaPlusProche(world, key, k);
      if (!prox) return [k, 0];
      // Ce qu'on reproche à leur régime compte autant que ce qu'on convoite :
      // un Conciliateur ne fait la guerre à personne, sauf à un marchand
      // d'hommes.
      const morale = distanceMorale(world, key, k);
      const poids = Math.max(0, (40 - rel) / 40) * Math.max(0, rapport - 0.85)
        * (1 / (1 + prox.dist * 0.25)) * (1 + morale * 2.5);
      return [k, poids];
    }).filter((e) => e[1] > 0.02);
    if (candidats.length) {
      const victime = rng.weighted(candidats);
      const prox = cibleLaPlusProche(world, key, victime);
      // Quand c'est le régime qu'on vise et pas la carte, la guerre le dit.
      const morale = distanceMorale(world, key, victime);
      const but = morale > 0.45
        ? { type: 'abolition', texte: 'pour en finir avec leurs marchés d’hommes', batailles: rng.irange(2, 4) }
        : butDeGuerre(world, key, victime, rng, prox && prox.cible);
      declarerGuerre(world, key, victime, t, log, but);
    }
  }

  // 3) Lever des colonnes sur les fronts ouverts
  for (const g of guerresDe(world, key)) {
    const ennemi = g.a === key ? g.b : g.a;
    const dejaEnRoute = world.armees.filter((a) => a.faction === key).length;
    if (dejaEnRoute >= 2) break;
    if (!rng.chance(Math.min(1, 0.75 * penchant(world, key, 'colonne')))) continue;
    const prox = cibleLaPlusProche(world, key, ennemi);
    if (!prox) continue;
    const force = Math.min(
      Math.floor(f.tresor / 5.2),
      Math.round(prox.cible.defense * rng.range(1.1, 2.0) + 25)
    );
    if (force >= 25 && f.tresor >= coutArmee(force)) {
      leverArmee(world, key, force, prox.depuis.regionId, prox.cible.id, log);
    }
  }

  // 4) Reprendre une ville libre. Une révolte réussie laisse un bourg sans
  //    drapeau ; si personne ne va le chercher, la carte se remplit lentement
  //    de villes sans loi et le monde perd ses frontières. Un conseil qui voit
  //    une place vacante à trois jours de marche y envoie du monde — c'est bien
  //    moins cher que de fonder, et ça rapporte une ville faite.
  const libres = world.colonies.filter(
    (c) => !c.ruine && !c.faction
      && mesColonies.some((m) => distance(m.regionId, c.regionId) <= 5)
      // Une ville à vous n'est pas un terrain vague. Cette étape a été écrite
      // pour les bourgs qu'une révolte a laissés sans drapeau — personne ne les
      // tient, quelqu'un les prendra. Appliquée telle quelle à l'avant-poste du
      // joueur, elle en faisait une place vacante : la colonne partait dans les
      // cinquante heures suivant la déclaration, dimensionnée à une fois et
      // demie la défense, et vingt-trois villes sur vingt-quatre tombaient en
      // six mille heures — six niveaux de mur compris.
      //
      // On ne prend la ville de quelqu'un que si l'on a une raison de lui en
      // vouloir. La sûreté d'une ville tient donc à la diplomatie de celui qui
      // l'a bâtie, ce qui est très exactement le propos de ce jeu.
      && !(c.avantPoste && !(ctx && ctx.rancune && ctx.rancune(key)))
  );
  if (libres.length && !world.armees.some((a) => a.faction === key && a.cible === libres[0].id)) {
    const cible = libres.reduce((a, b) => {
      const da = Math.min(...mesColonies.map((m) => distance(m.regionId, a.regionId)));
      const db = Math.min(...mesColonies.map((m) => distance(m.regionId, b.regionId)));
      return db < da ? b : a;
    });
    const depuis = mesColonies.reduce((a, b) => (
      distance(b.regionId, cible.regionId) < distance(a.regionId, cible.regionId) ? b : a));
    const force = Math.max(25, Math.round(cible.defense * 1.6 + 20));
    // Pas pendant une guerre, et sans empressement : à 0,55 de chance par
    // séance, plus une seule ville ne restait libre en fin de partie et l'état
    // le plus intéressant du monde — un bourg sans drapeau ni loi — ne durait
    // jamais assez pour qu'on aille y voir.
    if (!guerresDe(world, key).length && f.tresor >= coutArmee(force) * 1.5
        && rng.chance(0.16 * penchant(world, key, 'expansion'))) {
      leverArmee(world, key, force, depuis.regionId, cible.id, log);
    }
  }

  // 5) Fonder : une faction riche et en paix pousse un nouveau poste sur une
  //    case vide de son voisinage. La carte bouge autrement que par conquête.
  const enPaix = !guerresDe(world, key).length;
  // Le plafond suit la taille de la carte. Écrit en dur à sept, il valait
  // « jamais » dès que le monde a compté cinquante-quatre villes pour six
  // factions : aucune n'était plus jamais sous son plafond, et plus une seule
  // ville n'a été fondée de toute une partie.
  const plafond = Math.max(7, Math.round(world.regions.length / 36));
  if (mesColonies.length < plafond
      && rng.chance(Math.min(0.9, 0.4 * penchant(world, key, 'expansion')))
      && f.tresor > (enPaix ? 1700 : 4200)) {
    // Une case libre, à portée de nos terres mais assez loin des villes
    // existantes pour ne pas se marcher dessus. Chercher parmi les seules
    // cases adjacentes était contradictoire : elles sont toutes à distance 1
    // d'une colonie, donc aucune ne passait jamais le filtre d'espacement.
    // Les deux filtres sont indépendants, donc l'ordre est libre — et il n'est
    // pas gratuit. « À portée de nos terres » ne regarde qu'une quinzaine de
    // villes et écarte la quasi-totalité des mille quatre cents cases ; « pas
    // trop près d'une ville » les regarde toutes, cinq cents désormais. Les
    // prendre dans l'autre sens faisait cinq cent mille appels à `distance` par
    // séance de conseil pour un résultat identique.
    const candidates = [];
    for (const r of world.regions) {
      if (r.colonie || r.biome === 'relais') continue;
      const aPortee = mesColonies.some((c) => distance(c.regionId, r.i) <= 3);
      if (!aPortee) continue;
      const tropPres = world.colonies.some((c) => !c.ruine && distance(c.regionId, r.i) < 2);
      if (!tropPres) candidates.push(r);
    }
    if (candidates.length) {
      const r = rng.pick(candidates);
      const col = fonderColonie(world, key, r, rng, t);
      // Ce que coûte de fonder va aux colons : c'est toute leur mise de départ,
      // et elle sort du trésor. Un tiers passe aussitôt en caisse commune — de
      // quoi commander un premier convoi, sans quoi la ville ne peut rien se
      // faire livrer et meurt avant d'avoir produit de quoi payer.
      verser(world, key, col, 1500);
      const fonds = Math.round((col.menages || 0) / 3);
      col.menages -= fonds;
      col.caisse = (col.caisse || 0) + fonds;
      crediterDirigeant(world, key, 'fondation');
      log({
        type: 'fondation',
        texte: `${drapeauDe(world, key).nom} fonde ${col.nom} en terrain vierge.`,
        regionId: r.i,
        factions: [key],
        important: true,
      });
      return;
    }
  }

  // 5) Sinon, investir : murs et défense — mais seulement là où l'ouvrage vaut
  //    ce que l'argent coûte. Un pays au loyer étouffant cesse visiblement de
  //    bâtir, et l'on peut dire de quelle ville il s'agit. Voir `veutBatir`.
  const aBatir = mesColonies.filter((c) => veutBatir(world, c));
  if (!guerresDe(world, key).length && f.tresor > 900 && aBatir.length
      && rng.chance(0.6)) {
    const col = rng.pick(aBatir);
    col.murs += 1;
    // Des murs se paient à des maçons, et les maçons habitent la ville.
    verser(world, key, col, 400);
    log({
      type: 'chantier',
      texte: `${drapeauDe(world, key).nom} renforce${drapeauDe(world, key).pluriel ? 'nt' : ''} les défenses de ${col.nom}.`,
      regionId: col.regionId,
      factions: [key],
      discret: true,
    });
  }
}

const NOMS_NEUFS = [
  'Aval', 'Bréchant', 'Cendrier', 'Dorne', 'Escarre', 'Fauvel', 'Givre',
  'Houle', 'Ithaque', 'Jonque', 'Klaxon', 'Limaille', 'Meute', 'Norne',
];

/** Crée une colonie neuve pour une faction. Petite, fragile, mais bien réelle. */
export function fonderColonie(world, key, region, rng, t) {
  const stock = {};
  for (const k of COMMODITY_KEYS) stock[k] = rng.irange(10, 60);
  world.prochaineColonieId = (world.prochaineColonieId || world.colonies.length) + 1;
  const col = {
    id: `s${world.prochaineColonieId}`,
    nom: `${rng.pick(['Poste', 'Halte', 'Camp', 'Enclos'])}-${rng.pick(NOMS_NEUFS)}`,
    regionId: region.i,
    faction: key,
    taille: 1,
    pop: rng.irange(90, 170),
    defense: 0,
    defenseMax: 0,
    murs: rng.irange(2, 5),
    stock,
    unrest: 0.1,
    marche: 1.35,
    // À zéro, les deux. Une ville neuve reçoit sa mise de départ du trésor qui
    // la fonde — voir `verser` chez l'appelant —, elle ne la trouve pas sous
    // ses pieds. Garnie d'office, elle fabriquait huit cents crédits à chaque
    // fondation, et l'invariant comptable s'en ressentait à la douzième heure
    // de la première partie mesurée.
    caisse: 0,
    menages: 0,
    dette: 0,
    creancier: null,
    cession: null,
    prises: 0,
    // Le hasard de cette ville, à elle seule — dérivé, jamais tiré.
    rngEtat: grainDe(world.graine, 'colonie', `s${world.prochaineColonieId}`),
    // Le registre des engagements du banc. Le banc lui-même se dérive.
    bancPris: null,
    vivier: [],
    geole: null,
    declin: 0,
    fondeeA: t,
    factionOrigine: key,
  };
  col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);
  col.defense = col.defenseMax;
  world.colonies.push(col);
  world.factions[key].colonies.push(col.id);
  region.colonie = col.id;
  region.controle = key;
  // Une ville neuve naît complète : des gens qui y travaillent, et quelqu'un
  // pour la tenir. La laisser vide jusqu'au premier tick, c'est la laisser sans
  // métiers ni notables pendant plusieurs heures de jeu, et tout ce qui la lit
  // doit alors se défendre contre l'absence.
  col.emplois = emploisInitiaux(world, col, rng);
  pourvoirCharges(col, rng, t);
  return col;
}

// ---------------------------------------------------------------------------
// Ce qu'on pense du régime d'en face
// ---------------------------------------------------------------------------

/** L'ordre des peines, du plus doux au plus dur : sert à mesurer un écart. */
const DURETE = { legere: 0, ferme: 1, expeditive: 2 };

/**
 * Ce que le régime de `autre` a d'insupportable pour `key`, entre 0 et 1.
 *
 * Les lois n'existaient que vers l'intérieur : autoriser le commerce d'hommes
 * abîmait la réputation du joueur auprès de tous ceux qui l'interdisaient, mais
 * les factions, elles, s'en moquaient entre elles. Un pays esclavagiste ne se
 * faisait aucun ennemi, et un voisin clément n'y voyait aucun motif — alors que
 * c'est le casus belli le plus évident qu'un monde puisse produire.
 *
 * Ce qui pèse : le commerce d'hommes d'abord, et de très loin ; l'écart de
 * sévérité ensuite, qui n'indigne personne mais éloigne. Et tout est pondéré
 * par le chef : un Rapace ne s'offusque de rien, un Conciliateur de tout.
 */
export function distanceMorale(world, key, autre) {
  const la = loisDe(world, key);
  const lb = loisDe(world, autre);
  const d = dirigeant(world, key);
  const temp = d ? TEMPERAMENTS[d.temperament] : null;
  const conscience = temp ? temp.humain : 1;
  let x = 0;
  // On ne reproche à personne ce qu'on pratique soi-même.
  if (lb.esclavage && !la.esclavage) x += 0.62;
  x += Math.abs((DURETE[lb.peine] ?? 1) - (DURETE[la.peine] ?? 1)) * 0.12;
  return Math.max(0, Math.min(1, x * conscience));
}

/**
 * Ce que les régimes d'en face font aux relations, séance après séance. Petit
 * par tour, décisif sur une saison : deux voisins que tout oppose finissent
 * sous le seuil où une guerre se déclare toute seule.
 */
function jugerLesAutres(world, key) {
  for (const autre of diploDe(world)) {
    if (autre === key) continue;
    if (!coloniesDe(world, autre).length) continue;
    const d = distanceMorale(world, key, autre);
    if (d > 0.25) majRelation(world, key, autre, -d * 2.2);
    else if (d < 0.05) majRelation(world, key, autre, 0.4);
  }
}

// ---------------------------------------------------------------------------
// Politique intérieure
// ---------------------------------------------------------------------------

/**
 * Combien de temps une loi tient avant qu'on puisse la rouvrir. Un conseil qui
 * légiférerait à chaque séance ne serait pas un gouvernement, ce serait du
 * bruit : le joueur verrait l'impôt changer trois fois par saison sans jamais
 * pouvoir en tirer de conclusion.
 */
export const DELAI_LOI = 700;

/** L'état d'un pays, tel que son conseil le lit avant de légiférer. */
function etatDuPays(world, key) {
  const villes = coloniesDe(world, key);
  if (!villes.length) return null;
  let grogne = 0;
  let routes = 0;
  for (const c of villes) {
    grogne += c.unrest || 0;
    routes += (world.regions[c.regionId].insecurite || 0);
  }
  return {
    villes,
    grogne: grogne / villes.length,
    routes: routes / villes.length,
    // Le trésor par ville : mille crédits pour une faction de deux villes et
    // pour une faction de douze, ce n'est pas la même aisance.
    caisse: world.factions[key].tresor / villes.length,
    enGuerre: guerresDe(world, key).length > 0,
  };
}

/** Le taux d'imposition que ce conseil vise, converti en palier réel. */
function impotVise(temp, pays) {
  // On part de l'ordinaire et on corrige : le caractère du chef, ce que coûte
  // la guerre, ce que la caisse permet, et ce que le pays supporte.
  //
  // La première version poussait systématiquement vers le haut : caisse basse
  // et guerre ajoutaient un demi-palier chacune sans rien pour les contredire,
  // l'impôt lourd faisait gronder, la grogne coupait les recettes, la caisse
  // restait basse. Une boucle qui ne se referme pas. Le banc l'a chiffrée en
  // A/B : 55 % des conseils à l'ordinaire, 31 % au lourd, 14 % au léger, et le
  // joueur perdait six escouades et huit avant-postes sur soixante parties.
  //
  // Ce qui la referme : un chef à la main légère ne répond pas à une caisse
  // vide en prélevant davantage — il coupe les dépenses —, et la grogne freine
  // en deux temps au lieu d'un.
  // La correction inverse a raté tout autant, et le banc l'a dit aussi : deux
  // freins en escalier qui se déclenchaient dès 32 % de grogne ont mis 74 % des
  // conseils à l'impôt léger, et le joueur y a perdu autant — des factions
  // pauvres lèvent moins de colonnes, donc tiennent moins les routes et donnent
  // moins d'ordres de mission. Les deux extrêmes coûtent, chacun à sa façon :
  // c'est ce qui fait que le choix de qui l'on sert compte.
  //
  // Ce qui reste : le caractère du chef décide de la ligne, les circonstances la
  // corrigent à la marge, et le frein de la grogne est continu au lieu d'être
  // un escalier qui bascule tout le monde du même côté.
  let cible = 0.05 + (temp.fisc - 1) * 0.075;
  if (pays.caisse < 700) cible += 0.02 * temp.fisc;
  if (pays.caisse > 3200) cible -= 0.015;
  if (pays.enGuerre && temp.fisc >= 1) cible += 0.015;
  cible -= Math.max(0, pays.grogne - 0.35) * 0.06;
  // On prend le palier le plus proche : un conseil ne vote pas 7,3 %.
  let best = IMPOTS[0];
  for (const imp of IMPOTS) {
    if (Math.abs(imp.taux - cible) < Math.abs(best.taux - cible)) best = imp;
  }
  return best;
}

/**
 * Le régime que ce conseil voudrait, et pourquoi.
 *
 * Trois pressions, chacune vers un régime, et la Charte quand aucune ne
 * l'emporte — c'est le régime ordinaire, celui qu'on garde faute de raison d'en
 * changer.
 *
 *   autorite  un chef dur, un pays qui gronde, une guerre : on serre. Domaine.
 *   partage   un chef humain, une caisse vide, du mécontentement à calmer :
 *             on donne l'école et le médecin, et l'on se paie sur les ventes.
 *   negoce    un chef à la main légère et un pays calme et riche : on ouvre.
 *
 * Le régime en place part avec une avance (`INERTIE_REGIME`). Sans elle, une
 * faction dont deux pressions se tiennent à trois centièmes bascule à chaque
 * séance, et le joueur ne peut plus rien apprendre de la carte : il trouverait
 * une Commune le lundi et un Domaine le mardi, au même endroit, sans qu'il se
 * soit rien passé.
 */
const INERTIE_REGIME = 0.3;

function regimeVise(temp, pays, actuel) {
  const scores = {
    domaine: (temp.severite - 1) + (1 - temp.humain) + pays.grogne * 0.5
      + (pays.enGuerre ? 0.2 : 0),
    commune: (temp.humain - 1) * 1.4 + pays.grogne * 0.5
      + (pays.caisse < 800 ? 0.2 : 0),
    franchise: (1 - temp.fisc) * 1.2 + (pays.caisse > 2200 ? 0.25 : 0)
      - pays.grogne * 0.4,
    // La Charte ne se réclame de rien : elle gagne quand les autres échouent.
    charte: 0.45,
  };
  scores[actuel] = (scores[actuel] || 0) + INERTIE_REGIME;
  let best = 'charte';
  for (const k of Object.keys(scores)) if (scores[k] > scores[best]) best = k;
  return best;
}

/** La sévérité que ce conseil juge nécessaire. */
export function peineVisee(temp, pays) {
  // Des routes sûres ne réclament pas de corde ; un pays qui gronde, si — et un
  // chef dur y voit toujours la solution, ce qui n'est pas la même chose que
  // d'avoir raison.
  const score = (temp.severite - 1) + (pays.routes - 0.3) * 1.6 + pays.grogne * 0.6;
  if (score > 0.35) return 'expeditive';
  if (score < -0.2) return 'legere';
  return 'ferme';
}

/**
 * Un conseil qui vote ses propres lois.
 *
 * Sans ça, le monde n'avait de politique intérieure que là où le joueur en
 * faisait : six factions gouvernaient toutes à l'impôt ordinaire et à la
 * justice ferme, pour toujours. Un Rapace à la tête des Corpos doit prélever
 * comme un rapace, et un Conciliateur doit relâcher — sinon le tempérament ne
 * veut rien dire ailleurs que sur un champ de bataille.
 *
 * Une exception, et c'est tout le sens du grade : **tant que le joueur tient la
 * charge de Commandeur, le conseil s'efface.** Il ne repasse derrière lui que
 * le jour où il l'a perdue — ce qui arrive quand ses lois ont ruiné le pays.
 */
function legiferer(world, key, t, log, ctx) {
  // Témoin du banc : on gèle la législation pour mesurer ce qu'elle coûte ou
  // rapporte au joueur. Voir test/equilibre.js, SANS=lois.
  if (ctx && ctx.sansLois) return;
  const lois = loisDe(world, key);
  if (ctx && ctx.legislateur === key) return;
  if (t - (lois.depuis || 0) < DELAI_LOI) return;
  const d = dirigeant(world, key);
  if (!d) return;
  const temp = TEMPERAMENTS[d.temperament];
  const pays = etatDuPays(world, key);
  if (!temp || !pays) return;

  const changements = [];

  const imp = impotVise(temp, pays);
  if (Math.abs(imp.taux - lois.impot) > 0.001) {
    const monte = imp.taux > lois.impot;
    lois.impot = imp.taux;
    changements.push(`l’impôt ${monte ? 'passe à' : 'retombe à'} ${Math.round(imp.taux * 100)} %`);
  }

  // Le régime change ce que le joueur a le droit de faire chez eux : posséder,
  // s'instruire, se faire soigner, ce qu'on retient sur ses ventes, ce que
  // l'armurier consent à sortir. C'est donc une loi comme les autres — sauf
  // qu'elle le regarde, lui, et pas seulement leurs sujets.
  // Le loyer de l'argent. Un chef à la main lourde prête cher ; et une caisse
  // vide fait monter le taux d'un cran — on cesse de prêter quand on n'a plus
  // rien, exactement comme on cesse de bâtir.
  let dir = directeurInitial(temp);
  if (pays.caisse < 700) dir = Math.min(0.07, dir * 1.6);
  else if (pays.caisse > 3200) dir = Math.max(0.01, dir * 0.75);
  const palier = DIRECTEURS.reduce(
    (a2, b2) => (Math.abs(b2.taux - dir) < Math.abs(a2.taux - dir) ? b2 : a2));
  if (Math.abs(palier.taux - lois.directeur) > 0.001) {
    const monte = palier.taux > lois.directeur;
    lois.directeur = palier.taux;
    changements.push(`le loyer de l’argent ${monte ? 'monte' : 'retombe'} `
      + `à ${palier.nom.toLowerCase()} (${Math.round(palier.taux * 100)} % par séance)`);
  }

  const reg = regimeVise(temp, pays, lois.regime);
  if (reg !== lois.regime) {
    lois.regime = reg;
    changements.push(`le régime devient ${REGIMES[reg].nom.toLowerCase()}`);
  }

  // La bourse : une faction qui tient assez de villes et dont la caisse suit
  // finit par organiser son économie au lieu de la laisser au hasard des
  // caravanes. C'est une décision de conseil comme les autres, et elle change
  // le monde bien au-delà de ses propres murs.
  if (veutOuvrirBourse(world, key, d.temperament) && ouvrirBourse(world, key, t)) {
    changements.push('une bourse des matières premières est ouverte');
  }
  // Un rancunier ne branche pas ses cours sur ceux du voisin, et un conquérant
  // n'a pas la tête à ça.
  if (aUneBourse(world, key) && veutAccord(d.temperament)) {
    const part = partenairePossible(world, key);
    if (part && signerAccord(world, key, part.key, t)) {
      changements.push(`les cours sont branchés sur ceux ${drapeauDe(world, part.key).genitif}`);
    }
  }

  const peine = peineVisee(temp, pays);
  if (peine !== lois.peine) {
    lois.peine = peine;
    changements.push(`la justice devient ${PEINES[peine].nom.toLowerCase()}`);
  }

  // L'esclavage ne se vote pas par idéologie : on l'ouvre quand la caisse est
  // vide et qu'on a un chef que ça n'empêche pas de dormir, on le referme quand
  // un autre chef arrive, quand on n'en a plus besoin, ou quand ça coûte trop
  // cher au-dehors.
  //
  // La première version exigeait en plus un pays calme — `grogne < 0.4` pour
  // ouvrir, `grogne > 0.55` pour fermer. Mesuré sur soixante-douze factions en
  // fin de partie : la caisse est vide dans 92 % des cas, le chef s'en accommode
  // dans 31 %, et **le pays est calme dans 11 %** — grogne médiane 0,63. Les
  // trois ensemble : 1 %, et zéro marché ouvert sur douze parties. La règle
  // était contradictoire, puisqu'un pays gronde justement parce qu'il est
  // ruiné : elle demandait la ruine et la sérénité en même temps. Tout ce qui
  // pend à l'esclavage — le prix des captifs, l'estime qu'on y perd, les
  // guerres d'abolition, le panneau de loi — n'était donc jamais atteignable.
  //
  // La grogne n'est plus une condition d'ouverture : elle en est la conséquence
  // (+0,06 plus bas), ce qui était déjà son rôle. Elle ne referme le marché que
  // lorsque le pays est réellement en train de se défaire.
  const veutOuvrir = !lois.esclavage && temp.humain < 0.85 && pays.caisse < 600;
  // On ferme aussi le marché quand il coûte une guerre : c'est la façon la plus
  // nette dont la pression extérieure entre dans la politique intérieure.
  const attaquePourCa = guerresDe(world, key).some(
    (g) => g.but && g.but.type === 'abolition' && g.batailles >= 2);
  const veutFermer = lois.esclavage
    && (temp.humain > 1.05 || pays.caisse > 2500 || pays.grogne > 0.8 || attaquePourCa);
  if (veutOuvrir || veutFermer) {
    lois.esclavage = veutOuvrir;
    changements.push(veutOuvrir
      ? 'le commerce d’hommes est ouvert'
      : 'le commerce d’hommes est fermé');
    for (const c of pays.villes) {
      c.unrest = Math.max(0, Math.min(1, c.unrest + (veutOuvrir ? 0.06 : -0.03)));
    }
  }

  if (!changements.length) return;
  lois.depuis = t;
  log({
    type: 'loi',
    texte: `${drapeauDe(world, key).nom} : ${d.titre} ${d.nom} légifère — ${changements.join(', ')}.`,
    important: true,
    factions: [key],
  });
}

// ---------------------------------------------------------------------------
// Tick global
// ---------------------------------------------------------------------------

/**
 * La cinquième issue : la colonne prend son indépendance.
 *
 * C'est l'exigence du propriétaire — « de nouvelles [factions] doivent pouvoir
 * être créées » — et le point du lot 6 d'`INDIVIDUS.md` qui était resté en
 * suspens faute de savoir fabriquer un drapeau.
 *
 * **Elle ne fonde que si elle a quelque chose à quitter.** Une colonne dont le
 * pays ne tient plus une seule ville se débande : sans ce garde, la même troupe
 * fonderait un pays par conseil, indéfiniment, et le monde se remplirait de
 * drapeaux d'un homme. On ne fait pas sécession de rien.
 *
 * Ce qu'elle emporte, et rien de plus (§4.2 du chantier) : ses hommes. Pas de
 * trésor, pas de ville, pas de dot. Sa masse monétaire est donc nulle et elle
 * le reste tant que personne ne lui verse rien — l'invariant comptable n'a rien
 * à voir dans cette naissance, et c'est ce qui la rend sûre.
 *
 * Elle n'est reconnue de personne au départ, par construction : `relations`
 * vide, aucune guerre, aucun accord. Le premier voisin qui se positionne la
 * reconnaît, et c'est la règle §4.1.
 *
 * Le nom se dérive de l'origine, comme le veut §4.5 : la ville d'où la colonne
 * a été levée, ou le nom de son capitaine si elle n'en a plus.
 */
function fonderColonne(world, a, key, t, log) {
  const f = world.factions[key];
  if (!f || !f.colonies || f.colonies.length === 0) return false;

  const capitaine = nommerActeur(world, 'colonne', a.id);
  const berceau = colonieDepart(world, key, a.regionId);
  const nom = berceau ? `Les Affranchis de ${berceau.nom}` : `La Compagnie de ${capitaine}`;
  const cle = `libre${a.id}`;
  if (world.factions[cle]) return false;

  world.drapeaux[cle] = {
    nom,
    court: nom.slice(0, 5).toUpperCase(),
    pluriel: !!berceau,
    datif: berceau ? `aux Affranchis de ${berceau.nom}` : `à la Compagnie de ${capitaine}`,
    genitif: berceau ? `des Affranchis de ${berceau.nom}` : `de la Compagnie de ${capitaine}`,
    couleur: couleurNeuve(world),
    devise: 'On ne nous paie plus. On ne sert plus.',
    // Un tempérament dérivé de l'événement, pas tiré du flux principal.
    agression: Number((0.35 + (a.id % 5) * 0.08).toFixed(2)),
    cupidite: Number((0.4 + (a.id % 4) * 0.12).toFixed(2)),
    style: 'commune',
    biomes: [world.regions[a.regionId].biome],
  };
  world.factions[cle] = {
    key: cle,
    nom,
    tresor: 0,
    agression: world.drapeaux[cle].agression,
    relations: {},
    colonies: [],
    capitale: null,
    humeur: 0,
    prochainConseil: 0,
    dernierConseil: t,
    lois: null,
    masse: 0,
    cours: 1,
    gageRef: 0,
    emissions: 0,
    bourse: false,
  };
  a.faction = cle;
  a.impayees = 0;
  if (log) {
    log({
      type: 'colonne',
      texte: `Le capitaine ${capitaine} plante son propre drapeau : ${nom}. `
        + `${drapeauDe(world, key).nom} ${drapeauDe(world, key).pluriel ? 'perdent' : 'perd'} `
        + `une colonne et ${drapeauDe(world, key).pluriel ? 'gagnent' : 'gagne'} un voisin.`,
      regionId: a.regionId,
      factions: [key, cle],
      important: true,
    });
  }
  return true;
}

/**
 * Ce que décide une colonne qu'on ne paie plus. Quatre issues, dans cet ordre.
 *
 * **La loyauté n'est pas un état** : elle se dérive de la légitimité du
 * dirigeant. Une colonne au service d'un chef assis endure deux fois plus
 * longtemps que celle d'un usurpateur, et il n'y a rien à stocker ni à migrer
 * pour ça.
 *
 * L'ordre compte. On regarde d'abord si quelqu'un paie mieux : des hommes qui
 * ont le choix entre déserter et changer de drapeau choisissent le drapeau. Le
 * payeur règle l'ardoise **depuis son propre trésor** — le circuit reste fermé,
 * et `auditer` le vérifie sur tout le déroulé.
 */
function jugerColonnes(world, key, heures, t, log) {
  const chef = dirigeant(world, key);
  const loyaute = COLONNE.grace * Math.max(0.2, (chef ? chef.legitimite : 50) / 50);
  for (const a of world.armees.slice()) {
    if (a.faction !== key || !(a.impayees > loyaute)) continue;

    // Issue 3 : se faire payer par une autre. Il faut un ennemi de son pays qui
    // puisse réellement solder l'ardoise — promettre ne suffit pas.
    const dette = a.force * ETAT.parSoldat * a.impayees;
    const payeur = Object.keys(world.factions).find(
      (k) => k !== key && k !== 'essaim' && enGuerre(world, k, key)
        && world.factions[k].tresor >= dette);
    if (payeur) {
      // L'argent sort du trésor du payeur et entre dans la ville où la colonne
      // a été levée : c'est là que vivent les gens qu'on solde.
      verser(world, payeur, colonieDepart(world, payeur, a.regionId), dette);
      a.faction = payeur;
      a.impayees = 0;
      if (log) {
        log({
          type: 'colonne',
          texte: `Le capitaine ${nommerActeur(world, 'colonne', a.id)} a retourné sa veste : `
            + `la solde de ${drapeauDe(world, payeur).nom} sonnait plus juste.`,
          regionId: a.regionId,
          factions: [key, payeur],
          important: true,
        });
      }
      continue;
    }

    // Issue 2 : s'affaiblir. La faim mord, et les désertions se comptent.
    const avant = a.force;
    a.force = Math.max(0, a.force * (1 - COLONNE.attrition * heures));
    if (log && Math.round(avant) > Math.round(a.force)) {
      log({
        type: 'colonne',
        texte: `La colonne de ${nommerActeur(world, 'colonne', a.id)} fond à vue d’œil : `
          + `${Math.round(avant)} hommes hier, ${Math.round(a.force)} ce matin, et pas une pièce.`,
        regionId: a.regionId,
        factions: [key],
      });
    }

    // Issue 4 : fonder son pays, ou se disloquer.
    if (a.force < COLONNE.debandade) {
      if (!fonderColonne(world, a, key, t, log)) {
        if (log) {
          log({
            type: 'colonne',
            texte: `La colonne de ${nommerActeur(world, 'colonne', a.id)} s’est débandée, `
              + `faute de solde. On en reverra certains sur les routes.`,
            regionId: a.regionId,
            factions: [key],
            important: true,
          });
        }
        dissoudre(world, a);
      }
    }
  }
}

export function tickFactions(world, t, log, ctx) {
  // Les cours se republient une fois par jour : une bourse affiche un prix,
  // elle ne le recalcule pas à chaque regard.
  tickBourses(world, t);
  // Chaque conseil délibère avec son propre hasard, dérivé du pays et de
  // l'heure — apatride, rien à ranger dans la sauvegarde. Tant qu'ils
  // puisaient au sac commun, un conseil qui tirait trois fois au lieu de deux
  // décalait tout ce qui venait après, y compris les caravanes et le climat.
  const sacCommun = ctx.rng;
  for (const key of Object.keys(world.factions)) {
    const f = world.factions[key];
    f.prochainConseil -= 1;
    if (f.prochainConseil <= 0) {
      ctx.rng = new Rng(grainDe(world.graine, 'conseil', key, t));
      conseil(world, key, t, log, ctx);
      ctx.rng = sacCommun;
    }
  }

  // Les chefs vieillissent une fois par jour de jeu, pas vingt-quatre : leur
  // usure se compte en années, pas en heures.
  if (t % 24 === 0) {
    for (const key of diploDe(world)) {
      // Un chef répond aussi de l'humeur de son pays, pas seulement de ses
      // guerres : la grogne moyenne entre directement dans sa légitimité.
      const pays = etatDuPays(world, key);
      tickDirigeant(world, key, new Rng(grainDe(world.graine, 'dirigeant', key, t)), 24, t, log,
        pays ? pays.grogne : 0);
    }
  }

  for (const armee of world.armees.slice()) {
    if (!world.armees.includes(armee)) continue;
    // Une colonne a son propre hasard, dérivé de son nom et de l'heure : deux
    // colonnes en campagne ne se décalent plus l'une l'autre.
    // Le dé de la colonne, posé à sa levée et rescellé chaque heure — pas
    // redérivé : hacher une chaîne par colonne et par heure coûtait un tiers du
    // tick, et la garde de vitesse l'a refusé. Même correction que pour les
    // convois.
    const rngA = new Rng(armee.rngEtat || grainDe(world.graine, 'armee', armee.id));
    ctx.rng = rngA;
    tickArmee(world, armee, t, log, ctx);
    armee.rngEtat = rngA.save();
    ctx.rng = sacCommun;
  }

  // Le plus fort se fait détester : les autres se liguent doucement contre
  // celui qui domine. Sans cela, le vainqueur d'une guerre gagne toutes les
  // suivantes et la carte se referme.
  if (t % 24 === 0) {
    let chef = null;
    let chefP = 0;
    for (const k of diploDe(world)) {
      if (!world.factions[k].colonies.length) continue;
      const p = puissance(world, k);
      if (p > chefP) { chefP = p; chef = k; }
    }
    if (chef) {
      for (const k of diploDe(world)) {
        if (k === chef || !world.factions[k].colonies.length) continue;
        majRelation(world, chef, k, -1.2);
      }
    }
  }

  // Dérive lente des relations vers la neutralité, sauf en guerre
  if (t % 24 === 0) {
    for (const a of diploDe(world)) {
      for (const b of diploDe(world)) {
        if (a >= b) continue;
        const v = relation(world, a, b);
        if (enGuerre(world, a, b)) {
          if (v > -100) majRelation(world, a, b, -1);
        } else if (v !== 0) {
          majRelation(world, a, b, v > 0 ? -0.5 : 0.5);
        }
      }
    }
  }
}

/** Faction qui domine réellement le monde, pour l'écran MONDE. */
export function classement(world) {
  return Object.keys(world.factions)
    .filter((k) => k !== 'essaim')
    .map((k) => ({
      key: k,
      nom: drapeauDe(world, k).nom,
      couleur: drapeauDe(world, k).couleur,
      puissance: puissance(world, k),
      colonies: world.factions[k].colonies.length,
      tresor: Math.round(world.factions[k].tresor),
    }))
    .sort((a, b) => b.puissance - a.puissance);
}
