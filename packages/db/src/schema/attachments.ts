import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captures } from './captures';
import { captureSegments } from './capture-segments';

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id')
    .notNull()
    .references(() => captures.id, { onDelete: 'cascade' }),
  segmentId: uuid('segment_id').references(() => captureSegments.id, { onDelete: 'set null' }),
  fileName: text('file_name').notNull(),
  contentType: text('content_type'),
  storageKey: text('storage_key').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
