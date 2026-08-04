import Link from "next/link";
import { isStripeConfigured } from "@/lib/stripe";
import { getMonthlyRevenue } from "@/lib/revenue";
import { formatMoney } from "@/lib/format";
import { RevenueChart } from "@/components/revenue-chart";

export default async function FinancePage() {
  if (!isStripeConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Finance</h1>
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

  const months = await getMonthlyRevenue(12);
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const last12Total = months.reduce((sum, m) => sum + m.amountCents, 0);
  const average = months.length > 0 ? Math.round(last12Total / months.length) : 0;

  const delta =
    previousMonth && previousMonth.amountCents > 0
      ? ((currentMonth.amountCents - previousMonth.amountCents) / previousMonth.amountCents) * 100
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Finance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revenue trends from settled Stripe invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path
                d="M4 15.5v-4M8 15.5V8M12 15.5v-6M16 15.5V4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Revenue this month</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatMoney(currentMonth?.amountCents ?? 0)}
          </p>
          {delta !== null && (
            <p
              className={`mt-1 text-sm font-medium ${
                delta >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs last month
            </p>
          )}
        </div>

        <div
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ animationDelay: "75ms" }}
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Last 12 months</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatMoney(last12Total)}
          </p>
        </div>

        <div
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ animationDelay: "150ms" }}
        >
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path
                d="M3.5 14.5 8 10l3 3 5.5-5.5M13 7.5h3.5V11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Average per month</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatMoney(average)}
          </p>
        </div>
      </div>

      <div
        className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        style={{ animationDelay: "225ms" }}
      >
        <RevenueChart data={months} />
      </div>

      <p className="text-xs text-slate-400">
        Based on paid Stripe invoices. The current month is still in progress.
      </p>
    </div>
  );
}
