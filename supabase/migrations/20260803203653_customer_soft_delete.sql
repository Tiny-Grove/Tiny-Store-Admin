-- Soft delete ("archive") for customers, kept as its own timestamp column
-- rather than folded into account_status ('invited' | 'active') so the
-- existing onboarding-status badges don't need to special-case a third
-- value. A customer with deleted_at set is hidden from the admin customer
-- list and its public storefront/checkout, but every related row is left
-- intact and fully restorable.
alter table public.customers add column if not exists deleted_at timestamptz;

create index if not exists customers_deleted_at_idx on public.customers (deleted_at);
