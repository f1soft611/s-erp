# Document Approval Toolbar Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a document-approval-specific toolbar component and render the approved action/status/divider/pin/menu/document-kind order consistently in feed and detail.

**Architecture:** Keep document permission checks, action handlers, and more-menu construction in `DocumentApprovalDetailFeed`. Move only the toolbar layout into a feature-scoped `DocumentApprovalToolbar` that receives React nodes as slots, preserving the single existing feed/detail integration path and avoiding a groupware-wide framework.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library.

---

## Approved detailed specification

Follow [the dated toolbar specification](../../spec/20261015/20261015_006_document_approval_toolbar_reordering_spec.md) and [the approved design](../../superpowers/specs/2026-10-15-document-approval-toolbar-reorder-notice-category-colors-design.md). The DOM order is approval actions, status, divider, pin, more menu, document-kind chip. Use a 4px horizontal `columnGap`; add 4px trailing margin to the status and 4px leading margin to the pin so both divider-adjacent gaps total 8px. Keep existing controls, authorization, labels, actions, and responsive wrapping.

## File map

- Create `frontend/src/pages/groupware/documents/write/components/DocumentApprovalToolbar.tsx`: feature-specific toolbar layout with required status and pin slots and optional actions/menu slots.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: continue constructing controls and permissions; pass them to the toolbar component in the approved order.
- Create `frontend/tests/document-approval-toolbar.test.tsx`: directly verify toolbar slot order, divider placement, and gaps with controlled slot elements.
- Modify `frontend/tests/document-write-page.test.tsx`: keep integration coverage for feed approval actions, badge appearance, and authorization behavior while updating the expected DOM order.
- Create `docs/spec/20261015/20261015_006_document_approval_toolbar_reordering_spec.md`: record the UI and validation contract.
- Create `docs/result/20261015/document-approval-toolbar-reordering/20261015_006_document_approval_toolbar_reordering_result.md`: record implementation, verification, and browser availability.
- Add responsive screenshots under `docs/result/20261015/document-approval-toolbar-reordering/screenshots/` only when the authenticated view is available.

## Task 1: Add failing toolbar layout tests

**Files:**
- Create: `frontend/tests/document-approval-toolbar.test.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] Add a component test that renders distinct labeled action, status, pin, menu, and document-kind slots. Assert DOM order is action → status → separator → pin → menu → document-kind; assert the separator remains between status and pin when actions and menu are null.
- [ ] Assert 4px base Stack spacing and 4px local contributions on the status and pin sides of the divider (8px total for both adjacent gaps).
- [ ] Update `shows the ordered approval toolbar to a feed approver` to assert the visible order is approval actions → status → divider → pin → document-kind when no more menu is eligible. Remove the old assertion that document-kind is adjacent to the divider; retain button geometry, colors, chip height, border radius, and permission assertions.
- [ ] Run the focused tests before production changes:

```powershell
Set-Location frontend
npx vitest run tests/document-approval-toolbar.test.tsx tests/document-write-page.test.tsx --testNamePattern="toolbar|ordered approval toolbar"
```

Expected: FAIL because `DocumentApprovalToolbar` does not exist yet and the integration test still observes the old DOM order.

## Task 2: Extract the feature-scoped toolbar layout

**Files:**
- Create: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalToolbar.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] Create `DocumentApprovalToolbar` with `ReactNode` slots named `approvalActions`, `status`, `pinControl`, `moreMenu`, and `documentKind`. Make `status` and `pinControl` required; allow actions and menu to be null.
- [ ] Render a wrapping row `Stack` with the existing toolbar `data-testid`, alignment, width, `spacing={0}`, and `columnGap: 0.5`. Render slots in the approved DOM order and keep the vertical `Divider` between status and pin.
- [ ] Apply the extra 4px status trailing and pin leading spacing without changing action button or chip dimensions.
- [ ] Replace the inline toolbar `Stack` in `DocumentApprovalDetailFeed` with `DocumentApprovalToolbar`; leave all conditions, handlers, chips, and menu creation in the parent.
- [ ] Run the focused tests from Task 1 and confirm the new component test and existing feed integration test pass.

Expected: PASS; feed/detail share one toolbar layout, the DOM order matches the approved sequence, optional action/menu slots do not remove the status-to-pin divider, and existing action behavior remains unchanged.

## Task 3: Complete focused verification and document the result

**Files:**
- Verify: `frontend/tests/document-approval-toolbar.test.tsx`
- Verify: `frontend/tests/document-write-page.test.tsx`
- Create/update: the dated spec and result paths in the file map.

- [ ] Run the two focused test files without a name filter:

```powershell
Set-Location frontend
npx vitest run tests/document-approval-toolbar.test.tsx tests/document-write-page.test.tsx
```

- [ ] Run `npm run build` from `frontend`.
- [ ] Run Problems validation for both changed TSX files and both test files; run `git diff --check`.
- [ ] Attempt browser confirmation at 375px, 768px, and 1280px using the authenticated document view. Save screenshots under the result folder when available; if authentication prevents opening the view, record that limitation without claiming a visual check.
- [ ] Record the exact test/build results and whether screenshots were captured in the result document.
