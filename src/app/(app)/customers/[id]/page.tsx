import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Note, Subscription } from "@/lib/supabase/types";
import { statusBadgeClasses, statusDotClasses } from "@/lib/status-badge";
import { isStripeConfigured } from "@/lib/stripe";
import { getEnabledPlans } from "@/lib/stripe-plans";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { formatMoney } from "@/lib/format";
import { addNote, resendInvite, setCountry, syncSubscriptionsFromStripe } from "./actions";
import { NewSubscriptionForm } from "./new-subscription-form";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type CustomerDetail = Customer & {
  subscriptions: Subscription[];
  notes: Note[];
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite_email_error?: string }>;
}) {
  const { id } = await params;
  const { invite_email_error } = await searchParams;

  const supabase = createAdminClient();
  const [{ data: customer }, enabledPlans] = await Promise.all([
    supabase
      .from("customers")
      .select("*, subscriptions(*), notes(*)")
      .eq("id", id)
      .order("created_at", { referencedTable: "subscriptions", ascending: false })
      .order("created_at", { referencedTable: "notes", ascending: false })
      .maybeSingle<CustomerDetail>(),
    getEnabledPlans(),
  ]);

  if (!customer) notFound();

  const displayName = customer.name ?? customer.email;

  return (
    <div className="space-y-8">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M12.5 15 7.5 10l5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Customers
      </Link>

      {invite_email_error && (
        <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Customer created, but the invite email failed to send. Use
          &quot;Resend invite&quot; below once Mailgun is configured correctly.
        </p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white shadow-md shadow-indigo-600/25">
          {initials(displayName)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {displayName}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                customer.account_status === "active"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {customer.account_status}
            </span>
          </div>
          <p className="text-slate-500">{customer.email}</p>
          {customer.company && (
            <p className="text-sm text-slate-400">{customer.company}</p>
          )}
          {customer.account_status === "invited" && (
            <form action={resendInvite.bind(null, customer.id)} className="mt-2">
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Resend invite
              </button>
            </form>
          )}
        </div>

        <form
          action={setCountry}
          className="flex items-center gap-2 text-sm text-slate-500"
        >
          <input type="hidden" name="customerId" value={customer.id} />
          <span className="text-lg leading-none">
            {flagEmoji(customer.country)}
          </span>
          <select
            name="country"
            defaultValue={customer.country ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">No country set</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Save
          </button>
        </form>
      </div>

      <section className="animate-fade-in-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Subscriptions</h2>
          {isStripeConfigured() && customer.stripe_customer_id && (
            <form action={syncSubscriptionsFromStripe.bind(null, customer.id)}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Sync from Stripe
              </button>
            </form>
          )}
        </div>

        {isStripeConfigured() && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <NewSubscriptionForm customerId={customer.id} plans={enabledPlans} />
          </div>
        )}

        {customer.subscriptions.length === 0 ? (
          <p className="text-sm text-slate-500">No subscriptions.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {customer.subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{sub.plan}</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses(
                      sub.status
                    )}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusDotClasses(
                        sub.status
                      )}`}
                    />
                    {sub.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">
                    {formatMoney(sub.amount_cents)}
                  </p>
                  {sub.current_period_end && (
                    <p className="text-slate-500">
                      renews{" "}
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "75ms" }}>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Notes</h2>
        <form action={addNote} className="mb-4 flex gap-2">
          <input type="hidden" name="customerId" value={customer.id} />
          <input
            name="body"
            placeholder="Add a note…"
            required
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow duration-150 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
          >
            Add
          </button>
        </form>

        {customer.notes.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {customer.notes.map((note, i) => (
              <li
                key={note.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-in-up rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <p className="text-slate-800">{note.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {note.author_email} ·{" "}
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
