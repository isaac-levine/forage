import type { SearchResult } from "./types.js";

const BASE_URL = "https://registry.npmjs.org";

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      description?: string;
      version: string;
      links?: { repository?: string; npm?: string };
    };
    score?: {
      detail?: {
        popularity?: number;
      };
    };
  }>;
}

export async function searchNpm(query: string): Promise<SearchResult[]> {
  try {
    // Search for MCP servers specifically
    const searchQuery = `${query} mcp server`;
    const url = `${BASE_URL}/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=10`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as NpmSearchResult;

    return data.objects
      .filter((obj) => {
        const name = obj.package.name.toLowerCase();
        const desc = (obj.package.description ?? "").toLowerCase();
        // Filter to packages that are likely MCP servers
        return (
          name.includes("mcp") ||
          desc.includes("mcp") ||
          desc.includes("model context protocol")
        );
      })
      .map((obj) => ({
        name: obj.package.name,
        packageName: obj.package.name,
        description: obj.package.description ?? "",
        source: "npm" as const,
        url:
          obj.package.links?.repository ?? obj.package.links?.npm,
        version: obj.package.version,
        command: "npx",
        args: ["-y", obj.package.name],
      }));
  } catch {
    return [];
  }
}

export async function getPackageDetails(
  packageName: string
): Promise<{
  description: string;
  version: string;
  readme?: string;
  repository?: string;
  weeklyDownloads?: number;
} | null> {
  try {
    const url = `${BASE_URL}/${encodeURIComponent(packageName)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;

    // Get weekly downloads from separate API
    let weeklyDownloads: number | undefined;
    try {
      const dlResponse = await fetch(
        `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (dlResponse.ok) {
        const dlData = (await dlResponse.json()) as { downloads?: number };
        weeklyDownloads = dlData.downloads;
      }
    } catch {
      // Ignore download count failures
    }

    return {
      description: (data.description as string) ?? "",
      version: (data["dist-tags"] as Record<string, string>)?.latest ?? "",
      readme: data.readme as string | undefined,
      repository:
        typeof data.repository === "object" && data.repository !== null
          ? (data.repository as Record<string, string>).url
          : undefined,
      weeklyDownloads,
    };
  } catch {
    return null;
  }
}
