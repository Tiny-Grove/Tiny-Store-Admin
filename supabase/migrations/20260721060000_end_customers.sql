-- Lightweight CRM: the merchant's own customers (distinct from `public.customers`,
-- which is the merchant/tenant record itself).
create table public.end_customers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.end_customers enable row level security;
revoke all on public.end_customers from anon, authenticated;

grant select (id, customer_id, name, phone, email, notes, created_at) on public.end_customers to authenticated;
grant insert (customer_id, name, phone, email, notes) on public.end_customers to authenticated;
grant update (name, phone, email, notes) on public.end_customers to authenticated;
grant delete on public.end_customers to authenticated;

create policy "Customers can view their own end customers"
  on public.end_customers for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can insert their own end customers"
  on public.end_customers for insert to authenticated
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can update their own end customers"
  on public.end_customers for update to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can delete their own end customers"
  on public.end_customers for delete to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));

alter table public.orders
  add column if not exists end_customer_id uuid references public.end_customers (id) on delete set null;

grant select (end_customer_id) on public.orders to authenticated;
grant insert (end_customer_id) on public.orders to authenticated;
grant update (end_customer_id) on public.orders to authenticated;
