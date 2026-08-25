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

## 3. La décision — au propriétaire

Une seule question : **que doit regarder le conseil avant de bâtir ?**

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

- [ ] Décision A/B/C du propriétaire
- [ ] Lot 0 — la métrique des chantiers du conseil dans `jouer()`,
      l'avant revérifié
- [ ] Lot 1 — la réforme choisie, test rouge d'abord, contre témoin

## Blocages

(vide)
