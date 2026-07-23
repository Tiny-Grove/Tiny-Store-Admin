import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, SupportTicket, SupportTicketMessage } from "@/lib/supabase/types";
import { ticketStatusBadgeClasses, ticketStatusDotClasses } from "@/lib/ticket-status";
import { replyToTicket, setTicketStatus } from "./actions";

const STATUS_OPTIONS = ["open", "pending", "resolved"];

type TicketDetail = SupportTicket & {
  customers: Pick<Customer, "id" | "email" | "name"> | null;
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    admin.from("support_tickets").select("*, customers(id, email, name)").eq("id", id).maybeSingle(),
    admin.from("support_ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
  ]);

  if (!ticket) notFound();
  const t = ticket as TicketDetail;
  const messageList = (messages ?? []) as SupportTicketMessage[];

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/support"
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
        Support
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t.subject}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.customers?.name ?? t.customers?.email ?? "Unknown customer"}
            {t.customers?.name && (
              <span className="text-slate-400"> · {t.customers.email}</span>
            )}
          </p>
        </div>

        <form action={setTicketStatus.bind(null, t.id)} className="flex items-center gap-2">
          <select
            name="status"
            defaultValue={t.status}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Update
          </button>
        </form>
      </div>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ticketStatusBadgeClasses(
          t.status
        )}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${ticketStatusDotClasses(t.status)}`} />
        {t.status}
      </span>

      <div className="space-y-3">
        {messageList.map((m) => {
          const isAdmin = m.author_type === "admin";
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-xl border p-4 text-sm shadow-sm ${
                isAdmin
                  ? "ml-auto border-sky-100 bg-sky-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
              <p className="mt-2 text-xs text-slate-400">
                {isAdmin ? "Admin" : "Customer"} · {m.author_email} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      <form action={replyToTicket} className="space-y-2">
        <input type="hidden" name="ticketId" value={t.id} />
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Write a reply…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Emailed to {t.customers?.email ?? "the customer"} with a link back
            to this thread.
          </p>
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md active:translate-y-0"
          >
            Send reply
          </button>
        </div>
      </form>
    </div>
  );
}
