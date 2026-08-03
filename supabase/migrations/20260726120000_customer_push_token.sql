-- Expo push token for sending notifications to the merchant's device (new
-- support ticket replies, new storefront orders). One token per customer for
-- now — good enough for a single-device-per-merchant usage pattern; a
-- multi-device setup would need its own table instead of a single column.
alter table public.customers
  add column if not exists expo_push_token text;
grant select (expo_push_token) on public.customers to authenticated;
grant update (expo_push_token) on public.customers to authenticated;
