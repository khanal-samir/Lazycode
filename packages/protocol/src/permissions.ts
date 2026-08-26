export const PERMISSION_EFFECTS = ["allow", "ask", "deny"] as const;

export type PermissionEffect = (typeof PERMISSION_EFFECTS)[number];
