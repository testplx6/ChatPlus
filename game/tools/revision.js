// Le moteur d'une révision quelconque, prêt à être joué à côté du courant.
//
// `git archive` plutôt qu'un stash ou un worktree : rien à remettre en place,
// rien qui puisse se perdre, et le moteur n'a aucune dépendance hors de `src/`.
// Une session de calibrage a déjà perdu un stash en route.
//
// Ce module est partagé par le banc (`--temoin`) et par la vérification
// (l'étape de vitesse) : les deux ont besoin du même témoin, et un témoin
// extrait de deux façons différentes n'est plus un témoin.

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const JEU = resolve(ICI, '..');
const DEPOT = resolve(JEU, '..');

/** Le témoin historique du chantier : l'économie d'avant le circuit fermé. */
export const TEMOIN = '82636d8';

/** Extrait `src/` d'une révision dans `.banc/<sha>/`, une fois, et le garde. */
export function srcDeRevision(rev) {
  const complet = execFileSync('git', ['-C', DEPOT, 'rev-parse', '--short', rev],
    { encoding: 'utf8' }).trim();
  const abri = join(JEU, '.banc');
  const cache = join(abri, complet);
  if (!existsSync(join(cache, 'sim.js'))) {
    mkdirSync(cache, { recursive: true });
    writeFileSync(join(abri, '.gitignore'), '*\n');
    // Le tar de src/ dépasse le méga-octet du tampon par défaut.
    const tar = execFileSync('git', ['-C', DEPOT, 'archive', complet, 'game/src'],
      { maxBuffer: 64 * 1024 * 1024 });
    execFileSync('tar', ['-x', '--strip-components=2', '-C', cache], { input: tar });
  }
  return { src: cache, rev: complet };
}
