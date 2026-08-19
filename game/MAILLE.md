# Chantier « Invariance à la maille »

✅ **Démarré** (accord du propriétaire, août 2026). Format : `METHODE.md` §9.

**La réserve du propriétaire, consignée telle qu'elle a été dite** : « d'accord
pour l'invariance de la maille même si je ne suis pas convaincu à terme, ça
reste une solution raisonnable en phase de dev ». Autrement dit : corriger le
compte des événements est tenu pour un **compromis de phase de développement**,
pas pour la réponse définitive. Ce qui viendrait après n'est pas décidé —
serveur à maille uniforme, sous-pas, ou une autre architecture de simulation.
Le chantier avance en le sachant, et ne prétend pas clore la question.

Un moteur de simulation est crédible quand **le modèle ne dépend pas de la
façon dont on le regarde**. C'est la propriété la plus centrale qu'il puisse
avoir, et c'est la seule qui soit aujourd'hui violée par construction.

---

## 1. Le constat, chiffré

Une ville proche du joueur avance heure par heure ; une ville lointaine par
tranches de vingt-quatre (`pasColonie`, `sim.js:371-376`). Ce n'est pas la même
ville qui en sort.

**Dans le monde** (`banc --maille`, 3 graines × 2 000 h, 48 villes appariées —
la même ville sous les deux mailles) : population médiane **+28 habitants** en
maille fine, rations +27, caisse −168, **52 villes debout contre 55**.

**La maille seule** — même ville clonée, quarante jours, aucun voisin, aucune
caravane, aucune guerre. Le tableau ci-dessous est la **deuxième** version de
cette mesure ; la première disait le contraire, et pourquoi elle se trompait est
au moins aussi instructif que le résultat (voir §1 bis).

Quarante villes × huit graines, villes saturées écartées grandeur par grandeur,
plancher de bruit établi par huit placebos :

| | exploitables | écart médian | plancher | |
|---|---:|---:|---:|---|
| population | 320/320 | −2 | ±3 | sous le plancher |
| rations | 168/320 | **+54** | ±5,3 | au-dessus |
| agitation | 8/320 | **−0,578** | ±0,283 | au-dessus |
| caisse | 210/320 | **+101** | ±11 | au-dessus |
| ménages | 320/320 | **−40** | ±0,6 | au-dessus |

## 1 bis. Ce que la première mesure disait, et pourquoi elle avait tort

Elle annonçait : « rations, agitation et caisse identiques au millième ;
population −10 et ménages −39 ; trois grandeurs invariantes et deux qui
divergent, c'est une signature ». **Les cinq chiffres étaient faux ou
inexploitables**, pour deux raisons distinctes.

**Elle lisait des villes saturées.** Après quarante jours isolés, l'agitation
est à 1,000 dans trente villes sur quarante et à 0 dans neuf ; les greniers sont
vides dans dix-neuf, les caisses dans quatorze. La médiane comparait donc, pour
l'essentiel, des villes assises sur une butée à elles-mêmes. Un écart nul entre
deux zéros ne dit rien sur le regroupement. Le banc écarte maintenant, pour
chaque grandeur, les villes dont les deux côtés sont sur la même borne — et il
affiche combien il en reste, pour qu'on ne relise plus jamais un « 0,000 » sans
savoir sur combien de villes il porte.

**Elle n'avait pas de plancher.** L'écart médian de quarante villes se promène
tout seul, et il se promenait précisément de l'ordre de grandeur qu'on croyait
mesurer : le plancher de bruit du −10 de population valait ±11. Il n'y avait
donc rien à voir, et on avait vu quelque chose. Mettre huit graines en commun
divise ce vagabondage par √8 sans toucher à un biais — le plancher tombe à ±3,
l'écart de population à −2, et la conclusion s'inverse : **la population n'est
pas le problème.**

Le tableau « affamés −18 / nourris +30 » de la première version tombe avec le
reste : il découpait le même bruit en deux moitiés sans plancher.

## 2. Les causes — il y en a deux, et la principale n'était pas celle-là

### 2 a. La saturation, poste dominant

**`economy.js:638`** — les ménages font leurs courses :

```js
const regle = facture > 0 ? Math.min(facture, col.menages || 0) : 0;
```

`facture` croît avec `dt` : sur vingt-quatre heures, la ville présente une note
vingt-quatre fois plus grosse. La bourse des ménages, elle, ne croît pas — les
salaires de la journée sont versés **après**, plus bas dans la même fonction.
Sur vingt-quatre heures fines, chaque paie horaire est dépensable dès l'heure
suivante ; sur une tranche, elle arrive trop tard. Le plafond mord donc plus
fort à la maille grossière, et la ville encaisse moins de ses propres habitants.

Instruit par trois signatures concordantes, pas supposé :

| | |
|---|---|
| erreur locale, une journée depuis un état identique | **+4,81 crédits** de caisse par ville, `dt = 24` |
| proportionnalité au pas | +0,21 / +0,84 / +1,18 / +4,81 pour `dt` = 2 / 4 / 8 / 24 |
| antisymétrie | ménages **−4,82** en face de caisse +4,81 : c'est un transfert |
| villes où le plafond mord | **+293** par jour, contre **+1,71** là où il ne mord jamais |

Sur quarante jours, 4,81 × 40 ≈ 192, et la mesure longue relève +229 : le même
mécanisme, accumulé.

Le tableau complet des erreurs locales, tel que `banc --maille` le sort
maintenant. La ligne `pas 1` est le témoin — deux mailles fines identiques, qui
doivent rendre zéro partout, et qui le rendent :

| pas | pop | rations | agitation | caisse | ménages |
|---:|---:|---:|---:|---:|---:|
| 1 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 |
| 2 | 0,000 | −0,224 | −0,000 | +0,212 | −0,156 |
| 4 | 0,000 | −0,448 | −0,001 | +0,841 | −0,802 |
| 8 | 0,000 | −0,448 | −0,011 | +1,180 | −1,110 |
| 24 | 0,000 | **−7,200** | −0,034 | **+4,810** | **−4,818** |

Les rations ont donc, elles aussi, une erreur locale — corrigée d'une erreur de
lecture de plus : mesurée sur les quarante villes, elle sortait à 0,00, parce
que dix-neuf greniers vides tiraient la médiane à zéro. Villes saturées
écartées, elle vaut −7,2 à `dt = 24`. **La population, elle, a une erreur locale
strictement nulle à tous les pas** : son défaut est bien le tirage quantifié de
§2 b, qui ne se déclenche que quelques fois par mois et ne peut pas se voir sur
une seule journée.

Reste, dans les villes où le plafond ne mord jamais, **1,71 crédit par jour**
qui ne s'expliquent pas par lui : d'autres non-linéarités plus petites
(`min(veut, enRayon)`, les prix relus une fois par tranche au lieu de vingt-
quatre). Elles sont notées, pas encore instruites.

### 2 b. Le compte, poste secondaire mais réel

`economy.js:719-730` :

```js
if (rng.chance(surDt(0.05 * (0.8 - satiete) / 0.8))) col.pop -= rng.irange(1, 3);
// …
if (rng.chance(surDt(0.03 + abondance * 0.05))) col.pop += rng.irange(0, 2);
```

`surDt(p) = 1 − (1−p)^dt` convertit correctement **la probabilité qu'un
événement arrive** sur la tranche. Il ne convertit pas **son nombre
d'occurrences**. Vingt-quatre heures fines autorisent vingt-quatre naissances
ou vingt-quatre départs ; une tranche de vingt-quatre n'en autorise qu'**un
seul**, de la même ampleur.

D'où la règle générale, inscrite dans `METHODE.md` §3 : **une probabilité se
regroupe, un compte ne se regroupe pas.** Et sa jumelle, découverte depuis et
plus coûteuse : **une saturation ne se regroupe pas non plus.** Ce qui se
regroupe exactement, c'est un taux constant sur la tranche — rien d'autre. La
mesure d'erreur locale le confirme grandeur par grandeur : rations 0,00,
agitation 0,00, caisse +4,81.

## 3. Ce qu'on propose

**Tirer le nombre d'occurrences, pas l'occurrence.** Une primitive, à côté de
`surDt`, dans `economy.js` :

```js
/** Combien de fois un événement horaire de probabilité p survient en dt heures. */
function combienDeFois(rng, p, dt) {
  if (dt === 1) return rng.chance(p) ? 1 : 0;
  // Loi binomiale par la méthode directe tant que dt reste petit — dt vaut 3
  // près du joueur et 24 à 28 loin, jamais plus.
  let n = 0;
  for (let i = 0; i < dt; i++) if (rng.chance(p)) n += 1;
  return n;
}
```

**Ce que ça coûte, et une erreur à ne pas refaire.** Une première version de ce
document annonçait que « le coût cesse de dépendre de la maille » — c'était
faux, et la confusion vaut d'être dite : elle mélangeait ce correctif avec la
suppression du niveau de détail, qui elle coûterait environ **trois fois** le
budget du tick et n'est pas proposée.

Le correctif ne touche que **deux tirages** par tick de colonie — la naissance
et le départ. Toute l'économie continue de se calculer en une passe pour la
tranche entière. L'ordre de grandeur, à partir de chiffres mesurés : un tirage
coûte **7,2 ns**, deux événements deviennent au plus 2 × 24 tirages, une dizaine
de ticks de colonie par heure — soit **~3,5 µs sur 110, de l'ordre de 3 %**. Et
un tirage binomial écrit correctement (une inversion au lieu d'une boucle) le
ramènerait à presque rien. À mesurer, mais l'estimation est loin d'un facteur
trois.

**Une variante moins chère, à mesurer contre celle-ci** : un seul tirage
binomial par la somme d'une loi de Poisson tronquée, ou l'espérance `p × dt`
appliquée à l'ampleur avec un tirage pour la partie fractionnaire. Moins exact,
mais `dt` fois moins de tirages. Le choix se fait au banc, pas à l'avis.

**Une question mal posée, et sa correction.** Ce document demandait au
propriétaire de trancher : « combien d'habitants une ville peut-elle perdre en
un jour ? ». Sa réponse : « pourquoi vouloir mettre des limites fixes dans une
simulation qui a vocation à être réaliste ? » — et elle est juste. Demander de
choisir un plafond, c'est demander une constante inventée de plus, exactement
ce que `METHODE.md` §2 interdit. Le `rng.irange(1, 3)` déjà en place est du même
bois : personne ne l'a décidé, il ne sort d'aucune situation, et un hameau de
quarante âmes y perd autant qu'une ville de neuf cents dans le même état.

Deux conséquences, et elles sont nettes :

- **le plafond disparaît de lui-même.** Une fois le compte corrigé, une ville
  lointaine pourra perdre autant qu'une ville proche le peut déjà. Il n'y a
  donc rien à trancher : la question ne se pose plus ;
- **l'ampleur reste fausse, et ce n'est pas ce chantier.** Combien de gens
  partent devrait naître du déficit — combien ne sont pas nourris, de combien
  de rations la ville manque, où ils peuvent aller. C'est un changement de
  règle, il sort du périmètre de §6, et il est inscrit à part : voir
  « L'ampleur au lieu du plafond » plus bas.

Le seul seuil que ce chantier garde est le ×1,08 de §5, et ce n'est pas une
limite du monde : c'est ce que l'instrument de vitesse sait résoudre. Il borne
ce qui peut passer sans être dit, pas ce que la simulation a le droit d'être.

## 3 bis. Ce que le correctif a fait au monde, mesuré

Le correctif change le monde à graine égale, et c'était annoncé. Sur le banc
(6 graines × 6 000 h) :

| | avant le chantier | après M0 | après M0 bis | fourchette |
|---|---:|---:|---:|---|
| villes | 517 | 481 | 462 | 430–600 |
| habitants | 57 893 | 71 638 | 79 530 | 45 000–90 000 |
| **nourries** | 387 | 361 | **299** | **320–460** |
| affamées | 16 % | 17 % | **28 %** | — |
| créances | 47 | 78 | 70 | 20–70 |
| bourses | 35 | 33 | 33 | 28–36 |

**Le monde est devenu plus affamé, et le mécanisme est net.** Corriger la date
des prix relève la facture des ménages — mesuré, +1,60 crédit par ville et par
jour. La part servie, `regle / facture`, baisse d'autant, et c'est elle qui
commande la satiété. **Le monde d'avant sous-facturait ses habitants et les
nourrissait donc trop.** Ce n'est pas une régression du correctif : c'est
l'ancien équilibre qui reposait sur le biais.

C'est exactement ce que §6 bis annonçait — « tout réglage posé d'ici là l'est
dans un monde faussé et devra être remesuré après ». La dette est là, elle est
échue, et elle est moins chère maintenant que plus tard.

**La garde `nourries` sort donc de sa fourchette, et elle n'est pas élargie.**
Ce qu'il faut : recalibrer l'économie dans le monde corrigé, au balayage
(`banc --balaye`), et non retoucher le garde-fou. C'est un lot, il est consigné
dans les Blocages.

Les créances, elles, étaient sorties après M0 (78) et sont revenues dans la
fourchette après M0 bis (70, à la limite haute). Elles restent la dette signalée
par `CIBLES.json`.

## 4. Ce que ça casse, dit d'avance

- **Le monde change à graine égale.** La croissance et la décroissance des
  villes sont au cœur de tout : population, faim, révoltes, guerres. Chaque
  garde de `CIBLES.json` est à remesurer, et la population du monde bougera
  sensiblement.
- **Le coût du tick monte** — de combien, c'est la question de §5. Si la
  variante exacte est trop chère, c'est la variante approchée qui passe, et on
  dira de combien elle s'écarte.
- **Les décors assis sur des populations connues** tomberont, comme à chaque
  changement de monde. C'est le prix habituel.

## 5. Les cibles mesurables

| cible | comment on la mesure | état |
|---|---|---|
| invariance | `banc --maille`, partie 2 : les cinq écarts médians **sous le plancher de bruit** établi par placebo. « À zéro » était une cible mal posée : deux tirages honnêtes ne rendent jamais la même ville, et exiger l'impossible, c'est ne rien vérifier | ✅ **5 sur 5** après M0 ter — était 2 sur 5 |
| erreur locale | l'erreur d'**une journée** depuis un état identique, grandeur par grandeur et pas par pas. CRITÈRE RECALÉ au lot I bis : « sous 0,1 » datait d'un monde aux prix écrêtés où le plancher de bruit d'une journée valait ±0,01 ; les bornes levées, deux mondes honnêtes s'écartent déjà de ±0,55 ration et ±0,23 de caisse en un jour (huit placebos), et l'absolu de 0,1 était devenu inatteignable pour tout code. Le critère est désormais le même que celui de la ligne du dessus : **sous le plancher de bruit du placebo**, celui d'une journée. La qualité d'accumulation, elle, est jugée par l'invariance à quarante jours — et l'écart journalier est prouvé auto-correcteur : deux crédits par jour feraient quatre-vingts en quarante jours, la mesure en trouve cinq pour un plancher de seize | ✅ **5 sur 5** sous le plancher d'une journée après I bis — rations −0,275 (±0,55), caisse −0,192 (±0,23) |
| invariance dans le monde | `banc --maille`, partie 1 : population médiane à ±3 habitants et villes debout à ±1 | ✅ +0 habitant après M0 ter ; villes debout 48/56, toujours au-dessus de ±1 |
| coût | la garde de vitesse : rapport à la livraison précédente | ✅ **×1,056** pour M0 ter (plafond 1,08) — tenu |
| le monde tient | les dix gardes de `CIBLES.json`, resserrées après coup sur l'état mesuré | ✅ 10 sur 10 après M0 ter |
| l'invariant comptable | exact, comme toujours | tenu |

**L'erreur locale est le bon critère, et c'est une leçon de ce chantier.**
Mesurer après quarante jours mélange le défaut qu'on corrige avec l'amplification
chaotique qu'il subit ensuite ; l'écart d'une journée depuis un état identique
isole le défaut lui-même, et il se lit à trois décimales là où l'autre se noie
dans un plancher de ±3.

## 6. Ce qu'on ne fait pas

- On ne supprime pas le niveau de détail. Il fait vivre un monde de 86 villes à
  ~110 µs par heure ; c'est lui qui rend le monde distant vivant plutôt que
  gelé, à la différence de Kenshi. Ce qu'on corrige, c'est qu'il **biaise**.
- On ne rend pas la maille uniforme « en attendant » : ce serait payer le coût
  maximal pour ne rien régler du problème de fond.
- On ne touche à aucun mécanisme dont le défaut de maille n'a pas été
  **mesuré** — une correction par ville, un témoin par correction. La phrase
  qui tenait ici, « la cause est identifiée et localisée », était fausse : elle
  désignait deux tirages quantifiés et ignorait le poste dominant. Ce n'est pas
  le périmètre qu'il fallait garder étroit, c'est la mesure qu'il fallait faire
  avant de l'annoncer.
- **On ne corrige pas l'ampleur ici.** Voir juste en dessous : c'est une règle
  de jeu, pas un défaut de maille, et les deux ne se mesurent pas ensemble.

### L'ampleur au lieu du plafond — à faire, hors de ce chantier

Corriger le compte remet la maille d'aplomb ; ça ne rend pas l'ampleur juste
pour autant. `col.pop -= rng.irange(1, 3)` et `col.pop += rng.irange(0, 2)`
sont deux constantes que personne n'a décidées, et elles ignorent la situation :
même départ pour un hameau qui meurt de faim et pour une ville de neuf cents
qui se serre la ceinture.

Ce qu'il faudrait à la place — à spécifier, pas à improviser : un départ tiré
du **déficit** (combien d'habitants la ville ne peut pas nourrir), tempéré par
ce qui retient (l'attachement, l'ordre public) et par ce qui accueille (une
ville atteignable, et sa distance). Même chose pour la naissance, du côté du
surplus. Aucune de ces quantités n'est un nombre à choisir : elles sont toutes
déjà dans l'état de la ville.

Ce n'est pas fait ici parce que ça changerait la population du monde en même
temps que la correction de maille, et qu'on ne saurait plus lequel des deux a
fait quoi. Le chantier reste à ouvrir, après celui-ci.

## 6 bis. Pourquoi ne pas le repousser à la fin

La question a été posée, et la réponse est mesurée plutôt que d'opinion :
**repousser l'invariance ne fait pas gagner du temps de développement, elle en
fait perdre.** Le biais contamine chaque calibrage — tout réglage posé d'ici là
l'est dans un monde faussé et devra être remesuré après. On paierait deux fois
chaque cible.

Ce que le niveau de détail fait gagner est réel et n'est pas en cause : les 86
villes à la maille fine coûteraient environ trois fois le budget du tick, et
une campagne de mille parties passerait de vingt minutes à une heure. **On
garde le niveau de détail ; on corrige seulement qu'il biaise.**

## 7. Le recensement — à refaire, et pourquoi

La première version de cette section concluait : « deux seulement sont atteints,
le périmètre est petit ». Elle cherchait **une seule forme de défaut** — le
tirage quantifié — et elle s'appuyait, pour écarter tout le reste, sur des
écarts mesurés à zéro qui l'étaient pour cause de saturation. Les deux erreurs
se renforçaient : on ne cherchait qu'un défaut, et on avait une mesure
complaisante pour dire que le reste allait bien.

Ce qu'il faut chercher, ce sont **trois formes**, et seule la troisième se
regroupe :

| forme | se regroupe ? | exemple |
|---|---|---|
| un compte d'événements | **non** | `rng.chance(surDt(p))` puis `pop -= irange(1, 3)` |
| une saturation (`min`, `max`, un plafond) | **non** | `min(facture, col.menages)` — poste dominant |
| un taux constant sur la tranche | oui, exactement | les stocks, les salaires, l'agitation |

Le recensement des tirages quantifiés reste valable tel quel :

| mécanisme | reçoit `dt` | événement quantifié ? |
|---|---|---|
| `economy.tickColonie` | oui | **OUI** — `economy.js:719-730`, naissance et départ |
| `notables.tickNotables` | oui | **OUI** — `notables.js:233`, la relève d'une charge |
| `services.tickServices` | oui | non — `services.js:170` : au plus une demande à la fois par notable, c'est voulu |
| `economy.ajusterEmplois` | oui | non — un lissage continu |
| `justice.tickGeole`, `tickOrdrePublic` | oui | non — pas un seul tirage |
| `secteur.effetPresence` | oui | non — pas un seul tirage |
| `dirigeants.tickDirigeant` | oui | appelé à `dt = 24` fixe, donc jamais deux mailles |
| `factions`, `allegeance`, `base`, `squad` | non | hors sujet : ils tirent, mais à maille unique |

**`notables.js:233`** refait exactement la même faute que `economy.js` :
`rng.chance(dt === 1 ? q : 1 - Math.pow(1 - q, dt))` puis un seul remplacement.
Une ville lointaine ne peut donc changer de chef qu'une fois par tranche de
vingt-quatre heures, une ville proche vingt-quatre fois.

**Le recensement des saturations, lui, reste à faire** : c'est la tâche M0 bis.
Il ne se fait pas à la lecture — un `min` peut être inoffensif s'il ne mord
jamais, et un autre peut porter tout le défaut. Il se fait par l'erreur locale,
mécanisme par mécanisme, avec le mouchard qui a servi ici : compter les fois où
le plafond mord et ce qu'il retient, à `dt = 1` puis à `dt = 24`.

Une saturation connue et déjà instruite y attend : `min(veut, enRayon)` dans le
calcul de `facture`, qui porte le résidu de M0. Et un avertissement qui vaut
pour toutes — **la retirer n'est pas la corriger** : supprimée, elle fait passer
l'erreur locale de caisse de 4,81 à **315**, parce que facturer le besoin plutôt
que l'étal vide les bourses pour des marchandises qui n'existent pas.

## 8. Les tâches

- [x] **M1.** La primitive `combienDeFois` (`src/rng.js`, et non `economy.js` :
  `notables.js` en a besoin aussi). Huit tests, rouges d'abord — l'export
  n'existait pas. À `dt = 1` elle rend le même verdict *et* le même état de
  flux que `rng.chance(p)`, donc la brancher ne décale rien à la maille fine ;
  à `dt = 24` l'espérance vaut `24 p` à 5 % près sur quatre mille tirages, pour
  `p` valant 0,01, 0,05 et 0,12. Un test garde la trace du biais corrigé :
  l'ancienne forme plafonnait à 0,71 départ là où il en part 1,20.
- [x] **M4.** *(fait avant M2 : son critère est « sous le plancher », et le
  plancher n'existait pas.)* `banc --maille` partie 2 mesure maintenant huit
  graines mises en commun contre un plancher établi par huit placebos (deux
  mailles fines, protocole identique), et écarte grandeur par grandeur les
  villes dont les deux côtés sont sur la même borne. Coût : 27 s.
  **Il a renversé le diagnostic du chantier** — voir §1 bis et §2 a.
- [x] **M0.** Le circuit ménages↔ville se refait `dt` fois par tranche : la note
  de l'heure, puis la paie de l'heure. **Cible tenue sur trois grandeurs, pas
  sur cinq** — l'erreur locale à `dt = 24` :

  | | avant | après | cible 0,1 |
  |---|---:|---:|---|
  | rations | −7,200 | **−0,010** | tenue (÷ 700) |
  | agitation | −0,034 | **+0,000** | tenue |
  | caisse | +4,810 | **+1,108** | **non tenue** (÷ 4,3) |
  | ménages | −4,818 | **−0,913** | **non tenue** (÷ 5,3) |

  Le coût est nul — ×1,03 contre le code d'avant, sur trois relevés (×0,996,
  ×1,039, ×1,041). Il ne l'était pas d'emblée : écrite en boucle naïve avec
  `encaisser` et `debourser` à chaque tour, la correction coûtait ×1,10 à ×1,15.
  Deux mesures l'ont ramenée — une **voie rapide en forme close**, exacte parce
  que les deux bourses évoluent d'un pas constant et que leur minimum sur la
  tranche est donc à la première ou à la dernière heure (54 % des tranches la
  prennent), et l'**inlining** de la boucle pour les 46 % restants, qui à elle
  seule pesait 7,4 % du tick. Vérifié : monde identique octet pour octet sur
  trois graines × 2 000 heures avant/après l'inlining.
- [x] **M0 bis.** Le résidu de M0 n'était pas une saturation : **c'étaient les
  prix**. Séparés numériquement sur la facture d'une journée — 1,60 crédit de
  dérive des prix contre −0,09 pour la saturation de l'étal. Le prix dépend de
  ce que les gens ont en poche et de ce qui reste sur l'étal ; les deux bougent
  dans la journée, et la tranche facturait tout au prix du premier instant.

  Corrigé par la **règle du point milieu** : on projette bourse et étal à
  mi-tranche et on facture là. L'erreur d'une méthode d'ordre un est
  proportionnelle au pas ; évaluée au milieu, ce terme s'annule.

  | erreur locale, `dt = 24` | avant M0 | après M0 | après M0 bis |
  |---|---:|---:|---:|
  | caisse | +4,810 | +1,108 | **+0,000** |
  | ménages | −4,818 | −0,913 | **+0,000** |
  | rations | −7,200 | −0,010 | −0,010 |
  | agitation | −0,034 | +0,000 | +0,000 |

  Et à `dt` = 2, 4 et 8 aussi. La méthode a été bornée avant d'être écrite : en
  donnant à la tranche le **vrai** état de mi-journée (obtenu en trichant, par
  un clone joué douze heures), l'erreur tombait à −0,055. Le prédicteur réel
  fait aussi bien. Sans cette borne, on aurait pu écrire trois cents lignes pour
  découvrir que l'idée ne valait rien.
- [x] **M0 ter — le recensement des saturations, fait, et les cinq correctifs
  livrés.** Août 2026.

  **Le critère est tenu sur les cinq grandeurs, et c'est la première fois.**

  | | avant | après |
  |---|---|---|
  | invariance (§5, partie 2) | **2 / 5** sous le plancher | **5 / 5** |
  | erreur locale à `dt` = 24 | rations −0,010 · caisse +0,000 | rations **+0,000** · caisse **+0,001** |
  | comptes remués (partie 4) | −2,0 % | −2,8 % |
  | coût | — | **×1,056** de la livraison précédente (plafond 1,08) |

  Et le monde, six graines × six mille heures, contre la révision d'avant :
  **524 villes contre 460, 112 495 habitants contre 105 932, satiété 0,839
  contre 0,807, villes à la diète 54 % contre 57 %, trésor médian 46 370 contre
  4 716.** L'invariant comptable reste exact. Le monde n'est pas seulement plus
  régulier, il est plus riche — parce qu'une ville qui mangeait sans payer
  n'enrichissait personne.

  ### Le plan d'origine était faux, et c'est la leçon principale

  Cette tâche disait : « la seule issue mesurée est le sous-pas », et tenait son
  prix pour le seul obstacle. **Les deux moitiés de la phrase étaient fausses.**

  Le relevé qui la fondait — « l'erreur locale sur les rations vaut +0,000 à
  `dt` = 2 et `dt` = 4 » — avait été pris **avant** les correctifs 1 et 2,
  c'est-à-dire quand plusieurs erreurs se compensaient encore. Correctifs
  appliqués, le sous-pas rendait +0,017 à un pas de deux et **+0,109 à un pas de
  quatre**, donc hors critère ; et il coûtait vingt-quatre passes de prix là où
  il y en a deux, soit de l'ordre de **+95 % de tick** pour un budget de 17 %.

  Il ne fallait pas plus de budget. Il fallait arrêter d'échantillonner.

  ### Les cinq correctifs, et ce que chacun a rendu

  Chacun a été attribué par témoin négatif **avant** d'être écrit, jamais
  l'inverse. L'erreur locale des rations à `dt` = 24, correctif après correctif :

  | | correctif | rations |
  |---|---|---:|
  | départ | (état livré, erreurs compensées) | −0,010 |
  | 1 | la récolte du jour entre dans l'étal facturé | +2,331 |
  | 2 | `servable` : l'intégrale close du plafond de l'étal | +2,331 |
  | 3 | les vivres servies heure par heure dans la boucle du circuit | +2,264 |
  | 4a | `servable` tient compte de la part réellement emportée | +1,382 |
  | 4b | la part prédite compte **les salaires qui tombent** | +0,650 |
  | 4c | la reconversion des métiers déplacée en fin de tick | +0,544 |
  | 5 | `valeurTranche` : la facture intégrée au lieu d'être échantillonnée | **+0,000** |

  **1 et 2** sont ceux que le recensement ci-dessous avait déjà trouvés.
  `servable` est vérifiée exacte contre la boucle sur vingt-huit mille tirages
  et sept pas, à 1e-9.

  **3** — les vivres se servent dans le circuit, pas après lui. Le témoin
  négatif était sans ambiguïté : forcer `part` à 1 faisait tomber l'erreur de
  +2,331 à −0,011. Ce n'était ni les prix, ni le serrage de ceinture (gelé, il
  ne rendait que 2,331 → 2,032), ni la population. C'était que la part servie
  était une **moyenne de tranche** appliquée à un service qui sature.

  **4a** — un étal qu'on n'achète qu'à moitié se vide deux fois moins vite, donc
  il reste à vendre deux fois plus longtemps, donc la ville facture davantage.

  **4b** — la part prédite regardait la bourse du matin. Or une ville fauchée vit
  de la paie de l'heure : 1 604 crédits dépensés dans la journée sur la ville
  tracée, pour une bourse de départ presque vide. Une addition, et le correctif
  le plus rentable des sept.

  **4c** — la reconversion des métiers était un pur décalage de phase.
  `PERIODE_EMPLOIS` vaut vingt-quatre heures et `ajusterEmplois` était appelée
  **en tête** de `tickColonie` : à la maille fine la reconversion tombe donc au
  vingt-quatrième appel, une fois la journée produite aux anciens métiers ; à la
  maille grossière elle tombait au premier instant, et les vingt-quatre heures
  étaient produites aux **nouveaux**. Vingt-trois heures sur vingt-quatre du
  mauvais côté du changement. Déplacée après `productionColonie`.

  ### 5. La facture s'intègre — c'est le correctif qui débloque tout

  Le résidu a été découpé en séparant la quantité facturée du prix :

  | ville | facture fine / grossière | quantité | prix moyen |
  |---|---|---|---|
  | Nœud-Dix-Sept | 3 609 / 3 289 | 198,3 / 196,1 | **18,196 / 16,774** |
  | Relais-Zéro | 1 557 / 1 384 | 132,7 / 130,6 | **11,738 / 10,599** |

  Les quantités concordent à un pour cent. C'est le **prix moyen** qui est huit à
  dix pour cent trop bas.

  **L'idée a été bornée avant d'être écrite**, comme M0 bis : en donnant à la
  tranche le vrai prix moyen de la journée — obtenu en trichant, par un clone
  joué heure par heure —, l'erreur des rations tombait de +0,533 à **+0,067**. Le
  prix était donc toute l'histoire restante, et il valait la peine de l'intégrer.

  **Deux fausses pistes, écartées par la mesure, et elles valent d'être dites :**

  - **Gauss à deux points au lieu du point milieu** : +0,544 → +0,533. Deux pour
    cent, pour une passe de prix de plus. Une quadrature d'ordre supérieur ne
    sert à rien quand le problème n'est pas *où* on échantillonne.
  - **Le prix moyen dans le temps, intégré exactement** : +0,533 → **+0,634**,
    donc *pire*. Il donne le même poids à l'heure où la ville sert sa pleine
    demande à bas prix et à l'heure où elle ne sert plus que son arrivage au
    prix plafond. Intégrer exactement la mauvaise quantité fait pire
    qu'échantillonner grossièrement la bonne.

  Ce qu'il fallait, c'est l'intégrale de **la quantité par le prix**.
  `prixUnitaire` vaut `base × f(tension) × humeur / cours` avec
  `tension = cible × solvabilité / (stock + 0,35 cible)`. Sur la tranche seul le
  stock bouge, et il bouge droit : en posant `u = stock + 0,35 cible`, le facteur
  vaut `(A/u)^0,85` et sa primitive en `u` est `A^0,85 × u^0,15 / 0,15`. Les deux
  bornes du facteur se franchissent au plus une fois chacune puisque `u` est
  monotone, donc l'intégrale se découpe en trois morceaux au plus. C'est
  `integreFacteur`, et `valeurTranche` la pondère par la quantité servie sur
  chacune des deux phases — pleine demande tant que le grenier tient, puis
  arrivage seul.

  **Et une dernière marchandise résistait : les rations, à 0,90 du prix vrai
  quand les huit autres étaient déjà à 1,00.** La cause : le grenier se vide de
  ce que la ville **sert** — le besoin entier — alors que la facture porte sur ce
  que les habitants **achètent**, serrage de ceinture compris. Confondre les deux
  laissait l'étal des vivres trop plein dans la projection, donc leur prix trop
  bas. `valeurTranche` reçoit donc la vidange réelle à part de la demande
  facturée. C'est cette distinction qui fait passer l'erreur de +0,538 à +0,000.

  ### Ce qu'il ne faut pas « corriger »

  Après épuisement du grenier, `servable` rend l'arrivage. Une lecture naturelle
  dit que le régime d'équilibre devrait être `arrivage / part`, puisque l'étal ne
  perd que ce qu'on lui achète. **Écrit et mesuré : l'erreur des rations passe de
  +0,000 à +0,205.** Le grenier du moteur se vide de ce qu'il *sert*, pas de ce
  qu'on lui achète. Un test grave la ligne pour que personne ne la retourne.


  ### Le recensement, fait — trois saturations, deux corrigées, une chiffrée

  Mené par témoin négatif, comme le prescrit §7 : neutraliser un plafond à la
  fois et lire l'erreur locale. Résultat, à `partSalariale = 0,55` sauf mention.

  **1. Les rations étaient exclues de la production en rayon — et c'est un bug,
  pas un défaut de maille.** `facture` comptait `stock + production × dt` pour
  tout, sauf pour les rations où elle comptait le stock seul. Or la récolte du
  jour entre bel et bien dans ce qui est servi (`disponible`). Une ville qui
  récolte et n'a plus de grenier mangeait donc **sans que personne ne paie** :
  mesuré sur trente heures, les ménages *montent* de 1 476 à 1 683 pendant que
  la caisse se vide de 5 904 à 5 654. La moitié du circuit manquait.

  **2. Le plafond de l'étal se regroupait au lieu de s'intégrer.** Heure par
  heure la ville sert `min(c, stock + p)` ; la tranche écrivait
  `min(c·dt, stock + p·dt)` — la somme des minimums remplacée par le minimum des
  sommes. L'intégrale est close, et vérifiée exacte à 1e-13 contre la boucle sur
  200 000 tirages :

  ```js
  function servable(stock, parHeure, veutParHeure, dt) {
    if (dt === 1) {
      const dispo = stock + parHeure;
      return veutParHeure < dispo ? veutParHeure : dispo;
    }
    const manque = veutParHeure - parHeure;
    const tout = veutParHeure * dt;
    if (manque <= 0) return tout;
    const tenu = manque * dt;
    return parHeure * dt + (stock < tenu ? stock : tenu);
  }
  ```

  Appliquée aux deux passes de `facture` et au service des vivres, elle met
  l'erreur locale de **caisse à +0,003 et de ménages à +0,000** (contre +0,101 et
  −0,101). À `dt = 1` elle rend exactement ce que rendait l'ancien code pour tout
  ce qui n'est pas des rations : la maille fine ne bouge pas d'un bit.

  **3. Ce qui reste, et pourquoi ça s'arrête là.** Corriger 1 et 2 fait passer
  l'erreur sur les rations de −0,010 à **+0,987** — pire qu'avant. Ce n'est pas
  une régression : **l'ancien code portait plusieurs erreurs qui se
  compensaient**, et n'en redresser qu'une partie découvre les autres. C'est
  aussi ce qui explique que le défaut ait triplé en passant à
  `partSalariale = 0,70` : la compensation était fortuite, donc fragile.

  Le résidu a été localisé par témoin négatif : forcer `part = 1` le fait tomber
  de +0,987 à −0,154. Il vient donc de `facture`, qui dépend des prix, du
  serrage de ceinture et de la bourse des ménages — **trois grandeurs qui bougent
  dans la journée**. Le point milieu en corrige le premier ordre ; il en reste un
  second, et aucune forme close ne s'en sort parce que les trois se bouclent
  l'une sur l'autre.

  **La seule issue mesurée est le sous-pas.** L'erreur locale sur les rations
  vaut **+0,000 à `dt = 2` et `dt = 4`**, +0,669 à 8, +0,987 à 24. Le circuit des
  vivres ne supporte pas une tranche de vingt-quatre heures : il lui faut son
  propre pas, plafonné à quatre.

  Ce n'est pas fait, et pour une raison qu'il faut dire : ça coûte. Six
  sous-passes pour une ville lointaine, sur le bloc qui pèse 14 % du tick en
  propre — et la garde de vitesse est actuellement **incapable de trancher** sur
  cette machine (±28 % de dispersion). Livrer une multiplication par trois du
  chemin le plus chaud sans pouvoir la mesurer serait pire que d'attendre.

  Le code des points 1 et 2 est écrit, testé et mesuré ; il attend le sous-pas
  pour être livré d'un bloc. Le test qui démontre le bug n° 1 :

  ```js
    // Chantier MAILLE, M0 ter : le recensement des saturations. Celle-ci a été
    // trouvée par témoin négatif, en cherchant pourquoi le bon réglage de la
    // satiété cassait l'invariance à la maille.
    //
    // `facture` ne compte que ce qui peut être servi — c'est juste, facturer le
    // besoin plutôt que l'étal viderait les poches pour des marchandises
    // inexistantes. Mais pour les rations, et pour elles seules, l'étal était
    // réduit au **stock d'avant la tranche** : la récolte de la journée n'y
    // entrait pas. Or elle entre bel et bien dans ce qui est servi (`disponible`,
    // plus bas dans la même fonction).
    //
    // Une ville qui produit de quoi manger et n'a plus de grenier mangeait donc
    // sans que personne ne paie : les ménages ne se vidaient pas, la caisse ne se
    // remplissait pas, et la moitié du circuit disparaissait.
    const sM0 = nouvellePartie(4242, { maintenant: 0 });
    const ville = sM0.world.colonies.find(
      (c) => !c.ruine && !c.avantPoste && c.pop > 200
        && productionColonie(sM0.world, c).rations > 0.5);
    // Trente heures, pas une : cette ville est loin du joueur, elle avance par
    // tranches de vingt-quatre. Un seul tick ne la faisait pas tourner du tout —
    // et le décor semblait alors prouver le défaut alors qu'il ne prouvait rien.
    const menagesAvant = ville.menages;
    const caisseAvant = ville.caisse;
    for (let i = 0; i < 30; i++) {
      ville.stock.rations = 0;
      tick(sM0);
    }
    ok(ville.satiete > 0.9, 'une ville qui récolte mange, grenier vide ou non',
      `satiété ${ville.satiete.toFixed(3)}`);
    ok(menagesAvant - ville.menages > 0,
      'et elle le paie — la récolte du jour n’est pas gratuite',
      `ménages ${Math.round(menagesAvant)} → ${Math.round(ville.menages)}`);
    ok(ville.caisse > caisseAvant,
      'ce qui sort des poches entre en caisse : le circuit se boucle',
      `caisse ${Math.round(caisseAvant)} → ${Math.round(ville.caisse)}`);
  ```
- [x] **M2. `combienDeFois` est branchée sur la naissance et le départ.**

  **L'instrument d'abord, parce que c'était lui le blocage.** Les deux mesures
  existantes ne voyaient rien : l'écart de population sur quarante jours est
  sous le plancher de bruit, et l'erreur locale sur une journée est nulle parce
  que l'événement est trop rare pour se voir en un jour. Le défaut se démontrait
  au tableau et nulle part ailleurs.

  Celui qui manquait est la partie 4 de `banc --maille`, et c'est la seconde
  piste que cette tâche proposait : **on compte les mouvements au lieu de
  comparer deux trajectoires**. Un départ fait perdre un à trois habitants, une
  naissance en fait gagner zéro à deux ; on somme donc les mouvements de
  population en valeur absolue sur un mois, sous les deux mailles, depuis le
  même état. C'est un volume, pas une différence de ville à ville — **donc
  aucun plancher de bruit à franchir**.

  Ce qu'il a rendu tout de suite :

  | | habitants remués par ville et par mois |
  |---|---:|
  | maille fine | 39,40 |
  | maille grossière | 23,51 |
  | écart | **−40,3 %** |

  Une ville lointaine remuait quarante pour cent de gens en moins qu'une ville
  proche dans le même état. Après branchement : **−2,0 %**, sous le seuil de
  cinq pour cent que l'instrument s'est donné.

- [x] **M3. `notables.js` — mesuré, et laissé tel quel.**

  Même forme de défaut, mais `q` vaut `0,00006 + vieillesse × 0,0006` : à ces
  valeurs, `24 q` et `1 − (1−q)^24` diffèrent de **moins d'un pour cent**.
  Mesuré sur trois mois, six répétitions, une ville à deux notables : les deux
  mailles relèvent le même nombre de charges, et le test le vérifie.

  Le brancher coûterait vingt-quatre tirages par notable et par tranche là où un
  seul suffit, et décalerait tout le flux du monde — pour corriger un demi
  pour cent d'un événement qui arrive une fois par décennie de jeu. **On ne le
  branche pas, et c'est mesuré plutôt que supposé.** Le test reste, lui : le
  jour où quelqu'un monte `q`, il tombera.
- [x] **M5.** Livraison : `CIBLES.json` resserré sur l'état mesuré, coût du tick
  chiffré contre la livraison précédente, et le résidu de rétroaction écrit
  noir sur blanc plutôt que passé sous silence.

  **Les cibles, resserrées sur le monde mesuré** (6 graines × 6 000 h, à la
  livraison des prix libres) : villes 368 ∈ [260, 430], bourses 31 ∈ [24, 36],
  endettées 244 ∈ [160, 280], écrasées 10/36, satiété 0,979, effondrées 12,
  saisies 782, convois 15 823, guerres 18 — toutes les fourchettes rebasées
  aux lots I et I bis couvrent l'état mesuré avec les marges du calage du
  lot F. Une seule était restée sur l'ancien monde : le plancher de
  population, 45 000, calé sur les 57 893 habitants du lot F (×0,78) — dans
  un monde qui en porte 159 359, il ne gardait plus rien. Recalé à
  **120 000** (×0,75 du mesuré, même logique de marge), plafond toujours
  absent : la démographie a le droit de tuer, pas de s'effondrer sans témoin.

  **Le coût du tick, chiffré contre la livraison précédente** : 188 µs
  estimés au protocole calibré (rapport ×1,007 sur le témoin 5cc3766 mesuré
  dans la même minute), rattrapage maximal vécu 3,20 s pour un plafond de
  3 600 ms. Le prix payé par la livraison des prix libres — ×1,446 mesuré à
  l'alternance — est consigné dans la garde de vitesse, et sa dette a son
  chantier : M6, ci-dessous.

  **Le résidu de rétroaction, noir sur blanc** : la maille grossière ne
  rejoue pas les heures, elle les intègre — il reste donc un écart. Mesuré au
  juge de la partie 2 (la même ville, quarante jours, huit placebos) :
  rations −0,275 par jour pour un plancher de bruit de ±0,55, caisse −0,192
  pour ±0,23 — et sur quarante jours la dérive cumulée est de **cinq crédits
  pour un plancher de seize**, là où un biais de deux crédits par jour en
  aurait accumulé quatre-vingts. Le résidu est **auto-correcteur, pas
  biaisé** : c'est la propriété qui autorise à jouer loin des villes sans que
  le monde dépende de l'endroit où l'on se tient.
- [ ] **M6. Le pas adaptatif par régime — rembourser le ×1,44.** La levée des
  bornes de prix coûte ×1,446 parce que les villes dont la bourse tourne plus
  de `TRANCHE.rotationBourse` fois par jour prennent la boucle à reprix : la
  vérité horaire, vingt-quatre pow par jour et par denrée, même à mille
  heures du joueur. Or la frontière est une constante nommée du moteur — elle
  sert aujourd'hui à choisir la boucle, elle doit servir à **choisir le
  pas** : découper la tranche au point où le régime bascule (l'heure où la
  caisse mord, calculable en forme close) et intégrer chaque morceau en forme
  close, au lieu de rejouer toutes les heures une à une.

  Marche à suivre, dans l'ordre : **(1)** mesurer où va le temps — la part de
  chaque voie (rapide / simple / reprix) en nombre de villes et en
  microsecondes, métrique ajoutée à `jouer()` dans le banc, pas dans un
  script à côté ; **(2)** ne s'attaquer qu'au poste dominant ; **(3)** chaque
  variante jugée par la partie 2 (cinq grandeurs sous le plancher des huit
  placebos) ET la vitesse à l'alternance, jamais l'un sans l'autre.

  **(1) fait — l'attribution, mesurée** (compteurs `VOIES` dans le circuit,
  colonne « rapide/simple/reprix » du banc, 6 graines × 6 000 h) : sur les
  tranches à dt > 1, **58 % prennent la voie rapide, 29 % la boucle simple,
  13 % la boucle à reprix — et ces 13 % rejouent 1 929 000 heures une à
  une**, 86,7 heures par tranche en moyenne : les villes lointaines, aux pas
  de 24 heures et plus, au plein tarif horaire. En brut, couper tout le
  routage au reprix (`rotationBourse=0`) rend 475 µs contre 567 : la boucle
  pèse **~16 % du tick total** — la supprimer entière ne rendrait donc que
  ~157 µs estimés, déjà au-dessus du critère. C'était le premier
  avertissement.

  **(2) et (3) faits — deux étages construits, mesurés, et COUPÉS sur
  verdict.** L'appareillage vit dans le circuit derrière `TRANCHE.tolSaut`
  (0 = coupé, défaut) :

  - **les fenêtres de reprix** — les `pow` ne se paient qu'aux ancres, les
    heures d'une fenêtre prennent le prix extrapolé le long de sa pente
    dln(fH)/dh (solvabilité, tension de chaque étal — régime demande ET
    régime pénurie —, grogne), fenêtre bornée par la dérive tolérée, par
    l'étal qui croiserait sa demande, refermée à toute bascule de régime.
    **Qualité : indiscernable** — les médianes d'erreur locale sont
    identiques au millième à celles du reprix intégral sur cinq
    échantillons, la partie 2 rend cinq sur cinq sous les planchers de
    placebo. **Vitesse : ×0,98 au protocole calibré — rien.** Les pow ne
    sont pas le poste dominant de la boucle ; la sortir des denrées mortes
    (liste des actives, arrivages en forme close — exact au bit) ne suffit
    pas non plus.
  - **le saut de fin de fenêtre** (`TRANCHE.sautFin`) — les heures restantes
    d'une fenêtre au régime d'argent stable (bénin : la note se paie ;
    épinglé : la ville pauvre au point fixe, la bourse cycle sur la paie)
    s'appliquent en forme close, prix au trapèze. **Vitesse : ×1,04 —
    négatif**, l'intendance coûte plus que les heures qu'elle saute. **Et la
    queue monétaire bouge : 12 monnaies effondrées → 2, sur les mêmes
    graines, toutes dans le même sens** — pendant que les fenêtres seules en
    laissent 10~12. Un remboursement qui change ce que le monde a le droit
    de vivre n'est pas un remboursement.

  **Ce qui reste vrai et livré** : les compteurs d'attribution, la liste des
  denrées actives et la paie d'avant-poste en forme close (exacts au bit —
  `tolSaut=0` reproduit le monde de la livraison des prix libres à
  l'identique, gardes comprises), le décor de la colonne sans terre
  reconstruit pour tester la faim au lieu de parier sur une trajectoire, et
  les planchers de l'erreur locale **recalés sur le bruit d'échantillon
  mesuré** : le modèle PUR rend une médiane de caisse entre −1,351 et +0,642
  selon que le monde-échantillon s'échauffe 396 ou 404 ticks — l'ancien
  ±0,23 rejetait le moteur inchangé sur l'échantillon d'à côté (caisse
  ±0,23 → ±1,5, ménages ±0,25 → ±0,35, rations inchangé, mesures dans le
  test).

  **BLOCAGE, consigné comme le critère l'exige** : par cette voie — geler ou
  extrapoler le prix — le remboursement plafonne à ~zéro, loin des 150 µs.
  La prochaine tentative devra chercher ailleurs : le coût est dans les
  flux horaires de 1,9 million d'heures et dans ce qui entoure la boucle,
  pas dans les sept pow. Pistes non explorées : élargir le pas des tranches
  lointaines (dt au-delà de 24 quand la ville est stable — c'est le niveau
  de détail lui-même, pas le circuit), et le profil hors-boucle
  (caravanes 19 %, factions 16 % du tick).

  Critère : **us estimé ≤ 150 µs** au protocole calibré (rendre au moins la
  moitié de la dette : 129 → 187 aujourd'hui), partie 2 cinq sur cinq, dix
  gardes tenues, invariant exact. Si le remboursement plafonne au-dessus de
  150, c'est un blocage à consigner avec la mesure — pas un critère à
  élargir, et pas une raison de céder un point de qualité.
