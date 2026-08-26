# Les promesses tenues — le chantier de couture, cahier des charges

Ouvert par le propriétaire sur la revue de game master (REVUE.md).
**Réécrit après son rappel de doctrine, août 2026** : « nous
travaillons sur un moteur de simulation » — les trois lots qui
fermaient des exploits par des règles d'équilibrage sont respécifiés
en comportements d'agents : le voleur fouille, le pillard jauge, le
drapeau a sa discipline. Format METHODE §9. **Rien ne se code avant
que le propriétaire ait validé les six lots.**

## 1. Le constat, chiffré (repris de REVUE.md, revérifié dans le code)

- **La milice se bat les mains nues** : SIEGE.md S1 promettait des
  miliciens « armés de ce que l'entrepôt contient » ; `leverMilice`
  ne les équipe de rien.
- **Une seule tactique pour tout le joueur** : `state.player.tactique`
  est global (main.js:568) — tout le reste est par groupe.
- **Le détroussage ne lit que la monnaie d'ici** (events.js:354) : le
  voleur d'aujourd'hui est aveugle aux bourses étrangères — non parce
  qu'il ne les trouve pas, mais parce que la règle ne les regarde pas.
- **Perdre contre des chasseurs de prime rend +10 d'estime**
  (events.js:579) : se faire battre n'a jamais fait aimer personne.
- **La solde tombe quoi qu'on fasse** (allegeance.js:971), pour les
  six drapeaux pareil — alors que six cultures de service existent
  (SERVICES : corpo, militaire, commune, nomade, fanatique, criminel).
- **Les raids ne jaugent rien** : une chance plate (0,0016 × danger),
  une force qui lit le temps et la population, jamais le butin ni la
  défense visible (base.js:1547). Le pillard d'aujourd'hui attaque un
  hangar vide et un coffre-fort avec le même entrain — aucun vrai
  pillard ne fait ça.

## 2. La cause

Chaque chantier a livré son système ; les coutures entre eux
n'appartenaient à personne. Et la première version de ce cahier
pensait par endroits en équilibreur (taxer, plafonner, suspendre) là
où la maison pense en simulateur : l'agent décide, selon ce qu'il
sait, veut et peut.

## 3. Les six lots

### P1 — la milice s'arme à l'arsenal du camp

Des habitants qui montent au mur prennent ce qui traîne : chaque
milicien levé emprunte la meilleure pièce libre (arme puis armure)
dans les `objets` du groupe présent. **Rien ne disparaît jamais —
l'arme suit le corps** (correction du propriétaire) : le combat tenu,
on relève ses morts et la pièce revient au sac ; le camp mis à sac,
ce sont les pillards qui dépouillent — les deux règles existent déjà
(`depouilles.js:70-73` : un corps garde son équipement ;
`combat.js:450` : le vainqueur prend l'arme d'un tombé à 40 %). Zéro
règle neuve : on branche l'emprunt, la simulation fait le reste.

### P2 — la tactique est un pari par colonne

`g.tactique`, repli sur le global s'il n'est pas posé (`normaliser`
+ littéral des groupes). Le panneau règle le groupe affiché.

### P3 — le détroussage est une fouille

Le vainqueur fouille le vaincu et **prend ce qu'il trouve** : la
bourse d'ici (celle qu'on a en main pour vivre) est toujours trouvée
— part 0,25-0,55 inchangée ; chaque bourse étrangère a une **chance
d'être trouvée** (dérivée du combat, ~0,5, calibrable) et subit alors
la même part. Un billet étranger n'est pas un talisman : c'est un
billet, qu'un fouilleur pressé peut rater. On laisse toujours de quoi
repartir (règle existante, inchangée). Le coffre en ville reste
l'abri sûr — c'est son métier : le voleur ne fouille pas ce qui n'est
pas sur vous.

### P4 — la prime retombe, l'estime ne bouge pas

La prime retombe à la défaite (inchangé : les chasseurs ont été
payés, l'affaire est réglée — sinon la chasse ne s'arrête jamais).
Le +10 d'estime disparaît : rien d'aimable n'est arrivé. C'est la
simulation qui le dit, pas l'équilibrage.

### P5 — la discipline de solde est une loi du pays

Pas de règle globale, et **pas de constante éternelle non plus**
(correction du propriétaire : « rien n'est fixe, c'est une
simulation ») : la discipline entre dans **les lois du pays**
(`lois.js`), comme la peine, l'impôt ou l'esclavage. Elle naît selon
la culture du drapeau (table ci-dessous — des valeurs *initiales*,
pas des destins), et **elle évolue comme toute loi** : les conseils
la votent, le tempérament du dirigeant la penche, et un joueur au
rang de législateur peut peser dessus — le mécanisme existe
(`ctx.legislateur`, rang 4). Un pays de fonctionnaires peut durcir
après une guerre ruineuse ; une armée peut s'embourgeoiser. Valeurs
initiales proposées :

| profil | quand un ordre traîne… | pourquoi (leur logique) |
|---|---|---|
| militaire | solde suspendue à 2 × la route | l'armée ne paie pas les absents |
| fanatique | suspendue à 2 × | la foi ne connaît pas le retard |
| corpo | suspendue à 3 × | le compte se ferme quand le contrat dort |
| nomade | suspendue à 3 × | le fret paie au mouvement |
| commune | **jamais suspendue** | les bras paient tant qu'on est des leurs — c'est leur culture, et un choix de drapeau à faire en connaissance |
| criminel | jamais suspendue, mais l'estime s'érode au-delà de 3 × | on ne fait pas de paperasse, on retient — et on n'oublie pas |

La « rente » cesse d'être un exploit : elle devient la description
exacte de ce que c'est que servir les Communes, avec son revers (la
solde des Communes est la plus basse du jeu).

### P6 — les pillards jaugent leur coup

La bande n'attaque plus à la chance plate : elle évalue **le butin
qu'elle croit** contre **le risque qu'elle voit**, et c'est elle qui
décide.

- *Ce qu'elle croit* : ce qui se voit et se raconte — la vitrine si
  le camp est sur les cartes, les colporteurs repartis chargés (le
  compteur `marchands` existe), la taille du camp. Pas le stock réel :
  les pillards ne lisent pas votre registre.
- *Ce qu'elle voit* : les murs (× l'état de brèche), la garnison, la
  population — et la mémoire des raids repoussés : une bande qui sait
  qu'on s'y casse les dents va voir ailleurs.
- *Sa décision* : elle vient si le rapport lui paraît raisonnable,
  passe sinon, et **vient en nombre proportionné au coup** (la force
  suit le butin espéré, plus seulement le calendrier).

Conséquences vraies : un camp pauvre est plus tranquille
qu'aujourd'hui ; un camp riche et défendu dissuade ; un camp riche et
nu est une proie. Les constantes (poids du butin espéré, du risque,
de la mémoire) en objet calibrable, **balayées au banc** et jugées
sur une partie témoin.

## 4. Ce que ça casse, dit d'avance

- **P3 et P6 rendent le monde plus vrai, donc plus dur par endroits**
  — et plus doux à d'autres : le camp pauvre respire, le fouilleur
  peut rater une bourse. C'est le contrat « simulation pleine ».
- **P5 change le revenu des rentiers** — sauf chez qui la rente est
  une culture (Communes), où elle devient un choix de drapeau assumé.
- **Vieilles sauvegardes** : `g.tactique` par `normaliser` (repli sur
  le global) ; rien d'autre.
- Le monde ne bouge pas d'un dé côté villes/factions ; gardes du banc
  identiques ; tout le hasard nouveau dérivé.

## 5. Les cibles mesurables

1. Un test né rouge par lot : le milicien porte la machette du sac et
   elle part avec lui ; deux groupes, deux tactiques, deux
   rendements ; sur des défaites dérivées, la bourse locale est
   toujours entamée et l'étrangère parfois ratée ; la défaite ne rend
   plus d'estime ; l'ordre qui traîne suspend la solde chez un
   militaire et jamais aux Communes ; à vitrine égale, un camp mieux
   défendu subit moins de raids, un camp plus riche en subit de plus
   gros.
2. Les constantes de P6 et la chance de fouille de P3 balayées au
   banc, partie témoin jouée avant de poser.
3. Gardes du monde inchangées, vitesse dans la fourchette.

## 6. Ce qu'on ne fait pas

Pas de convoi à gages, pas d'offre d'engagement, pas de second fil,
pas de carte achetable — consignés dans REVUE.md, pas engagés ici.
Et plus jamais de règle qui ne vise que le joueur : chaque lot
ci-dessus est porté par un agent qui a sa logique.

## Les décisions du propriétaire

1. **Valider ou amender les six lots** — avec les deux corrections du
   propriétaire intégrées : l'arme suit le corps (P1), la discipline
   est une loi qui évolue (P5).
2. **La table des disciplines initiales (P5)** : six cultures, six
   points de départ — les valider ou en changer. Ce ne sont plus des
   destins : la loi vivra sa vie ensuite.

## L'avancement

- [x] P1 — la milice s'arme à l'arsenal du camp — livré :
  `armerMilice` (la meilleure pièce libre du sac, arme puis armure,
  seulement si mieux que ce qu'il a en main) + `rendreEmprunts` (rien
  ne disparaît : terrain tenu, on relève ses morts et tout revient ;
  camp mis à sac, la pièce d'un tombé reste sur le corps, chez eux ;
  les survivants rendent toujours la leur). Branché dans
  `raidSurLaBase`, quatre tests nés rouges.
- [x] P2 — la tactique est un pari par colonne — livré : `tactiqueDe`
  (groupes.js), lu par le combat ; le panneau règle la colonne
  affichée ; pas de clé posée d'office (l'absence vaut « comme tout le
  monde », rien à migrer).
- [x] P3 — le détroussage est une fouille — livré : `detrousser`
  (events.js, FOUILLE calibrable) — la bourse d'ici toujours trouvée,
  chaque bourse étrangère ratée une fois sur deux, part 0,25-0,55
  inchangée, texte du journal en pièces (les monnaies se mélangent).
  Le coffre en ville reste l'abri sûr.
- [x] P4 — la prime retombe, l'estime ne bouge pas — livré :
  `solderPrime` (le +10 disparaît), deux tests nés rouges.
- [x] P5 — la discipline de solde est une loi du pays — livré :
  `DISCIPLINES` + `disciplineInitiale` (lois.js, née du style du
  drapeau), `disciplineDe` (allegeance.js) jugée sur l'estampille des
  ordres (`o.t`, `o.routeH` — les ordres d'avant ne sont pas jugés :
  on ne juge pas sur des registres qu'on n'a pas tenus), suspension
  de la solde ET de l'intendance avec dépêche à la transition,
  l'Ombrelle retient (−0,02 d'estime/h au-delà de 3 routes), et **la
  loi vit** : le législateur la durcit caisse vide et l'assouplit
  prospère (même moteur que le loyer de l'argent), les rancuniers ne
  légifèrent pas leur mémoire. La fiche de chaque drapeau (écran
  monde) la dit. Sept tests nés rouges.
- [x] P6 — les pillards jaugent leur coup — livré : `jaugeRaid`
  (butin cru = bouches + colporteurs passés + place sur les cartes ;
  risque vu = murs × brèche + têtes, ×1,5 tant qu'un raid repoussé se
  raconte — 240 h de rumeur, `dernierRepousse`), l'appétit multiplie
  la chance de raid (borné 0,15-4), la bande vient taillée pour le
  coup — **le terme `t/600` du calendrier disparaît** (résorbe la part
  camp de l'écart E2 de l'audit). Ancré par équivalence à l'ancienne
  pression pour un camp médian, tenu par test — dont le test de
  doctrine : doubler le stock caché ne change rien à l'appétit, le
  pillard ne lit pas votre registre. Sept tests nés rouges.

## Blocages

- **Le balayage au banc des constantes de P6** (RAID_JAUGE) attend que
  `jouer()` sache mesurer la pression des raids sur un camp — aucune
  métrique joueur du banc ne la voit aujourd'hui, et la règle interdit
  les scripts de mesure à côté. En attendant : ancrage par équivalence
  à l'ancienne pression (test), verdict final au propriétaire en
  jouant.
- ~~**La mesure d'ancre du navigateur** (« ce qu'on lit reste sous les
  yeux ») oscille d'un run à l'autre~~ — **enquête close (août 2026,
  chantier ALLURE G1)** : ce n'était pas que la charge machine. La clé
  d'ancre d'une entrée de journal (« heure + début du texte ») n'était
  pas unique — une rafale de guerre écrit deux entrées identiques à la
  même heure, l'ancre retrouvait le premier doublon et la lecture
  sautait. Tombé au pixel près (quatre runs identiques), bissecté
  jusqu'à l'état commité, corrigé dans le produit : chaque entrée porte
  un numéro d'ordre monotone (`journalN`, creerLogger + normaliser) et
  l'ancre s'y accroche. Le garde n'a pas bougé d'une virgule.

