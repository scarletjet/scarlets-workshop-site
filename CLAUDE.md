# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

scarletsworkshop.live — a personal hub site for Scarlet's Workshop: small web tools, apps, physical
inventions sold via Stripe, and external links (itch.io, Gumroad/Etsy, social). No framework, no build
step for the site itself — plain static HTML served by GitHub Pages (custom domain via `CNAME`).

## Commands

- `npm run dev` — serve the static site locally at http://localhost:8080 (`npx serve`)
- `npm run dev:api` — run the Stripe checkout API locally via `npx vercel dev` (needs `STRIPE_SECRET_KEY` and `SITE_URL` env vars)
- `npm run invention -- "/path/to/Workshop Handoff/<slug>"` — import a new invention from a synced Google Drive handoff folder into `inventions/<slug>/`, then rebuild the catalog
- `npm run build:catalog` — regenerate `inventions/catalog.json` from every `inventions/*/product.json` (run this after hand-editing a `product.json`)

There is no test suite, linter, or bundler configured. Validate a page by opening it in a browser (or
a quick `node -e "new Function(...)"` against its inline `<script>` for a syntax check) — nothing here
is type-checked or linted automatically.

## Architecture

### Flat, static HTML — every folder with an `index.html` becomes a URL
No routing config: `tools/168/index.html` → `scarletsworkshop.live/tools/168/`, automatically. Pages
are self-contained single `.html` files — inline `<style>` and `<script>`, no shared JS/CSS, no
imports. Copy-paste between pages is the norm here, not an anti-pattern.

### Root `index.html` is a hand-rolled hash-routed SPA
The homepage is a single-file client-side router, not a static page. Routes live in a `routes` object
keyed by hash fragment (`""`, `apps`, `inventions`, `tools`, `about`), each with a `render()` returning
an HTML string and an optional `afterRender()` for post-mount wiring (e.g. the Apps page's live clock).
`currentRoute()` falls back to home for unknown hashes. Section content (`APPS`, `TOOLS`,
`INV_WRITEUPS`, `INV_TOOLS`, `EXTERNAL_INVENTIONS`, `PRODUCTS`) is defined as plain JS arrays near the
top of the `<script>` block and rendered through small `*Row`/`*Card`/`*Icon` builder functions — edit
those arrays to add or change entries, not the markup.

The Shop route was removed (hidden, not deleted) — `PRODUCTS` and `shopCard()` still exist for a quick
re-enable, but nothing currently links to `#/shop`.

### Three folder conventions for "things you can visit"
- **`tools/<slug>/`** — small self-contained web tools/apps (168, TaskPilot, BudgetBee, WeatherOrb,
  etc.). Each is fully standalone: dark card UI, its own accent color, a `← Back to Scarlet's Workshop`
  link, `localStorage` for persistence where needed. Listed in the homepage's `TOOLS` array.
- **`inventions/<slug>/`** — either a real Stripe-backed invention (see below) or a ported write-up/tool
  page (`video-to-steps`, `the-launch-shelf`, `fleet-one-shot-builder` — originally Claude Artifacts,
  copied in verbatim plus site chrome). Listed in `EXTERNAL_INVENTIONS` / `INV_WRITEUPS` / `INV_TOOLS`.
- **`apps/`** and **`pages/`** are vestigial: `apps/` now holds only a stale README (real apps moved to
  `tools/`), and `pages/starter/` is an old copy-template nothing else references. It's on-theme now,
  but new pages still follow the `tools/*/index.html` convention rather than copying it.

### Inventions + Stripe checkout is the one part with real backend logic
- One **slug** is shared across four places: the Drive handoff folder, `inventions/<slug>/`, the site
  URL, and the Stripe product (see `inventions/README.md`).
- `inventions/<slug>/index.html` is *always* a verbatim copy of `inventions/_template/index.html` — a
  generic page that fetches `./product.json` at runtime. Never hand-edit a per-invention `index.html`;
  edit `product.json`, and if the template itself needs to change, edit `_template/` and recopy it to
  every existing invention folder.
- `inventions/catalog.json` is generated (`npm run build:catalog`) from every `product.json` and is
  what the homepage's Inventions section fetches at runtime, merged with the static
  `EXTERNAL_INVENTIONS` list in `index.html`.
- The checkout flow (`api/checkout.js`, `api/verify.js`, `api/_lib.js`) is a **separate deployment** —
  GitHub Pages can't run server code, so these deploy to Vercel independently and the static site calls
  them by URL (`inventions/config.js` holds that base URL). See `api/README.md` for the deploy/env-var
  story; it needs `STRIPE_SECRET_KEY` set on Vercel before checkout actually works, and that Vercel
  project isn't Git-linked, so pushes to `main` don't auto-redeploy it.

### Design language
Brand is "scarlet" (deep red/garnet), replacing the site's original cyan/violet theme — every page has
now migrated. Each tool/invention layers its own accent color on top of the shared scarlet "back to
workshop" chrome — this is an established pattern, not inconsistency. `inventions/video-to-steps`, a
page that predates the redesign, explicitly separates `--accent` (the app's own colour) from `--brand`
(the scarlet Workshop mark); newer pages just use one accent set throughout.
