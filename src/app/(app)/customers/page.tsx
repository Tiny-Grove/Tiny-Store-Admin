import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Subscription } from "@/lib/supabase/types";
import { statusBadgeClasses, statusDotClasses } from "@/lib/status-badge";
import { formatMoney } from "@/lib/format";
import { restoreCustomer } from "./[id]/danger-zone-actions";

type CustomerWithSubscriptions = Customer & { subscriptions: Subscription[] };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived: archivedParam } = await searchParams;
  const showArchived = archivedParam === "1";

  const supabase = createAdminClient();
  let query = supabase
    .from("customers")
    .select("*, subscriptions(*)")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "subscriptions", ascending: false });
  query = showArchived ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);

  const { data } = await query;

  const customers = (data ?? []) as CustomerWithSubscriptions[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {showArchived ? "Archived customers" : "Customers"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {customers.length} {customers.length === 1 ? "customer" : "customers"}{" "}
            {showArchived ? "archived" : "total"} ·{" "}
            <Link
              href={showArchived ? "/customers" : "/customers?archived=1"}
              className="font-medium text-brand-600 hover:underline"
            >
              {showArchived ? "Back to customers" : "View archived"}
            </Link>
          </p>
        </div>
        {!showArchived && (
          <Link
            href="/customers/new"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-md active:translate-y-0"
          >
            New customer
          </Link>
        )}
      </div>

      {customers.length === 0 ? (
        <div className="animate-fade-in-up rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            {showArchived
              ? "No archived customers."
              : "No customers yet — once connected to the Bizzlet database, they'll show up here."}
          </p>
        </div>
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
                {showArchived && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const sub =
                  customer.subscriptions.find((s) => s.status === "active") ??
                  customer.subscriptions[0];
                return (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {(customer.name ?? customer.email).slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 group-hover:text-brand-700">
                          {customer.name ?? "—"}
                        </span>
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
                      {sub?.plan_name ?? sub?.plan ?? "—"}
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
                    {showArchived && (
                      <td className="px-4 py-3 text-right">
                        <form action={restoreCustomer}>
                          <input type="hidden" name="customerId" value={customer.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                          >
                            Restore
                          </button>
                        </form>
                      </td>
                    )}
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
