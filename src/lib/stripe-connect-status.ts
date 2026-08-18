import "server-only";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export interface ConnectCapability {
  name: string;
  status: string;
}

export interface ConnectAccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  businessType: string | null;
  country: string | null;
  defaultCurrency: string | null;
  stripeEmail: string | null;
  capabilities: ConnectCapability[];
  currentlyDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  disabledReason: string | null;
  currentDeadline: number | null;
  error: string | null;
}

// Live status for a merchant's Stripe Connect (Express) account — the
// locally cached customers.stripe_connect_charges_enabled only updates via
// the account.updated webhook, so this fills in the fuller picture
// (requirements, capabilities, onboarding) and self-heals if a webhook was
// ever missed. Deliberately omits external_accounts (bank/card details) —
// never fetch or surface those here.
export async function getConnectAccountStatus(
  accountId: string,
  cachedChargesEnabled: boolean
): Promise<ConnectAccountStatus> {
  const fallback: ConnectAccountStatus = {
    chargesEnabled: cachedChargesEnabled,
    payoutsEnabled: cachedChargesEnabled,
    detailsSubmitted: cachedChargesEnabled,
    businessType: null,
    country: null,
    defaultCurrency: null,
    stripeEmail: null,
    capabilities: [],
    currentlyDue: [],
    pastDue: [],
    pendingVerification: [],
    disabledReason: null,
    currentDeadline: null,
    error: null,
  };

  if (!isStripeConfigured()) {
    return { ...fallback, error: "Stripe isn't configured on this admin app." };
  }

  try {
    const account = await getStripe().accounts.retrieve(accountId);
    const capabilities: ConnectCapability[] = Object.entries(account.capabilities ?? {}).map(
      ([name, status]) => ({ name, status: status as string })
    );

    return {
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      businessType: account.business_type ?? null,
      country: account.country ?? null,
      defaultCurrency: account.default_currency ?? null,
      stripeEmail: account.email ?? null,
      capabilities,
      currentlyDue: account.requirements?.currently_due ?? [],
      pastDue: account.requirements?.past_due ?? [],
      pendingVerification: account.requirements?.pending_verification ?? [],
      disabledReason: account.requirements?.disabled_reason ?? null,
      currentDeadline: account.requirements?.current_deadline ?? null,
      error: null,
    };
  } catch (err) {
    return {
      ...fallback,
      error: err instanceof Error ? err.message : "Couldn't reach Stripe",
    };
  }
}

const ACRONYMS = new Set(["url", "dob", "tos", "ssn", "id", "ein", "itin"]);

function titleCaseWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Turns a Stripe requirement field path (e.g. "individual.verification.document")
// into a readable label ("Individual · Verification · Document").
export function humanizeRequirement(field: string): string {
  return field
    .split(".")
    .map((part) => part.split("_").map(titleCaseWord).join(" "))
    .join(" · ");
}

export function humanizeCapabilityName(name: string): string {
  return name
    .replace(/_payments$/i, "")
    .split("_")
    .map(titleCaseWord)
    .join(" ");
}
