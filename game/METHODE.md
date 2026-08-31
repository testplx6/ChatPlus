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

**Un stock n'est pas un flux, et confondre les deux fait calibrer à l'envers.**
Avant de régler quoi que ce soit contre une mesure, il faut savoir si elle
compte ce qui *reste* ou ce qui *passe*. Les deux se ressemblent à l'écran et
disent le contraire.

> **Incident.** `nourries` compte les villes dont le grenier tient une demi-ration
> par tête. On l'a prise trente chantiers durant pour la mesure du bien-être. Elle
> mesure l'inverse : un grenier reste plein précisément quand les habitants n'ont
> pas de quoi l'acheter. Deux leviers indépendants, balayés sur deux jeux de
> graines, le montrent monotone et opposé — `SOLVABILITE.plancher` de 0,35 à 1,20
> fait passer `nourries` de 291 à 396 pendant que la satiété tombe de 0,752 à
> 0,608 ; `CAISSE.partSalariale` de 0,40 à 0,70 fait tomber `nourries` de 449 à
> 370 pendant que la satiété monte de 0,681 à 0,845 **et que le monde gagne
> trente mille habitants**. Le réglage qui faisait passer la garde était celui
> qui affamait le monde. Il a fallu écrire `col.satiete` — un nombre qui existait
> dans le moteur depuis toujours, que rien n'exposait — pour le voir.

**Un témoin négatif ne sait pas attribuer un coût.** Il sait dire si un
mécanisme porte un *défaut* — on le coupe, l'écart bouge ou non. Il ne sait pas
dire ce qu'il *coûte*, parce que couper du travail dans une simulation change le
monde, et un monde plus pauvre demande moins de travail partout ailleurs.

> **Incident.** Pour trouver où passait le temps, on a coupé `tickColonie` : le
> tick tombe à ×0,26, donc « il pèse 74 % ». Puis `ajusterEmplois` : ×0,56, donc
> « 44 % ». Les deux chiffres sont faux. Sans `ajusterEmplois`, aucune ville n'a
> d'emplois, donc plus rien ne produit, donc tout le reste devient gratuit. Le
> contrôle a été refait en ne coupant que le corps de la reconversion, en gardant
> l'initialisation : ×0,58 encore — et **84 villes debout contre 102**. Le monde
> avait maigri, pas le code. Le profil, lui, donne la vérité : le coût est
> *étalé* — 16 % dans `tickColonie`, 15 % dans `tick`, 7 % aux départs de
> convois, 6 % au chemin, 5 % au ramasse-miettes. Il n'y avait pas de gros
> poisson.

**Un chiffre qu'on ne peut pas voir est un chiffre contre lequel on ne peut pas
calibrer.** Quand un mécanisme « commande tout le reste », son nombre doit sortir
au banc avant qu'on touche à ce qui le commande.

**Trois graines, c'est du bruit.** Sur trois parties, le nombre de villes debout
rebondissait entre 163 et 194 sans ordre en faisant varier un seul coefficient.
Six graines minimum pour un balayage, et on regarde la médiane autant que
l'extrême.

**Balayer, pas deviner.** Un coefficient se choisit en essayant cinq valeurs et
en lisant la colonne, pas en raisonnant sur ce qu'il devrait valoir. Le
raisonnement sert à choisir *quoi* mesurer.

**Reproduire, instrumenter, mesurer, et seulement après, changer.** Dans cet
ordre. Une correction écrite avant la mesure corrige une hypothèse.

**La mesure est une commande, pas un script.** `node tools/banc.js` joue les
graines en parallèle, compare à n'importe quelle révision (`--temoin`), balaye
une constante (`--balaye`), profile (`--profil`), et se vérifie lui-même
(`--verif`, worker contre thread principal — un banc qui mesure faux fait tout
mesurer faux). Toute métrique nouvelle s'ajoute à `jouer()` dans le banc, jamais
dans un script à côté.

> **Incident.** Une session de calibrage entière engloutie par son propre
> outillage : dix scripts jetables réinventant les mêmes relevés, des `git
> stash` pour mesurer le témoin — dont un perdu en route —, des balayages joués
> en séquence, et une mesure de vitesse faite pendant que les suites de tests
> tournaient, qui a fait accuser le mauvais passage. La campagne
> « courant contre témoin, six graines, six mille heures » coûtait une
> demi-heure ; le banc la rend en huit secondes, et il retrouve les chiffres
> historiques à l'unité près.

**Savoir quel levier commande quoi, avant d'essayer de régler.**
`CARTOGRAPHIE.md` dit, pour chaque constante du moteur, ce qu'elle déplace et de
combien. Il se régénère (`node tools/banc.js --cartographie`). On le lit d'abord
— trois calibrages du lot D ont été perdus sur des leviers qui ne commandaient
rien, `ETAT.parDefense` multiplié par dix pour zéro faction écrasée de plus.

**Le déterminisme n'annule pas le bruit : il le déplace.** Deux parties de même
graine et même réglage sont identiques au bit près, alors on croit tout écart
significatif. Mais multiplier une constante par 1,0001 — ce qui ne change rien
d'économique — décale les tirages, et six mille heures plus tard le monde a
divergé quand même. La carte mesure ce chaos-là avec des placebos et déclare
**nul**, pas « faible », tout ce qui reste dessous.

> **Incident.** Les premiers placebos étaient tirés à intervalle régulier dans
> la liste des constantes triée par nom de fichier : tous sont tombés dans le
> même coin du moteur, sur des champs que la simulation du monde ne lit jamais.
> Le monde n'a pas bougé d'un habitant, le plancher est sorti à **0,0 % sur les
> quinze métriques**, et tout serait devenu significatif. Un placebo doit porter
> sur un levier dont on a mesuré qu'il remue le monde — sinon il ne mesure que
> son propre silence, et c'est le pire sens dans lequel un instrument puisse se
> tromper.

**Un instrument de comparaison se juge sur du code identique.** C'est la seule
question dont la réponse est connue d'avance : deux fois la même chose doit
rendre ×1,00. Tout protocole qui échoue à cette épreuve mesure autre chose que
ce qu'il croit.

> **Incident.** Trois protocoles de mesure de vitesse, éprouvés sur du code
> identique : toujours la révision courante en premier, minimum de trois →
> **×1,17** (biais de position) ; les deux révisions entrelacées dans un seul
> processus → **×0,86** (V8 compile et optimise deux graphes de modules
> séparément et inégalement) ; alterné A, B, B, A et minimum de six → **×0,998**.
> Le seuil de non-régression à +3 % que j'allais livrer avec les deux premiers
> aurait clignoté au rouge sans qu'une ligne ait changé.

**Une machine peut ralentir sans que rien ne le dise.** Celle-ci varie du simple
au double sur le même code, au repos — 109 µs par tick puis 200 µs vingt minutes
plus tard — et l'étalon arithmétique n'en voit rien : il reste à ×1,12. Ce n'est
pas la fréquence du processeur, c'est la mémoire, et un étalon qui tient dans le
cache ne peut pas la mesurer. **Aucune garde absolue n'est fiable sur une telle
machine** ; seul un rapport mesuré dans la même minute l'est, parce que les deux
révisions subissent la même chose ensemble.

**Une probabilité se regroupe, un compte ne se regroupe pas.** `surDt` convertit
« la chance que ça arrive » d'une heure à une tranche de vingt-quatre. Il ne
convertit pas « combien de fois ». Un mécanisme qui peut se produire plusieurs
fois par tranche est donc simulé différemment selon la maille — et la maille
dépend de la distance au joueur.

> **Incident.** Mesuré par `banc --maille`, la même ville clonée sur quarante
> jours : population et ménages divergent entre les deux mailles. La cause est
> `rng.chance(surDt(p))` suivi de `pop += irange(0, 2)` — une seule occurrence
> par tranche, de même ampleur, là où vingt-quatre heures fines en autorisent
> vingt-quatre.

**Une saturation ne se regroupe pas non plus, et elle coûte plus cher.** Un
plafond, un plancher, un `min` ou un `max` posé une fois par tranche ne rend pas
ce que le même plafond rend vingt-quatre fois de suite — parce qu'entre deux
heures, ce qui bute a le temps de se regarnir.

> **Incident.** Le même chantier annonçait « la cause est identifiée et
> localisée » : deux tirages quantifiés, rien d'autre. Faux, et le plancher de
> bruit l'a montré. Le vrai poste dominant est `min(facture, col.menages)` dans
> `economy.js` : les ménages achètent une fois par tranche, plafonnés à ce
> qu'ils ont *au début* de la tranche, et les salaires de la journée n'arrivent
> qu'après — trop tard pour être dépensés. Erreur locale mesurée : **4,81
> crédits par ville et par jour** à `dt = 24`, proportionnelle au pas (0,21 à
> `dt = 2`), exactement antisymétrique entre caisse et ménages puisque c'est un
> transfert, et **293 crédits par jour dans les villes où le plafond mord
> contre 1,71 là où il ne mord jamais**. Trois signatures concordantes, aucune
> supposition.

**Une grandeur collée à sa borne rend un écart nul qui ne prouve rien.**
Avant de lire « identique au millième » comme une invariance, il faut compter
combien des deux côtés sont assis sur la même butée.

> **Incident.** Ce même `banc --maille` annonçait rations, agitation et caisse
> « identiques au millième » sous les deux mailles, et on en avait tiré que les
> taux se regroupent exactement. Relevé après coup sur les quarante villes de la
> mesure : l'agitation était à 1,000 dans trente d'entre elles et à 0 dans neuf,
> les greniers vides dans dix-neuf, les caisses dans quatorze. La médiane
> comparait des villes saturées à elles-mêmes. Villes saturées écartées, trois
> de ces grandeurs sortent du plancher de bruit. Le banc écarte désormais,
> grandeur par grandeur, les villes dont les deux côtés sont sur la même borne,
> et affiche combien il en reste.

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

---

## 10. La voie rapide de l'apparence

Fixée par le propriétaire (« beaucoup beaucoup beaucoup plus rapide »,
août 2026), après une soirée où sept lots d'interface ont coûté quinze
passages de la suite navigateur (~100 s chacun) pour un effet perçu
faible.

- **Ce qui est de l'apparence pure** — styles.css, gabarits HTML
  d'ui.js, dessin du canevas — se travaille **par passes groupées** :
  plusieurs retouches, UN passage de la suite navigateur à la fin de la
  passe, `--complet` avant de pousser. Le vérifieur rapide (35 s) reste
  le réflexe entre deux retouches.
- **Ce qui est un mécanisme d'interface** — ancres de lecture, moments,
  sauvegardes, replis, gestes de carte — garde le cycle complet : test
  rouge d'abord, un lot à la fois. C'est là que vivent les régressions
  qui coûtent des soirées.
- La frontière en un test : « si ça casse, est-ce que ça se VOIT au
  premier coup d'œil ? » Oui → apparence, passe groupée. Non → mécanisme,
  cycle complet.

## 11. La lenteur

Écrite après la longue chasse d'août 2026, déclarée « priorité maximale » par le
propriétaire : « le jeu rame énormément, c'est de pire en pire », puis « c'est
devenu injouable ». Elle a duré des jours, et les trois premiers n'ont servi à
rien. Ces sept règles sont ce qu'ils ont coûté.

**Ne devine pas. Mesure — et vérifie que tu mesures ce que tu crois.** Une
mesure de performance est fausse par défaut ; c'est le cas normal.

> **Incident, trois fois de suite.** (1) Je chronométrais le retour du
> gestionnaire de clic, pas l'image réellement peinte : tout le travail de mise
> en page tombait après ma borne. Il faut mesurer jusqu'à la seconde
> `requestAnimationFrame`. (2) Je bridais le processeur à ×6 mais pas la carte
> graphique, ce qui rendait gratuits les trois `backdrop-filter: blur()` qui
> coûtaient le plus cher sur un téléphone. (3) Je mesurais sur un monde de banc
> et non sur une partie jouée — or c'est la partie jouée qui contient les mille
> deux cents personnes. Trois « correctifs » livrés contre des problèmes qui
> n'existaient pas.

**Les instruments vivent dans le jeu, pas à côté.** Le seul juge est l'appareil
qui peine, et il n'est pas sur le bureau de celui qui code.

> **Incident.** La chasse n'a avancé qu'à partir du moment où le panneau ⛁ a su
> dire, sur le téléphone du propriétaire : le coût moyen d'un rendu, le pire par
> écran, le prix de chaque bloc (`chrono`), ce que pèse la partie (« Peser la
> partie »), et combien de fois chaque bloc est refabriqué
> (`window.__blocsFaits`). Trois lignes recopiées par le propriétaire — « base
> 3048 ms », « école 2749 ms », « player.groupes 24140 Ko » — ont désigné trois
> causes que des jours de mesures locales n'avaient pas trouvées.

**Cherche le carré.** Presque toute lenteur installée est quadratique. La
question qui la trouve : *qu'est-ce qui est fait une fois par personne,
multiplié par une fois par personne ?* Sur cinq membres ça ne se voit pas ; sur
mille deux cents, c'est un million d'opérations.

> **Incidents, tous de la même famille.** Le tick de l'escouade liait chacun à
> chacun : 609 310 → 17 725 µs/h à mille deux cents membres (×34), et **inchangé
> à cinq** (515 → 540) — la preuve qu'on n'a pas payé le gain sur les petites
> parties. La galerie d'escouade posait toute la liste : 178 396 → 9 628
> éléments, 12 272 → 808 ms. Le bloc école rappelait `ecolesAvantPoste` à chaque
> test d'aptitude : 2749 → moins de 5 ms. La fin de combat liait tous les
> debouts deux à deux : sept cent mille liens créés par bataille. Et les liens
> eux-mêmes, hérités de la version d'avant : un million cinq cent mille entrées,
> 21 Mo → 417 Ko une fois élagués (÷52).

**Ne refais pas ce qui n'a pas changé.** Un écran, un dessin, un formateur, un
texte : si rien de ce qui l'alimente n'a bougé, le refaire coûte tout son prix
pour rien.

> **Incidents.** `poserEcran` ne remplace que les blocs de premier rang dont le
> HTML diffère. Le terrain de la carte est peint hors écran et gardé tant que
> son empreinte tient. Les `Intl.NumberFormat` sont mémorisés. Les boutons du
> comptoir ne refabriquent plus que leur panneau : neuf blocs par clic, plus
> qu'un. Attention au piège inverse : comparer le HTML **produit**, jamais le
> DOM vivant, que le navigateur normalise — sans quoi chaque bloc paraît
> modifié.

**Borne tout ce qui grandit.** Ce qui croît sans plafond finit toujours par
ramer : la question est quand, pas si.

> **Exemples tenus.** Vingt-quatre fiches d'escouade posées d'un coup
> (`PAS_ESCOUADE`), six voisins de chaque côté pour la cohésion et le combat
> (`LIENS.cercle`), vingt-quatre liens retenus par personne (`LIENS.gardes`),
> quatre cents lignes de journal, huit actes au dossier d'un officier. Un
> plafond n'est pas une règle de jeu quand il ne change rien de ce qui se lit :
> l'ami et le rival d'une fiche sont les extrêmes, donc les premiers gardés.

**Mesure la bonne grandeur.** Un seuil juste posé sur le mauvais objet est une
sonde qui ment.

> **Incident, le jour même.** La sonde de l'élagage pesait le groupe entier —
> compétences, corps, équipement compris — alors que le correctif ne portait que
> sur les liens : 1107 → 293 Ko, soit un facteur 3,8 pour un gain réel de 8 sur
> ce qui changeait. Le réflexe interdit est d'élargir le seuil ; le bon geste est
> de peser ce que le correctif touche.

**Vérifie que tu n'as pas déplacé le coût.** Un gain de mémoire se paie souvent
en temps, et l'inverse.

> **Incident, le jour même.** Le premier élagage des liens se faisait dans
> `ajusterLien`, à chaque lien touché. Compter les clés d'un dictionnaire alloue,
> et deux comptages par ajustement dans une boucle de combat ont suffi à faire
> repasser au rouge la sonde « une personne de plus coûte le même prix, qu'on en
> mène cent ou cinq cents » : ×4,2 par tête, quand elle exige moins de 2,5. Sans
> cette sonde, un progrès qui n'en était pas un partait en livraison. On élague
> là où c'est gratuit — à l'ouverture de la partie —, et l'on empêche de créer
> là où c'est cher.

**Fais échouer vite ce qui va échouer.** Une faute que le filet ne voit pas se
paie au prix de l'étape qui finit par la voir.

> **Incident.** Une parenthèse manquante dans un gabarit de `ui.js` — que rien
> n'importe côté moteur, et que le bundle recopie sans le parser. Les trois
> étapes rapides sont restées vertes ; la faute ne s'est vue qu'après trois
> minutes de suite navigateur, sous la forme d'une page qui ne charge pas et
> d'un délai dépassé sur un sélecteur sans rapport. `node --check` sur chaque
> fichier de `src/` coûte trois secondes et le dit avec le numéro de ligne :
> c'est désormais la première chose que fait le vérifieur.

**Le cumul de la chasse**, sur l'appareil du propriétaire : un rendu 1584 → 49
ms, l'écran Base 2454 → 110, le bloc école 2427 → 71, le tick du monde ×34 à
mille deux cents membres, et les personnages de 24 Mo à environ 4.

## 12. La mesure ment aussi

Écrite après deux jours passés à chercher une pompe à monnaie qui n'existait
pas. On se méfie beaucoup du code et pas assez du chiffre qui le juge : une
colonne du banc a le même air d'autorité qu'elle soit juste ou vide de sens.

**Une somme d'unités hétérogènes n'est pas une mesure.** Avant de croire un
agrégat, demande dans quelle unité chacun de ses termes est libellé.

> **Incident.** La colonne « masse » du banc additionne les caisses, les
> ménages et les trésors de trente-six pays — chacun dans sa propre monnaie,
> dont les cours vont de 0,01 à 186. Un pays dont la monnaie s'effondre porte
> cent fois plus d'unités pour la même valeur, et le bureau de change fabrique
> légitimement ces unités-là. La colonne montait donc dès que les cours
> divergeaient, sans qu'un sou ait été créé nulle part. Elle a fait déclarer un
> chantier « déstabilisant pour le monde » (PACTES, P3), puis condamner deux
> hypothèses successives — l'entretien des relations, le coût du secours —,
> toutes deux innocentées au banc. En valeur réelle, le cas qui paraissait le
> pire — « masse quatre fois le témoin » — valait exactement le témoin.

**L'invariant qui ne bouge pas est une information, pas un détail.** L'audit
comptable était resté à zéro exact pendant toute la chasse. Zéro veut dire
« rien n'a été créé ni détruit ». Il disait donc, dès le premier jour, que la
monnaie ne se fabriquait nulle part — et que le chiffre qui montait mesurait
autre chose. Personne ne l'a écouté parce qu'il était vert.

**Remonte la chaîne causale jusqu'au bout avant d'accuser.** Le dernier maillon
de mon hypothèse — « les conseils compensent en battant monnaie » — se
vérifiait en une ligne : chercher les appelants d'`emettre`. Il n'y en a qu'un,
et c'est le joueur. Aucun conseil du monde ne bat monnaie. Une hypothèse dont
un maillon est faux ne se teste pas au banc pendant deux jours, elle se lit.

> La règle pratique : quand une mesure surprend, la première suspecte est la
> mesure. On la refait dans une unité qu'on sait homogène — ici la valeur en
> ancien crédit, le pivot du bureau de change — et on regarde si la surprise
> tient. Elle n'a pas tenu.
