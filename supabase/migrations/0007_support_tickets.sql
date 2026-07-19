-- Support tickets submitted by Tiny Store customers (via the mobile app's
-- backend, authenticated with a shared API key — see /api/tickets) and
-- answered by admins here. Replies are emailed to the customer with a link
-- to a public, unauthenticated ticket page (/tickets/[id]) where they can
-- read the thread and reply from a browser.
create type ticket_status as enum ('open', 'pending', 'resolved');
create type ticket_author as enum ('customer', 'admin');

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  subject text not null,
  status ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets (id) on delete cascade,
  author_type ticket_author not null,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index support_tickets_customer_id_idx on support_tickets (customer_id);
create index support_ticket_messages_ticket_id_idx on support_ticket_messages (ticket_id);

alter table support_tickets enable row level security;
alter table support_ticket_messages enable row level security;
