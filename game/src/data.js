// Données statiques du monde : marchandises, biomes, factions, bâtiments,
// recherches, équipement, tables de noms. Aucun état de partie ici.

export const TICK_HOURS = 1; // 1 tick = 1 heure de jeu
export const HOURS_PER_DAY = 24;

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
    couleurs: ['#33323a', '#3d3c46', '#2b2a32'],
    danger: 0.014,
    cout: 3,
    yields: { biomasse: 0.4, ferraille: 0.35 },
    hazard: { type: 'tempete', nom: 'Tempête de cendre', p: 0.02, degats: 3, fatigue: 6 },
  },
  dalles: {
    nom: 'Dalles Urbaines',
    court: 'DALLES',
    couleurs: ['#2a2f3a', '#39404f', '#222732'],
    danger: 0.032,
    cout: 3,
    yields: { ferraille: 1.0, polymere: 0.55, composant: 0.09 },
    hazard: { type: 'effondrement', nom: 'Effondrement', p: 0.012, degats: 8, fatigue: 4 },
  },
  friche: {
    nom: 'Friche Radio',
    court: 'FRICHE',
    couleurs: ['#3a3320', '#4a4128', '#2f2a1a'],
    danger: 0.028,
    cout: 4,
    yields: { isotope: 0.42, ferraille: 0.35 },
    hazard: { type: 'radiation', nom: 'Radiations', p: 0.08, degats: 2, fatigue: 3 },
  },
  desert: {
    nom: 'Désert Acide',
    court: 'DÉSERT',
    couleurs: ['#5a4a2a', '#6b5a33', '#4a3d22'],
    danger: 0.022,
    cout: 5,
    yields: { minerai: 0.5, isotope: 0.18 },
    hazard: { type: 'acide', nom: 'Pluie acide', p: 0.05, degats: 4, fatigue: 5 },
  },
  canyons: {
    nom: 'Canyons de Fer',
    court: 'CANYONS',
    couleurs: ['#4a2f2a', '#5a3a32', '#3c2622'],
    danger: 0.036,
    cout: 6,
    yields: { minerai: 1.0, alliage: 0.08 },
    hazard: { type: 'eboulement', nom: 'Éboulement', p: 0.02, degats: 10, fatigue: 5 },
  },
  marais: {
    nom: 'Marais Néon',
    court: 'MARAIS',
    couleurs: ['#16342c', '#1d4438', '#122a24'],
    danger: 0.04,
    cout: 6,
    yields: { biomasse: 1.0, polymere: 0.3 },
    hazard: { type: 'spores', nom: 'Spores', p: 0.06, degats: 3, fatigue: 7 },
  },
  plastique: {
    nom: 'Mer de Plastique',
    court: 'PLASTIQUE',
    couleurs: ['#2b2438', '#392f4a', '#231d2e'],
    danger: 0.03,
    cout: 7,
    yields: { polymere: 1.2, carburant: 0.28 },
    hazard: { type: 'enlisement', nom: 'Enlisement', p: 0.03, degats: 5, fatigue: 9 },
  },
  brulees: {
    nom: 'Terres Brûlées',
    court: 'BRÛLÉES',
    couleurs: ['#4a2420', '#5c2e28', '#3a1c19'],
    danger: 0.052,
    cout: 5,
    yields: { carburant: 0.6, minerai: 0.4 },
    hazard: { type: 'chaleur', nom: 'Chaleur extrême', p: 0.09, degats: 3, fatigue: 10 },
  },
  relais: {
    nom: 'Relais Orbital',
    court: 'RELAIS',
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
    devise: '—',
    agression: 0.95,
    cupidite: 0,
    style: 'essaim',
    biomes: ['plastique', 'friche', 'brulees'],
  },
};

export const FACTION_KEYS = Object.keys(FACTIONS);
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
  hydroponie: {
    nom: 'Hydroponie',
    desc: 'Transforme la biomasse en rations comestibles.',
    cout: { ferraille: 50, polymere: 40 },
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
};

export const METIER_KEYS = Object.keys(METIERS);
