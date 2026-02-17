<div align="center">

# 🌿 Forage

**Self-improving tool discovery for AI agents.**

Install one MCP server. Your agent finds the rest.

[![npm version](https://img.shields.io/npm/v/forage-mcp.svg)](https://www.npmjs.com/package/forage-mcp)
[![npm downloads](https://img.shields.io/npm/dm/forage-mcp.svg)](https://www.npmjs.com/package/forage-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[npm](https://www.npmjs.com/package/forage-mcp) · [GitHub](https://github.com/isaac-levine/forage) · [Contributing](CONTRIBUTING.md)

</div>

---

Forage is an MCP server that lets AI agents discover, install, and learn to use new tools — automatically. When an agent hits a wall, it forages for the right tool, installs it, and teaches itself how to use it. No restarts. No manual config. The agent gets permanently smarter.

<!-- TODO: Add demo GIF here -->
<!-- ![Forage demo](assets/demo.gif) -->

## Why?

AI coding agents are limited to whatever tools they're configured with at session start. Need to query a database? Deploy to Vercel? Search Slack? The agent apologizes and you manually install the right MCP server.

Forage closes that loop:

```
Agent encounters a task it can't do
  → forage_search("query postgres database")
  → forage_install("@modelcontextprotocol/server-postgres")
  → Tools available IMMEDIATELY (no restart)
  → forage_learn() saves instructions to CLAUDE.md
  → Next session: auto-starts, agent already knows how to use it
```

## Quick Start

**Claude Code**

```bash
claude mcp add forage -- npx -y forage-mcp
```

**Cursor**

```bash
npx forage-mcp init --client cursor
```

That's it. Start a new session and Forage is ready.

## Tools

| Tool | Description |
|---|---|
| `forage_search` | Search for MCP servers across the [Official MCP Registry](https://registry.modelcontextprotocol.io), [Smithery](https://smithery.ai), and [npm](https://www.npmjs.com) |
| `forage_evaluate` | Get details on a package — downloads, README, install command |
| `forage_install` | Install and start an MCP server as a proxied subprocess (requires user approval) |
| `forage_learn` | Write usage instructions to CLAUDE.md / AGENTS.md / .cursor/rules/ |
| `forage_status` | List all installed and running tools |
| `forage_uninstall` | Remove a tool and clean up rules |

## How It Works

Forage is a **gateway/proxy** MCP server:

1. **You install Forage once** — it's the only MCP server you configure manually
2. **Forage discovers tools** — searches the Official MCP Registry, Smithery, and npm in parallel
3. **Forage installs tools** — starts them as child processes, wraps their capabilities
4. **No restart needed** — emits `list_changed` notifications so the agent picks up new tools instantly
5. **Knowledge persists** — `forage_learn` writes to agent rule files, manifest auto-starts tools next session

<details>
<summary><strong>Architecture</strong></summary>

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

When you install a tool through Forage:

1. Forage runs `npx -y <package>` as a child process
2. Connects to it via `StdioClientTransport` (MCP client)
3. Discovers the child server's tools via `listTools`
4. Re-registers each tool on the Forage server with a namespaced name (`foraged__<server>__<tool>`)
5. Sends `tools/list_changed` notification — the agent sees new tools immediately
6. When the agent calls a proxied tool, Forage forwards the call to the child server

</details>

<details>
<summary><strong>Persistence</strong></summary>

Forage stores its state in `~/.forage/`:

| File | Purpose |
|---|---|
| `manifest.json` | Installed tools, command/args, auto-start configuration |
| `install-log.json` | Audit trail of all installs and uninstalls |
| `cache/` | Cached registry search results |

On startup, Forage reads the manifest and auto-starts all previously installed servers. Your agent picks up right where it left off.

</details>

## CLI

Forage also includes a CLI for humans:

```bash
forage search "postgres database"    # Search registries
forage list                          # List installed tools
forage init                          # Set up for Claude Code
forage init --client cursor          # Set up for Cursor
```

## Security

> [!IMPORTANT]
> Forage cannot install tools without explicit user approval. Every `forage_install` call requires `confirm: true`.

- **Audit trail** — every install/uninstall is logged with timestamps to `~/.forage/install-log.json`
- **No remote backend** — everything runs locally. Registry searches are read-only GET requests to public APIs.
- **No secrets stored** — environment variables for child servers are passed at install time, not persisted.

## Development

```bash
git clone https://github.com/isaac-levine/forage.git
cd forage
npm install
npm run build
```

Test locally with Claude Code:

```bash
claude mcp add forage-dev -- node /path/to/forage/dist/server.js
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Roadmap

### Features

- [ ] `forage update` — check for newer versions of installed tools
- [ ] Support for pip/cargo/brew packages (not just npm)
- [ ] Smarter search ranking (weight by downloads, stars, description relevance)
- [ ] Auto-configure environment variables from `.env` files
- [ ] `forage doctor` — diagnose common setup issues

### Distribution

- [x] Publish to npm
- [ ] Submit to the [Official MCP Registry](https://registry.modelcontextprotocol.io)
- [ ] Submit to [Smithery](https://smithery.ai)
- [ ] Submit to [mcp.so](https://mcp.so) and [glama.ai](https://glama.ai/mcp/servers)
- [ ] Landing page at forage.dev

### Community

- [ ] Demo GIF / video in README
- [ ] Write launch blog post
- [ ] Post to r/ClaudeAI, r/LocalLLaMA, Hacker News (Show HN)
- [ ] Share in MCP Discord / community channels
- [ ] Write use-case guides (e.g. "Add Postgres to Claude Code in 30 seconds")
- [ ] Add GitHub Discussions for Q&A and feature requests

## License

[MIT](LICENSE)
