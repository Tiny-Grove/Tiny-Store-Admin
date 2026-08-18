import "server-only";
import { getMailgunClient, getMailgunDomain, getMailgunFrom, isMailgunConfigured } from "@/lib/mailgun";
import { renderEmail } from "@/lib/email-render";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailLayout } from "@/lib/supabase/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Emails an admin's reply to the customer, with a link back to the public
// ticket thread. Best-effort — a delivery failure shouldn't stop the reply
// from being saved (the customer can still be helped by other means).
export async function sendTicketReplyEmail({
  to,
  subject,
  replyBody,
  ticketId,
}: {
  to: string;
  subject: string;
  replyBody: string;
  ticketId: string;
}) {
  if (!(await isMailgunConfigured())) return { sent: false, error: "Mailgun not configured" };

  const appUrl = process.env.APP_URL;
  if (!appUrl) return { sent: false, error: "APP_URL not set" };

  const admin = createAdminClient();
  const { data: layout } = await admin
    .from("email_layout")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  const layoutRow = layout as EmailLayout | null;

  const ticketUrl = `${appUrl}/tickets/${ticketId}`;
  const bodyHtml = `
    <p>${escapeHtml(replyBody).replace(/\n/g, "<br />")}</p>
    <p style="margin-top:24px;">
      <a href="${ticketUrl}" style="color:#0d7711;">View and reply to this ticket →</a>
    </p>
  `;

  const html = renderEmail({
    subject,
    bodyHtml,
    headerHtml: layoutRow?.header_html ?? "",
    footerHtml: layoutRow?.footer_html ?? "",
  });

  try {
    const mg = getMailgunClient();
    await mg.messages.create(await getMailgunDomain(), {
      from: await getMailgunFrom(),
      to: [to],
      subject,
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
