# Document Test Account Password Reset Runner Design

## Goal

Make the existing guarded password-reset SQL usable without manually preparing
ten account-specific hashes. Preserve the SQL's existing safety checks and do
not store the password or any derived hash in repository files, shell history,
terminal output, or SQL text sent as a literal.

## Approved Scope

- Keep `docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql`
  unchanged as the guarded database update.
- Add a local PowerShell runner that starts a separate `psql` process. It
  prompts locally for connection details, obtains the database password and
  reset password using non-echoing secure input, computes the ten hashes in
  memory, and supplies them to that psql session.
- Reuse the existing account list, tenant scope, update fields, transaction,
  row locks, and pre/postcondition checks in the SQL file.
- Do not access or reuse VS Code's active database connection or read saved
  credentials.
- Do not execute the reset from the agent. The user explicitly starts the
  runner and confirms its target connection.

## Data Flow

1. The runner locates `psql.exe` or asks for its local path, then prompts for
   host, port, database, and database user.
2. It obtains the database password and new account password using hidden
   interactive input. Neither value is written to a file or command argument.
3. For each of the ten fixed login codes, it computes Base64(SHA-256(UTF-8
   login-code bytes followed by UTF-8 password bytes)), matching the backend
   login hash contract.
4. It starts `psql` with the connection fields and a child-process-only
   `PGPASSWORD` environment value. It streams the hashes using PostgreSQL
   `COPY FROM STDIN` into a temporary staging table, then uses `set_config`
   from that table to populate the session settings expected by the existing
   SQL. The COPY payload is not written to a script or temporary file.
5. It streams the unchanged SQL file to the same psql session and clears the
   temporary session settings after successful completion. The temporary table
   and all reset writes remain scoped to that database session/transaction.

## Failure and Safety Behavior

- Enable psql `ON_ERROR_STOP`; on any SQL failure, stop sending commands and
  close the process so PostgreSQL rolls back an open transaction.
- Validate the psql executable, connection inputs, and password presence
  before starting the database update. Propagate psql's nonzero exit code and
  error output; never report success on failure.
- Never print, persist, or pass secrets as command-line arguments. Keep
  password and hash values only in process memory and clear mutable buffers
  where the runtime permits. The database password is exposed to the child
  process through its environment only while psql runs.
- Do not change the database schema, account scope, reset behavior, or
  rollback policy. The existing SQL's `COMMIT` is the only successful commit.
- A failed previous attempt shown in the provided psql transcript ended in
  `ROLLBACK`; it did not change target account data.

## Alternatives Considered

1. **Manually set ten hash GUCs:** requires an additional hash-generation and
   safe session-input procedure, which caused the observed precondition error.
2. **Embed or prompt for the password in SQL:** rejected because psql variable
   substitution can place the password in SQL text/logs, and a prompt is not a
   reliable hidden-input mechanism.
3. **Local PowerShell runner with COPY input (selected):** keeps the existing
   SQL and guards intact, computes hashes locally, and avoids persisting the
   hashes or including them as SQL literals.

## Validation

- Add static tests for hash-to-login-code mapping, UTF-8/SHA-256/Base64
  derivation, COPY/session-setting handoff, psql stop-on-error, and absence of
  hardcoded credentials or hashes.
- Exercise failure handling without connecting to or modifying a database.
- Verify documentation and SQL copies remain synchronized.
- Actual database application and login verification remain operator actions
  and must not be claimed from static checks.
