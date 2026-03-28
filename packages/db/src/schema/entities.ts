import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { EntityKind, EntitySubtype } from '@assistant/domain';

export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: text('kind').$type<EntityKind>().notNull(),
  subtype: text('subtype').$type<EntitySubtype | null>(),
  title: text('title'),
  state: text('state').notNull().default('active'),
  sourceCaptureId: uuid('source_capture_id'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
