# Gmail Integration RFC (V1)

Last updated: 2026-03-27

## Purpose

Define the first shippable Gmail integration for the assistant.

This integration should make the assistant better at:

- follow-up detection
- waiting-on tracking
- meeting and interview context
- inbox-grounded Q&A
- approval-backed email drafts and sends

It should not become a full email client.

## Goals

- Connect a Gmail account with read-only permissions first.
- Import enough mailbox context to answer recent-context questions reliably.
- Build durable thread-level provenance between Gmail and internal entities.
- Support approval-backed draft creation and send as a second scope tier.
- Surface reconnection and sync failures in Inbox and Integrations views.

## Non-goals

- Full mailbox UI
- Label management or archival workflows in v1
- Attachment binary ingestion by default
- Background autonomous sending without approval
- Multi-mailbox fan-out in the first cut

## Provider identity

- `provider_key = google_gmail`
- primary read capability: `gmail.mailbox.read`
- write capabilities:
  - `gmail.drafts.create`
  - `gmail.messages.send`

## Scope strategy

Default connection should request the smallest useful scope set.

Phase 1 scopes:

- `https://www.googleapis.com/auth/gmail.readonly`

Phase 2 scope escalation when the user wants draft/send:

- `https://www.googleapis.com/auth/gmail.compose`

Rules:

- read-only should be the default path in onboarding
- draft/send should trigger an explicit scope-upgrade flow
- connection metadata should record whether the connection is `READ_ONLY` or `READ_WRITE`

## Connection flow

1. User clicks connect in Integrations.
2. App creates a pending `connections` row.
3. App creates `oauth_sessions` row with `state_token`, `redirect_uri`, and requested scopes.
4. User completes Google OAuth.
5. Callback exchanges code for token set and writes `connection_credentials`.
6. App validates account profile and stores:
   - `external_account_id`
   - display email address in `connection_tags`
   - granted scopes
7. App starts bootstrap sync job.

Connection metadata to persist:

```json
{
  "account_email": "me@example.com",
  "account_display_name": "Harish",
  "workspace_domain": "example.com",
  "mode": "READ_ONLY"
}
```

## Sync strategy

### Stream

- `stream_key = gmail.mailbox`
- cursor uses Gmail `historyId`

### Bootstrap strategy

Bootstrap should be 2-stage, not one expensive full-mailbox import.

Stage 1: recent-message crawl

- query recent mailbox activity for a bounded period
- recommended default: `MAIL_BOOTSTRAP_DAYS = 45`
- fetch message IDs using Gmail list APIs
- fetch each message in `metadata` format first
- requested metadata headers:
  - `Subject`
  - `From`
  - `To`
  - `Cc`
  - `Date`
  - `Message-Id`
  - `References`
  - `In-Reply-To`

Stage 2: targeted thread backfill

After grouping recent messages by `threadId`, enqueue thread backfills for threads that are:

- unread
- recently sent by the user
- likely waiting-on candidates
- referenced by a new task/reminder/question

Thread backfills should fetch richer payloads and normalized plaintext body content.

Why this shape is right:

- it keeps bootstrap fast enough for v1
- it preserves thread context where it matters
- it avoids downloading the whole mailbox before the assistant becomes useful

### Incremental sync

Once bootstrap stores a valid `historyId` in `sync_cursors`, all normal syncs should use Gmail history.

Incremental flow:

1. read active cursor from `sync_cursors`
2. call Gmail history API
3. collect changed message and thread IDs
4. refetch changed messages or threads
5. update canonical entities and `external_object_refs`
6. write new `historyId`

Failure rule:

- if Gmail reports the stored history cursor is too old or invalid, set `full_resync_required = true` and enqueue recovery bootstrap

### Push strategy

Not in v1 base rollout.

Push and watch renewal should come only after polling and cursor recovery are stable. Gmail watch channels also require Pub/Sub setup and periodic renewal, so the operational burden is not worth day-1 complexity.

## Data mapping

### Canonical internal mapping

Use one internal `Resource` per Gmail thread.

`resources` mapping:

- `resource_kind = EMAIL_THREAD`
- `original_url = https://mail.google.com/mail/u/0/#inbox/<thread id>` when available
- `metadata_json` includes thread summary fields

`resource_snapshots` mapping:

- one snapshot per sync update or targeted thread backfill
- `snapshot_kind = GMAIL_THREAD_SYNC`
- `fetch_status` reflects provider fetch success

`resource_artifacts` mapping:

- `artifact_kind = GMAIL_THREAD_MESSAGES_JSON`
- `artifact_kind = EXTRACTED_TEXT`
- `artifact_kind = THREAD_SUMMARY_JSON`

`external_object_refs` mapping:

- one row for the Gmail thread object
- optional additional rows for message IDs tied to the same resource entity

Suggested `external_object_refs.object_type` values:

- `gmail_thread`
- `gmail_message`

### People resolution

During sync, email addresses should enrich `people` records, not become separate silos.

Rules:

- resolve sender and recipient addresses against existing people by normalized email
- if no match exists, create a low-confidence `Person` candidate only when the contact appears meaningful across more than one interaction
- always preserve raw headers in message metadata even when identity resolution is uncertain

### Waiting-on and follow-up signals

The Gmail sync itself should not directly create lots of tasks.

Instead it should emit candidate signals such as:

- outbound message with no reply after N days
- promise language like `I'll send`, `I'll follow up`, `let me share`
- interview recruiter or hiring manager threads
- high-priority unanswered inbound email

Those candidates should be consumed by the capture and promotion pipeline, which decides whether to create:

- `Task`
- `Reminder`
- `MemoryItem`
- `InboxItem`

## Attachment policy

V1 attachment policy should stay conservative.

Allowed in v1:

- attachment metadata
- filename
- size
- MIME type
- attachment ID

Not default in v1:

- full binary attachment download
- OCR or document extraction from every email attachment

Exception path:

- if a user explicitly opens, saves, or asks about an attachment, fetch it on demand and import it as a `Resource`

## Action support

### Draft creation

User request examples:

- `Draft a follow-up to the recruiter`
- `Reply and say I can do Thursday at 2`

Flow:

1. assistant identifies the relevant Gmail thread resource
2. provider adapter builds a preview payload with recipients, subject, thread reference, and draft body
3. `ActionRequestService` stores preview
4. user approves
5. Gmail adapter creates draft
6. created draft is linked back through `external_object_refs`

### Send

Send should be a separate approval-backed action even if the draft was assistant-generated.

Rules:

- no silent sends in v1
- the approval preview must show:
  - recipients
  - subject
  - body preview
  - thread context
- execution must use `idempotency_key` to prevent duplicate sends

## Action preview shape

Suggested `preview_json` for a Gmail send:

```json
{
  "action": "gmail.messages.send",
  "thread_id": "18f3ab...",
  "to": ["recruiter@example.com"],
  "cc": [],
  "subject": "Following up on interview scheduling",
  "body_preview": "Hi Sarah, just following up on...",
  "risk_summary": "Sends an external email immediately"
}
```

## Sync schedule

Recommended v1 schedule:

- bootstrap immediately on connect
- incremental sync every 10 minutes while healthy
- manual refresh available from Integrations and thread views
- backoff on rate limit or provider error

Recommended backoff:

- first failure: retry in 5 minutes
- second consecutive failure: 15 minutes
- third consecutive failure: 60 minutes
- auth failure: mark `REQUIRES_REAUTH`, stop retries until user acts

## Failure modes

### Auth failure

- mark connection `REQUIRES_REAUTH`
- create Inbox item
- pause sync jobs

### Invalid history cursor

- set `sync_cursors.full_resync_required = true`
- enqueue a new bootstrap
- do not wipe existing thread resources until replacement data exists

### Rate limit or transient API error

- keep last good cursor
- record `last_error_code` and `last_error_message`
- retry with backoff

### Missing thread or deleted message

- mark the relevant `external_object_ref` as stale via metadata and `last_seen_at`
- do not hard-delete the internal resource immediately

## Security and privacy posture

- store normalized headers, snippet, and extracted plaintext body
- do not store raw OAuth tokens outside `connection_credentials`
- do not store full raw MIME blobs in v1
- show Gmail as a high-trust integration in permissions UI because mailbox data is deeply sensitive
- every send action requires explicit approval

## UI expectations

### Integrations view

Should show:

- connected Gmail account email
- mode: read-only or read-write
- last sync time
- sync health
- reauth banner if needed

### Inbox / Today

Should surface:

- follow-up candidates
- waiting-on suggestions
- recruiter or interview-related unanswered threads
- approval requests for draft/send

### Ask-the-assistant

Questions this integration should unlock:

- `Who am I waiting on right now?`
- `What did the recruiter say about next steps?`
- `Did I promise anyone a follow-up this week?`
- `Draft a follow-up to Palo Alto about next steps`

## Rollout plan

### Phase 1

- OAuth connect
- read-only mailbox sync
- thread resource mapping
- recent-context Q&A
- waiting-on candidate generation

### Phase 2

- draft creation with approval
- stronger people resolution
- recruiter and interview thread heuristics

### Phase 3

- approval-backed send
- more durable thread summaries and evidence reuse

### Phase 4

- optional Gmail watch support if polling proves insufficient

## Final recommendation

The v1 Gmail integration should be a context and follow-up engine first, and a sending tool second.

That matches the product goal much better than trying to recreate Gmail inside the assistant.
