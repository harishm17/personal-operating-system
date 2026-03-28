import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupTask2SchemaDb } from './schema-test-helpers';

const maybeDescribe = process.env.DATABASE_URL ? describe : describe.skip;

maybeDescribe('task 2 backfill migration', () => {
  let dbClient: Awaited<ReturnType<typeof setupTask2SchemaDb>>['dbClient'];
  let cleanup = async () => undefined;

  beforeAll(async () => {
    ({ dbClient, cleanup } = await setupTask2SchemaDb([
      '001_bootstrap.sql',
      '002_core_entities.sql',
      '003_capture_pipeline.sql',
    ]));
  });

  afterAll(async () => {
    await cleanup();
  });

  it('repairs dirty legacy state and is safe to replay', async () => {
    const captureA = randomUUID();
    const captureB = randomUUID();
    const partA = randomUUID();
    const segmentId = randomUUID();
    const orphanEntityId = randomUUID();
    const validEntityId = randomUUID();

    await dbClient.db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values (${captureA}, 'web', 'chat', 'capture a', ${randomUUID()}), (${captureB}, 'web', 'chat', 'capture b', ${randomUUID()})
    `);

    await dbClient.db.execute(sql`
      insert into capture_parts (id, capture_id, part_index, kind, content_text)
      values (${partA}, ${captureA}, 0, 'message', 'part a')
    `);

    await dbClient.db.execute(sql`
      alter table capture_segments drop constraint if exists capture_segments_capture_part_capture_id_fkey
    `);
    await dbClient.db.execute(sql`
      alter table actors drop constraint if exists actors_entity_kind_fk
    `);

    await dbClient.db.execute(sql`
      insert into capture_segments (id, capture_part_id, capture_id, segment_index, kind, content_text)
      values (${segmentId}, ${partA}, ${captureB}, 0, 'sentence', 'legacy mismatched segment')
    `);

    await dbClient.db.execute(sql`
      insert into entities (id, kind, title)
      values (${validEntityId}, 'actor', 'valid actor')
    `);
    await dbClient.db.execute(sql`
      insert into actors (entity_id, kind, title)
      values (${validEntityId}, 'actor', 'valid actor')
    `);
    await dbClient.db.execute(sql`
      insert into actors (entity_id, kind, title)
      values (${orphanEntityId}, 'actor', 'orphan actor')
    `);

    for (const migrationName of ['004_task2_integrity_backfill.sql', '004_task2_integrity_backfill.sql']) {
      const migrationSql = readFileSync(
        new URL(`../../../../../infra/migrations/${migrationName}`, import.meta.url),
        'utf8',
      );
      await dbClient.pool.query(migrationSql);
    }

    const repairedSegment = await dbClient.db.execute(sql`
      select capture_id
      from capture_segments
      where id = ${segmentId}
    `);
    const orphanActor = await dbClient.db.execute(sql`
      select count(*)::int as count
      from actors
      where entity_id = ${orphanEntityId}
    `);
    const validActor = await dbClient.db.execute(sql`
      select count(*)::int as count
      from actors
      where entity_id = ${validEntityId}
    `);
    const restoredConstraint = await dbClient.db.execute(sql`
      select 1
      from information_schema.table_constraints
      where table_schema = current_schema()
        and table_name = 'capture_segments'
        and constraint_name = 'capture_segments_capture_part_capture_id_fkey'
        and constraint_type = 'FOREIGN KEY'
    `);
    const restoredTrigger = await dbClient.db.execute(sql`
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = current_schema()
        and c.relname = 'attachments'
        and t.tgname = 'attachments_sync_capture_id'
        and not t.tgisinternal
    `);

    expect(repairedSegment.rows[0]?.capture_id).toBe(captureA);
    expect(orphanActor.rows[0]?.count).toBe(0);
    expect(validActor.rows[0]?.count).toBe(1);
    expect(restoredConstraint.rows).toHaveLength(1);
    expect(restoredTrigger.rows).toHaveLength(1);
  });
});
