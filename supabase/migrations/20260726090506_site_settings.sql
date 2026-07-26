-- Site-wide configuration editable from Settings, following the
-- gocardless_platform_config singleton pattern. Starts with the
-- customer-facing storefront domain, previously only settable via the
-- PUBLIC_SITE_URL env var (which needed a redeploy to change).
create table public.site_settings (
  id integer primary key default 1,
  site_url text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id) values (1);

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
