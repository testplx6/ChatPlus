# La mémoire a des porteurs — cahier des charges

Ouvert par le propriétaire (« ouvre », août 2026), à la suite de la revue au
prisme (AUDIT.md §prisme) : ses deux derniers écarts, S1 et S5, sont le même
défaut vu des deux côtés — **l'information sur le joueur n'a ni porteur ni
jambes**. Le monde l'oublie au chronomètre et le voit agir en direct, alors
que lui subit le brouillard, les relevés datés et les rapports en retard.
Conçu en binôme avec le game master, chaque fait moteur revérifié à la ligne.
Format METHODE §9. **Rien ne se code avant que le propriétaire ait tranché
les décisions.**

## 1. Le constat, chiffré

**S1 — le joueur est le seul être du monde qu'on oublie à heure fixe.**

- Chaque jour à `t % 24 === 0` (events.js:549-563), toute estime positive
  fond (`EROSION_ESTIME` 0,1/j, dégressive sous 30 — lot 3), toute rancune
  fond (`OUBLI_RANCUNE` 0,45/j). Exemption : le drapeau qu'on sert.
- La raison d'être de l'oubli est réelle et documentée sur place : sans lui,
  la réputation est « un cliquet qui descend — dix accrochages suffisent à se
  rendre le monde définitivement hostile ». Toute refonte doit garder une
  porte de sortie de l'hostilité.
- Les factions entre elles ne s'oublient jamais au chronomètre : leurs
  relations bougent quand un conseil juge (`jugerLesAutres`,
  factions.js:1273+) — un agent, un moment.
- L'équilibre d'ouverture a été calibré CONTRE la pente (le seuil
  d'enrôlement, l'estime de départ — allegeance.js:94-117, et la mesure du
  lot 3 : sous le seuil à J7-J20 en ne faisant rien de mal). Retirer la pente
  déplace tout ce calage : à remesurer au banc (le témoin `sansErosion`
  existe déjà — test/equilibre.js:2034).

**S5 — le monde voit le joueur agir en direct, partout, sans témoin.**

- S'engager : −20 immédiat chez tous les ennemis en guerre
  (allegeance.js:500-505).
- Vendre un esclave : −14 chez les siens et −4 chez TOUTES les
  abolitionnistes, à l'heure même, où que la vente ait eu lieu
  (justice.js:428-433). Organes : idem, −5 (depouilles.js:228-234).
- Piller une caravane : −22 la faction + les deux villes des bouts
  (`retenirEnVille` −18), instantané, même sans survivant modélisé
  (caravanes.js:858-867).
- Déclarer l'indépendance : −35 su partout à l'heure même (base.js:1818-1821).
- Pendant ce temps, le joueur, lui, apprend les nouvelles du monde avec
  retard (`DELAI_NOUVELLE`, connaissance.js:366-391) — et ce délai est FIXE
  par type, indépendant de la distance : c'est l'écart E12 de l'audit, qui
  entre dans ce chantier.

**Ce qui existe déjà et qu'on réutilise.** La mémoire des lieux
(`retenirEnVille`, `retenir` — services.js:117-135, lot B+E), l'`opinion`
des notables et leur mortalité (notables.js), la relecture à la succession
(F1, influence.js `tickCour`), les nouvelles sourcées (« rapporté » vs
« témoin », connaissance.js), les colporteurs comptés (`base.marchands`),
le témoin de banc `sansErosion`.

## 2. La règle de conception

Une information sur le joueur est un FAIT : local, daté, avec des témoins.
Elle voyage par les mêmes canaux que les nouvelles du monde, à la même
vitesse. Elle est PORTÉE — par une ville qui retient, un notable qui a une
opinion, un chef qui relit un dossier — et elle meurt avec ses porteurs ou
s'émousse quand un agent en décide, jamais au chronomètre.

## 3. Les lots (proposés — l'ordre est celui du moindre risque)

- **L1 — les actes ont des témoins.** Les cinq sites d'omniscience passent
  par témoins + délai : une vente au marché a des témoins par définition
  (la nouvelle part de la ville et voyage) ; une caravane pillée n'en a que
  si des rescapés s'échappent ; l'engagement et l'indépendance sont des
  faits publics qui VOYAGENT (E12 : délai = distance × canal) au lieu
  d'être sus partout à l'heure même.
- **L2 — E12, la nouvelle a des jambes.** `DELAI_NOUVELLE` devient
  f(distance, canal) pour tout le monde — les nouvelles du monde vers le
  joueur ET les faits du joueur vers le monde. Un seul système.
- **L3 — l'oubli devient événementiel.** L'érosion quotidienne meurt.
  L'estime et la rancune bougent sur des événements : succession de chef
  (F1 étendu à l'estime), mort d'un notable qui vous connaissait, chute de
  la ville où l'on s'était fait un nom, guerre/paix qui rebat les cartes.
  La porte de sortie de l'hostilité (le cliquet) change de forme : la
  rancune meurt avec ses porteurs, se solde (primes payées), s'éteint à la
  paix — des événements, pas un taux.
- **L4 — le recalage d'ouverture.** Remesurer au banc les seuils
  d'enrôlement et l'estime de départ dans le monde sans pente (profils du
  banc + `sansErosion` comme témoin de contrôle).

## 4. Les décisions du propriétaire

*(Sera complété avec l'avis du game master avant tout code — voir
l'avancement.)*

1. **Qui porte l'estime ?** Garder le scalaire par faction mais ne le faire
   bouger que sur événements (pas raisonnable, livrable ici), ou refondre
   vers des porteurs nommés (notables, chefs — le vrai fond, mais c'est un
   chantier de plus) ?
2. **Un acte sans témoin est-il jamais su ?** Doctrine « c'est à eux de
   voir » : des rescapés s'échappent-ils toujours d'une caravane pillée ?
3. **L'oubli disparaît-il entièrement**, ou devient-il lui-même
   événementiel (les porteurs meurent, les générations passent) ?

## 5. Les cibles mesurables

1. Un test né rouge par lot.
2. L'ouverture tient : les profils du banc (colon, négociant, franc-tireur)
   ne régressent pas dans le monde sans pente.
3. Le cliquet ne revient pas : une partie qui accumule dix accrochages doit
   garder une porte de sortie mesurable de l'hostilité.
4. Gardes du monde inchangées.

## 6. Ce que ça casse, dit d'avance

- Le calage d'ouverture (lot 3, ESTIME_ENGAGEMENT) est à refaire — c'est L4,
  et il est DANS le chantier, pas après.
- Le témoin `sansErosion` du banc change de sens (il n'y aura plus d'érosion
  à couper) : à re-consigner.
- E12 touche `nouvellesConnues`, lu par l'UI et le rapport d'absence.

## L'avancement

- [ ] Cahier relu par le game master, décisions complétées et tranchées
- [ ] L1 — les actes ont des témoins
- [ ] L2 — E12, la nouvelle a des jambes
- [ ] L3 — l'oubli devient événementiel
- [ ] L4 — le recalage d'ouverture

## Blocages

Rien pour l'instant.
