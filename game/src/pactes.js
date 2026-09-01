// ---------------------------------------------------------------------------
// Les pactes entre drapeaux (PACTES.md, lot P1)
// ---------------------------------------------------------------------------
//
// « C'est une simulation : tous les types de pactes sont possibles et
// envisageables tant que les différentes parties sont d'accord et le
// respectent. » — le propriétaire, août 2026, après que je lui ai proposé de
// choisir UN type d'alliance.
//
// Le cadrage ferme d'avance la mauvaise solution. On n'écrit pas « l'alliance
// défensive » comme un objet du jeu avec ses règles à elle : on écrit ce qu'un
// pacte EST — des clauses qu'une partie propose, que l'autre accepte si elle y
// trouve son compte, et que chacune tient ou trahit.
//
// Les clauses sont donc de la DONNÉE. En ajouter une ne demande que de dire ce
// qu'elle vaut à celui qui la reçoit et ce qu'elle exige de celui qui la
// donne ; rien dans la machinerie ne les connaît par leur nom.

import { drapeauDe, diploDe } from './data.js';
import { commettre, delaiVersFaction } from './faits.js';
import { leverArmee, puissance, guerresDe } from './factions.js';
import { depenser } from './monnaie.js';

/**
 * Ce qu'on peut se promettre.
 *
 * `donne` : ce que la clause apporte à celui qui la REÇOIT, en points
 * d'estime — c'est ce qu'il met en balance pour dire oui.
 * `coute` : ce qu'elle engage de celui qui la DONNE. Une promesse de sang
 * coûte plus qu'une promesse de ne rien faire, et se refuse donc plus souvent.
 */
export const CLAUSES = {
  nonAgression: {
    nom: 'Ne pas s’attaquer',
    desc: 'Tant que le pacte tient, aucun des deux ne déclare la guerre à l’autre.',
    donne: 18,
    coute: 8,
  },
  secours: {
    nom: 'Se porter secours',
    desc: 'Qui est attaqué appelle ; l’autre lève une colonne — ou manque à sa parole.',
    donne: 40,
    coute: 45,
  },
  guerreCommune: {
    nom: 'Faire la guerre ensemble',
    desc: 'Les guerres de l’un sont celles de l’autre, y compris celles qu’on n’a pas voulues.',
    donne: 34,
    coute: 55,
  },
  passage: {
    nom: 'Laisser passer',
    desc: 'On traverse les terres de l’autre sans avoir à se cacher.',
    donne: 12,
    coute: 6,
  },
  vue: {
    nom: 'Partager ce qu’on sait',
    desc: 'Colonnes repérées, villes, routes : ce que l’un voit, l’autre l’apprend.',
    donne: 14,
    coute: 5,
  },
};

/** Ce qu'une rupture coûte en estime, chez celui à qui l'on reprend sa parole. */
export const PACTE = { rupture: -22, memoire: -20 };

/**
 * Un pacte tient-il encore ?
 *
 * `rompu` porte l'heure de la rupture, et l'heure zéro existe : un pacte rompu
 * à la première heure d'une partie serait passé pour intact avec un simple
 * `!p.rompu`. La sonde l'a attrapé du premier coup — c'est le genre de défaut
 * qui ne se voit qu'une fois par partie, au pire moment.
 */
function tient(p) {
  return p.rompu === undefined;
}

/** Le pacte qui lie ces deux drapeaux, s'il y en a un. */
export function pacteEntre(world, a, b) {
  return (world.pactes || []).find(
    (p) => tient(p) && ((p.a === a && p.b === b) || (p.a === b && p.b === a)),
  ) || null;
}

/** Les pactes d'un drapeau, tels qu'ils tiennent en ce moment. */
export function pactesDe(world, key) {
  return (world.pactes || []).filter((p) => tient(p) && (p.a === key || p.b === key));
}

/** Cette clause lie-t-elle ces deux-là ? */
export function lieePar(world, a, b, clause) {
  const p = pacteEntre(world, a, b);
  return !!(p && p.clauses.includes(clause));
}

/**
 * Ce que la proposition vaut à celui qui la reçoit, en points.
 *
 * Pas de tirage et pas de seuil arbitraire : il pèse ce qu'on lui donne, ce
 * qu'on lui demande, et ce qu'il pense déjà de vous. Un faible accepte un
 * secours qu'un fort refuse — c'est le rapport de force qui fait le reste, et
 * il entre par `poids`.
 */
export function peserPacte(world, qui, avec, clauses, poids = 1) {
  const rel = (world.factions[qui] && world.factions[qui].relations[avec]) || 0;
  let gain = 0;
  let charge = 0;
  for (const c of clauses) {
    const def = CLAUSES[c];
    if (!def) return null;
    gain += def.donne;
    charge += def.coute;
  }
  // La confiance décide de tout, et elle décide dans les deux sens : elle
  // grossit ce qu'on croit recevoir et elle allège ce qu'on craint d'engager.
  // Entre gens qui se détestent, un cadeau paraît un piège et une promesse un
  // gouffre ; entre gens sûrs l'un de l'autre, on promet son sang.
  //
  // C'est ce qui fait que la même clause se refuse ou s'accepte selon à qui
  // l'on parle, sans qu'aucun seuil ne soit écrit par clause : promettre son
  // secours à une simple connaissance n'a pas de sens, promettre de ne pas
  // l'attaquer en a.
  const conf = Math.max(-1, Math.min(1, rel / 100));
  return gain * poids * (0.5 + conf) - charge * (1 - conf);
}

/** À partir d'ici, on signe. */
export const SEUIL_PACTE = 0;

/**
 * Proposer un pacte. Rend `{ ok: true }` s'il est signé, et sinon le motif du
 * refus — dit du point de vue de celui qui refuse.
 */
export function proposerPacte(state, faction, contre, clauses, log) {
  const world = state.world;
  if (!world.factions[faction] || !world.factions[contre]) {
    return { ok: false, motif: 'Ce drapeau n’existe pas.' };
  }
  if (faction === contre) return { ok: false, motif: 'On ne se lie pas à soi-même.' };
  if (!clauses || !clauses.length) return { ok: false, motif: 'Un pacte sans clause n’est rien.' };
  for (const c of clauses) {
    if (!CLAUSES[c]) return { ok: false, motif: 'Cette clause n’existe pas.' };
  }
  if (pacteEntre(world, faction, contre)) {
    return { ok: false, motif: 'Vous êtes déjà liés. Il faut rompre avant de refaire.' };
  }
  if ((world.guerres || []).some(
    (g) => (g.a === faction && g.b === contre) || (g.a === contre && g.b === faction))) {
    return { ok: false, motif: 'On ne signe pas pendant qu’on se bat. Faites la paix d’abord.' };
  }

  const avis = peserPacte(world, contre, faction, clauses);
  if (avis === null) return { ok: false, motif: 'Cette clause n’existe pas.' };
  if (avis <= SEUIL_PACTE) {
    return {
      ok: false,
      motif: `${drapeauDe(world, contre).nom} n’y trouve pas son compte.`,
      avis,
    };
  }

  if (!world.pactes) world.pactes = [];
  const pacte = { a: faction, b: contre, clauses: clauses.slice(), depuis: state.temps };
  world.pactes.push(pacte);
  if (log) {
    log({
      type: 'accord',
      texte: `${drapeauDe(world, faction).nom} et ${drapeauDe(world, contre).nom} `
        + `se donnent leur parole : ${clauses.map((c) => CLAUSES[c].nom.toLowerCase()).join(', ')}.`,
      important: true,
      factions: [faction, contre],
    });
  }
  return { ok: true, pacte, avis };
}

/**
 * Reprendre sa parole.
 *
 * Ce n'est pas interdit — rien ne l'est ici —, mais celui à qui on la reprend
 * s'en souvient, et les tiers l'apprennent. C'est tout ce qui tient un pacte :
 * pas une règle, une réputation.
 */
export function romprePacte(state, faction, contre, log) {
  const world = state.world;
  const p = pacteEntre(world, faction, contre);
  if (!p) return { ok: false, motif: 'Rien ne vous lie.' };
  p.rompu = state.temps;
  const lese = p.a === faction ? p.b : p.a;
  const fl = world.factions[lese];
  if (fl && fl.relations) {
    const v = Math.max(-100, Math.min(100, (fl.relations[faction] ?? 0) + PACTE.rupture));
    fl.relations[faction] = v;
    const fa = world.factions[faction];
    if (fa && fa.relations) fa.relations[lese] = v;
  }
  if (log) {
    log({
      type: 'accord',
      texte: `${drapeauDe(world, faction).nom} repren${drapeauDe(world, faction).pluriel ? 'nent' : 'd'} `
        + `sa parole à ${drapeauDe(world, lese).nom}.`,
      important: true,
      factions: [faction, lese],
    });
  }
  return { ok: true };
}

/**
 * La même rupture, mais faite par le joueur : elle passe au registre des faits,
 * seule porte vers la réputation et vers la mémoire des villes.
 */
export function romprePacteJoueur(state, contre, log) {
  const mien = state.player.drapeau;
  if (!mien) return { ok: false, motif: 'Vous n’avez pas de couleurs.' };
  const r = romprePacte(state, mien, contre, log);
  if (!r.ok) return r;
  commettre(state, {
    type: 'parole-reprise',
    regionId: null,
    t: state.temps,
    effets: [{
      faction: contre,
      delta: PACTE.memoire,
      su: state.temps + delaiVersFaction(state, 'rumeur', 0, contre),
      dit: `${drapeauDe(state.world, contre).nom} sa${drapeauDe(state.world, contre).pluriel ? 'vent' : 'it'} `
        + `ce que vaut votre parole.`,
    }],
  });
  return r;
}

/** Ceux à qui l'on peut proposer quelque chose aujourd'hui. */
export function pactesPossibles(state, faction) {
  return diploDe(state.world).filter((k) => k !== faction
    && !pacteEntre(state.world, faction, k)
    && !(state.world.guerres || []).some(
      (g) => (g.a === faction && g.b === k) || (g.a === k && g.b === faction)));
}

// ---------------------------------------------------------------------------
// Les clauses mordent (PACTES.md, lot P2)
// ---------------------------------------------------------------------------
//
// Un pacte qui ne fait rien n'est pas un pacte. Mais « tant que les parties le
// respectent » : chaque clause peut être trahie, et ce n'est jamais une
// pénalité automatique — c'est une décision, prise par quelqu'un, qui se sait.
//
// Une distinction commande tout ce qui suit : **manquer par impuissance n'est
// pas manquer par choix**. Un allié sans un sou ne peut pas lever de colonne ;
// il n'a trahi personne, et personne ne lui en veut. Celui qui pouvait et n'est
// pas venu, lui, a repris sa parole.

/** Ce qu'il faut en caisse pour lever une colonne de secours. */
export const SECOURS = { force: 45, parHomme: 5.2 };

/**
 * Un allié est attaqué : ceux qui lui ont promis leur secours décident.
 *
 * Rend qui est venu, qui n'a pas pu, et qui n'a pas voulu.
 */
export function appelerSecours(state, place, agresseur, log) {
  const world = state.world;
  const venus = [];
  const impuissants = [];
  const manques = [];
  if (!place || !place.faction) return { venus, impuissants, manques };
  const attaque = place.faction;

  for (const p of pactesDe(world, attaque)) {
    if (!p.clauses.includes('secours')) continue;
    const ami = p.a === attaque ? p.b : p.a;
    if (ami === agresseur) continue;
    const f = world.factions[ami];
    if (!f || f.morte) continue;

    // Ce qu'il faudrait sortir de la caisse. Une caisse vide n'est pas un
    // refus : on ne lève pas ce qu'on n'a pas.
    const cout = Math.round(SECOURS.force * SECOURS.parHomme);
    if ((f.tresor || 0) < cout) { impuissants.push(ami); continue; }

    // Et la décision, qui appartient à celui qui l'a promis. `refuseSecours`
    // est ce que pose celui qui a décidé de ne pas y aller — le conseil au lot
    // suivant, la sonde ici.
    if (f.refuseSecours) {
      manques.push(ami);
      romprePacte(state, ami, attaque, log);
      if (log) {
        log({
          type: 'accord',
          texte: `${drapeauDe(world, ami).nom} avai${drapeauDe(world, ami).pluriel ? 'ent' : 't'} `
            + `promis son secours à ${place.nom}. Personne n’est venu.`,
          important: true,
          factions: [ami, attaque],
        });
      }
      continue;
    }

    const depuis = (f.colonies || []).map((id) => (world.colonies.find((c) => c.id === id)))
      .filter((c) => c && !c.ruine)[0];
    if (!depuis) { impuissants.push(ami); continue; }
    const colonne = leverArmee(world, ami, SECOURS.force, depuis.regionId, place.id, log);
    if (!colonne) { impuissants.push(ami); continue; }
    // Par la porte comptable, et non en retranchant du trésor : `depenser` fait
    // aussi sortir la somme de la MASSE. Sans elle, lever une colonne de
    // secours détruisait de la monnaie — invisible tant que personne ne
    // signait, et l'écart comptable du banc est passé de 0 à 42 828 le jour où
    // le monde s'est mis à se lier.
    depenser(world, ami, cout);
    venus.push(ami);
    if (log) {
      log({
        type: 'armee',
        texte: `${drapeauDe(world, ami).nom} tien${drapeauDe(world, ami).pluriel ? 'nent' : 't'} `
          + `parole : une colonne part pour ${place.nom}.`,
        important: true,
        factions: [ami, attaque],
      });
    }
  }
  return { venus, impuissants, manques };
}

// ---------------------------------------------------------------------------
// P3 — le monde s'en sert
// ---------------------------------------------------------------------------
//
// Les pactes existaient et personne ne les signait : seul le joueur pouvait en
// proposer. Un monde où l'on est le seul à savoir donner sa parole n'est pas un
// monde diplomatique, c'est un monde qui vous attend.
//
// Ce lot a été écrit, mesuré, retiré, puis instruit pendant deux jours contre
// un chiffre qui mentait — la « masse monétaire » du banc additionne les unités
// nominales de pays dont les cours vont de 0,01 à 186, et enflait dès que les
// cours divergeaient sans qu'un sou ait été créé (METHODE §12). En valeur
// réelle, ce monde-ci vaut davantage que le témoin et l'invariant comptable est
// resté à zéro exact du premier jour au dernier. Il a ensuite attendu un budget
// de tick, rouvert par le propriétaire en septembre 2026.

/** Ce qui pousse un conseil à chercher une parole. Calibré au banc. */
export const DIPLOMATIE = {
  // L'envie d'aller chercher une parole quand rien ne presse, par séance.
  envie: 0.1,
  // Ce que le fait de se savoir menacé ajoute à cette envie.
  envieMenace: 0.45,
  // À partir de quel rapport de force on se sait menacé.
  menaceForte: 1.35,
  // Ce qu'une parole tenue rapproche, à chaque séance. Innocenté au banc d'une
  // accusation qui visait la mauvaise chose : à zéro, le monde ne se portait
  // pas mieux.
  entretien: 1.5,
};

/**
 * Le plus fort de ceux qui pourraient nous tomber dessus, rapporté à nous.
 *
 * On ne compte pas ceux avec qui l'on est déjà lié, ni ceux qu'on estime : une
 * menace est quelqu'un de fort qui n'a aucune raison de s'abstenir.
 */
export function menaceSur(world, key) {
  const moi = Math.max(1, puissance(world, key));
  const rel = world.factions[key].relations || {};
  let pire = 0;
  for (const k of diploDe(world)) {
    if (k === key) continue;
    // L'ordre des filtres n'est pas gratuit : `puissance` balaie les villes du
    // pays ET toutes les colonnes du monde. On écarte d'abord ceux qui ne
    // peuvent pas être une menace — quelqu'un qu'on estime, un pays sans une
    // ville, un allié — et l'on ne paie le calcul que pour les autres.
    if ((rel[k] ?? 0) > 20) continue;
    if (!world.factions[k].colonies.length) continue;
    if (pacteEntre(world, key, k)) continue;
    const p = puissance(world, k) / moi;
    if (p > pire) pire = p;
  }
  return pire;
}

/**
 * Un conseil cherche une parole.
 *
 * Aucun tirage propre : l'envie passe par le `rng` du conseil, comme toutes ses
 * autres décisions — un dé de plus décalerait le flux scellé.
 */
export function tenterPacte(state, key, log, rng) {
  const world = state.world;
  const f = world.factions[key];
  if (!f || f.morte) return null;

  // Ce qu'on tient déjà rapproche : une parole donnée et jamais reprise finit
  // par valoir mieux qu'une simple connaissance. C'est aussi ce qui rend une
  // alliance ancienne difficile à trahir — la confiance qu'elle a bâtie est
  // exactement ce que la rupture coûterait.
  for (const p of pactesDe(world, key)) {
    const autre = p.a === key ? p.b : p.a;
    if (f.relations) {
      f.relations[autre] = Math.min(100, (f.relations[autre] ?? 0) + DIPLOMATIE.entretien);
    }
  }

  // Un seul tirage, et la menace n'est calculée que lorsqu'elle peut changer la
  // réponse. Sous l'envie de base on cherche de toute façon ; au-dessus de
  // l'envie maximale on ne cherche pas, quelle que soit la menace. Entre les
  // deux seulement, il faut savoir. Le flux scellé ne bouge pas : on consomme
  // exactement un tirage, quoi qu'il arrive.
  const d = rng.f();
  let presse = false;
  if (d >= DIPLOMATIE.envie) {
    if (d >= DIPLOMATIE.envie + DIPLOMATIE.envieMenace) return null;
    presse = menaceSur(world, key) >= DIPLOMATIE.menaceForte;
    if (!presse) return null;
  }

  const enGuerreAvec = new Set(guerresDe(world, key).map((g) => (g.a === key ? g.b : g.a)));
  let meilleur = null;
  let meilleurRel = -Infinity;
  for (const k of diploDe(world)) {
    if (k === key || enGuerreAvec.has(k)) continue;
    // `colonies.length` et non `coloniesDe` : celle-ci alloue deux tableaux et
    // rebalaie les villes, une fois par pays et par séance. Ce filtre-ci est
    // grossier, et il n'a pas à être exact : `proposerPacte` refuse tout seul
    // ce qui ne tient pas.
    if (!world.factions[k].colonies.length) continue;
    if (pacteEntre(world, key, k)) continue;
    const rel = (f.relations || {})[k] ?? 0;
    if (rel > meilleurRel) { meilleurRel = rel; meilleur = k; }
  }
  if (!meilleur) return null;

  // Qui se sait menacé demande du secours ; qui est tranquille demande la paix.
  // Le contenu d'un pacte du monde dépend donc de la situation de celui qui le
  // propose, et pas d'une clause tirée au hasard.
  const clauses = presse ? ['nonAgression', 'secours'] : ['nonAgression'];
  const r = proposerPacte(state, key, meilleur, clauses, log);
  return r.ok ? r : null;
}
