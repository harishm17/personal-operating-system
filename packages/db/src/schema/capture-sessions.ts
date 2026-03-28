import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captures } from './captures';

export const captureSessions = pgTable(
  'capture_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    sessionKey: text('session_key').notNull(),
    status: text('status').notNull().default('active'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => ({
    idCaptureUnique: uniqueIndex('capture_sessions_id_capture_id_unique').on(table.id, table.captureId),
  }),
);
