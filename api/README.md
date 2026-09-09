# api/ — the checkout endpoint

Two serverless functions that let the static site sell inventions through Stripe:

| Route | Method | Does |
|---|---|---|
| `/api/checkout` | POST `{ slug }` | Creates a Stripe Checkout Session for that invention, returns `{ url }` |
| `/api/verify` | GET `?session_id=` | Confirms a session was paid, returns the download links for the buyer |

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
2. **Redeploy** (Deployments → ⋯ → Redeploy) so the vars take effect.
3. `curl -X POST https://scarlets-workshop-api.vercel.app/api/checkout -H 'content-type: application/json' -d '{"slug":"sawhorse-clamp"}'`
   should now return `{"url":"https://checkout.stripe.com/..."}`.
4. Buy-flow test: open an invention page, click Buy, pay with test card
   `4242 4242 4242 4242` (any future date, any CVC).
5. When it works, swap `STRIPE_SECRET_KEY` for the live key and redeploy.

## Redeploying after code changes

This project was created by a direct file upload, so it is **not linked to Git** —
pushes to `main` do not redeploy it. Either:

- link it in Vercel → **Settings → Git** (connect `scarletjet/scarlets-workshop-site`), or
- re-upload with `npx vercel --prod` from the repo root.

Once linked, `vercel.json` in the repo root drives the build (it bundles
`inventions/**` into each function via `includeFiles`).

## Local run

```
npm i
STRIPE_SECRET_KEY=sk_test_... SITE_URL=http://localhost:8080 npx vercel dev
```

## Delivering the files

`product.json` lists each download. Two ways to point at the actual file:

- **`url`** set → the success page links straight to it (Drive share link, S3, Stripe
  file, anywhere public-ish). Preferred for anything you don't want casually shared.
- **`url` empty** → falls back to `scarletsworkshop.live/inventions/<slug>/downloads/<file>`,
  i.e. a file committed in the repo. Simple, but anyone with the path can fetch it.

For real gating you'd add a Stripe webhook + private storage with signed URLs — a
later step. The current flow already checks payment before revealing any link.
