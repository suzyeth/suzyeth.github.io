/* ch3 Red Carpet Look — content data: tags, items, briefs, fan-comment templates.
 * Pure data so a creator can reskin / rewrite without touching game logic.
 * Tag keys stay Chinese (stable ids); TAG_EN is the English display label. */
(function () {
  'use strict';

  /* Six opposing tag pairs. A brief tag scores on items that carry it;
   * the opposite tag on an item counts as a clash. */
  const OPP = {
    温柔: '酷感', 酷感: '温柔',
    低调: '闪耀', 闪耀: '低调',
    正式: '街头', 街头: '正式',
    复古: '前卫', 前卫: '复古',
    暖调: '冷调', 冷调: '暖调',
    少年感: '成熟', 成熟: '少年感',
  };
  const TAG_EN = {
    温柔: 'Gentle', 酷感: 'Cool', 低调: 'Subtle', 闪耀: 'Sparkle', 正式: 'Formal', 街头: 'Street',
    复古: 'Vintage', 前卫: 'Edgy', 暖调: 'Warm', 冷调: 'Icy', 少年感: 'Boyish', 成熟: 'Mature',
    情侣: 'Yours',
  };

  const SLOTS = [
    { key: 'hair', name: '发型', en: 'Hair', icon: '✂' },
    { key: 'top', name: '上衣', en: 'Top', icon: '◇' },
    { key: 'outer', name: '外套', en: 'Jacket', icon: '◈' },
    { key: 'acc', name: '配饰', en: 'Jewelry', icon: '✧' },
    { key: 'pal', name: '色调', en: 'Palette', icon: '◐' },
  ];

  /* premiumRank: the first N ranks become 💎 items (N = tuning "premiumCount").
   * Item 0 of each slot is the neutral starting look. */
  const ITEMS = {
    hair: [
      { id: 'h0', name: '凌乱刘海', en: 'Messy Fringe', tags: ['少年感'] },
      { id: 'h1', name: '蓬松中分', en: 'Shaggy Part', tags: ['温柔', '少年感'] },
      { id: 'h2', name: '湿发背头', en: 'Slick Back', tags: ['正式', '成熟'] },
      { id: 'h3', name: '白金挑染', en: 'Platinum Streak', tags: ['前卫', '冷调', '闪耀'], premiumRank: 3 },
      { id: 'h4', name: '七十年代卷发', en: '70s Curls', tags: ['复古', '温柔'] },
      { id: 'h5', name: '狼尾', en: 'Wolf Cut', tags: ['街头', '酷感'] },
    ],
    top: [
      { id: 't0', name: '乐队T恤', en: 'Band Tee', tags: ['少年感'] },
      { id: 't1', name: '敞领丝衬衫', en: 'Open Silk Shirt', tags: ['温柔', '正式'] },
      { id: 't2', name: '宽松针织衫', en: 'Loose Knit', tags: ['温柔', '低调', '暖调'] },
      { id: 't3', name: '黑色高领', en: 'Black Turtleneck', tags: ['酷感', '成熟', '低调'] },
      { id: 't4', name: '佩斯利印花衬衫', en: 'Paisley Shirt', tags: ['复古', '街头'] },
      { id: 't5', name: '亮片背心', en: 'Sequin Vest', tags: ['闪耀', '前卫'], premiumRank: 1 },
    ],
    outer: [
      { id: 'o0', name: '不穿外套', en: 'No Jacket', tags: [] },
      { id: 'o1', name: '麂皮长大衣', en: 'Suede Coat', tags: ['温柔', '成熟', '暖调'] },
      { id: 'o2', name: '黑色礼服外套', en: 'Tux Jacket', tags: ['正式', '低调'] },
      { id: 'o3', name: '机车皮夹克', en: 'Biker Leather', tags: ['酷感', '街头', '冷调'] },
      { id: 'o4', name: '格纹西装外套', en: 'Plaid Blazer', tags: ['复古', '正式'] },
      { id: 'o5', name: '刺绣丝绒西装', en: 'Velvet Blazer', tags: ['闪耀', '复古', '成熟'], premiumRank: 4 },
    ],
    acc: [
      { id: 'a0', name: '不戴配饰', en: 'None', tags: [] },
      { id: 'a1', name: '拨片项链', en: 'Guitar-Pick Chain', tags: ['温柔', '低调', '情侣'], couple: true },
      { id: 'a2', name: '银耳骨夹', en: 'Ear Cuff', tags: ['酷感', '前卫', '冷调'] },
      { id: 'a3', name: '珍珠项链', en: 'Pearl Strand', tags: ['复古', '温柔'] },
      { id: 'a4', name: '叠戴金链', en: 'Layered Chains', tags: ['闪耀', '街头'] },
      { id: 'a5', name: '皇冠胸针', en: 'Crown Brooch', tags: ['闪耀', '正式'], premiumRank: 2 },
    ],
    pal: [
      { id: 'p0', name: '黑白', en: 'Monochrome', tags: ['低调'] },
      { id: 'p1', name: '威士忌棕', en: 'Whiskey', tags: ['暖调', '复古'] },
      { id: 'p2', name: '午夜蓝', en: 'Midnight Blue', tags: ['冷调', '酷感'] },
      { id: 'p3', name: '骨白', en: 'Bone White', tags: ['温柔', '少年感'] },
      { id: 'p4', name: '牛血红', en: 'Oxblood', tags: ['成熟', '暖调'] },
      { id: 'p5', name: '金色狂潮', en: 'Gold Rush', tags: ['闪耀', '前卫'], premiumRank: 5 },
    ],
  };

  /* Look themes for The Crown Music Awards. Each lists 4 tags; the round uses the first N (tuning "tagsPerBrief").
   * Tags are unchanged from the fairness-checked set; only names were re-themed. */
  const BRIEFS = [
    { id: 'autumn', name: '慢热', en: 'Slow Burn', tags: ['温柔', '低调', '暖调', '正式'] },
    { id: 'winter', name: '黑冰', en: 'Black Ice', tags: ['酷感', '冷调', '前卫', '成熟'] },
    { id: 'youth', name: '车库岁月', en: 'Garage Days', tags: ['少年感', '街头', '闪耀', '冷调'] },
    { id: 'vintage', name: '黄金年代', en: 'Golden Age', tags: ['复古', '正式', '温柔', '暖调'] },
    { id: 'starlight', name: '皇冠之夜', en: 'Crown Jewels', tags: ['闪耀', '成熟', '正式', '前卫'] },
    { id: 'snow', name: '破晓', en: 'First Light', tags: ['温柔', '冷调', '少年感', '低调'] },
  ];

  /* fan live-chat templates, one set per language (never mixed on screen) */
  /* red-carpet livestream chat, one set per language (never mixed on screen) */
  const COMMENTS = {
    en: {
      PRAISE: {
        温柔: ['ok he looks SOFT tonight', 'the gentle era?? I\'m not ready'],
        酷感: ['that stare through the lens. I\'m done', 'aura: untouchable'],
        低调: ['quiet money. quiet rock star.', 'simple and it still looks expensive'],
        闪耀: ['brightest thing on the carpet, sorry Sienna', 'the sparkle is SPARKLING'],
        正式: ['the tailoring. THE TAILORING.', 'rock star in a tux is my religion'],
        街头: ['giving off-duty rock star', 'looks like he walked out of a garage show'],
        复古: ['straight off a 70s album cover', 'the vintage energy!!'],
        前卫: ['this is runway, not red carpet', 'so editorial omg'],
        暖调: ['whiskey tones on him should be illegal', 'warm colors suit him so well'],
        冷调: ['midnight blue on Jace = perfect', 'ice cold and I love it'],
        少年感: ['he looks like the kid from his first open mic', 'baby face, big stage'],
        成熟: ['grown man energy', 'when did Jace get this grown up??'],
      },
      STARS: [
        ['who dressed him??', 'the stylist owes us an apology', 'these pieces are fighting'],
        ['kinda plain tonight…', 'his face is carrying the outfit', 'it\'s fine I guess'],
        ['clean. no notes.', 'Jace looks great tonight', 'solid look'],
        ['BEST DRESSED. NO CONTEST.', 'give the stylist a raise', 'this is going viral in 3…2…1'],
      ],
      FILLER: ['JACE LOOK OVER HERE', 'aaaaaaa', 'screen recording everything', 'he smiled!! he smiled!!', 'Velvet Static forever', 'is Sienna here yet?'],
      COUPLE: ['wait what\'s that guitar pick on his chain??', 'that\'s not Sienna\'s. #WhoIsJacesGirl', 'he keeps touching that necklace…'],
      LOWKEY_BAD: ['this is "low-key"??', 'Sienna\'s team is going to lose it'],
      missing: (t) => `where's the ${TAG_EN[t].toLowerCase()} vibe tho?`,
      clash: (it, t) => `the ${it.en.toLowerCase()} is way too ${TAG_EN[t].toLowerCase()} for this theme`,
      premium: (it) => `that ${it.en.toLowerCase()} is unreal`,
    },
    zh: {
      PRAISE: {
        温柔: ['今晚的他好温柔', '温柔路线？我还没准备好'],
        酷感: ['那个看镜头的眼神，我没了', '气场强到不敢靠近'],
        低调: ['低调但一看就很贵', '安安静静的摇滚明星'],
        闪耀: ['全场最亮就是他，西耶娜对不起了', '闪到发光'],
        正式: ['这剪裁绝了', '穿礼服的摇滚主唱是我的信仰'],
        街头: ['下了班的摇滚明星本人', '像刚从车库演出走出来'],
        复古: ['像七十年代的专辑封面', '复古味对了'],
        前卫: ['这是秀场不是红毯', '好有时装大片感'],
        暖调: ['威士忌色太衬他了', '暖色好适合他'],
        冷调: ['午夜蓝和杰斯太配了', '冷冷的，我喜欢'],
        少年感: ['像他第一次上台那晚', '娃娃脸站上大舞台'],
        成熟: ['成熟男人的魅力', '杰斯什么时候这么成熟了'],
      },
      STARS: [
        ['这身是谁搭的', '造型师出来道歉', '衣服在打架'],
        ['今晚有点普通', '全靠脸撑着', '还行吧'],
        ['干净利落，挑不出毛病', '杰斯今晚状态好好', '这套可以'],
        ['全场最佳造型，没有悬念', '给造型师加薪', '马上就要疯传了'],
      ],
      FILLER: ['杰斯看这边！', '啊啊啊啊啊', '录屏录屏', '他笑了他笑了', '天鹅绒静电永远的神', '西耶娜到了吗？'],
      COUPLE: ['等等，他项链上那个拨片是什么？', '那不是西耶娜的，#杰斯的神秘女孩#', '他一直在摸那条项链……'],
      LOWKEY_BAD: ['这也叫低调？', '西耶娜的团队要气疯了'],
      missing: (t) => `说好的「${t}」呢？没看出来`,
      clash: (it, t) => `${it.name}和主题有点打架，太${t}了`,
      premium: (it) => `${it.name}也太好看了吧`,
    },
  };

  window.Ch3Data = { OPP, TAG_EN, SLOTS, ITEMS, BRIEFS, COMMENTS, PREMIUM_PRICE: '60', PREMIUM_GEMS: 60, BOOSTER_GEMS: 30 };
})();
