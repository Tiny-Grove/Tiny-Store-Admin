export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type AdminRole = "admin" | "staff";
export type AccountStatus = "invited" | "active" | "suspended";

export interface Customer {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripe_customer_id: string | null;
  country: string | null;
  email_opt_out: boolean;
  auth_user_id: string | null;
  account_status: AccountStatus;
  payment_failed_at: string | null;
  invite_token_hash: string | null;
  invited_at: string | null;
  activated_at: string | null;
  platform: string | null;
  platform_version: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  slogan: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  industry_id: string | null;
  slug: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
  currency: string;
  expo_push_token: string | null;
  receipt_footer_text: string | null;
  storefront_banner_url: string | null;
  storefront_about: string | null;
  storefront_whatsapp: string | null;
  storefront_instagram_url: string | null;
  storefront_facebook_url: string | null;
  storefront_website_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Industry {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  customer_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  stock_count: number;
  product_code: string;
  category_id: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  customer_id: string;
  name: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan: string;
  plan_name: string | null;
  status: SubscriptionStatus;
  amount_cents: number;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionEventType = "canceled" | "reactivated";

export interface SubscriptionEvent {
  id: string;
  subscription_id: string;
  customer_id: string;
  event_type: SubscriptionEventType;
  stripe_event_id: string;
  occurred_at: string;
  created_at: string;
}

export interface Note {
  id: string;
  customer_id: string;
  author_email: string;
  body: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: number;
  site_url: string | null;
  mail_from_email: string | null;
  updated_at: string;
}

export interface StripePlanSetting {
  stripe_price_id: string;
  enabled: boolean;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
}

export interface EmailLayout {
  id: boolean;
  header_html: string;
  footer_html: string;
  updated_at: string;
}

export interface EmailBatch {
  id: string;
  template_id: string | null;
  template_name: string;
  subject: string;
  sent_by_email: string;
  recipient_count: number;
  created_at: string;
}

export type EmailBatchRecipientStatus = "sent" | "failed";

export interface EmailBatchRecipient {
  id: string;
  batch_id: string;
  customer_id: string | null;
  email: string;
  status: EmailBatchRecipientStatus;
  error: string | null;
  created_at: string;
}

export type TicketStatus = "open" | "pending" | "resolved";
export type TicketAuthor = "customer" | "admin";
export type TicketChannel = "app" | "email";

export interface SupportTicket {
  id: string;
  customer_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  subject: string;
  status: TicketStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  author_type: TicketAuthor;
  author_email: string;
  body: string;
  channel: TicketChannel;
  external_message_id: string | null;
  created_at: string;
}

// Mobile app's in-app notification inbox — rows are only ever written by
// this admin's service-role client (see 20260809140000_receipt_footer_and_notifications.sql).
export type NotificationType = "ticket_reply" | "new_order";

export interface Notification {
  id: string;
  customer_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}
