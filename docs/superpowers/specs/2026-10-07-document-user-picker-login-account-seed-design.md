# Document User Picker Login-Account Seed Design

## Goal

Correct the document-picker test data so each of its ten active user profiles
has a distinct login account and the form-list query returns one row per form.
Keep the test accounts usable for login with the least-privileged existing
general-user role, without placing passwords or password hashes in the
repository.

## Verified Cause

The existing test-user seed attached ten `tb_user` profiles to the same
`login_id`. `selectWorkList` joins reviewer and approver profiles by
`tenant_id` and `login_id`; each profile sharing that login ID multiplies the
matching form rows. The shared browser page showed 32 data rows whose stable
row IDs repeated as `1`, `2`, and `3`, along with React duplicate-key warnings.

The user-options query separately joins `tb_user` to active
`tb_login_account` rows by tenant and login ID. Reusing one account made the
profiles selectable, but did not make them independent login identities.

## Design

- Correct the existing ten test profiles in place, preserving their names,
  reserved `.invalid` email addresses, tenant, department, and level.
- Create one uniquely named active `tb_login_account` for each test profile,
  using a matching `doc-write-test-user-NN` login code; update each profile to
  reference only its own account.
- Map each account to the tenant's existing active `DEFAULT_USER` role, the
  configured general-user role. Do not create or change roles or menu
  permissions.
- Require ten account-specific hashes, each generated outside the repository
  with `EgovFileScrty.encryptPassword(password, login_code)`. The SQL reads the
  hash values from session-local PostgreSQL settings and aborts before data
  changes if a hash is absent or malformed. Never store plaintext passwords or
  hash values in committed files.
- Make reruns update only the exact marked test profiles/accounts and preserve
  a one-to-one account mapping. Make rollback remove those test profiles,
  their role links, and their accounts only when no other profile references
  those accounts.
- Do not modify the form-list query or F1-Grid renderer. Correct the bad
  cardinality at the test-data source.

## Alternatives

1. **Give each test profile its own login account and general-user role
   (selected):** fixes the duplicate-join cause and supports independent test
   logins.
2. **Choose one `tb_user` row in the form-list query:** hides an invalid
   many-profiles-to-one-account mapping and could select the wrong display
   identity.
3. **Keep shared-account profiles:** keeps picker candidates but continues to
   multiply list rows and cannot provide independent login identities.

## Verification

- Inspect table/role metadata through the read-only database MCP; do not query
  or expose user/account data rows.
- Check the seed's exact ten login codes, per-account hash validation,
  `DEFAULT_USER` tenant scope, idempotent profile/account/role mapping, and
  rollback isolation.
- Confirm the seed and rollback copies match under `docs/database` and
  `backend/DATABASE`.
- Do not run writes through the read-only MCP. After a privileged operator
  applies the seed, confirm the list returns each form once and each test
  account authenticates using its separately provisioned password.
