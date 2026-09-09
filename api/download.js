import { Readable } from "node:stream";
import { get as getBlob } from "@vercel/blob";
import { loadProduct, applyCors, SITE_URL, stripe } from "./_lib.js";

/* GET /api/download?session_id=<cs_…>&file=<name>
 *
 * The gate for paid files. Every download link on the success page points here, not
 * at the file. On each hit we re-check the Stripe session server-side, confirm the
 * file belongs to that invention, enforce a download window, then stream the bytes
 * out of PRIVATE Vercel Blob storage. The blob URL is never shown to the browser.
 *
 * Falls back gracefully when things aren't wired yet:
 *   - download entry has an explicit `url`  → 302 to it (Drive link, S3, etc.)
 *   - BLOB_READ_WRITE_TOKEN unset            → 302 to the old repo-hosted path
 */

const WINDOW_DAYS = Number(process.env.DOWNLOAD_WINDOW_DAYS || 45);
const FILE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const q = req.query || new URL(req.url, "http://x").searchParams;
  const sessionId = q.session_id ?? q.get?.("session_id");
  const file = q.file ?? q.get?.("file");
  if (!sessionId || !file) return res.status(400).json({ error: "session_id and file required" });
  if (file.includes("..") || !FILE_RE.test(file)) return res.status(400).json({ error: "bad file name" });

  const sk = stripe();
  if (!sk) return res.status(500).json({ error: "Stripe not configured" });

  let session;
  try {
    session = await sk.checkout.sessions.retrieve(sessionId);
  } catch {
    return res.status(404).json({ error: "Unknown session" });
  }
  if (session.payment_status !== "paid") return res.status(403).json({ error: "Payment not completed" });

  if (WINDOW_DAYS > 0 && session.created) {
    const ageDays = (Date.now() / 1000 - session.created) / 86400;
    if (ageDays > WINDOW_DAYS) {
      return res.status(410).json({
        error: `Download links expire ${WINDOW_DAYS} days after purchase. Reply to your receipt email and Scarlet will re-send them.`,
      });
    }
  }

  const slug = session.metadata?.slug;
  const product = loadProduct(slug);
  if (!product) return res.status(404).json({ error: "Unknown invention" });

  const entry = (Array.isArray(product.downloads) ? product.downloads : []).find(d => d.file === file);
  if (!entry) return res.status(404).json({ error: "That file isn't part of this invention" });

  // An explicit URL on the entry wins — send the buyer straight there.
  if (entry.url) {
    res.setHeader("Location", entry.url);
    return res.status(302).end();
  }

  // No Blob configured yet: fall back to the (public) repo-hosted path so the flow
  // still works during setup.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.setHeader("Location", `${SITE_URL}/inventions/${slug}/downloads/${file}`);
    return res.status(302).end();
  }

  let blob;
  try {
    blob = await getBlob(`inventions/${slug}/${file}`, { access: "private" });
  } catch {
    return res.status(502).json({ error: "Storage error — try again in a minute" });
  }
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return res.status(404).json({ error: "That file hasn't been uploaded yet — reply to your receipt email." });
  }

  res.setHeader("Content-Type", blob.blob.contentType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${file.replace(/"/g, "")}"`);
  if (blob.blob.size) res.setHeader("Content-Length", String(blob.blob.size));
  res.setHeader("Cache-Control", "private, no-store");
  Readable.fromWeb(blob.stream).pipe(res);
}
