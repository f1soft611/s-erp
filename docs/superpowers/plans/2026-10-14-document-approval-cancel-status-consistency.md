# Document Approval Cancellation and Display Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe drafter-submission and approver-approval cancellation, unify document/status badges across list/feed/detail, and couple approval-line visibility to body expansion.

**Architecture:** Add two transactional cancellation operations to the existing approval API and service. The service locks the document, verifies the authenticated actor and workflow state, resets only the permitted current/later approval lines, and appends a system event. Keep display labels and semantic badge colors in one frontend metadata module, and use the detail component's existing body expansion state to control its read-only approval line.

**Tech Stack:** React, TypeScript, MUI, Vitest, Java 17, Spring Boot/eGovFrame, MyBatis, PostgreSQL.

---

## Approved design and implementation boundaries

- Design: [document approval cancellation and display consistency](../specs/2026-10-14-document-approval-cancel-status-consistency-design.md)
- Keep the already committed, concurrent feed quiet-refresh work in `useDocumentWritePage.ts` and `document-write-page.test.tsx`; integrate new code without discarding or rewriting it.
- Existing frontend status codes remain the API contract:
  - `DRAFT` → `임시저장`
  - `PENDING`, `IN_PROGRESS` → `결재진행중`
  - `COMPLETED` → `승인`
  - `REJECTED` → `반려`
  - `REVISION_REQUESTED` → `보완요청`
- Short display-only kind labels and colors are `기안`/primary, `업무`/info, `지출`/warning, and `근태`/secondary. Keep the formal names used by the composer/filter unchanged.
- Drafter cancellation is permitted only while `PENDING`; restore draft content and approval lines for editing.
- An approver can cancel only their own `APPROVED` line after the automatically approved stage-1 drafter line while the document is not completed and no later stage has processed an action. Same-stage parallel agreement activity does not block cancellation. If the next stage is active but untouched, return it to `WAITING`.
- Keep submission/approval cancellation controls in detail only. Approval-processing controls are available in feed and detail; the approved UI refinement plan defines their order and reason-dialog behavior.
- Add `SUBMISSION_CANCELED` and `APPROVAL_CANCELED` system events and update the `tb_common_comment.event_type` check constraint. No new table or column.
- PostgreSQL MCP confirmed the current live constraint allows `APPROVED`, `REJECTED`, `RETURNED`, `DRAFT_SAVED`, `SUBMITTED`, `RESUBMITTED`, `COMPLETED`, and `DELETED`; preserve all eight values when adding the two cancellation events.
- Successful cancellation refreshes detail, list, and summary; conflict/error responses remain visible.

## File map

### Dated project documents

- Create `docs/directions/20261014/20261014_008_문서결재취소_상태구분표시통일_작업지시서.md`: finalized request and acceptance criteria.
- Create `docs/plan/20261014/20261014_008_문서결재취소_상태구분표시통일_계획서.md`: dated implementation work map.
- Create `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`: API, state transitions, display, and verification contracts.
- Create `docs/result/20261014/document-approval-cancel-status-consistency/20261014_008_문서결재취소_상태구분표시통일_결과보고서.md` and viewport screenshots.

### Backend

- Modify `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`: add the two authenticated cancellation routes and existing `ResultVO` response envelope.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java` and `service/impl/DocumentApprovalServiceImpl.java`: declare and implement transactional cancellation operations.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java` and `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: add `resetSubmittedDocumentToDraft`, `resetSubmittedApprovalLines`, `selectUserApprovedApprovalLineForUpdate`, `selectProcessedLaterApprovalStage`, `resetApprovalLineToPending`, `resetUntouchedLaterApprovalStages`, and `countProcessedApprovalLines`.
- Reuse the existing `updateDocumentApprovalStatus` DAO/mapper statement to persist the recalculated `PENDING` or `IN_PROGRESS` status; do not add a duplicate status-update statement.
- Modify `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`, `service/impl/DocumentApprovalServiceImplTest.java`, and `domain/repository/DocumentApprovalMapperTest.java`: cover delegation, authorization/state rules, transaction updates, and mapped SQL.
- Create mirrored `20261014_003_add_approval_cancellation_events.sql`, `20261014_003_change_approval_cancellation_events_schema.md`, and `20261014_003_rollback_approval_cancellation_events.sql` files in `docs/database/20261014/` and `backend/DATABASE/20261014/`.
- Modify `docs/database/db-schema.md` to include the new allowed system events.

### Frontend

- Create `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`: one typed mapping for status labels/colors and display-only kind labels/colors.
- Modify `frontend/src/pages/groupware/documents/write/data/documentWriteData.ts`: align local sample statuses with canonical labels and remove the duplicated status-color mapping.
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: make `ApprovalStatus` reflect the five canonical visible labels.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`: derive list status label/color and short kind label/color from the shared metadata while preserving existing feed quiet-refresh logic.
- Modify `frontend/src/shared/components/view-mode/commonViewTypes.ts` and `ListView.tsx`: add optional category badge color, status variant, and badge radius while preserving defaults for other list users.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: use shared badges in feed and detail, add detail-only cancellation buttons/confirmation/error handling, and hide approval lines while a long body is collapsed.
- Modify `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`: add validated clients for both cancellation endpoints.
- Modify `frontend/tests/document-write-page.test.tsx` and `frontend/tests/common-view-mode.test.tsx`: cover canonical status/kind rendering, cancellation controls/results, category badge color, and expansion behavior.

## Stable method and type names

- Backend service methods: `cancelSubmission(LoginVO user, Long electronicApprovalId)` and `cancelApproval(LoginVO user, Long electronicApprovalId)`, both returning `DocumentApprovalDraftVO`.
- Frontend service methods: `cancelDocumentSubmission(number)` and `cancelDocumentApproval(number)`, both returning a validated `DocumentApprovalDraftResponse`.
- Frontend metadata exports: `getApprovalStatusPresentation(ApprovalDocumentStatus)` and `getDocumentKindPresentation(DocumentKind)`.
- Presentation color types: `ApprovalStatusColor = 'default' | 'info' | 'success' | 'error' | 'warning'`; `DocumentKindColor = 'primary' | 'info' | 'warning' | 'secondary'`.
- `DocumentKind` remains the existing formal composer/filter union; only badges use the short presentation label. `ApprovalStatus` becomes the five canonical visible labels.

## Task 1: Create dated direction, plan, and detailed specification

**Files:**
- Create: `docs/directions/20261014/20261014_008_문서결재취소_상태구분표시통일_작업지시서.md`
- Create: `docs/plan/20261014/20261014_008_문서결재취소_상태구분표시통일_계획서.md`
- Create: `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`

- [ ] **Step 1: Write the direction from the approved design**

Record both cancellation roles, all status/kind label mappings, their palette assignments, body/approval-line expansion coupling, backend validation, DB event migration, responsive checks, and the result-document requirement. Do not add approval undo for rejection/revision or final completion.

- [ ] **Step 2: Write the dated plan**

Use this plan's backend/frontend file map and validation commands. Preserve the already committed quiet-refresh changes.

- [ ] **Step 3: Write the detailed specification**

Define both endpoint paths, response envelope, role/state checks, transactional state updates, error outcomes, the five visible status labels, four display-only kind labels, and all regression cases.

- [ ] **Step 4: Verify the dated documents cross-link consistently**

Run `rg -n "20261014_008|SUBMISSION_CANCELED|APPROVAL_CANCELED" docs\directions\20261014\20261014_008_문서결재취소_상태구분표시통일_작업지시서.md docs\plan\20261014\20261014_008_문서결재취소_상태구분표시통일_계획서.md docs\spec\20261014\20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`.

Expected: each document describes the same event names and acceptance rules; relative links resolve.

## Task 2: Add failing backend cancellation tests

**Files:**
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`

- [ ] **Step 1: Add drafter cancellation service cases**

Cover owner + `PENDING` success, non-owner rejection, `IN_PROGRESS` rejection, preserved draft identity, reset non-reference lines, cleared `submitted_at`, and `SUBMISSION_CANCELED` insertion.

```java
@Test
void drafterCanCancelPendingSubmissionAndRestoreDraft() throws Exception {
    when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
        .thenReturn(workflowDocument("PENDING"));
    when(approvalDAO.resetSubmittedDocumentToDraft(anyMap())).thenReturn(1);
    when(approvalDAO.resetSubmittedApprovalLines(anyMap())).thenReturn(3);
    when(commentDAO.insertSystemComment(anyMap())).thenReturn(93L);

    DocumentApprovalDraftVO result = service().cancelSubmission(author, 77L);

    assertThat(result.getDocumentStatus()).isEqualTo("DRAFT");
    verify(approvalDAO).resetSubmittedDocumentToDraft(argThat(params ->
        "login-author".equals(params.get("drafterId"))));
    verify(commentDAO).insertSystemComment(argThat(params ->
        "SUBMISSION_CANCELED".equals(params.get("eventType"))));
}
```

- [ ] **Step 2: Add approver cancellation service cases**

Cover own `APPROVED` line success; reject a line owned by another user, a non-approved line, a processed later stage, a completed document, and missing document. Verify a later untouched `PENDING` stage resets to `WAITING`, same-stage peers remain unchanged, current action fields clear, and remaining processed approvals excluding the automatic stage-1 drafter line determine `PENDING` versus `IN_PROGRESS`.

```java
DocumentApprovalLineVO approvedLine = new DocumentApprovalLineVO();
approvedLine.setElectronicApprovalLineId(22L);
approvedLine.setStageOrder(2);
approvedLine.setParticipantType("APPROVAL");
approvedLine.setParticipantUserId("202");
approvedLine.setActionStatus("APPROVED");
when(approvalDAO.selectDocumentApprovalForUpdate(anyMap()))
    .thenReturn(workflowDocument("IN_PROGRESS"));
when(approvalDAO.selectUserApprovedApprovalLineForUpdate(anyMap()))
    .thenReturn(approvedLine);
when(approvalDAO.selectProcessedLaterApprovalStage(anyMap())).thenReturn(false);
when(approvalDAO.resetApprovalLineToPending(anyMap())).thenReturn(1);
when(approvalDAO.resetUntouchedLaterApprovalStages(anyMap())).thenReturn(1);
when(approvalDAO.countProcessedApprovalLines(anyMap())).thenReturn(0L);
```

- [ ] **Step 3: Add route tests**

Assert `POST /{electronicApprovalId}/submission-cancellation` delegates to drafter cancellation and `POST /{electronicApprovalId}/approval-cancellation` delegates to approver cancellation. Assert each `ResultVO` item is the returned workflow response.

- [ ] **Step 4: Run focused tests and confirm the new cases fail**

Run: `Set-Location backend; mvn '-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest' test`

Expected: compilation or missing-method failures for the unimplemented cancellation operations; existing tests remain intact.

## Task 3: Add failing mapper contract tests

**Files:**
- Test: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`

- [ ] **Step 1: Assert the new mapped statement IDs exist**

Add assertions for statements that reset a submitted document to draft, reset draft lines, select a user's approved line, detect processed later stages, reset the user's approval, reset untouched later stages, and count other processed approvals.

- [ ] **Step 2: Assert cancellation SQL predicates**

Inspect `BoundSql` and assert tenant/document filters, actor ownership, eligible status predicates, line-stage ordering, event state reset fields, and submitted-time clearing.

```java
assertThat(configuration.hasStatement(
    "DocumentApprovalDAO.selectProcessedLaterApprovalStage")).isTrue();
String sql = configuration
    .getMappedStatement("DocumentApprovalDAO.selectProcessedLaterApprovalStage")
    .getBoundSql(params)
    .getSql();
assertThat(sql)
    .contains("tenant_id = ?")
    .contains("electronic_approval_id = ?")
    .contains("stage_order > ?")
    .contains("'APPROVED'");
```

- [ ] **Step 3: Run the mapper test after Java API methods compile**

Maven compiles every test source before selecting a test class, so first add the controller/service/DAO Java method signatures in Task 4 Step 1. Run this mapper test after those signatures and service methods exist but before adding the new XML statements.

Run: `Set-Location backend; mvn '-Dtest=DocumentApprovalMapperTest' test`

Expected: FAIL because the cancellation mapped statements do not exist yet.

## Task 4: Implement backend transactional cancellation

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Test: backend service/controller/mapper test files listed above

- [ ] **Step 1: Add the controller, service, and DAO Java contracts**

Use no request body. Both controller methods accept `@PathVariable Long electronicApprovalId` and `@AuthenticationPrincipal LoginVO user`, delegate to explicit service methods, and return `ResultVO` with an `item`.
Add the service interface declarations and DAO wrappers for the new mapped statement IDs. Do not add the XML statements until the mapper test has failed for the missing IDs.

```java
DocumentApprovalDraftVO cancelSubmission(LoginVO user, Long electronicApprovalId) throws Exception;

DocumentApprovalDraftVO cancelApproval(LoginVO user, Long electronicApprovalId) throws Exception;
```

- [ ] **Step 2: Implement drafter cancellation**

Validate authenticated user and positive ID, lock the document, verify drafter identity and `PENDING`, perform both line/document updates and insert `SUBMISSION_CANCELED` in one `@Transactional(rollbackFor = Exception.class)` method. Require exactly one document row to transition and at least one actionable line to reset; otherwise return the repository-standard conflict error so the transaction rolls back.

- [ ] **Step 3: Implement approver cancellation**

Validate authenticated user and positive ID, lock the document, allow only `PENDING`/`IN_PROGRESS`, find the actor's `APPROVED` line, and reject if any later stage has processed a decision. Require the actor's line reset and document-status update to each affect exactly one row; later untouched-stage reset may affect zero or more rows. Compute resulting document status from remaining processed approval/agreement lines after excluding the automatic stage-1 drafter line, then append `APPROVAL_CANCELED` in the same transaction.

- [ ] **Step 4: Verify service/controller behavior and mapper RED**

Run: `Set-Location backend; mvn '-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest' test`

Expected: service and controller cancellation tests PASS.

Then run: `Set-Location backend; mvn '-Dtest=DocumentApprovalMapperTest' test`

Expected: mapper cancellation tests FAIL because their mapped statements are not registered yet.

- [ ] **Step 5: Add the MyBatis SQL statements**

Use the existing `selectDocumentApprovalForUpdate` lock. For drafter cancellation, update only a non-deleted `PENDING` document owned by the authenticated drafter, set `document_status='DRAFT'` and `submitted_at=NULL`; reset actionable lines to `WAITING` with `pending_at`, `action_at`, and `action_comment` cleared while preserving reference `null` status.

For approver cancellation, select and lock the user's `APPROVED` line, detect processed `APPROVAL`/`AGREEMENT` lines only where `stage_order` is greater than the actor's stage, reset the actor's line to `PENDING`, and reset later untouched active lines to `WAITING`. Do not update same-stage colleagues. Reuse `updateDocumentApprovalStatus` for the recalculated document status.

- [ ] **Step 6: Run service, controller, and mapper tests**

Run: `Set-Location backend; mvn '-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest,DocumentApprovalMapperTest' test`

Expected: all targeted tests PASS. No change to existing submit/action/delete behavior.

## Task 5: Add and verify the system-event migration

**Files:**
- Create mirrored `20261014_003_add_approval_cancellation_events.sql`, `20261014_003_change_approval_cancellation_events_schema.md`, and `20261014_003_rollback_approval_cancellation_events.sql` under `docs/database/20261014/` and `backend/DATABASE/20261014/`.
- Modify: `docs/database/db-schema.md`

- [ ] **Step 1: Add forward migration**

Recreate `chk_tb_common_comment_event_type` with every existing allowed event unchanged plus `SUBMISSION_CANCELED` and `APPROVAL_CANCELED`. Preserve the existing `USER`/`SYSTEM` nullability and non-empty event rules as well as the allow-list. Do not alter table columns.

Preserve the live event allow-list exactly:

```sql
'APPROVED', 'REJECTED', 'RETURNED', 'DRAFT_SAVED',
'SUBMITTED', 'RESUBMITTED', 'COMPLETED', 'DELETED',
'SUBMISSION_CANCELED', 'APPROVAL_CANCELED'
```

- [ ] **Step 2: Add change history and rollback**

Record date, constraint/event additions, affected `tb_common_comment`, application impact, no data migration, and rollback conditions. The rollback restores the exact previous allowed-event list and must explicitly note that rollback cannot proceed after rows using either new event have been written.

- [ ] **Step 3: Mirror and review the SQL**

Compare the paired files byte-for-byte using `git diff --no-index -- docs\database\20261014\20261014_003_add_approval_cancellation_events.sql backend\DATABASE\20261014\20261014_003_add_approval_cancellation_events.sql`. Verify SQL and rollback syntax against the existing dated migration conventions; do not execute DDL through the read-only MCP.

- [ ] **Step 4: Update the schema reference**

Update only the `tb_common_comment` event constraint description in `docs/database/db-schema.md`; retain all existing schema history.

## Task 6: Add failing frontend display and action tests

**Files:**
- Test: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/common-view-mode.test.tsx`
- Modify `frontend/tests/document-write-page.test.tsx` fixtures to set `isDrafter`, `documentStatus`, `employeeId`, and approval-line participant identity/type/stage/action status; mock both cancellation clients with valid response items and error responses.

- [ ] **Step 1: Add canonical label and color assertions**

Assert `PENDING` and `IN_PROGRESS` both render `결재진행중`; `COMPLETED` renders `승인`; all other status labels map to the approved values. Assert all four short kind labels/colors match in list and feed, and detail includes the kind badge.

- [ ] **Step 2: Add cancellation visibility tests**

Cover drafter `PENDING` → `결재신청 취소`; hide for drafter `IN_PROGRESS`; show `승인 취소` only for the current user's own `APPROVED` line while eligible; hide for another user's line, a processed later stage, and `COMPLETED`. Feed cards must not show either cancellation button.

- [ ] **Step 3: Add cancellation flow tests**

Confirm dialog cancel makes no request. Confirm success invokes the correct client and refreshes detail/list/summary. A server conflict displays an error and does not report success.

- [ ] **Step 4: Add collapse tests**

With a long body, assert the approval-line region is hidden until `더보기`, appears when expanded, and hides again on `접기`. With a short body, assert the approval line is visible without a toggle.

- [ ] **Step 5: Run focused frontend tests and confirm failures**

Run: `Set-Location frontend; npm run test -- tests/document-write-page.test.tsx tests/common-view-mode.test.tsx`

Expected: new assertions fail before implementation; the existing quiet-refresh regression test stays green.

## Task 7: Implement shared frontend presentation and list/feed/detail UI

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/data/documentWriteData.ts`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/shared/components/view-mode/commonViewTypes.ts`
- Modify: `frontend/src/shared/components/view-mode/ListView.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`

- [ ] **Step 1: Define one typed presentation map**

Define the typed maps and exports in `documentPresentation.ts`:

```ts
const statusPresentation: Record<
  ApprovalDocumentStatus,
  { label: ApprovalStatus; color: ApprovalStatusColor }
> = {
  DRAFT: { label: '임시저장', color: 'default' },
  PENDING: { label: '결재진행중', color: 'info' },
  IN_PROGRESS: { label: '결재진행중', color: 'info' },
  COMPLETED: { label: '승인', color: 'success' },
  REJECTED: { label: '반려', color: 'error' },
  REVISION_REQUESTED: { label: '보완요청', color: 'warning' },
};

const kindPresentation: Record<
  DocumentKind,
  { label: string; color: DocumentKindColor }
> = {
  기안서: { label: '기안', color: 'primary' },
  업무연락: { label: '업무', color: 'info' },
  지출결의서: { label: '지출', color: 'warning' },
  근태신청: { label: '근태', color: 'secondary' },
};

export function getApprovalStatusPresentation(status: ApprovalDocumentStatus) {
  return statusPresentation[status];
}

export function getDocumentKindPresentation(kind: DocumentKind) {
  return kindPresentation[kind];
}
```

Map both pending codes to `결재진행중`/`info`; keep composer/filter labels untouched.
Update `ApprovalStatus` to exactly `임시저장 | 결재진행중 | 승인 | 반려 | 보완요청`. Update the sample document labels in `documentWriteData.ts` and remove its duplicate `statusColor` helper after replacing its only component use.

- [ ] **Step 2: Use the map for list and feed**

Replace `statusLabelByCode` and the locally inferred status presentation with the shared metadata. Pass `categoryLabel`, `categoryColor`, `statusLabel`, and `statusColor` to list items. Render the feed's kind/status chips using the same mapping.

- [ ] **Step 3: Extend the generic list badge contract**

Add a typed optional `categoryColor` to `CommonViewItem`; make `ListView` render the supplied MUI color while retaining its existing default for other list users. Use typed MUI semantic color unions and do not cast colors to `any`.

- [ ] **Step 4: Add validated cancellation clients**

Add `cancelDocumentSubmission(id)` and `cancelDocumentApproval(id)` with positive-safe-integer ID validation. POST to the two approved paths; validate returned `item.electronicApprovalId` and `documentStatus` with the existing workflow-status guard before resolving. Require `DRAFT` for submission cancellation and `PENDING` or `IN_PROGRESS` for approval cancellation.

- [ ] **Step 5: Add detail-only cancellation UI**

Use authenticated `employeeId`, `detail.isDrafter`, active document status (`PENDING`/`IN_PROGRESS`), and the current user's lines to determine button visibility. For approver cancellation, inspect only later `stageOrder` values for processed action states (`APPROVED`, `REJECTED`, `RETURNED`). Add separate confirmation state and request handling; reuse the existing action error/success notification pattern; call the existing `onActionComplete` after success. Keep controls out of feed presentation and preserve existing delete/approval actions.

```ts
const canCancelSubmission =
  detail?.isDrafter && detail.documentStatus === 'PENDING';
const canCancelApproval = Boolean(
  detail &&
    !detail.isDrafter &&
    ['PENDING', 'IN_PROGRESS'].includes(detail.documentStatus) &&
    detail.approvalLines.some(
      (line) =>
        ['APPROVAL', 'AGREEMENT'].includes(line.participantType) &&
        line.participantUserId === employeeId &&
        line.actionStatus === 'APPROVED' &&
        !detail.approvalLines.some(
          (later) =>
            later.stageOrder > line.stageOrder &&
            ['APPROVED', 'REJECTED', 'RETURNED'].includes(later.actionStatus),
        ),
    ),
);
```

- [ ] **Step 6: Add the detail kind and status badges**

Replace the detail panel's plain status text with shared status and kind chips adjacent to each other; keep the cancellation action beside the status. Use the same accessible text and color mapping as feed/list.

- [ ] **Step 7: Couple approval-line visibility to body expansion**

Render the read-only approval line and its divider as a unit only when `isBodyExpanded || !hasMoreBody`. Keep `FeedBodyContent` unchanged so notice feed behavior is unaffected.

```tsx
const showApprovalLine = isBodyExpanded || !hasMoreBody;
```

Use `showApprovalLine` to conditionally render the existing approval-line block and divider together.

- [ ] **Step 8: Run the focused frontend tests**

Run: `Set-Location frontend; npm run test -- tests/document-write-page.test.tsx tests/common-view-mode.test.tsx`

Expected: PASS, including the previously committed quiet-refresh tests.

## Task 8: Run final targeted build and verify browser behavior

**Files:**
- Verify changed backend, frontend, migration, and dated documentation files.
- Create: `docs/result/20261014/document-approval-cancel-status-consistency/` report and screenshots.

- [ ] **Step 1: Run the focused backend test suite**

Run: `Set-Location backend; mvn '-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest,DocumentApprovalMapperTest' test`

Expected: PASS.

- [ ] **Step 2: Run the frontend build**

Run: `Set-Location frontend; npm run build`

Expected: TypeScript and Vite production build PASS.

- [ ] **Step 3: Verify the actual `/groupware/doc/write` page at target widths**

Reuse the existing S-ERP server at `http://127.0.0.1:4173`. Check 375px, 768px, and 1280px for badge wrapping/no page overflow, detail-only cancellation buttons, approval line/body expansion coupling, and unchanged feed/list switching. Do not use personal or tenant-sensitive document data in screenshots.

- [ ] **Step 4: Capture screenshots and write the result report**

Save responsive screenshots under `docs/result/20261014/document-approval-cancel-status-consistency/screenshots/`. Record actual test/build results, API/state behavior, migration filenames, DB MCP table/column evidence, and browser viewport checks. Do not claim a migration was applied; the MCP is read-only.

- [ ] **Step 5: Review final working-tree scope**

Run `git status --short` and `git diff --check`. Confirm the existing quiet-refresh work remains intact and no unrelated generated test output is included.

## Approved follow-up: feed/detail approval UI refinement

The follow-up requirements approved after this original plan are specified and task-decomposed in [the document approval UI refinement plan](./2026-10-14-document-approval-ui-refinement.md). That plan extends this plan's frontend scope and supersedes its earlier feed-control, status-variant, badge-style, and pending-document deletion assumptions. It keeps the original backend cancellation and database tasks unchanged.
