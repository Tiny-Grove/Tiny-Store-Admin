-- Swapping the email provider from Mailgun to Mailtrap. Mailtrap's API has
-- no separate "sending domain" parameter (the domain is implied by the
-- verified From address), so mailgun_domain is dropped; mailgun_from_email
-- is renamed to the provider-agnostic mail_from_email.
alter table public.site_settings drop column mailgun_domain;
alter table public.site_settings rename column mailgun_from_email to mail_from_email;
