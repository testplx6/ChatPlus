// Résolution de combat au tour par tour, déterministe.
// Personne ne meurt d'un coup : on tombe K.O., puis on peut être achevé,
// capturé, ou laissé pour mort — la nuance Kenshi.

import { ITEMS, BIOMES } from './data.js';
import {
  comp, blesser, tirerMembre, armureTotale, estDebout, estVivant, pvTotal,
  gagnerXp, makeCharacter, XP_PRATIQUE, resistanceLetale,
} from './characters.js';

// ---------------------------------------------------------------------------
// Génération d'opposants
// ---------------------------------------------------------------------------

const BANDES = {
  essaim: { nom: 'Meute de l’Essaim', archetypes: ['brute', 'chasseur'], niveau: 1, letal: 0.55 },
  ombrelle: { nom: 'Racketteurs Ombrelle', archetypes: ['courtier', 'chasseur', 'brute'], niveau: 0, letal: 0.15 },
  cendre: { nom: 'Patrouille de Cendre', archetypes: ['brute', 'chasseur'], niveau: 1, letal: 0.3 },
  hexa: { nom: 'Sécurité Hexa', archetypes: ['chasseur', 'brute'], niveau: 1, letal: 0.2 },
  signal: { nom: 'Prêcheurs du Signal', archetypes: ['brute', 'medic'], niveau: 0, letal: 0.4 },
  rouilleurs: { nom: 'Bande de Rouilleurs', archetypes: ['ferrailleur', 'brute'], niveau: 0, letal: 0.2 },
  libres: { nom: 'Milice de commune', archetypes: ['chasseur', 'ferrailleur'], niveau: 0, letal: 0.1 },
  bandits: { nom: 'Pillards', archetypes: ['brute', 'chasseur', 'eclaireur'], niveau: 0, letal: 0.25 },
};

const ARMES_PAR_NIVEAU = [
  ['barre', 'clous'],
  ['machette', 'clous', 'verrou'],
  ['katana', 'verrou', 'smg'],
  ['katana', 'smg', 'rail', 'masse'],
];

const ARMURES_PAR_NIVEAU = [
  [null, null, 'cuir'],
  [null, 'cuir', 'plaque'],
  ['cuir', 'plaque', 'kevlar'],
  ['plaque', 'kevlar', 'exo'],
];

export function genererBande(rng, factionKey, taille, niveauMonde = 0) {
  const def = BANDES[factionKey] || BANDES.bandits;
  const niv = Math.max(0, Math.min(3, def.niveau + niveauMonde));
  const membres = [];
  for (let i = 0; i < taille; i++) {
    const c = makeCharacter(rng, {
      archetype: rng.pick(def.archetypes),
      niveau: niv,
    });
    c.equip.arme = rng.pick(ARMES_PAR_NIVEAU[niv]);
    c.equip.armure = rng.pick(ARMURES_PAR_NIVEAU[niv]);
    c.faction = factionKey;
    membres.push(c);
  }
  return { nom: def.nom, faction: factionKey, membres, letal: def.letal };
}

// ---------------------------------------------------------------------------
// Tactiques
// ---------------------------------------------------------------------------

/**
 * Comment on se bat, décidé à l'avance et valable aussi en votre absence.
 *
 * Le combat était un dé qu'on subissait, et la mesure était accablante : dix-huit
 * tours de moyenne sur un maximum de vingt-quatre, quatre-vingt-huit pour cent
 * des affrontements finissant par une fuite, un virgule cinq ennemi à terre sur
 * trois — et **zéro mort, jamais, des deux côtés**. La dernière ligne n'était pas
 * un équilibrage prudent mais un bug de structure : `blesser` n'autorise la mort
 * que sur quelqu'un de déjà à terre, et l'on ne visait jamais quelqu'un à terre.
 * Le paramètre de létalité de chaque faction ne servait donc à rien.
 *
 * Une tactique n'est pas un bonus : c'est un pari. Chacune est excellente dans
 * une situation et mauvaise ailleurs, et la situation — le terrain, le rapport
 * de nombre, les armes qu'on porte — change à chaque rencontre. C'est ce qui
 * transforme « on subit » en « on décide », sans rien demander au joueur pendant
 * le combat lui-même : il a décidé avant, comme un vrai chef d'escouade.
 */
export const TACTIQUES = {
  ligne: {
    nom: 'Tenir la ligne',
    desc: 'Rester groupés, couvrir ses angles. On encaisse mieux, on frappe moins.',
    quand: 'Quand on est en infériorité, ou qu’on a des blessés à protéger.',
    attaque: 0.82, defense: 1.45, initiative: 1, moral: 1.4,
    terrains: {}, nombre: 0, acharnement: 0.5, rompre: 1,
  },
  charge: {
    nom: 'Charger',
    desc: 'Fondre dessus avant qu’ils s’organisent. Le premier échange décide.',
    quand: 'Quand on est plus forts, et en terrain ouvert.',
    attaque: 1.28, defense: 0.6, initiative: 1.7, moral: 0.9,
    terrains: { steppe: 1.15, dalles: 1.1, desert: 1.05, marais: 0.75, canyons: 0.8, plastique: 0.8 },
    nombre: 0.15, acharnement: 1.4, rompre: 0.7,
  },
  feu: {
    nom: 'Tenir à distance',
    desc: 'Les arrêter avant qu’ils arrivent. Décisif en terrain découvert, inutile dans les cassures.',
    quand: 'Quand on a des armes à feu et de l’espace devant soi.',
    attaque: 1, defense: 1.1, initiative: 1.5, moral: 1,
    terrains: { steppe: 1.3, desert: 1.25, dalles: 1.1, plastique: 0.85, marais: 0.6, canyons: 0.65, friche: 0.9 },
    nombre: 0, tir: 1.6, acharnement: 0.8, rompre: 1.1,
  },
  encerclement: {
    nom: 'Envelopper',
    desc: 'Les prendre de trois côtés. Ne vaut que si l’on est plus nombreux.',
    quand: 'Quand on a le nombre pour soi. Sinon on se disperse pour rien.',
    attaque: 1.12, defense: 0.92, initiative: 1, moral: 1.1,
    terrains: { steppe: 1.1, dalles: 1.05, canyons: 0.75, marais: 0.85 },
    nombre: 0.6, acharnement: 1.1, rompre: 1.4,
  },
  harcelement: {
    nom: 'Harceler',
    desc: 'Frapper et se replier, sans jamais s’engager. On ne gagne pas, on survit.',
    quand: 'Quand on ne peut pas gagner, et qu’on veut partir avec le sac plein.',
    attaque: 0.6, defense: 1.5, initiative: 1, moral: 1.2,
    terrains: { marais: 1.3, canyons: 1.25, friche: 1.2, plastique: 1.15, steppe: 0.8, desert: 0.75 },
    nombre: -0.1, furtif: 1, acharnement: 0.25, rompre: 2.4,
  },
};

export const TACTIQUE_KEYS = Object.keys(TACTIQUES);

/**
 * Ce que la tactique vaut ici, contre ceux-là. Un pari, pas un bonus.
 *
 * `partTir` est la part de l'escouade qui porte une arme à feu : tenir à
 * distance avec des machettes n'est pas tenir à distance. Sans ce facteur, la
 * tactique de tir était la meilleure du jeu même en mêlée pure, parce que son
 * bonus de terrain s'appliquait à tout le monde.
 */
export function rendementTactique(key, biome, ratioNombre, partTir = 0.5) {
  const t = TACTIQUES[key] || TACTIQUES.ligne;
  const terrain = (t.terrains && t.terrains[biome]) || 1;
  // Le nombre : au-delà de un pour un, l'enveloppement paie ; en dessous, il
  // coûte. Les autres tactiques y sont presque indifférentes.
  const nombre = 1 + (ratioNombre - 1) * (t.nombre || 0);
  // Une tactique qui suppose des armes qu'on n'a pas ne vaut rien.
  const armement = t.tir ? 0.55 + partTir * 0.75 : 1;
  return Math.max(0.35, terrain * nombre * armement);
}

/** Ce qu'on peut dire d'une tactique avant de la choisir, ici et maintenant. */
export function apercuTactique(key, biome, ratioNombre, partTir = 0.5) {
  const v = rendementTactique(key, biome, ratioNombre, partTir);
  if (v >= 1.15) return { v, mot: 'bien vu ici', cls: 'ok' };
  if (v >= 0.95) return { v, mot: 'convenable', cls: 'att' };
  return { v, mot: 'mauvais choix ici', cls: 'mal' };
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

/**
 * Ce que pèse un coup, en face de ce que pèse un corps.
 *
 * C'est le chiffre qui manquait. Une machette rend une dizaine de points nets,
 * un corps en compte deux cent quarante-sept : il fallait vingt-sept coups au
 * but pour abattre quelqu'un, soit un affrontement de dix-huit tours où
 * personne ne tombait jamais. Toute la platitude du combat tenait là — pas dans
 * les règles, dans l'échelle. On mord deux fois plus fort, et un échange
 * commence à vouloir dire quelque chose.
 *
 * Les armes gardent leurs valeurs : elles servent aussi à évaluer un butin et à
 * fixer un prix, et les rééchelonner une à une aurait déplacé toute l'économie
 * pour une raison qui ne la concerne pas.
 */
const MORDANT = 2.3;

function armeDe(c) {
  return (c.equip.arme && ITEMS[c.equip.arme]) || { degats: 4, pen: 0, portee: 'melee', comp: 'melee' };
}

function scoreAttaque(c, arme, bonus) {
  const skill = arme.comp === 'tir' ? 'tir' : 'melee';
  const base = comp(c, skill);
  const dex = comp(c, 'endurance') * 0.15;
  return base + dex + (bonus || 0);
}

function scoreDefense(c) {
  return comp(c, 'melee') * 0.35 + comp(c, 'endurance') * 0.35 + comp(c, 'furtivite') * 0.2 + 8;
}

function ciblesValides(camp) {
  return camp.filter((c) => estDebout(c));
}

function forceCamp(camp) {
  let f = 0;
  for (const c of camp) {
    if (!estDebout(c)) continue;
    const a = armeDe(c);
    f += (comp(c, a.comp === 'tir' ? 'tir' : 'melee') + a.degats * 2 + armureTotale(c)) * pvTotal(c).pct;
  }
  return f;
}

/** Ceux qui sont à terre mais encore en vie : on peut les achever. */
function aTerre(camp) {
  return camp.filter((c) => estVivant(c) && !estDebout(c));
}

/**
 * Résout un affrontement entre deux camps de personnages.
 *
 * ctx : {
 *   rng, biome, posture, bonusDegats, bonusArmure,
 *   tactique          clé de TACTIQUES pour le camp A
 *   letalA, letalB    disposition de chaque camp à achever un homme à terre
 *   cohA              rendement de cohésion du camp A, défaut 1
 *   viserChefs        le camp A vise le plus dangereux plutôt que le plus faible
 * }
 *
 * Retourne { vainqueur, tours, journal, koA, koB, mortsA, mortsB, deroute }
 */
export function resoudreCombat(campA, campB, ctx) {
  const rng = ctx.rng;
  const journal = [];
  const posture = ctx.posture || { degats: 1, fuite: 0.3 };
  const biome = BIOMES[ctx.biome];
  const couvert = biome ? (biome.cout > 5 ? 0.12 : 0.04) : 0.06;

  const tac = TACTIQUES[ctx.tactique] || TACTIQUES.ligne;
  const nA = ciblesValides(campA).length || 1;
  const nB = ciblesValides(campB).length || 1;
  const armes = ciblesValides(campA).filter((c) => armeDe(c).comp === 'tir').length;
  const rendu = rendementTactique(ctx.tactique, ctx.biome, nA / nB, armes / nA);

  let tours = 0;
  let fuite = null;
  // Douze tours au lieu de vingt-quatre. La mesure disait dix-huit tours de
  // moyenne : un affrontement qui dure une demi-journée n'est pas un combat,
  // c'est une usure, et le joueur n'y lit rien. On raccourcit et on rend chaque
  // échange plus lourd.
  const maxTours = 12;

  const f0A = forceCamp(campA);
  const f0B = forceCamp(campB);

  while (tours < maxTours) {
    tours++;
    const vivA = ciblesValides(campA);
    const vivB = ciblesValides(campB);
    if (!vivA.length || !vivB.length) break;

    // Rompre le combat. Ce n'était qu'un dé sur le rapport de force ; c'est
    // maintenant une affaire de moral, que la tactique tient ou non. Tenir la
    // ligne fait rester des gens qui auraient fui, harceler fait décrocher au
    // premier accroc — et c'est précisément ce qu'on leur demande.
    const ratioA = forceCamp(campA) / Math.max(1, f0A);
    const ratioB = forceCamp(campB) / Math.max(1, f0B);
    const tenueA = tac.moral * (ctx.cohA || 1);
    if (tours > 1 && ratioA < 0.5 * tac.rompre
        && rng.chance(posture.fuite * tac.rompre / tenueA)) {
      // Décrocher en bon ordre ou se faire disperser : la différence tient à la
      // tactique et à ce qui tient encore debout. Harceler, c'est se dégager
      // sans laisser personne — et ce n'est pas une défaite, c'est le but de la
      // manœuvre. Sans cette distinction, la tactique du faible était
      // simplement la tactique du perdant : zéro victoire et le sac pillé.
      const ordonne = tac.rompre > 2
        && ciblesValides(campA).length >= Math.ceil(campA.length / 2);
      fuite = ordonne ? 'degage' : 'A';
      break;
    }
    // Eux aussi ont un moral, et il casse d'autant plus vite qu'ils voient
    // tomber les leurs. Une bande à moitié à terre ne reste pas.
    const debout = vivB.length;
    const total = campB.length || 1;
    const casse = 0.16 + (1 - debout / total) * 0.5 + (1 - ratioB) * 0.35;
    if (tours > 1 && ratioB < 0.62 && rng.chance(casse)) { fuite = 'B'; break; }

    const ordre = rng.shuffle(
      vivA.map((c) => ({ c, camp: 'A' })).concat(vivB.map((c) => ({ c, camp: 'B' })))
    );

    for (const acteur of ordre) {
      const c = acteur.c;
      if (!estDebout(c)) continue;
      const nous = acteur.camp === 'A';
      const campAdverse = nous ? campB : campA;
      const adverses = ciblesValides(campAdverse);

      // Achever un homme à terre. C'était impossible — `blesser` ne tue que
      // quelqu'un de déjà au sol, et l'on ne visait jamais le sol : la létalité
      // de chaque faction ne servait donc strictement à rien, et personne n'est
      // jamais mort au combat de toute l'histoire du projet. C'est ici que la
      // consigne « achever les ennemis à terre » devient une vraie décision, et
      // ici que l'Essaim devient ce qu'il prétend être.
      // La disposition d'une faction est une inclinaison, pas une cadence :
      // testée à chaque tour et pour chaque combattant, elle vaut bien plus que
      // sa valeur nominale. Un cinquième, et un homme à terre dans un combat
      // qu'on gagne s'en sort presque toujours ; dans un combat qu'on perd,
      // presque jamais. C'est ce qui rend une défaite grave sans rendre chaque
      // égratignure mortelle.
      const disposition = (nous ? (ctx.letalA || 0) : (ctx.letalB || 0)) * 0.2
        * (nous ? tac.acharnement : 1);
      const sol = aTerre(campAdverse);
      if (sol.length && rng.chance(disposition * (adverses.length ? 0.5 : 1))) {
        const victime = rng.pick(sol);
        victime.etat = 'mort';
        c.kills++;
        c.horsCombat = (c.horsCombat || 0) + 1;
        journal.push({ t: 'mort', txt: `${c.nom} achève ${victime.nom} au sol.` });
        continue;
      }
      if (!adverses.length) break;

      const arme = armeDe(c);
      const bonusD = acteur.camp === 'A' ? (ctx.bonusDegats || 0) : 0;
      const bonusArm = acteur.camp === 'A' ? (ctx.bonusArmure || 0) : 0;
      const coups = arme.rafale || 1;

      for (let k = 0; k < coups; k++) {
        const cibles2 = ciblesValides(acteur.camp === 'A' ? campB : campA);
        if (!cibles2.length) break;
        // On vise de préférence le plus amoché : la simulation est cruelle.
        // Sauf consigne contraire — viser les chefs coûte cher et casse leur
        // moral plus vite, parce qu'une bande qui perd son plus dangereux ne
        // reste pas longtemps.
        const chefs = nous && ctx.viserChefs;
        const cible = chefs
          ? cibles2.reduce((a, b) => (forceCamp([a]) >= forceCamp([b]) ? a : b))
          : rng.chance(0.55)
            ? cibles2.reduce((a, b) => (pvTotal(a).pct <= pvTotal(b).pct ? a : b))
            : rng.pick(cibles2);

        // La tactique porte sur l'attaque et la défense, et le premier échange
        // pèse ce que la tactique en fait : une charge décide au contact, un
        // tir décide avant, une ligne ne décide rien et c'est son propos.
        const mult = nous ? tac.attaque * rendu : 1;
        const elan = nous && tours === 1 ? tac.initiative : 1;
        const garde = nous ? 1 : tac.defense * (0.55 + 0.45 * rendu);
        // Une tactique de tir ne vaut que pour ceux qui ont de quoi tirer.
        const arme2 = nous && tac.tir && arme.comp === 'tir' ? tac.tir : 1;
        const att = scoreAttaque(c, arme, nous ? bonusD * 20 : 0) * mult * elan * arme2;
        const def = scoreDefense(cible) * (1 + couvert) * garde
          * (nous ? 1 : (tac.furtif ? 1.15 : 1));
        const p = Math.max(0.08, Math.min(0.94, 0.5 + (att - def) / (att + def + 30)));
        if (!rng.chance(p)) {
          if (rng.chance(0.25)) {
            journal.push({ t: 'rate', txt: `${c.nom} manque ${cible.nom}.` });
          }
          continue;
        }

        const membre = tirerMembre(rng);
        const arm = armureTotale(cible, nous ? 0 : bonusArm);
        // Le rendement de la tactique — le terrain, le rapport de nombre —
        // porte aussi sur ce qu'un coup fait. Réservé à la chance de toucher,
        // il ne servait à rien : à quatre contre trois on touche déjà presque à
        // coup sûr, la probabilité est plafonnée à 0,94, et envelopper à deux
        // contre un ne changeait donc strictement rien. C'est là que la
        // situation doit payer, ou coûter.
        const brut = arme.degats * MORDANT
          * (nous ? Math.pow(rendu, 0.9) : 1)
          * (nous && tours === 1 ? tac.initiative * 0.7 + 0.3 : 1)
          * rng.range(0.75, 1.3)
          * (1 + comp(c, 'force') / 260)
          * (nous ? posture.degats * (1 + bonusD) : 1);
        // L'armure réduit fortement mais ne rend jamais invulnérable : sinon un
        // groupe blindé devient impossible à entamer avec de l'équipement de départ.
        // Une formation serrée n'esquive pas seulement : elle encaisse de biais,
        // pare, et prend les coups sur l'épaule. Sans ça, la garde ne jouait que
        // sur la fréquence des touches et charger dominait partout — cent pour
        // cent de victoires dans tous les cas de figure mesurés, y compris ceux
        // où la tactique était censée être un mauvais choix.
        const absorbe = arm * (1 - arme.pen) * 0.6;
        // Une bande qui se connaît couvre ses angles ; une foule se gêne. La
        // cohésion ne joue que pour le joueur : une bande de pillards n'a pas
        // d'histoire commune à faire valoir.
        const coh = nous ? (ctx.cohA || 1) : 1;
        // La garde joue deux fois, comme l'attaque : sur la fréquence des
        // touches, et sur ce qu'un coup laisse passer. Trois fois — en ajoutant
        // l'armure — et tenir la ligne dominait à son tour. Une tactique doit
        // avoir un revers, pas seulement un avers.
        const encaisse = nous ? 1 : 1 + (tac.defense - 1) * 0.55;
        const net = Math.max(1.5, (brut * coh) / encaisse - absorbe * rng.range(0.5, 1.0));

        // La létalité tient à qui frappe *et* à qui encaisse. Un corps aguerri
        // encaisse un coup qui aurait tué un bleu — c'est le seul endroit du
        // jeu où survivre longtemps finit par payer.
        // Un coup porté ne tue pas quelqu'un qui tient debout : il le met à
        // terre. Mourir se décide au sol, plus haut.
        const res = blesser(cible, net, membre, rng, { letal: false });

        // Se battre forme vite : c'est cher payé, mais ça forme.
        gagnerXp(c, arme.comp === 'tir' ? 'tir' : 'melee', XP_PRATIQUE * 1.2 + net * 0.4);
        gagnerXp(cible, 'endurance', XP_PRATIQUE * 0.6 + net * 0.2);

        if (res.mort) {
          c.kills++;
          c.horsCombat = (c.horsCombat || 0) + 1;
          journal.push({ t: 'mort', txt: `${c.nom} abat ${cible.nom}.` });
        } else if (res.membrePerdu) {
          journal.push({ t: 'membre', txt: `${cible.nom} perd un membre (${membre}).` });
        } else if (res.ko) {
          // Une mise hors de combat est une victoire. Ne compter que les morts
          // laissait tout le monde à zéro — les ennemis tombent K.O. bien plus
          // souvent qu'ils ne meurent — et rendait inatteignable le seuil qui
          // donne un surnom.
          c.horsCombat = (c.horsCombat || 0) + 1;
          journal.push({ t: 'ko', txt: `${cible.nom} s’écroule sous les coups de ${c.nom}.` });
        } else if (journal.length < 40) {
          journal.push({ t: 'coup', txt: `${c.nom} touche ${cible.nom} (${Math.round(net)}).` });
        }
      }
    }
  }

  const deboutA = ciblesValides(campA).length;
  const deboutB = ciblesValides(campB).length;
  let vainqueur = 'nul';
  if (fuite === 'degage') vainqueur = 'nul';
  else if (fuite === 'A') vainqueur = 'B';
  else if (fuite === 'B') vainqueur = 'A';
  else if (deboutA && !deboutB) vainqueur = 'A';
  else if (deboutB && !deboutA) vainqueur = 'B';

  return {
    vainqueur,
    tours,
    fuite,
    // Qui a rompu, et donc laissé des gens sur le terrain. C'est de là que
    // viennent les prisonniers.
    deroute: fuite,
    tactique: ctx.tactique || 'ligne',
    rendu,
    journal,
    koA: campA.filter((c) => c.etat === 'ko').length,
    koB: campB.filter((c) => c.etat === 'ko').length,
    mortsA: campA.filter((c) => c.etat === 'mort').length,
    mortsB: campB.filter((c) => c.etat === 'mort').length,
    survivantsB: campB.filter((c) => estVivant(c)).length,
  };
}

/** Butin ramassé sur une bande vaincue. */
export function butin(bande, rng) {
  const loot = {};
  const objets = [];
  let credits = 0;
  for (const m of bande.membres) {
    if (estDebout(m)) continue; // on ne dépouille pas ceux qui tiennent debout
    credits += rng.irange(4, 40);
    const add = (k, n) => { loot[k] = (loot[k] || 0) + n; };
    add('ferraille', rng.irange(1, 5));
    if (rng.chance(0.35)) add('rations', rng.irange(1, 3));
    if (rng.chance(0.2)) add('composant', rng.irange(1, 2));
    if (rng.chance(0.12)) add('medkit', 1);
    if (m.equip.arme && rng.chance(0.4)) objets.push(m.equip.arme);
    if (m.equip.armure && rng.chance(0.3)) objets.push(m.equip.armure);
  }
  return { loot, objets, credits };
}
