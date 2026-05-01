#!/usr/bin/env node
// agentkit-cli — entry point

import { Command } from "commander";
import { scaffold } from "./scaffold.js";
import { runDev } from "./dev.js";

const program = new Command();

program
  .name("agentkit")
  .description("CLI for AgentKit — scaffold and run agent-native Express apps")
  .version("0.1.0");

program
  .command("scaffold <name>")
  .description("Create a new AgentKit Express app")
  .option("-o, --output <dir>", "Output directory (default: ./<name>)")
  .action((name: string, opts: { output?: string }) => {
    scaffold({ name, outputDir: opts.output });
  });

program
  .command("dev")
  .description("Start the dev server for an AgentKit app")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .action((opts: { port: string }) => {
    runDev({ port: parseInt(opts.port, 10) });
  });

program.parse(process.argv);
