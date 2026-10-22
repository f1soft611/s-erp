# Document Feed and List Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-backed, 20-item automatic pagination to document-write feed and list modes, including page-scoped feed details.

**Architecture:** Reuse the existing document list's server offset/limit paging flow and total count. Keep request state and filtering in `useDocumentWritePage`; let shared feed/list renderers optionally observe a sentinel and show the next-page spinner. Preserve non-paged consumers and the separate pinned panel.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit.

---

The dated project plan at
[`docs/plan/20261020/20261020_012_document_feed_list_pagination_계획서.md`](../../plan/20261020/20261020_012_document_feed_list_pagination_계획서.md)
contains the full S-ERP task breakdown and acceptance criteria. Execute its
tasks in order after the user reviews the detailed specification. This plan
repeats the implementation checkpoints for the Superpowers workflow.

**Prerequisite:** Complete the personal pin subproject described in
[`docs/plan/20261020/20261020_010_document_personal_pin_계획서.md`](../../plan/20261020/20261020_010_document_personal_pin_계획서.md)
first. Its separate pinned-list API supplies the complete pinned set, and
ordinary page requests must exclude those IDs.

### Task 1: Confirm API and DB contract

**Files:**
- Read: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalListQueryVO.java`
- Read: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalStatusListItemVO.java`
- Read: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Read: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Read-only DB metadata: `s-erp-postgresql-readonly` list and relevant table descriptions

- [ ] Call MCP `list_tables`, then `describe_table` for the current document and approval-line tables; do not query tenant data rows.
- [ ] Confirm whether the existing query returns list-view fields, maintains actor access/scope filters, and uses deterministic latest-first order.
- [ ] Complete and request review of `docs/spec/20261020/20261020_012_document_feed_list_pagination_상세사양서.md` before implementation.

### Task 2: Implement and verify backend page contracts

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`

- [ ] Add failing tests for limit 20, invalid offset/limit, returned total count, scope/type/document filters, deterministic ordering, and authorized access.
- [ ] Add a failing feed test proving that detail, approval-line, attachment, and initial-comment enrichment only receives IDs from the current page.
- [ ] Run `mvn -Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test` from `backend`; confirm the new assertions fail before implementation.
- [ ] Reuse or extend the existing page service/query and preserve the existing unpaged API behavior for other consumers.
- [ ] Ensure `includeDetails=true` pages the base documents before enriching feed records and returns both `resultList` and `totalRowCount`.
- [ ] Re-run the same Maven command and confirm all selected tests pass.

### Task 3: Add frontend paged API and hook state

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Test: `frontend/tests/document-approval-service.test.ts`
- Test: `frontend/tests/use-document-write-page-pagination.test.tsx`

- [ ] Add failing service tests for query serialization of `offset`, fixed `limit=20`, and validation of `resultList`/`totalRowCount`.
- [ ] Add failing hook tests for first-page replacement, second-page append at offset 20, total-count termination, filter/refresh reset, duplicate load prevention, retrying a failed offset, and ignoring stale responses.
- [ ] Run `npm run test -- tests/document-approval-service.test.ts tests/use-document-write-page-pagination.test.tsx` from `frontend`; confirm the new assertions fail before implementation.
- [ ] Add typed paged responses and service request options without weakening the existing response guards.
- [ ] Keep pagination state generation-scoped; reset accumulated results on scope/type/document-filter changes and explicit refresh, and append only successful page results.
- [ ] For feed mode, request only the current page with `includeDetails=true`; for list mode, request its page without feed details.
- [ ] Keep file-mode fetching and existing summary loading behavior unchanged.
- [ ] Re-run the focused frontend command and confirm all tests pass.

### Task 4: Add optional infinite-scroll behavior to shared views

**Files:**
- Modify: `frontend/src/shared/components/view-mode/FeedView.tsx`
- Modify: `frontend/src/shared/components/view-mode/ListView.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Test: `frontend/tests/view-mode-pagination.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] Add failing component tests for default non-paged behavior, scroll-root sentinel observation, single load callback per in-flight page, retained items, accessible spinner, and no auto-retry while error is present.
- [ ] Run `npm run test -- tests/view-mode-pagination.test.tsx tests/document-write-page.test.tsx`; confirm new paging assertions fail before implementation.
- [ ] Add optional pagination props to `FeedView` and `ListView`; when absent, keep their existing markup and rendering behavior.
- [ ] Connect the page scroll root and hook callbacks from `DocumentWritePage`; keep the existing initial skeleton and pinned panel separate.
- [ ] Ensure pagination error retry repeats the failed offset and the sentinel stops when no more pages remain.
- [ ] Re-run the focused tests and confirm all pass.

### Task 5: Integration verification and documentation

**Files:**
- Update: `docs/directions/20261020/20261020_012_document_feed_list_pagination_work_instruction.md`
- Update: `docs/plan/20261020/20261020_012_document_feed_list_pagination_계획서.md`
- Create: `docs/spec/20261020/20261020_012_document_feed_list_pagination_상세사양서.md`
- Create: `docs/result/20261020/document-feed-list-pagination/result.md`
- Create: `docs/result/20261020/document-feed-list-pagination/screenshots/`
- Relevant shared behavior doc: `frontend/src/pages/f1-grid-docs/F1-GRID.md` only if F1-Grid behavior is touched; otherwise do not change it.

- [ ] Run backend tests:
  `mvn -Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test`
- [ ] Run frontend tests:
  `npm run test -- tests/document-approval-service.test.ts tests/use-document-write-page-pagination.test.tsx tests/view-mode-pagination.test.tsx tests/document-write-page.test.tsx`
- [ ] Run `npm run build` from `frontend`.
- [ ] Reuse the verified S-ERP server on `http://127.0.0.1:4173`; check 375px, 768px, and 1280px for second-page loading, light/dark spinner visibility, and horizontal overflow.
- [ ] Save screenshots with English lowercase/digit/hyphen names and write test results, DB MCP evidence or failure, schema-change status, and any pre-existing limitations in the result document.
- [ ] Inspect only this task's staged/unstaged diff and verify unrelated existing worktree changes remain untouched.
