import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only the merchants' own connected accounts sell through the storefront —
  // ignore anything else that might land on this endpoint.
  const connectedAccountId = event.account;
  if (!connectedAccountId) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "payment" && session.payment_status === "paid") {
      await recordStorefrontSale(admin, stripe, session, connectedAccountId);
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await admin
      .from("customers")
      .update({ stripe_connect_charges_enabled: account.charges_enabled ?? false })
      .eq("stripe_connect_account_id", account.id);
  }

  return NextResponse.json({ received: true });
}

async function recordStorefrontSale(
  admin: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  connectedAccountId: string
) {
  // Stripe redelivers webhooks at least once — stripe_checkout_session_id
  // lets a retry be told apart from a genuinely new sale.
  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .limit(1);
  if (existing && existing.length > 0) return;

  const customerId = session.metadata?.tiny_store_customer_id;
  if (!customerId) return;

  const lineItems = await stripe.checkout.sessions.listLineItems(
    session.id,
    { expand: ["data.price.product"] },
    { stripeAccount: connectedAccountId }
  );

  const productIds: string[] = [];
  for (const item of lineItems.data) {
    const product = item.price?.product;
    const productId =
      product && typeof product === "object" && !product.deleted
        ? product.metadata?.tiny_store_product_id
        : undefined;
    if (productId) productIds.push(productId);
  }
  if (productIds.length === 0) return;

  const { data: products } = await admin
    .from("products")
    .select("id, name, currency, stock_count")
    .in("id", productIds);
  if (!products) return;

  const saleId = randomUUID();
  const rows: Record<string, unknown>[] = [];
  const quantityByProduct = new Map<string, number>();

  for (const item of lineItems.data) {
    const productRef = item.price?.product;
    const productId =
      productRef && typeof productRef === "object" && !productRef.deleted
        ? productRef.metadata?.tiny_store_product_id
        : undefined;
    const product = productId ? products.find((p) => p.id === productId) : undefined;
    if (!product) continue;

    const quantity = item.quantity ?? 0;
    if (quantity <= 0) continue;

    rows.push({
      customer_id: customerId,
      product_id: product.id,
      product_name: product.name,
      quantity,
      amount_cents: item.amount_total,
      subtotal_cents: item.amount_subtotal,
      currency: product.currency,
      status: "completed",
      sale_id: saleId,
      stripe_checkout_session_id: session.id,
    });
    quantityByProduct.set(product.id, (quantityByProduct.get(product.id) ?? 0) + quantity);
  }
  if (rows.length === 0) return;

  await admin.from("orders").insert(rows);

  for (const [productId, quantity] of quantityByProduct) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue;
    const newStock = Math.max(0, product.stock_count - quantity);
    await admin.from("products").update({ stock_count: newStock }).eq("id", productId);
  }
}
