"use client";

import { useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { renderEmail } from "@/lib/email-render";
import { saveFooter, saveHeader } from "./actions";

const PREVIEW_BODY_HTML =
  "<p>This is a placeholder for the email body — every template's content renders here, between the header and footer.</p>";

export function EmailLayoutEditors({
  initialHeaderHtml,
  initialFooterHtml,
}: {
  initialHeaderHtml: string;
  initialFooterHtml: string;
}) {
  const [headerHtml, setHeaderHtml] = useState(initialHeaderHtml);
  const [footerHtml, setFooterHtml] = useState(initialFooterHtml);
  const [previewing, setPreviewing] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section
        className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        style={{ animationDelay: "75ms" }}
      >
        <h2 className="font-medium text-slate-900">Global header</h2>
        <p className="mt-1 text-sm text-slate-500">
          Shown at the top of every email. Must be a complete{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            &lt;tr&gt;...&lt;/tr&gt;
          </code>{" "}
          row — it carries its own cell and styling.
        </p>
        <form action={saveHeader} className="mt-3 space-y-2">
          <textarea
            name="header_html"
            value={headerHtml}
            onChange={(e) => setHeaderHtml(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Save header
            </button>
            <button
              type="button"
              onClick={() => setPreviewing(true)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Preview
            </button>
          </div>
        </form>
      </section>

      <section
        className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="font-medium text-slate-900">Global footer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Appended to every email. Must be a complete{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            &lt;tr&gt;...&lt;/tr&gt;
          </code>{" "}
          row. Use{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            %recipient.unsubscribe_url%
          </code>{" "}
          to keep the unsubscribe link working.
        </p>
        <form action={saveFooter} className="mt-3 space-y-2">
          <textarea
            name="footer_html"
            value={footerHtml}
            onChange={(e) => setFooterHtml(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Save footer
            </button>
            <button
              type="button"
              onClick={() => setPreviewing(true)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Preview
            </button>
          </div>
        </form>
      </section>

      {previewing && (
        <ModalShell
          title="Email preview"
          onClose={() => setPreviewing(false)}
          maxWidthClassName="max-w-2xl"
        >
          <p className="mb-3 text-xs text-slate-400">
            Shows your unsaved header/footer edits with placeholder body
            content, exactly as they&apos;ll wrap a real template.
          </p>
          <iframe
            title="Email preview"
            srcDoc={renderEmail({
              subject: "Preview",
              bodyHtml: PREVIEW_BODY_HTML,
              headerHtml,
              footerHtml,
            })}
            className="h-[28rem] w-full rounded-lg border border-slate-200"
          />
        </ModalShell>
      )}
    </div>
  );
}
