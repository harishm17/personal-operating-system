# Repo Scouting Log

Last updated: 2026-03-27

This is the rolling log for the broader repo sweep requested on March 27, 2026.

The goal is to keep findings incremental:

- shortlist current high-signal repos
- clone and inspect code
- extract patterns for multi-agent workflows, tool calls, memory, automation, and research
- feed those findings back into the product plan

## Round 1: Current Repo Shortlist

Selection criteria:

- active as of 2026-03-27
- large or clearly high-signal OSS project
- relevant to at least one of:
  - memory
  - multi-agent workflows
  - automated tool calls
  - browser/computer action
  - assistant shells
  - research / retrieval systems
  - ongoing watch/briefing style workflows

### Highest-priority repos to inspect next

| Repo | Why it matters | GitHub snapshot |
|---|---|---|
| `onyx-dot-app/onyx` | Deep research, enterprise search assistant, actions, MCP, workflows | pushed 2026-03-27T22:26:48Z, 19k stars |
| `Mintplex-Labs/anything-llm` | Strong assistant shell + workspace/tool model for personal productivity | pushed 2026-03-27T22:21:43Z, 56k stars |
| `mastra-ai/mastra` | Modern TS agent/workflow framework, likely strong engine/orchestrator ideas | pushed 2026-03-27T22:21:06Z, 22k stars |
| `danny-avila/LibreChat` | Mature OSS assistant surface with agents, MCP, actions, artifacts | pushed 2026-03-27T22:17:32Z, 35k stars |
| `block/goose` | Extensible open agent with tool/action execution and approval patterns | pushed 2026-03-27T21:30:41Z, 33k stars |
| `letta-ai/letta` | Stateful agent/memory system, likely strongest for long-lived memory patterns | pushed 2026-03-27T21:16:42Z, 21k stars |
| `mem0ai/mem0` | Focused memory layer for agents, useful for memory architecture comparisons | pushed 2026-03-27T20:33:40Z, 51k stars |
| `browser-use/browser-use` | Strong browser automation substrate for assistant actions | pushed 2026-03-26T16:47:18Z, 84k stars |
| `browser-use/workflow-use` | Workflow/RPA layer on top of browser-use, likely useful for recurring task automation | pushed 2026-03-27T17:21:04Z, 3.9k stars |
| `open-webui/open-webui` | Huge OSS AI shell with tools/functions/pipelines/MCP | pushed 2026-03-27T00:31:40Z, 128k stars |
| `agentscope-ai/ReMe` | Smaller but very relevant memory-management-specific repo | pushed 2026-03-27T13:15:44Z, 2.5k stars |

### Secondary but useful references

| Repo | Why it still matters |
|---|---|
| `All-Hands-AI/OpenHands` | More coding-agent oriented, but may still have useful agent loop and action patterns |
| `AgentDock/AgentDock` | Lower-signal than the leaders, but could be useful for no-code/visual agent concepts |
| `letta-ai/co` | Interesting product shell, but very small compared to `letta` itself |

### Early hypotheses

- `letta`, `mem0`, and `ReMe` will likely sharpen the memory layer decisions.
- `LibreChat`, `Open WebUI`, `AnythingLLM`, and `Goose` will likely sharpen assistant shell, tools, approvals, and multi-agent/session patterns.
- `Onyx` may be the strongest single repo for research and grounded assistant workflows.
- `browser-use` and `workflow-use` are likely to shape our automation/action layer more than generic agent frameworks will.
- `mastra` may be more useful as an engine/workflow reference than as a product reference.

## Next steps

1. Clone the highest-priority repos.
2. Inspect key code paths:
   - workflow orchestration
   - tool execution
   - MCP / plugin surfaces
   - memory and context assembly
   - automation / scheduling
   - approvals / human-in-the-loop
3. Add Round 2 findings below with concrete file references.

## Round 2: Code-backed runtime findings

This round moved from repo metadata into actual implementation files.

The biggest theme from reading the code is:

- the strongest systems are not one big autonomous agent
- they are layered runtimes with explicit state, storage, approvals, and workflow boundaries

### Most important repos from the code pass

| Repo | What stood out in code |
|---|---|
| `letta` | Multi-agent delegation is done through controlled tool calls; memory blocks are inspectable markdown files and git-backed |
| `goose` | Tool approvals, scheduling, and subagent execution are runtime primitives, not vague UX features |
| `anything-llm` | Deterministic flow executor plus a graph-style runtime (`AIbitat`) gives structure without overcommitting to autonomy |
| `librechat` | Strong separation between tools, actions, runs, and permissions |
| `open-webui` | Functions, tools, pipelines, memories, and knowledge are cleanly separated runtime domains |
| `workflow-use` | Browser workflows are converted from brittle selectors into semantic execution plans |
| `browser-use` | The agent service bundles planning, tool usage, callbacks, and judge/eval support into one explicit runtime |
| `mem0` | Memory scoping and graph enrichment are treated as separate concerns |
| `reme` | File-based compaction and procedural memory are both first-class |
| `onyx` | Deep research is structured as clarify -> plan -> orchestrate -> research -> report, with search/tool evals |
| `mastra` | Harness abstraction is very strong for threads, approvals, memory, workspace, and modes |
| `lossless-claw` | Summary DAG compaction + retrieval is one of the best memory/context implementations inspected |

### Key concrete files inspected

Orchestration / subagents:

- `research/repos/letta/letta/services/tool_executor/multi_agent_tool_executor.py`
- `research/repos/goose/crates/goose/src/agents/subagent_handler.rs`
- `research/repos/onyx/backend/onyx/prompts/deep_research/orchestration_layer.py`
- `research/repos/mastra/packages/core/src/harness/harness.ts`

Approvals / tool control:

- `research/repos/goose/crates/goose/src/agents/tool_confirmation_router.rs`
- `research/repos/anything-llm/server/utils/telegramBot/utils/navigation/callbacks/handleToolApproval.js`
- `research/repos/librechat/api/server/services/ActionService.js`
- `research/repos/openclaw-codex-app-server/docs/specs/PERMISSIONS.md`

Memory / compaction:

- `research/repos/mem0/mem0/memory/main.py`
- `research/repos/mem0/mem0/memory/graph_memory.py`
- `research/repos/reme/reme/memory/file_based/components/compactor.py`
- `research/repos/mastra/packages/core/src/processors/memory/working-memory.ts`
- `research/repos/letta/letta/services/memory_repo/block_markdown.py`
- `research/repos/letta/letta/services/memory_repo/git_operations.py`
- `research/repos/lossless-claw/src/compaction.ts`
- `research/repos/lossless-claw/src/retrieval.ts`
- `research/repos/openclaw/extensions/memory-core/src/memory/manager.ts`
- `research/repos/openclaw/extensions/memory-core/src/tools.ts`

Workflow / browser automation:

- `research/repos/workflow-use/workflows/workflow_use/recorder/semantic_converter.py`
- `research/repos/workflow-use/workflows/workflow_use/workflow/semantic_executor.py`
- `research/repos/browser-use/browser_use/agent/service.py`
- `research/repos/browser-use/browser_use/agent/judge.py`
- `research/repos/goose/crates/goose/src/agents/schedule_tool.rs`

Assistant shells / runtime surfaces:

- `research/repos/anything-llm/server/utils/agentFlows/executor.js`
- `research/repos/anything-llm/server/utils/agents/aibitat/index.js`
- `research/repos/librechat/api/server/services/ToolService.js`
- `research/repos/librechat/api/server/services/Runs/RunManager.js`
- `research/repos/open-webui/backend/open_webui/functions.py`
- `research/repos/open-webui/backend/open_webui/routers/pipelines.py`
- `research/repos/open-webui/backend/open_webui/routers/tools.py`
- `research/repos/openclaw/extensions/llm-task/src/llm-task-tool.ts`
- `research/repos/openclaw-codex-app-server/src/controller.ts`

Research / retrieval quality:

- `research/repos/onyx/backend/onyx/tools/tool_runner.py`
- `research/repos/onyx/backend/onyx/prompts/deep_research/research_agent.py`
- `research/repos/onyx/backend/tests/regression/search_quality/run_search_eval.py`

### High-signal takeaways

1. Thin orchestrator + deterministic engines is the winning shape.
2. Tool approvals need explicit request/response objects and runtime state.
3. Multi-agent should be bounded delegation, not “open swarm.”
4. Working memory, long-term memory, procedural memory, and evidence memory should stay distinct.
5. Browser automation should prefer semantic workflows plus verification.
6. Research should create reusable evidence bundles, not just one-off replies.
7. Context compaction should be more like a summary DAG than one rolling summary blob.

### Immediate impact on our product design

The product plan is now more concrete:

- OpenClaw should remain the shell/runtime surface.
- Our backend should own:
  - canonical objects
  - action approvals
  - research runs
  - summary/compaction state
  - working memory
  - reminder/planning engines
- We should favor:
  - one strong orchestrator
  - several deterministic workflow engines
  - progressive structuring
  - source-backed evidence

### New documents created from this round

- `runtime-implementation-findings-2026-03-27.md`

## Round 3: OpenClaw-specific code pass

This round focused specifically on the shell/runtime we are most likely to build on.

### What stood out

- OpenClaw is best understood as a plugin and context-engine platform.
- The most interesting OpenClaw ecosystem patterns are:
  - context-engine replacement
  - memory-core hybrid retrieval
  - bridge plugins that connect to external specialized runtimes
  - explicit permissions and thread-binding UX

### Key OpenClaw ecosystem files inspected

- `research/repos/openclaw/docs/concepts/context-engine.md`
- `research/repos/openclaw/docs/concepts/agent-loop.md`
- `research/repos/openclaw/extensions/llm-task/src/llm-task-tool.ts`
- `research/repos/openclaw/extensions/memory-core/src/memory/manager.ts`
- `research/repos/openclaw/extensions/memory-core/src/tools.ts`
- `research/repos/lossless-claw/src/engine.ts`
- `research/repos/lossless-claw/src/retrieval.ts`
- `research/repos/lossless-claw/src/compaction.ts`
- `research/repos/openclaw-codex-app-server/src/controller.ts`
- `research/repos/openclaw-codex-app-server/docs/specs/PERMISSIONS.md`

### OpenClaw-specific takeaways

- We should not use OpenClaw as the canonical data model.
- We should use it as:
  - shell
  - plugin runtime
  - channel surface
  - context-engine integration point
  - approval / thread / interaction layer
- Our product can eventually expose:
  - custom tools
  - a custom context engine
  - bridge-style plugins for specialized workflows

### Next steps from here

1. Turn the runtime findings into exact workflow contracts.
2. Update the technical spec with repo-backed runtime decisions.
3. Define the OpenClaw integration boundary:
   - plugin tools
   - context-engine role
   - approval wiring
   - session / thread mapping


## Round 4: Storage, retrieval, and second-brain repo pass

This round expanded beyond agent runtimes into codebases that are strong at:

- personal knowledge storage
- second-brain modeling
- preservation and archival
- local-first sync
- people/reminders/life tracking
- passive context capture
- retrieval/index separation

### Repos added in this pass

| Repo | Why it matters |
|---|---|
| `khoj-ai/khoj` | Personal assistant shell with explicit user memory tables and memory retrieval split |
| `usememos/memos` | Low-friction capture with clean memo + attachment boundaries |
| `anyproto/anytype-ts` | Typed object/block model with account/space/local storage scoping |
| `toeverything/AFFiNE` | Strong separation of workspace docs, snapshots, AI sessions, and embeddings |
| `AppFlowy-IO/AppFlowy` | Local-first search/runtime with pluggable search handlers and local SQLite state |
| `logseq/logseq` | Graph-based knowledge model with explicit persistence and sync protocol boundaries |
| `monicahq/monica` | People memory, reminders, goals, feed/history, and search as separate concepts |
| `karakeep-app/karakeep` | Bookmark knowledge store with enrichment statuses, assets, and search plugins |
| `linkwarden/linkwarden` | Preservation-first archive worker with multiple derived formats and indexing invalidation |
| `paperless-ngx/paperless-ngx` | Ingestion pipeline, workflows, search content, OCR, and async task model |
| `ActivityWatch/activitywatch` | Time-series bucket/event model for passive context and lifelogging |
| `openrecall/openrecall` | Minimal local screenshot memory with OCR + embeddings |
| `HKUDS/LightRAG` | Workspace-isolated retrieval storage with explicit concurrency handling |
| `infiniflow/ragflow` | Explicit memory types and storage/runtime boundaries for agentic retrieval |

### Biggest storage takeaways

1. The strongest products do not have one giant brain table.
2. Canonical objects, artifacts, retrieval indexes, temporal events, and assistant runtime state should be different layers.
3. Attachments and preserved artifacts should use a storage-reference pattern:
   - `storage_type`
   - `reference`
   - `payload_json`
4. Search backends should stay pluggable, even if v1 uses Postgres FTS + `pgvector`.
5. Worker pipelines should own crawling, OCR, summarization, preservation, and indexing.
6. Relationship reminders and people memory deserve their own structures, not just generic tasks.
7. Passive context should be modeled as bucketed event streams, not dumped into notes.

### High-signal files from this round

- `research/repos/khoj/src/khoj/database/models/__init__.py`
- `research/repos/khoj/src/khoj/database/adapters/__init__.py`
- `research/repos/memos/store/memo.go`
- `research/repos/memos/store/attachment.go`
- `research/repos/anytype-ts/docs/src/ts/model/README.md`
- `research/repos/anytype-ts/src/ts/lib/storage.ts`
- `research/repos/AFFiNE/packages/backend/server/schema.prisma`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-search/src/services/manager.rs`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-search/src/document/local_search_handler.rs`
- `research/repos/logseq/src/main/frontend/persist_db/README.md`
- `research/repos/logseq/docs/adr/0001-nodejs-db-sync-server-adapter.md`
- `research/repos/monica/database/migrations/2022_02_18_215852_create_reminders_table.php`
- `research/repos/monica/database/migrations/2022_05_13_201216_create_contact_tasks_table.php`
- `research/repos/monica/database/migrations/2022_06_02_011219_create_goals_table.php`
- `research/repos/karakeep/packages/db/schema.ts`
- `research/repos/karakeep/packages/plugins/search-meilisearch/src/index.ts`
- `research/repos/linkwarden/packages/prisma/schema.prisma`
- `research/repos/linkwarden/apps/worker/lib/archiveHandler.ts`
- `research/repos/linkwarden/apps/worker/lib/preservationScheme/handleReadability.ts`
- `research/repos/paperless-ngx/src/documents/models.py`
- `research/repos/paperless-ngx/src/documents/consumer.py`
- `research/repos/paperless-ngx/src/documents/tasks.py`
- `research/repos/activitywatch/aw-core/aw_core/models.py`
- `research/repos/activitywatch/aw-core/aw_datastore/storages/sqlite.py`
- `research/repos/openrecall/openrecall/database.py`
- `research/repos/lightrag/lightrag/kg/shared_storage.py`
- `research/repos/ragflow/internal/storage/storage_factory.go`
- `research/repos/ragflow/docs/guides/memory/use_memory.md`

### New document created from this round

- `storage-retrieval-patterns-2026-03-27.md`


## Round 5: Integration-heavy repo pass

This round focused on the product layer we were still weakest on:

- OAuth and credential handling
- sync cursors and checkpoints
- provider webhooks and watch renewal
- multi-channel capture normalization
- notification routing and delivery
- browser extension and PWA accessibility
- approval-backed external actions

### Repos added in this pass

| Repo | Why it matters |
|---|---|
| `NangoHQ/nango` | Best OSS/source-available reference for auth sessions, token refresh, sync checkpoints, connection metadata, and signed webhooks |
| `activepieces/activepieces` | Strong reference for embeddable connection UX, auth abstractions, trigger/webhook lifecycle, and resumable approvals |
| `chatwoot/chatwoot` | Excellent reference for channel/inbox/contact/conversation/message normalization |
| `novuhq/novu` | Strong notification workflow model across in-app, email, chat, push, delay, and digest |
| `binwiederhier/ntfy` | Lightweight self-hosted notification delivery and PWA push model |
| `ignisda/ryot` | Useful split between integrations, notification platforms, webhook sinks, and browser extension ingestion |

### Key files inspected

Nango:

- `research/repos/nango/packages/types/lib/oauthSessions/db.ts`
- `research/repos/nango/packages/keystore/lib/utils/encryption.ts`
- `research/repos/nango/packages/runner-sdk/lib/checkpoint.ts`
- `research/repos/nango/packages/webhooks/lib/sync.ts`
- `research/repos/nango/docs/getting-started/sample-app.mdx`
- `research/repos/nango/docs/implementation-guides/use-cases/syncs/checkpoints.mdx`
- `research/repos/nango/docs/implementation-guides/platform/webhooks-from-nango.mdx`
- `research/repos/nango/docs/guides/platform/self-hosting.mdx`
- `research/repos/nango/docs/implementation-guides/platform/auth/token-refreshing.mdx`

Activepieces:

- `research/repos/activepieces/docs/embedding/embed-connections.mdx`
- `research/repos/activepieces/docs/admin-guide/guides/manage-oauth2.mdx`
- `research/repos/activepieces/docs/build-pieces/piece-reference/authentication.mdx`
- `research/repos/activepieces/packages/server/worker/src/lib/execute/jobs/renew-webhook.ts`
- `research/repos/activepieces/packages/pieces/core/approval/src/lib/actions/wait-for-approval.ts`
- `research/repos/activepieces/packages/pieces/core/approval/src/lib/actions/create-approval-link.ts`
- `research/repos/activepieces/packages/server/api/src/app/database/migration/postgres/1742432827826-ChangeManualTasksToTodo.ts`

Chatwoot:

- `research/repos/chatwoot/app/models/inbox.rb`
- `research/repos/chatwoot/app/models/contact.rb`
- `research/repos/chatwoot/app/models/conversation.rb`
- `research/repos/chatwoot/app/models/message.rb`
- `research/repos/chatwoot/app/listeners/webhook_listener.rb`
- `research/repos/chatwoot/app/services/twilio/incoming_message_service.rb`

Novu:

- `research/repos/novu/libs/dal/src/repositories/subscriber/subscriber.entity.ts`
- `research/repos/novu/libs/application-generic/src/encryption/encrypt-provider.ts`
- `research/repos/novu/libs/application-generic/src/factories/channel.factory.ts`
- `research/repos/novu/libs/application-generic/src/utils/digest.ts`
- `research/repos/novu/libs/application-generic/src/dtos/workflow/controls/digest-control.dto.ts`

ntfy:

- `research/repos/ntfy/server/topic.go`
- `research/repos/ntfy/server/actions.go`
- `research/repos/ntfy/message/cache_postgres_schema.go`
- `research/repos/ntfy/webpush/store_postgres.go`
- `research/repos/ntfy/docs/publish.md`
- `research/repos/ntfy/docs/subscribe/pwa.md`

Ryot:

- `research/repos/ryot/crates/models/database/src/integration.rs`
- `research/repos/ryot/crates/models/database/src/notification_platform.rs`
- `research/repos/ryot/crates/services/integration/src/sink/ryot_browser_extension.rs`
- `research/repos/ryot/crates/services/integration/src/webhook_handler.rs`
- `research/repos/ryot/apps/docs/src/integrations/ryot-browser-extension.md`

Karakeep follow-up files also inspected for extension UX and queue-backed enrichment:

- `research/repos/karakeep/apps/browser-extension/src/SavePage.tsx`
- `research/repos/karakeep/apps/browser-extension/src/background/background.ts`
- `research/repos/karakeep/packages/shared-server/src/queues.ts`
- `research/repos/karakeep/packages/trpc/lib/ruleEngine.ts`

### Biggest findings from this pass

1. We need a real connection model: sessions, encrypted credentials, tags, scopes, sync state, and failure state.
2. Sync cursors should be structured checkpoint blobs, not just timestamps.
3. External writes need a richer action-request lifecycle and approval UX.
4. Notifications need their own endpoint and delivery models.
5. Browser extension and PWA/mobile capture are core product surfaces, not optional extras.
6. Multi-channel capture should normalize into one capture/interaction model.
7. Gmail and Calendar push are helpful, but incremental sync remains the real source of truth.

### New docs created from this round

- `integrations-deep-dive-2026-03-27.md`
- `interaction-and-notification-flows-2026-03-27.md`

## Round 5: Core entity-model pass

This round focused on the narrow question:

- for a personal assistant / second brain, what should be a real structured entity
- and what should remain note-like or capture-like

### Additional repos and files inspected

Task / planning semantics:

- `research/repos/super-productivity/src/app/features/tasks/task.model.ts`

People / reminders:

- `research/repos/monica/database/migrations/2020_04_25_133132_create_contacts_table.php`
- `research/repos/monica/database/migrations/2022_05_13_201216_create_contact_tasks_table.php`
- `research/repos/monica/database/migrations/2022_02_18_215852_create_reminders_table.php`

Typed object / property systems:

- `research/repos/anytype-ts/src/ts/interface/object.ts`
- `research/repos/anytype-ts/src/ts/lib/relation.ts`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-database2/src/entities/field_entities.rs`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-database2/src/entities/row_entities.rs`

Note-first systems:

- `research/repos/memos/proto/api/v1/memo_service.proto`
- `research/repos/memos/store/memo_relation.go`
- `research/repos/joplin/packages/lib/JoplinDatabase.ts`
- `research/repos/joplin/readme/api/references/rest_api.md`
- `research/repos/blinko/prisma/schema.prisma`

Relation / attribute systems:

- `research/repos/triliumnext/apps/server/src/assets/db/schema.sql`
- `research/repos/triliumnext/docs/User Guide/User Guide/Advanced Usage/Attributes.md`
- `research/repos/triliumnext/docs/User Guide/User Guide/Advanced Usage/Attributes/Attribute Inheritance.md`
- `research/repos/silverbullet/plug-api/types/index.ts`
- `research/repos/silverbullet/client/data/object_index.ts`
- `research/repos/silverbullet/server/cmd/space_template/index.md`
- `research/repos/siyuan/API.md`

Resource / archival systems:

- `research/repos/linkwarden/packages/prisma/schema.prisma`
- `research/repos/linkwarden/packages/filesystem/manageFiles.ts`
- `research/repos/paperless-ngx/src/documents/models.py`
- `research/repos/karakeep/README.md`

Retrieval-layer separation:

- `research/repos/khoj/src/khoj/database/models/__init__.py`

### Core conclusion from this round

The storage model should be:

- raw capture first
- base entity registry second
- typed detail tables for behavior-critical concepts
- flexible metadata for extension

This rules out both extremes:

- not “everything is a note”
- not “everything is a generic property bag”

### Concrete personal-assistant entity recommendation

Promoted first-class entities:

- `Capture`
- `Person`
- `Task`
- `Reminder`
- `Project`
- `Resource`
- `Event`
- `Rule`
- `MemoryItem`

Soft / derived kinds initially:

- `Idea`
- `Question`
- `Interview`
- `Application`
- `Habit`
- `WatchItem`
- `Decision`
- `ResearchTopic`

### New document created from this round

- `core-entity-model-research-2026-03-27.md`
