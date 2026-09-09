# Scarlet's Workshop — scarletsworkshop.live

The website for Scarlet's Workshop: apps, art, and webpages that are convenient to use.

## How this repo works

```
index.html          ← the hub (homepage: app drawer, webpages, inventions, shop)
CNAME               ← tells GitHub Pages this site lives at scarletsworkshop.live
apps/               ← deployed apps, one folder per app
pages/              ← webpage creations, one folder per page
  starter/          ← a live example you can copy
inventions/         ← physical inventions with CAD/STL/PDF downloads, sold via Stripe
api/                ← the serverless checkout endpoint (deploys separately — see api/README.md)
scripts/            ← build-invention.mjs, build-catalog.mjs
```

Every folder with an `index.html` inside becomes a URL automatically:
`pages/starter/index.html` → `scarletsworkshop.live/pages/starter/`

## Adding a new creation

1. Create a folder inside `pages/` (or `apps/`) — lowercase, hyphens instead of spaces, e.g. `pages/color-picker/`
2. Put the creation's `index.html` inside it (copy `pages/starter/` as a starting point)
3. Open the root `index.html` and add an entry to the `PAGES` or `APPS` list near the top of the `<script>` section, with a relative link like `pages/color-picker/`
4. Commit — the site updates automatically within a minute or two

## Inventions (with Stripe checkout)

An invention is one **slug** used everywhere — Drive folder, repo folder, web
address, Stripe product. Raw work lives in `Workshop Handoff/<slug>/` in Google
Drive; import it with:

```
npm run invention -- "/path/to/Workshop Handoff/sawhorse-clamp"
```

That scaffolds `inventions/<slug>/`, copies the photos, drafts `product.json` from
`listing.md`, and rebuilds `inventions/catalog.json` (the file the homepage reads).
See `inventions/README.md` for the full flow and `api/README.md` for deploying the
checkout endpoint + setting `STRIPE_SECRET_KEY`.

## Editing the homepage

Apps, webpages and the Gumroad/Etsy shop live in the `SITE`, `APPS`, `PAGES`, and
`PRODUCTS` lists near the top of the `<script>` block in `index.html`. The
**Inventions** section renders itself from `inventions/catalog.json`. Theme colors
are in the `:root` block at the top of the CSS.
