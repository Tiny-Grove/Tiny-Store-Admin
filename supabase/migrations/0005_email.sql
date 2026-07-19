-- Email templates admins can send to customers via Mailgun. Every send wraps
-- the template body with a fixed brand header (defined in code, not
-- editable) and this one global, admin-editable footer.
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Singleton row (id is always `true`) holding the one global footer used by
-- every template. May reference %recipient.unsubscribe_url% (substituted by
-- Mailgun per recipient at send time).
create table email_footer (
  id boolean primary key default true,
  footer_html text not null default '<p>Tiny Store · tinygrove.co.uk</p><p><a href="%recipient.unsubscribe_url%">Unsubscribe</a></p>',
  updated_at timestamptz not null default now(),
  constraint email_footer_singleton check (id)
);
insert into email_footer (id) values (true);

alter table customers add column email_opt_out boolean not null default false;

-- One row per bulk send. template_name/subject are snapshotted at send time
-- so history stays meaningful even if the template is later edited/deleted.
create table email_batches (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references email_templates (id) on delete set null,
  template_name text not null,
  subject text not null,
  sent_by_email text not null,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table email_batch_recipients (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references email_batches (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  email text not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index email_batch_recipients_batch_id_idx on email_batch_recipients (batch_id);

alter table email_templates enable row level security;
alter table email_footer enable row level security;
alter table email_batches enable row level security;
alter table email_batch_recipients enable row level security;
