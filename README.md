# lazycode

Self-hostable coding-agent platform built on Mastra. One Mastra composition root powers local CLI/TUI clients, hosted execution in isolated workspaces, and a web dashboard.

> **Status:** Mastra repository foundation. Full product and implementation plan: [docs/lazycode-prd.md](docs/lazycode-prd.md).

## Stack

- **Language/runtime:** TypeScript on Node.js 24
- **Monorepo:** pnpm workspaces + Turborepo
- **Agent framework:** Mastra; Mastra Code `AgentController` for coding sessions
- **API:** Mastra's Hono-based server with product-specific routes only where needed
- **Persistence:** Mastra storage for agent state; Drizzle for product-owned data
- **Isolation:** Mastra Workspace/Sandbox providers; Docker or remote sandboxes for untrusted execution
- **Hosted queue:** BullMQ + Redis only if durable remote execution still requires it
- **Clients:** Ink TUI and TanStack Start web app
- **Tests:** Vitest + Playwright; Mastra scorers for live-model evals

## Development

Requirements: Node 24 and pnpm 11.

```bash
pnpm install

pnpm dev         # all runnable workspaces
pnpm build       # Mastra and library builds
pnpm typecheck
pnpm lint
pnpm test
pnpm check       # complete local gate
```

The Mastra server package can run independently:

```bash
pnpm --filter @lazy-code/server dev
pnpm --filter @lazy-code/server build
```

## Layout

```text
apps/
  server/    Mastra composition root and deployable server
  cli/       terminal client (later)
  web/       browser client (later)
  worker/    remote sandbox lifecycle only (later)
packages/    product-only shared code, created when a real shared boundary exists
tooling/     shared TypeScript and ESLint configuration
tests/       cross-package fixtures and live-model eval scenarios
docker/      hosted infrastructure and sandbox images (later)
docs/        architecture and product plan
```

See [docs/folder-structure.md](docs/folder-structure.md) for ownership rules.

## Architecture rule

Use Mastra primitives before writing custom infrastructure. Lazycode does not implement its own agent loop, model registry, tool registry, context manager, memory system, compaction engine, subagent runtime, skills loader, MCP adapter, event protocol, or framework server.
