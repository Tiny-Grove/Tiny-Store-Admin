-- Mailgun sending domain and From address, editable from Settings instead
-- of only via the MAILGUN_DOMAIN / MAILGUN_FROM_EMAIL env vars (which need
-- a redeploy to change), following the site_url pattern in site_settings.
alter table public.site_settings
  add column mailgun_domain text,
  add column mailgun_from_email text;
