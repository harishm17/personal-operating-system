# Calendar Integration RFC (V1)

Last updated: 2026-03-27

## Purpose

Define the first shippable calendar integration for the assistant.

This integration should make the assistant better at:

- understanding hard commitments
- proposing realistic daily plans
- preparing for meetings
- scheduling approval-backed events
- grounding reminders and follow-ups in time

It should not become a full calendar product.

## Goals

- Connect Google Calendar in read-only mode first.
- Import enough event context to power Today, Agenda, and meeting prep.
- Support approval-backed create and update flows later.
- Preserve provider metadata needed for optimistic concurrency and reconciliation.
- Make recurring sync failure and token invalidation visible and recoverable.

## Non-goals

- Full calendar UI parity with Google Calendar
- Rich recurring-rule authoring in v1
- Auto-scheduling without explicit approval
- Multi-calendar conflict resolution across many providers in the first cut

## Provider identity

- `provider_key = google_calendar`
- primary read capability: `calendar.events.read`
- write capabilities:
  - `calendar.events.create`
  - `calendar.events.update`

## Scope strategy

Phase 1 scope:

- `https://www.googleapis.com/auth/calendar.readonly`

Phase 2 scope escalation for create and update:

- `https://www.googleapis.com/auth/calendar.events`

Rules:

- read-only by default
- escalate scopes only when the user wants assistant-created or assistant-updated events
- store scope tier in `connections.connection_metadata_json`

## Connection flow

1. User connects Google Calendar from Integrations.
2. App creates pending `connections` row and OAuth session.
3. Callback writes credential set and validates account.
4. App records calendar metadata such as primary calendar ID and timezone.
5. Bootstrap sync starts immediately.

Suggested connection metadata:

```json
{
  "primary_calendar_id": "primary",
  "account_email": "me@example.com",
  "calendar_timezone": "America/Chicago",
  "mode": "READ_ONLY"
}
```

## Sync strategy

### Stream

- `stream_key = google_calendar.primary`
- cursor uses Google Calendar `syncToken`

### Bootstrap strategy

Calendar v1 should use a bounded planning window with periodic re-bootstrap, not a permanent whole-history import.

Recommended bootstrap window:

- `timeMin = now - 30 days`
- `timeMax = now + 180 days`
- `singleEvents = true`
- `showDeleted = true`

Why this choice:

- it matches the assistant's real planning horizon
- it avoids syncing years of irrelevant history
- it makes Today and meeting prep useful quickly

Tradeoff:

- moving windows and sync tokens are awkward together
- when the anchor window shifts materially, we should perform a fresh bootstrap and replace the stored token

Recommended rule:

- keep the current planning window anchored for one day
- run incremental syncs within that anchored window
- once per day, perform a fresh bounded bootstrap and replace the token and window metadata

### Incremental sync

Normal incremental flow:

1. read `sync_cursors.checkpoint_json.syncToken`
2. call Calendar list API with the stored anchored window parameters
3. apply upserts and deletions
4. store returned `nextSyncToken`

Failure rule:

- if Google Calendar returns `410 Gone`, mark `full_resync_required = true` and enqueue a fresh bootstrap

### Push strategy

Not required in the first stable release.

Reason:

- Calendar push channels do not renew themselves
- notifications carry headers only, so sync still needs to run
- bounded periodic incremental sync is enough for v1 planning quality

## Data mapping

### Canonical mapping

Calendar events should map directly into internal `events` entities.

`events` mapping:

- `starts_at`
- `ends_at`
- `location`
- `calendar_source = GOOGLE`
- `external_event_ref` mirrors provider event ID for convenience

`external_object_refs` mapping:

- one row per imported calendar event
- `object_type = google_calendar_event`
- store `etag` for conflict-safe writes

Suggested event metadata payload:

```json
{
  "calendar_id": "primary",
  "status": "confirmed",
  "html_link": "https://calendar.google.com/...",
  "attendees": [
    {
      "email": "sathish@example.com",
      "displayName": "Sathish",
      "responseStatus": "accepted"
    }
  ],
  "organizer": {
    "email": "me@example.com"
  },
  "conference_data": {
    "hangoutLink": "https://meet.google.com/..."
  },
  "recurrence": null
}
```

### People enrichment

For each event:

- resolve attendees by email into `people`
- update `people.last_interaction_at`
- keep unresolved attendees in event metadata until a `Person` exists or resolution succeeds

### Calendar-derived signals

Calendar sync should generate helpful context signals, not many automatic tasks.

Examples:

- upcoming interview tomorrow
- meeting with no prep notes and high importance
- travel or deadline-related event nearing
- meeting missing a follow-up reminder

Those signals should create `InboxItem` or reminder candidates, not immediate forced tasks.

## Recurring events policy

Recurring events are the messiest part of calendar integration. V1 should stay pragmatic.

Rules:

- import instances as returned by the bounded `singleEvents = true` read shape
- preserve original recurring metadata in event metadata when present
- do not attempt full internal recurrence modeling in v1
- create and update flows should allow simple one-off events first

This keeps the planning experience useful without turning the app into a recurrence engine.

## Action support

### Event creation

User request example:

- `Schedule a 30-minute catch-up with Sathish next week`

Flow:

1. assistant proposes candidate windows from internal calendar context
2. provider adapter builds a preview payload
3. `ActionRequestService` stores preview and requires approval
4. user approves
5. adapter creates event
6. internal `events` row and `external_object_refs` row are upserted from provider response

### Event update

User request examples:

- `Move the KT session to Friday at 3`
- `Add Vasanth to the meeting`

Rules:

- update preview must show before and after state
- execution should use stored `etag` or If-Match semantics
- if provider rejects due to stale `etag`, the assistant must re-fetch and ask for re-approval

### Event deletion or cancellation

Not in the first write rollout unless explicitly requested later.

V1 write support should start with create and limited update only.

## Action preview shape

Suggested create preview:

```json
{
  "action": "calendar.events.create",
  "calendar_id": "primary",
  "title": "KT with Sathish",
  "starts_at": "2026-04-02T15:00:00-05:00",
  "ends_at": "2026-04-02T15:30:00-05:00",
  "attendees": ["sathish@example.com"],
  "location": null,
  "conference": false,
  "risk_summary": "Creates a visible calendar event"
}
```

Suggested update preview:

```json
{
  "action": "calendar.events.update",
  "event_id": "abc123",
  "before": {
    "starts_at": "2026-04-02T14:00:00-05:00",
    "ends_at": "2026-04-02T14:30:00-05:00"
  },
  "after": {
    "starts_at": "2026-04-02T15:00:00-05:00",
    "ends_at": "2026-04-02T15:30:00-05:00"
  },
  "risk_summary": "Updates an existing calendar event"
}
```

## Sync schedule

Recommended v1 schedule:

- bootstrap immediately on connect
- incremental sync every 5 minutes while healthy
- forced daily bootstrap to refresh bounded window and replace token
- manual refresh available on Today, event detail, and Integrations views

## Failure modes

### Auth failure

- mark connection `REQUIRES_REAUTH`
- stop sync
- show reconnect item in Inbox and Integrations

### Invalid sync token (`410`)

- set `full_resync_required = true`
- enqueue new bounded bootstrap
- keep existing event data visible until replacement data lands

### Stale `etag` on write

- treat as conflict, not silent overwrite
- fetch fresh event state
- show new preview to user if they still want the change

### Rate limit or transient provider failure

- keep last good token
- retry with backoff
- show degraded connection health if repeated

## Security and privacy posture

- calendar read access is still highly sensitive and should be treated as such in permissions UI
- every create or update action requires explicit approval in v1
- event attendees, meet links, and notes live in internal metadata and should be access-controlled like the rest of user data

## UI expectations

### Today and Agenda

Should show:

- hard-timed commitments
- travel buffer or prep suggestions where relevant
- approvals that affect the schedule
- meetings that need notes or follow-up

### Event detail / Meeting prep

Should show:

- attendees resolved to People
- related tasks and reminders
- linked resources and notes
- prior discussion context if Gmail is also connected

### Integrations

Should show:

- last sync time
- calendar timezone
- bounded sync window
- connection mode and scopes
- resync or reconnect state when broken

## Rollout plan

### Phase 1

- read-only connect
- event import into `events`
- Today and Agenda context
- meeting prep context

### Phase 2

- approval-backed create
- limited update with `etag`
- people enrichment improvements

### Phase 3

- smarter scheduling proposals
- stronger meeting-prep and follow-up workflows

### Phase 4

- optional push/watch channel support if sync latency proves insufficient

## Final recommendation

Calendar v1 should be a context and scheduling substrate, not a calendar clone.

The assistant wins here by understanding commitments, suggesting better decisions, and making safe updates with approval.
