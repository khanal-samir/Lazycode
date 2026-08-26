# lazycode

Self-hostable coding-agent platform. The central rule: **one reusable `AgentRuntime`** shared by the CLI, server, worker, and web — never reimplement the agent loop per client.

Full PRD: [docs/lazycode-prd.md](docs/lazycode-prd.md). Roadmap phases: PRD §64. Acceptance criteria per phase: PRD §65.

## Commands

```bash
pnpm install
pnpm build / typecheck / lint / test   # run from root, orchestrated by turbo + vitest
pnpm check                             # format:check + lint + typecheck + test + build
```

## Structure

- `apps/` — `cli`, `server`, `worker`, `web` (created per phase, not ahead of need)
- `packages/` — shared packages (`protocol` exists; `agent-core`, `models`, `tools`, `workspace`, `persistence`, `config` arrive in their phases)
- `docs/` — PRD and architecture docs
- `tests/` — fixtures + evals (later phases)

## Hard rules

- pnpm only. Do not scaffold empty packages/apps ahead of their phase (PRD §8).
- `agent-core` must never import Ink, Hono, or TanStack Start (PRD §9).
- Tools depend on `Workspace` interfaces — never Node `fs`/`child_process` directly.
- Protocol types never import runtime implementations.
- Test file naming: `*.unit.test.ts`, `*.integration.test.ts`, `*.db.test.ts` (serial), `*.sandbox.test.ts` (serial).
- Normal CI must never call live model APIs; evals are separate (PRD §42).

## Conventions

- TypeScript strict; ESM with `NodeNext` resolution (use `.js` extensions in relative imports).
- Internal packages are scoped `@lazy-code/*`, built with `tsc` to `dist/`.
- Prettier (printWidth 100) + ESLint flat config at root; run `pnpm format` before committing.
