"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getMailgunClient,
  getMailgunDomain,
  getMailgunFrom,
  isMailgunConfigured,
} from "@/lib/mailgun";
import { renderEmail } from "@/lib/email-render";
import type { EmailLayout, EmailTemplate } from "@/lib/supabase/types";

const MAILGUN_BATCH_SIZE = 1000;

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

  if (!isMailgunConfigured()) {
    return { phase: "form", error: "Mailgun isn't configured.", statuses };
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

  const mg = getMailgunClient();
  const domain = getMailgunDomain();
  const from = getMailgunFrom();

  let sentCount = 0;
  let failedCount = 0;
  const recipientRows: {
    batch_id: string;
    customer_id: string;
    email: string;
    status: "sent" | "failed";
    error: string | null;
  }[] = [];

  for (let i = 0; i < recipients.length; i += MAILGUN_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + MAILGUN_BATCH_SIZE);
    const recipientVariables: Record<string, { name: string; unsubscribe_url: string }> = {};
    for (const r of chunk) {
      recipientVariables[r.email] = {
        name: r.name ?? r.email,
        unsubscribe_url: `${appUrl}/unsubscribe/${r.id}`,
      };
    }

    try {
      await mg.messages.create(domain, {
        from,
        to: chunk.map((r) => r.email),
        subject: t.subject,
        html,
        "recipient-variables": JSON.stringify(recipientVariables),
      });
      sentCount += chunk.length;
      if (batchId) {
        for (const r of chunk) {
          recipientRows.push({
            batch_id: batchId,
            customer_id: r.id,
            email: r.email,
            status: "sent",
            error: null,
          });
        }
      }
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
