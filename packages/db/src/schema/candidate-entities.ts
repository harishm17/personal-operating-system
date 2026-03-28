import { jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { CandidateKind, EntitySubtype } from '@assistant/domain';
import { captures } from './captures';
import { captureSegments } from './capture-segments';
import { entities } from './entities';

export const candidateEntities = pgTable('candidate_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id')
    .notNull()
    .references(() => captures.id, { onDelete: 'cascade' }),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => captureSegments.id, { onDelete: 'cascade' }),
  promotedEntityId: uuid('promoted_entity_id').references(() => entities.id, {
    onDelete: 'set null',
  }),
  kind: text('kind').$type<CandidateKind>().notNull(),
  subtype: text('subtype').$type<EntitySubtype | null>(),
  title: text('title').notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull(),
  evidence: jsonb('evidence').notNull().default(sql`'{}'::jsonb`),
  status: text('status').notNull().default('suggested'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
