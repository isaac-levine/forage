# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-02-16

### Added

- MCP server with 6 tools: `forage_search`, `forage_evaluate`, `forage_install`, `forage_learn`, `forage_status`, `forage_uninstall`
- Registry search across Official MCP Registry, Smithery, and npm
- Proxy/gateway pattern — installed tools run as child processes with instant availability via `list_changed` notifications
- Persistence layer at `~/.forage/` with `manifest.json` (auto-start config) and `install-log.json` (audit trail)
- Agent rule file support — writes to CLAUDE.md, AGENTS.md, and `.cursor/rules/` with clean HTML comment markers
- CLI with `forage init`, `forage search`, and `forage list` commands
- Human approval required for all installs (`confirm: true` safety gate)
