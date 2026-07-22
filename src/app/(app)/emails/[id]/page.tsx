import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailLayout, EmailTemplate } from "@/lib/supabase/types";
import { renderEmail } from "@/lib/email-render";
import { deleteTemplate } from "../actions";
import { updateTemplate } from "./actions";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const [{ data: template }, { data: layout }] = await Promise.all([
    admin.from("email_templates").select("*").eq("id", id).maybeSingle(),
    admin.from("email_layout").select("*").eq("id", true).maybeSingle(),
  ]);

  if (!template) notFound();

  const t = template as EmailTemplate;
  const layoutRow = layout as EmailLayout | null;

  const previewHtml = renderEmail({
    subject: t.subject,
    bodyHtml: t.body_html || "<p></p>",
    headerHtml: layoutRow?.header_html ?? "",
    footerHtml: layoutRow?.footer_html ?? "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/emails"
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
          Emails
        </Link>

        <div className="flex gap-2">
          <Link
            href={`/emails/${t.id}/send`}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md active:translate-y-0"
          >
            Send this template →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form action={updateTemplate} className="space-y-4">
          <input type="hidden" name="id" value={t.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              name="name"
              required
              defaultValue={t.name}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              name="subject"
              required
              defaultValue={t.subject}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Body (HTML)
            </label>
            <textarea
              name="body_html"
              rows={16}
              defaultValue={t.body_html}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Use %recipient.name% / %recipient.email% for personalization.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md active:translate-y-0"
            >
              Save changes
            </button>
          </div>
        </form>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">
            Preview <span className="font-normal text-slate-400">(last saved version)</span>
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              sandbox=""
              className="h-150 w-full"
            />
          </div>
        </div>
      </div>

      <form action={deleteTemplate.bind(null, t.id)} className="pt-4">
        <button
          type="submit"
          className="text-sm text-red-600 hover:underline"
        >
          Delete template
        </button>
      </form>
    </div>
  );
}
