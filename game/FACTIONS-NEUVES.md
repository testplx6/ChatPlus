# Chantier « Naissance et mort des factions »

✅ **Démarré.** Les cinq règles de jeu ont été tranchées par le propriétaire
(§4) ; ce qui restait à décider est décidé. Format : `METHODE.md` §9.

**L'exigence, telle qu'elle a été dite** (propriétaire, août 2026) : « y a aucun
problème à ce que des factions soient éliminées, en plus de nouvelles doivent
pouvoir être créées ».

C'est le seul point du lot 6 d'`INDIVIDUS.md` qui n'a pas pu s'écrire : une
colonne sans solde peut aujourd'hui se vendre ou se débander, mais pas fonder
son pays, parce que le moteur ne sait pas fabriquer un drapeau.

---

## 1. Le constat, chiffré

Le moteur connaît **sept factions, écrites en dur** dans `data.js:161-253`, dont
six diplomatiques (`DIPLO_FACTIONS` exclut l'Essaim). Elles ne naissent pas et
ne disparaissent pas : une faction « écrasée » garde son entrée, son drapeau et
sa case dans tous les tableaux — elle n'a simplement plus de villes.

**Ce que ça coûte au monde**, mesuré au banc sur six graines × 6 000 h : quatre
factions sur trente-six tombent à deux villes ou moins. Le monde sait donc
appauvrir un pays, mais la carte politique de la dernière heure est exactement
celle de la première. Rien ne se recompose.

## 1 bis. Ce que le recensement dit, et c'est une bonne surprise

La crainte inscrite dans `INDIVIDUS.md` — « les clés de `FACTIONS` sont fixes, et
la diplomatie, les couleurs et l'interface sont câblées dessus » — est **en
grande partie fausse**, et il fallait le vérifier avant d'estimer quoi que ce
soit.

**Une seule clé est citée en dur dans tout `src/` : `'essaim'`**, dix-neuf fois,
et c'est légitime — l'Essaim n'est pas une puissance, c'est un fléau : il ne
négocie pas (`enGuerre` rend vrai contre tout le monde), ne gouverne pas les
villes qu'il prend, et n'a ni trésor ni dirigeant. Aucune autre faction n'est
nommée nulle part.

Le reste est déjà générique :

| | |
|---|---:|
| lectures `FACTIONS[clé]` | 141, dont 37 dans `ui.js` |
| lectures `DIPLO_FACTIONS` / `FACTION_KEYS` | 44 |
| clés de faction citées en dur, hors `'essaim'` | **0** |

**Le vrai obstacle n'est donc pas le câblage, c'est la nature de `FACTIONS`** :
c'est de la donnée **de module**, statique, partagée par toutes les parties.
`world.factions` porte l'état d'une faction — trésor, villes, relations — mais
son *identité* (nom, couleur, génitif, devise, tempérament) vit dans `data.js`.
Une faction née en cours de partie n'a nulle part où exister.

## 2. La cause

Un même mot, `faction`, désigne deux choses que le moteur n'a jamais eu besoin
de distinguer :

- **l'identité** — `FACTIONS[clé]`, immuable, la même dans toutes les parties ;
- **la situation** — `world.factions[clé]`, propre à la partie, sauvegardée.

Tant que la liste est fixe, la confusion est gratuite. Dès qu'une faction peut
naître, elle ne l'est plus : son identité doit être *dans la sauvegarde*, et
`FACTIONS[clé]` doit cesser d'être la seule source.

## 3. Ce qu'on propose

**Une seule fonction de lecture, et l'identité descend dans le monde.**

```js
/** L'identité d'une faction : celle du monde si elle y est, celle du jeu sinon. */
export function drapeau(world, cle) {
  return (world && world.drapeaux && world.drapeaux[cle]) || FACTIONS[cle];
}
```

- `world.drapeaux` : les identités nées en cours de partie, et **elles seules**.
  Les sept d'origine restent dans `data.js` — ne pas recopier ce qui ne change
  pas, sinon chaque sauvegarde porte sept descriptions identiques.
- `FACTION_KEYS` et `DIPLO_FACTIONS` deviennent des fonctions du monde. C'est le
  gros du travail mécanique : 44 sites.
- Les 141 `FACTIONS[clé]` deviennent `drapeau(world, clé)` **là où une faction
  neuve peut passer**, et nulle part ailleurs — un site qui ne voit que
  l'Essaim n'a rien à changer.

**Ce qui naît avec un drapeau**, et rien de plus : une clé, un nom, un nom
court, un genre grammatical (`pluriel`, `datif`, `genitif`), une couleur, une
devise, `agression`, `cupidite`, `style`, `biomes`. Tout se dérive de la graine
de l'événement fondateur — c'est la primitive `grainDe` du chantier
`INDIVIDUS.md`, déjà en place et déjà éprouvée.

**La couleur est le seul point qui ne se tire pas au hasard** : deux drapeaux
proches à l'écran rendent la carte illisible. Elle se choisit dans l'espace
teinte-saturation à distance minimale de toutes les couleurs existantes — un
calcul, pas un tirage.

## 4. Les règles, tranchées par le propriétaire

Consignées telles qu'elles ont été dites, août 2026.

### 4.1 La reconnaissance — et c'est elle qui change la conception

> « n'importe qui peut créer une faction mais elle ne sera pas forcément
> reconnue par ses pairs, mais on peut dire qu'à partir du moment où une autre
> faction interagit avec, se positionne sur les ententes de paix guerre
> commerciaux etc. avec elle, elle la reconnaît forcément comme telle. »

C'est la règle la plus intéressante du lot, parce qu'elle **ne demande aucun
mécanisme nouveau**. La reconnaissance n'est pas un état à stocker ni une
décision à prendre : c'est une **lecture** de ce qui existe déjà. B reconnaît A
si le monde porte trace d'un positionnement de B envers A — une guerre, une
paix, un accord commercial, une relation qui n'est plus neutre.

```js
/** B a-t-il déjà eu à se situer par rapport à A ? Alors il le reconnaît. */
export function reconnue(world, cle, par) {
  return enGuerre(world, par, cle)
    || (world.accords || []).some((a) => impliquent(a, par, cle))
    || (world.factions[par].relations || {})[cle] !== undefined;
}
```

Fonder un drapeau ne demande donc la permission de personne, et la
reconnaissance arrive par le fait, jamais par un vote. Une faction née hier
existe ; elle est seulement **seule** tant que personne n'a eu affaire à elle.

**Ce qui reste à trancher, et c'est le pendant de la règle** : la règle dit
*quand* on reconnaît, pas *ce que la non-reconnaissance empêche*. Sans effet,
elle serait un ornement. Proposition, tirée de ce qui existe et à corriger si
elle se trompe — une faction non reconnue par B :

- ne peut pas **signer d'accord** avec B (il faut être deux, et B ne la voit
  pas encore) ;
- n'a pas de **cours** coté chez B, donc pas de change ;
- **peut** être attaquée, pillée, et commercer de fait par caravane — la
  violence et le troc n'ont jamais demandé de reconnaissance.

Le premier de ces trois gestes vaut reconnaissance et ouvre les deux autres.

### 4.2 Ce qu'il faut pour tenir debout

> « peu importe tant que ça fonctionne »

Délégué. Retenu, et c'est le plus simple qui marche : une faction naît avec ce
que lui donne son événement fondateur — les hommes de la colonne, la ville qui
a fait sécession — et rien de plus. Pas de dot, pas de seuil d'entrée.

### 4.3 Ce qu'est une faction morte

> « une faction doit au moins avoir des membres qui la composent je suppose. »

Une faction vit tant que **quelqu'un la compose** : une ville tenue, ou une
colonne en campagne. Ni l'un ni l'autre, elle s'éteint.

C'est un changement pour les sept d'origine autant que pour les neuves :
aujourd'hui une faction sans ville reste au tableau, avec son drapeau et sa
ligne, indéfiniment. Le banc en compte quatre sur trente-six dans cet état. Ce
sont des morts qui n'ont jamais été enterrés.

### 4.4 Combien de drapeaux

> « pas de maximum »

Aucun plafond. La conséquence n'est pas annulée pour autant : la diplomatie est
en `n²` et l'écran a ses limites. Ce n'est donc plus une décision mais une
**mesure** — N7 dira ce que coûte un monde à vingt drapeaux, et si ça coûte
trop, c'est le code qui change, pas la règle.

### 4.5 Les noms

> « peu importe c'est une simulation, chaque faction aura une origine
> différente et propre au monde généré »

Le nom se **dérive de l'origine**, pas d'une liste tirée au sort : le lieu de
la fondation, le nom de qui l'a fondée, la circonstance. Une colonne qui prend
son indépendance ne s'appelle pas comme une ville qui fait sécession, et les
deux disent d'où elles viennent.

## 5. Ce que ça casse, dit d'avance

- **Toute sauvegarde ancienne** doit recevoir `world.drapeaux = {}` par
  `normaliser`. Sans ça, `drapeau()` rend `undefined` et le monde se tait.
- **`CIBLES.json` compte les factions écrasées sur 36** — six factions × six
  graines. Ce dénominateur cesse d'avoir un sens dès que le nombre varie.
- **L'écran** : la carte, la liste diplomatique, les bourses et les tableaux
  supposent tous une liste de longueur connue. C'est là que sont les 37
  lectures de `ui.js`.
- **Le coût du tick** : la diplomatie est en `n²`. Doubler le nombre de
  factions quadruple ce poste. À mesurer, pas à supposer.

## 6. Ce qu'on ne fait pas

- On ne touche pas à l'Essaim. Il n'est pas une faction au sens de ce chantier,
  et ses dix-neuf mentions en dur sont justifiées.
- On ne recopie pas les sept identités d'origine dans la sauvegarde.
- On ne remplace pas les 141 lectures mécaniquement : seules celles qu'une
  faction neuve peut atteindre. Une modification aveugle est une modification
  qu'on ne peut pas relire.

## 7. Les tâches

Les trois premières ne changent **rien** au monde : ce sont des remaniements, et
le critère de chacune est que deux mondes joués à graine égale restent
identiques octet pour octet. Les règles de jeu n'arrivent qu'à N5.

- [x] **N1. Le recensement, par la mesure — 17 sites, pas 141.**

  Méthode : `FACTIONS` enveloppé dans un `Proxy` qui note chaque lecture d'une
  clé inconnue avec sa pile d'appel, et une faction fantôme posée dans le monde
  avec deux villes et une colonne. Un `Proxy` qui **plante** ne dit qu'un site
  à la fois — il a fallu le rendre tolérant, en rendant une identité de
  remplacement, pour que la partie continue et les livre tous d'un coup.
  Autrement dit : le premier instrument ne mesurait qu'une chose, et c'est en
  le voyant s'arrêter à `factions.js:346` qu'on l'a su.

  | site | lectures | ce que c'est |
  |---|---:|---|
  | `economy.js:1266`, `economy.js:255` | 240 | le **style** d'une faction, qui commande les prix et les métiers d'une ville |
  | `credit.js:176, 366, 367, 369` | 95 | faillite et saisie |
  | `factions.js:346, 441, 252, 163, 845, 378, 182, 503, 405` | 117 | capture, siège, levée, guerre, trêve, fondation, choc, dispersion |
  | `caravanes.js:705` | 7 | convoi pillé |
  | `sim.js:546` | 6 | sécession |

  **Quinze des dix-sept ne sont que du texte de journal** — un nom, un pluriel,
  un génitif. Les deux qui comptent sont `economy.js:255` et `1266` : ils lisent
  le `style`, et une faction sans style verrait sa ville se comporter comme une
  commune sans drapeau. C'est le seul endroit où l'identité change le monde et
  pas seulement la phrase.

  **Ce que ce recensement ne couvre pas** : `ui.js` et ses 37 lectures, qui ne
  tournent pas sans navigateur. Elles seront recensées au même instrument dans
  `test/navigateur.js`, à N9.
- [ ] **N2. `drapeau(world, cle)` et `world.drapeaux`.** Tests rouges :
  aller-retour JSON exact, `normaliser` rattrape les vieilles parties, une
  identité inventée à la main se lit partout où la lecture est branchée.
- [ ] **N3. `FACTION_KEYS`/`DIPLO_FACTIONS` en fonctions du monde.** 44 sites.
  Test : deux mondes joués 2 000 h avant/après sont identiques.
- [ ] **N4. La couleur, calculée.** Distance maximale aux couleurs existantes.
  Test : deux factions neuves ne se ressemblent pas, et aucune ne ressemble aux
  sept d'origine.
- [ ] **N5. `reconnue(world, cle, par)`** (§4.1), et ses trois effets. Tests :
  une faction neuve n'est reconnue de personne ; le premier geste d'un voisin la
  fait reconnaître ; un accord ne se signe pas avec une inconnue.
- [ ] **N6. La naissance.** Une colonne sans solde qui ne trouve pas de payeur
  fonde son pays plutôt que de se débander — c'est la cinquième issue du lot 6
  d'`INDIVIDUS.md`, restée en suspens. Nom dérivé de l'origine (§4.5). Test
  rouge : dans une situation où la règle dit qu'une faction naît, elle naît,
  elle a un drapeau lisible, et l'invariant comptable tient.
- [ ] **N7. La mort** (§4.3) : ni ville ni colonne, la faction s'éteint. Vaut
  aussi pour les sept d'origine — quatre sur trente-six sont aujourd'hui des
  morts jamais enterrés. Mesurer ce que ça fait au monde avant de conclure.
- [ ] **N8. Le monde à vingt drapeaux.** Pas pour décider d'un plafond — il n'y
  en a pas — mais pour savoir ce que coûte la diplomatie en `n²`, et corriger
  le code si elle coûte trop.
- [ ] **N9. Livraison.** `CIBLES.json` repensé : le « /36 » des écrasées ne
  survit pas à un nombre de factions variable. Coût du tick chiffré, écran
  vérifié au navigateur.
