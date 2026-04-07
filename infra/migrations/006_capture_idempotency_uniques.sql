begin;

alter table capture_events drop constraint if exists capture_events_capture_session_capture_id_fkey;
alter table capture_segments drop constraint if exists capture_segments_capture_part_capture_id_fkey;
alter table candidate_entities drop constraint if exists candidate_entities_segment_capture_id_fkey;

create temporary table capture_dedupe_map on commit drop as
with ranked_captures as (
  select
    id,
    first_value(id) over (
      partition by client_request_id
      order by created_at asc, id asc
    ) as canonical_id
  from captures
)
select
  id as duplicate_id,
  canonical_id
from ranked_captures
where id <> canonical_id;

create temporary table capture_job_dedupe_map on commit drop as
with ranked_capture_jobs as (
  select
    job.id,
    first_value(job.id) over (
      partition by coalesce(map.canonical_id, job.capture_id), job.job_name
      order by job.created_at asc, job.id asc
    ) as canonical_id
  from capture_jobs as job
  left join capture_dedupe_map as map on map.duplicate_id = job.capture_id
)
select id as duplicate_id
from ranked_capture_jobs
where id <> canonical_id;

delete from capture_jobs
where id in (select duplicate_id from capture_job_dedupe_map);

update capture_jobs as job
set capture_id = map.canonical_id
from capture_dedupe_map as map
where job.capture_id = map.duplicate_id;

update capture_sessions as session
set capture_id = map.canonical_id
from capture_dedupe_map as map
where session.capture_id = map.duplicate_id;

update capture_events as event
set capture_id = map.canonical_id
from capture_dedupe_map as map
where event.capture_id = map.duplicate_id;

update capture_parts as part
set capture_id = map.canonical_id
from capture_dedupe_map as map
where part.capture_id = map.duplicate_id;

update capture_segments as segment
set capture_id = map.canonical_id
from capture_dedupe_map as map
where segment.capture_id = map.duplicate_id;

update attachments as attachment
set capture_id = map.canonical_id
from capture_dedupe_map as map
where attachment.capture_id = map.duplicate_id;

update inbox_items as item
set capture_id = map.canonical_id
from capture_dedupe_map as map
where item.capture_id = map.duplicate_id;

update candidate_entities as candidate
set capture_id = map.canonical_id
from capture_dedupe_map as map
where candidate.capture_id = map.duplicate_id;

update entities as entity
set source_capture_id = map.canonical_id
from capture_dedupe_map as map
where entity.source_capture_id = map.duplicate_id;

delete from captures
where id in (select duplicate_id from capture_dedupe_map);

create temporary table inbox_item_dedupe_map on commit drop as
with ranked_inbox_items as (
  select
    id,
    first_value(id) over (
      partition by capture_id, item_type
      order by created_at asc, id asc
    ) as canonical_id
  from inbox_items
  where capture_id is not null
)
select id as duplicate_id
from ranked_inbox_items
where id <> canonical_id;

delete from inbox_items
where id in (select duplicate_id from inbox_item_dedupe_map);

create temporary table capture_session_dedupe_map on commit drop as
with ranked_capture_sessions as (
  select
    id,
    first_value(id) over (
      partition by capture_id, session_key
      order by started_at asc, id asc
    ) as canonical_id
  from capture_sessions
)
select
  id as duplicate_id,
  canonical_id
from ranked_capture_sessions
where id <> canonical_id;

update capture_events as event
set capture_session_id = map.canonical_id
from capture_session_dedupe_map as map
where event.capture_session_id = map.duplicate_id;

delete from capture_sessions
where id in (select duplicate_id from capture_session_dedupe_map);

create temporary table capture_event_dedupe_map on commit drop as
with ranked_capture_events as (
  select
    id,
    first_value(id) over (
      partition by capture_id, kind
      order by created_at asc, id asc
    ) as canonical_id
  from capture_events
)
select id as duplicate_id
from ranked_capture_events
where id <> canonical_id;

delete from capture_events
where id in (select duplicate_id from capture_event_dedupe_map);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'capture_events_capture_session_capture_id_fkey' AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE capture_events
      ADD CONSTRAINT capture_events_capture_session_capture_id_fkey
      FOREIGN KEY (capture_session_id, capture_id) REFERENCES capture_sessions(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'capture_segments_capture_part_capture_id_fkey' AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE capture_segments
      ADD CONSTRAINT capture_segments_capture_part_capture_id_fkey
      FOREIGN KEY (capture_part_id, capture_id) REFERENCES capture_parts(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_entities_segment_capture_id_fkey' AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE candidate_entities
      ADD CONSTRAINT candidate_entities_segment_capture_id_fkey
      FOREIGN KEY (segment_id, capture_id) REFERENCES capture_segments(id, capture_id) ON DELETE CASCADE;
  END IF;
END $$;

create unique index if not exists captures_client_request_id_unique
  on captures (client_request_id);

create unique index if not exists inbox_items_capture_id_item_type_unique
  on inbox_items (capture_id, item_type);

create unique index if not exists capture_sessions_capture_id_session_key_unique
  on capture_sessions (capture_id, session_key);

create unique index if not exists capture_events_capture_id_kind_unique
  on capture_events (capture_id, kind);

commit;
