alter table public.jobs
  add column if not exists source_url text;
