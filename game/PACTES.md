# Chantier « Les pactes »

🟡 **Ouvert.** Demandé par le propriétaire, août 2026 : « on ne peut pas créer
d'alliance avec d'autres factions ? pour se protéger les uns les autres ou
autre ? » — puis, quand je lui ai proposé de choisir un type d'alliance :

> « Tu as pas compris, c'est une simulation, tous les types de pactes sont
> possibles et envisageables tant que les différentes parties sont d'accord et
> le respectent. »

C'est le cadrage, et il ferme d'avance la mauvaise solution. On n'écrit pas
« l'alliance défensive » comme un objet du jeu avec ses règles à elle. On écrit
**ce qu'un pacte est** : des clauses qu'une partie propose, que l'autre accepte
si elle y trouve son compte, et que chacune tient ou trahit — avec ce que ça
coûte de trahir.

---

## 1. L'état des lieux

| | |
|---|---|
| **Les relations** | Un nombre de −100 à +100 par paire, qui entre déjà dans la décision de faire la guerre (`conseil`, factions.js). Un pays qui vous estime ne vous attaque pas. Protection réelle, mais **passive** : elle se gagne en agissant, jamais en signant. |
| **Les accords** | Existent, mais ce sont des accords **commerciaux** : brancher deux bourses l'une sur l'autre (`signerAccordAvec`). Rien de militaire. |
| **La paix** | Se signe (`signerPaixAvec`), et les accords se rompent (`rompreAccordAvec`). |
| **Le mot « alliance »** | Figure dans le code — « +100 = alliance », world.js — et **rien ne s'ensuit**. Personne ne lève une colonne parce qu'un ami est assiégé. |

Le manque se voit depuis M3 : plantez vos couleurs, un voisin met le siège
devant votre camp dès la quarante-sixième heure, et vous n'avez personne à
appeler. Un pays d'une seule ville sans allié est condamné — c'est cohérent,
mais ça ne laisse qu'une seule stratégie au monde entier.

## 2. Ce qu'un pacte est ici

Un **pacte** lie deux drapeaux et porte une ou plusieurs **clauses**. Chaque
clause dit une chose qu'on s'engage à faire ou à ne pas faire. Rien n'oblige à
les prendre toutes ; rien n'interdit d'en prendre une seule.

Les clauses sont de la donnée, pas du code : en ajouter une nouvelle ne demande
que de dire ce qu'elle vaut à celui qui la reçoit et ce qu'elle exige de celui
qui la donne.

- **Non-agression** — on ne se déclare pas la guerre.
- **Secours** — un allié attaqué appelle ; on lève, ou l'on manque à sa parole.
- **Guerre commune** — les guerres de l'un sont celles de l'autre.
- **Passage** — on traverse les terres de l'autre sans se faire tirer dessus.
- **Vue** — on partage ce qu'on sait : colonnes repérées, villes, routes.

## 3. Les trois règles qui commandent tout

**Une partie accepte ce qui l'arrange.** Pas de tirage, pas de seuil arbitraire :
elle pèse ce que la clause lui donne, ce qu'elle lui coûte, contre qui elle la
protège, et qui la lui propose. Un faible accepte un secours qu'un fort refuse.
Le tempérament du chef pèse, comme partout ailleurs.

**Un pacte se tient ou se trahit, et c'est un acte.** Manquer à une clause n'est
pas une pénalité automatique : c'est une décision, prise par quelqu'un, qui
s'inscrit au registre des faits et que les autres apprennent quand la nouvelle
leur parvient. Un drapeau qui a lâché un allié une fois se le voit reprocher par
des tiers qui n'y étaient pas.

**La règle vaut pour tout le monde.** Les factions s'en servent entre elles,
sans le joueur et sans le savoir. Ce que le joueur peut faire, une faction le
peut ; ce qu'elle subit, il le subit.

## 4. Les lots

- **P1 — Les pactes existent.** La table, les clauses, proposer, peser,
  accepter ou refuser, rompre. Le joueur propose avec son drapeau (M3), une
  faction propose par son conseil.
- **P2 — Les clauses mordent.** ✅ **Livré pour les deux qui comptent.**

  **Non-agression** : on ne dégaine pas contre qui l'on a juré. Ce n'est pas
  une interdiction morale posée sur le joueur — la cible disparaît de la liste,
  et il suffit de reprendre sa parole pour qu'elle réapparaisse, au prix que
  reprendre sa parole coûte. La règle vaut pour les conseils du monde comme
  pour vous.

  **Secours** : quand un siège commence — celui d'une colonne du monde comme
  celui de votre escouade —, ceux qui ont promis leur secours à cette place
  l'apprennent et décident. Une distinction commande tout : **manquer par
  impuissance n'est pas manquer par choix**. Un allié dont la caisse est vide
  ne peut pas lever ; il n'a trahi personne, le pacte tient, et personne ne lui
  en veut. Celui qui pouvait et n'est pas venu a repris sa parole : le pacte
  tombe, et celui qu'on a laissé seul s'en souvient.

  Treize sondes. **Passage** et **vue** restent à câbler : elles touchent le
  déplacement et la connaissance, deux mécaniques à part.

  Une sonde est née verte et a dû être resserrée : elle comptait les colonnes
  de l'allié, or une faction en lève tout le temps pour ses propres raisons.
  Elle compte maintenant celles qui vont vers la place assiégée.
- **P3 — Le monde s'en sert.** 🛑 **Écrit, mesuré, retiré. Blocage — décision
  au propriétaire.** Les conseils proposaient et rompaient d'eux-mêmes, sans
  aucun tirage : qui est menacé demande le secours, qui est tranquille demande
  la paix, et l'on s'adresse d'abord à qui l'on estime le plus. Le mécanisme
  marche — quatre sondes vertes, cinq pactes signés en quatre mille heures,
  aucun contre nature, aucun parjure.

  **Mais il déstabilise le monde**, et le banc le dit sans appel (6 graines ×
  6 000 h, témoin `f820edb`) :

  | | témoin | P3 |
  |---|---:|---:|
  | villes debout | 370 | 335 |
  | guerres | 18 | 27 |
  | convois | 15 825 | 12 038 |
  | **masse monétaire** | **3,02 M** | **5,60 M** |
  | **fourchette des cours** | **0,07–3,44** | **0,04–312,53** |

  Et une sonde de sauvegarde casse avec lui (« coller un export comprimé
  recharge la partie entière »), ce qui n'a pas été instruit.

  **Deux trouvailles, dont une gardée.** La première mesure donnait un écart
  comptable de 42 828 là où il est toujours de zéro : `appelerSecours`
  retranchait le coût de la levée du trésor **sans le sortir de la masse** —
  de la monnaie détruite à chaque secours porté. Invisible tant que personne ne
  signait ; le jour où le monde s'est lié, l'invariant a crié. Corrigé par
  `depenser`, et **ce correctif reste** : il vaut pour les pactes du joueur.
  La masse à 5,6 M, elle, n'est pas expliquée — l'écart comptable est à zéro,
  donc rien ne se crée de rien : c'est un monde qui tourne autrement, pas un
  trou. Reste à savoir pourquoi.

  **La piste que j'avais désignée est fausse, et c'est instruit.**
  `DIPLOMATIE.entretien` — une parole tenue rapproche — était le suspect
  évident : il remonte les relations de tout le monde en permanence. Balayé à
  0 / 0,5 / 1,5 :

  | entretien | villes | masse | fourchette des cours |
  |---:|---:|---:|---|
  | témoin (pas de P3) | 370 | 3,02 M | 0,07–3,44 |
  | 0 | 338 | **25,84 M** | 0,01–9,16 |
  | 0,5 | 334 | 2,97 M | 0,10–114,92 |
  | 1,5 | 335 | 5,60 M | 0,04–312,53 |

  **Il est innocent** : à zéro, la masse explose davantage encore. Et les trois
  valeurs perdent les mêmes trente-cinq villes. Ce n'est donc pas l'entretien
  des relations, c'est la diplomatie elle-même.

  **La piste suivante, non instruite** : la clause `secours` coûte. Chaque
  levée sort 234 du trésor de celui qui tient parole (`SECOURS.force ×
  parHomme`), et rien ne vérifie qu'il en a les moyens **avant** de promettre —
  seulement au moment de venir. Des pays s'engagent donc au-delà de leurs
  moyens, se vident, et leurs conseils compensent en battant monnaie : c'est le
  chemin le plus court entre « le monde se lie » et « la masse monétaire
  quadruple ». Ce qui se vérifierait en balayant `SECOURS.force`, ou en faisant
  peser à `peserPacte` ce que la clause coûterait vraiment à celui qui la
  donne — un pauvre refuserait alors de promettre son sang, ce qui est
  exactement ce qu'on attend d'un pauvre.
