# F1-Tree Checkbox Marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the F1-Tree leaf branch marker from overlapping a tree checkbox.

**Architecture:** Keep `F1Tree`'s existing leaf-only marker condition and move the marker into the existing empty disclosure slot. Add a structural regression test for the checkbox-enabled case; do not change tree projection, checkbox state, or row data.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library.

---

### Task 1: Add a regression test

**Files:**
- Modify: `frontend/tests/f1-tree.test.tsx`

- [x] **Step 1: Add a failing test**

Add this test under `describe('F1Tree interaction', ...)`, before the existing checkbox-selection test:

```tsx
it('places a leaf marker in the disclosure slot when treeCheckbox is enabled', () => {
  const rowsWithGrandchild = [
    ...rows,
    { ...rows[1], id: 'grandchild', parentId: 'child', name: 'Grandchild' },
  ];

  render(
    <F1Tree
      rows={rowsWithGrandchild}
      columns={columns}
      rowKey="id"
      parentKey="parentId"
      treeColumn="name"
      defaultExpanded="all"
      treeCheckbox
    />,
  );

  const grandchildRow = document.querySelector(
    '[data-f1-grid-row-id="grandchild"]',
  )!;
  const marker = grandchildRow.querySelector('[data-f1-tree-branch]')!;

  expect(marker.parentElement).toHaveAttribute('data-f1-tree-disclosure-slot');
  expect(
    grandchildRow.querySelector('[aria-label="Grandchild 트리 선택"]'),
  ).not.toContainElement(marker);
});
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`:

```powershell
npm run test -- tests/f1-tree.test.tsx
```

Expected: the new test fails because the branch marker is currently rendered as a sibling of the checkbox and is not inside a disclosure slot.

### Task 2: Move the marker into the empty disclosure slot

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`

- [x] **Step 1: Render the marker inside the leaf placeholder**

In the `cellAdornment` JSX, remove the separately positioned branch marker. Replace the leaf's current 32px placeholder with a positioned disclosure slot. Keep the existing `meta.depth > 0 && !meta.hasChildren` condition:

```tsx
{meta.hasChildren ? (
  <IconButton
    size="small"
    aria-label={`${label} ${expanded ? '접기' : '펼치기'}`}
    onClick={(event) => {
      event.stopPropagation();
      if (expanded) removeExpanded(rowId);
      else addExpanded(rowId);
    }}
  >
    {expanded ? (
      <ExpandMoreIcon fontSize="small" />
    ) : (
      <ChevronRightIcon fontSize="small" />
    )}
  </IconButton>
) : (
  <Box
    data-f1-tree-disclosure-slot=""
    sx={{ position: 'relative', width: 32, height: 32, flex: '0 0 auto' }}
  >
    {meta.depth > 0 ? (
      <Box
        aria-hidden="true"
        data-f1-tree-branch=""
        sx={{
          position: 'absolute',
          left: 17,
          top: '50%',
          transform: 'translateY(-65%)',
          width: 10,
          height: 12,
          borderLeft: 1,
          borderBottom: 1,
          borderColor: 'text.disabled',
          pointerEvents: 'none',
        }}
      />
    ) : null}
  </Box>
)}
```

Keep the tree checkbox before this branch of the JSX. This lets the marker use the same reserved slot with or without a checkbox, without shifting the label or interactive controls.

- [x] **Step 2: Run the focused F1-Tree tests**

Run from `frontend`:

```powershell
npm run test -- tests/f1-tree.test.tsx
```

Expected: all F1-Tree tests pass, including the new slot assertion and existing checkbox cascade and leaf-only marker coverage.

### Task 3: Update documentation and verify the UI

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261116/f1-tree-checkbox-marker/20261116_017_f1-tree-checkbox-marker_결과보고서.md`
- Create: `docs/result/20261116/f1-tree-checkbox-marker/screenshots/tree-checkbox-375.png`
- Create: `docs/result/20261116/f1-tree-checkbox-marker/screenshots/tree-checkbox-768.png`
- Create: `docs/result/20261116/f1-tree-checkbox-marker/screenshots/tree-checkbox-1280.png`

- [x] **Step 1: Document the marker and checkbox layout**

Update the F1-Tree marker bullet in `F1-GRID.md` to state that the leaf marker is placed in the empty disclosure slot after the tree checkbox when `treeCheckbox` is enabled, so the two do not overlap.

- [x] **Step 2: Run the frontend build and lint**

Run from `frontend`:

```powershell
npm run build
npm run lint
```

Expected: both commands exit successfully; record any existing lint warnings in the result report.

- [x] **Step 3: Inspect browser rendering at the required widths**

Use the existing project browser workflow at `http://127.0.0.1:4173`. Render a tree with `treeCheckbox` enabled and a leaf descendant, then inspect at 375px, 768px, and 1280px. Confirm the marker is fully inside the disclosure slot, does not cover the checkbox or label, and the page has no unintended horizontal overflow. Save the three screenshots at the paths above.

- [x] **Step 4: Write the result report**

Record the reproduction condition, root cause (depth-only absolute positioning ignored the checkbox occupying that area), the slot-based correction, changed files, focused test/build/lint results, browser viewports, and screenshot links. Do not create a commit unless requested.
