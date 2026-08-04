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

- [ ] **A2. Les salaires** (`caisse → menages`). Dans `tickColonie`, chaque
  heure : `salaires = min(caisse, valeurProduction × CAISSE.partSalariale × dt)`.
  `partSalariale` dans l'objet `CAISSE` (R2), départ 0,55, balayage au lot A6.
  Salaires impayés (caisse à sec) : `unrest += CAISSE.grogneImpayes × dt` (même
  objet). Critère : test « une ville qui produit paie ses gens », test « caisse
  vide → grogne monte », verifier vert.

- [ ] **A3. La consommation solvable** (`menages → caisse`). La ville ne sert
  que ce que les ménages peuvent payer : plafonner la consommation servie par
  `menages / prix`, y compris la satiété — du grain plein et des gens sans le
  sou doit produire une satiété < 1 (la famine de 1846, ECONOMIE §3.2).
  L'argent servi retourne dans `caisse` via `encaisser` (R9 : jamais en
  direct). Critère : test « stock plein + ménages vides → satiété < 1 »,
  test « la boucle salaires→consommation conserve l'argent au centime »,
  verifier vert.

- [ ] **A4. La garnison et les travaux se paient** (`tresor → menages`).
  Au conseil, chaque ville tenue coûte à sa faction :
  `(defense × ECONOMIE_FACTION.parDefense + murs × ECONOMIE_FACTION.parMur) ×
  heures écoulées`, versé aux ménages de la ville (c'est un revenu local). Une
  faction qui ne peut pas payer voit `defense` s'éroder (les gardes partent).
  Objet balayable neuf `ECONOMIE_FACTION` dans `src/factions.js`. Critère :
  test « tenir coûte », test « trésor vide → la défense s'érode », verifier
  vert.

- [ ] **A5. La solde des colonnes** (`tresor → menages` de la ville de départ,
  par conseil, tant que l'armée existe). Une guerre longue vide un trésor —
  c'est ce qui rend une faction abattable (ECONOMIE §1.2). Critère : test
  « une colonne en campagne coûte par heure », et au banc : les guerres
  longues appauvrissent (vérifier à la main sur une graine, chiffres dans le
  commit). Verifier vert.

- [ ] **A6. Calibrage du lot.** Balayer `CAISSE.partSalariale`,
  `ECONOMIE_FACTION.parDefense/.parMur`, la solde (R8). Fourchettes à
  atteindre (ECONOMIE §13 + lot A attendu) : trésor méd **30 000–120 000** ;
  écrasées **≥ 4/36** (le drame revient) ; villes **≥ 380** ; pop **≥ 95 000**
  (elle ne remonte qu'au lot B) ; tick < 110 µs (verifier --complet).
  Tableaux dans les commentaires des constantes. Hors fourchette après
  balayage honnête → Blocages.

- [ ] **A7. Livraison du lot.** Resserrer `CIBLES.json` sur l'état mesuré ;
  mettre à jour ECONOMIE §1.2 (la colonne « après lot A ») ; verifier
  --complet vert ; commit de synthèse avec le tableau avant/après.

## Lot B — le crédit et le taux directeur (ECONOMIE §4.4, §6)

- [ ] **B1. La loi `directeur`.** Quatre paliers (1/2/4/7 % par conseil) dans
  `src/lois.js` à côté d'`IMPOTS` ; défaut par tempérament du dirigeant ;
  `normaliser`. Critère : test « chaque faction a un taux », « le tempérament
  décide du palier initial ».
- [ ] **B2. La dette.** `col.dette`, `col.creancier`, `col.cession` (R1, zéro
  tirage). Emprunt automatique quand une ville ne peut pas payer ses rations :
  le créancier initial est sa faction, qui refuse selon ECONOMIE §6.1 (trésor
  vide, insolvable sans raison de garder, étranger désintéressé). Refus =
  événement journalisé. Critère : test « une ville affamée et pauvre emprunte »,
  « un refus s'inscrit au journal », invariant : la somme prêtée sort bien du
  trésor.
- [ ] **B3. Intérêt et remboursement.** Au conseil : `dette × taux du
  créancier` s'ajoute ; la remontée des caisses rembourse **avant** le trésor ;
  l'intérêt encaissé est une recette du créancier. Critère : tests dédiés + la
  boucle comptable reste exacte.
- [ ] **B4. L'insolvabilité et la décision du créancier** (ECONOMIE §6.4 — pas
  de plafond, pas de durée : l'état se calcule, le défaut se décide). Les trois
  issues pour la propre faction ; l'issue étrangère attend le lot D. Critère :
  test « insolvable = intérêt > surplus », test « sa faction prête à perte
  plutôt que laisser tomber, tant qu'elle peut », test défaut : dette annulée,
  unrest +0,25, journal.
- [ ] **B5. L'emprunt pour travaux** (taux bas → une ville emprunte pour murs
  et marché si l'ouvrage rapporte plus que l'intérêt — comparaison, pas
  seuil). Critère : test comparatif deux taux → deux comportements.
- [ ] **B6. Calibrage + livraison.** Fourchettes : pop **≥ 130 000** ; villes
  sous 0,2 ration/tête **< 25 %** ; les quatre paliers de taux utilisés
  (aucun < 8 % des conseils, ECONOMIE §13) ; trésor méd stable
  [30 000–120 000] ; tick < 110. CIBLES.json resserré, ECONOMIE §1.2 mis à
  jour, verifier --complet.

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

### A3 — la porte de solvabilité ne peut pas tenir seule (bloquant pour tout le lot)

**Ce qui bloque.** ECONOMIE §3.2 demande qu'une population sans argent ne
consomme pas, satiété comprise : « du grain plein et des gens sans le sou doit
produire une satiété < 1 ». Écrit tel quel, avec le reste du circuit (A2, A4,
A5), **le monde ne tient à aucun réglage**. Ce n'est pas un calibrage manqué,
c'est la conception du §3 qui manque une pièce.

**Ce qui a été fait, puis retiré.** A2 (salaires), A3 (consommation solvable),
A4 (garnisons et murs payés par le trésor), A5 (solde des colonnes), plus la
conversion en virements de toutes les destructions de monnaie du trésor — lever
une colonne, monter un mur, fonder. Le code marchait, la suite passait à
1016/1016. Il a été retiré du moteur : ce qu'il a appris est ci-dessous.

**Les mesures** (3 graines × 6 000 h ; témoin `82636d8` : 180 villes,
69 313 habitants, trésor médian 51 944, 6/18 fauchées).

Balayage de la part salariale, porte fermée :

| part | villes | pop | trésor méd | fauchées | caisses / ménages / trésors |
|---:|---:|---:|---:|---:|---|
| 0,05 | 265 | 15 822 | 79 344 | 0/18 | 227k / 108k / 1385k |
| 0,20 | 252 | **26 895** | 65 483 | 1/18 | 310k / 404k / 995k |
| 0,38 | 162 | 32 997 | 282 | 15/18 | 100k / 1095k / 41k |
| 0,55 | 95 | 37 173 | 339 | 17/18 | 18k / 588k / 11k |
| 0,98 | 149 | 10 155 | 112 | 14/18 | — |

Deux régimes, aucun viable. **Au-dessus de 0,3**, les ménages thésaurisent —
jusqu'à 93 % de la monnaie du monde immobilisée dans leurs poches, 317 000
crédits sur 341 000 — et les caisses se vident en salaires sans jamais rien
encaisser. **En dessous**, caisses et trésors tiennent, mais les habitants n'ont
pas de quoi manger. La population plafonne à 27 000 contre 69 000 au témoin.

Et la porte ouverte (`gateSolvabilite = 0`, tout le reste identique) ne sauve
rien non plus : 163 villes, **52 809 habitants**, mais trésor médian 459 et
13/18 factions fauchées. On échange une famine contre des États en faillite.

**Le comptage des flux** (1 graine × 3 000 h) dit pourquoi :

```
salaires dus        6 091 476        facture voulue      4 734 750
salaires versés     3 721 921        facture réglée      3 669 492
versements du trésor  275 349
```

Les ménages encaissent structurellement plus qu'ils ne dépensent : leur sortie
est bornée par la marchandise disponible, leur entrée ne l'est pas. L'excédent
est exactement ce que le trésor leur verse.

**La cause, en une phrase.** Le prix ne répond qu'au stock, jamais à la monnaie
disponible. Un marché à prix exogène sous contrainte de budget se solde par du
gâchis ou par la famine — il n'a pas d'équilibre. Facturer au prix du jour
plutôt qu'au prix du catalogue (fait, `prixUnitaire`) atténue sans résoudre : le
prix plafonne à ×3,2 et ne baisse jamais quand la demande faiblit.

**Ce qu'il faudrait décider** — et c'est une décision de conception, pas
d'exécution : le prix d'une ville doit dépendre de la monnaie en circulation
chez elle, pas seulement de son stock. C'est la théorie quantitative de la
monnaie, et c'est très exactement ce que le lot C fait à l'échelle d'un pays
avec `cours = gage / masse`. La question est donc : **avance-t-on le mécanisme
de cours au niveau de la ville, et le lot C n'en devient-il pas un cas
particulier ?**

Tant que ce n'est pas tranché, A3 à A7 restent fermés, et A1 seul est livré.

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
