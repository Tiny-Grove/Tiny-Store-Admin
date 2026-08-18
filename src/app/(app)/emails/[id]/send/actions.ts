"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBulkClient, getMailFrom, isMailtrapConfigured } from "@/lib/mailtrap";
import { renderEmail } from "@/lib/email-render";
import type { EmailLayout, EmailTemplate } from "@/lib/supabase/types";

// Mailtrap's batch endpoint caps requests at 500 messages per call.
const MAILTRAP_BATCH_SIZE = 500;

// Substitutes the %recipient.x% tokens admins write into template bodies
// (see the Emails page hint text) — done locally rather than via Mailtrap's
// own {{ }} template_variables, so existing templates keep working
// unchanged across the provider swap.
function renderForRecipient(
  html: string,
  vars: { name: string; email: string; unsubscribe_url: string }
) {
  return html
    .replace(/%recipient\.name%/g, vars.name)
    .replace(/%recipient\.email%/g, vars.email)
    .replace(/%recipient\.unsubscribe_url%/g, vars.unsubscribe_url);
}

export interface SendState {
  phase: "form" | "previewed" | "sent";
  error?: string;
  matchedCount?: number;
  sampleEmails?: string[];
  sentCount?: number;
  failedCount?: number;
  statuses?: string[];
}

interface Recipient {
  id: string;
  email: string;
  name: string | null;
}

async function getRecipients(statuses: string[]): Promise<Recipient[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("id, email, name, subscriptions(status)")
    .eq("email_opt_out", false);

  type Row = {
    id: string;
    email: string;
    name: string | null;
    subscriptions: { status: string }[];
  };
  const rows = (data ?? []) as Row[];

  return rows
    .filter((c) => {
      if (c.subscriptions.length === 0) return statuses.includes("none");
      return c.subscriptions.some((s) => statuses.includes(s.status));
    })
    .map((c) => ({ id: c.id, email: c.email, name: c.name }));
}

export async function handleSend(
  _prevState: SendState,
  formData: FormData
): Promise<SendState> {
  const templateId = formData.get("templateId") as string;
  const intent = formData.get("intent") as string;
  const statuses = formData.getAll("status") as string[];

  if (statuses.length === 0) {
    return {
      phase: "form",
      error: "Choose at least one recipient group.",
      statuses,
    };
  }

  const recipients = await getRecipients(statuses);

  if (intent === "preview") {
    return {
      phase: "previewed",
      matchedCount: recipients.length,
      sampleEmails: recipients.slice(0, 5).map((r) => r.email),
      statuses,
    };
  }

  if (!(await isMailtrapConfigured())) {
    return { phase: "form", error: "Mailtrap isn't configured.", statuses };
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return {
      phase: "form",
      error: "Set APP_URL in your environment before sending (needed for unsubscribe links).",
      statuses,
    };
  }

  if (recipients.length === 0) {
    return { phase: "form", error: "No matching recipients.", statuses };
  }

  const admin = createAdminClient();
  const [{ data: template }, { data: layout }] = await Promise.all([
    admin.from("email_templates").select("*").eq("id", templateId).maybeSingle(),
    admin.from("email_layout").select("*").eq("id", true).maybeSingle(),
  ]);

  if (!template) return { phase: "form", error: "Template not found.", statuses };

  const t = template as EmailTemplate;
  const layoutRow = layout as EmailLayout | null;

  const html = renderEmail({
    subject: t.subject,
    bodyHtml: t.body_html,
    headerHtml: layoutRow?.header_html ?? "",
    footerHtml: layoutRow?.footer_html ?? "",
  });

  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const { data: batch } = await admin
    .from("email_batches")
    .insert({
      template_id: t.id,
      template_name: t.name,
      subject: t.subject,
      sent_by_email: user?.email ?? "unknown",
      recipient_count: recipients.length,
    })
    .select("id")
    .single();

  const batchId = batch?.id as string | undefined;

  const client = getBulkClient();
  const from = await getMailFrom();
  if (!from) return { phase: "form", error: "Mailtrap From address not set.", statuses };

  let sentCount = 0;
  let failedCount = 0;
  const recipientRows: {
    batch_id: string;
    customer_id: string;
    email: string;
    status: "sent" | "failed";
    error: string | null;
  }[] = [];

  for (let i = 0; i < recipients.length; i += MAILTRAP_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + MAILTRAP_BATCH_SIZE);

    try {
      const result = await client.batchSend({
        base: { from, subject: t.subject },
        requests: chunk.map((r) => ({
          to: [{ email: r.email }],
          html: renderForRecipient(html, {
            name: r.name ?? r.email,
            email: r.email,
            unsubscribe_url: `${appUrl}/unsubscribe/${r.id}`,
          }),
        })),
      });

      chunk.forEach((r, idx) => {
        const item = result.responses[idx];
        const succeeded = item?.success ?? false;
        if (succeeded) sentCount += 1;
        else failedCount += 1;
        if (batchId) {
          recipientRows.push({
            batch_id: batchId,
            customer_id: r.id,
            email: r.email,
            status: succeeded ? "sent" : "failed",
            error: succeeded ? null : (item?.errors?.join(", ") ?? "Send failed"),
          });
        }
      });
    } catch (err) {
      failedCount += chunk.length;
      const message = err instanceof Error ? err.message : "Send failed";
      if (batchId) {
        for (const r of chunk) {
          recipientRows.push({
            batch_id: batchId,
            customer_id: r.id,
            email: r.email,
            status: "failed",
            error: message,
          });
        }
      }
    }
  }

  if (recipientRows.length > 0) {
    await admin.from("email_batch_recipients").insert(recipientRows);
  }

  return {
    phase: "sent",
    matchedCount: recipients.length,
    sentCount,
    failedCount,
  };
}
