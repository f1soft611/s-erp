# Document User Picker Login-Account Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared-login test-profile seed with ten independently login-capable test users so form-list joins cannot multiply rows.

**Architecture:** Keep application queries unchanged and repair the test-data cardinality. Each exact test profile gets one unique active `tb_login_account`, one existing tenant-scoped `DEFAULT_USER` role mapping, and one account-specific `EgovFileScrty` hash provided only through session-local PostgreSQL settings at execution. Duplicate-safe upserts update only the marked test records; rollback removes only their linked records.

**Tech Stack:** PostgreSQL, MyBatis contract inspection, Markdown project records, PowerShell/Python static validation.

---

## File Map

- Create `docs/directions/20261007/20261007_005_document_user_picker_login_accounts_작업지시서.md`, `docs/plan/20261007/20261007_005_document_user_picker_login_accounts_계획서.md`, and `docs/spec/20261007/20261007_005_document_user_picker_login_accounts_사양서.md` to supersede the profile-only assumptions for the current seed.
- Modify `docs/database/20261007/20261007_001_seed_document_user_picker_test_users.sql` and copy the exact bytes to `backend/DATABASE/20261007/20261007_001_seed_document_user_picker_test_users.sql`.
- Modify `docs/database/20261007/20261007_001_rollback.sql` and copy the exact bytes to `backend/DATABASE/20261007/20261007_001_rollback.sql`.
- Update both copies of `20261007_001_document_user_picker_test_users_change_schema.md` to record that the seed now creates test login accounts and account-role mappings; there is no schema DDL.
- Update `docs/result/20261007/document-user-picker-test-users/RESULT.md` with a dated follow-up and link to the new correction result so its description matches the current SQL.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` with the row identity requirement: every row passed to F1-Grid must have a stable unique `rowKey`; repeated API rows with repeated row keys can produce overlapping or omitted rows.
- Create `docs/result/20261007/document-user-picker-login-account-seed/RESULT.md` with root-cause evidence, validation results, MCP limits, and deployment instructions. Do not include real tenant row values or credentials.

## Task 1: Record the Corrected Requirements

**Files:**
- Create the dated direction, plan, and specification listed in the file map.
- Update the existing test-user result with a superseding follow-up.

- [ ] **Step 1: Write the direction from verified evidence**

Record that the previous seed reused one `login_id` across ten profiles, while `selectWorkList` joins reviewer/approver `tb_user` rows by `tenant_id` and `login_id`. Require unique test login accounts, one-to-one profile links, the existing active tenant `DEFAULT_USER` role, and per-account hashes supplied outside the repository.

- [ ] **Step 2: Write the implementation plan and detailed specification**

Specify exact login codes `doc-write-test-user-01` through `doc-write-test-user-10`, existing names and `.invalid` emails, account-specific GUC names `app.document_test_user_hash_01` through `app.document_test_user_hash_10`, hash format of 44-character SHA-256/Base64 output from `EgovFileScrty.encryptPassword(password, login_code)`, role lookup constrained to the same tenant, explicit failure when required seed context is absent, and exact rollback boundaries.

- [ ] **Step 3: Update the previous seed result as superseded**

Append a follow-up stating that the old profile-only seed reused a login identity, the current correction supersedes that data contract, and the original result describes the earlier revision only.

## Task 2: Correct the Seed and Rollback

**Files:**
- Modify the seed and rollback SQL under both `docs/database/20261007` and `backend/DATABASE/20261007`.
- Modify the paired change-history documents under both roots.

- [ ] **Step 1: Validate the ten external hashes before writing data**

At the start of the transaction, load the ten `current_setting('app.document_test_user_hash_NN', true)` values into a temporary seed relation. Abort if any is missing or does not match `^[A-Za-z0-9+/]{43}=$`. The SQL must never contain plaintext passwords or committed hash values.

- [ ] **Step 2: Validate the tenant, anchor profile, and role**

Find one active non-test profile with an active login account; use only its tenant, department, and level. Require an active `DEFAULT_USER` role in that same tenant and raise an exception if either prerequisite is absent. Never choose one of the ten marked test profiles as the anchor.

- [ ] **Step 3: Guard login-code collisions**

Before upserting accounts, fail if any target `doc-write-test-user-NN` login code in the anchor tenant is already attached to a non-test user or is not linked to its exact marked test profile. Ignore identical login codes in other tenants because login-code uniqueness is tenant-scoped. A rerun may update only the account already connected to its exact marked test profile.

- [ ] **Step 4: Upsert ten unique active accounts and role links**

Insert or update one account per login code using its validated hash and active status. Resolve each generated `login_id` by `(tenant_id, login_code)`, insert the corresponding `(login_id, DEFAULT_USER role_id)` link with conflict protection, then upsert the exact `(tenant_id, email_addr)` test profile with that account's `login_id` and the anchor department/level. Existing profiles are corrected in place; original tenant profiles are not updated.

- [ ] **Step 5: Make rollback remove only isolated test records**

Identify the ten exact profile name/email pairs and their matching test login codes in one test tenant. Delete only their `tb_user` rows and associated `tb_login_account_role` links. Delete an account only if its login code matches the fixed test code, it is in the test tenant, and no remaining `tb_user` references its `login_id`. Never delete the anchor user, shared/default role, or role permissions.

- [ ] **Step 6: Mirror SQL and history files**

Copy the finalized SQL and history content byte-for-byte between `docs/database/20261007` and `backend/DATABASE/20261007`.

## Task 3: Document the Row Identity Contract and Outcome

**Files:**
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`.
- Create `docs/result/20261007/document-user-picker-login-account-seed/RESULT.md`.
- Modify the existing profile-seed result only with its superseding note.

- [ ] **Step 1: Document unique `rowKey` requirements**

Add a concise data-source contract stating that incoming rows must have distinct stable row-key values and that SQL join fan-out must be corrected at its source rather than hidden by arbitrary row selection.

- [ ] **Step 2: Record evidence and validation**

Record the observed duplicate row-key count and React duplicate-key warning without copying displayed tenant data, document that database writes and password values were not inspected or executed, and include the exact operator pre-run requirement to set ten session-local hash settings in the same PostgreSQL session before running the seed.

## Task 4: Verify Without Exposing or Mutating Tenant Data

**Files:**
- No additional files.

- [ ] **Step 1: Check the hash gate and account mapping requirements**

Run a bounded static check that confirms the seed names exactly ten unique login codes, reads all ten expected settings, enforces the SHA-256/Base64 shape, uses same-tenant `DEFAULT_USER`, updates only the marked test users, and has no literal password or hash.

- [ ] **Step 2: Check rollback isolation**

Statically verify that rollback restricts deletion to the exact fixed test emails/names/login codes, removes role mappings before accounts, and preserves accounts referenced by any remaining user profile.

- [ ] **Step 3: Check paired file equality and documents**

Use PowerShell `Get-FileHash -Algorithm SHA256` on each docs/backend SQL and change-history pair. Run the focused F1-Grid docs test: `Set-Location frontend; npx vitest run tests/f1-grid-docs.test.tsx --maxWorkers=1 --testTimeout=30000`.

- [ ] **Step 4: Record validation limits**

Do not execute writes through the read-only MCP. If no writable test database is explicitly available, state that the SQL transaction and actual test logins remain unexecuted and require operator verification after applying the seed.

## Completion Checks

- The original shared `login_id` is replaced by one distinct active account for each of the ten test profiles.
- Each test account has the active `DEFAULT_USER` role in the same tenant and a hash supplied only at seed execution.
- Rerunning the seed does not create extra accounts, profiles, or role links.
- Rollback removes only the ten marked profiles and their unreferenced test accounts.
- The SQL/history copies match and the F1-Grid row-key data contract is documented.
- No user passwords, password hashes, authentication material, or tenant row data appear in committed artifacts.
