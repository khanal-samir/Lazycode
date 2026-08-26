# lazycode

Self-hostable coding-agent platform. One reusable agent runtime powers a local CLI/TUI, hosted remote execution on Docker-isolated workspaces, and a web dashboard.

> **Status:** Phase 0 — repository foundation. Full PRD: [docs/lazycode-prd.md](docs/lazycode-prd.md).

## Stack

- **Language/runtime:** TypeScript on Node.js 24
- **Monorepo:** pnpm workspaces + Turborepo
- **Models:** Vercel AI SDK (OpenAI, OpenRouter, Anthropic) — the agent loop itself is custom
- **API:** Hono · **Persistence:** Drizzle (SQLite local / Postgres hosted) · **Queue:** BullMQ + Redis
- **Isolation:** Docker sandboxes · **TUI:** Ink · **Web:** TanStack Start
- **Tests:** Vitest (unit / integration / db / sandbox projects) + Playwright (browser E2E)

## Development

Requirements: Node 24, pnpm 11, Docker, ripgrep.

```bash
pnpm install

pnpm build       # turbo build
pnpm typecheck   # turbo typecheck
pnpm lint        # turbo lint
pnpm test        # vitest run (all projects)

pnpm check       # full local gate: format, lint, typecheck, test, build
```

## Layout

```text
apps/        cli, server, worker, web        (created per roadmap phase)
packages/    protocol, agent-core, models, … (created per roadmap phase)
tests/       fixtures + evals                (later phases)
docs/        PRD + architecture docs
```

## Roadmap

MVP (local coding agent) → V1 (advanced local: compaction, agents, subagents, skills, MCP, local app server) → V2 (hosted remote platform: Hono, WorkOS, Postgres, BullMQ, Docker workers, web dashboard). See the PRD §64 for the full phase list.
