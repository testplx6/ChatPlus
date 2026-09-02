# Pistes — des idées consignées, pas des chantiers

Ce fichier garde ce qui a été dit et qui mérite de ne pas se perdre, sans
l'engager. Rien ici n'est décidé, rien ici n'est estimé. Une piste devient un
chantier quand elle passe par `METHODE.md` §9 et que le propriétaire l'ouvre.

---

## Le baron rebelle

**Consigné au chantier Maréchal, août 2026** (lecture L3, écartée) : un
Maréchal qui rompt part avec les colonnes qui lui sont fidèles et
plante son drapeau — le précédent moteur existe (`fonderColonne`,
factions.js). C'est le rêve « le joueur devient sa propre faction »,
un chantier entier, et il marche sur la parole donnée (rompre un
serment est exactement le sujet du chantier geôle/rançons). Rien n'y
est engagé.

---

## Multi-monde, ou un monde par joueur

**Dit par le propriétaire, août 2026** : « je pense qu'on pourra imaginer un
système multi-monde avec un niveau d'échange restreint entre les mondes qui ne
nécessitent pas un calcul constant sur chacun des mondes, ou alors un monde par
joueur en multi et chacun calcule le sien, à réfléchir ».

### Pourquoi ça vaut d'être noté maintenant plutôt que plus tard

Les deux variantes reposent sur la même propriété, et c'est celle qu'on est en
train de construire.

**Un échange restreint entre mondes est exactement le niveau de détail, d'un
cran plus haut.** `pasColonie` fait déjà ça à l'intérieur d'un monde : ce qui
est loin du joueur avance par tranches de vingt-quatre heures, ce qui est près
avance à l'heure, et les deux se parlent. Un monde voisin qu'on ne calcule que
de loin, c'est la même idée avec une maille encore plus grossière. Le chantier
`MAILLE.md` n'est donc pas un détour : c'est le préalable. Un monde qui **biaise
selon la maille** produirait, entre deux mondes couplés, une dérive qu'aucun des
deux ne pourrait attribuer à l'autre.

**Un monde par joueur, chacun calculant le sien, est le même problème sous une
autre forme.** Deux clients qui simulent « le même » monde doivent en sortir la
même chose. C'est déterministe ici — même graine, même suite de tirages, même
monde — mais ce déterminisme ne survit que si les deux avancent *de la même
façon*. Or aujourd'hui la maille dépend de la position du joueur : deux joueurs
placés ailleurs verraient deux mailles, donc deux mondes. C'est précisément le
défaut que `MAILLE.md` corrige, et c'est aussi pourquoi le lot 3b d'`INDIVIDUS`
comptait — le flux principal n'est plus consommé que par le climat, donc le
trajet d'un joueur ne décale plus les dés de personne.

### Ce qui est déjà en place et qui sert

- **`state.world` partagé, `state.player` et `state.base` privés.** La règle est
  tenue et vérifiée par test : le monde ne lit jamais le joueur.
- **Un flux de hasard par entité.** Chaque ville, chaque armée, chaque convoi
  a le sien ; les conseils et les acteurs se dérivent d'une graine. Déranger une
  ville ne déplace plus le hasard des autres — c'est ce qui permettrait de
  simuler des morceaux de monde séparément.
- **L'invariant comptable par faction.** Il dirait immédiatement si un échange
  entre deux mondes crée ou détruit de la monnaie.

### Ce qui manque, et qu'il faudra poser

- **Que s'échangent deux mondes ?** Des marchandises, des gens, de la monnaie,
  des nouvelles ? Chacun a un coût différent et des conséquences différentes sur
  l'invariant.
- **À quelle cadence ?** Un monde voisin avancé une fois par jour de jeu n'a pas
  les mêmes exigences qu'un monde avancé une fois par mois.
- **Qui fait autorité en cas de désaccord ?** Deux clients déterministes qui
  divergent d'un bit divergent ensuite pour de bon.
- **La monnaie entre mondes.** Le moteur cote déjà chaque monnaie et sait
  convertir. Un taux de change entre mondes serait le même objet — ou pas, et
  c'est à décider.

**Instruite en août 2026 : l'étude complète vit dans `MULTIJOUEUR.md` —
trois architectures, une voie proposée en trois crans, décisions au
propriétaire. Rien n'est engagé tant qu'il n'a pas tranché.**

## Plusieurs implantations, pas une seule base (question du propriétaire, août 2026)

« Il faudrait pouvoir créer plusieurs bases non ? Pourquoi une seule ? »
Consigné, non engagé — la performance passe devant.

L'état des lieux, tel que le code le dit aujourd'hui :

- `state.base` est un objet UNIQUE (créé par `creerBase`, `src/base.js`),
  référencé une centaine de fois dans le moteur et une trentaine dans
  l'interface. Fonder ailleurs (`fonderBase`) remet ce même objet à neuf : on
  ne double pas, on déménage — et le code le dit explicitement, parce qu'un
  second camp héritait autrefois des habitants et du dossier de ville du
  premier.
- Mais le joueur tient DÉJÀ plusieurs choses dans le monde : l'avant-poste
  reconnu devient une vraie colonie (`reconnaitreAvantPoste`), un chef de
  faction fonde des postes (`fonderPoste`, influence.js), on rattache une
  ville à un drapeau (`rattacherVille`), on déclare son indépendance, on tient
  des secteurs (`confierSecteur`) et on mène des colonnes.

D'où deux architectures, à trancher avant la moindre ligne :

- **A — plusieurs camps à bâtir.** `state.base` devient une liste ; on bâtit,
  emploie, stocke et défend dans chacun, avec un sélecteur de camp. Le Kenshi
  classique. Chantier lourd : ~130 points de code à mettre au pluriel, une
  migration de sauvegarde, les sièges par camp, et un coût de simulation qui
  croît avec le nombre de camps.
- **B — les villes qui sont vôtres.** Le camp reste unique et bâti à la main ;
  les autres implantations sont de vraies villes du monde — fondées ou
  annexées — qui vivent seules et que l'on gouverne (impôts, lois, garnison,
  investissement). S'appuie sur ce qui existe, peu de code neuf, coût de
  simulation nul (ces villes tournent déjà).

**Ouvert en août 2026, sur demande du propriétaire — « il faut peut-être
travailler sur le système multi bases et villes avant la conquête des
autres ». Le cahier des charges vit dans `IMPLANTATIONS.md` : le recensement
y a trouvé mieux que prévu (la prise de ville, les dix-huit prérogatives et
la naissance d'une faction sont déjà écrites ; il manque un drapeau au
joueur), une troisième architecture s'y est ajoutée, et six questions
attendent le propriétaire. Rien n'est engagé tant qu'il n'a pas tranché.**

---

## Le prêteur tiers — financer les murs du voisin pour tenir sa ville

**Trouvé par la mesure, septembre 2026**, à la livraison d'`INVESTISSEMENT.md` :
la voie du crédit ouverte aux conseils est vraie mais presque déserte — deux
murs sur trois cent soixante-dix-neuf. La raison n'est pas un réglage, elle est
structurelle : **un pays ne s'emprunte pas à lui-même l'argent qu'il n'a pas.**
L'argent sort du même trésor dans les deux cas ; le crédit ne change que le
fait qu'il revienne.

Le verbe « emprunter » ne prend son sens qu'avec quelqu'un d'autre en face :
le voisin qui paie vos maçons et tient ensuite votre ville par la dette. Les
deux bouts existent déjà — `racheterCreance` (on achète la dette d'autrui) et
`saisir` (on encaisse le drapeau quand elle ne suit plus) —, et la conquête
par l'argent s'en nourrirait par le haut au lieu d'attendre la détresse.

Ce qu'il faudrait trancher avant d'écrire quoi que ce soit : qui propose (le
riche qui cherche un débiteur, ou le pauvre qui cherche un prêteur), ce qu'un
conseil accepte de devoir à un rival, et ce que les siens en pensent. Rien
n'est engagé.

---

## « Je ne sais jamais ce qui se passe » — la lisibilité du monde

**Dit par le propriétaire en jouant, septembre 2026** : « je vois que ma base
est désormais sur le territoire d'une faction ennemie, bien sûr je ne sais pas
comment c'est arrivé (je ne sais jamais ce qui se passe ni quoi ni comment ni
pourquoi c'est un gros problème du jeu sur lequel il faudra travailler) ».

Le fait qu'il décrit est réel et le moteur l'a bien produit : sa case a changé
de couleur sans qu'un homme approche du camp. `basculerPlace`
(`factions.js:343-346`) donne au vainqueur la région de la ville prise **et
toutes les cases voisines qui étaient à l'ancien** — la frontière glisse d'un
rayon à chaque ville qui tombe. Trois autres portes font la même chose plus
discrètement : `fonderColonie` (une ville neuve prend sa case),
`saisir` (`credit.js:374`, une ville passe à son créancier) et `faireSecession`
(`economy.js:2054`).

Ce qui manque n'est pas l'événement : la dépêche existe, elle est même écrite
avec sa cause (`depecheChute` — « la faim avait fait le gros du travail »,
« les murs n'ont pas tenu »). Ce qui manque est le chemin jusqu'au joueur :

- l'entrée `capture` n'est pas marquée `important`, donc elle ne sonne jamais
  la cloche (`creerLogger`, `events.js:62`) ;
- le journal ne garde que `LOG_MAX` lignes, et une longue absence en produit
  des milliers : la dépêche a défilé bien avant qu'il rouvre l'onglet ;
- rien ne relie le fait (« telle ville est tombée à deux cases ») à sa
  conséquence sur lui (« votre camp est désormais en territoire ennemi ») —
  c'est le glissement des cases voisines, et il n'est écrit nulle part ;
- la carte dit l'état présent, jamais le changement : elle ne se souvient pas
  de la couleur d'hier.

Deux directions, à trancher avant la moindre ligne — et la première question
est de savoir laquelle des deux il veut, parce qu'elles ne coûtent pas la même
chose. **A — le journal qui vise** : ce qui touche vos affaires (vos cases, vos
voisins, vos routes, ceux à qui vous devez ou qui vous doivent) monte d'un cran
et sonne, le reste passe au fond. Peu de code, aucun mécanisme neuf, et ça ne
règle que ce qui est déjà écrit. **B — le monde qui se raconte** : une page
« Ce qui a changé depuis » qui compare deux relevés du monde (le `rapport` sait
déjà retenir ce que le journal oublie) et dit les basculements, pas les
événements. Plus cher, mais c'est la seule des deux qui répond à « ni quoi ni
comment ni pourquoi » pour un joueur qui revient après trois jours.

Rien n'est engagé.
