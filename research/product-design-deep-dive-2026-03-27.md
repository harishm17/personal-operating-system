# Product Design Deep Dive

Last updated: 2026-03-27

## Purpose

This document turns the research into a concrete product design for our assistant.

The goal is to answer:

- what the product is
- how it should behave
- what data it must own
- what flows define the user experience
- what should exist in v1 versus later

## Product Thesis

We are building a personal operating system with an assistant at the center.

The assistant is not just:

- chat
- note search
- task generation
- RAG over personal files

It should function as:

- capture layer
- interpreter
- planner
- reminder/follow-up engine
- research coordinator
- advisor
- memory interface

The product succeeds if the user can think in natural language and still get:

- reliable follow-through
- source-backed recall
- realistic planning
- useful reminders
- research acceleration
- better decisions

## The Main User Problem

The user currently spreads life/work across:

- chats
- todo notes
- emails
- calendar
- saved links
- random documents
- mental reminders

The actual failure mode is not "lack of storage."

It is:

- capture is easy but organization is weak
- recall is possible but action is not
- tasks exist but are disconnected from context
- reminders are static and dumb
- research is separate from execution
- goals do not reliably shape daily behavior

## Product Principles

### 1. Capture should stay easy

The user should not have to decide:

- which app to open
- what schema to use
- whether something is a note or task

Preferred capture modes:

- chat
- voice
- share link / file
- quick add command palette

### 2. Structure should be progressive

The system should:

- preserve the raw thing
- extract candidate meaning
- promote only the parts that need operational behavior

### 3. Every important action needs provenance

The assistant should be able to answer:

- why did you create this task
- where did this reminder come from
- what source supports this answer

### 4. Planning should be realistic

The assistant should optimize for:

- what can actually get done
- not maximum aspiration

### 5. The system should be useful before it is complete

V1 should already solve:

- capture
- reminders
- task planning
- grounded recall
- research briefs

without requiring:

- full life logging
- heavy passive telemetry
- complex automation graphs

### 6. External apps are sensors and actuators

We read from:

- email
- calendar
- chat channels
- browser shares

We write back carefully:

- notifications
- calendar events
- drafts
- approved messages/actions

Our backend remains the source of truth.

### 7. The assistant should orchestrate, not manually perform every step

For expensive workflows, the assistant should:

- parse intent
- choose a workflow profile
- call a deterministic backend engine
- present and refine the results

This is better than letting the LLM improvise every retrieval, scoring, and ranking step in chat.

## Core Product Loops

There are five loops that should define the product.

## Loop 1: Capture -> Interpret -> Promote

This is the foundation.

### User input examples

- "Purgo prod push"
- "remind me to follow up with Sam next Tuesday"
- pasted giant todo page
- shared article
- voice memo

### System behavior

1. Store raw capture.
2. Split capture into candidate segments.
3. Extract possible entities:
   - tasks
   - people
   - dates
   - projects
   - resources
   - rules/preferences
   - questions
4. Assign confidence.
5. Promote only what requires behavior now.
6. Keep unresolved candidates visible in Inbox if needed.

### Good product behavior

- creates tasks when confidence is high
- asks only one short question when uncertainty blocks a meaningful action
- does not explode every thought into 12 objects

## Loop 2: Plan -> Execute -> Replan

This is the daily-use loop.

### Inputs

- promoted tasks
- reminders
- calendar
- current projects/goals
- estimated effort
- priority and urgency signals

### Outputs

- `Now`
- `Today`
- `This Week`
- warnings about overload
- suggested time blocks
- proposed deferrals

### Good product behavior

- prefers 3 realistic priorities over 20 "important" items
- notices conflicts with calendar
- surfaces blocked items separately
- encourages smaller next steps for fuzzy tasks

## Loop 3: Remember -> Answer -> Show Sources

This is the second-brain loop.

### Example user questions

- what did I decide about X
- what am I waiting on
- what changed since yesterday
- what interview prep items do I already have

### System behavior

1. Retrieve relevant raw captures, promoted objects, resources, and events.
2. Compose a concise answer.
3. Link answer back to supporting source artifacts.
4. Offer next actions when appropriate.

### Good product behavior

- answers from your actual data, not generic speculation
- distinguishes current truth from stale notes
- shows confidence and source support

## Loop 4: Research -> Synthesize -> Operationalize

This is where the product becomes more than a note app.

### Example user requests

- compare two tools
- prepare me for an interview
- track a product or pricing page
- summarize this paper/video/article

### System behavior

1. Create a research run.
2. Resolve entities and choose a workflow profile.
3. Gather sources.
4. Preserve source snapshots or extracted content.
5. Normalize, score, dedupe, and cross-link evidence.
6. Produce grounded synthesis:
   - summary
   - tradeoffs
   - citations
   - open questions
7. Convert outcomes into operational artifacts when useful:
   - tasks
   - reminders
   - watch items
   - decision notes

### Research workflow profiles

The product should not have one generic research mode.

Examples:

- `company_prep`
- `tool_comparison`
- `product_watch`
- `resource_summary`
- `how_to`
- `decision_support`
- `person_brief`

Each profile should change:

- retrieval strategy
- source priority
- freshness rules
- scoring logic
- output format

### Follow-up mode

After a research run, the assistant should stay attached to the evidence bundle from that run.

That means follow-ups should usually:

- reuse the same evidence set
- answer quickly from stored evidence
- only trigger new retrieval when the user requests an update or the evidence is stale

### Good product behavior

- research is not just a chat reply
- it becomes reusable memory plus next actions

## Loop 5: Review -> Learn -> Improve Behavior

This loop makes the system adaptive.

### Time horizons

- end of day
- weekly review
- monthly review

### Review outputs

- what got done
- what slipped
- what is stale
- what goals are drifting
- what reminders were ignored
- what recurring commitments need redesign

### Good product behavior

- highlights patterns, not just counts
- suggests pruning and refocusing
- updates future planning behavior using history

## User-Facing Surfaces

The product should feel coherent across multiple surfaces.

### 1. Chat

Best for:

- capture
- questions
- reminders
- quick planning
- follow-up prompts

Needs:

- source-backed answers
- control cards
- quick actions
- minimal clarification

### 2. Inbox

Best for:

- unresolved captures
- low-confidence parses
- newly shared links/files
- items waiting for promotion or triage

### 3. Today

Best for:

- current priorities
- planned time
- due/urgent reminders
- suggested next actions

### 4. Projects / Goals

Best for:

- long-running efforts
- milestones
- related tasks/resources/notes/people

### 5. Research

Best for:

- source snapshots
- briefs
- comparisons
- open questions
- watchlists

### 6. People

Best for:

- follow-ups
- commitments
- meeting context
- recent interactions

### 7. Reviews

Best for:

- daily/weekly summaries
- drift detection
- pattern recognition

## Recommended Core Objects

These are the minimum meaningful first-class objects.

### 1. Capture

Represents the raw incoming artifact.

Examples:

- chat message
- pasted note dump
- transcript
- URL share
- PDF upload

Fields:

- id
- source_type
- source_channel
- raw_text
- attachment_refs
- created_at
- author
- session/thread reference

### 2. Task

Represents something actionable.

Fields:

- id
- title
- status
- priority
- due_at
- planned_for
- estimate_minutes
- energy_level
- project_id
- source_capture_id
- confidence
- waiting_on_person_id
- parent_task_id

### 3. Reminder

Represents a scheduled or condition-based nudge.

Fields:

- id
- object_type
- object_id
- trigger_type
- trigger_at
- repeat_rule
- escalation_policy
- snooze_state
- delivery_channel
- source_reason

### 4. Project

Represents a multi-step effort.

Fields:

- id
- title
- status
- horizon
- goal_id
- owner
- active
- notes_summary

### 5. Resource

Represents a webpage, PDF, video, file, or imported document.

Fields:

- id
- kind
- original_url
- file_ref
- title
- extracted_text_ref
- snapshot_ref
- source_capture_id
- metadata

### 6. Person

Represents a person the assistant should track.

Fields:

- id
- name
- aliases
- contact_methods
- relationship_tags
- notes_summary
- last_interaction_at

### 7. Event

Represents a meeting or scheduled event.

Fields:

- id
- title
- starts_at
- ends_at
- attendees
- source_calendar_ref
- linked_project_id
- linked_resource_ids

### 8. Rule

Represents explicit user preference or assistant behavior.

Examples:

- explain the problem before coding
- check constraints
- start with brute force first

Fields:

- id
- scope
- instruction
- priority
- source_capture_id
- active

### 9. Memory Item

Represents curated or derived memory beyond raw captures.

Examples:

- decision summary
- stable preference
- biography-like user fact
- long-term project context

Fields:

- id
- type
- content
- source_refs
- confidence
- last_verified_at

## Soft Types For V1

These should exist conceptually but do not need hard schema-first treatment yet.

- Idea
- Interview
- Application
- Habit
- ResearchTopic
- Decision
- Commitment
- WatchItem

They can begin as:

- labels
- subtypes
- projections
- relation patterns

Then graduate to first-class objects if usage proves it.

## Relationship Model

Objects need a graph layer.

Recommended relation types:

- `derived_from`
- `related_to`
- `belongs_to`
- `supports_goal`
- `blocked_by`
- `waiting_on`
- `mentions_person`
- `used_in_event`
- `summarizes`
- `source_for`

The graph matters because the user wants answers like:

- what should I do for this interview tomorrow
- what am I waiting on from Daud
- which resources support this project idea

Those are graph questions, not folder questions.

## Assistant Decision Policy

The assistant needs clear behavioral rules.

### When to create a task automatically

Create automatically when:

- the input is clearly actionable
- the action matters soon or materially
- the parse confidence is high

Do not auto-create when:

- the line is clearly a resource only
- the thought is just an idea with no immediate action
- the item is a person mention without context

### When to ask a question

Ask only if:

- date/time ambiguity blocks a reminder
- object identity ambiguity blocks linking
- an external write action would be risky

Question style:

- one short clarifying question
- ideally with a suggested default

### When to create reminders

Create reminders when:

- user explicitly asks
- a due date exists
- a commitment is inferred
- a meeting/interview/date-sensitive item is near

Reminder logic should support:

- pre-reminders
- same-day reminders
- escalation for repeated snoozes
- follow-up reminders for waiting-on items

### When to run research

Run research when:

- the user explicitly asks
- the assistant lacks enough context to advise well
- the question depends on external current facts

Research outputs should become reusable artifacts, not only chat text.

## Context Assembly

This is one of the most important design areas.

The assistant should not see everything every time.

Instead, assemble context from layers:

### 1. Global stable context

- active rules/preferences
- user identity basics
- core long-term memory

### 2. Situational context

- active projects
- today's tasks
- upcoming events
- waiting-on items

### 3. Query-local context

- related captures
- linked resources
- recent conversations
- relevant people

### 4. External current context

- calendar
- email
- web research when needed

The system should also preserve a source map so the answer layer can explain where context came from.

## How The Product Should Handle The Todo-Page Example

When the user pastes the messy page:

1. Store it as one raw capture.
2. Segment it by bullets/lines/sections.
3. Extract candidates:
   - work tasks
   - interview prep
   - job search items
   - links/resources
   - people mentions
   - assistant rules
   - imported review/action items
4. Promote:
   - urgent/time-bound tasks
   - interview-prep project for tomorrow
   - resources into a reading/research queue
   - explicit assistant rules
5. Leave low-confidence people mentions unresolved until linked.
6. Offer a summary like:
   - I found 7 likely tasks, 12 resources, 8 people mentions, 3 assistant rules, 4 project ideas

That is much better than flattening the page into a list of tasks.

## Notification And Reminder Design

The system should not feel like a dumb alarm app.

### Types of reminders

- time-based
- event-relative
- follow-up based
- condition-based
- recurring routine

### Reminder examples

- remind me tomorrow morning about Palo Alto prep
- remind me 30 minutes before the call
- remind me in 3 days if Sam has not replied
- remind me about driving test paperwork this weekend

### Good reminder behavior

- short reason attached
- link back to source/task/project
- easy snooze options
- learn from snooze history

### Bad reminder behavior

- repeated spam
- no context
- no path to convert reminder into action

## Research System Design

Research should have its own lifecycle.

### Research object lifecycle

1. user asks question or saves source
2. create research run
3. gather and snapshot sources
4. extract facts/claims/questions
5. produce brief
6. attach next actions
7. store in memory/research view

### Research outputs should include

- answer summary
- key tradeoffs
- source links
- claim snippets
- open questions
- suggested next steps

### Types of research we should support

- interview/company prep
- tool comparison
- technical concept research
- product/page tracking
- document corpus synthesis

## Trust And Explainability

The product must feel trustworthy.

### Trust features

- every promoted object links to source
- reminders explain why they exist
- answers link to evidence
- external actions require approval by default
- ambiguous parses stay tentative

### UI implications

- source chips on answers
- "created from" links on tasks
- confidence indicators on tentative items
- audit/history on promoted actions

## OpenClaw Role In The Product

OpenClaw should sit at the runtime/interface layer.

### Good use of OpenClaw

- chat surfaces
- transport
- channel plugins
- routing
- tool execution
- hooks
- context engine integration

### What not to delegate to OpenClaw

- canonical object model
- business rules for reminders/planning
- full long-term product memory
- main product UI

## Suggested V1

V1 should focus on the smallest loop that still feels magical.

### V1 capabilities

- chat/voice/link capture
- raw capture preservation
- candidate extraction and selective promotion
- task/reminder/project basics
- Today / Inbox / Research views
- source-backed Q&A
- manual and automatic reminders
- basic interview/company prep research

### V1 integrations

- OpenClaw as assistant shell
- one notification channel
- calendar read access
- email read access
- web research

### V1 non-goals

- full passive life tracking
- heavy browser automation
- full team collaboration
- every possible object type

## Suggested V2

Add after the core loop works:

- people/relationship memory
- commitment and waiting-on tracking
- smarter recurring routines
- watchlists for products/pages/docs
- daily and weekly reviews
- richer multi-agent routing
- stronger context engine
- mobile-native packaging

## Suggested V3

Only later:

- passive activity tracking
- deeper health/life analytics
- advanced browser automations
- custom local model routing
- self-improving agent workflows

## Architecture Shape

At a high level:

1. Capture service
2. Extraction / interpretation service
3. Object store + graph layer
4. Reminder / job engine
5. Research pipeline
6. Retrieval / memory service
7. OpenClaw plugin + skill layer
8. Product UI

## Most Important Build Rule

Do not start by building:

- a full editor
- a full note workspace
- a fully generalized life database

Start by building the assistant loops:

- capture
- promote
- remind
- answer
- plan
- research

If those loops are excellent, the product will feel coherent.

If those loops are weak, no amount of UI polish or schema depth will save it.

## Immediate Next Step

The next design artifact should be a concrete technical spec covering:

- schema
- service boundaries
- job model
- OpenClaw integration surface
- API/tool definitions
- v1 screens and flows
