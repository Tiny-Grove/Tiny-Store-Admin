-- Tiny Store Admin — initial schema.
-- All application tables are queried only from trusted server code using the
-- service role key (see src/lib/supabase/admin.ts), which bypasses RLS.
-- RLS is enabled with NO policies on every table below, so the public anon
-- key — the only key ever exposed to the browser — has zero access even if
-- it leaked or a client-side query were added by mistake.

create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type admin_role as enum ('admin', 'staff');

create table customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  plan text not null,
  status subscription_status not null default 'trialing',
  amount_cents integer not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Allowlist of who may sign in to this admin app. Sign-in requires an active
-- row here in addition to the tinygrove.co.uk domain check (see
-- src/app/auth/callback/route.ts) — being on the Workspace domain alone is
-- not sufficient.
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role admin_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_customer_id_idx on subscriptions (customer_id);
create index notes_customer_id_idx on notes (customer_id);

alter table customers enable row level security;
alter table subscriptions enable row level security;
alter table notes enable row level security;
alter table admin_users enable row level security;

insert into admin_users (email, role) values ('trevinl@tinygrove.co.uk', 'admin');
