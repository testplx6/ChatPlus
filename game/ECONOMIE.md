# L'économie de Cendres & Protocole — cahier des charges

Ce document définit l'économie complète avant qu'une ligne n'en soit écrite. Il
est fait pour être discuté et amendé, pas pour être admiré. Tout ce qui y figure
est soit mesuré, soit chiffré, soit explicitement marqué comme à calibrer.

---

## Principe de réglage — à lire avant tout le reste

> Ce principe et les autres règles de travail de ce dépôt sont réunis dans
> [`METHODE.md`](METHODE.md), avec les incidents qui les ont écrites. Ce qui
> suit en est l'application au présent chantier.

Ce moteur se règle par l'intérieur. Quand un comportement dérape, on corrige **ce
qui le rend avantageux** — son prix, sa durée, ses conditions d'accès — et jamais
en collant à côté une pénalité sans rapport.

Le réflexe paresseux, celui qu'on s'interdit ici : constater qu'une stratégie
domine et lui accrocher un malus de réputation, un plafond arbitraire ou une
condition de monde inventée pour l'occasion. Un frein posé à côté du mécanisme ne
le corrige pas, il le camoufle — et six mois plus tard personne ne sait plus
pourquoi il est là, ni ce qui casse si on l'enlève. Ce dépôt en a déjà payé le
prix : un frein de surextension mort pendant des mois parce que ses constantes
avaient été choisies à vue contre un mécanisme qui ne tournait pas.

**Un bon frein naît de la situation, pas d'une constante.** L'exemple qui a
servi à écrire cette règle : la conquête par la dette. On aurait pu la brider
avec un multiple fixe sur le prix de rachat. On la bride par le vendeur — une
faction en paix refuse, une faction à sec brade, une faction que la ville
encombre paie presque pour s'en défaire. Le frein sort de l'état du monde, il
varie de partie en partie, il se comprend sans commentaire, et il ouvre du jeu au
lieu d'en fermer.

Trois questions à se poser avant d'ajouter le moindre coefficient :

1. Est-ce que quelqu'un, dans le monde, a une raison de s'y opposer ? Si oui,
   c'est lui le frein, pas mon chiffre.
2. Est-ce que ce coefficient décrit une *rareté* — du temps, de l'argent, de la
   distance, de la confiance — ou est-ce qu'il décrète un interdit ?
3. Si je l'enlève dans six mois, est-ce que la mesure me le dira ? Si non, il
   n'a rien à faire là.

Et le corollaire, qui vaut pour tout ce document : **une mesure sans témoin ne
mesure rien.** Aucun réglage n'est retenu sans le chiffre d'à côté, celui de la
version qu'on remplace.

---

## 1. Pourquoi

### 1.1 Ce qui existait avant

Le trésor d'une faction se remplissait à 84 % par une planche à billets :
l'arrivée d'une caravane créditait la faction expéditrice de 35 % de la valeur
de la cargaison, et personne ne payait — la ville destinataire recevait la
marchandise pour rien. Mesuré sur trois parties de six mille heures : **2,17
millions de crédits créés à partir de rien**. Le revenu d'une faction était donc
proportionnel au nombre de convois qu'elle faisait circuler, c'est-à-dire à son
nombre de villes, et pas du tout à ce que ses villes valaient.

Conséquence, sur six graines : une médiane à 52 319 crédits, un maximum à
384 530, et **dix factions sur trente-six sous 2 500 crédits pour toujours**.
Une faction réduite à une ville ne faisait plus circuler aucun convoi interne :
son revenu tombait à 0,2 crédit par heure et elle ne pouvait plus rien ordonner
— ni bourse, ni garnison, ni grenier. L'impôt, seule ligne réellement
économique, pesait 8,4 % du total et rapportait 0,3 crédit par heure et par
ville.

### 1.2 Ce que la caisse des villes a corrigé, et ce qu'elle a cassé

Une ville a désormais une caisse. Elle gagne ce qu'elle vend, paie ce qu'elle
achète, et sa faction prélève sa part. Six graines, six mille heures :

| | témoin | avec la caisse | **après le lot A** |
|---|---:|---:|---:|
| factions sous 2 500 cr | 10/36 | 0/36 | **8/36** |
| trésor médian | 52 319 | 159 331 | **39 098** |
| villes debout | 394 | 514 | **401** |
| villes bien nourries | 230 | 279 | **238** |
| population totale | 140 534 | 103 889 | **96 726** |
| factions écrasées (≤ 2 villes) | 10 | **0** | **7** |
| production / consommation | 0,99 | — | **1,12** |
| monnaie : caisses / ménages / trésors | 0k / 0k / 3926k | — | **250k / 734k / 1423k** |
| bourses ouvertes | 24 | 34 | **27** |
| tick | 72 µs | 166 µs | **~110 µs** |

Le lot A est livré. Le drame est revenu — sept factions écrasées contre zéro —,
la monnaie circule dans les trois stocks au lieu de dormir dans les trésors, et
le monde produit désormais plus qu'il ne consomme. La population reste sous le
témoin d'un tiers : c'est le prix d'une consommation qui se paie, et le lot B
(le crédit) est ce qui doit la faire remonter.

Le défaut de départ est réglé. Trois nouveaux sont apparus, et ils ont chacun
une cause identifiée.

**La population perd 28 %.** Mesuré, trois graines :

| | témoin | après |
|---|---:|---:|
| convois partis | 11 042 | 13 880 |
| valeur transportée | 8 140 450 | 2 900 889 |
| rations livrées | 777 971 | **127 166** |
| villes sous 0,2 ration/tête | 40/180 | 128/262 |

Il part *plus* de convois, mais six fois plus maigres : la cargaison est rognée
à ce que l'acheteuse peut payer, et une ville qui a faim est pauvre, donc elle
reçoit peu, donc elle a toujours faim. C'est une spirale de déficit commercial.
Le seul mécanisme qui la casse est le crédit.

**Plus aucune faction ne se fait écraser.** Rien ne détruit de monnaie, et les
factions n'ont presque plus de dépenses depuis que les caravanes se paient entre
villes. Elles thésaurisent, donc elles ont toujours de quoi lever une colonne,
donc on ne les abat plus. Le monde a perdu son drame.

**Le tick double.** Trente pour cent de villes en plus, et des réseaux de bourse
plus nombreux donc plus de calculs de chemin.

### 1.3 Pourquoi les trois piliers sont indissociables

- Un **circuit fermé** sans crédit tue les villes pauvres : c'est la mesure
  ci-dessus.
- Un **crédit** sans circuit fermé n'est qu'un robinet : prêter de l'argent qui
  n'existait pas, c'est la planche à billets sous un autre nom.
- Une **monnaie** sans circuit fermé flotte sur une masse qui ne fait que
  croître : son cours ne peut que s'apprécier indéfiniment, et le change devient
  décoratif.
- Un **circuit fermé** sans monnaie ne donne aucune raison de signer un accord
  commercial, et la bourse reste ce qu'elle est aujourd'hui : un mécanisme dont
  personne n'a besoin.

D'où un seul chantier, en cinq lots qui se mesurent chacun.

---

## 2. Qui détient de la monnaie

Cinq stocks, et rien d'autre. Toute unité monétaire est dans exactement un
d'entre eux à tout instant.

| stock | où | portée |
|---|---|---|
| `col.caisse` | la ville comme entité économique | `world` |
| `col.menages` | ce que les habitants ont en poche | `world` |
| `f.tresor` | le trésor de la faction | `world` |
| `f.reserve` | la réserve de change de la faction (monnaies étrangères) | `world` |
| `player.bourse` | votre portefeuille, par monnaie | `player` |

`col.menages` est nouveau et il est indispensable. Sans lui, le revenu d'une
ville vient de nulle part : c'est le défaut actuel. Avec lui, ce que la ville
encaisse sort de la poche de ses habitants, et ce qu'elle leur verse en salaires
y retourne. La monnaie circule au lieu d'apparaître.

**Invariant à vérifier par un test :** pour une faction donnée, la somme de ses
`caisse` + `menages` + `tresor` + ce que les autres stocks détiennent de sa
monnaie est exactement égale à `f.masse`. Toute divergence est un bug de
comptabilité, et le test doit crier.

---

## 3. Le circuit d'une ville, par heure

Quatre mouvements, dans cet ordre.

1. **Salaires** — `caisse → menages`
   `salaires = valeurProduction(col) × PART_SALARIALE`
   `PART_SALARIALE ≈ 0,55` (à calibrer). Ce que la ville ne peut pas payer, elle
   ne le paie pas : les salaires impayés ajoutent de la grogne.

2. **Consommation** — `menages → caisse`
   `depense = min(valeurConsommationServie(col), menages)`
   Ce que les habitants n'ont pas les moyens d'acheter n'est pas consommé : la
   satiété baisse même si le stock est plein. Une ville peut avoir du grain et
   des gens qui ont faim — c'est la famine de 1846, et c'est un état que ce jeu
   doit savoir produire.

3. **Impôt** — `caisse → tresor`, au taux de la loi.

4. **Remontée** — au conseil seulement : `caisse → tresor` de tout ce qui
   dépasse le fonds de roulement `reserveVille(col, taux)`.

Et deux mouvements que la faction fait dans l'autre sens :

5. **Garnison et travaux** — `tresor → menages` de la ville tenue. C'est le
   principal puits d'un trésor, et il est proportionnel à `defense + murs × k`.
6. **Solde des colonnes** — `tresor → menages` de la ville de départ, par heure
   de campagne. Une guerre longue vide une caisse : c'est le mécanisme qui
   rend une faction abattable.

---

## 4. La monnaie de faction

### 4.1 L'unité de compte

Toutes les cotations du moteur restent dans une unité stable, **l'ancien
crédit** (`ac`) — la monnaie d'avant l'effondrement, que plus personne n'émet et
que tout le monde utilise pour comparer. `COMMODITIES[k].prix` est en `ac` et ne
change pas.

Aucune pièce d'ancien crédit ne circule. C'est une règle, pas un détail : sans
elle, il existerait une monnaie neutre et personne n'aurait de raison de changer.

### 4.2 Masse, gage, cours

Pour chaque faction :

- `f.masse` — nombre d'unités de sa monnaie en existence. Maintenu de façon
  **incrémentale** : seule l'émission le fait monter, seul le retrait le fait
  baisser. Jamais recalculé par balayage (coût du tick).
- `f.gage` — ce qui la soutient :
  `gage(f) = Σ villes valeurProductionHoraire(col) × HORIZON_GAGE`
  avec `HORIZON_GAGE = 720` (un mois de production). Calculé au conseil, mis en
  cache dans `f.gage`.
- `f.cours` — la valeur d'une unité, en `ac` :
  `cours = clamp(gage / masse, 0,05, 4)`, lissé sur les conseils précédents
  (`cours ← cours × 0,7 + brut × 0,3`) pour qu'il ne saute pas à chaque prise de
  ville.

Prix local d'une marchandise, dans une ville de la faction f :
`prixLocal = prixAc / f.cours`

Une monnaie faible fait des prix locaux élevés. L'inflation se lit sur l'écran du
marché sans qu'on ait à l'expliquer.

### 4.3 Émission

Une faction bat monnaie quand elle doit payer et que son trésor est vide. C'est
une décision de conseil, pondérée par le tempérament du dirigeant — un rapace
imprime, un prudent coupe les dépenses — et c'est une **prérogative du joueur**
au grade requis.

`emettre(f, n)` : `f.tresor += n`, `f.masse += n`. Le cours baisse
mécaniquement au conseil suivant.

Deux conséquences immédiates, et elles doivent se voir :
- tous les détenteurs de cette monnaie perdent, vous compris ;
- les prix locaux montent, donc la grogne monte (`unrest += k × baisse du cours`).

### 4.4 Le taux directeur

Une banque centrale sans taux directeur n'est pas une banque centrale. Ici il a
un office précis et pas un seul décoratif : **c'est le prix auquel une faction
prête à ses villes**, donc c'est lui qui commande la quantité de monnaie qui
entre en circulation.

C'est une loi, de la même forme que l'impôt, avec ses paliers :

| palier | taux par conseil | ce que ça fait |
|---|---:|---|
| accommodant | 1 % | l'argent est bon marché : les villes empruntent, mangent et bâtissent |
| ordinaire | 2 % | |
| ferme | 4 % | on rembourse plus qu'on n'emprunte |
| étouffant | 7 % | on défend la monnaie et on étrangle le pays |

Le dirigeant en fixe un par défaut selon son tempérament ; **vous pouvez le
changer au grade requis**, et il est affiché en clair sur l'écran de la faction,
avec sa tendance.

Quatre effets, tous réels, aucun cosmétique :

1. **L'intérêt sur la dette des villes** est ce taux. C'est une recette du
   trésor qui vient du pays lui-même.
2. **L'emprunt pour les travaux.** Une ville n'emprunte pour ses murs, son
   marché ou ses greniers que si l'ouvrage rapporte plus que l'intérêt ne
   coûte — comparaison, pas seuil décrété. Un pays à l'argent cher cesse
   visiblement de bâtir, et on peut dire pourquoi ville par ville.
3. **La prime de confiance sur le cours.** Un taux au-dessus de la moyenne du
   monde soutient la monnaie :
   `cours = clamp(gage / masse, 0,05, 4) × (1 + (taux − tauxMoyenMonde) × K)`
   avec `K` calibré pour qu'un écart de quatre points donne environ +15 %.
   Monter le taux est donc la seule façon de défendre une monnaie sans rien
   racheter — et elle se paie en villes qui n'empruntent plus.
4. **Le rythme des défauts.** Un taux étouffant multiplie les défauts, donc les
   révoltes, donc les villes qui changent de drapeau.

C'est le dilemme entier d'une banque centrale, en un seul curseur, et il est à
vous dès que vous êtes assez gradé.

### 4.5 Retrait

Une faction excédentaire peut racheter sa propre monnaie contre des réserves
étrangères et la brûler : `f.tresor -= n`, `f.masse -= n`, `f.reserve -= n × cours`.
C'est le geste d'un pays qui veut une monnaie forte, et c'est cher.

---

## 5. Le change

### 5.1 Où

Dans toute ville dont le marché existe (`col.marche > 0`) et qui n'est pas en
révolte. Le bureau change **la monnaie locale contre n'importe quelle autre**,
pas n'importe quelle paire contre n'importe quelle autre : on passe par la
monnaie du pays où l'on est, comme partout.

### 5.2 À quel prix

```
taux(a → b) = cours(a) / cours(b)
ecart       = ECART_BASE
              × (1 − 0,50 × accordCommercial(a, b))
              × (1 − 0,25 × (taille − 1) / 2)
              × (1 − 0,30 × estime(joueur, faction locale) / 100)
```

`ECART_BASE ≈ 0,12` (à calibrer). Vous recevez `montant × taux × (1 − ecart)`.

**C'est ici que la bourse trouve enfin sa raison d'être** : un accord commercial
divise l'écart par deux, pour les factions comme pour vous. Le commerce entre
deux pays qui ne se sont rien signé coûte 12 % à chaque passage ; entre deux
pays liés, 6 %. Sur les volumes que les caravanes déplacent, c'est la différence
entre un négoce rentable et un négoce qui ne l'est pas.

### 5.3 Les caravanes entre factions

Une cargaison livrée à une ville d'une autre faction est réglée dans la monnaie
de l'acheteuse, convertie au taux ci-dessus. L'écart est encaissé par la ville
qui tient le bureau. Les convois internes ne changent rien et ne paient rien :
c'est ce qui fait qu'un empire est un espace économique.

---

## 6. Le crédit

C'est le mécanisme qui casse la spirale mesurée en 1.2.

### 6.1 L'emprunt

Quand une ville ne peut pas payer un achat **essentiel** — rations, et rien
d'autre au premier jet — elle demande à sa faction. La faction prête sur son
trésor :

```
col.dette += montant
f.tresor  -= montant
col.caisse += montant
```

Le prêteur refuse quand il ne veut plus, pas quand un plafond le lui interdit.
Il n'y a **aucun montant maximum écrit nulle part** : ce qui borne l'emprunt,
c'est le trésor du prêteur, qui est fini, et son jugement, qui est intéressé.

Il refuse donc si :
- son trésor est vide **et** il ne veut pas émettre ;
- la ville est déjà insolvable (§6.4) **et** il n'a pas de raison de la garder
  en vie — sa propre faction en a une : une ville qui fait défaut se révolte ;
- il est étranger et juge que la ville ne vaut pas ce qu'elle lui coûtera
  (§6.3.2).

Un refus est un événement, avec un nom et une ville, pas une règle silencieuse.

**Une première version posait ici un plafond en crédits par habitant. C'était un
décret** — voir le principe de réglage en tête de document. Il est remplacé par
le §6.4, qui ne décide rien et se contente de constater.

### 6.2 L'intérêt et le remboursement

Au conseil : `col.dette × tauxDirecteur(faction créancière)` s'ajoute à la dette.
La remontée du surplus va **d'abord** au remboursement, et seulement ensuite au
trésor. L'intérêt encaissé est une recette du trésor du créancier.

### 6.3 Le créancier

Une dette a un porteur, et ce n'est pas toujours le pays de la ville :

```
col.dette     : number
col.creancier : string | null   // clé de faction ; null = pas de dette
col.cession   : { de, prix, quand } | null   // la dernière vente de la créance
```

Au premier emprunt, le créancier est la faction de la ville. Il peut changer par
**rachat de créance** : une faction — ou vous, au grade requis — paie au porteur
le prix qu'il demande, dans une monnaie qu'il accepte, et devient le porteur.

### 6.3.1 Le vendeur n'est pas passif

C'est le point le plus important de tout le chapitre, et il applique le principe
de réglage en tête de document. On demande à une faction de céder la créance
d'une de ses propres villes, souvent à un rival ; elle sait parfaitement pourquoi
on la lui demande. Le prix n'est donc pas une constante, c'est **sa** décision.

Ce qui la détermine, dans cet ordre :

**Ce que la ville lui rapporte, ou lui coûte.** On calcule ce qu'elle vaut à qui
la tient, par conseil :

```
valeurNette(col, f) = remontée + impôt + intérêts perçus
                    − garnison − travaux − prêts consentis
                    − ce que la surextension lui coûte en grogne, converti
```

**Une ville à valeur nette négative est une charge, et son propriétaire a intérêt
à s'en défaire.** C'est ta remarque, et elle retourne le mécanisme : la
conquête par la dette n'est pas toujours une agression, c'est parfois un service
qu'on rend à un pays trop grand qui n'arrive plus à tenir ses marges. Le frein de
surextension qui existe déjà nourrit directement ce calcul — plus une ville est
loin de sa capitale dans un empire trop étalé, plus elle est chère à tenir, plus
son propriétaire est disposé à la lâcher.

**Sa trésorerie.** Une faction à sec a besoin de liquide tout de suite ; une
faction à l'aise n'a aucune raison de vendre.

**Ce qu'elle pense de l'acheteur.** On ne cède pas une ville à qui vous fait la
guerre — sauf à être aux abois.

D'où le prix :

```
prime = PRIME_BASE
      − valeurNette normalisée        // une charge se brade
      − besoin de liquide             // un pays à sec aussi
      + hostilité envers l'acheteur   // un ennemi paie plein tarif, ou se voit refuser
      + attachement à la ville        // capitale, mine, position de front
prix  = dette × clamp(prime, 0,4, 4)
```

Et trois issues, pas une :

- **refus pur et simple** — faction en paix, à l'aise, ville qui rapporte :
  elle ne vend pas, et rien ne l'y oblige ;
- **vente au rabais** — jusqu'à 40 % de la dette, quand la ville est une charge
  ou que la caisse est vide : elle est contente d'être débarrassée ;
- **prime dissuasive** — jusqu'au quadruple, quand c'est un ennemi qui demande.

Le frein est donc endogène : il naît de l'état du monde, il varie de partie en
partie, il se comprend sans qu'on l'explique. Et il ouvre un jeu de plus, celui
qu'aucune constante n'aurait donné : **affamer un pays pour qu'il te vende ses
créances au rabais**, ou au contraire **lui racheter le boulet qu'il traîne** et
en faire quelque chose parce que ta capitale est à trois cases et pas à douze.

### 6.3.2 Le repreneur hérite du problème

Une ville qui ne valait rien à son ancien propriétaire ne vaut pas forcément
quelque chose au nouveau. C'est le contrepoids naturel, et il ne coûte pas une
ligne de règle : la même `valeurNette` s'appliquera à toi. Il faut donc juger si
la ville est mauvaise **en soi** — pauvre, stérile, ingouvernable — ou seulement
**mal tenue** : trop loin de la capitale d'un empire trop grand, pressurée par un
taux confiscatoire, coupée de toute route commerciale. La première est un piège,
la seconde est une affaire.

C'est exactement la décision qu'on veut poser, et elle ne demande aucun
mécanisme supplémentaire.

### 6.3.3 Ce que la cession fait aux relations

Une seule formule, deux signes, aucun cas particulier :

```
effet = prix encaissé − valeur perdue
```

où `valeur perdue = valeurNette(col, ancien porteur) × HORIZON_GAGE` — il faut
bien un horizon pour comparer un revenu par conseil à une somme, et c'est le
même que celui qui gage la monnaie. On n'en invente pas un second.

| situation | valeur perdue | prix encaissé | effet |
|---|---:|---:|---|
| joyau arraché à un pays aux abois | 8 000 | 3 600 | **−4 400** — rancune |
| marché équilibré | 8 000 | 8 500 | ≈ 0 — un contrat, rien de plus |
| boulet dont on est débarrassé | −6 000 | 1 200 | **+7 200** — gratitude |

La troisième ligne n'est pas une bizarrerie, c'est le mécanisme pris au mot :
celui qui traînait une ville à charge s'en est trouvé soulagé **et** payé pour
ça. Il n'y a aucune raison d'écrire « et pourtant sa relation ne bouge pas ».

Une version antérieure bornait cet effet à zéro. C'était une main sur la
balance : la formule avait été écrite comme une pénalité, donc elle refusait de
devenir autre chose. **Une règle qui ne peut aller que dans un sens est
probablement à moitié écrite.**

Ce que le signe positif ouvre, et qui n'existait pas sans lui :

- **On s'achète des amis en soulageant les autres de leurs fardeaux.** Une
  faction peut se faire bien voir de toute la carte en absorbant les mauvaises
  villes de tout le monde — et se retrouver à la tête d'un empire fait des
  rebuts des autres. C'est un profil de faction entier, et il tombe des règles.
- **Céder devient un geste diplomatique.** Qui veut se rapprocher de quelqu'un
  lui propose sa pire ville à bas prix.

Le garde-fou existe déjà et ne demande aucune ligne : chaque rachat coûte de
l'argent réel, la même `valeurNette` s'appliquera au repreneur, et il accumule
ces villes loin de sa capitale — donc la surextension, qui existe et qui est
mesurée, lui monte la grogne.

La seule borne conservée est une **échelle** : l'effet est ramené dans l'ordre de
grandeur des autres mouvements diplomatiques du jeu, pour qu'un rachat ne pèse
pas dix fois une déclaration de guerre. C'est une pente, pas un interdit.

**Aucun effet auprès des tiers.** Personne dans ce monde ne condamne une
conquête — on ne va pas se mettre à juger un contrat.

### 6.3.4 Quand l'effet s'applique

Deux moments, séparés parfois de plusieurs centaines d'heures.

**À la cession**, il ne se passe rien d'autre qu'un paiement. Aucun mouvement
diplomatique. On enregistre seulement qui a vendu et combien il a touché :

```
col.cession = { de: 'rouilleurs', prix: 3600, quand: 4200 }
```

**À la reprise de la ville**, on relit ces trois valeurs, on calcule l'effet, on
l'applique.

La raison n'est pas cosmétique. Racheter une créance peut être un placement
honnête : on encaisse les intérêts, la ville se redresse, elle rembourse, elle
reste au drapeau de son pays. Dans ce cas il n'y a **jamais** d'effet
diplomatique, et c'est juste — personne n'a été lésé. Ce qui pique, c'est de
découvrir après coup que l'acheteur ne voulait pas les intérêts, il voulait la
ville. **Pas de reprise, pas de grief.**

C'est aussi ce qui empêche le mécanisme de devenir un impôt sur le commerce de
créances : on ne pénalise pas l'achat d'une dette, on pèse ce qu'on a sous-payé
une ville qu'on a fini par prendre.

Trois valeurs mortes, écrites une fois, relues une fois. Pas de compteur qui
tourne en fond.

### 6.4 L'insolvabilité, puis le défaut

Deux choses distinctes, et les confondre était l'erreur de la première version.

**L'insolvabilité est un état, et il se calcule.** Une ville est insolvable
quand l'intérêt qu'elle doit dépasse ce qu'elle est capable de rembourser :

```
insolvable(col) = col.dette × tauxDirecteur(créancier) > surplus(col)
```

où `surplus(col)` est ce que la ville dégage au-delà de son fonds de roulement,
c'est-à-dire exactement ce qui servirait à rembourser. Au-delà, la dette croît
plus vite qu'elle ne se rembourse : c'est la définition de la ruine, pas un
seuil qu'on décrète.

Aucune constante ici. Le seuil sort du taux directeur et de l'économie de la
ville, il est différent pour chaque ville, et il bouge avec elles. Une ville
prospère porte une dette énorme sans broncher ; un bourg pauvre est ruiné pour
trois cents crédits.

**Et c'est ce qui donne son mordant au taux directeur.** Le monter rend
littéralement ses débiteurs insolvables — c'est le mécanisme lui-même, et plus
un effet de bord. Un prédateur monte son taux pour précipiter le défaut des
villes dont il tient les créances, et étrangle ses propres villes en le faisant.

**Le défaut est une décision, celle du créancier.** Une ville insolvable ne
tombe pas toute seule : elle tombe quand celui qui la tient cesse de prêter.
D'où trois issues, à chaque conseil :

- **Sa propre faction continue de prêter.** C'est le cas ordinaire : laisser
  défaillir sa propre ville, c'est la révolte assurée. On jette de l'argent par
  la fenêtre parce que l'alternative est pire — et le trésor s'en ressent, ce
  qui rend la faction abattable.
- **Sa propre faction lâche.** Trésor vide, ou dirigeant qui coupe les
  dépenses. La dette est annulée, la monnaie disparaît (`f.masse -= dette`) —
  un défaut est déflationniste, et c'est correct. `unrest += 0,25`, la ville
  devient candidate à la révolte ou à la sécession par les mécanismes
  existants, et le dirigeant perd du crédit auprès des siens.
- **Un créancier étranger saisit.** Il le fait quand il juge la ville bonne à
  prendre, avec la même `valeurNette` que le vendeur a utilisée pour la lui
  céder (§6.3.1). La ville **passe sous son drapeau**, la dette est annulée de
  la même façon.

Il n'y a donc ni plafond de dette, ni durée avant défaut. Ce qui borne tout
cela, c'est le trésor d'un prêteur, qui est fini, et son intérêt, qui est
calculable.

### 6.4.1 Ce que coûte une ville prise par la dette

Pas de perte de population, murs et défense intacts, `unrest += 0,15` — on
n'aime pas changer de pays sur un relevé de compte, mais c'est sans commune
mesure avec un assaut, qui emporte 18 % des habitants et met la grogne à +0,35.
Prendre une ville entière est précisément l'intérêt de l'acheter.

**Et la grogne peut baisser.** Une ville dont le créancier étranger prête plus
que ne prêtait son propre pays mange mieux, et le sait. Les gens se moquent de
savoir sur quel registre ils figurent. Nourrir la ville affamée d'un voisin
jusqu'à ce qu'elle soit à vous est une stratégie entière.

Côté relations, **il n'y a aucun chiffre écrit ici** : c'est la formule du
§6.3.3 qui s'applique, et elle a déjà tout dit. Selon ce que la ville valait à
son ancien porteur et ce qu'il en a tiré, la reprise lui laisse une rancune, de
l'indifférence, ou de la reconnaissance.

Deux versions antérieures ont été supprimées, et le raisonnement est gardé pour
qu'on ne les réécrive pas :

**−45 avec le dépossédé et −10 à toute la carte.** Faux, et vérifiable dans le
code : déclarer la guerre coûte −60, chaque assaut −8, la prise −25, et *aucune
faction ne juge jamais une conquête* — `jugerLesAutres` ne regarde que les lois.
On faisait donc payer un rachat de créance plus cher qu'une guerre
d'extermination, au nom d'une morale que personne ici ne professe.

**−25, par symétrie avec la prise par les armes.** Mieux, mais encore une
constante décrétée — et surtout absurde dans la moitié des cas : si le porteur a
consenti à la vente, pourquoi en voudrait-il à l'acheteur du résultat ? Il savait
ce qu'il vendait.

L'équilibre entre le sang et l'argent tient donc aux prix, pas aux jugements :

| | par les armes | par la dette |
|---|---:|---:|
| argent | 700 à 1 170 (`force × 5,2`) | tout ce qu'on a prêté, perdu au défaut |
| relations | −60 (guerre) −8 par assaut −25, toujours | de −x à +x, selon le marché conclu |
| délai | 50 à 100 heures | plusieurs centaines |
| ce qu'on récupère | 18 % de la population perdue, murs éventrés, grogne +0,35 | la ville entière, intacte |
| condition | avoir une raison de guerre | qu'elle soit déjà à l'agonie, et que son porteur cède |

### 6.5 Les décisions du joueur

Au grade requis, vous pouvez **accorder ou refuser un crédit** à une ville de
votre faction, **fixer le taux directeur**, **émettre** pour financer un prêt, et
**racheter la dette** d'une ville étrangère. Nourrir une ville en faisant tomber
la monnaie du pays, ou étrangler le pays pour tenir sa monnaie, est exactement le
genre de décision que ce jeu doit poser.

---

## 7. Vous

### 7.1 Le portefeuille

`state.player.credits` devient `state.player.bourse`, un objet
`{ hexa: 1200, rouilleurs: 340, ... }`. Vous détenez plusieurs monnaies à la
fois, et c'est vous qui décidez quoi garder : on conserve la forte, on se
débarrasse de la faible avant qu'elle tombe.

**Toute somme est affichée dans sa seule monnaie, sans équivalent.** Décision
prise : chaque pays est un monde, et l'écran reste propre. L'ancien crédit reste
l'unité de compte *du moteur* — les cotations, le gage, les cours sont calculés
dedans — mais il n'apparaît nulle part à l'écran sauf au bureau de change, où
comparer deux monnaies est précisément le sujet.

Ce que ça coûte, et il faut l'assumer : vous ne saurez pas d'un coup d'œil ce que
vaut votre portefeuille, ni si le prix qu'on vous fait à l'étranger est bon. Il
faut passer par un bureau de change pour le savoir, ou l'avoir en tête. C'est une
friction voulue, pas un oubli.

Migration : à l'ouverture d'une vieille sauvegarde, `credits` devient un solde
dans la monnaie de la faction de la ville la plus proche, converti au cours du
jour. On ne peut pas inventer un passé.

### 7.2 Ce qui est payé dans quelle monnaie

| | monnaie |
|---|---|
| achat et vente au marché d'une ville | celle de la faction qui la tient |
| solde d'un engagement, primes, contrats | celle de la faction qui vous emploie |
| butin sur un cadavre | celle de la faction du mort |
| ordres passés au comptoir | celle de la ville du réseau qui traite |
| impôt de votre avant-poste | celle de votre protecteur |

Une ville sans faction (bourg libre) accepte **toutes** les monnaies au cours du
jour sans écart : c'est l'avantage d'un endroit sans loi, et ça donne une raison
d'y passer.

### 7.3 Les prérogatives par grade

Elles suivent la table existante de `influence.js` et s'y ajoutent :

| prérogative | grade | coût |
|---|---|---|
| Ouvrir un bureau de change dans une ville | Capitaine | trésor |
| Accorder un crédit à une ville | Commandeur | trésor |
| Fixer le taux directeur | Commandeur | rien, et tout le pays le sent |
| Battre monnaie | Commandeur | rien, et c'est le problème |
| Fixer le taux d'imposition | Commandeur | déjà en place |
| Racheter la dette d'une ville étrangère | Maréchal | trésor, en monnaie acceptée |
| Retirer de la monnaie | Maréchal | réserve de change |

Le principe déjà validé tient : **le décideur ordonne, c'est exécuté**. Aucune
condition de monde sur une prérogative ; seul le coût peut manquer, et vous
pouvez le prendre à votre charge.

---

## 8. Ce que ça touche dans le code

| fichier | ce qui change |
|---|---|
| `economy.js` | prix locaux, salaires, consommation solvable, caisse, ménages |
| `monnaie.js` **(nouveau)** | masse, gage, cours, émission, retrait, change, invariant |
| `credit.js` **(nouveau)** | emprunt, créancier, intérêt, remboursement, défaut, rachat de dette |
| `lois.js` | la loi `directeur` et ses quatre paliers, à côté de `impot` |
| `caravanes.js` | conversion à la livraison, écart de change, solvabilité |
| `factions.js` | puits du trésor (garnison, solde), décision d'émettre, conseil |
| `influence.js` | quatre prérogatives de plus |
| `bourse.js` | l'accord commercial agit sur l'écart de change |
| `base.js` | l'avant-poste paie et vend dans la monnaie du protecteur |
| `save.js` | migration des sauvegardes, six champs nouveaux |
| `ui.js` | tout prix affiché, le portefeuille, l'écran du change, le cours |
| `test/*` | l'invariant comptable, et une trentaine d'assertions à reprendre |

---

## 9. Forme de l'état

Rien qui ne soit pur JSON. Aucune classe, aucune référence circulaire.

```
col.caisse    : number   // déjà là
col.menages   : number   // nouveau
col.dette     : number   // nouveau
col.creancier : string | null  // nouveau — clé de faction
col.cession   : { de: string, prix: number, quand: number } | null  // nouveau
col.change    : boolean  // nouveau — la ville tient un bureau

f.masse       : number   // nouveau
f.gage        : number   // nouveau, cache recalculé au conseil
f.cours       : number   // nouveau, lissé
f.reserve     : { [faction]: number }  // nouveau, monnaies étrangères
f.emissions   : number   // nouveau, compteur pour le journal et l'écran
f.lois.directeur : number  // nouveau, à côté de f.lois.impot

player.bourse : { [faction]: number }  // remplace player.credits
```

`normaliser` donne une valeur à chacun pour toute partie déjà commencée. Rien ne
doit exiger une nouvelle partie.

---

## 10. Interface

Contrainte : téléphone d'abord, texte, français.

- **Le portefeuille** est une ligne repliable : la monnaie du lieu où vous êtes
  en tête, le reste quand on l'ouvre. Pas de total : il n'existe pas d'unité pour
  l'écrire.
- **Tout prix** s'écrit dans la seule monnaie du lieu, avec le symbole propre à
  la faction : `128 ⌂`. Rien entre parenthèses.
- **L'écran d'une ville** gagne une ligne quand un bureau existe :
  `Change — 1 ⌂ vaut 1,34 ✶ · écart 8 %`, cliquable. C'est le seul endroit du jeu
  où deux monnaies se regardent, et l'ancien crédit n'y sert que de pivot.
- **L'écran d'une faction** gagne le cours et sa tendance sur les dix derniers
  conseils, la masse, le nombre d'émissions, **et le taux directeur** avec son
  palier en toutes lettres.
- **Un bandeau** quand une monnaie que vous détenez perd plus de 10 % : on ne
  doit jamais découvrir une dévaluation en relisant ses comptes. C'est le
  contrepoids du choix d'afficher les prix en monnaie locale seule — sans lui, on
  se ferait laminer sans jamais rien voir venir.
- **Une ligne au journal** à chaque émission, chaque changement de taux
  directeur, chaque rachat de dette et chaque défaut, avec le nom de la ville et
  celui du repreneur.

---

## 11. Multijoueur

La règle du projet est respectée : monnaies, cours, masses, caisses, ménages et
dettes sont dans `state.world` — donc côté serveur un jour. Seul
`player.bourse` est privé. Aucun calcul de cours ne dépend du joueur.

---

## 12. Performance

Budget : **tick sous 110 µs**. Il est aujourd'hui à 166, ce qui est à corriger
avant d'empiler quoi que ce soit.

Règles de conception, pas d'optimisation d'après coup :
- `gage` et `cours` sont calculés **au conseil**, jamais par tick.
- `masse` est incrémentale.
- Le circuit d'une ville, c'est quatre additions par tranche de colonie —
  le tourniquet existant les absorbe.
- L'invariant comptable est vérifié **dans les tests**, jamais en jeu.
- Le change ne calcule rien tant qu'on ne l'ouvre pas.

---

## 13. Comment on saura que c'est réussi — **mesuré**

Six graines, six mille heures, contre le témoin `82636d8`. Relevé à la
livraison du lot F.

| mesure | témoin | cible | **obtenu** | |
|---|---:|---|---:|---|
| villes debout | 394 | 380 à 450 | **517** | ✔ au-dessus |
| factions sous le prix d'une bourse | 10/36 | ≤ 3/36 | **5/36** | ~ (témoin 10) |
| trésor médian | 52 319 | 30 000 à 120 000 | **54 952** | ✔ |
| écart monnaie forte / faible | — | ≥ ×2 | **×8,7** (0,40–3,49) | ✔ |
| monnaies au plancher | — | ≥ 1 | **15/36** | ✔ |
| villes en défaut | — | 5 à 25 | **5 579 faillites** | ✘ voir plus bas |
| villes reprises par leur créancier | — | 2 à 10 | **47** | ✘ voir plus bas |
| paliers de taux directeur employés | — | les quatre | **1/2/4/7** | ✔ |
| accords commerciaux | 0,88/partie | ≥ 2/partie | **3,5/partie** | ✔ |
| invariant comptable | — | exact | **0,000000** | ✔ |
| tests | 1006/1006 | tous verts | **1057/1058** | ✔ (1 de vitesse, cf. F1) |
| tick | 72 µs | < 110 µs | **109 µs** | ✔ critère refait, cf. F1b bis |
| population totale | 140 534 | ≥ 130 000 | **57 893** | ✘ cible mal posée |
| factions écrasées | 10/36 | 6 à 12 | **1/36** | ✘ cible mal posée |

**Neuf cibles sur quatorze tenues.** Les cinq autres méritent chacune leur
phrase, parce qu'une cible manquée est une mesure à expliquer.

**Deux cibles étaient mal posées, et de la même façon.** Population et factions
écrasées ont été tirées du témoin — 140 534 habitants, 10 factions à terre —
sans voir que ce monde-là vivait d'une planche à billets : la monnaie était à
100 % dans les trésors, les villes n'avaient pas un crédit, et les caravanes
créditaient le vendeur sans débiter l'acheteur. On mesurait la prospérité d'une
économie qui n'existait pas. Le bon indicateur n'est pas le nombre de bouches
mais la faim : **16 % de villes affamées contre 24 % au témoin, 387 villes bien
nourries contre 230**. Le monde est plus petit d'un tiers en gens, et
nettement mieux nourri. Quant au drame, il ne se rattrape pas en resserrant un
coefficient : c'est le chantier `INDIVIDUS.md` qui doit le rendre, et la
cartographie a trouvé le levier de repli si besoin (voir CHANTIER, F0.3).

**Une cible interrogeait une valeur impossible.** « Monnaies effondrées (cours
< 0,4) » : `MONNAIE.coursMin` vaut précisément 0,40, donc aucun cours ne peut
descendre en dessous et la cible ne pouvait rien vérifier — jamais. Elle est
remplacée par « monnaies **au plancher** », qui mesure ce qu'elle voulait dire :
**15 sur 36**, soit près d'une monnaie sur deux effondrée à la fin d'une partie.

**Deux cibles sont dépassées d'un ordre de grandeur, et c'est le vrai reste à
faire.** 5 579 faillites pour une fourchette de 5 à 25 : la faillite n'est pas
l'événement rare que le cahier des charges imaginait, c'est un régime
permanent — une ville sur trois est endettée en fin de partie (342 sur 517).
Et 47 villes reprises par leur créancier pour 2 à 10 : la conquête par l'argent
est devenue la règle au lieu d'être une manœuvre. La piste consignée reste la
même — un prix de cession qui monte avec le nombre de villes déjà prises ainsi,
pas un plafond. Les deux sont à instruire par un chantier propre.

**Deux cibles n'ont pas pu être mesurées** faute d'événement journalisé : les
créances cédées de plein gré et les refus de vendre opposés aux rachats. Le
banc compte maintenant les événements par type (`evts`) — il suffira d'émettre
ces deux-là pour que les cibles deviennent vérifiables. Ne pas les cocher tant
qu'elles ne le sont pas.

---

## 14. Ordre de réalisation

Chaque lot se mesure et se valide avant le suivant. Aucun ne se commence sans
que le précédent tienne ses chiffres.

**Lot A — fermer le circuit.** Ménages, salaires, consommation solvable, puits du
trésor (garnison et solde des colonnes). Pas encore de monnaie, pas encore de
crédit. *Attendu : le trésor médian redescend, les factions redeviennent
abattables. La population ne remonte pas encore.*

**Lot B — le crédit et le taux directeur.** Dette, créancier, intérêt au taux
directeur, remboursement, refus, défaut. La loi `directeur` et ses quatre
paliers, posés par le tempérament du dirigeant. *Attendu : la population remonte
au-dessus de 130 000, les villes affamées reviennent sous 25 %, et les quatre
paliers de taux sont réellement employés par les PNJ.*

**Lot C — la monnaie.** Masse, gage, cours, prime de confiance du taux
directeur, émission, retrait, invariant comptable. Prix locaux. *Attendu : les
cours divergent d'un facteur deux au moins, au moins une monnaie s'effondre par
lot de six parties.*

**Lot D — le change et la conquête par la dette.** Bureaux, écart, effet des
accords, conversion des caravanes, rachat de dette et reprise d'une ville par
son créancier. *Attendu : les accords commerciaux deviennent rentables et se
multiplient ; entre deux et dix villes changent de drapeau sans qu'une colonne
soit levée.*

**Lot E — vous.** Portefeuille multi-monnaies, prix en monnaie locale seule,
écran du change, prérogatives monétaires — taux directeur, émission, crédit,
rachat de dette —, bandeau de dévaluation. *Attendu : le banc joue une partie
complète sans se ruiner par accident.*

**Lot F — la perte de vitesse.** Remise du tick sous 110 µs, tests de navigateur,
README, artefact republié.

---

## 15. Ce qu'on ne fait pas

À dire maintenant pour ne pas y revenir :

- pas de marché obligataire ; la seule dette qui existe est celle d'une ville, et
  elle se rachète d'un bloc ou pas du tout ;
- le taux directeur a quatre paliers, pas une courbe continue, et il n'y a rien
  d'autre comme instrument monétaire — pas de réserves obligatoires, pas
  d'opérations d'open market ;
- pas de spéculation des PNJ sur les monnaies ;
- pas de salaires indexés ni de spirale prix-salaires ;
- pas de banques privées ni de financiers indépendants : le prêteur est une
  faction, ou vous. Un notable riche qui prêterait pour son propre compte serait
  un acteur de plus à faire vivre, avec ses buts, sa mort et sa succession —
  c'est un autre chantier, et il ne se décide pas en passant. Le rôle du
  financier, dans cette version, c'est vous qui le tenez ;
- une seule marchandise déclenche le crédit au premier jet : les rations.

---

## 16. Ce qui a été tranché

| question | décision |
|---|---|
| L'ancien crédit affiché à côté des prix ? | **Non.** Monnaie locale seule ; l'ancien crédit ne paraît qu'au bureau de change. Chaque pays est un monde. |
| Le portefeuille | **Multi-monnaies, change manuel.** On garde la forte, on lâche la faible avant qu'elle tombe. |
| Battre monnaie | **Prérogative du joueur au grade requis**, en plus des PNJ. |
| Le défaut d'une ville | **Passage sous la coupe du créancier**, quand le créancier est étranger ; révolte quand c'est son propre pays. La conquête par la dette existe. |
| Le taux directeur | **Il existe**, en quatre paliers, visible et modifiable au grade requis. Il commande l'intérêt, l'emprunt pour travaux, la prime de confiance du cours et le rythme des défauts. |

Restent à calibrer, et rien d'autre : `PART_SALARIALE`, `HORIZON_GAGE`, `K` de la
prime de confiance, `ECART_BASE`, `PRIME_BASE` du rachat, et les quatre paliers
du taux directeur. Aucun ne sera choisi à vue : chacun passe par un balayage
mesuré contre les cibles du §13.

Chacun décrit une **rareté ou un prix** — la part du travail dans la valeur, la
durée qui gage une monnaie, la sensibilité d'un cours, le coût d'un change, le
prix d'une créance, le loyer de l'argent. Aucun ne décrète un interdit. C'est le
test du §Principe de réglage, et ils le passent tous les six.

---

## 17. Deux constantes supprimées, et pourquoi

Elles figuraient dans la première version. Elles sont retirées parce qu'elles
échouaient au principe de réglage, et le raisonnement est consigné ici pour
qu'on ne les réintroduise pas par distraction.

**`PLAFOND_DETTE` — le montant au-delà duquel une ville faisait défaut.**
Le besoin était réel : il faut bien que quelque chose dise quand un débiteur est
ruiné. La forme était un décret — « vingt-cinq crédits par habitant » ne décrit
aucune rareté. Remplacé par de l'arithmétique : une ville est insolvable quand
son intérêt dépasse ce qu'elle peut rembourser (§6.4). Le seuil sort désormais du
taux directeur et de l'économie de chaque ville, il diffère pour chacune, et il
bouge avec elles.

**`DUREE_DEFAUT` — le nombre de conseils d'insolvabilité avant la chute.**
Confondait un état et une décision. L'insolvabilité se calcule ; le défaut, lui,
est le choix d'un créancier qui cesse de prêter, et ce choix a déjà toutes ses
raisons (§6.4). Une durée fixe n'y ajoutait qu'un délai arbitraire.

**Et une interdiction supprimée : « on ne peut pas racheter la créance d'une
ville qui n'est pas déjà en difficulté ».** C'était le réflexe paresseux à
l'état pur — une condition de monde inventée pour brider une action. Elle était
en outre redondante depuis que le vendeur décide : une ville en bonne santé a une
valeur nette positive, donc son porteur refuse ou demande le quadruple (§6.3.1).
Le frein existait déjà, vivant ; on allait en poser un mort par-dessus.

Il ne reste, dans tout le chapitre du crédit, aucune constante décrétée.
