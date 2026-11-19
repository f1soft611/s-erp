# F1-Grid Row Shortcuts Implementation Plan

> **For agentic workers:** Use inline execution with the test-driven-development skill for this single change.

**Goal:** Keep keyboard row operations in sync with their existing per-action settings.

**Architecture:** Gate row operations in `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` at keyboard dispatch. Leave imperative APIs and non-row editing unchanged.

**Tech Stack:** React, TypeScript, Vitest.

- [ ] In `frontend/tests/f1-grid.test.tsx`, reuse `itemRows` and `itemColumns`; select `ITEM-001` in a grid with each respective `allow*RowInContextMenu` flag set to `false` and the add and duplicate factories supplied. Dispatch `Delete`, `Insert`, or `Ctrl+D` and assert that `getChanges()` has no deleted, inserted, or updated rows. Add a positive deletion case.
- [ ] Run `npx vitest run tests/f1-grid.test.tsx -t "row shortcut"` from `frontend`; expect the blocked cases to fail on current code.
- [ ] In `handleKeyDown`, call `handleAddRow()` only when `allowAddRowInContextMenu`, `handleDuplicateSelectedRows()` only when `allowDuplicateRowInContextMenu`, and `handleDeleteSelectedRows()` only when `allowDeleteRowInContextMenu`. Keep the selected-row branch even when deletion is not allowed, so it cannot fall through to cell clearing.
- [ ] Run `npm run test -- tests/f1-grid.test.tsx tests/f1-grid-image.test.tsx` and lint the changed TypeScript files. Confirm the browser flow on port 4173 with local test data and record the result.
- [ ] Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` and record results under `docs/result/20261118/f1-grid-row-shortcuts`.
