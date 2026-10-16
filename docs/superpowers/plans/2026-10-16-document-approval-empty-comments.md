# Document Approval Empty Comment State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the empty-comments message in the document-approval detail while keeping the composer and all other comment states unchanged.

**Architecture:** Remove the empty-state `Typography` branch from `DocumentApprovalDetailFeed.tsx`. Add a focused integration assertion to the existing document-write page test proving both that the label is absent and that the comment composer remains available.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library.

---

## File Map

- Modify `frontend/tests/document-write-page.test.tsx` to cover the empty USER/SYSTEM page and preserve the composer.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` to remove only the empty-state label.
- Update `docs/spec/20261016/20261016_006_전자결재_시스템메시지_통합댓글페이지_상세사양서.md` and the existing approval comment stream result report with this small behavior clarification.
- Add the dated result report at `docs/result/20261016/approval-empty-comment-state/`.

## Task 1: Add the Regression Test

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Read: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [x] **Step 1: Add a detail-page test with an empty comment page**

Use the file's existing `render(<DashboardContent {...pageProps} />)` and list-row selection pattern. Set the detail fixture `systemEvents: []`; resolve `composerApi.listApprovalComments` with an empty page containing `comments: []`, `systemEvents: []`, `resultCnt: 0`, `hasPrevious: false`, and `nextBeforeCommentId: null`. After selecting document A and waiting for `댓글 입력`, assert:

```tsx
expect(screen.queryByText('등록된 댓글이 없습니다.')).not.toBeInTheDocument();
expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument();
```

- [x] **Step 2: Run the test and confirm the intended failure**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx -t "hides the empty comment message"
```

Observed: the focused test failed at the missing-message assertion because the detail component rendered `등록된 댓글이 없습니다.` for the empty USER/SYSTEM state.

## Task 2: Remove Only the Empty-State Label

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [x] **Step 1: Remove the empty-state `Typography` branch**

Delete only the conditional block currently rendered when `commentRecords.length === 0 && commentSystemEvents.length === 0` inside `FeedCommentsSection`. Preserve the loading conditional immediately above it, `commentError` alert/retry block, `CommentThread`, previous-page controls, and all composer handlers.

- [x] **Step 2: Run the focused regression test**

Run:

```powershell
npm run test -- tests/document-write-page.test.tsx -t "hides the empty comment message"
```

Observed: PASS; the label was absent and the composer textbox and registration button remained present.

## Task 3: Verify and Document

**Files:**
- Update: `docs/spec/20261016/20261016_006_전자결재_시스템메시지_통합댓글페이지_상세사양서.md`
- Update: `docs/result/20261016/approval-comment-stream/20261016_006_전자결재_시스템메시지_통합댓글페이지_결과보고서.md`
- Create: `docs/result/20261016/approval-empty-comment-state/20261016_012_전자결재_빈댓글_안내문구_제거_결과보고서.md`

- [x] **Step 1: Run the focused file**

Run:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Observed: the complete file had 62 passed and 31 failed. The new regression test passed; failures were in other approval cancellation, attachment, and UI tests and were not changed as part of this request.

- [x] **Step 2: Run the frontend production build**

Run:

```powershell
npm run build
```

Observed: TypeScript and Vite build finished with exit code 0; Vite emitted its existing large-chunk warning.

- [x] **Step 3: Update related documentation**

Recorded the behavior in the approval comment specification and result report. The shared browser could not validate the empty state because the runtime had backend CORS/HTTP 500 failures and a page-level React hook-order error.

- [x] **Step 4: Check patch formatting**

Run from repository root:

```powershell
git diff --check
```

Observed: `git diff --check` exited 0 with no whitespace errors.
