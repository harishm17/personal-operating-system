# Runtime Implementation Findings

Last updated: 2026-03-27

This document captures the deeper, code-backed findings from the current repo sweep.

It is focused on implementation patterns we can actually reuse for our own product:

- orchestration
- tool execution
- approvals / human-in-the-loop
- memory / context
- workflow automation
- assistant shell design

## Repos inspected in code

Primary repos read directly:

- `research/repos/letta`
- `research/repos/goose`
- `research/repos/anything-llm`
- `research/repos/librechat`
- `research/repos/open-webui`
- `research/repos/workflow-use`
- `research/repos/browser-use`
- `research/repos/mem0`
- `research/repos/reme`
- `research/repos/onyx`
- `research/repos/mastra`
- `research/repos/openclaw`
- `research/repos/lossless-claw`
- `research/repos/openclaw-codex-app-server`

## Strongest concrete findings

### 1. The best systems keep the LLM loop thin

This is the single most important pattern.

The strongest repos do not rely on one giant autonomous prompt loop. They split the system into:

- a conversation-facing orchestrator
- deterministic runtime services
- persistent storage / memory
- background jobs or workflow engines

Evidence:

- `research/repos/anything-llm/server/utils/agentFlows/executor.js`
  - flow execution is deterministic step execution over a small set of flow types
  - variable substitution and step ordering are explicit
- `research/repos/onyx/backend/onyx/prompts/deep_research/orchestration_layer.py`
  - orchestrator is prompt-driven, but task execution is tightly constrained through tool contracts
- `research/repos/openclaw/extensions/llm-task/src/llm-task-tool.ts`
  - OpenClaw wraps a generic JSON-only LLM task as a controlled runtime tool, not a free-form agent
- `research/repos/openclaw-codex-app-server/src/controller.ts`
  - shell/controller code focuses on routing, thread binding, interaction state, permissions, and delivery

Implication for us:

- our assistant should be a thin orchestrator over workflow engines
- "task extraction", "research", "watch checks", "daily planning", and "follow-up detection" should each have deterministic backends

### 2. Tool approval is a first-class runtime concept, not an afterthought

Several repos have very explicit approval mechanics.

Evidence:

- `research/repos/goose/crates/goose/src/agents/tool_confirmation_router.rs`
  - pending approvals are keyed by request id and resolved through async channels
- `research/repos/anything-llm/server/utils/telegramBot/utils/navigation/callbacks/handleToolApproval.js`
  - chat approval UI is wired back to the worker thread actually waiting on the decision
- `research/repos/openclaw-codex-app-server/docs/specs/PERMISSIONS.md`
  - file edits are treated as proposed changes with an approval lifecycle, not merely an undo
- `research/repos/librechat/api/server/services/ActionService.js`
  - OAuth and action execution are modeled as explicit stateful flows, not invisible magic

Implication for us:

- every external write should go through `action_requests`
- an action request should have:
  - `request_id`
  - `action_type`
  - `target`
  - `proposed_payload`
  - `reason`
  - `status`
  - `approved_by`
  - `expires_at`
- reminder nudges, research, and passive reads can run automatically
- sending email, calendar writes, browser-side irreversible actions, and destructive updates should default to approval

### 3. Multi-agent works best as delegation with bounded contracts

The strongest multi-agent code does not treat subagents as free-floating personalities. It gives them:

- a bounded prompt
- a limited tool set
- a max-turn budget
- a return contract

Evidence:

- `research/repos/letta/letta/services/tool_executor/multi_agent_tool_executor.py`
  - agent-to-agent messaging is mediated as tool execution
- `research/repos/goose/crates/goose/src/agents/subagent_handler.rs`
  - subagents get rendered prompts with task instructions, available tools, and max-turn constraints
- `research/repos/onyx/backend/onyx/prompts/deep_research/orchestration_layer.py`
  - orchestrator delegates high-level research tasks, sometimes in parallel, but only through the research tool
- `research/repos/mastra/packages/core/src/harness/harness.ts`
  - the harness tracks mode, thread, approvals, questions, plan approvals, and workspace centrally instead of letting agents improvise state management

Implication for us:

- subagents should be rare and profile-specific
- good initial subagent/workflow profiles:
  - `capture_promote`
  - `company_prep`
  - `tool_comparison`
  - `product_watch`
  - `weekly_review`
- each profile should have strict input/output schemas and its own tool permissions

### 4. Memory is not one thing

The repos converge on layered memory.

Evidence:

- `research/repos/mem0/mem0/memory/main.py`
  - memory operations are scoped with `user_id`, `agent_id`, `run_id`, and optional `actor_id`
- `research/repos/mem0/mem0/memory/graph_memory.py`
  - graph memory is separate from vector recall and uses explicit entity / relationship extraction
- `research/repos/reme/reme/memory/file_based/components/compactor.py`
  - file-based conversational memory is periodically compacted with prior summary awareness
- `research/repos/mastra/packages/core/src/processors/memory/working-memory.ts`
  - working memory is explicitly injected as system context and can be read-only or tool-updatable
- `research/repos/letta/letta/services/memory_repo/block_markdown.py`
  - memory blocks are stored as inspectable markdown files with frontmatter
- `research/repos/letta/letta/services/memory_repo/git_operations.py`
  - those memory files are backed by git operations, not hidden DB blobs
- `research/repos/lossless-claw/src/compaction.ts`
  - history is compacted into layered summaries with fresh-tail protection
- `research/repos/lossless-claw/src/retrieval.ts`
  - retrieval operates over both raw messages and summary DAG nodes
- `research/repos/openclaw/extensions/memory-core/src/memory/manager.ts`
  - OpenClaw memory-core supports hybrid search, embedding providers, watchers, caches, and background sync

Implication for us:

we should explicitly separate:

- `raw capture / event history`
- `working memory`
- `long-term semantic memory`
- `procedural / assistant-rule memory`
- `evidence bundles / research memory`

Our current product plan should keep all of those, but make only a few of them visible in the UI.

### 5. Workflow automation is moving from selectors to semantic execution

This is especially important for browser/action workflows.

Evidence:

- `research/repos/workflow-use/workflows/workflow_use/recorder/semantic_converter.py`
  - recorded browser steps are converted from CSS selectors into semantic targets, context hints, and position hints
- `research/repos/workflow-use/workflows/workflow_use/workflow/semantic_executor.py`
  - execution refreshes semantic mappings, retries, and uses fallback matching strategies
- `research/repos/browser-use/browser_use/agent/service.py`
  - the browser agent carries planning, loop detection, callback hooks, vision, tools, and failover in a unified execution service
- `research/repos/browser-use/browser_use/agent/judge.py`
  - there is an explicit judge layer for end-task evaluation using trajectory + screenshots + optional ground truth

Implication for us:

- if we support browser automation, we should not store brittle selectors as the canonical workflow representation
- workflows should store:
  - semantic target text
  - context hints
  - fallback selectors
  - verification rules
  - variable slots
- important recurring flows should have judge/verification logic, not just “action succeeded”

### 6. Assistant shells separate tools, actions, functions, and pipelines

The shells are most reliable when those concepts are distinct.

Evidence:

- `research/repos/open-webui/backend/open_webui/functions.py`
  - functions are treated like callable pseudo-models / pipes
- `research/repos/open-webui/backend/open_webui/routers/pipelines.py`
  - inlet/outlet pipeline filters wrap the request/response path
- `research/repos/open-webui/backend/open_webui/routers/tools.py`
  - tools include local tools plus OpenAPI and MCP servers, with auth and access control
- `research/repos/librechat/api/server/services/ToolService.js`
  - tools are loaded, executed, and streamed as required actions
- `research/repos/librechat/api/server/services/RunManager.js`
  - run steps are deduplicated and processed incrementally
- `research/repos/anything-llm/server/utils/agents/aibitat/index.js`
  - agent runtime, channels, functions, citations, and attachments are separated cleanly

Implication for us:

we should keep these runtime concepts separate:

- `tool`
- `action`
- `workflow`
- `background_job`
- `research_run`
- `approval_request`

This will keep the system much easier to reason about than a single catch-all “agent tool call” table.

### 7. Research systems are getting serious about orchestration and evals

Onyx is especially strong here.

Evidence:

- `research/repos/onyx/backend/onyx/prompts/deep_research/orchestration_layer.py`
  - explicit clarification -> planning -> orchestration -> report flow
- `research/repos/onyx/backend/onyx/prompts/deep_research/research_agent.py`
  - research agents are forced into search/read/think/report cycles
- `research/repos/onyx/backend/onyx/tools/tool_runner.py`
  - multiple search/web/open-url calls are merged and parallelized
- `research/repos/onyx/backend/tests/regression/search_quality/run_search_eval.py`
  - search quality and answer quality are evaluated with a real harness, metrics, and concurrency controls

Implication for us:

- research should be its own subsystem
- it should produce reusable artifacts:
  - `research_run`
  - `research_brief`
  - `citation`
  - `evidence_item`
  - `followup_answer_context`
- follow-up questions should usually query the prior evidence bundle before rerunning the world

### 8. Product-facing assistant features are often implemented as small runtime extensions

This showed up clearly in Goose, Browser Use, and Mastra.

Evidence:

- `research/repos/goose/crates/goose/src/agents/platform_extensions/todo.rs`
  - the TODO state is stored in session extension data and injected back into model context automatically
- `research/repos/goose/crates/goose/src/agents/platform_extensions/chatrecall.rs`
  - prior chats are exposed through a search/load tool instead of assuming the agent “just remembers”
- `research/repos/browser-use/examples/features/follow_up_tasks.py`
  - the same browser runtime can keep going across follow-up tasks instead of restarting from scratch
- `research/repos/mastra/packages/core/src/agent/__tests__/tool-approval.e2e.test.ts`
  - tool approval is tested at tool level, agent level, and sub-agent level
- `research/repos/mastra/packages/core/src/agent/__tests__/workflow-tool-memory-isolation.test.ts`
  - workflow/subagent execution explicitly restores parent memory context after completion or failure

Implication for us:

- we should support persistent assistant-side artifacts like:
  - `today note`
  - `working checklist`
  - `current focus state`
  - `chat recall`
- those should be stored explicitly and re-injected, not inferred only from chat history
- workflow execution must restore parent context cleanly after subflows

## Most reusable patterns by repo

### Letta

Best ideas:

- agent loop factory / multiple agent modes
- multi-agent messaging through controlled tool calls
- inspectable git-backed memory blocks

What to borrow:

- inspectable long-lived memory files
- bounded multi-agent delegation

What not to copy directly:

- full agent runtime complexity for v1

### Goose

Best ideas:

- approval router keyed by request id
- scheduler as a first-class tool surface
- structured subagent execution
- todo and chat recall as lightweight platform extensions

What to borrow:

- approval primitives
- subagent boundaries
- scheduled jobs as a tool, not just cron
- session-scoped todo/checklist state
- explicit chat-recall tool rather than vague memory claims

### AnythingLLM

Best ideas:

- deterministic flow executor
- agent graph/channels runtime
- citations and attachments buffered at runtime
- chat approval surfaces tied to worker execution

What to borrow:

- flow steps as data
- channel/member concept for multi-agent or multi-role workflows

### LibreChat

Best ideas:

- explicit required-action tool processing
- tool/action split
- step dedupe in run polling
- OAuth as a resumable action flow

What to borrow:

- action/request lifecycle
- run-step dedupe logic

### Open WebUI

Best ideas:

- functions, pipelines, tools, memories, knowledge are separate router domains
- remote filters can wrap model I/O
- tool servers include MCP and OpenAPI with access control

What to borrow:

- plugin / runtime layering
- middleware around model requests

### Workflow Use + Browser Use

Best ideas:

- semantic workflows rather than CSS-only recordings
- verification + recovery
- judged execution traces

What to borrow:

- workflow recording -> semantic conversion -> healing
- post-run judge for fragile automations

### Mem0 + ReMe + Lossless Claw

Best ideas:

- scoped memory filters
- graph memory as optional enrichment
- compaction as a real subsystem
- summary DAGs instead of one flat rolling summary

What to borrow:

- layered memory
- compaction + retrieval separation
- procedural memory distinct from factual memory

### Onyx

Best ideas:

- explicit deep-research orchestration
- merged/parallelized tool execution
- retrieval quality evals

What to borrow:

- research profiles and evidence bundles
- eval harness from day one

### Mastra

Best ideas:

- harness abstraction over threads, approvals, questions, workspace, memory
- working memory as a processor
- lots of test coverage around tool suspension, memory, and network behavior
- explicit protection against request-context / memory corruption across workflow boundaries

What to borrow:

- harness-like runtime boundary
- processors as pluggable transforms around the model loop
- request-context restoration guarantees after subflows

### OpenClaw + Lossless Claw + OpenClaw Codex App Server

Best ideas:

- OpenClaw as shell/runtime/plugin platform
- Lossless Claw as context-engine replacement with summary DAG retrieval
- app-server bridge pattern for delegating to specialized runtimes

What to borrow:

- use OpenClaw as shell, not as canonical data model
- keep context engine pluggable
- bridge specialized runtimes behind explicit plugin contracts

## Concrete changes to our plan

These findings make the product plan more concrete.

### Keep

- OpenClaw as the assistant shell
- our own canonical backend
- progressive structuring
- separate raw captures from promoted operational objects

### Add explicitly

- `action_requests` with approval lifecycle
- `workflow_runs` and `workflow_steps`
- `research_runs`, `research_briefs`, `citations`, `evidence_items`
- `working_memory_items`
- `procedural_rules`
- `summary_nodes` and `summary_edges`
- `assistant_sessions` and `run_steps`

### Narrow the runtime architecture

We should build around 4 layers:

1. `shell`
   - OpenClaw plugin surfaces
   - mobile/chat/web entry points

2. `orchestrator`
   - intent parse
   - workflow selection
   - approval decisions
   - follow-up over prior evidence
   - current-focus / checklist injection

3. `engines`
   - capture/promote engine
   - planning/reminder engine
   - research engine
   - workflow/browser engine
   - memory/compaction engine

4. `stores`
   - postgres objects/events
   - vector search
   - object/blob storage
   - summary DAG / evidence store

### Be more careful about what not to overbuild in v1

Avoid in v1:

- generalized autonomous multi-agent swarms
- a full visual flow builder
- graph memory as the primary memory system
- wide third-party connectors we do not actually need

Prefer in v1:

- one strong orchestrator
- deterministic backend workflows
- source-backed memory and research
- approvals for writes
- incremental workflow automation

## Current strongest blueprint

If I compress the best code-backed pattern into one line:

Use OpenClaw as the shell, a harness/orchestrator in our backend, deterministic workflow engines for the heavy work, summary-DAG plus hybrid retrieval for memory, and explicit approval-backed action requests for all important writes.
