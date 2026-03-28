create table if not exists capture_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  job_name text not null,
  dedupe_key text not null,
  status text not null default 'pending',
  constraint capture_jobs_job_name_check check (job_name in ('process-capture')),
  constraint capture_jobs_status_check check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint capture_jobs_processed_at_consistency_check check (
    (status not in ('pending', 'processing', 'completed', 'failed'))
    or (((status in ('completed', 'failed')) and processed_at is not null)
    or ((status in ('pending', 'processing')) and processed_at is null))
  ),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (dedupe_key),
  unique (capture_id, job_name)
);
