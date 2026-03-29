# Repo Code Patterns And Concrete Product Decisions

Last updated: 2026-03-27

## Purpose

This document moves the research from "feature inspiration" to "code-backed design decisions."

The goal is to answer:

- what the strongest open-source repos are actually doing in code
- which implementation patterns are worth copying
- which patterns we should explicitly avoid
- how those findings change our application plan

## Repos And Files Inspected

### OpenClaw core

- `repos/openclaw/extensions/memory-core/src/memory/hybrid.ts`
- `repos/openclaw/extensions/memory-core/src/tools.ts`
- `repos/openclaw/extensions/memory-core/src/memory/search-manager.ts`
- `repos/openclaw/extensions/memory-core/src/prompt-section.ts`
- `repos/openclaw/extensions/telegram/src/bot-message-context.ts`
- `repos/openclaw/docs/plugins/sdk-entrypoints.md`

### Lossless Claw

- `repos/lossless-claw/src/store/conversation-store.ts`
- `repos/lossless-claw/src/store/summary-store.ts`
- `repos/lossless-claw/src/compaction.ts`
- `repos/lossless-claw/src/retrieval.ts`
- `repos/lossless-claw/src/plugin/index.ts`

### OpenClaw ecosystem integrations

- `repos/openclaw-codex-app-server/index.ts`
- `repos/openclaw-codex-app-server/src/state.ts`
- `repos/openclaw-crm/apps/web/src/services/ai-chat.ts`
- `repos/openclaw-crm/apps/web/src/app/api/v1/chat/tool-confirm/route.ts`

### Capture / notes / planning / research

- `repos/memos/store/memo.go`
- `repos/memos/store/memo_relation.go`
- `repos/memos/store/inbox.go`
- `repos/super-productivity/src/app/features/tasks/task.model.ts`
- `repos/super-productivity/src/app/features/planner/planner.service.ts`
- `repos/super-productivity/src/app/features/reminder/reminder.service.ts`
- `repos/khoj/src/khoj/routers/research.py`
- `repos/khoj/src/khoj/database/adapters/__init__.py`

### Resource preservation

- `repos/linkwarden/packages/prisma/schema.prisma`
- `repos/linkwarden/apps/worker/workers/linkProcessing.ts`
- `repos/linkwarden/apps/worker/lib/archiveHandler.ts`
- `repos/linkwarden/apps/worker/lib/preservationScheme/handleReadability.ts`
- `repos/linkwarden/apps/worker/lib/preservationScheme/handleScreenshotAndPdf.ts`
- `repos/linkwarden/apps/worker/workers/linkIndexing.ts`

## Highest-Signal Code Findings

## 1. OpenClaw already treats memory as tools, not magic

### What the code does

`extensions/memory-core/src/tools.ts` exposes `memory_search` and `memory_get` as explicit tools. The tool description makes recall a required step before answering questions about prior work, preferences, dates, people, and todos.

`extensions/memory-core/src/memory/hybrid.ts` merges keyword and vector search results, then applies:

- weighted score fusion
- temporal decay
- optional MMR reranking

That is a much better memory retrieval pattern than "vector search only."

`extensions/telegram/src/bot-message-context.ts` shows that channel context is not trivial. The code resolves:

- account-aware conversation routes
- DM vs group policies
- per-thread session keys
- allowlist checks
- configured binding readiness

### What we should borrow

- Retrieval should be toolized and inspectable.
- Memory answers should be grounded in explicit snippets with provenance.
- Session routing should be first-class, especially for chat surfaces.
- Hybrid retrieval should include recency-aware reranking.

### What we should not copy directly

- We should not use OpenClaw file memory as the canonical product database.
- We should not depend on a single memory backend shape defined by OpenClaw plugins.

### Concrete product implication

Our backend should own memory and expose it to OpenClaw through tools like:

- `search_memory`
- `get_origin`
- `expand_context`
- `list_related_items`

OpenClaw should remain the shell, not the brain.

## 2. Lossless Claw has the best memory architecture we found

### What the code does

`conversation-store.ts` stores:

- conversations
- raw messages
- message parts

The message-part model is especially important because it preserves structure like:

- text
- tool calls
- tool outputs
- snapshots
- compaction artifacts

`summary-store.ts` separately stores:

- summaries
- context items
- large file records
- bootstrap state

`compaction.ts` does not just "summarize old messages." It keeps a protected fresh tail and compacts older material into a summary tree using:

- token threshold checks
- leaf chunking
- condensed multi-level summaries
- explicit fanout thresholds
- lineage metadata like descendant counts and time ranges

### What we should borrow

- Preserve raw capture separately from compacted memory.
- Store message parts, not just flattened text blobs.
- Build a summary DAG for long-lived conversations and capture logs.
- Keep recent context raw and only compact older content.
- Support expandable retrieval over summarized history.

### What we should not copy directly

- We do not need Lossless Claw's exact SQLite shape or OpenClaw-specific plugin format.
- We should not overfit our entire product to conversation history only.

### Concrete product implication

Our app should have a memory subsystem with:

- `capture_events`
- `capture_parts`
- `memory_summaries`
- `memory_summary_edges`
- `memory_context_items`

That gives us better long-lived recall than a pure embeddings table.

## 3. OpenClaw bridge repos confirm the right integration shape

### What the code does

`openclaw-codex-app-server/src/state.ts` keeps explicit local state for:

- channel conversation bindings
- pending requests
- callback actions
- TTL-backed interaction tokens
- conversation preferences

This is a strong pattern for any assistant shell that needs to coordinate with a separate backend or runtime.

### What we should borrow

- Channel bindings must be explicit.
- Interactive callbacks need durable state and expiration.
- The assistant surface should be able to resume, rebind, approve, and continue.

### Concrete product implication

We should add backend-owned tables for:

- `assistant_sessions`
- `channel_bindings`
- `action_requests`
- `pending_callbacks`

The OpenClaw plugin can stay thin if these capabilities already exist in our API.

## 4. OpenClaw CRM gets write approvals right

### What the code does

`openclaw-crm/apps/web/src/services/ai-chat.ts` builds prompts and tools from actual backend metadata rather than hardcoding everything in the assistant.

`openclaw-crm/apps/web/src/app/api/v1/chat/tool-confirm/route.ts` stores pending tool calls, waits for approval, executes only after user confirmation, appends the tool result as a message, and then resumes the assistant stream.

### What we should borrow

- Write actions should be modeled as pending requests, not ad hoc chat state.
- Tool approval should be resumable.
- The backend should generate tool schemas from the current domain model where possible.

### What we should not copy directly

- The CRM repo leans heavily on a generic EAV/object-attribute model.
- That is too abstract for our v1. We need explicit core tables for tasks, reminders, projects, resources, people, and captures.

### Concrete product implication

For any external or sensitive write we should create an `action_request` row first:

- tool name
- normalized arguments
- requested action target
- approval status
- resolution details
- resulting entity or external reference

This should back both web UI approvals and OpenClaw chat approvals.

## 5. Memos proves low-friction capture should stay tiny

### What the code does

`memos/store/memo.go` keeps the core memo object small:

- content
- payload
- visibility
- optional parent

`memos/store/memo_relation.go` and `memos/store/inbox.go` keep relations and inbox state separate from the memo itself.

### What we should borrow

- Keep capture objects lightweight.
- Keep inbox/review state explicit.
- Keep relations simple and composable.

### What we should not copy directly

- Memos is intentionally light on downstream automation, reminders, and planning.
- We need a richer operational layer than Memos does.

### Concrete product implication

Our `Capture` model should stay compact. It should not be overloaded with every downstream field.

We should also create a first-class `inbox_items` table rather than making inbox a saved filter over everything.

## 6. Super Productivity has the best task-time semantics

### What the code does

`task.model.ts` clearly separates:

- day-level scheduling: `dueDay`
- exact-time scheduling: `dueWithTime`
- day-level deadlines: `deadlineDay`
- exact-time deadlines: `deadlineWithTime`

It also treats these pairs as mutually exclusive.

`reminder.service.ts` runs reminders through a dedicated worker and maps reminder activation back into UI state. It also handles migration and deadline reminders explicitly.

`planner.service.ts` does not persist a giant planner table. It derives planner days from:

- tasks
- repeat configs
- calendar data
- today's list

### What we should borrow

- Separate day-level scheduling from timestamp scheduling.
- Reminder execution should live in a background engine.
- Planning views should be derived, not treated as the source of truth.

### What we should not copy directly

- We do not need Super Productivity's exact Angular/ngrx structure.
- We should avoid inheriting its broader app surface area.

### Concrete product implication

Our `tasks` table should distinguish:

- `scheduled_day`
- `scheduled_at`
- `deadline_day`
- `deadline_at`

Our reminder system should be worker-driven, and `Today` should be a projection over tasks, reminders, and calendar context.

## 7. Khoj is useful for research orchestration, not for memory shape

### What the code does

`khoj/routers/research.py` runs iterative research with a loop over structured tool calls like:

- search documents
- search online
- read webpages
- run code
- list files
- view files
- regex search
- MCP tool calls

It also stores and emits status messages per iteration, not just a final answer.

`database/adapters/__init__.py` shows a much simpler memory model centered on `UserMemory` plus embeddings-based cosine search.

### What we should borrow

- Research should be durable and step-based.
- Research runs should keep intermediate status and tool traces.
- Research should be able to combine internal sources, web sources, files, and code.

### What we should not copy directly

- Vectorized raw memory rows are not enough for our assistant.
- We should not collapse long-term memory into a single `raw + embedding` record type.

### Concrete product implication

We should add:

- `research_runs`
- `research_steps`
- `research_step_artifacts`
- `research_briefs`

Each run should preserve step logs and tool outputs, not just the final brief.

## 8. Linkwarden is the best reference for source preservation

### What the code does

`packages/prisma/schema.prisma` keeps multiple preserved representations directly on the `Link` model:

- `textContent`
- `preview`
- `image`
- `pdf`
- `readable`
- `monolith`
- `metaDescription`
- `lastPreserved`

`apps/worker/workers/linkProcessing.ts` runs a dedicated processing loop that batches and archives links continuously.

`apps/worker/lib/archiveHandler.ts`:

- validates server-side fetch safety
- chooses preservation formats from user/tag preferences
- loads the page in Playwright
- saves preview
- extracts readable text
- creates screenshot/PDF
- optionally creates a monolith archive
- updates DB fields per artifact

`handleReadability.ts` sanitizes HTML, runs Mozilla Readability, stores cleaned article JSON, and saves extracted text separately.

`handleScreenshotAndPdf.ts` performs autoscroll, then saves screenshot and PDF concurrently.

`linkIndexing.ts` shows preservation and indexing as separate workers.

### What we should borrow

- Preserve multiple source formats for the same resource.
- Separate preserved artifacts from extracted clean text.
- Keep preservation in a background worker.
- Run indexing separately from fetch/preservation.
- Treat safe server-side fetch as a first-class concern.

### What we should not copy directly

- We do not need to make every resource support every archival format in v1.
- We should not bind the product to bookmark-manager semantics.

### Concrete product implication

Our resource model should include:

- the canonical `Resource`
- one or more `ResourceSnapshot` records
- one or more `ResourceArtifact` records per snapshot

Possible artifact kinds:

- original fetch body
- readability JSON
- extracted text
- screenshot
- PDF
- simplified HTML

That is much stronger than storing only a URL and an extracted text field.

## Cross-Cutting Decisions For Our Product

## 1. We need two storage layers, not one

The repos consistently support a two-layer model:

- raw/event/source layer
- promoted/operational layer

For us that means:

- `captures`, `capture_events`, `capture_parts`, `attachments`, `resource_snapshots`
- plus `tasks`, `projects`, `reminders`, `people`, `resources`, `rules`, `memory_items`

Not every raw item becomes a first-class entity.

## 2. Long-lived memory should be summary-backed, not only vector-backed

The strongest pattern came from Lossless Claw plus OpenClaw memory:

- preserve raw evidence
- compact older material
- keep a fresh tail
- let the assistant expand deeper only when needed

So our memory layer should combine:

- raw capture lookup
- summary DAG retrieval
- embeddings
- full-text search

## 3. `Inbox` should be explicit

Memos makes this obvious, and it fits our product very well.

`Inbox` is not just "tasks with status INBOX." It should also include:

- new captures
- ambiguous candidates
- approval requests
- newly ingested resources
- research items awaiting a decision

## 4. Write approvals need their own subsystem

OpenClaw CRM confirmed that approval-backed tool execution should be a real data model, not improvised prompt state.

We should add:

- `action_requests`
- `action_request_events`
- `action_request_results`

This will cover:

- sending email
- sending outbound messages
- browser writes
- calendar event creation
- destructive edits

## 5. Session and channel bindings matter much earlier than they appear

OpenClaw Telegram and the codex bridge both show that channel/session routing becomes messy very quickly.

We should add this early:

- `assistant_sessions`
- `channel_bindings`
- `channel_policies`

That gives us a clean way to support:

- web app chat
- Telegram
- WhatsApp later
- multiple workspaces or personas later

## 6. Research needs durable step logs

Khoj's research loop is a strong reference here.

Each research run should keep:

- query
- run mode
- step sequence
- status updates
- tool calls
- tool outputs
- final brief

This matters for trust and resumability.

## 7. Resource ingestion must preserve evidence, not only summaries

Linkwarden is the strongest evidence for this.

For us:

- every URL/PDF/resource should keep the source artifact
- extracted text should be stored separately
- assistant summaries should link back to exact artifacts and snapshots

## 8. Planning should stay derived

Super Productivity makes this clear.

We should not make `Today` a manually synchronized parallel data structure if we can derive it from:

- tasks
- reminders
- deadlines
- calendar load
- user focus decisions

We can still persist accepted plan snapshots when the user explicitly accepts or edits a day plan.

## Recommended Changes To Our Current Plan

## Add these tables

- `capture_sessions`
- `capture_events`
- `capture_parts`
- `inbox_items`
- `memory_summaries`
- `memory_summary_edges`
- `memory_context_items`
- `resource_snapshots`
- `resource_artifacts`
- `research_steps`
- `assistant_sessions`
- `channel_bindings`
- `action_requests`
- `action_request_events`

## Tighten these semantics

- `Task` must distinguish day-level vs exact-time scheduling.
- `Reminder` execution must happen in a worker, not inline in API requests.
- `Resource` must support multi-artifact preservation.
- `Memory` must support raw evidence plus summary expansion.
- `OpenClaw` integration must be session-aware and approval-aware.

## Keep these deliberate limits

- no generic EAV/object engine for v1
- no vector-only memory model
- no OpenClaw-file-only source of truth
- no flat "URL -> extracted text only" research ingestion
- no planner tables as the canonical task truth

## Final Take

The code confirms the product direction we were already leaning toward, but it sharpens it significantly.

The best concrete shape for our app is now:

- a modular monolith
- explicit raw capture/event storage
- selective promoted entities
- summary-DAG memory
- explicit inbox and approvals
- worker-driven reminders and resource processing
- derived planning views
- durable research runs
- OpenClaw as shell and transport layer

That is much more concrete and much better grounded than "build a second brain with tasks and chat."
