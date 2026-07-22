-- Platform admin flag: gates the in-app screen for configuring Tiny Store's
-- own GoCardless Partner app credentials (a one-time, whole-platform setup,
-- distinct from each merchant's own GoCardless account connection).
alter table public.customers
  add column if not exists is_platform_admin boolean not null default false;
grant select (is_platform_admin) on public.customers to authenticated;
-- One-time seed: mark the Tiny Store owner's account as platform admin, if
-- it already exists. If they haven't signed up yet, flip it manually later:
--   update public.customers set is_platform_admin = true where email = '...';
update public.customers set is_platform_admin = true where email = 'trevinl@tinygrove.co.uk';
-- Platform-wide GoCardless Partner app configuration — a single row for the
-- whole app, not per merchant. No client grants at all: only the service
-- role (edge functions) can read or write this. The admin screen goes
-- through the admin-gocardless-settings edge function, which re-checks
-- is_platform_admin server-side before touching it — RLS with no policies
-- is just defense in depth against a client hitting the table directly.
create table public.gocardless_platform_config (
  id integer primary key default 1,
  client_id text,
  client_secret text,
  webhook_secret text,
  environment text not null default 'sandbox',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.customers (id),
  constraint gocardless_platform_config_singleton check (id = 1)
);
alter table public.gocardless_platform_config enable row level security;
revoke all on public.gocardless_platform_config from anon, authenticated;
