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

  **La deuxième piste est fausse aussi, et la troisième n'existait pas : la
  mesure mentait.** J'avais écrit que la clause `secours` se promettait sans
  qu'on vérifie les moyens de la tenir, que les pays se vidaient, et que leurs
  conseils compensaient **en battant monnaie**. Le dernier maillon était
  vérifiable en une ligne, et je ne l'ai pas vérifié : `emettre` — la seule
  fonction du jeu qui crée une unité — **n'a qu'un seul appelant, et c'est le
  joueur** (`influence.js`, `battreMonnaie`). Aucun conseil du monde ne bat
  monnaie. Personne ne compensait quoi que ce soit.

  P3 a donc été remis pour la mesure (réécrit — le code d'origine n'existait
  plus), et les deux leviers isolés :

  | config | villes | masse | **en crédit** | cours |
  |---|---:|---:|---:|---|
  | témoin (pas de P3) | 370 | 3,02 M | **2,79 M** | 0,07–3,44 |
  | P3 | 335 | 4,36 M | **3,48 M** | 0,05–186,39 |
  | P3 sans la clause de secours | 343 | **13,16 M** | **2,85 M** | 0,01–32,16 |
  | P3 sans entretien des relations | 330 | 3,80 M | **2,62 M** | 0,08–47,88 |

  La colonne « en crédit » est neuve, et c'est elle la trouvaille. La colonne
  « masse » additionne les unités nominales de trente-six pays dont les cours
  vont de 0,01 à 186 : **ce n'est pas une grandeur homogène**. Un pays dont la
  monnaie s'effondre à 0,01 porte cent fois plus d'unités pour la même valeur,
  et le change (`convertirMasse`) fabrique légitimement ces unités-là — sortir
  cent d'un pays fort en fait des milliers dans un pays faible, et l'invariant
  comptable reste exact, parce que rien n'a été créé.

  Ramenée en ancien crédit — le pivot du bureau de change —, la masse du cas le
  plus alarmant (13,16 M, « quatre fois le témoin ») **vaut 2,85 M : le niveau
  du témoin**. Il n'y a jamais eu de pompe à monnaie. Deux jours de chasse
  contre un artefact d'agrégation, et deux hypothèses innocentées à ses
  dépens.

  **Ce qui reste de P3, une fois la fausse alarme retirée** — et c'est petit :

  - la valeur du monde monte de 25 % (2,79 → 3,48 M) pour 8 % d'habitants en
    moins : les pays sont plus riches et moins nombreux à nourrir ;
  - **35 villes de moins** (370 → 335) et cinq guerres de plus (18 → 23) ;
  - **un cours à 186** là où le témoin plafonne à 3,44.

  Le cours à 186 est le seul défaut franc, et il est maintenant isolable : ce
  n'est pas une masse qui gonfle, c'est **un pays dont le gage explose par
  rapport à ce qu'il a émis** — `majCours` rapporte la production au stock
  d'unités, et un pays qui grandit sans émettre voit son cours partir vers le
  haut sans borne. À instruire là, dans `monnaie.js`, et non dans les pactes.

  **La métrique reste**, elle : `tools/banc.js` porte désormais la colonne
  « en crédit » à côté de « masse », et toute mesure future s'y lira.

  **P3 est livré (septembre 2026).** Les conseils se lient d'eux-mêmes : qui se
  sait menacé cherche du secours, qui est tranquille cherche la paix, et l'on
  s'adresse d'abord à celui qu'on estime le plus. Aucun tirage propre — l'envie
  passe par le dé du conseil, et un seul, la menace n'étant calculée que
  lorsqu'elle peut changer la réponse.

  Mesuré, le monde y **gagne** : 371 villes debout contre 361, moins de guerres
  (21 contre 24), la carte politique plus vivante encore (31 pays nés contre
  11), invariant comptable à zéro exact. Ce qu'il coûte : 14 % de tick, parce
  que le monde qu'il produit est plus grand — neuf drapeaux par partie au lieu
  de sept, dix villes de plus. Le plafond de rattrapage a été rouvert pour ça
  par le propriétaire (« on va augmenter la tolérance pour le moment et passer
  à la suite »), la décision et son motif sont dans `CIBLES.json`.

  **Les cinq clauses mordent (septembre 2026).** `passage` et `vue` se signaient
  depuis deux semaines sans rien engager — une promesse qui n'engage à rien est
  pire que pas de promesse : elle apprend au joueur que la parole donnée est un
  décor. Elles sont câblées là où le monde les attendait déjà, sans qu'une règle
  nouvelle soit écrite :

  - **`vue`** — les villes de l'allié entrent au carnet comme si l'on avait un
    contremaître dans chacune, et les colonnes qui passent sur ses terres sont
    relevées. C'est le carnet du joueur qui va chercher le pacte, jamais le
    monde qui vient le remplir : la règle d'or tient.
  - **`passage`** — le péage existait (40 à 220 crédits) et ne connaissait
    qu'une dispense, servir le drapeau qui tient la barrière. Une parole donnée
    en vaut une autre au poste de garde. La décision est sortie du corps de la
    rencontre : `laissePasser(state, groupe, faction)` rend `'service'`,
    `'pacte'` ou `null`, et le garde ne dit pas la même chose dans les deux
    premiers cas.

  Les deux ont leur contre-épreuve : parole reprise, les registres se referment
  et la barrière retombe.

  Ce qui bloque est ailleurs : le monde que P3 produit est plus grand — neuf
  drapeaux vivants par partie au lieu de sept, et dix villes de plus — et le
  tick coûte **14 % de plus**, ce qui passe le plafond de rattrapage vécu (3,71 s
  contre 3,60 autorisés). Le propriétaire a tranché : « améliore les
  performances » — donc P3 attend, et il attend écrit, pas à réécrire une
  quatrième fois. Ce qu'il faut pour l'allumer : environ dix pour cent de tick,
  ou la décision de relever le plafond.
