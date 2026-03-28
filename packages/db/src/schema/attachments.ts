import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captureSegments } from './capture-segments';
import { captures } from './captures';

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    segmentId: uuid('segment_id'),
    fileName: text('file_name').notNull(),
    contentType: text('content_type'),
    storageKey: text('storage_key').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    segmentCaptureFk: foreignKey({
      columns: [table.segmentId, table.captureId],
      foreignColumns: [captureSegments.id, captureSegments.captureId],
      name: 'attachments_segment_capture_id_fkey',
    }).onDelete('cascade'),
  }),
);
