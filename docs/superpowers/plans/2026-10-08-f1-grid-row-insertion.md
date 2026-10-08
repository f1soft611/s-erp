# F1-Grid Row Insertion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit context-menu actions to insert a row directly above or below a target row in a regular F1Grid, without changing append or F1Tree behavior.

**Architecture:** Add a row-state helper that inserts at an index and rebuilds the row ID/index maps while preserving inserted-row change tracking. Wire target-relative actions into the regular F1Grid context menu, reject them while sort/filter state is active, preserve the target through row-form creation, and scroll/focus the inserted row after it is committed.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File Map

- Create `docs/directions/20261008/20261008_004_F1GRID_행삽입_작업지시서.md` for the approved task scope and acceptance criteria.
- Create `docs/plan/20261008/20261008_004_F1GRID_행삽입_계획서.md` and `docs/spec/20261008/20261008_004_F1GRID_행삽입_사양서.md` to satisfy the project's dated planning/specification workflow.
- Modify `frontend/src/shared/components/f1-grid/state/GridState.ts` to insert at a specified data index and rebuild state indexes.
- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` to expose target-relative context actions, enforce the sort/filter guard, handle row-form creation, and scroll/focus the committed row.
- Test `frontend/tests/f1-grid-row-insertion.test.ts` for the row-state insertion helper.
- Test `frontend/tests/f1-grid-context-menu.test.tsx` for target selection, relative insertion actions, sort/filter guard, append compatibility, and F1Tree isolation.
- Test `frontend/tests/f1-grid-form-modal.test.tsx` for delayed relative insertion after a create form is applied.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` to document menu visibility, insertion order, scroll/focus, sort/filter constraints, and unchanged append/tree behavior.
- Create `docs/result/20261008/f1-grid-row-insertion/` with a result report and browser screenshots at the project's required viewport widths.

## Task 1: Record the Dated Work Direction, Plan, and Specification

**Files:**
- Create: `docs/directions/20261008/20261008_004_F1GRID_행삽입_작업지시서.md`
- Create: `docs/plan/20261008/20261008_004_F1GRID_행삽입_계획서.md`
- Create: `docs/spec/20261008/20261008_004_F1GRID_행삽입_사양서.md`

- [ ] **Step 1: Write the work direction**

Record the approved outcome: regular F1Grid row context menus gain `위에 행 삽입` and `아래에 행 삽입`; existing append stays unchanged; insert actions are disabled with explanatory text while any sort/filter is active; F1Tree hierarchy behavior stays unchanged. Include acceptance criteria for insertion order, change tracking, row-form creation, scrolling/focus, sort/filter guarding, append compatibility, and tree compatibility.

- [ ] **Step 2: Write the dated implementation plan**

Record the file map and ordered test-first implementation tasks from this plan in the required `docs/plan/20261008` directory. Keep filenames and links consistent with the dated direction and specification.

- [ ] **Step 3: Write the detailed specification**

Define menu eligibility, click-target anchoring, before/after data ordering, inserted-row state, disabled sort/filter behavior, row-form apply semantics, focus/scroll behavior for virtualized grids, and explicit non-goals. Link to the direction and dated plan using relative paths.

## Task 2: Test and Implement Indexed Row-State Insertion

**Files:**
- Create: `frontend/tests/f1-grid-row-insertion.test.ts`
- Modify: `frontend/src/shared/components/f1-grid/state/GridState.ts`

- [ ] **Step 1: Add failing tests for insertion around a target row**

Import `createGridData`, `insertGridRow`, and `getGridChanges`. Start with rows `Alpha` and `Beta`, insert `New` at index `1`, and assert row order `Alpha, New, Beta`, row state `inserted`, `rowIndexById.get('new') === 1`, and `getGridChanges(...).insertedRows` contains only `New`. Add cases inserting at index `0` and beyond the end to assert clamping and reindexing, and inserting a duplicate ID to assert the original state object is returned unchanged.

Use this fixture shape so the `rowKey` and state maps are explicit:

```ts
const rows = [
  { id: 'alpha', name: 'Alpha' },
  { id: 'beta', name: 'Beta' },
];
const inserted = { id: 'new', name: 'New' };
const initial = createGridData(rows, 'id');
const result = insertGridRow(initial, inserted, 'id', 1);
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`: `npm run test -- tests/f1-grid-row-insertion.test.ts`.
Expected: FAIL because `insertGridRow` is not yet exported.

- [ ] **Step 3: Implement indexed insertion without changing append callers**

Add `insertGridRow(data, row, rowKey, index)` in `GridState.ts`. Clamp the index to `[0, data.rows.length]`; return the original data if the ID already exists; splice the new row into a copied `rows` array; call the existing `buildRowIndexes(rows, rowKey)` to rebuild both maps; and preserve the current inserted-state, dirty-field, patch, and `changedIds` updates.

Implement it with the same inserted-row metadata currently maintained by `addGridRow`:

```ts
export function insertGridRow<T extends object>(
  data: F1GridData<T>,
  row: T,
  rowKey: keyof T,
  index: number,
): F1GridData<T> {
  const stateKey = getStateKey(getGridRowId(row, rowKey));
  if (data.rowById.has(stateKey)) return data;

  const insertIndex = Math.max(0, Math.min(index, data.rows.length));
  const rows = [
    ...data.rows.slice(0, insertIndex),
    row,
    ...data.rows.slice(insertIndex),
  ];
  const changedIds = new Set(data.changedIds).add(stateKey);

  return {
    ...data,
    rows,
    ...buildRowIndexes(rows, rowKey),
    stateById: { ...data.stateById, [stateKey]: 'inserted' },
    dirtyFieldsById: {
      ...data.dirtyFieldsById,
      [stateKey]: Object.fromEntries(
        Object.keys(row).map((field) => [String(field), true]),
      ),
    },
    patchesById: { ...data.patchesById, [stateKey]: { ...row } },
    changedIds,
  };
}
```

Keep `addGridRow` as the append-compatible wrapper:

```ts
export function addGridRow<T extends object>(
  data: F1GridData<T>,
  row: T,
  rowKey: keyof T,
): F1GridData<T> {
  return insertGridRow(data, row, rowKey, data.rows.length);
}
```

- [ ] **Step 4: Run the row-state tests**

Run: `npm run test -- tests/f1-grid-row-insertion.test.ts`.
Expected: PASS, with order, inserted state, change tracking, and indexes matching each assertion.

## Task 3: Test and Implement Regular-Grid Context Menu Insertion

**Files:**
- Modify: `frontend/tests/f1-grid-context-menu.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [ ] **Step 1: Add failing context-menu tests**

Test right-clicking `Beta` and selecting `위에 행 삽입` yields `Alpha, New, Beta`; repeat for `아래에 행 삽입` and expect `Alpha, Beta, New`. Assert the new item is marked inserted, is selected, and its first editable cell is focused. Also assert that right-clicking empty grid space does not offer relative insertion.

Add cases that apply a sort and a filter through the existing header menu controls, then assert both insertion menu items are disabled and communicate that sort/filter must be cleared. Clear sort/filter and assert the actions become enabled. Assert ordinary `행 추가` still appends, and F1Tree continues to offer its existing child/root actions without the new flat-grid insertion actions.

- [ ] **Step 2: Run the focused context-menu suite and confirm failures**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx`.
Expected: FAIL because relative insertion menu items and handlers do not exist.

- [ ] **Step 3: Wire the target-relative actions**

In `F1Grid.tsx`, add handlers that capture `contextMenu.rowId` before closing the menu and call a shared insertion path with `before` or `after`. Resolve the target row's current index from `data.rowIndexById`, insert at `index` or `index + 1`, select the new row, and focus its first editable non-checkbox column.

Render the two actions only for regular F1Grid when `showAddRowInContextMenu` is enabled and the context menu has a target row. Do not render them when `treeContextMenu` is present. Disable them whenever `sortState.length > 0 || filterState.length > 0`; include concise visible/accessibility help in the disabled action label that sorting or filtering must be cleared. Do not modify either state automatically.

Represent the delayed insertion target with a local type in `F1Grid.tsx`:

```ts
type F1GridRowInsertion = {
  targetRowId: F1GridRowId;
  position: 'before' | 'after';
};
```

The context-menu handler must capture the target before closing the menu:

```ts
function handleInsertRowContextClick(position: 'before' | 'after') {
  const targetRowId = contextMenu?.rowId;
  closeContextMenu();
  if (targetRowId === undefined) return;
  handleAddRow(undefined, { targetRowId, position });
}
```

- [ ] **Step 4: Preserve the insertion anchor for row-form creation**

Extend only the local `F1GridRowFormSession` type in `F1Grid.tsx` with an optional `insertion?: F1GridRowInsertion`. When the form is applied, resolve the target's current data index and insert the validated draft row immediately before/after it. Existing ref/button/context `addRow()` creation without an insertion anchor must continue using `addGridRow`/append behavior. On successful apply, select and focus the new row and close the form; on validation failure, keep the form open and do not mutate grid data.

- [ ] **Step 5: Run focused grid tests**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx tests/f1-grid-form-modal.test.tsx tests/f1-grid-row-insertion.test.ts`.
Expected: PASS; existing append and tree tests remain green alongside insertion and form coverage.

## Task 4: Ensure Inserted Rows Are Visible Under Virtualization

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Modify: `frontend/tests/f1-grid-context-menu.test.tsx`

- [ ] **Step 1: Add a failing large-grid visibility test**

Render a grid with enough rows to activate `virtualizeRows`, scroll near the middle, insert above/below a context-menu target, and assert the body scroll moves so the new row enters the rendered window and its first editable cell receives focus. Cover both a target above and below the viewport if supported by the test harness.

- [ ] **Step 2: Run the visibility test and confirm it fails**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx`.
Expected: FAIL because insertion currently does not adjust the body scroll position.

- [ ] **Step 3: Scroll to the inserted row before relying on virtualized cell refs**

Keep a pending inserted row ID after applying the insertion. In an effect after `visibleRows` updates, resolve its displayed index and compute the row's top offset. For fixed-height mode, use the same `defaultRowHeight` assumption as `getVirtualRowWindow`; for measured-height mode, sum the existing `rowHeightsById` values with `defaultRowHeight` as fallback:

```ts
const rowTop = visibleRows
  .slice(0, targetIndex)
  .reduce(
    (total, row) =>
      total +
      (rowHeightsById.get(String(getGridRowId(row, rowKey))) ??
        defaultRowHeight),
    0,
  );
```

Set `bodyScrollRef.current.scrollTop` only as much as needed to bring the inserted row into the viewport. Let the existing viewport measurement schedule update virtualization, then retain the first-editable-cell focus. Do not query a cell ref until React has rendered the virtual row.

- [ ] **Step 4: Run the focused visibility test and related suites**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx tests/f1-grid-row-insertion.test.ts`.
Expected: PASS for both in-viewport and off-viewport insertions, with the new row visible and focused.

## Task 5: Update F1-Grid Documentation, Results, and Verify

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261008/f1-grid-row-insertion/20261008_004_F1GRID_행삽입_결과.md`
- Create: `docs/result/20261008/f1-grid-row-insertion/screenshots/` with browser screenshots.

- [ ] **Step 1: Document the context-menu behavior**

Update the context-menu section to distinguish append (`행 추가`) from target-relative insertion, note the sort/filter restriction and clearing requirement, describe scroll/focus on insertion, and state that F1Tree hierarchy operations are unchanged.

- [ ] **Step 2: Run the focused test set and frontend build**

From `frontend`, run:

```powershell
npm run test -- tests/f1-grid-context-menu.test.tsx tests/f1-grid-form-modal.test.tsx tests/f1-grid-row-insertion.test.ts
npm run build
```

Expected: all selected tests pass and the TypeScript/Vite production build completes successfully.

- [ ] **Step 3: Verify browser behavior at required viewport widths**

Use the existing Vite server if it is already running; otherwise start it with `npm run dev` and stop only the server started for this verification afterward. In a representative F1-Grid documentation/demo screen, verify context-menu placement and insertion at 375px, 768px, and 1280px, including disabled-state messaging under active sort/filter and auto-scroll to a row outside the viewport. Save screenshots under the result `screenshots/` directory.

- [ ] **Step 4: Write the result report**

Record the implemented behavior, changed files, test/build outcomes, browser viewport checks, screenshot paths, and regression checks for unchanged append and tree behavior. Include the bug scenario, root cause, fix, and regression criteria.

## Final Acceptance Checklist

- [ ] Right-click row insertion places the new row immediately above/below that row in data order.
- [ ] The new row is tracked as inserted and its row indexes remain consistent.
- [ ] The inserted row scrolls into view and receives first-editable-cell focus, including under row virtualization and after form apply.
- [ ] Relative insertion is disabled with clear guidance while sort/filter is active, without changing those settings.
- [ ] Existing append actions and `F1GridRef.addRow()` still append.
- [ ] F1Tree root/child insertion behavior is unchanged.
- [ ] Dated direction/plan/spec, F1-Grid docs, result report, and required screenshots are present.
- [ ] Focused tests and frontend build pass.
