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

- [x] **C1. `src/monnaie.js`** (R4 : MODULES) : `masse` (incrémentale, jamais
  recalculée par balayage), `gage` (cache au conseil, `HORIZON_GAGE = 720`),
  `cours` (clamp 0,05–4, lissage 0,7/0,3, prime de confiance du taux
  directeur). Init + `normaliser` : masse initiale = somme des stocks
  monétaires existants de la faction (l'invariant naît vrai). Critère : tests
  unitaires de chaque formule, aller-retour JSON.
- [x] **C2. L'invariant comptable** (ECONOMIE §2) : pour chaque faction, somme
  des caisses + ménages + trésor + détentions étrangères + joueur = masse.
  Test qui joue 2 000 h et vérifie l'égalité **exacte** à chaque conseil. Toute
  divergence est un bug à trouver, jamais une tolérance à élargir.
- [x] **C3. Émission et retrait** (décision de conseil par tempérament +
  effets : cours, grogne, journal). Critère : tests + l'invariant tient.
- [x] **C4. Les prix locaux** : `prixLocal = prixAc / cours` partout où une
  ville cote (`prixUnitaire`, étals, services). Critère : test « une monnaie
  faible fait des prix hauts », les tests de commerce existants adaptés,
  gardes du banc tenues.
- [x] **C5. Calibrage + livraison.** Mesuré, 6 graines × 6 000 h, contre
  `82636d8` :

  | cible | attendu | obtenu | |
  |---|---|---:|---|
  | invariant comptable | exact | **0** sur 6 000 h | ✔ |
  | écart des cours | ≥ ×2 | **×5,5** (0,40 – 2,21) | ✔ |
  | monnaie effondrée | ≥ 1 | **oui**, au plancher | ✔ |
  | villes bien nourries | — | **424** | ✔ témoin 230 |
  | villes affamées | — | **7 %** | ✔ témoin 24 % |
  | villes debout | — | **500** | ✔ témoin 394 |
  | trésor médian | 30 000–120 000 | **44 490** | ✔ |
  | population | — | **55 106** | ✘ témoin 140 534 |
  | factions écrasées | ≥ 4/36 | **1/36** | ✘ le drame a disparu |

  **Deux dettes de calibrage, et elles vont ensemble.** Le monde compte 500
  villes très bien nourries — 7 % d'affamées contre 24 % au témoin — mais de
  petites villes : 110 habitants en moyenne contre 357. Et plus personne ne
  s'effondre. Les deux tiennent au même fait : la monnaie a rendu le monde
  *prudent*. Une ville consomme ce qu'elle peut payer, donc elle stocke, donc
  elle ne croît pas ; une faction a toujours de quoi tenir, donc elle ne tombe
  pas.

  Ce n'est pas rattrapable en tournant `ETAT.parDefense` : balayé de 0,002 à
  0,02, les factions écrasées restent à 0 ou 1 sur 18. Le levier est ailleurs —
  probablement dans la croissance des villes, qui exige aujourd'hui une satiété
  d'au moins 0,8 alors que la solvabilité la plafonne en dessous. **À reprendre
  au lot F**, avec un balayage dédié, et pas en passant.

## Lot D — le change et la conquête par la dette (ECONOMIE §5, §6.3–6.4)

- [x] **D1. Le change** : taux `cours(a)/cours(b)`, écart `ECART_BASE = 0,12`
  balayable, divisé par 2 sous accord commercial, réduit par taille de ville et
  estime ; l'écart encaissé par la ville du bureau. Villes libres : toutes
  monnaies, sans écart.
- [x] **D2. Les caravanes inter-factions** convertissent au taux du jour
  (R9 : encaisser/debourser, l'invariant tient par monnaie).
- [x] **D3. Le rachat de créance** : `valeurNette` (ECONOMIE §6.3.1), les trois
  issues du vendeur (refus / rabais jusqu'à 0,4× / prime jusqu'à 4×),
  enregistrement `col.cession`. Critère : tests des trois issues pilotés par
  l'état du vendeur.
- [x] **D4. La saisie par créancier étranger** + l'effet diplomatique
  bidirectionnel `prix encaissé − valeur perdue` appliqué **à la reprise**
  (ECONOMIE §6.3.3–6.3.4 : rancune, indifférence, ou gratitude — pas de borne
  à zéro). Critère : trois tests, un par signe.
- [x] **D5. Calibrage + livraison.** Mesuré, 6 graines × 6 000 h, contre
  `82636d8` :

  | cible | attendu | obtenu | |
  |---|---|---:|---|
  | invariant comptable | exact | **0** | ✔ |
  | accords commerciaux | ≥ 2/partie | **21** (3,5/partie) | ✔ témoin 8 |
  | villes reprises par leur créancier | 2 à 10 | **47** | ✘ trop |
  | écart des cours | ≥ ×2 | **×8,7** (0,40 – 3,49) | ✔ |
  | villes bien nourries | — | **387** | ✔ témoin 230 |
  | villes affamées | — | **16 %** | ✔ témoin 24 % |
  | trésor médian | 30 000–120 000 | **54 952** | ✔ |
  | villes debout | — | **517** | ✔ témoin 394 |
  | population | — | **57 893** | ✘ témoin 140 534 |
  | factions écrasées | ≥ 4/36 | **1/36** | ✘ |

  **La conquête par l'argent existe, et elle est trop facile** : quarante-sept
  villes changent de drapeau sans une colonne, pour une fourchette qui visait
  deux à dix. Le prix d'une créance sort bien de la situation du vendeur — les
  trois issues sont vérifiées par test — mais rien ne limite le *nombre* de
  manœuvres qu'une faction mène de front. À reprendre : soit une seule créance
  étrangère portée à la fois, soit un prix qui monte avec le nombre de villes
  déjà prises de cette façon. Le second est plus juste — on devient un usurier
  connu, et on le paie.

  Les deux dettes du lot C restent ouvertes et s'aggravent : population et
  factions écrasées. Voir le lot F.
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

### F0 — la carte des leviers, avant tout réglage

Trois calibrages du lot D ont échoué pour la même raison : le levier choisi à
l'intuition ne commandait rien. `ETAT.parDefense` multiplié par dix laisse les
factions écrasées à 1 sur 18 ; `CAISSE.partSalariale` de 0,05 à 0,98 laissait la
population plafonnée. On règle à l'aveugle, et rien ne se capitalise d'un
réglage au suivant. F0 mesure une fois pour toutes ce que chaque constante
commande.

- [x] **F0.1. Le module de cartographie** (`tools/cartographie.js`) : recense
  les champs numériques des objets exportés en MAJUSCULES de `src/`, calcule
  les élasticités appariées et le plancher de bruit. Fonctions pures, testées
  dans `test/headless.js` §17 — un instrument de mesure qui se trompe fait tout
  mesurer faux. Critère : recensement, élasticité, plancher et significativité
  couverts par des tests.
- [x] **F0.2. `node tools/banc.js --cartographie`** : joue référence, placebos
  et deux points par levier (×0,7 et ×1,4), écrit `CARTOGRAPHIE.md`. `--max N`
  pour travailler sur un sous-ensemble sans payer la campagne entière.
  Critère : `--max 2 --graines 11,42 --horizon 400` rend un document lisible en
  moins d'une minute.
- [ ] **F0.3. La campagne complète** (6 graines, 6 000 h) jouée, et ses trois
  listes consignées ici : ce qui commande la population, ce qui commande le
  drame, ce qui ne commande rien. Critère : au moins un levier au-dessus du
  plancher de bruit sur les factions écrasées — ou le constat qu'aucune
  constante plate ne le commande, ce qui oriente le lot autrement.

  | | mesuré |
  |---|---|
  | leviers recensés | **84**, portés par 8 modules sur les 36 lus |
  | parties jouées | **1 044** (174 configurations × 6 graines × 6 000 h) |
  | leviers vivants | **57** |
  | champs morts | **27** |
  | levier sur le drame | `MONNAIE.inertie`, `CAISSE.partSalariale` |
  | levier sur la population | `MONNAIE.inertie` — le même |

  **Le drame est commandé par la monnaie, pas par l'armée.** Confirmé au
  balayage direct, 6 graines × 6 000 h, et pas seulement lu sur la carte :

  | `MONNAIE.inertie` | 0,70 | 0,90 | 0,95 | 0,98 | 0,99 |
  |---|---:|---:|---:|---:|---:|
  | factions écrasées | 1/36 | 4/36 | 2/36 | **6/36** | 6/36 |
  | population | 57 893 | 54 442 | 58 774 | **70 883** | 79 726 |
  | villes | 517 | 463 | 478 | 440 | 414 |
  | trésor médian | 54 952 | 45 253 | 33 846 | 28 076 | 14 038 |
  | écart comptable | 0 | 0 | 0 | 0 | **229** |

  `CAISSE.partSalariale` va dans le même sens : 0,55 → 1/36 et 57 893 hab.,
  0,77 → **5/36 et 65 476 hab.**

  Les deux cibles que le lot F devait poursuivre séparément — « ≥ 4/36 écrasées »
  et « la population remonte » — sont **le même levier**, et c'est un levier
  monétaire. L'inertie du cours est le lissage qui empêche une monnaie de
  s'effondrer d'un coup ; à 0,7 elle laisse le cours d'un pays qui faiblit
  tomber au plancher, ce qui renchérit tout chez lui, effondre sa consommation
  — et le protège d'être achevé. Le pays agonise sans mourir. Plus haut, la
  monnaie ne fait plus bouclier : les pays faibles tombent pour de bon et le
  monde nourrit un cinquième d'habitants en plus.

  **`ETAT.parDefense` est confirmé mort sur le drame.** La carte ne lui trouve
  d'effet que sur la dette et les convois — d'où l'échec du balayage ×10 du lot
  D, qui cherchait le drame là où il n'est pas.

### F1 — F3

- [ ] **F1.** `verifier --complet` vert, tick < 110 en médiane calibrée.
- [ ] **F2.** README + ECONOMIE mis à jour avec les mesures finales ; le
  tableau des douze cibles d'ECONOMIE §13 rempli contre le témoin `82636d8`.
- [ ] **F3.** Artefact republié (fragment identique à `dist/fragment.html`,
  SHA vérifié) — seulement sur demande explicite du propriétaire.

---

## Blocages

### F1 — `verifier --complet` ne peut pas être vert ici, et ce n'est pas la charge

Mesuré au calme (`loadavg` 0,03) : **166 à 172 µs par tick brut, 187 à 196
normalisés**, contre un budget de 110. La garde « machine chargée » refuse en
plus de conclure, parce que l'étalon rend ×1,13 — ce processeur-ci fait la
boucle arithmétique en 22 ms là où la machine de référence en mettait 25.

Deux choses distinctes, et il faut les tenir séparées :

1. **La dette de vitesse est réelle** : ~170 µs contre 110, quelle que soit la
   normalisation. Elle appartient au lot F1 et elle est antérieure à ce lot —
   le lot F0 n'a touché aucun fichier de `src/` (`tools/`, `test/`, les
   documents, rien d'autre), il ne peut pas l'avoir causée.
2. **La garde est mal orientée.** Elle a été écrite après un incident où la même
   révision mesurait 108 puis 160 µs à une heure d'écart ; elle refuse
   au-dessus de ×1,08, c'est-à-dire quand la machine est *plus rapide* que la
   référence. Sur une machine réellement chargée l'étalon ralentit et le facteur
   descend sous 1 — la garde ne s'y déclenche pas. Elle attrape aujourd'hui une
   machine saine et laisserait passer le cas qu'elle visait.

**Ne pas élargir le seuil pour faire passer la mesure** — c'est exactement ce
que ce fichier interdit. La garde est à réécrire sur ce qu'elle voulait dire :
la stabilité entre passes, pas l'écart à une machine de référence disparue.
C'est du travail de lot F1, avec sa propre mesure.

En attendant, `--complet` est vert sur toutes ses autres étapes : 37 fichiers
statiques, 37 modules bundlés, 1 044/1 046 tests moteur, **264 vérifications
navigateur**, **7 gardes du monde**.

### F0.3 — l'invariant comptable casse à `MONNAIE.inertie = 0,99`

Relevé pendant le balayage de confirmation, 6 graines × 6 000 h : l'écart de
`auditer()` vaut **0 pour 0,70 / 0,90 / 0,95 / 0,98, et 229 à 0,99**. Il doit
valoir zéro partout — c'est l'invariant qui dit que le moteur ne fabrique pas
d'argent en douce, et cinq fuites ont déjà été trouvées par lui pendant les
lots C et D.

229 sur une masse de 1 579 015, c'est 0,015 % : mince, mais un invariant ne se
juge pas en proportion. Un cours qui reste collé près de 1 emprunte un chemin
que les autres réglages n'exercent jamais, et c'est là que ça fuit.

**Ce n'est pas un blocage de F0** — la carte est faite et sa cible est
atteinte. C'est une dette datée, à instruire par le lot F **avant** de toucher
à `inertie`, parce que le levier que la carte recommande passe juste à côté de
ce trou. Ne pas régler `inertie` au-dessus de 0,98 tant que l'écart n'est pas
expliqué.

### F0.3 — deux familles de leviers dont l'effet surprend

`PALIERS_ITEM.*` (paliers d'objets) et `POIDS_BASE.*` (poids des métiers en
ville) sortent parmi les leviers vivants, parfois haut : `POIDS_BASE.cantinier`
est le premier levier du monde sur l'argent des ménages, `PALIERS_ITEM.verrou`
et `.kevlar` rendent des chiffres identiques à la deuxième décimale sur quatre
métriques.

L'identité s'explique — les deux valent 2, et ×1,4 les fait franchir le même
entier —, mais l'ampleur, non. Deux lectures : ces catalogues nourrissent
vraiment la production et les prix des villes, ou bien leur effet mesuré est du
chaos que cinq placebos ne suffisent pas à borner. **À trancher par un balayage
direct avant de s'appuyer dessus**, comme le document le prescrit lui-même pour
toute trouvaille. Les deux leviers retenus pour le lot F, eux, sont confirmés.

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
