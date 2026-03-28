import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const captures = pgTable('captures', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: text('channel').notNull(),
  sourceType: text('source_type').notNull(),
  contentText: text('content_text').notNull(),
  clientRequestId: text('client_request_id').notNull(),
  status: text('status').notNull().default('received'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
