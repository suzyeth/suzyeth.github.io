(function () {
  document.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => image.classList.add('is-missing'));
  });
})();

(function () {
  const KEY = 'suzy-ai-lang';
  const button = document.getElementById('langToggle');
  const apply = (lang) => {
    document.body.classList.toggle('zh', lang === 'zh');
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    button?.setAttribute('aria-pressed', String(lang === 'zh'));
  };
  try { apply(localStorage.getItem(KEY) || 'en'); } catch { apply('en'); }
  button?.addEventListener('click', () => {
    const next = document.body.classList.contains('zh') ? 'en' : 'zh';
    try { localStorage.setItem(KEY, next); } catch {}
    apply(next);
  });
})();

(function () {
  const items = document.querySelectorAll('[data-reveal]');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  document.documentElement.classList.add('reveal-ready');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
  items.forEach((item) => observer.observe(item));
})();

(function () {
  const buttons = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.lab-card');
  buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.classList.contains('is-active'))));
  buttons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    buttons.forEach((item) => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    cards.forEach((card) => {
      card.hidden = filter !== 'all' && card.dataset.cat !== filter;
    });
  }));
})();

(function () {
  const videos = document.querySelectorAll('video[data-autoplay]');
  if (!videos.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting ? entry.target.play().catch(() => {}) : entry.target.pause());
  }, { threshold: .3 });
  videos.forEach((video) => observer.observe(video));
})();

