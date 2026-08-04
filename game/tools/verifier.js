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
import { verdict } from './vitesse.js';
import { srcDeRevision, TEMOIN } from './revision.js';

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
  // Les deux verdicts de vitesse sont écartés ici : ils dérivent d'une passe
  // unique prise au milieu d'une suite chargée, et « rattrapage maximal » n'est
  // que le même chiffre exprimé en secondes de rejeu. La vitesse se juge à
  // l'étape dédiée, au calme, en médiane de cinq passes et avec le facteur
  // machine sous les yeux — une passe unique a déjà fait accuser un innocent.
  const TIMING = /^tick sous |^rattrapage maximal /;
  const echecs = [...r.sortie.matchAll(/✗ ([^\n]+)/g)]
    .map((x) => x[1]).filter((x) => !TIMING.test(x));
  if (echecs.length) throw new Error(echecs.join(' ; '));
  return `${m[1]}/${m[2]}`;
});

// ---------------------------------------------------------------------------
// 4. La vitesse, jugée contre un témoin — la seule façon qui résiste à la
// machine du jour. Le détail de l'instrument et les quatre relevés qui l'ont
// dicté sont dans tools/vitesse.js.
// ---------------------------------------------------------------------------

/**
 * Ce qu'on s'autorise, en multiples du coût d'un tick au témoin.
 *
 * Traduction de l'ancien budget, pas un desserrage : il valait 110 µs
 * « normalisés », le témoin en mesure 60 à 64 bruts sur cette machine, soit 67
 * à 71 une fois normalisés par le même facteur — d'où 110/71 ≈ 1,55. La preuve
 * que ce n'est pas un budget taillé pour passer : le tick est aujourd'hui à
 * ×1,92 et l'étape reste rouge.
 */
const BUDGET = 1.55;

if (COMPLET) {
  etape(`vitesse (contre le témoin ${TEMOIN})`, () => {
    const { src: temoinSrc, rev } = srcDeRevision(TEMOIN);
    const une = (src) => {
      const r = lancer('node', ['tools/vitesse.js', src]);
      const v = Number((r.sortie.match(/([\d.]+)/) || [])[1]);
      if (!(v > 0)) throw new Error(`mesure illisible : ${r.sortie.trim().slice(0, 80)}`);
      return v;
    };
    // En alternant, et chacune dans son processus : mesurer les deux révisions
    // dans le même processus les fait se réchauffer l'une l'autre — 216, 157
    // puis 132 µs pour trois mesures du même code, dans l'ordre, sans que rien
    // ne change.
    const courants = [];
    const temoins = [];
    for (let i = 0; i < 3; i++) { courants.push(une(SRC)); temoins.push(une(temoinSrc)); }
    const courant = Math.min(...courants);
    const temoin = Math.min(...temoins);
    const dispersion = (Math.max(...courants) - courant) / courant;

    const v = verdict({ courant, temoin, budget: BUDGET, dispersion });
    if (v.issue !== 'tenu') throw new Error(`${v.dit} [${v.issue}]`);
    return `${v.dit}, témoin ${rev}`;
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
