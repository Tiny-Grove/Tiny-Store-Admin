import Link from "next/link";
import { getStripe, getStripeMode, isStripeConfigured } from "@/lib/stripe";
import { getMailgunClient, getMailgunDomain, isMailgunConfigured } from "@/lib/mailgun";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser, Industry } from "@/lib/supabase/types";
import { addAdminUser, addIndustry, toggleAdminUserActive, updateAdminUserRole } from "./actions";

async function getStripeStatus() {
  if (!isStripeConfigured()) {
    return { connected: false, mode: null as "test" | "live" | null, error: null as string | null };
  }

  try {
    await getStripe().balance.retrieve();
    return { connected: true, mode: getStripeMode(), error: null as string | null };
  } catch (err) {
    return {
      connected: false,
      mode: getStripeMode(),
      error: err instanceof Error ? err.message : "Couldn't reach Stripe",
    };
  }
}

async function getMailgunStatus() {
  if (!isMailgunConfigured()) {
    return { connected: false, error: null as string | null };
  }

  try {
    await getMailgunClient().domains.get(getMailgunDomain());
    return { connected: true, error: null as string | null };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Couldn't reach Mailgun",
    };
  }
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [stripeStatus, mailgunStatus, { data: industries }, { data: adminUsers }] =
    await Promise.all([
      getStripeStatus(),
      getMailgunStatus(),
      createAdminClient().from("industries").select("*").order("name").returns<Industry[]>(),
      createAdminClient()
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: true })
        .returns<AdminUser[]>(),
    ]);
  const industryOptions = industries ?? [];
  const admins = adminUsers ?? [];
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "tinygrove.co.uk";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "Not configured";
  const siteUrl = process.env.PUBLIC_SITE_URL;
  const mailgunDomain = process.env.MAILGUN_DOMAIN || "Not set";
  const mailgunFrom = process.env.MAILGUN_FROM_EMAIL || "Not set";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Integrations, access control, and platform configuration.
        </p>
      </div>

      <div className="space-y-4">
        <section className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-medium text-slate-900">Stripe</h2>
              <p className="mt-1 text-sm text-slate-500">
                Powers the Subscriptions section.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                stripeStatus.connected
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  stripeStatus.connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {stripeStatus.connected ? "Connected" : "Not connected"}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Mode</dt>
              <dd
                className={`mt-0.5 font-medium capitalize ${
                  stripeStatus.mode === "live"
                    ? "text-amber-600"
                    : "text-slate-900"
                }`}
              >
                {stripeStatus.mode ?? "—"}
                {stripeStatus.mode === "live" && " ⚠"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Checkout redirect</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-900">
                {siteUrl || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Manage plans</dt>
              <dd className="mt-0.5">
                <Link
                  href="/subscriptions"
                  className="font-medium text-brand-600 hover:underline"
                >
                  Subscriptions →
                </Link>
              </dd>
            </div>
          </dl>

          {!stripeStatus.connected && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {stripeStatus.error ??
                "Add STRIPE_SECRET_KEY to your environment variables to connect Stripe."}
            </p>
          )}

          {stripeStatus.connected && !siteUrl && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Set PUBLIC_SITE_URL to Tiny Store&apos;s customer-facing site
              before creating subscription checkout links — customers can&apos;t
              sign in to this admin app, so it can&apos;t be used as the
              redirect target.
            </p>
          )}
        </section>

        <section
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "75ms" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-medium text-slate-900">Mailgun</h2>
              <p className="mt-1 text-sm text-slate-500">
                Powers the Emails section.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                mailgunStatus.connected
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  mailgunStatus.connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {mailgunStatus.connected ? "Connected" : "Not connected"}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Sending domain</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-900">
                {mailgunDomain}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">From address</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-900">
                {mailgunFrom}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Manage templates</dt>
              <dd className="mt-0.5">
                <Link
                  href="/emails"
                  className="font-medium text-brand-600 hover:underline"
                >
                  Emails →
                </Link>
              </dd>
            </div>
          </dl>

          {!mailgunStatus.connected && (
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {mailgunStatus.error ??
                "Add MAILGUN_API_KEY and MAILGUN_DOMAIN to your environment variables to connect Mailgun."}
            </p>
          )}
        </section>

        <section
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "150ms" }}
        >
          <h2 className="font-medium text-slate-900">Access control</h2>
          <p className="mt-1 text-sm text-slate-500">
            Google sign-in is restricted to this Workspace domain and to
            active rows in the admin allowlist below. The{" "}
            <span className="font-medium">admin</span> role can reach
            Settings, Finance, and Analytics; <span className="font-medium">staff</span>{" "}
            can&apos;t.
          </p>
          <dl className="mt-4 text-sm">
            <dt className="text-slate-500">Allowed domain</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {allowedDomain}
            </dd>
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-medium text-slate-700">
              Admin users
            </h3>
            {admins.length === 0 ? (
              <p className="text-sm text-slate-500">No admin users yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {admins.map((admin) => {
                  const isSelf = admin.email === currentUser?.email?.toLowerCase();
                  return (
                    <div
                      key={admin.id}
                      className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm"
                    >
                      <span className="flex-1 truncate font-medium text-slate-900">
                        {admin.email}
                        {isSelf && (
                          <span className="ml-1.5 text-xs font-normal text-slate-400">
                            (you)
                          </span>
                        )}
                      </span>

                      <form action={updateAdminUserRole} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={admin.id} />
                        <select
                          name="role"
                          defaultValue={admin.role}
                          disabled={isSelf}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </form>

                      <form action={toggleAdminUserActive}>
                        <input type="hidden" name="id" value={admin.id} />
                        <input type="hidden" name="active" value={String(admin.active)} />
                        <button
                          type="submit"
                          disabled={isSelf}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            admin.active
                              ? "bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-700"
                              : "bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-700"
                          }`}
                        >
                          {admin.active ? "Active" : "Deactivated"}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}

            <form action={addAdminUser} className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Add an admin user
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder={`name@${allowedDomain}`}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <select
                name="role"
                defaultValue="staff"
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Add
              </button>
            </form>
          </div>
        </section>

        <section
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "225ms" }}
        >
          <h2 className="font-medium text-slate-900">Industries</h2>
          <p className="mt-1 text-sm text-slate-500">
            Options available on a customer&apos;s Industry field.
          </p>

          {industryOptions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No industries yet.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {industryOptions.map((industry) => (
                <li
                  key={industry.id}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                >
                  {industry.name}
                </li>
              ))}
            </ul>
          )}

          <form action={addIndustry} className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Add a new industry
              </label>
              <input
                name="name"
                placeholder="e.g. Homeware"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Add to list
            </button>
          </form>
        </section>

        <section
          className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ animationDelay: "300ms" }}
        >
          <h2 className="font-medium text-slate-900">Database</h2>
          <p className="mt-1 text-sm text-slate-500">
            Supabase project backing this app.
          </p>
          <dl className="mt-4 text-sm">
            <dt className="text-slate-500">Project URL</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-900">
              {supabaseUrl}
            </dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
