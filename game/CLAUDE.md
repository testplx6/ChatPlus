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
| `METHODE.md` | comment on travaille ici — chaque règle avec l'incident qui l'a écrite ; **§11 la lenteur** : les règles de la chasse d'août 2026, plus celles de septembre (optimiser sur le chemin que la garde mesure ; un instrument plus bruité que le gain cherché ne cherche rien) ; **§12 la mesure ment aussi** : une somme d'unités hétérogènes n'est pas une mesure, et un invariant vert est une information |
| `CHANTIER.md` | la file de tâches du chantier économie — livré, gardé pour ses mesures et ses leviers |
| `RECETTES.md` | les opérations récurrentes, pas à pas, avec leurs pièges |
| `ECONOMIE.md` | le cahier des charges du chantier économie |
| `MAILLE.md` | l'invariance à la maille — **livré** : les cinq grandeurs sont sous le plancher de bruit |
| `INDIVIDUS.md` | **livré** : les individus sans payer le prix de Dwarf Fortress, six lots sur six |
| `FACTIONS-NEUVES.md` | naissance et mort des factions — neuf lots livrés, **puis repris en août 2026** parce que la carte politique ne bougeait pas (zéro extinction, zéro fondation sur six graines). §8 : **la mort marche** — la règle d'extinction était écrite mais inatteignable, `tickDirigeant` couronnant un chef neuf à partir de rien à perpétuité ; et le revenant découvert dans la foulée (une faction ressuscitée par la sécession d'une de ses villes restait marquée morte). §8.3 : **la naissance aussi** — les motifs de sécession sont devenus de la DONNÉE (`MOTIFS_SECESSION` : solde, ambition, éloignement, victoire, naufrage), sur la règle du propriétaire « autant de raisons de fonder sa faction que de façons de simuler le monde » ; le banc a corrigé la conception (à un motif suffisant : 103 drapeaux et une monnaie à 106 — **il faut plus d'une raison**, seuil 1,5) ; livré à 11 pays nés et 9 éteints, villes 370 → 361, invariant à zéro, ×1,027 de tick. §8.4 : les quatre sondes tombées tenaient toutes un référentiel figé aux sept d'origine |
| `CHANTIER.md` §Lot E | la monnaie du joueur — **E1 à E6 faits**, sauf trois prérogatives bloquées par le cahier des charges |
| `CARTOGRAPHIE.md` | ce que chaque constante commande — produit par la mesure, à lire avant de régler |
| `CIBLES.json` | les gardes du monde vérifiées par `verifier --complet` |
| `INTERFACE.md` | le chantier de ce que le joueur voit — montrer, pas inventer |
| `HISTOIRE.md` | le chantier du récit — l'histoire sort de la simulation, jamais l'inverse |
| `MULTIJOUEUR.md` | l'étude multijoueur — trois architectures, sept modes, décisions au propriétaire |
| `TECHNOLOGIE.md` | l'arbre technologique et le départ nu — **reporté** : d'abord les mécaniques et les bâtiments, l'arbre les coiffera |
| `SIEGE.md` | le camp qui se défend — **livré**, quatre lots sur quatre |
| `BATIMENTS.md` | cinq bâtiments nouveaux — **livré**, cinq sur cinq, amendé sur avis de game master |
| `REVUE.md` | la revue de game master du jeu entier — verdicts, top 5, exploits, ordre des chantiers proposé |
| `PROMESSES.md` | le chantier de couture — **livré**, six lots sur six (deux dettes consignées dans ses Blocages) |
| `MARECHAL.md` | le sommet de la voie du service — **livré, huit lots sur huit** : dyarchie, rappel, levée dimensionnée (+E10), but nommé, place à tenir, frictions de la cour, couronne (une trouvaille consignée dans ses Blocages : l'investissement du conseil quasi mort) |
| `ALLURE.md` | l'étude « AAA textuel » — diagnostic, direction artistique ; **Q1–Q7, M1–M6, G1 et la refonte direction A livrés** (carte-écran et sa feuille, galerie de portraits, dock d'ordres — choisie sur maquettes par le propriétaire, limites dites dans « L'avancement »), G2–G3 en attente |
| `AUDIT.md` | l'audit doctrinal (14 écarts, 3 vagues) **+ la revue au prisme « simulation, pas punition »** (août 2026) : sept corrections livrées (E3, S2, S3, S4, S6, M4, F2), deux fonds au propriétaire (S1 l'oubli à heure fixe, S5 l'omniscience) — plus aucun multiplicateur dirigé contre le joueur |
| `MEMOIRE.md` | le chantier « la mémoire a des porteurs » (S1+S5+E12) — **livré, cinq lots sur cinq** : les nouvelles ont des jambes, le registre des faits (seule porte vers la réputation), « pas vu, pas su », l'érosion est morte, et la mémoire appartient au souvenant (la vue matérialisée, la succession qui repèse, l'oubli au conseil, les notables qui jugent sur ce qu'ils ont vu ici) ; S1 et S5 de l'audit soldés ; deux trouvailles dans ses Blocages (la voie du service quasi morte AVANT le chantier — instruite au banc, profils CARRIERE et ASSIDU, décision au propriétaire ; le temps de rachat du pillard — chiffré, dette soldée, cible 2 tenue) |
| `INVESTISSEMENT.md` | le cahier de la réforme de l'investissement des conseils (trouvaille MARECHAL) — **ouvert**, une décision A/B/C au propriétaire, rien ne se code avant |
| `IMPLANTATIONS.md` | plusieurs bases et villes — **ouvert, trois décisions prises** : le choix de ce qu'on fait d'une ville battue (piller, prendre les hommes, donner à son drapeau, garder), un pays du joueur vivant, autant de camps qu'on veut ; quatre marches ; **le raid de M1 est jouable** (« Coup de main » sous la ville où l'on se tient : butin borné par le portage, la place garde son drapeau, le registre des faits s'en souvient) ; **le siège aussi** (ordre `siege` : la garde d'en face s'use, elle rend les coups, six vétérans pèsent une colonne levée — `SIEGE.parHomme`) ; **et la chute** (S2+M2 : livrer la place au drapeau qu'on sert, ou la raser — « pour soi » attend un drapeau à soi) ; **et la manière d'assiéger** (S3 : investir, affamer, couper les routes — trois prix différents ; le blocage de la veille est levé par la décision du propriétaire, et le monde reste identique au témoin parce que rien ne coupe tant que personne ne le décide). **M1c complet** ; **M3 : vos couleurs sont plantables** (`fonderDrapeau` — aucune condition, la reconnaissance est émergente ; on n'emporte que ce qui est sur place, trésor nul ; une place prise se garde enfin). **et le pays est vivant** : c'est vous qui le tenez, votre légitimité se ronge si vos villes grondent, et à bout on vous écarte de la maison que vous avez fondée — le pays continue sans vous. **M3 livré** ; reste M4 (plusieurs camps) |
| `PACTES.md` | les pactes entre drapeaux — **P1, P2 et P3 livrés** : les pactes existent, les deux clauses qui comptent mordent, et **les conseils se lient d'eux-mêmes** (le menacé demande le secours, le tranquille demande la paix ; jamais avec qui l'on affronte, jamais deux fois la même paire, et rien entre gens qui se haïssent). Le monde y gagne — 371 villes debout contre 361, moins de guerres, invariant à zéro — pour 14 % de tick, budget rouvert par le propriétaire. La « masse monétaire qui quadruple » qui l'avait bloqué trois jours était un **artefact de mesure** (METHODE §12). Reste : les clauses `passage` et `vue`, signables mais muettes |
| `PISTES.md` | des idées consignées, pas des chantiers — rien n'y est engagé |
| `README.md` | le projet, les tests, l'architecture |

## Commits

Message en français : une ligne de titre qui raconte, un corps qui dit le
pourquoi et les chiffres (avant → après, avec témoin). Regarde `git log` pour le
ton. Jamais de nom de modèle ni de mention d'outil dans le message. Ne committe
jamais si `verifier` est rouge ; ne pousse jamais sans `--complet` vert. Branche
de travail : celle indiquée par la session, jamais une autre.

## Ce qu'on ne fait pas

- **Poser une règle d'équilibrage sur le joueur.** C'est un **moteur de
  simulation** : une stratégie dégénérée se ferme en rendant les agents plus
  vrais — ce qu'ils savent, ce qu'ils veulent, ce qu'ils peuvent — jamais par
  une taxe, un malus dirigé ou une règle qui ne vise que le joueur. Dit par le
  propriétaire, août 2026 : « le voleur prend tout ce qu'il peut trouver et
  emporter », « les pillards vont là où ils pensent avoir du butin raisonnable
  par rapport à leur risque, c'est à eux de voir », « c'est une simulation, ce
  n'est pas moi qui décide », « le but est de créer une simulation, pas de
  faire un truc injouable ». Avant d'écrire une règle, demander : *quel agent
  la porte, et que sait-il ?* — et les quatre odeurs de la revue d'août 2026
  (AUDIT.md §prisme) : un multiplicateur sans agent, un minuteur vécu comme
  une taxe, une règle qui ne vise que le joueur, une friction sans contre-jeu.
- Coder un mécanisme de jeu non décrit dans le cahier des charges du chantier.
- Choisir une constante sans balayage au banc (`--balaye`), ni la poser en
  `export const` scalaire si elle est calibrable — objet mutable exporté.
- Élargir une fourchette de `CIBLES.json` ou un critère de `CHANTIER.md` pour
  faire passer une mesure : c'est un blocage à remonter, pas un réglage.
- Toucher à `dist/` à la main, publier l'artefact, créer une PR sans demande.
