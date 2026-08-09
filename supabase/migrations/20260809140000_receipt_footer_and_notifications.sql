-- Item 2 (editable invoice footer text) + item 5 (in-app notification inbox)
-- from the receipt/notifications feature batch. Slogan (customers.slogan)
-- and its authenticated select/update grants already exist from the
-- externally-applied "customer_slogan" migration; only the footer text
-- column and the notifications table are new here.

alter table public.customers
  add column if not exists receipt_footer_text text;

grant select (receipt_footer_text) on public.customers to authenticated;
grant update (receipt_footer_text) on public.customers to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_customer_id_created_at_idx
  on public.notifications (customer_id, created_at desc);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;

-- Rows are only ever inserted by the admin backend's service-role client
-- (ticket replies, storefront sales, etc.) — the mobile app can only read
-- its own notifications and mark them read.
grant select (
  id, customer_id, type, title, body, data, read_at, created_at
) on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Customers can view their own notifications"
  on public.notifications for select to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "Customers can mark their own notifications read"
  on public.notifications for update to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
