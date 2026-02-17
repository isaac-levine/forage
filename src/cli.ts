#!/usr/bin/env node

import { parseArgs } from "node:util";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { forage_search } from "./tools/search.js";
import { forage_status } from "./tools/status.js";
import { listTools } from "./persistence/manifest.js";

const execAsync = promisify(exec);

const HELP = `
forage — Self-improving tool discovery for AI agents

Usage:
  forage init [--client <name>]    Set up Forage for your AI agent
  forage search <query>            Search for MCP servers
  forage list                      List installed tools
  forage help                      Show this help message

Examples:
  forage init                      Add Forage to Claude Code
  forage init --client cursor      Add Forage to Cursor
  forage search "postgres database"
  forage list
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    console.log(HELP);
    return;
  }

  const command = args[0];

  switch (command) {
    case "init":
      await handleInit(args.slice(1));
      break;
    case "search":
      await handleSearch(args.slice(1));
      break;
    case "list":
      await handleList();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

async function handleInit(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      client: { type: "string", default: "claude-code" },
    },
    allowPositionals: false,
  });

  const client = values.client ?? "claude-code";

  switch (client) {
    case "claude-code": {
      console.log("Adding Forage to Claude Code...");
      try {
        await execAsync("claude mcp add forage -- npx -y forage-mcp");
        console.log("Done! Forage has been added to Claude Code.");
        console.log("Start a new Claude Code session to use it.");
      } catch {
        console.log("Could not run `claude mcp add` automatically.");
        console.log("Run this command manually:");
        console.log("");
        console.log("  claude mcp add forage -- npx -y forage-mcp");
      }
      break;
    }

    case "cursor": {
      console.log("Adding Forage to Cursor...");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      const mcpConfigPath = path.join(
        process.cwd(),
        ".cursor",
        "mcp.json"
      );

      let config: Record<string, unknown> = {};
      try {
        const existing = await fs.readFile(mcpConfigPath, "utf-8");
        config = JSON.parse(existing);
      } catch {
        // No existing config
      }

      const mcpServers =
        (config.mcpServers as Record<string, unknown>) ?? {};
      mcpServers.forage = {
        command: "npx",
        args: ["-y", "forage-mcp"],
      };
      config.mcpServers = mcpServers;

      await fs.mkdir(path.dirname(mcpConfigPath), { recursive: true });
      await fs.writeFile(
        mcpConfigPath,
        JSON.stringify(config, null, 2),
        "utf-8"
      );

      console.log(`Written to ${mcpConfigPath}`);
      console.log("Restart Cursor to use Forage.");
      break;
    }

    default:
      console.error(`Unsupported client: ${client}`);
      console.log("Supported clients: claude-code, cursor");
      process.exit(1);
  }
}

async function handleSearch(args: string[]): Promise<void> {
  const query = args.join(" ");
  if (!query) {
    console.error("Usage: forage search <query>");
    process.exit(1);
  }

  console.log(`Searching for "${query}"...\n`);

  const { results } = await forage_search({ query });

  if (results.length === 0) {
    console.log("No results found.");
    return;
  }

  for (const result of results) {
    const badge =
      result.source === "official-registry"
        ? "[official]"
        : result.source === "smithery"
          ? "[smithery]"
          : "[npm]";

    console.log(`  ${badge} ${result.packageName}`);
    console.log(`    ${result.description}`);
    if (result.url) console.log(`    ${result.url}`);
    console.log("");
  }
}

async function handleList(): Promise<void> {
  const tools = await listTools();

  if (tools.length === 0) {
    console.log("No tools installed via Forage.");
    return;
  }

  console.log("Installed tools:\n");
  for (const tool of tools) {
    console.log(`  ${tool.name}`);
    console.log(`    Package: ${tool.packageName}`);
    console.log(`    Installed: ${tool.installedAt}`);
    console.log(`    Auto-start: ${tool.autoStart}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
