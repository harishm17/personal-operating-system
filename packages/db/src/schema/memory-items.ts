import { foreignKey, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const memoryItems = pgTable(
  'memory_items',
  {
    entityId: uuid('entity_id').primaryKey(),
    kind: text('kind').$type<'memory'>().notNull().default('memory'),
    content: text('content'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    entityKindFk: foreignKey({
      columns: [table.entityId, table.kind],
      foreignColumns: [entities.id, entities.kind],
    }).onDelete('cascade'),
  }),
);
