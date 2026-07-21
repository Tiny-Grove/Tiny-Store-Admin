-- Storefront link setup is now managed entirely from the mobile app (the
-- web app only hosts the public storefront) — merchants pick/change their
-- own slug directly, relying on the table's unique constraint plus a
-- client-side retry-on-conflict loop instead of a server-side helper.
grant update (slug) on public.customers to authenticated;
