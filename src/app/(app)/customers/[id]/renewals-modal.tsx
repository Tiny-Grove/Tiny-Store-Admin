"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface RenewalRow {
  id: string;
  label: string;
  renewals: number;
}

export function RenewalsModal({
  rows,
  totalRenewals,
}: {
  rows: RenewalRow[];
  totalRenewals: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        Renewals: {totalRenewals}
      </button>

      {open &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Subscription renewals"
              onClick={(event) => event.stopPropagation()}
              className="animate-scale-in w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Renewals</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                    <path
                      d="M5 5l10 10M15 5 5 15"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No Stripe-linked subscriptions to report on yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="text-slate-700">{row.label}</span>
                      <span className="font-medium text-slate-900">
                        {row.renewals} renewal{row.renewals === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-xs text-slate-400">
                Counted from paid Stripe invoices per subscription, excluding
                the initial payment.
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
