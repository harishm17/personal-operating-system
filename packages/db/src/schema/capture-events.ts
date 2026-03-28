import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captures } from './captures';
import { captureSessions } from './capture-sessions';

export const captureEvents = pgTable('capture_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id')
    .notNull()
    .references(() => captures.id, { onDelete: 'cascade' }),
  captureSessionId: uuid('capture_session_id')
    .references(() => captureSessions.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  payloadJson: jsonb('payload_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
