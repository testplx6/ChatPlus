# Chantier « Plusieurs implantations »

🟡 **Ouvert, rien n'est engagé.** Le propriétaire a demandé, août 2026 :
« il faudrait pouvoir créer plusieurs bases non ? pourquoi une seule ? », puis
« il faut peut-être travailler sur le système multi bases et villes avant la
conquête des autres ». Ce cahier fait l'état des lieux et pose les décisions.
**Aucune ligne ne s'écrit avant qu'elles soient tranchées** (`METHODE.md` §9).

L'intuition de l'ordre est juste, et le code la confirme : prendre une ville
n'a pas de sens tant qu'on ne sait pas en tenir une.

---

## 1. Le constat, et c'est une bonne surprise

J'ai recensé ce que le moteur sait déjà faire. Presque tout est là.

| ce qu'il faudrait | l'état du code |
|---|---|
| **Prendre une ville de force** | `capturer` (factions.js:313) le fait déjà : les murs cèdent, la place change de drapeau, la région bascule, une dépêche part. Écrit pour les armées de faction. |
| **Gouverner une place** | 18 prérogatives écrites (`PREROGATIVE_KEYS`) : garnison, greniers, change, bourse, crédit, monnaie, rachat de dette, lois, désignation d'une place forte, levée et envoi de colonnes, guerre, paix, accords, **et fondation d'un poste** (`fonderPoste`). |
| **Que ces verbes soient tous à vous** | Fait, et livré : `peutExercer` accorde tout, sans condition de rang, à qui **porte la couronne** — `accepterCouronne` (chantier Maréchal, M7-M8). |
| **Fabriquer un drapeau en cours de partie** | Fait, et livré : `fonderColonne` (factions.js:1675) crée une faction complète — identité dans `world.drapeaux`, couleur et symbole neufs, relations vides, masse monétaire nulle. Le chantier `FACTIONS-NEUVES.md` a réglé ça. |
| **Fonder une place** | `fonderPoste` existe (COUT_POSTE = 1500), pour une faction. |
| **Percevoir sur ses places** | `preleverImpot` existe — mais dans le sens inverse : c'est **vous** qui payez. |

## 2. Ce qui manque vraiment : une seule chose

**Le joueur n'a pas de drapeau.**

Toute la machine ci-dessus prend une faction en argument. Le joueur n'en est
pas une : il *sert* un drapeau (allégeance, charges, crédit) ou il n'en porte
aucun. Les trois conséquences se lisent directement dans le code :

- `declarerIndependance` (base.js:1809) met `col.faction = null`. Votre camp
  affranchi n'est **à personne** — pas à vous.
- `capturer` refuse implicitement votre escouade : elle n'est pas une
  `world.armees` avec un `armee.faction`. La prise de ville existe, vous n'avez
  simplement pas de quoi la déclencher.
- Les 18 prérogatives ne s'exercent qu'« auprès de » quelqu'un. Sans drapeau,
  aucune ne vous est ouverte ; avec la couronne d'un pays existant, elles le
  sont **toutes** — mais les villes sont à ce pays, et son conseil peut vous
  les reprendre.

`state.base` compte **133 références** dans `src/`, dont 43 dans `base.js` et
27 dans `ui.js`. C'est le chiffre à garder en tête pour la suite.

## 3. Trois architectures

**A — plusieurs camps à bâtir.** `state.base` devient une liste ; on bâtit,
emploie, stocke, recherche et défend dans chacun, avec un sélecteur de camp.
Le Kenshi classique.
*Coût* : les 133 points au pluriel, une migration de sauvegarde, les sièges et
l'énergie par camp, un tick qui croît avec le nombre de camps.
*Ce que ça débloque* : bâtir ailleurs. **Pas la conquête** : une ville prise
n'est pas un camp qu'on bâtit, c'est une ville qui vit déjà.

**B — la couronne d'un pays existant.** On ne code rien : on monte dans une
faction jusqu'à la couronne, et ses villes sont à commander.
*Coût* : zéro, c'est livré.
*Ce que ça débloque* : gouverner beaucoup, posséder rien. Le conseil décide,
vous exécutez ou vous tombez (légitimité). Ce n'est pas « mes villes ».

**C — votre drapeau.** Le joueur devient une faction du monde, par le mécanisme
déjà écrit pour les colonnes en sécession. Dès lors : votre escouade peut
prendre une place (`capturer` marche tel quel), vos villes sont vôtres,
`fonderPoste` vous ouvre une seconde implantation, l'impôt rentre au lieu de
sortir, et les 18 prérogatives sont à vous par la couronne de votre propre
maison.
*Coût* : le mécanisme de naissance existe ; ce qui est neuf, c'est la porte
d'entrée (à quelles conditions), le fait que le monde ne doit **pas** jouer
votre drapeau à votre place, et l'interface d'un pays qu'on tient.
*Ce que ça débloque* : tout le reste, y compris la conquête demandée.

## 4. La voie proposée — trois marches, dans cet ordre

Elle n'est pas décidée ; c'est une proposition.

1. **Votre drapeau.** La porte : depuis un avant-poste reconnu et indépendant,
   planter ses couleurs. `fonderColonne` fournit le patron exact — nom dérivé
   du berceau, couleur neuve, relations vides, trésor nul, donc invariant
   comptable intact par construction.
2. **Prendre une place.** L'escouade se conduit comme une colonne sous votre
   drapeau devant une ville ; la mécanique de siège et `capturer` font le
   reste. C'est le « comment capturer une ville avec son escouade » demandé
   plus tôt.
3. **Tenir plusieurs places.** Rien à inventer : ce sont vos villes, elles
   vivent seules (coût de simulation nul, elles tournent déjà), et les
   prérogatives les gouvernent.

L'architecture A reste possible **après**, comme chantier propre, si bâtir un
second camp à la main manque encore une fois qu'on tient trois villes.

## 5. Ce qui doit être tranché avant la première ligne

- **Q1 — Quelle porte ?** Fonder son pays doit-il exiger un avant-poste
  reconnu et indépendant ? Une population minimale ? Une victoire ? Rien du
  tout ? (`fonderColonne` exige d'avoir des hommes : « on ne fait pas sécession
  de rien ».)
- **Q2 — Qui joue votre drapeau ?** Le monde fait tourner un conseil, une
  humeur, une agression pour chaque faction. Le vôtre doit-il être inerte
  (vous seul décidez, rien ne se passe si vous ne faites rien) ou vivant
  (vos gens ont des avis, et un conseil qui peut vous démettre) ?
- **Q3 — Qu'emporte-t-on en naissant ?** Rien, comme les Affranchis ? Le camp
  et ses gens ? Les villes déjà tenues sous une autre couronne ?
- **Q4 — Comment prend-on une ville ?** Siège en règle (durée, faim, murs,
  reddition) ou assaut direct de l'escouade ? Que devient la population, la
  garnison, les notables, la ville de qui la perd ?
- **Q5 — Le camp reste-t-il unique ?** Autrement dit : ouvre-t-on A un jour, ou
  la seconde implantation est-elle toujours une ville ?
- **Q6 — Le monde répond quoi ?** Un drapeau neuf qui prend des villes : les
  voisins s'allient contre lui ? Le pays qu'on a quitté fulmine (déjà écrit
  pour l'indépendance) ? Ça se règle par les mécanismes existants, mais il
  faut le dire.

## 6. Les pièges déjà connus

- **La règle d'or.** `state.world` est partagé, `state.player` est privé, et
  aucun calcul du monde ne lit le joueur. Un drapeau du joueur vit dans le
  monde ; ses **décisions** doivent y arriver comme celles des autres — par
  des ordres déposés, jamais par une lecture de `state.player` depuis le tick.
- **L'invariant comptable.** Une faction naît à masse monétaire nulle. Tout
  ce qu'on lui donne doit venir d'ailleurs, jamais de rien. La garde de
  cohérence le dira immédiatement.
- **Jamais un tirage de plus.** Couleur et symbole neufs se dérivent
  (`couleurNeuve`, `symboleNeuf`), ils ne se tirent pas du flux principal.
- **La migration.** Toute clé nouvelle passe par `normaliser`, avec une valeur
  pour les parties déjà commencées — celle du propriétaire a plus de 750 jours.
- **Le coût.** Une faction de plus, c'est un conseil de plus dans le tick.
  Mesuré au banc avant/après, comme toujours.
