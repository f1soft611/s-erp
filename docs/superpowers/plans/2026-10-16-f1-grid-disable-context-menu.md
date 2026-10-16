# F1-Grid Context Menu Disable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `disableContextMenu` to suppress the entire F1Grid/F1Tree body right-click menu without changing right-click selection or header menus.

**Architecture:** Add one optional boolean to shared `F1GridProps`, which `F1TreeProps` already extends. Keep `openContextMenu` event suppression and target selection, but avoid opening the app menu when disabled; close an already-open menu if the prop is enabled. Update API docs, F1-Grid docs, its interactive playground, and focused regression tests.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- `frontend/src/shared/components/f1-grid/types/grid.types.ts`: shared public prop contract; F1Tree inherits it.
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: prop default, right-click menu state, and cleanup when the option is enabled.
- `frontend/tests/f1-grid-context-menu.test.tsx`: F1Grid/F1Tree menu and selection regression cases.
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`: public API table.
- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`: context-menu overview, prop table, and sample.
- `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx`: interactive toggle demonstrating the new option.
- `frontend/tests/f1-grid-docs.test.tsx`: API-contract allowlist and docs regression.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: behavior and prop reference.
- `docs/spec/20261016/20261016_003_F1Grid_컨텍스트메뉴_전체비활성화_상세사양서.md`: project detailed spec.
- `docs/result/20261016/f1-grid-disable-context-menu/`: implementation report and browser screenshot.

## Task 1: Write the dated detailed specification

**Files:**
- Create: `docs/spec/20261016/20261016_003_F1Grid_컨텍스트메뉴_전체비활성화_상세사양서.md`

- [x] **Step 1: Specify the accepted contract and edge behavior**

Document `disableContextMenu?: boolean` with default `false`, F1Grid/F1Tree body scope, suppression of both app and native browser menus, continued target selection, closing an open menu when enabled dynamically, unchanged header menus, and unchanged per-item flags.

- [x] **Step 2: Define verification criteria**

Specify focused tests for disabled F1Grid/F1Tree menus, native `contextmenu` default prevention, preserved right-click selection, dynamically closing an open menu, and the existing default-enabled behavior. Include docs/API consistency, frontend build, and browser screenshot criteria.

## Task 2: Add failing context-menu regression tests

**Files:**
- Modify: `frontend/tests/f1-grid-context-menu.test.tsx`

- [x] **Step 1: Add the disabled F1Grid test**

Import `createEvent` from Testing Library, render a grid with `disableContextMenu`, then dispatch and inspect the event:

```tsx
const cell = screen.getByRole('gridcell', { name: 'Beta' });
const event = createEvent.contextMenu(cell, { button: 2 });

fireEvent(cell, event);

expect(event.defaultPrevented).toBe(true);
expect(screen.queryByRole('menu')).not.toBeInTheDocument();
expect(cell).toHaveAttribute('data-grid-selected', 'true');
```

Place this setup inside the test's `render(<F1Grid ... disableContextMenu />)` and preserve the existing `flatRows`, `flatColumns`, `rowKey`, and aria label fixtures.

- [x] **Step 2: Add equivalent F1Tree coverage**

Render the existing `F1Tree` fixture with `disableContextMenu`, dispatch `contextmenu` on its `Alpha` grid cell, and assert the event is prevented, the menu is absent, and the cell remains selected.

- [x] **Step 3: Add dynamic-disable coverage**

Render F1Grid with the option false, open the menu by right-clicking the body, rerender the same grid with the option true, and `await waitFor` the menu to be absent. This verifies cleanup of an already-open menu rather than only suppressing future opens.

- [x] **Step 4: Run the focused tests to confirm failure**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx`

Expected: the new disabled-menu assertions fail because `disableContextMenu` is not yet in the public type and the menu still opens; pre-existing context-menu cases continue to pass.

## Task 3: Implement the shared option and menu suppression

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [x] **Step 1: Add the shared prop**

Add `disableContextMenu?: boolean` beside `disableSorting` and `disableFiltering` in `F1GridProps`. Do not add a duplicate declaration to `F1TreeProps`; it is derived from `F1GridProps`.

- [x] **Step 2: Preserve event behavior but skip menu state**

Destructure `disableContextMenu = false`. Keep `event.preventDefault()`, target resolution, outside/header handling, and the existing `applySelection()` behavior. After selection, when disabled, clear any pending reopen timer, close any open menu, and return before setting `contextMenu`. This ensures right-click selection persists without showing either menu.

- [x] **Step 3: Close menus on a prop change**

Add an effect keyed to `disableContextMenu` that calls the existing `closeContextMenu()` when the prop is true. This clears a pending reopen timer as well as the visible menu.

- [x] **Step 4: Run the focused context-menu tests**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx`

Expected: all new context-menu cases pass, including F1Tree inheritance and dynamic closure. The two pre-existing F1Tree sort/filter context-menu tests remain failing as recorded in the dated result report.

## Task 4: Update API and interactive documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Modify: `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx`
- Modify: `frontend/tests/f1-grid-docs.test.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`

- [x] **Step 1: Document the public API**

Add the API entry for `disableContextMenu`, type `boolean`, default `false`, and explain it suppresses the body app/browser context menus in F1Grid and F1Tree while preserving target selection. Add it to the public API test allowlist.

- [x] **Step 2: Expose a playground toggle**

In `ContextMenuPlayground`, add a boolean state initialized to false, a button that toggles the state, and pass `disableContextMenu={contextMenuDisabled}` to the example grid. Label the button and explanatory text so a user can discover the disabled behavior.

- [x] **Step 3: Update feature prose and standalone reference**

Update the context-menu portal prop table/sample and `F1-GRID.md` to document default behavior, both grid types, native-menu suppression, preserved selection, dynamic closing, and header-menu exclusion.

- [x] **Step 4: Verify docs and context-menu tests**

Run: `npm run test -- tests/f1-grid-context-menu.test.tsx tests/f1-grid-docs.test.tsx`

Expected: all 29 F1-Grid docs tests pass and the API reference contract includes `disableContextMenu`. The context-menu test file has 28 passing cases and the same 2 baseline failures; no new failures are introduced.

## Task 5: Build, browser verification, and result record

**Files:**
- Create: `docs/result/20261016/f1-grid-disable-context-menu/20261016_003_F1Grid_컨텍스트메뉴_전체비활성화_결과.md`
- Create: `docs/result/20261016/f1-grid-disable-context-menu/screenshots/` with the disabled-menu browser capture.

- [x] **Step 1: Run the frontend build**

Run from `frontend`: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [x] **Step 2: Verify the docs playground in the browser**

Use the required `http://127.0.0.1:4173` browser environment. Toggle the documented demo option, right-click a body cell, verify the app menu and browser menu are absent and the cell remains selected; toggle back and verify the app menu works. Also verify the header column menu is unchanged. Capture the disabled state in the result screenshot folder and stop only a dev server started for this check.

- [x] **Step 3: Record the completed work**

Write the reproduction/requirement, root cause, changed prop behavior, tests/build outcomes, browser observations, and screenshot path in the dated result report. Run `git diff --check` and confirm only scoped source, tests, F1-Grid docs, and task documentation changed; do not alter pre-existing unrelated worktree changes.
