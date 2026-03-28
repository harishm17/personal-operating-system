import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const entityRelations = pgTable('entity_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromEntityId: uuid('from_entity_id')
    .notNull()
    .references(() => entities.id, { onDelete: 'cascade' }),
  toEntityId: uuid('to_entity_id')
    .notNull()
    .references(() => entities.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
