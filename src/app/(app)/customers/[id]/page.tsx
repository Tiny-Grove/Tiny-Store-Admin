import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Industry, Note, Product, Subscription } from "@/lib/supabase/types";
import { statusBadgeClasses, statusDotClasses } from "@/lib/status-badge";
import { isStripeConfigured } from "@/lib/stripe";
import { getEnabledPlans } from "@/lib/stripe-plans";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { formatMoney } from "@/lib/format";
import {
  addNote,
  addProduct,
  deleteProduct,
  resendInvite,
  syncSubscriptionsFromStripe,
  updateProduct,
  updateStoreInfo,
  uploadCustomerFavicon,
  uploadCustomerLogo,
} from "./actions";
import { NewSubscriptionForm } from "./new-subscription-form";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type CustomerDetail = Customer & {
  subscriptions: Subscription[];
  notes: Note[];
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite_email_error?: string }>;
}) {
  const { id } = await params;
  const { invite_email_error } = await searchParams;

  const supabase = createAdminClient();
  const [{ data: customer }, enabledPlans, { data: products }, { data: industries }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("*, subscriptions(*), notes(*)")
        .eq("id", id)
        .order("created_at", { referencedTable: "subscriptions", ascending: false })
        .order("created_at", { referencedTable: "notes", ascending: false })
        .maybeSingle<CustomerDetail>(),
      getEnabledPlans(),
      supabase
        .from("products")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .returns<Product[]>(),
      supabase.from("industries").select("*").order("name").returns<Industry[]>(),
    ]);

  if (!customer) notFound();

  const inventory = products ?? [];
  const industryOptions = industries ?? [];

  const displayName = customer.name ?? customer.email;
  const activeSubscription =
    customer.subscriptions.find((sub) => sub.status === "active") ??
    customer.subscriptions[0];

  return (
    <div className="space-y-8">
      <Link
        href="/customers"
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
        Customers
      </Link>

      {invite_email_error && (
        <p className="animate-fade-in rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Customer created, but the invite email failed to send. Use
          &quot;Resend invite&quot; below once Mailgun is configured correctly.
        </p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white shadow-md shadow-indigo-600/25">
          {initials(displayName)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {displayName}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                customer.account_status === "active"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {customer.account_status}
            </span>
            {activeSubscription && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {activeSubscription.plan_name ?? activeSubscription.plan}
              </span>
            )}
          </div>
          <p className="text-slate-500">{customer.email}</p>
          {customer.company && (
            <p className="text-sm text-slate-400">{customer.company}</p>
          )}
          {customer.account_status === "invited" && (
            <form action={resendInvite.bind(null, customer.id)} className="mt-2">
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Resend invite
              </button>
            </form>
          )}
        </div>

        <span className="text-2xl leading-none" title={customer.country ?? "No country set"}>
          {flagEmoji(customer.country)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">

      <section className="animate-fade-in-up">
        <h2 className="mb-3 text-lg font-medium text-slate-900">
          Store information
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form action={updateStoreInfo} className="space-y-4">
            <input type="hidden" name="customerId" value={customer.id} />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Country
              </label>
              <select
                name="country"
                defaultValue={customer.country ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">No country set</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Industry
              </label>
              <select
                name="industry_id"
                defaultValue={customer.industry_id ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">No industry set</option>
                {industryOptions.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Primary color
                </label>
                <input
                  type="color"
                  name="primary_color"
                  defaultValue={customer.primary_color ?? "#4f46e5"}
                  className="h-10 w-14 cursor-pointer rounded border border-slate-200"
                />
              </div>
              <div>
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
              Save changes
            </button>
          </form>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Logo</h3>
              <div className="flex items-center gap-3">
                {customer.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customer.logo_url}
                    alt="Logo"
                    className="h-12 w-12 rounded-lg border border-slate-200 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                    None
                  </div>
                )}
                <form
                  action={uploadCustomerLogo}
                  className="flex-1 space-y-1.5"
                >
                  <input type="hidden" name="customerId" value={customer.id} />
                  <input
                    type="file"
                    name="logo"
                    accept="image/*"
                    required
                    className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Upload
                  </button>
                </form>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                Favicon
              </h3>
              <div className="flex items-center gap-3">
                {customer.favicon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customer.favicon_url}
                    alt="Favicon"
                    className="h-12 w-12 rounded-lg border border-slate-200 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                    None
                  </div>
                )}
                <form
                  action={uploadCustomerFavicon}
                  className="flex-1 space-y-1.5"
                >
                  <input type="hidden" name="customerId" value={customer.id} />
                  <input
                    type="file"
                    name="favicon"
                    accept="image/*"
                    required
                    className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Upload
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-fade-in-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Subscriptions</h2>
          {isStripeConfigured() && customer.stripe_customer_id && (
            <form action={syncSubscriptionsFromStripe.bind(null, customer.id)}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Sync from Stripe
              </button>
            </form>
          )}
        </div>

        {isStripeConfigured() && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <NewSubscriptionForm customerId={customer.id} plans={enabledPlans} />
          </div>
        )}

        {customer.subscriptions.length === 0 ? (
          <p className="text-sm text-slate-500">No subscriptions.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {customer.subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-4 py-3.5 text-sm transition-colors duration-150 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {sub.plan_name ?? sub.plan}
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses(
                      sub.status
                    )}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusDotClasses(
                        sub.status
                      )}`}
                    />
                    {sub.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">
                    {formatMoney(sub.amount_cents)}
                  </p>
                  {sub.current_period_end && (
                    <p className="text-slate-500">
                      renews{" "}
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "75ms" }}>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Inventory</h2>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            action={addProduct}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_2fr_100px_90px_auto] sm:items-end"
          >
            <input type="hidden" name="customerId" value={customer.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Name
              </label>
              <input
                name="name"
                required
                placeholder="Product name"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Description
              </label>
              <input
                name="description"
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Price (£)
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Stock
              </label>
              <input
                name="stock_count"
                type="number"
                min="0"
                defaultValue={0}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
            >
              Add product
            </button>
          </form>
        </div>

        {inventory.length === 0 ? (
          <p className="text-sm text-slate-500">No products yet.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs font-medium tracking-wide text-slate-400 uppercase sm:flex">
              <span className="w-12 shrink-0" />
              <span className="flex-1">Name</span>
              <span className="flex-2">Description</span>
              <span className="w-24">Price</span>
              <span className="w-20">Stock</span>
              <span className="w-16" />
            </div>
            <div className="divide-y divide-slate-100">
              {inventory.map((product) => (
                <div
                  key={product.id}
                  className="flex items-start gap-3 px-4 py-3 text-sm"
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400">
                      None
                    </div>
                  )}

                  <form
                    action={updateProduct}
                    className="flex flex-1 flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="customerId" value={customer.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <input
                      name="name"
                      defaultValue={product.name}
                      required
                      className="min-w-30 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      name="description"
                      defaultValue={product.description ?? ""}
                      placeholder="Description"
                      className="min-w-35 flex-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(product.price_cents / 100).toFixed(2)}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      name="stock_count"
                      type="number"
                      min="0"
                      defaultValue={product.stock_count}
                      title="Stock"
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      Save
                    </button>
                  </form>

                  <form action={deleteProduct}>
                    <input type="hidden" name="customerId" value={customer.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      </div>

      <aside className="animate-fade-in-up lg:col-span-1" style={{ animationDelay: "150ms" }}>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Notes</h2>
        <form action={addNote} className="mb-4 flex gap-2">
          <input type="hidden" name="customerId" value={customer.id} />
          <input
            name="body"
            placeholder="Add a note…"
            required
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow duration-150 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
          >
            Add
          </button>
        </form>

        {customer.notes.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {customer.notes.map((note, i) => (
              <li
                key={note.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-in-up rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <p className="text-slate-800">{note.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {note.author_email} ·{" "}
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>

      </div>
    </div>
  );
}
