// agentkit scaffold — create a new AgentKit Express app from a template

import fs from "fs";
import path from "path";

export interface ScaffoldOptions {
  name: string;
  outputDir?: string;
}

const APP_TEMPLATE = {
  "package.json": (name: string) =>
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        private: true,
        scripts: {
          build: "tsc",
          dev: "ts-node src/index.ts",
          start: "node dist/index.js",
        },
        dependencies: {
          "@agentkit/core": "^0.1.0",
          "@agentkit/express": "^0.1.0",
          express: "^4.19.2",
        },
        devDependencies: {
          "@types/express": "^4.17.21",
          "@types/node": "^20.12.7",
          "ts-node": "^10.9.2",
          typescript: "^5.4.5",
        },
      },
      null,
      2
    ) + "\n",

  "tsconfig.json": () =>
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "commonjs",
          lib: ["ES2020"],
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src"],
      },
      null,
      2
    ) + "\n",

  ".env.example": () => `AGENT_API_KEY=agent_key_123\nPORT=3000\n`,

  ".gitignore": () => `node_modules/\ndist/\n.env\n*.db\n*.sqlite\n`,

  "src/index.ts": (name: string) => `import express from "express";
import { defineTool } from "@agentkit/core";
import { createAgentRouter } from "@agentkit/express";

const app = express();
app.use(express.json());

// Define your tools here
const helloWorld = defineTool({
  name: "hello_world",
  description: "Say hello to someone",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name to greet" },
    },
    required: ["name"],
  },
  handler: async (_ctx, input) => {
    return { message: \`Hello, \${(input as { name: string }).name}! Welcome to ${name}.\` };
  },
});

// Mount the agent router
app.use(
  "/agent",
  createAgentRouter({
    tools: [helloWorld],
    auth: {
      keys: {
        [process.env.AGENT_API_KEY ?? "agent_key_123"]: {
          agentId: "my_agent",
          agentName: "My Agent",
        },
      },
    },
  })
);

const port = parseInt(process.env.PORT ?? "3000", 10);
app.listen(port, () => {
  console.log(\`🚀 ${name} running on http://localhost:\${port}\`);
  console.log(\`   Tools:     GET  http://localhost:\${port}/agent/tools\`);
  console.log(\`   MCP:       POST http://localhost:\${port}/agent/mcp\`);
  console.log(\`   Approvals: GET  http://localhost:\${port}/agent/approvals/ui\`);
});
`,

  "README.md": (name: string) => `# ${name}

An AgentKit-powered Express app.

## Getting Started

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## Test a tool

\`\`\`bash
curl -X POST http://localhost:3000/agent/tools/hello_world \\
  -H "Authorization: Bearer agent_key_123" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "World"}'
\`\`\`
`,
};

export function scaffold(opts: ScaffoldOptions): void {
  const dir = opts.outputDir ?? path.join(process.cwd(), opts.name);

  if (fs.existsSync(dir)) {
    throw new Error(`Directory already exists: ${dir}`);
  }

  console.log(`\n🔧 Scaffolding "${opts.name}" in ${dir}\n`);

  fs.mkdirSync(path.join(dir, "src"), { recursive: true });

  for (const [filePath, generator] of Object.entries(APP_TEMPLATE)) {
    const fullPath = path.join(dir, filePath);
    const content = generator(opts.name);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`  ✓ ${filePath}`);
  }

  console.log(`
✅ Done! Next steps:

  cd ${opts.name}
  npm install
  cp .env.example .env
  npm run dev
`);
}
