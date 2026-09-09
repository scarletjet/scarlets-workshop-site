#!/usr/bin/env node
/* Regenerates inventions/catalog.json by scanning every inventions/<slug>/product.json.
   The homepage and the checkout API both read catalog.json — this keeps it truthful.
   Run: npm run build:catalog */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INV = join(ROOT, "inventions");
const SKIP = new Set(["success", "node_modules"]);

const slugs = readdirSync(INV, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith("_") && !SKIP.has(d.name))
  .map(d => d.name)
  .sort();

const inventions = [];
for (const slug of slugs) {
  const pjPath = join(INV, slug, "product.json");
  if (!existsSync(pjPath)) { console.warn(`  skip ${slug} — no product.json`); continue; }

  let p;
  try { p = JSON.parse(readFileSync(pjPath, "utf8")); }
  catch (e) { console.warn(`  skip ${slug} — bad product.json (${e.message})`); continue; }

  if (!p.name) { console.warn(`  skip ${slug} — product.json has no "name"`); continue; }
  if (p.slug && p.slug !== slug) console.warn(`  warn ${slug} — product.json slug is "${p.slug}"`);

  // hero image: first listed, else first file in images/
  let hero = Array.isArray(p.images) && p.images[0] ? p.images[0] : null;
  if (!hero) {
    const imgDir = join(INV, slug, "images");
    if (existsSync(imgDir)) {
      const first = readdirSync(imgDir)
        .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f) && statSync(join(imgDir, f)).isFile())
        .sort()[0];
      if (first) hero = `images/${first}`;
    }
  }

  inventions.push({
    slug,
    name: p.name,
    emoji: p.emoji || "🛠️",
    tagline: p.tagline || "",
    price: p.price || 0,
    currency: p.currency || "usd",
    hero: hero ? `inventions/${slug}/${hero}` : null,
    downloadCount: Array.isArray(p.downloads) ? p.downloads.length : 0,
  });
}

const catalog = { generated: new Date().toISOString(), inventions };
writeFileSync(join(INV, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog.json — ${inventions.length} invention(s): ${inventions.map(i => i.slug).join(", ") || "(none)"}`);
