# inventions/

Physical inventions with digital downloads (CAD / STL / PDF), sold through Stripe.

One **slug** carries the meaning everywhere:

```
Workshop Handoff/sawhorse-clamp/   ← Google Drive (raw work)
inventions/sawhorse-clamp/         ← this repo (the public page)
scarletsworkshop.live/inventions/sawhorse-clamp/   ← the web address
Stripe product "sawhorse-clamp"    ← what people buy
```

Lowercase, hyphens instead of spaces. Pick the name once, use it in all four places.

## How a page is built

Each invention folder is self-contained:

```
inventions/sawhorse-clamp/
├── index.html      ← copied verbatim from ../_template/ — never edited by hand
├── product.json    ← the only file with content: name, price, copy, images, downloads
└── images/         ← cleaned-up photos (01.jpg, 02.jpg, …)
```

`index.html` is generic: it fetches `./product.json` and renders the page. Every
invention uses the identical file, so a template improvement reaches all of them
with one copy.

The homepage reads `inventions/catalog.json` (regenerated from every
`product.json`) and lists what it finds under the **Inventions** section.

## Adding an invention

From a synced `Workshop Handoff/<slug>/` folder:

```
npm run invention -- "/path/to/Workshop Handoff/sawhorse-clamp"
```

That scaffolds `inventions/<slug>/`, copies the photos, writes a first-draft
`product.json` from `listing.md`, and rebuilds `catalog.json`. Review
`product.json`, then commit.

To rebuild just the catalog (after editing a `product.json` by hand):

```
npm run build:catalog
```

## The buy flow

`inventions/config.js` holds one value — the deployed API base URL. The page
POSTs the slug to `${API}/api/checkout`, which creates a Stripe Checkout Session
and returns its URL. After payment, Stripe sends the buyer to
`/inventions/success/`, which verifies the session against Stripe and reveals the
download links from `product.json`.

See `../api/README.md` for deploying the endpoint and setting `STRIPE_SECRET_KEY`.
