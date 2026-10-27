# F1-Grid Smoother Pinned Scrolling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce scroll-time React work so pinned columns and headers feel immediate without changing native sticky behavior or alignment.

**Architecture:** Keep the body as the native horizontal scroll source and preserve direct header synchronization. Continue requestAnimationFrame viewport measurements for vertical scrolling and geometry; suppress horizontal React viewport updates when column virtualization is off or when the computed virtual column index set is unchanged, and update it when that set changes.

**Tech Stack:** React 19, TypeScript, MUI, Vitest, Playwright Chromium, Vite.

---

## File map

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` owns scroll measurements, horizontal header synchronization, and the column virtualization window. Change only the horizontal state update policy and keep vertical/geometry updates intact.
- `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts` owns pure virtual window calculations and RAF scheduling. Add a shared equality helper only if the implementation needs it.
- `frontend/tests/f1-grid.test.tsx` exercises component-level scroll updates, header synchronization, and pinned-column behavior.
- `frontend/tests/f1-grid-virtualization.test.ts` exercises pure window/equality calculations if a helper is added.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md` documents the behavior contract.
- `docs/result/20261027/f1grid-smooth-pinned-scroll/` records cause, changes, verification, and browser screenshots.
- Date-scoped direction, plan, and spec documents are linked from `docs/directions/20261027/20261027_017...`, `docs/plan/20261027/20261027_017...`, and `docs/spec/20261027/20261027_017...`.

## Task 1: Add failing regression coverage

**Files:**
- Modify: `frontend/tests/f1-grid.test.tsx`

- [x] **Step 1: Add a non-virtualized horizontal-scroll render test.** Wrap `F1Grid` in `React.Profiler`, wait for initial measurements to settle, change the body scroller's `scrollLeft`, dispatch `scroll`, and assert that no additional commit is recorded after the scheduled animation frame. Keep the fixture narrow enough that `virtualizeColumns={false}` renders all columns.
- [x] **Step 2: Add a virtualized same-window test.** Render a wide `virtualizeColumns` fixture with pinned first/last columns and `columnOverscan={1}`. Establish `clientWidth`, wait for initial layout, move `scrollLeft` within the currently rendered column window, dispatch `scroll`, and assert no additional Profiler commit.
- [x] **Step 3: Add a virtualized window-change test.** In the same fixture, move `scrollLeft` far enough that a previously absent ordinary header enters the calculated viewport/overscan range; dispatch `scroll` and assert that header becomes mounted. Assert that pinned endpoints remain mounted.
- [x] **Step 4: Run the focused tests and verify failure.** The new no-extra-commit assertions failed before the implementation, then passed after it.

## Task 2: Gate horizontal viewport state updates

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts` only if a shared pure equality helper is needed
- Test: `frontend/tests/f1-grid.test.tsx`
- Test: `frontend/tests/f1-grid-virtualization.test.ts` only if a helper is added

- [x] **Step 1: Keep existing header synchronization immediate.** Preserve the current mismatch-guarded native header/body synchronization and keep the body as the authoritative source for viewport metrics. Do not route header alignment through React state or an animation.
- [x] **Step 2: Separate scroll measurement modes.** Keep the existing RAF scheduler for `scrollTop`, viewport dimensions, and scrollbar gutter. Allow explicit body scroll events to suppress the horizontal state update when it cannot change the rendered column window; keep initial measurement and resize/observer measurement authoritative so geometry changes recalculate from the actual body scroll position.
- [x] **Step 3: Compare the virtual column window before publishing horizontal position.** Reuse `getVirtualColumnIndexes` with the same widths, overscan, pinned indices, protected focus/edit/range indices, checkbox offset, and action-column width used by `renderedColumnIndexes`. When virtualization is inactive or the computed index set equals the current rendered set, retain the last committed `scrollLeft`. Publish the latest actual `scrollLeft` only when the rendered set changes.
- [x] **Step 4: Preserve coalescing for pending frames.** Ensure multiple scroll events before one RAF flush use the latest body position and do not overwrite a pending window transition with an older committed position. Keep state equality checks for unchanged vertical and dimension metrics.
- [x] **Step 5: Run the focused regression tests.** Targeted viewport, virtualized window-change, and header alignment tests pass.

## Task 3: Verify adjacent grid contracts

**Files:**
- No new source files
- Tests: `frontend/tests/f1-grid.test.tsx`, `frontend/tests/f1-grid-virtualization.test.ts`

- [x] **Step 1: Run scroll and virtualization coverage.** The new component tests and existing header/gutter/virtualized-window regressions pass; the pure virtualization suite also passes.
- [x] **Step 2: Run pinned, range, and performance coverage.** Four related suites pass (41 tests total).
- [x] **Step 3: Run build and lint.** `npm run build` passes. Targeted oxlint passes with existing F1Grid warnings. Whole-project lint reports the unrelated pre-existing conditional hook error at `tests/common-code-management-page.test.tsx:53`.

## Task 4: Update behavior documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`

- [x] **Step 1: Add the scroll-performance contract.** Document that native body scrolling and immediate header sync remain, horizontal position is published to React only when a virtualized column window changes, and vertical/geometry measurement is unchanged.
- [x] **Step 2: Review documentation consistency.** The text does not promise a fixed frame-time improvement or imply a visual animation/different pinning UX.

## Task 5: Verify in Chromium and document results

**Files:**
- Create: `docs/result/20261027/f1grid-smooth-pinned-scroll/20261027_017_f1grid-smooth-pinned-scroll_결과.md`
- Create: `docs/result/20261027/f1grid-smooth-pinned-scroll/screenshots/` (screenshots only)

- [x] **Step 1: Reuse the S-ERP Vite server on `http://127.0.0.1:4173` only after confirming it belongs to this project.** The listening process is this repository's Vite server.
- [x] **Step 2: Use Chromium with synthetic rows and columns.** Verified left/right pinned positions, header/body alignment, end-of-scroll alignment, browser errors, and no page-level horizontal overflow at all three viewports.
- [x] **Step 3: Capture screenshots.** Screenshots are saved under the result folder with lowercase English filenames.
- [x] **Step 4: Record reproducible evidence.** The result document records the cause, source changes, checks, browser conditions, and screenshot links.
- [x] **Step 5: Final scope check.** `git diff --check` passes; unrelated Excel and pinned-merge worktree changes remain untouched.
