-- Adds a 'suspended' account_status, entered automatically (via a daily
-- cron job, see /api/cron/suspend-overdue-accounts) 7 days after a platform
-- subscription payment first fails, and cleared only by an admin/staff
-- member manually reactivating after verifying payment — never
-- automatically, even if a later Stripe charge succeeds.
alter table public.customers drop constraint customers_account_status_check;
alter table public.customers
  add constraint customers_account_status_check check (account_status in ('invited', 'active', 'suspended'));

-- Set by the invoice.payment_failed webhook handler (only if not already
-- set, so retries within the same failing streak don't push the deadline
-- back) and cleared by invoice.payment_succeeded / invoice.paid.
alter table public.customers add column payment_failed_at timestamptz;
