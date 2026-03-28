import { foreignKey, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const resources = pgTable(
  'resources',
  {
    entityId: uuid('entity_id').primaryKey(),
    kind: text('kind').$type<'resource'>().notNull().default('resource'),
    title: text('title'),
    sourceUrl: text('source_url'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    entityKindFk: foreignKey({
      columns: [table.entityId, table.kind],
      foreignColumns: [entities.id, entities.kind],
    }).onDelete('cascade'),
  }),
);
