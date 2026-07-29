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

export const ITEM_KEYS = Object.keys(ITEMS);

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
