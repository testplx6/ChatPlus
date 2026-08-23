# Les promesses tenues — le chantier de couture, cahier des charges

Ouvert par le propriétaire sur la revue de game master (REVUE.md,
« go » d'août 2026). Un chantier de **couture, pas de contenu** : six
lots, aucune règle nouvelle — on branche ce qui a été promis sur ce
qui a été livré, et on ferme les trois exploits. Format METHODE §9.
**Rien ne se code avant que le propriétaire ait validé les six lots.**

## 1. Le constat, chiffré (repris de REVUE.md, revérifié dans le code)

- **La milice se bat les mains nues** : SIEGE.md S1 promettait des
  miliciens « armés de ce que l'entrepôt contient » ; `leverMilice`
  (base.js) les dérive et les nivelle mais ne les équipe de rien. La
  forge (B2) n'a pas son meilleur client.
- **Une seule tactique pour tout le joueur** : `state.player.tactique`
  est global (main.js:568, lu par events.js:188) — la colonne qui
  harcèle en marais et celle qui tient les murs se battent pareil,
  alors que tout le reste (ordres, allégeance) est par groupe.
- **La défaite ne détrousse que la monnaie d'ici** : events.js:354,
  `soldeIci(state) × 0,25-0,55`. Toute fortune convertie en devise
  étrangère est invisible aux pillards : 12 % de change contre
  25-55 % par défaite — la dureté du jeu devient optionnelle au
  tableur (exploit n°1 de la revue).
- **Perdre contre des chasseurs de prime rend +10 d'estime**
  (events.js:579) : la réputation négative, seule vraie dette du jeu,
  s'efface par l'échec simulé (exploit n°2).
- **La solde est une rente** : versée chaque jour quoi qu'on fasse
  (allegeance.js:971), et un ordre sans échéance ne presse jamais —
  un homme seul garé en ville touche solde + intendance à vie en
  ignorant son unique ordre (exploit n°3).
- **Les raids ignorent la richesse** : `force = irange(20,45) + t/600
  + pop × 1,5` (base.js:1547) — ni la fréquence ni la force ne lisent
  le stock. Un camp-coffre-fort ne risque rien de plus qu'un hangar
  vide, et la tension de la partie longue s'éteint.

## 2. La cause

Chaque chantier a livré son système, tests à l'appui — mais les
promesses *croisées* (la forge arme la milice, le carnet nourrit la
route, la richesse attire) n'appartenaient à aucun cahier. C'est le
prix d'avancer par chantiers ; on le paie ici, une fois.

## 3. Les six lots

### P1 — la milice armée au sac

Au lever de la milice, chaque milicien **emprunte la meilleure pièce
libre** (arme puis armure) dans les `objets` du groupe présent au
camp — rendue après la bataille, **perdue s'il tombe** (elle part
avec le corps, comme tout le reste). Zéro état nouveau, zéro tirage.
La boucle forge → salle → milice se referme : six machettes à
~50 crédits transforment la défense d'un camp.

### P2 — la tactique par groupe

`g.tactique`, repli sur `player.tactique` s'il n'est pas posé —
clé nouvelle par `normaliser` ET dans la création des groupes. Le
panneau de tactique règle le groupe affiché. Le pari tactique devient
un pari par colonne, ce qu'il prétend déjà être.

### P3 — le détroussage multi-monnaies

Le pillard prend sa part (0,25-0,55, inchangée) de **chaque monnaie
du portefeuille** — les billets étrangers se revendent très bien. La
rançon de siège et l'impôt gardent leur règle (on paie dans la
monnaie d'ici : c'est un prix, pas un pillage). Les coffres en ville
restent la vraie cachette — c'est leur métier, il redevient utile.

### P4 — la défaite solde la prime, jamais l'estime

events.js : la prime retombe (−1, inchangé — ils ont été payés),
le `+10` de réputation disparaît. Se faire battre n'a jamais fait
aimer personne.

### P5 — la solde suspendue à l'ordre qui traîne

Un ordre d'allégeance en attente au-delà de **trois fois sa durée
minimale de route** (`dureeMinimale`, contrats.js — la mesure existe)
suspend la solde ET l'intendance jusqu'à ce qu'il soit rempli ou
refusé. Le journal le dit une fois : « La solde attend que vous
fassiez votre part. » On paie un soldat, pas un pensionnaire.

### P6 — la richesse attire les prédateurs

Le raid lit enfin le stock : fréquence × (1 + totalStock / T1),
force += totalStock / T2 — T1 et T2 en objet calibrable, **balayés au
banc** avant d'être posés (ordres de grandeur de la revue :
T1 ≈ 2000, T2 ≈ 150). L'explication est déjà dans le jeu : les
colporteurs repartent chargés, et ce qu'ils ont vu se raconte. La
partie longue retrouve sa question : tenir ce qu'on a bâti.

## 4. Ce que ça casse, dit d'avance

- **P3 + P6 durcissent le jeu** — c'est le but (« simulation
  pleine », décision du propriétaire au chantier siège). P6 se mesure
  en partie témoin : un camp moyen ne doit pas devenir invivable, un
  camp-coffre-fort doit devenir un choix qu'on assume.
- **P5 change le revenu des joueurs-rentiers** : c'est l'exploit
  qu'on ferme. Un joueur honnête en mission longue n'est pas touché
  (la suspension attend 3 × la route).
- **Vieilles sauvegardes** : `g.tactique` par `normaliser` (repli sur
  le global : rien ne change pour qui ne touche à rien) ; aucune
  autre clé.
- Le monde ne bouge pas d'un dé ; gardes du banc identiques.

## 5. Les cibles mesurables

1. Un test né rouge par lot (le milicien porte la machette du sac et
   elle disparaît avec lui ; deux groupes, deux tactiques, deux
   rendements ; la bourse étrangère est détroussée ; la défaite ne
   rend plus d'estime ; la solde s'arrête à l'ordre qui traîne et
   reprend quand il est rempli ; à stock double, raids plus lourds).
2. T1/T2 balayés au banc, partie témoin jouée avant de poser.
3. Gardes du monde inchangées, vitesse dans la fourchette.

## 6. Ce qu'on ne fait pas

Pas de convoi à gages (chantier commerce à part, si le propriétaire
l'ouvre). Pas d'offre d'engagement des factions, pas de second fil,
pas de carte achetable — consignés dans REVUE.md, pas engagés ici.
Six coutures, rien d'autre.

## Les décisions du propriétaire

1. **Valider ou amender les six lots.**
2. **P5, le délai de grâce** : 3 × la route (recommandé), ou plus
   sévère (2 ×), ou plus doux (5 ×) ?
3. **P4** : la défaite ne rend plus rien du tout (recommandé), ou un
   reste symbolique (+2) ?

## L'avancement

- [ ] P1 — la milice armée au sac
- [ ] P2 — la tactique par groupe
- [ ] P3 — le détroussage multi-monnaies
- [ ] P4 — la prime soldée, l'estime intacte
- [ ] P5 — la solde suspendue à l'ordre qui traîne
- [ ] P6 — la richesse attire les prédateurs

## Blocages

Rien pour l'instant.
