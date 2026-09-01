# L'investissement des conseils — cahier de réforme

Ouvert sur la trouvaille de MARECHAL.md §Blocages (« l'investissement du
conseil est quasi mort, et personne ne l'avait vu »), sur feu vert de
mesure du propriétaire (« ensuite tu peux mesurer si tu veux », août
2026). Format METHODE §9. **Rien ne se code avant que le propriétaire
ait tranché la décision unique de la section 3.**

## 1. Le constat, à la ligne

- **La séquence d'une séance de conseil** (factions.js) :
  `remonterCaisses` (:876) balaie TOUT ce que chaque ville a au-delà de
  son fonds de roulement — `surplus = caisse − reserveVille` remonte au
  trésor (economy.js:914-928). Puis `majCours` recote la monnaie
  (:956). Puis le conseil regarde qui veut bâtir (:1148).
- **Le garde teste une dette que personne ne prend.**
  `veutBatir` (credit.js:407-415) compare le service d'un emprunt de
  400 crédits à `capaciteRemboursement(ville) = caisse − réserve`
  (credit.js:67-71). Or le seul appelant est le conseil
  (factions.js:1148), et le conseil ne fait pas emprunter la ville : il
  paie comptant sur son trésor (`f.tresor > coutMur × 2,25`, puis
  `verser` aux maçons — factions.js:1151-1160, economy.js:784). Le
  commentaire de `veutBatir` (« Emprunter pour bâtir, quand l'argent
  est bon marché ») décrit un flux qui n'existe plus.
- **Par construction, la réponse est presque toujours non.** La caisse
  vient d'être balayée à la réserve exacte : `capaciteRemboursement`
  retombe à zéro. Le test ne passe que par un accident d'ordre :
  `majCours` recote APRÈS le balayage, et si le cours monte, la réserve
  (`… / cours`, economy.js:904-906) baisse — la différence devient une
  « capacité » de quelques crédits. Les murs du conseil ne se bâtissent
  que les jours où la monnaie s'apprécie.
- **Chiffré (mesure MARECHAL)** : 44 chantiers sur six graines et
  6 000 heures, pour trente-six pays — un mur tous les 818 heures de
  monde entier, alors que le trésor moyen en paierait des dizaines.

## 2. Le prisme

L'agent qui porte la décision est le conseil : c'est lui qui a
l'argent (le surplus des villes remonte chez lui), lui qui décide
(section 5 de sa séance), lui qui paie (verser). La règle actuelle fait
dépendre sa décision de la poche d'un autre agent — une ville qu'on
vient de vider — pour un emprunt qu'aucun des deux ne contracte. Ce
n'est pas une règle qui vise le joueur (aucune odeur du prisme) : c'est
un garde-fou resté branché sur un circuit démonté.

## 3. La décision — tranchée par le propriétaire (septembre 2026)

Une seule question était posée : **que doit regarder le conseil avant de
bâtir ?** — avec trois réponses au choix. La réponse est plus large que les
trois :

> « À lui de voir, avec ce qu'il possède, ce qu'il emprunte ou autre
> solution, tout est possible. »

Ce n'est pas B, ni C : c'est **B et C réunis, le choix revenant à l'agent**.
Le conseil n'a donc pas une façon de payer, il a une situation, et il en tire
ce qu'il peut — c'est la doctrine du projet appliquée à la lettre (« quel agent
la porte, et que sait-il ? »). D'où `financerMur`, qui rend trois réponses :

- **comptant**, quand le trésor porte le coût avec de la marge — c'est le
  seuil `tresor > coutMur × 2,25` qui vivait en dur dans la séance, devenu
  `INVESTIR.margeComptant` ; il n'a pas changé de valeur, il a cessé d'être la
  seule porte ;
- **à crédit**, quand il n'a pas cette marge mais peut avancer la somme sans
  se vider, et que la ville dégage assez pour porter l'intérêt ;
- **rien**, quand il ne peut ni l'un ni l'autre — un pays ruiné cesse
  visiblement de bâtir, et l'on peut dire de quelle ville il s'agit.

Et `veutBatir` cesse de répondre aux deux questions à la fois : il ne dit plus
que le **besoin** (`murs < taille × 6`), qui ne dépend d'aucune caisse.

**Ce que le conseil sait de la ville, et qui n'existait pas.** Le service d'une
dette se compare à ce que la ville dégage. Aucune mesure de ce flux n'existait :
`capaciteRemboursement` est un **stock** (`caisse − fonds de roulement`), et le
balayage l'annule par construction — c'est le défaut entier. `remonterCaisses`
calculait pourtant déjà la bonne grandeur sans la garder : ce que la ville vient
de verser. Elle est désormais notée sur la ville (`col.remonte`), et c'est une
mesure, pas une estimation.

### Les trois options qui étaient soumises, pour mémoire

- **A. Statu quo, consigné comme voulu.** « Un pays ne fortifie que
  quand sa monnaie respire » — défendable, mais alors c'est un effet du
  change, pas une décision d'agent, et il faudrait l'écrire dans
  `veutBatir` à la place du commentaire d'emprunt périmé.
- **B. Le conseil regarde son trésor (recommandée).** `veutBatir` garde
  le besoin (`murs < taille × 6`) et le prix vrai (E10 : le cours
  divise), et le test de solvabilité devient celui qui existe déjà une
  ligne plus bas : le trésor du pays porte le coût (la marge ×2,25 de
  factions.js:1151 est le vrai garde). La capacité d'emprunt de la
  ville sort du test — elle reste ce qu'elle est pour le crédit de
  détresse, qui, lui, endette vraiment.
- **C. Rendre l'emprunt réel.** La ville s'endette pour ses murs
  (principal indexé E10, intérêts au taux directeur), et `veutBatir`
  redevient exact. Plus lourd : il faut décider qui rembourse quand la
  ville tombe, et le crédit de détresse occupe déjà ce circuit.

## 4. La mesure — avant/après, mêmes graines

- **Lot 0 (métrique d'abord)** : compter les chantiers du conseil dans
  `jouer()` de tools/banc.js (les entrées `type: 'chantier'` du monde),
  plus les murs moyens en fin de partie et le trésor moyen. Jamais un
  script à côté.
- **L'avant est connu** : 44 chantiers / 6 graines / 6 000 h. Le lot 0
  le revérifie avec la métrique permanente avant tout changement.
- **L'après, contre témoin** (`banc.js --temoin`, mêmes graines) :
  - les chantiers du conseil vivent (ordre de grandeur attendu en B :
    borné par `tresor > coutMur × 2,25` et le `rng.chance(0.6)` de la
    séance — à mesurer, pas à promettre) ;
  - les gardes de CIBLES.json tiennent telles quelles — `convois` en
    tête : des villes plus murées font moins de prises, donc moins de
    reprises ; si une garde sort, STOP et blocage, pas d'élargissement ;
  - l'invariant comptable exact (le circuit trésor → maçons → ménages
    existe déjà, on ne crée pas de flux) ;
  - la survie et le patrimoine du bot dans le bruit du témoin.

## 5. Ce que ça ne touche pas

Ni `remonterCaisses` (le balayage est le revenu du pays, il est sain),
ni le crédit de détresse, ni le prix vrai des murs (E10), ni la main du
Maréchal (M4 : la place désignée passe toujours par `veutBatir` — elle
profiterait de la réforme au même titre que le sort).

## L'avancement

- [x] Décision du propriétaire — « à lui de voir » (section 3)
- [x] Lot 0 — la métrique des chantiers du conseil dans `jouer()`,
      l'avant revérifié : **37 chantiers**, 9,36 murs par ville, six graines
      et six mille heures. Le cahier annonçait 44 sur une mesure antérieure ;
      l'ordre de grandeur est le même — un mur toutes les huit cents heures de
      monde entier, pour trente-six pays.
- [x] Lot 1 — la réforme, cinq tests rouges d'abord, mesurée contre témoin
      (`df4e5a8`, mêmes graines) :

| | témoin | après |
|---|---|---|
| chantiers du conseil | 37 | **379** |
| murs par ville | 9,36 | 10,17 |
| villes debout | 355 | 326 |
| trésor médian | 36 588 | 16 860 |
| satiété | 0,979 | 0,969 |
| écart comptable | 0 | **0** (exact) |

Les dix gardes de `CIBLES.json` tiennent sans qu'aucune ne soit touchée
(villes 326 ≥ 260, pop 146 397 ≥ 120 000, satiété 0,969 ≥ 0,7, bourses 26,
convois 14 442, guerres 19, endettées 225, écrasées 8/36, saisies 683,
effondrées 1 — cette dernière juste sur son plancher, à surveiller).

**Ce que ça coûte, et c'est voulu** : vingt-neuf villes de moins et un trésor
médian divisé par deux. Un pays qui bâtit a moins pour nourrir — le crédit de
détresse se dimensionne sur le trésor (`CREDIT.partDuTresor`) — et fortifier a
donc enfin un coût d'opportunité. C'est la simulation qui se referme, pas une
avarie : la production rapportée à la consommation s'améliore (1,26 → 1,30) et
l'invariant comptable reste exact au centime.

**La « masse monétaire » qui tombe de 7,7 à 2,7 millions n'est pas une
destruction d'argent** : c'est une somme d'unités de trente-six monnaies dont
les cours vont de 0,03 à 32, et la trajectoire ne fait plus naître le pays
hyper-coté qui pesait la moitié du total. La grandeur homogène — la même somme
ramenée en ancien crédit — ne bouge que de −2 % entre les deux réglages du
crédit. METHODE §12, une fois de plus.

## Ce que la mesure a appris, et qui n'était pas prévu

**La voie du crédit est vraie, et presque personne ne l'emprunte : 2 murs sur
379.** Le compteur est permanent (`à crédit` au banc). Ce n'est pas un réglage
manqué — relâcher `partServiceDette` de 0,35 à 3 ne change rien, et ouvrir
`partDuTresor` de 0 à 0,8 ne déplace que seize chantiers. La raison est
structurelle : **un pays ne peut pas s'emprunter à lui-même l'argent qu'il n'a
pas.** L'argent d'un mur sort du même trésor dans les deux cas ; ce que le
crédit change est qu'il revient. La voie ne sert donc que dans la bande étroite
où le trésor tient entre 1,25 et 2,25 fois le coût d'un mur — rare dans un
monde où les trésors sont à seize mille pour un mur à quatre cents.

Pour que « ce qu'il emprunte » ait toute sa portée, il faudrait un **prêteur
tiers** : le voisin qui finance vos murs et tient votre ville par la dette. Le
moteur en a déjà les deux bouts (`racheterCreance`, `saisir` — la conquête par
l'argent). C'est une piste, pas une tâche : elle n'est pas dans ce cahier et ne
s'écrira pas sans être ouverte.

## Blocages

(vide)
