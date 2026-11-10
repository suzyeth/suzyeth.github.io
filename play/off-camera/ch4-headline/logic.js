/* Episode 4 · The Morning After — match-3 rules (pure, no DOM).
 * Board: grid[r][c] = null | tile. Tiles are plain objects:
 *   colour tile {id, color 0..5, special: null|'h'|'v'|'area', charged, counted}
 *   Encore colour tile {id, color: WILD, base, special: 'color'}
 *   paparazzi photo {id, blocker: true}
 * The game layer attaches draw fields (x, y, s, a) to the same objects; the rules ignore them.
 * Loaded in the browser (window.Ch4Logic) and in Node for the self-test (module.exports). */
(function (root) {
  'use strict';
  const HEART = 0, WILD = -1;
  let seq = 0;
  const mk = (color, extra) => Object.assign({ id: ++seq, color, special: null, charged: false, counted: false }, extra || {});
  const blocker = () => ({ id: ++seq, blocker: true });
  const isTile = (t) => !!t && !t.blocker;
  const matchable = (t) => isTile(t) && t.color >= 0;
  const inB = (g, r, c) => r >= 0 && c >= 0 && r < g.length && c < g[0].length;
  const key = (r, c) => r * 32 + c;
  const unkey = (k) => [Math.floor(k / 32), k % 32];

  /* random colour; heartBias = extra chance (0..1) that a new tile is a heart */
  function randColor(cfg, rng) {
    if (cfg.heartBias && rng() < cfg.heartBias) return HEART;
    return Math.floor(rng() * cfg.colors);
  }

  /* ---------- match detection ---------- */
  function runs(g) {
    const out = [], R = g.length, C = g[0].length;
    for (let r = 0; r < R; r++) {
      let c = 0;
      while (c < C) {
        const t = g[r][c];
        let e = c + 1;
        if (matchable(t)) while (e < C && matchable(g[r][e]) && g[r][e].color === t.color) e++;
        if (matchable(t) && e - c >= 3) out.push({ dir: 'h', cells: Array.from({ length: e - c }, (_, i) => [r, c + i]), color: t.color });
        c = e;
      }
    }
    for (let c = 0; c < C; c++) {
      let r = 0;
      while (r < R) {
        const t = g[r][c];
        let e = r + 1;
        if (matchable(t)) while (e < R && matchable(g[e][c]) && g[e][c].color === t.color) e++;
        if (matchable(t) && e - r >= 3) out.push({ dir: 'v', cells: Array.from({ length: e - r }, (_, i) => [r + i, c]), color: t.color });
        r = e;
      }
    }
    return out;
  }
  /* merge runs that share a cell (L / T / plus shapes) */
  function groups(g) {
    const rs = runs(g), parent = rs.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map();
    rs.forEach((run, i) => run.cells.forEach(([r, c]) => {
      const k = key(r, c);
      if (owner.has(k)) parent[find(i)] = find(owner.get(k)); else owner.set(k, i);
    }));
    const by = new Map();
    rs.forEach((run, i) => { const p = find(i); if (!by.has(p)) by.set(p, []); by.get(p).push(run); });
    return [...by.values()].map((list) => {
      const cells = new Map();
      list.forEach((run) => run.cells.forEach(([r, c]) => cells.set(key(r, c), [r, c])));
      const longest = list.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      const hasH = list.some((x) => x.dir === 'h'), hasV = list.some((x) => x.dir === 'v');
      let make = null;
      if (longest.cells.length >= 5) make = 'color';
      else if (hasH && hasV) make = 'area';
      else if (longest.cells.length === 4) make = longest.dir;
      return { cells: [...cells.values()], color: list[0].color, runs: list, longest, make };
    });
  }
  const hasMatch = (g) => runs(g).length > 0;

  /* ---------- swaps ---------- */
  const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  function swap(g, a, b) { const t = g[a[0]][a[1]]; g[a[0]][a[1]] = g[b[0]][b[1]]; g[b[0]][b[1]] = t; }
  function isValidSwap(g, a, b) {
    if (!inB(g, a[0], a[1]) || !inB(g, b[0], b[1]) || !adjacent(a, b)) return false;
    const A = g[a[0]][a[1]], B = g[b[0]][b[1]];
    if (!isTile(A) || !isTile(B)) return false;
    if (A.special === 'color' || B.special === 'color') return true;
    if (A.special && B.special) return true;
    swap(g, a, b);
    const ok = runs(g).some((run) => run.cells.some(([r, c]) => (r === a[0] && c === a[1]) || (r === b[0] && c === b[1])));
    swap(g, a, b);
    return ok;
  }
  function findMove(g) {
    const R = g.length, C = g[0].length;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (c + 1 < C && isValidSwap(g, [r, c], [r, c + 1])) return [[r, c], [r, c + 1]];
      if (r + 1 < R && isValidSwap(g, [r, c], [r + 1, c])) return [[r, c], [r + 1, c]];
    }
    return null;
  }
  function allMoves(g) {
    const out = [], R = g.length, C = g[0].length;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (c + 1 < C && isValidSwap(g, [r, c], [r, c + 1])) out.push([[r, c], [r, c + 1]]);
      if (r + 1 < R && isValidSwap(g, [r, c], [r + 1, c])) out.push([[r, c], [r + 1, c]]);
    }
    return out;
  }

  /* ---------- blasts ---------- */
  function cellsOfColor(g, color) {
    const out = [];
    g.forEach((row, r) => row.forEach((t, c) => { if (matchable(t) && t.color === color) out.push([r, c]); }));
    return out;
  }
  function line(g, r, c, dir) {
    const out = [];
    if (dir === 'h') for (let x = 0; x < g[0].length; x++) out.push([r, x]);
    else for (let y = 0; y < g.length; y++) out.push([y, c]);
    return out;
  }
  function square(g, r, c, rad) {
    const out = [];
    for (let y = r - rad; y <= r + rad; y++) for (let x = c - rad; x <= c + rad; x++) if (inB(g, y, x)) out.push([y, x]);
    return out;
  }
  /* the most common colour on the board (an Encore set off by a blast clears its own colour if it still exists) */
  function commonColor(g) {
    const n = {};
    g.forEach((row) => row.forEach((t) => { if (matchable(t)) n[t.color] = (n[t.color] || 0) + 1; }));
    const best = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return best == null ? HEART : +best;
  }
  function blastOf(g, t, r, c, cfg) {
    if (t.special === 'h' || t.special === 'v') return { type: t.special, r, c, cells: line(g, r, c, t.special) };
    if (t.special === 'area') return { type: 'area', r, c, cells: square(g, r, c, cfg.areaRadius) };
    if (t.special === 'color') {
      const col = cellsOfColor(g, t.base).length ? t.base : commonColor(g);
      return { type: 'color', r, c, color: col, cells: cellsOfColor(g, col).concat([[r, c]]) };
    }
    return null;
  }

  /* ---------- one clear step ----------
   * ctx.swap = [a, b] for the move that started this chain (placement of new specials, special swaps).
   * Returns null when nothing clears, else {cleared, broken, created, blasts, groups, chainHearts}.
   * Mutates g: cleared cells become null, special creation cells keep a transformed tile. */
  function clearStep(g, ctx, cfg) {
    const toClear = new Map(), blasts = [], fired = new Set(), forced = [];
    const add = (r, c) => { if (inB(g, r, c) && g[r][c]) toClear.set(key(r, c), [r, c]); };
    const sw = ctx && ctx.swap;
    if (sw) {
      const [a, b] = sw, A = g[a[0]][a[1]], B = g[b[0]][b[1]];
      if (isTile(A) && isTile(B) && (A.special === 'color' || B.special === 'color')) {
        const [E, eAt, O, oAt] = A.special === 'color' ? [A, a, B, b] : [B, b, A, a];
        fired.add(E.id);
        if (O.special === 'color') {
          fired.add(O.id);
          const all = []; g.forEach((row, r) => row.forEach((t, c) => { if (t) all.push([r, c]); }));
          blasts.push({ type: 'color', r: eAt[0], c: eAt[1], color: WILD, cells: all });
          all.forEach(([r, c]) => add(r, c));
        } else {
          const cells = cellsOfColor(g, O.color);
          blasts.push({ type: 'color', r: eAt[0], c: eAt[1], color: O.color, cells });
          cells.forEach(([r, c]) => add(r, c)); add(eAt[0], eAt[1]); add(oAt[0], oAt[1]);
        }
      } else if (isTile(A) && isTile(B) && A.special && B.special) {
        fired.add(A.id); fired.add(B.id);
        const r = b[0], c = b[1], sp = [A.special, B.special];
        let cells;
        if (sp.includes('area') && sp.every((s) => s === 'area')) cells = square(g, r, c, cfg.areaRadius + 1);
        else if (sp.includes('area')) { cells = []; for (let k = -1; k <= 1; k++) { if (inB(g, r + k, c)) cells.push(...line(g, r + k, c, 'h')); if (inB(g, r, c + k)) cells.push(...line(g, r, c + k, 'v')); } }
        else cells = line(g, r, c, 'h').concat(line(g, r, c, 'v'));
        blasts.push({ type: 'combo', r, c, cells });
        cells.forEach(([y, x]) => add(y, x)); add(a[0], a[1]);
      }
    }
    const gs = groups(g), created = [];
    gs.forEach((grp) => {
      grp.cells.forEach(([r, c]) => add(r, c));
      if (!grp.make) return;
      const inGroup = (p) => p && grp.cells.some(([r, c]) => r === p[0] && c === p[1]);
      let at = sw ? [sw[1], sw[0]].find((p) => inGroup(p) && !g[p[0]][p[1]].special) : null;
      if (!at) {
        const mid = grp.longest.cells[Math.floor(grp.longest.cells.length / 2)];
        at = [mid].concat(grp.cells).find(([r, c]) => !g[r][c].special);
      }
      if (at) created.push({ r: at[0], c: at[1], make: grp.make, color: grp.color });
    });
    if (!toClear.size) return null;
    const keep = new Set(created.map((x) => key(x.r, x.c)));
    /* chain specials caught in the clear */
    let changed = true;
    while (changed) {
      changed = false;
      for (const [k, [r, c]] of [...toClear]) {
        const t = g[r][c];
        if (!isTile(t) || !t.special || fired.has(t.id) || keep.has(k)) continue;
        fired.add(t.id);
        const bl = blastOf(g, t, r, c, cfg);
        if (bl) { blasts.push(bl); bl.cells.forEach(([y, x]) => { if (!toClear.has(key(y, x)) && g[y][x]) { toClear.set(key(y, x), [y, x]); changed = true; } }); }
      }
    }
    /* paparazzi photos break next to any cleared tile, or inside a blast */
    const broken = new Map();
    for (const [k, [r, c]] of toClear) {
      const t = g[r][c];
      if (t && t.blocker) { broken.set(k, [r, c]); continue; }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dy, dx]) => {
        const y = r + dy, x = c + dx;
        if (inB(g, y, x) && g[y][x] && g[y][x].blocker) broken.set(key(y, x), [y, x]);
      });
    }
    const cleared = [], brokenOut = [];
    let hearts = 0;
    const score = (t) => { if (t.color === HEART && !t.counted) { hearts += t.charged ? cfg.chargedValue : 1; t.counted = true; } };
    for (const [k, [r, c]] of toClear) {
      const t = g[r][c];
      if (!t || t.blocker) continue;
      score(t);
      if (keep.has(k)) continue;
      cleared.push({ tile: t, r, c });
      g[r][c] = null;
    }
    for (const [, [r, c]] of broken) { const t = g[r][c]; if (t && t.blocker) { brokenOut.push({ tile: t, r, c }); g[r][c] = null; } }
    created.forEach((x) => {
      const t = g[x.r][x.c];
      if (!t) return;
      t.counted = true; t.charged = false;
      if (x.make === 'color') { t.special = 'color'; t.base = x.color; t.color = WILD; } else t.special = x.make;
      x.tile = t;
    });
    return { cleared, broken: brokenOut, created, blasts, groups: gs.length, hearts, forced };
  }

  /* ---------- gravity + refill ----------
   * returns {moved:[{tile, r, c, from}], spawned:[{tile, r, c, k}]} where k = spawn order in the column (0 = lowest) */
  function collapse(g, cfg, rng) {
    const R = g.length, C = g[0].length, moved = [], spawned = [];
    for (let c = 0; c < C; c++) {
      let w = R - 1;
      for (let r = R - 1; r >= 0; r--) {
        const t = g[r][c];
        if (!t) continue;
        if (w !== r) { g[w][c] = t; g[r][c] = null; moved.push({ tile: t, r: w, c, from: r }); }
        w--;
      }
      for (let r = w, k = 0; r >= 0; r--, k++) {
        const t = mk(randColor(cfg, rng));
        g[r][c] = t; spawned.push({ tile: t, r, c, k, n: w + 1 });
      }
    }
    return { moved, spawned };
  }

  /* ---------- board setup ---------- */
  function wouldMatch(g, r, c, color) {
    const same = (y, x) => inB(g, y, x) && matchable(g[y][x]) && g[y][x].color === color;
    return (same(r, c - 1) && same(r, c - 2)) || (same(r, c + 1) && same(r, c + 2)) || (same(r, c - 1) && same(r, c + 1))
      || (same(r - 1, c) && same(r - 2, c)) || (same(r + 1, c) && same(r + 2, c)) || (same(r - 1, c) && same(r + 1, c));
  }
  function safeColor(g, r, c, cfg, rng) {
    for (let i = 0; i < 30; i++) { const col = randColor(cfg, rng); if (!wouldMatch(g, r, c, col)) return col; }
    for (let col = 0; col < cfg.colors; col++) if (!wouldMatch(g, r, c, col)) return col;
    return 0;
  }
  function shuffled(a, rng) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

  /* cfg: {rows, cols, colors, heartBias, blockers, extraRow, charged, spotlights, areaRadius, chargedValue} */
  function createBoard(cfg, rng) {
    rng = rng || Math.random;
    for (let attempt = 0; attempt < 200; attempt++) {
      const g = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(null));
      /* photos: an optional full row (Episode 3 carry-over) + scattered ones in the lower two thirds */
      if (cfg.extraRow > 0) {
        const row = Math.floor(cfg.rows / 2);
        shuffled(Array.from({ length: cfg.cols }, (_, i) => i), rng).slice(0, Math.min(cfg.cols, cfg.extraRow)).forEach((c) => { g[row][c] = blocker(); });
      }
      const free = [];
      for (let r = Math.floor(cfg.rows / 3); r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) if (!g[r][c]) free.push([r, c]);
      shuffled(free, rng).slice(0, Math.min(cfg.blockers, Math.floor(free.length / 2))).forEach(([r, c]) => { g[r][c] = blocker(); });
      for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) if (!g[r][c]) g[r][c] = mk(safeColor(g, r, c, cfg, rng));
      /* Episode 2 carry-over: charged hearts (turn tiles into hearts where that makes no match) */
      let need = cfg.charged || 0;
      shuffled(tilesOf(g), rng).forEach(([r, c]) => {
        if (need <= 0) return;
        const t = g[r][c];
        if (t.color === HEART) { t.charged = true; need--; return; }
        const old = t.color; t.color = HEART;
        g[r][c] = null; const bad = wouldMatch(g, r, c, HEART); g[r][c] = t;
        if (bad) t.color = old; else { t.charged = true; need--; }
      });
      /* Viv's Statement booster: Spotlight tiles placed in advance */
      shuffled(tilesOf(g).filter(([r, c]) => !g[r][c].charged), rng).slice(0, cfg.spotlights || 0).forEach(([r, c], i) => { g[r][c].special = i % 2 ? 'v' : 'h'; });
      if (!hasMatch(g) && findMove(g)) return g;
    }
    throw new Error('Ch4Logic.createBoard: no playable board after 200 attempts');
  }
  function tilesOf(g) { const out = []; g.forEach((row, r) => row.forEach((t, c) => { if (isTile(t)) out.push([r, c]); })); return out; }

  /* keeps photos in place; re-deals every other tile until there is no match and at least one move.
   * Falls back to recolouring plain tiles if no deal works. Returns [{tile, r, c, from:[r,c]}]. */
  function reshuffle(g, cfg, rng) {
    rng = rng || Math.random;
    const cells = tilesOf(g), tiles = cells.map(([r, c]) => g[r][c]);
    const from = new Map(cells.map(([r, c]) => [g[r][c].id, [r, c]]));
    for (let attempt = 0; attempt < 300; attempt++) {
      const order = shuffled(tiles, rng);
      cells.forEach(([r, c], i) => { g[r][c] = order[i]; });
      if (attempt >= 100) cells.forEach(([r, c]) => { const t = g[r][c]; if (!t.special && !t.charged) { t.color = -9; t.color = safeColor(g, r, c, cfg, rng); } });
      if (!hasMatch(g) && findMove(g)) return cells.map(([r, c]) => ({ tile: g[r][c], r, c, from: from.get(g[r][c].id) }));
    }
    /* last resort (never seen in the self-test): drop a photo so the board opens up */
    const b = []; g.forEach((row, r) => row.forEach((t, c) => { if (t && t.blocker) b.push([r, c]); }));
    if (b.length) { const [r, c] = b[0]; g[r][c] = mk(safeColor(g, r, c, cfg, rng)); return reshuffle(g, cfg, rng); }
    throw new Error('Ch4Logic.reshuffle: no playable deal');
  }

  function count(g, pred) { let n = 0; g.forEach((row) => row.forEach((t) => { if (t && pred(t)) n++; })); return n; }
  const blockersLeft = (g) => count(g, (t) => t.blocker);

  const api = { HEART, WILD, mk, runs, groups, hasMatch, isValidSwap, swap, findMove, allMoves, clearStep, collapse, createBoard, reshuffle, blockersLeft, count, isTile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ch4Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
