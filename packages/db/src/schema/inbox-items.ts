import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captures } from './captures';

export const inboxItems = pgTable('inbox_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id').references(() => captures.id, {
    onDelete: 'cascade',
  }),
  itemType: text('item_type').notNull(),
  status: text('status').notNull().default('open'),
  title: text('title').notNull(),
  payloadJson: jsonb('payload_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
