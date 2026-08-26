## Rules

- pnpm only; never scaffold empty packages/apps ahead of need.
- `agent-core` never imports Ink, Hono, or TanStack Start.
- Tools use `Workspace` interfaces — never Node `fs`/`child_process` directly.
- Tests live in each package's `tests/` folder: `*.unit.test.ts`, `*.integration.test.ts`, `*.db.test.ts`, `*.sandbox.test.ts`.
- TS strict; ESM NodeNext (`.js` in relative imports); packages scoped `@lazy-code/*`.
- Shared deps (e.g. zod) are pinned once in the pnpm catalog in `pnpm-workspace.yaml`; packages reference them with `catalog:`.
