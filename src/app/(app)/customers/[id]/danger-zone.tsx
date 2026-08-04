"use client";

import { useActionState, useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { archiveCustomer, hardDeleteCustomer } from "./danger-zone-actions";

function ArchiveButton({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
      >
        Archive customer
      </button>

      {open && (
        <ModalShell title="Archive this customer?" onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600">
            They&apos;ll disappear from the customer list and their public
            storefront will go offline. Nothing is deleted — you can restore
            them anytime from the archived customers view.
          </p>
          <form action={archiveCustomer} className="mt-4 flex justify-end gap-2">
            <input type="hidden" name="customerId" value={customerId} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Archive
            </button>
          </form>
        </ModalShell>
      )}
    </>
  );
}

function HardDeleteButton({
  customerId,
  customerEmail,
}: {
  customerId: string;
  customerEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [state, formAction, isPending] = useActionState(hardDeleteCustomer, null);
  const matches = confirmValue.trim().toLowerCase() === customerEmail.toLowerCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        Permanently delete customer
      </button>

      {open && (
        <ModalShell title="Permanently delete this customer?" onClose={() => setOpen(false)}>
          <div className="space-y-3 text-sm text-slate-600">
            <p>This cannot be undone. It will permanently delete:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>Their subscriptions, notes, inventory, and orders</li>
              <li>Support tickets and messages</li>
              <li>Uploaded logo, favicon, and product images</li>
              <li>Their mobile app login</li>
            </ul>
            <p>
              Any active Stripe subscription will be canceled first. Their
              underlying Stripe customer and Connect account are left alone.
            </p>
          </div>

          <form action={formAction} className="mt-4 space-y-3">
            <input type="hidden" name="customerId" value={customerId} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Type <span className="font-mono">{customerEmail}</span> to confirm
              </label>
              <input
                name="confirmEmail"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                autoComplete="off"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!matches || isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

export function DangerZone({
  customerId,
  customerEmail,
  isArchived,
}: {
  customerId: string;
  customerEmail: string;
  isArchived: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {!isArchived && <ArchiveButton customerId={customerId} />}
        <HardDeleteButton customerId={customerId} customerEmail={customerEmail} />
      </div>
    </div>
  );
}
