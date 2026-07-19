"use client";

import { useActionState } from "react";
import { createCustomerInvite, type CreateCustomerState } from "./actions";

const initialState: CreateCustomerState = {};

export function NewCustomerForm() {
  const [state, formAction, pending] = useActionState(
    createCustomerInvite,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="customer@example.com"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          name="name"
          placeholder="Jane Doe"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Company
        </label>
        <input
          name="company"
          placeholder="Acme Ltd"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {state.error && (
        <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create & send invite"}
      </button>
    </form>
  );
}
