# github-express — AgentKit GitHub Integration Example

A ready-to-run Express app demonstrating the `@agentkit/github` integration. Exposes 8 GitHub tools for issue management, pull requests, and Actions — with PAT (Personal Access Token) auth scoped to a single repository.

## Tools

| Tool | Operation | Approval |
|---|---|---|
| `search_issues` | Search issues/PRs | ❌ Not required |
| `get_issue` | Get issue by number | ❌ Not required |
| `list_pull_requests` | List PRs (filter by state) | ❌ Not required |
| `get_pull_request` | Get PR by number | ❌ Not required |
| `get_actions_status` | List recent workflow runs | ❌ Not required |
| `create_issue` | Open a new issue | ✅ Required |
| `comment_issue` | Comment on issue/PR | ✅ Required |
| `create_pull_request` | Open a new PR | ✅ Required |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8
- A GitHub Personal Access Token with `repo` scope

### 1. Install dependencies (from repo root)

```bash
cd /path/to/agent-kit
pnpm install
pnpm build
```

### 2. Configure environment

```bash
cd examples/github-express
cp .env.example .env
```

Edit `.env`:

```env
GITHUB_TOKEN=ghp_your_token_here    # GitHub PAT with repo scope
GITHUB_REPO=owner/repo              # Target repository
AGENT_API_KEY=agent_key_123         # API key for this server
PORT=3000
BASE_URL=http://localhost:3000
```

**Creating a GitHub PAT:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Select scope: `repo` (for private repos) or `public_repo` (for public repos only)
4. Copy the token and paste it in `.env`

### 3. Run the app

```bash
pnpm dev
```

The server starts on `http://localhost:3000` and prints curl examples for every tool.

---

## Manual Testing

### Read tools (no approval needed)

#### Search issues

```bash
curl -X POST http://localhost:3000/agent/tools/search_issues \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"query": "is:open label:bug"}'
```

#### Get a specific issue

```bash
curl -X POST http://localhost:3000/agent/tools/get_issue \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"issue_number": 1}'
```

#### List open pull requests

```bash
curl -X POST http://localhost:3000/agent/tools/list_pull_requests \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"state": "open"}'
```

#### Get a specific pull request

```bash
curl -X POST http://localhost:3000/agent/tools/get_pull_request \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"pull_number": 1}'
```

#### Check GitHub Actions status

```bash
curl -X POST http://localhost:3000/agent/tools/get_actions_status \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"per_page": 5}'
```

All read tools return `{ "status": "completed", "output": { ... } }` immediately.

---

### Write tools (require human approval)

#### Step 1 — Trigger a write tool

```bash
curl -X POST http://localhost:3000/agent/tools/create_issue \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test issue created by AgentKit",
    "body": "This issue was created via the AgentKit GitHub integration.",
    "labels": ["test"]
  }'
```

Response:

```json
{
  "status": "pending_approval",
  "approvalId": "appr_xxxxxxxx",
  "approvalUrl": "http://localhost:3000/agent/approvals/ui?id=appr_xxxxxxxx",
  "message": "This action requires human approval before it can be executed."
}
```

#### Step 2 — Open the approval URL

Open `approvalUrl` in your browser. You'll see the tool name, agent identity, and exact parameters.

#### Step 3 — Approve or deny

Click **✓ Approve** — the issue is created on GitHub and the result is shown.  
Click **✗ Deny** — the action is cancelled and nothing is written to GitHub.

---

### Comment on an issue

```bash
curl -X POST http://localhost:3000/agent/tools/comment_issue \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{"issue_number": 1, "body": "Hello from AgentKit!"}'
```

### Open a pull request

```bash
curl -X POST http://localhost:3000/agent/tools/create_pull_request \
  -H "Authorization: Bearer agent_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "feat: add new feature",
    "head": "feature-branch",
    "base": "main",
    "body": "This PR adds a new feature."
  }'
```

---

## Connecting Claude Desktop

Update `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "agentkit-github": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/agent-kit/examples/github-express",
      "env": {
        "GITHUB_TOKEN": "ghp_your_token",
        "GITHUB_REPO": "owner/repo",
        "AGENT_API_KEY": "agent_key_123",
        "PORT": "3000"
      }
    }
  }
}
```

Restart Claude Desktop — all 8 GitHub tools will appear. Claude will ask for approval before executing any write operations.

## List all available tools

```bash
curl http://localhost:3000/agent/tools
```

## MCP endpoint (for Claude Desktop)

```bash
curl -X POST http://localhost:3000/agent/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Approval Flow (Step by Step)

1. Claude calls `create_issue` via MCP
2. AgentKit policy engine: `policyOverride: "require_approval"` → requires approval
3. Claude receives `{ status: "pending_approval", approvalUrl: "..." }`
4. You open the approval URL in a browser
5. Review: tool name (`create_issue`), agent identity, exact input parameters
6. Click **Approve** → issue is created on GitHub → result returned to Claude
7. Or click **Deny** → Claude receives a denied status, nothing written to GitHub

All tool calls are logged in `agentkit.db` (SQLite, created automatically).
