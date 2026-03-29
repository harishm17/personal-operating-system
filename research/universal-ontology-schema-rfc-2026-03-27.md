# Universal Ontology to Schema RFC

Last updated: 2026-03-27

## Purpose

This document turns the ontology refinement into an implementation decision.

It answers:

- what the stable physical schema should be
- which concepts should be universal root kinds
- which concepts should be subtypes or filtered views
- how to avoid overlap between types, tags, relations, and fields

This is the bridge between:

- `core-entity-model-research-2026-03-27.md`
- `ontology-overlap-and-facets-2026-03-27.md`
- `application-technical-spec-2026-03-27.md`

## Decision

Use a smaller universal schema now.

Stable physical tables should be based on these root kinds:

- `actors`
- `contexts`
- `work_items`
- `events`
- `resources`
- `memory_items`
- `rules`

With shared infrastructure:

- `entities`
- `entity_relations`
- `entity_events`
- `captures`
- `capture_segments`
- `reminders`
- `resource_snapshots`
- `resource_artifacts`

This means we should prefer universal physical table names over narrower ones like:

- `people`
- `projects`
- `tasks`

Those narrower concepts can still exist as:

- filtered views
- API aliases
- UI labels
- saved queries

## Big Principle

Separate these four layers cleanly:

1. root kind
2. subtype
3. relation
4. tag

### Root kind

Use for stable ontology boundaries and physical tables.

Examples:

- `actor`
- `context`
- `work_item`
- `resource`

### Subtype

Use when behavior changes within a root kind.

Examples:

- `actor.person`
- `actor.organization`
- `context.project`
- `context.application`
- `work_item.routine`
- `resource.book`

### Relation

Use for semantics between objects.

Examples:

- `belongs_to`
- `participant`
- `prepares_for`
- `waiting_on`
- `supports`

### Tag

Use only for fuzzy topical grouping.

Examples:

- `ml`
- `career`
- `health`
- `distributed-systems`

## Why This Is Better Than The Earlier Table Names

The earlier entity-model pass used behavior-critical concepts like:

- `Person`
- `Task`
- `Project`
- `Reminder`
- `Resource`
- `Event`

That was directionally right, but not ontology-clean enough.

### Problem with `people`

Too narrow.

We also need:

- organizations
- teams
- companies
- schools

A unified `actors` table handles this better.

### Problem with `projects`

Too narrow.

We also need:

- goals
- collections
- campaigns
- applications
- processes
- areas

A unified `contexts` table handles this better.

### Problem with `tasks`

Too narrow.

We also need:

- routines
- follow-ups
- checklist items
- habits

A unified `work_items` table handles this better.

### Why `resources`, `events`, `rules`, and `memory_items` still work

These are already broad enough.

`Resource` is broad enough to include books, PDFs, repos, webpages, notes, and media.

`Event` is broad enough to include interviews, meetings, appointments, deadlines, and time windows.

`Rule` and `MemoryItem` are already generic conceptual categories.

## Recommended Physical Model

### Shared registry

#### `entities`

Purpose:

- shared identity
- provenance
- lifecycle
- subtype and metadata anchor

Suggested fields:

- `id uuid primary key`
- `kind text not null`
- `subtype text`
- `title text`
- `state text`
- `source_capture_id uuid`
- `created_at timestamptz`
- `updated_at timestamptz`
- `archived_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`

Constraints:

- `kind` should be validated in app code and preferably a DB enum when stable
- `subtype` should be scoped by `kind`

Recommended initial `kind` values:

- `actor`
- `context`
- `work_item`
- `event`
- `resource`
- `memory`
- `rule`

Note:

- raw captures remain in `captures`; they do not need entity rows by default
- only promote a capture into an entity if it becomes a durable note-like or knowledge object

### Root detail tables

#### `actors`

Covers:

- people
- organizations

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `display_name text not null`
- `sort_name text`
- `primary_kind text not null default 'person'`
- `aliases text[] not null default '{}'`
- `primary_email citext`
- `primary_phone text`
- `organization_name text`
- `role_title text`
- `last_interaction_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `person`
- `organization`

#### `contexts`

Covers:

- projects
- goals
- areas
- collections
- campaigns
- applications
- processes

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `status text`
- `horizon text`
- `owner_actor_id uuid references entities(id)`
- `started_at timestamptz`
- `target_at timestamptz`
- `closed_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `project`
- `goal`
- `area`
- `collection`
- `campaign`
- `application`
- `process`

#### `work_items`

Covers:

- tasks
- routines
- follow-ups
- checklist items

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `status text not null`
- `priority text`
- `effort_minutes integer`
- `due_day date`
- `due_at timestamptz`
- `deadline_day date`
- `deadline_at timestamptz`
- `completed_at timestamptz`
- `deferred_until timestamptz`
- `waiting_on_actor_id uuid references entities(id)`
- `parent_work_item_id uuid references entities(id)`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `task`
- `routine`
- `follow_up`
- `checklist_item`

Important rule:

- preserve separate day-level and exact-time fields

#### `events`

Covers:

- meetings
- interviews
- appointments
- deadlines
- trip segments

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `starts_at timestamptz`
- `ends_at timestamptz`
- `all_day boolean not null default false`
- `location_text text`
- `conference_url text`
- `status text`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `meeting`
- `interview`
- `appointment`
- `deadline`
- `trip_segment`

#### `resources`

Covers:

- books
- articles
- papers
- webpages
- repos
- videos
- files
- notes

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `resource_type text not null`
- `canonical_url text`
- `mime_type text`
- `language_code text`
- `published_at timestamptz`
- `author_text text`
- `ingestion_status text`
- `latest_snapshot_id uuid`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `book`
- `article`
- `paper`
- `video`
- `podcast`
- `webpage`
- `pdf`
- `repo`
- `file`
- `note`

#### `memory_items`

Covers:

- facts
- preferences
- summaries
- decisions
- profiles

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `memory_type text not null`
- `salience numeric`
- `review_at timestamptz`
- `expires_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `fact`
- `preference`
- `summary`
- `decision`
- `profile`

#### `rules`

Suggested fields:

- `entity_id uuid primary key references entities(id)`
- `scope text not null`
- `enabled boolean not null default true`
- `policy_text text not null`
- `metadata jsonb not null default '{}'::jsonb`

Recommended subtypes:

- `assistant_behavior`
- `notification_policy`
- `approval_policy`
- `planning_policy`

## Operational Tables That Should Stay Separate

### `captures`

This is the intake log, not the conceptual ontology.

It should remain separate because:

- many captures never deserve canonical identity
- capture processing needs its own workflow state
- preserving source history matters even when promotion changes later

### `reminders`

Important decision:

- keep `reminders` as a separate operational table, not as a root kind

Why:

- a reminder is not usually a thing in the world
- it is an assistant action attached to another thing
- one `work_item` or `event` may have multiple reminders
- reminder state and delivery state should remain operational

Suggested key fields:

- `id uuid primary key`
- `entity_id uuid not null references entities(id)`
- `trigger_kind text not null`
- `scheduled_for timestamptz`
- `recurrence_rule text`
- `escalation_policy jsonb`
- `status text`
- `last_triggered_at timestamptz`
- `metadata jsonb not null default '{}'::jsonb`

### `entity_relations`

This is where semantics should live instead of tags.

Suggested fields:

- `id uuid primary key`
- `from_entity_id uuid not null references entities(id)`
- `relation_type text not null`
- `to_entity_id uuid not null references entities(id)`
- `position integer`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz`

Recommended initial relation types:

- `belongs_to`
- `related_to`
- `about`
- `participant`
- `supports`
- `prepares_for`
- `waiting_on`
- `blocked_by`
- `derived_from`
- `source_of`

## Tags: Strong Guidance

We should add tags, but constrain their role from the beginning.

### Suggested schema

- `tags`
- `entity_tags`

### Good tags

- `ml`
- `career`
- `health`
- `backend`
- `distributed-systems`

### Bad tags

- `task`
- `interview`
- `book`
- `project`
- `sam`
- `waiting`

Rule of thumb:

- if something changes behavior, it should not be only a tag

## Convenience Views We Should Still Expose

To keep the product understandable, we should expose friendly filtered concepts even if the physical schema is broader.

Examples:

- `people` = `actors where subtype = 'person'`
- `organizations` = `actors where subtype = 'organization'`
- `projects` = `contexts where subtype = 'project'`
- `goals` = `contexts where subtype = 'goal'`
- `applications` = `contexts where subtype = 'application'`
- `tasks` = `work_items where subtype = 'task'`
- `routines` = `work_items where subtype = 'routine'`
- `books` = `resources where subtype = 'book'`

These can be:

- SQL views
- API filters
- UI tabs
- OpenClaw tool filters

This gives us ergonomic UX without freezing the ontology too narrowly.

## Promotion Rules Under The New Model

### Promote to `actor` when

- the same person or organization appears repeatedly
- the user is waiting on them or meeting with them
- contact-linked behavior matters

### Promote to `context` when

- multiple items belong together under a durable frame
- status or progress over time matters
- the assistant should summarize or review against it

### Promote to `work_item` when

- the assistant should remind, plan, or rank it
- completion/defer/waiting semantics matter

### Promote to `event` when

- timing and calendar-style behavior matter
- prep or follow-up behavior depends on a scheduled occurrence

### Promote to `resource` when

- it should be cited, summarized, watched, or revisited
- artifact preservation matters

### Promote to `memory` when

- the assistant should reliably recall it later without reparsing raw sources

## Migration Impact On Existing Planning

This changes the earlier naming recommendation as follows:

- `people` -> `actors` with `person` subtype
- `projects` -> `contexts` with `project` subtype
- `tasks` -> `work_items` with `task` subtype
- `memory_items` stays
- `resources` stays
- `events` stays
- `rules` stays
- `reminders` stays as operational table

This is worth doing early.

Renaming later would be painful because:

- APIs grow around the early names
- integration mappings harden
- prompts and tools start assuming them
- analytics and view logic start depending on them

## Final Recommendation

Use universal physical tables now:

- `entities`
- `actors`
- `contexts`
- `work_items`
- `events`
- `resources`
- `memory_items`
- `rules`
- `reminders`
- `entity_relations`
- `captures`

Use subtypes for domain-specific meaning.

Use relations for semantics.

Use tags only for topical grouping.

Expose narrower user-facing concepts as filtered views, not root ontology categories.
