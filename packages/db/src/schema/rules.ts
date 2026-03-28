import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const rules = pgTable('rules', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  title: text('title'),
  expression: text('expression'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
});
