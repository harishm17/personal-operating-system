# Product Brief

Last updated: 2026-03-27

## Goal

Build a code-first personal assistant and second-brain system that is:

- easy to capture into from chat, voice, and quick share flows
- intelligent enough to turn messy input into useful actions
- aware of context from email, calendar, files, resources, and prior history
- capable of reminders, planning, research, advice, and follow-through
- owned by us end-to-end rather than layered on top of Notion or Todoist

## Product Shape

The product should feel like:

- one inbox
- one brain
- one assistant
- many generated views

It should not feel like:

- separate notes app + separate todo app + separate research app
- a text dump with AI chat bolted on
- a rigid database the user has to maintain manually

## Core Behaviors

When the user types or speaks something, the system should be able to:

- capture it without friction
- understand whether it is actionable, informational, contextual, or unresolved
- create tasks/reminders only when appropriate
- run research when needed
- surface relevant prior context automatically
- answer follow-up questions from grounded memory
- advise on priorities and next steps

## Explicit Constraints

- Do not use Notion as the core product.
- Do not use Todoist as the core product.
- Borrow product patterns from existing tools, but implement our own system.
- OpenClaw is acceptable as an access layer or shell.
- Prefer code-first components over no-code orchestration.

## Strong Product Hypothesis

The right architecture is not "everything becomes a typed object immediately."

Instead:

1. Keep raw capture intact.
2. Extract candidate structure.
3. Promote only the parts that need operational behavior.
4. Generate views, reminders, and plans from the promoted layer.

## What Must Work Well

- raw capture from messy notes/chat/voice
- grounded recall with source provenance
- smart reminders and follow-ups
- realistic daily planning
- project and goal awareness
- people and commitments tracking
- resource ingestion and research
- assistant rules/preferences that shape behavior over time

## Initial External Inputs / Outputs

Likely inputs:

- chat UI
- voice notes
- links / PDFs / uploads
- calendar
- email
- browser share / extension

Likely outputs:

- reminders / notifications
- suggested plans
- drafts
- scheduled research reports
- approved external actions

## Product Rule

Chat is capture.

Objects are truth.

Time is a first-class lens.

The assistant answers from source-backed memory, not vague summaries.
