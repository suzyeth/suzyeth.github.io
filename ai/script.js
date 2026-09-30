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
  apply(localStorage.getItem(KEY) || 'en');
  button?.addEventListener('click', () => {
    const next = document.body.classList.contains('zh') ? 'en' : 'zh';
    localStorage.setItem(KEY, next);
    apply(next);
  });
})();

(function () {
  const items = document.querySelectorAll('[data-reveal]');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
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
  buttons.forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    buttons.forEach((item) => item.classList.toggle('is-active', item === button));
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

(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let frame = 0;
  let points = [];
  const pointer = { x: -1000, y: -1000 };

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.max(22, Math.floor(width / 42));
    points = Array.from({ length: count }, (_, index) => ({
      x: width * (.48 + Math.random() * .5),
      y: height * (.08 + Math.random() * .82),
      vx: (Math.random() - .5) * .16,
      vy: (Math.random() - .5) * .16,
      hot: index % 7 === 0
    }));
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    points.forEach((point) => {
      point.x += point.vx;
      point.y += point.vy;
      if (point.x < width * .42 || point.x > width) point.vx *= -1;
      if (point.y < 0 || point.y > height) point.vy *= -1;
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 150 && distance > 0) {
        point.x -= dx * .0015;
        point.y -= dy * .0015;
      }
    });
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        if (distance > 155) continue;
        context.strokeStyle = `rgba(17,21,18,${(1 - distance / 155) * .2})`;
        context.beginPath();
        context.moveTo(points[i].x, points[i].y);
        context.lineTo(points[j].x, points[j].y);
        context.stroke();
      }
    }
    points.forEach((point) => {
      context.fillStyle = point.hot ? '#ff6b4a' : '#111512';
      context.beginPath();
      context.arc(point.x, point.y, point.hot ? 3.2 : 1.7, 0, Math.PI * 2);
      context.fill();
    });
    frame = requestAnimationFrame(draw);
  };

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerleave', () => { pointer.x = -1000; pointer.y = -1000; });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else draw();
  });
  resize();
  draw();
})();
