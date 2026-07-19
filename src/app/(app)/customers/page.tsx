import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Subscription } from "@/lib/supabase/types";
import { statusBadgeClasses, statusDotClasses } from "@/lib/status-badge";
import { formatMoney } from "@/lib/format";

type CustomerWithSubscriptions = Customer & { subscriptions: Subscription[] };

export default async function CustomersPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("*, subscriptions(*)")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "subscriptions", ascending: false });

  const customers = (data ?? []) as CustomerWithSubscriptions[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
        >
          New customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-slate-500">
          No customers yet — once connected to the Tiny Store database,
          they&apos;ll show up here.
        </p>
      ) : (
        <div className="animate-fade-in-up overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">MRR</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const sub = customer.subscriptions[0];
                return (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {customer.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {customer.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          customer.account_status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {customer.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {sub?.plan ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses(
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
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {sub ? formatMoney(sub.amount_cents) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
