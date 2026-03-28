import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupTask2SchemaDb } from './schema-test-helpers';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for @assistant/db tests');
}

describe('core schema', () => {
  let dbClient: Awaited<ReturnType<typeof setupTask2SchemaDb>>['dbClient'];
  let cleanup = async () => undefined;

  beforeAll(async () => {
    ({ dbClient, cleanup } = await setupTask2SchemaDb([
      '001_bootstrap.sql',
      '002_core_entities.sql',
      '003_capture_pipeline.sql',
      '004_task2_integrity_backfill.sql',
    ]));
  });

  afterAll(async () => {
    await cleanup();
  });

  it('creates root entity tables', async () => {
    const result = await dbClient.db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = current_schema()
        and table_name in ('entities', 'actors', 'contexts', 'work_items', 'events', 'resources', 'memory_items', 'rules')
    `);

    expect(result.rows).toHaveLength(8);
  });

  it('rejects invalid entity kinds and subtype combinations', async () => {
    await expect(
      dbClient.db.execute(sql`
        insert into entities (id, kind, subtype, title)
        values (${randomUUID()}, 'actor', 'deadline', 'invalid entity')
      `),
    ).rejects.toThrow();
  });

  it('requires subtype rows to match the owning entity kind', async () => {
    const entityId = randomUUID();

    await dbClient.db.execute(sql`
      insert into entities (id, kind, title)
      values (${entityId}, 'actor', 'Ada')
    `);

    await dbClient.db.execute(sql`
      insert into actors (entity_id, kind, title)
      values (${entityId}, 'actor', 'Ada')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into contexts (entity_id, kind, title)
        values (${entityId}, 'context', 'shared context')
      `),
    ).rejects.toThrow();
  });

  it('rejects invalid relation kinds', async () => {
    const fromEntityId = randomUUID();
    const toEntityId = randomUUID();

    await dbClient.db.execute(sql`
      insert into entities (id, kind, title)
      values (${fromEntityId}, 'actor', 'Source')
    `);
    await dbClient.db.execute(sql`
      insert into entities (id, kind, title)
      values (${toEntityId}, 'context', 'Target')
    `);

    await expect(
      dbClient.db.execute(sql`
        insert into entity_relations (id, from_entity_id, to_entity_id, kind)
        values (${randomUUID()}, ${fromEntityId}, ${toEntityId}, 'bogus')
      `),
    ).rejects.toThrow();
  });

  it('creates a provenance foreign key from entities to captures', async () => {
    const result = await dbClient.db.execute(sql`
      select 1
      from information_schema.table_constraints
      where table_schema = current_schema()
        and table_name = 'entities'
        and constraint_name = 'entities_source_capture_id_fkey'
        and constraint_type = 'FOREIGN KEY'
    `);

    expect(result.rows).toHaveLength(1);
  });
});
