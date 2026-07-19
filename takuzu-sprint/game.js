(() => {
  'use strict';

  /* =====================================================================
   * Takuzu Sprint — moteur de jeu
   *
   * Règles (grille N×N, N pair, valeurs 0 = soleil / 1 = lune) :
   *  1. jamais trois valeurs identiques adjacentes en ligne ou colonne
   *  2. chaque ligne / colonne contient N/2 soleils et N/2 lunes
   *  3. pas deux lignes identiques, pas deux colonnes identiques
   * Chaque puzzle généré possède une solution unique.
   * ===================================================================== */

  const SUN = 0;
  const MOON = 1;
  const STORAGE_KEY = 'takuzu-sprint-stats-v1';
  const HISTORY_MAX = 12;

  // ---------- utilitaires ----------

  const $ = (sel) => document.querySelector(sel);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(ms) {
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec - min * 60;
    const secStr = sec.toFixed(1).padStart(4, '0');
    return `${min}:${secStr}`;
  }

  // ---------- moteur takuzu ----------

  // Vérifie si le placement en (r, c) crée une violation de règle.
  // Le reste de la grille peut être partiellement rempli (null = vide).
  function violatesAt(grid, size, r, c) {
    const half = size / 2;

    // triplets dans la ligne autour de c
    for (let cc = Math.max(0, c - 2); cc <= Math.min(c, size - 3); cc++) {
      const a = grid[r][cc], b = grid[r][cc + 1], d = grid[r][cc + 2];
      if (a !== null && a === b && b === d) return true;
    }
    // triplets dans la colonne autour de r
    for (let rr = Math.max(0, r - 2); rr <= Math.min(r, size - 3); rr++) {
      const a = grid[rr][c], b = grid[rr + 1][c], d = grid[rr + 2][c];
      if (a !== null && a === b && b === d) return true;
    }

    // quotas de la ligne r
    let suns = 0, moons = 0, rowFull = true;
    for (let cc = 0; cc < size; cc++) {
      const v = grid[r][cc];
      if (v === SUN) suns++;
      else if (v === MOON) moons++;
      else rowFull = false;
    }
    if (suns > half || moons > half) return true;

    // quotas de la colonne c
    let csuns = 0, cmoons = 0, colFull = true;
    for (let rr = 0; rr < size; rr++) {
      const v = grid[rr][c];
      if (v === SUN) csuns++;
      else if (v === MOON) cmoons++;
      else colFull = false;
    }
    if (csuns > half || cmoons > half) return true;

    // lignes identiques (seulement si la ligne r est complète)
    if (rowFull) {
      for (let rr = 0; rr < size; rr++) {
        if (rr === r) continue;
        let same = true;
        for (let cc = 0; cc < size; cc++) {
          if (grid[rr][cc] === null || grid[rr][cc] !== grid[r][cc]) { same = false; break; }
        }
        if (same) return true;
      }
    }

    // colonnes identiques (seulement si la colonne c est complète)
    if (colFull) {
      for (let cc = 0; cc < size; cc++) {
        if (cc === c) continue;
        let same = true;
        for (let rr = 0; rr < size; rr++) {
          if (grid[rr][cc] === null || grid[rr][cc] !== grid[rr][c]) { same = false; break; }
        }
        if (same) return true;
      }
    }

    return false;
  }

  // Génère une grille complète valide par backtracking aléatoire.
  function generateFull(size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(null));

    function fill(idx) {
      if (idx === size * size) return true;
      const r = Math.floor(idx / size);
      const c = idx % size;
      for (const v of shuffle([SUN, MOON])) {
        grid[r][c] = v;
        if (!violatesAt(grid, size, r, c) && fill(idx + 1)) return true;
        grid[r][c] = null;
      }
      return false;
    }

    fill(0);
    return grid;
  }

  // Compte les solutions d'une grille partielle (plafonné à `cap`).
  function countSolutions(grid, size, cap) {
    const empties = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === null) empties.push([r, c]);
      }
    }
    let count = 0;

    function bt(i) {
      if (count >= cap) return;
      if (i === empties.length) { count++; return; }
      const [r, c] = empties[i];
      for (const v of [SUN, MOON]) {
        grid[r][c] = v;
        if (!violatesAt(grid, size, r, c)) bt(i + 1);
        grid[r][c] = null;
        if (count >= cap) return;
      }
    }

    bt(0);
    return count;
  }

  // Crée un puzzle à solution unique : grille pleine puis retrait de cases.
  function makePuzzle(size) {
    const solution = generateFull(size);
    const puzzle = solution.map((row) => row.slice());
    const cells = shuffle(
      Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size])
    );
    for (const [r, c] of cells) {
      const saved = puzzle[r][c];
      puzzle[r][c] = null;
      if (countSolutions(puzzle, size, 2) !== 1) puzzle[r][c] = saved;
    }
    return { puzzle, solution };
  }

  // Renvoie l'ensemble des cases "r,c" impliquées dans une violation.
  function findConflicts(grid, size) {
    const half = size / 2;
    const bad = new Set();
    const mark = (r, c) => bad.add(r + ',' + c);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c + 2 < size; c++) {
        const a = grid[r][c], b = grid[r][c + 1], d = grid[r][c + 2];
        if (a !== null && a === b && b === d) { mark(r, c); mark(r, c + 1); mark(r, c + 2); }
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r + 2 < size; r++) {
        const a = grid[r][c], b = grid[r + 1][c], d = grid[r + 2][c];
        if (a !== null && a === b && b === d) { mark(r, c); mark(r + 1, c); mark(r + 2, c); }
      }
    }

    for (let r = 0; r < size; r++) {
      let suns = 0, moons = 0;
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === SUN) suns++;
        else if (grid[r][c] === MOON) moons++;
      }
      const over = suns > half ? SUN : moons > half ? MOON : null;
      if (over !== null) {
        for (let c = 0; c < size; c++) if (grid[r][c] === over) mark(r, c);
      }
    }
    for (let c = 0; c < size; c++) {
      let suns = 0, moons = 0;
      for (let r = 0; r < size; r++) {
        if (grid[r][c] === SUN) suns++;
        else if (grid[r][c] === MOON) moons++;
      }
      const over = suns > half ? SUN : moons > half ? MOON : null;
      if (over !== null) {
        for (let r = 0; r < size; r++) if (grid[r][c] === over) mark(r, c);
      }
    }

    // lignes / colonnes complètes identiques
    const rowKey = (r) => grid[r].every((v) => v !== null) ? grid[r].join('') : null;
    for (let r1 = 0; r1 < size; r1++) {
      const k1 = rowKey(r1);
      if (k1 === null) continue;
      for (let r2 = r1 + 1; r2 < size; r2++) {
        if (rowKey(r2) === k1) {
          for (let c = 0; c < size; c++) { mark(r1, c); mark(r2, c); }
        }
      }
    }
    const colKey = (c) => {
      let k = '';
      for (let r = 0; r < size; r++) {
        if (grid[r][c] === null) return null;
        k += grid[r][c];
      }
      return k;
    };
    for (let c1 = 0; c1 < size; c1++) {
      const k1 = colKey(c1);
      if (k1 === null) continue;
      for (let c2 = c1 + 1; c2 < size; c2++) {
        if (colKey(c2) === k1) {
          for (let r = 0; r < size; r++) { mark(r, c1); mark(r, c2); }
        }
      }
    }

    return bad;
  }

  // ---------- statistiques / records ----------

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveStats(stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }

  function statsFor(stats, size) {
    if (!stats[size]) {
      stats[size] = {
        played: 0,
        wins: 0,
        bestTime: null,
        bestAo5: null,
        bestStreak: 0,
        streak: 0,
        lastTimes: [],
        history: [],
      };
    }
    return stats[size];
  }

  function ao5(times) {
    if (times.length < 5) return null;
    const last5 = times.slice(-5);
    return last5.reduce((a, b) => a + b, 0) / 5;
  }

  // Enregistre une victoire ; renvoie la liste des records battus.
  function recordWin(size, ms) {
    const stats = loadStats();
    const s = statsFor(stats, size);
    const badges = [];

    s.played++;
    s.wins++;
    s.streak++;
    if (s.streak > s.bestStreak) s.bestStreak = s.streak;

    if (s.bestTime === null || ms < s.bestTime) {
      if (s.bestTime !== null) badges.push({ type: 'record', text: '🏆 Nouveau record de temps !' });
      s.bestTime = ms;
    }

    s.lastTimes.push(ms);
    if (s.lastTimes.length > 5) s.lastTimes = s.lastTimes.slice(-5);
    const avg = ao5(s.lastTimes);
    if (avg !== null && (s.bestAo5 === null || avg < s.bestAo5)) {
      if (s.bestAo5 !== null) badges.push({ type: 'record', text: '📈 Meilleure moyenne de 5 !' });
      s.bestAo5 = avg;
    }

    if (s.streak >= 3) badges.push({ type: 'streak', text: `🔥 Série de ${s.streak} victoires` });

    s.history.unshift({ t: ms, d: Date.now() });
    if (s.history.length > HISTORY_MAX) s.history = s.history.slice(0, HISTORY_MAX);

    saveStats(stats);
    return badges;
  }

  // Partie abandonnée (nouvelle grille demandée après avoir joué) : casse la série.
  function recordAbandon(size) {
    const stats = loadStats();
    const s = statsFor(stats, size);
    s.played++;
    s.streak = 0;
    s.lastTimes = [];
    s.history.unshift({ t: null, d: Date.now() });
    if (s.history.length > HISTORY_MAX) s.history = s.history.slice(0, HISTORY_MAX);
    saveStats(stats);
  }

  // ---------- état de la partie ----------

  const state = {
    size: 6,
    grid: null,       // valeurs jouées (inclut les indices)
    given: null,      // booléen : case indice (non modifiable)
    startTime: 0,
    timerId: null,
    finished: false,
    moved: false,     // au moins un coup joué dans la partie en cours
  };

  // ---------- rendu ----------

  const boardEl = $('#board');
  const timerEl = $('#timer');

  function buildBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${state.size}, 1fr)`;
    boardEl.classList.remove('finished');
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        const btn = document.createElement('button');
        btn.className = 'cell';
        btn.dataset.r = r;
        btn.dataset.c = c;
        btn.setAttribute('role', 'gridcell');
        const disc = document.createElement('span');
        disc.className = 'disc';
        btn.appendChild(disc);
        if (state.given[r][c]) btn.classList.add('given');
        btn.addEventListener('click', () => cycleCell(r, c, +1));
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          cycleCell(r, c, -1);
        });
        boardEl.appendChild(btn);
      }
    }
    paintBoard();
  }

  function paintBoard() {
    const conflicts = findConflicts(state.grid, state.size);
    for (const btn of boardEl.children) {
      const r = +btn.dataset.r;
      const c = +btn.dataset.c;
      const v = state.grid[r][c];
      btn.classList.toggle('sun', v === SUN);
      btn.classList.toggle('moon', v === MOON);
      btn.classList.toggle('conflict', conflicts.has(r + ',' + c));
      const label = v === SUN ? 'soleil' : v === MOON ? 'lune' : 'vide';
      btn.setAttribute('aria-label', `Ligne ${r + 1}, colonne ${c + 1} : ${label}`);
    }
  }

  function cycleCell(r, c, dir) {
    if (state.finished || state.given[r][c]) return;
    const order = [null, SUN, MOON];
    const idx = order.indexOf(state.grid[r][c]);
    state.grid[r][c] = order[(idx + dir + 3) % 3];
    state.moved = true;
    paintBoard();
    checkWin();
  }

  function checkWin() {
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        if (state.grid[r][c] === null) return;
      }
    }
    if (findConflicts(state.grid, state.size).size > 0) return;

    // victoire !
    state.finished = true;
    boardEl.classList.add('finished');
    stopTimer();
    const ms = performance.now() - state.startTime;
    timerEl.textContent = formatTime(ms);
    const badges = recordWin(state.size, ms);
    renderStats();
    showWinOverlay(ms, badges);
  }

  // ---------- chrono ----------

  function startTimer() {
    stopTimer();
    state.startTime = performance.now();
    state.timerId = setInterval(() => {
      timerEl.textContent = formatTime(performance.now() - state.startTime);
    }, 100);
    timerEl.textContent = '0:00.0';
  }

  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  // ---------- statistiques : affichage ----------

  function renderStats() {
    const s = statsFor(loadStats(), state.size);
    $('#stats-size-label').textContent = `${state.size}×${state.size}`;
    $('#stat-best').textContent = s.bestTime !== null ? formatTime(s.bestTime) : '—';
    const currentAvg = ao5(s.lastTimes);
    $('#stat-ao5').textContent = currentAvg !== null ? formatTime(currentAvg) : '—';
    $('#stat-best-ao5').textContent = s.bestAo5 !== null ? formatTime(s.bestAo5) : '—';
    $('#stat-streak').textContent = `${s.streak} / ${s.bestStreak}`;
    $('#stat-wins').textContent = `${s.wins} / ${s.played} parties`;
    $('#live-streak').textContent = `🔥 ${s.streak}`;

    const hist = $('#history');
    hist.innerHTML = '';
    for (const h of s.history) {
      const li = document.createElement('li');
      const time = document.createElement('span');
      time.className = 'h-time ' + (h.t !== null ? 'win' : 'loss');
      time.textContent = h.t !== null ? formatTime(h.t) : 'abandon';
      const date = document.createElement('span');
      date.className = 'h-date';
      date.textContent = new Date(h.d).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      });
      li.append(time, date);
      hist.appendChild(li);
    }
  }

  // ---------- overlays ----------

  function showWinOverlay(ms, badges) {
    $('#win-time').textContent = formatTime(ms);
    const wrap = $('#win-badges');
    wrap.innerHTML = '';
    for (const b of badges) {
      const el = document.createElement('div');
      el.className = 'badge ' + b.type;
      el.textContent = b.text;
      wrap.appendChild(el);
    }
    $('#win-overlay').classList.remove('hidden');
  }

  // ---------- cycle de vie d'une partie ----------

  function newGame(size) {
    // abandonner la partie en cours casse la série
    if (state.grid && state.moved && !state.finished) {
      recordAbandon(state.size);
    }

    state.size = size;
    const { puzzle } = makePuzzle(size);
    state.grid = puzzle.map((row) => row.slice());
    state.given = puzzle.map((row) => row.map((v) => v !== null));
    state.finished = false;
    state.moved = false;

    $('#win-overlay').classList.add('hidden');
    buildBoard();
    renderStats();
    startTimer();
  }

  // ---------- écouteurs ----------

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      newGame(+btn.dataset.size);
    });
  });

  $('#new-game').addEventListener('click', () => newGame(state.size));
  $('#play-again').addEventListener('click', () => newGame(state.size));

  $('#show-rules').addEventListener('click', () => $('#rules-overlay').classList.remove('hidden'));
  $('#close-rules').addEventListener('click', () => $('#rules-overlay').classList.add('hidden'));

  $('#reset-stats').addEventListener('click', () => {
    if (confirm('Effacer tous les records ?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderStats();
    }
  });

  // ---------- démarrage ----------

  newGame(6);
})();
