# Cendres & Protocole

Simulation textuelle post-cyberpunk, mobile first. Une escouade, une carte
inconnue, et six factions qui se font la guerre que vous soyez là ou non.

La survie d'escouade de **Kenshi** (pas d'élu, compétences qui montent à
l'usage, blessures membre par membre, K.O. avant la mort) dans une interface de
gestion à la **OGame** (files d'attente, production, recherche, temps réel qui
continue de tourner pendant votre absence).

## Lancer le jeu

```bash
cd game
npm start          # http://localhost:8123
```

Un simple serveur statique — les modules ES ne se chargent pas depuis `file://`.
Aucune dépendance, aucune étape de build, aucun compte. La partie est sauvegardée
dans le `localStorage` du navigateur.

## Jouer depuis un téléphone

`npm start` écoute sur toutes les interfaces et affiche l'adresse à taper :

```
Cendres & Protocole
  sur cette machine   http://localhost:8123
  depuis un téléphone du même réseau Wi-Fi :
    http://192.168.1.24:8123   (en0)
```

Ouvrez cette adresse depuis le téléphone (même réseau Wi-Fi que l'ordinateur),
puis **Ajouter à l'écran d'accueil** : le jeu s'ouvre alors en plein écran, sans
barre d'adresse, avec son icône. Le manifeste et les encoches sont gérés.

Deux limites à connaître :

- La sauvegarde vit dans le `localStorage` **de ce navigateur-là**. Une partie
  commencée sur l'ordinateur ne suit pas sur le téléphone — c'est la
  contrepartie du choix « aucun compte, aucun serveur ».
- Une fois l'ordinateur éteint, l'adresse ne répond plus. Pour y jouer n'importe
  où, n'importe quel hébergement statique suffit : le dossier `game/` se
  déploie tel quel sur GitHub Pages, Netlify, ou le Firebase Hosting déjà
  utilisé par ce dépôt. Rien à compiler.

Le jeu n'installe pas de *service worker* : sans réseau, la page ne se charge
pas. En ajouter un le rendrait jouable hors ligne, au prix des ennuis habituels
de cache périmé.

## Tests

```bash
npm test                     # 49 assertions sur le moteur, sans navigateur
node test/equilibre.js       # banc d'équilibrage : un bot joue 8 parties
node test/equilibre.js 8000 12   # plus long, plus de parties

npm install --no-save playwright-core
node test/navigateur.js      # 19 vérifications dans un Chromium réel
```

Le harnais couvre la génération du monde, le déterminisme, la sauvegarde, la
cohérence de l'état sur 4 000 heures simulées, l'économie, les ordres, l'avant-poste,
le combat, le rattrapage hors ligne et les cas limites (escouade décimée, famine,
sac plein).

## Ce que la simulation fait

**Le temps.** Un tick = une heure de jeu, vingt secondes réelles à ×1. Fermez
l'onglet : au retour, les heures écoulées sont rejouées d'un coup (plafond de
48 h réelles). Le monde n'attend personne.

**Le monde.** Carte de 10×8 régions, neuf biomes aux rendements et aux aléas
propres, seize colonies. Chaque colonie produit, consomme, nourrit sa population
ou la laisse partir, et fixe ses prix sur sa propre tension offre/demande — une
ville affamée paie les rations au prix fort.

**Les factions.** Sept, dont l'Essaim qui ne négocie pas. Elles tiennent un
trésor, délibèrent périodiquement, déclarent des guerres selon un calcul de
rapport de force et de rancune, lèvent des colonnes, les font marcher, mettent
le siège, prennent des villes, se ravitaillent mal et se dispersent, signent des
trêves quand la guerre coûte trop cher. La carte politique de la fin de partie
n'est pas celle du début.

**L'escouade.** Chaque membre a huit compétences qui montent en s'exerçant, six
zones de corps blessables séparément, de la faim, de la fatigue, du moral et du
sang à perdre. Un membre à zéro peut être perdu — et remplacé par une greffe si
vous avez cherché la Cybernétique. On tombe K.O. avant de mourir : perdre un
combat, c'est se réveiller plus loin, dépouillé, pas game over.

**L'avant-poste.** À bâtir où vous voulez hors des villes. Dix bâtiments à
niveaux, contrainte d'énergie, chaînes de transformation (biomasse → rations,
minerai → alliage → composants), entrepôt plafonné, dix recherches, et des raids
à encaisser quand vous n'êtes pas là.

**Les consignes.** Posture de combat et quatre consignes permanentes (recruter,
commercer, payer les péages, achever les blessés) qui s'appliquent aussi pendant
votre absence : c'est ce qui rend la simulation hors ligne jouable plutôt que
subie.

## Architecture

```
game/
  index.html          page unique
  styles.css          feuille unique, mobile first
  manifest.json       ajout à l'écran d'accueil
  icone.svg           icône (manifeste)
  icone-180.png       icône (iOS), régénérable via tools/icone.js
  src/
    rng.js            mulberry32, état sur 32 bits
    data.js           biomes, factions, bâtiments, recherches, équipement
    world.js          génération de carte, Dijkstra, brouillard de guerre
    characters.js     compétences, blessures localisées, besoins
    combat.js         résolution au tour par tour
    economy.js        prix, production des colonies, transactions
    factions.js       guerres, armées, sièges, diplomatie
    base.js           avant-poste, files, production
    squad.js          ordres, récolte, cycle jour/nuit, voyage
    events.js         rencontres, journal de bord
    sim.js            orchestration, rattrapage hors ligne
    save.js           sérialisation
    ui.js             rendu DOM + carte pixel sur canvas
    main.js           amorçage et horloge réelle
  test/
    headless.js       tests du moteur
    equilibre.js      banc d'équilibrage avec bot joueur
    navigateur.js     test de bout en bout dans un Chromium réel
    serve.js          serveur statique
  tools/
    icone.js          génère icone-180.png (encodeur PNG maison)
```

Deux règles tiennent l'ensemble :

1. **Le moteur ne touche jamais au DOM.** Seuls `ui.js` et `main.js` connaissent
   le navigateur. Tout le reste tourne sous Node — c'est ce qui permet de tester
   4 000 heures de simulation en 30 ms.
2. **L'état est du JSON pur.** Pas de classes, pas de références circulaires,
   pas de fonctions. Le RNG est sérialisé avec le reste : recharger une partie
   la reprend exactement où elle en était, et deux parties lancées sur la même
   graine sont identiques au caractère près.

## Et le multijoueur ?

L'état est déjà coupé en deux : `state.world` (monde partagé) d'un côté,
`state.player` et `state.base` (privés) de l'autre. Le passage au multijoueur
consiste à déplacer la première moitié sur un serveur qui tique, et à envoyer
les actions du joueur comme des commandes horodatées au lieu de les appliquer
localement. Le déterminisme du moteur permet au serveur de rejouer et de vérifier
ce que le client annonce.

Restent à écrire ce jour-là : le tick serveur, l'authentification, et la
résolution des conflits quand deux joueurs visent la même colonie. C'est du
travail additif — rien à jeter.
