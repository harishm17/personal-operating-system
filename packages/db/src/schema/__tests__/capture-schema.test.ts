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

  it('rejects invalid candidate kinds and subtype combinations', async () => {
    await db.execute(sql`
      insert into captures (id, channel, source_type, content_text, client_request_id)
      values ('00000000-0000-0000-0000-000000000201', 'web', 'chat', 'hello world', 'req-201')
    `);

    await db.execute(sql`
      insert into capture_parts (id, capture_id, part_index, kind, content_text)
      values ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000201', 0, 'message', 'hello world')
    `);

    await db.execute(sql`
      insert into capture_segments (id, capture_part_id, segment_index, kind, content_text)
      values ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000202', 0, 'sentence', 'hello world')
    `);

    await expect(
      db.execute(sql`
        insert into candidate_entities (id, capture_id, segment_id, kind, subtype, title, confidence)
        values ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000203', 'relation', null, 'bad candidate', 0.5000)
      `),
    ).rejects.toThrow();

    await expect(
      db.execute(sql`
        insert into candidate_entities (id, capture_id, segment_id, kind, subtype, title, confidence)
        values ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000203', 'resource', 'deadline', 'bad subtype', 0.5000)
      `),
    ).rejects.toThrow();
  });
});
