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

## Un seul fichier, sans rien installer

```bash
node tools/bundle.js     # → dist/cendres.html
```

`dist/cendres.html` contient tout : style, moteur, interface. Il s'ouvre par
double-clic, sans serveur ni connexion, et se transfère tel quel sur un
téléphone (AirDrop, pièce jointe, clé USB). C'est le moyen le plus court de
jouer. Le bundler concatène les modules dans l'ordre des dépendances et
s'arrête si deux d'entre eux déclarent le même nom de premier niveau.

`node tools/bundle.js --fragment <chemin>` produit la même chose sans
`<html>`/`<head>`/`<body>`, pour les hébergeurs qui fournissent le squelette.

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
npm test                     # 171 assertions sur le moteur, sans navigateur
node test/equilibre.js       # banc d'équilibrage : un bot joue 30 parties
node test/equilibre.js 4000 60   # échantillon large, une vingtaine de secondes
SANS=detach,contrats node test/equilibre.js   # coupe un système pour l'isoler
VAGABOND=1 node test/equilibre.js             # témoin : voyager sans contrats

npm install --no-save playwright-core
node test/navigateur.js      # 67 vérifications dans un Chromium réel
```

Le harnais couvre la génération du monde, le déterminisme, la sauvegarde, la
cohérence de l'état sur 8 000 heures simulées, l'économie, les ordres,
l'avant-poste, le combat, le rattrapage hors ligne, la vitalité du monde sur la
durée (villes fondées, villes effondrées, population qui ne s'écroule pas) et
les cas limites (escouade décimée, famine, sac plein).

Il tient aussi un **budget de performance** : le coût d'un tick est mesuré, puis
rapporté à la vitesse de la machine par un étalon (le même travail fixe partout).
Un plafond en microsecondes sèches serait soit trop lâche pour attraper une
régression, soit capricieux d'une machine à l'autre ; normalisé, il tient à 60 µs
près et le test tombe si le tick se remet à coûter le double.

Le banc d'équilibrage est le plus utile des trois : c'est lui qui a montré que
l'économie alimentaire des colonies n'avait jamais été à l'équilibre, que les
chasseurs de prime créaient une spirale sans issue, et que la route prélevait
55 % du revenu — ce qui rendait tout le contenu du jeu moins rentable que camper
sur une bonne case.

Il tient trente parties par défaut, pas huit : à huit, l'écart-type sur un taux
de survie de 85 % vaut douze points, et on lit du bruit en croyant lire un
réglage. Ses deux interrupteurs (`SANS=`, `VAGABOND=1`) servent à couper un
système à la fois : c'est la seule façon d'attribuer un déséquilibre à sa cause
plutôt qu'à une intuition. Le mode vagabond — voyager autant, sans prendre un
seul contrat — est le témoin qui a innocenté les contrats et accusé la route.

## Ce que la simulation fait

**Le temps.** Un tick = une heure de jeu, dix secondes réelles à ×1 — et le jeu
démarre à ×4, parce qu'à ×1 il ne se passe visiblement rien. Fermez l'onglet :
au retour, les heures écoulées sont rejouées (plafond de deux ans de jeu). Une
longue absence passe par un écran de rattrapage qui rejoue le temps par
tranches, entre deux images, avec une barre qui avance : la page répond pendant,
et fermer en cours de route ne rejoue pas deux fois ce qui a déjà été joué. Le
monde n'attend personne.

**Le climat.** Quatre saisons de trente jours qui tournent en boucle, et une
météo qui change toutes les quelques heures. Elles pèsent sur les rendements
(vivant et minéral séparément), le coût de la marche, la fréquence des aléas et
des rencontres, la portée du regard. Un hiver de cendre se prépare : on stocke
en saison des pluies, ou on ne passe pas.

**Le monde.** Carte de 10×8 régions, neuf biomes aux rendements et aux aléas
propres, seize colonies au départ. Chaque colonie produit, consomme, se rationne
avant de mourir, et fixe ses prix sur sa propre tension offre/demande — une ville
affamée paie les rations au prix fort. Une ville prospère change de rang ; une
ville saignée par les guerres finit abandonnée et devient un site à fouiller ;
une faction riche en fonde de nouvelles. Sur une année de jeu, la carte perd et
gagne des villes.

**Les caravanes.** Ce qu'une ville a en trop part chez celle qui en manque, sur
des routes réelles et dangereuses. Elles se font piller par les pillards et par
les colonnes en campagne — et vous pouvez leur tendre une embuscade, au prix
d'une réputation durablement abîmée.

**Les factions.** Sept, dont l'Essaim qui ne négocie pas. Elles tiennent un
trésor, délibèrent périodiquement, déclarent des guerres selon un calcul de
rapport de force et de rancune, lèvent des colonnes, les font marcher, mettent
le siège, prennent des villes, se ravitaillent mal et se dispersent, signent des
trêves quand la guerre coûte trop cher. La carte politique de la fin de partie
n'est pas celle du début.

**Les groupes.** L'escouade n'est pas un bloc. On la scinde en groupes qui ont
chacun leur position, leur ordre et ce qu'ils portent — vivres compris, partagés
au prorata au moment de la séparation. Deux qui montent l'avant-poste pendant que
deux autres lèvent la carte à l'autre bout, c'est deux tranches de temps de jeu au
lieu d'une. Le prix est réel : un groupe détaché mange sur ses propres réserves,
se bat avec ses propres bras, et peut être anéanti sans que ce soit la fin de la
partie. Coordonner plus de deux groupes suppose une antenne à l'avant-poste.

**Les tâches.** Dans un groupe, chacun peut recevoir sa propre tâche, qui prime
sur l'ordre collectif : deux ferraillent, le troisième chasse, et les trois
récoltes se résolvent séparément. En marche, tout le monde marche — on ne
s'entraîne pas en colonne — et les tâches personnelles reprennent à l'arrivée.

**Ce que vous savez.** La carte est un carnet de relevés, pas un satellite. Là
où vous avez quelqu'un, vous voyez en temps réel ; partout ailleurs vous lisez
le dernier relevé, avec sa date. Une ville quittée il y a trois mois affiche la
population, les stocks et le drapeau d'il y a trois mois — et elle a peut-être
changé de mains depuis. Une ville aperçue de loin mais jamais visitée ne livre
rien du tout. Poster quelqu'un quelque part rétablit le renseignement : c'est ce
qui donne son prix à un détachement, et l'optique porte le regard d'une case par
niveau. Servir une faction, c'est recevoir ses rapports : à partir d'Agent, ses
villes ne sont plus jamais une surprise.

**Les nouvelles voyagent.** La chronique du monde n'est pas un fil d'actualité :
c'est ce qui vous est parvenu. Une guerre se proclame et se sait en une
demi-journée ; une ville qui tombe met deux jours, une ville qui grossit cinq.
Ce dont vous avez été témoin est immédiat et sûr ; le reste est donné pour ce
qu'il est, un rapport. Le trésor d'une faction et les colonnes en campagne
restent invisibles tant qu'on n'a pas cherché la Cryptographie.

**Le métier forme au métier.** Fouiller monte l'ingénierie, extraire la force,
chasser le tir, explorer la furtivité, marcher l'endurance, soigner la médecine,
négocier le commerce. Une saison de travail à plein temps fait passer de 10 à 20
dans la compétence exercée, trois ou quatre saisons mènent à 30. C'est la voie
normale : elle produit en même temps qu'elle forme.

**L'exercice ne concerne que le corps et les armes.** Force, endurance, mêlée,
tir : ce qui se répète à vide. On ne s'exerce pas à l'ingénierie, à la médecine,
au commerce ou à la furtivité — ces métiers-là s'apprennent en démontant, en
soignant, en négociant, en se déplaçant sans se faire voir, et le jeu le dit au
lieu de rabattre silencieusement le choix sur la mêlée. L'exercice va deux fois
plus vite que le terrain, coûte des rations et ne rapporte rien d'autre ; il sert
surtout aux compétences de combat, qu'on ne peut sinon travailler qu'en risquant
sa peau. Le meilleur du groupe fait l'instructeur — plus l'écart est grand, plus
l'élève monte vite —, ce qui donne un rôle au vétéran qu'on a mis longtemps à
former. Un membre peut s'y mettre seul pendant que les autres travaillent.

**Les diplômes.** Certaines villes tiennent une école, selon qui les tient et ce
qu'elles pèsent : les corpos forment à la mécanique et au négoce, les militaires
au tir et à la lame, les communes à la médecine et à la marche, les criminels à
ce qui ne délivre rien d'écrit. Un diplôme pose un plancher de compétence — on
n'en sort pas de zéro — et surtout fait apprendre **plus vite pour le reste de la
partie** : c'est ce qui distingue durablement un médic formé d'un ferrailleur
qu'on a mis à recoudre. Le prix n'est pas que l'argent : l'élève reste en ville
plusieurs semaines, ne travaille plus, ne se bat plus, ne porte plus rien, et sa
formation ne progresse que tant qu'il est sur place. D'où l'intérêt de l'y
laisser en groupe d'une personne pendant que les autres continuent. Un
professionnel chevronné qu'on recrute porte souvent déjà le sien.

**Transmettre chez soi.** Avec une antenne à l'avant-poste, ce que les vôtres
savent, ils peuvent l'apprendre aux autres : un diplômé — ou simplement quelqu'un
qui en sait bien plus que le cours — forme un camarade sans qu'on paie une ville.
C'est plus lent qu'une vraie école, ça ne coûte pas un crédit, ça se nourrit sur
l'entrepôt, et ça immobilise **deux** personnes au lieu d'une : l'élève et le
maître. Un groupe amputé de deux bras se fait bousculer, et une défaite qui le
dépose ailleurs interrompt le cours — le harnais le vérifie. C'est le débouché du
vétéran qu'on a mis six cents heures à former, et une raison de rentrer.

**La route.** Marcher n'est pas du temps mort : on glane le long du chemin, à
un peu plus de la moitié de ce que rapporterait une vraie fouille. Sans ça, un
quart du temps de jeu ne produisait rien et toute la carte coûtait plus qu'elle
ne rapportait. À l'inverse, un secteur se ratisse jusqu'à l'os : rester campé au
même endroit finit par ne plus rien donner, et il faut lever le camp.

**Perdre n'est pas une spirale.** Une défaite coûte le sac, une partie des
crédits, parfois une pièce d'équipement — mais jamais les derniers vivres. Se
faire rafler jusqu'à la dernière ration enclenchait un cycle sans issue : battu,
donc affamé, donc incapable de se poser pour récupérer, donc battu de nouveau.
Il reste toujours de quoi souffler.

**L'escouade.** Chaque membre a huit compétences qui montent en s'exerçant, six
zones de corps blessables séparément, un à quatre traits de caractère qui le
distinguent (Costaud, Ombre, Gouffre, Hémophile…), de la faim, de la fatigue, du
moral et du sang à perdre. Le groupe a sa propre cohésion, qui monte au repos et
s'effondre quand les vôtres tombent, et qui tire le moral de chacun. Ceux qui
survivent finissent par gagner un surnom ; ceux qui tombent entrent au mémorial. Un membre à zéro peut être perdu — et remplacé par une
greffe si vous avez cherché la Cybernétique. On tombe K.O. avant de mourir :
perdre un combat, c'est se réveiller plus loin, dépouillé, pas game over.

**Les contrats.** Chaque ville tient un panneau d'affichage qui se renouvelle :
collecte, livraison d'un colis à l'autre bout de la carte, prime sur une bande,
reconnaissance d'un secteur. Tout se valide tout seul, y compris hors ligne, et
une échéance manquée coûte de la réputation. Accepter une prime fait sortir sa
cible du bois : le monde répond à ce que vous signez.

**Les étals.** Vingt-deux pièces d'équipement, achetables chez l'armurier de
chaque ville selon le style de sa faction et sa taille. Le stock se renouvelle.

**Les sites.** Vingt-deux points d'intérêt semés sur la carte — ruines, convois
éventrés, bunkers scellés, charniers. On les repère en explorant, on les fouille
une fois, et certains sont gardés.

**L'avant-poste.** À bâtir où vous voulez hors des villes. Dix bâtiments à
niveaux, contrainte d'énergie, chaînes de transformation (biomasse → rations,
minerai → alliage → composants), entrepôt plafonné, dix recherches, et des raids
à encaisser quand vous n'êtes pas là.

**L'allégeance.** On peut entrer au service d'une faction, à partir de 20 de
réputation. Cinq grades, gagnés en honorant ses contrats et ses ordres de
mission : remise chez elle, solde quotidienne, passage libre à ses barrages,
accès à ce que ses armuriers gardent derrière le comptoir, et des renforts qui
accourent sur ses terres. Elle vous donne en retour des ordres — ravitailler une
ville en peine, frapper un ennemi déclaré, reconnaître un secteur — qu'on ne
laisse pas expirer sans que cela se sache.

**Les gens de l'avant-poste.** Des habitants finissent par s'y installer si on
peut les loger et les nourrir. Ils font tourner les chaînes, accélèrent les
chantiers, prennent les armes quand un raid arrive — et mangent.

**Les liens.** Chaque membre d'escouade entretient une relation chiffrée avec
chacun des autres, qui tend vers une camaraderie ordinaire, monte quand on sort
vivants du même combat, et descend entre caractères incompatibles. Le moral de
chacun suit ce que valent ses liens, pas seulement la cohésion du groupe.

**La réputation.** Elle s'émousse avec le temps — les rancunes ne sont pas
éternelles. Mais tomber trop bas met une prime sur votre tête, et une faction
qui vous déteste finit par payer des gens pour vous trouver. Perdre contre eux
solde l'affaire : il existe toujours une sortie. L'oubli est asymétrique — une
rancune s'efface quatre fois plus vite qu'un service rendu.

**La pluralité du monde.** Une faction ne peut pas être rayée de la carte : sa
dernière ville ne se prend pas, ne s'abandonne pas, ne fait pas sécession. À
l'autre bout, tenir trop de villes trop loin de sa capitale les rend
ingouvernables, une ville occupée assez longtemps se soulève et rentre chez elle
— quitte à ressusciter une faction —, et tout le monde se ligue doucement contre
le premier. Après un an de jeu, les six factions sont encore debout.

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
    allegeance.js     service d'une faction, grades, ordres de mission
    climat.js         saisons, météo, effets combinés
    caravanes.js      routes marchandes, embuscades
    groupes.js        groupes, tâches individuelles, scission et fusion
    connaissance.js   ce que le joueur sait, relevés datés, délai des nouvelles
    formation.js      écoles des villes, transmission maison, diplômes
    sim.js            orchestration, rattrapage hors ligne
    save.js           sérialisation
    ui.js             rendu DOM + carte pixel sur canvas
    main.js           amorçage et horloge réelle
    contrats.js       panneaux d'affichage, suivi, validation
  test/
    headless.js       tests du moteur
    equilibre.js      banc d'équilibrage avec bot joueur
    navigateur.js     test de bout en bout dans un Chromium réel
    serve.js          serveur statique
  tools/
    bundle.js         assemble dist/cendres.html, fichier unique autonome
    icone.js          génère icone-180.png (encodeur PNG maison)
  dist/
    cendres.html      le jeu entier en un fichier (généré)
```

Deux règles tiennent l'ensemble :

Un troisième invariant s'est ajouté avec les groupes : **un personnage appartient
à exactement un groupe**, et n'existe nulle part ailleurs. Il n'y a donc aucune
liste à tenir synchronisée, aucun identifiant à résoudre dans la boucle de
simulation, et l'état reste sérialisable tel quel. Le harnais le vérifie à
chaque contrôle de cohérence.

1. **Le moteur ne touche jamais au DOM.** Seuls `ui.js` et `main.js` connaissent
   le navigateur. Tout le reste tourne sous Node — c'est ce qui permet de tester
   4 000 heures de simulation en 30 ms.
2. **L'état est du JSON pur.** Pas de classes, pas de références circulaires,
   pas de fonctions. Le RNG est sérialisé avec le reste : recharger une partie
   la reprend exactement où elle en était, et deux parties lancées sur la même
   graine sont identiques au caractère près.

Ces deux règles ne se négocient pas contre de la vitesse : l'état lisible à la
main est ce qui permet de tester, de déboguer et, un jour, de faire tourner le
monde côté serveur. Le coût du tick se réduit par la structure, pas par le format
— les colonies, par exemple, avancent par tourniquet (chacune trois heures d'un
coup, un tiers d'entre elles par heure), ce qui divise par deux le coût du tick
sans que rien ne se voie en jeu et sans toucher à une seule structure de données.

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
