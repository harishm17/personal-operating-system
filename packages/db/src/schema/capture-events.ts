import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captureSessions } from './capture-sessions';
import { captures } from './captures';

export const captureEvents = pgTable(
  'capture_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    captureSessionId: uuid('capture_session_id'),
    kind: text('kind').notNull(),
    payloadJson: jsonb('payload_json').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    captureSessionFk: foreignKey({
      columns: [table.captureSessionId, table.captureId],
      foreignColumns: [captureSessions.id, captureSessions.captureId],
      name: 'capture_events_capture_session_capture_id_fkey',
    }).onDelete('cascade'),
  }),
);
