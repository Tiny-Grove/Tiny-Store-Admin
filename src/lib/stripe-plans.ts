import "server-only";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StripePlanSetting } from "@/lib/supabase/types";

export function formatPriceAmount(price: Stripe.Price) {
  if (price.unit_amount == null) return "Custom";
  const amount = (price.unit_amount / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  });
  const interval = price.recurring?.interval;
  return interval ? `${amount} / ${interval}` : amount;
}

export function priceProductName(price: Stripe.Price) {
  const product = price.product;
  if (typeof product === "string" || product.deleted) return price.id;
  return product.name;
}

// All active recurring prices in Stripe, alongside whether each has been
// enabled for use in Tiny Store Admin (see the Subscriptions page).
export async function listPricesWithEnabledState() {
  const stripe = getStripe();
  const [prices, { data: settingsData }] = await Promise.all([
    stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"],
      limit: 100,
    }),
    createAdminClient().from("stripe_plan_settings").select("*"),
  ]);

  const settings = (settingsData ?? []) as StripePlanSetting[];
  const enabledMap = new Map(settings.map((s) => [s.stripe_price_id, s.enabled]));

  return prices.data
    .map((price) => ({
      price,
      enabled: enabledMap.get(price.id) ?? false,
    }))
    .sort((a, b) => priceProductName(a.price).localeCompare(priceProductName(b.price)));
}

export interface EnabledPlan {
  priceId: string;
  productName: string;
  amountFormatted: string;
}

// Only the plans an admin has explicitly enabled — the set customers may be
// subscribed to from within the app.
export async function getEnabledPlans(): Promise<EnabledPlan[]> {
  if (!isStripeConfigured()) return [];

  const all = await listPricesWithEnabledState();

  return all
    .filter((p) => p.enabled)
    .map(({ price }) => ({
      priceId: price.id,
      productName: priceProductName(price),
      amountFormatted: formatPriceAmount(price),
    }));
}

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  amountCents: number | null;
  currency: string;
  interval: string | null;
}

// Raw (non-locale-formatted) fields for external consumers — the
// customer-facing website and its enrollment flow — so only plans enabled
// here ever appear as sign-up options there. See GET /api/plans.
export async function getEnabledPlansPublic(): Promise<PublicPlan[]> {
  if (!isStripeConfigured()) return [];

  const all = await listPricesWithEnabledState();

  return all
    .filter((p) => p.enabled)
    .map(({ price }) => {
      const product = price.product;
      const description =
        typeof product === "string" || product.deleted ? null : product.description;

      return {
        id: price.id,
        name: priceProductName(price),
        description,
        amountCents: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
      };
    })
    .sort((a, b) => (a.amountCents ?? 0) - (b.amountCents ?? 0));
}
