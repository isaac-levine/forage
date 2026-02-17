import { searchOfficial } from "../registries/official.js";
import { searchNpm } from "../registries/npm.js";
import { searchSmithery } from "../registries/smithery.js";
import type { SearchResult } from "../registries/types.js";

export interface SearchInput {
  query: string;
  sources?: Array<"official-registry" | "npm" | "smithery">;
}

export async function forage_search(input: SearchInput): Promise<{
  results: SearchResult[];
  query: string;
}> {
  const sources = input.sources ?? ["official-registry", "npm", "smithery"];

  const searches = [];
  if (sources.includes("official-registry")) {
    searches.push(searchOfficial(input.query));
  }
  if (sources.includes("npm")) {
    searches.push(searchNpm(input.query));
  }
  if (sources.includes("smithery")) {
    searches.push(searchSmithery(input.query));
  }

  const allResults = await Promise.all(searches);
  const flat = allResults.flat();

  // Deduplicate by package name, preferring official registry results
  const seen = new Map<string, SearchResult>();
  for (const result of flat) {
    if (!result.packageName) continue;
    const key = result.packageName.toLowerCase();
    const existing = seen.get(key);
    if (!existing || sourceRank(result.source) < sourceRank(existing.source)) {
      seen.set(key, result);
    }
  }

  const results = [...seen.values()].sort((a, b) => {
    // Sort by source priority first, then by name
    const rankDiff = sourceRank(a.source) - sourceRank(b.source);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });

  return { results, query: input.query };
}

function sourceRank(source: string): number {
  switch (source) {
    case "official-registry":
      return 0;
    case "smithery":
      return 1;
    case "npm":
      return 2;
    default:
      return 3;
  }
}
