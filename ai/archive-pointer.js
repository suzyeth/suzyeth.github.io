// Pointer response is additive to the scroll trajectory and sleeps when settled.
(() => {
  const stage = document.querySelector('.archive-mode');
  if (!stage) return;
  const rail = stage.querySelector('.explorer-rail');
  const cards = [...stage.querySelectorAll('.explorer-card')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, last = 0, visible = true;
  const enabled = () => !reduced.matches && fine.matches && visible && !document.hidden;
  const paint = () => cards.forEach(card => {
    const depth = Number(card.style.getPropertyValue('--archive-depth')) || 0;
    const weight = 1 / (1 + depth * 1.7);
    card.style.setProperty('--pointer-yaw', `${(x * 8 * weight).toFixed(3)}deg`);
    card.style.setProperty('--pointer-pitch', `${(-y * 5 * weight).toFixed(3)}deg`);
    card.style.setProperty('--pointer-lift', `${(-y * 5 * weight).toFixed(3)}px`);
    card.style.setProperty('--light-x', `${(50 + x * 20 * weight).toFixed(2)}%`);
    card.style.setProperty('--light-y', `${(35 + y * 20 * weight).toFixed(2)}%`);
  });
  const tick = time => {
    frame = 0;
    if (!enabled()) { x = y = targetX = targetY = last = 0; paint(); return; }
    const amount = 1 - Math.exp(-Math.min(last ? time - last : 16, 50) / 105);
    last = time;
    x += (targetX - x) * amount;
    y += (targetY - y) * amount;
    const settled = Math.abs(x - targetX) + Math.abs(y - targetY) < .001;
    if (settled) { x = targetX; y = targetY; }
    paint();
    if (!settled && enabled()) frame = requestAnimationFrame(tick);
    else last = 0;
  };
  const request = () => { if (!frame && enabled()) frame = requestAnimationFrame(tick); };
  const reset = (immediate = false) => {
    targetX = targetY = 0;
    if (immediate || !enabled()) {
      cancelAnimationFrame(frame); frame = last = 0; x = y = 0; paint();
    } else request();
  };
  stage.addEventListener('pointermove', event => {
    if (!enabled() || event.pointerType !== 'mouse') return;
    if (event.buttons || rail.classList.contains('is-dragging')) { reset(); return; }
    const rect = stage.getBoundingClientRect();
    targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    request();
  });
  stage.addEventListener('pointerleave', () => reset());
  stage.addEventListener('pointerdown', () => reset());
  stage.addEventListener('pointercancel', () => reset());
  rail.addEventListener('scroll', request, { passive: true });
  window.addEventListener('blur', () => reset(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(true); });
  reduced.addEventListener('change', () => reset(true));
  fine.addEventListener('change', () => reset(true));
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) reset(true);
  }).observe(stage);
})();
