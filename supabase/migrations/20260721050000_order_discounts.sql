-- Discounts on a sale. `amount_cents` stays the final charged total (so
-- existing revenue sums on the dashboard keep working unmodified);
-- `subtotal_cents` is the pre-discount amount, kept for the receipt breakdown.
alter table public.orders
  add column if not exists subtotal_cents integer,
  add column if not exists discount_type text,
  add column if not exists discount_value numeric;

update public.orders set subtotal_cents = amount_cents where subtotal_cents is null;
alter table public.orders alter column subtotal_cents set not null;

alter table public.orders
  add constraint orders_discount_type_check check (discount_type is null or discount_type in ('percent', 'fixed'));

grant select (subtotal_cents, discount_type, discount_value) on public.orders to authenticated;
grant insert (subtotal_cents, discount_type, discount_value) on public.orders to authenticated;
grant update (subtotal_cents, discount_type, discount_value) on public.orders to authenticated;
