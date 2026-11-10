"""Synchronise static portfolio headers. Run from any directory; no build needed."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = '20261026-islands-nav-3'
ROUTES = [
    ('games', 'index.html', 'Game design', '游戏设计'),
    ('creative', 'ai/', 'Creative technology', '创意技术'),
    ('engineering', 'ai-engineering.html', 'AI engineering', 'AI 工程'),
    ('data', 'data.html', 'Data analysis', '数据分析'),
    ('tools', 'tools.html', 'Tools & technology', '工具与技术'),
]
PAGES = {
    'index.html': ('games', [('about', 'About', '关于我'), ('work', 'Projects', '作品'), ('contact', 'Contact', '联系')]),
    'ai/index.html': ('creative', [('about', 'About', '关于我'), ('work', 'Projects', '作品'), ('principles', 'Method', '方法'), ('contact', 'Contact', '联系')]),
    'ai-engineering.html': ('engineering', [('about', 'About', '关于我'), ('projects', 'Projects', '作品'), ('at-work', 'Experience', '工作实践'), ('evidence', 'Evidence', '能力证据'), ('contact', 'Contact', '联系')]),
    'data.html': ('data', [('about', 'About', '关于我'), ('projects', 'Projects', '作品'), ('methods', 'Experience', '工作实践'), ('evidence', 'Evidence', '能力证据'), ('contact', 'Contact', '联系')]),
    'tools.html': ('tools', [('about', 'About', '关于我'), ('projects', 'Projects', '作品'), ('work-tools', 'Experience', '工作实践'), ('contact', 'Contact', '联系')]),
}
for folder, group in [('projects', 'games'), ('ai', 'creative')]:
    for path in sorted((ROOT / folder).glob('*.html')):
        if path.name == 'index.html':
            continue
        PAGES[path.relative_to(ROOT).as_posix()] = (group, None)


def bilingual(en, zh):
    return f'<span lang="en">{en}</span><span lang="zh">{zh}</span>'

SHORT_LABELS = {
    'games': ('Games', '游戏'), 'creative': ('Creative', '创意技术'),
    'engineering': ('AI Eng.', 'AI 工程'), 'data': ('Data', '数据分析'),
    'tools': ('Tools', '工具'),
}


for filename, (group, sections) in PAGES.items():
    path = ROOT / filename
    text = path.read_text(encoding='utf-8')
    prefix = '../' if '/' in filename else ''
    links = []
    for key, destination, en, zh in ROUTES:
        current = f' aria-current="{"page" if sections else "location"}"' if key == group else ''
        short_en, short_zh = SHORT_LABELS[key]
        links.append(f'<a href="{prefix}{destination}"{current} aria-label="{en} / {zh}"><span class="portfolio-route-full">{bilingual(en, zh)}</span><span class="portfolio-route-short">{bilingual(short_en, short_zh)}</span></a>')
    if sections:
        local = ''.join(f'<a href="#{anchor}">{bilingual(en, zh)}</a>' for anchor, en, zh in sections)
    else:
        destination = '../ai/' if group == 'creative' else '../index.html'
        local = f'<a href="{destination}#work">{bilingual("← All projects", "← 全部作品")}</a>'
        local += f'<a href="{destination}#about">{bilingual("About", "关于我")}</a>'
        local += f'<a href="{destination}#contact">{bilingual("Contact", "联系")}</a>'
    header = f'''<header class="portfolio-header">
  <div class="portfolio-topbar">
    <a class="portfolio-brand" href="{prefix}index.html">SUZY SU</a>
    <span class="portfolio-caption">{bilingual("PORTFOLIO / SELECT A DIRECTION", "作品集 / 选择方向")}</span>
    <div class="portfolio-controls">
      <button type="button" class="portfolio-language" id="langToggle" aria-label="Switch to Chinese" aria-pressed="false">EN / 中</button>
    </div>
  </div>
  <nav class="portfolio-global" id="portfolioNavigation" aria-label="Portfolio / 作品集">{''.join(links)}</nav>
</header>'''
    text, count = re.subn(r'<header class="(?:hud|site-header|portfolio-header)"[^>]*>.*?</header>', lambda _: header, text, count=1, flags=re.S)
    assert count == 1, filename
    text = re.sub(r'<nav class="track-nav"[^>]*>.*?</nav>', '', text, flags=re.S)
    text = re.sub(r'<link rel="stylesheet" href="[^"\n]*portfolio-nav\.css[^"\n]*">\s*', '', text)
    text = re.sub(r'<script src="[^"\n]*portfolio-nav\.js[^"\n]*" defer></script>\s*', '', text)
    text = text.replace('</head>', f'<link rel="stylesheet" href="{prefix}assets/portfolio-nav.css?v={VERSION}">\n<script src="{prefix}assets/portfolio-nav.js?v={VERSION}" defer></script>\n</head>')
    text = re.sub(r'<body([^>]*)>', lambda m: m.group(0) if 'portfolio-site' in m.group(0) else (m.group(0).replace('class="', 'class="portfolio-site ', 1) if 'class="' in m.group(0) else f'<body{m.group(1)} class="portfolio-site">'), text, count=1)
    # The shared controller owns language; legacy inline menu code exits without .hud.
    text = re.sub(r"(\(function\s*\(\)\s*\{\s*)(const KEY = 'lang';)", r"\1if (document.querySelector('.portfolio-header')) return;\n  \2", text)
    if filename == 'tools.html':
        text = text.replace('<header class="proj-head">', '<header class="proj-head" id="about">', 1)
    if filename == 'ai/index.html':
        text = re.sub(r'<footer(?![^>]*\bid=)([^>]*)>', r'<footer id="contact"\1>', text, count=1)
    path.write_text(text, encoding='utf-8')
    print(filename)
