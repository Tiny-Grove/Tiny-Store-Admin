-- The setup wizard needs to let a merchant pick their industry (from the
-- admin-managed `industries` table) and a default currency — neither was
-- ever exposed to the mobile app: `industries` had RLS enabled with no
-- policy at all (default-deny), and `customers.industry_id` had no grants;
-- `customers.currency` didn't exist yet.
alter table public.customers
  add column if not exists currency text not null default 'gbp';
create policy "Anyone can view industries"
  on public.industries for select
  to authenticated
  using (true);
grant select (id, name) on public.industries to authenticated;
grant select (industry_id, currency) on public.customers to authenticated;
grant update (industry_id, currency) on public.customers to authenticated;
