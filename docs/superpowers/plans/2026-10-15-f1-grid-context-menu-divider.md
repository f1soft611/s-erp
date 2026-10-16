# F1-Grid Context Menu Divider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent adjacent separators in the F1-Grid context menu when both filter-clear and sort-clear actions are hidden.

**Architecture:** Use the existing `disableFiltering` and `disableSorting` visibility flags to conditionally render only the divider before their action group. Keep the divider before the reset action and all other menu separators unchanged. Add RTL regression tests, update F1-Grid documentation, and record browser verification in the dated result folder.

**Tech Stack:** React, TypeScript, MUI Menu/Divider, Vitest, Testing Library, Vite.

---

## File map

- Modify `frontend/tests/f1-grid-context-menu.test.tsx` to verify the hidden-both and visible-one filter/sort cases.
- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` to conditionally render the divider preceding the clear-action group.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` to describe the conditional separator.
- Create `docs/result/20261015/f1-grid-context-menu-divider/20261015_017_F1Grid_컨텍스트메뉴_구분선_결과보고서.md` and browser evidence.

## Task 1: Add a failing context-menu regression test

**Files:**
- Modify: `frontend/tests/f1-grid-context-menu.test.tsx`

- [x] **Step 1: Add a test with both actions hidden**

Add a test adjacent to the existing filter/sort context-menu tests:

```tsx
it('omits the clear-action group divider when filtering and sorting are disabled', () => {
  render(
    <F1Grid
      rows={flatRows}
      columns={flatColumns}
      rowKey="id"
      ariaLabel="테스트 그리드"
      disableFiltering
      disableSorting
    />,
  );

  fireEvent.contextMenu(getGridBody('테스트 그리드'));

  const menu = screen.getByRole('menu');
  expect(screen.queryByRole('menuitem', { name: '필터 해제' })).toBeNull();
  expect(screen.queryByRole('menuitem', { name: '정렬 해제' })).toBeNull();
  expect(within(menu).getAllByRole('separator')).toHaveLength(2);
});
```

Import `within` from Testing Library. With both clear actions hidden, the two
remaining separators are after the top actions and before reset. The extra
divider after row actions, before the empty clear-action group, is the
regression.

- [x] **Step 2: Add a test with one clear action still visible**

Add a second test with `disableFiltering` only. Assert the filter item is
absent, the sort item is present, and the menu has three separators. This
protects the existing group boundaries when one action remains available.

- [x] **Step 3: Run the focused tests and confirm the new hidden-both test fails**

Run from `frontend`:

```powershell
npx vitest run tests/f1-grid-context-menu.test.tsx -t "clear-action group divider"
```

Expected before the fix: the new hidden-both test fails because it finds three
separators instead of two. The visible-one test passes with three separators.

## Task 2: Render the clear-action group divider only when needed

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [x] **Step 1: Gate the divider immediately before the filter/sort items**

Replace only the divider immediately before the conditional `필터 해제` item:

```tsx
        {!disableFiltering || !disableSorting ? <Divider /> : null}
        {!disableFiltering ? (
          <MenuItem
            disabled={filterState.length === 0}
            onClick={handleClearFiltersClick}
          >
            필터 해제
          </MenuItem>
        ) : null}
```

Leave the divider immediately before `설정을 기본값으로 복원` unconditional.
Do not change other menu dividers or menu item behavior.

- [x] **Step 2: Rerun the focused tests**

Run from `frontend`:

```powershell
npx vitest run tests/f1-grid-context-menu.test.tsx -t "clear-action group divider"
```

Expected: both new context-menu tests pass, including separator counts of two
when both actions are hidden and three when either action is visible. The full
test file has three pre-existing failures recorded in the result report.

## Task 3: Update user-facing and result documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261015/f1-grid-context-menu-divider/20261015_017_F1Grid_컨텍스트메뉴_구분선_결과보고서.md`
- Create: `docs/result/20261015/f1-grid-context-menu-divider/screenshots/` browser capture

- [x] **Step 1: Update the context-menu separator description**

State that the divider before the filter/sort clear-action group is displayed
only if at least one action is visible; the separator before reset remains.

- [x] **Step 2: Verify and capture the menu in a browser**

Use the existing F1-Grid documentation/demo surface. Confirm visually that
when both actions are disabled there is one separator before reset, and that
when one action is enabled the clear-action group remains separated. Save the
relevant capture under the result folder.

- [x] **Step 3: Write the result report**

Record the reproduction condition, the always-rendered divider root cause, the
conditional-rendering fix, the focused test/build commands and outcomes, and
the browser capture path. Do not include unrelated worktree changes.

## Task 4: Verify the finished change

- [x] **Step 1: Run the focused regression test**

```powershell
npx vitest run tests/f1-grid-context-menu.test.tsx -t "clear-action group divider"
```

Expected: PASS.

- [ ] **Step 2: Run the frontend build**

```powershell
npm run build
```

Expected: TypeScript and Vite build complete successfully.

Current blocker: the latest build stops on an unused `Typography` import in the
unrelated, concurrently modified
`frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`.
Do not change that file as part of this F1-Grid task.

- [x] **Step 3: Review the diff**

Confirm the source diff changes only the clear-action group divider condition,
the tests cover hidden-both and visible-one combinations, and the docs state
the same behavior. Preserve all unrelated pre-existing worktree modifications.
