-- GoCardless is being replaced by Stripe Connect (see storefront_connect
-- migration). No customer ever completed a GoCardless connection
-- (gocardless_connected_at was null for every row at removal time), so this
-- is a clean drop with no data loss.
drop table if exists public.gocardless_oauth_states;
drop table if exists public.gocardless_platform_config;

alter table public.customers
  drop column if exists gocardless_organisation_id,
  drop column if exists gocardless_creditor_name,
  drop column if exists gocardless_access_token,
  drop column if exists gocardless_environment,
  drop column if exists gocardless_connected_at;

-- The mobile app's Payment Gateways screen needs to read Stripe Connect
-- status directly (it was previously service-role-only, since it was only
-- ever read from the web portal's server-side pages).
grant select (slug, stripe_connect_charges_enabled) on public.customers to authenticated;
