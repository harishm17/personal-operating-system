# Design Implications

Last updated: 2026-03-27

This document turns the research into product and architecture guidance.

## Main Conclusion

The product should be a progressive-structuring personal operating system.

Not:

- a rigid schema-first database
- a plain text note app with chat
- a task app with some AI

## Recommended Data Layers

### 1. Raw Capture Layer

Purpose:

- preserve the exact original input
- support auditability, re-parsing, and better future extraction

Examples:

- pasted todo page
- chat message
- voice transcript
- URL share
- PDF upload
- imported long-form critique

Storage:

- `captures`
- `capture_parts`
- blob/file storage for attachments

### 2. Interpretation Layer

Purpose:

- store candidate understanding without forcing it into final structure

Examples:

- possible task
- possible person
- possible date
- possible project
- possible assistant rule
- unresolved mention

Storage:

- `extractions`
- `entities_candidate`
- confidence scores
- parser/model/version metadata

### 3. Operational Layer

Purpose:

- support behavior that depends on reliable structure

These are the items that need stronger fields because planning, reminders, automation, and Q&A depend on them.

Recommended hard-core objects for v1:

- `Task`
- `Reminder`
- `Project`
- `Person`
- `Event`
- `Resource`
- `Rule`

Soft types or derived subtypes for v1:

- `Idea`
- `Interview`
- `Application`
- `Habit`
- `ResearchTopic`
- `Decision`
- `Commitment`

These can start as tags/subtypes on the core objects and graduate later if needed.

### 4. History / Events Layer

Purpose:

- support reviews, undo, audit, and behavior tracking

Storage:

- `events`
- `reminder_events`
- `planning_events`
- `resource_ingestion_events`

### 5. Retrieval / Memory Layer

Purpose:

- support Q&A, related context, summarization, and source-grounded answers

Storage:

- full-text search
- semantic embeddings
- relation graph
- curated memory blocks

## Recommended Core Tables / Collections

- `captures`
- `capture_parts`
- `objects`
- `object_relations`
- `object_events`
- `resources`
- `resource_snapshots`
- `tasks`
- `reminders`
- `projects`
- `people`
- `events`
- `rules`
- `memories`
- `embeddings`

Note:

`objects` can be a shared registry with subtype tables, or you can use a document-first model with typed projections. The important thing is preserving identity and relations across types.

## Required Product Capabilities

### Capture

- instant chat capture
- voice capture
- share link/file capture
- preserve original content

### Interpretation

- classify actionable vs informational vs unresolved
- detect dates, people, projects, follow-ups
- extract assistant rules/preferences

### Promotion

- create operational objects only when needed
- allow confirmation for ambiguous high-impact actions

### Planning

- Today / This Week / Waiting On / Upcoming
- realistic daily plan based on time/urgency/context
- recurring work support

### Research

- ingest resources
- preserve source snapshots
- produce grounded research briefs
- store claims/questions/open loops

### Recall

- answer questions from source-backed memory
- link every answer to supporting artifacts

### Actions

- notifications/reminders
- email/calendar/browser actions through explicit tools
- approval gates for external writes

## Architectural Bias

### Best fit

- `OpenClaw` as assistant shell / access layer
- first-party backend as the source of truth
- relational DB + search + embeddings
- durable jobs for reminders/research/follow-ups
- protocol-based tool layer for external systems

### Avoid

- editor-first architecture
- page/folder-based core model
- "everything is a task" simplification
- treating embeddings alone as memory

## Product Rules To Keep

- Chat is capture, not the source of truth.
- Every important derived object links back to source.
- Every reminder or plan item should be explainable.
- Uncertainty should be stored, not hidden.
- Structure should be earned by downstream value.

## Suggested V1 Product Loop

1. User captures something messy.
2. System stores raw capture.
3. System extracts candidates.
4. System promotes a small set of operational objects.
5. System proposes tasks/reminders/research only when helpful.
6. System answers later questions using preserved source context.
7. System improves plans and reminders from event history.

## Immediate Next Design Work

- define exact object identity strategy
- choose relational schema vs document+projection hybrid
- design reminder/follow-up engine
- design capture parsing pipeline
- define assistant rule storage and precedence
- define resource ingestion/snapshot pipeline
