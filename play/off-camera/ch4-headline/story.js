/* Episode 4 · The Morning After — story text (English first, zh for Chinese mode).
 * Opening dialogue, tutorial card, result branches, endings, end card, and the
 * in-game lines (combo words, tabloid ticker, Jace/Viv reactions). */
(function () {
  'use strict';
  const tr = (en, zh) => Kit.tr(en, zh);
  const JACE = 'Jace · 杰斯', VIV = 'Viv · 薇薇安';

  /* opening choice: Go public = more photos, fewer hearts; one more week = the reverse */
  const CHOICE = {
    public: { blockers: 3, hearts: -4 },
    secret: { blockers: -3, hearts: 5 },
  };

  function carry() {
    const ch2 = Kit.story.get('ch2', null), ch3 = Kit.story.get('ch3', null);
    return { confessed: !!(ch2 && ch2.success), ch2Played: !!ch2, ch3Failed: !!(ch3 && ch3.success === false), ch3Played: !!ch3 };
  }

  function introLines(c) {
    const lines = [
      { who: 'narr', text: 'The morning after the Crown Music Awards. Room-service coffee, cold toast, and a phone that hasn\'t stopped buzzing since six.', zh: '皇冠音乐奖的第二天早上。客房送来的咖啡，凉掉的吐司，还有一部从六点起就没停过震动的手机。' },
      { who: 'tang', name: VIV, mood: 'normal', text: 'Every tabloid ran the same photo. Jace on the carpet, looking at someone off-camera. Like a man in love.', zh: '所有小报都登了同一张照片：杰斯站在红毯上，看着镜头外的某个人。一脸恋爱中的样子。' },
      { who: 'luyu', name: JACE, mood: 'smile', text: 'In my defense, she was standing right there.', zh: '我得说一句，她当时就站在那儿。' },
      { who: 'tang', name: VIV, mood: 'angry', text: '#WhoIsJacesGirl has four million posts. I have one hour before I give them a story.', zh: '#杰斯的神秘女孩# 已经四百万条了。一个小时之内，我得给他们一个说法。' },
    ];
    if (c.confessed) lines.push(
      { who: 'luyu', name: JACE, mood: 'blush', text: 'I meant every word on that rooftop. I\'m done pretending.', zh: '天台上说的每个字我都是认真的。我不想再装了。' },
      { who: 'narr', text: 'Half the comments are already rooting for "the girl in the photo".', zh: '已经有一半评论在替「照片里那个女孩」说话了。' });
    else if (c.ch2Played) lines.push({ who: 'luyu', name: JACE, mood: 'normal', text: 'There\'s something I never got to finish saying on that roof.', zh: '天台那晚，有句话我一直没说完。' });
    if (c.ch3Failed) lines.push({ who: 'tang', name: VIV, mood: 'angry', text: 'And after last night\'s "bold" look, the paparazzi are camped in the lobby. Extra lenses on every door.', zh: '再加上昨晚那身「大胆」的造型，狗仔已经在大堂扎营了，每道门外都多了几台相机。' });
    else if (c.ch3Played) lines.push({ who: 'tang', name: VIV, mood: 'smile', text: 'At least the look was a hit. Best Dressed buys us a little goodwill.', zh: '好在造型赢了。「全场最佳造型」能帮我们攒点好感。' });
    lines.push(
      { who: 'tang', name: VIV, mood: 'normal', text: 'Sienna\'s team wants a joint statement by noon. Or… we tell the truth.', zh: '西耶娜的团队要我们中午前发联合声明。要不然……就说实话。' },
      { who: 'luyu', name: JACE, mood: 'smile', text: 'Your call. I\'m standing next to you either way.', zh: '你来决定。不管怎样，我都站在你身边。' },
      { who: 'me', text: 'What do we tell them?', zh: '我们要怎么回应？', choices: [
        { text: 'Go public', zh: '公开', sub: 'More paparazzi photos on the board, fewer hearts needed · 棋盘上狗仔照片更多，需要的心更少', value: 'public' },
        { text: 'Keep it secret one more week', zh: '再瞒一周', sub: 'Fewer photos, more hearts needed · 狗仔照片更少，需要的心更多', value: 'secret' },
      ] });
    return lines;
  }

  function modifier(c, choice, cfg, goal) {
    const en = [], zh = [];
    if (choice === 'public') { en.push(`You chose to go public: +${CHOICE.public.blockers} photos, ${-CHOICE.public.hearts} fewer hearts needed.`); zh.push(`你选择了公开：狗仔照片 +${CHOICE.public.blockers}，需要的心 -${-CHOICE.public.hearts}。`); }
    else { en.push(`One more week: ${-CHOICE.secret.blockers} fewer photos, +${CHOICE.secret.hearts} hearts needed.`); zh.push(`再瞒一周：狗仔照片 -${-CHOICE.secret.blockers}，需要的心 +${CHOICE.secret.hearts}。`); }
    if (c.confessed && cfg.chargedHearts > 0) { en.push(`Episode 2: he said it, so ${cfg.chargedHearts} hearts start charged (worth ${cfg.chargedValue} each).`); zh.push(`第二集他告白了：开局有 ${cfg.chargedHearts} 颗充能的心（每颗算 ${cfg.chargedValue} 颗）。`); }
    else if (!c.ch2Played) { en.push('No Episode 2 save: no charged hearts.'); zh.push('没有第二集记录：没有充能的心。'); }
    if (c.ch3Failed && cfg.extraRow > 0) { en.push(`Episode 3: the look flopped, so an extra row of ${goal.extra} photos.`); zh.push(`第三集造型被吐槽：多出一排 ${goal.extra} 张狗仔照片。`); }
    if (goal.booster === 'viv') { en.push('Viv\'s Statement: two Spotlights are already on the board.'); zh.push('薇薇安的声明：开局棋盘上已有两个聚光灯。'); }
    return [en.join(' '), zh.join('')];
  }

  function tutorial(goal, mod) {
    return {
      chapter: 'Episode 4 · Mini game', chapterZh: '第四集 · 小游戏', title: 'The Morning After', zh: '头条之后',
      goal: `Collect ${goal.hearts} hearts and clear ${goal.blockers} paparazzi photos in ${goal.moves} moves`,
      goalZh: `${goal.moves} 步内收集 ${goal.hearts} 颗心，撕掉 ${goal.blockers} 张狗仔照片`,
      items: [
        { icon: '⇆', text: 'Swipe a tile, or tap two neighbours, to swap. Line up 3 or more of a kind.', zh: '滑动方块，或先后点两个相邻方块来交换。三个以上同款连成一线就能消除。' },
        { icon: '▣', text: 'Paparazzi photos break when you clear a tile right next to them.', zh: '在狗仔照片旁边消除，照片就会被撕掉。' },
        { icon: '✦', text: '4 in a row makes a <b>Spotlight</b> that clears a line. An L, a T or 5 in a row makes an <b>Encore</b>.', zh: '4 连生成「聚光灯」，清掉一整行或一整列；L 形、T 形或 5 连生成「安可」。' },
      ],
      modifier: mod[0], modifierZh: mod[1], start: 'Open the feed', startZh: '打开动态',
    };
  }

  /* cascade words, by chain length */
  function comboWord(chain) {
    if (chain >= 5) return tr('Breaking News!', '全网沸腾！');
    if (chain === 4) return tr('Viral!', '爆了！');
    if (chain === 3) return tr('Trending!', '上热门！');
    return tr('Nice!', '漂亮！');
  }
  const TICKER = [
    ['WHO IS SHE? Jace\'s mystery glance', '她是谁？杰斯的神秘眼神'],
    ['Fans zoom in: is that a guitar pick?', '粉丝放大照片：那是一枚拨片？'],
    ['#WhoIsJacesGirl passes four million posts', '#杰斯的神秘女孩# 破四百万'],
    ['Insider: "He\'s never looked happier"', '知情人：「从没见他这么开心过」'],
    ['Velvet Static frontman to speak at noon', '天鹅绒静电主唱中午回应'],
  ];
  function ticker(p) { const t = TICKER[Math.min(TICKER.length - 1, Math.floor(p * (TICKER.length - 1) + 0.0001))]; return tr(t[0], t[1]); }

  const SAY = {
    start: [VIV, 'Every match is a headline. Make them count.', '每一次消除都是一条新闻，别浪费。'],
    startViv: [VIV, 'Statement\'s out. Two Spotlights on the board. Use them.', '声明发出去了，棋盘上有两个聚光灯，用好它们。'],
    firstPhoto: [JACE, 'That one was my bad side anyway.', '那张本来就拍得我很丑。'],
    photosDone: [VIV, 'Paparazzi shots are gone. Now give them the hearts.', '狗仔照片清干净了，接下来看心。'],
    heartsDone: [JACE, 'Hearts are in. Just the photos left.', '心够了，就剩那些照片。'],
    encore: [JACE, 'Okay. That one\'s a headline.', '好，这个够上头条。'],
    spotlight: [VIV, 'Spotlight. Aim it at the photos.', '聚光灯，对准那些照片。'],
    low: [VIV, 'Five moves. Clock\'s ticking.', '还剩五步，抓紧。'],
    plus5: [VIV, 'Five more. I bought us ten minutes.', '再给你五步。我替我们多争取了十分钟。'],
    shuffle: [VIV, 'Feed\'s gone stale. Refreshing.', '刷不出新东西了，换一批。'],
    combo: [JACE, 'You\'re trending faster than my album.', '你上热门比我的专辑还快。'],
  };

  function result(o) {
    const win = o.success;
    return {
      success: win, stars: o.stars,
      title: win ? 'Yes, She\'s With Me' : 'No Comment', zh: win ? '对，她是我的人' : '无可奉告',
      stats: [
        { label: 'Hearts · 心', value: `${Math.min(o.hearts, o.goal.hearts)}/${o.goal.hearts}`, key: 'hearts', raw: o.hearts },
        { label: 'Photos cleared · 撕掉的照片', value: `${o.goal.blockers - o.blockersLeft}/${o.goal.blockers}`, key: 'photos', raw: o.goal.blockers - o.blockersLeft },
        { label: 'Moves left · 剩余步数', value: String(o.movesLeft), key: 'movesLeft', raw: o.movesLeft },
        { label: 'Best chain · 最高连锁', value: `x${o.bestChain}`, key: 'bestChain', raw: o.bestChain },
        { label: 'Score · 得分', value: String(o.score), key: 'score', raw: o.score },
        { label: 'Your call · 你的决定', value: o.choice === 'public' ? 'Go public · 公开' : 'One more week · 再瞒一周', key: 'choice', raw: o.choice },
      ],
      branch: win
        ? { title: 'Yes, She\'s With Me · 对，她是我的人', text: o.choice === 'public' ? 'You said go public. He posts the photo before Viv can finish her sentence.' : 'You asked for one more week. The feed decided in one morning, and he posts the photo anyway.', zh: o.choice === 'public' ? '你说了公开。薇薇安话还没说完，他已经把照片发了出去。' : '你想再瞒一周，可网友一个早上就替你们做了决定。他还是把照片发了出去。' }
        : { title: 'No Comment · 无可奉告', text: o.choice === 'public' ? 'You were ready to go public, but the noise wins this round. The story stays a rumour.' : 'One more week, as you wanted. The story stays a rumour, and he texts you: "next week, I promise."', zh: o.choice === 'public' ? '你已经准备好公开了，可这一轮舆论占了上风。故事依然只是传闻。' : '如你所愿，再瞒一周。故事依然只是传闻，他发来短信：「下周，我保证。」' },
    };
  }

  function endingLines(win, choice) {
    if (win) return [
      { who: 'narr', text: '11:58 a.m. Jace posts one photo: two hands on a hotel table, and an old guitar pick on a chain.', zh: '上午 11:58，杰斯发了一张照片：酒店桌上的两只手，还有一枚串在链子上的旧拨片。' },
      { who: 'narr', text: 'The caption: "Yes, she\'s with me. She was with me before any of this."', zh: '配文：「对，她是我的人。在这一切开始之前，她就在了。」' },
      { who: 'tang', name: VIV, mood: 'smile', text: '(sighs) The comments are exploding. Mostly hearts. …Fine. I\'ll call Sienna\'s people.', zh: '（叹气）评论区炸了，大部分是爱心。……行吧，我去联系西耶娜那边。' },
      choice === 'public'
        ? { who: 'luyu', name: JACE, mood: 'smile', text: 'You said go public. Best call anyone\'s made all week.', zh: '是你说要公开的。这是这周最好的决定。' }
        : { who: 'luyu', name: JACE, mood: 'blush', text: 'I know you wanted one more week. I couldn\'t wait that long.', zh: '我知道你想再等一周。可我等不了那么久。' },
      { who: 'luyu', name: JACE, mood: 'blush', text: 'No more service exits. Next time, we walk out the front door together.', zh: '以后不走员工通道了。下次，我们一起从正门走出去。' },
    ];
    return [
      { who: 'narr', text: 'Noon. Viv steps up to a wall of cameras and reads two words: "No comment."', zh: '中午，薇薇安站到一排镜头前，只念了四个字：「无可奉告。」' },
      choice === 'public'
        ? { who: 'luyu', name: JACE, mood: 'sad', text: 'We almost told them. Almost is a start.', zh: '我们差一点就说出口了。差一点，也算开始。' }
        : { who: 'tang', name: VIV, mood: 'normal', text: 'One more week, like you wanted. Use it well.', zh: '如你所愿，再瞒一周。好好用这一周。' },
      { who: 'narr', text: 'He leaves through the service exit. A minute later, your phone buzzes.', zh: '他从员工通道离开。一分钟后，你的手机震了一下。' },
      { who: 'luyu', name: 'Jace (text) · 杰斯（短信）', mood: 'blush', text: 'Next week, I promise. I\'m done hiding you.', zh: '下周，我保证。我不想再把你藏起来了。' },
      { who: 'narr', text: 'Then a second message, from a number you don\'t know. A photo of you, taken this morning, through the hotel window.', zh: '接着又来了一条，陌生号码。是一张你今天早上的照片，隔着酒店的窗户拍的。' },
    ];
  }

  function endCard(win) {
    return {
      badge: tr('Episode 4 · End', '第四集 · 完'),
      title: win ? tr('To be continued', '未完待续') : tr('Season 2 · coming soon', '第二季 · 敬请期待'),
      text: win ? tr('Four million strangers know about you now. He only cares that you said yes.', '现在四百万个陌生人都知道了你。他只在乎你点了头。')
        : tr('Someone else knows. Who took that photo?', '还有人知道。那张照片，是谁拍的？'),
      button: tr('Back to episodes', '返回剧集'),
    };
  }

  window.Ch4Story = { CHOICE, carry, introLines, modifier, tutorial, comboWord, ticker, SAY, result, endingLines, endCard, JACE, VIV };
})();
