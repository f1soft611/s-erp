# Document Reference Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let drafting and business-contact references explicitly confirm documents, write the confirmation to the existing SYSTEM timeline, and surface unconfirmed references separately in both overview and document-write summaries.

**Architecture:** Reuse each reference participant row for its per-user confirmation state and reuse the approval service's existing transactional SYSTEM-event writer. Add a server-owned confirmation action and a `MY_REFERENCE_PENDING` read scope; expose its count and items independently from approval notices in both existing summary flows. The frontend displays the action only to the current unconfirmed reference and refreshes the existing views after success.

**Tech Stack:** React, TypeScript, Vitest, Spring Boot, MyBatis, PostgreSQL, Maven.

---

## Files and responsibilities

**Backend approval flow**
- Modify `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiController.java` and `shared/service/DocumentApprovalInteractionService.java` to expose the authenticated confirmation action.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImpl.java` to authorize the reference participant, enforce the non-draft rule and make the transition/event atomic and idempotent.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java` and `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml` for conditional status update and scoped pending queries.
- Create `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalReferenceConfirmationVO.java` as the narrow action response with `electronicApprovalId`, `actionStatus`, and `actionAt`.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalSummaryVO.java` and `write/service/impl/DocumentApprovalWriteServiceImpl.java` to return separate reference-pending totals and rows.
- Extend the existing status-scope validation and query in `backend/src/main/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImpl.java` and its mapper filters so `MY_REFERENCE_PENDING` is usable by the document-write list.
- Update backend tests under `backend/src/test/java/egovframework/let/groupware/approval/` for the controller, service, summary, query filters, and mapper.

**Dashboard**
- Modify `backend/src/main/java/egovframework/let/dashboard/domain/model/DashboardOverviewVO.java`, `service/impl/DashboardServiceImpl.java`, `domain/repository/DashboardDAO.java`, and `backend/src/main/resources/egovframework/mapper/let/dashboard/Dashboard_SQL_postgresql.xml` to expose the separate count and list.
- Update `backend/src/test/java/egovframework/let/dashboard/DashboardServiceTest.java` and `DashboardApiControllerTest.java`.

**Frontend**
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`, `data/documentPresentation.ts`, `services/documentApproval.service.ts`, `hooks/useDocumentWritePage.ts`, `components/ApprovalSummaryPanel.tsx`, `components/DocumentApprovalDetailFeed.tsx`, `DocumentWritePage.tsx`, and `frontend/src/pages/groupware/documents/status/components/DocumentStatusDetail.tsx` for types, scope selection, API validation, the reference-only action, and refresh.
- Modify `frontend/src/pages/dashboard/overview/types/overview.ts`, `services/overview.service.ts`, `components/OverviewWidgets.tsx`, `hooks/useOverviewData.ts`, and `frontend/src/pages/groupware/OverviewPage.tsx` for the separate overview count/list, loading state, navigation, and refresh.
- Add focused coverage to `frontend/tests/document-approval-service.test.ts`, `document-write-page.test.tsx`, `overview-page.test.tsx`, and `dashboard-overview-service.test.ts`.

**Project records**
- Existing approved design: `docs/superpowers/specs/2026-10-29-document-reference-confirmation-design.md`.
- Work instruction: `docs/directions/20261029/20261029_001_문서_참조자_확인_액션_작업지시서.md`.
- Project plan: `docs/plan/20261029/20261029_001_문서_참조자_확인_액션_계획서.md`.
- Detailed specification: `docs/spec/20261029/20261029_001_문서_참조자_확인_액션_상세사양서.md`.
- Result and screenshots: `docs/result/20261029/document-reference-confirmation/`.
- Only if MCP confirms a database constraint/schema change is needed: matching dated SQL, change record, and rollback under `backend/DATABASE/20261029/` and `docs/database/20261029/`, plus `docs/database/db-schema.md`.

## Task 1: Confirm database contract before implementation

**Files:** No source changes. Read `docs/database/db-schema.md`, the latest relevant migration files, and the approval mapper/schema references.

- [ ] Call the registered `s-erp-postgresql-readonly` MCP `list_tables`, then `describe_table` for `tb_electronic_approval_line_info` and `tb_common_comment`.
- [ ] Use a single bounded metadata-only `query_readonly` call (maximum 100 rows) only if the descriptions do not expose the CHECK constraints needed to determine permitted `action_status` and SYSTEM `event_type` values. Do not query business rows.
- [ ] Decide from the observed constraints whether `CONFIRMED` and `REFERENCE_CONFIRMED` require migrations. Record the observed contract and any migration decision in the detailed project specification and result report.
- [ ] If migration is required, create a dated idempotent forward script, matching rollback, and change record in both schema directories; update `docs/database/db-schema.md`. Do not invent a replacement status column or a parallel table.

**Expected:** The implementation uses the verified tenant/user/participant columns and either has matching schema support or makes no schema change. No tenant data rows or credentials are read.

## Task 2: Add failing backend confirmation-action tests

**Files:** Test `backend/src/test/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImplTest.java` and `backend/src/test/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiControllerTest.java`.

- [ ] Add service tests proving an authenticated unconfirmed REFERENCE row on a non-DRAFT document is updated and receives exactly one `REFERENCE_CONFIRMED` SYSTEM event in the same service transaction; the response contains the document ID, `CONFIRMED`, and persisted action time.
- [ ] Add service tests proving DRAFT, non-reference users, and missing/unauthorized participant rows are rejected without an event or participant update.
- [ ] Add a repeated-confirmation test proving an already-confirmed reference returns success without inserting a second SYSTEM event.
- [ ] Add a controller test proving `POST /api/v1/groupware/approvals/{id}/reference-confirmation` passes the authenticated principal and path ID to the service; the request has no user ID or timestamp fields.
- [ ] Run from `backend`: `mvn -Dtest=DocumentApprovalInteractionServiceImplTest,DocumentApprovalInteractionApiControllerTest test`.

**Expected:** The new tests fail because the action method and endpoint do not exist; existing tests continue to compile.

## Task 3: Implement the atomic, authorized backend action

**Files:** Modify `DocumentApprovalInteractionApiController.java`, `DocumentApprovalInteractionService.java`, `DocumentApprovalInteractionServiceImpl.java`, and `DocumentApprovalDAO.java`; update the two tests from Task 2.

- [ ] Declare `DocumentApprovalReferenceConfirmationVO confirmReference(LoginVO user, Long electronicApprovalId) throws Exception` on `DocumentApprovalInteractionService`.
- [ ] Add the authenticated endpoint:

```java
@PostMapping("/{electronicApprovalId}/reference-confirmation")
public ResultVO confirmReference(@PathVariable Long electronicApprovalId,
        @AuthenticationPrincipal LoginVO user) throws Exception {
    HashMap<String, Object> resultMap = new HashMap<>();
    resultMap.put("item", documentApprovalService.confirmReference(user, electronicApprovalId));
    resultMap.put("message", "문서를 확인했습니다.");
    return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
}
```

- [ ] In the service, validate the authenticated user and load/lock the tenant-scoped document and current user's REFERENCE participant row. Reject DRAFT and non-reference access. Use the existing `insertSystemEvent(user, id, "REFERENCE_CONFIRMED", "문서를 확인했습니다.")` path.
- [ ] Perform the conditional participant update and SYSTEM-event insert in one `@Transactional(rollbackFor = Exception.class)` method. If another request already confirmed the row, return its existing successful state without inserting an event. If the event insert fails after a new update, throw so the transaction rolls back.
- [ ] Create `DocumentApprovalReferenceConfirmationVO` with `Long electronicApprovalId`, `String actionStatus`, and `Date actionAt`, and return it using the participant status and timestamp loaded from the database. Never accept actor or timestamp data from the request.
- [ ] Run the focused backend tests from Task 2; expected result: PASS.

## Task 4: Add the pending-reference read scope and approval summary

**Files:** Modify `DocumentApprovalSummaryVO.java`, `DocumentApprovalWriteServiceImpl.java`, `DocumentApprovalStatusServiceImpl.java`, `DocumentApprovalDAO.java`, and `DocumentApproval_SQL_postgresql.xml`; test `DocumentApprovalStatusServiceImplTest.java`, `DocumentApprovalWriteServiceImplTest.java`, and `DocumentApprovalMapperTest.java`.

- [ ] Add regression tests for `MY_REFERENCE_PENDING`: only non-DRAFT, undeleted documents with an unconfirmed REFERENCE line for the authenticated participant are returned; confirmed references and other users' references are excluded.
- [ ] Add summary tests proving reference-pending count and rows are distinct from `actionRequiredCount` and `notices`, including completed/rejected unconfirmed documents.
- [ ] Extend the validated scope set and `DocumentApprovalSummaryVO` with `referenceConfirmationRequiredCount` and `referenceConfirmationItems`.
- [ ] Add DAO methods and MyBatis statements for the pending-reference count/list. Derive both from the same tenant, `participantUserId`, `participant_type='REFERENCE'`, not-confirmed condition, and `document_status != 'DRAFT'`; use `COUNT(DISTINCT electronic_approval_id)` for the count.
- [ ] Add the `MY_REFERENCE_PENDING` predicate to the existing document-read and document-write filters without changing `MY_PENDING` behavior or its count/notices. Preserve pagination and existing status/keyword filters.
- [ ] In `getSummary`, populate the new count/list through the existing authenticated `actorParams`; do not merge these items into approval notices.
- [ ] Run from `backend`: `mvn -Dtest=DocumentApprovalStatusServiceImplTest,DocumentApprovalWriteServiceImplTest,DocumentApprovalMapperTest test`.

**Expected:** All list/count/detail queries remain tenant/user scoped, and existing approval summary semantics are unchanged.

## Task 5: Add reference-confirmation data to the dashboard service

**Files:** Modify `DashboardOverviewVO.java`, `DashboardServiceImpl.java`, `DashboardDAO.java`, and `Dashboard_SQL_postgresql.xml`; test `DashboardServiceTest.java` and `DashboardApiControllerTest.java`.

- [ ] Add dashboard service tests asserting the overview approval object copies the reference-confirmation count and independent item list from the approval summary, without adding them to `notices`.
- [ ] Add a mapper test for the dashboard's bounded reference item list and authenticated user/tenant conditions.
- [ ] Extend `DashboardOverviewVO.Approval` with `referenceConfirmationRequiredCount` and `referenceConfirmationItems` using the existing work-item ID/title shape.
- [ ] Map only those two fields from the authenticated approval summary. Do not change menu-permission gating, approval status behavior, or existing revision notices.
- [ ] Run from `backend`: `mvn -Dtest=DashboardServiceTest,DashboardApiControllerTest test`.

**Expected:** The overview response carries a separate reference-confirmation list and count only when approval information is readable.

## Task 6: Add frontend service/types and detail confirmation behavior

**Files:** Modify `documentWrite.types.ts`, `documentPresentation.ts`, `documentApproval.service.ts`, `DocumentApprovalDetailFeed.tsx`, `DocumentStatusDetail.tsx`, and `useDocumentWritePage.ts`; test `document-approval-service.test.ts` and `document-write-page.test.tsx`.

- [ ] Add failing service tests for the POST path and strict response validation; add detail tests asserting only the current unconfirmed REFERENCE sees the action and a confirmed reference or approver does not.
- [ ] Add `'MY_REFERENCE_PENDING'` to `DocumentApprovalScope`; add `referenceConfirmationRequiredCount` and `referenceConfirmationItems` to the validated summary response type.
- [ ] Add `confirmDocumentReference(electronicApprovalId)` in `documentApproval.service.ts`. It posts to `/api/v1/groupware/approvals/${electronicApprovalId}/reference-confirmation` with no actor/time payload, validates the returned document ID and confirmed action status, and throws an explicit error on an invalid response.
- [ ] Add `REFERENCE_CONFIRMED` to `getApprovalSystemEventPresentation` with the established completed/success visual style and the label `참조 확인`.
- [ ] In the existing document detail flow, derive eligibility from the authenticated employee ID matching a `REFERENCE` approval line whose status is not `CONFIRMED`. Render `확인` only for that line; disable while pending, submit using the service, then reload detail/comments and trigger the existing summary/overview refresh callback.
- [ ] In `useDocumentWritePage`, allow the new scope through existing scope parsing and selection, reload the list on scope selection, and expose its summary count. Keep approval action counts and event handling unchanged.
- [ ] Run from `frontend`: `npm run test -- tests/document-approval-service.test.ts tests/document-write-page.test.tsx`.

**Expected:** Unauthorized users never see the action, service failures remain visible, and success refreshes the document's SYSTEM timeline and the page summary.

## Task 7: Render separate pending-reference areas

**Files:** Modify `ApprovalSummaryPanel.tsx`, `DocumentWritePage.tsx`, `overview.ts`, `overview.service.ts`, `OverviewWidgets.tsx`, `useOverviewData.ts`, and `OverviewPage.tsx`; test `overview-page.test.tsx` and `dashboard-overview-service.test.ts`.

- [ ] Add failing frontend tests proving the document-write summary row is labeled `내가 확인할 문서`, uses the reference count, and selects `MY_REFERENCE_PENDING` without changing the existing three approval/status counts.
- [ ] Add service validation tests for missing, negative, malformed, or invalid reference counts/items in both overview and document-approval summary responses.
- [ ] Add a separate clickable reference row to `ApprovalSummaryPanel`, wired to existing `selectScope('MY_REFERENCE_PENDING')`. Keep it distinct from `MY_PENDING`, `IN_PROGRESS`, `DRAFT`, and `DocumentStatusPanel`.
- [ ] Add the overview `approval.referenceConfirmationItems` list to a distinct `내가 확인할 문서` panel. Use the existing `OverviewPanel`/`OverviewListRow` presentation, open the existing document detail, and after confirmation refresh overview data. Do not add these items to the existing `지금 확인할 업무` approval notices.
- [ ] Update `OverviewSkeleton` to reserve a matching independent section while overview is loading; keep narrow layouts stacked and prevent page-level horizontal overflow.
- [ ] Run from `frontend`: `npm run test -- tests/overview-page.test.tsx tests/dashboard-overview-service.test.ts tests/document-write-page.test.tsx`.

**Expected:** Both surfaces display the same per-user pending-reference count, and reference items never appear as pending approval work.

## Task 8: Regression, responsive verification, and result records

**Files:** Update the work instruction, project plan, detailed specification, and create `docs/result/20261029/document-reference-confirmation/` with results and screenshots; include DB records only if Task 1 requires schema changes.

- [ ] Run focused backend regression tests: `mvn -Dtest=DocumentApprovalInteractionServiceImplTest,DocumentApprovalInteractionApiControllerTest,DocumentApprovalStatusServiceImplTest,DocumentApprovalWriteServiceImplTest,DocumentApprovalMapperTest,DashboardServiceTest,DashboardApiControllerTest test`.
- [ ] Run frontend tests: `npm run test -- tests/document-approval-service.test.ts tests/document-write-page.test.tsx tests/overview-page.test.tsx tests/dashboard-overview-service.test.ts`.
- [ ] Run `npm run build` from `frontend` and `mvn test` from `backend`.
- [ ] Run the frontend dev server with `npm run dev -- --strictPort` from `frontend`, verify `http://127.0.0.1:4173`, and test the confirmation action and both pending-reference areas at 375px, 768px, and 1280px. Save screenshots in the result folder and stop only the server started for this check.
- [ ] Write the result report with changed behavior, test results, responsive screenshots, and either the MCP metadata evidence or explicit MCP failure plus repository evidence. Do not include tenant rows, account values, or credentials.
- [ ] Run `git diff --check` and inspect `git status --short`; preserve unrelated worktree changes.

**Expected:** Focused and full required tests pass, all three viewport checks are recorded, and the result report documents DB verification accurately.
