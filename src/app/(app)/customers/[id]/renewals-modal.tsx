"use client";

import { useState } from "react";
import { ModalShell } from "@/components/modal-shell";

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        Renewals: {totalRenewals}
      </button>

      {open && (
        <ModalShell title="Renewals" onClose={() => setOpen(false)}>
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
            Counted from paid Stripe invoices per subscription, excluding the
            initial payment.
          </p>
        </ModalShell>
      )}
    </>
  );
}
