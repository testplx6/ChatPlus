// Allégeance. Jusqu'ici les factions étaient un décor avec lequel on
// commerçait ; on peut désormais entrer à leur service, monter en grade, en
// recevoir des ordres et en tirer des avantages concrets.
//
// C'est la progression longue du jeu : la réputation était un chiffre, le grade
// est une position dans le monde.

import { FACTIONS, DIPLO_FACTIONS, COMMODITIES } from './data.js';
import { colonieParId, distance } from './world.js';
import { idDepuisRng } from './characters.js';
import { groupes, groupeActif } from './groupes.js';

export const RANGS = [
  {
    nom: 'Affilié', points: 0, remise: 0.05, solde: 10, ration: 3,
    desc: 'On vous laisse entrer par la porte de service, et on vous nourrit.',
  },
  {
    nom: 'Agent', points: 130, remise: 0.10, solde: 30, ration: 6,
    desc: 'On vous connaît. Les péages ne vous concernent plus.',
  },
  {
    nom: 'Lieutenant', points: 380, remise: 0.16, solde: 75, ration: 10,
    desc: 'Les armuriers vous sortent ce qu’ils gardent derrière, et leurs villes vous logent.',
  },
  {
    nom: 'Capitaine', points: 850, remise: 0.22, solde: 160, ration: 15,
    desc: 'On vous soigne sans compter, et on vient parfois à votre secours.',
  },
  {
    nom: 'Commandeur', points: 1700, remise: 0.30, solde: 300, ration: 22,
    desc: 'Votre nom vaut un ordre écrit.',
  },
];

/**
 * Réputation minimale pour être seulement reçu.
 *
 * Vingt, c'était deux ou trois contrats honorés pour la même faction avant
 * qu'on vous parle — et remplir un contrat est l'une des choses les plus dures
 * du jeu sur une grande carte. Le banc était formel : sur quarante-huit
 * parties, le bot entrait au service de quelqu'un dans zéro à deux d'entre
 * elles. La troisième voie n'existait pas.
 *
 * Dix : on démarre à douze auprès de la faction qui vous accueille, donc
 * s'engager chez elle est une décision d'ouverture, pas une récompense de
 * milieu de partie. Les autres demandent un minimum de bonne volonté. Ce qui
 * se mérite, ce sont les grades — et là, rien n'a bougé.
 */
export const REPUTATION_MINIMALE = 10;

/** Le premier groupe en `regionId` qui porte assez de `key`. */
function porteurA(state, regionId, key, quantite) {
  return groupes(state).find(
    (g) => g.regionId === regionId && (g.inventaire[key] || 0) >= quantite
  ) || null;
}

export function rangDe(all) {
  if (!all) return null;
  let i = 0;
  for (let k = 0; k < RANGS.length; k++) {
    if (all.points >= RANGS[k].points) i = k;
  }
  return { index: i, def: RANGS[i], suivant: RANGS[i + 1] || null };
}

/**
 * L'engagement d'un groupe. C'était `state.player.allegeance` — un seul pour
 * toute la partie —, ce qui rendait les trois voies exclusives : on ne pouvait
 * pas envoyer une colonne au service des Corpos pendant qu'une autre bâtit un
 * camp. C'est pourtant exactement comme ça qu'une compagnie de mercenaires
 * travaille, et c'est ce qui rend les voies complémentaires plutôt que
 * concurrentes.
 *
 * La réputation, elle, reste au joueur : une faction sait qui vous êtes, pas
 * quelle colonne se tient devant elle.
 */
export function allegeanceDe(g) {
  return (g && g.allegeance) || null;
}

/** Les groupes actuellement au service de quelqu'un. */
export function groupesEngages(state, faction) {
  return (state.player.groupes || []).filter(
    (g) => g.allegeance && (!faction || g.allegeance.faction === faction)
  );
}

/** Le meilleur grade obtenu auprès de cette faction, tous groupes confondus. */
export function meilleurGrade(state, faction) {
  let best = null;
  for (const g of groupesEngages(state, faction)) {
    const r = rangDe(g.allegeance);
    if (!best || r.index > best.index) best = r;
  }
  return best;
}

export function estAuService(state, faction, groupe) {
  if (groupe) return !!(groupe.allegeance && groupe.allegeance.faction === faction);
  return groupesEngages(state, faction).length > 0;
}

/** Remise consentie par sa propre faction, 0 ailleurs. */
export function remiseDe(state, faction) {
  if (!estAuService(state, faction)) return 0;
  const r = meilleurGrade(state, faction);
  return r ? r.def.remise : 0;
}

/** Palier d'équipement supplémentaire débloqué chez les siens. */
export function palierBonus(state, faction) {
  const r = meilleurGrade(state, faction);
  return r && r.index >= 2 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Entrer et sortir
// ---------------------------------------------------------------------------

export function peutSEngager(state, faction, groupe) {
  const g = groupe || groupeActif(state);
  if (!FACTIONS[faction] || faction === 'essaim') {
    return { ok: false, motif: 'Cette faction n’enrôle personne.' };
  }
  if (g && g.allegeance) {
    return { ok: false, motif: `${g.nom} sert déjà ${FACTIONS[g.allegeance.faction].genitif}.` };
  }
  // On ne sert pas deux camps en guerre l'un contre l'autre, même avec deux
  // colonnes différentes : ça se sait.
  for (const autre of groupesEngages(state)) {
    const enGuerre = state.world.guerres.some(
      (w) => (w.a === faction && w.b === autre.allegeance.faction)
        || (w.b === faction && w.a === autre.allegeance.faction)
    );
    if (enGuerre) {
      return {
        ok: false,
        motif: `${autre.nom} sert ${FACTIONS[autre.allegeance.faction].genitif}, en guerre contre eux.`,
      };
    }
  }
  const rep = state.player.reputation[faction] || 0;
  if (rep < REPUTATION_MINIMALE) {
    return { ok: false, motif: `Réputation insuffisante : ${Math.round(rep)} / ${REPUTATION_MINIMALE}.` };
  }
  return { ok: true };
}

export function sEngager(state, faction, log, groupe) {
  const g = groupe || groupeActif(state);
  if (!g) return { ok: false, motif: 'Aucun groupe.' };
  const v = peutSEngager(state, faction, g);
  if (!v.ok) return v;

  g.allegeance = {
    faction,
    points: 0,
    depuis: state.temps,
    ordre: null,
    prochainOrdre: state.temps + 60,
    // Dernière fois qu'on est passé à l'intendance.
    intendance: state.temps,
    manques: 0,
    derniereSolde: state.temps,
  };

  // On ne choisit pas un camp sans que l'autre le remarque.
  for (const w of state.world.guerres) {
    const autre = w.a === faction ? w.b : w.b === faction ? w.a : null;
    if (!autre) continue;
    state.player.reputation[autre] = Math.max(-100, (state.player.reputation[autre] || 0) - 20);
  }

  log({
    type: 'allegeance',
    texte: `${g.nom} entre au service ${FACTIONS[faction].genitif}. Rang : ${RANGS[0].nom}.`,
    important: true,
    groupe: g.id,
  });
  return { ok: true };
}

export function quitter(state, log, groupe) {
  const g = groupe || groupeActif(state);
  const all = allegeanceDe(g);
  if (!all) return { ok: false, motif: 'Cette colonne ne sert personne.' };
  const f = all.faction;
  g.allegeance = null;
  state.player.reputation[f] = Math.max(-100, (state.player.reputation[f] || 0) - 30);
  log({
    type: 'allegeance',
    texte: `Vous rompez avec ${FACTIONS[f].nom}. On n’oublie pas ce genre de départ.`,
    important: true,
  });
  return { ok: true };
}

/** Points de service gagnés. Retourne le nombre de grades franchis. */
// ---------------------------------------------------------------------------
// Garnison
// ---------------------------------------------------------------------------

/** Grade à partir duquel les villes des siens vous logent. */
export const RANG_GARNISON = 2; // Lieutenant

/**
 * Ce qu'une ville de votre faction vous offre quand vous y avez un grade.
 *
 * C'est le pendant de l'avant-poste, et le lien entre la deuxième voie et la
 * troisième plutôt que leur concurrence : le colon se bâtit une maison,
 * l'engagé se la fait prêter. On y dort à l'abri et on y est soigné — ce que
 * coûterait sinon un baraquement et une infirmerie.
 */
export function garnison(state, regionId, groupe) {
  const g = groupe || (state.player.groupes || []).find((x) => x.regionId === regionId);
  const all = allegeanceDe(g);
  if (!all) return null;
  if (rangDe(all).index < RANG_GARNISON) return null;
  const r = state.world.regions[regionId];
  if (!r || !r.colonie) return null;
  const col = state.world.colonies.find((c) => c.id === r.colonie);
  if (!col || col.ruine || col.faction !== all.faction) return null;
  return col;
}

// ---------------------------------------------------------------------------
// Intendance
// ---------------------------------------------------------------------------

/** Au-delà, on ne cumule plus : une intendance n'est pas un compte en banque. */
export const JOURS_INTENDANCE = 5;

/**
 * Ce qui distingue vraiment cette voie des deux autres : on ne vous paie pas
 * pour que vous achetiez à manger, on vous nourrit. Le colon produit ses
 * vivres, le nomade les achète, l'engagé les touche.
 *
 * Il faut passer les prendre : une escouade partie dix jours sur les routes ne
 * touche rien pendant dix jours, et ne rattrape que cinq jours d'arriéré. C'est
 * ce qui empêche l'intendance d'être un robinet et en fait une raison de
 * repasser chez soi.
 */
export function droitIntendance(state, col, groupe) {
  const g = groupe || groupeActif(state);
  const all = allegeanceDe(g);
  if (!all) return { ok: false, motif: 'Cette colonne ne sert personne.' };
  if (!col || col.ruine || col.faction !== all.faction) {
    return { ok: false, motif: 'Ce n’est pas une ville des vôtres.' };
  }
  const rep = state.player.reputation[all.faction] || 0;
  if (rep < REPUTATION_MINIMALE) {
    return { ok: false, motif: `On ne vous sert plus : réputation ${Math.round(rep)}.` };
  }
  const rang = rangDe(all);
  const jours = Math.min(
    JOURS_INTENDANCE,
    (state.temps - (all.intendance ?? all.depuis ?? 0)) / 24
  );
  const du = Math.floor(jours * (rang.def.ration || 0));
  if (du < 1) return { ok: false, motif: 'Rien à toucher pour l’instant.' };
  // On ne puise pas dans le grenier du village : une faction nourrit ses gens
  // sur ses propres deniers. C'est la différence entre une réquisition et une
  // intendance — et c'est aussi ce qui rend la chose possible, les villes ne
  // gardant quasiment aucune réserve (vingt-quatre sur quatre-vingt-deux en
  // avaient une, mesuré à deux mille heures).
  const f = state.world.factions[all.faction];
  const cout = Math.round(du * COMMODITIES.rations.prix * 0.6);
  if (!f || f.tresor < cout) {
    return { ok: false, motif: `${FACTIONS[all.faction].nom} n’a pas de quoi vous ravitailler.` };
  }
  return { ok: true, quantite: du, cout, rang };
}

export function toucherRations(state, col, log, groupe) {
  const g = groupe || groupeActif(state);
  const d = droitIntendance(state, col, g);
  if (!d.ok) return d;
  if (!g || g.regionId !== col.regionId) {
    return { ok: false, motif: 'Il faut être sur place.' };
  }
  const f = state.world.factions[g.allegeance.faction];
  f.tresor = Math.max(0, f.tresor - d.cout);
  g.inventaire.rations = (g.inventaire.rations || 0) + d.quantite;
  g.allegeance.intendance = state.temps;
  if (log) {
    log({
      type: 'allegeance',
      texte: `Intendance de ${col.nom} : ${d.quantite} rations touchées.`,
      regionId: col.regionId,
    });
  }
  return { ok: true, quantite: d.quantite };
}

// ---------------------------------------------------------------------------

export function crediter(state, points, log, motif, groupe) {
  const all = allegeanceDe(groupe || groupeActif(state));
  if (!all || points <= 0) return 0;
  const avant = rangDe(all).index;
  all.points += points;
  const apres = rangDe(all).index;
  if (apres > avant) {
    log({
      type: 'allegeance',
      texte: `${FACTIONS[all.faction].nom} vous élève au rang de ${RANGS[apres].nom}. ${RANGS[apres].desc}`,
      important: true,
    });
  } else if (motif) {
    log({ type: 'allegeance', texte: `${motif} (+${Math.round(points)} au service).`, discret: true });
  }
  return apres - avant;
}

// ---------------------------------------------------------------------------
// Ordres de mission
// ---------------------------------------------------------------------------
// Un contrat que la faction vous impose plutôt que de vous proposer. Mieux
// payé, et le refuser se paie.

function villesDe(state, faction) {
  return state.world.colonies.filter((c) => !c.ruine && c.faction === faction);
}

/** Où se trouve celui à qui on donne l'ordre. */
function positionJoueur(state) {
  const g = state.player.groupes.find((x) => x.membres.length);
  return g ? g.regionId : 0;
}

/**
 * Le délai d'un ordre doit suivre la distance, pas une fourchette fixe.
 *
 * Sur la carte de 10×8, deux cent quarante heures suffisaient pour aller
 * n'importe où et revenir. Sur 24×18 elles ne suffisent parfois même pas à
 * l'aller, et le banc l'a chiffré : un ordre et demi honoré par partie sur une
 * vingtaine reçus. Comme les points de service ne viennent que de là, personne
 * ne dépassait jamais le premier grade.
 */
function delai(d, rng, base = 200) {
  return Math.round((base + d * 26) * rng.range(0.95, 1.35));
}

function fabriquerOrdre(state, rng, g) {
  const all = allegeanceDe(g);
  const miennes = villesDe(state, all.faction);
  if (!miennes.length) return null;
  const rang = rangDe(all);
  // On envoie la colonne depuis où elle est, pas depuis où est le joueur.
  const ici = g.regionId;

  // On vise ce qui sert vraiment la faction : ravitailler une ville en manque,
  // frapper un ennemi déclaré, ou reconnaître un secteur convoité.
  const guerres = state.world.guerres.filter((g) => g.a === all.faction || g.b === all.faction);
  const ennemis = guerres.map((g) => (g.a === all.faction ? g.b : g.a));

  const choix = [];
  choix.push(['ravitaillement', 3]);
  if (ennemis.length) choix.push(['frappe', 3]);
  choix.push(['reconnaissance', 1.5]);
  const type = rng.weighted(choix);

  if (type === 'frappe') {
    const cible = rng.pick(ennemis);
    const victoires = 1 + rng.int(1 + rang.index);
    return {
      id: idDepuisRng(rng, 'o'),
      type: 'frappe',
      cibleFaction: cible,
      victoires,
      progres: 0,
      titre: `${victoires} victoire${victoires > 1 ? 's' : ''} contre ${FACTIONS[cible].nom}`,
      recompense: Math.round(victoires * rng.irange(300, 560) * (1 + rang.index * 0.25)),
      service: Math.round(victoires * 45 * (1 + rang.index * 0.2)),
      // Une frappe ne demande pas d'aller quelque part de précis, mais de
      // croiser l'ennemi : on laisse le temps que ça prend.
      duree: rng.irange(420, 700),
    };
  }

  if (type === 'reconnaissance') {
    // Un secteur à portée, pas un point tiré au hasard sur quatre cent
    // trente-deux : on n'envoie pas quelqu'un à trente régions de là avec deux
    // cents heures pour y être.
    let inconnues = state.world.regions.filter(
      (r) => !r.decouvert && distance(r.i, ici) <= 8
    );
    if (!inconnues.length) {
      const toutes = state.world.regions.filter((r) => !r.decouvert);
      if (!toutes.length) return null;
      // Rien de proche : on prend le plus proche de ce qui reste.
      inconnues = [toutes.reduce(
        (a, b) => (distance(b.i, ici) < distance(a.i, ici) ? b : a)
      )];
    }
    const r = rng.pick(inconnues);
    const d = distance(r.i, ici);
    return {
      id: idDepuisRng(rng, 'o'),
      type: 'reconnaissance',
      regionId: r.i,
      titre: `Reconnaître le secteur ${String.fromCharCode(65 + r.x)}${r.y + 1}`,
      recompense: Math.round((160 + d * 40) * rng.range(0.9, 1.3) * (1 + rang.index * 0.2)),
      service: Math.round((30 + d * 6) * (1 + rang.index * 0.2)),
      duree: delai(d, rng, 150),
    };
  }

  // Ravitaillement : la ville la plus en peine — pondérée par la distance.
  // Viser la plus en peine où qu'elle soit revenait à envoyer le convoi à
  // l'autre bout du monde à chaque fois.
  let pire = null;
  let pireScore = 0;
  let pireManque = 0;
  let ressource = 'rations';
  for (const col of miennes) {
    const d = distance(col.regionId, ici);
    for (const k of ['rations', 'composant', 'alliage', 'medkit', 'carburant']) {
      const manque = Math.max(0, col.pop * 0.25 - (col.stock[k] || 0));
      const score = manque / (1 + d * 0.55);
      if (score > pireScore) {
        pireScore = score; pireManque = manque; pire = col; ressource = k;
      }
    }
  }
  if (!pire) pire = rng.pick(miennes);
  const quantite = Math.max(15, Math.min(120, Math.round(pireManque * rng.range(0.3, 0.6)) || 30));
  return {
    id: idDepuisRng(rng, 'o'),
    type: 'ravitaillement',
    colonieId: pire.id,
    ressource,
    quantite,
    titre: `Ravitailler ${pire.nom} : ${quantite} ${COMMODITIES[ressource].nom.toLowerCase()}`,
    recompense: Math.round(COMMODITIES[ressource].prix * quantite * rng.range(1.8, 2.6)),
    service: Math.round(quantite * 1.5 + 30),
    duree: delai(distance(pire.regionId, ici), rng, 220),
  };
}

export function avancementOrdre(state, o, groupe) {
  if (!o) return null;
  switch (o.type) {
    case 'frappe':
      return { fait: o.progres, total: o.victoires, pret: o.progres >= o.victoires,
        texte: `${o.progres} / ${o.victoires}` };
    case 'reconnaissance': {
      const vu = state.world.regions[o.regionId].decouvert;
      return { fait: vu ? 1 : 0, total: 1, pret: vu, texte: vu ? 'secteur vu' : 'non exploré' };
    }
    case 'ravitaillement': {
      // Le groupe qui livre n'a pas d'importance : ce qui compte, c'est qu'un
      // groupe soit sur place avec la marchandise.
      const col = colonieParId(state.world, o.colonieId);
      const porteur = col ? porteurA(state, col.regionId, o.ressource, o.quantite) : null;
      const q = Math.max(
        porteur ? Math.floor(porteur.inventaire[o.ressource] || 0) : 0,
        Math.max(0, ...groupes(state).map((g) => Math.floor(g.inventaire[o.ressource] || 0)))
      );
      const surPlace = !!porteur;
      return {
        fait: Math.min(q, o.quantite),
        total: o.quantite,
        pret: q >= o.quantite && surPlace,
        texte: `${Math.min(q, o.quantite)} / ${o.quantite}${col ? ` · ${col.nom}` : ''}`,
      };
    }
    default:
      return null;
  }
}

/** Une victoire compte pour l'ordre en cours, comme pour les primes. */
export function compterVictoireOrdre(state, factionBande, groupe) {
  // Toute colonne engagée qui a une frappe en cours en profite : c'est le même
  // ennemi qui tombe, et la nouvelle remonte.
  for (const g of groupesEngages(state)) {
    if (groupe && g.id !== groupe.id) continue;
    const all = g.allegeance;
    if (!all.ordre || all.ordre.type !== 'frappe') continue;
    if (all.ordre.cibleFaction === factionBande) {
      all.ordre.progres = Math.min(all.ordre.victoires, all.ordre.progres + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

export function tickAllegeance(state, log, ctx) {
  // Chaque colonne a son engagement, son grade et ses ordres : c'est ce qui
  // permet d'en envoyer une servir les Corpos pendant qu'une autre bâtit.
  for (const g of state.player.groupes) {
    if (g.allegeance) tickEngagement(state, g, log, ctx);
  }
}

function tickEngagement(state, g, log, ctx) {
  const all = g.allegeance;
  const rng = ctx.rng;
  const f = state.world.factions[all.faction];

  // Une faction éteinte ne commande plus personne.
  if (!f || !f.colonies.length) {
    log({
      type: 'allegeance',
      texte: `${FACTIONS[all.faction].nom} n’existe plus. L’engagement de ${g.nom} tombe avec elle.`,
      important: true,
      groupe: g.id,
    });
    g.allegeance = null;
    return;
  }

  const rang = rangDe(all);

  // Solde versée tous les jours, à partir du grade d'Agent.
  if (rang.def.solde > 0 && state.temps - all.derniereSolde >= 24) {
    all.derniereSolde = state.temps;
    state.player.credits += rang.def.solde;
    log({
      type: 'solde',
      texte: `Solde ${FACTIONS[all.faction].genitif} : ${rang.def.solde} cr.`,
      discret: true,
    });
  }

  // Ordre en cours : validation, échéance.
  if (all.ordre) {
    const p = avancementOrdre(state, all.ordre, g);
    if (p && p.pret) {
      const o = all.ordre;
      if (o.type === 'ravitaillement') {
        const col = colonieParId(state.world, o.colonieId);
        const porteur = col ? porteurA(state, col.regionId, o.ressource, o.quantite) : null;
        if (porteur) porteur.inventaire[o.ressource] -= o.quantite;
        if (col) col.stock[o.ressource] = (col.stock[o.ressource] || 0) + o.quantite;
      }
      state.player.credits += o.recompense;
      state.player.reputation[all.faction] = Math.min(100, (state.player.reputation[all.faction] || 0) + 5);
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(120, 260);
      state.stats.ordresRemplis = (state.stats.ordresRemplis || 0) + 1;
      crediter(state, o.service, log, null, g);
      log({
        type: 'allegeance',
        texte: `Ordre exécuté : ${o.titre}. ${o.recompense} cr.`,
        important: true,
      });
    } else if (state.temps > all.ordre.echeance) {
      const o = all.ordre;
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(180, 320);
      // Rater est neutre, réussir paie. On ne retire plus les points acquis :
      // à −80 % du service par ordre manqué, on avançait de trois pas et on en
      // reculait de deux, et le banc l'a chiffré — quarante-quatre escouades sur
      // quarante-huit ne quittaient jamais le premier grade. Ce qu'on perd,
      // c'est l'estime, et elle finit par fermer l'intendance.
      state.player.reputation[all.faction] = Math.max(-100, (state.player.reputation[all.faction] || 0) - 3);
      all.manques = (all.manques || 0) + 1;
      log({
        type: 'allegeance',
        texte: `Ordre non exécuté : ${o.titre}. On le note.`,
        important: true,
      });
    }
  } else if (state.temps >= all.prochainOrdre) {
    const o = fabriquerOrdre(state, rng, g);
    if (o) {
      o.echeance = state.temps + o.duree;
      all.ordre = o;
      log({
        type: 'allegeance',
        texte: `Ordre de mission ${FACTIONS[all.faction].genitif} : ${o.titre} (${o.recompense} cr).`,
        important: true,
      });
    } else {
      all.prochainOrdre = state.temps + 120;
    }
  }

  // Au grade de Capitaine, les siens viennent parfois prêter main-forte.
  if (rang.index >= 3 && state.player.secours === undefined) state.player.secours = 0;
}

/**
 * Renfort : à partir de Capitaine, une escouade amie peut arriver au milieu
 * d'un combat livré en territoire ami. Retourne le nombre de renforts.
 */
export function renfortsDisponibles(state, groupe) {
  const g = groupe || groupeActif(state);
  if (!g) return 0;
  const all = allegeanceDe(g);
  if (!all) return 0;
  const rang = rangDe(all);
  if (rang.index < 3) return 0;
  const r = state.world.regions[g.regionId];
  if (r.controle !== all.faction) return 0;
  return rang.index - 2;
}
