import "server-only";
import Mailgun from "mailgun.js";
import FormData from "form-data";
import type { Interfaces } from "mailgun.js/definitions";

const API_BASE_BY_REGION = {
  us: "https://api.mailgun.net",
  eu: "https://api.eu.mailgun.net",
} as const;

let client: Interfaces.IMailgunClient | null = null;

export function isMailgunConfigured() {
  return !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
}

export function getMailgunDomain(): string {
  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) throw new Error("MAILGUN_DOMAIN is not set");
  return domain;
}

export function getMailgunFrom(): string {
  return process.env.MAILGUN_FROM_EMAIL || `Bizzlet <postmaster@${getMailgunDomain()}>`;
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
