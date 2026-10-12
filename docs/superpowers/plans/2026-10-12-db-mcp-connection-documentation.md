# DB MCP Connection Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the existing PostgreSQL read-only MCP setup specification so developers can connect to the current workspace servers and confirm tools in a fresh Copilot session.

**Architecture:** Documentation-only update. Treat the root `.mcp.json` and MCP package scripts as read-only sources of truth; update the existing configuration specification and add the required dated task, planning, detailed specification, and result records. Do not modify MCP registration, server code, or credentials.

**Tech Stack:** Markdown, VS Code MCP, Node.js/npm

---

### Task 1: Record the dated work instructions and specification

**Files:**
- Create: `docs/directions/20261012/20261012_008_DB_MCP_연결문서_개정_작업지시서.md`
- Create: `docs/plan/20261012/20261012_008_DB_MCP_연결문서_개정_계획서.md`
- Create: `docs/spec/20261012/20261012_008_DB_MCP_연결문서_개정_사양서.md`

- [x] **Step 1: Write the direction, plan, and detailed specification**

  Record the single deliverable: rewrite the existing
  `docs/spec/20260909/20260909_002_PostgreSQL_읽기전용_MCP_서버_구성_사양서.md`
  connection procedure to use the root `.mcp.json`; explain local `.env`
  setup under `tools/mcp-postgresql-readonly`, dependency installation and
  build, VS Code server start/trust, and fresh-session discovery. State that
  credentials remain local and the current dirty `.mcp.json` is not to be
  changed. Link the design and this plan using relative paths.

### Task 2: Rewrite the PostgreSQL MCP setup procedure

**Files:**
- Modify: `docs/spec/20260909/20260909_002_PostgreSQL_읽기전용_MCP_서버_구성_사양서.md`
- Read only: `.mcp.json`
- Read only: `tools/mcp-postgresql-readonly/package.json`
- Read only: `tools/mcp-postgresql-readonly/.env.example`

- [x] **Step 1: Replace obsolete VS Code configuration instructions**

  Document that the workspace registers `s-erp-postgresql-readonly` in the
  root `.mcp.json` with stdio transport. Describe the tenant server as optional
  and explain that it uses the tenant database override from its server entry.
  Do not copy database host, username, password, connection string, or tenant
  data into documentation.

- [x] **Step 2: Add the local setup and session discovery sequence**

  Include the actual package commands, run from
  `tools/mcp-postgresql-readonly`:

  ```powershell
  npm install
  npm run build
  ```

  Explain that `.env.example` is a template and the developer supplies the
  password in the untracked local `tools/mcp-postgresql-readonly/.env`. Then
  direct the developer to open the repository root in VS Code, run
  `MCP: List Servers`, start and trust the desired server, and open a new
  Copilot session. State that the expected server tools are `list_tables`,
  `describe_table`, and `query_readonly`.

- [x] **Step 3: Add concise troubleshooting**

  Explain that stale sessions may not receive a changed tool inventory;
  after configuration or build changes, restart/trust the MCP server and
  verify from a new Copilot session. Point users to confirm the root
  `.mcp.json` registration and required local environment variables without
  asking them to disclose secrets.

### Task 3: Validate and record the documentation result

**Files:**
- Create: `docs/result/20261012/db-mcp-connection-documentation/result.md`
- Read only: all files listed above

- [x] **Step 1: Review accuracy and sensitive information**

  Check every path and command against the current workspace files and root
  `.mcp.json`. Confirm the revised setup specification contains no credentials,
  connection strings, or tenant rows. Mark UI/session verification as a
  documented operator step rather than claiming it was run during this
  documentation-only task.

- [x] **Step 2: Run the documentation checks**

  Run:

  ```powershell
  git diff --check
  ```

  Review the scoped diff and ensure no unrelated dirty files were changed.

- [x] **Step 3: Record completion**

  In the result note, link the direction, plan, detailed specification,
  rewritten setup specification, and design. Summarize the documentation
  changes and validation. State that screenshots do not apply because no UI
  was changed, and do not claim a live session check.
