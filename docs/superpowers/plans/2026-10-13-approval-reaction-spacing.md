# Approval Reaction Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the electronic approval detail attachment/reaction/comments section use the same internal vertical spacing as the notice detail feed.

**Architecture:** Keep the approval detail's outer Stack and all unrelated section spacing unchanged. Group only the attachment list, its existing divider, reaction bar, and comments section inside one Box so the outer Stack cannot add spacing between those children; match the notice divider margins within that group.

**Tech Stack:** React, TypeScript, MUI Stack/Box/Divider, Vitest, Testing Library.

---

### Task 1: Align approval reaction section spacing

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`
- Modify: `docs/directions/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_작업지시서.md`
- Modify: `docs/plan/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_계획서.md`
- Modify: `docs/spec/20261013/20261013_001_공지사항_전자결재_피드_UI_공통화_상세사양서.md`
- Modify: `docs/superpowers/specs/2026-10-13-approval-reaction-spacing-design.md`
- Modify: `docs/result/20261013/approval-feed-regression/20261013_003_공지사항_전자결재_피드_로딩_구분선_정합화_결과.md`

- [x] **Step 1: Add a regression assertion for the approval footer group**

In the existing `renders read-only system events and keeps only the required detail separators` test, assert that the document attachment, attachment divider, reaction bar, and comments section share a footer wrapper, and that the reaction and comments children have no Stack-injected top margin:

```tsx
const footer = screen.getByTestId('approval-feed-footer');
const reactionBar = screen.getByTestId('feed-reaction-bar');
const commentsSection = screen.getByTestId('feed-comments-section');
expect(reactionBar.parentElement).toBe(footer);
expect(commentsSection.parentElement).toBe(footer);
expect(getComputedStyle(reactionBar).marginTop).toBe('0px');
expect(getComputedStyle(commentsSection).marginTop).toBe('0px');
```

- [x] **Step 2: Run the focused test and verify the regression**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "required detail separators"
```

Expected before the layout change: FAIL because no `approval-feed-footer` exists (the selected test's existing system-event/detail fixtures should otherwise render).

- [x] **Step 3: Group the existing approval footer elements**

In `DocumentApprovalDetailFeed.tsx`, wrap the current consecutive attachment `Box`, attachment/reaction `Divider`, `FeedReactionBar`, and `FeedCommentsSection` siblings in a single `<Box data-testid="approval-feed-footer">`. Move those four existing elements into the wrapper without changing their order or props. Set the existing attachment/reaction divider to `sx={{ my: 1.5 }}` to match `NoticeFeedList`. Keep the current divider policy and do not add a divider between the reaction bar and comments section. Do not change the outer detail `Stack` or other detail sections.

- [x] **Step 4: Re-run the focused regression**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "required detail separators"
```

Expected: PASS, including the zero-margin assertions and preserved separator count.

- [x] **Step 5: Verify related regressions and production build**

Run:

```powershell
npx vitest run tests/notice-page.test.tsx tests/document-write-page.test.tsx -t "required detail separators|attachment and comment features|previous-comments separators"
npm run build
```

Result: selected notice/document regressions passed and the TypeScript/Vite production build exited successfully. The focused footer-spacing regression also passed.

- [x] **Step 6: Update related requirements and result documentation**

Recorded that the approval attachment/reaction/comments group has no extra outer Stack spacing, while the notice-compatible attachment separator margin is preserved. Added responsive browser measurements and spacing screenshots to the result report; prior full-suite baseline failures remain distinguished from this targeted verification.

**Note:** Do not create a commit as part of this task. The worktree already contains unrelated in-progress changes from the broader feed UI task; preserve them for the user.
