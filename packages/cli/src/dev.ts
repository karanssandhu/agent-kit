// agentkit dev — run the dev server for an AgentKit app

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export interface DevOptions {
  port?: number;
  watch?: boolean;
}

export function runDev(opts: DevOptions = {}): void {
  const port = opts.port ?? 3000;
  const cwd = process.cwd();

  // Look for an entry point
  const candidates = ["src/index.ts", "index.ts", "src/server.ts", "server.ts"];
  const entry = candidates.find((c) => fs.existsSync(path.join(cwd, c)));

  if (!entry) {
    console.error("❌ Could not find an entry point. Expected one of:");
    candidates.forEach((c) => console.error(`   ${c}`));
    process.exit(1);
  }

  console.log(`\n🚀 Starting dev server on port ${port}`);
  console.log(`   Entry: ${entry}\n`);

  process.env.PORT = String(port);

  try {
    execSync(`npx ts-node ${entry}`, { stdio: "inherit", env: process.env });
  } catch {
    // ts-node not available; try node with dist/
    const distEntry = entry.replace(/^src\//, "dist/").replace(/\.ts$/, ".js");
    if (fs.existsSync(path.join(cwd, distEntry))) {
      execSync(`node ${distEntry}`, { stdio: "inherit", env: process.env });
    } else {
      console.error("❌ Could not start dev server. Run `npm run build` first or install ts-node.");
      process.exit(1);
    }
  }
}
