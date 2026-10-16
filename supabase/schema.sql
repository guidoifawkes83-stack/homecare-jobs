create extension if not exists "pgcrypto";

create table sources (
  id text primary key,
  name text not null,
  method text not null check (method in ('api', 'rss', 'html')),
  enabled boolean default true,
  last_run_at timestamptz,
  last_status text check (last_status in ('ok', 'error', 'blocked')),
  last_error text
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text unique not null,
  title text not null,
  company text,
  description text,
  pay_text text,
  pay_usd_hourly_min numeric,
  pay_usd_hourly_max numeric,
  schedule_text text,
  poster_type text check (poster_type in ('direct', 'agency', 'unknown')),
  software text[] default '{}',
  region_note text,
  score int default 0,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  posted_at timestamptz,
  is_active boolean default true,
  status text default 'new'
    check (status in ('new', 'saved', 'applied', 'interviewing', 'rejected', 'ignored')),
  notes text
);

create table job_sources (
  job_id uuid references jobs(id) on delete cascade,
  source_id text references sources(id),
  url text not null,
  seen_at timestamptz default now(),
  primary key (job_id, source_id)
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  source_id text references sources(id),
  status text,
  jobs_found int default 0,
  jobs_new int default 0,
  error text
);

alter table sources enable row level security;
alter table jobs enable row level security;
alter table job_sources enable row level security;
alter table runs enable row level security;

create policy "Authenticated users can read and write sources"
  on sources for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Authenticated users can read and write jobs"
  on jobs for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Authenticated users can read and write job sources"
  on job_sources for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Authenticated users can read and write runs"
  on runs for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
