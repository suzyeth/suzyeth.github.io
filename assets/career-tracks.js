/* Animate only when entering the viewport; content stays available without JS. */
(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (!isIntersecting) return;
      target.animate([
        {opacity: .35, transform: 'translateY(16px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)'});
      observer.unobserve(target);
    });
  }, {threshold: .08});
  document.querySelectorAll('.track-hero, .pro-card, .reading-note').forEach(el => observer.observe(el));
})();

/* A compact native directory on small screens; all links remain available. */
(() => {
 const directory = document.querySelector('.project-directory');
 if (!directory) return;
 const mobile = matchMedia('(max-width: 760px)');
 const sync = () => { directory.open = !mobile.matches; };
 sync();
 mobile.addEventListener('change', sync);
})();
