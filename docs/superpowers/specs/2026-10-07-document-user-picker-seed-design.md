# Document User Picker Test Seed Design

## Goal

Add ten selectable test profiles to the document composer user picker so approval and reference fields can be tested with more than the current user.

## Scope

- Add data rows to `tb_user`; do not change table definitions, application code, or user-picker behavior.
- Keep the records in the same tenant as the existing active account-backed user so the current tenant-scoped picker can find them.
- Reuse that user's active `tb_login_account`, department, and level. Do not create login accounts, credentials, or departments.
- Use clearly marked test names and reserved `.invalid` email addresses.
- Provide an idempotent insert script and a targeted rollback script in both `docs/database` and `backend/DATABASE`, with a dated change record.
- Add the required task direction, plan, detailed specification, and result record.

## Data Flow and Eligibility

The document user-options query joins `tb_user` to `tb_login_account` on both login and tenant IDs. It requires both rows to have `use_at = 'Y'` and filters by the authenticated tenant. Therefore, a `tb_user` row without an active linked account will not appear. The seed will reuse the one existing active account-backed profile, creating ten additional active user profiles in its tenant and retaining its department and level references.

The seed will locate the existing active account-backed profile by ascending `user_id`, which keeps reruns anchored to the original row because the test rows receive later identity values. It will fail explicitly if no eligible anchor exists. User IDs remain database-generated. Stable, unique test emails and `ON CONFLICT (tenant_id, email_addr) DO NOTHING` will make reapplication safe.

## Alternatives Considered

1. **Test profiles linked to the existing account (selected):** Satisfies the current picker join without adding authentication credentials or changing schema.
2. **Create a separate login account for each profile:** Produces independent identities but requires password and authentication policy decisions that are unnecessary for selection-only testing.
3. **Create `tb_user` rows without login links:** The current query excludes these rows, so they would not meet the requirement.

## Safety and Rollback

The insert is limited to ten named test profiles and does not alter existing profile or account rows. The paired rollback removes only rows matching the fixed test email/name markers in the anchor tenant; it does not delete the reused account, department, or other users. No database mutation will be run through the read-only MCP.

## Verification

- Verify the SQL inserts exactly ten active profiles, with unique reserved test emails and a valid active account link.
- Verify repeated execution does not add duplicates.
- Verify rollback targets only the ten marked test profiles.
- The read-only MCP table-list and table-description calls succeeded. A limited read-only count query failed with `Database request failed`; use the repository's login schema seed, current user-options MyBatis query, and table metadata as fallback contract evidence.
- After applying the script in the target environment, confirm the ten names appear in the document composer user picker.
