
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.contact_groups(id) on delete cascade,
  name text,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.scheduled_sends (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  group_id uuid references public.contact_groups(id) on delete set null,
  message_title text not null,
  message_body text not null,
  group_name text not null,
  send_at timestamptz not null,
  status text not null default 'pending',
  sent_at timestamptz,
  recipient_count int not null default 0,
  success_count int not null default 0,
  failure_count int not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index on public.scheduled_sends (status, send_at);

create table public.send_history (
  id uuid primary key default gen_random_uuid(),
  scheduled_send_id uuid references public.scheduled_sends(id) on delete cascade,
  phone text not null,
  status text not null,
  error text,
  twilio_sid text,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id int primary key default 1,
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_from_number text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.app_settings (id) values (1);

alter table public.messages enable row level security;
alter table public.contact_groups enable row level security;
alter table public.contacts enable row level security;
alter table public.scheduled_sends enable row level security;
alter table public.send_history enable row level security;
alter table public.app_settings enable row level security;

-- Single-admin app gated by client-side login. Open policies for anon.
create policy "open_all" on public.messages for all using (true) with check (true);
create policy "open_all" on public.contact_groups for all using (true) with check (true);
create policy "open_all" on public.contacts for all using (true) with check (true);
create policy "open_all" on public.scheduled_sends for all using (true) with check (true);
create policy "open_all" on public.send_history for all using (true) with check (true);
create policy "open_all" on public.app_settings for all using (true) with check (true);

-- Schedule cron processing every minute
create extension if not exists pg_cron;
create extension if not exists pg_net;
