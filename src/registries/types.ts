export interface SearchResult {
  name: string;
  packageName: string;
  description: string;
  source: "official-registry" | "smithery" | "npm";
  url?: string;
  stars?: number;
  downloads?: number;
  version?: string;
  command?: string;
  args?: string[];
}
