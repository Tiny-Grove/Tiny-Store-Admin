-- Storefront Editor: lets a merchant customize their public storefront
-- (.../store/{slug}, hosted in the admin app) beyond what Business Profile
-- already covers (name/logo/colors/slogan) — a banner image, an about
-- paragraph, contact/social links, and a featured-products flag.
alter table public.customers
  add column if not exists storefront_banner_url text,
  add column if not exists storefront_about text,
  add column if not exists storefront_whatsapp text,
  add column if not exists storefront_instagram_url text,
  add column if not exists storefront_facebook_url text,
  add column if not exists storefront_website_url text;

grant select (
  storefront_banner_url, storefront_about, storefront_whatsapp,
  storefront_instagram_url, storefront_facebook_url, storefront_website_url
) on public.customers to authenticated;
grant update (
  storefront_banner_url, storefront_about, storefront_whatsapp,
  storefront_instagram_url, storefront_facebook_url, storefront_website_url
) on public.customers to authenticated;

alter table public.products add column if not exists is_featured boolean not null default false;
grant select (is_featured) on public.products to authenticated;
grant update (is_featured) on public.products to authenticated;
-- No new RLS policies needed on either table — both already have
-- owner-scoped select/update policies covering the whole row.

-- Banner uploads: same shape as the existing "logos" folder policies
-- (20260720100000_setup_wizard_grants.sql / 20260721080000_storage_select_policies.sql),
-- just a new folder name.
create policy "Customers can upload their own storefront banner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'storefront'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "Customers can replace their own storefront banner"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'storefront'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'storefront'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "Customers can view their own storefront banner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'storefront'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
