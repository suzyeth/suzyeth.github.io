(() => {
  const chapter = document.querySelector('.reveal-chapter');
  if (!chapter) return;
  const stage = chapter.querySelector('.reveal-stage');
  const edge = chapter.querySelector('.reveal-paper path');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const links = [...chapter.querySelectorAll('.reveal-chapter-links a')];
  let frame = 0, last = 0, progress = 0;
  let x = 720, targetX = 720, amount = 0, targetAmount = 0;
  const baseline = [790, 790, 740, 721, 683, 708, 656, 664, 603, 639, 654, 694, 686, 731, 717, 747, 735];
  const drawEdge = () => {

    const points = baseline.map((y, index) => {
      const px = index * 90;
      const distance = (px - x) / 160;
      return { x: px, y: y - amount * 85 * Math.exp(-distance * distance / 2) };
    });
    let path = `M0 0H1440V${points[16].y.toFixed(2)}`;
    for (let i = 16; i > 0; i--) {
      const a = points[Math.min(16, i + 1)], b = points[i], c = points[i - 1], d = points[Math.max(0, i - 2)];
      path += `C${(b.x + (c.x - a.x) / 6).toFixed(2)} ${(b.y + (c.y - a.y) / 6).toFixed(2)} ${(c.x - (d.x - b.x) / 6).toFixed(2)} ${(c.y - (d.y - b.y) / 6).toFixed(2)} ${c.x} ${c.y.toFixed(2)}`;
    }
    edge.setAttribute('d', path + 'Z');
  };
  const update = (time = 0) => {
    frame = 0;
    const rect = chapter.getBoundingClientRect();
    progress = reduced.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .3 - rect.top) / (Math.max(innerHeight * .35, chapter.offsetHeight - stage.offsetHeight) + innerHeight * .2)));
    chapter.style.setProperty('--reveal-progress', progress.toFixed(4));
    const hidden = !reduced.matches && progress > .8;
    chapter.classList.toggle('is-revealed', hidden);
    links.forEach(link => { link.tabIndex = hidden ? -1 : 0; });
    if (reduced.matches || !fine.matches || document.hidden || rect.bottom < 0 || rect.top > innerHeight || progress > .9) {
      amount = targetAmount = 0; last = 0; drawEdge(); return;
    }
    const easing = 1 - Math.exp(-Math.min(last ? time - last : 16, 50) / 115);
    last = time;
    x += (targetX - x) * easing;
    amount += (targetAmount - amount) * easing;
    const settled = Math.abs(x - targetX) < .1 && Math.abs(amount - targetAmount) < .001;
    if (settled) { x = targetX; amount = targetAmount; last = 0; }
    drawEdge();
    if (!settled) frame = requestAnimationFrame(update);
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reduced.matches || !fine.matches) return;
    const rect = stage.getBoundingClientRect();
    targetX = Math.max(0, Math.min(1440, (event.clientX - rect.left) / rect.width * 1440));
    targetAmount = event.target.closest('a,button') ? 0 : .65 + .35 * (1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)));
    request();
  });
  const reset = () => { targetAmount = 0; request(); };
  stage.addEventListener('pointerleave', reset);
  stage.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  reduced.addEventListener('change', reset);
  fine.addEventListener('change', reset);
  update();
})();

