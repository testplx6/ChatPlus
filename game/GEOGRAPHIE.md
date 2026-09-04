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

### G2 — la carte doit avoir des noms

« Friche K5 » ne se retient pas ; « le Gué des Cendres » se retient. Le
générateur existe déjà (`nomVille`, deux tables de mots). Nommer les cases
remarquables — les passages de G1, les sites, les hauteurs — coûte peu et
touche directement ce que le propriétaire appelle « un gros problème du jeu » :
« la colonne est passée au Gué des Cendres » se lit, « région 217 » non.

### G3 — le climat doit avoir une géographie

Une seule météo pour 432 cases, c'est un ciel de carton. Des climats régionaux
rendraient les routes **saisonnières** : le marais impraticable aux pluies, le
désert acide l'été, un col fermé l'hiver. La meilleure route changerait avec
les mois, donc le territoire se renégocierait tout seul, sans qu'aucun agent
n'ait à le vouloir.

C'est le mariage naturel de T1 : un voyageur qui pèse ce qu'il craint doit
craindre des choses qui changent, sinon il calcule une fois pour toutes.

### G4 — la richesse doit être située

Remplacer (ou doubler) le scalaire par des **gisements** : nommés, localisés,
épuisables — `fouille` sait déjà épuiser une case. Une veine d'alliage, une
nappe de carburant, une source d'eau claire. Alors un endroit précis vaut mieux
qu'un autre, et l'on se bat pour lui plutôt que pour de la surface. C'est aussi
ce qui donnerait un sens à `TERRITOIRE.md` B3, que la revue de game master
déconseille de prendre en premier — et cette piste dit pourquoi : B3 sans
gisements, c'est un revenu de plus ; B3 avec gisements, c'est une carte
disputée.

### G5 — la carte se souvient

L'amorce existe : une ville morte laisse un site à fouiller (`economy.js:2136`),
une embuscade laisse du danger sur la région (`caravanes.js:1382`). L'étendre —
un champ de bataille, un charnier, un camp abandonné, une route mal famée qui
garde sa réputation — fait de la carte **l'archive du monde**. C'est le seul
contenu qui se fabrique tout seul, sans que personne l'écrive, et il grandit
avec la partie.

### G6 — voir loin

Le brouillard est déjà « le meilleur qu'on connaisse en jeu textuel » (revue de
`REVUE.md`), mais il ne doit rien à la géographie. Avec du relief (G1), une
hauteur **voit** les cases alentour : tenir un sommet devient une valeur
d'information et non de force, et le renseignement s'accroche enfin au sol.

### G7 — la frontière suit la géographie

Une fois qu'il y a des lignes (G1) et des climats (G3), l'attribution initiale
des factions peut épouser le relief plutôt que se tirer au sort pondéré
(`attribuerFactions`, `world.js:300`). Les pays se formeraient le long des
bassins, et la carte politique deviendrait **lisible** : on comprendrait au
premier regard pourquoi la frontière est là.

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
