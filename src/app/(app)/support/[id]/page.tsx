import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, SupportTicket, SupportTicketMessage } from "@/lib/supabase/types";
import { ticketStatusBadgeClasses, ticketStatusDotClasses } from "@/lib/ticket-status";
import { addTicketTag, removeTicketTag, replyToTicket, setTicketStatus } from "./actions";

const STATUS_OPTIONS = ["open", "pending", "resolved"];

type TicketDetail = SupportTicket & {
  customers: Pick<Customer, "id" | "email" | "name"> | null;
};

// Distinguishes a message that arrived as real inbound email (to
// support@bizzlet.com) from one sent through the app or the public web
// reply page.
function ChannelIcon({ channel }: { channel: "app" | "email" }) {
  if (channel === "email") {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-label="Sent by email">
        <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="m3 5.5 7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-label="Sent in the app">
      <path
        d="M3 5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.5L5 16.5V13.5H5a2 2 0 0 1-2-2v-6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
            {t.customers ? (
              <Link
                href={`/customers/${t.customers.id}?tab=communications`}
                className="font-medium text-brand-600 hover:underline"
              >
                {t.customers.name ?? t.customers.email}
              </Link>
            ) : (
              (t.guest_name ?? t.guest_email ?? "Unknown")
            )}
            {t.customers?.name && (
              <span className="text-slate-400"> · {t.customers.email}</span>
            )}
            {!t.customer_id && (
              <span className="ml-1.5 text-xs text-slate-400">(guest)</span>
            )}
          </p>
        </div>

        <form action={setTicketStatus.bind(null, t.id)} className="flex items-center gap-2">
          <select
            name="status"
            defaultValue={t.status}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
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

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ticketStatusBadgeClasses(
            t.status
          )}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${ticketStatusDotClasses(t.status)}`} />
          {t.status}
        </span>

        {t.tags.map((tag) => (
          <form key={tag} action={removeTicketTag} className="inline-flex">
            <input type="hidden" name="ticketId" value={t.id} />
            <input type="hidden" name="tag" value={tag} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
              title="Remove tag"
            >
              {tag}
              <span className="text-slate-400">×</span>
            </button>
          </form>
        ))}

        <form action={addTicketTag} className="inline-flex items-center gap-1">
          <input type="hidden" name="ticketId" value={t.id} />
          <input
            name="tag"
            placeholder="Add tag…"
            className="w-24 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
          >
            Add
          </button>
        </form>
      </div>

      {messageList.length === 0 ? (
        <p className="text-sm text-slate-500">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messageList.map((m, i) => {
            const isAdmin = m.author_type === "admin";
            return (
              <div
                key={m.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-fade-in-up max-w-[85%] rounded-xl border p-4 text-sm shadow-sm ${
                  isAdmin
                    ? "ml-auto border-brand-100 bg-brand-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <ChannelIcon channel={m.channel} />
                  {isAdmin ? "Admin" : "Customer"} · {m.author_email} ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <form action={replyToTicket} className="space-y-2">
        <input type="hidden" name="ticketId" value={t.id} />
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Write a reply…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Emailed to {t.customers?.email ?? t.guest_email ?? "the customer"}{" "}
            with a link back to this thread.
          </p>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            Send reply
          </button>
        </div>
      </form>
    </div>
  );
}
