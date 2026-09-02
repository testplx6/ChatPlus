# La parole donnée — cahier des charges

Ouvert par le propriétaire (septembre 2026), après explication du sujet.
Troisième chantier de l'ordre recommandé par `REVUE.md`, sous le titre « la
geôle, les rançons et la parole donnée ». Format METHODE §9.
**Rien ne se code avant que le propriétaire ait tranché la section 4.**

## 1. Le constat, vérifié à la ligne

**Le joueur ne peut rien promettre — sauf s'il est un pays.** Les pactes
existent, ils mordent et ils se trahissent (`CLAUSES`, cinq clauses livrées au
chantier PACTES), mais ils se signent **entre drapeaux** : `pactesPossibles`
n'accepte qu'une faction du monde, et le geste du joueur passe par le sien
(M3). Tant qu'on n'a pas planté ses couleurs — donc dans la plupart des
parties — on ne peut donner sa parole à personne.

Ce qu'on a, à la place, ce sont des verbes **pendant** la crise :

- se battre, ou fuir ;
- `negocierSiege` (base.js) : acheter la levée d'un siège **une fois la colonne
  devant les murs** ;
- et, sur un prisonnier déjà pris : `livrer`, `rancon`, `vendre`, `enroler`,
  `relacher` (justice.js).

Rien avant. Pas de trêve achetée, pas de tribut, pas d'otage, pas de service
promis contre un service rendu.

**Et donc pas de parole trahie** — ce qui est le vrai manque. On ne peut pas
manquer à un engagement qu'on n'a pas le droit de prendre.

**La geôle du camp est une clé qui n'ouvre rien.** `base.js` crée chaque camp
avec `geole: null`, exactement comme les villes (`geoleDe`, justice.js:502, qui
sait détenir, juger et relâcher). Côté joueur, cette clé n'est jamais remplie :
les captifs voyagent avec l'escouade, mangent (`tickPrisonniers`), la ralentissent
(`lenteurPrisonniers`) et s'évadent quand personne ne les regarde
(`surveillanceManquante`). On ne peut pas *poser* quelqu'un chez soi.

## 2. Ce qui existe déjà, et qu'on ne réécrit pas

C'est un chantier de branchement, pas d'invention :

- **la mémoire** : le registre des faits est la seule porte vers la réputation,
  avec ses témoins et ses délais (`commettre`, MEMOIRE.md) — une promesse rompue
  devant témoins se saura, et pas ailleurs ;
- **la rancune qui vise** : `ctx.rancune` (sim.js:543) décide déjà qui vient
  prendre votre camp — celui qui vous déteste, celui à qui vous faites la
  guerre. Une parole donnée, ou rompue, entre exactement là ;
- **les clauses et leur prix** : `CLAUSES` chiffre déjà ce que chacune donne et
  coûte, et `peserPacte` sait ce qu'un conseil en pense ;
- **la geôle** : `geoleDe`, la détention, la peine, la prime ;
- **la rançon** : `disposer('rancon')` et le prix qu'en donnent les siens ;
- **l'argent** : le chemin comptable est exact, joueur compris (vérifié à
  16 000 h).

## 3. Le plan — quatre marches, chacune jouable seule

### T1 — La parole d'une escouade *(aucun drapeau requis)*
Donner sa parole à un **pays** sans en être un : trêve, passage, service. Le
conseil pèse ce qu'il y gagne (`peserPacte` existe) et ce que vous valez à ses
yeux (estime, faits connus). Ce que vous promettez vous engage, et ne pas tenir
se sait — par témoins, comme le reste.

### T2 — Le tribut, et l'achat de la paix *(avant la crise)*
Payer d'avance pour qu'on vous oublie : une somme, une part de ce qu'on
produit, ou une livraison régulière. En face, quelqu'un décide s'il accepte —
et un tribut qu'on cesse de verser est une parole rompue, pas un simple retard.

### T3 — La geôle du camp
Remplir la clé qui attend : garder chez soi, nourrir, faire travailler,
échanger. Ce que le camp gagne (on ne traîne plus ses captifs) et ce qu'il
risque (une geôle se force, et un prisonnier repris parle).

### T4 — L'otage
La garantie d'une promesse : on laisse quelqu'un, on récupère quelqu'un. C'est
la marche qui donne son poids à T1 et T2 — une parole gagée sur un des siens
n'est pas la même qu'une parole en l'air.

## 4. Les décisions — tranchées par le propriétaire (septembre 2026)

- **D1 — à qui : aux pays ET aux gens.** Un conseil décide pour un pays, mais un
  notable, un chef de bande ou un capitaine traite en son nom. C'est plus cher à
  écrire — il faut un porteur pour chaque promesse — et c'est ce qui rend le
  mécanisme vivant : la promesse a un visage, ce visage se souvient, et il peut
  mourir avec ce qu'il savait. Le moteur a déjà la mémoire des notables et leur
  mortalité. C'est aussi le seul choix qui permet **d'acheter la paix auprès
  d'une bande**, le cas le plus fréquent en jeu.
- **D2 — l'otage : un prisonnier ou l'un des vôtres, et ils ne valent pas
  pareil.** Laisser un captif ramassé la veille n'engage à rien ; laisser un de
  ses vétérans engage pour de bon. En face, on sait faire la différence : **la
  valeur du gage décide de ce que la parole vaut**.

  **Et surtout : aucun multiplicateur.** La première version écrivait « ×1,6
  pour un des vôtres, ×0,5 pour un captif » ; le propriétaire l'a refusée d'une
  phrase — « pourquoi ce facteur fixe et limité ? c'est justement ce qu'on
  chasse ici ». Il avait raison : un multiplicateur sans agent est la première
  des quatre odeurs de l'AUDIT. La bonne question est *qui juge, et sur quoi* —
  celui qui garde l'otage, sur ce qu'il voit. Un otage ne garantit rien par
  nature : il garantit dans la mesure où **le perdre vous coûterait**.

  - Un **captif** n'est pas des vôtres et cela se voit : pour son gardien c'est
    une marchandise, il vaut ce qu'on peut en tirer (`valeurCaptif`, qui sert
    déjà la rançon et la vente).
  - Un des **vôtres** vaut ce que sa perte vous ferait : ce qu'il sait faire,
    les saisons passées avec vous, l'affection que la troupe lui porte
    (`liens`), et s'il est le seul chez vous à savoir quelque chose. Tout cela
    se voit du dehors — on regarde qui parle à qui, qui marche devant, qui
    recoud.

  Conséquence que le facteur fixe interdisait, et qui est vérifiée par test :
  **une recrue de la veille ne gage pas mieux qu'un captif de même valeur**, et
  un ancien que la troupe aime vaut plusieurs fois davantage. Personne ne l'a
  décrété.

  **Et l'échelle est ouverte** — le propriétaire l'a demandé en lisant le
  premier compte rendu (« un ancien vaudrait éventuellement beaucoup plus que le
  double, non ? »). Elle l'était déjà ; c'était le plancher du test, à ×1,8, qui
  disait trop peu. Mesuré, troupe de vingt-quatre :

  | l'otage | valeur |
  |---|---|
  | captif ramassé hier | 16 |
  | recrue que personne ne connaît | **9** — moins qu'un captif |
  | un an, troupe tiède | 91 · ×5,7 |
  | trois ans, troupe qui l'aime | 233 · ×14,6 |
  | dix ans, troupe dévouée, maître de son art | 466 · **×29** |

  Rien ne plafonne : plus la troupe est grande et attachée, plus les années
  passent, plus il est irremplaçable. Et qu'une recrue anonyme vaille **moins**
  qu'un captif est juste, non un défaut : un captif vaut au moins une rançon,
  tandis que perdre un bleu que personne n'aime ne vous coûte rien.
- **D3 — le prix d'une parole rompue : ce que le monde en sait, rien de plus.**
  La rancune de qui l'a subie et ce que les témoins racontent — le moteur sait
  déjà faire, et « pas vu, pas su » vaut ici comme partout. **Pas de réputation
  de parjure globale.** Conséquence assumée et intéressante : trahir loin de
  tout regard ne coûte rien, ce qui ouvre le calcul du traître — où, et devant
  qui.
- **D4 — promettre à qui l'on fait la guerre : oui, et c'est celui d'en face qui
  décide.** Non posée au propriétaire : sa doctrine la tranche déjà (« tous les
  types de pactes sont possibles », « c'est à eux de voir »). On peut donc
  proposer une trêve en pleine guerre ; l'autre pèse et refuse le plus souvent.
  L'interdit de `pactesPossibles` reste pour les pactes **entre pays**, qui sont
  un autre objet.

### Les décisions, telles qu'elles étaient posées

- **D1. À qui donne-t-on sa parole ?** À un **pays** seulement (un conseil
  décide, c'est le patron des pactes) ; ou aussi à un **individu** — un
  notable, un chef de bande, un capitaine — qui a sa mémoire propre et peut
  mourir avec ce qu'il savait. Le second est plus vivant et plus cher : il faut
  un porteur pour chaque promesse.
- **D2. Un otage, est-ce l'un des vôtres ?** Un prisonnier qu'on laisse en
  gage, ou **quelqu'un de votre escouade** — ce qui rend l'engagement autrement
  sérieux et pose la question de ce qu'il devient si vous manquez.
- **D3. Que coûte une parole rompue ?** Rien d'automatique : la rancune de qui
  l'a subie, et ce que les témoins en racontent (le moteur sait déjà faire) ; ou
  faut-il en plus une trace durable — une réputation de parjure que les conseils
  consultent avant de traiter, comme ils consultent déjà l'estime ?
- **D4. Peut-on promettre à qui l'on fait la guerre ?** `pactesPossibles`
  l'interdit aujourd'hui entre pays. Une trêve d'escouade au milieu d'une
  guerre est pourtant un geste de jeu ordinaire — et un piège classique.

## 5. Les cibles mesurables

Au banc d'équilibrage, aux **deux horizons** (4 000 et 16 000 h), profils
ordinaire et `PILLARD` :

- une parole est donnée dans une partie sur trois au moins — sinon le
  mécanisme est décoratif ;
- une parole sur cinq environ est rompue, et se paie : la rancune de la partie
  lésée monte, mesurable ;
- la survie du bot ne bouge pas hors du bruit (le tribut ne doit pas devenir
  l'assurance-vie qui éteint la tension) ;
- l'invariant comptable reste exact, joueur compris ;
- les dix gardes de `CIBLES.json` tiennent.

## 6. Ce qu'on ne fait pas

Pas d'arbre de dialogue, pas de menu de négociation à cinq curseurs. Une
promesse, un prix, une échéance, et quelqu'un en face qui accepte ou non.

## L'avancement

- [x] Décisions D1–D4 (section 4)
- [x] T1 — la parole d'une escouade : **livré, moteur et écran**.
      `src/parole.js` (module neuf, placé avant `events.js` qui le lit) :
      `PAROLES` dit ce qu'on peut promettre et ce que ça pèse, `pesePromesse`
      dit ce qu'en pense celui d'en face — votre estime, ce que vous demandez,
      ce que vous laissez en gage, et la guerre qui rend sourd sans rendre muet
      (D4). `promettre` donne la parole avec une échéance ; `romprePromesse` la
      reprend, et **le prix dépend de qui l'a vu** (D3) : une ville à eux sur la
      case, une terre qu'ils tiennent, une de leurs colonnes à portée — sinon
      rien, comme partout ailleurs dans ce jeu.
      Premier effet câblé : une trêve **écarte leurs chasseurs de prime**
      (`tenterChasseurs`). La prime reste inscrite — on n'a pas été blanchi, on
      a été laissé tranquille.
      Neuf tests, dont un qui a d'abord été **complaisant** et qu'il a fallu
      refaire : compter zéro visite chez un seul traqué ne prouvait rien, la
      chasse étant rare (une visite sur quatre mille heures). Deux pays vous
      traquent, un seul a votre parole, et toutes les visites viennent de
      l'autre.
      **L'écran** : dans la ville où l'on se tient, sous l'engagement. Il dit ce
      qu'ils exigent et ce qu'on leur offre **avant** de cliquer, propose les
      gages possibles avec ce que chacun vaut à leurs yeux (les siens d'abord,
      les captifs ensuite), et une fois la parole donnée il la montre avec son
      échéance et de quoi la reprendre — en prévenant qu'ici, on vous voit. Six
      sondes navigateur.
- [x] T2 — le tribut : **livré, moteur et écran**.

      **Le prix n'est pas décrété** : ils réclament une part de ce qu'ils
      croient pouvoir vous prendre — la jauge des pillards (`jaugeRaid`,
      PROMESSES P6), lue par un conseil. Ce qui se voit, jamais votre registre :
      les bouches, les colporteurs repartis chargés, la place sur les cartes.
      On réclame moins à qui l'on apprécie, **davantage à qui l'on déteste**, et
      moins à qui mord (le risque qu'ils voient).

      Deux défauts de conception que les sondes ont rendus, et c'est tout
      l'intérêt de les écrire :
      1. *Un pays qui vous hait refusait votre tribut « faute d'estime »* —
         alors qu'un tribut est justement ce qu'on propose quand on est mal vu.
         Un prédateur ne refuse pas votre argent : il le fait payer.
      2. *Puis il refusait son propre tarif* à un petit camp mal vu : on ne
         pouvait acheter la paix que lorsqu'on n'en avait pas besoin. **Ce sont
         eux qui fixent le prix ; le payer suffit.** L'estime décide du tarif,
         pas de l'accord. Ce qui les fait refuser quand même : une guerre
         ouverte — on ne s'achète pas une paix qu'on n'a pas fini de perdre.

      Le versement tombe à échéance (`tickParoles`) : l'argent sort de votre
      poche, entre dans une de leurs villes et leur drapeau y prélève sa part,
      comme sur le reste — rien ne se crée. Et **un tribut qu'on ne verse plus
      n'est plus une parole** : c'est la seule du jeu qui se rompe sans qu'on
      l'ait décidé, quand on s'est appauvri. Nul besoin de témoin, ils
      attendaient cet argent.

      L'écran propose les deux paroles côte à côte, annonce le tarif avant
      qu'on s'engage, et **dit désormais pourquoi c'est refusé** — un refus muet
      laissait cliquer trois fois sans comprendre.
- [x] T3 — la geôle du camp : **livrée, moteur et écran**.

      La clé attendait depuis les débuts : chaque camp naît avec `geole: null`,
      exactement comme les villes, qui savent détenir, juger et relâcher depuis
      longtemps. Côté joueur elle n'a jamais été remplie — on traînait ses
      captifs, ils mangeaient sur le sac, ralentissaient la colonne et
      s'évadaient quand personne ne regardait. On ne pouvait pas **poser**
      quelqu'un chez soi.

      Un bâtiment (`geole`, rangé dans « Se défendre et soigner ») et quatre
      gestes : enfermer, reprendre, nourrir, et la fuite de ceux qu'on ne sait
      pas garder. **Rien n'interdit d'en tenir plus que la geôle n'en garde** —
      comme pour le portage, les bêtes ou les captifs en chemin, c'est le coût
      qui borne et non une règle écrite : les hommes en trop trouvent la sortie,
      et un détenu qu'on ne nourrit pas cherche plus fort.

      Ce que le camp y gagne se mesure : la colonne retrouve ses jambes
      (`lenteurPrisonniers` baisse), et le grain du camp paie ce que le sac
      payait. Sept tests moteur, quatre sondes navigateur.

      **Un piège d'outillage attrapé au vol** : `tickGeole` existait déjà pour
      les geôles des villes. Le bundle aplatit tout dans une seule portée — deux
      fonctions du même nom, et le jeu livré casse sans que les tests le disent.
      Le vérificateur l'a refusé avant le commit ; la mienne est
      `tickGeoleCamp`.
- [x] T4 — l'otage : **livré**, et c'est lui qui donne son poids au reste.

      Jusqu'ici le gage pesait dans la balance sans que personne ne bouge : on
      **annonçait** quelqu'un et on le gardait. Une garantie qu'on ne remet pas
      n'est pas une garantie, c'est un mot de plus.

      Désormais il **change de mains** : il quitte la troupe (ou vos captifs) au
      moment où la parole est donnée, et il reste chez eux. Trois issues, et
      elles sont toutes dans `tickParoles` :
      - la parole **tenue jusqu'au terme** : il revient, et le journal le dit ;
      - la parole **reprise** : il ne revient pas, et le journal le nomme — ce
        n'est pas une ligne comptable, c'est quelqu'un ;
      - le tribut **qu'on cesse de verser** : même chose, sans qu'on l'ait
        décidé.

      C'est ce qui referme le chantier : la valeur d'un otage se calcule sur ce
      que sa perte vous coûterait (§4, D2), et cette perte est maintenant réelle
      — un ancien que la troupe aime vaut trente fois un captif ramassé la
      veille, et le laisser derrière soi se paie exactement autant.

## Blocages

(vide)
