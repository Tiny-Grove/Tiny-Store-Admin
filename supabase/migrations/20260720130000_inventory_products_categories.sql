-- Categories are per-merchant and created on the fly from the app.
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (customer_id, name)
);
alter table public.product_categories enable row level security;
-- Extend the existing (pre-existing, CRM-owned) products table for inventory management.
alter table public.products
  add column if not exists category_id uuid references public.product_categories (id) on delete set null,
  add column if not exists product_code text,
  add column if not exists stock_count integer not null default 0;
update public.products set product_code = 'unset-' || id::text where product_code is null;
alter table public.products alter column product_code set not null;
alter table public.products add constraint products_customer_id_product_code_key unique (customer_id, product_code);
-- Lock both tables down to "owner reads/writes only", same pattern as customers/subscriptions:
-- these tables carry full raw anon/authenticated grants from Supabase's schema defaults, with
-- RLS (enabled, zero policies) as the only current protection.
revoke all on public.products from anon, authenticated;
revoke all on public.product_categories from anon, authenticated;
grant select (
  id, customer_id, name, description, price_cents, currency, image_url,
  category_id, product_code, stock_count, created_at, updated_at
) on public.products to authenticated;
grant insert (
  customer_id, name, description, price_cents, currency, image_url,
  category_id, product_code, stock_count
) on public.products to authenticated;
grant update (
  name, description, price_cents, currency, image_url,
  category_id, product_code, stock_count
) on public.products to authenticated;
grant delete on public.products to authenticated;
grant select (id, customer_id, name, created_at) on public.product_categories to authenticated;
grant insert (customer_id, name) on public.product_categories to authenticated;
grant update (name) on public.product_categories to authenticated;
grant delete on public.product_categories to authenticated;
create policy "Customers can view their own products"
  on public.products for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can insert their own products"
  on public.products for insert to authenticated
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can update their own products"
  on public.products for update to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can delete their own products"
  on public.products for delete to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can view their own categories"
  on public.product_categories for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can insert their own categories"
  on public.product_categories for insert to authenticated
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can update their own categories"
  on public.product_categories for update to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can delete their own categories"
  on public.product_categories for delete to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
-- Product image uploads, scoped to the caller's own folder (same shape as the logos policies).
create policy "Customers can upload their own product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'products'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "Customers can replace their own product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'products'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'products'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
