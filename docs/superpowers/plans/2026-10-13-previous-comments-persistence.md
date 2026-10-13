# Previous Comments Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep all loaded comments visible after adding a comment or reply in notice and approval details, and show the count of comments that have not yet been loaded.

**Architecture:** The shared `FeedCommentsSection` will render an optional remaining-count label. Notice keeps its existing local comment/page state and supplies a count derived from the item total and loaded tree. Approval will merge a successfully created record into its current paginated records and increment the total instead of reloading the first page, preserving the previous-page cursor and availability state.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Playwright browser validation.

---

## File Map

- Modify `frontend/src/shared/components/feed/FeedCommentsSection.tsx`: optional count prop and accessible label.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: calculate remaining comment count and preserve current page state on local comment changes.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: preserve paginated comments after create/update/delete and pass user-comment remaining count.
- Modify `frontend/tests/feed-components.test.tsx`: shared button label tests.
- Modify `frontend/tests/notice-page-local-updates.test.tsx` and `frontend/tests/notice-page.test.tsx`: notice pagination persistence tests.
- Modify `frontend/tests/document-write-page.test.tsx`: approval create/reply persistence and counter tests.
- Create date-specific work direction, implementation plan, and detailed specification under `docs/directions/20261013`, `docs/plan/20261013`, and `docs/spec/20261013`.
- Create `docs/result/20261013/previous-comments-persistence/` report and sanitized viewport screenshots.

## Task 1: Add remaining-count support to the shared control

**Files:**
- Modify: `frontend/src/shared/components/feed/FeedCommentsSection.tsx`
- Test: `frontend/tests/feed-components.test.tsx`

- [x] **Step 1: Write count and no-count tests**

Add tests that render `FeedCommentsSection` with `remainingPreviousCount={4}` and assert the button's visible text and accessible name are `이전 댓글 보기 (4)`. Render without the prop and assert the existing `이전 댓글 보기` label remains unchanged.

- [x] **Step 2: Run the focused test and confirm the count case fails**

Run from `frontend`:

```powershell
npx vitest run tests/feed-components.test.tsx -t "previous comments"
```

Expected before implementation: the test using the unsupported count prop fails; the no-count baseline remains as before.

- [x] **Step 3: Implement the optional count label**

Add `remainingPreviousCount?: number` to the props. Normalize only finite, nonnegative values; render the existing label when absent and append ` (${count})` when present. Use the same full label for the button's `aria-label`. Keep loading text, disabled state, and callback behavior unchanged.

- [x] **Step 4: Re-run shared component tests**

Run the command from Step 2. Expected: all selected tests pass.

## Task 2: Preserve notice's expanded comment state and show its count

**Files:**
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Test: `frontend/tests/notice-page-local-updates.test.tsx`
- Test: `frontend/tests/notice-page.test.tsx`

- [x] **Step 1: Add the notice regression scenario**

Extend the existing `preserves loaded older roots and cursor when the server item changes locally` test. Use an item with a total count larger than the visible latest-three set; load an older page, submit a root comment and a reply, then assert the loaded older roots remain, each newly submitted item appears once, and the cursor for the next previous-page request is still the response cursor.

- [x] **Step 2: Run the focused test to verify behavior**

Run:

```powershell
npx vitest run tests/notice-page-local-updates.test.tsx -t "preserves loaded older roots"
```

Expected: the test demonstrates the current preservation behavior before any production change; if it fails, use the failing assertion to identify whether the reset is in item snapshots, cursor state, or local comment merging.

- [x] **Step 3: Pass the remaining count to the shared section**

For each item, calculate `Math.max(0, item.commentCount - countComments(itemComments))` only when `item.commentCount` is a finite number. Pass this as `remainingPreviousCount` to `FeedCommentsSection`; keep `canLoadPrevious` and existing cursor/exhaustion guards unchanged.

- [x] **Step 4: Assert the count changes only as comments are loaded**

Assert that the count is total minus the currently loaded tree size before and after loading a page. After adding a root/reply, assert loaded content and total both increase while the remaining count stays unchanged.

- [x] **Step 5: Run notice regression tests**

Run:

```powershell
npx vitest run tests/notice-page-local-updates.test.tsx tests/notice-page.test.tsx -t "previous comments|older roots|newly created root comment|reply"
```

Expected: selected notice comment persistence and pagination tests pass.

## Task 3: Preserve approval comments after create, reply, edit, and delete

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add approval create-after-previous-page regression**

Use a minimal fixture with five total user comments: three in the initial response (`resultCnt: 5`, cursor 23) and one older comment in the next response (`hasPrevious: true`, cursor 22), leaving one unrequested comment. Load the older page, register a new root comment and a reply, and assert all loaded comments remain visible, the previous button keeps the one-not-yet-loaded count, and `listApprovalComments` is not called for a new first page after either registration.

- [x] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "keeps loaded approval comments after"
```

Expected before implementation: prior loaded comments disappear or the list API is called again with `beforeCommentId: undefined`; the assertion exposes the first-page reset.

- [x] **Step 3: Preserve the created approval record locally**

In `handleAddComment`, append the server-created `DocumentApprovalComment` to the existing records after creation. Make `uploadCommentFiles` return the uploaded attachment metadata and merge those attachments into the created record. Increment `commentCount` exactly once. Do not call `loadComments()` after successful create; do not alter `hasPreviousComments` or `nextBeforeCommentId`.

If attachment upload fails after comment creation, retain the server-created record in current state, keep existing upload cleanup/error reporting, and surface the failure rather than resetting the list.

- [x] **Step 4: Pass approval remaining count**

Pass `Math.max(0, commentCount - commentRecords.length)` as the optional count to `FeedCommentsSection` when both values are finite. `commentRecords` contains only USER records, so do not add `detail.systemEvents.length` to this calculation.

- [x] **Step 5: Verify root and reply registration**

Add/extend focused tests for root comment and reply submission after older comments have been loaded. Assert previous comments remain, the new entry is visible in its correct tree position, total count increments once, the previous cursor is unchanged, and no first-page reload occurs.

- [x] **Step 6: Run approval comment regressions**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "previous approval comment|keeps loaded approval comments"
```

Expected: selected approval comment registration, ordering, and pagination tests pass. Comment edit/delete behavior is unchanged and remains outside this task's scope.

## Task 4: Verify integrated behavior and record results

**Files:**
- Create: `docs/result/20261013/previous-comments-persistence/20261013_002_이전댓글_상태유지_및_카운트_결과.md`
- Create: `docs/result/20261013/previous-comments-persistence/screenshots/` sanitized screenshots.
- Update: dated direction/plan/spec documents if implementation evidence changes a stated requirement.

- [x] **Step 1: Run related test files**

Run from `frontend`:

```powershell
npx vitest run tests/feed-components.test.tsx tests/notice-page-local-updates.test.tsx tests/notice-page.test.tsx tests/document-write-page.test.tsx
```

Focused comment-pagination regressions pass. The broader run reports existing notice-suite failures; see the result report. Do not treat that broader run as passing.

- [x] **Step 2: Run production build and whitespace verification**

Run:

```powershell
npm run build
git diff --check
```

Expected: TypeScript/Vite build and diff check exit successfully.

- [x] **Step 3: Check responsive browser behavior**

Use the existing shared S-ERP browser session to inspect notice and approval previous-comment controls at 375px, 768px, and 1280px. Confirm loaded approval comments and the remaining-count control in the browser; use regression tests for submitted comments/replies so no test content is persisted to the shared database. Save sanitized screenshots under the result screenshots folder.

- [x] **Step 4: Write the result report**

Record the root cause, changed behavior, exact test/build results, viewport measurements, screenshot links, and any unresolved pre-existing test failures.

## Self-review

- Spec coverage: common button count is Task 1; notice persistence and count are Task 2; approval create/reply persistence and count are Task 3; functional/build/browser evidence is Task 4. Existing comment edit/delete behavior remains out of scope.
- Placeholder scan: no TODO/TBD placeholders; implementation expectations and commands are explicitly stated.
- Type consistency: count prop is `remainingPreviousCount?: number`; notice uses numeric `commentCount` and recursive `countComments`; approval uses numeric `commentCount` and `commentRecords.length`.

No commit is included; preserve the existing in-progress worktree changes.
