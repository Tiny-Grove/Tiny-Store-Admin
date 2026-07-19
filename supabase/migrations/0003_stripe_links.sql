-- Links our local records to their corresponding Stripe objects so
-- subscriptions created in the app can be created in Stripe too, and later
-- re-synced from Stripe (see "Sync from Stripe" on the customer page).
alter table customers add column stripe_customer_id text unique;
alter table subscriptions add column stripe_subscription_id text unique;
