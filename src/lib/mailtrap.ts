import "server-only";
import { cache } from "react";
import { MailtrapClient } from "mailtrap";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MailFrom {
  email: string;
  name?: string;
}

// The From address — editable from Settings (site_settings table) so it no
// longer needs a redeploy to change. Falls back to the MAIL_FROM_EMAIL env
// var. Mailtrap has no separate "sending domain" API parameter — the
// domain is implied by this address and must be verified in your Mailtrap
// account. Cached per-request since a single send asks for it more than
// once.
const getMailFromRaw = cache(async (): Promise<string | null> => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("mail_from_email")
    .eq("id", 1)
    .maybeSingle<{ mail_from_email: string | null }>();

  return data?.mail_from_email?.trim() || process.env.MAIL_FROM_EMAIL || null;
});

// Parses "Name <email@domain.com>" or a bare "email@domain.com" into the
// {email, name} shape Mailtrap's SDK expects.
function parseFrom(raw: string): MailFrom {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1].trim();
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: raw.trim() };
}

export async function getMailFrom(): Promise<MailFrom | null> {
  const raw = await getMailFromRaw();
  return raw ? parseFrom(raw) : null;
}

export async function isMailtrapConfigured() {
  const from = await getMailFromRaw();
  return !!(process.env.MAILTRAP_API_TOKEN && from);
}

function requireToken(): string {
  const token = process.env.MAILTRAP_API_TOKEN;
  if (!token) throw new Error("MAILTRAP_API_TOKEN is not set");
  return token;
}

let transactionalClient: MailtrapClient | null = null;
let bulkClient: MailtrapClient | null = null;

// For one-off sends to a single recipient (e.g. a support ticket reply).
// Server-only — never import this from client components.
export function getTransactionalClient() {
  if (!transactionalClient) {
    transactionalClient = new MailtrapClient({ token: requireToken() });
  }
  return transactionalClient;
}

// For sends to a customer list — Mailtrap's bulk stream is built for
// higher-volume, marketing-style mail.
export function getBulkClient() {
  if (!bulkClient) {
    bulkClient = new MailtrapClient({ token: requireToken(), bulk: true });
  }
  return bulkClient;
}
