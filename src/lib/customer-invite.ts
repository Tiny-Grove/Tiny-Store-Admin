import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { getMailgunClient, getMailgunDomain, getMailgunFrom, isMailgunConfigured } from "@/lib/mailgun";
import { renderEmail } from "@/lib/email-render";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailLayout } from "@/lib/supabase/types";

const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken() {
  const raw = randomBytes(INVITE_TOKEN_BYTES).toString("hex");
  return { raw, hash: hashInviteToken(raw) };
}

export function hashInviteToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

// Best-effort — a delivery failure shouldn't block creating the invite
// itself (an admin can always resend from the customer page).
export async function sendInviteEmail({
  to,
  name,
  rawToken,
}: {
  to: string;
  name: string | null;
  rawToken: string;
}) {
  if (!isMailgunConfigured()) return { sent: false, error: "Mailgun not configured" };

  const appUrl = process.env.APP_URL;
  if (!appUrl) return { sent: false, error: "APP_URL not set" };

  const admin = createAdminClient();
  const { data: layout } = await admin
    .from("email_layout")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  const layoutRow = layout as EmailLayout | null;

  const activateUrl = `${appUrl}/portal/activate/${rawToken}`;
  const greeting = name ? `Hi ${name},` : "Hi,";

  const bodyHtml = `
    <p>${greeting}</p>
    <p>An account has been set up for you on Tiny Store. Activate it to get started:</p>
    <p style="margin:24px 0;">
      <a href="${activateUrl}" style="background-color:#4f46e5; color:#ffffff; padding:10px 20px; border-radius:8px; text-decoration:none; display:inline-block;">Activate your account</a>
    </p>
    <p style="color:#64748b; font-size:13px;">This link expires in 7 days.</p>
  `;

  const html = renderEmail({
    subject: "Activate your Tiny Store account",
    bodyHtml,
    headerHtml: layoutRow?.header_html ?? "",
    footerHtml: layoutRow?.footer_html ?? "",
  });

  try {
    const mg = getMailgunClient();
    await mg.messages.create(getMailgunDomain(), {
      from: getMailgunFrom(),
      to: [to],
      subject: "Activate your Tiny Store account",
      html,
    });
    return { sent: true, error: null };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}
