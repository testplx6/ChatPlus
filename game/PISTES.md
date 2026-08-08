# Pistes — des idées consignées, pas des chantiers

Ce fichier garde ce qui a été dit et qui mérite de ne pas se perdre, sans
l'engager. Rien ici n'est décidé, rien ici n'est estimé. Une piste devient un
chantier quand elle passe par `METHODE.md` §9 et que le propriétaire l'ouvre.

---

## Multi-monde, ou un monde par joueur

**Dit par le propriétaire, août 2026** : « je pense qu'on pourra imaginer un
système multi-monde avec un niveau d'échange restreint entre les mondes qui ne
nécessitent pas un calcul constant sur chacun des mondes, ou alors un monde par
joueur en multi et chacun calcule le sien, à réfléchir ».

### Pourquoi ça vaut d'être noté maintenant plutôt que plus tard

Les deux variantes reposent sur la même propriété, et c'est celle qu'on est en
train de construire.

**Un échange restreint entre mondes est exactement le niveau de détail, d'un
cran plus haut.** `pasColonie` fait déjà ça à l'intérieur d'un monde : ce qui
est loin du joueur avance par tranches de vingt-quatre heures, ce qui est près
avance à l'heure, et les deux se parlent. Un monde voisin qu'on ne calcule que
de loin, c'est la même idée avec une maille encore plus grossière. Le chantier
`MAILLE.md` n'est donc pas un détour : c'est le préalable. Un monde qui **biaise
selon la maille** produirait, entre deux mondes couplés, une dérive qu'aucun des
deux ne pourrait attribuer à l'autre.

**Un monde par joueur, chacun calculant le sien, est le même problème sous une
autre forme.** Deux clients qui simulent « le même » monde doivent en sortir la
même chose. C'est déterministe ici — même graine, même suite de tirages, même
monde — mais ce déterminisme ne survit que si les deux avancent *de la même
façon*. Or aujourd'hui la maille dépend de la position du joueur : deux joueurs
placés ailleurs verraient deux mailles, donc deux mondes. C'est précisément le
défaut que `MAILLE.md` corrige, et c'est aussi pourquoi le lot 3b d'`INDIVIDUS`
comptait — le flux principal n'est plus consommé que par le climat, donc le
trajet d'un joueur ne décale plus les dés de personne.

### Ce qui est déjà en place et qui sert

- **`state.world` partagé, `state.player` et `state.base` privés.** La règle est
  tenue et vérifiée par test : le monde ne lit jamais le joueur.
- **Un flux de hasard par entité.** Chaque ville, chaque armée, chaque convoi
  a le sien ; les conseils et les acteurs se dérivent d'une graine. Déranger une
  ville ne déplace plus le hasard des autres — c'est ce qui permettrait de
  simuler des morceaux de monde séparément.
- **L'invariant comptable par faction.** Il dirait immédiatement si un échange
  entre deux mondes crée ou détruit de la monnaie.

### Ce qui manque, et qu'il faudra poser

- **Que s'échangent deux mondes ?** Des marchandises, des gens, de la monnaie,
  des nouvelles ? Chacun a un coût différent et des conséquences différentes sur
  l'invariant.
- **À quelle cadence ?** Un monde voisin avancé une fois par jour de jeu n'a pas
  les mêmes exigences qu'un monde avancé une fois par mois.
- **Qui fait autorité en cas de désaccord ?** Deux clients déterministes qui
  divergent d'un bit divergent ensuite pour de bon.
- **La monnaie entre mondes.** Le moteur cote déjà chaque monnaie et sait
  convertir. Un taux de change entre mondes serait le même objet — ou pas, et
  c'est à décider.

**À réfléchir, comme dit. Rien n'est engagé.**
