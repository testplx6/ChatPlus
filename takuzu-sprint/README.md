# ⚡ Takuzu Sprint

Un jeu de logique dans l'esprit du sudoku — chaque grille a une **solution unique** et se résout par pure déduction — mais avec des règles différentes et des **parties beaucoup plus rapides**. Les records sont suivis **sur plusieurs parties**.

## Les règles

Remplis la grille avec deux symboles, ☀️ (soleil) et 🌙 (lune) :

1. **Jamais trois symboles identiques** côte à côte, en ligne ou en colonne.
2. Chaque ligne et chaque colonne contient **autant de soleils que de lunes**.
3. **Deux lignes identiques** (ou deux colonnes identiques) sont **interdites**.

C'est le principe du Takuzu (aussi appelé Binairo ou « sudoku binaire »).

## Parties éclair

Trois tailles de grille :

| Taille | Durée typique |
|--------|---------------|
| 4×4    | ~30 secondes  |
| 6×6    | 1 à 2 minutes |
| 8×8    | pour les experts |

Chaque puzzle est généré aléatoirement avec une solution unique garantie. Le chrono démarre à l'affichage de la grille et s'arrête dès qu'elle est correctement remplie.

## Records sur plusieurs parties

Suivis séparément pour chaque taille de grille (sauvegardés en local dans le navigateur) :

- 🏆 **Meilleur temps**
- 📈 **Moyenne des 5 dernières victoires** — et la meilleure moyenne de 5 jamais atteinte
- 🔥 **Série de victoires** en cours et record de série (abandonner une partie commencée casse la série !)
- 📊 **Historique** des dernières parties et ratio victoires / parties jouées

## Commandes

- **Clic** sur une case : vide → ☀️ → 🌙 → vide
- **Clic droit** : cycle en sens inverse
- Les cases en conflit avec une règle sont surlignées en rouge en temps réel

## Lancer le jeu

Aucune dépendance, aucun build : c'est du HTML/CSS/JavaScript pur.

```bash
# ouvrir directement le fichier…
open takuzu-sprint/index.html

# …ou servir le dossier
npx serve takuzu-sprint
```
