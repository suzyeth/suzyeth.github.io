/* Off Camera story mini-games — shared kit (story dialogue, results/branching,
 * optional retry economy, tuning panel, analytics log, synth SFX).
 * Plain script, no build step: games load it with <script src="../kit/kit.js">.
 * UI follows a cinematic interactive-series player: cinematic frame + plum glass + script names.
 * Text convention: English is primary. Dialogue lines use {text (EN), zh}; the
 * older {text (ZH), en} shape is still accepted and shown English-first. */
(function () {
  'use strict';
  const W = 390, H = 780;
  const Kit = { W, H, scale: 1 };
  Kit.designer = (() => {
    try {
      const q = new URLSearchParams(location.search).get('designer');
      if (q === '1' || q === '0') localStorage.setItem('off-camera-designer', q);
      return localStorage.getItem('off-camera-designer') === '1';
    } catch (e) { return false; }
  })();
  // folder that holds kit/ (assets/ sits next to it); works from the home page and from chN/ pages
  const SITE_BASE = (() => { try { return document.currentScript.src.replace(/kit\/kit\.js(\?.*)?$/, ''); } catch (e) { return '../'; } })();
  const $ = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  Kit.el = $;
  Kit.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Kit.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Kit.lerp = (a, b, t) => a + (b - a) * t;
  Kit.rand = (a, b) => a + Math.random() * (b - a);
  Kit.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hasCJK = (s) => /[㐀-鿿]/.test(String(s || ''));
  /* primary/secondary text from either {text, zh} or legacy {text(zh), en} */
  /* ---------- language: one switch for the whole site ('en' | 'zh') ---------- */
  let lang = (() => { try { return localStorage.getItem('off-camera-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; } })();
  const langListeners = [];
  Kit.lang = () => lang;
  Kit.onLang = (fn) => { langListeners.push(fn); };
  /* the part of a mixed string that belongs to the current language:
   * 'Score · 得分', '时长 Duration', 'Deep Breath 深呼吸', '下一局多 15 秒' */
  Kit.loc = function (str) {
    const s = String(str == null ? '' : str);
    if (!hasCJK(s)) return s;
    const parts = s.split(/\s+·\s+|\s+\|\s+/);
    if (parts.length > 1) {
      const z = parts.filter(hasCJK).join(' · '), e = parts.filter((x) => !hasCJK(x)).join(' · ');
      return lang === 'zh' ? (z || e) : (/[A-Za-z]/.test(e) ? e : '');
    }
    const tok = s.split(/\s+/);
    const a = tok.findIndex(hasCJK);
    let b = tok.length - 1;
    while (b > a && !hasCJK(tok[b])) b--;
    const z = tok.slice(a, b + 1).join(' '), e = tok.slice(0, a).concat(tok.slice(b + 1)).join(' ').trim();
    return lang === 'zh' ? z : (/[A-Za-z]/.test(e) ? e : '');
  };
  Kit.tr = (en, zh) => (lang === 'zh' ? (zh || Kit.loc(en)) : Kit.loc(en));
  /* dialogue-style text: {text EN, zh} or legacy {text ZH, en}; returns [text in current language, ''] */
  Kit.pair = function (main, zh, en) {
    let e = main, z = '';
    if (zh) z = zh;
    else if (en) { if (hasCJK(main)) { e = en; z = main; } else if (hasCJK(en)) z = en; }
    else if (hasCJK(main)) { z = Kit.loc(main); e = ''; }
    return [lang === 'zh' ? (z || e) : (e && !hasCJK(e) ? e : Kit.loc(main)), ''];
  };
  const sub = (s) => (s ? `<span class="sub">${Kit.esc(s)}</span>` : '');
  const scriptOr = (s, cls) => (hasCJK(s) ? `${cls} cjk` : cls);

  /* ---------- safe storage (works when blocked / file://) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: prototype keeps running */ } },
  };
  Kit.store = store;

  /* ---------- cross-chapter story state ---------- */
  const STORY_KEY = 'off-camera-story-v1';
  Kit.story = {
    all() { return store.get(STORY_KEY, {}); },
    get(k, d) { const s = this.all(); return k in s ? s[k] : d; },
    set(k, v) { store.set(STORY_KEY, Object.assign({}, this.all(), { [k]: v })); },
    reset() { store.set(STORY_KEY, {}); },
  };

  /* ---------- film grain (generated once) ---------- */
  let grainURL = null;
  Kit.grain = function () {
    if (grainURL) return grainURL;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), d = x.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); grainURL = c.toDataURL();
    return grainURL;
  };

  /* ---------- icons (line style, like a series player's chrome) ---------- */
  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4 7 12l8 8"/></svg>',
    subs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 13h4M13 13h4M7 16h7"/></svg>',
    data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 19V11M12 19V5M19 19v-6"/></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7c0 6 6 5 6 10M18 7c0 6-6 5-6 10"/></svg>',
  };
  Kit.icon = ICON;

  /* ---------- stage ---------- */
  let ui = null;
  Kit.mount = function (opts) {
    opts = opts || {};
    Kit.gameId = opts.id || 'game';
    document.title = opts.title || document.title;
    const ep = opts.episode || (opts.title ? String(opts.title) : '');
    const vp = $(`<div id="kit-viewport"><div id="kit-stage">
      <div id="kit-game"></div><div id="kit-hud"></div><div id="kit-overlay"></div>
      <div class="kit-grain" id="kit-grain" style="z-index:30"></div>
      <div id="kit-topbar">
        <button class="kit-back" data-k="home" title="Back to stories">${ICON.back}</button>
        <div class="kit-titleblock"><div class="t"></div><div class="e"></div></div>
        <div id="kit-wallet"></div>
        <div id="kit-toolbar">
          <button class="kit-tb kit-langbtn" data-k="lang"></button>
          <button class="kit-tb" data-k="more">${ICON.tune}</button>
        </div>
        <div class="kit-menu" hidden>
          <button data-k="tune">${ICON.tune}<span data-tr="Tuning presets|调参面板"></span></button>
          <button data-k="data">${ICON.data}<span data-tr="Event log &amp; funnel|埋点漏斗"></span></button>
        </div>
      </div></div></div>`);
    document.body.appendChild(vp);
    const stage = vp.querySelector('#kit-stage');
    vp.querySelector('#kit-grain').style.backgroundImage = `url(${Kit.grain()})`;
    ui = { vp, stage, game: vp.querySelector('#kit-game'), hud: vp.querySelector('#kit-hud'), overlay: vp.querySelector('#kit-overlay') };
    // episode label in both languages: 'Episode 1 · Slip the Crowd' + 'Slip the Crowd · 躲开镜头'
    const epNum = (String(ep).match(/Episode\s*(\d+)/) || [])[1];
    const zhTitle = String(opts.title || '').split(/\s+·\s+/).filter(hasCJK).join(' ');
    const applyLang = () => {
      stage.classList.toggle('kit-lang-zh', lang === 'zh'); stage.classList.toggle('kit-lang-en', lang !== 'zh');
      stage.classList.toggle('kit-nosubs', lang !== 'zh');
      document.title = Kit.loc(opts.title || document.title) || document.title;
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      const tb = stage.querySelector('.kit-titleblock');
      tb.querySelector('.t').textContent = lang === 'zh' ? '镜头之外' : (opts.story || 'Off Camera');
      tb.classList.toggle('cjk', lang === 'zh');
      tb.querySelector('.e').textContent = lang === 'zh' ? (epNum ? `第${epNum}集` : '') + (zhTitle ? ` · ${zhTitle}` : '') : Kit.loc(ep);
      const lb = stage.querySelector('.kit-langbtn');
      lb.innerHTML = `<span>${lang === 'zh' ? '中' : 'EN'}</span>`;
      lb.title = lang === 'zh' ? '切换到英文' : 'Switch language';
      stage.querySelector('[data-k=more]').title = Kit.tr('Designer tools', '设计工具');
      stage.querySelector('.kit-back').title = Kit.tr('Back to episodes', '返回剧集');
      stage.querySelectorAll('[data-tr]').forEach((n) => { const [x, y] = n.dataset.tr.split('|'); n.innerHTML = Kit.tr(x, y); });
    };
    Kit.setLang = (l) => {
      lang = l === 'zh' ? 'zh' : 'en';
      try { localStorage.setItem('off-camera-lang', lang); } catch (e) { /* storage blocked: still switch for this page */ }
      applyLang(); Kit.track('lang_switch', { lang });
      langListeners.forEach((fn) => { try { fn(lang); } catch (e) { /* one listener must not break the others */ } });
      if (Kit.tuning.open) Kit.tuning.render();
      if (Kit.analytics.open) Kit.analytics.show();
    };
    applyLang();
    if (!Kit.designer) { stage.querySelector('[data-k=more]').hidden = true; stage.querySelector('#kit-wallet').style.right = '58px'; }
    const fit = () => {
      const s = Math.min(innerWidth / W, innerHeight / H);
      Kit.scale = s;
      stage.style.transformOrigin = '50% 50%';
      stage.style.transform = `translate(-50%, -50%) scale(${s})`;
      stage.style.borderRadius = innerWidth < 500 ? '0' : '26px';
      Kit._canvases.forEach((c) => c.resize());
    };
    addEventListener('resize', fit);
    // oversized children (e.g. a cropped close-up) must never scroll the stage sideways
    stage.addEventListener('scroll', () => { if (stage.scrollLeft || stage.scrollTop) { stage.scrollLeft = 0; stage.scrollTop = 0; } });
    fit();
    vp.querySelector('#kit-topbar').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      e.stopPropagation();
      Kit.sfx.play('tap');
      const menu = vp.querySelector('.kit-menu');
      if (b.dataset.k === 'home') location.href = opts.home || '../index.html';
      if (b.dataset.k === 'more') { menu.hidden = !menu.hidden; return; }
      menu.hidden = true;
      if (b.dataset.k === 'data') Kit.analytics.toggle();
      if (b.dataset.k === 'tune') Kit.tuning.toggle();
      if (b.dataset.k === 'lang') {
        if (ui.overlay.children.length) { Kit.toast(Kit.tr('Switch language after this screen', '请在这个画面结束后再切换语言')); return; }
        Kit.setLang(lang === 'zh' ? 'en' : 'zh'); Kit.toast(Kit.tr('English', '已切换为中文'));
      }
    });
    addEventListener('keydown', (e) => { if (e.key === '`' && Kit.designer) Kit.tuning.toggle(); });
    Kit.track('session_start', { game: Kit.gameId });
    return ui;
  };
  Kit.ui = () => ui;
  Kit.subsOn = () => lang === 'zh'; // legacy name: true when the page is in Chinese

  /* convert a pointer event to stage coordinates (0..390, 0..780) */
  Kit.toStage = function (e) {
    const r = ui.stage.getBoundingClientRect();
    const p = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    return { x: (p.clientX - r.left) / r.width * W, y: (p.clientY - r.top) / r.height * H };
  };

  /* crisp canvas in stage coordinates; ctx transform is reset by resize() */
  Kit._canvases = [];
  Kit.canvas = function (parent) {
    const cv = document.createElement('canvas');
    (parent || ui.game).appendChild(cv);
    const ctx = cv.getContext('2d');
    const o = {
      cv, ctx, ratio: 1,
      resize() {
        const r = Math.min(2, (devicePixelRatio || 1) * Math.max(1, Kit.scale)); // cap: phones at dpr 3 cost 2.25x the fill for no visible gain
        o.ratio = r; cv.width = Math.round(W * r); cv.height = Math.round(H * r);
        ctx.setTransform(r, 0, 0, r, 0, 0);
      },
      clear() { ctx.setTransform(o.ratio, 0, 0, o.ratio, 0, 0); ctx.clearRect(0, 0, W, H); },
    };
    o.resize();
    Kit._canvases.push(o);
    return o;
  };

  /* game loop with dt in seconds (clamped), pausable */
  Kit.loop = function (update) {
    let last = performance.now(), running = true, raf = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (running) update(dt, now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return {
      pause() { running = false; },
      resume() { last = performance.now(); running = true; },
      get running() { return running; },
      stop() { cancelAnimationFrame(raf); },
    };
  };

  /* ---------- SFX (WebAudio synth, no files) ---------- */
  let actx = null, muted = store.get('off-camera-muted', false);
  const ac = () => {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  };
  function tone(f, d, type, vol, slide, delay) {
    const a = ac(); if (!a || muted) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol, hp) {
    const a = ac(); if (!a || muted) return;
    const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 800; s.buffer = b; g.gain.value = vol || 0.15;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  const SFX = {
    tap: () => tone(660, 0.06, 'triangle', 0.07),
    blip: () => tone(880, 0.04, 'sine', 0.025),
    collect: () => { tone(988, 0.08, 'triangle', 0.12); tone(1319, 0.12, 'triangle', 0.1, 0, 0.06); },
    good: () => { tone(784, 0.09, 'sine', 0.14); tone(1175, 0.14, 'sine', 0.1, 0, 0.05); },
    perfect: () => { [1047, 1319, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, 0, i * 0.045)); },
    bad: () => { tone(220, 0.22, 'sawtooth', 0.09, 0.6); noise(0.12, 0.06, 400); },
    hit: () => { noise(0.18, 0.18, 300); tone(140, 0.2, 'square', 0.08, 0.5); },
    whoosh: () => noise(0.25, 0.07, 1500),
    shutter: () => { noise(0.05, 0.2, 2500); tone(2000, 0.03, 'square', 0.04, 0, 0.05); },
    heart: () => { tone(70, 0.12, 'sine', 0.35, 0.7); tone(62, 0.14, 'sine', 0.28, 0.7, 0.16); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, 0, i * 0.1)); },
    lose: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, 0.9, i * 0.16)); },
    tick: () => tone(1200, 0.03, 'square', 0.03),
    count: () => tone(523, 0.12, 'triangle', 0.12),
    go: () => tone(1047, 0.25, 'triangle', 0.14),
  };
  Kit.sfx = {
    play(n) { try { SFX[n] && SFX[n](); } catch (e) { /* audio is optional */ } },
    tone, noise,
    get muted() { return muted; },
    toggle() { muted = !muted; store.set('off-camera-muted', muted); return muted; },
  };
  addEventListener('pointerdown', () => ac(), { once: true });

  // browsers refuse (and log) vibration before the first tap, so skip it until then
  Kit.vibrate = (ms) => { try { const ua = navigator.userActivation; if ((!ua || ua.hasBeenActive) && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported */ } };

  /* ---------- analytics (local, on-screen only) ---------- */
  const LOG_KEY = 'off-camera-events-v1';
  const FUNNEL = ['intro_complete', 'play_start', 'play_end', 'retry', 'story_continue'];
  // events are buffered in memory and written to storage when the page is idle or closing,
  // so a cascade of match events never re-serialises the whole log mid-animation
  let logBuf = null, flushT = 0;
  const logGet = () => (logBuf || (logBuf = store.get(LOG_KEY, [])));
  const logFlush = () => { flushT = 0; if (logBuf) store.set(LOG_KEY, logBuf.slice(-400)); };
  addEventListener('pagehide', logFlush);
  addEventListener('visibilitychange', () => { if (document.hidden) logFlush(); });
  Kit.track = function (name, props) {
    const ev = { t: Date.now(), game: Kit.gameId, name, props: props || {} };
    const log = logGet(); log.push(ev); if (log.length > 600) log.splice(0, log.length - 400);
    if (!flushT) flushT = setTimeout(logFlush, 1500);
    if (Kit.analytics.open) Kit.analytics.render();
    return ev;
  };
  // both designer panels live behind the one "more" button in the top bar
  const setTb = (k, on) => { const b = ui && ui.stage.querySelector('[data-k=more]'); b && b.classList.toggle('on', on); };
  Kit.analytics = {
    open: false, node: null,
    toggle() { this.open ? this.close() : this.show(); },
    show() {
      Kit.tuning.close();
      this.open = true;
      this.node = $(`<div class="kit-side"><button class="kit-tb close">✕</button>
        <h3>${Kit.tr('Event log', '埋点日志')}</h3><p class="hint">${Kit.tr('Events stay in this browser; nothing is sent anywhere. Use it to show where players drop off.', '只在本机记录，不会上传。用来讲玩家在哪一步流失。')}</p>
        <div class="kit-funnel"></div><div class="kit-log"></div>
        <button class="kit-btn ghost" data-a="clear" style="font-size:13px;padding:10px">${Kit.tr('Clear', '清空')}</button></div>`);
      this.node.querySelector('.close').onclick = () => this.close();
      this.node.querySelector('[data-a=clear]').onclick = () => { logBuf = []; store.set(LOG_KEY, []); this.render(); };
      ui.stage.appendChild(this.node); this.render(); setTb('data', true);
    },
    close() { this.open = false; this.node && this.node.remove(); this.node = null; setTb('data', false); },
    render() {
      if (!this.node) return;
      const log = logGet().filter((e) => e.game === Kit.gameId);
      const counts = FUNNEL.map((n) => [n, log.filter((e) => e.name === n).length]);
      const max = Math.max(1, ...counts.map((c) => c[1]));
      this.node.querySelector('.kit-funnel').innerHTML = `<b style="font-size:12px">${Kit.tr('Funnel', '本章漏斗')}</b>` + counts.map(([n, c]) =>
        `<div class="bar"><span>${n}</span><i style="width:${Math.max(4, c / max * 120)}px"></i>${c}</div>`).join('');
      this.node.querySelector('.kit-log').innerHTML = log.slice(-60).reverse().map((e) =>
        `<div><time>${new Date(e.t).toLocaleTimeString()}</time><b>${Kit.esc(e.name)}</b> ${Kit.esc(JSON.stringify(e.props))}</div>`).join('') || `<div>${Kit.tr('No events yet', '暂无事件')}</div>`;
    },
  };

  /* ---------- tuning panel ---------- */
  const PRESET_EN = { '剧情开头（新手）': 'Story start', '标准': 'Standard', '剧情中后期': 'Late story' };
  const presetName = (n) => (lang === 'zh' ? n : PRESET_EN[n] || Kit.loc(n));
  Kit.tuning = {
    schema: [], values: {}, presets: {}, onChange: null, node: null, open: false, preset: null, note: '',
    /* schema: [{key,label,min,max,step,value,hint,fmt}], presets: {name:{key:val}} */
    define(schema, opts) {
      opts = opts || {};
      this.schema = schema; this.presets = opts.presets || {}; this.onChange = opts.onChange || null; this.note = opts.note || '';
      const saved = store.get(`off-camera-tune-${Kit.gameId}`, null);
      this.values = {};
      schema.forEach((s) => { this.values[s.key] = saved && s.key in saved ? saved[s.key] : s.value; });
      this.preset = store.get(`off-camera-preset-${Kit.gameId}`, null);
      return this.values;
    },
    set(vals, preset) {
      Object.assign(this.values, vals);
      this.preset = preset || null;
      store.set(`off-camera-tune-${Kit.gameId}`, this.values);
      store.set(`off-camera-preset-${Kit.gameId}`, this.preset);
      this.onChange && this.onChange(this.values);
      if (this.open) this.render();
    },
    toggle() { this.open ? this.close() : this.show(); },
    show() { Kit.analytics.close(); this.open = true; this.render(); setTb('tune', true); },
    close() { this.open = false; this.node && this.node.remove(); this.node = null; setTb('tune', false); },
    render() {
      this.node && this.node.remove();
      const n = $(`<div class="kit-side"><button class="kit-tb close">✕</button>
        <h3>${Kit.tr('Tuning', '调参面板')}</h3><p class="hint">${Kit.esc(this.note ? Kit.loc(this.note) : Kit.tr('Changes apply from the next round.', '改完下一局按新参数。'))}</p>
        <div class="kit-presets"></div><div class="rows"></div>
        <button class="kit-btn ghost" data-a="reset" style="font-size:13px;padding:10px">${Kit.tr('Reset defaults', '恢复默认')}</button>
        <button class="kit-btn ghost" data-a="mute" style="font-size:13px;padding:10px">${muted ? Kit.tr('Sound on', '开启音效') : Kit.tr('Mute', '关闭音效')}</button>
        <button class="kit-btn ghost" data-a="story" style="font-size:13px;padding:10px">${Kit.tr('Reset story', '清空剧情进度')}</button></div>`);
      const pre = n.querySelector('.kit-presets');
      Object.keys(this.presets).forEach((name) => {
        const b = $(`<button class="${this.preset === name ? 'on' : ''}">${Kit.esc(presetName(name))}</button>`);
        b.onclick = () => { Kit.sfx.play('tap'); this.set(this.presets[name], name); Kit.track('tune_preset', { preset: name }); };
        pre.appendChild(b);
      });
      const rows = n.querySelector('.rows');
      this.schema.forEach((s) => {
        const r = $(`<div class="kit-row"><label>${Kit.esc(Kit.loc(s.label))} <output></output></label>
          <input type="range" min="${s.min}" max="${s.max}" step="${s.step || 1}"><div class="h">${Kit.esc(Kit.loc(s.hint || ''))}</div></div>`);
        const inp = r.querySelector('input'), out = r.querySelector('output');
        const fmt = (v) => Kit.loc(s.fmt ? s.fmt(v) : v);
        inp.value = this.values[s.key]; out.textContent = fmt(this.values[s.key]);
        inp.oninput = () => { const v = parseFloat(inp.value); out.textContent = fmt(v); this.values[s.key] = v; this.preset = null; pre.querySelectorAll('button').forEach((b) => b.classList.remove('on')); };
        inp.onchange = () => this.set({ [s.key]: parseFloat(inp.value) }, null);
        rows.appendChild(r);
      });
      n.querySelector('.close').onclick = () => this.close();
      n.querySelector('[data-a=reset]').onclick = () => { const d = {}; this.schema.forEach((s) => { d[s.key] = s.value; }); this.set(d, null); };
      n.querySelector('[data-a=mute]').onclick = () => { Kit.sfx.toggle(); this.render(); };
      n.querySelector('[data-a=story]').onclick = () => { Kit.story.reset(); Kit.toast(Kit.tr('Story reset', '剧情进度已清空')); };
      ui.stage.appendChild(n); this.node = n;
    },
  };

  /* ---------- toast / countdown ---------- */
  Kit.toast = function (text) {
    const t = $(`<div class="kit-toast">${Kit.esc(text)}</div>`);
    ui.stage.appendChild(t); setTimeout(() => t.remove(), 1900);
  };
  Kit.countdown = async function (n) {
    n = n || 3;
    const box = $('<div class="kit-count"></div>'); ui.overlay.appendChild(box);
    for (let i = n; i > 0; i--) { box.innerHTML = `<span>${i}</span>`; Kit.sfx.play('count'); await Kit.wait(700); }
    box.innerHTML = lang === 'zh' ? '<span class="go cjk">开始！</span>' : '<span class="go">Go!</span>'; Kit.sfx.play('go'); await Kit.wait(450); box.remove();
  };

  /* ---------- portraits (original characters, illustrated SVG) ---------- */
  const CAST = {
    luyu: { name: 'Jace', zh: '杰斯', skin: '#f0cdb3', skin2: '#d3a389', hair: '#5e4128', hair2: '#b08a5a', eye: '#6d8aa3', shirt: '#0f0d13', shirt2: '#2b2533', accent: '#d6d6e0', style: 'm', stubble: true },
    me: { name: 'You', zh: '你', skin: '#f6dccb', skin2: '#dcae96', hair: '#7a3b22', hair2: '#b8683e', eye: '#6c8a52', shirt: '#e9d6c8', shirt2: '#b99a88', accent: '#f4a6c6', style: 'f', freckles: true },
    tang: { name: 'Viv', zh: '薇薇安', skin: '#f1d2bf', skin2: '#d0a38c', hair: '#b48a52', hair2: '#e6c992', eye: '#5a7aa0', shirt: '#2a2236', shirt2: '#4a3d5a', accent: '#d9b892', style: 'bob' },
    fan: { name: 'Fan', zh: '粉丝', skin: '#c58c62', skin2: '#9e6a46', hair: '#2a1a14', hair2: '#5a3a2a', eye: '#4a3222', shirt: '#f4a6c6', shirt2: '#b9708f', accent: '#ffffff', style: 'pony' },
  };
  Kit.cast = CAST;
  /* painted portraits (ComfyUI, Aniverse 2.5D); the SVG drawing stays as the fallback (e.g. fans) */
  const PHOTO = {
    luyu: { file: 'jace', moods: { normal: 'normal', smile: 'smile', happy: 'smile', blush: 'blush', surprised: 'surprised', angry: 'angry', sad: 'sad' } },
    me: { file: 'you', moods: { normal: 'normal', smile: 'smile', happy: 'smile', blush: 'blush', surprised: 'surprised', sad: 'sad', angry: 'sad' } },
    tang: { file: 'viv', moods: { normal: 'normal', smile: 'smile', happy: 'smile', blush: 'smile', surprised: 'surprised', angry: 'angry', sad: 'normal' } },
  };
  Kit.photo = (who, mood) => {
    const p = PHOTO[who];
    if (!p) return null;
    return `${SITE_BASE}assets/portraits/${p.file}_${p.moods[mood || 'normal'] || 'normal'}.jpg`;
  };
  // warm the cache so a mood swap never flashes empty
  Kit.preloadPhotos = () => Object.keys(PHOTO).forEach((w) => Object.values(PHOTO[w].moods).forEach((m) => { const i = new Image(); i.src = `${SITE_BASE}assets/portraits/${PHOTO[w].file}_${m}.jpg`; }));
  let svgSeq = 0;
  /* face outlines: 'm' has a firmer jaw, the others a softer chin */
  const FACE = {
    m: 'M66 112 C66 70 88 50 115 50 C142 50 164 70 164 112 C164 140 160 160 151 176 C143 190 129 199 115 199 C101 199 87 190 79 176 C70 160 66 140 66 112Z',
    soft: 'M70 116 C70 76 90 54 115 54 C140 54 160 76 160 116 C160 144 152 164 139 178 C130 188 122 193 115 193 C108 193 100 188 91 178 C78 164 70 144 70 116Z',
  };
  /* one eye drawn in local space with the outer corner at +x; the left eye is mirrored */
  function eye(cx, mood, fem, id, mirror, browColor) {
    const sx = mirror ? -1 : 1;
    const open = mood === 'surprised' ? 1.22 : mood === 'sad' ? 0.84 : 1;
    const brow = mood === 'sad' ? 'M-12 -18 Q0 -17 13 -12' : mood === 'angry' ? 'M-12 -11 Q0 -15 13 -18' : fem ? 'M-11 -15 Q2 -21 13 -14' : 'M-13 -12 Q0 -17 14 -13';
    const browEl = `<ellipse cx="1" cy="-7" rx="14" ry="6" fill="#3a2018" opacity="${fem ? 0.07 : 0.12}"/>
      <path d="${brow}" stroke="${browColor}" stroke-width="${fem ? 2.2 : 3.8}" fill="none" stroke-linecap="round"/>`;
    let body;
    if (mood === 'smile' || mood === 'happy') {
      body = `<path d="M-11 1 Q1 -7 12 0" stroke="#1c1010" stroke-width="2.6" fill="none" stroke-linecap="round"/>${fem ? '<path d="M12 0 l4 -2.5" stroke="#1c1010" stroke-width="1.8" stroke-linecap="round"/>' : ''}`;
    } else {
      body = `<g transform="scale(1 ${open})">
        <path d="M-11 1 Q-2 -7 12 -1 Q3 5 -11 1Z" fill="#f7efe9"/>
        <circle cx="0.5" cy="-0.6" r="5.4" fill="url(#i${id})"/><circle cx="0.5" cy="-0.6" r="2.3" fill="#0b0606"/>
        <circle cx="2.4" cy="-3" r="1.5" fill="#fff"/><circle cx="-1.6" cy="1.4" r=".75" fill="#fff" opacity=".8"/>
        <path d="M-12 1.5 Q-2 -9.5 13 -1.5" stroke="#1c1010" stroke-width="${fem ? 2.7 : 2.4}" fill="none" stroke-linecap="round"/>
        ${fem ? '<path d="M12.5 -1.5 l4.2 -3.6 M10 -3.5 l3 -3.4" stroke="#1c1010" stroke-width="1.6" stroke-linecap="round"/>' : ''}
        <path d="M-8 4 Q2 7 10 2" stroke="rgba(90,45,45,.35)" stroke-width="1" fill="none"/>
        <path d="M-10 -6 Q1 -12 12 -5" stroke="rgba(80,42,36,.55)" stroke-width="1.3" fill="none"/></g>`;
    }
    return `<g transform="translate(${cx} 126) scale(${sx} 1)">${browEl}${body}</g>`;
  }
  function mouth(mood, fem) {
    const lip = fem ? '#c9606e' : '#a65a5e';
    if (mood === 'surprised') return `<ellipse cx="115" cy="173" rx="4.2" ry="5.4" fill="#7a3038"/>`;
    if (mood === 'sad' || mood === 'angry') return `<path d="M107 175 Q115 170 123 175" stroke="${lip}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    if (mood === 'smile' || mood === 'happy') return `<path d="M104 169 Q115 181 126 169 Q115 173 104 169Z" fill="#8a3640"/><path d="M106.5 170.5 Q115 173.5 123.5 170.5" stroke="#fff" stroke-width="1.6" opacity=".85"/>`;
    return `<path d="M106 171.5 Q110 169.5 115 171 Q120 169.5 124 171.5" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M107.5 173 Q115 ${fem ? 179.5 : 177.5} 122.5 173 Q115 175 107.5 173Z" fill="${lip}" opacity="${fem ? 0.75 : 0.45}"/>`;
  }
  function hair(c, part, id) {
    const s = c.style, fill = `url(#h${id})`, hi = c.hair2;
    const sheen = (d) => `<path d="${d}" stroke="${hi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/>`;
    if (part === 'back') {
      if (s === 'f') return `<path d="M66 110 C56 170 58 240 74 296 L156 296 C172 240 174 170 164 110Z" fill="${fill}"/>`;
      if (s === 'bob') return `<path d="M64 108 C56 150 60 196 76 214 L154 214 C170 196 174 150 166 108Z" fill="${fill}"/>`;
      if (s === 'pony') return `<path d="M150 62 C198 72 204 152 180 204 C176 162 170 112 146 82Z" fill="${fill}"/>`;
      return `<path d="M64 128 C56 78 82 40 118 40 C154 40 180 76 170 128 C172 142 169 152 164 158 L159 146 L153 160 L148 146 L84 146 L80 160 L74 146 L69 156 C63 148 61 138 64 128Z" fill="${fill}"/>`;
    }
    if (s === 'm') {
      return `<path d="M62 128 C54 84 74 44 116 40 C158 40 180 80 170 130 C166 112 162 100 156 94 C158 110 154 122 148 128 C148 110 142 98 134 92 C132 106 122 114 108 116 C114 104 112 94 108 88 C98 102 84 110 72 112 C68 118 64 124 62 128Z" fill="${fill}"/>
        <path d="M63 116 C58 132 59 146 64 156 L67 146 L70 152 C70 138 72 126 76 118Z M169 116 C174 132 173 146 168 156 L165 146 L162 152 C162 138 160 126 156 118Z" fill="${fill}"/>
        ${sheen('M84 58 C100 46 128 44 150 58')}
        <path d="M96 60 C106 74 106 90 102 100 M120 56 C130 70 134 86 128 98 M144 64 C156 78 160 94 156 106 M78 84 C76 96 74 104 70 112" stroke="${hi}" stroke-width="1.4" fill="none" opacity=".6"/>`;
    }
    if (s === 'f') {
      return `<path d="M68 124 C60 78 84 46 116 44 C150 44 172 72 164 124 C160 104 152 92 142 86 C140 104 130 114 120 118 C126 104 124 92 118 84 C108 100 92 110 76 114 C72 118 70 122 68 124Z" fill="${fill}"/>
        <path d="M68 118 C62 150 64 190 72 216 C76 190 76 150 79 122Z M162 118 C168 150 166 190 158 216 C154 190 154 150 151 122Z" fill="${fill}"/>
        ${sheen('M88 60 C104 50 128 48 148 60')}`;
    }
    if (s === 'bob') {
      return `<path d="M66 120 C60 76 84 46 116 46 C148 46 172 76 164 120 C162 106 158 98 152 94 L80 94 C74 100 68 110 66 120Z" fill="${fill}"/>
        <path d="M66 114 C62 150 66 190 78 206 C80 180 80 150 81 118Z M164 114 C168 150 164 190 152 206 C150 180 150 150 149 118Z" fill="${fill}"/>
        ${sheen('M88 62 C104 52 128 52 146 62')}`;
    }
    return `<path d="M66 120 C60 78 84 48 116 46 C148 46 170 76 164 118 C158 100 146 88 128 84 C114 92 94 98 74 102 C70 108 68 114 66 120Z" fill="${fill}"/>
      ${sheen('M90 60 C106 50 128 50 146 60')}`;
  }
  function outfit(c, id) {
    const body = `<path d="M24 300 C28 248 54 224 92 214 L115 236 L138 214 C176 224 202 248 206 300Z" fill="url(#s${id})"/>`;
    if (c.style === 'm') {
      return `${body}<path d="M96 213 L115 236 L134 213 L130 210 Q115 222 100 210Z" fill="#1a171f"/>
        <path d="M90 214 L100 270 L115 236Z M140 214 L130 270 L115 236Z" fill="${c.shirt2}" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
        <path d="M100 270 L103 300 M130 270 L127 300" stroke="rgba(255,255,255,.1)" stroke-width="1.2"/>
        <path d="M101 219 Q115 236 129 219" stroke="${c.accent}" stroke-width="1.6" fill="none" opacity=".85"/>
        <path d="M108 226 Q115 240 122 226" stroke="${c.accent}" stroke-width="1" fill="none" opacity=".6"/>`;
    }
    if (c.style === 'bob') {
      const inner = '#efe3da';
      return `${body}<path d="M96 213 L115 240 L134 213 L130 210 Q115 222 100 210Z" fill="${inner}"/>
        <path d="M92 214 L104 264 L115 238Z M138 214 L126 264 L115 238Z" fill="${c.shirt2}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
`;
    }
    if (c.style === 'f') {
      return `${body}<path d="M97 212 Q115 230 133 212 L129 227 Q115 239 101 227Z" fill="#fff6ef" opacity=".85"/>
        <path d="M106 226 Q115 238 124 226" stroke="${c.accent}" stroke-width="1" fill="none"/><circle cx="115" cy="238" r="2.4" fill="${c.accent}"/>`;
    }
    return `${body}<path d="M92 214 Q115 234 138 214" stroke="${c.shirt2}" stroke-width="5" fill="none"/>`;
  }
  const speckle = (n, seed, box, r, color, op) => {
    let x = seed, out = '';
    const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    for (let i = 0; i < n; i++) {
      const px = box[0] + rnd() * box[2], py = box[1] + rnd() * box[3];
      out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r * (0.6 + rnd() * 0.6)).toFixed(2)}" fill="${color}" opacity="${op}"/>`;
    }
    return out;
  };
  // soft shadow first, then fine low-contrast grain so it reads as stubble, not spots
  const STUBBLE = '<path d="M86 166 C92 186 104 196 115 197 C126 196 138 186 144 166 C138 180 128 190 115 191 C102 190 92 180 86 166Z M103 166 Q115 163 127 166 Q115 170 103 166Z" fill="#4a3020" opacity=".14"/>'
    + speckle(140, 7, [88, 168, 54, 26], 0.45, '#4a3020', 0.16) + speckle(40, 11, [102, 163, 26, 6], 0.4, '#4a3020', 0.16);
  const FRECKLES = speckle(14, 3, [82, 140, 18, 10], 0.9, '#b5704e', 0.45) + speckle(14, 5, [130, 140, 18, 10], 0.9, '#b5704e', 0.45);
  Kit.portraitSVG = function (who, mood, extra) {
    const photo = Kit.photo(who, mood);
    if (photo) return `<img class="kit-photo" src="${photo}" alt="" draggable="false">`;
    return Kit.drawnPortrait(who, mood, extra);
  };
  Kit.drawnPortrait = function (who, mood, extra) {
    const c = CAST[who] || CAST.fan; mood = mood || 'normal'; extra = extra || {};
    const id = ++svgSeq;
    const fem = c.style !== 'm';
    const face = c.style === 'm' ? FACE.m : FACE.soft;
    const blush = mood === 'blush' || extra.blush;
    const browColor = c.style === 'f' || c.style === 'pony' ? c.hair : '#1a1214';
    const glasses = extra.glasses ? `<g fill="rgba(12,10,16,.92)" stroke="#000" stroke-width="1.5"><rect x="78" y="116" width="32" height="20" rx="9"/><rect x="120" y="116" width="32" height="20" rx="9"/></g><path d="M110 124 h10" stroke="#000" stroke-width="2.5"/><path d="M84 120 l8 0" stroke="#fff" stroke-width="2" opacity=".35"/>` : '';
    const cap = extra.cap ? `<path d="M60 98 q4 -62 56 -62 q56 0 58 62 z" fill="#14111a"/><path d="M118 92 q48 -4 78 12 q-28 10 -78 4z" fill="#211c29"/><path d="M82 56 q34 -14 70 0" stroke="#2c2636" stroke-width="2" fill="none"/>` : '';
    const mask = extra.mask ? `<path d="M76 150 Q115 172 154 150 L150 182 Q115 204 80 182Z" fill="#e9e6ee" stroke="#c8c3d2" stroke-width="1.5"/><path d="M84 162 Q115 178 146 162" stroke="#d6d1de" stroke-width="1" fill="none"/>` : '';
    return `<svg viewBox="0 0 230 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="f${id}" cx="42%" cy="40%" r="68%"><stop offset="0" stop-color="${c.skin}"/><stop offset=".72" stop-color="${c.skin}"/><stop offset="1" stop-color="${c.skin2}"/></radialGradient>
        <radialGradient id="i${id}" cx="45%" cy="60%" r="60%"><stop offset="0" stop-color="#e8e2d6"/><stop offset=".35" stop-color="${c.eye || '#4a2c22'}"/><stop offset="1" stop-color="#1c2028"/></radialGradient>
        <linearGradient id="h${id}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${c.hair2}"/><stop offset=".45" stop-color="${c.hair}"/><stop offset="1" stop-color="${c.hair}"/></linearGradient>
        <linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.shirt2}"/><stop offset="1" stop-color="${c.shirt}"/></linearGradient>
        <linearGradient id="n${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.skin2}"/><stop offset="1" stop-color="${c.skin}"/></linearGradient>
        <linearGradient id="r${id}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#f4a6c6" stop-opacity=".5"/><stop offset=".32" stop-color="#f4a6c6" stop-opacity="0"/></linearGradient>
        <linearGradient id="k${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".58" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#1a0c18" stop-opacity=".48"/></linearGradient>
        <filter id="c${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values=".7 .04 0 0 .03  .02 .62 .02 0 .015  .04 .02 .7 0 .05  0 0 0 1 0" result="grade"/>
          <feOffset in="SourceAlpha" dx="-3" dy="-2" result="off"/>
          <feComposite in="SourceAlpha" in2="off" operator="out" result="edgeL"/>
          <feGaussianBlur in="edgeL" stdDeviation="1.3" result="edgeLb"/>
          <feFlood flood-color="#f4a6c6" flood-opacity=".9"/><feComposite in2="edgeLb" operator="in" result="rimL"/>
          <feOffset in="SourceAlpha" dx="3" dy="-1" result="off2"/>
          <feComposite in="SourceAlpha" in2="off2" operator="out" result="edgeR"/>
          <feGaussianBlur in="edgeR" stdDeviation="1.6" result="edgeRb"/>
          <feFlood flood-color="#e6c9a4" flood-opacity=".5"/><feComposite in2="edgeRb" operator="in" result="rimR"/>
          <feMerge><feMergeNode in="grade"/><feMergeNode in="rimL"/><feMergeNode in="rimR"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#c${id})">
      ${hair(c, 'back', id)}
      ${outfit(c, id)}
      <path d="M100 172 L100 218 Q115 228 130 218 L130 172Z" fill="url(#n${id})"/>
      <path d="M98 186 Q115 206 132 186 L132 200 Q115 214 98 200Z" fill="#000" opacity=".16"/>
      <ellipse cx="67" cy="132" rx="6.5" ry="11" fill="${c.skin2}"/><ellipse cx="163" cy="132" rx="6.5" ry="11" fill="${c.skin2}"/>
      ${c.style === 'm' ? '<circle cx="164" cy="138" r="2.2" fill="none" stroke="#e6e6ee" stroke-width="1.4"/><circle cx="162" cy="128" r="1.3" fill="#e6e6ee"/>' : ''}
      <path d="${face}" fill="url(#f${id})"/>
      <path d="${face}" fill="url(#r${id})"/>
      <path d="${face}" fill="url(#k${id})"/>
      ${c.style === 'm' ? '<path d="M84 160 C92 182 104 192 115 193 C126 192 138 182 146 160 C140 176 128 186 115 187 C102 186 90 176 84 160Z" fill="#3a2430" opacity=".14"/>' : ''}
      ${blush ? '<ellipse cx="89" cy="152" rx="11" ry="5.5" fill="#ff8fa3" opacity=".34"/><ellipse cx="141" cy="152" rx="11" ry="5.5" fill="#ff8fa3" opacity=".34"/>' : ''}
      ${extra.glasses ? '' : eye(93, mood, fem, id, true, browColor) + eye(137, mood, fem, id, false, browColor)}
      <path d="M110.5 128 Q109 146 106.5 154" stroke="#a8705c" stroke-width="1.3" fill="none" opacity=".5" stroke-linecap="round"/>
      <path d="M120 128 Q122 144 124 152 L120 154Z" fill="#000" opacity=".07"/>
      <path d="M106.5 155 Q109.5 161 115 161.5 Q120.5 161 123.5 155" stroke="#a46c57" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M109.5 158.5 q2 1.6 3.6 .8 M117 159.3 q1.6 .8 3.6 -.8" stroke="#6e4034" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <ellipse cx="115" cy="153" rx="3.2" ry="2" fill="#fff" opacity=".12"/>
      ${c.stubble && !extra.mask ? STUBBLE : ''}${c.freckles ? FRECKLES : ''}
      ${extra.mask ? '' : mouth(mood, fem)}
      ${hair(c, 'front', id)}${glasses}${mask}${cap}
      ${mood === 'sad' ? '<path d="M147 136 q4 8 0 12 q-4 -4 0 -12z" fill="#bfe3ff" opacity=".9"/>' : ''}
      </g>
    </svg>`;
  };

  /* ---------- scene backdrops for dialogue (painted, cinematic) ---------- */
  Kit.scenes = {
    night: 'radial-gradient(ellipse at 70% 20%, rgba(244,166,198,.25), transparent 45%), radial-gradient(ellipse at 20% 80%, rgba(80,60,140,.35), transparent 50%), linear-gradient(180deg,#1a1222 0%,#0b0a0f 100%)',
    street: 'radial-gradient(circle at 15% 30%, rgba(255,120,170,.35) 0 6%, transparent 18%), radial-gradient(circle at 85% 22%, rgba(120,200,255,.28) 0 5%, transparent 16%), radial-gradient(circle at 60% 55%, rgba(255,210,140,.22) 0 4%, transparent 14%), linear-gradient(180deg,#22142a 0%,#120c16 60%,#0b0a0f 100%)',
    rooftop: 'radial-gradient(ellipse at 50% 110%, rgba(255,190,120,.25), transparent 55%), radial-gradient(circle at 20% 35%, rgba(255,214,160,.35) 0 2%, transparent 7%), radial-gradient(circle at 75% 30%, rgba(255,214,160,.3) 0 2%, transparent 7%), linear-gradient(180deg,#0e1430 0%,#2a1a36 60%,#140c16 100%)',
    backstage: 'radial-gradient(circle at 12% 28%, rgba(255,226,170,.5) 0 3%, transparent 9%), radial-gradient(circle at 88% 28%, rgba(255,226,170,.5) 0 3%, transparent 9%), radial-gradient(circle at 12% 48%, rgba(255,226,170,.4) 0 3%, transparent 9%), radial-gradient(circle at 88% 48%, rgba(255,226,170,.4) 0 3%, transparent 9%), linear-gradient(180deg,#2a1820 0%,#140c12 100%)',
    phone: 'radial-gradient(ellipse at 50% 30%, rgba(160,190,255,.25), transparent 50%), linear-gradient(180deg,#141526 0%,#0b0a0f 100%)',
  };

  /* ---------- dialogue (series-player style) ----------
   * lines: [{who:'luyu'|'me'|'tang'|'fan'|'narr', mood, text (EN), zh, extra:{glasses,cap,mask},
   *          name, scene, prompt, choices:[{text, zh|sub, value}]}]
   * opts: {bg: css background or Kit.scenes key, caption}
   * resolves with {choices:[values...]} */
  let dialogueCount = 0;
  Kit.dialogue = function (lines, opts) {
    opts = opts || {};
    const bgOf = (b) => (b && Kit.scenes[b]) || b || Kit.scenes.night;
    Kit.preloadPhotos();
    return new Promise((resolve) => {
      const bokeh = [[18, 22, 90, 'rgba(244,166,198,.55)'], [78, 18, 70, 'rgba(150,180,255,.45)'], [62, 48, 54, 'rgba(255,214,160,.5)'], [10, 58, 60, 'rgba(255,214,160,.35)'], [88, 62, 80, 'rgba(244,166,198,.35)'], [40, 12, 40, 'rgba(255,240,220,.4)']]
        .map(([x, y, s, c], k) => `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;background:radial-gradient(circle,${c},transparent 70%);animation-delay:${-k * 2.3}s"></i>`).join('');
      const root = $(`<div class="kit-dlg"><div class="kit-dlg-bg"></div><div class="kit-bokeh">${bokeh}</div><div class="kit-shot out"></div>
        <div class="kit-grain" style="opacity:.1"></div><div class="kit-dlg-caption"></div>
        <button class="kit-skip">${Kit.tr('Skip ▸▸', '跳过 ▸▸')}</button>
        <div class="kit-dock"><div class="kit-name"></div><div class="kit-box kit-glass"><div class="kit-text"></div><div class="kit-next">${Kit.tr('tap ▾', '点击继续 ▾')}</div></div><div class="kit-choices"></div></div></div>`);
      const bgEl = root.querySelector('.kit-dlg-bg');
      bgEl.style.background = bgOf(opts.bg);
      root.querySelector('.kit-grain').style.backgroundImage = `url(${Kit.grain()})`;
      root.querySelector('.kit-dlg-caption').textContent = Kit.loc(opts.caption || '');
      ui.overlay.appendChild(root);
      const shot = root.querySelector('.kit-shot');
      const nameEl = root.querySelector('.kit-name'), textEl = root.querySelector('.kit-text'), chEl = root.querySelector('.kit-choices'), nextEl = root.querySelector('.kit-next');
      let i = -1, typing = null, waitingChoice = false, lastWho = null;
      const picked = [];
      const finish = () => {
        clearInterval(typing); root.remove();
        // only the first dialogue of a page is the intro; later ones (endings) get their own event
        Kit.track(dialogueCount++ === 0 ? 'intro_complete' : 'dialogue_complete', { lines: lines.length, choices: picked });
        resolve({ choices: picked });
      };
      const show = () => {
        i++;
        if (i >= lines.length) return finish();
        const ln = lines[i];
        if (ln.scene) bgEl.style.background = bgOf(ln.scene);
        const [main, second] = Kit.pair(ln.text, ln.zh, ln.en);
        const narr = ln.who === 'narr';
        if (!narr) {
          const key = ln.who + (ln.mood || '') + JSON.stringify(ln.extra || {});
          if (key !== lastWho) {
            const svg = Kit.portraitSVG(ln.who, ln.mood, ln.extra);
            shot.classList.toggle('full', !!Kit.photo(ln.who, ln.mood));
            const push = shot.querySelector('.push');
            if (!lastWho || lastWho.indexOf(ln.who) !== 0 || !push) {
              // new speaker: fresh slow push-in
              shot.innerHTML = `<div class="push">${svg}</div>`;
              shot.classList.add('out'); requestAnimationFrame(() => requestAnimationFrame(() => shot.classList.remove('out')));
            } else { push.innerHTML = svg; shot.classList.remove('out'); } // same speaker, new mood: keep the camera move going
            lastWho = key;
          }
        } else { shot.classList.add('out'); lastWho = null; }
        const c = CAST[ln.who];
        const nm = narr ? '' : ln.name ? Kit.loc(ln.name) : c ? (lang === 'zh' ? c.zh : c.name) : ln.who;
        nameEl.textContent = nm;
        nameEl.className = 'kit-name' + (narr ? ' narr' : '') + (hasCJK(nm) ? ' cjk' : '');
        nameEl.style.fontFamily = hasCJK(nm) ? 'var(--f-serif)' : '';
        nameEl.style.fontSize = hasCJK(nm) ? '24px' : '';
        textEl.className = 'kit-text' + (narr ? ' serif' : '');
        textEl.innerHTML = ''; chEl.innerHTML = ''; nextEl.style.display = 'none';
        let k = 0;
        clearInterval(typing);
        const done = () => {
          clearInterval(typing); typing = null;
          textEl.innerHTML = Kit.esc(main) + sub(second);
          if (ln.choices) {
            waitingChoice = true;
            ln.choices.forEach((ch, idx) => {
              const [cm, cs] = Kit.pair(ch.text, ch.zh, ch.en);
              const b = $(`<button class="kit-choice" style="animation-delay:${idx * 0.07}s">${Kit.esc(cm)}${ch.sub && Kit.loc(ch.sub) ? `<small>${Kit.esc(Kit.loc(ch.sub))}</small>` : ''}</button>`);
              b.onclick = (e) => { e.stopPropagation(); Kit.sfx.play('good'); picked.push(ch.value); Kit.track('story_choice', { value: ch.value }); waitingChoice = false; show(); };
              chEl.appendChild(b);
            });
          } else nextEl.style.display = '';
        };
        show.done = done;
        typing = setInterval(() => {
          k += 2; textEl.textContent = main.slice(0, k);
          if (k % 6 === 0) Kit.sfx.play('blip');
          if (k >= main.length) done();
        }, 24);
      };
      root.addEventListener('click', () => {
        if (waitingChoice) return;
        if (typing) { show.done(); return; }
        Kit.sfx.play('tap'); show();
      });
      root.querySelector('.kit-skip').onclick = (e) => {
        e.stopPropagation();
        // never skip past a choice that is on screen (or still typing)
        if (lines[i] && lines[i].choices) { if (typing) show.done(); return; }
        clearInterval(typing); typing = null;
        let j = i + 1; while (j < lines.length && !lines[j].choices) j++;
        if (j < lines.length) { i = j - 1; show(); } else finish();
      };
      show();
    });
  };

  /* ---------- tutorial card ----------
   * {chapter, title, zh|en, goal, goalZh, items:[{icon, text, zh}], modifier, modifierZh} → resolves on Start */
  Kit.tutorial = function (o) {
    const [t, ts] = Kit.pair(o.title, o.zh, o.en);
    const titleHtml = hasCJK(t) ? `<h2 style="font-family:var(--f-serif);font-weight:600;font-size:30px">${Kit.esc(t)}</h2>` : `<h2>${Kit.esc(t)}</h2>`;
    return new Promise((resolve) => {
      const n = $(`<div class="kit-scrim"><div class="kit-card kit-tut">
        <div class="kicker">${Kit.esc(Kit.tr(o.chapter || 'Mini-game', o.chapterZh || (lang === 'zh' && !hasCJK(o.chapter || '') ? '小游戏' : '')))}</div>
        ${titleHtml}${ts ? `<div class="subt">${Kit.esc(ts)}</div>` : ''}
        <div class="goal">${Kit.esc(Kit.tr(o.goal, o.goalZh))}</div>
        <ul>${(o.items || []).map((it) => `<li><span class="ic">${it.icon}</span><span>${Kit.tr(it.text, it.zh)}</span></li>`).join('')}</ul>
        ${o.modifier ? `<div class="mod">${Kit.tr(o.modifier, o.modifierZh)}</div>` : ''}
        <button class="kit-btn primary">${Kit.esc(Kit.tr(o.start || 'Start', o.startZh || '开始'))}</button></div></div>`);
      n.querySelector('button').onclick = () => { Kit.sfx.play('good'); n.remove(); resolve(); };
      ui.overlay.appendChild(n);
    });
  };

  /* ---------- result + optional retry economy ----------
   * o: {success, title, zh|en, stars(0-3), stats:[{label,value}], branch:{title, text, zh|en},
   *     boosters:[{id, name, desc, price}], allowRetry:true}
   * resolves with {action:'continue'} | {action:'retry', via:'free'|'ad'|'iap', booster} */
  const retryState = { free: 1, ads: 2 };
  Kit.resetRetries = (free, ads) => { retryState.free = free == null ? 1 : free; retryState.ads = ads == null ? 2 : ads; };
  Kit.result = function (o) {
    Kit.track('play_end', { success: !!o.success, stars: o.stars || 0, stats: (o.stats || []).reduce((a, s) => (a[s.key || s.label] = s.raw != null ? s.raw : s.value, a), {}) });
    Kit.sfx.play(o.success ? 'win' : 'lose');
    const [t, ts] = Kit.pair(o.title, o.zh, o.en);
    const br = o.branch ? Kit.pair(o.branch.text, o.branch.zh, o.branch.en) : null;
    return new Promise((resolve) => {
      const stars = [0, 1, 2].map((k) => `<span class="${k < (o.stars || 0) ? 'on' : ''}" style="animation-delay:${0.25 + k * 0.15}s">★</span>`).join('');
      const n = $(`<div class="kit-scrim"><div class="kit-card">
        <div class="kit-res-head"><span class="kit-res-badge ${o.success ? 'win' : 'lose'}">${o.success ? Kit.tr('Success', '成功') : Kit.tr('Story branch', '剧情支线')}</span>
        <div class="kit-res-title" ${hasCJK(t) ? 'style="font-family:var(--f-serif);font-weight:600;font-size:28px"' : ''}>${Kit.esc(t)}</div><div class="kit-res-sub">${Kit.esc(ts)}</div>
        <div class="kit-stars">${stars}</div></div>
        <div class="kit-stats">${(o.stats || []).map((s) => `<div class="kit-stat"><b>${Kit.esc(Kit.loc(s.value))}</b><span>${Kit.esc(Kit.loc(s.label))}</span></div>`).join('')}</div>
        ${o.branch ? `<div class="kit-branch"><b>${Kit.esc(Kit.loc(o.branch.title))}</b><br>${Kit.esc(br[0])}</div>` : ''}
        <div class="btns"></div>
        <div class="kit-note">${Kit.tr('Whatever you choose, the story goes on.', '无论成败，故事都会继续。')}</div>
      </div></div>`);
      const btns = n.querySelector('.btns');
      const add = (cls, html, fn, dis) => { const b = $(`<button class="kit-btn ${cls}">${html}</button>`); if (dis) b.disabled = true; b.onclick = () => { Kit.sfx.play('tap'); fn(); }; btns.appendChild(b); return b; };
      const close = (r) => { n.remove(); resolve(r); };
      add('primary', o.success ? Kit.tr('Continue the story', '继续剧情') : Kit.tr('Continue on this branch', '进入这条支线'), () => {
        Kit.track('story_continue', { success: !!o.success }); close({ action: 'continue' });
      });
      if (o.allowRetry !== false) {
        const Wl = Kit.wallet;
        const gemIco = `<span class="kw-ico">${(Kit.icon.gem || '')}</span>`, boltIco = `<span class="kw-ico">${(Kit.icon.bolt || '')}</span>`;
        if (retryState.free > 0) add('ghost', Kit.tr(`Try again · free (${retryState.free})`, `再来一次（免费 ${retryState.free} 次）`), () => { retryState.free--; Kit.track('retry', { via: 'free' }); close({ action: 'retry', via: 'free' }); });
        else if (!Wl) add('ad', Kit.tr(`▶ Watch an ad to retry (${retryState.ads} left)`, `▶ 看广告再来一次（剩 ${retryState.ads} 次）`), async () => {
          await Kit.mockAd(); retryState.ads--; Kit.track('retry', { via: 'ad' }); close({ action: 'retry', via: 'ad' });
        }, retryState.ads <= 0);
        else if (Wl.energy() > 0) add('ghost', lang === 'zh' ? `再来一次 · ${boltIco}1<small>剩余体力 ${Wl.energy()}</small>` : `Try again · ${boltIco}1<small>${Wl.energy()} energy left</small>`, () => {
          Wl.spendEnergy(1, 'retry'); Kit.track('retry', { via: 'energy' }); close({ action: 'retry', via: 'energy' });
        });
        else add('ad', Kit.tr('▶ Out of energy · watch an ad to retry', '▶ 体力用完 · 看广告补 1 点再来'), async () => {
          await Kit.mockAd(); retryState.ads--; Wl.addEnergy(1, 'ad'); Wl.spendEnergy(1, 'retry'); Kit.track('retry', { via: 'ad' }); close({ action: 'retry', via: 'ad' });
        }, retryState.ads <= 0);
        (o.boosters || []).forEach((bo) => add('iap', `✦ ${Kit.esc(Kit.loc(bo.name))} · ${Wl ? `${gemIco}${Wl.gemsFor(bo)}` : Kit.esc(bo.price)}<small>${Kit.esc(Kit.loc(bo.desc))}</small>`, async () => {
          const ok = await Kit.mockPurchase(bo); if (!ok) return;
          Kit.track('retry', { via: 'iap', booster: bo.id }); close({ action: 'retry', via: 'iap', booster: bo.id });
        }));
      }
      ui.overlay.appendChild(n);
    });
  };

  Kit.mockAd = function () {
    Kit.track('ad_start', {});
    return new Promise((resolve) => {
      const n = $(`<div class="kit-ad"><div class="tag">${Kit.tr('AD', '广告')}</div><div class="count">3</div>
        <div class="art">✨</div><div style="font-size:18px;font-weight:700">${Kit.tr('Your reward is on its way', '奖励马上到账')}</div><div style="font-size:12px;opacity:.6">${Kit.tr('Thanks for watching', '感谢观看')}</div></div>`);
      ui.stage.appendChild(n);
      let s = 3; const c = n.querySelector('.count');
      const iv = setInterval(() => { s--; c.textContent = s; if (s <= 0) { clearInterval(iv); n.remove(); Kit.track('ad_complete', {}); resolve(); } }, 1000);
    });
  };
  Kit.mockPurchase = function (item) {
    Kit.track('iap_view', { item: item.id });
    return new Promise((resolve) => {
      const n = $(`<div class="kit-scrim" style="align-items:flex-end;z-index:70"><div class="kit-sheet">
        <div style="font-size:10.5px;letter-spacing:2px;color:var(--champ);font-weight:700">${Kit.tr('PURCHASE', '购买')}</div>
        <div style="font-family:var(--f-serif);font-size:24px;font-weight:600;margin:6px 0">${Kit.esc(Kit.loc(item.name))}</div>
        <div style="font-size:14px;color:var(--muted)">${Kit.esc(Kit.loc(item.desc))}</div>
        <button class="kit-btn primary" data-a="buy">${Kit.tr(`Confirm ${Kit.esc(item.price)} · no charge`, `确认 ${Kit.esc(item.price)}（不扣费）`)}</button>
        <button class="kit-btn ghost" data-a="no">${Kit.tr('Cancel', '取消')}</button></div></div>`);
      n.querySelector('[data-a=buy]').onclick = () => { Kit.sfx.play('collect'); n.remove(); Kit.track('iap_complete', { item: item.id }); resolve(true); };
      n.querySelector('[data-a=no]').onclick = () => { n.remove(); Kit.track('iap_cancel', { item: item.id }); resolve(false); };
      ui.stage.appendChild(n);
    });
  };

  /* ---------- small canvas helpers ---------- */
  Kit.font = (w, px, fam) => `${w} ${px}px ${fam === 'serif' ? '"Cormorant Garamond", Georgia, serif' : fam === 'script' ? '"Great Vibes", cursive' : '"DM Sans", "Segoe UI", system-ui, "Microsoft YaHei", sans-serif'}`;
  Kit.draw = {
    roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
    heart(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35); ctx.bezierCurveTo(x - s * 0.5, y + s * 0.65, x, y + s * 0.8, x, y + s); ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.65, x + s * 0.5, y + s * 0.35); ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35); ctx.closePath(); },
    /* series-player style glass pill on canvas */
    glass(ctx, x, y, w, h, r) { Kit.draw.roundRect(ctx, x, y, w, h, r == null ? h / 2 : r); ctx.fillStyle = 'rgba(38,20,36,.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 1; ctx.stroke(); },
  };

  /* particles: Kit.particles() → {burst(x,y,opts), text(x,y,str,color,size), update(dt), draw(ctx)} */
  Kit.particles = function () {
    const ps = [];
    const textFont = (size) => Kit.font(800, size);
    return {
      list: ps,
      burst(x, y, o) {
        o = o || {};
        for (let i = 0; i < (o.n || 14); i++) {
          const a = Math.random() * Math.PI * 2, sp = Kit.rand(o.min || 60, o.max || 220);
          ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), life: o.life || 0.7, t: 0, size: Kit.rand(3, o.size || 7), color: o.colors ? o.colors[i % o.colors.length] : '#d9b892', shape: o.shape || 'dot', g: o.g == null ? 300 : o.g });
        }
      },
      text(x, y, str, color, size) { ps.push({ x, y, vx: 0, vy: -70, life: 0.9, t: 0, text: str, color: color || '#fff', size: size || 20, g: 0 }); },
      update(dt) { for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.t += dt; if (p.t >= p.life) { ps.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.98; } },
      draw(ctx) {
        ps.forEach((p) => {
          const k = 1 - p.t / p.life; ctx.globalAlpha = Math.max(0, k);
          if (p.text) { ctx.font = textFont(p.size); ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(11,10,15,.75)'; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); }
          else if (p.shape === 'heart') { ctx.fillStyle = p.color; Kit.draw.heart(ctx, p.x, p.y - p.size, p.size * 2 * k + 2); ctx.fill(); }
          else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k + 0.5, 0, Math.PI * 2); ctx.fill(); }
        });
        ctx.globalAlpha = 1;
      },
    };
  };

  window.Kit = Kit;
})();
