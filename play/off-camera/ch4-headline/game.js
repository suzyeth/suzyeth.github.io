/* Episode 4 · The Morning After — match-3 "the feed".
 * Swap tiles to collect hearts (the story you want) and break paparazzi photos.
 * Flow: dialogue (Go public / One more week) → tutorial → countdown → moves-based board → result
 * (+5 Moves continues the same board) → ending → end card.
 * Depends on: kit.js, wallet.js, frame.js, logic.js (Ch4Logic), art.js (Ch4Art), story.js (Ch4Story). */
(function () {
  'use strict';
  const L = window.Ch4Logic, A = window.Ch4Art, St = window.Ch4Story;
  const tr = (en, zh) => Kit.tr(en, zh);
  const ROWS = 8, COLS = 7, CS = 50, BX = (390 - COLS * CS) / 2, BY = 214;
  const BOOST_MOVES = 5, BOOSTER_GEMS = 30, VIV_SPOTLIGHTS = 2;
  const PTS = { tile: 10, photo: 30, special: 20, moveLeft: 50 };
  const LOW_MOVES = 5, HINT_AFTER = 4;
  const FLASH = 0.06, POP = 0.36, CRACK = 0.1, REFUSE = 0.42, SHAKE = 0.26;

  const ui = Kit.mount({ id: 'ch4-headline', title: 'The Morning After · 头条之后', episode: 'Episode 4 · The Morning After' });
  Kit.resetRetries();

  /* ---------- tuning ---------- */
  const SCHEMA = [
    { key: 'moves', label: 'Moves · 步数', min: 12, max: 35, step: 1, value: 22, hint: 'Fewer moves, more pressure. +5 Moves is sold against this number. · 步数越少越紧张；「+5 步」就是卖这个数。' },
    { key: 'heartTarget', label: 'Heart target · 目标心数', min: 8, max: 40, step: 1, value: 22, hint: 'Base target before the opening choice (Go public -4, one more week +5). · 开场选择前的基础目标（公开 -4，再瞒一周 +5）。' },
    { key: 'blockers', label: 'Paparazzi photos · 狗仔照片', min: 0, max: 16, step: 1, value: 7, hint: 'Base photo count before the choice (Go public +3, one more week -3). · 开场选择前的基础数量（公开 +3，再瞒一周 -3）。' },
    { key: 'colors', label: 'Tile kinds · 方块种类', min: 5, max: 6, step: 1, value: 6, hint: '5 kinds means more matches and cascades; 6 is the classic difficulty. · 5 种更容易连消，6 种是经典难度。' },
    { key: 'heartBias', label: 'Heart drop bonus · 心形掉落加成', min: 0, max: 30, step: 1, value: 6, fmt: (v) => v + '%', hint: 'Extra chance a new tile is a heart. The cheapest way to soften the heart goal. · 新方块额外成为心的概率，最温和的降难手段。' },
    { key: 'areaRadius', label: 'Encore blast size · 安可爆炸范围', min: 1, max: 2, step: 1, value: 1, fmt: (v) => `${v * 2 + 1}×${v * 2 + 1}`, hint: 'Area cleared by an L/T Encore. · L/T 形安可清除的范围。' },
    { key: 'cascadeBonus', label: 'Cascade score · 连锁加分', min: 0, max: 150, step: 10, value: 50, fmt: (v) => '+' + v + '%', hint: 'Score bonus per cascade step; feeds the combo feel and the star line. · 每多一层连锁的加分比例。' },
    { key: 'chargedHearts', label: 'Charged hearts (Ep 2) · 充能心（第二集）', min: 0, max: 8, step: 1, value: 4, hint: 'If he confessed in Episode 2, this many hearts start charged. · 第二集告白成功时，开局充能心的数量。' },
    { key: 'chargedValue', label: 'Charged heart value · 充能心价值', min: 2, max: 3, step: 1, value: 2, hint: 'How many hearts a charged heart counts as. · 一颗充能心算几颗。' },
    { key: 'extraRow', label: 'Extra photo row (Ep 3) · 额外照片（第三集）', min: 0, max: 7, step: 1, value: 7, hint: 'If the Episode 3 look flopped, this many photos fill one extra row. · 第三集失败时，额外一排狗仔照片的数量。' },
  ];
  const PRESETS = {
    '剧情开头（新手）': { moves: 26, heartTarget: 16, blockers: 4, colors: 5, heartBias: 10, areaRadius: 1, cascadeBonus: 50, chargedHearts: 5, chargedValue: 2, extraRow: 4 },
    '标准': SCHEMA.reduce((a, s) => (a[s.key] = s.value, a), {}),
    '剧情中后期': { moves: 20, heartTarget: 26, blockers: 9, colors: 6, heartBias: 3, areaRadius: 1, cascadeBonus: 50, chargedHearts: 3, chargedValue: 2, extraRow: 7 },
  };
  Kit.tuning.define(SCHEMA, {
    presets: PRESETS,
    note: 'Changes apply from the next round. Hearts and photos shift with the opening choice. · 改完下一局生效；心和照片的数量会随开场选择变化。',
    onChange: () => { if (S.phase === 'play' || S.phase === 'busy') Kit.toast(tr('Applies next round', '下一局生效')); },
  });

  /* ---------- state ---------- */
  const S = {
    phase: 'intro', cfg: null, carry: null, choice: 'public', goal: null, grid: null,
    moves: 0, hearts: 0, score: 0, chain: 0, bestChain: 0, broken: 0, attempt: 0, continues: 0, booster: null,
    sel: null, targets: [], cursor: [3, 3], idle: 0, hint: null, said: {}, heartsDone: false, photosDone: false, turn: 0,
  };

  /* ---------- canvas, art, fx ---------- */
  const cv = Kit.canvas();
  const ctx = cv.ctx;
  const SPR = A.sprites();
  const bgImg = A.backdrop();
  const glass = A.boardGlass(COLS, ROWS, CS);
  const parts = Kit.particles();
  const motes = Array.from({ length: 14 }, () => ({ x: Kit.rand(0, 390), y: Kit.rand(0, 520), r: Kit.rand(1, 2.6), v: Kit.rand(3, 9), p: Kit.rand(0, 6) }));
  const dying = [], beams = [], flyers = [];
  let shake = 0, freeze = 0, heartPulse = 0, movePulse = 0, bubble = null, clock = 0, floats = [];

  const cellXY = (r, c) => [BX + c * CS + CS / 2, BY + r * CS + CS / 2];
  const place = (t, r, c) => { t.x = c; t.y = r; t.s = 1; t.a = 1; return t; };
  const say = (k) => { const s = St.SAY[k]; if (s) bubble = { name: s[0], en: s[1], zh: s[2], t: 0, life: 3.4 }; };
  const sayOnce = (k) => { if (!S.said[k]) { S.said[k] = 1; say(k); } };

  /* ---------- tweens (frozen during hit-stop) ---------- */
  const tweens = [];
  const tween = (dur, fn) => new Promise((res) => tweens.push({ t: 0, dur, fn, res }));
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeBack = (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const fallEase = (k) => (k < 0.82 ? Math.pow(k / 0.82, 2) : 1 - 0.07 * Math.sin((k - 0.82) / 0.18 * Math.PI));

  /* ---------- round setup ---------- */
  function goalFor(cfg, choice, carry, booster) {
    const d = St.CHOICE[choice];
    const extra = carry.ch3Failed ? cfg.extraRow : 0;
    return {
      moves: cfg.moves, hearts: Math.max(4, cfg.heartTarget + d.hearts),
      base: Math.max(0, cfg.blockers + d.blockers), extra, booster,
      charged: carry.confessed ? cfg.chargedHearts : 0,
      get blockers() { return this.base + this.extra; },
    };
  }
  function boardCfg() {
    return { rows: ROWS, cols: COLS, colors: S.cfg.colors, heartBias: S.cfg.heartBias / 100, areaRadius: S.cfg.areaRadius, chargedValue: S.cfg.chargedValue,
      blockers: S.goal.base, extraRow: S.goal.extra, charged: S.goal.charged, spotlights: S.booster === 'viv' ? VIV_SPOTLIGHTS : 0 };
  }
  function newRound() {
    S.cfg = Object.assign({}, Kit.tuning.values);
    S.goal = goalFor(S.cfg, S.choice, S.carry, S.booster);
    S.grid = L.createBoard(boardCfg());
    S.goal.base = L.blockersLeft(S.grid) - S.goal.extra;   // the generator can cap photos on a crowded board
    S.moves = S.goal.moves; S.hearts = 0; S.score = 0; S.bestChain = 0; S.broken = 0; S.continues = 0; S.turn = 0;
    S.sel = null; S.targets = []; S.hint = null; S.idle = 0; S.said = {}; S.heartsDone = false; S.photosDone = false;
    dying.length = 0; beams.length = 0; flyers.length = 0; parts.list.length = 0; floats = [];
    S.grid.forEach((row, r) => row.forEach((t, c) => place(t, r - ROWS - 1 - (ROWS - r) * 0.35 - c * 0.12, c)));
  }
  async function dropIn() {
    const items = [];
    S.grid.forEach((row, r) => row.forEach((t, c) => items.push({ t, from: t.y, to: r, d: (ROWS - r) * 0.035 + c * 0.02 })));
    await tween(0.85, (k, el) => items.forEach((it) => { const kk = Kit.clamp((el - it.d) / 0.5, 0, 1); it.t.y = it.from + (it.to - it.from) * fallEase(kk); }));
  }

  async function playRound() {
    S.attempt++;
    newRound();
    S.phase = 'countdown';
    Kit.track('play_start', Object.assign({}, S.cfg, {
      choice: S.choice, confessed: S.carry.confessed, ch3Failed: S.carry.ch3Failed, targetHearts: S.goal.hearts,
      photos: S.goal.blockers, extraRow: S.goal.extra, chargedHearts: S.goal.charged, booster: S.booster, attempt: S.attempt,
    }));
    if (S.booster) Kit.track('booster_applied', { booster: S.booster, spotlights: VIV_SPOTLIGHTS });
    const drop = dropIn();
    await Kit.countdown(3);
    await drop;
    S.phase = 'play';
    say(S.booster === 'viv' ? 'startViv' : 'start');
  }

  /* ---------- the turn pipeline ---------- */
  async function trySwap(a, b) {
    if (S.phase !== 'play') return;
    S.phase = 'busy'; S.sel = null; S.targets = []; S.hint = null; S.idle = 0;
    const g = S.grid, A1 = g[a[0]][a[1]], B1 = g[b[0]][b[1]];
    if (!L.isValidSwap(g, a, b)) {
      if (A1 && B1 && !A1.blocker && !B1.blocker) {
        /* slide all the way, bounce back, then a small shake */
        Kit.sfx.play('whoosh');
        const at = (e) => { A1.x = a[1] + (b[1] - a[1]) * e; A1.y = a[0] + (b[0] - a[0]) * e; B1.x = b[1] + (a[1] - b[1]) * e; B1.y = b[0] + (a[0] - b[0]) * e; };
        await tween(0.14, (k) => at(easeOut(k)));
        Kit.sfx.tone(240, 0.12, 'triangle', 0.07, 0.8);
        await tween(0.2, (k) => at(1 - easeBack(k)));
        at(0);
        A1.shakeT = SHAKE; B1.shakeT = SHAKE;
      } else refuse(A1 && A1.blocker ? a : b);
      Kit.track('invalid_swap', { turn: S.turn });
      S.phase = 'play';
      return;
    }
    Kit.sfx.play('whoosh');
    L.swap(g, a, b);
    await tween(0.15, (k) => { const e = easeOut(k); A1.x = a[1] + (b[1] - a[1]) * e; A1.y = a[0] + (b[0] - a[0]) * e; B1.x = b[1] + (a[1] - b[1]) * e; B1.y = b[0] + (a[0] - b[0]) * e; });
    S.moves--; S.turn++; movePulse = 1;
    await resolveChain([a, b]);
    await settle();
  }

  async function resolveChain(swap) {
    let ctxSwap = { swap }, chain = 0;
    const turn = { cleared: 0, hearts: 0, broken: 0, made: [] };
    while (chain < 40) {
      const ev = L.clearStep(S.grid, ctxSwap, cfgLogic());
      ctxSwap = null;
      if (!ev) break;
      chain++;
      S.chain = chain; S.bestChain = Math.max(S.bestChain, chain);
      turn.cleared += ev.cleared.length; turn.hearts += ev.hearts; turn.broken += ev.broken.length;
      applyEvents(ev, chain);
      ev.created.forEach((x) => turn.made.push(x.make));
      await popAnim(ev);
      await fallAnim(L.collapse(S.grid, cfgLogic(), Math.random));
    }
    Kit.track('match', { turn: S.turn, chain, cleared: turn.cleared, hearts: turn.hearts, photos: turn.broken, made: turn.made.join(',') });
    if (chain >= 3) Kit.track('combo', { chain, turn: S.turn });
  }
  const cfgLogic = () => ({ colors: S.cfg.colors, heartBias: S.cfg.heartBias / 100, areaRadius: S.cfg.areaRadius, chargedValue: S.cfg.chargedValue });

  function applyEvents(ev, chain) {
    const mult = 1 + (S.cfg.cascadeBonus / 100) * (chain - 1);
    const gained = Math.round((ev.cleared.length * PTS.tile + ev.created.length * PTS.special) * mult) + ev.broken.length * PTS.photo;
    S.score += gained;
    S.hearts += ev.hearts;
    S.broken += ev.broken.length;
    /* particles + heart flyers */
    ev.cleared.forEach(({ tile, r, c }) => {
      const [x, y] = cellXY(r, c);
      const col = tile.color >= 0 ? tile.color : 0;
      /* white flash first, then the pop and its particles */
      dying.push({ tile, x, y, t: 0, at: FLASH, fx: () => parts.burst(x, y, { n: 6, colors: [SPR.colors[col], SPR.light[col], '#fff4ec'], min: 50, max: 170, life: 0.5, size: 4 }) });
      if (tile.color === L.HEART) flyers.push({ x, y, t: 0, dur: 0.55 + Math.random() * 0.15, n: tile.charged ? S.cfg.chargedValue : 1 });
    });
    ev.broken.forEach(({ tile, r, c }) => {
      const [x, y] = cellXY(r, c);
      /* crack frame first, then it shatters */
      dying.push({ tile, x, y, t: 0, spin: Kit.rand(-3, 3), at: CRACK, fx: () => { parts.burst(x, y, { n: 12, colors: ['#c9c1bb', '#4a4450', '#8f8790', '#fbf6f0'], min: 80, max: 240, life: 0.6, size: 5, up: 60 }); Kit.sfx.play('shutter'); } });
      Kit.sfx.tone(1800, 0.04, 'square', 0.04);
    });
    if (ev.broken.length) {
      sayOnce('firstPhoto');
      floats.push({ x: cellXY(ev.broken[0].r, ev.broken[0].c)[0], y: cellXY(ev.broken[0].r, 0)[1], en: `-${ev.broken.length} photo${ev.broken.length > 1 ? 's' : ''}`, zh: `撕掉 ${ev.broken.length} 张`, c: '#fff4ec', t: 0 });
    }
    ev.created.forEach((x) => {
      const [px, py] = cellXY(x.r, x.c);
      parts.burst(px, py, { n: 14, colors: ['#ffd27a', '#fff4ec', '#f4a6c6'], min: 60, max: 200, life: 0.6, size: 5 });
      const enc = x.make === 'color' || x.make === 'area';
      floats.push({ x: px, y: py - 10, en: enc ? 'Encore!' : 'Spotlight!', zh: enc ? '安可！' : '聚光灯！', c: '#ffd27a', t: 0, big: true });
      Kit.sfx.play('perfect');
      Kit.track('special', { action: 'made', type: x.make, turn: S.turn });
      if (x.make === 'h' || x.make === 'v') sayOnce('spotlight');
    });
    let encore = false;
    ev.blasts.forEach((b) => {
      beams.push(Object.assign({ t: 0, life: b.type === 'color' || b.type === 'combo' ? 0.55 : 0.4 }, b));
      if (b.type === 'color' || b.type === 'area' || b.type === 'combo') encore = true;
      Kit.track('special', { action: 'fired', type: b.type, cells: b.cells.length, turn: S.turn });
    });
    if (ev.blasts.length) Kit.sfx.play(encore ? 'hit' : 'good');
    if (encore) { shake = Math.max(shake, 9); freeze = Math.max(freeze, 0.08); Kit.vibrate(30); sayOnce('encore'); }
    /* pop + cascade sounds rise with the chain */
    Kit.sfx.tone(520 + chain * 110, 0.1, 'triangle', 0.1);
    if (ev.hearts) Kit.sfx.play('collect');
    if (chain >= 2) {
      floats.push({ x: 195, y: BY + 150, en: St.comboWord(chain), zh: St.comboWord(chain), word: chain, c: chain >= 4 ? '#ff7fae' : '#ffd27a', t: 0, big: true, combo: true });
      if (chain >= 3) { freeze = Math.max(freeze, 0.06); shake = Math.max(shake, 4); }
      if (chain >= 4) sayOnce('combo');
    }
    if (!S.heartsDone && S.hearts >= S.goal.hearts) { S.heartsDone = true; Kit.track('goal_hearts', { turn: S.turn, movesLeft: S.moves }); if (L.blockersLeft(S.grid)) say('heartsDone'); Kit.sfx.play('win'); }
    if (!S.photosDone && L.blockersLeft(S.grid) === 0 && S.goal.blockers > 0) { S.photosDone = true; Kit.track('goal_photos', { turn: S.turn, movesLeft: S.moves }); if (S.hearts < S.goal.hearts) say('photosDone'); }
  }
  async function popAnim() { await tween(0.22, () => {}); }

  /* a photo can't be moved: shake it, flash ✕, soft low tone, never select it */
  function refuse(cell) {
    const t = cell && S.grid[cell[0]][cell[1]];
    if (!t) return;
    t.shakeT = SHAKE; t.refuseT = REFUSE;
    S.sel = null; S.targets = [];
    Kit.sfx.tone(170, 0.16, 'triangle', 0.08, 0.75);
    Kit.vibrate(15);
  }
  /* neighbours the selected tile can legally swap with */
  function select(cell) {
    S.sel = cell; S.cursor = cell.slice();
    S.targets = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dy, dx]) => [cell[0] + dy, cell[1] + dx]).filter((n) => L.isValidSwap(S.grid, cell, n));
  }
  async function fallAnim(res) {
    const items = res.moved.map((m) => ({ t: m.tile, from: m.tile.y, to: m.r }))
      .concat(res.spawned.map((s) => { place(s.tile, s.r - s.n - 0.4, s.c); return { t: s.tile, from: s.tile.y, to: s.r }; }));
    if (!items.length) return;
    const durOf = (it) => 0.1 + Math.sqrt(Math.max(0.2, it.to - it.from)) * 0.085;
    const max = Math.max(...items.map(durOf));
    await tween(max, (k, el) => items.forEach((it) => { const kk = Math.min(1, el / durOf(it)); it.t.y = it.from + (it.to - it.from) * fallEase(kk); }));
    items.forEach((it) => { it.t.y = it.to; });
    Kit.sfx.play('tick');
  }

  async function settle() {
    const left = L.blockersLeft(S.grid);
    if (S.hearts >= S.goal.hearts && left === 0) return finish(true);
    if (S.moves <= 0) return finish(false);
    if (S.moves === LOW_MOVES) sayOnce('low');
    if (!L.findMove(S.grid)) await reshuffle();
    S.phase = 'play';
  }
  async function reshuffle() {
    say('shuffle');
    Kit.track('reshuffle', { turn: S.turn });
    Kit.sfx.play('whoosh');
    const deal = L.reshuffle(S.grid, cfgLogic(), Math.random);
    const items = deal.map((d) => ({ t: d.tile, fx: d.tile.x, fy: d.tile.y, tx: d.c, ty: d.r }));
    await tween(0.45, (k) => items.forEach((it) => { const e = easeOut(k); it.t.x = it.fx + (it.tx - it.fx) * e; it.t.y = it.fy + (it.ty - it.fy) * e; it.t.s = 1 - Math.sin(k * Math.PI) * 0.25; }));
  }

  async function finish(win) {
    S.phase = 'result';
    if (win) {
      const bonus = S.moves * PTS.moveLeft;
      S.score += bonus;
      if (bonus) floats.push({ x: 195, y: BY + 190, en: `+${bonus} · ${S.moves} moves left`, zh: `+${bonus} · 剩 ${S.moves} 步`, c: '#ffd27a', t: 0, big: true });
      for (let i = 0; i < 4; i++) setTimeout(() => parts.burst(Kit.rand(60, 330), Kit.rand(BY + 40, BY + 360), { n: 18, colors: ['#f4a6c6', '#ffd27a', '#fff4ec'], shape: 'heart', min: 60, max: 220, life: 0.9, size: 6 }), i * 140);
      await Kit.wait(1100);
    } else {
      Kit.sfx.play('bad');
      await Kit.wait(700);
    }
    showResult(win);
  }

  function starsOf(win) {
    if (win) return 1 + (S.moves >= 3 ? 1 : 0) + (S.moves >= 7 ? 1 : 0);
    const hp = S.hearts / S.goal.hearts, bp = S.goal.blockers ? S.broken / S.goal.blockers : 1;
    return hp >= 0.5 && bp >= 0.5 ? 1 : 0;
  }
  async function showResult(win) {
    const left = L.blockersLeft(S.grid);
    const stars = starsOf(win);
    const res = St.result({ success: win, stars, hearts: S.hearts, goal: S.goal, blockersLeft: left, movesLeft: S.moves, bestChain: S.bestChain, score: S.score, choice: S.choice });
    const boosters = [];
    if (!win) boosters.push({ id: 'moves5', name: `+${BOOST_MOVES} Moves · +${BOOST_MOVES} 步`, desc: `Keep this board and play ${BOOST_MOVES} more moves · 保留当前棋盘，再走 ${BOOST_MOVES} 步`, price: '$0.99', gems: BOOSTER_GEMS });
    boosters.push({ id: 'viv', name: 'Viv\'s Statement · 薇薇安的声明', desc: `Retry with ${VIV_SPOTLIGHTS} Spotlights already on the board · 重来一局，开局就有 ${VIV_SPOTLIGHTS} 个聚光灯`, price: '$0.99', gems: BOOSTER_GEMS });
    res.boosters = boosters;
    const r = await Kit.result(res);
    if (r.action === 'retry' && r.booster === 'moves5') return continuePlus();
    if (r.action === 'retry') { S.booster = r.via === 'iap' ? r.booster : null; return playRound(); }
    Kit.story.set('ch4', { success: win, score: S.score, choice: S.choice });
    ending(win);
  }
  /* +5 Moves: same board, same progress, five more moves */
  function continuePlus() {
    S.moves += BOOST_MOVES; S.continues++; movePulse = 1;
    S.said.low = 0;
    Kit.track('booster_applied', { booster: 'moves5', moves: S.moves, hearts: S.hearts, photosLeft: L.blockersLeft(S.grid), continues: S.continues });
    floats.push({ x: 60, y: 150, en: `+${BOOST_MOVES}`, zh: `+${BOOST_MOVES}`, c: '#ffd27a', t: 0, big: true });
    Kit.sfx.play('perfect');
    say('plus5');
    S.phase = 'play';
    if (!L.findMove(S.grid)) { S.phase = 'busy'; reshuffle().then(() => { S.phase = 'play'; }); }
  }

  /* ---------- input: swipe, tap-tap, keyboard ---------- */
  const cellAt = (p) => {
    const c = Math.floor((p.x - BX) / CS), r = Math.floor((p.y - BY) / CS);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? [r, c] : null;
  };
  let drag = null;
  ui.game.addEventListener('pointerdown', (e) => {
    if (S.phase !== 'play') return;
    const p = Kit.toStage(e), cell = cellAt(p);
    if (!cell) { S.sel = null; S.targets = []; return; }
    const t = S.grid[cell[0]][cell[1]];
    if (!t) return;
    if (t.blocker) { refuse(cell); return; }
    S.idle = 0;
    if (S.sel && Math.abs(S.sel[0] - cell[0]) + Math.abs(S.sel[1] - cell[1]) === 1) { const a = S.sel; S.sel = null; trySwap(a, cell); return; }
    const again = !!(S.sel && S.sel[0] === cell[0] && S.sel[1] === cell[1]);
    drag = { cell, x: p.x, y: p.y, again };
    select(cell);
    Kit.sfx.play('blip');
  });
  addEventListener('pointermove', (e) => {
    if (!drag || S.phase !== 'play') return;
    const p = Kit.toStage(e), dx = p.x - drag.x, dy = p.y - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    const to = Math.abs(dx) > Math.abs(dy) ? [drag.cell[0], drag.cell[1] + Math.sign(dx)] : [drag.cell[0] + Math.sign(dy), drag.cell[1]];
    const from = drag.cell; drag = null;
    if (to[0] < 0 || to[0] >= ROWS || to[1] < 0 || to[1] >= COLS) return;
    trySwap(from, to);
  });
  /* a second tap on the selected tile (no swipe) puts it down again */
  addEventListener('pointerup', () => { if (drag && drag.again) { S.sel = null; S.targets = []; } drag = null; });
  addEventListener('pointercancel', () => { drag = null; });
  addEventListener('keydown', (e) => {
    if (S.phase !== 'play') return;
    const dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] }[e.key];
    if (dir) {
      e.preventDefault(); S.idle = 0;
      const to = [Kit.clamp(S.cursor[0] + dir[0], 0, ROWS - 1), Kit.clamp(S.cursor[1] + dir[1], 0, COLS - 1)];
      if (S.sel) { const a = S.sel; S.sel = null; S.targets = []; if (to[0] !== a[0] || to[1] !== a[1]) trySwap(a, to); return; }
      S.cursor = to; Kit.sfx.play('blip');
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const t = S.grid[S.cursor[0]][S.cursor[1]];
      if (t && t.blocker) { refuse(S.cursor); return; }
      if (S.sel || !t) { S.sel = null; S.targets = []; } else select(S.cursor.slice());
      Kit.sfx.play('tap');
    }
  });

  /* ---------- update ---------- */
  Kit.loop((dt) => {
    clock += dt;
    if (freeze > 0) freeze -= dt;
    else for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k, tw.t);
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    const fdt = freeze > 0 ? dt * 0.15 : dt;
    parts.update(fdt);
    for (let i = dying.length - 1; i >= 0; i--) { const d = dying[i]; d.t += fdt; if (d.fx && d.t >= d.at) { d.fx(); d.fx = null; } if (d.t > POP) dying.splice(i, 1); }
    S.grid && S.grid.forEach((row) => row.forEach((t) => { if (t && t.shakeT > 0) t.shakeT -= dt; if (t && t.refuseT > 0) t.refuseT -= dt; }));
    for (let i = beams.length - 1; i >= 0; i--) { beams[i].t += dt; if (beams[i].t > beams[i].life) beams.splice(i, 1); }
    for (let i = flyers.length - 1; i >= 0; i--) { const f = flyers[i]; f.t += fdt; if (f.t >= f.dur) { flyers.splice(i, 1); heartPulse = 1; } }
    floats = floats.filter((f) => (f.t += dt) < (f.big ? 1.1 : 0.9));
    shake = Math.max(0, shake - dt * 40); heartPulse = Math.max(0, heartPulse - dt * 3); movePulse = Math.max(0, movePulse - dt * 3);
    if (bubble && (bubble.t += dt) > bubble.life) bubble = null;
    if (S.phase === 'play') {
      S.idle += dt;
      if (S.idle > HINT_AFTER && !S.hint) { S.hint = L.findMove(S.grid); if (S.hint) Kit.track('hint_shown', { turn: S.turn }); }
    }
    motes.forEach((m) => { m.y -= m.v * dt; m.p += dt; if (m.y < -4) { m.y = 520; m.x = Kit.rand(0, 390); } });
    draw();
  });

  /* ---------- draw ---------- */
  function draw() {
    cv.clear();
    ctx.drawImage(bgImg, 0, 0, 390, 780);
    ctx.fillStyle = 'rgba(255,240,224,.5)';
    motes.forEach((m) => { ctx.globalAlpha = 0.25 + Math.sin(m.p) * 0.2; ctx.beginPath(); ctx.arc(m.x + Math.sin(m.p * 0.7) * 6, m.y, m.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    if (!S.grid) return;
    const sx = shake ? Kit.rand(-shake, shake) : 0, sy = shake ? Kit.rand(-shake, shake) : 0;
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(glass, BX - 8, BY - 8, COLS * CS + 16, ROWS * CS + 16);
    ctx.save(); ctx.beginPath(); ctx.rect(BX - 4, BY - 2, COLS * CS + 8, ROWS * CS + 6); ctx.clip();
    drawTiles();
    drawDying();
    ctx.restore();
    drawBeams();
    drawMarks();
    parts.draw(ctx);
    ctx.restore();
    drawFlyers();
    drawFloats();
    if (S.phase !== 'intro') drawHud();
    drawBubble();
  }
  /* one cell's content. Tiles: glossy candy that lifts and pulses. Photos: flat and matte, never scaled. */
  const pieceIx = (t) => (t.special === 'color' ? 6 : t.color);   // sprite index: 0..5 pieces, 6 mirror ball
  const img = (im, cx, cy, size) => ctx.drawImage(im, cx - size / 2, cy - size / 2, size, size);
  function drawTile(t, cx, cy, s, a, phase) {
    if (t.shakeT > 0) cx += Math.sin(t.shakeT * 70) * 3.2 * (t.shakeT / SHAKE);
    ctx.globalAlpha = a;
    if (t.blocker) {
      img(SPR.photo, cx, cy, SPR.T);
      if (t.refuseT > 0) { ctx.globalAlpha = a * Math.min(1, t.refuseT / REFUSE * 1.6); img(SPR.refuse, cx, cy, SPR.T * (1 + (t.refuseT / REFUSE) * 0.15)); }
      ctx.globalAlpha = 1; return;
    }
    const size = SPR.T * s;
    if (t.charged) { ctx.globalAlpha = a * (0.65 + Math.sin(clock * 4) * 0.25); img(SPR.halo, cx, cy, (SPR.T + 24) * s); ctx.globalAlpha = a; }
    if (t.special === 'area') {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(clock * 0.8); ctx.globalAlpha = a * (0.45 + Math.sin(clock * 3) * 0.15);
      img(SPR.burst, 0, 0, (SPR.T + 24) * s); ctx.restore(); ctx.globalAlpha = a;
    }
    img(t.special === 'color' ? SPR.encore : SPR.tiles[t.color], cx, cy, size);
    if (t.special === 'h' || t.special === 'v') img(SPR.spot[t.special][t.color], cx, cy, size);
    if (t.special === 'area') img(SPR.area, cx, cy, size);
    if (t.special === 'color') { ctx.save(); ctx.translate(cx, cy); ctx.rotate(clock * 1.4); img(SPR.rainbow, 0, 0, size); ctx.restore(); }
    if (t.special) {
      /* slow glint sweep, then a pause */
      const cyc = (clock * 0.75 + (phase || 0)) % 1.8;
      const fr = SPR.shimmer[pieceIx(t)];
      if (cyc < 1) img(fr[Math.min(fr.length - 1, Math.floor(cyc * fr.length))], cx, cy, size);
    }
    if (t.charged) ctx.drawImage(SPR.badge, cx + size / 2 - 16, cy - size / 2 - 3, 18, 18);
    ctx.globalAlpha = 1;
  }
  const same = (p, r, c) => p && p[0] === r && p[1] === c;
  const inHint = (r, c) => S.hint && (same(S.hint[0], r, c) || same(S.hint[1], r, c));
  function drawTiles() {
    const live = S.phase === 'play' || S.phase === 'busy';
    if (live && S.sel) S.targets.forEach(([r, c]) => { ctx.globalAlpha = 0.75 + Math.sin(clock * 6) * 0.25; img(SPR.target, BX + c * CS + CS / 2, BY + r * CS + CS / 2, SPR.T + 2); });
    ctx.globalAlpha = 1;
    const hintK = Math.abs(Math.sin(clock * 5)) * 0.08;
    let selTile = null;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = S.grid[r][c];
      if (!t || t.x == null) continue;
      if (live && same(S.sel, r, c)) { selTile = t; continue; }
      let s = t.s == null ? 1 : t.s;
      if (live && inHint(r, c)) s *= 1 + hintK;
      if (t.special) s *= 1 + Math.sin(clock * 5 + r + c) * 0.03;
      drawTile(t, BX + t.x * CS + CS / 2, BY + t.y * CS + CS / 2, s, t.a == null ? 1 : t.a, (r * 7 + c) * 0.37);
    }
    if (selTile) {
      /* lifted: bigger, nudged up, with a bright pulsing ring */
      const cx = BX + selTile.x * CS + CS / 2, cy = BY + selTile.y * CS + CS / 2 - 2;
      const pulse = Math.sin(clock * 8);
      drawTile(selTile, cx, cy, 1.12 + pulse * 0.015, 1, 0);
      ctx.globalAlpha = 0.75 + pulse * 0.25; img(SPR.select, cx, cy, (SPR.T + 10) * (1.06 + pulse * 0.025)); ctx.globalAlpha = 1;
    }
  }
  function drawDying() {
    dying.forEach((d) => {
      if (d.tile.blocker) {
        if (d.t < CRACK) { img(SPR.crack, d.x, d.y, SPR.T); return; }
        const k = (d.t - CRACK) / (POP - CRACK);
        ctx.save(); ctx.translate(d.x, d.y + k * k * 36); ctx.rotate((d.spin || 0) * k * 0.6); ctx.globalAlpha = Math.max(0, 1 - k * 1.4);
        img(SPR.crack, 0, 0, SPR.T * (1 - k * 0.3)); ctx.restore(); ctx.globalAlpha = 1;
        return;
      }
      if (d.t < FLASH) { drawTile(d.tile, d.x, d.y, 1.06, 1, 0); ctx.globalAlpha = 0.9; img(SPR.flash[pieceIx(d.tile)], d.x, d.y, SPR.T * 1.06); ctx.globalAlpha = 1; return; }
      const k = (d.t - FLASH) / (POP - FLASH);
      const s = k < 0.25 ? 1.06 + k * 0.8 : Math.max(0, 1.26 * (1 - (k - 0.25) / 0.75));
      drawTile(d.tile, d.x, d.y, s, Math.max(0, 1 - Math.max(0, k - 0.45) * 1.8), 0);
    });
  }
  function drawBeams() {
    beams.forEach((b) => {
      const k = b.t / b.life, a = 1 - k;
      const [x, y] = cellXY(b.r, b.c);
      ctx.globalAlpha = a;
      if (b.type === 'h') ctx.drawImage(SPR.beam, BX - 8, y - 18 * (1 - k * 0.5), COLS * CS + 16, 36 * (1 - k * 0.5));
      else if (b.type === 'v') { ctx.save(); ctx.translate(x, BY + ROWS * CS / 2); ctx.rotate(Math.PI / 2); ctx.drawImage(SPR.beam, -ROWS * CS / 2 - 8, -18 * (1 - k * 0.5), ROWS * CS + 16, 36 * (1 - k * 0.5)); ctx.restore(); }
      else if (b.type === 'area' || b.type === 'combo') { const s = CS * (1 + k * 4); ctx.drawImage(SPR.glowGold, x - s, y - s, s * 2, s * 2); }
      else if (b.type === 'color') {
        const s = CS * (1.5 + k * 2); ctx.drawImage(SPR.glowPink, x - s, y - s, s * 2, s * 2);
        ctx.strokeStyle = '#fff4ec'; ctx.lineWidth = 2;
        ctx.beginPath(); b.cells.forEach(([r, c]) => { const [tx, ty] = cellXY(r, c); ctx.moveTo(x, y); ctx.lineTo(x + (tx - x) * Math.min(1, k * 3), y + (ty - y) * Math.min(1, k * 3)); }); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  }
  function drawMarks() {
    if (S.phase !== 'play' && S.phase !== 'busy') return;
    if (S.phase === 'play' && S.hint) {
      /* hint: an arrow between the two tiles, nudging in the swap direction */
      const [a, b] = S.hint, ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const mx = BX + (a[1] + b[1]) / 2 * CS + CS / 2, my = BY + (a[0] + b[0]) / 2 * CS + CS / 2;
      const bob = Math.sin(clock * 6) * 4;
      ctx.save(); ctx.translate(mx + Math.cos(ang) * bob, my + Math.sin(ang) * bob); ctx.rotate(ang);
      ctx.globalAlpha = 0.95; ctx.drawImage(SPR.arrow, -15, -11, 30, 22); ctx.restore(); ctx.globalAlpha = 1;
    }
    if (!S.sel && kbUsed) { ctx.globalAlpha = 0.5; img(SPR.select, BX + S.cursor[1] * CS + CS / 2, BY + S.cursor[0] * CS + CS / 2, SPR.T + 10); ctx.globalAlpha = 1; }
  }
  let kbUsed = false;
  addEventListener('keydown', () => { kbUsed = true; });
  ui.game.addEventListener('pointerdown', () => { kbUsed = false; });

  /* hearts fly from the board to the HUD counter */
  const HEART_HUD = [140, 103];
  function drawFlyers() {
    flyers.forEach((f) => {
      const k = easeOut(f.t / f.dur), x = f.x + (HEART_HUD[0] - f.x) * k, y = f.y + (HEART_HUD[1] - f.y) * k - Math.sin(k * Math.PI) * 60;
      const s = 22 - k * 6;
      ctx.drawImage(SPR.tiles[0], x - s / 2, y - s / 2, s, s);
    });
  }
  function drawFloats() {
    floats.forEach((f) => {
      const life = f.big ? 1.1 : 0.9, k = f.t / life;
      const txt = f.word ? St.comboWord(f.word) : tr(f.en, f.zh);
      const sz = f.big ? (f.combo ? 30 : 22) : 16;
      const sc = k < 0.15 ? easeBack(k / 0.15) : 1;
      ctx.save(); ctx.translate(f.x, f.y - k * 40); ctx.scale(sc, sc);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.font = Kit.font(800, sz, f.combo ? 'serif' : undefined); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,10,26,.8)'; ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = f.c; ctx.fillText(txt, 0, 0);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  function bar(x, y, w, h, p, color) {
    Kit.draw.roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
    if (p > 0) { Kit.draw.roundRect(ctx, x, y, Math.max(h, w * Math.min(1, p)), h, h / 2); ctx.fillStyle = color; ctx.fill(); }
  }
  function drawHud() {
    const left = L.blockersLeft(S.grid), g = S.goal;
    /* moves */
    const low = S.moves <= LOW_MOVES && S.phase !== 'result';
    Kit.draw.glass(ctx, 12, 80, 92, 72, 18);
    if (low) { ctx.globalAlpha = 0.35 + Math.sin(clock * 7) * 0.25; Kit.draw.roundRect(ctx, 12, 80, 92, 72, 18); ctx.strokeStyle = '#ff5c8a'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#d9b892'; ctx.font = Kit.font(800, 10); ctx.fillText(tr('MOVES', '剩余步数'), 58, 98);
    ctx.save(); ctx.translate(58, 136); const ms = 1 + movePulse * 0.25; ctx.scale(ms, ms);
    ctx.fillStyle = low ? '#ff9ab8' : '#fff4ec'; ctx.font = Kit.font(800, 34, 'serif'); ctx.fillText(String(S.moves), 0, 0); ctx.restore();
    /* goals */
    Kit.draw.glass(ctx, 112, 80, 266, 72, 18);
    const hs = 24 * (1 + heartPulse * 0.3);
    ctx.drawImage(SPR.tiles[0], 140 - hs / 2, 103 - hs / 2, hs, hs);
    ctx.drawImage(SPR.photo, 128, 118, 24, 24);
    ctx.textAlign = 'left'; ctx.font = Kit.font(700, 12); ctx.fillStyle = '#fff4ec';
    ctx.fillText(tr('Hearts', '心'), 158, 100);
    ctx.fillText(tr('Photos', '狗仔照片'), 158, 134);
    ctx.textAlign = 'right'; ctx.font = Kit.font(800, 13);
    ctx.fillStyle = S.hearts >= g.hearts ? '#ffd27a' : '#fff4ec';
    ctx.fillText(S.hearts >= g.hearts ? `✓ ${g.hearts}/${g.hearts}` : `${S.hearts}/${g.hearts}`, 366, 100);
    ctx.fillStyle = left === 0 ? '#ffd27a' : '#fff4ec';
    ctx.fillText(left === 0 ? tr('✓ all clear', '✓ 全部撕掉') : tr(`${left} left`, `还剩 ${left} 张`), 366, 134);
    bar(158, 105, 208, 6, S.hearts / g.hearts, '#f58fb8');
    bar(158, 139, 208, 6, g.blockers ? (g.blockers - left) / g.blockers : 1, '#e3bf8b');
    /* tabloid ticker + distance to the goal */
    const p = 0.5 * Math.min(1, S.hearts / g.hearts) + 0.5 * (g.blockers ? (g.blockers - left) / g.blockers : 1);
    Kit.draw.glass(ctx, 12, 158, 366, 46, 14);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f4a6c6'; ctx.font = Kit.font(800, 9);
    ctx.fillText(tr('TABLOID FEED', '小报动态'), 24, 174);
    ctx.fillStyle = '#fff4ec'; ctx.font = `italic 600 15px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(St.ticker(p), 24, 194);
    const needH = Math.max(0, g.hearts - S.hearts);
    const need = needH === 0 && left === 0 ? tr('Story secured', '故事到手')
      : needH && left ? tr(`${needH} hearts + ${left} photos to go`, `还差 ${needH} 颗心 · ${left} 张照片`)
        : needH ? tr(`${needH} hearts to go`, `还差 ${needH} 颗心`) : tr(`${left} photos to go`, `还差 ${left} 张照片`);
    ctx.textAlign = 'right'; ctx.fillStyle = '#d9b892'; ctx.font = Kit.font(700, 10);
    ctx.fillText(need, 366, 174);
  }
  function wrap(text, maxW) {
    const zh = Kit.lang() === 'zh', out = [];
    const units = zh ? [...text] : text.split(' ');
    let line = '';
    units.forEach((u) => {
      const next = line ? line + (zh ? '' : ' ') + u : u;
      if (ctx.measureText(next).width > maxW && line) { out.push(line); line = u; } else line = next;
    });
    if (line) out.push(line);
    return out;
  }
  function drawBubble() {
    if (!bubble || S.phase === 'result') return;
    const k = bubble.t, a = k < 0.2 ? k / 0.2 : k > bubble.life - 0.3 ? (bubble.life - k) / 0.3 : 1;
    ctx.globalAlpha = Math.max(0, a);
    const y = 628 + (1 - Math.min(1, k / 0.2)) * 10;
    ctx.font = Kit.font(600, 13.5);
    const lines = wrap(tr(bubble.en, bubble.zh), 300);
    const h = 30 + lines.length * 18;
    Kit.draw.glass(ctx, 24, y, 342, h, 16);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f4a6c6'; ctx.font = Kit.font(800, 11);
    ctx.fillText(Kit.loc(bubble.name).toUpperCase(), 40, y + 19);
    ctx.fillStyle = '#fff4ec'; ctx.font = Kit.font(600, 13.5);
    lines.forEach((ln, i) => ctx.fillText(ln, 40, y + 38 + i * 18));
    ctx.globalAlpha = 1;
  }

  /* ---------- story ---------- */
  let bgURL = '';
  try { bgURL = bgImg.toDataURL('image/jpeg', 0.82); } catch (e) { bgURL = ''; }
  const scene = () => (bgURL ? `linear-gradient(180deg, rgba(26,12,28,.25), rgba(16,8,18,.7)), url(${bgURL}) center/cover` : Kit.scenes.night);

  async function intro() {
    S.carry = St.carry();
    S.cfg = Object.assign({}, Kit.tuning.values);
    const res = await Kit.dialogue(St.introLines(S.carry), { bg: scene(), caption: 'EPISODE 4 · THE MORNING AFTER · 第四集 · 头条之后' });
    S.choice = res.choices[0] || 'public';
    const goal = goalFor(S.cfg, S.choice, S.carry, null);
    await Kit.tutorial(St.tutorial(goal, St.modifier(S.carry, S.choice, S.cfg, goal)));
    playRound();
  }
  async function ending(win) {
    S.phase = 'ending';
    await Kit.dialogue(St.endingLines(win, S.choice), { bg: scene(), caption: win ? 'YES, SHE\'S WITH ME · 对，她是我的人' : 'NO COMMENT · 无可奉告' });
    showEndCard(win);
  }
  let endCard = null;
  function renderEndCard(win) {
    const e = St.endCard(win);
    endCard.innerHTML = `<div class="kit-card c4-end">
      <span class="kit-res-badge ${win ? 'win' : 'lose'}">${Kit.esc(e.badge)}</span>
      <h2 class="${Kit.lang() === 'zh' ? 'cjk' : ''}">${Kit.esc(e.title)}</h2>
      <p>${Kit.esc(e.text)}</p>
      <button class="kit-btn primary">${Kit.esc(e.button)}</button></div>`;
    endCard.querySelector('button').onclick = () => { Kit.sfx.play('tap'); Kit.track('chapter_exit', { success: win }); location.href = '../index.html'; };
  }
  function showEndCard(win) {
    if (endCard) endCard.remove();
    endCard = Kit.el('<div class="kit-scrim"></div>');
    endCard.win = win;
    renderEndCard(win);
    ui.overlay.appendChild(endCard);
  }
  Kit.onLang(() => { if (endCard && endCard.isConnected) renderEndCard(endCard.win); });

  intro();
})();
