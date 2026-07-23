-- The logos/products upload policies only ever granted INSERT and UPDATE.
-- That's enough for a plain create, but Storage's upsert path resolves via
-- an ON CONFLICT check that needs SELECT visibility into the row it might be
-- conflicting with — without it, even a brand-new upload fails RLS the
-- moment upsert is requested. Add the matching SELECT policies so any future
-- upsert/read use is actually usable, not just plain inserts.
create policy "Customers can view their own logo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "Customers can view their own product images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-assets'
    and (storage.foldername(name))[1] = 'products'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
