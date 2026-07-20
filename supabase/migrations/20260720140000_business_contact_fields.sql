-- Business contact details, distinct from the account's login email.
alter table public.customers
  add column if not exists business_phone text,
  add column if not exists business_email text;
grant select (business_phone, business_email) on public.customers to authenticated;
grant update (business_phone, business_email) on public.customers to authenticated;
