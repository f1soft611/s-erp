# Document Approval System Messages in Comment Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Page system messages and user-comment threads together in document-write feeds and detail panels.

**Architecture:** The existing approval comment API will select a single chronological page of top-level USER comment threads and SYSTEM messages from the common-comment store. It will return user comment trees and system messages in separate typed collections, with one shared cursor, `hasPrevious`, and total root-item count. The frontend will merge the two collections for presentation while retaining their existing distinct rendering and mutation behavior.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis, PostgreSQL, React, TypeScript, Vitest, JUnit 5, Mockito.

---

## File Map

- `docs/directions/20261016/20261016_006_전자결재_시스템메시지_통합댓글페이지_작업지시서.md`: approved behavior and scope.
- `docs/plan/20261016/20261016_006_전자결재_시스템메시지_통합댓글페이지_계획서.md`: dated project plan index and checkpoints.
- `docs/spec/20261016/20261016_006_전자결재_시스템메시지_통합댓글페이지_상세사양서.md`: API, data, UI, and verification contract.
- `backend/src/main/java/egovframework/com/common/domain/repository/CommonCommentDAO.java`: mapper access for mixed roots, scoped cursor validation, visible USER thread trees, and counts.
- `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`: select mixed top-level approval stream items, validate cursors, load selected user threads, and count visible items.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalCommentPageVO.java`: approval-specific paged response, keeping common comment responses unchanged.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalFeedItemVO.java`: feed page system messages, combined count, and cursor metadata.
- `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`: typed return contract for approval comment pages.
- `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`: select mixed pages, attach replies/files, and populate feed/detail paging metadata.
- `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`: expose the added system-message page collection on the existing endpoint.
- `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`: service paging, count, and cursor regression tests.
- `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`: response contract regression tests.
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`: mixed query shape and cursor SQL regression checks.
- `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: system-event identity and page contract types.
- `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`: validate and return system messages in approval comment pages and feed data.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: retain per-page system events, combine page counts, and append older mixed items.
- `frontend/tests/document-approval-service.test.ts`: API response validation tests.
- `frontend/tests/document-write-page.test.tsx`: feed/detail initial and older mixed-page behavior tests.
- `docs/result/20261016/document-approval-system-message-pagination/`: result report and 375px, 768px, and 1280px screenshots.

## Contract to Implement

The initial page limit is 3 per document and each older-page limit is 20. A page slot is a visible top-level USER thread or one SYSTEM message. A USER root qualifies when its tree contains at least one non-deleted comment; a deleted root with live replies remains a tombstone thread and counts once, while a fully deleted tree is excluded. Replies accompany their USER root and do not consume slots. Sort page selection by `created_at DESC, comment_id DESC`; render the selected page chronologically. The cursor is the oldest selected root's persisted comment ID and works for either item type. For a previous-page request, resolve the cursor row within the same tenant/approval scope and select rows strictly older by `(created_at, comment_id)`, so equal timestamps and a cursor pointing to SYSTEM are handled deterministically. Batch feed queries must partition root ranking by `owner_id` so every document gets its own three-item initial page.

The approval-specific page response keeps the collections distinct:

```json
{
  "comments": [],
  "systemEvents": [],
  "resultCnt": 0,
  "hasPrevious": false,
  "nextBeforeCommentId": null
}
```

`resultCnt` counts visible USER threads plus SYSTEM messages, not replies. A deleted USER root with any live descendant is a visible thread and counts once. `systemEvents` carries each message's persisted `commentId`. The feed's `commentCount` has the same combined meaning. The frontend uses that count directly rather than adding the loaded system-message count again. Remaining count is total stream items minus loaded visible USER roots and SYSTEM messages; replies do not affect it.

Example page selection: if the descending stream is `SYSTEM 105`, `USER 104`
(with reply 110), `SYSTEM 103`, `USER 102`, then limit 3 returns USER root 104
and SYSTEM events 103 and 105, with cursor 103 and `hasPrevious=true`. The reply
110 stays nested under USER root 104 and does not change `resultCnt`.

## Task 1: Write Detailed Spec and Verify Database Metadata

**Files:**
- Create: `docs/spec/20261016/20261016_006_전자결재_시스템메시지_통합댓글페이지_상세사양서.md`

- [x] **Step 1: Record the approved API and UI contract**

Include the mixed root-item definition, 3/20 page sizes, stable sort, ID cursor semantics, response fields, combined count semantics, reply/attachment handling, errors, and explicit no-schema-change boundary. Link the work direction and approved design.

- [x] **Step 2: Check current DB metadata before backend/API edits**

Call the workspace `s-erp-postgresql-readonly` MCP `list_tables`, then `describe_table` for the common-comment table identified from the approved schema. Do not query tenant rows or sensitive data. Record the table/column metadata needed to validate existing mapper fields in the result report. If MCP is unavailable, report the failure and use the existing mapper/schema history only as explicitly identified fallback evidence.

- [x] **Step 3: Self-review the detailed spec**

Verify the direction, design, and detailed spec all agree on page sizes, whether replies consume slots, combined counts, cursor behavior, and scope. Resolve ambiguity before coding.

## Task 2: Add Failing Backend Pagination Tests

**Files:**
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`

- [x] **Step 1: Add a service test for a mixed initial page**

Arrange roots in descending order `SYSTEM 105`, `USER 104`, `SYSTEM 103`,
`USER 102`; give USER root 104 a reply 110. Assert USER roots equal `[104]`,
system-event IDs equal `[103, 105]` in response order, and reply 110 remains
under root 104. Assert `resultCnt` equals 4, `hasPrevious` is true, and
`nextBeforeCommentId` equals 103. Run the feed case with at least two owners
and assert each owner independently receives up to three mixed root items.
Also arrange a deleted root with a live reply and a separate fully deleted
thread. Assert the first is returned and counted once and the fully deleted
thread is excluded from page results and `resultCnt`.

- [x] **Step 2: Run the focused tests and confirm they fail**

Run from `backend`:

```powershell
mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test
```

Expected: the current user-only page/count behavior does not satisfy the mixed page and combined-cursor assertions.

- [x] **Step 3: Add a previous-page boundary test**

Use `beforeCommentId=103` where ID 103 is a SYSTEM root. The service regression
test verifies the SYSTEM cursor is accepted and that older USER 102 and SYSTEM
101 entries are returned in the mixed page. The mapper test renders the cursor
branch and asserts the strict `(created_at, comment_id)` tuple comparison.
Actual PostgreSQL row-level duplicate-boundary execution remains unverified.

- [x] **Step 4: Add invalid-cursor and deleted-thread tests**

Assert an unknown cursor is rejected without running the page query. Tenant and
owner scope are asserted in the cursor mapper SQL. A deleted USER root with an
active reply is included and counted once. Mapper SQL assertions cover the
`BOOL_OR(deleted_yn = 'N')` visibility predicate; all-deleted tree behavior was
not executed against PostgreSQL rows.

- [x] **Step 5: Add mapper SQL assertions**

Assert the mapped query scopes by tenant and approval owner, selects visible USER roots (including tombstone roots with live descendants) and SYSTEM rows, filters the cursor boundary, orders deterministically by creation time and ID, and applies the per-owner page limit. Assert the matching count query counts the same eligible USER thread roots plus SYSTEM roots.

## Task 3: Implement the Mixed Backend Page

**Files:**
- Modify: `backend/src/main/java/egovframework/com/common/domain/repository/CommonCommentDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`
- Create: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalCommentPageVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalFeedItemVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`

- [x] **Step 1: Add approval-specific page response**

Define `comments`, `systemEvents`, `hasPrevious`, `nextBeforeCommentId`, and `resultCnt`. Keep `CommonCommentPageVO` unchanged so other common-comment APIs do not gain unrelated response fields.

- [x] **Step 2: Validate the cursor within the same owner scope**

When `beforeCommentId` is present, query the candidate root by tenant,
`owner_type='APPROVAL'`, the requested approval ID, top-level parent, and
eligible USER/SYSTEM visibility. Reject an invalid or out-of-scope cursor
before reading a page. Use the cursor's persisted `created_at` and `comment_id`
as the strict tuple boundary.

- [x] **Step 3: Select mixed root pages in MyBatis**

Use the existing common-comment table and tenant/owner predicates. Select only visible USER roots (a thread is visible if any record in its tree is non-deleted) and SYSTEM messages into the same ordered page set. Apply `beforeCommentId` to either type, fetch one extra root to calculate `hasPrevious`, and return the selected root identity/type/time needed for mapping. Do not page reply rows as independent roots.

- [x] **Step 4: Attach USER replies and attachments**

For only the selected USER root IDs, load their USER reply trees and attachments using existing data-access helpers or a narrowly scoped recursive query. Leave SYSTEM messages as standalone read-only items. Preserve deleted-comment masking and current attachment error handling. Keep reply and attachment lookups tenant- and approval-scoped.

- [x] **Step 5: Populate detail endpoint and feed preload from the shared mixed-page result**

Make `listApprovalComments` return the specialized page. In `listFeedDocuments`, set `comments`, page-scoped `systemEvents`, combined root `commentCount`, `hasPreviousComments`, and the mixed `nextBeforeCommentId` from the same page calculation. Do not independently attach every system message to the initial feed page.

- [x] **Step 6: Run focused backend tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest,DocumentApprovalMapperTest" test
```

Expected: all selected backend tests pass, including mixed-page and existing authorization tests.

## Task 4: Expose and Validate the API Contract

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Modify: `frontend/tests/document-approval-service.test.ts`

- [x] **Step 1: Add controller response assertions**

Assert the existing `/{electronicApprovalId}/comments` route still returns USER `comments` and additionally returns page-scoped `systemEvents`, combined `resultCnt`, `hasPrevious`, and the shared cursor.

- [x] **Step 2: Add typed client validation**

Require each system event's positive safe-integer `commentId`, string `eventType`, `content`, and `writerName`, with nullable/optional `createdAt` matching the existing backend model. Preserve USER-comment validation and do not cast the whole response to an unchecked type.

- [x] **Step 3: Test valid and invalid page responses**

Verify a response containing both item types parses, and a malformed SYSTEM item or missing page metadata rejects with the existing explicit API-contract error path.

- [x] **Step 4: Run focused controller and frontend service tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalApiControllerTest" test
```

and from `frontend`:

```powershell
npm run test -- tests/document-approval-service.test.ts
```

Expected: both selected test runs pass.

## Task 5: Render and Append Mixed Pages in the Document Feed

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add failing component tests for mixed initial pages**

Test list detail and preloaded feed cases with SYSTEM/USER/SYSTEM as the newest three top-level items, one USER reply, and an older remaining item. Assert only the three roots are shown, the reply is under its parent, the count includes all roots including systems exactly once, and the previous button shows the correct remaining count.

- [x] **Step 2: Add failing tests for mixed older pages**

Click “이전 댓글 보기” when the cursor belongs to a SYSTEM item, then when it belongs to a USER item. Assert each page appends older SYSTEM and USER roots chronologically, no item is duplicated, page size is 20, and the button disappears once `hasPrevious` is false.

- [x] **Step 3: Add a failing test for a failed older-page request**

Make the previous-page request reject. Assert existing user comments and system messages remain visible, the cursor/remaining count do not advance, the explicit error and retry action appear, and retry uses the same `beforeCommentId`.

- [x] **Step 4: Update component state and merge**

Keep the currently loaded system page alongside `commentRecords`. On a replacement page, replace both collections; on an older page, prepend the older `systemEvents` and USER comment records to the loaded chronological data. Map SYSTEM items with persisted IDs and preserve system styling; do not pass them to user-comment mutation handlers.

- [x] **Step 5: Correct totals and remaining count**

Use `commentCount` as the unified top-level total. Compute loaded top-level count as loaded USER roots plus loaded SYSTEM messages, not `commentRecords.length`, so replies do not distort the remaining number. Remove the extra `+ systemEvents.length` from the reaction-bar count.

- [x] **Step 6: Run the focused frontend regression test**

Run:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: mixed pagination tests and existing comment, system-message, and detail-panel tests pass.

## Task 6: Final Verification and Result Documentation

**Files:**
- Create: `docs/result/20261016/document-approval-system-message-pagination/20261016_006_전자결재_시스템메시지_통합댓글페이지_결과보고서.md`
- Create: screenshots under `docs/result/20261016/document-approval-system-message-pagination/screenshots/`

- [x] **Step 1: Run backend focused suite**

Run from `backend`:

```powershell
mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest,DocumentApprovalMapperTest" test
```

Expected: `BUILD SUCCESS`.

- [x] **Step 2: Run frontend focused tests and production build**

Run from `frontend`:

```powershell
npm run test -- tests/document-approval-service.test.ts tests/document-write-page.test.tsx
npm run build
```

Expected: focused Vitest tests pass and Vite production build completes successfully.

- [x] **Step 3: Verify the real browser layout**

Open `/groupware/doc/write` using the existing S-ERP browser at port 4173. Verify the detail shell and comment composer at 375px, 768px, and 1280px and save privacy-masked screenshots. The existing server returned HTTP 500 for the detail comment API, so live mixed-page data and styling could not be confirmed; targeted UI tests cover that behavior. Do not stop or replace an existing shared development server.

- [x] **Step 4: Record evidence and scope**

Write the result report with the reproduction, cause, API/UI changes, DB MCP result or explicit failure and fallback evidence, exact test/build results, and screenshot links. Confirm there was no schema change and no notice-feed change.

- [x] **Step 5: Check patch hygiene**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.
