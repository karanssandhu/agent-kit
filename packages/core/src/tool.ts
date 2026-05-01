// Tool definition types and defineTool helper

import type { AuthContext } from "./auth.js";
import type { JsonSchema } from "./schema.js";

/** Context passed to every tool handler */
export interface ToolContext {
  /** The authenticated agent making the request */
  auth: AuthContext;
  /** Unique ID for this tool call (for idempotency / audit) */
  callId: string;
  /** Optional: ID of the approval that authorized this call */
  approvalId?: string;
}

/** A typed tool handler function */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  ctx: ToolContext,
  input: TInput
) => Promise<TOutput>;

/** A registered tool definition */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  handler: ToolHandler<TInput, TOutput>;
  /** Override the default policy action for this specific tool */
  policyOverride?: "allow" | "require_approval" | "deny";
}

/**
 * Define a tool with full type inference.
 *
 * @example
 * const getCustomer = defineTool({
 *   name: "get_customer",
 *   description: "Look up a customer by ID",
 *   inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
 *   handler: async (ctx, input) => ({ id: input.id, name: "Jane Doe" }),
 * });
 */
export function defineTool<TInput = unknown, TOutput = unknown>(
  definition: Tool<TInput, TOutput>
): Tool<TInput, TOutput> {
  return definition;
}
