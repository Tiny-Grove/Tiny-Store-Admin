-- Human-readable plan/product name, separate from the existing `plan`
-- column (which stores the raw Stripe price ID and may be relied on
-- elsewhere, e.g. the CRM admin tooling).
alter table public.subscriptions
  add column if not exists plan_name text;
grant select (plan_name) on public.subscriptions to authenticated;
