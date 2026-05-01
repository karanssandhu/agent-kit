// GitHub AgentKit example — demonstrates @agentkit/github integration
// Exposes 8 GitHub tools: 5 read (auto-approved) + 3 write (require approval)

import express from "express";
import { createAgentRouter } from "@agentkit/express";
import { createGitHubTools } from "@agentkit/github";

// ── Configuration ──────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const AGENT_API_KEY = process.env.AGENT_API_KEY ?? "agent_key_123";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

if (!GITHUB_TOKEN) {
  console.error("❌  GITHUB_TOKEN environment variable is required.");
  console.error("    Copy .env.example to .env and set your GitHub PAT.");
  process.exit(1);
}
if (!GITHUB_REPO) {
  console.error("❌  GITHUB_REPO environment variable is required (e.g. owner/repo).");
  process.exit(1);
}

// ── Build GitHub tools ─────────────────────────────────────────────────────────

const github = createGitHubTools({
  token: GITHUB_TOKEN,
  repo: GITHUB_REPO,
});

// ── Express app ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Mount the agent router with all 8 GitHub tools
app.use(
  "/agent",
  createAgentRouter({
    tools: github.all,

    // Auth: map API key → agent identity
    auth: {
      keys: {
        [AGENT_API_KEY]: {
          agentId: "github_agent",
          agentName: "GitHub Agent",
          roles: ["agent"],
        },
      },
    },

    baseUrl: BASE_URL,
  })
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", repo: GITHUB_REPO, version: "0.1.0" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AgentKit github-express example running\n`);
  console.log(`   Repo:      ${GITHUB_REPO}`);
  console.log(`   Health:    GET  ${BASE_URL}/health`);
  console.log(`   Tools:     GET  ${BASE_URL}/agent/tools`);
  console.log(`   MCP:       POST ${BASE_URL}/agent/mcp`);
  console.log(`   Approvals: GET  ${BASE_URL}/agent/approvals/ui`);
  console.log(`\n   API key:   ${AGENT_API_KEY}`);
  console.log(`\n── Read tools (no approval) ─────────────────────────────────────`);
  console.log(`\n  # Search issues:`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/search_issues \\`);
  console.log(`    -H "Authorization: Bearer ${AGENT_API_KEY}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"query":"is:open label:bug"}'\n`);
  console.log(`  # Get a specific issue:`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/get_issue \\`);
  console.log(`    -H "Authorization: Bearer ${AGENT_API_KEY}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"issue_number":1}'\n`);
  console.log(`  # List open PRs:`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/list_pull_requests \\`);
  console.log(`    -H "Authorization: Bearer ${AGENT_API_KEY}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"state":"open"}'\n`);
  console.log(`  # Check Actions status:`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/get_actions_status \\`);
  console.log(`    -H "Authorization: Bearer ${AGENT_API_KEY}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{}'\n`);
  console.log(`── Write tools (require approval) ───────────────────────────────`);
  console.log(`\n  # Create an issue (will need approval):`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/create_issue \\`);
  console.log(`    -H "Authorization: Bearer ${AGENT_API_KEY}" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"title":"Test issue","body":"Created by AgentKit"}'\n`);
  console.log(`  Then open the approvalUrl in a browser to approve/deny.\n`);
});
