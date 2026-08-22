# Le siège — le camp qui se défend, le cahier des charges

Ouvert par le propriétaire, août 2026 : « d'abord il faut tout le reste
de la mécanique et des bâtiments », puis « go » sur le chantier combat.
Format METHODE §9. **Rien ne se code avant que le propriétaire ait
validé les lots ci-dessous** — la défense du camp est une règle de jeu.

## 1. Le constat, chiffré

Le moteur sait déjà se battre — et le camp ne s'en sert jamais.

- **`resoudreCombat` existe** : homme par homme, armes, armures,
  membres touchés, cinq tactiques croisées au terrain (l'interception
  vaut 1,3 en steppe, 0,6 en marais). Il sert aux accrochages de
  l'escouade. **Aucun raid, aucun siège ne passe par lui.**
- **Le raid sur le camp est un jet unique** (`tickBase`) : une chance
  par heure (0,0016 × danger × vigilance, 72 h de carence), une force
  (20–45 + le temps + 1,5/habitant), et une comparaison. Défense
  supérieure : « raid repoussé », la défense perd 30 % de la force
  adverse, personne n'a saigné. Défense inférieure : 15–40 % de chaque
  denrée emportés, défense à zéro, le mur perd un niveau à 40 %.
  **L'assaillant n'a pas de nom, la bataille n'a pas eu lieu, vos six
  meilleurs hommes comptent comme un chiffre et ne risquent rien.**
- **Le poste de garde ment** : sa fiche dit « prévenu à temps d'un
  raid, plutôt que réveillé par lui » — mécaniquement il baisse la
  fréquence des raids et sauve jusqu'à 70 % du stock. **Aucune alerte
  n'existe : un raid naît à l'heure où il frappe.**
- **Le siège par une colonne du monde existe et fonctionne** :
  attrition horaire (assaut = force × 0,5–1,1 contre tenue =
  (défense + renfort) × 0,6–1,15 + murs × 2, acharnement de capitale
  ×1,8), le siège se brise sous force 8, l'escouade présente compte à
  l'instant du choc (`renfortAvantPoste`), `menacesSurLaBase` montre
  qui marche et à combien de cases. Mais **le joueur n'a aucun verbe** :
  ni sortie, ni négociation, ni évacuation — il regarde deux nombres
  s'user, et son escouade en renfort ne peut ni être blessée ni mourir.
- L'Essaim saccage (`saccagerAvantPoste`) : stock −35 %, habitants
  −20 %, défense −40 %. Même remarque : personne ne se bat.

## 2. La cause

La défense du camp est née dans le chantier économie — un flux de
pertes à équilibrer, pas un combat à vivre. Le moteur de combat est né
ailleurs, pour l'escouade en voyage. Les deux ne se sont jamais
rencontrés.

## 3. Ce qu'on propose — quatre lots

Principe : **aucun système nouveau — on branche ce qui existe.** Le
raid emprunte `resoudreCombat`, l'alerte emprunte le journal et
`menacesSurLaBase`, la négociation emprunte le trésor des factions et
la rancune. Tout le hasard nouveau se dérive (`grainDe`), zéro tirage
ajouté dans les flux existants — monde comme joueur.

### S1 — le raid est une bataille

L'assaillant a un nom (bandits de la région, Essaim, ou faction en
rancune — dérivé du danger et de l'état du monde, pas tiré). Si
l'escouade est au camp, le raid se résout par `resoudreCombat` :
l'escouade + des miliciens (levés de la population, armés de ce que
l'entrepôt contient) contre la bande nommée. Des blessés, des morts
possibles, du butin réel sur les dépouilles. Sans escouade, la
garnison chiffrée d'aujourd'hui reste l'arbitre — mais le pillage se
gradue (voir décision n°2 pour les habitants).

### S2 — le poste tient sa promesse

Un raid se voit venir : au niveau n du poste (× l'affectation garde),
l'alerte tombe `f(n)` heures avant l'assaut — assez pour rentrer les
stocks (l'actuel bonus de sauvegarde devient l'effet de ce temps
gagné), rappeler un groupe proche, choisir la tactique de défense.
Sans poste : réveillé par le raid, comme aujourd'hui. La fiche du
bâtiment redevient vraie.

### S3 — les verbes du siège

Quand une colonne investit le camp, quatre choix, chacun avec son
prix :

- **Tenir** — l'attrition actuelle, inchangée côté monde.
- **Sortir** — une bataille rangée par `resoudreCombat` contre un
  détachement de la colonne ; la gagner affaiblit le siège, la perdre
  laisse le camp nu.
- **Négocier** — lever le siège contre des crédits ; le prix suit la
  force restante et la rancune. L'Essaim ne négocie pas (il ne
  gouverne pas, il saigne).
- **Évacuer** — emporter ce que la charge permet, abandonner la place
  debout. Perdre le camp sans perdre les gens.

### S4 — les murs et la brèche

Le siège use les murs, pas seulement la défense : `col.murs` descend
sous les assauts, et un mur en brèche retire son terme (`murs × 2`) de
la tenue — c'est la course que le défenseur peut lire. La réparation
coûte de l'alliage et des heures de maçon (affectation existante des
bâtisseurs). Le raid de bandits, lui, ne fait plus tomber un niveau de
mur à pile ou face : il use `col.murs` de la même encre.

## 4. Le raccord à l'arbre (TECHNOLOGIE.md, reporté)

Dit maintenant pour que l'assemblage final soit un assemblage : le
nœud *siege* (murs +20 %/niv, réparation accélérée) coiffera S4 ; le
nœud *telemetrie* (aperçu tactique resserré) coiffera la bataille de
S1/S3 ; le nœud *armurerie* équipera les miliciens de S1. Rien de tout
ça n'est requis pour livrer les lots.

## 5. Ce que ça casse, dit d'avance

- **Le raid devient dangereux pour les vôtres** : des membres nommés
  peuvent être blessés ou tués en défendant le camp. C'est voulu —
  c'est même le sujet — mais c'est une dureté nouvelle (décision n°2).
- **L'équilibre des pertes change** : le pillage gradué et l'alerte du
  poste déplacent ce que le joueur perd par saison. Les constantes
  (fréquence, fenêtre d'alerte, prix de négociation) se posent en
  objets calibrables et se mesurent en partie jouée (critères headless),
  pas devinées.
- **Le monde ne bouge pas d'un dé** : l'attrition des sièges du monde
  entre villes reste identique ; seuls les raids et sièges du camp du
  joueur changent de résolution. Les gardes du banc doivent sortir
  identiques, et le flux de hasard du monde n'a pas un tirage de plus
  (tout le neuf se dérive par `grainDe`).
- **Vieilles sauvegardes** : rien à migrer sauf les clés nouvelles par
  `normaliser` (alerte en cours, état de brèche).

## 6. Les cibles mesurables

1. Un raid avec escouade présente passe par `resoudreCombat` : il
   existe des blessés possibles des deux camps (test né rouge).
2. L'assaillant a un nom, et la chronique le dit.
3. Poste niveau n : l'alerte précède l'assaut de `f(n)` heures,
   mesuré ; sans poste, aucune alerte.
4. Chaque verbe du siège a une conséquence mesurable : sortie →
   bataille résolue et force du siège entamée ; négocier → crédits
   sortis, siège levé, l'Essaim refuse ; évacuer → stock emporté ≤
   charge, camp abandonné debout.
5. Les murs prennent des dégâts pendant un siège, la brèche retire
   leur terme de la tenue, la réparation consomme alliage + heures.
6. Gardes du monde inchangées ; aucun tirage nouveau dans les flux
   existants (vérifié comme d'habitude par les tests d'équivalence).
7. Vieille sauvegarde chargée : rien de perdu, rien de bloqué.

## 7. Ce qu'on ne fait pas

Pas de combat tactique case par case — la résolution existante suffit.
Pas de système de moral ou de désertion nouveau. Pas d'armes de siège
côté monde (les colonnes gardent leur attrition). Pas de prisonniers
ni de rançons — consigné comme piste, pas engagé. Pas de constante
posée sans mesure.

## Les décisions du propriétaire — tranchées, août 2026

1. **Les quatre lots : validés** (« les lots ont l'air pas mal »),
   dans l'ordre S1 → S4.
2. **La mort au camp : simulation pleine.** « Possibilité de mourir,
   être blessé, KO etc, une vraie simulation quoi. » Partout où ça se
   bat, les règles de blessure existantes tranchent — membres touchés,
   KO, achèvement selon la létalité de l'assaillant — jamais un pile
   ou face hors bataille. Les habitants d'un camp envahi peuvent
   mourir ; un membre nommé présent au camp se bat comme les autres,
   donc risque comme les autres.
3. **La négociation : possible, même en guerre** — « car vraie
   simulation ». Garde-fou de la même simulation : payer laisse une
   trace. Qui lève un siège contre crédits se fait connaître comme
   payeur, et le prix monte à chaque paiement. Sans cette mémoire,
   négocier serait le bouton qu'on presse toujours.

## L'avancement

- [x] S1 — le raid est une bataille — livré : l'assaillant est nommé
  (bandits, ou l'Essaim là où il contrôle le secteur — les factions en
  rancune viendront avec S3), la bataille passe par le moteur de combat
  quand un groupe est au camp (`raidSurLaBase`, injectée par `ctx` —
  base.js précède events.js), la milice se lève de la population et ses
  morts se décomptent, un camp envahi perd des habitants en plus du
  stock. Tout le hasard nouveau dérivé (`grainDe('raid', t)`) ; les
  tirages du flux joueur inchangés (déclenchement, pillage).
- [x] S2 — le poste tient sa promesse — livré : `raidEnApproche`
  annonce l'assaut `min(18, 5 × guet)` heures d'avance (journal
  important, urgences, panneau de base), l'échéance est tenue par
  `tickBase`, la carence de 72 h court dès l'alerte. Sans poste :
  réveillé par le raid, comme avant. Clé `raidImminent` née dans
  `creerBase` et `normaliser`.
- [x] S3 — les verbes du siège — livré : `siegeEnCours`, **sortir**
  (`sortieContreSiege`, bataille rangée contre un détachement, victoire
  = force −35 %, colonne sous 8 recule — la règle du monde), **négocier**
  (`negocierSiege`, chemin comptable de l'impôt, l'Essaim refuse, le
  prix monte à chaque paiement — `player.rachats`, RANCON.montee 1,6),
  **évacuer** (`evacuerCamp`, on emporte le précieux d'abord dans la
  charge, la vitrine devient ruine, permis à tout moment), **tenir** =
  ne rien faire. Panneau de siège sur l'écran de base, trois boutons.
- [x] S4 — les murs et la brèche — livré : `brecheEtat` (1 → 0), usé
  par les assauts du siège (`userMursSiege` via `ctx.usureMurs`, hook
  réservé à `col.avantPoste` — les sièges du monde ne bougent pas d'un
  dé), lu en direct par la tenue (vitrine à l'heure du choc), affiché
  sur le panneau de base (« Murs : 62 % » / « brèche ouverte »). La
  réparation coûte MURS.alliage/h et avance à MURS.repare × bâtisseurs,
  jamais pendant un siège. Le sac de bandits use les murs de la même
  encre (le tirage chance(0.4) du niveau entier disparaît — changement
  de séquence du flux joueur assumé et documenté).

## Blocages

Rien pour l'instant.
