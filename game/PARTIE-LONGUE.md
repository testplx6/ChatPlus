# La partie longue — relevés, septembre 2026

**Rien n'est engagé ici.** Ce fichier consigne ce que le banc d'équilibrage
montre quand on le laisse jouer aussi longtemps que le propriétaire joue. Les
chantiers qui en sortiraient passent par METHODE §9 et par lui.

## Pourquoi ce dossier existe

La partie du propriétaire dépasse **750 jours de jeu** — plus de dix-huit mille
heures. Le banc d'équilibrage s'arrête par défaut à **4 000 h**, soit cent
soixante-six jours : il mesurait le premier cinquième d'une partie et concluait
sur l'ensemble. Et il ne pouvait pas faire mieux : au-delà de sept mille heures
environ, **il plantait** — deux lectures `FACTIONS[…].style` explosaient sur les
pays nés en cours de partie, qui vivent dans `world.drapeaux` et non dans les
sept d'origine (le référentiel figé de FACTIONS-NEUVES §8.4). Corrigé par
`drapeauDe` ; c'est ce qui a rendu tout ce qui suit mesurable.

La première conséquence est déjà consignée ailleurs : la voie du service
n'était pas morte, le banc s'arrêtait trop tôt (MEMOIRE.md §Blocages,
instruction 4).

## Ce qui tient, et c'est la meilleure nouvelle

**L'invariant comptable est exact à seize mille heures, joueur compris** :
écart maximal 0,00 sur vingt parties, avec un camp, six millions de crédits
moyens en circulation et cent vingt-trois millions dans la partie la plus
riche. Rien n'est créé nulle part. Le circuit fermé tient sur la durée, et
c'est la propriété la plus difficile du projet.

## Ce qui interroge

Les trois sont des **relevés**, pas des verdicts : dans les trois cas il reste
à établir si c'est le jeu ou le bot qui parle — la leçon du jour, payée deux
fois.

### 1. Le bot ne s'entraîne jamais — **instruit : le jeu fait très bien des vétérans**

**Verdict (septembre 2026).** Le plafond était entièrement dans l'instrument, et
la question de fond a une réponse nette. Deux corrections, puis une expérience :

- **Le grenier compte.** Le bot renonçait faute de cent cinquante rations *dans
  le sac*, alors qu'un joueur installé s'exerce au camp, à côté de ses bacs. En
  comptant le grenier quand on est chez soi : l'entraînement passe de 0 % à 3 %
  des tours, et la faim de 65 % à 27 % des renoncements.
- **Le blocage s'est alors déplacé** sur `collecteUrgente` (59 %) : le bot a
  toujours une collecte en cours.
- **Le témoin du haut** (`ENTRAINE=1`, l'exercice avant la collecte tant qu'on
  est chez soi) répond enfin à la question :

| anciens du premier jour, 16 000 h | compétence brute |
|---|---|
| bot ordinaire | 15,6 → 21,7 |
| bot qui s'entraîne vraiment | 16,7 → **50,9** |

Compétence de combat des survivants 18,5 → **43,6** (max 73), et « mort en
route » tombe de 70 à **14** : des gens compétents meurent beaucoup moins.

**Le jeu fabrique donc parfaitement des vétérans** — il faut s'entraîner, ce
que le bot ne faisait jamais. Et l'arbitrage est vrai des deux côtés : le
patrimoine moyen tombe de 246 747 à 23 455, parce que les heures d'exercice ne
sont pas des heures de travail. Les vétérans ou la fortune, pas les deux.

### 1 bis. Le relevé d'origine, pour mémoire

Mesuré (compteur permanent, `À l'entraînement` au rapport) : **2 % des tours**
sans camp, **0 % avec camp**. La raison n'est pas le plafond du bot — le porter
de 26 à 70 ne change rien, au bit près — c'est la première condition de la
règle : `rations > 150`. On y renonce **pour la faim dans 74 % des tours**, et
pour une collecte urgente dans 24 %. Le bot vit au jour le jour, donc il ne
range jamais assez de vivres pour souffler.

Conséquence directe sur toutes les mesures de progression : les anciens du
premier jour montent de 15,6 à **21,7** de compétence brute en seize mille
heures — le même gain qu'en quatre mille. Avec un camp qui produit, 13,4 à
**25,7**. Un joueur installé fait sûrement bien mieux : il a un grenier, et il
entraîne. Tant que le bot court après sa nourriture, **le banc ne peut rien
dire des vétérans** — ni qu'ils existent, ni qu'ils manquent.

### 2. La moitié de la fortune est dans une monnaie qui n'a pas cours — **instruit, ce n'est pas un défaut**

**Verdict (septembre 2026)** : le jeu n'est pas en cause, et le bot ne l'était
qu'à moitié. Le premier motif d'échec du change n'est pas la rareté des
bureaux mais **l'endroit** : `sansComptoir` domine (1 388 sur 2 350), parce
qu'une place sur deux n'en tient pas — un choix assumé d'ECONOMIE §5.1, « on
change mieux dans une vraie ville ».

Or le contre-jeu existe et le bot ne le prenait pas : **vendre sur place paie
dans la monnaie d'ici**. Il restait bloqué avec de l'argent ailleurs et un sac
plein de marchandise, et comptait cet échec comme si le jeu l'avait coincé. Le
recours lui est donné (526 ventes sur place par run de trente parties, survie
30/30).

Et le résultat contre-intuitif vaut d'être dit : la part en monnaie étrangère
**monte** (61 % → 74 %), parce que plus on vend partout, plus on accumule de
monnaies diverses. C'est la simulation qui parle, pas une avarie : un nomade
dans un monde à sept monnaies finit avec sept poches, et les vider demande de
passer par les vraies villes ou de tenir un comptoir. La friction a son
contre-jeu — les quatre odeurs de l'audit sont saines.

### 2 bis. Le relevé d'origine, pour mémoire

À seize mille heures avec un camp : **50,3 % de la bourse** dans une monnaie
qui n'a pas cours là où l'on se trouve, **3 307 achats refusés** faute d'avoir
la bonne monnaie — pour **67 passages au bureau de change**. Le bot ne change
presque jamais, donc le chiffre mesure d'abord son incurie ; mais le rapport
entre les deux (cinquante refus par passage) est assez violent pour mériter
qu'on regarde si un joueur ordinaire le vit aussi. C'est le pendant long de
l'exploit « portefeuille-ambassade » déjà consigné dans REVUE.md.

### 3. Une partie sur vingt finit à cent vingt-trois millions — **instruit : l'unité ne vaut plus rien**

**Verdict (septembre 2026).** Ce n'était pas une fortune, c'était une monnaie
effondrée — et la mesure qui manquait est celle que le banc du monde emploie
depuis toujours : ramener la somme en **ancien crédit**, le pivot du bureau de
change. Mesuré à 16 000 h, vingt parties :

| | en unités | en ancien crédit |
|---|---|---|
| joueur médian | 42 016 | **5 471** |
| le plus riche | 8 602 219 289 | **4 651 708** |

Un facteur **1 850** entre le nominal et le réel chez le plus riche. Compter des
unités de monnaies dont les cours vont de 0,0005 à 2 n'est pas une mesure
(METHODE §12) — la même leçon avait déjà coûté deux jours sur la « masse
monétaire » du monde, et elle vient de resservir.

**Ce que ça apprend en jeu, et qui vaut mieux que le chiffre** : le joueur
médian tient une bourse dont l'unité a perdu presque toute sa valeur. Garder
ses gains dans une monnaie qui s'effondre est une perte réelle, silencieuse et
progressive ; le contre-jeu existe (changer dans une vraie ville, ou tenir de
la marchandise plutôt que du papier), et c'est un vrai sujet de partie longue.

L'invariant comptable reste exact à cet horizon (écart 0,05 sur vingt parties,
le bruit de la virgule flottante) : **rien n'est créé nulle part.** La queue
haute est du négoce accumulé, pas une fuite.

### 3 bis. Le relevé d'origine, pour mémoire

Les autres vont de 4 à 764 406 crédits. L'invariant étant exact, ce n'est pas
de l'argent créé : c'est soit une monnaie effondrée dont il faut beaucoup
d'unités, soit une accumulation réelle sans rien à en faire. Les deux méritent
d'être distinguées avant toute conclusion — la mesure ne le fait pas encore.

## Comment refaire ces mesures

```
node test/equilibre.js 16000 20            la partie longue, bot ordinaire
NECRO=1 node test/equilibre.js 16000 20    + la nécrologie et les anciens
CAMP=1 COMBAT=70 NECRO=1 ...               installé, et qui s'entraînerait
```

`COMBAT=` règle le seuil d'entraînement du bot (paramètre du bot, pas du jeu),
`REGLE=` les constantes qui ne se mesurent que devant un joueur.
