import type { SearchResult } from "./types.js";

const BASE_URL = "https://registry.smithery.ai";

interface SmitheryServer {
  qualifiedName: string;
  displayName?: string;
  description?: string;
  homepage?: string;
  useCount?: number;
}

interface SmitherySearchResponse {
  servers: SmitheryServer[];
  pagination?: { total: number };
}

export async function searchSmithery(
  query: string
): Promise<SearchResult[]> {
  try {
    const url = `${BASE_URL}/servers?q=${encodeURIComponent(query)}&pageSize=10`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as SmitherySearchResponse;

    return (data.servers ?? []).map((server) => ({
      name: server.displayName ?? server.qualifiedName,
      packageName: server.qualifiedName,
      description: server.description ?? "",
      source: "smithery" as const,
      url: server.homepage ?? `https://smithery.ai/server/${server.qualifiedName}`,
      downloads: server.useCount,
    }));
  } catch {
    return [];
  }
}
