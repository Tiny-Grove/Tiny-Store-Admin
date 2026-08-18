import "server-only";
import { cache } from "react";
import Mailgun from "mailgun.js";
import FormData from "form-data";
import type { Interfaces } from "mailgun.js/definitions";
import { createAdminClient } from "@/lib/supabase/admin";

const API_BASE_BY_REGION = {
  us: "https://api.mailgun.net",
  eu: "https://api.eu.mailgun.net",
} as const;

let client: Interfaces.IMailgunClient | null = null;

// The sending domain and From address — editable from Settings (site_settings
// table) so they no longer need a redeploy to change. Falls back to the
// MAILGUN_DOMAIN / MAILGUN_FROM_EMAIL env vars for environments that
// haven't set them in the UI yet. Cached per-request since a single send
// can ask for both values.
const getMailgunSettings = cache(async () => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("mailgun_domain, mailgun_from_email")
    .eq("id", 1)
    .maybeSingle<{ mailgun_domain: string | null; mailgun_from_email: string | null }>();

  return {
    domain: data?.mailgun_domain?.trim() || process.env.MAILGUN_DOMAIN || null,
    from: data?.mailgun_from_email?.trim() || process.env.MAILGUN_FROM_EMAIL || null,
  };
});

export async function isMailgunConfigured() {
  const { domain } = await getMailgunSettings();
  return !!(process.env.MAILGUN_API_KEY && domain);
}

export async function getMailgunDomain(): Promise<string> {
  const { domain } = await getMailgunSettings();
  if (!domain) throw new Error("Mailgun sending domain is not set");
  return domain;
}

export async function getMailgunFrom(): Promise<string> {
  const { from } = await getMailgunSettings();
  if (from) return from;
  return `Bizzlet <postmaster@${await getMailgunDomain()}>`;
}

// Server-only Mailgun client — never import this from client components.
export function getMailgunClient() {
  if (!process.env.MAILGUN_API_KEY) {
    throw new Error("MAILGUN_API_KEY is not set");
  }
  if (!client) {
    const region = process.env.MAILGUN_REGION === "eu" ? "eu" : "us";
    const mailgun = new Mailgun(FormData);
    client = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
      url: API_BASE_BY_REGION[region],
    });
  }
  return client;
}
