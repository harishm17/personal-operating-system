import { foreignKey, jsonb, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captureParts } from './capture-parts';
import { captures } from './captures';

export const captureSegments = pgTable(
  'capture_segments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    capturePartId: uuid('capture_part_id').notNull(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    segmentIndex: integer('segment_index').notNull(),
    kind: text('kind').notNull(),
    contentText: text('content_text').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    capturePartFk: foreignKey({
      columns: [table.capturePartId, table.captureId],
      foreignColumns: [captureParts.id, captureParts.captureId],
      name: 'capture_segments_capture_part_capture_id_fkey',
    }).onDelete('cascade'),
    idCaptureUnique: uniqueIndex('capture_segments_id_capture_id_unique').on(table.id, table.captureId),
  }),
);
