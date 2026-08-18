-- Distinguishes support messages that arrived via the mobile app / public
-- web reply from ones that arrived as real inbound email to
-- support@<domain> (see /api/webhooks/mailtrap-inbound), and lets tickets
-- originate from an inbound email whose sender isn't (yet) a customer.
create type ticket_channel as enum ('app', 'email');

alter table support_ticket_messages add column channel ticket_channel not null default 'app';

-- Mailtrap's inbound message id, recorded only for channel='email' rows so
-- a retried webhook delivery doesn't create a duplicate message.
alter table support_ticket_messages add column external_message_id text;
create unique index support_ticket_messages_external_message_id_idx
  on support_ticket_messages (external_message_id)
  where external_message_id is not null;

alter table support_tickets alter column customer_id drop not null;
alter table support_tickets add column guest_email text;
alter table support_tickets add column guest_name text;
alter table support_tickets add constraint support_tickets_customer_or_guest
  check (customer_id is not null or guest_email is not null);
