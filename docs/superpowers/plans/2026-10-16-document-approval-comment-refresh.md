# Document Approval Comment Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the latest combined comment page after successful document approval actions and keep the detail open so the newly recorded system message is immediately visible.

**Architecture:** Keep the existing detail component as the owner of approval-detail and comment-page state. After an action succeeds, trigger its existing detail reload and `loadComments()` first-page request, then keep the existing parent-list refresh. Use the established comment-load error/retry state rather than synthesizing system events or turning a successful action into a failed one.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, MUI, Vite.

---

## File Map

- `frontend/tests/document-write-page.test.tsx` — integration coverage for approval, cancellation, comment refresh failure, action failure, and detail visibility.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` — action success handlers and their local detail/comment refresh.
- `docs/directions/20261016/20261016_018_문서상세_액션후_댓글즉시갱신_작업지시서.md` — approved work scope and completion conditions.
- `docs/plan/20261016/20261016_018_문서상세_액션후_댓글즉시갱신_계획서.md` — dated project plan.
- `docs/spec/20261016/20261016_018_문서상세_액션후_댓글즉시갱신_상세사양서.md` — detailed frontend behavior and regression criteria.
- `docs/result/20261016/document-approval-comment-refresh/result.md` and `screenshots/` — test/build/browser results and non-sensitive viewport captures.

## Task 1: Add failing action-refresh regression tests

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Extend the successful detail approval test**

In `submits a detail approval directly with its optional opinion`, keep an `onClose` spy, configure a first empty page and a second page with a system event, and assert the new event is rendered, the comment endpoint was called twice, and `onClose` was not called.

```tsx
composerApi.listApprovalComments
  .mockResolvedValueOnce({
    comments: [],
    systemEvents: [],
    hasPrevious: false,
    nextBeforeCommentId: null,
    resultCnt: 0,
  })
  .mockResolvedValueOnce({
    comments: [],
    systemEvents: [{
      commentId: 501,
      ownerId: 1,
      commentType: 'SYSTEM',
      eventType: 'APPROVED',
      content: '승인 액션 시스템 메시지',
      writerName: '결재자',
      createdAt: '2026-10-16T09:00:00Z',
    }],
    hasPrevious: false,
    nextBeforeCommentId: null,
    resultCnt: 1,
  });
```

- [ ] **Step 2: Extend the cancellation success test**

In the existing parameterized detail cancellation test, pass a named `onClose` spy and assert each cancellation leaves it uncalled, requests comments a second time, and requests document detail a second time after the action. Keep the existing confirmation-dialog and API-call assertions.

```tsx
const onClose = vi.fn();
render(<DocumentApprovalDetailFeed
  open electronicApprovalId={1} detailRefreshToken={0}
  onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
);
```


- [ ] **Step 3: Cover comment-refresh failure after action success**

Add a detail test whose first `listApprovalComments` call resolves and whose second call rejects with `댓글 재조회 실패`. Complete approval, then assert the success notification was emitted, the comment error is visible, and `onClose` was not called.

```tsx
composerApi.listApprovalComments
  .mockResolvedValueOnce({
    comments: [],
    systemEvents: [],
    hasPrevious: false,
    nextBeforeCommentId: null,
    resultCnt: 0,
  })
  .mockRejectedValueOnce(new Error('댓글 재조회 실패'));
```

- [ ] **Step 4: Assert action failure does not refresh comments**

In the existing `processes a detail %s through a reason dialog with retry` test, after the first action request rejects, assert the initial comment request remains the only request. Keep the retry-success assertions; successful retry must now leave the detail open.

```tsx
expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
```

- [ ] **Step 5: Run the new regression tests before implementation**

Run from `frontend`:

```powershell
.\node_modules\.bin\vitest.cmd run tests/document-write-page.test.tsx -t 'detail approval|detail .* cancellation|refreshing comments fails|reason dialog with retry'
```

Expected: the new refresh/detail-open assertions fail against the current handlers because successful approval closes the detail and successful actions do not request a second comment page.

## Task 2: Refresh detail and latest comments after successful actions

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] **Step 1: Update the approval/rejection/return success path**

After `processDocumentApprovalAction` succeeds, keep the existing success message and reason cleanup, request parent-list refresh, trigger the component's existing detail reload, and await the existing first-page comment loader. Remove `onClose?.()` from this success path so detail mode stays visible.

```tsx
onActionComplete();
setDetailRetryToken((token) => token + 1);
await loadComments();
```

Do not move these calls into the failure path. `loadComments()` owns its existing inline error and retry state, so a failed comment refresh must not replace the successful action status with an action error.

- [ ] **Step 2: Refresh comments after submission/approval cancellation**

Keep the existing confirmation closure, parent-list refresh, and detail reload. Add the same first-page comment refresh after the cancellation API succeeds:

```tsx
setCancelDialogType(null);
onActionComplete();
setDetailRetryToken((token) => token + 1);
await loadComments();
```

- [ ] **Step 3: Run the focused regression tests**

Run from `frontend`:

```powershell
.\node_modules\.bin\vitest.cmd run tests/document-write-page.test.tsx -t 'detail approval|detail .* cancellation|refreshing comments fails|reason dialog with retry'
```

Expected: all selected tests pass, the detail remains open after success, updated event data is rendered from the server page response, and comment-refresh errors remain in the comment area.

- [ ] **Step 4: Run the full owning test file**

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: the document-write integration tests pass, including existing action validation, action failure, cancellation permission, comment pagination, and system-event behavior.

## Task 3: Validate, document, and capture the result

**Files:**
- Create: `docs/result/20261016/document-approval-comment-refresh/result.md`
- Create: `docs/result/20261016/document-approval-comment-refresh/screenshots/`

- [ ] **Step 1: Run the production build**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript compilation and Vite production build complete successfully.

- [ ] **Step 2: Verify the action flow in the browser**

Use the existing S-ERP browser session on port `4173` if it is still available. Use a safe, authorized test document; verify one approval-family action and one cancellation action show the newly persisted system message without closing the detail. Do not trigger actions against a real business document without authorization. Check 375px, 768px, and 1280px widths and save only screenshots containing non-sensitive or synthetic data.

- [ ] **Step 3: Write the result report**

Record the reproduction condition, root cause, exact changed handlers/tests, focused Vitest result, build result, browser action outcomes, and screenshot paths in `docs/result/20261016/document-approval-comment-refresh/result.md`. If a browser action cannot be safely performed, state that limitation explicitly and do not claim it was verified.

- [ ] **Step 4: Check the final scope**

Run:

```powershell
git status --short
git diff --check
```

Expected: only this task's dated docs, result artifacts, component, and focused test are changed; unrelated pre-existing worktree changes remain untouched.
