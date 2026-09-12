import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Mastra } from "@mastra/core/mastra";
import { describe, expect, it } from "vitest";

describe("Mastra composition root", () => {
  it("boots the deployable entry with an isolated home and cwd", async () => {
    // The entry mounts the controller with default (production) settings, so
    // quarantine HOME and cwd: the test must never read user settings or
    // treat the real repo as its workspace.
    const previousCwd = process.cwd();
    const previousHome = process.env["HOME"];
    const scratch = await mkdtemp(join(tmpdir(), "lazycode-entry-"));
    process.env["HOME"] = join(scratch, "home");
    process.chdir(scratch);
    try {
      const entry = await import("../src/mastra/index.js");
      expect(entry.mastra).toBeInstanceOf(Mastra);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) {
        delete process.env["HOME"];
      } else {
        process.env["HOME"] = previousHome;
      }
      await rm(scratch, { recursive: true, force: true });
    }
  }, 60000);
});
