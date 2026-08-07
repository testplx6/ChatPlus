# Chantier « Invariance à la maille »

⚠️ **Proposé, pas démarré.** Il ne démarre qu'avec l'accord explicite du
propriétaire. Format : `METHODE.md` §9.

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

**Ce qui est une règle de jeu et non une décision technique**, à trancher par
le propriétaire avant de coder : **combien d'habitants une ville peut-elle
perdre en un jour ?** Aujourd'hui la réponse est « au plus trois si elle est
loin, jusqu'à soixante-douze si elle est proche » — et personne ne l'a jamais
décidé.

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
| invariance | `banc --maille`, partie 2 : les cinq écarts médians **à zéro**, pas seulement trois |
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

## 7. Reste à instruire avant de démarrer

`banc --maille` ne mesure aujourd'hui que `tickColonie`. **Les autres
mécanismes qui reçoivent un `dt`** — la geôle, l'ordre public, les secteurs,
les armées en campagne — n'ont pas été examinés. Ils souffrent peut-être du
même défaut. La première tâche du chantier est de les recenser et de les
mesurer, comme la cartographie l'a fait pour les constantes : **on ne corrige
pas ce qu'on n'a pas compté.**
