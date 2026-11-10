/* Episode 3 · Red Carpet Reveal (The Crown Music Awards)
 * Timed dress-up: match the event brief's tags, avoid clashing tags, then a
 * flash-moment reveal with fan live-chat generated from the actual outfit.
 * One language at a time (Kit.lang): every string goes through tr(en, zh).
 * Depends on: kit.js, data.js (Ch3Data), score.js (Ch3Score), art.js (Ch3Art), reveal.js (Ch3Reveal). */
(function () {
  'use strict';
  const D = window.Ch3Data, A = window.Ch3Art, Sc = window.Ch3Score;
  const KEYS = Sc.KEYS;
  const CHAR = { left: 52, top: 204, w: 171, h: 310 };
  const BOOST_TIME = 15;      // "+15 seconds" booster
  const WARN_AT = 10;         // last-10-seconds pressure
  const COACH_WINDOW = 10;    // first 10s: Jace nudges you toward a useful tab
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const isZh = () => !!(Kit.lang && Kit.lang() === 'zh');
  const tr = (en, zh) => (Kit.tr ? Kit.tr(en, zh) : (isZh() ? zh : en));
  const tagName = (t) => (t === '情侣' ? tr('♥ Yours', '♥ 你的') : tr(D.TAG_EN[t], t));
  const itemName = (it) => tr(it.en, it.name);
  const slotName = (s) => tr(s.en, s.name);
  const gem = (n) => `💎 ${n}`;

  const ui = Kit.mount({ id: 'ch3-redcarpet', title: 'Red Carpet Reveal · 红毯亮相', episode: 'Episode 3 · Red Carpet Reveal' });
  Kit.resetRetries();

  /* ---------- state ---------- */
  const S = {
    phase: 'intro', cfg: null, brief: null, tags: [], couple: false, lowkey: false, choice: null, hintTag: null,
    outfit: { hair: 0, top: 0, outer: 0, acc: 0, pal: 0 }, lastFree: {}, owned: new Set(), tab: 0, focus: 0, time: 0, timeMax: 0, paused: false,
    booster: null, best: 1, thr: [1, 1, 1], attempt: 0, lastTick: -1, equips: 0, coachSlot: null,
    lastTrialSlot: null, bubbleT: 0, bubble: null, shownSec: -1, coupleSeen: false, elapsed: 0,
  };

  /* ---------- tuning (labels 'English · 中文', localised by the kit) ---------- */
  const SCHEMA = [
    { key: 'timeLimit', label: 'Time limit · 限时', min: 25, max: 75, step: 5, value: 45, fmt: (v) => v + 's', hint: 'Shorter means more pressure; 60s gives new players room to read tags. · 越短越紧张；新手给 60 秒读标签。' },
    { key: 'tagsPerBrief', label: 'Brief keywords · 简报关键词数', min: 2, max: 4, step: 1, value: 3, hint: 'More keywords to juggle, more clash risk. · 关键词越多越难兼顾，冲突也越多。' },
    { key: 'matchPts', label: 'Match points · 命中分', min: 4, max: 20, step: 1, value: 10, hint: 'Points for a keyword\'s first hit; repeat hits score 40%. · 关键词首次命中得分，重复命中按 40%。' },
    { key: 'clashPen', label: 'Clash penalty · 冲突扣分', min: 0, max: 20, step: 1, value: 8, hint: 'Cost of an opposite tag (Gentle vs Cool and so on); 0 means no punishment. · 相冲标签扣分，0 为不惩罚。' },
    { key: 'passPct', label: 'Two-star line · 成功线', min: 40, max: 90, step: 5, value: 65, fmt: (v) => v + '%', hint: 'Percent of the best free-only outfit needed to succeed; one star is half of it. · 占免费最优搭配的百分比，一星是它的一半。' },
    { key: 'star3Pct', label: 'Three-star line · 三星线', min: 70, max: 100, step: 2, value: 90, fmt: (v) => v + '%', hint: 'Never above 100% of the best free outfit, so three stars never need money. · 不超过免费最优，三星永远不用付费。' },
    { key: 'premiumCount', label: 'Premium pieces · 付费单品数', min: 0, max: 5, step: 1, value: 3, hint: 'Pieces that are free to try on and count once unlocked. · 可免费试穿、解锁后计分的单品数。' },
    { key: 'hintMode', label: 'Tag hints · 标签提示', min: 0, max: 2, step: 1, value: 1, fmt: (v) => [tr('Off', '关'), tr('Clashes', '标冲突'), tr('All', '全部')][v], hint: 'Off, mark clashing chips, or also light up matching chips. · 关闭、标出冲突、或连命中一起高亮。' },
    { key: 'coupleBonus', label: 'Hidden request bonus · 隐藏需求加分', min: 0, max: 30, step: 2, value: 16, hint: 'Episode 2 truth branch: bonus for the guitar-pick necklace. · 第二章说出真相线：拨片项链加分。' },
    { key: 'lowkeyPenalty', label: 'Low-key penalty · 低调扣分', min: 0, max: 20, step: 2, value: 10, hint: 'Episode 2 interrupted branch: extra cost per Sparkle tag ("don\'t upstage Sienna"). · 第二章被打断线：每个闪耀标签额外扣分（别抢西耶娜风头）。' },
    { key: 'intuitionSec', label: 'Instinct bonus · 直觉加时', min: 0, max: 15, step: 1, value: 8, fmt: (v) => v + 's', hint: 'Extra time for choosing "trust my instinct" in the opening. · 开场选「相信直觉」的加时。' },
  ];
  const PRESET_VALUES = [
    [['Story opening (new players)', '剧情开头（新手）'], { timeLimit: 60, tagsPerBrief: 2, matchPts: 12, clashPen: 5, passPct: 55, star3Pct: 86, premiumCount: 2, hintMode: 2, coupleBonus: 16, lowkeyPenalty: 6, intuitionSec: 10 }],
    [['Standard', '标准'], SCHEMA.reduce((a, s) => (a[s.key] = s.value, a), {})],
    [['Mid-to-late story', '剧情中后期'], { timeLimit: 35, tagsPerBrief: 4, matchPts: 10, clashPen: 12, passPct: 72, star3Pct: 94, premiumCount: 4, hintMode: 0, coupleBonus: 16, lowkeyPenalty: 14, intuitionSec: 6 }],
  ];
  function defineTuning() {
    const presets = {};
    PRESET_VALUES.forEach(([n, v]) => { presets[tr(n[0], n[1])] = v; });
    Kit.tuning.define(SCHEMA, {
      presets,
      note: tr('Changes apply from the next round. Star lines are a percentage of the best outfit made only of free pieces.', '改完下一局生效。星级线按「只用免费单品的最优搭配」计算。'),
      onChange: () => { if (S.phase === 'play') Kit.toast(tr('Applies next round', '下一局生效')); },
    });
  }
  defineTuning();

  /* ---------- layers: bg canvas → character → fx canvas → HUD ---------- */
  const bg = Kit.canvas();
  const charEl = document.createElement('div'); charEl.className = 'c3-char'; ui.game.appendChild(charEl);
  const fx = Kit.canvas(); fx.cv.style.pointerEvents = 'none';
  const parts = Kit.particles();
  const scenery = window.Ch3Reveal.backstage();
  const BOKEH_SPRITES = ['244,166,198', '255,220,170'].map((rgb) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  });
  const bokeh = Array.from({ length: 16 }, () => ({ x: Kit.rand(0, 390), y: Kit.rand(80, 520), r: Kit.rand(6, 22), v: Kit.rand(4, 12), a: Kit.rand(0.05, 0.18), s: BOKEH_SPRITES[Math.random() < 0.5 ? 0 : 1] }));

  const hud = Kit.el(`<div id="c3" class="off">
    <div class="c3-brief c3-glass c3-shadow"><div class="h"></div><div class="n"></div><div class="bchips"></div></div>
    <div class="c3-timer c3-glass c3-shadow"><i></i><span>45</span></div>
    <div class="c3-meter c3-glass c3-shadow"><div class="sc"></div><div class="bar"><div class="ghost"></div><div class="fill"></div></div><div class="need"></div></div>
    <div class="c3-trial c3-glass"><div class="tx"></div><button class="c3-gold" data-a="unlock"></button></div>
    <div class="c3-bubble c3-glass"><span class="who"></span><span class="line"></span></div>
    <button class="c3-done c3-gold" data-a="done"></button>
    <div class="c3-panel"><div class="c3-tabs"></div><div class="c3-grid"></div></div>
  </div>`);
  ui.hud.appendChild(hud);
  const $ = (sel) => hud.querySelector(sel);
  const el = { head: $('.c3-brief .h'), brief: $('.c3-brief .n'), bchips: $('.bchips'), timer: $('.c3-timer'), timerTx: $('.c3-timer span'), sc: $('.c3-meter .sc'),
    fill: $('.c3-meter .fill'), ghost: $('.c3-meter .ghost'), bar: $('.c3-meter .bar'), need: $('.c3-meter .need'), trial: $('.c3-trial'),
    trialTx: $('.c3-trial .tx'), trialBtn: $('.c3-trial button'), bubble: $('.c3-bubble'), who: $('.c3-bubble .who'), line: $('.c3-bubble .line'),
    done: $('.c3-done'), tabs: $('.c3-tabs'), grid: $('.c3-grid') };
  el.done.onclick = () => finish('done');
  el.trialBtn.onclick = () => unlock();
  const stars = [0, 1, 2].map(() => { const s = document.createElement('span'); s.className = 'st'; s.textContent = '★'; el.bar.appendChild(s); return s; });
  function renderStatic() {
    el.head.textContent = tr('Crown Music Awards · look theme', '皇冠音乐奖 · 造型主题');
    el.who.textContent = tr('Jace', '杰斯');
    el.done.innerHTML = Kit.esc(tr('Finish look ›', '完成造型 ›'));
  }

  /* ---------- scoring (rules live in score.js) ---------- */
  const itemOf = (slot, i) => D.ITEMS[slot][i];
  const ctx = () => ({ tags: S.tags, M: S.cfg.matchPts, P: S.cfg.clashPen, coupleBonus: S.cfg.coupleBonus, lowkeyPenalty: S.cfg.lowkeyPenalty,
    couple: S.couple, lowkey: S.lowkey, premiumCount: S.cfg.premiumCount });
  const isPremium = (it) => Sc.isPremium(it, ctx());
  const locked = (it) => isPremium(it) && !S.owned.has(it.id);
  const ids = (o) => KEYS.reduce((a, k) => (a[k] = itemOf(k, o[k]).id, a), {});
  /* countTrial=false scores locked try-ons as the last free piece in that slot */
  const worn = (outfit, countTrial) => KEYS.map((k) => {
    const it = itemOf(k, outfit[k]);
    return { slot: k, item: !countTrial && locked(it) ? itemOf(k, S.lastFree[k]) : it };
  });
  const evaluate = (outfit, countTrial) => Sc.evaluate(worn(outfit, countTrial), ctx());
  const starsOf = (sc) => (sc >= S.thr[2] ? 3 : sc >= S.thr[1] ? 2 : sc >= S.thr[0] ? 1 : 0);

  /* ---------- rendering ---------- */
  function drawChar(fresh, mood) {
    charEl.innerHTML = A.render(ids(S.outfit), { fresh: fresh || [], mood });
    charEl.classList.remove('bounce', 'shake'); void charEl.offsetWidth;
  }
  function chipClass(t) {
    if (t === '情侣') return S.couple ? 'ours' : null;
    const all = S.cfg.hintMode >= 2 || S.booster === 'inspire';
    const clash = S.cfg.hintMode >= 1 || S.booster === 'inspire';
    if (S.tags.includes(t)) return all || t === S.hintTag ? 'match' : '';
    if (clash && (S.tags.includes(D.OPP[t]) || (S.lowkey && t === '闪耀'))) return 'clash';
    return '';
  }
  function renderTabs() {
    el.tabs.innerHTML = '';
    D.SLOTS.forEach((s, i) => {
      const b = Kit.el(`<button class="c3-tab${i === S.tab ? ' on' : ''}">${Kit.esc(slotName(s))}${S.coachSlot === s.key ? '<span class="dot"></span>' : ''}</button>`);
      b.onclick = () => setTab(i);
      el.tabs.appendChild(b);
    });
  }
  function renderGrid(popIdx) {
    const slot = KEYS[S.tab], pal = itemOf('pal', S.outfit.pal).id, cur = worn(S.outfit, true), c = ctx();
    el.grid.innerHTML = '';
    D.ITEMS[slot].forEach((it, i) => {
      const prem = isPremium(it), own = S.owned.has(it.id);
      /* premium cards show the tags they would actually score with in this outfit */
      const eff = prem ? Sc.effective(slot, it, cur, c) : { tags: it.tags, adapted: false };
      const chips = eff.tags.map((t) => { const k = chipClass(t); return k === null ? '' : `<span class="c3-chip ${k}">${Kit.esc(tagName(t))}</span>`; }).join('')
        + (eff.adapted ? `<span class="c3-chip adapt">${Kit.esc(tr('✦ Adapts', '✦ 自适应'))}</span>` : '');
      const cls = ['c3-card', S.outfit[slot] === i ? 'on' : '', S.focus === i ? 'focus' : '', prem ? 'prem' : '', popIdx === i ? 'pop' : ''].join(' ');
      const tip = eff.adapted ? tr(`Designer piece: never scores below a free ${D.SLOTS[S.tab].en.toLowerCase()}. For this brief it scores like ${eff.from.en}.`,
        `设计师单品：分数不会低于任何免费${D.SLOTS[S.tab].name}。这份简报下按「${eff.from.name}」计分。`) : itemName(it);
      const b = Kit.el(`<button class="${cls}" title="${Kit.esc(tip)}">
        ${prem ? `<span class="gem${own ? ' owned' : ''}">${own ? Kit.esc(tr('💎 Owned', '💎 已拥有')) : gem(D.PREMIUM_PRICE)}</span>` : ''}
        <div class="ic">${A.icon(slot, it.id, pal)}</div>
        <div class="nm">${Kit.esc(itemName(it))}</div>
        <div class="tg">${chips || `<span class="c3-chip">${Kit.esc(tr('Basic', '基础款'))}</span>`}</div></button>`);
      b.onclick = () => { S.focus = i; equip(S.tab, i); };
      el.grid.appendChild(b);
    });
  }
  function renderBrief(ev, popTags) {
    el.brief.textContent = tr(`Theme: ${S.brief.en}`, `主题：${S.brief.name}`);
    const chip = (cls, text) => `<span class="bchip ${cls}">${Kit.esc(text)}</span>`;
    let h = S.tags.map((t) => chip([ev.matched.has(t) ? 'ok' : '', t === S.hintTag ? 'hint' : '', popTags && popTags.includes(t) ? 'pop' : ''].join(' '), tagName(t))).join('');
    if (S.couple) h += ev.couple ? chip('secret ok' + (popTags && popTags.includes('情侣') ? ' pop' : ''), tr('Something of yours', '你的东西')) : chip('secret', tr('? His request', '？他的请求'));
    if (S.lowkey) h += chip('warn', ev.flashy ? tr(`Upstaging ✕${ev.flashy}`, `抢风头 ✕${ev.flashy}`) : tr('Don\'t upstage Sienna', '别抢西耶娜风头'));
    el.bchips.innerHTML = h;
  }
  function renderMeter(ev, preview) {
    const pct = (v) => `${Kit.clamp(v / S.best, 0, 1) * 100}%`;
    el.sc.innerHTML = `${ev.score}<small>${Kit.esc(tr('STYLE', '造型分'))}</small>`;
    el.fill.style.width = pct(ev.score);
    el.ghost.style.width = preview > ev.score ? pct(preview) : '0%';
    const st = starsOf(ev.score), gap = S.thr[Math.min(st, 2)] - ev.score;
    stars.forEach((s, k) => { s.style.left = pct(S.thr[k]); s.classList.toggle('on', st > k); });
    el.need.innerHTML = st >= 3 ? `<b>★★★</b> ${Kit.esc(tr('Perfect', '满分'))}`
      : tr(`<b>${gap}</b> to ${'★'.repeat(st + 1)}`, `还差 <b>${gap}</b> 分到 ${'★'.repeat(st + 1)}`);
    el.done.classList.toggle('ready', st >= 2);
  }
  function renderTrial() {
    const slots = KEYS.filter((k) => locked(itemOf(k, S.outfit[k])));
    const slot = slots.includes(S.lastTrialSlot) ? S.lastTrialSlot : slots[0];
    el.trial.classList.toggle('show', !!slot && S.phase === 'play');
    if (!slot) return;
    const it = itemOf(slot, S.outfit[slot]);
    el.trialTx.innerHTML = tr(`💎 Trying on <b>${Kit.esc(it.en)}</b>: unlock to score it`, `💎 试穿中：<b>${Kit.esc(it.name)}</b>，解锁后才计分`);
    el.trialBtn.textContent = tr(`Unlock · ${gem(D.PREMIUM_PRICE)}`, `解锁 · ${gem(D.PREMIUM_PRICE)}`);
    el.trialBtn.dataset.slot = slot;
  }
  function refresh(popIdx, popTags) {
    const ev = evaluate(S.outfit, false), pv = evaluate(S.outfit, true);
    renderBrief(ev, popTags); renderMeter(ev, pv.score); renderTrial(); renderTabs(); renderGrid(popIdx);
    return ev;
  }
  function say(en, zh, hold) {
    S.bubble = [en, zh];
    el.line.textContent = tr(en, zh);
    el.bubble.classList.add('show');
    S.bubbleT = hold || 2.6;
  }
  function toStage(pt) {
    const sc = CHAR.w / A.VB.w;
    return [CHAR.left + (pt[0] - A.VB.x) * sc, CHAR.top + (pt[1] - A.VB.y) * sc];
  }
  function burst(x, y, colors, n, shape) {
    parts.burst(x, y, { n: n || 16, colors, min: 50, max: 190, size: 5, life: 0.75, g: 120, up: 40, shape });
  }

  /* language switch mid-episode: rebuild every DOM string we own */
  if (Kit.onLang) Kit.onLang(() => {
    defineTuning();
    renderStatic();
    if (S.bubble) el.line.textContent = tr(S.bubble[0], S.bubble[1]);
    if (S.cfg && S.brief && (S.phase === 'play' || S.phase === 'countdown')) refresh();
    if (endCard && endCard.isConnected) showEndCard(endCard.success);
  });

  /* ---------- interaction ---------- */
  function setTab(i) {
    if (S.phase !== 'play') return;
    S.tab = i; S.focus = S.outfit[KEYS[i]];
    Kit.sfx.play('tap');
    renderTabs(); renderGrid();
  }
  function equip(tabIdx, i) {
    if (S.phase !== 'play' || S.paused) return;
    const slot = KEYS[tabIdx], it = itemOf(slot, i);
    if (S.outfit[slot] === i) { Kit.sfx.play('tap'); charEl.classList.add('bounce'); return; }
    const before = evaluate(S.outfit, false), beforePv = evaluate(S.outfit, true).score, st0 = starsOf(before.score);
    S.outfit = Object.assign({}, S.outfit, { [slot]: i });
    if (!locked(it)) S.lastFree = Object.assign({}, S.lastFree, { [slot]: i });
    else S.lastTrialSlot = slot;
    if (S.coachSlot === slot) S.coachSlot = null;
    S.equips++;
    drawChar(slot === 'pal' ? ['pal', 'top', 'outer'] : [slot]);
    const after = evaluate(S.outfit, false), pv = evaluate(S.outfit, true).score;
    const newTags = [...after.matched].filter((t) => !before.matched.has(t));
    if (after.couple && !before.couple) newTags.push('情侣');
    refresh(i, newTags);
    const [ax, ay] = toStage(A.anchor(slot, it.id));
    const delta = after.score - before.score, M = S.cfg.matchPts;
    charEl.classList.add(delta < 0 ? 'shake' : 'bounce');
    if (locked(it)) {
      const d = pv - beforePv;
      parts.text(ax, ay - 8, `${tr('Try-on', '试穿')} ${d >= 0 ? '+' : ''}${d}`, '#d9b892', 16);
      burst(ax, ay, ['#d9b892', '#fff4d6', '#f4a6c6'], 20);
      Kit.sfx.play('whoosh');
      Kit.track('premium_try', { item: it.id, previewDelta: d });
      say('Ooh. Is this one in the tour budget?', '哇，这件在巡演预算里吗？');
    } else if (delta > 0) {
      parts.text(ax, ay - 8, `+${delta}`, '#f6dfbd', delta >= M ? 24 : 19);
      burst(ax, ay, ['#d9b892', '#f4a6c6', '#fff4ec'], delta >= M ? 22 : 14);
      Kit.sfx.play(delta >= M ? 'good' : 'collect'); Kit.vibrate(12);
    } else if (delta < 0) {
      parts.text(ax, ay - 8, `${delta}`, '#ff8aa3', 19);
      burst(ax, ay, ['#6a5470', '#ff8aa3'], 8);
      Kit.sfx.tone(300, 0.16, 'triangle', 0.08, 0.7); Kit.vibrate(30);
    } else { burst(ax, ay, ['#cfc3d9'], 6); Kit.sfx.play('tap'); }
    if (!locked(it)) react(it, delta, after, before);
    const st1 = starsOf(after.score);
    if (st1 > st0) { Kit.sfx.play('perfect'); Kit.toast(tr(`${'★'.repeat(st1)} reached`, `达成 ${'★'.repeat(st1)}`)); burst(250, 160, ['#d9b892', '#fff4d6'], 24); Kit.track('star_up', { stars: st1, t: Math.round(S.elapsed) }); }
    Kit.track('equip', { slot, item: it.id, delta, score: after.score });
  }
  function react(it, delta, after, before) {
    if (after.couple && !before.couple) {
      burst(...toStage(A.anchor('acc', it.id)), ['#f4a6c6', '#e889b0', '#fff'], 18, 'heart');
      if (!S.coupleSeen) Kit.track('couple_found', { t: Math.round(S.elapsed) });
      S.coupleSeen = true;
      return say('My lucky pick. You remember the open mic?', '我的幸运拨片。你还记得那晚的开放麦吗？', 3.2);
    }
    if (S.lowkey && it.tags.includes('闪耀')) return say('Viv said nothing that upstages Sienna…', '薇薇安说了，不能抢西耶娜的风头……');
    const M = S.cfg.matchPts;
    const lines = delta >= M ? [['Oh. I like this.', '我喜欢这个。'], ['This feels right.', '这个感觉对了。'], ['You always know.', '你总是知道。']]
      : delta > 0 ? [['Not bad!', '不错！'], ['Getting there.', '有点意思了。']]
        : delta < 0 ? [['Is this… on theme?', '这个……对主题吗？'], ['Viv is going to hate this.', '薇薇安会讨厌这个的。']]
          : [['Different piece, same vibe.', '换了，但感觉差不多。']];
    const [en, zh] = pick(lines);
    say(en, zh);
  }
  async function unlock() {
    const slot = el.trialBtn.dataset.slot;
    if (S.phase !== 'play' || !slot) return;
    const idx = S.outfit[slot], it = itemOf(slot, idx);
    if (!locked(it)) return;
    S.paused = true;
    let ok = false;
    try {
      ok = await Kit.mockPurchase({ id: 'unlock_' + it.id, name: tr(`Unlock ${it.en}`, `解锁${it.name}`), price: D.PREMIUM_PRICE, gems: D.PREMIUM_GEMS,
      desc: tr('Unlocked pieces count toward your score, and never score below a free piece in the same slot. Free pieces alone can still reach three stars.',
        '解锁后计入评分，且不会低于同栏任何免费单品；只用免费单品也能拿满三星。') });
    } finally {
      S.paused = false;
    }
    if (!ok || S.phase !== 'play') return;
    S.owned.add(it.id);
    S.lastFree = Object.assign({}, S.lastFree, { [slot]: idx });
    Kit.track('premium_unlock', { item: it.id });
    const [ax, ay] = toStage(A.anchor(slot, it.id));
    burst(ax, ay, ['#d9b892', '#fff4d6', '#f4a6c6'], 30);
    Kit.sfx.play('perfect');
    refresh(idx);
    say('Okay, that one\'s officially mine now.', '好，这件正式归我了。');
  }
  function moveFocus(d) {
    const n = D.ITEMS[KEYS[S.tab]].length;
    S.focus = (S.focus + d + n) % n; renderGrid();
  }
  addEventListener('keydown', (e) => {
    if (S.phase !== 'play' || S.paused || Kit.tuning.open) return;
    const k = e.key;
    if (k >= '1' && k <= '5') setTab(+k - 1);
    else if (k === 'q' || k === 'Q') setTab((S.tab + KEYS.length - 1) % KEYS.length);
    else if (k === 'e' || k === 'E') setTab((S.tab + 1) % KEYS.length);
    else if (k === 'ArrowRight') moveFocus(1);
    else if (k === 'ArrowLeft') moveFocus(-1);
    else if (k === 'ArrowDown') moveFocus(3);
    else if (k === 'ArrowUp') moveFocus(-3);
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); equip(S.tab, S.focus); }
    else if (k === 'u' || k === 'U') unlock();
    else if (k === 'f' || k === 'F') finish('done');
  });

  /* ---------- per-frame ---------- */
  function coachHint() {
    let best = null, gain = 0;
    const base = evaluate(S.outfit, false).score;
    KEYS.forEach((k) => D.ITEMS[k].forEach((it, i) => {
      if (isPremium(it)) return;
      const g = evaluate(Object.assign({}, S.outfit, { [k]: i }), true).score - base;
      if (g > gain) { gain = g; best = k; }
    }));
    if (!best) return;
    S.coachSlot = best; renderTabs();
    const s = D.SLOTS.find((x) => x.key === best);
    say(`Maybe start with the ${s.en.toLowerCase()}?`, `要不先从「${s.name}」开始？`, 3.4);
  }
  function update(dt) {
    if (S.phase === 'play' && !S.paused) {
      S.time = Math.max(0, S.time - dt);
      S.elapsed += dt;
      if (S.elapsed > 1.6 && S.elapsed - dt <= 1.6 && S.equips === 0) coachHint();
      if (S.elapsed > COACH_WINDOW && S.coachSlot) { S.coachSlot = null; renderTabs(); }
      if (S.time <= WARN_AT) {
        const step = S.time <= 5 ? 0.5 : 1, idx = Math.floor(S.time / step);
        if (idx !== S.lastTick) { S.lastTick = idx; Kit.sfx.play('tick'); }
      }
      const sec = Math.ceil(S.time);
      if (sec !== S.shownSec) {
        S.shownSec = sec;
        el.timerTx.textContent = sec;
        el.timer.style.setProperty('--p', (sec / S.timeMax).toFixed(3));
        el.timer.classList.toggle('warn', S.time <= WARN_AT);
      }
      if (S.time <= 0) finish('timeout');
    }
    if (S.bubbleT > 0) { S.bubbleT -= dt; if (S.bubbleT <= 0) { el.bubble.classList.remove('show'); S.bubble = null; } }
    if (S.phase === 'reveal') return;
    parts.update(dt);
    drawBg(dt);
    fx.clear(); parts.draw(fx.ctx);
  }
  function drawBg(dt) {
    const c = bg.ctx;
    bg.clear();
    c.drawImage(scenery, 0, 0, 390, 780);
    c.globalCompositeOperation = 'lighter';
    bokeh.forEach((b) => {
      b.y -= b.v * dt; if (b.y < 60) { b.y = 540; b.x = Kit.rand(0, 390); }
      c.globalAlpha = b.a; c.drawImage(b.s, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    });
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  Kit.loop(update);

  /* ---------- round flow ---------- */
  function pickBrief() {
    const n = S.cfg.tagsPerBrief, last = Kit.store.get('ch3-last-brief', null);
    let pool = D.BRIEFS.filter((b) => !(S.lowkey && b.tags.slice(0, n).includes('闪耀')));
    if (pool.length > 1) pool = pool.filter((b) => b.id !== last);
    const b = pick(pool);
    Kit.store.set('ch3-last-brief', b.id);
    return b;
  }
  function setupRound() {
    S.cfg = Object.assign({}, Kit.tuning.values);
    S.tags = S.brief.tags.slice(0, S.cfg.tagsPerBrief);
    S.hintTag = S.choice === 'ask' ? S.tags[0] : null;
    S.outfit = KEYS.reduce((a, k) => (a[k] = 0, a), {});
    S.lastFree = Object.assign({}, S.outfit);
    S.best = Math.max(1, Sc.bestOutfit(ctx(), false).score);
    S.thr = Sc.thresholds(S.best, S.cfg.passPct, S.cfg.star3Pct);
    S.timeMax = S.cfg.timeLimit + (S.choice === 'trust' ? S.cfg.intuitionSec : 0) + (S.booster === 'time15' ? BOOST_TIME : 0);
    S.paused = false; S.shownSec = -1;
    S.time = S.timeMax; S.elapsed = 0; S.tab = 0; S.focus = 0; S.equips = 0; S.lastTick = -1; S.coachSlot = null; S.lastTrialSlot = null;
    el.timerTx.textContent = Math.ceil(S.time); el.timer.style.setProperty('--p', 1); el.timer.classList.remove('warn');
    el.bubble.classList.remove('show'); S.bubble = null;
    renderStatic();
    drawChar([]);
    refresh();
  }
  async function playRound() {
    S.attempt++;
    setupRound();
    hud.classList.remove('off');
    Kit.track('play_start', Object.assign({}, S.cfg, { brief: S.brief.id, tags: S.tags.map((t) => D.TAG_EN[t]).join('/'), choice: S.choice,
      branch: S.couple ? 'couple' : S.lowkey ? 'lowkey' : 'default', booster: S.booster, timeMax: S.timeMax, attempt: S.attempt, bestFree: S.best }));
    if (S.booster) Kit.track('booster_applied', { booster: S.booster, timeMax: S.timeMax });
    S.phase = 'countdown';
    await Kit.countdown(3);
    S.phase = 'play';
    const tag = S.tags[0];
    if (S.choice === 'ask') say(`Tonight I want to feel a little ${D.TAG_EN[tag].toLowerCase()}.`, `今天想要一点「${tag}」的感觉。`, 3.4);
    else say('All yours. I trust you.', '全交给你，我信你。', 2.4);
    if (S.booster === 'inspire') Kit.toast(tr('Style Insight: every matching tag glows', '造型灵感：所有对得上的标签都在发光'));
    if (S.booster === 'time15') Kit.toast(tr(`+${BOOST_TIME}s on the clock`, `限时多 ${BOOST_TIME} 秒`));
  }
  async function finish(reason) {
    if (S.phase !== 'play') return;
    S.phase = 'reveal';
    el.trial.classList.remove('show');
    const reverted = KEYS.filter((k) => locked(itemOf(k, S.outfit[k])));
    if (reverted.length) {
      S.outfit = Object.assign({}, S.outfit, reverted.reduce((a, k) => (a[k] = S.lastFree[k], a), {}));
      drawChar(reverted.includes('pal') ? reverted.concat(['top', 'outer']) : reverted);
      refresh();
      Kit.toast(tr('Try-on pieces go back on the rack', '试穿款已换回'));
    }
    if (reason === 'timeout') { Kit.toast(tr('Time\'s up. Walk!', '时间到，上台！')); Kit.sfx.play('whoosh'); Kit.track('timeout', {}); }
    const ev = evaluate(S.outfit, false), st = starsOf(ev.score);
    Kit.track('finish', { reason, score: ev.score, stars: st, timeLeft: Math.ceil(S.time), equips: S.equips, reverted: reverted.length });
    await Kit.wait(reverted.length || reason === 'timeout' ? 1000 : 350);
    hud.classList.add('off'); parts.list.length = 0;
    await window.Ch3Reveal.play({ outfit: ids(S.outfit), stars: st, score: ev.score, comments: buildComments(ev, st) });
    showResult(ev, st);
  }
  /* live chat in the current language only */
  function buildComments(ev, st) {
    const C = D.COMMENTS[isZh() ? 'zh' : 'en'], out = [];
    ev.matched.forEach((t) => out.push({ text: pick(C.PRAISE[t]), kind: 'good' }));
    S.tags.filter((t) => !ev.matched.has(t)).forEach((t) => out.push({ text: C.missing(t), kind: 'meh' }));
    ev.clashes.slice(0, 2).forEach((c) => out.push({ text: C.clash(c.item, c.tag), kind: 'meh' }));
    if (ev.couple) C.COUPLE.forEach((t) => out.push({ text: t, kind: 'love' }));
    if (S.lowkey && ev.flashy) C.LOWKEY_BAD.forEach((t) => out.push({ text: t, kind: 'meh' }));
    KEYS.forEach((k) => { const it = itemOf(k, S.outfit[k]); if (isPremium(it)) out.push({ text: C.premium(it), kind: 'good' }); });
    C.STARS[st].forEach((t) => out.push({ text: t, kind: st >= 2 ? 'star' : 'meh' }));
    const filler = C.FILLER.slice().sort(() => Math.random() - 0.5);
    while (out.length < 15 && filler.length) out.push({ text: filler.pop(), kind: '' });
    return out.sort(() => Math.random() - 0.5);
  }
  async function showResult(ev, st) {
    S.phase = 'result';
    const success = st >= 2;
    /* stat labels/values/titles are 'English · 中文' pairs; the kit shows one side (Kit.loc) */
    const extra = S.couple ? { label: 'Something of yours · 你的东西', value: ev.couple ? 'He wore your pick · 戴上了拨片' : 'Missed it · 没戴上', key: 'couple', raw: ev.couple }
      : S.lowkey ? { label: 'Don\'t upstage Sienna · 别抢风头', value: ev.flashy ? `${ev.flashy} too flashy · ${ev.flashy} 件太闪` : 'Kept it low-key · 做到了', key: 'lowkey', raw: ev.flashy }
        : { label: 'Premium unlocked · 已解锁', value: String(S.owned.size), key: 'owned', raw: S.owned.size };
    const tagZh = S.hintTag || '';
    const r = await Kit.result({
      success, stars: st,
      title: success ? 'Best Dressed' : 'He Wore It Anyway',
      zh: success ? '全场最佳造型' : '他还是穿着它',
      stats: [
        { label: 'Style score · 造型分', value: `${ev.score} / ${S.best}`, key: 'score', raw: ev.score },
        { label: 'Brief matched · 命中关键词', value: `${ev.matched.size}/${S.tags.length}`, key: 'matched', raw: ev.matched.size },
        { label: 'Clashes · 冲突', value: String(ev.clashes.length), key: 'clashes', raw: ev.clashes.length },
        { label: 'Time left · 剩余时间', value: `${Math.ceil(S.time)}s · ${Math.ceil(S.time)} 秒`, key: 'timeLeft', raw: Math.ceil(S.time) },
        { label: 'Your call · 开场选择', value: S.choice === 'ask' ? `Asked him: ${D.TAG_EN[S.hintTag]} · 问了他：${tagZh}` : `Instinct +${S.cfg.intuitionSec}s · 相信直觉 +${S.cfg.intuitionSec} 秒`, key: 'choice', raw: S.choice },
        extra,
      ],
      branch: success
        ? { title: 'Best Dressed · 全场最佳造型', text: 'Every tabloid runs the same photo. Viv forwards you the link without a word, which from her is a standing ovation.', zh: '所有小报都用了同一张照片。薇薇安一言不发地把链接转给你，这已经是她最高的夸奖。' }
        : { title: 'He Wore It Anyway · 他还是穿着它', text: 'The critics hate it. On camera he says he loves it, and looks straight past the lens at you.', zh: '评论家都不买账。镜头前他说自己很喜欢，然后越过镜头看向你。' },
      boosters: [
        { id: 'inspire', name: 'Style Insight · 造型灵感', desc: 'Next round every matching tag glows · 下一局所有对得上的标签都会发光', price: '$0.99', gems: D.BOOSTER_GEMS },
        { id: 'time15', name: `+${BOOST_TIME} Seconds · 多 ${BOOST_TIME} 秒`, desc: `Next round starts with ${BOOST_TIME} extra seconds · 下一局限时多 ${BOOST_TIME} 秒`, price: '$0.99', gems: D.BOOSTER_GEMS },
      ],
    });
    if (r.action === 'retry') { S.booster = r.via === 'iap' ? r.booster : null; return playRound(); }
    Kit.story.set('ch3', { success, score: ev.score, stars: st, couple: ev.couple });
    ending(success, ev);
  }

  /* ---------- story ---------- */
  const NUM = { 2: 'two', 3: 'three', 4: 'four' };
  async function intro() {
    const ch1 = Kit.story.get('ch1', null), ch2 = Kit.story.get('ch2', null);
    S.couple = !!(ch2 && ch2.success); S.lowkey = !!(ch2 && ch2.success === false);
    S.cfg = Object.assign({}, Kit.tuning.values);
    S.brief = pickBrief();
    const n = S.cfg.tagsPerBrief;
    drawChar([]);
    const lines = [
      { who: 'narr', text: 'The Crown Music Awards. Forty-five minutes to the carpet. Outside, a thousand phones are already up.', zh: '皇冠音乐奖。离走红毯还有四十五分钟。门外，上千部手机已经举了起来。' },
      { who: 'tang', mood: 'normal', text: `First carpet you style on your own. The theme's in: ${NUM[n] || n} words. Make him unforgettable. Not a disaster. Unforgettable.`, zh: `这是你第一次独立给他做红毯造型。主题来了，${n} 个关键词。让他被记住——是被记住，不是出事。` },
    ];
    if (S.couple) lines.push(
      { who: 'luyu', mood: 'blush', text: '(low) I kept your guitar pick. Put it on me tonight. I want something of yours out there with me.', zh: '（低声）你那枚拨片，我一直留着。今晚帮我戴上。我想带着你的东西走上去。' },
      { who: 'narr', text: 'He doesn\'t say it for the cameras. He says it for you.', zh: '这句话不是说给镜头听的，是说给你的。' });
    else if (S.lowkey) lines.push({ who: 'tang', mood: 'angry', text: 'Sienna walks right after him. Rule one tonight: nothing that upstages Sienna. Keep it low-key.', zh: '西耶娜紧跟在他后面走。今晚第一条规矩：不准抢西耶娜的风头。低调。' });
    else lines.push({ who: 'tang', mood: 'normal', text: 'Stick to the theme. No surprises.', zh: '按主题来，别给我惊喜。' });
    if (ch1 && ch1.success) lines.push({ who: 'luyu', mood: 'smile', text: 'You got me out of that after-party clean. Do your magic again.', zh: '上次你让我干干净净溜出了派对。今晚再变一次魔法吧。' });
    else if (ch1) lines.push({ who: 'tang', mood: 'angry', text: 'That blurry hotel photo is still all over TikTok. Tonight we change the story.', zh: '那张酒店的模糊照片还在 TikTok 上疯传。今晚我们得把话题扭回来。' });
    lines.push(
      { who: 'luyu', mood: 'smile', text: 'Dress me however you want. …Or you could ask what I\'m feeling tonight.', zh: '你想怎么打扮我都行。……或者，你也可以问问我今晚想要什么感觉。' },
      { who: 'me', text: 'Ask him, or trust my own eye?', zh: '问问他，还是相信自己的眼光？', choices: [
        { text: 'Ask what he\'s feeling', zh: '问问他的感觉', sub: tr('He names one word; those tags glow on the rack', '他会说出一个词，衣架上对应标签高亮'), value: 'ask' },
        { text: 'Trust my instinct', zh: '相信直觉', sub: tr(`Move fast: +${S.cfg.intuitionSec}s on the clock`, `速战速决：限时 +${S.cfg.intuitionSec} 秒`), value: 'trust' },
      ] });
    const caption = tr('EPISODE 3 · RED CARPET REVEAL', '第三集 · 红毯亮相');
    const res = await Kit.dialogue(lines, { bg: 'backstage', caption });
    S.choice = res.choices[0] || 'trust';
    const T = S.cfg.timeLimit + (S.choice === 'trust' ? S.cfg.intuitionSec : 0);
    const mod = S.couple ? ['Episode 2: he told you the truth. Hidden request, "wear something of hers": your old guitar pick on a chain earns a big bonus.', '上一章他说出了真相：隐藏需求「戴上她的东西」，你那枚拨片项链额外大加分。']
      : S.lowkey ? ['Episode 2: Viv pulled him away. Her rule tonight, "nothing that upstages Sienna": every Sparkle tag costs extra.', '上一章被公关打断：薇薇安的规矩「不准抢西耶娜风头」，每个闪耀标签额外扣分。']
        : ['No Episode 2 record, so this is the default theme. Play Episode 2 first to change it.', '没有上一章记录，按默认主题；先玩第二章会改变这里。'];
    await Kit.tutorial({
      chapter: 'Episode 3 · Mini game', chapterZh: '第三集 · 小游戏', title: 'Red Carpet Reveal', zh: '红毯亮相',
      goal: `Style him to the theme in ${T}s and reach ★★`, goalZh: `${T} 秒内按主题搭配，拿到 ★★`,
      items: [
        { icon: '🏷️', text: 'Tags that <b>match</b> the theme score; <b>opposite</b> tags cost points.', zh: '标签和主题对上加分，相冲扣分（温柔对酷感、低调对闪耀……）' },
        { icon: '👆', text: 'Tap a tab, then a card. Keys: 1–5, arrows, Space, F to finish.', zh: '点标签页和卡片换装；键盘 1–5、方向键、空格，F 完成' },
        { icon: '💎', text: '💎 pieces are free to try on and count once unlocked. They never score below a free piece in the same slot, and free pieces alone can hit ★★★.', zh: '💎 款免费试穿、解锁后计分，分数不会低于同栏免费单品；不花钱也能拿满三星' },
      ],
      modifier: mod[0], modifierZh: mod[1], start: 'Start styling', startZh: '开始搭配',
    });
    playRound();
  }
  async function ending(success, ev) {
    S.phase = 'ending';
    const echo = S.choice === 'ask'
      ? { who: 'luyu', mood: 'smile', text: 'And thanks for asking me first. Nobody ever does.', zh: '还有，谢谢你先问我。从来没人问过。' }
      : { who: 'luyu', mood: 'smile', text: 'You didn\'t hesitate once in there. That was hot.', zh: '你刚才一秒都没犹豫。那样子很迷人。' };
    const lines = success ? [
      { who: 'narr', text: 'By midnight every tabloid has the same headline: Jace Monroe, Best Dressed. The clip of him on the carpet is everywhere.', zh: '午夜前，所有小报都是同一个标题：杰斯·门罗，全场最佳造型。他走红毯的片段刷满了 TikTok。' },
      { who: 'tang', mood: 'smile', text: '…Fine. You win. The tour wardrobe is yours.', zh: '……行吧，你赢了。巡演的造型也归你。' },
      ev.couple
        ? { who: 'luyu', mood: 'blush', text: 'I touched the pick every time a camera flashed. Nobody out there knew why. I did.', zh: '每次闪光灯一亮，我都摸了摸那枚拨片。外面没人知道为什么，我知道。' }
        : { who: 'luyu', mood: 'smile', text: 'Told you. Nobody knows how to dress me like you do.', zh: '我就说吧，没人比你更会打扮我。' },
      echo,
    ] : [
      { who: 'narr', text: 'The critics are brutal. "Confused." "Trying too hard." The clip goes viral for all the wrong reasons.', zh: '评论毫不留情：「不知所云」「用力过猛」。片段疯传，只是原因不太对。' },
      { who: 'tang', mood: 'angry', text: 'I\'ll handle the press. You, plan B, three days early, next time.', zh: '媒体我来处理。你，下次提前三天给我备选方案。' },
      { who: 'luyu', mood: 'smile', text: 'A reporter asked if I regret the look. I said I love it. Then I looked for you.', zh: '有记者问我后不后悔这身造型。我说我很喜欢。然后我在人群里找你。' },
      ev.couple ? { who: 'luyu', mood: 'blush', text: 'And I never took the pick off. Not once.', zh: '那枚拨片，我一次都没摘下来。' } : echo,
      { who: 'luyu', mood: 'blush', text: 'I\'d wear it again. For you.', zh: '为了你，我还会再穿一次。' },
    ];
    await Kit.dialogue(lines, { bg: 'backstage', caption: success ? tr('BEST DRESSED', '全场最佳造型') : tr('HE WORE IT ANYWAY', '他还是穿着它') });
    showEndCard(success);
  }
  let endCard = null;
  function showEndCard(success) {
    if (endCard) endCard.remove();
    endCard = Kit.el(`<div class="kit-scrim"><div class="kit-card c3-end">
      <span class="kit-res-badge ${success ? 'win' : 'lose'}">${Kit.esc(tr('Episode 3 · End', '第三集 · 完'))}</span>
      <h2 class="${isZh() ? 'cjk' : ''}">${Kit.esc(tr('To be continued', '未完待续'))}</h2>
      <p>${Kit.esc(success ? tr('The carpet was yours tonight.', '今晚的红毯属于你。') : tr('Not every look lands. He still wore it like it did.', '不是每套造型都会被喜欢，但他穿得像被全世界喜欢。'))}</p>
      <div class="kit-res-sub">${Kit.esc(tr('Next: Episode 4 · The Morning After', '下一集：头条之后'))}</div>
      <button class="kit-btn primary" data-a="next">${Kit.esc(tr('Continue to Episode 4 ›', '第四集 ›'))}</button>
      <button class="kit-btn ghost" data-a="home">${Kit.esc(tr('Back to episodes', '返回剧集列表'))}</button></div></div>`);
    endCard.success = success;
    endCard.querySelector('[data-a=next]').onclick = () => { Kit.sfx.play('good'); Kit.track('chapter_next', { to: 'ch4', success }); location.href = '../ch4-headline/index.html'; };
    endCard.querySelector('[data-a=home]').onclick = () => { Kit.sfx.play('tap'); Kit.track('chapter_exit', { success }); location.href = '../index.html'; };
    ui.overlay.appendChild(endCard);
  }

  renderStatic();
  intro();
})();
