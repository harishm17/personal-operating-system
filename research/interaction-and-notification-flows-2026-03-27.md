# Interaction and Notification Flows

Last updated: 2026-03-27

This memo translates the integration findings into product behavior.

The central question is:

If we build the integration substrate correctly, how should the app actually feel to use across chat, browser, web, mobile, reminders, approvals, and follow-ups?

## Big conclusion

The assistant will feel intelligent only if these three things happen together:

1. capture is faster than opening a traditional app
2. planning/reminders are grounded in real external context
3. external writes stay visible and approval-backed

A lot of personal assistant products fail because they nail only one of those.

## What current products and repos imply about UX

Borrowed patterns from the repo/code pass:

- `Chatwoot`: normalize many channels into one durable conversation model
- `Novu`: treat in-app, push, email, and chat as channels of one notification system
- `ntfy`: installed PWA + push + quick actions matter more than fancy UI chrome
- `Karakeep`: browser extension save must be immediate, enrichment can wait
- `Ryot`: browser extension and webhook ingestion can be first-class inputs
- `Activepieces`: approvals and manual work items belong in inboxes, not hidden runtime state

## Product surfaces we should design around

### 1. Chat surface

Examples:

- OpenClaw
- first-party web chat
- eventual Telegram/Slack/WhatsApp surfaces

Best use cases:

- messy brain dumps
- quick tasks
- reminders
- ask-the-assistant questions
- follow-up approvals

### 2. Browser extension

Best use cases:

- save page
- save link
- save selection text
- capture image or screenshot context
- quick “remind me about this later” flow

### 3. Web/PWA app

Best use cases:

- Inbox triage
- Today planning
- research review
- connection setup
- approval review
- deep editing when needed

### 4. Mobile capture and reminders

Best use cases:

- voice notes
- share sheet captures
- installable PWA with push notifications
- quick approval/reject/defer actions

## Core screen/behavior model

### Inbox

Inbox is not just tasks.

It should contain:

- new raw captures
- extracted-but-unconfirmed candidates
- approval requests
- broken integrations needing reconnection
- newly ingested resources needing review
- stale follow-ups that need a human decision

Each inbox item should answer:

- what came in
- what the assistant inferred
- what action is being suggested
- what can be done in one tap

### Today

Today should feel like a control center, not a list.

It should show:

- top 3 suggested tasks
- hard-timed commitments from calendar
- urgent reminders
- waiting-on items worth nudging
- approvals blocking work
- “if you only do one thing next” suggestion

### Research

Research should separate:

- raw saved resources
- active research runs
- briefs
- follow-up questions over prior evidence

### People

People should show:

- who matters right now
- who you owe something to
- who owes you something
- recent messages and meetings
- commitments and next follow-up point

### Integrations / Notifications

This needs to be a real surface in v1.

It should show:

- connected accounts
- scopes/capabilities granted
- sync health
- last sync and next sync
- broken/revoked connections
- notification endpoints and delivery preferences

## Concrete interaction flows

### Flow 1: messy chat capture

Input:

`Need to follow up with Sam about the deck, also prep for Palo Alto tomorrow, and save this article for later`

Expected behavior:

1. raw capture is stored immediately
2. assistant extracts:
   - follow-up task for Sam
   - interview-prep task for Palo Alto with date context
   - resource/save intent for the article
3. if confidence is high:
   - task and reminder are promoted automatically
4. user sees a compact confirmation summary, not a giant form

Important UX rule:

- chat capture should not block on perfect classification

### Flow 2: browser extension save

User action:

- right-click link, page, image, or selected text

Expected behavior:

1. save occurs immediately
2. page opens to a compact “saved” state or returns silently
3. background jobs do extraction, readability, screenshot/archive, tagging, and task detection
4. saved item appears in Inbox or Research depending on what it is

Important UX rule:

- browser capture must complete in under a few seconds even if enrichment takes much longer

### Flow 3: reminder with escalation

User input:

`Remind me to email the recruiter if I haven’t heard back by Tuesday`

Expected behavior:

1. create internal reminder and optional waiting-on object
2. on Tuesday, send a reminder to the preferred channel
3. if ignored, move it into Today and propose a draft
4. if still ignored, ask whether to snooze, drop, or draft now

Important UX rule:

- snooze history should change the strategy; repeated identical nudges are bad UX

### Flow 4: approval-backed write

User input:

`Schedule a 30-minute catch-up with Sathish next week`

Expected behavior:

1. assistant proposes 2-3 likely windows from calendar context
2. creates `action_request` with preview
3. approval notification appears in chat/web/push
4. user approves
5. calendar event is created
6. the created event links back to the internal entity and external object ref

Important UX rule:

- approval payloads should preview the exact external action

### Flow 5: email follow-up support

User input:

`What am I waiting on right now?`

Expected behavior:

1. inspect internal waiting-on state
2. enrich with recent synced email/calendar context
3. produce a short ranked list
4. offer draft follow-up actions where relevant

Important UX rule:

- answers should cite the source thread/meeting, not just assert things vaguely

### Flow 6: meeting prep

User opens a calendar event.

Expected behavior:

- assistant shows:
  - attendees resolved to People
  - prior conversations/emails if connected
  - related project/task context
  - open commitments and suggested agenda

Important UX rule:

- calendar should become context, not another isolated app section

### Flow 7: mobile voice capture

User records a voice memo.

Expected behavior:

1. upload audio immediately
2. create raw capture entry
3. background transcription and segmentation
4. extracted tasks/ideas/reminders appear in Inbox
5. original audio always remains attached for audit and re-parse

Important UX rule:

- preserve the original recording and transcript side by side

## Notification design

### Notification channels

The product should think in terms of endpoint types:

- `IN_APP`
- `WEB_PUSH`
- `NTFY`
- `EMAIL`
- later: `CHAT_DM`, `SMS`, `VOICE_CALL`

### Notification types

We should distinguish at least:

- `REMINDER`
- `APPROVAL_REQUEST`
- `FOLLOW_UP_NUDGE`
- `RESEARCH_COMPLETE`
- `SYNC_BROKEN`
- `DIGEST`

### Delivery principles

1. Every important notification should deep-link into one internal object.
2. Approval and reminder notifications should support quick actions.
3. In-app inbox is the canonical delivery log; push/email/chat are projections.
4. Quiet hours and timezone awareness are mandatory.
5. Failed deliveries should fall back to a secondary channel when appropriate.

### Suggested v1 delivery policy

- all approvals: in-app + push if available
- urgent reminders: in-app + push/ntfy
- routine reminders: in-app only unless user opted in
- broken connections: in-app + email
- research complete: in-app only by default

## Approval UX

Approval items should behave like tasks with higher visibility.

Each approval card should include:

- intent summary
- triggering context
- exact action preview
- target connection/provider
- approve
- reject
- remind me later

For approval from push or email:

- action should deep-link into the app
- if safe and authenticated, quick approve should also be possible directly

## Reminder UX

### Reminders should have modes

- `gentle`
- `normal`
- `persistent`
- `deadline`

### Reminder state should be visible

Each reminder should show:

- what it is attached to
- why it exists
- when it last fired
- how it will escalate next

### Quiet hours and context

The engine should consider:

- local timezone
- current working hours
- meeting state from calendar
- recent snooze behavior
- endpoint availability

## Accessibility and reachability

The assistant will fail if it is only good inside one desktop web page.

Minimum acceptable accessibility for v1:

- web app
- OpenClaw/chat access
- browser extension
- installable PWA
- push or ntfy notifications
- mobile share/voice capture path

## UX implications for implementation order

If we want the product to feel real quickly, the best UX-first order is:

1. Inbox and Today in the web app
2. OpenClaw/session binding
3. browser extension save flow
4. notification endpoints + push/ntfy delivery
5. approval cards and action requests
6. Gmail/Calendar context shown inside Today/People, not as isolated admin screens

## Open UX questions

These are now narrower and healthier than before:

- Should approvals support one-tap execution directly from push/email in v1, or only deep-link into the app?
- Should browser extension save open a popup every time, or support a silent-save mode?
- Should chat confirmations be inline and minimal by default, with “show details” expansion?
- Should we expose notification channel rules to users in v1, or keep them opinionated and simple first?

## Biggest product lesson from this pass

Integrations should mostly disappear into the user experience.

What the user should feel is:

- I can tell it anything quickly
- it remembers and organizes without forcing forms
- it notices important outside context
- it reminds me in the right place
- it never takes risky outside actions silently

That is the actual UX bar for the product. Everything else is implementation detail.
