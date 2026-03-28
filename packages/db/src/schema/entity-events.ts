import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';
import { events } from './events';

export const entityEvents = pgTable('entity_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id')
    .notNull()
    .references(() => entities.id, { onDelete: 'cascade' }),
  eventEntityId: uuid('event_entity_id')
    .notNull()
    .references(() => events.entityId, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
