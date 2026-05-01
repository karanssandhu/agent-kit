// SQLite database layer: schema setup, audit queries, approval queries

import Database from "better-sqlite3";
import path from "path";

export interface ToolCallRecord {
  id: string;
  agentId: string;
  toolName: string;
  input: string; // JSON string
  status: "pending" | "approved" | "denied" | "completed" | "failed";
  output?: string; // JSON string
  error?: string;
  approvalId?: string;
  createdAt: number; // Unix ms
  updatedAt: number;
}

export interface ApprovalRecord {
  id: string;
  toolCallId: string;
  agentId: string;
  toolName: string;
  input: string; // JSON string
  status: "pending" | "approved" | "denied";
  reason?: string;
  approvedBy?: string;
  createdAt: number;
  updatedAt: number;
}

let db: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (db) return db;
  const filePath = dbPath ?? path.join(process.cwd(), "agentkit.db");
  db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tool_calls (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT NOT NULL,
      tool_name   TEXT NOT NULL,
      input       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      output      TEXT,
      error       TEXT,
      approval_id TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id           TEXT PRIMARY KEY,
      tool_call_id TEXT NOT NULL,
      agent_id     TEXT NOT NULL,
      tool_name    TEXT NOT NULL,
      input        TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      reason       TEXT,
      approved_by  TEXT,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tool_calls_agent    ON tool_calls(agent_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_status   ON tool_calls(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_status    ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_callid    ON approvals(tool_call_id);
  `);
}

// ── Tool call queries ─────────────────────────────────────────────────────────

export function insertToolCall(database: Database.Database, record: ToolCallRecord): void {
  database
    .prepare(
      `INSERT INTO tool_calls
       (id, agent_id, tool_name, input, status, output, error, approval_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.agentId,
      record.toolName,
      record.input,
      record.status,
      record.output ?? null,
      record.error ?? null,
      record.approvalId ?? null,
      record.createdAt,
      record.updatedAt
    );
}

export function updateToolCall(
  database: Database.Database,
  id: string,
  updates: Partial<Pick<ToolCallRecord, "status" | "output" | "error" | "approvalId">>
): void {
  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.output !== undefined) { fields.push("output = ?"); values.push(updates.output); }
  if (updates.error !== undefined) { fields.push("error = ?"); values.push(updates.error); }
  if (updates.approvalId !== undefined) { fields.push("approval_id = ?"); values.push(updates.approvalId); }
  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  database.prepare(`UPDATE tool_calls SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function getToolCall(database: Database.Database, id: string): ToolCallRecord | null {
  const row = database.prepare("SELECT * FROM tool_calls WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToToolCall(row) : null;
}

export function getAllToolCalls(database: Database.Database): ToolCallRecord[] {
  const rows = database.prepare("SELECT * FROM tool_calls ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(rowToToolCall);
}

function rowToToolCall(row: Record<string, unknown>): ToolCallRecord {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    toolName: row.tool_name as string,
    input: row.input as string,
    status: row.status as ToolCallRecord["status"],
    output: row.output as string | undefined,
    error: row.error as string | undefined,
    approvalId: row.approval_id as string | undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

// ── Approval queries ──────────────────────────────────────────────────────────

export function insertApproval(database: Database.Database, record: ApprovalRecord): void {
  database
    .prepare(
      `INSERT INTO approvals
       (id, tool_call_id, agent_id, tool_name, input, status, reason, approved_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.toolCallId,
      record.agentId,
      record.toolName,
      record.input,
      record.status,
      record.reason ?? null,
      record.approvedBy ?? null,
      record.createdAt,
      record.updatedAt
    );
}

export function updateApproval(
  database: Database.Database,
  id: string,
  updates: Partial<Pick<ApprovalRecord, "status" | "reason" | "approvedBy">>
): void {
  const now = Date.now();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.reason !== undefined) { fields.push("reason = ?"); values.push(updates.reason); }
  if (updates.approvedBy !== undefined) { fields.push("approved_by = ?"); values.push(updates.approvedBy); }
  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  database.prepare(`UPDATE approvals SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function getApproval(database: Database.Database, id: string): ApprovalRecord | null {
  const row = database.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToApproval(row) : null;
}

export function getPendingApprovals(database: Database.Database): ApprovalRecord[] {
  const rows = database
    .prepare("SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToApproval);
}

function rowToApproval(row: Record<string, unknown>): ApprovalRecord {
  return {
    id: row.id as string,
    toolCallId: row.tool_call_id as string,
    agentId: row.agent_id as string,
    toolName: row.tool_name as string,
    input: row.input as string,
    status: row.status as ApprovalRecord["status"],
    reason: row.reason as string | undefined,
    approvedBy: row.approved_by as string | undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
