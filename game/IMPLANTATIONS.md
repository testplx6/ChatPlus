# Chantier « Plusieurs implantations »

🟢 **Ouvert, trois décisions prises, quatre marches au programme.** Le
propriétaire a demandé, août 2026 :
« il faudrait pouvoir créer plusieurs bases non ? pourquoi une seule ? », puis
« il faut peut-être travailler sur le système multi bases et villes avant la
conquête des autres ». Les trois décisions de cadrage sont
prises (§3) ; ce qui reste à trancher avant la première ligne de M1 est en §5.
**Rien ne s'écrit avant** (`METHODE.md` §9).

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

## 3. Ce que le propriétaire a décidé (août 2026)

**D1 — Le choix, jamais une seule issue.** Dit mot pour mot : « avoir le choix
entre créer son drapeau ou capturer une ville pour le compte d'une faction ou
juste attaquer pour d'autres raisons, détruire, prendre les richesses,
matériaux etc, prendre les hommes etc etc etc ». Une ville qu'on a battue n'a
donc pas une suite, elle en a plusieurs, et c'est devant la place qu'on tranche.
Attaquer ne suppose aucun drapeau : on peut piller et repartir.

**D2 — Votre pays est vivant.** Conseil, humeur, notables qui jugent — comme
tous les autres pays du monde. Ils peuvent vous contredire, et à légitimité
nulle vous tombez. « Ce que vous tenez, vous le tenez parce qu'on vous suit. »

**D3 — Autant de camps qu'on veut.** L'architecture des camps multiples est
désirée, pas écartée : `state.base` passera au pluriel. « Tout est possible. »

## 4. Le plan — quatre marches

Chacune est jouable seule et se livre seule. L'ordre va du moins de code neuf
au plus, et chaque marche prépare la suivante sans la présumer.

### M1 — L'assaut et ses suites *(aucun drapeau requis)*

Le verbe qui manque : **attaquer une ville**. Aujourd'hui la seule attaque que
le joueur peut lancer sur le monde est `attaquer-caravane` — une seule action
dans toute l'interface.

*Ce qui existe déjà* : le combat (`resoudreCombat`), les bandes
(`genererBande`), le butin (`butin`, et le portage qui le borne), la prise
d'hommes (`capturables`, `fairePrisonniers`), ce qu'on en fait ensuite
(`disposer`, `disposerTous` : rançon, prime, esclavage, relâcher), la mémoire
de qui a vu quoi (registre des faits, « pas vu, pas su »), et un patron
complet à copier : `attaquerCaravane` (caravanes.js:807) fait déjà combat →
butin borné par le portage → retrait de l'entité → rancune nommée avec témoins.

*Ce qui manque* : la garnison d'une ville comme adversaire, les murs qui
comptent, et surtout **le menu d'après-victoire** — piller les réserves,
emporter les matériaux, prendre des hommes, saccager, se retirer. Le moteur
sait déjà saigner une place : `capturer` le fait pour l'Essaim (population,
stocks, défense, grogne). C'est ce chemin-là qu'on ouvre au joueur.

### M2 — Prendre pour un drapeau qu'on sert

La place tombe et l'on n'en veut pas pour soi : on la donne à ceux dont on
porte les couleurs.

*Ce qui existe* : `capturer` fait basculer la ville et la région ; le mérite
porté au dossier (`porterMerite`), le crédit, les charges. *Ce qui manque* :
que l'escouade puisse déclencher `capturer` au nom d'une faction, et le prix
politique si l'on prend une ville que le conseil n'avait pas demandée.

### M3 — Votre drapeau, vivant

*Ce qui existe* : `fonderColonne` (factions.js:1675) fabrique une faction
entière en cours de partie — identité dans `world.drapeaux`, couleur et
symbole dérivés, relations vides, trésor et masse monétaire nuls, donc
invariant comptable intact par construction. La couronne donne déjà les 18
prérogatives (`peutExercer`), et la légitimité peut déjà vous faire tomber.

*Ce qui manque* : la porte (à quelles conditions on plante ses couleurs), un
conseil qui soit le vôtre (D2), et que le tick du monde ne joue pas votre
drapeau à votre place.

### M4 — Autant de camps qu'on veut

*Ce qui manque* : les **133 références** à `state.base` au pluriel (43 dans
`base.js`, 27 dans `ui.js`), un sélecteur de camp dans l'interface, l'énergie
et les sièges par camp, la migration des parties en cours, et une mesure du
tick avant/après.

C'est le chantier lourd, et il vient en dernier non par réticence mais parce
que les trois autres ne l'attendent pas — et qu'il sera plus simple à écrire
quand on saura ce qu'est « une place à soi ».

## 5. Ce qui reste à trancher avant d'écrire M1

- **Q1 — Comment une ville tombe-t-elle ?** Assaut direct de l'escouade (une
  bataille, on entre ou on recule) ou siège en règle (on s'installe, la faim
  travaille, la place se rend) ? Le moteur sait faire le siège — mais dans
  l'autre sens, contre votre camp.
- **Q2 — Que deviennent les hommes pris ?** Le moteur sait déjà en faire des
  prisonniers, les rançonner, les livrer contre prime, les vendre, les
  relâcher. Peut-on aussi les enrôler dans l'escouade ? Les emmener au camp
  comme habitants ?
- **Q3 — Le pillage, jusqu'où ?** On ne remporte que ce qu'on peut porter
  (c'est déjà la règle des caravanes, et ce qui donne son prix à l'attelage).
  Une ville a beaucoup plus que ça : le reste brûle, reste sur place, ou
  attend un second voyage ?
- **Q4 — La porte du drapeau (M3).** Un avant-poste reconnu et indépendant
  suffit-il ? Faut-il des hommes, une victoire, une ville ?
- **Q5 — Ce qu'on emporte en naissant (M3).** Rien, comme les Affranchis ? Le
  camp et ses gens ? Les places déjà tenues sous une autre couronne ?
- **Q6 — La réponse du monde.** Un drapeau neuf qui prend des villes : les
  voisins s'allient contre lui ? Le pays quitté fulmine (c'est déjà écrit pour
  l'indépendance) ? Ça se règle avec l'existant, mais il faut le dire.

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
