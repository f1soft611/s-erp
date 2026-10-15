# Document Approval Toolbar Button Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all document-approval action buttons the same height and padding, while making the document-kind-to-divider gap match the divider-to-pin gap.

**Architecture:** Keep the existing shared feed/detail toolbar and preserve content-based button widths, colors, labels, and wrapping. Match all approval and cancellation actions to the comment-registration button's `size="small"` geometry; reuse one border-radius value for the status and kind Chips; remove the Divider's additional horizontal margin so the Stack's existing 4px spacing is uniform around it.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

---

## Approved design

Follow [the approved toolbar sizing specification](../specs/2026-10-15-document-approval-toolbar-button-sizing-design.md). Action buttons use the same small-button geometry as comment registration; widths remain content-based. The status and kind Chips use the same 8px radius. Do not change action behavior, toolbar order, colors, or icon sizes. Keep this focused frontend-only change separate from unrelated existing worktree changes.

## File map

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: define a shared comment-registration-sized action-button style, apply one border-radius rule to the status and kind Chips, and remove the Divider's `mx` override.
- Modify `frontend/tests/document-write-page.test.tsx`: compare approval button geometry with the comment-registration button and verify equal badge radii and the existing Stack-only divider margins while retaining toolbar-order assertions.
- Modify `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`: record the exact shared action-button sizing and equal toolbar gaps.
- Modify `docs/result/20261014/document-approval-cancel-status-consistency/20261014_008_문서결재취소_상태구분표시통일_결과보고서.md`: record the focused regression/build/browser validation outcome.

## Implementation tasks

### Task 1: Add regression assertions for button dimensions and divider spacing

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Extend the feed approver toolbar test**

In `shows the ordered approval toolbar to a feed approver`, collect the three action buttons and the comment-registration button. Assert their computed geometry matches. In the same test, assert the status and kind radii match, the divider no longer has an added right margin, and preserve the current action → status → kind → divider → pin order checks.

Use:

```tsx
const actionButtons = [approve, reject, returnForRevision];
expect(actionButtons.map(getButtonGeometry)).toEqual([
  getButtonGeometry(commentSubmitButton),
  getButtonGeometry(commentSubmitButton),
  getButtonGeometry(commentSubmitButton),
]);
expect(getComputedStyle(statusChip).borderRadius).toBe(
  getComputedStyle(kindChip).borderRadius,
);
expect(getComputedStyle(divider).marginRight).toBe('0px');
```

- [x] **Step 2: Extend detail cancellation button tests**

In both existing tests that render `상신 취소` and `승인 취소`, assert the relevant button has the same computed geometry as the comment-registration button; retain the existing color-class assertions.

- [x] **Step 3: Run the new focused assertions and confirm failure**

Run:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="shows the ordered approval toolbar to a feed approver|lets the drafter cancel a pending submission|lets an approver cancel their own approval"
```

Expected: FAIL because action buttons still differ from the comment-registration button and the Divider still has extra horizontal margins.

### Task 2: Apply the approved shared toolbar geometry

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [x] **Step 1: Define the single action-button style**

Before `documentToolbar`, add:

```tsx
const approvalActionButtonSx = {
  px: 1.25,
  py: 0.5,
};
```

- [x] **Step 2: Apply the style to all five action buttons**

Add `sx={approvalActionButtonSx}` to the buttons labelled `승인`, `반려`, `보완요청`, `상신 취소`, and `승인 취소`. Do not change their `size`, variants, colors, labels, handlers, or conditional visibility.

- [x] **Step 3: Remove only the Divider's extra horizontal margins**

Change:

```tsx
<Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
```

to:

```tsx
<Divider orientation="vertical" flexItem />
```

Retain `Stack spacing={0.5}` so the adjacent kind Chip and pin icon each receive the same 4px gap from the divider.

- [x] **Step 4: Run focused regressions**

Run:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="shows the ordered approval toolbar to a feed approver|lets the drafter cancel a pending submission|lets an approver cancel their own approval"
```

Expected: PASS, including the existing toolbar order and cancellation button color assertions.

### Task 3: Update requirements and verify

**Files:**
- Modify: `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`
- Modify: `docs/result/20261014/document-approval-cancel-status-consistency/20261014_008_문서결재취소_상태구분표시통일_결과보고서.md`

- [x] **Step 1: Document the exact approved visual rule**

In the detailed specification's approved toolbar rules, state that approval action and cancellation buttons use the same small-button geometry as the comment-registration button. State that the status and kind badges share an 8px radius and that both gaps beside the vertical divider match the existing 4px toolbar spacing.

- [x] **Step 2: Run nearby tests and the production build**

Run:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="shows the ordered approval toolbar to a feed approver|places detail approval actions before the status|lets the drafter cancel a pending submission|lets an approver cancel their own approval"
npm run build
```

Expected: targeted tests pass and TypeScript/Vite build succeeds. A pre-existing large-chunk warning is not a build failure.

- [x] **Step 3: Verify rendered toolbar geometry**

At 375px, 768px, and 1280px, inspect the feed and detail toolbar where the authenticated page is available. Confirm all action buttons match the comment-registration button geometry; the status and kind radii match; the Chip-to-divider and divider-to-pin gaps are both 4px; content-based widths and existing wrapping remain; there is no horizontal overflow. If authentication or a visible browser session is unavailable, report the limitation instead of claiming a visual check.

- [x] **Step 4: Record results and check whitespace**

Add the focused test, build, and browser verification outcome to the result report. Run:

```powershell
git diff --check
```

Expected: no whitespace errors.
