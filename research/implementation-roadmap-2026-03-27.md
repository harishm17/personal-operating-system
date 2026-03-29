# Implementation Roadmap

Last updated: 2026-03-27

## Goal

This roadmap defines the recommended build order for the application.

It is optimized for:

- fastest route to a coherent product
- keeping architecture simple at the start
- validating the hardest product loops early

## Strategy

We should build the assistant core before broad integrations.

That means:

- capture first
- promotion second
- reminders/planning third
- memory/research next
- OpenClaw integration after the core backend is real

This is important because otherwise we risk building a very impressive shell around a weak product core.

## Milestone 0: Foundation

Target outcome:

- repository structure
- local dev environment
- database and migrations
- basic auth/user model
- object storage
- job queue

Deliverables:

- monorepo skeleton
- Docker Compose
- Postgres + pgvector
- pg-boss worker
- initial entity registry schema
- app shell for web frontend

Definition of done:

- app boots locally
- migrations run cleanly
- worker can consume jobs
- files can be uploaded and stored

## Milestone 1: Capture And Promotion Core

Target outcome:

- user can dump messy input into the system
- system stores raw capture
- system extracts candidate structure
- system promotes high-confidence tasks/resources/rules

Deliverables:

- `POST /captures`
- capture UI and quick-add input
- capture segmentation
- deterministic extractors for:
  - URLs
  - checklist items
  - dates
- LLM extraction pipeline
- candidate review model
- source provenance links

Definition of done:

- a pasted messy note page becomes:
  - a stored capture
  - candidate segments
  - promoted tasks/resources/rules
- user can inspect origin of promoted items

## Milestone 2: Tasks, Reminders, And Today View

Target outcome:

- the system becomes operationally useful day to day

Deliverables:

- task CRUD
- reminder scheduling
- snooze/complete/defer actions
- `Inbox` and `Today` views
- basic planning score
- urgent item surfacing

Definition of done:

- explicit reminders work
- interview-prep or due-tomorrow items are surfaced correctly
- Today view feels better than a flat todo list

## Milestone 3: Memory Search And Source-Backed Answers

Target outcome:

- user can ask the assistant questions about their own data

Deliverables:

- embedding pipeline
- hybrid search
- source-backed answer endpoint
- "why does this exist?" / item origin view
- related-content retrieval

Definition of done:

- assistant can answer:
  - what am I waiting on
  - what did I save about X
  - what tasks came from this capture

## Milestone 4: Research Pipeline

Target outcome:

- research becomes a durable workflow, not just chat

Deliverables:

- resource ingestion
- URL fetch and snapshot pipeline
- research runs
- workflow profiles
- preflight entity resolution
- evidence normalization and scoring
- evidence dedupe/cross-linking
- synthesis briefs
- open questions + suggested next actions
- research view in UI

Definition of done:

- a URL or question can turn into a saved brief with citations
- research outputs can create tasks or reminders
- follow-up questions can reuse stored evidence without a full rerun

## Milestone 5: OpenClaw Runtime Integration

Target outcome:

- chat becomes a first-class operational surface

Deliverables:

- OpenClaw plugin
- initial skill pack
- core tools:
  - capture_input
  - get_today_plan
  - create_task
  - set_reminder
  - search_memory
  - run_research
- one delivery channel for reminders

Definition of done:

- user can operate the core product through OpenClaw
- chat actions and web actions stay in sync because both hit the same backend

## Milestone 6: Projects, People, And Waiting-On

Target outcome:

- the system starts feeling like a real personal OS

Deliverables:

- project pages
- people entities
- waiting-on model
- commitments/follow-up reminders
- meeting context support

Definition of done:

- user can ask:
  - what am I waiting on from X
  - what should I do for project Y

## Milestone 7: Reviews And Adaptive Planning

Target outcome:

- the system improves through use

Deliverables:

- daily review
- weekly review
- drift detection
- stale project detection
- repeated snooze analysis
- planned vs actual reporting

Definition of done:

- review screens surface meaningful patterns, not just activity counts

## Milestone 8: Watchlists, Briefings, And Research Memory

Target outcome:

- research becomes ongoing and accumulative

Deliverables:

- watchlists
- scheduled briefings
- research history search
- evidence-bundle follow-up sessions
- basic retrieval-quality eval harness

Definition of done:

- user can save a research topic for updates
- briefings can summarize meaningful changes
- research quality can be measured against a small eval set

## What To Delay

These are attractive, but should wait until the core loops feel strong.

- passive activity tracking
- aggressive browser automation
- complex multi-agent setups
- full contact sync
- elaborate graph UIs
- mobile-native app
- custom local model routing

## Risk Register

### Risk 1: Over-modeling too early

Mitigation:

- keep only a small hard schema in v1
- let many concepts stay as soft types

### Risk 2: Over-automation and user mistrust

Mitigation:

- preserve provenance
- keep external writes approval-based
- show why items were created

### Risk 3: Chat works but product core is weak

Mitigation:

- build the backend and web views before broad channel expansion

### Risk 4: Research quality is noisy

Mitigation:

- preserve snapshots
- require citations
- distinguish facts from suggestions

## Suggested Development Order By Week

### Weeks 1-2

- repo setup
- schema bootstrap
- entity registry
- capture ingestion

### Weeks 3-4

- extraction pipeline
- task promotion
- reminder engine basics
- Inbox view

### Weeks 5-6

- Today view
- planning heuristics
- source provenance UI
- memory search groundwork

### Weeks 7-8

- research ingestion
- brief generation
- web source preservation

### Weeks 9-10

- OpenClaw plugin
- skill pack
- one chat/reminder channel

### Weeks 11-12

- projects
- people
- waiting-on
- first weekly review

## The Product Test We Should Use

Before calling v1 successful, it should pass this test:

1. user pastes a messy page of thoughts
2. system extracts useful structure without overdoing it
3. urgent actionable items appear in Today
4. reminders fire with context
5. user can ask what matters now and get a grounded answer
6. user can save a link and later ask what it was about
7. all of this works both from the web app and OpenClaw chat

## Recommendation

Do not start with:

- full UI polish
- advanced automation
- heavy integrations

Start with the smallest end-to-end loop that proves the product:

- capture
- promote
- remind
- answer

Then layer research, OpenClaw, and richer object types on top.
