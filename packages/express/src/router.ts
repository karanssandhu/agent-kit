// createAgentRouter: main Express router that wires everything together

import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Tool, Policy, ApiKeyConfig } from "@agentkit/core";
import { DEFAULT_POLICY } from "@agentkit/core";
import { createAuthMiddleware } from "./middleware.js";
import { ToolExecutor } from "./executor.js";
import { getDatabase, getPendingApprovals, getApproval } from "./database.js";
import { createMcpHandler } from "./mcp.js";

export interface AgentRouterConfig {
  /** List of tools to expose */
  tools: Tool[];
  /** Policy that governs approval requirements (defaults to DEFAULT_POLICY) */
  policy?: Policy;
  /** API key configuration for agent authentication */
  auth?: ApiKeyConfig;
  /** Path to the SQLite database file (default: ./agentkit.db) */
  dbPath?: string;
  /** Base URL for approval links (default: http://localhost:3000) */
  baseUrl?: string;
}

/**
 * Creates an Express Router that exposes:
 *   POST /tools/:name           — Execute a tool
 *   GET  /tools                 — List available tools
 *   GET  /approvals             — List pending approvals
 *   GET  /approvals/:id         — Get approval details
 *   POST /approvals/:id/approve — Approve a pending tool call
 *   POST /approvals/:id/deny    — Deny a pending tool call
 *   POST /approvals/:id/execute — Execute tool after approval
 *   GET  /approvals/ui          — Approval UI (HTML)
 *   POST /mcp                   — MCP JSON-RPC endpoint
 */
export function createAgentRouter(config: AgentRouterConfig): Router {
  const router = Router();
  const db = getDatabase(config.dbPath);
  const baseUrl = config.baseUrl ?? "http://localhost:3000";

  const executor = new ToolExecutor({
    tools: config.tools,
    policy: config.policy ?? DEFAULT_POLICY,
    database: db,
    baseUrl,
  });

  // Default permissive auth (any bearer token maps to a generic agent)
  const defaultAuth: ApiKeyConfig = {
    keys: {
      agent_key_123: { agentId: "default_agent", agentName: "Default Agent" },
    },
  };
  const authMiddleware = createAuthMiddleware(config.auth ?? defaultAuth);

  // ── MCP endpoint (no auth middleware — clients may not support Bearer) ─────
  router.post("/mcp", createMcpHandler(executor.getTools()));

  // ── Tool list (unauthenticated for discoverability) ───────────────────────
  router.get("/tools", (_req, res) => {
    const tools = executor.getTools().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    res.json({ tools });
  });

  // ── Approval UI (serve HTML, no auth required) ────────────────────────────
  router.get("/approvals/ui", (_req, res) => {
    // Inline the UI HTML from @agentkit/ui (avoid runtime require for simplicity)
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildApprovalUiHtml(baseUrl));
  });

  // ── Apply auth middleware to all remaining routes ─────────────────────────
  router.use(authMiddleware);

  // ── Execute a tool ────────────────────────────────────────────────────────
  router.post("/tools/:name", async (req, res) => {
    const auth = req.agentAuth!;
    const result = await executor.execute(req.params.name, req.body, auth);

    if (result.status === "completed") {
      res.json({ status: "completed", output: result.output });
    } else if (result.status === "pending_approval") {
      res.status(202).json({
        status: "pending_approval",
        approvalId: result.approvalId,
        approvalUrl: result.approvalUrl,
        message: "This action requires human approval before it can be executed.",
      });
    } else if (result.status === "denied") {
      res.status(403).json({ status: "denied", error: result.error });
    } else {
      res.status(400).json({ status: "failed", error: result.error });
    }
  });

  // ── List pending approvals ─────────────────────────────────────────────────
  router.get("/approvals", (_req, res) => {
    const pending = getPendingApprovals(db);
    res.json({ approvals: pending });
  });

  // ── Get a single approval ─────────────────────────────────────────────────
  router.get("/approvals/:id", (req, res) => {
    const approval = getApproval(db, req.params.id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    res.json({ approval });
  });

  // ── Approve ───────────────────────────────────────────────────────────────
  router.post("/approvals/:id/approve", (req, res) => {
    const auth = req.agentAuth!;
    const ok = executor.approve(req.params.id, auth.userId ?? auth.agentId);
    if (!ok) {
      res.status(400).json({ error: "Could not approve: approval not found or not pending" });
      return;
    }
    res.json({ status: "approved" });
  });

  // ── Deny ──────────────────────────────────────────────────────────────────
  router.post("/approvals/:id/deny", (req, res) => {
    const auth = req.agentAuth!;
    const body = req.body as { reason?: string } | undefined;
    const ok = executor.deny(req.params.id, body?.reason, auth.userId ?? auth.agentId);
    if (!ok) {
      res.status(400).json({ error: "Could not deny: approval not found or not pending" });
      return;
    }
    res.json({ status: "denied" });
  });

  // ── Execute after approval ────────────────────────────────────────────────
  router.post("/approvals/:id/execute", async (req, res) => {
    const auth = req.agentAuth!;
    const result = await executor.executeAfterApproval(req.params.id, auth);

    if (result.status === "completed") {
      res.json({ status: "completed", output: result.output });
    } else {
      res.status(400).json({ status: result.status, error: result.error });
    }
  });

  return router;
}

// ── Inline approval UI HTML ───────────────────────────────────────────────────

function buildApprovalUiHtml(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AgentKit — Approve Action</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f4f6f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 2rem;
      max-width: 560px;
      width: 100%;
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #111; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .badge-pending  { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-denied   { background: #fee2e2; color: #991b1b; }
    label { display: block; font-size: 0.8rem; font-weight: 600; color: #555; margin-bottom: 0.25rem; }
    .value-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      font-family: "SF Mono", Menlo, monospace;
      font-size: 0.82rem;
      white-space: pre-wrap;
      word-break: break-all;
      margin-bottom: 1rem;
      color: #1e293b;
    }
    textarea {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      font-size: 0.9rem;
      resize: vertical;
      min-height: 72px;
      margin-bottom: 1rem;
    }
    .actions { display: flex; gap: 0.75rem; }
    button {
      flex: 1;
      padding: 0.65rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-approve { background: #10b981; color: #fff; }
    .btn-deny    { background: #ef4444; color: #fff; }
    .result-msg { margin-top: 1rem; font-weight: 600; font-size: 0.95rem; }
    .result-msg.ok  { color: #065f46; }
    .result-msg.err { color: #991b1b; }
    #loading { text-align: center; color: #64748b; padding: 2rem 0; }
    #error-state { color: #991b1b; }
  </style>
</head>
<body>
<div class="card">
  <div id="loading">Loading approval...</div>
  <div id="error-state" style="display:none"></div>
  <div id="approval-content" style="display:none">
    <h1>Review Agent Action</h1>
    <div id="status-badge" class="badge badge-pending">Pending</div>

    <label>Tool</label>
    <div class="value-box" id="tool-name"></div>

    <label>Agent</label>
    <div class="value-box" id="agent-id"></div>

    <label>Input</label>
    <div class="value-box" id="tool-input"></div>

    <div id="action-section">
      <label>Reason (optional)</label>
      <textarea id="reason" placeholder="Add a note about your decision..."></textarea>
      <div class="actions">
        <button class="btn-approve" id="btn-approve" onclick="decide('approve')">✓ Approve</button>
        <button class="btn-deny"    id="btn-deny"    onclick="decide('deny')">✗ Deny</button>
      </div>
    </div>

    <div id="result-msg" class="result-msg" style="display:none"></div>
  </div>
</div>

<script>
  const BASE = "${baseUrl}";
  const params = new URLSearchParams(location.search);
  const approvalId = params.get("id");

  async function load() {
    if (!approvalId) {
      showError("No approval ID provided in URL (?id=...)");
      return;
    }
    try {
      const r = await fetch(BASE + "/agent/approvals/" + approvalId, {
        headers: { Authorization: "Bearer agent_key_123" }
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      render(data.approval);
    } catch (e) {
      showError("Failed to load approval: " + e.message);
    }
  }

  function render(approval) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("approval-content").style.display = "block";

    document.getElementById("tool-name").textContent = approval.toolName;
    document.getElementById("agent-id").textContent = approval.agentId;
    document.getElementById("tool-input").textContent = JSON.stringify(JSON.parse(approval.input), null, 2);

    const badge = document.getElementById("status-badge");
    badge.textContent = approval.status.charAt(0).toUpperCase() + approval.status.slice(1);
    badge.className = "badge badge-" + approval.status;

    if (approval.status !== "pending") {
      document.getElementById("action-section").style.display = "none";
      showResult(approval.status === "approved" ? "This action was approved." : "This action was denied.", approval.status === "approved");
    }
  }

  async function decide(action) {
    const reason = document.getElementById("reason").value.trim();
    document.getElementById("btn-approve").disabled = true;
    document.getElementById("btn-deny").disabled = true;

    try {
      const r = await fetch(BASE + "/agent/approvals/" + approvalId + "/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer agent_key_123" },
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) throw new Error(await r.text());

      document.getElementById("action-section").style.display = "none";
      const badge = document.getElementById("status-badge");
      badge.textContent = action === "approve" ? "Approved" : "Denied";
      badge.className = "badge badge-" + (action === "approve" ? "approved" : "denied");

      if (action === "approve") {
        // Auto-execute the tool after approval
        const exr = await fetch(BASE + "/agent/approvals/" + approvalId + "/execute", {
          method: "POST",
          headers: { Authorization: "Bearer agent_key_123" },
        });
        const exd = await exr.json();
        if (exd.status === "completed") {
          showResult("✓ Approved and executed. Output: " + JSON.stringify(exd.output), true);
        } else {
          showResult("Approved, but execution failed: " + (exd.error ?? "Unknown error"), false);
        }
      } else {
        showResult("✗ Action denied.", false);
      }
    } catch (e) {
      document.getElementById("btn-approve").disabled = false;
      document.getElementById("btn-deny").disabled = false;
      showResult("Error: " + e.message, false);
    }
  }

  function showResult(msg, ok) {
    const el = document.getElementById("result-msg");
    el.textContent = msg;
    el.className = "result-msg " + (ok ? "ok" : "err");
    el.style.display = "block";
  }

  function showError(msg) {
    document.getElementById("loading").style.display = "none";
    const el = document.getElementById("error-state");
    el.textContent = msg;
    el.style.display = "block";
  }

  load();
</script>
</body>
</html>`;
}
