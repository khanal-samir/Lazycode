export const SESSION_STATUSES = [
  "idle",
  "running",
  "waiting_approval",
  "failed",
  "cancelled",
  "archived",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const TURN_STATUSES = [
  "queued",
  "running",
  "waiting_approval",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
] as const;

export type TurnStatus = (typeof TURN_STATUSES)[number];
