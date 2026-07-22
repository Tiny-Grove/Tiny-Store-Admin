-- GoCardless Connect: each merchant links their own GoCardless account so
-- payments from their customers settle directly with them.
alter table public.customers
  add column if not exists gocardless_organisation_id text,
  add column if not exists gocardless_creditor_name text,
  add column if not exists gocardless_access_token text,
  add column if not exists gocardless_environment text,
  add column if not exists gocardless_connected_at timestamptz;
-- Only the non-sensitive display fields are readable by the app; the access
-- token is written and read exclusively by the edge functions (service role,
-- which bypasses these grants) and must never reach the client.
grant select (
  gocardless_organisation_id, gocardless_creditor_name, gocardless_connected_at
) on public.customers to authenticated;
-- Short-lived CSRF state for the OAuth authorization-code flow. Only the
-- edge functions (service role) touch this table, so it gets no grants at
-- all — RLS with no policies denies every client-side request outright.
create table public.gocardless_oauth_states (
  state text primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.gocardless_oauth_states enable row level security;
revoke all on public.gocardless_oauth_states from anon, authenticated;
