// Policy engine types and implementation

import type { AuthContext } from "./auth.js";
import type { Tool } from "./tool.js";

export type PolicyAction = "allow" | "require_approval" | "deny";

export interface PolicyRule {
  /** Glob-style tool name pattern, e.g. "*" or "create_*" */
  toolPattern: string;
  /** Roles that this rule applies to; if omitted, applies to all */
  roles?: string[];
  /** The action to take when this rule matches */
  action: PolicyAction;
  /** Human-readable reason shown in the approval UI */
  reason?: string;
}

export interface Policy {
  /** Default action when no rule matches */
  default: PolicyAction;
  /** Ordered list of rules; first match wins */
  rules: PolicyRule[];
}

/**
 * Default policy: reads are allowed, writes require approval.
 * Read tools should have names starting with "get_", "list_", "search_", or "fetch_".
 */
export const DEFAULT_POLICY: Policy = {
  default: "require_approval",
  rules: [
    { toolPattern: "get_*", action: "allow" },
    { toolPattern: "list_*", action: "allow" },
    { toolPattern: "search_*", action: "allow" },
    { toolPattern: "fetch_*", action: "allow" },
  ],
};

function matchesPattern(pattern: string, name: string): boolean {
  // Simple glob: only supports trailing '*'
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    return name.startsWith(pattern.slice(0, -1));
  }
  return pattern === name;
}

export class PolicyEngine {
  constructor(private policy: Policy = DEFAULT_POLICY) {}

  /**
   * Evaluate the policy for a given tool and auth context.
   * Returns the action to take and an optional reason.
   */
  evaluate(tool: Tool, auth: AuthContext): { action: PolicyAction; reason?: string } {
    for (const rule of this.policy.rules) {
      if (!matchesPattern(rule.toolPattern, tool.name)) continue;
      if (rule.roles && !rule.roles.some((r) => auth.roles?.includes(r))) continue;
      return { action: rule.action, reason: rule.reason };
    }
    return { action: this.policy.default };
  }
}
