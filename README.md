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

## Playable portfolio

`assets/playable.js` contains the game registry and the shared, bilingual dialog used by the homepage and project pages. Games load only after a click. Closing the dialog removes its iframe; restart recreates it. The fullscreen control expands the player to the browser viewport. Original-page links remain available as a fallback.

Use itch.io's official `https://itch.io/embed-upload/<upload-id>` URL, obtained from **Distribute → Embed game**. Direct `html-classic.itch.zone` file URLs reject embedding outside itch.io. Update the upload ID when replacing a game build. Do not use the purchase-widget `/embed/<game-id>` URL for gameplay.

The homepage's playable cards use a stationary, horizontally scrollable row so moving cards cannot intercept play-button clicks. Kitchen Bar's generated WebGL player is hosted in `play/kitchen/`; the development Unity project is maintained separately. Serve the site over HTTP when testing it.

When changing the shared player, update the `playable.js` and `playable.css` version query on the homepage and every project page. Check both languages, launch/close/restart, viewport expansion, and the original-page fallback before publishing.
