# Community Archive F1Tree Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `루트 추가` from the community archive tree context menu and enable Excel export there.

**Architecture:** Change only the two existing F1Tree props in `ArchiveFileGrid`. The shared F1Grid/F1Tree context menu and Excel exporter already support these options and remain unchanged.

**Tech Stack:** React, TypeScript, MUI, F1Tree, Vitest, Vite.

---

## File map

- Create `docs/directions/20261021/20261021_002_커뮤니티_자료실_F1Tree_컨텍스트메뉴_개선_작업지시서.md` to define scope and acceptance criteria.
- Create `docs/plan/20261021/20261021_002_community_archive_tree_context_menu_plan.md` to record implementation and validation order.
- Create `docs/spec/20261021/20261021_002_커뮤니티_자료실_F1Tree_컨텍스트메뉴_상세사양서.md` to define exact menu behavior.
- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx` to disable root-add and enable export for this tree only.
- Modify `frontend/tests/archive-page.test.tsx` to cover the archive menu options.
- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` and `frontend/tests/f1-grid-context-menu.test.tsx` to render separators only between non-empty groups, with a no-row-actions regression test.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` and `docs/result/20261021/community-archive-upload-f1tree/result.md` to document the behavior and evidence.

## Task 1: Verify archive context menu options with a failing page test

**Files:**
- Modify `frontend/tests/archive-page.test.tsx`

- [x] **Step 1: Add the archive context-menu regression test**

Add this test inside `describe('Archive dashboard page', ...)`:

```tsx
it('shows Excel export without root-add in the archive tree context menu', async () => {
  renderArchive();
  const grid = await screen.findByRole('grid', { name: '자료실' });

  fireEvent.contextMenu(grid);

  expect(
    screen.queryByRole('menuitem', { name: '루트 추가' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
  ).toBeVisible();
});
```

- [x] **Step 2: Run the test before implementation**

Run from `frontend`:

```powershell
npx vitest run tests/archive-page.test.tsx -t "shows Excel export without root-add"
```

Expected: FAIL because the archive tree currently shows `루트 추가` and does not offer `엑셀 내보내기`.

- [x] **Step 3: Add the no-row-actions separator regression test**

In `frontend/tests/f1-grid-context-menu.test.tsx`, add a tree test with Excel export enabled and `allowAddRootInContextMenu`, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, and `allowDeleteRowInContextMenu` all set to false. Trigger the context menu and assert:

```tsx
expect(screen.getAllByRole('separator')).toHaveLength(1);
```

Run:

```powershell
npx vitest run tests/f1-grid-context-menu.test.tsx -t "renders one separator when a tree context menu has no row actions"
```

Expected: FAIL because the current static separators render twice.

## Task 2: Configure the archive tree and verify behavior

**Files:**
- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`
- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Test `frontend/tests/archive-page.test.tsx`
- Test `frontend/tests/f1-grid-context-menu.test.tsx`

- [x] **Step 1: Configure only the archive F1Tree**

In the existing `<F1Tree>` props, replace:

```tsx
canExportExcel={false}
allowAddRowInContextMenu={false}
```

with:

```tsx
canExportExcel
allowAddRootInContextMenu={false}
allowAddRowInContextMenu={false}
```

Keep `allowDeleteRowInContextMenu={false}` and `allowDuplicateRowInContextMenu={false}` unchanged. Do not change shared component defaults.

- [x] **Step 2: Run focused archive and shared-menu tests**

Run from `frontend`:

```powershell
npx vitest run tests/archive-page.test.tsx
npx vitest run tests/f1-grid-context-menu.test.tsx -t "shows the excel export item when canExportExcel is true and triggers a download"
```

Expected: all 12 archive page tests pass, including export visibility without root-add, and the focused shared Excel exporter download test passes. The two existing F1Tree sort/filter menu tests are not part of this scope; F1Tree explicitly disables those features.

- [x] **Step 3: Update archive F1-Grid documentation**

In section `# 39. 커뮤니티 자료실 파일/폴더 그리드` in `frontend/src/pages/f1-grid-docs/F1-GRID.md`, update the menu description so it states that Excel export is enabled while root-add, row-add, row-delete, and duplicate actions are disabled.

- [x] **Step 4: Update the archive result record**

Append a dated follow-up subsection to `docs/result/20261021/community-archive-upload-f1tree/result.md` recording the menu change and results from the focused tests and build.

- [x] **Step 5: Run frontend production build and final checks**

Run from `frontend`:

```powershell
npm run build
```

Then run from the repository root:

```powershell
git diff --check
git status --short
```

Expected: build succeeds; diff has no whitespace errors; changed files are limited to the archive context-menu implementation/test and its documentation.

## Task 3: Remove separators around absent context-menu groups

**Files:**
- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Test `frontend/tests/f1-grid-context-menu.test.tsx`
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Update `docs/result/20261021/community-archive-upload-f1tree/result.md`

- [x] **Step 1: Add and run the failing no-actions separator test**

The regression test renders an F1Tree with export enabled and all root/add/duplicate/delete actions disabled; because F1Tree disables sorting and filtering, the context menu should have one separator between its general actions and reset action.

Run:

```powershell
npx vitest run tests/f1-grid-context-menu.test.tsx -t "renders one separator when a tree context menu has no row actions"
```

Expected before fix: FAIL because two separator elements render.

- [x] **Step 2: Render only separators between visible menu groups**

In `F1Grid.tsx`, derive `hasRowContextMenuActions` from the same flags that display root-add, row-add, duplicate, and delete menu items. Derive `hasClearContextMenuActions` as `!disableFiltering || !disableSorting`.

Preserve these boundaries:

```text
general actions | row actions | clear/filter actions | reset action
```

Render the separator after general actions (the reset action always follows). Render a separator between row actions and clear/filter actions only when both groups are present. Render a separator before reset only when at least one optional group is present. This yields one separator for the archive menu, while keeping the established two/three separators when the relevant action groups exist.

- [x] **Step 3: Run context-menu regression tests**

Run from `frontend`:

```powershell
npx vitest run tests/f1-grid-context-menu.test.tsx -t "renders one separator when a tree context menu has no row actions|omits the clear-action group divider|keeps the clear-action group divider"
npx vitest run tests/archive-page.test.tsx
```

Expected: all selected shared-menu checks and all 12 archive page tests pass.

- [x] **Step 4: Update docs with the separator behavior**

Update section `# 39. 커뮤니티 자료실 파일/폴더 그리드` in `frontend/src/pages/f1-grid-docs/F1-GRID.md` to document the single separator when archive row actions and sorting/filtering are absent. Append actual test results to the follow-up section in `docs/result/20261021/community-archive-upload-f1tree/result.md`.

- [x] **Step 5: Verify the build and diff**

Run from `frontend`:

```powershell
npm run build
```

Run from the repository root:

```powershell
git diff --check
git status --short
```

Expected: build exits successfully and `git diff --check` reports no whitespace errors.
