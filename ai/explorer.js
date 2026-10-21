(() => {
  const rail = document.querySelector('.explorer-rail');
  if (!rail) return;
  const cards = [...rail.querySelectorAll('.explorer-card')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const previous = document.querySelector('.explorer-prev');
  const next = document.querySelector('.explorer-next');
  const open = document.querySelector('.explorer-open');
  let selected = 0, scheduled = false, drag = null, suppressClick = false;
  let requested = null, navigationTimer = 0;
  let snapTimer = 0, pointerHeld = false, navigating = false, initialized = false;
  const info = [...document.querySelectorAll('#explorer-title, #explorer-description, .explorer-count')];
  const infoAnimations = new Map();
  const departureAnimations = [];
  const settle = () => {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (pointerHeld || drag || navigating) return;
      requested = null;
      const target = cards[selected].offsetLeft - (rail.clientWidth - cards[selected].offsetWidth) / 2;
      if (Math.abs(rail.scrollLeft - target) > 1) choose(selected);
    }, 220);
  };
  rail.addEventListener('pointerdown', () => { pointerHeld = true; requested = null; suppressClick = false; clearTimeout(snapTimer); });
  window.addEventListener('pointerup', () => { if (pointerHeld) { pointerHeld = false; settle(); } });
  window.addEventListener('pointercancel', () => { pointerHeld = false; settle(); });
  cards.forEach((card, index) => {
    const art = card.querySelector('.explorer-art');
    const label = document.createElement('span');
    label.className = 'archive-title'; label.textContent = card.dataset.title;
    const footer = document.createElement('span');
    footer.className = 'archive-imprint'; footer.textContent = 'SUZY / FIELD NOTES — 2026 — NO. 0' + (index + 1);
    label.setAttribute('aria-hidden', 'true');
    footer.setAttribute('aria-hidden', 'true');
    art.append(label, footer);
    const ring = document.createElement('span'); ring.className = 'archive-edge'; ring.setAttribute('aria-hidden','true');
    card.prepend(ring);
  });
  const positionArchive = () => {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    cards.forEach(card => {
      const distance = (card.offsetLeft + card.offsetWidth / 2 - center) / (card.offsetWidth + (parseFloat(getComputedStyle(rail).columnGap) || 0));
      const bounded = Math.max(-3, Math.min(3, distance));
      card.style.setProperty('--archive-distance', bounded.toFixed(4));
      card.style.setProperty('--archive-depth', Math.min(1.8, Math.abs(bounded)).toFixed(4));
      card.style.zIndex = String(20 - Math.round(Math.abs(bounded) * 5));
    });
  };
  const render = (index) => {
    const changed = initialized && selected !== index;
    selected = index;
    initialized = true;
    cards.forEach((card, i) => {
      card.classList.toggle('is-selected', index === i);
      if (index === i) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
    const card = cards[index];
    document.getElementById('explorer-title').textContent = card.dataset.title;
    document.querySelector('#explorer-description [lang="en"]').textContent = card.dataset.descriptionEn;
    document.querySelector('#explorer-description [lang="zh"]').textContent = card.dataset.descriptionZh;
    document.querySelector('.explorer-count').textContent = `0${index + 1} / 0${cards.length}`;
    open.href = card.dataset.destination;
    if (card.dataset.destination.startsWith('https:')) { open.target = '_blank'; open.rel = 'noopener'; }
    else { open.removeAttribute('target'); open.removeAttribute('rel'); }
    previous.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    if (changed && !reduced.matches && typeof rail.animate === 'function') info.forEach(element => {
      infoAnimations.get(element)?.cancel();
      infoAnimations.set(element, element.animate([{ opacity: .25, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' }));
    });
  };
  const choose = (index) => {
    index = Math.max(0, Math.min(cards.length - 1, index));
    requested = index;
    const card = cards[index];
    rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: reduced.matches ? 'instant' : 'smooth' });
    if (reduced.matches) sync();
  };
  const sync = () => {
    scheduled = false;
    positionArchive();
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0, distance = Infinity;
    cards.forEach((card, i) => {
      const delta = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (delta < distance) { distance = delta; best = i; }
    });
    render(best);
  };
  rail.addEventListener('scroll', () => {
    settle();
    if (!scheduled) { scheduled = true; requestAnimationFrame(sync); }
  }, { passive: true });
  rail.addEventListener('wheel', (event) => {
    if (navigating) { event.preventDefault(); return; }
    requested = null;
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rail.clientWidth : 1);
    const available = delta > 0 ? rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 2 : rail.scrollLeft > 2;
    if (!available) return;
    event.preventDefault();
    rail.scrollLeft += delta;
  }, { passive: false });
  // Mouse drag supplements native touch scrolling. Only capture after crossing the drag threshold.
  rail.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    suppressClick = false;
    drag = { x: event.clientX, left: rail.scrollLeft, id: event.pointerId };
  });
  rail.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 6) {
      suppressClick = true;
      rail.classList.add('is-dragging');
      if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
      rail.scrollLeft = drag.left - delta;
    }
  });
  const endDrag = () => { drag = null; rail.classList.remove('is-dragging'); settle(); };
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('lostpointercapture', endDrag);
  rail.addEventListener('pointerleave', () => { if (!rail.classList.contains('is-dragging')) endDrag(); });
  rail.addEventListener('click', (event) => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); suppressClick = false; return; }
    const card = event.target.closest('.explorer-card');
    if (!card || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || card.target === '_blank' || reduced.matches || typeof card.animate !== 'function') return;
    if (navigating) { event.preventDefault(); return; }
    event.preventDefault();
    navigating = true;
    clearTimeout(snapTimer);
    const href = card.href;
    const transform = getComputedStyle(card).transform;
    const matrix = transform === 'none' ? '' : transform;
    card.style.zIndex = '100';
    rail.classList.add('is-departing');
    departureAnimations.push(card.animate([{ transform: matrix, opacity: 1 }, { transform: matrix + ' scale(1.16)', opacity: .1 }], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }));
    cards.filter(item => item !== card).forEach(item => departureAnimations.push(item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })));
    // Navigation is bounded even if animation completion is interrupted.
    navigationTimer = setTimeout(() => location.assign(href), 390);
  });
  const resetNavigation = () => {
    clearTimeout(navigationTimer);
    clearTimeout(snapTimer);
    navigating = false;
    pointerHeld = false;
    drag = null;
    requested = null;
    suppressClick = false;
    rail.classList.remove('is-dragging');
    rail.classList.remove('is-departing');
    departureAnimations.splice(0).forEach(animation => animation.cancel());
  };
  window.addEventListener('pagehide', resetNavigation);
  window.addEventListener('pageshow', () => { resetNavigation(); sync(); });
  reduced.addEventListener('change', () => {
    infoAnimations.forEach(animation => animation.cancel());
  });
  rail.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : Math.max(0, Math.min(cards.length - 1, (requested ?? selected) + (event.key === 'ArrowRight' ? 1 : -1)));
    cards[index].focus({ preventScroll: true });
    choose(index);
  });
  previous.addEventListener('click', () => choose((requested ?? selected) - 1));
  next.addEventListener('click', () => choose((requested ?? selected) + 1));
  addEventListener('resize', () => { rail.scrollLeft = cards[selected].offsetLeft - (rail.clientWidth - cards[selected].offsetWidth) / 2; positionArchive(); });
  render(1);
  rail.scrollLeft = cards[1].offsetLeft - (rail.clientWidth - cards[1].offsetWidth) / 2;
})();


