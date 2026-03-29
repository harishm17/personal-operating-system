# Personal Assistant OS Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a code-first personal assistant and second-brain application that turns messy captures into trustworthy operational state, grounded memory, durable research, and assistant-driven workflows across chat, browser, calendar, email, and notifications.

**Architecture:** Build a modular monolith with a universal entity schema, explicit artifact/snapshot storage, worker-driven reminders and research jobs, approval-backed external actions, and an OpenClaw shell that sits on top of our backend rather than owning the product model. The product should preserve raw input first, progressively promote behavior-critical structure, and generate views such as `Inbox`, `Today`, `Waiting`, `Research`, and `People` from shared canonical objects.

**Tech Stack:** `Next.js`, `TypeScript`, `NestJS` or `Fastify`, `Postgres`, `pgvector`, `pg-boss`, S3-compatible object storage, `Drizzle` or `Kysely`, `Playwright`, OpenClaw plugin + skills.

---

## 1. Product Scope

### In scope for v1

- messy capture from web app, chat, browser extension, share-like flows, and later voice
- offline-safe single-user capture with local outbox and sync replay for web/PWA and browser extension surfaces
- progressive structuring into canonical assistant objects
- operational task/reminder/planning workflows
- source-backed memory and retrieval
- reusable research runs and evidence bundles
- a fuller initial research profile set: `company_prep`, `person_brief`, `tool_comparison`, `decision_support`, `how_to`, `breaking_update`, `product_watch`, `resource_summary`, and `career_outreach`
- contact enrichment and identity resolution from synced email, calendar, and People/Contacts data with explicit merge controls
- opt-in passive telemetry for review and planning context
- Gmail read sync, Calendar read sync, People/Contacts read sync, browser capture, notification delivery, and approval-backed writes
- OpenClaw as a first-class assistant surface with plugin tools, context-engine integration, and memory-slot bridging

### Explicit non-goals for v1

- building a Notion clone or document editor first
- building a Todoist clone first
- full multi-device local-first conflict resolution or collaborative sync
- elaborate graph visualization UI
- aggressive autonomous browser automation without approvals
- fully general multi-agent swarm orchestration
- native mobile apps before the web/PWA and extension surfaces are strong

### v1 success criteria

The product is successful when a user can:

- dump a messy note page into the app and get useful promoted objects plus a preserved raw source
- ask `what should I do today?` and get a grounded plan better than a flat task list
- save links/files/questions and later ask source-backed questions over them
- connect Gmail, Calendar, and Contacts for context without giving away product ownership to those systems
- capture while offline and trust the system to replay safely when back online
- use OpenClaw chat and the web UI interchangeably against the same backend state

## 2. Product Principles

1. Preserve before summarizing.
2. Promote structure only when behavior depends on it.
3. Keep physical ontology small and universal.
4. Keep tags weak and topical only.
5. Make assistant actions explicit, inspectable, and usually reversible.
6. Require durable approval records for risky external writes.
7. Prefer bounded workflow engines over one broad autonomous agent.
8. Prefer generated views over duplicated app silos.
9. Separate canonical state from artifacts, indexes, and runtime state.
10. Keep follow-up interactions grounded in prior evidence whenever possible.
11. Make offline capture durable even when the canonical system is cloud-backed.
12. Keep passive telemetry opt-in, inspectable, and isolated from canonical entities.

## 3. Stable Conceptual Model

### Root kinds

These are the stable physical ontology boundaries:

- `actor`
- `context`
- `work_item`
- `event`
- `resource`
- `memory`
- `rule`

### Why this model

This avoids overfitting the schema to current examples like interview prep, job applications, books, habits, or coursework. Those are real user scenarios, but they should not all become root tables.

Examples:

- a person or company is an `actor`
- a project, goal, area, campaign, or application is a `context`
- a task, follow-up, routine, or checklist item is a `work_item`
- a meeting, deadline, interview, trip segment, or appointment is an `event`
- a book, article, paper, video, repo, webpage, note, or PDF is a `resource`
- a preference, fact, summary, decision, or profile item is a `memory`
- a planning, reminder, notification, or assistant-behavior policy is a `rule`

### What should not be a root kind

Do not make these top-level physical tables in v1:

- `people`
- `projects`
- `tasks`
- `books`
- `interviews`
- `applications`
- `habits`
- `watchlists`

These can exist as:

- subtypes
- filtered API aliases
- UI labels
- saved views
- templates

### Reminder treatment

`reminders` should remain an operational table, not a conceptual root kind. A reminder is behavior attached to another object, not a peer concept to `actor` or `resource`.

## 4. Storage Model

### Five storage concerns

We need to keep these distinct:

1. canonical objects
2. artifacts and preserved source material
3. retrieval and search indexes
4. temporal and event history
5. assistant and runtime state

### Canonical layer

Core tables:

- `entities`
- `actors`
- `contexts`
- `work_items`
- `events`
- `resources`
- `memory_items`
- `rules`
- `entity_relations`
- `entity_events`

### Artifact layer

Core tables:

- `captures`
- `capture_segments`
- `attachments`
- `resource_snapshots`
- `resource_artifacts`

Design rules:

- preserve original files and fetched outputs when useful
- reference blobs by `storage_type` and `storage_ref`
- keep extracted text separate from the original blob
- allow multiple artifacts for the same source, such as HTML, readability text, OCR text, PDF, screenshot, and transcript

### Retrieval layer

Core tables:

- `embeddings`
- `search_documents`
- `memory_summaries`
- `memory_summary_edges`
- `working_memory_items`
- `procedural_rules`

Design rules:

- retrieval state must be rebuildable from canonical plus artifact state
- hybrid retrieval should combine FTS, embeddings, recency, relations, and provenance
- summary compaction should exist alongside raw history, not replace it

### Temporal and event layer

Core tables:

- `entity_events`
- `capture_events`
- `reminder_events`
- `reminder_deliveries`
- `notification_deliveries`
- `telemetry_buckets`
- `telemetry_events`

Design rules:

- event history should remain append-only where practical
- reminder and notification history should be inspectable independently from current state
- capture history should preserve channel/session context for imported messages and browser actions

### Runtime layer

Core tables:

- `assistant_sessions`
- `channel_bindings`
- `workflow_runs`
- `workflow_steps`
- `action_requests`
- `plans`
- `plan_items`
- `reminders`
- `notification_endpoints`
- `provider_definitions`
- `connections`
- `connection_tags`
- `oauth_sessions`
- `connection_credentials`
- `sync_cursors`
- `webhook_channels`
- `inbound_webhook_events`
- `external_object_refs`

### Local client durability

The canonical system remains cloud-backed, but v1 should still provide durable local capture behavior.

Client-local stores should include:

- web/PWA offline capture outbox
- browser-extension offline queue
- recent view cache for `Inbox`, `Today`, and entity detail
- optimistic local IDs and replay metadata for pending captures and approvals

Design rules:

- local stores are durability and UX layers, not alternate canonical truth
- replay must be idempotent against server-side create endpoints
- failed replays should become visible inbox or connection-health issues, not silent drops

## 5. Derived Views

These are important UX concepts, but they should mostly be projections over canonical state rather than new physical roots.

### Primary views

- `Inbox`
- `Today`
- `Now`
- `This Week`
- `Waiting`
- `Research`
- `People`
- `Contexts`
- `Resources`
- `Memory`
- `Rules`

### Example mappings

- `People` = `actors where subtype = 'person'`
- `Projects` = `contexts where subtype = 'project'`
- `Goals` = `contexts where subtype = 'goal'`
- `Tasks` = `work_items where subtype = 'task'`
- `Routines` = `work_items where subtype = 'routine'`
- `Books` = `resources where subtype = 'book'`
- `Interviews` = `events where subtype = 'interview'`

## 6. Core Runtime Loops

### Capture loop

`capture -> segment -> extract -> candidate entities -> promote -> link provenance`

### Work loop

`work item -> reminder/schedule -> Today/Waiting -> user action -> entity events`

### Memory loop

`resource/capture/event -> artifact/snapshot -> retrieval docs/embeddings -> answer with sources`

### Research loop

`question/topic -> intent parse -> workflow profile -> evidence pipeline -> research brief -> derived tasks/reminders`

### Review loop

`events + reminders + plans + completed work -> daily/weekly review -> rule or plan adjustments`

## 7. Assistant Boundary

### Orchestrator responsibilities

The assistant layer should:

- parse user intent
- surface a short understanding of the request for higher-cost workflows
- choose a bounded workflow profile
- call typed backend workflows
- present grounded results and ask approval when needed

### Engine responsibilities

The backend engines should:

- fetch and normalize source data
- preserve artifacts and provenance
- score, dedupe, and cross-link evidence
- promote or update canonical objects
- schedule jobs and reminders
- maintain sync state and action logs

### OpenClaw role

OpenClaw should provide:

- conversational access
- channel bindings
- plugin tool exposure
- reminder delivery surfaces
- skill-driven assistant ergonomics

OpenClaw should not own:

- canonical assistant entities
- planning truth
- reminder truth
- research memory truth
- integration state truth

## 8. Repository Layout

```text
apps/
  web/
  api/
  worker/
  browser-extension/
  openclaw-plugin/
packages/
  domain/
  db/
  prompts/
  retrieval/
  workflows/
  integrations/
  sdk/
  ui/
infra/
  docker/
  migrations/
docs/
  architecture/
  decisions/
research/
```

### Package responsibilities

- `packages/domain`: enums, entity schemas, state machines, relation names
- `packages/db`: schema, migrations, query helpers, repositories
- `packages/prompts`: extraction, planning, research, approval prompts
- `packages/retrieval`: chunking, embedding jobs, hybrid retrieval, summary DAG logic
- `packages/workflows`: capture, research, reminder, sync, and planning workflow engines
- `packages/integrations`: Gmail, Calendar, browser extension, notifications, contacts adapters
- `packages/sdk`: shared API types for web app, plugin, and extension
- `packages/ui`: shared UI primitives once the app stabilizes

## 9. Build Order

### Phase 0: Monorepo and local infrastructure

Outcome:

- repo boots locally
- DB and worker infrastructure exist
- migrations can run cleanly
- object storage is wired

### Phase 1: Canonical model and captures

Outcome:

- universal entity schema is live
- raw captures can be stored
- capture segments and provenance are visible

### Phase 2: Promotion and work management

Outcome:

- extracted candidates can become contexts, work items, events, resources, rules, and actors
- reminders and Today become operational

### Phase 3: Resources and retrieval

Outcome:

- URLs/files become preserved resources with snapshots and artifacts
- source-backed answers work over user data

### Phase 4: Research workflows

Outcome:

- research runs, evidence items, briefs, and follow-up-over-evidence work

### Phase 5: Integration substrate

Outcome:

- providers, connections, OAuth, sync cursors, notifications, and approvals exist

### Phase 6: Identity, Gmail, Calendar, browser capture, offline replay, and notifications

Outcome:

- real contextual data starts feeding the assistant
- offline-safe capture and replay is operational
- contact enrichment and merge review support actor resolution

### Phase 7: OpenClaw runtime and memory integration

Outcome:

- chat becomes a first-class surface over the same backend

### Phase 8: Reviews and adaptive planning

Outcome:

- daily/weekly review and drift detection close the loop

## 10. Master Task Breakdown

### Task 1: Create the monorepo foundation

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `turbo.json`
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `apps/worker/package.json`
- Create: `apps/browser-extension/package.json`
- Create: `apps/openclaw-plugin/package.json`
- Create: `apps/web/src/lib/offline/.gitkeep`
- Create: `packages/domain/package.json`
- Create: `packages/db/package.json`
- Create: `packages/sdk/package.json`
- Create: `infra/docker/docker-compose.yml`
- Create: `.env.example`
- Create: `README.md`

- [ ] Define the workspace packages and top-level scripts for `dev`, `build`, `test`, `lint`, `typecheck`, and `db:migrate`.
- [ ] Add Docker services for Postgres, object storage, and any local dev dependencies.
- [ ] Choose the client-local durability primitives for web/PWA and browser extension offline queues.
- [ ] Add a root README that explains how to boot the stack and what each app/package owns.
- [ ] Verify `pnpm install`, `pnpm lint`, and `docker compose up` all succeed with the empty scaffold.

### Task 2: Establish the universal entity schema

**Files:**
- Create: `packages/domain/src/entities/entity-kind.ts`
- Create: `packages/domain/src/entities/entity-subtypes.ts`
- Create: `packages/domain/src/relations/relation-kind.ts`
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
- Create: `infra/migrations/001_core_entities.sql`
- Test: `packages/db/src/schema/__tests__/core-schema.test.ts`

- [ ] Define the stable `kind` values and allowed subtype groupings in `packages/domain`.
- [ ] Create the `entities` registry and the seven root detail tables.
- [ ] Add `entity_relations` and `entity_events` with clear relation naming and provenance fields.
- [ ] Verify migration application on a fresh database.
- [ ] Add schema tests that assert the expected tables, enum values, and foreign keys exist.

### Task 3: Build raw capture and inbox ingestion

**Files:**
- Create: `packages/db/src/schema/captures.ts`
- Create: `packages/db/src/schema/capture-sessions.ts`
- Create: `packages/db/src/schema/capture-events.ts`
- Create: `packages/db/src/schema/capture-parts.ts`
- Create: `packages/db/src/schema/capture-segments.ts`
- Create: `packages/db/src/schema/attachments.ts`
- Create: `packages/db/src/schema/inbox-items.ts`
- Create: `apps/api/src/modules/capture/capture.controller.ts`
- Create: `apps/api/src/modules/capture/capture.service.ts`
- Create: `apps/api/src/modules/capture/capture-session.service.ts`
- Create: `apps/api/src/modules/capture/capture-event.service.ts`
- Create: `apps/api/src/modules/capture/capture-segmentation.service.ts`
- Create: `apps/api/src/modules/capture/attachment.service.ts`
- Create: `apps/api/src/modules/capture/dto/create-capture.dto.ts`
- Create: `apps/worker/src/jobs/process-capture.job.ts`
- Test: `apps/api/src/modules/capture/capture.service.spec.ts`
- Test: `apps/api/src/modules/capture/capture.controller.e2e-spec.ts`

- [ ] Implement `POST /captures` for raw text, URLs, and metadata.
- [ ] Store raw content and create an initial inbox item.
- [ ] Record `capture_sessions`, `capture_events`, and multipart payload structure for chat, browser, and future voice inputs.
- [ ] Segment captures deterministically by checklist blocks, URLs, lines, and paragraphs.
- [ ] Enqueue a background interpretation job after capture creation.
- [ ] Verify a pasted mixed-content page produces one capture, multiple capture segments, one inbox item, and replayable capture history.

### Task 4: Implement candidate extraction and promotion

**Files:**
- Create: `packages/db/src/schema/candidate-entities.ts`
- Create: `apps/api/src/modules/interpretation/interpretation.service.ts`
- Create: `apps/api/src/modules/interpretation/deterministic-extractors/url-extractor.ts`
- Create: `apps/api/src/modules/interpretation/deterministic-extractors/checklist-extractor.ts`
- Create: `apps/api/src/modules/interpretation/deterministic-extractors/date-extractor.ts`
- Create: `apps/api/src/modules/interpretation/llm-extractor.ts`
- Create: `apps/api/src/modules/entities/promotion.service.ts`
- Test: `apps/api/src/modules/interpretation/interpretation.service.spec.ts`
- Test: `apps/api/src/modules/entities/promotion.service.spec.ts`

- [ ] Extract low-cost candidates first with deterministic extractors.
- [ ] Run LLM extraction only after deterministic segmentation is available.
- [ ] Represent outputs as candidate entities with confidence, evidence segments, and proposed subtype.
- [ ] Promote only high-confidence or explicitly-approved candidates into canonical entities.
- [ ] Verify promoted entities preserve `source_capture_id` and segment-level provenance.

### Task 5: Implement work items and reminders

**Files:**
- Create: `packages/db/src/schema/reminders.ts`
- Create: `packages/db/src/schema/reminder-events.ts`
- Create: `packages/db/src/schema/reminder-deliveries.ts`
- Create: `apps/api/src/modules/work-items/work-item.service.ts`
- Create: `apps/api/src/modules/work-items/work-item.controller.ts`
- Create: `apps/api/src/modules/reminders/reminder.service.ts`
- Create: `apps/worker/src/jobs/fire-reminder.job.ts`
- Create: `packages/domain/src/work-items/work-item-state.ts`
- Test: `apps/api/src/modules/work-items/work-item.service.spec.ts`
- Test: `apps/api/src/modules/reminders/reminder.service.spec.ts`

- [ ] Support `task`, `follow_up`, `routine`, and `checklist_item` subtypes in `work_items`.
- [ ] Implement reminder scheduling, completion, snooze, defer, and cancellation.
- [ ] Keep reminder truth independent from task truth while linking back to a target entity.
- [ ] Record reminder state transitions in `reminder_events` and delivery attempts in `reminder_deliveries`.
- [ ] Verify a work item can be created from a capture and later surfaced by reminder state.

### Task 6: Build the planner projections

**Files:**
- Create: `packages/db/src/schema/plans.ts`
- Create: `packages/db/src/schema/plan-items.ts`
- Create: `apps/api/src/modules/planning/planning.service.ts`
- Create: `apps/api/src/modules/planning/today-view.service.ts`
- Create: `apps/api/src/modules/planning/waiting-view.service.ts`
- Create: `apps/api/src/modules/planning/scoring.service.ts`
- Test: `apps/api/src/modules/planning/planning.service.spec.ts`
- Test: `apps/api/src/modules/planning/today-view.service.spec.ts`

- [ ] Build derived `Inbox`, `Today`, `Now`, `This Week`, and `Waiting` projections over canonical state.
- [ ] Separate date-only deadlines from time-specific scheduling.
- [ ] Use scoring inputs from due state, reminder state, relation state, and optionally calendar occupancy.
- [ ] Snapshot accepted plans in `plans` and `plan_items` without moving truth out of `work_items`.
- [ ] Verify the planner surfaces urgent work from messy-capture-derived tasks.

### Task 7: Implement resource ingestion, snapshots, and artifacts

**Files:**
- Create: `packages/db/src/schema/resource-snapshots.ts`
- Create: `packages/db/src/schema/resource-artifacts.ts`
- Create: `apps/api/src/modules/resources/resource.service.ts`
- Create: `apps/api/src/modules/resources/snapshot.service.ts`
- Create: `apps/worker/src/jobs/fetch-resource.job.ts`
- Create: `apps/worker/src/jobs/extract-resource-text.job.ts`
- Create: `packages/retrieval/src/text/chunking.ts`
- Test: `apps/api/src/modules/resources/resource.service.spec.ts`
- Test: `apps/worker/src/jobs/fetch-resource.job.spec.ts`

- [ ] Promote URLs/files into `resources` with subtype-specific metadata.
- [ ] Store snapshots for fetched versions and artifacts for rendered or extracted outputs.
- [ ] Preserve enough provenance to answer `where did this come from?` later.
- [ ] Support multiple artifact kinds such as raw HTML, cleaned text, OCR text, PDF, screenshot, and transcript.
- [ ] Verify a saved link becomes a resource with at least one snapshot and one artifact.

### Task 8: Build retrieval and memory compaction

**Files:**
- Create: `packages/db/src/schema/embeddings.ts`
- Create: `packages/db/src/schema/search-documents.ts`
- Create: `packages/db/src/schema/memory-summaries.ts`
- Create: `packages/db/src/schema/memory-summary-edges.ts`
- Create: `packages/db/src/schema/working-memory-items.ts`
- Create: `packages/db/src/schema/procedural-rules.ts`
- Create: `packages/retrieval/src/indexing/build-search-document.ts`
- Create: `packages/retrieval/src/hybrid/hybrid-search.ts`
- Create: `packages/retrieval/src/memory/summary-dag.ts`
- Create: `apps/api/src/modules/retrieval/retrieval.service.ts`
- Test: `packages/retrieval/src/hybrid/hybrid-search.spec.ts`
- Test: `packages/retrieval/src/memory/summary-dag.spec.ts`

- [ ] Build search documents from canonical entities, artifacts, and summaries.
- [ ] Add embeddings and FTS indices with rebuildable indexing jobs.
- [ ] Implement summary-backed long-horizon memory instead of relying on raw history only.
- [ ] Keep working memory, long-term memory, and procedural assistant-rule memory separate in storage and context assembly.
- [ ] Add a source-backed answer context builder that favors recent and relevant grounded material.
- [ ] Verify follow-up questions can be answered from saved memory/evidence without rerunning heavy research.

### Task 9: Implement research workflow profiles

**Files:**
- Create: `packages/db/src/schema/research-runs.ts`
- Create: `packages/db/src/schema/research-steps.ts`
- Create: `packages/db/src/schema/research-evidence-items.ts`
- Create: `packages/db/src/schema/research-evidence-links.ts`
- Create: `packages/db/src/schema/research-briefs.ts`
- Create: `packages/db/src/schema/workflow-runs.ts`
- Create: `packages/db/src/schema/workflow-steps.ts`
- Create: `packages/workflows/src/research/intent-parser.ts`
- Create: `packages/workflows/src/research/profile-registry.ts`
- Create: `packages/workflows/src/research/profiles/topic-brief.workflow.ts`
- Create: `packages/workflows/src/research/profiles/company-prep.workflow.ts`
- Create: `packages/workflows/src/research/profiles/person-brief.workflow.ts`
- Create: `packages/workflows/src/research/profiles/tool-comparison.workflow.ts`
- Create: `packages/workflows/src/research/profiles/decision-support.workflow.ts`
- Create: `packages/workflows/src/research/profiles/how-to.workflow.ts`
- Create: `packages/workflows/src/research/profiles/breaking-update.workflow.ts`
- Create: `packages/workflows/src/research/profiles/product-watch.workflow.ts`
- Create: `packages/workflows/src/research/profiles/resource-summary.workflow.ts`
- Create: `packages/workflows/src/research/profiles/career-outreach.workflow.ts`
- Create: `apps/api/src/modules/research/research.controller.ts`
- Create: `apps/worker/src/jobs/run-research.job.ts`
- Test: `packages/workflows/src/research/profiles/topic-brief.workflow.spec.ts`
- Test: `apps/api/src/modules/research/research.controller.e2e-spec.ts`

- [ ] Add an explicit intent parse step before expensive retrieval that resolves subject, time horizon, query profile, expected outputs, and approval needs.
- [ ] Add an explicit workflow profile selection step before expensive retrieval.
- [ ] Model retrieval as `fetch -> enrich -> normalize -> date-filter -> score -> dedupe -> cross-link -> synthesize`.
- [ ] Persist evidence items and cross-source links for reuse.
- [ ] Produce research briefs that can spawn work items, reminders, watch items, or outreach preparation artifacts.
- [ ] Verify a follow-up question can read from prior `research_runs` first.

### Task 10: Build the integration substrate

**Files:**
- Create: `packages/db/src/schema/provider-definitions.ts`
- Create: `packages/db/src/schema/connections.ts`
- Create: `packages/db/src/schema/connection-tags.ts`
- Create: `packages/db/src/schema/oauth-sessions.ts`
- Create: `packages/db/src/schema/connection-credentials.ts`
- Create: `packages/db/src/schema/sync-cursors.ts`
- Create: `packages/db/src/schema/webhook-channels.ts`
- Create: `packages/db/src/schema/inbound-webhook-events.ts`
- Create: `packages/db/src/schema/external-object-refs.ts`
- Create: `packages/db/src/schema/action-requests.ts`
- Create: `packages/integrations/src/base/provider-adapter.ts`
- Create: `packages/integrations/src/base/sync-runner.ts`
- Test: `packages/integrations/src/base/sync-runner.spec.ts`
- Test: `packages/db/src/schema/__tests__/integration-schema.test.ts`

- [ ] Seed provider definitions for Gmail, Calendar, Contacts, browser extension, web push, and ntfy-like delivery.
- [ ] Create durable connection, connection-tag, OAuth, sync, webhook, and external-ref state.
- [ ] Expand `action_requests` into a durable approval lifecycle for risky writes.
- [ ] Ensure approval requests and degraded or reauth-needed connections can surface into `inbox_items` for human action.
- [ ] Ensure sync and webhook processing are replayable and idempotent.
- [ ] Verify reconnect and reauth flows do not require manual database intervention.

### Task 11: Ship contacts, Gmail, and Calendar read sync with identity resolution

**Files:**
- Create: `packages/integrations/src/google/people/people.adapter.ts`
- Create: `packages/integrations/src/google/people/people-sync.workflow.ts`
- Create: `packages/integrations/src/google/people/people-mappers.ts`
- Create: `apps/api/src/modules/identity/identity-resolution.service.ts`
- Create: `apps/api/src/modules/actors/actor-merge.service.ts`
- Create: `packages/integrations/src/google/gmail/gmail.adapter.ts`
- Create: `packages/integrations/src/google/gmail/gmail-sync.workflow.ts`
- Create: `packages/integrations/src/google/gmail/gmail-mappers.ts`
- Create: `packages/integrations/src/google/calendar/calendar.adapter.ts`
- Create: `packages/integrations/src/google/calendar/calendar-sync.workflow.ts`
- Create: `packages/integrations/src/google/calendar/calendar-mappers.ts`
- Create: `apps/worker/src/jobs/run-connection-sync.job.ts`
- Test: `packages/integrations/src/google/people/people-sync.workflow.spec.ts`
- Test: `apps/api/src/modules/identity/identity-resolution.service.spec.ts`
- Test: `packages/integrations/src/google/gmail/gmail-sync.workflow.spec.ts`
- Test: `packages/integrations/src/google/calendar/calendar-sync.workflow.spec.ts`

- [ ] Implement incremental People/Contacts sync keyed by sync tokens for identity enrichment and alias resolution.
- [ ] Implement incremental Gmail sync keyed by `historyId` and durable cursors.
- [ ] Implement bounded-window Calendar sync that preserves source metadata and participants.
- [ ] Map contacts, emails, threads, and events into `actors`, `resources`, `events`, `contexts`, and `external_object_refs` without making Google the canonical truth.
- [ ] Add explicit merge and conflict policy so imported contacts enrich internal actors without overwriting curated records blindly.
- [ ] Keep writes approval-gated and postpone automatic send/create operations until the approval layer is mature.
- [ ] Verify that synced Gmail and Calendar data improve `Today`, meeting prep, and waiting-on answers.

### Task 12: Build browser extension capture, offline replay, and notification endpoints

**Files:**
- Create: `apps/web/src/lib/offline/outbox.ts`
- Create: `apps/web/src/lib/offline/view-cache.ts`
- Create: `apps/web/src/lib/offline/replay.ts`
- Create: `apps/browser-extension/src/offline-queue.ts`
- Create: `apps/browser-extension/manifest.json`
- Create: `apps/browser-extension/src/background.ts`
- Create: `apps/browser-extension/src/content-script.ts`
- Create: `apps/browser-extension/src/popup.tsx`
- Create: `apps/api/src/modules/browser-extension/browser-extension.controller.ts`
- Create: `packages/db/src/schema/notification-endpoints.ts`
- Create: `packages/db/src/schema/notification-deliveries.ts`
- Create: `packages/integrations/src/notifications/web-push.adapter.ts`
- Create: `packages/integrations/src/notifications/ntfy.adapter.ts`
- Test: `apps/browser-extension/src/__tests__/capture.spec.ts`
- Test: `packages/integrations/src/notifications/web-push.adapter.spec.ts`

- [ ] Support one-click page capture with title, URL, selection, and screenshot metadata.
- [ ] Queue captures and approval responses locally when offline, then replay them idempotently on reconnect.
- [ ] Register notification endpoints per device or channel.
- [ ] Deliver reminder and approval prompts across in-app, web push, and optional ntfy-style endpoints.
- [ ] Keep delivery state separate from reminder state.
- [ ] Verify a browser-saved page becomes a resource and a notification can drive the user back into the right object.

### Task 13: Expose the backend through OpenClaw

**Files:**
- Create: `packages/db/src/schema/assistant-sessions.ts`
- Create: `packages/db/src/schema/channel-bindings.ts`
- Create: `apps/openclaw-plugin/src/context-engine.ts`
- Create: `apps/openclaw-plugin/src/memory-slot.ts`
- Create: `apps/openclaw-plugin/src/index.ts`
- Create: `apps/openclaw-plugin/src/tools/capture-input.ts`
- Create: `apps/openclaw-plugin/src/tools/get-today-plan.ts`
- Create: `apps/openclaw-plugin/src/tools/search-memory.ts`
- Create: `apps/openclaw-plugin/src/tools/create-work-item.ts`
- Create: `apps/openclaw-plugin/src/tools/set-reminder.ts`
- Create: `apps/openclaw-plugin/src/tools/run-research.ts`
- Create: `apps/openclaw-plugin/src/tools/approve-action.ts`
- Create: `apps/openclaw-plugin/src/session-binding.ts`
- Create: `apps/openclaw-plugin/skills/assistant-runtime/SKILL.md`
- Test: `apps/openclaw-plugin/src/index.spec.ts`

- [ ] Bind OpenClaw sessions/channels to our assistant sessions and users.
- [ ] Expose only typed backend tools, not direct DB or ad hoc workflow access.
- [ ] Provide a custom context-engine path that assembles backend-built working, procedural, and evidence context instead of relying only on default markdown memory.
- [ ] Provide a memory-slot bridge so OpenClaw memory access can pull promoted objects and summaries from our backend retrieval layer.
- [ ] Keep OpenClaw conversation state secondary to our backend runtime state.
- [ ] Deliver reminders and approvals through OpenClaw where configured.
- [ ] Verify the same task/reminder/research state is visible in both web UI and OpenClaw chat.

### Task 14: Build opt-in telemetry and passive context ingestion

**Files:**
- Create: `packages/db/src/schema/telemetry-buckets.ts`
- Create: `packages/db/src/schema/telemetry-events.ts`
- Create: `apps/api/src/modules/telemetry/telemetry.controller.ts`
- Create: `apps/api/src/modules/telemetry/telemetry-policy.service.ts`
- Create: `apps/worker/src/jobs/compact-telemetry.job.ts`
- Create: `apps/browser-extension/src/activity-sensor.ts`
- Test: `apps/api/src/modules/telemetry/telemetry.controller.spec.ts`
- Test: `apps/worker/src/jobs/compact-telemetry.job.spec.ts`

- [ ] Store passive telemetry only after explicit opt-in and keep it isolated from canonical entities.
- [ ] Compact repeated activity signals into intervals instead of flooding the database.
- [ ] Expose telemetry only to planning and review features that can explain why it matters.
- [ ] Provide user-visible controls for pausing, clearing, and scoping telemetry capture.
- [ ] Verify telemetry can improve review and planning context without polluting search and memory retrieval.

### Task 15: Build daily and weekly review loops

**Files:**
- Create: `packages/workflows/src/reviews/daily-review.workflow.ts`
- Create: `packages/workflows/src/reviews/weekly-review.workflow.ts`
- Create: `apps/api/src/modules/reviews/reviews.controller.ts`
- Create: `apps/api/src/modules/reviews/reviews.service.ts`
- Create: `apps/web/src/app/reviews/page.tsx`
- Test: `packages/workflows/src/reviews/daily-review.workflow.spec.ts`
- Test: `packages/workflows/src/reviews/weekly-review.workflow.spec.ts`

- [ ] Summarize wins, stale contexts, incomplete work, repeated snoozes, and neglected goals/areas.
- [ ] Reuse entity events, reminders, plans, and research artifacts rather than inventing a separate analytics store.
- [ ] Surface suggestions without mutating canonical state automatically.
- [ ] Allow the user to convert review suggestions into work items, reminders, or rules.
- [ ] Verify weekly review output reflects real event history rather than raw counts only.

## 11. API Surface for v1

### Capture and ingestion

- `POST /captures`
- `GET /captures/:id`
- `POST /resources/import-url`
- `POST /resources/import-file`

### Entity and work surfaces

- `GET /inbox`
- `GET /today`
- `GET /waiting`
- `GET /entities/:id`
- `PATCH /entities/:id`
- `POST /work-items`
- `POST /reminders`
- `POST /action-requests/:id/approve`
- `POST /action-requests/:id/reject`

### Retrieval and research

- `POST /search`
- `POST /answers`
- `POST /research-runs`
- `GET /research-runs/:id`
- `POST /research-runs/:id/follow-up`

### Integrations

- `GET /providers`
- `POST /connections`
- `POST /connections/:id/oauth/start`
- `POST /connections/:id/sync`
- `GET /actors/merge-candidates`
- `POST /actors/:id/merge`
- `POST /webhooks/:provider`
- `POST /notification-endpoints`
- `POST /telemetry/events`

## 12. Frontend Screens for v1

### Must-have

- `Inbox`
- `Today`
- `Entity detail`
- `Resource detail`
- `Research detail`
- `People`
- `Connections`
- `Notifications`
- `Reviews`
- `Offline sync status`

### Secondary but likely early

- `Contexts`
- `Search`
- `Rules`
- `Telemetry controls`

### UI rules

- every promoted object must show source provenance
- every reminder must show target object and history
- every research brief must show evidence and cross-links
- every risky write must show an approval record

## 13. Integration Policy

### Read first, write later

Start with these automatic reads:

- Gmail thread/message metadata and normalized bodies
- Calendar events and participants
- People/Contacts records for identity enrichment
- browser captures
- web push registration

Delay these writes until the approval system is mature:

- sending emails
- creating or editing external calendar events
- browser automation that clicks or submits on behalf of the user

### Approval policy

Use `action_requests` for:

- any external write
- any side effect the user would reasonably consider consequential
- any action based on uncertain extraction or uncertain identity resolution

### Identity policy

- external systems do not define canonical identity
- merge external references into `actors` and other entities through resolvers and explicit links
- preserve the original external IDs in `external_object_refs`

## 14. Risks and Mitigations

### Risk: over-modeling too early

Mitigation:

- keep root ontology small
- use subtypes and views for narrower concepts
- keep tags weak and topical only

### Risk: under-modeling work state

Mitigation:

- keep `work_items`, `reminders`, and planning projections explicit
- do not reduce operational items to notes with flags

### Risk: retrieval drift and hallucinated follow-ups

Mitigation:

- preserve artifacts and snapshots
- build source-backed answer context
- reuse prior research evidence bundles

### Risk: losing user trust on writes

Mitigation:

- require durable approvals
- show provenance and action logs
- start read-heavy and approval-heavy

### Risk: OpenClaw becomes a separate shadow system

Mitigation:

- route all meaningful actions through our backend APIs
- store session/channel binding metadata only, not canonical product truth

## 15. Immediate Execution Recommendation

### Recommended first 9 weeks

#### Week 1

- monorepo scaffold
- local infrastructure
- core migrations
- entity kind and subtype registry
- client-local outbox/cache decisions

#### Week 2

- raw capture API
- capture sessions and events
- inbox items
- basic web capture UI

#### Week 3

- deterministic extraction
- candidate entities
- promotion service
- entity detail view with provenance

#### Week 4

- work items
- reminders
- Today and Waiting projections
- notification endpoint registration

#### Week 5

- resources
- snapshots and artifacts
- indexing jobs
- search and source-backed answer assembly
- procedural memory separation

#### Week 6

- research runs
- full initial research profile set
- intent parser
- evidence reuse

#### Week 7

- contacts sync
- identity resolution and merge review
- Gmail read sync
- Calendar read sync

#### Week 8

- browser extension capture
- offline replay for web/PWA and extension
- OpenClaw plugin scaffold
- OpenClaw context engine and memory-slot bridge

#### Week 9

- opt-in telemetry ingestion
- review loops
- planning improvements from external and passive context

### Remaining true v1 boundaries

- no full collaborative or CRDT-style local-first sync across devices
- no aggressive autonomous browser automation without approvals
- no native mobile app before web/PWA and extension quality is strong
- no local model routing as a required capability for the first release

## 16. Concrete Starting Point

Start with the thinnest vertical slice that proves the product thesis:

1. user pastes a messy note page
2. raw capture is stored
3. capture is segmented and candidate work/resource/rule items are extracted
4. one work item is promoted into canonical state
5. one reminder is scheduled and delivered
6. `Today` shows the item with provenance back to the raw capture
7. OpenClaw can ask for `Today` and receive the same state

If this slice feels trustworthy, the rest of the product is worth building. If it does not, more integrations will not save it.

## 17. Follow-on Plan Set

This master plan should be followed by narrower implementation plans for:

- `capture-and-promotion-v1`
- `work-items-reminders-and-today`
- `resources-and-retrieval`
- `research-workflows-v1`
- `identity-gmail-calendar-and-people`
- `browser-extension-offline-and-notifications`
- `openclaw-runtime-and-memory-bridge`
- `telemetry-and-review-loops`

Those follow-on plans should use the file layout defined here and break each stream into TDD-sized execution tasks.
