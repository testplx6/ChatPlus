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
export function drapeauDe(world, cle) {
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

### 4.3 bis Le dirigeant seul, et le trésor d'un pays mort

> « un dirigeant seul peut essayer de se refaire, rien ne l'interdit. »

Une faction sans ville et sans colonne, mais avec un chef, **existe encore**.
C'est une permission, pas une obligation : on n'écrit pas un mécanisme de
reconquête, on s'interdit seulement de fermer la porte. Elle s'éteint quand il
ne reste plus personne du tout — ni ville, ni colonne, ni dirigeant.

> « quand la faction s'éteint le trésor reste à l'endroit physique où il se
> trouve, il est donc pillable ou trouvable. »

L'argent d'un pays mort ne s'évapore pas et ne tombe pas dans la poche du
vainqueur : **il reste où il était**, et quelqu'un le trouvera. C'est cohérent
avec ce que le monde sait déjà faire — les régions portent des `site` qu'on
fouille (`fouillerSite`), et une ville prise transmet déjà sa caisse.

**La conséquence sur l'invariant comptable, et elle demande du soin.** `auditer`
est **par faction** : pour chaque drapeau, ce qui existe (trésor + caisses +
ménages de ses villes) doit égaler sa masse émise. Un trésor qui quitte la
faction sans quitter le monde brise donc l'égalité des deux côtés à la fois —
sauf si le magot abandonné est **compté quelque part**.

Trois façons, et une seule respecte la règle telle qu'elle est dite :

| | l'argent | l'invariant |
|---|---|---|
| le vainqueur hérite | change de mains | tenu, mais **contraire à la règle** |
| on le détruit | disparaît | tenu si `masse` baisse d'autant, mais **contraire à la règle** |
| **un magot posé sur la carte** | reste où il est | tenu **si le magot entre dans `existe`** de la faction morte |

Retenu : le troisième. Un magot est donc un troisième registre à côté du trésor
et des caisses, et `auditer` doit le lire — sans quoi le premier pays mort
ferait dériver les comptes, et on chercherait le bug ailleurs.

Une question qui en découle et qui n'est pas tranchée : **de la monnaie d'un
pays qui n'existe plus vaut-elle encore quelque chose ?** Le moteur cote chaque
monnaie (`cours`, `gage`) et sait déjà convertir (`convertirMasse`, `taux`).
Trouver le trésor des Rouilleurs le jour où les Rouilleurs n'existent plus, ce
n'est pas trouver des crédits — c'est trouver des billets. À poser avant N7.

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
- [x] **N2. `drapeauDe(world, cle)` et `world.drapeaux`.** Le registre est vide au
  départ : les sept d'origine restent dans `data.js`, les recopier mettrait sept
  descriptions identiques dans chaque sauvegarde. `normaliser` rattrape les
  vieilles parties, l'aller-retour JSON est exact.
- [x] **N3. Le monde comme source, et non le jeu.** `clesDe(world)` et
  `diploDe(world)` lisent `world.factions`, la liste qui fait autorité. Les deux
  constantes restent pour la génération du monde, où la question porte vraiment
  sur les sept d'origine.

  **Ce n'était pas cosmétique, et c'est mesuré.** Une faction posée dans un
  monde sans être dans `DIPLO_FACTIONS` vit très bien — huit villes, une
  colonne, sept relations, une monnaie cotée — mais `auditer` ne la voit pas, et
  **les comptes des *autres* dérivent de 4 440 crédits** en mille cinq cents
  heures. L'invariant comptable, la garde la plus sûre du moteur, tombe en
  silence.

  Une fois branché : écart maximal **1,2 × 10⁻⁹** avec une faction neuve dans le
  monde.

  Quatre-vingts lectures basculées au total, et le recensement de N1 a dû être
  relancé trois fois : chaque correction faisait vivre la fantôme plus
  longtemps, et lui faisait donc atteindre des sites que la précédente n'avait
  pas révélés. 17, puis 6, puis 1. **Un recensement n'est pas fini quand il ne
  rend plus rien — il est fini quand ce qu'il rend n'est plus un défaut** : la
  dernière lecture est `FACTIONS[null]`, une ville sans drapeau qui retombe
  correctement sur « commune ».

  Bit-identité vérifiée à chaque étape : trois graines × 2 000 heures, mondes
  identiques octet pour octet avant et après. C'est un remaniement, pas un
  changement de règle.

  **La fonction s'appelle `drapeauDe` et non `drapeau`**, et c'est le
  vérificateur de symboles qui l'a imposé : le mot « drapeau » apparaît en
  français dans les textes de `ui.js` (« Reprendre son drapeau »), et un export
  portant ce nom déclenchait un faux positif à chaque relecture. Renommer coûte
  moins cher qu'affaiblir un garde.

  **Deux pièges de fixture**, tous deux déjà rencontrés ailleurs et tous deux
  reproduits ici. Un `Proxy` qui plante ne rend qu'un site à la fois — rendu
  tolérant, il les livre tous. Et une faction montée à la main fait dériver
  l'audit de trente-trois mille crédits : il faut la monter avec `transferer` et
  `transfererVille`, sinon on accuse le moteur de ce que la fixture a inventé.
- [x] **N4. La couleur, calculée.** Le cercle des teintes est balayé au degré
  près ; on garde celui dont la distance à la teinte occupée la plus proche est
  la plus grande. Déterministe, sans un tirage, et trois cent soixante
  comparaisons une fois dans la vie d'une faction.

  Les sept d'origine occupent 0, 30, 53, 136, 188 et 275 degrés. L'Essaim est
  gris — saturation 7 % — et sort du concours : deux gris se ressemblent quelle
  que soit leur teinte, et lui réserver un secteur du cercle serait le perdre
  pour rien.

  Six drapeaux nés l'un après l'autre : 232, 318, 95, 162, 210, 254. Chacun
  comble le plus grand vide restant.
- [x] **N5. `reconnue(world, cle, par)`.** Dans `data.js` et non `factions.js` :
  `bourse.js` en a besoin et le précède. Elle ne lit que le monde. L'Essaim
  n'est pas traité à part — un fléau ne reconnaît personne et n'est reconnu de
  personne. L'effet est dans `signerAccord` et pas chez l'appelant, parce que le
  conseil signe et le joueur aussi : une règle posée à un seul des deux endroits
  se contourne sans le vouloir. Monde identique octet pour octet.
- [x] **N6. La naissance.** Une colonne que personne ne paie et que personne ne
  rachète plante son propre drapeau. Elle ne fonde que si elle a **quelque chose
  à quitter** — un pays qui tient encore une ville : sans ce garde, la même
  troupe fonderait un pays par conseil et le monde se remplirait de drapeaux
  d'un homme. Elle emporte ses hommes et rien d'autre (§4.2), donc trésor et
  masse à zéro : l'invariant comptable n'a rien à voir dans cette naissance, et
  c'est ce qui la rend sûre.

  Sur mille cinq cents heures de solde impayable : **vingt et une fondations**.
  « Le capitaine Solen plante son propre drapeau : Les Affranchis de
  Fort-Sablon. Syndicat Ombrelle perd une colonne et gagne un voisin. »

  **Trois fixtures écartées avant la bonne**, et les trois échecs valent d'être
  dits. Vider les trésors retire de l'argent du monde sans retirer la masse
  émise — l'audit accuse alors le moteur de ce que le décor a détruit, 49 700
  crédits mesurés. Gonfler une colonne à cinquante mille hommes la rend
  invincible : elle prend sa cible en moins de cent heures et se dissout avant
  d'avoir eu faim. Ce qui marche ne trafique rien : on rend le soldat cher,
  `ETAT.parSoldat` est calibrable, et à cinquante crédits l'heure aucun trésor
  ne suit.

  **Et un mécanisme mort découvert au passage.** La débandade ne survenait plus
  jamais — vingt et une fondations, zéro débandade — ce qui était attendu : une
  colonne qui a un pays à quitter fonde. Mais en construisant le cas où elle
  s'applique, une colonne *sans terre*, elle ne se débandait pas non plus. La
  cause : `conseil` rendait la main dès la première ligne pour un pays sans
  ville, donc ses colonnes n'étaient **jamais jugées**. Une troupe abandonnée
  par un pays mort restait au garde-à-vous pour l'éternité. Corrigé — un pays
  sans ville ne délibère pas, mais ses colonnes comptent leurs impayés.
- [x] **N7. La mort, et le trésor d'un pays mort.** Ni ville, ni colonne, ni
  dirigeant : la faction s'éteint. Un chef seul suffit à la tenir — on ne lui
  écrit pas de mécanisme de reconquête, on s'interdit de fermer la porte.

  Son trésor **reste où il était** : un magot posé sur la région où elle
  siégeait, que la première colonne qui passe ramasse. `auditer` le compte, et
  la faction morte reste dans le registre avec sa masse — sans ça, le premier
  pays éteint ferait dériver les comptes de tout son trésor et on chercherait la
  fuite dans le circuit des villes. `diploDe` l'exclut du jeu diplomatique,
  `auditer` continue de la regarder : un registre qu'on cesse de vérifier parce
  que son propriétaire est mort, c'est une fuite qu'on s'interdit de voir.

  **La fondation a dû être déplacée.** Elle se déclenchait au seuil de
  débandade : une poignée de dix hommes fondait un pays qui mourait au conseil
  suivant, faute de quiconque pour le composer — et le test « il entre dans le
  jeu diplomatique » est passé au rouge en le montrant. Elle vient maintenant
  **avant** l'attrition, quand la colonne est encore une force et qu'elle a
  cessé d'espérer : deux constantes calibrables, `COLONNE.patience` et
  `COLONNE.assez`, à balayer. Les deux branches vivent alors — sur 1 500 heures
  de solde impayable, **12 fondations et 13 débandades**.

  **Et une régression de vitesse causée par N3, trouvée ici.** Remplacer la
  constante `DIPLO_FACTIONS` par une fonction qui filtre a mis un `Object.keys`
  et un `filter` dans des boucles appelées des dizaines de fois par heure. Le
  résultat est mis en cache dans une `WeakMap` — pas sur le monde, qui doit
  rester sérialisable à l'identique.
- [ ] **N7 bis. Calibrer `COLONNE.patience` et `COLONNE.assez`** au balayage, et
  mesurer ce que la mort des factions fait au monde sur six graines. Les deux
  compteurs sont au banc (`nés`, `morts`).
- [x] **N8. Le monde à trente drapeaux, mesuré.** Un monde où la solde est
  impayable (`ETAT.parSoldat = 50`) sur 6 000 heures :

  | | |
  |---|---:|
  | drapeaux, au départ | 7 |
  | drapeaux, à la fin | **30**, et le compte plafonne dès h3500 |
  | coût du tick | **×2** (4,2 s contre 2,1 s pour la même partie) |
  | écart comptable | 1,6 × 10⁻⁸ |

  Pas d'emballement, et le coût est celui qu'on attendait d'une diplomatie en
  `n²` : doubler le nombre de drapeaux double le tick. Il n'y a pas de plafond à
  poser — la règle du propriétaire est « pas de maximum » — mais il y a un
  chiffre à connaître, et le voilà.

  **Ce que la mesure révèle et qui n'était pas prévu : plus rien ne meurt.**
  Vingt-trois drapeaux naissent, **un seul tient des villes** (cinq, tout de
  même), et les vingt-deux autres n'ont ni ville ni colonne. Ils devraient donc
  s'éteindre — et ils ne s'éteignent pas, parce que `tickDirigeant` **fabrique
  un chef** à toute faction qui n'en a pas, y compris à celle qui ne possède
  rien. Or un chef seul suffit à tenir un pays en vie (§4.3 bis).

  La règle est appliquée fidèlement ; c'est sa rencontre avec un mécanisme
  d'avant qui produit un monde de fantômes.

  **Tranché par le propriétaire** : « un chef a le droit d'essayer de se
  refaire, un autre a bien sûr le droit de le remplacer ou de prendre sa place,
  c'est une simulation, tout est possible. » On ne ferme donc aucune porte, et
  le chef fabriqué à un pays sans rien reste.

  Mais **le droit d'essayer sans moyen d'essayer n'est pas un droit**. Et la
  cause n'est pas où on la cherchait : ce n'est pas que les fondations naissent
  démunies, c'est qu'elles **perdent leur colonne**. Mesuré sur les vingt-trois
  drapeaux nés — un tient des villes, **zéro** garde sa colonne, vingt-deux
  n'ont plus qu'un chef. La troupe fond toujours, parce qu'un pays sans ville ne
  peut pas la solder.

  Or des hommes qui se battent sous leur propre bannière n'attendent pas de
  paie : ils *sont* l'État. C'est ce que N8 ter corrige.

- [x] **N8 ter. Une colonne se nourrit de ce qu'il y a là où elle est.**

  Le ravitaillement ne remontait **jamais** : il partait de `60 + force/4` et
  descendait d'un par heure, quoi que la colonne fasse. Une mèche qui brûle.
  Prendre une ville riche ne nourrissait pas mieux que traverser un désert, et
  une colonne vivait soixante et une heures en médiane sur les 709 mesurées. Une
  compagnie franche avait quarante-huit heures à vivre : elle ne se débandait
  pas, elle n'était pas battue, elle mourait de faim.

  **Écrit comme une capacité, pas comme une règle par cas** — décision du
  propriétaire, mot pour mot : « il y a autant de façons que ce que les membres
  peuvent faire, récolter, marchander, travailler, se faire payer, voler, etc.
  C'est une simulation. » Quatre sources, dans l'ordre où des hommes y
  penseraient, et la carte décide du reste :

  | | ce qui se passe |
  |---|---|
  | la terre | toujours, et elle vaut ce que vaut le sol — un marais nourrit, les dalles ne rendent rien |
  | les siens | on se sert au grenier, **et l'État paie sa propre ville** |
  | le marché | chez un voisin en paix, on achète ; la ville encaisse dans SA monnaie, au cours du jour |
  | le reste | sans un sou ou chez un ennemi, on prend — et la ville s'en souvient |

  **Aucun tirage** : tout se dérive du sol, du grenier et du trésor. Une colonne
  qui mange ne décale pas le flux du monde (piège n° 1), et le test le vérifie.

  ### Les deux erreurs de conception, trouvées à la mesure

  **1. On ne charge pas un convoi en une heure.** Première version : une colonne
  comblait ses soixante-quinze heures manquantes d'un coup, donc prenait
  soixante-quinze fois sa ration au grenier. Les villes se vidaient, empruntaient
  pour racheter du grain, faisaient défaut, se faisaient saisir — **créances de
  67 à 85** sur six graines, +25 % confirmé sur huit autres. D'où
  `chargeParHeure` : on se refait en une journée de halte, pas en une heure.

  **2. Une réquisition gratuite ruine son propre pays.** Même avec le plafond,
  les créances restaient à 75. Ce n'était plus le débit : c'était la gratuité.
  Une ville dont l'armée vide le grenier sans payer doit racheter du grain, donc
  emprunter. L'État paie désormais sa propre ville — l'argent ne quitte pas le
  pays, du trésor à une caisse, la masse ne bouge pas d'une unité.

  ### Ce que ça donne, contre `c4a210a`

  | | témoin | avec | | témoin (8 graines) | avec |
  |---|---:|---:|---|---:|---:|
  | satiété | 0,752 | **0,834** | | 0,790 | **0,825** |
  | villes à la diète | 59 % | **49 %** | | 54 % | **51 %** |
  | villes cédées | 67 | 70 | | 84 | **82** |
  | villes debout | 459 | 447 | | 591 | 570 |
  | retournements | 3 | 7 | | 11 | 17 |

  Le monde mange nettement mieux, et il bouge plus : les colonnes vivent, donc
  les guerres se décident au lieu de s'éteindre de faim. Le compteur `débandes`
  du banc s'allume pour la première fois.

  ### Le calibrage, et son honnêteté

  Les trois constantes ont été balayées. **Le banc ne les discrimine pas** à six
  graines — `créances` rend 77 / 70 / 68 / 74 pour `chargeParHeure` de 2 à 16, et
  75 / 70 / 64 pour `parBras`. Les valeurs retenues le sont donc sur leur
  *sens*, ce qui est dit plutôt que caché :

  - `parBras = 0,006` — un soldat qui fourrage rend moins de la moitié d'un
    paysan sur une terre travaillée (`paysans × 0,02` dans `productionColonie`).
  - `chargeParHeure = 4` — un plein de soixante-quinze heures demande environ
    dix-neuf heures de halte, soit une journée.

  ### Un décor rendu déterministe au passage

  Le test « la colonne sans solde » jouait six cents heures, prenait la première
  colonne venue et espérait qu'elle vive les neuf cents suivantes. Le jour où
  les colonnes ont su se nourrir, celle-ci est morte au combat et **trois
  mesures sont tombées à zéro d'un coup** sans que le mécanisme mesuré ait
  bougé. Le décor plante maintenant une colonne quand le pays n'en a plus. Sa
  non-complaisance est vérifiée : l'ardoise neutralisée, il crie.

- [~] **N9. Livraison — l'écran d'abord.** Les 39 lectures de `FACTIONS[clé]`
  d'`ui.js` sont branchées sur le monde, et les cinq de `DIPLO_FACTIONS` aussi.
  Elles ne tournent pas sous Node : c'est `test/navigateur.js` qui le vérifie,
  en posant dans une sauvegarde une faction que `data.js` ignore, avec une ville
  et une couleur à elle. Son nom s'affiche, l'écran ne montre pas « undefined »
  là où il devrait montrer un pays, et la console reste muette.

  Reste à faire : `CIBLES.json`, dont le « /36 » des factions écrasées ne
  survit pas à un nombre de drapeaux variable — six factions × six graines
  n'est plus un dénominateur.

---

## 8. La reprise d'août 2026 : le chantier était livré, la carte ne bougeait pas

> « il faut aussi que les factions puissent être détruites et que de nouvelles
> puissent apparaître, actuellement il y a un blocage contre la simulation à ce
> niveau là » — le propriétaire

Le chantier était coché sur ses neuf lots, et il avait raison. Le banc, avec
quatre sondes neuves posées pour l'occasion :

| | témoin | après |
|---|---:|---:|
| pays éteints en 6 000 h | **0** | **3** |
| pays fondés en 6 000 h | **0** | 0 |
| pays sans une ville ni une colonne, vivants | 3 | 2 |
| ardoise maximale d'une colonne, en heures | **0** | 0 |
| villes debout | 370 | 370 |
| écart comptable | 0 | 0 |

### 8.1 Pourquoi personne ne mourait — et ce n'était pas la règle

La règle d'extinction est celle du propriétaire (§4.3 et 4.3 bis) : un pays
s'éteint quand il n'a **ni ville, ni colonne, ni dirigeant** — un chef seul
garde le droit d'essayer de se refaire. Elle est correctement écrite dans
`conseil`.

Sa troisième condition ne pouvait simplement jamais devenir vraie.
`tickDirigeant` ouvrait sur `if (!f.dirigeant) { f.dirigeant = creerDirigeant(…) }`
et la succession se terminait sur `f.dirigeant = neuf`, **sans jamais demander
s'il restait quelqu'un pour fournir ce chef**. Un pays sans une terre, sans une
troupe et sans un habitant se voyait couronner un souverain neuf à perpétuité.
Trois pays étaient dans cet état à la fin de chaque partie : ni vivants — rien
ne leur permettait de se refaire — ni morts.

Le correctif est une question posée avant chaque couronnement : `quelquUn(world,
key)` — une ville tenue ou une colonne en campagne, la définition même qu'a
donnée le propriétaire de ce qui compose une faction. Le chef seul vit toujours
et garde son droit ; c'est **sa mort** qui devient définitive quand il ne reste
personne derrière lui. Et le journal le dit : « Et personne ne prend la suite :
il ne reste plus rien à gouverner. »

### 8.2 Le revenant, découvert dans la foulée

Faire mourir des pays a immédiatement révélé un défaut voisin, inatteignable
tant qu'aucun ne mourait. `faireSecession` s'annonce, dans son propre
commentaire, comme rendant une ville à sa faction d'origine « **en la
ressuscitant s'il le faut** » : elle lui rend la ville, lui remet un conseil
sous vingt heures — et laissait la marque `morte` en place. Le pays délibérait
donc, levait des colonnes et prenait des villes **en étant officiellement
éteint** : hors de `diploDe`, donc sans relations, sans succession, sans ligne
au tableau. Un revenant au sens propre, attrapé par une sonde d'invariant qui
n'avait jamais eu l'occasion de crier.

La marque s'efface désormais là, et c'est **le seul chemin par lequel un drapeau
tombé revient** : il faut qu'une de ses anciennes villes se soulève et le
rappelle. Personne ne le décide d'en haut. C'est aussi, en l'état, la seule
façon dont un drapeau neuf apparaît dans le monde.

### 8.3 Ce qui reste bloqué : la naissance

Aucun pays ne naît, et la cause est mesurée. Une compagnie franche se fonde
quand une colonne a cessé d'espérer sa solde : `impayees > loyauté ×
COLONNE.patience`, soit environ 72 heures d'ardoise. Or **l'ardoise maximale du
monde entier vaut zéro** sur six graines × 6 000 heures — une seule colonne a
atteint 25 heures, sur une seule graine. Les pays sont trop riches pour manquer
une solde : trésor médian 23 609 pour une solde de l'ordre de 150.

Le seuil n'est donc pas mal calibré, il est hors d'atteinte. Et le baisser
serait le mauvais geste : ça ferait des sécessions de misère, pas des pays
neufs.

**La question à trancher, et c'est une règle de jeu, donc elle revient au
propriétaire** : est-ce que le défaut de solde doit rester le *seul* motif de
sécession ? Dans un monde vrai, on plante son propre drapeau aussi par ambition
(un capitaine que sa légitimité dépasse), par distance (une colonne loin de
tout, depuis longtemps), par victoire (celui qui vient de prendre une ville et
ne voit pas pourquoi la rendre), ou parce que le pays qu'on sert s'effondre. Le
mécanisme de fondation existe et fonctionne — `fonderColonne` est écrite,
testée, et sait déjà faire naître un pays avec ses hommes et sa ville. Il ne lui
manque que des raisons d'être appelée.
