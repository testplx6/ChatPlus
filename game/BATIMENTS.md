# Bâtiments — cinq nouveaux, le cahier des charges

Chantier 3 du plan solo (« go » du propriétaire, août 2026). Format
METHODE §9. **Rien ne se code avant que le propriétaire ait validé la
liste ci-dessous** — un bâtiment est une règle de jeu. Les verrous se
posent avec le champ `exige` existant ; l'arbre reporté
(TECHNOLOGIE.md) les reprendra tels quels.

**Amendé après consultation d'un game master** (août 2026) : la
première version proposait une deuxième charrette qui ignorait
`betes.js`, rabotait le beau temps sous serre et dévaluait le mentorat
— les trois sont corrigés ci-dessous, et son avis a ajouté trois
gardes anti-exploit aux cibles et la table de raccord à l'arbre.

## 1. Le constat, chiffré

- **La route a ses bêtes, pas son toit.** `betes.js` vit depuis
  juillet : brahmine, mulet et charrette à bras, achetables en ville,
  comptés par `capacitePortage`, qui s'usent sur la piste
  (0,015 santé/h pour la charrette) et se perdent en déroute. Mais
  **rien ne se fabrique ni ne se répare au camp** : la charrette
  cassée se remplace à 340 crédits chez un marchand, point.
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

**Refondé sur `betes.js` — il n'y a qu'une charrette au monde.** Le
bâtiment répond à « où je me la procure, et qui me la répare » :
niveau 1, **fabriquer** la charrette existante (alliage + composants +
heures, coût matière visé ≈ 200 crédits contre 340 à l'étal) ;
niveau 2, **la réparer** au camp (sa santé remonte — aujourd'hui elle
ne fait que descendre, personne ne sait la soigner). Pas de deuxième
objet, pas de plafond en dur, pas de nouveau malus : la charrette
garde ses règles (−14 %, s'use, se vole en déroute) — le triangle de
compromis de `betes.js` reste entier. Le nœud *caravanerie* de
l'arbre se branchera dessus sans rien réécrire.

### La forge *(famille : Produire)*

Fabrique armes et armures depuis l'alliage et les composants, dans une
file comme celle des constructions. **Niveau 1 : palier 0–1** (barre,
machette, clous, cuir, plaques). **Niveau 2 : palier 2** (katana,
verrou, smg, kevlar). Le palier 3 (rail, exo, masse) reste introuvable
hors des meilleurs étals — il attend le nœud *usinage* de l'arbre.
Coût matière ≈ moitié du prix d'étal, plus les heures : forger paie
quand la route est chère, pas toujours.

### Les serres *(famille : Tenir sur place)*

Amortissent le **mauvais** ciel pour les chaînes de plein air du camp
(bassins) : quand le facteur météo est sous ×1, l'écart fond de 30 %
par niveau (2 max) — un orage sec à ×0,6 devient ×0,72 puis ×0,84.
**Le beau temps passe entier** : une canicule à ×1,35 reste ×1,35 —
on s'abrite du mauvais ciel, on ouvre les serres au beau, sinon le
joueur des biomes ensoleillés serait puni de construire. Et la serre
touche le facteur **ciel** seulement, jamais le facteur terrain de
`rendementLibre` (les deux se multiplient au même endroit — la
confusion est à une ligne de code, le test la garde). On lit l'effet
sur l'écran BASE, à côté du rendement.

### La distillerie *(famille : Produire)*

Biomasse → carburant, chaîne continue comme la raffinerie, rendement
médiocre par conception (la pyrolyse et le polymère restent les bonnes
voies) — mais la terre paie enfin la route, et un camp agricole peut
faire rouler ses convois.

### La salle d'exercice *(famille : Se défendre et soigner)*

Trois effets, mêmes règles qu'aujourd'hui. **Un** : la tâche
d'entraînement au camp compte un **maître de maison** — plancher de
niveau du meneur, 40 puis 55 (**2 niveaux, pas 3** : un plancher à 70
dévaluerait le mentorat vivant — recruter un vétéran, payer une
formation en ville — et deviendrait le raccourci qu'on ne refuse
jamais ; le 70 part à l'arbre, nœud *instruction*, voir raccord).
**Deux** : les miliciens du raid (SIEGE.md, S1) se lèvent mieux
entraînés — niveau 2 avec une salle au niveau 2. **Trois** : les
miliciens deviennent des **figures stables** — dérivés de
`grainDe(graine, 'milicien', index d'habitant)` au lieu de l'heure du
raid : le même habitant revient d'un raid à l'autre, peut gagner un
nom, et tomber pour de bon. Zéro système nouveau, un changement de
graine — et le camp gagne sa mémoire (HISTOIRE.md).

## 4. Le raccord à l'arbre (TECHNOLOGIE.md, reporté)

Dit maintenant, comme TECHNOLOGIE.md l'exige — quatre lignes, et
l'arbre s'amende en miroir :

| nœud de l'arbre | ce qu'il coiffera |
|---|---|
| *armurerie* | la forge fabrique les **armes** du palier 3 (rail) |
| *usinage* | la forge fabrique les **armures et outillages** du palier 3 (exo, masse) |
| *serres* | double l'amorti du bâtiment serres |
| *distillerie* | déverrouille le bâtiment distillerie |
| *(N) instruction* | le maître de maison de la salle vaut 70 — nœud **à ajouter** à la branche III (elle n'avait rien pour la formation) |

## 5. Ce que ça casse, dit d'avance

- **L'équilibre de la route** : fabriquer et réparer la charrette
  change l'arbitrage (le carnet U7 la rentabilise aussitôt). C'est
  voulu ; le coût matière se balaye.
- **L'équilibre des étals** : forger à moitié prix concurrence les
  marchands d'armes — et l'optimisateur jouera **forge + carnet** :
  acheter l'alliage là où il est bradé, forger, équiper là où la
  guerre fait flamber les étals. Ce n'est pas un exploit à fermer,
  c'est le jeu qu'on veut — à condition de mesurer le **triangle**
  matière-forge-étal au banc, pas chaque côté séparément.
- **Le monde ne bouge pas d'un dé** : tout est côté base/joueur,
  gardes du banc identiques.
- **Vieilles sauvegardes** : cinq clés de bâtiments nouvelles, rien à
  migrer (`batiments` est un dictionnaire, l'absence vaut zéro).

## 6. Les cibles mesurables

1. Chaque bâtiment a un **test né rouge** qui mesure son effet
   (l'attelage fabrique la charrette de `betes.js` au coût dit et la
   répare ; la forge sort une machette et refuse le palier 3 ; le
   mauvais ciel remonte sous serre ET la canicule passe entière ; la
   distillerie transforme ; le maître de maison plancher
   l'entraînement, les miliciens montent et **reviennent** d'un raid
   à l'autre).
2. **Trois gardes anti-exploit**, vérifiées au banc : le coût matière
   de la forge reste **au-dessus de la décote de revente** (0,42 ×
   prix — sinon planche à billets) ; le rendement de la distillerie
   reste **sous 0,25 carburant par biomasse** (au-delà de 0,33,
   acheter-distiller-revendre est une pompe à crédits) ; sur une
   partie témoin, **forger + revendre ne dégage pas de profit net**
   une fois les heures comptées au salaire du machiniste.
3. Les cinq apparaissent dans leur famille à l'écran BASE, avec une
   fiche qui dit l'effet (test navigateur), et **chacun laisse sa
   ligne de chronique** (la première lame sortie de la forge, la
   charrette réparée…).
4. Gardes du monde inchangées, vitesse dans la fourchette. Coûts
   balayés au banc avant d'être posés.

## 7. Ce qu'on ne fait pas

Pas de palier 3 à la forge (réservé à l'arbre). Pas de deuxième
charrette ni de montures nouvelles — `betes.js` est le système, on le
nourrit. Pas de geôle au camp (les prisonniers ont leur chantier, voir
décisions). Pas de bâtiment « qui donne +X % de tout ».

## Les décisions du propriétaire

1. **Valider ou amender la liste amendée** (cinq bâtiments, effets,
   familles — dont les trois réécritures issues de l'avis du game
   master : attelage refondé sur `betes.js`, serres asymétriques,
   salle à 2 niveaux).
2. ~~La charrette : malus ou pas ?~~ **Dissoute par l'amendement** :
   il n'y a plus qu'une charrette au monde, celle de `betes.js`, qui
   a déjà son malus (−14 %) et ses règles d'usure. Le game master :
   « un objet sans coût d'opportunité n'est pas une décision, c'est
   une étape de tutoriel ».
3. **La geôle du camp** : chantier à part plus tard (recommandé — une
   geôle sans verbes est un mur sans porte ; le chantier « rançons »
   se branchera sur la rancune et les payeurs marqués de S3), ou
   sixième bâtiment ici.

## L'avancement

- [ ] B1 — l'attelage et la charrette
- [ ] B2 — la forge
- [ ] B3 — les serres
- [ ] B4 — la distillerie
- [ ] B5 — la salle d'exercice

## Blocages

Rien pour l'instant.
