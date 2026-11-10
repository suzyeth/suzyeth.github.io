/* Real hover previews. Only the currently hovered cover may play. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = new URL('../', document.currentScript.src);
  const controllers = new Map();
  const enabled = () => fine.matches && !reduced.matches && !document.hidden;
  let apiPromise, sequence = 0;
  const youtubeAPI = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (typeof previous === 'function') previous(); resolve(window.YT); };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
      script.onerror = () => { apiPromise = null; reject(new Error('Preview API unavailable')); };
      document.head.append(script);
    });
    return apiPromise;
  };
  const candidates = document.querySelectorAll('.feature-tile, .project-visual, a.card-media, .explorer-card, .lab-cover, .project-media[data-preview-video], .project-media[data-preview-youtube]');
  candidates.forEach(hotspot => {
    const local = hotspot.dataset.previewVideo;
    const youtube = hotspot.dataset.previewYoutube;
    if (!local && !/^[A-Za-z0-9_-]{11}$/.test(youtube || '')) return;
    let surface;
    if (hotspot.matches('.feature-tile')) surface = hotspot.querySelector('.feature-image');
    else if (hotspot.matches('.explorer-card')) { surface = hotspot.querySelector('.explorer-art'); hotspot.classList.add('motion-archive'); }
    else if (hotspot.matches('.card-media, .lab-cover')) surface = hotspot;
    else if (hotspot.matches('.project-media')) {
      const image = hotspot.querySelector('img');
      if (image) { surface = document.createElement('div'); surface.className = 'video-preview-stage'; image.before(surface); surface.append(image); }
    } else surface = hotspot.querySelector('.pro-fig > a');
    if (!surface || surface.querySelector('canvas, iframe')) return;
    const media = surface.querySelector('img, video');
    hotspot.classList.add('has-video-preview'); surface.classList.add('video-preview-surface');
    if (media) media.classList.add('preview-cover');
    if (media?.matches('video')) {
      media.pause(); media.removeAttribute('autoplay');
      if (!media.poster) media.preload = 'auto'; // Paint a still first frame when no poster was supplied.
    }
    const cue = document.createElement('span'); cue.className = 'hover-preview-cue'; cue.setAttribute('aria-hidden','true');
    cue.innerHTML = '<span lang="en">▶ Hover to preview</span><span lang="zh">▶ 悬停预览</span>';
    const loading = document.createElement('span'); loading.className = 'hover-preview-status'; loading.setAttribute('aria-hidden','true');
    loading.innerHTML = '<span lang="en">Loading preview…</span><span lang="zh">正在加载预览…</span>';
    surface.append(cue, loading);
    let active = false, token = 0, video = null, wrapper = null, player = null;
    hotspot.dataset.previewState = 'idle';
    const reset = () => {
      active = false; token++;
      hotspot.classList.remove('is-preview-loading','is-preview-playing'); hotspot.dataset.previewState = 'idle';
      if (video) { video.pause(); if (video.readyState) { try { video.currentTime = 0; } catch (_) {} } }
      if (player) { try { player.destroy(); } catch (_) {} player = null; }
      if (wrapper) { wrapper.remove(); wrapper = null; } // Unload even a still-buffering YouTube iframe.
    };
    const valid = expected => active && enabled() && expected === token;
    const playing = () => {
      hotspot.classList.remove('is-preview-loading'); hotspot.classList.add('is-preview-playing');
      hotspot.dataset.previewState = 'playing';
    };
    const fail = expected => {
      if (!valid(expected)) return;
      reset(); hotspot.dataset.previewState = 'unavailable';
    };
    const start = () => {
      if (!enabled() || active) return;
      controllers.forEach((stop, other) => { if (other !== hotspot) stop(); });
      active = true; const expected = ++token;
      hotspot.classList.add('is-preview-loading'); hotspot.dataset.previewState = 'loading';
      if (local) {
        if (!video) {
          video = document.createElement('video'); video.className = 'motion-preview';
          video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
          video.setAttribute('muted',''); video.setAttribute('playsinline',''); video.setAttribute('aria-hidden','true'); video.tabIndex = -1;
          video.addEventListener('playing', () => { if (active && enabled()) playing(); else video.pause(); });
          video.addEventListener('error', () => fail(token));
          video.src = new URL(local, root).href; surface.append(video);
        }
        video.play().catch(() => fail(expected));
        return;
      }
      wrapper = document.createElement('div'); wrapper.className = 'motion-preview youtube-hover-preview'; wrapper.setAttribute('aria-hidden','true');
      const iframe = document.createElement('iframe'); iframe.id = `cover-preview-${++sequence}`;
      const params = new URLSearchParams({enablejsapi:'1',autoplay:'0',mute:'1',controls:'0',playsinline:'1',loop:'1',playlist:youtube,rel:'0',fs:'0',disablekb:'1',origin:location.origin});
      iframe.src = `https://www.youtube-nocookie.com/embed/${youtube}?${params}`;
      iframe.title = 'Muted cover preview / 静音封面预览'; iframe.tabIndex = -1;
      iframe.allow = 'autoplay; encrypted-media'; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      wrapper.append(iframe); surface.append(wrapper);
      youtubeAPI().then(YT => {
        if (!valid(expected) || !iframe.isConnected) return;
        player = new YT.Player(iframe.id, {events:{
          onReady: event => { if (!valid(expected)) { event.target.destroy(); return; } event.target.mute(); event.target.playVideo(); },
          onStateChange: event => { if (valid(expected) && event.data === YT.PlayerState.PLAYING) playing(); },
          onError: () => fail(expected),
          onAutoplayBlocked: () => fail(expected)
        }});
      }).catch(() => fail(expected));
    };
    hotspot.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && !event.buttons) start(); });
    hotspot.addEventListener('pointermove', event => { if (event.pointerType === 'mouse' && !event.buttons) start(); });
    hotspot.addEventListener('pointerleave', reset);
    hotspot.addEventListener('pointerdown', event => { if (event.button === 0) reset(); });
    hotspot.addEventListener('pointercancel', reset);
    controllers.set(hotspot, reset);
  });
  const stopAll = () => controllers.forEach(stop => stop());
  fine.addEventListener('change', stopAll); reduced.addEventListener('change', stopAll);
  window.addEventListener('blur', stopAll); window.addEventListener('pagehide', stopAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) controllers.get(entry.target)?.(); }));
    controllers.forEach((_, hotspot) => observer.observe(hotspot));
  }
})();
