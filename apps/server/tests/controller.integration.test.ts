import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import { prepareAgentControllerMount } from "@mastra/code-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Mount = Awaited<ReturnType<typeof prepareAgentControllerMount>>;
type TestSession = Awaited<ReturnType<Mount["base"]["controller"]["createSession"]>>;

type ScriptStep =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "tool"; readonly name: string; readonly id: string; readonly input: unknown };

let scratch = "";
let fixtureDir = "";
let controller: Mount["base"]["controller"];
let codeAgent: Mount["base"]["codeAgent"];

function usage(): {
  readonly inputTokens: {
    readonly total: number;
    readonly noCache: number;
    readonly cacheRead: undefined;
    readonly cacheWrite: undefined;
  };
  readonly outputTokens: {
    readonly total: number;
    readonly text: number;
    readonly reasoning: number;
  };
} {
  return {
    inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 5, text: 5, reasoning: 0 },
  };
}

function textMock(text: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: text },
          { type: "text-end", id: "t1" },
          { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: usage() },
        ],
      }),
    }),
  });
}

function scriptedMock(steps: readonly ScriptStep[]): MockLanguageModelV3 {
  let calls = 0;
  return new MockLanguageModelV3({
    doStream: async () => {
      const step = steps[Math.min(calls, steps.length - 1)];
      calls += 1;
      if (step === undefined || step.kind === "text") {
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "t1" },
              { type: "text-delta", id: "t1", delta: step?.text ?? "done" },
              { type: "text-end", id: "t1" },
              { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: usage() },
            ],
          }),
        };
      }
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            {
              type: "tool-call",
              toolCallId: step.id,
              toolName: step.name,
              input: JSON.stringify(step.input),
            },
            {
              type: "finish",
              finishReason: { unified: "tool-calls", raw: "tool-calls" },
              usage: usage(),
            },
          ],
        }),
      };
    },
  });
}

function hangingMock(): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: new ReadableStream({
        start(c): void {
          c.enqueue({ type: "stream-start", warnings: [] });
          c.enqueue({ type: "text-start", id: "t1" });
          c.enqueue({ type: "text-delta", id: "t1", delta: "partial output that never ends" });
        },
      }),
    }),
  });
}

function failingMock(message: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doStream: async (): Promise<never> => {
      throw new Error(message);
    },
  });
}

function messageParts(
  message: unknown,
): Array<{ readonly type?: unknown; readonly text?: unknown }> {
  if (typeof message !== "object" || message === null) {
    return [];
  }
  const content = (message as { readonly content?: unknown }).content;
  if (typeof content !== "object" || content === null) {
    return [];
  }
  const parts = (content as { readonly parts?: unknown }).parts;
  return Array.isArray(parts)
    ? (parts as Array<{ readonly type?: unknown; readonly text?: unknown }>)
    : [];
}

function collectText(events: readonly AgentControllerEvent[]): string {
  const out: string[] = [];
  for (const event of events) {
    if (event.type !== "message_update" && event.type !== "message_end") {
      continue;
    }
    for (const part of messageParts(event.message)) {
      if (part.type === "text" && typeof part.text === "string") {
        out.push(part.text);
      }
    }
  }
  return out.join("");
}

function collectToolResults(events: readonly AgentControllerEvent[]): string[] {
  const out: string[] = [];
  for (const event of events) {
    if (event.type !== "message_update" && event.type !== "message_end") {
      continue;
    }
    for (const part of messageParts(event.message)) {
      if (typeof part !== "object" || part === null) {
        continue;
      }
      const invocation = (part as { readonly toolInvocation?: unknown }).toolInvocation;
      if (typeof invocation !== "object" || invocation === null) {
        continue;
      }
      const record = invocation as { readonly state?: unknown; readonly result?: unknown };
      if (record.state === "result" && typeof record.result === "string") {
        out.push(record.result);
      }
    }
  }
  return out;
}

function eventTypes(events: readonly AgentControllerEvent[]): string[] {
  return events.map((event) => event.type);
}

async function runTurn(session: TestSession, content: string): Promise<AgentControllerEvent[]> {
  const events: AgentControllerEvent[] = [];
  const unsubscribe = session.subscribe((event) => {
    events.push(event);
  });
  try {
    await session.sendMessage({ content });
  } finally {
    unsubscribe();
  }
  return events;
}

async function newSession(): Promise<TestSession> {
  return controller.createSession({ resourceId: "phase2-tests" });
}

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), "lazycode-phase2-"));
  fixtureDir = join(scratch, "fixture");
  await writeFile(join(scratch, "placeholder.txt"), "scratch root\n");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(join(fixtureDir, "notes.txt"), "hello fixture\n");

  // Same lifecycle as apps/server/src/mastra/index.ts, but pointed at an
  // isolated cwd/home so tests never touch the real repo or user settings.
  // Long multi-step runs are avoided: auxiliary controller models resolve
  // through the gateway and need live credentials (Phase 14).
  const prepared = await prepareAgentControllerMount({
    cwd: fixtureDir,
    homeDir: join(scratch, "home"),
    configDir: ".lazycode-test",
    disablePlugins: true,
    disableMcp: true,
    disableHooks: true,
    disableGithubSignals: true,
  });
  const mastra = new Mastra(prepared.mastraArgs);
  await prepared.finalize();
  controller = prepared.base.controller;
  codeAgent = prepared.base.codeAgent;
  expect(mastra).toBeDefined();
}, 60000);

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe("Phase 2 controller vertical slice", () => {
  it("streams a mocked text-only turn through the controller", async () => {
    const mock = textMock("Hello from the mocked model.");
    codeAgent.model = mock;
    const events = await runTurn(await newSession(), "Say hello.");

    expect(collectText(events)).toContain("Hello from the mocked model.");
    expect(mock.doStreamCalls).toHaveLength(1);
    expect(eventTypes(events)).not.toContain("error");
    expect(eventTypes(events)).toContain("agent_end");
  }, 30000);

  it("completes a read turn against the fixture workspace", async () => {
    const mock = scriptedMock([
      {
        kind: "tool",
        name: "view",
        id: "call-view",
        input: { path: "notes.txt", showLineNumbers: false },
      },
      { kind: "text", text: "I read the fixture file." },
    ]);
    codeAgent.model = mock;
    const events = await runTurn(await newSession(), "Read notes.txt and confirm.");

    expect(collectToolResults(events).join("\n")).toContain("hello fixture");
    expect(collectText(events)).toContain("I read the fixture file.");
    expect(mock.doStreamCalls).toHaveLength(2);
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("completes a bounded edit and test iteration in the fixture", async () => {
    const mock = scriptedMock([
      {
        kind: "tool",
        name: "write_file",
        id: "call-write",
        input: { path: "out.txt", content: "phase2-ok\n", overwrite: true },
      },
      { kind: "tool", name: "execute_command", id: "call-cat", input: { command: "cat out.txt" } },
      { kind: "text", text: "Edit verified." },
    ]);
    codeAgent.model = mock;
    const events = await runTurn(await newSession(), "Write out.txt, then show its contents.");

    await expect(readFile(join(fixtureDir, "out.txt"), "utf8")).resolves.toBe("phase2-ok\n");
    expect(collectToolResults(events).join("\n")).toContain("phase2-ok");
    expect(collectText(events)).toContain("Edit verified.");
    expect(mock.doStreamCalls).toHaveLength(3);
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("terminates a multi-step loop instead of iterating forever", async () => {
    // Each tool finish drives exactly one more model call; a stop finish
    // ends the run. Explicit per-mode step caps arrive with modes/subagents
    // (Phases 9-10); here we prove bounded scripts terminate with exact
    // call accounting rather than hanging.
    const mock = scriptedMock([
      { kind: "tool", name: "file_stat", id: "call-stat-1", input: { path: "notes.txt" } },
      { kind: "tool", name: "file_stat", id: "call-stat-2", input: { path: "notes.txt" } },
      { kind: "text", text: "Two stats, then stop." },
    ]);
    codeAgent.model = mock;
    const events = await runTurn(await newSession(), "Stat notes.txt twice.");

    expect(mock.doStreamCalls).toHaveLength(3);
    expect(collectText(events)).toContain("Two stats, then stop.");
    expect(eventTypes(events)).toContain("agent_end");
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("cancels a hanging run through session abort", async () => {
    codeAgent.model = hangingMock();
    const session = await newSession();
    const events: AgentControllerEvent[] = [];
    const unsubscribe = session.subscribe((event) => {
      events.push(event);
    });
    const pending = session.sendMessage({ content: "Start a long answer." });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    session.abort();
    await expect(pending).resolves.toBeUndefined();
    unsubscribe();

    // The run was genuinely in flight when aborted, and aborting settled it
    // instead of leaving sendMessage hanging forever.
    expect(eventTypes(events)).toContain("message_start");
  }, 30000);

  it("contains a provider failure and recovers on the next turn", async () => {
    // Session events carry the raw failure so the agent can continue; HTTP
    // payload redaction at the client boundary is Mastra-owned stream
    // redaction, verified during server hardening (Phase 13).
    codeAgent.model = failingMock("provider boom 401: key sk-test-SECRET-xyz invalid");
    const session = await newSession();
    const failed = await runTurn(session, "This turn will fail.");

    expect(eventTypes(failed)).toContain("error");
    expect(eventTypes(failed)).toContain("agent_end");

    codeAgent.model = textMock("recovered");
    const recovered = await runTurn(session, "Try again.");

    expect(collectText(recovered)).toContain("recovered");
    expect(eventTypes(recovered)).not.toContain("error");
  }, 30000);
});
