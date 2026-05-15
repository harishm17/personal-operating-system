begin;

create temporary table capture_job_guardrail_dedupe_map on commit drop as
with ranked_capture_jobs as (
  select
    id,
    row_number() over (
      partition by capture_id, job_name
      order by created_at asc, id asc
    ) as row_number
  from capture_jobs
)
select id as duplicate_id
from ranked_capture_jobs
where row_number > 1;

delete from capture_jobs
where id in (select duplicate_id from capture_job_guardrail_dedupe_map);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capture_jobs_capture_id_job_name_key'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE capture_jobs
      ADD CONSTRAINT capture_jobs_capture_id_job_name_key UNIQUE (capture_id, job_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capture_jobs_job_name_check'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE capture_jobs
      ADD CONSTRAINT capture_jobs_job_name_check
      CHECK (job_name in ('process-capture')) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capture_jobs_status_check'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE capture_jobs
      ADD CONSTRAINT capture_jobs_status_check
      CHECK (status in ('pending', 'processing', 'completed', 'failed')) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'capture_jobs_processed_at_consistency_check'
      AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
  ) THEN
    ALTER TABLE capture_jobs
      ADD CONSTRAINT capture_jobs_processed_at_consistency_check
      CHECK (
        (status not in ('pending', 'processing', 'completed', 'failed'))
        or (((status in ('completed', 'failed')) and processed_at is not null)
        or ((status in ('pending', 'processing')) and processed_at is null))
      ) NOT VALID;
  END IF;
END $$;

commit;
