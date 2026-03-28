import { foreignKey, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const rules = pgTable(
  'rules',
  {
    entityId: uuid('entity_id').primaryKey(),
    kind: text('kind').$type<'rule'>().notNull().default('rule'),
    title: text('title'),
    expression: text('expression'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    entityKindFk: foreignKey({
      columns: [table.entityId, table.kind],
      foreignColumns: [entities.id, entities.kind],
    }).onDelete('cascade'),
  }),
);
