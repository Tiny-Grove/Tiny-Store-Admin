"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createCheckoutAction, type CheckoutState } from "./actions";
import type { EnabledPlan } from "@/lib/stripe-plans";

const initialState: CheckoutState = {};

export function NewSubscriptionForm({
  customerId,
  plans,
}: {
  customerId: string;
  plans: EnabledPlan[];
}) {
  const [state, formAction, pending] = useActionState(
    createCheckoutAction,
    initialState
  );
  const [copied, setCopied] = useState(false);

  if (plans.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No plans are enabled yet — turn one on in{" "}
        <Link href="/subscriptions" className="text-sky-600 hover:underline">
          Subscriptions
        </Link>
        .
      </p>
    );
  }

  async function copyLink() {
    if (!state.url) return;
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="customerId" value={customerId} />
        <select
          name="priceId"
          required
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        >
          {plans.map((plan) => (
            <option key={plan.priceId} value={plan.priceId}>
              {plan.productName} — {plan.amountFormatted}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="whitespace-nowrap rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create subscription"}
        </button>
      </form>

      {state.error && (
        <p className="animate-fade-in mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.url && (
        <div className="animate-fade-in mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 text-slate-600">
            Send this checkout link to the customer to complete payment. Once
            they finish, click &quot;Sync from Stripe&quot; below.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={state.url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
