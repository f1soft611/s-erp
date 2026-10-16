# Document Approval Toolbar Visual Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match approval seals, toolbar action controls, status/category badges, and the requested category-to-divider spacing to the supplied visual reference.

**Architecture:** Keep all visual changes local to the shared document approval feed/detail component. Reuse the existing approval-line border-color mapping for seal border/text, preserve the small action-button geometry, set both Chips to 28px high, and add 4px after the kind Chip on top of the Stack's existing 4px spacing.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

---

## Approved design

Follow [the approved visual design](../../superpowers/specs/2026-10-15-document-approval-toolbar-visual-consistency-design.md). In brief:

- Seal border and fallback text use the same status-tone color token as the enclosing approval-line participant border.
- All five toolbar action buttons keep the small-button geometry used by the comment registration button (28px minimum height, 4px vertical and 10px horizontal padding); both status/kind Chips are 28px high. Widths remain content-based.
- The kind-to-divider gap is 8px total (the current 4px Stack spacing plus 4px extra). Divider-to-pin remains 4px.
- Preserve existing labels, colors/variants, border radius, handlers, authorization, order, and wrapping.

## File map

- Create `docs/spec/20261015/20261015_003_document_approval_toolbar_visual_consistency_spec.md`: exact UI rules and regression criteria, written before implementation per project workflow.
- Modify `frontend/tests/document-write-page.test.tsx`: assert seal colors match the active approval-line border, both Chips are 28px high, the kind Chip adds 4px trailing margin, and existing comment-button geometry/toolbar-order behavior remains.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: use the approval-line border token for seal border/text, preserve action-button geometry, apply 28px height to both Chips, and add 4px after the kind Chip.
- Create `docs/result/20261015/document-approval-toolbar-visual-consistency/20261015_003_document_approval_toolbar_visual_consistency_result.md`: record focused verification and browser/screenshot outcome.
- Update `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md` only to add the approved seal-color, aligned-height, and gap refinements.

## Implementation tasks

### Task 1: Write the dated detailed specification

**Files:**
- Create: `docs/spec/20261015/20261015_003_document_approval_toolbar_visual_consistency_spec.md`

- [x] State the seal border/text color matching rule and preserve status-specific dashed/solid style and stamp-image behavior.
- [x] State the button geometry, 28px badge heights, comment-registration padding, natural widths, shared 8px badge radius, and total 8px kind-to-divider gap.
- [x] List tests for the current pending approval seal, toolbar button/chip geometry, kind margin, existing order, and responsive wrapping.

### Task 2: Add failing regression assertions

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] In a focused approval-line test, assert the pending seal at line ID 74 uses `muiTheme.palette.info.main` for both `borderColor` and `color`, matching its participant border.
- [x] In `shows the ordered approval toolbar to a feed approver`, assert both Chips have computed `height: 28px`; retain action-button geometry comparisons to the comment-registration button and equal 8px Chip radii.
- [x] Assert the kind Chip has `marginRight: 4px`; retain the action → status → kind → divider → pin DOM-order assertion.
- [x] Run the related regression assertions before and during implementation; confirm the old seal color, 22px Chip height, and missing kind margin fail their expected assertions:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="matches a pending approval seal to its participant border color|shows the ordered approval toolbar to a feed approver|lets the drafter cancel a pending submission|lets an approver cancel their own approval" --testTimeout=25000
```

### Task 3: Implement the approved presentation

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [x] Change the seal `borderColor` and fallback `color` to `approvalLineStatusBorderColors[statusTone]`; leave `borderStyle`, status mapping, and stamp `src` logic unchanged.
- [x] Retain the theme's small-button geometry and set shared padding to `px: 1.25`, `py: 0.5`; preserve the comment-button geometry and existing action props/handlers.
- [x] Set both status and kind Chip `height` to `28` and preserve their shared `8px` radius, labels, colors, and variants.
- [x] Add 4px of inline trailing margin to the kind Chip. Keep `Stack spacing={0.5}` and the Divider free of extra margins; the resulting kind-to-divider gap is 8px and divider-to-pin remains 4px.
- [x] Rerun the focused tests from Task 2 and confirm they pass.

### Task 4: Validate and document the result

**Files:**
- Modify: `docs/spec/20261014/20261014_008_문서결재취소_상태구분표시통일_상세사양서.md`
- Create: `docs/result/20261015/document-approval-toolbar-visual-consistency/20261015_003_document_approval_toolbar_visual_consistency_result.md`

- [x] Run the focused tests from Task 2 and `npm run build` from `frontend`; record exact outcomes and any existing chunk warning.
- [x] Check for an authenticated document-detail view at 375px, 768px, and 1280px. Record the access limitation and do not claim visual/browser verification where the view cannot be opened.
- [x] Record implementation, test/build/browser results, and screenshot availability in the dated result report; update the 20261014 detailed spec with the new rules.
- [x] Run `git diff --check` and inspect only the task's changed files. Preserve all unrelated worktree changes.
