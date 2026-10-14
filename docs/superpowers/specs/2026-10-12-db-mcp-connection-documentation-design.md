# DB MCP Connection Documentation Design

## Problem

The PostgreSQL read-only MCP setup specification describes the original
`.vscode/mcp.json` configuration and gives only a short startup instruction.
The current workspace instead registers its primary and tenant servers in the
root `.mcp.json`, and connecting successfully requires environment setup,
building the local server, starting/trusting it in VS Code, and opening a new
Copilot session.

## Goal

Rewrite the connection procedure in the existing PostgreSQL read-only MCP
setup specification so a developer can follow the current workspace workflow
from local prerequisites through confirming the server tools in a new session.

## Design

- Update the existing `docs/spec/20260909/20260909_002_PostgreSQL_읽기전용_MCP_서버_구성_사양서.md`.
- Replace obsolete `.vscode/mcp.json` references with the root `.mcp.json`
  registration and describe both the primary server and optional tenant
  server without exposing connection values.
- Explain how to prepare the local `.env` under
  `tools/mcp-postgresql-readonly`, install dependencies, and build the MCP
  server.
- Give the VS Code workflow to list, start, and trust the registered server,
  then open a new Copilot session and confirm the expected tools are available.
- Add focused troubleshooting for a missing or stale tool list, including
  rebuilding after setup changes and restarting discovery in a new session.
- Keep the current `.mcp.json`, server implementation, credentials, and
  historical result reports unchanged.

## Alternatives

1. **Rewrite the existing setup specification (selected).** Preserves the
   established documentation location and gives the setup procedure one
   maintained home.
2. Add a separate user guide and link it from the specification. This is
   appropriate if several audiences need different levels of detail, but would
   create extra documentation for the current focused request.
3. Only correct the obsolete configuration path. This is smaller, but does not
   give developers enough information to connect and verify a session.

## Validation

- Compare documented settings with the root `.mcp.json` structure and MCP
  package scripts.
- Verify every referenced path and command against the workspace.
- Confirm the specification contains no password, connection string, or
  tenant data.
- Review the final diff and run `git diff --check`.

## Scope and Risks

The task is documentation-only. The current workspace configuration is already
modified and will be treated as read-only. Connection verification in the
instructions describes VS Code steps; this documentation change does not
restart or alter the running MCP servers.
