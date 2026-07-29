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
  'world.js',
  'characters.js',
  'groupes.js',
  'allegeance.js',
  'combat.js',
  'economy.js',
  'caravanes.js',
  'factions.js',
  'base.js',
  'contrats.js',
  'events.js',
  'squad.js',
  'sim.js',
  'save.js',
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

/** Noms déclarés au premier niveau (colonne 0), pour détecter les collisions. */
function nomsGlobaux(source) {
  const noms = [];
  const re = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(source)) !== null) noms.push(m[1]);
  return noms;
}

const morceaux = [];
const vus = new Map();
const aliasTous = [];
const requisTous = new Map(); // nom importé → module qui le réclame
let collisions = 0;

for (const nom of MODULES) {
  const brut = await readFile(join(RACINE, 'src', nom), 'utf8');
  const { code, alias, requis } = retirerImports(brut);
  for (const r of requis) if (!requisTous.has(r)) requisTous.set(r, nom);
  const propre = retirerExports(code);
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
