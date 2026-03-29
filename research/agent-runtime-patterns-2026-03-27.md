# Agent Runtime Patterns From The Finance Research Agent Example

Last updated: 2026-03-27

## Purpose

This document captures the architectural ideas from the finance research agent example the user shared.

The value of that system is not "it has many sources." The value is that it combines:

- lightweight LLM orchestration
- deterministic retrieval and scoring
- query-type-aware source strategies
- persistent research memory

That makes it a very strong reference for how our assistant should behave when it enters research-heavy or investigation-heavy modes.

## Main Takeaway

The strongest pattern is a two-layer execution model:

- layer 1: prompt-driven orchestration
- layer 2: deterministic engine(s) for expensive retrieval, enrichment, normalization, scoring, and memory

This is much better than one giant autonomous agent loop.

For our product, that means:

- the assistant should decide intent, show the user its interpretation, and choose a workflow
- the heavy lifting should happen in typed backend jobs and source adapters

## Best Patterns To Borrow

## 1. Explicit intent parse before action

The example forces an explicit parse into fields like:

- topic
- target tool
- query type

before expensive work starts.

### Why this matters

- it creates a lightweight plan without a separate planner model
- it reduces accidental wrong-tool calls
- it lets the assistant explain what it thinks the user wants

### How we should adapt it

Before running any non-trivial workflow, our assistant should produce an internal or user-visible parse like:

- `intent`
- `primary_subject`
- `secondary_subjects`
- `query_profile`
- `time_horizon`
- `required_tools`
- `expected_outputs`
- `needs_approval`

Example:

`Tmrw - Palo Alto Networks - intro, values, behavioral, questions to ask`

should become something like:

- `intent`: interview_prep
- `primary_subject`: Palo Alto Networks
- `time_horizon`: tomorrow
- `query_profile`: company_prep
- `expected_outputs`: brief, question bank, reminders, prep checklist

## 2. One heavy deterministic call is often better than many tiny agent steps

The example uses the host agent mainly as an orchestrator and delegates actual retrieval to one large Bash/Python tool call that does parallel work internally.

### Why this matters

- better latency
- less token waste
- more predictable retries
- easier observability

### How we should adapt it

Our assistant should not individually call:

- search web
- search Reddit
- search YouTube
- search docs
- dedupe
- rerank

through repeated LLM turns unless needed.

Instead it should call backend workflows like:

- `run_research_profile`
- `prepare_company_brief`
- `compare_options`
- `build_product_watch_digest`
- `summarize_resource_bundle`

Each workflow can fan out internally across adapters.

## 3. Retrieval quality comes from staged evidence processing

The example runs a pipeline closer to:

1. fetch
2. enrich
3. normalize
4. hard date filter
5. score
6. sort
7. dedupe
8. relevance filter
9. cross-link corroboration

### Why this matters

This is exactly why the output feels more reliable than "agent did some searches."

### How we should adapt it

Our research engine should use the same idea:

1. collect raw results
2. enrich per source
3. normalize into a shared evidence model
4. hard filter by date/time constraints where applicable
5. apply profile-aware scoring
6. dedupe and cluster
7. cross-link related items across sources
8. build a brief from the cleaned evidence set

This should happen in backend code, not just prompting.

## 4. Query profile should change sources and ranking

The finance agent changes source mix and ranking logic by query type.

### Why this matters

A "how to do X" query should not be researched the same way as:

- breaking news
- company prep
- product tracking
- tool comparison
- sentiment/opinion gathering

### How we should adapt it

We should define first-class research profiles such as:

- `company_prep`
- `person_brief`
- `tool_comparison`
- `decision_support`
- `how_to`
- `breaking_update`
- `product_watch`
- `resource_summary`
- `career_outreach`

Each profile should control:

- source adapters used
- query templates
- date filtering strictness
- scoring weights
- output format

## 5. Preflight entity resolution is extremely valuable

The example does a cheap preflight search to resolve official handles before deeper retrieval.

### Why this matters

A lot of high-signal content references:

- handles
- repo names
- abbreviations
- product nicknames

instead of the canonical full name.

### How we should adapt it

Before research on an entity-like subject, run a cheap resolver that tries to find:

- official website/domain
- GitHub org or repo
- LinkedIn company/person
- X handle if relevant
- common aliases
- subreddit/community if relevant

That resolved identity should feed later searches and also become part of our long-term entity memory.

## 6. Phase-2 drilling is one of the best "agentic" ideas here

The example does second-pass searches based on entities extracted from first-pass results.

### Why this matters

This gives the system a way to expand intelligently without pretending to be fully autonomous.

### How we should adapt it

After first-pass evidence collection, our engine should be able to extract:

- people
- companies
- products
- URLs
- repos
- documents
- tags/keywords

and optionally run targeted second-pass retrieval on those.

This is especially useful for:

- interview prep
- product/company tracking
- project research
- person/context gathering

## 7. Comparison mode should be an explicit workflow

The example treats comparison as multiple passes:

- research A
- research B
- research A vs B

### Why this matters

Comparison quality collapses when it is just one vague prompt.

### How we should adapt it

Our comparison workflows should use a fixed shape:

1. build evidence set for option A
2. build evidence set for option B
3. run contrast analysis over both
4. build side-by-side output with criteria
5. suggest next experiments or decisions

This should power queries like:

- Claude Code vs Codex
- pgvector vs external vector DB
- local LLM vs hosted model
- job option A vs job option B

## 8. Follow-up mode should reuse the evidence state

The example stays in "expert mode" after research and answers follow-ups from accumulated evidence.

### Why this matters

This is a huge UX win. Re-running search on every follow-up is slow, expensive, and inconsistent.

### How we should adapt it

Each research run should produce a reusable evidence bundle:

- normalized evidence items
- extracted entities
- final brief
- reasoning trace or step log

Follow-ups should first try to answer from that bundle until:

- the evidence is stale
- the user asks for an update
- confidence drops below threshold

## 9. Persistent research memory is a real feature, not just storage

The open variant in the example adds:

- watchlists
- briefings
- historical query
- SQLite-backed persistent store
- dedupe and full-text search

### Why this matters

This is how research stops being disposable chat output.

### How we should adapt it

We should add a research memory subsystem with:

- saved runs
- saved evidence bundles
- watchlists
- scheduled briefings
- history search
- URL/evidence dedupe

This sits nicely beside the broader personal memory system.

## 10. Retrieval evaluation should be built in early

The example even includes search-quality evals.

### Why this matters

Without evals, research quality gets tuned by vibes.

### How we should adapt it

We should build a small eval harness early for:

- top-k relevance
- citation coverage
- freshness correctness
- duplicate rate
- answer usefulness

This can start with a small hand-built set of scenarios from your real workflows.

## How This Changes Our Product Design

## 1. The assistant should have workflow profiles, not one generic "research mode"

We should add a `workflow_profile` concept that can be selected by the orchestrator.

Examples:

- `capture_promote`
- `task_triage`
- `company_prep`
- `tool_comparison`
- `product_watch`
- `resource_digest`
- `decision_support`
- `waiting_on_review`

## 2. We should split assistant logic into orchestrator vs engines

### Orchestrator responsibilities

- parse user intent
- show understanding
- choose workflow profile
- request approval if needed
- present results
- handle follow-up conversation

### Engine responsibilities

- search and retrieval
- source-specific enrichment
- scoring and ranking
- dedupe and clustering
- snapshotting
- brief generation
- reminder/task creation side effects

## 3. Research runs should store more than final briefs

Our current plan already had `research_runs` and `research_steps`.

This example suggests we should also store:

- `query_profile`
- `resolved_entities`
- `evidence_items`
- `evidence_clusters`
- `search_variants`
- `freshness_window`
- `followup_mode_state`

## 4. Follow-up conversations should bind to a run or evidence bundle

If the user asks:

- "go deeper on this"
- "what did people on Reddit say"
- "which one is better for my use case"

the assistant should continue from the existing evidence bundle rather than restart from scratch.

## 5. Watchlists and briefings should grow out of research, not be separate products

If a user researches:

- a company
- a product
- a topic
- a person

the assistant should be able to say:

- save this as a watchlist?
- send me a weekly briefing?
- remind me when something materially changes?

That connects research directly to ongoing assistance.

## Concrete Additions We Should Make

## Add to the schema

- `workflow_profiles`
- `research_resolved_entities`
- `research_evidence_items`
- `research_evidence_links`
- `research_followup_sessions`
- `watchlists`
- `briefing_jobs`
- `eval_runs`

## Add to the backend

- preflight entity resolver
- query-profile router
- source adapter layer
- evidence scoring pipeline
- second-pass drilldown stage
- comparison workflow
- follow-up-over-evidence mode
- retrieval eval harness

## Add to the assistant behavior

- always interpret intent before expensive workflows
- show the parse when useful
- prefer one backend workflow call over many tiny agent calls
- keep follow-ups grounded in the last evidence bundle

## Final Take

This example is important because it shows a practical middle ground between:

- brittle deterministic tools
- over-ambitious autonomous agents

The winning pattern for our product is:

- LLM as orchestrator
- backend workflows as engines
- evidence bundles as the unit of research memory
- follow-up mode over stored evidence
- watchlists and briefings as natural continuations of research

That should become part of our core application design, not just an optional research feature.
