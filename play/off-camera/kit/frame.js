/* Desktop surround for the episode player.
 * On wide screens the 390×780 phone stage gets an ambient backdrop, an episode
 * panel on the left (story, controls, episode switcher) and a designer panel on
 * the right (loop, story hook, monetisation, quick links to tuning / event log).
 * Phones are untouched. Load after kit.js and before the episode's game.js. */
(function () {
  'use strict';
  if (!window.Kit) return;
  const K = window.Kit;

  const EPISODES = [
    {
      id: 'ch1-dodge', key: 'ch1', n: 1, href: '../ch1-dodge/index.html', title: 'Sneak Out',
      tag: "He can't be seen tonight.",
      story: 'Jace Monroe ditches his own album-launch party to meet you on the hotel rooftop. Fans and paparazzi are everywhere. Get him upstairs before anyone gets a photo.',
      controls: [['⇆', 'Swipe, tap a side, or ← → / A D to change lane'], ['◎', 'Grab a cap, shades and a hoodie for a perfect disguise'], ['▣', 'A glowing lane means a camera is about to flash']],
      loop: 'Dodge → collect → beat the target score in 60 seconds. Hits cost points, never end the run.',
      hook: 'The opening choice picks the route out. Lose and a blurry photo goes viral: in Episode 2 his phone will not stop buzzing.',
      money: 'One free retry, then 1 energy per retry (an ad refills energy). Two 30-gem boosters: Viv clears the way / full disguise.',
      win: 'Made it', lose: '#WhoIsJacesGirl',
      glow: ['rgba(255,120,170,.28)', 'rgba(120,180,255,.22)', 'rgba(255,210,150,.16)'],
      zh: { title: '溜出去', tag: '今晚，他不能被认出来。', story: '杰斯·门罗从自己的专辑发布派对溜出来，去酒店天台见你。到处都是粉丝和狗仔，赶在有人拍到之前把他送上楼。',
        controls: ['左右滑动、点屏幕一侧，或按 ← → / A D 换道', '凑齐帽子、墨镜和连帽衫，触发完美伪装', '车道发光，说明有相机要闪了'],
        loop: '躲避 → 收集 → 60 秒内达到目标分。撞到人会扣分，但不会直接结束。', hook: '开场选择决定从哪条路溜出去。失败的话，一张模糊照片会在网上疯传：第二集里他的手机会响个不停。',
        money: '免费重试一次，之后每次消耗 1 体力（看广告可补体力）。两个道具各 30 钻石：薇薇安清场 / 全套伪装。', win: '准时赴约', lose: '#杰斯的神秘女孩#' },
    },
    {
      id: 'ch2-heartbeat', key: 'ch2', n: 2, href: '../ch2-heartbeat/index.html', title: "Don't Let It Show",
      tag: "Keep your cool. He won't.",
      story: 'Alone with him on the rooftop, LA at your feet. Every line he says moves your heartbeat.',
      controls: [['●', 'Hold (or Space) to breathe and calm down; let go and it rises'], ['♡', 'Stay in the sweet spot to build Heart'], ['◌', 'When he leans in, tap as the ring lands']],
      loop: 'Keep the heart in the sweet spot while his lines push it around. Each line is shown before it lands.',
      hook: 'Your Episode 1 result changes the start. Win and he admits the Sienna thing is a PR contract; lose and his publicist calls him away mid-sentence.',
      money: 'One free retry, then 1 energy per retry (an ad refills energy). Two 30-gem boosters: wider sweet spot / his leather jacket (a calmer heart).',
      win: 'It was always you', lose: 'Saved by the publicist',
      glow: ['rgba(255,200,140,.22)', 'rgba(244,166,198,.26)', 'rgba(110,130,255,.2)'],
      zh: { title: '别让他看出来', tag: '你要稳住，他可不会。', story: '天台上只有你们俩，脚下是洛杉矶的灯海。他说的每句话都会让你心跳变化。',
        controls: ['按住屏幕（或空格）深呼吸让心跳下降，松开它会上升', '把心跳稳在心动区，积累心动值', '他靠近时，在圆环收拢的瞬间点击'],
        loop: '他的台词会推着心跳上下波动，你要把它稳在心动区。每句台词生效前都会提前提示。', hook: '第一集的结果会改变开局。成功的话他会承认和西耶娜只是公关合约；失败的话公关会在他说到一半时把他叫走。',
        money: '免费重试一次，之后每次消耗 1 体力（看广告可补体力）。两个道具各 30 钻石：心动区变宽 / 他的皮夹克（心跳更平稳）。', win: '一直都是你', lose: '被公关打断' },
    },
    {
      id: 'ch3-redcarpet', key: 'ch3', n: 3, href: '../ch3-redcarpet/index.html', title: 'Red Carpet Reveal',
      tag: 'All eyes on him. His eyes on you.',
      story: 'The Crown Music Awards. Your first red carpet as his stylist. The organisers sent a three-word brief. You have 45 seconds.',
      controls: [['▤', 'Pick a tab, then a card to dress him'], ['#', 'Matching tags score; opposite tags cost points'], ['◆', 'Premium pieces are free to try on']],
      loop: 'Read the brief → match tags → finish the look. The flash moment and the livestream chat show how you did.',
      hook: 'If he confessed in Episode 2 he asks to wear your old guitar pick; if not, his publicist wants nothing that upstages Sienna.',
      money: 'Premium pieces cost 60 gems and are free to try on. They never score below the best free piece in their slot, and three stars stays reachable with free pieces only.',
      win: 'Best dressed', lose: 'He wore it anyway',
      glow: ['rgba(255,226,170,.26)', 'rgba(255,120,150,.2)', 'rgba(217,184,146,.18)'],
      zh: { title: '红毯亮相', tag: '所有目光都在他身上，他只看着你。', story: '皇冠音乐奖。你第一次以造型师身份负责他的红毯。主办方给了三个关键词，你有 45 秒。',
        controls: ['先选分类，再点卡片给他换装', '标签对上主题会加分，相冲的标签会扣分', '付费单品可以免费试穿'],
        loop: '看简报 → 对标签 → 完成造型。闪光灯时刻和直播评论会告诉你结果。', hook: '如果第二集他告白了，他会想戴上你当年那枚拨片；如果没有，公关要求不能抢西耶娜的风头。',
        money: '付费单品 60 钻石，可以免费试穿。它的得分不会低于同一栏最好的免费单品，只用免费单品也能拿三星。', win: '全场最佳造型', lose: '他还是穿着它' },
    },
    {
      id: 'ch4-headline', key: 'ch4', n: 4, href: '../ch4-headline/index.html', title: 'The Morning After',
      tag: 'Every tabloid has the photo.',
      story: 'The morning after the awards, every headline asks who he was looking at. His publicist has one hour to decide the story.',
      controls: [['⇄', 'Swipe or tap two tiles to swap them'], ['♡', 'Collect hearts and break the paparazzi tiles'], ['★', 'Match 4 or 5 for Spotlight and Encore specials']],
      loop: 'Moves-based match-3: reach the heart target and clear the blockers before you run out of moves.',
      hook: 'Go public or keep it secret one more week: the choice changes the board. Your Episode 2 and 3 results carry over.',
      money: '+5 moves is the classic match-3 offer: 30 gems continues the same board. A free retry and energy work like the other episodes.',
      win: "Yes, she's with me", lose: 'No comment',
      glow: ['rgba(255,230,190,.26)', 'rgba(244,166,198,.24)', 'rgba(217,184,146,.18)'],
      zh: { title: '头条之后', tag: '每家小报都登了那张照片。', story: '颁奖礼后的早上，所有头条都在问他看的是谁。公关只有一个小时决定怎么回应。',
        controls: ['滑动或点击两个相邻方块交换位置', '收集爱心，打掉狗仔照片方块', '连 4 个或 5 个会生成聚光灯和安可特效'],
        loop: '限步数三消：在步数用完前达到爱心目标并清掉障碍。', hook: '公开还是再瞒一周，这个选择会改变棋盘。第二、三集的结果也会带过来。',
        money: '「+5 步」是三消最经典的付费点：30 钻石在同一盘继续。免费重试和体力规则与其他几集相同。', win: '对，她是我的人', lose: '无可奉告' },
    },
  ];

  const esc = K.esc;
  const T = (en, zh) => K.tr(en, zh);
  const Z = (ep, key) => (K.lang() === 'zh' && ep.zh && ep.zh[key]) || ep[key];
  const storyState = () => { try { return K.story.all(); } catch (e) { return {}; } };

  function backdrop(vp, ep) {
    const g = ep.glow;
    vp.style.background = `radial-gradient(ellipse at 18% 30%, ${g[0]}, transparent 45%), radial-gradient(ellipse at 84% 24%, ${g[1]}, transparent 42%), radial-gradient(ellipse at 60% 92%, ${g[2]}, transparent 50%), #07060a`;
    const bokeh = document.createElement('div');
    bokeh.className = 'kf-bokeh';
    bokeh.innerHTML = [[8, 20, 180, g[0]], [26, 70, 120, g[2]], [76, 14, 150, g[1]], [90, 64, 200, g[0]], [64, 40, 90, g[2]], [40, 8, 70, g[1]]]
      .map(([x, y, s, c], k) => `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;background:radial-gradient(circle,${c.replace(/[\d.]+\)$/, '.9)')},transparent 70%);animation-delay:${-k * 3}s"></i>`).join('');
    vp.insertBefore(bokeh, vp.firstChild);
    const grain = document.createElement('div');
    grain.className = 'kf-grain';
    grain.style.backgroundImage = `url(${K.grain()})`;
    vp.insertBefore(grain, bokeh.nextSibling);
  }

  function leftPanel(ep) {
    const s = storyState();
    const nav = EPISODES.map((e) => {
      const r = s[e.key];
      const st = r ? (r.success ? `<span class="kf-st win">♥ ${esc(Z(e, 'win'))}</span>` : `<span class="kf-st lose">↳ ${esc(Z(e, 'lose'))}</span>`) : `<span class="kf-st">${T('Not played', '未游玩')}</span>`;
      return `<a class="kf-ep${e.id === ep.id ? ' on' : ''}" href="${e.href}"><b>${e.n}</b><span><em>${esc(Z(e, 'title'))}</em>${st}</span></a>`;
    }).join('');
    const zh = K.lang() === 'zh';
    return `<div class="kf-kicker">${T(`Off Camera · Episode ${ep.n}`, `镜头之外 · 第${ep.n}集`)}</div>
      <h1 class="kf-title${zh ? ' cjk' : ''}">${esc(Z(ep, 'title'))}</h1>
      <div class="kf-tag">${esc(Z(ep, 'tag'))}</div>
      <p class="kf-story">${esc(Z(ep, 'story'))}</p>
      <div class="kf-h">${T('How to play', '玩法')}</div>
      <ul class="kf-ctl">${ep.controls.map(([i, t], k) => `<li><span>${i}</span>${esc(zh && ep.zh ? ep.zh.controls[k] : t)}</li>`).join('')}</ul>
      <div class="kf-h">${T('Episodes', '剧集')}</div>
      <nav class="kf-nav">${nav}</nav>
      <a class="kf-link" href="../index.html">${T('‹ All episodes', '‹ 全部剧集')}</a>`;
  }

  // product mode: an "up next" card; designer mode (?designer=1): designer notes and tools
  function upNextPanel(ep) {
    const i = EPISODES.indexOf(ep), next = EPISODES[i + 1];
    if (!next) {
      return `<div class="kf-kicker">${T('Season finale', '本季终章')}</div>
        <a class="kf-next" href="../index.html"><img src="../assets/covers/hero.jpg" alt="" draggable="false"><span>
        <b>${T('Replay any episode', '重温任意一集')}</b><small>${T('Every choice changes the next scene.', '每个选择都会改变下一幕。')}</small>
        <em>${T('All episodes ›', '全部剧集 ›')}</em></span></a>`;
    }
    return `<div class="kf-kicker">${T('Up next', '下一集')}</div>
      <a class="kf-next" href="${next.href}"><img src="../assets/covers/ep${next.n}.jpg" alt="" draggable="false"><span>
      <i>${T(`Episode ${next.n}`, `第${next.n}集`)}</i><b class="${K.lang() === 'zh' ? 'cjk' : ''}">${esc(Z(next, 'title'))}</b>
      <small>${esc(Z(next, 'tag'))}</small><em>${T('Play ›', '播放 ›')}</em></span></a>`;
  }
  function rightPanel(ep) {
    if (!K.designer) return upNextPanel(ep);
    return `<div class="kf-kicker">${T('Designer notes', '设计笔记')}</div>
      <dl class="kf-notes">
        <dt>${T('Core loop', '核心循环')}</dt><dd>${esc(Z(ep, 'loop'))}</dd>
        <dt>${T('Story hook', '剧情挂钩')}</dt><dd>${esc(Z(ep, 'hook'))}</dd>
        <dt>${T('Retry &amp; monetisation', '重试与商业化')}</dt><dd>${esc(Z(ep, 'money'))} ${T('Story beats are never paywalled.', '剧情节点从不收费。')}</dd>
      </dl>
      <div class="kf-h">${T('Try it live', '现场演示')}</div>
      <div class="kf-btns">
        <button data-a="tune"><b>${T('Tuning presets', '调参预设')}</b><small>${T('Story start · standard · late story', '剧情开头 · 标准 · 剧情中后期')}</small></button>
        <button data-a="data"><b>${T('Event log &amp; funnel', '埋点与漏斗')}</b><small>${T('Where players drop off', '玩家在哪一步流失')}</small></button>
        <a href="../../../projects/off-camera.html"><b>${T('Design case study', '设计案例')}</b><small>${T('English and Chinese', '中英双语')}</small></a>
      </div>
      <p class="kf-fine">${T('Design prototype. Original story and characters; character art is AI-generated; ads and purchases are simulated.', '设计原型。剧情和角色均为原创，角色美术由 AI 生成，广告和购买均为模拟。')}</p>`;
  }

  function build(opts) {
    const ep = EPISODES.find((e) => e.id === opts.id);
    const ui = K.ui();
    if (!ep || !ui) return;
    const vp = ui.vp;
    backdrop(vp, ep);
    const L = document.createElement('aside'); L.className = 'kf-panel kf-left'; L.innerHTML = leftPanel(ep);
    const R = document.createElement('aside'); R.className = 'kf-panel kf-right'; R.innerHTML = rightPanel(ep);
    vp.appendChild(L); vp.appendChild(R);
    R.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      K.sfx.play('tap');
      if (b.dataset.a === 'tune') K.tuning.show();
      if (b.dataset.a === 'data') K.analytics.show();
    });
    const place = () => {
      const half = 195 * K.scale, gap = 44;
      const room = innerWidth / 2 - half - gap - 24;
      const show = room >= 230;
      [L, R].forEach((p) => { p.hidden = !show; p.style.width = Math.min(320, room) + 'px'; });
      L.style.right = (innerWidth / 2 + half + gap) + 'px';
      R.style.left = (innerWidth / 2 + half + gap) + 'px';
    };
    addEventListener('resize', place);
    place();
    // refresh the episode switcher when this episode writes its result
    K.onLang(() => { L.innerHTML = leftPanel(ep); R.innerHTML = rightPanel(ep); });
    const origSet = K.story.set.bind(K.story);
    K.story.set = function (k, v) { origSet(k, v); L.innerHTML = leftPanel(ep); };
  }

  const mount = K.mount;
  K.mount = function (opts) {
    const ui = mount.call(K, opts);
    try { build(opts || {}); } catch (e) { /* the surround is decorative; the game must still run */ }
    return ui;
  };
})();
