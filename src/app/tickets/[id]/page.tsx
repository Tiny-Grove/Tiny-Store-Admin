import { createAdminClient } from "@/lib/supabase/admin";
import type { SupportTicket, SupportTicketMessage } from "@/lib/supabase/types";
import { ticketStatusBadgeClasses, ticketStatusDotClasses } from "@/lib/ticket-status";
import { addCustomerReply } from "./actions";

export default async function PublicTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    admin.from("support_tickets").select("*").eq("id", id).maybeSingle(),
    admin
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const t = ticket as SupportTicket | null;
  const messageList = (messages ?? []) as SupportTicketMessage[];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-600/25">
            T
          </div>
          <span className="text-base font-semibold text-slate-900">
            Tiny Store Support
          </span>
        </div>

        {!t ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Ticket not found
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This link is invalid or the ticket no longer exists.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-lg font-semibold text-slate-900">
                  {t.subject}
                </h1>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ticketStatusBadgeClasses(
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

            <div className="space-y-3">
              {messageList.map((m) => {
                const isAdmin = m.author_type === "admin";
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-xl border p-4 text-sm shadow-sm ${
                      isAdmin
                        ? "border-slate-200 bg-white"
                        : "ml-auto border-indigo-100 bg-indigo-50"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {isAdmin ? "Tiny Store Support" : "You"} ·{" "}
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {t.status !== "resolved" && (
              <form
                action={addCustomerReply.bind(null, t.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <textarea
                  name="body"
                  required
                  rows={4}
                  placeholder="Write a reply…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
