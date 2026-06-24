-- Cross-cohort ticketing + in-app notifications. Party = (type, id):
-- student keyed by email; partner/subpartner/mentor/recruiter/admin keyed by uuid;
-- 'admin' group uses party_id '*'. RLS-on; all access via server (service role).
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text unique not null,
  created_by_type text not null,
  created_by_id text not null,
  created_by_name text,
  category text not null,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_tickets_creator on tickets (created_by_type, created_by_id);
create index if not exists idx_tickets_status on tickets (status);
alter table tickets enable row level security;

create table if not exists ticket_recipients (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  party_type text not null, party_id text not null, party_name text,
  read_at timestamptz, responded_at timestamptz,
  unique (ticket_id, party_type, party_id)
);
create index if not exists idx_ticket_recipients_party on ticket_recipients (party_type, party_id);
alter table ticket_recipients enable row level security;

create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  author_type text not null, author_id text not null, author_name text,
  body text not null, created_at timestamptz not null default now()
);
create index if not exists idx_ticket_messages_ticket on ticket_messages (ticket_id, created_at);
alter table ticket_messages enable row level security;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null, recipient_id text not null,
  kind text not null default 'ticket', title text not null, body text, link text,
  ticket_id uuid references tickets(id) on delete cascade,
  read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on notifications (recipient_type, recipient_id, read_at);
alter table notifications enable row level security;
