-- Let customers read/write their own branding & profile fields (previous
-- migration only covered platform/platform_version).
grant select (logo_url, primary_color, secondary_color) on public.customers to authenticated;
grant update (name, company, country, logo_url, primary_color, secondary_color) on public.customers to authenticated;
-- Subscriptions: read-only, own rows only. All writes happen server-side
-- (service_role) from the Stripe webhook.
grant select (id, plan, status, amount_cents, current_period_end, created_at) on public.subscriptions to authenticated;
create policy "Customers can view their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
-- Company logo uploads, scoped to the caller's own folder.
create policy "Customers can upload their own logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "Customers can replace their own logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
