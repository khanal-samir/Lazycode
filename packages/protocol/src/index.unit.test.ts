import { describe, expect, it } from "vitest";

import {
  AGENT_ERROR_CODES,
  CORE_EVENT_TYPES,
  PERMISSION_EFFECTS,
  PROTOCOL_VERSION,
  SESSION_STATUSES,
  TURN_STATUSES,
} from "./index.js";

describe("protocol contracts", () => {
  it("versions the protocol with semver", () => {
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("uses <domain>.<action> naming for all core event types", () => {
    for (const type of CORE_EVENT_TYPES) {
      expect(type).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it("has no duplicate event types", () => {
    expect(new Set(CORE_EVENT_TYPES).size).toBe(CORE_EVENT_TYPES.length);
  });

  it("uses SCREAMING_SNAKE_CASE for all error codes", () => {
    for (const code of AGENT_ERROR_CODES) {
      expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it("keeps statuses and permission effects lowercase", () => {
    const lowercase = /^[a-z_]+$/;
    for (const value of [...SESSION_STATUSES, ...TURN_STATUSES, ...PERMISSION_EFFECTS]) {
      expect(value).toMatch(lowercase);
    }
  });
});
