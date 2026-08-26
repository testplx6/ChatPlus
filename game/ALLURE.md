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
- **Trouvaille en route — l'ancre du journal avait un vrai défaut.**
  Le garde « ce qu'on lit reste sous les yeux » est tombé au pixel
  près : la clé d'ancre « heure + début du texte » n'est pas unique —
  une rafale de guerre écrit deux entrées identiques à la même heure,
  et l'ancre retrouvait le premier doublon. Réparé dans le produit,
  pas dans le garde : chaque entrée de journal porte un numéro d'ordre
  monotone (`journalN`, posé par `creerLogger`, migré par
  `normaliser`), et l'ancre s'y accroche. C'est probablement le fond
  de la dette « enquête ancre navigateur » de PROMESSES.md.

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
