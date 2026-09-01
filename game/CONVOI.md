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

## 6. Ce qu'on ne fait pas

Pas de flotte à gérer, pas de contrat de transport pour autrui, pas de
tarif négocié avec un convoyeur nommé. Un ordre, un convoi, une course payée.

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
- [ ] L'écran : le geste au comptoir
- [ ] La mesure au banc, aux deux horizons
