# Territoire — s'approprier une case, et y gagner quelque chose

**Ouvert en septembre 2026 sur une remarque du propriétaire, en jouant** : sa
base s'est retrouvée en terre ennemie sans qu'il perde un homme. Puis, la
discussion instruite : « il faut différents mécanismes d'appropriation, et
différents avantages également, aujourd'hui j'en vois très peu ».

Ce document est un **relevé de l'existant et un cahier des charges** :
rien n'est engagé, rien n'est chiffré. Les décisions sont au propriétaire.

---

## 1. Ce que le code appelle « tenir une case » aujourd'hui

Une région porte un champ `controle` : un nom de drapeau, rien d'autre. Pas de
garnison, pas d'entretien, pas de date. Il n'est écrit qu'à cinq endroits :

| où | quand |
|---|---|
| `world.js:330` | à la naissance du monde — chaque ville peint ses 4 voisines libres, 7 fois sur 10 |
| `factions.js:343-346` | à la prise d'une ville — le vainqueur prend sa case **et les voisines qui étaient au perdant** |
| `factions.js:1306` | une ville fondée prend sa propre case |
| `credit.js:374` / `economy.js:2054` | une ville saisie par son créancier, ou rendue par sécession |
| `economy.js:2135` | une ville qui meurt libère **sa** case (pas les quatre qu'elle avait peintes) |
| `base.js:2122` / `:2148` | le camp du joueur prend un drapeau, ou reprend le sien |

Il n'est **jamais recalculé**. Personne ne peut le contester. Deux conséquences
que le propriétaire a trouvées seul en jouant :

- **la revendication survit à celui qui la portait** — une ville meurt, ses
  quatre cases gardent son nom, parfois celui d'un pays éteint ;
- **la présence ne vaut rien** — mille deux cents hommes campés sur une case
  n'y changent absolument rien.

## 2. Ce que tenir une case rapporte aujourd'hui : rien à son propriétaire

Relevé exhaustif de toutes les lectures de `controle` dans le moteur.

**Pour la faction qui tient — zéro.** Pas de revenu, pas de ressource (la
`richesse` de la case ne va qu'à qui la fouille), pas de défense, pas de droit
d'expansion (`conseil` étape 5 cherche ses cases à fonder à trois cases de ses
**villes**, jamais de son territoire), pas de point de départ pour lever une
colonne (elle part d'une ville ; seul l'Essaim naît d'une case, et il choisit
justement les cases **sans** contrôle).

**Le péage n'enrichit personne.** 40 à 220 pris au joueur (`events.js:750`),
et `regler` ne fait que débiter sa bourse : la somme n'entre dans aucune caisse,
dans aucune masse monétaire. Elle disparaît.

**Trois effets, et les trois ne visent que le joueur** : ce qui sort du bois
sur ses terres (`bandeLocale`), les renforts qu'un gradé n'obtient que sur les
terres de son drapeau (`allegeance.js:1239`), et les témoins d'une parole
rompue ou d'un convoi pillé (`parole.js:326`, `caravanes.js:1151`).

C'est très exactement l'odeur n°3 de l'`AUDIT.md` : **une règle qui ne vise que
le joueur.** Le territoire est aujourd'hui un décor pour les pays, et une
friction pour lui.

## 3. Ce qui existe déjà et qu'il ne faut pas réécrire

Le jeu contient **un deuxième modèle du territoire, bien plus vrai**, et il
ignore `controle` : `secteur.js`. Chaque case porte une `insecurite` avec son
niveau de repos ; la **présence y agit** (`effetPresence` : une patrouille fait
baisser l'insécurité de 0,011 par heure, racine du nombre de bras) ; la menace
se lit **en écart à la normale** (`menace`, centrée sur 0,28) ; l'état des
routes remonte au conseil et pèse sur le pays (`etatDuPays.routes`).

Autrement dit : « occuper le terrain par la présence, et en sentir l'effet » est
**déjà écrit, mesuré et calibré**. Il n'est branché que sur la charge de
Lieutenant du joueur. Aucun pays ne s'en sert.

De même, les pactes câblent déjà `passage` (le péage s'ouvre) et `vue` (on voit
les colonnes qui passent sur les terres de l'allié) : le territoire sait déjà
être l'objet d'un accord.

## 4. Les mécanismes d'appropriation candidats

Le premier arrivé s'approprie — la règle du propriétaire est gardée. Ce qui
manque, c'est qu'il y ait **plusieurs façons d'être le premier**, et une façon
de cesser de l'être.

- **A1 — la ville** (existe) : fonder ou prendre. Le halo d'aujourd'hui.
- **A2 — la présence** — **LIVRÉ, septembre 2026 — et mesuré MORT côté monde.**
  Une troupe qui reste sur une case que personne ne tient finit par la faire
  porter ses couleurs (`monterLaGarde`, `GARDE.heures` = 72), et cesse de la
  tenir quand elle s'en va (`leverLaGarde`, `tickGardes` pour celles qu'on ne
  relève plus). Deux bornes, et ce ne sont pas des précautions : **seulement
  une case libre** — prendre à quelqu'un, c'est prendre sa ville, pas camper à
  côté, et la règle du premier arrivé n'est pas touchée — et **une occupation à
  la fois**. Sans couleurs, on occupe sans nommer : on ne plante pas un drapeau
  qu'on n'a pas, mais personne d'autre ne peut s'installer où vous êtes. Une
  case tenue par des hommes n'est pas une couleur orpheline au sens d'A5.

  Ça marche, et ça répond à la question qui a ouvert le dossier : l'escouade
  qui reste sur place tient la case. **Le monde, lui, ne s'en sert pas du
  tout** : zéro appropriation sur six graines × 6 000 h, et le balayage le
  confirme — ni 24 h ni 168 h ne changent ce zéro. Le monde ne diverge pas d'un
  iota du témoin : mêmes villes, même population, même masse, mêmes convois.

  La cause n'est pas un réglage, elle est de conception, et elle est exactement
  la question que ce dépôt pose avant d'écrire une règle : *quel agent la
  porte, et que sait-il ?* Une colonne est toujours en marche, en siège devant
  une ville, ou en garnison chez elle — **aucun agent du monde n'a la moindre
  raison de stationner sur une case vide.** Occuper ne rapporte rien tant que
  tenir du terrain ne rapporte rien. A2 restera donc lettre morte pour les pays
  jusqu'à ce qu'un des avantages du §5 existe : le ravitaillement (B5), la
  ressource (B3) ou le droit d'y fonder (B6) — celui-là surtout, puisque
  l'expansion ignore aujourd'hui complètement les frontières.

  `GARDE.heures` = 72 : le balayage (24 → 168) ne discrimine pas, la valeur ne
  mord donc que sur le joueur. Trois jours, c'est le temps qu'il faut pour que
  « on est passé » devienne « on est installé ».
- **A3 — l'ouvrage** : une route entretenue, un relais, un pont, un poste de
  péage bâti. On tient ce qu'on a construit, pas ce qu'on a traversé.
- **A4 — l'accord** : une case cédée, échangée ou concédée par traité. Les
  pactes savent déjà porter des clauses.
- **A5 — l'abandon** — **LIVRÉ, septembre 2026.** Plus rien à ce drapeau ne
  touche la case → elle redevient libre, et le suivant qui arrive se
  l'approprie. C'est le seul point du dossier qui corrigeait un défaut au lieu
  d'ajouter une possibilité, et le défaut était bien plus gros que prévu :
  **635 cases orphelines sur 1 434 tenues** (44 % du territoire du monde) à
  six mille heures, six graines — des couleurs au nom de villes mortes, de
  villes affranchies, parfois de pays éteints. Après : **756 tenues, zéro
  orpheline**, et la carte politique dit enfin qui tient quoi.

  La règle ne fait qu'appliquer la définition du halo jusqu'au bout : *une case
  n'est tenue que si une ville vivante de ce drapeau est dessus ou la touche.*
  Le premier arrivé garde tout ce qu'il a pris — la règle du propriétaire est
  intacte ; il cesse seulement de tenir ce qu'il n'a plus les moyens de tenir.
  `libererOrphelines` (world.js) relit la case et ses quatre voisines à chaque
  fois qu'une ville meurt, s'affranchit, fait sécession, est saisie, est prise,
  ou change de couleur pour le joueur — et toute la carte au chargement d'une
  partie d'avant, pour que le défaut ne survive pas à sa correction.

  Le banc porte la mesure (`cases tenues`, `orphelines` dans `jouer()`). Les
  dix gardes tiennent, le tick est à ×0,974, et l'écart comptable reste exact.
  Ce que la comparaison montre par ailleurs — zombies, guerres, masse nominale —
  est du chaos de graine et non un effet : sur six graines indépendantes les
  zombies vont dans l'autre sens (18 → 14), et la masse en ancien crédit ne
  bouge que de 3,5 %.

## 5. Les avantages candidats

- **B1 — le péage encaissé** — **PREMIÈRE MOITIÉ LIVRÉE, septembre 2026.** Ce
  que le barrage prélève entre désormais dans la caisse d'une ville : la ville
  vivante la plus proche sous le drapeau qui tient la case (`villeDuBarrage`).
  L'impôt monte au trésor comme sur toute recette, et la masse du pays bouge
  d'exactement ce que la caisse a bougé — la règle des deux, sans quoi le
  barrage aurait fabriqué de la monnaie. Payé dans une autre monnaie, il entre
  au cours du jour, comme une ville qui change de drapeau. Un barrage de bandits
  n'encaisse rien : on ne leur invente pas un pays.

  Avant, `regler` débitait la bourse du joueur et la somme n'entrait nulle part.
  Mesuré au banc d'équilibrage — le seul qui ait un joueur — sur une partie
  complète : **91 barrages croisés, 43 payés, 5 196 unités** qui s'évaporaient
  et qui entrent maintenant quelque part. L'invariant comptable reste exact.

  **SECONDE MOITIÉ LIVRÉE.** Le propriétaire, interrogé sur ce qu'un convoi
  paie : « toutes les réponses sont possibles et plus encore ». Ce n'est donc
  pas un choix mais une **table** — `REPONSES_BARRAGE`, le même parti que
  `MOTIFS_SECESSION` —, lue dans l'ordre, la première qui peut faisant :

  - `laissez` : on est chez soi, ou un pacte de passage nous couvre ;
  - `dedans` : on est déjà chez eux, on a payé à la frontière ;
  - `bourse` : c'est le convoi du joueur, et il a de quoi — dans leur monnaie
    ou dans une autre, prise au cours ;
  - `argent` : la ville qui a expédié règle sur sa caisse, et l'argent change
    de pays au taux du jour ;
  - `nature` : à qui ne peut ni l'un ni l'autre, le barrage prend de la
    marchandise, qui entre dans les réserves de la ville qui tient la case.

  Pour en ajouter une, il suffit d'écrire une entrée : rien d'autre dans le
  moteur ne connaît la liste. C'est le « et plus encore » rendu possible.

  **On paie en ENTRANT chez quelqu'un, pas à chaque pas** — et c'est la mesure
  qui l'a imposé. Écrit d'abord par case, le péage prenait deux pour cent dix
  fois de suite : un convoi entre deux camps du joueur arrivait avec 57 unités
  sur 80. Ce n'était pas un péage mais un barrage tous les kilomètres, c'est-à-
  dire un prélèvement que personne ne tient. Une frontière, elle, a des hommes
  dessus. De même, un barrage **accepte la monnaie étrangère** au cours :
  exiger la leur et se servir dans la cargaison sinon revenait à taxer en
  marchandise quiconque voyage loin de chez lui.

  Ce que ça fait au monde, six graines × 6 000 h : **2 barrages payés → 16 156**.
  Les pays qui tiennent du territoire s'enrichissent nettement (trésor médian
  20 530 → 42 655, et les pays fauchés passent de 10 sur 36 à 4), le monde
  porte 347 villes debout contre 330, et — le plus parlant — **les accords
  doublent, de 8 à 17** : la clause `passage` des pactes vaut enfin quelque
  chose, puisqu'elle ouvre une frontière qui coûte. L'écart comptable reste
  exact à zéro.

  `PEAGE_CONVOI.part` vaut 0,02, balayée de 0,005 à 0,04 : le monde est
  indifférent à la valeur (villes 355 contre 345, sous le plancher de bruit de
  4,6 %) — c'est l'existence du péage qui compte, pas son tarif.
- **B2 — la route sûre** : ses convois traversent ses terres moins cher et
  moins dangereusement. `insecurite` et `menace` sont déjà là ; les convois
  savent déjà se faire piller.
- **B3 — la ressource** : la `richesse` d'une case tenue alimente la ville qui
  la tient. Attention : c'est le levier qui touche le plus l'économie, donc
  celui qui demande le plus de mesure.
- **B4 — la vue** : on voit ce qui traverse chez soi. Le mécanisme existe
  (`connaissance.js:192`), il est aujourd'hui réservé à l'allié par pacte.
- **B5 — le ravitaillement** : une colonne se refait sur ses terres et
  s'épuise ailleurs. Donne enfin une raison militaire de tenir du terrain, et
  une raison d'en refuser le passage.
- **B6 — le droit d'y fonder** : on ne pousse une ville que chez soi ou chez
  personne. Aujourd'hui l'expansion ignore complètement les frontières.

## 6. Ce qu'il faut trancher avant d'écrire une ligne

1. **Combien de mécanismes d'appropriation, et lesquels** ? A5 seul est une
   correction ; A2 à A4 sont des chantiers séparés.
2. **Combien d'avantages, et lesquels** ? B1 est petit et juste ; B3 et B5
   changent l'équilibre du monde et demandent le banc.
3. **Le territoire doit-il coûter quelque chose ?** Tenir des cases sans
   entretien, c'est un empire gratuit — et c'est ce qui produit aujourd'hui
   les cases orphelines.
4. **Le joueur peut-il tenir du territoire sans drapeau ?** Ses 1 200 hommes
   sont la question qui a ouvert le dossier.
5. **Deux drapeaux peuvent-ils tenir la même case ?** Aujourd'hui non, et un
   « disputé » n'existe pas.
6. ~~**Sur quoi un convoi paie-t-il le péage ?**~~ **Tranché** : « toutes les
   réponses sont possibles et plus encore » — d'où la table `REPONSES_BARRAGE`,
   ouverte. Ce qui suit est ce qui avait été proposé, gardé pour mémoire.
   (bloquait la seconde moitié de B1)
   Un convoi n'a pas de bourse : il porte une cargaison et une créance sur la
   ville qui l'attend. Trois façons, et elles ne disent pas la même chose du
   monde : *(a)* la ville qui l'a expédié règle sur sa caisse — l'argent passe
   d'un pays à l'autre, le commerce lointain devient cher, et tenir des cases
   sur une route rapporte vraiment ; *(b)* le barrage prend de la marchandise —
   plus vrai pour un péage de piste, ça remplit les greniers de celui qui tient
   plutôt que sa caisse, et ça déborde sur B3 (la ressource) ; *(c)* le convoi
   choisit sa route pour éviter les barrages, et alors le péage ne rapporte
   presque rien mais **détourne le commerce**, ce qui est peut-être le vrai
   pouvoir d'une frontière.

Rien n'est engagé tant que le propriétaire n'a pas tranché.

---

# Revue de game master — « ça me semble léger comme mécanisme »

Demandée par le propriétaire, septembre 2026, à la livraison d'A2. Troisième
passage du même consultant : le premier avait amendé `BATIMENTS.md`, le second
a produit `REVUE.md`. Même protocole — ses affirmations porteuses sont
revérifiées dans le code, fichier et ligne, avant consignation. Rien ici n'est
engagé.

## Le verdict, sans détour : il a raison

**A2 est un minuteur.** Rester soixante-douze heures sur une case, et elle est
à vous. Pas de choix, pas de risque, pas de coût, pas d'adversaire, pas de
décision à aucun moment. Le dépôt a un mot pour ça dans ses quatre odeurs
(`AUDIT.md`) : *un minuteur vécu comme une taxe*. Le retourner en récompense
n'en change pas la nature — c'est toujours une mécanique qui demande d'attendre
plutôt que de jouer.

Et la mesure le dit déjà, sans qu'on ait besoin d'un avis : **zéro
appropriation par le monde**, et le balayage 24 h → 168 h ne bouge pas ce zéro.
Un mécanisme dont aucun agent ne se sert n'est pas un mécanisme léger : c'est
un mécanisme absent. Le seul à s'en servir est le joueur, ce qui en fait — une
fois de plus dans ce dossier — une règle qui ne concerne que lui.

## Le diagnostic : le territoire n'est pas une surface

L'erreur est en amont d'A2, et elle est dans le modèle lui-même. Ce jeu traite
le territoire comme une **surface à colorier** : 432 cases, un nom de drapeau
sur chacune. Or la carte est une grille 24×18 à quatre voisins où **rien n'est
infranchissable** — `chemin` ne connaît que des coûts, jamais des murs
(`world.js:822`). Sur une telle carte, une surface ne produit ni goulot, ni
frontière, ni enjeu : tout se contourne pour presque rien. On peut colorier les
432 cases, il ne se passera rien.

Trois systèmes du jeu prétendent déjà parler de territoire, et **les trois ne
mordent que sur le joueur** :

| système | ce qu'il promet | ce que le code fait |
|---|---|---|
| `controle` | qui tient quoi | trois effets, tous côté joueur : ce qui sort du bois, les renforts du gradé, les témoins d'une parole rompue |
| `insecurite` (`secteur.js`) | « multiplie les mauvaises rencontres **pour tout le monde**, joueur compris, et saigne la ville dont le secteur dépend » (en-tête du module) | `menace()` n'est lu qu'**une seule fois dans tout le moteur** — `events.js:674`, les rencontres du joueur. Les convois n'y sont pas soumis, les colonnes non plus, et « saigner la ville » se réduit à durcir ses lois (`factions.js:1496`) |
| `danger` | le risque d'une région | les convois s'y exposent (`caravanes.js:1190`) — mais c'est une **autre grandeur** que l'insécurité, et les deux ne se parlent pas |

Un module qui promet dans son en-tête ce que son code ne fait pas est le
symptôme le plus net du dossier : personne n'a menti, c'est la **surface** qui
ne se branche sur rien.

## La trouvaille : l'objet territorial existe déjà, et ce n'est pas la case

C'est **la route**. Le moteur la fabrique tout seul, et depuis longtemps :

- `damer(world, i, force)` (`world.js:699`) tasse la terre à chaque passage —
  un convoi ×1,6, une colonne ×2,5, le joueur en marchant.
- `coutTraversee` et le Dijkstra de `chemin` **relisent** cette piste
  (`world.js:694` et `world.js:822`) : une case damée coûte moins cher.
- Donc la route **s'auto-renforce** : plus on y passe, moins elle coûte, plus
  on y passe. Personne ne l'a dessinée ; elle sort du trafic réel.

Mesuré au banc pour cette revue, six graines × 6 000 h : **22 % de la carte est
damée**, et les 5 % de cases les plus passantes portent **19 % du trafic
cumulé** — quatre fois la part uniforme. Les corridors sont là. Aucun mécanisme
du jeu ne les regarde.

## Ce qui manque, en une phrase

**Aucun voyageur de ce monde ne choisit son chemin en fonction de ce qu'il
craint.** `chemin` ne coûte que le biome et la piste. Il ignore l'insécurité,
les frontières, les péages, la guerre, et jusqu'à savoir si l'on est en pays
ami.

C'est le verrou de tout le dossier, et il faut le dire dans cet ordre : **tant
qu'il tient, rien de ce qu'on fera au territoire ne pourra se voir**, parce que
le seul effet mesurable d'une frontière — dans la vraie vie comme ici — est de
**déplacer du trafic**. Une frontière qui ne déplace rien n'est pas une
frontière, c'est une couleur.

## Ce que le consultant propose : tenir une route, pas une surface

Trois crans, chacun mesurable seul, du moins cher au plus cher.

**T1 — le voyageur pèse ce qu'il craint** — **LIVRÉ, septembre 2026.**
`chemin` prend un coût de risque en
plus du coût de terrain : l'insécurité de la case, le péage attendu, les terres
de qui vous fait la guerre. Une seule fonction touchée, et d'un coup quatre
choses existent : les convois **contournent** les barrages (c'est l'option (c)
du propriétaire, gratuitement) ; un secteur mal tenu **détourne le commerce**,
donc saigne enfin la ville — ce que `secteur.js` promet depuis son écriture ;
tenir une case sur un corridor devient un acte de pouvoir ; et les deux
grandeurs de danger cessent d'être parallèles. Le coût technique est connu et
déjà consigné : le Dijkstra tourne plusieurs fois par minute de jeu, le cache
des routes de convois attend dans les optimisations reportées.

*Ce que la livraison a donné.* `ROUTE = { parInsecurite: 6, parPeage: 3,
parEnnemi: 14 }`, en unités de coût de terrain (une case coûte 3 à 7). Le
risque ne s'applique qu'à qui le demande (`mods.craint`) : une colonne qui
marche sur une ville ennemie n'évite évidemment pas les terres ennemies, et un
trajet calculé pour l'affichage n'a rien à craindre. Les convois du monde, eux,
craignent — `craintesDe` (caravanes.js) leur donne leurs guerres et leur
drapeau.

**Le seul effet reproductible est exactement celui qu'on cherchait : le trafic
se détourne.** Barrages croisés, deux jeux de six graines indépendants :
16 156 → 11 827 (−27 %) et 16 113 → 10 397 (−35 %). Et la crainte redoutée —
affamer les villes en les privant de convois — ne se produit pas, c'est
l'inverse : la satiété monte des deux côtés (0,975 → 0,982 et 0,967 → 0,977),
les affamées baissent. Un convoi qui évite les routes mal famées est un convoi
qui arrive.

Tout le reste bouge dans les deux sens selon les graines et n'est donc que du
chaos : les zombies font 0 → 53 sur un jeu et 49 → 0 sur l'autre, la masse en
ancien crédit +115 % puis −2,5 %. Dix gardes tenues.

Le balayage tranche le poids : à 2, le monde mange moins bien (satiété 0,960,
83 villes affamées) ; à 12, rien de plus qu'à 6 (0,980) et **moins** de péages
évités (14 230), parce qu'un voyageur qui ne craint que l'insécurité se jette
sur les terres à péage pour fuir les mauvaises routes. Six est le point où le
monde mange le mieux et où la frontière déplace le plus de trafic.

**T2 — on tient un point, pas des heures** — **LIVRÉ, septembre 2026.** Ce qu'on tient sur une route, c'est
un **ouvrage** : un poste, un pont, un gué (c'est A3, et il devient le cœur du
dossier au lieu d'une variante). Il coûte à bâtir, il se voit de loin, il se
prend d'assaut, il se perd. Le minuteur disparaît : on ne tient pas parce qu'on
a attendu, on tient parce qu'on a bâti — et parce qu'on défend. A2 redevient ce
qu'il aurait dû être, la **conséquence** d'une occupation, jamais le moyen
d'une conquête.

*Ce que la livraison a donné.* `POSTE = { cout: 900, trafic: 0.45, portee: 5 }`.
Un conseil qui a de quoi pose un poste **là où le trafic passe** — la piste dit
le trafic, et elle sort du passage réel, personne ne l'a dessinée. Le poste
tient la case sans que personne y campe, on ne le bâtit ni chez autrui ni sur
la Faille, il se paie sur le trésor et les maçons l'encaissent, et **une
colonne ennemie qui passe dessus le rase** — c'est là que le minuteur d'A2
meurt : ce qu'on a bâti, quelqu'un peut venir le défaire.

**Les pays s'en servent, et c'est tout ce qu'A2 n'avait pas.** 207 et 172
postes debout sur deux jeux de six graines indépendants, contre zéro
appropriation par le temps passé. Les cases tenues montent de 763 à 964 et
915 ; les barrages croisés de moitié (+49 % et +61 %). L'invariant comptable
reste exact.

*Ce que le balayage apprend, et ce qu'il refuse de trancher.* Le prix ne
commande pas grand-chose : à 400, 900 et 2 500, on compte 219, 207 et 245
postes — les trésors sont largement au-dessus dans les trois cas. Et la
satiété qu'on croyait voir baisser (0,974 → 0,965 sur les deux jeux) **n'est
pas monotone en prix** : 0,984 à 400, 0,965 à 900, 0,975 à 2 500. C'est du
bruit de graine, pas un effet des postes, et il ne faut donc pas l'écrire comme
un coût. Neuf cents reste, faute que rien ne le distingue.

*Un défaut préexistant, trouvé par l'échelle.* La réponse « la ville règle » de
`REPONSES_BARRAGE` ne vérifiait pas qu'il y avait **quelqu'un** au barrage :
un drapeau sans une seule ville vivante voyait `convertirMasse` créditer sa
masse pendant que `encaisser(null)` ne mettait l'argent nulle part. Deux unités
fabriquées à chaque passage. Le défaut datait de la seconde moitié de B1 ; il
était trop rare pour se voir, et les cinquante pour cent de barrages en plus
l'ont rendu visible dans la minute. C'est exactement le métier de l'invariant.

**T3 — le trafic est la récompense** — **LIVRÉ, septembre 2026.** Le péage encaissé (B1, livré) devient un
revenu **proportionnel au trafic** de la route tenue. Un conseil a alors une
raison chiffrée de vouloir un corridor, de le fortifier, de s'allier pour
l'ouvrir ou de faire la guerre pour le fermer. Et A2 cesse d'être lettre morte
sans qu'on y touche : les colonnes stationneront là où il y a quelque chose à
tenir, parce qu'un agent aura enfin une réponse à « pourquoi ici ? ».

*Ce que la livraison a donné.* Le poste **compte ce qui passe** (`recu`,
`passages`) — c'est la seule information qu'un conseil aura jamais sur ce que
vaut une route, et elle vient de son propre ouvrage, pas d'une statistique
tombée du ciel. Un pays ne tient qu'un nombre de postes proportionnel à ses
villes (`POSTE.parVille`) : sans plafond, un trésor gras couvre la carte et il
n'y a **aucun arbitrage à faire**. Au plafond, le conseil ferme le poste que
personne n'emprunte pour ouvrir mieux ailleurs — et jamais un ouvrage trop
neuf pour avoir eu sa chance (`POSTE.epreuve`, trente jours).

Mesuré sur deux jeux de six graines : 125 et 133 postes debout, **6 414 et
7 346 unités réellement encaissées** par eux, et **un tiers d'entre eux ne voit
jamais rien passer** (41 sur 125, 37 sur 133). Ce dernier chiffre est le vrai
apport de T3 : avant, aucun conseil ne pouvait le savoir.

## Blocages — soldé

**La garde `effondrees` est tombée à la livraison de T3**, à zéro sur ses six
graines là où elle exige au moins une monnaie effondrée. La règle du dépôt
étant de remonter et non d'élargir, le travail a été commité sans être poussé
et la question portée au propriétaire, qui a tranché : « essaye sur 12 pour
voir, mais au pire on s'en fout, faut continuer d'avancer surtout ».

Ce que l'instruction avait établi — et elle penchait nettement vers le bruit :

- sur **douze** graines, trois monnaies s'effondrent ;
- le balayage du plafond n'est **pas monotone** : `parVille` à 0,3 donne deux
  effondrements, à 0,5 zéro, à 1,0 trois. Un levier qui donne 2, 0, 3 ne
  commande rien ;
- la garde porte sur un événement rare compté sur six parties. À une moyenne
  d'environ un et demi, tirer zéro arrive une fois sur cinq sans qu'aucun code
  n'ait changé.

Autrement dit, ce n'était pas T3 qui empêchait les monnaies de s'effondrer :
c'était la garde qui était trop fine pour son échantillon.

**Ce qui a été fait :** les gardes se mesurent désormais sur **douze** parties
et non plus six, et les bornes qui sont des sommes ont été doublées avec
l'échantillon — à densité constante, une somme sur douze parties vaut le double
d'une somme sur six. Aucune borne n'a bougé en densité : la garde attrape
exactement les mêmes mondes qu'avant, elle cesse simplement de sonner au hasard
sur les événements rares. Le prix est le temps : le banc du `--complet` double.
Dix gardes tenues, T3 en place.

## Ce que le consultant déconseille

- **L'appropriation au temps passé, seule.** À garder comme conséquence, pas
  comme moyen. Livrée telle quelle, elle enseigne au joueur que le territoire
  s'obtient en ne faisant rien.
- **La ressource par case (B3) en premier.** Elle multiplie les revenus sans
  créer un seul conflit : on obtient un jeu de gestion plus riche, pas un monde
  plus disputé. À faire après T1, où elle donnera une raison de se battre pour
  un endroit précis.
- **La case « disputée » entre deux drapeaux** (§6, question 5). Le conflit
  intéressant n'est pas sur la case, il est sur le **passage**. Deux couleurs
  sur une même case, c'est de la comptabilité ; deux pays qui veulent la même
  route, c'est une guerre.

## Le risque à surveiller, et il est réel

Faire dépendre le trafic du risque peut **affamer des villes** : des convois
qui contournent sont des convois qui ne livrent pas. T1 doit donc être un
**coût, jamais un interdit** — un chemin dangereux reste praticable, il coûte
plus cher —, et il se mesure contre les gardes `villes`, `satiete` et
`convois`, qui sont précisément là pour attraper ça.

## La question au propriétaire

T1 est petit à écrire et change tout ce qui suit. Il change aussi le monde
entier d'un coup, puisque chaque convoi recalcule ses routes. Le consultant
recommande de le prendre seul, de le mesurer, et de ne décider de T2 et T3
qu'après avoir vu ce que le commerce fait quand il a peur.

## Au-delà de T1-T3 : ce qui enrichirait vraiment

Demandé par le propriétaire dans la foulée de la revue. Même règle : rien
n'est engagé, et chaque affirmation est vérifiée dans le code. Deux idées
pressenties sont d'ailleurs tombées à la vérification — les pistes **s'érodent
déjà** (`secteur.js:270`, 0,06 % par heure : deux mois d'abandon effacent une
route), et la carte **les dessine déjà** (`ui.js:1337`). Il en reste cinq.

**E1 — la géographie n'est pas assez dure.** Les coûts de terrain vont de 3 à 7
(`data.js`) et **rien n'est infranchissable** : le pire détour coûte le double
du meilleur chemin, ce qui revient à dire qu'aucun endroit n'est un passage
obligé. Une poignée de cases vraiment dures — un massif, un gouffre, une ruine
qu'on ne traverse pas — et la carte se met à avoir des cols. C'est la condition
géographique de tout le reste : sans goulot, tenir une route est toujours
contournable, donc jamais décisif. Petit à écrire, mais ça change le monde
entier : à mesurer contre les gardes `villes`, `convois` et `satiete`.

**E2 — le passage se négocie, il ne se décrète pas.** Aujourd'hui `passage` est
une clause binaire d'un pacte : on l'a ou on ne l'a pas. Avec T1, le détour a
enfin un prix chiffrable — et dès qu'un détour a un prix, **vendre le droit de
passage devient un marché**. Tout est déjà là : `parole.js` sait faire un
accord daté avec un tarif et un gage, `pactes.js` sait porter la clause. Ça
crée la décision la plus banale et la plus riche qui soit, pour un conseil
comme pour le joueur : payer le passage, payer le détour, ou forcer.

**E3 — le blocus.** Le siège existe (`assaut.js`, vivres coupées) mais il faut
se planter devant les murs. Un blocus de corridor est un siège à distance : la
ville au bout dépérit sans qu'on l'assiège, et l'on n'a pris aucun risque. Ça
ouvre la guerre économique là où il n'y a aujourd'hui que l'assaut — et ça
remplit tout seul le zéro d'A2, puisqu'une colonne a enfin une réponse à
« pourquoi stationner ici ? ».

**E4 — le trafic est une information.** `connaissance.js` sait déjà relever ce
qui bouge sur les terres d'un allié. Faire du trafic un renseignement — « il
passe trois convois par semaine par ce col » — crée deux métiers d'un coup :
le brigand qui choisit son embuscade au lieu de la subir, et le marchand qui
paie pour savoir. Et la contrebande devient le contre-jeu naturel du péage,
au lieu d'un mécanisme à inventer.

**E5 — « tenir » comme quatrième voie du joueur.** La revue de `REVUE.md`
listait trois voies lisibles : servir, bâtir, commercer. Un ouvrage sur une
route (T2) qu'on entretient, qu'on défend et qui rapporte le péage des convois
du monde (T3) en fait une quatrième, complète : elle a son revenu, ses ennemis,
son entretien et son siège — le camp assiégé est déjà écrit (`SIEGE.md`).

L'ordre que le consultant recommande, si l'on veut que chaque cran se voie :
**T1, puis E1** (le risque d'abord, la dureté du terrain ensuite — l'inverse
donnerait des goulots que personne ne contourne, donc invisibles), puis T2/E3,
et E2/E4/T3 quand il y a un trafic à convoiter.

---

# Revue de conformité — ce que la relecture a trouvé

Passée sur les vingt-quatre commits de la journée, au prisme des cinq pièges de
`CLAUDE.md`, de `METHODE.md` §11-§12 et des quatre odeurs d'`AUDIT.md`. Six
défauts réels, tous corrigés dans la foulée ; un point écarté avec son motif.

**Un tirage de plus au milieu du conseil (piège n°1).** `conseil` tirait
`rng.chance` pour poser un poste, mais **seulement quand une case valait la
peine** : tous les tirages suivants de la séance se décalaient, et ils se
décalaient de façon dépendante de l'état. C'est le piège n°1 dans sa forme
littérale — et deux lignes plus haut, le même commit prenait soin de l'éviter
pour le choix du site. Le geste a maintenant son propre dé, dérivé du pays et de
l'heure.

**Trois clés d'état incomplètes (piège n°2).** `faction.peages` manquait aux
deux naissances de faction en cours de partie (le drapeau du joueur, la faction
née d'une colonne) ; `colonie.blocusDit` manquait au **troisième** lieu de
création d'une colonie, le camp livré comme place — celui qu'on oublie ; et
`world.failleNom` n'était pas dans `normaliser`. Aucun ne plantait, tous
cassaient l'exactitude de l'aller-retour JSON.

**Deux mesures qui mentaient (METHODE §12).** `poste.recu` additionnait de la
monnaie du pays et des valeurs de marchandise en prix de base — une somme
d'unités hétérogènes, et c'était **la seule grandeur** sur laquelle le conseil
décidait quel poste fermer. Deux registres désormais (`recu`, `pris`), et
l'arbitrage se fait sur les **passages**, seule grandeur homogène. Et la mesure
`bloquees` du banc comptait `blocusDit`, qui n'est jamais remis à faux : elle
disait « villes bloquées au moins une fois depuis le début » là où le chiffre
annoncé était « villes privées ». Corrigée, elle compte celles qui le sont en ce
moment.

**Un point écarté, et pourquoi.** La revue signale que le péage d'une case sans
drapeau s'évapore encore (`f = r.controle || 'bandits'`). C'est vrai et c'est
voulu : des bandits ne tiennent pas de caisse, on ne leur invente pas un pays —
`percevoirPeage` le dit et le test TER 2 le vérifie. B1 visait le barrage d'un
**pays**, qui n'encaissait rien alors qu'il avait des hommes et une ville
derrière lui. Comptablement, rien ne se crée ni ne se perd : le joueur comme la
bande sont hors des registres.

**Deux scories** balayées au passage : un bloc `if` vide et un import inutilisé.

## Ce que E4 a révélé dans les tests, et qui n'avait rien à voir avec lui

Trois vérifications du navigateur sont tombées à sa livraison. **Aucune ne
visait le mécanisme** : toutes tenaient un décor que le monde, devenu plus dur,
ne produisait plus.

- « le monde tourne même quand tout le monde est mort » : le décor bloquait la
  fermeture automatique des stèles, et une stèle ouverte gèle l'horloge — ce qui
  est la règle, testée dans sa propre section. Le jour où le monde a changé
  assez pour qu'une stèle s'ouvre pendant ces six secondes, la sonde a accusé la
  fin de partie d'un gel dont elle n'était pas responsable.
- « décor : deux morts portés » exigeait **exactement** deux morts là où six
  cents millisecondes de jeu suffisent parfois à ce qu'un blessé succombe.
- « ce qu'on a pris est dans le sac » : le décor remettait les PV à plein sans
  **relever** ceux que la partie avancée avait laissés morts. Tant que le monde
  était doux il n'y en avait pas ; sinon l'escouade perd le combat, et la sonde
  conclut qu'un assaut gagné ne rapporte rien. Au passage, un bandeau de
  dévaluation pouvait recouvrir le bouton : Playwright cliquait alors sur le
  bandeau, et rien ne disait que l'assaut n'avait pas eu lieu.

Et un défaut dans l'outil lui-même : `jusqua`, l'attente de condition qui a
remplacé les pauses fixes, **avalait les exceptions et repartait aussitôt** au
lieu de dormir le reste du plafond. « Au pire on se comporte comme avant » n'est
vrai que si l'on attend vraiment.
