import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const contexts = pgTable('contexts', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  title: text('title'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
});
