# Document Test Account Password Reset Implementation Plan

> Historical plan for the initial externally supplied hash implementation. The current psql-direct execution flow is specified in [the psql design](../specs/2026-10-14-document-test-account-password-reset-psql-design.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fail-closed SQL script to reset only the ten document user-picker test accounts in tenant `T1358606250`, without storing credentials or hashes in repository files.

**Architecture:** The SQL reads one externally prepared SHA-256/Base64 hash per login code from PostgreSQL session settings in the same session. It validates all ten inputs and all ten active target rows, locks the rows, then changes only password and login lock/failure metadata in one transaction. Identical SQL and change-history copies are stored in `docs/database` and `backend/DATABASE`; the script is not applied by the agent.

**Tech Stack:** PostgreSQL, psql, Markdown, Node.js built-in test runner, PowerShell.

---

## File Map

- Create `docs/directions/20261014/20261014_005_document_test_account_password_reset_작업지시서.md` for approved scope and completion criteria.
- Create `docs/plan/20261014/20261014_005_document_test_account_password_reset_계획서.md` for the project workflow and verification steps.
- Create `docs/spec/20261014/20261014_005_document_test_account_password_reset_상세사양서.md` for SQL inputs, target matching, transaction, and failure behavior.
- Create `docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql` as the operator-run script.
- Create `docs/database/20261014/20261014_002_change_test_account_passwords.md` as the data-change history, explicitly noting that restoring the prior password is intentionally unsupported.
- Create byte-identical copies of those two database artifacts under `backend/DATABASE/20261014/`.
- Create `tools/tests/test_document_test_account_password_reset.cjs` for offline, read-only SQL contract checks.
- Create `docs/result/20261014/test-account-password-reset/RESULT.md` recording static checks and that no database write/login test was performed.
- Do not create a rollback SQL file: the old hashes are not saved, because a saved password hash is an authentication-equivalent secret. A later password change is a new reset, not a rollback.
- The approved design is `docs/superpowers/specs/2026-10-14-document-test-account-password-reset-design.md`.

## Task 1: Record the Approved Work Direction

**Files:**
- Create: `docs/directions/20261014/20261014_005_document_test_account_password_reset_작업지시서.md`

- [x] **Step 1: Write the direction document**

  State the user-approved scope (all ten `doc-write-test-user-01` through
  `doc-write-test-user-10` accounts, tenant code `T1358606250`), the
  session-hash input contract, the five allowed account columns, and explicit
  prohibitions on embedding the password/hash, applying the SQL through the
  read-only MCP, or claiming a successful login.

- [x] **Step 2: Check that no credential value was copied**

  Review the new direction document and ensure it refers only to the existence
  of an operator-provided test password, not the password or any derived hash.

## Task 2: Write the Dated Project Plan

**Files:**
- Create: `docs/plan/20261014/20261014_005_document_test_account_password_reset_계획서.md`

- [x] **Step 1: Document the sequence**

  Link to the direction and approved design. Record the order: detail the
  SQL contract, author mirrored SQL/history artifacts, perform static
  validation, and report that execution is left to an authorized operator.

- [x] **Step 2: Record non-reversibility**

  Explain that the prior password hash is intentionally not backed up, so
  rollback after a successful commit is not provided. A subsequent authorized
  reset can set a new password.

## Task 3: Write the Detailed SQL Specification

**Files:**
- Create: `docs/spec/20261014/20261014_005_document_test_account_password_reset_상세사양서.md`

- [x] **Step 1: Specify hash inputs**

  Define session settings `app.document_test_user_hash_01` through
  `app.document_test_user_hash_10`. Each must be the 44-character Base64
  SHA-256 result of the existing
  `EgovFileScrty.encryptPassword(password, login_code)` contract for its
  corresponding login code. Do not put sample or real hashes in documentation.

- [x] **Step 2: Specify guarded update behavior**

  Require one active tenant row, exactly ten active matching login accounts,
  ten present and well-formed hashes, and row locks before update. Update only
  `password_hash`, `password_changed_at`, `login_attempt_count`, `locked_at`,
  and `updated_at`. Require exactly ten updated rows; fail the transaction
  otherwise. Preserve roles, profiles, permissions, and `use_at`.

- [x] **Step 3: Specify invocation and verification limits**

  Require a single PostgreSQL session and psql stop-on-error behavior. State
  that this repository task only statically validates the script; it does not
  set session secrets, connect for writes, apply the script, or test login.

## Task 4: Test and Add the Reset SQL and Matched History

**Files:**
- Create: `tools/tests/test_document_test_account_password_reset.cjs`
- Create: `docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql`
- Create: `docs/database/20261014/20261014_002_change_test_account_passwords.md`
- Create: `backend/DATABASE/20261014/20261014_002_reset_document_test_account_passwords.sql`
- Create: `backend/DATABASE/20261014/20261014_002_change_test_account_passwords.md`

- [x] **Step 1: Write the failing SQL contract test**

  Create an offline standard-library unittest that checks the exact ten
  login-code/session-setting pairs, input and account guards before the
  update, row locking, tenant/active-state scope, only the five allowed update
  columns, psql stop-on-error, and the absence of literal password/hash
  assignments.

  ```javascript
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const test = require('node:test');

  const sqlPath = path.resolve(
    __dirname,
    '../../docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql',
  );
  const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';

  test('reset SQL exists', () => {
    assert.ok(fs.existsSync(sqlPath), 'Reset SQL file has not been created');
  });

  test('maps all ten login codes to matching session hashes', () => {
    const pairs = [...sql.matchAll(
      /\('(doc-write-test-user-\d{2})', current_setting\('(app\.document_test_user_hash_\d{2})', true\)\)/g,
    )].map(([, code, setting]) => [code, setting]);
    const expected = Array.from({ length: 10 }, (_, index) =>
      String(index + 1).padStart(2, '0'),
    );
    assert.deepEqual(pairs.map(([code]) => code.slice(-2)), expected);
    assert.deepEqual(pairs.map(([, setting]) => setting.slice(-2)), expected);
    assert.equal(new Set(pairs.map(([code]) => code)).size, 10);
    assert.equal(new Set(pairs.map(([, setting]) => setting)).size, 10);
  });

  test('checks inputs, target accounts, and row locks before update', () => {
    const updateAt = sql.indexOf('UPDATE public.tb_login_account');
    assert.ok(updateAt > 0);
    for (const guard of [
      'Ten account-specific SHA-256/Base64 hashes are required',
      'Expected exactly one active target tenant',
      'Expected exactly ten active target login accounts',
      'FOR UPDATE OF account',
    ]) {
      assert.ok(sql.indexOf(guard) >= 0 && sql.indexOf(guard) < updateAt, guard);
    }
  });

  test('updates only approved fields and scopes active tenant accounts', () => {
    const setClause = sql.match(/SET([\s\S]*?)FROM public\.tb_tenant/);
    assert.ok(setClause);
    const columns = [...setClause[1].matchAll(/^\s*([a-z_]+)\s*=/gm)]
      .map(([, column]) => column);
    assert.deepEqual(columns, [
      'password_hash',
      'password_changed_at',
      'login_attempt_count',
      'locked_at',
      'updated_at',
    ]);
    assert.ok(sql.includes("tenant.tenant_code = 'T1358606250'"));
    assert.ok(sql.includes("tenant.use_at = 'Y'"));
    assert.ok(sql.includes("account.use_at = 'Y'"));
    assert.ok(sql.includes('updated_count <> 10'));
  });

  test('fails fast and does not embed literal password hashes', () => {
    assert.ok(sql.includes('\\set ON_ERROR_STOP on'));
    assert.doesNotMatch(sql, /password_hash\s*=\s*'[^']+'/i);
    assert.doesNotMatch(sql, /'[A-Za-z0-9+/]{43}='/);
  });
  ```

- [x] **Step 2: Run the test and confirm it fails for the missing SQL**

  Run: `node --test tools/tests/test_document_test_account_password_reset.cjs`

  Expected before implementation: the suite fails because the reset SQL file
  does not yet exist and its contract is absent.

- [x] **Step 3: Write the guarded SQL**

  Implement the tested contract. Put the psql `\set ON_ERROR_STOP on` before
  `BEGIN`. Stage all ten `current_setting(..., true)` values in a temporary
  table that allows NULL so the custom hash-validation exception runs for
  missing inputs. Check all ten hash formats, the one active tenant, and ten
  active target accounts before updating; lock the matching account rows with
  `FOR UPDATE`. Update the five approved columns and check the row count before
  `COMMIT`.

- [x] **Step 4: Run the test and confirm it passes**

  Run: `node --test tools/tests/test_document_test_account_password_reset.cjs`

  Expected: all five tests pass without connecting to PostgreSQL.

- [x] **Step 5: Write the change-history document**

  Record date `2026-10-14`, the target account scope, only the five changed
  columns, impact (test-account password and lock/failure state), and the
  non-reversible/no-prior-hash-backup decision. Do not include account-row
  data, password values, or hashes.

- [x] **Step 6: Mirror the artifacts**

  Copy the SQL and history contents byte-for-byte to their matching
  `backend/DATABASE/20261014/` paths. Do not add or modify the existing
  `20261014_001` scripts.

## Task 5: Write the Result Record

**Files:**
- Create: `docs/result/20261014/test-account-password-reset/RESULT.md`

- [x] **Step 1: Record implementation and limits**

  Link the direction, plan, spec, SQL, and history. Report static validation
  only, explicitly state that neither the read-only MCP nor any other DB
  client was used to write, and make no claim that the password was applied or
  login succeeded. Do not include passwords, hashes, or tenant row data.

## Task 6: Validate the Artifacts

**Files:**
- Validate the artifacts listed above; do not change unrelated existing files.

- [x] **Step 1: Check whitespace**

  Run this PowerShell check from the repository root over the new task files:

  ```powershell
  $files = @(
      "docs\directions\20261014\20261014_005_document_test_account_password_reset_작업지시서.md",
      "docs\plan\20261014\20261014_005_document_test_account_password_reset_계획서.md",
      "docs\spec\20261014\20261014_005_document_test_account_password_reset_상세사양서.md",
      "docs\database\20261014\20261014_002_reset_document_test_account_passwords.sql",
      "docs\database\20261014\20261014_002_change_test_account_passwords.md",
      "backend\DATABASE\20261014\20261014_002_reset_document_test_account_passwords.sql",
      "backend\DATABASE\20261014\20261014_002_change_test_account_passwords.md",
      "tools\tests\test_document_test_account_password_reset.cjs",
      "docs\result\20261014\test-account-password-reset\RESULT.md"
  )
  $matches = Select-String -Path $files -Pattern '[ \t]+$'
  if ($matches) { throw "Trailing whitespace found in task files" }
  ```

  Expected: the command completes without output or error.

- [x] **Step 2: Check mirrored file equality**

  Run this PowerShell check from the repository root:

  ```powershell
  $pairs = @(
      @("docs\database\20261014\20261014_002_reset_document_test_account_passwords.sql", "backend\DATABASE\20261014\20261014_002_reset_document_test_account_passwords.sql"),
      @("docs\database\20261014\20261014_002_change_test_account_passwords.md", "backend\DATABASE\20261014\20261014_002_change_test_account_passwords.md")
  )
  foreach ($pair in $pairs) {
      $left = (Get-FileHash -Algorithm SHA256 -LiteralPath $pair[0]).Hash
      $right = (Get-FileHash -Algorithm SHA256 -LiteralPath $pair[1]).Hash
      if ($left -ne $right) { throw "Database artifact copies differ: $($pair[0])" }
  }
  ```

  Expected: the command completes without output or error.

- [x] **Step 3: Run the SQL contract test**

  Run: `node --test tools/tests/test_document_test_account_password_reset.cjs`

  Expected: all five tests pass.

- [x] **Step 4: Confirm no database write or schema change**

  Do not execute the SQL, use the read-only DB MCP for writes, or modify
  `docs/database/db-schema.md`. Record the no-write limitation in `RESULT.md`.

## Execution Handoff

The reset SQL remains for an authorized operator to run with ten prepared
session hashes and psql stop-on-error enabled. Agent completion means the
guarded artifacts and static checks are complete; it does not mean any account
was reset or login was tested.
