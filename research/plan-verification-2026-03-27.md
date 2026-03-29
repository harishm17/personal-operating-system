# Master Plan Verification Notes

Last updated: 2026-03-27

## Purpose

This memo rechecks `master-build-plan-2026-03-27.md` against the current research set.

The goal is to catch places where the master plan drifted from the deeper research on:

- ontology
- storage layers
- runtime architecture
- integrations
- OpenClaw integration seams
- interaction behavior

## Verification summary

The plan direction is correct.

The strongest validated decisions are still:

- small universal root ontology
- raw capture separated from promoted entities
- research as bounded workflow engines, not one generic autonomous agent
- explicit integration substrate with approvals
- OpenClaw as shell/runtime surface, not source of truth

## Gaps found and corrected

### 1. Storage layering had drifted

Problem:

- the research converged on 5 storage layers
- the master plan had collapsed this to 4 by combining temporal/event history with runtime state

Why it matters:

- event history and runtime state age differently
- replayability and inspection are easier when event logs are explicit
- this was one of the clearest findings from the storage research pass

Correction:

- restored a distinct `temporal and event layer`
- kept `assistant and runtime state` separate

### 2. Capture event history was under-modeled

Problem:

- the technical spec and integration research called out `capture_sessions`, `capture_events`, and `capture_parts`
- the master plan only had `captures` and `capture_segments`

Why it matters:

- multi-surface ingest needs replayable session and event history
- browser, chat, and later voice capture should normalize into one event model

Correction:

- added `capture_sessions`, `capture_events`, and `capture_parts` to the plan
- added session/event services and verification language to Task 3

### 3. Reminder history was incomplete

Problem:

- the technical spec explicitly included `reminder_events`
- the master plan only mentioned `reminders` and `reminder_deliveries`

Why it matters:

- snooze/escalate/complete/defer behavior needs inspectable state transitions
- reviews depend on more than deliveries alone

Correction:

- added `reminder_events` to the plan and task breakdown

### 4. Procedural assistant memory was too implicit

Problem:

- the research clearly separated working memory, long-term memory, and procedural/assistant-rule memory
- the master plan did not represent `procedural_rules` separately

Why it matters:

- assistant behavior rules should not get mixed into user long-term memory retrieval
- OpenClaw context assembly should be able to pull these separately

Correction:

- added `procedural_rules` to retrieval/memory task planning
- made the separation explicit in the task steps

### 5. Integration tagging was not explicit enough

Problem:

- integration research called for `connection_tags or equivalent metadata`
- the plan only named `connections`

Why it matters:

- reconnect, workspace reconciliation, and capability scoping are easier with explicit tags

Correction:

- added `connection_tags` to the runtime layer and integration substrate task

### 6. OpenClaw context-engine seam was missing from implementation tasks

Problem:

- OpenClaw research identified the context engine and memory slot as important integration seams
- the master plan only covered tools and session binding

Why it matters:

- without a context-engine path, OpenClaw can drift toward its default markdown-memory behavior instead of our backend memory model

Correction:

- added an explicit `context-engine` file and task language under the OpenClaw integration work


### 7. Explicit intent parsing is now represented in research workflows

Problem:

- runtime research emphasized an explicit intent parse before expensive workflows
- the plan described workflow profiles but did not name an intent-parser artifact in the task breakdown

Why it matters:

- this is how the assistant explains what it thinks the user wants
- it also reduces accidental wrong-profile execution

Correction:

- added an explicit `intent-parser` file and task language in the research workflow section

### 8. Inbox behavior is now tied back to approvals and degraded integrations

Problem:

- interaction research said inbox should include approval requests and broken integrations
- the plan had `inbox_items`, but the integration task did not explicitly route these states into inbox

Why it matters:

- the inbox should be the human control surface for operational exceptions

Correction:

- added explicit inbox surfacing language to the integration substrate task

## Strengthened v1 commitments

The master plan now treats the following as explicit v1 requirements rather than deferred quality gaps:

- offline-safe single-user capture with local outbox and replay
- contact enrichment and identity resolution with explicit merge controls
- opt-in passive telemetry with isolated storage and compaction
- OpenClaw context-engine and memory-slot integration, not only plugin tools
- a fuller initial research profile set and explicit intent parsing

## Remaining true boundaries

These are still intentionally outside v1, but they are separate product lines or significantly larger distributed-systems work rather than hidden quality gaps:

- full collaborative or CRDT-style local-first sync across devices
- aggressive autonomous browser automation without approvals
- native mobile apps before web/PWA and extension quality is strong
- local model routing as a required first-release capability

## Current assessment

After strengthening v1, the master plan now reflects the highest-value findings from the research set without leaving the major assistant-quality gaps pushed to "later." No known quality-critical planning gaps remain from the current research set.

The next work should be narrower execution plans, not another broad planning reset.
