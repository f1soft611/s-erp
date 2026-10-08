# Tenant PostgreSQL Read-Only MCP Design

## Goal

Add a second read-only MCP server for PostgreSQL database `tenant_1212123312` on
the same PostgreSQL server as the existing S-ERP MCP server, then list its
regular tables.

## Design

- Keep the existing `s-erp-postgresql-readonly` MCP server unchanged.
- Add a separately named server entry to the workspace `.mcp.json` that runs
  the existing MCP server executable.
- Reuse the existing local `tools/mcp-postgresql-readonly/.env` for host, port,
  user, password, and SSL settings. Set `S_ERP_DB_NAME=tenant_1212123312` only
  in the new server entry's process environment. The server config loader
  honors process environment values before values in `.env`.
- Do not copy credentials into `.mcp.json`, source files, or documentation.
- Use the new server's `list_tables` tool to retrieve table names only. Do not
  inspect table rows or request schemas unless separately asked.

## Alternatives Considered

1. Add a second workspace MCP entry and override only the database name. This
   keeps server code unchanged and avoids duplicating secrets. Selected.
2. Create a separate tenant `.env` and use it in a second server process. This
   duplicates connection configuration and creates another secret-bearing
   local file.
3. Change the MCP server to accept database selection as an explicit runtime
   option. This expands server behavior unnecessarily for the requested
   database.

## Validation

- Confirm the workspace configuration remains valid JSON and contains both
  distinct server names.
- Start the tenant MCP process and invoke `list_tables` against the requested
  database; report only the returned table names.
- Preserve the existing server configuration and do not expose credentials.
