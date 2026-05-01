// Tool executor: runs tools with policy evaluation, approval gating, and audit logging

import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { PolicyEngine, validateSchema, DEFAULT_POLICY } from "@agentkit/core";
import type { Tool, AuthContext, Policy } from "@agentkit/core";
import {
  insertToolCall,
  updateToolCall,
  insertApproval,
  updateApproval,
  getApproval,
  getToolCall,
} from "./database.js";

export interface ExecutionResult {
  status: "completed" | "failed" | "pending_approval" | "denied";
  output?: unknown;
  error?: string;
  approvalId?: string;
  approvalUrl?: string;
}

export interface ExecutorOptions {
  tools: Tool[];
  policy?: Policy;
  database: Database.Database;
  baseUrl: string;
}

export class ToolExecutor {
  private toolMap: Map<string, Tool>;
  private policyEngine: PolicyEngine;
  private db: Database.Database;
  private baseUrl: string;

  constructor(opts: ExecutorOptions) {
    this.toolMap = new Map(opts.tools.map((t) => [t.name, t]));
    this.policyEngine = new PolicyEngine(opts.policy ?? DEFAULT_POLICY);
    this.db = opts.database;
    this.baseUrl = opts.baseUrl;
  }

  getTools(): Tool[] {
    return [...this.toolMap.values()];
  }

  getTool(name: string): Tool | undefined {
    return this.toolMap.get(name);
  }

  async execute(toolName: string, input: unknown, auth: AuthContext): Promise<ExecutionResult> {
    const tool = this.toolMap.get(toolName);
    if (!tool) {
      return { status: "failed", error: `Tool "${toolName}" not found` };
    }

    // Validate input schema
    const validation = validateSchema(input, tool.inputSchema);
    if (!validation.valid) {
      return { status: "failed", error: `Input validation failed: ${validation.errors.join("; ")}` };
    }

    // Policy check
    const policy = tool.policyOverride
      ? { action: tool.policyOverride as "allow" | "require_approval" | "deny" }
      : this.policyEngine.evaluate(tool, auth);

    if (policy.action === "deny") {
      return { status: "denied", error: policy.reason ?? "Tool is not allowed for this agent" };
    }

    const callId = `call_${uuidv4()}`;
    const now = Date.now();

    if (policy.action === "require_approval") {
      const approvalId = `appr_${uuidv4()}`;

      // Record the tool call as pending
      insertToolCall(this.db, {
        id: callId,
        agentId: auth.agentId,
        toolName,
        input: JSON.stringify(input),
        status: "pending",
        approvalId,
        createdAt: now,
        updatedAt: now,
      });

      // Record the approval request
      insertApproval(this.db, {
        id: approvalId,
        toolCallId: callId,
        agentId: auth.agentId,
        toolName,
        input: JSON.stringify(input),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      return {
        status: "pending_approval",
        approvalId,
        approvalUrl: `${this.baseUrl}/agent/approvals/ui?id=${approvalId}`,
      };
    }

    // action === "allow" — execute immediately
    return this.runTool(tool, callId, input, auth);
  }

  async executeAfterApproval(approvalId: string, auth: AuthContext): Promise<ExecutionResult> {
    const approval = getApproval(this.db, approvalId);
    if (!approval) {
      return { status: "failed", error: "Approval not found" };
    }
    if (approval.status !== "approved") {
      return { status: "failed", error: `Approval is ${approval.status}, expected approved` };
    }

    const tool = this.toolMap.get(approval.toolName);
    if (!tool) {
      return { status: "failed", error: `Tool "${approval.toolName}" not found` };
    }

    const call = getToolCall(this.db, approval.toolCallId);
    if (!call) {
      return { status: "failed", error: "Tool call record not found" };
    }

    const input = JSON.parse(approval.input) as unknown;
    return this.runTool(tool, call.id, input, auth, approvalId);
  }

  private async runTool(
    tool: Tool,
    callId: string,
    input: unknown,
    auth: AuthContext,
    approvalId?: string
  ): Promise<ExecutionResult> {
    const now = Date.now();

    // Upsert tool call record
    try {
      insertToolCall(this.db, {
        id: callId,
        agentId: auth.agentId,
        toolName: tool.name,
        input: JSON.stringify(input),
        status: "completed",
        approvalId,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // Record may already exist (approval path); just update it
      updateToolCall(this.db, callId, { status: "completed" });
    }

    try {
      const output = await tool.handler({ auth, callId, approvalId }, input);
      updateToolCall(this.db, callId, { status: "completed", output: JSON.stringify(output) });
      return { status: "completed", output };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      updateToolCall(this.db, callId, { status: "failed", error });
      return { status: "failed", error };
    }
  }

  approve(approvalId: string, approvedBy?: string): boolean {
    const approval = getApproval(this.db, approvalId);
    if (!approval || approval.status !== "pending") return false;
    updateApproval(this.db, approvalId, { status: "approved", approvedBy });
    updateToolCall(this.db, approval.toolCallId, { status: "approved" });
    return true;
  }

  deny(approvalId: string, reason?: string, deniedBy?: string): boolean {
    const approval = getApproval(this.db, approvalId);
    if (!approval || approval.status !== "pending") return false;
    updateApproval(this.db, approvalId, { status: "denied", reason, approvedBy: deniedBy });
    updateToolCall(this.db, approval.toolCallId, { status: "denied" });
    return true;
  }
}
