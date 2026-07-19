import { createAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/customer-invite";
import { ActivatePasswordForm } from "./activate-password-form";
import { activateWithGoogle } from "./actions";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isInviteExpired(invitedAt: string | null | undefined) {
  return !invitedAt || Date.now() - new Date(invitedAt).getTime() > INVITE_TTL_MS;
}

const ERROR_MESSAGES: Record<string, string> = {
  mismatch:
    "That Google account's email doesn't match the invited address. Sign in with the email the invite was sent to.",
  oauth_init_failed: "Couldn't start Google sign-in. Please try again.",
};

export default async function ActivatePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("email, invited_at, account_status")
    .eq("invite_token_hash", hashInviteToken(token))
    .maybeSingle();

  const expired = isInviteExpired(customer?.invited_at);

  const valid = !!customer && !expired && customer.account_status === "invited";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-4 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-semibold text-white shadow-lg shadow-indigo-600/30">
            T
          </div>
        </div>

        {!valid ? (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-900">
              Invalid or expired link
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Ask Tiny Store to resend your invitation.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-lg font-semibold text-slate-900">
              Activate your account
            </h1>
            <p className="mt-1 mb-6 text-center text-sm text-slate-500">
              {customer.email}
            </p>

            {error && (
              <p className="mb-4 animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
              </p>
            )}

            <ActivatePasswordForm token={token} />

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form action={activateWithGoogle.bind(null, token)}>
              <button
                type="submit"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
