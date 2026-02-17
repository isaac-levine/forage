# Forage

Self-improving tool discovery for AI agents. An MCP server that lets agents find, install, and learn to use new tools without human intervention or restarts.

## Project Overview

Forage is a **gateway/proxy MCP server**. It's installed once and acts as a hub — when an agent discovers and installs a new tool through Forage, Forage starts it as a subprocess, wraps its capabilities, and emits `list_changed` notifications so the agent can use it immediately.

### Core Flow

1. Agent calls `forage_search("postgres database")` to find tools
2. Agent calls `forage_install("@modelcontextprotocol/server-postgres", { confirm: true })` to install
3. Forage starts the server as a child process, wraps its tools, notifies the agent
4. Agent calls `forage_learn(...)` to persist instructions in CLAUDE.md
5. Next session: Forage auto-starts from `~/.forage/manifest.json`

## Architecture

```
src/
├── server.ts              # MCP server entry — tool registration + proxy lifecycle
├── cli.ts                 # CLI: init, search, list
├── tools/                 # One file per MCP tool (search, evaluate, install, learn, status, uninstall)
├── registries/            # API clients for Official MCP Registry, Smithery, npm
├── proxy/
│   ├── manager.ts         # Spawns/stops child MCP servers via StdioClientTransport
│   └── wrapper.ts         # Namespaces child tools as foraged__<server>__<tool>
├── rules/
│   ├── detector.ts        # Detects CLAUDE.md, AGENTS.md, .cursor/rules/
│   └── writer.ts          # Adds/removes tool blocks with <!-- forage:name --> markers
└── persistence/
    ├── manifest.ts        # ~/.forage/manifest.json read/write
    └── log.ts             # ~/.forage/install-log.json audit trail
```

## Tech Stack

- **TypeScript** with ES modules (`"type": "module"`)
- **`@modelcontextprotocol/sdk`** — MCP server and client
- **Node.js >= 18** (uses native `fetch`, `AbortSignal.timeout`)
- **No runtime dependencies** beyond the MCP SDK (which bundles Zod)

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode
npm run lint         # Type-check without emitting
```

### Testing locally

```bash
# CLI
node dist/cli.js search "postgres"
node dist/cli.js list

# MCP server (stdio)
node dist/server.js
```

### Key Conventions

- All source files use `.js` extensions in imports (required for Node16 module resolution)
- Registry clients return `SearchResult[]` from `registries/types.ts`
- Proxied tools are namespaced: `foraged__<sanitized_server_name>__<original_tool_name>`
- Rules in CLAUDE.md use HTML comment markers for clean add/remove: `<!-- forage:toolname -->`
- `forage_install` requires `confirm: true` — human-in-the-loop safety gate
- Persistence lives in `~/.forage/` (manifest.json, install-log.json, cache/)

### Dynamic Tool Registration

When a tool is installed, `server.ts` calls `registerProxiedTools()` which:
1. Reads the child server's discovered tools from `proxy/manager.ts`
2. Registers each one via `server.tool()` with a namespaced name
3. Stores the `RegisteredTool` handles in a map for later removal
4. Calls `server.sendToolListChanged()` to notify the client

Uninstall reverses this via `handle.remove()`.

### Registry API Details

| Registry | Endpoint | Search Param |
|---|---|---|
| Official MCP | `registry.modelcontextprotocol.io/v0/servers` | `search=` |
| Smithery | `registry.smithery.ai/servers` | `q=` |
| npm | `registry.npmjs.org/-/v1/search` | `text=` |

The official registry wraps results in `{ servers: [{ server: { ... } }] }` (note the nested `server` key).
