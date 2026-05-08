# Ziwei Su — Portfolio

Personal portfolio of **Ziwei Su**, Game Designer based in London.

🌐 Live: https://suzyeth.github.io

## What's inside

A static, single-page bilingual (English / 简体中文) portfolio. Plain HTML + CSS + vanilla JS — no build step, no framework.

- `index.html` — the page
- `style.css` — design tokens, sections, responsive
- `assets/` — hero video, project media
- `variants/` — earlier design exploration prototypes (not linked from production)

## Working locally

Open `index.html` directly, or serve the directory:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Bilingual

EN and 中 coexist in the DOM — toggled by adding `class="zh"` on `<body>`. Every translatable string must be paired with `<span lang="en">` / `<span lang="zh">`.

## Stack

Fraunces (serif) + Inter (sans) + JetBrains Mono (mono) via Google Fonts. Optional GSAP / Lenis for motion, with non-JS fallbacks. Dark warm-black palette with salmon accent.

## License

Code: MIT. Content / design: © 2026 Ziwei Su.
