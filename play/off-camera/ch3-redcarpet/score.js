/* ch3 Red Carpet Look — pure scoring rules (no DOM). Shared by game.js and the
 * offline fairness checker, so the rule the player sees is the rule that is tested.
 *
 * ctx = { tags:[brief tags], M, P, coupleBonus, lowkeyPenalty, couple:bool, lowkey:bool, premiumCount }
 *
 * Designer-piece rule (premium fairness): a 💎 piece never scores below any free
 * piece in its own slot, in the outfit it is actually worn with. If its own tags
 * would score less, it "adapts": it scores (and its card shows) the tags of the
 * free piece that would do best in that spot. */
(function () {
  'use strict';
  const D = window.Ch3Data;
  const KEYS = D.SLOTS.map((s) => s.key);
  const REPEAT = 0.4;   // a brief tag hit a second time scores 40%

  const isPremium = (it, ctx) => !!it.premiumRank && it.premiumRank <= ctx.premiumCount;

  /* value of one piece on its own (first-hit points, clashes, branch bonuses) */
  function soloScore(tags, ctx) {
    let s = 0;
    tags.forEach((t) => {
      if (ctx.tags.includes(t)) s += ctx.M;
      else if (ctx.tags.includes(D.OPP[t])) s -= ctx.P;
      if (t === '情侣' && ctx.couple) s += ctx.coupleBonus;
      if (t === '闪耀' && ctx.lowkey) s -= ctx.lowkeyPenalty;
    });
    return s;
  }
  function bestFreeInSlot(slot, ctx) {
    let best = null, bs = -Infinity;
    D.ITEMS[slot].forEach((it) => {
      if (isPremium(it, ctx)) return;
      const s = soloScore(it.tags, ctx);
      if (s > bs) { bs = s; best = it; }
    });
    return best;
  }
  /* raw outfit score; items: [{slot, item, tags}] */
  function scoreTags(items, ctx) {
    const hits = {}, clashes = [], matched = new Set();
    let score = 0, couple = false, flashy = 0;
    items.forEach(({ item, tags }) => {
      tags.forEach((t) => {
        if (ctx.tags.includes(t)) { hits[t] = (hits[t] || 0) + 1; score += hits[t] === 1 ? ctx.M : Math.round(ctx.M * REPEAT); matched.add(t); }
        else if (ctx.tags.includes(D.OPP[t])) { score -= ctx.P; clashes.push({ item, tag: t }); }
        if (t === '情侣' && ctx.couple && !couple) { couple = true; score += ctx.coupleBonus; }
        if (t === '闪耀' && ctx.lowkey) { flashy++; score -= ctx.lowkeyPenalty; }
      });
    });
    return { score, matched, clashes, couple, flashy };
  }
  /* Every premium piece may score with its own tags or with the tags of any free piece in
   * its slot. The outfit takes the best joint choice, so swapping a free piece for a 💎 piece
   * can only keep or raise the score (the free piece's tags are always one of the options).
   * Ties keep the piece's own tags. */
  function resolve(items, ctx) {
    const res = items.map((x) => ({ slot: x.slot, item: x.item, tags: x.item.tags, adapted: false }));
    const prem = res.map((r, i) => i).filter((i) => isPremium(res[i].item, ctx));
    if (!prem.length) return res;
    const cands = prem.map((i) => {
      const seen = new Set(), out = [];
      [res[i].item].concat(D.ITEMS[res[i].slot].filter((it) => !isPremium(it, ctx))).forEach((c) => {
        const key = c.tags.slice().sort().join('|');
        if (!seen.has(key)) { seen.add(key); out.push(c); }
      });
      return out;
    });
    const pickIdx = prem.map(() => 0), bestIdx = prem.map(() => 0);
    let best = -Infinity, bestOwn = -1;
    const walk = (d) => {
      if (d === prem.length) {
        const trial = res.map((r) => ({ item: r.item, tags: r.tags }));
        prem.forEach((i, k) => { trial[i].tags = cands[k][pickIdx[k]].tags; });
        const sc = scoreTags(trial, ctx).score, own = pickIdx.filter((v) => v === 0).length;
        if (sc > best || (sc === best && own > bestOwn)) { best = sc; bestOwn = own; pickIdx.forEach((v, k) => { bestIdx[k] = v; }); }
        return;
      }
      for (let c = 0; c < cands[d].length; c++) { pickIdx[d] = c; walk(d + 1); }
    };
    walk(0);
    prem.forEach((i, k) => {
      const c = cands[k][bestIdx[k]];
      res[i].tags = c.tags; res[i].adapted = bestIdx[k] !== 0; res[i].from = c;
    });
    return res;
  }
  /* items: [{slot, item}] (locked try-ons already replaced by the caller) */
  function evaluate(items, ctx) {
    const res = resolve(items, ctx);
    return Object.assign(scoreTags(res, ctx), { resolved: res });
  }
  /* what a premium card would score with if equipped into this outfit */
  function effective(slot, it, outfitItems, ctx) {
    if (!isPremium(it, ctx)) return { tags: it.tags, adapted: false };
    const items = outfitItems.map((x) => (x.slot === slot ? { slot, item: it } : x));
    const r = resolve(items, ctx).find((x) => x.slot === slot);
    return { tags: r.tags, adapted: r.adapted, from: r.from };
  }

  /* best outfit from free pieces only, by brute force (6^5 combos) */
  function bestOutfit(ctx, allowPremium) {
    const pools = KEYS.map((k) => D.ITEMS[k].filter((it) => allowPremium || !isPremium(it, ctx)));
    let best = -Infinity, pick = null;
    const cur = [];
    const walk = (d) => {
      if (d === KEYS.length) {
        const s = evaluate(cur.map((item, i) => ({ slot: KEYS[i], item })), ctx).score;
        if (s > best) { best = s; pick = cur.map((it) => it.id); }
        return;
      }
      pools[d].forEach((it) => { cur[d] = it; walk(d + 1); });
    };
    walk(0);
    return { score: best, ids: pick };
  }
  /* star lines from the free optimum; ★★★ capped at 100% so it is always reachable for free */
  function thresholds(best, passPct, star3Pct) {
    const b = Math.max(1, best), pass = passPct / 100, top = Math.min(1, Math.max(star3Pct / 100, pass + 0.05));
    return [Math.ceil(b * pass * 0.5), Math.ceil(b * pass), Math.ceil(b * top)];
  }

  window.Ch3Score = { KEYS, REPEAT, isPremium, soloScore, bestFreeInSlot, scoreTags, resolve, effective, evaluate, bestOutfit, thresholds };
})();
