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

function toLegacyCapturePipeline(sqlText: string) {
  return sqlText
    .replace(',\n  constraint captures_client_request_id_unique unique (client_request_id)', '')
    .replace(',\n  constraint capture_sessions_capture_id_session_key_unique unique (capture_id, session_key)', '')
    .replace(',\n  constraint capture_events_capture_id_kind_unique unique (capture_id, kind)', '')
    .replace(',\n  constraint inbox_items_capture_id_item_type_unique unique (capture_id, item_type)', '');
}

describe('capture forward migration', () => {
  let dbClient: Awaited<ReturnType<typeof setupTask2SchemaDb>>['dbClient'];
  let cleanup = async () => undefined;

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
    ).rejects.toMatchObject<PostgresError>({
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
    ).rejects.toMatchObject<PostgresError>({
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
    ).rejects.toMatchObject<PostgresError>({
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
    ).rejects.toMatchObject<PostgresError>({
      cause: {
        code: '23505',
        constraint: 'capture_events_capture_id_kind_unique',
      },
    });
  });
});
