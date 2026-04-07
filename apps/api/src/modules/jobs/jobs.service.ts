import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.constants';
import type { DbConnection } from '../db/db.types';

export interface PublishedJob {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  publishedAt: Date;
}

type CaptureJobRow = {
  id: string;
  capture_id: string;
  job_name: string;
  dedupe_key: string;
  status: string;
  payload_json: Record<string, unknown>;
  created_at: Date;
  available_at: Date;
  processed_at: Date | null;
};

@Injectable()
export class JobsService {
  constructor(@Inject(DB_CONNECTION) private readonly connection: DbConnection) {}

  async publish(name: string, payload: Record<string, unknown>) {
    if (name !== 'process-capture') {
      throw new Error(`Unsupported job name: ${name}`);
    }

    const captureId = this.extractCaptureId(payload);
    const dedupeKey = `${name}:${captureId}`;
    const insertedJob = await this.insertCaptureJob(captureId, name, dedupeKey, payload);
    if (insertedJob) {
      return this.mapJob(insertedJob);
    }

    const existingJob = await this.loadCaptureJob(captureId, name);
    if (!existingJob) {
      throw new Error(`Expected capture job for capture ${captureId} and job ${name}`);
    }

    return this.mapJob(existingJob);
  }

  async getPublishedJobs() {
    const result = await this.connection.pool.query<CaptureJobRow>(
      `select
         id,
         capture_id,
         job_name,
         dedupe_key,
         status,
         payload_json,
         created_at,
         available_at,
         processed_at
       from capture_jobs
       order by created_at asc, id asc`,
    );

    return result.rows.map((row) => this.mapJob(row));
  }

  private async insertCaptureJob(
    captureId: string,
    name: string,
    dedupeKey: string,
    payload: Record<string, unknown>,
  ) {
    const result = await this.connection.pool.query<CaptureJobRow>(
      `insert into capture_jobs (capture_id, job_name, dedupe_key, payload_json)
       values ($1, $2, $3, $4::jsonb)
       on conflict do nothing
       returning
         id,
         capture_id,
         job_name,
         dedupe_key,
         status,
         payload_json,
         created_at,
         available_at,
         processed_at`,
      [captureId, name, dedupeKey, JSON.stringify(payload)],
    );

    return result.rows[0];
  }

  private async loadCaptureJob(captureId: string, jobName: string) {
    const result = await this.connection.pool.query<CaptureJobRow>(
      `select
         id,
         capture_id,
         job_name,
         dedupe_key,
         status,
         payload_json,
         created_at,
         available_at,
         processed_at
       from capture_jobs
       where capture_id = $1
         and job_name = $2
       order by created_at asc, id asc
       limit 1`,
      [captureId, jobName],
    );

    return result.rows[0];
  }

  private extractCaptureId(payload: Record<string, unknown>) {
    const captureId = payload.captureId;
    if (typeof captureId !== 'string' || captureId.trim().length === 0) {
      throw new Error('process-capture jobs require a captureId');
    }

    return captureId;
  }

  private mapJob(row: CaptureJobRow): PublishedJob {
    return {
      id: row.id,
      name: row.job_name,
      payload: row.payload_json,
      publishedAt: row.created_at,
    };
  }
}
