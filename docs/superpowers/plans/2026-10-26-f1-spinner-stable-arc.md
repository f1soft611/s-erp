# F1 Spinner MUI Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the standard MUI indeterminate spinner so its circle renders the intended rotating/dynamic arc instead of a custom frozen partial arc.

**Architecture:** Keep `AppLoadingSpinner` as the shared wrapper around MUI `CircularProgress`, explicitly render `variant="indeterminate"`, and remove the styled circle override. Preserve the current 34px/2.4px shared default, DashboardPage's explicit 3.6px exception, and F1Grid/F1Tree's 2.4px override.

**Tech Stack:** React, TypeScript, MUI `CircularProgress`, Vitest, Testing Library, Vite, integrated browser.

---

## File Map

- `docs/directions/20261026/20261026_007_f1-spinner_stable_arc_작업지시서.md`: explain the component-local CSS cause and requested MUI behavior.
- `docs/plan/20261026/20261026_007_f1-spinner_stable_arc_계획서.md`: track implementation and validation steps.
- `docs/spec/20261026/20261026_007_f1-spinner_stable_arc_상세사양서.md`: define the component and regression contract.
- `frontend/src/shared/components/AppLoadingSpinner.tsx`: use plain MUI `CircularProgress` with indeterminate variant and retain typed props/defaults.
- `frontend/tests/app-loading-spinner.test.tsx`: lock standard MUI animation and existing size/thickness/prop contracts.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`, `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`, `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`: describe standard MUI motion and Grid/Tree appearance.
- `docs/result/20261026/f1-spinner-stable-arc/`: record source evidence, verification, and screenshot if browser capture is available.
- Leave unrelated breadcrumb files and concurrent worktree changes untouched.

### Task 1: Write dated project documents

**Files:**
- Create: `docs/directions/20261026/20261026_007_f1-spinner_stable_arc_작업지시서.md`
- Create: `docs/plan/20261026/20261026_007_f1-spinner_stable_arc_계획서.md`
- Create: `docs/spec/20261026/20261026_007_f1-spinner_stable_arc_상세사양서.md`
- Reference: `docs/superpowers/specs/2026-10-26-f1-spinner-stable-arc-design.md`

- [x] Document that `animation: none` plus a custom dash rule on the MUI circle caused the static/partial-arc appearance, and that MUI's built-in changing arc is intended.
- [x] Specify that the wrapper renders indeterminate MUI without custom circle motion/stroke overrides while preserving all existing dimensions, thicknesses, colors, accessibility, and lifecycles.

### Task 2: Add the failing MUI-animation regression test

**Files:**
- Modify: `frontend/tests/app-loading-spinner.test.tsx`
- Test: `frontend/tests/app-loading-spinner.test.tsx`

- [x] **Step 1: Assert standard indeterminate animation rules**

The test should render `AppLoadingSpinner`, obtain its progressbar, concatenate `style[data-emotion]` contents, and assert:

```tsx
expect(injectedStyles).toMatch(
  /MuiCircularProgress-circle\{[^}]*animation:animation-[^;]+;/,
);
expect(injectedStyles).toMatch(
  /@keyframes animation-[^{]+\{[^}]*stroke-dasharray:1px,200px;/,
);
expect(injectedStyles).not.toMatch(
  /MuiCircularProgress-circle\{[^}]*animation:none/,
);
expect(progressbar).toHaveClass('MuiCircularProgress-indeterminate');
```

- [x] **Step 2: Verify the test fails before the fix**

Run from `frontend`:

```powershell
npm run test -- tests/app-loading-spinner.test.tsx
```

Expected: the negative assertion fails on the custom component rule setting the circle animation to `none`.

### Task 3: Remove the local animation override

**Files:**
- Modify: `frontend/src/shared/components/AppLoadingSpinner.tsx`
- Test: `frontend/tests/app-loading-spinner.test.tsx`

- [x] **Step 1: Render MUI's standard indeterminate component**

Remove the `styled` import and `StableArcCircularProgress` wrapper. Exclude `variant` from `AppLoadingSpinnerProps`, retain existing `size` and `thickness` defaults, and render:

```tsx
return (
  <CircularProgress
    {...props}
    variant="indeterminate"
    size={size}
    thickness={thickness}
  />
);
```

- [x] **Step 2: Verify spinner tests**

Run:

```powershell
npm run test -- tests/app-loading-spinner.test.tsx
```

Expected: MUI's dash animation and root rotation rules are present, no custom `animation: none` rule is emitted, default size/thickness are 34px/2.4px, explicit 3.6px works, and caller props remain forwarded.

### Task 4: Update F1-Grid loading documentation and tests

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Test: `frontend/tests/f1-grid.test.tsx`
- Test: `frontend/tests/f1-tree.test.tsx`
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [x] **Step 1: Describe the standard MUI indeterminate motion**

Replace fixed-arc statements with wording that the shared MUI spinner animates its arc and rotation naturally. Preserve 34px/2.4px Grid/Tree details, overlay behavior, and loading lifecycle.

- [x] **Step 2: Run Grid and Tree loading tests**

Run:

```powershell
npx vitest run tests/f1-grid.test.tsx tests/f1-tree.test.tsx -t "matches the shared app spinner|same loading spinner as F1Grid"
```

Expected: both focused loading tests pass.

- [x] **Step 3: Run F1-Grid docs tests**

Run:

```powershell
npx vitest run tests/f1-grid-docs.test.tsx --testTimeout 15000
```

Expected: all 30 docs tests pass.

### Task 5: Verify browser rendering, build, and record results

**Files:**
- Create: `docs/result/20261026/f1-spinner-stable-arc/20261026_007_f1-spinner_stable_arc_결과.md`
- Create: optional English-named screenshot in `docs/result/20261026/f1-spinner-stable-arc/screenshots/`

- [x] **Step 1: Inspect the actual spinner in a browser**

Check the F1-Grid large-data example and an available real query page. Confirm the rendered progressbar uses MUI's default circle dash animation, no `animation: none` app override is applied, and existing size/stroke remain 34px/2.4px for Grid/Tree. Note that the changing arc length is normal MUI indeterminate behavior, not a different spinner implementation. If the shared browser or query interaction is unavailable, record the limitation instead of claiming a repeated-query verification.

- [x] **Step 2: Run final validation**

Run:

```powershell
npm run test -- tests/app-loading-spinner.test.tsx
npx vitest run tests/f1-grid.test.tsx tests/f1-tree.test.tsx -t "matches the shared app spinner|same loading spinner as F1Grid"
npx vitest run tests/f1-grid-docs.test.tsx --testTimeout 15000
npm run build
git diff --check
```

Expected: all focused tests pass, build exits 0, and `git diff --check` reports no formatting issues. Record any existing build warning without widening scope.

- [x] **Step 3: Write the result document**

Record evidence that the component-local CSS—not a global stylesheet—froze the partial arc, the implementation and documentation changes, test/build output, and browser evidence or its limitation.

- [ ] **Step 4: Commit task-owned files only**

Stage only the files listed in this plan. Do not stage unrelated breadcrumb or concurrent changes. Include the repository-required Co-authored-by trailer.
