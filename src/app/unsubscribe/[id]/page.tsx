import { createAdminClient } from "@/lib/supabase/admin";
import { confirmUnsubscribe } from "./actions";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const { done } = await searchParams;

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("email, email_opt_out")
    .eq("id", id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white shadow-lg shadow-brand-600/30">
          T
        </div>

        {!customer ? (
          <>
            <h1 className="text-lg font-semibold text-slate-900">
              Link not found
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This unsubscribe link is invalid or has expired.
            </p>
          </>
        ) : done || customer.email_opt_out ? (
          <>
            <h1 className="text-lg font-semibold text-slate-900">
              You&apos;re unsubscribed
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {customer.email} won&apos;t receive further emails from Tiny
              Store.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-slate-900">
              Unsubscribe?
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Stop sending emails to <strong>{customer.email}</strong>?
            </p>
            <form action={confirmUnsubscribe.bind(null, id)} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0"
              >
                Unsubscribe
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
