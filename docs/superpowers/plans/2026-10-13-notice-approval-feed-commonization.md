# Notice and Approval Feed Commonization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the notice feed's left-card and right-detail presentation for electronic approvals, with approval-only metadata and a read-only approval line composed above shared detail sections.

**Architecture:** Keep `FeedView`, `PostDetailPanel`, `AttachmentList`, and `CommentThread` as shared foundations. Add small presentational feed-card, reaction, and comment-section components; adapt both notice and approval consumers to them while retaining feature-owned services, permissions, cursor state, and mutations.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite, Playwright/browser validation.

---

## Scope and authoritative documents

- Work direction: `docs/directions/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_작업지시서.md`
- Detailed specification: `docs/spec/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_상세사양서.md`
- Approved design: `docs/superpowers/specs/2026-10-13-notice-approval-feed-commonization-design.md`
- No backend, API, database, or reaction persistence changes.

## File map

- Create `frontend/src/shared/components/feed/FeedCard.tsx` for shared card structure and slots.
- Create `frontend/src/shared/components/feed/FeedReactionBar.tsx` for the standard reaction/count row.
- Create `frontend/src/shared/components/feed/FeedCommentsSection.tsx` for previous-comments control and common thread placement.
- Extend `frontend/src/shared/components/feed/TiptapCommentThread.tsx` with the SYSTEM badge while retaining immutability.
- Use `frontend/src/shared/components/feed/PostDetailPanel.tsx` as the common detail shell; keep its existing notice and approval consumers compatible.
- Adapt `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx` and `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx` to shared presentation without moving notice state/services.
- Adapt `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`, `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`, and `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`.
- Extend `frontend/tests/feed-components.test.tsx`, `frontend/tests/notice-page.test.tsx`, `frontend/tests/document-feed-item.test.tsx`, and `frontend/tests/document-write-page.test.tsx`.
- Add report and screenshots under `docs/result/20261013/notice-approval-feed-commonization/`.

### Task 1: Add a composable shared feed card

**Files:**
- Create: `frontend/src/shared/components/feed/FeedCard.tsx`
- Test: `frontend/tests/feed-components.test.tsx`

- [ ] **Step 1: Write the failing card composition test**

Test that supplied author, metadata, title, summary, badge/action slots, and children render; when configured as clickable, the card invokes only its supplied click callback.

- [ ] **Step 2: Run the focused test and confirm the expected missing-component failure**

Run from `frontend`: `npm run test -- tests/feed-components.test.tsx`

- [ ] **Step 3: Implement the smallest presentational card API**

Use typed React nodes for optional slots and props for author/meta/title/summary/clickability. Keep domain models and callbacks out of shared code.

- [ ] **Step 4: Re-run `feed-components.test.tsx`**

Expected: the new card tests pass and existing shared feed component tests remain green.

### Task 2: Adapt electronic-approval feed cards

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Test: `frontend/tests/document-feed-item.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add assertions for shared-card semantics**

Assert the existing document author/date, kind/status chips, title/summary, and opening callback remain visible/working through the shared card.

- [ ] **Step 2: Run the targeted document tests and confirm the new assertions expose the current duplicated card**

Run from `frontend`: `npm run test -- tests/document-feed-item.test.tsx tests/document-write-page.test.tsx`

- [ ] **Step 3: Compose `DocumentFeedItem` from `FeedCard`**

Pass existing values and callback through slots/props; do not alter `DocumentWritePage` data flow or status mapping.

- [ ] **Step 4: Run the targeted document tests**

Expected: both files pass with no change to document detail selection behavior.

### Task 3: Adapt notice feed cards without moving notice behavior

**Files:**
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Modify: `frontend/tests/notice-page.test.tsx`
- Test: `frontend/tests/feed-components.test.tsx`

- [ ] **Step 1: Add regression assertions for notice card content and interactions**

Cover author/meta/title/body, pin action, expanded content, attachment, reaction, and comment control rendering using existing test setup.

- [ ] **Step 2: Run the focused notice test**

Run from `frontend`: `npm run test -- tests/notice-page.test.tsx`

- [ ] **Step 3: Replace only the outer notice card chrome with `FeedCard`**

Leave image hydration, expanded-body state, attachment download, pin, local reaction/comment state, cursor state, and error handling in `NoticeFeedList`.

- [ ] **Step 4: Run notice and card tests**

Run from `frontend`: `npm run test -- tests/notice-page.test.tsx tests/feed-components.test.tsx`

### Task 4: Extract common reaction and comments sections

**Files:**
- Create: `frontend/src/shared/components/feed/FeedReactionBar.tsx`
- Create: `frontend/src/shared/components/feed/FeedCommentsSection.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/feed-components.test.tsx`

- [ ] **Step 1: Write failing shared-section tests**

Verify reaction labels/count, callback forwarding, comment count, optional previous-comments button, loading/disabled state, and children placement.

- [ ] **Step 2: Run `feed-components.test.tsx` and confirm the new section exports are missing**

- [ ] **Step 3: Implement the two controlled presentational sections**

Props carry current state and callbacks. Do not fetch comments, merge trees, decide authorization, or persist reactions in shared components.

- [ ] **Step 4: Recompose notice detail sections**

Replace duplicated reactions row and previous-comments presentation in `NoticeFeedList`; keep its comment cursor/merge/error logic and `CommentThread` callbacks.

- [ ] **Step 5: Recompose approval detail sections**

Use the same section components for approval's attachment/reaction/count/previous-comments/thread area. Keep approval services and mutations in `DocumentApprovalDetailFeed`.

- [ ] **Step 6: Run shared, notice, and approval tests**

Run from `frontend`: `npm run test -- tests/feed-components.test.tsx tests/notice-page.test.tsx tests/document-write-page.test.tsx`

### Task 5: Add the read-only approval-line section and SYSTEM badge

**Files:**
- Modify: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/feed-components.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add failing SYSTEM-row assertions**

Verify a SYSTEM row shows a `시스템` badge and does not expose reply/edit/delete controls; verify a normal USER row has no SYSTEM badge.

- [ ] **Step 2: Run the focused feed test and confirm the missing badge assertion fails**

- [ ] **Step 3: Render the badge for `isSystemEvent` only**

Keep the existing SYSTEM immutability branches and all USER comment actions unchanged.

- [ ] **Step 4: Add failing approval-line layout assertions**

Verify drafter metadata precedes read-only approval/agreement/reference groups and only supplied participant rows render; assert no approval mutation controls appear within those groups.

- [ ] **Step 5: Render the line groups in approval detail**

Map the existing `approvalLines` data without changing its type/API. Group by participant type and order, display only real participants, and retain existing status/comment labels.

- [ ] **Step 6: Run the targeted frontend tests**

Run from `frontend`: `npm run test -- tests/feed-components.test.tsx tests/document-write-page.test.tsx`

### Task 6: Verify notice and approval share the common detail shell

**Files:**
- Modify if required: `frontend/src/shared/components/feed/PostDetailPanel.tsx`
- Modify if required: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- Modify if required: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/feed-components.test.tsx`
- Test: `frontend/tests/notice-page.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Assert both consumers use the same shell contract**

Tests verify title/subtitle, close behavior, scroll content, and optional feature-specific content composition.

- [ ] **Step 2: Preserve the existing `PostDetailPanel` API unless tests require a strictly additive shared slot**

Both notice and approval already render it; do not rename or duplicate the shell unnecessarily.

- [ ] **Step 3: Run the focused panel and consumer tests**

Run from `frontend`: `npm run test -- tests/feed-components.test.tsx tests/notice-page.test.tsx tests/document-write-page.test.tsx`

### Task 7: Full focused verification and result artifacts

**Files:**
- Create: `docs/result/20261013/notice-approval-feed-commonization/20261013_001_공지사항_전자결재_피드_UI_공통화_결과보고서.md`
- Create: `docs/result/20261013/notice-approval-feed-commonization/screenshots/notice-approval-feed-{375,768,1280}.png`

- [ ] **Step 1: Run the combined focused frontend test suite**

Run from `frontend`: `npm run test -- tests/feed-components.test.tsx tests/notice-page.test.tsx tests/document-feed-item.test.tsx tests/document-write-page.test.tsx`

- [ ] **Step 2: Run the production build**

Run from `frontend`: `npm run build`

- [ ] **Step 3: Check Vite port 4173 and run browser validation**

Reuse the S-ERP server only after confirming it is the expected app. Check notice and approval feed/detail views at 375px, 768px, and 1280px for consistent cards, shared detail sections, read-only approval line, SYSTEM badge, working comments, and no horizontal overflow. Save screenshots at the paths above. Stop only a server started for this validation.

- [ ] **Step 4: Write the result report from actual outputs**

Record exact test/build results, viewports, screenshots, and any browser/API constraints. Do not claim backend or persistence validation because no backend/DB changes are in scope.

- [ ] **Step 5: Run final whitespace validation**

Run from repository root: `git diff --check`

Expected: exit code `0` and no whitespace diagnostics.
