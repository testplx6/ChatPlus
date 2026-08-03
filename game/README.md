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
COLON=1 node test/equilibre.js                # profil : bâtir plutôt que courir
CARRIERE=1 node test/equilibre.js             # profil : servir, monter, ordonner
NEGRIER=1 node test/equilibre.js              # profil : prendre vivant, vendre
PILLARD=1 node test/equilibre.js              # profil : prendre ce qui passe
MARCHAND=1 node test/equilibre.js             # profil : acheter bas, vendre haut
BIENFAITEUR=1 node test/equilibre.js          # profil : tenir ce qu'on a promis

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
de 24×18 et ses 86 villes, 116 avec les cantiniers et les ouvriers. Sans cette
trace, relever le budget deviendrait un moyen commode de ne jamais voir une
régression.

Le plafond est ensuite **descendu** de 145 à 110, sans qu'une ligne de moteur
change : c'est la mesure qui a cessé de mentir. Voir plus bas.

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

### Un frein qui n'a jamais freiné

La surextension — une faction qui tient trop de villes, trop loin de sa
capitale, les tient mal — était écrite, commentée, et morte depuis le premier
jour. `distance` prend deux cases ; on lui en passait trois, le monde en tête.
Elle rendait `NaN`, et la ligne suivante était :

    if (tension > 0) col.unrest = Math.min(1, col.unrest + tension);

`NaN > 0` est faux. Le mécanisme ne s'est jamais exécuté, aucun test n'a jamais
rougi, et le garde qui aurait dû le trahir est précisément ce qui l'a caché.
**Un garde qu'on ne voit jamais échouer ne prouve rien.**

Le rebrancher tel quel emportait un quart du monde :

                            villes debout   plus gros empire   agitation
    frein coupé                    77              24             0,55
    constantes d'origine           56              17             0,87
    constantes remesurées          72              22             0,60

Les deux constantes d'origine avaient été choisies à vue contre un mécanisme qui
ne tournait pas — personne ne pouvait savoir qu'elles étaient trois fois trop
fortes. La forme aussi était fausse : la tension était une *somme*, si bien
qu'une ville lointaine d'une petite faction payait pour une géographie dont elle
n'était pas responsable. C'est un *produit* maintenant : ce sont les villes en
trop qui coûtent, et elles coûtent d'autant plus qu'elles sont loin.

Reste ce que le frein n'a pas à faire. Le commentaire d'origine en faisait « ce
qui empêche un vainqueur d'avaler la carte entière ». Mesuré frein coupé, sur
dix-huit mille heures, le plus gros empire plafonne entre 27 et 44 % des villes
et le monde se stabilise vers cinquante-huit. Personne n'avale rien : autre
chose faisait déjà ce travail. **Un frein qu'on croit vital, on le serre trop
fort.**

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

### Exister est une décision

La reconnaissance était automatique — dix-huit habitants et une halle, et le
monde vous écrivait sur ses cartes. Le banc a montré ce que ça donne sur la
durée. **Quatorze mille heures, vingt parties : 1,8 habitant par avant-poste
pour dix-neuf niveaux de bâtiment.** Des ruines rebâties en boucle.

La trace d'une partie raconte l'histoire en une ligne : t=9600, dix-sept
habitants, cinq bâtiments ; t=10800, zéro habitant, un bâtiment. Une colonne
était passée. Le mécanisme fonctionnait exactement comme prévu — une ville sur
les cartes est une place que les conseils convoitent — mais l'avoir rendu
**involontaire** en faisait un piège : on grandissait, on devenait visible, on
se faisait prendre, et l'on n'avait jamais choisi aucune des trois étapes.

Elle se demande maintenant. Un bouton, un avertissement explicite, et l'on ne
revient pas en arrière. Le bot du banc, lui, ne se déclare pas ville avant
d'avoir deux niveaux de mur — parce que c'est ce qu'un joueur ferait.

                        automatique   sur décision
    Habitants (14 000 h)        1,8           14,1
    Habitants (4 000 h)         4,4           11,3
    Avant-postes fondés       44/60          51/60
    Crédits (14 000 h)       20 085         34 248

C'est le troisième mécanisme de cette session dont le défaut n'était pas la
règle mais **le fait qu'elle s'applique sans qu'on l'ait voulue** — après le
dé qui décidait à la place du gradé, et l'émeute qu'on lisait trois fois par
jour.

**Restait à savoir si une ville déclarée pouvait tenir.** Elle ne le pouvait
pas : vingt-quatre villes bâties à la main, déclarées, laissées six mille
heures — **vingt-trois prises, six niveaux de mur compris.** Les remparts ne
servaient à rien puisque les conseils dimensionnent leur colonne sur la défense
d'en face : plus on se fortifiait, plus l'armée envoyée était grosse.

La cause n'était pas le calcul mais la règle qui l'appelait. L'étape « reprendre
une ville libre » avait été écrite pour les bourgs qu'une révolte laisse sans
drapeau : personne ne les tient, quelqu'un les prendra. Appliquée telle quelle à
l'avant-poste du joueur, elle en faisait une place vacante — la colonne partait
dans les cinquante heures suivant la déclaration. **Une ville à vous n'est pas
un terrain vague.** On ne prend celle de quelqu'un que si l'on a une raison de
lui en vouloir : la sûreté d'une ville tient donc à la diplomatie de celui qui
l'a bâtie, ce qui est exactement le propos du jeu.

    Vingt-quatre villes, six mille heures        tenues
    En paix, deux niveaux de mur                  24/24
    Détesté partout (−45), deux niveaux            2/24
    Détesté partout, six niveaux de mur            9/24

Les murs redeviennent ce qu'ils doivent être : non pas ce qui rend une ville
imprenable, mais ce qui la rend chère — le dernier recours quand la diplomatie
a échoué.

Corrigé au passage, et trouvé en cherchant pourquoi les camps ne se relevaient
pas : le colporteur calculait sa réserve de vivres sur la population **du
moment**. Un camp effondré à deux habitants bradait donc tout ce qui dépassait
cinquante rations, et ne se relevait jamais. Il la calcule sur ce que le camp
peut *tenir*.

### Sous quel drapeau

Une ville libre vit de la réputation de celui qui l'a bâtie : personne ne vient
la prendre tant qu'on n'a rien à lui reprocher. C'est tenable, et c'est fragile
— il suffit d'une guerre où l'on a pris parti pour que la place redevienne
convoitable.

L'autre voie : **prendre les couleurs de ceux qu'on sert.** Il faut les servir,
ou qu'ils vous estiment (40 de réputation). Ils la portent alors sur leurs
cartes, leurs colonnes la comptent parmi les leurs, et l'on cesse d'être un
bourg sans maître à trois jours de marche. En échange :

- on paie **l'impôt qu'ils ont voté** — celui-là même qu'on a peut-être voté
  soi-même, si l'on est Commandeur ;
- et **on hérite de leurs guerres**. Ce n'est pas une formule : une ville qui
  porte des couleurs devient une cible pour les ennemis de son protecteur, et
  le test de l'impôt a dû être ramené de deux cent quarante à soixante-douze
  heures parce qu'au-delà elle se faisait prendre. Le mécanisme fonctionne ;
  c'est simplement autre chose que ce que ce test-là mesure.

On peut reprendre son drapeau. Trente-cinq points de réputation, et l'on
n'oublie pas ce genre de départ.

**Est-ce seulement viable, de bâtir une ville ?** La question méritait des
chiffres plutôt qu'une impression. Vingt-quatre villes par cas, six mille
heures chacune :

    Libre, en paix                    24/24 tiennent
    Sous couleurs                     13/24
    Libre, détesté de tous            8/24
    Sous couleurs, détesté de tous    13/24

**Fonder n'est pas puni — c'est l'état le plus sûr du jeu.** Une ville libre
dont on n'a rien à reprocher au bâtisseur tient toujours. Ce qui coûte, c'est
le drapeau : il vous expose aux guerres de votre protecteur.

Et c'est très exactement ce qu'on veut, parce que **le drapeau est une
assurance**. Il plafonne votre risque quand le monde se retourne contre vous
(8 → 13) et il vous coûte quand vous vous en seriez sorti seul (24 → 13). On
paie une prime pour ne pas dépendre de sa réputation.

Encore fallait-il qu'il y ait une contrepartie. Écrit d'abord sans, prendre des
couleurs donnait tout l'inconvénient et aucun avantage : onze sur vingt-quatre.
**Un protecteur paie la garnison de ce qu'il protège** — sur son trésor, et à
proportion de ce qu'il a. Vous payez l'impôt, ils paient les murs.

Un piège évité de justesse en l'écrivant : la recopie de la vitrine s'arrêtait
dès que la fiche portait des couleurs — c'était la façon de reconnaître qu'on
nous l'avait prise. Une ville rattachée aurait donc cessé d'être mise à jour
tout en restant nôtre. C'est `avantPoste` qui dit qu'elle est encore à vous, et
non l'absence de drapeau.

### La relève

Le dernier des vôtres tombe, et la partie s'arrête — même avec dix-huit
habitants, une halle, des murs et un nom sur les cartes. C'était le dernier
endroit où bâtir ne servait à rien : tout ce qu'on avait fait tenait à quatre
paires de jambes et disparaissait avec elles.

**Une ville qui a des gens envoie des gens.** Ce ne sont pas vos vétérans — ce
sont des colons qui n'ont jamais tenu une arme, ils partent à quarante de moral,
et la ville les perd. Mais c'est votre ville, et elle continue. Sans avant-poste,
ou avec moins de trois habitants, c'est fini comme avant.

### Un bot qui joue en colon, et ce qu'il a révélé

Le bot du banc court la carte : il prend des contrats lointains, ramasse, vend,
et rentre au camp quand son sac est plein. C'est une façon de jouer, et c'est
celle qui a servi à mesurer tout le reste — mais elle ne met presque jamais la
voie du bâtisseur à l'épreuve. La moitié de ce qui a été écrit autour de
l'avant-poste n'était donc vérifiée que par des tests unitaires et des mesures
ponctuelles, jamais par des parties entières.

`COLON=1` : on fonde dès quatre-vingts heures au lieu de trois cents, et l'on
ne s'éloigne pas de plus de cinq cases de chez soi.

Le premier résultat est contre-intuitif, et c'est ce qui le rend utile. Le colon
passait **29 % de son temps en marche au lieu de 45 %, gagnait plus d'argent
(2 131 contre 1 299) — et bâtissait moins** : neuf niveaux contre onze, sept
habitants contre onze. Rester chez soi appauvrissait le camp.

La cause n'était pas la présence ni l'argent, mais les matériaux : ce qu'il faut
à un chantier ne se ramasse pas sur place, et **personne ne le lui apportait**.
Les colporteurs, réglés à une visite toutes les quatre cent quatre-vingts
heures, en faisaient **2,1 par partie** — autant dire que le mécanisme
n'existait pas. Un hameau sur une piste faite en voit maintenant un tous les
huit jours.

                          avant   après
    Colporteurs             2,1     6,1
    Habitants (colon)         7      14
    Habitants (aventurier)   11      15
    Niveaux de bâtiment       9      11
    Crédits (colon)       2 131   3 192

Les deux profils y gagnent, et le colon rattrape l'aventurier : bâtir devient
une façon de jouer plutôt qu'une occupation de bord de route.

### Ce que l'entrepôt refuse ne disparaît plus en silence

Trouvé en cherchant pourquoi un test échouait, pas en jouant : un entrepôt plein
**jetait la production** de l'hydroponie, de la fonderie et de la raffinerie
sans que rien ne l'indique nulle part. Un joueur aurait vu ses cultures ne rien
rendre et cherché la cause du mauvais côté. Ce qui se perd est maintenant compté,
affiché sur l'écran de l'avant-poste, et signalé au journal — une fois par jour
de jeu au plus, et seulement quand la perte en vaut la peine.

### La chronique

Le jeu n'a pas de condition de victoire et n'en aura pas : on ne gagne pas
contre un désert. Mais il n'avait pas de miroir non plus — on jouait cent heures
et rien ne disait ce qu'on était devenu, **alors qu'il avait tout compté**.

Onze titres, du plus lourd au plus léger, chacun avec une condition tirée de
l'état réel. On porte le premier qu'on a mérité :

    Négrier              cinq hommes vendus. Ça passe avant tout le reste,
                         et le reste ne le rachète pas.
    Commandeur           le grade, et douze ordres donnés en son nom.
    Fondateur            une ville sur les cartes qui n'y était pas avant vous.
    Seigneur de guerre   quarante victoires et des gens qui savent se battre.
    Chasseur de primes   quinze brigands livrés à la justice.
    Bâtisseur            douze habitants sous un toit qu'on a monté.
    Officier             des couleurs portées, des routes confiées.
    Maison marchande     six mille crédits sans qu'on ait à vous craindre.
    Bienfaiteur          douze services rendus à des gens qui s'en souviennent.
    Ferrailleur          le désert retourné pour ce qu'il restait dedans.
    Vagabond             traversé le monde sans y laisser de trace.

Le vagabond n'est pas un défaut faute de mieux : c'est une façon d'y survivre,
et elle est dite comme telle. La chronique ne récompense rien, ne débloque rien
et ne classe personne. Elle liste **ce qui est arrivé** — jamais une rubrique
vide, parce qu'une chronique qui énumère des zéros ne raconte rien.

### Un bot qui joue en carriériste, et l'ordre qu'on ne pouvait pas honorer

La voie du service est celle qui a reçu le plus de code — grades, charges,
secteurs, prérogatives, lois — et aucun bot ne la jouait. Le bot par défaut
s'engage, puis continue sa vie d'aventurier. `CARRIERE=1` fait passer l'ordre de
mission avant tout le reste : on va acheter la marchandise qu'il réclame, on va
chercher l'ennemi qu'il désigne.

La première version était mauvaise, et pour une raison bête : elle redonnait
l'ordre de marche toutes les quatre heures, remettait la route à zéro, et le
carriériste passait **62 % de son temps à marcher sans jamais arriver nulle
part**. Corrigée, elle a mis à nu deux défauts qui n'étaient pas dans le bot.

**Ce que le compteur a montré.** Un « 5,4 ordres manqués par engagé » ne dit pas
lesquels. Le banc compte maintenant les ordres reçus et honorés par type, et le
verdict a été immédiat :

    bot par défaut, n=30      honorés
    ravitaillement            27 / 131   (21 %)
    frappe                     1 /  40   ( 3 %)
    reconnaissance            41 /  59   (69 %)

Un ordre de mission sur trois est une frappe, et la frappe n'était honorable
qu'une fois sur trente. Deux causes, trouvées l'une après l'autre.

**L'ordre survivait à sa guerre.** Les traités se signent pendant que la colonne
marche. Mesuré : **45 % des heures passées à honorer une frappe l'étaient contre
une faction avec qui la paix était déjà faite** — on chassait des gens avec qui
on venait de traiter, sur des terres qui ne sortaient plus personne, et l'on
perdait de l'estime pour ne pas y être arrivé. Un ordre de frappe est maintenant
retiré quand la guerre s'arrête : pas de manque, pas de perte d'estime, et l'on
est rappelé vite pour autre chose.

**Même chez l'ennemi, en guerre, on ne croisait que des bandits.** Un bot qui
laisse tout tomber pour aller camper en pays ennemi pendant toute la durée de
l'ordre acquérait **quatre victoires sur les cinquante-deux demandées** : trois
rencontres hostiles sur quatre étaient des pillards, parce que le poids de la
faction dominante ne regardait pas si elle était en guerre contre vous.
Désormais, sur les terres d'une faction en guerre contre celle qu'on sert, ce
sont ses hommes qui sortent. A/B à n=60 : **1 143 points de service contre
949**, pour la même survie.

**Une idée démentie par la mesure.** J'avais interdit au carriériste de fonder
un camp — il sert une maison, il n'en bâtit pas. C'était une idée, pas une
mesure. Sans camp, **neuf escouades de plus sur soixante s'éteignent, pour
exactement les mêmes points de service**. Un camp ne concurrence pas une
carrière, il la loge. L'interdiction a été retirée.

    n=60, 4 000 h            défaut   carriériste
    escouades vivantes        58/60     58/60
    points de service           559      1 091
    ordres manqués              5,1        3,3
    ravitaillement            21 %       50 %
    Commandeur atteint            1          9

Les deux correctifs profitent aussi au bot par défaut, qui ne joue pas la
carrière : 413 points avant, 559 après. Ce n'est pas le profil qui a rendu la
voie jouable, c'est ce que le profil a permis de voir.

### Un bot qui vend des hommes, et le marché qui n'existait pas

Le jeu affirmait deux choses qu'aucune mesure n'avait vérifiées : que vendre des
hommes est la voie la plus rentable, et qu'elle se paie. La chronique lui donne
même son titre le plus lourd, celui qui passe avant tout le reste. Le bot par
défaut refuse de vendre — c'est un choix de jeu, et il reste — si bien que tout
ce qui pend à l'esclavage n'était vérifié que par des tests unitaires.
`NEGRIER=1` le joue : on cherche l'affrontement pour faire des captifs, on les
porte là où la loi les achète, on vend. Le banc ne juge pas, il chiffre.

**Le marché n'existait pas.** Première mesure, avant toute chose : **1,5 ville
sur 70** achetait des hommes, et le bot en vendait 0,3 par partie pour 11
prisonniers pris. Aucune faction ne démarre esclavagiste — c'est voulu — et le
conseil devait l'ouvrir « quand la caisse est vide et qu'on a un chef que ça
n'empêche pas de dormir ». Sondé sur soixante-douze factions en fin de partie :

    caisse vide (< 600 par ville)      92 %
    chef qui s'en accommode            31 %
    pays calme (grogne < 0,40)         11 %      ← grogne médiane 0,63
    les trois à la fois                 1 %
    marché effectivement ouvert         0 %

La règle demandait **la ruine et la sérénité en même temps**, alors qu'un pays
gronde justement parce qu'il est ruiné. La grogne n'est plus une condition
d'ouverture — elle en est la conséquence, ce qui était déjà son rôle (+0,06 à
l'ouverture). Le marché se referme quand un chef à conscience arrive, quand la
caisse se remplit, quand une guerre d'abolition mord, ou quand le pays se défait
vraiment (grogne > 0,8). Résultat : **un quart des factions** l'ouvrent au cours
d'une partie.

**Une limite écrite là où le coût existait déjà.** `capturables` refusait net
au-delà de ce qu'on savait garder. Or le modèle avait déjà tout ce qu'il faut
pour borner le nombre sans l'écrire — ils mangent, ils ralentissent, ceux que
personne ne regarde s'évadent — mais on ne pouvait jamais entrer dans le régime
où ça s'applique. Une escouade de quatre gardait six captifs, pour toujours,
quoi qu'elle achète ou apprenne : **la seule voie du jeu qui ne montait pas en
charge**. La limite est maintenant tenue par son coût, comme les bêtes, le
portage et le camp. Mesuré ensuite : surcharger volontairement fait *perdre* des
têtes — le coût fait son travail, et le choix a une vraie réponse.

**Un homme valait moins qu'une charrette à bras.** À 1,9 fois sa valeur, un
captif se vendait 360 crédits — un tiers d'une brahmine. Mesurée, la voie
rapportait 4 750 crédits par partie et en coûtait près de 8 000 en travail non
fait, en soins, en matériel et en escouades éteintes : **strictement dominée par
le travail honnête**, ce qui n'est pas un choix moral mais un piège. Le coût qui
domine n'est pas l'estime perdue, c'est l'heure passée à chasser plutôt qu'à
récolter. Le prix passe à 3,2 (2,3 dans une ville sans loi).

**Deux erreurs de profil, corrigées par la mesure.** Le bot patrouillait en
posture prudente — laquelle coupe un tiers des rencontres *et* esquive quatre
hostiles sur dix avant qu'on ait vu à qui l'on avait affaire : 444 heures de
chasse pour **moins** de victoires qu'un bot qui ne chassait pas. Et il partait
en rafle avant de s'entraîner, à treize de compétence en posture agressive : une
partie sur quatre s'éteignait. Un négrier s'entraîne d'abord, puis n'esquive
plus rien.

    n=60, 4 000 h        défaut    colon  carriériste   négrier
    escouades vivantes    58/60    59/60      55/60      52/60
    crédits en fin         4 128    2 456      4 454      7 117
    dont revenu captifs    1 936    1 235      1 945     12 653
    points de service        630      401      1 072        770
    estime (non escl.)        −3       −4         −2        −30
    des nôtres à terre       7,7      6,6       10,4       16,1

C'est enfin la forme que le jeu annonçait : **le plus d'argent, le plus de
funérailles, et le mépris de tous ceux qui ne le font pas.** La chronique le dit
sans commenter — sur trente parties, dix-sept finissent sur le titre de Négrier,
et aucune autre voie ne le décroche jamais.

### Un bot qui rend service, et la dette qu'on contractait en marchant

La voie du bienfaiteur est la seule non violente du jeu, et la seule dont la
monnaie ne soit ni l'argent ni le grade mais l'opinion de gens précis — un
armurier qui fait ses prix, un médecin qui recoud les vôtres, un contremaître
qui laisse ses registres ouverts à l'autre bout de la carte. Personne ne la
jouait. `BIENFAITEUR=1` la joue.

**Le compteur mentait, d'abord.** Le banc annonçait « 4 527 demandes croisées,
102 honorées » — 2 %, un chiffre qui a servi de constat pendant des mois. Il
comptait des coups d'œil : il s'incrémentait à chaque passage en ville, pas par
personne qui attend quelque chose. En demandes distinctes, le bot par défaut en
croise 397, en adopte 233, en honore 102 et **en laisse mourir 209**. Ce n'est
pas de la négligence, c'est un ordre de priorités : la promesse venait après les
contrats, le camp et le marché, et une demande s'éteint en trois semaines.

**Marcher était une dette, et le remords n'avait pas lieu d'être.** Une demande
non honorée coûtait 14 points d'opinion « si vous étiez passé l'entendre ». Le
code se gardait d'un joueur qui n'y était jamais allé, et pas du tout d'un
joueur qui va partout. Mesuré :

    oublis inscrits en mémoire, sur 30 parties
      bot qui ne touche jamais aux services (SANS=services)     487
      bot par défaut                                            435
      bot bienfaiteur                                           440

Un bot qui n'a jamais parlé à personne accumulait 487 affronts. Et le bienfaiteur
finissait avec une opinion moyenne **plus basse** que celui qui ignore le
système, parce qu'il visite plus de villes. S'en occuper vous faisait détester.

Premier correctif : ne punir que si l'on était là **en mesure d'aider** — refuser
ce qu'on a sous la main, pas passer les poches vides. Les 487 oublis fantômes
tombaient à 58. C'était la bonne réponse à la mauvaise question.

Car il n'y a rien à punir du tout. **On n'a jamais rien promis.** Quelqu'un a un
besoin, vous passez, vous ne le comblez pas : ce n'est pas un manquement, c'est
la vie ordinaire d'un désert où personne ne peut tout faire — et garder ses cent
quarante rations quand on a soi-même six bouches à nourrir n'est pas un affront.
La contrepartie négative a donc disparu entièrement, avec les champs `vu` et
`snob` qui la servaient. Le système n'a plus que du haut, et il tient : la
marchandise part, la prime la rembourse tout juste, le vrai prix est le détour,
et l'on ne peut pas les servir tous. **C'est ça, la décision.**

**Trois erreurs de profil, toutes de trésorerie ou de dispersion.** Le bot
tentait d'acheter son lot au moment précis où sa bourse est au plus bas — `servir`
est appelé en tête de visite, avant la vente : 2 000 achats refusés « faute de
crédits » sur 2 100 tentatives, avec 340 crédits en poche pour un lot à 500. Il
dépensait par ailleurs tout son argent en équipement dès qu'il en avait. Et il
éparpillait quatre services par partie sur soixante villes, alors que l'estime se
gagne par 24 et que l'amitié commence à 35 : il faut revenir. Un bienfaiteur vend
d'abord, garde un fonds de roulement, et travaille une paroisse — sa ville et
celles où l'on va à pied. Amis en fin de partie : 0 → 3.

**Le titre était masqué, puis hors d'atteinte.** `Bienfaiteur` passait après
`Bâtisseur` et `Officier`, or un camp de douze habitants arrive dans deux parties
sur cinq et un grade d'officier dans une sur trois, presque sans le vouloir. Un
titre qui se mérite ne doit pas être masqué par un titre qui s'attrape : il
remonte au-dessus des deux. Son seuil, lui, était à douze services, posé sans
mesure puisque rien n'avait jamais joué cette voie. Mesurée : médiane 3, neuvième
décile 7, record 14 — douze, c'était une partie sur soixante. À six, c'est une
sur quatre pour qui en fait son métier, et une sur soixante par accident.

    n=60, 4 000 h     défaut  colon  carriériste  négrier  bienfaiteur
    escouades vivantes 58/60  59/60     55/60      52/60      59/60
    crédits en fin      4 128  2 456     4 454      5 062      4 616
    points de service     630    401     1 072        700        655
    services rendus         3      2         4          2          4
    amis (estime ≥ 35)      1      1         3          1          2
    opinion des notables −0,6   −1,1      +1,7      −10,4       −0,8

Le négrier à −10,4 n'est pas un réglage : c'est sa réputation de faction qui
descend sur les gens de la ville. On sait ce qu'il fait, et on est froid avec
lui sans qu'aucune règle ne le dise.

**Ce qui reste ouvert, et qu'il faut dire.** Le bienfaiteur plafonne à quatre
services par partie quelle que soit la variante essayée, parce que le plafond
n'est pas dans le bot : c'est le débit de demandes (0,0016 par notable et par
heure, sous condition de manque réel). Une paroisse en produit une douzaine en
quatre mille heures. C'est une décision de rythme, pas un défaut — mais elle
n'avait jamais été prise en connaissance de cause, et maintenant elle l'est.

### Un bot qui pille, et le butin qui n'allait nulle part

Zéro caravane pillée en trois cents parties : `attaquerCaravane` existait depuis
toujours sans que rien ne l'appelle. `PILLARD=1` l'appelle.

**Le butin n'était jamais ramassé.** La fonction calculait la cargaison,
retirait la caravane du monde, encaissait les vingt-deux points de réputation et
la rancune nommée des deux villes qui l'attendaient — puis retournait l'objet
`pris` à l'appelant. `main.js` le relayait, l'interface affichait « Caravane
détroussée » et le jetait. **On gagnait l'embuscade et l'on repartait les mains
vides**, sans qu'aucun compteur ne le dise. La marchandise va maintenant dans le
sac de ceux qui se sont battus, et ce qui n'y tient pas reste sur place — 34 %
d'une cargaison, mesuré, ce qui donne enfin un usage à l'attelage.

**Et pourtant ce n'est pas un métier.** Le reste de la mesure est net, et c'est
de la géométrie, pas de l'économie :

    381 caravanes circulent par partie sur la carte entière
     10 heures-caravane passent sur une case donnée, en 4 000 heures
      2 h pour qu'une caravane franchisse une région — 14 h pour une colonne

Elles sont **sept fois plus rapides que vous** : ni poursuite ni interception.
Et se poster ne sert à rien — un bot qui a guetté 3 150 heures au carrefour le
mieux relié de la carte, quatre-vingts pour cent de sa partie, a croisé
exactement autant de caravanes qu'un bot qui vaquait à ses affaires, et fini à
444 crédits contre 4 128. Le trafic n'est pas rare, il est dilué sur 432 régions.

Le profil se réduit donc à ce que la géométrie permet : vivre normalement et
prendre ce qui passe. À n=60, ça donne 3 859 crédits contre 4 128 — trois
caravanes par partie, 596 crédits de marchandise, et une réputation qui paie la
différence. **C'est une occasion, pas une voie**, et le commentaire du fichier
qui promettait « c'est rentable » a été corrigé pour dire ce que la mesure dit.

Le titre de *Seigneur de guerre* reste donc le seul des onze qu'aucun profil ne
décroche. Il demande quarante victoires ; on n'en compte qu'une quinzaine par
partie, toutes voies confondues.

### Un bot qui commerce, et le camp qui mangeait sa cargaison

`MARCHAND=1` fait le geste du métier que personne ne faisait : acheter là où
c'est abondant, porter, revendre là où ça manque. Le bot par défaut vend ce
qu'il ramasse dans la première ville venue et n'achète que ce qu'il consomme.

Trois erreurs de raisonnement, chacune corrigée par la mesure, et un vrai bug.

**Le prix affiché est celui de la première unité.** Le cours bouge à chaque
unité de la transaction : on le fait monter en achetant et on l'écrase en
vendant. Un lot dimensionné sur le prix affiché part perdant — mesuré en
chargeant le sac à ras bord : **3 098 crédits engagés pour 1 816 encaissés,
41 % de perte**. On estime maintenant la recette au cours de mi-parcours, des
deux côtés, et l'on essaie plusieurs tailles de lot : la plus grosse n'est
presque jamais la meilleure.

**Une ville factice n'a pas de notables.** Recalculer un prix d'achat sur un
objet `{pop, stock, unrest}` faisait renvoyer NaN à `prixJoueur`, qui lit les
notables pour la marge du marchand — et NaN passe silencieusement toutes les
comparaisons, si bien que le bot choisissait n'importe quelle affaire. On met à
l'échelle le vrai prix au lieu d'en fabriquer un.

**Et le camp avalait la cargaison.** En passant chez soi, le bot vide son sac
dans l'entrepôt. Il y rangeait donc la marchandise qu'il venait d'acheter, puis
repartait la livrer les mains vides. Ça se lisait comme une erreur de prix — le
marchand n'encaissait que la moitié de ce qu'il visait, **à toute distance et
avec du renseignement frais**, ce qui ne pouvait pas être un effet du marché.
Le même bug mangeait les lots promis du bienfaiteur : ses services honorés
passent de 109 à 125, et le titre tombe désormais 8 fois sur 30.

Une fois tout cela réparé, le négoce paie : **+21 % de marge** sur la mise, à
n=60. Mais il ne nourrit pas son homme — 2 485 crédits en fin de partie contre
4 128 pour le bot honnête, parce qu'il ne trouve que trois cargaisons par
partie. La raison n'est pas la marge, c'est la concurrence : **381 caravanes
circulent par partie et vont précisément combler les pénuries qui font monter
les prix.** Le monde arbitre tout seul, sept fois plus vite que vous. Le
marchand ramasse ce qui reste.

C'est le premier profil dont la conclusion n'est pas « il y avait un défaut » :
le commerce fonctionne, il est simplement d'appoint. Le renseignement, lui, ne
pèse presque rien une fois le reste corrigé — 22 à 30 % de marge qu'on décide
sur un relevé de deux heures ou de quatre cents, ce qui est dans le bruit.
`FRAICHEUR=` et `PORTEE=` restent en place pour qui voudra rouvrir la question.

### Onze titres sur onze

Trois des onze titres de la chronique n'avaient jamais été décrochés par aucune
façon de jouer. Le banc sait maintenant dire ce que la chronique relit, en
distribution plutôt qu'en moyenne, et les trois cas se sont expliqués autrement
que prévu.

    sur 60 parties          victoires        captifs livrés     services
    bot par défaut      méd 9 · p90 21      méd 6 · p90 25    méd 2 · p90 7
    négrier            méd 14 · p90 41      méd 1 · p90 12    méd 1 · p90 4
    carriériste        méd 11 · p90 27      méd 8 · p90 27    méd 3 · p90 9

**Seigneur de guerre** demandait quarante victoires *et* vingt-cinq de
compétence. Ce n'étaient pas les quarante victoires qui bloquaient — un négrier
les atteint dans une partie sur dix — mais la compétence, parce qu'elle lisait
la **moyenne de l'escouade**. Celle-ci est tirée vers le bas par les recrues
fraîches qui remplacent les vétérans morts : le banc la mesure entre 15 et 18
quelle que soit la voie, jamais 25. Les meilleurs bretteurs, eux, montent à 37
ou 44. Un chef de guerre se juge à son arme, pas à la moyenne de ses hommes.

**Chasseur de primes** demandait quinze brigands livrés, et tombait dans une
partie sur quatre — quelle que soit la façon de jouer. Livrer est ce que tout le
monde fait de ses prisonniers faute de mieux : le titre nommait une habitude, pas
un choix, et il masquait des titres qu'on avait cherchés. Le seuil passe à
vingt-cinq, le neuvième décile de ce qui arrive tout seul, et il descend sous le
bienfaiteur.

**Bienfaiteur** avait été traité la veille : remonté au-dessus du bâtisseur et de
l'officier, seuil ramené de douze à six.

Le résultat, sur sept profils × 60 parties : **les onze titres tombent au moins
une fois, et aucun ne tombe par habitude.** Bâtisseur et Vagabond restent les
plus fréquents, ce qui est juste — avoir un toit et avoir marché sont ce qu'on
fait par défaut.

### Ce qu'on fait de ses morts

`justice.js` demandait ce qu'on fait des gens qu'on n'a pas tués. Voici la
question jumelle, et elle est plus dure, parce qu'il s'agit des siens.

Jusqu'ici un mort restait dans la colonne, la mention MORT à côté de son nom,
pour toujours. Il ne coûtait rien, ne pesait rien, ne posait aucune question —
alors que c'est le seul moment du jeu où l'escouade doit choisir entre ce qui
l'arrange et ce qu'elle se doit.

    Enterrer     rien en échange. La bande se resserre.        +4 cohésion
    Dépouiller   ses armes, son armure, ses greffes            −3
    Aux bêtes    26 de biomasse, s'il y a un attelage         −11
    Manger       18 rations, et le moral de tous descend      −24
    Vendre       ses organes, là où l'on achète des vivants   −13, et ça se sait

Le trafic d'organes suit la loi sur l'esclavage : là où l'on achète des hommes
vivants, on ne s'embarrasse pas des morts. Le prix dépend de ce qu'il reste
d'intact et des greffes qu'il portait. Les factions qui l'interdisent chez elles
l'apprennent, comme pour les vivants qu'on vend.

Ce qui force la décision n'est écrit nulle part, et c'est le point : **un corps
qu'on traîne ralentit la colonne et pèse sur le moral de ceux qui le portent**,
un peu plus à chaque heure. Rien n'oblige à trancher ; on peut garder ses morts
trois semaines. On n'en a simplement pas envie.

Dépouiller est la seule issue qui ne referme rien : on reprend le matériel, le
corps est toujours là, et il faudra bien en décider.

Le bot du banc enterre, après avoir repris l'équipement — la voie honnête,
comme il livre ses prisonniers au lieu de les vendre. Une partie ordinaire y
passe une fois, un négrier trois.

### Un coffre en ville, et « posséder » qui veut dire quelque chose

Tout ce qu'on possède tenait dans deux endroits : le sac, borné par ce que les
gens portent, et l'entrepôt de l'avant-poste, qui est à un seul point du monde
et qu'on n'a pas forcément. Entre les deux, rien — et le banc avait chiffré ce
que ça coûte : **34 % de la cargaison d'une caravane détroussée reste sur place
faute de bras**, un marchand ne charge que ce que son escouade tient, et l'on
brade en ville ce qu'on aurait gardé.

    Louer     70 cr le mois, 140 kg      partout où il y a une ville
    Acheter   1 300 cr, 260 kg           là où l'on vous laisse posséder

Le loyer se prélève tout seul. Qui ne peut plus payer voit le bailleur se
servir dans le coffre, au prix du gros — mais **jamais plus de la moitié de ce
qu'il garde** : un mois impayé ne vide pas un coffre, sinon la sanction est sans
commune mesure avec la dette et l'on perd trois mois de butin pour soixante-dix
crédits.

Acheter, en revanche, dépend du régime de la ville, et c'est la première fois
que la politique d'un lieu change ce qu'on peut y faire plutôt que la couleur de
sa fiche : **une faction ne vend pas de murs à un inconnu** — il faut quarante
d'estime — tandis qu'**une ville libre n'a personne en position d'interdire quoi
que ce soit**. C'est le crochet auquel des régimes plus détaillés pourront
s'accrocher, s'ils changent des choses aussi concrètes que celle-là.

Le contenu appartient au joueur, pas au monde : il vit dans `state.player`,
comme les crédits.

### Le garde-fou de performance mesurait surtout le bruit

Le même code de tick se lisait **82 µs le matin et 128 µs le soir** sur cette
machine, et l'étalon ne bronchait pas. L'hypothèse qu'on traînait — l'étalon est
de l'arithmétique pure, le tick alloue, donc un étalon qui alloue suivrait mieux
la contention — a fini par être mesurée. **Elle est fausse.** Quatre cœurs,
trois brûleurs mémoire en fond :

| | au repos | sous charge |
|---|---|---|
| étalon arithmétique | 23,6 ms | 24,4 ms (+3 %) |
| étalon qui alloue | 9,1 ms | 9,3 ms (+2 %) |
| tick, une seule passe | 104 µs | 220 µs (+112 %) |
| tick, minimum de cinq passes | 78 µs | 81 µs (+4 %) |

Aucun étalon ne rattrape une machine chargée. Ce qui l'absorbe, c'est de prendre
le **minimum de plusieurs passes, chacune précédée d'une chauffe** : sans
chauffe on chronomètre la compilation du moteur, sans le minimum on chronomètre
l'ordonnanceur. Avec les deux, la même mesure rend 78 à 84 µs au repos comme
sous trois brûleurs, et le plafond est descendu de 145 à 110 — l'ancien,
calé sur du bruit, aurait laissé passer un tick qui double.

L'endroit compte aussi, et c'est contre-intuitif : lancé en fin de suite,
l'étalon tourne **quatre fois plus vite** qu'au démarrage, parce que huit cents
assertions ont donné au compilateur toutes les occasions d'optimiser le
générateur aléatoire. Étalon et tick sont donc relevés ensemble, en tête.

Une erreur en cours de route, gardée ici parce qu'elle est instructive : la
première mesure « propre » annonçait 41 µs, moitié moins. Elle appelait
`avancer(state, 3000)` et divisait par 3 000 — or `avancer` s'arrête à
l'extinction de l'escouade, qui survient à la 1 095ᵉ heure sur cette graine. Une
mesure divise par le travail **fait**, pas par le travail demandé, et un chiffre
deux fois trop beau mérite qu'on cherche pourquoi avant de le publier.

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
réglage. Ses interrupteurs (`SANS=`, `VAGABOND=1`) servent à couper un système à
la fois : c'est la seule façon d'attribuer un déséquilibre à sa cause plutôt
qu'à une intuition. Le mode vagabond — voyager autant, sans prendre un seul
contrat — est le témoin qui a innocenté les contrats et accusé la route.

Ses profils (`COLON=1`, `CARRIERE=1`, `NEGRIER=1`, `BIENFAITEUR=1`, `PILLARD=1`,
`MARCHAND=1`)
font autre chose : ils font jouer une voie au lieu d'un système. Un bot unique
mesure très bien ce qu'il fait et très mal ce qu'il ne fait pas — le colon a
révélé que personne n'apportait de matériaux aux hameaux, le carriériste qu'un
ordre de frappe sur trente était honorable, le négrier que le marché aux hommes
ne s'ouvrait jamais, le bienfaiteur qu'on contractait une dette en traversant
une ville pour un remords qui n'avait pas lieu d'être, le pillard que le butin
d'une embuscade gagnée n'allait nulle part, le marchand que le camp avalait la
cargaison qu'on venait d'acheter. Aucun des six ne se voyait dans les
chiffres du bot par défaut, et c'est la leçon la plus solide du banc : **ce
qu'un bot ne joue pas, personne ne le mesure.**

Corollaire appris à ses dépens : **un compteur qui compte des coups d'œil
ment.** « 4 527 demandes croisées, 102 honorées » a servi de constat pendant des
mois ; en demandes distinctes c'était 397 pour 102, soit un quart et non deux
pour cent. Un instrument se vérifie avant de conclure avec.

### Le comptoir, et le convoi qui n'arrivait jamais

Le comptoir met fin à une règle qui tenait depuis le premier jour : tout le
commerce du jeu demandait d'y aller. Il coûte donc cher — la recherche
*Cotation*, qui exige la Cryptographie, un bâtiment au camp, et l'une des deux
portes : porter les couleurs d'une faction qui a ouvert sa bourse, ou valoir
quarante d'estime à ses yeux. La seconde existe pour que la commune autonome ne
soit pas condamnée à tout porter à dos d'homme ; elle se paie huit points de
commission de plus.

Ce qui ne s'achète jamais, en revanche, c'est la certitude qu'un convoi arrive.
Un convoi qu'on ne peut pas perdre serait un téléporteur, et toute la géographie
du jeu s'annulerait avec lui. On paie donc pour réduire le risque : sur
vingt-quatre livraisons traversant des régions à 0,25 de danger,

    sans escorte     5 arrivées sur 24
    escorte armée   19 arrivées sur 24

et jamais 24. On peut aussi embarquer une escouade, qui ne compte que tant
qu'elle est sur la même case que le convoi — il faut vraiment faire la route
avec.

Deux défauts trouvés par ces mesures, et aucun des deux n'aurait rougi tout
seul. Le premier : `vivante()` exige un drapeau, ce qui est juste pour une ville
et faux pour un camp indépendant — **tout convoi adressé au joueur disparaissait
au premier tour**, sans livraison, sans paiement, sans une ligne au journal. Le
second : `arriver()` prenait `state` en dernier argument facultatif, et l'un des
deux appels l'avait oublié ; la cargaison partait alors dans le stock d'une
ville au lieu de l'entrepôt. `state` est le premier paramètre maintenant. **Un
paramètre qu'on peut omettre finit par l'être.**

### « Pourquoi ça se revide tout seul ? »

Un joueur remplit les postes de son avant-poste ; l'heure suivante, ils sont
vides. Il recommence. Trois causes, sans rapport les unes avec les autres, et
aucune n'était visible :

**Un.** Deux fonctions comptaient les bras disponibles, et pas de la même façon.
`manoeuvres` arrondissait la population, `reajusterPostes` la tronquait. À douze
habitants et six dixièmes, la première annonçait une main libre, le joueur la
plaçait, la seconde la renvoyait chez elle. Indéfiniment. Les deux comptes
étaient justes chacun de son côté — c'est bien le problème. **Deux nombres
écrits séparément finissent toujours par diverger** ; il n'y en a plus qu'un,
`brasDisponibles`.

**Deux.** L'embauche automatique récrivait `base.postes` de fond en comble
toutes les vingt-quatre heures. On réglait, on regardait ailleurs, et le
lendemain tout était revenu comme avant. Un interrupteur existait pour la
couper, mais il fallait avoir déjà compris le problème pour aller le chercher.
Toucher un poste coupe désormais l'automatique, et l'écran le dit.

**Trois.** `ORDRE_EMBAUCHE`, la liste que suit cette embauche automatique,
oubliait quatre métiers — bassinier, semeur, terraformier, courtier, c'est-à-dire
les quatre plus récents. Un métier absent de cette liste n'est jamais pourvu par
personne : les bassins de culture affichaient `0/9` à perpétuité. Ça ne plantait
pas, ça ne faisait rien. Un test vérifie maintenant que la liste est complète,
parce que le prochain métier ajouté aurait connu le même sort.

Restait à séparer deux idées qu'on avait confondues. `base.postes` est
maintenant une **consigne** — ce que le joueur a demandé — et rien ne la réécrit
sauf une démolition. Ce qui est réellement tenu se calcule à la lecture, et le
manque de bras se répartit **au prorata** : personne ne tombe à zéro pendant que
son voisin reste plein, et le réglage se retrouve intact dès que les bras
reviennent. L'écran affiche les deux nombres, et nomme la différence.

Même travail sur les chaînes, pour la même raison — « on voit pas toujours ce
qui a besoin de quoi, qui produit quoi ». Chacune affiche ce qu'elle consomme et
ce qu'il en reste, et nomme *un* empêchement quand elle ne tourne pas. Un seul :
trois alertes empilées, c'est un mur qu'on ne lit pas. Et c'est l'arrêt franc
qui passe devant le ralentissement — un bac vide ne produit rien, un camp à
80 % de courant produit à 80 %. Annoncer le second quand c'est le premier qui
bloque envoie le joueur réparer ce qui marche.

### Six drapeaux qu'on choisit pour ce qu'ils donnent

La première version des six services distribuait des compromis : celui-ci paie
mieux mais protège moins, celui-là arme mieux mais paie mal. Verdict du joueur,
et il avait raison : « y aura pas une seule milice qui sera intéressante, il
faudrait qu'elles le soient toutes mais avec des extras propres à chacune
d'elles. » Un compromis entre six options qu'on ne peut pas comparer avant de
les avoir vécues n'est pas un choix, c'est une loterie qu'on regrette trois
cents heures plus tard.

La base est donc **identique** pour les six — mêmes grades, même remise, même
solde, mêmes rations, même palier d'armurier. Ce qui change, c'est un seul
avantage par couleur, qui ne s'obtient nulle part ailleurs :

| Drapeau | Ce qu'eux seuls donnent | Dès |
|---|---|---|
| Consortium Hexa | le comptoir s'ouvre sans estime et sans surtaxe d'étranger | Agent |
| Milice de Cendre | une colonne vient défendre votre avant-poste assiégé | Lieutenant |
| Communes Libres | des gens viennent s'installer deux fois plus vite, et l'on s'entasse | Affilié |
| Les Rouilleurs | vos convois voyagent escortés sans que l'escorte se paie | Agent |
| Église du Signal | vos recherches vont un tiers plus vite | Agent |
| Syndicat Ombrelle | plus aucune prime ne se met sur votre tête | Affilié |

On ne choisit pas ce qu'on sacrifie, on choisit ce qu'on gagne. Et l'écran le
dit **avant** l'engagement, sinon rien de tout ça ne sert : un avantage qu'on
découvre après avoir juré n'a pas participé à la décision.

Deux réglages morts corrigés au passage, tous deux du même genre — déclarés,
jamais lus :

**`cupidite`** vivait dans la table des factions depuis le premier jour sans
être branchée nulle part. Sept nombres choisis avec soin — 0,95 pour le
Syndicat, 0,3 pour l'Église — qui ne faisaient rien. Mesuré avant sur quatre
mondes et trois cent vingt-neuf villes, l'écart achat/vente allait de ×1,72 à
×1,80 **sans le moindre rapport avec la cupidité**, le Syndicat le plus âpre
affichant même l'écart le plus doux de tous. Après : ×1,65 chez l'Église,
×1,87 au Consortium, dans l'ordre. L'écart reste modeste à dessein — c'est le
caractère du marchand qu'on doit apprendre à lire, pas une constante par
drapeau.

**L'érosion de l'estime** était un dixième par jour, quel que soit le niveau.
Mesuré en ne faisant ni bien ni mal — le cas du joueur qui explore, c'est-à-dire
les premières heures de toutes les parties — l'estime de départ était
intégralement partie en huit mois : 28 → 4, 28 → 2, 42 → 18. On commençait reçu
quelque part et l'on devenait un inconnu sans avoir rien fait de mal. Elle est
maintenant dégressive : plein tarif au-dessus de trente, de moins en moins vite
en dessous. Même mesure après : 28 → 12,6 et 28 → 11,7. Une gloire se défend
encore ; le premier service rendu ne s'évapore plus.

Cette mesure-là a d'abord menti, et pour une raison qui vaut d'être notée :
l'estime semblait cesser de baisser au bout de deux mois pile. Ce n'était pas
un plancher, c'était l'escouade qui mourait de faim — un `tick` sur une partie
finie ne fait plus rien. **Une courbe qui devient plate mérite qu'on demande si
c'est le phénomène qui s'arrête ou l'instrument.**

### Un nombre de pixels n'est pas une position de lecture

L'écran se reconstruit d'un bloc plusieurs fois par seconde, et l'on rendait
ensuite au conteneur son `scrollTop` d'avant. Ça paraît suffisant. Ça ne l'est
pas : dès qu'un encart au-dessus du point de lecture change de hauteur — une
alerte qui apparaît, un secteur qu'on découvre, une ligne de plus au journal —
les mêmes sept cents pixels ne désignent plus le même texte.

Mesuré, seize relevés par écran à ×60 :

| écran | défilement déplacé | **texte lu déplacé** |
|---|---|---|
| carte | 15/16 | 13/16 |
| journal | 0/16 | 14/16 |

Le journal est le cas instructif : le défilement ne bougeait pas d'un pixel, et
pourtant on ne lisait plus la même chose une fois sur deux, parce que le fil
grandit par le haut. **La bonne mesure n'était pas le défilement, c'était le
texte.**

On mémorise donc *ce qu'on lisait* — l'encart, ou l'entrée de journal, avec son
décalage — et on le remet où il était. Après : 0/16 sur les deux écrans, le
défilement bougeant beaucoup, ce qui est précisément son travail.

Une limite subsiste, et elle est irréductible : si l'on lisait tout en bas et
qu'un encart apparaît au-dessus, garder le texte immobile demanderait de défiler
au-delà de la fin du document. Le navigateur borne. Vue à l'instrument, ancre
calculée à 937 px et appliquée à 841, qui était le maximum possible. Le premier
test écrit accusait l'ancre de ce défaut-là ; c'était le test qui lisait au ras
du bas.

Deux effets de bord gagnés au passage : on ne réécrit plus le DOM quand le texte
produit est identique — ce qui supprime le scintillement et cesse d'interrompre
l'inertie du défilement sur téléphone — et les encarts se replient, d'un clic sur
leur titre, le pli survivant au rechargement. Le repli se fait en un seul endroit
à partir du titre de chaque encart, si bien qu'un encart écrit demain sera
repliable sans qu'on y pense.

Reste la question qui allait avec : **quel texte répond au doigt ?** Les boutons
se voyaient, ils ont un cadre ; un `<summary>` qui déplie une fiche ressemblait
trait pour trait à une ligne de texte. Une seule convention, tenue partout : ce
qui se clique porte un chevron, qui tourne quand c'est ouvert. Rien d'autre dans
l'interface n'en porte, si bien que sa présence répond à la question — et un test
vérifie les deux sens, que tout ce qui se clique en porte un et que rien
d'inerte n'en porte.

Corollaire trouvé le lendemain, et qui aurait dû l'être en même temps : la
modale avait le même défaut, en pire. Elle se réécrivait entièrement à chaque
rafraîchissement, `.boite` — le conteneur qui défile — étant détruite et refaite
plusieurs fois par seconde. Un élément neuf a un défilement à zéro : on ouvrait
« Qui vit ici », on descendait dans la liste, et l'on était remonté tout en haut
quelques secondes plus tard. Mesuré avant correction : 400 px, puis 0, puis 0 à
chacun des dix relevés suivants. **Corriger un conteneur qui défile sans
regarder les autres, c'est corriger la moitié d'un défaut.**

### Une bourse qu'on ne voyait pas

La couche des bourses tournait entièrement en coulisse : des factions ouvraient
des marchés communs, en branchaient les cours les uns sur les autres par des
accords, une guerre débranchait le tout — et le joueur n'en voyait rien. Il ne
le découvrait qu'en montant un comptoir, et seulement pour le réseau avec lequel
il traitait. Or ce mécanisme décide des prix de la moitié de la carte.

**Un mécanisme qu'on ne voit pas n'existe pas pour celui qui joue.** L'écran
Monde montre donc, à côté des routes marchandes, chaque réseau : qui l'a ouvert,
qui s'y est accordé, combien de villes il tient et quelle part de la carte ça
représente, et l'écart moyen de son cours au prix de base — un seul nombre qui
dit « cher » ou « bon marché », plutôt que dix cours à comparer de tête.

Un test vérifie au passage que le cours ne moisit pas : après six cents heures
de jeu, la cotation publiée doit dater de moins d'un jour. Un panneau qui
annoncerait « publié il y a huit jours » serait un mécanisme en panne qu'on
prendrait pour un mécanisme lent.

### Ce qu'une barre repliée doit dire

Un encart replié qui ne montre que son titre ne sert à rien : on le rouvre pour
lire le seul chiffre qu'on cherchait, puis on le referme. Deux fentes dans la
barre, et elles ne servent pas à la même chose. `.droite` est ce qui compte assez
pour être visible tout le temps. `.resume` est le tableau de bord : caché quand
l'encart est ouvert — le contenu le dit mieux, en détail — et montré quand il
est replié.

Ce que ça donne sur l'écran BASE, tout entier tenant dans une hauteur d'écran :

    AVANT-POSTE            CANYONS G4
    CHAÎNE DE L'AUTONOMIE         2/4
    CONSIGNES            2 EN MARCHE     à sec : générateur, hydroponie
    MÉTIERS       0 MANŒUVRE(S) SUR 4    cultivateur 2 · mécanicien 1 · opérateur 1
    FILE DE CONSTRUCTION          0/5    rien en chantier
    BÂTIMENTS               3 MONTÉS     générateur 1 · hydroponie 1 · antenne 1
    RECHERCHE                     0/3    aucune recherche en cours
    STOCK                   463 / 800    polymère 124 · minerai 103 · ferraille 91
                                         à zéro : biomasse, carburant, isotope, medkit

Le résumé des chaînes ne liste pas ce qui tourne : il nomme ce qui est **à sec**,
parce que c'est la seule chose sur laquelle on peut agir. Celui du stock donne
les trois plus gros tas et, en rouge, ce qui est tombé à zéro.

Deux tests gardent la promesse : qu'aucune barre repliée ne se réduise à son
titre, et qu'aucun résumé ne répète ce que la partie droite dit déjà. Le second
a servi tout de suite — la tactique s'annonçait deux fois.

Et le premier écrit de ces résumés a cassé le pli : la clé d'un encart se
calcule à partir de son titre débarrassé de ce qui bouge, et le résumé n'en
faisait pas partie. La clé changeait donc à chaque fois que le résumé changeait,
si bien que le pli ne tenait plus et que l'ancre de défilement cherchait un
encart qui n'existait plus sous ce nom. **Une identité calculée doit exclure tout
ce qui varie — et la liste de ce qui varie s'allonge à chaque fonctionnalité.**

### Le même défaut, deux fois, à trois jours d'intervalle

`capaciteStock(base)` a gagné un paramètre `state` facultatif : les magasiniers
qui agrandissent l'entrepôt sont ceux qui tiennent vraiment leur poste, ce qui
suppose de savoir si l'escouade prête la main. Les appels de l'interface l'ont
reçu ; celui du dépôt ne l'a pas eu.

L'écran annonçait **5 504**, le dépôt refusait à **3 200**, et disait « Rien à
déposer, ou entrepôt plein » — qui était faux, et qui le paraissait. C'est
exactement ce qui venait d'arriver à `arriver()` dans les caravanes, où le même
`state` facultatif en dernière position avait été oublié par un appel sur deux.

`state` est le premier paramètre et il est obligatoire : l'oublier fait tomber la
fonction au lieu de rendre un second nombre. **Un paramètre qu'on peut omettre
finit par l'être** — et un garde qui échoue bruyamment vaut mieux qu'une valeur
par défaut plausible.

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
