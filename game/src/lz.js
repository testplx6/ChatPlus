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

// Les tables de travail vivent ici, pas dans la fonction : les rallouer à
// chaque écriture, c'était douze mégaoctets de déchets toutes les cinq
// secondes — et un ramasse-miettes qui s'invite au milieu du jeu, sur un
// téléphone plus qu'ailleurs. Elles sont remises à zéro à chaque appel, ce qui
// coûte une fraction de milliseconde.
const CAPACITE_H = 1 << 20;
const TABLES = {
  parChar: new Int32Array(65536),
  naissants: new Uint8Array(65536),
  hMot: new Int32Array(CAPACITE_H),
  hChar: new Int32Array(CAPACITE_H),
  hVal: new Int32Array(CAPACITE_H),
};

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
  // Tables TYPÉES plutôt que Map : mesuré en jeu, la compression d'un monde de
  // 6 000 h bloquait le fil 50 ms toutes les cinq secondes — quelques centaines
  // sur un téléphone, et « les boutons ne réagissent plus aussitôt comme
  // avant ». `parChar` est un tableau direct indexé par le code du caractère ;
  // `suites` est une table de hachage à sondage linéaire (clé : le couple
  // code-du-mot + caractère, qui ne tient pas dans un entier une fois le
  // dictionnaire grand). Le flux produit est le même, au bit près.
  const parChar = TABLES.parChar;
  const naissants = TABLES.naissants;
  const capacite = CAPACITE_H;
  const masqueH = capacite - 1;
  const hMot = TABLES.hMot;
  const hChar = TABLES.hChar;
  const hVal = TABLES.hVal;
  parChar.fill(-1);
  naissants.fill(0);
  hMot.fill(-1);
  let occupes = 0;
  const suitesLentes = new Map();
  const place = (codeMot, c) => {
    let i = ((codeMot * 2654435761 + c * 40503) >>> 12) & masqueH;
    for (;;) {
      const m = hMot[i];
      if (m === -1) return i;
      if (m === codeMot && hChar[i] === c) return i;
      i = (i + 1) & masqueH;
    }
  };
  const lireSuite = (codeMot, c) => {
    if (occupes * 2 >= capacite) {
      const v = suitesLentes.get(`${codeMot},${c}`);
      return v === undefined ? -1 : v;
    }
    const i = place(codeMot, c);
    return hMot[i] === -1 ? -1 : hVal[i];
  };
  const poserSuite = (codeMot, c, valeur) => {
    if (occupes * 2 >= capacite) { suitesLentes.set(`${codeMot},${c}`, valeur); return; }
    const i = place(codeMot, c);
    if (hMot[i] === -1) { hMot[i] = codeMot; hChar[i] = c; occupes++; }
    hVal[i] = valeur;
  };
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
    if (simple && naissants[charMot] === 1) {
      if (charMot < 256) {
        emettreCode(0, bitsCode);
        emettreCode(charMot, 8);
      } else {
        emettreCode(1, bitsCode);
        emettreCode(charMot, 16);
      }
      compterEmission();
      naissants[charMot] = 0;
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
    let codeC = parChar[c];
    if (codeC === -1) {
      codeC = tailleDico++;
      parChar[c] = codeC;
      naissants[c] = 1;
    }
    if (codeMot === -1) {
      codeMot = codeC;
      charMot = c;
      simple = true;
      continue;
    }
    const codeSuite = lireSuite(codeMot, c);
    if (codeSuite !== -1) {
      codeMot = codeSuite;
      simple = false;
    } else {
      emettreMot(codeMot, charMot, simple);
      poserSuite(codeMot, c, tailleDico++);
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
