/* Wallet: gems (premium currency) + energy (retry stamina), always visible in the top bar.
 * Rules the prototype demonstrates:
 *  - The story itself never costs energy or gems; continuing on any branch is free.
 *  - Retrying a mini-game: first retry free, then 1 energy; out of energy → rewarded ad for +1.
 *  - Boosters and premium items cost gems; gems come from (mock) packs or a capped rewarded ad.
 *  - Energy refills 1 every 10 minutes, up to 5.
 * Everything is simulated and stored only in this browser. Load after kit.js. */
(function () {
  'use strict';
  if (!window.Kit) return;
  const K = window.Kit;
  const KEY = 'off-camera-wallet-v1';
  const MAX = 5, REGEN_MS = 10 * 60 * 1000;
  const START = { gems: 120, energy: MAX };
  const PRICE_TO_GEMS = { '$0.99': 30, '$1.99': 60 };
  const REFILL_GEMS = 40, AD_GEMS = 10, AD_GEMS_PER_DAY = 2;
  const PACKS = [
    { id: 'gems_60', gems: 60, price: '$0.99' },
    { id: 'gems_330', gems: 330, price: '$4.99', tag: 'Most popular', tagZh: '最受欢迎' },
    { id: 'gems_700', gems: 700, price: '$9.99', tag: 'Best value', tagZh: '最划算' },
  ];
  const GEM = '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#f4a6c6"/><path d="M2 9h20M6 3l3 6 3 12 3-12 3-6" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" fill="none"/></svg>';
  const BOLT = '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#e6c9a4"/></svg>';
  K.icon.gem = GEM; K.icon.bolt = BOLT;

  const today = () => new Date().toISOString().slice(0, 10);
  function regen(w) {
    if (w.energy >= MAX) { w.at = Date.now(); return; }
    const n = Math.floor((Date.now() - w.at) / REGEN_MS);
    if (n > 0) { w.energy = Math.min(MAX, w.energy + n); w.at += n * REGEN_MS; if (w.energy >= MAX) w.at = Date.now(); }
  }
  function load() {
    const raw = K.store.get(KEY, null);
    const w = raw && typeof raw.gems === 'number' && typeof raw.energy === 'number' ? raw : { ...START, at: Date.now() };
    w.at = w.at || Date.now(); w.adDay = w.adDay || today(); w.adGems = w.adGems || 0;
    regen(w);
    return w;
  }
  let w = load();
  const save = () => { K.store.set(KEY, w); render(); };
  const sync = () => { w = load(); };
  addEventListener('storage', (e) => { if (e.key === KEY) { sync(); render(); } });
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const wallet = {
    MAX, REFILL_GEMS,
    gems: () => w.gems,
    energy: () => { regen(w); return w.energy; },
    nextEnergyIn: () => (w.energy >= MAX ? 0 : REGEN_MS - (Date.now() - w.at)),
    gemsFor: (item) => item.gems || PRICE_TO_GEMS[item.price] || 30,
    spendGems(n, reason) { sync();
      if (w.gems < n) return false;
      w.gems -= n; K.track('wallet_spend', { currency: 'gems', amount: n, reason }); save(); pulse('gems'); return true;
    },
    addGems(n, reason) { sync(); w.gems += n; K.track('wallet_gain', { currency: 'gems', amount: n, reason }); save(); pulse('gems'); },
    spendEnergy(n, reason) { sync();
      regen(w);
      if (w.energy < n) return false;
      if (w.energy >= MAX) w.at = Date.now();
      w.energy -= n; K.track('wallet_spend', { currency: 'energy', amount: n, reason }); save(); pulse('energy'); return true;
    },
    addEnergy(n, reason) { sync(); regen(w); w.energy = Math.min(MAX, w.energy + n); if (w.energy >= MAX) w.at = Date.now(); K.track('wallet_gain', { currency: 'energy', amount: n, reason }); save(); pulse('energy'); },
    reset() { w = { ...START, at: Date.now(), adDay: today(), adGems: 0 }; save(); },
  };
  K.wallet = wallet;

  /* ---------- top-bar pills ---------- */
  // build the pills once, then only update their text so a tap is never lost to a re-render
  function render() {
    const box = document.getElementById('kit-wallet');
    if (!box) return;
    regen(w);
    if (!box.firstChild) {
      box.innerHTML = `<button class="kw-pill" data-w="gems" title="${K.tr('Gems', '钻石')}">${GEM}<b></b><span class="kw-plus">+</span></button>
        <button class="kw-pill" data-w="energy" title="${K.tr('Energy', '体力')}">${BOLT}<b></b><em></em></button>`;
    }
    box.querySelector('[data-w=gems]').title = K.tr('Gems', '钻石');
    box.querySelector('[data-w=energy]').title = K.tr('Energy', '体力');
    box.querySelector('[data-w=gems] b').textContent = w.gems;
    box.querySelector('[data-w=energy] b').textContent = `${w.energy}/${MAX}`;
    box.querySelector('[data-w=energy] em').textContent = w.energy < MAX ? mmss(wallet.nextEnergyIn()) : '';
  }
  function pulse(kind) {
    const p = document.querySelector(`.kw-pill[data-w=${kind}]`);
    if (!p) return;
    p.classList.remove('kw-pulse'); void p.offsetWidth; p.classList.add('kw-pulse');
  }

  /* ---------- sheets ---------- */
  function sheet(html, onDismiss) {
    const n = K.el(`<div class="kit-scrim" style="align-items:flex-end;z-index:75;padding-bottom:0"><div class="kit-sheet kw-sheet">${html}</div></div>`);
    n.addEventListener('click', (e) => { if (e.target === n) { n.remove(); if (onDismiss) onDismiss(); } });
    K.ui().stage.appendChild(n);
    return n;
  }
  wallet.openStore = function () {
    K.track('store_view', {});
    return new Promise((resolve) => {
      if (w.adDay !== today()) { w.adDay = today(); w.adGems = 0; }
      const n = sheet(`<div class="kw-kicker">${K.tr('STORE', '商店')}</div>
        <div class="kw-title">${GEM}<span>${K.tr('Gems', '钻石')}</span><b>${w.gems}</b></div>
        <p class="kw-p">${K.tr('Gems buy boosters and premium looks. The story never needs them.', '钻石用于道具和付费造型，剧情本身不需要。')}</p>
        <div class="kw-packs">${PACKS.map((p) => `<button class="kw-pack" data-p="${p.id}">${p.tag ? `<i>${K.tr(p.tag, p.tagZh)}</i>` : ''}${GEM}<b>${p.gems}</b><span>${p.price}</span></button>`).join('')}</div>
        <button class="kit-btn ad" data-a="ad" ${w.adGems >= AD_GEMS_PER_DAY ? 'disabled' : ''}>${K.tr(`▶ Watch an ad · +${AD_GEMS} gems (${AD_GEMS_PER_DAY - w.adGems} left today)`, `▶ 看广告领 ${AD_GEMS} 钻石（今天还剩 ${AD_GEMS_PER_DAY - w.adGems} 次）`)}</button>
        <button class="kit-btn ghost" data-a="close">${K.tr('Close', '关闭')}</button>
        <div class="kit-note">${K.tr('Demo build · no payment is taken', '演示版本 · 不会实际扣款')}</div>`, () => resolve());
      const done = () => { n.remove(); resolve(); };
      n.querySelector('[data-a=close]').onclick = done;
      n.querySelector('[data-a=ad]').onclick = async () => { n.remove(); await K.mockAd(); w.adGems++; wallet.addGems(AD_GEMS, 'ad'); resolve(); };
      n.querySelectorAll('[data-p]').forEach((b) => {
        b.onclick = () => {
          const p = PACKS.find((x) => x.id === b.dataset.p);
          K.sfx.play('collect'); K.track('store_buy', { pack: p.id, price: p.price });
          wallet.addGems(p.gems, p.id); K.toast(K.tr(`+${p.gems} gems`, `+${p.gems} 钻石`)); done();
        };
      });
    });
  };
  wallet.openEnergy = function () {
    K.track('energy_view', {});
    return new Promise((resolve) => {
      regen(w);
      const full = w.energy >= MAX;
      const n = sheet(`<div class="kw-kicker">${K.tr('ENERGY', '体力')}</div>
        <div class="kw-title">${BOLT}<span>${K.tr('Energy', '体力')}</span><b>${w.energy}/${MAX}</b></div>
        <p class="kw-p">${K.tr(`${full ? 'Full.' : `+1 in ${mmss(wallet.nextEnergyIn())}.`} Retrying a mini-game costs 1 energy after the free retry. Watching or continuing the story is always free.`,
          `${full ? '已满。' : `${mmss(wallet.nextEnergyIn())} 后回复 1 点。`}免费重试用完后，每次重试消耗 1 体力；看剧情、走分支永远免费。`)}</p>
        <button class="kit-btn primary" data-a="refill" ${full ? 'disabled' : ''}>${K.tr(`Refill to full · ${REFILL_GEMS} gems`, `用 ${REFILL_GEMS} 钻石补满`)}</button>
        <button class="kit-btn ad" data-a="ad" ${full ? 'disabled' : ''}>${K.tr('▶ Watch an ad · +1 energy', '▶ 看广告补 1 点体力')}</button>
        <button class="kit-btn ghost" data-a="close">${K.tr('Close', '关闭')}</button>`, () => resolve());
      const done = () => { n.remove(); resolve(); };
      n.querySelector('[data-a=close]').onclick = done;
      n.querySelector('[data-a=refill]').onclick = async () => {
        if (w.gems < REFILL_GEMS) { n.remove(); await wallet.openStore(); resolve(); return; }
        wallet.spendGems(REFILL_GEMS, 'energy_refill'); wallet.addEnergy(MAX, 'refill'); done();
      };
      n.querySelector('[data-a=ad]').onclick = async () => { n.remove(); await K.mockAd(); wallet.addEnergy(1, 'ad'); resolve(); };
    });
  };

  /* pay for an item in gems; opens the store when short. resolves true if paid */
  wallet.payGems = function (item) {
    const cost = wallet.gemsFor(item);
    K.track('iap_view', { item: item.id, gems: cost });
    return new Promise((resolve) => {
      const short = w.gems < cost;
      const n = sheet(`<div class="kw-kicker">${short ? K.tr('NOT ENOUGH GEMS', '钻石不足') : K.tr('CONFIRM', '确认')}</div>
        <div class="kw-title"><span>${K.esc(K.loc(item.name))}</span></div>
        <p class="kw-p">${K.esc(K.loc(item.desc || ''))}</p>
        <div class="kw-cost">${GEM}<b>${cost}</b><span>${K.tr(`you have ${w.gems}`, `现有 ${w.gems}`)}</span></div>
        <button class="kit-btn primary" data-a="pay">${short ? K.tr('Get more gems', '去获取钻石') : K.tr(`Use ${cost} gems`, `使用 ${cost} 钻石`)}</button>
        <button class="kit-btn ghost" data-a="no">${K.tr('Cancel', '取消')}</button>`, () => { K.track('iap_cancel', { item: item.id, via: 'dismiss' }); resolve(false); });
      n.querySelector('[data-a=no]').onclick = () => { n.remove(); K.track('iap_cancel', { item: item.id }); resolve(false); };
      n.querySelector('[data-a=pay]').onclick = async () => {
        n.remove();
        if (short) { await wallet.openStore(); resolve(await wallet.payGems(item)); return; }
        K.sfx.play('collect'); wallet.spendGems(cost, item.id); K.track('iap_complete', { item: item.id, gems: cost }); resolve(true);
      };
    });
  };

  /* ---------- hook into the kit ---------- */
  const mount = K.mount;
  K.mount = function (opts) {
    const ui = mount.call(K, opts);
    render();
    const box = document.getElementById('kit-wallet');
    if (box) box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]'); if (!b) return;
      e.stopPropagation(); K.sfx.play('tap');
      if (b.dataset.w === 'gems') wallet.openStore(); else wallet.openEnergy();
    });
    setInterval(render, 1000);
    return ui;
  };
  // every paid item in the episodes (boosters, premium looks) is bought with gems
  K.mockPurchase = (item) => wallet.payGems(item);
})();
