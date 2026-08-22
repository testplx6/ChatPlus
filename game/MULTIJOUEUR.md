# Multijoueur — l'étude

Demandée par le propriétaire, août 2026 : « explore des pistes pour le jeu
multijoueur ». C'est une **étude au format de METHODE.md §9** — constat,
causes, propositions, ce que ça casse, cibles, ce qu'on ne fait pas. Rien
n'est engagé : chaque architecture se termine sur les décisions qui
appartiennent au propriétaire. La graine de cette étude est dans
`PISTES.md` (« multi-monde, ou un monde par joueur »), dictée par lui.

## 1. Le constat — ce que le moteur garantit déjà, et ce qu'il ne garantit pas

Le moteur a été construit avec cette porte ouverte, et ça se mesure :

- **Déterminisme scellé.** Même graine → même monde ; le hasard vit dans un
  `Rng` sauvegardé ; jamais `Date.now()` ni `Math.random()` dans la
  simulation (vérifié par les interdits statiques du vérificateur).
- **Monde et joueur séparés.** `state.world` partagé, `state.player` privé,
  tenu par test. Tout le chantier HISTOIRE a été écrit sous cette règle :
  chapitres, fils, mémoire des rencontres — rien côté monde.
- **Un flux de hasard par entité** (villes, armées, convois) et `grainDe`
  pour tout ce qui se dérive : déranger une ville ne décale pas les dés des
  autres, et le trajet d'un joueur ne décale les dés de personne.
- **L'invariant comptable exact.** Toute création ou destruction de monnaie
  se voit au crédit près — c'est le détecteur de fraude d'un échange.
- **L'invariance à la maille**, livrée et mesurée : le monde ne dépend pas
  de l'endroit où l'on se tient — **statistiquement** (cinq grandeurs sous
  le plancher de bruit des placebos).

Et les trois limites, dites sans fard :

- **L'invariance à la maille n'est pas au bit près.** La maille suit la
  position du joueur : deux clients aux joueurs placés ailleurs calculent
  deux mondes qui se ressemblent sous le bruit, mais divergent bit à bit —
  et deux mondes déterministes qui divergent d'un bit divergent pour de bon
  au premier événement à seuil (mesuré au chantier M6 : 10⁻⁵ de
  réarrangement flottant suffit).
- **`Math.pow` n'est pas spécifié au bit près entre moteurs JS.** Chrome
  contre Firefox peut diverger. Toute architecture qui exige que deux
  navigateurs calculent le même monde est morte d'avance.
- **L'artefact claude.ai ne fera jamais le réseau.** Sa politique de
  sécurité bloque toute requête externe ET WebRTC (constaté dans la page
  servie). Le multijoueur vivra sur un hébergement propre — le jeu est un
  fichier unique, n'importe quel hébergeur statique le sert ; c'est le
  relais qui demande un composant de plus.

## 2. Les trois architectures

### A. Un monde partagé, hôte autoritaire

Une seule simulation tourne quelque part — un serveur, ou le navigateur
d'un joueur-hôte. Les autres envoient leurs ordres, reçoivent l'état.
PAS de simulation en parallèle chez chacun (le « lockstep » exigerait le
bit-exact entre navigateurs — mort, voir §1) : **l'hôte est la seule
vérité**, les clients sont des écrans.

- **Ce qui s'y prête déjà** : la séparation monde/joueur est exactement le
  découpage réseau (le monde descend, les `state.player` restent chez
  chacun) ; « un monde qui tourne sans vous » est LA promesse d'un serveur
  persistant — le monde continuerait même quand tout le monde dort.
- **Ce que ça coûte** : un vrai composant serveur (comptes, socket,
  persistance, coûts d'hébergement), un protocole d'ordres, la découpe de
  l'état en deltas (la sauvegarde fait ~1 Mo — on ne la renvoie pas à
  chaque heure de jeu). Le plus gros chantier du projet, sans commune
  mesure avec les autres.
- **Ce que ça casse** : le hors-ligne. Aujourd'hui chacun rattrape SON
  monde à son retour ; dans un monde partagé, le rattrapage appartient à
  l'hôte, et l'avance rapide ×60 d'un joueur devient une négociation
  (quelle vitesse fait foi quand deux joueurs veulent des vitesses
  différentes ? C'est LA décision de conception de cette voie).
- **Triche** : réglée par construction (l'hôte fait foi).

### B. Un monde par joueur, échanges restreints — la voie du « pli »

Chacun joue exactement le jeu d'aujourd'hui, chez lui, à sa vitesse. Les
mondes sont des réalités séparées reliées par des **plis** : des messages
signés, datés en temps réel, transportant ce que deux mondes s'échangent —
des nouvelles, des cours, une caravane. Chaque monde reste seul maître de
sa simulation ; le pli est un ÉVÉNEMENT qu'il applique, pas un état qu'il
doit reproduire.

- **Pourquoi c'est la voie naturelle d'ICI** : le moteur parle déjà cette
  langue à l'intérieur d'un monde. Les réseaux de bourses republient un
  cours commun chaque jour ; les caravanes transportent de la valeur d'un
  point à un autre ; la connaissance fait voyager les nouvelles avec le
  retard de la route (« un carnet, pas un satellite »). Un monde voisin,
  c'est un nœud de plus, à la maille la plus grossière — exactement ce que
  la note de PISTES.md pressentait.
- **Le bit-exact n'est plus requis** : aucun monde ne recalcule celui du
  voisin. Chrome et Firefox peuvent jouer ensemble.
- **L'invariant comptable s'étend** : une caravane partie de chez A est un
  débit signé chez A et une créance en transit ; B la crédite à l'arrivée.
  Un registre des soldes entre mondes dit à tout instant si un pli a créé
  de la monnaie. La fraude entre inconnus reste possible (chacun peut
  éditer sa sauvegarde) — entre gens qui se connaissent, le registre
  suffit ; au-delà, c'est un problème de confiance, pas de code, et on le
  dit plutôt que de le résoudre à moitié.
- **Le problème dur : les horloges.** Deux mondes n'avancent pas au même
  rythme (l'un joue ×60, l'autre dort trois jours). Les plis se datent donc
  en **temps réel** : une caravane inter-mondes voyage en heures réelles,
  et chaque monde la vit à sa propre heure de jeu au moment où elle
  arrive. Deux réalités reliées par le commerce n'ont pas besoin d'une
  horloge commune — c'est ce qui rend cette voie possible sans serveur.
- **Le transport peut être bête** : v1, le pli est un fichier qu'on
  s'envoie (export/import — testable en headless sans le moindre réseau,
  dans la culture de test du dépôt) ; v2, un relais minuscule qui ne fait
  que porter des messages (aucune simulation côté serveur, quelques Ko par
  jour et par paire de mondes).

### C. Le monde en relais (écarté, et pourquoi)

Un seul monde partagé SANS hôte permanent : la sauvegarde circule, chacun
la fait avancer à son tour. Écarté : le déterminisme rend la fusion de deux
avancées parallèles impossible par construction (c'est sa force), donc tout
se joue à tour de rôle strict — un jeu de courrier, pas un multijoueur.
Consigné pour ne pas y revenir.

## 3. Le tableau des enjeux

| | A — monde partagé | B — mondes reliés |
|---|---|---|
| infrastructure | serveur permanent, comptes | rien (v1) puis relais minuscule |
| bit-exact requis | non (hôte seul) | non |
| hors-ligne | à redéfinir (l'hôte tourne) | inchangé — chacun son monde |
| vitesse de jeu | à négocier entre joueurs | libre chacun |
| triche | réglée par l'hôte | confiance entre mondes, registre |
| ce qu'on partage | tout — un seul monde | ce qu'on décide — nouvelles, cours, caravanes |
| taille du chantier | le plus gros du projet | trois crans, le premier est petit |
| sensation | MMO persistant | commerce et nouvelles entre les mondes d'amis |

## 4. La proposition — la voie B, en trois crans mesurables

- **P1. Le pli, à la main.** Format du pli (JSON versionné, idempotent,
  daté en temps réel, signé par l'identité du monde émetteur), export et
  import à l'écran Monde. Contenu du premier pli : **des nouvelles et des
  cours** — le monde de l'autre entre dans votre écran Monde et votre
  journal comme une contrée lointaine (le chantier HISTOIRE lot D fait
  qu'elles arrivent déjà racontées). Cible : deux parties headless
  échangent des plis, rejouer un pli est sans effet (idempotence), rien ne
  bouge dans les dés du monde receveur.
- **P2. La caravane inter-mondes.** De la marchandise et de la monnaie
  voyagent par pli, en heures réelles ; registre des soldes entre mondes ;
  l'invariant comptable étendu vérifié par test des deux côtés. Cible :
  l'aller-retour conserve la valeur au crédit près, un pli forgé à la main
  se voit au registre.
- **P3. Le relais.** Le même pli, porté par un petit service au lieu d'un
  fichier — rien d'autre ne change. (Hébergement à choisir ce jour-là ;
  hors artefact claude.ai, voir §1.)

La voie A reste ouverte APRÈS : un serveur persistant pourra toujours
naître en faisant tourner le jeu d'aujourd'hui sur une machine qui ne dort
pas — la séparation monde/joueur le permet. B ne ferme pas A ; B livre du
multijoueur jouable avant l'été prochain, A est une autre échelle.

## 5. Ce que ça casse, dit d'avance

- P1 ne casse rien : le pli est en lecture seule sur le monde receveur
  (des nouvelles s'affichent, aucun état de simulation ne bouge).
- P2 touche à la monnaie : l'arrivée d'une caravane crédite un monde. Tout
  passe par les fonctions existantes (`gagner`, caisse, stocks) et le
  registre inter-mondes — jamais un crédit sans écriture en face.
- Aucun tirage nouveau dans le flux : tout ce qu'un pli déclenche se dérive
  de `grainDe(pli.id, …)`.

## 6. Ce qu'on ne fait pas

Pas de lockstep entre navigateurs (mort par `Math.pow`). Pas de PvP
temps réel. Pas de serveur qui simule (le relais PORTE, il ne calcule
pas). Pas de protection contre un joueur qui triche dans SON monde — c'est
son monde. Pas de réseau dans l'artefact claude.ai.

## 7. Les modes de jeu — ce qu'on y vit, et ce que chacun apporte

Demandé par le propriétaire après la première version de l'étude :
« explore davantage les différents types de modes multi et les avantages
de chacun ». Les architectures (§2) sont la tuyauterie ; voici les JEUX
qu'elle permet, du moins cher au plus cher. Ils se cumulent — ce n'est pas
un choix exclusif, c'est un ordre d'apparition possible.

### M1. La course — même graine, mondes parallèles

Deux joueurs entrent la même graine : le déterminisme leur donne
**exactement le même monde**, et chacun y joue sa partie, chez lui, sans
échanger un octet. On compare ensuite — la chronique, les chapitres, la
richesse au jour 30, qui a survécu.

- **Ce qu'on y vit** : la course, le récit comparé — « au jour 12 j'avais
  perdu Renn, et toi ? ». La graine hebdomadaire, le défi entre amis.
- **Avantages** : ne coûte PRESQUE RIEN (le jeu le permet déjà — il manque
  seulement un export lisible de la chronique et un écran de comparaison) ;
  aucune architecture, aucun réseau, aucune triche possible sur le monde
  (même graine = mêmes cartes pour tous) ; le chantier HISTOIRE vient de
  rendre les chroniques comparables et racontables.
- **Limites** : on ne se rencontre pas ; c'est du multijoueur de
  comparaison, pas d'interaction.
- **Exige** : rien (architecture) ; un lot d'interface (export/comparaison).

### M2. Le feuilleton — suivre les mondes des autres

Par pli (voie B, P1) : les nouvelles et les cours du monde d'un ami
arrivent dans votre écran Monde et votre journal, avec le retard du
transport, racontées comme le lot D sait le faire.

- **Ce qu'on y vit** : « chez Théo, la Milice a pris la capitale et leur
  monnaie s'effondre » — le monde de l'autre devient une contrée lointaine
  du vôtre. On se raconte nos mondes sans se les montrer.
- **Avantages** : le plus petit pli possible (lecture seule, rien ne bouge
  dans la simulation receveuse — « ce que ça casse » : rien) ; il installe
  toute l'infrastructure du pli (identité, signature, idempotence) sur
  laquelle M3 et M5 s'appuient ; asynchrone total.
- **Limites** : contemplatif — on regarde, on n'agit pas encore.
- **Exige** : voie B, cran P1.

### M3. Le commerce — des économies qui se parlent

Par pli (voie B, P2) : caravanes inter-mondes, marchandises et monnaie,
registre comptable entre mondes. C'est le mode OGame de la promesse
d'origine.

- **Ce qu'on y vit** : l'arbitrage entre DES ÉCONOMIES RÉELLEMENT
  DIVERGENTES — chez vous l'isotope vaut 22, chez elle 60 parce que sa
  guerre a coupé les canyons ; sa monnaie s'est effondrée, la vôtre est
  forte : qui fixe le prix ? Le moteur cote déjà tout — les prix libres
  (lot I bis) prennent ici leur sens multijoueur : deux mondes n'ont
  JAMAIS les mêmes prix.
- **Avantages** : c'est le cœur du jeu (l'économie) qui devient le terrain
  social ; asynchrone ; l'invariant comptable étendu rend la valeur
  traçable ; la fraude se voit au registre.
- **Limites** : la confiance entre inconnus reste un problème déclaré non
  résolu (§6) ; l'équilibrage inter-mondes est un vrai sujet (un monde
  riche peut inonder un monde pauvre — et c'est peut-être une histoire
  qu'on VEUT possible, dans la ligne « tout doit être possible »).
- **Exige** : voie B, cran P2.

### M4. Le compagnonnage — des gens qui voyagent

Par pli : un membre de VOTRE escouade part vivre une saison dans le monde
d'un ami — il arrive là-bas comme recrue, avec son nom, ses compétences,
ses traits, son fil personnel (chantier HISTOIRE lot C). Au retour, il
rapporte ce qu'il a vécu.

- **Ce qu'on y vit** : « je t'envoie Oria, prends-en soin » — et la stèle
  si elle meurt là-bas. L'attachement aux individus, déjà construit par
  INDIVIDUS et HISTOIRE, devient une monnaie d'échange émotionnelle.
- **Avantages** : unique — aucun jeu ne fait vraiment ça ; techniquement
  simple (un personnage est un petit objet JSON autoportant, `grainDe`
  garantit qu'il ne décale aucun dé chez l'hôte) ; asynchrone.
- **Limites** : règles à trancher (peut-il mourir là-bas ? revenir
  changé ? qui arbitre un litige ?) — chaque question est une décision de
  cahier des charges.
- **Exige** : voie B, P1 suffit techniquement (un personnage est un
  contenu de pli comme un autre) ; recommandé après M3.

### M5. La guerre par procuration — le conflit sans horloge commune

Par pli : on finance et on envoie une colonne de mercenaires vers le monde
d'un autre. Elle arrive comme ÉVÉNEMENT chez lui — une colonne hostile de
plus, résolue par SA simulation, chez lui, à son heure. Le résultat
revient par pli (butin, prisonniers, nouvelles).

- **Ce qu'on y vit** : le PvP d'OGame — on attaque pendant que l'autre
  dort — mais résolu par un moteur de simulation honnête, pas par une
  formule : sa garnison, ses murs, sa famine comptent.
- **Avantages** : du conflit réel ENTIÈREMENT asynchrone — aucun besoin
  d'horloge commune ni de bit-exact, puisque le défenseur est seul maître
  de la résolution ; s'appuie sur des mécanismes finis (colonnes, sièges,
  batailles, butin).
- **Limites** : le défenseur simule l'attaque — un tricheur chez lui gagne
  toujours (même clause de confiance que M3, dite d'avance) ; l'équilibrage
  attaque/défense entre mondes d'âges différents est un chantier en soi.
- **Exige** : voie B, cran P2 + un cahier des charges de combat
  inter-mondes validé par le propriétaire.

### M6. Le spectateur — regarder une partie

Le déterminisme offre le replay gratuit : une graine + la suite des ordres
du joueur rejouent la partie à l'identique. Partager sa partie, c'est
partager un petit fichier ; l'autre la REGARDE se rejouer.

- **Ce qu'on y vit** : « regarde comment j'ai survécu au chapitre III » ;
  l'apprentissage, le spectacle, la preuve (pour les courses de M1 : le
  replay EST le certificat anti-triche).
- **Avantages** : quasi gratuit techniquement (le moteur le fait déjà, il
  manque l'enregistrement des ordres du joueur et un mode lecture) ;
  complète M1 en le rendant vérifiable.
- **Limites** : même moteur JS requis pour un replay exact (voir §1) — le
  certificat vaut entre navigateurs identiques, ou en tolérant l'écart.
- **Exige** : rien (architecture) ; un lot moteur (journal des ordres).

### M7. Le monde partagé — vivre au même endroit

La voie A (§2) : plusieurs escouades dans UN monde, alliances et
trahisons directes, la ville que VOUS tenez et que lui convoite.

- **Ce qu'on y vit** : le MMO de simulation — la promesse maximale.
- **Avantages** : l'interaction totale ; « le monde tourne sans vous »
  devient littéral (le serveur ne dort jamais).
- **Limites** : tout ce que §2-A dit — infrastructure, hors-ligne à
  redéfinir, vitesse de jeu négociée, le plus gros chantier du projet.
- **Exige** : voie A entière.

### Ce que ça dessine

| mode | interaction | coût | architecture |
|---|---|---|---|
| M1 course | comparer | ~nul | aucune |
| M2 feuilleton | se raconter | petit | B / P1 |
| M3 commerce | échanger | moyen | B / P2 |
| M4 compagnonnage | confier | moyen | B / P1-P2 |
| M5 guerre par pli | s'affronter | moyen+ | B / P2 + cahier |
| M6 spectateur | montrer | petit | journal d'ordres |
| M7 monde partagé | vivre ensemble | maximal | A |

L'escalier naturel : **M1 (course) tout de suite** — il ne demande que de
rendre les chroniques comparables —, puis **M2 → M3** qui posent le pli et
le commerce, **M4/M5** qui donnent l'émotion et le conflit, **M6** en
compagnon de M1, et **M7** le jour où le jeu mérite un serveur.

## Les décisions du propriétaire avant d'ouvrir le chantier

1. **La voie** : B en trois crans (recommandée), ou A directement, ou rien.
2. **Le premier contenu d'échange** (si B) : nouvelles + cours (proposé),
   ou directement le commerce.
3. **La confiance** : le registre suffit-il (jeu entre gens qui se
   connaissent), ou faut-il viser plus dur un jour ?

Rien ne se code avant ces réponses.
