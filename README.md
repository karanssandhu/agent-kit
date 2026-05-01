# AgentKit — Agent Integration Library

A drop-in TypeScript library that adds agent-safe tool surfaces (MCP/OpenAPI), auth, policy/approval workflows, and audit logging to any Express application.

## Overview

AgentKit lets you register server-side functions as **agent tools** in minutes:

```ts
import { defineTool } from "@agentkit/core";
import { createAgentRouter } from "@agentkit/express";
import express from "express";

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
  handler: async (_ctx, input) => {
    return { id: input.id, name: "Jane Doe" };
  },
});

app.use("/agent", createAgentRouter({ tools: [getCustomer] }));
app.listen(3000);
```

Now any AI agent (Claude, GPT-4, etc.) can call `get_customer` through your `/agent` endpoint with consistent schemas, auth, and audit logging.

## Packages

| Package | Description |
|---|---|
| [`@agentkit/core`](./packages/core) | Tool definitions, JSON Schema validation, auth interfaces, policy engine |
| [`@agentkit/express`](./packages/express) | Express middleware, MCP server, SQLite audit log, approval workflow |
| [`@agentkit/github`](./packages/github) | GitHub integration: issues, PRs, Actions — PAT auth, single-repo scope |
| [`@agentkit/ui`](./packages/ui) | Embeddable approval UI (vanilla JS, zero dependencies) |
| [`agentkit-cli`](./packages/cli) | CLI: scaffold new apps, run dev server |

## Quick Start

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8

```bash
npm install -g pnpm
```

### 1. Clone and install

```bash
git clone https://github.com/karanssandhu/agent-kit.git
cd agent-kit
pnpm install
```

### 2. Build all packages

```bash
pnpm build
```

### 3. Run the example app

```bash
cd examples/basic-express
cp .env.example .env
pnpm dev
```

This starts:
- Express + MCP server on `http://localhost:3000`

### GitHub integration example

```bash
cd examples/github-express
cp .env.example .env
# Set GITHUB_TOKEN and GITHUB_REPO in .env
pnpm dev
```

See [`examples/github-express/README.md`](./examples/github-express/README.md) for full setup instructions.

### 4. Test a read tool (no approval needed)

```bash
curl -X POST http://localhost:3000/agent/tools/get_customer \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"id": "cust_001"}'
```

### 5. Test a write tool (requires approval)

```bash
curl -X POST http://localhost:3000/agent/tools/send_email \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"to":"john@example.com","subject":"Hello","body":"Test"}'
```

Response:
```json
{
  "status": "pending_approval",
  "approvalId": "appr_abc123",
  "approvalUrl": "http://localhost:3000/agent/approvals/ui?id=appr_abc123"
}
```

Open the approval URL in your browser to approve or deny the action.

### 6. Connect Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "agentkit": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/agent-kit/examples/basic-express",
      "env": { "AGENT_API_KEY": "agent_key_123" }
    }
  }
}
```

Restart Claude Desktop — you'll see the 3 sample tools available.

## Architecture

```
AI Agent (Claude/GPT)
       │
       ▼ MCP / HTTP
┌──────────────────────────┐
│    Express App           │
│  ┌───────────────────┐   │
│  │ createAgentRouter │   │
│  │  ┌─────────────┐  │   │
│  │  │  Auth Check │  │   │
│  │  │  Policy Eng.│  │   │
│  │  │  Tool Exec  │  │   │
│  │  │  Audit Log  │  │   │
│  │  └─────────────┘  │   │
│  └───────────────────┘   │
└──────────────────────────┘
       │
       ▼ Approval needed?
┌─────────────────┐
│  Approval UI    │  ← Human reviews & approves
└─────────────────┘
```

## Key Features

- **Tool Registry** — Define tools with JSON Schema input/output validation
- **Policy Engine** — Read tools auto-approved, write tools require human approval
- **Approval Workflow** — Pending approvals stored in SQLite, served via embedded UI
- **Audit Log** — Every tool call recorded (agent, inputs, output, result, timestamp)
- **MCP Server** — Expose tools as an MCP server for Claude Desktop
- **Auth Middleware** — API key verification with agent identity mapping

## Development

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run example in watch mode
cd examples/basic-express && pnpm dev
```

## License

MIT
