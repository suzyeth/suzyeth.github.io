# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, bilingual (English / 简体中文) portfolio site for game designer Ziwei Su ("Suzy Su" / 苏紫薇). Plain HTML + CSS with a little inline JS — **no build step, no package manager, no framework, no bundler, no test runner, no linter.** Editing files is the entire workflow; "deploying" is uploading the directory (GitHub Pages).

It is no longer a single page: `index.html` is the homepage, and `projects/<id>.html` are per-project case-study pages linked from the Work cards.

**Previewing:** serve the directory with any static server, e.g. `py -3 -m http.server 5173` then open `localhost:5173`. Note: on this machine bare `python` is Python 2.7 (no `http.server`), so use `py -3` / `python3`. `.claude/launch.json` is wired for the preview tool with the same command.

Redesign history lives in `docs/2026-05-08-portfolio-redesign-*.md` (read first when revisiting).

## Architecture

### Bilingual rendering pattern

EN and ZH strings coexist in the DOM as sibling `<span lang="en">` / `<span lang="zh">` (or paired block elements); CSS hides one. The toggle flips `class="zh"` on `<body>`:

```css
[lang="zh"]{display:none}            /* default: hide ZH */
body.zh [lang="zh"]{display:revert}  /* toggled: show ZH, hide EN */
body.zh [lang="en"]{display:none}
```

A defensive inline `<script>` IIFE at the bottom of **each** page reads `localStorage.lang` and binds `#langToggle`. It runs first and works even if Lenis or other scripts fail.

**Implication:** every new user-facing string must exist in BOTH languages with the matching `lang` attribute, or it appears in only one mode. Never add a bare `<span>Foo</span>`.

### Theming lives in `:root` tokens — trust the tokens, not hardcoded hex

All color/spacing/font values are CSS custom properties on `:root` in `style.css`. The palette has been re-themed several times (warm-black → teal-on-light → current near-monochrome `--ink`/`--accent` `#141414` on `--bg` `#ffffff`). **Do not trust a specific hex in this doc or your memory — read `:root` for the live palette.** Caveat: the "retheme layers" near the bottom of `style.css` (e.g. the Work dashboard grid, some hero rules) and a few per-page accents still contain **hardcoded** hex/rgba (leftover teal `rgba(15,127,140,…)`, salmon, terminal green `#8fe5dc`). A token-only retheme won't catch those — grep for stray hex when recoloring.

### Every page shares the same shell — and duplicates it

`index.html` and each `projects/*.html` repeat the same skeleton on purpose (resilience, no bundler): `header.hud` (brand + nav links + lang toggle + hamburger), `footer.foot`, and a bottom inline `<script>` of small IIFEs — **language toggle (critical), mobile menu, lazy-play-videos-in-view, optional Lenis smooth scroll.** When you change the header markup or any shared IIFE, **replicate the change across all pages** (there is no include mechanism).

### Project sub-pages (`projects/*.html`)

One case study per project: `tarduck`, `sand-garden`, `ld59`, `gridbot`, `gacha`, `ma`, `hypha`, `metagame`, `cocktail-rendering`. They use shared `.proj-*` classes **defined in `style.css`** (not inline). Layout: `.proj-head` → `.proj-lede` → `.proj-media` (hero `<video>`/`<picture>`, or `.proj-media.is-terminal` = ASCII block for tool pages) → `.proj-grid`/`.proj-block` narrative → `.proj-meta` (Role · Scale · Stack) → `.proj-links` → `.proj-nav` (prev/next chain). To add a project, copy an existing sub-page as the template.

### Homepage Work section

- 9 project cards live in `.work-carousel`: on desktop it auto-scrolls as a marquee (JS clones the cards for a seamless loop and supports pointer-drag); at `≤640px` a media-query + JS bypass turns it into a **native scroll-snap swipe** with the marquee clones hidden. Below it, `.work-list` is a static grid of the same cards (also JS-cloned). Filter pills (All / Games / Tools) show/hide by `data-cat` on both.
- Each card **both** expands inline (`.card-detail`: Role · Scope · Scale · Stack; one open at a time; ESC closes) **and** links to its case study — via a `.detail-links a.case` "Full case study →" link, and the whole card body is clickable (a pointer-JS handler that ignores drags and inner links). Keep card + sub-page in sync when editing a project.
- Card numbers (`01`–`09` in `.card-id`) are hand-written — keep them sequential if you add or reorder cards (the `SLUG` map in the card-click IIFE maps any `data-id` whose file differs, e.g. `cocktail` → `cocktail-rendering`).

### Mobile nav

At `≤640px` the section links collapse into a dropdown behind `#menuToggle` (hamburger); `.hud.menu-open` reveals `.hud-links` (the lang toggle stays visible). The menu-toggle IIFE is duplicated per page.

### Page structure of `index.html` (top → bottom)

1. `header.hud` — fixed, backdrop-blurred top bar.
2. `section.hero` — **static** full-viewport poster (`assets/hero-poster.jpg`) + giant Fraunces name + role line. There is **no hero video in production**; `assets/ma-opening.mp4` is legacy/unused (only referenced by `variants/`).
3. `section.creds` — one NDA-safe mono line ("…2 shipped titles · 8 personal projects · MA UAL").
4. `section.about` — cream pause: avatar + intro + Education + Languages.
5. `section.backstory` — a full career **timeline** that is currently `display:none` in `style.css`. Authored but hidden (it overlaps the Work cards). Don't assume it is live.
6. `section.work` — the carousel + grid described above.
7. `section.skills` — three columns (Game Design / Programming / Tools).
8. `section.contact` — mailto `suzysu418@gmail.com` + LinkedIn / GitHub / itch.
9. `footer.foot`.

### NDA / confidentiality rule (hard)

The portfolio shows **only personal-project work** alongside high-level descriptions of professional experience. Do not add screenshots, diagrams, or any asset from an employer's work. Professional titles stay anonymous (use type descriptions like "F2P RPG (East Asia)" / "F2P Roguelike Shooter"). The credibility strip is deliberately vague. `assets/` is personal-project media only.

### Removed legacy references

The pre-redesign page linked to hand-authored case-study files and a `resume.pdf` that never existed. Do not reintroduce them — the contact pattern is "Email for CV" via `mailto:`. (The `projects/*.html` case studies are the current, real per-project pages — distinct from those removed stubs.)

## Conventions specific to this repo

- **Bilingual pairing** — every translatable string is EN + ZH with `lang` attributes (see above).
- **CSS cache-busting** — every HTML `<link rel="stylesheet">` loads `style.css?v=YYYYMMDD-label`. When you change `style.css`, bump the label **and update it in every HTML file** (`index.html` + all `projects/*.html`) so returning visitors get fresh CSS. All 10 pages are currently on `20260701-review-fixes` — keep them in lockstep.
- **Identity to keep in sync** — email `suzysu418@gmail.com`, GitHub `suzyeth`, itch `ssu997`, brand `SUSU`. Display name is `Suzy Su` (EN) / `苏紫薇`·`紫薇` (ZH), used across `<title>`, `meta` author, contact, and footer on every page — keep it consistent when editing any page.
- **Adding a project** — new `projects/<id>.html` (copy an existing page) + a card in `index.html`'s carousel with a `.detail-links a.case` link to it + fix the `.proj-nav` prev/next on the neighbouring pages + bump/sync the CSS version.
- **Theming** — edit `:root` tokens in `style.css`; grep for stray hardcoded hex in the retheme layers (see Theming above).
- `img/` (empty), `variants/`, `_from-portfolio-salvage/`, `*.bak-*`, `.gstack/`, `._*` are history/tooling — not production source.
