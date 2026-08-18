"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured, mapStripeStatus } from "@/lib/stripe";
import { priceProductName } from "@/lib/stripe-plans";
import { uploadCustomerAsset } from "@/lib/customer-assets";
import { parsePriceToCents } from "@/lib/format";
import { generateProductCode } from "@/lib/product-code";
import { getSiteUrl } from "@/lib/site-url";
import { getMailFrom, getTransactionalClient, isMailtrapConfigured } from "@/lib/mailtrap";
import { renderEmail } from "@/lib/email-render";
import type { EmailLayout } from "@/lib/supabase/types";

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
  const slogan = (formData.get("slogan") as string)?.trim() || null;

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
      slogan,
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

  const siteUrl = await getSiteUrl();
  if (!siteUrl) {
    return {
      error: "Set the storefront domain in Settings before creating checkout links.",
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

export interface ConnectLinkState {
  url?: string;
  error?: string;
}

async function createConnectOnboardingLink(customerId: string): Promise<
  { url: string; toEmail: string } | { error: string }
> {
  if (!isStripeConfigured()) return { error: "Stripe isn't configured." };
  if (!customerId) return { error: "Missing customer." };

  const siteUrl = await getSiteUrl();
  if (!siteUrl) return { error: "Set the storefront domain in Settings before creating this link." };

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("email, stripe_connect_account_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer?.stripe_connect_account_id) {
    return { error: "This customer hasn't started connecting Stripe yet." };
  }

  // Deliberately not /connect/return here — that page redirects into the
  // mobile app's custom URL scheme, which only makes sense when opened
  // from the app's own in-app browser. A link an admin sends by email
  // could be opened anywhere, so it lands on a plain confirmation page
  // instead (see src/app/connect/complete/page.tsx).
  const returnUrl = `${siteUrl}/connect/complete`;

  try {
    const link = await getStripe().accountLinks.create({
      account: customer.stripe_connect_account_id,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return { url: link.url, toEmail: customer.email };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't create the link." };
  }
}

// Generates a fresh Stripe onboarding link for the admin to copy and send
// through whatever channel makes sense (WhatsApp, a manual email, etc).
// Stripe account links are single-use and expire within minutes, so this
// must be called right before the link is actually used — never cache or
// reuse the result.
export async function generateConnectOnboardingLink(
  _prevState: ConnectLinkState,
  formData: FormData
): Promise<ConnectLinkState> {
  const customerId = formData.get("customerId") as string;
  const result = await createConnectOnboardingLink(customerId);
  return "error" in result ? { error: result.error } : { url: result.url };
}

export interface ConnectEmailState {
  sentTo?: string;
  error?: string;
}

// Same as generateConnectOnboardingLink, but emails the fresh link
// directly to the customer via Mailtrap instead of handing it back to the
// admin to copy — minimizes the delay between generating the (short-lived)
// link and it actually reaching an inbox.
export async function sendConnectOnboardingLinkEmail(
  _prevState: ConnectEmailState,
  formData: FormData
): Promise<ConnectEmailState> {
  const customerId = formData.get("customerId") as string;
  const result = await createConnectOnboardingLink(customerId);
  if ("error" in result) return { error: result.error };

  if (!(await isMailtrapConfigured())) return { error: "Mailtrap isn't configured." };
  const from = await getMailFrom();
  if (!from) return { error: "Mailtrap From address isn't set." };

  const admin = createAdminClient();
  const { data: layout } = await admin
    .from("email_layout")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  const layoutRow = layout as EmailLayout | null;

  const bodyHtml = `
    <p>Hi,</p>
    <p>You're almost set up to accept payments — a few details still need
    to be confirmed with Stripe. Click below to finish:</p>
    <p style="margin-top:24px;">
      <a href="${result.url}" style="color:#0d7711;">Finish setting up payments →</a>
    </p>
    <p style="margin-top:24px; font-size:13px; color:#64748b;">
      This link is only valid for a few minutes for security. If it's
      expired by the time you click it, just reply and we'll send a new one.
    </p>
  `;
  const html = renderEmail({
    subject: "Finish setting up payments",
    bodyHtml,
    headerHtml: layoutRow?.header_html ?? "",
    footerHtml: layoutRow?.footer_html ?? "",
  });

  try {
    const client = getTransactionalClient();
    await client.send({
      from,
      to: [{ email: result.toEmail }],
      subject: "Finish setting up payments",
      html,
    });
    return { sentTo: result.toEmail };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Send failed." };
  }
}
