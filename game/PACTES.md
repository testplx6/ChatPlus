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
- **P2 — Les clauses mordent.** Le secours qu'on honore ou non, la guerre
  commune, le passage, la vue. C'est le lot où une parole donnée a un prix.
- **P3 — Le monde s'en sert.** Les conseils proposent et rompent d'eux-mêmes ;
  la carte politique se recompose par la diplomatie et plus seulement par les
  armes. Mesure au banc obligatoire : c'est un mécanisme qui touche toutes les
  factions à la fois, et le précédent de S3 est dans toutes les mémoires.
