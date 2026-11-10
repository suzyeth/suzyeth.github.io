/* Episode 2 art: an LA hotel rooftop at night, shot like a film frame (pure Canvas 2D, no image files).
 * Back layer (behind Jace): sky → stars → moon glow → hills with a row of abstract hillside lights (no lettering)
 *   → out-of-focus skyline → city bokeh → haze → palm silhouettes → string lights → warm rim light.
 * Front layer (over Jace): near out-of-focus lights, colour grade, bottom fade for the UI (film grain comes from the kit's overlay).
 * Exposes window.Ch2Art = { drawBack, drawFront }. */
(function () {
  'use strict';
  const W = 390, H = 780, HORIZON = 520;

  function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
  function offscreen(w, h, draw, scale) {
    const k = scale || 2, c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
    const x = c.getContext('2d'); x.scale(k, k); draw(x); return c;
  }
  function glow(rgb, size, core) {
    return offscreen(size, size, (x) => {
      const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, `rgba(${rgb},${core})`); g.addColorStop(0.35, `rgba(${rgb},${core * 0.45})`); g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g; x.fillRect(0, 0, size, size);
    });
  }
  /* out-of-focus bokeh disc: flat-ish disc with a soft edge, like a lens highlight */
  function disc(rgb, size) {
    return offscreen(size, size, (x) => {
      const g = x.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2);
      g.addColorStop(0, `rgba(${rgb},.55)`); g.addColorStop(0.8, `rgba(${rgb},.42)`); g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g; x.fillRect(0, 0, size, size);
    });
  }

  function skyline(seed, minH, maxH, body, winCols, winP, blur) {
    const r = rng(seed), LW = W + 60, LH = maxH + 24;
    return { w: LW, h: LH, cv: offscreen(LW, LH, (x) => {
      x.filter = `blur(${blur}px)`;
      let px = -6;
      while (px < LW) {
        const w = 24 + r() * 42, h = minH + r() * (maxH - minH), top = LH - h;
        x.fillStyle = body; x.fillRect(px, top, w, h);
        if (r() < 0.3) x.fillRect(px + 4, top - 7, w - 8, 7);
        for (let wy = top + 8; wy < LH - 6; wy += 10) {
          for (let wx = px + 5; wx < px + w - 6; wx += 8) {
            if (r() < winP) { x.globalAlpha = 0.25 + r() * 0.5; x.fillStyle = winCols[(r() * winCols.length) | 0]; x.fillRect(wx, wy, 4, 5); }
          }
        }
        x.globalAlpha = 1;
        px += w + 1 + r() * 5;
      }
    }) };
  }

  /* Hollywood-Hills-style ridge: dark silhouette, scattered house lights, and one row of soft white glows on a slope */
  function hills() {
    const r = rng(41), LW = W + 60, LH = 150;
    return { w: LW, h: LH, cv: offscreen(LW, LH, (x) => {
      x.filter = 'blur(1.2px)';
      x.fillStyle = '#160d18'; x.beginPath(); x.moveTo(0, LH);
      for (let px = 0; px <= LW; px += 6) {
        const y = 70 - 42 * Math.sin(px / 70) * Math.sin(px / 190 + 0.6) - 18 * Math.sin(px / 33 + 1.2) * 0.4;
        x.lineTo(px, Math.max(18, y));
      }
      x.lineTo(LW, LH); x.closePath(); x.fill();
      for (let i = 0; i < 70; i++) {   // house lights
        x.globalAlpha = 0.25 + r() * 0.5; x.fillStyle = r() < 0.7 ? '#d9b892' : '#f6efe9';
        x.fillRect(r() * LW, 60 + r() * 85, 1.6, 1.6);
      }
      x.globalAlpha = 0.85; x.fillStyle = '#f6efe9';   // abstract sign-like glow: nine soft blocks on the slope
      for (let i = 0; i < 9; i++) x.fillRect(250 + i * 9, 58 - i * 1.2, 6, 9);
      x.globalAlpha = 1;
    }) };
  }
  function palm(x, base, h, lean) {
    const topX = x + lean, topY = base - h;
    x0.lineWidth = 5; x0.strokeStyle = '#0a070b'; x0.lineCap = 'round';
    x0.beginPath(); x0.moveTo(x, base); x0.quadraticCurveTo(x + lean * 0.2, base - h * 0.5, topX, topY); x0.stroke();
    x0.lineWidth = 2.5;
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI + (k / 8) * Math.PI, len = 26 + (k % 3) * 6;
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.45 + 12;
      x0.beginPath(); x0.moveTo(topX, topY); x0.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY - 10, ex, ey); x0.stroke();
    }
  }
  let x0 = null;
  function palms() {
    const LW = W + 60, LH = 260;
    return { w: LW, h: LH, cv: offscreen(LW, LH, (x) => {
      x0 = x; x.filter = 'blur(0.8px)';
      palm(30, LH, 200, -14); palm(62, LH, 165, 10); palm(330, LH, 215, 12); palm(395, LH, 180, -10);
      x0 = null;
    }) };
  }

  const R0 = rng(7);
  const STARS = Array.from({ length: 46 }, () => ({ x: R0() * W, y: R0() * 300, s: R0() * 1.1 + 0.4, p: R0() * 6.28, sp: 0.6 + R0() * 1.8 }));
  const CITY_BOKEH = Array.from({ length: 34 }, () => ({ x: R0() * (W + 40) - 20, y: HORIZON - 120 + R0() * 150, r: 6 + R0() * 22, p: R0() * 6.28, c: (R0() * 3) | 0 }));
  const NEAR_BOKEH = Array.from({ length: 9 }, () => ({ x: R0() * W, y: 60 + R0() * 640, r: 30 + R0() * 40, sp: 3 + R0() * 6, p: R0() * 6.28, c: (R0() * 3) | 0 }));
  const FAR = skyline(11, 50, 160, '#1d1320', ['#d9b892', '#f6efe9', '#e889b0'], 0.2, 1.4);
  const NEAR = skyline(23, 90, 220, '#110b12', ['#d9b892', '#f4a6c6'], 0.16, 3);
  const TONES = ['217,184,146', '244,166,198', '246,239,233'];
  const BULB = TONES.map((c) => glow(c, 48, 1));
  const DISC = TONES.map((c) => disc(c, 96));
  const MOON = glow('246,239,233', 180, 0.5);
  const RIM = glow('217,184,146', 400, 0.32);
  const HILLS = hills(), PALMS = palms();
  const STRANDS = [
    { x0: -20, y0: 96, x1: 410, y1: 132, sag: 54, n: 18, ph: 0, size: 26 },
    { x0: -40, y0: 238, x1: 430, y1: 196, sag: 40, n: 9, ph: 1.9, size: 0 },   // near strand: out of focus, drawn as discs
  ];

  let skyGrad = null, hazeGrad = null, fadeGrad = null;
  function grads(ctx) {
    if (skyGrad) return;
    skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON);
    skyGrad.addColorStop(0, '#0b0a0f'); skyGrad.addColorStop(0.55, '#1a0f1c'); skyGrad.addColorStop(1, '#3a1d33');
    hazeGrad = ctx.createLinearGradient(0, HORIZON - 170, 0, HORIZON + 20);
    hazeGrad.addColorStop(0, 'rgba(232,137,176,0)'); hazeGrad.addColorStop(1, 'rgba(232,137,176,.22)');
    fadeGrad = ctx.createLinearGradient(0, 360, 0, H);
    fadeGrad.addColorStop(0, 'rgba(11,10,15,0)'); fadeGrad.addColorStop(0.3, 'rgba(11,10,15,.5)'); fadeGrad.addColorStop(0.55, 'rgba(11,10,15,.82)'); fadeGrad.addColorStop(0.75, 'rgba(11,10,15,.97)'); fadeGrad.addColorStop(1, '#0b0a0f');
  }

  function strandPoint(s, u, t) {
    const sway = Math.sin(t * 1.1 + s.ph) * 3.5, k = 4 * u * (1 - u);
    return { x: s.x0 + (s.x1 - s.x0) * u + sway * k * 0.6, y: s.y0 + (s.y1 - s.y0) * u + (s.sag + sway) * k };
  }

  function drawBack(ctx, t, cam) {
    grads(ctx);
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
    STARS.forEach((s) => {
      ctx.globalAlpha = 0.2 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.sp + s.p));
      ctx.fillStyle = '#f6efe9'; ctx.fillRect(s.x + cam * 0.1, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;
    ctx.drawImage(MOON, 250 + cam * 0.15, 20, 160, 160);
    ctx.drawImage(HILLS.cv, -30 + cam * 0.2, HORIZON - 150 - HILLS.h + 60, HILLS.w, HILLS.h);
    ctx.drawImage(FAR.cv, -30 + cam * 0.35, HORIZON - FAR.h, FAR.w, FAR.h);
    CITY_BOKEH.forEach((b) => {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 0.7 + b.p);
      ctx.drawImage(DISC[b.c], b.x + cam * 0.5 - b.r, b.y - b.r, b.r * 2, b.r * 2);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = hazeGrad; ctx.fillRect(0, HORIZON - 170, W, 190);
    ctx.drawImage(NEAR.cv, -30 + cam * 0.7, HORIZON + 20 - NEAR.h, NEAR.w, NEAR.h);
    ctx.drawImage(PALMS.cv, -30 + cam * 0.85, HORIZON + 24 - PALMS.h, PALMS.w, PALMS.h);
    ctx.fillStyle = '#0d090e'; ctx.fillRect(0, HORIZON + 18, W, H - HORIZON - 18);
    const fs = STRANDS[0];
    ctx.strokeStyle = 'rgba(11,10,15,.7)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const p = strandPoint(fs, i / 40, t); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.stroke();
    for (let i = 0; i < fs.n; i++) {
      const p = strandPoint(fs, (i + 0.5) / fs.n, t);
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 2.2 + i * 1.7);
      ctx.drawImage(BULB[i % 2], p.x - fs.size / 2, p.y - fs.size / 2 + 4, fs.size, fs.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(RIM, 150 + cam * 0.2, 120, 400, 400);   // warm key light behind his shoulder
    ctx.globalCompositeOperation = 'source-over';
  }

  /* over the portrait: near out-of-focus lights, grade, bottom fade for UI legibility */
  function drawFront(ctx, t) {
    grads(ctx);
    const ns = STRANDS[1];
    for (let i = 0; i < ns.n; i++) {
      const p = strandPoint(ns, (i + 0.5) / ns.n, t), r = 26 + (i % 3) * 8;
      ctx.globalAlpha = 0.16 + 0.06 * Math.sin(t * 1.6 + i);
      ctx.drawImage(DISC[i % 2], p.x - r, p.y - r, r * 2, r * 2);
    }
    NEAR_BOKEH.forEach((b) => {
      const y = ((b.y - t * b.sp) % 700 + 700) % 700 + 40;
      ctx.globalAlpha = 0.08 + 0.05 * Math.sin(t * 0.8 + b.p);
      ctx.drawImage(DISC[b.c], b.x + Math.sin(t * 0.3 + b.p) * 12 - b.r, y - b.r, b.r * 2, b.r * 2);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(42,22,38,.16)'; ctx.fillRect(0, 0, W, H);   // plum grade
    ctx.fillStyle = fadeGrad; ctx.fillRect(0, 360, W, H - 360);
  }

  window.Ch2Art = { drawBack, drawFront };
})();
