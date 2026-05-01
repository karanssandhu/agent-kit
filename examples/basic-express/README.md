# basic-express — AgentKit Example App

A simple Express app demonstrating AgentKit with 3 sample tools.

## Tools

| Tool | Operation | Approval |
|---|---|---|
| `get_customer` | Read customer by ID | ❌ Not required |
| `create_invoice` | Create an invoice | ✅ Required |
| `send_email` | Send an email | ✅ Required |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8

### 1. Install dependencies (from repo root)

```bash
cd /path/to/agent-kit
pnpm install
pnpm build
```

### 2. Configure environment

```bash
cd examples/basic-express
cp .env.example .env
# Edit .env if needed
```

### 3. Run the app

```bash
pnpm dev
```

The server starts on `http://localhost:3000`.

## Testing the API

### Read tool (no approval)

```bash
curl -X POST http://localhost:3000/agent/tools/get_customer \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"id": "cust_001"}'
```

Response:
```json
{
  "status": "completed",
  "output": {
    "id": "cust_001",
    "name": "Acme Corp",
    "email": "billing@acme.com",
    "plan": "enterprise"
  }
}
```

### Write tool (requires approval)

```bash
curl -X POST http://localhost:3000/agent/tools/send_email \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"to":"john@example.com","subject":"Hello","body":"Test message"}'
```

Response:
```json
{
  "status": "pending_approval",
  "approvalId": "appr_abc123",
  "approvalUrl": "http://localhost:3000/agent/approvals/ui?id=appr_abc123",
  "message": "This action requires human approval before it can be executed."
}
```

Open the `approvalUrl` in a browser, review the details, and click **Approve** or **Deny**.

### List all tools (for Claude Desktop)

```bash
curl http://localhost:3000/agent/tools
```

### MCP endpoint (for Claude Desktop)

```bash
curl -X POST http://localhost:3000/agent/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Connecting Claude Desktop

Update `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "agentkit-example": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/agent-kit/examples/basic-express",
      "env": {
        "AGENT_API_KEY": "agent_key_123",
        "PORT": "3000"
      }
    }
  }
}
```

Restart Claude Desktop — you'll see `get_customer`, `create_invoice`, and `send_email` available as tools.

## Approval Flow (Step by Step)

1. Claude calls `send_email` via MCP
2. AgentKit policy engine: "this is a write tool → require approval"
3. Claude receives: `{ status: "pending_approval", approvalUrl: "..." }`
4. You open the approval URL in a browser
5. Review: tool name, agent ID, input parameters
6. Click **Approve** → tool executes → result returned to Claude
7. Or click **Deny** → agent receives a denied status

All tool calls (approved or denied) are logged in `agentkit.db` (SQLite).
