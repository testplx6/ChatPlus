# Technologie — l'arbre, le départ nu, le cahier des charges

Ouvert par le propriétaire, août 2026 : « go — et je pense qu'il faut
largement le compléter et en rajouter », puis, pendant l'écriture :
« je pense que presque tout devrait être absent au départ et venir d'un
apprentissage, même la carte ». Format METHODE §9. **Rien ne se code
avant que le propriétaire ait validé l'arbre et le départ nu ci-dessous**
— un nœud de recherche est une règle de jeu.

**Reporté par le propriétaire, août 2026** : « l'arbre des technos vient
plus tard, d'abord il faut tout le reste de la mécanique et des
bâtiments ». L'ordre est le bon : l'arbre organise du contenu — il vaut
ce que valent les mécaniques qu'il verrouille. Ce cahier des charges
reste la référence pour ce jour-là ; rien n'y est engagé, et chaque
mécanique nouvelle construite d'ici là devra dire dans son propre
cahier des charges où elle prendra place dans l'arbre.

## 1. Le constat, chiffré

Ce qui est donné d'office aujourd'hui, à la première heure de jeu :

- **14 recherches sur 18 sans aucun prérequis.** Quatre chaînages
  existent déjà (champ `exige`, un parent, niveau 1) : refonte exige
  metallurgie, reformage exige pyrolyse, insemination exige cultures,
  terraformation exige insemination. Tout le reste se coche dans
  n'importe quel ordre ; la « recherche » est une liste de courses.
- **13 bâtiments sur 19 constructibles d'emblée** — fonderie, atelier,
  raffinerie, hydroponie, infirmerie, halle, poste, antenne… tout le
  parc industriel est offert avec le premier sac de ferraille.
- **Les 18 recherches sont toutes affichées** dès l'ouverture de
  l'écran : le joueur lit la fin de la partie au premier jour.
- **Les 5 tactiques de combat sont toutes au répertoire** dès le
  premier accrochage.

Et pourtant le moteur sait déjà faire l'inverse — l'apprentissage est
sa pente naturelle :

- **La carte s'apprend** : les régions naissent non découvertes, se
  lèvent en marchant ou en envoyant des éclaireurs (`decouvert`,
  mission d'exploration, portée optique).
- **Le renseignement s'apprend** : là où on n'a personne, on lit un
  relevé daté (`connaissance.js`), les nouvelles voyagent avec un
  délai, une ville quittée il y a trois mois affiche le drapeau d'il y
  a trois mois.
- **Les compétences s'apprennent** : tirer forme le tir, marcher
  l'endurance, soigner la médecine.
- Trois recettes et six bâtiments passent déjà par une recherche.

Chaque recherche existante a un effet réel et mesuré quelque part :
metallurgie +12 %/niv d'alliage, hydroponie_av +15 %/niv de rations,
logistique −6 %/niv de voyage et +15 %/niv de charge, optique +1 case
de vue/niv, medecine ×1,25/niv, balistique/blindage +10 %/niv,
cybernetique ouvre les greffes, cryptographie les transmissions,
pyrolyse/refonte/reformage sont des recettes, cotation/cultures/
insemination/terraformation/renouvelable ouvrent des bâtiments.
**Le contenu existe ; la forme n'existe pas.**

## 2. La cause

Les recherches et les bâtiments sont nés un à un, chacun pour le
chantier du moment, jamais reliés. C'est l'histoire du dépôt, pas un
choix de conception — et ça se voit : la progression n'a ni forme, ni
identité, ni décision.

## 3. Le principe — rien n'est donné, tout s'apprend

Directive du propriétaire. Trois chemins d'apprentissage, tous trois
déjà amorcés dans le moteur, qu'on généralise :

1. **L'étude** — l'arbre de recherche (§4) : les bâtiments, les
   recettes, les fabrications.
2. **La pratique** — faire, c'est apprendre : marcher lève la carte
   (déjà le cas), se battre apprend les tactiques (§5), tirer forme le
   tir (déjà le cas), commercer remplit le carnet du négociant (nœud
   `carnet`).
3. **Le monde** — ce qui ne s'invente pas s'achète ou se prend : les
   greffes chez l'armurier de ville, les transmissions ennemies, la
   carte d'un pays chez son contremaître (§5).

Chaque nœud débloque quelque chose de **concret, branché sur un
mécanisme existant** — jamais un « +2 % abstrait ». Tout est côté
base/joueur : le monde partagé n'y touche pas (règle multijoueur
préservée).

## 4. L'arbre — quatre branches, 33 nœuds

Les 18 recherches actuelles gardent leurs effets et prennent place ;
15 nouvelles s'y ajoutent (dont *instruction*, née du raccord
BATIMENTS.md — la branche III n'avait rien pour la formation).
Notation : *(N)* = nouveau, *(=)* = chaînage
déjà en place. « préreq » se lit : recherche niveau.

### Branche I — La matière

| nœud | préreq | niv | ce que ça donne |
|---|---|---|---|
| metallurgie | — | 5 | +12 %/niv d'alliage ; **débloque fonderie et atelier** |
| refonte | metallurgie 1 *(=)* | 5 | recette recyclage — existant |
| pyrolyse | metallurgie 1 | 5 | recette déchets→carburant ; **débloque raffinerie** |
| reformage | pyrolyse 1 *(=)* | 5 | recette avancée — existant |
| ingenierie | metallurgie 2 | 5 | vitesse de recherche ; **débloque antenne** |
| *(N)* recuperation | refonte 2 | 3 | le butin rend +15 %/niv de ferraille et composants (dépouilles) |
| *(N)* automatisation | ingenierie 2 | 3 | chaque niveau libère un poste par chaîne — les mêmes bras produisent plus |
| *(N)* usinage | ingenierie 3, refonte 2 | 2 | la forge (BATIMENTS.md) fabrique les armures et outillages du palier 3 (exo, masse) — aujourd'hui introuvables hors des meilleurs étals |

### Branche II — La terre

| nœud | préreq | niv | ce que ça donne |
|---|---|---|---|
| cultures | — | 5 | bassins de culture ; **débloque hydroponie et halle** |
| hydroponie_av | cultures 1 | 5 | +15 %/niv de rations — existant |
| insemination | cultures 2 *(=)* | 5 | ensemenceuse — existant |
| terraformation | insemination 2 *(=)* | 5 | station de terraformation — existant |
| renouvelable | — | 5 | solaire/éoliennes, +12 %/niv — existant |
| *(N)* conserves | cultures 2 | 3 | la cantine cale mieux : la faim monte −10 %/niv au camp |
| *(N)* serres | hydroponie_av 2 | 2 | double l'amorti du bâtiment serres (BATIMENTS.md) |
| *(N)* distillerie | cultures 3, pyrolyse 1 | 2 | déverrouille le bâtiment distillerie (BATIMENTS.md) — la terre paie la route |

### Branche III — Le sang

| nœud | préreq | niv | ce que ça donne |
|---|---|---|---|
| balistique | — | 5 | +10 %/niv de dégâts — existant |
| blindage | — | 5 | +10 %/niv d'armure — existant |
| medecine | — | 4 | soins ×1,25/niv ; **débloque infirmerie** |
| cybernetique | medecine 2 | 3 | greffes — existant, ENFIN verrouillé par la médecine |
| optique | — | 3 | +1 case de vue/niv ; **débloque poste de garde** |
| cryptographie | optique 1 | 2 | transmissions ennemies — existant |
| *(N)* armurerie | balistique 2 | 2 | la forge (BATIMENTS.md) fabrique les armes du palier 3 (rail) |
| *(N)* instruction | balistique 1, medecine 1 | 1 | le maître de maison de la salle d'exercice (BATIMENTS.md) vaut 70 |
| *(N)* siege | blindage 2 | 3 | les murs du camp valent +20 %/niv et se réparent plus vite |
| *(N)* telemetrie | optique 2, balistique 1 | 2 | l'aperçu tactique s'affine (fourchette annoncée resserrée), premier tour de tir avantagé |
| *(N)* chirurgie | medecine 3, cybernetique 1 | 2 | l'infirmerie pose les greffes (plus besoin d'un armurier de ville), et **un membre perdu se remplace par une prothèse** — le nœud-drapeau de la branche |

### Branche IV — La route

| nœud | préreq | niv | ce que ça donne |
|---|---|---|---|
| logistique | — | 5 | voyage −6 %/niv, charge +15 %/niv — existant |
| cotation | logistique 1 | 5 | comptoir — existant |
| *(N)* caravanerie | logistique 2 | 3 | l'attelage porte +20 %/niv et ralentit moins |
| *(N)* carnet | cotation 1 | 1 | **le carnet du négociant** : l'écran des prix relevés ville par ville, datés, avec l'écart le plus juteux connu — l'arbitrage devient un métier |
| *(N)* courtage | cotation 3 | 2 | la marge du comptoir fond de 20 %/niv |
| *(N)* ecoutes | cryptographie 1 | 2 | les nouvelles lointaines voyagent 25 %/niv plus vite (connaissance) |

## 5. Le départ nu

Ce que la directive change au premier jour d'une partie neuve.

**Le noyau — cinq bâtiments constructibles sans recherche** : le strict
nécessaire pour survivre une saison. Générateur (le courant), entrepôt
(le stock), cantine (manger), mur de rebut (tenir), baraquement
(dormir, recruter). **Tout le reste passe par l'arbre** — les huit
bâtiments aujourd'hui libres reçoivent un verrou (en gras dans les
tables du §4) : fonderie et atelier derrière metallurgie 1, raffinerie
derrière pyrolyse 1, hydroponie et halle derrière cultures 1,
infirmerie derrière medecine 1, poste de garde derrière optique 1,
antenne derrière ingenierie 1. Conséquence assumée : **au début on
achète ses rations en ville au lieu de les produire** — la terre se
mérite, c'est le jeu.

**L'écran de recherche ne montre que la frontière** : l'acquis, et les
nœuds dont les prérequis sont au moins entamés. Le reste apparaît en
silhouette — la branche, un « ??? », rien d'autre. On ne lit plus la
fin de la partie au premier jour.

**Les tactiques s'apprennent au contact** : `ligne` seule au répertoire
au départ. Chaque autre tactique entre au répertoire **la première fois
qu'un adversaire vous l'inflige** — le combat la connaît déjà
(`ctx.tactique`), zéro tirage nouveau, déterministe, et ça fait un
récit : on apprend l'enveloppement en se faisant envelopper.

**La carte est déjà nue** — c'est le morceau que le moteur fait le
mieux : régions non découvertes, relevés datés, nouvelles à délai. On
n'y recode rien. On y **ajoute le chemin « le monde »** : chez le
contremaître d'une ville, acheter la carte de son pays (les régions
contrôlées par sa faction passent à découvertes, prix selon leur
nombre). Un raccourci qui coûte des crédits — l'exploration reste
gratuite pour qui a des jambes.

## 6. Ce que ça casse, dit d'avance

- **Les vieilles sauvegardes** : droit du grand-père intégral, via
  `normaliser`. Une recherche acquise RESTE acquise ; un bâtiment déjà
  construit reste debout, produit et s'améliore encore, prérequis
  tenus ou non. Le départ nu ne vaut que pour les parties neuves. On
  ne reprend rien à personne.
- **L'ouverture de partie change vraiment** : plus de fonderie au jour
  1, des rations achetées en ville. C'est voulu — mais ça se mesure
  (une partie neuve témoin doit rester jouable : nourrir quatre
  bouches en vendant de la ferraille se fait aujourd'hui, on le
  vérifie après).
- **L'équilibre des coûts** : 14 nœuds de plus, ça se balaye au banc
  (`--balaye`) — les coûts suivront la gamme existante
  (coutMul ≈ 1,5–1,7), calibrés, pas devinés.
- Le monde partagé ne bouge pas d'un dé : tout vit dans `state.base`
  et les mécaniques du joueur. Les gardes du banc doivent sortir
  identiques.

## 7. Les cibles mesurables

1. Une recherche aux prérequis non tenus **refuse de se lancer**, et
   l'écran dit pourquoi (test headless + navigateur).
2. Un bâtiment hors noyau **refuse de se construire** sans sa
   recherche, motif affiché ; le noyau se construit sans rien.
3. L'écran de recherche montre **l'arbre par branches** — acquis,
   ouvert, verrouillé (et par quoi), silhouettes au-delà de la
   frontière — au lieu d'une liste.
4. **Chaque nouveau nœud a un test né rouge** qui mesure son effet
   (l'atelier fabrique un rail après usinage 2, la faim monte moins
   vite après conserves 1, un membre perdu se remplace après
   chirurgie 2…).
5. **Une tactique subie une fois est au répertoire** ; avant, elle n'y
   est pas (test né rouge).
6. Vieille sauvegarde chargée : rien de perdu, rien de bloqué, rien de
   détruit.
7. Les gardes du monde inchangées (le banc le vérifie à chaque
   `--complet`).

## 8. Ce qu'on ne fait pas

Pas de ressource nouvelle. Pas de « points de science ». Pas d'effet
côté monde partagé. Pas de constante posée sans balayage. Pas
d'exclusifs entre branches (« serments » — spécialisation définitive
par partie) **sans décision du propriétaire** : consigné comme option,
ça donnerait aux parties une identité forte mais ça retire du jeu —
c'est un choix de design, pas un détail.

## Les décisions du propriétaire

1. **Valider ou amender l'arbre** (§4 — nœuds, prérequis, effets).
2. **Valider le départ nu** (§5 — le noyau de cinq bâtiments, les
   tactiques au contact, la carte achetable en ville). C'est lui qui
   change le plus la première heure de jeu.
3. **Les serments** : arbre entièrement libre (recommandé pour
   commencer), ou spécialisation exclusive par partie ?
4. **La chirurgie** (membre perdu → prothèse) : le nœud le plus lourd
   en règles — le garder, le simplifier, ou le remettre à plus tard ?

## Blocages

Rien pour l'instant.
