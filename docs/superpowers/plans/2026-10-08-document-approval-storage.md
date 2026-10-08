# Document Approval Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reviewed S-ERP schema migration scripts and storage guidance for approval documents, approval lines, common comments/system events, and common comment likes.

**Architecture:** Add only `tb_electronic_approval_main` and `tb_electronic_approval_line_info` as approval-domain tables. Reuse `tb_common_comment` for user comments and append-only display messages with explicit USER/SYSTEM typing, create `tb_common_comment_like` for likes on USER comments, and continue using `tb_common_file` for approval attachments. Record scripts in both schema-history trees without applying them to a database or implementing APIs.

**Tech Stack:** PostgreSQL DDL, S-ERP Spring/eGovFrame schema conventions, Markdown schema/change documentation.

---

## File Map

- `docs/directions/20261008/20261008_003_문서결재_저장스키마_작업지시서.md`: Approved scope, exclusions, and completion criteria.
- `docs/plan/20261008/20261008_003_문서결재_저장스키마_계획서.md`: Dated execution plan required by repository workflow.
- `docs/spec/20261008/20261008_003_문서결재_저장스키마_사양서.md`: Final columns, keys, checks, indexes, state codes, and compatibility rules.
- `backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql`: Forward migration.
- `backend/DATABASE/20261008/20261008_003_create_document_approval_schema_change_schema.md`: Migration purpose, table/column impact, rollout, and rollback reference.
- `backend/DATABASE/20261008/20261008_003_create_document_approval_schema_rollback.sql`: Explicit reverse migration for this change only.
- `docs/database/20261008/20261008_003_create_document_approval_schema.sql`: Byte-identical forward migration copy.
- `docs/database/20261008/20261008_003_create_document_approval_schema_change_schema.md`: Byte-identical migration record copy.
- `docs/database/20261008/20261008_003_create_document_approval_schema_rollback.sql`: Byte-identical rollback copy.
- `docs/database/db-schema.md`: Cumulative schema reference for the two new approval tables, the comment-type/event columns, and the like table.
- `docs/result/20261008/document-approval-storage/20261008_003_문서결재_저장스키마_결과.md`: Final review evidence, storage recommendations, validation results, and non-application statement.

## Task 1: Freeze S-ERP Field and Ownership Contracts

**Files:**
- Read: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Read: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Read: `backend/src/main/java/egovframework/com/cmm/LoginVO.java`
- Read: `backend/src/main/java/egovframework/com/common/domain/model/CommonCommentVO.java`
- Read: `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`
- Read: `docs/database/db-schema.md`
- Create: `docs/directions/20261008/20261008_003_문서결재_저장스키마_작업지시서.md`
- Create: `docs/plan/20261008/20261008_003_문서결재_저장스키마_계획서.md`
- Create: `docs/spec/20261008/20261008_003_문서결재_저장스키마_사양서.md`

- [ ] **Step 1: Confirm actual application field and identity shapes**

  Read the listed frontend and backend files and the existing central schema. Record the concrete document title/body/approval-stage properties, authenticated user ID type, tenant ID type, and existing category key. Do not use tenant legacy column names or status codes unless they are independently part of the S-ERP contract.

- [ ] **Step 2: Specify document and approval-line rows**

  Define one approval-main row per document and one approval-line row per participant. Specify an explicit stage order and participant order so multiple agreement participants can share one stage without losing sequence. Map the document composer’s approval/agreement kinds to documented S-ERP values. Include tenant-scoped ownership and timestamps. Persist selected reference users in the same line table with a distinct `REFERENCE` participant kind and no approval action status, so saving and reloading the existing composer does not lose its reference line.

- [ ] **Step 3: Specify comment extensions and the like relation**

  Define `tb_common_comment.comment_type` with `USER` as the default for existing rows and `SYSTEM` for approval action messages. Define nullable `event_type` for stable machine-readable action identity and require it for SYSTEM comments. Define `tb_common_comment_like` with the authenticated S-ERP user-key type, a tenant/comment/user uniqueness rule, creation time, and an explicit unlike operation. Reject likes and user edit/delete/reply actions for SYSTEM rows.

- [ ] **Step 4: Write dated direction, plan, and detailed spec**

  Record the approved boundary: create only approval main and line tables; extend common comments; add `tb_common_comment_like`; reuse `tb_common_file` with owner type `APPROVAL`; do not create `tb_document_attachment`, category duplicates, legacy history tables, or apply DDL to the live database.

  The detailed spec must settle exact column names and types, document/participant/action code sets, nullability/defaults, PK/FK/unique/check/index definitions, deletion behavior, migration ordering, and rollback ordering. The spec must use the `LoginVO.id` and `tenantId` types confirmed from code and the existing central schema.

## Task 2: Write Forward and Rollback DDL

**Files:**
- Create: `backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql`
- Create: `backend/DATABASE/20261008/20261008_003_create_document_approval_schema_rollback.sql`

- [ ] **Step 1: Create approval main and line tables**

  Use generated bigint primary keys. Give both tables a non-null tenant key. Make the line table reference the approval document using a tenant-consistent relationship, and store one participant per line row with stage and participant ordering. Represent approval, agreement, and reference users with explicit participant-kind values; reference rows must not be actionable approval rows. Add a uniqueness constraint preventing duplicate participants at the same position and indexes for tenant-scoped document and pending-approval lookups. Reference the already-existing drafting category table only if the confirmed central schema’s keys support a safe FK; otherwise document why category integrity is enforced by the service contract.

- [ ] **Step 2: Add backward-compatible comment event columns**

  Add `comment_type` as `NOT NULL DEFAULT 'USER'` so pre-existing comment rows remain normal user comments. Add nullable `event_type`. Add named checks for supported comment types and the rule that SYSTEM rows require a non-empty event type while USER rows have no event type. Keep all existing comment columns, parent behavior, and soft-delete semantics unchanged.

- [ ] **Step 3: Create the comment-like table**

  Add `tb_common_comment_like` with tenant ID, comment ID, authenticated user ID, and creation time. Enforce one active like per tenant/comment/user using a primary or unique constraint. Use the confirmed common-comment key relationship, add a tenant/comment lookup index only if the uniqueness index does not already serve it, and reject SYSTEM-comment likes in the service/API contract documented in the spec. Implement unlike as deletion of the actor’s own relation row; do not maintain a denormalized like count.

- [ ] **Step 4: Write a narrow rollback**

  Drop only the new like table, comment constraints/columns added by this migration, and the two new approval tables. Drop dependent approval-line objects before the main table. Do not drop or recreate `tb_common_comment`, `tb_common_file`, or the existing category tables.

## Task 3: Mirror Migration History and Update the Schema Reference

**Files:**
- Create: matching SQL and change-record files under `docs/database/20261008/`
- Modify: `docs/database/db-schema.md`
- Create: forward migration change-record Markdown in both schema directories

- [ ] **Step 1: Write migration impact and rollback record**

  Record date `2026-10-08`, database target `s-erp_central`, all created tables and altered columns, affected S-ERP behavior, compatibility defaults, deployment order, rollback script name, and the fact that the scripts were not applied to any database.

- [ ] **Step 2: Mirror files exactly**

  Copy each of the three forward/change/rollback artifacts to the corresponding `docs/database/20261008/` path. Compare file hashes or byte content to prove each pair is identical.

- [ ] **Step 3: Update the cumulative schema**

  Add table sections for `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, and `tb_common_comment_like`; update `tb_common_comment` for `comment_type` and `event_type`; document keys, checks, indexes, ownership, and system-comment behavior. Do not alter the existing common-file definition.

## Task 4: Review and Validate Artifacts

**Files:**
- Create: `docs/result/20261008/document-approval-storage/20261008_003_문서결재_저장스키마_결과.md`

- [ ] **Step 1: Review forward/rollback symmetry**

  Check every newly created table, sequence/identity, index, FK, check, and added comment column against rollback. Confirm rollback does not remove pre-existing objects or tables.

- [ ] **Step 2: Validate the PostgreSQL scripts without applying them**

  Use an available PostgreSQL parser or disposable local test database only if already present. Never execute the DDL against `s-erp_central`, the tenant database, or any shared environment. If no safe parser/runtime is available, state that syntax was reviewed statically and do not claim live execution.

- [ ] **Step 3: Verify schema copies and repository hygiene**

  Compare mirrored files byte-for-byte, run `git diff --check`, and inspect `git status --short`. Preserve unrelated existing user changes. Confirm `.mcp.json`, common-comment runtime services, and frontend files are not changed by this schema-only deliverable.

- [ ] **Step 4: Write the result review**

  Explain that document/body plus approval participant rows are written transactionally; line rows own structured action state; SYSTEM comments provide the same-thread human-readable messages; common-file owns attachment metadata; likes are separate relations and only apply to USER comments. Explicitly call out that document-level authorization must be added before wiring the existing generic comment/file endpoints to approval records. State that no DDL was applied and include exact validation evidence.

## Acceptance Criteria

1. Only the two requested approval tables are created; common comment is extended and `tb_common_comment_like` is added.
2. Existing category, common-file, and common-comment rows remain compatible.
3. Approval messages have a stable system type/action code and are specified as append-only, unlike normal user comments.
4. Approval status/action rows and system comments are specified to commit atomically when persistence APIs are implemented.
5. Like uniqueness, tenant scope, unlike behavior, and SYSTEM-like rejection are explicit.
6. Forward, rollback, change-record, mirrored files, cumulative schema, and final result documentation are complete.
7. No shared database is modified and no backend save/API implementation is included.
