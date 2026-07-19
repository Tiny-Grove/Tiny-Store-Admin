-- ISO 3166-1 alpha-2 country code, set manually per customer. Powers the
-- "where customers registered from" world map on the dashboard.
alter table customers add column country text;
