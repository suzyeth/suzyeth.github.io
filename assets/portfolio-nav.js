/* One language preference across every persistent portfolio selector. */
(() => {
  const header = document.querySelector('.portfolio-header');
  if (!header) return;
  const language = header.querySelector('#langToggle');
  const applyLanguage = value => {
    const zh = value === 'zh';
    document.body.classList.toggle('zh', zh);
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    language.setAttribute('aria-pressed', String(zh));
    language.setAttribute('aria-label', zh ? '切换到英文' : 'Switch to Chinese');
    document.querySelectorAll('[data-alt-en]').forEach(image => {
      image.alt = image.dataset[zh ? 'altZh' : 'altEn'] || image.dataset.altEn;
    });
  };
  let saved = 'en';
  try { saved = localStorage.getItem('lang') || localStorage.getItem('suzy-ai-lang') || 'en'; } catch (_) {}
  applyLanguage(saved);
  language.addEventListener('click', () => {
    const next = document.body.classList.contains('zh') ? 'en' : 'zh';
    try { localStorage.setItem('lang', next); localStorage.setItem('suzy-ai-lang', next); } catch (_) {}
    applyLanguage(next);
  });
  window.addEventListener('storage', event => { if (event.key === 'lang') applyLanguage(event.newValue || 'en'); });
})();
