# Le convoi à gages — cahier des charges

Ouvert par le propriétaire (septembre 2026) : *« le convoi à gages pourrait
reprendre le système de convoi du comptoir »*. C'est le n° 1 du top 5 de
`REVUE.md`, le seul jamais livré, et la direction technique est la sienne.
Format METHODE §9.

## 1. Le constat, chiffré

**Le milieu de partie est une navette.** Deux instruments indépendants le
disent, et ils ne se parlaient pas :

- la revue de game master : 59 % du temps sur les pistes, 70 % des départs en
  logistique — « le carnet a créé le désir, pas le verbe » ;
- le banc, en cherchant tout autre chose (MEMOIRE.md, instruction 2) : le bot
  **le plus dévoué à sa carrière** consacre 42 % de ses départs à chercher à
  manger, 35 % au marché, et **4 % à honorer un contrat**.

Le carnet du joueur montre depuis longtemps les écarts de prix d'une ville à
l'autre. Il n'a pas de bras : le seul moyen d'en profiter est d'y aller
soi-même, à pied, avec ce qu'on peut porter.

## 2. Ce qui existe déjà, et qu'on ne réécrit pas

C'est le cœur de la direction donnée : **rien de neuf côté transport.**

- `passerOrdre` (caravanes.js) : le geste du comptoir. Il chiffre, débite,
  choisit l'escorte, calcule la route, pousse un convoi `pour: 'joueur'` dans
  `world.caravanes`, et le convoi traverse le monde comme les autres — il peut
  être pillé, on peut l'escorter.
- `arriver` sait **déjà** livrer un convoi du joueur à une ville et l'en faire
  payer (`gagner` + `debourser`) : c'est le cas « vente » d'aujourd'hui.
- `tenterDepart` est le patron ville→ville : c'est ainsi que le monde commerce.
- `prixJoueur` donne l'achat et la vente d'une ville avec la marge du
  marchand ; `chemin`, `ESCORTES`, `plafondCaravanes` existent.

Il ne manque donc qu'**un départ depuis une ville plutôt que depuis le camp**.

## 3. Le geste

Depuis le comptoir de votre camp — la même porte que les autres ordres :
`peutTraiter` (camp fondé, bâtiment comptoir, un réseau qui traite avec vous)
— vous payez des gens pour aller acheter dans la ville A et revendre dans la
ville B. Vous ne touchez pas la marchandise ; vous ne marchez pas.

À la commande, vous réglez : la marchandise au **prix d'achat de A**, les
**gages** du convoyeur, et l'escorte s'il en faut une. À l'arrivée, B vous
paie au **prix de vente de B** convenu au départ.

Votre gain est l'écart entre les deux villes, moins les gages, moins
l'escorte — et moins ce que vous perdez quand le convoi n'arrive pas.

## 4. Ce qui est décidé, et pourquoi

- **La double marge du marchand suffit à borner l'arbitrage.** `prixJoueur`
  applique déjà ~18 % à l'achat et autant à la vente : un écart doit dépasser
  un tiers de la valeur pour rapporter un sou. On n'ajoute donc **aucune**
  règle anti-abus — le monde se défend avec ce qu'il a.
- **Les gages se paient à la course, pas à la valeur** (`GAGES.socle` +
  `GAGES.parRegion` × distance). Un pourcentage de la cargaison rendrait les
  gros lots lointains gratuits ; des gens qui marchent se paient au trajet.
  C'est aussi ce qui garde la marche du joueur dominante sur les gros lots,
  la condition posée par REVUE.md.
- **Une charrette, pas un train** : `GAGES.charge` borne la quantité par
  convoi. Calibrable, balayée au banc.
- **Le risque est celui de tout le monde** : le convoi traverse, il peut être
  pillé, on peut l'escorter — le code existant s'en charge, sans exception
  pour le joueur.

## 5. Les cibles mesurables

Au banc d'équilibrage, profil `MARCHAND=1` (qui vit du négoce) et bot ordinaire,
4 000 h **et 16 000 h** (PARTIE-LONGUE.md : une progression ne se mesure pas
sur le premier cinquième d'une partie) :

- la part des départs en logistique **baisse** chez qui s'en sert ;
- la marche reste dominante sur les gros lots : le patrimoine du bot marchand
  ne doit pas exploser (garde : pas plus du double du témoin) ;
- l'invariant comptable reste exact, joueur compris ;
- les gardes de `CIBLES.json` tiennent — `convois` en tête, puisqu'on ajoute
  des convois au monde.

## Blocages

**La cible « le patrimoine ne double pas » ne tranche pas, telle qu'elle est
écrite.** Sur la moyenne elle est violée (×10) ; sur la médiane elle est tenue
(×0,8). Les deux portent le même nom et disent le contraire.

Je ne la corrige pas moi-même : préciser un critère **après** avoir vu la
mesure est exactement le glissement que `CLAUDE.md` interdit, même quand
l'argument est bon — et il l'est ici, METHODE §12 disant depuis longtemps
qu'une moyenne sur une distribution à queue lourde n'est pas une mesure. Ce
qu'il faut trancher est donc au propriétaire :

1. **Juger à la médiane** (et le dire dans le cahier) : le geste est alors
   conforme, et ce qu'il amplifie est une queue qui existait déjà — une partie
   sur vingt finissait à 123 millions **avant** ce chantier (PARTIE-LONGUE.md).
2. **Juger à la moyenne** : le geste est refusé en l'état, et il faut le brider
   — moins de convois simultanés, gages plus chers, ou charrette plus petite.
   Tous sont balayables (`REGLE=`), aucun n'a été touché.

**Et une seconde chose, sans rapport avec ce chantier, à instruire** : à
16 000 h le **témoin** rend un écart comptable de 586,15 (le run avec gages :
0,58). Le monde seul est exact à cet horizon et l'invariant joueur l'était
aussi dans PARTIE-LONGUE.md ; quelque chose fuit sur une trajectoire longue et
ce n'est pas le convoi à gages. À reprendre à part.

## 6. Ce qu'on ne fait pas

Pas de flotte à gérer, pas de contrat de transport pour autrui, pas de
tarif négocié avec un convoyeur nommé. Un ordre, un convoi, une course payée.

## 7. Entre vos camps — et un défaut né avec eux

**Question du propriétaire, en jouant** : « mais si je transporte des matériaux
entre mes bases, comment ça se passe ? » — il ne se passait rien. On peut
planter autant de camps qu'on veut (M4) et chacun vit sur son propre entrepôt ;
le seul transport était le sac de l'escouade.

Et la question a rendu un défaut que M4 avait laissé derrière lui. `arriver`
rangeait la cargaison d'un convoi dans `state.base` — c'est-à-dire **le camp
qu'on habite à l'instant de la livraison**, puisque `state.base` est une
référence mouvante depuis les camps multiples. On commandait chez soi, on
allait voir ailleurs, et le convoi suivait le regard : mesuré au test, cent
rations commandées depuis un camp atterrissaient dans l'autre. Avant M4
c'était juste ; depuis, un convoi n'avait plus d'adresse.

Une case ne bouge pas : c'est elle, l'adresse d'un camp (`car.versRegion`). Les
convois d'avant n'en ont pas et retombent sur le camp habité, ce qu'ils ont
toujours fait.

Le geste lui-même n'ajoute **aucune règle** : mêmes gages à la course, même
charrette, même escorte, même route, même risque. Il n'y a simplement rien à
acheter ni à vendre — la marchandise est déjà à vous —, donc on ne paie que les
bras. À l'écran, le bloc ne paraît qu'à partir du second camp.

## L'avancement

- [x] Le geste moteur (`passerOrdreGages`), sept tests rouges d'abord —
      et **un défaut plus ancien trouvé au passage** : `arriver` faisait
      `gagner` + `debourser` sans jamais `sortirDehors`, si bien qu'une ville
      qui payait un convoi du joueur laissait son pays déclarer émis un argent
      parti dans une poche que le registre ne connaît pas. 179 crédits d'écart
      pour une seule vente de cent ferrailles, sur le chemin du **comptoir** —
      donc présent bien avant ce chantier. La règle des deux est écrite dans
      `monnaie.js` et appliquée par la vente en ville ; le convoi ne
      l'appliquait pas. Corrigé, et le joueur n'encaisse plus que ce que la
      ville a réellement en caisse (l'ancien « elle vous paie en entier »
      fabriquait la différence).
- [x] L'écran : le geste au comptoir. **Le carnet propose la course** plutôt
      que de demander de choisir deux villes dans une liste — au pouce, sur un
      téléphone, ce serait injouable. `carnetPrix` donnait déjà, par matière, la
      place la moins chère et la plus chère qu'on ait **relevées** ; le bloc
      affiche la course, l'âge du relevé (un écart de trois semaines n'est pas
      un écart, c'est un souvenir), ce qu'on avance et ce qu'on touche. Six
      sondes navigateur.
- [x] Entre vos camps (§7), et le défaut d'adresse qu'il a rendu
- [x] La mesure au banc, aux deux horizons — **et elle ne conclut pas
      proprement : voir Blocages.**

      Il a d'abord fallu que le banc puisse mesurer quoi que ce soit : **le bot
      n'a jamais monté un comptoir de sa vie**, si bien que tout ce pan du jeu
      — les convois du joueur, livrés depuis longtemps — n'avait jamais été
      mesuré par personne. D'où `COMPTOIR=1`, qui donne le comptoir comme
      `CAMP=1` donne le camp, et pour la raison déjà écrite dans le fichier :
      on ne mesure pas ici la difficulté de s'en offrir un, mais ce qu'il vaut
      une fois qu'on l'a. Le bot regarde son carnet une fois par jour et envoie
      si la course paie — le geste qu'un joueur ferait en lisant l'écran, pas
      un arbitragiste.

      Témoin `SANS=gages`, mêmes graines.

      **À 4 000 h, rien à signaler** : crédits moyens 1 407 → 1 092 (le geste
      coûte plutôt qu'il ne rapporte), survie 29/30 → 30/30, invariant exact,
      motifs de départ inchangés. 8,9 convois par partie.

      **À 16 000 h, la mesure se dédouble** — et c'est tout l'intérêt de
      l'avoir faite aux deux horizons :

      | | témoin | avec le geste |
      |---|---|---|
      | patrimoine médian | 11 869 | 9 357 |
      | patrimoine moyen | 202 674 | 2 037 443 |
      | la partie la plus riche | 3,3 M | 31,5 M |

      Le joueur **médian** ne s'enrichit pas, il s'appauvrit légèrement. La
      moyenne, elle, est multipliée par dix — parce que la distribution a une
      queue lourde et que le geste **amplifie les parties déjà
      exceptionnelles** : quatre parties au-dessus de 500 000 contre deux.
