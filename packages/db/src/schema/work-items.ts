import { foreignKey, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const workItems = pgTable(
  'work_items',
  {
    entityId: uuid('entity_id').primaryKey(),
    kind: text('kind').$type<'work_item'>().notNull().default('work_item'),
    title: text('title'),
    state: text('state').notNull().default('open'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    entityKindFk: foreignKey({
      columns: [table.entityId, table.kind],
      foreignColumns: [entities.id, entities.kind],
    }).onDelete('cascade'),
  }),
);
