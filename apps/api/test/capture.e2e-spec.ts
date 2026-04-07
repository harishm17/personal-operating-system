import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createDb } from '@assistant/db';
import { AppModule } from '../src/app.module';
import { CaptureReadService } from '../src/modules/capture/capture-read.service';
import { CAPTURE_REPOSITORY, DB_CONNECTION } from '../src/modules/db/db.constants';
import type { CaptureRepository, DbConnection } from '../src/modules/db/db.types';

const CAPTURE_API_MIGRATIONS = [
  '001_bootstrap.sql',
  '002_core_entities.sql',
  '003_capture_pipeline.sql',
  '004_task2_integrity_backfill.sql',
  '005_capture_jobs.sql',
  '006_capture_idempotency_uniques.sql',
];

const baseDatabaseUrl = process.env.DATABASE_URL;
if (!baseDatabaseUrl) {
  throw new Error('DATABASE_URL is required for API e2e tests');
}

async function setupCaptureApiDb(databaseUrl: string) {
  const adminDb = createDb(databaseUrl);
  const schema = `capture_api_${randomUUID().replace(/-/g, '')}`;

  await adminDb.pool.query(`create schema "${schema}"`);
  await adminDb.pool.end();

  const schemaUrl = new URL(databaseUrl);
  schemaUrl.searchParams.set('options', `-c search_path=${schema},public`);

  const dbClient = createDb(schemaUrl.toString());
  for (const migrationName of CAPTURE_API_MIGRATIONS) {
    const migrationSql = readFileSync(
      new URL(`../../../infra/migrations/${migrationName}`, import.meta.url),
      'utf8',
    );
    await dbClient.pool.query(migrationSql);
  }

  return {
    databaseUrl: schemaUrl.toString(),
    dbClient,
    async cleanup() {
      await dbClient.pool.query(`drop schema if exists "${schema}" cascade`).catch(() => undefined);
      await dbClient.pool.end();
    },
  };
}

async function clearCaptureTables(dbClient: DbConnection) {
  await dbClient.pool.query(`
    truncate table capture_jobs, capture_events, capture_sessions, inbox_items, captures
    restart identity cascade
  `);
}

async function deleteCaptureSideEffects(dbClient: DbConnection, captureId: string) {
  await dbClient.pool.query('delete from capture_events where capture_id = $1', [captureId]);
  await dbClient.pool.query('delete from capture_sessions where capture_id = $1', [captureId]);
  await dbClient.pool.query('delete from inbox_items where capture_id = $1', [captureId]);
}


async function countCapturesByClientRequestId(dbClient: DbConnection, clientRequestId: string) {
  const result = await dbClient.pool.query<{ count: string }>(
    'select count(*) as count from captures where client_request_id = $1',
    [clientRequestId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function countCaptureJobsByCaptureId(dbClient: DbConnection, captureId: string) {
  const result = await dbClient.pool.query<{ count: string }>(
    'select count(*) as count from capture_jobs where capture_id = $1',
    [captureId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

async function listCaptureJobsByCaptureId(dbClient: DbConnection, captureId: string) {
  const result = await dbClient.pool.query<{
    id: string;
    capture_id: string;
    job_name: string;
    dedupe_key: string;
  }>(
    'select id, capture_id, job_name, dedupe_key from capture_jobs where capture_id = $1 order by created_at asc',
    [captureId],
  );

  return result.rows;
}

async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return app;
}

async function withTestApp<T>(run: (app: INestApplication) => Promise<T>) {
  const app = await createTestApp();
  try {
    return await run(app);
  } finally {
    await app.close();
  }
}

describe('Capture API', () => {
  let dbClient: DbConnection;
  let cleanup = async () => undefined;

  beforeAll(async () => {
    const setup = await setupCaptureApiDb(baseDatabaseUrl);
    dbClient = setup.dbClient;
    cleanup = setup.cleanup;
    process.env.DATABASE_URL = setup.databaseUrl;
  });

  afterAll(async () => {
    await cleanup();
    process.env.DATABASE_URL = baseDatabaseUrl;
  });

  beforeEach(async () => {
    await clearCaptureTables(dbClient);
  });

  it('POST /captures stores a capture and creates an inbox item', async () => {
    await withTestApp(async (app) => {
      const response = await request(app.getHttpServer()).post('/captures').send({
        channel: 'web',
        sourceType: 'quick_capture',
        contentText: 'Need to follow up with Sam and save https://example.com',
        clientRequestId: 'cap_123',
      });

      expect(response.status).toBe(201);
      expect(response.body.capture.status).toBe('received');
      expect(response.body.inboxItem.status).toBe('open');
    });
  });

  it('POST /captures records the session, links the event, and enqueues one processing job', async () => {
    await withTestApp(async (app) => {
      const captureReadService = app.get(CaptureReadService);
      const captureRepository = app.get<CaptureRepository>(CAPTURE_REPOSITORY);
      const dbConnection = app.get<DbConnection>(DB_CONNECTION);
      const response = await request(app.getHttpServer()).post('/captures').send({
        channel: 'chat',
        sourceType: 'chat_message',
        contentText: 'Remember to review the meeting notes',
        clientRequestId: 'cap_enqueue_1',
      });

      expect(response.status).toBe(201);

      const captureId = response.body.capture.id as string;
      const sessions = await captureReadService.listCaptureSessions(captureId);
      const events = await captureRepository.listCaptureEventsByCaptureId(captureId);
      const jobs = await listCaptureJobsByCaptureId(dbConnection, captureId);

      expect(sessions).toHaveLength(1);
      expect(events).toHaveLength(1);
      expect(events[0]?.captureSessionId).toBe(sessions[0]?.id);
      expect(events[0]?.kind).toBe('capture_received');
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.job_name).toBe('process-capture');
    });
  });

  it('POST /captures rejects malformed payloads with 400', async () => {
    await withTestApp(async (app) => {
      const response = await request(app.getHttpServer()).post('/captures').send({
        channel: 'email',
        sourceType: '',
        contentText: '',
        clientRequestId: '',
      });

      expect(response.status).toBe(400);
    });
  });

  it('POST /captures returns the existing capture on clientRequestId replay without duplicating side effects', async () => {
    await withTestApp(async (app) => {
      const captureRepository = app.get<CaptureRepository>(CAPTURE_REPOSITORY);
      const payload = {
        channel: 'web',
        sourceType: 'quick_capture',
        contentText: 'Offline replay should not duplicate captures',
        clientRequestId: 'cap_replay_1',
      };

      const firstResponse = await request(app.getHttpServer()).post('/captures').send(payload);
      const secondResponse = await request(app.getHttpServer()).post('/captures').send(payload);

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body).toEqual(firstResponse.body);

      const captureId = firstResponse.body.capture.id as string;
      expect(await captureRepository.listCaptureSessionsByCaptureId(captureId)).toHaveLength(1);
      expect(await captureRepository.listCaptureEventsByCaptureId(captureId)).toHaveLength(1);
      expect(await captureRepository.listInboxItemsByCaptureId(captureId)).toHaveLength(1);
      expect(await countCaptureJobsByCaptureId(app.get<DbConnection>(DB_CONNECTION), captureId)).toBe(1);
    });
  });

  it('POST /captures replays against persisted capture state across app instances', async () => {
    const payload = {
      channel: 'web',
      sourceType: 'quick_capture',
      contentText: 'Persist me across app restarts',
      clientRequestId: 'cap_restart_1',
    };

    const firstApp = await createTestApp();
    const firstResponse = await request(firstApp.getHttpServer()).post('/captures').send(payload);
    await firstApp.close();

    const secondApp = await createTestApp();
    const secondResponse = await request(secondApp.getHttpServer()).post('/captures').send(payload);
    await secondApp.close();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.capture.id).toBe(firstResponse.body.capture.id);
  });


  it('POST /captures keeps process-capture jobs durable across app restarts and deduped on replay', async () => {
    const payload = {
      channel: 'web',
      sourceType: 'quick_capture',
      contentText: 'Persist job publication across app restarts',
      clientRequestId: 'cap_job_restart_1',
    };

    const firstApp = await createTestApp();
    const firstResponse = await request(firstApp.getHttpServer()).post('/captures').send(payload);
    await firstApp.close();

    const captureId = firstResponse.body.capture.id as string;

    const secondApp = await createTestApp();
    const secondResponse = await request(secondApp.getHttpServer()).post('/captures').send(payload);
    await secondApp.close();

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.capture.id).toBe(captureId);

    const jobs = await listCaptureJobsByCaptureId(dbClient, captureId);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.job_name).toBe('process-capture');
    expect(jobs[0]?.dedupe_key).toBe(`process-capture:${captureId}`);
  });


  it('POST /captures deduplicates concurrent same-clientRequestId requests into one capture row and side-effect set', async () => {
    await withTestApp(async (app) => {
      const captureRepository = app.get<CaptureRepository>(CAPTURE_REPOSITORY);
      const dbConnection = app.get<DbConnection>(DB_CONNECTION);
      const payload = {
        channel: 'web',
        sourceType: 'quick_capture',
        contentText: 'Concurrent duplicate requests should collapse into one capture',
        clientRequestId: 'cap_concurrent_1',
      };

      const responses = await Promise.all(
        Array.from({ length: 12 }, () =>
          request(app.getHttpServer()).post('/captures').send(payload),
        ),
      );

      expect(responses.every((response) => response.status === 201)).toBe(true);

      const captureIds = new Set(
        responses.map((response) => response.body.capture.id as string),
      );
      expect(captureIds.size).toBe(1);

      const captureId = responses[0]?.body.capture.id as string;
      expect(await countCapturesByClientRequestId(dbConnection, payload.clientRequestId)).toBe(1);
      expect(await captureRepository.listInboxItemsByCaptureId(captureId)).toHaveLength(1);
      expect(await captureRepository.listCaptureSessionsByCaptureId(captureId)).toHaveLength(1);
      expect(await captureRepository.listCaptureEventsByCaptureId(captureId)).toHaveLength(1);
    });
  });

  it('POST /captures repairs missing side effects on clientRequestId replay', async () => {
    await withTestApp(async (app) => {
      const captureRepository = app.get<CaptureRepository>(CAPTURE_REPOSITORY);
      const dbConnection = app.get<DbConnection>(DB_CONNECTION);
      const payload = {
        channel: 'chat',
        sourceType: 'chat_message',
        contentText: 'Replay should repair partial side effects',
        clientRequestId: 'cap_replay_repair_1',
        metadata: { sourceMessageId: 'msg_123' },
      };

      const firstResponse = await request(app.getHttpServer()).post('/captures').send(payload);
      expect(firstResponse.status).toBe(201);

      const captureId = firstResponse.body.capture.id as string;
      await deleteCaptureSideEffects(dbConnection, captureId);

      const replayResponse = await request(app.getHttpServer()).post('/captures').send(payload);

      expect(replayResponse.status).toBe(201);
      expect(replayResponse.body.capture.id).toBe(captureId);
      expect(await captureRepository.listInboxItemsByCaptureId(captureId)).toHaveLength(1);
      expect(await captureRepository.listCaptureSessionsByCaptureId(captureId)).toHaveLength(1);
      expect(await captureRepository.listCaptureEventsByCaptureId(captureId)).toHaveLength(1);
      expect(await countCaptureJobsByCaptureId(dbConnection, captureId)).toBe(1);
    });
  });

  it('POST /captures returns 409 when a clientRequestId is reused with different request fields', async () => {
    await withTestApp(async (app) => {
      const payload = {
        channel: 'web',
        sourceType: 'quick_capture',
        contentText: 'Original replay-safe request',
        clientRequestId: 'cap_conflict_1',
        metadata: { priority: 'normal' },
      };

      const firstResponse = await request(app.getHttpServer()).post('/captures').send(payload);
      const secondResponse = await request(app.getHttpServer()).post('/captures').send({
        ...payload,
        contentText: 'Different content for the same client request id',
      });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(409);
    });
  });

  it.each([
    { metadata: null, label: 'null' },
    { metadata: ['not', 'an', 'object'], label: 'array' },
    { metadata: 'metadata', label: 'string' },
  ])('POST /captures rejects $label metadata with 400', async ({ metadata }) => {
    await withTestApp(async (app) => {
      const response = await request(app.getHttpServer()).post('/captures').send({
        channel: 'web',
        sourceType: 'quick_capture',
        contentText: 'Metadata must be a plain JSON object',
        clientRequestId: 'cap_bad_metadata_' + String(metadata),
        metadata,
      });

      expect(response.status).toBe(400);
    });
  });
});
