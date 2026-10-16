# Psql-Direct Document Test Account Password Reset Design

## Goal

Make the approved password-reset SQL runnable directly in `psql`, without a
separate PowerShell helper or manually prepared hash GUCs.

## Approved Design

- Keep the reset scoped to tenant `T1358606250` and the ten fixed
  `doc-write-test-user-01` through `doc-write-test-user-10` accounts.
- Use psql `\prompt` to read one reset password and immediately calculate the
  ten account-specific Base64 SHA-256 values on the PostgreSQL server:
  `encode(sha256(convert_to(login_code, 'UTF8') ||
  convert_to(password, 'UTF8')), 'base64')`.
- Insert the results into the existing transaction-scoped temporary mapping
  table; unset the psql variable before the existing validation and update
  blocks. Retain all existing tenant/account checks, row locks, allowed update
  columns, row-count check, and transaction behavior.
- Do not embed the password in the SQL file or execute the SQL from the agent.

## Security Trade-off

psql `\prompt` does not hide typed input, and psql variable substitution sends
the password as part of the SQL statement. The value may appear on screen and
in server statement logs. The user explicitly accepted this exposure for the
requested psql-only workflow. The SQL header and operator documentation must
state the risk and advise execution only in a trusted terminal/environment.

## Evidence

Read-only DB MCP metadata confirmed the relevant login-account and tenant
columns. A restricted read-only metadata query confirmed server version 18.4
and availability of the built-in `sha256(bytea)` function. No database writes
were performed.

## Validation

- Static tests validate psql prompt, fixed account mapping, hash expression,
  psql variable cleanup, and the original fail-closed SQL guards.
- Mirrored SQL and change-history files must remain byte-identical.
- Database application and actual account login verification remain operator
  actions.
