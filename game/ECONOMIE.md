# L'économie de Cendres & Protocole — cahier des charges

Ce document définit l'économie complète avant qu'une ligne n'en soit écrite. Il
est fait pour être discuté et amendé, pas pour être admiré. Tout ce qui y figure
est soit mesuré, soit chiffré, soit explicitement marqué comme à calibrer.

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

| | témoin | avec la caisse |
|---|---:|---:|
| factions sous 2 500 cr | 10/36 | **0/36** |
| bourse possible à h=1500 | 24/36 | **36/36** |
| trésor médian | 52 319 | 159 331 |
| villes debout | 394 | 514 |
| population totale | 140 534 | **103 889** |
| factions écrasées (≤ 2 villes) | 10 | **0** |
| tick | 72 µs | **166 µs** |

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

### 4.4 Retrait

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

La faction refuse si :
- son trésor est vide **et** elle ne veut pas émettre ;
- `col.dette > PLAFOND_DETTE × col.pop` (`PLAFOND_DETTE ≈ 25 ac/habitant`, à
  calibrer) ;
- la ville est en révolte (`unrest > 0,7`) — on ne prête pas à qui ne paiera pas.

Un refus est un événement, avec un nom et une ville, pas une règle silencieuse.

### 6.2 L'intérêt et le remboursement

Au conseil : `col.dette × TAUX_INTERET` s'ajoute à la dette
(`TAUX_INTERET ≈ 0,02` par conseil, à calibrer). La remontée du surplus va
**d'abord** au remboursement, et seulement ensuite au trésor.

### 6.3 Le défaut

Une ville dont la dette dépasse le plafond depuis plus de `DUREE_DEFAUT`
conseils fait défaut :
- la dette est annulée, et la faction perd d'autant (la monnaie disparaît :
  `f.masse -= dette`, ce qui **renforce** le cours — un défaut est déflationniste,
  et c'est correct) ;
- `unrest += 0,25`, et la ville devient candidate à la sécession ou à la révolte
  par les mécanismes qui existent déjà ;
- le dirigeant perd du crédit auprès des siens.

### 6.4 La décision du joueur

Au grade requis, vous pouvez **accorder ou refuser un crédit** à une ville de
votre faction, et **émettre** pour le financer. Nourrir une ville en faisant
tomber la monnaie du pays est exactement le genre de décision que ce jeu doit
poser.

---

## 7. Vous

### 7.1 Le portefeuille

`state.player.credits` devient `state.player.bourse`, un objet
`{ hexa: 1200, rouilleurs: 340, ... }`. Toute somme affichée l'est dans la
monnaie concernée, **avec son équivalent en `ac` entre parenthèses**. Le total du
portefeuille est toujours donné en `ac`.

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
| Battre monnaie | Commandeur | rien, et c'est le problème |
| Fixer le taux d'imposition | Commandeur | déjà en place |
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
| `credit.js` **(nouveau)** | emprunt, intérêt, remboursement, défaut |
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
col.change    : boolean  // nouveau — la ville tient un bureau

f.masse       : number   // nouveau
f.gage        : number   // nouveau, cache recalculé au conseil
f.cours       : number   // nouveau, lissé
f.reserve     : { [faction]: number }  // nouveau, monnaies étrangères
f.emissions   : number   // nouveau, compteur pour le journal et l'écran

player.bourse : { [faction]: number }  // remplace player.credits
```

`normaliser` donne une valeur à chacun pour toute partie déjà commencée. Rien ne
doit exiger une nouvelle partie.

---

## 10. Interface

Contrainte : téléphone d'abord, texte, français.

- **Le portefeuille** est une ligne repliable : le total en `ac`, et le détail
  par monnaie quand on l'ouvre.
- **Tout prix** s'écrit `128 ⌂ (96 ac)`. Le symbole de chaque monnaie est propre
  à la faction.
- **L'écran d'une ville** gagne une ligne : `Change — 1 ⌂ = 0,74 ac · écart 8 %`,
  cliquable si un bureau existe.
- **L'écran d'une faction** gagne le cours, sa tendance sur les dix derniers
  conseils, la masse et le nombre d'émissions.
- **Un bandeau** quand une monnaie que vous détenez perd plus de 10 % : on ne
  doit jamais découvrir une dévaluation en relisant ses comptes.

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

## 13. Comment on saura que c'est réussi

Six graines, six mille heures, comparé au témoin `82636d8`.

| mesure | témoin | cible |
|---|---:|---|
| population totale | 140 534 | ≥ 130 000 |
| villes debout | 394 | 380 à 450 |
| factions écrasées (≤ 2 villes) | 10 | 6 à 12 — le drame revient |
| factions sous le prix d'une bourse | 10/36 | ≤ 3/36 |
| trésor médian | 52 319 | 30 000 à 120 000 ac |
| écart entre la monnaie la plus forte et la plus faible | — | ≥ ×2 en fin de partie |
| monnaies effondrées (cours < 0,4) sur 6 parties | — | ≥ 1 |
| villes en défaut sur 6 parties | — | 5 à 25 |
| accords commerciaux signés | 0,88/partie | ≥ 2/partie |
| tick | 72 µs | < 110 µs |
| tests | 1006/1006 | 1006 + les nouveaux, tous verts |
| invariant comptable | — | exact, sur 6 000 heures |

Une cible manquée n'est pas un échec : c'est une mesure à expliquer avant de
continuer.

---

## 14. Ordre de réalisation

Chaque lot se mesure et se valide avant le suivant. Aucun ne se commence sans
que le précédent tienne ses chiffres.

**Lot A — fermer le circuit.** Ménages, salaires, consommation solvable, puits du
trésor (garnison et solde des colonnes). Pas encore de monnaie, pas encore de
crédit. *Attendu : le trésor médian redescend, les factions redeviennent
abattables. La population ne remonte pas encore.*

**Lot B — le crédit.** Dette, intérêt, remboursement, refus, défaut. *Attendu :
la population remonte au-dessus de 130 000 et les villes affamées reviennent
sous 25 %.*

**Lot C — la monnaie.** Masse, gage, cours, émission, retrait, invariant
comptable. Prix locaux. *Attendu : les cours divergent d'un facteur deux au
moins, au moins une monnaie s'effondre par lot de six parties.*

**Lot D — le change.** Bureaux, écart, effet des accords, conversion des
caravanes. *Attendu : les accords commerciaux deviennent rentables et se
multiplient.*

**Lot E — vous.** Portefeuille multi-monnaies, prix affichés, écran du change,
prérogatives monétaires, bandeau de dévaluation. *Attendu : le banc joue une
partie complète sans se ruiner par accident.*

**Lot F — la perte de vitesse.** Remise du tick sous 110 µs, tests de navigateur,
README, artefact republié.

---

## 15. Ce qu'on ne fait pas

À dire maintenant pour ne pas y revenir :

- pas de marché obligataire, pas de dette entre factions ;
- pas de taux directeur ni de politique monétaire fine — l'émission est un
  bouton, pas une courbe ;
- pas de spéculation des PNJ sur les monnaies ;
- pas de salaires indexés ni de spirale prix-salaires ;
- pas de banques privées ; le prêteur est la faction, et c'est tout ;
- une seule marchandise déclenche le crédit au premier jet : les rations.

---

## 16. Ce qui reste à arbitrer

Quatre questions dont la réponse change le travail.

1. **L'ancien crédit comme unité de compte affichée partout, ou rien du tout ?**
   Avec, on lit toujours ce qu'une somme vaut vraiment, au prix d'un chiffre de
   plus à l'écran. Sans, chaque monnaie est un monde et il faut faire le calcul
   de tête.

2. **Le portefeuille multi-monnaies, ou une conversion automatique à l'entrée
   d'une ville ?** Multi-monnaies, c'est la version riche : on garde de la
   monnaie forte, on se débarrasse de la faible avant qu'elle tombe. Automatique,
   c'est indolore mais on ne joue plus au change, on le subit.

3. **Battre monnaie : réservé aux PNJ, ou prérogative du joueur ?** Prérogative,
   c'est la décision la plus lourde du jeu et elle est irréversible. Réservé aux
   PNJ, c'est un événement qu'on subit et qu'on peut anticiper.

4. **Le défaut d'une ville : révolte, sécession, ou passage sous la coupe du
   créancier ?** La troisième option ouvrirait la conquête par la dette, ce qui
   est une autre façon de prendre une ville que par les armes — et le Consortium
   Hexa n'attend que ça.
