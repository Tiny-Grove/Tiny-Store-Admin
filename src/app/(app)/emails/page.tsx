import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMailtrapConfigured } from "@/lib/mailtrap";
import type { EmailBatch, EmailLayout, EmailTemplate } from "@/lib/supabase/types";
import { EmailLayoutEditors } from "./email-layout-editors";

export default async function EmailsPage() {
  const admin = createAdminClient();

  const [{ data: templates }, { data: layout }, { data: batches }, mailtrapConfigured] =
    await Promise.all([
      admin
        .from("email_templates")
        .select("*")
        .order("updated_at", { ascending: false }),
      admin.from("email_layout").select("*").eq("id", true).maybeSingle(),
      admin
        .from("email_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      isMailtrapConfigured(),
    ]);

  const templateList = (templates ?? []) as EmailTemplate[];
  const layoutRow = layout as EmailLayout | null;
  const batchList = (batches ?? []) as EmailBatch[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Emails</h1>
          <p className="mt-1 text-sm text-slate-500">
            Templates you can send to customers via Mailtrap.
          </p>
        </div>
        <Link
          href="/emails/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          New template
        </Link>
      </div>

      {!mailtrapConfigured && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Mailtrap isn&apos;t connected yet.{" "}
          <Link href="/settings" className="underline">
            Set it up in Settings
          </Link>{" "}
          before sending.
        </p>
      )}

      <section className="animate-fade-in-up">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Templates</h2>
        {templateList.length === 0 ? (
          <p className="text-sm text-slate-500">
            No templates yet — create one to get started.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {templateList.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
              >
                <div>
                  <Link
                    href={`/emails/${t.id}`}
                    className="font-medium text-slate-900 hover:text-brand-600"
                  >
                    {t.name}
                  </Link>
                  <p className="text-slate-500">{t.subject}</p>
                </div>
                <Link
                  href={`/emails/${t.id}/send`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Send →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <EmailLayoutEditors
        initialHeaderHtml={layoutRow?.header_html ?? ""}
        initialFooterHtml={layoutRow?.footer_html ?? ""}
      />

      <section
        className="animate-fade-in-up"
        style={{ animationDelay: "175ms" }}
      >
        <h2 className="mb-3 text-lg font-medium text-slate-900">
          Recent sends
        </h2>
        {batchList.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing sent yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Recipients</th>
                  <th className="px-4 py-3">Sent by</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {batchList.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {b.template_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{b.subject}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {b.recipient_count}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {b.sent_by_email}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
