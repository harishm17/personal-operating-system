import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const events = pgTable('events', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  title: text('title'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
});
