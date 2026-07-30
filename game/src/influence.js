// Ce qu'un grade permet de faire, et ce dont il faut répondre.
//
// Première version, à jeter : le gradé « demandait », un dé décidait, et
// demander coûtait du capital politique qu'on ait été écouté ou non. C'était
// une aberration à deux titres. Un Commandeur n'implore pas son propre conseil,
// il commande. Et faire payer une décision refusée, c'est punir le joueur pour
// avoir cliqué.
//
// Ce qui remplace : un grade est une **charge**. Elle donne des prérogatives
// qu'on exerce directement — sans dé, sans coût, immédiatement, parce que c'est
// précisément ce que veut dire avoir de l'autorité. Ce qui la borne, ce n'est
// pas le hasard : c'est l'étendue de la charge, et le fait qu'on en répond.
//
//   Agent        ravitaille les siens, et rien d'autre.
//   Lieutenant   dispose des colonnes déjà levées : il les envoie où il veut.
//   Capitaine    lève des colonnes sur le trésor, fait fonder des postes.
//   Commandeur   déclare la guerre et signe la paix.
//
// Et l'on rend des comptes. Chaque acte est inscrit, son issue est jugée : une
// colonne qu'on a envoyée se faire détruire, une guerre qu'on a déclarée et
// perdue, cela se paie en crédit — et le crédit épuisé, on est rétrogradé. Le
// pouvoir n'est pas gratuit ; il est simplement réel.

import { FACTIONS, DIPLO_FACTIONS } from './data.js';
import { rangDe, groupesEngages, RANGS } from './allegeance.js';
import { dirigeant, crediterDirigeant, butDeGuerre } from './dirigeants.js';
import {
  declarerGuerre, signerPaix, fonderColonie, guerresDe, enGuerre, coloniesDe,
} from './factions.js';
import { colonieParId, distance, chemin } from './world.js';
import { loisDe, PEINES, IMPOTS } from './lois.js';

/**
 * Ce que chaque charge permet. `rang` est l'indice minimal dans RANGS.
 * Aucune de ces actions n'a de probabilité : on les exerce ou on n'y a pas
 * droit.
 */
export const PREROGATIVES = {
  envoyer: {
    nom: 'Envoyer une colonne',
    desc: 'Détourner une colonne déjà levée vers la ville de votre choix.',
    rang: 2, // Lieutenant
    charge: 'Vous répondez de ce qu’elle devient.',
  },
  lever: {
    nom: 'Lever une colonne',
    desc: 'Faire armer des hommes sur le trésor de la faction, et les envoyer.',
    rang: 3, // Capitaine
    charge: 'Le trésor est celui de vos gens. On vous demandera des comptes.',
  },
  fonder: {
    nom: 'Faire fonder un poste',
    desc: 'Ordonner qu’on plante un bourg sur une case libre de vos terres.',
    rang: 3,
    charge: 'Un poste qui s’effondre est un poste que vous avez voulu.',
  },
  garnison: {
    nom: 'Renforcer la garnison',
    desc: 'Payer des hommes et des murs pour la ville dont vous répondez.',
    rang: 3,
    charge: 'Le trésor est celui de vos gens ; la ville est la vôtre.',
  },
  grenier: {
    nom: 'Ouvrir les greniers',
    desc: 'Faire acheter du grain pour votre ville. Une ville qui mange se tait.',
    rang: 3,
    charge: 'Nourrir aujourd’hui ce qu’on n’a pas produit hier se paie demain.',
  },
  guerre: {
    nom: 'Déclarer la guerre',
    desc: 'Engager la faction contre une autre, sur-le-champ.',
    rang: 4, // Commandeur
    charge: 'Une guerre perdue coûte la place de celui qui l’a voulue.',
  },
  paix: {
    nom: 'Signer la paix',
    desc: 'Mettre fin aux hostilités, quoi qu’en pense le conseil.',
    rang: 4,
    charge: 'Une paix qui rend une ville se retient longtemps.',
  },
  loi: {
    nom: 'Fixer la loi',
    desc: 'La sévérité des peines, l’esclavage, l’impôt. Pour toute la faction.',
    rang: 4,
    charge: 'Une loi s’applique aussi à ceux qui l’ont votée.',
  },
};

export const PREROGATIVE_KEYS = Object.keys(PREROGATIVES);

/** Force d'une colonne levée sur ordre : elle suit ce que la faction peut payer. */
export const FORCE_LEVEE = 60;

// ---------------------------------------------------------------------------
// Charge et crédit
// ---------------------------------------------------------------------------

/** Le meilleur grade tenu auprès de cette faction, ou null. */
export function chargeAupres(state, faction) {
  let best = null;
  for (const g of groupesEngages(state, faction)) {
    const r = rangDe(g.allegeance);
    if (!best || r.index > best.index) best = r;
  }
  return best;
}

/**
 * Le crédit d'un officier : ce qui reste quand on a retranché ses échecs. Ce
 * n'est pas une monnaie qu'on dépense en commandant — commander est gratuit —,
 * c'est ce dont on répond. À zéro, on est relevé de sa charge.
 */
export function credit(state, faction) {
  let c = 0;
  for (const g of groupesEngages(state, faction)) {
    const all = g.allegeance;
    c += 100 + Math.min(120, all.points / 8) - (all.manques || 0) * 10;
    c -= (all.fautes || 0) * 25;
  }
  return Math.round(c);
}

export function peutExercer(state, faction, key) {
  const def = PREROGATIVES[key];
  if (!def) return { ok: false, motif: 'Prérogative inconnue.' };
  const charge = chargeAupres(state, faction);
  if (!charge) return { ok: false, motif: `Vous ne servez pas ${FACTIONS[faction].nom}.` };
  if (charge.index < def.rang) {
    return { ok: false, motif: `Charge de ${RANGS[def.rang].nom} requise.` };
  }
  if (!dirigeant(state.world, faction)) {
    return { ok: false, motif: 'Cette faction n’a plus de conseil.' };
  }
  if (credit(state, faction) <= 0) {
    return { ok: false, motif: 'On ne vous confie plus rien.' };
  }
  return { ok: true, charge };
}

/**
 * Inscrire un acte au dossier de l'officier. C'est là que la responsabilité
 * devient concrète : l'issue sera jugée quand elle sera connue, pas au moment
 * de décider.
 */
function inscrireActe(state, faction, acte) {
  state.stats.prerogatives = (state.stats.prerogatives || 0) + 1;
  if (acte.type === 'loi') {
    state.stats.loisPromulguees = (state.stats.loisPromulguees || 0) + 1;
  }
  for (const g of groupesEngages(state, faction)) {
    if (!g.allegeance.actes) g.allegeance.actes = [];
    g.allegeance.actes.push(acte);
    // On ne garde que ce dont on peut encore répondre.
    if (g.allegeance.actes.length > 8) g.allegeance.actes.shift();
    return g;
  }
  return null;
}

/** Une faute portée au dossier : elle ronge le crédit, et le crédit la charge. */
export function porterFaute(state, faction, quoi, log, n = 1) {
  for (const g of groupesEngages(state, faction)) {
    g.allegeance.fautes = (g.allegeance.fautes || 0) + n;
  }
  if (log) {
    log({
      type: 'influence',
      texte: `On vous impute ${quoi}. Le conseil ${FACTIONS[faction].genitif} en prend note.`,
      important: true,
      factions: [faction],
    });
  }
}

/** Un succès porté au dossier : il assoit la charge et fait monter. */
export function porterMerite(state, faction, quoi, points, log) {
  for (const g of groupesEngages(state, faction)) {
    g.allegeance.points += points;
    g.allegeance.fautes = Math.max(0, (g.allegeance.fautes || 0) - 1);
  }
  crediterDirigeant(state.world, faction, 'prise', 0);
  if (log) {
    log({
      type: 'influence',
      texte: `${quoi} On vous en sait gré.`,
      important: true,
      factions: [faction],
    });
  }
}

/**
 * Rétrogradation : quand le crédit est épuisé, la charge est retirée. C'est la
 * contrepartie de pouvoir ordonner sans rien demander à personne.
 */
export function tickCharges(state, log) {
  for (const g of state.player.groupes) {
    const all = g.allegeance;
    if (!all) continue;
    const rang = rangDe(all);
    if (rang.index < 2) continue;
    if (credit(state, all.faction) > 0) continue;
    // On retombe au grade précédent, et le compteur de fautes repart : on ne
    // dégringole pas toute l'échelle d'un coup pour une seule mauvaise passe.
    all.points = Math.max(0, RANGS[rang.index - 1].points);
    all.fautes = 0;
    all.manques = 0;
    log({
      type: 'allegeance',
      texte: `${FACTIONS[all.faction].nom} vous retire votre charge. `
        + `${g.nom} redescend au rang de ${RANGS[rang.index - 1].nom}.`,
      important: true,
      groupe: g.id,
      factions: [all.faction],
    });
  }
}

// ---------------------------------------------------------------------------
// Prérogatives
// ---------------------------------------------------------------------------

/** Les colonnes de la faction qu'un officier peut détourner. */
export function colonnesDe(state, faction) {
  return state.world.armees.filter((a) => a.faction === faction);
}

/** La ville de la faction la plus proche d'une case : d'où l'on part. */
export function villeLaPlusProche(world, faction, regionId) {
  let best = null;
  let d = Infinity;
  for (const c of coloniesDe(world, faction)) {
    const dd = distance(c.regionId, regionId);
    if (dd < d) { d = dd; best = c; }
  }
  return best;
}

/**
 * Envoyer une colonne où l'on veut. Immédiat, sans dé : c'est un ordre.
 * L'officier répond de ce qu'elle devient — voir `jugerActes`.
 */
export function envoyerColonne(state, faction, armeeId, cibleId, log) {
  const v = peutExercer(state, faction, 'envoyer');
  if (!v.ok) return v;
  const a = state.world.armees.find((x) => x.id === armeeId && x.faction === faction);
  if (!a) return { ok: false, motif: 'Cette colonne n’existe plus.' };
  const col = colonieParId(state.world, cibleId);
  if (!col || col.ruine) return { ok: false, motif: 'Cette ville n’existe plus.' };
  a.cible = cibleId;
  a.route = chemin(state.world, a.regionId, col.regionId) || [];
  a.etape = 0;
  a.progres = 0;
  a.etat = 'marche';
  a.surOrdre = true;
  inscrireActe(state, faction, { type: 'envoi', armee: a.id, cible: cibleId, t: state.temps });
  if (log) {
    log({
      type: 'influence',
      texte: `Sur votre ordre, une colonne ${FACTIONS[faction].genitif} marche sur ${col.nom}.`,
      important: true,
      factions: [faction],
    });
  }
  return { ok: true };
}

/** Ce que coûte une colonne levée sur ordre. */
export function coutLevee() {
  return Math.round(FORCE_LEVEE * 5.2);
}

/**
 * Lever une colonne sur le trésor. Le trésor est celui de vos gens.
 *
 * `depuisId` peut être nul : un officier dit « marchez sur X », il ne dit pas
 * de quelle caserne on sort. On part alors de la plus proche des nôtres.
 */
export function leverColonne(state, faction, depuisId, cibleId, log) {
  const v = peutExercer(state, faction, 'lever');
  if (!v.ok) return v;
  const f = state.world.factions[faction];
  const cout = coutLevee();
  if (f.tresor < cout) {
    return { ok: false, motif: `Le trésor ne suit pas : ${Math.round(f.tresor)} / ${cout} cr.` };
  }
  const cible = colonieParId(state.world, cibleId);
  if (!cible || cible.ruine) return { ok: false, motif: 'Cette ville n’existe plus.' };
  const depuis = depuisId
    ? colonieParId(state.world, depuisId)
    : villeLaPlusProche(state.world, faction, cible.regionId);
  if (!depuis || depuis.faction !== faction) return { ok: false, motif: 'Il faut partir d’une de vos villes.' };
  f.tresor -= cout;
  const a = {
    id: `a${state.world.prochainArmeeId++}`,
    faction,
    regionId: depuis.regionId,
    force: FORCE_LEVEE,
    forceMax: FORCE_LEVEE,
    cible: cibleId,
    route: chemin(state.world, depuis.regionId, cible.regionId) || [],
    etape: 0,
    progres: 0,
    etat: 'marche',
    ravitaillement: 60 + Math.round(FORCE_LEVEE / 4),
    surOrdre: true,
  };
  state.world.armees.push(a);
  inscrireActe(state, faction, { type: 'levee', armee: a.id, cible: cibleId, cout, t: state.temps });
  if (log) {
    log({
      type: 'influence',
      texte: `Sur votre ordre, ${FACTIONS[faction].nom} lève une colonne à ${depuis.nom} `
        + `pour marcher sur ${cible.nom} (${cout} cr).`,
      important: true,
      factions: [faction],
    });
  }
  return { ok: true, armee: a };
}

// ---------------------------------------------------------------------------
// Fonder
// ---------------------------------------------------------------------------

/** Ce que coûte un poste neuf au trésor de la faction. */
export const COUT_POSTE = 1500;

/**
 * Les cases où l'on peut planter un bourg : libres, à portée de nos terres, et
 * pas dans les jambes d'une ville existante. Les mêmes règles que celles que
 * suit le conseil quand il décide seul — un officier ne fonde pas ailleurs, il
 * fonde plus tôt.
 */
export function sitesFondation(world, faction) {
  const miennes = coloniesDe(world, faction);
  if (!miennes.length) return [];
  const sites = [];
  for (const r of world.regions) {
    if (r.colonie || r.biome === 'relais') continue;
    if (world.colonies.some((c) => !c.ruine && distance(c.regionId, r.i) < 2)) continue;
    if (!miennes.some((c) => distance(c.regionId, r.i) <= 3)) continue;
    sites.push(r);
  }
  return sites;
}

/**
 * Ordonner qu'on plante un poste. L'officier choisit la case ; ce qu'il ne
 * choisit pas, c'est si le poste tiendra — et c'est de cela qu'on lui
 * demandera compte.
 */
export function fonderPoste(state, faction, regionIndex, rng, log) {
  const v = peutExercer(state, faction, 'fonder');
  if (!v.ok) return v;
  const f = state.world.factions[faction];
  if (f.tresor < COUT_POSTE) {
    return { ok: false, motif: `Le trésor ne suit pas : ${Math.round(f.tresor)} / ${COUT_POSTE} cr.` };
  }
  const r = state.world.regions[regionIndex];
  if (!r) return { ok: false, motif: 'Cette case n’existe pas.' };
  if (!sitesFondation(state.world, faction).some((s) => s.i === r.i)) {
    return { ok: false, motif: 'On ne fonde pas là : trop loin des vôtres, ou trop près d’une ville.' };
  }
  f.tresor -= COUT_POSTE;
  const col = fonderColonie(state.world, faction, r, rng, state.temps);
  crediterDirigeant(state.world, faction, 'fondation');
  inscrireActe(state, faction, { type: 'fondation', colonie: col.id, t: state.temps });
  if (log) {
    log({
      type: 'fondation',
      texte: `Sur votre ordre, ${FACTIONS[faction].nom} plante ${col.nom} `
        + `(${COUT_POSTE} cr). On verra bien si ça tient.`,
      important: true,
      regionId: r.i,
      factions: [faction],
    });
  }
  return { ok: true, colonie: col };
}

// ---------------------------------------------------------------------------
// Guerre et paix
// ---------------------------------------------------------------------------

/** Contre qui l'on peut encore déclarer la guerre. */
export function cibleGuerre(state, faction) {
  return DIPLO_FACTIONS.filter((k) => k !== faction
    && !enGuerre(state.world, faction, k)
    && coloniesDe(state.world, k).length > 0);
}

/**
 * Déclarer la guerre. Pas de délibération : un Commandeur qui veut la guerre
 * l'a. Ce qu'il n'a pas, c'est le droit de la perdre impunément — la balance
 * des villes au moment de la déclaration est notée, et relue à la paix.
 */
export function declarerGuerreA(state, faction, contre, rng, log) {
  const v = peutExercer(state, faction, 'guerre');
  if (!v.ok) return v;
  if (!cibleGuerre(state, faction).includes(contre)) {
    return { ok: false, motif: 'Pas contre ceux-là.' };
  }
  const prox = plusProche(state.world, faction, contre);
  declarerGuerre(state.world, faction, contre, state.temps, log,
    butDeGuerre(state.world, faction, contre, rng, prox));
  inscrireActe(state, faction, {
    type: 'guerre',
    contre,
    villes: coloniesDe(state.world, faction).length,
    t: state.temps,
  });
  return { ok: true };
}

/** La ville ennemie la plus proche des nôtres : ce qu'une guerre vise d'abord. */
function plusProche(world, faction, contre) {
  const miennes = coloniesDe(world, faction);
  let best = null;
  let d = Infinity;
  for (const c of coloniesDe(world, contre)) {
    for (const m of miennes) {
      const dd = distance(m.regionId, c.regionId);
      if (dd < d) { d = dd; best = c; }
    }
  }
  return best;
}

/** Les guerres qu'on peut arrêter d'un trait de plume. */
export function guerresArretables(state, faction) {
  return guerresDe(state.world, faction).map((g) => ({
    guerre: g,
    contre: g.a === faction ? g.b : g.a,
  }));
}

/**
 * Signer la paix. Immédiate elle aussi — et jugée sur-le-champ, parce qu'une
 * paix se lit tout de suite : on a obtenu ce qu'on voulait, ou on a rendu.
 */
export function signerPaixAvec(state, faction, contre, log) {
  const v = peutExercer(state, faction, 'paix');
  if (!v.ok) return v;
  const g = guerresDe(state.world, faction).find(
    (w) => w.a === contre || w.b === contre
  );
  if (!g) return { ok: false, motif: 'Vous n’êtes pas en guerre avec eux.' };
  const etat = etatGuerre(state.world, g, faction);
  signerPaix(state.world, faction, contre, state.temps, log, etat === 'atteint' ? 'atteint' : null);
  if (etat === 'atteint') {
    porterMerite(state, faction,
      `La paix ${FACTIONS[contre].genitif} scelle ce que vous étiez allé chercher.`, 90, log);
  } else if (etat === 'perdu') {
    porterFaute(state, faction, 'une paix signée les mains vides', log);
  }
  return { ok: true };
}

/**
 * Où en est une guerre pour nous. On reprend le but s'il y en a un ; sinon on
 * s'en remet au nombre de batailles perdues, faute de mieux.
 */
function etatGuerre(world, g, faction) {
  const but = g.but;
  if (but && but.type === 'conquete' && but.villeId) {
    const ville = colonieParId(world, but.villeId);
    if (ville && ville.faction === faction) return 'atteint';
    return g.batailles > 2 ? 'perdu' : null;
  }
  if (but && but.batailles) return g.batailles >= but.batailles ? 'atteint' : 'perdu';
  return null;
}

// ---------------------------------------------------------------------------
// La ville confiée
// ---------------------------------------------------------------------------

/** Ce que coûte un cran de garnison, et ce qu'il rapporte en défense. */
export const COUT_GARNISON = 700;
export const COUT_GRENIER = 500;

/** La ville dont on répond : celle qui est au centre de son secteur. */
export function villeConfiee(state, faction) {
  for (const g of groupesEngages(state, faction)) {
    const s = g.allegeance.secteur;
    if (s && s.ville) {
      const col = colonieParId(state.world, s.ville);
      if (col && !col.ruine && col.faction === faction) return col;
    }
  }
  return null;
}

/**
 * Renforcer la garnison. Un Capitaine ne demande pas des murs : il les fait
 * payer. Ce qu'il ne peut pas faire, c'est les payer indéfiniment — le trésor
 * est celui de ses gens, et le conseil relit les comptes.
 */
export function renforcerGarnison(state, faction, log) {
  const v = peutExercer(state, faction, 'garnison');
  if (!v.ok) return v;
  const col = villeConfiee(state, faction);
  if (!col) return { ok: false, motif: 'Aucune ville ne vous est confiée.' };
  const f = state.world.factions[faction];
  if (f.tresor < COUT_GARNISON) {
    return { ok: false, motif: `Le trésor ne suit pas : ${Math.round(f.tresor)} / ${COUT_GARNISON} cr.` };
  }
  f.tresor -= COUT_GARNISON;
  col.murs += 2;
  col.defenseMax = Math.round(col.pop * 0.09 + col.murs * 12);
  col.defense = Math.min(col.defenseMax, col.defense + Math.round(col.defenseMax * 0.3));
  if (log) {
    log({
      type: 'influence',
      texte: `Sur votre ordre, on relève les murs de ${col.nom} (${COUT_GARNISON} cr).`,
      important: true,
      regionId: col.regionId,
      factions: [faction],
    });
  }
  return { ok: true, colonie: col };
}

/** Ouvrir les greniers : la ville mange, la ville se tait. Un temps. */
export function ouvrirGreniers(state, faction, log) {
  const v = peutExercer(state, faction, 'grenier');
  if (!v.ok) return v;
  const col = villeConfiee(state, faction);
  if (!col) return { ok: false, motif: 'Aucune ville ne vous est confiée.' };
  const f = state.world.factions[faction];
  if (f.tresor < COUT_GRENIER) {
    return { ok: false, motif: `Le trésor ne suit pas : ${Math.round(f.tresor)} / ${COUT_GRENIER} cr.` };
  }
  f.tresor -= COUT_GRENIER;
  col.stock.rations = (col.stock.rations || 0) + Math.round(col.pop * 0.9);
  col.unrest = Math.max(0, (col.unrest || 0) - 0.18);
  if (log) {
    log({
      type: 'influence',
      texte: `Sur votre ordre, ${col.nom} distribue du grain (${COUT_GRENIER} cr). On se tait, pour l’instant.`,
      important: true,
      regionId: col.regionId,
      factions: [faction],
    });
  }
  return { ok: true, colonie: col };
}

// ---------------------------------------------------------------------------
// La loi
// ---------------------------------------------------------------------------

/**
 * Fixer la loi. Un Commandeur ne propose pas une réforme : il la promulgue.
 * Ce qu'il ne contrôle pas, c'est ce que le pays en fait — l'impôt lourd
 * remplit le trésor et fait gronder les villes, la peine expéditive tient les
 * routes et fait peur, l'esclavage enrichit et fait de vous ce qu'on dit.
 */
export function fixerLoi(state, faction, quoi, valeur, log) {
  const v = peutExercer(state, faction, 'loi');
  if (!v.ok) return v;
  const lois = loisDe(state.world, faction);
  let texte = null;
  if (quoi === 'peine') {
    if (!PEINES[valeur]) return { ok: false, motif: 'Cette peine n’existe pas.' };
    if (lois.peine === valeur) return { ok: false, motif: 'C’est déjà la loi.' };
    lois.peine = valeur;
    texte = `Justice ${PEINES[valeur].nom.toLowerCase()} : ${PEINES[valeur].desc}`;
  } else if (quoi === 'esclavage') {
    const veut = !!valeur;
    if (lois.esclavage === veut) return { ok: false, motif: 'C’est déjà la loi.' };
    lois.esclavage = veut;
    texte = veut
      ? 'Le commerce d’hommes est autorisé. Les marchés s’ouvriront vite.'
      : 'Le commerce d’hommes est interdit. Les marchés fermeront lentement.';
    // Ce n'est pas une décision technique : on est jugé dessus, par les autres
    // factions et par ses propres villes.
    for (const col of coloniesDe(state.world, faction)) {
      col.unrest = Math.max(0, Math.min(1, (col.unrest || 0) + (veut ? 0.06 : -0.03)));
    }
  } else if (quoi === 'impot') {
    const taux = IMPOTS.find((x) => x.key === valeur);
    if (!taux) return { ok: false, motif: 'Ce taux n’existe pas.' };
    if (lois.impot === taux.taux) return { ok: false, motif: 'C’est déjà la loi.' };
    lois.impot = taux.taux;
    texte = `Impôt ${taux.nom.toLowerCase()} : ${taux.desc}`;
  } else {
    return { ok: false, motif: 'On ne légifère pas là-dessus.' };
  }
  // Une loi promulguée par le joueur est une loi comme une autre : elle tient
  // son délai avant que quiconque puisse la rouvrir, conseil compris.
  lois.depuis = state.temps;
  inscrireActe(state, faction, { type: 'loi', quoi, t: state.temps });
  if (log) {
    log({
      type: 'influence',
      texte: `${FACTIONS[faction].nom} promulgue votre loi. ${texte}`,
      important: true,
      factions: [faction],
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Jugement
// ---------------------------------------------------------------------------

/** Au bout de combien d'heures un acte cesse d'être en suspens. */
const DELAI_JUGEMENT = 1200;

/**
 * Juger ce qu'on a ordonné. Appelé au tick : une colonne détruite est une faute,
 * une ville prise est un mérite, un poste qui s'effondre est un poste qu'on a
 * voulu. C'est ce qui donne son poids à l'autorité — le grade ne coûte rien à
 * l'exercice, il coûte à l'arrivée.
 */
export function jugerActes(state, log) {
  for (const g of state.player.groupes) {
    const all = g.allegeance;
    if (!all || !all.actes || !all.actes.length) continue;
    const restants = [];
    for (const acte of all.actes) {
      if (!juger(state, all.faction, acte, log)) restants.push(acte);
    }
    all.actes = restants;
  }
}

/** Vrai quand l'acte est soldé — jugé, ou trop vieux pour qu'on y revienne. */
function juger(state, faction, acte, log) {
  const w = state.world;
  const vieux = state.temps - acte.t >= DELAI_JUGEMENT;

  if (acte.type === 'envoi' || acte.type === 'levee') {
    const a = w.armees.find((x) => x.id === acte.armee);
    const col = colonieParId(w, acte.cible);
    if (a) return vieux; // toujours en campagne : rien à juger, sauf enlisement
    // La colonne n'existe plus : soit elle a pris la ville, soit elle est morte.
    if (col && col.faction === faction) {
      porterMerite(state, faction, `${col.nom} est tombée comme vous l’aviez ordonné.`, 120, log);
    } else {
      porterFaute(state, faction, 'la perte d’une colonne que vous aviez envoyée', log);
    }
    return true;
  }

  if (acte.type === 'fondation') {
    const col = colonieParId(w, acte.colonie);
    if (!col || col.ruine || col.faction !== faction) {
      porterFaute(state, faction, 'la perte d’un poste que vous aviez fait fonder', log);
      return true;
    }
    if (!vieux) return false;
    porterMerite(state, faction, `${col.nom} tient, et c’est vous qui l’avez voulue.`, 80, log);
    return true;
  }

  if (acte.type === 'loi') {
    // Une loi se juge sur ce qu'elle a fait au pays, pas sur son intention.
    if (!vieux) return false;
    let trouble = 0;
    const villes = coloniesDe(w, faction);
    for (const c of villes) trouble += c.unrest || 0;
    const moyen = villes.length ? trouble / villes.length : 0;
    if (moyen > 0.55) {
      porterFaute(state, faction, 'un pays qui gronde depuis vos lois', log);
    } else if (moyen < 0.2) {
      porterMerite(state, faction, 'Le pays est calme, et vos lois y sont pour quelque chose.', 70, log);
    }
    return true;
  }

  if (acte.type === 'guerre') {
    if (enGuerre(w, faction, acte.contre)) return false; // elle dure : on attend
    const maintenant = coloniesDe(w, faction).length;
    if (maintenant > acte.villes) {
      porterMerite(state, faction,
        `Votre guerre ${FACTIONS[acte.contre].genitif} a rapporté une ville.`, 110, log);
    } else if (maintenant < acte.villes) {
      porterFaute(state, faction, 'une guerre déclarée par vous et payée par les autres', log, 2);
    }
    return true;
  }

  return true;
}
