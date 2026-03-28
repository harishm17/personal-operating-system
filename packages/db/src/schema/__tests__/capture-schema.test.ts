import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupTask2SchemaDb } from './schema-test-helpers';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for @assistant/db tests');
}

describe('capture schema', () => {
  let dbClient: Awaited<ReturnType<typeof setupTask2SchemaDb>>['dbClient'];
  let cleanup = async () => undefined;

  beforeAll(async () => {
    ({ dbClient, cleanup } = await setupTask2SchemaDb([
      '001_bootstrap.sql',
      '002_core_entities.sql',
      '003_capture_pipeline.sql',
      '004_task2_integrity_backfill.sql',
      '005_capture_jobs.sql',
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

  it('includes capture_jobs for durable process-capture enqueues', async () => {
    const result = await dbClient.db.execute(sql`
      select 1
      from information_schema.tables
      where table_schema = current_schema()
        and table_name = 'capture_jobs'
    `);

    expect(result.rows).toHaveLength(1);
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
