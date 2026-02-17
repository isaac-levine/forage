#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { forage_search } from "./tools/search.js";
import { forage_evaluate } from "./tools/evaluate.js";
import { forage_install } from "./tools/install.js";
import { forage_learn } from "./tools/learn.js";
import { forage_status } from "./tools/status.js";
import { forage_uninstall } from "./tools/uninstall.js";
import { callTool, startServer, stopAll, getRunningServers } from "./proxy/manager.js";
import { listTools } from "./persistence/manifest.js";

type RegisteredTool = ReturnType<typeof server.tool>;

const server = new McpServer(
  {
    name: "forage",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: { listChanged: true },
    },
  }
);

// Track dynamically registered proxied tools so we can remove them
const proxiedToolHandles = new Map<string, RegisteredTool[]>();

// ── forage_search ──────────────────────────────────────────────
server.tool(
  "forage_search",
  "Search for MCP servers and tools across registries (Official MCP Registry, Smithery, npm). Describe what capability you need and get ranked results.",
  {
    query: z.string().describe("Natural language description of the capability you need (e.g. 'query postgres database', 'search slack messages', 'manage github issues')"),
    sources: z
      .array(z.enum(["official-registry", "npm", "smithery"]))
      .optional()
      .describe("Which registries to search. Defaults to all."),
  },
  async ({ query, sources }) => {
    const result = await forage_search({ query, sources });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── forage_evaluate ────────────────────────────────────────────
server.tool(
  "forage_evaluate",
  "Get detailed information about a specific package — version, downloads, README summary, install command. Use this before installing to verify quality.",
  {
    packageName: z.string().describe("npm package name to evaluate (e.g. '@modelcontextprotocol/server-postgres')"),
  },
  async ({ packageName }) => {
    const result = await forage_evaluate({ packageName });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── forage_install ─────────────────────────────────────────────
server.tool(
  "forage_install",
  "Install an MCP server and start it as a proxied subprocess. The server's tools become available immediately via Forage — no restart needed. IMPORTANT: Set confirm=true to proceed with installation (user will be prompted to approve the tool call).",
  {
    packageName: z.string().describe("npm package name to install (e.g. '@modelcontextprotocol/server-filesystem')"),
    command: z.string().optional().describe("Command to run the server. Defaults to 'npx'."),
    args: z.array(z.string()).optional().describe("Arguments for the command. Defaults to ['-y', packageName]."),
    env: z.record(z.string(), z.string()).optional().describe("Environment variables to pass to the server process."),
    confirm: z.boolean().describe("Must be true to proceed with installation. This is a safety gate — the user will see and approve the tool call."),
  },
  async ({ packageName, command, args, env, confirm }) => {
    const result = await forage_install({ packageName, command, args, env, confirm });

    // If installation was successful, register proxied tools and notify
    if (result.success) {
      registerProxiedTools(result.name);
      server.sendToolListChanged();
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── forage_learn ───────────────────────────────────────────────
server.tool(
  "forage_learn",
  "Write usage instructions for an installed tool to agent rule files (CLAUDE.md, AGENTS.md, .cursor/rules/). This persists knowledge across sessions so the agent remembers how to use the tool next time.",
  {
    toolName: z.string().describe("Name of the tool (as shown in forage_status)"),
    rules: z.string().describe("Markdown-formatted usage instructions for the agent. Include: when to use the tool, key commands/patterns, any required env vars or config."),
    target: z.string().optional().describe("Specific file path to write to. If omitted, auto-detects based on which agent is in use."),
  },
  async ({ toolName, rules, target }) => {
    const result = await forage_learn({ toolName, rules, target });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── forage_status ──────────────────────────────────────────────
server.tool(
  "forage_status",
  "List all tools that Forage has installed and is currently proxying. Shows which servers are running, what tools they provide, and their install status.",
  {},
  async () => {
    const result = await forage_status();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── forage_uninstall ───────────────────────────────────────────
server.tool(
  "forage_uninstall",
  "Remove a previously installed tool. Stops the server, removes from manifest, and cleans up agent rules. Set confirm=true to proceed.",
  {
    name: z.string().describe("Name of the installed tool to remove (as shown in forage_status)"),
    confirm: z.boolean().optional().describe("Must be true to proceed with uninstallation."),
  },
  async ({ name, confirm }) => {
    const result = await forage_uninstall({ name, confirm });

    if (result.success) {
      unregisterProxiedTools(name);
      server.sendToolListChanged();
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ── Dynamic tool registration for proxied servers ──────────────

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function registerProxiedTools(serverName: string): void {
  const servers = getRunningServers();
  const managed = servers.get(serverName);
  if (!managed) return;

  const handles: RegisteredTool[] = [];

  for (const tool of managed.tools) {
    const wrappedName = `foraged__${sanitizeName(serverName)}__${tool.name}`;
    const description = `[via ${serverName}] ${tool.description ?? ""}`.trim();

    // Register a dynamic tool that proxies to the child server
    const handle = server.tool(
      wrappedName,
      description,
      {}, // Accept any args — the child server validates
      async (args: Record<string, unknown>) => {
        const result = await callTool(serverName, tool.name, args);
        // The result from callTool is already in MCP format
        return result as { content: Array<{ type: "text"; text: string }> };
      }
    );

    handles.push(handle);
  }

  proxiedToolHandles.set(serverName, handles);
}

function unregisterProxiedTools(serverName: string): void {
  const handles = proxiedToolHandles.get(serverName);
  if (!handles) return;

  for (const handle of handles) {
    handle.remove();
  }

  proxiedToolHandles.delete(serverName);
}

// ── Startup ────────────────────────────────────────────────────
async function autoStartFromManifest(): Promise<void> {
  const tools = await listTools();
  const autoStartTools = tools.filter((t) => t.autoStart);

  if (autoStartTools.length > 0) {
    process.stderr.write(
      `[forage] Auto-starting ${autoStartTools.length} tool(s) from manifest...\n`
    );
  }

  for (const tool of autoStartTools) {
    try {
      const managed = await startServer(tool);
      registerProxiedTools(tool.name);
      process.stderr.write(
        `[forage] Started ${tool.name} (${managed.tools.length} tools)\n`
      );
    } catch (error) {
      process.stderr.write(
        `[forage] Failed to start ${tool.name}: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }
}

async function main(): Promise<void> {
  // Auto-start previously installed tools
  await autoStartFromManifest();

  // Connect to the MCP transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("[forage] MCP server running on stdio\n");

  // Clean up on exit
  process.on("SIGINT", async () => {
    await stopAll();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await stopAll();
    process.exit(0);
  });
}

main().catch((error) => {
  process.stderr.write(`[forage] Fatal error: ${error}\n`);
  process.exit(1);
});
