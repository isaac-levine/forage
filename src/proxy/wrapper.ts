import type { ManagedServer } from "./manager.js";
import { getRunningServers } from "./manager.js";

export interface WrappedTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
  originalName: string;
}

/**
 * Get all tools from all running proxied servers, namespaced to avoid collisions.
 * Tool names are prefixed with the server name: "server-postgres__query" -> "foraged__server-postgres__query"
 */
export function getWrappedTools(): WrappedTool[] {
  const tools: WrappedTool[] = [];

  for (const [serverName, server] of getRunningServers()) {
    for (const tool of server.tools) {
      tools.push({
        name: `foraged__${sanitizeName(serverName)}__${tool.name}`,
        description: `[via ${serverName}] ${tool.description ?? ""}`.trim(),
        inputSchema: tool.inputSchema,
        serverName,
        originalName: tool.name,
      });
    }
  }

  return tools;
}

/**
 * Parse a wrapped tool name back to server name + original tool name.
 */
export function parseWrappedToolName(
  name: string
): { serverName: string; toolName: string } | null {
  if (!name.startsWith("foraged__")) return null;
  const parts = name.slice("foraged__".length).split("__");
  if (parts.length < 2) return null;
  const serverName = parts[0];
  const toolName = parts.slice(1).join("__");
  return { serverName, toolName };
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}
