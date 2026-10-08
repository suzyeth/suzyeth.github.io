/* Scroll choreography, authored for Suzy / AI Lab. Native scrolling is the fallback. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 981px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const scene = document.querySelector('.hero-scene');
  const hero = document.querySelector('.hero');
  const headings = [...document.querySelectorAll('.motion-heading > [lang]')];
  const media = [...document.querySelectorAll('.project-media')];
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let lenis, frame, dirty = true;

  // Keep the original language span as the accessible text; decoration is hidden from AT.
  headings.forEach((heading) => {
    const text = heading.innerText || heading.textContent;
    const accessible = document.createElement('span');
    accessible.className = 'visually-hidden';
    accessible.textContent = text.replace(/\s+/g, ' ').trim();
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const tokens = heading.lang === 'zh' ? Array.from(node.textContent) : node.textContent.split(/(\s+)/);
      tokens.forEach((token) => {
        if (/^\s+$/.test(token)) { fragment.append(token); return; }
        const word = document.createElement('span');
        word.className = 'motion-word';
        word.setAttribute('aria-hidden', 'true');
        word.textContent = token;
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
    heading.append(accessible);
  });
  const words = new Map(headings.map((heading) => [heading, [...heading.querySelectorAll('.motion-word')]]));

  const update = () => {
    const height = innerHeight;
    const scroll = scrollY;
    const distance = Math.max(1, scene.offsetHeight - hero.offsetHeight);
    const progress = !reduced.matches && desktop.matches ? clamp((scroll - scene.offsetTop) / distance) : 0;
    hero.style.setProperty('--scene-progress', progress.toFixed(4));
    headings.forEach((heading) => {
      if (!heading.getClientRects().length) return;
      const rect = heading.getBoundingClientRect();
      const progress = reduced.matches ? 1 : clamp((height * .94 - rect.top) / (height * .53));
      const list = words.get(heading);
      list.forEach((word, index) => {
        const amount = clamp(progress * 1.65 - index / Math.max(1, list.length) * .65);
        word.style.setProperty('--word-progress', amount.toFixed(3));
      });
    });
    media.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const amount = reduced.matches || !desktop.matches ? 0 : Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - height / 2) / height));
      item.style.setProperty('--media-turn', `${amount * (index % 2 ? -5 : 5)}deg`);
      item.style.setProperty('--media-rise', `${amount * 24}px`);
    });
    document.documentElement.style.setProperty('--page-progress', clamp(scroll / Math.max(1, document.documentElement.scrollHeight - height)));
    dirty = false;
  };

  const tick = (time) => {
    frame = 0;
    lenis?.raf(time);
    if (dirty) update();
    if (!document.hidden && lenis) frame = requestAnimationFrame(tick);
  };
  const invalidate = () => {
    dirty = true;
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const configure = () => {
    lenis?.destroy();
    lenis = undefined;
    // Touch devices keep their native momentum and keyboard/anchor scrolling stays native.
    if (!reduced.matches && finePointer.matches && typeof window.Lenis === 'function') {
      lenis = new window.Lenis({ lerp: .095, smoothWheel: true, syncTouch: false });
    }
    document.documentElement.classList.toggle('motion-enabled', !reduced.matches);
    media.forEach((item) => { item.style.setProperty('--tilt-x', '0deg'); item.style.setProperty('--tilt-y', '0deg'); });
    update();
    invalidate();
  };
  media.forEach((item) => {
    item.addEventListener('pointermove', (event) => {
      if (reduced.matches || !finePointer.matches || event.pointerType === 'touch') return;
      const rect = item.getBoundingClientRect();
      item.style.setProperty('--tilt-x', `${(event.clientY - rect.top - rect.height / 2) / rect.height * -5}deg`);
      item.style.setProperty('--tilt-y', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 7}deg`);
    });
    item.addEventListener('pointerleave', () => {
      item.style.setProperty('--tilt-x', '0deg');
      item.style.setProperty('--tilt-y', '0deg');
    });
  });
  addEventListener('scroll', invalidate, { passive: true });
  addEventListener('resize', invalidate);
  new ResizeObserver(() => { invalidate(); lenis?.resize(); }).observe(document.body);
  document.getElementById('langToggle')?.addEventListener('click', invalidate);
  [reduced, desktop, finePointer].forEach((query) => query.addEventListener('change', configure));
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden) invalidate();
  });
  configure();
})();
