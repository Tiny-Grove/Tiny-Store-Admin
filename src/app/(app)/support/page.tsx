import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, SupportTicket } from "@/lib/supabase/types";
import { ticketStatusBadgeClasses, ticketStatusDotClasses } from "@/lib/ticket-status";

type TicketWithCustomer = SupportTicket & { customers: Pick<Customer, "email" | "name"> | null };

export default async function SupportPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("support_tickets")
    .select("*, customers(email, name)")
    .order("last_message_at", { ascending: false });

  const tickets = (data ?? []) as TicketWithCustomer[];
  const openCount = tickets.filter((t) => t.status !== "resolved").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Support</h1>
        <p className="mt-1 text-sm text-slate-500">
          {openCount} open of {tickets.length} total tickets
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="animate-fade-in-up rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            No support tickets yet — they&apos;ll show up here once customers
            submit one from the app.
          </p>
        </div>
      ) : (
        <div className="animate-fade-in-up divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/support/${t.id}`}
                  className="font-medium text-slate-900 hover:text-brand-600"
                >
                  {t.subject}
                </Link>
                <p className="text-slate-500">
                  {t.customer_id ? (
                    <Link
                      href={`/customers/${t.customer_id}?tab=communications`}
                      className="hover:text-brand-600 hover:underline"
                    >
                      {t.customers?.name ?? t.customers?.email ?? "Customer"}
                    </Link>
                  ) : (
                    (t.guest_name ?? t.guest_email ?? "Unknown")
                  )}
                  {!t.customer_id && (
                    <span className="ml-1.5 text-xs text-slate-400">(guest)</span>
                  )}
                </p>
                {t.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-xs text-slate-400">
                  {new Date(t.last_message_at).toLocaleString()}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ticketStatusBadgeClasses(
                    t.status
                  )}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${ticketStatusDotClasses(t.status)}`}
                  />
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
