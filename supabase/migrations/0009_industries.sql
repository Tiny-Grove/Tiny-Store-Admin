-- Admin-managed list of industries a customer's business can be tagged
-- with. The list starts empty and grows as admins add new entries from the
-- customer profile page — there's no fixed enum the way country codes are.
create table industries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table industries enable row level security;

alter table customers add column industry_id uuid references industries (id) on delete set null;
