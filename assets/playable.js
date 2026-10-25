(() => {
  const games = {
    cocktail: ['Kitchen Bar',new URL('../play/kitchen/',document.currentScript.src).href],
    idol: ['Project:IDOL','https://suzyeth.github.io/project-idol/en/'],
    tarduck: ['tarduck','https://suzyeth.github.io/escape-from-duckkov/'],
    'sand-garden': ['Robot Karesansui','https://suzyeth.github.io/sand-garden/'],
    metagame: ['MetaGame','https://itch.io/embed-upload/9230855?color=111111','https://ssu997.itch.io/metagame'],
    hypha: ['Hypha','https://itch.io/embed-upload/10272502?color=111111','https://ssu997.itch.io/hypha'],
    ld59: ['Respond to Signal 404','https://itch.io/embed-upload/17491322?color=111111','https://cheng-min.itch.io/respond-to-signal-404'],
    ma: ['Interstellar Adventure','https://itch.io/embed-upload/9254347?color=111111','https://cheng-min.itch.io/interstellar-adventure'],
    gacha: ['Gacha Economy Sim','https://gacha-simulator-ten.vercel.app']
  };
  const pair=(en,zh)=>`<span lang="en">${en}</span><span lang="zh">${zh}</span>`;
  const button=(id)=>`<button type="button" class="play-here" data-play-game="${id}">${id==='ma'?pair('▶ Play Interstellar Adventure','▶ 试玩 Interstellar Adventure'):pair('▶ Play here','▶ 在此试玩')}</button>`;
  document.querySelectorAll('.card:not(.marquee-clone)').forEach(card=>{
    if(games[card.dataset.id]) card.querySelector('.card-text')?.insertAdjacentHTML('beforeend',button(card.dataset.id));
  });
  const page=location.pathname.split('/').pop().replace('.html','');
  // Case-study pages show their game in an inline window instead of a Play button.
  const pageGame={'cocktail-rendering':'cocktail',idol:'idol',tarduck:'tarduck','sand-garden':'sand-garden',metagame:'metagame',hypha:'hypha',ld59:'ld59',ma:'ma',gacha:'gacha'}[page];
  const bare=u=>(u||'').replace(/\/$/,'');
  const gameOf=a=>Object.keys(games).find(id=>bare(a.href)===bare(games[id][1]) || bare(a.href)===bare(games[id][2]));
  if(pageGame) inlineWindow(pageGame);
  document.querySelectorAll('a').forEach(a=>{
    const id=gameOf(a);
    if(id && a.closest('.detail-links')){ a.dataset.playGame=id; a.innerHTML=pair('▶ Play here','▶ 在此试玩'); }
  });
  function inlineWindow(id){
    const [title,src,original]=games[id];
    // The page's own "Play in browser" link is replaced by the window.
    document.querySelectorAll('.proj-links a').forEach(a=>{ if(gameOf(a)===id) a.remove(); });
    document.querySelectorAll('.proj-links').forEach(l=>{ if(!l.children.length) l.remove(); });
    const box=document.createElement('section');
    box.className='play-inline'+(id==='gacha'?' is-tall':''); box.setAttribute('aria-label',title);
    box.innerHTML=`<div class="play-inline-stage"><p class="play-inline-wait">${pair('Loading '+title+'…','正在加载 '+title+'…')}</p></div><div class="play-inline-bar"><span>${pair('Click inside the game to play · keyboard & mouse recommended','点击画面开始游戏 · 建议使用键盘与鼠标')}</span><button type="button" data-inline="restart">${pair('Restart','重新开始')}</button><button type="button" data-inline="fullscreen">${pair('Fullscreen','全屏')}</button><a href="${original||src}" target="_blank" rel="noopener">${pair('New tab ↗','新标签页 ↗')}</a></div>`;
    const anchor=document.querySelector('.proj-pdo')||document.querySelector('.proj-links')||document.querySelector('.proj-meta');
    if(!anchor) return;
    anchor[anchor.classList.contains('proj-meta')?'after':'before'](box);
    const stage=box.querySelector('.play-inline-stage');
    const start=()=>{ const f=document.createElement('iframe'); f.title=title; f.src=src; f.allow='autoplay; fullscreen; gamepad'; f.allowFullscreen=true; stage.replaceChildren(f); };
    // Load when the window scrolls near view, so the page itself stays fast.
    const near=()=>box.getBoundingClientRect().top<innerHeight+300;
    if(near() || !('IntersectionObserver' in window)) start();
    else { const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); start(); } },{rootMargin:'300px'}); io.observe(box); }
    box.addEventListener('click',e=>{
      const act=e.target.closest('[data-inline]')?.dataset.inline;
      if(act==='restart') start();
      if(act==='fullscreen' && stage.requestFullscreen) stage.requestFullscreen().catch(()=>{});
    });
  }
  const dialog=document.createElement('dialog');
  dialog.className='play-dialog'; dialog.setAttribute('aria-labelledby','play-title');
  dialog.innerHTML=`<div class="play-toolbar"><h2 id="play-title"></h2><button type="button" data-action="restart">${pair('Restart','重新开始')}</button><button type="button" data-action="fullscreen">${pair('Fullscreen','全屏')}</button><button type="button" data-action="close" autofocus>${pair('Close ×','关闭 ×')}</button></div><div class="play-stage"></div><div class="play-footer"><p>${pair('Keyboard & mouse recommended. Click inside the game to control it.','建议使用键盘与鼠标。点击游戏画面后即可操作。')}</p><a target="_blank" rel="noopener">${pair('Trouble loading? Open original ↗','加载异常？打开原页面 ↗')}</a></div>`;
  document.body.append(dialog);
  let current, opener, overflow;
  const stage=dialog.querySelector('.play-stage');
  function load(){
    const frame=document.createElement('iframe');
    frame.title=current[0]; frame.src=current[1]; frame.allow='autoplay; fullscreen; gamepad'; frame.allowFullscreen=true;
    stage.replaceChildren(frame);
  }
  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-play-game]'); if(!trigger || !games[trigger.dataset.playGame]) return;
    if(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); current=[...games[trigger.dataset.playGame]];
    opener=trigger; overflow=document.body.style.overflow;
    dialog.querySelector('h2').textContent=current[0];
    dialog.querySelector('.play-footer a').href=current[2]||current[1];
    document.body.style.overflow='hidden'; dialog.showModal(); load();
  });
  dialog.addEventListener('click',async e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='close') dialog.close();
    if(action==='restart') load();
    if(action==='fullscreen') { dialog.classList.toggle('is-expanded'); const expanded=dialog.classList.contains('is-expanded'); e.target.closest('button').innerHTML=expanded?pair('Restore','还原'):pair('Fullscreen','全屏'); }
  });
  dialog.addEventListener('close',()=>{stage.replaceChildren();dialog.classList.remove('is-expanded');dialog.querySelector('[data-action=fullscreen]').innerHTML=pair('Fullscreen','全屏');document.body.style.overflow=overflow||'';opener?.focus();});
})();
