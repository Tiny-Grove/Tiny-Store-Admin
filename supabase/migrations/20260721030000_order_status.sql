-- Order management: track whether a sale is still standing or was refunded,
-- so the order list can filter by it and a refund can be told apart from a
-- plain delete (which doesn't attempt any stock reconciliation).
alter table public.orders
  add column if not exists status text not null default 'completed';

alter table public.orders
  add constraint orders_status_check check (status in ('completed', 'refunded'));

grant select (status) on public.orders to authenticated;
grant insert (status) on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
