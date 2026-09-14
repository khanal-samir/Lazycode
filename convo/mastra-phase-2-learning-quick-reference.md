# Mastra Phase 2 — Quick Reference

## Key ideas

- **Node.js:** Runtime that executes Lazycode's TypeScript/JavaScript.
- **Hono:** HTTP/web-server layer; not the AI-agent engine.
- **Mastra Core:** Generic AI-agent building blocks: agents, model streaming, tools, Workspace/Sandbox, sessions, and events.
- **Mastra Code SDK:** Ready-made coding-agent layer built on Mastra Core.
- **Coding agent:** Decides whether to answer or request a tool call.
- **Controller:** Manages sessions, messages, events, and cancellation around the coding agent.

## Phase 2 change

Before:

```ts
export const mastra = new Mastra({});
```

After, `apps/server/src/mastra/index.ts` mounts Mastra Code:

```ts
const prepared = await prepareAgentControllerMount();
export const mastra = new Mastra(prepared.mastraArgs);
await prepared.finalize();
```

Lazycode uses the SDK instead of implementing its own agent loop and coding tools.

## How a tool call works

```text
user request
  → controller creates a session
  → coding agent asks the model what to do
  → model requests a tool, e.g. view("notes.txt")
  → Workspace/Sandbox executes the tool
  → result goes back to the agent
  → agent returns more tool calls or final text
```

The model requests tools; it does not directly access the filesystem.

## Coding tools

The SDK configures selected Core Workspace/Sandbox capabilities with coding names:

- `view` — read a file
- `write_file` — create or overwrite a file
- `string_replace_lsp` — edit file contents
- `find_files` — find files
- `search_content` — search file contents, similar to grep
- `file_stat` — inspect file metadata
- `execute_command` — run a command

## Testing with a fake model

`apps/server/tests/controller.integration.test.ts` uses `MockLanguageModelV3` and `simulateReadableStream` from `ai/test`.

```ts
const mock = textMock("Hello from the mocked model.");
codeAgent.model = mock;
```

This replaces the real provider with a deterministic model. The controller, SDK, workspace, tools, and event loop remain real.

A text stream follows the AI SDK protocol:

```text
stream-start → text-start → text-delta → text-end → finish
```

A scripted tool flow looks like:

```text
fake model → view("notes.txt")
Mastra      → reads the fixture file
fake model → "I read the fixture file."
```

`hangingMock()` never sends a finish chunk, so the abort test can verify that `session.abort()` stops a stuck request. `failingMock()` throws to simulate a provider failure.

## Unit-test startup isolation

`apps/server/tests/mastra.unit.test.ts` checks that the composition root starts without crashing.

It temporarily uses:

- a temporary current directory;
- a temporary `HOME` directory;
- dynamic import of the production entrypoint.

This prevents startup from reading personal settings or treating the real repository as the test workspace.

## Project files

- `apps/server/src/mastra/index.ts` — Mastra composition root and Code SDK mount.
- `apps/server/tests/controller.integration.test.ts` — controller, streaming, tool-loop, cancellation, and recovery tests.
- `apps/server/tests/mastra.unit.test.ts` — isolated Mastra startup check.
- `apps/server/package.json` — server dependencies, including `@mastra/code-sdk` and `ai` for mocks.
- `docs/lazycode-prd.md` — Phase 2 roadmap and architecture rules.

## Glossary

- **Tool call:** Structured model request to invoke an operation with input.
- **Workspace:** File operations exposed to the agent.
- **Sandbox:** Process/command execution boundary.
- **Stream chunk:** One event in a model response stream; not RAG data.
- **Fixture:** Temporary test file or directory.
- **Mock model:** Fake model used to produce predictable text or tool calls.
