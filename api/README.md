# api/ — the checkout endpoint

Two serverless functions that let the static site sell inventions through Stripe:

| Route | Method | Does |
|---|---|---|
| `/api/checkout` | POST `{ slug }` | Creates a Stripe Checkout Session for that invention, returns `{ url }` |
| `/api/verify` | GET `?session_id=` | Confirms a session was paid, returns the buyer's download links (each points at `/api/download`) |
| `/api/download` | GET `?session_id=&file=` | Re-checks payment, enforces the download window, streams one file from private Blob storage |

Both read the invention data straight from this repo (`inventions/<slug>/product.json`
and `inventions/catalog.json`), so there is no separate database to keep in sync.

## Why it's separate from the site

`scarletsworkshop.live` is served by **GitHub Pages**, which is static — it can't run
code. These functions deploy to a host that can (Vercel's free tier fits), on a
different URL like `https://scarlets-workshop-api.vercel.app`. The site calls that
URL; the domain and Pages setup don't change.

## Status

Deployed to the Vercel project **`scarlets-workshop-api`** (team `scarlet-hawk`):
`https://scarlets-workshop-api.vercel.app` — already wired into `inventions/config.js`.

It is **not live yet**: the functions return `500 {"error":"Stripe not configured"}`
until the environment variables below are set.

## Make it live

1. In the Vercel project → **Settings → Environment Variables**, add (Production):
   - `STRIPE_SECRET_KEY` — from the Stripe dashboard. Use a **test** key first (`sk_test_…`).
   - `SITE_URL` — `https://scarletsworkshop.live`
   - `ALLOWED_ORIGINS` *(optional)* — extra origins allowed to call the API, comma-separated.
   - `DOWNLOAD_WINDOW_DAYS` *(optional)* — how long download links work after purchase (default `45`; `0` = forever).
   - `BLOB_READ_WRITE_TOKEN` — added automatically when you create a Blob store (Storage → Create → Blob). Needed for private file delivery; see **Delivering the files**.
2. **Redeploy** (Deployments → ⋯ → Redeploy) so the vars take effect.
3. `curl -X POST https://scarlets-workshop-api.vercel.app/api/checkout -H 'content-type: application/json' -d '{"slug":"sawhorse-clamp"}'`
   should now return `{"url":"https://checkout.stripe.com/..."}`.
4. Buy-flow test: open an invention page, click Buy, pay with test card
   `4242 4242 4242 4242` (any future date, any CVC).
5. When it works, swap `STRIPE_SECRET_KEY` for the live key and redeploy.

## Redeploying after code changes

The project started as a direct file upload. **Link it to Git once** — Vercel →
**Settings → Git** → connect `scarletjet/scarlets-workshop-site`, production branch
`main` — and every push to `main` redeploys automatically.

`vercel.json` in the repo root drives the build: it runs `build-catalog.mjs` and
bundles `inventions/**` into each function via `includeFiles`.

Until it's linked, redeploy with `npx vercel --prod` from the repo root.

## Local run

```
npm i
STRIPE_SECRET_KEY=sk_test_... SITE_URL=http://localhost:8080 npx vercel dev
```

## Delivering the files

The paid files never enter this (public) repo. They live in a **private Vercel Blob
store** and only reach a buyer through `/api/download`, which re-checks the Stripe
session on every hit, confirms the file belongs to that invention, and enforces the
download window before streaming the bytes. The buyer never sees a storage URL.

**One-time setup:** Vercel project → **Storage → Create → Blob**. That adds
`BLOB_READ_WRITE_TOKEN` to the project env. Redeploy.

**Per invention:**

1. `npm run invention -- "…/Workshop Handoff/<slug>"` copies the files to a gitignored
   `inventions/<slug>/downloads/` and lists them in `product.json` as
   `downloads[].file` with `url: ""`.
2. `npm run blob:push -- <slug>` uploads that folder to `inventions/<slug>/<file>` in
   private Blob. (Needs `BLOB_READ_WRITE_TOKEN` locally — Storage → your store →
   `.env.local` tab, or `vercel env pull`.)
3. Commit the page + images. `downloads/` is gitignored and stays local.

`product.json` `downloads[]` entries:

| Field | Meaning |
|---|---|
| `file` | filename in the Blob store; leave `url` empty — `/api/download` streams it |
| `url`  | set only for an **external** file (Drive link, etc.); `/api/download` 302s there instead |

**Before Blob is set up**, `/api/download` falls back to
`scarletsworkshop.live/inventions/<slug>/downloads/<file>` so the flow still works —
but that path is public, so don't ship a real product that way.

### Still on the table: a webhook

`/api/download` gates on the Stripe `session_id`, which a buyer *could* share. For
low-value files that's usually fine (the window caps the exposure). A
`checkout.session.completed` webhook writing to a `purchases` table (Supabase is
already connected) would let us issue per-buyer tokens and send the files by email —
worth doing once volume justifies it.
