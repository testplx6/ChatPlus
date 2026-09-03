# Territoire — s'approprier une case, et y gagner quelque chose

**Ouvert en septembre 2026 sur une remarque du propriétaire, en jouant** : sa
base s'est retrouvée en terre ennemie sans qu'il perde un homme. Puis, la
discussion instruite : « il faut différents mécanismes d'appropriation, et
différents avantages également, aujourd'hui j'en vois très peu ».

Ce document est un **relevé de l'existant et un cahier des charges** :
rien n'est engagé, rien n'est chiffré. Les décisions sont au propriétaire.

---

## 1. Ce que le code appelle « tenir une case » aujourd'hui

Une région porte un champ `controle` : un nom de drapeau, rien d'autre. Pas de
garnison, pas d'entretien, pas de date. Il n'est écrit qu'à cinq endroits :

| où | quand |
|---|---|
| `world.js:330` | à la naissance du monde — chaque ville peint ses 4 voisines libres, 7 fois sur 10 |
| `factions.js:343-346` | à la prise d'une ville — le vainqueur prend sa case **et les voisines qui étaient au perdant** |
| `factions.js:1306` | une ville fondée prend sa propre case |
| `credit.js:374` / `economy.js:2054` | une ville saisie par son créancier, ou rendue par sécession |
| `economy.js:2135` | une ville qui meurt libère **sa** case (pas les quatre qu'elle avait peintes) |
| `base.js:2122` / `:2148` | le camp du joueur prend un drapeau, ou reprend le sien |

Il n'est **jamais recalculé**. Personne ne peut le contester. Deux conséquences
que le propriétaire a trouvées seul en jouant :

- **la revendication survit à celui qui la portait** — une ville meurt, ses
  quatre cases gardent son nom, parfois celui d'un pays éteint ;
- **la présence ne vaut rien** — mille deux cents hommes campés sur une case
  n'y changent absolument rien.

## 2. Ce que tenir une case rapporte aujourd'hui : rien à son propriétaire

Relevé exhaustif de toutes les lectures de `controle` dans le moteur.

**Pour la faction qui tient — zéro.** Pas de revenu, pas de ressource (la
`richesse` de la case ne va qu'à qui la fouille), pas de défense, pas de droit
d'expansion (`conseil` étape 5 cherche ses cases à fonder à trois cases de ses
**villes**, jamais de son territoire), pas de point de départ pour lever une
colonne (elle part d'une ville ; seul l'Essaim naît d'une case, et il choisit
justement les cases **sans** contrôle).

**Le péage n'enrichit personne.** 40 à 220 pris au joueur (`events.js:750`),
et `regler` ne fait que débiter sa bourse : la somme n'entre dans aucune caisse,
dans aucune masse monétaire. Elle disparaît.

**Trois effets, et les trois ne visent que le joueur** : ce qui sort du bois
sur ses terres (`bandeLocale`), les renforts qu'un gradé n'obtient que sur les
terres de son drapeau (`allegeance.js:1239`), et les témoins d'une parole
rompue ou d'un convoi pillé (`parole.js:326`, `caravanes.js:1151`).

C'est très exactement l'odeur n°3 de l'`AUDIT.md` : **une règle qui ne vise que
le joueur.** Le territoire est aujourd'hui un décor pour les pays, et une
friction pour lui.

## 3. Ce qui existe déjà et qu'il ne faut pas réécrire

Le jeu contient **un deuxième modèle du territoire, bien plus vrai**, et il
ignore `controle` : `secteur.js`. Chaque case porte une `insecurite` avec son
niveau de repos ; la **présence y agit** (`effetPresence` : une patrouille fait
baisser l'insécurité de 0,011 par heure, racine du nombre de bras) ; la menace
se lit **en écart à la normale** (`menace`, centrée sur 0,28) ; l'état des
routes remonte au conseil et pèse sur le pays (`etatDuPays.routes`).

Autrement dit : « occuper le terrain par la présence, et en sentir l'effet » est
**déjà écrit, mesuré et calibré**. Il n'est branché que sur la charge de
Lieutenant du joueur. Aucun pays ne s'en sert.

De même, les pactes câblent déjà `passage` (le péage s'ouvre) et `vue` (on voit
les colonnes qui passent sur les terres de l'allié) : le territoire sait déjà
être l'objet d'un accord.

## 4. Les mécanismes d'appropriation candidats

Le premier arrivé s'approprie — la règle du propriétaire est gardée. Ce qui
manque, c'est qu'il y ait **plusieurs façons d'être le premier**, et une façon
de cesser de l'être.

- **A1 — la ville** (existe) : fonder ou prendre. Le halo d'aujourd'hui.
- **A2 — la présence** : y camper, y patrouiller, y faire passer les siens.
  `effetPresence` existe ; il faudrait qu'il compte aussi pour les colonnes des
  pays, et qu'une présence durable sur une case libre finisse par la nommer.
- **A3 — l'ouvrage** : une route entretenue, un relais, un pont, un poste de
  péage bâti. On tient ce qu'on a construit, pas ce qu'on a traversé.
- **A4 — l'accord** : une case cédée, échangée ou concédée par traité. Les
  pactes savent déjà porter des clauses.
- **A5 — l'abandon** — **LIVRÉ, septembre 2026.** Plus rien à ce drapeau ne
  touche la case → elle redevient libre, et le suivant qui arrive se
  l'approprie. C'est le seul point du dossier qui corrigeait un défaut au lieu
  d'ajouter une possibilité, et le défaut était bien plus gros que prévu :
  **635 cases orphelines sur 1 434 tenues** (44 % du territoire du monde) à
  six mille heures, six graines — des couleurs au nom de villes mortes, de
  villes affranchies, parfois de pays éteints. Après : **756 tenues, zéro
  orpheline**, et la carte politique dit enfin qui tient quoi.

  La règle ne fait qu'appliquer la définition du halo jusqu'au bout : *une case
  n'est tenue que si une ville vivante de ce drapeau est dessus ou la touche.*
  Le premier arrivé garde tout ce qu'il a pris — la règle du propriétaire est
  intacte ; il cesse seulement de tenir ce qu'il n'a plus les moyens de tenir.
  `libererOrphelines` (world.js) relit la case et ses quatre voisines à chaque
  fois qu'une ville meurt, s'affranchit, fait sécession, est saisie, est prise,
  ou change de couleur pour le joueur — et toute la carte au chargement d'une
  partie d'avant, pour que le défaut ne survive pas à sa correction.

  Le banc porte la mesure (`cases tenues`, `orphelines` dans `jouer()`). Les
  dix gardes tiennent, le tick est à ×0,974, et l'écart comptable reste exact.
  Ce que la comparaison montre par ailleurs — zombies, guerres, masse nominale —
  est du chaos de graine et non un effet : sur six graines indépendantes les
  zombies vont dans l'autre sens (18 → 14), et la masse en ancien crédit ne
  bouge que de 3,5 %.

## 5. Les avantages candidats

- **B1 — le péage encaissé** — **PREMIÈRE MOITIÉ LIVRÉE, septembre 2026.** Ce
  que le barrage prélève entre désormais dans la caisse d'une ville : la ville
  vivante la plus proche sous le drapeau qui tient la case (`villeDuBarrage`).
  L'impôt monte au trésor comme sur toute recette, et la masse du pays bouge
  d'exactement ce que la caisse a bougé — la règle des deux, sans quoi le
  barrage aurait fabriqué de la monnaie. Payé dans une autre monnaie, il entre
  au cours du jour, comme une ville qui change de drapeau. Un barrage de bandits
  n'encaisse rien : on ne leur invente pas un pays.

  Avant, `regler` débitait la bourse du joueur et la somme n'entrait nulle part.
  Mesuré au banc d'équilibrage — le seul qui ait un joueur — sur une partie
  complète : **91 barrages croisés, 43 payés, 5 196 unités** qui s'évaporaient
  et qui entrent maintenant quelque part. L'invariant comptable reste exact.

  **La seconde moitié n'est pas faite** : « se prélève sur tout le monde ». Les
  convois du monde traversent toujours les terres d'autrui sans rien payer, si
  bien que le péage reste une chose que seul le joueur subit. La corriger
  demande de trancher une règle qui n'est pas à moi (voir §6, question 6).
- **B2 — la route sûre** : ses convois traversent ses terres moins cher et
  moins dangereusement. `insecurite` et `menace` sont déjà là ; les convois
  savent déjà se faire piller.
- **B3 — la ressource** : la `richesse` d'une case tenue alimente la ville qui
  la tient. Attention : c'est le levier qui touche le plus l'économie, donc
  celui qui demande le plus de mesure.
- **B4 — la vue** : on voit ce qui traverse chez soi. Le mécanisme existe
  (`connaissance.js:192`), il est aujourd'hui réservé à l'allié par pacte.
- **B5 — le ravitaillement** : une colonne se refait sur ses terres et
  s'épuise ailleurs. Donne enfin une raison militaire de tenir du terrain, et
  une raison d'en refuser le passage.
- **B6 — le droit d'y fonder** : on ne pousse une ville que chez soi ou chez
  personne. Aujourd'hui l'expansion ignore complètement les frontières.

## 6. Ce qu'il faut trancher avant d'écrire une ligne

1. **Combien de mécanismes d'appropriation, et lesquels** ? A5 seul est une
   correction ; A2 à A4 sont des chantiers séparés.
2. **Combien d'avantages, et lesquels** ? B1 est petit et juste ; B3 et B5
   changent l'équilibre du monde et demandent le banc.
3. **Le territoire doit-il coûter quelque chose ?** Tenir des cases sans
   entretien, c'est un empire gratuit — et c'est ce qui produit aujourd'hui
   les cases orphelines.
4. **Le joueur peut-il tenir du territoire sans drapeau ?** Ses 1 200 hommes
   sont la question qui a ouvert le dossier.
5. **Deux drapeaux peuvent-ils tenir la même case ?** Aujourd'hui non, et un
   « disputé » n'existe pas.
6. **Sur quoi un convoi paie-t-il le péage ?** (bloque la seconde moitié de B1)
   Un convoi n'a pas de bourse : il porte une cargaison et une créance sur la
   ville qui l'attend. Trois façons, et elles ne disent pas la même chose du
   monde : *(a)* la ville qui l'a expédié règle sur sa caisse — l'argent passe
   d'un pays à l'autre, le commerce lointain devient cher, et tenir des cases
   sur une route rapporte vraiment ; *(b)* le barrage prend de la marchandise —
   plus vrai pour un péage de piste, ça remplit les greniers de celui qui tient
   plutôt que sa caisse, et ça déborde sur B3 (la ressource) ; *(c)* le convoi
   choisit sa route pour éviter les barrages, et alors le péage ne rapporte
   presque rien mais **détourne le commerce**, ce qui est peut-être le vrai
   pouvoir d'une frontière.

Rien n'est engagé tant que le propriétaire n'a pas tranché.
