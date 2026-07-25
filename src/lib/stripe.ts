import "server-only";
import Stripe from "stripe";
import type { SubscriptionStatus } from "@/lib/supabase/types";

let stripe: Stripe | null = null;

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      // canceled, incomplete, incomplete_expired, paused
      return "canceled";
  }
}

export function isStripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripeMode(): "test" | "live" | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return key.startsWith("sk_live_") ? "live" : "test";
}

// Server-only Stripe client — never import this from client components.
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}
