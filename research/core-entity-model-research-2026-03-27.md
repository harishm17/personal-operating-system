# Core Entity Model Research

Last updated: 2026-03-27

## Purpose

This document answers one narrow but critical product question:

- for a personal assistant / second brain, what should be stored as structured entities
- what should remain raw or lightly structured
- what fields actually matter for downstream behavior like reminders, planning, recall, follow-ups, and research

This is the missing bridge between the higher-level storage architecture and the actual personal-assistant ontology.

## Short Answer

We should not keep everything unstructured.

We also should not force everything into a rigid database-first model on arrival.

The strongest design is:

1. preserve raw capture
2. extract candidates
3. promote a small set of behavior-critical things into first-class entities
4. keep a flexible extension layer for the rest

The core promoted entities should be:

- `Capture`
- `Person`
- `Task`
- `Reminder`
- `Project`
- `Resource`
- `Event`
- `Rule`
- `MemoryItem`

Everything else can begin as either:

- a subtype
- a label
- a relation pattern
- or a generated view

Examples:

- `Idea`
- `Question`
- `Interview`
- `Application`
- `Habit`
- `WatchItem`
- `Decision`
- `ResearchTopic`

## Why This Matters

The storage decision directly controls whether the assistant can do real work.

If `Task` is just text:

- reminders are weak
- `Today` planning is weak
- prioritization is weak
- recurrence and snooze logic are weak

If `Person` is just text:

- `who am I waiting on?` is weak
- contact follow-up logic is weak
- meeting prep is weak
- conversation memory is weak

If `Resource` is just text:

- citations are weak
- evidence-backed answers are weak
- watchlists and research reuse are weak

If everything is hard schema too early:

- capture gets friction-heavy
- ambiguous notes become annoying
- the user starts fighting the system

So the system has to be progressively structured, not fully loose and not fully rigid.

## Research Method

This pass combined:

- direct code reads from cloned repos under `research/repos`
- official docs and product documentation where useful
- comparison across note-first, object-first, people-first, and retrieval-first systems

High-signal repos for this question:

- `super-productivity`
- `monica`
- `anytype-ts`
- `memos`
- `joplin`
- `triliumnext`
- `silverbullet`
- `siyuan`
- `blinko`
- `AppFlowy`
- `linkwarden`
- `paperless-ngx`
- `khoj`

## Concrete Repo Findings

### 1. `super-productivity`: task semantics need explicit time fields

Useful files:

- `research/repos/super-productivity/src/app/features/tasks/task.model.ts`
- `research/repos/super-productivity/ARCHITECTURE-DECISIONS.md`

Most important lesson:

- `dueDay` and `dueWithTime` are intentionally separate
- `deadlineDay` and `deadlineWithTime` are also separate
- reminders, planned time, repeat config, and time spent are first-class

This is a strong argument against one vague `due_at` field for everything.

Implication for us:

- tasks need both day-level and exact-time scheduling semantics
- reminders should not be collapsed into due dates
- planned-time and deadline-time are not the same thing

### 2. `monica`: people become useful when notes, reminders, and activities are attached to them

Useful files:

- `research/repos/monica/database/migrations/2020_04_25_133132_create_contacts_table.php`
- `research/repos/monica/database/migrations/2022_05_13_201216_create_contact_tasks_table.php`
- `research/repos/monica/database/migrations/2022_02_18_215852_create_reminders_table.php`
- `research/repos/monica/database/migrations/2021_10_21_013005_create_notes_table.php`
- `research/repos/monica/database/migrations/2022_05_16_193917_create_calls_table.php`
- `research/repos/monica/app/Models/Contact.php`

Most important lessons:

- a person is not just a note or a tag
- reminder delivery channels deserve their own tables
- activities, notes, tasks, and reminders all gain value when bound to a durable person record
- remote sync metadata for contacts is useful but should not be the canonical person identity

Implication for us:

- `Person` should be first-class in v1
- follow-up and relationship memory should bind to people, not just generic tasks
- person reminders and person interactions should be explicit modules later

### 3. `anytype-ts`: typed objects + typed relations are powerful, but not enough by themselves

Useful files:

- `research/repos/anytype-ts/src/ts/interface/object.ts`
- `research/repos/anytype-ts/src/ts/lib/relation.ts`

Most important lessons:

- object layouts include `Human`, `Task`, `Note`, `Bookmark`, `Collection`, `Chat`, `Pdf`, `Discussion`
- relation types are typed: text, number, date, select, checkbox, URL, email, phone, object, multiselect
- relation scope is explicit

Implication for us:

- we should borrow the idea of a base entity plus typed properties
- but we should not start with a pure “everything is just an object layout” system
- assistant-critical behaviors still need dedicated typed tables for efficient querying and stable logic

### 4. `memos`: note-first capture can stay simple if relations and computed properties exist

Useful files:

- `research/repos/memos/proto/api/v1/memo_service.proto`
- `research/repos/memos/store/memo_relation.go`

Most important lessons:

- memos are primarily Markdown content with visibility, timestamps, attachments, relations, reactions, and computed properties
- computed properties like `has_task_list`, `has_incomplete_tasks`, `has_link`, and extracted title are very effective
- relations stay simple: `REFERENCE` and `COMMENT`

Implication for us:

- not every capture needs immediate promotion
- captures and freeform notes can remain mostly textual
- we should add computed properties to raw captures and notes
- relation types can start small and expand later

### 5. `joplin`: note-first storage can support todos, but todos become second-class

Useful files:

- `research/repos/joplin/packages/lib/JoplinDatabase.ts`
- `research/repos/joplin/readme/api/references/rest_api.md`
- `research/repos/joplin/packages/lib/models/Note.ts`

Most important lessons:

- notes and todos live in the same table
- todo-ness is a flag: `is_todo`
- todo state is represented with `todo_due` and `todo_completed`

Implication for us:

- this is good for lightweight note apps
- this is not strong enough for a serious assistant
- tasks in our system need more than `note + todo flag`

### 6. `triliumnext`: labels and relations are a strong flexible layer

Useful files:

- `research/repos/triliumnext/apps/server/src/assets/db/schema.sql`
- `research/repos/triliumnext/docs/User Guide/User Guide/Advanced Usage/Attributes.md`
- `research/repos/triliumnext/docs/User Guide/User Guide/Advanced Usage/Attributes/Attribute Inheritance.md`

Most important lessons:

- notes are stored separately from attributes
- attributes have:
  - `type`
  - `name`
  - `value`
  - `position`
  - `isInheritable`
- branches model hierarchy separately from notes
- relations and labels are first-class metadata rather than just parsed syntax

Implication for us:

- we should borrow a flexible relation / attribute layer
- hierarchy should be treated separately from entity identity
- inheritance is interesting for templates and defaults, but not necessary in v1

### 7. `silverbullet`: files can be indexed into object streams without converting everything to DB rows

Useful files:

- `research/repos/silverbullet/plug-api/types/index.ts`
- `research/repos/silverbullet/client/data/object_index.ts`
- `research/repos/silverbullet/server/cmd/space_template/index.md`

Most important lessons:

- indexed objects need only:
  - `ref`
  - `tag`
  - optional `tags`
- page metadata and document metadata are just indexed objects
- content can remain file-first while the system exposes a queryable object index

Implication for us:

- raw notes and docs do not need immediate canonicalization
- we can extract lightweight searchable objects from captures/resources
- index entries should remain rebuildable from underlying data

### 8. `siyuan`: block-level storage is powerful, but too low-level to be our canonical assistant ontology

Useful files:

- `research/repos/siyuan/API.md`

Most important lessons:

- notebooks, documents, blocks, attributes, assets, and SQL queries are all first-class
- block attributes can carry arbitrary metadata
- block-level APIs are strong for document editing and linking

Implication for us:

- block-level data is useful for resource/capture internals
- our assistant ontology should sit above the block layer
- we should not make block IDs the center of planning and reminders

### 9. `blinko`: simple note-first storage plus AI chat works, but still centers notes

Useful files:

- `research/repos/blinko/prisma/schema.prisma`
- `research/repos/blinko/README.md`

Most important lessons:

- the main objects are accounts, notes, tags, comments, conversations, messages, attachments
- note references and note history are explicit
- chat/conversation state is stored separately from note state

Implication for us:

- separate assistant conversation state from knowledge objects
- keep note history explicit
- note references are useful
- still insufficient as the primary model for planning and people-centric workflows

### 10. `AppFlowy`: row/field/cell models are strong for generic data views

Useful files:

- `research/repos/AppFlowy/frontend/rust-lib/flowy-database2/src/entities/field_entities.rs`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-database2/src/entities/row_entities.rs`

Most important lessons:

- fields are typed and configurable
- rows have metadata, document linkage, attachment counts, icons, and covers
- one row can bridge into richer document content

Implication for us:

- a generic field/row engine is useful for user-facing views and extensions
- we can later expose projects/people/resources in flexible table views
- but the assistant logic should not depend on a generic cell model

### 11. `linkwarden`, `paperless-ngx`, and `karakeep`: resources need preserved artifacts, not just URLs

Useful files:

- `research/repos/linkwarden/packages/prisma/schema.prisma`
- `research/repos/linkwarden/packages/filesystem/manageFiles.ts`
- `research/repos/paperless-ngx/src/documents/models.py`
- `research/repos/karakeep/README.md`

Most important lessons:

- Linkwarden stores link metadata plus multiple preservation outputs like `preview`, `pdf`, `readable`, `monolith`
- Paperless separates document identity from OCR text and classification metadata
- Karakeep cleanly separates bookmarks, tags, lists, highlights, and assets in its API surface

Implication for us:

- `Resource` must be first-class
- `Resource` is not just `url + summary`
- snapshots and artifacts must be preserved in separate tables

### 12. `khoj`: retrieval/index state should be a separate storage layer

Useful files:

- `research/repos/khoj/src/khoj/database/models/__init__.py`

Most important lessons:

- source files, chunk entries, and user memory are separate
- vector storage lives alongside but not inside the canonical source object

Implication for us:

- embeddings and retrieval records should never be the canonical truth
- rebuildable retrieval layers are the right design

## Official Docs Signals

Useful current docs / product references checked during this pass:

- Anytype Types: `https://doc.anytype.io/anytype-docs/getting-started/types`
- Memos Docs: `https://usememos.com/docs`
- Khoj Features: `https://docs.khoj.dev/category/features/`
- Karakeep Docs: `https://docs.karakeep.app/api/get-bookmarks-in-the-list/`
- Monica feature docs: `https://www.monicahq.com/features/dashboard`
- Joplin to-dos: `https://joplinapp.org/help/apps/to-dos/`

The broad signal from the docs matches the code:

- fast capture remains important
- flexible organization remains important
- typed properties or metadata become important when querying, filtering, or automating
- reminders, calendars, people, and assets usually end up as explicit concepts rather than pure Markdown conventions

## Structured vs Unstructured: Final Position

### What should stay unstructured first

- raw chat messages
- pasted brain dumps
- voice transcripts
- freeform notes
- article bodies
- imported email bodies
- meeting transcripts

These belong in:

- `captures`
- `capture_segments`
- `resource_snapshots`
- `artifacts`
- freeform note or memo content fields

### What should become structured when promoted

- people you track or follow up with
- tasks the system should remind/schedule/prioritize
- reminders the system should deliver and escalate
- projects the system should group and summarize against
- resources the assistant should cite, watch, or reuse
- events the assistant should prep for or reason around
- rules/preferences that change assistant behavior
- memory items the assistant should surface repeatedly

These belong in typed tables.

## Recommended Entity Strategy

### Recommendation

Use a hybrid of:

1. base entity registry
2. typed detail tables for behavior-critical kinds
3. flexible metadata/properties for extension

### Why not fully generic objects

Problems with pure object/property systems:

- harder to enforce task semantics
- harder to query reminders efficiently
- harder to handle people-specific workflows
- more runtime branching in planning logic

### Why not fully separate tables with no shared base

Problems with a pure table-per-concept system:

- harder to unify audit/provenance/source tracking
- harder to build shared relations and event history
- harder to support soft types and gradual promotion

### Best compromise

Use:

- `entities` as shared identity/lifecycle/provenance
- typed facet tables for key kinds
- `entity_relations`
- `entity_events`
- optional `entity_properties` or `metadata jsonb` for less stable attributes

## Recommended V1 Entity Set

### Hard first-class entities

#### `Capture`

Use for:

- raw text input
- voice input
- imported messages
- shared links/files
- browser extension captures

Must store:

- source channel
- raw body
- normalized body
- timestamps
- actor
- ingest state
- extraction status

#### `Person`

Use for:

- real humans the assistant should remember, connect context around, or follow up with

Must store:

- primary display name
- aliases / alternate names
- organization / role if known
- contact handles / contact methods when connected
- confidence / partialness
- last interaction
- next follow-up hint

#### `Task`

Use for:

- actionable commitments the assistant should plan, remind, or track

Must store:

- title
- status
- priority
- project link
- source capture
- day-level schedule
- time-level schedule
- day-level deadline
- time-level deadline
- estimate / effort
- completion time
- waiting-on state

Important rule:

- keep day-level and exact-time fields separate

#### `Reminder`

Use for:

- actual triggerable assistant nudges
- reminder escalation state
- follow-up logic

Must store:

- anchor entity
- trigger type
- next trigger time
- recurrence rule if any
- snooze state
- escalation policy
- delivery state

#### `Project`

Use for:

- workstreams the assistant should summarize and organize around

Must store:

- name
- status
- area/domain
- start date
- target date
- owner
- active/inactive state

#### `Resource`

Use for:

- URLs
- PDFs
- files
- docs
- imported web pages

Must store:

- resource kind
- canonical URL or file ref
- title
- source app
- ingestion status
- latest snapshot pointer
- artifact summary state

#### `Event`

Use for:

- calendar events
- interviews
- meetings
- deadlines with attendees

Must store:

- title
- start/end
- all-day flag
- location / meeting URL
- attendee refs
- source calendar ref

#### `Rule`

Use for:

- personal assistant preferences
- behavior constraints
- recurring style instructions

Must store:

- scope
- rule text
- enabled state
- origin

#### `MemoryItem`

Use for:

- persistent assistant-facing memory
- facts or preferences intentionally promoted for long-term reuse

Must store:

- memory type
- text/value
- salience
- source
- review/update timestamps

### Soft / derived kinds for v1

These should not require dedicated tables on day 1:

- `Idea`
- `Question`
- `Interview`
- `Application`
- `Habit`
- `WatchItem`
- `Decision`
- `ResearchTopic`

These can start as:

- a subtype on `entities.kind_detail`
- a label on `Task`, `Project`, or `Resource`
- a saved query / generated view
- or a relation pattern

Promote only if real usage proves they need distinct logic.

## Recommended Table Shape

### Base tables

- `entities`
- `entity_relations`
- `entity_events`
- `captures`
- `capture_segments`

### Typed detail tables

- `people`
- `tasks`
- `reminders`
- `projects`
- `resources`
- `events`
- `rules`
- `memory_items`

### Supporting layers

- `resource_snapshots`
- `resource_artifacts`
- `search_documents`
- `search_embeddings`
- `assistant_sessions`
- `action_requests`
- `notification_deliveries`

### Flexible extension layer

For v1, prefer:

- `entities.metadata jsonb`
- `entity_relations.metadata jsonb`

Do not start with a full EAV property system unless we hit a real need.

If we later need user-defined typed properties:

- add `property_definitions`
- add `entity_property_values`

## Query and Behavior Implications

### `What should I do today?`

Needs:

- `tasks`
- `projects`
- `events`
- `reminders`
- possibly `people` for waiting-on

This query is much easier when tasks are real rows, not parsed text.

### `Who am I waiting on?`

Needs:

- `people`
- `tasks`
- `entity_relations`
- `events`
- optionally email/chat context

This is much stronger when people are first-class.

### `What did I decide about X?`

Needs:

- `captures`
- `resources`
- `memory_items`
- optional `Decision` labels or relation patterns

This does not require a dedicated `decisions` table on day 1.

### `Prepare me for tomorrow's interview`

Needs:

- `events`
- `tasks`
- `resources`
- `people`
- possibly `projects`

This benefits from a real `Event` table and resource/project links.

## Recommended Promotion Rules

Promote to a hard typed entity when:

- downstream automation depends on it
- the assistant must schedule or remind on it
- it is referenced repeatedly across captures
- it must be linked to other objects in stable ways
- the user explicitly confirms or edits it

Keep it soft when:

- it is ambiguous
- it is one-off reference material
- it is a fleeting thought
- it is not yet worth behavioral logic

## Final Recommendation

The assistant should use:

- unstructured raw capture for intake
- structured promoted entities for execution
- preserved artifacts for evidence
- retrieval/index layers for recall
- shared relations/events for context

The best v1 canonical model is:

- base `entities`
- typed detail tables for `Person`, `Task`, `Reminder`, `Project`, `Resource`, `Event`, `Rule`, `MemoryItem`
- raw `Capture` pipeline alongside them

This is the narrowest model that still supports:

- smart reminders
- `Today` planning
- follow-ups and waiting-on
- source-backed recall
- research reuse
- assistant preferences

## Is The Research Sufficient Now?

For the personal-assistant / second-brain entity model:

- yes, enough to implement v1 with confidence

What is still intentionally deferred:

- full user-defined property system
- multi-user collaborative ontology
- local-first sync conflict semantics
- end-to-end encrypted per-entity storage strategy
- dedicated tables for all soft subtypes

The next step should not be more general research.

The next step should be:

1. turn this entity model into actual SQL tables and TS types
2. define promotion rules from `Capture -> Entity`
3. define read models for `Inbox`, `Today`, `People`, `Resources`, and `Memory`
