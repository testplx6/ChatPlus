# Géographie — enrichir le terrain, la carte, le monde physique

**Ouvert en septembre 2026, sur demande du propriétaire** : « tout est bon dans
ce plan c'est le minimum, et trouve d'autres façons d'enrichir le terrain, la
géographie, la carte ». Ce document est un **relevé de l'existant et un
catalogue instruit** : rien n'est engagé, rien n'est chiffré, chaque
affirmation est vérifiée dans le code.

Le chantier `TERRITOIRE.md` traite de qui possède quoi. Celui-ci traite de ce
qu'il y a **sous** la propriété : le sol, l'eau, le ciel, les noms.

---

## 1. Ce que la carte est aujourd'hui

Une grille 24×18 — 432 cases, quatre voisins chacune. Chaque case porte : un
biome, une richesse, un danger, un état de fouille, une insécurité, une piste,
parfois une colonie, parfois un site, et depuis peu un contrôle et une garde.

Ce que ça donne, dit franchement :

- **Neuf biomes, tous traversables**, de coût 3 à 7 (`data.js`). Le pire terrain
  coûte 2,3 fois le meilleur. **Rien n'est infranchissable.**
- **La génération ne produit que des taches.** `genererBiomes` est un Voronoï
  bruité : quelques noyaux par biome, chaque case prend le plus proche. Une
  telle génération ne fabrique jamais une **ligne** — ni chaîne, ni faille, ni
  fleuve, ni littoral. Or ce sont les lignes qui font une géographie : elles
  séparent, elles canalisent, et elles créent des points de passage.
- **Le monde naît sans une seule route.** La seule piste initiale est un halo
  autour de chaque ville (`world.js:250` : 0,55 sur la case, 0,30 sur les
  quatre voisines) — encore des taches. Aucune route ne relie deux villes ; il
  faut trois cents heures de trafic pour en creuser une.
- **Une case sans ville n'a pas de nom** : `nomRegion` rend « Friche K5 »
  (`world.js:891`). Un lieu-dit n'existe pas.
- **Le climat n'a aucune géographie** : `conditions(world, t)` rend UNE saison
  et UNE météo pour la carte entière (`climat.js:186`). Il ne pleut jamais ici
  sans pleuvoir là-bas.
- **La richesse est un scalaire** tiré une fois pour toutes, ×0,65 à ×1,45
  (`world.js:96`). Aucune ressource n'est située : un gisement d'alliage
  n'existe pas, il y a seulement des cases un peu plus généreuses que d'autres.

## 2. Le diagnostic en une phrase

**La carte est un décor uniforme à texture variable.** Elle a des couleurs, pas
de structure — et une structure, c'est ce qui fait qu'un endroit vaut mieux
qu'un autre, donc qu'on se batte pour lui, donc qu'il ait une histoire.

## 3. Les sept pistes

### G1 — des lignes, pas des taches — **LIVRÉ, septembre 2026**

Ajouter à la génération **une structure linéaire** : une faille, une chaîne, un
fleuve mort, une ancienne autoroute qui traverse la carte. Une seule suffit à
tout changer, parce qu'une ligne fait trois choses à la fois :

- elle **sépare** — c'est la géographie dure que réclame `TERRITOIRE.md` E1 ;
- elle **se franchit en des points** — et ces points sont exactement les
  ouvrages de T2 : le pont, le gué, le col. On ne tient plus une case au
  minuteur, on tient un passage ;
- elle **canalise** — une vieille autoroute naît déjà damée, et les convois la
  prendront d'eux-mêmes puisque `chemin` relit la piste.

C'est la piste la plus rentable du document : elle donne d'un coup à E1, T2 et
T3 leur objet physique.

**Ce qui a été livré : la Faille.** Une ligne brisée du nord au sud, de coût 40
là où un biome coûte 3 à 7, percée de trois ouvertures. Elle **contourne** les
villes et les Relais au lieu de les avaler — se contenter de sauter la ligne
laissait sept trous sur dix-huit et ne séparait plus rien —, si bien qu'une
ville de son bord en devient la gardienne sans qu'on ait rien eu à écrire pour
ça. On n'y bâtit pas, ni à la naissance du monde ni par un conseil ensuite. Et
elle se voit sur la carte : sans ça, le joueur constaterait que ses routes
s'allongent sans pouvoir dire pourquoi, ce qui est très exactement son grief.

Son dé lui est propre (`grainDe(graine, 'faille')`) : elle ne consomme pas un
seul tirage du flux principal, donc les biomes, les villes et les factions
d'une graine donnée restent exactement ce qu'ils étaient. Ajouter une structure
à la carte sans redistribuer le monde entier, c'est ce que le piège n°1 de
`CLAUDE.md` exige, et c'était loin d'être acquis.

**Ce que la mesure dit.** Personne ne force : deux cases de faille damées sur
six parties, et zéro dans le témoin — le trafic passe par les ouvertures, ce
qui est la définition d'un passage obligé. Le prix est réel et modeste, dans le
même sens sur deux jeux de graines indépendants : la population baisse de 3,7 %
et 4,7 %, les convois de 1,3 % et 5,7 %, la satiété de 0,982 à 0,974 et de
0,977 à 0,972. C'est ce que coûte une carte plus dure, et les dix gardes
tiennent.

`FAILLE.cout` = 40, et le balayage discrimine pour de bon cette fois : à 15 on
force la faille neuf fois au lieu de deux et le monde perd trente-quatre villes
(320 contre 354) ; à 80 plus personne ne passe et une ville sur quatre a faim
(91 affamées contre 68). Quarante est le point où la ligne est une barrière
sans être un mur.

### G2 — la carte doit avoir des noms — **LIVRÉ, septembre 2026**

« Friche K5 » ne se retient pas ; « le Gué des Cendres » se retient.

**Ce qui a été livré.** La Faille porte un nom, et chacun de ses passages — ces
trous dans la ligne par où tout le monde doit passer — porte le sien, tiré de
deux tables de mots (`PASSAGE_A`, `PASSAGE_B`) qui sont de la donnée : pour
ajouter un mot, on ajoute un mot. `nomRegion` rend ce nom, `lieuAvecCoord` le
garde avec sa coordonnée, et la carte cerne le passage d'un liseré. Le journal
dit donc désormais « la colonne est passée au Gué des Cendres » là où il disait
une coordonnée, ce qui touche directement le grief du propriétaire.

**Ce que la livraison a appris, et c'est le piège n°1 lu jusqu'au bout.** La
première version tirait les noms au fil du tracé, sur le dé de la faille. Elle
consommait donc des nombres au milieu d'une séquence existante et **déplaçait
la ligne elle-même** : le monde changeait, et il se trouve qu'il coûtait six
pour cent de tick de plus — assez pour faire tomber la garde de vitesse.
Corrigé en retenant les ouvertures et en les baptisant après le tracé, avec un
dé à elles. Un nom ne doit pas déplacer une montagne. Après : +0,9 % de tick,
c'est-à-dire rien.

Restent à nommer, si l'on veut aller plus loin : les sites, les ruines, et les
hauteurs quand il y en aura (G6).

### G3 — le climat doit avoir une géographie — **LIVRÉ, septembre 2026**

Une seule météo pour 432 cases, c'est un ciel de carton. Des climats régionaux
rendraient les routes **saisonnières** : le marais impraticable aux pluies, le
désert acide l'été, un col fermé l'hiver. La meilleure route changerait avec
les mois, donc le territoire se renégocierait tout seul, sans qu'aucun agent
n'ait à le vouloir.

C'est le mariage naturel de T1 : un voyageur qui pèse ce qu'il craint doit
craindre des choses qui changent, sinon il calcule une fois pour toutes.

**Ce qui a été livré.** `SAISON_BIOME` dit ce que chaque saison fait à chaque
sol : le marais se ferme aux grandes pluies (×2,1) et s'assèche à la saison
sèche (×0,7), le désert acide et les terres brûlées se referment l'été, les
canyons et la friche deviennent traîtres sous le ciel bas de l'hiver de cendre,
et les dalles urbaines drainent — on y circule mieux quand il pleut.
L'accalmie, elle, ne coûte rien à personne : c'est la saison où l'on voyage.
`coutTraversee` et le calcul d'itinéraire le lisent, le monde retient sa saison
(`world.saisonKey`) pour n'avoir pas à la redériver à chaque arête, et la table
est lue une fois par course.

**Ce que la mesure dit, et c'est mieux qu'espéré.** Le trafic se **concentre** :
818 cases damées deviennent 599, parce qu'une route qui tient toute l'année vaut
mieux que deux qui alternent. Et les postes encaissent **presque trois fois
plus** (5 777 → 15 773) : le commerce se range sur des couloirs stables, donc
sur ce que quelqu'un tient. Le monde y gagne huit villes et deux mille
habitants. Dix gardes tenues.

### G4 — la richesse doit être située — **LIVRÉ, septembre 2026**

**Ce qui a été livré.** `GISEMENTS` sème quatorze veines
sur la carte, chacune donnant une marchandise précise en plus de ce que le biome
donne déjà, chacune portant un nom — « la Veine du Sel Noir », parce qu'un
gisement est un endroit et pas une statistique. Dé propre, comme la Faille :
rien de ce qui précède ne bouge. Et les conseils **les convoitent** : quand une
case libre à portée touche une veine, c'est là qu'on fonde. Mesuré : **cinquante
veines sur quatre-vingt-quatre finissent sous une ville**, et la population monte
de trois pour cent — les villes sont mieux placées.

## Blocages — soldé

**G4 a buté sur le plafond de vitesse, et le propriétaire a payé.** Le rapport
de vitesse était bon
(×1,06 de la livraison précédente), mais le **plafond vécu** — le temps que
prend le rattrapage de dix-sept mille heures — atteint 4,22 s pour un budget de
4,20 s. Un demi pour cent, très en dessous du bruit de cette machine (±10 %),
mais un budget est un budget et il appartient au propriétaire.

Ce qui a été tenté avant d'en arriver là : le `toFixed` retiré de
`rendementRegion` (il fabriquait une chaîne à chaque heure de travail de chaque
case), la table du ciel construite une fois par saison au lieu d'une fois par
course, et le mémo des craintes dans `caravanes.js` (`departsDuReseau` pèse
9,2 % du tick et reconstruisait l'ensemble des guerres d'un pays à chaque
course). Les deux premiers ont payé ; le troisième est juste mais son gain est
sous le bruit — et la règle du dépôt est claire : un instrument plus bruité que
le gain cherché ne cherche rien.

Trois issues lui ont été portées : payer le budget, ouvrir un vrai chantier
d'optimisation, ou renoncer à G4. **Sa décision : payer maintenant, et ouvrir le
chantier quand la lenteur redeviendra sensible en jeu** — ce que la note de
`CIBLES.json` prévoyait déjà noir sur blanc. `plafondMs` passe de 4 200 à
4 600 ms, avec son motif ; `rapportMax` ne bouge pas, parce que c'est LUI qui
attrape les régressions — le plafond ne dit que ce que le joueur ressent au
rattrapage.

*(la description d'origine)* Remplacer (ou doubler) le scalaire par des
**gisements** : nommés, localisés,
épuisables — `fouille` sait déjà épuiser une case. Une veine d'alliage, une
nappe de carburant, une source d'eau claire. Alors un endroit précis vaut mieux
qu'un autre, et l'on se bat pour lui plutôt que pour de la surface. C'est aussi
ce qui donnerait un sens à `TERRITOIRE.md` B3, que la revue de game master
déconseille de prendre en premier — et cette piste dit pourquoi : B3 sans
gisements, c'est un revenu de plus ; B3 avec gisements, c'est une carte
disputée.

### G5 — la carte se souvient — **LIVRÉ, septembre 2026**

L'amorce existait : une ville morte laisse un site à fouiller, une embuscade
laisse du danger sur la région. Mais une bataille rangée et un poste rasé ne
laissaient rien — le monde oubliait tout ce qu'il faisait.

**Ce qui a été livré.** `marquerLieu` pose une trace, la date, et **nomme
l'endroit de ce qui s'y est passé** : une place qui tombe laisse un charnier
devant ses murs, un poste rasé laisse ses quatre murs bas. Le nom se dérive de
la case et de l'heure, sans un seul tirage — deux mondes de même graine
racontent la même histoire. Et une case ne porte **qu'une** histoire, la
première : sinon la dernière escarmouche effacerait la ville morte, et la carte
ne se souviendrait que d'hier.

**860 traces sur six parties** — un tiers de la carte finit par porter une
histoire, et chacune est un site qu'on peut aller fouiller. Le monde, lui, est
rigoureusement identique au témoin : mêmes villes, même population, mêmes
convois. G5 n'a rien changé au monde ; il l'a rendu lisible.

### G6 — voir loin

Le brouillard est déjà « le meilleur qu'on connaisse en jeu textuel » (revue de
`REVUE.md`), mais il ne doit rien à la géographie. Avec du relief (G1), une
hauteur **voit** les cases alentour : tenir un sommet devient une valeur
d'information et non de force, et le renseignement s'accroche enfin au sol.

### G7 — la frontière suit la géographie — **ESSAYÉ, MESURÉ, RETIRÉ**

Une fois qu'il y a des lignes (G1) et des climats (G3), l'attribution initiale
des factions peut épouser le relief plutôt que se tirer au sort pondéré. Les
pays se formeraient le long des bassins, et la carte politique deviendrait
lisible.

**Écrit, mesuré, puis retiré — et c'est le résultat qui compte.** L'attribution
a reçu un poids de voisinage : ce qu'un drapeau tient déjà à quatre cases pèse
dans le choix, et **de l'autre côté de la Faille ne compte pas**. Sans un
tirage de plus — `rng.weighted` en consomme un quoi qu'il arrive, on ne fait
que trier ce qu'on lui donne.

Ça marche, à la naissance : la part des villes ayant une sœur du même drapeau à
trois cases passe de **50 % à 81 %** (66 % à un poids de 2,5, 75 % à 6, 81 % à
14, 80 % à 30 — saturation nette), et les six pays cessent d'être tous à cheval
sur la Faille.

**Mais le monde rebrasse la carte.** Après six mille heures de conquêtes, de
sécessions et de fondations, l'écart tombe à **un point** : 78 % contre 77 %.
La carte politique de la fin de partie ne doit presque rien à celle du début —
ce qui est, en soi, une bonne nouvelle sur la vivacité du monde.

Le prix, lui, était réel : cinq décors de test profonds cassés (les coffres, la
maille, l'oubli de l'estime, la caisse d'une ville), parce que changer
l'attribution change *toutes* les villes de *toutes* les graines. Payer ça pour
un point à l'arrivée n'a pas de sens. **Le bon levier n'est pas l'attribution
initiale ; c'est ce qui fait bouger les frontières en cours de partie** — les
conquêtes, les sécessions, et le territoire lui-même. Autrement dit, ce que le
reste de ce document a livré.

## 4. L'ordre qui se défend

**G1 d'abord**, parce que E1, T2, G6 et G7 en dépendent tous et qu'aucun ne se
mesure sans elle. **G2 ensuite**, parce qu'elle est petite et qu'elle rend tout
le reste racontable. Puis G3 et G4, qui sont deux chantiers d'économie autant
que de carte, et se mesurent au banc contre les gardes `villes`, `satiete` et
`convois`. G5 et G7 sont des finitions : elles ne changent pas les règles,
elles changent ce qu'on comprend du monde.

**Attention, et c'est la même que pour T1** : toucher à la génération change le
monde entier à graine égale. Chacune de ces pistes se mesure au témoin, et les
dix gardes de `CIBLES.json` sont là pour attraper ce qui s'effondrerait.
