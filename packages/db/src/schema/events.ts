import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { entities } from './entities';

export const events = pgTable(
  'events',
  {
    entityId: uuid('entity_id').primaryKey(),
    kind: text('kind').$type<'event'>().notNull().default('event'),
    title: text('title'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    entityKindFk: foreignKey({
      columns: [table.entityId, table.kind],
      foreignColumns: [entities.id, entities.kind],
    }).onDelete('cascade'),
  }),
);
