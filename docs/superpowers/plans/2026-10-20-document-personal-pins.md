# Personal Document Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated per-user pin/unpin for readable approval documents and retrieve all matching pinned documents separately.

**Architecture:** Store a tenant/document/user pin relation in a new table, enforce read access in every operation, and derive the current user's pin state from the authenticated principal. The page keeps the full pinned set separate from regular documents, shows it in the list panel, and sorts pinned feed items first. This subproject is the prerequisite for the subsequent 20-item paging subproject.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit.

---

The dated project plan at
[`docs/plan/20261020/20261020_010_document_personal_pin_계획서.md`](../../plan/20261020/20261020_010_document_personal_pin_계획서.md)
contains the full S-ERP task breakdown and acceptance criteria. Follow it in
order after review of the detailed specification.

### Task 1: Confirm metadata and review spec

**Files:**
- Read: `backend/src/main/java/egovframework/com/cmm/LoginVO.java`
- Read: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Read: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Read: `docs/database/db-schema.md`
- MCP: `s-erp-postgresql-readonly` table and column metadata

- [ ] Confirm `LoginVO` identity mapping and current document access SQL without reading sensitive DB rows.
- [ ] Review `docs/spec/20261020/20261020_010_document_personal_pin_상세사양서.md` with the user before implementation.

### Task 2: Write DB migration and failing mapper tests

**Files:**
- Create: paired `docs/database/20261020/20261020_007_*` and `backend/DATABASE/20261020/20261020_007_*` create/change/rollback files.
- Modify: `docs/database/db-schema.md`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`

- [ ] Add failing mapper assertions for tenant/user isolation, read-access and filter conditions, latest document order, duplicate pin prevention, and deletion.
- [ ] Add the user/document uniqueness, tenant-scoped document FK, user FK, and lookup index in the dated SQL and schema record; do not apply DDL to a live DB.
- [ ] Implement matching MyBatis insert/delete and pinned-document list queries, then run the focused mapper test class.

### Task 3: Implement service/controller contracts

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`

- [ ] Add failing tests for `PUT /documents/{id}/pin`, `DELETE /documents/{id}/pin`, and `GET /documents/pinned`; verify the principal, read authorization, idempotency, filter preservation, and stable latest-first ordering.
- [ ] Implement the three endpoints; take tenant and user identity only from the authenticated principal.
- [ ] Run `mvn -Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test` in `backend`.

### Task 4: Connect personal pin state and controls

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`
- Modify: `frontend/src/shared/components/view-mode/ListView.tsx`
- Modify: `frontend/src/shared/components/view-mode/PinnedItemsPanel.tsx`
- Test: `frontend/tests/document-approval-service.test.ts`
- Test: `frontend/tests/use-document-write-page-pins.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] Add failing tests for API response validation, filtered pinned-list loading, feed pin-first ordering, list pinned panel state, pin/unpin completion and visible errors.
- [ ] Add failing shared list tests for optional right-side pin action and unchanged default consumers.
- [ ] Run the focused frontend tests and confirm new assertions fail before implementation.
- [ ] Implement service methods and typed response guards; avoid trusting client-provided user identity.
- [ ] Load pinned documents separately using the current scope, type, and selected-document filters; refresh the pin set and document list after successful mutation.
- [ ] Use the notice-feed PushPin action position on feed cards and a matching right-edge action on list rows and pinned panel rows.
- [ ] Run `npm run test -- tests/document-approval-service.test.ts tests/use-document-write-page-pins.test.tsx tests/document-write-page.test.tsx` and `npm run build` in `frontend`.

### Task 5: Browser and result verification

**Files:**
- Create: `docs/result/20261020/document-personal-pins/result.md`
- Create: `docs/result/20261020/document-personal-pins/screenshots/`

- [ ] Reuse the verified S-ERP browser server at `http://127.0.0.1:4173`.
- [ ] Verify pin/unpin action placement, pinned panel, and feed order at 375px, 768px, and 1280px.
- [ ] Save screenshots with lowercase English, digits, and hyphens only.
- [ ] Record tests, DB metadata evidence, paired migration files, no-live-DB-application status, and worktree preservation in the result.
