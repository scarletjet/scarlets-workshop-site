import { loadProduct, applyCors, SITE_URL, stripe } from "./_lib.js";

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
  const downloads = (Array.isArray(product.downloads) ? product.downloads : []).map(d => ({
    file: d.file,
    label: d.label || d.file,
    // absolute so the link works from the success page; falls back to repo-hosted path
    url: d.url
      ? d.url
      : d.file
        ? `${SITE_URL}/inventions/${slug}/downloads/${d.file}`
        : "",
  }));

  return res.status(200).json({
    paid: true,
    name: product.name || slug,
    buyerName: session.customer_details?.name || null,
    downloads,
  });
}
