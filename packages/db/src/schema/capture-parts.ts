import { jsonb, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { captures } from './captures';

export const captureParts = pgTable(
  'capture_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    partIndex: integer('part_index').notNull(),
    kind: text('kind').notNull(),
    contentText: text('content_text').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idCaptureUnique: uniqueIndex('capture_parts_id_capture_id_unique').on(table.id, table.captureId),
  }),
);
