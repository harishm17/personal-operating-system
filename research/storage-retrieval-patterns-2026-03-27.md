# Storage and Retrieval Patterns

Last updated: 2026-03-27

This memo focuses on one question:

How should our product store, retrieve, and manage assistant state if we want it to feel like a personal assistant plus second brain, not just a notes app with AI glued on top?

This round is based on code reads across:

- `khoj`
- `memos`
- `anytype-ts`
- `AFFiNE`
- `AppFlowy`
- `logseq`
- `monica`
- `karakeep`
- `linkwarden`
- `paperless-ngx`
- `activitywatch`
- `openrecall`
- `lightrag`
- `ragflow`

## Big conclusion

The best repos do not use one giant storage model.

They split the system into separate layers:

1. canonical objects
2. raw or preserved artifacts
3. derived retrieval/search state
4. temporal/event history
5. assistant/runtime state

That is the single most important storage lesson for our product.

If we collapse all of this into one `notes` table or one `entities` table, downstream behavior gets brittle fast.

## Repo-by-repo findings

### 1. Khoj: explicit recent memory plus long-term memory

High-signal files:

- `research/repos/khoj/src/khoj/database/models/__init__.py`
- `research/repos/khoj/src/khoj/database/adapters/__init__.py`
- `research/repos/khoj/src/khoj/routers/api_memories.py`

What it does well:

- `UserMemory` is a separate table from conversations.
- Each memory stores `user`, optional `agent`, `embeddings`, `raw`, and `search_model`.
- Retrieval is intentionally split:
  - `pull_memories(...)` for recent medium-term memory
  - `search_memories(...)` for long-term semantic retrieval

Ideas to borrow:

- Do not treat memory as just old chat messages.
- Store assistant memory as explicit records.
- Separate "recent recall" from "semantic recall".
- Scope memory by `user` and optionally by `assistant/persona/workflow`.

What this means for us:

- We should keep `working_memory_items` and `memory_items` separate.
- Our context builder should always combine:
  - recent relevant memory
  - long-term semantically retrieved memory

### 2. Memos: small central memo object, attachments as a separate storage system

High-signal files:

- `research/repos/memos/store/memo.go`
- `research/repos/memos/store/attachment.go`
- `research/repos/memos/store/db/postgres/memo.go`

What it does well:

- `Memo` stays small: content, visibility, pinned, payload, parent UID.
- Attachments are first-class and separate from memo rows.
- Attachments support:
  - `storage_type`
  - `reference`
  - `payload`
  - optional blob access
- Attachment reads apply default limits to avoid expensive blob loads.
- Deleting an attachment also cleans up the backing local file or S3 object.

Ideas to borrow:

- Keep the central capture object small.
- Never mix large binary state directly into the canonical object table.
- Use a generic attachment shape:
  - `storage_type`
  - `reference`
  - `payload_json`
- Default limits should protect blob-heavy reads.

What this means for us:

- `attachments` and `resource_artifacts` should use a storage-reference pattern, not inline blobs.
- Every attachment read path should be explicit about whether raw bytes are requested.

### 3. Anytype: typed block model plus scoped storage

High-signal files:

- `research/repos/anytype-ts/docs/src/ts/model/README.md`
- `research/repos/anytype-ts/src/ts/lib/storage.ts`

What it does well:

- The UI model is built from typed blocks, not generic text documents.
- Storage is partitioned by:
  - account-level keys
  - space-level keys
  - local-only keys
- UI/session preferences are clearly separated from content models.

Ideas to borrow:

- Scope matters. Not all state belongs in the same store.
- Separate:
  - account/user state
  - workspace/project state
  - local UI cache state

What this means for us:

- Our backend should separate durable content from local UI/session state.
- We should not store view preferences and canonical brain objects in the same shape.

### 4. AFFiNE: canonical docs, snapshots, updates, chat sessions, and embeddings are all separate

High-signal files:

- `research/repos/AFFiNE/packages/backend/server/schema.prisma`

What it does well:

- Workspace/page metadata is separate from actual document snapshots.
- Document state is split into:
  - `Snapshot`
  - `Update`
  - `SnapshotHistory`
- AI runtime state is separate from docs:
  - `AiSession`
  - `AiSessionMessage`
  - `AiContext`
- Embeddings are separate tables:
  - `AiContextEmbedding`
  - `AiWorkspaceEmbedding`

Ideas to borrow:

- Do not mix canonical content, chat state, and embeddings.
- Keep a durable history/snapshot concept for major preserved objects.
- Make embeddings rebuildable and disposable.

What this means for us:

- `resource_snapshots` and `resource_artifacts` should be distinct from canonical `resources`.
- `assistant_sessions` should be separate from our long-term memory tables.
- Embeddings should be stored in dedicated tables that can be rebuilt from source records.

### 5. AppFlowy: local-first search with handler fanout

High-signal files:

- `research/repos/AppFlowy/frontend/rust-lib/flowy-search/src/services/manager.rs`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-search/src/document/local_search_handler.rs`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-sqlite/migrations/2025-05-06-131915_chat_summary/up.sql`

What it does well:

- `SearchManager` fans out to multiple handlers instead of hardcoding one search backend.
- Local and cloud search are distinct handlers.
- Search results are streamed back incrementally.
- Local search is backed by Tantivy state, not the same tables as the core object store.
- Chat summaries are stored explicitly in SQLite.

Ideas to borrow:

- Search should be handler-based and pluggable.
- Local-first search and cloud-assisted search can coexist.
- Summaries should be stored explicitly, not recomputed ad hoc.

What this means for us:

- We should keep our search layer behind an interface.
- V1 can use Postgres FTS + pgvector, but the API should not assume those forever.
- Summary tables are worth storing explicitly for reuse.

### 6. Logseq: in-memory graph, persistent DB, sync protocol, and worker-based sync are distinct

High-signal files:

- `research/repos/logseq/src/main/frontend/persist_db/README.md`
- `research/repos/logseq/src/main/frontend/db/persist.cljs`
- `research/repos/logseq/docs/adr/0001-nodejs-db-sync-server-adapter.md`
- `research/repos/logseq/docs/adr/0004-sync-tx-entry-outliner-op.md`

What it does well:

- Distinguishes in-memory DB from persistent DB.
- Sync is treated as a protocol/runtime concern, not a side effect hidden in the UI.
- The system is explicit about portability and pluggable server adapters.
- Sync persistence and debugability matter enough to get ADRs and test infrastructure.

Ideas to borrow:

- Separate local state, persistent state, and sync transport.
- If we add sync or multi-device support later, make it protocol-driven and testable.

What this means for us:

- Our v1 monolith should still keep sync/local cache concerns out of canonical tables.
- Any future real-time sync needs an event log and replay/debug story.

### 7. Monica: people memory is not task memory

High-signal files:

- `research/repos/monica/database/migrations/2022_02_18_215852_create_reminders_table.php`
- `research/repos/monica/database/migrations/2022_05_13_201216_create_contact_tasks_table.php`
- `research/repos/monica/database/migrations/2022_06_02_011219_create_goals_table.php`
- `research/repos/monica/app/Models/Note.php`

What it does well:

- Treats people and relationship memory as the center.
- Keeps separate tables for:
  - `contact_reminders`
  - `user_notification_channels`
  - `contact_reminder_scheduled`
  - `contact_tasks`
  - `goals`
  - `streaks`
- Notes are searchable, but they also belong in a feed/activity model.

Ideas to borrow:

- Reminders should not be just task due dates.
- People-related commitments need their own structures.
- Goals and streaks benefit from their own temporal models.

What this means for us:

- `people`, `contact_points`, `contact_tasks`, and `waiting_on` logic should stay separate from generic tasks.
- Reminder scheduling should support channels and delivery history.

### 8. Karakeep: canonical bookmark object + enrichment statuses + assets + pluggable search

High-signal files:

- `research/repos/karakeep/packages/db/schema.ts`
- `research/repos/karakeep/packages/trpc/lib/search.ts`
- `research/repos/karakeep/packages/plugins/search-meilisearch/src/index.ts`

What it does well:

- Keeps a small canonical `bookmarks` table with enrichment state:
  - `taggingStatus`
  - `summarizationStatus`
  - `summary`
  - `note`
- Stores link-specific crawled metadata in `bookmarkLinks`.
- Stores binary and preserved artifacts in `assets`.
- Tracks reading progress and highlights separately.
- Supports search as a plugin, with Meilisearch batching and queueing.
- Search parsing stays in app logic, not only in the external search engine.

Ideas to borrow:

- Canonical objects should have explicit enrichment status fields.
- Raw content and preserved files belong in artifact tables.
- Search engine integration should be pluggable.
- Query language belongs at the application layer.

What this means for us:

- Our `resources` should track extraction/summarization/indexing status.
- Search indexing jobs should be batched and asynchronous.
- Our advanced search parser can live in app code even if the index backend changes.

### 9. Linkwarden: preservation worker pipeline and multiple derived formats

High-signal files:

- `research/repos/linkwarden/packages/prisma/schema.prisma`
- `research/repos/linkwarden/apps/worker/lib/archiveHandler.ts`
- `research/repos/linkwarden/apps/worker/lib/preservationScheme/handleReadability.ts`
- `research/repos/linkwarden/apps/worker/workers/linkProcessing.ts`

What it does well:

- The main `Link` record stores pointers to multiple derived formats:
  - `preview`
  - `image`
  - `pdf`
  - `readable`
  - `monolith`
  - `textContent`
- Preservation is worker-driven, not done inline in the user request path.
- The worker pipeline does:
  - fetch
  - browser render
  - preview
  - readability extraction
  - screenshot/pdf
  - monolith archive
  - optional AI tagging
- When preservation reruns, it invalidates index state via `indexVersion`.

Ideas to borrow:

- A single resource may have multiple useful artifact formats.
- Derived artifact generation should be a worker responsibility.
- Re-indexing needs invalidation/versioning.

What this means for us:

- `resource_snapshots` should support multiple artifacts per snapshot.
- Index/version invalidation should be explicit when artifacts change.
- We should preserve both source and cleaned/derived representations.

### 10. Paperless-ngx: ingestion as a plugin pipeline with workflows, rules, and async tasks

High-signal files:

- `research/repos/paperless-ngx/src/documents/models.py`
- `research/repos/paperless-ngx/src/documents/consumer.py`
- `research/repos/paperless-ngx/src/documents/tasks.py`

What it does well:

- `Document` stores `content` as search-oriented text, but keeps other metadata fields explicit.
- Matching and classification models are separate:
  - `Correspondent`
  - `Tag`
  - `DocumentType`
  - `StoragePath`
- Consumption is a plugin pipeline with workflow triggers and metadata overrides.
- Background tasks handle indexing, classifier training, and ingestion.

Ideas to borrow:

- Ingestion should be a staged pipeline, not one big "import" function.
- Rules and workflows should be able to modify metadata during ingestion.
- Search text should be derived and stored, not the only source of truth.

What this means for us:

- Our capture pipeline should be plugin-like:
  - preflight
  - extraction
  - rule application
  - persistence
  - indexing
- We should preserve raw inputs while still storing derived searchable text.

### 11. ActivityWatch: optional passive context should be time-series, not notes

High-signal files:

- `research/repos/activitywatch/README.md`
- `research/repos/activitywatch/aw-core/aw_core/models.py`
- `research/repos/activitywatch/aw-core/aw_datastore/storages/sqlite.py`
- `research/repos/activitywatch/aw-server/aw_server/api.py`

What it does well:

- Uses a clean `bucket` + `event` model for passive data.
- Watchers send heartbeats that get merged into longer events when appropriate.
- Storage is time-series-oriented and queryable.
- Querying is a separate subsystem with transforms over events.

Ideas to borrow:

- Passive telemetry needs its own model.
- Repeated state updates should merge into intervals, not flood the DB.
- Querying event streams should be separate from task/note retrieval.

What this means for us:

- If we support passive context later, add optional:
  - `telemetry_buckets`
  - `telemetry_events`
- Do not dump passive signals into notes or generic entities.

### 12. OpenRecall: simplest possible local screenshot memory

High-signal files:

- `research/repos/openrecall/openrecall/database.py`
- `research/repos/openrecall/openrecall/ocr.py`

What it does well:

- Very simple local model:
  - SQLite row per entry
  - OCR text
  - timestamp
  - app/window title
  - embedding blob
- The design is minimal and understandable.

Ideas to borrow:

- Keep the MVP storage story understandable.
- Some memory features can start simple before needing a full graph.

What this means for us:

- For private/local assistant workflows, a lightweight append-only capture log is still valuable.
- Not every component needs a huge system on day one.

### 13. LightRAG: workspace isolation and storage concurrency matter

High-signal files:

- `research/repos/lightrag/lightrag/kg/shared_storage.py`
- `research/repos/lightrag/lightrag/kg/nano_vector_db_impl.py`

What it does well:

- Namespaces storage by workspace.
- Treats cross-process concurrency as a real storage problem.
- Keeps backend choice flexible.

Ideas to borrow:

- Workspace/user scoping should be explicit in retrieval storage.
- Locks and concurrency are not optional if indexing can happen in parallel.

What this means for us:

- All retrieval tables and jobs should be scoped clearly by workspace and user.
- Indexing workers need idempotency and concurrency protection.

### 14. RAGFlow: memory types and storage backends are explicit product concepts

High-signal files:

- `research/repos/ragflow/internal/storage/storage_factory.go`
- `research/repos/ragflow/docs/guides/memory/use_memory.md`

What it does well:

- Treats storage backend selection as a real factory boundary.
- Treats memory as a product concept with multiple types:
  - raw
  - semantic
  - episodic
  - procedural
- Lets retrieval and memory participate as explicit agent components.

Ideas to borrow:

- Different memory types should remain distinct.
- Storage backend selection should sit behind a clean boundary.

What this means for us:

- We should store memory type explicitly.
- Our agent/runtime layer should read from memory via dedicated components/workflows, not directly from random tables.

## Cross-repo patterns

### Pattern 1: canonical objects and search indexes are different systems

Seen in:

- AFFiNE
- Khoj
- AppFlowy
- Karakeep
- Linkwarden

Recommendation:

- Keep canonical objects in Postgres.
- Keep embeddings in dedicated tables.
- Treat full-text/vector indexes as rebuildable derived state.

### Pattern 2: preserved artifacts need their own lifecycle

Seen in:

- Linkwarden
- Karakeep
- Paperless-ngx
- Memos

Recommendation:

- Use DB rows for metadata and object storage/local files for bytes.
- Support multiple artifact kinds per source:
  - original
  - cleaned text
  - screenshot
  - PDF
  - readability JSON
  - OCR text

### Pattern 3: ingestion is a worker pipeline, not a request handler

Seen in:

- Paperless-ngx
- Linkwarden
- Karakeep

Recommendation:

- User-facing capture endpoints should enqueue work.
- Workers should do crawling, OCR, extraction, summarization, indexing, and preservation.

### Pattern 4: event streams need separate storage

Seen in:

- ActivityWatch
- Monica
- Logseq sync

Recommendation:

- Keep append-only event history.
- Optionally add passive telemetry buckets/events later.
- Do not overload note/task tables with timeline data.

### Pattern 5: assistant/runtime state is separate from product truth

Seen in:

- AFFiNE
- RAGFlow
- Khoj

Recommendation:

- Keep `assistant_sessions`, `workflow_runs`, `research_runs`, and `action_requests` separate from canonical entities.
- Chat sessions are not the same as memory.

## What this changes in our design

### 1. We should use five storage layers

1. `canonical objects`
   - `entities`
   - `tasks`
   - `projects`
   - `reminders`
   - `people`
   - `resources`

2. `artifact layer`
   - `attachments`
   - `resource_snapshots`
   - `resource_artifacts`

3. `retrieval layer`
   - `embeddings`
   - FTS indexes / materialized search docs
   - optional later external search backend

4. `temporal layer`
   - `entity_events`
   - optional later `telemetry_buckets` and `telemetry_events`

5. `assistant/runtime layer`
   - `assistant_sessions`
   - `action_requests`
   - `research_runs`
   - `research_steps`
   - `memory_items`
   - `memory_summaries`

### 2. `storage_type + reference + payload_json` should be a default pattern

Borrowed most strongly from:

- Memos
- Linkwarden
- Karakeep

Use this anywhere bytes may live outside the DB.

### 3. Search should be pluggable, but v1 should stay simple

Borrowed most strongly from:

- AppFlowy
- Karakeep
- Linkwarden

Recommendation:

- v1: Postgres FTS + `pgvector`
- later: optional Meilisearch/Tantivy/OpenSearch adapter if scale or ranking needs demand it

### 4. Reminder and people logic should not be buried under generic tasks

Borrowed most strongly from:

- Monica

Recommendation:

- keep relationship-oriented reminders and commitments explicit
- keep notification channels and delivery history explicit

### 5. Research/evidence artifacts should be durable

Borrowed most strongly from:

- Linkwarden
- Paperless-ngx
- AFFiNE

Recommendation:

- store preserved artifacts and normalized evidence
- let follow-up questions reuse them
- invalidate or rebuild indexes when artifacts change

## Concrete recommendation for our schema

### Keep

- `captures`
- `capture_events`
- `attachments`
- `inbox_items`
- `entities`
- `entity_relations`
- `entity_events`
- `tasks`
- `projects`
- `reminders`
- `people`
- `resources`
- `resource_snapshots`
- `resource_artifacts`
- `research_runs`
- `research_steps`
- `research_evidence_items`
- `assistant_sessions`
- `action_requests`
- `memory_items`
- `memory_summaries`
- `working_memory_items`
- `embeddings`

### Add or tighten

- Add `storage_type`, `storage_ref`, and `payload_json` to artifact-like tables.
- Add `content_hash` and `index_version` where re-indexing matters.
- Add explicit status fields for ingestion/enrichment/indexing.
- Add optional `scope_type` and `scope_ref` to memory records if per-project/per-agent memory becomes important.

### Keep optional for later

- `telemetry_buckets`
- `telemetry_events`
- external search backend
- passive screenshot recall

## Final recommendation

The strongest storage design for our product is:

- Postgres as canonical system of record
- object storage for artifacts
- `pgvector` + FTS as first retrieval layer
- worker-driven ingestion and preservation
- explicit runtime state for assistant workflows
- explicit separation between memory, artifacts, objects, and events

That is the most consistent pattern across the best repos we inspected.
