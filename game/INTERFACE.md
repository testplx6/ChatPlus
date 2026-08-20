# Interface — le chantier de ce que le joueur voit

Ouvert par le propriétaire, août 2026 : « go UI UX », sur le constat de la
revue totale. Le moteur a tenu ses trois promesses — précision (l'invariance à
la maille est sous le plancher de bruit), absence de limites (une monnaie
s'effondre, une ville meurt, le monde rétrécit), fiabilité (dix gardes, un
invariant exact). **L'interface ne les raconte pas.** Le meilleur moteur du
monde derrière une vitre sale : c'est ce déséquilibre que ce chantier corrige.

## Le principe — montrer, pas inventer

Ce chantier n'ajoute **aucune mécanique de jeu**. Tout fait affiché sort d'une
fonction existante du moteur : un prix vient de `prixJoueur`, un cours de
`coursMonnaie`, un candidat de `bancDerive`. Un lot qui aurait besoin d'une
règle nouvelle n'est pas un lot d'interface — il redevient une décision de
cahier des charges, à trancher par le propriétaire avant d'écrire une ligne.

Trois règles, héritées des chantiers précédents :

1. **Aucun chiffre inventé.** Si l'interface veut dire quelque chose que le
   moteur ne calcule pas, c'est un blocage, pas une occasion d'improviser.
2. **La sobriété est le style.** Jeu textuel, mobile d'abord, une police, pas
   de décor. La hiérarchie se fait par l'information, pas par l'ornement.
3. **Chaque lot a un critère vérifiable dans `test/navigateur.js`.** Les
   captures (`captures/`) sont l'instrument de constat — c'est en les
   regardant qu'on a trouvé les trois faiblesses ci-dessous, pas en relisant
   le code.

## L'état des lieux — captures du 18 août 2026

**L'écran de ville** (`09-etal.png`, arrière-plan ; `blocColonie`, ui.js) :
neuf boutons empilés, typographiquement identiques. « Marché » ne dit pas si
les vivres sont chers ; « Recruter » ne dit pas si quelqu'un attend ;
« Change » ne dit pas que la monnaie d'ici s'est effondrée — alors que le
moteur vient précisément de gagner le droit de l'effondrer (lots H et I).
Trois boutons portent déjà un compte — Contrats (2), Coffre (kg), Écoles (1) —
la preuve que la forme existe ; il manque les six autres.

**La carte** (`01-carte.png`) : des taches de couleur sur du noir, une légende
en codes de cinq lettres (« ROUIL », « OMBRL »), pas un nom de ville écrit sur
la carte, et un pied technique (« 24 px/secteur ») qui parle au développeur,
pas au joueur. On ne peut ni s'orienter ni raconter ce qu'on voit.

**L'arc** (`00-accueil.png` → `29-chronique.png`) : l'accueil est bon — quatre
départs qui sont des situations, pas des difficultés. La chronique de fin est
bonne — un titre, des chiffres qui racontent. Entre les deux : rien qui donne
un cap. Le joueur sait d'où il part et ce qu'il laissera, pas ce qu'il est en
train de devenir.

## Les lots

- [x] **U1. L'écran de ville : des portes qui parlent.** Chaque bouton de
  `blocColonie` porte un fait vivant, tiré du moteur, sous son libellé :
  Marché → le prix des vivres ; Équipement → le nombre d'articles à l'étal ;
  Recruter → combien de gens cherchent à partir ; Change → l'état du cours
  (« effondrée » / « envolée » — les mots d'`ecranMonde`, les mêmes bornes) ;
  Qui vit ici → habitants et actifs ; Contrats, Coffre, Attelage, Écoles
  gardent et complètent leur compte. Critère : **plus aucun bouton nu** — le
  test navigateur lit un fait sur chacune des portes, et échoue si l'une
  d'elles redevient muette.

  Livré : `porte()`/`portesDeVille()` dans ui.js, tout tiré de fonctions
  existantes (`prixJoueur`, `bancDerive`, `coursMonnaie`, `actifs`,
  `placeCoffre`) ; `etatCours()` factorisé — `ecranMonde` et la porte du
  change nomment le cours avec les mêmes seuils, même leçon que les cinq
  couleurs d'estime ; le fait passe en rouge quand la monnaie est effondrée
  ou envolée. Constat : `captures/01e-portes.png`.
- [x] **U2. La carte : lisible d'un regard.** Les villes connues portent leur
  nom sur la carte au zoom où on les distingue ; la légende écrit les noms
  pleins des factions, pas leurs codes ; le pied technique disparaît ou se
  fait discret. Critère : la légende ne contient plus aucun code tronqué, et
  le dessin écrit au moins un nom de ville quand une ville connue est à
  l'écran (vérifiable en interceptant `fillText` dans le test navigateur).

  Livré : les noms se collectent dans la boucle des colonies et se peignent
  en dernier (halo sombre, gris pour les ruines), seulement au zoom ≥ 20 px
  et seulement pour les villes relevées — la carte reste un carnet ; la
  légende passe de `.court` à `.nom` ; le pied dit « secteur G6 » et plus
  « 24 px/secteur ». Constat : `captures/01f-carte-noms.png`.
- [ ] **U3. L'arc : un cap entre l'accueil et la chronique.** **Ajourné par
  le propriétaire, août 2026 : « pour l'instant rien, chantier suivant ».**
  Les trois options restent instruites ci-dessous pour le jour où il
  rouvrira la question. Rien ne s'écrit d'ici là.

## U3 — la décision à trancher

Donner un cap au joueur peut se faire à trois profondeurs, et elles n'engagent
pas la même chose :

- **A. La chronique en marche** — purement interface. La chronique n'attend
  plus la fin : elle note les premières fois (première ville entrée, premier
  contrat tenu, première guerre traversée, premier mort) au moment où elles
  arrivent, dans le journal, avec le ton qu'elle a déjà. Aucune mécanique,
  aucun tirage, aucune règle : des constats sur des faits que le moteur
  produit déjà.
- **B. Des objectifs par départ** — mécanique nouvelle. « Le survivant »
  aurait un but (atteindre une ville, par exemple), avec état, réussite,
  échec. C'est un cahier des charges à écrire et à faire valider : hors du
  périmètre de ce chantier tant que le propriétaire ne l'ouvre pas.
- **C. Rien** — l'errance est le jeu, l'absence de cap est un choix assumé.

Recommandation : **A** — c'est la seule qui tienne dans « montrer, pas
inventer », et elle suffit peut-être.

## Revue du 20 août 2026 — sur captures, écran par écran

Constat fait sur les captures du jour (régénérées par le test navigateur),
après la livraison de U1 et U2. **Ce qui tient** : la sobriété est une
identité, pas un manque — la prose d'aide est bonne et chaque écran explique
sa règle ; les replis sont mémorisés ; les vraies alertes alertent
(l'entrepôt qui refuse, l'argent qui fond) ; le bandeau du haut dit tout en
deux lignes ; les portes et les noms de la carte font leur travail.

**Ce qui accroche, classé :**

1. **Casse mécanique** — l'écran des bourses coupe les noms de réseaux au
   milieu des mots (« Consortiu / m Hexa », le badge ACCORD collé au « S »
   orphelin) : la colonne est trop étroite pour son contenu
   (`42-bourses.png`).
2. **Les codes de faction survivent hors légende** — « CENDR » dans les
   routes marchandes, et sept usages de `.court` de drapeau encore dans
   ui.js (guerres, armées, sièges, change). U2 n'a traité que la légende.
3. **Bavardage généré** — la carte d'un contrat de livraison nomme la même
   ville cinq fois et dit « sans délai » puis « aucun délai » dans la même
   carte (`11-contrats.png`) ; « 31 ville(s) », « 2 RÉSEAU(X) »,
   « 1 blessé(s) » — trente pluriels parenthésés alors que les drapeaux
   savent s'accorder ; « 0 INCONNU » répété six fois dans l'écran monde là
   où une ligne « les cinq autres ne vous connaissent pas » suffirait.
4. **Colonnes muettes** — au marché, « 3,1 / 2,2 » et les deux boutons
   +10/−10 ne disent nulle part lequel achète et lequel vend : ça s'apprend
   par position, pas par lecture (`09b-marche.png`). Sur la fiche d'un
   membre, le « 99 % » à côté du nom n'a pas d'étiquette.
5. **Le journal crie en permanence** — badge à 47, 58, 99 non lus : à ce
   niveau, le compteur n'informe plus, il décore.
6. **Le grand écran gaspille** — sur 1280 px, une colonne de ~600 px et du
   noir autour (`08-large.png`) ; la carte pourrait vivre à côté des
   panneaux au lieu d'au-dessus.

**Les lots qui en découlent :**

- [x] **U4. Les finitions qui se voient** (petit, dense) : bourses qui ne
  coupent plus les mots, les sept `.court` restants remplacés par les noms
  pleins, la carte de contrat dédoublonnée, les pluriels accordés, les
  inconnus regroupés, des en-têtes achat/vente au marché, une étiquette sur
  le pourcentage de la fiche. Critère : test navigateur — plus aucun texte
  coupé en milieu de mot dans les bourses, plus aucun code de faction dans
  un écran, les colonnes du marché nommées.

  Livré : le nom d'un réseau a sa ligne (et `overflow-wrap: anywhere` →
  `break-word` partout — on ne coupe un mot que s'il ne tient pas seul) ;
  cinq sites de `.court` de faction passés aux noms pleins (routes,
  guerres, colonnes, change) ; la carte d'une livraison nomme sa
  destination au plus deux fois et « aucun délai » ne double plus « sans
  délai » ; ~40 pluriels accordés (aide `pl()` dans ui.js, accords inline
  dans rapport, base, events, allegeance, save) ; les factions qui ne vous
  connaissent pas tiennent sur une ligne de l'écran monde ; le marché a des
  en-têtes Acheter / Vendre et explique « prix (achat / vente) » ; la fiche
  écrit « santé 99 % ». Constat : `captures/42-bourses.png`,
  `11-contrats.png`, `09b-marche.png`.
- [ ] **U5. Le journal qui compte juste** : le badge dit ce qui mérite
  l'attention (le marquant), pas le volume. Critère à écrire avec le lot.
- [ ] **U6. Le grand écran** : au-delà d'une largeur, la carte et les
  panneaux côte à côte. Critère : à 1280 px, plus de colonne unique.

## Blocages

Rien pour l'instant.
