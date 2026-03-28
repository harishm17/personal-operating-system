create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  source_type text not null,
  content_text text not null,
  client_request_id text not null,
  status text not null default 'received',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists capture_sessions (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  session_key text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists capture_events (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  capture_session_id uuid references capture_sessions(id) on delete cascade,
  kind text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists capture_parts (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  part_index integer not null,
  kind text not null,
  content_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists capture_segments (
  id uuid primary key default gen_random_uuid(),
  capture_part_id uuid not null references capture_parts(id) on delete cascade,
  segment_index integer not null,
  kind text not null,
  content_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  segment_id uuid references capture_segments(id) on delete set null,
  file_name text not null,
  content_type text,
  storage_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid references captures(id) on delete cascade,
  item_type text not null,
  status text not null default 'open',
  title text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists candidate_entities (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  segment_id uuid not null references capture_segments(id) on delete cascade,
  kind text not null,
  subtype text,
  title text not null,
  confidence numeric(5,4) not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'suggested',
  created_at timestamptz not null default now()
);
