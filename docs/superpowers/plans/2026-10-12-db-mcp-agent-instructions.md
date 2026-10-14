# DB MCP Agent Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make database-related agents directly use the workspace-registered read-only MCP tools and report clearly if those tools are unavailable.

**Architecture:** Add a short global trigger and policy link in `AGENTS.md`; put the operational call sequence, tenant selection rule, and failure behavior in the scoped database MCP instruction. Preserve the existing human setup guide and the dirty `.mcp.json`.

**Tech Stack:** Markdown, VS Code Copilot MCP, read-only PostgreSQL MCP

---

### Task 1: Record dated work direction, plan, and detailed specification

**Files:**
- Create: `docs/directions/20261012/20261012_009_DB_MCP_에이전트_사용지침_명확화_작업지시서.md`
- Create: `docs/plan/20261012/20261012_009_DB_MCP_에이전트_사용지침_명확화_계획서.md`
- Create: `docs/spec/20261012/20261012_009_DB_MCP_에이전트_사용지침_명확화_상세사양서.md`

- [x] **Step 1: Document scope and acceptance criteria**

  State that the task clarifies the agent's direct use of workspace-registered
  MCP tools in `AGENTS.md` and
  `.github/instructions/database-mcp.instructions.md`. Specify the tool
  sequence, primary versus tenant server use, read-only constraints, and honest
  fallback when tools are missing. Explicitly exclude changes to `.mcp.json`,
  credentials, MCP implementation, and the prior human-facing setup
  specification. Link the approved design and this plan with correct
  repository-relative paths.

### Task 2: Make the agent MCP workflow explicit

**Files:**
- Modify: `AGENTS.md`
- Modify: `.github/instructions/database-mcp.instructions.md`
- Read only: `.mcp.json`
- Read only: `tools/mcp-postgresql-readonly/src/mcpConfig.test.ts`
- Read only: `docs/spec/20260909/20260909_002_PostgreSQL_읽기전용_MCP_서버_구성_사양서.md`

- [x] **Step 1: Clarify the global DB work trigger**

  In the existing DB MCP section of `AGENTS.md`, state that an agent handling
  DB/schema/API-contract work must call the registered primary server tools
  directly before implementation when available. Link the scoped
  `database-mcp.instructions.md` for the invocation sequence. Prohibit claiming
  MCP verification if no MCP tool call succeeded.

- [x] **Step 2: Specify operational tool selection and safe call sequence**

  In `.github/instructions/database-mcp.instructions.md`, specify that the
  workspace primary server is `s-erp-postgresql-readonly`, registered in
  `.mcp.json`, and offers `list_tables`, `describe_table`, and
  `query_readonly`. Require `list_tables` first, `describe_table` only for
  relevant tables, and `query_readonly` only when metadata cannot answer the
  question, using one read-only statement and `maxRows <= 100`.

- [x] **Step 3: Specify tenant handling and failure behavior**

  State that the tenant server is only for a task that explicitly needs that
  tenant database and must not be selected by guessing. If the registered MCP
  tools are absent or fail, require the agent to say the live MCP check was not
  completed, avoid reading `.env` or manually reusing credentials, and tell the
  user to start/trust the workspace MCP server and open a new Copilot session.
  Allow fallback evidence only from repository schema history, Mapper XML, and
  domain code, with its source reported.

### Task 3: Validate and record the result

**Files:**
- Create: `docs/result/20261012/db-mcp-agent-instructions/result.md`
- Read only: `AGENTS.md`
- Read only: `.github/instructions/database-mcp.instructions.md`
- Read only: `.mcp.json`
- Read only: all files from Tasks 1 and 2

- [x] **Step 1: Review requirements and sensitive-data safety**

  Confirm the server names, `stdio` registration, and tool names against the
  current root `.mcp.json` and MCP config test. Confirm no credential,
  connection string, host, account, or tenant identifier was copied into the
  instruction changes. Ensure the new agent workflow does not permit writes or
  imply that VS Code UI discovery was tested.

- [x] **Step 2: Run focused documentation validation**

  Run:

  ```powershell
  git diff --check -- AGENTS.md .github/instructions/database-mcp.instructions.md
  ```

  Then run `Set-Location tools\mcp-postgresql-readonly; npm test -- src/mcpConfig.test.ts`
  to verify the registered server names and stdio transport. Review the scoped
  diff and verify that `.mcp.json` and the human-facing setup specification were
  not modified for this task.

- [x] **Step 3: Record the result**

  Create `docs/result/20261012/db-mcp-agent-instructions/result.md` with links
  to the direction, plan, detailed specification, design, and the two changed
  instruction files. Report validation results and explicitly distinguish
  file-level verification from a live VS Code Copilot session check.
