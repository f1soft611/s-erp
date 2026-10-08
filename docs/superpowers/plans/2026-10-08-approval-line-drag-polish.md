# Approval-line drag-and-drop visual polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make approval-stage drag-and-drop easier to understand with handle-only drag initiation, clear source/target feedback, insertion-position accuracy, and short motion feedback.

**Architecture:** Keep native HTML5 drag and drop in the approval settings dialog. Track the active source stage and a before/after target position, use these states to render accessible visual feedback, and apply the same insertion position to the existing stage ordering logic. Preserve arrow controls, fixed drafter behavior, agreement-group semantics, and user edits.

**Tech Stack:** React, TypeScript, MUI `sx`, Vitest, React Testing Library, Playwright browser validation.

---

## File map

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx` for the drag handle, drag lifecycle, before/after insertion logic, source/target visuals, and reorder motion.
- Modify `frontend/tests/document-approval-settings-dialog.test.tsx` for drag initiation, insertion direction/order, visual states, and lifecycle cleanup.
- Update `docs/result/20261008/document-approval-line-settings/20261008_001_문서작성_결재선_설정_결과보고서.md` and replace its three screenshots after testing the revised interaction in the original workspace.
- Preserve unrelated existing edits in the dialog, including formatting and footer button order.

## Task 1: Specify drag interaction with failing tests

**Files:**
- Modify: `frontend/tests/document-approval-settings-dialog.test.tsx`

- [x] **Step 1: Add a test that drag starts from the handle only**

Render the existing dialog, locate the handle using its accessible name `드래그하여 결재 2 이동`, and start a drag with a stub `DataTransfer`. Assert that the stage receives the dragging marker/state. Fire `dragStart` on the stage body without the handle and assert it does not initiate a drag.

- [x] **Step 2: Add before/after insertion tests**

Use a `DataTransfer` stub with `effectAllowed`, `setData`, and `getData`. Set the target stage `getBoundingClientRect()` to `{ top: 100, bottom: 160, height: 60 }`. Fire `dragOver` at `clientY: 110` and assert the before marker; fire it at `clientY: 150` and assert the after marker. Drop on each half and assert the resulting `stage.id` order matches the indicator. Include a source stage before and after the target in the fixture as needed to detect index-shift errors.

- [x] **Step 3: Add a test that the drag feedback clears after drag end and drop**

After a handle drag, fire `dragEnd` and assert source and target markers are gone. Start another drag and drop it, then assert no stale source or insertion marker remains.

- [x] **Step 4: Run the new tests and confirm the intended failures**

Run from `frontend`:

```powershell
npx vitest run tests/document-approval-settings-dialog.test.tsx -t "drag|insertion" --testTimeout=15000
```

Expected: tests fail because the current implementation has no handle-only source state, insertion-side state, or source/target data markers.

## Task 2: Implement handle-only drag, exact insertion side, and visual feedback

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`
- Test: `frontend/tests/document-approval-settings-dialog.test.tsx`

- [x] **Step 1: Track source and insertion target**

Add a nullable `draggedStageId` state and an `insertionTarget` state shaped as `{ stageId: number; position: 'before' | 'after' } | null`. Keep a ref for the source stage ID so drop can use the native transferred ID when available and the ref as a fallback.

- [x] **Step 2: Move drag start to a dedicated accessible handle**

Replace the passive `DragIndicatorIcon` with an MUI `IconButton` named `드래그하여 ${stageName} 이동`. Add `draggable={!stage.isFixed}` and attach drag start/end handlers to this handle only. Keep the fixed drafter handle disabled and non-draggable. Do not put `draggable` on the stage card.

- [x] **Step 3: Compute the insertion half on drag over**

In the stage `onDragOver`, prevent default, compare `event.clientY` to the current target card's vertical midpoint, and set `{ stageId, position }`. Set `data-drop-position="before"` or `"after"` on the target for testability and CSS targeting. Clear the target when the pointer leaves the stage/list without ending the active drag.

- [x] **Step 4: Apply the indicated insertion position**

Change `moveStage` to accept the before/after position. Remove the source first, re-find the target in the shortened array, and insert at its index for `before` or index plus one for `after`. Continue rejecting missing IDs, same-stage drops, and fixed-stage source/target drops. Clear source and target state after every completed or cancelled drag.

- [x] **Step 5: Style the active source, insertion edge, and motion**

Use theme palette values for a dragged card outline, subtle shadow, and translucent background/opacity. Draw a visible insertion line at the indicated top or bottom edge without changing card dimensions. Add short transitions to state changes. Use `@media (prefers-reduced-motion: reduce)` to disable nonessential transitions. Keep the existing up/down controls visible and usable.

- [x] **Step 6: Run focused tests and confirm the new behaviors pass**

Run:

```powershell
npx vitest run tests/document-approval-settings-dialog.test.tsx --testTimeout=15000
```

Expected: all settings-dialog tests pass, including source-only handle activation, before/after resulting order, and feedback cleanup.

## Task 3: Document and validate the revised interaction

**Files:**
- Modify: `docs/result/20261008/document-approval-line-settings/20261008_001_문서작성_결재선_설정_결과보고서.md`
- Replace screenshots in: `docs/result/20261008/document-approval-line-settings/screenshots/`

- [x] **Step 1: Run the related test files and build**

From `frontend`, run:

```powershell
npx vitest run tests/document-approval-settings-dialog.test.tsx tests/document-write-page.test.tsx --testTimeout=15000
npm run build
npx oxlint src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx tests/document-approval-settings-dialog.test.tsx
```

Expected: both Vitest files pass, the TypeScript/Vite build succeeds, and Oxlint reports no errors or warnings for the changed files.

- [x] **Step 2: Verify browser drag states at required viewport widths**

At 375px, 768px, and 1280px, use browser-dispatched `DragEvent`/`DataTransfer` events to verify source emphasis, both insertion markers, the corresponding resulting order, available move controls, and no horizontal overflow. Verify reduced-motion styling with the browser preference enabled. The integrated pointer automation did not reach the requested target because its coordinates were intercepted by adjacent cards/overlays, so physical pointer dragging remains to be manually confirmed.

- [x] **Step 3: Replace the dated screenshots**

Capture the settings dialog in each required viewport after the browser checks and overwrite:

- `approval-line-settings-375.png`
- `approval-line-settings-768.png`
- `approval-line-settings-1280.png`

- [x] **Step 4: Update the result report and perform final scope checks**

Document handle-only dragging, source and before/after target visuals, after/drop cleanup, reduced-motion behavior, test/build/lint outcomes, and the refreshed screenshot links in the existing result report. Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; changes limited to the dialog, its focused tests, and the directly related result report/screenshots.
