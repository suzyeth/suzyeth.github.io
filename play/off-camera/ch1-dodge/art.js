/* ch1 "Sneak Out" — canvas art, cinematic Sunset-Strip night street.
 * Performance model: everything static (street layers, road tile, shop strips, characters' walk
 * frames, pickups, HUD furniture, vignettes, glows) is baked once into offscreen canvases.
 * The frame loop only does drawImage, a few short paths and a handful of fillText calls:
 * no per-frame gradients, no shadowBlur. Exposes window.Ch1Art. */
(function () {
  'use strict';
  const W = 390, H = 780, TAU = Math.PI * 2;
  const LANES = [105, 195, 285];
  const PY = 640;
  const P = { black: '#0b0a0f', plum: '#2a1626', pink: '#f4a6c6', pink2: '#e889b0', champ: '#d9b892', champ2: '#a8825f', cream: '#f6efe9', cool: '#9fb4d8' };
  const GLASS = 'rgba(38,20,36,.72)', GLASS_LINE = 'rgba(255,255,255,.12)';
  const sans = (w, s) => Kit.font(w, s, 'sans');
  const script = (s) => Kit.font(400, s, 'script');
  /* one language at a time; English if the kit predates the i18n API */
  const lang = () => (Kit.lang ? Kit.lang() : 'en');
  const tr = (en, zh) => (Kit.tr ? Kit.tr(en, zh) : en);
  const NEON = [P.pink, P.champ, P.cool, P.pink2, P.cream];
  /* Sunset-Strip neon */
  const SIGNS = ['BAR', 'TATTOO', 'VINYL', 'DINER', 'MOTEL', 'TACOS', 'LIQUOR', 'OPEN 24H'];
  const SIGNS_ZH = ['酒吧', '纹身', '唱片', '餐馆', '汽车旅馆', '塔可', '酒水', '24小时'];
  const SR = 2; // sprite pixel ratio (the kit caps the game canvas at 2 as well)
  const RR = (ctx, x, y, w, h, r) => Kit.draw.roundRect(ctx, x, y, w, h, r);
  const ell = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); };
  const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };

  /* ---------- sprite helpers ---------- */
  function sprite(w, h, ax, ay, draw, ratio) {
    const r = ratio || SR, c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * r)); c.height = Math.max(1, Math.ceil(h * r));
    const g = c.getContext('2d');
    g.setTransform(r, 0, 0, r, 0, 0); g.translate(ax, ay);
    draw(g);
    return { c, w, h, ax, ay };
  }
  function blit(ctx, s, x, y, sx, sy) {
    sx = sx == null ? 1 : sx; sy = sy == null ? sx : sy;
    ctx.drawImage(s.c, x - s.ax * sx, y - s.ay * sy, s.w * sx, s.h * sy);
  }
  const glowCache = {};
  function glowSprite(color) {
    if (!glowCache[color]) {
      glowCache[color] = sprite(64, 64, 32, 32, (g) => {
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, 32);
        rg.addColorStop(0, color); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(-32, -32, 64, 64);
      }, 1);
    }
    return glowCache[color];
  }
  /* additive soft light from a cached sprite */
  function glow(ctx, x, y, r, color, a) {
    if (a <= 0.004) return;
    const s = glowSprite(color), old = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    ctx.globalAlpha = old * Math.min(1, a); ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(s.c, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = old; ctx.globalCompositeOperation = op;
  }
  /* cheap readable text: dark offset copy instead of shadowBlur */
  function text(ctx, str, x, y, f, color, align) {
    ctx.font = f; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillText(str, x, y + 1.5);
    ctx.fillStyle = color || '#fff'; ctx.fillText(str, x, y);
  }
  const mCache = new Map();
  function measure(ctx, f, str) {
    const k = f + '|' + str;
    let v = mCache.get(k);
    if (v == null) { if (mCache.size > 300) mCache.clear(); ctx.font = f; v = ctx.measureText(str).width; mCache.set(k, v); }
    return v;
  }
  function glassPath(ctx, x, y, w, h, r, fill, line) {
    RR(ctx, x, y, w, h, r);
    ctx.fillStyle = fill || GLASS; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = line || GLASS_LINE; ctx.stroke();
  }
  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  /* ---------- background: baked layers per route theme ---------- */
  const TILE = 960; // multiple of the lane-dash period (60) and both paving steps (64, 40)
  const STRIP_W = 150;
  let layers = {};
  function makeStrip(rnd) {
    const blocks = [];
    let y = 0;
    while (y < 1800) {
      const h = Math.floor(150 + rnd() * 110);
      const si = Math.floor(rnd() * SIGNS.length);
      blocks.push({ y, h, name: SIGNS[si], nameZh: SIGNS_ZH[si], color: NEON[Math.floor(rnd() * NEON.length)], win: rnd() > 0.35, dark: rnd() < 0.35 });
      y += h;
    }
    return { blocks, len: y };
  }
  function bakeStrip(strip, side, alley, zh) {
    // left strip covers x 0..150 (facade 0..56); right strip covers x 240..390 (facade 334..390)
    const fx = side === 'left' ? 0 : STRIP_W - 56, fw = 56;
    return sprite(STRIP_W, strip.len, 0, 0, (g) => {
      strip.blocks.forEach((b) => {
        const ys = b.y;
        const lit = alley ? b.win && !b.dark : b.win;
        g.fillStyle = alley ? '#151019' : '#1c1320'; g.fillRect(fx, ys, fw, b.h - 4);
        g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(side === 'left' ? fx + fw - 2 : fx, ys, 2, b.h - 4);
        if (lit) {
          const wy = ys + b.h * 0.5, wh = b.h * 0.36;
          const wg = g.createLinearGradient(0, wy, 0, wy + wh);
          wg.addColorStop(0, 'rgba(217,184,146,.5)'); wg.addColorStop(1, 'rgba(168,130,95,.15)');
          g.fillStyle = wg; g.fillRect(fx + 9, wy, fw - 18, wh);
          const sx = side === 'left' ? fx + fw : fx;
          const sg = g.createLinearGradient(sx, 0, side === 'left' ? sx + 90 : sx - 90, 0);
          sg.addColorStop(0, 'rgba(217,184,146,.16)'); sg.addColorStop(1, 'rgba(217,184,146,0)');
          g.fillStyle = sg; g.fillRect(side === 'left' ? sx : sx - 90, wy - 18, 90, wh + 36);
        }
        if (alley && b.dark) return;
        const sh = Math.min(b.h * 0.4, 92);
        g.save();
        g.shadowColor = b.color; g.shadowBlur = 12;
        g.strokeStyle = b.color; g.lineWidth = 1.5; g.globalAlpha = 0.9;
        RR(g, fx + 12, ys + 12, fw - 24, sh, 6); g.stroke();
        g.fillStyle = b.color; g.font = sans(700, 12); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.translate(fx + fw / 2, ys + 12 + sh / 2);
        if (zh) {
          // Chinese neon reads top-to-bottom, one character per row
          const chars = Array.from(b.nameZh), step = Math.min(14, (sh - 10) / chars.length);
          chars.forEach((ch, i) => g.fillText(ch, 0, (i - (chars.length - 1) / 2) * step + 1));
        } else {
          g.rotate(side === 'left' ? -Math.PI / 2 : Math.PI / 2);
          const tw = g.measureText(b.name).width, fit = Math.min(1, (sh - 12) / Math.max(1, tw));
          g.scale(fit, fit); g.fillText(b.name, 0, 1);
        }
        g.restore();
        const rx = side === 'left' ? fx + fw + 14 : fx - 14, rh = Math.min(sh * 2.2, b.h - 14);
        const rg = g.createLinearGradient(0, ys, 0, ys + rh);
        rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(0.4, b.color); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = alley ? 0.12 : 0.09; g.fillStyle = rg; g.fillRect(rx - 5, ys, 10, rh); g.globalAlpha = 1;
      });
    });
  }
  function themeLayers(theme) {
    const key = theme + '|' + lang(), zh = lang() === 'zh';
    if (layers[key]) return layers[key];
    const alley = theme === 'alley', rnd = seeded(alley ? 11 : 7);
    const L = {};
    L.under = sprite(W, H, 0, 0, (g) => {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, P.black); bg.addColorStop(0.35, alley ? '#1c1826' : '#2a1a2c'); bg.addColorStop(1, alley ? '#2c2638' : '#3c2638');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const sheen = g.createLinearGradient(56, 0, 334, 0);
      sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.5, 'rgba(246,239,233,.07)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sheen; g.fillRect(56, 0, 278, H);
      glow(g, W / 2, 560, 330, alley ? '#3c4058' : '#5a3a4c', 0.55);
      glow(g, 330, 160, 260, alley ? '#3a4a66' : '#5a2a44', 0.35);
      glow(g, 40, 420, 240, alley ? '#2a3550' : '#4a3226', 0.3);
    }, 1);
    L.road = sprite(278, TILE, 0, 0, (g) => {
      g.fillStyle = 'rgba(246,239,233,.035)';
      const step = alley ? 40 : 64;
      for (let y = 0; y < TILE; y += step) g.fillRect(0, y, 278, 1);
      g.fillStyle = 'rgba(246,239,233,.11)';
      for (let y = 0; y < TILE; y += 60) { g.fillRect(93.25, y, 1.5, 26); g.fillRect(183.25, y, 1.5, 26); }
      for (let i = 0; i < 5; i++) {
        const x = 24 + rnd() * 230, y = 60 + i * 180 + rnd() * 60, rx = 22 + rnd() * 28, ry = 7 + rnd() * 6;
        ell(g, x, y, rx, ry); g.fillStyle = 'rgba(159,180,216,.07)'; g.fill();
        glow(g, x - rx * 0.2, y, rx * 0.8, NEON[Math.floor(rnd() * NEON.length)], alley ? 0.18 : 0.12);
      }
    });
    L.left = bakeStrip(makeStrip(rnd), 'left', alley, zh);
    L.right = bakeStrip(makeStrip(rnd), 'right', alley, zh);
    L.over = sprite(W, H, 0, 0, (g) => {
      const fog = g.createLinearGradient(0, 0, 0, 300);
      fog.addColorStop(0, 'rgba(11,10,15,.7)'); fog.addColorStop(1, 'rgba(11,10,15,0)');
      g.fillStyle = fog; g.fillRect(0, 0, W, 300);
      const vg = g.createRadialGradient(W / 2, H * 0.6, H * 0.36, W / 2, H * 0.55, H * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,3,8,.75)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }, 1);
    layers[key] = L;
    return L;
  }

  function makeBg() {
    const rnd = seeded(5);
    return {
      off: 0, t: 0,
      bokeh: Array.from({ length: 16 }, () => ({ x: rnd() * W, y: rnd() * H, r: 12 + rnd() * 26, c: NEON[Math.floor(rnd() * NEON.length)], a: 0.08 + rnd() * 0.12, k: 0.2 + rnd() * 0.3 })),
      front: Array.from({ length: 4 }, () => ({ x: rnd() * W, y: rnd() * H, r: 40 + rnd() * 40, c: NEON[Math.floor(rnd() * NEON.length)], a: 0.06 + rnd() * 0.06, k: 1.5 + rnd() * 0.6 })),
      rain: Array.from({ length: 36 }, () => ({ x: rnd() * W, y: rnd() * H, l: 12 + rnd() * 18, v: 520 + rnd() * 300 })),
    };
  }
  function scrollBg(bg, speed, dt) {
    bg.off += speed * dt; bg.t += dt;
    for (let i = 0; i < bg.bokeh.length; i++) { const b = bg.bokeh[i]; b.y += speed * b.k * dt; if (b.y - b.r > H) { b.y = -b.r; b.x = Math.random() * W; } }
    for (let i = 0; i < bg.front.length; i++) { const b = bg.front[i]; b.y += speed * b.k * dt; if (b.y - b.r > H) { b.y = -b.r; b.x = Math.random() * W; } }
    for (let i = 0; i < bg.rain.length; i++) {
      const r = bg.rain[i];
      r.y += (r.v + speed * 0.4) * dt; r.x -= 60 * dt;
      if (r.y > H) { r.y = -20; r.x = Math.random() * (W + 60); }
    }
  }
  function drawBackground(ctx, bg, theme, sprint) {
    const L = themeLayers(theme);
    ctx.drawImage(L.under.c, 0, 0, W, H);
    const ro = bg.off % TILE;
    ctx.drawImage(L.road.c, 56, ro - TILE, 278, TILE);
    ctx.drawImage(L.road.c, 56, ro, 278, TILE);
    const ll = L.left.h, lo = bg.off % ll;
    ctx.drawImage(L.left.c, 0, lo - ll, STRIP_W, ll); ctx.drawImage(L.left.c, 0, lo, STRIP_W, ll);
    const rl = L.right.h, rof = (bg.off + 600) % rl;
    ctx.drawImage(L.right.c, W - STRIP_W, rof - rl, STRIP_W, rl); ctx.drawImage(L.right.c, W - STRIP_W, rof, STRIP_W, rl);
    for (let i = 0; i < bg.bokeh.length; i++) { const b = bg.bokeh[i]; glow(ctx, b.x, b.y, b.r, b.c, b.a); }
    if (sprint > 0) glow(ctx, W / 2, -40, 340, P.champ, 0.45 * sprint);
  }
  /* foreground: rain, close out-of-focus lights, fog + vignette (grain is the kit overlay) */
  function drawFront(ctx, bg, theme) {
    ctx.strokeStyle = 'rgba(220,225,245,.12)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < bg.rain.length; i++) { const r = bg.rain[i]; ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.l * 0.16, r.y + r.l); }
    ctx.stroke();
    for (let i = 0; i < bg.front.length; i++) { const b = bg.front[i]; glow(ctx, b.x, b.y, b.r, b.c, b.a); }
    ctx.drawImage(themeLayers(theme).over.c, 0, 0, W, H);
  }

  /* ---------- Jace (player): back 3/4 view, black leather jacket, messy dark hair, silver chain.
   * Disguise pieces show on him as they are collected: cap, sunglasses (temple arms), hoodie (hood up).
   * Every combination x walk frame is baked once. ---------- */
  const PLAYER_FRAMES_N = 12;
  let JACE = null;
  function drawJace(g, p, wear) {
    const sw = Math.sin(p * TAU), bob = -Math.abs(Math.cos(p * TAU)) * 1.4;
    const skin = '#f2d6c4';
    const HAIR = '#6b4a2e', HAIR_HI = '#b08a5a';
    ell(g, 0, 32, 17, 5.5); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
    // dark jeans + boots
    g.lineCap = 'round'; g.strokeStyle = '#2a2733'; g.lineWidth = 6.5;
    [[-5.5, 29 + sw * 3.5], [5.5, 29 - sw * 3.5]].forEach(([x, fy]) => {
      g.beginPath(); g.moveTo(x, 4); g.lineTo(x, fy); g.stroke();
      ell(g, x, fy + 1.5, 4.4, 3.2); g.fillStyle = '#0d0b10'; g.fill();
      ell(g, x, fy + 0.4, 2.6, 1.1); g.fillStyle = 'rgba(217,184,146,.35)'; g.fill();
    });
    g.save(); g.translate(0, bob);
    if (wear.hood) { RR(g, -12.5, 3, 25, 6, 2.5); g.fillStyle = '#5a4e62'; g.fill(); } // hoodie hem under the jacket
    // leather sleeves swing opposite the legs
    [[-1, sw], [1, -sw]].forEach(([sd, k]) => {
      g.strokeStyle = '#18151c'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(sd * 14, -13); g.quadraticCurveTo(sd * 18.5, -4, sd * 17, 4 + k * 4.5); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(sd * 15.5, -12); g.quadraticCurveTo(sd * 19.5, -4, sd * 18.2, 3 + k * 4.5); g.stroke();
      circle(g, sd * 17, 6 + k * 4.5, 2.6); g.fillStyle = skin; g.fill();
    });
    // cropped leather jacket
    g.beginPath();
    g.moveTo(-7, -21); g.quadraticCurveTo(-17.5, -20, -16.5, -11); g.lineTo(-14.5, 7.5);
    g.quadraticCurveTo(0, 10, 14.5, 7.5); g.lineTo(16.5, -11); g.quadraticCurveTo(17.5, -20, 7, -21); g.closePath();
    const jg = g.createLinearGradient(-16, -21, 16, 8);
    jg.addColorStop(0, '#2c2832'); jg.addColorStop(1, '#100e14');
    g.fillStyle = jg; g.fill();
    const sheen = g.createLinearGradient(-16, 0, 16, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.28, 'rgba(255,255,255,.1)'); sheen.addColorStop(0.42, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.8, 'rgba(255,255,255,0)'); sheen.addColorStop(0.92, 'rgba(255,255,255,.07)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-15, -8); g.quadraticCurveTo(0, -4, 15, -8); g.stroke(); // back yoke seam
    RR(g, -14.5, 4.5, 29, 3.5, 1.5); g.fillStyle = '#0b0a0e'; g.fill(); // waistband
    g.fillStyle = 'rgba(207,211,218,.7)'; g.fillRect(-12, 5.5, 1.6, 1.6); g.fillRect(10.4, 5.5, 1.6, 1.6); // snaps
    ell(g, 0, -19.5, 8.8, 3.4); g.fillStyle = '#1d1a22'; g.fill(); // collar
    // neck + silver chain
    g.fillStyle = skin; g.fillRect(-3, -23, 6, 3.5);
    g.strokeStyle = '#cfd3da'; g.lineWidth = 1;
    g.beginPath(); g.arc(0, -24, 4.2, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
    circle(g, 2.6, -20.6, 0.9); g.fillStyle = '#ffffff'; g.fill();
    // head
    if (wear.hood) {
      g.beginPath(); g.moveTo(-10.5, -21); g.quadraticCurveTo(-12, -36, 0, -38); g.quadraticCurveTo(12, -36, 10.5, -21);
      g.quadraticCurveTo(0, -18.5, -10.5, -21); g.closePath();
      const hg = g.createLinearGradient(0, -38, 0, -19); hg.addColorStop(0, '#6a5e72'); hg.addColorStop(1, '#4a4052');
      g.fillStyle = hg; g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(0, -37); g.lineTo(0, -21); g.stroke();
      g.strokeStyle = HAIR; g.lineWidth = 1.6; // a few strands escape the hood
      g.beginPath(); g.moveTo(-9.5, -22); g.lineTo(-10.5, -18.5); g.moveTo(9.5, -22); g.lineTo(10.2, -18.8); g.stroke();
    } else {
      g.fillStyle = skin;
      ell(g, -8.4, -27, 1.8, 2.8); g.fill(); ell(g, 8.4, -27, 1.8, 2.8); g.fill();
      circle(g, 8.9, -25.6, 0.9); g.fillStyle = '#d7dbe2'; g.fill(); // ear cuff
      // wavy, messy, collar-length dark-blond hair
      circle(g, 0, -28.5, 8.9); g.fillStyle = HAIR; g.fill();
      g.beginPath();
      g.moveTo(-8.8, -29);
      g.quadraticCurveTo(-11.2, -24.5, -9.4, -20.6); g.quadraticCurveTo(-7.6, -22.6, -6.4, -19.8);
      g.quadraticCurveTo(-4.4, -21.8, -2.6, -19.2); g.quadraticCurveTo(-0.6, -21.4, 1, -18.8);
      g.quadraticCurveTo(3, -21.2, 4.8, -19.4); g.quadraticCurveTo(6.6, -22.4, 8.6, -20.4);
      g.quadraticCurveTo(11.2, -24.5, 8.8, -29); g.closePath();
      g.fill();
      g.strokeStyle = HAIR_HI; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-5, -36); g.quadraticCurveTo(-8, -31, -5.5, -27); g.quadraticCurveTo(-3.5, -24, -6, -21.5);
      g.moveTo(1, -37); g.quadraticCurveTo(-1.5, -32, 1.5, -28); g.quadraticCurveTo(3.5, -25, 1.2, -21);
      g.moveTo(6, -34); g.quadraticCurveTo(8.5, -30, 6.5, -26.5); g.quadraticCurveTo(5, -24, 6.8, -21.6);
      g.stroke();
      g.strokeStyle = 'rgba(214,180,128,.5)'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(-2, -35.5); g.quadraticCurveTo(-4, -31, -2.2, -26.5); g.moveTo(3.5, -36); g.quadraticCurveTo(5.5, -32, 4, -27.5); g.stroke();
    }
    if (wear.shades) {
      g.strokeStyle = '#0b0a0f'; g.lineWidth = 1.7;
      g.beginPath(); g.moveTo(-9.6, -29.2); g.lineTo(-6.4, -30.6); g.moveTo(9.6, -29.2); g.lineTo(6.4, -30.6); g.stroke();
      g.fillStyle = 'rgba(217,184,146,.8)'; g.fillRect(-9.9, -29.6, 1.3, 1.1); g.fillRect(8.6, -29.6, 1.3, 1.1);
    }
    if (wear.cap) {
      ell(g, 0, -38.5, 6, 1.8); g.fillStyle = '#120f15'; g.fill();
      const capG = g.createRadialGradient(-3, -34, 1, 0, -31, 10);
      capG.addColorStop(0, '#4a4052'); capG.addColorStop(1, '#19151d');
      ell(g, 0, -31.5, 9.4, 7.6); g.fillStyle = capG; g.fill();
      g.beginPath(); g.arc(0, -25.6, 2.8, Math.PI, 0); g.fillStyle = wear.hood ? '#4a4052' : HAIR; g.fill();
      g.strokeStyle = P.champ; g.lineWidth = 1; g.beginPath(); g.moveTo(-2.8, -26); g.lineTo(2.8, -26); g.stroke();
    }
    // rim light: champagne on the right, pink neon on the left
    g.lineWidth = 1.4;
    g.strokeStyle = 'rgba(232,206,170,.9)';
    g.beginPath(); g.moveTo(16.5, -11); g.lineTo(14.5, 7.5); g.stroke();
    g.beginPath(); g.moveTo(7, -21); g.quadraticCurveTo(17.5, -20, 16.5, -11); g.stroke();
    g.beginPath(); g.arc(0, -29, 9.6, -Math.PI * 0.45, Math.PI * 0.1); g.stroke();
    g.strokeStyle = 'rgba(244,166,198,.7)';
    g.beginPath(); g.moveTo(-16.5, -11); g.lineTo(-14.5, 7.5); g.stroke();
    g.beginPath(); g.arc(0, -29, 9.6, Math.PI * 0.9, Math.PI * 1.45); g.stroke();
    g.restore();
  }
  const wearKey = (w) => (w.cap ? 1 : 0) | (w.shades ? 2 : 0) | (w.hood ? 4 : 0);
  function jaceSprites() {
    if (JACE) return JACE;
    JACE = {
      sets: Array.from({ length: 8 }, (_, m) => {
        const wear = { cap: !!(m & 1), shades: !!(m & 2), hood: !!(m & 4) };
        return Array.from({ length: PLAYER_FRAMES_N }, (__, i) => sprite(60, 88, 30, 48, (g) => drawJace(g, i / PLAYER_FRAMES_N, wear)));
      }),
      ground: sprite(140, 50, 70, 25, (g) => { g.scale(1, 0.36); glow(g, 0, 0, 68, P.champ, 0.75); }, 1),
      ring: sprite(70, 90, 35, 46, (g) => {
        g.shadowColor = P.champ; g.shadowBlur = 10; g.strokeStyle = 'rgba(217,184,146,.9)'; g.lineWidth = 1.2;
        ell(g, 0, -4, 25, 34); g.stroke();
      }),
    };
    return JACE;
  }
  function drawPlayer(ctx, x, y, o) {
    const S = jaceSprites();
    ctx.save();
    ctx.translate(x, y);
    const gop = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    blit(ctx, S.ground, 0, 30);
    ctx.globalCompositeOperation = gop;
    glow(ctx, 0, -4, 50, '#e8b89a', 0.28);
    if (o.perfect) glow(ctx, 0, -4, 66, P.champ, o.perfectEnding ? 0.25 : 0.5);
    ctx.rotate(o.lean);
    ctx.scale(1 + o.squash, 1 - o.squash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const ph = ((o.step / TAU) % 1 + 1) % 1;
    const set = S.sets[wearKey(o.wear || {})];
    blit(ctx, set[Math.floor(ph * PLAYER_FRAMES_N) % PLAYER_FRAMES_N], 0, 0);
    if (o.perfect) { ctx.globalAlpha *= o.perfectEnding ? 0.4 : 1; blit(ctx, S.ring, 0, 0); }
    ctx.restore();
  }

  /* ---------- fans: front 3/4 view, walking toward the camera ---------- */
  const FAN_FRAMES_N = 6;
  const SKIN = ['#f3d2bf', '#e0b291', '#c58c62', '#8d5a3b', '#5b3a29'];
  const FAN_LOOKS = [
    { skin: SKIN[0], hair: '#d9b46a', style: 'long', top: '#f2d6e0', bottom: 'skirt', low: '#8d7a9a', acc: 'phone' },  // blonde
    { skin: SKIN[3], hair: '#1e1714', style: 'afro', top: '#f3e6d6', bottom: 'pants', low: '#4a5068', acc: 'stick' },
    { skin: SKIN[0], hair: '#a2482a', style: 'pony', top: '#b9c8e8', bottom: 'skirt', low: '#c9a9b8', acc: 'tote' },   // auburn
    { skin: SKIN[4], hair: '#191311', style: 'braids', top: '#e6b8cc', bottom: 'pants', low: '#3e3a4c', acc: 'phone' },
    { skin: SKIN[1], hair: '#5a3a24', style: 'curly', top: '#c9b6e4', bottom: 'pants', low: '#5a5470', acc: 'stick' },  // brown curls
    { skin: SKIN[2], hair: '#2a1d16', style: 'long', top: '#9fc3d8', bottom: 'skirt', low: '#f3e6d6', acc: 'phone' },
    { skin: SKIN[0], hair: '#e6c98a', style: 'bob', top: '#f2d6e0', bottom: 'pants', low: '#6f7f99', acc: 'tote' },     // platinum bob
    { skin: SKIN[3], hair: '#241a15', style: 'bun', top: '#f3e6d6', bottom: 'skirt', low: '#e889b0', acc: 'stick' },
    { skin: SKIN[1], hair: '#7a4a2a', style: 'pony', top: '#b9c8e8', bottom: 'skirt', low: '#f6efe9', acc: 'phone' },
    { skin: SKIN[2], hair: '#1e1714', style: 'curly', top: '#e6b8cc', bottom: 'pants', low: '#4a5068', acc: 'tote' },
    // paparazzi: dark jackets, big cameras with a flash unit
    { skin: SKIN[0], hair: '#6b4a2e', style: 'short', beard: '#5a3e26', top: '#4a4658', bottom: 'pants', low: '#2e2c38', acc: 'camera' },
    { skin: SKIN[3], hair: '#1e1714', style: 'capm', top: '#5a5266', bottom: 'pants', low: '#34303e', acc: 'camera' },
    { skin: SKIN[1], hair: '#2a1d16', style: 'short', beard: '#2a1d16', top: '#3e4658', bottom: 'pants', low: '#2a2834', acc: 'camera' },
  ];
  // accessory anchor points (sprite space) for runtime glows
  const PHONE_AT = { x: 10.5, y: -21 }, TIP_AT = { x: -17.5, y: -42 }, FLASH_AT = { x: -1, y: -11 };
  let FANS = null;
  function drawFanFigure(g, v, p) {
    const sw = Math.sin(p * TAU), bob = -Math.abs(Math.cos(p * TAU)) * 1.2;
    ell(g, 0, 27, 15, 5); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    const skin = v.skin;
    g.lineCap = 'round'; g.lineWidth = 5.5;
    g.strokeStyle = v.bottom === 'skirt' ? skin : v.low;
    [[-4, 23 + sw * 2.5], [4, 23 - sw * 2.5]].forEach(([x, fy]) => {
      g.beginPath(); g.moveTo(x, 8); g.lineTo(x, fy); g.stroke();
      ell(g, x, fy + 1.5, 3.6, 2.6); g.fillStyle = '#f6efe9'; g.fill();
    });
    g.save(); g.translate(0, bob);
    if (v.style === 'long') { RR(g, -10.5, -31, 21, 26, 9); g.fillStyle = v.hair; g.fill(); }
    if (v.style === 'bob') { ell(g, 0, -24, 11.5, 10.5); g.fillStyle = v.hair; g.fill(); }
    if (v.style === 'afro') { circle(g, 0, -27, 13.5); g.fillStyle = v.hair; g.fill(); }
    if (v.style === 'curly') { g.fillStyle = v.hair; [[-9, -27], [9, -27], [-10, -20], [10, -20], [-7, -14], [7, -14], [0, -33]].forEach(([cx, cy]) => { circle(g, cx, cy, 5.2); g.fill(); }); }
    // top
    g.beginPath(); g.moveTo(-9, -15); g.quadraticCurveTo(-13, -14, -12.5, -6); g.lineTo(-11, 5);
    g.quadraticCurveTo(0, 8, 11, 5); g.lineTo(12.5, -6); g.quadraticCurveTo(13, -14, 9, -15); g.closePath();
    const tg = g.createLinearGradient(0, -15, 0, 6); tg.addColorStop(0, v.top); tg.addColorStop(1, 'rgba(90,70,95,1)');
    g.fillStyle = tg; g.fill();
    if (v.bottom === 'skirt') {
      g.beginPath(); g.moveTo(-10.5, 3); g.lineTo(-13, 13); g.quadraticCurveTo(0, 16, 13, 13); g.lineTo(10.5, 3); g.closePath();
      g.fillStyle = v.low; g.fill();
    }
    if (v.acc === 'tote') {
      g.strokeStyle = 'rgba(243,230,214,.85)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-8, -14); g.lineTo(13, 0); g.stroke();
      RR(g, 9, -1, 11, 13, 3); g.fillStyle = '#e9dccb'; g.fill();
      g.fillStyle = P.pink2; circle(g, 14.5, 5.5, 1.8); g.fill();
    }
    // arms: one raised for phone or light stick, the other swinging
    g.lineWidth = 5; g.strokeStyle = v.top;
    const swing = (s, k) => { g.beginPath(); g.moveTo(s * 11, -12); g.quadraticCurveTo(s * 14, -4, s * 13, 2 + k * 3); g.stroke(); circle(g, s * 13, 3.5 + k * 3, 2.3); g.fillStyle = skin; g.fill(); };
    if (v.acc === 'phone') {
      swing(-1, sw);
      g.beginPath(); g.moveTo(11, -12); g.quadraticCurveTo(15, -16, 11, -19); g.stroke();
      RR(g, 6.5, -28.5, 8, 13, 2); g.fillStyle = '#17141b'; g.fill();
      g.fillStyle = '#d8e6ff'; g.fillRect(7.5, -27.5, 1.2, 11);
      circle(g, 11, -19, 2.3); g.fillStyle = skin; g.fill();
    } else if (v.acc === 'stick') {
      swing(1, -sw);
      g.beginPath(); g.moveTo(-11, -12); g.quadraticCurveTo(-16, -18, -15, -24); g.stroke();
      g.strokeStyle = P.cream; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-15, -24); g.lineTo(-17.5, -40); g.stroke();
      circle(g, -15, -24, 2.3); g.fillStyle = skin; g.fill();
      circle(g, -17.5, -42, 3.6); g.fillStyle = '#ffd6e6'; g.fill();
    } else if (v.acc === 'camera') {
      [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(sd * 11, -12); g.quadraticCurveTo(sd * 14, -5, sd * 7, -2); g.stroke(); });
      RR(g, -8.5, -7, 17, 11, 2.5); g.fillStyle = '#1a181e'; g.fill();
      circle(g, 1.5, -1.5, 4.6); g.fillStyle = '#34323c'; g.fill();
      circle(g, 1.5, -1.5, 2.6); g.fillStyle = '#0b0a0f'; g.fill();
      circle(g, 0.6, -2.4, 0.9); g.fillStyle = 'rgba(159,180,216,.9)'; g.fill();
      RR(g, -5, -13, 8, 6, 1.2); g.fillStyle = '#2a2830'; g.fill();
      g.fillStyle = '#e8eef8'; g.fillRect(-4.2, -12.2, 6.4, 2.2);
      circle(g, -7.5, -2, 2.2); g.fillStyle = skin; g.fill(); circle(g, 7.5, -2, 2.2); g.fill();
    } else { swing(-1, sw); swing(1, -sw); }
    // head + face
    circle(g, 0, -24, 8.8); g.fillStyle = skin; g.fill();
    g.fillStyle = v.hair;
    if (v.style === 'afro') { g.beginPath(); g.arc(0, -26, 10.6, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(0, -29.5, -10.2, -27.5); g.fill(); }
    else if (v.style === 'curly') { [[-6, -31], [0, -32.5], [6, -31], [-8.5, -27], [8.5, -27]].forEach(([cx, cy]) => { circle(g, cx, cy, 3.8); g.fill(); }); }
    else if (v.style === 'short' || v.style === 'capm') { g.beginPath(); g.arc(0, -25, 9.2, Math.PI * 1.05, Math.PI * 1.95); g.quadraticCurveTo(0, -29.8, -8.9, -27.4); g.fill(); }
    else { g.beginPath(); g.arc(0, -25, 9.4, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(4, -28.5, 0, -27.5); g.quadraticCurveTo(-5, -29, -9.4, -25); g.fill(); }
    if (v.style === 'pony') { g.save(); g.translate(9, -30); g.rotate(0.5); ell(g, 0, 0, 3.5, 7); g.fill(); g.restore(); }
    if (v.style === 'bun') { circle(g, 0, -35, 4.6); g.fill(); }
    if (v.style === 'braids') {
      g.beginPath(); g.arc(0, -25, 9.4, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, -29, -9.4, -25); g.fill();
      [-1, 1].forEach((sd) => { for (let i = 0; i < 6; i++) { ell(g, sd * (8.6 + i * 0.25), -21 + i * 3.1, 1.9, 1.8); g.fill(); } });
    }
    if (v.style === 'capm') { // ball cap, brim toward the camera
      g.beginPath(); g.arc(0, -25.5, 9.6, Math.PI, 0); g.fillStyle = '#26232c'; g.fill();
      ell(g, 0, -25.5, 9.8, 2.6); g.fillStyle = '#1a181e'; g.fill();
    }
    if (v.beard) { g.beginPath(); g.arc(0, -22.5, 7.6, Math.PI * 0.08, Math.PI * 0.92); g.quadraticCurveTo(0, -20.5, 7.5, -21.4); g.fillStyle = v.beard; g.fill(); }
    const dark = v.skin === SKIN[3] || v.skin === SKIN[4];
    g.strokeStyle = 'rgba(40,26,20,.75)'; g.lineWidth = 0.9; // brows
    g.beginPath(); g.moveTo(-5, -25.8); g.lineTo(-2, -26.3); g.moveTo(2, -26.3); g.lineTo(5, -25.8); g.stroke();
    g.fillStyle = '#231915'; ell(g, -3.4, -23.6, 1.15, 0.75); g.fill(); ell(g, 3.4, -23.6, 1.15, 0.75); g.fill(); // almond eyes
    g.fillStyle = dark ? 'rgba(0,0,0,.25)' : 'rgba(120,70,50,.28)'; ell(g, 0.5, -21.3, 0.8, 1.6); g.fill(); // nose shade
    if (!v.beard) { g.strokeStyle = dark ? 'rgba(60,24,24,.6)' : 'rgba(170,90,90,.6)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-1.6, -18.9); g.quadraticCurveTo(0, -18.2, 1.6, -18.9); g.stroke(); }
    // soft rim from the shop lights
    g.strokeStyle = 'rgba(244,166,198,.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(0, -24.5, 9.4, Math.PI * 0.95, Math.PI * 1.4); g.stroke();
    g.beginPath(); g.moveTo(-12.5, -6); g.lineTo(-11, 5); g.stroke();
    g.restore();
  }
  function fanSprites() {
    if (FANS) return FANS;
    FANS = FAN_LOOKS.map((v) => Array.from({ length: FAN_FRAMES_N }, (_, i) => sprite(60, 96, 30, 56, (g) => { g.scale(1.15, 1.15); drawFanFigure(g, v, i / FAN_FRAMES_N); })));
    return FANS;
  }
  let BUBBLES = null;
  function bubbles() {
    if (BUBBLES) return BUBBLES;
    const make = (ch, color) => sprite(64, 64, 32, 32, (g) => {
      glow(g, 0, 0, 28, color, 0.4);
      circle(g, 0, 0, 12); g.fillStyle = GLASS; g.fill(); g.lineWidth = 1; g.strokeStyle = color; g.stroke();
      g.font = sans(800, 16); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(ch, 0, 1);
    });
    BUBBLES = { alert: make('!', P.pink2), fooled: make('?', P.cream) };
    return BUBBLES;
  }
  function drawFan(ctx, f, time) {
    const look = FAN_LOOKS[f.v % FAN_LOOKS.length];
    const ph = ((time * 1.5 + f.wob) % 1 + 1) % 1;
    const x = f.x + Math.sin(time * 2 + f.wob * 6) * 2.5, y = f.y;
    glow(ctx, x, y + 14, 34, P.pink2, 0.24);
    blit(ctx, fanSprites()[f.v % FAN_LOOKS.length][Math.floor(ph * FAN_FRAMES_N) % FAN_FRAMES_N], x, y);
    const k = 1.15;
    if (look.acc === 'phone') glow(ctx, x + PHONE_AT.x * k, y + PHONE_AT.y * k, f.alert > 0 ? 46 : 22, f.alert > 0 ? '#ffffff' : '#b8ccf0', f.alert > 0 ? 0.75 : 0.5);
    if (look.acc === 'camera') {
      const pop = f.alert > 0 || Math.sin(time * 2.3 + f.wob * 17) > 0.985;
      glow(ctx, x + FLASH_AT.x * k, y + FLASH_AT.y * k, pop ? 54 : 12, '#ffffff', pop ? 0.85 : 0.35);
    }
    if (look.acc === 'stick') glow(ctx, x + TIP_AT.x * k, y + TIP_AT.y * k, 20, P.pink, 0.55 + Math.sin(time * 8 + f.wob * 6) * 0.25);
    if (f.alert > 0) bubble(ctx, bubbles().alert, x + 18, y - 58, f.alert);
    else if (f.fooled > 0) bubble(ctx, bubbles().fooled, x + 18, y - 58, f.fooled);
  }
  function bubble(ctx, s, x, y, k) {
    const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1, old = ctx.globalAlpha;
    ctx.globalAlpha = Math.min(1, k * 3);
    blit(ctx, s, x, y, pop);
    ctx.globalAlpha = old;
  }

  /* ---------- pickups ---------- */
  function drawIcon(g, kind, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    if (kind === 'cap') {
      g.beginPath(); g.arc(0, 3, 10, Math.PI, 0); g.closePath(); g.fillStyle = P.cream; g.fill();
      ell(g, 8, 3, 9, 3); g.fillStyle = P.champ; g.fill();
    } else if (kind === 'glasses') {
      g.fillStyle = P.cream;
      RR(g, -12, -4, 10, 8, 3); g.fill(); RR(g, 2, -4, 10, 8, 3); g.fill();
      g.strokeStyle = P.cream; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, -1); g.lineTo(2, -1); g.stroke();
    } else if (kind === 'hoodie') {
      g.fillStyle = P.cream;
      RR(g, -12.5, -2, 5, 11, 2); g.fill(); RR(g, 7.5, -2, 5, 11, 2); g.fill(); // sleeves
      RR(g, -9, -4, 18, 14, 4); g.fill(); // body
      circle(g, 0, -5.5, 5.8); g.fill(); // hood
      circle(g, 0, -5, 3); g.fillStyle = P.champ2; g.fill();
      g.strokeStyle = P.champ; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-5, 5.5); g.lineTo(5, 5.5); g.moveTo(-1.5, -2); g.lineTo(-1.5, 2.5); g.moveTo(1.5, -2); g.lineTo(1.5, 2.5); g.stroke();
    }
    g.restore();
  }
  let ITEMS = null;
  function itemSprites() {
    if (ITEMS) return ITEMS;
    const disguise = (k) => sprite(60, 60, 30, 30, (g) => {
      circle(g, 0, 0, 23); g.fillStyle = 'rgba(92,48,80,.88)'; g.fill();
      g.save(); g.shadowColor = P.pink; g.shadowBlur = 10; g.lineWidth = 2.2; g.strokeStyle = P.pink; g.stroke(); g.restore();
      drawIcon(g, k, 0, 0, 1.45);
    });
    ITEMS = {
      coin: sprite(28, 28, 14, 14, (g) => {
        const cg = g.createLinearGradient(-11, -11, 11, 11); cg.addColorStop(0, '#fff1dc'); cg.addColorStop(1, '#c49a6c');
        circle(g, 0, 0, 11); g.fillStyle = cg; g.fill();
        circle(g, 0, 0, 6); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2; g.stroke();
      }),
      heart: sprite(34, 34, 17, 17, (g) => {
        Kit.draw.heart(g, 0, -12, 26);
        const hg = g.createLinearGradient(0, -12, 0, 14); hg.addColorStop(0, '#ffc4dc'); hg.addColorStop(1, '#d06a96');
        g.fillStyle = hg; g.fill();
      }),
      cap: disguise('cap'), glasses: disguise('glasses'), hoodie: disguise('hoodie'),
    };
    return ITEMS;
  }
  function drawItem(ctx, it, time) {
    const I = itemSprites();
    const y = it.y + Math.sin(time * 5 + it.seed) * 3;
    if (it.item === 'coin') {
      glow(ctx, it.x, y, 26, '#f1dcbf', 0.55);
      blit(ctx, I.coin, it.x, y, 0.35 + Math.abs(Math.cos(time * 5 + it.seed)) * 0.65, 1);
    } else if (it.item === 'heart') {
      glow(ctx, it.x, y, 32, P.pink, 0.6);
      blit(ctx, I.heart, it.x, y);
    } else {
      glow(ctx, it.x, y, 46, P.pink, 0.5 + Math.sin(time * 6 + it.seed) * 0.18);
      blit(ctx, I[it.item], it.x, y);
      const sp = (time * 2 + it.seed) % 1;
      ctx.fillStyle = `rgba(246,239,233,${(1 - sp).toFixed(2)})`;
      circle(ctx, it.x + 16, y - 16 - sp * 6, 1.8); ctx.fill();
    }
  }

  /* ---------- paparazzi flash zone ---------- */
  let FLASH = null;
  function flashSprites() {
    if (FLASH) return FLASH;
    FLASH = {
      lane: sprite(84, 340, 42, 0, (g) => {
        const lg = g.createLinearGradient(0, 0, 0, 340);
        lg.addColorStop(0, 'rgba(232,137,176,1)'); lg.addColorStop(1, 'rgba(232,137,176,0)');
        RR(g, -42, 0, 84, 340, 16); g.fillStyle = lg; g.fill();
      }, 1),
      cam: sprite(64, 64, 32, 32, (g) => {
        circle(g, 0, 0, 24); g.fillStyle = GLASS; g.fill(); g.lineWidth = 1; g.strokeStyle = GLASS_LINE; g.stroke();
        RR(g, -12, -7, 24, 16, 4); g.fillStyle = P.cream; g.fill();
        g.fillRect(-5, -11, 8, 5);
        circle(g, 0, 1, 5); g.fillStyle = P.plum; g.fill();
      }),
    };
    return FLASH;
  }
  function drawFlash(ctx, fl) {
    const F = flashSprites(), x = LANES[fl.lane];
    if (!fl.fired) {
      const k = Math.min(1, fl.t / fl.warn);
      const on = Math.sin(fl.t * (12 + 30 * k)) > 0;
      const old = ctx.globalAlpha;
      ctx.globalAlpha = on ? 0.1 + 0.25 * k : 0.06;
      blit(ctx, F.lane, x, 430);
      ctx.globalAlpha = old;
      RR(ctx, x - 42, 430, 84, 340, 16);
      ctx.setLineDash([8, 8]); ctx.lineDashOffset = -fl.t * 60;
      ctx.strokeStyle = on ? 'rgba(244,166,198,.8)' : 'rgba(244,166,198,.3)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      glow(ctx, x, 470, 44, P.pink, 0.3 + 0.3 * k);
      blit(ctx, F.cam, x, 470);
      ctx.beginPath(); ctx.arc(x, 470, 24, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      ctx.strokeStyle = P.pink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    } else {
      glow(ctx, x, 560, 200, '#ffffff', 0.9 * Math.max(0, 1 - fl.after / 0.35));
    }
  }

  /* ---------- HUD: glass chips; static parts baked once ---------- */
  const Y = 80; // the kit's top bar owns y 0-70
  const BAR = { x: 16, y: Y + 42, w: 358, h: 5 }, DIST = { top: 240, bot: 480 };
  let HUDS = null;
  function hudSprites(ctx) {
    if (HUDS && HUDS.lang === lang()) return HUDS;
    const slot = (k, on) => sprite(40, 40, 20, 20, (g) => {
      if (on) glow(g, 0, 0, 22, P.pink, 0.35);
      circle(g, 0, 0, 13); g.fillStyle = GLASS; g.fill(); g.lineWidth = 1;
      g.strokeStyle = on ? 'rgba(244,166,198,.9)' : GLASS_LINE; g.stroke();
      g.globalAlpha = on ? 1 : 0.3; drawIcon(g, k, 0, 0, 0.72);
    });
    HUDS = {
      base: sprite(W, 520, 0, 0, (g) => {
        const tg = g.createLinearGradient(0, 0, 0, 200);
        tg.addColorStop(0, 'rgba(11,10,15,.7)'); tg.addColorStop(1, 'rgba(11,10,15,0)');
        g.fillStyle = tg; g.fillRect(0, 0, W, 200);
        RR(g, BAR.x, BAR.y, BAR.w, BAR.h, 2.5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
        const mx = BAR.x + BAR.w / 1.3;
        g.fillStyle = P.cream; g.fillRect(mx - 1, BAR.y - 4, 2, BAR.h + 8);
        text(g, tr('GOAL', '目标'), mx, BAR.y + 20, sans(700, 9), 'rgba(246,239,233,.75)', 'center');
        RR(g, 23, DIST.top, 4, DIST.bot - DIST.top, 2); g.fillStyle = 'rgba(255,255,255,.14)'; g.fill();
        glow(g, 25, DIST.top - 14, 20, P.champ, 0.5);
        Kit.draw.heart(g, 25, DIST.top - 22, 12); g.fillStyle = P.champ; g.fill();
      }),
      clock: sprite(16, 16, 8, 8, (g) => {
        circle(g, 0, 0, 6); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -3.5); g.moveTo(0, 0); g.lineTo(2.5, 1); g.stroke();
      }),
      slots: ['cap', 'glasses', 'hoodie'].map((k) => [slot(k, false), slot(k, true)]),
      barFill: ctx.createLinearGradient(BAR.x, 0, BAR.x + BAR.w, 0),
      distFill: ctx.createLinearGradient(0, DIST.bot, 0, DIST.top),
    };
    HUDS.lang = lang();
    HUDS.barFill.addColorStop(0, P.pink2); HUDS.barFill.addColorStop(1, P.champ);
    HUDS.distFill.addColorStop(0, P.pink2); HUDS.distFill.addColorStop(1, P.champ);
    return HUDS;
  }
  function drawHUD(ctx, h) {
    const U = hudSprites(ctx);
    ctx.drawImage(U.base.c, 0, 0, W, 520);
    // timer chip
    const low = h.timeLeft <= 10;
    const pulse = low ? 1 + 0.1 * Math.max(0, (h.timeLeft % 1) - 0.6) / 0.4 : 1;
    ctx.save(); ctx.translate(52, Y + 15); ctx.scale(pulse, pulse);
    glassPath(ctx, -36, -15, 72, 30, 15, low ? 'rgba(232,137,176,.85)' : GLASS, low ? 'rgba(255,255,255,.35)' : GLASS_LINE);
    blit(ctx, U.clock, -20, 0);
    text(ctx, Math.max(0, Math.ceil(h.timeLeft)) + tr('s', '秒'), 8, 6, sans(700, 16), '#fff', 'center');
    ctx.restore();
    // score chip
    const done = h.score >= h.target;
    const sStr = String(h.score), tStr = ' / ' + h.target;
    const fS = sans(700, 16), fT = sans(500, 12);
    const sw = measure(ctx, fS, sStr), cw = sw + measure(ctx, fT, tStr) + 26;
    glassPath(ctx, 96, Y, cw, 30, 15);
    text(ctx, sStr, 109, Y + 21, fS, done ? P.champ : '#fff');
    text(ctx, tStr, 109 + sw, Y + 21, fT, 'rgba(246,239,233,.65)');
    // to-go chip
    const togo = done ? tr('Target reached', '已达标') : tr(`${h.target - h.score} to go`, `还差 ${h.target - h.score} 分`), fG = sans(700, 13);
    const gw = measure(ctx, fG, togo) + 24;
    glassPath(ctx, 374 - gw, Y, gw, 30, 15, done ? 'rgba(217,184,146,.25)' : GLASS, done ? 'rgba(217,184,146,.6)' : GLASS_LINE);
    text(ctx, togo, 374 - gw / 2, Y + 20, fG, done ? P.champ : P.pink, 'center');
    // progress fill
    const fw = Math.max(0, Math.min(1, h.shownScore / (h.target * 1.3))) * BAR.w;
    if (fw > 1) { RR(ctx, BAR.x, BAR.y, Math.max(5, fw), BAR.h, 2.5); ctx.fillStyle = U.barFill; ctx.fill(); glow(ctx, BAR.x + fw, BAR.y + 2, 12, P.pink, 0.6); }
    // combo chip
    if (h.combo >= 2) {
      const pop = 1 + h.comboPop * 0.25;
      const label = tr(`Combo ${h.combo}`, `连击 ${h.combo}`) + (h.mult > 1 ? `  ×${h.mult.toFixed(1)}` : ''), fC = sans(700, 13);
      const lw = measure(ctx, fC, label) + 22;
      ctx.save(); ctx.translate(16, Y + 72); ctx.scale(pop, pop);
      glassPath(ctx, 0, -6, lw, 26, 13, GLASS, 'rgba(244,166,198,.45)');
      text(ctx, label, lw / 2, 12, fC, '#fff', 'center');
      ctx.restore();
    }
    // disguise slots + perfect timer
    ['cap', 'glasses', 'hoodie'].forEach((k, i) => blit(ctx, U.slots[i][h.have[k] || h.perfect > 0 ? 1 : 0], 296 + i * 30, Y + 78));
    if (h.perfect > 0) {
      const k = Math.min(1, h.perfect / h.perfectMax);
      RR(ctx, 283, Y + 98, 86, 4, 2); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
      RR(ctx, 283, Y + 98, Math.max(4, 86 * k), 4, 2); ctx.fillStyle = P.champ; ctx.fill();
      text(ctx, tr('Perfect disguise', '完美伪装'), 326, Y + 116, sans(700, 11), P.champ, 'center');
    }
    // distance to the rooftop
    const py = Kit.lerp(DIST.bot, DIST.top, h.progress);
    RR(ctx, 23, py, 4, DIST.bot - py, 2); ctx.fillStyle = U.distFill; ctx.fill();
    glow(ctx, 25, py, 18, P.pink, 0.6);
    circle(ctx, 25, py, 6); ctx.fillStyle = '#fff'; ctx.fill();
    text(ctx, h.metersLeft + tr('m', '米'), 25, DIST.bot + 18, sans(700, 11), P.cream, 'center');
  }

  /* diegetic prompt on the film frame, series-player style: ring + bold white line */
  function drawPrompt(ctx, pr, px, time) {
    const a = Math.min(1, pr.t / 0.25) * Math.min(1, (pr.dur - pr.t) / 0.4);
    if (a <= 0) return;
    const old = ctx.globalAlpha;
    ctx.globalAlpha = Math.max(0, a);
    if (pr.ring) {
      const r = 46 + Math.sin(time * 5) * 4;
      glow(ctx, px, PY - 4, r + 30, P.pink, 0.3);
      ctx.beginPath(); ctx.arc(px, PY - 4, r, 0, TAU); ctx.strokeStyle = 'rgba(244,166,198,.8)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, PY - 4, r + 10 + ((time * 30) % 20), 0, TAU); ctx.strokeStyle = 'rgba(244,166,198,.25)'; ctx.lineWidth = 1; ctx.stroke();
      const n = Math.sin(time * 6) * 5;
      text(ctx, '‹', px - r - 22 - n, PY + 5, sans(700, 30), '#fff', 'center');
      text(ctx, '›', px + r + 22 + n, PY + 5, sans(700, 30), '#fff', 'center');
    }
    text(ctx, tr(pr.text, pr.zh), W / 2, pr.y || 540, sans(800, 20), '#fff', 'center');
    ctx.globalAlpha = old;
  }
  let BAND = null;
  function drawBanner(ctx, b) {
    if (!BAND) {
      BAND = sprite(390, 90, 195, 50, (g) => {
        const lg = g.createLinearGradient(-195, 0, 195, 0);
        lg.addColorStop(0, 'rgba(11,10,15,0)'); lg.addColorStop(0.5, 'rgba(11,10,15,.6)'); lg.addColorStop(1, 'rgba(11,10,15,0)');
        g.fillStyle = lg; g.fillRect(-195, -46, 390, 86);
      }, 1);
    }
    const k = b.t / b.dur;
    const inK = Math.min(1, b.t / 0.3), outK = k > 0.8 ? (1 - k) / 0.2 : 1;
    const ease = 1 - Math.pow(1 - inK, 3);
    const old = ctx.globalAlpha;
    ctx.globalAlpha = Math.max(0, outK) * ease;
    const y = (b.y || 300) + (1 - ease) * 16;
    blit(ctx, BAND, W / 2, y);
    const zh = lang() === 'zh';
    text(ctx, tr(b.text, b.zh), W / 2, y + 2, zh ? sans(800, 30) : script(40), b.color || P.pink, 'center');
    if (b.sub) text(ctx, tr(b.sub, b.subZh), W / 2, y + 28, sans(600, 14), P.cream, 'center');
    ctx.globalAlpha = old;
  }
  const vigCache = {};
  function drawVignette(ctx, color, a) {
    if (a <= 0.01) return;
    if (!vigCache[color]) {
      vigCache[color] = sprite(W, H, 0, 0, (g) => {
        const rg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.62);
        rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, color);
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
      }, 0.5);
    }
    const old = ctx.globalAlpha;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(vigCache[color].c, 0, 0, W, H);
    ctx.globalAlpha = old;
  }

  /* rebake text-bearing sprites once web fonts have loaded */
  try {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layers = {}; HUDS = null; BUBBLES = null; });
  } catch (e) { /* font loading API unavailable: keep fallback-font sprites */ }

  window.Ch1Art = {
    W, H, LANES, PY, P, FAN_LOOKS_N: FAN_LOOKS.length,
    makeBg, scrollBg, drawBackground, drawFront, drawPlayer, drawFan, drawItem, drawFlash, drawHUD, drawPrompt, drawBanner, drawVignette,
    prewarm(theme) { themeLayers(theme); jaceSprites(); fanSprites(); itemSprites(); flashSprites(); bubbles(); },
  };
})();
