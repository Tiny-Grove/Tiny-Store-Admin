-- Tracks which Stripe recurring Prices are "enabled" for use in Tiny Store
-- Admin. Plan details (name, amount, interval) are always read live from the
-- Stripe API — this table only stores the on/off toggle per price, keyed by
-- Stripe's price ID. A price with no row here is treated as disabled.
create table stripe_plan_settings (
  stripe_price_id text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table stripe_plan_settings enable row level security;
