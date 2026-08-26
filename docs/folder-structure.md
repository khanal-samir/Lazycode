# Folder Structure

What lives where in this monorepo, and why.

```text
lazycode/
├── apps/                      # Runnables — things you start or deploy
│   ├── cli/                   # `agent` CLI/TUI (Ink). Creates LocalWorkspace, injects into runtime
│   ├── server/                # Hono hosted API (thin route handlers → services/runtime)
│   ├── worker/                # BullMQ worker. Creates DockerWorkspace, injects into runtime
│   └── web/                   # TanStack Start dashboard
│
├── packages/                  # Shared domain libraries — one purpose each
│   ├── protocol/              # Wire contracts: AgentEvent, error codes, statuses, PROTOCOL_VERSION
│   ├── agent-core/            # AgentRuntime, agent loop, context manager, compaction
│   ├── models/                # ModelRegistry + provider adapters (Vercel AI SDK)
│   ├── tools/                 # read / write / edit / grep / glob / bash / git / subagent / skill
│   ├── workspace/             # Workspace interface + Local / Docker / Test implementations
│   ├── persistence/           # SQLite (local) + Postgres (hosted) behind repository interfaces
│   └── config/                # config loading, precedence chain, Zod schemas
│
├── tooling/                   # Dev tooling shared by every package
│   ├── typescript-config/     # Shared tsconfig bases (@lazy-code/typescript-config)
│   └── eslint-config/         # Shared flat configs (@lazy-code/eslint-config)
│
├── docker/                    # docker-compose (postgres, redis), sandbox Dockerfile
├── scripts/                   # Repo automation (release, smoke tests)
│
├── tests/
│   ├── fixtures/              # Canonical fixture repos — never mutated in place
│   └── evals/                 # Live-model eval tasks + runner (nightly, never in CI)
│
├── docs/                      # PRD + architecture docs
└── .github/workflows/         # CI (later: separate postgres / sandbox / web-e2e jobs)
```

## Anatomy of a package

```text
packages/<name>/
├── src/                   # source — the only thing compiled into dist/
├── tests/                 # tests NEVER live in src/
│   ├── *.unit.test.ts         # fast, no I/O
│   ├── *.integration.test.ts  # real modules wired together
│   ├── *.db.test.ts           # real DB, serial
│   └── *.sandbox.test.ts      # real Docker, serial
├── package.json           # @lazy-code/<name>, exports, build/typecheck/lint scripts
├── tsconfig.json          # typecheck (src + tests)
└── tsconfig.build.json    # build: src only → dist/
```

## Dependency rules

- Apps depend on packages. Packages never depend on apps.
- `protocol` depends on nothing.
- `agent-core` never imports Ink, Hono, or TanStack Start.
- `tools` depend on the `Workspace` interface, never Node `fs`/`child_process`.
- `persistence` is only reached through repository interfaces.

## Conventions

- Empty placeholder dirs use `.gitkeep`. A directory only becomes a package when it gets a real `package.json` — never scaffold empty packages ahead of their phase.
- New shared config (e.g. a future React/Next eslint variant) goes in `tooling/`, not at root.
- CI must never call live model APIs; evals run separately.
