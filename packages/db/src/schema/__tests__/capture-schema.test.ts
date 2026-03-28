import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../client';

describe('capture schema', () => {
  it('creates capture pipeline tables', async () => {
    const result = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('captures', 'capture_sessions', 'capture_events', 'capture_parts', 'capture_segments', 'attachments', 'inbox_items', 'candidate_entities')
    `);

    expect(result.rows).toHaveLength(8);
  });
});
