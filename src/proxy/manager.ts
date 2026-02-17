import { type ChildProcess } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { InstalledTool } from "../persistence/manifest.js";

export interface ManagedServer {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  tools: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>;
}

const servers = new Map<string, ManagedServer>();

export async function startServer(tool: InstalledTool): Promise<ManagedServer> {
  // If already running, return existing
  const existing = servers.get(tool.name);
  if (existing) {
    return existing;
  }

  const transport = new StdioClientTransport({
    command: tool.command,
    args: tool.args,
    env: tool.env
      ? { ...filterEnv(process.env), ...tool.env }
      : filterEnv(process.env),
  });

  const client = new Client(
    { name: `forage-proxy-${tool.name}`, version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  // Discover the child server's tools
  const toolsList = await client.listTools();
  const tools = (toolsList.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as Record<string, unknown>,
  }));

  const managed: ManagedServer = {
    name: tool.name,
    client,
    transport,
    tools,
  };

  servers.set(tool.name, managed);
  return managed;
}

export async function stopServer(name: string): Promise<boolean> {
  const server = servers.get(name);
  if (!server) return false;

  try {
    await server.client.close();
  } catch {
    // Ignore close errors — transport cleanup handles it
  }

  servers.delete(name);
  return true;
}

export async function callTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const server = servers.get(serverName);
  if (!server) {
    throw new Error(`Server "${serverName}" is not running`);
  }

  const result = await server.client.callTool({
    name: toolName,
    arguments: args,
  });

  return result;
}

export function getRunningServers(): Map<string, ManagedServer> {
  return servers;
}

export function getServer(name: string): ManagedServer | undefined {
  return servers.get(name);
}

export async function stopAll(): Promise<void> {
  const names = [...servers.keys()];
  await Promise.all(names.map((name) => stopServer(name)));
}

function filterEnv(
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}
