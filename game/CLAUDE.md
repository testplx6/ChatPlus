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
| `PROMESSES.md` | le chantier de couture — **livré**, six lots sur six, et ses deux dettes soldées. La dernière (septembre 2026) a rendu un défaut : « les colporteurs repartis chargés » de P6 ne comptait que **leurs passages**, si bien qu'un camp qui charge les mules à ras bord valait le même coup qu'un camp qui les renvoie à vide. `base.charges` (charges datées, patron `rachatsFaits`) et `RAID_JAUGE.parCharge` branchent enfin la richesse visible ; la mesure de pression des raids vit dans `test/equilibre.js` — le seul banc qui ait un camp à piller — avec son interrupteur `JAUGE=` |
| `MARECHAL.md` | le sommet de la voie du service — **livré, huit lots sur huit** : dyarchie, rappel, levée dimensionnée (+E10), but nommé, place à tenir, frictions de la cour, couronne (une trouvaille consignée dans ses Blocages : l'investissement du conseil quasi mort) |
| `ALLURE.md` | l'étude « AAA textuel » — diagnostic, direction artistique ; **Q1–Q7, M1–M6, G1 et la refonte direction A livrés** (carte-écran et sa feuille, galerie de portraits, dock d'ordres — choisie sur maquettes par le propriétaire, limites dites dans « L'avancement »), G2–G3 en attente |
| `AUDIT.md` | l'audit doctrinal (14 écarts, 3 vagues) **+ la revue au prisme « simulation, pas punition »** (août 2026) : sept corrections livrées (E3, S2, S3, S4, S6, M4, F2), deux fonds au propriétaire (S1 l'oubli à heure fixe, S5 l'omniscience) — plus aucun multiplicateur dirigé contre le joueur |
| `MEMOIRE.md` | le chantier « la mémoire a des porteurs » (S1+S5+E12) — **livré, cinq lots sur cinq** : les nouvelles ont des jambes, le registre des faits (seule porte vers la réputation), « pas vu, pas su », l'érosion est morte, et la mémoire appartient au souvenant (la vue matérialisée, la succession qui repèse, l'oubli au conseil, les notables qui jugent sur ce qu'ils ont vu ici) ; S1 et S5 de l'audit soldés ; ses Blocages sont soldés — **la voie du service n'était pas morte, le banc s'arrêtait trop tôt** : à 4 000 h (166 jours) un seul drapeau sur six est à portée du bot le plus dévoué, à 16 000 h cinq sur six et le Maréchal existe (3 sur 20 parties). Le propriétaire l'a dit en jouant : « je fais rien de spécial, ça monte tout seul » — sa partie dépasse 750 jours. Aucun réglage touché ; le banc, lui, plantait au-delà de 4 000 h sur un référentiel figé aux sept drapeaux d'origine, ce qui est la cause première du dossier. **Toute question de progression se mesure désormais à 16 000 h** ( le temps de rachat du pillard — chiffré, dette soldée, cible 2 tenue) |
| `INVESTISSEMENT.md` | la réforme de l'investissement des conseils (trouvaille MARECHAL) — **livrée** : décision du propriétaire « à lui de voir, avec ce qu'il possède, ce qu'il emprunte », donc `veutBatir` ne dit plus que le **besoin** et `financerMur` dit avec quel argent — comptant, à crédit, ou rien. Le conseil ne teste plus une capacité qu'il venait lui-même d'annuler en remontant les caisses : **37 → 379 chantiers**, 10,17 murs par ville, et fortifier a enfin un coût d'opportunité (29 villes de moins, trésor médian ÷2, invariant exact, dix gardes tenues). Ce que la mesure a appris : la voie du crédit est vraie mais presque déserte (2 murs sur 379) — un pays ne s'emprunte pas à lui-même ce qu'il n'a pas ; le prêteur tiers est consigné dans `PISTES.md` |
| `IMPLANTATIONS.md` | plusieurs bases et villes — **M1 (raid), M1c (siège, chute, manières), M2 (livrer la place), M3 (drapeau + pays vivant) et M4a/M4b (plusieurs camps) livrés**. Les camps : `state.camps` porte la liste, `state.campActif` dit lequel on habite, et `state.base` reste une **référence** sur celui-là — les 136 lectures n'ont pas été réécrites. Le camp qu'on quitte continue de vivre (`tickCamps`), la sauvegarde ne le dédouble pas au rechargement, une partie d'avant migre sans rien perdre, et l'écran porte « Vos camps » avec « Planter un camp de plus, ici ». **M4 complet** : chaque camp ouvre les yeux sur la carte, abrite les siens et fait travailler son maître de maison (`auCamp`), et le sélecteur dit de chacun ce qui décide d'y retourner. **M4e** : le savoir du sac (`escouade` — viser, voir, recoudre, porter) suit les gens et vaut au meilleur niveau partout ; le savoir de la maison (`camp` — four, bacs, comptoir) reste où il est bâti, et ne circule que par la recherche **Transmission du savoir**, un cinquième par niveau |
| `PACTES.md` | les pactes entre drapeaux — **chantier complet** : P1 (les pactes existent), P2 (les clauses mordent), P3 (**les conseils se lient d'eux-mêmes** — le menacé demande le secours, le tranquille la paix ; jamais avec qui l'on affronte, rien entre gens qui se haïssent), et les **cinq clauses câblées** : ne pas s'attaquer, se porter secours, faire la guerre ensemble, `passage` (le péage s'ouvre — `laissePasser`) et `vue` (les villes de l'allié entrent au carnet). Le monde gagne 371 villes debout contre 361 et perd trois guerres, pour 14 % de tick — budget rouvert par le propriétaire, motif dans `CIBLES.json`. La « masse monétaire qui quadruple » qui l'avait bloqué trois jours était un **artefact de mesure** (METHODE §12) |
| `PARTIE-LONGUE.md` | ce que le banc montre quand on le laisse jouer aussi longtemps que le propriétaire (16 000 h). **Les trois relevés sont instruits, et les trois accusaient l'instrument** — le troisième : « une partie sur vingt finit à cent vingt-trois millions » était une monnaie effondrée, pas une fortune (facteur 1 850 entre le nominal et l'ancien crédit chez le plus riche ; médiane 42 016 unités pour 5 471 de valeur réelle), et l'invariant reste exact. Ce qui en sort pour le jeu : garder ses gains dans une monnaie qui s'effondre est une perte silencieuse, et le contre-jeu est de changer ou de tenir de la marchandise. Les deux premiers : le jeu fabrique très bien des vétérans (un bot qui s'entraîne vraiment mène ses anciens de 16,7 à **50,9** de compétence brute, contre 21,7 sans, et « mort en route » tombe de 70 à 14 — l'arbitrage étant réel : le patrimoine moyen passe de 246 747 à 23 455, les vétérans ou la fortune) ; et la monnaie qui dort a son contre-jeu — vendre sur place paie dans la monnaie d'ici, ce que le bot ne faisait pas. L'invariant comptable est exact à cet horizon, joueur compris. Trois choses interrogent, et dans les trois cas il reste à établir si c'est le jeu ou le bot : le bot ne s'entraîne **jamais** (2 % des tours, 0 % avec un camp — il y renonce pour la faim dans 74 % des cas, et son plafond n'y est pour rien), la moitié de sa fortune dort dans une monnaie qui n'a pas cours (3 307 achats refusés pour 67 passages au bureau), et une partie sur vingt finit à cent vingt-trois millions |
| `TERRITOIRE.md` | s'approprier une case, et y gagner quelque chose — **instruit, rien d'engagé** : `controle` est un nom de drapeau qu'aucun agent ne peut contester et qui ne rapporte rien à qui le tient (le péage n'entre dans aucune caisse), tandis que `secteur.js` tient déjà le vrai modèle — la présence fait baisser l'insécurité, et l'état des routes remonte au conseil. Cinq mécanismes d'appropriation et six avantages candidats, cinq décisions au propriétaire. **A5 livré** : une revendication ne survit pas à celui qui la portait — 635 cases orphelines sur 1 434 tenues (44 % du territoire, parfois au nom d'un pays éteint) ramenées à zéro, sans toucher à la règle du premier arrivé. **B1 à moitié livré** : le péage entre enfin dans la caisse de la ville qui tient le barrage (91 barrages, 5 196 unités sur une partie de bot, invariant exact) **B1 complet** : sur décision du propriétaire (« toutes les réponses sont possibles et plus encore »), les convois paient à l'ENTRÉE d'un territoire selon une table ouverte — `REPONSES_BARRAGE` : on laisse passer les siens et ceux qu'un pacte couvre, le joueur paie de sa bourse (monnaie étrangère acceptée au cours), la ville expéditrice règle sur sa caisse, et le barrage se sert dans la cargaison à qui ne peut ni l'un ni l'autre. 2 barrages payés → 16 156 ; trésor médian ×2 ; et les accords doublent, parce que la clause `passage` vaut enfin quelque chose. **A2 livré et mesuré mort côté monde** : une troupe qui reste sur une case libre finit par la tenir (le joueur y compris — c'est la réponse à sa question), mais zéro appropriation par les pays sur six graines, et le balayage 24→168 h ne change pas ce zéro. La cause est de conception, pas de réglage : aucun agent n'a de raison de stationner sur une case vide tant que tenir du terrain ne rapporte rien. **Revue de game master** (sept. 2026, « ça me semble léger comme mécanisme ») : le modèle lui-même est en cause — le territoire est traité comme une SURFACE sur une carte où rien n'est infranchissable, alors que l'objet territorial existe déjà et que c'est **la route** (`damer`/`piste` s'auto-renforcent, 22 % de la carte damée, les 5 % de cases les plus passantes portent 19 % du trafic). Verrou identifié : `chemin` ne coûte que le biome et la piste — aucun voyageur ne pèse ce qu'il craint, donc aucune frontière ne peut déplacer de trafic, donc rien de ce qu'on fera au territoire ne pourra se voir. Trois crans proposés (T1 le voyageur pèse le risque, T2 on tient un ouvrage et non des heures, T3 le trafic est la récompense), T1 recommandé seul et mesuré. **T1 livré** : `chemin` prend un coût de risque (`ROUTE`, insécurité/péage/guerre) que seul demande qui craint — les convois, pas les colonnes en campagne. Le trafic se détourne pour de bon : barrages −27 % puis −35 % sur deux jeux de graines indépendants, et la crainte d'affamer les villes est démentie — la satiété MONTE des deux côtés. Le balayage donne 6 : à 2 le monde mange moins bien, à 12 les convois fuient les mauvaises routes en se jetant sur les terres à péage. **T2 livré** : le poste — un conseil en pose là où la piste dit que le trafic passe, il tient la case sans qu'on y campe, il se paie sur le trésor, et une colonne ennemie qui passe dessus le rase. 207 et 172 postes debout sur deux jeux de graines, contre ZÉRO appropriation au temps passé : c'est ce qui manquait à A2. Cases tenues 763 → 964, barrages +49 % et +61 %. Le balayage refuse de trancher le prix (219/207/245 postes à 400/900/2 500) et montre que la baisse de satiété qu'on croyait voir n'est pas monotone, donc du bruit. Un défaut préexistant trouvé par l'échelle : « la ville règle » ne vérifiait pas qu'il y eût quelqu'un au barrage, et fabriquait de la masse à chaque passage. **T3 livré** : le poste compte ce qui passe, un pays n'en tient qu'un nombre proportionnel à ses villes, et au plafond le conseil ferme celui que personne n'emprunte — 125 et 133 postes debout, 6 414 et 7 346 unités encaissées, et **un tiers d'entre eux ne voit jamais rien passer**, ce qu'aucun conseil ne pouvait savoir avant. Sa livraison a fait tomber la garde `effondrees` (zéro effondrement sur six graines, trois sur douze, et un balayage non monotone — du bruit) : sur décision du propriétaire, **les gardes se mesurent désormais sur douze parties**, les bornes en somme doublées avec l'échantillon, aucune borne changée en densité |
| `GEOGRAPHIE.md` | enrichir le terrain, la carte, le monde physique — **instruit, rien d'engagé**, sur demande du propriétaire (« trouve d'autres façons d'enrichir le terrain, la géographie, la carte »). Le relevé : neuf biomes tous traversables (coût 3 à 7), une génération en Voronoï qui ne produit que des **taches et jamais une ligne**, un monde qui naît sans une seule route entre villes, des cases sans nom (« Friche K5 »), un climat unique pour 432 cases et une richesse scalaire sans gisement. Sept pistes, G1 en tête. **G1 livré** : la Faille, une ligne brisée du nord au sud (coût 40 contre 3 à 7 pour un biome) percée de trois ouvertures, qui contourne les villes au lieu de les avaler et se voit sur la carte. Son dé lui est propre, donc elle n'a décalé aucun tirage : à graine égale, biomes, villes et factions sont restés identiques. Personne ne la force (2 cases damées sur six parties) — le trafic passe par les ouvertures, ce qui est la définition d'un passage obligé. Elle coûte 4 % de population et 0,6 point de satiété, dans le même sens sur deux jeux de graines. **G2 livré** : la Faille et chacun de ses passages portent un nom tiré de deux tables de mots, `nomRegion` le rend, la carte le cerne — « la colonne est passée au Gué des Cendres » au lieu d'une coordonnée. Sa première version tirait les noms sur le dé du tracé et **déplaçait la ligne**, donc le monde, pour six pour cent de tick : un nom ne doit pas déplacer une montagne, et les baptêmes ont désormais leur propre dé. **E2 et E3 livrés** : le droit de passage s'ACHÈTE (un pays retient ce qu'il verse en péages, la douleur devient une raison d'aller parler, et une offre pèse dans la balance de celui qui donne sa parole — six à sept franchises par lot de six parties) ; et le blocus prive une ville sans l'assiéger (524 villes privées, et c'est la raison qui manquait à une colonne pour stationner quelque part). Le blocus a d'abord été écrit à 0,02 de grogne PAR HEURE — une ville à bout en deux jours, le test moteur qui ne terminait plus : une grogne se compte à l'heure ici, pas à la journée. **G3 livré** : `SAISON_BIOME` dit ce que chaque saison fait à chaque sol — le marais se ferme aux pluies et s'assèche l'été, le désert se referme en saison sèche, les dalles drainent. Le trafic se CONCENTRE (818 cases damées → 599 : une route qui tient toute l'année vaut mieux que deux qui alternent) et les postes encaissent presque trois fois plus (5 777 → 15 773). **G5 livré** : `marquerLieu` pose une trace datée et NOMME l'endroit de ce qui s'y est passé — une place qui tombe laisse un charnier devant ses murs, un poste rasé laisse ses quatre murs bas. 860 traces sur six parties, chacune un site à fouiller, et le monde rigoureusement identique au témoin : G5 ne l'a pas changé, il l'a rendu lisible |
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
