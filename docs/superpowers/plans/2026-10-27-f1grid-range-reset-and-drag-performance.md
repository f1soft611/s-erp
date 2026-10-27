# F1-Grid Range Reset and Drag Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear stale cell range state when a grid query begins and remove full-row scans from pointer-driven range selection.

**Architecture:** On a transition into any grid loading state, clear cell drag, cell-range, copied-range, and overlay state while preserving row selection and edit data. Reuse the existing `rowIndexById` map in pointer hit resolution and overlay geometry instead of repeatedly scanning `visibleRows`; retain DOM hit testing, virtualization, and geometry behavior.

**Tech Stack:** React 19, TypeScript, MUI, Vitest, Playwright Chromium, Vite.

---

## File map

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: owns loading-state transitions, row ID indexes, pointer hit resolution, range overlay coordinates, and drag refs.
- `frontend/tests/f1-grid.test.tsx`: regression tests for loading reset, row selection preservation, and bounded row-key reads during large-data dragging.
- `frontend/tests/f1-grid-drag-performance.browser.mjs`: real Chromium interaction and viewport screenshots with synthetic rows.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: documents query reset and data-size-independent pointer row lookup behavior.
- `docs/directions/20261027/20261027_019_f1grid-range-reset-and-drag-performance_작업지시서.md`: user request and scope.
- `docs/plan/20261027/20261027_019_f1grid-range-reset-and-drag-performance_계획서.md`: implementation outline.
- `docs/spec/20261027/20261027_019_f1grid-range-reset-and-drag-performance_상세사양서.md`: expected behavior and regression criteria.
- `docs/result/20261027/f1grid-range-reset-and-drag-performance/`: verification results and synthetic-data screenshots.

## Task 1: Prove and fix query range persistence

**Files:**
- Modify: `frontend/tests/f1-grid.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [x] **Step 1: Add a failing loading-transition test.** Render a grid with two rows and an initially checked row checkbox, preserve an inline edit, create a multi-cell range, then rerender with `loading={true}`. Assert the drag overlay is absent, the row remains checked, and `getChanges()` is unchanged.
- [x] **Step 2: Run the focused test and confirm it fails because the range overlay remains.** Run from `frontend`: `npx vitest run tests/f1-grid.test.tsx -t 'clears cell range and drag state when loading starts'`.
- [x] **Step 3: Implement one reset helper and invoke it on the loading rising edge.** Keep a ref of previous combined loading (`loading || queryLoading || dataSourceLoading`). On false-to-true, clear both range state/ref pairs, null `cellRangeDragRef`, set `dragSelectionStateRef` to `{ active: false, previousCell: null }`, set drag state false, and clear `rangeOverlay`. Do not change row selection or editing values.
- [x] **Step 4: Re-run the focused test and existing range/Escape tests.** Run `npx vitest run tests/f1-grid.test.tsx -t 'clears cell range and drag state when loading starts|supports cell-range drag selection|clears on Escape'`; expected: all matching cases pass.

## Task 2: Prove and remove data-size-dependent pointer scans

**Files:**
- Modify: `frontend/tests/f1-grid.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [x] **Step 1: Add a large-data pointer lookup test.** Build 10,000 rows with an `id` getter that increments a counter, render `F1Grid` with `virtualizeRows`, reset the counter after initial render, and dispatch pointer move between mounted cells. Assert post-render row ID reads remain below a small fixed bound (100) rather than scaling with 10,000 rows.
- [x] **Step 2: Run only the performance regression and verify current linear scans exceed the bound.** Run `npx vitest run tests/f1-grid.test.tsx -t 'does not scan all rows during cell range drag'`; expected before implementation: failure due excessive row-key reads.
- [x] **Step 3: Replace each pointer-path row scan with `rowIndexById`.** In `resolvePointerCell`, use `rowIndexById.get(rowIdAttr)`, `rowIndexById.get(rowIdText)`, and `rowIndexById.get(String(previousDragCell.rowId))`; use the mapped index to access `visibleRows[index]`. In `updateRangeOverlay`, use the same map for anchor and focus rows. Keep `getBoundingClientRect`, `elementsFromPoint`, boundary padding, column indexing, and current fallback behavior.
- [x] **Step 4: Re-run the large-data test plus drag and overlay geometry tests.** Expected: the row-key read bound passes and the existing 80-row pointer/scroll boundary and overlay bounds tests pass.

## Task 3: Browser and project verification

**Files:**
- Create: `frontend/tests/f1-grid-drag-performance.browser.mjs`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261027/f1grid-range-reset-and-drag-performance/20261027_019_f1grid-range-reset-and-drag-performance_결과.md`
- Create: `docs/result/20261027/f1grid-range-reset-and-drag-performance/screenshots/`

- [x] **Step 1: Add a Playwright regression with synthetic 10,000-row data.** Mount `F1Grid` via the existing Vite dev-module test pattern on `http://127.0.0.1:4173`, drag between visible rows, assert the range endpoint updates and pointer drag finishes, and capture screenshots at 375px, 768px, and 1280px.
- [x] **Step 2: Reuse the existing 4173 server only after confirming its process is this repository's Vite server.** Do not terminate an existing shared server.
- [x] **Step 3: Update `F1-GRID.md`.** State that entering loading/query state clears cell range/copy/drag selection but preserves row selection, and pointer-to-row lookup uses the prebuilt visible-row index.
- [x] **Step 4: Run verification.** Run focused Vitest selection/drag tests, `node --test tests/f1-grid-drag-performance.browser.mjs`, `npm run build`, targeted `npx oxlint` for modified TypeScript/browser test files, and `git diff --check`.
- [x] **Step 5: Record results.** Document reproducible behavior, root causes, test outcomes, existing unrelated failures if any, browser environment, and relative screenshot links in the result document.
- [x] **Step 6: Review scope.** Preserve unrelated edits and report only files belonging to this task.
