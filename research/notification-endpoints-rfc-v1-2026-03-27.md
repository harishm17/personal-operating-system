# Notification Endpoints RFC (V1)

Last updated: 2026-03-27

## Purpose

Define the delivery layer that makes reminders, approvals, follow-ups, and research completion actually reach the user.

This system should make the product better at:

- timely reminders
- approval requests
- follow-up nudges
- degraded-connection alerts
- quick actions from wherever the user already is

It should not become a full notification campaign platform.

## Goals

- Model notification endpoints separately from reminders and tasks.
- Support in-app, web push, ntfy, and email in v1.
- Route events through per-user preferences and quiet-hours policies.
- Support action buttons and deep links where channels allow it.
- Keep retries, acknowledgements, and dedupe explicit in `notification_deliveries`.

## Non-goals

- Marketing or broadcast campaigns
- Complex template editor in v1
- SMS and voice calls in the first release
- Multi-user notification routing rules beyond the owning user

## Supported endpoint types

### 1. `IN_APP`

First-class default endpoint.

Why:

- easiest to ship
- best channel for approvals and rich context
- acts as the canonical inbox channel

### 2. `WEB_PUSH`

Installable PWA or browser push endpoint.

Why:

- fast reminders without a native mobile app
- strong fit for approvals and due reminders
- aligns with ntfy and Novu-inspired channel layering without adding a large system

### 3. `NTFY`

Optional self-hosted push-like delivery.

Why:

- strong fit for self-hosted users
- light operational overhead
- good fallback where web push support or browser registration is limited

### 4. `EMAIL`

Lower-priority fallback channel.

Why:

- useful for digests, reconnection notices, and reminders when push is unavailable
- not the best first choice for rapid approvals, but still valuable

## Event types

Suggested v1 event keys:

- `reminder.due`
- `reminder.escalated`
- `approval.requested`
- `approval.expiring`
- `research.completed`
- `integration.reauth_required`
- `digest.daily`
- `digest.weekly`

These event keys should drive `notification_preferences`, not ad hoc per-feature logic.

## Registration flows

### In-app endpoint

- auto-created for every user
- `endpoint_ref = primary`
- cannot be fully removed, only effectively muted by preference

### Web push endpoint

Flow:

1. user enables push in web app or PWA
2. client obtains browser subscription object
3. client POSTs subscription to `POST /notification-endpoints`
4. backend stores endpoint as `WEB_PUSH`
5. endpoint is marked default if user chooses it

Suggested `endpoint_config_json` for web push:

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "userAgent": "Chrome 135",
  "platform": "macOS"
}
```

### NTFY endpoint

Flow:

1. user provides server URL and topic
2. optional auth token or username/password secret is stored through secure config flow
3. backend validates publish capability with a test message or dry-run validation
4. endpoint is saved as `NTFY`

Suggested `endpoint_config_json` for ntfy:

```json
{
  "baseUrl": "https://ntfy.example.com",
  "topic": "harish-reminders",
  "authMode": "bearer"
}
```

Secrets should not live in plain `endpoint_config_json`. Sensitive auth should be encrypted similarly to other credentials or stored in a secure secret field abstraction.

### Email endpoint

Flow:

- can be auto-created from primary account email
- can also be user-specified if we support alternate notification email later

## Delivery model

Every event that wants delivery should resolve through this path:

1. feature emits notification intent
2. `NotificationEndpointService` resolves eligible endpoints by user preferences
3. `NotificationDeliveryService` creates one or more `notification_deliveries`
4. channel adapter delivers
5. delivery result updates status and follow-up behavior

Why this matters:

- one reminder can produce several delivery attempts over time
- one approval can go to in-app immediately and email later if unacknowledged
- delivery failures should be visible and retryable independently

## Payload model

Suggested normalized notification payload:

```json
{
  "eventKey": "approval.requested",
  "title": "Approve calendar event",
  "body": "KT with Sathish on Thursday at 3:00 PM",
  "deepLink": "/approvals/123",
  "collapseKey": "approval:123",
  "priority": "high",
  "actions": [
    {
      "key": "approve",
      "label": "Approve",
      "deepLink": "/approvals/123?action=approve"
    },
    {
      "key": "reject",
      "label": "Reject",
      "deepLink": "/approvals/123?action=reject"
    }
  ],
  "metadata": {
    "actionRequestId": "123"
  }
}
```

Channel adapters may downgrade this payload when the channel is simpler, but the normalized structure should stay rich.

## Channel behavior

### In-app

- always supported
- should show the richest detail
- should support acknowledgment and deep links
- should be the source of truth for inbox-style notification history

### Web push

- best for fast reminders and approvals
- should support action buttons where browser support exists
- should use collapse keys to avoid duplicate spam

### NTFY

- good for concise reminders and approvals
- action support may be limited depending on client behavior
- deep link should still be included in payload body or metadata

### Email

- use mostly for digests, fallback alerts, and medium-urgency reminders
- do not rely on email as the sole approval path in v1

## Quiet hours and preference model

`notification_preferences` should remain the policy source.

Suggested rules:

- quiet hours are per user, optionally overridden per event key
- `approval.requested` may bypass quiet hours only if the user explicitly enables that later
- `research.completed` should usually respect quiet hours and often prefer digesting
- `integration.reauth_required` should be important but not overly spammy

V1 defaults:

- reminders and approvals: in-app plus preferred push-like channel
- research complete: in-app only unless user opts in
- digests: email or in-app

## Dedupe and escalation

### Dedupe

Use `collapseKey` plus endpoint-specific dedupe rules.

Examples:

- repeated approval notices for the same `action_request_id` should collapse
- repeated reminder nudges for the same reminder and trigger window should collapse unless escalation level changed

### Escalation

Notification escalation should come from reminder and approval state machines, not the delivery adapters themselves.

Examples:

- reminder due -> in-app + push
- reminder ignored for 2 hours -> second delivery with escalated wording
- approval close to expiry -> high-priority push plus in-app banner

## Acknowledgement model

`notification_deliveries.acknowledged_at` should reflect user acknowledgment when possible.

Sources of acknowledgement:

- user opens or dismisses in-app notification
- user taps a quick action that resolves the underlying item
- user explicitly marks reminder as seen

Why this matters:

- it prevents duplicate follow-ups
- it helps the system learn whether a channel is working
- it gives us more control over reminder escalation

## Retry policy

Suggested v1 retry rules:

- web push transient failure: retry up to 3 times with exponential backoff
- ntfy transient failure: retry up to 3 times
- email transient failure: retry up to 2 times
- in-app delivery should almost never fail unless DB write fails

Hard rule:

- do not retry old stale approvals after `approval_expires_at`
- do not retry suppressed or user-disabled endpoints

## Security and privacy posture

- web push subscriptions are sensitive device identifiers and should be stored carefully
- ntfy auth secrets should be encrypted or secret-managed, not plain JSON
- deep links in notifications should not expose raw secrets or one-click destructive actions without server validation
- quick actions must always re-check auth on the server side

## UI expectations

### Notifications settings

Should show:

- registered endpoints
- default endpoint per type
- enabled event types
- quiet hours
- digest preferences

### Inbox and Today

Should show:

- pending approvals
- escalated reminders
- recent delivery failures that matter

### Integrations

Should show:

- push registration health
- ntfy validation status if configured
- email fallback availability

## Rollout plan

### Phase 1

- `IN_APP`
- `WEB_PUSH`
- `notification_deliveries`
- reminder and approval routing

### Phase 2

- `NTFY`
- richer action buttons
- acknowledgement tracking improvements

### Phase 3

- email digest and fallback refinement
- stronger quiet-hours and digest controls

## Final recommendation

The notification layer should be treated as a core subsystem, not a small helper.

If reminders, approvals, and follow-ups do not arrive reliably and in the right channels, the assistant will feel much less useful no matter how strong the rest of the product is.
