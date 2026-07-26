import "server-only";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export interface ConnectAccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: number;
  error: string | null;
}

// Live status for a merchant's Stripe Connect (Express) account — the
// locally cached customers.stripe_connect_charges_enabled only updates via
// the account.updated webhook, so this fills in the fuller picture (payouts,
// onboarding, outstanding requirements) and self-heals if a webhook was
// ever missed. Falls back to the cached flag if Stripe can't be reached.
export async function getConnectAccountStatus(
  accountId: string,
  cachedChargesEnabled: boolean
): Promise<ConnectAccountStatus> {
  if (!isStripeConfigured()) {
    return {
      chargesEnabled: cachedChargesEnabled,
      payoutsEnabled: cachedChargesEnabled,
      detailsSubmitted: cachedChargesEnabled,
      requirementsDue: 0,
      error: "Stripe isn't configured on this admin app.",
    };
  }

  try {
    const account = await getStripe().accounts.retrieve(accountId);
    return {
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      requirementsDue: account.requirements?.currently_due?.length ?? 0,
      error: null,
    };
  } catch (err) {
    return {
      chargesEnabled: cachedChargesEnabled,
      payoutsEnabled: cachedChargesEnabled,
      detailsSubmitted: cachedChargesEnabled,
      requirementsDue: 0,
      error: err instanceof Error ? err.message : "Couldn't reach Stripe",
    };
  }
}
