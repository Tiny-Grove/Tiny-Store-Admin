"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured, mapStripeStatus } from "@/lib/stripe";
import { priceProductName } from "@/lib/stripe-plans";
import { uploadCustomerAsset } from "@/lib/customer-assets";
import { parsePriceToCents } from "@/lib/format";
import { generateProductCode } from "@/lib/product-code";

export async function addNote(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authorEmail = user?.email;
  if (!authorEmail) return;

  const customerId = formData.get("customerId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!body || !customerId) return;

  const admin = createAdminClient();
  await admin
    .from("notes")
    .insert({ customer_id: customerId, author_email: authorEmail, body });

  revalidatePath(`/customers/${customerId}`);
}

export async function updateStoreInfo(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  if (!customerId) return;

  const name = (formData.get("name") as string)?.trim() || null;
  const company = (formData.get("company") as string)?.trim() || null;
  const country = (formData.get("country") as string) || null;
  const industry_id = (formData.get("industry_id") as string) || null;
  const primary_color = (formData.get("primary_color") as string) || null;
  const secondary_color = (formData.get("secondary_color") as string) || null;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({
      name,
      company,
      country,
      industry_id,
      primary_color,
      secondary_color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

export async function uploadCustomerLogo(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const file = formData.get("logo") as File;
  if (!customerId) return;

  const url = await uploadCustomerAsset(customerId, file, "logo");
  if (!url) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
}

export async function uploadCustomerFavicon(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const file = formData.get("favicon") as File;
  if (!customerId) return;

  const url = await uploadCustomerAsset(customerId, file, "favicon");
  if (!url) return;

  const admin = createAdminClient();
  await admin
    .from("customers")
    .update({ favicon_url: url, updated_at: new Date().toISOString() })
    .eq("id", customerId);

  revalidatePath(`/customers/${customerId}`);
}

export async function addProduct(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const price = (formData.get("price") as string) ?? "0";
  const stock_count = Number.parseInt(formData.get("stock_count") as string, 10) || 0;

  if (!customerId || !name) return;

  const admin = createAdminClient();
  await admin.from("products").insert({
    customer_id: customerId,
    name,
    description,
    price_cents: parsePriceToCents(price),
    stock_count,
    product_code: generateProductCode(),
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function updateProduct(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const productId = formData.get("productId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const price = (formData.get("price") as string) ?? "0";
  const stock_count = Number.parseInt(formData.get("stock_count") as string, 10) || 0;

  if (!customerId || !productId || !name) return;

  const admin = createAdminClient();
  await admin
    .from("products")
    .update({
      name,
      description,
      price_cents: parsePriceToCents(price),
      stock_count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("customer_id", customerId);

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteProduct(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const productId = formData.get("productId") as string;
  if (!customerId || !productId) return;

  const admin = createAdminClient();
  await admin
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("customer_id", customerId);

  revalidatePath(`/customers/${customerId}`);
}

export interface CheckoutState {
  url?: string;
  error?: string;
}

// Creates a Stripe Checkout Session for the customer to pay for a plan
// themselves — we never collect card details directly. Nothing is billed
// until the customer completes checkout; use "Sync from Stripe" afterwards
// to pull the resulting subscription into this page.
export async function createCheckoutAction(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  if (!isStripeConfigured()) return { error: "Stripe isn't configured." };

  const customerId = formData.get("customerId") as string;
  const priceId = formData.get("priceId") as string;
  if (!customerId || !priceId) return { error: "Choose a plan." };

  const siteUrl = process.env.PUBLIC_SITE_URL;
  if (!siteUrl) {
    return {
      error:
        "Set PUBLIC_SITE_URL in your environment before creating checkout links (see Settings).",
    };
  }

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) return { error: "Customer not found." };

  const stripe = getStripe();
  let stripeCustomerId: string | null = customer.stripe_customer_id;

  if (!stripeCustomerId) {
    const created = await stripe.customers.create({
      email: customer.email,
      name: customer.name ?? undefined,
      metadata: { tiny_store_customer_id: customerId },
    });
    stripeCustomerId = created.id;
    await admin
      .from("customers")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}?checkout=success`,
    cancel_url: `${siteUrl}?checkout=cancel`,
    metadata: { tiny_store_customer_id: customerId },
  });

  if (!session.url) return { error: "Stripe didn't return a checkout URL." };

  return { url: session.url };
}

// Pulls this customer's current subscriptions from Stripe into our local
// table — the only way local records learn about payment/renewal/
// cancellation events, since we don't run a webhook listener.
export async function syncSubscriptionsFromStripe(customerId: string) {
  if (!isStripeConfigured()) return;

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("stripe_customer_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer?.stripe_customer_id) return;

  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: customer.stripe_customer_id,
    status: "all",
    expand: ["data.items.data.price.product"],
    limit: 100,
  });

  for (const sub of subs.data) {
    const item = sub.items.data[0];
    const price = item?.price;
    if (!price) continue;

    await admin.from("subscriptions").upsert(
      {
        stripe_subscription_id: sub.id,
        customer_id: customerId,
        plan: priceProductName(price),
        status: mapStripeStatus(sub.status),
        amount_cents: price.unit_amount ?? 0,
        current_period_end: item.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
      },
      { onConflict: "stripe_subscription_id" }
    );
  }

  revalidatePath(`/customers/${customerId}`);
}
