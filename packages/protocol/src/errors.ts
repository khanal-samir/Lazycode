/**
 * Stable, user-facing error taxonomy.
 * Internal causes stay in logs; clients only ever see this shape.
 */
export const AGENT_ERROR_CODES = [
  "MODEL_AUTH_ERROR",
  "MODEL_RATE_LIMIT",
  "MODEL_TIMEOUT",
  "MODEL_INVALID_RESPONSE",
  "TOOL_NOT_FOUND",
  "TOOL_INPUT_INVALID",
  "TOOL_FAILED",
  "PERMISSION_DENIED",
  "WORKSPACE_ERROR",
  "SESSION_ERROR",
  "CONTEXT_OVERFLOW",
  "MCP_CONNECTION_ERROR",
  "MCP_TOOL_ERROR",
  "SANDBOX_PROVISION_ERROR",
  "REMOTE_TIMEOUT",
  "CANCELLED",
  "INTERNAL",
] as const;

export type AgentErrorCode = (typeof AGENT_ERROR_CODES)[number];

export interface AgentErrorShape {
  code: AgentErrorCode;
  /** User-safe message — never contains secrets or stack traces. */
  message: string;
  retryable: boolean;
  correlationId: string;
}
