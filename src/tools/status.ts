import { getRunningServers } from "../proxy/manager.js";
import { listTools } from "../persistence/manifest.js";

export interface StatusResult {
  running: Array<{
    name: string;
    packageName: string;
    tools: Array<{ name: string; description?: string }>;
    installedAt: string;
  }>;
  installed: Array<{
    name: string;
    packageName: string;
    autoStart: boolean;
    installedAt: string;
    running: boolean;
  }>;
}

export async function forage_status(): Promise<StatusResult> {
  const allInstalled = await listTools();
  const runningServers = getRunningServers();

  const running = [...runningServers.entries()].map(([name, server]) => ({
    name,
    packageName:
      allInstalled.find((t) => t.name === name)?.packageName ?? name,
    tools: server.tools.map((t) => ({
      name: t.name,
      description: t.description,
    })),
    installedAt:
      allInstalled.find((t) => t.name === name)?.installedAt ?? "unknown",
  }));

  const installed = allInstalled.map((tool) => ({
    name: tool.name,
    packageName: tool.packageName,
    autoStart: tool.autoStart,
    installedAt: tool.installedAt,
    running: runningServers.has(tool.name),
  }));

  return { running, installed };
}
