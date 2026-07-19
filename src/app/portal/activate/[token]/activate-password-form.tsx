"use client";

import { useActionState } from "react";
import { activateWithPassword, type ActivateState } from "./actions";

const initialState: ActivateState = {};

export function ActivatePasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    activateWithPassword,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Choose a password"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />
      <input
        name="confirm"
        type="password"
        required
        minLength={8}
        placeholder="Confirm password"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />

      {state.error && (
        <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Activating…" : "Activate account"}
      </button>
    </form>
  );
}
