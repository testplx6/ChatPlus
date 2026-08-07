# Chantier « Naissance et mort des factions »

⚠️ **Proposé, non démarré.** Ce document prépare le travail, il ne l'autorise
pas. Format : `METHODE.md` §9.

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

## 4. Les questions qui appartiennent au propriétaire

Elles sont posées ici parce que **ce sont des règles de jeu, et qu'on ne les
invente pas**. Aucune ligne ne s'écrit avant qu'elles soient tranchées.

1. **D'où naît une faction ?** Trois sources plausibles, et elles ne racontent
   pas la même chose :
   - une **colonne sans solde** qui prend son indépendance (le lot 6 la
     réclame) ;
   - une **sécession** de ville qui ne rejoint personne — aujourd'hui elle
     rejoint toujours un drapeau existant ;
   - un **schisme** : un dirigeant écarté emmène ses villes.
2. **Que faut-il pour tenir debout ?** Une ville ? Une armée ? Un trésor ? Et
   que se passe-t-il si la fondation échoue le mois suivant ?
3. **Qu'est-ce qu'une faction morte ?** Aujourd'hui une faction sans ville
   existe encore. Doit-elle disparaître des tableaux, ou rester comme un nom
   qu'on se rappelle ? La question compte pour l'écran autant que pour le
   moteur.
4. **Combien de drapeaux au maximum ?** Non pour brider la simulation, mais
   parce que l'écran, la diplomatie en `n²` et les bourses ont un coût qui
   croît. À défaut de limite, il faut savoir ce que le monde fait à vingt
   factions — c'est mesurable au banc avant de décider.
5. **D'où viennent les noms ?** Composition à partir de listes existantes, ou
   nouvelle liste dédiée ?

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

## 7. Les tâches, si le chantier démarre

- [ ] **N1. Le recensement, par la mesure.** Quels sites peuvent voir une clé
  absente de `FACTIONS` ? Se trouve en instrumentant `FACTIONS[...]` sur une
  partie longue avec une clé fantôme, pas en lisant 141 lignes.
- [ ] **N2. `drapeau(world, cle)` et `world.drapeaux`.** Tests rouges :
  aller-retour JSON exact, `normaliser` rattrape les vieilles parties, une
  identité inventée à la main se lit partout où la lecture est branchée.
- [ ] **N3. `FACTION_KEYS`/`DIPLO_FACTIONS` en fonctions du monde.** 44 sites,
  et le monde doit rester identique octet pour octet à la graine près : c'est
  un remaniement, pas un changement de règle. Test : deux mondes joués 2 000 h
  avant/après sont identiques.
- [ ] **N4. La couleur, calculée.** Distance minimale aux couleurs existantes.
  Test : deux factions neuves ne se ressemblent pas, et aucune ne ressemble aux
  sept d'origine.
- [ ] **N5. La fondation**, selon la source tranchée en §4. Test rouge : dans
  une situation où la règle dit qu'une faction naît, elle naît, elle a un
  drapeau lisible, et l'invariant comptable tient — le trésor d'un pays neuf
  vient de quelque part.
- [ ] **N6. La mort**, selon la règle tranchée en §4.
- [ ] **N7. Le monde à vingt factions.** Mesurer au banc avant de décider d'un
  plafond : coût du tick, guerres, bourses, lisibilité de l'écran.
- [ ] **N8. Livraison.** `CIBLES.json` repensé — le « /36 » des écrasées ne
  survit pas —, coût du tick chiffré, et l'écran vérifié au navigateur.
