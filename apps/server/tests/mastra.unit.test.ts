import { Mastra } from "@mastra/core/mastra";
import { describe, expect, it } from "vitest";

import { mastra } from "../src/mastra/index.js";

describe("Mastra composition root", () => {
  it("exports one Mastra instance", () => {
    expect(mastra).toBeInstanceOf(Mastra);
  });
});
