import { redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { updateColors, uploadFavicon, uploadLogo } from "./actions";

export default async function BrandingPage() {
  const customer = await getPortalCustomer();
  if (!customer) redirect("/portal/login");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Branding</h1>
        <p className="text-sm text-slate-500">
          Your storefront&apos;s colors, logo, and favicon.
        </p>
      </div>

      <form
        action={updateColors}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-medium text-slate-900">Brand colors</h2>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Primary color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="primary_color"
                defaultValue={customer.primary_color ?? "#4f46e5"}
                className="h-10 w-14 cursor-pointer rounded border border-slate-200"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Secondary color
            </label>
            <input
              type="color"
              name="secondary_color"
              defaultValue={customer.secondary_color ?? "#0f172a"}
              className="h-10 w-14 cursor-pointer rounded border border-slate-200"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
        >
          Save colors
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-medium text-slate-900">Logo</h2>
        <div className="flex items-center gap-4">
          {customer.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customer.logo_url}
              alt="Logo"
              className="h-16 w-16 rounded-lg border border-slate-200 object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
              None
            </div>
          )}
          <form action={uploadLogo} className="flex-1">
            <input
              type="file"
              name="logo"
              accept="image/*"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            <button
              type="submit"
              className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Upload logo
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-medium text-slate-900">Favicon</h2>
        <div className="flex items-center gap-4">
          {customer.favicon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customer.favicon_url}
              alt="Favicon"
              className="h-10 w-10 rounded-lg border border-slate-200 object-contain p-1"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
              None
            </div>
          )}
          <form action={uploadFavicon} className="flex-1">
            <input
              type="file"
              name="favicon"
              accept="image/*"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            <button
              type="submit"
              className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Upload favicon
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
