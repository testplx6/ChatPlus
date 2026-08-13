# Wallke X3 Pro Max — console BLE (afficheur Yolin)

Outil pour se reconnecter en Bluetooth à un vélo Wallke X3 Pro Max dont
l'application d'origine (**YolinEbike**, de Tianjin Yolin Technology) n'est
plus installable.

C'est un **outil de rétro-ingénierie**, pas encore une app finie : le protocole
BLE de Yolin n'est pas public, il faut donc l'observer sur ton vélo avant de
pouvoir écrire une vraie interface. Cette console fait exactement ce travail-là.

## Est-ce faisable ?

Oui, avec une réserve honnête sur une seule étape.

| Étape | Difficulté |
|---|---|
| Se connecter en BLE à l'afficheur | Facile — un afficheur Yolin est un périphérique BLE standard |
| Lire les trames qu'il émet (vitesse, batterie, assistance…) | Facile — il suffit de s'abonner aux notifications |
| Comprendre le format des trames | Moyen — analyse statistique, c'est ce que fait l'onglet « Analyser » |
| **Écrire** les paramètres (bridage, taille de roue, P/C settings) | **Le point dur** — souvent protégé par un mot de passe ou une séquence d'ouverture, et une écriture erronée peut dérégler le contrôleur |

Rien ici n'est bloquant côté matériel : Yolin n'est pas un système fermé
cryptographiquement, c'est un module BLE-UART qui relaie le protocole série
entre l'afficheur et le contrôleur. Le seul vrai travail, c'est le décodage.

## Utilisation

Web Bluetooth exige HTTPS ou localhost :

```bash
cd walkke-x3-ble
npx serve .          # puis ouvrir http://localhost:3000
```

Sur **Android** : Chrome ou Edge, ça marche directement (active la
localisation, requise pour le scan BLE).

Sur **iOS** : Safari n'implémente pas Web Bluetooth. Utilise l'app
[Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055)
(navigateur avec Web BLE), ou passe par un Android/PC pour la phase d'analyse.

Ensuite :

1. **Chercher un appareil** → dans la liste, l'afficheur apparaît souvent sous
   un nom du type `YL…`, `DISPLAY`, `BT…` ou une suite hexadécimale. Le vélo
   doit être allumé.
2. La section 2 liste tous les services et caractéristiques trouvés, et
   s'abonne automatiquement à tout ce qui notifie.
3. Roule ou appuie sur les boutons de l'afficheur : les trames défilent en
   section 3.
4. **Analyser** : longueurs, en-têtes, checksum probable, et quels octets
   bougent — c'est ce qui identifie les champs.

### Méthode pour identifier les champs

Change **une seule variable à la fois** et regarde quel octet suit :

- niveau d'assistance 1 → 5 : un octet qui prend exactement les valeurs 1…5
- vitesse : un octet (ou deux, en big-endian) qui monte avec la vitesse réelle
- batterie : une valeur qui décroît lentement, ou un niveau 0–5 pour les barres
- odomètre : un compteur sur 2 ou 3 octets qui ne redescend jamais

Note les correspondances, puis remplis `FRAME_SPEC` dans `protocol.js` : le
décodage s'affichera alors en direct à droite de chaque trame.

## Accélérer avec l'app d'origine

Si tu remets la main sur l'APK YolinEbike (APKMirror, APKPure, ou une
sauvegarde), deux raccourcis :

**Sniffer le trafic réel** — Android, Options développeur → activer
« Journal de trace Bluetooth HCI », utiliser l'app, récupérer
`btsnoop_hci.log` via `adb bugreport`, ouvrir dans Wireshark et filtrer
`btatt`. Tu vois les trames de commande *et* leurs réponses : c'est de très
loin le moyen le plus rapide d'obtenir les écritures (déverrouillage,
changement de paramètres).

**Décompiler** — `jadx-gui app.apk`, puis chercher `writeCharacteristic`,
`BluetoothGattCallback`, ou les UUID. Les apps de ce type gardent souvent la
construction des trames en clair dans une seule classe utilitaire.

## Prudence

- Cible uniquement **ton propre vélo**.
- Les écritures sur le contrôleur (section 3, champ hex) peuvent modifier des
  paramètres persistants. Relève les valeurs d'origine avant toute écriture.
- Modifier la vitesse maximale sort le vélo de sa conformité légale sur voie
  publique (25 km/h en UE) et annule généralement l'assurance et la garantie.
  À réserver au terrain privé.

## Fichiers

- `index.html` — interface
- `app.js` — connexion Web Bluetooth, exploration GATT, capture, envoi
- `protocol.js` — helpers hex, détection de checksum, profilage d'octets,
  décodeur (`FRAME_SPEC` à remplir après capture)
