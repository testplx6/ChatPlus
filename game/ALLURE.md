# L'allure — l'étude « AAA textuel », pistes consignées

Demandée par le propriétaire (« explore des pistes pour améliorer
l'UI/UX et lui donner un look de jeu AAA », août 2026). Menée avec le
game master, **captures d'écran sous les yeux** (le dossier
`captures/` du décor navigateur). Des pistes, pas un chantier : rien
n'est engagé tant que le propriétaire n'a pas choisi.

Contraintes dures du support, toutes respectées par les pistes : un
seul fichier HTML auto-contenu (seule ressource externe permise :
Google Fonts), mobile d'abord, l'UI ne touche jamais au moteur, zéro
lib, zéro image externe — tout est CSS, canvas, SVG inline ou généré.

## 1. Le diagnostic — ce qui trahit le fait maison

Le squelette est bon (chiffres tabulaires, panneaux repliables,
l'aperçu tactique qui juge sur pièces est du meilleur game-UX). Le
problème : **tout a le même poids, la même voix, la même matière.**

- **Une seule police partout** — le mono système habille le titre, la
  prose de la chronique, les prix et les boutons : LE marqueur
  « terminal générique ».
- **La carte est un tableur sombre** : à la première heure, ~90 % de
  noir pur ; carrés plats ; les pistes damées (`r.piste`) invisibles ;
  rien ne bouge alors que caravanes, colonnes et météo vivent dans
  `world`.
- **La prose doctrinale écrase la donnée** : sept lignes d'explication
  avant le premier fait sur l'écran monde — chaque écran est une
  notice. Un AAA montre la donnée et OFFRE l'explication.
- **Les toasts se posent au milieu**, par-dessus le contenu, parfois
  en double du rapport qu'ils recouvrent — le détail qui crie
  « prototype ».
- **L'en-tête est un télégramme crypté** (`☀ J1 08:00 ◆ ~ 0 SAC 9/45`)
  et le signe de monnaie n'est jamais expliqué.
- **La couleur fait deux métiers** : rouge = danger ET Milice, vert =
  gain ET Ombrelle. Et pour un monde de cendre, la palette est
  froide, tech — rien de chaud, rien de brûlé.
- **Les grands moments passent en taille 13** : la mort d'un membre,
  le chapitre nouveau, le retour d'absence — les trois plus belles
  machines à récit du moteur n'ont aucune mise en scène.
- Le grand écran est un téléphone étiré ; les glyphes de nav ont des
  poids disparates ; les cases à cocher sont des `[×]` ASCII.

## 2. La direction artistique — « le terminal de campagne et la chronique »

Le jeu a déjà deux voix ; la DA donne un corps à chacune :

- **Typographie** (Google Fonts, repli système, `font-display: swap`) :
  **IBM Plex Mono** (400/600) pour la machine — données, prix, ordres,
  en-tête ; **IBM Plex Serif** (400 + italique) pour la chronique —
  chapitres, fils, stèles, rapport d'absence, accueil. Étiquettes en
  Plex Mono 600 petites capitales. Pas de troisième famille.
- **Palette** : garder le socle sombre ; introduire l'axe **braise/os**
  (`#d9803a` / `#e8e0d0`) réservé au récit et aux moments ; le cyan
  reste la couleur du signal (interface, actions). Découpler
  sémantique et factions (symboles ⬡⚙✷☂▲✿ + teintes désaturées en
  aplat). Le chrome vit avec le monde : teinte nocturne, voile de
  saison sur la carte.
- **Matière en pur CSS** : scanlines subtiles sur le chrome seulement,
  grain de bruit (feTurbulence en data-URI) sur les panneaux récit,
  vignette radiale sur la carte, liséré « papier brûlé » en dégradé.
- **Iconographie** : un jeu de 16-20 SVG inline (trait 1,5 px, grille
  24) — nav, dix marchandises, états, vraies cases à cocher. Les
  symboles de faction restent.

## 3. Le « juice » compatible textuel

- **La carte qui vit** : couche `requestAnimationFrame` ~10 i/s en
  lecture seule de `world` — caravanes qui cheminent, colonnes qui
  pulsent, feux des villes (scintillement dérivé de `grainDe` —
  déterministe à l'œil), cendre qui dérive au vent, stries de pluie
  acide, nuit qui assombrit. En pause onglet caché.
- **L'inexploré n'est plus du vide** : bruit de terrain voilé +
  vignette — « un monde sous la cendre », pas un écran éteint.
- **Les moments en plein écran** (superpositions DOM, un tap pour
  fermer) : chapitre nouveau (interstitiel serif, chiffre romain
  braise), mort d'un des vôtres (carte-stèle), siège (bandeau rouge
  tant que `siegeEnCours`), retour d'absence (dépêches serif — et le
  toast redondant supprimé).
- **Micro-interactions** : toasts en file ancrée en bas, barres qui
  glissent, nombres qui roulent, pastille du journal qui pulse une
  fois, apparition ligne à ligne du journal aux grandes vitesses.
- **Le journal raconté** : groupé par jour, icônes par type, marquants
  à liséré braise, dépêches d'histoire en serif.
- **Son génératif WebAudio** (optionnel, off par défaut, premier
  geste) : vent en bruit filtré suivant la météo, statique sur un
  marquant, tambour à l'ouverture d'un siège. Cent lignes, zéro asset.

## 4. L'onboarding de la première heure (sans tutoriel scripté)

1. **Le Point de situation devient le fil rouge** : chaque ligne est
   un lien-bouton qui ouvre l'écran et le panneau concernés — le
   guide parfait d'une simulation : il n'invente rien, il pointe.
2. **La prose passe derrière un `?`** dépliable — les écrans
   raccourcissent de moitié, le savoir reste à un tap.
3. **L'en-tête s'explique** : libellés pleins les premières heures,
   puis compact ; appui long = libellé plein.
4. **La carte oriente** : zoom initial sur le connu, halo vers la
   ville la plus proche, aide au geste qui s'estompe après usage.

## 5. Les pistes, classées

**Quick wins (jours)** — Q1 typo Plex Mono+Serif (l'identité change en
un commit) · Q2 toasts en file en bas + doublon d'absence supprimé ·
Q3 inexploré voilé + vignette · Q4 prose derrière `?` · Q5 jour/nuit
et saisons sur le chrome · Q6 barres et nombres animés · Q7 Point de
situation cliquable.

**Moyennes (semaine)** — M1 la carte vivante v1 · M2 interstitiels
(chapitre, stèle, siège) · M3 journal groupé et raconté · M4 en-tête
refondu · M5 icônes SVG · M6 grand écran « salle des cartes ».

**Grosses (chantier)** — G1 la carte-affiche (textures par biome,
pistes damées visibles, relevés périmés désaturés — la capture
d'écran devient le marketing du jeu) · G2 le mode chronique (la
partie relue comme un livre, exportable) · G3 le son génératif.

## L'avancement

**Les pistes moyennes sont engagées** par le propriétaire (« je veux un
design propre agréable qui donne envie de revenir », août 2026), dans
l'ordre du mot de la fin du game master : l'identité d'abord (M1, M2),
la finition ensuite.

- **M1 — livré, la carte vivante v1.** Un second canevas (`#carte-vie`)
  par-dessus le terrain, dix images par seconde : les feux des villes
  respirent (braise dérivée de la case — déterministe à l'œil), les
  convois font courir leur fanal, les colonnes battent comme un pouls,
  la cendre dérive au vent de la météo (dense sous le vent de cendre),
  la pluie acide strie, l'orage sec zèbre. Trois règles tenues : lecture
  seule (rien ne touche l'état ni le RNG), la couche n'en sait pas plus
  que la carte (ses listes sont remplies par `dessinerCarte` pendant
  qu'il applique les règles de visibilité), et elle s'éteint toute seule
  (onglet caché, écran quitté, `prefers-reduced-motion`). Test
  navigateur : la couche couvre la carte, deux instants diffèrent, la
  partie continue de s'écrire.

- **M2 — livré, les grands moments.** Un chapitre qui tourne et un des
  vôtres qui tombe ont l'écran entier : plein écran serif, chiffre
  romain braise pour la chronique, carte-stèle (nom, métier, cause,
  lieu) pour le deuil — un tap referme, la file montre le suivant.
  Trois règles : seulement ce qui arrive en jouant (l'histoire déjà
  écrite ne se rejoue pas, les heures d'absence restent au rapport, qui
  parle désormais en serif lui aussi) ; un moment ne se montre qu'une
  fois (`momentVu`, dans la sauvegarde) ; la stèle ne se lève que pour
  un des vôtres (elle doit répondre à une inscription au mémorial). Le
  siège du camp a son bandeau sur tous les écrans tant qu'il dure.
  Le harnais navigateur joue en joueur pressé : il tape sur les moments
  qu'il n'est pas en train de vérifier.

- **M3 — livré, le journal raconté.** Le fil est groupé par jour (têtes
  de chapitre à rebours), chaque entrée porte un glyphe de sa famille
  (†, ⨯, ⚑, +, ⌂, ❧ — dérivé de la famille de couleur, un type nouveau
  hérite), les marquants portent un liséré braise, et les dépêches du
  récit (début, chapitres, fils, accueils, fin) parlent en serif. Les
  quatre points sont sous test navigateur, prouvé mordant par mutation
  (l'écart au cycle — code écrit avant d'avoir vu le rouge — est
  compensé, pas caché).

- **M4 + M5 — livrés ensemble, le chrome qui s'explique.** La barre de
  navigation porte six icônes dessinées (SVG inline, trait 1,5, grille
  24, couleur du texte courant) au lieu des glyphes Unicode aux poids
  disparates ; les `[×]` ASCII sont devenus de vraies cases (l'état vit
  sur `aria-pressed`, la case ne fait que le montrer) — consignes,
  tactiques, détachement, réglages du camp ; et le signe de monnaie de
  l'en-tête s'explique enfin (infobulle : « Monnaie d'ici : … »).
  Limite dite : les dix icônes de marchandises attendues par la DA
  restent à dessiner — elles viendront avec un écran qui les porte.

- **M6 — livré, la salle des cartes.** À 1280 px, les écrans hors carte
  cessent d'être un téléphone étiré : leurs panneaux coulent sur deux
  colonnes (l'ordre du document ne bouge pas — l'ancre de lecture et
  les replis tiennent), un bandeau d'urgence en tête barre toute la
  salle, et la racine s'élargit sur tous les écrans, plus seulement la
  carte.

- **G1 — livré, la carte-affiche et la palette de cendre.** Le retour
  du propriétaire sur les moyennes (« y a vraiment pas de grosses
  améliorations ») a dit vrai : le visible était ici, pas là. Livré :
  les neuf biomes ont une vraie matière (tramage dense à valeur par
  grain, quatrième ton d'accent semé rare, ondulation par case,
  coutures d'ombre entre biomes — des pays, plus des cases), les
  villes sont bâties (des toits autour du carré dès que le zoom laisse
  la place), le hors-de-vue est voilé (le carnet se voit), l'inexploré
  est un monde sous la cendre (reliefs devinés — du bruit, jamais le
  vrai terrain), les palettes des neuf biomes sont plus riches, et le
  chrome entier passe du froid tech à la cendre chaude (les jetons de
  `:root`, plus les séparateurs codés en dur). La vie (M1) est
  amplifiée : feux avec halo, cendre plus dense. Deux gardes
  mesurables : l'inexploré ≥ 6 tons, une case découverte ≥ 8 tons —
  rouges d'abord (2 et 3 tons).
- **Trouvaille en route — l'enquête d'ancre de PROMESSES est close,
  et l'ancre est innocente.** Le garde « ce qu'on lit reste sous les
  yeux » est tombé au pixel près pendant G1 ; une sonde posée dans le
  garde a montré que les ancres n'avaient pas bougé d'un pixel dans
  les runs rouges — c'est la sonde du décor qui tombait sur la
  frontière de marge entre deux entrées, et qu'un demi-pixel de
  métriques (la pile de polices) faisait basculer. Deux remèdes de
  décor (la sonde regarde à trois profondeurs, les polices sont
  épinglées dans les tests), deux durcissements réels du produit en
  bonus (`journalN` unique par entrée, ancre stable des têtes de
  jour). Le garde n'a pas bougé d'une virgule. Dossier complet, faux
  départs compris, dans PROMESSES.md §Blocages.

- **La refonte d'ensemble — une passe, sur ordre du propriétaire**
  (« je veux une refonte profonde de l'UI », août 2026). La braise
  devient la couleur de l'action du joueur — boutons primaires, onglet
  actif, vitesse enfoncée — et le cyan redevient ce qu'il devait être :
  le signal de la machine (états, sélections). Les têtes de panneaux
  sont de vraies têtes (os clair, graisse 600, filet braise dégradé),
  les boutons ont une hiérarchie (repos/primaire/danger, transitions,
  survol), les jauges sont affinées, la modale est une feuille tirée du
  bas (poignée, coins hauts arrondis, filet braise), l'accueil parle
  serif sous un titre os, et le chrome porte la matière du terminal de
  campagne (scanlines discrètes, lumière par le haut). Menée par la
  voie rapide de METHODE §10 : une passe, une suite, un --complet.

- **La refonte complète, passe 2 — l'architecture des écrans, sur
  ordre du propriétaire** (« je veux une refonte complète de l'UI,
  fais appel aux experts nécessaires », août 2026). Deux avis croisés
  — le game master (architecture de l'information : les écrans
  racontaient l'histoire du dépôt, pas la journée du joueur ; l'ordre
  voulu : décision en attente → gens → verbes) et un œil mobile
  (composants, rythme vertical) — puis une passe. Livré :
  - **Le socle de jetons** (passe 1 du même lot) : espacements
    (`--e1`…`--e5`), échelle typographique (`--t-*`), filet unifié,
    boutons à hauteur tactile (44 px), jauges affinées, pastilles,
    légende sur une ligne, et les composants `fiche-vide`,
    `grille2.serree`, `jauge-l`, `rangee-cartes`.
  - **Le pli par défaut** (`DEFAUT_PLIE`, mécanisme mené au cycle
    strict, rouge d'abord) : les réglages qu'on touche une fois par
    partie (posture, tactique, consignes, détacher, mémorial) et les
    fiches d'ambiance (position, contrats en cours de la carte,
    climat, villes connues, chronique, « comment ça marche ») naissent
    repliés — leur barre dit l'essentiel, et les déplier est un choix
    qui tient (`replis` mémorise l'écart au défaut, aucune migration).
  - **Les écrans réordonnés et les doublons fondus.** Escouade :
    prisonniers et morts d'abord, la cohésion puis les fiches — les
    deux panneaux « Cohésion » n'en font plus qu'un. Base : les deux
    lignes « Habitants » fondues ; chaîne, consignes, file et
    bâtiments avant le comptoir. Contrats : l'en-cours mène,
    l'allégeance suit. Monde : l'estime puis le rapport de puissance ;
    le climat et les villes connues replient en fin. Carte : la ville
    (ses portes) au-dessus de l'ordre, le panneau « Avant-poste » à un
    bouton fondu dans l'ordre du groupe, et « ils vous voient » hissé
    dans la barre de « Position » — lisible même repliée.
  - **Le journal** : le panneau-filtre à deux boutons fondu dans la
    tête du fil. **L'accueil** ouvre sur « Reprendre ». **La carte**
    tient en 50 dvh pour que le point de situation affleure.

  Limites dites : la salle des cartes garde `column-count` (les
  grilles explicites par écran voulues par le GM seraient un lot à
  part) ; le méga-panneau d'allégeance n'est pas encore éclaté en
  sections de premier niveau ; la chronique repliée ne s'ouvre pas
  d'elle-même au tournant de chapitre.

- **La refonte complète, passe 3 — la peau du jeu, sur ordre du
  propriétaire** (« je veux que l'aspect soit agréable, ludique,
  addictif, jeu pro, immersif », août 2026). Apparence pure, une passe
  §10, `styles.css` seul :
  - **La profondeur** : les panneaux et les fiches sont des cartes
    (rayon, filet de lumière par le haut, ombre courte), l'en-tête
    flotte au-dessus de l'écran qui défile, l'écran a une source de
    lumière (lueur braise en haut de page) et une barre de défilement
    discrète.
  - **Le HUD** : chaque indicateur de l'en-tête est un jeton bordé, la
    monnaie a une lueur d'ambre, le sélecteur de vitesse est une
    capsule, l'onglet actif est *allumé* (fond braise dégradé, halo).
  - **La réponse au doigt** : les boutons ont un relief qui s'enfonce
    réellement à l'appui (l'ombre rentre), le primaire est une braise
    pleine qui rayonne, l'état sélectionné se lit au premier regard.
  - **Les jauges sont des barres de jeu** : crantées tous les 8 px,
    colorées avec un halo — une quantité, pas une tache.
  - **Les entrées** : la feuille de modale monte du bas à l'ouverture,
    les toasts naissent en glissant — animées seulement sur des
    surfaces montées une fois (la boîte de modale n'est créée qu'à
    l'ouverture, vérifié dans `rendreModale`), jamais sur ce que le
    tick re-rend.
  - **L'écran-titre** : titre plus grand sous halo braise, des braises
    montent lentement derrière l'accueil (une couche, coupée par
    `prefers-reduced-motion`), et choisir son départ répond en braise —
    le premier geste du joueur.
  - **Le pupitre tactique** : quatre équerres braise aux coins du
    cadre de la carte.

  Limites dites : pas d'animation sur les jauges ni les panneaux (le
  rendu reconstruit l'innerHTML — toute animation y rejouerait à
  chaque tick) ; les nombres ne défilent pas encore (piste M du rendu
  incrémental).

- **La vraie refonte — direction A « le poste de commandement »,
  choisie sur maquettes** (« je m'attendais à une vraie refonte »,
  août 2026). Le constat honnête d'abord : trois passes avaient poli
  le jeu sans changer son squelette — une liste verticale de panneaux
  reste une liste verticale de panneaux. La méthode qui a débloqué :
  deux directions maquettées (A poste de commandement, B carnet de
  campagne), le propriétaire a choisi **A** en les regardant.
  L'implémentation se fait écran par écran contre la maquette ;
  chaque écran livré passe la suite entière, `--complet`, et
  republie l'artefact.
  - **Étape 1 — livrée : l'écran carte et le chrome.** Sur téléphone,
    la carte EST l'écran : collante, pleine largeur, sans cadre — et
    les panneaux glissent par-dessus comme une feuille qu'on tire,
    avec poignée et ombre portée sur la carte. Le geste de la feuille
    est le défilement natif : AUCUN mécanisme nouveau, donc l'ancre
    de lecture, les replis et les gestes de carte tiennent tels
    quels (334 vérifications vertes sans en réécrire une). Le dock
    de navigation devient une barre flottante arrondie, l'onglet
    actif allumé dedans. La voix d'affichage arrive : Big Shoulders
    Display (condensée, militaire) porte toutes les têtes d'encart —
    les valeurs restent en mono, le récit en serif. Le bandeau
    d'urgence garde sa préséance : il passe AVANT la carte, la
    feuille commence après elle.
  - **Étape 2 — livrée : l'escouade en galerie de portraits.** La
    fiche membre devient une carte : l'anneau de santé (SVG, coloré
    par l'état) autour des initiales, le nom, le métier, l'état en
    jeton — et le mot « santé » reste dans le résumé, un pourcentage
    sans nom ne se comprend pas. Deux cartes par rangée ; la fiche
    ouverte prend toute la largeur (la mécanique `details` ne bouge
    pas d'un octet). La cohésion s'affiche en grand chiffre de la
    voix d'affichage, coloré par son état — un état de jeu, pas une
    note de bas de page.
  - **Étape 3 — livrée : le dock d'ordres, les verbes sur la carte.**
    Mécanisme mené au cycle strict (trois assertions vues rouges
    avant le code) : les tuiles d'ordre déménagent du panneau
    « Ordre » vers un dock posé sur le bas du terrain — une rangée
    défilante, translucide, qui suit la carte collante : donner un
    ordre ne demande plus de défiler. UNE seule source de boutons
    (le panneau garde le détail : progression, rendements,
    répartition, transfert) — les tests existants cliquent les mêmes
    sélecteurs sans changer une ligne.

  - **Étape 4 — livrée : chaque écran s'annonce** (« c'est pas
    fini », dit le propriétaire — il avait raison : les composants
    partagés ne font pas une identité par écran). La bande de tête
    de la maquette sur les cinq écrans hors carte — la carte, elle,
    EST sa propre identité : le nom de l'écran en voix d'affichage,
    et les chiffres-héros qui disent son métier d'un regard — debout
    et cohésion colorée (escouade), habitants, défense et entrepôt
    (le camp), l'en-cours et les honorés (contrats), les villes
    vivantes et l'année (le monde), le jour et le chapitre
    (journal). La bande n'a pas de titre repliable : elle n'est pas
    un encart, elle est l'identité de la page. Les urgences (siège,
    vigie, dévaluation) passent toujours devant.

  - **Étape 5 — livrée : le HUD flotte sur la carte, le dock a ses
    icônes** (« on est encore loin de la maquette », dit le
    propriétaire — les deux écarts les plus visibles étaient là).
    Sur téléphone, l'écran carte n'a plus de barre au-dessus de lui :
    la carte monte jusqu'en haut, la barre devient transparente et
    laisse passer le doigt, et les indicateurs sont des jetons
    translucides (fond sombre, flou) posés SUR le monde. Les autres
    écrans gardent leur barre pleine, le grand écran aussi —
    l'interrupteur est la classe d'écran déjà entretenue par le
    rendu. Et chaque verbe du dock se reconnaît avant de se lire :
    huit icônes dessinées à la règle de M5 (trait 1,6, grille 24,
    couleur du texte courant), cyan quand l'ordre est actif.

  **La refonte direction A est livrée** — cinq étapes, chacune
  poussée après suite entière et `--complet` verts, l'artefact
  republié à chaque livraison. Reste ouvert si le propriétaire en
  veut plus : le HUD posé en surimpression sur la carte elle-même
  (l'en-tête reste une barre), les architectures dédiées écran par
  écran au-delà de la bande, et la direction B « carnet de
  campagne » gardée sur le canevas de maquettes.

**Les six pistes moyennes et G1 sont livrées.** Restent G2 (mode
chronique) et G3 (son génératif) — non engagées.

**Quick wins livrés d'un bloc (août 2026), avec leurs limites dites :**

- **Q1 — livré, socle + deux surfaces.** IBM Plex Mono porte tout le
  chrome (seule ressource externe autorisée, lien non bloquant : hors
  ligne le jeu s'affiche dans la pile système sans attendre) ; le serif
  (`--serif`, classe `.recit`) n'habille pour l'instant que la chronique
  et « Son histoire » sur la fiche. Étendre le serif aux autres passages
  de prose reste à faire, écran par écran.
- **Q2 — livré.** Les toasts font la file en bas (trois au plus, les
  plus vieux partent), et le doublon du toast d'absence est supprimé —
  l'écran de retour dit déjà tout.
- **Q3 — livré.** Vignette sur le cadre de la carte
  (`#carte-boite::after`) ; l'inexploré était déjà voilé par la carte
  elle-même.
- **Q4 — livré, un bloc.** Seul « Ce que servir rapporte, et coûte »
  (allégeance, indépendant) est replié derrière `details.aide-plus`.
  Les autres pavés d'aide candidats seront repliés au fil des écrans.
- **Q5 — livré.** La nuit (21 h–6 h) assombrit le bandeau haut
  (`data-nuit`) ; sur la carte, la saison teint à peine, la nuit voile —
  **sous** les marqueurs : le voile tombe sur le terrain, pas sur ce
  qu'on suit (les carrés blancs des groupes restent francs, le test
  navigateur y veille).
- **Q6 — partiel, dit honnêtement.** Les boutons répondent sous le
  doigt (`:active`). Les transitions de largeur sur les jauges seraient
  du CSS mort — `rafraichir` reconstruit l'innerHTML, rien ne
  transitionne sur un élément neuf — donc retirées plutôt que laissées
  en décor. Animer les nombres demande la piste M-moyenne (rendu
  incrémental ou rAF), pas un quick win.
- **Q7 — livré.** Chaque ligne du point de situation est un lien `▲`
  vers l'écran où elle se règle (escouade, base, contrats).

Aucune règle du jeu touchée : tout est dans `ui.js`, `styles.css`,
`tools/bundle.js` (polices). Le moteur n'a pas bougé.

## Le mot de la fin du game master

« Ce jeu écrit comme un roman et s'affiche comme un tableur : la
seule décision qui change tout, c'est de donner un corps typographique
à la voix qui existe déjà — le serif de la chronique contre le mono du
terminal, la braise contre le signal — puis de laisser la carte
prouver la promesse de l'accueil ("un monde qui tourne sans vous") en
y faisant bouger ce qui bouge déjà. Tout le reste est de la finition ;
ces deux gestes-là sont l'identité. »
