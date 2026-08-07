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

## 3 bis. Ce que M0 a fait au monde, mesuré

Le correctif change le monde à graine égale, et c'était annoncé. Sur le banc
(6 graines × 6 000 h), l'essentiel tient : 481 villes, 71 638 habitants, 361
nourries, 33 bourses, 18 055 convois, 20 guerres, 323 endettées — toutes dans
leurs fourchettes. Une garde en sort :

**Les créances passent de 47 à 78, pour un maximum de 70.** Ce n'est pas une
surprise à masquer : les ménages dépensent davantage sur la tranche, les villes
lointaines encaissent plus, et le crédit se déplace. La fourchette des créances
est déjà signalée dans `CIBLES.json` comme une dette du projet — « à instruire
par un chantier propre, pas à masquer en resserrant une garde ». Elle est donc
consignée dans les Blocages, et **pas élargie**.

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
- [ ] **M0 bis.** Le résidu de M0, et il est instruit : `facture` est calculée
  **une fois pour la tranche entière**, avec `min(veut, enRayon)` où
  `enRayon = stock + prod × dt`, et des prix relus une seule fois. Deuxième
  saturation, autre mécanisme. Attention : la retirer telle quelle fait
  exploser l'erreur à +315 (témoin négatif mesuré) — elle est porteuse, il faut
  l'intégrer, pas la supprimer. Plus le recensement des autres saturations (§7),
  par l'erreur locale et le mouchard.
- [ ] **M2.** Brancher `combienDeFois` sur `economy.js:719-730` (naissance,
  départ). **Le critère est à trouver, et c'est un blocage à part entière** :
  l'écart de population sur quarante jours est sous le plancher (−2 pour ±3), et
  son erreur locale est nulle à tous les pas parce que l'événement est trop rare
  pour se voir en un jour. Le défaut est réel — il se démontre au tableau, pas à
  la mesure — mais aucun des deux instruments existants ne le voit. Il faut donc
  d'abord **un instrument qui le voie** : l'erreur locale sur une fenêtre plus
  longue qu'un jour et plus courte que quarante, ou le simple comptage des
  départs et naissances par ville et par mois sous les deux mailles. Le second
  est plus direct et se mesure sans plancher : `24 p` contre `1 − (1−p)^24`.
- [ ] **M3.** Brancher `notables.js:233` (relève d'une charge). Même critère.
- [ ] **M5.** Livraison : `CIBLES.json` resserré sur l'état mesuré, coût du tick
  chiffré contre la livraison précédente, et le résidu de rétroaction écrit
  noir sur blanc plutôt que passé sous silence.
