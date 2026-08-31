## Rules

- pnpm only; never scaffold empty packages/apps ahead of need.
- Mastra is the agent runtime. Do not build parallel agent, model, tool, memory, protocol, skills, MCP, or server frameworks.
- `apps/server/src/mastra/index.ts` is the single Mastra composition root.
- CLI and web are clients; worker code owns remote sandbox lifecycle, not another agent runtime.
- Model-facing files and commands use Mastra Workspace/Sandbox APIs, never Node `fs`/`child_process` directly.
- `LocalSandbox` is development-only; untrusted execution requires an isolated provider.
- Product persistence must not duplicate state owned by Mastra storage.
- Tests live in each package/app's `tests/` folder: `*.unit.test.ts`, `*.integration.test.ts`, `*.db.test.ts`, `*.sandbox.test.ts`.
- TS strict; ESM NodeNext (`.js` in relative imports); packages scoped `@lazy-code/*`.
- Shared deps are pinned once in the pnpm catalog; consumers reference them with `catalog:`.
