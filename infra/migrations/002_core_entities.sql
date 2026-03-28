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
  archived_at timestamptz,
  constraint entities_kind_registry check (
    kind in ('actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule')
  ),
  constraint entities_id_kind_unique unique (id, kind),
  constraint entities_subtype_registry check (
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
  )
);

create table if not exists actors (
  entity_id uuid primary key,
  kind text not null default 'actor',
  title text,
  metadata jsonb not null default '{}'::jsonb,
  constraint actors_kind_registry check (kind = 'actor'),
  constraint actors_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists contexts (
  entity_id uuid primary key,
  kind text not null default 'context',
  title text,
  metadata jsonb not null default '{}'::jsonb,
  constraint contexts_kind_registry check (kind = 'context'),
  constraint contexts_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists work_items (
  entity_id uuid primary key,
  kind text not null default 'work_item',
  title text,
  state text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  constraint work_items_kind_registry check (kind = 'work_item'),
  constraint work_items_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists events (
  entity_id uuid primary key,
  kind text not null default 'event',
  title text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  constraint events_kind_registry check (kind = 'event'),
  constraint events_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists resources (
  entity_id uuid primary key,
  kind text not null default 'resource',
  title text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  constraint resources_kind_registry check (kind = 'resource'),
  constraint resources_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists memory_items (
  entity_id uuid primary key,
  kind text not null default 'memory',
  content text,
  metadata jsonb not null default '{}'::jsonb,
  constraint memory_items_kind_registry check (kind = 'memory'),
  constraint memory_items_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists rules (
  entity_id uuid primary key,
  kind text not null default 'rule',
  title text,
  expression text,
  metadata jsonb not null default '{}'::jsonb,
  constraint rules_kind_registry check (kind = 'rule'),
  constraint rules_entity_kind_fk foreign key (entity_id, kind) references entities(id, kind) on delete cascade
);

create table if not exists entity_relations (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references entities(id) on delete cascade,
  to_entity_id uuid not null references entities(id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint entity_relations_kind_registry check (
    kind in ('contains', 'references', 'derived_from', 'assigned_to', 'belongs_to', 'triggers', 'supports', 'duplicates', 'blocks', 'follows')
  )
);

create table if not exists entity_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  event_entity_id uuid not null references events(entity_id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
