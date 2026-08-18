# Scarlet's Workshop — scarletsworkshop.live

The website for Scarlet's Workshop: apps, art, and webpages that are convenient to use.

## How this repo works

```
index.html          ← the hub (homepage with app drawer, webpages, and shop)
CNAME               ← tells GitHub Pages this site lives at scarletsworkshop.live
apps/               ← deployed apps, one folder per app
pages/              ← webpage creations, one folder per page
  starter/          ← a live example you can copy
```

Every folder with an `index.html` inside becomes a URL automatically:
`pages/starter/index.html` → `scarletsworkshop.live/pages/starter/`

## Adding a new creation

1. Create a folder inside `pages/` (or `apps/`) — lowercase, hyphens instead of spaces, e.g. `pages/color-picker/`
2. Put the creation's `index.html` inside it (copy `pages/starter/` as a starting point)
3. Open the root `index.html` and add an entry to the `PAGES` or `APPS` list near the top of the `<script>` section, with a relative link like `pages/color-picker/`
4. Commit — the site updates automatically within a minute or two

## Editing the homepage

All content lives in one place: the `SITE`, `APPS`, `PAGES`, and `PRODUCTS` lists near the top of the `<script>` block in `index.html`. Theme colors are in the `:root` block at the top of the CSS.
