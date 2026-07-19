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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Support</h1>

      {tickets.length === 0 ? (
        <p className="text-sm text-slate-500">
          No support tickets yet — they&apos;ll show up here once customers
          submit one from the app.
        </p>
      ) : (
        <div className="animate-fade-in-up divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="flex items-center justify-between px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{t.subject}</p>
                <p className="text-slate-500">
                  {t.customers?.name ?? t.customers?.email ?? "Unknown customer"}
                </p>
              </div>
              <div className="flex items-center gap-4">
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
