# DB MCP Session Discovery Design

## Problem

The PostgreSQL read-only MCP server works when launched directly, but local
Copilot sessions do not consistently discover its tools. The workspace
`.mcp.json` uses the portable `mcpServers` root, but its entries declare
`type: "local"` and include a `tools` field. VS Code's documented stdio
configuration uses `type: "stdio"` and does not define a `tools` field.

## Goal

Make the existing primary and tenant PostgreSQL MCP servers discoverable to
local Copilot/Agent Host sessions without changing their behavior, credentials,
database targets, or read-only permissions.

## Design

- Keep the root `.mcp.json` portable workspace configuration.
- Preserve both server names, commands, arguments, and the tenant database
  override.
- Change each server's transport type from `local` to `stdio`.
- Remove the unsupported `tools` property from each server entry.
- Keep credentials in the existing local `.env`; do not add credentials to the
  tracked MCP configuration.
- Do not change MCP server implementation or issue database queries as part of
  the configuration repair.

## Alternatives

1. **Correct the portable `.mcp.json` entries (selected).** Keeps the existing
   workspace-level setup usable by Copilot/Agent Host sessions and changes only
   the incompatible server fields.
2. Move the registrations to `.vscode/mcp.json`. This is VS Code-specific and
   depends on VS Code forwarding the configuration to Agent Host sessions.
3. Register the server globally. This exposes the database tools in unrelated
   workspaces and requires machine-specific paths, so it is broader than needed.

## Validation

- Parse `.mcp.json` and verify both server registrations and their intended
  environment differences.
- Launch the local server over stdio and verify it advertises the expected
  three tools.
- Start or trust the workspace MCP server in VS Code and confirm a newly
  created local session can see its tools. Existing sessions may require a
  restart because server discovery is session-scoped.
- Confirm the tracked config contains no database credentials.

## Scope and Risks

Only `.mcp.json` and task documentation change. The server is local and
read-only; existing connection values remain in the local environment file.
The code-side checks cannot confirm VS Code's post-reload tool discovery, so
the final UI verification requires starting/trusting the server and opening a
new session.
