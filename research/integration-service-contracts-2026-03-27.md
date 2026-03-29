# Integration Service Contracts

Last updated: 2026-03-27

This document defines the internal service boundaries for the integration substrate.

The goal is to keep provider-specific behavior behind adapters while the rest of the app talks to a small, stable set of contracts.

## Big conclusion

We should not let Gmail, Calendar, browser extension, or notification logic leak directly into the capture, planning, and product modules.

The right split is:

- provider registry and adapter contracts
- connection and auth services
- sync and webhook orchestration
- action request and execution services
- notification endpoint and delivery services

## Design rules

- Provider-specific SDK code lives behind adapters.
- No other module reads encrypted credentials directly.
- External writes never execute without going through `ActionRequestService`.
- Sync workers write normalized change batches, not arbitrary side effects.
- Notification delivery is event-driven and endpoint-aware, not reminder-specific.
- Browser capture should enter the same capture and entity promotion pipelines as chat, email, and research.

## Shared types

Use stable TypeScript DTOs like these at the boundaries.

```ts
type ProviderKey =
  | 'google_gmail'
  | 'google_calendar'
  | 'google_people'
  | 'browser_extension'
  | 'web_push'
  | 'ntfy';

type CapabilityKey =
  | 'gmail.mailbox.read'
  | 'gmail.drafts.create'
  | 'gmail.messages.send'
  | 'calendar.events.read'
  | 'calendar.events.create'
  | 'calendar.events.update'
  | 'browser.capture.page'
  | 'notifications.web_push.deliver'
  | 'notifications.ntfy.deliver';

type SyncStreamKey =
  | 'gmail.mailbox'
  | 'google_calendar.primary'
  | 'google_people.contacts';

type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
```

```ts
interface ProviderDescriptor {
  providerKey: ProviderKey;
  displayName: string;
  authMode: 'oauth2' | 'api_key' | 'session_token' | 'none';
  defaultReadScopes: string[];
  defaultWriteScopes: string[];
  capabilities: CapabilityKey[];
  supportsIncrementalSync: boolean;
  supportsWebhooks: boolean;
  supportsActions: boolean;
}
```

```ts
interface NormalizedChangeBatch {
  connectionId: string;
  streamKey: string;
  checkpoint?: Record<string, unknown>;
  requiresFullResync?: boolean;
  entities: NormalizedExternalEntity[];
  deletions: NormalizedDeletion[];
  followupJobs?: FollowupJobRequest[];
}

interface NormalizedExternalEntity {
  externalObject: ExternalObjectRecord;
  canonicalUpsert: CanonicalUpsertRequest;
  evidence?: Record<string, unknown>;
}

interface ExternalObjectRecord {
  objectType: string;
  externalId: string;
  externalParentId?: string;
  etag?: string;
  sourceUrl?: string;
  metadata: Record<string, unknown>;
}

interface CanonicalUpsertRequest {
  entityKind: 'RESOURCE' | 'EVENT' | 'PERSON' | 'TASK' | 'MEMORY_ITEM';
  dedupeKey?: string;
  title?: string;
  body?: string;
  attributes: Record<string, unknown>;
  sourceSummary?: Record<string, unknown>;
}

interface NormalizedDeletion {
  objectType: string;
  externalId: string;
  reason: 'DELETED' | 'CANCELLED' | 'NOT_FOUND';
}

interface FollowupJobRequest {
  jobName: string;
  payload: Record<string, unknown>;
}
```

## Service map

### 1. `ProviderRegistryService`

Owns provider discovery and the provider catalog view.

Responsibilities:

- load seeded `provider_definitions`
- return provider descriptors to UI and other services
- resolve the correct adapter for a provider key

Core methods:

```ts
interface ProviderRegistryService {
  listProviders(): Promise<ProviderDescriptor[]>;
  getProvider(providerKey: ProviderKey): Promise<ProviderDescriptor>;
  getAdapter(providerKey: ProviderKey): ProviderAdapter;
}
```

### 2. `ConnectionService`

Owns connection lifecycle.

Responsibilities:

- create connection shells before OAuth starts
- update connection metadata after successful auth
- validate, disable, revoke, or reconnect connections
- expose connection health for UI and scheduling

Core methods:

```ts
interface CreateConnectionInput {
  providerKey: ProviderKey;
  userId: string;
  workspaceId: string;
  requestedCapabilities: Record<string, boolean>;
  displayName?: string;
}

interface ConnectionService {
  createPendingConnection(input: CreateConnectionInput): Promise<{ connectionId: string }>;
  markActive(connectionId: string, params: MarkActiveParams): Promise<void>;
  markError(connectionId: string, params: ConnectionErrorParams): Promise<void>;
  markRequiresReauth(connectionId: string, reason: string): Promise<void>;
  validateConnection(connectionId: string): Promise<ConnectionValidationResult>;
  listConnections(userId: string, workspaceId: string): Promise<ConnectionSummary[]>;
}
```

### 3. `OAuthSessionService`

Owns the login handshake.

Responsibilities:

- create persisted OAuth sessions
- generate secure `state_token`
- exchange callbacks into credential writes
- handle expired and cancelled handshakes

Core methods:

```ts
interface BeginOAuthInput {
  connectionId: string;
  providerKey: ProviderKey;
  redirectUri: string;
  callbackUrl: string;
  requestedScopes: string[];
}

interface BeginOAuthResult {
  sessionId: string;
  authorizationUrl: string;
  expiresAt: string;
}

interface OAuthSessionService {
  begin(input: BeginOAuthInput): Promise<BeginOAuthResult>;
  consumeCallback(stateToken: string, params: Record<string, string>): Promise<OAuthExchangeResult>;
  expireSession(sessionId: string): Promise<void>;
}
```

Important rule:

- only `OAuthSessionService` and `CredentialService` should ever see raw authorization codes or refresh tokens

### 4. `CredentialService`

Handles encryption, rotation, and refresh bookkeeping.

Responsibilities:

- encrypt and persist credential payloads
- fetch and decrypt the active credential set for a connection
- rotate inactive credential versions
- update expiry and refresh thresholds

Core methods:

```ts
interface CredentialService {
  store(connectionId: string, kind: string, payload: Record<string, unknown>): Promise<void>;
  getActive(connectionId: string): Promise<DecryptedCredentialSet>;
  rotate(connectionId: string, payload: Record<string, unknown>): Promise<void>;
  markRefreshAfter(connectionId: string, refreshAfter: Date): Promise<void>;
}
```

### 5. `ProviderAdapter`

Each provider implements this. This is the most important boundary in the whole integration layer.

```ts
interface ProviderAdapter {
  describe(): ProviderDescriptor;

  beginAuth?(input: BeginOAuthInput): Promise<BeginOAuthResult>;
  exchangeAuthCallback?(input: ProviderExchangeInput): Promise<ProviderExchangeResult>;

  validateConnection(input: ProviderConnectionContext): Promise<ProviderValidationResult>;

  bootstrapSync?(input: ProviderSyncInput): Promise<NormalizedChangeBatch>;
  incrementalSync?(input: ProviderSyncInput): Promise<NormalizedChangeBatch>;

  renewWebhook?(input: ProviderWebhookRenewInput): Promise<ProviderWebhookRenewResult>;
  ingestWebhook?(input: ProviderWebhookIngestInput): Promise<ProviderWebhookRoutingResult>;

  previewAction?(input: ProviderActionPreviewInput): Promise<ProviderActionPreview>;
  executeAction?(input: ProviderActionExecuteInput): Promise<ProviderActionExecuteResult>;
}
```

Required adapter design rules:

- adapters may call SDKs or external APIs
- adapters may not mutate app tables directly
- adapters return normalized payloads to orchestration services
- adapters should be deterministic for the same input plus external state

### 6. `SyncOrchestratorService`

Owns scheduling and execution of external reads.

Responsibilities:

- decide bootstrap vs incremental
- fetch active cursor and active credentials
- call the provider adapter
- commit canonical upserts, external refs, cursor updates, and follow-up jobs
- mark full resync when providers invalidate cursors

Core methods:

```ts
interface RunSyncInput {
  connectionId: string;
  streamKey: SyncStreamKey;
  trigger: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK' | 'RECOVERY';
}

interface SyncOrchestratorService {
  run(input: RunSyncInput): Promise<SyncRunResult>;
  requestFullResync(connectionId: string, streamKey: string, reason: string): Promise<void>;
}
```

Important implementation detail:

- `run()` should produce one transactionally committed normalized batch when possible
- expensive enrichment jobs should be emitted as follow-up jobs, not done inline with the provider sync

### 7. `WebhookIngressService`

Owns webhook receipt and replay.

Responsibilities:

- verify signatures where supported
- persist raw headers and payload first
- derive `dedupe_key`
- route to the correct connection and stream
- trigger sync or follow-up jobs

Core methods:

```ts
interface WebhookIngressService {
  receive(providerKey: ProviderKey, headers: Record<string, string>, payload: unknown): Promise<{ eventId: string }>;
  process(eventId: string): Promise<WebhookProcessResult>;
}
```

Important rule:

- webhook handlers should return HTTP success quickly after persisting the event
- all heavy work should happen in background jobs

### 8. `ExternalObjectRefService`

Owns provenance and reconciliation between internal objects and external objects.

Responsibilities:

- upsert `external_object_refs`
- resolve internal objects by external identifiers
- preserve provider metadata like `etag`, thread ID, or source URL

Core methods:

```ts
interface ExternalObjectRefService {
  upsert(entityId: string, input: ExternalObjectRecord, connectionId: string): Promise<void>;
  resolve(connectionId: string, objectType: string, externalId: string): Promise<ExternalRefResolution | null>;
}
```

### 9. `ActionRequestService`

Owns outbound write approval flow.

Responsibilities:

- create a reviewable preview of an external write
- persist approval state and expiration
- publish approval notifications
- execute the action only after approval or preapproval

Core methods:

```ts
interface CreateActionRequestInput {
  assistantSessionId?: string;
  requestedBy: string;
  targetEntityId?: string;
  connectionId: string;
  capabilityKey: CapabilityKey;
  toolName: string;
  argumentsJson: Record<string, unknown>;
  previewJson: Record<string, unknown>;
  riskLevel: ActionRiskLevel;
  approvalRequired: boolean;
  approvalExpiresAt?: string;
  idempotencyKey?: string;
}

interface ActionRequestService {
  create(input: CreateActionRequestInput): Promise<{ actionRequestId: string }>;
  approve(actionRequestId: string, actorRef: string): Promise<void>;
  reject(actionRequestId: string, actorRef: string, reason?: string): Promise<void>;
  expire(actionRequestId: string): Promise<void>;
  execute(actionRequestId: string): Promise<ActionExecutionResult>;
}
```

Execution rule:

- `execute()` should call `ProviderAdapter.executeAction()`
- execution should be idempotent by `idempotencyKey`

### 10. `NotificationEndpointService`

Owns endpoint registration and policy resolution.

Responsibilities:

- register or update in-app, web push, ntfy, and email endpoints
- store endpoint config and default preferences
- resolve eligible endpoints for an event type

Core methods:

```ts
interface NotificationEndpointService {
  register(input: RegisterEndpointInput): Promise<{ endpointId: string }>;
  disable(endpointId: string): Promise<void>;
  touch(endpointId: string): Promise<void>;
  listForUser(userId: string): Promise<NotificationEndpointSummary[]>;
  resolveEligibleEndpoints(userId: string, eventKey: string): Promise<ResolvedEndpointPlan[]>;
}
```

### 11. `NotificationDeliveryService`

Owns delivery attempts, retries, and acknowledgements.

Responsibilities:

- create `notification_deliveries`
- hand off to channel-specific delivery adapters
- record sent, delivered, failed, and acknowledged states
- retry with backoff when appropriate

Core methods:

```ts
interface NotificationDeliveryService {
  queue(input: QueueNotificationInput): Promise<{ deliveryId: string }>;
  deliver(deliveryId: string): Promise<NotificationDeliveryResult>;
  acknowledge(deliveryId: string, actorRef: string): Promise<void>;
  cancelPendingForDedupeKey(endpointId: string, dedupeKey: string): Promise<void>;
}
```

### 12. `BrowserCaptureService`

Owns first-party browser capture ingest.

Responsibilities:

- authenticate extension-originated capture requests
- persist raw capture immediately
- enqueue enrichment and classification jobs
- return lightweight save confirmation DTOs

Core methods:

```ts
interface BrowserCapturePayload {
  pageUrl: string;
  title?: string;
  selectionText?: string;
  htmlSnippet?: string;
  metadata?: Record<string, unknown>;
  requestedAction?: 'SAVE' | 'REMIND' | 'ASK';
}

interface BrowserCaptureService {
  capture(connectionId: string, payload: BrowserCapturePayload): Promise<BrowserCaptureResult>;
}
```

## Job contracts

These jobs should be the main async primitives in v1.

### 1. `connections.validate`

```json
{
  "connectionId": "uuid",
  "requestedBy": "system"
}
```

### 2. `sync.run`

```json
{
  "connectionId": "uuid",
  "streamKey": "gmail.mailbox",
  "trigger": "SCHEDULED"
}
```

### 3. `webhooks.process`

```json
{
  "eventId": "uuid"
}
```

### 4. `webhooks.renew_channel`

```json
{
  "webhookChannelId": "uuid"
}
```

### 5. `actions.execute`

```json
{
  "actionRequestId": "uuid"
}
```

### 6. `notifications.deliver`

```json
{
  "deliveryId": "uuid"
}
```

### 7. `captures.enrich_resource`

```json
{
  "captureId": "uuid",
  "resourceId": "uuid"
}
```

## API surface contracts

The internal services above should support these HTTP and API flows cleanly.

### Connection setup

- `POST /connections/:provider/connect`
- `GET /connections`
- `GET /connections/:id`
- `POST /connections/:id/reconnect`
- `GET /connections/:id/sync-status`

Expected behavior:

- `connect` creates a pending connection and OAuth session, then returns a redirect URL
- `reconnect` should preserve the existing connection record when possible

### Integration webhooks

- `POST /integrations/gmail/webhook`
- `POST /integrations/calendar/webhook`

Expected behavior:

- persist the webhook event immediately
- return fast
- enqueue processing or sync

### Browser capture

- `POST /integrations/browser-extension/capture`

Expected behavior:

- authenticate extension install
- persist raw capture
- return a compact result with capture ID and lightweight inferred outcome

### Notifications

- `POST /notification-endpoints`
- `GET /notification-endpoints`
- `PATCH /notification-endpoints/:id`
- `GET /notification-deliveries`

## Failure and retry rules

- connection validation failures set `connections.status = 'REQUIRES_REAUTH'` when user action is needed
- cursor-expiration failures set `sync_cursors.full_resync_required = true`
- webhook renewal failures set `webhook_channels.status = 'FAILED'`
- notification delivery retries should use bounded exponential backoff
- action executions should never automatically retry unsafe high-risk actions unless the provider explicitly guarantees idempotency

## What must stay provider-agnostic

The rest of the app should not know:

- how Gmail represents history cursors
- how Calendar represents sync tokens
- how web push stores subscription JSON
- how ntfy authenticates topics

The rest of the app should know only:

- there is a connection
- it has capabilities and health
- a sync produced normalized internal changes
- an action request can be approved and executed
- a notification was queued and delivered

## Final shape

If we respect these service boundaries, we get:

- narrow provider adapters
- stable domain services
- explicit approval and delivery flows
- enough structure to build integrations aggressively without spreading connector logic through the product
