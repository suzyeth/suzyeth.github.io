/* ch1 "Sneak Out" (Off Camera, rock-star version) — 3-lane vertical runner.
 * Jace Monroe slips out of the album-launch after-party to meet you on the hotel rooftop.
 * Flow: opening dialogue (route choice) → tutorial → countdown → run → result (retry economy) → ending → ch2. */
(function () {
  'use strict';
  const A = window.Ch1Art;
  const W = A.W, H = A.H, LANES = A.LANES, PY = A.PY;
  /* one language at a time; falls back to English if the kit predates the i18n API */
  const tr = (en, zh) => (Kit.tr ? Kit.tr(en, zh) : en);
  const ui = Kit.mount({ id: 'ch1-dodge', title: 'Sneak Out · 溜出去', episode: 'Episode 1 · Sneak Out' });
  const cv = Kit.canvas();
  const ctx = cv.ctx;
  const fx = Kit.particles();
  const bg = A.makeBg();

  /* ---------- tuning ---------- */
  const pct = (v) => Math.round(v * 100) + '%';
  const SCHEMA = [
    { key: 'duration', label: 'Duration · 时长', min: 30, max: 90, step: 5, value: 60, fmt: (v) => v + 's', hint: 'Run length. Longer runs test stamina; move the target with it. · 一局多长。越长越考耐力，目标分要一起调。' },
    { key: 'target', label: 'Target · 目标分', min: 600, max: 3000, step: 100, value: 1500, hint: 'The win line. A typical first run should just reach it or fall a little short. · 成功线。希望普通玩家首局刚好够到或差一点。' },
    { key: 'baseSpeed', label: 'Base speed · 基础速度', min: 160, max: 420, step: 10, value: 260, fmt: (v) => v + ' px/s', hint: 'Scroll speed; sets the reaction window. · 画面滚动速度，直接决定反应窗口。' },
    { key: 'speedRamp', label: 'Speed ramp · 加速倍率', min: 1, max: 2.4, step: 0.1, value: 1.6, fmt: (v) => '×' + v, hint: 'Speed multiplier at the end of mid-game; the last 10 s add 12%. · 中段结束时的速度倍数；最后 10 秒再 +12%。' },
    { key: 'spawnGap', label: 'Spawn gap · 刷人间隔', min: 0.45, max: 1.5, step: 0.05, value: 0.9, fmt: (v) => v + 's', hint: 'Time between rows of fans. Lower means more crowded. · 每排粉丝之间隔多久。越小街上越挤。' },
    { key: 'flashRate', label: 'Flash rate · 闪光概率', min: 0, max: 0.5, step: 0.02, value: 0.2, fmt: pct, hint: 'Chance a spawn is a camera flash (none in the first 10 s). · 每次刷新变成狗仔闪光的概率（前 10 秒不出）。' },
    { key: 'flashWarn', label: 'Flash warning · 闪光预警', min: 0.4, max: 1.4, step: 0.1, value: 0.8, fmt: (v) => v + 's', hint: 'Warning time before the shutter. Shorter is harder. · 预警到快门的时间。越短越吃反应。' },
    { key: 'disguiseRate', label: 'Disguise drop · 伪装掉率', min: 0.05, max: 0.5, step: 0.01, value: 0.18, fmt: pct, hint: 'Chance a row carries a cap, sunglasses or hoodie; sets how often a full set happens. · 每排出现帽子/墨镜/连帽衫的概率，决定多久能集齐一套。' },
    { key: 'perfectTime', label: 'Perfect time · 完美伪装时长', min: 2, max: 10, step: 0.5, value: 5, fmt: (v) => v + 's', hint: 'Seconds fans ignore you after a full set (cameras still count). · 集齐 3 件后粉丝认不出你的秒数（狗仔照拍）。' },
    { key: 'hitPenalty', label: 'Hit penalty · 受击扣分', min: 0, max: 300, step: 10, value: 120, hint: 'Points lost when recognized or photographed. · 被认出 / 被拍到扣多少分，决定失误的代价。' },
  ];
  /* preset names are display text, so they are built in the current language */
  const PRESET_VALUES = [
    [['Story start (new player)', '剧情开头（新手）'], { duration: 60, target: 1200, baseSpeed: 220, speedRamp: 1.3, spawnGap: 1.1, flashRate: 0.12, flashWarn: 1, disguiseRate: 0.25, perfectTime: 6, hitPenalty: 80 }],
    [['Standard', '标准'], { duration: 60, target: 1500, baseSpeed: 260, speedRamp: 1.6, spawnGap: 0.9, flashRate: 0.2, flashWarn: 0.8, disguiseRate: 0.18, perfectTime: 5, hitPenalty: 120 }],
    [['Late story', '剧情中后期'], { duration: 60, target: 1900, baseSpeed: 300, speedRamp: 1.9, spawnGap: 0.75, flashRate: 0.3, flashWarn: 0.6, disguiseRate: 0.14, perfectTime: 4, hitPenalty: 160 }],
  ];
  function defineTuning() {
    const presets = {};
    PRESET_VALUES.forEach(([n, v]) => { presets[tr(n[0], n[1])] = v; });
    Kit.tuning.define(SCHEMA, { presets, note: tr('Changes apply from the next run (retry or reload). The route choice multiplies on top of these.', '改完下一局生效（重试或刷新）。路线选择会在这些数值上再乘一层系数。') });
  }
  defineTuning();

  /* route choice from the opening dialogue: multipliers on top of tuning */
  const ROUTES = {
    mall: { name: 'Hotel lobby', zh: '酒店大堂', gapMul: 0.8, itemMul: 1.2, coinMul: 1, flashMul: 0.7, meters: 520,
      echo: 'You sent him through the lobby: packed, but easy to grab a disguise. ', echoZh: '你让他走了酒店大堂：人多，但伪装好凑。' },
    alley: { name: 'Service exit', zh: '员工通道', gapMul: 1.1, itemMul: 0.9, coinMul: 1.1, flashMul: 1.6, meters: 780,
      echo: 'You sent him out the service exit: quiet, but long lenses wait in the dark. ', echoZh: '你让他走了员工通道：人少，可暗处蹲着长焦。' },
  };
  const DISGUISE = { cap: ['Cap', '帽子'], glasses: ['Sunglasses', '墨镜'], hoodie: ['Hoodie', '连帽衫'] };
  const SCORE = { tick: 5, coin: 10, heart: 25, disguise: 60, perfect: 150, near: 30, flashDodge: 40, fooled: 15 };
  const INTRO_SEC = 10, SPRINT_SEC = 10, NEAR_WINDOW = 0.45;

  let mode = 'intro'; // intro | count | play | finish | over
  let route = 'mall';
  let pendingBooster = null;
  let attempt = 0;
  let S = null;
  let time = 0;

  /* ---------- run state ---------- */
  function newRun(booster) {
    const cfg = Object.assign({}, Kit.tuning.values);
    const s = {
      cfg, r: ROUTES[route], booster, t: 0, dur: cfg.duration, score: 0, shown: 0,
      combo: 0, maxCombo: 0, comboPop: 0,
      lane: 1, px: LANES[1], fromLane: 1, switchT: -9, lean: 0, squash: 0, step: 0,
      inv: 0, stagger: 0, hitstop: 0, shake: 0, red: 0, white: 0,
      objs: [], flashes: [], spawnT: 1.2,
      have: { cap: false, glasses: false, hoodie: false }, perfect: 0, perfectMax: cfg.perfectTime, perfectCount: 0,
      hits: 0, photos: 0, nears: 0, disguises: 0,
      clearUntil: booster === 'tang_clear' ? 10 : 0,
      lastSec: Math.ceil(cfg.duration), introDone: false, sprint: false, sprintK: 0, banner: null, endT: 0, speed: 0,
    };
    if (booster === 'full_disguise') { s.perfect = cfg.perfectTime + 3; s.perfectMax = s.perfect; }
    s.prompt = { text: 'Swipe to slip past the crowd', zh: '左右滑动，躲开人群', ring: true, t: 0, dur: 5.2 };
    return s;
  }

  function phase() {
    const c = S.cfg, t = S.t;
    const intro = Math.min(INTRO_SEC, S.dur * 0.2);
    const sprintAt = S.dur - SPRINT_SEC;
    const k = t < intro ? 0 : Kit.clamp((t - intro) / Math.max(1, sprintAt - intro), 0, 1);
    const e = k * k * (3 - 2 * k);
    let speed = c.baseSpeed * (t < intro ? 0.85 : Kit.lerp(1, c.speedRamp, e));
    let gap = c.spawnGap * (t < intro ? 1.45 : Kit.lerp(1.1, 0.85, e)) * S.r.gapMul;
    let flash = t < intro ? 0 : c.flashRate * S.r.flashMul;
    const sprint = t >= sprintAt && t > intro;
    if (sprint) { speed *= 1.12; gap *= 0.85; flash *= 1.3; }
    return { speed, gap, flash, intro: t < intro, sprint, k };
  }

  /* ---------- spawning ---------- */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function makeFan(lane, y) {
    const r = Math.random();
    return { type: 'fan', lane, x: LANES[lane], y, py: y, v: Math.floor(r * A.FAN_LOOKS_N), wob: Math.random(), alert: 0, fooled: 0, hit: false };
  }
  function makeItem(item, lane, y) { return { type: 'item', item, lane, x: LANES[lane], y, seed: Math.random() * 6, taken: false }; }
  function pickDisguise() {
    const missing = Object.keys(DISGUISE).filter((k) => !S.have[k]);
    return missing.length && Math.random() < 0.75 ? pick(missing) : pick(Object.keys(DISGUISE));
  }
  function spawnPickups(lane, y) {
    const roll = Math.random();
    const dRate = S.cfg.disguiseRate * S.r.itemMul;
    if (roll < dRate) S.objs.push(makeItem(pickDisguise(), lane, y));
    else if (roll < dRate + 0.42 * S.r.coinMul) [0, 1, 2].forEach((i) => S.objs.push(makeItem('coin', lane, y - i * 46)));
    else if (roll < dRate + 0.42 * S.r.coinMul + 0.08) S.objs.push(makeItem('heart', lane, y));
  }
  function doubleRowNear() { return S.objs.some((o) => o.type === 'fan' && o.dbl && o.y > 200 && o.y < PY + 40); }
  function spawnTick(ph) {
    const y = -50;
    if (S.t < S.clearUntil) { spawnPickups(Math.floor(Math.random() * 3), y); return; }
    if (S.flashes.length === 0 && Math.random() < ph.flash && !doubleRowNear()) {
      const lane = Math.random() < 0.7 ? S.lane : pick([0, 1, 2].filter((l) => l !== S.lane));
      S.flashes.push({ lane, t: 0, warn: S.cfg.flashWarn, fired: false, after: 0 });
      if (!S.flashHinted) { S.flashHinted = true; prompt('Get out of the glowing lane', '车道发光 = 狗仔要拍了，快躲开', { y: 400, dur: Math.max(1.6, S.cfg.flashWarn + 0.8) }); }
      Kit.sfx.tone(1560, 0.08, 'square', 0.04); Kit.sfx.tone(1560, 0.08, 'square', 0.04, 0, 0.14);
      spawnPickups(pick([0, 1, 2].filter((l) => l !== lane)), y);
      return;
    }
    const dbl = !ph.intro && S.flashes.length === 0 && Math.random() < 0.25 + 0.35 * ph.k;
    const free = Math.floor(Math.random() * 3);
    const lanes = dbl ? [0, 1, 2].filter((l) => l !== free) : [Math.floor(Math.random() * 3)];
    lanes.forEach((l) => { const f = makeFan(l, y - Math.random() * 16); f.dbl = dbl; S.objs.push(f); });
    spawnPickups(pick([0, 1, 2].filter((l) => !lanes.includes(l))), y);
  }

  /* ---------- scoring / feedback ---------- */
  const mult = () => 1 + Math.min(5, Math.floor(S.combo / 5)) * 0.1;
  function bumpCombo() { S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.comboPop = 1; }
  function addScore(base, x, y, label, color) {
    const pts = Math.round(base * mult());
    S.score += pts;
    fx.text(x, y, (label ? label + ' ' : '') + '+' + pts, color || '#d9b892', label ? 18 : 16);
    return pts;
  }
  /* canvas strings stay bilingual and are resolved per frame, so a mid-run language switch just works */
  function banner(t, sub, color, dur) { S.banner = { text: t[0], zh: t[1], sub: sub[0], subZh: sub[1], color, t: 0, dur: dur || 1.6 }; }
  function prompt(text, zh, o) { S.prompt = Object.assign({ text, zh, t: 0, dur: 2.2 }, o || {}); }

  function hit(kind, f) {
    const pen = S.cfg.hitPenalty;
    S.score = Math.max(0, S.score - pen);
    S.combo = 0; S.inv = 1.2; S.stagger = 0.45; S.hitstop = 0.07; S.shake = 14; S.red = 1;
    if (kind === 'fan') S.hits++; else S.photos++;
    if (f) {
      f.hit = true; f.alert = 1;
      S.objs.forEach((o) => { if (o.type === 'fan' && o !== f && Math.abs(o.y - f.y) < 140) o.alert = 0.9; });
    }
    Kit.sfx.play('hit');
    if (kind === 'flash') { Kit.sfx.play('shutter'); S.white = 0.8; }
    Kit.vibrate(60);
    fx.text(S.px, PY - 70, kind === 'fan' ? tr('Recognized!', '被认出了！') : tr('Snapped!', '被拍到了！'), '#f4a6c6', 22);
    if (pen > 0) fx.text(S.px + 34, PY - 42, '-' + pen, '#e889b0', 18);
    fx.burst(S.px, PY, { n: 14, colors: ['#e889b0', '#f6efe9', '#d9b892'], max: 200, life: 0.5 });
    Kit.track('hit', { type: kind, t: +S.t.toFixed(1), score: Math.floor(S.score) });
  }
  function nearMiss(x, label, base) {
    S.nears++;
    bumpCombo();
    addScore(base, x, PY - 50, label, '#9fb4d8');
    Kit.sfx.tone(880 + Math.min(S.combo, 12) * 40, 0.07, 'triangle', 0.08);
    fx.burst(x, PY - 10, { n: 6, colors: ['#9fb4d8', '#f6efe9'], min: 40, max: 120, g: 0, life: 0.4, size: 4 });
  }
  function collect(it) {
    it.taken = true;
    if (it.item === 'coin') {
      bumpCombo(); addScore(SCORE.coin, it.x, it.y - 16);
      Kit.sfx.tone(1180 + Math.min(S.combo, 15) * 30, 0.06, 'triangle', 0.06);
      fx.burst(it.x, it.y, { n: 5, colors: ['#d9b892'], min: 40, max: 110, life: 0.35, size: 4 });
      return;
    }
    if (it.item === 'heart') {
      bumpCombo(); addScore(SCORE.heart, it.x, it.y - 18, tr('Heart', '爱心'), '#f4a6c6');
      Kit.sfx.play('collect');
      fx.burst(it.x, it.y, { n: 8, colors: ['#e889b0', '#f4a6c6'], shape: 'heart', max: 140, size: 5, up: 60 });
      return;
    }
    const dup = S.have[it.item];
    bumpCombo();
    addScore(dup ? SCORE.disguise / 2 : SCORE.disguise, it.x, it.y - 22, tr(DISGUISE[it.item][0], DISGUISE[it.item][1]), '#d9b892');
    S.have[it.item] = true; S.disguises++;
    Kit.sfx.play('good');
    fx.burst(it.x, it.y, { n: 16, colors: ['#d9b892', '#f6efe9', '#e889b0'], max: 220, life: 0.6 });
    Kit.track('collect', { item: it.item, t: +S.t.toFixed(1) });
    if (S.have.cap && S.have.glasses && S.have.hoodie) startPerfect();
  }
  function startPerfect() {
    S.have = { cap: false, glasses: false, hoodie: false };
    S.perfect = Math.max(S.perfect, S.cfg.perfectTime); S.perfectMax = Math.max(S.perfectMax, S.perfect); S.perfectCount++; // never shortens an active disguise
    addScore(SCORE.perfect, S.px, PY - 90, tr('Full set', '集齐'), '#d9b892');
    Kit.sfx.play('perfect'); Kit.vibrate(30);
    S.shake = 5;
    fx.burst(S.px, PY, { n: 30, colors: ['#d9b892', '#e889b0', '#f6efe9'], max: 320, life: 0.9 });
    banner(['Perfect Disguise', '完美伪装'], ['For a few seconds, no one knows him', '这几秒，没人认得出他'], '#d9b892', 1.6);
    Kit.track('perfect_disguise', { t: +S.t.toFixed(1), count: S.perfectCount });
  }

  /* ---------- input ----------
   * Taps fire on pointerdown (left/right half). Swipes fire during pointermove after 13 px;
   * keep dragging (40 px more, or reverse 13 px) for another lane without lifting.
   * A swipe opposite to the tap within 180 ms replaces the tap instead of stacking on it.
   * Lane targets update instantly, so a quick double swipe moves two lanes; input during the
   * countdown is buffered and applied on GO. */
  const SWIPE_PX = 13, REPEAT_PX = 40, UNDO_MS = 180;
  let pendingDir = 0;
  function move(dir) {
    if (!S) return;
    if (mode === 'count') { pendingDir = dir; return; }
    if (mode !== 'play') return;
    const nl = Kit.clamp(S.lane + dir, 0, 2);
    if (nl === S.lane) { S.squash = -0.06; S.lean = dir * 0.15; return; }
    S.fromLane = S.lane; S.lane = nl; S.switchT = S.t; S.squash = 0.12;
    if (S.prompt && S.prompt.ring && S.prompt.t < S.prompt.dur - 0.4) S.prompt.t = S.prompt.dur - 0.4;
    Kit.sfx.tone(420 + nl * 110, 0.05, 'triangle', 0.05, 1.6);
    fx.burst(S.px, PY + 22, { n: 5, colors: ['rgba(246,239,233,.5)'], min: 30, max: 90, g: 0, life: 0.3, size: 4 });
  }
  let ptr = null;
  ui.game.style.touchAction = 'none';
  cv.cv.style.touchAction = 'none';
  ui.game.addEventListener('pointerdown', (e) => {
    if ((mode !== 'play' && mode !== 'count') || ptr) return;
    try { ui.game.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    const p = Kit.toStage(e), dir = p.x < W / 2 ? -1 : 1;
    ptr = { id: e.pointerId, x: p.x, y: p.y, t: performance.now(), tapDir: dir, segs: 0, lastDir: 0,
      snap: S ? { lane: S.lane, from: S.fromLane, sw: S.switchT } : null };
    move(dir);
  }, { passive: true });
  ui.game.addEventListener('pointermove', (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = Kit.toStage(e), dx = p.x - ptr.x;
    const dir = dx > 0 ? 1 : -1;
    const need = ptr.segs === 0 || dir !== ptr.lastDir ? SWIPE_PX : REPEAT_PX;
    if (Math.abs(dx) < need || Math.abs(dx) < Math.abs(p.y - ptr.y) * 0.8) return;
    if (ptr.segs === 0 && dir !== ptr.tapDir) {
      if (performance.now() - ptr.t < UNDO_MS && ptr.snap && S && mode === 'play') {
        S.lane = ptr.snap.lane; S.fromLane = ptr.snap.from; S.switchT = ptr.snap.sw;
      }
      move(dir);
    } else if (ptr.segs > 0) move(dir);
    ptr.segs++; ptr.lastDir = dir; ptr.x = p.x; ptr.y = p.y;
  }, { passive: true });
  const release = (e) => { if (ptr && e.pointerId === ptr.id) ptr = null; };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => ui.game.addEventListener(n, release, { passive: true }));
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { move(-1); e.preventDefault(); }
    if (k === 'arrowright' || k === 'd') { move(1); e.preventDefault(); }
  });

  /* ---------- update ---------- */
  function updatePlayer(dt, speed) {
    const tx = LANES[S.lane];
    S.px += (tx - S.px) * (1 - Math.exp(-dt * 30)); // ~95% of the way in 100 ms
    if (Math.abs(tx - S.px) < 0.3) S.px = tx;
    const wantLean = Kit.clamp((tx - S.px) * 0.008, -0.35, 0.35) + (S.stagger > 0 ? Math.sin(S.t * 40) * 0.2 * S.stagger : 0);
    S.lean += (wantLean - S.lean) * (1 - Math.exp(-dt * 20));
    S.squash *= Math.exp(-dt * 10);
    S.step += dt * (speed * 0.04 + 6);
  }
  function updateObjects(dt, speed, collide) {
    S.objs.forEach((o) => { o.py = o.y; o.y += (speed + (o.type === 'fan' ? 25 : 0)) * dt; });
    S.objs.forEach((o) => {
      if (o.type === 'fan') {
        if (o.alert > 0) o.alert = Math.max(0, o.alert - dt * 0.6);
        if (o.fooled > 0) o.fooled = Math.max(0, o.fooled - dt * 0.8);
        const close = Math.abs(o.x - S.px) < 36 && Math.abs(o.y - PY) < 34;
        if (collide && close && !o.hit && !o.fooled) {
          if (S.perfect > 0) {
            o.fooled = 1; bumpCombo(); addScore(SCORE.fooled, o.x, o.y - 40, tr('Unnoticed', '没认出'), '#f6efe9');
            Kit.sfx.tone(660, 0.08, 'sine', 0.06);
          } else if (S.inv <= 0) hit('fan', o);
        }
        const py0 = o.py;
        if (collide && py0 < PY && o.y >= PY && !o.hit && !o.fooled && o.lane === S.fromLane && S.lane !== o.lane && S.t - S.switchT < NEAR_WINDOW) {
          nearMiss(o.x, tr('Close call', '擦肩'), SCORE.near);
        }
      } else if (collide && !o.taken && Math.abs(o.x - S.px) < 32 && Math.abs(o.y - PY) < 36) collect(o);
    });
    S.objs = S.objs.filter((o) => o.y < H + 70 && !(o.type === 'item' && o.taken));
  }
  function updateFlashes(dt) {
    S.flashes.forEach((fl) => {
      fl.t += dt;
      if (!fl.fired && fl.t >= fl.warn) {
        fl.fired = true;
        const inLane = Math.abs(S.px - LANES[fl.lane]) < 42;
        if (inLane && S.inv <= 0) hit('flash', null);
        else {
          Kit.sfx.play('shutter'); S.white = Math.max(S.white, 0.35);
          if (!inLane && S.fromLane === fl.lane && S.t - S.switchT < fl.warn + 0.1) nearMiss(LANES[fl.lane], tr('Dodged the lens', '躲过镜头'), SCORE.flashDodge);
        }
      } else if (fl.fired) fl.after += dt;
    });
    S.flashes = S.flashes.filter((fl) => !fl.fired || fl.after < 0.35);
  }
  function updateClock() {
    const left = S.dur - S.t;
    const sec = Math.ceil(left);
    if (sec !== S.lastSec) { S.lastSec = sec; if (sec <= SPRINT_SEC && sec > 0) Kit.sfx.play('tick'); }
    const intro = Math.min(INTRO_SEC, S.dur * 0.2);
    if (!S.introDone && S.t >= intro) { S.introDone = true; banner(['Rush hour', '下班高峰'], ['More people now. Watch your sides.', '人变多了，小心左右'], '#f4a6c6', 1.5); }
    if (!S.sprint && left <= SPRINT_SEC) {
      S.sprint = true; banner(['Final sprint', '最后冲刺'], ['The rooftop is right ahead', '天台就在前面'], '#f4a6c6', 1.6);
      Kit.sfx.play('whoosh'); Kit.track('final_sprint', { score: Math.floor(S.score) });
    }
  }
  function updatePlay(dt) {
    if (S.hitstop > 0) { S.hitstop -= dt; return; }
    const ph = phase();
    S.speed = ph.speed * (1 - 0.55 * Math.max(0, S.stagger) / 0.45);
    S.t += dt;
    S.score += SCORE.tick * dt;
    S.spawnT -= dt;
    if (S.spawnT <= 0) { spawnTick(ph); S.spawnT = ph.gap * Kit.rand(0.85, 1.15); }
    S.inv = Math.max(0, S.inv - dt); S.stagger = Math.max(0, S.stagger - dt);
    if (S.perfect > 0) { S.perfect -= dt; if (S.perfect <= 0) { S.perfect = 0; Kit.sfx.tone(520, 0.2, 'sine', 0.08, 0.6); fx.text(S.px, PY - 60, tr('Disguise off', '伪装失效'), '#c9a9b8', 16); } }
    S.sprintK = Kit.clamp(1 - (S.dur - S.t) / SPRINT_SEC, 0, 1);
    updatePlayer(dt, S.speed);
    updateObjects(dt, S.speed, true);
    updateFlashes(dt);
    updateClock();
    if (S.t >= S.dur) {
      S.t = S.dur; mode = 'finish'; S.endT = 0;
      const ok = S.score >= S.cfg.target;
      banner(ok ? ['Made it', '赶上了'] : ['Time is up', '时间到'], ok ? ['The rooftop door is right there', '天台的门就在眼前'] : ['...someone got a shot', '……好像被拍到了'], ok ? '#d9b892' : '#f4a6c6', 1.2);
      Kit.sfx.play(ok ? 'perfect' : 'bad');
    }
  }
  function update(dt) {
    time += dt;
    fx.update(dt);
    if (mode === 'play') updatePlay(dt);
    else if (mode === 'finish') {
      S.endT += dt; S.speed *= Math.exp(-dt * 3);
      updatePlayer(dt, S.speed); updateObjects(dt, S.speed, false);
      if (S.endT >= 1.1) { mode = 'over'; finish(); }
    }
    const spd = mode === 'play' || mode === 'finish' ? (S.hitstop > 0 ? 0 : S.speed) : 70;
    A.scrollBg(bg, spd, dt);
    if (S) {
      S.shake *= Math.exp(-dt * 12); S.red = Math.max(0, S.red - dt * 2.2); S.white = Math.max(0, S.white - dt * 3);
      S.comboPop = Math.max(0, S.comboPop - dt * 5);
      S.shown += (S.score - S.shown) * (1 - Math.exp(-dt * 10));
      if (S.banner) { S.banner.t += dt; if (S.banner.t >= S.banner.dur) S.banner = null; }
      if (S.prompt) { S.prompt.t += dt; if (S.prompt.t >= S.prompt.dur) S.prompt = null; }
    }
  }

  /* ---------- render ---------- */
  function render() {
    cv.clear();
    ctx.save();
    if (S && S.shake > 0.3) ctx.translate(Kit.rand(-1, 1) * S.shake, Kit.rand(-1, 1) * S.shake);
    A.drawBackground(ctx, bg, route, S ? S.sprintK : 0);
    if (S) {
      S.flashes.forEach((fl) => A.drawFlash(ctx, fl));
      S.objs.forEach((o) => { if (o.type === 'item') A.drawItem(ctx, o, time); });
      S.objs.forEach((o) => { if (o.type === 'fan') A.drawFan(ctx, o, time); });
    }
    const blink = S && S.inv > 0 && Math.floor(time * 16) % 2 === 0;
    A.drawPlayer(ctx, S ? S.px : LANES[1], PY, {
      lean: S ? S.lean : 0, squash: S ? S.squash : 0, step: S ? S.step : time * 4,
      wear: S ? { cap: S.perfect > 0 || S.have.cap, shades: S.perfect > 0 || S.have.glasses, hood: S.perfect > 0 || S.have.hoodie } : null,
      perfect: !!(S && S.perfect > 0), perfectEnding: !!(S && S.perfect > 0 && S.perfect < 1 && Math.floor(time * 10) % 2 === 0),
      alpha: blink ? 0.35 : 1,
    });
    fx.draw(ctx);
    ctx.restore();
    A.drawFront(ctx, bg, route);
    if (!S) return;
    if (S.white > 0) { ctx.fillStyle = `rgba(255,255,255,${S.white * 0.6})`; ctx.fillRect(0, 0, W, H); }
    A.drawVignette(ctx, 'rgba(190,40,90,.7)', S.red);
    if (S.perfect > 0) A.drawVignette(ctx, 'rgba(217,184,146,.4)', 0.6 + Math.sin(time * 6) * 0.2);
    if (S.prompt && mode !== 'over') A.drawPrompt(ctx, S.prompt, S.px, time);
    if (mode === 'play' || mode === 'finish' || mode === 'count') {
      const left = Math.max(0, S.dur - S.t);
      A.drawHUD(ctx, {
        timeLeft: left, score: Math.floor(S.score), shownScore: S.shown, target: S.cfg.target,
        combo: S.combo, comboPop: S.comboPop, mult: mult(), have: S.have, perfect: S.perfect, perfectMax: S.perfectMax,
        progress: S.t / S.dur, metersLeft: Math.round(S.r.meters * left / S.dur),
      });
    }
    if (S.banner) A.drawBanner(ctx, S.banner);
  }

  Kit.loop((dt) => { update(dt); render(); });

  /* ---------- story ----------
   * Every player-facing string carries both languages; the kit (or tr) shows exactly one. */
  const OPENING = [
    { who: 'narr', text: 'Album launch night. Downstairs, the after-party is deafening. Up on the hotel rooftop, you\'re waiting.', zh: '专辑首发夜。楼下的庆功派对吵得震耳欲聋。酒店天台上，你在等他。' },
    { who: 'tang', mood: 'angry', text: 'Jace. Sienna walks in at eleven. You are not leaving this party.', zh: '杰斯。西耶娜十一点到场。今晚你哪儿也不准去。' },
    { who: 'luyu', mood: 'normal', text: 'Ten minutes, Viv. I made someone a promise.', zh: '就十分钟，薇薇安。我答应过一个人。' },
    { who: 'tang', mood: 'normal', text: 'There are forty phones in that lobby and two photographers parked out back. One blurry shot and the whole Sienna story falls apart.', zh: '大堂里有四十部手机，后门还蹲着两个狗仔。拍到一张糊照，西耶娜那套故事就全完了。' },
    { who: 'luyu', mood: 'smile', text: 'Then nobody gets a shot. Cap, sunglasses, hoodie. I\'ll grab whatever I\'m missing on the way.', zh: '那就谁也拍不到。帽子、墨镜、连帽衫，缺什么我路上顺手拿。' },
    { who: 'tang', mood: 'sad', text: '...You\'re impossible. Fine. Which way?', zh: '……你真是要命。行吧，走哪边？',
      choices: [
        { text: 'Through the hotel lobby: packed, but more disguise drops', zh: '走酒店大堂：人多，但伪装好凑', value: 'mall' },
        { text: 'Out the service exit: quieter, but paparazzi wait there', zh: '走员工通道：人少，但狗仔蹲在那儿', value: 'alley' },
      ] },
    { who: 'luyu', mood: 'happy', text: 'Cover for me. I\'ll be back before Sienna\'s car pulls up.', zh: '帮我打个掩护。西耶娜的车到之前我就回来。' },
    { who: 'narr', text: 'If anyone gets a photo tonight, the rest of the night won\'t stay quiet.', zh: '今晚要是被谁拍到，接下来的夜晚就别想安静了。' },
  ];
  /* built when shown, so the language-dependent speaker name is always current */
  const endings = () => ({
    win: [
      { who: 'narr', text: 'The rooftop door bangs open. All of LA glitters behind him.', zh: '天台的门被一把推开，他身后是整片闪烁的洛杉矶。' },
      { who: 'luyu', mood: 'blush', text: 'Made it. Tell me I\'m not late.', zh: '赶上了。快说我没迟到。' },
      { who: 'me', mood: 'smile', text: 'Two minutes early. Your hoodie\'s inside out, rock star.', zh: '早了两分钟。不过你连帽衫穿反了，摇滚明星。' },
      { who: 'luyu', mood: 'smile', text: '...I took the stairs. All twenty floors.', zh: '……我是走楼梯上来的。整整二十层。' },
    ],
    lose: [
      { who: 'narr', scene: 'phone', text: 'Your phone buzzes. A blurry shot of him on the stairs is already all over TikTok: #WhoIsJacesGirl', zh: '手机一震。一张他在楼梯间的糊照已经在 TikTok 疯传：#杰斯的神秘女孩#' },
      { who: 'luyu', mood: 'sad', scene: 'rooftop', text: 'Yeah... they got me. But I\'m here.', zh: '嗯……被拍到了。但我来了。' },
      { who: 'tang', mood: 'angry', name: tr('Viv (on the phone)', '薇薇安（电话）'), text: 'Jace! Sienna\'s team won\'t stop calling me. What is this photo?!', zh: '杰斯！西耶娜那边的电话就没停过。这张照片到底怎么回事？！' },
      { who: 'me', mood: 'normal', text: 'You ran all twenty floors, didn\'t you?', zh: '你是一口气跑了二十层吧？' },
      { who: 'luyu', mood: 'smile', text: 'Told you I\'d come.', zh: '说了我会来的。' },
    ],
  });

  async function startRun() {
    const booster = pendingBooster;
    pendingBooster = null;
    S = newRun(booster);
    fx.list.length = 0;
    pendingDir = 0;
    mode = 'count';
    Kit.track('play_start', Object.assign({ route, booster, attempt }, S.cfg));
    if (booster === 'tang_clear') Kit.toast(tr('Viv cleared the way for 10s', '薇薇安清场：前 10 秒没人'));
    if (booster === 'full_disguise') Kit.toast(tr('Starting in full disguise', '全套伪装：开局即完美伪装'));
    await Kit.countdown(3);
    mode = 'play';
    if (pendingDir) { move(pendingDir); pendingDir = 0; }
  }

  async function finish() {
    const score = Math.floor(S.score), target = S.cfg.target;
    const success = score >= target;
    Kit.story.set('ch1', { success, score, route });
    const stars = success ? (score >= target * 1.5 ? 3 : score >= target * 1.2 ? 2 : 1) : 0;
    const res = await Kit.result({
      success, stars,
      title: success ? 'Made It' : '#WhoIsJacesGirl',
      zh: success ? '准时赴约' : '#杰斯的神秘女孩#',
      stats: [
        { label: 'Score / Goal · 得分', value: `${score} / ${target}`, key: 'score', raw: score },
        { label: 'Route · 路线', value: `${S.r.name} · ${S.r.zh}`, key: 'route', raw: route },
        { label: 'Recognized · 被认出', value: String(S.hits), key: 'hits', raw: S.hits },
        { label: 'Photographed · 被拍到', value: String(S.photos), key: 'photos', raw: S.photos },
        { label: 'Perfect disguise · 完美伪装', value: String(S.perfectCount), key: 'perfect', raw: S.perfectCount },
        { label: 'Best combo · 最高连击', value: String(S.maxCombo), key: 'maxCombo', raw: S.maxCombo },
      ],
      branch: success
        ? { title: 'Made It · 准时赴约', text: S.r.echo + 'He bursts onto the rooftop two minutes early, out of breath and grinning.', zh: S.r.echoZh + '他提前两分钟冲上天台，气喘吁吁，笑得停不下来。' }
        : { title: '#WhoIsJacesGirl · #杰斯的神秘女孩#', text: S.r.echo + 'A blurry photo of him heading upstairs is all over TikTok and the tabloids. He still shows up, but Viv won\'t stop calling.', zh: S.r.echoZh + '一张他上楼的糊照在 TikTok 和小报上疯传。他还是来了，可薇薇安的电话一直没停。' },
      boosters: [
        { id: 'tang_clear', name: 'Viv Clears the Way · 薇薇安清场', desc: 'Retry with no fans or paparazzi for the first 10s · 重来一局，前 10 秒没有粉丝和狗仔', price: '$0.99' },
        { id: 'full_disguise', name: 'Full Disguise · 全套伪装', desc: 'Retry starting in Perfect Disguise · 重来一局，开局即完美伪装', price: '$0.99' },
      ],
    });
    if (res.action === 'retry') {
      pendingBooster = res.booster || null;
      attempt++;
      startRun();
      return;
    }
    await Kit.dialogue(success ? endings().win : endings().lose, {
      bg: 'rooftop',
      caption: success ? tr('Hotel Rooftop · On Time', '酒店天台 · 准时') : tr('Hotel Rooftop · #WhoIsJacesGirl', '酒店天台 · #杰斯的神秘女孩#'),
    });
    nextCard(success);
  }

  let endCard = null;
  function nextCard(success) {
    if (endCard) endCard.remove();
    const zh = Kit.lang && Kit.lang() === 'zh';
    const n = Kit.el(`<div class="kit-scrim"><div class="kit-card kit-tut" style="text-align:center">
      <div class="kit-res-badge ${success ? 'win' : 'lose'}">${tr('EPISODE 1 · END', '第一集 · 完')}</div>
      <h2 style="font-family:${zh ? 'var(--f-serif, serif)' : 'var(--f-script, cursive)'};font-weight:400;font-size:34px">${success ? tr('Made It', '准时赴约') : tr('#WhoIsJacesGirl', '#杰斯的神秘女孩#')}</h2>
      <div class="kit-res-sub">${tr('Next: Episode 2 · Don\'t Let It Show', '下一集：别让他看出来')}</div>
      <div class="mod" style="text-align:left">${success ? tr('He made it, and nobody saw. Episode 2 starts calmer.', '他准时到了，也没人看见。第二集开局会更平稳。') : tr('The photo is everywhere. In Episode 2 his phone will not stop buzzing.', '那张照片到处都是。第二集里，他的手机会一直震。')}</div>
      <button class="kit-btn primary" data-a="next">${tr('Continue to Episode 2 ›', '进入第二集 ›')}</button>
      <button class="kit-btn ghost" data-a="replay">${tr('Replay Episode 1', '重玩本集')}</button></div></div>`);
    n.querySelector('[data-a=next]').onclick = () => {
      Kit.sfx.play('good'); Kit.track('chapter_next', { to: 'ch2', success });
      location.href = '../ch2-heartbeat/index.html';
    };
    n.querySelector('[data-a=replay]').onclick = () => { Kit.sfx.play('tap'); location.reload(); };
    ui.overlay.appendChild(n);
    endCard = n; endCard.success = success;
  }
  if (Kit.onLang) Kit.onLang(() => { defineTuning(); if (endCard && endCard.isConnected) nextCard(endCard.success); });

  async function main() {
    Kit.resetRetries();
    A.prewarm('mall'); // bake sprites up front so the run never hitches on first use
    const r = await Kit.dialogue(OPENING, { bg: 'street', caption: tr('Episode 1 · Sneak Out', '第一集 · 溜出去') });
    route = r.choices[0] === 'alley' ? 'alley' : 'mall';
    A.prewarm(route);
    const v = Kit.tuning.values, rt = ROUTES[route];
    await Kit.tutorial({
      chapter: 'EPISODE 1 · MINI GAME', chapterZh: '第一集 · 小游戏',
      title: 'Sneak Out', zh: '溜出去',
      goal: `Score ${v.target} in ${v.duration}s to get him to the rooftop on time`,
      goalZh: `${v.duration} 秒内拿到 ${v.target} 分，让他准时到天台`,
      items: [
        { icon: '↔', text: 'Swipe, tap the left or right half, or use ← → / A D to change lanes', zh: '左右滑动、点左/右半屏或按方向键换道' },
        { icon: '🧢', text: 'Grab a cap, sunglasses and a hoodie. A full set means fans won\'t recognize him for a few seconds', zh: '集齐帽子、墨镜、连帽衫触发「完美伪装」，几秒内粉丝认不出他' },
        { icon: '📸', text: 'A glowing lane means a paparazzo is about to shoot. Get out of it', zh: '车道发光 = 狗仔要按快门，赶紧离开' },
      ],
      modifier: `Route: ${rt.name} (${route === 'mall' ? 'more people, more disguise drops' : 'fewer people, more paparazzi'}). Get photographed here and his phone keeps buzzing all through Episode 2.`,
      modifierZh: `路线：${rt.zh}（${route === 'mall' ? '人更多，伪装掉得更多' : '人更少，狗仔更多'}）。这一集被拍到的话，第二集里他的手机会一直震。`,
      start: 'Start', startZh: '开始',
    });
    startRun();
  }
  main();
})();
