# Forage

**Self-improving tool discovery for AI agents.**

Forage is an MCP server that lets AI agents discover, install, and learn to use new tools — automatically. When an agent hits a wall, it forages for the right tool, installs it, and teaches itself how to use it. The agent gets permanently smarter.

## The Problem

AI coding agents are limited to whatever tools they're configured with at session start. When an agent needs to query a database, deploy to Vercel, or search Slack, it apologizes and the human manually installs the right MCP server. This is the bottleneck.

## The Solution

Forage closes the self-improvement loop:

```
Agent encounters a task it can't do
  → forage_search("query postgres database")
  → forage_install("@modelcontextprotocol/server-postgres")
  → Tools available IMMEDIATELY (no restart)
  → forage_learn() saves instructions to CLAUDE.md
  → Next session: auto-starts, agent already knows how to use it
```

## Quick Start

### Claude Code

```bash
claude mcp add forage -- npx -y forage-mcp
```

### Cursor

```bash
npx forage-mcp init --client cursor
```

Then start a new session. Forage is ready.

## Tools

| Tool | Description |
|---|---|
| `forage_search` | Search for MCP servers across Official Registry, Smithery, and npm |
| `forage_evaluate` | Get details on a package — downloads, README, install command |
| `forage_install` | Install and start an MCP server as a proxied subprocess (requires user approval) |
| `forage_learn` | Write usage instructions to CLAUDE.md / AGENTS.md / .cursor/rules/ |
| `forage_status` | List all installed and running tools |
| `forage_uninstall` | Remove a tool and clean up rules |

## How It Works

Forage is an MCP server that acts as a **gateway/proxy**:

1. **You install Forage once** — it's the only MCP server you configure manually
2. **Forage discovers tools** — searches the Official MCP Registry, Smithery, and npm
3. **Forage installs tools** — starts them as child processes, wraps their capabilities
4. **No restart needed** — Forage emits `list_changed` notifications, agent picks up new tools instantly
5. **Knowledge persists** — `forage_learn` writes to agent rule files, manifest auto-starts tools next session

### Architecture

```
┌─────────────────────────────────────────────┐
│  Claude Code / Cursor / Codex               │
│                                             │
│  "I need to query a Postgres database"      │
└──────────────────┬──────────────────────────┘
                   │ MCP
                   ▼
┌─────────────────────────────────────────────┐
│  Forage MCP Server                          │
│                                             │
│  forage_search ─── Official Registry        │
│  forage_install    Smithery                 │
│  forage_learn      npm                      │
│  forage_status                              │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ Postgres MCP│  │ GitHub MCP  │  ...      │
│  │ (subprocess)│  │ (subprocess)│          │
│  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────┘
```

## Persistence

Forage stores its state in `~/.forage/`:

- `manifest.json` — installed tools, auto-start configuration
- `install-log.json` — audit trail of all installs/uninstalls
- `cache/` — cached registry search results

On startup, Forage reads the manifest and auto-starts all previously installed servers.

## CLI

Forage also includes a CLI for humans:

```bash
forage search "postgres database"    # Search registries
forage list                          # List installed tools
forage init                          # Set up for Claude Code
forage init --client cursor          # Set up for Cursor
```

## Security

- **Human approval required** — `forage_install` always requires explicit confirmation
- **Audit trail** — every install/uninstall is logged to `~/.forage/install-log.json`
- **No remote backend** — everything runs locally, registry searches are read-only GET requests

## License

MIT
