# Le Maréchal — le sommet de la voie du service, cahier des charges

Ouvert par le propriétaire (« go avec GM », août 2026) — conçu en
binôme avec le game master, chaque fait moteur revérifié à la ligne.
Format METHODE §9. **Rien ne se code avant que le propriétaire ait
tranché les cinq décisions.**

## 1. Le constat, chiffré

- **Le sixième barreau a été posé, pas son métier.** Le grade Maréchal
  existe (1500 points, solde 520 — allegeance.js:53), une partie sur
  trente y arrive — et il n'ajoute au rang 4 que deux tuyaux
  monétaires (`racheter`, `retirer` — influence.js:128-141), deux
  gestes que les conseils PNJ font déjà tout seuls (factions.js:889).
  Le rang 4 a déjà tout le politique : guerre, paix, lois, crédit,
  émission, accords, et le silence du conseil législatif
  (`ctx.legislateur`, sim.js:411).
- **Le paradoxe du nom : le Maréchal ne touche pas aux armées.** Et
  c'est là que la fonction est vacante — la faction n'a pas de plan de
  guerre, elle a un réflexe : deux colonnes au plus, tirées vers la
  ville la plus proche, taillées sur sa défense (factions.js:992-1002,
  cibleLaPlusProche :761). Personne ne porte la stratégie.
- **Le vis-à-vis manquant.** Le dirigeant est le personnage le plus
  riche du moteur (tempérament, légitimité, succession, bilan de
  règne) — et le joueur ne le rencontre jamais autrement que comme une
  ligne de journal.
- **Un reste d'omniscience** : l'écran Monde liste toutes les armées
  avec leur force exacte (sim.js:802) pendant que `menacesSurLaBase`
  cache honnêtement la sienne — le renseignement militaire est le
  dernier endroit du jeu où le savoir n'est pas situé.

## 2. La question structurante — le Maréchal et le dirigeant

Trois lectures. **L1, la dyarchie** (recommandée comme corps du
chantier) : le dirigeant gouverne, le Maréchal commande les armes — le
sommet reste un serviteur, avec un métier et un antagoniste, et la
charge peut se perdre. **L2, la couronne** (recommandée comme porte,
lot final) : à la chute ou la mort du chef, la maison peut OFFRIR la
charge de dirigeant à un Maréchal au crédit haut, selon son régime —
élection, bilan, acclamation ; les criminels n'offrent rien, un coup
se prend (chantier futur). Refuser est permis, la vie continue.
**L3, le baron rebelle** (écartée ici) : partir avec ses colonnes et
planter son drapeau — consigné dans PISTES.md, c'est un chantier
entier et il marche sur la parole donnée.

## 3. Les lots — six pouvoirs, deux frictions subies, une porte

Chaque pouvoir emprunte un canal existant, se paie à l'issue par la
caisse de jugement (`inscrireActe`/`jugerActes`, influence.js), et
s'écrit à la feuille de service.

- **M1 — le commandement des colonnes.** Charge tenue, les colonnes de
  la maison n'obéissent qu'au Maréchal : le conseil s'efface des
  étapes militaires comme il s'efface des lois (même câblage que
  `ctx.legislateur`), reprend la main pendant vos absences
  (`ctx.absent`) et dès que le crédit tombe (`tickCharges`). Les
  villes perdues sous votre commandement s'imputent à vous, pas au
  dirigeant.
- **M2 — rappeler une colonne.** Le verbe manquant : ordonner le
  retour (route, puis garnison — l'état existe). Rappeler en plein
  siège est une retraite, et si le but de guerre en meurt, la faute
  est au dossier. Aucun agent du jeu ne sait refuser une bataille
  aujourd'hui.
- **M3 — le but de guerre choisi.** Le déclarant de rang 5 nomme le
  but parmi les types existants (`butDeGuerre`, dirigeants.js) — et
  `etatDuBut` juge la paix contre CE but. On dit ce qu'on est venu
  chercher, on est jugé dessus. (C'est aussi la place préparée à
  l'ultimatum du chantier « parole donnée » — sans y toucher ici.)
- **M4 — la place à tenir.** Désigner la ville que la maison renforce
  en priorité (l'investissement du conseil est tiré au sort
  aujourd'hui — factions.js:1103). La place désignée qui tombe est une
  double faute : c'était la vôtre.
- **M5 — l'état-major, et la réparation qui va avec.** Les colonnes
  hors de vue passent aux relevés datés comme tout le reste (fin de
  l'omniscience de sim.js:802) ; le Maréchal reçoit ce que la maison
  voit — ses villes, ses colonnes, ses guets (`regionsVues` donne déjà
  les villes de la faction dès Agent). On commande avec les yeux de la
  maison.
- **M6 — la levée dimensionnée.** `leverColonne` lève 60 hommes,
  toujours (FORCE_LEVEE) ; le Maréchal choisit la force — le trésor
  borne, la solde court, le ravitaillement plafonne. L'écart E10 de
  l'audit part avec : `coutArmee` s'indexe sur le cours, sinon une
  monnaie effondrée lève des armées gratuites.
- **F1 — la relève des comptes** (subie) : à chaque succession, le
  nouveau dirigeant relit votre crédit à son tempérament — un
  rancunier compte vos fautes double, un conciliateur en efface. On
  peut se coucher Maréchal et se réveiller Commandeur parce qu'un chef
  est mort.
- **F2 — le bouc émissaire** (subie) : un dirigeant contesté dans une
  guerre qui va mal impute une faute au Maréchal — il se sauve sur
  votre dos, c'est injuste, et c'est voulu. Contre-jeu : gagner vite,
  signer la paix, ou rendre la charge avant qu'il ne vous la fasse
  payer.
- **M7 — la porte de la couronne** (lot final, découplable) : l'offre
  à la succession selon le régime ; accepter = le dirigeant porte
  votre nom, le conseil s'efface entièrement (les verbes de
  gouvernement existent tous dans influence.js), une légitimité
  remplace le crédit, et `tickDirigeant` peut vous renverser comme un
  autre — on ne démissionne pas d'un trône, on en tombe. Refuser = un
  PNJ prend la place.

## 4. Ce que ça casse, dit d'avance

- **L'équilibre des six voies** : le service devient la voie la plus
  profonde — c'est le but — sans rien retirer aux autres ; la
  discipline P5 s'applique au Maréchal comme au dernier des Affiliés.
  Garde au banc : colon, négociant, franc-tireur ne régressent pas.
- **Le monde ne lit jamais `state.player` — tenu** : tout passe par le
  `ctx`, précédent exact de `ctx.legislateur`. (Le jour de la
  migration « la mémoire au souvenant », les charges migreront comme
  les réputations — même chantier, pas celui-ci.)
- **Multijoueur** : voie B (un monde par joueur) — un Maréchal par
  monde, rien à faire ; voie A — le problème d'exclusivité existe déjà
  pour `ctx.legislateur`, une ligne à ajouter dans MULTIJOUEUR §5.
- **M7 et le drame des successions** : un joueur-dirigeant qui dure
  fige le tempérament de sa maison — voulu ; le banc vérifie que les
  AUTRES factions gardent leur rythme de règnes (garde `dirigeants` de
  CIBLES.json).

## 5. Les cibles mesurables

1. Un test né rouge par lot (le conseil ne lève plus quand la charge
   est tenue et reprend en absence ; le rappel route puis dissout ; la
   paix jugée contre le but nommé ; l'investissement va à la place
   désignée ; une armée hors de vue affiche un relevé daté, plus sa
   force vive ; la levée à force choisie débite le trésor au cours).
2. Les frictions se voient : une succession relit le crédit (test à
   tempéraments opposés) ; un dirigeant sous légitimité critique en
   guerre perdante impute la faute.
3. Gardes du monde inchangées — dont `dirigeants` (le rythme des
   règnes des factions sans joueur ne bouge pas).
4. Vieilles sauvegardes : un Maréchal existant reçoit son commandement
   sans rien perdre.

## 6. Ce qu'on ne fait pas

Pas de baron rebelle (PISTES.md). Pas de coup d'État criminel (chantier
futur, avec la geôle). Pas d'ultimatum ni de tribut (chantier « parole
donnée » — M3 lui prépare la place). Pas de bouton sans canal : chaque
pouvoir emprunte un flux que la faction a déjà.

## Les décisions du propriétaire

1. **La dyarchie (M1)** : le conseil s'efface des colonnes comme des
   lois (recommandé — reprise en absence et sous crédit épuisé), ou
   garde l'initiative avec droit de veto ? *Un vrai commandement,
   contre un jeu de contre-ordres.*
2. **La couronne (M7)** : l'offre + le règne minimal dans ce chantier
   (recommandé), chantier « Régner » séparé, ou jamais ? *La voie du
   service a-t-elle un toit, ou une terrasse.*
3. **Le bouc émissaire (F2)** : un dirigeant peut vous casser
   injustement (recommandé — c'est la simulation d'une cour, et
   l'injustice fait le récit), ou seulement sur fautes réelles ? *Le
   drame, contre le confort.*
4. **La levée (M6)** : force au choix bornée par le trésor
   (recommandé), ou paliers fixes ? *Une campagne se dimensionne, ou
   se prend au menu.*
5. **La relève des comptes (F1)** : le tempérament du successeur relit
   le crédit (recommandé), ou la feuille de service est sacrée d'un
   règne à l'autre ? *Servir la maison, ou servir un homme.*

## L'avancement

- [x] M5 — l'état-major et la fin de l'omniscience — livré : les
  colonnes se relèvent comme les villes (`releverArmee` dans
  `observer`, péremption appliquée), `vueArmee` centralise qui voit
  quoi (sous nos yeux / rapports de la maison dès Agent /
  transmissions par cryptographie / sinon relevé daté **qui vieillit à
  sa place d'hier**), `armeesConnues` liste le frais et le daté — y
  compris les relevés d'armées qu'on ne retrouve plus, crus jusqu'à
  péremption. L'UI suit : carte (les rapports de la maison s'y
  dessinent enfin), panneau de secteur, écran monde (le décompte des
  campagnes en cours n'est plus dit — c'était déjà un renseignement),
  légende Essaim. Six tests nés rouges.
- [x] M1 — le commandement des colonnes — livré : `commandementDe`
  (influence.js) désigne la faction commandée (charge de Maréchal, crédit
  debout, présent) ; `ctx.marechal` s'installe dans le tick comme
  `ctx.legislateur`, et le conseil s'efface des deux sites de levée (fronts
  ouverts, reprise d'un bourg libre) — il reprend la main pendant les heures
  rattrapées et dès que le crédit tombe. Une ville perdue sous commandement
  passe par `ctx.perteVille` : faute au dossier de l'officier, la légitimité
  du dirigeant ne bouge pas — il n'en répond plus. L'écran de charge le dit
  en clair. Neuf tests nés rouges (levée gelée, reprise réelle, absence,
  imputation, témoin Commandeur).
- [ ] M2 — rappeler une colonne
- [ ] M6 — la levée dimensionnée (+ E10, l'indexation au cours)
- [ ] M3 — le but de guerre choisi
- [ ] M4 — la place à tenir
- [ ] F1 + F2 — les frictions de la cour
- [ ] M7 — la porte de la couronne

## Blocages

Rien pour l'instant.
