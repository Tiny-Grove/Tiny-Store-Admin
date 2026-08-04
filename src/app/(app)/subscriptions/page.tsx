import Link from "next/link";
import { isStripeConfigured } from "@/lib/stripe";
import { formatPriceAmount, listPricesWithEnabledState, priceProductName } from "@/lib/stripe-plans";
import { setPlanEnabled } from "./actions";

export default async function SubscriptionsPage() {
  if (!isStripeConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">
          Subscriptions
        </h1>
        <p className="text-sm text-slate-500">
          Stripe isn&apos;t connected yet.{" "}
          <Link href="/settings" className="text-brand-600 hover:underline">
            Set it up in Settings
          </Link>
          .
        </p>
      </div>
    );
  }

  const plans = await listPricesWithEnabledState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose which Stripe plans Tiny Store Admin should track.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="animate-fade-in-up rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            No recurring prices found in your Stripe account.
          </p>
        </div>
      ) : (
        <div className="animate-fade-in-up divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {plans.map(({ price, enabled }) => {
            const toggleAction = setPlanEnabled.bind(null, price.id, !enabled);

            return (
              <div
                key={price.id}
                className="flex items-center justify-between px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {priceProductName(price)}
                  </p>
                  <p className="text-slate-500">{formatPriceAmount(price)}</p>
                </div>

                <form action={toggleAction}>
                  <button
                    type="submit"
                    aria-pressed={enabled}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                      enabled ? "bg-brand-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
