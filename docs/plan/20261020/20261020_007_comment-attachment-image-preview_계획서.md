# 댓글 첨부 이미지 분리 미리보기 Implementation Plan

> **For agentic workers:** Follow this plan task by task. Do not begin code changes until Task 1's dated specification has been reviewed and approved by the user. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서작성과 공지작성 댓글의 이미지 첨부를 일반 파일 항목으로 유지하면서 첨부 목록 아래 별도 미리보기로 표시하고, 클릭 시 기존 확대 뷰어를 연다.

**Architecture:** `TiptapCommentThread` owns the shared comment attachment and preview presentation; `AttachmentList` retains its current default behavior for other consumers and gains an opt-out used by comment display. Document comments reuse their existing authenticated Blob URL flow. Notice comments preserve MIME metadata and load image Blobs through the authenticated common-file service; each parent page supplies the preview URL and existing image-viewer callback.

**Tech Stack:** React 19, TypeScript, MUI, Vitest, React Testing Library, Vite, Playwright/browser validation.

---

## File Map

| File | Responsibility |
| --- | --- |
| `docs/spec/20261020/20261020_007_comment-attachment-image-preview_상세사양서.md` | Dated detailed behavior and verification specification, reviewed before implementation |
| `frontend/src/shared/components/feed/AttachmentList.tsx` | Preserve image thumbnails by default; allow comment display to suppress inline thumbnails |
| `frontend/src/shared/components/feed/TiptapCommentThread.tsx` | Render image previews below each displayed comment's file list and invoke the provided viewer callback |
| `frontend/src/shared/services/commonContentApi.ts` | Retrieve an authenticated comment-file Blob through the existing common-file route |
| `frontend/src/pages/groupware/community/notice/types/community.types.ts` | Keep MIME type and preview state in normalized notice comment attachment data |
| `frontend/src/pages/groupware/community/notice/data/noticePostAdapter.ts` | Preserve MIME type while mapping existing comment attachments |
| `frontend/src/pages/groupware/community/notice/hooks/useNoticeComments.ts` | Preserve MIME type for attachments uploaded while editing a notice comment |
| `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx` | Load image Blobs for displayed comments, manage object URLs/errors, and connect to the notice image viewer |
| `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` | Reuse document comment Blob URLs, report preview failures, and connect comment previews to the existing document image viewer |
| `frontend/tests/feed-components.test.tsx` | Shared file-list and comment-preview rendering/click tests |
| `frontend/tests/common-content-api.test.ts` | Authenticated common-file Blob route test |
| `frontend/tests/notice-post-adapter.test.ts` | MIME metadata preservation test for top-level comments and replies |
| `frontend/tests/notice-page-local-updates.test.tsx` | Notice comment preview, failure, and viewer integration regression tests |
| `frontend/tests/document-write-page.test.tsx` | Document comment image preview and existing viewer integration regression tests |
| `docs/result/20261020/comment-attachment-image-preview/` | Final result and responsive screenshots |

## Task 1: Write and Review the Dated Detailed Specification

**Files:**
- Create: `docs/spec/20261020/20261020_007_comment-attachment-image-preview_상세사양서.md`
- Reference: `docs/superpowers/specs/2026-10-20-comment-attachment-image-preview-design.md`
- Reference: `docs/directions/20261020/20261020_007_comment-attachment-image-preview_작업지시서.md`

- [ ] **Step 1: Write the detailed specification**

Record the user-approved behavior explicitly:

- Apply to currently displayed document and notice comments and replies, including existing and newly added attachments.
- Keep every attachment in the file list with its current filename, icon, download/delete controls, and ordering. Do not render an inline image thumbnail in the comment's view-mode file list.
- Below the file list, show only image MIME attachments with an available Blob URL. Match the existing body preview thumbnail dimensions and horizontal presentation (112 × 76 CSS pixels); make each thumbnail a keyboard-operable button.
- Clicking a thumbnail opens the correct image in the page's existing `ImageViewerDialog`.
- Keep current comment pagination and reply expansion; do not fetch older comment pages solely to show previews.
- On preview-fetch failure, keep the downloadable file entry and show a preview-specific error.
- Revoke created object URLs when the displayed comments change or the page unmounts; ignore stale asynchronous results.
- Preserve the existing `AttachmentList` default behavior for non-comment consumers and preserve comment edit/upload/download/delete behavior.
- Keep API storage contracts and database schema unchanged.
- Verify with focused tests, `npm run build`, and real-browser rendering at 375px, 768px, and 1280px; save screenshots and result notes under the dated result folder.

- [ ] **Step 2: Self-review the specification and request user review**

Check that the spec contains no placeholders, matches the approved design, identifies both feature surfaces, and does not imply that paginated comments are fetched automatically. Ask the user to review the dated spec. Do not start Task 2 until the user approves it.

- [ ] **Step 3: Commit the plan and approved specification**

After the spec is approved, stage only the plan and specification paths and commit them; leave unrelated worktree changes unstaged:

```powershell
git add -- "docs/plan/20261020/20261020_007_comment-attachment-image-preview_계획서.md" "docs/spec/20261020/20261020_007_comment-attachment-image-preview_상세사양서.md"
git diff --cached --check
git commit -m "docs: specify comment attachment image previews" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: the commit contains exactly the two named documentation files and `git diff --cached --check` reports no whitespace errors.

## Task 2: Add Shared Comment Image Preview UI with Tests

**Files:**
- Modify: `frontend/src/shared/components/feed/AttachmentList.tsx`
- Modify: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- Test: `frontend/tests/feed-components.test.tsx`

- [ ] **Step 1: Add a failing shared comment rendering test**

In `feed-components.test.tsx`, render one comment with a PNG attachment having `previewUrl: 'blob:comment-image'` and one PDF. Assert that both filenames remain visible, there is no `<img alt="receipt.png">` inside the attachment list, the separate comment preview button exists, and no PDF preview button exists. Click the image button and expect the callback to receive `{ src: 'blob:comment-image', alt: 'receipt.png' }`.

Use the public component API shape:

```tsx
<CommentThread
  comments={[{
    id: 31,
    author: '작성자',
    time: '2026-10-20 10:00',
    content: '확인 바랍니다.',
    attachments: [
      {
        id: 'image-1',
        name: 'receipt.png',
        mimeType: 'image/png',
        previewUrl: 'blob:comment-image',
      },
      { id: 'file-1', name: 'guide.pdf', mimeType: 'application/pdf' },
    ],
  }]}
  onOpenAttachmentImage={onOpenAttachmentImage}
  showComposer={false}
/>
```

- [ ] **Step 2: Run the focused test and confirm it fails for the missing separate preview**

Run: `npm run test -- tests/feed-components.test.tsx`

Expected: the new test fails because `CommentThread` does not yet render a separate image preview or expose an image-open callback. Existing component tests remain otherwise unchanged.

- [ ] **Step 3: Add an opt-out for inline image thumbnails**

Extend `AttachmentListProps` with `showImagePreview?: boolean`, default it to `true`, and guard only the existing thumbnail JSX with that value. This preserves all current non-comment callers and existing tests.

In the read-only comment attachment list, pass `showImagePreview={false}`. Leave the edit-mode attachment list's current behavior unchanged.

- [ ] **Step 4: Render the separate comment preview strip**

Extend `FeedCommentAttachment` with optional `previewError?: string` and `CommentThreadProps` with:

```ts
onOpenAttachmentImage?: (image: { src: string; alt: string }) => void;
```

For each non-deleted, non-system comment, render a preview only for attachments where `mimeType?.startsWith('image/')` is true. Put the strip immediately after that comment's `AttachmentList`. Render only available `previewUrl` values as buttons with accessible labels; invoke `onOpenAttachmentImage({ src: previewUrl, alt: name })` on click. For failed previews, render the supplied `previewError` as visible `role="alert"` text without removing the attachment file row. Keep the current reply/edit/delete/download interactions unchanged.

- [ ] **Step 5: Run the focused tests and confirm they pass**

Run: `npm run test -- tests/feed-components.test.tsx`

Expected: all tests pass, including the existing default `AttachmentList` image-preview test and the new separate-comment-preview test.

- [ ] **Step 6: Commit the shared UI change**

```powershell
git add -- "frontend/src/shared/components/feed/AttachmentList.tsx" "frontend/src/shared/components/feed/TiptapCommentThread.tsx" "frontend/tests/feed-components.test.tsx"
git diff --cached --check
git commit -m "feat: separate comment image previews" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: only the named files are included in the commit.

## Task 3: Preserve and Load Notice Comment Image Previews

**Files:**
- Modify: `frontend/src/shared/services/commonContentApi.ts`
- Modify: `frontend/src/pages/groupware/community/notice/types/community.types.ts`
- Modify: `frontend/src/pages/groupware/community/notice/data/noticePostAdapter.ts`
- Modify: `frontend/src/pages/groupware/community/notice/hooks/useNoticeComments.ts`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Test: `frontend/tests/common-content-api.test.ts` (create)
- Test: `frontend/tests/notice-post-adapter.test.ts`
- Test: `frontend/tests/use-notice-comments.test.tsx`
- Test: `frontend/tests/notice-page-local-updates.test.tsx`

- [ ] **Step 1: Test MIME preservation for notice comment attachments**

Extend the `mapNoticePost` fixture in `notice-post-adapter.test.ts` with an image attachment on a root comment and another on a reply. Assert the resulting comment attachments preserve `mimeType` (falling back to `contentType` only when MIME is absent), as well as their current IDs, names, and sizes. Add a `useNoticeComments.test.tsx` assertion that attachments uploaded while editing a comment retain their `mimeType` in the updated comment state.

- [ ] **Step 2: Test the authenticated common-file Blob request**

Create `common-content-api.test.ts` with a hoisted `apiGetBlob` mock. Call `fetchCommonFileBlob('NOTICE_COMMENT', 51, 91)` and expect `apiGetBlob` to receive `/api/v1/common/files/91/download?ownerType=NOTICE_COMMENT&ownerId=51` (allow URLSearchParams' deterministic encoding). Assert the function returns the mocked Blob.

- [ ] **Step 3: Run notice adapter and service tests to confirm the new assertions fail**

Run: `npm run test -- tests/notice-post-adapter.test.ts tests/common-content-api.test.ts tests/use-notice-comments.test.tsx`

Expected: MIME assertions fail before mapping is updated; the new service test fails because the helper is not yet exported; the edit-flow assertion fails because MIME metadata is currently dropped.

- [ ] **Step 4: Preserve image MIME metadata and add the Blob helper**

Add optional `mimeType`, `previewUrl`, and `previewError` fields to `NoticeCommentItem.attachments`. In `toNoticeCommentTree` and `useNoticeComments.handleUpdateComment`, map `mimeType: file.mimeType ?? file.contentType ?? undefined`.

Add this service function to `commonContentApi.ts`, importing the already-existing `apiGetBlob`:

```ts
export function fetchCommonFileBlob(
  ownerType: CommonOwnerType | string,
  ownerId: number | string,
  fileId: number | string,
): Promise<Blob> {
  const query = buildCommonFileOwnerQuery(ownerType, ownerId);
  return apiGetBlob(
    `/api/v1/common/files/${encodeURIComponent(String(fileId))}/download?${query}`,
  );
}
```

- [ ] **Step 5: Run adapter and service tests**

Run: `npm run test -- tests/notice-post-adapter.test.ts tests/common-content-api.test.ts tests/use-notice-comments.test.tsx`

Expected: both suites pass and no notice post, comment, or file write contract changes are introduced.

- [ ] **Step 6: Load displayed notice comment image Blobs and wire the viewer**

In `NoticeFeedList.tsx`, collect image attachments only from the comment tree currently rendered by the existing `visibleComments` and their replies. Fetch them with `fetchCommonFileBlob('NOTICE_COMMENT', commentId, fileId)`. Keep URL/error maps keyed by comment ID and file ID. Create object URLs only for fulfilled Blob results; associate failed results with `previewError`. On effect cleanup, prevent stale state writes and revoke every object URL created by that effect.

When normalizing comments for `CommentThread`, preserve `mimeType`, `previewUrl`, and `previewError`. Pass `onOpenAttachmentImage={setViewerImage}` so attached images use the existing notice `ImageViewerDialog`. Do not change previous-comment pagination or eagerly fetch comments outside the displayed tree.

- [ ] **Step 7: Add notice preview, failure, and URL cleanup regression assertions**

Extend `notice-page-local-updates.test.tsx` using its existing `NoticeFeedList` render setup. Mock `fetchCommonFileBlob` to return a Blob for one image comment and reject for another. Assert the image filename is still in the file list, the image preview button appears only after Blob resolution, clicking it opens the existing viewer with the resolved object URL, the failed file remains downloadable and shows a preview error, and previous-comment loading is not triggered just by rendering previews.

Spy on `URL.createObjectURL` and `URL.revokeObjectURL`; after replacing the displayed comment data or unmounting the list, assert every created URL was revoked.

- [ ] **Step 8: Run notice-focused tests**

Run: `npm run test -- tests/notice-post-adapter.test.ts tests/common-content-api.test.ts tests/notice-page-local-updates.test.tsx`

Expected: all targeted tests pass, including the existing notice comment mutation and pagination coverage.

- [ ] **Step 9: Commit notice preview support**

```powershell
git add -- "frontend/src/shared/services/commonContentApi.ts" "frontend/src/pages/groupware/community/notice/types/community.types.ts" "frontend/src/pages/groupware/community/notice/data/noticePostAdapter.ts" "frontend/src/pages/groupware/community/notice/hooks/useNoticeComments.ts" "frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx" "frontend/tests/common-content-api.test.ts" "frontend/tests/notice-post-adapter.test.ts" "frontend/tests/use-notice-comments.test.tsx" "frontend/tests/notice-page-local-updates.test.tsx"
git diff --cached --check
git commit -m "feat: load notice comment image previews" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: only the named notice and common-file files are included in the commit.

## Task 4: Reuse Document Comment Blob URLs and Viewer

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add a failing document comment preview interaction test**

Use the existing `DocumentApprovalDetailFeed` fixture/render helper in `document-write-page.test.tsx`. Supply a comment image attachment and mock `fetchApprovalCommentAttachmentBlob` to return an image Blob. Assert the comment file remains visible without an inline `<img>` in its `AttachmentList`, the separate image preview button appears, and clicking it opens the existing `ImageViewerDialog` with the generated object URL and attachment filename as alt text. Also reject one image Blob request and assert its file entry remains visible with a preview error; spy on `URL.createObjectURL` and `URL.revokeObjectURL` and assert generated URLs are revoked on replacement or unmount.

- [ ] **Step 2: Run the focused document test and confirm it fails**

Run: `npm run test -- tests/document-write-page.test.tsx`

Expected: the new test fails because the comment thread does not yet pass the image-open callback.

- [ ] **Step 3: Wire the existing document preview data and viewer**

Continue using the existing effect that loads Blob data for `commentRecords` image attachments and creates object URLs. Add a keyed error map for failed image requests and pass its values into the mapped `FeedCommentAttachment.previewError`. Pass `onOpenAttachmentImage={setSelectedBodyImage}` to `CommentThread`; the existing `ImageViewerDialog` already renders `selectedBodyImage`.

Keep cleanup revocation for every object URL and update it to clear stale errors on comment-record changes. Do not alter the approval comment API, pagination, upload, or deletion flows.

- [ ] **Step 4: Run the document test**

Run: `npm run test -- tests/document-write-page.test.tsx`

Expected: the new comment-image test and existing document writing/comment tests pass.

- [ ] **Step 5: Commit document preview support**

```powershell
git add -- "frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx" "frontend/tests/document-write-page.test.tsx"
git diff --cached --check
git commit -m "feat: open document comment image previews" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: only the named document component and test are included in the commit.

## Task 5: Run Regression, Responsive Browser Checks, and Result Documentation

**Files:**
- Modify: `docs/directions/20261020/20261020_007_comment-attachment-image-preview_작업지시서.md` only if the approved behavior changes during implementation
- Create: `docs/result/20261020/comment-attachment-image-preview/result.md`
- Create: `docs/result/20261020/comment-attachment-image-preview/screenshots/` with 375px, 768px, and 1280px screenshots
- Test: `frontend/tests/feed-components.test.tsx`
- Test: `frontend/tests/common-content-api.test.ts`
- Test: `frontend/tests/notice-post-adapter.test.ts`
- Test: `frontend/tests/use-notice-comments.test.tsx`
- Test: `frontend/tests/notice-page-local-updates.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Run all focused tests together**

Run from `frontend`:

```powershell
npm run test -- tests/feed-components.test.tsx tests/common-content-api.test.ts tests/notice-post-adapter.test.ts tests/use-notice-comments.test.tsx tests/notice-page-local-updates.test.tsx tests/document-write-page.test.tsx
```

Expected: all selected tests pass. If a pre-existing failure appears, record the exact test and baseline evidence; do not change unrelated behavior.

- [ ] **Step 2: Run the production build**

Run from `frontend`: `npm run build`

Expected: TypeScript project build and Vite production build complete successfully.

- [ ] **Step 3: Verify real browser rendering at required widths**

Run the frontend server only on the required port using `npm run dev -- --strictPort`. Confirm `http://127.0.0.1:4173` is available before opening it; reuse an existing S-ERP server only after confirming it is the correct app. Verify at 375px, 768px, and 1280px:

- The attachment list shows image filenames/icons but no inline image thumbnail.
- The separate image-preview area appears below the file list without page-level horizontal overflow.
- Thumbnail click opens the expected large image; closing the dialog returns to the comment.
- The same behavior works for a document comment and a notice comment.

Save screenshots in `docs/result/20261020/comment-attachment-image-preview/screenshots/` using ASCII filenames. If this task starts the dev server, stop only the process started for this check and verify port 4173 is released.

- [ ] **Step 4: Write the result document**

Create `docs/result/20261020/comment-attachment-image-preview/result.md` with:

- Reproduction and root cause (inline thumbnail came from `AttachmentList`; notice mapping did not preserve MIME metadata).
- Files and behavior changed.
- Focused test/build commands and actual results.
- Browser viewport results and screenshot links.
- URL cleanup and preview-failure behavior.
- Confirmation that no API storage contract or DB schema changed.

- [ ] **Step 5: Commit the final result notes and screenshots**

Stage only the result document and the three viewport screenshots, run `git diff --cached --check`, then commit them with:

```powershell
git add -- "docs/result/20261020/comment-attachment-image-preview/result.md" "docs/result/20261020/comment-attachment-image-preview/screenshots/attachments-375.png" "docs/result/20261020/comment-attachment-image-preview/screenshots/attachments-768.png" "docs/result/20261020/comment-attachment-image-preview/screenshots/attachments-1280.png"
git diff --cached --check
git commit -m "docs: record comment attachment image preview validation" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Do not stage or alter unrelated worktree files.

## Self-Review Checklist

- [ ] Each approved design requirement maps to Tasks 1–5.
- [ ] The global `AttachmentList` default remains unchanged; only comment view mode opts out of its inline image.
- [ ] Notice and document use their existing authenticated access boundaries; no raw token or credentials are added to code, tests, or output.
- [ ] Existing comment pages are not fetched just for thumbnails.
- [ ] Every generated object URL is revoked and each failure is visible while the file remains usable.
- [ ] The focused tests and build are run before any completion claim.
- [ ] Screenshots and result notes use the lowercase ASCII result-folder name and contain no user/tenant data.
