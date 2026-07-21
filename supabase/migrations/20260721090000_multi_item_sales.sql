-- Cart checkout support: one Record Sale submission now produces one
-- `orders` row per product line, all sharing a client-generated `sale_id`,
-- so they can be grouped back into a single transaction for the order list,
-- sale detail view, receipt, and refund/delete — without touching the
-- existing per-line revenue aggregation the dashboard already relies on.
alter table public.orders
  add column if not exists sale_id uuid not null default gen_random_uuid();

create index if not exists orders_sale_id_idx on public.orders (sale_id);

grant select (sale_id) on public.orders to authenticated;
grant insert (sale_id) on public.orders to authenticated;
