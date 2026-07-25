import type { ReactNode } from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryName } from "@/lib/countries";
import { WorldMapCard, type CountryCount } from "@/components/world-map-card";
import { isStripeConfigured } from "@/lib/stripe";
import { getMonthlyRevenue } from "@/lib/revenue";
import { formatMoney } from "@/lib/format";

async function getStats() {
  const supabase = createAdminClient();

  const [totalCustomers, activeSubscriptions, pastDue, openTickets, stockLevels] =
    await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "past_due"),
      supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "pending"]),
      supabase.from("products").select("stock_count, low_stock_threshold"),
    ]);

  const lowStockCount = (stockLevels.data ?? []).filter(
    (p) => p.stock_count <= p.low_stock_threshold
  ).length;

  return {
    totalCustomers: totalCustomers.count ?? 0,
    activeSubscriptions: activeSubscriptions.count ?? 0,
    pastDue: pastDue.count ?? 0,
    openTickets: openTickets.count ?? 0,
    lowStockCount,
  };
}

async function getCountryCounts(): Promise<CountryCount[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("country")
    .not("country", "is", null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const code = row.country as string | null;
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([code, count]) => ({
    code,
    name: countryName(code) ?? code,
    count,
  }));
}

const ICONS: Record<string, ReactNode> = {
  customers: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 17c0-3.31 2.69-5.5 6-5.5s6 2.19 6 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  active: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M4 10.5 8 14l8-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  pastDue: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M10 6.5v4l2.5 2.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  revenue: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M4 15.5v-4M8 15.5V8M12 15.5v-6M16 15.5V4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  tickets: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.7 7.6a2.3 2.3 0 0 1 4.47.85c0 1.5-2.17 1.5-2.17 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
    </svg>
  ),
  stock: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M3 6.5 10 3l7 3.5M3 6.5v7l7 3.5m-7-10.5 7 3.5m0 7v-7m0 7 7-3.5v-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const QUICK_ACTIONS = [
  { href: "/customers/new", label: "New customer" },
  { href: "/emails/new", label: "New email template" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardPage() {
  const stripeConfigured = isStripeConfigured();

  const [stats, countryCounts, revenueMonths] = await Promise.all([
    getStats(),
    getCountryCounts(),
    stripeConfigured ? getMonthlyRevenue(1) : Promise.resolve([]),
  ]);

  const revenueThisMonth = revenueMonths[revenueMonths.length - 1]?.amountCents ?? 0;

  const primaryCards = [
    {
      key: "customers",
      label: "Total customers",
      value: String(stats.totalCustomers),
      accent: "bg-brand-50 text-brand-700",
    },
    {
      key: "active",
      label: "Active subscriptions",
      value: String(stats.activeSubscriptions),
      accent: "bg-green-50 text-green-600",
    },
    {
      key: "pastDue",
      label: "Past due",
      value: String(stats.pastDue),
      accent: "bg-red-50 text-red-600",
    },
    ...(stripeConfigured
      ? [
          {
            key: "revenue",
            label: "Revenue this month",
            value: formatMoney(revenueThisMonth),
            accent: "bg-amber-50 text-amber-600",
          },
        ]
      : []),
  ];

  const attentionCards = [
    {
      key: "tickets",
      label: "Open support tickets",
      value: stats.openTickets,
      href: "/support",
      accent: "bg-brand-50 text-brand-700",
    },
    {
      key: "stock",
      label: "Low-stock products",
      value: stats.lowStockCount,
      href: "/customers",
      accent: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            At a glance — customers, revenue, and what needs attention.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
          primaryCards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {primaryCards.map((card, i) => (
          <div
            key={card.key}
            style={{ animationDelay: `${i * 75}ms` }}
            className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${card.accent}`}
            >
              {ICONS[card.key]}
            </div>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Needs attention
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {attentionCards.map((card, i) => (
            <Link
              key={card.key}
              href={card.href}
              style={{ animationDelay: `${(i + 4) * 75}ms` }}
              className="animate-fade-in-up flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.accent}`}
              >
                {ICONS[card.key]}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-0.5 text-xl font-semibold text-slate-900">
                  {card.value}
                </p>
              </div>
              {card.value > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Review
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div>
        <WorldMapCard counts={countryCounts} />
      </div>
    </div>
  );
}
