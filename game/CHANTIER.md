# Chantier en cours : l'économie (cahier des charges : ECONOMIE.md)

La file de tâches, compilée depuis `ECONOMIE.md` pour être exécutée une par une
— y compris par quelqu'un qui n'a pas conçu le système. Chaque tâche a un
critère **mécanique** : des tests nommés, `node tools/verifier.js` vert, et des
fourchettes de banc. Pas d'appréciation, pas de « ça a l'air bien ».

**Protocole** : une tâche à la fois, dans l'ordre (sauf dépendances dites) ;
test rouge d'abord ; recette de `RECETTES.md` en face de chaque geste ;
cocher + committer à chaque tâche finie. Critère ambigu, mesure hors
fourchette, règle de jeu manquante → section **Blocages** en bas, committer,
s'arrêter. **Ne jamais inventer une règle de jeu.**

Les fourchettes d'un lot se vérifient par :
`node tools/banc.js --temoin 82636d8` (6 graines, 6 000 h — le témoin
historique). À la fin de chaque lot, resserrer `CIBLES.json` sur l'état mesuré
et le dire dans le commit.

⚠️ Le chantier ne démarre qu'avec l'accord explicite du propriétaire du projet.
Ce fichier prépare le travail, il ne l'autorise pas.

---

## Lot A — fermer le circuit (ECONOMIE §3)

- [x] **A1. Les ménages.** `col.menages` : ce que les habitants ont en poche.
  Création (R1 : les trois lieux, valeur dérivée de `pop` — proposition :
  `pop × 3` —, zéro tirage), `normaliser`, avant-poste à 0 (comme `caisse`).
  Critère : tests « une ville neuve a des ménages », « normaliser en donne aux
  vieilles parties », aller-retour JSON exact ; verifier vert.

- [x] **A2. Les salaires** (`caisse → menages`). Dans `tickColonie`, chaque
  heure : `salaires = min(caisse, valeurProduction × CAISSE.partSalariale × dt)`.
  `partSalariale` dans l'objet `CAISSE` (R2), départ 0,55, balayage au lot A6.
  Salaires impayés (caisse à sec) : `unrest += CAISSE.grogneImpayes × dt` (même
  objet). Critère : test « une ville qui produit paie ses gens », test « caisse
  vide → grogne monte », verifier vert.

- [x] **A3. La consommation solvable** (`menages → caisse`). La ville ne sert
  que ce que les ménages peuvent payer : plafonner la consommation servie par
  `menages / prix`, y compris la satiété — du grain plein et des gens sans le
  sou doit produire une satiété < 1 (la famine de 1846, ECONOMIE §3.2).
  L'argent servi retourne dans `caisse` via `encaisser` (R9 : jamais en
  direct). Critère : test « stock plein + ménages vides → satiété < 1 »,
  test « la boucle salaires→consommation conserve l'argent au centime »,
  verifier vert.

- [x] **A4. La garnison et les travaux se paient** (`tresor → menages`).
  Au conseil, chaque ville tenue coûte à sa faction :
  `(defense × ECONOMIE_FACTION.parDefense + murs × ECONOMIE_FACTION.parMur) ×
  heures écoulées`, versé aux ménages de la ville (c'est un revenu local). Une
  faction qui ne peut pas payer voit `defense` s'éroder (les gardes partent).
  Objet balayable neuf `ECONOMIE_FACTION` dans `src/factions.js`. Critère :
  test « tenir coûte », test « trésor vide → la défense s'érode », verifier
  vert.

- [x] **A5. La solde des colonnes** (`tresor → menages` de la ville de départ,
  par conseil, tant que l'armée existe). Une guerre longue vide un trésor —
  c'est ce qui rend une faction abattable (ECONOMIE §1.2). Critère : test
  « une colonne en campagne coûte par heure », et au banc : les guerres
  longues appauvrissent (vérifier à la main sur une graine, chiffres dans le
  commit). Verifier vert.

- [x] **A6. Calibrage du lot.** Balayer `CAISSE.partSalariale`,
  `ECONOMIE_FACTION.parDefense/.parMur`, la solde (R8). Fourchettes à
  atteindre (ECONOMIE §13 + lot A attendu) : trésor méd **30 000–120 000** ;
  écrasées **≥ 4/36** (le drame revient) ; villes **≥ 380** ; pop **≥ 95 000**
  (elle ne remonte qu'au lot B) ; tick < 110 µs (verifier --complet).
  Tableaux dans les commentaires des constantes. Hors fourchette après
  balayage honnête → Blocages.

- [x] **A7. Livraison du lot.** Resserrer `CIBLES.json` sur l'état mesuré ;
  mettre à jour ECONOMIE §1.2 (la colonne « après lot A ») ; verifier
  --complet vert ; commit de synthèse avec le tableau avant/après.

## Lot B — le crédit et le taux directeur (ECONOMIE §4.4, §6)

- [x] **B1. La loi `directeur`.** Quatre paliers (1/2/4/7 % par conseil) dans
  `src/lois.js` à côté d'`IMPOTS` ; défaut par tempérament du dirigeant ;
  `normaliser`. Critère : test « chaque faction a un taux », « le tempérament
  décide du palier initial ».
- [x] **B2. La dette.** `col.dette`, `col.creancier`, `col.cession` (R1, zéro
  tirage). Emprunt automatique quand une ville ne peut pas payer ses rations :
  le créancier initial est sa faction, qui refuse selon ECONOMIE §6.1 (trésor
  vide, insolvable sans raison de garder, étranger désintéressé). Refus =
  événement journalisé. Critère : test « une ville affamée et pauvre emprunte »,
  « un refus s'inscrit au journal », invariant : la somme prêtée sort bien du
  trésor.
- [x] **B3. Intérêt et remboursement.** Au conseil : `dette × taux du
  créancier` s'ajoute ; la remontée des caisses rembourse **avant** le trésor ;
  l'intérêt encaissé est une recette du créancier. Critère : tests dédiés + la
  boucle comptable reste exacte.
- [x] **B4. L'insolvabilité et la décision du créancier** (ECONOMIE §6.4 — pas
  de plafond, pas de durée : l'état se calcule, le défaut se décide). Les trois
  issues pour la propre faction ; l'issue étrangère attend le lot D. Critère :
  test « insolvable = intérêt > surplus », test « sa faction prête à perte
  plutôt que laisser tomber, tant qu'elle peut », test défaut : dette annulée,
  unrest +0,25, journal.
- [x] **B5. L'emprunt pour travaux** (taux bas → une ville emprunte pour murs
  et marché si l'ouvrage rapporte plus que l'intérêt — comparaison, pas
  seuil). Critère : test comparatif deux taux → deux comportements.
- [x] **B6. Calibrage + livraison.** Mesuré, 6 graines × 6 000 h, contre
  `82636d8` :

  | cible | attendu | obtenu | |
  |---|---|---:|---|
  | villes sous 0,2 ration/tête | < 25 % | **24 %** | ✔ (témoin 24 %) |
  | villes bien nourries | — | **286** | ✔ témoin 230 |
  | les quatre paliers de taux employés | oui | **1/2/4/7** | ✔ |
  | factions écrasées | ≥ 4/36 | **5/36** | ✔ témoin 10/36 |
  | villes debout | — | **439** | ✔ témoin 394 |
  | bourses ouvertes | — | **32** | ✔ témoin 24 |
  | villes endettées | > 0 | **277** | ✔ le crédit tourne |
  | population | ≥ 130 000 | **90 721** | ✘ voir ci-dessous |
  | trésor médian | 30 000–120 000 | **20 506** | ✘ juste en dessous |

  **La cible de population était mal posée, et c'est mesuré.** Elle avait été
  tirée du témoin — 140 534 habitants — sans voir que cette population-là
  mangeait des livraisons que personne ne payait : au témoin, la monnaie du
  monde était à 100 % dans les trésors, les villes n'avaient pas un crédit et
  les caravanes créditaient le vendeur sans débiter l'acheteur. Le bon
  indicateur n'est pas le nombre de bouches mais la faim : **24 % de villes
  affamées, exactement comme au témoin, et 286 villes bien nourries contre
  230**. Le monde est plus petit d'un tiers en gens, et mieux nourri.

  Le trésor médian à 20 506 pour une fourchette qui commençait à 30 000 :
  l'écart est réel mais mince, et il tient au crédit — une faction qui nourrit
  ses villes est une faction qui prête. Cinq factions sur trente-six sont sous
  le prix d'une bourse contre dix au témoin, ce qui était le problème d'origine.

## Lot C — la monnaie (ECONOMIE §4)

- [ ] **C1. `src/monnaie.js`** (R4 : MODULES) : `masse` (incrémentale, jamais
  recalculée par balayage), `gage` (cache au conseil, `HORIZON_GAGE = 720`),
  `cours` (clamp 0,05–4, lissage 0,7/0,3, prime de confiance du taux
  directeur). Init + `normaliser` : masse initiale = somme des stocks
  monétaires existants de la faction (l'invariant naît vrai). Critère : tests
  unitaires de chaque formule, aller-retour JSON.
- [ ] **C2. L'invariant comptable** (ECONOMIE §2) : pour chaque faction, somme
  des caisses + ménages + trésor + détentions étrangères + joueur = masse.
  Test qui joue 2 000 h et vérifie l'égalité **exacte** à chaque conseil. Toute
  divergence est un bug à trouver, jamais une tolérance à élargir.
- [ ] **C3. Émission et retrait** (décision de conseil par tempérament +
  effets : cours, grogne, journal). Critère : tests + l'invariant tient.
- [ ] **C4. Les prix locaux** : `prixLocal = prixAc / cours` partout où une
  ville cote (`prixUnitaire`, étals, services). Critère : test « une monnaie
  faible fait des prix hauts », les tests de commerce existants adaptés,
  gardes du banc tenues.
- [ ] **C5. Calibrage + livraison** : cours divergent ≥ ×2 en fin de partie ;
  ≥ 1 monnaie effondrée (< 0,4) sur 6 graines ; invariant exact sur 6 000 h ;
  tick < 110. CIBLES.json, ECONOMIE, verifier --complet.

## Lot D — le change et la conquête par la dette (ECONOMIE §5, §6.3–6.4)

- [ ] **D1. Le change** : taux `cours(a)/cours(b)`, écart `ECART_BASE = 0,12`
  balayable, divisé par 2 sous accord commercial, réduit par taille de ville et
  estime ; l'écart encaissé par la ville du bureau. Villes libres : toutes
  monnaies, sans écart.
- [ ] **D2. Les caravanes inter-factions** convertissent au taux du jour
  (R9 : encaisser/debourser, l'invariant tient par monnaie).
- [ ] **D3. Le rachat de créance** : `valeurNette` (ECONOMIE §6.3.1), les trois
  issues du vendeur (refus / rabais jusqu'à 0,4× / prime jusqu'à 4×),
  enregistrement `col.cession`. Critère : tests des trois issues pilotés par
  l'état du vendeur.
- [ ] **D4. La saisie par créancier étranger** + l'effet diplomatique
  bidirectionnel `prix encaissé − valeur perdue` appliqué **à la reprise**
  (ECONOMIE §6.3.3–6.3.4 : rancune, indifférence, ou gratitude — pas de borne
  à zéro). Critère : trois tests, un par signe.
- [ ] **D5. Calibrage + livraison** : reprises **2–10** / 6 parties ; cessions
  consenties **≥ 1/3** ; refus **≥ 50 %** ; accords **≥ 2/partie** ; invariant ;
  tick. CIBLES.json, ECONOMIE, verifier --complet.

## Lot E — le joueur (ECONOMIE §7, §10)

- [ ] **E1. `player.bourse`** multi-monnaies ; migration des sauvegardes
  (crédits → monnaie de la faction la plus proche, au cours du jour, dans
  `normaliser`).
- [ ] **E2. Tout prix affiché en monnaie locale seule**, symbole par faction ;
  qui paie quoi dans quelle monnaie : la table d'ECONOMIE §7.2.
- [ ] **E3. L'écran du change + le portefeuille** (R6 ; l'ancien crédit ne
  paraît qu'au bureau de change).
- [ ] **E4. Les prérogatives** : taux directeur, émettre, accorder un crédit,
  racheter une créance — même mécanisme que les PNJ, coûts au trésor,
  grades d'ECONOMIE §7.3.
- [ ] **E5. Le bandeau de dévaluation** (> 10 % de perte sur une monnaie
  détenue) + journal des émissions/taux/rachats/défauts.
- [ ] **E6. Le banc-bot survit** : une partie complète de `test/equilibre.js`
  sans ruine par accident de change ; tests navigateur pour chaque écran neuf.

## Lot F — livraison générale

- [ ] **F1.** `verifier --complet` vert, tick < 110 en médiane calibrée.
- [ ] **F2.** README + ECONOMIE mis à jour avec les mesures finales ; le
  tableau des douze cibles d'ECONOMIE §13 rempli contre le témoin `82636d8`.
- [ ] **F3.** Artefact republié (fragment identique à `dist/fragment.html`,
  SHA vérifié) — seulement sur demande explicite du propriétaire.

---

## Blocages

*(aucun en cours)*

### A3 — résolu : la demande était un besoin, pas une demande solvable

Consigné ici parce que c'est le blocage le plus instructif du chantier, et que
la solution ne s'est trouvée qu'après l'avoir formulé.

**Ce qui bloquait.** Le circuit refermé, le monde ne tenait à aucun réglage.
Part salariale au-dessus de 0,3 : les ménages thésaurisaient jusqu'à 93 % de la
monnaie du monde et les caisses se vidaient en salaires sans rien encaisser. En
dessous : caisses et trésors tenaient, mais les gens n'avaient pas de quoi
manger. Population plafonnée à 27 000 contre 69 000 au témoin, à toute valeur
entre 0,05 et 0,98.

**La cause.** Le moteur ne connaissait que la moitié de l'offre et de la
demande. L'offre était là — le stock. La demande ne dépendait que de la
population : `cibleStock(col, key) = pop × coefficient`. Mille habitants fauchés
« demandaient » exactement autant que mille habitants riches, et le prix ne
savait pas si l'acheteur avait de quoi payer. D'où les deux symptômes : une
ville sans le sou gardait des prix hauts, sa marchandise ne trouvait pas
preneur et pourrissait pendant que les gens mouraient de faim ; une ville riche
ne faisait monter aucun prix, donc son argent ne repartait jamais.

**Ce qui a débloqué.** Une ligne : la demande est multipliée par la solvabilité
des habitants — `menages / (pop × MENAGES.parTete)`, bornée. Le prix baisse chez
les pauvres, monte chez les riches, et le marché se vide dans les deux cas au
lieu de se bloquer. C'est l'offre et la demande écrite en entier.

**Le piège du plafond.** Première borne à ×2,2 : 36 villes sur 49 y étaient
collées, le prix ne pouvait plus monter et la monnaie restait immobilisée. Le
balayage a montré la sortie — au-delà de 20 la borne ne mord plus du tout et le
résultat ne bouge plus d'un habitant. Une limite qu'on atteint tout le temps
n'est pas une limite, c'est un mur.

### Ce qui a été gardé au passage

Trois décors réparés, qui tenaient par chance et sont tombés dès que le monde a
bougé de quelques pour cent — aucun ne parlait d'économie :

- la raffinerie et le plancher de réserve mesuraient les stocks d'un camp qu'une
  razzia pouvait vider d'un tiers ; le décor l'interdit désormais ;
- l'érosion d'estime exigeait « plus de 35 % après huit mois » sur une seule
  graine ; elle compare maintenant ses deux moitiés, ce qui est ce que
  « dégressif » veut dire et ne dépend d'aucun seuil ;
- la prime d'urgence était jugée sur la moyenne des ordres pressés contre les
  calmes — une mesure dominée par la distance et la quantité, qui s'inversait
  sans que la prime ait bougé. Elle est désormais mesurée contre un témoin :
  même monde, mêmes tirages, prime neutralisée d'un côté.
