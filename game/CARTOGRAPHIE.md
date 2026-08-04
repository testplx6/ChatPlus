# La carte des leviers

Ce que chaque constante du moteur commande, et de combien. Document
**produit par la mesure** — il se régénère, il ne se modifie pas à la main :

```
node tools/banc.js --cartographie
```

Révision `6aa29cf` — 84 leviers sur 84 recensés, 2 graines × 1200 h.

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

`credit.CREDIT.seuilDetresse`, `data.MENAGES.parTete`, `economy.CAISSE.partSalariale`, `factions.ETAT.parDefense`, `monnaie.CHANGE.ecartBase`

| métrique | valeur de référence | plancher de bruit |
|---|---:|---:|
| population | 18427 | 4,9 % |
| villes debout | 82 | 3,1 % |
| villes nourries | 57 | 11,4 % |
| villes affamées | 23 | 30,4 % |
| factions écrasées | 0 | 0,0 % |
| guerres | 3 | 50,0 % |
| convois | 352 | 5,8 % |
| accords | 0 | — |
| bourses | 3 | 40,0 % |
| villes endettées | 53 | 3,8 % |
| dette totale | 8171 | 4,7 % |
| villes cédées | 0 | 0,0 % |
| masse monétaire | 389107 | 2,5 % |
| argent des ménages | 87530 | 17,1 % |
| argent des trésors | 132437 | 19,1 % |

Un plancher élevé n'est pas un défaut de l'instrument : c'est une propriété
du monde. Les factions écrasées se comptent sur les doigts d'une main — une
de plus ou de moins, et le pourcentage saute. Ces métriques-là exigent
beaucoup avant qu'on puisse conclure, et c'est justement ce qu'il fallait
savoir avant de prétendre les régler.

## Ce que chaque métrique commande — les leviers, par métrique

### population

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.SUREXTENSION.parVille` | 0.00005 | 15,4 % | 7,5 % | 0,19 |  |
| `factions.ETAT.parSoldat` | 0.03 | 14,3 % | — | -0,48 | ne pousse que d'un côté |
| `economy.FERTILITE.friche` | 0.7 | — | 16,8 % | 0,42 | ne pousse que d'un côté |
| `factions.ETAT.parMur` | 0.05 | 9,7 % | 9,0 % | 0,23 |  |
| `data.POIDS_BASE.ouvrier` | 0.13 | — | 12,1 % | 0,30 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | -8,8 % | — | 0,29 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.jambe_servo` | 3 | — | 11,6 % | 0,29 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.plaque` | 1 | — | 11,5 % | 0,29 | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | 8,3 % | — | -0,28 | ne pousse que d'un côté |
| `data.POIDS_BASE.paysan` | 0.35 | — | 10,9 % | 0,27 | ne pousse que d'un côté |
| `data.POIDS_BASE.ferrailleur` | 0.35 | 8,2 % | — | -0,27 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | 6,3 % | 10,8 % | 0,27 |  |
| … | | | | | 21 autres |

### villes debout

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.SUREXTENSION.parVille` | 0.00005 | 11,7 % | — | -0,39 | ne pousse que d'un côté |
| `factions.ETAT.parSoldat` | 0.03 | 9,2 % | — | -0,31 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.jambe_servo` | 3 | — | 9,8 % | 0,25 | ne pousse que d'un côté |
| `economy.FERTILITE.friche` | 0.7 | — | 9,2 % | 0,23 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | 6,7 % | 4,9 % | 0,12 |  |
| `factions.ETAT.parMur` | 0.05 | 6,1 % | 8,6 % | 0,21 |  |
| `credit.CREDIT.partDuTresor` | 0.01 | -6,1 % | 3,7 % | 0,09 |  |
| `data.PALIERS_ITEM.masse` | 3 | — | -8,0 % | -0,20 | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | — | 7,4 % | 0,18 | ne pousse que d'un côté |
| `data.POIDS_BASE.mineur` | 0.35 | 5,5 % | — | -0,18 | ne pousse que d'un côté |
| `data.POIDS_BASE.milicien` | 0.35 | -5,5 % | — | 0,18 | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | 5,5 % | 4,3 % | 0,11 |  |
| … | | | | | 20 autres |

### villes nourries

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.MENAGES.parTete` | 3 | 27,2 % | — | -0,91 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | -21,9 % | 12,3 % | 0,31 |  |
| `data.PALIERS_ITEM.jambe_servo` | 3 | — | 28,9 % | 0,72 | ne pousse que d'un côté |
| `economy.FERTILITE.plastique` | 0.75 | — | 28,9 % | 0,72 | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | 17,5 % | 28,1 % | 0,70 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | — | -28,1 % | -0,70 | ne pousse que d'un côté |
| `credit.CREDIT.seuilDetresse` | 0.9 | 20,2 % | — | -0,67 | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | — | 24,6 % | 0,61 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | 18,4 % | 24,6 % | 0,61 |  |
| `factions.ETAT.parSoldat` | 0.03 | 18,4 % | — | -0,61 | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | 16,7 % | — | -0,56 | ne pousse que d'un côté |
| `factions.ETAT.parMur` | 0.05 | — | 21,9 % | 0,55 | ne pousse que d'un côté |
| … | | | | | 9 autres |

### villes affamées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `data.MENAGES.parTete` | 3 | -69,6 % | — | 2,32 | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | -37,0 % | -69,6 % | -1,74 |  |
| `economy.CAISSE.partSalariale` | 0.55 | -52,2 % | — | 1,74 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | -47,8 % | -37,0 % | -0,92 |  |
| `economy.FERTILITE.steppe` | 1.15 | -43,5 % | -58,7 % | -1,47 |  |
| `credit.CREDIT.seuilDetresse` | 0.9 | -43,5 % | — | 1,45 | ne pousse que d'un côté |
| `economy.FERTILITE.plastique` | 0.75 | — | -56,5 % | -1,41 | ne pousse que d'un côté |
| `factions.ETAT.parMur` | 0.05 | — | -56,5 % | -1,41 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | 41,3 % | — | -1,38 | ne pousse que d'un côté |
| `economy.SUREXTENSION.seuil` | 8 | -39,1 % | -52,2 % | -1,30 |  |
| `economy.FERTILITE.canyons` | 0.8 | -39,1 % | — | 1,30 | ne pousse que d'un côté |
| `data.POIDS_BASE.ferrailleur` | 0.35 | — | -47,8 % | -1,20 | ne pousse que d'un côté |
| … | | | | | 16 autres |

### factions écrasées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.seuilDetresse` | 0.9 | — | — | — |  |
| `credit.CREDIT.partDuTresor` | 0.01 | — | — | — | ne pousse que d'un côté |
| `data.PALIERS_ITEM.arbalete` | 2 | — | — | — | ne pousse que d'un côté |
| `data.PALIERS_ITEM.pompe` | 2 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.ferrailleur` | 0.35 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.medecin` | 0.35 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.marchand` | 0.35 | — | — | — |  |
| `economy.CAISSE.partSalariale` | 0.55 | — | — | — | ne pousse que d'un côté |
| `economy.FERTILITE.dalles` | 0.95 | — | — | — | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | — | — | — | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | — | — | — | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | — | — | — | ne pousse que d'un côté |

### guerres

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.grogneDefaut` | 0.25 | 133,3 % | — | -4,44 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | — | 116,7 % | 2,92 | ne pousse que d'un côté |
| `data.POIDS_BASE.ouvrier` | 0.13 | 66,7 % | — | -2,22 | ne pousse que d'un côté |
| `economy.SOLVABILITE.plancher` | 0.35 | — | -83,3 % | -2,08 | ne pousse que d'un côté |
| `monnaie.MONNAIE.inertie` | 0.7 | — | 83,3 % | 2,08 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.hachoir` | 1 | — | 66,7 % | 1,67 | ne pousse que d'un côté |
| `data.POIDS_BASE.milicien` | 0.35 | — | 66,7 % | 1,67 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | — | 66,7 % | 1,67 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | — | 66,7 % | 1,67 | ne pousse que d'un côté |

### convois

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.CAISSE.parTete` | 12 | -48,4 % | 26,3 % | 0,66 |  |
| `economy.FERTILITE.marais` | 1.45 | 41,8 % | 59,7 % | 1,49 |  |
| `economy.FERTILITE.steppe` | 1.15 | 18,8 % | 56,1 % | 1,40 |  |
| `data.POIDS_BASE.medecin` | 0.35 | -34,5 % | 19,9 % | 0,50 |  |
| `factions.ETAT.parMur` | 0.05 | -31,5 % | 37,2 % | 0,93 |  |
| `credit.CREDIT.grogneDefaut` | 0.25 | 31,0 % | 17,5 % | 0,44 |  |
| `data.POIDS_BASE.paysan` | 0.35 | -29,4 % | — | 0,98 | ne pousse que d'un côté |
| `economy.FERTILITE.brulees` | 0.6 | 26,6 % | 28,8 % | 0,72 |  |
| `economy.FERTILITE.plastique` | 0.75 | — | 34,1 % | 0,85 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.bras_hydro` | 3 | — | 31,7 % | 0,79 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.arbalete` | 2 | — | -31,5 % | -0,79 | ne pousse que d'un côté |
| `factions.ETAT.parSoldat` | 0.03 | 23,4 % | -18,3 % | -0,46 |  |
| … | | | | | 39 autres |

### accords

**Aucun levier.** Aucune constante plate du moteur ne déplace cette
métrique au-delà du bruit. Ce n'est pas un réglage à trouver : c'est une
structure à changer.

### bourses

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.FERTILITE.marais` | 1.45 | 80,0 % | 120,0 % | 3,00 |  |
| `economy.SUREXTENSION.parCase` | 0.00001 | 80,0 % | 60,0 % | 1,50 |  |
| `economy.FERTILITE.steppe` | 1.15 | 60,0 % | 100,0 % | 2,50 |  |
| `data.PALIERS_ITEM.harnais` | 1 | — | 80,0 % | 2,00 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.jambe_servo` | 3 | — | 80,0 % | 2,00 | ne pousse que d'un côté |
| `data.POIDS_BASE.mineur` | 0.35 | — | 80,0 % | 2,00 | ne pousse que d'un côté |
| `data.POIDS_BASE.artisan` | 0.35 | — | 80,0 % | 2,00 | ne pousse que d'un côté |
| `economy.FERTILITE.brulees` | 0.6 | 60,0 % | 80,0 % | 2,00 |  |
| `factions.ETAT.parMur` | 0.05 | — | 80,0 % | 2,00 | ne pousse que d'un côté |
| `credit.CREDIT.grogneDefaut` | 0.25 | 60,0 % | — | -2,00 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | 60,0 % | — | -2,00 | ne pousse que d'un côté |
| `economy.FERTILITE.friche` | 0.7 | 60,0 % | 60,0 % | 1,50 |  |
| … | | | | | 12 autres |

### villes endettées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.FERTILITE.steppe` | 1.15 | 34,0 % | 13,2 % | 0,33 |  |
| `factions.ETAT.parMur` | 0.05 | 34,0 % | 17,0 % | 0,42 |  |
| `data.POIDS_BASE.paysan` | 0.35 | 30,2 % | -5,7 % | -0,14 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parVille` | 0.00005 | 27,4 % | 4,7 % | 0,12 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | — | 35,8 % | 0,90 | ne pousse que d'un côté |
| `economy.FERTILITE.brulees` | 0.6 | 25,5 % | 19,8 % | 0,50 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | 25,5 % | — | -0,85 | ne pousse que d'un côté |
| `factions.ETAT.parSoldat` | 0.03 | 24,5 % | 7,5 % | 0,19 |  |
| `economy.FERTILITE.friche` | 0.7 | — | 31,1 % | 0,78 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.verrou` | 2 | — | 29,2 % | 0,73 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.katana` | 2 | — | 29,2 % | 0,73 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.kevlar` | 2 | — | 29,2 % | 0,73 | ne pousse que d'un côté |
| … | | | | | 39 autres |

### dette totale

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.partDuTresor` | 0.01 | -15,6 % | 114,4 % | 2,86 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | 76,4 % | 62,4 % | 1,56 |  |
| `factions.ETAT.parMur` | 0.05 | 66,0 % | 67,6 % | 1,69 |  |
| `economy.SUREXTENSION.parVille` | 0.00005 | 62,3 % | — | -2,08 | ne pousse que d'un côté |
| `economy.SUREXTENSION.parCase` | 0.00001 | 59,0 % | — | -1,97 | ne pousse que d'un côté |
| `economy.FERTILITE.desert` | 0.65 | 51,9 % | 45,5 % | 1,14 |  |
| `factions.ETAT.parSoldat` | 0.03 | 51,0 % | 7,6 % | 0,19 | ne pousse que d'un côté |
| `economy.FERTILITE.plastique` | 0.75 | 50,2 % | 38,9 % | 0,97 |  |
| `data.POIDS_BASE.artisan` | 0.35 | 47,0 % | 39,5 % | 0,99 |  |
| `economy.FERTILITE.friche` | 0.7 | 34,3 % | 57,7 % | 1,44 |  |
| `economy.FERTILITE.brulees` | 0.6 | 40,1 % | 51,5 % | 1,29 |  |
| `credit.CREDIT.grogneDefaut` | 0.25 | 39,9 % | 29,6 % | 0,74 |  |
| … | | | | | 38 autres |

### villes cédées

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `credit.CREDIT.seuilDetresse` | 0.9 | — | — | — | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | — | — | — | ne pousse que d'un côté |
| `data.PALIERS_ITEM.hachoir` | 1 | — | — | — | ne pousse que d'un côté |
| `data.PALIERS_ITEM.lance_harpon` | 3 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.paysan` | 0.35 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.ferrailleur` | 0.35 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.artisan` | 0.35 | — | — | — |  |
| `data.POIDS_BASE.medecin` | 0.35 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.marchand` | 0.35 | — | — | — | ne pousse que d'un côté |
| `data.POIDS_BASE.cantinier` | 0.11 | — | — | — | ne pousse que d'un côté |
| `economy.CAISSE.partSalariale` | 0.55 | — | — | — | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | — | — | — | ne pousse que d'un côté |
| … | | | | | 11 autres |

### masse monétaire

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.CAISSE.parTete` | 12 | -20,5 % | 36,6 % | 0,91 |  |
| `factions.ETAT.parSoldat` | 0.03 | 11,2 % | — | -0,37 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | -11,0 % | 3,8 % | 0,10 |  |
| `economy.SUREXTENSION.parVille` | 0.00005 | 6,8 % | — | -0,23 | ne pousse que d'un côté |
| `factions.ETAT.parMur` | 0.05 | 6,5 % | 2,9 % | 0,07 |  |
| `economy.CAISSE.partSalariale` | 0.55 | -5,8 % | -7,5 % | -0,19 |  |
| `economy.FERTILITE.canyons` | 0.8 | -5,7 % | 6,6 % | 0,17 |  |
| `economy.FERTILITE.brulees` | 0.6 | -4,9 % | — | 0,16 | ne pousse que d'un côté |
| `credit.CREDIT.seuilDetresse` | 0.9 | — | -6,4 % | -0,16 | ne pousse que d'un côté |
| `data.POIDS_BASE.milicien` | 0.35 | -4,8 % | — | 0,16 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | -4,7 % | 4,4 % | 0,11 |  |
| `data.POIDS_BASE.artisan` | 0.35 | 4,6 % | — | -0,15 | ne pousse que d'un côté |
| … | | | | | 25 autres |

### argent des ménages

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.CAISSE.partSalariale` | 0.55 | -51,4 % | 32,0 % | 0,80 |  |
| `monnaie.MONNAIE.inertie` | 0.7 | — | 67,9 % | 1,70 | ne pousse que d'un côté |
| `data.MENAGES.parTete` | 3 | -45,4 % | — | 1,51 | ne pousse que d'un côté |
| `economy.CAISSE.parTete` | 12 | 26,0 % | — | -0,87 | ne pousse que d'un côté |
| `economy.FERTILITE.marais` | 1.45 | -18,6 % | -32,9 % | -0,82 |  |
| `economy.SUREXTENSION.parCase` | 0.00001 | -23,5 % | — | 0,78 | ne pousse que d'un côté |
| `economy.FERTILITE.plastique` | 0.75 | -22,3 % | -23,3 % | -0,58 |  |
| `data.PALIERS_ITEM.verrou` | 2 | — | -29,6 % | -0,74 | ne pousse que d'un côté |
| `data.PALIERS_ITEM.kevlar` | 2 | — | -29,6 % | -0,74 | ne pousse que d'un côté |
| `credit.CREDIT.partDuTresor` | 0.01 | -20,3 % | — | 0,68 | ne pousse que d'un côté |
| `economy.SUREXTENSION.seuil` | 8 | — | -26,3 % | -0,66 | ne pousse que d'un côté |
| `factions.ETAT.parMur` | 0.05 | — | -26,2 % | -0,66 | ne pousse que d'un côté |
| … | | | | | 8 autres |

### argent des trésors

| levier | valeur | ×0,7 | ×1,4 | élasticité | |
|---|---:|---:|---:|---:|---|
| `economy.SUREXTENSION.parCase` | 0.00001 | 31,6 % | — | -1,05 | ne pousse que d'un côté |
| `economy.SUREXTENSION.seuil` | 8 | 28,1 % | 22,1 % | 0,55 |  |
| `factions.ETAT.parMur` | 0.05 | — | 37,1 % | 0,93 | ne pousse que d'un côté |
| `economy.FERTILITE.steppe` | 1.15 | 27,2 % | 26,5 % | 0,66 |  |
| `economy.CAISSE.parTete` | 12 | — | 34,2 % | 0,86 | ne pousse que d'un côté |
| `economy.FERTILITE.friche` | 0.7 | 22,3 % | 20,0 % | 0,50 |  |
| `economy.FERTILITE.marais` | 1.45 | — | 28,3 % | 0,71 | ne pousse que d'un côté |
| `data.POIDS_BASE.artisan` | 0.35 | 20,5 % | — | -0,68 | ne pousse que d'un côté |
| `data.POIDS_BASE.ferrailleur` | 0.35 | — | 21,3 % | 0,53 | ne pousse que d'un côté |

## Les leviers vivants, par force

| levier | valeur | ce qu'il commande |
|---|---:|---|
| `credit.CREDIT.grogneDefaut` | 0.25 | guerres -4,44, bourses -2,00, dette totale 0,74, villes affamées 1,16 |
| `economy.FERTILITE.marais` | 1.45 | bourses 3,00, villes affamées -1,74, convois 1,49, argent des ménages -0,82 |
| `economy.FERTILITE.steppe` | 1.15 | guerres 2,92, dette totale 1,56, bourses 2,50, villes affamées -1,47 |
| `credit.CREDIT.partDuTresor` | 0.01 | dette totale 2,86, villes endettées 0,90, argent des ménages 0,68, convois -0,26 |
| `economy.SUREXTENSION.parCase` | 0.00001 | bourses 1,50, dette totale -1,97, guerres 1,67, villes affamées -0,92 |
| `data.MENAGES.parTete` | 3 | villes affamées 2,32, bourses -2,00, argent des ménages 1,51, villes nourries -0,91 |
| `data.POIDS_BASE.ouvrier` | 0.13 | guerres -2,22, bourses 1,50, villes affamées 1,09, dette totale 0,79 |
| `factions.ETAT.parMur` | 0.05 | dette totale 1,69, bourses 2,00, villes affamées -1,41, villes endettées 0,42 |
| `economy.SOLVABILITE.plancher` | 0.35 | guerres -2,08, dette totale 1,02, villes endettées 0,64, convois -0,28 |
| `monnaie.MONNAIE.inertie` | 0.7 | guerres 2,08, argent des ménages 1,70, dette totale 0,29, villes endettées -0,85 |
| `economy.SUREXTENSION.parVille` | 0.00005 | dette totale -2,08, bourses -2,00, villes endettées 0,12, villes nourries -0,53 |
| `data.PALIERS_ITEM.harnais` | 1 | bourses 2,00, dette totale 1,24, villes affamées -0,82, villes endettées 0,54 |
| `data.PALIERS_ITEM.jambe_servo` | 3 | bourses 2,00, villes affamées -1,03, dette totale 0,81, villes nourries 0,72 |
| `data.POIDS_BASE.mineur` | 0.35 | bourses 2,00, villes affamées -0,87, convois 0,67, villes endettées -0,53 |
| `data.POIDS_BASE.artisan` | 0.35 | bourses 2,00, dette totale 0,99, villes affamées -0,82, villes endettées 0,26 |
| `economy.FERTILITE.brulees` | 0.6 | bourses 2,00, dette totale 1,29, villes affamées -1,14, convois 0,72 |
| `economy.FERTILITE.friche` | 0.7 | bourses 1,50, dette totale 1,44, villes endettées 0,78, argent des trésors 0,50 |
| `economy.SUREXTENSION.seuil` | 8 | bourses 1,50, villes affamées -1,30, argent des trésors 0,55, dette totale 0,85 |
| `monnaie.MONNAIE.coursMin` | 0.4 | bourses 1,50, dette totale 0,78, convois 0,55, villes endettées 0,28 |
| `economy.CAISSE.partSalariale` | 0.55 | villes affamées 1,74, argent des ménages 0,80, dette totale -0,58, villes nourries -0,56 |
| `economy.FERTILITE.desert` | 0.65 | dette totale 1,14, convois -0,60, villes endettées 0,54, masse monétaire 0,08 |
| `factions.ETAT.parSoldat` | 0.03 | dette totale 0,19, villes endettées 0,19, convois -0,46, villes nourries -0,61 |
| `economy.FERTILITE.plastique` | 0.75 | dette totale 0,97, bourses 1,50, villes affamées -1,41, convois 0,85 |
| `data.PALIERS_ITEM.hachoir` | 1 | guerres 1,67, villes affamées -0,82, convois 0,36, villes endettées 0,33 |
| `data.POIDS_BASE.milicien` | 0.35 | guerres 1,67, bourses 1,50, dette totale 1,07, villes affamées -0,92 |
| `economy.CAISSE.parTete` | 12 | guerres 1,67, convois 0,66, villes affamées -1,38, dette totale 1,30 |
| `data.PALIERS_ITEM.machette` | 1 | bourses 1,50, villes affamées -1,03, dette totale 0,72, villes endettées 0,66 |
| `data.PALIERS_ITEM.verrou` | 2 | bourses 1,50, dette totale 1,06, villes affamées -0,92, argent des ménages -0,74 |
| `data.PALIERS_ITEM.katana` | 2 | bourses 1,50, villes affamées -0,87, dette totale 0,86, villes endettées 0,73 |
| `data.PALIERS_ITEM.kevlar` | 2 | bourses 1,50, dette totale 1,06, villes affamées -0,92, argent des ménages -0,74 |
| `data.PALIERS_ITEM.bras_hydro` | 3 | bourses 1,50, villes affamées -1,03, convois 0,79, dette totale 0,43 |
| `data.POIDS_BASE.medecin` | 0.35 | bourses 1,50, dette totale 1,26, convois 0,50, villes affamées -1,03 |
| `credit.CREDIT.seuilDetresse` | 0.9 | villes affamées 1,45, villes nourries -0,67, argent des ménages -0,48, convois -0,41 |
| `economy.FERTILITE.canyons` | 0.8 | villes affamées 1,30, dette totale 0,92, villes endettées 0,73, argent des ménages 0,59 |
| `economy.FERTILITE.dalles` | 0.95 | dette totale 0,50, villes affamées -1,09, villes endettées 0,50, villes nourries 0,31 |
| `data.POIDS_BASE.ferrailleur` | 0.35 | villes affamées -1,20, dette totale 0,70, villes endettées 0,38, argent des ménages -0,66 |
| `data.POIDS_BASE.paysan` | 0.35 | dette totale -1,18, villes endettées -0,14, convois 0,98, population 0,27 |
| `monnaie.MONNAIE.primeConfiance` | 3.75 | dette totale 0,64, villes endettées 0,35, convois -0,19, masse monétaire 0,11 |
| `data.PALIERS_ITEM.smg` | 2 | dette totale 0,81, villes endettées 0,33, convois 0,28, masse monétaire -0,09 |
| `data.PALIERS_ITEM.arbalete` | 2 | convois -0,79, dette totale 0,27, villes endettées 0,24, population 0,20 |
| `data.POIDS_BASE.marchand` | 0.35 | dette totale 0,76, villes endettées 0,21, convois -0,17, population 0,13 |
| `data.POIDS_BASE.cantinier` | 0.11 | dette totale 0,75, convois -0,72, villes endettées 0,38, villes cédées — |
| `factions.ETAT.parDefense` | 0.002 | villes endettées 0,52, argent des ménages -0,53, convois 0,31, dette totale 0,49 |
| `data.PALIERS_ITEM.rail` | 3 | convois -0,68, dette totale 0,24, population 0,16, villes endettées 0,12 |
| `data.PALIERS_ITEM.exo` | 3 | convois -0,68, dette totale 0,24, population 0,16, villes endettées 0,12 |
| `data.PALIERS_ITEM.oeil_optique` | 3 | convois -0,68, dette totale 0,24, population 0,16, villes endettées 0,12 |
| `data.PALIERS_ITEM.coeur_synth` | 3 | convois -0,68, dette totale 0,24, population 0,16, villes endettées 0,12 |
| `monnaie.CHANGE.ecartBase` | 0.12 | dette totale 0,63, villes endettées 0,33, convois 0,30, population -0,17 |
| `data.PALIERS_ITEM.lance_harpon` | 3 | dette totale 0,59, villes endettées 0,21, convois -0,18, masse monétaire -0,07 |
| `monnaie.CHANGE.remiseTaille` | 0.25 | convois -0,25, dette totale 0,46, villes endettées 0,21, villes debout -0,12 |
| `data.PALIERS_ITEM.plaque` | 1 | convois -0,37, population 0,29, villes debout 0,14, villes endettées 0,12 |
| `data.PALIERS_ITEM.masse` | 3 | villes endettées 0,35, villes debout -0,20, convois -0,18, population -0,15 |
| `data.PALIERS_ITEM.pompe` | 2 | dette totale 0,27, villes debout -0,09, factions écrasées — |

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
- `credit.CESSION.primeMin` = 0.4
- `credit.CESSION.primeMax` = 4
- `credit.CESSION.echelleRancune` = 45
- `credit.CREDIT.heuresCouvertes` = 240
- `credit.CREDIT.partServiceDette` = 0.25
- `economy.CAISSE.marge` = 0.1
- `economy.CAISSE.grogneImpayes` = 0.0025
- `economy.FERTILITE.relais` = 0.5
- `economy.SOLVABILITE.plafond` = 20
- `factions.ETAT.desertion` = 0.004
- `monnaie.CHANGE.remiseAccord` = 0.5
- `monnaie.CHANGE.remiseEstime` = 0.3
- `monnaie.MONNAIE.horizonGage` = 720
- `monnaie.MONNAIE.coursMax` = 4

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
