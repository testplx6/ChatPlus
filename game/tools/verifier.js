// La chaîne de vérification, en une commande et un verdict.
//
//   node tools/verifier.js             statique + bundle + moteur     (~1 min)
//   node tools/verifier.js --complet   + vitesse calibrée + navigateur + gardes
//
// Ce fichier existe pour qu'aucun savoir-faire ne soit requis pour vérifier :
// quatre outils, des variables d'environnement, un port à libérer et l'ordre
// dans lequel tout ça se lance tenaient dans des têtes. Une tête moins pleine
// lance UNE commande et lit UN verdict — c'est la condition pour que n'importe
// qui, humain pressé ou modèle modeste, travaille ici sans casser.
//
// Code de sortie : 0 si tout est vert, 1 sinon. Aucun état intermédiaire.

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const JEU = resolve(ICI, '..');
const SRC = join(JEU, 'src');
const COMPLET = process.argv.includes('--complet');

const bilan = [];
function etape(nom, fn) {
  process.stdout.write(`${nom.padEnd(34, '.')} `);
  try {
    const detail = fn();
    bilan.push({ nom, ok: true });
    console.log(`✓ ${detail || ''}`);
  } catch (e) {
    bilan.push({ nom, ok: false, motif: e.message });
    console.log(`✗ ${e.message}`);
  }
}

function lancer(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: JEU, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...opts.env }, timeout: opts.timeout || 300000,
  });
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}` };
}

// ---------------------------------------------------------------------------
// 1. Statique : les règles non négociables, vérifiées par la machine.
// Chacune correspond à un incident payé — voir METHODE.md.
// ---------------------------------------------------------------------------

// Le DOM n'existe que dans la couche écran ; l'horloge murale et le hasard non
// scellé n'existent nulle part dans le moteur (ils casseraient le déterminisme,
// donc les tests, les balayages et la reprise des sauvegardes). `save.js` a
// droit à Date.now pour dater un emplacement de sauvegarde : c'est de la méta,
// hors du monde simulé.
const INTERDITS = [
  { motif: /\bdocument\.|\bwindow\./, sauf: ['ui.js', 'main.js'], nom: 'DOM hors couche écran' },
  { motif: /\bDate\.now\(/, sauf: ['ui.js', 'main.js', 'save.js'], nom: 'Date.now dans le moteur' },
  // main.js a droit à Math.random pour UNE chose : tirer la graine d'une
  // partie neuve, avant que le monde n'existe. Passé ce point, tout hasard
  // passe par Rng, scellé dans la sauvegarde.
  { motif: /\bMath\.random\(/, sauf: ['main.js'], nom: 'Math.random (le hasard passe par Rng)' },
];

etape('interdits statiques dans src/', () => {
  const fautes = [];
  for (const f of readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
    const texte = readFileSync(join(SRC, f), 'utf8');
    for (const r of INTERDITS) {
      if (r.sauf.includes(f)) continue;
      texte.split('\n').forEach((ligne, i) => {
        const code = ligne.split('//')[0];
        if (r.motif.test(code)) fautes.push(`${f}:${i + 1} — ${r.nom}`);
      });
    }
  }
  if (fautes.length) throw new Error(fautes.join(' ; '));
  return `${readdirSync(SRC).filter((x) => x.endsWith('.js')).length} fichiers`;
});

// ---------------------------------------------------------------------------
// 2. Le bundle : collisions de noms, symboles inconnus, boutons orphelins.
// ---------------------------------------------------------------------------

etape('bundle (collisions, symboles, data-a)', () => {
  const r = lancer('node', ['tools/bundle.js']);
  if (r.code !== 0) throw new Error(r.sortie.trim().split('\n').pop());
  return r.sortie.match(/\d+ modules/)?.[0] || '';
});

// ---------------------------------------------------------------------------
// 3. Le moteur : la suite headless entière.
// ---------------------------------------------------------------------------

etape('moteur (test/headless.js)', () => {
  const r = lancer('node', ['test/headless.js']);
  const m = r.sortie.match(/(\d+)\/(\d+) tests passés/);
  if (!m) throw new Error('sortie illisible');
  // La vitesse se juge à l'étape dédiée, au calme et en médiane : une passe
  // unique au milieu d'une suite chargée a déjà fait accuser un innocent.
  const echecs = [...r.sortie.matchAll(/✗ ([^\n]+)/g)]
    .map((x) => x[1]).filter((x) => !x.startsWith('tick sous'));
  if (echecs.length) throw new Error(echecs.join(' ; '));
  return `${m[1]}/${m[2]}`;
});

// ---------------------------------------------------------------------------
// 4. La vitesse, mesurée comme il faut : cinq passes, médiane, et l'aveu
// d'instabilité plutôt qu'un verdict sur une machine chargée.
// ---------------------------------------------------------------------------

if (COMPLET) {
  etape('vitesse (5 passes, médiane)', () => {
    const passes = [];
    const facteurs = [];
    for (let i = 0; i < 5; i++) {
      const r = lancer('node', ['test/perf.js']);
      const m = r.sortie.match(/([\d.]+) µs normalisés \(machine ×([\d.]+)\)/);
      if (m) { passes.push(Number(m[1])); facteurs.push(Number(m[2])); }
    }
    if (passes.length < 5) throw new Error('mesures incomplètes');
    passes.sort((a, b) => a - b);
    facteurs.sort((a, b) => a - b);
    const mediane = passes[2];
    const machine = facteurs[2];
    const dispersion = (passes[4] - passes[0]) / mediane;

    // Deux façons pour une machine de mentir, et il a fallu se faire prendre
    // par la seconde. La première est le tremblement : cinq passes qui
    // s'écartent. La seconde est la dérive — cinq passes bien serrées, toutes
    // fausses ensemble. Le même commit a mesuré 108 µs puis 160 µs à une heure
    // d'intervalle, code inchangé, dispersion normale. Un budget qui échoue sur
    // une machine chargée apprend à ignorer le rouge, ce qui est pire que pas
    // de budget du tout : on refuse donc de conclure plutôt que d'accuser.
    if (dispersion > 0.18) {
      throw new Error(`machine instable (±${Math.round(dispersion * 100)} %) — remesurer au calme`);
    }
    if (machine > 1.08) {
      throw new Error(`machine chargée (×${machine}) — mesure non concluante, `
        + `${mediane} µs relevés. Remesurer au calme avant de conclure.`);
    }
    if (mediane > 110) throw new Error(`${mediane} µs > budget 110 (machine ×${machine})`);
    return `${mediane} µs (machine ×${machine})`;
  });

  etape('navigateur (264 vérifications)', () => {
    const r = lancer('node', ['test/navigateur.js'],
      { env: { PW_CHROMIUM: '/opt/pw-browsers/chromium' }, timeout: 420000 });
    if (/EADDRINUSE/.test(r.sortie)) {
      throw new Error('port 8199 occupé — un serveur de test traîne, le tuer d’abord');
    }
    const rates = [...r.sortie.matchAll(/✗ ([^\n]+)/g)].map((x) => x[1]);
    if (rates.length) throw new Error(rates.join(' ; '));
    if (!/aucune erreur console/.test(r.sortie)) throw new Error('sortie incomplète');
    return `${(r.sortie.match(/✓/g) || []).length} ✓`;
  });

  // Les gardes du monde : le banc contre les fourchettes de CIBLES.json.
  // Elles ne disent pas « le monde est bon », elles disent « le monde ne s'est
  // pas effondré sans que personne ne le voie ». Chaque chantier les resserre.
  const fichierCibles = join(JEU, 'CIBLES.json');
  if (existsSync(fichierCibles)) {
    etape('gardes du monde (CIBLES.json)', () => {
      const cibles = JSON.parse(readFileSync(fichierCibles, 'utf8'));
      const r = lancer('node', ['tools/banc.js',
        '--graines', cibles.graines, '--horizon', String(cibles.horizon), '--json'],
      { timeout: 300000 });
      if (r.code !== 0) throw new Error('le banc a échoué');
      const sortie = JSON.parse(r.sortie.trim().split('\n').pop());
      const a = sortie.configs[0].agregats;
      const hors = [];
      for (const [cle, [mini, maxi]] of Object.entries(cibles.gardes)) {
        const brut = a[cle];
        const val = typeof brut === 'string' ? Number(brut.split('/')[0]) : brut;
        if (val < mini || val > maxi) hors.push(`${cle}=${brut} hors [${mini}, ${maxi}]`);
      }
      if (hors.length) throw new Error(hors.join(' ; '));
      return `${Object.keys(cibles.gardes).length} gardes tenues`;
    });
  }
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

const rates = bilan.filter((b) => !b.ok);
console.log('');
if (rates.length) {
  console.log(`✗ ${rates.length} étape(s) en échec — NE PAS COMMITTER.`);
  process.exitCode = 1;
} else {
  console.log(`✓ tout est vert (${bilan.length} étapes${COMPLET ? ', complet' : ', rapide — lancer --complet avant de pousser'}).`);
}
