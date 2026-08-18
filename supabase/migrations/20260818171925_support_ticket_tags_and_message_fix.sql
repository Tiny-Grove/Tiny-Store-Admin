-- Fixes the inbound webhook's upsert: a partial unique index doesn't
-- satisfy Postgres's ON CONFLICT (external_message_id) inference (confirmed
-- live — every inbound message insert has been failing with 42P10 since the
-- webhook went live, silently swallowed by the route's per-event catch, so
-- tickets got created but their first message never did). A plain unique
-- constraint allows the same thing (many NULLs, unique non-null values)
-- and *does* satisfy ON CONFLICT inference.
drop index if exists support_ticket_messages_external_message_id_idx;
alter table support_ticket_messages
  add constraint support_ticket_messages_external_message_id_key unique (external_message_id);

-- Freeform tags a staff member can attach to a ticket, shown on the list
-- and inside the thread.
alter table support_tickets add column tags text[] not null default '{}';
