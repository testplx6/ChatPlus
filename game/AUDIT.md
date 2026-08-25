# Audit doctrinal — le moteur au crible de la simulation, août 2026

Demandé par le propriétaire (« l'objectif est de créer une vraie
simulation » — fallait-il tout refaire de zéro ?). Mené par le game
master sur les 38 modules, à la grille de la doctrine (game/CLAUDE.md) :
**(1)** quel agent porte la règle ; **(2)** que sait-il ; **(3)** qui
possède l'état ; **(4)** rien ne disparaît, rien n'apparaît ;
**(5)** rien n'est fixe qui devrait vivre. Constante physique
calibrée = conforme ; constante comportementale ou sociale figée =
écart. Les affirmations porteuses ont été revérifiées dans le code.

Les six lots de PROMESSES.md ne sont pas re-jugés ici (P1 livré, P2-P6
en cours).

## Le verdict global

**Une trentaine de modules sur 38 sont conformes d'emblée**, plusieurs
exemplaires (monnaie.js, credit.js, factions.js, recrues.js — leurs
commentaires répudient l'équilibrage en toutes lettres). Les quatorze
écarts se concentrent aux **bords** du moteur — rencontres de route,
prix hors-marché, constantes de calendrier — et aucun ne touche
l'architecture. **La refonte de zéro aurait été un contresens** : elle
aurait jeté l'actif le plus rare (des comptes exacts au centième,
des constantes qui portent leur mesure) pour réécrire les cinq pour
cent qui se respécifient en trois vagues de couture. « La doctrine
n'est pas à imposer à ce code : elle en est déjà, pour l'essentiel,
la description. »

## Conforme (résumé)

monnaie (invariant exact, entrerDehors/sortirDehors), credit (le
défaut est une décision du créancier), factions (conseils au
tempérament, colonnes impayées à cinq issues), lois/dirigeants (rien
n'est fixe : lois votées, régimes qui évoluent), notables/services
(marges portées par des caractères), recrues (prix = valeur × tension
× votre nom), secteur, justice/depouilles/betes/coffres/groupes/
formation (bornes par coûts vécus, l'arme suit le corps), economy
(prix par tension/solvabilité, circuit fermé), bourse, connaissance
(savoir situé et daté), climat/world/characters (physique calibrée),
combat (les tactiques sont des paris, achever est une politique),
rng/save/sim/rapport, histoire/chronique (récit strictement côté
joueur). Conforme-administratif : files pleines, MAX_CONTRATS,
cadences de calcul, péremption du carnet.

## Les quatorze écarts

| n° | l'écart (fichier:ligne) | l'agent qui devrait porter | taille |
|---|---|---|---|
| E1 | la bande taillée sur l'escouade (events.js:432-435) et armée par le calendrier (`niveauMonde = t/2500`, events.js:430) — du rubber-banding | la bande : taille née du lieu, décision d'engager au rapport VISIBLE (nombre, armes, bêtes chargées) | moyenne |
| E2 | le calendrier comme agent : force des raids `+t/600` (base.js:1547), Essaim `+t/400` (factions.js:788) | les accumulateurs des agents (butin espéré, compte de saccages) | petite |
| E3 | le payeur marqué : `×1,6^rachats` global, éternel, sans bouche (base.js:2405) | la faction qui a encaissé — mémoire par faction, érosion (pente d'OUBLI_RANCUNE), diffusion en nouvelle ; prix = décision de l'assiégeant (rancune, tempérament, but de guerre — un conquérant refuse l'argent) | moyenne |
| E4 | **le marché de l'équipement ne vit pas** : l'objet vendu à l'étal DISPARAÎT (economy.js:2288-2300), l'étal se régénère ex nihilo (2231-2248), prix = constante × humeur — et le plancher 0,45 de la forge est le pansement | l'armurier (caractère, marge, étal existants) : l'objet vendu entre à l'étal, prix par tension du stock, `coutForge` en nomenclature physique — le plancher meurt de sa belle mort | **grosse** |
| E5 | le butin DUPLIQUE l'arme : copiée au vainqueur, restée sur le corps (combat.js:450-451) — l'inverse exact de P1 | le vainqueur retire la pièce ; désarmer un prisonnier devient un fait | petite |
| E6 | l'anéantissement d'un groupe efface tout du monde (squad.js:829-840) | le vainqueur emporte, la région garde le reste (cache sur la case — `r.site`/`r.magot` existent) | petite-moy. |
| E7 | le butin payé en monnaie d'ici — `monnaieButin` existe sans AUCUN appelant (events.js:217, monnaie.js:508) | la monnaie de la faction du mort (ECONOMIE §7.2) — une ligne | petite |
| E8 | les objets ne pèsent rien (`poidsInventaire` ignore les items, economy.js:2067) — les plafonds en dur (30/40) tiennent lieu de physique | le dos des porteurs : les items pèsent leur `poids`, les plafonds tombent | petite |
| E9 | quatre prix figés à côté d'un marché vivant : colporteur 0,55/1,35 (base.js:1933), caravane ×1,15 (events.js:704), errant `irange(120,420)` (events.js:665) alors que `valeurRecrue` existe, péage `irange(40,220)` (events.js:720), esclave ×3,2 calibré sur la rentabilité DU JOUEUR (justice.js:246) | le colporteur (qui revend quelque part), le marchand, l'errant coté comme une recrue, le barrage (cupidité + loi fiscale), l'acheteur d'hommes | moyenne |
| E10 | ~~coûts régaliens non indexés sur le cours~~ — **résolu avec M6** (MARECHAL.md) : coutArmee, coutLevee, COUT_POSTE/GARNISON/GRENIER/CHANGE, les maçons du conseil et le service du mur (`veutBatir`) divisent par le cours | fait — un pays effondré n'arme plus personne à bon compte | livrée |
| E11 | l'intendance du camp achète/vend à seuils fixes que personne ne règle (base.js:1873-1877) | le joueur : trois consignes de plus, valeurs actuelles par défaut | petite |
| E12 | la nouvelle voyage à vitesse fixe, indépendante de la distance (DELAI_NOUVELLE, connaissance.js:277) | ceux qui voyagent : délai = f(distance) × type | petite |
| E13 | la carence de raid 72 h et `miliceMax = 6` sans porteur (base.js:1545, 2119) | la carence EST la mémoire des pillards (P6) ; le plafond = ceux qu'on peut armer (P1) et que le moral fournit | petite (avec P1/P6) |
| E14 | l'urgence d'un contrat tirée à pile ou face (contrats.js:36, allegeance.js:734) | la détresse réelle de la ville (`detresse` existe, credit.js:88) | petite |

## Tranché par le propriétaire, août 2026

1. **« Rien ne se perd, tout se transforme — valable pour tout. »**
   Conservation totale : gens, matière, objets. Les affamés partis,
   les esclaves vendus, les débandés deviennent le monde qu'on croise
   (chantier « migrations », vague 3).
2. **« Les bandes utilisent ce qu'elles prennent comme elles le
   veulent. »** Elles existent donc entre deux rencontres : un stock,
   des choix (s'équiper, manger, revendre) — et ce qui se stocke se
   pille (vague 3, avec E4).
3. et 4. **« Ça évolue si ça doit évoluer. »** La cruauté, l'agression,
   la cupidité d'un drapeau ne bougent PAS par une règle posée pour
   les faire bouger : elles bougent quand la simulation leur donne une
   raison — une guerre perdue, un chef cruel qui dure, une loi. À
   brancher là où ces raisons naissent déjà (dirigeants, lois,
   guerres).
5. et 6. **« Pas clair — aller dans le sens de la simulation. »**
   Tranché dans ce sens : **la mémoire appartient au souvenant** —
   ce que chaque faction pense de vous migrera chez elle (comme
   l'opinion d'un notable vit déjà sur sa ville), le monde continuant
   de ne jamais lire `state.player` ; et **on est sur les cartes
   quand des témoins vous y ont mis** — l'inscription devient un fait
   du monde (assez de colporteurs et de voyageurs passés), que le
   joueur peut devancer en se déclarant, plus un seuil de 18 têtes.

## Ce qui restait à trancher (mémoire de l'audit)

- **T1** — « rien ne disparaît » vaut-il pour les gens ? Les affamés
  « partis », l'esclave vendu, les débandés s'évaporent. Abstraction
  démographique assumée, ou conservation (les partis deviennent les
  errants, colons et bandits qu'on croise — un chantier
  « migrations ») ?
- **T2** — où va ce que prennent les bandes éphémères ? Consommation
  hors champ, ou stock à faire exister (marché noir, camps de bandits
  pillables) ?
- **T3** — la disposition à achever (`letal`) par faction : trait
  culturel immuable, ou chose qui vit (but de guerre, chef, loi) ?
- **T4** — `agression`/`cupidite` d'une faction tirées à la genèse et
  fixes : culture de la maison, ou dérive lente au fil des dirigeants ?
- **T5** — les mémoires du monde sur le joueur stockées côté joueur
  (`reputation`, `rachats`, `primes`) : statu quo doctrinal
  (recommandé — c'est « ce que le monde pense de VOUS », le monde
  n'en lit rien), ou registre à déplacer le jour du multijoueur ?
  Noter l'asymétrie : l'opinion d'un notable vit côté monde.
- **T6** — l'inscription sur les cartes à 18 habitants + halle :
  seuil en dur, ou « être inscriptible » lu de ce que les tiers ont
  vu (le compteur `marchands` existe) ?

## Le plan de résorption proposé

- **Vague 1 — gros gains de vérité, petit travail** : E7, E5, E2,
  E10, E11, E12, E14, E13 (avec P1/P6).
- **Vague 2 — moyens** : E3, E6, E8, E9, E1 (P6 étendu à la route).
- **Vague 3 — gros chantiers** : E4 (le marché de l'équipement qui
  vit) ; puis, si T1/T2 tranchés côté conservation : les migrations
  et l'économie des bandes.

Rien n'est engagé : chaque vague passera par un cahier des charges et
le propriétaire.

---

# La revue au prisme du propriétaire — août 2026

Ordonnée après M4/F2 : « j'ai l'impression que c'est punitif et
anti-jouabilité, le but est de créer une simulation, pas de faire un
truc injouable », puis « go et revois tout le code avec ce prisme,
c'est important ». Menée en binôme avec le game master, chaque constat
revérifié ligne à ligne. La grille : (1) multiplicateur ou constante
punitive qu'aucun agent ne porte ; (2) minuteur vécu comme une taxe ;
(3) règle qui ne vise que le joueur ; (4) friction sans contre-jeu.

## Corrigé dans la foulée (tests nés rouges à chaque fois)

- **M4, le ×2 de la place désignée** — une perte = une faute, toujours ;
  la promesse vit dans le récit, pas dans un multiplicateur.
- **F2, le bouc émissaire au minuteur** — devenu un événement avec un
  visage : seuls rancunier, rapace et conquérant se défaussent, une
  fois par guerre et par chef.
- **E3, le payeur marqué** (base.js) — le ×1,6^rachats mondial et
  éternel devient un savoir situé : celui qu'on a payé s'en souvient
  (3 000 h), les autres tant que la rumeur court (720 h), tout s'érode.
- **S2, les rations d'entraînement** (squad.js) — une ration par heure
  pour deux, soit un corps qui mange vingt fois ce qu'un marcheur
  mange : un prix d'équilibrage, pas une faim. L'effort (1,5) passe
  par la physiologie ; le portillon « plus de rations, entraînement
  interrompu » est mort — c'est le ventre qui lâche, pas une règle.
- **S3, les manques éternels du crédit** (influence.js) — le compteur
  à vie plombait une carrière à perpétuité (seul « contre-jeu » : se
  faire rétrograder exprès pour purger). Le conseil lit désormais sa
  feuille de service — quatorze faits — et les manques y vieillissent
  comme le reste.
- **S4, le −30 forfaitaire du départ** (allegeance.js) — le prix se
  lit au dossier : en règle on se quitte (−10), un ordre abandonné est
  un abandon (−30), déserter en guerre pareil — et une armée stricte
  met votre tête à prix : elle pend les déserteurs.
- **S6, le portillon des 72 h entre raids** (base.js) — remplacé par
  l'accalmie dans la jauge : un raid qui vient d'avoir lieu se raconte
  aussi, l'appétit se relève avec l'oubli (240 h, calibrable). Une
  seule mémoire, portée par les pillards — la fin naturelle d'E13.

## Décisions au propriétaire — les deux fonds et deux petits

- **S1 — l'érosion d'estime quotidienne** (events.js) : chaque jour à
  heure fixe, toute estime fond (0,1/j) et toute rancune aussi — le
  joueur est le seul être du monde que tout le monde oublie au
  chronomètre (les factions entre elles ne bougent que quand un
  conseil juge). La reformulation : l'estime portée par des gens qui
  se souviennent, et qui bougent sur des ÉVÉNEMENTS — succession (F1
  le fait déjà pour les fautes), chute d'une ville, mort d'un notable.
  C'est un chantier (l'équilibre d'ouverture a été calibré CONTRE
  cette pente), pas un correctif.
- **S5 — le monde omniscient sur vos actes** : s'engager, vendre un
  esclave, piller une caravane sans survivant, l'indépendance — tout
  se sait partout, à l'heure même, sans témoin ni route. Le joueur
  subit le brouillard ; le monde, lui, voit en direct. Reformulation :
  un acte est un fait local et daté, il voyage par les canaux
  existants (DELAI_NOUVELLE, colporteurs) et il lui faut des témoins.
  À instruire avec E12 et T5 — même sujet que S1 vu de l'autre côté :
  **la mémoire et l'information doivent avoir des porteurs et des
  jambes.**
- **S7** — le jugement d'un acte à 1 200 h pile, sur l'instantané
  d'une heure : cosmétique, à juger au premier conseil suivant.
- **S11** — le joueur capture et rançonne, mais n'est jamais capturé
  ni rançonné : une asymétrie EN SA FAVEUR. La symétrie viendra du
  chantier geôle — dureté « simulation pleine », à n'ouvrir que
  volontairement.

## Jugé sain, au prisme

Fatigue/faim/marche forcée (physiologie, récupérable, choisie), le
secteur (niveau de repos, mérite autant que blâme), le crédit fautes
×25 (comptabilité d'un conseil, vivante par F1), la faute double d'une
guerre perdue (hiérarchie d'événements, pas multiplicateur), les
contrats (rater est neutre, l'urgence paie), la jauge de raid P6 (le
butin cru, jamais le registre), la suspension de solde P5 (portée par
une loi qui vit), les prix marchands (une marge de notable nommé), la
justice (mêmes peines pour le joueur acteur et cible). Le goutte-à-
goutte de rancune de l'Ombrelle (−0,02/h) est signalé par honnêteté de
grille mais gardé : porté par une loi choisie, petit, contre-jeu
évident. Le plancher d'appétit des pillards (0,15) : des rôdeurs
opportunistes, défendable.

**Constat d'ensemble du game master, vérifié :** après P1-P6, la
correction M4/F2 et cette vague, le moteur n'a plus AUCUN
multiplicateur dirigé contre le joueur. Ce qui reste (S1, S5) n'est
pas de la punition — c'est de l'information sans porteur, et c'est le
même chantier des deux côtés.
