# game/ — Cendres & Protocole

Simulation textuelle déterministe. Moteur JS pur (ESM, zéro dépendance), état
JSON, une interface mobile-first. **Tout est en français** : interface, journal,
commentaires, messages de commit.

## Les commandes — il n'y en a pas d'autres

```
node tools/verifier.js             # vérifie tout : à lancer avant CHAQUE commit
node tools/verifier.js --complet   # + vitesse calibrée, navigateur, gardes monde — avant de pousser
node tools/banc.js --temoin <rev>  # mesurer le monde contre une révision
node tools/banc.js --balaye economy.CAISSE.marge=0.06,0.10   # calibrer une constante
node tools/banc.js --cartographie  # quel levier commande quoi -> CARTOGRAPHIE.md
node tools/banc.js --maille        # ce que le niveau de détail fait à une ville
node tools/banc.js --profil        # où part le temps
node tools/banc.js --sauve m.json  # un monde joué d'avance, pour regarder l'UI
node tools/bundle.js               # reconstruire dist/ (fait par verifier)
```

N'écris **jamais** un script de mesure à côté : toute métrique nouvelle s'ajoute
à `jouer()` dans `tools/banc.js`, et tout le monde en profite.

## Le cycle de travail — obligatoire, sans exception

1. Prends **une** tâche dans `CHANTIER.md` (la première non cochée dont les
   dépendances sont cochées). Une tâche à la fois.
2. Écris d'abord le test qui échoue (dans `test/headless.js`, section du
   chantier). Vérifie qu'il est **rouge**. Un test né vert ne prouve rien.
3. Code le minimum qui le rend vert. Suis la recette correspondante dans
   `RECETTES.md` — elles existent parce que chaque écart a déjà coûté cher.
4. `node tools/verifier.js` → vert, sinon corrige avant tout le reste.
5. Coche la tâche dans `CHANTIER.md`, committe (voir format plus bas), continue.

**Si tu es bloqué, si le critère est ambigu, ou si une mesure sort des
fourchettes de la tâche : STOP.** Écris ce qui bloque dans la section
« Blocages » de `CHANTIER.md`, committe, et arrête-toi là. N'improvise jamais
une règle de jeu, une constante ou une exception — c'est le travail de
quelqu'un d'autre.

## Les cinq pièges qui ont déjà tué

1. **Jamais un tirage de plus** (`rng.*`) dans la création du monde ou au milieu
   d'une séquence existante : tous les tirages suivants se décalent et le monde
   entier change à graine égale. Dérive les valeurs nouvelles de ce qui est déjà
   tiré (pop, taille…).
2. **Toute clé nouvelle dans l'état** passe par `normaliser` (`src/save.js`)
   avec une valeur pour les parties déjà commencées, sinon les vieilles
   sauvegardes cassent.
3. **Un module nouveau** s'ajoute à `MODULES` dans `tools/bundle.js`, dans
   l'ordre des dépendances — sinon il n'existe pas dans le jeu livré.
4. **Un bâtiment nouveau** s'ajoute à une famille de `FAMILLES` (`src/ui.js`),
   sinon il est invisible donc inconstructible.
5. **`state.world` est partagé, `state.player`/`state.base` sont privés.**
   Aucun calcul du monde ne lit le joueur. Le moteur ne touche jamais au DOM
   (seuls `ui.js` et `main.js` y ont droit), jamais à `Date.now()` ni
   `Math.random()` — le hasard passe par `Rng`, scellé dans la sauvegarde.

`tools/verifier.js` en attrape une partie mécaniquement, pas tout.

## Où lire quoi

| fichier | quoi |
|---|---|
| `METHODE.md` | comment on travaille ici — chaque règle avec l'incident qui l'a écrite |
| `CHANTIER.md` | la file de tâches du chantier économie — livré, gardé pour ses mesures et ses leviers |
| `RECETTES.md` | les opérations récurrentes, pas à pas, avec leurs pièges |
| `ECONOMIE.md` | le cahier des charges du chantier économie |
| `MAILLE.md` | l'invariance à la maille — M0, M0 bis et M4 faits, M2/M3 en attente d'un instrument |
| `INDIVIDUS.md` | **livré** : les individus sans payer le prix de Dwarf Fortress, six lots sur six |
| `FACTIONS-NEUVES.md` | **livré** : naissance et mort des factions — les cinq règles sont tranchées |
| `CHANTIER.md` §Lot E | **le chantier en cours** : la monnaie du joueur — E1 à E3 faits, E4 à E6 restants |
| `CARTOGRAPHIE.md` | ce que chaque constante commande — produit par la mesure, à lire avant de régler |
| `CIBLES.json` | les gardes du monde vérifiées par `verifier --complet` |
| `PISTES.md` | des idées consignées, pas des chantiers — rien n'y est engagé |
| `README.md` | le projet, les tests, l'architecture |

## Commits

Message en français : une ligne de titre qui raconte, un corps qui dit le
pourquoi et les chiffres (avant → après, avec témoin). Regarde `git log` pour le
ton. Jamais de nom de modèle ni de mention d'outil dans le message. Ne committe
jamais si `verifier` est rouge ; ne pousse jamais sans `--complet` vert. Branche
de travail : celle indiquée par la session, jamais une autre.

## Ce qu'on ne fait pas

- Coder un mécanisme de jeu non décrit dans le cahier des charges du chantier.
- Choisir une constante sans balayage au banc (`--balaye`), ni la poser en
  `export const` scalaire si elle est calibrable — objet mutable exporté.
- Élargir une fourchette de `CIBLES.json` ou un critère de `CHANTIER.md` pour
  faire passer une mesure : c'est un blocage à remonter, pas un réglage.
- Toucher à `dist/` à la main, publier l'artefact, créer une PR sans demande.
