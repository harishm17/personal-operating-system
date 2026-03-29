# Database Schema and Migrations

Last updated: 2026-03-27

This document turns the integration and notification research into a migration-grade database plan.

It is intentionally opinionated. The goal is not to design the most generic connector platform. The goal is to design a schema that lets us ship a trustworthy assistant with:

- explicit connections and credentials
- incremental sync and webhook recovery
- approval-backed external actions
- multi-endpoint notifications
- strong provenance between internal objects and external systems

## Big conclusion

We should keep the existing core product schema and add a dedicated integration/runtime slice with 4 properties:

1. provider lifecycle is explicit
2. sync state is durable and replayable
3. approvals are durable records, not transient chat prompts
4. delivery state is modeled separately from reminder/task state

That means:

- `provider_definitions` are seeded catalog rows
- `connections` are user/workspace-scoped durable records
- `oauth_sessions`, `sync_cursors`, `webhook_channels`, and `notification_deliveries` are operational state
- `external_object_refs` are the bridge between our canonical objects and outside systems

## Hard database conventions

- Primary keys: `uuid` with `gen_random_uuid()`
- Timestamps: `timestamptz`
- Provider-specific structured data: `jsonb`
- Secrets and tokens: encrypted before DB write, stored as `bytea`
- Scopes: `text[]`
- Status fields: Postgres enums when the state machine is stable; otherwise `text` plus code-level validation
- Unique reconciliation keys: partial indexes where revoked/deleted rows should not block reconnect
- Search/index state must be rebuildable from canonical and artifact state

Required extensions:

```sql
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists vector;
```

## Migration ordering

Recommended migration sequence:

1. `001_extensions_and_enum_types`
2. `002_provider_definitions`
3. `003_connections_and_oauth`
4. `004_sync_and_webhooks`
5. `005_external_object_refs`
6. `006_notifications`
7. `007_action_request_expansion`
8. `008_indexes_and_backfills`
9. `009_provider_seed_data`

Reasoning:

- provider catalog rows can exist before any user connects accounts
- credentials and OAuth need to exist before sync workers
- sync tables should exist before webhook handlers are turned on
- action request and notification tables should exist before any write-capable integration ships

## Stable enum types

Use Postgres enums for these state machines:

```sql
create type connection_status as enum (
  'PENDING_AUTH',
  'ACTIVE',
  'DEGRADED',
  'REQUIRES_REAUTH',
  'REVOKED',
  'DISABLED',
  'DELETED'
);

create type oauth_session_status as enum (
  'CREATED',
  'REDIRECTED',
  'EXCHANGED',
  'FAILED',
  'EXPIRED',
  'CANCELLED'
);

create type webhook_channel_status as enum (
  'ACTIVE',
  'RENEWING',
  'EXPIRED',
  'FAILED',
  'DISABLED'
);

create type webhook_processing_status as enum (
  'RECEIVED',
  'DEDUPED',
  'PROCESSED',
  'FAILED',
  'IGNORED'
);

create type notification_endpoint_type as enum (
  'IN_APP',
  'WEB_PUSH',
  'NTFY',
  'EMAIL'
);

create type notification_delivery_status as enum (
  'QUEUED',
  'SENT',
  'DELIVERED',
  'ACKNOWLEDGED',
  'FAILED',
  'CANCELLED',
  'SUPPRESSED'
);

create type action_request_status as enum (
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

create type action_risk_level as enum (
  'LOW',
  'MEDIUM',
  'HIGH'
);
```

## Table definitions

The tables below are the integration/runtime slice that should sit beside the core product schema in the technical spec.

### 1. `provider_definitions`

This is a seeded catalog table, not a user-generated table.

```sql
create table provider_definitions (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  category text not null,
  auth_mode text not null,
  supports_webhooks boolean not null default false,
  supports_incremental_sync boolean not null default false,
  supports_actions boolean not null default false,
  default_read_scopes text[] not null default '{}',
  default_write_scopes text[] not null default '{}',
  capabilities_json jsonb not null default '{}'::jsonb,
  config_schema_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:

- `provider_key` examples:
  - `google_gmail`
  - `google_calendar`
  - `google_people`
  - `browser_extension`
  - `web_push`
  - `ntfy`
- `config_schema_json` lets the app describe provider-specific config in UI without creating a plugin marketplace schema in the DB.

### 2. `connections`

One durable external-account or device binding.

```sql
create table connections (
  id uuid primary key default gen_random_uuid(),
  provider_definition_id uuid not null references provider_definitions(id),
  user_id uuid not null,
  workspace_id uuid not null,
  status connection_status not null default 'PENDING_AUTH',
  external_account_id text,
  display_name text,
  granted_scopes text[] not null default '{}',
  requested_capabilities_json jsonb not null default '{}'::jsonb,
  connection_metadata_json jsonb not null default '{}'::jsonb,
  last_validated_at timestamptz,
  last_sync_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_connections_user_workspace
  on connections(user_id, workspace_id);

create index idx_connections_provider_status
  on connections(provider_definition_id, status);

create unique index ux_connections_live_provider_account
  on connections(provider_definition_id, user_id, workspace_id, coalesce(external_account_id, ''))
  where status <> 'DELETED';
```

Notes:

- `requested_capabilities_json` is what the user asked for when connecting, like `{"read_email": true, "draft_email": false}`.
- `granted_scopes` is the actual OAuth/API scope set.
- `connection_metadata_json` is provider-specific but should be normalized when possible, for example Gmail account email address or browser profile ID.

### 3. `oauth_sessions`

This is the persisted OAuth handshake state.

```sql
create table oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  provider_definition_id uuid not null references provider_definitions(id),
  connection_id uuid references connections(id),
  state_token text not null unique,
  redirect_uri text not null,
  callback_url text not null,
  pkce_code_verifier text,
  request_token_secret text,
  state_payload_json jsonb not null default '{}'::jsonb,
  status oauth_session_status not null default 'CREATED',
  exchanged_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_oauth_sessions_connection
  on oauth_sessions(connection_id);

create index idx_oauth_sessions_expires_at
  on oauth_sessions(expires_at);
```

Notes:

- `state_token` must be first-class. Do not hide it in `state_payload_json`.
- `redirect_uri` and `callback_url` should both be stored because debugging OAuth failures gets much easier when both are visible.

### 4. `connection_credentials`

Encrypted durable credentials. Never read directly from application code outside the credential service.

```sql
create table connection_credentials (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  credential_version integer not null,
  credential_kind text not null,
  encrypted_payload bytea not null,
  key_version integer not null,
  is_active boolean not null default true,
  rotated_at timestamptz not null default now(),
  expires_at timestamptz,
  refresh_after timestamptz,
  created_at timestamptz not null default now(),
  unique (connection_id, credential_version)
);

create unique index ux_connection_credentials_active
  on connection_credentials(connection_id)
  where is_active = true;
```

Credential kinds in v1:

- `OAUTH_TOKEN_SET`
- `API_KEY`
- `DEVICE_TOKEN`

The encrypted payload should include whatever the provider returns, for example:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "scope": "gmail.readonly gmail.compose",
  "token_type": "Bearer",
  "expiry_date": "2026-03-28T03:12:00Z"
}
```

### 5. `connection_tags`

Small structured reconciliation fields that should be filterable without parsing JSON.

```sql
create table connection_tags (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  tag_key text not null,
  tag_value text not null,
  created_at timestamptz not null default now()
);

create index idx_connection_tags_lookup
  on connection_tags(tag_key, tag_value);

create unique index ux_connection_tags_unique
  on connection_tags(connection_id, tag_key, tag_value);
```

Examples:

- `tag_key = 'browser_profile_id'`
- `tag_key = 'google_workspace_domain'`
- `tag_key = 'account_email'`

### 6. `sync_cursors`

Durable sync checkpoints, not just timestamps.

```sql
create table sync_cursors (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  stream_key text not null,
  cursor_kind text not null,
  checkpoint_json jsonb not null default '{}'::jsonb,
  full_resync_required boolean not null default false,
  cursor_obtained_at timestamptz,
  cursor_expires_at timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (connection_id, stream_key)
);

create index idx_sync_cursors_resync
  on sync_cursors(full_resync_required, updated_at);
```

Examples:

- Gmail: `stream_key = 'gmail.mailbox'`, `checkpoint_json = {"historyId":"1142029"}`
- Calendar: `stream_key = 'google_calendar.primary'`, `checkpoint_json = {"syncToken":"..."}`
- People: `stream_key = 'google_people.contacts'`, `checkpoint_json = {"syncToken":"..."}`

### 7. `webhook_channels`

Provider subscriptions or routing handles that must be renewed or reconciled.

```sql
create table webhook_channels (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references connections(id) on delete cascade,
  stream_key text not null,
  provider_channel_id text not null,
  provider_resource_id text,
  provider_resource_uri text,
  routing_token text not null unique,
  expires_at timestamptz,
  status webhook_channel_status not null default 'ACTIVE',
  last_renewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (connection_id, stream_key, provider_channel_id)
);

create index idx_webhook_channels_expiry
  on webhook_channels(status, expires_at);
```

### 8. `inbound_webhook_events`

Every inbound webhook should be durably recorded before processing.

```sql
create table inbound_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  connection_id uuid references connections(id),
  webhook_channel_id uuid references webhook_channels(id),
  event_kind text not null,
  dedupe_key text,
  signature_valid boolean,
  headers_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status webhook_processing_status not null default 'RECEIVED',
  error_json jsonb
);

create unique index ux_inbound_webhook_events_dedupe
  on inbound_webhook_events(dedupe_key)
  where dedupe_key is not null;

create index idx_inbound_webhook_events_processing
  on inbound_webhook_events(processing_status, received_at);
```

Notes:

- `dedupe_key` should be derived from provider delivery IDs or a stable hash of identifying headers.
- webhook processing workers should be able to replay from this table.

### 9. `external_object_refs`

This is the key provenance and reconciliation table.

```sql
create table external_object_refs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  connection_id uuid not null references connections(id) on delete cascade,
  object_type text not null,
  external_id text not null,
  external_parent_id text,
  etag text,
  source_url text,
  raw_metadata_json jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (connection_id, object_type, external_id)
);

create index idx_external_object_refs_entity
  on external_object_refs(entity_id);

create index idx_external_object_refs_parent
  on external_object_refs(connection_id, object_type, external_parent_id);
```

Examples:

- Gmail thread mapped to a `Resource` entity
- Calendar event mapped to an `Event` entity
- Browser capture bookmark-like object mapped to a `Resource` entity

### 10. `notification_endpoints`

The user can have several delivery surfaces. These must be modeled independently of reminders.

```sql
create table notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint_type notification_endpoint_type not null,
  display_name text not null,
  endpoint_ref text not null,
  endpoint_config_json jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_disabled boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ux_notification_endpoints_ref
  on notification_endpoints(user_id, endpoint_type, endpoint_ref);

create unique index ux_notification_endpoints_default
  on notification_endpoints(user_id, endpoint_type)
  where is_default = true and is_disabled = false;
```

Examples:

- `IN_APP` with `endpoint_ref = 'primary'`
- `WEB_PUSH` with `endpoint_ref = '<subscription hash>'`
- `NTFY` with `endpoint_ref = 'https://ntfy.example.com/my-topic'`
- `EMAIL` with `endpoint_ref = 'me@example.com'`

### 11. `notification_preferences`

User policy per event type.

```sql
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_key text not null,
  channel_policy_json jsonb not null default '{}'::jsonb,
  quiet_hours_json jsonb not null default '{}'::jsonb,
  digest_policy_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_key)
);
```

Examples of `event_key`:

- `reminder.due`
- `approval.requested`
- `research.completed`
- `integration.reauth_required`

### 12. `notification_deliveries`

Each attempted delivery is its own operational record.

```sql
create table notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid,
  action_request_id uuid,
  endpoint_id uuid not null references notification_endpoints(id),
  delivery_kind text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status notification_delivery_status not null default 'QUEUED',
  provider_message_id text,
  dedupe_key text,
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  error_json jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index ux_notification_deliveries_dedupe
  on notification_deliveries(endpoint_id, dedupe_key)
  where dedupe_key is not null;

create index idx_notification_deliveries_retry
  on notification_deliveries(status, next_attempt_at);
```

Why separate this from `reminders`:

- approvals also produce notifications
- research completion also produces notifications
- delivery failures should not mutate reminder state directly

### 13. `action_requests`

The existing spec has the right table name but not enough execution detail. Expand it to:

```sql
alter table action_requests
  add column connection_id uuid references connections(id),
  add column capability_key text,
  add column preview_json jsonb not null default '{}'::jsonb,
  add column risk_level action_risk_level not null default 'MEDIUM',
  add column idempotency_key text,
  add column approval_expires_at timestamptz,
  add column executed_at timestamptz,
  add column executor_ref text;

create unique index ux_action_requests_idempotency
  on action_requests(idempotency_key)
  where idempotency_key is not null;

create index idx_action_requests_status
  on action_requests(status, requested_at);
```

Recommended meaning of the new fields:

- `connection_id`: which integration is being used
- `capability_key`: stable internal capability like `calendar.events.create`
- `preview_json`: the exact human-reviewable action preview
- `risk_level`: drives UX and delivery behavior
- `idempotency_key`: blocks duplicate creates or sends
- `approval_expires_at`: lets approvals expire cleanly
- `executed_at`: explicit execution timestamp

### 14. `assistant_sessions` and `channel_bindings`

No major structural changes are required, but v1 should add indexes:

```sql
create index idx_assistant_sessions_thread
  on assistant_sessions(channel, account_id, conversation_id);

create unique index ux_channel_bindings_thread
  on channel_bindings(channel, account_id, conversation_id, thread_key);
```

## Foreign-key and deletion rules

Recommended deletion posture:

- user-visible canonical objects: soft-delete at the entity layer
- integration/runtime tables: keep operational history even if a connection is revoked
- credentials: revoke by rotating inactive, do not hard-delete unless the whole connection is being purged
- inbound webhooks and notification deliveries: retain for audit/debug windows

Recommended cascading behavior:

- deleting a connection can cascade to `connection_credentials`, `connection_tags`, `sync_cursors`, `webhook_channels`
- `inbound_webhook_events` should keep nullable `connection_id` so historical events survive provider revocation if needed
- `external_object_refs` should normally cascade with the connection

## Seed data for v1

Seed `provider_definitions` for:

- `google_gmail`
- `google_calendar`
- `google_people`
- `browser_extension`
- `web_push`
- `ntfy`

Recommended capability examples:

```json
{
  "read_email": true,
  "draft_email": true,
  "send_email": true,
  "read_calendar": true,
  "write_calendar": true,
  "capture_page": true,
  "deliver_notification": true
}
```

## Migration notes by provider

### Gmail

- `sync_cursors.checkpoint_json` will hold `historyId`
- `external_object_refs.object_type` will include `gmail_thread`
- actions use `capability_key` values like:
  - `gmail.drafts.create`
  - `gmail.messages.send`

### Calendar

- `sync_cursors.checkpoint_json` will hold `syncToken`
- `external_object_refs.object_type` will include `google_calendar_event`
- `etag` matters and should be stored

### Browser extension

- should still use `connections` so the browser profile is a real first-class integration surface
- can store profile/device metadata in `connection_tags`

### Notification endpoints

- `WEB_PUSH` and `NTFY` are `notification_endpoints`, not `connections`
- they are delivery surfaces, not context providers

## Index strategy to add after initial rollout

Once real traffic exists, likely follow-up indexes are:

- `connections(status, last_error_at desc)`
- `sync_cursors(connection_id, stream_key, full_resync_required)`
- `notification_deliveries(endpoint_id, status, created_at desc)`
- `action_requests(connection_id, status, approval_expires_at)`
- `external_object_refs(connection_id, object_type, last_seen_at desc)`

Do not add every speculative index on day 1. Start with the indexes in this document, then tune with observed slow paths.

## Hard recommendations

- Do not put encrypted credentials inside `connections.connection_metadata_json`.
- Do not model provider sync state as one generic blob on `connections`.
- Do not let external writes bypass `action_requests`, even if the chat UI already has confirmation text.
- Do not collapse notification endpoint registration and notification delivery into one table.
- Do not store provider webhook payloads only in logs; persist them in `inbound_webhook_events`.

## Final shape

If we follow this schema, the integration layer becomes:

- explicit enough to debug
- stable enough to survive reconnects and token rotation
- flexible enough to support Gmail, Calendar, browser capture, and notifications without redesign
- narrow enough that the rest of the app can stay provider-agnostic
