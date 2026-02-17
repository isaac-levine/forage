import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export type AgentType = "claude-code" | "cursor" | "codex" | "unknown";

export interface RulesTarget {
  agent: AgentType;
  filePath: string;
  sectionHeader: string;
}

export async function detectAgent(cwd?: string): Promise<RulesTarget[]> {
  const projectDir = cwd ?? process.cwd();
  const targets: RulesTarget[] = [];

  // Check for Claude Code (CLAUDE.md in project or home dir)
  const claudeMdProject = path.join(projectDir, "CLAUDE.md");
  const claudeMdHome = path.join(os.homedir(), "CLAUDE.md");

  try {
    await fs.access(claudeMdProject);
    targets.push({
      agent: "claude-code",
      filePath: claudeMdProject,
      sectionHeader: "## Forage: Installed Tools",
    });
  } catch {
    // Project CLAUDE.md doesn't exist, use home dir
    targets.push({
      agent: "claude-code",
      filePath: claudeMdHome,
      sectionHeader: "## Forage: Installed Tools",
    });
  }

  // Check for Cursor (.cursor/rules/ directory)
  const cursorDir = path.join(projectDir, ".cursor", "rules");
  try {
    await fs.access(cursorDir);
    targets.push({
      agent: "cursor",
      filePath: path.join(cursorDir, "forage.mdc"),
      sectionHeader: "# Forage: Installed Tools",
    });
  } catch {
    // No Cursor config
  }

  // Check for Codex/Copilot (AGENTS.md)
  const agentsMd = path.join(projectDir, "AGENTS.md");
  try {
    await fs.access(agentsMd);
    targets.push({
      agent: "codex",
      filePath: agentsMd,
      sectionHeader: "## Forage: Installed Tools",
    });
  } catch {
    // No AGENTS.md
  }

  return targets;
}
