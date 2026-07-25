import { isStripeConfigured } from "@/lib/stripe";
import { getMonthlyRevenue } from "@/lib/revenue";
import {
  getChurnTrend,
  getCustomerGrowth,
  getSubscriptionStatusBreakdown,
} from "@/lib/analytics";
import { TrendBarChart } from "@/components/trend-bar-chart";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

const STATUS_ACCENTS: Record<string, string> = {
  trialing: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  past_due: "bg-red-50 text-red-700",
  canceled: "bg-slate-100 text-slate-600",
};

export default async function AnalyticsPage() {
  const stripeConfigured = isStripeConfigured();
  const monthsBack = 12;

  const [revenueMonths, customerGrowth, churnTrend, statusBreakdown] = await Promise.all([
    stripeConfigured ? getMonthlyRevenue(monthsBack) : Promise.resolve([]),
    getCustomerGrowth(monthsBack),
    getChurnTrend(monthsBack),
    getSubscriptionStatusBreakdown(),
  ]);

  const revenueData = revenueMonths.map((m) => ({ key: m.key, label: m.label, value: m.amountCents }));
  const totalNewCustomers = customerGrowth.reduce((sum, m) => sum + m.value, 0);
  const totalChurned = churnTrend.reduce((sum, m) => sum + m.value, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trends across the last {monthsBack} months — revenue, growth, and churn.
        </p>
      </div>

      {stripeConfigured && (
        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-900">Revenue</h2>
          <p className="mb-2 text-sm text-slate-500">Paid Stripe invoices, by month.</p>
          <TrendBarChart data={revenueData} color="#437023" format="money" />
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "75ms" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900">Customer growth</h2>
              <p className="text-sm text-slate-500">New signups, by month.</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{totalNewCustomers}</p>
          </div>
          <TrendBarChart data={customerGrowth} color="#437023" />
        </section>

        <section
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "150ms" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900">Churn</h2>
              <p className="text-sm text-slate-500">Subscriptions canceled, by month.</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{totalChurned}</p>
          </div>
          <TrendBarChart data={churnTrend} color="#b45309" />
        </section>
      </div>

      <section
        className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        style={{ animationDelay: "225ms" }}
      >
        <h2 className="font-medium text-slate-900">Subscriptions right now</h2>
        <p className="mb-4 text-sm text-slate-500">Current status breakdown, not a trend.</p>
        {statusBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No subscriptions yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {statusBreakdown.map((row) => (
              <div
                key={row.status}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_ACCENTS[row.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
                <span className="text-sm font-semibold text-slate-900">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
