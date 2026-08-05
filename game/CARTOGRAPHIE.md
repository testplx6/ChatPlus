# La carte des leviers

Ce que chaque constante du moteur commande, et de combien. Document
**produit par la mesure** — il se régénère, il ne se modifie pas à la main :

```
node tools/banc.js --cartographie
```

Révision `941073c` — 987 leviers sur 987 recensés, 6 graines × 6000 h.

## Comment lire

Chaque levier est joué deux fois : à **×0,7** et à **×1,4** de sa valeur
actuelle, aux mêmes graines que la référence. L'**élasticité** est la
variation de la métrique en pour cent pour un pour cent de levier : à +0,50,
doubler la constante augmente la métrique de moitié. Le signe dit le sens.

Une élasticité n'est écrite que si l'écart dépasse le **plancher de bruit**.
Le moteur est déterministe, mais multiplier une constante par 1,0001 — ce qui
ne change rien d'économique — décale les tirages, et six mille heures plus
tard le monde a divergé quand même. Ce chaos-là est mesuré par des placebos,
métrique par métrique, et tout ce qui reste dessous est déclaré **nul**, pas
« faible ». C'est pour cette raison qu'une colonne vide se lit « aucun effet »
et non « effet non détecté ».

Les 8 placebos portent sur les leviers qui remuent le plus le
monde, un par module — un placebo posé sur une constante que le moteur ne lit
jamais mesurerait un chaos nul et rendrait tout significatif :

`dirigeants.TEMPERAMENTS.batisseur.fisc`, `data.VOCATION_BIOME.friche.paysan`, `data.BIOMES.relais.cout`, `data.VOCATION_STYLE.commune.paysan`, `notables.CARACTERES.ambitieux.rendement`, `climat.METEO.couvert.rendement`, `economy.CAISSE.parTete`, `monnaie.MONNAIE.inertie`

| métrique | référence, par partie | plancher de bruit |
|---|---:|---:|
| population | 9649 | 7,7 % |
| villes debout | 86 | 4,6 % |
| villes nourries | 65 | 4,9 % |
| villes affamées | 14 | 32,5 % |
| factions écrasées | 0,17 | 16,7 % |
| guerres | 3,50 | 38,1 % |
| convois | 3109 | 7,3 % |
| accords | 3,50 | 28,6 % |
| bourses | 5,83 | 2,9 % |
| villes endettées | 57 | 12,0 % |
| dette totale | 30484 | 23,8 % |
| villes cédées | 7,83 | 19,1 % |
| masse monétaire | 425728 | 2,3 % |
| argent des ménages | 54280 | 10,6 % |
| argent des trésors | 311028 | 0,5 % |

Les valeurs sont **par partie**, moyennées sur les graines — le banc, lui,
additionne les six. Une métrique qui vaut moins de 1 par partie se compare en
unités et non en pour cent : « une faction écrasée de plus » veut dire quelque
chose, « +500 % de factions écrasées » ne veut rien dire. Les élasticités de ces
métriques-là sont énormes par construction et ne se lisent pas comme les autres ;
elles désignent une piste, elles ne la prouvent pas. **Toute trouvaille sur une
petite métrique se confirme par un balayage direct** (`--balaye`) avant d'être
tenue pour acquise.

Un plancher élevé n'est pas un défaut de l'instrument : c'est une propriété
du monde. Les factions écrasées se comptent sur les doigts d'une main — une
de plus ou de moins, et le pourcentage saute. Ces métriques-là exigent
beaucoup avant qu'on puisse conclure, et c'est justement ce qu'il fallait
savoir avant de prétendre les régler.

## Ce que chaque métrique commande — les leviers, par métrique

### population

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.MENAGES.parTete` | 3 | -26,3 % | 10,9 % | 0,27 |  |
| `data.VOCATION_STYLE.corpo.milicien` | 0.5 | -21,3 % | -14,2 % | -0,36 |  |
| `data.BIOMES.plastique.yields.polymere` | 1.2 | -20,7 % | — | 0,69 | ne pousse que d'un côté |
| `climat.SAISONS.accalmie.mineral` | 1 | -18,8 % | -12,5 % | -0,31 |  |
| `dirigeants.TEMPERAMENTS.prudent.severite` | 1.05 | -17,9 % | — | 0,60 | ne pousse que d'un côté |
| `lois.REGIMES.domaine.palier` | 1 | -17,9 % | — | 0,60 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.canyons.paysan` | 0.5 | -17,5 % | -8,0 % | -0,20 |  |
| `monnaie.MONNAIE.coursMin` | 0.4 | -17,0 % | — | 0,57 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | -11,9 % | 22,4 % | 0,56 |  |
| `data.VOCATION_STYLE.criminel.milicien` | 0.8 | -16,6 % | -8,1 % | -0,20 |  |
| `dirigeants.TEMPERAMENTS.batisseur.expansion` | 1.9 | -16,6 % | — | 0,55 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.friche.paysan` | 0.6 | -16,5 % | -8,2 % | -0,21 |  |
| … | | | | | 151 autres |

### villes debout

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | — | -14,9 % | -0,37 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.corpo.milicien` | 0.5 | -10,8 % | — | 0,36 | ne pousse que d'un côté |
| `data.BIOMES.plastique.yields.polymere` | 1.2 | -9,9 % | — | 0,33 | ne pousse que d'un côté |
| `climat.SAISONS.accalmie.mineral` | 1 | -9,5 % | — | 0,32 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | 5,0 % | -12,4 % | -0,31 |  |
| `data.VOCATION_BIOME.dalles.artisan` | 1.6 | -9,1 % | -7,5 % | -0,19 |  |
| `economy.SUREXTENSION.parCase` | 0.00001 | -7,9 % | — | 0,26 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.conciliateur.colonne` | 0.8 | -6,6 % | -10,4 % | -0,26 |  |
| `dirigeants.TEMPERAMENTS.prudent.severite` | 1.05 | -7,7 % | — | 0,26 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.steppe.ferrailleur` | 1.6 | — | -10,1 % | -0,25 | ne pousse que d'un côté |
| `climat.SAISONS.accalmie.aleas` | 0.85 | -7,5 % | — | 0,25 | ne pousse que d'un côté |
| `data.BIOMES.canyons.yields.alliage` | 0.08 | -7,5 % | -8,9 % | -0,22 |  |
| … | | | | | 89 autres |

### villes nourries

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `dirigeants.TEMPERAMENTS.batisseur.guerre` | 0.6 | 14,5 % | 5,9 % | 0,15 |  |
| `monnaie.MONNAIE.coursMin` | 0.4 | 13,4 % | -7,5 % | -0,19 |  |
| `data.MENAGES.parTete` | 3 | 12,4 % | -5,9 % | -0,15 |  |
| `data.VOCATION_STYLE.commune.paysan` | 1.8 | 12,1 % | — | -0,40 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.batisseur.severite` | 0.95 | 11,9 % | — | -0,40 | ne pousse que d'un côté |
| `data.COMMODITIES.medkit.prix` | 45 | 5,4 % | 15,8 % | 0,39 |  |
| `data.BIOMES.marais.cout` | 6 | 11,6 % | — | -0,39 | ne pousse que d'un côté |
| `data.FACTIONS.ombrelle.agression` | 0.52 | 11,6 % | — | -0,39 | ne pousse que d'un côté |
| `climat.SAISONS.seche.vivant` | 0.82 | 11,4 % | — | -0,38 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | 11,4 % | — | -0,38 | ne pousse que d'un côté |
| `data.BIOMES.friche.yields.ferraille` | 0.35 | 11,1 % | 6,7 % | 0,17 |  |
| `data.POIDS_BASE.marchand` | 0.35 | 10,9 % | 6,7 % | 0,17 |  |
| … | | | | | 140 autres |

### villes affamées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.partDuTresor` | 0.01 | -75,9 % | — | 2,53 | ne pousse que d'un côté |
| `data.BIOMES.plastique.cout` | 7 | -69,9 % | -41,0 % | -1,02 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | -66,3 % | -47,0 % | -1,17 |  |
| `dirigeants.TEMPERAMENTS.batisseur.severite` | 0.95 | -63,9 % | — | 2,13 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | -62,7 % | — | 2,09 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.methodique.colonne` | 1.3 | -62,7 % | -33,7 % | -0,84 |  |
| `notables.CARACTERES.fatigue.ordre` | -0.05 | -62,7 % | -54,2 % | -1,36 |  |
| `data.COMMODITIES.minerai.prix` | 5 | -61,4 % | -62,7 % | -1,57 |  |
| `dirigeants.TEMPERAMENTS.conquerant.colonne` | 1.25 | -61,4 % | — | 2,05 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.plastique.artisan` | 1.4 | -60,2 % | — | 2,01 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | -60,2 % | -51,8 % | -1,30 |  |
| `lois.REGIMES.domaine.palier` | 1 | -60,2 % | — | 2,01 | ne pousse que d'un côté |
| … | | | | | 147 autres |

### factions écrasées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `climat.SAISONS.accalmie.vivant` | 1.1 | 66,7 % | — | -13,33 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | — | 83,3 % | 12,50 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.canyons.paysan` | 0.5 | 33,3 % | 66,7 % | 10,00 |  |
| `data.VOCATION_STYLE.corpo.artisan` | 1.4 | — | 66,7 % | 10,00 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | 66,7 % | 10,00 | ne pousse que d'un côté |
| `climat.SAISONS.accalmie.mineral` | 1 | 50,0 % | — | -10,00 | ne pousse que d'un côté |
| `climat.SAISONS.seche.mineral` | 1.2 | 50,0 % | — | -10,00 | ne pousse que d'un côté |
| `data.BIOMES.desert.yields.minerai` | 0.5 | 50,0 % | — | -10,00 | ne pousse que d'un côté |
| `data.BIOMES.canyons.cout` | 6 | 50,0 % | — | -10,00 | ne pousse que d'un côté |
| `data.BIOMES.plastique.yields.polymere` | 1.2 | 50,0 % | — | -10,00 | ne pousse que d'un côté |
| `data.POIDS_BASE.paysan` | 0.35 | 50,0 % | 33,3 % | 5,00 |  |
| `data.VOCATION_STYLE.corpo.milicien` | 0.5 | 50,0 % | — | -10,00 | ne pousse que d'un côté |
| … | | | | | 62 autres |

### guerres

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.BIOMES.marais.danger` | 0.04 | -57,1 % | — | 1,90 | ne pousse que d'un côté |
| `data.BIOMES.brulees.danger` | 0.052 | -52,4 % | -52,4 % | -1,31 |  |
| `data.BODY_PARTS.tete.pv` | 30 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `data.BODY_PARTS.torse.pv` | 70 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `economy.FERTILITE.plastique` | 0.75 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `notables.CARACTERES.bonhomme.ordre` | -0.03 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.canyons.paysan` | 0.5 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `economy.CAISSE.grogneImpayes` | 0.0025 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `notables.CARACTERES.meticuleux.ordre` | 0.05 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.plastique.paysan` | 0.6 | — | -57,1 % | -1,43 | ne pousse que d'un côté |
| `climat.SAISONS.accalmie.vivant` | 1.1 | -42,9 % | -47,6 % | -1,19 |  |
| … | | | | | 16 autres |

### convois

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `dirigeants.TEMPERAMENTS.conquerant.colonne` | 1.25 | 22,4 % | 12,1 % | 0,30 |  |
| `climat.METEO.brouillard.rendement` | 0.85 | -21,7 % | 8,9 % | 0,22 |  |
| `data.BIOMES.marais.cout` | 6 | 21,5 % | — | -0,72 | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | -21,4 % | — | 0,71 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | 20,9 % | 10,1 % | 0,25 |  |
| `data.VOCATION_BIOME.brulees.paysan` | 0.5 | 20,2 % | — | -0,67 | ne pousse que d'un côté |
| `notables.CARACTERES.fatigue.ordre` | -0.05 | 19,9 % | — | -0,66 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.dalles.paysan` | 0.9 | 18,9 % | — | -0,63 | ne pousse que d'un côté |
| `data.BIOMES.friche.danger` | 0.028 | 18,6 % | 7,3 % | 0,18 |  |
| `data.VOCATION_BIOME.steppe.ferrailleur` | 1.6 | -17,7 % | — | 0,59 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | -22,8 % | -0,57 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.methodique.treve` | 1 | 16,8 % | — | -0,56 | ne pousse que d'un côté |
| … | | | | | 136 autres |

### accords

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.partDuTresor` | 0.01 | -76,2 % | — | 2,54 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.nomade.milicien` | 0.4 | -57,1 % | -42,9 % | -1,07 |  |
| `data.VOCATION_BIOME.steppe.mineur` | 0.8 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `data.BIOMES.friche.yields.isotope` | 0.42 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `data.BIOMES.marais.cout` | 6 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.brulees.paysan` | 0.5 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.prudent.fisc` | 0.9 | -47,6 % | -33,3 % | -0,83 |  |
| `economy.SUREXTENSION.parCase` | 0.00001 | -47,6 % | -38,1 % | -0,95 |  |
| `data.COMMODITIES.rations.prix` | 9 | -38,1 % | -61,9 % | -1,55 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | — | -61,9 % | -1,55 | ne pousse que d'un côté |
| `data.BIOMES.brulees.cout` | 5 | — | -57,1 % | -1,43 | ne pousse que d'un côté |
| … | | | | | 82 autres |

### bourses

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `notables.CARACTERES.fatigue.ordre` | -0.05 | -11,4 % | -5,7 % | -0,14 |  |
| `climat.SAISONS.seche.mineral` | 1.2 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `data.BIOMES.plastique.cout` | 7 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.brulees.ferrailleur` | 1.4 | -8,6 % | 2,9 % | 0,07 |  |
| `data.VOCATION_STYLE.corpo.milicien` | 0.5 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.commune.medecin` | 0.5 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.methodique.colonne` | 1.3 | -8,6 % | -5,7 % | -0,14 |  |
| `economy.FERTILITE.marais` | 1.45 | -8,6 % | 2,9 % | 0,07 |  |
| `economy.FERTILITE.dalles` | 0.95 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parVille` | 0.00005 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `monnaie.CHANGE.remiseTaille` | 0.25 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| … | | | | | 143 autres |

### villes endettées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | — | -20,5 % | -0,51 | ne pousse que d'un côté |
| `credit.CREDIT.seuilDetresse` | 0.9 | -14,6 % | — | 0,49 | ne pousse que d'un côté |
| `data.BIOMES.plastique.yields.polymere` | 1.2 | -13,2 % | — | 0,44 | ne pousse que d'un côté |
| `data.COMMODITIES.ferraille.prix` | 3 | -12,9 % | — | 0,43 | ne pousse que d'un côté |
| `data.BODY_PARTS.torse.poids` | 0.38 | -12,6 % | — | 0,42 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | -14,6 % | -0,37 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.prudent.humain` | 1.05 | — | -13,2 % | -0,33 | ne pousse que d'un côté |
| `data.BIOMES.friche.danger` | 0.028 | — | -12,3 % | -0,31 | ne pousse que d'un côté |

### dette totale

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.VOCATION_BIOME.plastique.paysan` | 0.6 | 87,9 % | — | -2,93 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.brulees.paysan` | 0.5 | 69,9 % | — | -2,33 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | — | 85,0 % | 2,13 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.methodique.fisc` | 1.05 | — | 84,4 % | 2,11 | ne pousse que d'un côté |
| `data.BODY_PARTS.tete.pv` | 30 | 58,8 % | 68,4 % | 1,71 |  |
| `data.BIOMES.desert.danger` | 0.022 | 56,8 % | — | -1,89 | ne pousse que d'un côté |
| `data.POIDS_BASE.paysan` | 0.35 | 56,6 % | — | -1,89 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.rancunier.guerre` | 1.3 | 55,3 % | 39,3 % | 0,98 |  |
| `data.POIDS_BASE.cantinier` | 0.11 | 53,8 % | — | -1,79 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.prudent.guerre` | 0.45 | — | 71,4 % | 1,79 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | 53,5 % | -24,7 % | -0,62 |  |
| `dirigeants.TEMPERAMENTS.conciliateur.treve` | 1.9 | 52,7 % | — | -1,76 | ne pousse que d'un côté |
| … | | | | | 98 autres |

### villes cédées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.BIOMES.desert.yields.minerai` | 0.5 | -57,4 % | — | 1,91 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | -55,3 % | — | 1,84 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.batisseur.fisc` | 1.15 | -51,1 % | — | 1,70 | ne pousse que d'un côté |
| `data.BIOMES.friche.yields.isotope` | 0.42 | -46,8 % | -25,5 % | -0,64 |  |
| `data.POIDS_BASE.marchand` | 0.35 | -44,7 % | — | 1,49 | ne pousse que d'un côté |
| `climat.SAISONS.accalmie.rencontres` | 1 | -42,6 % | — | 1,42 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.nomade.mineur` | 0.6 | -42,6 % | — | 1,42 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.plastique.paysan` | 0.6 | 40,4 % | 21,3 % | 0,53 |  |
| `dirigeants.TEMPERAMENTS.methodique.colonne` | 1.3 | -40,4 % | — | 1,35 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parVille` | 0.00005 | -40,4 % | — | 1,35 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | 38,3 % | 23,4 % | 0,59 |  |
| `economy.FERTILITE.marais` | 1.45 | -38,3 % | — | 1,28 | ne pousse que d'un côté |
| … | | | | | 100 autres |

### masse monétaire

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `dirigeants.TEMPERAMENTS.batisseur.fisc` | 1.15 | — | 92,1 % | 2,30 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | 56,9 % | -5,4 % | -0,13 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.friche.paysan` | 0.6 | 2,3 % | 67,8 % | 1,70 | ne pousse que d'un côté |
| `data.BIOMES.relais.cout` | 6 | -5,4 % | 65,9 % | 1,65 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.commune.paysan` | 1.8 | 17,7 % | 49,2 % | 1,23 |  |
| `economy.CAISSE.parTete` | 12 | -25,9 % | 34,4 % | 0,86 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | — | -29,5 % | -0,74 | ne pousse que d'un côté |
| `monnaie.MONNAIE.coursMin` | 0.4 | 9,0 % | -21,2 % | -0,53 |  |
| `economy.CAISSE.partSalariale` | 0.55 | 5,5 % | -20,4 % | -0,51 |  |
| `notables.CARACTERES.fatigue.rendement` | -0.08 | 14,7 % | — | -0,49 | ne pousse que d'un côté |
| `data.BIOMES.marais.danger` | 0.04 | 4,0 % | 18,0 % | 0,45 |  |
| `data.VOCATION_STYLE.corpo.milicien` | 0.5 | -12,2 % | -7,9 % | -0,20 |  |
| … | | | | | 206 autres |

### argent des ménages

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `dirigeants.TEMPERAMENTS.batisseur.fisc` | 1.15 | 11,6 % | 748,1 % | 18,70 | ne pousse que d'un côté |
| `data.VOCATION_BIOME.friche.paysan` | 0.6 | -16,7 % | 511,3 % | 12,78 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | 380,1 % | -12,0 % | -0,30 | ne pousse que d'un côté |
| `data.BIOMES.relais.cout` | 6 | — | 506,1 % | 12,65 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.commune.paysan` | 1.8 | 92,1 % | 352,9 % | 8,82 |  |
| `dirigeants.TEMPERAMENTS.conciliateur.fisc` | 0.75 | — | 152,6 % | 3,81 | ne pousse que d'un côté |
| `credit.CESSION.primeMax` | 4 | 93,1 % | — | -3,10 | ne pousse que d'un côté |
| `dirigeants.TEMPERAMENTS.methodique.humain` | 1 | — | 120,7 % | 3,02 | ne pousse que d'un côté |
| `notables.CARACTERES.ambitieux.rendement` | 0.06 | 20,2 % | 112,6 % | 2,82 | ne pousse que d'un côté |
| `data.VOCATION_STYLE.commune.medecin` | 0.5 | — | 96,3 % | 2,41 | ne pousse que d'un côté |
| `data.BIOMES.marais.danger` | 0.04 | — | 91,6 % | 2,29 | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | 65,8 % | — | -2,19 | ne pousse que d'un côté |
| … | | | | | 198 autres |

### argent des trésors

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | 5,6 % | -40,0 % | -1,00 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | 7,5 % | -34,5 % | -0,86 |  |
| `economy.CAISSE.parTete` | 12 | -23,5 % | 29,0 % | 0,73 |  |
| `monnaie.MONNAIE.coursMin` | 0.4 | 16,6 % | -31,2 % | -0,78 |  |
| `data.VOCATION_BIOME.canyons.paysan` | 0.5 | 13,9 % | -11,8 % | -0,29 |  |
| `dirigeants.TEMPERAMENTS.rancunier.guerre` | 1.3 | -13,3 % | -4,9 % | -0,12 |  |
| `notables.CARACTERES.fatigue.rendement` | -0.08 | 13,3 % | 1,2 % | 0,03 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | 13,2 % | -4,0 % | -0,10 |  |
| `dirigeants.TEMPERAMENTS.prudent.guerre` | 0.45 | -12,7 % | -6,5 % | -0,16 |  |
| `data.VOCATION_BIOME.desert.ferrailleur` | 1 | -11,5 % | -1,7 % | -0,04 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | 10,7 % | -8,3 % | -0,21 |  |
| `data.BIOMES.dalles.yields.ferraille` | 1 | -10,7 % | 2,4 % | 0,06 |  |
| … | | | | | 274 autres |

## Les leviers vivants, par force

| levier | valeur | ce qu'il commande |
|---|---:|---|
| `dirigeants.TEMPERAMENTS.batisseur.fisc` | 1.15 | argent des ménages 18,70, factions écrasées 5,00, masse monétaire 2,30, villes cédées 1,70 |
| `climat.SAISONS.accalmie.vivant` | 1.1 | factions écrasées -13,33, guerres -1,19, accords 1,27, villes affamées -1,27 |
| `data.VOCATION_BIOME.friche.paysan` | 0.6 | argent des ménages 12,78, factions écrasées -6,67, villes affamées -1,14, masse monétaire 1,70 |
| `data.POIDS_BASE.cantinier` | 0.11 | argent des ménages -0,30, masse monétaire -0,13, dette totale -1,79, guerres 1,59 |
| `data.BIOMES.relais.cout` | 6 | argent des ménages 12,65, masse monétaire 1,65, dette totale 1,31, convois -0,20 |
| `monnaie.MONNAIE.inertie` | 0.7 | factions écrasées 12,50, villes affamées -1,17, accords -1,55, argent des ménages 1,20 |
| `data.VOCATION_BIOME.canyons.paysan` | 0.5 | factions écrasées 10,00, guerres 1,59, accords -1,07, villes affamées -1,02 |
| `data.VOCATION_STYLE.corpo.artisan` | 1.4 | factions écrasées 10,00, villes affamées 1,24, argent des ménages -0,97, villes nourries -0,32 |
| `economy.CAISSE.partSalariale` | 0.55 | factions écrasées 10,00, argent des ménages 1,66, dette totale 1,07, accords -1,19 |
| `climat.SAISONS.accalmie.mineral` | 1 | factions écrasées -10,00, villes affamées -1,39, dette totale -0,99, accords -0,95 |
| `climat.SAISONS.seche.mineral` | 1.2 | factions écrasées -10,00, villes affamées 1,49, bourses 0,29, population 0,26 |
| `data.BIOMES.desert.yields.minerai` | 0.5 | factions écrasées -10,00, villes cédées 1,91, villes affamées 1,29, dette totale 1,01 |
| `data.BIOMES.canyons.cout` | 6 | factions écrasées -10,00, dette totale -1,49, argent des ménages -0,34, villes cédées -0,71 |
| `data.BIOMES.plastique.yields.polymere` | 1.2 | factions écrasées -10,00, villes affamées -1,02, villes cédées -0,85, argent des ménages 0,78 |
| `data.POIDS_BASE.paysan` | 0.35 | factions écrasées 5,00, dette totale -1,89, accords -1,19, villes affamées -0,87 |
| `data.VOCATION_STYLE.corpo.milicien` | 0.5 | factions écrasées -10,00, villes affamées 1,49, villes cédées 1,21, argent des ménages 1,00 |
| `dirigeants.TEMPERAMENTS.prudent.severite` | 1.05 | factions écrasées -10,00, villes affamées -1,30, argent des ménages -0,45, dette totale 0,75 |
| `dirigeants.TEMPERAMENTS.batisseur.expansion` | 1.9 | factions écrasées -10,00, villes affamées 1,29, argent des ménages -1,25, dette totale -0,95 |
| `dirigeants.TEMPERAMENTS.methodique.colonne` | 1.3 | factions écrasées -10,00, villes affamées -0,84, accords 1,43, villes cédées 1,35 |
| `services.BESOINS.medecin.seuil` | 0.012 | factions écrasées -10,00, villes affamées -0,99, dette totale 0,90, villes cédées 0,59 |
| `data.VOCATION_STYLE.commune.paysan` | 1.8 | argent des ménages 8,82, villes affamées -1,11, masse monétaire 1,23, accords 1,11 |
| `data.BIOMES.canyons.yields.alliage` | 0.08 | factions écrasées 7,50, villes affamées -0,96, population 0,33, villes debout -0,22 |
| `data.BIOMES.marais.yields.biomasse` | 1 | factions écrasées 7,50, dette totale 0,72, villes affamées -0,99, accords -1,07 |
| `data.BIOMES.brulees.yields.minerai` | 0.4 | factions écrasées 7,50, convois -0,36, villes debout -0,19, villes nourries -0,17 |
| `data.PALIERS_ITEM.pompe` | 2 | factions écrasées 7,50, villes affamées -0,84, dette totale 0,72, villes debout -0,13 |
| `data.PALIERS_ITEM.rail` | 3 | factions écrasées 7,50, villes affamées -1,78, accords -1,31, argent des ménages -0,75 |
| `data.PALIERS_ITEM.exo` | 3 | factions écrasées 7,50, villes affamées -1,78, accords -1,31, argent des ménages -0,75 |
| `data.PALIERS_ITEM.oeil_optique` | 3 | factions écrasées 7,50, villes affamées -1,78, accords -1,31, argent des ménages -0,75 |
| `data.PALIERS_ITEM.coeur_synth` | 3 | factions écrasées 7,50, villes affamées -1,78, accords -1,31, argent des ménages -0,75 |
| `data.VOCATION_BIOME.steppe.ferrailleur` | 1.6 | factions écrasées 7,50, villes affamées -1,36, argent des ménages -0,73, convois 0,59 |
| `data.VOCATION_BIOME.dalles.artisan` | 1.6 | factions écrasées 7,50, villes affamées 1,97, argent des ménages 0,76, population -0,23 |
| `data.VOCATION_BIOME.desert.ferrailleur` | 1 | factions écrasées 7,50, villes affamées -1,36, dette totale 0,96, accords -0,95 |
| `data.VOCATION_STYLE.militaire.milicien` | 2.2 | factions écrasées 7,50, villes affamées -1,27, villes cédées -0,53, population 0,45 |
| `economy.FERTILITE.friche` | 0.7 | factions écrasées 7,50, guerres -1,07, dette totale 0,94, villes cédées 0,74 |
| `economy.FERTILITE.brulees` | 0.6 | factions écrasées 7,50, villes affamées 1,85, dette totale -0,90, argent des ménages 0,57 |
| `factions.ETAT.parMur` | 0.05 | factions écrasées 7,50, argent des ménages -0,65, convois 0,39, population 0,28 |
| `monnaie.MONNAIE.primeConfiance` | 3.75 | factions écrasées 7,50, dette totale -0,86, population -0,20, villes debout -0,21 |
| `data.BIOMES.canyons.yields.minerai` | 1 | factions écrasées -6,67, villes affamées -0,87, accords 1,11, dette totale 0,86 |
| `data.BIOMES.marais.cout` | 6 | factions écrasées 5,00, villes affamées 1,89, accords 1,59, villes cédées 0,92 |
| `data.BODY_PARTS.tete.pv` | 30 | factions écrasées -6,67, dette totale 1,71, guerres 1,75, argent des ménages -0,30 |
| `data.BODY_PARTS.tete.poids` | 0.1 | factions écrasées 5,00, guerres 1,43, dette totale 0,66, argent des ménages -0,30 |
| `data.BODY_PARTS.torse.poids` | 0.38 | factions écrasées -6,67, guerres -1,31, dette totale 1,10, villes cédées 0,59 |
| `data.FACTIONS.hexa.agression` | 0.42 | factions écrasées -6,67, villes affamées 1,41, dette totale 0,60, argent des ménages -0,32 |
| `data.POIDS_BASE.milicien` | 0.35 | factions écrasées -6,67, villes affamées -0,87, convois 0,39, villes nourries 0,26 |
| `data.VOCATION_BIOME.steppe.mineur` | 0.8 | factions écrasées 5,00, accords 1,75, villes affamées -0,87, argent des ménages -0,51 |
| `data.VOCATION_BIOME.desert.mineur` | 3 | factions écrasées -6,67, dette totale -1,56, accords 1,27, villes affamées -0,90 |
| `data.VOCATION_BIOME.friche.mineur` | 1.8 | factions écrasées -6,67, villes affamées -1,69, accords -1,19, argent des ménages -0,75 |
| `data.VOCATION_BIOME.plastique.paysan` | 0.6 | factions écrasées -6,67, dette totale -2,93, guerres -1,43, villes affamées 1,41 |
| `dirigeants.TEMPERAMENTS.conquerant.guerre` | 1.6 | factions écrasées -6,67, accords -1,11, argent des ménages -0,69, convois 0,44 |
| `dirigeants.TEMPERAMENTS.prudent.expansion` | 1.1 | factions écrasées -6,67, villes affamées 1,16, argent des ménages -0,30, convois -0,42 |
| `dirigeants.TEMPERAMENTS.methodique.humain` | 1 | factions écrasées -6,67, argent des ménages 3,02, villes affamées 1,49, villes cédées -0,64 |
| `economy.FERTILITE.desert` | 0.65 | factions écrasées -6,67, argent des ménages -1,73, accords 1,11, villes affamées -1,08 |
| `economy.SUREXTENSION.parCase` | 0.00001 | factions écrasées -6,67, villes affamées -1,30, dette totale -0,62, accords -0,95 |
| `lois.REGIMES.domaine.palier` | 1 | factions écrasées -6,67, villes affamées 2,01, accords 1,27, villes cédées 0,92 |
| `climat.METEO.clair.rencontres` | 1 | factions écrasées 5,00, dette totale 0,73, argent des ménages -0,34, convois -0,21 |
| `climat.SAISONS.accalmie.rencontres` | 1 | factions écrasées 5,00, villes affamées -1,20, villes cédées 1,42, accords -1,07 |
| `credit.CREDIT.grogneDefaut` | 0.25 | factions écrasées 5,00, villes affamées -0,96, accords -0,83, argent des ménages 0,88 |
| `data.BIOMES.steppe.yields.biomasse` | 0.4 | factions écrasées 5,00, accords 1,27, argent des ménages 1,16, convois -0,26 |
| `data.BIOMES.friche.yields.ferraille` | 0.35 | factions écrasées 5,00, villes affamées -1,11, dette totale 0,64, argent des ménages -0,60 |
| `data.BIOMES.desert.danger` | 0.022 | factions écrasées 5,00, dette totale -1,89, argent des ménages -0,55, population -0,30 |
| `data.BIOMES.plastique.yields.carburant` | 0.28 | factions écrasées 5,00, villes affamées -1,20, argent des ménages -0,28, convois 0,25 |
| `data.BODY_PARTS.brasG.poids` | 0.13 | factions écrasées 5,00, guerres -1,07, argent des ménages -0,66, convois 0,34 |
| `data.BODY_PARTS.brasD.poids` | 0.13 | factions écrasées 5,00, argent des ménages -0,66, convois 0,51, argent des trésors -0,05 |
| `data.COMMODITIES.biomasse.prix` | 4 | factions écrasées 5,00, villes affamées 1,77, dette totale 1,58, accords 1,43 |
| `data.COMMODITIES.medkit.prix` | 45 | factions écrasées 5,00, villes affamées -1,45, guerres 1,43, argent des ménages -0,92 |
| `data.PALIERS_ITEM.plaque` | 1 | factions écrasées 5,00, accords -1,07, argent des trésors -0,22, masse monétaire -0,18 |
| `data.PALIERS_ITEM.katana` | 2 | factions écrasées 5,00, villes cédées -0,53, argent des ménages 0,34, population -0,22 |
| `data.PALIERS_ITEM.masse` | 3 | factions écrasées 5,00, villes cédées -0,96, villes affamées -0,90, population -0,42 |
| `data.POIDS_BASE.marchand` | 0.35 | factions écrasées 5,00, villes affamées -1,20, villes cédées 1,49, accords -1,07 |
| `data.VOCATION_BIOME.plastique.ferrailleur` | 3.6 | factions écrasées 5,00, accords 1,11, villes cédées -0,78, argent des trésors 0,22 |
| `data.VOCATION_BIOME.brulees.ferrailleur` | 1.4 | factions écrasées 5,00, dette totale -1,19, argent des ménages -0,31, bourses 0,07 |
| `dirigeants.TEMPERAMENTS.conciliateur.colonne` | 0.8 | factions écrasées 5,00, villes affamées -1,11, villes cédées 0,78, argent des ménages -0,61 |
| `dirigeants.TEMPERAMENTS.rapace.fisc` | 1.55 | factions écrasées 5,00, villes affamées -0,84, villes cédées 0,78, argent des ménages -0,49 |
| `economy.CAISSE.grogneImpayes` | 0.0025 | factions écrasées 5,00, guerres 1,59, accords 1,27, argent des ménages -0,63 |
| `economy.FERTILITE.steppe` | 1.15 | factions écrasées 5,00, dette totale -1,27, villes affamées -1,23, accords -1,07 |
| `notables.CARACTERES.retors.ordre` | -0.02 | factions écrasées 5,00, villes affamées 1,77, accords 1,43, dette totale 1,14 |
| `services.BESOINS.armurier.seuil` | 0.05 | factions écrasées 5,00, accords -0,95, villes affamées -1,14, argent des ménages 1,09 |
| `dirigeants.TEMPERAMENTS.conciliateur.fisc` | 0.75 | argent des ménages 3,81, masse monétaire 0,37, argent des trésors -0,16 |
| `credit.CESSION.primeMax` | 4 | argent des ménages -3,10, masse monétaire -0,37, bourses -0,10, argent des trésors 0,02 |
| `notables.CARACTERES.ambitieux.rendement` | 0.06 | argent des ménages 2,82, villes affamées -0,93, accords 1,27, villes cédées 0,71 |
| `credit.CREDIT.partDuTresor` | 0.01 | accords 2,54, villes affamées 2,53, villes cédées 1,84, argent des ménages 1,33 |
| `data.VOCATION_STYLE.commune.medecin` | 0.5 | argent des ménages 2,41, dette totale -1,44, villes cédées -0,90, bourses 0,29 |
| `data.VOCATION_BIOME.brulees.paysan` | 0.5 | dette totale -2,33, accords 1,59, villes affamées -1,36, argent des ménages -0,71 |
| `data.BIOMES.plastique.cout` | 7 | villes affamées -1,02, argent des ménages -0,59, bourses 0,29, villes debout 0,25 |
| `data.BIOMES.marais.danger` | 0.04 | argent des ménages 2,29, guerres 1,90, villes affamées 1,53, accords 1,11 |
| `data.POIDS_BASE.medecin` | 0.35 | argent des ménages -2,19, dette totale -1,24, villes affamées -1,17, villes cédées -0,74 |
| `climat.METEO.couvert.rendement` | 1 | argent des ménages 2,13, accords -1,19, villes affamées 1,16, dette totale 0,67 |
| `dirigeants.TEMPERAMENTS.batisseur.severite` | 0.95 | villes affamées 2,13, accords 1,27, argent des ménages 0,32, dette totale 0,98 |
| `economy.CAISSE.parTete` | 12 | dette totale 2,13, accords 1,75, villes affamées 1,49, argent des ménages 1,43 |
| `dirigeants.TEMPERAMENTS.methodique.fisc` | 1.05 | dette totale 2,11, villes affamées -1,08, villes cédées 0,96, population -0,39 |
| `data.MENAGES.parTete` | 3 | villes affamées 2,09, argent des ménages 1,50, villes cédées 0,80, population 0,27 |
| `notables.CARACTERES.fatigue.ordre` | -0.05 | villes affamées -1,36, accords -0,95, villes cédées -0,59, argent des ménages -0,71 |
| `data.COMMODITIES.minerai.prix` | 5 | villes affamées -1,57, accords 1,11, argent des ménages -0,98, dette totale -0,95 |
| `dirigeants.TEMPERAMENTS.conquerant.colonne` | 1.25 | villes affamées 2,05, accords 1,43, argent des ménages -0,27, convois 0,30 |
| `notables.CARACTERES.droit.ordre` | 0.04 | argent des ménages 2,03, dette totale -1,07, villes affamées -0,84, argent des trésors 0,33 |
| `data.VOCATION_BIOME.plastique.artisan` | 1.4 | villes affamées 2,01, accords 1,27, villes cédées -0,80, argent des ménages 0,80 |
| `data.VOCATION_STYLE.nomade.milicien` | 0.4 | accords -1,07, villes affamées 1,45, dette totale 1,01, villes cédées 0,78 |
| `data.BODY_PARTS.torse.pv` | 70 | villes affamées 1,89, guerres 1,75, argent des ménages 1,12, population -0,23 |
| `dirigeants.TEMPERAMENTS.batisseur.guerre` | 0.6 | villes affamées 1,89, argent des ménages 0,81, convois 0,44, villes nourries 0,15 |
| `monnaie.MONNAIE.coursMin` | 0.4 | villes affamées 1,85, accords -1,43, argent des trésors -0,78, argent des ménages 0,35 |
| `dirigeants.TEMPERAMENTS.rancunier.guerre` | 1.3 | dette totale 0,98, villes cédées -0,99, argent des trésors -0,12, masse monétaire -0,09 |
| `data.BIOMES.dalles.yields.composant` | 0.09 | villes affamées -0,93, villes cédées -0,53, argent des ménages -0,59, convois 0,26 |
| `data.FACTIONS.ombrelle.agression` | 0.52 | villes affamées 1,81, accords -0,83, argent des ménages 0,59, villes nourries -0,39 |
| `dirigeants.TEMPERAMENTS.prudent.guerre` | 0.45 | dette totale 1,79, accords -0,95, argent des ménages -0,61, convois 0,42 |
| `data.VOCATION_BIOME.marais.ferrailleur` | 1 | villes affamées 1,77, population -0,34, villes nourries -0,31, argent des ménages -0,29 |
| `dirigeants.TEMPERAMENTS.conciliateur.treve` | 1.9 | dette totale -1,76, population 0,28, convois -0,26, argent des trésors -0,16 |
| `data.BIOMES.brulees.danger` | 0.052 | guerres -1,31, accords -0,95, villes cédées -0,64, villes affamées -0,84 |
| `economy.FERTILITE.plastique` | 0.75 | guerres 1,75, villes affamées -1,02, villes cédées 0,78, population 0,51 |
| `notables.CARACTERES.bonhomme.ordre` | -0.03 | guerres 1,75, villes affamées 1,37, accords -1,07, argent des ménages 0,31 |
| `data.BIOMES.friche.cout` | 4 | villes affamées 1,73, accords 1,27, dette totale 0,78, argent des ménages 0,90 |
| `data.BIOMES.friche.yields.isotope` | 0.42 | villes affamées -1,60, accords 1,59, villes cédées -0,64, argent des ménages -1,09 |
| `data.VOCATION_BIOME.brulees.mineur` | 2.4 | villes affamées 1,73, dette totale 0,89, accords -0,83, villes cédées -0,78 |
| `data.BIOMES.steppe.danger` | 0.014 | villes affamées -1,72, accords -0,83, population -0,42, convois 0,28 |
| `data.BIOMES.steppe.cout` | 3 | villes affamées -1,69, dette totale -1,23, argent des ménages -0,98, population -0,44 |
| `climat.SAISONS.seche.vivant` | 0.82 | villes affamées 1,69, accords 1,11, argent des ménages 0,53, dette totale 0,90 |
| `dirigeants.TEMPERAMENTS.conciliateur.severite` | 0.6 | villes affamées 1,69, accords 1,27, dette totale -0,85, argent des ménages 0,37 |
| `economy.SOLVABILITE.plancher` | 0.35 | villes affamées -1,36, villes cédées 0,99, dette totale -0,97, accords -0,83 |
| `climat.METEO.vent_cendre.rendement` | 0.75 | villes affamées -1,30, accords 1,27, dette totale -1,08, villes cédées -0,90 |
| `data.FACTIONS.cendre.agression` | 0.78 | villes affamées -1,11, argent des ménages -0,28, population -0,26, argent des trésors -0,07 |
| `data.VOCATION_BIOME.canyons.mineur` | 4.5 | villes affamées -0,87, argent des ménages 0,43, population -0,45, villes nourries -0,25 |
| `dirigeants.TEMPERAMENTS.conciliateur.guerre` | 0.5 | argent des ménages -1,64, dette totale 0,64, masse monétaire -0,40, argent des trésors 0,06 |
| `climat.METEO.brouillard.rendement` | 0.85 | villes affamées -1,63, villes cédées -1,01, argent des ménages -0,85, convois 0,22 |
| `data.POIDS_BASE.ouvrier` | 0.13 | villes affamées -1,60, accords -1,31, dette totale 1,21, argent des ménages -0,59 |
| `dirigeants.TEMPERAMENTS.prudent.fisc` | 0.9 | accords -0,83, dette totale 1,54, villes affamées 1,45, villes cédées 1,13 |
| `notables.CARACTERES.meticuleux.ordre` | 0.05 | guerres 1,59, convois 0,55, villes cédées 0,53, argent des ménages -0,31 |
| `climat.SAISONS.cendres.mineral` | 0.95 | dette totale 1,10, villes cédées -1,06, argent des ménages 0,30, population 0,41 |
| `data.COMMODITIES.rations.prix` | 9 | villes affamées -1,57, accords -1,55, argent des ménages -0,72, population -0,45 |
| `services.BESOINS.contremaitre.seuil` | 0.02 | villes affamées -1,57, villes cédées -1,12, accords -1,07, argent des ménages -0,33 |
| `climat.METEO.couvert.aleas` | 1 | villes affamées 1,57, accords 1,11, argent des ménages -0,39, villes cédées -0,53 |
| `data.COMMODITIES.alliage.prix` | 14 | villes affamées -1,20, dette totale -1,00, villes cédées -0,69, argent des ménages 0,66 |
| `data.POIDS_BASE.ferrailleur` | 0.35 | villes affamées -0,90, villes cédées -0,59, argent des ménages -0,37, population -0,36 |
| `data.BIOMES.dalles.yields.ferraille` | 1 | dette totale 1,54, argent des ménages -0,27, accords -1,19, convois 0,33 |
| `climat.METEO.canicule.rendement` | 0.8 | dette totale -1,53, argent des ménages 1,34, accords 1,27, villes affamées 1,14 |
| `climat.SAISONS.accalmie.aleas` | 0.85 | villes affamées 1,53, accords -0,95, argent des ménages -0,27, population -0,23 |
| `data.BIOMES.plastique.danger` | 0.03 | villes affamées 1,53, villes cédées 1,06, argent des ménages 0,75, villes nourries -0,32 |
| `notables.CARACTERES.fatigue.rendement` | -0.08 | argent des ménages -1,50, villes affamées 1,45, masse monétaire -0,49, argent des trésors 0,03 |
| `data.BIOMES.desert.yields.isotope` | 0.18 | dette totale -1,49, villes cédées -0,74, argent des ménages 0,82, argent des trésors -0,36 |
| `data.BIOMES.dalles.cout` | 3 | villes affamées 1,49, villes cédées 0,78, argent des trésors 0,03 |
| `data.PALIERS_ITEM.jambe_servo` | 3 | villes affamées -1,48, dette totale 1,30, argent des ménages -0,88, population -0,31 |
| `dirigeants.TEMPERAMENTS.methodique.severite` | 1 | villes affamées -1,48, dette totale 1,05, argent des ménages -0,78, villes cédées 0,71 |
| `data.VOCATION_BIOME.steppe.paysan` | 3 | argent des ménages 1,47, villes affamées 1,37, convois -0,43, population 0,27 |
| `data.PALIERS_ITEM.hachoir` | 1 | villes affamées -1,45, accords -1,07, villes cédées -0,80, argent des ménages 0,55 |
| `climat.METEO.orage_sec.rencontres` | 0.9 | villes affamées 1,45, villes cédées 0,92, argent des trésors 0,04 |
| `credit.CREDIT.seuilDetresse` | 0.9 | villes affamées 1,45, dette totale 1,11, accords 1,11, villes cédées -0,59 |
| `data.BIOMES.dalles.yields.polymere` | 0.55 | villes affamées -1,27, villes cédées 0,71, argent des ménages -0,35, convois 0,33 |
| `data.VOCATION_BIOME.dalles.ferrailleur` | 4 | villes affamées -1,17, accords -0,95, argent des ménages -0,41, population 0,36 |
| `data.BIOMES.desert.hazard.degats` | 4 | dette totale -1,44, argent des trésors 0,02, masse monétaire -0,12, bourses 0,07 |
| `data.BIOMES.brulees.cout` | 5 | accords -1,43, villes cédées 0,78, convois 0,37, villes nourries 0,14 |
| `data.VOCATION_BIOME.marais.paysan` | 4 | accords -1,43, villes affamées -0,93, dette totale -0,91, argent des ménages -0,76 |
| `notables.CARACTERES.droit.humeur` | 6 | guerres 1,43, villes affamées -0,87, argent des ménages -0,29, population -0,23 |
| `services.BESOINS.chef.seuil` | 0.5 | accords 1,43, villes cédées -0,99, dette totale -0,91, argent des ménages -0,64 |
| `data.VOCATION_STYLE.nomade.mineur` | 0.6 | villes cédées 1,42, villes nourries 0,24, bourses 0,19, masse monétaire -0,14 |
| `data.PALIERS_ITEM.arbalete` | 2 | villes affamées -1,42, accords -0,95, argent des ménages -0,49, bourses -0,21 |
| `data.PALIERS_ITEM.bras_hydro` | 3 | villes affamées -1,42, accords -1,07, villes cédées -0,74, argent des ménages -0,54 |
| `data.POIDS_BASE.mineur` | 0.35 | villes affamées -1,33, villes cédées -0,80, dette totale -1,00, argent des ménages -0,85 |
| `data.VOCATION_BIOME.friche.ferrailleur` | 2.4 | villes affamées 1,41, argent des ménages 1,38, villes cédées 1,13, convois -0,36 |
| `economy.SUREXTENSION.seuil` | 8 | villes affamées -0,93, accords 1,27, dette totale -1,15, argent des ménages -0,45 |
| `notables.CARACTERES.avare.ordre` | 0.01 | villes affamées 1,41, guerres -1,07, villes cédées -0,71, argent des ménages 0,60 |
| `data.VOCATION_STYLE.corpo.marchand` | 1.2 | villes affamées 1,37, dette totale -1,35, guerres -1,07, argent des ménages 0,49 |
| `economy.SUREXTENSION.parVille` | 0.00005 | villes cédées 1,35, villes affamées -1,05, convois -0,39, argent des ménages -0,38 |
| `factions.ETAT.parDefense` | 0.002 | dette totale -1,33, convois 0,42, villes nourries 0,25, population -0,20 |
| `data.COMMODITIES.carburant.prix` | 12 | villes affamées -1,33, dette totale 0,74, villes cédées -0,71, argent des ménages -0,56 |
| `factions.ETAT.parSoldat` | 0.03 | accords -1,31, villes affamées -1,27, dette totale 1,14, argent des ménages -0,56 |
| `dirigeants.TEMPERAMENTS.conciliateur.humain` | 1.35 | villes affamées -1,30, accords -1,07, argent des ménages -0,39, villes nourries 0,19 |
| `monnaie.CHANGE.ecartBase` | 0.12 | villes affamées -1,30, villes cédées -0,80, argent des ménages -0,61, convois 0,34 |
| `notables.CARACTERES.ambitieux.ordre` | 0.03 | villes affamées -1,30, argent des ménages -0,72, population -0,35, villes nourries 0,16 |
| `data.VOCATION_BIOME.canyons.artisan` | 1.2 | villes affamées 1,29, argent des ménages 0,76, dette totale 0,66, population 0,34 |
| `data.BIOMES.canyons.danger` | 0.036 | argent des ménages 0,41, villes affamées 1,20, dette totale 0,61, masse monétaire -0,25 |
| `economy.FERTILITE.marais` | 1.45 | villes cédées 1,28, dette totale 0,82, argent des ménages -0,39, bourses 0,07 |
| `data.VOCATION_STYLE.militaire.artisan` | 0.5 | dette totale -1,27, villes affamées -1,17, villes cédées -0,85, convois 0,26 |
| `climat.METEO.clair.rendement` | 1 | villes affamées -1,27, guerres -1,19, argent des ménages -0,64, population -0,27 |
| `data.COMMODITIES.polymere.prix` | 6 | villes affamées -1,27, accords 1,11, dette totale -0,96, villes cédées -0,59 |
| `data.FACTIONS.signal.agression` | 0.62 | villes affamées -1,23, argent des ménages -0,75, accords -0,83, dette totale 0,60 |
| `data.COMMODITIES.isotope.prix` | 22 | argent des ménages -1,23, guerres -1,19, villes cédées 0,85, population -0,33 |
| `data.BIOMES.marais.yields.polymere` | 0.3 | argent des ménages -1,21, villes cédées -0,59, convois 0,30, villes debout 0,25 |
| `data.PALIERS_ITEM.machette` | 1 | villes affamées -1,20, argent des ménages -0,67, population -0,41, masse monétaire -0,26 |
| `dirigeants.TEMPERAMENTS.rapace.expansion` | 1.4 | villes affamées 1,20, dette totale 1,16, argent des ménages 0,49, convois -0,23 |
| `climat.METEO.orage_sec.rendement` | 0.9 | dette totale -1,20, argent des ménages 0,47, bourses 0,07, argent des trésors -0,01 |
| `data.PALIERS_ITEM.verrou` | 2 | dette totale 1,20, villes affamées -0,84, villes cédées 0,53, convois -0,31 |
| `data.PALIERS_ITEM.kevlar` | 2 | dette totale 1,20, villes affamées -0,84, villes cédées 0,53, convois -0,31 |
| `data.COMMODITIES.composant.prix` | 30 | guerres -1,19, villes cédées 0,92, dette totale 0,76, population -0,45 |
| `dirigeants.TEMPERAMENTS.batisseur.treve` | 1.35 | guerres -1,19, villes debout -0,13, villes nourries 0,23, masse monétaire -0,06 |
| `notables.CARACTERES.dur.ordre` | 0.08 | accords -1,19, argent des ménages -0,33, population -0,23, bourses -0,10 |
| `data.PALIERS_ITEM.harnais` | 1 | villes affamées -1,17, villes cédées 0,59, villes nourries 0,36, argent des ménages -0,30 |
| `dirigeants.TEMPERAMENTS.batisseur.colonne` | 0.9 | villes affamées -1,17, accords -0,95, villes cédées 0,71, argent des ménages -0,46 |
| `dirigeants.TEMPERAMENTS.methodique.guerre` | 0.9 | villes affamées -1,17, dette totale -1,08, accords -0,83, argent des ménages -0,64 |
| `data.BODY_PARTS.jambeG.poids` | 0.13 | dette totale -1,17, masse monétaire 0,19, argent des trésors 0,06 |
| `data.VOCATION_BIOME.desert.paysan` | 0.9 | villes affamées -0,84, accords 1,11, villes cédées 0,78, argent des ménages 0,55 |
| `dirigeants.TEMPERAMENTS.methodique.treve` | 1 | villes affamées 1,16, accords -1,07, argent des ménages 0,61, convois -0,56 |
| `monnaie.CHANGE.remiseTaille` | 0.25 | villes affamées -0,93, argent des ménages 0,83, bourses 0,29, population 0,28 |
| `data.VOCATION_STYLE.criminel.marchand` | 1.6 | villes affamées -1,14, accords 1,11, villes cédées -0,96, argent des ménages -0,53 |
| `dirigeants.TEMPERAMENTS.conquerant.severite` | 1.3 | argent des ménages -1,14, villes nourries 0,17, masse monétaire -0,17 |
| `climat.SAISONS.cendres.vivant` | 0.66 | argent des ménages 1,14, villes affamées -0,93, masse monétaire 0,22, argent des trésors 0,15 |
| `data.BIOMES.dalles.danger` | 0.032 | villes cédées -0,85, accords -1,07, convois 0,49, argent des ménages -0,45 |
| `data.VOCATION_STYLE.fanatique.artisan` | 0.4 | villes affamées 1,12, villes cédées -0,85, villes nourries 0,19, convois 0,26 |
| `dirigeants.TEMPERAMENTS.prudent.humain` | 1.05 | dette totale -1,12, villes affamées -0,99, villes cédées -0,53, argent des ménages -0,43 |
| `data.VOCATION_STYLE.fanatique.milicien` | 1.2 | dette totale 1,12, villes nourries -0,34, argent des trésors -0,19, masse monétaire -0,15 |
| `economy.FERTILITE.dalles` | 0.95 | argent des ménages -1,11, villes affamées -0,87, villes cédées -0,64, convois 0,41 |
| `data.BIOMES.friche.danger` | 0.028 | accords 1,11, dette totale -0,82, villes cédées -0,74, convois 0,18 |
| `data.VOCATION_BIOME.dalles.paysan` | 0.9 | accords 1,11, argent des ménages 0,82, convois -0,63, population 0,41 |
| `dirigeants.TEMPERAMENTS.conquerant.humain` | 0.8 | accords 1,11, population -0,31, bourses 0,19, masse monétaire -0,12 |
| `notables.CARACTERES.bonhomme.humeur` | 12 | dette totale -1,09, population -0,23, argent des trésors 0,21, villes debout -0,16 |
| `data.BODY_PARTS.jambeD.poids` | 0.13 | guerres -1,07, argent des ménages 0,43, argent des trésors -0,03, masse monétaire 0,24 |
| `dirigeants.TEMPERAMENTS.prudent.colonne` | 0.85 | dette totale 0,71, villes affamées -0,96, argent des ménages -0,73, population -0,35 |
| `data.PALIERS_ITEM.smg` | 2 | villes affamées -1,05, villes cédées -0,64, convois 0,51, population -0,26 |
| `data.COMMODITIES.ferraille.prix` | 3 | dette totale 1,05, argent des ménages -0,49, villes endettées 0,43, population -0,32 |
| `dirigeants.TEMPERAMENTS.methodique.expansion` | 1.15 | argent des ménages -0,38, villes affamées -0,90, convois 0,43, population -0,28 |
| `data.POIDS_BASE.artisan` | 0.35 | villes affamées -1,02, argent des ménages -0,73, villes cédées -0,53, convois 0,48 |
| `dirigeants.TEMPERAMENTS.conciliateur.expansion` | 1.2 | dette totale -1,00, argent des trésors -0,06, masse monétaire -0,07 |
| `data.PALIERS_ITEM.lance_harpon` | 3 | argent des ménages 1,00, villes cédées 0,85, dette totale 0,80, masse monétaire 0,11 |
| `dirigeants.TEMPERAMENTS.rapace.colonne` | 1.15 | argent des ménages -1,00, dette totale 0,68, argent des trésors -0,07, convois 0,21 |
| `climat.SAISONS.pluies.mineral` | 0.85 | villes cédées 0,99, argent des ménages 0,41, convois -0,40, argent des trésors -0,22 |
| `credit.CESSION.echelleRancune` | 45 | villes cédées -0,99, argent des ménages -0,48, convois -0,47, population -0,30 |
| `data.BIOMES.brulees.yields.carburant` | 0.6 | villes cédées 0,99, argent des ménages -0,92, villes affamées -0,90, dette totale 0,84 |
| `dirigeants.TEMPERAMENTS.prudent.treve` | 1.6 | accords -0,95, argent des ménages -0,78, dette totale 0,61, convois 0,32 |
| `notables.CARACTERES.dur.humeur` | -10 | dette totale 0,95, argent des ménages -0,47, convois -0,25, argent des trésors 0,18 |
| `data.FACTIONS.libres.agression` | 0.18 | villes affamées -0,93, argent des ménages -0,44, population -0,33, convois 0,30 |
| `notables.CARACTERES.fatigue.humeur` | -8 | villes cédées -0,92, convois -0,49, argent des ménages 0,48, masse monétaire -0,13 |
| `climat.SAISONS.pluies.vivant` | 1.35 | villes cédées 0,92, villes affamées -0,90, argent des ménages -0,54, population -0,30 |
| `data.VOCATION_STYLE.nomade.ferrailleur` | 1 | villes cédées 0,92, accords -0,83, convois 0,24, argent des trésors -0,07 |
| `sim.DEPARTS.survivant.gens` | 1 | villes affamées -0,90, accords -0,83, argent des ménages -0,36, population -0,25 |
| `climat.METEO.pluie_acide.rendement` | 0.65 | villes affamées -0,87, argent des ménages -0,29, dette totale 0,76, masse monétaire -0,14 |
| `data.VOCATION_STYLE.criminel.milicien` | 0.8 | villes affamées -0,87, dette totale 0,72, argent des ménages 0,68, population -0,20 |
| `dirigeants.TEMPERAMENTS.rapace.guerre` | 1.2 | dette totale -0,85, villes debout -0,15, argent des trésors -0,13, masse monétaire -0,11 |
| `data.BIOMES.dalles.hazard.degats` | 8 | argent des ménages -0,85, masse monétaire -0,11, argent des trésors 0,03 |
| `notables.CARACTERES.retors.humeur` | -4 | villes affamées -0,84, argent des trésors -0,05 |
| `data.BODY_PARTS.jambeG.pv` | 45 | argent des ménages 0,78, convois -0,30, argent des trésors -0,21, masse monétaire -0,07 |
| `dirigeants.TEMPERAMENTS.rancunier.expansion` | 0.9 | dette totale 0,81, population -0,21, convois 0,18, argent des trésors 0,15 |
| `data.BODY_PARTS.jambeD.pv` | 45 | argent des ménages 0,78, convois -0,30, argent des trésors -0,21, masse monétaire -0,07 |
| `monnaie.CHANGE.remiseAccord` | 0.5 | argent des ménages 0,62, argent des trésors -0,24, masse monétaire -0,12, bourses 0,07 |
| `climat.METEO.orage_sec.aleas` | 1.5 | villes cédées 0,71, population -0,24, argent des trésors -0,03, bourses -0,10 |
| `data.BIOMES.steppe.yields.ferraille` | 0.35 | argent des ménages 0,55, convois -0,36, population 0,26, argent des trésors -0,22 |
| `dirigeants.TEMPERAMENTS.conquerant.fisc` | 1.3 | dette totale 0,67, population -0,22, argent des trésors -0,05, masse monétaire -0,11 |
| `economy.FERTILITE.canyons` | 0.8 | argent des ménages 0,66, convois 0,27, argent des trésors 0,05, masse monétaire 0,07 |
| `dirigeants.TEMPERAMENTS.batisseur.humain` | 1.1 | dette totale 0,65, argent des ménages 0,57, villes cédées -0,53, argent des trésors -0,08 |
| `dirigeants.TEMPERAMENTS.rapace.severite` | 1.1 | dette totale 0,61, argent des ménages 0,55, argent des trésors -0,05 |
| `notables.CARACTERES.meticuleux.rendement` | 0.1 | argent des ménages 0,41, villes cédées -0,53, convois -0,49, argent des trésors 0,23 |
| `data.ITEMS.clous.degats` | 9 | argent des ménages -0,58, convois 0,29, argent des trésors 0,03 |
| `data.BODY_PARTS.brasD.pv` | 40 | argent des ménages 0,53, argent des trésors -0,06, bourses -0,10, masse monétaire -0,09 |
| `data.BIOMES.canyons.hazard.p` | 0.02 | argent des ménages 0,53, bourses -0,14, argent des trésors -0,04 |
| `data.BIOMES.desert.cout` | 5 | population -0,23, convois 0,43, bourses 0,19, argent des trésors -0,18 |
| `lois.PEINES.expeditive.ordre` | 0.05 | convois -0,50, argent des ménages 0,44, argent des trésors -0,03 |
| `climat.METEO.brouillard.rencontres` | 0.45 | argent des ménages 0,49, argent des trésors -0,07 |
| `data.BODY_PARTS.brasG.pv` | 40 | argent des ménages 0,49, masse monétaire 0,13, argent des trésors -0,05 |
| `climat.METEO.clair.aleas` | 1 | argent des ménages -0,48, argent des trésors -0,26, masse monétaire -0,21 |
| `notables.CARACTERES.avare.humeur` | -6 | argent des ménages -0,47, argent des trésors 0,04 |
| `data.BIOMES.canyons.hazard.degats` | 10 | argent des ménages -0,36, argent des trésors 0,12, masse monétaire 0,06 |
| `data.VOCATION_BIOME.marais.mineur` | 0.4 | argent des ménages 0,41, population 0,30, convois 0,25, argent des trésors -0,17 |
| `data.BIOMES.marais.hazard.p` | 0.06 | argent des ménages -0,40, argent des trésors 0,03 |
| `dirigeants.TEMPERAMENTS.rancunier.colonne` | 1.1 | argent des ménages -0,40, population -0,21, argent des trésors -0,18, villes nourries 0,16 |
| `data.ITEMS.barre.degats` | 7 | argent des ménages -0,40, villes nourries 0,19, population -0,20, argent des trésors -0,18 |
| `dirigeants.TEMPERAMENTS.rancunier.severite` | 1.6 | argent des ménages 0,39, bourses -0,10, argent des trésors -0,07 |
| `data.FACTIONS.rouilleurs.agression` | 0.5 | convois 0,36, villes nourries 0,15, masse monétaire -0,12, argent des trésors -0,10 |
| `dirigeants.TEMPERAMENTS.rancunier.fisc` | 1 | argent des ménages -0,28, population -0,26, villes debout 0,22, villes nourries 0,14 |
| `data.POSTURES.neutre.evitement` | 0.2 | argent des ménages -0,34, villes nourries -0,17, argent des trésors -0,02 |
| `climat.METEO.brouillard.aleas` | 1.1 | population 0,31, convois 0,25, bourses 0,19 |
| `climat.METEO.vent_cendre.aleas` | 1.4 | argent des ménages -0,27, bourses 0,07, masse monétaire -0,08, argent des trésors -0,05 |
| `lois.PEINES.ferme.routes` | 1 | convois 0,26, argent des trésors 0,09 |
| `dirigeants.TEMPERAMENTS.conquerant.treve` | 0.55 | convois 0,25, argent des trésors 0,03 |
| `combat.TACTIQUES.ligne.defense` | 1.45 | argent des trésors -0,05, masse monétaire 0,16, bourses -0,10 |
| `economy.SOLVABILITE.plafond` | 20 | argent des trésors 0,18, masse monétaire 0,16 |
| `credit.CESSION.primeMin` | 0.4 | argent des trésors -0,12, villes debout -0,14, masse monétaire -0,09 |
| `notables.CARACTERES.meticuleux.humeur` | 2 | argent des trésors -0,17, masse monétaire -0,12, bourses -0,10 |
| `data.BIOMES.relais.danger` | 0.075 | argent des trésors 0,06, bourses -0,10, masse monétaire 0,06 |
| `dirigeants.TEMPERAMENTS.conquerant.expansion` | 0.8 | villes debout -0,15, bourses -0,14, argent des trésors -0,10, masse monétaire -0,07 |
| `data.BIOMES.marais.hazard.degats` | 3 | argent des trésors -0,02, masse monétaire 0,11 |
| `data.ITEMS.machette.degats` | 10 | argent des trésors -0,03 |
| `dirigeants.TEMPERAMENTS.rapace.humain` | 0.5 | argent des trésors -0,12, bourses 0,07 |
| `climat.METEO.couvert.rencontres` | 1 | argent des trésors -0,06, masse monétaire 0,10 |
| `combat.TACTIQUES.ligne.moral` | 1.4 | argent des trésors -0,07 |
| `climat.SAISONS.seche.aleas` | 1.15 | bourses -0,10, argent des trésors 0,05 |
| `data.ITEMS.verrou.degats` | 16 | bourses -0,10, argent des trésors 0,02 |
| `data.TRAITS.vif.bonus.endurance` | 9 | bourses -0,10, argent des trésors 0,03 |
| `factions.ETAT.desertion` | 0.004 | bourses -0,10, argent des trésors -0,06 |
| `monnaie.MONNAIE.coursMax` | 4 | bourses -0,10, argent des trésors 0,05 |
| `data.POSTURES.neutre.fuite` | 0.3 | argent des trésors 0,08 |
| `data.TRAITS.teigneux.bonus.melee` | 12 | argent des trésors -0,09, bourses 0,07 |
| `data.BIOMES.plastique.hazard.p` | 0.03 | argent des trésors 0,02 |
| `combat.TACTIQUES.ligne.rompre` | 1 | masse monétaire 0,09, bourses 0,07, argent des trésors 0,06 |
| `dirigeants.TEMPERAMENTS.rancunier.treve` | 0.35 | argent des trésors 0,08 |
| `climat.METEO.canicule.aleas` | 1.3 | bourses 0,07 |
| `combat.TACTIQUES.ligne.attaque` | 0.82 | bourses 0,07, argent des trésors -0,02 |
| `data.BIOMES.desert.hazard.p` | 0.05 | bourses 0,07, argent des trésors 0,06 |
| `data.BIOMES.friche.hazard.p` | 0.08 | argent des trésors -0,07 |
| `lois.PEINES.legere.ordre` | -0.02 | argent des trésors 0,01 |
| `dirigeants.TEMPERAMENTS.rancunier.humain` | 0.75 | argent des trésors -0,03 |
| `dirigeants.TEMPERAMENTS.rapace.treve` | 0.9 | argent des trésors 0,06 |
| `data.BIOMES.friche.hazard.degats` | 2 | argent des trésors 0,05 |
| `data.BIOMES.marais.hazard.fatigue` | 7 | argent des trésors -0,04 |
| `data.BIOMES.dalles.hazard.p` | 0.012 | argent des trésors -0,04 |
| `lois.PEINES.expeditive.routes` | 1.5 | argent des trésors 0,03 |
| `credit.CREDIT.partServiceDette` | 0.25 | argent des trésors -0,03 |

## Les champs morts

Ces constantes ne déplacent **aucune** métrique au-delà du bruit, ni à ×0,7
ni à ×1,4. Chacune est une question ouverte : décor assumé, effet trop local
pour ces métriques, ou mécanisme qui ne se déclenche jamais. Ne pas les
régler — les instruire.

- `allegeance.ESTIME_ENGAGEMENT.commune` = 10
- `allegeance.ESTIME_ENGAGEMENT.nomade` = 18
- `allegeance.ESTIME_ENGAGEMENT.corpo` = 26
- `allegeance.ESTIME_ENGAGEMENT.criminel` = 26
- `allegeance.ESTIME_ENGAGEMENT.militaire` = 34
- `allegeance.ESTIME_ENGAGEMENT.fanatique` = 40
- `allegeance.SERVICES.corpo.rang` = 1
- `allegeance.SERVICES.militaire.rang` = 2
- `allegeance.SERVICES.nomade.rang` = 1
- `allegeance.SERVICES.fanatique.rang` = 1
- `allegeance.URGENCE_ORDRE.prime` = 1.5
- `base.AMENDEMENT_MAX.semoir` = 0.55
- `base.AMENDEMENT_MAX.terraformeur` = 0.9
- `base.COUT_FONDATION.ferraille` = 110
- `betes.BETES.brahmine.prix` = 900
- `betes.BETES.brahmine.portage` = 75
- `betes.BETES.brahmine.appetit` = 0.09
- `betes.BETES.brahmine.lenteur` = 0.05
- `betes.BETES.brahmine.robustesse` = 1
- `betes.BETES.mulet.prix` = 520
- `betes.BETES.mulet.portage` = 42
- `betes.BETES.mulet.appetit` = 0.05
- `betes.BETES.mulet.lenteur` = 0.02
- `betes.BETES.mulet.robustesse` = 1.35
- `betes.BETES.charrette.prix` = 340
- `betes.BETES.charrette.portage` = 55
- `betes.BETES.charrette.lenteur` = 0.14
- `betes.BETES.charrette.robustesse` = 2.2
- `climat.METEO.clair.marche` = 1
- `climat.METEO.clair.vue` = 1.3
- `climat.METEO.clair.soleil` = 1.25
- `climat.METEO.clair.vent` = 0.8
- `climat.METEO.couvert.marche` = 1
- `climat.METEO.couvert.vue` = 1
- `climat.METEO.couvert.soleil` = 0.8
- `climat.METEO.couvert.vent` = 0.9
- `climat.METEO.vent_cendre.marche` = 1.25
- `climat.METEO.vent_cendre.rencontres` = 0.7
- `climat.METEO.vent_cendre.vue` = 0.4
- `climat.METEO.vent_cendre.soleil` = 0.35
- `climat.METEO.vent_cendre.vent` = 1.6
- `climat.METEO.pluie_acide.marche` = 1.15
- `climat.METEO.pluie_acide.aleas` = 1.8
- `climat.METEO.pluie_acide.rencontres` = 0.6
- `climat.METEO.pluie_acide.vue` = 0.7
- `climat.METEO.pluie_acide.soleil` = 0.5
- `climat.METEO.pluie_acide.vent` = 1.1
- `climat.METEO.brouillard.marche` = 1.3
- `climat.METEO.brouillard.vue` = 0.2
- `climat.METEO.brouillard.soleil` = 0.3
- `climat.METEO.brouillard.vent` = 0.5
- `climat.METEO.orage_sec.marche` = 1.1
- `climat.METEO.orage_sec.vue` = 0.9
- `climat.METEO.orage_sec.soleil` = 0.85
- `climat.METEO.orage_sec.vent` = 1.45
- `climat.METEO.canicule.marche` = 1.2
- `climat.METEO.canicule.rencontres` = 1
- `climat.METEO.canicule.vue` = 1.1
- `climat.METEO.canicule.soleil` = 1.35
- `climat.METEO.canicule.vent` = 0.6
- `climat.SAISONS.accalmie.marche` = 1
- `climat.SAISONS.accalmie.faim` = 1
- `climat.SAISONS.seche.marche` = 0.95
- `climat.SAISONS.seche.rencontres` = 1.15
- `climat.SAISONS.seche.faim` = 1.15
- `climat.SAISONS.pluies.marche` = 1.2
- `climat.SAISONS.pluies.aleas` = 1.3
- `climat.SAISONS.pluies.rencontres` = 0.85
- `climat.SAISONS.pluies.faim` = 0.95
- `climat.SAISONS.cendres.marche` = 1.3
- `climat.SAISONS.cendres.aleas` = 1.4
- `climat.SAISONS.cendres.rencontres` = 0.8
- `climat.SAISONS.cendres.faim` = 1.15
- `combat.TACTIQUES.ligne.initiative` = 1
- `combat.TACTIQUES.ligne.acharnement` = 0.5
- `combat.TACTIQUES.charge.attaque` = 1.28
- `combat.TACTIQUES.charge.defense` = 0.6
- `combat.TACTIQUES.charge.initiative` = 1.7
- `combat.TACTIQUES.charge.moral` = 0.9
- `combat.TACTIQUES.charge.terrains.steppe` = 1.15
- `combat.TACTIQUES.charge.terrains.dalles` = 1.1
- `combat.TACTIQUES.charge.terrains.desert` = 1.05
- `combat.TACTIQUES.charge.terrains.marais` = 0.75
- `combat.TACTIQUES.charge.terrains.canyons` = 0.8
- `combat.TACTIQUES.charge.terrains.plastique` = 0.8
- `combat.TACTIQUES.charge.nombre` = 0.15
- `combat.TACTIQUES.charge.acharnement` = 1.4
- `combat.TACTIQUES.charge.rompre` = 0.7
- `combat.TACTIQUES.feu.attaque` = 1
- `combat.TACTIQUES.feu.defense` = 1.1
- `combat.TACTIQUES.feu.initiative` = 1.5
- `combat.TACTIQUES.feu.moral` = 1
- `combat.TACTIQUES.feu.terrains.steppe` = 1.3
- `combat.TACTIQUES.feu.terrains.desert` = 1.25
- `combat.TACTIQUES.feu.terrains.dalles` = 1.1
- `combat.TACTIQUES.feu.terrains.plastique` = 0.85
- `combat.TACTIQUES.feu.terrains.marais` = 0.6
- `combat.TACTIQUES.feu.terrains.canyons` = 0.65
- `combat.TACTIQUES.feu.terrains.friche` = 0.9
- `combat.TACTIQUES.feu.tir` = 1.6
- `combat.TACTIQUES.feu.acharnement` = 0.8
- `combat.TACTIQUES.feu.rompre` = 1.1
- `combat.TACTIQUES.encerclement.attaque` = 1.12
- `combat.TACTIQUES.encerclement.defense` = 0.92
- `combat.TACTIQUES.encerclement.initiative` = 1
- `combat.TACTIQUES.encerclement.moral` = 1.1
- `combat.TACTIQUES.encerclement.terrains.steppe` = 1.1
- `combat.TACTIQUES.encerclement.terrains.dalles` = 1.05
- `combat.TACTIQUES.encerclement.terrains.canyons` = 0.75
- `combat.TACTIQUES.encerclement.terrains.marais` = 0.85
- `combat.TACTIQUES.encerclement.nombre` = 0.6
- `combat.TACTIQUES.encerclement.acharnement` = 1.1
- `combat.TACTIQUES.encerclement.rompre` = 1.4
- `combat.TACTIQUES.harcelement.attaque` = 0.6
- `combat.TACTIQUES.harcelement.defense` = 1.5
- `combat.TACTIQUES.harcelement.initiative` = 1
- `combat.TACTIQUES.harcelement.moral` = 1.2
- `combat.TACTIQUES.harcelement.terrains.marais` = 1.3
- `combat.TACTIQUES.harcelement.terrains.canyons` = 1.25
- `combat.TACTIQUES.harcelement.terrains.friche` = 1.2
- `combat.TACTIQUES.harcelement.terrains.plastique` = 1.15
- `combat.TACTIQUES.harcelement.terrains.steppe` = 0.8
- `combat.TACTIQUES.harcelement.terrains.desert` = 0.75
- `combat.TACTIQUES.harcelement.nombre` = -0.1
- `combat.TACTIQUES.harcelement.furtif` = 1
- `combat.TACTIQUES.harcelement.acharnement` = 0.25
- `combat.TACTIQUES.harcelement.rompre` = 2.4
- `connaissance.DELAI_NOUVELLE.guerre` = 12
- `connaissance.DELAI_NOUVELLE.paix` = 18
- `connaissance.DELAI_NOUVELLE.capture` = 48
- `connaissance.DELAI_NOUVELLE.effondrement` = 72
- `connaissance.DELAI_NOUVELLE.secession` = 60
- `connaissance.DELAI_NOUVELLE.fondation` = 96
- `connaissance.DELAI_NOUVELLE.croissance` = 120
- `credit.CREDIT.heuresCouvertes` = 240
- `data.BIOMES.steppe.soleil` = 1
- `data.BIOMES.steppe.vent` = 1.2
- `data.BIOMES.steppe.hazard.p` = 0.02
- `data.BIOMES.steppe.hazard.degats` = 3
- `data.BIOMES.steppe.hazard.fatigue` = 6
- `data.BIOMES.dalles.soleil` = 0.8
- `data.BIOMES.dalles.vent` = 0.7
- `data.BIOMES.dalles.hazard.fatigue` = 4
- `data.BIOMES.friche.soleil` = 0.7
- `data.BIOMES.friche.vent` = 0.8
- `data.BIOMES.friche.hazard.fatigue` = 3
- `data.BIOMES.desert.soleil` = 1.35
- `data.BIOMES.desert.vent` = 1.1
- `data.BIOMES.desert.hazard.fatigue` = 5
- `data.BIOMES.canyons.soleil` = 0.85
- `data.BIOMES.canyons.vent` = 1.15
- `data.BIOMES.canyons.hazard.fatigue` = 5
- `data.BIOMES.marais.soleil` = 0.55
- `data.BIOMES.marais.vent` = 0.5
- `data.BIOMES.plastique.soleil` = 0.9
- `data.BIOMES.plastique.vent` = 0.6
- `data.BIOMES.plastique.hazard.degats` = 5
- `data.BIOMES.plastique.hazard.fatigue` = 9
- `data.BIOMES.brulees.soleil` = 1.2
- `data.BIOMES.brulees.vent` = 1
- `data.BIOMES.brulees.hazard.p` = 0.09
- `data.BIOMES.brulees.hazard.degats` = 3
- `data.BIOMES.brulees.hazard.fatigue` = 10
- `data.BIOMES.relais.soleil` = 0.95
- `data.BIOMES.relais.vent` = 0.9
- `data.BIOMES.relais.yields.composant` = 0.5
- `data.BIOMES.relais.yields.isotope` = 0.5
- `data.BIOMES.relais.yields.alliage` = 0.2
- `data.BIOMES.relais.hazard.p` = 0.07
- `data.BIOMES.relais.hazard.degats` = 4
- `data.BIOMES.relais.hazard.fatigue` = 8
- `data.BUILDINGS.generateur.cout.ferraille` = 70
- `data.BUILDINGS.generateur.cout.composant` = 8
- `data.BUILDINGS.generateur.coutMul` = 1.6
- `data.BUILDINGS.generateur.heures` = 5
- `data.BUILDINGS.generateur.tempsMul` = 1.5
- `data.BUILDINGS.generateur.energie` = 12
- `data.BUILDINGS.generateur.max` = 8
- `data.BUILDINGS.entrepot.cout.ferraille` = 55
- `data.BUILDINGS.entrepot.cout.polymere` = 25
- `data.BUILDINGS.entrepot.coutMul` = 1.55
- `data.BUILDINGS.entrepot.heures` = 4
- `data.BUILDINGS.entrepot.tempsMul` = 1.45
- `data.BUILDINGS.entrepot.max` = 10
- `data.BUILDINGS.semoir.cout.ferraille` = 60
- `data.BUILDINGS.semoir.cout.polymere` = 40
- `data.BUILDINGS.semoir.cout.composant` = 10
- `data.BUILDINGS.semoir.coutMul` = 1.65
- `data.BUILDINGS.semoir.heures` = 12
- `data.BUILDINGS.semoir.tempsMul` = 1.5
- `data.BUILDINGS.semoir.energie` = -4
- `data.BUILDINGS.semoir.max` = 5
- `data.BUILDINGS.terraformeur.cout.ferraille` = 120
- `data.BUILDINGS.terraformeur.cout.alliage` = 45
- `data.BUILDINGS.terraformeur.cout.composant` = 25
- `data.BUILDINGS.terraformeur.cout.isotope` = 10
- `data.BUILDINGS.terraformeur.coutMul` = 1.7
- `data.BUILDINGS.terraformeur.heures` = 22
- `data.BUILDINGS.terraformeur.tempsMul` = 1.55
- `data.BUILDINGS.terraformeur.energie` = -14
- `data.BUILDINGS.terraformeur.max` = 5
- `data.BUILDINGS.comptoir.cout.ferraille` = 70
- `data.BUILDINGS.comptoir.cout.polymere` = 35
- `data.BUILDINGS.comptoir.cout.composant` = 10
- `data.BUILDINGS.comptoir.coutMul` = 1.7
- `data.BUILDINGS.comptoir.heures` = 12
- `data.BUILDINGS.comptoir.tempsMul` = 1.55
- `data.BUILDINGS.comptoir.energie` = -6
- `data.BUILDINGS.comptoir.max` = 5
- `data.BUILDINGS.solaire.cout.ferraille` = 40
- `data.BUILDINGS.solaire.cout.polymere` = 30
- `data.BUILDINGS.solaire.cout.composant` = 6
- `data.BUILDINGS.solaire.coutMul` = 1.6
- `data.BUILDINGS.solaire.heures` = 8
- `data.BUILDINGS.solaire.tempsMul` = 1.5
- `data.BUILDINGS.solaire.energie` = 8
- `data.BUILDINGS.solaire.max` = 10
- `data.BUILDINGS.eolienne.cout.ferraille` = 55
- `data.BUILDINGS.eolienne.cout.alliage` = 12
- `data.BUILDINGS.eolienne.cout.composant` = 5
- `data.BUILDINGS.eolienne.coutMul` = 1.6
- `data.BUILDINGS.eolienne.heures` = 9
- `data.BUILDINGS.eolienne.tempsMul` = 1.5
- `data.BUILDINGS.eolienne.energie` = 9
- `data.BUILDINGS.eolienne.max` = 10
- `data.BUILDINGS.bassins.cout.ferraille` = 50
- `data.BUILDINGS.bassins.cout.polymere` = 45
- `data.BUILDINGS.bassins.coutMul` = 1.6
- `data.BUILDINGS.bassins.heures` = 7
- `data.BUILDINGS.bassins.tempsMul` = 1.5
- `data.BUILDINGS.bassins.energie` = -5
- `data.BUILDINGS.bassins.max` = 8
- `data.BUILDINGS.hydroponie.cout.ferraille` = 45
- `data.BUILDINGS.hydroponie.cout.polymere` = 25
- `data.BUILDINGS.hydroponie.coutMul` = 1.6
- `data.BUILDINGS.hydroponie.heures` = 6
- `data.BUILDINGS.hydroponie.tempsMul` = 1.5
- `data.BUILDINGS.hydroponie.energie` = -4
- `data.BUILDINGS.hydroponie.max` = 8
- `data.BUILDINGS.fonderie.cout.ferraille` = 90
- `data.BUILDINGS.fonderie.cout.minerai` = 40
- `data.BUILDINGS.fonderie.coutMul` = 1.65
- `data.BUILDINGS.fonderie.heures` = 8
- `data.BUILDINGS.fonderie.tempsMul` = 1.5
- `data.BUILDINGS.fonderie.energie` = -7
- `data.BUILDINGS.fonderie.max` = 8
- `data.BUILDINGS.atelier.cout.ferraille` = 80
- `data.BUILDINGS.atelier.cout.alliage` = 25
- `data.BUILDINGS.atelier.cout.composant` = 5
- `data.BUILDINGS.atelier.coutMul` = 1.7
- `data.BUILDINGS.atelier.heures` = 10
- `data.BUILDINGS.atelier.tempsMul` = 1.55
- `data.BUILDINGS.atelier.energie` = -9
- `data.BUILDINGS.atelier.max` = 8
- `data.BUILDINGS.raffinerie.cout.ferraille` = 75
- `data.BUILDINGS.raffinerie.cout.alliage` = 20
- `data.BUILDINGS.raffinerie.coutMul` = 1.65
- `data.BUILDINGS.raffinerie.heures` = 9
- `data.BUILDINGS.raffinerie.tempsMul` = 1.5
- `data.BUILDINGS.raffinerie.energie` = -6
- `data.BUILDINGS.raffinerie.max` = 8
- `data.BUILDINGS.cantine.cout.ferraille` = 40
- `data.BUILDINGS.cantine.cout.polymere` = 30
- `data.BUILDINGS.cantine.coutMul` = 1.5
- `data.BUILDINGS.cantine.heures` = 5
- `data.BUILDINGS.cantine.tempsMul` = 1.4
- `data.BUILDINGS.cantine.energie` = -2
- `data.BUILDINGS.cantine.max` = 5
- `data.BUILDINGS.halle.cout.ferraille` = 65
- `data.BUILDINGS.halle.cout.polymere` = 20
- `data.BUILDINGS.halle.coutMul` = 1.6
- `data.BUILDINGS.halle.heures` = 7
- `data.BUILDINGS.halle.tempsMul` = 1.45
- `data.BUILDINGS.halle.energie` = -3
- `data.BUILDINGS.halle.max` = 6
- `data.BUILDINGS.poste.cout.ferraille` = 60
- `data.BUILDINGS.poste.cout.polymere` = 15
- `data.BUILDINGS.poste.cout.composant` = 3
- `data.BUILDINGS.poste.coutMul` = 1.55
- `data.BUILDINGS.poste.heures` = 6
- `data.BUILDINGS.poste.tempsMul` = 1.4
- `data.BUILDINGS.poste.energie` = -2
- `data.BUILDINGS.poste.max` = 5
- `data.BUILDINGS.infirmerie.cout.ferraille` = 45
- `data.BUILDINGS.infirmerie.cout.polymere` = 35
- `data.BUILDINGS.infirmerie.cout.composant` = 6
- `data.BUILDINGS.infirmerie.coutMul` = 1.6
- `data.BUILDINGS.infirmerie.heures` = 7
- `data.BUILDINGS.infirmerie.tempsMul` = 1.5
- `data.BUILDINGS.infirmerie.energie` = -3
- `data.BUILDINGS.infirmerie.max` = 6
- `data.BUILDINGS.antenne.cout.ferraille` = 60
- `data.BUILDINGS.antenne.cout.composant` = 14
- `data.BUILDINGS.antenne.coutMul` = 1.7
- `data.BUILDINGS.antenne.heures` = 9
- `data.BUILDINGS.antenne.tempsMul` = 1.55
- `data.BUILDINGS.antenne.energie` = -5
- `data.BUILDINGS.antenne.max` = 6
- `data.BUILDINGS.mur.cout.ferraille` = 100
- `data.BUILDINGS.mur.cout.minerai` = 30
- `data.BUILDINGS.mur.coutMul` = 1.5
- `data.BUILDINGS.mur.heures` = 6
- `data.BUILDINGS.mur.tempsMul` = 1.4
- `data.BUILDINGS.mur.max` = 10
- `data.BUILDINGS.baraquement.cout.ferraille` = 65
- `data.BUILDINGS.baraquement.cout.polymere` = 30
- `data.BUILDINGS.baraquement.coutMul` = 1.7
- `data.BUILDINGS.baraquement.heures` = 8
- `data.BUILDINGS.baraquement.tempsMul` = 1.5
- `data.BUILDINGS.baraquement.energie` = -2
- `data.BUILDINGS.baraquement.max` = 5
- `data.COMMODITIES.ferraille.poids` = 1
- `data.COMMODITIES.minerai.poids` = 1.2
- `data.COMMODITIES.polymere.poids` = 0.6
- `data.COMMODITIES.biomasse.poids` = 0.8
- `data.COMMODITIES.rations.poids` = 0.5
- `data.COMMODITIES.alliage.poids` = 1
- `data.COMMODITIES.carburant.poids` = 0.9
- `data.COMMODITIES.isotope.poids` = 0.4
- `data.COMMODITIES.composant.poids` = 0.3
- `data.COMMODITIES.medkit.poids` = 0.4
- `data.DIPLOMES.medecine.plancher` = 26
- `data.DIPLOMES.medecine.apprentissage` = 1.6
- `data.DIPLOMES.medecine.cout` = 950
- `data.DIPLOMES.medecine.heures` = 220
- `data.DIPLOMES.medecine.tailleMin` = 2
- `data.DIPLOMES.ingenierie.plancher` = 26
- `data.DIPLOMES.ingenierie.apprentissage` = 1.6
- `data.DIPLOMES.ingenierie.cout` = 900
- `data.DIPLOMES.ingenierie.heures` = 200
- `data.DIPLOMES.ingenierie.tailleMin` = 2
- `data.DIPLOMES.commerce.plancher` = 26
- `data.DIPLOMES.commerce.apprentissage` = 1.7
- `data.DIPLOMES.commerce.cout` = 1100
- `data.DIPLOMES.commerce.heures` = 180
- `data.DIPLOMES.commerce.tailleMin` = 3
- `data.DIPLOMES.furtivite.plancher` = 24
- `data.DIPLOMES.furtivite.apprentissage` = 1.55
- `data.DIPLOMES.furtivite.cout` = 800
- `data.DIPLOMES.furtivite.heures` = 190
- `data.DIPLOMES.furtivite.tailleMin` = 2
- `data.DIPLOMES.tir.plancher` = 24
- `data.DIPLOMES.tir.apprentissage` = 1.5
- `data.DIPLOMES.tir.cout` = 850
- `data.DIPLOMES.tir.heures` = 170
- `data.DIPLOMES.tir.tailleMin` = 2
- `data.DIPLOMES.melee.plancher` = 24
- `data.DIPLOMES.melee.apprentissage` = 1.5
- `data.DIPLOMES.melee.cout` = 780
- `data.DIPLOMES.melee.heures` = 170
- `data.DIPLOMES.melee.tailleMin` = 2
- `data.DIPLOMES.force.plancher` = 22
- `data.DIPLOMES.force.apprentissage` = 1.4
- `data.DIPLOMES.force.cout` = 520
- `data.DIPLOMES.force.heures` = 140
- `data.DIPLOMES.force.tailleMin` = 1
- `data.DIPLOMES.endurance.plancher` = 22
- `data.DIPLOMES.endurance.apprentissage` = 1.4
- `data.DIPLOMES.endurance.cout` = 480
- `data.DIPLOMES.endurance.heures` = 150
- `data.DIPLOMES.endurance.tailleMin` = 1
- `data.FACTIONS.hexa.cupidite` = 0.9
- `data.FACTIONS.rouilleurs.cupidite` = 0.55
- `data.FACTIONS.signal.cupidite` = 0.3
- `data.FACTIONS.ombrelle.cupidite` = 0.95
- `data.FACTIONS.cendre.cupidite` = 0.4
- `data.FACTIONS.libres.cupidite` = 0.35
- `data.FACTIONS.essaim.agression` = 0.95
- `data.ITEMS.barre.pen` = 0.05
- `data.ITEMS.barre.poids` = 3
- `data.ITEMS.barre.prix` = 30
- `data.ITEMS.machette.pen` = 0.12
- `data.ITEMS.machette.poids` = 2
- `data.ITEMS.machette.prix` = 90
- `data.ITEMS.katana.degats` = 14
- `data.ITEMS.katana.pen` = 0.22
- `data.ITEMS.katana.poids` = 3
- `data.ITEMS.katana.prix` = 260
- `data.ITEMS.masse.degats` = 20
- `data.ITEMS.masse.pen` = 0.35
- `data.ITEMS.masse.poids` = 9
- `data.ITEMS.masse.prix` = 520
- `data.ITEMS.masse.reqForce` = 45
- `data.ITEMS.clous.pen` = 0.1
- `data.ITEMS.clous.poids` = 2
- `data.ITEMS.clous.prix` = 120
- `data.ITEMS.verrou.pen` = 0.25
- `data.ITEMS.verrou.poids` = 5
- `data.ITEMS.verrou.prix` = 340
- `data.ITEMS.smg.degats` = 12
- `data.ITEMS.smg.pen` = 0.15
- `data.ITEMS.smg.poids` = 4
- `data.ITEMS.smg.prix` = 400
- `data.ITEMS.smg.rafale` = 2
- `data.ITEMS.rail.degats` = 26
- `data.ITEMS.rail.pen` = 0.5
- `data.ITEMS.rail.poids` = 8
- `data.ITEMS.rail.prix` = 1100
- `data.ITEMS.rail.reqForce` = 40
- `data.ITEMS.cuir.armure` = 4
- `data.ITEMS.cuir.poids` = 4
- `data.ITEMS.cuir.prix` = 70
- `data.ITEMS.plaque.armure` = 9
- `data.ITEMS.plaque.poids` = 11
- `data.ITEMS.plaque.prix` = 210
- `data.ITEMS.kevlar.armure` = 14
- `data.ITEMS.kevlar.poids` = 8
- `data.ITEMS.kevlar.prix` = 560
- `data.ITEMS.exo.armure` = 20
- `data.ITEMS.exo.poids` = 14
- `data.ITEMS.exo.prix` = 1400
- `data.ITEMS.exo.bonus.force` = 8
- `data.ITEMS.bras_hydro.prix` = 700
- `data.ITEMS.bras_hydro.bonus.force` = 14
- `data.ITEMS.oeil_optique.prix` = 650
- `data.ITEMS.oeil_optique.bonus.tir` = 14
- `data.ITEMS.jambe_servo.prix` = 600
- `data.ITEMS.jambe_servo.bonus.endurance` = 12
- `data.ITEMS.coeur_synth.prix` = 900
- `data.ITEMS.coeur_synth.bonus.endurance` = 18
- `data.ITEMS.hachoir.degats` = 12
- `data.ITEMS.hachoir.pen` = 0.14
- `data.ITEMS.hachoir.poids` = 4
- `data.ITEMS.hachoir.prix` = 170
- `data.ITEMS.arbalete.degats` = 13
- `data.ITEMS.arbalete.pen` = 0.3
- `data.ITEMS.arbalete.poids` = 3
- `data.ITEMS.arbalete.prix` = 290
- `data.ITEMS.pompe.degats` = 19
- `data.ITEMS.pompe.pen` = 0.16
- `data.ITEMS.pompe.poids` = 5
- `data.ITEMS.pompe.prix` = 470
- `data.ITEMS.lance_harpon.degats` = 22
- `data.ITEMS.lance_harpon.pen` = 0.4
- `data.ITEMS.lance_harpon.poids` = 7
- `data.ITEMS.lance_harpon.prix` = 760
- `data.ITEMS.lance_harpon.reqForce` = 35
- `data.ITEMS.manteau.armure` = 7
- `data.ITEMS.manteau.poids` = 6
- `data.ITEMS.manteau.prix` = 140
- `data.ITEMS.manteau.bonus.furtivite` = 6
- `data.ITEMS.harnais.armure` = 3
- `data.ITEMS.harnais.poids` = 3
- `data.ITEMS.harnais.prix` = 190
- `data.ITEMS.harnais.bonus.force` = 4
- `data.METIERS.cultivateur.parNiveau` = 3
- `data.METIERS.cultivateur.apport` = 0.14
- `data.METIERS.courtier.parNiveau` = 2
- `data.METIERS.courtier.apport` = 0.16
- `data.METIERS.semeur.parNiveau` = 2
- `data.METIERS.semeur.apport` = 0.15
- `data.METIERS.terraformier.parNiveau` = 2
- `data.METIERS.terraformier.apport` = 0.15
- `data.METIERS.bassinier.parNiveau` = 3
- `data.METIERS.bassinier.apport` = 0.14
- `data.METIERS.fondeur.parNiveau` = 3
- `data.METIERS.fondeur.apport` = 0.14
- `data.METIERS.machiniste.parNiveau` = 2
- `data.METIERS.machiniste.apport` = 0.16
- `data.METIERS.raffineur.parNiveau` = 2
- `data.METIERS.raffineur.apport` = 0.15
- `data.METIERS.mecanicien.parNiveau` = 2
- `data.METIERS.mecanicien.apport` = 0.08
- `data.METIERS.magasinier.parNiveau` = 2
- `data.METIERS.magasinier.apport` = 0.12
- `data.METIERS.infirmier.parNiveau` = 2
- `data.METIERS.infirmier.apport` = 0.2
- `data.METIERS.operateur.parNiveau` = 2
- `data.METIERS.operateur.apport` = 0.13
- `data.METIERS.milicien.parNiveau` = 3
- `data.METIERS.milicien.apport` = 0.1
- `data.METIERS.batisseur.parNiveau` = 4
- `data.METIERS.batisseur.apport` = 0.12
- `data.METIERS.cuisinier.parNiveau` = 2
- `data.METIERS.cuisinier.apport` = 0.18
- `data.METIERS.recoltant.parNiveau` = 3
- `data.METIERS.recoltant.apport` = 0.16
- `data.METIERS.garde.parNiveau` = 2
- `data.METIERS.garde.apport` = 0.15
- `data.POI.ruine.danger` = 0.2
- `data.POI.convoi.objet` = 1
- `data.POI.convoi.danger` = 0.3
- `data.POI.bunker.objet` = 2
- `data.POI.bunker.danger` = 0.45
- `data.POI.bunker.reqIngenierie` = 25
- `data.POI.station.revele` = 3
- `data.POI.station.danger` = 0.25
- `data.POI.cache.objet` = 1
- `data.POI.cache.danger` = 0.35
- `data.POI.ville_morte.objet` = 2
- `data.POI.ville_morte.danger` = 0.35
- `data.POI.charnier.objet` = 1
- `data.POI.charnier.danger` = 0.6
- `data.POSTURES.prudent.evitement` = 0.5
- `data.POSTURES.prudent.fuite` = 0.55
- `data.POSTURES.prudent.degats` = 0.9
- `data.POSTURES.prudent.rendement` = 0.9
- `data.POSTURES.neutre.degats` = 1
- `data.POSTURES.neutre.rendement` = 1
- `data.POSTURES.agressif.fuite` = 0.12
- `data.POSTURES.agressif.degats` = 1.15
- `data.POSTURES.agressif.rendement` = 1.05
- `data.RESEARCH.metallurgie.cout.composant` = 12
- `data.RESEARCH.metallurgie.cout.credits` = 200
- `data.RESEARCH.metallurgie.coutMul` = 1.8
- `data.RESEARCH.metallurgie.heures` = 10
- `data.RESEARCH.metallurgie.tempsMul` = 1.7
- `data.RESEARCH.metallurgie.max` = 5
- `data.RESEARCH.hydroponie_av.cout.composant` = 10
- `data.RESEARCH.hydroponie_av.cout.credits` = 180
- `data.RESEARCH.hydroponie_av.coutMul` = 1.8
- `data.RESEARCH.hydroponie_av.heures` = 9
- `data.RESEARCH.hydroponie_av.tempsMul` = 1.7
- `data.RESEARCH.hydroponie_av.max` = 5
- `data.RESEARCH.cotation.cout.composant` = 12
- `data.RESEARCH.cotation.cout.ferraille` = 60
- `data.RESEARCH.cotation.cout.credits` = 250
- `data.RESEARCH.cotation.coutMul` = 1.9
- `data.RESEARCH.cotation.heures` = 14
- `data.RESEARCH.cotation.tempsMul` = 1.75
- `data.RESEARCH.cotation.max` = 5
- `data.RESEARCH.refonte.cout.composant` = 10
- `data.RESEARCH.refonte.cout.credits` = 200
- `data.RESEARCH.refonte.coutMul` = 1.8
- `data.RESEARCH.refonte.heures` = 10
- `data.RESEARCH.refonte.tempsMul` = 1.7
- `data.RESEARCH.refonte.max` = 5
- `data.RESEARCH.reformage.cout.composant` = 28
- `data.RESEARCH.reformage.cout.isotope` = 10
- `data.RESEARCH.reformage.cout.credits` = 550
- `data.RESEARCH.reformage.coutMul` = 1.9
- `data.RESEARCH.reformage.heures` = 18
- `data.RESEARCH.reformage.tempsMul` = 1.75
- `data.RESEARCH.reformage.max` = 5
- `data.RESEARCH.insemination.cout.composant` = 20
- `data.RESEARCH.insemination.cout.credits` = 400
- `data.RESEARCH.insemination.coutMul` = 1.85
- `data.RESEARCH.insemination.heures` = 16
- `data.RESEARCH.insemination.tempsMul` = 1.7
- `data.RESEARCH.insemination.max` = 5
- `data.RESEARCH.terraformation.cout.composant` = 45
- `data.RESEARCH.terraformation.cout.isotope` = 20
- `data.RESEARCH.terraformation.cout.alliage` = 30
- `data.RESEARCH.terraformation.cout.credits` = 900
- `data.RESEARCH.terraformation.coutMul` = 2
- `data.RESEARCH.terraformation.heures` = 26
- `data.RESEARCH.terraformation.tempsMul` = 1.8
- `data.RESEARCH.terraformation.max` = 5
- `data.RESEARCH.pyrolyse.cout.composant` = 12
- `data.RESEARCH.pyrolyse.cout.credits` = 220
- `data.RESEARCH.pyrolyse.coutMul` = 1.8
- `data.RESEARCH.pyrolyse.heures` = 10
- `data.RESEARCH.pyrolyse.tempsMul` = 1.7
- `data.RESEARCH.pyrolyse.max` = 5
- `data.RESEARCH.renouvelable.cout.composant` = 16
- `data.RESEARCH.renouvelable.cout.alliage` = 10
- `data.RESEARCH.renouvelable.cout.credits` = 300
- `data.RESEARCH.renouvelable.coutMul` = 1.85
- `data.RESEARCH.renouvelable.heures` = 13
- `data.RESEARCH.renouvelable.tempsMul` = 1.7
- `data.RESEARCH.renouvelable.max` = 5
- `data.RESEARCH.cultures.cout.composant` = 8
- `data.RESEARCH.cultures.cout.credits` = 150
- `data.RESEARCH.cultures.coutMul` = 1.8
- `data.RESEARCH.cultures.heures` = 8
- `data.RESEARCH.cultures.tempsMul` = 1.7
- `data.RESEARCH.cultures.max` = 5
- `data.RESEARCH.ingenierie.cout.composant` = 16
- `data.RESEARCH.ingenierie.cout.credits` = 260
- `data.RESEARCH.ingenierie.coutMul` = 1.9
- `data.RESEARCH.ingenierie.heures` = 12
- `data.RESEARCH.ingenierie.tempsMul` = 1.75
- `data.RESEARCH.ingenierie.max` = 5
- `data.RESEARCH.balistique.cout.composant` = 18
- `data.RESEARCH.balistique.cout.credits` = 300
- `data.RESEARCH.balistique.coutMul` = 1.9
- `data.RESEARCH.balistique.heures` = 12
- `data.RESEARCH.balistique.tempsMul` = 1.7
- `data.RESEARCH.balistique.max` = 5
- `data.RESEARCH.blindage.cout.composant` = 18
- `data.RESEARCH.blindage.cout.alliage` = 20
- `data.RESEARCH.blindage.cout.credits` = 260
- `data.RESEARCH.blindage.coutMul` = 1.9
- `data.RESEARCH.blindage.heures` = 12
- `data.RESEARCH.blindage.tempsMul` = 1.7
- `data.RESEARCH.blindage.max` = 5
- `data.RESEARCH.medecine.cout.composant` = 14
- `data.RESEARCH.medecine.cout.credits` = 240
- `data.RESEARCH.medecine.coutMul` = 1.85
- `data.RESEARCH.medecine.heures` = 11
- `data.RESEARCH.medecine.tempsMul` = 1.7
- `data.RESEARCH.medecine.max` = 4
- `data.RESEARCH.logistique.cout.composant` = 12
- `data.RESEARCH.logistique.cout.credits` = 220
- `data.RESEARCH.logistique.coutMul` = 1.85
- `data.RESEARCH.logistique.heures` = 10
- `data.RESEARCH.logistique.tempsMul` = 1.7
- `data.RESEARCH.logistique.max` = 5
- `data.RESEARCH.cybernetique.cout.composant` = 30
- `data.RESEARCH.cybernetique.cout.isotope` = 15
- `data.RESEARCH.cybernetique.cout.credits` = 500
- `data.RESEARCH.cybernetique.coutMul` = 2
- `data.RESEARCH.cybernetique.heures` = 20
- `data.RESEARCH.cybernetique.tempsMul` = 1.8
- `data.RESEARCH.cybernetique.max` = 3
- `data.RESEARCH.optique.cout.composant` = 10
- `data.RESEARCH.optique.cout.credits` = 160
- `data.RESEARCH.optique.coutMul` = 1.9
- `data.RESEARCH.optique.heures` = 8
- `data.RESEARCH.optique.tempsMul` = 1.7
- `data.RESEARCH.optique.max` = 3
- `data.RESEARCH.cryptographie.cout.composant` = 22
- `data.RESEARCH.cryptographie.cout.isotope` = 8
- `data.RESEARCH.cryptographie.cout.credits` = 380
- `data.RESEARCH.cryptographie.coutMul` = 2
- `data.RESEARCH.cryptographie.heures` = 16
- `data.RESEARCH.cryptographie.tempsMul` = 1.8
- `data.RESEARCH.cryptographie.max` = 2
- `data.TRAITS.costaud.bonus.force` = 10
- `data.TRAITS.costaud.mult.portage` = 1.15
- `data.TRAITS.vif.mult.vitesse` = 1.12
- `data.TRAITS.oeil.bonus.tir` = 12
- `data.TRAITS.teigneux.mult.fatigue` = 1.2
- `data.TRAITS.ombre.bonus.furtivite` = 14
- `data.TRAITS.ombre.mult.evitement` = 1.25
- `data.TRAITS.bricoleur.bonus.ingenierie` = 14
- `data.TRAITS.rebouteux.bonus.medecine` = 14
- `data.TRAITS.beau_parleur.bonus.commerce` = 14
- `data.TRAITS.coriace.mult.degatsSubis` = 0.85
- `data.TRAITS.sobre.mult.faim` = 0.7
- `data.TRAITS.gouffre.mult.faim` = 1.45
- `data.TRAITS.hemophile.mult.saignement` = 1.6
- `data.TRAITS.insomniaque.mult.fatigue` = 1.3
- `data.TRAITS.froussard.mult.evitement` = 1.2
- `data.TRAITS.froussard.mult.moral` = 0.8
- `data.TRAITS.mule.mult.portage` = 1.3
- `data.TRAITS.mule.mult.vitesse` = 0.9
- `data.TRAITS.survivant.mult.soin` = 1.35
- `data.TRAITS.survivant.mult.faim` = 0.9
- `data.VOCATION_BIOME.relais.artisan` = 3.2
- `data.VOCATION_BIOME.relais.ferrailleur` = 1.6
- `data.VOCATION_BIOME.relais.mineur` = 1
- `data.VOCATION_STYLE.essaim.milicien` = 1.5
- `depouilles.RITES.enterrer.cohesion` = 4
- `depouilles.RITES.depouiller.cohesion` = -3
- `depouilles.RITES.betes.cohesion` = -11
- `depouilles.RITES.manger.cohesion` = -24
- `depouilles.RITES.organes.cohesion` = -13
- `economy.CAISSE.marge` = 0.1
- `economy.FERTILITE.relais` = 0.5
- `influence.PREROGATIVES.envoyer.rang` = 2
- `influence.PREROGATIVES.lever.rang` = 3
- `influence.PREROGATIVES.fonder.rang` = 3
- `influence.PREROGATIVES.garnison.rang` = 3
- `influence.PREROGATIVES.grenier.rang` = 3
- `influence.PREROGATIVES.bourse.rang` = 3
- `influence.PREROGATIVES.accord.rang` = 4
- `influence.PREROGATIVES.rompre.rang` = 4
- `influence.PREROGATIVES.guerre.rang` = 4
- `influence.PREROGATIVES.paix.rang` = 4
- `influence.PREROGATIVES.loi.rang` = 4
- `lois.PEINES.legere.prime` = 0.6
- `lois.PEINES.legere.duree` = 120
- `lois.PEINES.legere.routes` = 0.6
- `lois.PEINES.ferme.prime` = 1
- `lois.PEINES.ferme.duree` = 400
- `lois.PEINES.expeditive.prime` = 1.35
- `lois.PEINES.expeditive.duree` = 60
- `lois.REGIMES.franchise.propriete` = 25
- `lois.REGIMES.franchise.preleve` = 0.01
- `lois.REGIMES.charte.propriete` = 40
- `lois.REGIMES.charte.preleve` = 0.02
- `lois.REGIMES.commune.preleve` = 0.08
- `lois.REGIMES.domaine.preleve` = 0.05
- `monnaie.CHANGE.remiseEstime` = 0.3
- `monnaie.MONNAIE.horizonGage` = 720
- `notables.CARACTERES.droit.marge` = -0.06
- `notables.CARACTERES.retors.marge` = 0.1
- `notables.CARACTERES.dur.marge` = 0.03
- `notables.CARACTERES.bonhomme.marge` = -0.03
- `notables.CARACTERES.avare.marge` = 0.13
- `notables.CARACTERES.fatigue.marge` = 0.02
- `notables.CARACTERES.ambitieux.marge` = 0.05
- `sim.DEPARTS.poussiere.gens` = 1
- `sim.DEPARTS.fuyards.gens` = 2
- `sim.DEPARTS.fuyards.accueil` = -35
- `sim.DEPARTS.convoi.gens` = 3
- `squad.ORDRES.fouille.effort` = 1
- `squad.ORDRES.mine.effort` = 1.2
- `squad.ORDRES.chasse.effort` = 1
- `squad.ORDRES.exploration.effort` = 0.9
- `squad.ORDRES.entrainement.effort` = 1.1
- `squad.ORDRES.patrouille.effort` = 1.1
- `squad.ORDRES.voyage.effort` = 1
- `squad.ORDRES.travaux.effort` = 1

## Ce qui n'est pas sur la carte

La convention `module.OBJET.champ` du banc n'atteint pas les objets
imbriqués. Ces champs-là existent et pèsent peut-être lourd — ils ne sont
simplement pas mesurés ici. Le dire est le minimum : une carte muette sur
ses trous se lit comme une carte complète.

- **pas un nombre** : 756 champs — SERVICES.corpo.cle, SERVICES.corpo.nom, SERVICES.corpo.court, SERVICES.corpo.desc, SERVICES.militaire.cle, SERVICES.militaire.nom, SERVICES.militaire.court, SERVICES.militaire.desc, SERVICES.commune.cle, SERVICES.commune.nom…
- **à zéro — aucun facteur ne le déplace** : 30 champs — SERVICES.commune.rang, SERVICES.criminel.rang, BETES.charrette.appetit, TACTIQUES.ligne.nombre, TACTIQUES.feu.nombre, DELAI_NOUVELLE.saison, BUILDINGS.entrepot.energie, BUILDINGS.mur.energie, FACTIONS.essaim.cupidite, ITEMS.bras_hydro.poids…
- **un tableau** : 79 champs — BIOMES.steppe.couleurs, BIOMES.dalles.couleurs, BIOMES.friche.couleurs, BIOMES.desert.couleurs, BIOMES.canyons.couleurs, BIOMES.marais.couleurs, BIOMES.plastique.couleurs, BIOMES.brulees.couleurs, BIOMES.relais.couleurs, DIPLOMES.medecine.styles…
- **modules non chargeables hors navigateur** : main.js

La vitesse du tick n'est pas cartographiée non plus : elle dépend de la
charge de la machine, pas du monde. Elle se mesure au calme, avec ses deux
gardes, par `verifier --complet`.

Enfin, la carte donne des effets **isolés** : un levier à la fois, tous les
autres au repos. Deux leviers qui se compensent ne se lisent pas dessus.
