# Document Test Account Password Reset Design

> Superseded for operator execution by [the psql-direct design](./2026-10-14-document-test-account-password-reset-psql-design.md), which replaces externally supplied session hashes with an approved visible psql prompt.

## Goal

Provide a guarded, SQL-only reset script for the ten document user-picker test
accounts in tenant `T1358606250`. The script must not contain the supplied
password or any password-derived hash, and it must not be run against the
database as part of this task.

## Scope

- Target login codes `doc-write-test-user-01` through
  `doc-write-test-user-10`, scoped to tenant code `T1358606250`.
- Read the ten account-specific SHA-256/Base64 hashes from PostgreSQL session
  settings `app.document_test_user_hash_01` through
  `app.document_test_user_hash_10`. The operator prepares these values outside
  the SQL file using the existing `EgovFileScrty.encryptPassword(password,
  login_code)` contract.
- Validate that all ten hashes are present and have the expected 44-character
  Base64 SHA-256 form before changing persistent rows.
- Validate that exactly ten active target login accounts exist. Lock the
  matched rows for the transaction and fail closed if the tenant, account
  count, active state, or hash inputs do not match expectations.
- In one transaction, update only `password_hash`, `password_changed_at`,
  `login_attempt_count`, `locked_at`, and `updated_at` for those ten rows.
  Preserve user profiles, roles, permissions, and account activation state.
- Keep matching SQL and change-history copies under
  `docs/database/20261014` and `backend/DATABASE/20261014`.
- Include dated direction, plan, detailed specification, and result
  documentation according to the repository workflow.

## Alternatives Considered

1. **SQL plus a secure PowerShell runner:** the runner could prompt without
   echo and derive all ten hashes at runtime, but this adds a second executable
   artifact and was not selected.
2. **SQL-only script with externally supplied session hashes (selected):**
   keeps credential generation outside the repository and the database script
   focused on guarded data updates. The operator must calculate and set each
   account-specific hash in the same PostgreSQL session before running it.
3. **Hard-code the password or hashes in SQL:** rejected because the credential
   or an equivalent authentication secret would be persisted in source control.

## Failure and Safety Behavior

- Missing or malformed hash settings, an absent or ambiguous tenant, or a
  target account count other than ten must raise an explicit error before any
  persistent update.
- Any update-count mismatch must raise an error inside the open transaction;
  execution instructions must require the client's stop-on-error behavior so
  the failed transaction is not committed.
- A successful reset has no rollback script. The prior password hash is not
  retained because it is an authentication-equivalent secret; a later change
  must be performed as a new authorized reset.
- The script is a data update, not a schema change. It does not alter role
  definitions or permissions.
- Read-only DB MCP remains read-only. Script verification is static; database
  application and real login verification are not claimed.
- Documentation and test output must not include the password, hashes,
  connection credentials, or tenant row data.

## Acceptance Criteria

- The SQL references only the ten approved test login codes in the specified
  tenant and validates a one-to-one hash input mapping.
- All preconditions are checked before the account update.
- Only the specified password and login lock/failure metadata columns change.
- The script and corresponding history file match their backend copies.
- Static validation confirms that neither the supplied password nor any
  derived hash appears in repository artifacts.
- No database write is performed by the agent.
