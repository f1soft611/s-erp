# Shared Notice and Approval Body Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make approval details use the same reusable body, image preview, approval-line geometry, and older-comment behavior as the notice detail.

**Architecture:** Extract the body display and interactions into a presentational feed component consumed by both NoticeFeedList and DocumentApprovalDetailFeed. Keep HTML preparation, authenticated Blob fetching, state, API calls, and permission decisions in each feature. Reuse the composer slot dimensions for approval detail, and use the existing cursor API with a three-comment initial page followed by 20-comment older pages.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## Scope and file map

- Create `frontend/src/shared/components/feed/FeedBodyContent.tsx`: shared rich/plain content clipping, expand/collapse control, untitled embedded-image preview row, and image-open callback.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: adapt existing body and preview/hydration state to the shared body component without changing notice behavior.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: hydrate approval embedded images into real inline `<img>` nodes, consume shared body presentation, align read-only line slots to composer geometry, place the trailing divider, and change initial comment page size.
- Modify `frontend/tests/feed-components.test.tsx`: shared body component tests.
- Modify `frontend/tests/notice-page.test.tsx` and `frontend/tests/notice-page-local-updates.test.tsx` only as needed to pin notice body parity.
- Modify `frontend/tests/document-write-page.test.tsx`: approval body, line layout, image, and cursor-page regression coverage.
- Modify `docs/directions/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_작업지시서.md`, `docs/plan/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_계획서.md`, and `docs/spec/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_상세사양서.md`: append the approved follow-up requirements and acceptance checks.
- Create `docs/result/20261013/approval-feed-regression/20261013_002_공지사항_전자결재_공통본문_결재선_이전댓글_결과.md` and save browser screenshots under its `screenshots/` folder.

## Task 1: Extract and migrate the shared body display

**Files:**
- Create: `frontend/src/shared/components/feed/FeedBodyContent.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Test: `frontend/tests/feed-components.test.tsx`
- Test: `frontend/tests/notice-page.test.tsx`

- [x] **Step 1: Add failing shared-body tests**

Add tests that render `FeedBodyContent` with short and long plain content and rich HTML. Assert the collapsed rich body is clipped, its `더보기` control appears when body content differs from summary, clicking changes the button to `접기`, image preview buttons have accessible names but no visible heading, and clicking a preview calls the image callback with its `src` and `alt`.

- [x] **Step 2: Run the shared body tests and confirm the component is missing**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx`
Expected: the new tests fail because `FeedBodyContent` is not implemented.

- [x] **Step 3: Implement the presentation-only props contract**

Implement a body component with controlled expansion and two content forms:

```ts
type FeedBodyImage = { src: string; alt: string };

type FeedBodyContentProps = {
  hasMore: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  richText?: {
    collapsedHtml: string;
    expandedHtml: string;
    images?: FeedBodyImage[];
    imageError?: string;
    onOpenImage: (image: FeedBodyImage) => void;
  };
  text?: { collapsed: string; expanded: string };
};
```

For rich content, use the notice convention: a 220px collapsed excerpt with a gradient, full content when expanded, untitled `112 × 76` image thumbnails when collapsed, and the existing `더보기`/`접기` labels. For plain content, use the three-line clamp in collapsed state. Render image-fetch failures as an explicit error; do not render alt/reference strings in place of the image.

- [x] **Step 4: Run shared-body tests**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx`
Expected: all feed component tests pass.

- [x] **Step 5: Migrate NoticeFeedList to the component**

Replace only the notice body/preview rendering with `FeedBodyContent`. Keep `expandedNoticeId`, summary/body selection, HTML sanitization, source deferral, image hydration and URL cleanup, pin/reaction/comment handling, and viewer state in the notice feature. Preserve notice click-to-interact behavior and the existing thumbnail callback.

- [x] **Step 6: Verify notice parity**

Run: `Set-Location frontend; npx vitest run tests/feed-components.test.tsx tests/notice-page.test.tsx tests/notice-page-local-updates.test.tsx`
Expected: component and notice tests pass with existing expansion and image interactions unchanged.

## Task 2: Match approval body, image, and line presentation

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add failing approval body and layout tests**

Add regression cases asserting:

```tsx
expect(screen.queryByText(/\[본문 이미지/)).not.toBeInTheDocument();
expect(screen.queryByText('본문 이미지', { exact: true })).not.toBeInTheDocument();
expect(screen.getByTestId('approval-line-readonly')).toContainElement(
  screen.getByTestId('approval-line-divider'),
);
expect(screen.getByRole('button', { name: '이전 댓글 보기' })).toBeInTheDocument();
```

Also assert expanded body HTML contains the hydrated embedded `<img>` source, the collapsed preview shows the image without a heading, and each approval participant uses the composer three-row grid. Include a short body with different summary text so the shared expansion control is not coupled to a fixed height.

- [x] **Step 2: Run the new tests and confirm failures**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx --testNamePattern="approval detail|embedded document images|previous approval comment"`
Expected: failures identify the current textual image replacement, separate preview heading, card layout, or initial comment-page behavior.

- [x] **Step 3: Hydrate image sources while preserving real image nodes**

In `DocumentApprovalDetailFeed`, retain the validated approval image endpoint check and feature-owned Blob request. Keep the parsed `<img>` node in the rich HTML, assign a Blob URL after the authenticated fetch succeeds, and collect the same URLs/alt text for the collapsed preview row. Revoke every created URL on effect cleanup. On failed fetch, omit the unavailable source and show the existing explicit image error.

- [x] **Step 4: Consume FeedBodyContent from approval detail**

Pass the sanitized rich HTML with deferred `<img>` nodes as `collapsedHtml`, HTML with hydrated Blob URLs as `expandedHtml`, loaded previews, and the selected-image callback. Use the shared body/summary distinction instead of comparing extracted plain text. Remove all `[본문 이미지 ...]` replacement nodes and the separate `본문 이미지` heading/list.

- [x] **Step 5: Align the read-only approval line**

Render approval participants in a three-row CSS grid matching `DocumentApprovalFields`: `gridTemplateRows: '32px 64px 32px'`; department metadata in the first row, read-only status/action information in the middle row, and stage sequence plus participant name in the last row. Keep only actual participants. Preserve agreement/reference grouping and place a `Divider` with a stable test id after the complete line block and before the document title.

- [x] **Step 6: Run approval-body and line tests**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx --testNamePattern="approval detail|embedded document images"`
Expected: all selected approval body and line tests pass.

## Task 3: Restore notice-style older comments in approval detail

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add failing tests for latest-three and older-page behavior**

Make the first `listApprovalComments` mock return three latest comments with `hasPrevious: true` and `nextBeforeCommentId: 30`. Assert the first request uses `limit: 3`, only those three latest USER comments display initially, and the older-comment button appears. Make the next page return an earlier comment and assert the follow-up request uses `limit: 20` with `beforeCommentId: 30`, prepends the earlier comment, and preserves current comments.

- [x] **Step 2: Run the test and confirm the current initial page differs**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx --testNamePattern="previous approval comment"`
Expected: the first-page limit assertion fails against the current `limit: 20`.

- [x] **Step 3: Use a compact initial page and larger cursor pages**

When `beforeCommentId` is absent, call `listApprovalComments` with `limit: 3`. When loading a cursor page, use `limit: 20`. Keep server `hasPrevious` and cursor authoritative, retain append/prepend ordering, and preserve full reload after comment create/edit/delete.

- [x] **Step 4: Run comment regression tests**

Run: `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx --testNamePattern="posts a new comment|previous approval comment|deleted comments"`
Expected: new-comment refresh, null writer redaction, and older-page tests pass.

## Task 4: Update work instructions and final verification

**Files:**
- Modify: `docs/directions/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_작업지시서.md`
- Modify: `docs/plan/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_계획서.md`
- Modify: `docs/spec/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_상세사양서.md`
- Create: `docs/result/20261013/approval-feed-regression/20261013_002_공지사항_전자결재_공통본문_결재선_이전댓글_결과.md`
- Create: `docs/result/20261013/approval-feed-regression/screenshots/`

- [x] **Step 1: Update acceptance criteria**

Document shared body component behavior in notice and approval, actual inline approval images and untitled collapsed thumbnails, composer-aligned read-only line slots with a trailing divider, and latest-three/cursor-based older comments.

- [x] **Step 2: Run targeted regression tests**

Ran the shared feed component suite, four relevant notice body/image tests, and three relevant approval detail/comment tests. The earlier full baseline run had existing failures in unrelated areas; the full four-file suite was not rerun.

- [x] **Step 3: Run the production build**

Run: `Set-Location frontend; npm run build`
Expected: TypeScript project build and Vite production bundle complete with exit code 0.

- [x] **Step 4: Verify the shared browser at required widths**

In the S-ERP server already running at `http://127.0.0.1:4173`, opened an approval detail and checked page/panel width and horizontal overflow at 375px, 768px, and 1280px. Saved visually redacted screenshots. Functional body/image, line and comment behavior was verified by focused Vitest tests; older-comment pagination was not manually exercised against live records.

- [x] **Step 5: Write the result report**

Record changed behavior, test/build outputs, browser widths, screenshot links, and whether manual older-comment pagination could be exercised on the shared test document. Do not claim an unobserved behavior as browser-verified.

- [x] **Step 6: Check final diff**

Run: `git diff --check`
Expected: no whitespace errors.
