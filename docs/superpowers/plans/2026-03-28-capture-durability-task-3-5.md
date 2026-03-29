# Capture Durability Task 3.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the API's process-local capture storage and job stub with durable Postgres-backed persistence and a durable job enqueue path before the offline outbox UI lands.

**Architecture:** The API should stop owning in-memory arrays for captures, inbox items, sessions, and events. Instead it should use `@assistant/db`'s Drizzle client against the existing schema, and persist a durable capture job record in Postgres that later worker code can claim. Task 3's replay semantics stay intact, but they must now survive app restarts and work across multiple processes.

**Tech Stack:** `NestJS 11`, `TypeScript 5`, `Drizzle ORM`, `pg`, `Postgres 17`, `Vitest`, `Supertest`

---

### Task 3.5.1: Add a durable capture jobs table and schema test coverage

**Files:**
- Create: `infra/migrations/005_capture_jobs.sql`
- Create: `packages/db/src/schema/capture-jobs.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/__tests__/capture-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

```ts
it('includes capture_jobs for durable process-capture enqueues', async () => {
  const hasTable = await hasTable(client, 'capture_jobs');
  expect(hasTable).toBe(true);
});
```

- [ ] **Step 2: Run the schema test and verify failure**

Run: `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH" && cd /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1 && pnpm --filter @assistant/db test -- capture-schema.test.ts`
Expected: FAIL because `capture_jobs` does not exist in the DB schema or migrations.

- [ ] **Step 3: Add the migration and schema module**

```sql
create table if not exists capture_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references captures(id) on delete cascade,
  job_name text not null,
  dedupe_key text not null,
  status text not null default 'pending',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (dedupe_key)
);
```

```ts
export const captureJobs = pgTable('capture_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  captureId: uuid('capture_id').notNull().references(() => captures.id, { onDelete: 'cascade' }),
  jobName: text('job_name').notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(),
  status: text('status').notNull().default('pending'),
  payloadJson: jsonb('payload_json').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});
```

- [ ] **Step 4: Re-run the schema test and verify pass**

Run: `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH" && cd /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1 && pnpm --filter @assistant/db test -- capture-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the durable job schema**

```bash
git add infra/migrations/005_capture_jobs.sql packages/db/src/schema
git commit -m "feat: add durable capture jobs schema"
```

### Task 3.5.2: Replace the in-memory DbService with a Postgres-backed capture repository

**Files:**
- Create: `apps/api/src/modules/db/db.constants.ts`
- Create: `apps/api/src/modules/db/db.types.ts`
- Create: `apps/api/src/modules/db/capture-repository.ts`
- Modify: `apps/api/src/modules/db/db.module.ts`
- Modify: `apps/api/src/modules/capture/capture-read.service.ts`
- Modify: `apps/api/src/modules/capture/capture-session.service.ts`
- Modify: `apps/api/src/modules/capture/capture-event.service.ts`
- Modify: `apps/api/src/modules/capture/capture.service.ts`
- Modify: `apps/api/test/capture.e2e-spec.ts`

- [ ] **Step 1: Write the failing API durability test**

Add an e2e test that boots one app instance, creates a capture, closes the app, boots a second app instance against the same `DATABASE_URL`, then replays the same `clientRequestId` and expects the existing capture to be returned.

```ts
it('replays against persisted capture state across app instances', async () => {
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
```

- [ ] **Step 2: Run the API test and verify failure**

Run: `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH" && export DATABASE_URL="postgres://assistant:assistant@localhost:5432/assistant" && cd /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1 && pnpm --filter @assistant/api test -- capture.e2e-spec.ts`
Expected: FAIL because the current in-memory DB loses state between app instances.

- [ ] **Step 3: Implement a repository over Drizzle**

Create a repository that owns:
- insert or load capture by `client_request_id`
- find/create inbox item by `capture_id`
- find/create capture session by `capture_id`
- find/create `capture_received` event by `capture_id`
- find/update event session linkage
- query read models used by the capture tests

Use explicit provider tokens so Nest does not depend on implicit metadata.

- [ ] **Step 4: Re-run the API test and verify pass**

Run: `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH" && export DATABASE_URL="postgres://assistant:assistant@localhost:5432/assistant" && cd /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1 && pnpm --filter @assistant/api test -- capture.e2e-spec.ts`
Expected: PASS with restart-safe replay semantics.

- [ ] **Step 5: Commit the durable repository wiring**

```bash
git add apps/api
git commit -m "feat: back capture api with postgres"
```

### Task 3.5.3: Replace the in-memory JobsService with a durable enqueue path

**Files:**
- Modify: `apps/api/src/modules/jobs/jobs.module.ts`
- Modify: `apps/api/src/modules/jobs/jobs.service.ts`
- Modify: `apps/api/src/modules/capture/capture.service.ts`
- Modify: `apps/api/test/capture.e2e-spec.ts`

- [ ] **Step 1: Write the failing durable enqueue test**

Add an e2e test that creates a capture, closes the app, boots a second app instance, replays the same payload, and asserts there is still only one durable `process-capture` job row for that capture.

```ts
it('does not duplicate durable process-capture jobs across app restarts', async () => {
  // create on app instance A
  // replay on app instance B
  // assert one capture_jobs row with dedupe_key = `process-capture:${captureId}`
});
```

- [ ] **Step 2: Run the API test and verify failure**

Run: `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH" && export DATABASE_URL="postgres://assistant:assistant@localhost:5432/assistant" && cd /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1 && pnpm --filter @assistant/api test -- capture.e2e-spec.ts`
Expected: FAIL because the current job stub is process-local.

- [ ] **Step 3: Implement durable job publication**

Make `JobsService.publish('process-capture', { captureId })` insert into `capture_jobs` with `dedupe_key = process-capture:${captureId}` and treat duplicate-key conflicts as success by loading the existing job row.

- [ ] **Step 4: Re-run the API test and verify pass**

Run: `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH" && export DATABASE_URL="postgres://assistant:assistant@localhost:5432/assistant" && cd /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1 && pnpm --filter @assistant/api test -- capture.e2e-spec.ts`
Expected: PASS with exactly one durable job row per capture.

- [ ] **Step 5: Commit the durable enqueue path**

```bash
git add apps/api
git commit -m "feat: persist capture jobs durably"
```

### Task 3.5.4: Make local verification repeatable for the durable stack

**Files:**
- Modify: `apps/api/package.json`
- Modify: `packages/db/package.json`
- Modify: `README.md` or create `docs/local-dev.md`

- [ ] **Step 1: Add narrow test scripts if needed**

Add scripts so the durable API and DB tests can be run with `DATABASE_URL` set, without relying on hidden shell knowledge.

- [ ] **Step 2: Verify the full durable slice**

Run:
- `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH"`
- `docker compose -f infra/docker/docker-compose.yml up -d`
- `export DATABASE_URL="postgres://assistant:assistant@localhost:5432/assistant"`
- `pnpm db:migrate`
- `pnpm --filter @assistant/db test -- capture-schema.test.ts`
- `pnpm --filter @assistant/api test -- capture.e2e-spec.ts`

Expected: migrations apply and both durable schema/API suites pass.

- [ ] **Step 3: Commit the verification polish**

```bash
git add apps/api/package.json packages/db/package.json README.md docs/local-dev.md
git commit -m "chore: document durable capture verification"
```
