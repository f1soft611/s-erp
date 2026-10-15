# Document Approval Toolbar Button Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all document-approval action buttons the same height and padding, while making the document-kind-to-divider gap match the divider-to-pin gap.

**Architecture:** Keep the existing shared feed/detail toolbar and preserve content-based button widths, colors, labels, and wrapping. Define one shared `sx` style for all approval and cancellation actions; remove the Divider's additional horizontal margin so the Stack's existing 4px spacing is uniform around it.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

---

## Approved design

Follow [the approved toolbar sizing specification](../specs/2026-10-15-document-approval-toolbar-button-sizing-design.md). Buttons use a shared 30px height and identical padding; width remains content-based. Do not change action behavior, toolbar order, colors, Chips, or icon sizes. Keep this focused frontend-only change separate from unrelated existing worktree changes.

## File map

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: define a shared 30px action-button style, apply it to approve/reject/revision-request/submission-cancel/approval-cancel buttons, and remove the Divider's `mx` override.
- Modify `frontend/tests/document-write-page.test.tsx`: verify shared button geometry and the existing Stack-only divider margins while retaining toolbar-order assertions.
- Modify `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`: record the exact shared action-button sizing and equal toolbar gaps.
- Modify `docs/result/20261014/document-approval-cancel-status-consistency/20261014_008_문서결재취소_상태구분표시통일_결과보고서.md`: record the focused regression/build/browser validation outcome.

## Implementation tasks

### Task 1: Add regression assertions for button dimensions and divider spacing

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Extend the feed approver toolbar test**

In `shows the ordered approval toolbar to a feed approver`, collect the three action buttons and assert they have equal rendered height, height `30px`, and equal vertical/horizontal padding. In the same test, assert the divider no longer has an added right margin and preserve the current action → status → kind → divider → pin order checks.

Use:

```tsx
const actionButtons = [approve, reject, returnForRevision];
const actionButtonStyles = actionButtons.map((button) => getComputedStyle(button));
expect(actionButtonStyles.map((style) => style.height)).toEqual([
  '30px',
  '30px',
  '30px',
]);
expect(
  actionButtonStyles.map((style) => [
    style.paddingTop,
    style.paddingBottom,
    style.paddingLeft,
    style.paddingRight,
  ]),
).toEqual([
  ['0px', '0px', '10px', '10px'],
  ['0px', '0px', '10px', '10px'],
  ['0px', '0px', '10px', '10px'],
]);
expect(getComputedStyle(divider).marginRight).toBe('0px');
```

- [ ] **Step 2: Extend detail cancellation button tests**

In both existing tests that render `상신 취소` and `승인 취소`, assert the relevant button has the same computed `height`, `paddingTop`, `paddingBottom`, `paddingLeft`, and `paddingRight` as an action button in the shared toolbar; retain the existing color-class assertions.

- [ ] **Step 3: Run the new focused assertions and confirm failure**

Run:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="shows the ordered approval toolbar to a feed approver|lets the drafter cancel a pending submission|lets an approver cancel their own approval"
```

Expected: FAIL because the buttons do not yet have an explicit shared height/padding and the Divider still has extra horizontal margins.

### Task 2: Apply the approved shared toolbar geometry

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] **Step 1: Define the single action-button style**

Before `documentToolbar`, add:

```tsx
const approvalActionButtonSx = {
  height: 30,
  px: 1.25,
  py: 0,
};
```

- [ ] **Step 2: Apply the style to all five action buttons**

Add `sx={approvalActionButtonSx}` to the buttons labelled `승인`, `반려`, `보완요청`, `상신 취소`, and `승인 취소`. Do not change their `size`, variants, colors, labels, handlers, or conditional visibility.

- [ ] **Step 3: Remove only the Divider's extra horizontal margins**

Change:

```tsx
<Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
```

to:

```tsx
<Divider orientation="vertical" flexItem />
```

Retain `Stack spacing={0.5}` so the adjacent kind Chip and pin icon each receive the same 4px gap from the divider.

- [ ] **Step 4: Run focused regressions**

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

- [ ] **Step 1: Document the exact approved visual rule**

In the detailed specification's approved toolbar rules, state that approval action and cancellation buttons are 30px high with the same 10px horizontal and 0px vertical padding; widths remain label/content-based. State that both gaps beside the vertical divider match the existing 4px toolbar spacing.

- [ ] **Step 2: Run nearby tests and the production build**

Run:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="shows the ordered approval toolbar to a feed approver|places detail approval actions before the status|lets the drafter cancel a pending submission|lets an approver cancel their own approval"
npm run build
```

Expected: targeted tests pass and TypeScript/Vite build succeeds. A pre-existing large-chunk warning is not a build failure.

- [ ] **Step 3: Verify rendered toolbar geometry**

At 375px, 768px, and 1280px, inspect the feed and detail toolbar where the authenticated page is available. Confirm all action buttons share 30px height and padding; the Chip-to-divider and divider-to-pin gaps are both 4px; content-based widths and existing wrapping remain; there is no horizontal overflow. If authentication or a visible browser session is unavailable, report the limitation instead of claiming a visual check.

- [ ] **Step 4: Record results and check whitespace**

Add the focused test, build, and browser verification outcome to the result report. Run:

```powershell
git diff --check
```

Expected: no whitespace errors.
