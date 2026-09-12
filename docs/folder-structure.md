# Folder Structure

This is the Mastra-native repository layout. Directories are created only when they contain real code.

```text
lazycode/
├── apps/
│   ├── server/                    # deployable Mastra application
│   │   ├── src/
│   │   │   └── mastra/
│   │   │       ├── index.ts      # the only Mastra composition root
│   │   │       ├── controller.ts # AgentController configuration (later)
│   │   │       ├── storage.ts    # Mastra storage selection (later)
│   │   │       └── routes/       # Lazycode-specific API routes only (later)
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/                       # Ink client; never owns agent behavior
│   ├── web/                       # TanStack Start client
│   └── worker/                    # remote job and sandbox lifecycle only
│
├── packages/                      # shared product code, not Mastra wrappers
│   ├── config/                    # create when multiple apps share product config
│   ├── persistence/               # product records, not duplicated Mastra state
│   ├── workspace/                 # custom Mastra provider only if built-ins fall short
│   └── tools/                     # genuinely product-specific Mastra tools only
│
├── tooling/
│   ├── typescript-config/
│   └── eslint-config/
├── tests/
│   ├── fixtures/
│   └── evals/
├── docker/
├── scripts/
└── docs/
```

Only `apps/server/src/mastra/index.ts` exists in the foundation. The other entries show where later, approved requirements belong; they are not instructions to scaffold empty files.

## Composition root

`apps/server/src/mastra/index.ts` constructs and exports one `Mastra` instance. Later phases register the coding `AgentController`, storage, observability, and product API routes there.

Agents, tools, workflows, or scorers that exist only for the server stay below `apps/server/src/mastra/`. Move code into `packages/` only after a second real consumer appears.

## Dependency direction

```text
CLI ──────┐
Web ──────┼──> Mastra server/client boundary
Worker ───┘             │
                        ▼
               apps/server/src/mastra
                        │
              approved shared packages
```

- Apps may depend on packages; packages never depend on apps.
- CLI and web never instantiate a Mastra agent or controller.
- Worker code provisions remote execution and calls the shared controller/server boundary; it never creates another agent implementation.
- Product packages may import Mastra types only when implementing a real Mastra extension point.

## Mastra ownership

Do not create packages for concerns Mastra already owns:

- agent loop and tool-call iteration
- provider/model routing
- stream chunk contracts
- tools and their schema validation
- context, memory, and compaction
- threads, runs, and framework persistence
- agent modes and subagents
- skills and MCP integration
- server routes supplied by Mastra
- observability and scorers

Lazycode owns product identity, authorization policy, repository records, encrypted credentials, remote-run orchestration, secure sandbox selection, client UX, and product-specific routes.

## Workspace and security rules

- Model-facing file and command operations use Mastra Workspace/Sandbox APIs.
- `LocalSandbox` is development-only; it executes with host permissions.
- Hosted or untrusted commands require an isolated container or remote sandbox.
- Never expose the Docker socket, host root, unrestricted environment, or raw credentials.
- Do not duplicate workspace access with direct Node `fs` or `child_process` calls inside model tools.

## Package anatomy

When a shared package becomes necessary:

```text
packages/<name>/
├── src/
├── tests/
│   ├── *.unit.test.ts
│   ├── *.integration.test.ts
│   ├── *.db.test.ts
│   └── *.sandbox.test.ts
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

Shared dependencies are pinned once in the pnpm catalog. Relative ESM imports include `.js`. TypeScript remains strict and NodeNext.
