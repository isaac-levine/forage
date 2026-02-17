import { exec } from "node:child_process";
import { promisify } from "node:util";
import { startServer } from "../proxy/manager.js";
import { addTool, type InstalledTool } from "../persistence/manifest.js";
import { appendLog } from "../persistence/log.js";

const execAsync = promisify(exec);

export interface InstallInput {
  packageName: string;
  command?: string; // defaults to "npx"
  args?: string[]; // defaults to ["-y", packageName]
  env?: Record<string, string>;
  confirm?: boolean; // must be true to proceed
}

export interface InstallResult {
  success: boolean;
  name: string;
  tools: Array<{ name: string; description?: string }>;
  message: string;
}

export async function forage_install(
  input: InstallInput
): Promise<InstallResult> {
  if (!input.confirm) {
    return {
      success: false,
      name: input.packageName,
      tools: [],
      message: `⚠️  Install requires confirmation. Call forage_install again with confirm: true to install "${input.packageName}". The user will be prompted to approve.`,
    };
  }

  const command = input.command ?? "npx";
  const args = input.args ?? ["-y", input.packageName];

  // Verify the package exists on npm before installing
  try {
    const { stdout } = await execAsync(
      `npm view ${input.packageName} name version --json`,
      { timeout: 15000 }
    );
    JSON.parse(stdout); // validates it's real
  } catch {
    await appendLog({
      timestamp: new Date().toISOString(),
      action: "install",
      packageName: input.packageName,
      success: false,
      error: "Package not found on npm",
    });
    return {
      success: false,
      name: input.packageName,
      tools: [],
      message: `Package "${input.packageName}" not found on npm.`,
    };
  }

  // Create the tool record
  const tool: InstalledTool = {
    name: input.packageName.replace(/^@/, "").replace(/\//g, "__"),
    packageName: input.packageName,
    version: "latest",
    source: "npm",
    command,
    args,
    env: input.env,
    autoStart: true,
    installedAt: new Date().toISOString(),
  };

  try {
    // Start the server as a child process
    const managed = await startServer(tool);

    // Save to manifest
    await addTool(tool);

    // Log the install
    await appendLog({
      timestamp: new Date().toISOString(),
      action: "install",
      packageName: input.packageName,
      version: tool.version,
      source: tool.source,
      success: true,
    });

    return {
      success: true,
      name: tool.name,
      tools: managed.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      message: `Installed and started "${input.packageName}". ${managed.tools.length} tools now available. Use forage_learn to save usage instructions for future sessions.`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await appendLog({
      timestamp: new Date().toISOString(),
      action: "install",
      packageName: input.packageName,
      success: false,
      error: errorMsg,
    });

    return {
      success: false,
      name: input.packageName,
      tools: [],
      message: `Failed to start "${input.packageName}": ${errorMsg}`,
    };
  }
}
