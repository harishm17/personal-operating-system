import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../../index';

const maybeDescribe = process.env.DATABASE_URL ? describe : describe.skip;

const readMigration = (name: string) =>
  readFileSync(new URL(`../../../../../infra/migrations/${name}`, import.meta.url), 'utf8');

maybeDescribe('task 2 backfill migration', () => {
  let dbClient!: ReturnType<typeof createDb>;

  beforeAll(() => {
    dbClient = createDb();
  });

  afterAll(async () => {
    await dbClient.pool.end();
  });

  it('repairs dirty legacy state and is safe to replay', async () => {
    const client = await dbClient.pool.connect();
    const schema = `task2_${randomUUID().replace(/-/g, '')}`;

    try {
      await client.query('begin');
      await client.query(`create schema "${schema}"`);
      await client.query(`set local search_path to "${schema}", public`);

      for (const migrationName of ['001_bootstrap.sql', '002_core_entities.sql', '003_capture_pipeline.sql']) {
        await client.query(readMigration(migrationName));
      }

      const captureA = randomUUID();
      const captureB = randomUUID();
      const partA = randomUUID();
      const segmentId = randomUUID();
      const orphanEntityId = randomUUID();
      const validEntityId = randomUUID();

      await client.query(
        `insert into captures (id, channel, source_type, content_text, client_request_id)
         values ($1, 'web', 'chat', 'capture a', $2), ($3, 'web', 'chat', 'capture b', $4)`,
        [captureA, randomUUID(), captureB, randomUUID()],
      );

      await client.query(
        `insert into capture_parts (id, capture_id, part_index, kind, content_text)
         values ($1, $2, 0, 'message', 'part a')`,
        [partA, captureA],
      );

      await client.query(`alter table capture_segments drop constraint if exists capture_segments_capture_part_capture_id_fkey`);
      await client.query(`alter table actors drop constraint if exists actors_entity_kind_fk`);

      await client.query(
        `insert into capture_segments (id, capture_part_id, capture_id, segment_index, kind, content_text)
         values ($1, $2, $3, 0, 'sentence', 'legacy mismatched segment')`,
        [segmentId, partA, captureB],
      );

      await client.query(
        `insert into entities (id, kind, title)
         values ($1, 'actor', 'valid actor')`,
        [validEntityId],
      );
      await client.query(
        `insert into actors (entity_id, kind, title)
         values ($1, 'actor', 'valid actor')`,
        [validEntityId],
      );
      await client.query(
        `insert into actors (entity_id, kind, title)
         values ($1, 'actor', 'orphan actor')`,
        [orphanEntityId],
      );

      for (const migrationName of ['004_task2_integrity_backfill.sql', '004_task2_integrity_backfill.sql']) {
        await client.query(readMigration(migrationName));
      }

      const repairedSegment = await client.query(
        `select capture_id from capture_segments where id = $1`,
        [segmentId],
      );
      const orphanActor = await client.query(
        `select count(*)::int as count from actors where entity_id = $1`,
        [orphanEntityId],
      );
      const validActor = await client.query(
        `select count(*)::int as count from actors where entity_id = $1`,
        [validEntityId],
      );

      expect(repairedSegment.rows[0]?.capture_id).toBe(captureA);
      expect(orphanActor.rows[0]?.count).toBe(0);
      expect(validActor.rows[0]?.count).toBe(1);
    } finally {
      await client.query('rollback').catch(() => undefined);
      client.release();
    }
  });
});
