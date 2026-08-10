/**
 * Sprint 2.8.2 Phase 3 — Tool Registry contracts.
 *
 * Tools are thin, permission-checked read adapters over exported domain
 * services. They never mutate state and never recalculate analytics —
 * they only retrieve source records for grounding AI responses.
 */

export interface AiToolContext {
  tenantId: string;
  userId: string;
  userRole: string;
}

export interface AiToolArgs {
  id?: string;
  query?: string;
  search?: string;
  status?: string;
  period?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface AiToolResult {
  tool: string;
  domain: string;
  result: unknown;
  truncated: boolean;
  durationMs: number;
}

export interface AiTool {
  /** Unique tool name, e.g. `engineering.drawings`. */
  name: string;
  description: string;
  /** Copilot domain used for RBAC mapping. */
  domain: string;
  /** Roles allowed to execute this tool. */
  roles: string[];
  execute(args: AiToolArgs, ctx: AiToolContext): Promise<unknown>;
}
