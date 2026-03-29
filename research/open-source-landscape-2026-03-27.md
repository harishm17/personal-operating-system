# Open-Source Landscape

Last updated: 2026-03-27

## Scope

This document focuses on current open-source or source-available projects relevant to:

- second-brain systems
- personal assistants
- memory layers
- planning/task systems
- capture and archival
- research workflows
- browser/app actions

The question is not "what should we copy wholesale?"

The question is:

- what patterns are working
- how these systems structure data and behavior
- what we should borrow
- what we should avoid

## High-Level Takeaway

The strongest systems in 2025-2026 converge on:

- low-friction capture
- layered memory
- progressive structure
- preserved source artifacts
- protocol/tool-based actions
- generated views over shared data

They do not generally win by forcing users into rigid up-front schemas.

## 1. Assistant Shells And Memory-Driven Agents

### Khoj

- Repo: <https://github.com/khoj-ai/khoj>
- Docs: <https://docs.khoj.dev/>

Why it matters:

- closest OSS product to a "personal AI second brain"
- supports local docs + web search + agents + automations + voice + multiple access surfaces

Ideas to borrow:

- chat over both local memory and the web
- scheduled automations and research digests
- multi-surface access model
- agents as configurable roles, not separate apps

What not to copy blindly:

- connector-heavy positioning as the main product story
- one generic chat surface for everything without stronger promoted operational objects

### Letta

- Repo: <https://github.com/letta-ai/letta>
- Docs: <https://docs.letta.com/>
- Relevant docs: <https://docs.letta.com/letta-code/memory/>

Why it matters:

- one of the clearest open systems for long-lived stateful agents
- explicit memory hierarchy instead of a giant hidden context blob

Ideas to borrow:

- hot memory vs archival memory
- inspectable memory artifacts
- persistent agent identity across sessions
- reflection / sleep-time memory maintenance

Avoid:

- building around only agent memory abstractions without a strong product object model

### Mem0 / OpenMemory

- Repo: <https://github.com/mem0ai/mem0>
- Docs: <https://docs.mem0.ai/openmemory/overview>

Why it matters:

- memory as shared infrastructure across assistants and apps

Ideas to borrow:

- memory as its own service
- cross-client memory layer
- explicit add/search/update memory operations

Avoid:

- reducing the product to "better memory for LLMs" rather than a full personal operating system

### OpenClaw

- Repo/docs: <https://github.com/openclaw/openclaw>
- Memory article: <https://openclawai.io/blog/openclaw-memory-context-configuration/>
- Productivity recipes: <https://openclawai.io/recipes/productivity/>

Why it matters:

- good shell for accessing the assistant from different contexts
- useful ideas around layered memory and recipe-driven integrations

Ideas to borrow:

- assistant shell / access layer
- layered context model
- simple extensibility surface

Avoid:

- making recipes the main data model
- relying on markdown memory alone for operational workflows

## 2. Knowledge Systems / PKM / Local-First Brains

### Anytype

- Repo: <https://github.com/anyproto/anytype-ts>
- Docs: <https://doc.anytype.io/anytype-docs>

Why it matters:

- strong object/property/query mindset
- local-first and encrypted by design

Ideas to borrow:

- typed objects
- generated query views
- local-first assumptions

Avoid:

- overcommitting to heavy object typing for early messy capture

### AFFiNE

- Repo: <https://github.com/toeverything/AFFiNE>
- Docs: <https://docs.affine.pro/>

Why it matters:

- one surface for notes, docs, databases, and canvas-like thinking

Ideas to borrow:

- same underlying content appearing in multiple views
- block/doc/database hybrid interface

Avoid:

- recreating a full editor/collab suite before the assistant core works

### AppFlowy

- Repo: <https://github.com/AppFlowy-IO/AppFlowy>
- Site/docs: <https://appflowy.com/>

Why it matters:

- open source workspace with AI and local-data positioning

Ideas to borrow:

- shared core data layer across desktop/mobile/web
- local-model support as an option

Avoid:

- large workspace/editor complexity too early

### Logseq

- Repo: <https://github.com/logseq/logseq>

Why it matters:

- daily-first capture
- graph of blocks rather than only pages

Ideas to borrow:

- journals/daily log
- small-unit capture
- query and linking mentality

Avoid:

- forcing users into manual outlining as the main interaction pattern

### Memos

- Repo: <https://github.com/usememos/memos>

Why it matters:

- one of the best OSS examples of low-friction, small-unit note capture

Ideas to borrow:

- instant capture
- privacy-first/self-hosted simplicity
- API-first small notes

Avoid:

- staying at "micro-notes" without richer downstream promotion

### Reor

- Repo: <https://github.com/reorproject/reor>

Why it matters:

- local-first AI note-taking
- automatic linking through embeddings

Ideas to borrow:

- every note can be embedded and connected
- ambient related-context surfacing

Avoid:

- assuming semantic similarity alone is enough for operational planning

### Surf

- Topic page signal: <https://github.com/topics/knowledge-management>
- Product site: <https://deta.surf/>

Why it matters:

- browser/files/webpages/notes treated as one notebook environment

Ideas to borrow:

- source-linked notes and citations
- webpage/video/pdf as first-class research inputs

Avoid:

- turning the whole product into a browser-first experience if chat/mobile capture is the actual priority

## 3. Resource Capture / Reading / Archival

### Karakeep

- Repo: <https://github.com/karakeep-app/karakeep>
- Docs: <https://docs.karakeep.app/>

Why it matters:

- bookmark-everything model with AI tagging and archiving

Ideas to borrow:

- automatic enrichment of saved resources
- full-text search + screenshots + crawling
- optional AI tagging, not required tagging

Avoid:

- treating all resources as bookmarks instead of linking them to projects, tasks, and questions

### Linkwarden

- Repo: <https://github.com/linkwarden/linkwarden>

Why it matters:

- strong model for preserving webpages while reading/annotating them later

Ideas to borrow:

- archival copy per resource
- reader-friendly preserved copies

Avoid:

- separating resource preservation from the main knowledge graph

### ArchiveBox

- Repo: <https://github.com/ArchiveBox/ArchiveBox>
- Docs: <https://docs.archivebox.io/>

Why it matters:

- preserves the source artifact in many formats

Ideas to borrow:

- store snapshots, not just extracted summaries
- reproducible preservation pipeline

Avoid:

- building an archive-first product with weak assistant ergonomics

### Paperless-ngx

- Repo: <https://github.com/paperless-ngx/paperless-ngx>
- Docs: <https://docs.paperless-ngx.com/>

Why it matters:

- ingestion pipeline design is excellent

Ideas to borrow:

- consumer/inbox pipeline
- OCR + metadata extraction
- rules/workflows over imported documents

Avoid:

- constraining everything to document-management metaphors

## 4. Planning / Tasks / Work Management

### Super Productivity

- Repo: <https://github.com/johannesjo/super-productivity>

Why it matters:

- unusually thoughtful about realistic daily planning

Ideas to borrow:

- planned time vs actual time
- focus mode
- routines and recurring work
- rich task context

Avoid:

- making time tracking mandatory for all users

### Vikunja

- Repo: <https://github.com/go-vikunja/vikunja>

Why it matters:

- active, straightforward open-source task system

Ideas to borrow:

- simple task/project APIs
- strong separation between backend and clients

Avoid:

- flattening personal operations into a basic task hierarchy only

### Plane

- Repo: <https://github.com/makeplane/plane>
- MCP server: <https://github.com/makeplane/plane-mcp-server>

Why it matters:

- richer work item model with dependencies and planning structures

Ideas to borrow:

- task dependencies
- richer workflow states
- MCP exposure of product data

Avoid:

- assuming personal work should inherit all team-project-management complexity

## 5. People / Life / Passive Signals

### Monica

- Repo: <https://github.com/monicahq/monica>

Why it matters:

- people-centered memory and reminders

Ideas to borrow:

- people as first-class entities
- follow-ups and relationship notes

Avoid:

- isolating people data in a separate CRM silo from tasks, calendar, and knowledge

### ActivityWatch

- Repo: <https://github.com/ActivityWatch/activitywatch>
- Docs: <https://docs.activitywatch.net/>

Why it matters:

- clean event-stream model for passive activity tracking

Ideas to borrow:

- buckets/events for passive signals
- optional activity telemetry

Avoid:

- making surveillance-style tracking the default product posture

## 6. Research And Retrieval

### GraphRAG

- Repo: <https://github.com/microsoft/graphrag>
- Docs: <https://microsoft.github.io/graphrag/>

Why it matters:

- stronger for corpus-level understanding than simple chunk retrieval

Ideas to borrow:

- graph-derived summaries
- entity/community extraction over documents
- better answers for broad synthesis questions

Avoid:

- using graph pipelines for every simple lookup or reminder flow

### Onyx

- Repo: <https://github.com/onyx-dot-app/onyx>

Why it matters:

- assistant over knowledge with hybrid retrieval, deep research, and action patterns

Ideas to borrow:

- deep research as a workflow, not one prompt
- strong grounding over mixed sources
- blend retrieval and tool use

Avoid:

- enterprise-search assumptions leaking into personal-product UX

### AnythingLLM

- Repo: <https://github.com/Mintplex-Labs/anything-llm>

Why it matters:

- useful workspace-based context packaging

Ideas to borrow:

- scoped knowledge bundles
- per-workspace tools/models/memory

Avoid:

- trapping users inside many isolated workspaces that cannot reason across life/work/projects when needed

## 7. Action Layers / Automation / Protocols

### Open WebUI

- Repo: <https://github.com/open-webui/open-webui>
- Docs: <https://docs.openwebui.com/>

Why it matters:

- clean extensibility model: tools, functions, pipelines, MCP

Ideas to borrow:

- explicit boundaries between model, tools, and transformation pipelines

Avoid:

- treating the assistant as only a chat UI

### Stagehand

- Repo: <https://github.com/browserbase/stagehand>
- Docs: <https://docs.stagehand.dev/>

Why it matters:

- browser actions done through a practical mix of code and AI

Ideas to borrow:

- previewable actions
- deterministic scripts when possible, AI fallback when needed
- reusable action paths

Avoid:

- pure AI browser automation without observability or guardrails

### OpenAdapt

- Repo: <https://github.com/OpenAdaptAI/OpenAdapt>

Why it matters:

- useful example of "learn by demonstration" for repetitive workflows

Ideas to borrow:

- record/replay for high-friction repetitive processes

Avoid:

- using desktop automation as the default integration path when APIs are available

### MCP

- Spec: <https://modelcontextprotocol.io/specification/draft/basic>
- Reference servers: <https://github.com/modelcontextprotocol/servers>

Why it matters:

- best current protocol for giving assistants structured tool access

Ideas to borrow:

- tools/resources/prompts boundary
- protocol-based integration surface
- internal/external tool contracts

Avoid:

- over-rotating into "everything is an MCP server" before the product’s own domain model is solid

## Cross-Project Patterns Worth Stealing

### 1. Progressive Structuring

Seen across Tana-like systems, Memos-like capture, and object-centric tools:

- capture first
- infer candidates
- promote only what needs structure

### 2. Source Preservation

Seen in ArchiveBox, Linkwarden, Karakeep, Paperless:

- keep the original source
- store cleaned/extracted versions too
- every summary should link back to the source

### 3. Layered Memory

Seen in Letta, Mem0, OpenClaw, Khoj:

- short-term working memory
- long-term searchable memory
- curated or behavioral memory

### 4. Generated Views

Seen in Anytype, AFFiNE, AppFlowy, task systems:

- one underlying graph/data layer
- many views: Today, Inbox, Ideas, People, Research, Waiting On

### 5. Tool Protocols

Seen in Open WebUI, MCP, agent platforms:

- actions should go through explicit tools
- traces and approvals matter

## Practical Recommendation

Do not build:

- another editor-first workspace
- another kanban board
- another generic RAG chat

Build:

- a progressive-structuring capture system
- a memory service
- an operational object layer for tasks/reminders/projects/people/resources
- a research pipeline with preserved sources
- a planning/review layer
- a tool protocol layer for external actions
