// Return/refresh destination for Stripe Connect onboarding links an admin
// generates and sends directly to a merchant (see
// generateConnectOnboardingLink / sendConnectOnboardingLinkEmail in
// customers/[id]/actions.ts). Unlike /connect/return, this link could be
// opened anywhere — a phone without the app installed, a desktop browser —
// so it's just a plain confirmation page with no app-redirect attempt.
export default function ConnectCompletePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
        ✓
      </div>
      <h1 className="text-lg font-semibold text-slate-900">
        Thanks — you&apos;re all set for now
      </h1>
      <p className="max-w-sm text-sm text-slate-600">
        Stripe is reviewing the details you submitted. You can close this
        page — we&apos;ll be in touch if anything else is needed.
      </p>
    </div>
  );
}
