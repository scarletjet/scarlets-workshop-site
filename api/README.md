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

## Deploy (Vercel)

1. `npm i` locally to lock `stripe` into `package-lock.json`, commit it.
2. Import this repo as a new Vercel project (framework preset: **Other**). Vercel
   auto-detects the `api/` folder — no build step needed.
3. Set environment variables in the Vercel project:
   - `STRIPE_SECRET_KEY` — from the Stripe dashboard (use a **test** key first: `sk_test_…`)
   - `SITE_URL` — `https://scarletsworkshop.live`
   - `ALLOWED_ORIGINS` *(optional)* — extra origins allowed to call the API, comma-separated
     (add your Vercel preview URL while testing)
4. Deploy. Note the production URL.
5. Put that URL in `inventions/config.js` (`window.WORKSHOP_API`), commit, push —
   GitHub Pages picks it up in a minute.

Test with a Stripe test card (`4242 4242 4242 4242`, any future date, any CVC).
When it works, swap `STRIPE_SECRET_KEY` for the live key.

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
