/* Hub page: the cartridge shelf and the all-projects list.
   Every project and line below is copied from the direction pages it links to. */
(() => {
  const DIRS = [
    { no: '01', en: 'Game design', zh: '游戏设计', href: '../index.html', cover: '../assets/sandgarden-poster.jpg', c: '#7fa086', cd: '#3f5a44',
      lineEn: 'Game Designer · F2P systems, economy & monetisation.', lineZh: '游戏设计师 · F2P 系统、经济与商业化。' },
    { no: '02', en: 'Creative technology', zh: '创意技术', href: '../ai/', cover: '../ai/assets/table-for-two-cover.png', c: '#e07a5f', cd: '#c8553d',
      lineEn: 'AI systems, creative tools and things worth exploring.', lineZh: 'AI 系统、创意工具，和那些值得探索的想法。' },
    { no: '03', en: 'AI engineering', zh: 'AI 工程', href: '../ai-engineering.html', cover: '../ai/assets/second-pass-architecture.png', c: '#6f8fbf', cd: '#34507a',
      lineEn: 'From game systems to AI systems.', lineZh: '从游戏系统设计，到 AI 工程实践。' },
    { no: '04', en: 'Data analysis', zh: '数据分析', href: '../data.html', cover: '../assets/gameplay/olist-dashboard.jpg', pos: 'left top', c: '#c39a4f', cd: '#8a6a2f',
      lineEn: 'From product questions to decisions.', lineZh: '从产品问题出发，让分析支持决策。' },
    { no: '05', en: 'Tools & technology', zh: '工具与技术', href: '../tools.html', cover: '../assets/gameplay/gacha-result.png', c: '#9a86c0', cd: '#5b4b7a',
      lineEn: 'Tools for designers, systems for players.', lineZh: '我做策划每天要用的工具，也做游戏里的系统。',
      extraEn: 'Plus 4 tools built at work', extraZh: '另有 4 个工作中做的工具' }
  ];

  // d = direction indexes, in the order the projects appear on each direction page.
  const PROJECTS = [
    { name: 'Project: IDOL', en: 'Project lead · 6-person team', zh: '项目负责 · 六人团队', href: '../projects/idol.html', d: [0, 4] },
    { name: 'tarduck', en: 'Solo · Cursor Vibe Jam 2026', zh: '独立 · Cursor Vibe Jam 2026', href: '../projects/tarduck.html', d: [0, 4] },
    { name: 'Kitchen Bar', en: 'Tech art · Personal', zh: '技术美术 · 个人项目', href: '../projects/cocktail-rendering.html', d: [0, 4] },
    { name: 'Respond to Signal 404', en: 'Sole programmer · Ludum Dare 59', zh: '唯一程序 · Ludum Dare 59', href: '../projects/ld59.html', d: [0] },
    { name: 'Gacha Economy Sim', en: 'Solo · Numerical tool', zh: '独立 · 数值工具', href: '../projects/gacha.html', d: [0, 3, 4] },
    { name: 'Robot Karesansui', en: 'Solo · Simulation', zh: '独立 · 模拟', href: '../projects/sand-garden.html', d: [0] },
    { name: 'MetaGame', en: 'Solo · UAL MA Term 3', zh: '独立 · UAL 硕士第三学期', href: '../projects/metagame.html', d: [0] },
    { name: 'gridbot', en: 'Black-box test automation', zh: '黑盒自动化测试', href: '../projects/gridbot.html', d: [0, 2, 4] },
    { name: 'Hypha', en: 'Design + Unity · GGJ 2023', zh: '设计与开发 · GGJ 2023', href: '../projects/hypha.html', d: [0] },
    { name: 'MA Prototype Collection', en: 'Coursework · UAL 2022–2023', zh: '课程作品 · UAL 2022–2023', href: '../projects/ma.html', d: [0] },
    { name: 'Table for Two', en: 'Embodied AI · learned robot policy', zh: '具身智能 · 学习型机器人策略', href: '../ai/table-for-two.html', d: [1, 2] },
    { name: 'ArtDex', en: 'Vision product on AWS', zh: 'AWS 上的视觉识别应用', href: '../ai/artdex.html', d: [1, 2] },
    { name: 'Second Pass', en: 'A query-grounded analytics agent', zh: '基于真实查询的分析 agent', href: '../ai/second-pass.html', d: [1, 2, 3] },
    { name: 'StudioFlow AI', en: 'Agents · Creative AI', zh: '智能体 · 创意 AI', href: '../ai/studioflow.html', d: [1] },
    { name: 'Comfy Gateway', en: 'Private local tool', zh: '私有本地工具', href: 'https://github.com/suzyeth/studioflow-ai', d: [1] },
    { name: 'SILLAGE', en: 'Web & motion', zh: '网页与动效', href: 'https://sillage-fragrance-study.suzysu418.chatgpt.site', d: [1] },
    { name: 'Show Your Marks', en: 'Every mark has evidence', zh: '每一分都有依据', href: '../ai/show-your-marks.html', d: [2] },
    { name: 'evidence-first-job-search', en: 'Open source', zh: '开源', href: 'https://github.com/suzyeth/evidence-first-job-search', d: [2] },
    { name: 'Roll Call', en: 'Group-chat story game', zh: '群聊分支剧情游戏', href: '../ai/roll-call.html', d: [2] },
    { name: 'Olist', en: 'Late deliveries vs repeat customers', zh: '配送延迟与复购', href: '../data.html#p-olist', d: [3] },
    { name: 'jaffle_shop', en: 'Dashboard', zh: '分析看板', href: '../data.html#p-bi', d: [3] },
    { name: 'dbt', en: 'Starter on DuckDB', zh: '基于 DuckDB 的建模项目', href: '../data.html#p-dbt', d: [3] },
    { name: 'Grouped', en: 'Cross-validation', zh: '交叉验证', href: '../data.html#p-ml', d: [3] }
  ];

  // Order of projects on each direction page, used for the case label and the side panel.
  const ORDER = [
    ['Project: IDOL', 'tarduck', 'Kitchen Bar', 'Respond to Signal 404', 'Gacha Economy Sim', 'Robot Karesansui', 'MetaGame', 'gridbot', 'Hypha', 'MA Prototype Collection'],
    ['Table for Two', 'ArtDex', 'Second Pass', 'StudioFlow AI', 'Comfy Gateway', 'SILLAGE'],
    ['Second Pass', 'Show Your Marks', 'ArtDex', 'Table for Two', 'evidence-first-job-search', 'gridbot', 'Roll Call'],
    ['Olist', 'jaffle_shop', 'dbt', 'Grouped', 'Gacha Economy Sim', 'Second Pass'],
    ['gridbot', 'Gacha Economy Sim', 'Kitchen Bar', 'Project: IDOL', 'tarduck']
  ];
  const FEATURED = 4;
  const START = 1;

  const esc = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const both = (en, zh) => `<span lang="en">${esc(en)}</span><span lang="zh">${esc(zh)}</span>`;
  const byName = Object.fromEntries(PROJECTS.map(p => [p.name, p]));
  const isExternal = href => /^https?:/.test(href);
  const linkAttrs = href => isExternal(href) ? ' target="_blank" rel="noopener"' : '';

  const shelf = document.getElementById('shelf');
  const selected = document.getElementById('hubSelected');
  if (!shelf || !selected) return;
  const spines = Array.from(shelf.querySelectorAll('.spine'));

  // Each spine keeps its link; JS adds a pulled-out case next to it.
  spines.forEach((spine, i) => {
    const dir = DIRS[i];
    spine.style.setProperty('--c', dir.c);
    spine.style.setProperty('--cd', dir.cd);
    spine.setAttribute('role', 'tab');
    spine.setAttribute('aria-controls', 'hubSelected');
    const names = ORDER[i];
    const kase = document.createElement('a');
    kase.className = 'case';
    kase.href = dir.href;
    kase.style.setProperty('--c', dir.c);
    kase.style.setProperty('--cd', dir.cd);
    if (dir.pos) kase.style.setProperty('--pos', dir.pos);
    kase.innerHTML =
      `<span class="case-band"><span>${dir.no} / 05</span><span>SU</span></span>` +
      `<span class="case-cover"><img src="${dir.cover}" alt="" loading="${i === START ? 'eager' : 'lazy'}" decoding="async"></span>` +
      `<span class="case-label"><b>${both(dir.en, dir.zh)}</b><small>${names.length} ${both('projects', '个项目')} →</small></span>`;
    spine.after(kase);
    spine.addEventListener('click', event => {
      event.preventDefault();
      select(i, true);
    });
    spine.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      select((i + step + DIRS.length) % DIRS.length, true);
    });
  });

  function renderSelected(i) {
    const dir = DIRS[i];
    const names = ORDER[i];
    const items = names.slice(0, FEATURED).map(name => {
      const p = byName[name];
      return `<li><a href="${p.href}"${linkAttrs(p.href)}><b>${esc(p.name)}</b><span>${both(p.en, p.zh)}</span></a></li>`;
    }).join('');
    const more = names.length - FEATURED;
    const extra = dir.extraEn ? `<p class="hub-extra">${both(dir.extraEn, dir.extraZh)}</p>` : '';
    selected.style.setProperty('--c', dir.c);
    selected.style.setProperty('--cd', dir.cd);
    selected.innerHTML =
      `<p class="hub-selected-kicker"><span class="hub-no">${dir.no}</span> · ${both(dir.en, dir.zh)}</p>` +
      `<p class="hub-selected-line">${both(dir.lineEn, dir.lineZh)}</p>` +
      `<ul class="hub-feature">${items}</ul>` +
      (more > 0 ? `<p class="hub-more">${both(`+ ${more} more on the page`, `页面里还有 ${more} 个`)}</p>` : '') +
      extra +
      `<a class="hub-open" href="${dir.href}">${both('Open this direction', '进入这个方向')} →</a>`;
  }

  function select(i, focus) {
    shelf.dataset.current = String(i);
    spines.forEach((spine, j) => {
      const on = j === i;
      spine.classList.toggle('is-out', on);
      spine.setAttribute('aria-selected', String(on));
      spine.tabIndex = on ? 0 : -1;
    });
    renderSelected(i);
    if (focus) spines[i].focus({ preventScroll: true });
  }

  document.body.classList.add('hub-ready');
  select(START, false);

  // All-projects list with a direction filter.
  const rows = document.getElementById('hubRows');
  const filters = document.getElementById('hubFilters');
  const count = document.getElementById('hubCount');
  if (!rows || !filters || !count) return;

  rows.innerHTML = PROJECTS.map((p, n) =>
    `<li class="hub-row" data-dirs="${p.d.join(' ')}">` +
      `<span class="hub-row-no">${String(n + 1).padStart(2, '0')}</span>` +
      `<a class="hub-row-name" href="${p.href}"${linkAttrs(p.href)}>${esc(p.name)}${isExternal(p.href) ? ' ↗' : ''}</a>` +
      `<span class="hub-row-line">${both(p.en, p.zh)}</span>` +
      `<span class="hub-row-dirs">${p.d.map(d => `<span class="hub-tag" style="--c:${DIRS[d].c};--cd:${DIRS[d].cd}">${both(DIRS[d].en, DIRS[d].zh)}</span>`).join('')}</span>` +
    `</li>`).join('');

  const chips = [{ en: 'All', zh: '全部', d: -1 }].concat(DIRS.map((dir, d) => ({ en: dir.en, zh: dir.zh, d, c: dir.c, cd: dir.cd })));
  filters.innerHTML = chips.map(chip =>
    `<button type="button" class="hub-chip" data-d="${chip.d}" aria-pressed="${chip.d === -1}"${chip.c ? ` style="--c:${chip.c};--cd:${chip.cd}"` : ''}>${both(chip.en, chip.zh)}</button>`).join('');

  const rowEls = Array.from(rows.children);
  function filter(d) {
    let shown = 0;
    rowEls.forEach(row => {
      const on = d === -1 || row.dataset.dirs.split(' ').includes(String(d));
      row.hidden = !on;
      if (on) shown += 1;
    });
    count.textContent = String(shown);
    filters.querySelectorAll('.hub-chip').forEach(chip => chip.setAttribute('aria-pressed', String(Number(chip.dataset.d) === d)));
  }
  filters.addEventListener('click', event => {
    const chip = event.target.closest('.hub-chip');
    if (chip) filter(Number(chip.dataset.d));
  });
  filter(-1);
})();
