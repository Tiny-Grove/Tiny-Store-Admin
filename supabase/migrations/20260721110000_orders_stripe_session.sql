-- Storefront sales are grouped with a freshly-generated sale_id (it's a uuid
-- column; a Stripe Checkout Session id like "cs_live_..." isn't a valid
-- uuid). This column instead tracks the originating session, purely so the
-- webhook can tell a redelivered event apart from a genuinely new sale.
alter table public.orders
  add column if not exists stripe_checkout_session_id text;

create index if not exists orders_stripe_checkout_session_id_idx
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
