import { getServerDetails } from "../registries/official.js";
import { getPackageDetails } from "../registries/npm.js";

export interface EvaluateInput {
  packageName: string;
}

export interface EvaluateResult {
  name: string;
  description: string;
  version: string;
  repository?: string;
  weeklyDownloads?: number;
  readme?: string;
  installCommand?: string;
  source: string;
}

export async function forage_evaluate(
  input: EvaluateInput
): Promise<EvaluateResult | { error: string }> {
  // Try official registry first
  const official = await getServerDetails(input.packageName);
  const npm = await getPackageDetails(input.packageName);

  if (!official && !npm) {
    return { error: `Package "${input.packageName}" not found in any registry` };
  }

  const npmPkg = official?.packages?.find((p) => p.registryType === "npm");

  // Truncate README to something reasonable for an LLM
  let readme = npm?.readme;
  if (readme && readme.length > 3000) {
    readme = readme.slice(0, 3000) + "\n\n... (truncated)";
  }

  return {
    name: official?.name ?? input.packageName,
    description: official?.description ?? npm?.description ?? "",
    version: npm?.version ?? npmPkg?.version ?? official?.version ?? "unknown",
    repository: npm?.repository ?? official?.repository?.url,
    weeklyDownloads: npm?.weeklyDownloads,
    readme,
    installCommand: npmPkg
      ? `npx -y ${npmPkg.identifier}`
      : npm
        ? `npx -y ${input.packageName}`
        : undefined,
    source: official ? "official-registry" : "npm",
  };
}
