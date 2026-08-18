"use client";

import { useActionState, useEffect } from "react";
import {
  generateConnectOnboardingLink,
  sendConnectOnboardingLinkEmail,
  type ConnectEmailState,
  type ConnectLinkState,
} from "./actions";

const linkInitialState: ConnectLinkState = {};
const emailInitialState: ConnectEmailState = {};

export function ConnectOnboardingActions({ customerId }: { customerId: string }) {
  const [linkState, linkAction, linkPending] = useActionState(
    generateConnectOnboardingLink,
    linkInitialState
  );
  const [emailState, emailAction, emailPending] = useActionState(
    sendConnectOnboardingLinkEmail,
    emailInitialState
  );

  useEffect(() => {
    if (linkState.url) {
      navigator.clipboard.writeText(linkState.url).catch(() => {});
    }
  }, [linkState.url]);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
      <form action={emailAction}>
        <input type="hidden" name="customerId" value={customerId} />
        <button
          type="submit"
          disabled={emailPending}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {emailPending ? "Sending…" : "Email onboarding link"}
        </button>
      </form>

      <form action={linkAction}>
        <input type="hidden" name="customerId" value={customerId} />
        <button
          type="submit"
          disabled={linkPending}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {linkPending ? "Generating…" : "Copy onboarding link"}
        </button>
      </form>

      {emailState.sentTo && (
        <span className="text-xs text-green-700">Sent to {emailState.sentTo}.</span>
      )}
      {emailState.error && <span className="text-xs text-red-600">{emailState.error}</span>}
      {linkState.url && !linkState.error && (
        <span className="text-xs text-green-700">
          Copied — this link expires in a few minutes, send it right away.
        </span>
      )}
      {linkState.error && <span className="text-xs text-red-600">{linkState.error}</span>}
    </div>
  );
}
