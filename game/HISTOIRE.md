# Histoire — le chantier du récit

Ouvert par le propriétaire, août 2026 : « l'arc narratif c'est bien, mais il
ne faut pas se limiter aux premières fois, il faut que l'histoire soit bien
plus intéressante, fais des propositions » — puis « Programme complet » sur
les cinq lots ci-dessous, dans l'ordre A + D, puis C, puis B + E, chaque
étape livrée et jouée avant la suivante.

## Le principe — l'histoire sort de la simulation, jamais l'inverse

Ce jeu a un avantage que les jeux à scénario n'ont pas : tout ce qui arrive
est **vrai**. Une ville tombe parce que sa monnaie s'est effondrée, pas parce
qu'un script l'a décidé. Le chantier histoire ne rajoute donc **aucun rail,
aucun événement scripté, aucune quête écrite d'avance** : il apprend au jeu à
RACONTER ce que le moteur produit déjà — et à en garder la mémoire.

Cinq règles, non négociables :

1. **Rien d'inventé.** Chaque phrase du récit s'appuie sur un fait que le
   moteur a réellement produit : un événement du journal, un état, une
   statistique. Le moteur sait POURQUOI une ville tombe — le récit le dit.
2. **Pas un tirage de plus dans le flux** (piège n°1). Toute variété de
   texte se dérive par `grainDe` (graine de chemin), jamais du `Rng` scellé.
3. **Tout état narratif vit côté joueur** (`state.player`, `state.stats`,
   `state.memorial`), passe par `normaliser`, et survit à la sauvegarde. Le
   monde n'en sait rien — la règle monde/joueur qui prépare le multijoueur
   n'est pas négociable ici non plus.
4. **Le ton est celui de la chronique** : sobre, français, des phrases qui
   constatent. Pas d'emphase, pas de points d'exclamation.
5. **Chaque lot a un critère testable** — headless pour la mécanique du
   récit, navigateur pour ce que le joueur voit.

## L'état des lieux

Le jeu possède déjà les briques d'un récit, mais elles ne se parlent pas :
une **chronique de fin** (titre + bilan, `chronique.js`) qui n'existe qu'à la
mort ; un **journal** de quatre cents lignes sèches (« Les Rouilleurs
s'emparent de Relais-Quatre-Vents ») ; un **mémorial** des morts ; des
**stats** complètes (`faitsDe`) ; des **individus nommés** partout
(dirigeants, notables, recrues — chantier INDIVIDUS) ; et un moteur qui
connaît les causes (famine, siège, monnaie effondrée, dette). Tout le
chantier consiste à tisser ces briques.

## Les lots

### Premier étage — la narration pure (aucune règle nouvelle)

- [x] **A. Les chapitres.** La partie se découpe en chapitres nommés — « La
  poussière », « Un toit », « Les couleurs », « Le prix du sang »… — déduits
  de l'état du joueur par une fonction pure : pas de script, la partie DevIENT
  ce chapitre parce que les faits y sont. L'ouverture d'un chapitre est un
  événement marquant vécu (la cloche sonne), le journal affiche le chapitre
  courant en tête de chronique, et la chronique finale se structure par
  chapitres — « Chapitre II, jours 8 à 31 ». Critère : une partie neuve
  s'ouvre sur le premier chapitre ; fonder un camp en ouvre un ; les
  chapitres survivent à la sauvegarde ; pas un tirage consommé ; pas de
  bascule intempestive (un chapitre tient au moins deux jours).

  Livré : `src/histoire.js` — six chapitres à préséance (« Ce qui reste »
  le deuil, « Le prix du sang » la guerre de son pays, « Les couleurs » le
  service, « Les affaires » la fortune, « Un toit » le camp, « La
  poussière » le reste), `chapitreDe` pur, hystérésis de 48 h, numérotation
  en chiffres romains ; branché en fin de tick, état côté joueur seulement,
  zéro tirage. La chronique du journal affiche le chapitre courant, sa
  phrase, et la table des chapitres passés avec leurs jours. Huit tests
  headless nés rouges, un test navigateur (« Chapitre I » lisible en
  chronique), aller-retour JSON exact préservé.
- [ ] **D. Les nouvelles racontées.** Les dépêches du monde disent la cause
  et la conséquence, que le moteur connaît déjà : « Fort-Vermeil est tombée »
  devient « Fort-Vermeil est tombée après onze jours de siège — la garnison
  mangeait ses semences depuis des semaines ». S'applique aux événements
  marquants seulement (chute de ville, effondrement de monnaie, mort d'un
  dirigeant, fin de guerre), en enrichissant l'entrée de journal au moment où
  elle s'écrit, à partir de l'état de la ville/faction concernée. Critère :
  sur une campagne de banc, chaque type d'événement marquant porte au moins
  une cause dans son texte ; aucun tirage nouveau ; le coût du tick ne bouge
  pas au protocole calibré.

### Deuxième étage — les gens

- [ ] **C. Les fils personnels.** Chaque membre de l'escouade porte une
  histoire : d'où il vient (dérivée de son archétype et de sa graine —
  `grainDe`, jamais le flux), et une affaire à régler — un lieu à revoir, une
  dette, quelqu'un à retrouver — qui avance quand les événements vécus la
  croisent (on traverse SA région, on croise SA faction, il survit à son
  premier combat, il perd un compagnon). Chaque étape s'écrit au journal et
  sur sa fiche. Sa mort ferme le fil dans le mémorial — l'histoire dit alors
  ce qu'il n'aura pas fini. Critère : chaque recrue a un fil lisible sur sa
  fiche ; au moins une étape franchissable par le jeu normal, vérifiée en
  headless ; les fils survivent à la sauvegarde ; zéro tirage du flux.

### Troisième étage — le monde vous connaît

- [ ] **B. Les figures.** Des personnages récurrents que la partie fait
  revenir : le commanditaire dont on a rempli trois contrats, le dirigeant
  qu'on a servi, celui dont on a tué les hommes. Le jeu tient une mémoire
  courte des rencontres (côté joueur), et quand une figure réapparaît — un
  contrat, un conseil, une colonne — le texte le dit : « encore lui ».
  Critère : après trois contrats du même commanditaire, le panneau le nomme
  en connaissance ; un ennemi récurrent est nommé comme tel ; mémoire bornée
  (pas de fuite de sauvegarde).
- [ ] **E. La mémoire des lieux.** Les villes se souviennent : la première
  fois qu'on revient dans une ville où l'on a fait quelque chose de notable
  (un contrat tenu, une rixe, une vente record), une ligne d'accueil le
  rappelle — depuis les faits déjà consignés (estime, rapport, stats), sans
  rien stocker de plus côté monde. Critère : revenir dans une ville après un
  contrat rempli produit la ligne ; une ville où rien ne s'est passé ne dit
  rien ; état côté joueur seulement.

## Ce que ce chantier ne fait pas

Pas d'objectifs imposés, pas de quêtes scriptées, pas de personnages
inventés hors simulation, pas de texte généré par tirage du flux principal.
Si un lot a besoin d'une RÈGLE de jeu nouvelle (pas d'un texte), c'est une
décision de cahier des charges à remonter au propriétaire, pas une ligne à
improviser.

## Blocages

Rien pour l'instant.
