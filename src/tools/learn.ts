import { writeRules, type LearnInput } from "../rules/writer.js";
import { readManifest, writeManifest } from "../persistence/manifest.js";

export interface LearnToolInput {
  toolName: string;
  rules: string;
  target?: string;
}

export interface LearnResult {
  success: boolean;
  updatedFiles: string[];
  message: string;
}

export async function forage_learn(input: LearnToolInput): Promise<LearnResult> {
  try {
    const updatedFiles = await writeRules({
      toolName: input.toolName,
      rules: input.rules,
      target: input.target,
    });

    // Also persist rules in manifest for cross-session recall
    const manifest = await readManifest();
    const tool = manifest.tools[input.toolName];
    if (tool) {
      tool.rules = input.rules;
      await writeManifest(manifest);
    }

    return {
      success: true,
      updatedFiles,
      message: `Updated ${updatedFiles.length} file(s) with usage instructions for "${input.toolName}": ${updatedFiles.join(", ")}`,
    };
  } catch (error) {
    return {
      success: false,
      updatedFiles: [],
      message: `Failed to write rules: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
