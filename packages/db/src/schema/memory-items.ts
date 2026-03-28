import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const memoryItems = pgTable('memory_items', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  content: text('content'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
});
