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
  // Le dictionnaire travaille en ENTIERS, jamais en chaînes : la première
  // version concaténait le mot courant à chaque pas (clés de Map en chaînes,
  // ré-allouées et re-hachées sans cesse) et coûtait ~110 ms sur un monde de
  // 6 000 h — « le jeu rame vachement » (le propriétaire), la sauvegarde
  // tournant toutes les cinq secondes. Ici : un code par caractère connu, et
  // les suites indexées par (code du mot << 16) + caractère. Même flux de
  // sortie au bit près — `decomprimer` n'a pas changé d'une ligne.
  const parChar = new Map();
  const suites = new Map();
  const naissants = new Set();
  let tailleDico = 3;
  let bitsCode = 2;
  let avantElargir = 2;
  const sortie = [];
  let tampon = 0;
  let tamponBits = 0;

  // Les codes s'émettent bit de poids faible d'abord, comme à la lecture —
  // mais par BLOCS : on renverse les bits du code une fois, puis on les pose
  // dans le tampon par tranches de ce qui reste de place. Bit à bit, chaque
  // sauvegarde payait un appel et un test de débordement par bit.
  const emettreCode = (valeur, nbBits) => {
    let renv = 0;
    for (let i = 0; i < nbBits; i++) {
      renv = (renv << 1) | (valeur & 1);
      valeur >>= 1;
    }
    let restant = nbBits;
    while (restant > 0) {
      const prendre = restant < 15 - tamponBits ? restant : 15 - tamponBits;
      const bloc = (renv >>> (restant - prendre)) & ((1 << prendre) - 1);
      tampon = (tampon << prendre) | bloc;
      tamponBits += prendre;
      restant -= prendre;
      if (tamponBits === 15) {
        sortie.push(String.fromCharCode(tampon + 32));
        tampon = 0;
        tamponBits = 0;
      }
    }
  };
  const compterEmission = () => {
    avantElargir--;
    if (avantElargir === 0) {
      avantElargir = 1 << bitsCode;
      bitsCode++;
    }
  };
  // Un caractère jamais émis se dit en clair : le code 0 annonce 8 bits, le
  // code 1 en annonce 16. Seul un mot d'UN caractère peut être naissant.
  const emettreMot = (codeMot, charMot, simple) => {
    if (simple && naissants.has(charMot)) {
      if (charMot < 256) {
        emettreCode(0, bitsCode);
        emettreCode(charMot, 8);
      } else {
        emettreCode(1, bitsCode);
        emettreCode(charMot, 16);
      }
      compterEmission();
      naissants.delete(charMot);
    } else {
      emettreCode(codeMot, bitsCode);
    }
    compterEmission();
  };

  let codeMot = -1;
  let charMot = -1;
  let simple = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i);
    let codeC = parChar.get(c);
    if (codeC === undefined) {
      codeC = tailleDico++;
      parChar.set(c, codeC);
      naissants.add(c);
    }
    if (codeMot === -1) {
      codeMot = codeC;
      charMot = c;
      simple = true;
      continue;
    }
    const cle = codeMot * 65536 + c;
    const codeSuite = suites.get(cle);
    if (codeSuite !== undefined) {
      codeMot = codeSuite;
      simple = false;
    } else {
      emettreMot(codeMot, charMot, simple);
      suites.set(cle, tailleDico++);
      codeMot = codeC;
      charMot = c;
      simple = true;
    }
  }
  if (codeMot !== -1) emettreMot(codeMot, charMot, simple);

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
  let dispo = 15; // bits pas encore lus dans le caractère courant

  // Lecture par blocs, miroir de l'émission : on prend d'un coup ce que le
  // caractère courant peut donner, et on renverse le bloc une fois pour le
  // poser poids faible d'abord.
  const lireCode = (nbBits) => {
    let v = 0;
    let fait = 0;
    while (fait < nbBits) {
      if (dispo === 0) {
        index++;
        val = index < paquet.length ? paquet.charCodeAt(index) - 32 : 0;
        dispo = 15;
      }
      const reste = nbBits - fait;
      const prendre = reste < dispo ? reste : dispo;
      let bloc = (val >> (dispo - prendre)) & ((1 << prendre) - 1);
      dispo -= prendre;
      let renv = 0;
      for (let i = 0; i < prendre; i++) {
        renv = (renv << 1) | (bloc & 1);
        bloc >>= 1;
      }
      v |= renv << fait;
      fait += prendre;
    }
    return v;
  };
  const epuise = () => index >= paquet.length
    || (index === paquet.length - 1 && dispo === 0);
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
    if (epuise()) return null;
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
