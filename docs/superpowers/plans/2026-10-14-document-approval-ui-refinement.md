# Document Approval UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved badge, toolbar, feed-action, deletion, and approval-line color refinements consistently in the document-write list, feed, and detail views.

**Architecture:** Reuse the document-write feature's status/kind presentation metadata and render a single feature-local toolbar for feed and detail. Extend the generic list item contract only with optional presentation fields so unrelated list users retain their current defaults. Keep cancellation detail-only and route feed rejection/return through an explicit required-reason dialog.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite, Playwright browser validation.

---

## Approved design and scope

- Approved design: [document approval cancellation and display consistency](../specs/2026-10-14-document-approval-cancel-status-consistency-design.md), section “승인된 표시 및 툴바 보완”.
- Dated direction: [20261014_008 work direction](../../directions/20261014/20261014_008_문서결재취소_상태구분표시통일_작업지시서.md).
- Dated plan: [20261014_008 implementation plan](../../plan/20261014/20261014_008_문서결재취소_상태구분표시통일_계획서.md).
- Dated specification: [20261014_008 detailed specification](../../spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md).
- This refinement changes frontend behavior only. Do not change approval API contracts, backend state transitions, or the approved cancellation policy.
- Existing worktree changes from the initial cancellation implementation are intentional. Do not reset, discard, or commit unrelated existing changes.

## File map

### Project documents

- Modify `docs/directions/20261014/20261014_008_문서결재취소_상태구분표시통일_작업지시서.md`, `docs/plan/20261014/20261014_008_문서결재취소_상태구분표시통일_계획서.md`, and `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md` to keep the approved feed behavior, deletion rule, toolbar order, and badge rules aligned.
- Modify `docs/superpowers/plans/2026-10-14-document-approval-cancel-status-consistency.md` so the initial frontend assumptions point to this approved refinement.
- Modify `docs/result/20261014/document-approval-cancel-status-consistency/20261014_008_문서결재취소_상태구분표시통일_결과보고서.md` and replace/add the targeted screenshots after implementation.

### Frontend implementation and tests

- Modify `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`: include the canonical status variant (`DRAFT` outlined, other statuses filled).
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts` and `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`: carry the selected status variant and an optional 8px badge radius into list items.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts` and `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: resolve the signed-in employee ID once when feed mode is opened, expose a page-level retryable error if unavailable, and pass the ID into feed items.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`: pass the shared employee ID into the feed/detail component.
- Modify `frontend/src/shared/components/view-mode/commonViewTypes.ts` and `frontend/src/shared/components/view-mode/ListView.tsx`: render optional status variant and badge radius without changing defaults for callers that omit them.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: share the approval toolbar across feed/detail, limit deletion to drafts, require a feed reason for rejection/return, use the approved button/Chip styles, and use the info color for pending approval-line borders.
- Modify `frontend/tests/document-presentation.test.ts`, `frontend/tests/common-view-mode.test.tsx`, and `frontend/tests/document-write-page.test.tsx` for presentation mapping, list rendering, toolbar actions/order, reason validation, deletion visibility, and approval-line tone.

## Implementation tasks

### Task 1: Synchronize approved requirements across project documents

**Files:**
- Modify: `docs/directions/20261014/20261014_008_문서결재취소_상태구분표시통일_작업지시서.md`
- Modify: `docs/plan/20261014/20261014_008_문서결재취소_상태구분표시통일_계획서.md`
- Modify: `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`
- Modify: `docs/superpowers/plans/2026-10-14-document-approval-cancel-status-consistency.md`

- [x] **Step 1: Record the agreed behavioral boundaries**

The documents now specify all of the following: approval processing is available in feed and detail; cancellation remains detail-only; feed rejection/return require a reason dialog; deletion is `DRAFT`-only; no-action menus are hidden; toolbar order, 8px badge radius, status variants, button emphasis, and pending-line color follow the approved design.

- [x] **Step 2: Check there is no stale conflicting requirement**

Run:

```powershell
rg -n "피드 카드에는 결재 처리/취소 버튼을 추가하지 않는다|Do not expose approval-processing or cancellation controls in feed cards|PENDING 상태에서 삭제를 허용" docs/directions/20261014/20261014_008_문서결재취소_상태구분표시통일_작업지시서.md docs/plan/20261014/20261014_008_문서결재취소_상태구분표시통일_계획서.md docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md docs/superpowers/plans/2026-10-14-document-approval-cancel-status-consistency.md
```

Expected: no stale statement that feed approval actions are prohibited or that a pending document can be deleted.

### Task 2: Add failing tests for list and presentation badge parity

**Files:**
- Modify: `frontend/tests/document-presentation.test.ts`
- Modify: `frontend/tests/common-view-mode.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/shared/components/view-mode/commonViewTypes.ts`
- Modify: `frontend/src/shared/components/view-mode/ListView.tsx`

- [x] **Step 1: Add the status variant mapping assertion**

In `frontend/tests/document-presentation.test.ts`, add the variant to every case in the existing status table so the current exact-object assertion stays valid:

```ts
it.each([
  ['DRAFT', '임시저장', 'default', 'outlined'],
  ['PENDING', '결재진행중', 'info', 'filled'],
  ['IN_PROGRESS', '결재진행중', 'info', 'filled'],
  ['COMPLETED', '승인', 'success', 'filled'],
  ['REJECTED', '반려', 'error', 'filled'],
  ['REVISION_REQUESTED', '보완요청', 'warning', 'filled'],
] as const)('maps %s to its canonical status badge', (status, label, color, variant) => {
  expect(getApprovalStatusPresentation(status)).toEqual({ label, color, variant });
});
```

- [x] **Step 2: Add list assertions for the same variant and radius**

Add to `frontend/tests/common-view-mode.test.tsx`:

```tsx
it('renders document status variant and shared badge radius when supplied', () => {
  render(
    <ListView
      items={[
        {
          id: 20,
          title: '진행 문서',
          authorLabel: '작성자',
          dateLabel: '2026-10-14',
          categoryLabel: '기안',
          categoryColor: 'primary',
          statusLabel: '결재진행중',
          statusColor: 'info',
          statusVariant: 'filled',
          badgeBorderRadius: '8px',
        },
      ]}
    />,
  );

  const statusChip = screen.getByText('결재진행중').closest('.MuiChip-root');
  const kindChip = screen.getByText('기안').closest('.MuiChip-root');
  expect(statusChip).toHaveClass('MuiChip-filled');
  expect(statusChip).toHaveStyle({ borderRadius: '8px' });
  expect(kindChip).toHaveStyle({ borderRadius: '8px' });
});
```

Also assert that an item without `statusVariant` or `badgeBorderRadius` retains the existing outlined/default appearance.

- [x] **Step 3: Run the focused tests and confirm the new assertions fail**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-presentation.test.ts tests/common-view-mode.test.tsx
```

Expected: FAIL because status presentation has no variant, and list item types/rendering do not yet carry the variant or radius.

- [x] **Step 4: Add the typed metadata and optional list fields**

Extend `ApprovalStatusPresentation` in `documentPresentation.ts` with `variant: 'filled' | 'outlined'`. Set `DRAFT` to `outlined` and every other status to `filled`. Add `statusVariant?: 'filled' | 'outlined'` and `badgeBorderRadius?: string` to both `DocumentWriteItem` and `CommonViewItem`.

```ts
export type ApprovalStatusPresentation = {
  label: ApprovalStatus;
  color: ApprovalStatusColor;
  variant: 'filled' | 'outlined';
};
```

Map both new optional values from the presentation metadata in `useDocumentWritePage.ts`. In `ListView.tsx`, use `variant={item.statusVariant ?? 'outlined'}` and apply `borderRadius: item.badgeBorderRadius` to both category and status Chips. Omitted values must preserve current shared-list defaults.

- [x] **Step 5: Run the focused tests**

Run the same command as Step 3. Expected: PASS, including default behavior for callers that omit the new optional fields.

### Task 3: Add failing tests for the feed/detail action toolbar and deletion boundary

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [x] **Step 1: Add an authorized feed reviewer fixture**

Use the existing `DashboardContent` test harness and current user `emp-1`. Return a feed record with `documentStatus: 'PENDING'`, `isDrafter: false`, and this action line:

```ts
{
  electronicApprovalLineId: 90,
  stageOrder: 2,
  participantOrder: 1,
  participantType: 'APPROVAL',
  participantUserId: 'emp-1',
  participantName: '홍길동',
  actionStatus: 'PENDING',
}
```

Switch to feed mode and assert `fetchMyProfile` resolves `emp-1` once for the page, then the authorized card exposes `승인`, `반려`, and `보완요청`, but not `상신 취소` or `승인 취소`. Assert toolbar element order is action buttons, status Chip, kind Chip, divider, then pin icon. Use the existing `approval-line-participant-90` test id and assert its border color equals `muiTheme.palette.info.main`.

- [x] **Step 2: Add required-reason tests for feed rejection and return**

For rejection, click `반려`, assert the dialog opens and `processDocumentApprovalAction` has not been called, enter `결재 내용 확인 필요`, confirm, then assert:

```ts
expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledWith(1, {
  action: 'REJECTED',
  actionComment: '결재 내용 확인 필요',
});
```

Repeat for `보완요청` and `action: 'RETURNED'`. Confirming with an empty reason must not invoke the API and must show the required-reason validation. Clicking dialog cancel must close the dialog without invoking the API.

- [x] **Step 3: Add deletion visibility tests**

Open a `PENDING` document as its drafter with the stage-1 drafter line already approved and all later lines waiting; assert `문서 더보기` is absent. Open a `DRAFT` document as its drafter; assert `문서 더보기` remains available and its menu contains `삭제`. For a pending non-drafter, assert the menu is absent.

- [x] **Step 4: Run the focused document-write tests and confirm failures**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-write-page.test.tsx
```

Expected: FAIL because feed actions are not rendered, reason dialogs do not exist, and pending drafter deletion is currently allowed.

Add a separate regression test in `frontend/tests/document-write-page.test.tsx` where `fetchMyProfile` rejects while entering feed mode. Assert the page shows that error with a retry control and the card does not expose approval actions; this keeps an identity failure visible rather than silently hiding controls.

### Task 4: Implement the shared toolbar, feed reason dialog, and approved visual rules

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Restrict deletion and hide empty menus**

Replace the current pending-document exception in `canDeleteDocument` with a `DRAFT`-only condition:

```ts
const canDeleteDocument = Boolean(
  detail?.isDrafter && detail.documentStatus === 'DRAFT',
);
```

Keep `documentMenu` rendered only when `canEditDraft || canDeleteDocument`. Preserve draft deletion and revision-requested editing.

- [x] **Step 2: Resolve the feed employee identity once**

In `useDocumentWritePage.ts`, load `fetchMyProfile()` once when `viewMode === 'feed'`; store the trimmed `employeeId` and any load error. Expose a retry callback that clears the error and reruns the profile effect. `DocumentWritePage.tsx` shows one page-level error/retry alert and passes the resolved ID through `DocumentFeedItem.tsx` to `DocumentApprovalDetailFeed.tsx`. Use that prop for `canProcess`; keep the existing detail-only profile fetch for the selected panel. Do not call `fetchMyProfile()` from every feed card.

```ts
const employeeId = String(profile?.employeeId ?? '').trim();
if (!employeeId) {
  throw new Error('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
}
setFeedEmployeeId(employeeId);
```

- [x] **Step 3: Use approved badge and pending-line styling**

Use the shared presentation `variant` for status Chips; set `borderRadius: '8px'` on status and kind Chips in feed and detail. Change only the pending approval-line border mapping to `info.main`; keep all other approval-line colors unchanged.

- [x] **Step 4: Render one feature-local toolbar in feed and detail**

Build one toolbar node and use it from `FeedCard.actions` and the detail author row. Inside the existing `detail` guard, define `const statusPresentation = getApprovalStatusPresentation(detail.documentStatus)` and `const kindPresentation = getDocumentKindPresentation(detail.documentType)`. Keep the action controls in the same Stack as the state and kind Chips so the DOM order is stable:

```tsx
<Stack
  data-testid="document-approval-toolbar"
  direction="row"
  spacing={0.5}
  sx={{ alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', minWidth: 0 }}
>
  {canProcess && (
    <>
      <Button variant="contained" color="primary" disabled={isActing}
        onClick={() => void handleAction('APPROVED')}>승인</Button>
      <Button variant="contained" color="error" disabled={isActing}
        onClick={() => isFeedPresentation
          ? setFeedReasonAction('REJECTED')
          : void handleAction('REJECTED')}>반려</Button>
      <Button variant="outlined" color="warning" disabled={isActing}
        onClick={() => isFeedPresentation
          ? setFeedReasonAction('RETURNED')
          : void handleAction('RETURNED')}>보완요청</Button>
    </>
  )}
  {!isFeedPresentation && canCancelSubmission && (
    <Button variant="contained" color="error" disabled={isActing}
      onClick={() => {
        setActionError('');
        setCancelDialogType('submission');
      }}>상신 취소</Button>
  )}
  {!isFeedPresentation && canCancelApproval && (
    <Button variant="contained" color="error" disabled={isActing}
      onClick={() => {
        setActionError('');
        setCancelDialogType('approval');
      }}>승인 취소</Button>
  )}
  <Chip size="small" label={statusPresentation.label} color={statusPresentation.color}
    variant={statusPresentation.variant} sx={{ borderRadius: '8px' }} />
  <Chip size="small" label={kindPresentation.label} color={kindPresentation.color}
    sx={{ borderRadius: '8px' }} />
  <Divider orientation="vertical" flexItem />
  <IconButton aria-label="고정된 문서" disabled size="small">
    <PushPinOutlinedIcon fontSize="small" />
  </IconButton>
  {documentMenu}
</Stack>
```

The shared `FeedCard` API remains unchanged. Keep the current detail opinion field, move its three action buttons into this toolbar, and use its existing validation. In feed mode, the two action handlers only set `feedReasonAction` and open the reason dialog. The existing `approval-line-participant-${line.electronicApprovalLineId}` test id on the bordered card is sufficient to assert its computed theme border color.

- [x] **Step 5: Add the feed reason dialog**

Store a nullable `feedReasonAction` for `REJECTED`/`RETURNED`. In feed mode, clicking either button clears the old error and opens a dialog with a required reason field. The confirmation calls the existing `handleAction(feedReasonAction)`; approval continues to call `handleAction('APPROVED')` directly. On dialog cancel, clear the pending feed action without making an API call. Keep the dialog open on validation or server error and close it only after success or explicit cancel.

- [x] **Step 6: Run tests**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-presentation.test.ts tests/common-view-mode.test.tsx tests/document-write-page.test.tsx
```

Expected: PASS, including the previously existing cancellation, body-expansion, and quiet-refresh regressions. If a timing-sensitive existing test fails, rerun that test alone and report the isolated result; do not silently increase global timeouts.

The focused suite reported 97/102 passing in a single run; five unrelated composer tests timed out under the combined run and all five passed when isolated. The ten directly relevant toolbar/identity regression tests passed.

### Task 5: Verify responsive behavior and update result evidence

**Files:**
- Modify: `docs/result/20261014/document-approval-cancel-status-consistency/20261014_008_문서결재취소_상태구분표시통일_결과보고서.md`
- Create or replace: `docs/result/20261014/document-approval-cancel-status-consistency/screenshots/`

- [x] **Step 1: Run the frontend production build**

Run:

```powershell
Set-Location frontend
npm run build
```

Expected: TypeScript and Vite build succeed. Record any existing large-chunk warning without treating it as a build failure.

- [x] **Step 2: Inspect the document-write page at required widths**

Reuse the existing S-ERP server on `http://127.0.0.1:4173`; do not terminate it because it predates this work. At 375px, 768px, and 1280px, verify toolbar order, wrapping without overlap, no horizontal overflow, badge radius/variant parity, feed reason dialogs, draft-only deletion, and pending approval-line border color. Use synthetic, non-sensitive document data.

DOM layout metrics at 375px, 768px, and 1280px confirmed no document or toolbar horizontal overflow and `flex-wrap: wrap`. Toolbar order, badge styling, feed reason validation, deletion visibility, and pending-line color were verified by the focused tests. The hidden browser page did not produce fresh viewport screenshots; see the result report.

- [ ] **Step 3: Save screenshots and record actual results**

Save updated mobile/tablet/desktop screenshots under `docs/result/20261014/document-approval-cancel-status-consistency/screenshots/`. Update the result report with the approved refinement scope, focused test/build outcomes, browser widths, and any unresolved pre-existing failures. Do not claim UI behavior or tests that were not directly observed.

- [ ] **Step 4: Check the final scope**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only the already-started approval work and this approved UI refinement appear. Do not reset or discard the pre-existing worktree changes.
