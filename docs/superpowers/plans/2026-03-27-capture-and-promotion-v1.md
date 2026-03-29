# Capture And Promotion V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first vertical slice of the product: raw capture, offline-safe web capture, segmentation, candidate extraction, promotion into canonical entities, and read models for `Inbox` and entity provenance.

**Architecture:** A `Next.js` web app sends captures to a `NestJS` API and writes to an IndexedDB outbox when offline. The API persists captures, capture sessions/events, inbox items, and candidate entities in `Postgres` via `Drizzle`, then enqueues `pg-boss` jobs. A worker performs segmentation plus deterministic and LLM-assisted extraction, and the API exposes promotion plus provenance-rich read models.

**Tech Stack:** `Next.js 15`, `NestJS 11`, `TypeScript 5`, `Drizzle ORM`, `Postgres`, `pg-boss`, `Vitest`, `Testing Library`, `Supertest`, `idb`, `tsx`

---

## Scope

### In scope
- repo bootstrap and local dev stack
- universal entity registry sufficient for capture promotion
- raw captures, capture sessions, capture events, capture parts, capture segments, attachments metadata, inbox items, candidate entities
- web capture form with offline outbox and replay
- background segmentation job
- deterministic extractors for URLs, checklist items, and date keywords
- LLM extraction merge step
- promotion into canonical `entities` plus root detail tables
- `Inbox` and entity detail/provenance read surfaces

### Out of scope for this plan
- browser extension capture
- Gmail, Calendar, or Contacts sync
- reminders and planning
- notifications
- OpenClaw plugin/runtime
- passive telemetry
- research workflows beyond capture-time extraction

## File Structure Map

### Root workspace
- Create: `package.json` - root scripts and shared dev dependencies
- Create: `pnpm-workspace.yaml` - workspace membership
- Create: `turbo.json` - task graph for `dev` and `test`
- Create: `.env.example` - local environment contract
- Create: `README.md` - local boot instructions
- Create: `infra/docker/docker-compose.yml` - Postgres for local development
- Create: `infra/migrations/001_bootstrap.sql` - extensions and shared DB helpers
- Create: `infra/migrations/002_core_entities.sql` - canonical entity tables
- Create: `infra/migrations/003_capture_pipeline.sql` - capture/inbox/candidate tables

### Shared packages
- Create: `packages/domain/package.json`
- Create: `packages/domain/src/entities/entity-kind.ts`
- Create: `packages/domain/src/entities/entity-subtypes.ts`
- Create: `packages/domain/src/relations/relation-kind.ts`
- Create: `packages/domain/src/capture/candidate-kind.ts`
- Create: `packages/domain/src/index.ts`
- Create: `packages/db/package.json`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/schema/entities.ts`
- Create: `packages/db/src/schema/actors.ts`
- Create: `packages/db/src/schema/contexts.ts`
- Create: `packages/db/src/schema/work-items.ts`
- Create: `packages/db/src/schema/events.ts`
- Create: `packages/db/src/schema/resources.ts`
- Create: `packages/db/src/schema/memory-items.ts`
- Create: `packages/db/src/schema/rules.ts`
- Create: `packages/db/src/schema/entity-relations.ts`
- Create: `packages/db/src/schema/entity-events.ts`
- Create: `packages/db/src/schema/captures.ts`
- Create: `packages/db/src/schema/capture-sessions.ts`
- Create: `packages/db/src/schema/capture-events.ts`
- Create: `packages/db/src/schema/capture-parts.ts`
- Create: `packages/db/src/schema/capture-segments.ts`
- Create: `packages/db/src/schema/attachments.ts`
- Create: `packages/db/src/schema/inbox-items.ts`
- Create: `packages/db/src/schema/candidate-entities.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/src/schema/__tests__/core-schema.test.ts`
- Create: `packages/db/src/schema/__tests__/capture-schema.test.ts`

### API app
- Create: `apps/api/package.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`
- Create: `apps/api/src/modules/db/db.module.ts`
- Create: `apps/api/src/modules/jobs/jobs.module.ts`
- Create: `apps/api/src/modules/jobs/jobs.service.ts`
- Create: `apps/api/src/modules/capture/capture.controller.ts`
- Create: `apps/api/src/modules/capture/capture.service.ts`
- Create: `apps/api/src/modules/capture/capture-session.service.ts`
- Create: `apps/api/src/modules/capture/capture-event.service.ts`
- Create: `apps/api/src/modules/capture/capture-read.service.ts`
- Create: `apps/api/src/modules/capture/dto/create-capture.dto.ts`
- Create: `apps/api/src/modules/inbox/inbox.controller.ts`
- Create: `apps/api/src/modules/inbox/inbox.service.ts`
- Create: `apps/api/src/modules/entities/entities.controller.ts`
- Create: `apps/api/src/modules/entities/promotion.service.ts`
- Create: `apps/api/src/modules/entities/entity-detail.service.ts`
- Create: `apps/api/test/health.e2e-spec.ts`
- Create: `apps/api/test/capture.e2e-spec.ts`
- Create: `apps/api/test/inbox.e2e-spec.ts`
- Create: `apps/api/test/promotion.e2e-spec.ts`

### Worker app
- Create: `apps/worker/package.json`
- Create: `apps/worker/src/main.ts`
- Create: `apps/worker/src/jobs/process-capture.job.ts`
- Create: `apps/worker/src/jobs/process-capture.job.spec.ts`
- Create: `apps/worker/src/pipeline/segment-capture.ts`
- Create: `apps/worker/src/pipeline/segment-capture.spec.ts`
- Create: `apps/worker/src/pipeline/extract/urls.ts`
- Create: `apps/worker/src/pipeline/extract/urls.spec.ts`
- Create: `apps/worker/src/pipeline/extract/checklists.ts`
- Create: `apps/worker/src/pipeline/extract/checklists.spec.ts`
- Create: `apps/worker/src/pipeline/extract/dates.ts`
- Create: `apps/worker/src/pipeline/extract/dates.spec.ts`
- Create: `apps/worker/src/pipeline/extract/llm-extractor.ts`
- Create: `apps/worker/src/pipeline/merge-candidates.ts`
- Create: `apps/worker/src/pipeline/merge-candidates.spec.ts`

### Web app
- Create: `apps/web/package.json`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/inbox/page.tsx`
- Create: `apps/web/src/app/entities/[id]/page.tsx`
- Create: `apps/web/src/components/capture/capture-form.tsx`
- Create: `apps/web/src/components/capture/capture-form.spec.tsx`
- Create: `apps/web/src/components/inbox/inbox-list.tsx`
- Create: `apps/web/src/components/inbox/inbox-list.spec.tsx`
- Create: `apps/web/src/components/entities/entity-provenance.tsx`
- Create: `apps/web/src/components/entities/entity-provenance.spec.tsx`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/offline/types.ts`
- Create: `apps/web/src/lib/offline/outbox.ts`
- Create: `apps/web/src/lib/offline/outbox.spec.ts`
- Create: `apps/web/src/lib/offline/replay.ts`
- Create: `apps/web/src/lib/offline/replay.spec.ts`
- Create: `apps/web/src/lib/offline/network.ts`

### Demo assets
- Create: `scripts/demo-capture.ts`
- Create: `docs/capture-and-promotion-demo.md`

## Task 1: Bootstrap the workspace and local development stack

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.env.example`
- Create: `README.md`
- Create: `infra/docker/docker-compose.yml`
- Create: `packages/domain/package.json`
- Create: `packages/db/package.json`
- Create: `apps/api/package.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/modules/health/health.controller.ts`
- Create: `apps/worker/package.json`
- Create: `apps/web/package.json`
- Test: `apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: Write the failing API health test**

```ts
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController', () => {
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

  it('GET /health returns ok', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @assistant/api test -- health.e2e-spec.ts`
Expected: fail with module resolution errors because the workspace and API app do not exist yet.

- [ ] **Step 3: Create the workspace and minimal API implementation**

```json
{
  "name": "assistant-os",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "db:migrate": "for file in infra/migrations/*.sql; do psql \"$DATABASE_URL\" -f \"$file\"; done"
  },
  "devDependencies": {
    "tsx": "^4.20.0",
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  }
}
```

```yaml
packages:
  - apps/*
  - packages/*
```

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^test"]
    }
  }
}
```

```json
{
  "name": "@assistant/domain",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts"
}
```

```json
{
  "name": "@assistant/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  }
}
```

```json
{
  "name": "@assistant/api",
  "version": "0.0.1",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.0.0",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.0",
    "vitest": "^3.1.0"
  }
}
```

```json
{
  "name": "@assistant/worker",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "test": "vitest run"
  }
}
```

```json
{
  "name": "@assistant/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.1.0"
  }
}
```

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.API_PORT ?? 3001);
}

void bootstrap();
```

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

```ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  getHealth() {
    return { status: 'ok' };
  }
}
```

```env
DATABASE_URL=postgres://assistant:assistant@localhost:5432/assistant
API_PORT=3001
WEB_PORT=3000
OPENAI_API_KEY=replace-me
```

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: assistant
      POSTGRES_PASSWORD: assistant
      POSTGRES_DB: assistant
```

```md
# Assistant OS

## Local development

1. `docker compose -f infra/docker/docker-compose.yml up -d`
2. `pnpm install`
3. `pnpm --filter @assistant/api test -- health.e2e-spec.ts`
```

- [ ] **Step 4: Run the health test and boot smoke checks**

Run: `pnpm install && pnpm --filter @assistant/api test -- health.e2e-spec.ts`
Expected: one passing test.

Run: `docker compose -f infra/docker/docker-compose.yml up -d`
Expected: Postgres is reachable on `localhost:5432`.

- [ ] **Step 5: Initialize git and commit the bootstrap**

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json .env.example README.md infra/docker/docker-compose.yml packages/domain/package.json packages/db/package.json apps/api/package.json apps/api/src apps/api/test apps/worker/package.json apps/web/package.json
git commit -m "chore: bootstrap workspace and health check"
```

## Task 2: Define the entity registry and capture pipeline schema

**Files:**
- Create: `packages/domain/src/entities/entity-kind.ts`
- Create: `packages/domain/src/entities/entity-subtypes.ts`
- Create: `packages/domain/src/relations/relation-kind.ts`
- Create: `packages/domain/src/capture/candidate-kind.ts`
- Create: `packages/domain/src/index.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/schema/entities.ts`
- Create: `packages/db/src/schema/actors.ts`
- Create: `packages/db/src/schema/contexts.ts`
- Create: `packages/db/src/schema/work-items.ts`
- Create: `packages/db/src/schema/events.ts`
- Create: `packages/db/src/schema/resources.ts`
- Create: `packages/db/src/schema/memory-items.ts`
- Create: `packages/db/src/schema/rules.ts`
- Create: `packages/db/src/schema/entity-relations.ts`
- Create: `packages/db/src/schema/entity-events.ts`
- Create: `packages/db/src/schema/captures.ts`
- Create: `packages/db/src/schema/capture-sessions.ts`
- Create: `packages/db/src/schema/capture-events.ts`
- Create: `packages/db/src/schema/capture-parts.ts`
- Create: `packages/db/src/schema/capture-segments.ts`
- Create: `packages/db/src/schema/attachments.ts`
- Create: `packages/db/src/schema/inbox-items.ts`
- Create: `packages/db/src/schema/candidate-entities.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `infra/migrations/001_bootstrap.sql`
- Create: `infra/migrations/002_core_entities.sql`
- Create: `infra/migrations/003_capture_pipeline.sql`
- Test: `packages/db/src/schema/__tests__/core-schema.test.ts`
- Test: `packages/db/src/schema/__tests__/capture-schema.test.ts`

- [ ] **Step 1: Write the failing schema smoke tests**

```ts
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../client';

describe('core schema', () => {
  it('creates root entity tables', async () => {
    const result = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('entities', 'actors', 'contexts', 'work_items', 'events', 'resources', 'memory_items', 'rules')
    `);

    expect(result.rows).toHaveLength(8);
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../../client';

describe('capture schema', () => {
  it('creates capture pipeline tables', async () => {
    const result = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('captures', 'capture_sessions', 'capture_events', 'capture_parts', 'capture_segments', 'attachments', 'inbox_items', 'candidate_entities')
    `);

    expect(result.rows).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run the schema tests and verify they fail**

Run: `pnpm --filter @assistant/db test -- core-schema.test.ts capture-schema.test.ts`
Expected: fail because the DB package, schema files, and migrations do not exist yet.

- [ ] **Step 3: Implement the shared enums, Drizzle schema, and SQL migrations**

```ts
export const ENTITY_KINDS = ['actor', 'context', 'work_item', 'event', 'resource', 'memory', 'rule'] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];
```

```ts
export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: text('kind').notNull(),
  subtype: text('subtype'),
  title: text('title'),
  state: text('state').notNull().default('active'),
  sourceCaptureId: uuid('source_capture_id'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
```

```ts
export const captures = pgTable('captures', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: text('channel').notNull(),
  sourceType: text('source_type').notNull(),
  contentText: text('content_text').notNull(),
  clientRequestId: text('client_request_id').notNull(),
  status: text('status').notNull().default('received'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

```ts
export const candidateEntities = pgTable('candidate_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id').notNull(),
  segmentId: uuid('segment_id').notNull(),
  kind: text('kind').notNull(),
  subtype: text('subtype'),
  title: text('title').notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull(),
  evidence: jsonb('evidence').notNull().default(sql`'{}'::jsonb`),
  status: text('status').notNull().default('suggested'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists vector;
```

```sql
create table entities (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  subtype text,
  title text,
  state text not null default 'active',
  source_capture_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

```sql
create table inbox_items (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid references captures(id) on delete cascade,
  item_type text not null,
  status text not null default 'open',
  title text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 4: Apply migrations and rerun the schema tests**

Run: `pnpm db:migrate && pnpm --filter @assistant/db test -- core-schema.test.ts capture-schema.test.ts`
Expected: both schema tests pass.

- [ ] **Step 5: Commit the schema layer**

```bash
git add packages/domain packages/db infra/migrations
git commit -m "feat: add core entity and capture schema"
```

## Task 3: Implement the raw capture API and job enqueue path

**Files:**
- Create: `apps/api/src/modules/db/db.module.ts`
- Create: `apps/api/src/modules/jobs/jobs.module.ts`
- Create: `apps/api/src/modules/jobs/jobs.service.ts`
- Create: `apps/api/src/modules/capture/capture.controller.ts`
- Create: `apps/api/src/modules/capture/capture.service.ts`
- Create: `apps/api/src/modules/capture/capture-session.service.ts`
- Create: `apps/api/src/modules/capture/capture-event.service.ts`
- Create: `apps/api/src/modules/capture/capture-read.service.ts`
- Create: `apps/api/src/modules/capture/dto/create-capture.dto.ts`
- Test: `apps/api/test/capture.e2e-spec.ts`

- [ ] **Step 1: Write the failing capture API test**

```ts
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Capture API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /captures stores a capture and creates an inbox item', async () => {
    const response = await request(app.getHttpServer())
      .post('/captures')
      .send({
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
```

- [ ] **Step 2: Run the capture API test and verify it fails**

Run: `pnpm --filter @assistant/api test -- capture.e2e-spec.ts`
Expected: fail because the capture controller, DB module, and job queue module do not exist.

- [ ] **Step 3: Implement the minimal capture write orchestration**

```ts
export class CreateCaptureDto {
  channel!: 'web' | 'chat' | 'browser_extension';
  sourceType!: string;
  contentText!: string;
  clientRequestId!: string;
  metadata?: Record<string, unknown>;
}
```

```ts
@Post('/captures')
async createCapture(@Body() dto: CreateCaptureDto) {
  return this.captureService.createCapture(dto);
}
```

```ts
async createCapture(dto: CreateCaptureDto) {
  const capture = await this.repo.insertCapture(dto);
  const inboxItem = await this.repo.insertInboxItem({
    captureId: capture.id,
    itemType: 'capture_review',
    title: 'New capture received',
  });

  await this.captureSessionService.recordCreate(capture.id, dto.channel);
  await this.captureEventService.append(capture.id, 'capture_received', dto);
  await this.jobsService.publish('process-capture', { captureId: capture.id });

  return { capture, inboxItem };
}
```

- [ ] **Step 4: Run the API test and a manual smoke request**

Run: `pnpm --filter @assistant/api test -- capture.e2e-spec.ts`
Expected: one passing capture API test.

Run: `curl -s http://localhost:3001/captures -X POST -H 'content-type: application/json' -d '{"channel":"web","sourceType":"quick_capture","contentText":"Buy milk","clientRequestId":"cap_manual_1"}'`
Expected: JSON with `capture` and `inboxItem` objects.

- [ ] **Step 5: Commit the capture write path**

```bash
git add apps/api
git commit -m "feat: add raw capture api and job enqueue"
```

## Task 4: Add the web capture form and offline outbox

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/inbox/page.tsx`
- Create: `apps/web/src/components/capture/capture-form.tsx`
- Create: `apps/web/src/components/capture/capture-form.spec.tsx`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/offline/types.ts`
- Create: `apps/web/src/lib/offline/outbox.ts`
- Create: `apps/web/src/lib/offline/outbox.spec.ts`
- Create: `apps/web/src/lib/offline/replay.ts`
- Create: `apps/web/src/lib/offline/replay.spec.ts`
- Create: `apps/web/src/lib/offline/network.ts`

- [ ] **Step 1: Write the failing capture form and replay tests**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, it, expect } from 'vitest';
import { CaptureForm } from './capture-form';

it('queues a capture locally when offline', async () => {
  Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
  const onQueued = vi.fn();

  render(<CaptureForm onQueued={onQueued} />);

  fireEvent.change(screen.getByLabelText(/capture/i), {
    target: { value: 'Need to review the resume bullets' },
  });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));

  await waitFor(() => {
    expect(onQueued).toHaveBeenCalled();
  });
});
```

```ts
import { describe, expect, it, vi } from 'vitest';
import { replayPendingCaptures } from './replay';

describe('replayPendingCaptures', () => {
  it('posts queued captures once and clears them after success', async () => {
    const postCapture = vi.fn().mockResolvedValue({ ok: true });
    const listPending = vi.fn().mockResolvedValue([{ localId: '1', payload: { contentText: 'Buy milk' } }]);
    const markComplete = vi.fn().mockResolvedValue(undefined);

    await replayPendingCaptures({ postCapture, listPending, markComplete });

    expect(postCapture).toHaveBeenCalledTimes(1);
    expect(markComplete).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 2: Run the web tests and verify failure**

Run: `pnpm --filter @assistant/web test -- capture-form.spec.tsx outbox.spec.ts replay.spec.ts`
Expected: fail because the form, outbox, and replay modules do not exist.

- [ ] **Step 3: Implement the form and IndexedDB-backed outbox**

```ts
export type PendingCapture = {
  localId: string;
  payload: {
    channel: 'web';
    sourceType: 'quick_capture';
    contentText: string;
    clientRequestId: string;
    metadata?: Record<string, unknown>;
  };
  createdAt: string;
  status: 'pending' | 'failed';
};
```

```ts
export async function enqueueCapture(record: PendingCapture) {
  const db = await openDB('assistant-os', 1, {
    upgrade(db) {
      db.createObjectStore('pending_captures', { keyPath: 'localId' });
    },
  });

  await db.put('pending_captures', record);
}
```

```ts
export async function replayPendingCaptures(deps: {
  listPending: () => Promise<PendingCapture[]>;
  postCapture: (payload: PendingCapture['payload']) => Promise<{ ok: boolean }>;
  markComplete: (localId: string) => Promise<void>;
}) {
  const pending = await deps.listPending();

  for (const record of pending) {
    const result = await deps.postCapture(record.payload);
    if (result.ok) {
      await deps.markComplete(record.localId);
    }
  }
}
```

```tsx
export function CaptureForm({ onQueued }: { onQueued?: () => void }) {
  const [value, setValue] = useState('');

  async function handleSubmit() {
    const payload = {
      channel: 'web' as const,
      sourceType: 'quick_capture',
      contentText: value,
      clientRequestId: crypto.randomUUID(),
    };

    if (!navigator.onLine) {
      await enqueueCapture({
        localId: crypto.randomUUID(),
        payload,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
      onQueued?.();
      return;
    }

    await createCapture(payload);
  }

  return (
    <form>
      <label htmlFor="capture-input">Capture</label>
      <textarea id="capture-input" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" onClick={handleSubmit}>Save</button>
    </form>
  );
}
```

- [ ] **Step 4: Run the web tests and replay smoke check**

Run: `pnpm --filter @assistant/web test -- capture-form.spec.tsx outbox.spec.ts replay.spec.ts`
Expected: tests pass and the replay coordinator flushes queued captures once connectivity returns.

- [ ] **Step 5: Commit the offline-safe web capture UI**

```bash
git add apps/web
git commit -m "feat: add web capture form with offline outbox"
```

## Task 5: Build segmentation and extraction in the worker

**Files:**
- Create: `apps/worker/src/main.ts`
- Create: `apps/worker/src/jobs/process-capture.job.ts`
- Create: `apps/worker/src/jobs/process-capture.job.spec.ts`
- Create: `apps/worker/src/pipeline/segment-capture.ts`
- Create: `apps/worker/src/pipeline/segment-capture.spec.ts`
- Create: `apps/worker/src/pipeline/extract/urls.ts`
- Create: `apps/worker/src/pipeline/extract/urls.spec.ts`
- Create: `apps/worker/src/pipeline/extract/checklists.ts`
- Create: `apps/worker/src/pipeline/extract/checklists.spec.ts`
- Create: `apps/worker/src/pipeline/extract/dates.ts`
- Create: `apps/worker/src/pipeline/extract/dates.spec.ts`
- Create: `apps/worker/src/pipeline/extract/llm-extractor.ts`
- Create: `apps/worker/src/pipeline/merge-candidates.ts`
- Create: `apps/worker/src/pipeline/merge-candidates.spec.ts`

- [ ] **Step 1: Write the failing segmentation and merge tests**

```ts
import { describe, expect, it } from 'vitest';
import { segmentCapture } from './segment-capture';

describe('segmentCapture', () => {
  it('splits URLs, checklist lines, and free text into separate segments', () => {
    const segments = segmentCapture('Need to call Sam\n- update resume\nhttps://example.com');

    expect(segments.map((segment) => segment.kind)).toEqual(['text', 'checklist_item', 'url']);
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import { mergeCandidates } from './merge-candidates';

describe('mergeCandidates', () => {
  it('prefers deterministic candidates when the llm suggests the same object', () => {
    const merged = mergeCandidates({
      deterministic: [
        { segmentId: 'seg_1', kind: 'work_item', subtype: 'task', title: 'update resume', confidence: 0.98 },
      ],
      llm: [
        { segmentId: 'seg_1', kind: 'work_item', subtype: 'task', title: 'update resume', confidence: 0.71 },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].confidence).toBe(0.98);
  });
});
```

- [ ] **Step 2: Run the worker tests and verify failure**

Run: `pnpm --filter @assistant/worker test -- segment-capture.spec.ts urls.spec.ts checklists.spec.ts dates.spec.ts merge-candidates.spec.ts process-capture.job.spec.ts`
Expected: fail because the worker app and pipeline functions do not exist.

- [ ] **Step 3: Implement segmentation, deterministic extractors, LLM enrichment, and merge logic**

```ts
export function segmentCapture(content: string) {
  return content
    .split('\n')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((text, index) => {
      if (/^https?:\/\//.test(text)) return { id: `seg_${index}`, kind: 'url', text };
      if (/^[-*]\s+/.test(text)) return { id: `seg_${index}`, kind: 'checklist_item', text: text.replace(/^[-*]\s+/, '') };
      return { id: `seg_${index}`, kind: 'text', text };
    });
}
```

```ts
export function extractUrls(segments: Array<{ id: string; kind: string; text: string }>) {
  return segments
    .filter((segment) => segment.kind === 'url')
    .map((segment) => ({
      segmentId: segment.id,
      kind: 'resource',
      subtype: 'webpage',
      title: segment.text,
      confidence: 0.99,
      evidence: { extractor: 'url' },
    }));
}
```

```ts
export function extractChecklistItems(segments: Array<{ id: string; kind: string; text: string }>) {
  return segments
    .filter((segment) => segment.kind === 'checklist_item')
    .map((segment) => ({
      segmentId: segment.id,
      kind: 'work_item',
      subtype: 'task',
      title: segment.text,
      confidence: 0.98,
      evidence: { extractor: 'checklist' },
    }));
}
```

```ts
export function extractDates(segments: Array<{ id: string; text: string }>) {
  return segments
    .filter((segment) => /\b(today|tomorrow|next\s+\w+)\b/i.test(segment.text))
    .map((segment) => ({
      segmentId: segment.id,
      kind: 'event',
      subtype: 'deadline',
      title: segment.text,
      confidence: 0.62,
      evidence: { extractor: 'date_keyword' },
    }));
}
```

```ts
export async function extractWithLlm(segments: Array<{ id: string; text: string }>) {
  return segments
    .filter((segment) => segment.text.length > 20)
    .map((segment) => ({
      segmentId: segment.id,
      kind: 'memory',
      subtype: 'summary',
      title: segment.text.slice(0, 80),
      confidence: 0.55,
      evidence: { extractor: 'llm_stub' },
    }));
}
```

```ts
export function mergeCandidates(input: { deterministic: any[]; llm: any[] }) {
  const byKey = new Map<string, any>();
  for (const candidate of [...input.llm, ...input.deterministic]) {
    const key = `${candidate.segmentId}:${candidate.kind}:${candidate.subtype}:${candidate.title.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing || Number(candidate.confidence) > Number(existing.confidence)) {
      byKey.set(key, candidate);
    }
  }
  return [...byKey.values()];
}
```

```ts
const segments = segmentCapture(capture.contentText);
const deterministic = [...extractUrls(segments), ...extractChecklistItems(segments), ...extractDates(segments)];
const llm = await extractWithLlm(segments);
const merged = mergeCandidates({ deterministic, llm });
await repo.insertSegments(capture.id, segments);
await repo.insertCandidateEntities(capture.id, merged);
```

- [ ] **Step 4: Run the worker tests and the processing smoke job**

Run: `pnpm --filter @assistant/worker test -- segment-capture.spec.ts urls.spec.ts checklists.spec.ts dates.spec.ts merge-candidates.spec.ts process-capture.job.spec.ts`
Expected: all worker tests pass and candidate rows are inserted into `candidate_entities`.

- [ ] **Step 5: Commit the worker pipeline**

```bash
git add apps/worker
git commit -m "feat: add capture segmentation and extraction pipeline"
```

## Task 6: Implement inbox review, promotion, and provenance detail

**Files:**
- Create: `apps/api/src/modules/inbox/inbox.controller.ts`
- Create: `apps/api/src/modules/inbox/inbox.service.ts`
- Create: `apps/api/src/modules/entities/entities.controller.ts`
- Create: `apps/api/src/modules/entities/promotion.service.ts`
- Create: `apps/api/src/modules/entities/entity-detail.service.ts`
- Create: `apps/api/test/inbox.e2e-spec.ts`
- Create: `apps/api/test/promotion.e2e-spec.ts`
- Create: `apps/web/src/components/inbox/inbox-list.tsx`
- Create: `apps/web/src/components/inbox/inbox-list.spec.tsx`
- Create: `apps/web/src/components/entities/entity-provenance.tsx`
- Create: `apps/web/src/components/entities/entity-provenance.spec.tsx`
- Create: `apps/web/src/app/entities/[id]/page.tsx`

- [ ] **Step 1: Write the failing inbox and promotion tests**

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';

it('GET /inbox returns open capture review items with candidates', async () => {
  const response = await request(app.getHttpServer()).get('/inbox');

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.items)).toBe(true);
});
```

```ts
import { describe, expect, it } from 'vitest';
import request from 'supertest';

it('POST /entities/promote converts a candidate into an entity linked to its source capture', async () => {
  const response = await request(app.getHttpServer())
    .post('/entities/promote')
    .send({ candidateEntityId: 'cand_1' });

  expect(response.status).toBe(201);
  expect(response.body.entity.kind).toBeDefined();
  expect(response.body.entity.sourceCaptureId).toBeDefined();
});
```

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityProvenance } from './entity-provenance';

it('renders source capture provenance', () => {
  render(
    <EntityProvenance
      sourceCapture={{ channel: 'web' }}
      sourceSegment={{ text: 'update resume' }}
    />,
  );

  expect(screen.getByText(/capture source/i)).toBeInTheDocument();
  expect(screen.getByText(/update resume/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the API and UI tests and verify failure**

Run: `pnpm --filter @assistant/api test -- inbox.e2e-spec.ts promotion.e2e-spec.ts`
Expected: fail because inbox read models and promotion endpoints do not exist.

Run: `pnpm --filter @assistant/web test -- inbox-list.spec.tsx entity-provenance.spec.tsx`
Expected: fail because the inbox and provenance components do not exist.

- [ ] **Step 3: Implement the inbox read model, promotion path, and provenance view**

```ts
@Get('/inbox')
async getInbox() {
  return this.inboxService.getOpenItems();
}
```

```ts
async promoteCandidate(candidateEntityId: string) {
  const candidate = await this.repo.getCandidate(candidateEntityId);
  const entity = await this.repo.insertEntity({
    kind: candidate.kind,
    subtype: candidate.subtype,
    title: candidate.title,
    sourceCaptureId: candidate.captureId,
    metadata: { promotedFromCandidateId: candidate.id },
  });

  await this.repo.linkCandidateToEntity(candidate.id, entity.id);
  await this.repo.appendEntityEvent(entity.id, 'promoted_from_candidate', {
    candidateEntityId: candidate.id,
    captureId: candidate.captureId,
    segmentId: candidate.segmentId,
  });

  return entity;
}
```

```tsx
export function EntityProvenance({ sourceCapture, sourceSegment }: { sourceCapture: any; sourceSegment: any }) {
  return (
    <section>
      <h2>Provenance</h2>
      <p>Capture source: {sourceCapture.channel}</p>
      <pre>{sourceSegment.text}</pre>
    </section>
  );
}
```

- [ ] **Step 4: Run API/UI tests and a manual end-to-end walkthrough**

Run: `pnpm --filter @assistant/api test -- inbox.e2e-spec.ts promotion.e2e-spec.ts`
Expected: tests pass.

Run: `pnpm --filter @assistant/web test -- inbox-list.spec.tsx entity-provenance.spec.tsx`
Expected: inbox list and provenance tests pass.

Manual walkthrough:
1. Start `docker compose -f infra/docker/docker-compose.yml up -d`
2. Run `pnpm dev`
3. Paste `Need to follow up with Sam\n- update resume\nhttps://example.com`
4. Open `/inbox`
5. Promote the checklist candidate
6. Open the entity detail page and confirm provenance is visible

Expected: one promoted entity with visible capture and segment provenance.

- [ ] **Step 5: Commit the review and promotion slice**

```bash
git add apps/api apps/web
git commit -m "feat: add candidate promotion and inbox review"
```

## Task 7: Add the deterministic demo path and verify the slice

**Files:**
- Create: `scripts/demo-capture.ts`
- Create: `docs/capture-and-promotion-demo.md`

- [ ] **Step 1: Add a deterministic demo capture script**

```ts
await fetch('http://localhost:3001/captures', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    channel: 'web',
    sourceType: 'demo',
    clientRequestId: 'demo_capture_1',
    contentText: 'Need to follow up with Sam\n- update resume\nhttps://example.com',
  }),
});
```

- [ ] **Step 2: Run the full verification suite**

Run: `pnpm test`
Expected: all workspace tests pass.

- [ ] **Step 3: Run the demo walkthrough script**

Run: `pnpm tsx scripts/demo-capture.ts`
Expected: one capture is created and shows up in `Inbox` after the worker processes it.

- [ ] **Step 4: Document the manual demo steps**

```md
1. Run `docker compose -f infra/docker/docker-compose.yml up -d`
2. Run `pnpm dev`
3. Run `pnpm tsx scripts/demo-capture.ts`
4. Open `/inbox`
5. Promote the checklist candidate
6. Open the entity detail page and confirm provenance
```

- [ ] **Step 5: Commit the verified slice**

```bash
git add scripts docs
git commit -m "docs: add capture and promotion demo walkthrough"
```

## Self-Review

### Spec coverage
This plan covers the whole `capture-and-promotion-v1` slice:
- workspace bootstrap
- universal entity registry sufficient for promotion
- raw capture write path
- capture sessions, events, parts, segments, and inbox items
- offline-safe web capture outbox and replay
- segmentation
- deterministic extraction
- LLM merge step
- candidate persistence
- promotion into canonical entities
- inbox read model
- provenance-rich entity detail

### Placeholder scan
There are no `TODO` or `TBD` placeholders in this plan. Boundaries are explicit and the out-of-scope systems are named.

### Type consistency
The plan consistently uses `EntityKind`, `CreateCaptureDto`, `candidate_entities`, `sourceCaptureId`, `capture_sessions`, `capture_events`, and `capture_parts`. The worker and API flows both refer to the same candidate-to-entity promotion model.
