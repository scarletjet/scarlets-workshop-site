#!/usr/bin/env node
/* Push one invention's download files into PRIVATE Vercel Blob storage.
 *
 *   npm run blob:push -- <slug>
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_… node scripts/upload-downloads.mjs <slug>
 *
 * Reads every file in  inventions/<slug>/downloads/  (that folder is gitignored, so
 * the real CAD/STL/PDF never enters the public repo) and uploads each to
 *   inventions/<slug>/<filename>
 * as a private blob. /api/download streams it to a buyer after checking payment.
 *
 * Get the token: Vercel project → Storage → your Blob store → ".env.local" tab
 * (or run `vercel env pull` and read BLOB_READ_WRITE_TOKEN from .env.local).
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { put, list } from "@vercel/blob";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: npm run blob:push -- <slug>");
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Set BLOB_READ_WRITE_TOKEN — Vercel project → Storage → Blob store → .env.local");
  process.exit(1);
}

const dir = join(ROOT, "inventions", slug, "downloads");
if (!existsSync(dir)) {
  console.error(`No folder: inventions/${slug}/downloads/  — put the paid files there first.`);
  process.exit(1);
}

const files = readdirSync(dir).filter(f => !f.startsWith(".") && statSync(join(dir, f)).isFile());
if (!files.length) {
  console.error(`inventions/${slug}/downloads/ is empty.`);
  process.exit(1);
}

for (const f of files) {
  const body = readFileSync(join(dir, f));
  const { pathname } = await put(`inventions/${slug}/${f}`, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(`  ↑ ${pathname}  (${(body.length / 1024).toFixed(0)} KB)`);
}

const { blobs } = await list({ prefix: `inventions/${slug}/` });
console.log(`\n✓ ${slug} — ${blobs.length} file(s) now in Blob:`);
for (const b of blobs) console.log(`    ${b.pathname}`);
console.log(`\nMake sure product.json lists each as a downloads[].file (leave url "").`);
