ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS source_capture_id uuid;

DO $$
BEGIN
  WITH inferred AS (
    SELECT DISTINCT ON (entity_id) entity_id, kind
    FROM (
      SELECT entity_id, 'actor'::text AS kind, 1 AS priority FROM actors
      UNION ALL
      SELECT entity_id, 'context'::text AS kind, 2 AS priority FROM contexts
      UNION ALL
      SELECT entity_id, 'work_item'::text AS kind, 3 AS priority FROM work_items
      UNION ALL
      SELECT entity_id, 'event'::text AS kind, 4 AS priority FROM events
      UNION ALL
      SELECT entity_id, 'resource'::text AS kind, 5 AS priority FROM resources
      UNION ALL
      SELECT entity_id, 'memory'::text AS kind, 6 AS priority FROM memory_items
      UNION ALL
      SELECT entity_id, 'rule'::text AS kind, 7 AS priority FROM rules
    ) AS candidates
    ORDER BY entity_id, priority
  )
  UPDATE entities AS entity
  SET kind = inferred.kind
  FROM inferred
  WHERE entity.id = inferred.entity_id;

  UPDATE entities
  SET kind = CASE
    WHEN subtype IN ('person', 'assistant', 'system', 'team', 'service') THEN 'actor'
    WHEN subtype IN ('workspace', 'project', 'conversation', 'thread', 'document') THEN 'context'
    WHEN subtype IN ('task', 'bug', 'feature', 'decision', 'note') THEN 'work_item'
    WHEN subtype IN ('message', 'state_change', 'capture', 'observation', 'deadline') THEN 'event'
    WHEN subtype IN ('document', 'webpage', 'link', 'file', 'snippet', 'artifact') THEN 'resource'
    WHEN subtype IN ('fact', 'preference', 'summary', 'pattern') THEN 'memory'
    WHEN subtype IN ('policy', 'constraint', 'workflow', 'guardrail') THEN 'rule'
    ELSE 'resource'
  END
  WHERE kind IS NULL
    OR kind NOT IN ('actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule');

  UPDATE entities
  SET subtype = NULL
  WHERE subtype IS NOT NULL
    AND NOT (
      (kind = 'actor' and subtype in ('person', 'assistant', 'system', 'team', 'service'))
      or (kind = 'context' and subtype in ('workspace', 'project', 'conversation', 'thread', 'document'))
      or (kind = 'work_item' and subtype in ('task', 'bug', 'feature', 'decision', 'note'))
      or (kind = 'event' and subtype in ('message', 'state_change', 'capture', 'observation', 'deadline'))
      or (kind = 'resource' and subtype in ('document', 'webpage', 'link', 'file', 'snippet', 'artifact'))
      or (kind = 'memory' and subtype in ('fact', 'preference', 'summary', 'pattern'))
      or (kind = 'rule' and subtype in ('policy', 'constraint', 'workflow', 'guardrail'))
    );

  UPDATE entities
  SET source_capture_id = NULL
  WHERE source_capture_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM captures
      WHERE captures.id = entities.source_capture_id
    );
END $$;

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
  DELETE FROM actors AS actor
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = actor.entity_id
      AND entity.kind IS DISTINCT FROM 'actor'
  );

  DELETE FROM contexts AS context
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = context.entity_id
      AND entity.kind IS DISTINCT FROM 'context'
  );

  DELETE FROM work_items AS work_item
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = work_item.entity_id
      AND entity.kind IS DISTINCT FROM 'work_item'
  );

  DELETE FROM events AS event
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = event.entity_id
      AND entity.kind IS DISTINCT FROM 'event'
  );

  DELETE FROM resources AS resource
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = resource.entity_id
      AND entity.kind IS DISTINCT FROM 'resource'
  );

  DELETE FROM memory_items AS memory_item
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = memory_item.entity_id
      AND entity.kind IS DISTINCT FROM 'memory'
  );

  DELETE FROM rules AS rule
  WHERE EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = rule.entity_id
      AND entity.kind IS DISTINCT FROM 'rule'
  );

  DELETE FROM actors
  WHERE entity_id NOT IN (SELECT id FROM entities);

  DELETE FROM contexts
  WHERE entity_id NOT IN (SELECT id FROM entities);

  DELETE FROM work_items
  WHERE entity_id NOT IN (SELECT id FROM entities);

  DELETE FROM events
  WHERE entity_id NOT IN (SELECT id FROM entities);

  DELETE FROM resources
  WHERE entity_id NOT IN (SELECT id FROM entities);

  DELETE FROM memory_items
  WHERE entity_id NOT IN (SELECT id FROM entities);

  DELETE FROM rules
  WHERE entity_id NOT IN (SELECT id FROM entities);
END $$;

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
WHERE segment.capture_part_id = part.id
  AND segment.capture_id IS DISTINCT FROM part.capture_id;

DELETE FROM capture_segments
WHERE NOT EXISTS (
  SELECT 1
  FROM capture_parts
  WHERE capture_parts.id = capture_segments.capture_part_id
    AND capture_parts.capture_id = capture_segments.capture_id
);

ALTER TABLE capture_segments
  ALTER COLUMN capture_id SET NOT NULL;

UPDATE capture_events AS event
SET capture_id = session.capture_id
FROM capture_sessions AS session
WHERE event.capture_session_id IS NOT NULL
  AND event.capture_session_id = session.id
  AND event.capture_id IS DISTINCT FROM session.capture_id;

UPDATE capture_events
SET capture_session_id = NULL
WHERE capture_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM capture_sessions AS session
    WHERE session.id = capture_events.capture_session_id
      AND session.capture_id = capture_events.capture_id
  );

UPDATE attachments AS attachment
SET capture_id = segment.capture_id
FROM capture_segments AS segment
WHERE attachment.segment_id IS NOT NULL
  AND attachment.segment_id = segment.id
  AND attachment.capture_id IS DISTINCT FROM segment.capture_id;

UPDATE attachments
SET segment_id = NULL
WHERE segment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM capture_segments AS segment
    WHERE segment.id = attachments.segment_id
      AND segment.capture_id = attachments.capture_id
  );

UPDATE candidate_entities AS candidate
SET capture_id = segment.capture_id
FROM capture_segments AS segment
WHERE candidate.segment_id = segment.id
  AND candidate.capture_id IS DISTINCT FROM segment.capture_id;

DELETE FROM candidate_entities
WHERE segment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM capture_segments AS segment
    WHERE segment.id = candidate_entities.segment_id
      AND segment.capture_id = candidate_entities.capture_id
  );

DELETE FROM candidate_entities
WHERE kind NOT IN ('actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule');

UPDATE candidate_entities
SET subtype = NULL
WHERE subtype IS NOT NULL
  AND NOT (
    (kind = 'actor' and subtype in ('person', 'assistant', 'system', 'team', 'service'))
    or (kind = 'context' and subtype in ('workspace', 'project', 'conversation', 'thread', 'document'))
    or (kind = 'work_item' and subtype in ('task', 'bug', 'feature', 'decision', 'note'))
    or (kind = 'event' and subtype in ('message', 'state_change', 'capture', 'observation', 'deadline'))
    or (kind = 'resource' and subtype in ('document', 'webpage', 'link', 'file', 'snippet', 'artifact'))
    or (kind = 'memory' and subtype in ('fact', 'preference', 'summary', 'pattern'))
    or (kind = 'rule' and subtype in ('policy', 'constraint', 'workflow', 'guardrail'))
  );

UPDATE candidate_entities
SET confidence = LEAST(GREATEST(confidence, 0), 1);

UPDATE candidate_entities AS candidate
SET promoted_entity_id = NULL,
    promoted_entity_kind = NULL
WHERE promoted_entity_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = candidate.promoted_entity_id
      AND entity.kind = candidate.kind
  );

UPDATE candidate_entities
SET promoted_entity_kind = kind
WHERE promoted_entity_id IS NOT NULL
  AND promoted_entity_kind IS DISTINCT FROM kind
  AND EXISTS (
    SELECT 1
    FROM entities AS entity
    WHERE entity.id = candidate_entities.promoted_entity_id
      AND entity.kind = candidate_entities.kind
  );

DELETE FROM entity_relations
WHERE kind NOT IN ('contains', 'references', 'derived_from', 'assigned_to', 'belongs_to', 'triggers', 'supports', 'duplicates', 'blocks', 'follows');

ALTER TABLE capture_events DROP CONSTRAINT IF EXISTS capture_events_capture_session_id_fkey;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_segment_id_fkey;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_segment_capture_id_fkey;
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
    SELECT 1 FROM pg_constraint WHERE conname = 'capture_segments_capture_id_fkey'
  ) THEN
    ALTER TABLE capture_segments
      ADD CONSTRAINT capture_segments_capture_id_fkey
      FOREIGN KEY (capture_id) REFERENCES captures(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attachments_segment_id_fkey'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_segment_id_fkey
      FOREIGN KEY (segment_id) REFERENCES capture_segments(id) ON DELETE SET NULL;
  END IF;
END $$;

create or replace function attachments_sync_capture_id()
returns trigger
language plpgsql
as $$
begin
  if new.segment_id is null then
    return new;
  end if;

  select capture_id
  into new.capture_id
  from capture_segments
  where id = new.segment_id;

  return new;
end;
$$;

drop trigger if exists attachments_sync_capture_id on attachments;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attachments'
      AND column_name IN ('capture_id', 'segment_id')
    GROUP BY table_name
    HAVING count(*) = 2
  ) THEN
    CREATE TRIGGER attachments_sync_capture_id
    BEFORE INSERT OR UPDATE OF segment_id, capture_id
    ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION attachments_sync_capture_id();
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
