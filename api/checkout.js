import Stripe from "stripe";
import { loadProduct, applyCors, readJsonBody, SITE_URL } from "./_lib.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Stripe not configured" });

  const { slug } = await readJsonBody(req);
  const product = loadProduct(slug);
  if (!product) return res.status(404).json({ error: "Unknown invention" });
  if (!(product.price > 0) && !product.stripePriceId) {
    return res.status(400).json({ error: "This invention has no price set" });
  }

  const line_item = product.stripePriceId
    ? { price: product.stripePriceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: product.currency || "usd",
          unit_amount: product.price,
          product_data: {
            name: product.name,
            description: product.tagline || undefined,
            metadata: { slug },
          },
        },
      };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [line_item],
      metadata: { slug },
      success_url: `${SITE_URL}/inventions/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/inventions/${slug}/`,
      // digital goods — no shipping
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(502).json({ error: e.message || "Stripe error" });
  }
}
