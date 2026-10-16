# Document Approval Toolbar Equal Separator Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the visible gaps between document kind and divider, and between divider and pin, both 8px.

**Architecture:** Keep the adjustment in the shared `DocumentApprovalDetailFeed` toolbar. Preserve its 4px Stack spacing and existing 4px kind-Chip trailing margin; add a 4px leading margin to the pin button. Cover the gap contributions and existing toolbar order in the current document-write test.

**Tech Stack:** React, TypeScript, MUI, Vitest.

---

## Approved design

Follow [the approved equal-spacing design](../../superpowers/specs/2026-10-15-document-approval-toolbar-equal-separator-spacing-design.md). Both visible gaps are 8px: base Stack spacing (4px) plus a 4px local margin on the adjacent control. Keep the current toolbar order, control geometry, actions, and responsive wrapping.

## File map

- Modify `frontend/tests/document-write-page.test.tsx`: assert the kind Chip's `marginRight` and pin IconButton's `marginLeft` are each 4px in the existing ordered-toolbar test; retain assertions for the kind → divider → pin order.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: add a 4px leading margin to the pin IconButton only.
- Modify `docs/spec/20261015/20261015_003_document_approval_toolbar_visual_consistency_spec.md`: state that both divider-adjacent visible gaps total 8px.
- Modify `docs/result/20261015/document-approval-toolbar-visual-consistency/20261015_003_document_approval_toolbar_visual_consistency_result.md`: append the follow-up change and verification.
- Create `docs/result/20261015/document-approval-toolbar-equal-separator-spacing/20261015_004_document_approval_toolbar_equal_separator_spacing_result.md`: record targeted test/build/diff checks and browser availability.

## Task 1: Add and verify the failing spacing assertion

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] In `shows the ordered approval toolbar to a feed approver`, assert that the pin control's computed `marginLeft` is `4px`, alongside the existing `kindChip` `marginRight` assertion.
- [ ] Run the test before changing production code:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="shows the ordered approval toolbar to a feed approver" --testTimeout=25000
```

Expected: FAIL because the pin IconButton has no additional leading margin; the existing kind-to-divider margin assertion remains passing.

## Task 2: Implement equal gaps

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] Add `style={{ marginLeft: 4 }}` to the pin IconButton next to the Divider. Do not change `Stack spacing={0.5}`, the kind Chip's trailing margin, element order, action handlers, or responsive styling.
- [ ] Rerun the focused Vitest command from Task 1.

Expected: PASS, including kind-to-divider and divider-to-pin local 4px contributions and existing element order.

## Task 3: Update specification and record verification

**Files:**
- Modify: `docs/spec/20261015/20261015_003_document_approval_toolbar_visual_consistency_spec.md`
- Modify: `docs/result/20261015/document-approval-toolbar-visual-consistency/20261015_003_document_approval_toolbar_visual_consistency_result.md`
- Create: `docs/result/20261015/document-approval-toolbar-equal-separator-spacing/20261015_004_document_approval_toolbar_equal_separator_spacing_result.md`

- [ ] Update the dated detailed spec to replace the old 4px divider-to-pin rule with equal 8px gaps on both sides of the divider.
- [ ] Record the implementation and focused test output in the prior toolbar result and the new follow-up result.
- [ ] Run `npm run build` from `frontend`, `git diff --check`, and Problems validation for the modified TSX/test files.
- [ ] Record that visual browser confirmation was unavailable if the authenticated document view remains inaccessible; do not claim an unperformed responsive visual check.

