// Basic Express example — AgentKit integration
// Demonstrates tool registration, auth, policy, and the approval workflow.

import express from "express";
import { createAgentRouter } from "@agentkit/express";
import { getCustomer, createInvoice, sendEmail } from "./tools.js";

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const AGENT_API_KEY = process.env.AGENT_API_KEY ?? "agent_key_123";

// Mount the agent router at /agent
app.use(
  "/agent",
  createAgentRouter({
    tools: [getCustomer, createInvoice, sendEmail],

    // Auth: map API keys to agent identities
    auth: {
      keys: {
        [AGENT_API_KEY]: {
          agentId: "claude_agent",
          agentName: "Claude",
          roles: ["agent"],
        },
      },
    },

    // Policy: default (get_* → allow, everything else → require_approval)
    // You can customize this, e.g.:
    // policy: {
    //   default: "require_approval",
    //   rules: [
    //     { toolPattern: "get_*", action: "allow" },
    //     { toolPattern: "create_*", action: "require_approval" },
    //   ],
    // },

    baseUrl: BASE_URL,
  })
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 AgentKit basic-express example running\n`);
  console.log(`   Health:    GET  ${BASE_URL}/health`);
  console.log(`   Tools:     GET  ${BASE_URL}/agent/tools`);
  console.log(`   MCP:       POST ${BASE_URL}/agent/mcp`);
  console.log(`   Approvals: GET  ${BASE_URL}/agent/approvals/ui`);
  console.log(`\n   API key: set in AGENT_API_KEY env var`);
  console.log(`\nTry it:\n`);
  console.log(`  # Read tool (no approval needed):`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/get_customer \\`);
  console.log(`    -H "Authorization: Bearer $AGENT_API_KEY" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"id":"cust_001"}'\n`);
  console.log(`  # Write tool (requires approval):`);
  console.log(`  curl -X POST ${BASE_URL}/agent/tools/send_email \\`);
  console.log(`    -H "Authorization: Bearer $AGENT_API_KEY" \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"to":"john@example.com","subject":"Hello","body":"Test"}'\n`);
});
