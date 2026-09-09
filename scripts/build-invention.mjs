#!/usr/bin/env node
/* Imports one invention from a synced "Workshop Handoff/<slug>/" folder into the repo.
 *
 *   npm run invention -- "/path/to/Workshop Handoff/sawhorse-clamp"
 *
 * Expects inside that folder:
 *   listing.md   name, price, emoji, sales copy   (required)
 *   brief.md     internal notes                    (not published; optional)
 *   images/      photos                            (copied, renamed 01.jpg, 02.jpg, …)
 *   downloads/   the CAD/STL/PDF files             (names recorded; files NOT copied — see below)
 *
 * Writes:
 *   inventions/<slug>/index.html     (copy of _template)
 *   inventions/<slug>/product.json   (from listing.md; review before committing)
 *   inventions/<slug>/images/*
 * then rebuilds inventions/catalog.json.
 *
 * Download files are left where they are on purpose — decide per file whether it goes
 * in the public repo or behind a share link, then fill in product.json "downloads[].url".
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const src = process.argv[2];
if (!src) { console.error('Usage: npm run invention -- "/path/to/Workshop Handoff/<slug>"'); process.exit(1); }
if (!existsSync(src) || !statSync(src).isDirectory()) { console.error(`Not a folder: ${src}`); process.exit(1); }

const listingPath = join(src, "listing.md");
if (!existsSync(listingPath)) { console.error(`Missing listing.md in ${src}`); process.exit(1); }

// ---- parse listing.md -------------------------------------------------------
const raw = readFileSync(listingPath, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

let name = "";
const meta = {};
let i = 0;
for (; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) { if (name || Object.keys(meta).length) { i++; break; } continue; }
  const h = line.match(/^#\s+(.+)/);
  if (h) { name = h[1].trim(); continue; }
  const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.+)$/);
  if (kv) { meta[kv[1].toLowerCase()] = kv[2].trim(); continue; }
  break; // first non-heading, non-kv line ends the header
}
const body = lines.slice(i).join("\n").trim();
const paragraphs = body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

if (!name) { console.error("listing.md needs a '# Name' heading on the first line."); process.exit(1); }

const slug = (meta.slug || basename(src)).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
if (!slug) { console.error("Could not derive a slug."); process.exit(1); }

const priceCents = (() => {
  const m = String(meta.price || "").match(/([\d.]+)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * 100);
})();

// ---- images ---------------------------------------------------------------
const destDir = join(ROOT, "inventions", slug);
const destImg = join(destDir, "images");
mkdirSync(destImg, { recursive: true });

const images = [];
const srcImg = join(src, "images");
if (existsSync(srcImg)) {
  const files = readdirSync(srcImg)
    .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
    .sort();
  files.forEach((f, idx) => {
    const out = String(idx + 1).padStart(2, "0") + extname(f).toLowerCase();
    copyFileSync(join(srcImg, f), join(destImg, out));
    images.push(`images/${out}`);
  });
}

// ---- downloads (names only) ----------------------------------------------
const downloads = [];
const srcDl = join(src, "downloads");
if (existsSync(srcDl)) {
  for (const f of readdirSync(srcDl).sort()) {
    if (f.startsWith(".")) continue;
    if (statSync(join(srcDl, f)).isDirectory()) continue;
    downloads.push({ file: f, label: labelFor(f), url: "" });
  }
}
function labelFor(f) {
  const e = extname(f).slice(1).toUpperCase();
  const known = { STEP: "Parametric CAD source (STEP)", STP: "Parametric CAD source (STEP)",
    STL: "Ready-to-print mesh (STL)", "3MF": "Pre-oriented project (3MF)", PDF: "Guide (PDF)",
    F3D: "Fusion 360 source (F3D)", DXF: "2D profile (DXF)", ZIP: "Bundle (ZIP)" };
  return known[e] || `${e} file`;
}

// ---- product.json -------------------------------------------------------
const existing = existsSync(join(destDir, "product.json"))
  ? JSON.parse(readFileSync(join(destDir, "product.json"), "utf8")) : {};

const product = {
  slug,
  name,
  emoji: meta.emoji || existing.emoji || "🛠️",
  tagline: paragraphs[0] || existing.tagline || "",
  price: priceCents || existing.price || 0,
  currency: (meta.currency || existing.currency || "usd").toLowerCase(),
  description: body || existing.description || "",
  images: images.length ? images : (existing.images || []),
  downloads: downloads.length ? downloads : (existing.downloads || []),
  stripePriceId: meta.stripepriceid || existing.stripePriceId || "",
};
writeFileSync(join(destDir, "product.json"), JSON.stringify(product, null, 2) + "\n");

// ---- page ------------------------------------------------------------------
const page = join(destDir, "index.html");
if (!existsSync(page)) copyFileSync(join(ROOT, "inventions", "_template", "index.html"), page);

// ---- catalog -------------------------------------------------------------
execFileSync(process.execPath, [join(ROOT, "scripts", "build-catalog.mjs")], { stdio: "inherit" });

console.log(`
✓ inventions/${slug}/
    product.json   ${priceCents ? "$" + (priceCents / 100).toFixed(2) : "no price — set one"}
    images         ${images.length}
    downloads      ${downloads.length}${downloads.length ? "  (set each downloads[].url in product.json)" : ""}

Next: review inventions/${slug}/product.json, then  git add inventions/${slug}  &&  git commit
`);
