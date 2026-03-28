DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entities_kind_registry'
  ) THEN
    ALTER TABLE entities
      ADD CONSTRAINT entities_kind_registry CHECK (
        kind in ('actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entities_id_kind_unique'
  ) THEN
    ALTER TABLE entities
      ADD CONSTRAINT entities_id_kind_unique UNIQUE (id, kind);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entities_subtype_registry'
  ) THEN
    ALTER TABLE entities
      ADD CONSTRAINT entities_subtype_registry CHECK (
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
      );
  END IF;
END $$;

ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS source_capture_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'actors' AND column_name = 'kind') THEN
    ALTER TABLE actors ADD COLUMN kind text;
  END IF;
  UPDATE actors SET kind = 'actor' WHERE kind IS NULL;
  ALTER TABLE actors ALTER COLUMN kind SET DEFAULT 'actor';
  ALTER TABLE actors ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actors_kind_registry') THEN
    ALTER TABLE actors ADD CONSTRAINT actors_kind_registry CHECK (kind = 'actor');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actors_entity_kind_fk') THEN
    ALTER TABLE actors
      ADD CONSTRAINT actors_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contexts' AND column_name = 'kind') THEN
    ALTER TABLE contexts ADD COLUMN kind text;
  END IF;
  UPDATE contexts SET kind = 'context' WHERE kind IS NULL;
  ALTER TABLE contexts ALTER COLUMN kind SET DEFAULT 'context';
  ALTER TABLE contexts ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contexts_kind_registry') THEN
    ALTER TABLE contexts ADD CONSTRAINT contexts_kind_registry CHECK (kind = 'context');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contexts_entity_kind_fk') THEN
    ALTER TABLE contexts
      ADD CONSTRAINT contexts_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'kind') THEN
    ALTER TABLE work_items ADD COLUMN kind text;
  END IF;
  UPDATE work_items SET kind = 'work_item' WHERE kind IS NULL;
  ALTER TABLE work_items ALTER COLUMN kind SET DEFAULT 'work_item';
  ALTER TABLE work_items ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_items_kind_registry') THEN
    ALTER TABLE work_items ADD CONSTRAINT work_items_kind_registry CHECK (kind = 'work_item');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_items_entity_kind_fk') THEN
    ALTER TABLE work_items
      ADD CONSTRAINT work_items_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'kind') THEN
    ALTER TABLE events ADD COLUMN kind text;
  END IF;
  UPDATE events SET kind = 'event' WHERE kind IS NULL;
  ALTER TABLE events ALTER COLUMN kind SET DEFAULT 'event';
  ALTER TABLE events ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_kind_registry') THEN
    ALTER TABLE events ADD CONSTRAINT events_kind_registry CHECK (kind = 'event');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_entity_kind_fk') THEN
    ALTER TABLE events
      ADD CONSTRAINT events_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'kind') THEN
    ALTER TABLE resources ADD COLUMN kind text;
  END IF;
  UPDATE resources SET kind = 'resource' WHERE kind IS NULL;
  ALTER TABLE resources ALTER COLUMN kind SET DEFAULT 'resource';
  ALTER TABLE resources ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resources_kind_registry') THEN
    ALTER TABLE resources ADD CONSTRAINT resources_kind_registry CHECK (kind = 'resource');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resources_entity_kind_fk') THEN
    ALTER TABLE resources
      ADD CONSTRAINT resources_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_items' AND column_name = 'kind') THEN
    ALTER TABLE memory_items ADD COLUMN kind text;
  END IF;
  UPDATE memory_items SET kind = 'memory' WHERE kind IS NULL;
  ALTER TABLE memory_items ALTER COLUMN kind SET DEFAULT 'memory';
  ALTER TABLE memory_items ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_items_kind_registry') THEN
    ALTER TABLE memory_items ADD CONSTRAINT memory_items_kind_registry CHECK (kind = 'memory');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_items_entity_kind_fk') THEN
    ALTER TABLE memory_items
      ADD CONSTRAINT memory_items_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rules' AND column_name = 'kind') THEN
    ALTER TABLE rules ADD COLUMN kind text;
  END IF;
  UPDATE rules SET kind = 'rule' WHERE kind IS NULL;
  ALTER TABLE rules ALTER COLUMN kind SET DEFAULT 'rule';
  ALTER TABLE rules ALTER COLUMN kind SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rules_kind_registry') THEN
    ALTER TABLE rules ADD CONSTRAINT rules_kind_registry CHECK (kind = 'rule');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rules_entity_kind_fk') THEN
    ALTER TABLE rules
      ADD CONSTRAINT rules_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE capture_segments
  ADD COLUMN IF NOT EXISTS capture_id uuid;

ALTER TABLE candidate_entities
  ADD COLUMN IF NOT EXISTS promoted_entity_id uuid;

ALTER TABLE candidate_entities
  ADD COLUMN IF NOT EXISTS promoted_entity_kind text;

UPDATE candidate_entities
SET promoted_entity_kind = kind
WHERE promoted_entity_id IS NOT NULL
  AND promoted_entity_kind IS DISTINCT FROM kind;

UPDATE capture_segments AS segment
SET capture_id = part.capture_id
FROM capture_parts AS part
WHERE segment.capture_id IS NULL
  AND segment.capture_part_id = part.id;

ALTER TABLE capture_segments
  ALTER COLUMN capture_id SET NOT NULL;

ALTER TABLE capture_events DROP CONSTRAINT IF EXISTS capture_events_capture_session_id_fkey;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_segment_id_fkey;
ALTER TABLE candidate_entities DROP CONSTRAINT IF EXISTS candidate_entities_segment_id_fkey;
ALTER TABLE candidate_entities DROP CONSTRAINT IF EXISTS candidate_entities_promoted_entity_id_fkey;

CREATE UNIQUE INDEX IF NOT EXISTS capture_sessions_id_capture_id_unique
  ON capture_sessions (id, capture_id);

CREATE UNIQUE INDEX IF NOT EXISTS capture_parts_id_capture_id_unique
  ON capture_parts (id, capture_id);

CREATE UNIQUE INDEX IF NOT EXISTS capture_segments_id_capture_id_unique
  ON capture_segments (id, capture_id);

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'capture_events_capture_session_capture_id_fkey'
  ) THEN
    ALTER TABLE capture_events
      ADD CONSTRAINT capture_events_capture_session_capture_id_fkey
      FOREIGN KEY (capture_session_id, capture_id) REFERENCES capture_sessions(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'capture_segments_capture_part_capture_id_fkey'
  ) THEN
    ALTER TABLE capture_segments
      ADD CONSTRAINT capture_segments_capture_part_capture_id_fkey
      FOREIGN KEY (capture_part_id, capture_id) REFERENCES capture_parts(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attachments_segment_capture_id_fkey'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_segment_capture_id_fkey
      FOREIGN KEY (segment_id, capture_id) REFERENCES capture_segments(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_segment_capture_id_fkey'
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_segment_capture_id_fkey
      FOREIGN KEY (segment_id, capture_id) REFERENCES capture_segments(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_promoted_entity_id_kind_fkey'
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_promoted_entity_id_kind_fkey
      FOREIGN KEY (promoted_entity_id, promoted_entity_kind) REFERENCES entities(id, kind) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_confidence_range_check'
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_confidence_range_check CHECK (confidence >= 0 AND confidence <= 1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_promoted_entity_pair_check'
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_promoted_entity_pair_check CHECK (
        (promoted_entity_id is null and promoted_entity_kind is null)
        or (promoted_entity_id is not null and promoted_entity_kind = kind)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_kind_registry'
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_kind_registry CHECK (
        kind in ('actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_subtype_registry'
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_subtype_registry CHECK (
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
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entity_relations_kind_registry'
  ) THEN
    ALTER TABLE entity_relations
      ADD CONSTRAINT entity_relations_kind_registry CHECK (
        kind in ('contains', 'references', 'derived_from', 'assigned_to', 'belongs_to', 'triggers', 'supports', 'duplicates', 'blocks', 'follows')
      );
  END IF;
END $$;
