-- Low-stock alerts + barcode lookup for the inventory scan flow.
alter table public.products
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists barcode text;
grant select (low_stock_threshold, barcode) on public.products to authenticated;
grant insert (low_stock_threshold, barcode) on public.products to authenticated;
grant update (low_stock_threshold, barcode) on public.products to authenticated;
