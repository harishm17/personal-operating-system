import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const resources = pgTable('resources', {
  entityId: uuid('entity_id')
    .primaryKey()
    .references(() => entities.id, { onDelete: 'cascade' }),
  title: text('title'),
  sourceUrl: text('source_url'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
});
