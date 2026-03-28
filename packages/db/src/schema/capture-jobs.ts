import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { captures } from './captures';

export type CaptureJobName = 'process-capture';
export type CaptureJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export const captureJobs = pgTable('capture_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id')
    .notNull()
    .references(() => captures.id, { onDelete: 'cascade' }),
  jobName: text('job_name').$type<CaptureJobName>().notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(),
  status: text('status').$type<CaptureJobStatus>().notNull().default('pending'),
  payloadJson: jsonb('payload_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, () => ({
  jobNameCheck: check(
    'capture_jobs_job_name_check',
    sql`job_name in ('process-capture')`,
  ),
  statusCheck: check(
    'capture_jobs_status_check',
    sql`status in ('pending', 'processing', 'completed', 'failed')`,
  ),
  processedAtConsistencyCheck: check(
    'capture_jobs_processed_at_consistency_check',
    sql`((status in ('completed', 'failed')) and processed_at is not null) or ((status in ('pending', 'processing')) and processed_at is null)`,
  ),
}));
