# Recettes — les opérations récurrentes, pas à pas

Chaque recette encode des pièges déjà payés (incidents dans `METHODE.md`). Les
suivre à la lettre ; si une étape ne colle pas au cas présent, c'est un blocage
à remonter, pas une adaptation à improviser.

---

## R1 — Ajouter un champ à l'état

1. Le poser **partout où l'objet se crée** : villes → `src/world.js` (création
   initiale) **et** `src/factions.js` (`fonderColonie`) **et** `src/base.js`
   (avant-poste) ; factions → `src/world.js`.
2. **Aucun tirage nouveau.** Dériver la valeur de ce qui est déjà tiré
   (`pop`, `taille`…). Un `rng.*` de plus décale tous les tirages suivants et
   le monde entier change à graine égale.
3. Le rattraper dans `normaliser` (`src/save.js`) : `if (x.champ === undefined)
   x.champ = <valeur pour une partie déjà en cours>;` — avec un commentaire qui
   dit pourquoi cette valeur-là.
4. Test : une partie neuve a le champ ; un état privé du champ passé par
   `normaliser` le retrouve ; l'aller-retour JSON est exact.

## R2 — Ajouter une constante calibrable

1. La loger dans un **objet exporté mutable** — `export const CAISSE = { marge:
   0.10 }` — jamais en `export const MARGE = 0.10` : ce qui ne se balaye pas
   finit choisi à vue.
2. La calibrer : `node tools/banc.js --balaye module.OBJET.champ=v1,v2,v3`
   (6 graines par défaut ; 3 graines = du bruit).
3. Coller le tableau du balayage **dans le commentaire de la constante**, avec
   la valeur témoin. Une constante sans sa mesure est une opinion.

## R3 — Ajouter un mécanisme au tick

1. Choisir l'étage : par-ville → `tickColonie` (`src/economy.js`), reçoit `dt`
   en heures — multiplier les flux par `dt`, convertir les probabilités par
   `surDt`, jamais `p * dt` ; par-faction → `conseil` (`src/factions.js`),
   cadence irrégulière (30-90 h) ; global → `tick` (`src/sim.js`), chaque tick.
2. Mesurer le monde avant : `node tools/banc.js --temoin HEAD`.
3. Coder. Aucune allocation dans les chemins par-tick si évitable (le budget
   est 110 µs pour tout le monde).
4. Mesurer après, contre le même témoin : dire ce qui bouge et pourquoi. Si la
   vitesse plonge : `node tools/banc.js --profil` avant de soupçonner qui que
   ce soit.

## R4 — Ajouter un module dans src/

1. Créer le fichier, en-tête de commentaire qui dit son office.
2. L'ajouter à `MODULES` dans `tools/bundle.js`, **après** ses dépendances.
3. Moteur : pas de DOM, pas de `Date.now`, pas de `Math.random` —
   `tools/verifier.js` le vérifie mécaniquement.

## R5 — Ajouter un bâtiment ou une recherche

1. `BUILDINGS`/`RESEARCH` dans `src/data.js` : coûts, niveaux, description
   française.
2. **L'ajouter à une famille de `FAMILLES`** (`src/ui.js`) — sinon il est
   invisible donc inconstructible, et aucun test de moteur ne le voit.
3. S'il produit/consomme : brancher dans `tickBase` (`src/base.js`).
4. Le test des cartes affichées (headless, section UI) compare `FAMILLES` à
   `BUILDINGS` : vérifier qu'il passe, il existe précisément pour ça.

## R6 — Ajouter un écran ou un panneau

1. Le HTML se fabrique dans `src/ui.js` ; toute action est un
   `data-a="nom"` + une entrée `ACTIONS` — le bundler vérifie l'appariement.
2. Les panneaux repliables : titre en `h2.titre` dans `.panneau.pliable`, et un
   `.resume` pour la barre repliée (les clés de repli suivent `cleSection` —
   rien d'instable dans le titre, sinon le repli saute à chaque tick).
3. Ne jamais reconstruire un conteneur dont l'utilisateur lit le contenu :
   comparer l'HTML avant de réassigner (`dernierHtml`), préserver `.boite` des
   modales et l'ancre de défilement.
4. Pour regarder le rendu sans jouer : `node tools/banc.js --sauve m.json
   --horizon 6000`, puis charger `m.json` via l'écran de reprise.
5. Test navigateur (`test/navigateur.js`) : au minimum, l'écran s'ouvre sans
   erreur console et les boutons neufs répondent.

## R7 — Écrire un test qui prouve

1. Le test naît **rouge** : l'exécuter avant le correctif. Un test né vert ne
   prouve rien.
2. Après le correctif : **réintroduire la faute** un instant — le test doit
   redevenir rouge, sinon il ne teste pas la faute.
3. N'interroger que des valeurs qui existent (`temperament === 'marchand'` a
   dormi vert pendant des mois : ce tempérament n'existait pas).
4. Fixer la graine et l'instant ; jamais de dépendance à l'heure réelle.

## R8 — Calibrer, comparer, chiffrer

1. Toute affirmation chiffrée passe par le banc : `--temoin <rev>` pour le
   point de comparaison — jamais de stash, jamais de mesure sans témoin.
2. Six graines minimum ; lire la médiane autant que les extrêmes ; une
   différence plus petite que le rebond inter-graines (≈ ±5 %) n'est pas une
   différence.
3. La vitesse officielle : `node tools/verifier.js --complet` (5 passes,
   médiane, garde d'instabilité). Jamais une passe unique, jamais pendant que
   d'autres processus tournent.

## R9 — Toucher aux caravanes, aux prix ou aux stocks

1. Ces chemins tournent des milliers de fois par partie : mesurer avant/après
   (`--temoin HEAD`) est obligatoire, même pour « une petite condition ».
2. Tout mouvement d'argent d'une ville passe par `encaisser`/`debourser`
   (`src/economy.js`) — un crédit direct sur `caisse` ou `tresor` échappe à
   l'impôt et fausse la comptabilité sans bruit.
3. Si le changement modifie *qui* commerce ou *combien* : vérifier les gardes
   (`verifier --complet`) et regarder « nourries » autant que « villes » — un
   taux dont le dénominateur bouge ne dit rien.
