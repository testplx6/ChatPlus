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
npm test                     # 211 assertions sur le moteur, sans navigateur
node test/equilibre.js       # banc d'équilibrage : un bot joue 30 parties
node test/equilibre.js 4000 60   # échantillon large, une vingtaine de secondes
SANS=detach,contrats node test/equilibre.js   # coupe un système pour l'isoler
VAGABOND=1 node test/equilibre.js             # témoin : voyager sans contrats

npm install --no-save playwright-core
node test/navigateur.js      # 82 vérifications dans un Chromium réel
```

Le harnais couvre la génération du monde, le déterminisme, la sauvegarde, la
cohérence de l'état sur 8 000 heures simulées, l'économie, les ordres,
l'avant-poste, le combat, le rattrapage hors ligne, la vitalité du monde sur la
durée (villes fondées, villes effondrées, population qui ne s'écroule pas) et
les cas limites (escouade décimée, famine, sac plein).

Il tient aussi un **budget de performance** : le coût d'un tick est mesuré, puis
rapporté à la vitesse de la machine par un étalon (le même travail fixe partout).
Un plafond en microsecondes sèches serait soit trop lâche pour attraper une
régression, soit capricieux d'une machine à l'autre. Le plafond monte quand la
simulation gagne du travail — jamais quand elle se dégrade —, et le fichier de
test dit à chaque fois ce que la hausse a payé : 60 µs au départ, 65 avec les
groupes et la connaissance imparfaite, 88 avec les métiers des villes et leurs
notables, 94 avec les demandes personnelles de ces notables, 114 avec la carte
de 24×18 et ses 86 villes, 116 avec les cantiniers et les ouvriers. Le plafond
lui-même est passé de 130 à 145 pour une raison qui n'a rien à voir avec le
code : à 130 le test échouait une fois sur trois sur une machine chargée, et un
garde-fou qui crie sans motif est pire qu'un garde-fou absent. Sans cette trace, relever le budget deviendrait un moyen commode de ne
jamais voir une régression.

### Trois voies, trois façons de tenir

Mesure à quarante-huit parties par bras, même code, même bot calibré, seule
change la façon de jouer :

                        nomade      colon    carriériste
    survivants           43/48      39/48        33/48
    crédits en fin        692        173        3 308
    ventes             +6 249     +2 201       +4 033
    nourriture         −4 232     −1 894       −4 155
    pillé en défaite     −825       −402       −2 049

Trois métiers, pas trois difficultés. Le **nomade** brasse : il vend deux fois
plus que les autres, s'équipe bien, évite ce qu'il peut, et survit le mieux pour
un patrimoine modeste. Le **colon** touche le marché trois fois moins, mange ce
qu'il ramasse, ne se fait presque pas dépouiller — il finit pauvre parce qu'il
n'a besoin de rien. Le **carriériste** finit cinq fois plus riche que le nomade
et paie ça en sang : ses ordres l'envoient chercher l'ennemi, et il perd deux
fois et demie plus au combat.

Dix points de survie séparent le meilleur du pire. C'est un écart réel, pas une
domination : on choisit entre vivre vieux et vivre gros.

**Ces chiffres remplacent tous ceux qui les précédaient.** Les mesures faites
avant le calibrage du bot (voir plus bas) donnaient 28/48 partout et concluaient
à l'égalité — elles portaient sur une escouade qui ne s'armait pas.

Trois verrous ont dû sauter pour en arriver là, et ils se ressemblaient tous :

1. **Le coût de fondation contenait cinq composants.** Les composants ne se
   ramassent presque nulle part : il fallait les acheter, donc avoir des
   crédits, donc en gagner — alors que les trois quarts des recettes partent en
   nourriture et que la seule façon d'en produire est justement d'avoir un camp.
   Le campement se paie désormais en ferraille seule.
2. **L'hydroponie ne tournait pas sans courant.** Il fallait donc un générateur,
   donc du carburant acheté en ville. Faire pousser et ramasser se font avec des
   bras : hydroponie et halle produisent maintenant sans énergie, à 40 % du
   régime. L'énergie les rend rapides, elle ne les rend plus possibles.
3. **La halle demandait des composants.** C'est elle qui remplit les bacs de
   l'hydroponie. Le banc a montré le camp mourir de faim avec ses bacs vides :
   population 10 à mille cinq cents heures, zéro à trois mille. Elle nourrit,
   elle ne développe pas — plus de composants dedans.

La règle qui en sort, et qui vaut pour tout ce qu'on ajoutera : **ce qui garde
la survie doit se ramasser ; ce qui garde le développement peut s'acheter.**
Le polymère et les composants gardent maintenant l'atelier, l'antenne,
l'infirmerie — pas le droit de manger.

Un camp rend d'ailleurs quelque chose dès le premier piquet, avant toute
construction : c'est un toit (on y récupère 70 % plus vite qu'en dormant dans le
sable, et on y recoud mieux) et un dépôt (huit cents unités de stock sans le
moindre entrepôt). Sans ça, s'installer revenait à creuser un trou et à y
cacher des matériaux pendant des semaines sans contrepartie.

### La troisième voie : entrer au service

Servir une faction était, sur le papier, la troisième façon de vivre. En
pratique elle n'existait pas : il fallait vingt de réputation pour être
seulement reçu, c'est-à-dire deux ou trois contrats honorés pour la même
faction — et remplir un contrat est l'une des choses les plus dures du jeu sur
une grande carte. Le banc, sur quarante-huit parties, comptait **zéro à deux
engagements**.

Le seuil est passé à dix. On démarre à douze auprès de la faction qui vous
accueille : s'engager chez elle est donc une décision d'ouverture et non une
récompense de milieu de partie, tandis que les autres demandent qu'on se soit
fait un nom. Ce qui se mérite, ce sont les grades — et là rien n'a bougé. Le
premier grade défraie désormais dix crédits par jour : servir ne doit pas
coûter de l'argent.

Résultat : **48 engagements sur 48 parties**.

Ouvrir la porte ne suffisait pas : quarante-quatre escouades sur quarante-huit
restaient au premier grade, et deux seulement atteignaient le second. La raison
était dans le code — **un ordre manqué coûtait 80 % de ses points et 8 de
réputation**. On avançait de trois pas et on en reculait de deux, donc les
points ne s'accumulaient jamais. Même forme que les deux autres voies : elle
punissait celui qui la tentait.

Trois choses ont changé, et elles disent ensemble ce qu'être au service veut
dire — *vous ne décidez plus quoi faire, on vous le dit, et en échange on vous
entretient* :

- **On nourrit ses soldats.** Chaque grade donne droit à un quota quotidien de
  rations, qu'on touche à l'intendance d'une ville des siens. C'est là que la
  voie devient économiquement distincte des deux autres : le colon produit ses
  vivres, le nomade les achète, l'engagé les touche. Deux garde-fous : il faut
  passer les prendre — cinq jours d'arriéré au maximum, une escouade partie dix
  jours sur les routes en perd la moitié — et c'est la faction qui paie sur son
  trésor, pas le grenier du village. Une intendance n'est pas une réquisition,
  et de toute façon les villes ne gardent presque aucune réserve : vingt-quatre
  sur quatre-vingt-deux en avaient une, mesuré à deux mille heures.
- **Rater est neutre, réussir paie.** Un ordre manqué ne retire plus les points
  acquis ; ce qu'on y perd, c'est l'estime — trois points de réputation — et si
  elle tombe sous le seuil d'entrée, l'intendance se ferme.
- **La garnison.** À partir de Lieutenant, les villes de votre faction vous
  logent : on y dort à l'abri et on y est soigné, ce que coûteraient sinon un
  baraquement et une infirmerie. C'est ce qui relie la troisième voie à la
  deuxième au lieu de les opposer — le colon se bâtit une maison, l'engagé se
  la fait prêter.

Restait un quatrième verrou, et c'était le plus gros : **les ordres de mission
étaient écrits pour la carte de 10×8.** Une reconnaissance tirait un secteur au
hasard parmi quatre cent trente-deux et laissait deux cents heures pour y être ;
un ravitaillement visait la ville la plus en peine de la faction, où qu'elle
fût. Le délai, lui, ne dépendait pas de la distance. Un ordre et demi honoré par
partie sur une vingtaine reçus — et comme les points de service ne viennent que
de là, personne ne dépassait le premier grade.

Les ordres se donnent maintenant à portée — un secteur à moins de huit, une
ville pondérée par sa distance — et leur délai suit le trajet.

Les grades, sur quarante-huit parties :

    à l'origine          44 Affilié ·  2 Agent ·  0 Lieutenant ·  0 Capitaine
    après l'intendance   32 Affilié · 11 Agent ·  3 Lieutenant ·  2 Capitaine
    après la portée       9 Affilié · 18 Agent · 15 Lieutenant ·  6 Capitaine

Ordres honorés : 72 puis 161 sur quarante-huit parties. Trente-neuf escouades
sur quarante-huit dépassent désormais le premier grade, contre deux.

### Ce qui reste : le bot ne sait pas encore s'installer tout seul

Le chiffre ci-dessus est obtenu en *donnant* le camp au bot (`CAMP=1`). Livré à
lui-même il n'en fonde que sept sur quarante-huit, et c'est une limite du bot
autant que du jeu : il vend tout au premier étal venu, voyage mal, perd beaucoup
de combats. Un humain qui *vise* un camp y arrive bien plus vite. La question
« l'avant-poste est-il atteignable ? » reste donc ouverte ; la question
« l'avant-poste vaut-il le coup ? » est tranchée, et la réponse est oui.

Trois bugs de bot ont été corrigés en route, et chacun expliquait à lui seul un
camp mort-né : le bot ne rentrait jamais chez lui (garde-fou de distance calé
sur l'ancienne carte), il ne rentrait qu'avec un sac plein de matériaux alors
que son sac est plein de vivres, et il continuait à vagabonder à quinze secteurs
de sa maison. Sur une trace, le camp avait reçu vingt-neuf ferrailles en quatre
mille heures.

### Ce que la grande carte a coûté

Le banc tient les comptes du joueur depuis peu, et ils sont sans appel. Par
partie de 4 000 heures, sur la carte de 24×18 :

    +3 165 cr de ventes
    −2 305 cr de vivres      (73 % du brut)
    −  295 cr de soins
    −1 409 cr pillés en défaite

Le solde est négatif. Sur l'ancienne carte le bot finissait à 2 041 crédits ;
il finit maintenant autour de 500. La cause est mesurée et tient en une ligne :
le temps de travail est passé de 63 % à 40 %, la marche de 26 à 39 %, le repos
de 13 à 21 % — et la récolte suit exactement cette proportion (912 unités
contre 1 450, soit 0,63, soit précisément le rapport des temps de travail).

Trois hypothèses ont été testées et écartées :

- **le coût de traversée** — le diviser par deux ne fait passer la marche que
  de 39 à 35 %, et le revenu ne bouge pas ;
- **la densité des villes** — déjà rétablie à une pour cinq secteurs, et c'est
  ce qui a ramené la survie de 13 à 21 sur trente ;
- **le coût de fondation de l'avant-poste** — le diviser par quatre ne fait
  passer les fondations que de 0 à 3 sur vingt-quatre parties.

Ce qui reste n'est pas un réglage mais une décision de conception, traitée
juste au-dessus : le nomadisme est une voie viable, l'avant-poste n'en est pas
encore une.

### Servir par colonne, et peser au conseil

L'engagement appartenait au joueur : `state.player.allegeance`, un seul pour
toute la partie. Les trois voies s'excluaient donc mécaniquement — on ne pouvait
pas envoyer une colonne servir les Corpos pendant qu'une autre bâtit un camp et
qu'une troisième court les pistes. C'est pourtant exactement ainsi qu'une
compagnie de mercenaires travaille.

**L'engagement appartient désormais à la colonne qui l'a signé.** Chacune a son
grade, ses ordres, son intendance, sa garnison. La réputation, elle, reste au
joueur : une faction sait qui vous êtes, pas quelle colonne se tient devant
elle. Une seule interdiction, et elle se justifie : on ne sert pas deux camps en
guerre l'un contre l'autre, même avec deux colonnes différentes — ça se sait.

Et puisqu'on monte en grade, monter doit finir par vouloir dire quelque chose.

### Un grade n'est pas une voix, c'est une charge

La première version de la politique était une aberration, et elle a été jetée.
Le gradé « portait une requête », un dé décidait s'il était écouté, et
**demander coûtait du capital politique qu'on ait été écouté ou non**. Deux
erreurs dans la même ligne de code. Un Commandeur n'implore pas son propre
conseil — il commande. Et faire payer une décision refusée, c'est punir le
joueur pour avoir cliqué.

Ce qui remplace : **un grade est une charge**. Elle donne des prérogatives qu'on
exerce directement — sans dé, sans coût, immédiatement, parce que c'est
précisément ce que veut dire avoir de l'autorité :

    Agent        ravitaille les siens, et rien d'autre
    Lieutenant   dispose des colonnes déjà levées : il les envoie où il veut
    Capitaine    lève des colonnes sur le trésor, fait fonder des postes
    Commandeur   déclare la guerre et signe la paix

Ce qui borne le pouvoir, ce n'est pas le hasard : c'est l'étendue de la charge,
et le fait qu'on en répond. Chaque ordre s'inscrit au dossier, et **son issue
est jugée quand elle est connue, pas au moment de décider**. Une colonne qu'on a
envoyée se faire détruire est une faute ; la ville qu'elle prend est un mérite
qui vaut cent vingt points de service. Un poste fondé qui tient huit cents
heures compte pour vous ; le même effondré compte contre vous. Une guerre
déclarée se solde à la paix, sur la balance des villes.

Les fautes rongent le **crédit** — cent points par colonne engagée, plus le
service acquis, moins vingt-cinq par faute — et le crédit épuisé, on est
rétrogradé d'un grade, l'ardoise remise à zéro. Le pouvoir n'est pas gratuit ;
il est simplement réel, ce qui n'est pas la même chose.

**Ce que le banc dit de cette échelle, et qui n'est pas flatteur.** Quarante-huit
parties de quatre mille heures, avec un bot qui exerce ses prérogatives dès
qu'il en a le droit :

    Échelle atteinte   Affilié 15 · Agent 20 · Lieutenant 10 · Capitaine 1 · Commandeur 1
    Carrière           3 662 h sous les couleurs · 452 points en fin de service
    Prérogatives       1,6 exercée par partie

Trois mille six cents heures au service de quelqu'un pour mourir Lieutenant.
Le diagnostic est net : sur six cent une occasions où un Lieutenant pouvait
exercer sa seule prérogative, **cinq cent treize fois sa faction n'avait aucune
colonne sur les routes**, et quatre cent soixante-huit fois elle n'était en
guerre avec personne. La charge de Lieutenant est vide neuf fois sur dix — elle
ne s'exerce que si la faction fait la guerre, ce qu'elle décide sans lui.

C'est un vrai trou de conception, et il est rebouché à la section suivante.

### Ce dont on répond tous les jours

Une charge, ce n'est pas un droit qu'on exerce quand l'occasion se présente :
c'est une chose dont on répond en permanence, qu'il se passe quelque chose ou
non. **Passer Lieutenant vous vaut un secteur** — treize cases autour d'une
ville des vôtres — et personne ne vous dit comment le tenir. On relève l'état
des routes tous les dix jours, et on le note.

L'insécurité n'est pas une statistique décorative : elle multiplie les mauvaises
rencontres pour tout le monde, joueur compris. Patrouiller la fait tomber vite,
travailler sur place à peine, être ailleurs pas du tout.

Deux calibrages ont été **réfutés par le banc avant d'atteindre le joueur**, et
c'est exactement à ça que sert l'instrument :

**Une dérive sans plafond n'est pas une simulation, c'est un compte à rebours.**
Premier essai : l'insécurité montait à taux constant partout. Au bout de six
cents heures, tout ce qui n'était pas collé à une ville saturait à
« infréquentable ». Les secteurs affichaient 0,79 de moyenne, les défaites
passaient de 266 à 474, les avant-postes fondés de 35 à 28, et le carriériste
perdait sa charge pour une faute qu'aucun effort ne pouvait éviter. Chaque case
a désormais un **niveau de repos** — fonction de son éloignement de toute ville
et du désordre de la ville la plus proche — vers lequel elle tend. Une piste
éloignée est mauvaise en permanence ; elle n'est pas condamnée.

**Rendre le monde plus dangereux n'est pas la même chose que rendre un secteur
mal tenu plus dangereux que les autres.** Second essai : la menace valait
`1 + insécurité × 1,4`, donc ×1,57 sur la carte entière. Elle se lit maintenant
en écart à la normale : un secteur tenu est **plus sûr que la moyenne** (×0,7 au
mieux), un secteur pourri l'est moins (×1,9 au pire). Le joueur sent la
récompense avant de lire le chiffre.

Ce que ça donne, sur quarante-huit parties de quatre mille heures :

                          avant secteurs   après
    Survivantes                  40/48     42/48
    Avant-postes fondés          35/48     38/48
    Crédits moyens               1 324     2 006
    Défaites                       266       265
    Points en fin de service       452       557
    Capitaine · Commandeur       1 · 1     4 · 3

Le carriériste existe enfin comme voie jouable, et il ne coûte rien aux deux
autres — il les sert, même : des pistes tenues, ce sont des convois qui
arrivent.

### Ce qu'on fait des gens qu'on n'a pas tués

Le combat produisait déjà des mises hors de combat : la moitié des pillards
d'une bande finissent à terre, vivants. Ils disparaissaient ensuite du modèle
sans qu'on y pense. C'est une perte sèche, parce que c'est précisément là que le
jeu touche à la société — un homme à terre pose une question qu'aucun butin ne
pose.

**Cinq réponses, et chacune coûte quelque chose.**

    Livrer     à la justice de la ville. Prime, et une piste plus sûre.
    Rançonner  aux siens, s'ils sont de quelqu'un et qu'on n'est pas en guerre.
    Vendre     là où la loi le permet. C'est le plus rentable, et ça se sait.
    Enrôler    quelqu'un qui n'a pas choisi de vous suivre — il arrive à 25 de moral.
    Relâcher   pour rien, ce qui n'est jamais tout à fait pour rien.

Rien ne limite le nombre de prisonniers, comme rien ne limite les bêtes ou
l'effectif : il faut des bras pour les garder (un bras et demi par prisonnier),
ils mangent sur le sac, ils ralentissent la colonne, et **ceux que personne ne
surveille finissent par s'en aller**. Vendre un homme se retient auprès des
siens (−14 de réputation) *et* auprès de toutes les factions qui l'ont interdit
chez elles — ce qui donne son poids à la loi d'en face.

Livré, il entre dans la geôle de la ville. Une geôle nourrit ses détenus sur le
grenier, gronde quand elle déborde, et **tient les routes tant qu'elle tient**
— chaque détenu est quelqu'un qui ne détrousse plus personne, et l'insécurité
du secteur le sent. C'est ce qui relie la justice à la carrière : livrer un
brigand à la faction qu'on sert est du service rendu.

### La ville et la loi

Le Capitaine répond de la ville au centre de son secteur : il en relève les murs
et en ouvre les greniers sur le trésor de la faction. Le Commandeur, lui, fixe
la loi — pour tout le pays, d'un trait de plume, comme le reste :

- **la peine** — clémente, ferme ou expéditive. L'expéditive paie mieux les
  chasseurs de primes et vide les geôles vite ; la clémente les garde vides
  autrement ;
- **l'esclavage** — autorisé ou non. Autoriser fait grimper la grogne des villes
  de 6 points d'un coup, et ouvre un marché qui paie deux fois la justice ;
- **l'impôt** — de 3 à 15 %. Il décide de ce que le trésor pourra payer, donc de
  ce qu'un officier pourra ordonner. Au-delà de l'ordinaire il fait gronder, et
  **en cube** : doubler le taux fait bien plus que doubler la grogne.

Une loi se juge comme tout le reste : huit cents heures plus tard, sur ce
qu'elle a fait au pays. Un pays calme est porté à votre crédit, un pays qui
gronde à votre charge.

Sur quarante-huit parties de quatre mille heures : **huit prisonniers pris,
sept livrés ou rançonnés pour 767 crédits**, et les crédits moyens passent de
2 006 à 2 530. Le bot ne vend personne — c'est un choix de jeu, pas une
optimisation, et le banc doit mesurer la voie honnête avant l'autre.

### Des conseils qui votent leurs propres lois

Le trou signalé plus haut est bouché. Un tempérament ne dit plus seulement
comment on fait la guerre : il dit aussi ce qu'on prélève (`fisc`), ce qu'on
punit (`severite`) et ce qui retient d'ouvrir un marché d'hommes (`humain`).
**Un Rapace à la tête des Corpos prélève comme un rapace**, un Conciliateur
relâche, et le joueur peut le lire sur l'écran du monde avant de choisir qui
servir.

Une exception, et c'est tout le sens du grade : **tant que le joueur tient la
charge de Commandeur, le conseil s'efface.** Il ne repasse derrière lui que le
jour où il l'a perdue — ce qui arrive précisément quand ses lois ont ruiné le
pays. Et une loi tient sept cents heures avant qu'on puisse la rouvrir : un
conseil qui légiférerait à chaque séance ne serait pas un gouvernement, ce
serait du bruit.

**Deux boucles mal fermées, réfutées l'une après l'autre par le même A/B.** Le
banc tourne soixante parties avec les conseils législateurs et soixante sans,
mêmes graines.

*Premier essai — la spirale vers le haut.* Caisse vide et guerre ajoutaient
chacune un demi-palier d'impôt, sans rien pour les contredire. L'impôt lourd
faisait gronder, la grogne coupait les recettes, la caisse restait vide. 55 %
des conseils à l'ordinaire, 31 % au lourd, et le joueur perdait **six escouades
et huit avant-postes sur soixante**.

*Second essai — la spirale vers le bas.* Deux freins en escalier qui se
déclenchaient dès 32 % de grogne ont mis **74 % des conseils à l'impôt léger**,
et le joueur y a perdu tout autant. Des factions pauvres lèvent moins de
colonnes : elles tiennent moins les routes, et donnent moins d'ordres de
mission. C'est le résultat intéressant de la journée — **les deux extrêmes
coûtent, chacun à sa façon**, ce qui veut dire que le taux ordinaire était bien
choisi et que le choix de qui l'on sert compte vraiment.

*Ce qui tient.* Le caractère du chef décide de la ligne, les circonstances la
corrigent à la marge, et le frein de la grogne est continu au lieu de basculer
tout le monde du même côté :

                          sans conseils   avec conseils
    Survivantes                  51/60           51/60
    Avant-postes fondés          48/60           44/60
    Crédits moyens               2 282           2 378
    État des secteurs             0,35            0,32
    Capitaine                        6               9
    Impôt                  Ordinaire 100 %   Lourd 45 · Ordinaire 38 · Léger 14 · Confiscatoire 3
    Justice                    Ferme 100 %   Ferme 53 · Expéditive 38 · Clémente 9

### Révoltes et renversements

Une ville qui gronde à quatre-vingts pour cent n'avait aucune issue. Elle
mijotait, indéfiniment : l'impôt confiscatoire et la justice expéditive ne
coûtaient rien de plus qu'un chiffre qui montait. Le contre-pouvoir n'existait
que pour les villes *occupées* — une sécession qui les rendait à leur maison
d'origine — et pas du tout pour une ville maltraitée par ses propres maîtres.

**La révolte, et c'est la garnison qui décide, pas un dé.** On compare la foule
— la population, multipliée par sa colère — aux murs et aux hommes qui les
tiennent. Une place tenue mate son émeute, au prix de morts, de murs ébréchés et
d'une garnison réduite de moitié : la suivante sera plus difficile à contenir.
Une garnison fondue par la guerre ne contient rien du tout. Le joueur qui a fait
relever les murs de sa ville en Capitaine récolte le bénéfice exactement là où
il l'attendait.

Quand la foule l'emporte, une ville prise de force à quelqu'un rentre chez elle,
et une ville qui n'a jamais connu que ses maîtres **devient libre — c'est-à-dire
sans loi**. Plus de drapeau sur la carte, plus de prime pour un brigand livré,
plus d'intendance, et l'on y vend ce qu'on veut. Ce n'est pas une récompense,
c'est un état du monde. Dans tous les cas la geôle se vide : c'est la première
porte qu'on enfonce.

**Et le chef répond de l'humeur de son pays.** Au-delà de 40 % de grogne moyenne
sa légitimité descend au lieu de monter, et à bout de course son propre conseil
le renverse. Le successeur n'est alors pas tiré dans le même vivier selon ce
qu'on reproche au sortant : après un chef qui a fait gronder le pays la maison
cherche une main plus douce, après un chef qui a perdu des villes elle en
cherche une plus dure. C'est ce qui fait qu'une faction **oscille au lieu de
dériver toujours dans le même sens**.

*Deux calibrages, toujours par mesure.* Réglée à 0,78 sans délai de carence,
l'émeute remplissait **cent vingt lignes du journal sur quatre cents** — dans ce
monde, la grogne moyenne est de 0,55 et une trentaine de villes campent en
permanence au-dessus de 0,78. Une révolte qu'on lit trois fois par jour n'est
plus un événement. Seuil à 0,86, carence de neuf cents heures, et une émeute
matée loin de vous ne vous est même pas rapportée — c'est un fait divers local,
pas une nouvelle, même règle que pour tout le reste de la carte. Et la foule
était comptée à 0,045 par tête : onze hommes pour trois cents habitants
furieux, contre soixante-quinze de garnison. Le peuple ne gagnait jamais.

*La boucle se referme aussi côté conseils* : une révolte réussie laisse un bourg
sans drapeau, et un conseil qui voit une place vacante à trois jours de marche y
envoie du monde — en temps de paix seulement, et sans empressement. À 0,55 de
chance par séance, plus une seule ville ne restait libre en fin de partie et
l'état le plus intéressant du monde ne durait jamais assez pour qu'on aille y
voir. À 0,16, il en reste une de temps en temps.

Ce que ça donne, sur soixante parties de quatre mille heures — et c'est le
meilleur chiffre de survie de tout le projet :

                              avant      après
    Survivantes               51/60      55/60
    Avant-postes fondés       48/60      47/60
    Grogne moyenne             0,72       0,53
    Villes affranchies            —        0,5
    Révoltes au journal           —        3,4
    Renversements                 —        2,4

La grogne moyenne des villes passe de 0,72 à 0,53 sur l'ensemble de ce travail
politique, et **c'est de là que viennent les quatre escouades survivantes de
plus** : des villes moins furieuses sont mieux approvisionnées, donc leurs
marchés nourrissent le joueur pour moins cher. Le tick descend au passage de 116
à 91 µs — un monde calme coûte moins à simuler qu'un monde qui s'effondre.

### Une loi vaut aussi vers l'extérieur

Les lois n'existaient que vers l'intérieur. Autoriser le commerce d'hommes
abîmait la réputation du *joueur* auprès de tous ceux qui l'interdisaient — mais
les factions, elles, s'en moquaient entre elles. Un pays esclavagiste ne se
faisait aucun ennemi, et un voisin clément n'y voyait aucun motif, alors que
c'est le casus belli le plus évident qu'un monde puisse produire.

Chaque conseil mesure désormais ce que le régime d'en face a d'insupportable :
le commerce d'hommes d'abord et de très loin, l'écart de sévérité ensuite — qui
n'indigne personne mais éloigne. **Le tout pondéré par le chef** : un Rapace
hausse les épaules là où un Conciliateur s'indigne, et l'on ne reproche à
personne ce qu'on pratique soi-même. Petit par séance, décisif sur une saison :
un marchand d'hommes finit à −60 ou −100 avec tout le voisinage.

Ce que ça produit :

- **une cause donne du courage à qui n'en aurait pas eu** — un chef que la
  guerre ne tente pas se décide tout de même contre un régime qu'il réprouve ;
- la guerre le dit dans son objet : *pour en finir avec leurs marchés d'hommes* ;
- et elle **se gagne le jour où ils abolissent**, pas quand on a fini de compter
  les morts. Un conseil rouvre justement ses lois quand le marché lui coûte une
  guerre : sur six mondes où l'on installe un régime esclavagiste entouré de
  conciliateurs, trois ferment leurs marchés sous la pression militaire.

Le joueur voit le prix avant de signer — le bouton dit combien de factions
l'interdisent chez elles — et voit la guerre arriver sur l'écran du monde, où
un régime esclavagiste est signalé avec le nombre de voisins qui ne le
supportent pas.

### Un combat qu'on mène plutôt qu'on subit

Le combat était le plus vieux défaut du projet, et la mesure était accablante.
Quatre cents affrontements de quatre contre trois :

    18,1 tours de moyenne     sur un maximum de 24
    88 % finissent en fuite   personne ne décide, quelqu'un s'en va
    1,46 ennemi à terre        sur trois
    0,00 mort                  des deux côtés, toujours

La dernière ligne n'était pas un équilibrage prudent : c'était **un bug de
structure**. `blesser` n'autorise la mort que sur quelqu'un de déjà au sol, et
l'on ne visait jamais quelqu'un au sol. Personne n'est mort au combat depuis le
début du projet, et la létalité déclarée de chaque faction — 0,55 pour l'Essaim,
0,10 pour une milice de commune — ne servait strictement à rien.

**Ce qui manquait tenait dans une échelle.** Une machette rend une dizaine de
points nets ; un corps en compte deux cent quarante-sept. Vingt-sept coups au
but pour abattre quelqu'un. Toute la platitude venait de là. On mord deux fois
plus fort, on s'écroule vers 40-50 % de dégâts au lieu de 68 %, et un
affrontement se décide en **sept tours**.

**Achever un homme à terre est désormais possible, et c'est une décision.** La
consigne existait ; elle ne faisait rien. Elle fait maintenant la différence
entre repartir avec des prisonniers et repartir avec des cadavres — et elle
donne à l'Essaim la férocité qu'il prétendait avoir. Un des nôtres qui tombe
dans un combat qu'on gagne s'en sort presque toujours ; dans un combat qu'on
perd, presque jamais.

**Cinq tactiques, et chacune est un pari.** Décidées à l'avance, valables aussi
en votre absence — un chef d'escouade décide avant, pas pendant :

    Tenir la ligne     le choix sûr. Peu de pertes, peu de prises.
    Charger            le plus de monde à terre, chez eux comme chez nous.
    Tenir à distance   décisif en terrain découvert avec des fusils.
                       Sans fusils ou dans les cassures : le pire choix du jeu.
    Envelopper         ne vaut que si l'on a le nombre. Sinon on se disperse.
    Harceler           on ne gagne pas, on ramène les siens.

Le jeu annonce ce que chacune vaut *ici* — terrain, armes portées, nombre
supposé — avant qu'on choisisse. Mesuré sur trois cents combats par case :

                       4v3 steppe fusils   4v3 canyons fusils   6v3 steppe mêlée
    Tenir la ligne       1,70 / 0,11         1,72 / 0,10         1,52 / 0,14
    Charger              2,53 / 0,17         1,97 / 0,42         2,16 / 0,17
    Tenir à distance     2,78 / 0,04         2,02 / 0,17         2,04 / 0,07
    Envelopper           2,15 / 0,14         1,51 / 0,40         2,19 / 0,09
                                    (ennemis à terre / pertes)

Trois calibrages ont été **réfutés en mesurant** avant d'être gardés. Charger
gagnait cent pour cent des combats partout, y compris là où la tactique était
censée être mauvaise : le multiplicateur d'attaque jouait deux fois — sur la
touche *et* sur les dégâts — quand la garde ne jouait qu'une. Corrigé, c'est
Tenir la ligne qui dominait à son tour, parce que la garde jouait alors trois
fois. Et le rendement situationnel, réservé à la chance de toucher, ne servait à
rien : à quatre contre trois on touche déjà presque à coup sûr, la probabilité
est plafonnée à 0,94, et **envelopper à deux contre un ne changeait
rigoureusement rien**. C'est sur les dégâts que la situation devait payer.

Enfin, harceler était la tactique du perdant plutôt que celle du faible : on
rompait, donc on perdait, donc on se faisait piller. Se dégager en bon ordre —
tactique de repli et la moitié des siens encore debout — n'est plus une défaite.

Sur soixante parties de quatre mille heures : crédits moyens **2 635 → 3 391**,
prisonniers pris 7,8 → 10,3, livrés ou rançonnés pour 785 → 1 183 crédits,
compétence de combat 15 → 16, survivantes 55 → 53 (dans le bruit), et 8,1 des
nôtres mis à terre par partie — là où le combat n'en couchait presque aucun.

### Des routes qui se font en marchant

Cinquante-deux pour cent du temps de jeu se passait en marche, et sur les
quarante-cinq départs d'une partie, trente étaient de la logistique : rentrer au
camp, chercher à manger, aller vendre. Agrandir le sac ou raccourcir la carte
reviendrait à **retirer le voyage du jeu**. Ce qu'il fallait, c'est que le
voyage s'améliore là où l'on passe.

Chaque case garde ce que les passages y ont tassé. Un convoi lourd marque plus
qu'un homme seul ; les colonnes des factions et les caravanes marquent aussi, et
davantage — le monde n'a pas attendu le joueur pour se donner des chemins, et
les abords des villes sont damés dès le premier jour. Une route rend jusqu'à
**34 % du coût de traversée**, et ce que plus personne n'emprunte s'efface en
un millier d'heures.

Ce n'est pas un raccourci : c'est de la terre tassée par ceux qui sont passés
avant, la vôtre comprise. Un circuit qu'on répète devient une route, ce qui
récompense exactement la voie du colon — un camp, une ville, et le chemin entre
les deux.

    Temps en marche          52 %  →  43 %
    Temps au travail         38 %  →  45 %
    Départs par partie         45  →  38
    Survivantes             53/60  →  57/60

**Ce que ça coûte, mesuré à cent vingt parties par bras.** Deux chiffres ne
bougeaient pas dans le bon sens à soixante parties, et il fallait savoir si
c'était du bruit. Ce n'en était pas :

                          sans pistes   avec pistes
    Survivantes             110/120       113/120
    Temps en marche            49 %          45 %
    Crédits moyens            3 244         2 841
    Avant-postes fondés      95/120        83/120

Moins de marche, plus de survie — et **douze avant-postes de moins sur cent
vingt**, avec 12 % de crédits en moins. La cause n'est pas dans les pistes,
elle est dans ce qu'elles révèlent : **dans ce jeu, marcher est ce qui rend
riche.** Le butin, les rencontres, la ferraille qui paie un avant-poste, tout
vient du temps passé sur les routes. Raccourcir le trajet coupe donc le
robinet — et la voie du colon, qui a le plus besoin de matériaux, est celle qui
en souffre le plus.

On garde les pistes : elles font ce qu'on leur demandait. Mais le couplage est
noté, et c'est lui le vrai défaut — un avant-poste ne devrait pas dépendre de
ce que l'escouade ramasse en chemin pour exister.

### Un camp qui devient un lieu

La voie du colon n'avait pas de haut. On fondait un camp, on le développait, et
il restait un camp : invisible sur la carte du monde, sans marché, sans place
dans la politique, que personne ne convoitait jamais.

Trois défauts empilés, trouvés en descendant la chaîne un chiffre après
l'autre — et c'est cet enchaînement qui vaut d'être raconté, parce que chacun
masquait le suivant.

**Personne ne se mettait au travail.** Un avant-poste de trente-neuf habitants
tournait avec `postes: {}` : personne affecté à rien, jamais, sauf si le joueur
cliquait treize fois. Ce n'est pas une colonie, c'est un tableur. Les habitants
se placent désormais eux-mêmes, dans l'ordre où les métiers comptent — on ne met
personne à la fonderie tant qu'il manque un cultivateur, parce qu'on ne mange
pas de l'alliage. Le joueur garde l'interrupteur.

**La halle était punie de ne pas avoir de courant.** Elle passait par le même
facteur que la fonderie, qui vaut 0,4 sans générateur — soit 0,07 ferraille par
heure pour un camp de moins de mille heures. Or ramasser se fait avec des bras.
Le courant aide encore ; il ne conditionne plus la récolte.

**Et le baraquement n'était jamais bâti.** `populationMax` vaut neuf par
baraquement et quatre par hydroponie : sans lui, le plafond est quatre. Le banc
montrait des camps à trois cent trente-huit rations en réserve et quatre
habitants, indéfiniment. Deux causes : le plan de bâtisse du bot était une liste
plate où le premier bâtiment abordable gagnait toujours (il vise maintenant des
niveaux), et surtout **la steppe ne produit pas de polymère** — tout ce qui en
réclamait échouait en silence, et le camp bâtissait un générateur et un mur au
lieu d'un dortoir. Ce que la région ne donne pas, il faut l'acheter.

Enfin, on ne s'installe pas quelque part parce qu'on y a mangé une fois :
l'arrivée suit désormais l'abondance — douze jours de réserve par tête, le
moral, les lits — au lieu d'un dé plat conditionné par un seuil. Et l'on s'en va
avant de mourir de faim.

**Au-delà de dix-huit habitants et d'une halle, le monde cesse de vous
ignorer.** L'avant-poste entre dans `world.colonies` comme n'importe quel bourg.
Sa fiche est **une vitrine, pas une seconde source de vérité** : `state.base`
reste le seul endroit où il existe vraiment, la vitrine en est recopiée une fois
par jour, et le tick des colonies la saute — elle n'a ni économie propre, ni
grenier, ni notables. Il se voit sur la carte, il tient ses routes comme une
ville, les cases voisines cessent d'être libres à la fondation — et les conseils
voisins le voient comme une place à prendre. Si une colonne l'emporte, le camp
tombe avec : il reste l'escouade, et de la place ailleurs. La partie continue.

    Habitants moyens          2,5  →  4,9
    Avant-postes fondés     40/60  →  42/60
    Écrits sur les cartes    0/60  →   4/60
    Survivantes             57/60  →  59/60
    Crédits moyens          2 148  →  1 022

Les crédits paient la différence, et c'est juste : bâtir coûte, et le polymère
s'achète. Le seuil de reconnaissance a lui aussi été corrigé par la mesure — à
vingt-cinq habitants, deux parties sur soixante l'atteignaient, ce qui fait un
mur et non un palier.

### Des marchands qui s'arrêtent

Une ville reconnue n'avait toujours pas de marché : elle achetait par
l'escouade, comme un camp, et la voie du colon restait attachée aux jambes de
quatre personnes. C'est exactement le couplage que le n=120 avait mis au jour —
marcher est ce qui rend riche, donc bâtir loin des routes appauvrit.

On ne lui donne pas un étal, ce qui supposerait un second stock et une seconde
vérité. On lui donne **des visiteurs** : des colporteurs qui traitent avec
l'intendance, prennent le surplus au prix du gros (×0,55) et laissent ce qui
manque au prix du détail (×1,35). C'est moins avantageux que d'aller vendre
soi-même — et c'est le propos : on paie la commodité, on n'a pas marché.

**Ils viennent d'autant plus souvent que la piste est faite** : un colporteur
tous les huit jours sur une bonne route, tous les vingt sur une friche à peine
marquée. Les deux chantiers se rejoignent — les routes du chapitre précédent
sont ce qui rend une ville habitable, et une ville sur une route est ce qui
justifie la route.

Le premier réglage réservait les colporteurs aux villes *reconnues*, et ne
servait donc à rien : c'est le camp d'avant le seuil qui a besoin d'écouler son
surplus, puisque c'est comme ça qu'il devient une ville. Un hameau en voit
passer un de temps en temps, une ville trois fois plus.

    Crédits moyens          1 022  →  1 688
    Avant-postes fondés     42/60  →  47/60

### Ce que l'entrepôt refuse ne disparaît plus en silence

Trouvé en cherchant pourquoi un test échouait, pas en jouant : un entrepôt plein
**jetait la production** de l'hydroponie, de la fonderie et de la raffinerie
sans que rien ne l'indique nulle part. Un joueur aurait vu ses cultures ne rien
rendre et cherché la cause du mauvais côté. Ce qui se perd est maintenant compté,
affiché sur l'écran de l'avant-poste, et signalé au journal — une fois par jour
de jeu au plus, et seulement quand la perte en vaut la peine.

### Deux champs morts

Deux champs déclarés depuis le début et que rien ne lisait ont été branchés — c'est le genre de dette qui ne se voit qu'en cherchant pourquoi une
mesure ne bouge pas. `PEINES[].routes` : une justice dure dissuade, et abaisse
le niveau de repos des pistes autour de ses villes. `PEINES[].ordre` : elle se
paie en rancune. Écrit comme une simple addition, ce second champ ajoutait 0,048
de grogne tous les dix jours et poussait toute ville à la révolte en une partie
— **la peur a désormais un palier** : une ville où l'on pend vite reste
rancunière à 45 %, elle ne se soulève pas pour autant.

### Ni le nombre de colonnes, ni la prime d'engagement

Deux derniers plafonds écrits en dur, retirés dans le même esprit.

**La prime d'engagement montait de quatre-vingt-dix crédits par membre déjà
présent.** C'était de l'équilibrage déguisé en économie : un ferrailleur au
chômage dans un bourg de la steppe n'a aucune idée du nombre de gens que vous
menez, et si vous en menez vingt, il devrait plutôt être rassuré. Ce qui décide
d'une prime, c'est ce que vaut la personne, ce que vaut sa place ici, et ce que
vous valez :

- un vétéran diplômé ne part pas au tarif d'un bras ;
- **on quitte pour presque rien une ville affamée et révoltée** (×0,55), on se
  fait payer cher pour quitter une ville prospère (×1,35) ;
- on suit moins cher un nom dont on a entendu du bien, beaucoup plus cher un
  nom dont on a entendu du mal.

Et surtout, **on voit qui l'on engage**. Chaque ville tient un banc de deux à
cinq personnes, avec leur nom, leur métier, leur meilleure compétence, leurs
brevets et leur prix — renouvelé de loin en loin, et d'autant plus fourni que la
ville va mal. On ne tire plus un inconnu au sort en payant d'avance. Le banc ne
se garnit que là où le joueur se trouve : le tenir dans les quatre-vingt-six
villes, ce serait deux cents personnages inventés pour rien dans chaque
sauvegarde.

**Le nombre de colonnes était plafonné à quatre.** Rien, dans la fiction,
n'empêche de séparer son monde en six. Ce qui l'empêche, c'est de leur parler.

    portée des ordres = 4 secteurs (coureur) + 6 par niveau d'antenne

Un groupe hors de portée **n'est pas perdu : il est sourd.** Il exécute le
dernier ordre reçu jusqu'à ce qu'on le rattrape ou qu'on monte l'antenne — ce
qui est exactement la façon dont on perdait des colonnes avant la radio.
L'antenne cesse d'être décorative : c'est elle qui décide de la profondeur à
laquelle on peut opérer.

Un détail qui a coûté une mesure : la première version rendait injoignables
*les deux* colonnes quand elles s'éloignaient l'une de l'autre, y compris celle
où se tenait le joueur. Résultat, des escouades plantées à ne rien faire trente
pour cent du temps. On se commande toujours soi-même.

### Une escouade n'a pas de plafond, elle a un noyau

Même défaut, même correction. La taille d'une escouade était bornée par
`4 + baraquement` : au-delà, le bouton « Engager » se grisait. Une limite écrite
dans le code, encore.

Le plafond est retiré. Ce qui le remplace : **la cohésion, qui ne servait
jusqu'ici à rien.** Elle dérivait, elle s'affichait, et aucun calcul ne la
lisait. Elle porte désormais tout le poids de la question.

- Un **noyau** de `4 + baraquement` personnes tient ensemble sans effort. Le
  baraquement n'ouvre plus des places : il élargit ce qu'on arrive à tenir.
- Au-delà, le **plafond de cohésion** descend en courbe douce —
  `100 / (1 + (n − noyau) / 7)` — sans jamais tomber à zéro. À trente, on ne se
  connaît plus.
- La cohésion **multiplie le travail et le combat** : ×0,70 pour une foule
  désunie, ×1,15 pour une bande soudée. Une bande rend plus que la somme de ses
  bras ; une colonne rend moins.
- Une troupe nombreuse **se voit de loin** : +5 % de rencontres par personne
  au-delà de quatre.
- La prime d'engagement monte de 90 crédits par membre déjà présent.

Mesuré, en donnant au bot une bourse sans fond pour isoler la cohésion du prix :

    taille de l'escouade        6        12        20
    survivants              24/24     23/24     22/24
    récolte totale          4 739     6 452     6 748
    récolte par personne      790       538       337
    défaites                   96        25        27
    recrues pour tenir          5        19        44

La récolte par tête **est divisée par plus de deux** entre six et vingt : c'est
la cohésion qui mord, et elle mord exactement où on le voulait. En valeur
absolue une grosse troupe reste plus sûre et rapporte davantage — ce qui est
juste, une bande de vingt gaillards *doit* gagner ses combats. Ce qu'elle coûte,
c'est quarante-quatre recrutements par partie pour tenir vingt places, à une
prime qui monte avec l'effectif. On ne l'interdit pas : on la fait payer.

### Ce qui porte à votre place

Une fois les nuits rendues à l'escouade, le banc a montré le chiffre suivant :
**soixante-dix pour cent des départs d'un convoi sont de la logistique.** Le sac
se remplit, on marche jusqu'en ville, on vend, on repart. Onze pour cent des
départs seulement servaient un contrat, onze pour cent un ordre de mission.

    marché : vendre ou se ravitailler   37 %
    chercher à manger                   33 %
    ordre de mission                    11 %
    honorer un contrat                  11 %
    rentrer au camp                      8 %

La réponse n'était pas d'agrandir le sac : ce serait retirer la logistique du
jeu au lieu de la rendre intéressante. C'est de la déléguer à quelque chose qui
a son propre état. **Une bête de somme n'est pas un bonus de portage** : elle
mange la biomasse que personne d'autre ne mange, elle maigrit si on l'oublie,
elle porte moins quand elle va mal, elle ralentit le convoi, et les pillards
l'emmènent avant le reste — c'est un membre de plus dont il faut s'occuper.

Trois attelages, trois compromis : le **mulet** (petit, sobre, increvable), la
**brahmine** (le meilleur dos, le plus gros appétit), la **charrette à bras**
(ne mange rien, mais c'est vous qui tirez).

**Et aucun plafond.** La première version en autorisait trois par convoi, ce
qui était une limite écrite dans le code plutôt qu'une limite du monde. Une
limite en dur n'apprend rien au joueur ; une limite qui se sent lui apprend
comment les choses marchent. Rien n'interdit donc d'acheter une dixième bête —
ce qui l'en dissuadera, c'est que :

- **personne ne la mène.** Deux bêtes par paire de bras valides. Au-delà, tout
  l'attelage est mal tenu : il ne rend plus qu'un tiers de son dos, et il
  dépérit même le ventre plein, faute de pansement et de charge rééquilibrée ;
- **elle traîne la colonne.** La lenteur ne s'additionne plus jusqu'à un plafond
  arbitraire : elle passe par une courbe qui tend vers le pas d'escargot sans
  jamais immobiliser personne, et ce qu'on ne tient pas compte double ;
- **elle mange**, tenue ou pas ;
- **elle se voit de loin.** Une colonne chargée attire les mauvaises rencontres,
  proportionnellement à sa taille.

L'interface le dit sans l'interdire : le bouton passe de « Acheter » à
« Acheter — personne pour la mener », et un avertissement chiffre ce que ça
coûte. Le joueur décide.

    départs logistiques        70 %      43 %
    contrats + ordres          22 %      32 %
    survivants               39/48     43/48
    avant-postes fondés      10/48     33/48

Le dernier chiffre n'était pas prévu et c'est le plus intéressant. Un convoi qui
peut porter finit par rapporter assez de matériaux chez lui pour bâtir : les
camps passent de dix à trente-trois sur quarante-huit parties, et de un à
**dix niveaux de bâtiment** avec deux habitants. La voie du colon ne s'est pas
débloquée par une remise sur les fondations, mais parce qu'on a enfin de quoi
transporter ce qu'on ramasse.

### Le bug le plus cher du projet tenait dans un commentaire

Le tick d'une escouade portait cette ligne depuis toujours :

    // Cycle jour/nuit : on campe la nuit, sauf en marche forcée.

Le code, lui, faisait `travaille = !nuit || ordre.type === 'voyage'` : *toute*
route était une marche forcée. Personne n'a jamais dormi une seule nuit en
voyage de toute l'histoire du projet. Sur une carte où l'on passe la moitié de
son temps sur les pistes, ça voulait dire une escouade qui ne dort jamais.

Le banc l'a trouvé par la bande, en cherchant pourquoi les vétérans mouraient.
Il a fallu séparer la compétence *brute* de la compétence *utile* — celle que
`comp()` renvoie une fois le corps, la faim, la fatigue et le moral appliqués :

    compétence brute  14,1 → 18,1     l'expérience s'accumulait bien
    compétence utile  14,2 →  9,8     et ne servait à rien
    fatigue 60,8 / 120 · corps 77 % · moral 65,5

Soixante de fatigue, c'est trente pour cent retirés de **toutes** les
compétences, en permanence. Les vétérans ne se faisaient pas remplacer parce
qu'ils mouraient : ils étaient devenus plus faibles que les recrues.

Une escouade campe donc la nuit, et la marche forcée devient un ordre qu'on
donne en connaissance de cause — un tiers de temps gagné, payé en fatigue.
Sur quarante-huit parties, avant et après :

    fatigue des anciens        60,8      17,6
    intégrité du corps          77 %      93 %
    moral                       65,5      95,1
    compétence utile        14,3→9,8   14,3→16,2
    anciens encore vivants    39/72     92/144
    survivants                18/24      39/48
    crédits en fin de partie   1 682     3 565

Les vétérans progressent enfin, au lieu de s'user.

Deux corrections sont parties avec, trouvées par la même nécrologie :

- **L'endurance retire à la chance d'un coup fatal** (jusqu'à 45 %). La
  létalité était un dé fixe : vingt pour cent par coup encaissé, qu'on soit un
  bleu ou le meilleur de l'escouade. Une compétence élevée faisait toucher plus
  souvent et esquiver mieux, mais ne changeait rien à ce dé-là. Encaisser n'est
  pas savoir se battre : c'est l'endurance, et elle seule.
- **Une hémorragie ne condamne plus.** Un blessé à plus de 40 de saignement
  avait trois chances sur dix par heure d'y passer, quoi qu'on fasse pour lui.
  La qualité des soins entre maintenant dans le risque et dans la vitesse de
  coagulation. C'est de ça qu'on mourait le plus : vingt-quatre morts « en
  route » contre dix-neuf au combat.
- **Les mises hors de combat comptent.** Les ennemis tombent K.O. bien plus
  souvent qu'ils ne meurent et achever est désactivé par défaut, donc `kills`
  restait à zéro pour tout le monde : la ligne la plus caractérisante du
  mémorial était toujours vide et le seuil qui donne un surnom était
  inatteignable. On ne se faisait un nom qu'en perdant un membre.

### Calibrer l'instrument avant de mesurer avec

Un banc ne vaut que ce que vaut son joueur. Et le nôtre, pendant toute
l'histoire de ce projet, jouait comme un civil : `acheterItem` était importé
dans le fichier du banc **et n'a jamais été appelé une seule fois**. Le bot
traversait quatre mille heures avec l'armure de cuir du premier jour, ne donnait
jamais un ordre d'entraînement, et laissait sa posture sur « neutre » de bout en
bout. Toutes les conclusions d'équilibrage sur les raids, les pertes et la
survie portaient donc sur une escouade désarmée qui ne cherchait ni à se
protéger ni à progresser.

Trois corrections — s'armer chez l'armurier et équiper ce qu'on trouve,
s'entraîner quand on est à l'abri et le ventre plein, choisir sa posture selon
ce qu'on vaut ce jour-là :

                        avant      après
    survivants          25/48      31/48
    défaites              599        294
    crédits pillés    115 664     49 355
    avant-postes         5/48      10/48

Rien n'a changé dans le jeu. C'est la même simulation, mesurée par quelqu'un qui
sait s'habiller. Tout ce qui précède dans ce document a été mesuré avant cette
correction et doit être relu avec ça en tête.

Deux choses restent visiblement fausses et attendent le même traitement : le bot
passe **56 % de son temps en marche** (contre 26 % sur l'ancienne carte), et sa
compétence de combat plafonne à 7 après quatre mille heures — elle *baisse*
même, puisque l'escouade démarre autour de dix. Les vétérans meurent et les
recrues arrivent vierges : l'expérience ne s'accumule pas dans une escouade,
elle se remplace.

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

**Le monde.** Carte de 24×18 régions — 432 secteurs, cinq fois l'ancienne —,
neuf biomes aux rendements et aux aléas propres, trois Relais Orbitaux en marge,
et 86 colonies au départ. Elle ne tient pas dans un écran de téléphone : la carte
se manœuvre au doigt : glisser pour se déplacer, molette ou deux doigts pour
zoomer (de neuf à quarante-six pixels par secteur, en continu, pas par crans),
double tape pour revenir sur le groupe. C'est le propos — un monde qu'on embrasse
d'un coup d'œil n'est pas un monde à explorer.

Deux détails qui décident de tout ici : la boîte de carte porte
`touch-action: none`, sans quoi un glissement vertical fait défiler la page et
on n'atteint jamais le sud du monde ; et la position de la vue est mémorisée
hors du DOM, parce que chaque rafraîchissement reconstruit l'écran et
renverrait sinon le joueur dans le coin nord-ouest à chaque clic.

La densité, elle, n'a pas bougé : une ville pour cinq secteurs, comme avant. Le
banc a tranché ce point en une mesure. À 54 villes — une pour huit secteurs — le
monde était plus grand *et plus vide* : chaque ravitaillement devenait une
expédition, la part du temps passée en marche montait de 26 à 42 %, et la survie
tombait de 22 à 13 sur trente parties. Agrandir la carte ne doit pas vouloir dire
écarter ce qu'il y a dessus.

Le coût est tenu par un niveau de détail : une ville proche du joueur avance par
tranches de trois heures, une ville lointaine par journées. Rien n'est perdu au
change — chaque ville retient l'heure de son dernier passage et rattrape
exactement ce qui lui est dû, et les probabilités passent par `surDt`, de sorte
que s'approcher ou s'éloigner ne fabrique ni ne détruit une heure de production. Chaque colonie produit, consomme, se rationne
avant de mourir, et fixe ses prix sur sa propre tension offre/demande — une ville
affamée paie les rations au prix fort. Une ville prospère change de rang ; une
ville saignée par les guerres finit abandonnée et devient un site à fouiller ;
une faction riche en fonde de nouvelles. Sur une année de jeu, la carte perd et
gagne des villes.

**Les métiers des villes.** Une ville n'est pas une population indifférenciée
qui produit un peu de tout en proportion de sa taille. C'est des paysans, des
mineurs, des ferrailleurs, des artisans, des médecins, des miliciens, des
marchands — et cette répartition explique ce qu'elle produit, ce qu'elle vend et
ce qu'elle devient. Un bourg des marais nourrit la région ; une ville des canyons
crève de faim mais tient l'alliage. La vocation vient du biome et du tempérament
de la faction qui la tient, puis la main-d'œuvre se redéploie lentement vers ce
qui presse : une ville qui a faim met des bras aux cultures, une ville menacée
arme les siens. Et 45 % de la population ne travaille pas — enfants, vieux,
éclopés —, ce qui est précisément ce qui rend une ville fragile.

**Les gens qui comptent.** Cinq mille cinq cents habitants nommés pèseraient
quatre mégaoctets de sauvegarde et six cents fois le budget d'un tick : la
population reste donc un effectif. Mais un effectif ne se rencontre pas. Chaque
ville a son chef, son armurier, son contremaître, son médecin — avec un nom, un
âge, un caractère, une humeur, une compétence, et une opinion sur vous. Ils
vieillissent, se lassent, meurent et sont remplacés. Un armurier avare vend un
tiers plus cher qu'un honnête homme qui vous apprécie ; un chef dur tient sa
ville mais l'aigrit ; un contremaître compétent fait la différence entre une
production qui tourne et une qui traîne. La granularité est là où on peut la
voir.

**Ce qu'ils vous demandent.** Un panneau d'affichage est anonyme : il paie en
crédits, il bouge la réputation d'une faction, et personne ne se souvient de
vous. Ces gens-là, c'est autre chose. Quand leur ville manque vraiment de ce
dont ils ont la charge — le médecin de medkits, le contremaître de composants,
le chef de vivres, l'armurier d'alliage —, ils vous le disent en face, et ils
retiennent ce que vous en avez fait. Quatre actes en mémoire, écrits en clair
sous leur portrait.

La prime est volontairement médiocre : elle rembourse la marchandise, sans plus.
Ce qu'on achète en rendant un service, c'est l'estime d'une personne précise, et
cette estime ouvre des choses qu'aucune somme n'achète — un armurier qui fait
ses prix, un médecin qui passe voir vos blessés quand vous campez sous ses murs,
un chef qui vous garde les contrats qui paient (et qui vous ferme son panneau si
vous lui déplaisez assez), un contremaître qui laisse ses registres ouverts,
c'est-à-dire dont les chiffres restent frais même quand vous êtes à l'autre bout
de la carte. C'est le seul moyen de savoir sans être là.

Une demande qu'on laisse s'éteindre se paie — mais seulement si on était passé
l'entendre. Sur quatre parties d'un an, 348 demandes naissent d'elles-mêmes et
seules 4 sont reprochées à un joueur qui ne s'en occupe jamais : on ne tient
rigueur à personne d'un besoin qu'il ignorait.

**Les métiers, et les bâtiments qui les abritent.** Chaque bâtiment de
l'avant-poste ouvre un métier, et chaque métier n'agit que sur son bâtiment :
le cultivateur sur l'hydroponie, le fondeur sur la fonderie, le magasinier sur
l'entrepôt, l'opérateur sur l'antenne. Treize bâtiments, treize métiers, treize
effets distincts — on ne confie pas des bras à un tas, on les met à un poste.

Trois d'entre eux ne produisent rien et comptent quand même :

- **la cantine** et ses *cuisiniers* : manger assis, à heure fixe, avec
  quelqu'un qui compte les portions. Jusqu'à un tiers de vivres en moins pour
  les mêmes bouches, et c'est le seul bâtiment dont l'effet se voit sur le moral
  autant que sur le stock ;
- **la halle de récolte** et ses *récoltants* : jusqu'ici l'avant-poste ne
  savait que transformer ce qu'on lui apportait. Il ramasse maintenant sa propre
  région, au rendement du biome — et sans l'épuiser, parce que c'est une
  exploitation et non une fouille ;
- **le poste de garde** et ses *gardes* : il ne fait pas gagner les combats,
  c'est l'affaire du mur et des miliciens. Il fait voir venir. Moins de raids
  aboutissent par surprise, et ceux qui passent trouvent les stocks rentrés.

Les villes ont leur équivalent : neuf corps de métier dont les *cantiniers*,
qui nourrissent cinq cents personnes pour moins cher que cinq cents foyers, et
les *ouvriers*, sans qui une ville qui a pris un assaut reste éventrée — la
défense repoussait toute seule, la muraille jamais.

**Les caravanes.** Ce qu'une ville a en trop part chez celle qui en manque, sur
des routes réelles et dangereuses. Elles se font piller par les pillards et par
les colonnes en campagne — et vous pouvez leur tendre une embuscade, au prix
d'une réputation durablement abîmée.

**Les factions.** Sept, dont l'Essaim qui ne négocie pas. Elles tiennent un
trésor, délibèrent périodiquement, lèvent des colonnes, les font marcher, mettent
le siège, prennent des villes, se ravitaillent mal et se dispersent. La carte
politique de la fin de partie n'est pas celle du début.

**Qui décide.** Une faction ne délibère plus comme une moyenne : elle a quelqu'un
à sa tête, avec un nom, un titre, un âge, un tempérament et une légitimité. Un
conquérant déclare des guerres qu'un prudent n'aurait pas déclarées ; un rancunier
ne signe pas la trêve qu'un conciliateur aurait signée ; un bâtisseur pousse des
postes pendant que les autres se battent. Un chef contesté décide moins nettement
— ni guerre franche, ni paix nette.

Prendre une ville l'assoit, en perdre une le ronge, abandonner une guerre sans
avoir obtenu ce qu'on cherchait lui coûte. En dessous d'un seuil, il est écarté —
et son successeur n'a pas forcément le même tempérament. C'est ainsi qu'une
faction pacifique se réveille conquérante sans que rien d'autre n'ait bougé.

**Les guerres ont un objet.** Plus de conflits qui s'éteignent d'usure sans qu'on
sache ce qu'ils cherchaient : chaque déclaration porte un but tiré du tempérament
de celui qui la veut — prendre une ville nommée, solder un compte en trois
batailles, desserrer l'étau. La guerre s'arrête quand le but est atteint ou
devenu hors d'atteinte, et la trêve le dit : « l'affaire est réglée pour prendre
Camp-Ithaque ». La chronique du monde se lit enfin comme une histoire.

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

**Les métiers.** Les habitants ne sont plus un multiplicateur anonyme posé sur
toutes les chaînes à la fois : ils ont un poste. Dix métiers — cultivateur,
fondeur, machiniste, raffineur, mécanicien, magasinier, infirmier, opérateur,
milicien, bâtisseur — dont chaque bâtiment ouvre les places. Un habitant sans
poste reste manœuvre et aide partout un peu ; affecté, il rend bien davantage,
mais sur sa chaîne seulement. L'avant-poste devient donc un choix de
spécialisation plutôt qu'une addition de bras, et le harnais vérifie qu'à
bâtiments et population égaux, spécialiser produit plus que ne rien décider.

Et c'est là que tout se rejoint : **un des vôtres présent à l'avant-poste
encadre l'équipe**. Le meilleur dans la compétence du métier fait contremaître et
vaut plusieurs ouvriers — un ingénieur diplômé sur la chaîne des composants, un
médecin à l'infirmerie. Le vétéran qu'on a formé, les diplômes qu'on a payés et
les gens qu'on a logés cessent d'être trois systèmes séparés. Qu'il parte, et le
rendement retombe.

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
    betes.js          bêtes de somme et charrettes : ce qui porte à votre place
    recrues.js        qui accepte de partir avec vous, et pour combien
    notables.js       les gens qui comptent dans une ville, leur état, leurs effets
    dirigeants.js     chefs de faction, tempéraments, légitimité, buts de guerre
    influence.js      ce qu'un grade permet de peser au conseil d'une faction
    services.js       ce que les notables vous demandent, ce qu'ils retiennent
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
