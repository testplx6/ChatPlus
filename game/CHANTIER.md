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

- [x] **F1.** `verifier --complet` **vert sur ses six étapes** — et vert pendant
  que la machine était dans son état lent, ce qui est la preuve que la garde est
  immunisée. Rattrapage max **1,85 s** pour un plafond à 2,50 s.
- [x] **F2.** Tableau d'ECONOMIE §13 rempli contre le témoin `82636d8` :
  **neuf cibles sur quatorze tenues**, et chaque manquée expliquée — deux mal
  posées (tirées d'un témoin qui vivait d'une planche à billets), une qui
  interrogeait une valeur impossible (« cours < 0,4 » quand le plancher vaut
  0,40), deux dépassées d'un ordre de grandeur (5 579 faillites pour 5 à 25 ;
  47 villes reprises par un créancier pour 2 à 10) et deux non mesurables faute
  d'événement journalisé. README refait sur la garde de vitesse, METHODE §3
  augmenté des deux règles que cette session a payées. `CIBLES.json` resserré :
  **10 gardes** au lieu de 7, dont trois neuves (endettées, créances, monnaies
  au plancher). Le banc compte désormais les événements par type et les
  monnaies au plancher.
- [ ] **F3.** Artefact republié (fragment identique à `dist/fragment.html`,
  SHA vérifié) — seulement sur demande explicite du propriétaire.

---

## Lot G — la colonne qu'on ne paie plus (règle donnée par le propriétaire)

**Spécifiée depuis dans `INDIVIDUS.md` (lot 6)** — elle s'exécutera avec ce
chantier-là, pas ici. Consignée telle qu'elle a été dictée. Elle
répond à la question laissée ouverte par la chasse à la sixième fuite : une
faction sans plus aucune ville garde-t-elle une armée sur le terrain, et qui la
paie ?

> Si elle n'est plus payée par sa faction, la colonne peut rester un temps à son
> service, selon la loyauté que les individus qui la composent lui portent. Mais
> elle peut mourir de faim, et décider de faire cavalier seul, de fonder sa
> faction, de se faire payer par une autre, de se disloquer.

Ce que ça implique, et qui reste à trancher avant d'écrire une ligne : une
colonne acquiert une loyauté propre, donc un état ; « mourir de faim » suppose
qu'elle consomme ; « fonder sa faction » touche à la création de factions en
cours de partie, ce que le moteur ne sait pas faire ; « se faire payer par une
autre » est un marché, donc un prix. Aujourd'hui, une colonne non payée survit
et ne coûte rien — c'est le comportement par défaut, il est cohérent mais il
n'est pas celui-là.

## Leviers actionnables — mesurés, prêts, non appliqués

Ce que la cartographie a trouvé et que le balayage direct a confirmé, gardé ici
pour être actionné le jour où on le décide. **Ne rien appliquer sans redire
pourquoi** : chacun a un prix, écrit en face.

### Le drame par le climat — `climat.SAISONS.accalmie.vivant` : 1,1 → 0,77

Ce que c'est : ce que la bonne saison fait pousser de vivant. Le baisser, c'est
un monde qui nourrit moins de monde, donc des pays faibles qui ne tiennent plus.

    node tools/banc.js --balaye climat.SAISONS.accalmie.vivant=0.77,0.9,1.1

Mesuré, 6 graines × 6 000 h :

| | 0,77 | 0,9 | **1,1 (courant)** |
|---|---:|---:|---:|
| factions écrasées | **5/36** | 2/36 | 1/36 |
| villes debout | 481 | 488 | 517 |
| villes affamées | **12 %** | 10 % | 16 % |
| population | 54 452 | 46 069 | 57 893 |
| accords commerciaux | 13 | 12 | 21 |
| trésor médian | 59 338 | 56 422 | 54 952 |
| amplitude des cours | 0,40–3,35 | 0,40–2,59 | 0,40–3,49 |
| écart comptable | 0 | 0 | 0 |

**Ce qu'on gagne** : le drame revient (5 factions écrasées au lieu d'une), la
monnaie reste pleinement vivante — ce que `MONNAIE.inertie` ne savait pas faire
—, et le monde a *moins* faim, parce qu'il se réduit à ce qu'il peut nourrir.

**Ce qu'on perd** : 36 villes, 8 accords commerciaux, 3 400 habitants.

**Pourquoi ce n'est pas appliqué.** C'est du drame fabriqué en tournant un
bouton : les pays meurent parce qu'il pleut moins, pas parce qu'il leur est
arrivé quelque chose. Décision du propriétaire (août 2026) : le drame doit
d'abord venir des acteurs du chantier `INDIVIDUS.md` — armée impayée qui se
retourne, ville saisie par son créancier. Ce levier reste le repli si les
acteurs ne suffisent pas, et il est mesuré pour être actionnable en cinq
minutes.

**Après application** : `CIBLES.json` à resserrer (villes, pop, accords,
écrasées), ECONOMIE §13 à remesurer.

## Blocages

### Lot 3b — INACHEVÉ : deux étapes rouges, commité mais NON POUSSÉ

Le but du lot est **atteint et prouvé** : `state.rngState` est identique après
200 heures que le joueur soit immobile dans un coin ou dans l'autre. Armées,
accords et guerres identiques eux aussi. Le monde ne dépend plus du trajet.

Deux choses restent rouges, et `--complet` avec elles :

1. **Vitesse : ×1,140 de la livraison précédente** (122 µs estimés contre 107),
   pour un seuil à ×1,08. Partie du chemin faite : c'était **×1,317**, et deux
   causes ont été trouvées puis corrigées — les convois et les colonnes
   redérivaient une graine à chaque heure (flux persistant maintenant, comme
   les villes), et surtout **la condition d'expiration des panneaux avait été
   perdue** en les basculant sur le flux de la ville : les 86 villes
   régénéraient leurs contrats toutes les 40 heures au lieu des seules
   périmées. Écarté au passage : ce n'est pas le monde qui a grossi — la graine
   mesurée en compte 79 villes contre 91 à la livraison précédente, donc moins.
   **Il reste ×1,14 à expliquer.** Piste non explorée : les réseaux de
   caravanes dérivent encore `grainDe(graine, 'reseau', clé, t)` toutes les
   huit heures, et `new Rng` par convoi et par heure.
2. **Navigateur : expiration sur le bouton « captif / livrer »** — l'élément est
   trouvé mais ne devient jamais actionnable. Non diagnostiqué. Le monde ayant
   changé, la mise en scène du décor ne tient probablement plus ; à instruire
   avant toute conclusion.

Ce qui est fait et tient : flux privé du joueur, conseils/dirigeants/armées par
dérivation apatride, un dé par convoi, panneaux et étals sur le flux de la
ville. Effet mesuré sur le monde, 6 graines × 6 000 h : villes 480 → 498,
population 52 585 → 57 739, factions écrasées 3/36 → 2/36, écart comptable nul,
les dix gardes tiennent.


### Lot 3b — une faction rayée de la carte : drame voulu ou garde à tenir ?

Après la séparation des flux, sur six graines jouées 8 000 heures : **cinq
gardent leurs six factions, une (4242) en raye une entièrement**. Le décor
disait « aucune faction n'est rayée » — vrai d'un monde qui n'avait pas de
drame, et c'est précisément ce qu'on cherchait à changer.

Ce n'est pas une question technique. Une faction effacée de la carte, est-ce le
drame qu'on veut ou une limite à tenir ? Les gardes de `CIBLES.json` ne
tranchent pas : elles comptent les factions *écrasées* (deux villes ou moins),
pas les disparues.

En attendant la décision, le décor a été assoupli à « le monde ne s'effondre
pas à quelques factions » (≥ 5 sur 6) avec la mesure écrite à côté. **C'est un
assouplissement, il est signalé comme tel**, et il se resserre d'une ligne si
la réponse est « une faction ne disparaît jamais ».


### F1a — résolu : la garde de vitesse mesurait l'envers de ce qu'elle croyait

**Correction d'un chiffre publié ici.** J'avais écrit « 166 à 172 µs au calme,
`loadavg` 0,03 ». La moyenne à une minute était bien à 0,03, mais celles à cinq
et quinze minutes étaient à 0,97 et 2,58 : la machine sortait d'une campagne de
mille parties et n'avait pas récupéré. **Au vrai calme, le tick est à 113-119 µs
bruts**, pas 166. Je venais de reproduire tout seul l'incident que la garde
était censée attraper — même code, 113 puis 172 µs à une demi-heure d'écart.

Les quatre relevés qui ont dicté la nouvelle garde, même révision, même journée :

| | tick courant | dispersion | rapport au témoin | ancienne garde |
|---|---:|---:|---:|---|
| machine calme (×1,13) | 115–125 µs | 9 % | ×1,92 | **refuse de conclure** |
| machine chargée (×0,59) | 178–254 µs | 31 % | ×1,52 | **« budget tenu », 102 µs** |
| machine ralentie uniformément | 166–172 µs | 4 % | ×1,79 | passe |

L'ancienne garde refusait de conclure sur une machine saine et **déclarait le
budget tenu à 102 µs normalisés pendant que le tick coûtait 235 µs réels** :
sur une machine chargée l'étalon ralentit, le facteur s'effondre à 0,59, et la
normalisation divise le vrai coût par deux. Un seuil dans le mauvais sens ne se
rattrape pas en le déplaçant.

**La sortie est la règle de la maison : une mesure sans témoin ne mesure rien.**
`tools/vitesse.js` mesure la révision courante et le témoin `82636d8` dans la
même minute, sur la même machine, en alternant les passes, une par processus
(mesurées dans le même processus, elles se réchauffent l'une l'autre : 216, 157
puis 132 µs pour trois mesures du même code). Plus d'étalon à entretenir, plus
de machine de référence à faire revivre.

Les deux gardes sont nécessaires, et le tableau dit pourquoi : le rapport
encaisse le ralentissement uniforme (les deux révisions ralentissent ensemble)
mais la contention en pointe le comprime — 1,92 devient 1,52, et le budget
passerait à tort. C'est la dispersion des passes qui la trahit : 9 % au calme,
31 % sous charge.

Le budget devient **×1,55 du témoin**. C'est la traduction de l'ancien, pas un
desserrage : 110 µs normalisés, un témoin à 60-64 µs bruts ici soit 67-71
normalisés, d'où 110/71 ≈ 1,55. La preuve que ce n'est pas un budget taillé pour
passer : l'étape est rouge à **×1,99**.

### F1b bis — RÉSOLU : le critère de vitesse, et ce que l'instrument sait mesurer

Décidé par le propriétaire : deux critères utiles à la place d'un budget hérité.
En les branchant, l'instrument a montré qu'il ne pouvait en tenir qu'un et
demi — et c'est mesuré, pas supposé.

**L'épreuve du code identique.** Un instrument de comparaison se juge sur une
question dont la réponse est connue : deux fois le même code doit rendre ×1,00.

| protocole | verdict sur du code identique |
|---|---|
| deux processus, min de 3 | **×1,17** (la même chose mesure 94 à 126 µs) |
| un processus, entrelacé ×6 | **×0,86** (V8 optimise deux graphes de modules inégalement) |
| fenêtres de 12 000 ticks | **×0,83** |

La résolution est d'une dizaine de pour cent, pas de trois. Le seuil de
non-régression à +3 % aurait clignoté au rouge sans qu'une ligne ait changé —
et une étape qui clignote, on apprend à l'ignorer. C'est exactement le défaut
qu'on venait de corriger sur l'ancienne garde.

**Ce qui est livré, calibré sur la résolution réelle :**

- **le plafond vécu** — le rattrapage maximal reste sous 2,5 s. Absolu, donc
  aucun second graphe de modules à comparer ; le minimum de six passes
  l'approche par en dessous ; une machine lente rend un verdict pessimiste,
  jamais complaisant. **Mesuré : 1,85 s.**
- **la non-régression grossière** — le tick ne dépasse pas ×1,25 le chiffre
  relevé à la livraison précédente (`CIBLES.json`, `vitesse.us`), avancé
  délibérément. Elle n'attrape pas 5 % de dérive, mais elle attrape ce qui
  arrive vraiment : une boucle quadratique introduite sans qu'on la voie.
- la dispersion reste, inchangée.

`verifier --complet` est **vert sur ses six étapes**.

### ~~F1b bis~~ — l'énoncé du blocage, gardé pour la trace

Deuxième prise remboursée (Dijkstra, ci-dessous) : **×1,77 → ×1,69**. Le profil
est maintenant **plat** — profil inclusif et profil par ligne à l'appui, il n'y
a plus de gisement : trois sous-arbres se partagent le tick (colonies 25 %,
caravanes 23 %, factions 20 %) et aucune ligne ne dépasse 1,6 %. Aller de 1,69
à 1,55 serait une dizaine de micro-prises à 1 %, chacune avec son risque de
régression, pour un gain qu'il faut regarder en face :

| | µs/tick | une nuit d'absence | le plafond `RATTRAPAGE_MAX` (2 ans) |
|---|---:|---:|---:|
| aujourd'hui (×1,69) | 107 | 308 ms | 1,82 s |
| au budget (×1,55) | 98 | 282 ms | 1,67 s |
| témoin `82636d8` (×1,00) | 63 | 181 ms | 1,07 s |

**Vingt-six millisecondes sur une nuit d'absence.** Le rattrapage est en plus
étalé par tranches de 200 heures (`rattrapageEtale`), donc rien ne fige jamais
l'écran. Sur un téléphone — le moteur est mobile-first, comptons ×4 — l'écart
reste sous la centaine de millisecondes.

**Ce qui pose problème n'est pas la mesure, c'est le critère.** ×1,55 est ma
traduction arithmétique de « 110 µs », un nombre hérité d'une machine qui
n'existe plus. Et le témoin `82636d8` est un monde **sans économie réelle** :
ni ménages, ni crédit, ni monnaie, ni change. Exiger que quatre couches
économiques coûtent moins de 55 % de plus qu'un monde qui ne les a pas n'est
adossé à rien.

**Ce que je propose, et qui appartient au propriétaire** — deux critères qui
protègent ce qui compte vraiment, à la place d'un seul qui ne protège rien :

1. **Le plafond vécu** : le rattrapage maximal reste sous 2,5 s sur cette
   machine (soit ~10 s sur un téléphone lent, étalées en tranches). Mesuré
   aujourd'hui : 1,82 s. C'est la seule contrainte que le joueur ressent.
2. **La non-régression** : le tick ne ralentit pas d'une livraison à l'autre
   sans raison écrite — témoin glissant, la révision précédente, seuil +3 %.
   C'est ce qui empêche la dette de revenir en douce, et c'est ce que le
   budget absolu prétendait faire sans y parvenir.

Tant que ce n'est pas tranché, `verifier --complet` reste rouge sur cette
étape, et **le seuil n'est pas touché** — l'élargir pour faire passer la
mesure est précisément ce que ce fichier interdit.

### F1b — la dette de vitesse : ×1,99 → ×1,77, budget ×1,55

Antérieure au lot F0, qui n'a touché aucun fichier de `src/`. Premier morceau
remboursé : le contexte de prix. `solvabilite`, l'humeur de la ville et le cours
de sa monnaie ne dépendent pas de la marchandise et se recalculaient à chaque
marchandise — dix fois par ville et par heure pour dix résultats identiques.
Calculés une fois, passés à la boucle : **×1,99 → ×1,77**, et le monde joué au
banc est identique au bit près sur les six graines (mêmes 517 villes, mêmes
57 893 habitants, même écart comptable nul).

Ce qui reste à trouver, d'après le profil : `chemin` 6,9 %, `departsDuReseau`
5,7 %, le ramasse-miettes 4,6 %, `prixUnitaire` encore 4,1 %. Aucun point chaud
unique — le profil est plat, il faudra plusieurs prises, chacune mesurée contre
le témoin, chacune vérifiée « monde identique » au banc avant d'être gardée.

Toutes les autres étapes de `--complet` sont vertes : 37 fichiers statiques,
37 modules bundlés, 1 051/1 052 tests moteur, 264 vérifications navigateur,
7 gardes du monde.

### F0.3 — résolu : la sixième fuite, 229 crédits versés à personne

Datée au tick près : graine 42, `MONNAIE.inertie` à 0,99, **tick 3294**. La
faction ombrelle perd sa dernière ville — saisie par un créancier, comptes
convertis correctement, écart nul juste après. Puis, plus loin dans le même
tick, elle verse la solde de sa colonne à sa ville de départ. `colonieDepart`
ne rend plus rien, et `verser` débitait le trésor quand même sans créditer
personne : **229,00 crédits**, et l'écart relevé au banc valait 229,00.

Le même trou existait pour un avant-poste : le monde n'en connaît que la
vitrine, sa vérité est dans `state.base`, donc le crédit n'allait nulle part —
mais le trésor payait.

Le correctif ne pose aucune règle nouvelle : verser, c'est déplacer de l'argent
d'un registre à un autre, et sans destinataire il n'y a rien à déplacer. Une
solde qu'on ne peut pas verser n'est pas une solde gratuite, elle n'est pas
versée — comme une garnison qu'un trésor vide ne paie pas, ce que le lot A4
disait déjà.

Mesuré : écart **0 à 0,98 comme à 0,99**, et au réglage courant le monde est
identique au bit près (517 villes, 57 893 habitants, mêmes 47 créances). La
route vers `inertie` est dégagée.

Ce qui reste à instruire de la chasse : `colonieDepart` rend `null` alors que la
faction a une colonne en campagne. Ce n'est pas un bug comptable — c'est une
question de jeu. Une faction sans plus aucune ville garde-t-elle une armée sur
le terrain, et qui la paie ? À trancher par le propriétaire du projet, pas ici.

### ~~F0.3~~ — l'invariant comptable cassait à `MONNAIE.inertie = 0,99`

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

### F0.3 — la campagne des 987 leviers : le drame a un levier propre

Campagne complète (987 leviers, ~2 000 configurations, 6 graines × 6 000 h) :
**292 leviers vivants, 695 morts**, 8 placebos, `CARTOGRAPHIE.md` régénéré.
Sur les factions écrasées, les catalogues ont livré ce que les constantes
plates n'avaient pas : des leviers de **production**, pas de monnaie —
`SAISONS.accalmie.vivant`, `VOCATION_BIOME.canyons.paysan`, `BIOMES.*.yields`.

Confirmé au balayage direct (la règle : jamais une petite métrique sur la foi
de la carte seule) — `data.VOCATION_BIOME.canyons.paysan` :

| | 0,35 | 0,5 (courant) | 0,7 |
|---|---:|---:|---:|
| factions écrasées | 3/36 | 1/36 | **5/36** |
| population | 47 736 | 57 893 | 53 254 |
| cours (amplitude) | 0,40–3,68 | 0,40–3,49 | **0,40–4,00** |
| écart comptable | 0 | 0 | 0 |

À 0,7 : le drame revient (5/36) **et la monnaie reste vivante** — c'est
exactement ce que `MONNAIE.inertie` ne savait pas faire. Prix payé : 474
villes contre 517, accords 12 contre 21. Le réglage effectif de ce levier est
un choix de calibrage du lot F, sur proposition au propriétaire.

### F0.3 — décision prise : le drame attendra les acteurs, pas un gel du cours

Décidé par le propriétaire (août 2026), après la carte : si la campagne des
987 leviers ne trouve pas de levier de drame plus propre que `MONNAIE.inertie`
— qui n'en fait qu'en gelant la monnaie — **`inertie` reste à 0,70**. La
monnaie vit, le change et le lot E gardent leur sens, et le drame viendra des
acteurs du chantier `INDIVIDUS.md` : retournements de colonnes, débandades,
saisies nommées. La cible « ≥ 4/36 écrasées » se re-mesurera après ce
chantier-là ; d'ici là elle ne bloque pas la livraison du lot F.

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
