import type { ReactNode } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryName } from "@/lib/countries";
import { WorldMapCard, type CountryCount } from "@/components/world-map-card";

async function getStats() {
  const supabase = createAdminClient();

  const [totalCustomers, activeSubscriptions, pastDue] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "past_due"),
  ]);

  return {
    totalCustomers: totalCustomers.count ?? 0,
    activeSubscriptions: activeSubscriptions.count ?? 0,
    pastDue: pastDue.count ?? 0,
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
};

export default async function DashboardPage() {
  const [{ totalCustomers, activeSubscriptions, pastDue }, countryCounts] =
    await Promise.all([getStats(), getCountryCounts()]);

  const cards = [
    {
      key: "customers",
      label: "Total customers",
      value: totalCustomers,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      key: "active",
      label: "Active subscriptions",
      value: activeSubscriptions,
      accent: "bg-green-50 text-green-600",
    },
    {
      key: "pastDue",
      label: "Past due",
      value: pastDue,
      accent: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card, i) => (
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

      <div className="mt-4">
        <WorldMapCard counts={countryCounts} />
      </div>
    </div>
  );
}
