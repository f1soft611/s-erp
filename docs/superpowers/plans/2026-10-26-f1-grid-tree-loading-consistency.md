# F1-Grid/F1-Tree Loading Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that every F1Tree loading state uses the same shared 34px, 1.8px F1Grid spinner.

**Architecture:** Keep F1Tree's existing `gridProps` forwarding to F1Grid and keep the one shared overlay implementation. Add a focused F1Tree loading regression test and clarify the existing F1-Grid documentation; do not add tree-specific spinner code or change DashboardPage's 3.6px default.

**Tech Stack:** React, TypeScript, MUI, Vitest.

---

## File Map

- `frontend/tests/f1-tree.test.tsx`: Verify F1Tree forwards loading into F1Grid's shared overlay with the exact 34px size and 1.8px stroke.
- `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`: Existing delegation path; no implementation change expected.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: State explicitly that F1Grid and F1Tree use the same grid loading spinner.
- `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`: Record identical F1Grid/F1Tree rendering as an acceptance condition.
- `docs/plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md`: Include the F1Tree regression in validation.
- `docs/spec/20261026/20261026_002_f1-grid_spinner_visibility_상세사양서.md`: Specify equal F1Grid/F1Tree overlay behavior.
- `docs/result/20261026/f1-grid-loading-spinner/20261026_002_f1-grid_spinner_visibility_결과.md`: Record the added regression test result.

### Task 1: Add an F1Tree loading regression

**Files:**
- Modify: `frontend/tests/f1-tree.test.tsx`

- [x] **Step 1: Add the failing-until-run F1Tree loading contract test**

Add this test inside `describe('F1Tree interaction', ...)`, where the existing `rows` and `columns` fixtures are in scope:

```tsx
it('uses the same loading spinner as F1Grid', () => {
  render(
    <F1Tree
      rows={rows}
      columns={columns}
      rowKey="id"
      parentKey="parentId"
      treeColumn="name"
      ariaLabel="loading tree"
      loading
    />,
  );

  expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
  const overlay = screen.getByTestId('f1-grid-loading-overlay');
  const progress = screen.getByRole('progressbar');
  const circle = progress.querySelector('circle');

  expect(overlay).toBeInTheDocument();
  expect(progress).toHaveStyle({ width: '34px', height: '34px' });
  expect(circle).not.toBeNull();
  expect(circle).toHaveAttribute('stroke-width', '1.8');
});
```

- [x] **Step 2: Run the new test and confirm the current shared path**

From `frontend`, run:

```bash
npx vitest run tests/f1-tree.test.tsx -t "uses the same loading spinner as F1Grid"
```

Expected: PASS, proving F1Tree forwards loading to the shared F1Grid overlay. If it fails, inspect the exact forwarding and aria evidence before changing production code; do not add a second spinner preemptively.

### Task 2: Align user-facing and dated project documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md` at the `loading` description.
- Modify: `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`
- Modify: `docs/plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md`
- Modify: `docs/spec/20261026/20261026_002_f1-grid_spinner_visibility_상세사양서.md`
- Modify: `docs/result/20261026/f1-grid-loading-spinner/20261026_002_f1-grid_spinner_visibility_결과.md`

- [x] **Step 1: State the shared F1Grid/F1Tree contract**

Clarify the loading descriptions: F1Tree delegates to F1Grid, so every F1Grid and F1Tree loading overlay uses the same 34px `AppLoadingSpinner` at 1.8px with the same theme backdrop and loading interaction. Keep DashboardPage's shared component default at 3.6px, and do not imply that screen-specific loading lifecycles changed.

- [x] **Step 2: Record the F1Tree test in validation documents**

Add `npx vitest run tests/f1-tree.test.tsx -t "uses the same loading spinner as F1Grid"` to the dated plan's verification commands. Add the exact F1Tree loading assertions to the detailed specification. Record the passing F1Tree regression in the result report after executing it.

### Task 3: Run focused verification

**Files:**
- Test: `frontend/tests/app-loading-spinner.test.tsx`
- Test: `frontend/tests/f1-grid.test.tsx`
- Test: `frontend/tests/f1-tree.test.tsx`
- Build: frontend TypeScript and Vite build

- [x] **Step 1: Run shared component, Grid, and Tree regressions**

From `frontend`, run:

```bash
npm run test -- tests/app-loading-spinner.test.tsx
npx vitest run tests/f1-grid.test.tsx -t "uses the thinner shared spinner"
npx vitest run tests/f1-tree.test.tsx -t "uses the same loading spinner as F1Grid"
```

Expected: each focused test exits with code 0; default shared spinner remains 3.6px and F1Grid/F1Tree remain 1.8px.

- [x] **Step 2: Build and check the final diff**

From `frontend`, run `npm run build`. From the repository root, run `git diff --check`.

Expected: build exits with code 0 (the known bundle-size warning may remain) and `git diff --check` emits no errors.

## Scope Guard

- Do not change F1Tree's production rendering unless the focused regression proves the current `gridProps` delegation does not work.
- Do not add tree-specific loading UI or configuration.
- Do not change DashboardPage's 3.6px default, F1Grid's 1.8px override, page loading policies, API, or backend.
