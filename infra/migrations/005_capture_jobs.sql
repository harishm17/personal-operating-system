create table if not exists capture_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  job_name text not null,
  dedupe_key text not null,
  status text not null default 'pending',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (dedupe_key)
);
