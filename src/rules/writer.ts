import fs from "node:fs/promises";
import path from "node:path";
import { detectAgent, type RulesTarget } from "./detector.js";

export interface LearnInput {
  toolName: string;
  rules: string;
  target?: string; // specific file path, or auto-detect
}

export async function writeRules(input: LearnInput): Promise<string[]> {
  let targets: RulesTarget[];

  if (input.target) {
    // User specified a specific target file
    targets = [
      {
        agent: "unknown",
        filePath: input.target,
        sectionHeader: "## Forage: Installed Tools",
      },
    ];
  } else {
    targets = await detectAgent();
    // Default to CLAUDE.md in home dir if nothing detected
    if (targets.length === 0) {
      const os = await import("node:os");
      targets = [
        {
          agent: "claude-code",
          filePath: path.join(os.homedir(), "CLAUDE.md"),
          sectionHeader: "## Forage: Installed Tools",
        },
      ];
    }
  }

  const updatedFiles: string[] = [];

  for (const target of targets) {
    await writeToFile(target, input.toolName, input.rules);
    updatedFiles.push(target.filePath);
  }

  return updatedFiles;
}

export async function removeRules(
  toolName: string,
  target?: string
): Promise<string[]> {
  let targets: RulesTarget[];

  if (target) {
    targets = [
      {
        agent: "unknown",
        filePath: target,
        sectionHeader: "## Forage: Installed Tools",
      },
    ];
  } else {
    targets = await detectAgent();
  }

  const updatedFiles: string[] = [];

  for (const t of targets) {
    const removed = await removeFromFile(t, toolName);
    if (removed) updatedFiles.push(t.filePath);
  }

  return updatedFiles;
}

async function writeToFile(
  target: RulesTarget,
  toolName: string,
  rules: string
): Promise<void> {
  let content = "";
  try {
    content = await fs.readFile(target.filePath, "utf-8");
  } catch {
    // File doesn't exist, we'll create it
  }

  const toolBlock = formatToolBlock(toolName, rules);
  const sectionHeader = target.sectionHeader;

  if (content.includes(sectionHeader)) {
    // Section exists — check if tool already has an entry
    const toolMarkerStart = `<!-- forage:${toolName} -->`;
    const toolMarkerEnd = `<!-- /forage:${toolName} -->`;

    if (content.includes(toolMarkerStart)) {
      // Replace existing entry
      const startIdx = content.indexOf(toolMarkerStart);
      const endIdx = content.indexOf(toolMarkerEnd) + toolMarkerEnd.length;
      content =
        content.slice(0, startIdx) + toolBlock + content.slice(endIdx);
    } else {
      // Append to existing section
      const sectionIdx = content.indexOf(sectionHeader) + sectionHeader.length;
      content =
        content.slice(0, sectionIdx) +
        "\n\n" +
        toolBlock +
        content.slice(sectionIdx);
    }
  } else {
    // Create new section at end of file
    content =
      content.trimEnd() + "\n\n" + sectionHeader + "\n\n" + toolBlock + "\n";
  }

  await fs.mkdir(path.dirname(target.filePath), { recursive: true });
  await fs.writeFile(target.filePath, content, "utf-8");
}

async function removeFromFile(
  target: RulesTarget,
  toolName: string
): Promise<boolean> {
  let content: string;
  try {
    content = await fs.readFile(target.filePath, "utf-8");
  } catch {
    return false;
  }

  const toolMarkerStart = `<!-- forage:${toolName} -->`;
  const toolMarkerEnd = `<!-- /forage:${toolName} -->`;

  if (!content.includes(toolMarkerStart)) return false;

  const startIdx = content.indexOf(toolMarkerStart);
  const endIdx = content.indexOf(toolMarkerEnd) + toolMarkerEnd.length;

  // Remove the tool block and any surrounding blank lines
  let before = content.slice(0, startIdx).replace(/\n\n$/, "\n");
  let after = content.slice(endIdx).replace(/^\n\n/, "\n");

  content = before + after;

  // If the section is now empty, remove it too
  const sectionHeader = target.sectionHeader;
  if (content.includes(sectionHeader)) {
    const sectionIdx = content.indexOf(sectionHeader);
    const afterSection = content.slice(sectionIdx + sectionHeader.length);
    const nextSection = afterSection.search(/\n##? /);
    const sectionContent =
      nextSection === -1 ? afterSection : afterSection.slice(0, nextSection);

    if (sectionContent.trim() === "") {
      content =
        content.slice(0, sectionIdx).trimEnd() +
        (nextSection === -1 ? "\n" : afterSection.slice(nextSection));
    }
  }

  await fs.writeFile(target.filePath, content, "utf-8");
  return true;
}

function formatToolBlock(toolName: string, rules: string): string {
  return `<!-- forage:${toolName} -->\n### ${toolName}\n\n${rules}\n<!-- /forage:${toolName} -->`;
}
