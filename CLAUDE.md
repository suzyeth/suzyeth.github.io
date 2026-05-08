# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page bilingual (English / 简体中文) portfolio site for game designer Ziwei Su. Plain HTML + CSS — no build step, no package manager, no framework, no JS bundler. Open `index.html` in a browser or serve the directory with any static server.

There is no `package.json`, no test runner, no linter. Editing files is the entire workflow; the only "build" is uploading the directory.

The site was redesigned 2026-05-08 — see `docs/2026-05-08-portfolio-redesign-design.md` (spec) and `docs/2026-05-08-portfolio-redesign-plan.md` (implementation plan).

## Architecture

### Bilingual rendering pattern

EN and ZH content coexist in the DOM and one is hidden via CSS. Both versions of every translatable string sit side-by-side as sibling `<span lang="en">` / `<span lang="zh">` elements. The toggle works by adding/removing `class="zh"` on `<body>`:

```css
[lang="zh"]{display:none}            /* default: hide ZH */
body.zh [lang="zh"]{display:revert}  /* when toggled: show ZH, hide EN */
body.zh [lang="en"]{display:none}
```

A defensive inline `<script>` IIFE near the bottom of `index.html` reads `localStorage.lang` on load and binds the `#langToggle` button. It runs first and works even if other scripts (GSAP, Lenis, ScrollTrigger) fail to load.

**Implication for edits:** any new user-facing string must be added in BOTH languages with the matching `lang` attribute, or it will appear in only one mode. Don't add a single bare `<span>Foo</span>` — it will show up in EN mode but vanish in ZH mode (or vice versa) depending on its parent.

### File layout and purpose

- `index.html` — the production page. Bilingual via `body.zh` toggle, persisted in `localStorage`. Inline `<script>` blocks at the bottom handle: language toggle (always works), card expand, scroll reveals, and optional Lenis smooth scroll.
- `style.css` — single stylesheet. Dark warm-black theme via CSS custom properties on `:root`. Mobile breakpoint at `640px` (tablet at `760px`, secondary at `800px` and `900px`).
- `assets/` — production media. **All assets are personal-project sourced — no company assets are permitted here per NDA.**
  - `ma-opening.mp4` (hero video, ~11 MB; disabled on `<= 640px`)
  - `ma-ending.mp4` (MA project card)
  - `moodrift-cover.png` (Moodrift project card)
  - `hero-poster.jpg` (video poster + reduced-motion fallback)
- `img/` — legacy empty image directory; safe to delete.
- `variants/` — design history; not linked from `index.html`.
  - `variant-{A,B,C,D,final}.html` — pre-2026-05-08 design explorations.
  - `v2-cinematic.html`, `v3-gamevibe.html` — direction mockups from the 2026-05-08 brainstorm.
- `docs/` — design + plan docs from the 2026-05-08 redesign. Read first when revisiting this codebase.
- `index.html.backup` — pre-redesign snapshot. Safe to delete once new page is locked in.
- `.gstack/` — tooling artifacts; do not treat as source.
- `._*` files — macOS AppleDouble metadata sidecars; ignore.

### Page structure (top to bottom)

1. `header.hud` — fixed top nav: brand `SUSU / PORTFOLIO` left; Work / About / Contact + lang toggle right. `mix-blend-mode: difference` so it adapts to the section behind it.
2. `section.hero` — full-viewport video background (`assets/ma-opening.mp4`) + giant Fraunces name + role line + scroll hint. Letterbox bars top/bottom.
3. `section.creds` — single mono-uppercase line of NDA-safe credibility data ("London-based · 19 months in F2P mobile · 1 shipped title · 6 personal projects · MA UAL").
4. `section.about` — cream-background pause: avatar + "Hi 👋 — I'm *Ziwei.*" + two intro paragraphs + Education + Languages.
5. `section.work` — six expandable project cards. tarduck is featured (full-width). Click "More details →" expands a 4-column detail panel (Role · Scope · Scale · Stack); ESC closes; only one open at a time.
6. `section.skills` — three-column transparent skill split: Game Design / Programming / Tools.
7. `section.contact` — big italic mailto `suzysu418@gmail.com` + LinkedIn + GitHub.
8. `footer.foot` — copyright + last-updated date.

### NDA / confidentiality rule (hard)

The portfolio shows **only personal-project work**. Do not add screenshots, design diagrams, or any other visual asset from Venus / Luminary / RippleSoft work, or anything else under NDA. Do not name those employers anywhere on the page. The credibility strip uses vague phrasing ("F2P mobile") on purpose.

### Removed legacy references

The previous production file linked to `case-ripplesoft.html`, `case-luminarytech.html`, and `resume.pdf`. These were never authored. The redesigned page does **not** reference them — the contact pattern is "Email for CV" via `mailto:`. Do not reintroduce these links.

## Conventions specific to this repo

- All translatable copy must be paired EN + ZH with `lang` attributes — see Bilingual rendering pattern above.
- Email `suzysu418@gmail.com`, GitHub `suzyeth` — keep in sync across mailto, contact section, and footer if changed.
- Color tokens live in `:root` in `style.css`. Adjust `--accent` (currently salmon `#e8623a`) there to retheme the page in one edit.
- Hero video is heavy (11 MB). Add a `.webm` alternative or compress further if hosting bandwidth becomes a concern.
