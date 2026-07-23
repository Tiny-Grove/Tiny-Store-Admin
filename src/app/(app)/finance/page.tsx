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
          <Link href="/settings" className="text-sky-600 hover:underline">
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Finance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revenue trends from settled Stripe invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "75ms" }}
        >
          <p className="text-sm text-slate-500">Last 12 months</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatMoney(last12Total)}
          </p>
        </div>

        <div
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "150ms" }}
        >
          <p className="text-sm text-slate-500">Average per month</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatMoney(average)}
          </p>
        </div>
      </div>

      <div
        className="animate-fade-in-up mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        style={{ animationDelay: "225ms" }}
      >
        <RevenueChart data={months} />
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Based on paid Stripe invoices. The current month is still in progress.
      </p>
    </div>
  );
}
