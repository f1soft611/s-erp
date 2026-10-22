# Groupware Schema and Common Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a PostgreSQL groupware schema baseline and an idempotent seed script for the groupware common-code catalog.

**Architecture:** Keep shared tenant, account, user, common-code, file, comment, and comment-like tables as prerequisites. Place groupware-owned DDL and tenant-scoped common-code seed data in separate SQL scripts, with a reverse-order rollback and matching history copies in the backend and docs database trees.

**Tech Stack:** PostgreSQL DDL/DML, repository SQL migration conventions, read-only PostgreSQL MCP, Markdown.

---

## File Structure

- Create `docs/directions/20261022/20261022_009_그룹웨어_스키마_스크립트_작업지시서.md` to state scope, prerequisites, execution order, and completion criteria.
- Create `docs/plan/20261022/20261022_009_그룹웨어_스키마_스크립트_계획서.md` and `docs/spec/20261022/20261022_009_그룹웨어_스키마_스크립트_상세사양서.md` before editing SQL.
- Create matching scripts and history in `backend/DATABASE/20261022/` and `docs/database/20261022/`:
  - `20261022_009_create_groupware_schema.sql`: baseline DDL for groupware-owned tables only.
  - `20261022_009_seed_groupware_common_codes.sql`: common-code group and item seeds for every active tenant.
  - `20261022_009_rollback_groupware_schema.sql`: remove only those groupware-owned tables in reverse dependency order.
  - `20261022_009_change_groupware_schema.md`: scope, prerequisites, impact, and rollback notes.
- Update only the groupware table descriptions in `docs/database/db-schema.md` where the live schema and the baseline differ.
- Create `docs/result/20261022/groupware-schema-codes/20261022_009_groupware_schema_codes_result.md` with MCP evidence, validation results, and the fact that no SQL was applied to the live database.

## Task 1: Create the dated work instruction, plan, and detailed specification

**Files:**
- Create: `docs/directions/20261022/20261022_009_그룹웨어_스키마_스크립트_작업지시서.md`
- Create: `docs/plan/20261022/20261022_009_그룹웨어_스키마_스크립트_계획서.md`
- Create: `docs/spec/20261022/20261022_009_그룹웨어_스키마_스크립트_상세사양서.md`
- Reference: `docs/superpowers/specs/2026-10-22-groupware-schema-and-codes-design.md`

- [ ] **Step 1: Write the work instruction**

  Record that this is a new-install baseline, not an incremental migration to apply to the populated database. State the prerequisite shared tables and the 13 groupware-owned tables: `tb_board_type`, `tb_board_post`, `tb_board_post_view_history`, `tb_notice_popup_dismissal`, `tb_drafting_work_category_group`, `tb_drafting_work_category`, `tb_drafting_work_category_authority`, `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_electronic_approval_line_template`, `tb_electronic_approval_line_template_info`, `tb_electronic_approval_view_history`, and `tb_electronic_approval_pin`.

- [ ] **Step 2: Write the implementation plan**

  Specify table DDL, common-code seeds, rollback, mirrored database history, `db-schema.md` review, and static validation as separate units. State that database writes and UI changes are out of scope.

- [ ] **Step 3: Write the detailed specification**

  List each table's columns, keys, defaults, checks, indexes, and foreign-key dependencies from the live PostgreSQL metadata plus the ordered creation/alteration migrations. For `tb_notice_popup_dismissal`, specify `(tenant_id, post_id, login_id)` as the composite primary key, `dismissed_on DATE NOT NULL`, and its tenant/post/login foreign keys. List the five common-code groups, their current names, and these existing item catalogs:

  - `NOTICE_GUBUN`: `ALL` 전체, `IMPORTANT` 중요 공지, `OPERATION` 운영, `SECURITY` 보안, `MUST_READ` 필독.
  - `WF_ARCHIVE_CATEGORY`: `001` 업무양식, `002` 메뉴얼, `003` 교육자료, `004` 테스트자료.
  - `WF_DOC_CATEGORY`: `001` 기안, `004` 지출, `008` 업무, `031` 근태.
  - `WF_FORM_CATEGORY`: `001` 기안서, `008` 업무연락, `004` 지출결의, `031` 근태신청, `201` HACCP(선행), `202` HACCP(HA).
  - `WF_FORM_CYCLE`: `DAY` 일, `WEEK` 주, `MONTH` 월, `EVENT` 발생시.

  Preserve catalog sort orders where meaningful, omit tenant-specific free-text descriptions, and do not create common-code groups for document statuses or participant/action types already represented by database checks and application literals.

## Task 2: Create the consolidated groupware DDL and mirrored history

**Files:**
- Create: `backend/DATABASE/20261022/20261022_009_create_groupware_schema.sql`
- Create: `backend/DATABASE/20261022/20261022_009_rollback_groupware_schema.sql`
- Create: `backend/DATABASE/20261022/20261022_009_change_groupware_schema.md`
- Create identical copies under `docs/database/20261022/`
- Reference: `backend/DATABASE/20260915/20260915_001_create_board_info_schema.sql`
- Reference: `backend/DATABASE/20261001/20261001_001_haccp_drafting_work_schema.sql`
- Reference: `backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql`
- Reference: the approval alterations in `backend/DATABASE/20261012/`, `backend/DATABASE/20261014/`, `backend/DATABASE/20261015/`, and `backend/DATABASE/20261020/`
- Reference: current public schema metadata returned by `s-erp-postgresql-readonly`

- [ ] **Step 1: Write the DDL as a transaction**

  Create the 13 named groupware tables in dependency order, using explicit `public.` references and ordinary `CREATE TABLE` statements so an existing/incompatible schema fails instead of being silently accepted. Preserve the current live columns, constraints, defaults, and indexes, including board-post pin/deletion/login-popup fields, `tb_notice_popup_dismissal`, electronic-approval numbering/deletion/view-count fields, workflow timestamps, and template/pin/view-history tables. Reference shared tables only; do not recreate or alter `tb_tenant`, `tb_login_account`, `tb_user`, `tb_common_code_group`, `tb_common_code_item`, `tb_common_file`, `tb_common_comment`, or `tb_common_comment_like`.

- [ ] **Step 2: Write the rollback in reverse dependency order**

  Drop the pin and approval view history, line-template details and template, approval lines and main, drafting authority/category/group, notice-popup dismissal, board-view-history/post/type tables in reverse dependency order. Use `DROP TABLE IF EXISTS` only in this explicit rollback file. Do not drop or mutate shared prerequisite tables.

- [ ] **Step 3: Write the change-history record**

  Record date `2026-10-22`, all 13 affected tables, the shared-table prerequisites, that this is a fresh-schema baseline and has not been applied to the live database, and that rollback removes only the 13 created tables. Copy all four files byte-for-byte to `docs/database/20261022/`.

## Task 3: Create the tenant-scoped groupware common-code seed

**Files:**
- Create: `backend/DATABASE/20261022/20261022_009_seed_groupware_common_codes.sql`
- Create an identical copy under `docs/database/20261022/`
- Reference: `backend/DATABASE/20261001/20261001_001_haccp_drafting_work_schema.sql`
- Reference: live `tb_common_code_group` and `tb_common_code_item` metadata and the five group catalogs listed in Task 1

- [ ] **Step 1: Insert group definitions for active tenants**

  Use `public.tb_tenant` where `use_at = 'Y'`, insert the five agreed group definitions through a `VALUES` relation, and use `ON CONFLICT (tenant_id, group_code) DO NOTHING`.

- [ ] **Step 2: Insert item definitions without exposing tenant-specific descriptions**

  Resolve each group through `(tenant_id, group_code)`, insert the specified items with canonical names and sort order, and use `ON CONFLICT (group_id, item_code) DO NOTHING`. Leave free-text descriptions empty rather than copying values from a tenant's live row.

- [ ] **Step 3: Add transaction and mirror the seed**

  Wrap the seed statements in `BEGIN`/`COMMIT`; copy the result byte-for-byte to `docs/database/20261022/`.

## Task 4: Align schema documentation and record results

**Files:**
- Modify: `docs/database/db-schema.md`
- Create: `docs/result/20261022/groupware-schema-codes/20261022_009_groupware_schema_codes_result.md`
- Reference: `docs/database/20261022/20261022_009_change_groupware_schema.md`

- [ ] **Step 1: Compare documented groupware structures with the verified baseline**

  Update only groupware table sections to reflect the same columns and relationships as the DDL and live metadata. Keep unrelated schema entries unchanged and do not describe a database application that did not occur.

- [ ] **Step 2: Write the result record**

  Record the scripts created, the shared-table prerequisite, the five seeded groups and their item counts, MCP calls used, file-mirror check, static SQL checks, `db-schema.md` alignment, and that the current database was not modified. Record that the baseline `mvn -f backend\pom.xml test` failed during test compilation because concurrent untracked customer-management tests import missing production classes; no customer-management files were changed for this task. Mark browser screenshots not applicable because no UI was changed.

## Task 5: Verify deliverables

**Files:**
- Verify: both date-based database directories, `docs/database/db-schema.md`, and the result record.

- [ ] **Step 1: Verify file mirrors**

  Run:

  ```powershell
  Get-ChildItem -Path backend\DATABASE\20261022 -File | Where-Object { $_.Name -like '20261022_009_*groupware*' } | ForEach-Object {
      $copy = Join-Path 'docs\database\20261022' $_.Name
      if ((Get-FileHash -Algorithm SHA256 $_.FullName).Hash -ne (Get-FileHash -Algorithm SHA256 $copy).Hash) {
          throw "Database history copy differs: $($_.Name)"
      }
  }
  ```

  Expected: no exception; every `20261022_009_*groupware*` backend file has an identical docs copy.

- [ ] **Step 2: Verify scope and SQL structure statically**

  Check that the create script names each of the 13 target tables once, no shared table is created or altered, every referenced foreign-key target is either one of the 13 tables or a documented prerequisite, the rollback contains all and only the 13 target tables in reverse dependency order, and the code script contains all five groups and 23 specified items with both conflict keys.

- [ ] **Step 3: Run repository whitespace validation**

  Run `git diff --check`.

  Expected: exit code 0 and no whitespace errors. Do not run the scripts against the live database; no write-capable database is part of this task.

## Assumptions and exclusions

- Existing table DDL is consolidated as a reference baseline; it is not a new migration to apply to the current populated database.
- Shared tables must already match the documented groupware prerequisites, including the event fields needed by electronic-approval comments.
- No backend Java, frontend, database application, or new runtime code is changed.
- No user-specific data or free-text descriptions from tenant rows are copied into the seed script.
