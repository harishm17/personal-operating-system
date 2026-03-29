# Research Index

Last updated: 2026-03-27

This folder captures the current research direction for a code-first "second brain + personal assistant" product.

Recommended reading path:

1. `context/product-brief.md`
2. `context/todo-page-example.md`
3. `open-source-landscape-2026-03-27.md`
4. `openclaw-ecosystem-2026-03-27.md`
5. `repo-code-patterns-2026-03-27.md`
6. `agent-runtime-patterns-2026-03-27.md`
7. `repo-scouting-log-2026-03-27.md`
8. `runtime-implementation-findings-2026-03-27.md`
9. `storage-retrieval-patterns-2026-03-27.md`
10. `integrations-deep-dive-2026-03-27.md`
11. `interaction-and-notification-flows-2026-03-27.md`
12. `database-schema-and-migrations-2026-03-27.md`
13. `integration-service-contracts-2026-03-27.md`
14. `gmail-integration-rfc-v1-2026-03-27.md`
15. `calendar-integration-rfc-v1-2026-03-27.md`
16. `browser-extension-rfc-v1-2026-03-27.md`
17. `notification-endpoints-rfc-v1-2026-03-27.md`
18. `design-implications.md`
19. `product-design-deep-dive-2026-03-27.md`
20. `application-technical-spec-2026-03-27.md`
21. `master-build-plan-2026-03-27.md`
22. `implementation-roadmap-2026-03-27.md`
23. `core-entity-model-research-2026-03-27.md`
24. `ontology-overlap-and-facets-2026-03-27.md`
25. `universal-ontology-schema-rfc-2026-03-27.md`

What these docs are for:

- Preserve product intent and user context.
- Track what current open-source projects are doing well.
- Track which exact code patterns are worth copying.
- Track higher-level runtime patterns for orchestrator + engine style agents.
- Keep an incremental log of repo scouting and deeper code reads.
- Distill storage, retrieval, artifact, and worker patterns from the strongest knowledge and assistant repos.
- Distill concrete runtime architecture decisions from actual open-source implementations.
- Make the integration, approval, capture, and notification layers concrete enough to build.
- Add implementation-grade schema, service, and provider RFC artifacts for the v1 integration layer.
- Make the personal-assistant ontology concrete enough to decide what becomes a real entity versus a soft tag or derived view.
- Separate ideas worth borrowing from tools we do not want to depend on.
- Turn research into architecture and implementation decisions.
- Provide one canonical master plan that translates the research set into build order, modules, schema direction, and execution sequencing.

Current core product direction:

- Our app owns the source of truth for work, memory, reminders, research, planning, and assistant runtime state.
- External apps are inputs and outputs, not the core product.
- Capture stays flexible, but offline-safe local outbox and replay are part of v1 quality.
- Structure is introduced progressively when downstream behavior needs it.
- The stable root ontology should stay small: `actor`, `context`, `work_item`, `event`, `resource`, `memory`, and `rule`.
- Narrower concepts like people, projects, tasks, books, applications, interviews, and routines should usually be subtypes, views, or templates rather than root physical tables.
- Tags should stay weak and topical only.
- OpenClaw should be a shell and runtime surface over our backend, not the canonical data model, and v1 should include context-engine plus memory-slot bridging.

Suggested entry point now:

- Start with `master-build-plan-2026-03-27.md` if the goal is to begin implementation planning or execution. It now includes the stronger v1 commitments around offline replay, identity resolution, telemetry, and OpenClaw memory integration.
- Read `application-technical-spec-2026-03-27.md` alongside it for the architecture baseline.
- Read `universal-ontology-schema-rfc-2026-03-27.md` if making schema or naming decisions.

Non-goals for now:

- Do not build a Notion clone.
- Do not build a Todoist clone.
- Do not depend on SaaS note/task products as the main data model.
- Do not overfit the system to rigid upfront schemas.
