import { jsonb, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captureParts } from './capture-parts';

export const captureSegments = pgTable('capture_segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  capturePartId: uuid('capture_part_id')
    .notNull()
    .references(() => captureParts.id, { onDelete: 'cascade' }),
  segmentIndex: integer('segment_index').notNull(),
  kind: text('kind').notNull(),
  contentText: text('content_text').notNull(),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
