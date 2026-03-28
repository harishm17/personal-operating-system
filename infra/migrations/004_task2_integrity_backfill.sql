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

CREATE OR REPLACE FUNCTION candidate_entities_sync_promoted_entity_kind()
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

DROP TRIGGER IF EXISTS candidate_entities_sync_promoted_entity_kind ON candidate_entities;

CREATE TRIGGER candidate_entities_sync_promoted_entity_kind
BEFORE INSERT OR UPDATE OF kind, promoted_entity_id
ON candidate_entities
FOR EACH ROW
EXECUTE FUNCTION candidate_entities_sync_promoted_entity_kind();
