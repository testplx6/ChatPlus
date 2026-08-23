# Revue de game master — le jeu entier, août 2026

Demandée par le propriétaire (« revois tout le jeu avec le game
master »). Deuxième passage du même consultant — le premier avait
amendé BATIMENTS.md. Ses affirmations porteuses ont été revérifiées
dans le code, fichier et ligne, avant consignation. Rien ici n'est
engagé : les chantiers qui en sortent passent par METHODE §9 et par le
propriétaire.

## La boucle de jeu, jugée

- **Première heure : réussie.** La première décision arrive avant le
  premier pas (le mort du départ — enterrer, dépouiller, manger), la
  chasse a un plancher partout, s'engager est possible d'emblée.
- **Première semaine : servie.** Contrats, carnet, trois voies
  lisibles (servir / bâtir / commercer).
- **Première saison : LE creux, chiffré par le dépôt lui-même**
  (betes.js:4-9 : 59 % du temps sur les pistes, 70 % des départs en
  logistique). Le carnet U7 a rendu l'arbitrage visible sans le rendre
  jouable : « le carnet a créé le désir, pas le verbe ».
- **Partie longue : des réponses, pas de question.** La difficulté
  plafonne tôt (`niveauMonde` ≤ 2 dès ~J104, events.js:430) et les
  raids ignorent la richesse (base.js:1547) : un camp-coffre-fort ne
  risque rien de plus qu'un hangar vide. L'horizon long devrait poser
  « combien de temps je peux tenir ce que j'ai bâti ».

## Verdicts par système (le défaut n°1 de chacun)

| système | verdict | défaut n°1 |
|---|---|---|
| économie joueur | « la meilleure économie solo que j'aie vue à ce niveau d'artisanat » — circuit fermé, rien n'apparaît de nulle part | **la solde est une rente** : versée quoi qu'on fasse (allegeance.js:971), un ordre sans échéance ne presse jamais → un homme garé en ville touche solde + intendance à vie |
| combat | bon et honnête (paris tactiques, morts réels) | **une seule tactique pour tout le joueur** (`player.tactique` global, main.js:568) — la colonne des marais et celle des murs se battent pareil |
| base/camp | le système le plus abouti du jeu | **la milice se bat les mains nues** : S1 promettait « armés de ce que l'entrepôt contient », `leverMilice` n'équipe rien — la forge livrée n'a pas son client |
| allégeance/factions | riche et vécu | tout part du joueur, rien ne vient à lui : aucune faction ne sollicite jamais un homme estimé |
| commerce | complet côté systèmes, incomplet côté verbes | l'arbitrage du carnet n'a pas de bras : pas de convoi à gages ville→ville |
| récit | excellent et singulier — le plus original du projet | quatre fils, une seule fois : au dixième vétéran, tout est connu — relancer un second fil au règlement du premier |
| information/carte | « le meilleur brouillard de guerre que je connaisse en jeu textuel » | le renseignement ne s'achète pas — la carte chez le contremaître (TECHNOLOGIE §5) ne dépend en rien de l'arbre, à livrer seule |
| interface | disciplinée | l'alerte de la vigie annonce des décisions sans les présenter : le raid imminent mérite le panneau à boutons du siège |

## Le top 5 des problèmes

1. **Le milieu de partie est une navette** (le plus gros volume
   d'heures) → un convoi à gages ville→ville, petit (~une charrette),
   au prix réel, mesuré au banc pour que la marche du joueur reste
   dominante sur les gros lots.
2. **La richesse est invisible aux prédateurs** (la tension s'éteint)
   → fréquence × (1 + stock/2000), force += stock/150, balayés au
   banc ; les colporteurs qui repartent chargés sont l'explication
   gratuite.
3. **La milice désarmée** (promesse croisée de deux chantiers) → au
   lever, chaque milicien emprunte la meilleure pièce libre du sac du
   groupe présent (rendue après, perdue s'il tombe).
4. **Une tactique pour six colonnes** → `g.tactique`, repli global,
   `normaliser`.
5. **La défaite ne détrousse que la monnaie d'ici**
   (`soldeIci × 0,25-0,55`, events.js:354) → le pillard prend une part
   de chaque monnaie portée ; les coffres en ville restent la vraie
   cachette.

## Les exploits de l'optimisateur

1. **Le portefeuille-ambassade** : toute la fortune dans une devise
   étrangère → détroussage, rançon et impôt ne lisent que `soldeIci` ;
   12 % de change contre 25-55 % par défaite évitée. La dureté devient
   optionnelle pour qui tient un tableur.
2. **La défaite thérapeutique** : perdre contre des chasseurs de
   prime rend +10 d'estime (events.js:579) — la réputation négative,
   seule vraie dette du jeu, s'efface par l'échec simulé. La défaite
   doit solder la prime, jamais l'estime.
3. **La pension des Communes** : un homme seul, engagé à l'heure 1,
   garé en ville — solde + intendance à vie, ordre ignoré sans
   pénalité. Corrigé par : solde suspendue à l'ordre qui traîne.

## Le trou dans la carte

**Le joueur ne peut rien promettre.** Tout le monde traite en amont
(accords, créances, taux) ; le joueur n'a que des verbes pendant la
crise. Pas de tribut préventif, pas de pacte, pas de parole donnée —
donc pas de parole trahie, le meilleur carburant du récit. Le moteur a
déjà tout (rancune, `rachats` ×1,6, chemin comptable de l'impôt,
`ctx.rancune` consulté au ciblage — sim.js:441). C'est la porte du
chantier « geôle, rançons et parole donnée ».

## L'ordre des chantiers recommandé

1. **« Les promesses tenues »** — un chantier de couture, pas de
   contenu : milice armée au sac, tactique par groupe, détroussage
   multi-monnaies, prime non blanchie, solde suspendue à l'ordre qui
   traîne, raids attirés par la richesse. « Avant d'ouvrir un cahier
   neuf, on honore les anciens. »
2. **Le Maréchal** — un sommet rare doit avoir une vue.
3. **La geôle, les rançons et la parole donnée** — prévenir le second
   siège, et découvrir ce que coûte une promesse rompue.
4. **L'arbre + le départ nu** — en dernier, comme prévu : il aura
   deux familles de nœuds de plus à coiffer, et la première heure nue
   sera récompensée par un jeu qui le mérite.

## Si je ne pouvais dire qu'une chose

« Ce jeu n'a plus de problème de systèmes — il en a treize, tous
honnêtes, et je n'ai trouvé aucun endroit où le moteur triche avec ses
propres règles. Ce qui limite le plaisir, ce sont les **coutures** :
la forge qui n'arme pas la milice qu'on vient de rendre mortelle, le
carnet qui montre un métier qu'on ne peut pas exercer, la richesse que
personne ne convoite, la défaite qui se contourne en changeant de
devise. Un chantier de couture avant Maréchal, et chaque système
existant rendra dix pour cent de plaisir de plus sans qu'une seule
règle nouvelle soit écrite. »
