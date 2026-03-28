import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CaptureReadService } from '../src/modules/capture/capture-read.service';
import { DbService } from '../src/modules/db/db.module';
import { JobsService } from '../src/modules/jobs/jobs.service';

describe('Capture API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /captures stores a capture and creates an inbox item', async () => {
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

  it('POST /captures records the session, links the event, and enqueues one processing job', async () => {
    const captureReadService = app.get(CaptureReadService);
    const jobsService = app.get(JobsService);
    const response = await request(app.getHttpServer()).post('/captures').send({
      channel: 'chat',
      sourceType: 'chat_message',
      contentText: 'Remember to review the meeting notes',
      clientRequestId: 'cap_enqueue_1',
    });

    expect(response.status).toBe(201);

    const captureId = response.body.capture.id as string;
    const sessions = captureReadService.listCaptureSessions(captureId);
    const events = app.get(DbService).listCaptureEventsByCaptureId(captureId);
    const jobs = jobsService.getPublishedJobs().filter((job) => job.payload.captureId === captureId);

    expect(sessions).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0]?.captureSessionId).toBe(sessions[0]?.id);
    expect(events[0]?.kind).toBe('capture_received');
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.name).toBe('process-capture');
  });

  it('POST /captures rejects malformed payloads with 400', async () => {
    const response = await request(app.getHttpServer()).post('/captures').send({
      channel: 'email',
      sourceType: '',
      contentText: '',
      clientRequestId: '',
    });

    expect(response.status).toBe(400);
  });

  it('POST /captures returns the existing capture on clientRequestId replay without duplicating side effects', async () => {
    const dbService = app.get(DbService);
    const jobsService = app.get(JobsService);
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
    expect(dbService.listCaptureSessionsByCaptureId(captureId)).toHaveLength(1);
    expect(dbService.listCaptureEventsByCaptureId(captureId)).toHaveLength(1);
    expect(dbService.listInboxItemsByCaptureId(captureId)).toHaveLength(1);
    expect(
      jobsService.getPublishedJobs().filter((job) => job.payload.captureId === captureId),
    ).toHaveLength(1);
  });
  it('POST /captures repairs missing side effects on clientRequestId replay', async () => {
    const dbService = app.get(DbService) as DbService & {
      inboxItems: Array<{ captureId: string }>;
      captureSessions: Array<{ captureId: string }>;
      captureEvents: Array<{ captureId: string }>;
    };
    const jobsService = app.get(JobsService) as JobsService & {
      publishedJobs: Array<{ payload: { captureId?: string } }>;
    };
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
    dbService.inboxItems.splice(
      0,
      dbService.inboxItems.length,
      ...dbService.inboxItems.filter((inboxItem) => inboxItem.captureId !== captureId),
    );
    dbService.captureSessions.splice(
      0,
      dbService.captureSessions.length,
      ...dbService.captureSessions.filter((session) => session.captureId !== captureId),
    );
    dbService.captureEvents.splice(
      0,
      dbService.captureEvents.length,
      ...dbService.captureEvents.filter((event) => event.captureId !== captureId),
    );
    jobsService.publishedJobs.splice(
      0,
      jobsService.publishedJobs.length,
      ...jobsService.publishedJobs.filter((job) => job.payload.captureId !== captureId),
    );

    const replayResponse = await request(app.getHttpServer()).post('/captures').send(payload);

    expect(replayResponse.status).toBe(201);
    expect(replayResponse.body.capture.id).toBe(captureId);
    expect(dbService.listInboxItemsByCaptureId(captureId)).toHaveLength(1);
    expect(dbService.listCaptureSessionsByCaptureId(captureId)).toHaveLength(1);
    expect(dbService.listCaptureEventsByCaptureId(captureId)).toHaveLength(1);
    expect(
      jobsService.getPublishedJobs().filter((job) => job.payload.captureId === captureId),
    ).toHaveLength(1);
  });

  it('POST /captures returns 409 when a clientRequestId is reused with different request fields', async () => {
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

  it.each([
    { metadata: null, label: 'null' },
    { metadata: ['not', 'an', 'object'], label: 'array' },
    { metadata: 'metadata', label: 'string' },
  ])('POST /captures rejects $label metadata with 400', async ({ metadata }) => {
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
