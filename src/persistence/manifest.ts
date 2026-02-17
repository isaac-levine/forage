import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export interface InstalledTool {
  name: string;
  packageName: string;
  version: string;
  source: "npm" | "official-registry" | "smithery";
  command: string;
  args: string[];
  env?: Record<string, string>;
  autoStart: boolean;
  installedAt: string;
  rules?: string;
}

export interface Manifest {
  version: 1;
  tools: Record<string, InstalledTool>;
}

const FORAGE_DIR = path.join(os.homedir(), ".forage");
const MANIFEST_PATH = path.join(FORAGE_DIR, "manifest.json");

export async function ensureForageDir(): Promise<void> {
  await fs.mkdir(FORAGE_DIR, { recursive: true });
  await fs.mkdir(path.join(FORAGE_DIR, "cache"), { recursive: true });
}

export async function readManifest(): Promise<Manifest> {
  try {
    const data = await fs.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(data) as Manifest;
  } catch {
    return { version: 1, tools: {} };
  }
}

export async function writeManifest(manifest: Manifest): Promise<void> {
  await ensureForageDir();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

export async function addTool(tool: InstalledTool): Promise<void> {
  const manifest = await readManifest();
  manifest.tools[tool.name] = tool;
  await writeManifest(manifest);
}

export async function removeTool(name: string): Promise<InstalledTool | null> {
  const manifest = await readManifest();
  const tool = manifest.tools[name] ?? null;
  if (tool) {
    delete manifest.tools[name];
    await writeManifest(manifest);
  }
  return tool;
}

export async function getTool(name: string): Promise<InstalledTool | null> {
  const manifest = await readManifest();
  return manifest.tools[name] ?? null;
}

export async function listTools(): Promise<InstalledTool[]> {
  const manifest = await readManifest();
  return Object.values(manifest.tools);
}
