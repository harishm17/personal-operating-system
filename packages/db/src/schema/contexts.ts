import { foreignKey, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const contexts = pgTable(
  'contexts',
  {
    entityId: uuid('entity_id').primaryKey(),
    kind: text('kind').$type<'context'>().notNull().default('context'),
    title: text('title'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    entityKindFk: foreignKey({
      columns: [table.entityId, table.kind],
      foreignColumns: [entities.id, entities.kind],
    }).onDelete('cascade'),
  }),
);
