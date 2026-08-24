// Allégeance. Jusqu'ici les factions étaient un décor avec lequel on
// commerçait ; on peut désormais entrer à leur service, monter en grade, en
// recevoir des ordres et en tirer des avantages concrets.
//
// C'est la progression longue du jeu : la réputation était un chiffre, le grade
// est une position dans le monde.

import { FACTIONS, DIPLO_FACTIONS, COMMODITIES, drapeauDe, symboleDe } from './data.js';
import { colonieParId, distance, coordonnee } from './world.js';
import { idDepuisRng } from './characters.js';
import { groupes, groupeActif } from './groupes.js';
import { loisDe, REGIMES, DISCIPLINES } from './lois.js';
import { noterArgent } from './rapport.js';
import { depenser, gagner, soldeIci, signeIci } from './monnaie.js';

/**
 * Les six charges, et ce qu'elles donnent.
 *
 * **L'échelle a été raccourcie en août 2026, en même temps qu'on lui ajoutait un
 * sixième échelon.** Les deux vont ensemble : `ECONOMIE.md` §7.3 range deux
 * prérogatives monétaires au grade de Maréchal, et poser un sixième barreau
 * au-dessus d'un cinquième que personne n'atteint aurait été écrire du code
 * mort. Mesuré au banc d'équilibrage avant l'ajout, sur trente parties de
 * quatre mille heures : **Commandeur atteint zéro fois**, Capitaine une seule,
 * pour une carrière médiane de 415 points en fin de service.
 *
 * L'ancienne échelle valait 0 / 130 / 380 / 850 / 1 700. La nouvelle garde la
 * même forme — chaque barreau vaut à peu près deux fois le précédent — et rentre
 * dans une carrière qu'on peut réellement mener.
 */
export const RANGS = [
  {
    nom: 'Affilié', points: 0, remise: 0.05, solde: 10, ration: 3,
    desc: 'On vous laisse entrer par la porte de service, et on vous nourrit.',
  },
  {
    nom: 'Agent', points: 90, remise: 0.10, solde: 30, ration: 6,
    desc: 'On vous connaît. Les péages ne vous concernent plus.',
  },
  {
    nom: 'Lieutenant', points: 240, remise: 0.16, solde: 75, ration: 10,
    desc: 'Les armuriers vous sortent ce qu’ils gardent derrière, et leurs villes vous logent.',
  },
  {
    nom: 'Capitaine', points: 500, remise: 0.22, solde: 160, ration: 15,
    desc: 'On vous soigne sans compter, et on vient parfois à votre secours.',
  },
  {
    nom: 'Commandeur', points: 900, remise: 0.30, solde: 300, ration: 22,
    desc: 'Votre nom vaut un ordre écrit.',
  },
  {
    nom: 'Maréchal', points: 1500, remise: 0.38, solde: 520, ration: 30,
    desc: 'On vous confie la bourse du pays, et l’on vous répond des deux mains.',
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

/**
 * Ce que chaque drapeau exige avant de vous enrôler.
 *
 * Un seuil unique pour tout le monde faisait de « qui servir » un tirage entre
 * six couleurs : on s'engageait chez le premier venu, et le plus souvent dès la
 * première heure, puisqu'on démarre à douze d'estime chez ses hôtes. Or ces
 * gens-là n'ont rien en commun.
 *
 * Une Commune enrôle qui se présente — c'est une commune, elle n'a pas de
 * bureau du recrutement. Les nomades demandent qu'on se soit montré. Un
 * consortium et un syndicat veulent un dossier : ils traitent par contrat, et un
 * contrat se signe avec quelqu'un qu'on a déjà vu à l'œuvre. Une milice veut
 * qu'on ait fait ses preuves. Une église ne prend que les siens.
 *
 * L'effet de jeu est le point : partir chez les Communes Libres, c'est pouvoir
 * s'engager tout de suite et progresser lentement ; viser la Milice, c'est
 * travailler d'abord et entrer plus haut. La première décision de la partie
 * cesse d'être arbitraire.
 */
export const ESTIME_ENGAGEMENT = {
  // Dix, et pas davantage — essayé, mesuré, annulé.
  //
  // On démarre à douze chez ses hôtes : à dix, l'engagement est donc ouvert dès
  // la première heure, ce qu'on peut trouver trop facile. Porté à quinze, pour
  // exiger « un tout petit peu » de travail d'abord, le banc a rendu un verdict
  // sans appel : trente parties engagées deviennent sept, les heures sous les
  // couleurs tombent de 3 894 à 659, et le patrimoine moyen de 4 616 à 1 769.
  //
  // La raison n'est pas le seuil, c'est l'érosion : l'estime positive se perd
  // d'un dixième par jour, si bien que les douze points du départ retombent à
  // sept en deux mois de jeu sans qu'on ait rien fait de mal. Demander trois
  // points de plus, c'est demander de courir plus vite qu'une pente. La voie du
  // service s'évapore, exactement comme au temps où le seuil unique valait
  // vingt.
  //
  // Si l'ouverture doit se mériter un jour, le levier n'est pas ici : c'est
  // l'érosion du début de partie, ou un premier gain garanti chez ses hôtes.
  commune: 10,
  nomade: 18,
  corpo: 26,
  criminel: 26,
  militaire: 34,
  fanatique: 40,
};

/** Ce que cette faction-ci demande avant de vous enrôler. */
export function estimeEngagement(faction, world = null) {
  const f = drapeauDe(world, faction);
  return (f && ESTIME_ENGAGEMENT[f.style]) || REPUTATION_MINIMALE;
}

// ---------------------------------------------------------------------------
// Ce que chaque drapeau donne en propre
// ---------------------------------------------------------------------------

/**
 * Le service, c'est la même chose partout — plus une chose qui n'est qu'à eux.
 *
 * La première version distribuait des compromis : celui-ci paie mieux mais
 * protège moins, celui-là arme mieux mais paie mal. Verdict du joueur, et il
 * avait raison : « y aura pas une seule milice qui sera intéressante, il
 * faudrait qu'elles le soient toutes mais avec des extras propres à chacune
 * d'elles. » Un compromis entre six options qu'on ne peut pas comparer avant de
 * les avoir vécues n'est pas un choix, c'est une loterie qu'on regrette.
 *
 * Donc : la base est **identique** pour les six — les mêmes grades, la même
 * remise, la même solde, les mêmes rations, le même palier d'armurier (voir
 * RANGS, et rien là-dedans ne dépend du drapeau). Ce qui change, c'est un seul
 * avantage supplémentaire par couleur, qui ne s'obtient nulle part ailleurs et
 * qui ne coûte rien à personne. On ne choisit pas ce qu'on sacrifie, on choisit
 * ce qu'on gagne.
 *
 * Chacun ouvre à un grade différent, et c'est le seul dosage : ce qui pèse lourd
 * se mérite. `rang` est un indice dans RANGS.
 */
export const SERVICES = {
  corpo: {
    cle: 'compte',
    nom: 'Le compte ouvert',
    rang: 1,
    court: 'comptoir sans surtaxe',
    desc: 'Leur réseau vous traite comme un des leurs : le comptoir s’ouvre à vous quelle '
      + 'que soit votre estime, et sans la surtaxe qu’on fait payer aux étrangers.',
  },
  militaire: {
    cle: 'colonne',
    nom: 'La colonne qui vient',
    rang: 2,
    court: 'renfort à l’avant-poste',
    desc: 'Quand une colonne marche sur votre avant-poste, une des leurs part le défendre. '
      + 'Ils ne demandent pas si ça vous arrange.',
  },
  commune: {
    cle: 'bras',
    nom: 'Les bras',
    rang: 0,
    court: 'des gens viennent s’installer',
    desc: 'On parle de vous sur les pistes : les gens viennent s’installer chez vous deux fois '
      + 'plus vite, et l’on s’entasse un peu plus volontiers qu’ailleurs.',
  },
  nomade: {
    cle: 'fret',
    nom: 'Le fret',
    rang: 1,
    court: 'convois gardés pour rien',
    desc: 'Ils connaissent les routes et ils y sont chez eux : vos convois de comptoir voyagent '
      + 'escortés sans que vous payiez l’escorte.',
  },
  fanatique: {
    cle: 'ecoute',
    nom: 'L’écoute',
    rang: 1,
    court: 'recherche accélérée',
    desc: 'Leurs relais écoutent pour vous. Ce que vous cherchez, vous le trouvez un quart '
      + 'plus vite — et ils ne demandent rien pour ça.',
  },
  criminel: {
    cle: 'recel',
    nom: 'Le recel',
    rang: 0,
    court: 'aucune prime sur votre tête',
    desc: 'Ce qu’on raconte sur vous s’arrête à leur porte : plus aucune prime ne se met sur '
      + 'votre tête, nulle part, tant que vous les servez.',
  },
};

/** L'avantage propre à ce drapeau, quel que soit votre grade. */
export function serviceDe(faction, world = null) {
  const f = drapeauDe(world, faction);
  return (f && SERVICES[f.style]) || null;
}

/**
 * Cet avantage-ci joue-t-il en ce moment ?
 *
 * `cle` est celle de SERVICES — 'compte', 'colonne', 'bras', 'fret', 'ecoute',
 * 'recel'. On rend la faction qui le procure, ou `null` : les endroits qui s'en
 * servent ont souvent besoin de nommer qui rend le service.
 *
 * Une seule fonction interrogée partout, plutôt qu'un test de style recopié à
 * six endroits — c'est ce qui garantit que l'écran et le moteur parlent du même
 * avantage.
 */
export function avantage(state, cle) {
  // Écrit à la main plutôt qu'avec `groupesEngages` et `rangDe` : cette
  // fonction est interrogée plusieurs fois par tick, et ces deux-là allouent
  // chacune — un tableau filtré, un objet de grade — pour une lecture qui n'en
  // a aucun besoin.
  const gs = state.player.groupes || [];
  for (let i = 0; i < gs.length; i++) {
    const all = gs[i].allegeance;
    if (!all) continue;
    const s = serviceDe(all.faction);
    if (!s || s.cle !== cle) continue;
    // Le grade requis, sans construire l'objet : il suffit de savoir si l'on a
    // les points du palier.
    if (all.points >= RANGS[s.rang].points) return all.faction;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Ce que l'estime fait, dit en clair
// ---------------------------------------------------------------------------
//
// L'estime décidait déjà de huit choses — le prix qu'on vous fait, ce qu'on
// vous laisse posséder, si l'on vous enrôle, si l'intendance vous nourrit, si
// vos recrues coûtent cher, si leurs hommes vous cherchent sur les routes, si
// l'on vient prendre votre avant-poste, et s'il y a une prime sur votre tête —
// et le jeu n'en disait pas un mot. Un nombre qui monte et descend sans qu'on
// sache ce qu'il commande n'est pas une mécanique, c'est une décoration
// inquiétante.
//
// Ces bornes ne sont pas déclarées ici, elles y sont *relues* : chacune renvoie
// à l'endroit qui décide vraiment. Si l'un des deux bouge, l'autre ment — d'où
// le test qui les compare (voir headless, section « ce que l'estime change »).

/**
 * Les paliers d'estime, du pire au meilleur, avec ce que chacun entraîne.
 * `seuil` est la valeur à partir de laquelle la ligne s'applique.
 */
export const PALIERS_ESTIME = [
  {
    seuil: -100,
    nom: 'Traqué',
    faits: [
      'prime doublée sur votre tête : on vous cherche activement',
      'leurs hommes sortent du bois là où ils tiennent le terrain',
      'ils viendront prendre votre avant-poste',
      'prix majorés de moitié, à l’achat comme à l’embauche',
    ],
  },
  {
    seuil: -50,
    nom: 'Recherché',
    faits: [
      'prime sur votre tête',
      'leurs hommes sortent du bois là où ils tiennent le terrain',
      'ils viendront prendre votre avant-poste',
      'prix majorés',
    ],
  },
  {
    seuil: -20,
    nom: 'Hostile',
    faits: [
      'prix majorés à l’achat, recrues plus chères',
      'leurs hommes sortent du bois là où ils tiennent le terrain',
      'ils viendront prendre votre avant-poste',
    ],
  },
  {
    seuil: 0,
    nom: 'Inconnu',
    faits: ['on vous vend au prix, sans plus'],
  },
  {
    seuil: REPUTATION_MINIMALE,
    nom: 'Reçu',
    faits: [
      // Plus « on accepte votre engagement » : ce n'est plus vrai partout. Le
      // seuil d'enrôlement dépend du drapeau (voir ESTIME_ENGAGEMENT), et
      // `effetsEstime` ajoute la ligne juste pour la faction qu'on regarde.
      'l’intendance vous nourrit tant que vous servez',
      'recrues un peu moins chères',
    ],
  },
  {
    seuil: 25,
    nom: 'Estimé',
    faits: ['marge resserrée : on achète moins cher et l’on vend mieux'],
  },
  {
    seuil: 40,
    nom: 'Des leurs',
    faits: [
      'on vous vend des murs : coffre en propriété là où le régime l’autorise',
      'une de leurs villes peut se rattacher à votre avant-poste',
    ],
  },
];

/** Le palier où l'on se trouve auprès de cette faction. */
export function palierEstime(rep) {
  let p = PALIERS_ESTIME[0];
  for (const x of PALIERS_ESTIME) if (rep >= x.seuil) p = x;
  return p;
}

/**
 * Ce que votre estime change chez eux, maintenant, et ce qui vient ensuite.
 *
 * Rendu tel quel par l'interface : `acquis` est ce dont on jouit déjà, `perdu`
 * ce qu'on subit, `suivant` le prochain palier avec ce qu'il manque pour y
 * arriver. Les deux directions comptent — savoir qu'on est à quatre points de
 * refermer l'intendance vaut autant que savoir qu'on est à six d'un coffre.
 */
export function effetsEstime(state, faction) {
  const rep = Math.round(state.player.reputation[faction] || 0);
  const ici = palierEstime(rep);
  const acquis = [];
  const perdu = [];
  for (const p of PALIERS_ESTIME) {
    if (p.seuil > 0 && rep >= p.seuil) acquis.push(...p.faits);
    if (p.seuil < 0 && rep <= p.seuil) perdu.push(...p.faits);
  }
  // L'enrôlement n'est pas un palier universel : chaque drapeau a le sien. On
  // l'ajoute là où il tombe, avec le nom de ceux qui le demandent.
  const exige = estimeEngagement(faction);
  if (rep >= exige) acquis.push('on accepte votre engagement');
  else perdu.push(`ils n’enrôlent qu’à partir de ${exige} d’estime`);
  const suivant = PALIERS_ESTIME.find((p) => p.seuil > rep) || null;
  const dessous = [...PALIERS_ESTIME].reverse().find((p) => p.seuil < rep && p.seuil <= -20) || null;
  return {
    rep,
    palier: ici,
    // Doublons supprimés : les paliers hostiles se recouvrent volontairement,
    // et lire deux fois « ils viendront prendre votre avant-poste » donne
    // l'impression d'un bégaiement plutôt que d'une aggravation.
    acquis: [...new Set(acquis)],
    perdu: [...new Set(perdu)],
    suivant: suivant ? { nom: suivant.nom, seuil: suivant.seuil, manque: suivant.seuil - rep, faits: suivant.faits } : null,
    menace: dessous ? { nom: dessous.nom, seuil: dessous.seuil, marge: rep - dessous.seuil } : null,
  };
}

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

/**
 * Palier d'équipement supplémentaire : ce que l'armurier sort de derrière.
 *
 * Deux façons de l'obtenir, et elles ne s'additionnent pas — c'est déjà le
 * plafond de ce qu'une ville tient en réserve. Ou bien l'on a le grade chez eux,
 * ou bien l'on est dans un Domaine, où le seigneur arme qui passe : on n'y
 * possède rien, l'école y est réservée aux siens, mais c'est là qu'on trouve les
 * bonnes armes sans avoir rien juré. C'est ce qui fait du Domaine une
 * destination plutôt qu'un mur.
 */
export function palierBonus(state, faction) {
  const r = meilleurGrade(state, faction);
  if (r && r.index >= 2) return 1;
  const reg = REGIMES[loisDe(state.world, faction).regime];
  return reg && reg.palier ? reg.palier : 0;
}

// ---------------------------------------------------------------------------
// Entrer et sortir
// ---------------------------------------------------------------------------

export function peutSEngager(state, faction, groupe) {
  const g = groupe || groupeActif(state);
  if (!drapeauDe(state.world, faction) || faction === 'essaim') {
    return { ok: false, motif: 'Cette faction n’enrôle personne.' };
  }
  if (g && g.allegeance) {
    return { ok: false, motif: `${g.nom} sert déjà ${drapeauDe(state.world, g.allegeance.faction).genitif}.` };
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
        motif: `${autre.nom} sert ${drapeauDe(state.world, autre.allegeance.faction).genitif}, en guerre contre eux.`,
      };
    }
  }
  const rep = state.player.reputation[faction] || 0;
  const exige = estimeEngagement(faction);
  if (rep < exige) {
    return {
      ok: false,
      motif: `${drapeauDe(state.world, faction).nom} demande ${exige} d’estime — vous en avez ${Math.round(rep)}.`,
    };
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
    // Ce qu'on a fait pour eux, dans l'ordre. Voir `noterFait`.
    faits: [],
    // Ce dont on répond : les actes ordonnés qui attendent leur issue, et ce
    // qu'on a déjà mis à votre charge.
    actes: [],
    fautes: 0,
    // Le morceau de carte dont on répondra à partir de Lieutenant.
    secteur: null,
  };

  // On ne choisit pas un camp sans que l'autre le remarque.
  for (const w of state.world.guerres) {
    const autre = w.a === faction ? w.b : w.b === faction ? w.a : null;
    if (!autre) continue;
    state.player.reputation[autre] = Math.max(-100, (state.player.reputation[autre] || 0) - 20);
  }

  log({
    type: 'allegeance',
    texte: `${g.nom} entre au service ${drapeauDe(state.world, faction).genitif}. Rang : ${RANGS[0].nom}.`,
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
    texte: `Vous rompez avec ${drapeauDe(state.world, f).nom}. On n’oublie pas ce genre de départ.`,
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

/**
 * La colonne qui vient : ce que la Milice de Cendre donne aux siens.
 *
 * Un avant-poste assiégé ne l'est plus tout à fait seul. Ce n'est pas une
 * garnison permanente — elle ne compte que pendant l'assaut, et seulement là où
 * il y a un assaut : la Milice ne garde pas votre hangar, elle vient au bruit.
 *
 * L'ordre de grandeur : un avant-poste bien tenu défend autour de quarante, et
 * une colonne qui marche sur lui en pèse cent à deux cents. Quarante de renfort
 * ne rend donc pas la place imprenable — ça change l'issue d'un siège serré,
 * ce qui est exactement ce qu'un allié doit faire.
 */
/**
 * Ce que la loi du pays dit d'un ordre qui traîne (PROMESSES.md, P5).
 * Retourne { suspendue, rancune, traine } — `traine` en multiples de la
 * route de la mission. Sans ordre en attente, rien à reprocher à personne ;
 * un ordre d'avant l'estampille (`o.t`) non plus : on ne juge pas sur des
 * registres qu'on n'a pas tenus.
 */
export function disciplineDe(state, all) {
  const rien = { suspendue: false, rancune: false, traine: 0 };
  if (!all || !all.faction) return rien;
  const o = all.ordre;
  if (!o || o.t === undefined) return rien;
  const d = DISCIPLINES[loisDe(state.world, all.faction).discipline]
    || DISCIPLINES.comptable;
  const traine = (state.temps - o.t) / Math.max(1, o.routeH || 300);
  return {
    suspendue: d.patience != null && traine > d.patience,
    rancune: d.rancune != null && traine > d.rancune,
    traine,
  };
}

export const RENFORT_MILICE = 40;

export function renfortMilice(state) {
  const f = avantage(state, 'colonne');
  if (!f) return 0;
  // Ils viennent d'autant plus nombreux qu'on pèse chez eux.
  const r = meilleurGrade(state, f);
  return Math.round(RENFORT_MILICE * (1 + (r ? r.index - SERVICES.militaire.rang : 0) * 0.5));
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
  // On reste servi tant qu'on n'est pas devenu infréquentable : c'est un seuil
  // plus bas que celui de l'enrôlement, et le même pour tous. Entrer chez eux
  // se mérite ; y être nourri, une fois entré, ne se remérite pas tous les
  // matins.
  if (rep < REPUTATION_MINIMALE) {
    return { ok: false, motif: `On ne vous sert plus : réputation ${Math.round(rep)}.` };
  }
  const rang = rangDe(all);
  const brut = (state.temps - (all.intendance ?? all.depuis ?? 0)) / 24;
  const jours = Math.min(JOURS_INTENDANCE, brut);
  const du = Math.floor(jours * (rang.def.ration || 0));
  if (du < 1) {
    // Combien d'heures avant que ça vaille le déplacement : « rien pour
    // l'instant » sans dire quand est une réponse qui n'aide personne.
    const parJour = rang.def.ration || 0;
    const heures = parJour > 0 ? Math.ceil((1 / parJour) * 24 - (state.temps
      - (all.intendance ?? all.depuis ?? 0))) : 0;
    return {
      ok: false,
      motif: heures > 0
        ? `Rien à toucher avant ${heures} h : on compte ${parJour} ration${parJour >= 2 ? 's' : ''} par jour.`
        : 'Rien à toucher pour l’instant.',
    };
  }
  // On ne puise pas dans le grenier du village : une faction nourrit ses gens
  // sur ses propres deniers. C'est la différence entre une réquisition et une
  // intendance — et c'est aussi ce qui rend la chose possible, les villes ne
  // gardant quasiment aucune réserve (vingt-quatre sur quatre-vingt-deux en
  // avaient une, mesuré à deux mille heures).
  const f = state.world.factions[all.faction];
  const cout = Math.round(du * COMMODITIES.rations.prix * 0.6);
  if (!f || f.tresor < cout) {
    return { ok: false, motif: `${drapeauDe(state.world, all.faction).nom} n’a pas de quoi vous ravitailler.` };
  }
  // Le plafond est une règle, pas un accident : on le dit à celui qui le
  // touche, plutôt que de le laisser constater que son arriéré ne monte plus.
  return {
    ok: true,
    quantite: du,
    cout,
    rang,
    plafonne: brut > JOURS_INTENDANCE,
    jours: Math.round(brut * 10) / 10,
    perdu: Math.floor((brut - JOURS_INTENDANCE) * (rang.def.ration || 0)),
  };
}

export function toucherRations(state, col, log, groupe) {
  const g = groupe || groupeActif(state);
  const d = droitIntendance(state, col, g);
  if (!d.ok) return d;
  if (!g || g.regionId !== col.regionId) {
    return { ok: false, motif: 'Il faut être sur place.' };
  }
  depenser(state.world, g.allegeance.faction, d.cout);
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
      texte: `${drapeauDe(state.world, all.faction).nom} vous élève au rang de ${RANGS[apres].nom}. ${RANGS[apres].desc}`,
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
/**
 * Le délai d'un ordre — quand il y en a un, et il n'y en a presque jamais.
 *
 * Tous les ordres de mission en avaient un, et c'est la même erreur que sur le
 * panneau d'affichage : quand échouer est la norme, on cesse de signer. Le
 * reproche a été fait plusieurs fois, et je n'avais corrigé que les contrats.
 *
 * Désormais un ordre sur quatre presse — il le dit et il paie moitié plus. Les
 * autres attendent qu'on les fasse. Ce qui borne, c'est qu'on n'en reçoit qu'un
 * à la fois : tant qu'on traîne celui-ci, le suivant ne vient pas.
 *
 * Et quand il y en a un, il est *tenable* : le calcul part du double de la
 * distance — aller et revenir — à vingt-six heures par région, soit trois à six
 * fois l'allure réelle d'une colonne. Un délai qu'on sait d'avance intenable n'a
 * rien à faire dans le jeu.
 */
export const PART_URGENTE_ORDRE = 0.25;
/**
 * Ce qu'un ordre pressé paie de plus.
 *
 * Dans un objet, et non en scalaire : c'est ce qui permet de la neutraliser
 * pour mesurer, et donc de comparer deux mondes qui ne diffèrent que par elle.
 * Sans ce témoin, on comparait la moyenne des ordres pressés à celle des
 * calmes — une mesure qui dépend surtout de la distance et de la quantité, et
 * qui s'inversait sans que la prime ait bougé. Voir R2 dans RECETTES.md.
 */
export const URGENCE_ORDRE = { prime: 1.5 };

function delai(d, rng, base = 200) {
  return Math.round((base + d * 2 * 26) * rng.range(1, 1.4));
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
      titre: `${victoires} victoire${victoires > 1 ? 's' : ''} contre ${drapeauDe(state.world, cible).nom}`,
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
    // La case dans le titre : c'est la ligne qu'on lit, et « Poste-Ambre » seul
    // n'apprend rien à qui ne connaît pas encore la carte.
    titre: `Ravitailler ${pire.nom} (${coordonnee(state.world, pire.regionId)}) : `
      + `${quantite} ${COMMODITIES[ressource].nom.toLowerCase()}`,
    recompense: Math.round(COMMODITIES[ressource].prix * quantite * rng.range(1.8, 2.6)),
    service: Math.round(quantite * 1.5 + 30),
    duree: delai(distance(pire.regionId, ici), rng, 220),
  };
}

/** Combien d'ordres on garde en mémoire. Au-delà, seuls les totaux restent. */
export const FEUILLE_MAX = 14;

/**
 * La feuille de service : ce qu'on a fait pour eux, et ce qu'on a laissé filer.
 *
 * Le jeu comptait bien les ordres remplis, mais nulle part on ne pouvait
 * relire ce qu'on avait fait : le journal les annonce puis les fait défiler, et
 * il est plafonné à quatre cents lignes. On sert une faction pendant six mois
 * de jeu et il n'en reste qu'un nombre.
 */
export function noterFait(all, o, issue, t, bilan) {
  if (!all) return;
  if (!all.faits) all.faits = [];
  // Ce que ça a rapporté ou coûté, réellement : crédits, points de service,
  // estime. Un dossier qui dit « honoré » sans dire combien ne sert qu'à
  // moitié, et les valeurs annoncées par l'ordre ne sont pas toujours celles
  // qu'on touche — le service passe par `crediter`, qui a ses propres règles.
  const f = { t, type: o.type, titre: o.titre, issue };
  if (bilan) {
    if (bilan.cr) f.cr = Math.round(bilan.cr);
    if (bilan.pts) f.pts = Math.round(bilan.pts);
    if (bilan.rep) f.rep = Math.round(bilan.rep);
  }
  all.faits.push(f);
  if (all.faits.length > FEUILLE_MAX) all.faits.shift();
}

/** Les totaux de la feuille, tous ordres confondus depuis l'engagement. */
export function bilanService(all) {
  const out = { honores: 0, manques: 0, annules: 0 };
  if (!all) return out;
  out.manques = all.manques || 0;
  for (const f of all.faits || []) {
    if (f.issue === 'honore') out.honores++;
    else if (f.issue === 'annule') out.annules++;
  }
  // Les manques sont comptés depuis toujours, les faits seulement sur les
  // quatorze derniers : on prend le plus grand des deux pour ne pas mentir.
  out.honores = Math.max(out.honores, all.ordresHonores || 0);
  return out;
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
      texte: `${drapeauDe(state.world, all.faction).nom} n’existe plus. L’engagement de ${g.nom} tombe avec elle.`,
      important: true,
      groupe: g.id,
    });
    g.allegeance = null;
    return;
  }

  const rang = rangDe(all);

  // La discipline de solde (PROMESSES.md, P5) : ce que le pays fait d'un
  // ordre qui traîne, c'est SA loi — l'armée ne paie pas les absents, les
  // Communes paient à vie, l'Ombrelle retient. On paie un soldat selon la
  // culture qui l'emploie, pas selon une règle du jeu.
  const disc = disciplineDe(state, all);
  if (disc.suspendue && !all.soldeSuspendue) {
    all.soldeSuspendue = true;
    log({
      type: 'allegeance',
      texte: `${drapeauDe(state.world, all.faction).nom} : la solde attend que `
        + `vous fassiez votre part (« ${all.ordre.titre} »).`,
      important: true,
    });
  } else if (!disc.suspendue && all.soldeSuspendue) {
    all.soldeSuspendue = false;
  }
  if (disc.suspendue) {
    // L'intendance non plus ne nourrit pas les absents : les jours suspendus
    // ne s'accumulent pas.
    all.intendance = Math.min(state.temps, (all.intendance || 0) + 1);
  }
  if (disc.rancune) {
    // On ne fait pas de paperasse, on retient.
    state.player.reputation[all.faction] = Math.max(-100,
      (state.player.reputation[all.faction] || 0) - 0.02);
  }

  // Solde versée tous les jours, à partir du grade d'Agent.
  if (!disc.suspendue && rang.def.solde > 0 && state.temps - all.derniereSolde >= 24) {
    all.derniereSolde = state.temps;
    gagner(state, rang.def.solde);
    noterArgent(state, 'solde', rang.def.solde);
    log({
      type: 'solde',
      texte: `Solde ${drapeauDe(state.world, all.faction).genitif} : ${rang.def.solde} ${symboleDe(state.world, all.faction)}.`,
      discret: true,
    });
  }

  // Un ordre de frappe meurt avec sa guerre. Les traités se signent pendant que
  // la colonne marche, et l'ordre lui survivait : on continuait de chasser des
  // gens avec qui la paix venait d'être faite, sur des terres qui ne sortaient
  // plus personne, et l'on perdait de l'estime pour ne pas y être arrivé.
  // Mesuré au banc : 45 % des heures passées à honorer une frappe l'étaient
  // contre une faction avec qui la guerre était déjà finie.
  if (all.ordre && all.ordre.type === 'frappe') {
    const cible = all.ordre.cibleFaction;
    const encore = state.world.guerres.some(
      (w) => (w.a === all.faction && w.b === cible) || (w.b === all.faction && w.a === cible)
    );
    if (!encore) {
      const o = all.ordre;
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(60, 140);
      noterFait(all, o, 'annule', state.temps);
      log({
        type: 'allegeance',
        texte: `Ordre annulé : ${o.titre}. La paix est signée, on vous rappelle.`,
        important: true,
      });
    }
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
      // On relève les compteurs avant et après : ce qu'on inscrit au dossier
      // est ce qui s'est réellement passé, pas ce que l'ordre promettait.
      const crAvant = soldeIci(state);
      const repAvant = state.player.reputation[all.faction] || 0;
      const ptsAvant = all.points;
      gagner(state, o.recompense);
      noterArgent(state, 'missions honorées', o.recompense);
      state.player.reputation[all.faction] = Math.min(100, repAvant + 5);
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(120, 260);
      state.stats.ordresRemplis = (state.stats.ordresRemplis || 0) + 1;
      all.ordresHonores = (all.ordresHonores || 0) + 1;
      crediter(state, o.service, log, null, g);
      noterFait(all, o, 'honore', state.temps, {
        cr: soldeIci(state) - crAvant,
        pts: all.points - ptsAvant,
        rep: (state.player.reputation[all.faction] || 0) - repAvant,
      });
      log({
        type: 'allegeance',
        texte: `Ordre exécuté : ${o.titre}. ${o.recompense} ${signeIci(state)}.`,
        important: true,
      });
    } else if (all.ordre.echeance && state.temps > all.ordre.echeance) {
      const o = all.ordre;
      all.ordre = null;
      all.prochainOrdre = state.temps + rng.irange(180, 320);
      // Une mission tombée pendant que le joueur n'était pas là n'est pas un
      // manquement : on ne peut pas reprocher un silence à quelqu'un qui
      // n'était pas aux commandes. La faction la confie à un autre, on l'inscrit
      // comme annulée, et l'estime ne bouge pas.
      //
      // Sans ça, revenir après trois jours d'absence coûtait une dizaine de
      // points d'estime pour des ordres qu'on n'a jamais vus passer — et
      // l'estime, elle, ferme l'intendance, majore les prix et finit par mettre
      // une prime sur votre tête. Un jeu qu'on ouvre cinq minutes par jour ne
      // peut pas punir les heures où l'on ne l'ouvre pas.
      if (ctx && ctx.absent) {
        noterFait(all, o, 'annule', state.temps);
        log({
          type: 'allegeance',
          texte: `Sans nouvelles de vous, ${drapeauDe(state.world, all.faction).nom} a confié `
            + `« ${o.titre} » à quelqu’un d’autre. Rien à votre dossier.`,
          important: true,
        });
      } else {
        // Rater est neutre, réussir paie. On ne retire plus les points acquis :
        // à −80 % du service par ordre manqué, on avançait de trois pas et on en
        // reculait de deux, et le banc l'a chiffré — quarante-quatre escouades
        // sur quarante-huit ne quittaient jamais le premier grade. Ce qu'on
        // perd, c'est l'estime, et elle finit par fermer l'intendance.
        const repAvantM = state.player.reputation[all.faction] || 0;
        state.player.reputation[all.faction] = Math.max(-100, repAvantM - 3);
        all.manques = (all.manques || 0) + 1;
        noterFait(all, o, 'manque', state.temps, {
          rep: (state.player.reputation[all.faction] || 0) - repAvantM,
        });
        log({
          type: 'allegeance',
          texte: `Ordre non exécuté : ${o.titre}. On le note.`,
          important: true,
        });
      }
    }
    // On ne remet pas d'ordre à quelqu'un qui n'est pas aux commandes : il le
    // trouverait déjà entamé, ou déjà expiré. Il l'aura à son retour.
  } else if (state.temps >= all.prochainOrdre && !(ctx && ctx.absent)) {
    const o = fabriquerOrdre(state, rng, g);
    if (o) {
      // L'estampille de la discipline (P5) : quand l'ordre est tombé, et ce
      // que sa route vaut — c'est là-dessus que la loi du pays jugera.
      o.t = state.temps;
      o.routeH = o.duree || 300;
      // Le délai est l'exception, et il se paie. Voir `delai` au-dessus.
      o.urgent = rng.chance(PART_URGENTE_ORDRE);
      if (o.urgent) o.recompense = Math.round(o.recompense * URGENCE_ORDRE.prime);
      else o.duree = null;
      o.echeance = o.duree ? state.temps + o.duree : null;
      all.ordre = o;
      log({
        type: 'allegeance',
        texte: `Ordre de mission ${drapeauDe(state.world, all.faction).genitif} : ${o.titre} (${o.recompense} ${signeIci(state)}).`,
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
