# DB MCP Agent Usage Instructions Design

## Problem

The workspace already registers a primary PostgreSQL read-only MCP server and
an optional tenant server, and the project has general DB reference rules.
However, the user-facing MCP setup specification explains how a person starts
the server in VS Code; it is not itself an agent instruction. Agents need a
clear operational rule to call the registered MCP tools directly, follow the
read-only metadata-first sequence, and report honestly when the current
session does not expose the tools.

## Goal

Make agents working on database-related requirements use the current
workspace-registered read-only MCP server when available, without trying to
connect through credentials or changing MCP configuration.

## Design

- Add a concise global DB MCP rule to the root `AGENTS.md`: DB-contract work
  must directly use the registered `s-erp-postgresql-readonly` MCP tools before
  implementation, and must not claim MCP verification if those tools are
  unavailable.
- Expand `.github/instructions/database-mcp.instructions.md` with an explicit
  procedure:
  1. Call `list_tables` on the primary server to confirm the session tool is
     available and find the relevant table.
  2. Call `describe_table` only for the relevant table(s).
  3. Call `query_readonly` only if metadata cannot answer the contract question,
     with a single read-only query and `maxRows` no greater than 100.
  4. Use the tenant-specific server only when the requirement explicitly needs
     that tenant database and the registered tool is available.
  5. Never read `.env`, expose connection details, manually connect via
     another client as if it were MCP, modify server configuration, or run
     writes through MCP.
  6. If MCP tools are missing or fail, state that verification did not occur,
     provide the VS Code server start/trust/new-session recovery path, and use
     approved repository artifacts as fallback evidence.
- Keep the existing setup specification as a human setup guide; link from the
  agent rule only as recovery guidance, not as a substitute for direct tool
  calls.
- Preserve existing database safety rules and schema-history requirements.

## Alternatives

1. **Global trigger plus scoped detailed procedure (selected).** Ensures DB
   tasks are routed to MCP and keeps operational detail with the existing
   database instructions.
2. Put all MCP behavior into `AGENTS.md`. More discoverable but duplicates the
   scoped database policy and makes the root guide unnecessarily detailed.
3. Update only the human setup specification. It does not reliably inject
   instructions into agent behavior for database work.

## Validation

- Compare server names, transport, and available tools with the root
  `.mcp.json` and the MCP package.
- Verify the root rule links to the correct detailed instruction file and
  setup guide.
- Confirm instructions neither expose credentials nor permit data writes.
- Run `git diff --check` on the changed instruction files and review the
  scoped diff.

## Scope and Risks

Only `AGENTS.md` and `.github/instructions/database-mcp.instructions.md` are
updated as agent guidance, plus dated task documentation. The existing dirty
`.mcp.json`, MCP implementation, and user-facing setup specification are
read-only for this work. Actual VS Code session discovery remains host/UI
behavior and is not asserted without a live check.
