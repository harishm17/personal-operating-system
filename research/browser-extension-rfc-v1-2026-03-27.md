# Browser Extension RFC (V1)

Last updated: 2026-03-27

## Purpose

Define the first-party browser extension that makes the assistant feel instantly accessible.

This extension should make the product better at:

- saving pages and links
- capturing selected text and lightweight page context
- turning web context into tasks, reminders, and resources
- getting information into the system faster than opening the full app

It should not start as a full browsing agent.

## Goals

- Provide one-click capture from the browser.
- Support save page, save link, save selection, and remind-about-this flows.
- Authenticate cleanly against our app without storing long-lived raw credentials in the extension.
- Return a fast success response while heavier enrichment happens in background jobs.
- Register the browser install as a first-class capture surface in the integration model.

## Non-goals

- Autonomous browsing
- Live DOM automation or form submission in v1
- Always-on passive page monitoring
- Full sidebar workspace replacement in the initial release

## Provider identity

- `provider_key = browser_extension`
- primary capability: `browser.capture.page`

This provider is unusual because it is first-party. It still deserves a `connections` row so the browser profile becomes a real integration surface with explicit lifecycle and metadata.

## Product surfaces

V1 extension surfaces:

- toolbar action popup
- context-menu actions
- optional content-script capture of selected text
- open-current-page in app

Later surfaces:

- side panel
- current-tab assistant context
- quick approval actions in extension notifications

## UX goals

The save interaction should feel nearly instant.

Target behavior:

- user clicks save
- extension sends minimal payload immediately
- backend creates raw capture and returns success in under a few seconds
- heavy work like readability extraction, screenshotting, summarization, and task detection happens later

That mirrors the strongest patterns we saw in Karakeep and related capture tools.

## Registration and auth flow

### Pairing model

Recommended v1 auth model:

- user is already logged into our web app
- user opens extension and requests pairing
- web app issues a short-lived pairing token
- extension exchanges pairing token for a browser-scoped session token
- app creates or reuses a `connections` row for this browser profile

Suggested connection metadata:

```json
{
  "browser_name": "Chrome",
  "profile_label": "Default",
  "extension_version": "0.1.0",
  "platform": "macOS"
}
```

Rules:

- do not copy raw user auth cookies into extension storage
- browser session tokens should be revocable and scoped to capture actions
- if pairing is revoked, the extension should show reconnect state rather than silently failing

## Architecture

Recommended v1 technical shape:

- Manifest V3 extension
- service worker as the background entry point
- popup UI for quick actions
- content script only when a capture action needs DOM or selection context
- backend endpoint: `POST /integrations/browser-extension/capture`

Why this shape:

- MV3 is the stable long-term browser model
- service worker handles context menu clicks and session state
- content scripts should stay narrow to avoid privacy creep and complexity

## Capture actions

### 1. Save page

Payload should include:

- page URL
- title
- canonical URL if available
- favicon URL if easy to capture
- lightweight metadata like selected tab title and host

### 2. Save selection

Payload should include:

- page URL
- title
- selected text
- optional nearby context snippet
- selection offsets when easy to capture

### 3. Save link

Payload should include:

- page URL where action occurred
- target link URL
- target link text if available

### 4. Remind me about this

Payload should include everything from save page or save selection plus:

- natural-language reminder text if supplied
- optional time phrase

### 5. Ask about this

Payload should include:

- page URL
- selection text if present
- one short user question

V1 should route this into normal capture plus a chat response path, not a separate browsing-agent stack.

## Capture payload contract

Suggested request body:

```json
{
  "pageUrl": "https://example.com/article",
  "title": "How Incremental Sync Works",
  "canonicalUrl": "https://example.com/article",
  "selectionText": "Gmail history cursors can expire...",
  "htmlSnippet": "<article>...</article>",
  "metadata": {
    "pageHost": "example.com",
    "favIconUrl": "https://example.com/favicon.ico",
    "browserCapturedAt": "2026-03-27T18:41:00Z"
  },
  "requestedAction": "SAVE"
}
```

Suggested response body:

```json
{
  "captureId": "uuid",
  "status": "ACCEPTED",
  "summary": "Saved to Research and queued for enrichment",
  "inferredOutcomes": [
    "resource_created"
  ]
}
```

## Backend behavior

On ingest, backend should:

1. authenticate browser connection
2. create raw capture record immediately
3. attach basic browser metadata
4. enqueue enrichment pipeline
5. optionally emit lightweight inferred outcomes for the popup

The ingest path should not block on:

- readability extraction
- page fetch retries
- screenshot archival
- embeddings
- task extraction
- reminder parsing beyond minimal confidence cases

## Enrichment pipeline

Recommended follow-up jobs:

1. `captures.fetch_canonical_page`
2. `captures.extract_readability`
3. `captures.generate_snapshot`
4. `captures.classify_entities`
5. `captures.promote_candidates`

Expected outcomes:

- page becomes a `Resource`
- useful text becomes searchable and embeddable
- extracted tasks and reminders go through the normal promotion logic
- noisy or low-confidence ideas stay as Inbox candidates

## Data mapping

### Internal mapping

Browser captures should normally create or update `Resource` entities.

`resources` mapping:

- `resource_kind = WEB_PAGE` for page saves
- `resource_kind = WEB_SELECTION` for text-only saves when no durable page fetch succeeds
- `original_url` from capture payload

`resource_snapshots` mapping:

- `snapshot_kind = BROWSER_CAPTURE`
- `snapshot_kind = FETCHED_PAGE`
- `snapshot_kind = READABILITY_EXTRACTION`

`resource_artifacts` mapping:

- `artifact_kind = RAW_CAPTURE_JSON`
- `artifact_kind = HTML_SNIPPET`
- `artifact_kind = EXTRACTED_TEXT`
- `artifact_kind = SCREENSHOT` if later enabled

`external_object_refs` mapping:

- optional row using `object_type = browser_capture`
- `external_id` can be extension-generated capture UUID if we want client-side dedupe

## Dedupe rules

V1 dedupe should be conservative.

Suggested heuristic:

- if the same user saves the same canonical URL within a short time window, append a new snapshot to the existing resource instead of creating a new one
- if the capture has a distinct selection text or explicit reminder text, keep it as a new capture even if the URL matches

## Privacy and security posture

Hard rules:

- no passive page scraping without user action
- do not capture full page HTML unless the user invokes a capture action that needs it
- clearly show what is being sent on save
- keep browser session tokens scoped and revocable
- do not store sensitive auth cookies in extension storage

Optional future feature that must stay opt-in:

- current-tab context sharing for assistant answers

## Error handling

### Auth expired

- extension should show reconnect state
- backend returns 401 or explicit reconnect code
- no silent drop of captures

### Backend accepted but enrichment failed

- capture remains in Inbox with degraded status
- user can retry enrichment from the app

### Offline or network failure

- popup should surface failure immediately
- optional local retry queue can come later, but not required for v1

## UI expectations

### Popup

Should support:

- save page
- save selection
- remind me about this
- ask about this
- quick link into the saved resource or Inbox item

### Context menu

Should support:

- save link
- save selection
- remind me about this

### App side

Saved browser captures should appear in:

- Inbox when classification is ambiguous
- Research when clearly informational
- Today if capture immediately produced a high-confidence reminder or task

## Rollout plan

### Phase 1

- pairing and session auth
- save page and save selection
- background enrichment and resource creation

### Phase 2

- remind me about this
- ask about this
- stronger dedupe and inferred outcomes

### Phase 3

- side panel or current-tab context experiments if capture UX proves strong

## Final recommendation

The browser extension should be a zero-friction capture surface first.

If we try to make it a full browsing agent too early, we will lose the one thing that actually matters for v1: getting context into the assistant faster than every competing tool.
