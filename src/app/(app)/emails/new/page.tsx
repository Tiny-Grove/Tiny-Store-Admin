import Link from "next/link";
import { createTemplate } from "../actions";

export default function NewTemplatePage() {
  return (
    <div className="max-w-2xl space-y-6">
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

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New template</h1>
        <p className="mt-1 text-sm text-slate-500">
          The fixed Tiny Store header and global footer are added
          automatically — just write the body.
        </p>
      </div>

      <form action={createTemplate} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Welcome email"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Subject
          </label>
          <input
            name="subject"
            required
            placeholder="e.g. Welcome to Tiny Store, %recipient.name%"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Body (HTML)
          </label>
          <textarea
            name="body_html"
            rows={12}
            placeholder="<p>Hi %recipient.name%,</p>"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-xs text-slate-400">
            Use %recipient.name% / %recipient.email% for personalization —
            Mailgun fills these in per recipient when sending.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
        >
          Create template
        </button>
      </form>
    </div>
  );
}
