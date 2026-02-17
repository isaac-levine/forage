import type { SearchResult } from "./types.js";

const BASE_URL = "https://registry.modelcontextprotocol.io/v0";

interface OfficialServerEntry {
  server: {
    name: string;
    description?: string;
    repository?: { url?: string };
    version?: string;
    packages?: Array<{
      registryType: string;
      identifier: string;
      name?: string;
      version?: string;
      runtime?: string;
      arguments?: string[];
    }>;
  };
}

interface OfficialSearchResponse {
  servers: OfficialServerEntry[];
}

export async function searchOfficial(
  query: string
): Promise<SearchResult[]> {
  try {
    const url = `${BASE_URL}/servers?search=${encodeURIComponent(query)}&limit=10`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as OfficialSearchResponse;

    const results: SearchResult[] = [];
    for (const entry of data.servers ?? []) {
      const s = entry.server;
      if (!s?.name) continue;

      const npmPkg = s.packages?.find((p) => p.registryType === "npm");
      const packageName = npmPkg?.identifier ?? npmPkg?.name ?? s.name;

      results.push({
        name: s.name,
        packageName,
        description: s.description ?? "",
        source: "official-registry",
        url: s.repository?.url,
        version: s.version ?? npmPkg?.version,
        command: npmPkg ? "npx" : undefined,
        args: npmPkg
          ? ["-y", packageName, ...(npmPkg.arguments ?? [])]
          : undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function getServerDetails(
  name: string
): Promise<OfficialServerEntry["server"] | null> {
  try {
    const url = `${BASE_URL}/servers/${encodeURIComponent(name)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OfficialServerEntry | OfficialServerEntry["server"];
    // The API might return wrapped or unwrapped
    if ("server" in data) return data.server;
    return data;
  } catch {
    return null;
  }
}
