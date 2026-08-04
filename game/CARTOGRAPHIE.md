# La carte des leviers

Ce que chaque constante du moteur commande, et de combien. Document
**produit par la mesure** — il se régénère, il ne se modifie pas à la main :

```
node tools/banc.js --cartographie
```

Révision `ee937ba` — 84 leviers sur 84 recensés, 6 graines × 6000 h.

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

Les 5 placebos portent sur les leviers qui remuent le plus le
monde, un par module — un placebo posé sur une constante que le moteur ne lit
jamais mesurerait un chaos nul et rendrait tout significatif :

`economy.CAISSE.parTete`, `monnaie.MONNAIE.inertie`, `data.PALIERS_ITEM.rail`, `factions.ETAT.parSoldat`, `credit.CREDIT.seuilDetresse`

| métrique | valeur de référence | plancher de bruit |
|---|---:|---:|
| population | 9649 | 14,4 % |
| villes debout | 86 | 4,6 % |
| villes nourries | 65 | 10,3 % |
| villes affamées | 14 | 71,1 % |
| factions écrasées | 0 | 50,0 % |
| guerres | 4 | 38,1 % |
| convois | 3109 | 7,3 % |
| accords | 4 | 52,4 % |
| bourses | 6 | 2,9 % |
| villes endettées | 57 | 12,0 % |
| dette totale | 30484 | 23,8 % |
| villes cédées | 8 | 19,1 % |
| masse monétaire | 425728 | 2,7 % |
| argent des ménages | 54280 | 30,0 % |
| argent des trésors | 311028 | 7,0 % |

Un plancher élevé n'est pas un défaut de l'instrument : c'est une propriété
du monde. Les factions écrasées se comptent sur les doigts d'une main — une
de plus ou de moins, et le pourcentage saute. Ces métriques-là exigent
beaucoup avant qu'on puisse conclure, et c'est justement ce qu'il fallait
savoir avant de prétendre les régler.

## Ce que chaque métrique commande — les leviers, par métrique

### population

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.MENAGES.parTete` | 3 | -26,3 % | — | 0,88 | ne pousse que d'un côté |
| `monnaie.MONNAIE.coursMin` | 0.4 | -17,0 % | — | 0,57 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | — | 22,4 % | 0,56 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | -15,8 % | — | 0,53 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | -15,6 % | -16,5 % | -0,41 |  |
| `economy.FERTILITE.plastique` | 0.75 | -15,2 % | — | 0,51 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.masse` | 3 | — | -16,7 % | -0,42 | ne pousse que d'un côté |
| `credit.CREDIT.seuilDetresse` | 0.9 | — | -16,6 % | -0,42 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.machette` | 1 | — | -16,4 % | -0,41 | ne pousse que d'un côté |
| `data.POIDS_BASE.mineur` | 0.35 | — | -15,1 % | -0,38 | ne pousse que d'un côté |

### villes debout

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | — | -14,9 % | -0,37 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | 5,0 % | -12,4 % | -0,31 |  |
| `economy.SUREXTENSION.parCase` | 0.00001 | -7,9 % | — | 0,26 | ne pousse que d'un côté |
| `monnaie.MONNAIE.coursMin` | 0.4 | — | -9,5 % | -0,24 | ne pousse que d'un côté |
| `economy.FERTILITE.dalles` | 0.95 | -6,8 % | — | 0,23 | ne pousse que d'un côté |
| `monnaie.MONNAIE.primeConfiance` | 3.75 | -6,2 % | -8,5 % | -0,21 |  |
| `economy.FERTILITE.desert` | 0.65 | -6,2 % | — | 0,21 | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | -5,6 % | — | 0,19 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | -5,6 % | -5,8 % | -0,15 |  |
| `credit.CREDIT.grogneDefaut` | 0.25 | — | -7,0 % | -0,17 | ne pousse que d'un côté |
| `economy.SUREXTENSION.seuil` | 8 | -5,0 % | — | 0,17 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.arbalete` | 2 | — | -6,6 % | -0,16 | ne pousse que d'un côté |
| … | | | | | 14 autres |

### villes nourries

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.coursMin` | 0.4 | 13,4 % | — | -0,45 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | 12,4 % | — | -0,41 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | 11,4 % | — | -0,38 | ne pousse que d'un côté |
| `data.POIDS_BASE.marchand` | 0.35 | 10,9 % | — | -0,36 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.harnais` | 1 | — | 14,2 % | 0,36 | ne pousse que d'un côté |
| `economy.FERTILITE.brulees` | 0.6 | 10,6 % | — | -0,35 | ne pousse que d'un côté |
| `data.POIDS_BASE.ouvrier` | 0.13 | — | 12,1 % | 0,30 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.verrou` | 2 | — | 11,9 % | 0,30 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.kevlar` | 2 | — | 11,9 % | 0,30 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | — | 11,4 % | 0,28 | ne pousse que d'un côté |
| `data.POIDS_BASE.milicien` | 0.35 | — | 10,6 % | 0,26 | ne pousse que d'un côté |

### villes affamées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.partDuTresor` | 0.01 | -75,9 % | — | 2,53 | ne pousse que d'un côté |

### factions écrasées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | — | 83,3 % | 12,50 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | 66,7 % | 10,00 | ne pousse que d'un côté |

### guerres

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.FERTILITE.plastique` | 0.75 | -52,4 % | — | 1,75 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `economy.CAISSE.grogneImpayes` | 0.0025 | -47,6 % | — | 1,59 | ne pousse que d'un côté |
| `economy.FERTILITE.friche` | 0.7 | — | -42,9 % | -1,07 | ne pousse que d'un côté |

### convois

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.POIDS_BASE.medecin` | 0.35 | -21,4 % | — | 0,71 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | 20,9 % | 10,1 % | 0,25 |  |
| `economy.CAISSE.partSalariale` | 0.55 | — | -22,8 % | -0,57 | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | 16,0 % | -8,1 % | -0,20 |  |
| `data.PALIERS_ITEM.smg` | 2 | — | 20,4 % | 0,51 | ne pousse que d'un côté |
| `data.POIDS_BASE.artisan` | 0.35 | -14,5 % | — | 0,48 | ne pousse que d'un côté |
| `credit.CESSION.echelleRancune` | 45 | 14,2 % | — | -0,47 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | — | 18,1 % | 0,45 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | -13,1 % | — | 0,44 | ne pousse que d'un côté |
| `economy.FERTILITE.friche` | 0.7 | -11,0 % | -16,9 % | -0,42 |  |
| `factions.ETAT.parDefense` | 0.002 | -11,8 % | 16,9 % | 0,42 |  |
| `economy.FERTILITE.dalles` | 0.95 | -12,3 % | — | 0,41 | ne pousse que d'un côté |
| … | | | | | 27 autres |

### accords

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.partDuTresor` | 0.01 | -76,2 % | — | 2,54 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | — | -61,9 % | -1,55 | ne pousse que d'un côté |
| `monnaie.MONNAIE.coursMin` | 0.4 | — | -57,1 % | -1,43 | ne pousse que d'un côté |

### bourses

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.FERTILITE.marais` | 1.45 | -8,6 % | 2,9 % | 0,07 |  |
| `economy.FERTILITE.dalles` | 0.95 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parVille` | 0.00005 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `monnaie.CHANGE.remiseTaille` | 0.25 | -8,6 % | — | 0,29 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.arbalete` | 2 | — | -8,6 % | -0,21 | ne pousse que d'un côté |
| `factions.ETAT.parSoldat` | 0.03 | 2,9 % | -8,6 % | -0,21 |  |
| `data.POIDS_BASE.milicien` | 0.35 | -5,7 % | — | 0,19 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | -5,7 % | — | 0,19 | ne pousse que d'un côté |
| `economy.CAISSE.grogneImpayes` | 0.0025 | -5,7 % | — | 0,19 | ne pousse que d'un côté |
| `economy.FERTILITE.desert` | 0.65 | -5,7 % | 2,9 % | 0,07 |  |
| `economy.FERTILITE.brulees` | 0.6 | -5,7 % | — | 0,19 | ne pousse que d'un côté |
| … | | | | | 24 autres |

### villes endettées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | — | -20,5 % | -0,51 | ne pousse que d'un côté |
| `credit.CREDIT.seuilDetresse` | 0.9 | -14,6 % | — | 0,49 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | -14,6 % | -0,37 | ne pousse que d'un côté |

### dette totale

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.CAISSE.parTete` | 12 | — | 85,0 % | 2,13 | ne pousse que d'un côté |
| `data.POIDS_BASE.paysan` | 0.35 | 56,6 % | — | -1,89 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | 53,8 % | — | -1,79 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | 53,5 % | -24,7 % | -0,62 |  |
| `economy.CAISSE.partSalariale` | 0.55 | 48,9 % | 42,9 % | 1,07 |  |
| `factions.ETAT.parDefense` | 0.002 | 40,0 % | — | -1,33 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.jambe_servo` | 3 | — | 52,1 % | 1,30 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | 38,2 % | — | -1,27 | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | 37,1 % | — | -1,24 | ne pousse que d'un côté |
| `data.POIDS_BASE.ouvrier` | 0.13 | — | 48,5 % | 1,21 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.verrou` | 2 | — | 48,0 % | 1,20 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.kevlar` | 2 | — | 48,0 % | 1,20 | ne pousse que d'un côté |
| … | | | | | 14 autres |

### villes cédées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.partDuTresor` | 0.01 | -55,3 % | — | 1,84 | ne pousse que d'un côté |
| `data.POIDS_BASE.marchand` | 0.35 | -44,7 % | — | 1,49 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parVille` | 0.00005 | -40,4 % | — | 1,35 | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | 38,3 % | 23,4 % | 0,59 |  |
| `economy.FERTILITE.marais` | 1.45 | -38,3 % | — | 1,28 | ne pousse que d'un côté |
| `data.POIDS_BASE.ferrailleur` | 0.35 | -36,2 % | -23,4 % | -0,59 |  |
| `data.MENAGES.parTete` | 3 | -31,9 % | 31,9 % | 0,80 |  |
| `data.POIDS_BASE.mineur` | 0.35 | -31,9 % | -31,9 % | -0,80 |  |
| `credit.CESSION.echelleRancune` | 45 | 29,8 % | — | -0,99 | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | -29,8 % | — | 0,99 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.masse` | 3 | — | -38,3 % | -0,96 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | — | -38,3 % | -0,96 | ne pousse que d'un côté |
| … | | | | | 19 autres |

### masse monétaire

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.POIDS_BASE.cantinier` | 0.11 | 56,9 % | -5,4 % | -0,13 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | -25,9 % | 34,4 % | 0,86 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | — | -29,5 % | -0,74 | ne pousse que d'un côté |
| `monnaie.MONNAIE.coursMin` | 0.4 | 9,0 % | -21,2 % | -0,53 |  |
| `economy.CAISSE.partSalariale` | 0.55 | 5,5 % | -20,4 % | -0,51 |  |
| `data.POIDS_BASE.medecin` | 0.35 | 11,8 % | -3,9 % | -0,10 |  |
| `credit.CESSION.primeMax` | 4 | 11,2 % | — | -0,37 | ne pousse que d'un côté |
| `data.POIDS_BASE.mineur` | 0.35 | -6,1 % | -12,2 % | -0,31 |  |
| `economy.FERTILITE.dalles` | 0.95 | — | -11,5 % | -0,29 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | -8,2 % | 6,4 % | 0,16 |  |
| `credit.CREDIT.partDuTresor` | 0.01 | -8,1 % | -7,9 % | -0,20 |  |
| `data.PALIERS_ITEM.machette` | 1 | — | -10,4 % | -0,26 | ne pousse que d'un côté |
| … | | | | | 36 autres |

### argent des ménages

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.POIDS_BASE.cantinier` | 0.11 | 380,1 % | — | -12,67 | ne pousse que d'un côté |
| `credit.CESSION.primeMax` | 4 | 93,1 % | — | -3,10 | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | 65,8 % | — | -2,19 | ne pousse que d'un côté |
| `economy.FERTILITE.desert` | 0.65 | 51,8 % | — | -1,73 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | 66,3 % | 1,66 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | -49,5 % | 60,0 % | 1,50 |  |
| `economy.CAISSE.parTete` | 12 | — | 57,3 % | 1,43 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | -39,8 % | — | 1,33 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | -36,0 % | — | 1,20 | ne pousse que d'un côté |
| `economy.FERTILITE.dalles` | 0.95 | 33,3 % | — | -1,11 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.lance_harpon` | 3 | — | 40,0 % | 1,00 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.jambe_servo` | 3 | — | -35,1 % | -0,88 | ne pousse que d'un côté |
| … | | | | | 1 autres |

### argent des trésors

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `monnaie.MONNAIE.inertie` | 0.7 | — | -40,0 % | -1,00 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | 7,5 % | -34,5 % | -0,86 |  |
| `economy.CAISSE.parTete` | 12 | -23,5 % | 29,0 % | 0,73 |  |
| `monnaie.MONNAIE.coursMin` | 0.4 | 16,6 % | -31,2 % | -0,78 |  |
| `data.POIDS_BASE.cantinier` | 0.11 | 13,2 % | — | -0,44 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | 10,7 % | -8,3 % | -0,21 |  |
| `economy.FERTILITE.dalles` | 0.95 | — | -13,6 % | -0,34 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | 9,9 % | — | -0,33 | ne pousse que d'un côté |
| `factions.ETAT.parSoldat` | 0.03 | 9,4 % | — | -0,31 | ne pousse que d'un côté |
| `monnaie.CHANGE.ecartBase` | 0.12 | -9,2 % | — | 0,31 | ne pousse que d'un côté |
| `credit.CREDIT.seuilDetresse` | 0.9 | — | -11,1 % | -0,28 | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | 8,1 % | — | -0,27 | ne pousse que d'un côté |
| … | | | | | 10 autres |

## Les leviers vivants, par force

| levier | valeur | ce qu'il commande |
|---|---:|---|
| `data.POIDS_BASE.cantinier` | 0.11 | argent des ménages -12,67, masse monétaire -0,13, dette totale -1,79, guerres 1,59 |
| `monnaie.MONNAIE.inertie` | 0.7 | factions écrasées 12,50, accords -1,55, argent des ménages 1,20, argent des trésors -1,00 |
| `economy.CAISSE.partSalariale` | 0.55 | factions écrasées 10,00, argent des ménages 1,66, dette totale 1,07, argent des trésors -0,86 |
| `credit.CESSION.primeMax` | 4 | argent des ménages -3,10, masse monétaire -0,37, bourses -0,10 |
| `credit.CREDIT.partDuTresor` | 0.01 | accords 2,54, villes affamées 2,53, villes cédées 1,84, argent des ménages 1,33 |
| `data.POIDS_BASE.medecin` | 0.35 | argent des ménages -2,19, dette totale -1,24, villes cédées -0,74, convois 0,71 |
| `economy.CAISSE.parTete` | 12 | dette totale 2,13, argent des ménages 1,43, villes cédées 0,92, masse monétaire 0,86 |
| `data.POIDS_BASE.paysan` | 0.35 | dette totale -1,89, convois -0,34, villes debout -0,14, masse monétaire 0,14 |
| `economy.SUREXTENSION.parCase` | 0.00001 | dette totale -0,62, villes cédées -0,96, convois 0,40, argent des trésors -0,21 |
| `economy.FERTILITE.plastique` | 0.75 | guerres 1,75, villes cédées 0,78, population 0,51, convois 0,20 |
| `economy.FERTILITE.desert` | 0.65 | argent des ménages -1,73, villes cédées -0,85, convois 0,25, masse monétaire -0,26 |
| `data.MENAGES.parTete` | 3 | argent des ménages 1,50, villes cédées 0,80, population 0,88, dette totale 0,87 |
| `economy.CAISSE.grogneImpayes` | 0.0025 | guerres 1,59, argent des trésors 0,25, bourses 0,19, villes debout -0,16 |
| `data.POIDS_BASE.marchand` | 0.35 | villes cédées 1,49, villes nourries -0,36, convois -0,33, villes debout -0,14 |
| `monnaie.MONNAIE.coursMin` | 0.4 | accords -1,43, argent des trésors -0,78, population 0,57, masse monétaire -0,53 |
| `economy.SUREXTENSION.parVille` | 0.00005 | villes cédées 1,35, convois -0,39, bourses 0,29, villes debout -0,13 |
| `factions.ETAT.parDefense` | 0.002 | dette totale -1,33, convois 0,42, argent des trésors -0,18, masse monétaire -0,15 |
| `data.PALIERS_ITEM.jambe_servo` | 3 | dette totale 1,30, argent des ménages -0,88, convois -0,20, argent des trésors 0,19 |
| `economy.FERTILITE.marais` | 1.45 | villes cédées 1,28, dette totale 0,82, bourses 0,07, argent des trésors 0,26 |
| `economy.FERTILITE.steppe` | 1.15 | dette totale -1,27, villes cédées -0,64, population -0,41, convois 0,45 |
| `data.POIDS_BASE.ouvrier` | 0.13 | dette totale 1,21, convois 0,29, villes nourries 0,30, masse monétaire 0,18 |
| `data.POIDS_BASE.ferrailleur` | 0.35 | villes cédées -0,59, convois 0,27, bourses 0,07, masse monétaire -0,09 |
| `data.PALIERS_ITEM.verrou` | 2 | dette totale 1,20, villes cédées 0,53, convois -0,31, villes nourries 0,30 |
| `data.PALIERS_ITEM.kevlar` | 2 | dette totale 1,20, villes cédées 0,53, convois -0,31, villes nourries 0,30 |
| `economy.SUREXTENSION.seuil` | 8 | dette totale -1,15, convois -0,20, villes debout 0,17 |
| `factions.ETAT.parSoldat` | 0.03 | dette totale 1,14, argent des trésors -0,31, masse monétaire -0,23, convois 0,22 |
| `credit.CREDIT.seuilDetresse` | 0.9 | dette totale 1,11, villes cédées -0,59, villes endettées 0,49, population -0,42 |
| `economy.FERTILITE.dalles` | 0.95 | argent des ménages -1,11, villes cédées -0,64, convois 0,41, argent des trésors -0,34 |
| `economy.FERTILITE.friche` | 0.7 | guerres -1,07, dette totale 0,94, villes cédées 0,74, convois -0,42 |
| `data.POIDS_BASE.mineur` | 0.35 | villes cédées -0,80, dette totale -1,00, argent des ménages -0,85, population -0,38 |
| `data.PALIERS_ITEM.lance_harpon` | 3 | argent des ménages 1,00, villes cédées 0,85, dette totale 0,80, masse monétaire 0,11 |
| `credit.CESSION.echelleRancune` | 45 | villes cédées -0,99, convois -0,47, villes debout -0,14, bourses 0,07 |
| `economy.SOLVABILITE.plancher` | 0.35 | villes cédées 0,99, dette totale -0,97, convois -0,20, bourses 0,29 |
| `data.PALIERS_ITEM.masse` | 3 | villes cédées -0,96, population -0,42, villes debout -0,13, masse monétaire -0,11 |
| `economy.FERTILITE.brulees` | 0.6 | dette totale -0,90, villes nourries -0,35, convois -0,25, masse monétaire -0,07 |
| `monnaie.MONNAIE.primeConfiance` | 3.75 | dette totale -0,86, villes debout -0,21, masse monétaire -0,12, bourses -0,10 |
| `credit.CREDIT.grogneDefaut` | 0.25 | dette totale -0,80, villes cédées -0,53, convois -0,38, villes debout -0,17 |
| `data.PALIERS_ITEM.hachoir` | 1 | villes cédées -0,80, convois 0,30 |
| `monnaie.CHANGE.ecartBase` | 0.12 | villes cédées -0,80, convois 0,34, argent des trésors 0,31, masse monétaire -0,09 |
| `data.PALIERS_ITEM.bras_hydro` | 3 | villes cédées -0,74, convois 0,23, villes debout -0,13, bourses 0,07 |
| `data.PALIERS_ITEM.pompe` | 2 | dette totale 0,72, villes debout -0,13, masse monétaire -0,12 |
| `data.PALIERS_ITEM.smg` | 2 | villes cédées -0,64, convois 0,51, masse monétaire -0,11 |
| `data.PALIERS_ITEM.harnais` | 1 | villes cédées 0,59, villes nourries 0,36, convois 0,20, bourses 0,07 |
| `data.PALIERS_ITEM.katana` | 2 | villes cédées -0,53, bourses -0,14, masse monétaire 0,13 |
| `data.POIDS_BASE.artisan` | 0.35 | villes cédées -0,53, convois 0,48, masse monétaire -0,10, bourses 0,07 |
| `data.PALIERS_ITEM.machette` | 1 | population -0,41, masse monétaire -0,26, argent des trésors -0,21, villes debout -0,12 |
| `data.POIDS_BASE.milicien` | 0.35 | convois 0,39, villes nourries 0,26, masse monétaire 0,08, bourses 0,19 |
| `factions.ETAT.parMur` | 0.05 | convois 0,39, masse monétaire 0,08 |
| `monnaie.CHANGE.remiseTaille` | 0.25 | bourses 0,29, masse monétaire 0,21 |
| `economy.FERTILITE.canyons` | 0.8 | convois 0,27, masse monétaire 0,07, bourses 0,07 |
| `monnaie.CHANGE.remiseAccord` | 0.5 | argent des trésors -0,24, masse monétaire -0,12, bourses 0,07 |
| `data.PALIERS_ITEM.plaque` | 1 | argent des trésors -0,22, masse monétaire -0,18, bourses -0,14 |
| `data.PALIERS_ITEM.arbalete` | 2 | bourses -0,21, villes debout -0,16, masse monétaire -0,09 |
| `economy.SOLVABILITE.plafond` | 20 | masse monétaire 0,16 |
| `credit.CESSION.primeMin` | 0.4 | villes debout -0,14, masse monétaire -0,09 |
| `factions.ETAT.desertion` | 0.004 | bourses -0,10 |
| `monnaie.MONNAIE.coursMax` | 4 | bourses -0,10 |

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
- `allegeance.URGENCE_ORDRE.prime` = 1.5
- `base.AMENDEMENT_MAX.semoir` = 0.55
- `base.AMENDEMENT_MAX.terraformeur` = 0.9
- `base.COUT_FONDATION.ferraille` = 110
- `connaissance.DELAI_NOUVELLE.guerre` = 12
- `connaissance.DELAI_NOUVELLE.paix` = 18
- `connaissance.DELAI_NOUVELLE.capture` = 48
- `connaissance.DELAI_NOUVELLE.effondrement` = 72
- `connaissance.DELAI_NOUVELLE.secession` = 60
- `connaissance.DELAI_NOUVELLE.fondation` = 96
- `connaissance.DELAI_NOUVELLE.croissance` = 120
- `credit.CREDIT.heuresCouvertes` = 240
- `credit.CREDIT.partServiceDette` = 0.25
- `data.PALIERS_ITEM.rail` = 3
- `data.PALIERS_ITEM.exo` = 3
- `data.PALIERS_ITEM.oeil_optique` = 3
- `data.PALIERS_ITEM.coeur_synth` = 3
- `economy.CAISSE.marge` = 0.1
- `economy.FERTILITE.relais` = 0.5
- `monnaie.CHANGE.remiseEstime` = 0.3
- `monnaie.MONNAIE.horizonGage` = 720

## Ce qui n'est pas sur la carte

La convention `module.OBJET.champ` du banc n'atteint pas les objets
imbriqués. Ces champs-là existent et pèsent peut-être lourd — ils ne sont
simplement pas mesurés ici. Le dire est le minimum : une carte muette sur
ses trous se lit comme une carte complète.

- **imbriqué — hors de portée de module.OBJET.champ** : 280 champs — SERVICES.corpo, SERVICES.militaire, SERVICES.commune, SERVICES.nomade, SERVICES.fanatique, SERVICES.criminel, BETES.brahmine, BETES.mulet, BETES.charrette, METEO.clair…
- **à zéro — aucun facteur ne le déplace** : 5 champs — DELAI_NOUVELLE.saison, PALIERS_ITEM.barre, PALIERS_ITEM.clous, PALIERS_ITEM.cuir, PALIERS_ITEM.manteau
- **pas un nombre** : 31 champs — DIPLOME_ARCHETYPE.medic, DIPLOME_ARCHETYPE.ferrailleur, DIPLOME_ARCHETYPE.courtier, DIPLOME_ARCHETYPE.eclaireur, DIPLOME_ARCHETYPE.chasseur, DIPLOME_ARCHETYPE.brute, SKILLS.force, SKILLS.endurance, SKILLS.melee, SKILLS.tir…
- **modules non chargeables hors navigateur** : main.js

La vitesse du tick n'est pas cartographiée non plus : elle dépend de la
charge de la machine, pas du monde. Elle se mesure au calme, avec ses deux
gardes, par `verifier --complet`.

Enfin, la carte donne des effets **isolés** : un levier à la fois, tous les
autres au repos. Deux leviers qui se compensent ne se lisent pas dessus.
