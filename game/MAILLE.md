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
caravane, aucune guerre :

| | écart (fine − grossière) |
|---|---:|
| rations | **0,000** |
| agitation | **0,000** |
| caisse | **0,000** |
| population | −10 |
| ménages | −39 |

Trois grandeurs identiques au millième, deux qui divergent : c'est une
signature, pas une impression.

**Et le signe s'explique**, vérifié plutôt que supposé — 20 clones sur 40
passent sous le seuil de satiété au bout de quarante jours isolés :

| | écart de population |
|---|---:|
| clones affamés (20/40) | **−18** |
| clones nourris (20/40) | **+30** |

La maille fine amplifie la branche qui domine. Isolée, la ville s'affame et
perd plus ; ravitaillée, elle gagne plus.

## 2. La cause

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

D'où la règle générale, déjà inscrite dans `METHODE.md` §3 : **une probabilité
se regroupe, un compte ne se regroupe pas.** Tout ce qui est un *taux* — les
stocks, l'agitation, les salaires — se regroupe exactement, et c'est mesuré à
zéro. Tout ce qui est un *événement quantifié* ne se regroupe pas.

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

| cible | comment on la mesure |
|---|---|
| invariance | `banc --maille`, partie 2 : les cinq écarts médians **sous le plancher de bruit**, mesuré par placebo comme dans la cartographie. « À zéro » était une cible mal posée : corriger le compte supprime le biais systématique, il reste l'écart de deux tirages honnêtes — et exiger l'impossible, c'est ne rien vérifier |
| invariance dans le monde | `banc --maille`, partie 1 : population médiane à ±3 habitants et villes debout à ±1 |
| coût | la garde de vitesse : rapport à la livraison précédente. Estimé ~3 % ; au-delà de ×1,08 la variante approchée passe devant l'exacte |
| le monde tient | les dix gardes de `CIBLES.json`, resserrées après coup sur l'état mesuré |
| l'invariant comptable | exact, comme toujours |

## 6. Ce qu'on ne fait pas

- On ne supprime pas le niveau de détail. Il fait vivre un monde de 86 villes à
  ~110 µs par heure ; c'est lui qui rend le monde distant vivant plutôt que
  gelé, à la différence de Kenshi. Ce qu'on corrige, c'est qu'il **biaise**.
- On ne rend pas la maille uniforme « en attendant » : ce serait payer le coût
  maximal pour ne rien régler du problème de fond.
- On ne touche à aucun autre mécanisme dans ce chantier. La cause est
  identifiée et localisée ; élargir le périmètre, c'est perdre le témoin.
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

## 7. Le recensement — fait

Tout ce qui reçoit un `dt`, et ce que chacun en fait. **Deux seulement sont
atteints**, et c'est une bonne nouvelle : le périmètre est petit.

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

**Ce que le recensement écarte, et qu'il fallait vérifier** : les stocks, les
salaires, l'agitation, l'ordre public, la geôle et les secteurs sont des
*taux*. Ils se regroupent exactement — c'est déjà mesuré à zéro par
`banc --maille`, et ça confirme le recensement au lieu de le supposer.

## 8. Les tâches

- [x] **M1.** La primitive `combienDeFois` (`src/rng.js`, et non `economy.js` :
  `notables.js` en a besoin aussi). Huit tests, rouges d'abord — l'export
  n'existait pas. À `dt = 1` elle rend le même verdict *et* le même état de
  flux que `rng.chance(p)`, donc la brancher ne décale rien à la maille fine ;
  à `dt = 24` l'espérance vaut `24 p` à 5 % près sur quatre mille tirages, pour
  `p` valant 0,01, 0,05 et 0,12. Un test garde la trace du biais corrigé :
  l'ancienne forme plafonnait à 0,71 départ là où il en part 1,20.
- [ ] **M2.** Brancher `economy.js:719-730` (naissance, départ). Mesurer :
  `banc --maille` partie 2, l'écart de population doit tomber sous le plancher.
- [ ] **M3.** Brancher `notables.js:233` (relève d'une charge). Même mesure.
- [ ] **M4.** Le plancher de bruit lui-même : ajouter à `banc --maille` un
  placebo — deux mailles fines de graines voisines — sans quoi « sous le
  plancher » ne veut rien dire.
- [ ] **M5.** Livraison : `CIBLES.json` resserré sur l'état mesuré, coût du tick
  chiffré contre la livraison précédente, et le résidu de rétroaction écrit
  noir sur blanc plutôt que passé sous silence.
