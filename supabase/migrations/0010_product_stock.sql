-- Tracks how many units of a product a customer has on hand. Editable by
-- admins from the customer profile's Inventory section.
alter table products add column if not exists stock_count integer not null default 0;
