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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entities_source_capture_id_fkey'
  ) THEN
    ALTER TABLE entities
      ADD CONSTRAINT entities_source_capture_id_fkey
      FOREIGN KEY (source_capture_id) REFERENCES captures(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE actors ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'actor';
ALTER TABLE contexts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'context';
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'work_item';
ALTER TABLE events ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'event';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'resource';
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'memory';
ALTER TABLE rules ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rule';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'actors_kind_registry'
  ) THEN
    ALTER TABLE actors ADD CONSTRAINT actors_kind_registry CHECK (kind = 'actor');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contexts_kind_registry'
  ) THEN
    ALTER TABLE contexts ADD CONSTRAINT contexts_kind_registry CHECK (kind = 'context');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_items_kind_registry'
  ) THEN
    ALTER TABLE work_items ADD CONSTRAINT work_items_kind_registry CHECK (kind = 'work_item');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_kind_registry'
  ) THEN
    ALTER TABLE events ADD CONSTRAINT events_kind_registry CHECK (kind = 'event');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_kind_registry'
  ) THEN
    ALTER TABLE resources ADD CONSTRAINT resources_kind_registry CHECK (kind = 'resource');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memory_items_kind_registry'
  ) THEN
    ALTER TABLE memory_items ADD CONSTRAINT memory_items_kind_registry CHECK (kind = 'memory');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rules_kind_registry'
  ) THEN
    ALTER TABLE rules ADD CONSTRAINT rules_kind_registry CHECK (kind = 'rule');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'actors_entity_kind_fk'
  ) THEN
    ALTER TABLE actors
      ADD CONSTRAINT actors_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contexts_entity_kind_fk'
  ) THEN
    ALTER TABLE contexts
      ADD CONSTRAINT contexts_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_items_entity_kind_fk'
  ) THEN
    ALTER TABLE work_items
      ADD CONSTRAINT work_items_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_entity_kind_fk'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resources_entity_kind_fk'
  ) THEN
    ALTER TABLE resources
      ADD CONSTRAINT resources_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memory_items_entity_kind_fk'
  ) THEN
    ALTER TABLE memory_items
      ADD CONSTRAINT memory_items_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rules_entity_kind_fk'
  ) THEN
    ALTER TABLE rules
      ADD CONSTRAINT rules_entity_kind_fk FOREIGN KEY (entity_id, kind)
      REFERENCES entities(id, kind) ON DELETE CASCADE;
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
