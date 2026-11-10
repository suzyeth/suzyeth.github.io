/* Episode 2 · Don't Let It Show 别让他看出来
 * Rooftop date. Hold to breathe and pull your heart down; let go and it rises on its own.
 * Keep it in the sweet spot to build Heart. His lines push it up or down (telegraphed 0.6s ahead);
 * when he leans in, a ring closes on his face — tap as it lands. */
(function () {
  'use strict';
  const W = Kit.W, H = Kit.H;
  const NEXT_URL = '../ch3-redcarpet/index.html';
  const ui = Kit.mount({ id: 'ch2-heartbeat', title: "Don't Let It Show · 别让他看出来", episode: "Episode 2 · Don't Let It Show" });
  const Art = window.Ch2Art;
  /* one language at a time; guarded so the page still runs on an older kit */
  const tr = (en, zh) => (Kit.tr ? Kit.tr(en, zh) : en);
  const isZh = () => (Kit.lang ? Kit.lang() === 'zh' : false);
  const C = { ink: '#0b0a0f', plum: '#2a1626', pink: '#f4a6c6', pink2: '#e889b0', champ: '#d9b892', cream: '#f6efe9',
    glass: 'rgba(38,20,36,.72)', edge: 'rgba(255,255,255,.12)', cold: '#9fb4e0', hot: '#ff6b8e' };

  /* ---------- tuning (these defaults are the documented defaults) ---------- */
  const SCHEMA = [
    { key: 'duration', label: 'Duration (s) · 时长（秒）', min: 30, max: 80, step: 5, value: 50,
      hint: 'Longer means more lines and more stamina; line and lean-in times scale with it. · 越长台词越多、越考验耐力；台词和靠近时刻按比例缩放。' },
    { key: 'target', label: 'Target Heart · 目标心动值', min: 40, max: 95, step: 5, value: 65,
      hint: 'Pass line out of 100. About 60-65% time in the sweet spot is enough; from 70 it gets clearly harder. · 过关线（满值 100）。约 60–65% 时间留在区内就够；70 起明显变难。' },
    { key: 'rise', label: 'Heart rise · 心跳上浮力', min: 0.6, max: 2.0, step: 0.1, value: 1.2,
      hint: 'Upward pull when you let go. Higher means holding more often and feeling out of control. · 松手时心跳往上冲的加速度。越大越要频繁按住，越像「控制不住」。' },
    { key: 'breath', label: 'Breath strength · 深呼吸力度', min: 1.4, max: 4.0, step: 0.1, value: 2.6,
      hint: 'Downward pull while holding; must beat rise. A bigger gap is snappier but easier to overshoot into cold. · 按住时往下拉的力，要大于上浮力。差值越大越灵敏，也越容易压过头变冷淡。' },
    { key: 'zone', label: 'Sweet spot width · 心动区宽度', min: 0.12, max: 0.40, step: 0.02, value: 0.24,
      hint: 'Share of the gauge. The most direct difficulty knob. · 占整条心跳槽的比例。最直接的难度旋钮。', fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'qteWindow', label: 'Lean-in window ±ms · 靠近时机窗口（±毫秒）', min: 100, max: 360, step: 20, value: 200,
      hint: 'Good window; Perfect is 40% of it. Keep at least 180 on touch screens. · 「不错」的判定范围，「完美」是它的 40%。触屏建议不低于 180。' },
    { key: 'spike', label: 'Line impact · 台词波动强度', min: 0.4, max: 1.8, step: 0.1, value: 1.0,
      hint: 'How far each of his lines pushes your heart. Drama against fairness. · 他每句话把心跳推多远。剧情张力和公平感的取舍。' },
    { key: 'gain', label: 'Heart gain per second · 心动值积累速度', min: 1.0, max: 3.5, step: 0.1, value: 2.0,
      hint: 'Heart per second in the sweet spot, before combo and final-stretch multipliers. · 在区内每秒涨多少，连击和最后冲刺再乘倍率。' },
  ];
  const PRESETS = {
    'Story opening (new players) · 剧情开头（新手）': { duration: 45, target: 60, rise: 1.0, breath: 2.4, zone: 0.30, qteWindow: 260, spike: 0.7, gain: 2.2 },
    'Standard · 标准': { duration: 50, target: 65, rise: 1.2, breath: 2.6, zone: 0.24, qteWindow: 200, spike: 1.0, gain: 2.0 },
    'Mid-to-late story · 剧情中后期': { duration: 55, target: 78, rise: 1.4, breath: 2.8, zone: 0.20, qteWindow: 160, spike: 1.3, gain: 1.9 },
  };
  Kit.tuning.define(SCHEMA, {
    presets: PRESETS,
    note: 'Changes apply next round. The opening choice, Episode 1 result and boosters multiply on top of these. · 改完下一局生效。开场选择、前章结果和道具会在这些数值上再乘修正。',
    onChange: () => Kit.toast(tr('Saved. Applies next round.', '已保存，下一局生效')),
  });

  /* ---------- fixed feel constants ---------- */
  const DAMP = 1.8;              // velocity damping /s: the "weighted bar" feel
  const GAUGE = { x: 24, y: 200, w: 28, h: 196 };   // below the kit's 70px top bar; panel ends y≈456, above the speech boxes
  const FACE = { x: 195, y: 372 };
  const BOX = { x: 16, y: 516, w: 358, maxBottom: 640 };   // his box: below the gauge panel, above "Hold to breathe" (y≈652)
  const ME_BOX = { x: 76, y: 404, w: 298 };                  // your blurt: right of the gauge column
  const PERFECT_RATIO = 0.4, OUT_DECAY = 0.8, EARLY_IGNORE = 2;   // taps > 2 windows early are breaths, not QTE misses
  const COMBO_BONUS = 0.03, COMBO_CAP = 10;
  const EASY_SEC = 10, SPRINT_SEC = 10, SPRINT_MULT = 1.5;
  const HOT = 0.9, HOT_HOLD = 1.0, COLD = 0.12, COLD_HOLD = 1.4;
  const TELEGRAPH = 0.6, QTE_LEAN = 0.55, QTE_RING = 1.2, QTE_SLOW = 0.4;
  const PERFECT_ADD = 8, GOOD_ADD = 4, BLURT_COST = 6, COLD_COST = 5;
  /* boosters only ever make the next round easier (checked with a bot across every choice × ch1 combination) */
  const BREATH_ZONE = 1.3;                              // Deep Breath: sweet spot ×1.3
  const JACKET = { rise: 0.8, breath: 0.8, kick: 0.7 }; // His Leather Jacket: calmer heart, his lines and the phone hit 30% softer
  const BASE_DURATION = 50;      // SCRIPT times are written for a 50s round and scaled to the tuned duration

  /* his lines; kick = how far the heart is pushed (+ spike / − dip), in gauge units */
  const SCRIPT = [   // timing and kicks unchanged from the original tuning; only the words were re-skinned
    { t: 2.5, text: 'You look good up here. Like, unfairly good.', zh: '你站在这儿真好看。好看得有点犯规。', kick: 0.14, mood: 'smile' },
    { t: 7, text: '...So. Nice weather, huh.', zh: '……嗯。天气不错哈。', kick: -0.16, mood: 'normal' },
    { t: 11.5, text: "You still bite your lip when you're nervous. Cute.", zh: '你一紧张还是会咬嘴唇。挺可爱的。', kick: 0.2, mood: 'smile' },
    { t: 15, qte: true, text: "Hold still. You've got glitter on your cheek.", zh: '别动，你脸上沾了亮片。', mood: 'blush' },
    { t: 20.5, text: 'Half the new album is about one person. Guess who.', zh: '新专辑有一半是写给一个人的。猜猜是谁。', kick: 0.26, mood: 'normal' },
    { t: 24.5, text: "Sienna's team wants us at brunch tomorrow. Anyway.", zh: '西耶娜那边说明天要我们一起吃早午餐。算了，不说这个。', kick: -0.24, mood: 'surprised' },
    { t: 28.5, qte: true, text: "Take an earbud. This one's not out yet. It's about you.", zh: '来，分你一只耳机。这首还没发，写的是你。', mood: 'blush' },
    { t: 34, text: '(His phone lights up. Another photo of him and Sienna.)', zh: '（他的手机亮了。又是一张他和西耶娜的合照。）', kick: -0.28, mood: 'sad' },
    { t: 38, text: "Everyone thinks they know me. They don't.", zh: '所有人都以为了解我。其实没有。', kick: -0.18, mood: 'sad' },
    { t: 41.5, text: 'You did, though. Before any of this.', zh: '可你了解我。在这一切发生之前就是。', kick: 0.32, mood: 'smile' },
    { t: 45, qte: true, text: 'Come here. I need to tell you something about Sienna.', zh: '过来。关于西耶娜，我有话要告诉你。', mood: 'blush' },
    { t: 48.5, text: "Your heart's racing. Good. So is mine.", zh: '你心跳好快。很好，我也是。', kick: 0.3, mood: 'smile' },
  ];
  const BLURTS = [
    { text: "I'm not staring at your mouth!", zh: '我才没有盯着你的嘴！' },
    { text: 'You smell amazing. I mean, nice night!', zh: '你好香——我是说，今晚夜色真好！' },
    { text: 'My heart is NOT racing!', zh: '我心跳才没有很快！' },
  ];
  const VIRAL = [['#WhoIsJacesGirl', '#杰斯的神秘女孩#'], ['#JaceSneaksOut', '#杰斯偷溜#'], ['#JaceAndSienna?', '#杰斯和西耶娜？#']];

  /* ---------- cross-chapter + opening choice ---------- */
  const ch1 = Kit.story.get('ch1', null);
  const ch1State = !ch1 ? 'none' : ch1.success ? 'calm' : 'buzz';
  const CH1 = {
    none: { short: 'No record', shortZh: '无记录',
      line: { who: 'narr', text: "You check your phone again. He said he'd ditch the party early.", zh: '你又看了一眼手机。他说过会早点溜出派对。' },
      mod: 'No Episode 1 record: default difficulty.', modZh: '没有上一章记录，按默认难度。' },
    calm: { short: 'Made it out clean', shortZh: '顺利溜出',
      line: { who: 'narr', text: 'His text: "Out clean. Zero cameras." Tonight nobody knows where he is.', zh: '他发来消息：「顺利溜出来了，一个镜头都没有。」今晚，没人知道他在哪。' },
      mod: 'He got out clean in Episode 1: his lines hit half as hard for the first 12s and you start in the sweet spot.', modZh: '上一章他顺利溜出：开局 12 秒他的话冲击减半，心跳从心动区出发。' },
    buzz: { short: 'Went viral', shortZh: '照片疯传',
      line: { who: 'narr', text: 'Your phone will not stop buzzing. A blurry photo of him heading upstairs is all over TikTok: #WhoIsJacesGirl.', zh: '手机震个不停。一张他上楼的模糊照片在 TikTok 疯传：#杰斯的神秘女孩#。' },
      mod: 'He was caught on camera in Episode 1: viral alerts keep buzzing your phone and spike your heart (with a warning).', modZh: '上一章他被拍到了：疯传的通知会不时震动手机，带来额外心跳尖峰（有预告）。' },
  };
  const CHOICE = {
    gentle: { short: '"I just got here"', shortZh: '「我也刚到」', desc: 'Sweet spot +15%', descZh: '心动区 +15%', zoneMul: 1.15, startMeter: 0, spikeMul: 1 },
    tease: { short: '"Twelve minutes late"', shortZh: '「迟到十二分钟」', desc: 'Start at 10 Heart, lines hit ×1.25', descZh: '心动值 10 起步，台词波动 ×1.25', zoneMul: 1, startMeter: 10, spikeMul: 1.25 },
  };
  const BOOSTERS = [
    { id: 'breath', name: 'Deep Breath · 深呼吸', desc: 'Next round: sweet spot 30% wider · 下一局心动区宽 30%', price: '¥6', gems: 30 },
    { id: 'jacket', name: 'His Leather Jacket · 他的皮夹克', desc: 'He puts his leather jacket on you. Next round your heart is calmer and his lines hit 30% softer · 他把皮夹克披在你肩上：下一局心跳更稳，他的话冲击减弱 30%', price: '¥6', gems: 30 },
  ];
  const BOOSTER_NAME = { breath: ['Deep Breath', '深呼吸'], jacket: ['Leather Jacket', '皮夹克'] };

  /* ---------- scene layers: bg canvas → Jace close-up (DOM/SVG) → fg canvas ---------- */
  const bg = Kit.canvas();
  const portrait = document.createElement('div');
  portrait.className = 'ch2-portrait';
  ui.game.appendChild(portrait);
  const fg = Kit.canvas();
  const fx = Kit.particles();

  const S = { phase: 'story', t: 0, choice: 'gentle', held: false, holdBlocked: false, lean: 0, mood: '', popT: 0, pulse: 0, cold: false, hot: false };
  let R = null;

  const clamp = Kit.clamp, lerp = Kit.lerp;
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const easeOutBack = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  function setMood(m, hold) {
    if (hold && R) R.moodHold = hold;
    if (S.mood === m) return;
    S.mood = m; S.popT = 1;
    portrait.innerHTML = Kit.portraitSVG('luyu', m);
  }
  setMood('normal');

  /* ---------- input: hold = breathe, tap during a lean-in = QTE ---------- */
  const isUi = (el) => el && el.closest && el.closest('#kit-topbar, #kit-toolbar, .kit-side, .kit-scrim, .kit-dlg, .kit-ad, .kit-sheet');
  function press() {
    if (S.phase !== 'play' && S.phase !== 'countdown') return;
    if (S.phase === 'play' && R.qte && tapQte()) { S.holdBlocked = true; return; }
    if (!S.held && S.phase === 'play') Kit.sfx.tone(300, 0.18, 'sine', 0.05, 0.75);
    S.held = true; S.holdBlocked = false;
  }
  function release() { S.held = false; S.holdBlocked = false; }
  ui.stage.addEventListener('pointerdown', (e) => { if (!isUi(e.target)) press(); });
  ui.stage.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('blur', release);
  const isSpace = (e) => e.code === 'Space' || e.key === ' ';
  const gameplayKeys = () => S.phase === 'play' || S.phase === 'countdown';
  addEventListener('keydown', (e) => { if (isSpace(e) && gameplayKeys()) { e.preventDefault(); if (!e.repeat) press(); } });
  addEventListener('keyup', (e) => { if (isSpace(e)) { if (gameplayKeys()) e.preventDefault(); release(); } });

  /* ---------- round setup ---------- */
  function makeConfig(booster) {
    const v = Kit.tuning.values, c = CHOICE[S.choice];
    const j = booster === 'jacket' ? JACKET : { rise: 1, breath: 1, kick: 1 };
    return {
      duration: v.duration, target: v.target, qteWindow: v.qteWindow, gain: v.gain,
      rise: v.rise * j.rise, breath: v.breath * j.breath,
      zone: Math.min(0.6, v.zone * c.zoneMul * (booster === 'breath' ? BREATH_ZONE : 1)),
      spike: v.spike * c.spikeMul * j.kick, phoneSpike: v.spike * j.kick,
      startMeter: c.startMeter, booster: booster || null,
    };
  }
  function newRound(cfg) {
    const k = cfg.duration / BASE_DURATION;
    return {
      cfg, gt: 0, h: ch1State === 'calm' ? 0.5 : ch1State === 'buzz' ? 0.62 : 0.45, v: 0,
      meter: cfg.startMeter, disp: cfg.startMeter, state: 'zone', zoneC: 0.5, zoneW: cfg.zone * 1.25,
      combo: 0, comboBonus: 0, streak: 0, maxCombo: 0, inZoneT: 0, playT: 0,
      perfects: 0, goods: 0, misses: 0, blurts: 0, colds: 0,
      events: SCRIPT.map((e) => Object.assign({}, e, { at: e.t * k, fired: false })), qteTotal: SCRIPT.filter((e) => e.qte).length,
      pending: [], qte: null, bubble: null, meBubble: null, notif: null, banners: [],
      hiT: 0, loT: 0, coldT: 0, blurtCd: 0, coldCd: 0, nextBuzz: 5 + Math.random() * 2, heartT: 0,
      beat: 0, bpm: 70, timeScale: 1, slowT: 0, hitstop: 0, shake: 0, flash: 0, flashCol: '255,255,255',
      moodHold: 0, lastTick: 0, comboPop: 0, timerPop: 0, flags: { mid: false, sprint: false, target: false }, onEnd: null,
    };
  }

  /* ---------- script, telegraphed kicks, phone buzz ---------- */
  function say(text, zh, dur, kick) { R.bubble = { text, zh, t: 0, dur: dur || 2.6, kick: kick || 0 }; }
  function runScript() {
    if (R.qte) return;
    const e = R.events.find((ev) => !ev.fired && ev.at <= R.gt);
    if (!e) return;
    e.fired = true;
    if (e.qte) { startQte(e); return; }
    let k = e.kick ? e.kick * R.cfg.spike : 0;
    if (k && ch1State === 'calm' && R.gt < 12) k *= 0.5;
    say(e.text, e.zh, 2.6, k);
    setMood(e.mood, 2.4);
    Kit.sfx.play('blip');
    if (k) R.pending.push({ at: R.gt + TELEGRAPH, kick: k, src: 'line' });
  }
  function runPending() {
    for (let i = R.pending.length - 1; i >= 0; i--) {
      const p = R.pending[i];
      if (p.at > R.gt) continue;
      R.pending.splice(i, 1);
      R.v += p.kick * DAMP;
      R.shake = Math.max(R.shake, Math.abs(p.kick) * 16);
      if (p.kick > 0) { Kit.sfx.play('heart'); Kit.sfx.tone(520, 0.2, 'triangle', 0.06, 1.6); }
      else Kit.sfx.tone(300, 0.3, 'sine', 0.07, 0.5);
      fx.text(GAUGE.x + GAUGE.w + 34, yOf(R.h), p.kick > 0 ? tr('spike ↑', '心跳 ↑') : tr('dip ↓', '冷场 ↓'), p.kick > 0 ? C.pink : C.cold, 15);
      Kit.track('line_kick', { src: p.src, kick: +p.kick.toFixed(2), t: +R.gt.toFixed(1) });
    }
  }
  function runBuzz() {
    if (ch1State !== 'buzz' || R.qte || R.gt < R.nextBuzz || R.gt > R.cfg.duration - 2) return;
    R.nextBuzz = R.gt + 6 + Math.random() * 3;
    R.notif = { t: 0, tag: VIRAL[(Math.random() * VIRAL.length) | 0] };
    Kit.vibrate([40, 40, 40]);
    Kit.sfx.tone(190, 0.07, 'square', 0.05); Kit.sfx.tone(190, 0.07, 'square', 0.05, 0, 0.12);
    R.pending.push({ at: R.gt + TELEGRAPH, kick: 0.2 * R.cfg.phoneSpike, src: 'phone' });
    Kit.track('phone_buzz', { t: +R.gt.toFixed(1) });
  }

  /* ---------- QTE: he leans in, ring closes on his face, tap when it lands ---------- */
  function startQte(e) {
    R.qte = { stage: 'lean', t: 0, grade: null };
    say(e.text, e.zh, 3.2, 0);
    setMood(e.mood, 3);
    Kit.sfx.play('whoosh');
  }
  function updateQte(dt) {
    const q = R.qte; if (!q) return;
    q.t += dt;
    if (q.stage === 'lean' && q.t >= QTE_LEAN) { q.stage = 'ring'; q.t = 0; Kit.sfx.play('blip'); }
    else if (q.stage === 'ring' && q.t > QTE_RING + R.cfg.qteWindow / 1000) resolveQte(null);
    else if (q.stage === 'after' && q.t >= 0.55) R.qte = null;
  }
  /* returns true if the press was consumed by the QTE */
  function tapQte() {
    const q = R.qte;
    if (q.stage === 'lean') return true;
    if (q.stage !== 'ring') return false;
    const err = (q.t - QTE_RING) * 1000;
    if (err < -R.cfg.qteWindow * EARLY_IGNORE) return false;   // way too early: treat as a breath, not a miss
    resolveQte(err);
    return true;
  }
  function resolveQte(err) {
    const q = R.qte, w = R.cfg.qteWindow, a = err == null ? Infinity : Math.abs(err);
    const grade = a <= w * PERFECT_RATIO ? 'perfect' : a <= w ? 'good' : 'miss';
    q.stage = 'after'; q.t = 0; q.grade = grade;
    if (grade === 'perfect') {
      R.perfects++; addMeter(PERFECT_ADD); R.comboBonus += 2;
      R.hitstop = 0.07; R.slowT = 0.45; R.flash = 0.55; R.flashCol = '246,239,233'; R.shake = 6;
      fx.burst(FACE.x, FACE.y, { n: 34, shape: 'heart', colors: [C.pink, C.pink2, C.champ, C.cream], min: 120, max: 380, life: 1.1, size: 9, g: 160 });
      fx.text(FACE.x, FACE.y - 74, tr('PERFECT', '完美'), C.champ, 36);
      Kit.sfx.play('perfect'); Kit.vibrate(40); setMood('blush', 2.2);
      R.v += 0.08 * DAMP;
    } else if (grade === 'good') {
      R.goods++; addMeter(GOOD_ADD); R.shake = 3;
      fx.burst(FACE.x, FACE.y, { n: 14, shape: 'heart', colors: [C.pink, C.pink2], min: 80, max: 240, life: 0.9, size: 7, g: 200 });
      fx.text(FACE.x, FACE.y - 74, tr('GOOD', '不错'), C.pink, 30);
      Kit.sfx.play('good'); setMood('smile', 1.8);
    } else {
      R.misses++; R.shake = 5; R.v += 0.22 * DAMP;
      R.flash = 0.3; R.flashCol = '255,90,120';
      fx.text(FACE.x, FACE.y - 74, err != null && err < 0 ? tr('TOO EARLY', '太早了') : tr('MISS', '错过了'), C.cold, 26);
      Kit.sfx.play('bad'); setMood('surprised', 1.8);
      say('Ah, sorry. Too close.', '啊……抱歉，我离太近了。', 1.8, 0);
    }
    Kit.track('qte', { grade, errMs: err == null ? null : Math.round(err) });
  }

  function addMeter(n) {
    R.meter = clamp(R.meter + n, 0, 100);
    fx.text(240, 128, (n > 0 ? '+' : '') + n, n > 0 ? C.champ : C.cold, 18);
  }

  /* ---------- core simulation ---------- */
  function updateZone() {
    const t = R.gt, d = R.cfg.duration;
    const easeIn = smooth((t - EASY_SEC) / 3), sprint = smooth((t - (d - SPRINT_SEC)) / 2);
    const mid = 0.5 + 0.12 * Math.sin(t * 0.42) + 0.05 * Math.sin(t * 1.1 + 1);
    const late = 0.52 + 0.15 * Math.sin(t * 0.62 + 0.5);
    R.zoneW = R.cfg.zone * lerp(1.25, lerp(1, 0.88, sprint), easeIn);
    const half = R.zoneW / 2;
    R.zoneC = clamp(lerp(0.5, lerp(mid, late, sprint), easeIn), half + 0.04, 1 - half - 0.04);
  }
  function updateHeart(g) {
    const held = S.held && !S.holdBlocked;
    const wobble = 1 + 0.18 * Math.sin(R.gt * 1.7) + 0.1 * Math.sin(R.gt * 4.3);
    R.v += (R.cfg.rise * wobble - (held ? R.cfg.breath : 0)) * g;
    R.v *= Math.exp(-DAMP * g);
    R.h += R.v * g;
    if (R.h > 1) { R.h = 1; R.v = -Math.abs(R.v) * 0.25; }
    if (R.h < 0) { R.h = 0; R.v = Math.abs(R.v) * 0.25; }
    const diff = R.h - R.zoneC;
    R.state = Math.abs(diff) <= R.zoneW / 2 ? 'zone' : diff > 0 ? 'hot' : 'cold';
  }
  function updateMeter(g) {
    const cfg = R.cfg;
    R.playT += g;
    if (R.state === 'zone') {
      R.streak += g; R.inZoneT += g;
      const c = Math.floor(R.streak) + R.comboBonus;
      if (c > R.combo) { R.combo = c; R.comboPop = 1; R.maxCombo = Math.max(R.maxCombo, c); if (c >= 2 && c % 5 === 0) Kit.sfx.play('collect'); }
      const sprint = R.gt > cfg.duration - SPRINT_SEC ? SPRINT_MULT : 1;
      R.meter = Math.min(100, R.meter + cfg.gain * (1 + Math.min(R.combo, COMBO_CAP) * COMBO_BONUS) * sprint * g);
      R.heartT += g;
      if (R.heartT > 0.32) {
        R.heartT = 0;
        fx.burst(GAUGE.x + GAUGE.w / 2, yOf(R.h), { n: 1, shape: 'heart', colors: [C.pink, C.champ], min: 20, max: 50, life: 1.1, size: 5, g: -60 });
      }
    } else {
      if (R.combo >= 3) fx.text(132, 172, tr('combo lost', '连击中断'), C.cold, 14);
      R.streak = 0; R.combo = 0; R.comboBonus = 0;
      R.meter = Math.max(0, R.meter - OUT_DECAY * g);
    }
    if (!R.flags.target && R.meter >= cfg.target) {
      R.flags.target = true; Kit.sfx.play('collect');
      banner('Target reached. Hold steady.', '达标！再稳住一会儿', C.champ);
      Kit.track('target_reached', { t: +R.gt.toFixed(1) });
    }
  }
  function updateExtremes(g) {
    R.hiT = R.h > HOT ? R.hiT + g : Math.max(0, R.hiT - g * 2);
    R.loT = R.h < COLD ? R.loT + g : Math.max(0, R.loT - g * 2);
    R.coldT = R.state === 'cold' ? R.coldT + g : 0;
    R.blurtCd -= g; R.coldCd -= g;
    if (R.hiT >= HOT_HOLD && R.blurtCd <= 0 && !R.qte) {   // never during a lean-in: keeps that moment (and its prompt) clean
      const b = BLURTS[R.blurts % BLURTS.length];
      R.blurts++; R.hiT = 0; R.blurtCd = 4; addMeter(-BLURT_COST);
      R.meBubble = { text: b.text, zh: b.zh, t: 0 };
      R.flash = 0.45; R.flashCol = '255,90,120'; R.shake = 9;
      Kit.sfx.play('bad'); Kit.vibrate(80); setMood('surprised', 1.8);
      Kit.track('blurt', { t: +R.gt.toFixed(1) });
    }
    if (R.loT >= COLD_HOLD && R.coldCd <= 0) {
      R.colds++; R.loT = 0; R.coldCd = 5; addMeter(-COLD_COST);
      say('...Am I boring you?', '……跟我待着，是不是有点无聊？', 2.2, 0);
      Kit.sfx.play('lose'); setMood('sad', 2.4);
      Kit.track('cold', { t: +R.gt.toFixed(1) });
    }
  }
  function autoMood(g) {
    if (R.moodHold > 0) { R.moodHold -= g; return; }
    if (R.state === 'cold' && R.coldT > 0.8) setMood('sad');
    else if (R.state === 'hot' && R.h > 0.8) setMood('surprised');
    else setMood(R.state === 'zone' && R.streak > 3 ? 'smile' : 'normal');
  }
  function updateBeat(g) {
    R.bpm = lerp(62, 158, R.h);
    R.beat += g * R.bpm / 60;
    if (R.beat >= 1) { R.beat -= 1; Kit.sfx.play('heart'); S.pulse = 1; }
  }
  function updateClock() {
    const d = R.cfg.duration, rem = Math.ceil(d - R.gt);
    if (!R.flags.mid && R.gt >= EASY_SEC) { R.flags.mid = true; banner('He opens up', '他打开了话匣子', C.pink); }
    if (!R.flags.sprint && R.gt >= d - SPRINT_SEC) {
      R.flags.sprint = true; Kit.sfx.play('go');
      banner('Final stretch · Heart ×' + SPRINT_MULT, '最后冲刺', C.champ);
    }
    if (rem <= 10 && rem > 0 && rem !== R.lastTick) { R.lastTick = rem; R.timerPop = 1; Kit.sfx.play('tick'); }
  }

  function step(dt) {
    if (R.hitstop > 0) { R.hitstop -= dt; return; }
    updateQte(dt);
    if (R.slowT > 0) R.slowT -= dt;
    const want = R.qte ? QTE_SLOW : R.slowT > 0 ? 0.25 : 1;
    R.timeScale = lerp(R.timeScale, want, 1 - Math.exp(-12 * dt));
    const g = dt * R.timeScale;
    R.gt += g;
    runScript(); runBuzz(); runPending();
    updateZone(); updateHeart(g); updateMeter(g); updateExtremes(g);
    autoMood(g); updateBeat(g); updateClock();
    if (R.gt >= R.cfg.duration && !R.qte) finishRound();
  }

  function finishRound() {
    S.phase = 'end'; S.held = false;
    const cfg = R.cfg, success = R.meter >= cfg.target;
    R.onEnd({
      success, meter: Math.round(R.meter), target: cfg.target, booster: cfg.booster,
      zonePct: Math.round(R.inZoneT / Math.max(0.01, R.playT) * 100),
      perfects: R.perfects, goods: R.goods, qteTotal: R.qteTotal, maxCombo: R.maxCombo, blurts: R.blurts, colds: R.colds,
    });
  }

  /* ---------- effects + banners (real time) ---------- */
  function banner(text, zh, color) { if (R) R.banners.push({ text, zh, color, t: 0 }); }
  function updateFx(dt) {
    S.t += dt;
    S.pulse = Math.max(0, S.pulse - dt * 4);
    fx.update(dt);
    if (R) {
      R.flash = Math.max(0, R.flash - dt * 2.2);
      R.shake = Math.max(0, R.shake - dt * 30);
      R.disp = lerp(R.disp, R.meter, 1 - Math.exp(-8 * dt));
      R.comboPop = Math.max(0, R.comboPop - dt * 4);
      R.timerPop = Math.max(0, R.timerPop - dt * 3);
      if (R.bubble) { R.bubble.t += dt; if (R.bubble.t > R.bubble.dur + 0.3) R.bubble = null; }
      if (R.meBubble) { R.meBubble.t += dt; if (R.meBubble.t > 2.1) R.meBubble = null; }
      if (R.notif) { R.notif.t += dt; if (R.notif.t > 2.4) R.notif = null; }
      R.banners = R.banners.filter((b) => (b.t += dt) < 1.8);
    }
    const sh = R ? R.shake : 0;
    ui.game.style.transform = sh > 0.3 ? `translate(${Kit.rand(-sh, sh).toFixed(1)}px, ${Kit.rand(-sh, sh).toFixed(1)}px)` : '';
    const cold = S.phase === 'play' && R && R.state === 'cold';
    if (cold !== S.cold) { S.cold = cold; ui.game.style.filter = cold ? 'saturate(.45) brightness(.88)' : ''; }
    const hot = S.phase === 'play' && R && R.state === 'hot';
    if (hot !== S.hot) { S.hot = hot; portrait.classList.toggle('flustered', hot); }   // CSS blur/darken so the HUD reads first
    const leanT = R && R.qte && R.qte.stage !== 'after' ? 1 : 0;
    S.lean += (leanT - S.lean) * (1 - Math.exp(-6 * dt));
    S.popT = Math.max(0, S.popT - dt * 5);
    const push = R && S.phase !== 'story' ? 0.04 * clamp(R.gt / R.cfg.duration, 0, 1) : 0;   // slow push-in over the round
    const bob = Math.sin(S.t * 1.6) * 2.5, sc = 1 + push + S.lean * 0.1 + Math.sin(S.popT * Math.PI) * 0.02;
    portrait.style.transform = `translate(${(-S.lean * 6).toFixed(1)}px, ${(bob + S.lean * 12).toFixed(1)}px) scale(${sc.toFixed(3)})`;
    portrait.style.opacity = S.phase === 'story' ? '0' : '1';
  }

  /* ---------- drawing (series-player style glass UI over a film frame) ----------
   * Perf rule: no shadowBlur and no createXGradient inside the frame loop. Glows, the vignette,
   * the gauge frame and the hold button are baked once into offscreen canvases below. */
  const yOf = (h) => GAUGE.y + GAUGE.h * (1 - h);
  function bake(w, h, draw, scale) {
    const k = scale || 2, cv = document.createElement('canvas');
    cv.width = Math.ceil(w * k); cv.height = Math.ceil(h * k);
    const x = cv.getContext('2d'); x.scale(k, k); draw(x); return cv;
  }
  function radial(x, cx, cy, r0, r1, stops) {
    const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
    stops.forEach(([o, col]) => g.addColorStop(o, col)); return g;
  }
  const glowOf = (rgb) => bake(64, 64, (x) => { x.fillStyle = radial(x, 32, 32, 0, 32, [[0, `rgba(${rgb},.85)`], [0.4, `rgba(${rgb},.35)`], [1, `rgba(${rgb},0)`]]); x.fillRect(0, 0, 64, 64); });
  const GLOW = { pink: glowOf('244,166,198'), champ: glowOf('217,184,146'), cold: glowOf('159,180,224') };
  /* vignettes are baked at full strength and drawn with globalAlpha, so the beat pulse costs nothing */
  const vigOf = (rgb) => bake(W, H, (x) => { x.fillStyle = radial(x, W / 2, H * 0.44, 130, 470, [[0, `rgba(${rgb},0)`], [1, `rgba(${rgb},1)`]]); x.fillRect(0, 0, W, H); }, 0.5);
  const VIG = { zone: vigOf('11,10,15'), hot: vigOf('200,30,70'), cold: vigOf('40,60,110') };
  const GAUGE_FRAME = bake(GAUGE.w + 24, GAUGE.h + 92, (x) => {
    x.translate(12, 32);
    x.fillStyle = C.glass; Kit.draw.roundRect(x, -12, -32, GAUGE.w + 24, GAUGE.h + 92, 16); x.fill();
    x.lineWidth = 1; x.strokeStyle = C.edge; x.stroke();
    const g = x.createLinearGradient(0, 0, 0, GAUGE.h);
    g.addColorStop(0, 'rgba(255,107,142,.55)'); g.addColorStop(0.35, 'rgba(244,166,198,.35)'); g.addColorStop(1, 'rgba(159,180,224,.4)');
    x.fillStyle = g; Kit.draw.roundRect(x, 0, 0, GAUGE.w, GAUGE.h, GAUGE.w / 2); x.fill();
  });
  const METER = { w: 342, h: 8 };
  const METER_FILL = bake(METER.w, METER.h, (x) => {
    const g = x.createLinearGradient(0, 0, METER.w, 0); g.addColorStop(0, C.pink2); g.addColorStop(1, C.pink);
    x.fillStyle = g; x.fillRect(0, 0, METER.w, METER.h);
  });
  const buttonOf = (held) => bake(120, 120, (x) => {
    const r = held ? 27 : 31;
    x.drawImage(GLOW.pink, 60 - r * 1.9, 60 - r * 1.9, r * 3.8, r * 3.8);
    x.fillStyle = radial(x, 52, 50, 4, r + 8, [[0, held ? '#f9c6dc' : C.pink], [1, C.pink2]]);
    x.beginPath(); x.arc(60, 60, r, 0, Math.PI * 2); x.fill();
  });
  const BUTTON = { idle: buttonOf(false), held: buttonOf(true) };
  const glowAt = (c, img, x, y, r) => c.drawImage(img, x - r, y - r, r * 2, r * 2);

  function txt(c, s, x, y, size, weight, color, align, fam) {
    c.font = (fam === 'italic' ? 'italic ' + Kit.font(weight || 500, size, 'serif') : Kit.font(weight || 600, size, fam || 'sans')); c.textAlign = align || 'left';
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillText(s, x, y + 1.5);   // offset dark copy instead of shadowBlur
    c.fillStyle = color; c.fillText(s, x, y);
  }
  function glass(c, x, y, w, h, r, fill, stroke) {
    c.fillStyle = fill || C.glass; Kit.draw.roundRect(c, x, y, w, h, r); c.fill();
    c.lineWidth = 1; c.strokeStyle = stroke || C.edge; c.stroke();
  }
  function wrap(c, text, maxW) {
    const tokens = text.match(/[A-Za-z0-9'".,!?;:()\-—…#]+\s*|\s+|./g) || [];
    const out = []; let line = '';
    tokens.forEach((tk) => {
      if (c.measureText(line + tk).width > maxW && line) { out.push(line.trimEnd()); line = tk.trimStart(); } else line += tk;
    });
    if (line) out.push(line);
    return out;
  }

  function drawVignette(c) {
    const st = R.state, p = S.pulse;
    c.globalAlpha = Math.min(1, (st === 'zone' ? 0.55 : 0.7) + p * (st === 'hot' ? 0.25 : 0.08));
    c.drawImage(VIG[st] || VIG.zone, 0, 0, W, H);
    c.globalAlpha = 1;
    if (st === 'hot') { c.fillStyle = `rgba(255,70,110,${(0.08 * p + R.hiT * 0.07).toFixed(3)})`; c.fillRect(0, 0, W, H); }
  }

  function drawGauge(c) {
    const g = GAUGE, inZone = R.state === 'zone';
    c.drawImage(GAUGE_FRAME, g.x - 12, g.y - 32, g.w + 24, g.h + 92);
    const zt = yOf(R.zoneC + R.zoneW / 2), zb = yOf(R.zoneC - R.zoneW / 2);
    if (inZone) {   // baked glow stretched over the band, breathing with the beat
      c.globalAlpha = 0.55 + S.pulse * 0.35;
      c.drawImage(GLOW.pink, g.x - 22, zt - 18, g.w + 44, zb - zt + 36);
      c.globalAlpha = 1;
    }
    c.fillStyle = inZone ? 'rgba(244,166,198,.6)' : 'rgba(244,166,198,.3)';
    Kit.draw.roundRect(c, g.x - 3, zt, g.w + 6, zb - zt, 9); c.fill();
    c.lineWidth = 1.5; c.strokeStyle = inZone ? C.champ : 'rgba(246,239,233,.4)';
    Kit.draw.roundRect(c, g.x - 3, zt, g.w + 6, zb - zt, 9); c.stroke();
    glass(c, g.x + g.w + 14, (zt + zb) / 2 - 11, 74, 22, 11, inZone ? 'rgba(232,137,176,.85)' : C.glass);
    txt(c, tr('sweet spot', '心动区'), g.x + g.w + 51, (zt + zb) / 2 + 4.5, 11, 700, C.cream, 'center');
    txt(c, tr('FLUSTERED', '慌乱'), g.x + g.w / 2, g.y - 13, 9, 800, C.pink, 'center');
    txt(c, tr('COLD', '冷淡'), g.x + g.w / 2, g.y + g.h + 20, 9, 800, C.cold, 'center');
    const y = yOf(R.h);
    R.pending.forEach((p) => {   // telegraph: ghost arrow showing where the line will push you
      const k = clamp(1 - (p.at - R.gt) / TELEGRAPH, 0, 1), ty = yOf(clamp(R.h + p.kick, 0, 1));
      const col = p.kick > 0 ? '244,166,198' : '159,180,224', ax = g.x + g.w + 6;
      c.strokeStyle = `rgba(${col},${(0.5 + 0.5 * Math.sin(S.t * 30)).toFixed(2)})`; c.lineWidth = 3; c.lineCap = 'round';
      c.setLineDash([4, 5]); c.beginPath(); c.moveTo(ax, y); c.lineTo(ax, lerp(y, ty, 0.4 + 0.6 * k)); c.stroke(); c.setLineDash([]);
      const dir = p.kick > 0 ? -1 : 1;
      c.fillStyle = `rgba(${col},.95)`; c.beginPath(); c.moveTo(ax, ty); c.lineTo(ax - 6, ty - dir * 8); c.lineTo(ax + 6, ty - dir * 8); c.fill();
    });
    const s = 28 * (1 + S.pulse * 0.28) * (R.state === 'hot' ? 1.08 : 1);
    const jx = R.state === 'hot' ? Kit.rand(-1.5, 1.5) : 0;
    glowAt(c, R.state === 'cold' ? GLOW.cold : GLOW.pink, g.x + g.w / 2 + jx, y, s * 1.1);
    c.fillStyle = R.state === 'cold' ? C.cold : R.state === 'hot' ? C.hot : C.pink;
    Kit.draw.heart(c, g.x + g.w / 2 + jx, y - s / 2, s); c.fill();
    txt(c, `${Math.round(R.bpm)}`, g.x + g.w / 2, g.y + g.h + 41, 15, 800, C.cream, 'center');
    txt(c, tr('BPM', '次/分'), g.x + g.w / 2, g.y + g.h + 53, 9, 700, 'rgba(246,239,233,.6)', 'center');
  }

  function drawHud(c) {
    const cfg = R.cfg, top = 78;   // kit top bar owns y 0-70
    glass(c, 12, top, 366, 46, 15);
    const bx = 24, by = top + 29, bw = METER.w, bh = METER.h, f = clamp(R.disp / 100, 0, 1);
    c.fillStyle = 'rgba(255,255,255,.12)'; Kit.draw.roundRect(c, bx, by, bw, bh, 4); c.fill();
    if (f > 0.01) {   // baked gradient, clipped to the rounded fill shape
      const fw = Math.max(bh, bw * f);
      c.save(); Kit.draw.roundRect(c, bx, by, fw, bh, 4); c.clip();
      c.drawImage(METER_FILL, bx, by, bw, bh); c.restore();
    }
    const tx = bx + bw * cfg.target / 100;
    c.fillStyle = C.champ; c.fillRect(tx - 1, by - 4, 2, bh + 8);
    const reached = R.meter >= cfg.target;
    txt(c, tr('Heart', '心动值'), 24, top + 20, 14, 800, C.cream);
    txt(c, reached ? tr('target reached ✓', '已达标 ✓') : tr(`${Math.ceil(cfg.target - R.meter)} to go`, `还差 ${Math.ceil(cfg.target - R.meter)}`), isZh() ? 80 : 70, top + 20, 12, 600, reached ? C.champ : C.pink);
    txt(c, `${Math.floor(R.disp)} / ${cfg.target}`, 366, top + 20, 14, 800, C.cream, 'right');
    const row = top + 68;
    const rem = Math.max(0, Math.ceil(cfg.duration - R.gt)), urgent = rem <= 10 && S.phase === 'play';
    c.save(); c.translate(46, row); const ts = 1 + R.timerPop * 0.18; c.scale(ts, ts);
    glass(c, -34, -14, 68, 28, 14, urgent ? 'rgba(200,40,80,.85)' : C.glass);
    txt(c, `0:${String(rem).padStart(2, '0')}`, 0, 5, 14, 800, C.cream, 'center'); c.restore();
    if (R.combo >= 2) {
      c.save(); c.translate(132, row); const cs = 1 + R.comboPop * 0.25; c.scale(cs, cs);
      glass(c, -44, -14, 88, 28, 14, 'rgba(232,137,176,.8)', 'rgba(255,255,255,.25)');
      txt(c, tr(`Combo ×${R.combo}`, `连击 ×${R.combo}`), 0, 5, 13, 800, '#fff', 'center'); c.restore();
    }
    if (S.phase === 'play') {   // state chip: always tells you which way to correct
      const map = {
        zone: [tr('♥ Sweet spot', '♥ 心动区'), 'rgba(232,137,176,.85)'], hot: [tr('Flustered! Breathe', '慌了！深呼吸'), 'rgba(200,40,80,.85)'],
        cold: [tr('Too cold. Let go', '太冷淡了，松手'), 'rgba(70,90,150,.85)'], qte: [tr('He leans in...', '他靠近了……'), 'rgba(217,184,146,.85)'],
      };
      const [label, col] = map[R.qte ? 'qte' : R.state];
      c.font = Kit.font(700, 13);
      const w = c.measureText(label).width + 28;
      glass(c, 378 - w, row - 14, w, 28, 14, col, 'rgba(255,255,255,.22)'); txt(c, label, 378 - w / 2, row + 5, 13, 700, '#fff', 'center');
    }
    if (cfg.booster) { glass(c, 270, row + 22, 108, 24, 12, 'rgba(217,184,146,.85)'); txt(c, '✦ ' + tr(BOOSTER_NAME[cfg.booster][0], BOOSTER_NAME[cfg.booster][1]), 324, row + 38, 12, 800, C.ink, 'center'); }
  }

  /* glass dialogue box (series-player style): script name tag overlapping the top edge, English main, Chinese subtitle */
  function drawBox(c, b, box, name, nameColor, dur) {
    const appear = clamp(b.t / 0.22, 0, 1), fade = b.t > dur ? 1 - (b.t - dur) / 0.3 : 1;
    if (fade <= 0) return;
    const x = box.x, w = box.w, typed = Math.floor(b.t * 45) + 1;
    const line = tr(b.text, b.zh);
    c.font = Kit.font(600, 15); const lines = wrap(c, line, w - 36);
    const hgt = 30 + lines.length * 21 + (b.kick ? 24 : 0);
    const y = box.maxBottom ? Math.min(box.y, box.maxBottom - hgt) : box.y;   // grow upward, never into the hold prompt
    c.save(); c.globalAlpha = clamp(fade, 0, 1) * appear; c.translate(0, (1 - easeOutBack(appear)) * 14);
    c.fillStyle = 'rgba(0,0,0,.28)'; Kit.draw.roundRect(c, x + 2, y + 6, w, hgt, 16); c.fill();   // cheap drop shadow
    c.fillStyle = C.glass; Kit.draw.roundRect(c, x, y, w, hgt, 16); c.fill();
    c.lineWidth = 1; c.strokeStyle = C.edge; c.stroke();
    if (isZh()) txt(c, name, x + 18, y + 2, 17, 600, nameColor, 'left', 'serif');   // the script face has no CJK glyphs
    else txt(c, name, x + 18, y + 6, 28, 400, nameColor, 'left', 'script');
    let ty = y + 32, left = typed;
    lines.forEach((ln) => { txt(c, ln.slice(0, Math.max(0, left)), x + 18, ty, 15, 600, C.cream); left -= ln.length; ty += 21; });
    if (b.kick) {   // telegraph chip: what this line is about to do to your heart
      const k = clamp(b.t / TELEGRAPH, 0, 1), up = b.kick > 0, cy = y + hgt - 26;
      glass(c, x + 18, cy, 150, 18, 9, up ? 'rgba(232,137,176,.85)' : 'rgba(111,134,190,.85)', 'rgba(255,255,255,.2)');
      txt(c, up ? tr('♥ here it comes ↑', '♥ 要心动了 ↑') : tr('awkward silence ↓', '冷场了 ↓'), x + 93, cy + 13, 10.5, 800, '#fff', 'center');
      if (k < 1) { c.fillStyle = 'rgba(246,239,233,.7)'; c.fillRect(x + 176, cy + 8, 70 * (1 - k), 2); }
    }
    c.restore();
  }

  function drawQte(c, under) {
    const q = R.qte; if (!q) return;
    if (under) {   // dim the frame so the lean-in reads as a moment
      const k = q.stage === 'lean' ? q.t / QTE_LEAN : q.stage === 'ring' ? 1 : 1 - q.t / 0.55;
      c.fillStyle = `rgba(11,10,15,${(0.45 * clamp(k, 0, 1)).toFixed(3)})`; c.fillRect(0, 0, W, H); return;
    }
    const { x, y } = FACE;
    if (q.stage === 'ring') {
      const over = q.t - QTE_RING;
      const r = over <= 0 ? lerp(150, 46, q.t / QTE_RING) : Math.max(8, 46 - over * (104 / QTE_RING));
      const hot = Math.abs(over * 1000) <= R.cfg.qteWindow;
      c.save(); c.setLineDash([3, 6]); c.lineWidth = 2; c.strokeStyle = 'rgba(217,184,146,.9)';
      c.beginPath(); c.arc(x, y, 46, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      const ringCol = hot ? '217,184,146' : '244,166,198';
      c.lineWidth = 14; c.strokeStyle = `rgba(${ringCol},.18)`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();   // soft halo pass
      c.lineWidth = 5; c.strokeStyle = `rgb(${ringCol})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); c.restore();
      const hs = 24 + Math.sin(S.t * 14) * 3;
      glowAt(c, GLOW.pink, x, y, hs * 1.3);
      c.fillStyle = 'rgba(244,166,198,.92)'; Kit.draw.heart(c, x, y - hs / 2, hs); c.fill();
      txt(c, tr('Tap as the ring lands', '圆环合上时点击'), x, y + 86, 17, 800, '#fff', 'center');
    } else if (q.stage === 'lean') {
      txt(c, tr('He leans in...', '他靠近了……'), x, y + 86, 18, 400, `rgba(246,239,233,${clamp(q.t / QTE_LEAN, 0, 1).toFixed(2)})`, 'center', 'italic');
    } else if (q.grade !== 'miss') {
      const k = q.t / 0.55;
      c.strokeStyle = `rgba(${q.grade === 'perfect' ? '217,184,146' : '244,166,198'},${(1 - k).toFixed(2)})`;
      c.lineWidth = 5 * (1 - k) + 1; c.beginPath(); c.arc(x, y, 46 + k * 160, 0, Math.PI * 2); c.stroke();
    }
  }

  /* series-player style diegetic control: big pink ring button + bold white instruction */
  function drawBottom(c) {
    const held = S.held && !S.holdBlocked, px = W / 2, py = 718;
    txt(c, held ? tr('Breathing in...', '吸气……') : tr('Hold to breathe', '按住，深呼吸'), px, 668, 19, 800, '#fff', 'center');
    const ringK = (S.t * (held ? 1.4 : 0.6)) % 1;
    c.strokeStyle = `rgba(244,166,198,${(0.55 * (1 - ringK)).toFixed(2)})`; c.lineWidth = 2;
    c.beginPath(); c.arc(px, py, 40 + ringK * 22, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(244,166,198,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 40, 0, Math.PI * 2); c.stroke();
    c.drawImage(held ? BUTTON.held : BUTTON.idle, px - 60, py - 60, 120, 120);
    if (R.notif) {
      const n = R.notif, k = easeOutBack(clamp(n.t / 0.3, 0, 1)), out = n.t > 2 ? (n.t - 2) / 0.4 : 0;
      const sx = lerp(-150, 12, k) - out * 170, wig = n.t < 0.6 ? Math.sin(n.t * 60) * 3 : 0;
      c.save(); c.translate(sx + wig, 690);
      glass(c, 0, 0, 132, 54, 14);
      txt(c, tr('📱 Going viral', '📱 正在疯传'), 10, 21, 11.5, 800, C.pink); txt(c, tr(n.tag[0], n.tag[1]), 10, 41, 10.5, 700, C.cream);
      c.restore();
    }
  }

  function drawBanners(c) {
    R.banners.forEach((b) => {
      const k = easeOutBack(clamp(b.t / 0.35, 0, 1)), a = b.t > 1.4 ? 1 - (b.t - 1.4) / 0.4 : 1;
      c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate(W / 2 + 18, 258); c.scale(k, k);
      glass(c, -128, -26, 256, 52, 16);
      txt(c, tr(b.text, b.zh), 0, 6, 17, 800, b.color, 'center');
      c.restore();
    });
  }

  function render() {
    const cam = Math.sin(S.t * 0.12) * 10 - S.lean * 6;
    bg.clear(); Art.drawBack(bg.ctx, S.t, cam);
    fg.clear(); const c = fg.ctx;
    Art.drawFront(c, S.t);
    if (R && S.phase !== 'story') {
      drawVignette(c);
      drawQte(c, true);
      drawGauge(c);
      if (R.meBubble) drawBox(c, R.meBubble, ME_BOX, tr('You', '你'), C.champ, 1.8);
      if (R.bubble) drawBox(c, R.bubble, BOX, tr('Jace', '杰斯'), C.pink, R.bubble.dur);
      drawQte(c, false);
      drawHud(c);
      drawBottom(c);
      drawBanners(c);
    }
    fx.draw(c);
    if (R && R.flash > 0) { c.fillStyle = `rgba(${R.flashCol},${(R.flash * 0.55).toFixed(3)})`; c.fillRect(0, 0, W, H); }
  }

  Kit.loop((dt) => {
    if (S.phase === 'play' && R) step(dt);
    updateFx(dt);
    render();
  });

  /* ---------- flow ---------- */
  const DLG_BG = 'linear-gradient(180deg, rgba(11,10,15,.15) 0%, rgba(42,22,38,.45) 55%, rgba(11,10,15,.9) 100%)';

  function introLines() {
    return [
      { who: 'narr', text: 'Midnight. A hotel rooftop above LA. String lights, city glow, and the after-party thumping three floors down.', zh: '午夜，洛杉矶一家酒店的天台。串灯、城市的光，还有三层楼下咚咚作响的派对。' },
      CH1[ch1State].line,
      { who: 'luyu', mood: 'surprised', extra: { cap: true }, text: 'Sorry, sorry. Viv had me doing selfies with half the label.', zh: '抱歉抱歉。薇薇安拉着我跟半个唱片公司合影。' },
      { who: 'luyu', mood: 'normal', extra: { cap: true }, text: 'Took the fire stairs. Twelve floors. Worth it.', zh: '我走的消防楼梯。十二层。值了。' },
      { who: 'me', mood: 'normal', text: "(He's out of breath, still in his stage jacket. You say...)", zh: '（他还喘着气，身上还是演出穿的那件外套。你说——）',
        choices: [
          { text: '"Relax. I just got here too."', zh: '「放轻松，我也刚到。」', sub: tr('Easygoing: sweet spot +15%', '随和：心动区 +15%'), value: 'gentle' },
          { text: '"Twelve minutes late. Very rock star of you."', zh: '「迟到十二分钟。真有摇滚明星的派头。」', sub: tr('Tease: start at 10 Heart, but his lines hit 1.25× harder', '逗他：心动值 10 起步，但他的话波动 ×1.25'), value: 'tease' },
        ] },
      { who: 'luyu', mood: 'smile', text: 'There she is. God, I missed you.', zh: '就是这个你。天哪，我好想你。' },
      { who: 'luyu', mood: 'smile', text: "No cameras up here. No Sienna. Just you and me.", zh: '这里没有镜头，没有西耶娜。只有你和我。' },
      { who: 'narr', text: "He sits close enough that you can hear your own heartbeat. Don't let it show. Not too fast. Not too cold.", zh: '他坐得很近，近到你能听见自己的心跳。别让他看出来。别跳太快，也别冷下去。' },
    ];
  }

  function endingLines(success) {
    const go = { who: 'narr', text: "Tomorrow is the Crown Music Awards. And you're dressing him.", zh: '明天是皇冠音乐奖。他的造型，由你负责。',
      choices: [{ text: 'Episode 3: Red Carpet Reveal ›', zh: '第三章：红毯亮相 ›', value: 'next' }, { text: 'Replay this episode', zh: '重玩本章', value: 'replay' }] };
    if (success) {
      return [
        { who: 'narr', text: 'Down on the street the city keeps flashing. Up here, it goes quiet.', zh: '楼下的城市还在闪。天台上却安静了下来。' },
        { who: 'luyu', mood: 'blush', text: "The Sienna thing? It's a contract. Viv's idea. It ends after the launch.", zh: '西耶娜那件事？是合约。薇薇安安排的。专辑发布一结束就到期。' },
        { who: 'luyu', mood: 'smile', text: 'It was always you. Since the night you lent me your guitar pick.', zh: '一直都是你。从你借我拨片的那晚开始。' },
        { who: 'me', mood: 'smile', text: 'Then stop talking, Monroe.', zh: '那就别说了，门罗。' },
        { who: 'narr', text: 'He leans in. The string lights blur.', zh: '他低下头。串灯的光晕成一片。' },
        go,
      ];
    }
    return [
      { who: 'luyu', mood: 'normal', text: "Listen. About Sienna. It's not what you think, it's—", zh: '听我说。西耶娜的事，不是你想的那样，其实——' },
      { who: 'narr', text: 'His phone lights up. VIV.', zh: '他的手机亮了。薇薇安。' },
      { who: 'tang', mood: 'angry', name: tr('Viv (phone)', '薇薇安（电话）'), text: "Jace. Lobby. Sienna's here, the photographers are here. Two minutes.", zh: '杰斯。大堂。西耶娜到了，摄影师也到了。给你两分钟。' },
      { who: 'luyu', mood: 'sad', text: "...Hold onto this for me? I'll finish that sentence. I swear.", zh: '……帮我拿着这个？那句话我一定说完。我发誓。' },
      { who: 'narr', text: 'He leaves his leather jacket around your shoulders. It still smells like him.', zh: '他把皮夹克披在你肩上。上面还有他的味道。' },
      go,
    ];
  }

  async function playRound(booster, attempt) {
    S.phase = 'ready'; S.held = false; S.holdBlocked = false;
    R = newRound(makeConfig(booster));
    setMood('normal');
    Kit.track('play_start', Object.assign({ attempt, choice: S.choice, ch1: ch1State }, R.cfg));
    if (booster) {
      Kit.track('booster_applied', { booster });
      banner(booster === 'breath' ? '✦ Deep Breath: wider sweet spot' : '✦ Leather Jacket: a calmer heart',
        booster === 'breath' ? '✦ 深呼吸：心动区更宽' : '✦ 皮夹克：心跳更稳', C.champ);
    }
    await Kit.wait(500);
    S.phase = 'countdown';
    await Kit.countdown(3);
    return new Promise((resolve) => { R.onEnd = resolve; S.phase = 'play'; });
  }

  function resultOpts(o) {
    const stars = o.success ? 1 + (o.meter >= Math.min(100, o.target + 15) ? 1 : 0) + (o.perfects >= 2 && o.blurts === 0 ? 1 : 0) : 0;
    const c = CHOICE[S.choice];
    Kit.story.set('ch2', { success: o.success, score: o.meter, target: o.target, stars, choice: S.choice, perfects: o.perfects, booster: o.booster });
    return {
      success: o.success, stars,
      title: o.success ? 'It Was Always You' : 'Saved by the Publicist',
      zh: o.success ? '一直都是你' : '被公关打断',
      stats: [   // labels and text values are 'English · 中文' and go through Kit.loc
        { label: 'Heart / target · 心动值 / 目标', value: `${o.meter} / ${o.target}`, key: 'score', raw: o.meter },
        { label: 'In the sweet spot · 心动区停留', value: `${o.zonePct}%`, key: 'zonePct', raw: o.zonePct },
        { label: 'Lean-in perfects · 靠近时刻完美', value: `${o.perfects} / ${o.qteTotal}`, key: 'perfects', raw: o.perfects },
        { label: 'Best combo · 最高连击', value: `×${o.maxCombo}`, key: 'maxCombo', raw: o.maxCombo },
        { label: `You said ${c.short} · 开场${c.shortZh}`, value: `${c.desc} · ${c.descZh}`, key: 'choice', raw: S.choice },
        { label: 'Episode 1 · 上一章', value: `${CH1[ch1State].short} · ${CH1[ch1State].shortZh}`, key: 'ch1', raw: ch1State },
      ],
      branch: o.success
        ? { title: 'It Was Always You · 第二章「一直都是你」', text: 'He tells you the Sienna thing is just a contract. Then the string lights blur.', zh: '他说西耶娜的事只是一纸合约。然后，串灯的光晕成了一片。' }
        : { title: 'Saved by the Publicist · 第二章「被公关打断」', text: 'Viv calls him down for a Sienna photo-op mid-sentence. His leather jacket stays with you. The story goes on.', zh: '话说到一半，薇薇安叫他下楼和西耶娜摆拍。他的皮夹克留在了你身上。故事照样继续。' },
      boosters: BOOSTERS,
    };
  }

  async function main() {
    Kit.resetRetries();
    S.phase = 'story';
    const intro = await Kit.dialogue(introLines(), { bg: DLG_BG, caption: tr("EPISODE 2: DON'T LET IT SHOW", '第二章：别让他看出来') });
    S.choice = intro.choices[0] === 'tease' ? 'tease' : 'gentle';
    const v = Kit.tuning.values, c = CHOICE[S.choice];
    R = newRound(makeConfig(null)); S.phase = 'ready';
    await Kit.tutorial({
      chapter: 'Episode 2: Mini-game', chapterZh: '第二章：小游戏', title: "Don't Let It Show", zh: '别让他看出来',
      goal: `Reach ${v.target} Heart in ${v.duration} seconds`, goalZh: `${v.duration} 秒内心动值达到 ${v.target}`,
      items: [
        { icon: '🫁', text: 'Hold the screen (or Space) to breathe and your heart sinks. Let go and it rises.', zh: '按住屏幕或空格深呼吸，心跳下沉；松开，它自己往上跳' },
        { icon: '💬', text: 'His lines warn you first: <b>spike ↑</b> or <b>silence ↓</b>. Get ready.', zh: '他说话时会预告：心跳要飙，还是冷场' },
        { icon: '💞', text: 'When he leans in, tap as the ring lands for a Perfect.', zh: '他靠近时圆环收缩，合上的瞬间点击，完美判定加心动值' },
      ],
      modifier: `${CH1[ch1State].mod}<br>You said ${c.short}: ${c.desc}.`,
      modifierZh: `${CH1[ch1State].modZh}<br>开场你说了${c.shortZh}：${c.descZh}。`,
      start: 'Start', startZh: '开始',
    });
    let booster = null, attempt = 0, out = null;
    for (;;) {
      attempt++;
      out = await playRound(booster, attempt);
      const res = await Kit.result(resultOpts(out));
      if (res.action === 'continue') break;
      booster = res.via === 'iap' ? res.booster : null;
    }
    S.phase = 'story';
    const end = await Kit.dialogue(endingLines(out.success), { bg: DLG_BG, caption: out.success ? tr('IT WAS ALWAYS YOU', '一直都是你') : tr('SAVED BY THE PUBLICIST', '被公关打断') });
    if (end.choices[0] === 'replay') { Kit.track('chapter_replay', {}); location.reload(); return; }
    Kit.track('next_chapter', { to: 'ch3' });
    location.href = NEXT_URL;
  }

  main();
})();
