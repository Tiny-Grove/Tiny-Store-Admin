-- Customer self-service portal: admin-invited accounts, branding, and a
-- product catalog. Customers authenticate via the same Supabase Auth
-- instance as admins, linked to their customers row via auth_user_id —
-- app code (middleware + portal layout) is what keeps the two user classes
-- apart, since a customer and an admin can now both hold a valid session.

alter table customers add column auth_user_id uuid unique references auth.users (id) on delete set null;
alter table customers add column account_status text not null default 'invited' check (account_status in ('invited', 'active'));
alter table customers add column invite_token_hash text;
alter table customers add column invited_at timestamptz;
alter table customers add column activated_at timestamptz;
alter table customers add column primary_color text;
alter table customers add column secondary_color text;
alter table customers add column logo_url text;
alter table customers add column favicon_url text;

create table products (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'gbp',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_customer_id_idx on products (customer_id);

alter table products enable row level security;

-- Public bucket for logos/favicons/product images — all access goes through
-- the service-role client server-side (uploads via portal Server Actions,
-- reads via the public URL Supabase Storage serves directly), so no
-- object-level policies are needed the way RLS-gated tables need them.
insert into storage.buckets (id, name, public)
values ('customer-assets', 'customer-assets', true)
on conflict (id) do nothing;
