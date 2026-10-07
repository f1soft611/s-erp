# Document User Picker Test Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an idempotent SQL seed for ten test profiles that appear in the document composer user picker.

**Architecture:** Keep the picker and schema unchanged. Insert ten marked `tb_user` rows into the tenant of the existing active account-backed user, reusing its `login_id`, department, and level because the picker query requires an active linked `tb_login_account`. Store identical seed, rollback, and change-history files in `docs/database` and `backend/DATABASE`.

**Tech Stack:** PostgreSQL SQL, repository Markdown task/spec/result documents, read-only PostgreSQL MCP metadata.

---

## File Structure

- Create `docs/directions/20261007/20261007_004_document_user_picker_test_data_작업지시서.md` for the approved user-visible objective and acceptance criteria.
- Create `docs/plan/20261007/20261007_004_document_user_picker_test_data_계획서.md` and `docs/spec/20261007/20261007_004_document_user_picker_test_data_사양서.md` following the required project workflow.
- Create matching seed SQL, rollback SQL, and change record under `docs/database/20261007/` and `backend/DATABASE/20261007/`.
- Create `docs/result/20261007/document-user-picker-test-users/RESULT.md` with implementation and verification evidence. Do not claim the records are live until a database owner applies the seed.

## Task 1: Add the dated direction, plan, and detailed specification

**Files:**
- Create: `docs/directions/20261007/20261007_004_document_user_picker_test_data_작업지시서.md`
- Create: `docs/plan/20261007/20261007_004_document_user_picker_test_data_계획서.md`
- Create: `docs/spec/20261007/20261007_004_document_user_picker_test_data_사양서.md`

- [ ] **Step 1: Write the task direction**

State the request as ten clearly labeled test profiles for document composing, with no new login accounts, passwords, table changes, or application code. Define acceptance as idempotent seed and targeted rollback, with all ten records active and linked to an active account in the tenant containing the existing active account-backed user.

- [ ] **Step 2: Write the plan document**

Record the file locations, SQL mirroring check, targeted static validation, and the restriction that no write will be sent through the read-only MCP.

- [ ] **Step 3: Write the detailed specification**

Document all ten names/emails, the `tb_user` fields populated, the active-account join requirement from `DraftingWork_SQL_postgresql.xml`, reapplication behavior, rollback scope, and the failure behavior when there is no active account-backed anchor.

## Task 2: Create the paired idempotent seed and rollback SQL

**Files:**
- Create: `docs/database/20261007/20261007_001_seed_document_user_picker_test_users.sql`
- Create: `docs/database/20261007/20261007_001_rollback.sql`
- Create: `backend/DATABASE/20261007/20261007_001_seed_document_user_picker_test_users.sql`
- Create: `backend/DATABASE/20261007/20261007_001_rollback.sql`

- [ ] **Step 1: Add the guarded seed**

Use this SQL shape in both seed files. It fails if there is no active account-backed anchor, selects the earliest eligible profile so reruns keep the original anchor, and uses identity-generated user IDs.

```sql
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_user u
        JOIN public.tb_login_account la
          ON la.login_id = u.login_id
         AND la.tenant_id = u.tenant_id
         AND la.use_at = 'Y'
        WHERE u.use_at = 'Y'
    ) THEN
        RAISE EXCEPTION 'No active account-backed user is available for document picker test data';
    END IF;
END;
$$;

WITH seed_users (user_nm, email_addr) AS (
    VALUES
        ('문서작성 테스트 사용자 01', 'doc-write-test-user-01@example.invalid'),
        ('문서작성 테스트 사용자 02', 'doc-write-test-user-02@example.invalid'),
        ('문서작성 테스트 사용자 03', 'doc-write-test-user-03@example.invalid'),
        ('문서작성 테스트 사용자 04', 'doc-write-test-user-04@example.invalid'),
        ('문서작성 테스트 사용자 05', 'doc-write-test-user-05@example.invalid'),
        ('문서작성 테스트 사용자 06', 'doc-write-test-user-06@example.invalid'),
        ('문서작성 테스트 사용자 07', 'doc-write-test-user-07@example.invalid'),
        ('문서작성 테스트 사용자 08', 'doc-write-test-user-08@example.invalid'),
        ('문서작성 테스트 사용자 09', 'doc-write-test-user-09@example.invalid'),
        ('문서작성 테스트 사용자 10', 'doc-write-test-user-10@example.invalid')
),
anchor AS (
    SELECT u.tenant_id, u.login_id, u.department_id, u.level_id
    FROM public.tb_user u
    JOIN public.tb_login_account la
      ON la.login_id = u.login_id
     AND la.tenant_id = u.tenant_id
     AND la.use_at = 'Y'
    WHERE u.use_at = 'Y'
    ORDER BY u.user_id
    LIMIT 1
)
INSERT INTO public.tb_user (
    tenant_id, login_id, user_nm, email_addr, department_id, level_id, use_at
)
SELECT anchor.tenant_id, anchor.login_id, seed_users.user_nm, seed_users.email_addr,
       anchor.department_id, anchor.level_id, 'Y'
FROM anchor
CROSS JOIN seed_users
ON CONFLICT (tenant_id, email_addr) DO NOTHING;

COMMIT;
```

- [ ] **Step 2: Add the targeted rollback**

Use the same ten exact name/email pairs in both rollback files. Delete only matching test profiles; do not delete login accounts, departments, or any account-linked row that does not match both markers.

```sql
BEGIN;

WITH seed (user_nm, email_addr) AS (
    VALUES
        ('문서작성 테스트 사용자 01', 'doc-write-test-user-01@example.invalid'),
        ('문서작성 테스트 사용자 02', 'doc-write-test-user-02@example.invalid'),
        ('문서작성 테스트 사용자 03', 'doc-write-test-user-03@example.invalid'),
        ('문서작성 테스트 사용자 04', 'doc-write-test-user-04@example.invalid'),
        ('문서작성 테스트 사용자 05', 'doc-write-test-user-05@example.invalid'),
        ('문서작성 테스트 사용자 06', 'doc-write-test-user-06@example.invalid'),
        ('문서작성 테스트 사용자 07', 'doc-write-test-user-07@example.invalid'),
        ('문서작성 테스트 사용자 08', 'doc-write-test-user-08@example.invalid'),
        ('문서작성 테스트 사용자 09', 'doc-write-test-user-09@example.invalid'),
        ('문서작성 테스트 사용자 10', 'doc-write-test-user-10@example.invalid')
),
anchor_tenant AS (
    SELECT u.tenant_id
    FROM public.tb_user u
    JOIN seed ON seed.user_nm = u.user_nm
             AND seed.email_addr = u.email_addr
    ORDER BY u.user_id
    LIMIT 1
)
DELETE FROM public.tb_user u
USING seed, anchor_tenant
WHERE u.user_nm = seed.user_nm
  AND u.email_addr = seed.email_addr
  AND u.tenant_id = anchor_tenant.tenant_id;

COMMIT;
```

- [ ] **Step 3: Verify mirrored SQL files**

Run `git diff --no-index -- docs/database/20261007/20261007_001_seed_document_user_picker_test_users.sql backend/DATABASE/20261007/20261007_001_seed_document_user_picker_test_users.sql` and the equivalent command for rollback. Both comparisons must report no differences.

## Task 3: Record the database change and validate the deliverable

**Files:**
- Create: `docs/database/20261007/20261007_001_document_user_picker_test_users_change_schema.md`
- Create: `backend/DATABASE/20261007/20261007_001_document_user_picker_test_users_change_schema.md`
- Create: `docs/result/20261007/document-user-picker-test-users/RESULT.md`
- Create: `docs/result/20261007/document-user-picker-test-users/screenshots/` only if a truthful user-picker verification screenshot can be captured after data is applied.

- [ ] **Step 1: Write the change record in both database directories**

Record date `2026-10-07`, affected table `tb_user`, ten active test profiles, no schema alteration or new authentication credentials, matching seed/rollback paths, expected user-picker visibility, and rollback procedure. State that the read-only MCP metadata confirmed the `tb_user`, `tb_login_account`, and `tb_department` columns, while the limited count query failed with `Database request failed`; use the existing schema DDL and user-options Mapper SQL as fallback evidence.

- [ ] **Step 2: Check static invariants**

Verify each seed file has exactly ten distinct `.invalid` email values and ten distinct names, sets `use_at` to `'Y'`, joins an active account in the same tenant, uses `ON CONFLICT (tenant_id, email_addr) DO NOTHING`, and never writes to `tb_login_account`. Verify rollback uses the exact same ten name/email pairs. Run `git diff --check`.

- [ ] **Step 3: Compare duplicated change records**

Use `git diff --no-index` to verify the `docs/database` and `backend/DATABASE` change records match exactly.

- [ ] **Step 4: Write the result report**

Document files created, static checks performed, MCP query failure/fallback evidence, and whether live database/UI verification was possible. Do not apply the seed using the read-only MCP. Do not claim the selector contains the new users until the seed is run in the target database; only then capture a screenshot that shows the added options.

## Completion Criteria

- Both seed copies and both rollback copies are identical.
- The seed adds ten active `tb_user` profiles only, uses generated IDs, and is safe to rerun.
- Every inserted row links to the existing active account and remains in the matching tenant.
- The rollback matches only the ten specifically named test profiles.
- Dated direction, plan, spec, change records, and result record are present.
- Any statement about live selector visibility is backed by a post-application check; otherwise, clearly identify it as pending database application.
