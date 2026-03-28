import { check, foreignKey, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { CandidateKind, EntityKind, EntitySubtypeForKind } from '@assistant/domain';
import { captureSegments } from './capture-segments';
import { captures } from './captures';
import { entities } from './entities';

export const candidateEntities = pgTable(
  'candidate_entities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    captureId: uuid('capture_id')
      .notNull()
      .references(() => captures.id, { onDelete: 'cascade' }),
    segmentId: uuid('segment_id').notNull(),
    promotedEntityId: uuid('promoted_entity_id'),
    promotedEntityKind: text('promoted_entity_kind').$type<EntityKind | null>(),
    kind: text('kind').$type<CandidateKind>().notNull(),
    subtype: text('subtype').$type<EntitySubtypeForKind<CandidateKind> | null>(),
    title: text('title').notNull(),
    confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull(),
    evidence: jsonb('evidence').notNull().default(sql`'{}'::jsonb`),
    status: text('status').notNull().default('suggested'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    captureSegmentFk: foreignKey({
      columns: [table.segmentId, table.captureId],
      foreignColumns: [captureSegments.id, captureSegments.captureId],
      name: 'candidate_entities_segment_capture_id_fkey',
    }).onDelete('cascade'),
    promotedEntityFk: foreignKey({
      columns: [table.promotedEntityId, table.promotedEntityKind],
      foreignColumns: [entities.id, entities.kind],
      name: 'candidate_entities_promoted_entity_id_kind_fkey',
    }).onDelete('set null'),
    confidenceRangeCheck: check('candidate_entities_confidence_range_check', sql`confidence >= 0 and confidence <= 1`),
    promotedEntityPairCheck: check(
      'candidate_entities_promoted_entity_pair_check',
      sql`(promoted_entity_id is null and promoted_entity_kind is null) or (promoted_entity_id is not null and promoted_entity_kind = kind)`,
    ),
  }),
);
