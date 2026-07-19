import { redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { updateBusinessDetails } from "./actions";

export default async function BusinessPage() {
  const customer = await getPortalCustomer();
  if (!customer) redirect("/portal/login");

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        Business details
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        This is what Tiny Store&apos;s admin team sees for your account.
      </p>

      <form
        action={updateBusinessDetails}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contact name
          </label>
          <input
            name="name"
            defaultValue={customer.name ?? ""}
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Business name
          </label>
          <input
            name="company"
            defaultValue={customer.company ?? ""}
            placeholder="Acme Ltd"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            disabled
            value={customer.email}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
