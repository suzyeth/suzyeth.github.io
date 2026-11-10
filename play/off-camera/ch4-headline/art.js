/* Episode 4 · The Morning After — art. Everything is painted once into offscreen
 * canvases (tile sprites, specials, photos, the hotel-suite backdrop, the board glass),
 * so the frame loop only calls drawImage. No per-frame gradients or shadowBlur. */
(function () {
  'use strict';
  const SP = 2;            // sprite pixel ratio
  const T = 48;            // tile size in stage units
  const W = 390, H = 780;
  const mkCanvas = (w, h, r) => { const c = document.createElement('canvas'); c.width = Math.round(w * (r || SP)); c.height = Math.round(h * (r || SP)); const x = c.getContext('2d'); x.scale(r || SP, r || SP); return [c, x]; };
  const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };

  /* Matchable pieces are standalone 3D-looking objects (no square backplate): each has its own
   * silhouette AND hue, a key light from the top-left, a thin darker outline and a baked contact
   * shadow. Each fills ~80–86% of the 50-unit cell. `base` is the particle colour. */
  const TILE = [
    { base: '#ff4f8b', light: '#ffc2da', name: 'heart' },    // deep pink → raspberry
    { base: '#2f8bff', light: '#bfe0ff', name: 'pick' },     // electric-blue translucent pick
    { base: '#2ec482', light: '#c9ffe6', name: 'coffee' },   // mint enamel mug
    { base: '#ffcc2e', light: '#fff2a8', name: 'star' },     // faceted gold
    { base: '#ff5a1f', light: '#ffc9a8', name: 'vinyl' },    // orange-red coloured vinyl
    { base: '#a64dff', light: '#e8ccff', name: 'mic' },      // purple sparkle mic
    /* one hue per piece (pink · blue · green · yellow · orange · purple), like Royal Match / Candy Crush */
  ];
  const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rad = (x, x0, y0, r0, x1, y1, r1, stops) => { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function heartPath(x, cx, cy, s) {
    x.beginPath(); x.moveTo(cx, cy + s * 0.32);
    x.bezierCurveTo(cx, cy - s * 0.05, cx - s * 0.52, cy - s * 0.05, cx - s * 0.52, cy + s * 0.3);
    x.bezierCurveTo(cx - s * 0.52, cy + s * 0.58, cx - s * 0.1, cy + s * 0.72, cx, cy + s * 0.92);
    x.bezierCurveTo(cx + s * 0.1, cy + s * 0.72, cx + s * 0.52, cy + s * 0.58, cx + s * 0.52, cy + s * 0.3);
    x.bezierCurveTo(cx + s * 0.52, cy - s * 0.05, cx, cy - s * 0.05, cx, cy + s * 0.32); x.closePath();
  }
  const gloss = (x, cx, cy, rx, ry, rot, a) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fillStyle = `rgba(255,255,255,${a})`; x.fill(); };
  function pickPath(x) {
    x.beginPath(); x.moveTo(24, 44.5);
    x.bezierCurveTo(13, 34, 4.5, 21, 6.5, 12.5); x.bezierCurveTo(8.5, 4, 39.5, 4, 41.5, 12.5); x.bezierCurveTo(43.5, 21, 35, 34, 24, 44.5); x.closePath();
  }
  function starPts(cx, cy, R, r) {
    const out = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; out.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    return out;
  }
  const PIECE = {
    heart(x) {
      heartPath(x, 24, 4.5, 40);
      x.fillStyle = rad(x, 15, 13, 2, 24, 22, 26, [[0, '#ffa6cb'], [0.35, '#ff4f8b'], [0.8, '#d01a5c'], [1, '#9c0f43']]); x.fill();
      x.lineWidth = 1.3; x.strokeStyle = '#5e0628'; x.stroke();
      x.save(); heartPath(x, 24, 4.5, 40); x.clip();
      heartPath(x, 24, 7, 36); x.lineWidth = 3; x.strokeStyle = 'rgba(120,0,40,.35)'; x.stroke();
      x.beginPath(); x.ellipse(27, 38, 9, 4, -0.5, 0, Math.PI * 2); x.fillStyle = 'rgba(255,150,190,.35)'; x.fill();
      x.restore();
      gloss(x, 13.5, 13, 6.2, 3.6, -0.7, 0.85); gloss(x, 31.5, 10.5, 2.6, 1.6, -0.5, 0.6); gloss(x, 19.5, 18.5, 1.4, 1.4, 0, 0.9);
    },
    pick(x) {
      pickPath(x);
      x.fillStyle = lin(x, 8, 6, 38, 42, [[0, '#a8dcff'], [0.35, '#4aa2ff'], [0.75, '#1f63e6'], [1, '#0e3796']]); x.fill();
      x.lineWidth = 1.4; x.strokeStyle = '#061f5e'; x.stroke();
      x.save(); pickPath(x); x.clip();
      x.fillStyle = rad(x, 22, 20, 1, 22, 21, 15, [[0, 'rgba(225,245,255,.8)'], [0.6, 'rgba(140,200,255,.22)'], [1, 'rgba(120,190,255,0)']]); x.fillRect(0, 0, 48, 48);
      x.translate(24, 25); x.scale(0.78, 0.78); x.translate(-24, -25); pickPath(x);
      x.lineWidth = 2.6; x.strokeStyle = 'rgba(200,232,255,.5)'; x.stroke();
      x.restore();
      gloss(x, 14, 11, 6, 2.6, -0.25, 0.75); gloss(x, 33, 10.5, 2, 1.2, 0.2, 0.55);
    },
    coffee(x) {
      /* mint enamel mug: one bold steam curl, chunky handle, no fine bands */
      x.lineCap = 'round'; x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.8)';
      x.beginPath(); x.moveTo(22, 11); x.bezierCurveTo(16.5, 7.5, 26.5, 5.5, 22, 1.5); x.stroke();
      x.beginPath(); x.arc(38, 27, 7, -1.35, 1.35); x.lineWidth = 6; x.strokeStyle = '#0b4a2c'; x.stroke();
      x.lineWidth = 3.6; x.strokeStyle = '#37c98a'; x.stroke();
      x.beginPath(); x.moveTo(5.5, 13.5); x.lineTo(38, 13.5); x.lineTo(36, 39); x.quadraticCurveTo(21.75, 47, 7.5, 39); x.closePath();
      x.fillStyle = lin(x, 5.5, 0, 38, 0, [[0, '#b8ffd9'], [0.3, '#5ee6a6'], [0.75, '#22a86a'], [1, '#12704a']]); x.fill();
      x.lineWidth = 1.4; x.strokeStyle = '#0b4a2c'; x.stroke();
      x.beginPath(); x.ellipse(21.75, 13.5, 16.25, 4.2, 0, 0, Math.PI * 2); x.fillStyle = '#f4fff9'; x.fill(); x.lineWidth = 1.3; x.strokeStyle = '#0b4a2c'; x.stroke();
      x.beginPath(); x.ellipse(21.75, 14.1, 13.4, 3, 0, 0, Math.PI * 2); x.fillStyle = rad(x, 18, 13.5, 1, 21.75, 14.5, 13, [[0, '#9a5a32'], [1, '#3e1d0c']]); x.fill();
      gloss(x, 12, 25, 2.6, 8, 0, 0.75); gloss(x, 16, 36, 1.4, 1.4, 0, 0.6);
    },
    star(x) {
      const cx = 24, cy = 25.5, P = starPts(cx, cy, 21.5, 9.6), L = [-0.7, -0.7];
      x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
      x.fillStyle = '#e8a800'; x.fill();
      /* two facets per arm, lit by how much each faces the top-left light */
      for (let i = 0; i < 10; i += 2) {
        const tip = P[i];
        [P[(i + 9) % 10], P[i + 1]].forEach((inner) => {
          const mx = (tip[0] + inner[0] + cx) / 3 - cx, my = (tip[1] + inner[1] + cy) / 3 - cy, n = Math.hypot(mx, my) || 1;
          const k = Math.max(0, (mx / n) * L[0] + (my / n) * L[1]);
          x.beginPath(); x.moveTo(cx, cy); x.lineTo(tip[0], tip[1]); x.lineTo(inner[0], inner[1]); x.closePath();
          x.fillStyle = k > 0.5 ? '#fff0a0' : k > 0.15 ? '#ffd23a' : (mx > 0 ? '#e9a100' : '#f2b818'); x.fill();
        });
      }
      x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
      x.lineJoin = 'round'; x.lineWidth = 1.3; x.strokeStyle = '#7a4a00'; x.stroke();
      x.strokeStyle = 'rgba(160,100,0,.45)'; x.lineWidth = 0.8;
      for (let i = 0; i < 10; i += 2) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(P[i][0], P[i][1]); x.stroke(); }
      [[P[0], 1.8], [P[8], 1.6], [P[2], 1.1]].forEach(([[a, b], r]) => gloss(x, a + (cx - a) * 0.18, b + (cy - b) * 0.18, r, r, 0, 0.95));
      gloss(x, 19, 20, 2.4, 1.4, -0.6, 0.7);
    },
    vinyl(x) {
      /* coloured (orange-red) vinyl: bright disc, two bold grooves, cream label */
      const cx = 24, cy = 23.5;
      x.beginPath(); x.arc(cx, cy, 21, 0, Math.PI * 2);
      x.fillStyle = rad(x, 17, 16, 2, cx, cy, 21.5, [[0, '#ffb27a'], [0.45, '#ff6a2a'], [0.85, '#d6340a'], [1, '#8a1a04']]); x.fill();
      x.lineWidth = 1.4; x.strokeStyle = '#4a0d02'; x.stroke();
      x.lineWidth = 1.4; x.strokeStyle = 'rgba(110,20,0,.35)';
      [17.5, 13].forEach((r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); });
      x.lineCap = 'round';
      x.beginPath(); x.arc(cx, cy, 15.5, -2.75, -1.7); x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.7)'; x.stroke();
      x.beginPath(); x.arc(cx, cy, 15.5, 0.45, 1.05); x.lineWidth = 1.6; x.strokeStyle = 'rgba(255,255,255,.25)'; x.stroke();
      x.beginPath(); x.arc(cx, cy, 8, 0, Math.PI * 2);
      x.fillStyle = rad(x, 21.5, 21, 0.5, cx, cy, 8.5, [[0, '#ffffff'], [0.6, '#fff1dc'], [1, '#f2cfa6']]); x.fill();
      x.lineWidth = 1; x.strokeStyle = '#7a2a08'; x.stroke();
      x.beginPath(); x.arc(cx, cy, 1.8, 0, Math.PI * 2); x.fillStyle = '#4a0d02'; x.fill();
    },
    mic(x) {
      /* purple sparkle mic: big head, chunky handle, gold collar, a few glitter dots instead of a fine mesh */
      x.save(); x.translate(24, 25); x.rotate(-0.38);
      x.beginPath(); x.moveTo(-6, 3); x.lineTo(6, 3); x.lineTo(3.8, 20.5); x.quadraticCurveTo(0, 23, -3.8, 20.5); x.closePath();
      x.fillStyle = lin(x, -6, 0, 6, 0, [[0, '#6a3a8e'], [0.4, '#3c1a5c'], [1, '#1c0a2e']]); x.fill(); x.lineWidth = 1.3; x.strokeStyle = '#12051f'; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.28)'; x.fillRect(-3.6, 6, 1.4, 12);
      x.beginPath(); x.ellipse(0, 2.8, 8.2, 3, 0, 0, Math.PI * 2); x.fillStyle = lin(x, -8, 0, 8, 0, [[0, '#fff0a0'], [0.5, '#ffc93a'], [1, '#c98a00']]); x.fill(); x.lineWidth = 1.1; x.strokeStyle = '#6a4200'; x.stroke();
      x.beginPath(); x.arc(0, -9.5, 14, 0, Math.PI * 2);
      x.fillStyle = rad(x, -5, -15, 1, 0, -9.5, 14.5, [[0, '#f6e2ff'], [0.3, '#c27aff'], [0.75, '#8a2be2'], [1, '#4a0f8a']]); x.fill();
      x.save(); x.clip();
      x.fillStyle = 'rgba(40,0,80,.28)';
      [-4.5, 0, 4.5].forEach((gx) => { x.fillRect(gx - 0.6, -24, 1.2, 30); });
      x.fillRect(-14, -12, 28, 1.2); x.fillRect(-14, -6.5, 28, 1.2);
      x.restore();
      x.beginPath(); x.arc(0, -9.5, 14, 0, Math.PI * 2); x.lineWidth = 1.4; x.strokeStyle = '#2a0650'; x.stroke();
      gloss(x, -5.5, -15.5, 5, 3, -0.6, 0.85); gloss(x, 6, -3.5, 1.6, 1.6, 0, 0.7); gloss(x, 3, -17, 1.1, 1.1, 0, 0.9); gloss(x, -8, -5, 0.9, 0.9, 0, 0.8);
      x.restore();
    },
  };
  const names = ['heart', 'pick', 'coffee', 'star', 'vinyl', 'mic'];
  /* soft contact shadow under a piece (baked) */
  function contact(x, rx) {
    x.save(); x.translate(24, 44.5); x.scale(1, 0.24);
    x.fillStyle = rad(x, 0, 0, 0, 0, 0, rx, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]);
    x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill(); x.restore();
  }
  /* the piece alone (used for masks), and the piece with its contact shadow (drawn on the board) */
  /* movable pieces sit on a raised, glossy tinted plate (one tint per kind); the paparazzi photo
   * has no plate, it is a flat grey print sunk into the slot, so "can move" vs "stuck" reads at a glance */
  const PLATE = {
    heart: ['#ffe1ec', '#ffb8d3', '#ee7fab', '#9c2c60'],
    pick: ['#e2f1ff', '#b4d8ff', '#6fa8ee', '#24589e'],
    coffee: ['#ddfbec', '#aeecce', '#62c99a', '#1a6e48'],
    star: ['#fff6d2', '#ffe48e', '#f0bf45', '#98680a'],
    vinyl: ['#ffe6d6', '#ffc6a2', '#f28d58', '#9c3f16'],
    mic: ['#f1e6ff', '#d9bfff', '#ad80ec', '#55289a'],
  };
  function plate(x, p) {
    x.save(); x.shadowColor = 'rgba(8,2,10,.55)'; x.shadowBlur = 5; x.shadowOffsetY = 2.5;
    rr(x, 3, 3, T - 6, T - 5, 12); x.fillStyle = p[3]; x.fill(); x.restore();
    rr(x, 3, 3, T - 6, T - 7.5, 12); x.fillStyle = lin(x, 0, 3, 0, T - 4, [[0, p[0]], [0.3, p[1]], [1, p[2]]]); x.fill();
    rr(x, 3.6, 3.6, T - 7.2, T - 8.7, 11.4); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.1; x.stroke();
    rr(x, 6.5, 5, T - 13, T / 2 - 9, 9); x.fillStyle = lin(x, 0, 4, 0, T / 2, [[0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]); x.fill();
  }
  const ICON_K = 0.72;   // the object fills ~72% of its plate
  function pieceOnly(i) {
    const [c, x] = mkCanvas(T, T);
    plate(x, PLATE[names[i]]);
    x.save(); x.translate(24, 22.5); x.scale(ICON_K, ICON_K); x.translate(-24, -24); PIECE[names[i]](x); x.restore();
    return c;
  }
  function withShadow(piece, rx) { const [c, x] = mkCanvas(T, T); contact(x, rx); x.drawImage(piece, 0, 0, T, T); return c; }

  /* layer() paints into a fresh canvas; maskTo() keeps only the part of a layer that lies on the piece */
  function layer(paint, w, h) { const [c, x] = mkCanvas(w || T, h || T); paint(x); return c; }
  function maskTo(piece, lay) { const [c, x] = mkCanvas(T, T); x.drawImage(piece, 0, 0, T, T); x.globalCompositeOperation = 'source-in'; x.drawImage(lay, 0, 0, T, T); return c; }

  /* glow halo around a charged heart (blur baked once, round to follow the heart) */
  function haloSprite() {
    const [c, x] = mkCanvas(T + 24, T + 24);
    x.shadowColor = '#ffd27a'; x.shadowBlur = 14;
    x.beginPath(); x.arc(36, 35, 23, 0, Math.PI * 2); x.strokeStyle = 'rgba(255,214,140,.95)'; x.lineWidth = 3; x.stroke();
    x.shadowBlur = 0;
    return c;
  }
  function chargeBadge() {
    const [c, x] = mkCanvas(20, 20);
    x.beginPath(); x.arc(10, 10, 9, 0, Math.PI * 2); x.fillStyle = '#ffd27a'; x.fill();
    x.strokeStyle = '#7a4a1a'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#5a2a08'; x.font = '800 10px "DM Sans", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('×2', 10, 10.5);
    return c;
  }
  /* Spotlight: bright stripes across the piece itself + arrow tips showing the line it clears */
  function spotlightOverlay(piece, dir) {
    const stripes = layer((x) => {
      x.fillStyle = 'rgba(255,255,255,.3)';
      if (dir === 'h') x.fillRect(0, 13, T, 20); else x.fillRect(14, 0, 20, T);
      x.fillStyle = 'rgba(255,255,255,.9)';
      for (let k = -1; k <= 1; k++) { if (dir === 'h') x.fillRect(0, 23 + k * 7 - 1.5, T, 3); else x.fillRect(24 + k * 7 - 1.5, 0, 3, T); }
    });
    const [c, x] = mkCanvas(T, T);
    x.drawImage(maskTo(piece, stripes), 0, 0, T, T);
    x.fillStyle = '#fffbe8'; x.strokeStyle = 'rgba(60,20,40,.85)'; x.lineWidth = 1.1;
    const tri = (ax, ay, bx, by, cx, cy) => { x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineTo(cx, cy); x.closePath(); x.fill(); x.stroke(); };
    if (dir === 'h') { tri(0.5, 23, 6.5, 18, 6.5, 28); tri(T - 0.5, 23, T - 6.5, 18, T - 6.5, 28); }
    else { tri(24, 0.5, 19, 6.5, 29, 6.5); tri(24, T - 0.5, 19, T - 6.5, 29, T - 6.5); }
    return c;
  }
  /* Encore (L / T): a round gold burst ring with four sparkles */
  function sparkle(x, a, b, s) {
    x.beginPath(); x.moveTo(a, b - s); x.lineTo(a + s * 0.3, b - s * 0.3); x.lineTo(a + s, b); x.lineTo(a + s * 0.3, b + s * 0.3);
    x.lineTo(a, b + s); x.lineTo(a - s * 0.3, b + s * 0.3); x.lineTo(a - s, b); x.lineTo(a - s * 0.3, b - s * 0.3); x.closePath(); x.fill();
  }
  function areaOverlay() {
    const [c, x] = mkCanvas(T, T);
    x.save(); x.shadowColor = '#ffd27a'; x.shadowBlur = 6;
    x.beginPath(); x.arc(24, 24, 22, 0, Math.PI * 2); x.strokeStyle = '#ffd27a'; x.lineWidth = 2.6; x.stroke(); x.restore();
    x.beginPath(); x.arc(24, 24, 19.5, 0, Math.PI * 2); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1; x.stroke();
    x.fillStyle = '#fffaf0';
    [[7, 7], [T - 7, 7], [7, T - 7], [T - 7, T - 7]].forEach(([a, b]) => sparkle(x, a, b, 4.2));
    return c;
  }
  /* burst rays that rotate behind an Encore (drawn under the piece) */
  function burstSprite() {
    const [c, x] = mkCanvas(T + 24, T + 24);
    x.translate((T + 24) / 2, (T + 24) / 2);
    for (let i = 0; i < 12; i++) {
      x.rotate(Math.PI / 6);
      x.beginPath(); x.moveTo(-3, 0); x.lineTo(0, -(T / 2 + 11)); x.lineTo(3, 0); x.closePath();
      x.fillStyle = i % 2 ? 'rgba(255,214,140,.75)' : 'rgba(255,244,236,.55)'; x.fill();
    }
    return c;
  }
  /* Encore (5 in a row): a standalone mirror ball */
  function encorePiece() {
    const [c, x] = mkCanvas(T, T);
    x.beginPath(); x.arc(24, 24, 19, 0, Math.PI * 2);
    x.fillStyle = rad(x, 17, 16, 2, 24, 24, 20, [[0, '#ffffff'], [0.45, '#e2daf0'], [1, '#77699a']]); x.fill();
    x.save(); x.clip();
    const cols = ['#ff4f8b', '#ff7a1a', '#ffcc2e', '#1fc7b0', '#3da5ff', '#8f8cff', '#fff4ec'];
    let k = 0;
    for (let yy = 4; yy < 46; yy += 4.4) for (let xx = 4; xx < 46; xx += 4.4) { x.globalAlpha = 0.62; x.fillStyle = cols[k++ % cols.length]; x.fillRect(xx + ((Math.round(yy / 4.4)) % 2) * 2.2, yy, 3.4, 3.4); }
    x.globalAlpha = 1;
    x.fillStyle = rad(x, 16, 15, 1, 24, 24, 20, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(30,10,50,.35)']]); x.fillRect(0, 0, T, T);
    x.restore();
    x.beginPath(); x.arc(24, 24, 19, 0, Math.PI * 2); x.lineWidth = 1.3; x.strokeStyle = '#3a2a55'; x.stroke();
    gloss(x, 16.5, 15, 4.6, 2.8, -0.7, 0.95);
    return c;
  }
  /* rainbow sheen ring that rotates around the mirror ball */
  function rainbowSprite() {
    const [c, x] = mkCanvas(T, T);
    const cols = ['#ff4f8b', '#ff7a1a', '#fff27a', '#1fc7b0', '#3da5ff', '#8f8cff'];
    x.lineWidth = 2.6;
    cols.forEach((col, i) => { x.beginPath(); x.arc(24, 24, 21.5, i * Math.PI / 3, (i + 1) * Math.PI / 3); x.strokeStyle = col; x.stroke(); });
    return c;
  }
  /* shimmer: a diagonal glint swept across one piece, baked as frames masked to its silhouette */
  function shimmerFrames(piece, n) {
    const out = [];
    for (let f = 0; f < n; f++) {
      const p = -20 + (f / (n - 1)) * (T + 40);
      out.push(maskTo(piece, layer((x) => {
        x.translate(p, 0); x.rotate(0.5);
        x.fillStyle = lin(x, -7, 0, 7, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]);
        x.fillRect(-7, -40, 14, 120);
      })));
    }
    return out;
  }
  /* white silhouette of one piece, flashed for ~60 ms when it matches */
  function flashSprite(piece) { return maskTo(piece, layer((x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, T, T); })); }

  /* paparazzi photo blocker: matte, flat in the slot (no shadow, no gloss), desaturated print,
   * camera glyph, tape corners and a faint diagonal hatch. It reads as "stuck", not "pick-up-able". */
  function photoBase(x) {
    /* darker and lower-contrast than the bright plates, with an inner top shadow so it sits *in* the slot */
    rr(x, 2, 2, T - 4, T - 4, 6); x.fillStyle = '#5e5664'; x.fill();
    rr(x, 2.5, 2.5, T - 5, T - 5, 5.5); x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 1; x.stroke();
    rr(x, 4.5, 4.5, T - 9, T - 9, 3); x.fillStyle = '#a49ca4'; x.fill();
    x.fillStyle = '#4a4450'; x.fillRect(8, 8, T - 16, T - 21);
    x.save(); x.beginPath(); x.rect(8, 8, T - 16, T - 21); x.clip();
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1.2;
    for (let k = -T; k < T; k += 5) { x.beginPath(); x.moveTo(k, 8); x.lineTo(k + 30, 38); x.stroke(); }
    x.restore();
    /* camera glyph */
    x.fillStyle = '#d9d2cc';
    rr(x, 14, 15, 20, 13, 2.5); x.fill();
    x.fillRect(18.5, 12.5, 7, 3);
    x.beginPath(); x.arc(24, 21.5, 4.6, 0, Math.PI * 2); x.fillStyle = '#4a4450'; x.fill();
    x.beginPath(); x.arc(24, 21.5, 2.6, 0, Math.PI * 2); x.fillStyle = '#9a93a0'; x.fill();
    x.fillStyle = '#4a4450'; x.fillRect(29.5, 16.5, 2.6, 1.8);
    /* caption lines on the white strip */
    x.fillStyle = 'rgba(70,64,76,.55)'; x.fillRect(9, T - 11, 22, 1.6); x.fillRect(9, T - 8, 14, 1.6);
    /* tape corners */
    x.fillStyle = 'rgba(200,184,146,.7)';
    [[5, 5, -0.78], [T - 5, 5, 0.78]].forEach(([a, b, rot]) => { x.save(); x.translate(a, b); x.rotate(rot); x.fillRect(-6, -2.6, 12, 5.2); x.restore(); });
    x.save(); rr(x, 2, 2, T - 4, T - 4, 6); x.clip();
    x.fillStyle = lin(x, 0, 2, 0, 12, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(2, 2, T - 4, 10);
    x.restore();
  }
  function photoSprite() { const [c, x] = mkCanvas(T, T); photoBase(x); return c; }
  /* the hit frame: same print with cracks, shown for a beat before it shatters */
  function crackSprite() {
    const [c, x] = mkCanvas(T, T);
    photoBase(x);
    x.strokeStyle = '#fbf6f0'; x.lineWidth = 1.4; x.lineJoin = 'round';
    [[[24, 22], [14, 10], [9, 6]], [[24, 22], [36, 12], [42, 5]], [[24, 22], [33, 32], [40, 43]], [[24, 22], [13, 30], [6, 40]], [[24, 22], [26, 36], [23, 44]]]
      .forEach((pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([a, b]) => x.lineTo(a, b)); x.stroke(); });
    x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(25, 23); x.lineTo(37, 13); x.moveTo(25, 23); x.lineTo(34, 33); x.stroke();
    return c;
  }
  /* refusal mark flashed over a photo when you try to move it */
  function refuseSprite() {
    const [c, x] = mkCanvas(T, T);
    x.beginPath(); x.arc(24, 23, 13, 0, Math.PI * 2); x.fillStyle = 'rgba(30,8,20,.78)'; x.fill();
    x.lineWidth = 2.2; x.strokeStyle = '#ff6b8f'; x.stroke();
    x.lineCap = 'round'; x.lineWidth = 3.4; x.strokeStyle = '#fff4ec';
    x.beginPath(); x.moveTo(18.5, 17.5); x.lineTo(29.5, 28.5); x.moveTo(29.5, 17.5); x.lineTo(18.5, 28.5); x.stroke();
    return c;
  }
  /* selection: a bright double ring around the lifted tile */
  function selectSprite() {
    const [c, x] = mkCanvas(T + 10, T + 10);
    x.save(); x.shadowColor = '#ffffff'; x.shadowBlur = 6;
    rr(x, 2.5, 2.5, T + 5, T + 5, 16); x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.stroke(); x.restore();
    rr(x, 6, 6, T - 2, T - 2, 13); x.strokeStyle = 'rgba(255,214,140,.95)'; x.lineWidth = 1.6; x.stroke();
    return c;
  }
  /* the slot under a neighbour you can swap the selected tile with */
  function targetSprite() {
    const [c, x] = mkCanvas(T + 2, T + 2);
    rr(x, 1, 1, T, T, 13); x.fillStyle = 'rgba(255,240,214,.22)'; x.fill();
    x.setLineDash([4, 3]); rr(x, 1.5, 1.5, T - 1, T - 1, 12.5); x.strokeStyle = 'rgba(255,244,236,.8)'; x.lineWidth = 1.4; x.stroke();
    return c;
  }
  /* hint arrow (points right; rotated in the game) */
  function arrowSprite() {
    const [c, x] = mkCanvas(30, 22);
    x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 3; x.shadowOffsetY = 1;
    x.beginPath(); x.moveTo(2, 7.5); x.lineTo(16, 7.5); x.lineTo(16, 2); x.lineTo(28, 11); x.lineTo(16, 20); x.lineTo(16, 14.5); x.lineTo(2, 14.5); x.closePath();
    x.fillStyle = '#fff8ec'; x.fill(); x.restore();
    x.lineWidth = 1.3; x.strokeStyle = '#d6457d'; x.stroke();
    return c;
  }
  function beamSprite() {
    const [c, x] = mkCanvas(64, 64, 1);
    const g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(0.5, 'rgba(255,246,232,1)'); g.addColorStop(1, 'rgba(255,240,220,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  }
  function glowSprite(color) {
    const [c, x] = mkCanvas(64, 64, 1);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  }

  /* ---------- backdrop: hotel suite, morning after ---------- */
  function backdrop() {
    const [c, x] = mkCanvas(W, H);
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f6dccb'); sky.addColorStop(0.3, '#e9b8b4'); sky.addColorStop(0.62, '#8c6283'); sky.addColorStop(1, '#2a1a2e');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    const sun = x.createRadialGradient(300, 150, 10, 300, 150, 260);
    sun.addColorStop(0, 'rgba(255,244,220,.95)'); sun.addColorStop(0.3, 'rgba(255,220,190,.45)'); sun.addColorStop(1, 'rgba(255,200,180,0)');
    x.fillStyle = sun; x.fillRect(0, 0, W, H);
    /* city haze: three skyline layers, nearer = darker */
    const skyline = (base, amp, color, seed) => {
      x.beginPath(); x.moveTo(0, H);
      let px = -10, s = seed;
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      while (px < W + 20) {
        const w = 14 + rnd() * 30, h = base - rnd() * amp;
        x.lineTo(px, h); x.lineTo(px + w, h);
        if (rnd() < 0.2) { x.lineTo(px + w / 2, h - 18); x.lineTo(px + w / 2 + 2, h - 18); }
        px += w;
      }
      x.lineTo(W + 20, H); x.closePath(); x.fillStyle = color; x.fill();
    };
    skyline(330, 90, 'rgba(214,160,170,.55)', 7);
    skyline(380, 110, 'rgba(160,110,140,.6)', 13);
    skyline(440, 120, 'rgba(96,62,96,.75)', 29);
    const haze = x.createLinearGradient(0, 260, 0, 470);
    haze.addColorStop(0, 'rgba(255,226,214,0)'); haze.addColorStop(1, 'rgba(255,214,206,.35)');
    x.fillStyle = haze; x.fillRect(0, 240, W, 240);
    /* window frame + mullions */
    x.fillStyle = 'rgba(40,24,38,.88)';
    x.fillRect(0, 0, W, 22); x.fillRect(0, 0, 16, H); x.fillRect(W - 16, 0, 16, H);
    x.fillRect(128, 0, 7, 470); x.fillRect(258, 0, 7, 470); x.fillRect(0, 244, W, 6);
    x.fillStyle = 'rgba(255,240,226,.18)'; x.fillRect(135, 0, 1.5, 470); x.fillRect(265, 0, 1.5, 470);
    /* sheer curtains */
    const curtain = (x0, dir) => {
      for (let i = 0; i < 6; i++) {
        const g = x.createLinearGradient(x0 + i * 9 * dir, 0, x0 + (i * 9 + 9) * dir, 0);
        g.addColorStop(0, 'rgba(255,246,238,.10)'); g.addColorStop(0.5, 'rgba(255,246,238,.30)'); g.addColorStop(1, 'rgba(255,246,238,.08)');
        x.fillStyle = g; x.fillRect(Math.min(x0 + i * 9 * dir, x0 + (i * 9 + 9) * dir), 0, 9, 520);
      }
    };
    curtain(0, 1); curtain(W, -1);
    /* soft light rays from the window */
    x.save(); x.globalCompositeOperation = 'lighter';
    [[200, 0.07], [250, 0.05], [150, 0.04]].forEach(([dx, a]) => {
      x.beginPath(); x.moveTo(dx + 60, 0); x.lineTo(dx + 130, 0); x.lineTo(dx - 40, 780); x.lineTo(dx - 160, 780); x.closePath();
      x.fillStyle = `rgba(255,236,214,${a})`; x.fill();
    });
    x.restore();
    /* room: sill, a table edge with two coffee cups and a phone lit with headlines */
    const room = x.createLinearGradient(0, 470, 0, H);
    room.addColorStop(0, '#3a2638'); room.addColorStop(1, '#140c16');
    x.fillStyle = room; x.fillRect(0, 470, W, H - 470);
    x.fillStyle = 'rgba(255,230,210,.16)'; x.fillRect(0, 470, W, 2);
    x.fillStyle = '#20131f'; rr(x, -20, 690, W + 40, 120, 30); x.fill();
    x.fillStyle = 'rgba(255,220,190,.12)'; x.fillRect(0, 692, W, 1.5);
    const cup = (cx, cy) => {
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(cx, cy + 16, 26, 6, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#efe2d6'; x.beginPath(); x.ellipse(cx, cy + 13, 24, 5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#f7ede4'; x.beginPath(); x.moveTo(cx - 15, cy - 6); x.lineTo(cx + 15, cy - 6); x.lineTo(cx + 12, cy + 10); x.quadraticCurveTo(cx, cy + 15, cx - 12, cy + 10); x.closePath(); x.fill();
      x.strokeStyle = '#f7ede4'; x.lineWidth = 3; x.beginPath(); x.arc(cx + 16, cy + 1, 5, -1.3, 1.3); x.stroke();
      x.fillStyle = '#5a321f'; x.beginPath(); x.ellipse(cx, cy - 6, 14, 3, 0, 0, Math.PI * 2); x.fill();
    };
    cup(62, 726); cup(118, 738);
    x.save(); x.translate(300, 735); x.rotate(-0.18);
    x.fillStyle = '#0d0a10'; rr(x, -28, -44, 56, 92, 9); x.fill();
    const scr = x.createLinearGradient(0, -40, 0, 44); scr.addColorStop(0, '#f8d4e2'); scr.addColorStop(1, '#a785c4');
    x.fillStyle = scr; rr(x, -24, -40, 48, 84, 6); x.fill();
    x.fillStyle = 'rgba(40,14,34,.55)'; [-30, -22, -14, -2, 6, 14].forEach((yy, i) => x.fillRect(-18, yy, i % 3 === 2 ? 22 : 36, 3));
    x.fillStyle = 'rgba(232,72,127,.85)'; x.fillRect(-18, 24, 36, 10);
    x.restore();
    /* vignette */
    const v = x.createRadialGradient(W / 2, H * 0.45, 120, W / 2, H * 0.5, 520);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,12,.55)');
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    return c;
  }
  /* board plate: a dark, nearly opaque tray with a lit champagne-to-pink rim, clearly separate
   * from the hotel backdrop, and recessed checkerboard slots in two tones so every cell reads */
  function boardGlass(cols, rows, cs) {
    const w = cols * cs + 16, h = rows * cs + 16;
    const [c, x] = mkCanvas(w, h);
    rr(x, 1, 1, w - 2, h - 2, 20); x.fillStyle = 'rgba(20,9,22,.94)'; x.fill();
    const rim = x.createLinearGradient(0, 0, 0, h);
    rim.addColorStop(0, '#f3d7ae'); rim.addColorStop(0.5, '#d9b892'); rim.addColorStop(1, '#e889b0');
    rr(x, 1.5, 1.5, w - 3, h - 3, 19.5); x.strokeStyle = rim; x.lineWidth = 2.2; x.stroke();
    rr(x, 4.5, 4.5, w - 9, h - 9, 16.5); x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 1; x.stroke();
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const sx = 8 + q * cs + 1.5, sy = 8 + r * cs + 1.5, s = cs - 3;
      rr(x, sx, sy, s, s, 9); x.fillStyle = (r + q) % 2 ? '#2a1830' : '#3b2442'; x.fill();
      x.save(); rr(x, sx, sy, s, s, 9); x.clip();
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(sx, sy, s, 3);
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(sx, sy + s - 2, s, 2);
      x.restore();
    }
    return c;
  }

  let cache = null;
  function sprites() {
    if (cache) return cache;
    /* index 0..5 = the six pieces, 6 = the mirror-ball Encore */
    const pieces = names.map((_, i) => pieceOnly(i)).concat([encorePiece()]);
    /* plated pieces carry their own drop shadow; only the free-standing mirror ball gets a contact shadow */
    const shadowed = pieces.map((p, i) => (i < 6 ? p : withShadow(p, 15)));
    cache = {
      T, tiles: shadowed.slice(0, 6), encore: shadowed[6], halo: haloSprite(), badge: chargeBadge(),
      spot: { h: pieces.slice(0, 6).map((p) => spotlightOverlay(p, 'h')), v: pieces.slice(0, 6).map((p) => spotlightOverlay(p, 'v')) },
      area: areaOverlay(), shimmer: pieces.map((p) => shimmerFrames(p, 14)), flash: pieces.map((p) => flashSprite(p)),
      photo: photoSprite(), crack: crackSprite(), refuse: refuseSprite(), select: selectSprite(), target: targetSprite(),
      arrow: arrowSprite(), burst: burstSprite(), rainbow: rainbowSprite(), beam: beamSprite(),
      glowPink: glowSprite('rgba(244,166,198,.9)'), glowGold: glowSprite('rgba(255,214,140,.9)'),
      colors: TILE.map((t) => t.base), light: TILE.map((t) => t.light),
    };
    return cache;
  }
  window.Ch4Art = { sprites, backdrop, boardGlass, heartPath, TILE };
})();
