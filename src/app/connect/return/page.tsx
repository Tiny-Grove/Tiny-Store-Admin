"use client";

import { useEffect } from "react";

// Stripe's Account Links API only accepts real https URLs for return_url/
// refresh_url (it rejects custom app schemes outright — see the
// stripe-connect-onboarding edge function in the Tiny-Store repo), so this
// page exists purely to bounce the in-app browser back into the app via
// its custom scheme. expo-web-browser's openAuthSessionAsync watches for
// navigation to this exact URL and closes the browser when it sees it.
const APP_REDIRECT_URL = "tinystore://payment-gateways/callback";

export default function ConnectReturnPage() {
  useEffect(() => {
    window.location.replace(APP_REDIRECT_URL);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
      <p className="text-sm text-slate-600">Finishing up — taking you back to the app…</p>
      <a
        href={APP_REDIRECT_URL}
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        Tap here if you&apos;re not redirected automatically
      </a>
    </div>
  );
}
