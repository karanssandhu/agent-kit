# @agentkit/express

Express middleware for AgentKit: tool routing, MCP server, SQLite audit logging, and the approval workflow.

## Installation

```bash
pnpm add @agentkit/express @agentkit/core
```

## Usage

```ts
import express from "express";
import { defineTool } from "@agentkit/core";
import { createAgentRouter } from "@agentkit/express";

const app = express();
app.use(express.json());

const getCustomer = defineTool({
  name: "get_customer",
  description: "Look up a customer by ID",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  handler: async (_ctx, input) => ({ id: input.id, name: "Jane Doe" }),
});

app.use(
  "/agent",
  createAgentRouter({
    tools: [getCustomer],
    auth: {
      keys: {
        my_secret_key: { agentId: "claude_agent", agentName: "Claude" },
      },
    },
  })
);

app.listen(3000);
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/agent/tools` | List all registered tools |
| `POST` | `/agent/tools/:name` | Execute a tool |
| `POST` | `/agent/mcp` | MCP JSON-RPC endpoint |
| `GET` | `/agent/approvals` | List pending approvals |
| `GET` | `/agent/approvals/ui` | Approval UI (HTML) |
| `POST` | `/agent/approvals/:id/approve` | Approve a tool call |
| `POST` | `/agent/approvals/:id/deny` | Deny a tool call |
| `POST` | `/agent/approvals/:id/execute` | Execute after approval |

## Approval Flow

1. Agent calls `POST /agent/tools/send_email`
2. Policy engine returns `require_approval`
3. Response: `{ status: "pending_approval", approvalUrl: "..." }`
4. Human opens the URL, reviews inputs, clicks Approve
5. Tool executes, result returned

## Database

Stores audit data in a local SQLite file (`agentkit.db` by default). Schema:

- `tool_calls` — every tool invocation with status, input/output, timestamps
- `approvals` — approval requests with decision and approver
