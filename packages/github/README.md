# @agentkit/github

GitHub integration for AgentKit. Provides tools for issues, pull requests, and Actions — with PAT (Personal Access Token) auth scoped to a single repository.

## Installation

```bash
pnpm add @agentkit/github @agentkit/core @agentkit/express
```

## Tools

### Read tools (no approval required)

| Tool | Description |
|---|---|
| `search_issues` | Search issues and PRs using GitHub search syntax |
| `get_issue` | Get a single issue by number |
| `list_pull_requests` | List PRs (filter by state) |
| `get_pull_request` | Get a single PR by number |
| `get_actions_status` | List recent workflow runs |

### Write tools (require approval by default)

| Tool | Description |
|---|---|
| `create_issue` | Open a new issue |
| `comment_issue` | Post a comment on an issue or PR |
| `create_pull_request` | Open a new pull request |

All write tools have `policyOverride: "require_approval"` — an agent must receive human approval before any write executes.

## Usage

```ts
import { createGitHubTools } from "@agentkit/github";
import { createAgentRouter } from "@agentkit/express";

const github = createGitHubTools({
  token: process.env.GITHUB_TOKEN!,  // GitHub PAT
  repo: process.env.GITHUB_REPO!,   // "owner/repo"
});

// Mount all tools on an Express router
app.use("/agent", createAgentRouter({ tools: github.all }));
```

### Individual tools

```ts
const { searchIssues, getIssue, createIssue } = createGitHubTools({ token, repo });
```

### GitHub Enterprise

Pass `baseUrl` to point at a GitHub Enterprise instance:

```ts
const github = createGitHubTools({
  token: process.env.GITHUB_TOKEN!,
  repo: "my-org/my-repo",
  baseUrl: "https://github.example.com/api/v3",
});
```

## API

### `createGitHubTools(options)`

| Option | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | ✅ | GitHub Personal Access Token |
| `repo` | `string` | ✅ | Repository in `"owner/repo"` format |
| `baseUrl` | `string` | ❌ | GitHub API base URL (default: `https://api.github.com`) |

Returns a `GitHubTools` object with individual named tools and an `all` array.

## Required PAT scopes

For read tools: `repo` (or `public_repo` for public repos)  
For write tools: `repo` (full)

## Example app

See [`examples/github-express`](../../examples/github-express) for a complete working example.
