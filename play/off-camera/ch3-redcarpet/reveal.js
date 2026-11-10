/* ch3 — painted backdrops (dressing room, red carpet) and the "Flash Moment" reveal:
 * Jace walks the carpet, cameras fire, the livestream chat scrolls past, then the stars land.
 * Exposes window.Ch3Reveal = { backstage(), play(opts) → Promise }. */
(function () {
  'use strict';
  const W = 390, H = 780, R = 2;
  const tr = (en, zh) => (Kit.tr ? Kit.tr(en, zh) : (Kit.lang && Kit.lang() === 'zh' ? zh : en));

  function offscreen(draw) {
    const c = document.createElement('canvas'); c.width = W * R; c.height = H * R;
    const x = c.getContext('2d'); x.scale(R, R); draw(x); return c;
  }
  function glowDot(x, cx, cy, r, rgb, a) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }
  function vignette(x, inner, a) {
    const g = x.createRadialGradient(W / 2, H * 0.45, inner, W / 2, H * 0.45, 560);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }

  /* dressing room behind the dress-up figure (character stands at x 52-223, y 204-514) */
  function backstage() {
    return offscreen((x) => {
      let g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2a1822'); g.addColorStop(0.6, '#150c13'); g.addColorStop(1, '#0b0a0f');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(255,255,255,.035)'; x.lineWidth = 1;
      for (let i = 0; i < W; i += 26) { x.beginPath(); x.moveTo(i, 70); x.lineTo(i, 520); x.stroke(); }
      /* vanity mirror */
      const mx = 30, my = 214, mw = 214, mh = 296;
      Kit.draw.roundRect(x, mx, my, mw, mh, 14);
      g = x.createLinearGradient(mx, my, mx + mw, my + mh);
      g.addColorStop(0, '#2b1a2a'); g.addColorStop(1, '#130b12');
      x.fillStyle = g; x.fill();
      x.strokeStyle = 'rgba(217,184,146,.45)'; x.lineWidth = 3; x.stroke();
      x.save(); Kit.draw.roundRect(x, mx, my, mw, mh, 14); x.clip();
      x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(mx + 30, my); x.lineTo(mx + 90, my); x.lineTo(mx + 10, my + mh); x.lineTo(mx - 50, my + mh); x.fill();
      x.restore();
      const bulbs = [];
      for (let bx = mx + 12; bx <= mx + mw - 10; bx += 27) bulbs.push([bx, my - 8]);
      for (let by = my + 22; by < my + mh - 10; by += 36) { bulbs.push([mx - 10, by]); bulbs.push([mx + mw + 10, by]); }
      bulbs.forEach(([bx, by]) => { glowDot(x, bx, by, 26, '255,224,170', 0.28); x.fillStyle = '#fff3d8'; x.beginPath(); x.arc(bx, by, 4.5, 0, Math.PI * 2); x.fill(); });
      /* clothing rack on the right */
      x.strokeStyle = 'rgba(217,184,146,.5)'; x.lineWidth = 3; x.beginPath(); x.moveTo(262, 330); x.lineTo(392, 330); x.stroke();
      ['#4a2236', '#2c2638', '#6b4a3a', '#3a1c2a', '#5a5060'].forEach((c, i) => {
        const gx = 272 + i * 24;
        x.strokeStyle = 'rgba(217,184,146,.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(gx + 10, 330); x.lineTo(gx + 10, 338); x.stroke();
        x.fillStyle = c; Kit.draw.roundRect(x, gx, 338, 22, 120 + (i % 3) * 22, 8); x.fill();
        x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(gx + 3, 344, 4, 100);
      });
      /* floor + warm spot */
      g = x.createLinearGradient(0, 505, 0, H); g.addColorStop(0, '#1a0f16'); g.addColorStop(1, '#0b0a0f');
      x.fillStyle = g; x.fillRect(0, 505, W, H - 505);
      glowDot(x, 138, 512, 120, '255,200,150', 0.18);
      vignette(x, 170, 0.78);
    });
  }

  /* the red carpet: step-and-repeat wall, carpet in perspective, ropes, crowd */
  const CROWD = [];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
    CROWD.push([10 + i * 26 + row * 9, 420 + row * 95 + (i % 2) * 14, row]);
    CROWD.push([380 - i * 26 - row * 9, 420 + row * 95 + ((i + 1) % 2) * 14, row]);
  }
  function carpet() {
    return offscreen((x) => {
      let g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1b0d16'); g.addColorStop(0.45, '#120a10'); g.addColorStop(1, '#0b0a0f');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      /* step-and-repeat wall: a pattern of stars, no words (works in either language) */
      x.fillStyle = 'rgba(217,184,146,.13)';
      for (let row = 0; row < 7; row++) for (let col = 0; col < 6; col++) {
        const cx = 30 + col * 70 + (row % 2) * 35, cy = 116 + row * 38, r = 7;
        x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r * 0.3, cy - r * 0.3); x.lineTo(cx + r, cy); x.lineTo(cx + r * 0.3, cy + r * 0.3);
        x.lineTo(cx, cy + r); x.lineTo(cx - r * 0.3, cy + r * 0.3); x.lineTo(cx - r, cy); x.lineTo(cx - r * 0.3, cy - r * 0.3); x.closePath(); x.fill();
      }
      glowDot(x, 195, 300, 220, '255,210,170', 0.12);
      /* carpet */
      x.beginPath(); x.moveTo(150, 360); x.lineTo(240, 360); x.lineTo(380, H); x.lineTo(10, H); x.closePath();
      g = x.createLinearGradient(0, 360, 0, H); g.addColorStop(0, '#3a0a18'); g.addColorStop(1, '#8a1430');
      x.fillStyle = g; x.fill();
      x.strokeStyle = 'rgba(255,255,255,.04)';
      for (let k = 1; k < 8; k++) { const t = k / 8; x.beginPath(); x.moveTo(150 + 90 * t, 360); x.lineTo(10 + 370 * t, H); x.stroke(); }
      /* rope posts + sagging velvet rope */
      const POSTS = [0.15, 0.45, 0.8].map((t) => ({ y: 360 + (H - 360) * t, l: 150 - 140 * t - 8, r: 240 + 140 * t + 8, h: 16 + 40 * t, t }));
      ['l', 'r'].forEach((side) => {
        x.strokeStyle = 'rgba(232,137,176,.75)'; x.lineWidth = 3; x.beginPath();
        POSTS.forEach((p, i) => {
          const top = p.y - p.h + 4;
          if (i === 0) { x.moveTo(p[side], top); return; }
          const q = POSTS[i - 1];
          x.quadraticCurveTo((p[side] + q[side]) / 2, (top + q.y - q.h + 4) / 2 + 22, p[side], top);
        });
        x.stroke();
        POSTS.forEach((p) => {
          x.fillStyle = '#d9b892'; x.fillRect(p[side] - 2, p.y - p.h, 4, p.h);
          x.beginPath(); x.arc(p[side], p.y - p.h, 4 + 3 * p.t, 0, Math.PI * 2); x.fill();
        });
      });
      /* crowd silhouettes with rim light */
      CROWD.slice().sort((a, b) => a[1] - b[1]).forEach(([cx, cy, row]) => {
        const s = 0.85 + row * 0.25;
        x.fillStyle = '#07060a';
        x.beginPath(); x.arc(cx, cy, 13 * s, 0, Math.PI * 2); x.fill();
        Kit.draw.roundRect(x, cx - 22 * s, cy + 10 * s, 44 * s, 80, 18 * s); x.fill();
        x.strokeStyle = 'rgba(255,214,170,.18)'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, 13 * s, Math.PI * 1.1, Math.PI * 1.7); x.stroke();
        x.fillStyle = '#1c1a22'; Kit.draw.roundRect(x, cx - 9 * s, cy - 6 * s, 18 * s, 12 * s, 3); x.fill();
      });
      vignette(x, 200, 0.7);
    });
  }

  let root = null, cv = null, scene = null;
  function ensure() {
    if (root) return;
    root = Kit.el(`<div class="c3-rv"><div class="rv-cvwrap"></div><div class="rv-char"><div></div></div><div class="rv-dm"></div><div class="rv-flash"></div>
      <div class="rv-cap c3-shadow"><span></span></div>
      <div class="rv-stars c3-glass"></div><button class="rv-skip"></button></div>`);
    Kit.ui().overlay.appendChild(root);
    cv = Kit.canvas(root.querySelector('.rv-cvwrap'));
    scene = carpet();
  }

  const VERDICT = [['Rough night on the carpet', '红毯翻车'], ['Mixed reviews', '褒贬不一'], ['The crowd loves it', '现场很买账'], ['Best dressed. No contest.', '全场最佳，毫无悬念']];

  /* o: {outfit (item ids), stars, score, comments:[{text, kind}]} */
  function play(o) {
    ensure();
    return new Promise((resolve) => {
      const timers = [], flashes = [];
      const at = (s, fn) => timers.push(setTimeout(fn, s * 1000));
      const charBox = root.querySelector('.rv-char'), inner = charBox.firstElementChild;
      const dm = root.querySelector('.rv-dm'), flashEl = root.querySelector('.rv-flash'), card = root.querySelector('.rv-stars');
      let t = 0, done = false;
      inner.innerHTML = window.Ch3Art.render(o.outfit, { mood: 'normal' });
      charBox.className = 'rv-char'; void charBox.offsetWidth; charBox.classList.add('walk');
      card.classList.remove('show'); dm.innerHTML = '';
      root.querySelector('.rv-cap span').textContent = tr('Flash Moment', '闪光灯时刻');
      root.querySelector('.rv-skip').textContent = tr('Skip ›', '跳过 ›');
      root.classList.add('show');
      Kit.sfx.play('whoosh');
      Kit.track('reveal_start', { stars: o.stars, comments: o.comments.length });

      const shoot = (big) => {
        const c = CROWD[Math.floor(Math.random() * CROWD.length)];
        flashes.push({ x: c[0], y: c[1] - 2, t0: t, s: 0.8 + c[2] * 0.3 });
        Kit.sfx.play('shutter');
        if (big) { flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on'); }
      };
      const n = 7 + o.stars * 4;
      for (let i = 0; i < n; i++) at(Kit.rand(0.4, 5.8), () => shoot(Math.random() < 0.18));
      at(2.5, () => {
        inner.innerHTML = window.Ch3Art.render(o.outfit, { mood: o.stars >= 2 ? 'wink' : 'smile' });
        charBox.classList.add('pose');
        [0, 0.08, 0.16, 0.3, 0.42].forEach((d, i) => at(2.5 + d, () => shoot(i === 0)));
        Kit.vibrate(20);
      });
      o.comments.forEach((c, i) => at(1.0 + i * 0.3, () => {
        const d = Kit.el(`<div class="dm ${c.kind || ''}" style="top:${112 + (i % 5) * 30}px">${Kit.esc(c.text)}</div>`);
        d.addEventListener('animationend', () => d.remove());
        dm.appendChild(d);
      }));
      at(4.8, () => {
        const [v, vz] = VERDICT[o.stars];
        card.innerHTML = `<div class="s">${[0, 1, 2].map((k) => (k < o.stars ? '<b>★</b>' : '★')).join('')}</div><div class="v">${Kit.esc(tr(v, vz))}<small>${Kit.esc(tr(`Style score ${o.score}`, `造型分 ${o.score}`))}</small></div>`;
        card.classList.add('show');
        Kit.sfx.play(o.stars >= 2 ? 'perfect' : 'blip');
      });
      const loop = Kit.loop((dt) => {
        t += dt;
        cv.clear();
        const x = cv.ctx;
        x.drawImage(scene, 0, 0, W, H);
        /* two sweeping spotlights */
        x.globalCompositeOperation = 'lighter';
        [-1, 1].forEach((s) => {
          const a = Math.sin(t * 0.9 + (s > 0 ? 1.4 : 0)) * 0.35;
          x.save(); x.translate(195 + s * 150, 70); x.rotate(a - s * 0.35);
          const g = x.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, 'rgba(255,230,200,.16)'); g.addColorStop(1, 'rgba(255,230,200,0)');
          x.fillStyle = g; x.beginPath(); x.moveTo(-8, 0); x.lineTo(8, 0); x.lineTo(90, 600); x.lineTo(-90, 600); x.fill(); x.restore();
        });
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i], k = (t - f.t0) / 0.32;
          if (k >= 1) { flashes.splice(i, 1); continue; }
          glowDot(x, f.x, f.y, (70 - 30 * k) * f.s, '255,255,255', 0.9 * (1 - k));
          x.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; x.lineWidth = 2;
          const L = 26 * f.s * (1 - k * 0.5);
          x.beginPath(); x.moveTo(f.x - L, f.y); x.lineTo(f.x + L, f.y); x.moveTo(f.x, f.y - L); x.lineTo(f.x, f.y + L); x.stroke();
        }
        x.globalCompositeOperation = 'source-over';
      });
      const end = (skipped) => {
        if (done) return; done = true;
        timers.forEach(clearTimeout); loop.stop();
        if (skipped) Kit.track('reveal_skip', { at: Math.round(t * 10) / 10 });
        root.classList.remove('show'); dm.innerHTML = ''; charBox.className = 'rv-char';
        resolve();
      };
      root.querySelector('.rv-skip').onclick = (e) => { e.stopPropagation(); Kit.sfx.play('tap'); end(true); };
      at(7.0, () => end(false));
    });
  }

  window.Ch3Reveal = { backstage, play };
})();
