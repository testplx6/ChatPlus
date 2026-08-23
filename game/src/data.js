// Données statiques du monde : marchandises, biomes, factions, bâtiments,
// recherches, équipement, tables de noms. Aucun état de partie ici.

export const TICK_HOURS = 1; // 1 tick = 1 heure de jeu
export const HOURS_PER_DAY = 24;

/**
 * Ce que les habitants d'une ville ont en poche.
 *
 * Ce stock manquait, et son absence était le défaut de fond de la première
 * économie : le revenu d'une ville sortait de nulle part, donc la monnaie ne
 * faisait que croître, donc les trésors gonflaient sans fin et plus aucune
 * faction ne pouvait être abattue. Avec les ménages, ce que la ville encaisse
 * sort de la poche de ses gens, et ce qu'elle leur verse en salaires y
 * retourne : la monnaie circule au lieu d'apparaître.
 *
 * Ici plutôt que dans economy.js parce que world.js en a besoin à la création
 * et qu'economy.js dépend déjà de world.js — l'inverse ferait un cycle.
 *
 * `parTete` est dérivé de la population, jamais tiré : un `rng` de plus dans la
 * création d'une ville décale tous les tirages suivants et le monde entier
 * change à graine égale. Calibré au lot A6.
 */
export const MENAGES = { parTete: 3 };

// ---------------------------------------------------------------------------
// Marchandises
// ---------------------------------------------------------------------------

export const COMMODITIES = {
  ferraille: { nom: 'Ferraille', prix: 3, poids: 1.0 },
  minerai: { nom: 'Minerai', prix: 5, poids: 1.2 },
  polymere: { nom: 'Polymère', prix: 6, poids: 0.6 },
  biomasse: { nom: 'Biomasse', prix: 4, poids: 0.8 },
  rations: { nom: 'Rations', prix: 9, poids: 0.5 },
  alliage: { nom: 'Alliage', prix: 14, poids: 1.0 },
  carburant: { nom: 'Carburant', prix: 12, poids: 0.9 },
  isotope: { nom: 'Isotope', prix: 22, poids: 0.4 },
  composant: { nom: 'Composant', prix: 30, poids: 0.3 },
  medkit: { nom: 'Medkit', prix: 45, poids: 0.4 },
};

export const COMMODITY_KEYS = Object.keys(COMMODITIES);

// ---------------------------------------------------------------------------
// Biomes
// ---------------------------------------------------------------------------
// yields  : ressources extractibles par heure de travail (avant compétences)
// danger  : probabilité de base de rencontre hostile par heure
// cout    : heures de marche pour traverser la région
// hazard  : aléa environnemental permanent

export const BIOMES = {
  steppe: {
    nom: 'Steppe de Cendre',
    court: 'STEPPE',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 1.0, vent: 1.2,
    couleurs: ['#33323a', '#3d3c46', '#2b2a32'],
    danger: 0.014,
    cout: 3,
    yields: { biomasse: 0.4, ferraille: 0.35 },
    hazard: { type: 'tempete', nom: 'Tempête de cendre', p: 0.02, degats: 3, fatigue: 6 },
  },
  dalles: {
    nom: 'Dalles Urbaines',
    court: 'DALLES',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 0.8, vent: 0.7,
    couleurs: ['#2a2f3a', '#39404f', '#222732'],
    danger: 0.032,
    cout: 3,
    yields: { ferraille: 1.0, polymere: 0.55, composant: 0.09 },
    hazard: { type: 'effondrement', nom: 'Effondrement', p: 0.012, degats: 8, fatigue: 4 },
  },
  friche: {
    nom: 'Friche Radio',
    court: 'FRICHE',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 0.7, vent: 0.8,
    couleurs: ['#3a3320', '#4a4128', '#2f2a1a'],
    danger: 0.028,
    cout: 4,
    yields: { isotope: 0.42, ferraille: 0.35 },
    hazard: { type: 'radiation', nom: 'Radiations', p: 0.08, degats: 2, fatigue: 3 },
  },
  desert: {
    nom: 'Désert Acide',
    court: 'DÉSERT',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 1.35, vent: 1.1,
    couleurs: ['#5a4a2a', '#6b5a33', '#4a3d22'],
    danger: 0.022,
    cout: 5,
    yields: { minerai: 0.5, isotope: 0.18 },
    hazard: { type: 'acide', nom: 'Pluie acide', p: 0.05, degats: 4, fatigue: 5 },
  },
  canyons: {
    nom: 'Canyons de Fer',
    court: 'CANYONS',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 0.85, vent: 1.15,
    couleurs: ['#4a2f2a', '#5a3a32', '#3c2622'],
    danger: 0.036,
    cout: 6,
    yields: { minerai: 1.0, alliage: 0.08 },
    hazard: { type: 'eboulement', nom: 'Éboulement', p: 0.02, degats: 10, fatigue: 5 },
  },
  marais: {
    nom: 'Marais Néon',
    court: 'MARAIS',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 0.55, vent: 0.5,
    couleurs: ['#16342c', '#1d4438', '#122a24'],
    danger: 0.04,
    cout: 6,
    yields: { biomasse: 1.0, polymere: 0.3 },
    hazard: { type: 'spores', nom: 'Spores', p: 0.06, degats: 3, fatigue: 7 },
  },
  plastique: {
    nom: 'Mer de Plastique',
    court: 'PLASTIQUE',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 0.9, vent: 0.6,
    couleurs: ['#2b2438', '#392f4a', '#231d2e'],
    danger: 0.03,
    cout: 7,
    yields: { polymere: 1.2, carburant: 0.28 },
    hazard: { type: 'enlisement', nom: 'Enlisement', p: 0.03, degats: 5, fatigue: 9 },
  },
  brulees: {
    nom: 'Terres Brûlées',
    court: 'BRÛLÉES',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 1.2, vent: 1.0,
    couleurs: ['#4a2420', '#5c2e28', '#3a1c19'],
    danger: 0.052,
    cout: 5,
    yields: { carburant: 0.6, minerai: 0.4 },
    hazard: { type: 'chaleur', nom: 'Chaleur extrême', p: 0.09, degats: 3, fatigue: 10 },
  },
  relais: {
    nom: 'Relais Orbital',
    court: 'RELAIS',
    // Ce que le terrain offre à qui capte : voir `rendementLibre`.
    soleil: 0.95, vent: 0.9,
    couleurs: ['#1d3a4a', '#26506a', '#152c39'],
    danger: 0.075,
    cout: 6,
    yields: { composant: 0.5, isotope: 0.5, alliage: 0.2 },
    hazard: { type: 'ondes', nom: 'Ondes porteuses', p: 0.07, degats: 4, fatigue: 8 },
  },
};

export const BIOME_KEYS = Object.keys(BIOMES);

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export const FACTIONS = {
  hexa: {
    nom: 'Consortium Hexa',
    court: 'HEXA',
    pluriel: false,
    datif: 'au Consortium Hexa',
    genitif: 'du Consortium Hexa',
    couleur: '#4fd0e3',
    symbole: '⬡',
    devise: 'Le contrat prime sur le sang.',
    agression: 0.42,
    cupidite: 0.9,
    style: 'corpo',
    biomes: ['dalles', 'relais', 'friche'],
  },
  rouilleurs: {
    nom: 'Les Rouilleurs',
    court: 'ROUIL',
    pluriel: true,
    datif: 'aux Rouilleurs',
    genitif: 'des Rouilleurs',
    couleur: '#d98a3a',
    symbole: '⚙',
    devise: 'Tout se démonte, même toi.',
    agression: 0.5,
    cupidite: 0.55,
    style: 'nomade',
    biomes: ['canyons', 'desert', 'steppe'],
  },
  signal: {
    nom: 'Église du Signal',
    court: 'SIGNL',
    pluriel: false,
    datif: 'à l’Église du Signal',
    genitif: 'de l’Église du Signal',
    couleur: '#b06be0',
    symbole: '✷',
    devise: 'La statique parle à qui écoute.',
    agression: 0.62,
    cupidite: 0.3,
    style: 'fanatique',
    biomes: ['relais', 'friche', 'brulees'],
  },
  ombrelle: {
    nom: 'Syndicat Ombrelle',
    court: 'OMBRL',
    pluriel: false,
    datif: 'au Syndicat Ombrelle',
    genitif: 'du Syndicat Ombrelle',
    couleur: '#6be08a',
    symbole: '☂',
    devise: 'Rien n’est interdit, tout est tarifé.',
    agression: 0.52,
    cupidite: 0.95,
    style: 'criminel',
    biomes: ['dalles', 'plastique', 'marais'],
  },
  cendre: {
    nom: 'Milice de Cendre',
    court: 'CENDR',
    pluriel: false,
    datif: 'à la Milice de Cendre',
    genitif: 'de la Milice de Cendre',
    couleur: '#e05b5b',
    symbole: '▲',
    devise: 'L’ordre, ou la cendre.',
    agression: 0.78,
    cupidite: 0.4,
    style: 'militaire',
    biomes: ['steppe', 'brulees', 'canyons'],
  },
  libres: {
    nom: 'Communes Libres',
    court: 'LIBRE',
    pluriel: true,
    datif: 'aux Communes Libres',
    genitif: 'des Communes Libres',
    couleur: '#e0d36b',
    symbole: '✿',
    devise: 'On ne rend de comptes qu’à la récolte.',
    agression: 0.18,
    cupidite: 0.35,
    style: 'commune',
    biomes: ['marais', 'steppe', 'desert'],
  },
  essaim: {
    nom: 'L’Essaim',
    court: 'ESSAM',
    pluriel: false,
    datif: 'à l’Essaim',
    genitif: 'de l’Essaim',
    couleur: '#8a8f9a',
    symbole: '✳',
    devise: '—',
    agression: 0.95,
    cupidite: 0,
    style: 'essaim',
    biomes: ['plastique', 'friche', 'brulees'],
  },
};

export const FACTION_KEYS = Object.keys(FACTIONS);

/**
 * L'identité d'une faction : celle du monde si elle y est, celle du jeu sinon.
 *
 * Un même mot désignait deux choses, et le moteur n'a jamais eu besoin de les
 * distinguer tant que la liste des drapeaux était fixe :
 *
 *   l'identité   `FACTIONS[clé]` — nom, couleur, génitif, devise, tempérament.
 *                Donnée de module, la même dans toutes les parties.
 *   la situation `world.factions[clé]` — trésor, villes, relations. État
 *                sauvegardé, propre à la partie.
 *
 * Dès qu'une faction peut naître en cours de partie, la confusion cesse d'être
 * gratuite : son identité n'a nulle part où exister. `world.drapeaux` la loge —
 * **et lui seul**. Les sept d'origine restent ici : les recopier mettrait sept
 * descriptions identiques dans chaque fichier de sauvegarde, pour rien.
 *
 * Le recensement des sites à brancher a été fait à la mesure et non à la
 * lecture — un `Proxy` sur `FACTIONS` et une faction fantôme posée dans le
 * monde. Dix-sept sites, sur cent quarante et une lectures. Voir
 * `FACTIONS-NEUVES.md` §7, N1.
 */
/**
 * Les drapeaux d'un monde donné, et pas ceux du jeu.
 *
 * `FACTION_KEYS` et `DIPLO_FACTIONS` sont figés à sept : ils décrivent la partie
 * qu'on n'a pas encore commencée. Dès qu'une faction peut naître, s'en servir
 * pour parcourir le monde revient à ignorer les nouvelles venues — et ce n'est
 * pas cosmétique. **Mesuré** : une faction posée dans un monde sans être dans
 * `DIPLO_FACTIONS` vit très bien — huit villes, une colonne, des relations, une
 * monnaie cotée — mais `auditer` ne la voit pas, et les comptes des *autres*
 * dérivent alors de 4 440 crédits en mille cinq cents heures. L'invariant
 * comptable, la garde la plus sûre du moteur, tombe en silence.
 *
 * `world.factions` est la liste qui fait autorité : elle porte la situation de
 * chaque drapeau, d'origine ou non.
 *
 * Les deux constantes restent, et servent encore là où la question porte
 * vraiment sur les sept d'origine : la génération du monde, avant qu'aucune
 * faction n'ait pu naître.
 */
export function clesDe(world) {
  return world && world.factions ? Object.keys(world.factions) : FACTION_KEYS;
}

/**
 * Les mêmes, sans l'Essaim qui ne joue pas le jeu diplomatique, et **sans les
 * pays éteints**.
 *
 * Un pays mort ne délibère plus, ne fait plus la guerre, n'ouvre plus de
 * bourse. Il reste pourtant dans `world.factions` : sa masse émise existe
 * toujours, et son magot traîne quelque part. C'est `auditer` qui continue de
 * le regarder — voir le commentaire là-bas.
 */
export function diploDe(world) {
  const f = (world && world.factions) || {};
  return clesDe(world).filter((k) => k !== 'essaim' && !(f[k] && f[k].morte));
}

/**
 * B a-t-il déjà eu à se situer par rapport à A ? Alors il le reconnaît.
 *
 * La règle est du propriétaire, et elle est plus fine qu'elle en a l'air : « à
 * partir du moment où une autre faction interagit avec, se positionne sur les
 * ententes de paix guerre commerciaux etc. avec elle, elle la reconnaît
 * forcément comme telle ».
 *
 * Autrement dit la reconnaissance **n'est pas un état** — ni un champ à
 * stocker, ni un vote à organiser, ni une file de demandes. C'est une lecture
 * de ce que le monde porte déjà : une guerre déclarée, un accord signé, une
 * relation qui n'est plus neutre. Fonder un drapeau ne demande donc la
 * permission de personne, et une faction née hier existe : elle est seulement
 * **seule** tant que personne n'a eu affaire à elle.
 *
 * Elle vit ici plutôt que dans `factions.js` parce que `bourse.js` en a besoin
 * et précède `factions.js` — piège n°3 de `game/CLAUDE.md`. Elle ne lit que le
 * monde, donc elle n'a rien à demander à personne.
 *
 * **L'Essaim n'est pas traité à part, et c'est voulu.** `enGuerre` le dit en
 * guerre contre tout le monde sans qu'aucune guerre soit déclarée ; ici on lit
 * les guerres réelles. Un fléau ne reconnaît personne et n'est reconnu de
 * personne — il ne signe rien, il ne cote rien.
 */
export function reconnue(world, cle, par) {
  if (!world || !cle || !par || cle === par) return false;
  const f = world.factions && world.factions[par];
  if (!f) return false;
  if ((world.guerres || []).some(
    (g) => (g.a === par && g.b === cle) || (g.a === cle && g.b === par))) return true;
  if ((world.accords || []).some(
    (x) => (x.a === par && x.b === cle) || (x.a === cle && x.b === par))) return true;
  return (f.relations || {})[cle] !== undefined;
}

export function drapeauDe(world, cle) {
  return (world && world.drapeaux && world.drapeaux[cle]) || FACTIONS[cle];
}
/** Factions jouant le jeu diplomatique (l'Essaim en est exclu). */
export const DIPLO_FACTIONS = FACTION_KEYS.filter((k) => k !== 'essaim');

// ---------------------------------------------------------------------------
// Bâtiments de l'avant-poste
// ---------------------------------------------------------------------------
// cout    : coût de base (multiplié par coutMul^(niveau-1))
// heures  : durée de base (multipliée par tempsMul^(niveau-1))
// energie : > 0 produit, < 0 consomme

export const BUILDINGS = {
  generateur: {
    nom: 'Générateur',
    desc: 'Brûle du carburant, alimente tout le reste.',
    cout: { ferraille: 70, composant: 8 },
    coutMul: 1.6,
    heures: 5,
    tempsMul: 1.5,
    energie: 12,
    max: 8,
  },
  entrepot: {
    nom: 'Entrepôt',
    desc: 'Capacité de stockage de l’avant-poste.',
    cout: { ferraille: 55, polymere: 25 },
    coutMul: 1.55,
    heures: 4,
    tempsMul: 1.45,
    energie: 0,
    max: 10,
  },
  semoir: {
    nom: 'Ensemenceuse',
    desc: 'On jette de la vie sur une terre qui n’en veut pas, et l’on recommence.',
    // Ce que les bassins font sous cloche, l'ensemenceuse le fait dehors : elle
    // ne nourrit personne à elle seule, elle change la région. C'est lent, et
    // ça vaut pour tout le monde — l'escouade qui fouille, la halle qui
    // ramasse, et la ville qui s'installerait là un jour.
    cout: { ferraille: 60, polymere: 40, composant: 10 },
    coutMul: 1.65,
    heures: 12,
    tempsMul: 1.5,
    energie: -4,
    max: 5,
    recherche: 'insemination',
  },
  terraformeur: {
    nom: 'Station de terraformation',
    desc: 'Casser la roche, corriger le sol, concentrer ce qui dort dessous.',
    cout: { ferraille: 120, alliage: 45, composant: 25, isotope: 10 },
    coutMul: 1.7,
    heures: 22,
    tempsMul: 1.55,
    energie: -14,
    max: 5,
    recherche: 'terraformation',
  },
  comptoir: {
    nom: 'Comptoir',
    desc: 'On y passe des ordres à la bourse, et les convois viennent jusqu’ici.',
    // Le camp cesse d'être un dépôt qu'il faut vider à dos d'homme. Ça ne
    // s'obtient pas seulement en payant : il faut une place inscrite sur les
    // cartes, et un réseau qui accepte de traiter avec vous.
    cout: { ferraille: 70, polymere: 35, composant: 10 },
    coutMul: 1.7,
    heures: 12,
    tempsMul: 1.55,
    energie: -6,
    max: 5,
    recherche: 'cotation',
  },
  solaire: {
    nom: 'Capteurs solaires',
    desc: 'Du courant sans rien brûler, tant que le ciel le veut bien.',
    cout: { ferraille: 40, polymere: 30, composant: 6 },
    coutMul: 1.6,
    heures: 8,
    tempsMul: 1.5,
    // Le rendement ne tient pas dans une constante : il dépend du biome et du
    // ciel. Voir `rendementLibre` dans base.js. Ce chiffre est le nominal, celui
    // d'un désert par temps clair.
    energie: 8,
    libre: 'soleil',
    max: 10,
    recherche: 'renouvelable',
  },
  eolienne: {
    nom: 'Éoliennes',
    desc: 'Ce que le vent donne. Il donne le plus quand le soleil donne le moins.',
    cout: { ferraille: 55, alliage: 12, composant: 5 },
    coutMul: 1.6,
    heures: 9,
    tempsMul: 1.5,
    energie: 9,
    libre: 'vent',
    max: 10,
    recherche: 'renouvelable',
  },
  bassins: {
    nom: 'Bassins de culture',
    desc: 'Algues et lentilles d’eau. De la biomasse qui ne doit rien au terrain.',
    // Le bâtiment qui sauve les camps plantés au mauvais endroit.
    //
    // Deux biomes sur neuf donnent de la biomasse. Fonder ailleurs — une friche,
    // des dalles, un canyon — c'était planter un camp qui ne pourrait jamais se
    // nourrir : la halle ramasse ce que la région a, l'hydroponie transforme ce
    // que la halle ramasse, et si la région n'a rien la chaîne est morte à la
    // source. Le joueur n'avait aucun moyen de le savoir avant d'avoir payé.
    //
    // Les bassins ferment cette boucle sur eux-mêmes : de l'eau, de la lumière,
    // et ce qui pousse dedans. Moins généreux qu'un marais, mais partout.
    // Derrière une recherche, parce que ça ne doit pas être le premier réflexe :
    // on s'installe là où la terre donne, et on invente les bassins quand on ne
    // peut pas.
    cout: { ferraille: 50, polymere: 45 },
    coutMul: 1.6,
    heures: 7,
    tempsMul: 1.5,
    energie: -5,
    max: 8,
    recherche: 'cultures',
  },
  hydroponie: {
    nom: 'Hydroponie',
    desc: 'Transforme la biomasse en rations comestibles.',
    // Volontairement bon marché au premier niveau : c'est le bâtiment qui fait
    // passer une escouade de « acheter à manger » à « en produire », et le
    // laisser hors de portée revenait à laisser tout le jeu hors de portée.
    cout: { ferraille: 45, polymere: 25 },
    coutMul: 1.6,
    heures: 6,
    tempsMul: 1.5,
    energie: -4,
    max: 8,
  },
  fonderie: {
    nom: 'Fonderie',
    desc: 'Minerai → alliage.',
    cout: { ferraille: 90, minerai: 40 },
    coutMul: 1.65,
    heures: 8,
    tempsMul: 1.5,
    energie: -7,
    max: 8,
  },
  atelier: {
    nom: 'Atelier',
    desc: 'Alliage + polymère → composants.',
    cout: { ferraille: 80, alliage: 25, composant: 5 },
    coutMul: 1.7,
    heures: 10,
    tempsMul: 1.55,
    energie: -9,
    max: 8,
  },
  raffinerie: {
    nom: 'Raffinerie',
    desc: 'Polymère → carburant.',
    cout: { ferraille: 75, alliage: 20 },
    coutMul: 1.65,
    heures: 9,
    tempsMul: 1.5,
    energie: -6,
    max: 8,
  },
  cantine: {
    nom: 'Cantine',
    desc: 'On y mange assis, à heure fixe. La même ration nourrit mieux.',
    cout: { ferraille: 40, polymere: 30 },
    coutMul: 1.5,
    heures: 5,
    tempsMul: 1.4,
    energie: -2,
    max: 5,
  },
  halle: {
    nom: 'Halle de récolte',
    desc: 'Bacs, treuils, brouettes : l’avant-poste ramasse enfin sa propre région.',
    // Pas de composants ici, et c'est délibéré. La halle est ce qui nourrit
    // l'hydroponie ; la mettre derrière une pièce qu'on ne trouve nulle part
    // revenait à laisser le camp mourir de faim avec ses bacs pleins de terre.
    // Le banc l'a montré noir sur blanc : population 10 à mille cinq cents
    // heures, zéro à trois mille, biomasse à sec.
    cout: { ferraille: 65, polymere: 20 },
    coutMul: 1.6,
    heures: 7,
    tempsMul: 1.45,
    energie: -3,
    max: 6,
  },
  poste: {
    nom: 'Poste de garde',
    desc: 'Des yeux sur les pistes. On ne se bat pas mieux, on est prévenu à temps.',
    cout: { ferraille: 60, polymere: 15, composant: 3 },
    coutMul: 1.55,
    heures: 6,
    tempsMul: 1.4,
    energie: -2,
    max: 5,
  },
  salle: {
    nom: 'Salle d’exercice',
    desc: 'Un plancher qui rend les coups, des mannequins lestés, un maître de maison.',
    cout: { ferraille: 55, alliage: 6 },
    coutMul: 1.6,
    heures: 8,
    tempsMul: 1.4,
    energie: 0,
    max: 2,
  },
  distillerie: {
    nom: 'Distillerie',
    desc: 'Biomasse → carburant, à l’alambic. Rendement de misère — mais la terre paie enfin la route.',
    cout: { ferraille: 70, alliage: 10, composant: 2 },
    coutMul: 1.6,
    heures: 10,
    tempsMul: 1.4,
    energie: -1,
    max: 2,
  },
  serres: {
    nom: 'Serres',
    desc: 'Des bâches, des arceaux, des heures. Le mauvais ciel s’arrête dehors — le beau entre.',
    cout: { ferraille: 45, polymere: 25 },
    coutMul: 1.55,
    heures: 8,
    tempsMul: 1.4,
    energie: 0,
    max: 2,
  },
  forge: {
    nom: 'Forge',
    desc: 'L’alliage y devient lame ou plaque. Ce qu’on ne trouve plus aux étals, on le bat soi-même.',
    cout: { ferraille: 90, alliage: 15, composant: 4 },
    coutMul: 1.7,
    heures: 14,
    tempsMul: 1.5,
    energie: -3,
    max: 2,
  },
  attelage: {
    nom: 'Attelage',
    desc: 'Un hangar, un établi, du suif. On y monte des charrettes — et on y répare celles qui rentrent.',
    cout: { ferraille: 70, alliage: 8, composant: 2 },
    coutMul: 1.6,
    heures: 10,
    tempsMul: 1.4,
    energie: 0,
    max: 2,
  },
  infirmerie: {
    nom: 'Infirmerie',
    desc: 'Soigne l’escouade au repos, produit des medkits.',
    cout: { ferraille: 45, polymere: 35, composant: 6 },
    coutMul: 1.6,
    heures: 7,
    tempsMul: 1.5,
    energie: -3,
    max: 6,
  },
  antenne: {
    nom: 'Antenne',
    desc: 'Accélère la recherche et étend la portée du renseignement.',
    cout: { ferraille: 60, composant: 14 },
    coutMul: 1.7,
    heures: 9,
    tempsMul: 1.55,
    energie: -5,
    max: 6,
  },
  mur: {
    nom: 'Mur de rebut',
    desc: 'Défense de l’avant-poste contre les raids.',
    cout: { ferraille: 100, minerai: 30 },
    coutMul: 1.5,
    heures: 6,
    tempsMul: 1.4,
    energie: 0,
    max: 10,
  },
  baraquement: {
    nom: 'Baraquement',
    desc: 'Augmente la taille maximale de l’escouade et le moral.',
    cout: { ferraille: 65, polymere: 30 },
    coutMul: 1.7,
    heures: 8,
    tempsMul: 1.5,
    energie: -2,
    max: 5,
  },
};

export const BUILDING_KEYS = Object.keys(BUILDINGS);

// ---------------------------------------------------------------------------
// Recherches
// ---------------------------------------------------------------------------

export const RESEARCH = {
  metallurgie: {
    nom: 'Métallurgie',
    desc: '+12 % de rendement fonderie et d’extraction de minerai par niveau.',
    cout: { composant: 12, credits: 200 },
    coutMul: 1.8,
    heures: 10,
    tempsMul: 1.7,
    max: 5,
  },
  hydroponie_av: {
    nom: 'Hydroponie avancée',
    desc: '+15 % de production de rations par niveau.',
    cout: { composant: 10, credits: 180 },
    coutMul: 1.8,
    heures: 9,
    tempsMul: 1.7,
    max: 5,
  },
  cotation: {
    nom: 'Cotation',
    desc: 'Débloque le comptoir : lire les cours d’une bourse et traiter avec elle sans bouger.',
    // Elle a exigé la Cryptographie, et coûté trois fois ce prix-là. Compté
    // bout à bout, il fallait alors franchir huit conditions pour passer un
    // seul ordre — dont dix-huit habitants au camp. Un joueur l'a dit sans
    // détour : « tu as codé une bourse et je ne peux même pas la tester. »
    //
    // Chacune de ces conditions se défendait seule ; c'est leur somme qui était
    // absurde, et personne ne compte la somme en écrivant la huitième. **Une
    // porte se juge sur le chemin entier, pas sur elle-même.**
    cout: { composant: 12, ferraille: 60, credits: 250 },
    coutMul: 1.9,
    heures: 14,
    tempsMul: 1.75,
    max: 5,
  },
  refonte: {
    nom: 'Refonte',
    desc: 'La fonderie sait aussi tirer de l’alliage de la ferraille, deux fois moins bien.',
    // La ferraille est la ressource la plus abondante du monde et la seule qui
    // n'entre dans aucune chaîne : on en ramasse partout, on la vend trois
    // crédits, et l'entrepôt déborde. Elle devient une matière première.
    exige: 'metallurgie',
    cout: { composant: 10, credits: 200 },
    coutMul: 1.8,
    heures: 10,
    tempsMul: 1.7,
    max: 5,
  },
  reformage: {
    nom: 'Reformage',
    desc: 'La raffinerie sait recomposer du polymère à partir des déchets.',
    // Le trou que ça bouche : le polymère ne se ramasse que dans trois biomes
    // sur neuf, et l'atelier en demande pour chaque composant. Planté ailleurs,
    // on achetait son polymère en ville jusqu'à la fin de la partie — ou l'on
    // ne fabriquait jamais rien.
    exige: 'pyrolyse',
    cout: { composant: 28, isotope: 10, credits: 550 },
    coutMul: 1.9,
    heures: 18,
    tempsMul: 1.75,
    max: 5,
  },
  insemination: {
    nom: 'Insémination',
    desc: 'Débloque l’ensemenceuse : la terre autour du camp se met à donner de la biomasse.',
    // On maîtrise d'abord la culture sous cloche, ensuite seulement on jette
    // des organismes dehors et l'on regarde ce qu'ils font.
    exige: 'cultures',
    cout: { composant: 20, credits: 400 },
    coutMul: 1.85,
    heures: 16,
    tempsMul: 1.7,
    max: 5,
  },
  terraformation: {
    nom: 'Terraformation',
    desc: 'Débloque la station : on choisit ce que la terre doit rendre, et l’on attend.',
    exige: 'insemination',
    cout: { composant: 45, isotope: 20, alliage: 30, credits: 900 },
    coutMul: 2.0,
    heures: 26,
    tempsMul: 1.8,
    max: 5,
  },
  pyrolyse: {
    nom: 'Pyrolyse',
    desc: 'La raffinerie brûle les déchets des autres chaînes et en tire du carburant. +10 % par niveau.',
    // La raffinerie ne savait faire du carburant qu'à partir de polymère, qu'on
    // ne ramasse que dans trois biomes sur neuf : un camp planté ailleurs
    // achetait son carburant en ville jusqu'à la fin de la partie, ou son
    // générateur restait éteint.
    //
    // Elle brûle les déchets, pas la biomasse. Faire du carburant avec ce qui
    // aurait pu être des rations, c'est exactement ce qu'un camp affamé ne doit
    // pas avoir intérêt à faire. Les déchets, eux, ne servaient à rien et ne se
    // vendent nulle part : la pyrolyse récompense d'avoir monté une vraie
    // chaîne de transformation, pas d'avoir des bacs.
    cout: { composant: 12, credits: 220 },
    coutMul: 1.8,
    heures: 10,
    tempsMul: 1.7,
    max: 5,
  },
  renouvelable: {
    nom: 'Captation libre',
    desc: 'Débloque capteurs solaires et éoliennes, puis +12 % de leur rendement par niveau.',
    // Le générateur brûlait, et c'était la seule façon d'avoir du courant : un
    // avant-poste sans accès au carburant tournait à quarante pour cent pour
    // toujours. Ce qu'on capte ne se transporte pas et ne s'achète pas — ça
    // dépend d'où l'on s'est installé, et du temps qu'il fait.
    cout: { composant: 16, alliage: 10, credits: 300 },
    coutMul: 1.85,
    heures: 13,
    tempsMul: 1.7,
    max: 5,
  },
  cultures: {
    nom: 'Cultures closes',
    desc: 'Débloque les bassins de culture, puis +18 % de biomasse par niveau.',
    // Bon marché et rapide au premier niveau : c'est une recherche de survie,
    // pas de confort. Un camp qui découvre que son biome ne nourrit personne
    // doit pouvoir se rattraper dans la semaine, pas dans le mois.
    cout: { composant: 8, credits: 150 },
    coutMul: 1.8,
    heures: 8,
    tempsMul: 1.7,
    max: 5,
  },
  ingenierie: {
    nom: 'Ingénierie structurelle',
    desc: '−10 % de temps de construction par niveau.',
    cout: { composant: 16, credits: 260 },
    coutMul: 1.9,
    heures: 12,
    tempsMul: 1.75,
    max: 5,
  },
  balistique: {
    nom: 'Balistique',
    desc: '+10 % de dégâts à distance par niveau.',
    cout: { composant: 18, credits: 300 },
    coutMul: 1.9,
    heures: 12,
    tempsMul: 1.7,
    max: 5,
  },
  blindage: {
    nom: 'Blindage composite',
    desc: '+10 % d’armure de l’escouade par niveau.',
    cout: { composant: 18, alliage: 20, credits: 260 },
    coutMul: 1.9,
    heures: 12,
    tempsMul: 1.7,
    max: 5,
  },
  medecine: {
    nom: 'Médecine de campagne',
    desc: '+25 % de vitesse de guérison par niveau.',
    cout: { composant: 14, credits: 240 },
    coutMul: 1.85,
    heures: 11,
    tempsMul: 1.7,
    max: 4,
  },
  logistique: {
    nom: 'Logistique',
    desc: '+15 % de portage et −6 % de coût de déplacement par niveau.',
    cout: { composant: 12, credits: 220 },
    coutMul: 1.85,
    heures: 10,
    tempsMul: 1.7,
    max: 5,
  },
  cybernetique: {
    nom: 'Cybernétique',
    desc: 'Débloque les greffes et réduit les séquelles de membre.',
    cout: { composant: 30, isotope: 15, credits: 500 },
    coutMul: 2.0,
    heures: 20,
    tempsMul: 1.8,
    max: 3,
  },
  optique: {
    nom: 'Optique longue portée',
    desc: '+1 rayon de découverte de la carte par niveau.',
    cout: { composant: 10, credits: 160 },
    coutMul: 1.9,
    heures: 8,
    tempsMul: 1.7,
    max: 3,
  },
  cryptographie: {
    nom: 'Cryptographie',
    desc: 'Révèle les intentions militaires des factions.',
    cout: { composant: 22, isotope: 8, credits: 380 },
    coutMul: 2.0,
    heures: 16,
    tempsMul: 1.8,
    max: 2,
  },
};

export const RESEARCH_KEYS = Object.keys(RESEARCH);

// ---------------------------------------------------------------------------
// Recettes : ce qu'on demande à chaque chaîne
// ---------------------------------------------------------------------------
//
// Une chaîne consommait dès qu'elle avait de quoi, sans qu'on puisse dire non :
// la raffinerie brûlait le polymère qu'on gardait pour l'atelier, l'infirmerie
// mangeait la biomasse qui devait devenir des rations. On ne dirigeait pas un
// avant-poste, on le regardait tourner.
//
// Chaque bâtiment de production a donc une consigne. La plupart n'ont que
// « marche » — mais tous ont « arrêt », et c'est déjà la moitié de ce qui
// manquait. Deux en ont plusieurs, et c'est là que ça devient un choix :
//
//   la raffinerie   du carburant, ou du polymère là où il n'en pousse pas
//   la fonderie     du minerai quand il y en a, de la ferraille sinon
//
// `recherche` : la consigne n'apparaît qu'une fois la recherche faite.
// `defaut`    : ce qu'on fait tant que personne n'a rien dit.

export const ARRET = 'arret';

export const RECETTES = {
  generateur: [{ id: 'marche', nom: 'Brûler du carburant', aide: 'Du courant tant qu’il y a de quoi brûler. Un camp qui capte assez peut l’éteindre.' }],
  comptoir: [{ id: 'marche', nom: 'Tenir le comptoir ouvert', aide: 'On passe des ordres, les convois viennent.' }],
  halle: [{ id: 'marche', nom: 'Ramasser la région', aide: 'Ce que le terrain donne, sans épuiser la case.' }],
  bassins: [{ id: 'marche', nom: 'Cultiver de la biomasse', aide: 'Algues et lentilles d’eau, où qu’on soit.' }],
  hydroponie: [{ id: 'marche', nom: 'Biomasse → rations', aide: 'De quoi manger.' }],
  infirmerie: [{ id: 'marche', nom: 'Biomasse → medkits', aide: 'Et l’on soigne les vôtres au repos.' }],
  atelier: [{ id: 'marche', nom: 'Alliage + polymère → composants', aide: 'Ce qu’on ne trouve presque nulle part.' }],
  fonderie: [
    { id: 'minerai', nom: 'Minerai → alliage', aide: 'Le bon rendement, quand la région donne du minerai.' },
    {
      id: 'ferraille',
      nom: 'Ferraille → alliage',
      aide: 'Deux fois moins bon, mais la ferraille traîne dans presque tous les biomes '
        + 'et personne n’en veut au marché.',
      recherche: 'refonte',
    },
  ],
  distillerie: [{
    id: 'marche',
    nom: 'Biomasse → carburant',
    aide: 'Au cinquième — la terre paie la route. La réserve de biomasse est respectée.',
  }],
  raffinerie: [
    { id: 'carburant', nom: 'Polymère → carburant', aide: 'Ce que brûle le générateur.' },
    {
      id: 'pyrolyse',
      nom: 'Déchets → carburant',
      aide: 'Le tas derrière l’atelier, plutôt qu’une matière qui sert ailleurs.',
      recherche: 'pyrolyse',
    },
    {
      id: 'reformage',
      nom: 'Déchets → polymère',
      aide: 'Moins rentable que du carburant, et c’est parfois la seule façon d’en avoir : '
        + 'le polymère ne se ramasse que dans trois biomes sur neuf, et sans lui l’atelier '
        + 'ne fait pas un composant.',
      recherche: 'reformage',
    },
  ],
  semoir: [{ id: 'marche', nom: 'Semer la région', aide: 'Consomme de la biomasse comme semence.' }],
  terraformeur: [{ id: 'marche', nom: 'Corriger le sol', aide: 'Voir la cible dans « La terre ».' }],
};

/**
 * Ce que chaque chaîne prend dans l'entrepôt.
 *
 * Sert à ne proposer un plancher de réserve que pour les matières qu'on
 * consomme vraiment : la liste des dix marchandises serait un mur de boutons
 * dont huit ne servent à rien. On liste toutes les entrées possibles d'un
 * bâtiment, consigne comprise — la fonderie peut manger l'un ou l'autre.
 */
export const ENTREES = {
  hydroponie: ['biomasse'],
  infirmerie: ['biomasse'],
  fonderie: ['minerai', 'ferraille'],
  atelier: ['alliage', 'polymere'],
  raffinerie: ['polymere'],
  semoir: ['biomasse'],
  terraformeur: ['carburant', 'composant'],
};

export const RECETTES_KEYS = Object.keys(RECETTES);

// ---------------------------------------------------------------------------
// Équipement
// ---------------------------------------------------------------------------

export const ITEMS = {
  // Armes de mêlée
  barre: { nom: 'Barre de fer', type: 'arme', portee: 'melee', degats: 7, pen: 0.05, poids: 3, prix: 30, comp: 'melee' },
  machette: { nom: 'Machette', type: 'arme', portee: 'melee', degats: 10, pen: 0.12, poids: 2, prix: 90, comp: 'melee' },
  katana: { nom: 'Katana rouillé', type: 'arme', portee: 'melee', degats: 14, pen: 0.22, poids: 3, prix: 260, comp: 'melee' },
  masse: { nom: 'Masse hydraulique', type: 'arme', portee: 'melee', degats: 20, pen: 0.35, poids: 9, prix: 520, comp: 'melee', reqForce: 45 },
  // Armes à distance
  clous: { nom: 'Pistolet à clous', type: 'arme', portee: 'tir', degats: 9, pen: 0.1, poids: 2, prix: 120, comp: 'tir' },
  verrou: { nom: 'Fusil à verrou', type: 'arme', portee: 'tir', degats: 16, pen: 0.25, poids: 5, prix: 340, comp: 'tir' },
  smg: { nom: 'SMG recyclée', type: 'arme', portee: 'tir', degats: 12, pen: 0.15, poids: 4, prix: 400, comp: 'tir', rafale: 2 },
  rail: { nom: 'Fusil à rail', type: 'arme', portee: 'tir', degats: 26, pen: 0.5, poids: 8, prix: 1100, comp: 'tir', reqForce: 40 },
  // Armures
  cuir: { nom: 'Veste de cuir', type: 'armure', armure: 4, poids: 4, prix: 70 },
  plaque: { nom: 'Plaques de ferraille', type: 'armure', armure: 9, poids: 11, prix: 210 },
  kevlar: { nom: 'Combinaison kevlar', type: 'armure', armure: 14, poids: 8, prix: 560 },
  exo: { nom: 'Exo léger', type: 'armure', armure: 20, poids: 14, prix: 1400, bonus: { force: 8 } },
  // Greffes (nécessitent Cybernétique)
  bras_hydro: { nom: 'Bras hydraulique', type: 'greffe', membre: 'brasD', poids: 0, prix: 700, bonus: { force: 14 } },
  oeil_optique: { nom: 'Œil optique', type: 'greffe', membre: 'tete', poids: 0, prix: 650, bonus: { tir: 14 } },
  jambe_servo: { nom: 'Jambe servo', type: 'greffe', membre: 'jambeD', poids: 0, prix: 600, bonus: { endurance: 12 } },
  coeur_synth: { nom: 'Cœur synthétique', type: 'greffe', membre: 'torse', poids: 0, prix: 900, bonus: { endurance: 18 } },
};


// ---------------------------------------------------------------------------
// Compétences
// ---------------------------------------------------------------------------

export const SKILLS = {
  force: 'Force',
  endurance: 'Endurance',
  melee: 'Mêlée',
  tir: 'Tir',
  furtivite: 'Furtivité',
  ingenierie: 'Ingénierie',
  medecine: 'Médecine',
  commerce: 'Commerce',
};

export const SKILL_KEYS = Object.keys(SKILLS);

export const BODY_PARTS = {
  tete: { nom: 'Tête', pv: 30, poids: 0.1, vital: true },
  torse: { nom: 'Torse', pv: 70, poids: 0.38, vital: true },
  brasG: { nom: 'Bras G.', pv: 40, poids: 0.13, vital: false },
  brasD: { nom: 'Bras D.', pv: 40, poids: 0.13, vital: false },
  jambeG: { nom: 'Jambe G.', pv: 45, poids: 0.13, vital: false },
  jambeD: { nom: 'Jambe D.', pv: 45, poids: 0.13, vital: false },
};

export const BODY_KEYS = Object.keys(BODY_PARTS);

// ---------------------------------------------------------------------------
// Tables de noms
// ---------------------------------------------------------------------------

export const NOMS_PERSO = [
  'Vask', 'Oria', 'Renn', 'Sable', 'Corvid', 'Nyx', 'Tal', 'Marek', 'Iven', 'Suri',
  'Dako', 'Ferro', 'Lys', 'Orme', 'Kesh', 'Bram', 'Ivo', 'Nessa', 'Roka', 'Théo',
  'Ash', 'Vera', 'Solen', 'Hux', 'Marn', 'Pike', 'Zel', 'Cass', 'Doren', 'Wren',
];

export const SURNOMS = [
  'la Rouille', 'sans-fil', 'le Muet', 'du Relais', 'deux-doigts', 'la Cendre',
  'le Bref', 'trois-clous', 'de Nulle-Part', 'la Statique', 'le Patient',
  'demi-tour', 'le Boiteux', 'la Sourde', 'gueule-de-fer', 'le Compteur',
];

export const VILLE_A = [
  'Fort', 'Poste', 'Halte', 'Nœud', 'Dépôt', 'Cité', 'Enclos', 'Puits', 'Relais', 'Camp',
];

export const VILLE_B = [
  'Kalvar', 'Ossane', 'Tréfonds', 'Vermeil', 'Zéro', 'Dix-Sept', 'Ostrande', 'Cinabre',
  'Vesper', 'Krœn', 'Malemer', 'Sablon', 'Ferrant', 'Tourbe', 'Nadir', 'Ambre',
  'Quatre-Vents', 'Silice', 'Mordant', 'Hélios',
];

// ---------------------------------------------------------------------------
// Postures d'escouade
// ---------------------------------------------------------------------------

export const POSTURES = {
  prudent: {
    nom: 'Prudent',
    desc: 'Évite les combats quand c’est possible, fuit tôt.',
    evitement: 0.5,
    fuite: 0.55,
    degats: 0.9,
    rendement: 0.9,
  },
  neutre: {
    nom: 'Neutre',
    desc: 'Se bat si nécessaire, décroche si ça tourne mal.',
    evitement: 0.2,
    fuite: 0.3,
    degats: 1.0,
    rendement: 1.0,
  },
  agressif: {
    nom: 'Agressif',
    desc: 'Cherche l’affrontement, se replie tard.',
    evitement: 0.0,
    fuite: 0.12,
    degats: 1.15,
    rendement: 1.05,
  },
};

export const POSTURE_KEYS = Object.keys(POSTURES);

// ---------------------------------------------------------------------------
// Équipement supplémentaire (étals des villes)
// ---------------------------------------------------------------------------

Object.assign(ITEMS, {
  hachoir: { nom: 'Hachoir d’abattoir', type: 'arme', portee: 'melee', degats: 12, pen: 0.14, poids: 4, prix: 170, comp: 'melee' },
  arbalete: { nom: 'Arbalète à poulies', type: 'arme', portee: 'tir', degats: 13, pen: 0.3, poids: 3, prix: 290, comp: 'tir', discrete: true },
  pompe: { nom: 'Fusil à pompe', type: 'arme', portee: 'tir', degats: 19, pen: 0.16, poids: 5, prix: 470, comp: 'tir' },
  lance_harpon: { nom: 'Lance-harpon', type: 'arme', portee: 'tir', degats: 22, pen: 0.4, poids: 7, prix: 760, comp: 'tir', reqForce: 35 },
  manteau: { nom: 'Manteau lesté', type: 'armure', armure: 7, poids: 6, prix: 140, bonus: { furtivite: 6 } },
  harnais: { nom: 'Harnais de portage', type: 'armure', armure: 3, poids: 3, prix: 190, bonus: { force: 4 } },
});

/** Palier d'équipement : sert à garnir les étals et à armer les bandes. */
export const PALIERS_ITEM = {
  barre: 0, clous: 0, cuir: 0, manteau: 0,
  machette: 1, hachoir: 1, plaque: 1, harnais: 1,
  arbalete: 2, verrou: 2, katana: 2, pompe: 2, kevlar: 2,
  smg: 2, masse: 3, rail: 3, exo: 3, lance_harpon: 3,
  bras_hydro: 3, oeil_optique: 3, jambe_servo: 3, coeur_synth: 3,
};

/** Ce que chaque faction accepte de vendre. L'Essaim ne tient pas boutique. */
export const ETAL_PAR_STYLE = {
  corpo: ['clous', 'verrou', 'smg', 'kevlar', 'exo', 'oeil_optique', 'coeur_synth', 'rail'],
  nomade: ['barre', 'machette', 'hachoir', 'plaque', 'harnais', 'masse', 'bras_hydro'],
  fanatique: ['machette', 'katana', 'arbalete', 'manteau', 'plaque', 'jambe_servo'],
  criminel: ['clous', 'arbalete', 'smg', 'manteau', 'cuir', 'katana', 'pompe'],
  militaire: ['verrou', 'pompe', 'smg', 'plaque', 'kevlar', 'masse', 'lance_harpon'],
  commune: ['barre', 'machette', 'clous', 'cuir', 'harnais', 'arbalete'],
};

// ---------------------------------------------------------------------------
// Traits de personnage
// ---------------------------------------------------------------------------
// bonus : ajouté à la compétence · mult : multiplicateurs de besoins et d'effets

export const TRAITS = {
  costaud: { nom: 'Costaud', desc: '+10 force, porte davantage.', bonus: { force: 10 }, mult: { portage: 1.15 } },
  vif: { nom: 'Vif', desc: '+9 endurance, marche plus vite.', bonus: { endurance: 9 }, mult: { vitesse: 1.12 } },
  oeil: { nom: 'Œil de lynx', desc: '+12 tir.', bonus: { tir: 12 } },
  teigneux: { nom: 'Teigneux', desc: '+12 mêlée, mais s’use plus vite.', bonus: { melee: 12 }, mult: { fatigue: 1.2 } },
  ombre: { nom: 'Ombre', desc: '+14 furtivité, évite mieux les ennuis.', bonus: { furtivite: 14 }, mult: { evitement: 1.25 } },
  bricoleur: { nom: 'Bricoleur', desc: '+14 ingénierie.', bonus: { ingenierie: 14 } },
  rebouteux: { nom: 'Rebouteux', desc: '+14 médecine.', bonus: { medecine: 14 } },
  beau_parleur: { nom: 'Beau parleur', desc: '+14 commerce.', bonus: { commerce: 14 } },
  coriace: { nom: 'Coriace', desc: 'Encaisse 15 % de dégâts en moins.', mult: { degatsSubis: 0.85 } },
  sobre: { nom: 'Sobre', desc: 'Mange 30 % de moins.', mult: { faim: 0.7 } },
  gouffre: { nom: 'Gouffre', desc: 'Mange 45 % de plus.', mult: { faim: 1.45 }, malus: true },
  hemophile: { nom: 'Hémophile', desc: 'Saigne bien plus.', mult: { saignement: 1.6 }, malus: true },
  insomniaque: { nom: 'Insomniaque', desc: 'Récupère mal.', mult: { fatigue: 1.3 }, malus: true },
  froussard: { nom: 'Froussard', desc: 'Moral fragile, mais fuit à temps.', mult: { evitement: 1.2, moral: 0.8 }, malus: true },
  mule: { nom: 'Mule', desc: 'Porte 30 % de plus, mais lent.', mult: { portage: 1.3, vitesse: 0.9 } },
  survivant: { nom: 'Survivant', desc: 'Guérit plus vite, encaisse mieux la faim.', mult: { soin: 1.35, faim: 0.9 } },
};

export const TRAIT_KEYS = Object.keys(TRAITS);

// ---------------------------------------------------------------------------
// Points d'intérêt, trouvés en explorant
// ---------------------------------------------------------------------------
// loot : [min, max] par ressource · unique : disparaît une fois fouillé

export const POI = {
  ruine: {
    nom: 'Ruine ensevelie',
    texte: 'Un immeuble couché sur le flanc, à moitié avalé par le sol.',
    loot: { ferraille: [20, 70], polymere: [5, 30], composant: [0, 4] },
    credits: [0, 120],
    danger: 0.2,
  },
  convoi: {
    nom: 'Convoi éventré',
    texte: 'Six remorques en file, portes arrachées. Quelqu’un est passé avant vous — pas tout emporté.',
    loot: { rations: [10, 40], carburant: [5, 25], medkit: [0, 3] },
    credits: [40, 260],
    objet: 1,
    danger: 0.3,
  },
  bunker: {
    nom: 'Bunker scellé',
    texte: 'Une trappe blindée, une serrure qui a tenu quarante ans. Elle ne tiendra pas la journée.',
    loot: { composant: [4, 20], isotope: [2, 12], alliage: [5, 25] },
    credits: [100, 500],
    objet: 2,
    danger: 0.45,
    reqIngenierie: 25,
  },
  station: {
    nom: 'Station météo',
    texte: 'Les antennes tournent encore. Quelque chose les alimente.',
    loot: { composant: [3, 12], isotope: [0, 6] },
    credits: [20, 180],
    revele: 3,
    danger: 0.25,
  },
  cache: {
    nom: 'Cache de contrebande',
    texte: 'Trois bidons enterrés sous une dalle, marqués d’un signe qui ne vous dit rien.',
    loot: { medkit: [1, 5], carburant: [10, 30], rations: [5, 25] },
    credits: [60, 340],
    objet: 1,
    danger: 0.35,
  },
  ville_morte: {
    nom: 'Ville morte',
    texte: 'Les enseignes tiennent encore. Les gens, non. C’était habité il y a peu.',
    loot: { ferraille: [30, 90], polymere: [10, 40], composant: [2, 10], rations: [0, 15] },
    credits: [80, 400],
    objet: 2,
    danger: 0.35,
  },
  charnier: {
    nom: 'Charnier',
    texte: 'Une trentaine de corps alignés avec soin. C’est ce soin qui inquiète.',
    loot: { ferraille: [5, 20], medkit: [0, 2] },
    credits: [30, 200],
    objet: 1,
    danger: 0.6,
  },
};

export const POI_KEYS = Object.keys(POI);

// ---------------------------------------------------------------------------
// Contrats proposés par les villes
// ---------------------------------------------------------------------------

export const CONTRATS = {
  collecte: {
    nom: 'Collecte',
    desc: 'Rapporter une quantité de marchandise à la ville.',
  },
  livraison: {
    nom: 'Livraison',
    desc: 'Transporter un colis jusqu’à une autre ville.',
  },
  prime: {
    nom: 'Prime',
    desc: 'Remporter des combats contre une faction désignée.',
  },
  reconnaissance: {
    nom: 'Reconnaissance',
    desc: 'Aller voir un secteur et en revenir.',
  },
};

export const CONTRAT_KEYS = Object.keys(CONTRATS);

/** Déclaré ici, après les ajouts d'étal, pour couvrir tout le catalogue. */
export const ITEM_KEYS = Object.keys(ITEMS);

// ---------------------------------------------------------------------------
// Diplômes
// ---------------------------------------------------------------------------
// Un métier ne s'improvise pas entièrement sur le tas. Une école — quand il en
// reste — fait gagner des années : elle pose un plancher de compétence et,
// surtout, elle apprend à apprendre. Un diplômé de médecine ne part pas de zéro
// et progresse ensuite plus vite que l'autodidacte qui recoud au jugé.
//
// `plancher`      : compétence garantie à la sortie (jamais rabaissée)
// `apprentissage` : multiplicateur d'expérience dans cette compétence, à vie
// `styles`        : quelles factions l'enseignent (styles de leurs villes)
// `tailleMin`     : une bourgade n'a pas d'école

export const DIPLOMES = {
  medecine: {
    nom: 'Brevet de médecine de campagne',
    court: 'Médecine',
    skill: 'medecine',
    plancher: 26,
    apprentissage: 1.6,
    cout: 950,
    heures: 220,
    styles: ['commune', 'corpo'],
    tailleMin: 2,
    texte: 'On y apprend surtout ce qu’il ne faut pas faire, et c’est déjà beaucoup.',
  },
  ingenierie: {
    nom: 'Diplôme de mécanique appliquée',
    court: 'Ingénierie',
    skill: 'ingenierie',
    plancher: 26,
    apprentissage: 1.6,
    cout: 900,
    heures: 200,
    styles: ['corpo', 'criminel'],
    tailleMin: 2,
    texte: 'Trois semaines à démonter ce que d’autres ont mal remonté.',
  },
  commerce: {
    nom: 'Licence de négoce',
    court: 'Commerce',
    skill: 'commerce',
    plancher: 26,
    apprentissage: 1.7,
    cout: 1100,
    heures: 180,
    styles: ['corpo', 'criminel'],
    tailleMin: 3,
    texte: 'On n’y apprend pas à compter, on y apprend à qui parler.',
  },
  furtivite: {
    nom: 'Passe des ombres',
    court: 'Furtivité',
    skill: 'furtivite',
    plancher: 24,
    apprentissage: 1.55,
    cout: 800,
    heures: 190,
    styles: ['criminel'],
    tailleMin: 2,
    texte: 'Ça ne s’appelle pas une école et ça ne délivre rien d’écrit.',
  },
  tir: {
    nom: 'École de tir',
    court: 'Tir',
    skill: 'tir',
    plancher: 24,
    apprentissage: 1.5,
    cout: 850,
    heures: 170,
    styles: ['militaire', 'corpo'],
    tailleMin: 2,
    texte: 'Deux cents cartouches et le bruit qui reste dans la tête.',
  },
  melee: {
    nom: 'École de la lame',
    court: 'Mêlée',
    skill: 'melee',
    plancher: 24,
    apprentissage: 1.5,
    cout: 780,
    heures: 170,
    styles: ['militaire', 'fanatique'],
    tailleMin: 2,
    texte: 'On y entre avec ses habitudes, on en sort avec des réflexes.',
  },
  force: {
    nom: 'Certificat de portage lourd',
    court: 'Force',
    skill: 'force',
    plancher: 22,
    apprentissage: 1.4,
    cout: 520,
    heures: 140,
    styles: ['nomade', 'militaire'],
    tailleMin: 1,
    texte: 'Soulever mal pendant vingt ans coûte plus cher que d’apprendre.',
  },
  endurance: {
    nom: 'Brevet de marche',
    court: 'Endurance',
    skill: 'endurance',
    plancher: 22,
    apprentissage: 1.4,
    cout: 480,
    heures: 150,
    styles: ['nomade', 'commune'],
    tailleMin: 1,
    texte: 'Marcher, on croit savoir. Marcher trente jours, non.',
  },
};

export const DIPLOME_KEYS = Object.keys(DIPLOMES);

/** Le diplôme qu'un professionnel expérimenté a de bonnes chances de porter. */
export const DIPLOME_ARCHETYPE = {
  medic: 'medecine',
  ferrailleur: 'ingenierie',
  courtier: 'commerce',
  eclaireur: 'furtivite',
  chasseur: 'tir',
  brute: 'melee',
};

// ---------------------------------------------------------------------------
// Métiers de l'avant-poste
// ---------------------------------------------------------------------------
// Les habitants n'étaient qu'un nombre : un multiplicateur anonyme posé sur
// toutes les chaînes à la fois. On leur donne un poste. Chaque bâtiment ouvre
// des places, chaque place tenue rend davantage que la main-d'œuvre générique —
// mais seulement là où elle est affectée. Un avant-poste devient donc un choix
// de spécialisation, pas une addition de bras.
//
// `batiment`  : ce qui ouvre les places       · `parNiveau` : places par niveau
// `apport`    : ce qu'un ouvrier ajoute       · `skill` : ce qu'un contremaître
//               (fraction, cumulatif)                    apporte s'il est sur place

export const METIERS = {
  cultivateur: {
    nom: 'Cultivateur', batiment: 'hydroponie', parNiveau: 3, apport: 0.14,
    skill: 'ingenierie', effet: 'Rations produites par l’hydroponie',
    texte: 'Repiquer, tailler, écarter ce qui pourrit avant que ça contamine le bac.',
  },
  courtier: {
    nom: 'Courtier', batiment: 'comptoir', parNiveau: 2, apport: 0.16,
    skill: 'commerce', effet: 'Commission retenue sur vos ordres',
    texte: 'Il connaît le cours d’hier, celui d’aujourd’hui, et ce que ça veut dire.',
  },
  semeur: {
    nom: 'Semeur', batiment: 'semoir', parNiveau: 2, apport: 0.15,
    skill: 'medecine', effet: 'Vitesse à laquelle la terre reprend',
    texte: 'Il faut savoir ce qui prend et ce qui pourrit. C’est de la biologie, pas du jardinage.',
  },
  terraformier: {
    nom: 'Terraformier', batiment: 'terraformeur', parNiveau: 2, apport: 0.15,
    skill: 'ingenierie', effet: 'Vitesse d’amendement de la région',
    texte: 'On travaille pour des gens qu’on ne connaîtra pas.',
  },
  bassinier: {
    nom: 'Bassinier', batiment: 'bassins', parNiveau: 3, apport: 0.14,
    skill: 'ingenierie', effet: 'Biomasse tirée des bassins',
    texte: 'Écumer, brasser, retirer ce qui vire. Une eau qu’on laisse tranquille meurt.',
  },
  fondeur: {
    nom: 'Fondeur', batiment: 'fonderie', parNiveau: 3, apport: 0.14,
    skill: 'force', effet: 'Alliage tiré du minerai',
    texte: 'Devant le four, on ne parle pas beaucoup.',
  },
  machiniste: {
    nom: 'Machiniste', batiment: 'atelier', parNiveau: 2, apport: 0.16,
    skill: 'ingenierie', effet: 'Composants assemblés',
    texte: 'Les composants ne se ramassent plus nulle part. Il faut les faire.',
  },
  raffineur: {
    nom: 'Raffineur', batiment: 'raffinerie', parNiveau: 2, apport: 0.15,
    skill: 'ingenierie', effet: 'Carburant tiré du polymère',
    texte: 'Un métier qui sent mauvais et qui fait tourner le reste.',
  },
  mecanicien: {
    nom: 'Mécanicien', batiment: 'generateur', parNiveau: 2, apport: 0.08,
    skill: 'ingenierie', effet: 'Carburant économisé par les générateurs',
    texte: 'Un générateur bien réglé brûle moins. Personne ne le remarque, sauf le stock.',
  },
  magasinier: {
    nom: 'Magasinier', batiment: 'entrepot', parNiveau: 2, apport: 0.12,
    skill: 'commerce', effet: 'Capacité de l’entrepôt',
    texte: 'Ranger, c’est gagner de la place. Beaucoup de place.',
  },
  infirmier: {
    nom: 'Infirmier', batiment: 'infirmerie', parNiveau: 2, apport: 0.2,
    skill: 'medecine', effet: 'Medkits produits, et soins de ceux qui rentrent',
    texte: 'On y entre en morceaux, on en sort en marchant. Parfois.',
  },
  operateur: {
    nom: 'Opérateur', batiment: 'antenne', parNiveau: 2, apport: 0.13,
    skill: 'ingenierie', effet: 'Vitesse de recherche',
    texte: 'Écouter la statique huit heures par jour et noter ce qui se répète.',
  },
  milicien: {
    nom: 'Milicien', batiment: 'mur', parNiveau: 3, apport: 0.1,
    skill: 'melee', effet: 'Défense de l’avant-poste',
    texte: 'Ils ne sont pas soldats. Ils sont sur le mur, ce qui suffit souvent.',
  },
  batisseur: {
    nom: 'Bâtisseur', batiment: 'baraquement', parNiveau: 4, apport: 0.12,
    skill: 'ingenierie', effet: 'Vitesse des chantiers',
    texte: 'Ce sont eux qui montent le reste, et on les oublie toujours.',
  },
  cuisinier: {
    nom: 'Cuisinier', batiment: 'cantine', parNiveau: 2, apport: 0.18,
    skill: 'commerce', effet: 'Rations économisées, et le moral avec',
    texte: 'Nourrir trente personnes avec ce qu’il y a n’est pas cuisiner. C’est compter.',
  },
  recoltant: {
    nom: 'Récoltant', batiment: 'halle', parNiveau: 3, apport: 0.16,
    skill: 'force', effet: 'Ce que la halle ramasse dans la région',
    texte: 'Sortir, ramasser, rentrer. Trois cents fois. C’est comme ça que le stock monte.',
  },
  garde: {
    nom: 'Garde', batiment: 'poste', parNiveau: 2, apport: 0.15,
    skill: 'tir', effet: 'Raids repérés à temps, et moins de pillage quand ça tourne mal',
    texte: 'Le travail consiste à voir venir. Le reste est l’affaire des autres.',
  },
};

export const METIER_KEYS = Object.keys(METIERS);

// ---------------------------------------------------------------------------
// Métiers des villes
// ---------------------------------------------------------------------------
// Une ville n'est pas une population indifférenciée qui produit un peu de tout
// en proportion de sa taille. C'est des paysans, des mineurs, des artisans, et
// leur répartition explique ce qu'elle produit, ce qu'elle vend et ce qu'elle
// devient. Un bourg des marais nourrit la région ; une ville des canyons crève
// de faim mais tient l'alliage.
//
// On raisonne en effectifs, pas en individus : cinq mille cinq cents personnes
// nommées pèseraient quatre mégaoctets de sauvegarde et six cents fois le budget
// du tick. Les gens que le joueur peut toucher, eux, ont un nom et un état
// propre — voir `notables` dans world.js.

export const METIERS_VILLE = {
  paysan: {
    nom: 'Paysans', produit: 'vivres', skill: 'ingenierie',
    desc: 'Bacs, serres, ce qui pousse dans la cendre.',
  },
  mineur: {
    nom: 'Mineurs', produit: 'minerai', skill: 'force',
    desc: 'Ce qu’on tire du sol et qu’on ne remplace pas.',
  },
  ferrailleur: {
    nom: 'Ferrailleurs', produit: 'récupération', skill: 'ingenierie',
    desc: 'Démonter l’ancien monde, morceau par morceau.',
  },
  artisan: {
    nom: 'Artisans', produit: 'alliage et composants', skill: 'ingenierie',
    desc: 'Ceux qui font ce qui ne se ramasse plus.',
  },
  medecin: {
    nom: 'Médecins', produit: 'medkits', skill: 'medecine',
    desc: 'Rares, courtisés, et jamais assez nombreux.',
  },
  milicien: {
    nom: 'Miliciens', produit: 'défense', skill: 'melee',
    desc: 'Payés à attendre que quelque chose arrive.',
  },
  marchand: {
    nom: 'Marchands', produit: 'commerce', skill: 'commerce',
    desc: 'Ils fixent les prix et savent qui a quoi.',
  },
  cantinier: {
    nom: 'Cantiniers', produit: 'repas', skill: 'commerce',
    desc: 'Nourrir cinq cents personnes n’est pas cuisiner, c’est compter.',
  },
  ouvrier: {
    nom: 'Ouvriers', produit: 'murs et bâti', skill: 'force',
    desc: 'Ils montent les murs, ils les réparent, ils recommencent.',
  },
};

export const METIER_VILLE_KEYS = Object.keys(METIERS_VILLE);

/**
 * Part de la population qui travaille. Le reste — enfants, vieux, infirmes —
 * mange sans produire, ce qui est précisément ce qui rend une ville fragile.
 */
export const PART_ACTIVE = 0.55;

/**
 * Ce que chaque métier reçoit d'office, avant vocation. Les métiers qui
 * produisent une marchandise partent tous du même socle ; ceux qui rendent un
 * service — nourrir, bâtir — partent plus bas, parce qu'ils se prennent sur les
 * autres.
 *
 * Ce n'est pas de l'esthétique. En ajoutant les cantiniers et les ouvriers à un
 * socle uniforme, on a discrètement prélevé un dixième de la main-d'œuvre de
 * chaque ville de la carte : minerai −8 %, rations −4 %, alliage −6 %. Un
 * métier nouveau ne doit pas taxer tous les autres du seul fait d'exister.
 */
export const POIDS_BASE = {
  paysan: 0.35, mineur: 0.35, ferrailleur: 0.35, artisan: 0.35,
  medecin: 0.35, milicien: 0.35, marchand: 0.35,
  cantinier: 0.11, ouvrier: 0.13,
};

/** Vocation d'un biome : ce vers quoi la main-d'œuvre d'une ville se porte. */
export const VOCATION_BIOME = {
  marais: { paysan: 4, ferrailleur: 1, mineur: 0.4 },
  steppe: { paysan: 3, ferrailleur: 1.6, mineur: 0.8 },
  dalles: { ferrailleur: 4, artisan: 1.6, paysan: 0.9 },
  canyons: { mineur: 4.5, artisan: 1.2, paysan: 0.5 },
  desert: { mineur: 3, paysan: 0.9, ferrailleur: 1 },
  friche: { ferrailleur: 2.4, mineur: 1.8, paysan: 0.6 },
  plastique: { ferrailleur: 3.6, artisan: 1.4, paysan: 0.6 },
  brulees: { mineur: 2.4, ferrailleur: 1.4, paysan: 0.5 },
  relais: { artisan: 3.2, ferrailleur: 1.6, mineur: 1 },
};

/** Ce que le tempérament d'une faction ajoute à la répartition. */
export const VOCATION_STYLE = {
  corpo: { artisan: 1.4, marchand: 1.2, milicien: 0.5 },
  nomade: { ferrailleur: 1, mineur: 0.6, milicien: 0.4 },
  fanatique: { milicien: 1.2, artisan: 0.4 },
  criminel: { marchand: 1.6, milicien: 0.8 },
  militaire: { milicien: 2.2, artisan: 0.5 },
  commune: { paysan: 1.8, medecin: 0.5 },
  essaim: { milicien: 1.5 },
};

// ---------------------------------------------------------------------------
// La couleur d'un drapeau neuf
// ---------------------------------------------------------------------------
//
// C'est le seul trait d'une faction qui ne se dérive pas d'une graine, et c'est
// délibéré. Tout le reste peut être tiré : un nom, une devise, un tempérament.
// Une couleur, non — deux teintes voisines rendent la carte illisible, et le
// hasard en produit sans le moindre effort. Elle se **calcule** : on prend la
// teinte qui s'éloigne le plus de toutes celles déjà en usage.
//
// Les sept d'origine occupent les teintes 0, 30, 53, 136, 188 et 275, à
// saturation 65-73 % et luminosité 54-65 %. L'Essaim est gris — saturation 7 %
// — et sort donc du concours : deux gris se ressemblent quelle que soit leur
// teinte, et lui en donner une reviendrait à réserver un secteur du cercle pour
// rien.

/** La teinte d'une couleur `#rrggbb`, en degrés. */
export function teinteDe(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0))
    : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
  return h * 60;
}

/** Sa saturation, de 0 à 1. Sert à écarter les gris du calcul de teinte. */
export function satDe(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
}

function hexDeHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${t.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Saturation et luminosité de la famille : un drapeau neuf ressemble aux autres. */
const SAT_DRAPEAU = 0.66;
const LUM_DRAPEAU = 0.6;

/**
 * La couleur du prochain drapeau : celle qui s'éloigne le plus des autres.
 *
 * Le cercle des teintes est balayé au degré près, et on garde celui dont la
 * distance circulaire à la teinte occupée la plus proche est la plus grande.
 * C'est exact, c'est déterministe, et ça coûte trois cent soixante comparaisons
 * une fois dans la vie d'une faction.
 */
/**
 * Le signe d'une monnaie. `ECONOMIE.md` §10 : un prix s'écrit dans la monnaie
 * du lieu et rien d'autre — « 128 ⌂ », pas de parenthèses, pas de conversion.
 *
 * Ce signe n'est donc pas de la décoration : sans lui, deux villes afficheraient
 * « 128 » pour deux sommes sans rapport et le joueur n'aurait aucun moyen de le
 * voir. C'est la contrepartie du choix d'afficher en monnaie locale seule.
 *
 * Un drapeau qu'on ne connaît pas rend le signe générique plutôt que rien : une
 * monnaie inconnue s'affiche, elle ne casse pas la ligne.
 */
export function symboleDe(world, cle) {
  const d = drapeauDe(world, cle);
  return (d && d.symbole) || '¤';
}

/**
 * La réserve de signes pour les drapeaux qui naissent en cours de partie.
 *
 * Même logique que `couleurNeuve` : on prend celui qui reste, jamais un tirage.
 * Un pays fondé en jeu ne doit pas décaler le flux scellé (piège n° 1), et deux
 * pays voisins qui porteraient le même signe rendraient l'affichage menteur —
 * ce que le signe est justement là pour empêcher.
 */
const SIGNES_LIBRES = [
  '⌂', '◈', '❖', '✜', '⊕', '⌾', '✱', '⊗', '▣', '✤',
  '⌬', '⍟', '✧', '⊞', '◍', '⎔', '✥', '⊛', '▩', '❆',
];

/**
 * Le premier signe que personne ne porte. Si la réserve est épuisée — vingt
 * pays nés dans la même partie, jamais vu au banc — on rend le générique : deux
 * monnaies confondues à l'écran valent mieux qu'une exception au milieu d'un
 * conseil.
 */
export function symboleNeuf(world) {
  const pris = new Set();
  for (const f of Object.values(FACTIONS)) if (f.symbole) pris.add(f.symbole);
  for (const f of Object.values((world && world.drapeaux) || {})) {
    if (f.symbole) pris.add(f.symbole);
  }
  for (const c of SIGNES_LIBRES) if (!pris.has(c)) return c;
  return '¤';
}

export function couleurNeuve(world) {
  const prises = [];
  for (const f of Object.values(FACTIONS)) {
    if (f.couleur && satDe(f.couleur) > 0.2) prises.push(teinteDe(f.couleur));
  }
  for (const f of Object.values((world && world.drapeaux) || {})) {
    if (f.couleur && satDe(f.couleur) > 0.2) prises.push(teinteDe(f.couleur));
  }
  if (!prises.length) return hexDeHsl(0, SAT_DRAPEAU, LUM_DRAPEAU);
  let meilleure = 0;
  let mieux = -1;
  for (let h = 0; h < 360; h++) {
    let proche = 360;
    for (const p of prises) {
      const d = Math.abs(h - p);
      proche = Math.min(proche, Math.min(d, 360 - d));
    }
    if (proche > mieux) { mieux = proche; meilleure = h; }
  }
  return hexDeHsl(meilleure, SAT_DRAPEAU, LUM_DRAPEAU);
}
