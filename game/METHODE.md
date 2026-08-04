# Méthode — à lire avant de toucher au moteur

Ce fichier n'énonce pas des principes généraux. Chaque règle qui suit a été payée
au moins une fois dans ce dépôt, et l'incident est cité. C'est ce qui la rend
utile : on peut vérifier qu'elle décrit quelque chose de réel, et on saura quoi
regarder le jour où on voudra la remettre en cause.

À relire quand on ajoute un mécanisme, quand on choisit un coefficient, ou quand
on est sur le point d'écrire « il suffit de ».

**La section 1 passe avant toutes les autres.** Le reste dit comment travailler
proprement ; elle dit ce qu'on cherche. On peut mesurer parfaitement et livrer un
monde mort.

---

## 1. Ce qu'on cherche

La rigueur des sections suivantes ne sert à rien toute seule. On peut mesurer
parfaitement, tester parfaitement, et produire un monde juste et mort. Ce qu'on
cherche tient en quatre mots, et ils passent avant le reste.

### 1.1 Réaliste

**La bonne question, devant un mécanisme, c'est « qu'est-ce qui se passerait
vraiment ? »** Elle produit des règles qu'on n'aurait jamais inventées en
cherchant à équilibrer.

> **Incident.** « Le vendeur n'est pas passif. » On cherchait à brider la
> conquête d'une ville par le rachat de sa dette, et on partait sur un multiple
> fixe. En se demandant simplement ce que ferait quelqu'un à qui l'on demande de
> céder la créance d'une de ses propres villes à un rival, on a obtenu trois
> issues au lieu d'une, un frein qui varie de partie en partie, et deux
> stratégies entières — affamer un pays pour qu'il brade, ou soulager un voisin
> du boulet qu'il traîne.

**Le réalisme est un générateur, pas un but.** On ne simule pas ce que personne
ne verra jamais. Les ménages d'une ville sont modélisés parce que sans eux
l'argent apparaît de nulle part, et ça, ça se voit dans les comptes. Les
financiers privés ne le sont pas : ce serait un acteur de plus à faire vivre pour
aucun effet visible.

**Une cause doit pouvoir se dire en une phrase.** Si on ne peut pas nommer
pourquoi une ville est tombée, le joueur ne le pourra pas non plus — et il aura
raison de trouver le monde arbitraire.

### 1.2 Jouable

**Un mécanisme qu'on ne peut pas atteindre n'existe pas.**

> **Incident.** La bourse d'échange. Codée, testée, mesurée — et hors d'atteinte :
> il fallait une recherche, un bâtiment, un camp inscrit sur les cartes, 40
> d'estime, une faction à quatre villes et 2 500 crédits en caisse. Huit portes
> pour un seul ordre. Le joueur a écrit : « tu as codé une bourse d'échange et je
> ne peux même pas la tester tellement tu as rendu le truc injouable. »

**Une porte se juge sur tout le chemin, pas sur elle-même.** Chaque condition
prise isolément semble raisonnable ; c'est leur produit qui décide si quelqu'un
passe. Compter les portes avant d'en ajouter une.

**Et l'inverse est tout aussi vrai : on ne supprime pas le contenu intéressant
pour régler un problème d'accès.** Une recherche à mener et un bâtiment à
construire, c'est *le* jeu, pas un obstacle. Ce qu'il faut couper, ce sont les
conditions qui n'apportent rien à faire, pas celles qui donnent quelque chose à
faire.

**Un choix a besoin d'au moins deux options vivantes.** Si une réponse gagne
toujours, ce n'est pas un choix, c'est un tutoriel.

> **Incident.** Les six milices. La première version en rendait une intéressante
> et cinq décoratives. Le joueur : « il faudrait qu'elles le soient toutes, mais
> avec des extras propres à chacune d'elles. » Chaque drapeau a désormais son
> service propre.

**On doit pouvoir revenir.** Une situation mauvaise doit rester récupérable, et
une défaite doit être lisible : on doit savoir ce qui nous a tués.

### 1.3 Agréable

**L'écran ne bouge pas sous le doigt.** Rien ne se replie, ne se recharge ni ne
se déplace pendant qu'on lit.

> **Incident.** Un rafraîchissement reconstruisait les modales et remettait le
> défilement en haut : sur seize écrans mesurés, treize à quatorze sautaient. On
> perdait sa place toutes les quelques secondes.

**On ne doit jamais découvrir une chose importante en relisant ses comptes.**

> **Incident.** La colonne qui marchait sur le camp du joueur. L'annonce partait
> au journal, noyée parmi quatre cents autres lignes, et n'était même pas marquée
> importante. On apprenait l'attaque en lisant l'épitaphe de son propre camp.

**Le journal est plafonné : l'important ne doit pas être chassé par le banal.**
Les départs et arrivées de caravanes n'y figurent pas — il en passe des
centaines, elles auraient effacé les guerres et les morts.

**Ce qui est cliquable doit se voir.** Convention unique, tenue partout.

**Attendre n'est pas un mécanisme de jeu.** Si une décision demande deux cents
heures, c'est l'accélération qui doit la rendre supportable, pas la patience du
joueur.

**Téléphone d'abord.** Panneaux repliables, barres qui résument, rien qui déborde
en largeur.

### 1.4 Logique

**Le monde ne tourne pas autour du joueur, et il tourne sans lui.** Les factions
se font la guerre qu'il soit là ou non, et ce qu'il ne voit pas continue
d'exister.

**Ce que le joueur peut faire, une faction doit pouvoir le faire — et
réciproquement.** Pas de magie asymétrique. Le joueur gradé ordonne, le conseil
décide par tempérament, et c'est le même mécanisme derrière.

**Le nom doit correspondre au comportement.** Un comptoir se comporte comme un
comptoir. Une règle qu'il faut expliquer parce que son nom dit autre chose est à
renommer ou à refaire.

**Si un résultat fait dire « ça n'a aucun sens », être équilibré ne le sauve
pas.**

> **Incident.** Prendre une ville en rachetant sa dette coûtait plus cher en
> relations que la prendre d'assaut en massacrant 18 % de ses habitants. Le
> joueur : « selon toi c'est moins bien vu par le peuple de prendre une ville par
> la ruse que par le sang ? » Vérification faite, aucune faction de ce monde ne
> juge jamais une conquête. On avait inventé une morale que personne n'y professe.

**Un monde équilibré mais sans drame est un monde raté.**

> **Incident.** Après un changement d'économie, tous les indicateurs étaient bons
> — plus une seule faction fauchée, plus de villes debout, des bourses partout —
> et **plus aucune faction ne se faisait écraser**, contre dix sur trente-six
> auparavant. Chaque chiffre était meilleur, et le monde n'avait plus d'histoires.
> « Les factions écrasées » est depuis une cible mesurée au même titre que les
> autres.

C'est la règle qui gouverne toutes les autres : ce moteur n'existe pas pour
produire des nombres cohérents, il existe pour produire des situations qu'on a
envie de raconter.

---

## 2. Régler par l'intérieur

**Quand un comportement dérape, on corrige ce qui le rend avantageux — son prix,
sa durée, ses conditions d'accès. Jamais en collant à côté une pénalité sans
rapport.**

Un frein posé à côté du mécanisme ne le corrige pas, il le camoufle. Six mois
plus tard personne ne sait plus pourquoi il est là, ni ce qui casse si on
l'enlève.

Trois questions avant d'ajouter le moindre coefficient :

1. **Quelqu'un, dans le monde, a-t-il une raison de s'y opposer ?** Si oui, c'est
   lui le frein, pas mon chiffre.
2. **Ce coefficient décrit-il une rareté** — du temps, de l'argent, de la
   distance, de la confiance — **ou décrète-t-il un interdit ?** Le premier a sa
   place, le second presque jamais.
3. **Si je l'enlève dans six mois, la mesure me le dira-t-elle ?** Si non, il n'a
   rien à faire là.

> **Incident.** La conquête d'une ville par le rachat de sa dette. Première
> version : un plafond d'endettement en crédits par habitant, une interdiction de
> racheter la créance d'une ville saine, un malus de réputation auprès de toute
> la carte. Trois décrets. Version retenue : le vendeur décide. Une faction en
> paix refuse, une faction à sec brade, une faction qu'une ville encombre paie
> presque pour s'en défaire. Le frein sort de l'état du monde, il varie de partie
> en partie, et il a ouvert deux stratégies que les décrets fermaient.

> **Incident.** Un plafond de sept caravanes, écrit en dur. Porté à vingt, la
> circulation n'a pas bougé d'un dixième de convoi : ce n'était pas le plafond
> qui bornait, c'était l'entonnoir en amont. **Quand relever une limite ne change
> rien, c'est qu'on n'avait pas trouvé la bonne.**

**Une règle qui ne peut aller que dans un sens est probablement à moitié
écrite.** L'effet diplomatique d'une cession de créance avait été borné à zéro,
uniquement parce qu'il avait été pensé comme une pénalité. Débloqué, il permet
de se faire des amis en soulageant les autres de leurs fardeaux — un profil de
faction entier qui tombe des règles.

**Deux mécanismes qui agissent sur le même effet, c'est un de trop.** Un malus
« pour avoir insisté » coexistait avec une rancune calculée sur le prix payé.
Insister, c'est payer plus cher ; payer plus cher réduisait déjà la rancune. Les
deux tiraient en sens contraire sur la même chose, et le second punissait
précisément celui qui avait le mieux dédommagé.

---

## 3. Mesurer

**Une mesure sans témoin ne mesure rien.** Aucun réglage n'est retenu sans le
chiffre d'à côté, celui de la version qu'on remplace.

> **Incident.** « La bourse fait passer les villes bien nourries de 50 à 61 % ».
> Mesuré correctement, avec la configuration témoin : **28 villes bien nourries
> dans tous les cas de figure**. La bourse garde des villes en vie — 62 contre 68
> — mais elle n'en nourrit pas une seule mieux. La première affirmation avait été
> tirée d'un seul relevé, sans point de comparaison.

**Un taux dont le dénominateur bouge ne dit rien tant qu'on n'a pas regardé le
numérateur.** Un pourcentage qui monte parce que la population s'effondre n'est
pas une amélioration.

**Trois graines, c'est du bruit.** Sur trois parties, le nombre de villes debout
rebondissait entre 163 et 194 sans ordre en faisant varier un seul coefficient.
Six graines minimum pour un balayage, et on regarde la médiane autant que
l'extrême.

**Balayer, pas deviner.** Un coefficient se choisit en essayant cinq valeurs et
en lisant la colonne, pas en raisonnant sur ce qu'il devrait valoir. Le
raisonnement sert à choisir *quoi* mesurer.

**Reproduire, instrumenter, mesurer, et seulement après, changer.** Dans cet
ordre. Une correction écrite avant la mesure corrige une hypothèse.

**Chercher la cause, pas la corrélation.** La population avait chuté de 28 % après
un changement d'économie. L'hypothèse commode — « il part moins de convois » —
était fausse : il en partait *plus*, mais six fois plus maigres. La bonne mesure
n'était pas le nombre de convois, c'était le tonnage.

---

## 4. Vérifier

**Un test qui interroge une valeur impossible ne vérifie rien, et il passe.**

> **Incident.** `veutOuvrirBourse` testait `temperament === 'marchand'`. Ce
> tempérament n'existe pas. Le test l'affirmait, et il était vert. Corrigé : les
> bourses ouvertes sont passées de 1,5 à 3,4 par partie, les accords de 0,08 à
> 0,88. Un mécanisme entier dormait derrière un test qui le déclarait vivant.

**Un garde qu'on ne voit jamais échouer ne prouve rien.**

> **Incident.** Le frein de surextension appelait `distance` avec trois arguments
> au lieu de deux. Elle rendait `NaN`, et le `if (tension > 0)` juste en dessous
> l'avalait sans un mot. Mécanisme mort depuis le jour de son écriture, et ses
> deux constantes avaient été calibrées à vue contre lui. Il crie maintenant.

**Une correction se prouve en réintroduisant la faute.** Si le test ne redevient
pas rouge quand on remet le bug, il ne testait pas le bug.

**Une liste qu'il faut penser à compléter finit incomplète.**

> **Incident.** Le comptoir existait dans `BUILDINGS` mais dans aucune famille
> d'affichage : invisible, donc inconstructible, donc tout le chemin qui menait à
> la bourse était mort. Réparé, et doublé d'un test qui compare les cartes
> affichées à la table des bâtiments.

**Un paramètre qu'on peut omettre finit par l'être.**

> **Incident.** `capaciteStock(state)` avec `state` facultatif. L'écran affichait
> 5 504, le dépôt en utilisait 3 200, et le message « rien à déposer ou entrepôt
> plein » était faux. Le paramètre est devenu obligatoire et premier.

**Ce qu'on mesure doit survivre à la mesure.** Suivre un texte à l'écran accusait
le marché, dont les prix bougent à chaque tick. Poser un attribut ne survivait pas
à `innerHTML`. Il fallait suivre la position d'un enfant par son index.

---

## 5. Le déterminisme n'est pas négociable

La simulation est déterministe : même graine, même monde, à l'unité près. Tout ce
qui suit en dépend — les tests, les balayages, les témoins, la reprise d'une
partie sauvegardée.

**Un tirage ajouté déplace tous les suivants.**

> **Incident.** Une ligne `caisse: taille * rng.irange(120, 380)` dans la création
> d'une ville. Le monde entier changeait de forme à graine égale, et huit
> vérifications assises sur des mondes connus tombaient d'un coup — sans qu'aucune
> ne parle d'argent. Remplacé par une valeur dérivée de la population, qui est
> déjà tirée.

Corollaire : `Date.now()` et `Math.random()` n'ont rien à faire dans le moteur.

---

## 6. Ce qui ne se négocie pas

- **L'état est du JSON pur.** Pas de classe, pas de fonction, pas de référence
  circulaire. Un aller-retour `JSON.parse(JSON.stringify(state))` doit rendre
  exactement le même état.
- **`state.world` est partagé, `state.player` et `state.base` sont privés.** Le
  jour où ce jeu devient multijoueur, `world` part côté serveur. Aucun calcul du
  monde ne doit dépendre du joueur.
- **Le moteur ne touche pas au DOM.** Seuls `ui.js` et `main.js` le font.
- **Tout est en français** : l'interface, les noms, le journal, et les
  commentaires du code.
- **Toute clé nouvelle dans l'état passe par `normaliser`.** Une partie déjà
  commencée ne doit jamais avoir à être recommencée.
- **Le budget de temps est tenu** : `tick` sous 110 µs, mesuré avec échauffement,
  minimum sur cinq passes, normalisé par un étalon arithmétique.

---

## 7. Écrire le code

**Le commentaire dit pourquoi, pas quoi.** Un commentaire utile raconte ce qui a
été essayé, ce que ça a donné, et pourquoi la version retenue l'a emporté. Les
constantes de ce dépôt portent leurs mesures avec elles — c'est ce qui permet de
les remettre en cause sans tout remesurer.

**Une constante sans sa mesure est une opinion.** Si on ne peut pas écrire à côté
d'elle le tableau qui l'a fait choisir, c'est qu'on l'a devinée.

---

## 8. Travailler ensemble

- **Rien ne se code sans validation.** On propose, on chiffre, on attend.
- **On rapporte les résultats tels quels.** Si un test échoue, on le dit avec sa
  sortie. Si une étape a été sautée, on le dit. Une cible manquée n'est pas un
  échec : c'est une mesure à expliquer avant de continuer.
- **On corrige ce qu'on a affirmé de faux**, une fois, sobrement, et on continue.

---

## 9. Le format d'une proposition

Avant de coder quoi que ce soit :

1. **Le constat**, chiffré, avec son témoin.
2. **La cause**, identifiée — pas l'hypothèse commode.
3. **Ce qu'on propose**, avec les formules et les constantes nommées.
4. **Ce que ça casse**, dit d'avance.
5. **Les cibles mesurables** qui diront si c'est réussi.
6. **Ce qu'on ne fait pas**, pour ne pas y revenir.

`ECONOMIE.md` est le premier document écrit à ce format. Il sert de gabarit.
