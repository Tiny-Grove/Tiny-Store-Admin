-- Mobile app fields on the existing CRM customers table
alter table public.customers
  add column if not exists platform text check (platform in ('ios', 'android')),
  add column if not exists platform_version text;
-- Auto-create a customer row on mobile signup, or link an existing CRM-invited
-- row (matched by email) if one hasn't been linked to an auth user yet.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.customers (email, auth_user_id, account_status, activated_at)
  values (new.email, new.id, 'active', now())
  on conflict (email) do update
    set auth_user_id = excluded.auth_user_id,
        account_status = 'active',
        activated_at = now()
    where public.customers.auth_user_id is null;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
-- Lock the mobile app down to its own row and a safe column list. RLS was
-- already enabled on this table with no policies (default-deny), and
-- anon/authenticated previously held full raw table+column grants from
-- Postgres's perspective — narrowing those grants here so RLS isn't the
-- only thing standing between the anon key and stripe_customer_id /
-- invite_token_hash / branding fields.
revoke all on public.customers from anon;
revoke all on public.customers from authenticated;
grant select (
  id, email, name, company, country,
  account_status, activated_at, platform, platform_version, created_at
) on public.customers to authenticated;
grant update (platform, platform_version) on public.customers to authenticated;
create policy "Customers can view their own row"
  on public.customers for select
  to authenticated
  using (auth_user_id = auth.uid());
create policy "Customers can update their own row"
  on public.customers for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
