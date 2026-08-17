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
| invariance | `banc --maille`, partie 2 : les cinq écarts médians **sous le plancher de bruit** établi par placebo. « À zéro » était une cible mal posée : deux tirages honnêtes ne rendent jamais la même ville, et exiger l'impossible, c'est ne rien vérifier | **2 sur 5** (pop, agitation) — était 1 sur 5 |
| erreur locale | l'erreur d'**une journée** depuis un état identique, grandeur par grandeur et pas par pas. C'est le critère net : il ne mélange pas le défaut de maille avec ce que quarante jours de chaos en font, et il porte son propre témoin (`pas 1` doit rendre zéro) | **3 sur 5** sous 0,1 ; reste caisse +1,11 et ménages −0,91 |
| invariance dans le monde | `banc --maille`, partie 1 : population médiane à ±3 habitants et villes debout à ±1 | +15 (était +28) et 43/48 |
| coût | la garde de vitesse : rapport à la livraison précédente | **×1,03** pour M0 — tenu |
| le monde tient | les dix gardes de `CIBLES.json`, resserrées après coup sur l'état mesuré | à remesurer |
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
- [ ] **M0 ter.** Le recensement des saturations (§7), par l'erreur locale et le
  mouchard. Une est déjà connue et laissée en place : `min(veut, enRayon)` dans
  `facture`. Elle ne pèse que −0,09 par jour, et **la retirer fait exploser
  l'erreur à +315** (témoin négatif mesuré) — elle est porteuse, il faudrait
  l'intégrer, pas la supprimer.

  ### ⛔ AOÛT 2026 — LE SOUS-PAS EST MORT, ET C'EST MESURÉ

  **Le plan de bataille de cette tâche ne marche pas.** Il tenait en une
  phrase — « la seule issue mesurée est le sous-pas » — et le seul obstacle
  supposé était son prix. La tâche a été menée jusqu'au bout, quatre correctifs
  écrits et mesurés, et la conclusion est ailleurs : **même gratuit, le sous-pas
  n'atteindrait pas le critère à un pas de quatre, et à un pas de deux il coûte
  environ le double du tick.** Il faut une autre idée. Ce qui suit est tout ce
  qu'il faut pour la chercher sans refaire le chemin.

  **Ce qui a été livré dans le code, mesuré, puis retiré.** Rien n'est poussé :
  le correctif complet vit ici, parce qu'il laisse la garde des rations rouge.

  | | rations à `dt` = 24 | caisse | ménages | invariance §5 (partie 2) |
  |---|---:|---:|---:|---|
  | avant | −0,010 | +0,000 | +0,000 | **2 / 5** sous le plancher |
  | après les quatre correctifs | **+0,533** | +0,001 | +0,000 | **4 / 5** sous le plancher |

  Les deux critères de §5 bougent **en sens contraire**, et c'est la décision
  qu'il faut prendre : l'invariance dans le monde passe de deux grandeurs sur
  cinq à quatre, pendant que l'erreur locale des rations passe de 3 sur 5 à
  2 sur 5. Le −0,010 d'avant n'était pas une réussite : c'était la somme
  d'erreurs qui s'annulaient, et cette page le disait déjà — « l'ancien code
  portait plusieurs erreurs qui se compensaient ». On échange un zéro fortuit
  contre un demi honnête, et quatre bugs en moins.

  #### Les quatre correctifs, et ce que chacun a rendu

  Chacun a été attribué par témoin négatif avant d'être écrit, jamais l'inverse.

  | | correctif | rations à `dt` = 24 |
  |---|---|---:|
  | départ | (état livré) | −0,010 « vert » |
  | 1 | la récolte du jour entre dans l'étal facturé | +2,331 |
  | 2 | `servable` : l'intégrale close du plafond de l'étal | +2,331 |
  | 3a | les vivres servies heure par heure dans la boucle du circuit | +2,264 |
  | 3b | `servable` tient compte de la part réellement emportée | +1,382 |
  | 3c | la part prédite compte **les salaires qui tombent** | +0,650 |
  | 3d | la reconversion des métiers déplacée en fin de tick | +0,544 |
  | — | Gauss à deux points sur le prix (essayé, **rejeté**) | +0,533 |

  **1 et 2** sont ceux que cette page décrivait déjà ; leur code est plus haut et
  il est juste. `servable` a été vérifiée exacte contre la boucle sur vingt-huit
  mille tirages et sept pas, à 1e-9.

  **3b — l'étal qu'on n'achète qu'à moitié se vide deux fois moins vite.** La
  forme close vidait le grenier au rythme de la demande entière. Une ville dont
  les gens ne peuvent payer que 42 % de la note n'en voit partir que 42 %, garde
  donc de quoi vendre bien plus longtemps, et facture davantage. Le grenier tient
  `stock / (veut × part − arrivage)` heures :

  ```js
  export function servable(stock, parHeure, veutParHeure, dt, part = 1) {
    if (dt === 1) { const d = stock + parHeure; return veutParHeure < d ? veutParHeure : d; }
    const manque = veutParHeure - parHeure;
    const tout = veutParHeure * dt;
    if (manque <= 0) return tout;
    if (part >= 1) {
      const tenu = manque * dt;
      return parHeure * dt + (stock < tenu ? stock : tenu);
    }
    const vide = veutParHeure * part - parHeure;
    if (vide <= 0) return tout;
    const tenu = stock / vide;
    return tenu >= dt ? tout : veutParHeure * tenu + parHeure * (dt - tenu);
  }
  ```

  **3c — la part prédite ignorait les salaires.** `min(1, menages / facture)`
  regarde la bourse du matin. Or une ville fauchée vit de la paie de l'heure :
  sur la ville tracée, 1 604 crédits dépensés dans la journée pour une bourse
  de départ presque vide. Remplacé par
  `min(1, (menages + salaireHoraire × dt) / facture)` : **c'est le correctif le
  plus rentable des quatre**, de +1,382 à +0,650 pour une addition.

  **3d — la reconversion des métiers était un pur décalage de phase.**
  `PERIODE_EMPLOIS` vaut vingt-quatre heures et `ajusterEmplois` était appelée
  **en tête** de `tickColonie`. À la maille fine la reconversion tombe donc au
  vingt-quatrième appel, une fois la journée produite aux anciens métiers ; à la
  maille grossière elle tombait au premier instant, et les vingt-quatre heures
  étaient produites aux **nouveaux**. Vingt-trois heures sur vingt-quatre du
  mauvais côté du changement. Sur une ville : 186,65 rations récoltées à la
  maille fine contre 180,76 à la grossière — tout l'écart de cette ville-là.
  Le correctif est de la déplacer après `productionColonie`, et il ne coûte
  rien.

  **Il ne tient pas debout tout seul, et c'est mesuré, pas supposé.** Livré
  isolément — sans les points 1, 2 et 3 — il fait passer l'erreur locale de
  caisse de +0,000 à **+0,575** et casse deux décors de plus. Il corrige un
  défaut réel, mais l'ancien code s'appuyait dessus pour en compenser d'autres.
  Il part donc avec le bloc, ou il ne part pas.

  #### Ce qui reste, attribué au crédit près

  Le résidu a été découpé sur les villes les plus fautives, en séparant la
  quantité facturée du prix :

  | ville | facture fine / grossière | quantité | prix moyen |
  |---|---|---|---|
  | Nœud-Dix-Sept | 3 609 / 3 289 | 198,3 / 196,1 | **18,196 / 16,774** |
  | Relais-Zéro | 1 557 / 1 384 | 132,7 / 130,6 | **11,738 / 10,599** |

  **Les quantités sont bonnes à un pour cent près. C'est le prix moyen qui est
  huit à dix pour cent trop bas.** Le prix se lit sur un état projeté — bourse
  et étal à mi-tranche — et cette projection est **droite** là où la réalité
  **sature** : une bourse fauchée ne descend pas linéairement vers zéro, elle
  oscille entre zéro et la paie de l'heure.

  Deux idées essayées là-dessus, deux échecs mesurés, et ils valent d'être dits
  parce qu'ils ferment des portes :

  - **Gauss à deux points au lieu du point milieu** : +0,544 → +0,533. Deux pour
    cent, pour une passe de prix de plus. Une quadrature d'ordre supérieur ne
    sert à rien quand c'est la **trajectoire** qui est fausse et non le point où
    on l'évalue. Rejeté.
  - **Plancher de la bourse projetée à une demi-heure de salaire** : aucun effet,
    au chiffre près. `SOLVABILITE.plancher` mord déjà dans ces villes-là, donc
    la solvabilité est identique des deux côtés — le prix ne vient pas de la
    bourse mais de l'étal. Rejeté.

  #### Et voilà pourquoi le sous-pas est mort

  L'erreur des rations, correctifs appliqués, pas par pas :

  | pas | 2 | 4 | 8 | 24 |
  |---|---:|---:|---:|---:|
  | rations | **+0,017** | +0,109 | +0,185 | +0,533 |

  Un sous-pas à quatre **ne tient pas le critère** (0,109 pour 0,1). Il faut
  descendre à deux. Or le coût se compte : la seconde passe de prix, à elle
  seule, vaut ×1,044 du tick. Un sous-pas à deux, c'est douze tranches de deux
  heures à deux passes chacune, soit **vingt-quatre passes de prix là où il y en
  a deux** — de l'ordre de **+95 % de tick**. À quatre : douze passes, +44 %, et
  le critère toujours pas tenu. Le budget disponible est de 17 %.

  La phrase « la seule issue mesurée est le sous-pas » de la version précédente
  reposait sur un relevé pris **avant** les correctifs 1 et 2, quand les erreurs
  se compensaient encore et que le pas de deux rendait 0,000. Elle est fausse.

  #### Ce qu'il faudrait chercher à la place

  Une seule chose manque : **un prix de tranche qui ne passe pas par une
  trajectoire projetée.** Trois pistes, aucune instruite, aucune engagée :

  - la moyenne réalisée de la tranche précédente, pondérée par les quantités —
    un état de plus par ville et par marchandise, et un retard d'une tranche ;
  - une forme close du prix moyen sur la tranche, en intégrant `tension^0,85`
    analytiquement le long de la trajectoire de l'étal, qui est connue ;
  - accepter que le prix de tranche soit approché et **facturer au prix moyen
    réalisé** plutôt que de le prédire, en réordonnant le circuit.

  La deuxième est la plus proche de ce que ce chantier sait faire — `servable`
  est déjà exactement ça, mais sur la quantité au lieu du prix.

  **Ce que M0 ter coûte de ne pas faire, chiffré en août 2026** : douze points
  de satiété et trente mille habitants. Le recalibrage de l'économie a trouvé
  son réglage — `CAISSE.partSalariale` de 0,55 à 0,70, satiété 0,752 → 0,843,
  villes à la diète 59 % → 48 % — et n'a pas pu le livrer. À 0,70, l'erreur
  locale sur les rations passe de −0,010 à **−0,314** pour une cible à 0,1, et
  l'agitation sur quarante jours de +0,065 à +0,367 pour un plancher de bruit de
  ±0,141.

  La cause est le résidu que M0 bis a réduit sans l'éliminer : `facture` est
  calculée **deux fois** par tranche, au début et au milieu. Le terme qui reste
  est d'ordre deux, donc il grandit comme le carré de l'amplitude horaire —
  doubler ce qui passe dans les poches chaque heure le quadruple. Tant qu'il est
  là, l'économie ne peut pas être calibrée là où elle devrait l'être.

  M0 ter n'est donc plus une tâche d'hygiène. C'est ce qui débloque le monde.

  **Deuxième chantier bloqué par le même résidu, août 2026 : H1.** Indexer les
  revenus sur le cours (CHANTIER §Lot H) multiplie par 1,1 à 2,1 ce qui passe
  dans les poches chaque heure, et l'erreur locale à `dt = 24` passe de
  0,000 / 0,006 à −0,271 / +0,697. Deux chantiers indépendants butent donc
  maintenant sur ce terme d'ordre deux, et c'est lui qui interdit à une monnaie
  de pouvoir s'effondrer — ce que le propriétaire a demandé explicitement.

  **Et une chose découverte en le mesurant : la garde est verte en un seul
  point.** Le moteur tel qu'il est livré, même monde, même instrument :

  | | `dt` = 2 | `dt` = 4 | `dt` = 8 | `dt` = 24 |
  |---|---:|---:|---:|---:|
  | cours du monde | −0,172 / +0,181 | **−0,289 / +0,300** | −0,095 / +0,100 | **0,000 / +0,006** |
  | tous cours à 1 | −0,306 / +0,308 | −0,230 / +0,257 | −0,218 / +0,304 | **−0,661 / +0,662** |

  La suite n'assure que la case en bas à droite de la première ligne. À
  `dt = 4` le moteur en est à trois fois le seuil de §5 ; dans un monde dont les
  cours valent 1 — c'est-à-dire au début de chaque partie — il en est à six
  fois, au pas même que la garde surveille. Le commentaire du test affirme que
  l'erreur « reste à 0,000 pour `dt` valant 2, 4 et 8 » : ce n'est plus vrai, et
  rien ne dit quand ça a cessé de l'être, puisque aucune garde ne regardait ces
  trois pas. M0 ter doit donc livrer aussi la garde aux quatre pas — plus
  stricte, pas plus large.

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
- [ ] **M5.** Livraison : `CIBLES.json` resserré sur l'état mesuré, coût du tick
  chiffré contre la livraison précédente, et le résidu de rétroaction écrit
  noir sur blanc plutôt que passé sous silence.
