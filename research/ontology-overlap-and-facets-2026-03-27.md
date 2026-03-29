# Ontology, Overlap, and Facets

Last updated: 2026-03-27

## Why This Follow-up Exists

The earlier entity-model pass answered a storage question:

- which things need real tables and stable identifiers

But there is a second question that matters just as much:

- what should the conceptual model look like so we do not overfit to current personal workflows

That concern is valid.

`Interview`, `Application`, and similar labels are useful examples, but they are too domain-specific to be the root ontology.

If we make them top-level concepts too early, we risk:

- a user-specific schema
- overlapping meanings
- duplicated information in tags and types
- brittle migrations later

This document refines the recommendation.

## Core Problem

There are 4 different ways systems usually encode meaning:

1. hard types
2. relations
3. properties / fields
4. tags

Most note and assistant tools become messy when these are not clearly separated.

Examples of bad overlap:

- `Interview` as a type, `#interview` as a tag, and `event_type=interview`
- `Book` as a type, `#book` as a tag, and `resource_type=book`
- `Sam` as text inside notes, a `#sam` tag, and also a person object
- `Waiting` as a tag, a task status, and a reminder state

When that happens, retrieval and automation both get worse because the same concept is represented three different ways.

## What The Best Systems Suggest

### Anytype

Useful docs and code:

- `https://doc.anytype.io/anytype-docs/getting-started/types`
- `https://doc.anytype.io/anytype-docs/getting-started/sets/collections`
- `research/repos/anytype-ts/src/ts/interface/object.ts`
- `research/repos/anytype-ts/src/ts/lib/relation.ts`

High-signal idea:

- keep a relatively small object/type system
- use collections and queries as views over objects
- do not confuse collection membership with intrinsic object type

This is important for us because `job search`, `reading`, `fitness`, and `travel` are often better modeled as contexts or views, not brand-new root entity categories.

### AppFlowy

Useful docs and code:

- `https://docs.appflowy.io/docs/essential-documentation/contribute-to-appflowy/architecture/frontend/database-view`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-database2/src/entities/field_entities.rs`
- `research/repos/AppFlowy/frontend/rust-lib/flowy-database2/src/entities/row_entities.rs`

High-signal idea:

- one shared database model can power multiple views
- rows, fields, and cells are generic; views add meaning

Important lesson for us:

- presentation/view categories should not automatically become ontology categories

### TriliumNext

Useful docs and code:

- `research/repos/triliumnext/docs/User Guide/User Guide/Advanced Usage/Attributes.md`
- `research/repos/triliumnext/apps/server/src/assets/db/schema.sql`

High-signal idea:

- notes are flexible
- labels and relations add meaning
- hierarchy is separate from note identity

Important lesson for us:

- relations and properties should carry semantics before tags do

### SilverBullet

Useful code:

- `research/repos/silverbullet/plug-api/types/index.ts`
- `research/repos/silverbullet/client/data/object_index.ts`

High-signal idea:

- index lightweight objects from content
- use tags as index/grouping helpers, not the whole ontology

### Monica

Useful code:

- `research/repos/monica/database/migrations/2020_04_25_133132_create_contacts_table.php`
- `research/repos/monica/database/migrations/2022_05_13_201216_create_contact_tasks_table.php`

High-signal idea:

- when a concept drives behavior repeatedly, it deserves a first-class object

This supports keeping people first-class, not just tagged notes.

## Revised Recommendation: Universal Root Kinds

Instead of starting with user-specific categories like `Interview` or `Application`, use a smaller universal set of root kinds.

Recommended root kinds:

- `Capture`
- `Actor`
- `Context`
- `WorkItem`
- `Event`
- `Resource`
- `Memory`
- `Rule`

These are intentionally broad.

They describe what something fundamentally is, not which domain you currently use it in.

## What Each Root Kind Means

### `Capture`

Raw intake.

Examples:

- pasted note dump
- voice memo transcript
- forwarded email snippet
- shared URL
- screenshot OCR text

This is the unstructured entry layer.

### `Actor`

A human or organization that matters repeatedly.

Subtypes:

- `person`
- `organization`

Examples:

- Sam
- Palo Alto Networks
- a recruiter
- a startup founder
- a professor

This avoids splitting people and orgs too early while still letting both be first-class.

### `Context`

A container, initiative, or durable frame that other things belong to.

Subtypes can include:

- `project`
- `goal`
- `area`
- `collection`
- `process`
- `campaign`
- `application`

Examples:

- personal website refresh
- job search spring 2026
- reading list for distributed systems
- UT Dallas chess club outreach
- Palo Alto application

This is where many domain-specific things belong.

### `WorkItem`

An actionable unit of work.

Subtypes can include:

- `task`
- `routine`
- `follow_up`
- `checklist_item`

Examples:

- update resume leadership section
- send LinkedIn outreach messages
- read 30 minutes nightly
- follow up with recruiter

This is more universal than making every action a bespoke category.

### `Event`

A time-bound occurrence.

Subtypes can include:

- `meeting`
- `interview`
- `appointment`
- `deadline`
- `trip_segment`

Examples:

- Palo Alto interview tomorrow
- dentist appointment
- prod push window
- KT session

### `Resource`

An artifact, reference, or media object.

Subtypes can include:

- `article`
- `paper`
- `book`
- `video`
- `podcast`
- `webpage`
- `pdf`
- `repo`
- `file`
- `note`

Examples:

- MIT OCW link
- a GitHub repo
- Anna’s Archive book link
- a PDF
- a YouTube video

This is where books belong.

### `Memory`

A deliberately promoted fact, preference, summary, or standing insight.

Subtypes can include:

- `fact`
- `preference`
- `summary`
- `decision`
- `profile`

Examples:

- prefers brute force first, then optimize
- explain your understanding before coding
- decision about using OpenClaw as shell only

### `Rule`

A policy that changes assistant behavior.

Examples:

- ask for approval before external writes
- quiet hours after 11 PM
- only create top-priority reminders for deadlines

## Where The Earlier Domain Examples Go

This is the important mapping.

### `Interview`

Do not make this a root kind.

Model it as:

- `Event` with subtype `interview`
- linked to an `Actor` like company / recruiter / interviewer
- linked to a `Context` like an application or job-search project
- linked to `WorkItem`s for prep
- linked to `Resource`s like company notes and question lists

### `Application`

Do not make this a root kind.

Model it as:

- `Context` with subtype `application` or `process`

That gives room for:

- tasks
- deadlines
- interviews
- company actor
- notes/resources

without inventing a separate ontology family.

### `Book`

Do not make this a root kind.

Model it as:

- `Resource` with subtype `book`

Optional related objects:

- `Context` for a reading list or learning track
- `WorkItem` for reading actions
- `Memory` for takeaways

### `Gym`

Do not make this a tag and a task and a project.

Possible models:

- `WorkItem` subtype `routine` for a repeating habit
- optional `Context` for a broader fitness goal
- optional `Event` when tied to a specific scheduled class/session

### `Read`

Usually:

- `WorkItem` subtype `routine`
- linked to one or more `Resource`s
- optionally linked to a `Context` like `reading backlog` or `learning track`

## The Right Role For Tags

Tags should exist, but they should be weak and topical.

Good uses of tags:

- `ml`
- `career`
- `finance`
- `health`
- `distributed-systems`
- `design`

Bad uses of tags:

- `task`
- `book`
- `interview`
- `waiting`
- `sam`
- `project-x`
- `gmail`

Why:

- type should not be a tag
- state should not be a tag
- important relationships should not be tags
- source/provider should not be a tag

Tags are for fuzzy thematic grouping.

## The Right Role For Relations

Relations should carry the semantics that tags usually overload.

Core relation examples:

- `belongs_to`
- `about`
- `related_to`
- `source_of`
- `derived_from`
- `participant`
- `blocked_by`
- `waiting_on`
- `prepares_for`
- `supports`

Examples:

- a prep task `prepares_for` an interview event
- a book `supports` a learning context
- a reminder is attached to a work item or event
- a note is `about` a person or project

## The Right Role For Subtypes And Properties

Use subtypes when the distinction changes behavior within the same root kind.

Examples:

- `Event`: meeting vs interview vs deadline
- `Resource`: book vs article vs pdf vs repo
- `Context`: project vs goal vs application vs collection
- `WorkItem`: task vs routine vs follow-up

Use properties for details inside that behavior.

Examples:

- `Resource.language`
- `Resource.author`
- `Event.starts_at`
- `Context.status`
- `WorkItem.effort_minutes`

## What This Means For Storage

The storage recommendation becomes:

### Base entity registry

`entities`

Required fields:

- `id`
- `kind`
- `subtype`
- `title`
- `state`
- `created_at`
- `updated_at`
- `source_capture_id`
- `metadata`

### Detail tables by universal kind

- `actors`
- `contexts`
- `work_items`
- `events`
- `resources`
- `memory_items`
- `rules`

### Operational tables

These are not root ontology kinds:

- `reminders`
- `notification_deliveries`
- `resource_snapshots`
- `resource_artifacts`
- `entity_relations`
- `entity_events`

This is an important distinction.

`Reminder` is real and needs a table, but it is not a great root conceptual kind.
It is an operational attachment to something else.

## Why This Is Safer Early

This model is safer because it avoids both failure modes:

### Failure mode 1: too many domain-specific top-level entities

Examples:

- `Interview`
- `Application`
- `LeetcodeProblem`
- `Book`
- `Workout`
- `Paper`
- `Trip`

These can usually be modeled as subtypes under a smaller root set.

### Failure mode 2: everything becomes a flat note with tags

Examples:

- book note tagged `#book #reading #systems`
- task note tagged `#todo #career`
- company note tagged `#company #interview`

This feels flexible at first, but it becomes hard to answer operational questions reliably.

## Final Recommendation

For the conceptual ontology, use:

- `Capture`
- `Actor`
- `Context`
- `WorkItem`
- `Event`
- `Resource`
- `Memory`
- `Rule`

Then use:

- subtypes for behavior-specific variation
- relations for semantics
- properties for details
- tags only for fuzzy topical grouping

That gives us a model that is:

- general enough for books, reading, fitness, travel, work, learning, and job search
- structured enough for reminders, planning, follow-ups, and retrieval
- much less likely to create overlapping tags and missed information

## Concrete Next Step

The next implementation step should reflect this refinement:

1. keep the storage backbone from the earlier entity-model pass
2. rename the conceptual layer around universal kinds
3. move domain-specific examples like `Interview` and `Application` into subtypes/templates
4. keep tags intentionally weak
5. make relations and subtype fields do the real semantic work
