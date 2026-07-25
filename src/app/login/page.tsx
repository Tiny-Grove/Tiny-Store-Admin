import { signInWithGoogle } from "./actions";
import { Logo } from "@/components/logo";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    "Access denied — you must sign in with an authorized tinygrove.co.uk account.",
  oauth_init_failed: "Couldn't start Google sign-in. Please try again.",
  auth_failed: "Sign-in failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-xl -translate-x-1/2 rounded-full bg-linear-to-br from-brand-200 via-brand-100 to-transparent opacity-60 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-scale-in rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <Logo className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-xl font-semibold text-slate-900">Tiny Store Admin</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Sign in with your tinygrove.co.uk account.
        </p>

        {error && (
          <p className="mb-4 animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth_failed}
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signInWithGoogle(callbackUrl ?? "/");
          }}
        >
          <button
            type="submit"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:scale-110"
            >
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
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
