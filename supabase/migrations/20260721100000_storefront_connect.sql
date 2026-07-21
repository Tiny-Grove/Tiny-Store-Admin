-- Public merchant storefronts: a unique shareable slug per merchant, plus
-- their Stripe Connect (Express) account so storefront checkout revenue
-- settles directly to them, not to the platform's own Stripe account.
alter table public.customers
  add column if not exists slug text unique,
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false;

-- No RLS/grant changes: these columns are only ever read/written via the
-- service-role client (see src/lib/supabase/admin.ts and its established
-- "no public RLS policies, service-role reads server-side" convention).
