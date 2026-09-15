import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentControllerEvent } from "@mastra/core/agent-controller";
import { prepareAgentControllerMount } from "@mastra/code-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildTrustedLocalWorkspace } from "../src/mastra/workspace.js";

type Mount = Awaited<ReturnType<typeof prepareAgentControllerMount>>;
type TestSession = Awaited<ReturnType<Mount["base"]["controller"]["createSession"]>>;

type ScriptStep =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "tool"; readonly name: string; readonly id: string; readonly input: unknown };

const CANARY_NAME = "LAZYCODE_PHASE3_CANARY";
const CANARY_VALUE = "canary-secret-phase3";
const OUTSIDE_CONTENT = "top secret outside the workspace\n";

let scratch = "";
let fixtureDir = "";
let controller: Mount["base"]["controller"];
let codeAgent: Mount["base"]["codeAgent"];
let previousCanary: string | undefined;

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

async function runToolTurn(
  sessionName: string,
  tool: string,
  id: string,
  input: unknown,
): Promise<AgentControllerEvent[]> {
  codeAgent.model = scriptedMock([
    { kind: "tool", name: tool, id, input },
    { kind: "text", text: "done" },
  ]);
  const session = await controller.createSession({ resourceId: `phase3-${sessionName}` });
  const events: AgentControllerEvent[] = [];
  const unsubscribe = session.subscribe((event) => {
    events.push(event);
  });
  try {
    await session.sendMessage({ content: `phase3 ${sessionName}: run ${tool}` });
  } finally {
    unsubscribe();
  }
  return events;
}

beforeAll(async () => {
  previousCanary = process.env[CANARY_NAME];
  process.env[CANARY_NAME] = CANARY_VALUE;

  scratch = await mkdtemp(join(tmpdir(), "lazycode-phase3-"));
  fixtureDir = join(scratch, "fixture");
  const { mkdir, appendFile } = await import("node:fs/promises");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(join(fixtureDir, "notes.txt"), "hello fixture\n");
  await writeFile(join(scratch, "outside.txt"), OUTSIDE_CONTENT);
  symlinkSync(join(scratch, "outside.txt"), join(fixtureDir, "link-out.txt"));

  execFileSync("git", ["init"], { cwd: fixtureDir });
  execFileSync("git", ["add", "-A"], { cwd: fixtureDir });
  execFileSync(
    "git",
    [
      "-c",
      "user.email=phase3@test",
      "-c",
      "user.name=phase3",
      "commit",
      "-m",
      "phase3 fixture commit",
    ],
    {
      cwd: fixtureDir,
    },
  );
  await appendFile(join(fixtureDir, "notes.txt"), "work in progress\n");

  // Same lifecycle as apps/server/src/mastra/index.ts, pointed at the
  // fixture through the product workspace builder under test.
  const prepared = await prepareAgentControllerMount({
    cwd: fixtureDir,
    homeDir: join(scratch, "home"),
    configDir: ".lazycode-test",
    disablePlugins: true,
    disableMcp: true,
    disableHooks: true,
    disableGithubSignals: true,
    workspace: buildTrustedLocalWorkspace(fixtureDir),
  });
  const mastra = new Mastra(prepared.mastraArgs);
  await prepared.finalize();
  controller = prepared.base.controller;
  codeAgent = prepared.base.codeAgent;
  expect(mastra).toBeDefined();
}, 60000);

afterAll(async () => {
  if (previousCanary === undefined) {
    delete process.env[CANARY_NAME];
  } else {
    process.env[CANARY_NAME] = previousCanary;
  }
  await rm(scratch, { recursive: true, force: true });
});

describe("Phase 3 workspace and sandbox safety", () => {
  it("rejects parent traversal reads", async () => {
    const events = await runToolTurn("traversal", "view", "call-traverse", {
      path: "../outside.txt",
      showLineNumbers: false,
    });

    const results = collectToolResults(events).join("\n");
    expect(results).toContain("Permission denied");
    expect(results).not.toContain("top secret");
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("rejects absolute outside reads", async () => {
    const events = await runToolTurn("absolute", "view", "call-abs", {
      path: "/etc/hostname",
      showLineNumbers: false,
    });

    const results = collectToolResults(events).join("\n");
    expect(results).toContain("Permission denied");
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("rejects symlink reads that escape the fixture", async () => {
    const events = await runToolTurn("symlink", "view", "call-link", {
      path: "link-out.txt",
      showLineNumbers: false,
    });

    const results = collectToolResults(events).join("\n");
    expect(results).toContain("Permission denied");
    expect(results).not.toContain("top secret");
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("rejects overwriting an existing symlink", async () => {
    const events = await runToolTurn("overwrite-link", "write_file", "call-overwrite", {
      path: "link-out.txt",
      content: "overwrite attempt\n",
      overwrite: true,
    });

    const results = collectToolResults(events).join("\n");
    expect(results).toContain("Permission denied");
    await expect(readFile(join(scratch, "outside.txt"), "utf8")).resolves.toBe(OUTSIDE_CONTENT);
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("isolates command environment to the allowlist", async () => {
    const events = await runToolTurn("env", "execute_command", "call-env", { command: "env" });

    const results = collectToolResults(events).join("\n");
    expect(results).toContain("PATH=");
    expect(results).not.toContain(CANARY_VALUE);
    expect(results).not.toContain(CANARY_NAME);
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("runs commands in the fixture working directory", async () => {
    const events = await runToolTurn("pwd", "execute_command", "call-pwd", { command: "pwd" });

    const results = collectToolResults(events).join("\n").trim();
    await expect(realpath(results.split("\n")[0] ?? "")).resolves.toBe(await realpath(fixtureDir));
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("kills commands that exceed their timeout", async () => {
    // NOTE: the execute_command timeout input is in seconds.
    const started = Date.now();
    const events = await runToolTurn("timeout", "execute_command", "call-sleep", {
      command: "sleep 20 && echo SURVIVED",
      timeout: 2,
    });

    expect(Date.now() - started).toBeLessThan(15000);
    expect(collectToolResults(events).join("\n")).not.toContain("SURVIVED");
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("propagates abort to a running command", async () => {
    codeAgent.model = scriptedMock([
      { kind: "tool", name: "execute_command", id: "call-long", input: { command: "sleep 30" } },
      { kind: "text", text: "done" },
    ]);
    const session = await controller.createSession({ resourceId: "phase3-abort" });
    const events: AgentControllerEvent[] = [];
    const unsubscribe = session.subscribe((event) => {
      events.push(event);
    });
    const pending = session.sendMessage({ content: "phase3 abort: run a long command" });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    session.abort();
    await expect(pending).resolves.toBeUndefined();
    unsubscribe();

    expect(eventTypes(events)).toContain("message_start");
  }, 30000);

  it("caps retained command output", async () => {
    const events = await runToolTurn("bigout", "execute_command", "call-seq", {
      command: "seq 1 200000",
    });

    const results = collectToolResults(events).join("\n");
    expect(results).toContain("[showing last 200 of 200000 lines]");
    expect(results).not.toContain("\n1\n");
    expect(eventTypes(events)).not.toContain("error");
  }, 30000);

  it("runs git inspection against the fixture repository", async () => {
    const status = await runToolTurn("git-status", "execute_command", "call-status", {
      command: "git status --short",
    });
    const log = await runToolTurn("git-log", "execute_command", "call-log", {
      command: "git log --oneline -1",
    });
    const diff = await runToolTurn("git-diff", "execute_command", "call-diff", {
      command: "git diff --stat",
    });

    expect(collectToolResults(status).join("\n")).toContain("notes.txt");
    expect(collectToolResults(log).join("\n")).toContain("phase3 fixture commit");
    expect(collectToolResults(diff).join("\n")).toContain("notes.txt");
  }, 60000);
});
