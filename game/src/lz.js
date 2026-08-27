// Compression de texte pour le stockage local — maison, synchrone, zéro
// dépendance, à la manière de LZ-string (variante « UTF-16 sûre »).
//
// Pourquoi elle existe : une partie NEUVE sérialise déjà à ~250 Ko et une
// partie longue à 400 Ko et plus. Le quota du stockage local se ferme (la
// sauvegarde ne s'écrit plus), et le texte d'export devient incollable sur un
// téléphone — rapporté par le propriétaire, août 2026. Le JSON du monde est
// extrêmement répétitif : la compression le divise par cinq à dix.
//
// Pourquoi synchrone : la sauvegarde part aussi sur `pagehide`, où rien
// d'asynchrone ne finit. Pourquoi 15 bits par caractère décalés de 32 : chaque
// caractère émis reste dans [32, 32799], loin des substituts UTF-16 — la
// chaîne survit à localStorage, à JSON.stringify et au presse-papiers.
//
// La sûreté ne repose PAS sur la perfection de ce fichier : `emballer`
// (save.js) décompresse et compare à l'original AVANT de retenir le paquet,
// et écrit en clair au moindre écart. Un défaut ici coûte des octets, jamais
// une partie.

/** Compresse un texte en une chaîne UTF-16 sûre. */
export function comprimer(texte) {
  if (texte == null || texte === '') return '';
  const dico = new Map();
  const naissants = new Map();
  let tailleDico = 3;
  // Largeur de code courante et compteur avant élargissement.
  let bitsCode = 2;
  let avantElargir = 2;
  const sortie = [];
  let tampon = 0;
  let tamponBits = 0;

  const emettreBit = (b) => {
    tampon = (tampon << 1) | b;
    if (tamponBits === 14) {
      sortie.push(String.fromCharCode(tampon + 32));
      tampon = 0;
      tamponBits = 0;
    } else tamponBits++;
  };
  // Les codes s'émettent bit de poids faible d'abord, comme à la lecture.
  const emettreCode = (valeur, nbBits) => {
    for (let i = 0; i < nbBits; i++) {
      emettreBit(valeur & 1);
      valeur >>= 1;
    }
  };
  const compterEmission = () => {
    avantElargir--;
    if (avantElargir === 0) {
      avantElargir = 1 << bitsCode;
      bitsCode++;
    }
  };
  // Un mot jamais émis se dit en clair : le code 0 annonce 8 bits, le code 1
  // en annonce 16. Après quoi le mot a un code à lui.
  const emettreMot = (mot) => {
    if (naissants.has(mot)) {
      const c = mot.charCodeAt(0);
      if (c < 256) {
        emettreCode(0, bitsCode);
        emettreCode(c, 8);
      } else {
        emettreCode(1, bitsCode);
        emettreCode(c, 16);
      }
      compterEmission();
      naissants.delete(mot);
    } else {
      emettreCode(dico.get(mot), bitsCode);
    }
    compterEmission();
  };

  let mot = '';
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charAt(i);
    if (!dico.has(c)) {
      dico.set(c, tailleDico++);
      naissants.set(c, true);
    }
    const motC = mot + c;
    if (dico.has(motC)) {
      mot = motC;
    } else {
      emettreMot(mot);
      dico.set(motC, tailleDico++);
      mot = c;
    }
  }
  if (mot !== '') emettreMot(mot);

  // Le code 2 clôt le flux, puis on vide le tampon.
  emettreCode(2, bitsCode);
  for (;;) {
    tampon <<= 1;
    if (tamponBits === 14) {
      sortie.push(String.fromCharCode(tampon + 32));
      break;
    }
    tamponBits++;
  }
  return sortie.join('');
}

/** Décompresse ce que `comprimer` a produit. Rend null si le flux est faux. */
export function decomprimer(paquet) {
  if (paquet == null || paquet === '') return '';
  const dico = [];
  let tailleDico = 4;
  let bitsCode = 3;
  let avantElargir = 4;
  const sortie = [];

  let index = 0;
  let val = paquet.charCodeAt(0) - 32;
  let masque = 16384; // bit de poids fort d'un caractère de 15 bits

  const lireBit = () => {
    const b = val & masque ? 1 : 0;
    masque >>= 1;
    if (masque === 0) {
      masque = 16384;
      val = index + 1 < paquet.length ? paquet.charCodeAt(++index) - 32 : 0;
      if (index >= paquet.length) index = paquet.length;
    }
    return b;
  };
  const lireCode = (nbBits) => {
    let v = 0;
    for (let i = 0; i < nbBits; i++) v |= lireBit() << i;
    return v;
  };
  const compterAjout = () => {
    avantElargir--;
    if (avantElargir === 0) {
      avantElargir = 1 << bitsCode;
      bitsCode++;
    }
  };

  // Premier mot : forcément en clair.
  const premier = lireCode(2);
  if (premier === 2) return '';
  const c0 = String.fromCharCode(lireCode(premier === 0 ? 8 : 16));
  dico[3] = c0;
  let mot = c0;
  sortie.push(c0);

  for (;;) {
    if (index >= paquet.length) return null;
    let code = lireCode(bitsCode);
    if (code === 2) return sortie.join('');
    if (code === 0 || code === 1) {
      dico[tailleDico++] = String.fromCharCode(lireCode(code === 0 ? 8 : 16));
      code = tailleDico - 1;
      compterAjout();
    }
    let entree;
    if (dico[code] !== undefined) entree = dico[code];
    else if (code === tailleDico) entree = mot + mot.charAt(0);
    else return null;
    sortie.push(entree);
    dico[tailleDico++] = mot + entree.charAt(0);
    compterAjout();
    mot = entree;
    if (avantElargir === 0) {
      avantElargir = 1 << bitsCode;
      bitsCode++;
    }
  }
}
