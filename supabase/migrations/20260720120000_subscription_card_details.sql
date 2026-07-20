-- Non-sensitive card display info only (Stripe never gives us the full PAN).
alter table public.subscriptions
  add column if not exists card_brand text,
  add column if not exists card_last4 text;
grant select (card_brand, card_last4) on public.subscriptions to authenticated;
