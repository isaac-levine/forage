# Contributing to Forage

Thanks for your interest in contributing! Forage is a young project and contributions of all kinds are welcome.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/forage.git`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Create a branch: `git checkout -b my-feature`

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm run lint         # Type-check without emitting
```

### Testing locally

Test the CLI:

```bash
node dist/cli.js search "postgres"
node dist/cli.js list
```

Test the MCP server by adding it to Claude Code:

```bash
claude mcp add forage-dev -- node /path/to/forage/dist/server.js
```

### Project Structure

- `src/server.ts` — MCP server entry point, tool registration
- `src/cli.ts` — CLI entry point
- `src/tools/` — One file per MCP tool handler
- `src/registries/` — API clients for tool registries
- `src/proxy/` — Child MCP server process management
- `src/rules/` — Agent rule file detection and writing
- `src/persistence/` — `~/.forage/` manifest and audit log

## Submitting Changes

1. Make your changes on a feature branch
2. Ensure `npm run lint` passes
3. Write a clear commit message describing what and why
4. Open a pull request against `main`

### What Makes a Good PR

- **Focused** — one feature or fix per PR
- **Tested** — you've verified it works locally
- **Documented** — update README if adding user-facing features

## Ideas for Contributions

### Good First Issues

- Add more registries (PulseMCP, awesome-mcp-servers lists)
- Improve search result ranking (weight by downloads, stars, description relevance)
- Add `forage search --json` flag for machine-readable output
- Improve error messages when a child server fails to start

### Larger Projects

- Test suite with vitest
- Support for non-npm package managers (pip, cargo, brew)
- `forage update` command to check for newer versions of installed tools
- Web UI for browsing installed tools and search results
- Official MCP Registry `server.json` submission

## Code Style

- TypeScript with strict mode
- ES modules (`.js` extensions in imports)
- No runtime dependencies beyond `@modelcontextprotocol/sdk`
- Prefer simple, readable code over clever abstractions

## Questions?

Open an issue or start a discussion. We're happy to help you get oriented.
