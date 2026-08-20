// Fabrique dist/cendres.html : le jeu entier dans un seul fichier, style et
// script compris. Aucun import à résoudre, donc il s'ouvre aussi bien par
// double-clic (file://) que servi par un hébergeur statique.
//
//   node tools/bundle.js
//
// Le bundler est volontairement bête : il concatène les modules dans l'ordre
// des dépendances, retire les import/export, et vérifie qu'aucun nom de premier
// niveau n'est déclaré deux fois. S'il en trouve un, il s'arrête au lieu de
// produire un fichier subtilement cassé.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const RACINE = resolve(new URL('..', import.meta.url).pathname);

// --fragment <chemin> : écrit une variante sans <html>/<head>/<body>, pour les
// hôtes qui fournissent eux-mêmes le squelette de page.
const iFragment = process.argv.indexOf('--fragment');
const FRAGMENT = iFragment >= 0 ? process.argv[iFragment + 1] : null;

// Ordre des dépendances : un module ne cite que ceux qui le précèdent.
const MODULES = [
  'rng.js',
  'data.js',
  'climat.js',
  // Feuille : lue par le conseil comme par la justice, elle ne dépend de rien.
  'lois.js',
  'world.js',
  'characters.js',
  'notables.js',
  'dirigeants.js',
  'groupes.js',
  // Ce qui s'est passé pendant qu'on ne regardait pas. Placé tôt parce que tout
  // le monde lui déclare ses mouvements d'argent — le camp, les coffres, les
  // péages —, et qu'un module ne cite que ceux qui le précèdent. Il ne dépend
  // lui-même que des données, des personnages et des groupes.
  'rapport.js',
  'betes.js',
  'recrues.js',
  'services.js',
  'allegeance.js',
  'connaissance.js',
  'formation.js',
  'combat.js',
  'bourse.js',
  'economy.js',
  // Le crédit aux villes : il lit l'économie, personne ne le lit avant lui.
  'credit.js',
  // La monnaie des factions : masse, gage, cours. Lit les lois et les données.
  'monnaie.js',
  'caravanes.js',
  'factions.js',
  // Les prérogatives d'un gradé s'exercent sur ce que factions.js sait faire :
  // lever, fonder, déclarer, signer. Elle vient donc après lui.
  'influence.js',
  // Ce qu'on fait des gens qu'on n'a pas tués, et les lois qui l'encadrent.
  'justice.js',
  // Et la question jumelle : ce qu'on fait de ses morts.
  'depouilles.js',
  // Ce dont un gradé répond tous les jours : il juge via influence.js, lit les
  // geôles de justice.js, et events.js lit son insécurité en retour.
  'secteur.js',
  'base.js',
  // De la place en ville, qui ne marche pas avec vous.
  'coffres.js',
  'contrats.js',
  'events.js',
  'squad.js',
  // Ce que la partie a fait de vous : elle relit tout le reste.
  'chronique.js',
  // Et comment la partie se raconte : les chapitres lisent la chronique.
  'histoire.js',
  'save.js',
  'sim.js',
  'ui.js',
  'main.js',
];

/** Retire les déclarations d'import, en récupérant les alias `x as y`. */
function retirerImports(source) {
  const lignes = source.split('\n');
  const sortie = [];
  const alias = [];
  const requis = [];
  let dansImport = false;
  let tampon = '';

  for (const ligne of lignes) {
    if (!dansImport && /^import[\s{]/.test(ligne)) {
      dansImport = true;
      tampon = '';
    }
    if (dansImport) {
      tampon += ` ${ligne}`;
      if (ligne.includes(';')) {
        dansImport = false;
        const accolades = tampon.match(/\{([^}]*)\}/);
        if (accolades) {
          for (const brut of accolades[1].split(',')) {
            const nom = brut.trim();
            if (!nom) continue;
            const m = nom.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
            if (m) { alias.push([m[2], m[1]]); requis.push(m[1]); }
            else if (/^[\w$]+$/.test(nom)) requis.push(nom);
          }
        }
      }
      continue;
    }
    sortie.push(ligne);
  }
  return { code: sortie.join('\n'), alias, requis };
}

/** `export function x` → `function x`, `export const X` → `const X`. */
function retirerExports(source) {
  return source.replace(/^export\s+(?=(?:default\s+)?(?:function|const|let|var|class)\b)/gm, '');
}

/**
 * Tout ce qu'un module nomme lui-même : déclarations, paramètres, méthodes
 * abrégées d'objet littéral.
 *
 * Sert au contrôle « utilisé sans être importé ». Un nom qui vient d'ailleurs
 * mais qu'on redéclare ici — `attaquerCaravane(state, car, rng, log,
 * combatContre, genererBande)` reçoit ses fonctions en paramètres, et
 * `ACTIONS = { garnison(faction) {…} }` nomme une méthode — n'est pas un oubli
 * d'import. Approximation assumée : mieux vaut rater un oubli que crier sur du
 * code correct, parce qu'un garde-fou qui crie pour rien finit désactivé.
 */
function nomsLocaux(source) {
  const noms = new Set();
  const decl = /(?:^|[\s;{(])(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = decl.exec(source)) !== null) noms.add(m[1]);
  // Paramètres : tout ce qui tient entre les parenthèses d'une signature.
  const sign = /(?:function\s*[A-Za-z_$\w]*|^\s+[A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?:=>|\{)/gm;
  while ((m = sign.exec(source)) !== null) {
    for (const p of m[1].split(',')) {
      const nom = p.trim().replace(/[={[\].].*$/, '').replace(/^\.\.\./, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(nom)) noms.add(nom);
    }
  }
  // Méthode abrégée d'un objet littéral : `  garnison(faction) {`.
  const meth = /^\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm;
  while ((m = meth.exec(source)) !== null) noms.add(m[1]);
  return noms;
}

/** Noms déclarés au premier niveau (colonne 0), pour détecter les collisions. */
function nomsGlobaux(source) {
  const noms = [];
  const re = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(source)) !== null) noms.push(m[1]);
  return noms;
}

const morceaux = [];
const sourcesParModule = [];
const vus = new Map();
const aliasTous = [];
const requisTous = new Map(); // nom importé → module qui le réclame
let collisions = 0;

/**
 * Tout bouton dessiné doit avoir un gestionnaire, et réciproquement.
 *
 * Un remplacement en bloc dans `ui.js` a emporté `case 'recette'` et
 * `case 'reserve'` avec lui : les boutons restaient à l'écran, ils ne
 * faisaient plus rien, et aucune suite de tests ne l'a vu — parce qu'aucune ne
 * clique sur *tous* les boutons du jeu. Rien ne reliait le dessin à l'action ;
 * c'était deux listes tenues à la main, dans deux moitiés du même fichier.
 *
 * On les compare. C'est six lignes, ça coûte une milliseconde, et ça attrape
 * toute la classe : un bouton orphelin comme un gestionnaire mort.
 */
function verifierActions(src) {
  const dessines = new Set();
  for (const m2 of src.matchAll(/data-a="([a-z0-9-]+)"/g)) dessines.add(m2[1]);
  // Les gabarits dynamiques : `data-a="${...}"`. On ne peut pas les lire, on
  // les signale pour qu'ils ne passent pas pour des oublis.
  const dynamiques = /data-a="\$\{/.test(src);
  const traites = new Set();
  for (const m2 of src.matchAll(/case '([a-z0-9-]+)':/g)) traites.add(m2[1]);

  const orphelins = [...dessines].filter((k) => !traites.has(k));
  if (orphelins.length) {
    throw new Error(
      `Boutons sans gestionnaire dans ui.js : ${orphelins.join(', ')}.\n`
      + '  Ils s’affichent et ne font rien. Ajoutez leur `case`, ou retirez-les.'
    );
  }
  return { dessines: dessines.size, traites: traites.size, dynamiques };
}

for (const nom of MODULES) {
  const brut = await readFile(join(RACINE, 'src', nom), 'utf8');
  const { code, alias, requis } = retirerImports(brut);
  sourcesParModule.push({
    nom,
    brut,
    code,
    importes: new Set([...requis, ...alias.map(([nouveau]) => nouveau)]),
    // Tout ce que ce module déclare lui-même, à n'importe quelle indentation :
    // une fonction locale homonyme d'un export d'ailleurs est parfaitement
    // légitime, et c'est fréquent (`retirer`, `manque`, `conseil`…).
    locaux: nomsLocaux(brut),
  });
  for (const r of requis) if (!requisTous.has(r)) requisTous.set(r, nom);
  const propre = retirerExports(code);
  // Un même nom importé deux fois dans le *même* fichier casse la page servie
  // en modules ES, mais pas l'assemblage : le bundler retire les imports, donc
  // il ne voyait rien et annonçait « 0 collision » sur un jeu qui ne démarrait
  // plus. Le test navigateur l'attrapait, dix minutes plus tard.
  const importes = new Map();
  for (const m of brut.matchAll(/^import\s*\{([^}]*)\}\s*from\s*'([^']+)'/gm)) {
    for (const brut2 of m[1].split(',')) {
      const nom = brut2.trim().split(/\s+as\s+/).pop().trim();
      if (!nom) continue;
      if (importes.has(nom)) {
        console.error(`${nom} : « ${nom} » importé deux fois — depuis `
          + `${importes.get(nom)} puis depuis ${m[2]}`);
        collisions++;
      }
      importes.set(nom, m[2]);
    }
  }
  for (const g of nomsGlobaux(propre)) {
    if (vus.has(g)) {
      console.error(`Collision : « ${g} » déclaré dans ${vus.get(g)} et ${nom}`);
      collisions++;
    } else {
      vus.set(g, nom);
    }
  }
  aliasTous.push(...alias);
  morceaux.push(`// ===== src/${nom} ${'='.repeat(Math.max(0, 58 - nom.length))}\n${propre.trim()}`);
}

// Les boutons et leurs gestionnaires, avant tout le reste : un bouton mort ne
// casse pas le bundle, il casse la partie de quelqu'un.
{
  const ui = sourcesParModule.find((m) => m.nom === 'ui.js');
  if (ui) {
    const r = verifierActions(ui.brut);
    console.log(`ui.js — ${r.dessines} action(s) dessinée(s), ${r.traites} traitée(s)`
      + `${r.dynamiques ? ', plus des gabarits dynamiques non vérifiables' : ''}`);
  }
}

if (collisions) {
  console.error(`\n${collisions} collision(s) de noms : le bundle serait cassé. Abandon.`);
  process.exit(1);
}

// Un module oublié dans MODULES ne se voit pas : ses exports deviennent
// simplement des identifiants inconnus, et la page meurt au chargement.
const manquants = [...requisTous.entries()].filter(([nom]) => !vus.has(nom));
if (manquants.length) {
  console.error('Symboles importés mais absents du bundle :');
  for (const [nom, mod] of manquants) console.error(`  « ${nom} » réclamé par src/${mod}`);
  console.error('\nUn module manque probablement dans MODULES. Abandon.');
  process.exit(1);
}

// L'inverse du contrôle précédent, et il a coûté une page blanche : un symbole
// **utilisé sans être importé**.
//
// Dans le fichier unique tout partage la même portée, donc `lieuAvecCoord`
// appelé depuis ui.js sans figurer dans ses imports fonctionne parfaitement. En
// modules ES — c'est-à-dire en développement, et c'est ce que sert `serve.js` —
// c'est une ReferenceError au chargement. Le bundle annonçait « 0 collision »
// sur un jeu qui ne démarrait pas.
//
// On ne fait pas d'analyse de portée ici : on cherche l'usage d'un nom exporté
// par un *autre* module, absent des imports de celui-ci et de ses propres
// déclarations. Assez pour attraper l'oubli, sans prétendre à un compilateur.
{
  const exportes = new Map(); // nom exporté → module qui l'exporte
  for (const { nom, brut } of sourcesParModule) {
    const re = /^export\s+(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = re.exec(brut)) !== null) if (!exportes.has(m[1])) exportes.set(m[1], nom);
  }
  const oublis = [];
  for (const { nom, code, importes, locaux } of sourcesParModule) {
    // Ce fichier commente beaucoup, et cite volontiers des fonctions d'ailleurs
    // pour expliquer pourquoi il ne les emploie pas. On lit le code seul.
    const sansCommentaires = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const [sym, source] of exportes) {
      if (source === nom || importes.has(sym) || locaux.has(sym)) continue;
      // Un appel, mot entier, pas derrière un point : `x.distance` n'est pas
      // `distance`. On se limite aux appels — une variable homonyme passée en
      // paramètre est courante, une *fonction* homonyme appelée sans import ne
      // l'est pas.
      const re = new RegExp(`(^|[^.\\w$])${sym}\\s*\\(`);
      if (re.test(sansCommentaires)) {
        oublis.push(`  « ${sym} » utilisé par src/${nom}, exporté par src/${source}`);
      }
    }
  }
  if (oublis.length) {
    console.error('Symboles utilisés sans être importés (le bundle passerait, pas les modules) :');
    for (const l of oublis) console.error(l);
    console.error('\nAjoutez l’import. Abandon.');
    process.exit(1);
  }
}

// Les imports aliasés (`niveau as nivBat`) deviennent de simples constantes.
const alias = [...new Map(aliasTous).entries()]
  .filter(([nouveau, ancien]) => nouveau !== ancien)
  .map(([nouveau, ancien]) => `const ${nouveau} = ${ancien};`)
  .join('\n');

const css = await readFile(join(RACINE, 'styles.css'), 'utf8');
const js = `${morceaux[0]}\n\n${alias ? `// Alias d'import\n${alias}\n\n` : ''}${morceaux.slice(1).join('\n\n')}`;

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<meta name="theme-color" content="#0a0c10">
<meta name="color-scheme" content="dark">
<meta name="description" content="Cendres &amp; Protocole — simulation textuelle post-cyberpunk. Une escouade, un monde qui tourne sans vous.">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Cendres">
<title>Cendres &amp; Protocole</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%230a0c10'/%3E%3Crect x='3' y='3' width='4' height='4' fill='%234fd0e3'/%3E%3Crect x='9' y='9' width='4' height='4' fill='%23d9a03a'/%3E%3C/svg%3E">
<style>
${css.trim()}
</style>
</head>
<body>
  <div id="racine">
    <header id="barre-haut"></header>
    <main id="ecran"></main>
    <nav id="barre-nav"></nav>
  </div>
  <div id="modale" hidden></div>
  <noscript>Ce jeu a besoin de JavaScript : toute la simulation tourne dans votre navigateur.</noscript>
<script type="module">
${js}
</script>
</body>
</html>
`;

const CORPS = `  <div id="racine">
    <header id="barre-haut"></header>
    <main id="ecran"></main>
    <nav id="barre-nav"></nav>
  </div>
  <div id="modale" hidden></div>
  <noscript>Ce jeu a besoin de JavaScript : toute la simulation tourne dans votre navigateur.</noscript>`;

if (FRAGMENT) {
  const fragment = `<title>Cendres &amp; Protocole</title>
<style>
${css.trim()}
</style>
${CORPS}
<script type="module">
${js}
</script>
`;
  await writeFile(FRAGMENT, fragment);
  console.log(`${FRAGMENT} — ${(fragment.length / 1024).toFixed(0)} Ko (fragment)`);
} else {
  await mkdir(join(RACINE, 'dist'), { recursive: true });
  await writeFile(join(RACINE, 'dist', 'cendres.html'), html);
  console.log(`dist/cendres.html — ${(html.length / 1024).toFixed(0)} Ko, ${MODULES.length} modules, 0 collision`);
}


