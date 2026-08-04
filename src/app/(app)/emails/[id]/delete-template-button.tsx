"use client";

import { useState } from "react";
import { ModalShell } from "@/components/modal-shell";
import { deleteTemplate } from "../actions";

export function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        Delete template
      </button>

      {open && (
        <ModalShell title="Delete this template?" onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600">
            &quot;{templateName}&quot; will be permanently deleted. This
            doesn&apos;t affect emails already sent.
          </p>
          <form
            action={deleteTemplate.bind(null, templateId)}
            className="mt-4 flex justify-end gap-2"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Delete
            </button>
          </form>
        </ModalShell>
      )}
    </>
  );
}
