create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  amount_cents integer not null,
  currency text not null default 'gbp',
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
-- Same pattern as products/product_categories: revoke the wide-open default
-- grants, then narrow select/insert/update to just the needed columns
-- (customer_id included — required for the RLS predicate itself).
revoke all on public.orders from anon, authenticated;
grant select (
  id, customer_id, product_id, product_name, quantity, amount_cents, currency, sold_at, created_at
) on public.orders to authenticated;
grant insert (
  customer_id, product_id, product_name, quantity, amount_cents, currency, sold_at
) on public.orders to authenticated;
grant update (
  product_id, product_name, quantity, amount_cents, currency, sold_at
) on public.orders to authenticated;
grant delete on public.orders to authenticated;
create policy "Customers can view their own orders"
  on public.orders for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can insert their own orders"
  on public.orders for insert to authenticated
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can update their own orders"
  on public.orders for update to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can delete their own orders"
  on public.orders for delete to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
