# Bâtiments — cinq nouveaux, le cahier des charges

Chantier 3 du plan solo (« go » du propriétaire, août 2026). Format
METHODE §9. **Rien ne se code avant que le propriétaire ait validé la
liste ci-dessous** — un bâtiment est une règle de jeu. Les verrous se
posent avec le champ `exige` existant ; l'arbre reporté
(TECHNOLOGIE.md) les reprendra tels quels.

## 1. Le constat, chiffré

- **19 bâtiments, et aucun ne touche à la route.** La charge d'un
  groupe, c'est la somme de ses dos (`capacitePortage`) plus la
  recherche logistique. Rien à construire pour porter plus.
- **Rien ne se forge.** L'atelier fait des composants ; les 22 objets
  (armes, armures) s'achètent aux étals ou se ramassent sur les morts.
  Un camp de quarante âmes avec fonderie et atelier ne sait pas faire
  une machette.
- **Le ciel commande les bassins sans recours** : `rendementLibre`
  applique la météo aux chaînes de plein air, et aucun bâtiment ne
  l'amortit. L'hiver, on regarde.
- **La raffinerie ne connaît que le polymère** (et les déchets, avec
  la pyrolyse). La biomasse ne devient jamais du carburant : la terre
  ne paie pas la route.
- **L'entraînement existe mais n'a pas de toit** : la tâche coûte des
  rations et progresse au niveau du meilleur présent (`maitre`). Aucun
  bâtiment ne l'améliore ; un camp ne forme pas mieux qu'un feu de
  camp. Et les miliciens du raid (SIEGE.md, S1) se lèvent niveau 1
  pour toujours.

## 2. La cause

Les bâtiments sont nés du chantier économie : produire, stocker,
défendre. Le reste du jeu — la route, le combat, la formation — s'est
construit après, sans jamais recevoir ses murs.

## 3. Ce qu'on propose — cinq bâtiments

Chaque effet se branche sur un mécanisme existant, nommé. Coûts et
constantes en objets calibrables, balayés au banc ; familles de
l'écran BASE complétées (piège n°4).

### L'attelage *(famille : Savoir et commercer)*

Construit des **charrettes** : un objet de groupe (`g.objets`), +40 de
charge comptée par `capacitePortage`, **une seule par groupe**, et la
marche ralentit de 10 % — une charrette n'est pas un cheval, c'est un
choix. Niveau du bâtiment = nombre de charrettes qu'on peut avoir en
circulation. Fabrication : alliage + composants + heures.

### La forge *(famille : Produire)*

Fabrique armes et armures depuis l'alliage et les composants, dans une
file comme celle des constructions. **Niveau 1 : palier 0–1** (barre,
machette, clous, cuir, plaques). **Niveau 2 : palier 2** (katana,
verrou, smg, kevlar). Le palier 3 (rail, exo, masse) reste introuvable
hors des meilleurs étals — il attend le nœud *usinage* de l'arbre.
Coût matière ≈ moitié du prix d'étal, plus les heures : forger paie
quand la route est chère, pas toujours.

### Les serres *(famille : Tenir sur place)*

Amortissent le ciel pour les chaînes de plein air du camp (bassins) :
l'écart entre ×1 et le facteur météo fond de 30 % par niveau (2 max).
Un orage sec à ×0,6 devient ×0,72 puis ×0,84. On lit l'effet sur
l'écran BASE, à côté du rendement.

### La distillerie *(famille : Produire)*

Biomasse → carburant, chaîne continue comme la raffinerie, rendement
médiocre par conception (la pyrolyse et le polymère restent les bonnes
voies) — mais la terre paie enfin la route, et un camp agricole peut
faire rouler ses convois.

### La salle d'exercice *(famille : Se défendre et soigner)*

Deux effets, mêmes règles qu'aujourd'hui : la tâche d'entraînement au
camp compte un **maître de maison** (plancher de niveau du meneur :
40/55/70 selon le niveau du bâtiment) — on progresse même quand le
meilleur du groupe est médiocre ; et les **miliciens du raid** se
lèvent mieux entraînés (niveau 1 + 1 par tranche de 2 niveaux de
salle). Le camp qui paie des murs peut payer des bras qui savent s'en
servir.

## 4. Ce que ça casse, dit d'avance

- **L'équilibre de la route** : la charrette change l'arbitrage
  (charge contre vitesse) — le carnet du négociant (U7) la rentabilise
  aussitôt. C'est voulu ; la constante se balaye.
- **L'équilibre des étals** : forger à moitié prix concurrence les
  marchands d'armes. Plafonné au palier 2, coût en heures réel — et
  mesuré en partie jouée avant de toucher au moindre prix.
- **Le monde ne bouge pas d'un dé** : tout est côté base/joueur,
  gardes du banc identiques.
- **Vieilles sauvegardes** : cinq clés de bâtiments nouvelles, rien à
  migrer (`batiments` est un dictionnaire, l'absence vaut zéro).

## 5. Les cibles mesurables

1. Chaque bâtiment a un **test né rouge** qui mesure son effet (la
   charge monte avec la charrette et la marche ralentit ; la forge
   sort une machette au coût dit et refuse le palier 3 ; le facteur
   ciel remonte avec les serres ; la distillerie transforme ; le
   maître de maison plancher l'entraînement et les miliciens montent).
2. Les cinq apparaissent dans leur famille à l'écran BASE, avec une
   fiche qui dit l'effet (test navigateur).
3. Gardes du monde inchangées, vitesse dans la fourchette.
4. Coûts balayés au banc avant d'être posés.

## 6. Ce qu'on ne fait pas

Pas de palier 3 à la forge (réservé à l'arbre). Pas de montures ni de
véhicules — la charrette est un objet, pas un système. Pas de geôle au
camp (les prisonniers ont leur chantier, voir décisions). Pas de
bâtiment « qui donne +X % de tout ».

## Les décisions du propriétaire

1. **Valider ou amender la liste** (cinq bâtiments, effets, familles).
2. **La charrette** : le ralentissement de 10 % te va, ou tu la veux
   sans malus (elle devient alors un achat automatique — moins un
   choix) ?
3. **La geôle du camp** (garder ses prisonniers chez soi au lieu de
   les vendre en ville) : chantier à part plus tard, ou l'ajouter ici
   en sixième ?

## L'avancement

- [ ] B1 — l'attelage et la charrette
- [ ] B2 — la forge
- [ ] B3 — les serres
- [ ] B4 — la distillerie
- [ ] B5 — la salle d'exercice

## Blocages

Rien pour l'instant.
