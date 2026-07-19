"use client";

import { useActionState } from "react";
import { handleSend, type SendState } from "./actions";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
  { value: "none", label: "No subscription" },
];

const initialState: SendState = { phase: "form" };

export function SendForm({ templateId }: { templateId: string }) {
  const [state, formAction, pending] = useActionState(handleSend, initialState);
  const checkedStatuses = state.statuses ?? STATUS_OPTIONS.map((s) => s.value);

  if (state.phase === "sent") {
    return (
      <div className="animate-fade-in rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-900">Send complete</h2>
        <p className="mt-2 text-sm text-slate-600">
          {state.sentCount} of {state.matchedCount} recipients handed off to
          Mailgun successfully
          {!!state.failedCount &&
            ` — ${state.failedCount} failed (see error details in Emails history).`}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="templateId" value={templateId} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-slate-700">
          Send to customers whose status is:
        </p>
        <div className="flex flex-wrap gap-3">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="status"
                value={opt.value}
                defaultChecked={checkedStatuses.includes(opt.value)}
                className="accent-indigo-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Customers who&apos;ve unsubscribed are always excluded.
        </p>
      </div>

      {state.error && (
        <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.phase === "previewed" && (
        <div className="animate-fade-in rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-900">
            {state.matchedCount} recipient{state.matchedCount === 1 ? "" : "s"} match
          </p>
          {!!state.sampleEmails?.length && (
            <p className="mt-1 text-xs text-indigo-700">
              e.g. {state.sampleEmails.join(", ")}
              {(state.matchedCount ?? 0) > state.sampleEmails.length && "…"}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          name="intent"
          value="preview"
          disabled={pending}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
        >
          Preview recipients
        </button>

        {state.phase === "previewed" && (state.matchedCount ?? 0) > 0 && (
          <button
            type="submit"
            name="intent"
            value="confirm"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0 disabled:opacity-60"
          >
            {pending ? "Sending…" : `Confirm & send to ${state.matchedCount}`}
          </button>
        )}
      </div>
    </form>
  );
}
