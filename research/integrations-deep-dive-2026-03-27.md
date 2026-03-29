# Integrations Deep Dive

Last updated: 2026-03-27

This memo focuses on the missing layer in the product plan:

How should our assistant connect to outside systems in a way that is reliable, inspectable, and safe enough to become a real personal operating system?

This pass is intentionally integration-heavy and code-backed.

It draws from:

- earlier assistant/runtime repos already covered in this research folder
- a new repo/code pass across:
  - `activepieces`
  - `nango`
  - `chatwoot`
  - `novu`
  - `ntfy`
  - `ryot`
  - `karakeep`
- official Google documentation for:
  - Gmail sync and push notifications
  - Calendar incremental sync and push notifications
  - People API incremental contact sync
  - OAuth 2.0 web-server flows

## Big conclusion

We should not build integrations as one-off adapters glued onto tools.

We should build an integration substrate with 5 distinct concerns:

1. connection and credential lifecycle
2. sync and webhook lifecycle
3. imported external state and provenance
4. outbound action approval and execution
5. delivery/capture surfaces

That is the architectural difference between:

- a toy assistant that “can call Gmail sometimes”
- a real assistant that can safely observe, remember, suggest, draft, remind, and act

## What the strongest repos are teaching us

### 1. Nango: connections are a product area, not a helper function

High-signal files:

- `research/repos/nango/packages/types/lib/oauthSessions/db.ts`
- `research/repos/nango/packages/keystore/lib/utils/encryption.ts`
- `research/repos/nango/packages/runner-sdk/lib/checkpoint.ts`
- `research/repos/nango/packages/webhooks/lib/sync.ts`
- `research/repos/nango/docs/getting-started/sample-app.mdx`
- `research/repos/nango/docs/implementation-guides/use-cases/syncs/checkpoints.mdx`
- `research/repos/nango/docs/implementation-guides/platform/webhooks-from-nango.mdx`
- `research/repos/nango/docs/guides/platform/self-hosting.mdx`
- `research/repos/nango/docs/implementation-guides/platform/auth/token-refreshing.mdx`

What it does well:

- OAuth is modeled explicitly with a session object, not as an in-memory redirect dance.
- Credentials and sessions are first-class persisted records.
- Encryption is explicit and centralized.
- Sync execution has checkpoints, not only “last synced at”.
- Webhooks are signed and typed.
- Connections can carry tags so downstream systems can reconcile them to user/org/workspace context.
- The system separates control-plane data, scheduled tasks, synced records, object storage, and execution logs.

Best ideas to steal:

- `oauth_sessions` should be real DB records with provider, connection ID, callback URL, auth mode, per-session config, and PKCE/request-token data.
- encrypted credential storage should be centralized behind one service boundary
- syncs should store a schema-validated checkpoint blob, not just a timestamp string
- connection creation must return durable IDs that we can reconcile back to the initiating user/workspace
- incoming and outgoing webhooks should always be signed and typed
- token refresh failures are important product events, not implementation details

What not to copy:

- We do not want a separate external integration platform as our product core.
- We do not need 700+ integrations or their runtime split in v1.

What this means for us:

- we need real `oauth_sessions`
- we need encrypted `connection_credentials`
- we need `connection_tags` or equivalent metadata
- we need `sync_cursors` that can store structured checkpoint JSON
- we need `webhook_endpoints` and `webhook_receipts`
- token refresh failure should create an internal inbox item plus reconnection path

### 2. Activepieces: auth, triggers, webhooks, and approvals should be composable primitives

High-signal files:

- `research/repos/activepieces/docs/embedding/embed-connections.mdx`
- `research/repos/activepieces/docs/admin-guide/guides/manage-oauth2.mdx`
- `research/repos/activepieces/docs/build-pieces/piece-reference/authentication.mdx`
- `research/repos/activepieces/packages/server/worker/src/lib/execute/jobs/renew-webhook.ts`
- `research/repos/activepieces/packages/pieces/core/approval/src/lib/actions/wait-for-approval.ts`
- `research/repos/activepieces/packages/pieces/core/approval/src/lib/actions/create-approval-link.ts`
- `research/repos/activepieces/packages/server/api/src/app/database/migration/postgres/1742432827826-ChangeManualTasksToTodo.ts`

What it does well:

- connection creation is embeddable in another product
- auth is modeled at the piece/action level instead of hidden in global config
- webhook renewal is a worker concern
- approval is resumable and URL-driven
- approvals evolved into a more general `todo` style table, which is a strong sign that approvals are really inbox work items

Best ideas to steal:

- connection setup should feel native in our app, not like leaving for a separate console
- every integration capability should declare its auth mode and required configuration
- webhook subscriptions must be renewed in background jobs
- approvals should generate resumable approval/reject actions, not just boolean prompt responses in a chat thread
- approvals belong in the inbox

What not to copy:

- We should not encode our entire product as generic flow-builder pieces.
- Approval URLs alone are too weak for our assistant; we need richer action-request records.

What this means for us:

- `action_requests` need resumable approve/reject/defer links
- we should have a unified inbox surface for approvals and manual review
- webhook renewal should be a standard background capability of the integration layer

### 3. Chatwoot: channels, inboxes, contacts, conversations, and messages need explicit modeling

High-signal files:

- `research/repos/chatwoot/app/models/inbox.rb`
- `research/repos/chatwoot/app/models/contact.rb`
- `research/repos/chatwoot/app/models/conversation.rb`
- `research/repos/chatwoot/app/models/message.rb`
- `research/repos/chatwoot/app/listeners/webhook_listener.rb`
- `research/repos/chatwoot/app/services/twilio/incoming_message_service.rb`
- `research/repos/chatwoot/db/schema.rb`

What it does well:

- separates channel transport from inbox routing
- treats contacts as durable identities
- models conversations separately from messages
- preserves source IDs and external source metadata on messages
- turns inbound channel traffic into normalized contact/conversation/message records
- delivers webhook payloads as evented projections of core records

Best ideas to steal:

- inbound chat surfaces should normalize into a stable shape:
  - channel
  - participant/contact
  - thread/conversation
  - message/capture event
- source IDs from external systems are worth preserving explicitly
- channel-specific adapters should be thin normalizers into our canonical capture and interaction model
- typing, waiting, assignment, and channel-specific behavior all belong above the raw transport layer

What not to copy:

- We are not building a support-desk product or a full omnichannel CRM.
- We do not need a heavy inbox model for every external messaging platform on day 1.

What this means for us:

- our `channel_bindings` and `assistant_sessions` should be separate from `captures`
- we should store `external_message_ref` / `external_thread_ref` / `external_contact_ref`
- we need a `Person` merge and identity resolution story once email/calendar/chat all start producing person-like records

### 4. Novu: notifications are workflows over subscribers and channels, not just “send push”

High-signal files:

- `research/repos/novu/libs/dal/src/repositories/subscriber/subscriber.entity.ts`
- `research/repos/novu/libs/application-generic/src/encryption/encrypt-provider.ts`
- `research/repos/novu/libs/application-generic/src/factories/channel.factory.ts`
- `research/repos/novu/libs/application-generic/src/utils/digest.ts`
- `research/repos/novu/libs/application-generic/src/dtos/workflow/controls/digest-control.dto.ts`
- `research/repos/novu/libs/application-generic/src/dtos/workflow/step-responses/in-app-step.response.dto.ts`

What it does well:

- `subscriber` is the center, not the provider
- provider credentials are encrypted centrally
- channel selection is abstracted by a channel factory
- workflows support digesting and delaying rather than treating every event as immediate
- in-app notifications are treated as a first-class channel, not just a fallback

Best ideas to steal:

- route notifications by user/subscriber identity, not by provider directly
- support channel preferences per user and per event type
- use digests and delays as part of reminder behavior
- in-app inbox plus push/email/chat delivery should be one notification system with multiple channels

What not to copy:

- We do not need a giant notification template platform in v1.
- We do not need a separate notifications product inside the product.

What this means for us:

- we need `notification_endpoints` and `notification_deliveries`
- notification policy should be event-driven and user-configurable
- reminder escalation can eventually reuse digest/delay ideas

### 5. ntfy: a great lightweight delivery substrate for self-hosted push-like notifications

High-signal files:

- `research/repos/ntfy/server/topic.go`
- `research/repos/ntfy/server/actions.go`
- `research/repos/ntfy/message/cache_postgres_schema.go`
- `research/repos/ntfy/webpush/store_postgres.go`
- `research/repos/ntfy/docs/publish.md`
- `research/repos/ntfy/docs/subscribe/pwa.md`

What it does well:

- topics are simple routing primitives
- message cache and webpush subscription storage are explicit and small
- PWA installability is treated as a real delivery surface
- notifications can carry actions
- delivery can be self-hosted with very little product overhead

Best ideas to steal:

- for v1, self-hosted push delivery can be lightweight instead of overengineered
- notification payloads should support action buttons and deep links
- PWA installability matters a lot for desktop/mobile accessibility
- delivery endpoint state should be modeled separately from reminder/task state

What not to copy:

- Topics are too low-level to be our main notification abstraction.
- We should not ask users to think in raw pub-sub topics.

What this means for us:

- `notification_endpoints` can support an `NTFY` endpoint type in v1
- every reminder or approval notification should produce deep links and optional quick actions
- PWA install + web push is a very realistic early accessibility path

### 6. Ryot: integrations and notification platforms deserve their own entities

High-signal files:

- `research/repos/ryot/crates/models/database/src/integration.rs`
- `research/repos/ryot/crates/models/database/src/notification_platform.rs`
- `research/repos/ryot/crates/services/integration/src/sink/ryot_browser_extension.rs`
- `research/repos/ryot/crates/services/integration/src/webhook_handler.rs`
- `research/repos/ryot/apps/docs/src/integrations/ryot-browser-extension.md`
- `research/repos/ryot/crates/services/miscellaneous/background/src/notifications.rs`

What it does well:

- integrations are first-class user records with provider, sync config, and trigger result
- notification platforms are separate from integrations
- browser extension ingestion is implemented as a webhook sink with provider-specific parsing
- background jobs use integration state to decide what to process and when

Best ideas to steal:

- keep `integration` and `notification platform` as separate concepts
- store provider-specific settings as JSON but only around a stable typed core
- browser extension capture can be just another inbound integration endpoint

What this means for us:

- we should separate `connections` from `notification_endpoints`
- browser extension events should land in the same capture pipeline as chat/email imports

### 7. Karakeep: browser extension capture should be fast, local-feeling, and queue-backed

High-signal files:

- `research/repos/karakeep/apps/browser-extension/src/SavePage.tsx`
- `research/repos/karakeep/apps/browser-extension/src/background/background.ts`
- `research/repos/karakeep/packages/shared-server/src/queues.ts`
- `research/repos/karakeep/packages/trpc/lib/ruleEngine.ts`

What it does well:

- current-page save is instant and simple
- background script handles context-menu capture without forcing full-page UI first
- bookmark creation is synchronous enough for UX, but enrichment is queue-backed
- rules can trigger based on source and bookmark properties

Best ideas to steal:

- browser capture should support page, link, image, and selected text
- the extension should save minimal canonical data first and queue enrichment after
- source context like current tab title, selection, page URL, and save source should be preserved
- rule/automation triggers should run after save, not block the save path

What this means for us:

- browser extension capture should create a fast `Capture` or `Resource` immediately
- enrichment, summarization, OCR, extraction, and rule evaluation should be background jobs

## Official API findings that affect our design

### Gmail

Official sources:

- [Synchronize clients with Gmail](https://developers.google.com/workspace/gmail/api/guides/sync)
- [Configure push notifications in Gmail API](https://developers.google.com/workspace/gmail/api/guides/push)
- [OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)

High-signal facts from the current docs:

- Gmail sync is built around storing a `historyId` and replaying changes with `history.list`.
- Push notifications are for server backends, not device notifications.
- Gmail push uses Cloud Pub/Sub, not direct webhooks.
- `watch` must be renewed at least every 7 days, and Google recommends renewing daily.
- a successful `watch` call immediately triggers a notification
- Gmail notifications can be delayed or dropped, so the app still needs fallback sync behavior
- per-user notification rate is capped at 1 event/second
- OAuth web-server flows should request `offline` access and `include_granted_scopes=true` for incremental auth
- refresh tokens must be stored securely and may only be returned on the first authorization unless the user re-consents

Design implications:

- v1 should store `historyId` per Gmail connection
- v1 should support periodic partial sync even without push
- production Gmail push is worth adding, but not required for the first functional build
- Gmail writes should default to `draft` first, with explicit approval for `send`
- imported Gmail data should be treated as:
  - source context
  - external artifacts
  - possible commitments/tasks/reminders
  not as canonical truth for our task system

### Google Calendar

Official sources:

- [Synchronize resources efficiently](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Push notifications](https://developers.google.com/workspace/calendar/api/guides/push)
- [Get specific versions of resources](https://developers.google.com/workspace/calendar/api/guides/version-resources)

High-signal facts from the current docs:

- Calendar sync is built around `nextSyncToken`
- incremental sync must replay pages until the new `nextSyncToken` arrives on the last page
- a `410` means the sync token is invalid and requires a full resync
- Calendar push messages contain headers only and no message body with event details
- push channels do not renew automatically
- renewal requires creating a new `watch`
- channels can carry a routing token in headers
- channel expiration comes back in the response and notification headers
- writes can use `If-Match` with `etag` for conflict-safe conditional modification

Design implications:

- v1 should store `syncToken` per calendar collection and resource kind
- calendar push notifications are useful, but since they carry no event body, sync remains the source of truth
- event writes should store the latest `etag` and use optimistic concurrency when modifying existing events
- calendar notifications should only tell us to sync; they are not enough by themselves for planning logic

### Google Contacts / People API

Official source:

- [people.connections.list](https://developers.google.com/people/api/rest/v1/people.connections/list)

High-signal facts from the current docs:

- contact sync supports `requestSyncToken=true` and later `syncToken`
- sync tokens expire after 7 days
- expired sync tokens return `EXPIRED_SYNC_TOKEN`, requiring a full sync
- incremental responses include deleted contacts as `PersonMetadata.deleted = true`
- sync/page requests must keep all other query parameters identical to the first call
- writes may take several minutes to propagate; incremental sync is not read-after-write safe

Design implications:

- our `Person` resolution layer should support soft deletes and re-resolution from source
- People API is great for identity enrichment and alias resolution, but should not become the canonical people store
- it should feed merge suggestions, not hard-overwrite curated user data blindly

## Integration taxonomy for our product

We should divide integrations into these product-facing categories.

### 1. Capture surfaces

These produce new raw captures.

Examples:

- OpenClaw chat
- web app quick-add
- browser extension
- PWA share target / mobile share sheet
- voice note upload
- forwarded email or copied email content

### 2. Context readers

These import state that helps the assistant reason.

Examples:

- Gmail read sync
- Calendar read sync
- Contacts sync
- optional files/drive sync later

### 3. Notification endpoints

These are delivery destinations, not knowledge sources.

Examples:

- in-app inbox
- web push / PWA
- ntfy
- email
- Telegram/Slack/WhatsApp later

### 4. Action executors

These perform side effects outside our app.

Examples:

- create calendar event
- update calendar event
- create draft email
- send email
- browser action via Playwright/Stagehand later

### 5. Sync and webhook infrastructure

These keep everything live.

Examples:

- OAuth callback handling
- token refresh
- sync cursors/checkpoints
- provider push subscriptions
- inbound webhook routing
- webhook verification

## Non-negotiable integration rules

1. A connection is not just credentials.
   It also has scopes, sync state, webhook state, failure state, and routing metadata.

2. Imported data is not canonical product truth.
   Calendar events, emails, and contacts are source material and context. Our app owns the canonical task/reminder/project/memory graph.

3. Every external write must be representable as an `action_request`.
   Approval, auditability, retries, and replays depend on this.

4. Sync state must be typed and rebuildable.
   Store structured checkpoints/tokens and raw inbound webhook receipts.

5. Browser/mobile/chat capture must go through the same raw capture pipeline.

6. Notifications are not reminders.
   Reminders are user-facing commitments with policy; notifications are just deliveries.

## Concrete integration data model

This is the minimum shape I would add to the canonical plan.

### `provider_definitions`

Purpose:

- registry of provider capabilities and defaults

Fields:

- `id`
- `provider_key`
- `display_name`
- `category`
- `auth_mode`
- `supports_webhooks`
- `supports_incremental_sync`
- `supports_actions`
- `default_read_scopes_json`
- `default_write_scopes_json`
- `capabilities_json`

### `connections`

Purpose:

- one user-linked provider connection

Fields:

- `id`
- `provider_definition_id`
- `user_id`
- `workspace_id`
- `status`
- `external_account_id`
- `display_name`
- `granted_scopes_json`
- `connection_metadata_json`
- `last_validated_at`
- `last_sync_at`
- `last_error_at`
- `last_error_code`
- `last_error_message`
- `created_at`
- `updated_at`

### `oauth_sessions`

Purpose:

- track in-flight auth attempts and callback reconciliation

Fields:

- `id`
- `provider_definition_id`
- `connection_id`
- `callback_url`
- `pkce_code_verifier`
- `request_token_secret`
- `state_payload_json`
- `status`
- `expires_at`
- `created_at`

### `connection_credentials`

Purpose:

- encrypted token or key material

Fields:

- `connection_id`
- `credential_version`
- `credential_kind`
- `encrypted_payload`
- `rotated_at`
- `expires_at`
- `refresh_after`

### `connection_tags`

Purpose:

- reconcile integrations back to product context

Fields:

- `id`
- `connection_id`
- `tag_key`
- `tag_value`

Examples:

- `workspace_id`
- `assistant_session_id`
- `initiating_surface=browser_extension`
- `purpose=calendar_context`

### `sync_cursors`

Purpose:

- durable sync progress per connection and resource stream

Fields:

- `id`
- `connection_id`
- `stream_key`
- `cursor_kind`
- `checkpoint_json`
- `full_resync_required`
- `cursor_obtained_at`
- `cursor_expires_at`
- `updated_at`

Examples:

- Gmail `historyId`
- Calendar `syncToken`
- People API `nextSyncToken`

### `webhook_channels`

Purpose:

- provider watch/subscription state

Fields:

- `id`
- `connection_id`
- `stream_key`
- `provider_channel_id`
- `provider_resource_id`
- `provider_resource_uri`
- `routing_token`
- `expires_at`
- `status`
- `last_renewed_at`
- `created_at`

### `inbound_webhook_events`

Purpose:

- immutable log of provider callbacks

Fields:

- `id`
- `provider_key`
- `connection_id`
- `webhook_channel_id`
- `event_kind`
- `signature_valid`
- `headers_json`
- `payload_json`
- `received_at`
- `processed_at`
- `processing_status`

### `external_object_refs`

Purpose:

- link canonical entities to external records

Fields:

- `id`
- `entity_id`
- `connection_id`
- `object_type`
- `external_id`
- `external_parent_id`
- `etag`
- `source_url`
- `raw_metadata_json`
- `last_seen_at`

Examples:

- a `Person` linked to Google contact person ID
- an `Event` linked to Google Calendar event ID
- a `Resource` linked to Gmail message/thread IDs

### `notification_endpoints`

Purpose:

- per-user delivery destinations

Fields:

- `id`
- `user_id`
- `endpoint_type`
- `display_name`
- `endpoint_ref`
- `endpoint_config_json`
- `is_default`
- `is_disabled`
- `last_seen_at`
- `created_at`

Examples:

- web push endpoint
- ntfy endpoint
- email endpoint
- chat DM endpoint later

### `notification_preferences`

Purpose:

- event-level routing policy

Fields:

- `id`
- `user_id`
- `event_key`
- `channel_policy_json`
- `quiet_hours_json`
- `digest_policy_json`

### `notification_deliveries`

Purpose:

- delivery audit trail

Fields:

- `id`
- `reminder_id`
- `action_request_id`
- `endpoint_id`
- `delivery_kind`
- `payload_json`
- `status`
- `provider_message_id`
- `error_json`
- `created_at`
- `resolved_at`

## Approval and action model

This needs to be more concrete than the current spec.

### External capability levels

Each integration capability should fall into one of these buckets:

- `observe`
  - read/import only
- `suggest`
  - can produce recommendations but no side effects
- `draft`
  - can create drafts or proposed changes externally
- `execute_approved`
  - can perform side effects only via approval-backed action requests
- `execute_preapproved`
  - can perform side effects automatically because the user explicitly trusted that action class

### `action_requests`

The existing table stays, but it should be understood as the center of all external writes.

Recommended statuses:

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `EXPIRED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

Recommended additions:

- `connection_id`
- `capability_key`
- `preview_json`
- `risk_level`
- `idempotency_key`
- `approval_expires_at`
- `executed_at`

### What counts as approval-worthy in v1

Always require approval:

- send email
- create or modify calendar event
- browser actions with side effects
- outbound chat message to another human

Can be auto-run by default:

- read inbox/calendar/contact state
- create internal task/reminder/project/memory objects
- generate drafts and suggested replies internally
- send notifications to the user’s own configured reminder endpoints

### Approval UX expectations

An approval request should include:

- what the assistant wants to do
- why it thinks it should do it
- what object/context triggered it
- the exact external target
- the exact payload preview
- a one-tap approve / reject / defer path

## Recommended v1 integration set

### 1. OpenClaw and first-party chat/web

Purpose:

- universal capture and assistant access

What it should do:

- ingest text and structured tool calls into `capture_events`
- maintain `assistant_sessions`
- surface approvals, reminders, and follow-ups
- bind channel threads to our backend session IDs

### 2. Browser extension

Purpose:

- instant capture from anywhere

What it should do:

- save current page, link target, image URL, or selection text
- include title, URL, page URL, and source surface
- optionally trigger background full-page capture or content extraction
- open the saved item or quick note UI immediately

V1 note:

- this should be one of the first integrations we build because it dramatically improves accessibility

### 3. Gmail read + draft

Purpose:

- context, commitments, waiting-on detection, follow-up generation

V1 behavior:

- full sync on connect, then partial sync via `history.list`
- store `historyId`
- pull message metadata and selected body/artifact data for relevant mail only
- create internal follow-up suggestions and reminders
- create drafts internally first
- create Gmail drafts externally only through an explicit action request

Recommended v1 choice:

- build periodic partial sync first
- add push via Pub/Sub later, once the rest of the integration layer is stable

### 4. Google Calendar read + event write

Purpose:

- planning, meeting prep, reminder timing, realistic day views

V1 behavior:

- full sync on connect, then incremental sync via `syncToken`
- keep calendar collections and events as external context
- use event `etag` for safe updates
- create new events only through approval-backed action requests

Recommended v1 choice:

- do incremental sync first
- add push watch later if we need more freshness than periodic sync gives us

### 5. Google Contacts read

Purpose:

- resolve people names, aliases, and participant context

V1 behavior:

- sync a narrow set of person fields
- use imported contacts to enrich `Person` suggestions and merge candidates
- never let contact sync blindly overwrite curated internal people records

### 6. Notifications: in-app + PWA/web push + ntfy

Purpose:

- make the assistant actually reachable

V1 behavior:

- all reminders and approvals appear in the in-app inbox
- support web push/PWA installation
- support `ntfy` as a fast self-hosted delivery channel
- support email fallback for approval links and important reminders

### 7. Voice upload and mobile share surface

Purpose:

- reduce capture friction on the move

V1 behavior:

- upload audio and create a `Capture`
- transcribe and segment in background
- mobile share of URL/text/image should land in the same capture pipeline as chat and browser extension

## What we should build ourselves vs borrow only as ideas

Build ourselves:

- canonical data model
- connection records and routing metadata
- approval/action-request layer
- sync cursor store
- imported-object provenance model
- browser extension that feeds our capture pipeline
- notification policy and reminder policy

Borrow ideas only:

- Nango’s connection tagging, checkpointing, webhook typing
- Activepieces’ embeddable connect flow and resumable approval links
- Chatwoot’s channel/contact/conversation normalization
- Novu’s subscriber/channel separation and digest controls
- ntfy’s delivery simplicity and PWA mindset
- Ryot’s split between integrations and notification platforms
- Karakeep’s fast extension UX and queue-backed enrichment

## Concrete recommendations for our app structure

### Storage impact

We should add these concepts to the existing technical spec:

- `connections`
- `oauth_sessions`
- `connection_credentials`
- `connection_tags`
- `sync_cursors`
- `webhook_channels`
- `inbound_webhook_events`
- `external_object_refs`
- `notification_endpoints`
- `notification_preferences`
- `notification_deliveries`

### Service/module impact

The current `Integrations module` should be expanded into 4 internal concerns:

1. `Connection service`
   - auth sessions, credentials, scopes, metadata
2. `Sync service`
   - full sync, incremental sync, cursors, refresh, resync
3. `Webhook service`
   - verify, receive, log, route, dedupe, enqueue
4. `Delivery service`
   - reminders, approvals, digests, endpoint routing

### Product impact

The user should never think in terms of:

- OAuth callback
- sync token
- Pub/Sub
- provider webhook
- refresh token failure

They should think in terms of:

- connect Gmail
- keep my calendar in context
- remind me on web and phone
- draft this reply for approval
- tell me when this connection is broken

## Recommended v1 implementation order

1. first-party web app + OpenClaw session binding
2. browser extension capture
3. in-app inbox + notification endpoints + ntfy/PWA delivery
4. calendar read sync
5. contacts read sync
6. Gmail read sync with partial-sync cursors
7. approval-backed calendar create/update
8. approval-backed Gmail draft/send
9. production-grade push/watch subscriptions where worth the complexity

## Biggest decisions now made concrete

1. We should own our integration layer instead of bolting in a generic automation platform.
2. The product needs real connection/auth/sync tables, not just provider-specific scripts.
3. Gmail and Calendar should start with incremental sync, not immediate push complexity.
4. Contacts should enrich identity resolution, not become canonical people truth.
5. Notifications need a real endpoint model and delivery log.
6. Browser extension and PWA/mobile capture are not nice-to-haves; they are core accessibility features.
7. Every external write should flow through `action_requests`.
