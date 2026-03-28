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
});
