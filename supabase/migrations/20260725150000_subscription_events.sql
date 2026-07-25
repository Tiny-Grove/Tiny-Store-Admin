-- Logs subscription cancellations/reactivations from Stripe billing webhooks,
-- so the dashboard's churn count has a dated history instead of relying only
-- on the current (overwritable) subscriptions.status snapshot.
create type subscription_event_type as enum ('canceled', 'reactivated');

create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  event_type subscription_event_type not null,
  stripe_event_id text not null unique,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index subscription_events_customer_id_idx on subscription_events (customer_id);
create index subscription_events_occurred_at_idx on subscription_events (occurred_at);

alter table subscription_events enable row level security;
