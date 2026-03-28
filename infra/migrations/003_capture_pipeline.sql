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
  ended_at timestamptz,
  constraint capture_sessions_id_capture_id_unique unique (id, capture_id)
);

create table if not exists capture_events (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  capture_session_id uuid,
  kind text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint capture_events_capture_session_capture_id_fkey foreign key (capture_session_id, capture_id) references capture_sessions(id, capture_id) on delete cascade
);

create table if not exists capture_parts (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  part_index integer not null,
  kind text not null,
  content_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint capture_parts_id_capture_id_unique unique (id, capture_id)
);

create table if not exists capture_segments (
  id uuid primary key default gen_random_uuid(),
  capture_part_id uuid not null,
  capture_id uuid not null references captures(id) on delete cascade,
  segment_index integer not null,
  kind text not null,
  content_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint capture_segments_id_capture_id_unique unique (id, capture_id),
  constraint capture_segments_capture_part_capture_id_fkey foreign key (capture_part_id, capture_id) references capture_parts(id, capture_id) on delete cascade
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  segment_id uuid,
  file_name text not null,
  content_type text,
  storage_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint attachments_segment_capture_id_fkey foreign key (segment_id, capture_id) references capture_segments(id, capture_id) on delete cascade
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
  segment_id uuid not null,
  promoted_entity_id uuid,
  promoted_entity_kind text,
  kind text not null,
  subtype text,
  title text not null,
  confidence numeric(5,4) not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  constraint candidate_entities_kind_registry check (
    kind in ('actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule')
  ),
  constraint candidate_entities_subtype_registry check (
    subtype is null
    or (
      (kind = 'actor' and subtype in ('person', 'assistant', 'system', 'team', 'service'))
      or (kind = 'context' and subtype in ('workspace', 'project', 'conversation', 'thread', 'document'))
      or (kind = 'work_item' and subtype in ('task', 'bug', 'feature', 'decision', 'note'))
      or (kind = 'event' and subtype in ('message', 'state_change', 'capture', 'observation', 'deadline'))
      or (kind = 'resource' and subtype in ('document', 'webpage', 'link', 'file', 'snippet', 'artifact'))
      or (kind = 'memory' and subtype in ('fact', 'preference', 'summary', 'pattern'))
      or (kind = 'rule' and subtype in ('policy', 'constraint', 'workflow', 'guardrail'))
    )
  ),
  constraint candidate_entities_confidence_range_check check (confidence >= 0 and confidence <= 1),
  constraint candidate_entities_promoted_entity_pair_check check (
    (promoted_entity_id is null and promoted_entity_kind is null)
    or (promoted_entity_id is not null and promoted_entity_kind = kind)
  ),
  constraint candidate_entities_segment_capture_id_fkey foreign key (segment_id, capture_id) references capture_segments(id, capture_id) on delete cascade,
  constraint candidate_entities_promoted_entity_id_kind_fkey foreign key (promoted_entity_id, promoted_entity_kind) references entities(id, kind) on delete set null
);

create or replace function candidate_entities_sync_promoted_entity_kind()
returns trigger
language plpgsql
as $$
begin
  if new.promoted_entity_id is null then
    new.promoted_entity_kind := null;
  else
    new.promoted_entity_kind := new.kind;
  end if;

  return new;
end;
$$;

drop trigger if exists candidate_entities_sync_promoted_entity_kind on candidate_entities;

create trigger candidate_entities_sync_promoted_entity_kind
before insert or update of kind, promoted_entity_id
on candidate_entities
for each row
execute function candidate_entities_sync_promoted_entity_kind();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entities_source_capture_id_fkey'
  ) THEN
    ALTER TABLE entities
      ADD CONSTRAINT entities_source_capture_id_fkey
      FOREIGN KEY (source_capture_id) REFERENCES captures(id) ON DELETE SET NULL;
  END IF;
END $$;
