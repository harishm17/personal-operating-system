import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../client';

describe('core schema', () => {
  it('creates root entity tables', async () => {
    const result = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('entities', 'actors', 'contexts', 'work_items', 'events', 'resources', 'memory_items', 'rules')
    `);

    expect(result.rows).toHaveLength(8);
  });

  it('rejects invalid entity kinds and subtype combinations', async () => {
    await expect(
      db.execute(sql`
        insert into entities (id, kind, subtype, title)
        values ('00000000-0000-0000-0000-000000000101', 'actor', 'deadline', 'invalid entity')
      `),
    ).rejects.toThrow();
  });

  it('requires subtype rows to match the owning entity kind', async () => {
    await db.execute(sql`
      insert into entities (id, kind, title)
      values ('00000000-0000-0000-0000-000000000102', 'actor', 'Ada')
    `);

    await db.execute(sql`
      insert into actors (entity_id, kind, title)
      values ('00000000-0000-0000-0000-000000000102', 'actor', 'Ada')
    `);

    await expect(
      db.execute(sql`
        insert into contexts (entity_id, kind, title)
        values ('00000000-0000-0000-0000-000000000102', 'context', 'shared context')
      `),
    ).rejects.toThrow();
  });

  it('rejects invalid relation kinds', async () => {
    await db.execute(sql`
      insert into entities (id, kind, title)
      values ('00000000-0000-0000-0000-000000000103', 'actor', 'Source')
    `);
    await db.execute(sql`
      insert into entities (id, kind, title)
      values ('00000000-0000-0000-0000-000000000104', 'context', 'Target')
    `);

    await expect(
      db.execute(sql`
        insert into entity_relations (id, from_entity_id, to_entity_id, kind)
        values ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000104', 'bogus')
      `),
    ).rejects.toThrow();
  });

  it('creates a provenance foreign key from entities to captures', async () => {
    const result = await db.execute(sql`
      select 1
      from information_schema.table_constraints
      where table_name = 'entities'
        and constraint_name = 'entities_source_capture_id_fkey'
        and constraint_type = 'FOREIGN KEY'
    `);

    expect(result.rows).toHaveLength(1);
  });
});
