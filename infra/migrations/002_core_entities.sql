create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  subtype text,
  title text,
  state text not null default 'active',
  source_capture_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists actors (
  entity_id uuid primary key references entities(id) on delete cascade,
  title text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists contexts (
  entity_id uuid primary key references entities(id) on delete cascade,
  title text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists work_items (
  entity_id uuid primary key references entities(id) on delete cascade,
  title text,
  state text not null default 'open',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists events (
  entity_id uuid primary key references entities(id) on delete cascade,
  title text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists resources (
  entity_id uuid primary key references entities(id) on delete cascade,
  title text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists memory_items (
  entity_id uuid primary key references entities(id) on delete cascade,
  content text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists rules (
  entity_id uuid primary key references entities(id) on delete cascade,
  title text,
  expression text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists entity_relations (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references entities(id) on delete cascade,
  to_entity_id uuid not null references entities(id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists entity_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  event_entity_id uuid not null references events(entity_id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
