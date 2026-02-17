import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ensureForageDir } from "./manifest.js";

export interface LogEntry {
  timestamp: string;
  action: "install" | "uninstall";
  packageName: string;
  version?: string;
  source?: string;
  success: boolean;
  error?: string;
}

const LOG_PATH = path.join(os.homedir(), ".forage", "install-log.json");

async function readLog(): Promise<LogEntry[]> {
  try {
    const data = await fs.readFile(LOG_PATH, "utf-8");
    return JSON.parse(data) as LogEntry[];
  } catch {
    return [];
  }
}

export async function appendLog(entry: LogEntry): Promise<void> {
  await ensureForageDir();
  const log = await readLog();
  log.push(entry);
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
}
