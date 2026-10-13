# Feed Detail UI Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make notice and electronic-approval detail panels share centered loading, expanded-on-entry bodies, system-event iconography, distinct reply toggles, and the requested divider layout.

**Architecture:** Keep common presentation in `PostDetailPanel`, `FeedBodyContent`, and `TiptapCommentThread`; feature hooks own their selected-item loading state and detail body state. Do not change API, authorization, comment data, cursor, or mutation behavior.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## Scope and file map

- Modify `docs/directions/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_작업지시서.md`, `docs/plan/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_계획서.md`, and `docs/spec/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_상세사양서.md` before changing UI code.
- Modify `frontend/src/shared/components/feed/PostDetailPanel.tsx`: optional loading status that replaces panel content with an accessible spinner centered on both axes in its full available content region.
- Modify `frontend/src/pages/groupware/community/notice/hooks/useNoticeInteractions.ts` and `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`: track selected notice detail loading and provide it to the shared panel; preserve summary data, error toast, and existing expand-on-select behavior.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: replace the left-pane document-list spinner with `FeedViewSkeleton` or `ListViewSkeleton` according to the selected view mode.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: use the shared panel loading state and initialize selected detail body expanded.
- Modify `frontend/src/shared/components/feed/TiptapCommentThread.tsx`: replace the SYSTEM chip with an accessible, non-interactive system icon and use separate collapsed/expanded reply icons with `aria-expanded`.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx` and `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: remove the previous-comments separator in both features, plus the approval body divider; omit the notice body-to-reaction divider only when no attachments are present, retaining attachment-to-reaction spacing and the approval-line separator.
- Add or update focused tests in `frontend/tests/feed-components.test.tsx`, `frontend/tests/notice-page.test.tsx`, and `frontend/tests/document-write-page.test.tsx`.
- Create `docs/result/20261013/feed-detail-ui-parity/20261013_003_공지사항_전자결재_상세_UI_통일_결과.md` and save 375px, 768px, and 1280px screenshots under `screenshots/`.

## Task 1: Update dated work documents

**Files:**
- Modify: `docs/directions/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_작업지시서.md`
- Modify: `docs/plan/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_계획서.md`
- Modify: `docs/spec/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_상세사양서.md`

- [ ] **Step 1: Record the approved UI behavior**

Add criteria for centered notice/approval detail loading, expanded body on detail entry while preserving collapsed list cards, icon-only SYSTEM marker, distinct reply toggle states, and removal of the two specified dividers. Record that APIs, permissions, cursor, comment mutations, unrelated separators, and the approval-line separator remain unchanged.

Use consistent acceptance wording in all three documents:

```text
- Notice and approval detail loading occupies the panel content region and centers its spinner both horizontally and vertically.
- Selecting an item opens its detail body expanded; list cards remain collapsed by default.
- SYSTEM timeline items show an accessible icon instead of a visible text badge and remain read-only.
- Reply toggles show a down icon while collapsed and an up icon while expanded, with aria-expanded.
- Remove the previous-comments separator across notice/approval, the body divider in approval, and the notice body-to-reaction divider when no attachments exist. Preserve the notice attachment-to-reaction divider and approval-line divider.
```

- [ ] **Step 2: Review the updated documents**

Read the three updated sections and confirm their scope matches the approved design at `docs/superpowers/specs/2026-10-13-feed-detail-ui-parity-design.md`.

## Task 2: Center shared panel loading for notice and approval

**Files:**
- Modify: `frontend/src/shared/components/feed/PostDetailPanel.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/hooks/useNoticeInteractions.ts`
- Modify: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/feed-components.test.tsx`
- Test: `frontend/tests/notice-page.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add failing shared-panel loading test**

Render `PostDetailPanel` with `isLoading` and a loading label. Assert the panel content has an accessible `status`, contains a progress indicator, does not render children, and uses a flex content area with `alignItems: center` and `justifyContent: center`.

The test setup should exercise the public panel API:

```tsx
render(
  <PostDetailPanel
    onClose={() => undefined}
    isLoading
    loadingLabel="상세 불러오는 중"
  >
    <p>상세 내용</p>
  </PostDetailPanel>,
);
expect(screen.getByRole('status', { name: '상세 불러오는 중' })).toBeInTheDocument();
expect(screen.queryByText('상세 내용')).not.toBeInTheDocument();
```

- [ ] **Step 2: Verify the shared-panel test fails**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx -t "centers detail loading"`

Expected: FAIL because `PostDetailPanel` does not yet accept/render the loading state.

- [ ] **Step 3: Add notice selected-detail loading assertions**

Use a deferred `fetchNoticePostDetail` mock in `notice-page.test.tsx`. Select a notice, assert the detail panel shows the accessible centered loading status while the request is pending, resolve the request, then assert the notice detail replaces the spinner.

- [ ] **Step 4: Add approval loading assertions**

Keep the approval detail request pending in `document-write-page.test.tsx`. Assert the panel displays the same shared status and its content is centered; after resolving the request, assert the detail content appears.

- [ ] **Step 5: Implement the panel loading presentation**

Add optional `isLoading?: boolean` and `loadingLabel?: string` props to `PostDetailPanel`. When loading, render an accessible progress status instead of children in the existing scroll region; apply `display: flex`, `alignItems: center`, and `justifyContent: center` while retaining the region's height and minimum-size constraints.

Use this rendering contract:

```tsx
<Box
  data-testid="post-detail-panel-content"
  role={isLoading ? 'status' : undefined}
  aria-label={isLoading ? loadingLabel : undefined}
  sx={{
    minWidth: 0,
    minHeight: 0,
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    p: 1.5,
    ...(isLoading && {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  }}
>
  {isLoading ? <CircularProgress aria-label={loadingLabel} /> : children}
</Box>
```

- [ ] **Step 6: Connect both feature loading states**

In notice interactions, track a selected detail request from `handleSelectNotice`, clear the state in `finally`, and expose it to `CommunityNoticePage`. Pass it to `PostDetailPanel`. In approval detail, pass its existing `isLoading` and Korean loading label to the same shared prop and remove the feature-local spinner branch.

- [ ] **Step 7: Run shared and feature loading tests**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx tests/notice-page.test.tsx tests/document-write-page.test.tsx -t "centers detail loading|selected notice|approval detail loading"`

Expected: all selected tests pass.

## Task 3: Make detail bodies expanded on selection

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/notice-page.test.tsx`

- [ ] **Step 1: Add failing approval default-expanded assertion**

Open a document with differing summary/body content and assert `approval-document-body` is expanded immediately and the control reads `접기`, without clicking `더보기`.

- [ ] **Step 2: Verify the approval assertion fails**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx -t "opens approval detail with the body expanded"`

Expected: FAIL because approval detail currently initializes `isBodyExpanded` to false.

- [ ] **Step 3: Pin notice expansion on detail selection**

In `notice-page.test.tsx`, select a notice in its feed view and assert the right-side detail's shared body is expanded, while a non-selected feed card remains collapsed.

- [ ] **Step 4: Initialize approval selected-detail state expanded**

Change the approval detail reset state to expanded when a document is opened. Keep the existing shared `FeedBodyContent` toggle available so the reader can collapse it. Do not change the list-card rendering defaults.

In the existing open/detail reset effect, initialize:

```ts
setIsBodyExpanded(true);
```

- [ ] **Step 5: Run both detail-body tests**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx tests/notice-page.test.tsx -t "body expanded|selects a notice"`

Expected: selected detail bodies are expanded on entry; list card behavior remains unchanged.

## Task 4: Replace SYSTEM badge and differentiate reply toggle icons

**Files:**
- Modify: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- Test: `frontend/tests/feed-components.test.tsx`

- [ ] **Step 1: Add failing SYSTEM icon test**

Render a `CommentThread` SYSTEM event. Assert the accessible `시스템 메시지` icon is present, visible badge text `시스템` is absent, and no comment menu/reply actions are present.

- [ ] **Step 2: Add failing reply-toggle state test**

Render a comment with one reply. Assert the collapsed `답글 1개` button has `aria-expanded=false` and a downward icon. Click it; assert the reply appears, `aria-expanded=true`, and the icon is upward.

- [ ] **Step 3: Verify both tests fail**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx -t "system indicator icon|distinct reply toggle icons"`

Expected: FAIL because SYSTEM currently uses a Chip and both reply states currently use `ArrowDropDownIcon` without expanded state.

- [ ] **Step 4: Implement the icon-only SYSTEM marker**

Replace the SYSTEM Chip in `TiptapCommentThread` with a non-interactive `InfoOutlined` icon carrying `aria-label`/`titleAccess="시스템 메시지"`; preserve author, event content, and all mutation guards.

Use an inline, non-button icon:

```tsx
{isSystemEvent && (
  <InfoOutlinedIcon
    aria-label="시스템 메시지"
    titleAccess="시스템 메시지"
    data-testid="system-event-icon"
    fontSize="small"
  />
)}
```

- [ ] **Step 5: Implement state-specific reply icons**

Use `KeyboardArrowDown` when `showReplies` is false and `KeyboardArrowUp` when true for both deleted and normal comment reply controls. Add `aria-expanded={showReplies}` and leave click/state behavior unchanged.

Use the same state mapping on both reply-count controls:

```tsx
aria-expanded={showReplies}
endIcon={
  showReplies
    ? <KeyboardArrowUpIcon fontSize="small" />
    : <KeyboardArrowDownIcon fontSize="small" />
}
```

- [ ] **Step 6: Run feed component tests**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx`

Expected: all shared feed component tests pass.

## Task 5: Remove only the requested feed separators

**Files:**
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/notice-page.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add separator assertions**

For notice feed cards and selected details with no attachments, assert there is no separator between body and reaction bar; when attachments exist, assert the attachment-to-reaction separator remains. For notice and approval, assert no separator between reaction bar and previous-comments control. For approval details, assert no separator immediately follows the body and the approval-line and attachment/reaction separators remain.

- [ ] **Step 2: Verify the separator assertions fail**

Run: `Set-Location frontend; npx vitest run tests/notice-page.test.tsx tests/document-write-page.test.tsx -t "detail separators"`

Expected: FAIL on the dividers specifically identified for removal.

- [ ] **Step 3: Remove the body separator and comments-top separator**

Delete only the approval `Divider` immediately after `FeedBodyContent` and the `Divider` between approval's `FeedReactionBar` and `FeedCommentsSection`. In `NoticeFeedList`, render the pre-reaction `Divider` only when an attachment section is present, and remove the `Divider` between `FeedReactionBar` and `FeedCommentsSection` across feed cards and selected details. Keep the approval-line divider and attachment/reaction separator.

- [ ] **Step 4: Run selected notice and approval tests**

Run: `Set-Location frontend; npx vitest run tests/notice-page.test.tsx tests/document-write-page.test.tsx -t "detail separators"`

Expected: requested separators are absent and unrelated separators remain.

## Task 6: Use view-matched skeletons for document list loading

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add a deferred-loading skeleton test**

Hold `listDocumentApprovals` pending, render the page in its default list mode, and assert `document-list-skeleton` wraps `ListViewSkeleton`. Switch to feed mode while the request is still pending and assert `document-feed-skeleton` wraps `FeedViewSkeleton`.

```tsx
composerApi.listDocumentApprovals.mockImplementationOnce(
  () => new Promise(() => undefined),
);
render(<DashboardContent {...pageProps} />);
expect(await screen.findByTestId('document-list-skeleton')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
expect(screen.getByTestId('document-feed-skeleton')).toBeInTheDocument();
```

- [ ] **Step 2: Verify the skeleton test fails**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx -t "uses view-matched skeletons while loading"`

Expected: FAIL because the document page currently renders a centered `CircularProgress` instead of either skeleton.

- [ ] **Step 3: Reuse notice skeleton components**

Import `FeedViewSkeleton` and `ListViewSkeleton` into `DocumentWritePage.tsx`, then replace the spinner inside the existing `isLoading` branch with:

```tsx
<Box
  data-testid={
    viewMode === 'feed'
      ? 'document-feed-skeleton'
      : 'document-list-skeleton'
  }
>
  {viewMode === 'feed' ? <FeedViewSkeleton /> : <ListViewSkeleton />}
</Box>
```

- [ ] **Step 4: Verify the skeleton test passes**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx -t "uses view-matched skeletons while loading"`

Expected: both view modes render their corresponding shared skeleton while loading.

## Task 7: Final regression and result evidence

**Files:**
- Create: `docs/result/20261013/feed-detail-ui-parity/20261013_003_공지사항_전자결재_상세_UI_통일_결과.md`
- Create: `docs/result/20261013/feed-detail-ui-parity/screenshots/`

- [ ] **Step 1: Run focused regression suites**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx tests/notice-page.test.tsx tests/document-write-page.test.tsx`

Expected: all tests pass, except only previously documented baseline failures if they reproduce outside the touched behaviors; report such failures without silently changing unrelated behavior.

- [ ] **Step 2: Run the frontend build**

Run: `Set-Location frontend; npm run build`

Expected: `tsc -b` and Vite production build exit successfully.

- [ ] **Step 3: Verify both detail panels in the browser**

Reuse the running S-ERP browser at `http://127.0.0.1:4173`. At 375px, 768px, and 1280px verify centered loading for notice and approval details, matching view-mode skeletons for the two left panes, selected detail default expansion, collapsed feed-card bodies, icon-only SYSTEM marker, reply icon state changes, and divider placement. Record measurements and capture screenshots without including sensitive shared live data.

- [ ] **Step 4: Write the result report**

Record implemented behavior, exact test/build results, browser measurements/screenshots, and any unavailable live verification. Link the three responsive screenshots from the report.

- [ ] **Step 5: Check whitespace and final diagnostics**

Run `git diff --check` and check modified frontend files in Problems. Expected: no whitespace or type errors.
