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
    notables.js       les gens qui comptent dans une ville, leur état, leurs effets
    dirigeants.js     chefs de faction, tempéraments, légitimité, buts de guerre
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
