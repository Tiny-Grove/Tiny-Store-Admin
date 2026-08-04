"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site-url";

export type CartItem = { productId: string; quantity: number };
export type CheckoutResult = { url?: string; error?: string };

export async function createStorefrontCheckout(slug: string, items: CartItem[]): Promise<CheckoutResult> {
  if (items.length === 0) return { error: "Your cart is empty." };

  const siteUrl = await getSiteUrl();
  if (!siteUrl) return { error: "Storefront checkout isn't configured yet." };

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, deleted_at")
    .eq("slug", slug)
    .maybeSingle();

  if (
    !customer?.stripe_connect_account_id ||
    !customer.stripe_connect_charges_enabled ||
    customer.deleted_at
  ) {
    return { error: "This store isn't able to accept payments right now." };
  }

  const { data: products } = await admin
    .from("products")
    .select("id, name, price_cents, currency, stock_count")
    .eq("customer_id", customer.id)
    .in(
      "id",
      items.map((item) => item.productId)
    );

  if (!products || products.length === 0) {
    return { error: "Those items are no longer available." };
  }

  // Real product ids/quantities live in each line item's product metadata
  // (not just Checkout Session metadata, which has a size limit that a
  // larger cart could exceed) — the webhook reads them back from there to
  // build the order without needing to trust anything from the browser.
  const lineItems = items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return [];
    const quantity = Math.min(item.quantity, product.stock_count);
    if (quantity <= 0) return [];
    return [
      {
        price_data: {
          currency: product.currency,
          unit_amount: product.price_cents,
          product_data: {
            name: product.name,
            metadata: { tiny_store_product_id: product.id },
          },
        },
        quantity,
      },
    ];
  });

  if (lineItems.length === 0) {
    return { error: "Those items are out of stock." };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: lineItems,
      success_url: `${siteUrl}/store/${slug}/success`,
      cancel_url: `${siteUrl}/store/${slug}/cancel`,
      metadata: {
        tiny_store_customer_id: customer.id,
        tiny_store_slug: slug,
      },
    },
    { stripeAccount: customer.stripe_connect_account_id }
  );

  if (!session.url) return { error: "Could not start checkout." };
  return { url: session.url };
}
