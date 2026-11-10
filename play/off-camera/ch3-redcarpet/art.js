/* ch3 Red Carpet Reveal — layered full-body SVG of Jace + item icons.
 * Body is drawn in a 240-wide space (centre x = 120). The head reuses the
 * portrait coordinate space (face centre 115,128) via HEAD_T.
 * Every swappable layer is wrapped in <g class="ly ly-SLOT"> so the game can
 * animate just the piece that changed. */
(function () {
  'use strict';
  let uid = 0;
  const SKIN = '#f0cdb3', SKIN2 = '#d3a389';
  const VB = { x: 10, y: 20, w: 220, h: 400 };
  const HEAD_T = 'translate(120 76) scale(.5) translate(-115 -128)';

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k));
    return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
  }
  /* mirror an absolute-coordinate path (M/L/Q/Z only) around x = 120 */
  const mir = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${240 - parseFloat(x)} ${y}`);
  const pair = (d, fill, extra) => `<path d="${d}" fill="${fill}" ${extra || ''}/><path d="${mir(d)}" fill="${fill}" ${extra || ''}/>`;

  const PAL = {
    p0: { top: '#f5f2ee', outer: '#2e2b3d', pants: '#2e2b3d', shoe: '#1a1824', accent: '#cfc8dc' },
    p1: { top: '#f4e3c8', outer: '#a86a3c', pants: '#5a3b2b', shoe: '#3a2418', accent: '#e8a85c' },
    p2: { top: '#e4edf6', outer: '#5d7594', pants: '#34445a', shoe: '#1f2836', accent: '#a9c8ec' },
    p3: { top: '#fff8ec', outer: '#eee0c8', pants: '#d8c9b0', shoe: '#8c7a62', accent: '#ffcfae' },
    p4: { top: '#2f2232', outer: '#7c2339', pants: '#2b1c26', shoe: '#170f15', accent: '#d9a54c' },
    p5: { top: '#1e1b2c', outer: '#c9a24c', pants: '#1e1b2c', shoe: '#14121e', accent: '#ffe08a', shimmer: true },
  };

  /* ---------- body ---------- */
  const TORSO = 'M86 140 Q120 131 154 140 L165 153 L158 266 L82 266 L75 153 Z';
  const TORSO_CREW = 'M86 140 L104 136 Q120 150 136 136 L154 140 L165 153 L158 266 L82 266 L75 153 Z';
  const TORSO_V = 'M86 140 L106 135 L120 162 L134 135 L154 140 L165 153 L158 266 L82 266 L75 153 Z';
  const SLV_LONG = 'M82 142 Q63 150 61 190 L57 252 L72 254 L80 198 Z';
  const SLV_SHORT = 'M82 142 Q63 150 61 186 L77 191 L83 162 Z';
  const ARM = 'M80 150 Q67 156 65 190 L61 252 L71 253 L78 198 Z';
  const SIDE_SHADE = 'M158 150 L165 153 L158 266 L146 266 Z';

  const arms = () => pair(ARM, SKIN) +
    `<ellipse cx="66" cy="259" rx="7" ry="9" fill="${SKIN}"/><ellipse cx="174" cy="259" rx="7" ry="9" fill="${SKIN}"/>`;
  const neck = () => `<path d="M102 132 L138 132 L120 184 Z" fill="${SKIN}"/>
    <rect x="110" y="100" width="20" height="44" rx="8" fill="${SKIN}"/>
    <path d="M110 112 Q120 122 130 112 L130 118 Q120 126 110 118 Z" fill="${SKIN2}" opacity=".7"/>`;
  const legs = (p) => `<path d="M84 258 L156 258 L154 404 L127 404 L120 296 L113 404 L86 404 Z" fill="${p.pants}"/>
    <path d="M120 296 L120 262" stroke="${shade(p.pants, -0.25)}" stroke-width="1.5"/>
    <path d="M146 262 L154 404 L141 404 Z" fill="#000" opacity=".1"/>
    <path d="M86 364 L114 364 L115 402 Q119 403 119 410 L77 410 Q77 402 86 400 Z" fill="${p.shoe}"/>
    <path d="M154 364 L126 364 L125 402 Q121 403 121 410 L163 410 Q163 402 154 400 Z" fill="${p.shoe}"/>
    <path d="M86 364 h28 M126 364 h28" stroke="${shade(p.shoe, 0.25)}" stroke-width="2"/>
    <path d="M90 372 v26 M150 372 v26" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".25"/>`;

  /* ---------- tops ---------- */
  const collar = (c) => pair('M107 133 L120 159 L102 152 L99 139 Z', shade(c, 0.08), `stroke="${shade(c, -0.18)}" stroke-width="1.2"`);
  const TOPS = {
    t0: (p) => pair(SLV_SHORT, p.top) + `<path d="${TORSO_CREW}" fill="${p.top}"/>
      <path d="M104 136 Q120 150 136 136" stroke="${shade(p.top, -0.15)}" stroke-width="3" fill="none"/>
      <path d="${SIDE_SHADE}" fill="#000" opacity=".07"/>`,
    t1: (p) => pair(SLV_LONG, p.top) + `<path d="${TORSO_V}" fill="${p.top}"/>
      <path d="M120 162 L120 266" stroke="${shade(p.top, -0.14)}" stroke-width="1.4"/>
      ${[182, 204, 228, 252].map((y) => `<circle cx="120" cy="${y}" r="2" fill="${shade(p.top, -0.25)}"/>`).join('')}
      <path d="M95 152 Q104 205 97 262" stroke="#fff" stroke-width="7" fill="none" opacity=".28" stroke-linecap="round"/>
      <path d="${SIDE_SHADE}" fill="#000" opacity=".07"/>` + collar(p.top),
    t2: (p) => {
      const d = shade(p.top, -0.12);
      return pair(SLV_LONG, p.top) + pair('M57 240 L72 242 L72 254 L57 252 Z', d) + `<path d="${TORSO_CREW}" fill="${p.top}"/>
      <path d="M104 137 Q120 151 136 137" stroke="${d}" stroke-width="7" fill="none"/>
      <path d="M82 252 L158 252 L158 266 L82 266 Z" fill="${d}"/>
      ${[88, 96, 104, 112, 120, 128, 136, 144, 152].map((x) => `<path d="M${x} 254 v10" stroke="${shade(p.top, -0.22)}" stroke-width="1.2"/>`).join('')}
      ${[104, 136].map((x) => `<path d="M${x} 152 q5 8 0 16 q-5 8 0 16 q5 8 0 16 q-5 8 0 16 q5 8 0 16 q-5 8 0 16" stroke="${d}" stroke-width="3" fill="none"/>`).join('')}
      <path d="${SIDE_SHADE}" fill="#000" opacity=".07"/>`;
    },
    t3: (p) => pair(SLV_LONG, p.top) + `<path d="${TORSO}" fill="${p.top}"/>
      <path d="M108 108 L132 108 Q136 108 136 114 L136 144 L104 144 L104 114 Q104 108 108 108 Z" fill="${p.top}"/>
      <path d="M105 118 h30 M105 127 h30 M105 136 h30" stroke="${shade(p.top, -0.16)}" stroke-width="1.5"/>
      <path d="M96 150 Q102 205 96 262" stroke="#fff" stroke-width="5" fill="none" opacity=".12" stroke-linecap="round"/>
      <path d="${SIDE_SHADE}" fill="#000" opacity=".08"/>`,
    t4: (p, id) => {
      const dots = [];
      for (let y = 146; y < 268; y += 16) for (let x = 78 + ((y / 16) % 2) * 8; x < 166; x += 16) dots.push(`<g transform="translate(${x} ${y})"><circle r="3.4" fill="${p.accent}"/><path d="M3 2 q6 1 7 7 q-6 -1 -7 -7z" fill="${shade(p.accent, -0.3)}"/></g>`);
      return pair(SLV_SHORT, p.top) + `<clipPath id="${id}tp"><path d="${TORSO_V}"/>${pair(SLV_SHORT, '#000')}</clipPath>
      <path d="${TORSO_V}" fill="${p.top}"/><g clip-path="url(#${id}tp)">${dots.join('')}</g>
      <path d="M120 162 L120 266" stroke="${shade(p.top, -0.18)}" stroke-width="1.4"/>
      <path d="${SIDE_SHADE}" fill="#000" opacity=".07"/>` + collar(p.top);
    },
    t5: (p, id) => {
      const VEST = 'M90 141 L108 137 L120 174 L132 137 L150 141 L157 156 L154 266 L86 266 L83 156 Z';
      const sq = [];
      for (let y = 144; y < 268; y += 7) for (let x = 82 + ((y / 7) % 2) * 3.5; x < 160; x += 7) {
        const k = (x * 7 + y * 13) % 5;
        sq.push(`<circle cx="${x}" cy="${y}" r="2.6" fill="${k < 2 ? p.accent : k < 4 ? shade(p.accent, -0.25) : '#fff'}" opacity="${k === 4 ? 0.9 : 0.75}"/>`);
      }
      return `<clipPath id="${id}vs"><path d="${VEST}"/></clipPath><path d="${VEST}" fill="${p.top}"/>
      <g clip-path="url(#${id}vs)">${sq.join('')}</g>
      <path d="M108 137 L120 174 L132 137" stroke="${p.accent}" stroke-width="2" fill="none"/>`;
    },
  };

  /* ---------- outerwear ---------- */
  const PANEL = 'M86 138 L74 154 L80 272 L117 272 L114 206 L101 146 Z';
  const COAT = 'M86 138 L72 154 L69 342 L116 342 L114 206 L101 146 Z';
  const LAPEL = 'M100 144 L116 206 L100 178 L90 156 Z';
  const OSLV = 'M84 140 Q60 150 57 190 L53 252 L73 255 L82 198 Z';
  const suitBase = (c, panel, id, hex) => `<clipPath id="${id}oc">${pair(panel, '#000')}${pair(OSLV, '#000')}</clipPath>` +
    pair(OSLV, c) + pair(panel, c) +
    pair('M57 244 L73 247', 'none', `stroke="${shade(hex || c, -0.25)}" stroke-width="2"`) +
    `<path d="M150 154 L160 272 L136 272 Z" fill="#000" opacity=".1"/>`;
  const lapels = (c) => pair(LAPEL, shade(c, -0.18));
  const OUTERS = {
    o0: () => '',
    o1: (p, id) => suitBase(p.outer, COAT, id) + pair('M100 144 L117 212 L95 186 L83 158 Z', shade(p.outer, -0.16)) +
      `<circle cx="110" cy="232" r="3" fill="${shade(p.outer, -0.35)}"/><circle cx="110" cy="264" r="3" fill="${shade(p.outer, -0.35)}"/>
      <path d="M72 300 L114 300" stroke="${shade(p.outer, -0.12)}" stroke-width="2"/>`,
    o2: (p, id) => suitBase(p.outer, PANEL, id) + lapels(p.outer) +
      `<circle cx="113" cy="240" r="2.6" fill="${shade(p.outer, -0.4)}"/><path d="M84 236 L100 236" stroke="${shade(p.outer, -0.3)}" stroke-width="2"/>
      <path d="M140 170 l10 -3 l2 6 z" fill="#fff" opacity=".8"/>`,
    o3: (p) => {
      const c = shade(p.outer, -0.35), d = shade(p.outer, -0.5);
      return pair(OSLV, c) + `<path d="M86 138 Q120 128 154 138 L166 154 L162 256 L78 256 L74 154 Z" fill="${c}"/>
        <path d="M110 138 L130 138 L124 160 Z" fill="${p.top}"/>
        ${pair('M98 135 L116 152 L100 172 L84 146 Z', d)}
        <path d="M128 152 L122 256" stroke="${p.accent}" stroke-width="1.8"/>
        <path d="M78 248 L162 248" stroke="${d}" stroke-width="8"/>
        <path d="M86 162 Q91 200 86 238" stroke="#fff" stroke-width="4" fill="none" opacity=".22" stroke-linecap="round"/>
        <path d="M62 170 Q60 200 58 236" stroke="#fff" stroke-width="3" fill="none" opacity=".18" stroke-linecap="round"/>
        <circle cx="96" cy="210" r="2" fill="${p.accent}"/><circle cx="144" cy="210" r="2" fill="${p.accent}"/>`;
    },
    o4: (p, id) => {
      const lines = [];
      for (let y = 140; y < 280; y += 12) lines.push(`<path d="M50 ${y} H190" stroke="${p.accent}" stroke-width="${y % 24 ? 1 : 2}" opacity=".5"/>`);
      for (let x = 50; x < 190; x += 12) lines.push(`<path d="M${x} 136 V280" stroke="${p.accent}" stroke-width="${x % 24 ? 1 : 2}" opacity=".45"/>`);
      return suitBase(p.outer, PANEL, id) + `<g clip-path="url(#${id}oc)">${lines.join('')}</g>` + lapels(p.outer) +
        `<circle cx="113" cy="232" r="2.6" fill="${shade(p.outer, -0.4)}"/><circle cx="113" cy="252" r="2.6" fill="${shade(p.outer, -0.4)}"/>`;
    },
    o5: (p, id) => {
      const flower = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#ffd27a">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="2.4" ry="5" cy="-5" transform="rotate(${a})"/>`).join('')}<circle r="2.4" fill="#fff4c2"/></g>`;
      return `<linearGradient id="${id}vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(p.outer, 0.12)}"/><stop offset=".55" stop-color="${p.outer}"/><stop offset="1" stop-color="${shade(p.outer, -0.4)}"/></linearGradient>` +
        suitBase(`url(#${id}vg)`, PANEL, id, p.outer) + lapels(shade(p.outer, -0.1)) +
        pair('M100 144 L116 206', 'none', 'stroke="#ffd27a" stroke-width="1.6"') +
        flower(90, 196, 1) + flower(150, 196, 1) + flower(86, 252, 0.8) + flower(154, 252, 0.8) + flower(66, 238, 0.7) + flower(174, 238, 0.7) +
        `<path d="M146 168 Q150 160 156 168" stroke="#ffd27a" stroke-width="1.4" fill="none"/>`;
    },
  };

  /* ---------- accessories: body part and head part ---------- */
  const curve = (dip, n, f) => { let s = ''; for (let i = 0; i <= n; i++) { const t = i / n; s += f(104 + 32 * t, 137 + dip * Math.sin(Math.PI * t), i); } return s; };
  const ACC_BODY = {
    a0: () => '',
    a1: () => `<path d="M104 137 Q120 165 136 137" stroke="#cfd4e0" stroke-width="1.3" fill="none"/>
      <path d="M113 156 Q120 152 127 156 Q126 166 120 172 Q114 166 113 156 Z" fill="#e8899f" stroke="#a84a66" stroke-width="1"/>
      <path d="M116 158 Q119 157 121 158" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>`,
    a2: () => '',
    a3: () => curve(18, 12, (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.7" fill="#fbf6ee" stroke="#d6cbbb" stroke-width=".7"/>`),
    a4: () => curve(26, 9, (x, y, i) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.6" ry="2.2" transform="rotate(${i % 2 ? 60 : -20} ${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="#e8c470" stroke-width="1.8"/>`) +
      curve(14, 7, (x, y) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#f4dd9a"/>`),
    a5: () => `<g transform="translate(100 184)"><path d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="#ffd27a" stroke="#c48a2a" stroke-width=".8"/>
      <circle r="3" fill="#9fd8ff" stroke="#fff" stroke-width="1"/><path d="M4 6 Q8 14 12 16" stroke="#ffd27a" stroke-width="1.2" fill="none"/><circle cx="12" cy="16" r="1.8" fill="#ffd27a"/></g>`,
  };
  const ACC_HEAD = {
    a2: `<path d="M172 124 q12 2 12 12" stroke="#e6ecf8" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M174 142 q9 -1 10 -9" stroke="#c4cde0" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M182 146 v10" stroke="#c4cde0" stroke-width="2"/><circle cx="182" cy="160" r="4" fill="#e6ecf8"/>`,
  };

  /* ---------- hair (portrait space) ---------- */
  const H = (c, c2) => ({ c, c2 });
  const HAIR = {
    h0: Object.assign(H('#6b4a2e', '#b08a5a'), {
      back: (c) => `<ellipse cx="115" cy="116" rx="70" ry="76" fill="${c.c}"/><path d="M52 140 Q40 200 60 236 L74 214 L82 232 Q72 190 76 150 Z" fill="${c.c}"/><path d="M178 140 Q190 200 170 236 L156 214 L148 232 Q158 190 154 150 Z" fill="${c.c}"/>`,
      front: (c) => `<path d="M48 140 q-8 -96 67 -100 q75 4 67 100 l-6 -30 l-8 22 l-6 -40 l-14 26 l-6 -34 l-12 22 l-10 -30 l-10 26 l-12 -28 l-8 30 l-10 -24 l-6 40 l-8 -22 z" fill="${c.c}"/>
        <path d="M54 110 q-10 40 2 74 q6 -20 12 -30 q-6 -20 -2 -44z M176 110 q10 40 -2 74 q-6 -20 -12 -30 q6 -20 2 -44z" fill="${c.c}"/>
        <path d="M80 54 q26 -16 62 -4 M70 76 q10 -14 24 -22" stroke="${c.c2}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`,
    }),
    h1: Object.assign(H('#6b4a2e', '#b08a5a'), {
      back: (c) => `<ellipse cx="115" cy="118" rx="70" ry="76" fill="${c.c}"/><path d="M52 140 Q40 200 60 236 L74 214 L82 232 Q72 190 76 150 Z" fill="${c.c}"/><path d="M178 140 Q190 200 170 236 L156 214 L148 232 Q158 190 154 150 Z" fill="${c.c}"/>`,
      front: (c) => `<path d="M50 124 q-6 -86 65 -88 q71 2 65 88 q-10 -34 -30 -50 q-18 -12 -35 -14 q-17 2 -35 14 q-20 16 -30 50z" fill="${c.c}"/>
        <path d="M113 58 q-34 4 -48 44 q-6 20 -4 40 q8 -30 22 -48 q14 -18 30 -36z" fill="${c.c}"/>
        <path d="M117 58 q34 4 48 44 q6 20 4 40 q-8 -30 -22 -48 q-14 -18 -30 -36z" fill="${c.c}"/>
        <path d="M78 60 q18 -14 34 -14 M124 48 q22 2 36 16" stroke="${c.c2}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>`,
    }),
    h2: Object.assign(H('#6b4a2e', '#b08a5a'), {
      back: (c) => `<ellipse cx="115" cy="114" rx="67" ry="72" fill="${c.c}"/>`,
      front: (c) => `<path d="M52 112 q-4 -80 63 -82 q67 2 63 82 q-4 -22 -12 -36 q-24 -18 -51 -18 q-27 0 -51 18 q-8 14 -12 36z" fill="${c.c}"/>
        <path d="M74 66 q36 -34 84 -8 M82 54 q32 -24 70 -6 M66 82 q10 -14 22 -20" stroke="${c.c2}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
        <path d="M122 60 q16 12 8 32" stroke="${c.c}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    }),
    h3: Object.assign(H('#d4daee', '#ffffff'), {
      back: (c) => `<ellipse cx="115" cy="116" rx="69" ry="75" fill="${c.c}"/>`,
      front: (c) => `<path d="M52 118 q-4 -76 66 -78 q66 2 62 76 q-8 -28 -28 -36 q-6 18 -30 22 q8 -12 4 -22 q-14 22 -48 26 q8 -10 6 -20 q-20 14 -32 32z" fill="${c.c}"/>
        <path d="M70 76 q18 -22 44 -26 M120 48 q26 2 42 22" stroke="#b6a6ec" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
        <path d="M86 52 q30 -14 60 4" stroke="${c.c2}" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${[[70, 46, 1], [168, 60, 0.8], [150, 34, 0.6]].map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" fill="#fff"><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite"/></path>`).join('')}`,
    }),
    h4: Object.assign(H('#6b4a2e', '#b08a5a'), {
      back: (c) => `<ellipse cx="115" cy="118" rx="72" ry="76" fill="${c.c}"/>`,
      front: (c) => {
        const curls = [[56, 112, 14], [64, 90, 16], [82, 72, 17], [104, 62, 17], [127, 62, 17], [149, 71, 16], [166, 89, 15], [174, 111, 13], [96, 86, 11], [120, 82, 10]];
        return `<path d="M54 112 q-6 -76 61 -78 q67 2 61 78 q-20 -26 -61 -28 q-41 2 -61 28z" fill="${c.c}"/>` +
          curls.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.c}"/><path d="M${x - r * 0.5} ${y - r * 0.1} q${r * 0.5} ${-r * 0.6} ${r * 0.8} 0" stroke="${c.c2}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('');
      },
    }),
    h5: Object.assign(H('#6b4a2e', '#b08a5a'), {
      back: (c) => `<ellipse cx="115" cy="116" rx="68" ry="74" fill="${c.c}"/>
        <path d="M58 150 Q46 184 56 206 L66 190 L72 204 Q66 176 72 152 Z" fill="${c.c}"/>
        <path d="M172 150 Q184 184 174 206 L164 190 L158 204 Q164 176 158 152 Z" fill="${c.c}"/>`,
      front: (c) => `<path d="M50 124 q-2 -86 65 -88 q67 2 65 88 l-10 -26 l-4 16 l-12 -30 l-6 18 l-12 -26 l-6 22 l-14 -28 l-8 24 l-12 -26 l-4 20 l-12 -20 l-6 26 l-10 -10 l-14 40 z" fill="${c.c}"/>
        <path d="M80 52 q26 -16 64 -2" stroke="${c.c2}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>`,
    }),
  };

  /* ---------- face: Western rock-star features ----------
   * longer face, squarer jaw, deep-set blue-grey eyes with a lid crease,
   * defined nose bridge, fuller lower lip, light stubble */
  const JAW = 'M56 112 Q56 52 115 50 Q174 52 174 112 Q174 152 165 176 Q153 199 128 207 Q115 210 102 207 Q77 199 65 176 Q56 152 56 112 Z';
  const BROW = '#5a3d26', LID = '#3a2a26', IRIS = '#7d97ad', IRIS_RIM = '#3f5568';
  const STUBBLE = (() => {
    let seed = 11, out = '';
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 170; i++) {
      const t = rnd(), lip = i < 34;
      /* upper-lip band, then the lower jaw from ear to ear */
      const x = lip ? 101 + 28 * t : 68 + 94 * t;
      const bottom = 204 - 32 * Math.pow((t - 0.5) * 2, 2);   // follows the jawline
      const y = lip ? 160 + rnd() * 5 : Math.max(168, bottom - 24) + rnd() * (bottom - Math.max(168, bottom - 24));
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.45 + rnd() * 0.4).toFixed(2)}"/>`;
    }
    return `<path d="M66 172 Q78 198 102 205 Q115 208 128 205 Q152 198 164 172 Q150 190 128 194 Q115 196 102 194 Q80 190 66 172 Z" fill="#6b4a2e" opacity=".13"/>
      <g fill="#5a3d26" opacity=".13">${out}</g>`;
  })();
  function face(mood) {
    const eye = (cx, dir) => `<ellipse cx="${cx}" cy="121" rx="17" ry="8" fill="${SKIN2}" opacity=".45"/>
      <path d="M${cx - 12} 128 Q${cx} 120 ${cx + 12} 127 Q${cx} 133 ${cx - 12} 128 Z" fill="#f7f3f0"/>
      <circle cx="${cx + dir}" cy="127.2" r="4.7" fill="${IRIS}" stroke="${IRIS_RIM}" stroke-width="1"/>
      <circle cx="${cx + dir}" cy="127.2" r="2" fill="#1a1418"/><circle cx="${cx + dir + 1.7}" cy="125.8" r="1.2" fill="#fff"/>
      <path d="M${cx - 13} 128 Q${cx} 118 ${cx + 13} 126" stroke="${LID}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M${cx - 11} 121 Q${cx} 114 ${cx + 12} 120" stroke="${SKIN2}" stroke-width="1.5" fill="none"/>
      <path d="M${cx - 9} 132 Q${cx} 135 ${cx + 9} 131" stroke="${SKIN2}" stroke-width="1" fill="none" opacity=".8"/>`;
    const closed = (cx) => `<ellipse cx="${cx}" cy="121" rx="17" ry="8" fill="${SKIN2}" opacity=".45"/>
      <path d="M${cx - 12} 127 Q${cx} 133 ${cx + 12} 127" stroke="${LID}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M${cx - 11} 121 Q${cx} 116 ${cx + 12} 120" stroke="${SKIN2}" stroke-width="1.5" fill="none"/>`;
    const brows = `<path d="M77 108 Q91 99 107 103 M153 108 Q139 99 123 103" stroke="${BROW}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    const eyes = mood === 'smile' ? closed(93) + closed(137) : mood === 'wink' ? eye(93, 1) + closed(137) : eye(93, 1) + eye(137, -1);
    const nose = `<path d="M110 118 Q108 138 106 150 M120 118 Q122 138 124 150" stroke="${SKIN2}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
      <path d="M105 152 Q109 158 115 157 Q121 158 125 152" stroke="${SKIN2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M112 146 Q115 150 118 146" stroke="#fff" stroke-width="1.6" fill="none" opacity=".35"/>`;
    const lower = (y) => `<path d="M106 ${y} Q115 ${y + 9} 124 ${y} Q115 ${y + 4} 106 ${y} Z" fill="#c27a72" opacity=".9"/>`;
    const mouth = mood === 'smile' || mood === 'wink'
      ? `<path d="M102 167 Q115 178 128 167" stroke="#8e4447" stroke-width="2.6" fill="none" stroke-linecap="round"/>${lower(172)}`
      : mood === 'worried' ? '<path d="M104 173 Q115 168 126 173" stroke="#8e4447" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
        : `<path d="M104 170 Q110 168 115 170 Q120 168 126 170" stroke="#8e4447" stroke-width="2.4" fill="none" stroke-linecap="round"/>${lower(171)}`;
    const blush = mood !== 'normal' && mood !== 'worried' ? 0.2 : 0.06;
    return `<ellipse cx="56" cy="128" rx="8" ry="13" fill="${SKIN}"/><ellipse cx="174" cy="128" rx="8" ry="13" fill="${SKIN}"/>
      <path d="${JAW}" fill="${SKIN}"/>
      <path d="M152 66 Q176 90 174 124 Q172 166 150 194 Q162 156 160 114 Q158 88 152 66 Z" fill="${SKIN2}" opacity=".4"/>
      <ellipse cx="80" cy="150" rx="12" ry="6" fill="#e0828d" opacity="${blush}"/><ellipse cx="150" cy="150" rx="12" ry="6" fill="#e0828d" opacity="${blush}"/>
      ${STUBBLE}${brows}${eyes}${nose}${mouth}`;
  }

  const shimmer = () => [[70, 180, 0], [168, 214, 0.5], [92, 300, 1], [150, 330, 0.3], [112, 236, 0.8], [176, 150, 1.2]].map(([x, y, b]) =>
    `<path transform="translate(${x} ${y})" d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z" fill="#fff6c8" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}s" repeatCount="indefinite"/></path>`).join('');

  /* o: {hair, top, outer, acc, pal} item ids; opt: {mood, fresh:[slot keys]} */
  function render(o, opt) {
    opt = opt || {};
    const id = 'c3u' + (++uid) + '_';
    const p = PAL[o.pal] || PAL.p0, hr = HAIR[o.hair] || HAIR.h0, fresh = opt.fresh || [];
    const g = (slot, body) => `<g class="ly ly-${slot}${fresh.includes(slot) ? ' fresh' : ''}">${body}</g>`;
    return `<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="120" cy="411" rx="64" ry="8" fill="#000" opacity=".28"/>
      ${g('hair', `<g transform="${HEAD_T}">${hr.back(hr)}</g>`)}
      ${arms()}
      ${g('pal', legs(p))}
      ${neck()}
      ${g('top', (TOPS[o.top] || TOPS.t0)(p, id))}
      ${g('outer', (OUTERS[o.outer] || OUTERS.o0)(p, id))}
      ${g('acc', (ACC_BODY[o.acc] || ACC_BODY.a0)())}
      <g transform="${HEAD_T}">${face(opt.mood || 'normal')}</g>
      ${g('hair', `<g transform="${HEAD_T}">${hr.front(hr)}</g>`)}
      ${ACC_HEAD[o.acc] ? g('acc', `<g transform="${HEAD_T}">${ACC_HEAD[o.acc]}</g>`) : ''}
      ${p.shimmer ? g('pal', shimmer()) : ''}
    </svg>`;
  }

  /* where each layer sits (body coords) — used to aim the sparkle burst */
  const ANCHOR = { hair: [120, 46], top: [120, 196], outer: [120, 214], pal: [120, 250], a1: [120, 162], a2: [151, 77], a3: [120, 150], a4: [120, 156], a5: [100, 184], a0: [120, 160] };
  function anchor(slot, itemId) { return slot === 'acc' ? ANCHOR[itemId] || ANCHOR.a0 : ANCHOR[slot]; }

  /* ---------- card icons ---------- */
  const DEFAULT = { hair: 'h0', top: 't0', outer: 'o0', acc: 'a0', pal: 'p0' };
  const svg = (vb, body) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  function icon(slot, itemId, palId) {
    const id = 'c3i' + (++uid) + '_';
    const p = PAL[palId] || PAL.p0;
    if (slot === 'hair') {
      const hr = HAIR[itemId];
      return svg('68 24 104 100', `<g transform="${HEAD_T}">${hr.back(hr)}${face('normal')}${hr.front(hr)}</g>`);
    }
    if (slot === 'top') return svg('50 100 140 172', arms() + neck() + TOPS[itemId](p, id));
    if (slot === 'outer') {
      if (itemId === 'o0') return svg('50 120 140 180', `<path d="${PANEL}" fill="none" stroke="#c9bfdc" stroke-width="3" stroke-dasharray="6 5"/><path d="${mir(PANEL)}" fill="none" stroke="#c9bfdc" stroke-width="3" stroke-dasharray="6 5"/><path d="M96 170 L144 240 M144 170 L96 240" stroke="#c9bfdc" stroke-width="4" stroke-linecap="round"/>`);
      return svg('46 126 148 220', OUTERS[itemId](p, id));
    }
    if (slot === 'acc') {
      const disc = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f4effa"/>`;
      if (itemId === 'a0') return svg('0 0 44 44', `<circle cx="22" cy="22" r="14" fill="none" stroke="#c9bfdc" stroke-width="3" stroke-dasharray="5 4"/><path d="M13 31 L31 13" stroke="#c9bfdc" stroke-width="3" stroke-linecap="round"/>`);
      if (itemId === 'a2') return svg('137 63 28 28', disc(151, 77, 13) + `<g transform="${HEAD_T}"><ellipse cx="176" cy="130" rx="8" ry="12" fill="${SKIN}"/>${ACC_HEAD.a2}</g>`);
      if (itemId === 'a5') return svg('84 168 32 32', disc(100, 184, 15) + ACC_BODY.a5());
      return svg('92 120 56 56', disc(120, 148, 26) + neck() + ACC_BODY[itemId]());
    }
    /* palette swatches */
    const pp = PAL[itemId];
    return svg('0 0 44 44', `<circle cx="16" cy="18" r="11" fill="${pp.outer}" stroke="#fff" stroke-width="2"/><circle cx="28" cy="18" r="11" fill="${pp.top}" stroke="#fff" stroke-width="2"/>
      <circle cx="22" cy="29" r="11" fill="${pp.pants}" stroke="#fff" stroke-width="2"/><circle cx="22" cy="22" r="3.5" fill="${pp.accent}"/>`);
  }

  window.Ch3Art = { render, icon, anchor, VB, PAL, DEFAULT, shade };
})();
