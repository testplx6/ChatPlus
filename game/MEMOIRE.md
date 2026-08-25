# La mémoire a des porteurs — cahier des charges

Ouvert par le propriétaire (« ouvre », août 2026), à la suite de la revue au
prisme (AUDIT.md §prisme) : ses deux derniers écarts, S1 et S5, sont le même
défaut vu des deux côtés — plus E12 de l'audit, et la rancune. Conçu en
binôme avec le game master, chaque fait moteur revérifié à la ligne. Format
METHODE §9. **Rien ne se code avant que le propriétaire ait tranché les
décisions.**

Le principe : **ce que le monde sait du joueur doit être appris par
quelqu'un, transporté par quelqu'un, retenu par quelqu'un — et oublié par la
vie, pas par le chronomètre.**

## 1. Le constat, chiffré

**S1 — l'oubli au chronomètre.** Chaque jour à heure fixe
(events.js:548), toute estime positive fond de 0,1/j au-dessus du palier 30,
toute rancune de 0,45/j. Le joueur est le seul être du monde traité ainsi :
entre elles, les factions ne bougent que sur événements (`majRelation` —
guerre −60, paix +45, prise −25). Une caravane pillée (−22) est pardonnée en
~49 jours sans qu'un seul agent ait décidé de pardonner. Et **l'ouverture a
été calibrée contre cette pente** (allegeance.js:94-117, en toutes lettres) :
seuil d'enrôlement à 10 parce que les 12 d'estime de départ fondent ; porté à
15, le banc rendait 30 parties engagées → 7, heures sous les couleurs
3 894 → 659, patrimoine 4 616 → 1 769. Tuer la pente sans remesurer, c'est
décalibrer l'ouverture en silence. La raison d'être de l'oubli est réelle et
documentée sur place : sans lui, la réputation est « un cliquet qui descend »
— toute refonte doit garder une porte de sortie de l'hostilité.

**S5 — l'omniscience.** Cinq actes du joueur se savent partout, à l'heure
même, sans témoin ni route : s'engager → −20 immédiat chez chaque ennemi en
guerre (allegeance.js:504) ; vendre un esclave → −14 les siens et −4 chez
toute abolitionniste, planétaire et instantané (justice.js:430-435) ; les
organes → −5 partout où c'est interdit (depouilles.js:230-234) ; piller une
caravane → −22 + rancune nommée des deux villes, **même quand l'escorte est
morte jusqu'au dernier** (caravanes.js:858-866) — alors que `resoudreCombat`
rend `survivantsB` (combat.js:433) et que personne ne le lit ici ;
l'indépendance → −35 à l'instant du geste (base.js:1820-1821). Le joueur,
lui, subit le brouillard : relevés datés, forces cachées, rapports en retard.

**E12 — les nouvelles sans jambes.** `DELAI_NOUVELLE` (connaissance.js:366)
est une table par type : une ville qui s'effondre se sait en 72 h qu'elle
soit à 2 cases ou à 30. La distance, colonne vertébrale de tout le reste du
jeu, n'entre pas dans le voyage de l'information.

**Le patron existe déjà, livré et mesuré.** La correction E3
(base.js:2474-2483) est le prototype exact : `rachatsFaits`, une liste de
faits datés `{faction, t}`, bornée (12), lue au moment où l'agent décide —
mémoire propre 3 000 h, rumeur 720 h, tout s'érode. Et les porteurs sont
debout : l'opinion d'un notable (mémoire bornée à 4 souvenirs,
services.js:71), leur mortalité (notables.js:294), les successions avec bilan
de règne (dirigeants.js:273-286), le bouc à visage (F2), la mémoire du joueur
bornée à 60 rencontres (rapport.js). Il ne manque que le branchement.

**Une asymétrie à connaître avant de choisir le porteur** : aujourd'hui
l'opinion d'un notable se cale SUR la réputation scalaire
(notables.js:282-289, vitesses asymétriques). Migrer l'estime « chez le
souvenant » (tranché T5 de l'audit), c'est inverser ce sens de dérivation.

## 2. La cause

La réputation est née scalaire quand le monde n'avait ni notables, ni
dirigeants, ni relevés datés ; chaque système d'information est venu après
sans qu'on rebranche la mémoire du monde sur eux. L'érosion quotidienne et
l'omniscience sont les deux béquilles de cette époque : l'une remplace
l'oubli des gens, l'autre remplace leurs yeux.

## 3. Les lots — l'ordre est celui de la mesure

**Le principe unificateur : le FAIT.** Un acte du joueur devient un objet
daté et situé — `{type, regionId, t, temoins}` — qui **voyage** par un
canal, **arrive** chez une faction à une heure calculée, et n'a d'effet qu'à
l'arrivée. Une seule infrastructure pour S5, E12 et S1 ; le scalaire
`reputation[faction]` reste la vue agrégée (décision n°1), mais plus rien ne
l'écrit sans passer par un fait.

- **L1 — les jambes (E12), monde → joueur d'abord** *(petite)*.
  `delaiNouvelle(world, deRegionId, type, versRegionId)` = base du canal ×
  distance. Trois canaux calibrables : **proclamation** (guerre, paix —
  criée sur les places, rapide), **rumeur de route** (chute, sécession, vos
  actes — au pas des colporteurs, ~4-8 h/case, à balayer), **regard direct**
  (témoin : 0). `saison` reste à 0 — on regarde le ciel soi-même. Zéro effet
  d'équilibre : des dates d'affichage — c'est pour ça qu'il part en premier.
- **L2 — le registre des faits : une seule porte d'écriture** *(moyenne)*.
  `commettre(state, fait)` devient l'unique chemin vers `reputation` : le
  fait entre au registre (borné, comme `rachatsFaits`), avec pour chaque
  faction l'effet et l'heure `su` où elle l'apprend (L1 la calcule). Un acte
  commis en face de l'intéressé — contrat rendu, péage payé, rançon versée —
  a `su = t` : rien ne change pour lui. `tick` applique à l'échéance (file
  triée, pas de balayage). Pur refactor à ce stade : valeurs et dates
  identiques, testé comme tel.
- **L3 — les cinq omniscients passent au registre (S5)** *(moyenne)*.
  S'engager : l'enrôlement se fait en ville, devant témoins — le fait part
  en rumeur vers chaque capitale ennemie, le −20 arrive avec la nouvelle.
  Esclave/organes : témoins = toute la ville ; l'abolitionniste à 3 cases
  l'apprend avant celle à 14 — valeurs inchangées, dates vraies. Caravane
  pillée : lecture de `survivantsB` et des témoins du lieu (ville sur la
  case, région contrôlée, colonne à ≤ 1 case) ; sans aucun témoin, voir
  décision n°2. Indépendance : une proclamation — on décroche un drapeau
  pour que ça se sache — canal rapide, mais un délai quand même.
- **L4 — l'oubli a des visages (S1 + la rancune)** *(grosse par la mesure,
  pas par le code)*. Mort de l'érosion à `temps % 24`. L'oubli devient trois
  événements, tous existants : (1) **la succession** — le successeur hérite
  d'une part de l'estime et de la rancune selon SON tempérament, même patron
  que F1/F2 ; (2) **la mort du porteur** — un notable de vos rencontres qui
  meurt, la ville théâtre de vos faits qui tombe : les faits correspondants
  cessent de compter (le registre borné pousse les vieux dehors) ; (3) **la
  réparation**, inchangée — contrats, services, rançons, relâchés : déjà le
  seul chemin actif, il devient le principal. Puis **la remesure d'ouverture
  au banc** : profils par drapeau contre témoin (parties engagées, heures
  sous les couleurs, patrimoine), et si l'ouverture a bougé, recalage
  d'`ESTIME_ENGAGEMENT` par balayage, pas à vue.
- **L5 — la mémoire chez le souvenant (décision n°1 : c'est la cible).**
  Le scalaire devient la lecture agrégée des porteurs nommés. Architecture
  arrêtée avec le game master (août 2026), chaque affirmation revérifiée
  dans le code :
  - **La mémoire du porteur est une vue pondérée du registre joueur** —
    jamais une liste sur l'objet dirigeant (`dk` vit dans `state.world`,
    partagé : piège n°5, et il est remplacé d'un bloc à la succession,
    dirigeants.js:281). Chaque effet du registre gagne un `poids` (défaut
    1) ; « ce que la maison k pense de vous » = Σ des effets appliqués ×
    poids, clampée à ±100 **à la matérialisation** (le clamp change
    d'endroit : un joueur à −300 de faits qui rachète +50 ne bouge pas de
    −100 — hystérésis plus vraie, au banc de juger).
  - **L'assiette s'élargit d'abord** : les douze actes encore sur la porte
    brute (contrats.js:381 et 510, services.js:233, events.js:268/275/407/
    715/724, allegeance.js:554/1114/1159, justice.js:320) passent par
    `commettre` avec `su = t` — valeurs identiques, dates inchangées. Sans
    ça, un successeur rancunier garderait vos pillages (des faits) mais
    transmettrait intact ce que trente contrats ont bâti (du fonds) —
    régression sur L4.
  - **Le filet continu devient un fait-fleuve** : la patrouille
    (squad.js:675, +0,05/h) et la rancune criminelle P5
    (allegeance.js:1057, −0,02/h) ne poussent pas soixante entrées — UN
    fait par (type, faction) dont le delta s'accumule (borné, calibrable)
    et dont la date avance. « Il tient nos routes depuis des semaines »
    est un fait, qu'un successeur repèse et qu'un conseil peut classer.
    Ni fonds ambiant séparé (un mini-scalaire sans porteur : S1 en petit),
    ni micro-faits (ils évinceraient la vraie mémoire du registre borné).
  - **Le fait fondateur** : à `nouvellePartie` (l'accueil, sim.js:243-244)
    et dans `normaliser` (le scalaire existant des vieilles sauvegardes),
    un fait `passe` par faction non nulle, `su = t`, poids 1 — « le passé
    est réputé su, on ne réécrit pas l'histoire », et un successeur repèse
    aussi l'accueil que sa maison vous avait fait.
  - **La succession repèse les faits, elle ne multiplie plus le chiffre** :
    `HERITAGE_COUR` s'étend en **une seule table de mémoire par
    tempérament** (estime, rancune, patience) — jamais deux tables de
    caractère qui finiraient par se contredire. Au signal du guetteur
    (state.player.chefs, livré à L4), les poids des effets DÉJÀ appliqués
    sont multipliés par la part (estime si delta > 0, rancune sinon), puis
    on matérialise. Les faits encore en route arrivent au nouveau chef à
    plein poids : il apprend une nouvelle, il n'hérite pas d'une rancune.
    Les successions composent naturellement (deux rapaces : ×0,6 puis
    ×0,6). Trois différences de comportement assumées et remesurées contre
    L4-témoin : l'inversion de signe sur mémoire mixte (+30/−20 chez un
    rancunier : +5 hier, −5 demain — c'est exactement lui), les faits en
    route, le clamp déplacé.
  - **L'oubli tombe au conseil du porteur, pas à une heure fixe** : les
    conseils battent à `f.prochainConseil` (rng.irange(30,90),
    factions.js:852) — guetteur joueur sur `f.dernierConseil` (le joueur a
    le droit de lire le monde), tampon `state.player.conseilsVus[k]`, même
    patron que `chefs`. À SON conseil, le porteur classe LE plus vieux
    fait négatif dont l'âge dépasse `patience × |delta| / OUBLI.parPoint`
    — une insulte à −3 se lâche vite, un pillage à −22 sept fois plus
    tard, un rancunier (patience quasi infinie — un grand fini,
    `Infinity` ne survit pas à JSON, précédent monnaie.js:64-70) jamais.
    Un par conseil, argmax stable : entièrement déterministe, zéro tirage.
  - **Quatre événements recalculent, aucun balayage horaire** : arrivée
    d'un effet (tickFaits), succession, oubli au conseil, **éviction par
    FAITS_MAX** (sinon l'agrégat garde des contributions fantômes —
    recompute dans `commettre` après le shift). Toute la recomputation vit
    dans faits.js (`materialiser`, `repeserPorteur`) : le garde statique
    « seule faits.js touche la réputation » reste vrai en substance, pas
    seulement en regex.
  - **notables.js:288-289 s'inverse en douceur** : l'opinion continue de
    suivre la réputation locale — qui devient l'agrégat — plus leurs
    souvenirs propres (`retenirEnVille`), au poids posé en constante
    calibrable (double comptage local assumé et dit : « on juge quelqu'un
    sur ce qu'il fait ici »). L'écart préexistant `p.opinion` côté monde
    est consigné, pas creusé ni résorbé ici.
  - **Le pillard anonyme ne change pas** : mémoire sans opinion tant que
    personne n'est nommé (décision n°2 verbatim), pas d'attribution
    rétroactive — on n'invente pas un savoir. La route mal famée et la
    ville qui retient agissent déjà par les bons canaux.
  - **Remesure finale contre L4-témoin** (décision n°4) : la repesée par
    signe n'est pas neutre sur mémoire mixte — banc 30 × 4000 h, mêmes
    graines, et rien de regelé à vue.

## 4. Les décisions du propriétaire — TRANCHÉES (août 2026)

1. **Qui porte l'estime ?** — « (b) a l'air beaucoup mieux, mais il faut
   faire (a) d'abord ? » Oui : **(a) est le marchepied de (b)** — le registre
   de faits datés est exactement la matière que (b) distribuera aux
   personnes. **(b) n'est plus une option : c'est L5, un vrai lot du
   chantier**, après la mesure de L4.
2. **Le crime parfait ?** — « Pas vu, pas su. » Le nom de l'auteur n'est
   JAMAIS prononcé sans témoin. Et même la disparition n'est sue que de qui
   attendait : « on ne s'attend pas forcément que quelqu'un ou une caravane
   arrive — ça dépend de l'importance et de si les personnes sont connues.
   Mais il peut probablement rester des traces. » Trois niveaux, tous
   portés : **l'attente** (la ville de destination attend SA caravane —
   connue, chargée), **la notoriété** (un errant anonyme disparaît sans que
   le monde s'en aperçoive), **la trace** (une épave, des corps — un fait
   trouvable par qui passe, qui dit où et quand, jamais qui).
3. **L'oubli ?** — « La rancune et la durée sont propres à chaque personnage
   et chaque situation. Certains peuvent oublier — ce n'est pas à moi de
   décider mais à la simulation. » Donc : AUCUNE constante universelle, et
   l'oubli EXISTE — c'est un acte du porteur. Le moment appartient à l'agent
   (ses conseils, ses successions, sa mort), la décision à son tempérament
   (un conciliateur laisse tomber les vieilles histoires, un rancunier les
   garde jusqu'à la tombe), le poids au fait lui-même (une insulte se lâche,
   un pillage non). Un même acte peut être oublié par Hexa en une saison et
   jamais par l'Ombrelle.
4. **Les seuils d'enrôlement ?** — « Mesure. » Rien ne bouge avant que le
   banc ait joué ses parties dans le monde sans érosion ; recalage par
   balayage si besoin, jamais à vue.
5. **L'écran ?** — « Montrer. » Chaque faction affiche ce qu'elle SAIT,
   le journal date chaque arrivée de nouvelle.

### Les options telles qu'elles avaient été posées (archive)

1. **Qui porte l'estime, dans ce chantier-ci ?** (a) Le scalaire par faction
   reste, mais ne bouge plus que par faits datés — ~200 sites de lecture
   intacts, et la forme du registre prépare la migration ; (b) migration
   directe chez les porteurs nommés (dirigeants, notables — et inverser
   notables.js:282-289). *(b) est la cible du T5 et le plus beau récit — un
   chef meurt, et avec lui ce qu'il vous pardonnait — mais c'est une refonte
   qui touche l'affichage et deux cents lectures ; (a) livre 90 % de la
   vérité tout de suite.* **Recommandé : (a) maintenant, (b) = L5 consigné.**
2. **Le crime parfait existe-t-il ?** Stricte : sans témoin, jamais su —
   « c'est à eux de voir » ; conséquence assumée : achever les témoins
   devient une décision qui paie. Intermédiaire (**recommandée**) :
   **l'absence est un fait** — le convoi manque à l'arrivée (rancune contre
   « des pillards », l'insécurité du secteur monte), mais l'AUTEUR n'est su
   que par témoin.
3. **Reste-t-il une érosion résiduelle ?** Zéro chronomètre (**recommandé** —
   l'oubli passe entièrement par les successions, les morts et le registre
   borné), ou une pente générationnelle minime en attendant la mesure. *À
   zéro, un joueur haï d'un chef qui vit vieux le reste des années — c'est la
   simulation pleine, et le contre-jeu existe : réparer, ou attendre la
   succession, qu'on peut lire venir (la légitimité s'affiche).*
4. **Les seuils d'enrôlement après L4** : regeler tels quels et mesurer
   d'abord (**recommandé**), ou les remonter dans le même chantier si le
   banc montre une ouverture devenue triviale. *Le seuil 10 n'existait que
   contre la pente — le garder sans mesure serait garder le pansement après
   la guérison.*
5. **Ce que l'écran montre** : l'écran d'une faction affiche ce qu'elle SAIT
   (**recommandé** — le journal date chaque arrivée : « À Fort-Vermeil, on
   sait désormais ce que vous avez vendu à Manase ») ; le joueur, lui, sait
   toujours ce qu'il a fait. *La fenêtre entre l'acte et la nouvelle devient
   jouable — trois jours pour commercer chez les abolitionnistes avant que
   ça se sache ; sans affichage daté, elle serait vécue comme un bug.*

## 5. Les cibles mesurables

1. **Un test né rouge par lot** : L1 — une chute à 2 cases se sait avant la
   même à 12 ; L2 — toute écriture de réputation hors `commettre` fait
   échouer le test d'exhaustivité ; L3 — caravane pillée sans survivant ni
   témoin : aucune faction ne nomme l'auteur, jamais ; avec un survivant :
   l'effet arrive à `t + délai(distance)`, pas avant ; l'esclave vendu se
   sait à 3 cases avant 14 ; L4 — à J60 sans rien faire, l'estime de départ
   n'a pas bougé (témoin d'aujourd'hui : −6) ; une succession chez un
   drapeau hostile réduit la rancune selon le tempérament du successeur.
2. **Le banc, profils par drapeau, contre témoin** : parties engagées,
   heures sous les couleurs, patrimoine — dans le bruit du témoin, sinon
   STOP et recalage par balayage (décision n°4). Plus un profil pillard : il
   doit pouvoir se racheter par actes en un temps comparable à l'oubli
   d'aujourd'hui, sinon la sortie d'hostilité est morte et c'est un blocage.
3. Gardes de CIBLES.json inchangées (tout vit côté joueur), zéro tirage
   nouveau dans les flux (les délais sont déterministes, les témoins
   dérivés), tick dans le budget (file d'échéances, aucun balayage par
   heure), vieille sauvegarde : rien de perdu (`normaliser` pose registre
   vide + `su = t` pour l'existant — le passé est réputé su, on ne réécrit
   pas l'histoire).

## 6. Ce que ça casse, dit d'avance

- **L'équilibre d'ouverture** — le seul vrai risque, d'où l'ordre L1→L4 :
  les trois premiers lots sont neutres ou quasi (des dates, pas des
  valeurs) ; toute la bascule est concentrée dans L4, remesurée avant d'être
  posée.
- **La sortie d'hostilité n'est plus gratuite** : plus d'absolution à
  0,45/j — un monde peut rester fermé à qui l'a saigné. Voulu, mais le
  contre-jeu (réparations, successions lisibles) est à vérifier en partie
  jouée, pas à supposer.
- **Les primes** suivent une rancune qui ne fond plus toute seule — la
  défaite solde la prime (P4) et les successions sont les soupapes ; à
  surveiller au banc.
- **La fenêtre acte→nouvelle** ouvre un jeu d'esquive (agir puis devancer la
  rumeur) : une richesse, si l'UI la montre (décision n°5).
- **Le témoin `sansErosion` du banc** change de sens : à re-consigner.
- **Ce qu'on ne fait pas** : pas de migration du scalaire (L5 consigné), pas
  de réseau d'espionnage ni de contre-rumeur (le fait voyage, il ne se
  falsifie pas — piste, pas chantier), pas de témoins pour les actes du
  monde entre factions (les conseils se jugent déjà sur événements), et pas
  une valeur d'effet modifiée — ce chantier change *qui sait, quand, et
  pourquoi on oublie*, jamais *combien ça coûte*.

## L'avancement

- [x] Cahier écrit avec le game master, constats revérifiés dans le code
- [x] Décisions 1-5 tranchées par le propriétaire (voir §4 — deux
  raffinements de sa main : la disparition n'est sue que de qui attendait,
  et l'oubli est un acte du porteur, pas une règle)
- [x] L1 — les jambes (E12) — livré : `delaiNouvelle(state, type,
  deRegionId)` = base du canal + pas × distance au plus proche des groupes
  du joueur. Deux canaux calibrables (proclamation 6+1/case — une
  déclaration veut être sue ; rumeur 12+4/case — le pas des colporteurs),
  la saison à zéro (on regarde le ciel soi-même), et le délai se recalcule
  d'où l'on est — marcher vers le lieu, c'est aller au-devant de la
  nouvelle. La table figée `DELAI_NOUVELLE` est morte. Sept tests nés
  rouges.
- [x] L2 — le registre des faits — livré : `src/faits.js`, trente-neuvième
  module, la SEULE porte vers `state.player.reputation` (tenu par un test
  statique, comme les interdits du vérificateur). Deux portes dans un seul
  module : `commettre` (les actes — datés, situés, effets par faction avec
  leur heure `su`, journal daté à l'arrivée — décision n°5) et
  `appliquerReputation` (l'écriture brute clampée, pour l'ambiant qui n'est
  pas un acte : la patrouille au fil des heures, et l'érosion tant qu'elle
  vit — elle meurt à L4). Le registre est borné (60), la file livre à
  l'heure dite (`tickFaits`). Les deux aides historiques (`reputation`,
  `noterReputation`) et neuf écritures directes passent par la porte —
  valeurs identiques, su = t : pur refactor, comme promis. Neuf tests nés
  rouges.
- [x] L3 — les cinq omniscients passent au registre — livré, décision n°2
  incluse. S'engager : le −20 part en rumeur vers chaque ennemi et tombe à
  l'arrivée. Esclave/organes : la ville de la vente est témoin, la rumeur
  part d'elle — ceux dont c'est la ville savent sur-le-champ, l'abolitionniste
  à trois cases avant celle à quatorze. Caravane : témoins = rescapés
  (`survivantsB`, enfin lu), ville sur la case, région tenue, colonne à une
  case — avec témoin le nom voyage ; sans, « pas vu, pas su » : le nom n'est
  JAMAIS prononcé, mais la ville qui attendait retient la disparition à
  l'heure où le convoi aurait dû arriver (sans juger personne — mémoire sans
  opinion) et la route se fait mal famée (danger +0,05). Indépendance : une
  proclamation — rapide, mais elle voyage. Les canaux ont déménagé dans
  faits.js (l'ordre des modules l'exige), `delaiVersFaction` fait le voyage
  inverse de L1, et chaque arrivée se dit au journal, datée (décision n°5).
  Onze tests nés rouges ; deux vieux tests d'instantanéité apprennent à
  attendre la rumeur.
- [x] L4 — l'oubli a des visages, et la remesure d'ouverture — livré,
  décision n°3 incluse. Le bloc d'érosion à `temps % 24` est mort
  (events.js) : plus aucun chronomètre ne pardonne ni ne ronge. L'oubli
  passe par ses trois visages : la succession (nouveau : `HERITAGE_COUR`
  dans influence.js — le successeur hérite d'une part de l'estime et de la
  rancune selon SON tempérament : un rancunier garde la rancune entière et
  la moitié de l'estime, un conciliateur passe l'éponge aux trois quarts —
  même patron que F1/F2 ; le guetteur de `tickCour` suit tous les trônes
  via `state.player.chefs`, semé en silence à la première vue, et chaque
  passation se dit au journal, datée — décision n°5), la mort du porteur
  (existant : registre borné à 60, notables mortels), la réparation
  (existant : contrats, services, rançons — désormais le chemin principal).
  Le levier `SANS=erosion` du banc est mort avec elle, consigné dans
  equilibre.js. Six tests nés rouges ; le vieux test « l'érosion ronge »
  (9 ter ter) devient « à J60, l'estime de départ n'a pas bougé », décor à
  règne épinglé (l'instrument annule les successions hors sujet — l'héritage
  est légitime, mais ce n'est pas lui qu'on mesure là).
  **La remesure d'ouverture (décision n°4)** — banc 30 parties × 4000 h,
  mêmes graines, seul L4 diffère du témoin (HEAD, L3) :
  - survie identique (28/30, les deux mêmes extinctions aux mêmes graines) ;
  - parties finissant engagées 4 → 3, heures sous les couleurs 589 → 418,
    crédits moyens 1258 → 1088 : même direction mais dans le bruit du
    témoin (les crédits vont de 1 à 9818 selon la graine) — **seuils
    d'`ESTIME_ENGAGEMENT` regelés tels quels**, comme décidé ;
  - la porte du bas s'ouvre plus souvent, mais ne retient pas mieux : 21
    épisodes d'engagement contre 11 (LIBRE, seuil 10 : 16 contre 3) — sans
    érosion l'estime gagnée ne fond plus en route, le bot signe ; il
    ressort comme avant (détachements, crédit d'ordres épuisé) ;
  - profil pillard : la rancune tient enfin — estime finale −4 → −13, pire
    chef fâché −92 → −120, survie 29/30 et butin intacts. La sortie
    d'hostilité par actes existe (services, contrats, rançons) mais le bot
    pillard ne se repent jamais : la mesure du temps de rachat demande un
    comportement de repentir au banc — consigné en dette, pas supposé.
  Une trouvaille d'ouverture consignée dans §Blocages : la voie du service
  était déjà quasi morte AVANT ce chantier (témoin a655ba7 : 3/30) — ce
  n'est pas la mémoire qui l'a tuée, et rien n'a été réglé à vue.
- [ ] L5 — la mémoire chez le souvenant (la cible, après mesure de L4)
  - [x] L5a — l'assiette : les douze actes de la porte brute (départ,
    désertion, vol de colis, contrat honoré, service rendu, batailles,
    péages, ordres, captifs) sont des faits `su = t`, valeurs identiques ;
    la patrouille et la rancune d'intendance sont des faits-fleuves (UN
    fait par (type, faction), delta accumulé borné par `FLEUVE.plafond`,
    date qui avance). Le délégué `reputation()` d'events.js est mort — il
    ne reste plus une seule écriture muette dans src/. Dix tests nés
    rouges.
  - [ ] L5b — le poids, le fait fondateur, l'agrégat matérialisé, les
    quatre événements de recomputation, la succession qui repèse
  - [ ] L5c — l'oubli au conseil du porteur (patience par tempérament)
  - [ ] L5d — notables : l'opinion suit l'agrégat + leurs souvenirs
  - [ ] L5e — remesure contre L4-témoin, docs, consignation

## Blocages

**La voie du service est quasi morte — et ce n'est pas la mémoire qui l'a
tuée.** Trouvaille de la remesure L4 (30 parties × 4000 h, bot par défaut) :
3 parties sur 30 finissent engagées, 418-608 h sous les couleurs, tous les
drapeaux « hors d'atteinte » (l'estime plafonne à 2-12 quand les seuils
demandent 10 à 40). Le calibrage documenté d'`ESTIME_ENGAGEMENT`
(allegeance.js) date d'un autre monde : « seuil 10 → 30 parties engagées,
3 894 h, 4 616 de patrimoine ». L'attribution est faite : le témoin
d'avant-L1 (a655ba7, érosion vivante, registre absent) rend déjà 3/30 —
l'écart est antérieur au chantier MEMOIRE et s'est creusé quelque part le
long des chantiers depuis (profils de seuils par style 10→40, économie,
MARECHAL…), sans qu'on remesure. Ni L1-L3 (4→3, dans le bruit) ni L4
(mêmes chiffres au bruit près, et la porte du bas s'ouvre PLUS souvent :
16 épisodes LIBRE contre 3) n'y sont pour rien. Deux lectures possibles :
le monde veut ça (s'engager se mérite, et le bot par défaut est un
aventurier, pas un candidat — le profil CARRIERE existe pour ça), ou
l'ouverture est cassée pour de vrai et il faut un balayage
d'`ESTIME_ENGAGEMENT` contre le monde d'aujourd'hui. Décision au
propriétaire ; rien n'a été réglé à vue (décision n°4).

**Dette de mesure — le temps de rachat du pillard** : la cible 2 demande
qu'un pillard puisse se racheter par actes « en un temps comparable à
l'oubli d'aujourd'hui ». Le bot pillard du banc ne se repent jamais — il
pille jusqu'à la dernière heure — donc le banc ne sait pas encore chiffrer
ce temps. Il faudra un comportement de repentir (piller 2000 h, puis servir)
avant de pouvoir dire si la sortie d'hostilité est vivante en pratique.
