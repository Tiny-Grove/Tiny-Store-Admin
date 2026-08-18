import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  syncSubscriptionsFromStripe,
  updateStoreInfo,
  uploadCustomerFavicon,
  uploadCustomerLogo,
} from "./actions";
import { restoreCustomer } from "./danger-zone-actions";
import { NewSubscriptionForm } from "./new-subscription-form";
import { InventoryList } from "./inventory-list";
import { RenewalsModal } from "./renewals-modal";
import { DangerZone } from "./danger-zone";
import { getRenewalCounts } from "@/lib/renewals";
import { getSiteUrl } from "@/lib/site-url";
import { getConnectAccountStatus } from "@/lib/stripe-connect-status";
import { CustomerTabs } from "./customer-tabs";

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

type CommunicationRow = {
  id: string;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
  email_batches: {
    subject: string;
    template_name: string;
    sent_by_email: string;
  } | null;
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createAdminClient();
  const [
    { data: customer },
    enabledPlans,
    { data: products },
    { data: industries },
    siteUrl,
    { data: communications },
  ] = await Promise.all([
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
    getSiteUrl(),
    supabase
      .from("email_batch_recipients")
      .select("id, status, error, created_at, email_batches(subject, template_name, sent_by_email)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .returns<CommunicationRow[]>(),
  ]);

  if (!customer) notFound();

  const currentUserSupabase = await createClient();
  const {
    data: { user: currentUser },
  } = await currentUserSupabase.auth.getUser();
  let isAdmin = false;
  if (currentUser?.email) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("role")
      .eq("email", currentUser.email.toLowerCase())
      .maybeSingle();
    isAdmin = adminRow?.role === "admin";
  }

  const inventory = products ?? [];
  const industryOptions = industries ?? [];
  const communicationsList = communications ?? [];

  const stripeSubscriptionIds = customer.subscriptions
    .map((sub) => sub.stripe_subscription_id)
    .filter((id): id is string => !!id);
  const renewalCounts =
    isStripeConfigured() && stripeSubscriptionIds.length > 0
      ? await getRenewalCounts(stripeSubscriptionIds)
      : new Map<string, number>();
  const renewalRows = customer.subscriptions
    .filter((sub) => sub.stripe_subscription_id)
    .map((sub) => ({
      id: sub.id,
      label: sub.plan_name ?? sub.plan,
      renewals: renewalCounts.get(sub.stripe_subscription_id!) ?? 0,
    }));
  const totalRenewals = renewalRows.reduce((sum, row) => sum + row.renewals, 0);

  const connectStatus = customer.stripe_connect_account_id
    ? await getConnectAccountStatus(
        customer.stripe_connect_account_id,
        customer.stripe_connect_charges_enabled
      )
    : null;

  const displayName = customer.name ?? customer.email;
  const activeSubscription =
    customer.subscriptions.find((sub) => sub.status === "active") ??
    customer.subscriptions[0];

  const storeUrl =
    siteUrl && customer.slug ? `${siteUrl}/store/${customer.slug}` : null;

  const subscriptionsTab = (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        {renewalRows.length > 0 && (
          <RenewalsModal rows={renewalRows} totalRenewals={totalRenewals} />
        )}
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
    </div>
  );

  const storeTab = (
    <div className="space-y-6">
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Country
              </label>
              <select
                name="country"
                defaultValue={customer.country ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">No industry set</option>
                {industryOptions.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Storefront slogan
            </label>
            <input
              name="slogan"
              defaultValue={customer.slogan ?? ""}
              placeholder="e.g. Fresh bakes, made daily"
              maxLength={120}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Shown under the store name on the public storefront, alongside
              the &quot;Created with ❤️ by Bizzlet&quot; footer line.
            </p>
          </div>

          {/* Kept in this form so one Save covers all core fields; styling
              lives in the Branding tab. */}
          <input type="hidden" name="primary_color" value={customer.primary_color ?? "#4f46e5"} />
          <input type="hidden" name="secondary_color" value={customer.secondary_color ?? "#0f172a"} />

          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            Save changes
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-medium text-slate-700">
          Storefront link
        </h3>
        {!customer.slug ? (
          <p className="text-sm text-slate-500">
            Not set up yet — the merchant picks their own storefront link
            from the mobile app.
          </p>
        ) : !storeUrl ? (
          <p className="text-sm text-amber-700">
            Slug is set to &quot;{customer.slug}&quot;, but storefront links
            aren&apos;t active until the storefront domain is set in
            Settings.
          </p>
        ) : (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium text-brand-600 hover:underline"
          >
            {storeUrl}
          </a>
        )}
      </div>
    </div>
  );

  const brandingTab = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <form action={updateStoreInfo} className="grid grid-cols-2 gap-4">
        <input type="hidden" name="customerId" value={customer.id} />
        <input type="hidden" name="name" value={customer.name ?? ""} />
        <input type="hidden" name="company" value={customer.company ?? ""} />
        <input type="hidden" name="country" value={customer.country ?? ""} />
        <input type="hidden" name="industry_id" value={customer.industry_id ?? ""} />
        <input type="hidden" name="slogan" value={customer.slogan ?? ""} />

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

        <div className="col-span-2">
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Save colors
          </button>
        </div>
      </form>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
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
            <form action={uploadCustomerLogo} className="flex-1 space-y-1.5">
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
          <h3 className="mb-2 text-sm font-medium text-slate-700">Favicon</h3>
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
            <form action={uploadCustomerFavicon} className="flex-1 space-y-1.5">
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
  );

  const paymentsTab = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          Stripe Connect (storefront payments)
        </h3>
        {connectStatus && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              connectStatus.chargesEnabled
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectStatus.chargesEnabled ? "bg-green-500" : "bg-amber-500"
              }`}
            />
            {connectStatus.chargesEnabled
              ? "Connected"
              : connectStatus.detailsSubmitted
                ? "Restricted"
                : "Onboarding incomplete"}
          </span>
        )}
      </div>

      {!customer.stripe_connect_account_id || !connectStatus ? (
        <p className="text-sm text-slate-500">
          Not connected yet — the merchant connects Stripe from the mobile
          app to accept storefront payments.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Account ID</dt>
              <dd className="mt-0.5 truncate font-mono text-xs font-medium text-slate-900">
                {customer.stripe_connect_account_id}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Charges enabled</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {connectStatus.chargesEnabled ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Payouts enabled</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {connectStatus.payoutsEnabled ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Onboarding</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {connectStatus.detailsSubmitted ? "Submitted" : "Incomplete"}
              </dd>
            </div>
          </dl>

          {connectStatus.requirementsDue > 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Stripe needs {connectStatus.requirementsDue} more{" "}
              {connectStatus.requirementsDue === 1 ? "item" : "items"} from
              the merchant before payments can go live.
            </p>
          )}

          {connectStatus.error && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Couldn&apos;t verify live status ({connectStatus.error}) —
              showing the last known state.
            </p>
          )}
        </>
      )}
    </div>
  );

  const inventoryTab = (
    <div>
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
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Description
            </label>
            <input
              name="description"
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
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
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
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
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
          >
            Add product
          </button>
        </form>
      </div>

      <InventoryList customerId={customer.id} products={inventory} />
    </div>
  );

  const communicationsTab = (
    <div>
      {communicationsList.length === 0 ? (
        <p className="text-sm text-slate-500">
          No emails sent to this customer yet — bulk template sends from the
          Emails section will show up here.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {communicationsList.map((c) => (
            <div key={c.id} className="px-4 py-3.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {c.email_batches?.subject ?? "(deleted template)"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.email_batches?.template_name ?? "Unknown template"} · sent
                    by {c.email_batches?.sent_by_email ?? "unknown"}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.status === "sent"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      c.status === "sent" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {c.status === "sent" ? "Sent" : "Failed"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {new Date(c.created_at).toLocaleString()}
              </p>
              {c.error && (
                <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
                  {c.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const dangerZoneTab = (
    <DangerZone
      customerId={customer.id}
      customerEmail={customer.email}
      isArchived={!!customer.deleted_at}
    />
  );

  const tabs = [
    { id: "subscriptions", label: "Subscriptions", content: subscriptionsTab },
    { id: "store", label: "Store", content: storeTab },
    { id: "branding", label: "Branding", content: brandingTab },
    { id: "payments", label: "Payments", content: paymentsTab },
    { id: "inventory", label: "Inventory", content: inventoryTab },
    { id: "communications", label: "Communications", content: communicationsTab },
    ...(isAdmin ? [{ id: "danger", label: "Danger zone", content: dangerZoneTab }] : []),
  ];

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

      {customer.deleted_at && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            This customer was archived on{" "}
            {new Date(customer.deleted_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            . It&apos;s hidden from the customer list and its storefront is
            offline.
          </p>
          {isAdmin && (
            <form action={restoreCustomer}>
              <input type="hidden" name="customerId" value={customer.id} />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
              >
                Restore
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-semibold text-white shadow-md shadow-brand-700/25">
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
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {activeSubscription.plan_name ?? activeSubscription.plan}
              </span>
            )}
          </div>
          <p className="text-slate-500">{customer.email}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {customer.company ? `${customer.company} · ` : ""}Customer since{" "}
            {new Date(customer.created_at).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <span className="text-2xl leading-none" title={customer.country ?? "No country set"}>
          {flagEmoji(customer.country)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CustomerTabs tabs={tabs} />
        </div>

        <aside className="animate-fade-in-up lg:col-span-1">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Notes</h2>
          <form action={addNote} className="mb-4 flex gap-2">
            <input type="hidden" name="customerId" value={customer.id} />
            <input
              name="body"
              placeholder="Add a note…"
              required
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow duration-150 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
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
