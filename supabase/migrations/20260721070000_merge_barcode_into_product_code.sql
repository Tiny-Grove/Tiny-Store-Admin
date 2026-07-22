-- product_code and barcode were the same concept in practice (a scannable
-- SKU) — consolidate onto product_code and drop the separate column. The
-- products table has no rows yet, so no backfill is needed.
alter table public.products drop column if exists barcode;
