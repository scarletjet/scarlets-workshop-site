import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** All inventions, from the generated catalog. */
export function loadCatalog() {
  try {
    return JSON.parse(readFileSync(join(ROOT, "inventions", "catalog.json"), "utf8"));
  } catch {
    return { inventions: [] };
  }
}

/** Full product.json for one slug (has downloads, description, etc.). */
export function loadProduct(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || "")) return null;
  try {
    return JSON.parse(readFileSync(join(ROOT, "inventions", slug, "product.json"), "utf8"));
  } catch {
    return null;
  }
}

export const SITE_URL = (process.env.SITE_URL || "https://scarletsworkshop.live").replace(/\/$/, "");

/** Origins allowed to call this API. Add previews via ALLOWED_ORIGINS (comma-separated). */
const ALLOWED = new Set(
  [SITE_URL, "http://localhost:8080", "http://127.0.0.1:8080", ...(process.env.ALLOWED_ORIGINS || "").split(",")]
    .map(s => s.trim()).filter(Boolean)
);

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
