import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const workItems = pgTable('work_items', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  title: text('title'),
  state: text('state').notNull().default('open'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
});
