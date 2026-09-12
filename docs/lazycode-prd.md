# Lazycode Product and Implementation Plan

**Version:** 3.0

**Status:** Mastra-native architecture

**Primary language:** TypeScript

## 1. Product

Lazycode is a self-hostable coding-agent platform. It provides:

- a local CLI/TUI for repository work;
- persistent coding sessions with approvals and resume;
- build/plan modes and specialized subagents;
- skills and MCP integrations;
- hosted execution in isolated workspaces;
- a browser dashboard for sessions, approvals, diffs, usage, and failures.

Mastra is the agent framework. The product is the secure coding experience, deployment model, and clients around Mastra—not another agent framework.

## 2. Goals

1. Run the same coding behavior from terminal, browser, and hosted workers.
2. Keep clients separate from agent execution.
3. Execute model-selected file and shell operations through a secure workspace boundary.
4. Persist and resume sessions without duplicating framework state.
5. Support local bring-your-own-provider credentials and encrypted hosted credentials.
6. Make approvals, tool activity, changed files, usage, and failures observable.
7. Test product guarantees deterministically and evaluate model capability separately.

## 3. Non-goals

- a custom model registry or provider streaming layer;
- a custom agent/tool loop;
- a custom context manager, memory engine, or compaction engine;
- custom stream event types that mirror Mastra chunks;
- a custom subagent runtime;
- custom skills or MCP discovery when Mastra supplies it;
- a second database representation of Mastra threads/messages/runs;
- exposing hidden chain-of-thought;
- running untrusted commands on an application or worker host.

## 4. Technology decisions

| Concern            | Decision                                                            |
| ------------------ | ------------------------------------------------------------------- |
| Runtime            | Node.js 24 + TypeScript                                             |
| Package management | pnpm workspaces                                                     |
| Task runner        | Turborepo                                                           |
| Agent framework    | Mastra                                                              |
| Coding harness     | Mastra Code `AgentController`                                       |
| Validation         | Zod                                                                 |
| Agent server       | Mastra's Hono-based server                                          |
| Product routes     | Mastra custom API routes/middleware                                 |
| Agent state        | Mastra storage adapters                                             |
| Product data       | Drizzle; SQLite local where needed, PostgreSQL hosted               |
| Local workspace    | Mastra Workspace with local filesystem/sandbox for trusted use only |
| Hosted isolation   | container or remote Mastra sandbox provider                         |
| Queue              | BullMQ + Redis only if remote durability requires it                |
| CLI/TUI            | Ink + React                                                         |
| Web                | TanStack Start                                                      |
| Authentication     | WorkOS AuthKit                                                      |
| Tests              | Vitest + Playwright                                                 |
| Evals              | Mastra scorers/observability with live models outside CI            |

Framework packages are pinned together in the pnpm catalog. Do not depend on AI SDK provider packages directly unless a tested Mastra provider integration requires it.

## 5. Architecture

```text
┌───────────────────────────────────────┐
│ Clients                               │
│ Ink CLI/TUI     Web      future IDE   │
└──────────────────┬────────────────────┘
                   │ Mastra client/server streams
                   ▼
┌───────────────────────────────────────┐
│ apps/server                           │
│ Mastra composition root               │
│ AgentController                       │
│ auth/policy middleware                │
│ product-specific routes               │
└──────────┬───────────────┬────────────┘
           │               │
           ▼               ▼
┌──────────────────┐  ┌─────────────────┐
│ Mastra storage   │  │ product data    │
│ threads/messages │  │ users/projects  │
│ runs/traces      │  │ credentials/jobs│
└──────────────────┘  └─────────────────┘
           │
           ▼
┌───────────────────────────────────────┐
│ Mastra Workspace / Sandbox            │
│ trusted local OR isolated hosted      │
└───────────────────────────────────────┘
```

There is one Mastra composition root: `apps/server/src/mastra/index.ts`.

### Framework ownership

Mastra owns:

- model calls, streaming, retries, stop conditions, and cancellation;
- tool schemas, invocation, results, and hooks;
- run and stream chunk types;
- agent instructions, modes, and subagents;
- memory, threads, resources, and framework storage;
- workspaces and sandbox extension contracts;
- tool approval and suspension primitives;
- skills and MCP integration;
- framework server routes, observability, and scorers.

### Product ownership

Lazycode owns:

- users, organizations, projects, repositories, and remote-run records;
- authentication, authorization, and product policy;
- encrypted provider credential handling;
- secure workspace/sandbox provider selection;
- remote provisioning, queueing, cleanup, and reconciliation where needed;
- terminal and browser UX;
- product API routes not supplied by Mastra;
- stable product errors at public boundaries.

Before custom-building any framework-shaped component, prove the Mastra gap with a small acceptance test.

## 6. Repository structure

```text
apps/
├── server/
│   └── src/mastra/index.ts
├── cli/       # later
├── web/       # later
└── worker/    # later

packages/      # only shared product code with at least two consumers
tooling/       # TypeScript and ESLint configuration
tests/         # cross-package fixtures and evals
docker/        # later hosted infrastructure
docs/
```

Detailed rules are in [folder-structure.md](folder-structure.md).

Do not add `agent-core`, `models`, or `protocol` packages. Mastra replaces those proposed boundaries. Product-specific request/response schemas should live next to the route until multiple clients require a shared package.

## 7. Mastra composition

The foundation exports an empty Mastra instance. Feature phases add configuration in this order:

1. mount Mastra Code `AgentController`;
2. configure a trusted local workspace;
3. configure policy and tool approval;
4. configure persistent Mastra storage;
5. add clients;
6. add modes, subagents, skills, and MCP;
7. add hosted auth, product routes, and isolated workspaces;
8. add observability and scorers.

Lower-level `@mastra/core` agents are allowed only for requirements the controller cannot satisfy. They still register on the same Mastra instance.

## 8. Coding controller

Use `@mastra/code-sdk` to mount `AgentController`. It is the session-facing abstraction controlled by the TUI and other clients. In deployable `src/mastra/index.ts`, use the Code SDK's build-compatible `prepareAgentControllerMount()` → `new Mastra(prepared.mastraArgs)` → `prepared.finalize()` lifecycle instead of inventing a wrapper.

Initial acceptance criteria:

- one text-only turn streams through the controller;
- one repository read/tool turn completes;
- one edit/test iteration completes in a fixture repository;
- stop conditions prevent unlimited model steps;
- `AbortSignal` cancels model and command execution;
- provider failures become sanitized product errors;
- no live provider calls occur in CI.

Do not wrap the controller in a custom `AgentRuntime` interface.

## 9. Models and credentials

Mastra resolves supported model router IDs or provider model instances. Product configuration chooses an allowed model and supplies credentials through request context/environment handling.

Requirements:

- OpenRouter, OpenAI, and Anthropic support is validated through Mastra;
- model availability and metadata come from Mastra/provider capabilities where available;
- keys are never included in prompts, stream payloads, logs, or persisted product records in plaintext;
- local mode reads user-owned credentials without copying them into the repository;
- hosted credentials are encrypted, access-controlled, and injected only into the intended execution;
- debug output is redacted.

No `ModelRegistry` is planned.

## 10. Tools, workspace, and sandbox

Use Mastra's coding tools and Workspace/Sandbox APIs first. Add a custom tool only for a Lazycode product operation not supplied by the coding controller.

Expected coding capabilities:

- read/list/search files;
- edit/apply patches;
- run bounded commands;
- inspect Git status, diff, and log;
- maintain task state;
- delegate to configured subagents.

Security requirements:

- validate workspace-relative paths;
- reject traversal and symlink escapes;
- cap tool output and retained process output;
- apply command timeouts and abort signals;
- use explicit environment allowlists;
- never mount host root or the Docker socket;
- never execute untrusted commands through `LocalSandbox`;
- clean up isolated resources on every terminal state.

Tests target these guarantees through Mastra, rather than retesting Mastra's internal implementation.

## 11. Policy and approvals

Mastra tool approvals provide suspend/resume behavior. Lazycode adds product policy only where required.

Policy effects:

- allow;
- ask;
- deny.

Minimum behavior:

- read-only operations may be allowed by mode;
- file writes and shell commands follow mode and user policy;
- destructive or secret-sensitive operations require approval or denial;
- approval state is tied to user, session, and tool call;
- approving one call does not implicitly approve unrelated calls;
- denial returns a structured result so the agent can continue safely;
- subagent approval requests are visible to the parent client;
- policy is enforced server-side, never only in UI state.

Use controller configuration and tool hooks. Do not insert a second tool execution pipeline.

## 12. Storage and resume

Mastra storage is authoritative for framework data such as threads, messages, run state, memory, traces, and scores.

Lazycode product storage contains only data such as:

- users and organizations;
- projects and repository connections;
- encrypted provider credentials;
- remote-run provisioning state;
- product authorization and billing metadata.

Local development may use a supported file-backed/SQLite-compatible Mastra adapter. Hosted mode uses a production adapter compatible with PostgreSQL or the selected infrastructure.

Acceptance criteria:

- a session resumes after full process restart;
- user/resource/thread ownership is enforced;
- approval suspension survives the required lifecycle;
- product records reference Mastra identifiers rather than copying messages/events;
- schema constraints prevent cross-user access and duplicate job transitions.

## 13. Instructions and memory

Repository instructions must support `AGENTS.md`. Prefer controller/Mastra configuration and processors; add custom loading only for an uncovered requirement.

Required behavior:

- global and repository-root instructions;
- clear precedence and provenance in debug mode;
- no instruction file can bypass server-side policy;
- history remains within model limits using Mastra-supported memory/compaction behavior;
- summaries preserve objective, constraints, changed files, test results, failures, and remaining work;
- no hidden reasoning is exposed to clients.

Validate long-session behavior with acceptance tests before adding custom processors.

## 14. Modes and subagents

Initial controller modes:

- **Build:** normal coding; writes allowed by policy, shell generally asks.
- **Plan:** read-only investigation; writes denied, shell restricted.

Initial subagents:

- **Explore:** repository reading/search only.
- **Review:** read and diff inspection only.
- **Test:** approved test commands without source writes initially.

Requirements:

- model and tool availability may vary by mode;
- switching mode is explicit and visible;
- plan mode cannot gain write access through prompts, file tools, shell commands, or delegated work;
- file-tool approval and command-tool approval are enforced independently;
- subagents inherit relevant cancellation and policy;
- parallel read-only work is allowed;
- parallel writers are deferred until isolated worktrees are implemented.

Use controller modes and subagent configuration. Do not build child-session orchestration.

## 15. Skills and MCP

Adopt Mastra Code's skills and MCP configuration.

Skills:

- expose metadata without injecting all instructions into every prompt;
- load instructions/resources only when selected;
- validate project and global configuration;
- apply the same workspace and policy boundaries as other capabilities.

MCP:

- start with stdio;
- use explicit environment allowlists;
- apply authentication and transport timeouts;
- route impactful calls through server-side approval policy;
- add Streamable HTTP/OAuth only after stdio is stable.

Do not create custom registries/adapters unless a tested integration gap remains.

## 16. Clients and server boundary

CLI and web are clients of the Mastra server/controller boundary. They do not import or instantiate agent behavior.

Use Mastra client/server streaming where it meets requirements. Product routes are added only for product data and operations.

Client state may display:

- session/thread status;
- streamed assistant text;
- tool calls and sanitized outputs;
- approval requests;
- selected model and mode;
- changed files and diff;
- usage, duration, and safe errors.

Requirements:

- no chain-of-thought rendering;
- disconnect cancellation behavior is explicit;
- reconnect/resume uses Mastra-supported identifiers/state;
- streams redact prompts, tool definitions, keys, and infrastructure details;
- a custom event translation layer is added only if a public compatibility requirement proves necessary.

There is no custom JSON-RPC protocol in the planned architecture.

## 17. Local CLI/TUI

Commands:

```text
lazycode .
lazycode run "fix tests"
lazycode sessions
lazycode resume <id>
lazycode config
lazycode login
```

Interactive actions include help, model/mode selection, status, diff, approval resolution, resume, clear, and cancel.

Ink components derive UI state from client stream data. Reducers may normalize presentation state but must not implement agent, policy, or persistence behavior.

## 18. Hosted architecture

```text
Client
  │
  ▼
Mastra server + auth/product routes
  │
  ├── product database
  ├── Mastra storage
  └── remote-run dispatch (if required)
          │
          ▼
       worker
          │
          ▼
 isolated Mastra workspace/sandbox
```

Use WorkOS for hosted browser auth and CLI device authorization. Product routes enforce user and project isolation. Hosted workspace/sandbox resolution must be scoped per user and session; a static sandbox must never be shared across tenants. Any sandbox cache key must include the tenant/session scope.

Remote run states:

```text
queued → provisioning → cloning → preparing → running
                                    └───────→ waiting_approval
terminal: completed | failed | cancelled | timed_out
```

BullMQ remains conditional. Keep it only if Mastra's deployment/durable execution options do not satisfy disconnect survival, retries, and worker recovery.

Queue payloads contain only stable identifiers. The database remains the source of truth. Never blindly retry a run after a non-idempotent tool may have started.

## 19. Web dashboard

Planned routes:

```text
/dashboard
/projects
/sessions
/sessions/:id
/runs
/runs/:id
/settings/providers
/settings/modes
/settings/skills
/settings/mcp
```

Run detail shows conversation, mode/model, tool activity, approvals, subagents, changed files, diff, duration, usage, cost, and safe failures.

Use POST for commands and streaming/SSE for updates unless a demonstrated requirement needs WebSocket.

## 20. Observability and evals

Use Mastra observability and scorers rather than a custom tracing/eval framework.

Capture:

- model/provider and latency;
- token usage and cost;
- tool names, duration, and sanitized status;
- approvals and denials;
- mode/subagent activity;
- sandbox provisioning and cleanup;
- safe error codes and correlation identifiers.

Deterministic CI never calls live models. Live-model evals run separately against fixture repositories and measure task success, policy compliance, diff quality, test success, latency, and cost.

## 21. Error handling and recovery

Public errors contain:

- stable product code;
- safe message;
- retryability;
- correlation identifier.

Do not expose stack traces, provider bodies, SQL details, prompts, credentials, or sandbox internals.

Cancellation must propagate through client request, controller run, model stream, tools, sandbox commands, and remote provisioning where supported. Every terminal path performs cleanup.

## 22. Testing strategy

### Unit tests

Test Lazycode-owned logic:

- configuration and policy;
- route validation and authorization;
- product state transitions;
- stream-to-view reducers;
- credential redaction;
- workspace provider adapters.

### Integration tests

Test Mastra-backed product guarantees:

- controller stream and tool iteration with mocks;
- approval suspend/resume;
- cancellation propagation;
- persistent resume;
- mode restrictions;
- subagent policy propagation;
- MCP environment isolation.

### Sandbox tests

Against real isolated infrastructure:

- filesystem and environment isolation;
- timeout/cancellation;
- working directory;
- networking policy;
- cleanup after every terminal state;
- no host or Docker socket access.

### Browser tests

Use Playwright for auth, starting/resuming runs, approvals, reconnect, diff display, and user isolation.

### Evals

Live models are nightly/manual, never pull-request CI.

## 23. Security invariants

1. Untrusted commands never run on the server or worker host.
2. Credentials never enter prompts, streams, logs, diffs, or plaintext product storage.
3. MCP and sandbox processes receive explicit environment allowlists.
4. Paths remain inside the selected workspace after real-path resolution.
5. Server-side policy remains authoritative regardless of mode instructions or client state.
6. Tool and stream outputs are size-limited and redacted.
7. Hosted queries enforce user/project ownership.
8. Containers run unprivileged with CPU, memory, PID, time, filesystem, and network limits.
9. No Docker socket or host-root mount is exposed.
10. Non-idempotent tool execution is not silently replayed.

## 24. Implementation roadmap

Each phase is a vertical product slice. Framework internals are not separate deliverables.

### Phase 0 — Repository foundation (#1)

Complete: pnpm, Turbo, strict TypeScript, linting, formatting, Vitest, CI, and documentation.

### Phase 1 — Mastra foundation (#2)

- remove obsolete custom `models` and `protocol` packages;
- add `apps/server` as the Mastra application;
- export one empty Mastra instance;
- add Mastra build/dev scripts and one smoke test;
- keep CI independent of model keys.

Done when `pnpm check` and a Mastra production build pass.

### Phase 2 — Coding controller vertical slice (#3)

Add `@mastra/code-sdk`; integrate its build-compatible prepare/finalize lifecycle; stream one mocked/basic coding turn through the server boundary.

### Phase 3 — Workspace and sandbox safety (#4)

Configure trusted local workspace behavior and prove path, timeout, output, environment, and isolation guarantees.

### Phase 4 — Policy and approvals (#5)

Integrate product policy with Mastra hooks/approvals; prove allow/ask/deny and suspend/resume.

### Phase 5 — Storage and resume (#6)

Configure Mastra storage and minimal product records; resume after restart without duplicated framework tables.

### Phase 6 — Ink TUI client (#7)

Stream sessions, show tools, resolve approvals, display status/diff, and cancel.

### Phase 7 — Instructions and memory (#8)

Validate `AGENTS.md`, provenance, long-session memory, and output limits through Mastra.

### Phase 8 — Observability and eval foundation (#9)

Configure traces/scorers and fixture tasks; live models remain outside CI.

### Phase 9 — Build/Plan modes (#10)

Configure controller modes and prove Plan cannot write.

### Phase 10 — Subagents (#11)

Configure Explore/Review/Test and parallel read-only delegation.

### Phase 11 — Skills (#12)

Adopt Mastra Code skills with lazy instruction/resource loading and policy checks.

### Phase 12 — MCP (#13)

Configure stdio MCP with environment isolation, timeout, and approvals.

### Phase 13 — Server/client hardening (#14)

Use Mastra server/client APIs for reconnect, resume, cancellation, safe errors, and any proven product routes.

### Phase 14 — Hosted identity and product API (#15)

WorkOS, PostgreSQL product data, encrypted credentials, and strict user isolation.

### Phase 15 — Remote isolated execution (#16)

Select secure sandbox provider; add queue/worker only if required; prove disconnect survival and cleanup.

### Phase 16 — Web dashboard (#17)

Hosted session/run UX with approvals, diffs, usage, and Playwright coverage.

### Phase 17 — Advanced (#18)

Scope only after evidence: writer worktrees, LSP, Tree-sitter, remote MCP OAuth, handoff, PR creation, and warm sandbox pools.

## 25. Acceptance criteria for every phase

A phase is complete only when:

1. requested behavior works through the real architectural boundary;
2. the smallest deterministic regression check exists;
3. security/error behavior is tested where relevant;
4. docs describe the implemented state;
5. formatting, lint, typecheck, tests, and build pass;
6. no Mastra-owned subsystem was duplicated without a documented, tested gap.

## 26. References

- [Mastra project structure](https://mastra.ai/docs/getting-started/project-structure)
- [Mastra monorepos](https://mastra.ai/docs/deployment/monorepo)
- [Mastra server](https://mastra.ai/docs/deployment/mastra-server)
- [AgentController](https://mastra.ai/docs/harness/agent-controller)
- [Agent approvals](https://mastra.ai/docs/agents/agent-approval)
- [Workspace](https://mastra.ai/docs/workspace/overview)
- [Sandbox security](https://mastra.ai/docs/sandbox/overview)
- [Memory](https://mastra.ai/docs/memory/overview)
- [Custom server routes](https://mastra.ai/docs/server/custom-api-routes)
- [Evals](https://mastra.ai/docs/evals/overview)
