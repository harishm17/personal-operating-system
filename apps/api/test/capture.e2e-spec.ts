import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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
});
