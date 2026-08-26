/**
 * Core runtime event types emitted by the agent runtime.
 * Clients (CLI, web), persistence, and telemetry all consume these.
 */
export const CORE_EVENT_TYPES = [
  "session.started",
  "session.updated",

  "turn.started",
  "turn.completed",
  "turn.failed",
  "turn.cancelled",

  "message.started",
  "message.delta",
  "message.completed",

  "model.started",
  "model.completed",
  "model.failed",

  "tool.requested",
  "tool.started",
  "tool.output",
  "tool.completed",
  "tool.failed",

  "permission.requested",
  "permission.resolved",

  "file.changed",

  "subagent.started",
  "subagent.completed",
  "subagent.failed",

  "compaction.started",
  "compaction.completed",
  "compaction.failed",

  "usage.updated",
] as const;

export type CoreEventType = (typeof CORE_EVENT_TYPES)[number];

/**
 * Typed event envelope. Sequence is monotonic per session.
 * Payloads must be serializable and must never contain secrets.
 */
export interface AgentEvent<TType extends string = string, TPayload = unknown> {
  id: string;
  sessionId: string;
  turnId?: string;
  parentSessionId?: string;
  sequence: number;
  type: TType;
  /** ISO 8601 timestamp. */
  timestamp: string;
  payload: TPayload;
}
