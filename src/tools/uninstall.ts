import { stopServer } from "../proxy/manager.js";
import { removeTool, getTool } from "../persistence/manifest.js";
import { removeRules } from "../rules/writer.js";
import { appendLog } from "../persistence/log.js";

export interface UninstallInput {
  name: string;
  confirm?: boolean;
}

export interface UninstallResult {
  success: boolean;
  message: string;
  cleanedFiles: string[];
}

export async function forage_uninstall(
  input: UninstallInput
): Promise<UninstallResult> {
  if (!input.confirm) {
    const tool = await getTool(input.name);
    if (!tool) {
      return {
        success: false,
        message: `Tool "${input.name}" is not installed.`,
        cleanedFiles: [],
      };
    }
    return {
      success: false,
      message: `⚠️  Uninstall requires confirmation. Call forage_uninstall again with confirm: true to remove "${input.name}" (${tool.packageName}).`,
      cleanedFiles: [],
    };
  }

  try {
    // Stop the running server
    await stopServer(input.name);

    // Remove from manifest
    const tool = await removeTool(input.name);
    if (!tool) {
      return {
        success: false,
        message: `Tool "${input.name}" is not installed.`,
        cleanedFiles: [],
      };
    }

    // Clean up rules from agent files
    const cleanedFiles = await removeRules(input.name);

    await appendLog({
      timestamp: new Date().toISOString(),
      action: "uninstall",
      packageName: tool.packageName,
      success: true,
    });

    return {
      success: true,
      message: `Uninstalled "${input.name}" (${tool.packageName}). Stopped server and cleaned up rules.`,
      cleanedFiles,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to uninstall: ${error instanceof Error ? error.message : String(error)}`,
      cleanedFiles: [],
    };
  }
}
