// Plain Node server for the checkout API, so it can run on Coolify (or any
// Node host) instead of Vercel. It wraps the same handlers in api/ and gives
// them the small bits of Vercel's req/res they use: req.query, req.body,
// res.status(), res.json().
//
//   PORT              port to listen on (Coolify default 3000)
//   STRIPE_SECRET_KEY test key first (sk_test_...), live key to go live
//   SITE_URL          https://scarletsworkshop.live
//   ALLOWED_ORIGINS   optional, extra origins, comma-separated

import { createServer } from "node:http";
import checkout from "./api/checkout.js";
import verify from "./api/verify.js";

const ROUTES = { "/api/checkout": checkout, "/api/verify": verify };

function wrapRes(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => {
    if (!res.headersSent) res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = createServer(async (req, res) => {
  wrapRes(res);
  const url = new URL(req.url, "http://localhost");
  req.query = Object.fromEntries(url.searchParams);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (path === "/" || path === "/health") {
    return res.status(200).json({ ok: true, stripe: !!process.env.STRIPE_SECRET_KEY });
  }
  const handler = ROUTES[path];
  if (!handler) return res.status(404).json({ error: "Not found" });
  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: "Server error" });
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => console.log(`checkout API listening on ${port}`));
