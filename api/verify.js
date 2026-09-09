import { loadProduct, applyCors, apiBase, stripe } from "./_lib.js";

const WINDOW_DAYS = Number(process.env.DOWNLOAD_WINDOW_DAYS || 45);

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const sk = stripe();
  if (!sk) return res.status(500).json({ error: "Stripe not configured" });

  const sessionId = req.query?.session_id || new URL(req.url, "http://x").searchParams.get("session_id");
  if (!sessionId) return res.status(400).json({ error: "session_id required" });

  let session;
  try {
    session = await sk.checkout.sessions.retrieve(sessionId);
  } catch {
    return res.status(404).json({ error: "Unknown session" });
  }

  const paid = session.payment_status === "paid";
  if (!paid) return res.status(200).json({ paid: false, error: "Payment not completed" });

  const slug = session.metadata?.slug;
  const product = loadProduct(slug) || {};
  const base = apiBase(req);
  // Every link goes through /api/download, which re-checks payment on each hit and
  // streams the file from private storage. It never exposes the underlying URL.
  const downloads = (Array.isArray(product.downloads) ? product.downloads : [])
    .filter(d => d.file)
    .map(d => ({
      file: d.file,
      label: d.label || d.file,
      url: `${base}/api/download?session_id=${encodeURIComponent(sessionId)}&file=${encodeURIComponent(d.file)}`,
    }));

  return res.status(200).json({
    paid: true,
    name: product.name || slug,
    buyerName: session.customer_details?.name || null,
    downloads,
    windowDays: WINDOW_DAYS > 0 ? WINDOW_DAYS : null,
  });
}
