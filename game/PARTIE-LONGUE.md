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

### 1. Le bot ne s'entraîne jamais, et ce n'est pas le jeu qui l'en empêche

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

### 2. La moitié de la fortune est dans une monnaie qui n'a pas cours

À seize mille heures avec un camp : **50,3 % de la bourse** dans une monnaie
qui n'a pas cours là où l'on se trouve, **3 307 achats refusés** faute d'avoir
la bonne monnaie — pour **67 passages au bureau de change**. Le bot ne change
presque jamais, donc le chiffre mesure d'abord son incurie ; mais le rapport
entre les deux (cinquante refus par passage) est assez violent pour mériter
qu'on regarde si un joueur ordinaire le vit aussi. C'est le pendant long de
l'exploit « portefeuille-ambassade » déjà consigné dans REVUE.md.

### 3. Une partie sur vingt finit à cent vingt-trois millions

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
