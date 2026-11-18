# Hook dependency boundary remediation Implementation Plan

> **For agentic workers:** Follow the repository's unit 032 workflow in order: direction, this plan, detailed specification, implementation, verification, result documentation. Do not stage, commit, or push.

**Goal:** Remove exactly eight requested React exhaustive-deps diagnostics without changing application behavior.

**Architecture:** Keep callback and memo bodies intact except where a local binding exists solely to support an unnecessary dependency. Remove the four `GridRow` invalidations identified by lint. Stabilize role columns against their actual reactive input, `committedCreateRowIds`, so the export callback can retain a valid memoized dependency.

**Tech Stack:** React, TypeScript, Oxlint JSON output, Vitest, TypeScript project build.

---

### Task 1: Establish the RED warning gate

**Files and evidence:**
- Baseline JSON: session artifact `lint032-red.json`.
- Source tree: the existing owned validation workspace's `frontend`.

- [x] Run `.\\node_modules\\.bin\\oxlint.cmd --format=json` in the owned validation frontend and retain the output outside the repository.
- [x] Confirm exactly eight `react-hooks(exhaustive-deps)` diagnostics are in the four requested files: one CommonCode, two purchase-confirm, four GridRow, and one roles.
- [x] Preserve this baseline and compare the entire diagnostics set after implementation; actual totals are exhaustive-deps 22→14 and lint 127→119.

### Task 2: Apply the eight dependency-only corrections

**Files:**
- Modify `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`.
- Modify `frontend/src/pages/materials/request/confirm/PurchaseRequestConfirmPage.tsx`.
- Modify `frontend/src/shared/components/f1-grid/core/GridRow.tsx`.
- Modify `frontend/src/pages/settings/system/roles/components/RoleManagementPanel.tsx`.

- [x] Remove `searchQuery` from the CommonCode component's local destructuring and the `filteredGroups` dependency array; keep the public optional prop and callers unchanged.
- [x] Keep the purchase-cancel prompt's `activeRows.length` expression. Replace `requestCount` with `activeRows` in that callback's dependencies because `requestCount` is the count of distinct request IDs, not the row count.
- [x] Remove only the two callback dependency-array entries flagged in each GridRow callback: `latestPropsRef` and `selectedCellRange` from mouse-down; `selectedCellRange` and `isCellSelectionDragging` from mouse-enter. Remove the now-unused local `isCellSelectionDragging` destructuring while retaining its public prop type; do not alter callback bodies or event/state/ref logic.
- [x] Memoize the role-column array using its actual reactive predicate input, `committedCreateRowIds`, via a stable `isUncommittedNewRole` callback. Keep each column definition and all editor/export/permission logic unchanged.
- [x] Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` to clarify that callback dependency ownership is internal and does not change pointer, keyboard, range-selection, or pinned-column behavior.

### Task 3: Run focused existing regressions and typecheck

**Tests:**
- `frontend/tests/common-code-management-page.test.tsx`
- `frontend/tests/purchase-request-confirm.test.tsx`
- `frontend/tests/role-management-notification.test.tsx`
- `frontend/tests/f1-grid.test.tsx`
- `frontend/tests/f1-grid-pinned-column-range.test.tsx`

- [x] Copy only the five changed frontend source/doc files and the required test inputs into the existing validation workspace paths; do not reset or clean that workspace.
- [x] Run those focused Vitest suites with `TZ=UTC`, thread pool, and at most two workers. Record the report's actual test file count from `testResults.length`: five files, 292 tests.
- [x] Run `.\\node_modules\\.bin\\tsc.cmd -b` in the validation frontend.
- [x] Run complete structured Oxlint and confirm the exact eight target warnings are gone, exhaustive-deps is 14, total diagnostics are 119, and all other diagnostics match the baseline.
- [x] Compare all changed frontend source/doc bytes between root and validation workspace, audit allowed paths, and run `git diff --check`.

### Task 4: Record the result

**File:**
- Create `docs/result/20261118/repository-remediation/20261118_032_hook-dependency-boundaries_결과.md`.

- [x] Record exact per-target reasoning, test file/test-case counts, typecheck/lint exits, final diagnostic totals, source-snapshot proof, and any uncertainty.
- [x] Explain that the dependency-only changes have no visual effect and therefore have no new screenshot; do not reuse old screenshots as current evidence.
- [x] Include copyable commit title/body without creating the commit.
