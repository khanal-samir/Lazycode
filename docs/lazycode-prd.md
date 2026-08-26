# Self-Hostable Coding Agent Platform

## Product Requirements Document + Implementation Guide

**Version:** 2.0  
**Status:** Implementation blueprint  
**Primary language:** TypeScript  
**Architecture goal:** One reusable agent runtime powering local CLI, hosted remote execution, web UI, and future IDE clients.

---

# 1. Executive Summary

This project is a self-hostable coding-agent platform designed to teach the architecture behind modern coding agents.

The platform should support:

- Interactive local CLI/TUI coding
- Bring-your-own model API keys
- OpenAI, OpenRouter, and Anthropic providers
- Repository-aware file/search/edit/shell/Git tools
- Permission-controlled execution
- Persistent and resumable sessions
- Context budgeting and compaction
- `AGENTS.md` project instructions
- Configurable primary agents
- Subagents implemented as child sessions
- Parallel read-only subagents
- Skills loaded lazily from `SKILL.md`
- Model Context Protocol (MCP)
- Local and remote execution using the same agent runtime
- Docker-isolated remote workspaces
- Hosted remote jobs that survive client disconnects
- CLI and web clients
- Authentication for hosted mode
- Usage/cost/latency telemetry
- Deterministic automated tests
- Real-model coding-agent evals

The project is intentionally **not** a full Cursor replacement. The main product is the **coding-agent harness**.

---

# 2. Product Vision

The central architectural principle is:

> Build one reusable coding-agent runtime that can run against different model providers, different execution environments, and different clients without changing its core logic.

Local:

```text
CLI
 ↓
AgentRuntime
 ↓
LocalWorkspace
 ↓
Repository
```

Remote:

```text
CLI / Web
 ↓
Hosted API
 ↓
Queue
 ↓
Worker
 ↓
AgentRuntime
 ↓
DockerWorkspace
 ↓
Cloned Repository
```

The UI must not own the agent loop.

The worker must not contain a separate agent implementation.

The server must not duplicate orchestration behavior.

---

# 3. Goals

## Primary goals

1. Understand how model/tool agent loops work.
2. Learn context management and compaction.
3. Safely expose filesystem and shell capabilities.
4. Build persistent and resumable sessions.
5. Implement subagents and delegation.
6. Integrate MCP.
7. Implement reusable skills.
8. Reuse the same runtime locally and remotely.
9. Learn sandboxing and remote job orchestration.
10. Build a technically substantial portfolio project.

## Secondary goals

- Polished terminal UX
- Remote web dashboard
- Multi-provider support
- Agent telemetry
- Plugin support later
- LSP and Tree-sitter integration later

---

# 4. Non-Goals

Do not build these initially:

- Full code editor
- Cursor-style autocomplete
- VS Code extension
- Browser automation
- Repository vector database
- Embedding-heavy RAG
- Kubernetes orchestration
- Custom foundation models
- Custom OAuth implementation
- Large agent swarms
- Full enterprise billing
- Full organization RBAC
- Custom terminal emulator

---

# 5. Core Product Principles

## 5.1 Local-first

A developer must be able to use the product without creating an account.

```bash
agent .
```

should work locally using the user's own model API key.

## 5.2 Bring your own credentials

Initial providers:

- OpenAI API
- OpenRouter
- Anthropic

Later:

- Ollama
- Custom OpenAI-compatible endpoints

Provider API credentials should remain separate from hosted-product authentication.

## 5.3 One runtime

CLI, worker, API, and web must all use the same `AgentRuntime`.

## 5.4 Explicit permissions

All impactful tool execution passes through a permission engine.

## 5.5 Event-driven design

The runtime emits typed events rather than directly manipulating UI.

## 5.6 Test the harness, eval the model

- **Tests** verify deterministic system correctness.
- **Evals** measure non-deterministic agent capability with real models.

---

# 6. Technology Decisions

| Concern                    | Decision                    |
| -------------------------- | --------------------------- |
| Language                   | TypeScript                  |
| Runtime                    | Node.js                     |
| Package manager            | pnpm                        |
| Monorepo task runner       | Turborepo                   |
| CLI UI                     | Ink + React                 |
| Model/provider abstraction | Vercel AI SDK Core          |
| Agent orchestration        | Custom                      |
| Validation                 | Zod                         |
| API server                 | Hono                        |
| Local persistence          | SQLite                      |
| Hosted persistence         | PostgreSQL                  |
| ORM                        | Drizzle                     |
| Queue                      | BullMQ                      |
| Queue backend              | Redis                       |
| Remote isolation           | Docker                      |
| Repository search          | ripgrep                     |
| File discovery             | fd / glob                   |
| Git                        | Native Git CLI              |
| Unit/integration tests     | Vitest                      |
| Browser E2E                | Playwright                  |
| Agent evals                | Custom eval runner          |
| MCP                        | Official MCP TypeScript SDK |
| Hosted auth                | WorkOS AuthKit              |
| Web                        | TanStack Start              |
| Code parsing later         | Tree-sitter                 |
| Code intelligence later    | LSP                         |
| CI                         | GitHub Actions              |
| Local infra                | Docker Compose              |

---

# 7. Why These Technologies

## pnpm + Turborepo

Use pnpm workspaces for package management and Turborepo for dependency-aware task execution and caching.

Turbo should handle:

```text
build
test
lint
typecheck
dev
```

Do not make Turborepo part of runtime architecture.

Nx is not necessary initially because the repository does not require its heavier generators/executors/workspace governance.

## Vitest

Use Vitest for:

- Unit tests
- Agent-core integration tests
- Hono API tests
- CLI command tests
- Database tests
- MCP tests
- Sandbox tests

## Playwright

Use only where browser behavior matters:

- Hosted login
- Remote-run UI
- Approval UI
- Diff viewer
- Session navigation

## Vercel AI SDK

Use for provider-level infrastructure:

- Streaming
- Tool-call normalization
- Provider adapters
- Usage metadata
- Mock language models for deterministic tests

Do **not** initially use a high-level agent framework. The custom agent harness is the learning objective.

## Hono

Keep Hono thin. Route handlers should call services/runtime APIs, not contain the agent loop.

## Docker

Remote model-selected commands must execute away from the worker host.

---

# 8. Repository Structure

Start with:

```text
agent-platform/
│
├── apps/
│   ├── cli/
│   ├── server/
│   ├── worker/
│   └── web/
│
├── packages/
│   ├── agent-core/
│   ├── protocol/
│   ├── models/
│   ├── tools/
│   ├── workspace/
│   ├── persistence/
│   └── config/
│
├── tests/
│   ├── fixtures/
│   └── evals/
│
├── docker/
├── scripts/
├── docs/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── vitest.config.ts
└── playwright.config.ts
```

Split later when real boundaries appear:

```text
packages/
├── permissions/
├── context/
├── agents/
├── skills/
├── mcp/
├── hooks/
├── telemetry/
├── auth/
└── sandbox/
```

Do not create 20 empty packages on day one.

---

# 9. Package-Boundary Rules

Recommended dependency direction:

```text
models ──────────────┐
tools ───────────────┤
workspace ───────────┤
permissions ─────────┤
context ─────────────┤
agents ──────────────┤
skills ──────────────┤
mcp ─────────────────┤
persistence ─────────┤
                     ▼
                agent-core
                     │
            ┌────────┼────────┐
            ▼        ▼        ▼
           CLI     server   worker
```

Rules:

1. `agent-core` must not import Ink.
2. `agent-core` must not import Hono.
3. `agent-core` must not depend on TanStack Start.
4. Tools depend on `Workspace` interfaces, not concrete workspace implementations.
5. Protocol types do not import runtime implementations.
6. Worker creates `DockerWorkspace` and injects it.
7. CLI creates `LocalWorkspace` and injects it.
8. Persistence sits behind repository interfaces.

---

# 10. North-Star Architecture

```text
                         ┌─────────────────────┐
                         │       CLIENTS       │
                         │                     │
                         │ CLI   Web   API/IDE │
                         └─────────┬───────────┘
                                   │
                        Bidirectional Protocol
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │       APP SERVER        │
                     │                         │
                     │ Session Manager         │
                     │ Auth                    │
                     │ RPC / Events            │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │       AGENT CORE        │
                     │                         │
                     │ Agent Runtime           │
                     │ Agent Loop              │
                     │ Context Manager         │
                     │ Compaction              │
                     │ Session State           │
                     └────────────┬────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
          Tool Registry      Agent Registry    Skill Registry
                │                 │                 │
        ┌───────┼───────┐         │                 │
        │       │       │         │                 │
      Native   MCP    Plugin   Subagents         SKILL.md
        │
        ▼
 Permission Engine
        │
        ▼
     Workspace
        │
  ┌─────┴─────────┐
  ▼               ▼
Local           Remote
Workspace       Workspace
                  │
                  ▼
                Docker

                                  │
                                  ▼
                         Model Registry
                                  │
               ┌──────────────────┼─────────────────┐
               ▼                  ▼                 ▼
            OpenAI           OpenRouter         Anthropic
```

---

# 11. Agent Runtime

Suggested interface:

```ts
export interface AgentRuntime {
  run(input: StartRunInput): AsyncIterable<AgentEvent>;

  continue(sessionId: string, input: UserTurnInput): AsyncIterable<AgentEvent>;

  cancel(sessionId: string): Promise<void>;

  spawn(input: SpawnAgentInput): Promise<AgentResult>;
}
```

Dependencies:

```ts
export interface AgentRuntimeDependencies {
  modelRegistry: ModelRegistry;
  toolRegistry: ToolRegistry;
  permissionEngine: PermissionEngine;
  contextManager: ContextManager;
  sessionRepository: SessionRepository;
  agentRegistry: AgentRegistry;
  skillManager: SkillManager;
  workspaceFactory: WorkspaceFactory;
  eventSink: EventSink;
  telemetry: Telemetry;
}
```

Use dependency injection. Do not instantiate infrastructure inside the runtime.

---

# 12. Agent Loop

Concept:

```text
Input
 ↓
Load session
 ↓
Build context
 ↓
Call model
 ↓
Stream output
 ↓
Tool call?
 ├─ No → finalize
 └─ Yes
      ↓
 validate input
      ↓
 permission
      ↓
 allow / ask / deny
      ↓
 execute tool
      ↓
 normalize output
      ↓
 persist result
      ↓
 next model step
```

The loop owns:

- Step numbering
- Model lifecycle
- Streaming
- Tool-call collection
- Permission pause/resume
- Tool result insertion
- Max steps
- Cancellation
- Retry decisions
- Compaction checks
- Final state transitions

It must **not** own:

- Terminal rendering
- HTTP response creation
- Docker process construction
- SQL
- Provider-specific auth
- MCP transport internals

---

# 13. Model Provider Layer

Provider registry:

```ts
interface ModelRegistry {
  resolve(modelId: string): LanguageModel;
  getMetadata(modelId: string): ModelMetadata;
}
```

Metadata:

```ts
interface ModelMetadata {
  id: string;
  provider: string;
  contextWindow?: number;
  supportsTools: boolean;
  supportsReasoning?: boolean;
  supportsImages?: boolean;
  maxOutputTokens?: number;
}
```

Model identifiers:

```text
openai/<model>
openrouter/<provider>/<model>
anthropic/<model>
```

Use AI SDK for provider calls and streaming, while preserving your own internal message/event contracts.

---

# 14. Tool System

Tool contract:

```ts
interface AgentTool<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;

  permissionResource?(input: I, context: ToolContext): PermissionResource;

  execute(input: I, context: ToolContext): Promise<O>;
}
```

Execution flow:

```text
Model tool call
 ↓
ToolRegistry lookup
 ↓
Zod validation
 ↓
Permission resource
 ↓
PermissionEngine
 ↓
ALLOW / ASK / DENY
 ↓
Tool.execute()
 ↓
Output truncation/redaction
 ↓
Persist
 ↓
Return result to model
```

## MVP tools

### Filesystem

- `read`
- `write`
- `edit`
- `apply_patch`
- `list`
- `glob`

### Search

- `grep`

### Shell

- `bash`

### Git

- `git_status`
- `git_diff`
- `git_log`

### Agent state

- `todo_read`
- `todo_write`

### Delegation

- `subagent`

### Skills

- `skill`

Later:

- `web_search`
- `web_fetch`
- `lsp`
- `tree_sitter`
- `tool_search`

---

# 15. Workspace Abstraction

```ts
interface Workspace {
  root: string;

  readFile(path: string): Promise<string>;

  writeFile(path: string, contents: string): Promise<void>;

  exists(path: string): Promise<boolean>;

  list(path: string): Promise<WorkspaceEntry[]>;

  glob(pattern: string): Promise<string[]>;

  grep(query: GrepQuery): Promise<GrepResult[]>;

  exec(command: ExecCommand): Promise<ExecResult>;

  git(): GitWorkspace;
}
```

Implementations:

```text
LocalWorkspace
DockerWorkspace
WorktreeWorkspace
TestWorkspace
```

No tool should call Node `fs` or `child_process` directly.

---

# 16. Permission Engine

Effects:

```ts
type PermissionEffect = "allow" | "ask" | "deny";
```

Rule:

```ts
interface PermissionRule {
  action: string;
  resource: string;
  effect: PermissionEffect;
}
```

Example:

```json
{
  "permissions": [
    {
      "action": "read",
      "resource": "*",
      "effect": "allow"
    },
    {
      "action": "read",
      "resource": ".env*",
      "effect": "ask"
    },
    {
      "action": "shell",
      "resource": "git status*",
      "effect": "allow"
    },
    {
      "action": "shell",
      "resource": "git push*",
      "effect": "ask"
    },
    {
      "action": "shell",
      "resource": "rm -rf *",
      "effect": "deny"
    }
  ]
}
```

Recommended resolution:

1. Collect matching rules.
2. Most-specific match wins.
3. Equal specificity: latest rule wins.
4. Use configurable default.
5. Sensitive operations default to `ask` or `deny`.

Approval lifecycle:

```text
tool requested
 ↓
permission = ASK
 ↓
emit permission.requested
 ↓
session → waiting_approval
 ↓
client responds
 ↓
persist decision
 ↓
continue
```

Options:

- Allow once
- Deny once
- Allow matching resource for session
- Deny matching resource for session

---

# 17. Sessions, Turns, and Steps

Definitions:

- **Session:** Long-lived conversation/task.
- **Turn:** One user input through agent completion.
- **Step:** One model iteration inside a turn.

```text
Session
 ├── Turn 1
 │    ├── Step 1
 │    ├── Tool Call
 │    ├── Step 2
 │    └── Complete
 │
 └── Turn 2
```

Session statuses:

```text
idle
running
waiting_approval
failed
cancelled
archived
```

Turn statuses:

```text
queued
running
waiting_approval
completed
failed
cancelled
timed_out
```

---

# 18. Event Architecture

Event envelope:

```ts
interface AgentEvent<TType extends string, TPayload> {
  id: string;
  sessionId: string;
  turnId?: string;
  parentSessionId?: string;
  sequence: number;
  type: TType;
  timestamp: string;
  payload: TPayload;
}
```

Core events:

```text
session.started
session.updated

turn.started
turn.completed
turn.failed
turn.cancelled

message.started
message.delta
message.completed

model.started
model.completed
model.failed

tool.requested
tool.started
tool.output
tool.completed
tool.failed

permission.requested
permission.resolved

file.changed

subagent.started
subagent.completed
subagent.failed

compaction.started
compaction.completed
compaction.failed

usage.updated
```

Requirements:

- Monotonic sequence per session
- Serializable payloads
- No secrets
- Payload limits
- Large output stored separately if necessary

---

# 19. Context Manager

Every model request is explicitly constructed.

Suggested order:

```text
1. Base runtime instructions
2. Agent definition
3. Repository instructions
4. Active skills
5. Compacted session summary
6. Recent messages
7. Relevant recent tool results
8. TODO state
9. Current user input
```

Responsibilities:

- Token estimation
- History selection
- Tool-schema budget
- Output truncation
- Instruction precedence
- Compaction threshold
- Working-set tracking

---

# 20. Context Compaction

Trigger before hitting model context limits.

Compaction summary must preserve:

- User objective
- Constraints
- Important architecture discoveries
- Files inspected
- Files modified
- Commands run
- Test results
- Errors
- Decisions
- Remaining TODO items
- Important subagent findings

Persist:

```ts
interface Compaction {
  id: string;
  sessionId: string;
  fromSequence: number;
  toSequence: number;
  summary: string;
  modelId: string;
  createdAt: Date;
  inputTokens?: number;
  outputTokens?: number;
}
```

Later hidden system agents may include:

```text
summary
title
compaction
```

---

# 21. Repository Instructions

Support `AGENTS.md`.

Initial:

- Global instructions
- Repository-root `AGENTS.md`

Later:

- Hierarchical directory `AGENTS.md`

Resolution:

```text
global
+
repository root
+
nearest applicable directory instructions
```

Keep provenance so debug mode can show which instruction files were loaded.

---

# 22. Agent Definitions

```ts
interface AgentDefinition {
  id: string;
  description: string;
  mode: "primary" | "subagent" | "all";
  model?: string;
  instructions: string;
  permissions: PermissionRule[];
  allowedTools?: string[];
  maxSteps?: number;
  maxCostUsd?: number;
}
```

Locations:

```text
~/.config/agent/agents/
.agent/agents/
```

Use Markdown frontmatter.

## Built-in primary agents

### Build

Purpose: normal coding.

Typical permissions:

```text
read       allow
grep       allow
glob       allow
edit       allow
bash       ask
subagent   allow
```

### Plan

Purpose: architecture and read-only investigation.

```text
read       allow
grep       allow
glob       allow
edit       deny
bash       mostly ask/deny
subagent   allow
```

---

# 23. Subagents

A subagent is another agent session with parent/root references.

```text
Main Session
 id=1
 root=1

 ├── Explore
 │    id=2
 │    parent=1
 │    root=1
 │
 └── Test
      id=3
      parent=1
      root=1
```

Parent should receive a compact child result instead of every child message.

Initial subagents:

### Explore

- read
- grep
- glob
- no write

### Review

- read
- grep
- git diff
- no write

### Test

- read
- restricted test commands
- no write initially

Parallel execution:

1. Parallel read-only first.
2. Parallel writers later with Git worktrees.

---

# 24. Skills

Mental model:

```text
Agent = who performs work
Skill = how to perform a reusable workflow
Tool = executable capability
```

Structure:

```text
.agent/
└── skills/
    └── create-pr/
        ├── SKILL.md
        ├── references/
        ├── scripts/
        └── templates/
```

Do not inject every full skill into every prompt.

Expose metadata, then load on demand:

```text
skill("database-migration")
```

Skill manager:

1. Validate skill
2. Check permission
3. Load instructions
4. Make supporting resources discoverable
5. Add active skill to context

---

# 25. MCP

Use the official MCP TypeScript SDK.

## Initial transport

Start with **stdio**.

Security rule:

> Never automatically inherit all environment variables into an MCP subprocess.

Build an explicit environment allowlist.

Later add:

- Streamable HTTP
- OAuth
- Resources
- Prompts

Architecture:

```text
MCP Server
 ↓
MCP Client
 ↓
MCP Adapter
 ↓
Tool Registry
 ↓
Permission Engine
 ↓
Agent
```

MCP tools must use the same internal tool interface as native tools.

---

# 26. Hooks and Plugins

Initial hooks:

```text
session.beforeStart
session.afterEnd

turn.before
turn.after

model.before
model.after

tool.before
tool.after

permission.before

subagent.before
subagent.after

compaction.before
compaction.after
```

Plugin system is deferred until abstractions stabilize.

Future plugin interface:

```ts
interface AgentPlugin {
  id: string;
  setup(api: PluginAPI): Promise<void>;
}
```

Possible extension points:

- Tools
- Agents
- Skills
- Hooks
- Providers
- CLI commands

---

# 27. Git and Repository Operations

Use native Git CLI.

Minimum:

- Detect repository root
- Current branch
- Dirty status
- Diff
- Log
- Create branch

Remote branch convention:

```text
agent/<run-id>
```

Never automatically commit/push unless explicitly permitted.

Later, writable subagents receive Git worktrees:

```text
repo/
└── .agent-worktrees/
    ├── child-a/
    ├── child-b/
    └── child-c/
```

---

# 28. CLI

## Non-interactive

```bash
agent .
agent run "fix tests"
agent sessions
agent resume <id>
agent config
agent auth provider
agent mcp list
agent skills list
```

## Interactive commands

```text
/help
/model
/agent
/agents
/status
/context
/diff
/permissions
/mcp
/skills
/compact
/resume
/fork
/clear
/cancel
/remote
```

TUI state should be derived from runtime events.

Do not duplicate business logic inside Ink components.

---

# 29. Local App Server

Initial:

```text
CLI
 ↓ direct call
AgentRuntime
```

Later:

```text
CLI
 ↕
JSON-RPC / stdio
 ↕
Local App Server
 ↕
AgentRuntime
```

Reasons:

- Client/runtime separation
- Multiple future clients
- Protocol learning
- Approval request/response flow
- Same conceptual model as hosted execution

---

# 30. Agent Protocol

Use versioned typed request/event messages.

Methods:

```text
session.create
session.get
session.list
session.resume
session.fork
session.archive

turn.create
turn.cancel

permission.resolve

agent.list
model.list
skill.list
mcp.list
```

Notifications carry `AgentEvent`.

Requirements:

- Protocol version
- Request ID
- Stable error schema
- Idempotency where relevant
- Reconnect from event sequence
- No hidden chain-of-thought fields

For hosted browser clients, start with:

```text
POST commands
+
SSE event stream
```

Add WebSocket later only if necessary.

---

# 31. Hono Hosted API

Suggested routes:

```text
GET    /api/me

GET    /api/projects
POST   /api/projects

GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/:id

POST   /api/sessions/:id/turns
POST   /api/sessions/:id/cancel

GET    /api/sessions/:id/events

POST   /api/permissions/:id/resolve

GET    /api/providers
POST   /api/providers/:provider/credentials

GET    /api/agents
GET    /api/skills
GET    /api/mcp

POST   /api/remote-runs
GET    /api/remote-runs/:id
```

Keep route handlers thin.

---

# 32. Authentication

## Local

No application account required.

Only provider credentials.

## Hosted

Use WorkOS AuthKit.

Web:

- Browser authentication

CLI:

- OAuth Device Authorization Flow

Expected UX:

```text
$ agent login

Open:
https://auth.example.com/device

Code:
ABCD-EFGH

Waiting...

✓ Logged in
```

Store refresh tokens in OS credential storage where possible.

---

# 33. Provider Credentials and Secrets

Hosted provider credential record:

```text
provider_credentials
- id
- user_id
- provider
- encrypted_secret
- key_version
- created_at
- updated_at
- last_used_at
```

Rules:

1. Encrypt secrets.
2. Never return the raw secret after creation.
3. Never include secrets in event streams.
4. Never log secrets.
5. Never send secrets into model context.
6. Inject only required credentials into remote runs.
7. Remove temporary secret material after execution.
8. MCP processes receive explicit env allowlists.

---

# 34. Remote Architecture

```text
Client
 ↓
Hono API
 ↓
RemoteRun persisted
 ↓
BullMQ
 ↓
Worker
 ↓
Provision sandbox
 ↓
Clone repository
 ↓
AgentRuntime + DockerWorkspace
 ↓
Persist/stream events
 ↓
Destroy sandbox
```

Run statuses:

```text
queued
provisioning
cloning
preparing
running
waiting_approval
completed
failed
cancelled
timed_out
```

---

# 35. Docker Sandbox

Requirements:

- Unprivileged user
- CPU limit
- Memory limit
- PID limit
- Execution timeout
- Isolated filesystem
- Controlled networking
- Explicit environment variables
- No Docker socket
- No host-root mount

Never:

```text
LLM
 ↓
child_process.exec
 ↓
worker host
```

Always:

```text
LLM
 ↓
Permission Engine
 ↓
DockerWorkspace.exec
 ↓
sandbox
```

Network strategy:

- Treat install/setup as arbitrary code execution.
- Restrict network where practical.
- Separate preparation networking from agent-execution networking if feasible.
- Document any MVP limitations.

Cleanup must happen after:

- Completed
- Failed
- Cancelled
- Timed out
- Worker recovery

Add a reconciliation/janitor process later for leaked containers.

---

# 36. Queue and Worker

Use BullMQ.

Queue payload:

```ts
interface RemoteRunJob {
  runId: string;
}
```

Worker loads run state from database.

Reasons:

- Small queue payload
- Avoid stale configuration
- Easier retries
- Database remains source of truth

Retry only infrastructure-transient failures automatically.

Do not blindly repeat non-idempotent tool execution.

---

# 37. Database Design

## users

```text
id
auth_provider_user_id
email
created_at
updated_at
```

## projects

```text
id
user_id
name
repository_url
default_branch
created_at
updated_at
```

## sessions

```text
id
user_id
project_id nullable
parent_session_id nullable
root_session_id
agent_id
model_id
workspace_type
status
created_at
updated_at
```

## turns

```text
id
session_id
status
started_at
completed_at
failure_code nullable
```

## messages

```text
id
session_id
turn_id
role
content_json
sequence
created_at
```

## tool_calls

```text
id
session_id
turn_id
tool_name
input_json
output_json
status
started_at
completed_at
duration_ms
```

## events

```text
id
session_id
turn_id nullable
sequence
type
payload_json
created_at
```

Unique:

```text
(session_id, sequence)
```

## permissions

```text
id
session_id
tool_call_id
action
resource
decision
requested_at
resolved_at
```

## usage

```text
id
session_id
turn_id
model_id
provider
input_tokens
output_tokens
cached_input_tokens
estimated_cost_usd
duration_ms
created_at
```

## compactions

```text
id
session_id
from_sequence
to_sequence
summary
model_id
input_tokens
output_tokens
created_at
```

## remote_runs

```text
id
session_id
project_id
status
base_commit
branch
worker_id nullable
container_id nullable
started_at
completed_at
failure_code nullable
```

---

# 38. Web Dashboard

Pages:

```text
/dashboard
/projects
/sessions
/sessions/:id
/runs
/runs/:id
/settings/providers
/settings/agents
/settings/skills
/settings/mcp
```

Run detail shows:

- Status
- Agent
- Model
- Conversation
- Tool activity
- Permission requests
- Subagents
- Changed files
- Diff
- Duration
- Token usage
- Cost estimate
- Error state

Never display hidden chain-of-thought.

---

# 39. Telemetry

Track:

## Model

- Model ID
- Provider
- Request count
- Latency
- Input tokens
- Output tokens
- Cached tokens
- Provider errors
- Retries

## Tools

- Tool name
- Invocation count
- Duration
- Success/failure
- Output size

## Context

- Estimated context tokens
- Selected messages
- Compactions
- Tool schema size

## Agent

- Steps
- Subagent count
- Turn duration
- Permission prompts
- Cancellation

## Remote

- Queue delay
- Container provision duration
- Clone duration
- Setup duration
- Sandbox lifetime

Use a simple telemetry interface first. Add OpenTelemetry later if needed.

---

# 40. Error Handling

Stable error taxonomy:

```ts
type AgentErrorCode =
  | "MODEL_AUTH_ERROR"
  | "MODEL_RATE_LIMIT"
  | "MODEL_TIMEOUT"
  | "MODEL_INVALID_RESPONSE"
  | "TOOL_NOT_FOUND"
  | "TOOL_INPUT_INVALID"
  | "TOOL_FAILED"
  | "PERMISSION_DENIED"
  | "WORKSPACE_ERROR"
  | "SESSION_ERROR"
  | "CONTEXT_OVERFLOW"
  | "MCP_CONNECTION_ERROR"
  | "MCP_TOOL_ERROR"
  | "SANDBOX_PROVISION_ERROR"
  | "REMOTE_TIMEOUT"
  | "CANCELLED"
  | "INTERNAL";
```

Every user-facing error:

- Stable code
- User-safe message
- Retryability metadata
- Correlation ID

Internal causes remain in logs.

---

# 41. Cancellation, Timeouts, and Recovery

Use cancellation propagation similar to `AbortController`.

```text
client
 ↓
turn
 ↓
model stream
 ↓
tool
 ↓
workspace exec
 ↓
subagent
```

Timeout types:

- Model timeout
- Tool timeout
- Shell timeout
- Subagent timeout
- Turn timeout
- Remote run timeout

Tool states:

```text
requested
started
completed
failed
interrupted
```

If a process crashes while a non-idempotent tool is `started`, do not silently replay it.

---

# 42. Testing Strategy

Use three categories:

```text
1. Deterministic automated tests
2. Infrastructure/system tests
3. Real-model evals
```

Tools:

```text
Vitest
├── unit
├── integration
├── API
├── CLI
├── DB
├── agent harness
├── MCP
└── sandbox

Playwright
└── browser E2E

Custom eval runner
└── live-model capability
```

Normal CI must not depend on live model responses.

---

# 43. Unit Tests

High-priority areas:

## PermissionEngine

Test:

- Exact match
- Wildcards
- Specificity
- Ordering
- Defaults
- Allow
- Ask
- Deny
- Path normalization
- Command normalization
- Adversarial command strings

## Config

Test precedence:

```text
defaults
+
global
+
project
+
environment
+
CLI
```

## Agent parser

- Valid frontmatter
- Invalid mode
- Bad permissions
- Missing values
- Per-agent model

## Skill parser

- Discovery
- Metadata
- Invalid skill
- Supporting resources

## Context budget

- Reserve output tokens
- Context threshold
- Tool schema budget
- Compaction trigger

## Session state machine

Examples:

```text
idle → running ✓
running → waiting_approval ✓
waiting_approval → running ✓
running → completed ✓
completed → running ✗
```

## Tool schemas

Validate model-generated inputs.

---

# 44. Integration Tests

Integration tests connect real modules.

Example stack:

```text
ScriptedModel
 ↓
AgentRuntime
 ↓
ToolRegistry
 ↓
PermissionEngine
 ↓
TestWorkspace / temp directory
 ↓
SessionRepository
```

Test orchestration rather than isolated methods.

---

# 45. Agent Runtime Integration Suite

This is the most important deterministic suite.

Use AI SDK mock models or your own `ScriptedModel`.

Required scenarios:

## Text-only

```text
user
→ model text
→ complete
```

## One tool

```text
model
→ read
→ result
→ final
```

## Multiple tools

```text
grep
→ read
→ edit
→ bash
→ final
```

## Tool failure recovery

```text
bash fails
→ model receives failure
→ edit
→ bash succeeds
```

## Permission approval

```text
bash requested
→ ASK
→ pause
→ approve
→ execute
```

## Permission denial

Agent receives structured denial and continues safely.

## Invalid tool input

Schema error must not crash runtime.

## Cancellation

Test during:

- Model stream
- Shell command
- Approval wait
- Subagent

## Max steps

Agent stops cleanly.

## Compaction

Force small context budget and verify continuation.

## Subagent

Parent calls subagent, child completes, parent consumes result.

## Parallel subagents

Verify:

- Parent waits correctly
- Child IDs are correct
- Failure isolation

---

# 46. API Integration Tests

Use Hono `app.request()` instead of opening real ports where possible.

Test:

- Auth middleware
- Create session
- Create turn
- Permission resolution
- Cancellation
- User isolation
- Validation errors
- Error schema
- Event replay
- Provider credential metadata

---

# 47. CLI Tests

## Command unit tests

Test argument parsing and handlers without spawning process.

## Process integration

Spawn built CLI.

Test:

```text
--help
--version
sessions
config
run
resume
invalid args
exit codes
```

## Ink tests

Avoid brittle full ANSI snapshots.

Put interaction state into reducers/hooks and test those.

Keep rendering smoke tests minimal.

---

# 48. Database Tests

Use real database engines.

## SQLite

Test local persistence.

## PostgreSQL

Use actual Postgres for hosted integration tests.

Test:

- Constraints
- Parent-child sessions
- Event sequence uniqueness
- Transactions
- Run creation
- Credential access boundaries

Do not assume SQLite behavior equals Postgres behavior.

---

# 49. MCP Tests

## Adapter unit tests

Fake MCP metadata → internal tools.

## stdio integration

Run a tiny fixture MCP server.

Verify:

```text
initialize
listTools
callTool
shutdown
```

## Permission

MCP tools must go through `PermissionEngine`.

## Environment isolation

Fixture MCP process verifies sensitive env vars are missing.

Later HTTP MCP tests:

- Connection
- Version negotiation
- Session handling
- Auth failure
- Reconnect

---

# 50. Sandbox Tests

Run as a separate, slower test project.

Test:

## Basic execution

```text
create container
→ write file
→ run cat
→ verify
→ destroy
```

## Filesystem isolation

Host-only paths should be unavailable.

## Environment isolation

Only allowed vars should exist.

## Timeout

Long process must terminate and report timeout.

## Working directory

Commands must run inside workspace.

## Cleanup

No container remains afterward.

## Cancellation

Cancel process/run and destroy resources.

## Resource configuration

Where CI supports it, verify configured memory/CPU/PID constraints.

Do not claim a security guarantee that tests cannot prove.

---

# 51. Playwright E2E

Initial browser specs:

```text
auth.spec.ts
sessions.spec.ts
remote-run.spec.ts
approval.spec.ts
diff.spec.ts
```

Remote flow:

```text
login
→ create/select project
→ start run
→ queued
→ running
→ stream events
→ complete
→ changed files visible
→ diff opens
```

Approval flow:

```text
run waits
→ approval UI
→ approve
→ run resumes
```

Use stable selectors and Playwright traces on failures.

---

# 52. LLM Evals

Evals answer:

> Can a real model using this harness actually solve coding tasks?

Structure:

```text
tests/evals/
├── tasks/
│   ├── fix-simple-test/
│   ├── typescript-error/
│   ├── cross-file-bug/
│   ├── refactor/
│   ├── permission-aware/
│   └── repo-understanding/
├── runner.ts
└── reporters/
```

Task example:

```yaml
id: fix-addition

prompt: Fix the failing math tests.

setup:
  fixture: failing-test

success:
  command: pnpm test
  exitCode: 0

limits:
  maxSteps: 15
  maxDurationSeconds: 180
  maxCostUsd: 0.25
```

Metrics:

- Success/failure
- Steps
- Tool calls
- Model requests
- Tokens
- Cost
- Duration
- Permission prompts
- Files changed
- Final test result

Run manually/nightly, not on every PR.

Maintain baseline scores to detect regressions.

---

# 53. Test Fixtures

Use small deterministic repositories:

```text
tests/fixtures/
├── empty/
├── simple-ts/
├── failing-test/
├── multi-file-bug/
├── git-dirty/
├── nested-agents/
├── skill-project/
├── mcp-project/
└── monorepo/
```

Never mutate the canonical fixture.

Test helper:

```text
fixture
 ↓
copy to temp
 ↓
optional git init
 ↓
run
 ↓
assert
 ↓
cleanup
```

---

# 54. Coverage and Quality Gates

Suggested initial coverage:

```text
Statements: 75%
Branches:   70%
Functions:  75%
Lines:      75%
```

Higher standards for:

- Permission engine
- Config
- Session state
- Context budget
- Protocol
- Agent parser
- Skill parser

PR gates:

```text
format check
lint
typecheck
unit tests
integration tests
build
```

Conditional:

```text
Postgres integration
sandbox tests
Playwright
live evals
```

---

# 55. CI/CD

Use GitHub Actions initially.

## Pull Request

```text
checkout
 ↓
setup Node
 ↓
setup pnpm
 ↓
pnpm install --frozen-lockfile
 ↓
format check
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build
```

Separate jobs:

```text
core
postgres
sandbox
web-e2e
```

## Main

Run all PR checks plus:

- Build Docker images
- Preview deployment where relevant

## Nightly

- Eval subset
- Broader sandbox tests
- Dependency/security checks

## Release

- Full deterministic suite
- Playwright
- Docker smoke test
- Migration validation
- Publish CLI
- Deploy web/server/worker

---

# 56. Local Development

Requirements:

```text
Node
pnpm
Docker
Docker Compose
git
rg
```

Local hosted-infra simulation:

```bash
docker compose up
```

Services:

```text
postgres
redis
```

Keep CLI/runtime processes native during normal development for fast feedback.

---

# 57. Hosting Strategy

## Stage 1 — no hosting

```text
CLI
AgentRuntime
SQLite
LocalWorkspace
```

## Stage 2 — one VPS

Docker Compose:

```text
server
worker
postgres
redis
```

Worker launches sandbox containers.

This is the best learning deployment.

## Stage 3 — managed services

Possible split:

```text
Web       → Vercel / Cloudflare
API       → Fly.io / Railway / VPS
Postgres  → Neon / managed Postgres
Redis     → Upstash / managed Redis
Workers   → Docker-capable compute
Sandbox   → Docker-capable compute
Auth      → WorkOS
```

The remote worker should not rely on ordinary short-lived edge/serverless functions.

---

# 58. Security Model

Defense in depth:

```text
User intent
 ↓
Agent instructions
 ↓
Tool schema
 ↓
Permission engine
 ↓
Workspace boundary
 ↓
Sandbox boundary
 ↓
Network policy
 ↓
Credential boundary
 ↓
Audit events
```

No single layer is sufficient.

---

# 59. Threat Model

Consider:

## Repository prompt injection

Repository files are untrusted data, not privileged instructions.

## Malicious dependency scripts

`pnpm install` may execute arbitrary scripts.

## Secret exfiltration

Agent/MCP/tool may try to read or upload secrets.

## Malicious MCP server

Never inherit full process environment.

## Shell injection

Never embed model strings into host-level Docker commands unsafely.

## Path traversal

Validate workspace-relative paths.

## Symlink escape

Resolve real paths and ensure they remain inside workspace.

## Container escape

No Docker socket inside sandbox; no privileged mode.

## Event leakage

Secrets cannot appear in persisted events.

---

# 60. Performance and Scaling

Local bottlenecks:

- Model latency
- Repository search
- Shell commands
- Context size

Remote adds:

- Queue delay
- Container provision
- Git clone
- Dependency install

Optimizations later:

- Prepared base images
- Package caches
- Repo cache
- Warm workers
- Prompt caching
- Event batching

Measure before optimizing.

---

# 61. Configuration System

Global:

```text
~/.config/agent/config.json
```

Project:

```text
.agent/config.json
```

Precedence:

```text
defaults
↓
global
↓
project
↓
environment
↓
CLI flags
```

Domains:

```text
model
agent
permissions
tools
mcp
skills
remote
telemetry
ui
```

Validate merged config with Zod.

Later:

```bash
agent config doctor
```

---

# 62. Logging

Use structured logs.

Fields:

```text
timestamp
level
service
session_id
turn_id
run_id
event
duration_ms
error_code
```

Never log:

- Provider keys
- Auth tokens
- Full environment
- Decrypted secrets

Debug tool inputs must be redacted.

---

# 63. Feature Flags

Simple config is enough initially:

```text
experimental.parallelAgents
experimental.lsp
experimental.treeSitter
experimental.remoteMcp
```

Do not add a feature-flag service early.

---

# 64. Implementation Roadmap

Implement **vertical slices**.

---

## Phase 0 — Repository foundation

Build:

- pnpm workspace
- Turborepo
- TS base config
- ESLint
- Prettier
- Vitest
- CI

Done when:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

work from root.

---

## Phase 1 — Provider + streaming

Build:

- `models`
- OpenRouter first
- OpenAI second
- AI SDK `streamText`
- Simple CLI

Tests:

- Model ID parser
- Provider registry
- Fake streaming
- Error normalization

Done when:

```bash
agent run "say hello"
```

streams.

---

## Phase 2 — Tool registry + LocalWorkspace

Build:

- LocalWorkspace
- ToolRegistry
- read
- grep
- glob
- bash
- edit
- git diff

Tests:

- Tool validation
- Temporary workspace
- Path safety
- grep limits
- command timeout

Done when scripted model can modify fixture repository.

---

## Phase 3 — Custom AgentRuntime

Build:

- Sessions
- Turns
- Steps
- Model → tool → model loop
- Max steps
- Cancellation

Tests:

- Agent runtime integration matrix

Done when deterministic task can:

```text
read
edit
test
observe failure
edit
test
complete
```

---

## Phase 4 — Permissions

Build:

- allow
- ask
- deny
- resource matching
- approval events

Done when agent pauses and resumes around approval.

---

## Phase 5 — Persistence

Build:

- SQLite
- Sessions
- Messages
- Turns
- Events
- Tool calls

Done when:

```bash
agent resume <id>
```

continues after process restart.

---

## Phase 6 — Ink TUI

Build:

- Interactive input
- Streaming
- Tool display
- Permission UI
- Status bar
- Model display
- Context %
- Cancellation

---

## Phase 7 — Context Manager

Build:

- AGENTS.md
- Token budgeting
- History selection
- Tool-output truncation
- TODO state

---

## Phase 8 — Compaction

Build:

- Threshold
- Summary model
- Persistence
- Continued execution after compacting

---

## Phase 9 — Agents

Build:

- Build
- Plan
- Markdown custom agents
- Per-agent model
- Per-agent permissions

---

## Phase 10 — Subagents

Build:

- Parent/root session links
- Explore
- Review
- Test
- `subagent` tool

Then:

- Parallel read-only subagents

---

## Phase 11 — Skills

Build:

- `SKILL.md`
- Discovery
- Metadata
- Lazy loading
- Permission integration

---

## Phase 12 — MCP

Build:

- stdio
- Tool discovery
- Adapter
- Permission integration
- Env allowlist

Then:

- Streamable HTTP
- OAuth

---

## Phase 13 — Local App Server

Build:

- Protocol package
- JSON-RPC
- Session manager
- Event forwarding
- Permission responses
- Reconnect/replay

Done when CLI no longer calls runtime directly.

---

## Phase 14 — Hosted identity/API

Build:

- Hono
- WorkOS
- Postgres
- Users
- Projects
- Hosted sessions
- Provider credentials

---

## Phase 15 — Remote Worker

Build:

- Redis
- BullMQ
- Run lifecycle
- Worker
- DockerWorkspace
- Git clone
- Setup
- Event streaming
- Cleanup

Done when a remote run can continue after CLI disconnect.

---

## Phase 16 — Web Dashboard

Build:

- Run list
- Run detail
- Events
- Approvals
- Diff
- Usage

Test with Playwright.

---

## Phase 17 — Advanced

Potential:

- Git worktree writers
- LSP
- Tree-sitter
- Tool search
- Plugins
- Remote MCP OAuth
- Local/remote handoff
- Automatic PR creation
- Warm sandbox pool

---

# 65. Acceptance Criteria for Every Phase

Every completed phase must include:

1. Working behavior
2. Automated tests
3. Updated docs
4. No TypeScript errors
5. No lint errors
6. User-safe errors
7. Runtime events where relevant

A feature is not complete because only the UI works.

---

# 66. MVP, V1, V2

## MVP — local coding agent

Required:

- pnpm + Turbo
- CLI
- OpenRouter/OpenAI
- Streaming
- Agent loop
- Read
- Grep
- Glob
- Edit
- Bash
- Git diff
- LocalWorkspace
- Permission prompts
- SQLite
- Resume
- Basic Ink UI
- `AGENTS.md`
- Deterministic tests

Success:

> Agent fixes a small failing-test repository autonomously.

## V1 — advanced local agent

Add:

- Context compaction
- Build/Plan
- Custom agents
- Explore/Review/Test subagents
- Parallel exploration
- Skills
- MCP stdio
- Local App Server
- Telemetry
- Eval suite

## V2 — hosted remote platform

Add:

- Hono
- WorkOS
- Postgres
- Secret storage
- Redis/BullMQ
- Docker workers
- Remote repository runs
- Event streaming
- Remote approvals
- Web dashboard

---

# 67. Suggested Scripts

Root `package.json` concept:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",

    "test": "vitest run",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:db": "vitest run --project db",
    "test:sandbox": "vitest run --project sandbox",

    "test:e2e": "playwright test",

    "eval": "tsx tests/evals/runner.ts",

    "ci": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

---

# 68. Suggested Config Files

## pnpm-workspace.yaml

```yaml
packages:
  - apps/*
  - packages/*
```

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "lint": {
      "dependsOn": ["^lint"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Adjust outputs per package.

## Vitest projects concept

```ts
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.unit.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "db",
          include: ["**/*.db.test.ts"],
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "sandbox",
          include: ["**/*.sandbox.test.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
```

Use the exact current Vitest config API when implementing.

---

# 69. Documentation Structure

```text
README.md

docs/
├── architecture.md
├── agent-loop.md
├── protocol.md
├── permissions.md
├── context.md
├── subagents.md
├── skills.md
├── mcp.md
├── sandbox.md
├── testing.md
├── evals.md
├── deployment.md
└── security.md
```

README should focus on:

- What this is
- Quick start
- Architecture diagram
- Main features
- Demo
- Development commands
- Links to detailed docs

---

# 70. Portfolio Discussion Points

Be ready to explain:

## Why not LangGraph?

Because building the harness is the learning objective.

## Why AI SDK?

Provider streaming/protocol differences are infrastructure, not the main agent-learning target.

## Why event-driven?

CLI, web, persistence, reconnect, and telemetry all need the same operational events.

## Why Workspace abstraction?

Local and remote execution share the same agent.

## Why PermissionEngine?

All executable capabilities need one security policy.

## Why subagents as child sessions?

They need independent context while reusing the same runtime.

## Why lazy-loaded skills?

Every instruction consumes model context.

## Why Docker?

Remote shell commands must not run on the worker host.

## Why tests and evals separately?

Software correctness and LLM capability are different problems.

---

# 71. Reference Resources

Use these as architecture references rather than specifications to copy directly.

## OpenAI Codex

Study for:

- Agent loop
- Harness/client separation
- Session lifecycle
- Tool interaction
- Remote/local concepts
- Sandbox/security concepts

References:

- https://openai.com/index/unrolling-the-codex-agent-loop/
- https://openai.com/index/unlocking-the-codex-harness/
- https://openai.com/index/running-codex-safely/

## OpenCode

Study for:

- Provider-independent configuration
- Build/Plan agents
- Subagents
- Permissions
- Skills
- `AGENTS.md`
- MCP

References:

- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/permissions/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/config/

## Vercel AI SDK

Study:

- `streamText`
- Streaming events
- Tools/tool calling
- Provider management
- Testing/mock models

Reference:

- https://ai-sdk.dev/docs/

## MCP

Study the current specification and TypeScript SDK.

Reference:

- https://modelcontextprotocol.io/

Focus on:

- Initialization
- JSON-RPC
- stdio
- Streamable HTTP
- tools
- resources
- prompts
- auth
- version negotiation

## WorkOS

Study:

- AuthKit
- Device Authorization Flow
- CLI auth
- Refresh tokens

Reference:

- https://workos.com/docs/authkit

## Turborepo

Reference:

- https://turbo.build/repo/docs

## Vitest

Reference:

- https://vitest.dev/

## Playwright

Reference:

- https://playwright.dev/docs/

## Hono

Reference:

- https://hono.dev/docs/

---

# 72. Final Implementation Rule

Preserve these boundaries:

```text
CLIENT
≠
AGENT

AGENT
≠
MODEL PROVIDER

TOOL
≠
WORKSPACE

SKILL
≠
TOOL

SUBAGENT
=
CHILD AGENT SESSION

MCP TOOL
=
NORMALIZED TOOL

LOCAL vs REMOTE
=
DIFFERENT WORKSPACE / INFRASTRUCTURE
NOT DIFFERENT AGENT

TEST
≠
EVAL
```

The first foundational target is:

```text
ModelRegistry
+
AgentRuntime
+
ToolRegistry
+
LocalWorkspace
+
PermissionEngine
+
EventStream
+
Scripted/Mock Model Tests
```

Do not build remote infrastructure until the local harness can reliably:

1. Receive a coding task.
2. Inspect a repository.
3. Search relevant code.
4. Read the required files.
5. Make a controlled edit.
6. Execute verification.
7. Observe a failure.
8. Repair the problem.
9. Rerun verification.
10. Produce a diff.
11. Persist the session.
12. Resume after restart.

Once that works, subagents, skills, MCP, the App Server, and remote Docker execution become extensions instead of rewrites.
