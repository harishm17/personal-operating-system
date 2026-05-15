import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { captureJobs, dbSchema } from '..';
import { setupTask2SchemaDb } from './schema-test-helpers';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for @assistant/db tests');
}

type PostgresError = Error & {
  cause?: {
    code?: string;
    constraint?: string;
  };
};

describe('capture schema', () => {
  let dbClient: Awaited<ReturnType<typeof setupTask2SchemaDb>>['dbClient'];
  let cleanup: () => Promise<void> = async () => undefined;

  beforeAll(async () => {
    ({ dbClient, cleanup } = await setupTask2SchemaDb([
      '001_bootstrap.sql',
      '002_core_entities.sql',
      '003_capture_pipeline.sql',
      '004_task2_integrity_backfill.sql',
      '005_capture_jobs.sql',
      '006_capture_idempotency_uniques.sql',
      '007_capture_job_guardrails.sql',
    ]));
  });

  afterAll(async () => {
    await cleanup();
  });

  it('creates capture pipeline tables', async () => {
    const result = await dbClient.db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = current_schema()
        and table_name in ('captures', 'capture_sessions', 'capture_events', 'capture_parts', 'capture_segments', 'attachments', 'inbox_items', 'candidate_entities')
    `);

    expect(result.rows).toHaveLength(8);
  });


  it('enforces unique capture request ids and replay singleton side effects', async () => {
    const captureId = randomUUID();
    const sessionId = randomUUID();
    const inboxItemId = randomUUID();
    const eventId = randomUUID();
    const clientRequestId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureId}, 'web', 'quick_capture', 'capture uniqueness seed', ${clientRequestId})
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into captures (id, channel, source_type, content_text, client_request_id)
        values (${randomUUID()}, 'web', 'quick_capture', 'duplicate client request id', ${clientRequestId})
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'captures_client_request_id_unique',
      },
    });

    await dbClient.db.execute(sql`
      insert into inbox_items (id, capture_id, item_type, title)
      values (${inboxItemId}, ${captureId}, 'capture_review', 'singleton inbox item')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into inbox_items (id, capture_id, item_type, title)
        values (${randomUUID()}, ${captureId}, 'capture_review', 'duplicate singleton inbox item')
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'inbox_items_capture_id_item_type_unique',
      },
    });

    await dbClient.db.execute(sql`
      insert into capture_sessions (id, capture_id, session_key)
      values (${sessionId}, ${captureId}, 'capture:web:singleton')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into capture_sessions (id, capture_id, session_key)
        values (${randomUUID()}, ${captureId}, 'capture:web:singleton')
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'capture_sessions_capture_id_session_key_unique',
      },
    });

    await dbClient.db.execute(sql`
      insert into capture_events (id, capture_id, kind)
      values (${eventId}, ${captureId}, 'capture_received')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into capture_events (id, capture_id, kind)
        values (${randomUUID()}, ${captureId}, 'capture_received')
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'capture_events_capture_id_kind_unique',
      },
    });
  });

  it('includes capture_jobs for durable process-capture enqueues', async () => {
    const result = await dbClient.db.execute(sql`
      select 1
      from information_schema.tables
      where table_schema = current_schema()
        and table_name = 'capture_jobs'
    `);

    expect(result.rows).toHaveLength(1);
  });

  it('exports capture_jobs through dbSchema with the expected columns', () => {
    expect(dbSchema.captureJobs).toBe(captureJobs);
    expect(captureJobs).toMatchObject({
      id: expect.anything(),
      captureId: expect.anything(),
      jobName: expect.anything(),
      dedupeKey: expect.anything(),
      status: expect.anything(),
      payloadJson: expect.anything(),
      createdAt: expect.anything(),
      availableAt: expect.anything(),
      processedAt: expect.anything(),
    });
  });

  it('enforces durable capture job defaults and dedupe behavior', async () => {
    const captureId = randomUUID();
    const jobId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureId}, 'web', 'quick_capture', 'capture job payload', ${randomUUID()})
    `);

    await dbClient.db.execute(sql`
      insert into capture_jobs (id, capture_id, job_name, dedupe_key)
      values (${jobId}, ${captureId}, 'process-capture', ${`process-capture:${captureId}`})
    `);

    const inserted = await dbClient.db.execute(sql`
      select
        status,
        created_at as "createdAt",
        available_at as "availableAt"
      from capture_jobs
      where id = ${jobId}
    `);

    expect(inserted.rows[0]).toMatchObject({ status: 'pending' });
    expect(inserted.rows[0]?.createdAt).toBeTruthy();
    expect(inserted.rows[0]?.availableAt).toBeTruthy();

    await expect(
      dbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key)
        values (${randomUUID()}, ${captureId}, 'process-capture', ${`process-capture:${captureId}`})
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'capture_jobs_dedupe_key_key',
      },
    });

    await expect(
      dbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key)
        values (${randomUUID()}, ${captureId}, 'process-capture', ${`process-capture:${captureId}:second-attempt`})
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23505',
        constraint: 'capture_jobs_capture_id_job_name_key',
      },
    });
  });

  it('rejects unsupported capture job names and inconsistent processed timestamps', async () => {
    const captureId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureId}, 'web', 'quick_capture', 'capture for constraints', ${randomUUID()})
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key)
        values (${randomUUID()}, ${captureId}, 'process_capture', ${`bad-job-name:${captureId}`})
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23514',
        constraint: 'capture_jobs_job_name_check',
      },
    });

    await expect(
      dbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key, status, processed_at)
        values (${randomUUID()}, ${captureId}, 'process-capture', ${`pending-with-processed:${captureId}`}, 'pending', now())
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23514',
        constraint: 'capture_jobs_processed_at_consistency_check',
      },
    });

    await expect(
      dbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key, status)
        values (${randomUUID()}, ${captureId}, 'process-capture', ${`completed-without-processed:${captureId}`}, 'completed')
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23514',
        constraint: 'capture_jobs_processed_at_consistency_check',
      },
    });
  });

  it('accepts terminal capture job statuses when processed_at is set', async () => {
    const completedCaptureId = randomUUID();
    const failedCaptureId = randomUUID();
    const completedJobId = randomUUID();
    const failedJobId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values
        (${completedCaptureId}, 'web', 'quick_capture', 'completed capture for terminal statuses', ${randomUUID()}),
        (${failedCaptureId}, 'web', 'quick_capture', 'failed capture for terminal statuses', ${randomUUID()})
    `);

    await dbClient.db.execute(sql`
      insert into capture_jobs (id, capture_id, job_name, dedupe_key, status, processed_at)
      values
        (${completedJobId}, ${completedCaptureId}, 'process-capture', ${`completed:${completedCaptureId}`}, 'completed', now()),
        (${failedJobId}, ${failedCaptureId}, 'process-capture', ${`failed:${failedCaptureId}`}, 'failed', now())
    `);

    const inserted = await dbClient.db.execute(sql`
      select status, processed_at as "processedAt"
      from capture_jobs
      where id in (${completedJobId}, ${failedJobId})
      order by status asc
    `);

    expect(inserted.rows).toHaveLength(2);
    expect(inserted.rows).toEqual([
      expect.objectContaining({ status: 'completed', processedAt: expect.any(String) }),
      expect.objectContaining({ status: 'failed', processedAt: expect.any(String) }),
    ]);
    expect(inserted.rows.every((row) => Boolean(row.processedAt))).toBe(true);
  });

  it('rejects invalid capture job statuses and cascades deletes from captures', async () => {
    const captureId = randomUUID();
    const cascadeJobId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureId}, 'web', 'quick_capture', 'capture for cascade', ${randomUUID()})
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key, status)
        values (${randomUUID()}, ${captureId}, 'process-capture', ${`bad-status:${captureId}`}, 'pendng')
      `),
    ).rejects.toMatchObject({
      cause: {
        code: '23514',
        constraint: 'capture_jobs_status_check',
      },
    });

    await dbClient.db.execute(sql`
      insert into capture_jobs (id, capture_id, job_name, dedupe_key)
      values (${cascadeJobId}, ${captureId}, 'process-capture', ${`cascade:${captureId}`})
    `);

    await dbClient.db.execute(sql`
      delete from captures
      where id = ${captureId}
    `);

    const deleted = await dbClient.db.execute(sql`
      select 1
      from capture_jobs
      where id = ${cascadeJobId}
    `);

    expect(deleted.rows).toHaveLength(0);
  });

  it('exposes the promotion link and confidence guard on candidates and attachments', async () => {
    const candidateColumns = await dbClient.db.execute(sql`
      select column_name
      from information_schema.columns
      where table_schema = current_schema()
        and table_name = 'candidate_entities'
        and column_name in ('promoted_entity_id', 'promoted_entity_kind')
    `);

    const candidateFk = await dbClient.db.execute(sql`
      select 1
      from information_schema.table_constraints
      where table_schema = current_schema()
        and table_name = 'candidate_entities'
        and constraint_name = 'candidate_entities_promoted_entity_id_kind_fkey'
        and constraint_type = 'FOREIGN KEY'
    `);

    const confidenceCheck = await dbClient.db.execute(sql`
      select 1
      from information_schema.table_constraints
      where table_schema = current_schema()
        and table_name = 'candidate_entities'
        and constraint_name = 'candidate_entities_confidence_range_check'
        and constraint_type = 'CHECK'
    `);

    const attachmentFk = await dbClient.db.execute(sql`
      select 1
      from information_schema.table_constraints
      where table_schema = current_schema()
        and table_name = 'attachments'
        and constraint_name = 'attachments_segment_id_fkey'
        and constraint_type = 'FOREIGN KEY'
    `);

    expect(candidateColumns.rows).toHaveLength(2);
    expect(candidateFk.rows).toHaveLength(1);
    expect(confidenceCheck.rows).toHaveLength(1);
    expect(attachmentFk.rows).toHaveLength(1);
  });

  it('normalizes attachment capture ids from segments and detaches them on segment delete', async () => {
    const captureA = randomUUID();
    const captureB = randomUUID();
    const partA = randomUUID();
    const segmentA = randomUUID();
    const attachmentId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureA}, 'web', 'chat', 'capture a', ${randomUUID()}), (${captureB}, 'web', 'chat', 'capture b', ${randomUUID()})
    `);

    await dbClient.db.execute(sql`
      insert into capture_parts (id, capture_id, part_index, kind, content_text)
      values (${partA}, ${captureA}, 0, 'message', 'part a')
    `);

    await dbClient.db.execute(sql`
      insert into capture_segments (id, capture_part_id, capture_id, segment_index, kind, content_text)
      values (${segmentA}, ${partA}, ${captureA}, 0, 'sentence', 'segment a')
    `);

    await dbClient.db.execute(sql`
      insert into attachments (id, capture_id, segment_id, file_name, storage_key)
      values (${attachmentId}, ${captureB}, ${segmentA}, 'file.txt', 'storage-key')
    `);

    const inserted = await dbClient.db.execute(sql`
      select capture_id as "captureId", segment_id as "segmentId"
      from attachments
      where id = ${attachmentId}
    `);

    expect(inserted.rows[0]).toEqual({ captureId: captureA, segmentId: segmentA });

    await dbClient.db.execute(sql`
      update attachments
      set capture_id = ${captureB}
      where id = ${attachmentId}
    `);

    const normalized = await dbClient.db.execute(sql`
      select capture_id as "captureId", segment_id as "segmentId"
      from attachments
      where id = ${attachmentId}
    `);

    expect(normalized.rows[0]).toEqual({ captureId: captureA, segmentId: segmentA });

    await dbClient.db.execute(sql`
      delete from capture_segments
      where id = ${segmentA}
    `);

    const detached = await dbClient.db.execute(sql`
      select capture_id as "captureId", segment_id as "segmentId"
      from attachments
      where id = ${attachmentId}
    `);

    expect(detached.rows[0]).toEqual({ captureId: captureA, segmentId: null });
  });

  it('rejects invalid candidate kinds, subtype combinations, and mismatched promotion links', async () => {
    const captureId = randomUUID();
    const partId = randomUUID();
    const segmentId = randomUUID();
    const resourceEntityId = randomUUID();
    const eventEntityId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureId}, 'web', 'chat', 'hello world', ${randomUUID()})
    `);

    await dbClient.db.execute(sql`
      insert into capture_parts (id, capture_id, part_index, kind, content_text)
      values (${partId}, ${captureId}, 0, 'message', 'hello world')
    `);

    await dbClient.db.execute(sql`
      insert into capture_segments (id, capture_part_id, capture_id, segment_index, kind, content_text)
      values (${segmentId}, ${partId}, ${captureId}, 0, 'sentence', 'hello world')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into candidate_entities (id, capture_id, segment_id, kind, subtype, title, confidence)
        values (${randomUUID()}, ${captureId}, ${segmentId}, 'relation', null, 'bad candidate', 0.5000)
      `),
    ).rejects.toThrow();

    await expect(
      dbClient.db.execute(sql`
        insert into candidate_entities (id, capture_id, segment_id, kind, subtype, title, confidence)
        values (${randomUUID()}, ${captureId}, ${segmentId}, 'resource', 'deadline', 'bad subtype', 0.5000)
      `),
    ).rejects.toThrow();

    await dbClient.db.execute(sql`
      insert into entities (id, kind, title)
      values (${resourceEntityId}, 'resource', 'resource target')
    `);

    await dbClient.db.execute(sql`
      insert into entities (id, kind, title)
      values (${eventEntityId}, 'event', 'event target')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into candidate_entities (
          id,
          capture_id,
          segment_id,
          kind,
          promoted_entity_id,
          promoted_entity_kind,
          subtype,
          title,
          confidence
        )
        values (
          ${randomUUID()},
          ${captureId},
          ${segmentId},
          'resource',
          ${eventEntityId},
          'resource',
          'webpage',
          'bad promotion link',
          0.7500
        )
      `),
    ).rejects.toThrow();
  });

  it('rejects cross-capture references for capture events and candidates', async () => {
    const captureA = randomUUID();
    const captureB = randomUUID();
    const sessionA = randomUUID();
    const sessionB = randomUUID();
    const partA = randomUUID();
    const partB = randomUUID();
    const segmentA = randomUUID();
    const segmentB = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureA}, 'web', 'chat', 'capture a', ${randomUUID()}), (${captureB}, 'web', 'chat', 'capture b', ${randomUUID()})
    `);

    await dbClient.db.execute(sql`
      insert into capture_sessions (id, capture_id, session_key)
      values (${sessionA}, ${captureA}, 'session-a'), (${sessionB}, ${captureB}, 'session-b')
    `);

    await dbClient.db.execute(sql`
      insert into capture_parts (id, capture_id, part_index, kind, content_text)
      values (${partA}, ${captureA}, 0, 'message', 'part a'), (${partB}, ${captureB}, 0, 'message', 'part b')
    `);

    await dbClient.db.execute(sql`
      insert into capture_segments (id, capture_part_id, capture_id, segment_index, kind, content_text)
      values (${segmentA}, ${partA}, ${captureA}, 0, 'sentence', 'segment a'), (${segmentB}, ${partB}, ${captureB}, 0, 'sentence', 'segment b')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into capture_events (id, capture_id, capture_session_id, kind)
        values (${randomUUID()}, ${captureA}, ${sessionB}, 'mismatch')
      `),
    ).rejects.toThrow();

    await expect(
      dbClient.db.execute(sql`
        insert into candidate_entities (id, capture_id, segment_id, kind, title, confidence)
        values (${randomUUID()}, ${captureA}, ${segmentB}, 'resource', 'cross capture candidate', 0.7500)
      `),
    ).rejects.toThrow();
  });
});
