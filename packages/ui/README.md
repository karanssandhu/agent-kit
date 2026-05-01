# @agentkit/ui

Embeddable approval UI for AgentKit. Generates a self-contained HTML page (vanilla JS, zero runtime dependencies) for reviewing and approving agent actions.

## Usage

```ts
import { buildApprovalUiHtml } from "@agentkit/ui";

// In an Express route:
app.get("/agent/approvals/ui", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(buildApprovalUiHtml({ baseUrl: "http://localhost:3000" }));
});
```

The UI:
1. Reads `?id=<approvalId>` from the URL
2. Loads the approval details from the REST API
3. Shows tool name, agent ID, and input JSON
4. Lets a human approve (with optional reason) or deny
5. On approval, automatically executes the tool and shows the output

## API

### `buildApprovalUiHtml(opts)`

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `string` | — | Base URL where the agent router is mounted |
| `apiKey` | `string` | `"agent_key_123"` | API key used for browser requests |
| `title` | `string` | `"AgentKit — Approve Action"` | HTML page title |
