-- Per-merchant storefront slogan/tagline, shown under the store name in
-- place of the old static "Powered by Tiny Store" line (which moved to the
-- footer). Editable from the admin app; granted to authenticated to match
-- the other storefront-branding fields (see 20260720100000_setup_wizard_grants.sql),
-- which the mobile app also lets merchants edit directly.
alter table public.customers add column if not exists slogan text;

grant select (slogan) on public.customers to authenticated;
grant update (slogan) on public.customers to authenticated;
