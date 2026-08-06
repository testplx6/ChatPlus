# Chantier « Individus » — l'unité de Dwarf Fortress sans en payer le prix

✅ **Chantier démarré** (accord du propriétaire, août 2026), le lot F du chantier
économie étant livré.
Recommandé **avant** le lot E : ce chantier retouche le monde, E pose
l'interface dessus — l'ordre inverse ferait tout retoucher deux fois.

Ce document suit le format de METHODE §9. Il est écrit pour être exécuté
tâche par tâche par quelqu'un qui n'a pas conçu le système : chaque tâche a
son test rouge nommé, ses fichiers, sa recette, et un critère mécanique.
**Règle absolue, comme partout : bloqué, critère ambigu, mesure hors
fourchette → section Blocages de CHANTIER.md, committer, s'arrêter. Ne jamais
inventer une règle de jeu.**

---

## 1. Le constat, chiffré

- **Le drame ne se commande par aucune constante saine.** La cartographie (84
  leviers plats, 1 044 parties) n'a trouvé que deux leviers sur les factions
  écrasées, et le meilleur — `MONNAIE.inertie` — ne fait du drame qu'en gelant
  le cours (amplitude 0,40–3,49 → 0,47–1,61), c'est-à-dire en vidant le bureau
  de change et le lot E de leur sens. Il manque des **acteurs**, pas des
  coefficients.
- **Dwarf Fortress fait l'inverse et en meurt** : chaque nain et chaque objet
  est de l'état, simulé à chaque pas, pour toujours — c'est sa « FPS death ».
  Notre moteur avance ~7 700 heures de jeu par seconde de calcul parce qu'il ne
  paie pas ce prix. Le chantier doit ajouter des visages **sans** le payer.
- **Le monde lit le joueur, et c'est mesuré** : `sim.js:463` fait tirer le banc
  de recrutement dans le Rng principal scellé *quand le joueur est présent*. La
  présence change la consommation du flux : à graine égale, le monde diverge
  selon où le joueur se promène. C'est une violation du piège n°5 de
  `game/CLAUDE.md`, assumée en solo, bloquante pour le multijoueur
  (`state.world` doit être partagé).
- **Aucune graine dérivée n'existe** : les 9 sites `new Rng(` de `src/` tirent
  tous soit de la graine initiale (`sim.js:161`), soit de `state.rngState`
  (`sim.js:380` + 7 sites `main.js`). `seedFromString` existe pourtant
  (`rng.js:83-90`) et n'est utilisé que pour la graine saisie au clavier.

Une précision d'honnêteté : il avait été annoncé que sortir le banc de l'état
allégerait la sauvegarde d'un tiers. **C'est faux.** La règle de présence évite
déjà ce poids — seules les villes sous les yeux du joueur ont un banc (1 à 3
bancs, quelques Ko). Le gain du lot 2 n'est pas le poids : c'est le piège 5,
la simplicité, et le multijoueur.

## 2. La cause

Un individu, dans ce moteur, n'existe que comme **état** : alloué par un tirage
du flux principal, sérialisé, migré par `normaliser`. Il n'y a pas de milieu
entre « n'existe pas » et « existe pour toujours dans la sauvegarde ». Le
moteur a pourtant déjà trois étages d'individus — éphémères (banc, bandes),
persistants rares (notables, dirigeants), plein détail (l'escouade) — et deux
mécanismes précieux : la **promotion par le toucher** (recruter déplace l'objet
même du banc vers l'escouade, `recrues.js:104-105` ; vaincre une bande ne
convertit en état que le butin et les prisonniers) et le **récit comme vue**
(`chronique.js` recalcule tout à la lecture, ne stocke rien). Ce qui manque est
une seule primitive : matérialiser un individu depuis une graine **dérivée**,
hors du flux principal.

## 3. Le principe — trois règles

1. **L'individu est une vue dérivée.** Tant qu'il n'a rien fait de mémorable,
   il se recalcule à l'identique depuis `grainDe(...)` — jamais un tirage du
   flux principal, jamais un octet dans la sauvegarde.
2. **La promotion par le toucher.** Tout individu dérivé qui subit un événement
   (recruté, capturé, cité) devient de l'état à cet instant, et seulement lui.
3. **Toute mémoire naît bornée.** Le journal est borné à 400, les marquants à
   14, la mémoire d'un notable à 4. Toute liste nouvelle de ce chantier naît
   avec sa borne écrite à côté d'elle.

---

## 4. Les lots

### Lot 1 — la graine dérivée (la primitive, seule)

**Quoi.** Une fonction, dans `src/rng.js` :

```js
/** Une graine stable, dérivée d'un chemin — jamais du flux principal. */
export function grainDe(...morceaux) {
  return seedFromString(morceaux.join(':'));
}
```

**Pourquoi seule dans son lot.** C'est la fondation de tout le reste ; elle
doit exister, être testée et être commitée avant qu'on s'en serve, pour que
chaque lot suivant ait un point de départ vert.

- [x] **I1.1.** `grainDe` dans `src/rng.js`, exportée (R7 pour le test).
  Tests (section « 19. La graine dérivée » de `test/headless.js`), rouges
  d'abord :
  - « les mêmes morceaux rendent la même suite » —
    `new Rng(grainDe('banc', 's12', 4)).u32()` égal deux fois ;
  - « deux chemins différents divergent » — `grainDe('banc','s12',4)` ≠
    `grainDe('banc','s12',5)` et ≠ `grainDe('banc','s21',4)` ;
  - « dériver ne touche pas le flux principal » — `state.rngState` identique
    avant/après un appel à `grainDe`.
  Critère : `node tools/verifier.js` vert ; `grainDe` n'est appelée nulle part
  encore (grep `grainDe(` dans `src/` = 1 seul fichier, `rng.js`).

### Lot 2 — le banc dérivé (le monde cesse de lire le joueur, première moitié)

**Quoi.** Le banc de recrutement cesse d'être de l'état. Il devient une pure
fonction `(ville, époque)` :

```js
// recrues.js — remplace genererBanc/bancDe
export function bancDerive(col, t) {
  const epoque = Math.floor(t / DUREE_BANC);            // DUREE_BANC existe : recrues.js:23, 260
  // La composition actuelle dépend de col.unrest (recrues.js:66-67 :
  // combien = round(1 + taille×0,8 + unrest×4)) — une ville agitée a plus de
  // monde au banc, et cette règle de jeu se GARDE. Mais unrest est continu et
  // bouge à chaque tick : brut dans la formule, le banc changerait de taille en
  // pleine époque. On le quantifie donc dans la graine, au quart :
  const agitation = Math.round((col.unrest || 0) * 4);
  const rng = new Rng(grainDe('banc', col.id, epoque, col.taille, agitation));
  const gens = /* même composition qu'aujourd'hui, mêmes tirages, sur CE rng */;
  const pris = (col.bancPris && col.bancPris.epoque === epoque) ? col.bancPris.ids : [];
  return { epoque, gens: gens.filter((c) => !pris.includes(c.id)) };
}
```

Le résidu du toucher : `col.bancPris = { epoque, ids: [] }` — la seule trace en
état, ~30 octets, posée **au recrutement seulement**, ignorée dès que l'époque
tourne. `bancDerive` est une lecture pure : elle n'écrit jamais dans `col`.

**Ce que ça règle.** `sim.js:463-464` disparaît : le monde ne matérialise plus
rien, ne tire plus rien selon la présence. Deux joueurs dans la même ville
verraient le même banc sans échanger un octet. Deux instabilités assumées par
écrit : une ville qui grandit d'un cran (`col.taille`) ou dont l'agitation
franchit un quart renouvelle son banc en pleine époque — rare, sans
conséquence, et dit ici.

- [x] **I2.1. `bancDerive`** — pure fonction de la ville et de l'heure, avec
  l'agitation quantifiée au quart (elle entre à la fois dans la graine et dans
  le nombre de gens, sinon la liste changerait de longueur sans que la graine
  change). Tests : même contenu pour tout observateur, l'époque qui tourne,
  le frémissement d'agitation qui ne renouvelle rien, et le flux scellé
  inchangé après matérialisation des 86 villes.
- [x] **I2.2. Le recrutement promeut.** `engager` prend un **identifiant** et
  non plus un rang : un rang ne veut rien dire d'un calcul à l'autre. Il pose
  `col.bancPris = { epoque, ids }` — le seul résidu en état, oublié dès que
  l'époque tourne. Créé aux **trois** endroits qui fabriquent une colonie
  (`world.js`, `base.js` pour la vitrine, `factions.js` pour une fondation) et
  dans `normaliser`, qui jette au passage l'ancien `banc` des vieilles parties.
- [x] **I2.3. Bascule et démolition.** `sim.js` ne fabrique ni n'efface plus
  rien ; `genererBanc` et `bancDe` sont supprimés ; l'écran lit `bancDerive` et
  son bouton porte l'identifiant. Critère mécanique tenu : `grep "col\.banc"`
  dans `src/` ne rend plus rien.
- [x] **I2.4. Ce que le lot prouve — et ce qu'il ne prouve pas.**
  **Prouvé** : après trois cents heures passées en ville, plus une seule
  personne dérivée ne dort dans la sauvegarde, et plus une ville ne porte la
  clé. Le monde ne fabrique plus personne, donc il n'a plus rien à ranger.
  **Pas encore prouvé, et le cahier des charges promettait trop ici** : que la
  position du joueur ne déplace plus rien. Elle change encore la *maille* des
  colonies (`pasColonie`), donc le nombre d'appels au tick, donc la
  consommation du flux partagé — et un flux partagé contamine tout. La preuve
  entière appartient au lot 3.

  **Ce que le lot coûte au monde**, mesuré contre la révision d'avant, 6 graines
  × 6 000 h : villes 517 → **506**, population 57 893 → **55 312**, factions
  écrasées 1/36 → **2/36**, guerres 21 → 13, écart comptable 0. Le monde change
  parce que les tirages du banc ont quitté le flux — c'était le but.

### Lot 3 — le flux par colonie (le monde cesse de lire le joueur, seconde moitié)

**Quoi.** Chaque colonie tire dans **son propre flux**, semé une fois pour
toutes sans consommer un tirage :

```js
// à la création d'une colonie (world.js) et dans normaliser (R1) :
col.rngEtat = grainDe('colonie', col.id);   // dérivé, PAS tiré — piège 1 respecté
// dans sim.js, autour de l'appel à tickColonie :
const rngCol = new Rng(col.rngEtat);
tickColonie(world, col, rngCol, ...);
col.rngEtat = rngCol.save();
```

**Pourquoi.** Aujourd'hui `tickColonie` tire dans le flux principal, et la
*maille* (`pasColonie`, `sim.js:371-376`) dépend de la position du joueur :
une ville proche tique toutes les 3 h, une lointaine toutes les 24-28 h. Le
nombre d'appels — donc la consommation du flux — dépend du trajet du joueur,
et tout le monde diverge derrière. Avec un flux par colonie, la contamination
s'arrête : les tirages d'une ville ne décalent plus jamais ceux d'une autre.

**Ce qu'on ne promet pas, dit d'avance.** Une colonie *dans* le voisinage du
joueur tique plus finement (dt 3 contre 24) : elle-même reste dépendante de la
présence — c'est le niveau de détail, c'est voulu, et `surDt` rend les
probabilités équivalentes en moyenne. Et **l'indépendance totale au trajet du
joueur n'est pas dans ce lot** : les rencontres de l'escouade tirent dans le
flux principal selon la région (`events.js:588-598`), les caravanes et les
conseils aussi, et tout se recouple par le commerce. La rendre entière
exigerait un flux privé du joueur, un flux par faction et un flux par réseau de
caravanes — c'est la décision « lot 3b » de §8, elle appartient au
propriétaire. La propriété que CE lot prouve : **les tirages d'une ville ne
décalent plus jamais ceux d'une autre.**

Le périmètre exact de la bascule — tout ce qui tire *pour une colonie* :
l'appel `tickColonie` (`sim.js:474` ; en dessous : `ajusterEmplois` via
`emploisInitiaux`, `pourvoirCharges`/`creerNotable`, `tickNotables`,
`tickServices`, et les branches exode/croissance/sécession/révolte de
`tickColonie` lui-même) ; le rafraîchissement des étals (`sim.js:565-569` →
`genererEtal`, `economy.js:1104-1126`) ; et `faireRevolte` (`economy.js:838`,
appelée depuis `sim.js:485`). Les signatures gardent leur paramètre `rng` —
seule la source change.

- [x] **I3.1. Le champ et la plomberie.** `col.rngEtat`, dérivé de
  `grainDe('colonie', id)` — pas un tirage, donc le piège n°1 est respecté.
  Posé aux **quatre** endroits qui font une colonie (`world.js`, `base.js` pour
  la vitrine, `factions.js` pour une fondation, `normaliser` pour les vieilles
  parties : la même dérivation, donc la même valeur qu'une partie neuve).
  `sim.js` ouvre le flux de la ville autour de son tick et le rescelle — deux
  fois, parce que la révolte tire encore après. Test : on dérange le flux d'une
  ville et **toutes les autres restent intactes**, 100 %.
- [x] **I3.2. Ce que ça ne prouve pas encore, mesuré.** Deux parties, même
  graine, joueur immobile dans deux coins opposés, 300 heures : sur les
  **73 villes hors des deux voisinages, zéro** est identique au bit près. Les
  factions, les caravanes et l'escouade puisent toujours au sac commun **et
  touchent les villes** — un convoi qui n'arrive pas au même moment change le
  stock, donc les prix, donc ce que la ville tire chez elle. Isoler le flux des
  colonies était nécessaire ; ce n'est pas suffisant. La preuve entière est au
  lot 3b, et c'est maintenant chiffré plutôt que supposé.
- [x] **I3.3. Le nouveau témoin.** Mesuré contre la révision d'avant, 6 graines
  × 6 000 h : villes 506 → **480**, population 55 312 → **52 585**, bien
  nourries 379 → **409**, affamées 17 % → **8 %**, factions écrasées 2/36 →
  **3/36**, écart comptable 0. Les dix gardes de `CIBLES.json` tiennent.
  Le monde est plus petit et nettement mieux nourri.

### Lot 3b — l'indépendance au trajet, jusqu'au bout (décidé, propriétaire)

**Quoi.** Après le lot 3, le flux principal reste consommé par des mécanismes
qui dépendent du joueur : les rencontres et chasseurs de l'escouade
(`events.js:588-598` — la probabilité dépend de la région), et par des
mécanismes du monde qui, eux, n'en dépendent pas mais partagent le même flux
(conseils, caravanes, armées). Trois bascules du même geste que le lot 3 :

- **le flux privé du joueur** : `state.player.rngEtat` (posé par dérivation,
  `grainDe('joueur', graine)`, jamais tiré) — rencontres, chasseurs, bandes,
  butins passent dessus. C'est de l'état *privé*, il en a le droit ;
- **les conseils, par dérivation apatride** : `new Rng(grainDe('conseil', key,
  t))` au début de chaque conseil — rien à stocker, rien à migrer ;
- **les caravanes, par réseau et par heure** : `new Rng(grainDe('reseau', cle,
  t))` dans `departsDuReseau` — la clé du réseau existe déjà (`idReseau`).

- [x] **I3b.1. L'énumération.** Tous les consommateurs restants du flux
  principal, classés. Comptés par module (`rng.` sur les chemins appelés depuis
  `tick`) :

  | consommateur | tirages | classe | où il ira |
  |---|---:|---|---|
  | `tickClimat` (`climat.js`) | 2 | **global** | reste au flux principal — le temps qu'il fait est le même pour tout le monde |
  | `tickFactions` → `conseil`, armées, fondations | 32 | à basculer | `grainDe('conseil', faction, t)`, apatride |
  | `tickCaravanes` → départs, incidents | 8 | à basculer | `grainDe('reseau', clé, t)`, apatride |
  | `rafraichirPanneaux` + `etalDe` (`contrats.js`) | 22 | à basculer | le flux de la ville, `col.rngEtat` — il existe déjà |
  | `tickSquad` | 11 | **joueur** | `state.player.rngEtat`, privé |
  | `tickBase` | 11 | **joueur** | idem |
  | `tickAllegeance` | 16 | **joueur** | idem |
  | `tickContrats`, `tickCharges`, `tickFormation`, `jugerActes` | — | **joueur** | idem |
  | `notables` | 7 | déjà fait | appelé depuis `tickColonie`, donc sur le flux de la ville |
  | `secteur`, `bourse`, `connaissance` | 0 | — | ne tirent rien |

  Une fois les trois bascules faites, le flux principal n'est plus consommé que
  par le climat — deux tirages par heure, les mêmes quel que soit le trajet.
- [ ] **I3b.2-4. Les trois bascules**, une par commit, chacune re-mesurée au
  banc (gardes tenues).
- [ ] **I3b.5. La preuve entière.** Test rouge : deux parties à graine égale,
  trajets différents, 300 h, **sans avant-poste et sans action** :
  `state.rngState` final identique — le flux principal n'est plus consommé que
  par du global. (La maille de détail reste : les villes proches du joueur
  tiquent plus fin, c'est le niveau de détail assumé ; en multijoueur, le
  serveur tiquera à maille uniforme et cette dépendance-là disparaît d'elle-même.)

### Lot 4 — la promotion narrative : le vivier

**Quoi.** Quand une charge de notable se libère, la ville promeut de
préférence quelqu'un **qui a déjà une histoire** au lieu de tirer un nom neuf.

L'état : `col.vivier = []`, borné à **3** entrées `{ nom, origine, t }`, FIFO
(la plus vieille saute). Une seule source pour commencer — un geste du joueur,
donc légitime à toucher le monde — et elle tient en un point du code, parce
que toutes les issues d'un captif passent par `disposer`
(`justice.js:303-419`, le commentaire l.300 le dit : « toutes les issues
passent par ici ») :

- un **captif relâché ou livré** quand une ville est en contexte : à la fin de
  `disposer`, si l'issue est `relacher` (l.310-322, seulement si une `col`
  non-ruinée est présente) ou `livrer` (l.345-369, la `col` y est garantie par
  le garde-fou l.343), pousser `{ nom: cap.nom, origine: 'captif', t }` au
  vivier de `col`. Ni `vendre`, ni `rancon`, ni `enroler` — un vendu ne
  devient pas armurier, un rançonné rentre chez lui, un enrôlé rejoint
  l'escouade.

D'autres sources viendront quand celle-ci aura prouvé le mécanisme — une
source suffit, et une liste courte et vraie vaut mieux qu'une longue à
compléter.

Dans `pourvoirCharges` : si le vivier n'est pas vide au moment de créer un
notable, `shift()` fournit le **nom** (le reste — comp, caractère, humeur —
se tire comme aujourd'hui, mêmes tirages, même ordre), et le journal le dit :

> `${nom}, ancien captif relâché ici, devient ${CHARGES[charge].nom} de
> ${col.nom}.`

- [ ] **I4.1. Le champ.** `col.vivier` (R1 : les trois lieux, borne 3 écrite en
  constante à côté du champ, `normaliser` → `[]`). Test : aller-retour JSON
  exact, borne tenue (pousser 5 → il en reste 3, les plus récentes).
- [ ] **I4.2. La source.** Dans `disposer` (`justice.js`), aux deux branches
  dites ci-dessus. Tests rouges : « un captif relâché en ville entre au
  vivier », « un captif livré entre au vivier », « un captif vendu n'y entre
  pas ».
- [ ] **I4.3. La promotion.** Dans `creerNotable`/`pourvoirCharges`. Test
  rouge : « une ville au vivier garni promeut un nom connu » — la fixture
  s'écrit ainsi (il n'en existe pas de toute faite : le §9 de `headless.js`
  fait seulement vieillir les notables, l.4354-4361, il sert de modèle) :
  garnir `col.vivier` à la main, poser `age = 90` sur un notable (la mortalité
  par âge est `notables.js:231`, le remplacement l.235), ticker jusqu'au
  remplacement, vérifier que le remplaçant porte le nom du vivier et que le
  journal contient « ancien captif relâché ici ». Critère : les tests des
  notables existants restent verts (le nombre de notables ne change pas).

### Lot 5 — le drame rétroactif : nommer sans stocker

**Quoi.** Les événements de ville reçoivent des acteurs nommés **à
l'écriture de la ligne de journal**, par graine dérivée de l'événement — zéro
état, zéro tirage du flux principal.

```js
// notables.js — PAS chronique.js : chronique est avant-dernier de MODULES
// (tools/bundle.js), or credit.js et factions.js doivent appeler nommerActeur
// et un module ne cite que ceux qui le précèdent — piège n°3. notables.js
// précède economy/credit/factions, importe déjà NOMS_PERSO et SURNOMS depuis
// data.js (ils vivent à data.js:849 et :855), et le motif nom+surnom à 0,35 y
// existe déjà (notables.js:59-62).
export function nommerActeur(...morceaux) {
  const rng = new Rng(grainDe('acteur', ...morceaux));
  const nom = rng.pick(NOMS_PERSO);
  return rng.chance(0.35) ? `${nom} ${rng.pick(SURNOMS)}` : nom;
}
```

Quatre événements, quatre textes — à reprendre tels quels, le ton est celui du
journal existant. Les sites sont ceux des **lignes de journal existantes**
(`effondrer` et `faireSecession` dans economy.js ne journalisent pas — les
lignes vivent aux sites d'appel, dans sim.js) :

| événement | site de la ligne existante | texte à ajouter |
|---|---|---|
| effondrement (ruine) | `sim.js:550-555` — la branche avant-poste (`sim.js:546-548`) n'est **pas** enrichie, c'est le texte du joueur | `La famille de ${nommerActeur('ruine', col.id)} est partie la première ; les autres ont suivi.` |
| saisie par créancier | `credit.js:363-374` (`saisir` journalise lui-même) | `${nommerActeur('saisie', col.id)} tenait l'étal du marché ; on dit qu'il a fermé boutique le jour même.` |
| capture militaire | `factions.js:301-306` | `${nommerActeur('capture', col.id, col.prises)} a été vu clouant sa porte avant l'assaut.` |
| sécession | `sim.js:528-535`, les **deux** variantes (renaissance et normale) ; la sécession issue d'une révolte (`sim.js:505-514`) garde son texte — la révolte est déjà son propre drame | `C'est ${nommerActeur('secession', col.id)} qui a décroché l'ancien drapeau.` |

- [ ] **I5.1. `nommerActeur`** dans `src/notables.js` (voir le commentaire du
  gabarit : ordre du bundle, imports déjà en place). Tests rouges : « le même
  événement nomme le même acteur » (deux appels égaux), « deux événements
  nomment deux acteurs » ; « nommer ne touche pas le flux principal ».
- [ ] **I5.2. Les quatre textes.** Aux quatre sites, dans la ligne de journal
  **existante** (pas d'entrée nouvelle : on enrichit `texte`). Tests — sur un
  fragment **propre au texte ajouté**, jamais sur « contient un nom » (toute
  ligne existante contient déjà des noms de villes, le test naîtrait vert) :
  la fixture de saisie (§16) vérifie « tenait l'étal du marché », celle de
  sécession « a décroché l'ancien drapeau » ; et à graine égale, le nom est
  identique entre deux parties. Critère : `verifier` vert, aucune nouvelle clé
  d'état (grep : `nommerActeur` n'écrit rien).

### Lot 6 — la colonne sans solde (la règle du propriétaire, spécifiée)

**La règle, telle que dictée** (consignée dans CHANTIER.md, lot G) :

> Si elle n'est plus payée par sa faction, la colonne peut rester un temps à
> son service, selon la loyauté que les individus qui la composent lui portent.
> Mais elle peut mourir de faim, et décider de faire cavalier seul, de fonder
> sa faction, de se faire payer par une autre, de se disloquer.

**L'état, minimal et agrégé** — pas d'individus persistants dans la colonne :

- `a.impayees` : heures de solde impayées cumulées (nombre ; remis à 0 quand
  la solde est réglée). C'est la **seule** clé nouvelle.
- La loyauté n'est pas un état : elle se dérive — la colonne d'une faction au
  dirigeant légitime tient plus longtemps
  (`legitimite` existe sur le dirigeant, `dirigeants.js:120`).

Un fait vérifié qui borne le périmètre : la faction `'bandits'` **n'existe
pas** — `FACTIONS` a sept clés fixes (`data.js:161-253`) et `DIPLO_FACTIONS`
six (`data.js:257`). « Faire cavalier seul » ne peut donc pas produire une
troisième force persistante : c'est une débandade racontée, ou un Blocage.

**L'algorithme du conseil, écrit pour n'avoir rien à inventer.** Constantes
dans un objet balayable `COLONNE` (R2 — valeurs de départ balayées en I6.4,
**pas choisies à vue**). À chaque conseil, pour chaque colonne de la faction :

```
si impayees < COLONNE.grace × (legitimite / 50)   → issue 1 : rester (rien)
sinon :
  s'il existe une faction en guerre contre la sienne
  dont le trésor couvre la solde due                → issue 3 : retournement
  sinon                                             → issue 2 : s'affaiblir
                                                      a.force -= COLONNE.attrition × heures
  et si a.force < COLONNE.debandade                 → issue 4 : débandade
```

1. **Rester** — la loyauté excuse encore.
2. **S'affaiblir** — la faim mord ; les désertions se racontent.
3. **Se faire payer par une autre** — le payeur règle la solde due depuis SON
   trésor (le circuit fermé reste fermé, `auditer` exact), la colonne change
   de drapeau. Journal :
   `Le capitaine ${nommerActeur('colonne', a.id)} a retourné sa veste : la
   solde de ${FACTIONS[payeur].nom} sonnait plus juste.`
4. **Se disloquer** — la colonne disparaît, comme une armée battue :
   `La colonne de ${nommerActeur('colonne', a.id)} s'est débandée, faute de
   solde. On en reverra certains sur les routes.`
5. **Fonder sa faction** — **hors de ce chantier, décidé** (propriétaire,
   août 2026) : ce sera un chantier propre, plus tard — le moteur ne sait pas
   créer une faction en cours de partie (clés fixes, diplomatie, couleurs,
   UI). L'idée reste au registre ; ici, la colonne se débande ou se vend.

- [ ] **I6.1. `a.impayees`.** Les armées se créent en **deux** endroits —
  `factions.js:191` (`leverArmee`) et `influence.js:335` — plus `normaliser`
  pour les sauvegardes qui portent des armées (R1, adaptée : la recette parle
  des villes, les lieux sont ceux-ci). Au site de la solde
  (`factions.js:574-579`) : `du = a.force × ETAT.parSoldat × heures`,
  `paye = verser(...)` ; **réussite = `paye ≥ du × 0,999`** (la convention de
  `factions.js:570`) → `impayees = 0` ; sinon `impayees += heures`. Test
  rouge : « une solde versée efface l'ardoise, une solde manquée l'allonge ».
- [ ] **I6.2. Les issues 1-2** (rester, s'affaiblir), selon l'algorithme
  ci-dessus. Tests rouges avec fixtures : trésor vidé à la main sur un monde
  neuf (pas de dette fabriquée — la leçon du §16 : on n'audite pas un monde
  qu'on a trafiqué).
- [ ] **I6.3. Les issues 3-4** (retournement, débandade), textes ci-dessus.
  Test : l'argent du retournement sort du trésor payeur au centime
  (`auditer` = 0 sur tout le déroulé).
- [ ] **I6.4. Calibrage.** Balayer `COLONNE.grace`, `COLONNE.attrition` et
  `COLONNE.debandade` (R8) : cibles — les guerres longues produisent des
  retournements et des débandades (**somme des six graines > 0 pour chacun
  des deux compteurs**), les factions écrasées restent dans les gardes de
  `CIBLES.json`, l'écart comptable reste 0. Ajouter les deux compteurs à
  `jouer()` dans `tools/banc.js` (retournements, débandades) — jamais de
  script à côté.

---

## 5. Ce que ça casse, dit d'avance

- **Les mondes changent à graine égale** aux lots 2 et 3 (les tirages changent
  de flux). Chaque lot re-mesure au banc contre la révision d'avant et les
  gardes de `CIBLES.json` doivent tenir telles quelles.
- **Les vieilles sauvegardes** portent `col.banc` : `normaliser` le supprime
  (lot 2) et pose `rngEtat`, `vivier`, `bancPris`, `impayees` (R1 à chaque
  fois). Test d'aller-retour JSON exact à chaque champ.
- **L'écran de recrutement** lit le banc : il lira `bancDerive`. Les 264
  vérifications navigateur doivent rester vertes sans modification de
  comportement visible.
- **La section 17 de `test/headless.js`** (cartographie) et le banc balayent
  des constantes : `COLONNE` (lot 6) entre dans la carte automatiquement —
  c'est voulu.

## 6. Les cibles du chantier, mesurables à la fin

| cible | comment on la mesure |
|---|---|
| regarder ne tire plus, les villes ne se contaminent plus | tests I2.4 et I3.1-I3.2 verts : le flux principal ignore `bancDerive`, et les tirages d'une ville ne décalent plus ceux d'une autre (l'indépendance *totale* au trajet est la décision « lot 3b », §8) |
| zéro coût au tick | vitesse contre témoin `82636d8` : le rapport ne monte pas d'un lot à l'autre (`verifier --complet`) |
| zéro croissance d'état non bornée | grep : chaque liste nouvelle (`vivier`, `bancPris`) a sa borne en constante à côté ; sauvegarde 4 000 h ≤ poids actuel + 2 Ko |
| le drame a des visages | les quatre événements du lot 5 nomment ; les guerres longues produisent retournements et débandades (compteurs banc > 0) |
| l'argent reste exact | `auditer` = 0 partout, y compris à travers le retournement de colonne |
| les comptes du monde tiennent | gardes `CIBLES.json` inchangées et tenues après chaque lot |

## 7. Ce qu'on ne fait pas

- Pas de tuiles, pas d'objets possédés, pas de pathfinding individuel, pas de
  besoins horaires par personne. La population reste un effectif par métiers
  (`notables.js:2-13`).
- Pas d'individus persistants dans les colonnes, les caravanes ou les bandes :
  la narration les nomme (`nommerActeur`), l'état ne les garde pas.
- Pas de création de faction en cours de partie (issue 5 du lot 6 : Blocage).
- Pas de « simulation des vies » hors écran : pas d'âge qui avance pour les
  gens du banc, pas de familles, pas de généalogie. Un individu dérivé n'a pas
  de biographie tant que personne ne l'a touché.

## 8. Décisions déjà prises, décisions à prendre

**Prises** (avec le propriétaire, session d'août 2026) :
- l'approche « vue dérivée + promotion par le toucher + mémoire bornée » ;
- la règle de la colonne sans solde (dictée, voir lot 6) ;
- l'ordre des chantiers : **lot F (économie) → Individus → lot E** ;
- « fonder sa faction » : chantier propre, plus tard — l'idée reste au
  registre, rien ne bloque en attendant (lot 6, issue 5) ;
- le **lot 3b** est retenu et fait partie de ce chantier ;
- si la carte des 987 leviers ne trouve pas de levier de drame plus propre
  que `MONNAIE.inertie` : **on garde 0,70** (la monnaie vit) et le drame
  viendra des acteurs de ce chantier — retournements, débandades, saisies
  nommées. La cible « ≥ 4/36 écrasées » se re-mesure après.

**À prendre avant de démarrer :**
- le démarrage effectif : ce document prépare, il n'autorise pas.
