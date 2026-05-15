import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
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

function listMigrations() {
  return readdirSync(new URL('../../../../../infra/migrations/', import.meta.url))
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function readMigration(name: string) {
  return readFileSync(new URL(`../../../../../infra/migrations/${name}`, import.meta.url), 'utf8');
}

const idempotencyMigrationName = '006_capture_idempotency_uniques.sql';

function toLegacyCapturePipeline(sqlText: string) {
  return sqlText
    .replace(',\n  constraint captures_client_request_id_unique unique (client_request_id)', '')
    .replace(',\n  constraint capture_sessions_capture_id_session_key_unique unique (capture_id, session_key)', '')
    .replace(',\n  constraint capture_events_capture_id_kind_unique unique (capture_id, kind)', '')
    .replace(',\n  constraint inbox_items_capture_id_item_type_unique unique (capture_id, item_type)', '');
}

const legacyCaptureJobsMigration = `create table if not exists capture_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  job_name text not null,
  dedupe_key text not null,
  status text not null default 'pending',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (dedupe_key)
);
`;

describe('capture forward migration', () => {
  let dbClient: Awaited<ReturnType<typeof setupTask2SchemaDb>>['dbClient'];
  let cleanup: () => Promise<void> = async () => undefined;

  beforeAll(async () => {
    ({ dbClient, cleanup } = await setupTask2SchemaDb(listMigrations(), {
      migrationSqlOverrides: {
        '003_capture_pipeline.sql': toLegacyCapturePipeline(readMigration('003_capture_pipeline.sql')),
      },
    }));
  });

  afterAll(async () => {
    await cleanup();
  });

  it('collapses dirty legacy duplicates before adding capture idempotency uniques', async () => {
    const { dbClient: legacyDbClient, cleanup: cleanupLegacyDb } = await setupTask2SchemaDb(
      listMigrations().filter((name) => name !== idempotencyMigrationName),
      {
        migrationSqlOverrides: {
          '003_capture_pipeline.sql': toLegacyCapturePipeline(readMigration('003_capture_pipeline.sql')),
        },
      },
    );

    const clientRequestId = `legacy-request:${randomUUID()}`;
    const canonicalCaptureId = randomUUID();
    const duplicateCaptureId = randomUUID();
    const canonicalSessionId = randomUUID();
    const duplicateSessionId = randomUUID();
    const canonicalEventId = randomUUID();
    const duplicateEventId = randomUUID();
    const relinkedEventId = randomUUID();
    const canonicalInboxItemId = randomUUID();
    const duplicateInboxItemId = randomUUID();
    const relinkedInboxItemId = randomUUID();
    const partId = randomUUID();
    const segmentId = randomUUID();
    const attachmentId = randomUUID();
    const candidateEntityId = randomUUID();
    const entityId = randomUUID();
    const jobId = randomUUID();

    try {
      await legacyDbClient.db.execute(sql`
        insert into captures (
          id,
          channel,
          source_type,
          content_text,
          client_request_id,
          created_at
        )
        values
          (${canonicalCaptureId}, 'web', 'quick_capture', 'canonical dirty capture', ${clientRequestId}, '2026-01-01T00:00:00Z'::timestamptz),
          (${duplicateCaptureId}, 'web', 'quick_capture', 'duplicate dirty capture', ${clientRequestId}, '2026-01-02T00:00:00Z'::timestamptz)
      `);

      await legacyDbClient.db.execute(sql`
        insert into capture_sessions (
          id,
          capture_id,
          session_key,
          started_at
        )
        values
          (${canonicalSessionId}, ${canonicalCaptureId}, 'capture:web:singleton', '2026-01-01T00:01:00Z'::timestamptz),
          (${duplicateSessionId}, ${duplicateCaptureId}, 'capture:web:singleton', '2026-01-02T00:01:00Z'::timestamptz)
      `);

      await legacyDbClient.db.execute(sql`
        insert into capture_events (
          id,
          capture_id,
          capture_session_id,
          kind,
          created_at
        )
        values
          (${canonicalEventId}, ${canonicalCaptureId}, ${canonicalSessionId}, 'capture_received', '2026-01-01T00:02:00Z'::timestamptz),
          (${duplicateEventId}, ${duplicateCaptureId}, ${duplicateSessionId}, 'capture_received', '2026-01-02T00:02:00Z'::timestamptz),
          (${relinkedEventId}, ${duplicateCaptureId}, ${duplicateSessionId}, 'capture_promoted', '2026-01-02T00:03:00Z'::timestamptz)
      `);

      await legacyDbClient.db.execute(sql`
        insert into inbox_items (
          id,
          capture_id,
          item_type,
          title,
          created_at
        )
        values
          (${canonicalInboxItemId}, ${canonicalCaptureId}, 'capture_review', 'canonical inbox item', '2026-01-01T00:04:00Z'::timestamptz),
          (${duplicateInboxItemId}, ${duplicateCaptureId}, 'capture_review', 'duplicate inbox item', '2026-01-02T00:04:00Z'::timestamptz),
          (${relinkedInboxItemId}, ${duplicateCaptureId}, 'capture_summary', 'relinked inbox item', '2026-01-02T00:05:00Z'::timestamptz)
      `);

      await legacyDbClient.db.execute(sql`
        insert into capture_parts (
          id,
          capture_id,
          part_index,
          kind,
          content_text,
          created_at
        )
        values (
          ${partId},
          ${duplicateCaptureId},
          0,
          'text',
          'legacy part',
          '2026-01-02T00:06:00Z'::timestamptz
        )
      `);

      await legacyDbClient.db.execute(sql`
        insert into capture_segments (
          id,
          capture_part_id,
          capture_id,
          segment_index,
          kind,
          content_text,
          created_at
        )
        values (
          ${segmentId},
          ${partId},
          ${duplicateCaptureId},
          0,
          'text',
          'legacy segment',
          '2026-01-02T00:07:00Z'::timestamptz
        )
      `);

      await legacyDbClient.db.execute(sql`
        insert into attachments (id, capture_id, segment_id, file_name, storage_key)
        values (${attachmentId}, ${duplicateCaptureId}, ${segmentId}, 'legacy.txt', 'attachments/legacy.txt')
      `);

      await legacyDbClient.db.execute(sql`
        insert into candidate_entities (
          id,
          capture_id,
          segment_id,
          kind,
          subtype,
          title,
          confidence
        )
        values (
          ${candidateEntityId},
          ${duplicateCaptureId},
          ${segmentId},
          'event',
          'capture',
          'Legacy candidate',
          0.9500
        )
      `);

      await legacyDbClient.db.execute(sql`
        insert into entities (id, kind, subtype, title, source_capture_id)
        values (${entityId}, 'event', 'capture', 'Legacy entity', ${duplicateCaptureId})
      `);

      await legacyDbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key)
        values (${jobId}, ${duplicateCaptureId}, 'process-capture', ${`process-capture:${jobId}`})
      `);

      await expect(legacyDbClient.pool.query(readMigration(idempotencyMigrationName))).resolves.toBeDefined();

      const captureDuplicates = await legacyDbClient.db.execute(sql`
        select client_request_id
        from captures
        group by client_request_id
        having count(*) > 1
      `);
      const inboxDuplicates = await legacyDbClient.db.execute(sql`
        select capture_id, item_type
        from inbox_items
        where capture_id is not null
        group by capture_id, item_type
        having count(*) > 1
      `);
      const sessionDuplicates = await legacyDbClient.db.execute(sql`
        select capture_id, session_key
        from capture_sessions
        group by capture_id, session_key
        having count(*) > 1
      `);
      const eventDuplicates = await legacyDbClient.db.execute(sql`
        select capture_id, kind
        from capture_events
        group by capture_id, kind
        having count(*) > 1
      `);

      expect(captureDuplicates.rows).toHaveLength(0);
      expect(inboxDuplicates.rows).toHaveLength(0);
      expect(sessionDuplicates.rows).toHaveLength(0);
      expect(eventDuplicates.rows).toHaveLength(0);

      const survivingCapture = await legacyDbClient.db.execute(sql`
        select id
        from captures
        where client_request_id = ${clientRequestId}
      `);
      expect(survivingCapture.rows).toEqual([{ id: canonicalCaptureId }]);

      const survivingSession = await legacyDbClient.db.execute(sql`
        select id
        from capture_sessions
        where capture_id = ${canonicalCaptureId}
          and session_key = 'capture:web:singleton'
      `);
      expect(survivingSession.rows).toEqual([{ id: canonicalSessionId }]);

      const relinkedRows = await legacyDbClient.db.execute(sql`
        select
          (select capture_id from capture_parts where id = ${partId}) as "partCaptureId",
          (select capture_id from capture_segments where id = ${segmentId}) as "segmentCaptureId",
          (select capture_id from attachments where id = ${attachmentId}) as "attachmentCaptureId",
          (select capture_id from candidate_entities where id = ${candidateEntityId}) as "candidateCaptureId",
          (select source_capture_id from entities where id = ${entityId}) as "entitySourceCaptureId",
          (select capture_id from capture_jobs where id = ${jobId}) as "jobCaptureId",
          (select capture_id from inbox_items where id = ${relinkedInboxItemId}) as "relinkedInboxCaptureId",
          (select capture_id from capture_events where id = ${relinkedEventId}) as "relinkedEventCaptureId",
          (select capture_session_id from capture_events where id = ${relinkedEventId}) as "relinkedEventSessionId"
      `);

      expect(relinkedRows.rows[0]).toMatchObject({
        partCaptureId: canonicalCaptureId,
        segmentCaptureId: canonicalCaptureId,
        attachmentCaptureId: canonicalCaptureId,
        candidateCaptureId: canonicalCaptureId,
        entitySourceCaptureId: canonicalCaptureId,
        jobCaptureId: canonicalCaptureId,
        relinkedInboxCaptureId: canonicalCaptureId,
        relinkedEventCaptureId: canonicalCaptureId,
        relinkedEventSessionId: canonicalSessionId,
      });

      await expect(
        legacyDbClient.db.execute(sql`
          insert into captures (id, channel, source_type, content_text, client_request_id)
          values (${randomUUID()}, 'web', 'quick_capture', 'duplicate after migration', ${clientRequestId})
        `),
      ).rejects.toMatchObject({
        cause: {
          code: '23505',
          constraint: 'captures_client_request_id_unique',
        },
      });

      await expect(
        legacyDbClient.db.execute(sql`
          insert into inbox_items (id, capture_id, item_type, title)
          values (${randomUUID()}, ${canonicalCaptureId}, 'capture_review', 'duplicate inbox after migration')
        `),
      ).rejects.toMatchObject({
        cause: {
          code: '23505',
          constraint: 'inbox_items_capture_id_item_type_unique',
        },
      });

      await expect(
        legacyDbClient.db.execute(sql`
          insert into capture_sessions (id, capture_id, session_key)
          values (${randomUUID()}, ${canonicalCaptureId}, 'capture:web:singleton')
        `),
      ).rejects.toMatchObject({
        cause: {
          code: '23505',
          constraint: 'capture_sessions_capture_id_session_key_unique',
        },
      });

      await expect(
        legacyDbClient.db.execute(sql`
          insert into capture_events (id, capture_id, kind)
          values (${randomUUID()}, ${canonicalCaptureId}, 'capture_received')
        `),
      ).rejects.toMatchObject({
        cause: {
          code: '23505',
          constraint: 'capture_events_capture_id_kind_unique',
        },
      });
    } finally {
      await cleanupLegacyDb();
    }
  });

  it('adds replay uniqueness constraints when upgrading an existing capture schema', async () => {
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

  it('adds durable capture job guardrails when upgrading from the original capture_jobs migration', async () => {
    const { dbClient: legacyDbClient, cleanup: cleanupLegacyDb } = await setupTask2SchemaDb(
      listMigrations(),
      {
        migrationSqlOverrides: {
          '005_capture_jobs.sql': legacyCaptureJobsMigration,
        },
      },
    );

    const captureId = randomUUID();
    const jobId = randomUUID();

    try {
      const constraints = await legacyDbClient.db.execute(sql`
        select constraint_name
        from information_schema.table_constraints
        where table_schema = current_schema()
          and table_name = 'capture_jobs'
          and constraint_name in (
            'capture_jobs_job_name_check',
            'capture_jobs_status_check',
            'capture_jobs_processed_at_consistency_check',
            'capture_jobs_capture_id_job_name_key'
          )
      `);

      expect(constraints.rows.map((row) => row.constraint_name).sort()).toEqual([
        'capture_jobs_capture_id_job_name_key',
        'capture_jobs_job_name_check',
        'capture_jobs_processed_at_consistency_check',
        'capture_jobs_status_check',
      ]);

      await legacyDbClient.db.execute(sql`
        insert into captures (id, channel, source_type, content_text, client_request_id)
        values (${captureId}, 'web', 'quick_capture', 'capture job guardrail seed', ${randomUUID()})
      `);

      await legacyDbClient.db.execute(sql`
        insert into capture_jobs (id, capture_id, job_name, dedupe_key)
        values (${jobId}, ${captureId}, 'process-capture', ${`process-capture:${captureId}`})
      `);

      await expect(
        legacyDbClient.db.execute(sql`
          insert into capture_jobs (id, capture_id, job_name, dedupe_key)
          values (${randomUUID()}, ${captureId}, 'process-capture', ${`process-capture:${captureId}:retry`})
        `),
      ).rejects.toMatchObject({
        cause: {
          code: '23505',
          constraint: 'capture_jobs_capture_id_job_name_key',
        },
      });

      await expect(
        legacyDbClient.db.execute(sql`
          insert into capture_jobs (id, capture_id, job_name, dedupe_key)
          values (${randomUUID()}, ${captureId}, 'process_capture', ${`bad-job:${captureId}`})
        `),
      ).rejects.toMatchObject({
        cause: {
          code: '23514',
          constraint: 'capture_jobs_job_name_check',
        },
      });
    } finally {
      await cleanupLegacyDb();
    }
  });
});
